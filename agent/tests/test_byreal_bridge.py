"""Tests for the Byreal bridge.

Subprocess is mocked — no real `byreal-cli` install required to run these.
"""
from __future__ import annotations

import json
import subprocess
from unittest.mock import patch

import pytest

from atlas.byreal import ByrealCLIError, ByrealCoordinator, ByrealPerpsBridge, ByrealSkillsBridge
from atlas.byreal.coordinator import ByrealConfig


def _proc(stdout: str, returncode: int = 0, stderr: str = ""):
    cp = subprocess.CompletedProcess(args=[], returncode=returncode, stdout=stdout, stderr=stderr)
    return cp


@patch("atlas.byreal.skills_bridge.shutil.which", return_value="/usr/local/bin/byreal-cli")
@patch("atlas.byreal.skills_bridge.subprocess.run")
def test_wallet_parses_balance(run, _which):
    run.side_effect = [
        _proc(json.dumps({"address": "11111"})),
        _proc(json.dumps({"sol": 0.7, "tokens": [{"symbol": "USDC", "amount": 250.5}]})),
    ]
    w = ByrealSkillsBridge().wallet()
    assert w.address == "11111"
    assert w.sol_balance == 0.7
    assert w.tokens["USDC"] == 250.5


@patch("atlas.byreal.skills_bridge.shutil.which", return_value="/usr/local/bin/byreal-cli")
@patch("atlas.byreal.skills_bridge.subprocess.run")
def test_swap_parses_signature(run, _which):
    run.return_value = _proc(json.dumps({"signature": "0xabc", "inputAmount": 100, "outputAmount": 0.85}))
    s = ByrealSkillsBridge().swap("USDCmint", "SOLmint", 100)
    assert s.tx_signature == "0xabc"
    assert s.output_amount == 0.85


@patch("atlas.byreal.skills_bridge.shutil.which", return_value="/usr/local/bin/byreal-cli")
@patch("atlas.byreal.skills_bridge.subprocess.run")
def test_skills_bridge_raises_on_non_zero_exit(run, _which):
    run.return_value = _proc("", returncode=1, stderr="unauthorized")
    with pytest.raises(ByrealCLIError, match="unauthorized"):
        ByrealSkillsBridge().wallet()


@patch("atlas.byreal.skills_bridge.shutil.which", return_value=None)
def test_skills_bridge_missing_binary(_which):
    with pytest.raises(ByrealCLIError, match="not on PATH"):
        ByrealSkillsBridge().wallet()


@patch("atlas.byreal.perps_bridge.shutil.which", return_value="/usr/local/bin/byreal-perps-cli")
@patch("atlas.byreal.perps_bridge.subprocess.run")
def test_market_short_order(run, _which):
    run.return_value = _proc(json.dumps({"orderId": "ord-1"}))
    o = ByrealPerpsBridge().market_order("BTC", "sell", 0.01, tp=90000, sl=110000)
    assert o.order_id == "ord-1"
    assert o.side == "sell"


def test_coordinator_plan_risk_off_includes_hedge():
    cfg = ByrealConfig(
        enabled=True,
        mirror_pct=0.05,
        hedge_pct=0.1,
        cmm_pool="POOL",
        cmm_input_mint="USDC",
        cmm_output_mint="SOL",
        hedge_symbol="BTC",
    )
    coord = ByrealCoordinator(cfg)
    plan = coord.plan(weights_bps=[2000, 4000, 2000, 2000], regime_label="risk_off", macro_tilt=-1, mantle_tvl_usd=1_000_000.0)
    kinds = [a.kind for a in plan.actions]
    assert "swap" in kinds and "open_position" in kinds
    assert "perp_short" in kinds


def test_coordinator_plan_risk_on_no_hedge():
    cfg = ByrealConfig(enabled=True, cmm_pool="POOL", cmm_input_mint="USDC", cmm_output_mint="SOL")
    coord = ByrealCoordinator(cfg)
    plan = coord.plan(weights_bps=[500, 4750, 4750, 0], regime_label="risk_on", macro_tilt=2, mantle_tvl_usd=500_000.0)
    kinds = [a.kind for a in plan.actions]
    assert "perp_short" not in kinds


def test_coordinator_disabled_returns_empty_plan():
    coord = ByrealCoordinator(ByrealConfig(enabled=False))
    plan = coord.plan(weights_bps=[500, 4750, 4750, 0], regime_label="risk_off", macro_tilt=-2, mantle_tvl_usd=500_000.0)
    assert plan.actions == []
    assert "disabled" in plan.plan_rationale
