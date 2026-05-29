"""Allocation policy.

Fuses regime + factor + macro tilt into target weights over [cash, adapters...].
Implements risk-budget caps + smoothing. Returns the integer bps allocation that
Atlas commits on-chain.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .signals.factor import AdapterFeatures, FactorModel
from .signals.llm_macro import MacroSignal
from .signals.regime import RegimeOutput


@dataclass
class AllocationContext:
    adapter_feats: list[AdapterFeatures]
    regime: RegimeOutput
    macro: MacroSignal
    prev_weights_bps: list[int] | None = None  # length n+1 (cash + adapters)


@dataclass
class AllocationDecision:
    weights_bps: list[int]
    rationale: str
    signals: dict


class AllocationPolicy:
    """Rule-based meta-policy. RL actor can swap in later by exposing same interface."""

    def __init__(
        self,
        min_cash_bps: int = 500,
        max_adapter_bps: int = 6500,
        smoothing: float = 0.5,
        regime_cash_curve: dict[str, int] | None = None,
    ):
        self.min_cash_bps = min_cash_bps
        self.max_adapter_bps = max_adapter_bps
        self.smoothing = smoothing
        self.regime_cash_curve = regime_cash_curve or {
            "risk_off": 4000,
            "neutral": 1500,
            "risk_on": 500,
        }

    def decide(self, ctx: AllocationContext) -> AllocationDecision:
        n = len(ctx.adapter_feats)
        regime_cash = self.regime_cash_curve.get(ctx.regime.label, 1500)
        macro_tilt_bps = -ctx.macro.tilt * 750  # tilt of +2 pulls 1500 bps out of cash
        cash_bps = max(self.min_cash_bps, regime_cash + macro_tilt_bps)
        cash_bps = min(cash_bps, 9_500)

        # Weight risk assets by factor score adjusted for regime sensitivity.
        weights_for_regime: dict[str, dict[str, float]] = {
            "risk_off": {"yield": 0.30, "duration": -0.40, "liquidity": 0.30, "credit": -0.40},
            "neutral": {"yield": 0.55, "duration": -0.20, "liquidity": 0.20, "credit": -0.25},
            "risk_on": {"yield": 0.70, "duration": -0.10, "liquidity": 0.10, "credit": -0.15},
        }
        fm = FactorModel(weights_for_regime.get(ctx.regime.label))
        scored = [fm.score(f) for f in ctx.adapter_feats]
        scores = [s.score for s in scored]
        soft = FactorModel.softmax_weights(scores, tau=0.4)

        risk_budget_bps = 10_000 - cash_bps
        raw_adapter_bps = (soft * risk_budget_bps).round().astype(int)

        # Cap per adapter.
        raw_adapter_bps = np.minimum(raw_adapter_bps, self.max_adapter_bps)
        # Re-normalize so sum + cash = 10_000.
        deficit = risk_budget_bps - int(raw_adapter_bps.sum())
        if deficit != 0:
            raw_adapter_bps[int(np.argmax(raw_adapter_bps))] += deficit

        target = [int(cash_bps), *map(int, raw_adapter_bps)]

        # Smooth toward previous to limit churn.
        if ctx.prev_weights_bps and len(ctx.prev_weights_bps) == len(target):
            smoothed = []
            for prev, t in zip(ctx.prev_weights_bps, target):
                smoothed.append(int(round(prev * (1 - self.smoothing) + t * self.smoothing)))
            # Renormalize after rounding.
            diff = 10_000 - sum(smoothed)
            smoothed[int(np.argmax(smoothed[1:])) + 1] += diff
            target = smoothed

        # Final sanity: all >= 0, cash >= min, sum == 10000.
        target = [max(0, w) for w in target]
        target[0] = max(target[0], self.min_cash_bps)
        s = sum(target)
        if s != 10_000:
            target[0] += 10_000 - s

        rationale = (
            f"Regime={ctx.regime.label} (vol={ctx.regime.annualized_vol:.2%}); "
            f"macro_tilt={ctx.macro.tilt:+d} ({ctx.macro.rationale}); "
            f"cash={target[0]/100:.2f}%, adapters={[f'{w/100:.2f}%' for w in target[1:]]}"
        )
        signals = {
            "regime": ctx.regime.__dict__,
            "macro": {"tilt": ctx.macro.tilt, "rationale": ctx.macro.rationale},
            "factor_scores": [s.score for s in scored],
            "factor_breakdown": [s.breakdown for s in scored],
        }
        return AllocationDecision(weights_bps=target, rationale=rationale, signals=signals)
