"""Lightweight IPFS pin helper.

Uses Pinata-compatible JSON pin endpoint if configured. Falls back to a local-CID
emulation (sha256-derived) so the pipeline works offline; on-chain decisionLog
still anchors the rationale hash, but a public gateway is needed for verification.
"""
from __future__ import annotations

import hashlib
import json
from typing import Any

import httpx


def _pseudo_cid(data: bytes) -> str:
    digest = hashlib.sha256(data).hexdigest()
    return f"baf-pseudo-{digest[:46]}"


def pin_json(payload: dict[str, Any], endpoint: str = "", jwt: str = "") -> str:
    body = json.dumps(payload, sort_keys=True).encode()
    if not endpoint:
        return _pseudo_cid(body)
    headers = {"Authorization": f"Bearer {jwt}"} if jwt else {}
    r = httpx.post(endpoint, content=body, headers={**headers, "Content-Type": "application/json"}, timeout=30)
    r.raise_for_status()
    # Pinata returns {"IpfsHash": "..."}; generic JSON pin services may return {"cid": "..."}.
    j = r.json()
    return j.get("IpfsHash") or j.get("cid") or _pseudo_cid(body)
