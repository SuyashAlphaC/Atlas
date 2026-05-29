"""Wrapper around `byreal-cli` (Byreal Agent Skills).

The Byreal CLI is installed via `npm install -g @byreal-io/byreal-cli`. All commands
accept `-o json` for structured output, which we parse into typed dataclasses.

Wallet + RPC configuration is handled out-of-band via `byreal-cli setup`. The bridge
itself stays stateless and side-effect-only on explicit method calls.

Reference: https://github.com/byreal-git/byreal-agent-skills
"""
from __future__ import annotations

import json
import logging
import shutil
import subprocess
from dataclasses import dataclass
from typing import Any

log = logging.getLogger("atlas.byreal.skills")


class ByrealCLIError(RuntimeError):
    """Raised when the byreal-cli subprocess exits non-zero or returns invalid JSON."""


@dataclass
class WalletState:
    address: str
    sol_balance: float
    tokens: dict[str, float]


@dataclass
class SwapResult:
    tx_signature: str
    input_mint: str
    output_mint: str
    input_amount: float
    output_amount: float
    raw: dict[str, Any]


@dataclass
class PositionResult:
    position_id: str
    pool: str
    lower_tick: int
    upper_tick: int
    liquidity: float
    raw: dict[str, Any]


class ByrealSkillsBridge:
    """Subprocess wrapper for `byreal-cli`."""

    def __init__(self, binary: str = "byreal-cli", default_timeout_s: int = 90, dry_run: bool = False):
        self.binary = binary
        self.timeout = default_timeout_s
        self.dry_run = dry_run

    # ─────────────────────── primitives ───────────────────────

    def _run(self, args: list[str], extra_env: dict[str, str] | None = None) -> dict[str, Any]:
        if shutil.which(self.binary) is None:
            raise ByrealCLIError(
                f"`{self.binary}` not on PATH. Install: npm install -g @byreal-io/byreal-cli "
                "then run `byreal-cli setup`."
            )
        cmd = [self.binary, *args, "-o", "json"]
        if self.dry_run and "--dry-run" not in cmd:
            cmd.append("--dry-run")
        log.debug("byreal-cli exec: %s", " ".join(cmd))
        try:
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=self.timeout,
                check=False,
                env=None if extra_env is None else {**__import__("os").environ, **extra_env},
            )
        except subprocess.TimeoutExpired as e:
            raise ByrealCLIError(f"byreal-cli timeout after {self.timeout}s on {args[0]}") from e
        if proc.returncode != 0:
            raise ByrealCLIError(f"byreal-cli exit {proc.returncode}: {proc.stderr.strip() or proc.stdout.strip()}")
        try:
            return json.loads(proc.stdout)
        except json.JSONDecodeError as e:
            raise ByrealCLIError(f"byreal-cli returned non-JSON: {proc.stdout[:200]}") from e

    # ─────────────────────── wallet ───────────────────────

    def wallet(self) -> WalletState:
        addr = self._run(["wallet", "address"])
        bal = self._run(["wallet", "balance"])
        tokens = {t["symbol"]: float(t["amount"]) for t in bal.get("tokens", [])}
        return WalletState(
            address=str(addr.get("address", "")),
            sol_balance=float(bal.get("sol", 0)),
            tokens=tokens,
        )

    # ─────────────────────── swap ───────────────────────

    def swap(self, input_mint: str, output_mint: str, amount: float, slippage_bps: int = 50) -> SwapResult:
        raw = self._run(
            [
                "swap",
                "execute",
                "--input-mint",
                input_mint,
                "--output-mint",
                output_mint,
                "--amount",
                str(amount),
                "--slippage-bps",
                str(slippage_bps),
            ]
        )
        return SwapResult(
            tx_signature=str(raw.get("signature", "")),
            input_mint=input_mint,
            output_mint=output_mint,
            input_amount=float(raw.get("inputAmount", amount)),
            output_amount=float(raw.get("outputAmount", 0)),
            raw=raw,
        )

    # ─────────────────────── positions ───────────────────────

    def positions(self) -> list[PositionResult]:
        raw = self._run(["positions", "list"])
        out: list[PositionResult] = []
        for p in raw.get("positions", []):
            out.append(
                PositionResult(
                    position_id=str(p.get("id")),
                    pool=str(p.get("pool")),
                    lower_tick=int(p.get("lowerTick", 0)),
                    upper_tick=int(p.get("upperTick", 0)),
                    liquidity=float(p.get("liquidity", 0)),
                    raw=p,
                )
            )
        return out

    def open_position(self, pool: str, lower_tick: int, upper_tick: int, amount_token_a: float, amount_token_b: float) -> PositionResult:
        raw = self._run(
            [
                "positions",
                "open",
                "--pool",
                pool,
                "--lower-tick",
                str(lower_tick),
                "--upper-tick",
                str(upper_tick),
                "--amount-a",
                str(amount_token_a),
                "--amount-b",
                str(amount_token_b),
            ]
        )
        return PositionResult(
            position_id=str(raw.get("id")),
            pool=pool,
            lower_tick=lower_tick,
            upper_tick=upper_tick,
            liquidity=float(raw.get("liquidity", 0)),
            raw=raw,
        )

    def close_position(self, position_id: str) -> dict[str, Any]:
        return self._run(["positions", "close", "--id", position_id])

    def claim_rewards(self, position_id: str) -> dict[str, Any]:
        return self._run(["positions", "claim-rewards", "--id", position_id])

    # ─────────────────────── pools + signals ───────────────────────

    def pool_info(self, pool: str) -> dict[str, Any]:
        return self._run(["pools", "info", "--pool", pool])

    def overview(self) -> dict[str, Any]:
        return self._run(["overview"])
