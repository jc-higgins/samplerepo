from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from hackathon_backend.agents import cashflow_actions, invoice_verifier, ledger

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
