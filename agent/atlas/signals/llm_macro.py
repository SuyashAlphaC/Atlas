"""LLM macro-signal pipeline.

Takes recent macro headlines + on-chain metrics; emits a discrete risk-tilt
in {-2, -1, 0, +1, +2} and a short rationale string. Cached briefly to
contain spend during dry runs.
"""
from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass
from typing import Any

try:
    import anthropic  # type: ignore
except Exception:  # pragma: no cover - optional dep
    anthropic = None  # type: ignore

log = logging.getLogger("atlas.llm_macro")


@dataclass
class MacroSignal:
    tilt: int  # -2..+2
    rationale: str
    raw: dict[str, Any]


_CACHE: dict[str, tuple[float, MacroSignal]] = {}
_TTL = 300.0


_SYSTEM = (
    "You are Atlas, an AI risk officer for an on-chain RWA portfolio. "
    "Read the headlines + on-chain metrics; output STRICT JSON with keys "
    "'tilt' in [-2,-1,0,1,2] and 'rationale' under 60 words. Tilt -2 = risk_off, +2 = risk_on. "
    "Focus on yield curve, credit spreads, ETF flows, stablecoin de-pegs, mETH/USDe/USDY-specific risk."
)


def _fallback(metrics: dict[str, float], reason: str) -> MacroSignal:
    depeg = metrics.get("usde_peg_dev_bps", 0) > 100
    rate_spike = metrics.get("ust_10y_chg_bps_7d", 0) > 25
    tilt = -2 if (depeg or rate_spike) else (1 if metrics.get("eth_30d_ret", 0) > 0 else 0)
    return MacroSignal(tilt=tilt, rationale=f"fallback:{reason}", raw={"fallback": True, "reason": reason})


def macro_signal(
    headlines: list[str],
    metrics: dict[str, float],
    model: str = "claude-opus-4-7",
    max_tokens: int = 600,
    enabled: bool = True,
) -> MacroSignal:
    cache_key = json.dumps({"h": headlines, "m": metrics, "model": model, "enabled": enabled}, sort_keys=True)
    now = time.time()
    if cache_key in _CACHE and (now - _CACHE[cache_key][0]) < _TTL:
        return _CACHE[cache_key][1]

    if not enabled or anthropic is None or not os.getenv("ANTHROPIC_API_KEY"):
        reason = "disabled" if not enabled else ("no-sdk" if anthropic is None else "no-key")
        out = _fallback(metrics, reason)
        _CACHE[cache_key] = (now, out)
        return out

    try:
        client = anthropic.Anthropic()
        user_prompt = json.dumps({"headlines": headlines[-15:], "metrics": metrics})
        resp = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=_SYSTEM,
            messages=[{"role": "user", "content": user_prompt}],
        )
    except Exception as e:  # quota, network, auth, anything — fall back, do not block rebalance.
        log.warning("LLM macro call failed (%s); using deterministic fallback", type(e).__name__)
        out = _fallback(metrics, f"api-error:{type(e).__name__}")
        _CACHE[cache_key] = (now, out)
        return out

    text = "".join(block.text for block in resp.content if getattr(block, "type", "") == "text")
    parsed: dict[str, Any]
    try:
        parsed = json.loads(text[text.find("{") : text.rfind("}") + 1])
    except Exception:
        parsed = {"tilt": 0, "rationale": "parse-error: " + text[:120]}
    tilt = int(parsed.get("tilt", 0))
    tilt = max(-2, min(2, tilt))
    out = MacroSignal(tilt=tilt, rationale=str(parsed.get("rationale", ""))[:240], raw=parsed)
    _CACHE[cache_key] = (now, out)
    return out
