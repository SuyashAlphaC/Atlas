"""Wrapper around `byreal-perps-cli` for delta hedging on Byreal Perps.

Atlas uses Byreal Perps in two narrow situations:
  1. Risk-off regime: open small short BTC/ETH perp to hedge LP exposure on Byreal CLMM.
  2. Funding-rate carry: long when funding turns negative beyond a threshold.

Reference: https://github.com/byreal-git/byreal-perps-cli
"""
from __future__ import annotations

import json
import logging
import shutil
import subprocess
from dataclasses import dataclass
from typing import Any, Literal

from .skills_bridge import ByrealCLIError

log = logging.getLogger("atlas.byreal.perps")

Side = Literal["buy", "sell"]


@dataclass
class OrderResult:
    order_id: str
    symbol: str
    side: Side
    size: float
    tp: float | None
    sl: float | None
    raw: dict[str, Any]


@dataclass
class Position:
    symbol: str
    size: float
    entry_price: float
    leverage: float
    unrealized_pnl: float
    raw: dict[str, Any]


class ByrealPerpsBridge:
    def __init__(self, binary: str = "byreal-perps-cli", default_timeout_s: int = 60):
        self.binary = binary
        self.timeout = default_timeout_s

    def _run(self, args: list[str]) -> dict[str, Any]:
        if shutil.which(self.binary) is None:
            raise ByrealCLIError(
                f"`{self.binary}` not on PATH. Install: npm install -g @byreal-io/byreal-perps-cli "
                "then `byreal-perps-cli account init`."
            )
        cmd = [self.binary, *args, "-o", "json"]
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=self.timeout, check=False)
        except subprocess.TimeoutExpired as e:
            raise ByrealCLIError(f"byreal-perps-cli timeout on {args[0]}") from e
        if proc.returncode != 0:
            raise ByrealCLIError(f"byreal-perps-cli exit {proc.returncode}: {proc.stderr.strip() or proc.stdout.strip()}")
        try:
            return json.loads(proc.stdout)
        except json.JSONDecodeError as e:
            raise ByrealCLIError(f"byreal-perps-cli returned non-JSON: {proc.stdout[:200]}") from e

    # ─────────────────────── account ───────────────────────

    def balance(self) -> dict[str, Any]:
        return self._run(["account", "balance"])

    # ─────────────────────── orders ───────────────────────

    def market_order(self, symbol: str, side: Side, size: float, tp: float | None = None, sl: float | None = None) -> OrderResult:
        args = ["order", "market", side, str(size), symbol]
        if tp is not None:
            args += ["--tp", str(tp)]
        if sl is not None:
            args += ["--sl", str(sl)]
        raw = self._run(args)
        return OrderResult(
            order_id=str(raw.get("orderId", "")),
            symbol=symbol,
            side=side,
            size=size,
            tp=tp,
            sl=sl,
            raw=raw,
        )

    def limit_order(self, symbol: str, side: Side, size: float, price: float, tp: float | None = None, sl: float | None = None) -> OrderResult:
        args = ["order", "limit", side, str(size), symbol, "--price", str(price)]
        if tp is not None:
            args += ["--tp", str(tp)]
        if sl is not None:
            args += ["--sl", str(sl)]
        raw = self._run(args)
        return OrderResult(
            order_id=str(raw.get("orderId", "")),
            symbol=symbol,
            side=side,
            size=size,
            tp=tp,
            sl=sl,
            raw=raw,
        )

    # ─────────────────────── positions ───────────────────────

    def positions(self) -> list[Position]:
        raw = self._run(["position", "list"])
        out: list[Position] = []
        for p in raw.get("positions", []):
            out.append(
                Position(
                    symbol=str(p.get("symbol")),
                    size=float(p.get("size", 0)),
                    entry_price=float(p.get("entryPrice", 0)),
                    leverage=float(p.get("leverage", 1)),
                    unrealized_pnl=float(p.get("unrealizedPnl", 0)),
                    raw=p,
                )
            )
        return out

    def close_market(self, symbol: str) -> dict[str, Any]:
        return self._run(["position", "close-market", symbol])

    def set_leverage(self, symbol: str, leverage: int) -> dict[str, Any]:
        return self._run(["position", "leverage", symbol, str(leverage)])

    # ─────────────────────── signals ───────────────────────

    def scan(self) -> dict[str, Any]:
        return self._run(["signal", "scan"])

    def catalog(self) -> dict[str, Any]:
        """Discover the CLI surface programmatically — useful for compatibility checks."""
        return self._run(["catalog"])
