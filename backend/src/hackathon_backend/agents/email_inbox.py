"""Email inbox poller.

Connects to a Gmail IMAP account, tracks which message UIDs have been
seen, and exposes ``poll_new()`` returning any newly arrived messages
since the previous call. When the body contains a JSON receipt block,
it is parsed into a structured ``receipt`` field for the frontend popup
and (best-effort) auto-injected as a live raw transaction so the
dashboard updates without a manual refresh.

State is in-memory only \u2014 demo affordance, no persistence. Credentials
default to the demo Gmail account from ``check_email.py`` and can be
overridden with ``AUTOCFO_INBOX_USER`` / ``AUTOCFO_INBOX_PASS`` /
``AUTOCFO_INBOX_HOST``.
"""

from __future__ import annotations

import email
import imaplib
import json
import os
import re
from email.header import decode_header
from email.message import Message
from typing import Any

from . import data_source

_USER = os.getenv("AUTOCFO_INBOX_USER", "cursorhack2026@gmail.com")
_PASS = os.getenv("AUTOCFO_INBOX_PASS", "gyaq qurq kicx hhop")
_HOST = os.getenv("AUTOCFO_INBOX_HOST", "imap.gmail.com")

_seen_uids: set[bytes] | None = None
_last_error: str | None = None
_JSON_BLOCK_RE = re.compile(r"\{[\s\S]*\}")


def _connect() -> imaplib.IMAP4_SSL:
    m = imaplib.IMAP4_SSL(_HOST)
    m.login(_USER, _PASS)
    m.select("inbox")
    return m


def _safe_logout(m: imaplib.IMAP4_SSL) -> None:
    try:
        m.logout()
    except Exception:
        pass


def _decode(value: str | None) -> str:
    if not value:
        return ""
    parts = decode_header(value)
    out: list[str] = []
    for text, charset in parts:
        if isinstance(text, bytes):
            try:
                out.append(text.decode(charset or "utf-8", errors="replace"))
            except LookupError:
                out.append(text.decode("utf-8", errors="replace"))
        else:
            out.append(text)
    return "".join(out)


def _extract_body(msg: Message) -> str:
    """Pick the best plaintext body out of a possibly-multipart message."""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    return payload.decode(charset, errors="replace")
        for part in msg.walk():
            if part.get_content_type() == "text/html":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    return payload.decode(charset, errors="replace")
        return ""
    payload = msg.get_payload(decode=True)
    if payload:
        charset = msg.get_content_charset() or "utf-8"
        return payload.decode(charset, errors="replace")
    return ""


def _try_parse_receipt(body: str) -> dict | None:
    if not body:
        return None
    candidate = body.strip()
    try:
        obj = json.loads(candidate)
        if isinstance(obj, dict):
            return obj
    except Exception:
        pass
    match = _JSON_BLOCK_RE.search(candidate)
    if match:
        try:
            obj = json.loads(match.group(0))
            if isinstance(obj, dict):
                return obj
        except Exception:
            pass
    return None


def _receipt_to_raw_transaction(receipt: dict, msg_uid: str) -> dict | None:
    """Best-effort: turn a parsed receipt into a raw bank-line dict."""
    total = receipt.get("total")
    merchant = receipt.get("merchant") or receipt.get("vendor")
    if total is None or not merchant:
        return None
    try:
        amount = -abs(float(total))
    except (TypeError, ValueError):
        return None
    date_field = receipt.get("datetime") or receipt.get("date") or ""
    date_str = date_field[:10] if isinstance(date_field, str) else ""
    description = (
        receipt.get("description")
        or f"{merchant} {receipt.get('order_id', '')}".strip().upper()
    )
    return {
        "id": f"txn_email_{msg_uid}",
        "date": date_str or None,
        "description": description,
        "amount": amount,
        "currency": receipt.get("currency", "GBP"),
        "counterparty": str(merchant),
    }


def prime() -> dict:
    """Mark every existing inbox UID as seen so future polls only show new mail."""
    global _seen_uids, _last_error
    try:
        m = _connect()
        try:
            _, data = m.uid("search", None, "ALL")
            uids = data[0].split() if data and data[0] else []
            _seen_uids = set(uids)
        finally:
            _safe_logout(m)
        _last_error = None
        return {"ok": True, "primed_count": len(_seen_uids or [])}
    except Exception as e:
        _last_error = str(e)
        return {"ok": False, "error": _last_error}


def reset() -> dict:
    global _seen_uids, _last_error
    _seen_uids = None
    _last_error = None
    return {"ok": True}


def state() -> dict:
    return {
        "primed": _seen_uids is not None,
        "seen_count": len(_seen_uids) if _seen_uids is not None else 0,
        "last_error": _last_error,
        "user": _USER,
    }


def poll_new() -> dict:
    """Return new messages since prime/last poll. Auto-primes on first call."""
    global _seen_uids, _last_error
    try:
        m = _connect()
    except Exception as e:
        _last_error = str(e)
        return {"emails": [], "primed": _seen_uids is not None, "error": str(e)}

    try:
        _, data = m.uid("search", None, "ALL")
        uids = data[0].split() if data and data[0] else []

        if _seen_uids is None:
            _seen_uids = set(uids)
            return {"emails": [], "primed": True, "auto_primed": True}

        new_uids = [u for u in uids if u not in _seen_uids]
        out: list[dict[str, Any]] = []
        for uid in new_uids:
            try:
                _, msg_data = m.uid("fetch", uid, "(RFC822)")
                if not msg_data or not msg_data[0]:
                    continue
                msg = email.message_from_bytes(msg_data[0][1])
                body = _extract_body(msg)
                receipt = _try_parse_receipt(body)
                injected_id: str | None = None
                if receipt:
                    raw = _receipt_to_raw_transaction(receipt, uid.decode())
                    if raw:
                        try:
                            data_source.inject_raw_transaction(raw)
                            injected_id = raw["id"]
                        except Exception:
                            injected_id = None
                out.append(
                    {
                        "id": uid.decode(),
                        "from": _decode(msg.get("from")),
                        "subject": _decode(msg.get("subject")),
                        "date": msg.get("date"),
                        "body_excerpt": (body or "")[:280],
                        "receipt": receipt,
                        "injected_transaction_id": injected_id,
                    }
                )
            except Exception:
                continue
        _seen_uids.update(new_uids)
        _last_error = None
        return {"emails": out, "primed": True}
    except Exception as e:
        _last_error = str(e)
        return {"emails": [], "primed": _seen_uids is not None, "error": str(e)}
    finally:
        _safe_logout(m)
