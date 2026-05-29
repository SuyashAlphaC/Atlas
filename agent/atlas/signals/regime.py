"""Market regime detection via Gaussian HMM on log-returns + realized vol."""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from hmmlearn import hmm


REGIME_LABELS = {0: "risk_off", 1: "neutral", 2: "risk_on"}


@dataclass
class RegimeOutput:
    state: int
    label: str
    state_probs: list[float]
    annualized_vol: float
    annualized_drift: float


class RegimeDetector:
    """3-state Gaussian HMM trained on log-returns + realized vol features.

    Inputs `prices_df` indexed by date with columns of reference asset prices
    (e.g. ETH/USDC, BTC/USDC) — returns a regime label for the most recent bar.
    """

    def __init__(self, n_states: int = 3, random_state: int = 7):
        self.model = hmm.GaussianHMM(
            n_components=n_states, covariance_type="full", n_iter=200, random_state=random_state
        )

    def _features(self, prices_df: pd.DataFrame) -> np.ndarray:
        # Aggregate to a single representative return series (equal-weight, ex-stable).
        ret = np.log(prices_df).diff().dropna()
        composite = ret.mean(axis=1)
        rv = composite.rolling(7).std().bfill()
        feats = np.column_stack([composite.values, rv.values])
        return feats

    def fit_predict(self, prices_df: pd.DataFrame) -> RegimeOutput:
        feats = self._features(prices_df)
        if len(feats) < 30:
            return RegimeOutput(state=1, label="neutral", state_probs=[0.33, 0.34, 0.33], annualized_vol=0.0, annualized_drift=0.0)
        try:
            self.model.fit(feats)
            hidden = self.model.predict(feats)
            probs = self.model.predict_proba(feats)
        except Exception:
            # Degenerate distribution — fall back to a volatility-quantile regime.
            return self._volatility_fallback(feats)
        # Order states by their mean (risk_off has lowest mean return).
        means = self.model.means_[:, 0]
        order = np.argsort(means)
        relabel = {old: new for new, old in enumerate(order)}
        last_state = int(relabel[hidden[-1]])
        last_probs = probs[-1][order].tolist()

        last_ret = feats[-1, 0]
        last_vol = feats[-1, 1]
        return RegimeOutput(
            state=last_state,
            label=REGIME_LABELS[last_state],
            state_probs=last_probs,
            annualized_vol=float(last_vol * np.sqrt(365)),
            annualized_drift=float(last_ret * 365),
        )

    def _volatility_fallback(self, feats: np.ndarray) -> RegimeOutput:
        rv = feats[:, 1]
        last = rv[-1]
        q33, q66 = np.quantile(rv, [0.33, 0.66])
        if last >= q66:
            state, label = 0, "risk_off"
            probs = [0.6, 0.3, 0.1]
        elif last <= q33:
            state, label = 2, "risk_on"
            probs = [0.1, 0.3, 0.6]
        else:
            state, label = 1, "neutral"
            probs = [0.25, 0.5, 0.25]
        return RegimeOutput(
            state=state, label=label, state_probs=probs, annualized_vol=float(last * np.sqrt(365)), annualized_drift=float(feats[-1, 0] * 365)
        )
