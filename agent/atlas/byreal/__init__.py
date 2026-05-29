"""Byreal bridge — wraps byreal-cli (CLMM DEX skills) and byreal-perps-cli (perps) on Solana.

Atlas keeps its Mantle vault as primary asset. Byreal bridge mirrors a configurable
fraction of TVL onto Byreal CLMM as concentrated liquidity (Alpha from LP fees) and
uses Byreal Perps to hedge when the regime turns risk_off.

Bridge talks to the CLIs via subprocess + `-o json` structured output.
"""
from .skills_bridge import ByrealSkillsBridge, ByrealCLIError
from .perps_bridge import ByrealPerpsBridge
from .coordinator import ByrealCoordinator, ByrealPlan

__all__ = [
    "ByrealSkillsBridge",
    "ByrealPerpsBridge",
    "ByrealCoordinator",
    "ByrealPlan",
    "ByrealCLIError",
]
