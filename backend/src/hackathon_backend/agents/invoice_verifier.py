"""Invoice & Communication Verification Agent."""

from __future__ import annotations

from . import data_source


_URGENCY_KEYWORDS = (
    "urgent",
    "asap",
    "immediately",
    "updated bank",
    "new bank",
    "suspended",
    "remit asap",
)


def _domain(email: str) -> str | None:
    if "@" not in email:
        return None
    return email.split("@", 1)[1].lower()


def _has_urgency(text: str | None) -> bool:
    if not text:
        return False
    low = text.lower()
    return any(k in low for k in _URGENCY_KEYWORDS)


def _verify(invoice: dict) -> dict:
    vendors = data_source.get_vendors()
    gmail = data_source.get_gmail_threads()
    whatsapp = data_source.get_whatsapp_threads()
    threads = {**gmail, **whatsapp}

    vendor_record = vendors.get(invoice["vendor"])
    thread = threads.get(invoice.get("thread_id") or "")

    evidence: list[str] = []
    risk_flags: list[str] = []

    sender = invoice.get("sender", "")
    sender_domain = _domain(sender) if invoice.get("channel") == "email" else None

    if vendor_record:
        evidence.append(
            f"Matched {vendor_record['payment_count']} prior bank payments "
            f"to {vendor_record['name']}."
        )
        if vendor_record.get("known_account"):
            if invoice["account_details"] == vendor_record["known_account"]:
                evidence.append(
                    "Account details match the IBAN we've paid before."
                )
            else:
                risk_flags.append("Account details differ from known IBAN")

        known_domain = vendor_record.get("known_email_domain")
        if known_domain and sender_domain and sender_domain != known_domain:
            risk_flags.append(
                f"Sender domain {sender_domain} differs from known {known_domain}"
            )

    if thread:
        evidence.append(
            f"{invoice['channel'].capitalize()} thread with sender — "
            f"{thread['message_count']} messages "
            f"since {thread['first_message_at']}."
        )
    else:
        risk_flags.append("No prior conversation with sender")

    if _has_urgency(invoice.get("thread_excerpt")):
        risk_flags.append("Urgency / pressure language in message")

    if vendor_record and not thread:
        risk_flags.append("Known vendor but request arrived outside known thread")

    if vendor_record and not risk_flags and thread:
        decision = "LEGIT"
        confidence = 0.93
        rationale = (
            "Known vendor, consistent payment details and an established "
            "communication thread."
        )
    elif vendor_record and risk_flags:
        decision = "SUSPICIOUS"
        confidence = 0.62
        rationale = (
            "Vendor name matches a known counterparty, but signals conflict "
            "(payment details and/or sender). Human review required."
        )
    elif not vendor_record and not thread:
        decision = "UNKNOWN"
        confidence = 0.48
        rationale = (
            "No prior bank or communication history with this counterparty. "
            "Treat as new supplier and verify out-of-band."
        )
    else:
        decision = "SUSPICIOUS"
        confidence = 0.55
        rationale = "Mixed signals — escalate for human review."

    return {
        "decision": decision,
        "confidence": confidence,
        "evidence": evidence,
        "risk_flags": risk_flags,
        "requires_human_review": decision != "LEGIT",
        "rationale": rationale,
    }


def verify_all() -> list[dict]:
    out: list[dict] = []
    for inv in data_source.get_raw_invoices():
        record = dict(inv)
        record["verification"] = _verify(inv)
        out.append(record)
    out.sort(key=lambda i: i["received_at"], reverse=True)
    return out


def verify_one(invoice_id: str) -> dict | None:
    for inv in verify_all():
        if inv["id"] == invoice_id:
            return inv
    return None
