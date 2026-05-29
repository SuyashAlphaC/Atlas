"""Offline backtest harness.

Replays the regime + factor + macro fusion against a synthetic price history.
Sharpe / drawdown reported. No on-chain calls; used to produce the report
that feeds ERC-8004 reputation feedback and the submission video.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .config import AtlasConfig
from .data.ingest import RWAUniverseClient, synthetic_prices
from .policy import AllocationContext, AllocationPolicy
from .signals.llm_macro import MacroSignal
from .signals.regime import RegimeDetector


def run_backtest(cfg: AtlasConfig, days: int = 180) -> dict:
    prices = synthetic_prices(days=days, seed=42)
    rd = RegimeDetector()
    rwa = RWAUniverseClient()
    feats = rwa.get_adapter_features()
    policy = AllocationPolicy(min_cash_bps=cfg.agent.min_cash_bps, max_adapter_bps=cfg.agent.max_weight_per_adapter_bps)

    history: list[dict] = []
    prev = None
    daily_returns: list[float] = []
    nav = 1.0
    nav_series = [nav]

    for i in range(30, len(prices)):
        window = prices.iloc[: i + 1]
        regime = rd.fit_predict(window)
        macro = MacroSignal(tilt=0, rationale="backtest-baseline", raw={})
        ctx = AllocationContext(adapter_feats=feats, regime=regime, macro=macro, prev_weights_bps=prev)
        d = policy.decide(ctx)
        prev = d.weights_bps

        # Synthetic daily return = weighted sum of adapter APY/365 + cash 0% - vol noise scaled by regime.
        daily_apys = np.array([0.0] + [f.yield_apy for f in feats])
        weights = np.array(d.weights_bps) / 10_000.0
        carry = float((weights * daily_apys).sum() / 365.0)
        noise = float(np.random.default_rng(i).normal(0, 0.0008 * (1 + 0.5 * (regime.label == "risk_off"))))
        ret = carry + noise
        nav *= 1 + ret
        nav_series.append(nav)
        daily_returns.append(ret)
        history.append({"day": i, "regime": regime.label, "weights": d.weights_bps, "ret": ret, "nav": nav})

    ret_arr = np.array(daily_returns)
    sharpe = float(np.sqrt(365) * ret_arr.mean() / (ret_arr.std() + 1e-9))
    nav_arr = np.array(nav_series)
    drawdown = float((1 - nav_arr / np.maximum.accumulate(nav_arr)).max())

    return {
        "days": len(history),
        "final_nav": nav,
        "sharpe": sharpe,
        "max_drawdown": drawdown,
        "regimes_visited": sorted({h["regime"] for h in history}),
        "sample_history": history[-5:],
    }
