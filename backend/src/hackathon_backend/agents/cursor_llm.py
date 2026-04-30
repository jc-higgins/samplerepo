"""Cursor SDK bridge for live LLM enrichment.

The Cursor SDK is TypeScript/Node only, so we proxy through a tiny Node
sidecar at ``services/cursor_invoke.mjs``. This module:

* Loads ``.env`` from the repo root (stdlib only — no python-dotenv dep).
* Exposes ``call_cursor(system, user, ...)`` for one-shot prompts.
* Provides task-shaped helpers ``enrich_transaction`` and ``draft_email``
  that return ``None`` whenever the SDK is unavailable / unauthenticated /
  too slow, so callers can always fall back to deterministic baselines.

Nothing here ever raises into the request lifecycle.
"""

from __future__ import annotations

import json
import logging
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any

LOG = logging.getLogger("autocfo.cursor_llm")


# --- .env loader (stdlib) ---------------------------------------------------


def _strip_quotes(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
        return value[1:-1]
    return value


def _load_dotenv_once(path: Path) -> None:
    """Populate ``os.environ`` from ``path`` if not already set.

    Tolerates ``KEY=value``, ``KEY = value``, single/double quoted values,
    blank lines, and ``#`` comments.
    """
    if not path.is_file():
        return
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = _strip_quotes(value.strip())
        if key and key not in os.environ:
            os.environ[key] = value


_REPO_ROOT = Path(__file__).resolve().parents[4]
_load_dotenv_once(_REPO_ROOT / ".env")


# --- Node sidecar invocation ------------------------------------------------


_SERVICES_DIR = _REPO_ROOT / "services"
_NODE_SCRIPT = _SERVICES_DIR / "cursor_invoke.mjs"
_NODE_BIN = shutil.which("node")
_DEFAULT_MODEL = os.environ.get("CURSOR_MODEL", "composer-2")
_DEFAULT_TIMEOUT_MS = int(os.environ.get("CURSOR_TIMEOUT_MS", "25000"))
_HARD_PYTHON_TIMEOUT = 35.0  # subprocess wall clock


def default_model() -> str:
    return _DEFAULT_MODEL


def node_available() -> bool:
    return bool(_NODE_BIN)


def is_available() -> bool:
    return bool(
        _NODE_BIN
        and _NODE_SCRIPT.is_file()
        and (_SERVICES_DIR / "node_modules" / "@cursor" / "sdk").exists()
        and os.environ.get("CURSOR_API_KEY")
    )


def status() -> dict:
    """Structured snapshot for /llm/status — never raises."""
    return {
        "available": is_available(),
        "default_model": _DEFAULT_MODEL,
        "node": bool(_NODE_BIN),
        "key_present": bool(os.environ.get("CURSOR_API_KEY")),
        "sidecar": str(_NODE_SCRIPT) if _NODE_SCRIPT.is_file() else None,
    }


def call_cursor(
    *,
    system: str,
    user: str,
    expect_json: bool = False,
    model: str | None = None,
    timeout_ms: int | None = None,
) -> dict[str, Any] | None:
    """Run one prompt through the Cursor SDK. Returns ``None`` on any failure."""
    if not is_available():
        LOG.debug("cursor_llm unavailable (node/sdk/key missing)")
        return None

    payload = {
        "system": system,
        "user": user,
        "expect_json": expect_json,
        "model": model or _DEFAULT_MODEL,
        "timeout_ms": timeout_ms or _DEFAULT_TIMEOUT_MS,
    }

    try:
        proc = subprocess.run(
            [_NODE_BIN, str(_NODE_SCRIPT)],
            input=json.dumps(payload),
            capture_output=True,
            text=True,
            cwd=str(_SERVICES_DIR),
            env={**os.environ},
            timeout=_HARD_PYTHON_TIMEOUT,
        )
    except subprocess.TimeoutExpired:
        LOG.warning("cursor_llm subprocess timeout")
        return None
    except OSError as exc:
        LOG.warning("cursor_llm subprocess error: %s", exc)
        return None

    if not proc.stdout:
        LOG.warning("cursor_llm empty stdout (rc=%s, stderr=%s)", proc.returncode, proc.stderr[:200])
        return None
    try:
        result = json.loads(proc.stdout)
    except json.JSONDecodeError:
        LOG.warning("cursor_llm bad json stdout: %s", proc.stdout[:200])
        return None

    if not result.get("ok"):
        LOG.info("cursor_llm SDK error: %s", result.get("error"))
        return None
    return result


# --- Task-shaped helpers ----------------------------------------------------


def enrich_transaction(
    raw: dict,
    rule_classification: dict,
    history: list[dict] | None = None,
) -> dict | None:
    """Ask Cursor to write a human-readable take on a fresh bank line.

    ``raw`` is the original injected dict; ``rule_classification`` is what
    the deterministic ledger agent emitted (category, confidence, etc.).
    ``history`` is up to ~5 recent transactions for context.
    """
    history_lines = []
    for h in (history or [])[:5]:
        history_lines.append(
            f"  - {h.get('date')} {h.get('counterparty')} "
            f"{h.get('amount')} {h.get('currency','GBP')} "
            f"[{h.get('category')}]"
        )
    history_text = "\n".join(history_lines) or "  (no recent history for this counterparty)"

    system = (
        "You are AutoCFO's senior analyst. A new bank transaction has just "
        "arrived from the founder's bank webhook. Your job is to give a "
        "short, plain-English read on what it is and whether it deserves "
        "human attention. Be specific, calm, and concise — this surfaces "
        "live in the dashboard. Never invent numbers."
    )
    user = (
        "## New transaction\n"
        f"  date: {raw.get('date')}\n"
        f"  description: {raw.get('description')}\n"
        f"  amount: {raw.get('amount')} {raw.get('currency','GBP')}\n"
        f"  counterparty: {raw.get('counterparty')}\n\n"
        "## Deterministic rule engine output\n"
        f"  category: {rule_classification.get('category')}\n"
        f"  confidence: {rule_classification.get('confidence')}\n"
        f"  review_flag: {rule_classification.get('review_flag')}\n"
        f"  anomaly_reason: {rule_classification.get('anomaly_reason')}\n\n"
        "## Recent history with same counterparty (most recent first)\n"
        f"{history_text}\n\n"
        "Return JSON with these fields:\n"
        '  natural_explanation: string  (1-2 sentences, plain English)\n'
        '  concern_level: "low" | "medium" | "high"\n'
        '  concern_reason: string  (or "" if concern_level is "low")\n'
        '  agrees_with_rule_engine: boolean\n'
        '  suggested_followup: string  (one concrete next step or "")\n'
    )
    result = call_cursor(system=system, user=user, expect_json=True, timeout_ms=20000)
    if result is None:
        return None
    parsed = result.get("parsed")
    if not isinstance(parsed, dict):
        return None
    parsed["_meta"] = {
        "model": result.get("model"),
        "elapsed_ms": result.get("elapsed_ms"),
    }
    return parsed


def draft_email(
    *,
    purpose: str,
    recipient_name: str,
    recipient_email: str,
    sender_name: str = "AutoCFO Operations",
    sender_company: str = "Acme Robotics Ltd",
    context_lines: list[str] | None = None,
    tone: str = "professional, concise, finance-team voice",
) -> dict | None:
    """Draft a subject + body email tied to a specific operational purpose."""
    context = "\n".join(f"  - {ln}" for ln in (context_lines or [])) or "  (no extra context)"

    system = (
        "You are AutoCFO's outbound communications assistant. Draft a short, "
        "polite, factual email a finance operator would send. Never threaten, "
        "never invent payment details. Match the tone requested. Output "
        "ONLY a JSON object — no greeting in the JSON, no markdown."
    )
    user = (
        f"## Purpose\n{purpose}\n\n"
        f"## Recipient\nName: {recipient_name}\nEmail: {recipient_email}\n\n"
        f"## Sender\n{sender_name} <{sender_name.lower().replace(' ', '.')}@autocfo.local>\n"
        f"On behalf of: {sender_company}\n\n"
        f"## Tone\n{tone}\n\n"
        "## Context\n"
        f"{context}\n\n"
        "Return JSON with fields:\n"
        '  subject: string  (under 80 chars)\n'
        '  body: string     (plain text, paragraphs separated by \\n\\n, no signature placeholders like [Your Name])\n'
        '  call_to_action: string  (one line summary of what you are asking the recipient to do)\n'
    )
    result = call_cursor(system=system, user=user, expect_json=True, timeout_ms=20000)
    if result is None:
        return None
    parsed = result.get("parsed")
    if not isinstance(parsed, dict):
        return None
    parsed.setdefault("call_to_action", "")
    parsed["_meta"] = {
        "model": result.get("model"),
        "elapsed_ms": result.get("elapsed_ms"),
    }
    return parsed
