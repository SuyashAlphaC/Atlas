"""Reputation feedback pipeline.

Tracks the vault's share-price history, computes 30-day rolling Sharpe + max
drawdown, pins a structured report to IPFS, and writes both metrics to the
ERC-8004 ReputationRegistry under tags `("sharpe","30d")` and `("drawdown","30d")`.

Storage: a JSON Lines file (`agent/data/nav_history.jsonl`) holds the daily
NAV snapshots so re-runs are deterministic. The file is gitignored — operators
back it up (or migrate to S3 / an indexer) for production.
"""
from __future__ import annotations

import hashlib
import json
import logging
import math
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np

from .config import AtlasConfig
from .executor import OnchainExecutor
from .ipfs import pin_json

log = logging.getLogger("atlas.feedback")

DEFAULT_HISTORY_PATH = Path(__file__).parent.parent / "data" / "nav_history.jsonl"
ENDPOINT = "atlas-feedback-v1"


@dataclass
class NavSnapshot:
    timestamp: int  # unix seconds
    total_assets: int  # raw uint (base asset decimals)
    total_supply: int  # raw uint (vault shares, 6 decimals to match base USDC)
    nav_per_share: float
    decisions_count: int


@dataclass
class FeedbackReport:
    timestamp: int
    window_days: int
    samples: int
    sharpe: float
    max_drawdown: float
    nav_first: float
    nav_last: float
    total_return: float
    snapshots: list[dict[str, Any]] = field(default_factory=list)


def load_history(path: Path = DEFAULT_HISTORY_PATH) -> list[NavSnapshot]:
    if not path.exists():
        return []
    out: list[NavSnapshot] = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        d = json.loads(line)
        out.append(NavSnapshot(**d))
    return out


