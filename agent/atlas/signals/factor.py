"""Cross-sectional factor scoring for RWA universe.

Factors:
- yield: forward-looking APY net of fees
- duration: rate sensitivity penalty under risk-off regime
- liquidity: redemption depth proxy (TVL-normalized)
- credit: issuer/protocol risk score (lower is safer)
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass
class AdapterFeatures:
    label: str
    yield_apy: float
    duration_years: float
    liquidity_score: float  # 0..1
    credit_score: float  # 0..1, lower=safer


@dataclass
class FactorOutput:
    score: float
    breakdown: dict[str, float]


class FactorModel:
    """Linear factor scorer. Weights vary by regime (set by AllocationPolicy)."""

    def __init__(self, weights: dict[str, float] | None = None):
        # Default weights — sum should be ~1.0 in magnitude.
        self.weights = weights or {"yield": 0.55, "duration": -0.20, "liquidity": 0.20, "credit": -0.25}

    def score(self, feats: AdapterFeatures) -> FactorOutput:
        ys = feats.yield_apy
        ds = feats.duration_years
        ls = feats.liquidity_score
        cs = feats.credit_score

        contrib = {
            "yield": self.weights["yield"] * ys,
            "duration": self.weights["duration"] * ds,
            "liquidity": self.weights["liquidity"] * ls,
            "credit": self.weights["credit"] * cs,
        }
        score = sum(contrib.values())
        return FactorOutput(score=float(score), breakdown=contrib)

    def rank(self, feats_list: list[AdapterFeatures]) -> list[FactorOutput]:
        return [self.score(f) for f in feats_list]

    @staticmethod
    def softmax_weights(scores: list[float], tau: float = 0.5) -> np.ndarray:
        arr = np.array(scores, dtype=float)
        arr = arr / max(tau, 1e-6)
        arr -= arr.max()
        e = np.exp(arr)
        return e / e.sum()
