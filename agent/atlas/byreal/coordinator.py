"""ByrealCoordinator — translates Atlas allocation decisions into Byreal-side actions.

The coordinator is a *thin* mapping layer; it never decides strategy by itself.
Inputs:
  - Atlas allocation decision (weights over [cash, USDY, USDe, mETH])
  - Regime label (risk_off / neutral / risk_on)
  - Macro tilt (-2..+2)
  - Atlas Mantle vault TVL (USDC base)

Outputs: a ByrealPlan with concrete Skills + Perps invocations and an audit log.

Configurable knobs:
  - mirror_pct  — fraction of Mantle TVL to mirror on Byreal CLMM (LP fees)
  - hedge_pct   — fraction notional to short on Byreal Perps when risk_off
  - cmm_pool    — Byreal CLMM pool ID (e.g. SOL-USDC)
  - hedge_symbol — Byreal Perps symbol used for hedge (e.g. BTC, ETH)
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from .perps_bridge import ByrealPerpsBridge
from .skills_bridge import ByrealCLIError, ByrealSkillsBridge

log = logging.getLogger("atlas.byreal.coordinator")


@dataclass
class ByrealConfig:
    enabled: bool = False
    mirror_pct: float = 0.05  # 5% of Mantle TVL deployed to Byreal CLMM
    hedge_pct: float = 0.10  # 10% notional short when risk_off
    cmm_pool: str = ""  # Byreal pool ID (Solana mint pair)
    cmm_input_mint: str = ""  # USDC Solana mint
    cmm_output_mint: str = ""  # paired token (e.g. SOL)
    hedge_symbol: str = "BTC"
    max_leverage: int = 3
    dry_run: bool = True


@dataclass
class ByrealAction:
    kind: str  # "swap" | "open_position" | "perp_short" | "perp_close"
    params: dict[str, Any]
    result: dict[str, Any] | None = None
    error: str | None = None


@dataclass
class ByrealPlan:
    actions: list[ByrealAction] = field(default_factory=list)
    plan_rationale: str = ""

    def as_dict(self) -> dict[str, Any]:
        return {
            "rationale": self.plan_rationale,
            "actions": [{"kind": a.kind, "params": a.params, "result": a.result, "error": a.error} for a in self.actions],
        }


class ByrealCoordinator:
    def __init__(self, cfg: ByrealConfig, skills: ByrealSkillsBridge | None = None, perps: ByrealPerpsBridge | None = None):
        self.cfg = cfg
        self.skills = skills or ByrealSkillsBridge(dry_run=cfg.dry_run)
        self.perps = perps or ByrealPerpsBridge()

    def plan(self, weights_bps: list[int], regime_label: str, macro_tilt: int, mantle_tvl_usd: float) -> ByrealPlan:
        plan = ByrealPlan()
        if not self.cfg.enabled:
            plan.plan_rationale = "Byreal mirror disabled"
            return plan

        # 1) CLMM mirror: deploy mirror_pct of TVL as concentrated liquidity.
        mirror_usd = mantle_tvl_usd * self.cfg.mirror_pct
        if mirror_usd > 1.0 and self.cfg.cmm_pool:
            plan.actions.append(
                ByrealAction(
                    kind="swap",
                    params={
                        "input_mint": self.cfg.cmm_input_mint,
                        "output_mint": self.cfg.cmm_output_mint,
                        "amount": mirror_usd / 2.0,  # half the USDC into paired token
                    },
                )
            )
            plan.actions.append(
                ByrealAction(
                    kind="open_position",
                    params={
                        "pool": self.cfg.cmm_pool,
                        "amount_token_a": mirror_usd / 2.0,
                        "amount_token_b": mirror_usd / 2.0,
                        # tick range — coordinator hands raw values; signal layer can override.
                        "lower_tick": -2000,
                        "upper_tick": 2000,
                    },
                )
            )

        # 2) Perps hedge: short hedge_pct of TVL notional when risk_off OR macro tilt <= -1.
        if regime_label == "risk_off" or macro_tilt <= -1:
            hedge_usd = mantle_tvl_usd * self.cfg.hedge_pct
            plan.actions.append(
                ByrealAction(
                    kind="perp_short",
                    params={
                        "symbol": self.cfg.hedge_symbol,
                        "size_usd": hedge_usd,
                        "leverage": min(self.cfg.max_leverage, 3),
                    },
                )
            )

        plan.plan_rationale = (
            f"regime={regime_label}, macro_tilt={macro_tilt:+d}, "
            f"mirror={self.cfg.mirror_pct*100:.1f}% (${mirror_usd:,.0f}), "
            f"hedge_active={regime_label=='risk_off' or macro_tilt<=-1}"
        )
        return plan

    def execute(self, plan: ByrealPlan) -> ByrealPlan:
        if not self.cfg.enabled:
            return plan
        for action in plan.actions:
            try:
                if action.kind == "swap":
                    res = self.skills.swap(
                        input_mint=action.params["input_mint"],
                        output_mint=action.params["output_mint"],
                        amount=action.params["amount"],
                    )
                    action.result = res.raw
                elif action.kind == "open_position":
                    res = self.skills.open_position(
                        pool=action.params["pool"],
                        lower_tick=action.params["lower_tick"],
                        upper_tick=action.params["upper_tick"],
                        amount_token_a=action.params["amount_token_a"],
                        amount_token_b=action.params["amount_token_b"],
                    )
                    action.result = res.raw
                elif action.kind == "perp_short":
                    self.perps.set_leverage(action.params["symbol"], int(action.params["leverage"]))
                    res = self.perps.market_order(
                        symbol=action.params["symbol"],
                        side="sell",
                        size=action.params["size_usd"],
                    )
                    action.result = res.raw
                elif action.kind == "perp_close":
                    action.result = self.perps.close_market(action.params["symbol"])
                else:
                    action.error = f"unknown action kind: {action.kind}"
            except ByrealCLIError as e:
                action.error = str(e)
                log.warning("byreal action failed: %s — %s", action.kind, e)
        return plan
