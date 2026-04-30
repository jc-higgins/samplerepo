import os
from datetime import datetime, timezone

from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from hackathon_backend.agents import (
    cashflow_actions,
    cloud_summary,
    communications,
    cursor_llm,
    data_source,
    email_inbox,
    invoice_verifier,
    ledger,
)

app = FastAPI(title="AutoCFO API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"service": "autocfo-backend", "status": "ok"}


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/transactions")
def transactions():
    return ledger.categorize_all()


@app.post("/transactions", status_code=201)
def create_transaction(payload: dict = Body(...)):
    """Inject a raw bank line and return the live-classified record.

    Demo affordance: simulates a webhook from the bank. The new transaction
    flows through the same heuristics as historical ones (categorisation,
    confidence, anomaly, cloud enrichment if known), and shows up in
    subsequent ``GET /transactions`` calls.
    """
    required = {"description", "amount", "counterparty"}
    missing = [k for k in required if k not in payload]
    if missing:
        raise HTTPException(
            status_code=400, detail=f"missing fields: {sorted(missing)}"
        )

    try:
        amount = float(payload["amount"])
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="amount must be a number")

    now = datetime.now(timezone.utc)
    txn_id = payload.get("id") or f"txn_live_{now.strftime('%Y%m%d_%H%M%S_%f')}"

    raw = {
        "id": txn_id,
        "date": payload.get("date") or now.date().isoformat(),
        "description": str(payload["description"]),
        "amount": amount,
        "currency": payload.get("currency", "GBP"),
        "counterparty": str(payload["counterparty"]),
    }

    data_source.inject_raw_transaction(raw)
    classified = ledger.get_transaction(txn_id)
    if classified is None:
        raise HTTPException(status_code=500, detail="classification pipeline failed")

    if payload.get("skip_agent") is not True:
        history = [
            t
            for t in ledger.categorize_all()
            if t["counterparty"] == raw["counterparty"] and t["id"] != txn_id
        ][:5]
        insight = cursor_llm.enrich_transaction(raw, classified, history)
        if insight is not None:
            raw["agent_insight"] = insight
            classified["agent_insight"] = insight

    return classified


@app.post("/demo/reset")
def demo_reset():
    """Clear all live-injected transactions. Demo-only convenience."""
    cleared = data_source.reset_injected_transactions()
    return {"cleared_injected_transactions": cleared}


@app.get("/transactions/{txn_id}")
def transaction(txn_id: str):
    txn = ledger.get_transaction(txn_id)
    if txn is None:
        raise HTTPException(status_code=404, detail="transaction not found")
    return txn


@app.get("/invoices")
def invoices():
    return invoice_verifier.verify_all()


@app.get("/invoices/{invoice_id}")
def invoice(invoice_id: str):
    inv = invoice_verifier.verify_one(invoice_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="invoice not found")
    return inv


@app.get("/actions")
def actions():
    return cashflow_actions.list_actions()


@app.get("/actions/{action_id}")
def action(action_id: str):
    plan = cashflow_actions.get_action(action_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="action not found")
    return plan


@app.post("/actions/{action_id}/approve")
def approve(action_id: str):
    plan = cashflow_actions.approve_action(action_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="action not found")
    return plan


@app.get("/cashflow/forecast")
def cashflow_forecast(days: int = 90):
    days = max(1, min(days, 180))
    return cashflow_actions.forecast(days=days)


@app.get("/cashflow/summary")
def cashflow_summary():
    return cashflow_actions.summary()


@app.get("/cloud/cost-summary")
def cloud_cost_summary():
    return cloud_summary.cost_summary()


@app.get("/llm/status")
def llm_status():
    return {
        "available": cursor_llm.is_available(),
        "default_model": cursor_llm._DEFAULT_MODEL,
        "node": bool(cursor_llm._NODE_BIN),
        "key_present": bool(os.environ.get("CURSOR_API_KEY")),
    }


@app.post("/actions/{action_id}/draft-email")
def draft_action_email(action_id: str, payload: dict = Body(default={})):
    plan = cashflow_actions.get_action(action_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="action not found")
    if not plan.get("email_target"):
        raise HTTPException(
            status_code=400,
            detail="this action has no outbound email target",
        )
    record = communications.draft_for_action(
        action_id, force=bool(payload.get("force"))
    )
    if record is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Cursor SDK unavailable — check CURSOR_API_KEY in .env and "
                "the services/ Node sidecar"
            ),
        )
    return record


@app.get("/actions/{action_id}/email")
def get_action_email(action_id: str):
    record = communications.get_action_email(action_id)
    if record is None:
        raise HTTPException(status_code=404, detail="no draft for this action")
    return record


@app.post("/actions/{action_id}/email/send")
def send_action_email(action_id: str, payload: dict = Body(default={})):
    record = communications.send_action_email(
        action_id, overrides=payload if isinstance(payload, dict) else None
    )
    if record is None:
        raise HTTPException(
            status_code=404,
            detail="no draft to send — POST /actions/{id}/draft-email first",
        )
    return record


@app.get("/communications")
def communications_list():
    return communications.list_communications()


@app.post("/emails/process/start")
def emails_process_start():
    """Prime the inbox watcher so subsequent polls only return new mail."""
    return email_inbox.prime()


@app.post("/emails/process/reset")
def emails_process_reset():
    """Forget the primed state so the next poll re-primes from scratch."""
    return email_inbox.reset()


@app.get("/emails/state")
def emails_state():
    return email_inbox.state()


@app.get("/emails/poll")
def emails_poll():
    """Return any messages that arrived since the previous poll.

    A receipt-shaped JSON body (``{"merchant": ..., "total": ...}``) is
    parsed into ``receipt`` and best-effort injected as a live raw bank
    transaction, surfaced as ``injected_transaction_id``.
    """
    return email_inbox.poll_new()
