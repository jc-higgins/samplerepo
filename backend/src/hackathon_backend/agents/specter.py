"""Optional Specter Enrichment API (company by domain)."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

_URL = "https://app.tryspecter.com/api/v1/companies"


def fetch_company(domain: str) -> dict | None:
    key = (os.environ.get("SPECTER_API_KEY") or "").strip()
    if not key or not domain.strip():
        return None
    body = json.dumps({"domain": domain.strip()}).encode()
    req = urllib.request.Request(
        _URL,
        data=body,
        headers={
            "X-API-KEY": key,
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.load(resp)
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return None
    if isinstance(data, list) and data and isinstance(data[0], dict):
        return data[0]
    return None