def append_snapshot(snap: NavSnapshot, path: Path = DEFAULT_HISTORY_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a") as f:
        f.write(json.dumps(snap.__dict__) + "\n")


def compute_sharpe_drawdown(snaps: list[NavSnapshot], window_days: int = 30) -> tuple[float, float, int]:
    if len(snaps) < 2:
        return 0.0, 0.0, len(snaps)
    cutoff = snaps[-1].timestamp - window_days * 86400
    windowed = [s for s in snaps if s.timestamp >= cutoff]
    if len(windowed) < 2:
        windowed = snaps[-min(len(snaps), 60) :]

    nav = np.array([s.nav_per_share for s in windowed], dtype=float)
    if nav.min() <= 0:
        return 0.0, 0.0, len(windowed)
    rets = np.diff(np.log(nav))
    # Annualized Sharpe — 365 trading days assumed (24/7 on-chain).
    if rets.std(ddof=0) < 1e-12:
        sharpe = 0.0
    else:
        sharpe = float(math.sqrt(365) * rets.mean() / rets.std(ddof=0))
    peak = np.maximum.accumulate(nav)
    drawdown = float((1 - nav / peak).max())
    return sharpe, drawdown, len(windowed)


def build_report(snaps: list[NavSnapshot], window_days: int = 30) -> FeedbackReport:
    sharpe, dd, samples = compute_sharpe_drawdown(snaps, window_days)
    first = snaps[0].nav_per_share if snaps else 1.0
    last = snaps[-1].nav_per_share if snaps else 1.0
    return FeedbackReport(
        timestamp=int(time.time()),
        window_days=window_days,
        samples=samples,
        sharpe=sharpe,
        max_drawdown=dd,
        nav_first=first,
        nav_last=last,
        total_return=(last / first) - 1 if first > 0 else 0.0,
        snapshots=[s.__dict__ for s in snaps[-30:]],
    )


def encode_int128(value_float: float, decimals: int = 6) -> int:
    """Pack a float into int128 with given decimals — clamps to int128 range."""
    scaled = int(round(value_float * (10**decimals)))
    INT128_MAX = 2**127 - 1
    INT128_MIN = -(2**127)
    return max(INT128_MIN, min(INT128_MAX, scaled))


def keccak_bytes(payload: bytes) -> str:
    """Hashing for `feedbackHash`. Uses keccak256 to match Solidity bytes32 convention."""
    try:
        from eth_utils import keccak

        return "0x" + keccak(payload).hex()
    except Exception:  # pragma: no cover
        return "0x" + hashlib.sha256(payload).hexdigest()


@dataclass
class FeedbackResult:
    sharpe_tx: str | None = None
    drawdown_tx: str | None = None
    report_cid: str | None = None
    skipped_reason: str | None = None
    report: FeedbackReport | None = None


def run_feedback(
    cfg: AtlasConfig,
    private_key: str,
    history_path: Path = DEFAULT_HISTORY_PATH,
    window_days: int = 30,
    min_samples: int = 2,
) -> FeedbackResult:
    """Snapshot NAV, append to history, compute metrics, pin report, write on-chain."""
    executor = OnchainExecutor(
        rpc_url=cfg.network.rpc_url,
        chain_id=cfg.network.chain_id,
        private_key=private_key,
        vault_address=cfg.contracts.vault,
        decision_log_address=cfg.contracts.decision_log,
        reputation_address=cfg.contracts.reputation,
    )

    state = executor.fetch_state(cfg.agent.id)
    total_assets = int(state["total_assets"])
    total_supply = int(state["total_supply"])
    if total_supply == 0:
        return FeedbackResult(skipped_reason="vault empty")
    nav = total_assets / total_supply
    decisions_count = int(executor.decision_log.functions.decisionsCount().call())

    snap = NavSnapshot(
        timestamp=int(time.time()),
        total_assets=total_assets,
        total_supply=total_supply,
        nav_per_share=nav,
        decisions_count=decisions_count,
    )
    append_snapshot(snap, history_path)

    snaps = load_history(history_path)
    if len(snaps) < min_samples:
        return FeedbackResult(
            skipped_reason=f"need ≥{min_samples} NAV snapshots; have {len(snaps)}",
            report=build_report(snaps, window_days),
        )

    report = build_report(snaps, window_days)
    payload = {
        "kind": "atlas-feedback",
        "version": 1,
        "agent_id": cfg.agent.id,
        "window_days": window_days,
        "report": {
            "timestamp": report.timestamp,
            "samples": report.samples,
            "sharpe": report.sharpe,
            "max_drawdown": report.max_drawdown,
            "nav_first": report.nav_first,
            "nav_last": report.nav_last,
            "total_return": report.total_return,
        },
        "tail_snapshots": report.snapshots,
    }
    payload_bytes = json.dumps(payload, sort_keys=True).encode()
    cid = pin_json(payload, endpoint=cfg.ipfs.pin_endpoint, jwt=cfg.ipfs.pin_jwt)
    fhash = keccak_bytes(payload_bytes)

    sharpe_tx = executor.submit_feedback(
        agent_id=cfg.agent.id,
        value=encode_int128(report.sharpe, decimals=6),
        value_decimals=6,
        tag1="sharpe",
        tag2=f"{window_days}d",
        endpoint=ENDPOINT,
        feedback_uri=f"ipfs://{cid}" if not cid.startswith("ipfs://") else cid,
        feedback_hash_hex=fhash,
    )
    drawdown_tx = executor.submit_feedback(
        agent_id=cfg.agent.id,
        value=encode_int128(report.max_drawdown, decimals=6),
        value_decimals=6,
        tag1="drawdown",
        tag2=f"{window_days}d",
        endpoint=ENDPOINT,
        feedback_uri=f"ipfs://{cid}" if not cid.startswith("ipfs://") else cid,
        feedback_hash_hex=fhash,
    )
    return FeedbackResult(sharpe_tx=sharpe_tx, drawdown_tx=drawdown_tx, report_cid=cid, report=report)
