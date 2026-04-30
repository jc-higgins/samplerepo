"""Tiny JSON loaders for synthetic fixtures consumed by Agent B's endpoints.

Names are stable: do not rename without updating ``specs/agent-b-backend.md``.
Plain ``json`` + ``pathlib`` only — no Pydantic, no validation here.
"""

import json
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"

# Raw GoCardless-format data — uncomment if Agent B adds an enrichment pipeline
# RAW_DIR = Path(__file__).parent / "raw_data"
# def _load_raw(name: str): return json.loads((RAW_DIR / name).read_text())
# def load_raw_transactions(): return _load_raw("bank_transactions.json")
# def load_raw_cloud_usage(): return _load_raw("cloud_usage.json")
# def load_raw_emails(): return _load_raw("emails.json")


def _load(name: str):
    return json.loads((DATA_DIR / name).read_text())


def load_accounts():
    return _load("accounts.json")


def load_transactions():
    return _load("transactions.json")


def load_aws_breakdowns():
    return _load("aws_breakdowns.json")


def load_gcp_breakdowns():
    return _load("gcp_breakdowns.json")


def load_invoices():
    return _load("invoices.json")


def load_gmail_threads():
    return _load("gmail_threads.json")


def load_whatsapp_threads():
    return _load("whatsapp_threads.json")


def load_vendors():
    return _load("vendors.json")
