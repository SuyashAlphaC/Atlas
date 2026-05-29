"""Tests for the reputation-feedback math + report assembly."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from atlas.feedback import (
    NavSnapshot,
    append_snapshot,
    build_report,
    compute_sharpe_drawdown,
    encode_int128,
    keccak_bytes,
    load_history,
)


def _series(navs: list[float], start_ts: int = 1_000_000_000, step: int = 86400) -> list[NavSnapshot]:
    return [
        NavSnapshot(timestamp=start_ts + i * step, total_assets=int(n * 1e12), total_supply=int(1e12), nav_per_share=n, decisions_count=i + 1)
        for i, n in enumerate(navs)
    ]


def test_sharpe_drawdown_handles_short_series():
    snaps = _series([1.0])
    s, dd, n = compute_sharpe_drawdown(snaps)
    assert n == 1 and s == 0.0 and dd == 0.0


def test_sharpe_positive_for_uptrend():
    snaps = _series([1.0 + 0.0005 * i for i in range(40)])
    s, dd, n = compute_sharpe_drawdown(snaps)
    assert s > 5.0  # consistent uptrend = absurdly high Sharpe
    assert dd == 0.0
    assert n >= 30


def test_drawdown_detects_decline():
    navs = [1.0, 1.05, 1.10, 1.00, 0.95, 1.00]
    snaps = _series(navs)
    _, dd, _ = compute_sharpe_drawdown(snaps)
    expected = 1 - (0.95 / 1.10)
    assert abs(dd - expected) < 1e-6


def test_report_carries_tail():
    snaps = _series([1.0 + i * 0.001 for i in range(50)])
    r = build_report(snaps)
    assert r.samples >= 30
    assert len(r.snapshots) == 30
    assert r.nav_first == snaps[0].nav_per_share
    assert r.nav_last == snaps[-1].nav_per_share
    assert r.total_return > 0


def test_persistence_roundtrip(tmp_path: Path):
    p = tmp_path / "nav.jsonl"
    snaps = _series([1.0, 1.01, 1.005])
    for s in snaps:
        append_snapshot(s, p)
    loaded = load_history(p)
    assert len(loaded) == 3
    assert all(isinstance(s, NavSnapshot) for s in loaded)
    assert loaded[1].nav_per_share == 1.01


def test_encode_int128_clamps():
    assert encode_int128(1.625, decimals=6) == 1_625_000
    assert encode_int128(-0.5, decimals=6) == -500_000
    huge = encode_int128(1e40, decimals=6)
    assert huge == 2**127 - 1


def test_keccak_matches_solidity_style():
    h = keccak_bytes(b"atlas")
    assert h.startswith("0x") and len(h) == 66
