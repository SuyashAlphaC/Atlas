"""Atlas CLI — run a single step, run loop, simulate offline backtest."""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path

import typer
from rich import print as rprint

from .config import load_config
from .runtime import AtlasAgent

app = typer.Typer(no_args_is_help=True, help="Atlas — Autonomous RWA Alpha Strategist")
log = logging.getLogger("atlas")


def _setup_logging():
    logging.basicConfig(level=os.getenv("ATLAS_LOG", "INFO"), format="%(asctime)s %(name)s %(levelname)s %(message)s")


@app.command()
def step(
    config: Path = typer.Option(Path("configs/atlas.yaml"), "--config", help="Path to atlas.yaml"),
    private_key_env: str = typer.Option("AGENT_PK", "--pk-env", help="Env var containing agent private key"),
):
    """Run one rebalance step."""
    _setup_logging()
    cfg = load_config(config)
    pk = os.environ[private_key_env]
    agent = AtlasAgent(cfg, pk)
    out = agent.step()
    rprint(out)


@app.command()
def loop(
    config: Path = typer.Option(Path("configs/atlas.yaml"), "--config"),
    private_key_env: str = typer.Option("AGENT_PK", "--pk-env"),
):
    """Run the rebalance loop forever."""
    _setup_logging()
    cfg = load_config(config)
    pk = os.environ[private_key_env]
    agent = AtlasAgent(cfg, pk)
    agent.loop()


@app.command()
def feedback(
    config: Path = typer.Option(Path("configs/atlas.yaml"), "--config"),
    private_key_env: str = typer.Option("AGENT_PK", "--pk-env"),
    window_days: int = typer.Option(30, "--window"),
    min_samples: int = typer.Option(2, "--min-samples"),
):
    """Snapshot NAV → Sharpe + drawdown → ERC-8004 ReputationRegistry."""
    from .feedback import run_feedback

    _setup_logging()
    cfg = load_config(config)
    pk = os.environ[private_key_env]
    result = run_feedback(cfg, pk, window_days=window_days, min_samples=min_samples)
    rprint({
        "skipped_reason": result.skipped_reason,
        "sharpe_tx": result.sharpe_tx,
        "drawdown_tx": result.drawdown_tx,
        "report_cid": result.report_cid,
        "report": result.report.__dict__ if result.report else None,
    })


@app.command("byreal-check")
def byreal_check():
    """Verify byreal-cli and byreal-perps-cli are installed + authenticated."""
    from .byreal import ByrealCLIError, ByrealPerpsBridge, ByrealSkillsBridge

    _setup_logging()
    skills = ByrealSkillsBridge()
    perps = ByrealPerpsBridge()
    try:
        w = skills.wallet()
        rprint({"skills_wallet": w.__dict__})
    except ByrealCLIError as e:
        rprint(f"[red]Skills CLI not ready:[/red] {e}")
    try:
        b = perps.balance()
        rprint({"perps_balance": b})
    except ByrealCLIError as e:
        rprint(f"[red]Perps CLI not ready:[/red] {e}")


@app.command("byreal-plan")
def byreal_plan(
    config: Path = typer.Option(Path("configs/atlas.yaml"), "--config"),
    regime: str = typer.Option("neutral", help="risk_off | neutral | risk_on"),
    macro: int = typer.Option(0, help="-2..+2 tilt"),
    tvl_usd: float = typer.Option(100_000.0, help="Mantle vault TVL to mirror against"),
):
    """Dry-run a Byreal plan against the current config (no on-chain calls)."""
    from .byreal.coordinator import ByrealConfig, ByrealCoordinator

    _setup_logging()
    cfg = load_config(config)
    coord = ByrealCoordinator(
        ByrealConfig(
            enabled=True,  # force-on for the dry plan
            mirror_pct=cfg.byreal.mirror_pct,
            hedge_pct=cfg.byreal.hedge_pct,
            cmm_pool=cfg.byreal.cmm_pool or "DEMO-POOL",
            cmm_input_mint=cfg.byreal.cmm_input_mint or "USDC",
            cmm_output_mint=cfg.byreal.cmm_output_mint or "SOL",
            hedge_symbol=cfg.byreal.hedge_symbol,
            max_leverage=cfg.byreal.max_leverage,
            dry_run=True,
        )
    )
    plan = coord.plan(weights_bps=[500, 4750, 2750, 2000], regime_label=regime, macro_tilt=macro, mantle_tvl_usd=tvl_usd)
    rprint(plan.as_dict())


@app.command()
def backtest(
    config: Path = typer.Option(Path("configs/atlas.yaml"), "--config"),
    days: int = typer.Option(180, help="Backtest window length"),
):
    """Replay regime + factor pipeline over a synthetic price history. No on-chain calls."""
    from .backtest import run_backtest

    _setup_logging()
    cfg = load_config(config)
    result = run_backtest(cfg, days)
    print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    app()
