"""Atlas main runtime loop — signal → policy → executor."""
from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass

import pandas as pd

from .byreal.coordinator import ByrealConfig, ByrealCoordinator
from .config import AtlasConfig
from .data.ingest import MantleDataClient, RWAUniverseClient
from .executor import OnchainExecutor
from .ipfs import pin_json
from .policy import AllocationContext, AllocationPolicy
from .signals.llm_macro import macro_signal
from .signals.regime import RegimeDetector

log = logging.getLogger("atlas.runtime")


@dataclass
class AtlasState:
    last_weights_bps: list[int] | None = None
    last_decision_id: int | None = None


class AtlasAgent:
    def __init__(self, cfg: AtlasConfig, private_key: str):
        self.cfg = cfg
        self.executor = OnchainExecutor(
            rpc_url=cfg.network.rpc_url,
            chain_id=cfg.network.chain_id,
            private_key=private_key,
            vault_address=cfg.contracts.vault,
            decision_log_address=cfg.contracts.decision_log,
        )
        self.mantle = MantleDataClient(rpc_url=cfg.network.rpc_url)
        self.rwa = RWAUniverseClient()
        self.regime_detector = RegimeDetector()
        self.policy = AllocationPolicy(min_cash_bps=cfg.agent.min_cash_bps, max_adapter_bps=cfg.agent.max_weight_per_adapter_bps)
        self.state = AtlasState()
        self.byreal = ByrealCoordinator(
            ByrealConfig(
                enabled=cfg.byreal.enabled,
                mirror_pct=cfg.byreal.mirror_pct,
                hedge_pct=cfg.byreal.hedge_pct,
                cmm_pool=cfg.byreal.cmm_pool,
                cmm_input_mint=cfg.byreal.cmm_input_mint,
                cmm_output_mint=cfg.byreal.cmm_output_mint,
                hedge_symbol=cfg.byreal.hedge_symbol,
                max_leverage=cfg.byreal.max_leverage,
                dry_run=cfg.byreal.dry_run,
            )
        )

    def step(self) -> dict:
        prices = self.mantle.fetch_reference_prices(self.cfg.signals.regime_lookback_days)
        regime = self.regime_detector.fit_predict(prices)

        feats = self.rwa.get_adapter_features()
        headlines = self.rwa.recent_macro_headlines()
        metrics = self.rwa.macro_metrics()
        macro = macro_signal(
            headlines,
            metrics,
            model=self.cfg.llm.model,
            max_tokens=self.cfg.llm.max_tokens,
            enabled=self.cfg.llm.enabled,
        )

        ctx = AllocationContext(
            adapter_feats=feats, regime=regime, macro=macro, prev_weights_bps=self.state.last_weights_bps
        )
        decision = self.policy.decide(ctx)

        # Decide whether to act (L1 churn threshold).
        if self.state.last_weights_bps is not None:
            l1 = sum(abs(a - b) for a, b in zip(self.state.last_weights_bps, decision.weights_bps))
            if l1 < self.cfg.agent.min_action_threshold_bps:
                log.info("skip rebalance — L1 change %d bps below threshold", l1)
                return {"acted": False, "decision": decision.__dict__}

        ts_ms = int(time.time() * 1000)
        rationale_payload = {
            "rationale": decision.rationale,
            "signals": decision.signals,
            "weights_bps": decision.weights_bps,
            "timestamp_ms": ts_ms,
        }
        cid = pin_json(rationale_payload, endpoint=self.cfg.ipfs.pin_endpoint, jwt=self.cfg.ipfs.pin_jwt)
        dhash = OnchainExecutor.decision_hash(decision.weights_bps, cid, ts_ms)
        result = self.executor.submit_rebalance(decision.weights_bps, dhash, cid)

        self.state.last_weights_bps = decision.weights_bps
        self.state.last_decision_id = result.decision_id

        # Optional Byreal mirror — Solana CLMM + Perps hedge.
        byreal_plan = None
        if self.cfg.byreal.enabled:
            state = self.executor.fetch_state(self.cfg.agent.id)
            tvl_usd = state["total_assets"] / 1_000_000.0  # USDC 6 decimals
            plan = self.byreal.plan(decision.weights_bps, regime.label, macro.tilt, tvl_usd)
            self.byreal.execute(plan)
            byreal_plan = plan.as_dict()

        return {
            "acted": True,
            "decision": decision.__dict__,
            "tx_hash": result.tx_hash,
            "decision_id": result.decision_id,
            "rationale_cid": cid,
            "byreal_plan": byreal_plan,
        }

    def loop(self):
        while True:
            try:
                out = self.step()
                log.info("step result: acted=%s decision_id=%s", out.get("acted"), out.get("decision_id"))
            except Exception:
                log.exception("step failed")
            time.sleep(self.cfg.agent.rebalance_interval_seconds)
