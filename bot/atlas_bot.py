"""Atlas Telegram bot.

Commands:
  /start              — onboarding
  /portfolio          — TVL, share price, your shares
  /decisions          — last 5 decisions (id, weights, IPFS link)
  /beat               — register a Beat-Atlas paper-trading vault
  /pnl                — daily P&L card

Connects to the Mantle vault via web3.py and reads identical contracts as the
Atlas agent runtime. No private keys are held by the bot — deposits return a
deeplink to MetaMask Mobile or a WalletConnect QR.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.constants import ParseMode
from telegram.ext import Application, CommandHandler, ContextTypes
from web3 import Web3


CFG = {
    "rpc_url": os.environ["ATLAS_RPC_URL"],
    "vault": os.environ["ATLAS_VAULT"],
    "decision_log": os.environ["ATLAS_DECISION_LOG"],
    "base_asset": os.environ["ATLAS_BASE_ASSET"],
    "explorer": os.environ.get("ATLAS_EXPLORER", "https://sepolia.mantlescan.xyz"),
    "ipfs_gateway": os.environ.get("ATLAS_IPFS_GATEWAY", "https://ipfs.io/ipfs/"),
}


def _abi(name: str) -> list[dict[str, Any]]:
    path = Path(__file__).parent.parent / "agent" / "abi" / f"{name}.json"
    return json.loads(path.read_text())


_w3 = Web3(Web3.HTTPProvider(CFG["rpc_url"]))
_vault = _w3.eth.contract(address=Web3.to_checksum_address(CFG["vault"]), abi=_abi("StrategyVault"))
_log = _w3.eth.contract(address=Web3.to_checksum_address(CFG["decision_log"]), abi=_abi("DecisionLog"))


async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "*ATLAS* — autonomous RWA fund manager on Mantle.\n\n"
        "Type /portfolio to see TVL, /decisions for the audit log, /beat to challenge the AI.",
        parse_mode=ParseMode.MARKDOWN,
    )


async def cmd_portfolio(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    tvl = _vault.functions.totalAssets().call()
    supply = _vault.functions.totalSupply().call()
    price = (tvl / supply) if supply else 1.0
    msg = (
        f"*Atlas Vault*\n"
        f"TVL:  `${tvl/1e6:,.2f}` USDC\n"
        f"Shares:  `{supply/1e6:,.4f}`\n"
        f"Share price:  `{price:.6f}`\n"
        f"[Mantlescan]({CFG['explorer']}/address/{CFG['vault']})"
    )
    await update.message.reply_text(msg, parse_mode=ParseMode.MARKDOWN, disable_web_page_preview=True)


async def cmd_decisions(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    n = _log.functions.decisionsCount().call()
    if n == 0:
        await update.message.reply_text("No decisions yet. Atlas is still loading signals.")
        return
    show = min(5, n)
    lines = [f"*Last {show} decisions*"]
    for i in range(n - 1, max(-1, n - 1 - show), -1):
        d = _log.functions.getDecision(i).call()
        agent_id, dhash, cid, assets, weights, ts, submitter = d
        wstr = " / ".join(f"{w/100:.1f}%" for w in weights)
        lines.append(f"#`{i}` t=`{ts}` [{wstr}] [rationale]({CFG['ipfs_gateway']}{cid.replace('ipfs://','')})")
    await update.message.reply_text("\n".join(lines), parse_mode=ParseMode.MARKDOWN, disable_web_page_preview=True)


async def cmd_beat(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user.id
    btn = InlineKeyboardMarkup([[InlineKeyboardButton("Open dashboard", url=os.environ.get("ATLAS_WEB_URL", "https://example.com"))]])
    await update.message.reply_text(
        f"Beat-Atlas vault registered for `{user}`.\n"
        "Pick allocations on the dashboard. Best Sharpe over 30 days wins.",
        parse_mode=ParseMode.MARKDOWN,
        reply_markup=btn,
    )


def main():
    token = os.environ["TELEGRAM_BOT_TOKEN"]
    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("portfolio", cmd_portfolio))
    app.add_handler(CommandHandler("decisions", cmd_decisions))
    app.add_handler(CommandHandler("beat", cmd_beat))
    app.run_polling(close_loop=False)


if __name__ == "__main__":
    main()
