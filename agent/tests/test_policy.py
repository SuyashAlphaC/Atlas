import numpy as np
import pandas as pd

from atlas.policy import AllocationContext, AllocationPolicy
from atlas.signals.factor import AdapterFeatures
from atlas.signals.llm_macro import MacroSignal
from atlas.signals.regime import RegimeDetector


def _feats():
    return [
        AdapterFeatures("USDY", 0.053, 0.25, 0.85, 0.10),
        AdapterFeatures("USDe", 0.11, 0.0, 0.70, 0.35),
        AdapterFeatures("mETH", 0.038, 0.0, 0.90, 0.15),
    ]


def test_policy_sums_to_10000_and_min_cash_respected():
    pol = AllocationPolicy(min_cash_bps=500, max_adapter_bps=6500)
    ctx = AllocationContext(
        adapter_feats=_feats(),
        regime=type("R", (), {"label": "neutral", "annualized_vol": 0.1, "annualized_drift": 0.05, "state_probs": [0.3, 0.4, 0.3], "state": 1, "__dict__": {}})(),
        macro=MacroSignal(tilt=1, rationale="x", raw={}),
    )
    d = pol.decide(ctx)
    assert sum(d.weights_bps) == 10_000
    assert d.weights_bps[0] >= 500


def test_policy_risk_off_lifts_cash():
    pol = AllocationPolicy()
    R_off = type("R", (), {"label": "risk_off", "annualized_vol": 0.4, "annualized_drift": -0.1, "state_probs": [0.7, 0.2, 0.1], "state": 0, "__dict__": {}})
    R_on = type("R", (), {"label": "risk_on", "annualized_vol": 0.15, "annualized_drift": 0.15, "state_probs": [0.1, 0.2, 0.7], "state": 2, "__dict__": {}})
    macro = MacroSignal(tilt=0, rationale="", raw={})
    d_off = pol.decide(AllocationContext(adapter_feats=_feats(), regime=R_off(), macro=macro))
    d_on = pol.decide(AllocationContext(adapter_feats=_feats(), regime=R_on(), macro=macro))
    assert d_off.weights_bps[0] > d_on.weights_bps[0]


def test_regime_detector_returns_label():
    rng = np.random.default_rng(0)
    n = 120
    px = pd.DataFrame(np.cumprod(1 + rng.normal(0, 0.02, (n, 3)), axis=0), columns=["A", "B", "C"])
    out = RegimeDetector().fit_predict(px)
    assert out.label in {"risk_off", "neutral", "risk_on"}
    assert 0 <= out.state <= 2
