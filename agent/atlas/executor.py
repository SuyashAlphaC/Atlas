"""On-chain executor: posts rebalance + decision-log commit in a single tx."""
from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from eth_account import Account
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware

log = logging.getLogger("atlas.executor")


def _load_abi(name: str) -> list[dict[str, Any]]:
    abi_path = Path(__file__).parent.parent / "abi" / f"{name}.json"
    return json.loads(abi_path.read_text())


@dataclass
class ExecResult:
    tx_hash: str
    block_number: int
    decision_id: int | None
    gas_used: int


class OnchainExecutor:
    def __init__(
        self,
        rpc_url: str,
        chain_id: int,
        private_key: str,
        vault_address: str,
        decision_log_address: str,
        reputation_address: str | None = None,
    ):
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
        self.chain_id = chain_id
        self.account = Account.from_key(private_key)
        self.vault = self.w3.eth.contract(address=Web3.to_checksum_address(vault_address), abi=_load_abi("StrategyVault"))
        self.decision_log = self.w3.eth.contract(
            address=Web3.to_checksum_address(decision_log_address), abi=_load_abi("DecisionLog")
        )
        self.reputation = None
        if reputation_address:
            self.reputation = self.w3.eth.contract(
                address=Web3.to_checksum_address(reputation_address), abi=_load_abi("ReputationRegistry")
            )

    @staticmethod
    def decision_hash(weights_bps: list[int], rationale_cid: str, timestamp_ms: int) -> str:
        payload = json.dumps({"w": weights_bps, "r": rationale_cid, "t": timestamp_ms}, sort_keys=True)
        return "0x" + hashlib.sha256(payload.encode()).hexdigest()

    def _fee_params(self) -> dict[str, int]:
        """Pull current base fee + priority from the chain and budget headroom.

        Mantle's base fee fluctuates; a static 0.5 gwei is often below it. We over-
        estimate by 2x base + priority so the tx survives a same-block spike.
        """
        latest = self.w3.eth.get_block("latest")
        base_fee = int(latest.get("baseFeePerGas") or self.w3.eth.gas_price)
        try:
            priority = int(self.w3.eth.max_priority_fee)
        except Exception:
            priority = self.w3.to_wei(0.01, "gwei")
        # Floor priority so the sequencer accepts it; never below 0.01 gwei.
        priority = max(priority, self.w3.to_wei(0.01, "gwei"))
        max_fee = base_fee * 2 + priority
        return {"maxFeePerGas": max_fee, "maxPriorityFeePerGas": priority}

    def submit_rebalance(self, weights_bps: list[int], decision_hash_hex: str, rationale_cid: str) -> ExecResult:
        # Use "pending" so a just-broadcast tx (still propagating through Alchemy)
        # doesn't cause the next call to reuse the same nonce.
        nonce = self.w3.eth.get_transaction_count(self.account.address, "pending")
        fn = self.vault.functions.rebalance(weights_bps, bytes.fromhex(decision_hash_hex[2:]), rationale_cid)
        gas_estimate = fn.estimate_gas({"from": self.account.address})
        fees = self._fee_params()
        tx = fn.build_transaction(
            {
                "from": self.account.address,
                "nonce": nonce,
                "gas": int(gas_estimate * 12 // 10),
                "maxFeePerGas": fees["maxFeePerGas"],
                "maxPriorityFeePerGas": fees["maxPriorityFeePerGas"],
                "chainId": self.chain_id,
            }
        )
        signed = self.account.sign_transaction(tx)
        log.info(
            "submit rebalance: gas=%d maxFee=%d gwei prio=%d gwei",
            tx["gas"],
            tx["maxFeePerGas"] // 10**9,
            tx["maxPriorityFeePerGas"] // 10**9,
        )
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        rcpt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)
        decision_id = None
        # Filter to vault-emitted logs only — silences MismatchedABI warnings on the token
        # Transfer/Approval logs that share the same receipt.
        topic_hex = self.vault.events.Rebalanced().topic.lower().lstrip("0x")
        vault_addr = self.vault.address.lower()
        vault_logs = []
        for lg in rcpt.logs:
            if lg["address"].lower() != vault_addr or not lg["topics"]:
                continue
            t0 = lg["topics"][0].hex().lower().lstrip("0x")
            if t0 == topic_hex:
                vault_logs.append(lg)
        for ev in self.vault.events.Rebalanced().process_receipt({"logs": vault_logs}):
            decision_id = int(ev["args"]["decisionId"])
            break
        return ExecResult(
            tx_hash=tx_hash.hex(), block_number=rcpt.blockNumber, decision_id=decision_id, gas_used=rcpt.gasUsed
        )

    def fetch_state(self, agent_id: int) -> dict[str, Any]:
        adapters = self.vault.functions.adapters().call()
        return {
            "total_assets": self.vault.functions.totalAssets().call(),
            "total_supply": self.vault.functions.totalSupply().call(),
            "adapters": adapters,
            "agent_id": int(self.vault.functions.agentId().call()),
        }

    def submit_feedback(
        self,
        agent_id: int,
        value: int,
        value_decimals: int,
        tag1: str,
        tag2: str,
        endpoint: str,
        feedback_uri: str,
        feedback_hash_hex: str,
    ) -> str:
        """Call ReputationRegistry.giveFeedback. msg.sender is recorded as the client."""
        if self.reputation is None:
            raise RuntimeError("ReputationRegistry address not configured")
        # Use "pending" so a just-broadcast tx (still propagating through Alchemy)
        # doesn't cause the next call to reuse the same nonce.
        nonce = self.w3.eth.get_transaction_count(self.account.address, "pending")
        fee_hash_bytes = bytes.fromhex(feedback_hash_hex[2:] if feedback_hash_hex.startswith("0x") else feedback_hash_hex)
        fn = self.reputation.functions.giveFeedback(
            agent_id, int(value), int(value_decimals), tag1, tag2, endpoint, feedback_uri, fee_hash_bytes
        )
        gas_estimate = fn.estimate_gas({"from": self.account.address})
        fees = self._fee_params()
        tx = fn.build_transaction(
            {
                "from": self.account.address,
                "nonce": nonce,
                "gas": int(gas_estimate * 12 // 10),
                "maxFeePerGas": fees["maxFeePerGas"],
                "maxPriorityFeePerGas": fees["maxPriorityFeePerGas"],
                "chainId": self.chain_id,
            }
        )
        signed = self.account.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)
        return tx_hash.hex()
