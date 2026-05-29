from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class NetworkConfig(BaseModel):
    name: str
    chain_id: int
    rpc_url: str
    explorer: str


class ContractsConfig(BaseModel):
    identity: str
    reputation: str
    decision_log: str
    vault: str
    base_asset: str


class AgentConfig(BaseModel):
    id: int
    rebalance_interval_seconds: int = 3600
    min_action_threshold_bps: int = 50
    max_weight_per_adapter_bps: int = 6500
    min_cash_bps: int = 500


class RiskConfig(BaseModel):
    target_vol_annual: float = 0.08
    max_drawdown_alert_bps: int = 1500


class SignalsConfig(BaseModel):
    regime_lookback_days: int = 90
    factor_lookback_days: int = 180


class LLMConfig(BaseModel):
    enabled: bool = True
    model: str = "claude-opus-4-7"
    max_tokens: int = 800


class IPFSConfig(BaseModel):
    gateway: str = "https://ipfs.io/ipfs/"
    pin_endpoint: str = ""
    pin_jwt: str = ""


class ByrealConfigModel(BaseModel):
    enabled: bool = False
    mirror_pct: float = 0.05
    hedge_pct: float = 0.10
    cmm_pool: str = ""
    cmm_input_mint: str = ""
    cmm_output_mint: str = ""
    hedge_symbol: str = "BTC"
    max_leverage: int = 3
    dry_run: bool = True


class AtlasConfig(BaseSettings):
    network: NetworkConfig
    contracts: ContractsConfig
    agent: AgentConfig
    risk: RiskConfig = Field(default_factory=RiskConfig)
    signals: SignalsConfig = Field(default_factory=SignalsConfig)
    llm: LLMConfig = Field(default_factory=LLMConfig)
    ipfs: IPFSConfig = Field(default_factory=IPFSConfig)
    byreal: ByrealConfigModel = Field(default_factory=ByrealConfigModel)

    model_config = SettingsConfigDict(env_prefix="ATLAS_", env_nested_delimiter="__")


def _strip_empty(d: Any) -> Any:
    """Recursively drop empty-string / None entries so pydantic-settings env vars can fill them."""
    if isinstance(d, dict):
        out = {}
        for k, v in d.items():
            cleaned = _strip_empty(v)
            if cleaned in ("", None):
                continue
            if isinstance(cleaned, dict) and not cleaned:
                continue
            out[k] = cleaned
        return out
    return d


def load_config(path: str | Path) -> AtlasConfig:
    raw: dict[str, Any] = yaml.safe_load(Path(path).read_text())
    return AtlasConfig(**_strip_empty(raw))
