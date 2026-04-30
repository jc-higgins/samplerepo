"""Outbound communications — drafting and (mock) sending emails for actions.

Drafts are produced live by the Cursor SDK via ``cursor_llm.draft_email``.
"Sending" is mocked for the demo: we mark a ``sent_at`` timestamp and log
to stdout. Storage is in-memory.
"""

from __future__ import annotations

from datetime import datetime, timezone

from . import cashflow_actions, cursor_llm, ledger


_drafts: dict[str, dict] = {}


def _action_or_none(action_id: str) -> dict | None:
    plan = cashflow_actions.get_action(action_id)
    if plan is None:
        return None
    if not plan.get("email_target") or not plan.get("email_purpose"):
        return None
    return plan


def _related_context_lines(plan: dict) -> list[str]:
    lines = [
        f"Action title: {plan.get('title')}",
        f"Recommended action: {plan.get('recommended_action')}",
        f"Expected cash impact: £{plan.get('expected_cash_impact'):,.2f}",
        f"Confidence: {plan.get('confidence')}",
        f"Rationale: {plan.get('rationale')}",
    ]
    related_ids = plan.get("related_ids") or []
    txn_by_id = {t["id"]: t for t in ledger.categorize_all()}
    for rid in related_ids:
        t = txn_by_id.get(rid)
        if not t:
            continue
        lines.append(
            f"Related transaction {rid}: {t['date']} "
            f"{t['counterparty']} {t['amount']} {t['currency']} "
            f"[{t['category']}]"
        )
    return lines


def draft_for_action(action_id: str, *, force: bool = False) -> dict | None:
    plan = _action_or_none(action_id)
    if plan is None:
        return None

    cached = _drafts.get(action_id)
    if cached and not force and cached.get("body"):
        return cached

    target = plan["email_target"]
    purpose = plan["email_purpose"]

    draft = cursor_llm.draft_email(
        purpose=purpose,
        recipient_name=target["name"],
        recipient_email=target["email"],
        sender_name="Sam Riley",
        sender_company="Acme Robotics Ltd",
        context_lines=_related_context_lines(plan),
        tone=(
            "internal, calm, factual"
            if target.get("role") == "internal alert"
            else "professional, concise, finance-team voice"
        ),
    )
    if draft is None:
        return None

    record = {
        "action_id": action_id,
        "recipient_name": target["name"],
        "recipient_email": target["email"],
        "subject": draft.get("subject", ""),
        "body": draft.get("body", ""),
        "call_to_action": draft.get("call_to_action", ""),
        "model": draft.get("_meta", {}).get("model"),
        "elapsed_ms": draft.get("_meta", {}).get("elapsed_ms"),
        "drafted_at": datetime.now(timezone.utc).isoformat(),
        "sent_at": None,
        "mock_send": False,
    }
    _drafts[action_id] = record
    return record


def get_action_email(action_id: str) -> dict | None:
    return _drafts.get(action_id)


def send_action_email(
    action_id: str, *, overrides: dict | None = None
) -> dict | None:
    record = _drafts.get(action_id)
    if record is None:
        return None
    if overrides:
        if isinstance(overrides.get("subject"), str):
            record["subject"] = overrides["subject"]
        if isinstance(overrides.get("body"), str):
            record["body"] = overrides["body"]
    record["sent_at"] = datetime.now(timezone.utc).isoformat()
    record["mock_send"] = True
    print(
        f"\n[email mock-send]  to {record['recipient_email']}\n"
        f"  subject: {record['subject']}\n"
        f"  body[:200]: {record['body'][:200].replace(chr(10), ' / ')}…\n"
    )
    return record


def list_communications() -> list[dict]:
    return list(_drafts.values())


def reset_communications() -> int:
    n = len(_drafts)
    _drafts.clear()
    return n
