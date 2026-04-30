"""
Run: python generate_data.py
Outputs: data/bank_transactions.json, data/cloud_usage.json, data/emails.json
"""

import json
import os
import random
from datetime import date, timedelta

os.makedirs("data", exist_ok=True)

# ── Shared fixtures ────────────────────────────────────────────────────────────

SUPPLIERS = [
    {"name": "Acme Hosting Ltd",     "email": "billing@acmehosting.com",    "legit": True},
    {"name": "DataFlow Solutions",   "email": "accounts@dataflow.io",       "legit": True},
    {"name": "OfficeSupplies Co",    "email": "invoices@officesupplies.co", "legit": True},
    {"name": "FastNet Telecoms",     "email": "finance@fastnet.net",        "legit": True},
    {"name": "ShadyBill Ltd",        "email": "pay@shadybill.biz",          "legit": False},
]

CLOUD_VENDORS = [
    {"name": "Amazon Web Services",  "tag": "AWS"},
    {"name": "Google Cloud EMEA Ltd","tag": "GCP"},
]

def days_ago(n):
    return (date.today() - timedelta(days=n)).isoformat()


# ── Bank transactions (GoCardless schema) ─────────────────────────────────────

def make_txn(txn_id, booking_date, amount, currency, creditor_name=None, debtor_name=None, remittance=None, currency_exchange=None):
    t = {
        "transactionId": txn_id,
        "transactionAmount": {"currency": currency, "amount": str(amount)},
        "bookingDate": booking_date,
        "valueDate": booking_date,
    }
    if creditor_name:
        t["creditorName"] = creditor_name
    if debtor_name:
        t["debtorName"] = debtor_name
    if remittance:
        t["remittanceInformationUnstructured"] = remittance
    if currency_exchange:
        t["currencyExchange"] = currency_exchange
    return t

booked = [
    # Cloud charges (opaque lump sums — enriched by cloud_usage.json)
    # AWS bills in USD for prior month; hits bank on 1st as GBP after FX conversion
    make_txn("txn_001", days_ago(29), "-4382.17", "GBP",
             creditor_name="Amazon Web Services",
             remittance="AWS charges March 2026",
             currency_exchange={"sourceCurrency": "USD", "targetCurrency": "GBP", "sourceAmount": "5519.00", "exchangeRate": "0.7940", "note": "GBP amount reflects intraday settlement rate"}),
    make_txn("txn_002", days_ago(15), "-1204.50", "GBP", creditor_name="Google Cloud EMEA Ltd", remittance="GCP charges March 2026"),
    # Supplier payments — match email invoices
    make_txn("txn_003", days_ago(25),  "-850.00", "GBP", creditor_name="Acme Hosting Ltd",    remittance="Invoice AH-2041"),
    make_txn("txn_004", days_ago(20), "-2100.00", "GBP", creditor_name="DataFlow Solutions",  remittance="Invoice INV-0089"),
    make_txn("txn_005", days_ago(10),  "-320.00", "GBP", creditor_name="FastNet Telecoms",    remittance="Invoice FN-2026-04"),
    make_txn("txn_006", days_ago(5),   "-145.60", "GBP", creditor_name="OfficeSupplies Co",   remittance="Invoice OS-0412"),
    # Revenue credits
    make_txn("txn_007", days_ago(28), "12000.00", "GBP", debtor_name="Globex Corp",   remittance="Client payment — project retainer"),
    make_txn("txn_008", days_ago(14),  "8500.00", "GBP", debtor_name="Initech",       remittance="Client payment — April milestone"),
    # SaaS subscriptions
    make_txn("txn_009", days_ago(30),   "-42.00", "GBP", creditor_name="GitHub Inc",         remittance="GitHub Teams subscription"),
    make_txn("txn_010", days_ago(30),   "-87.50", "GBP", creditor_name="Slack Technologies", remittance="Slack Pro subscription"),
    make_txn("txn_011", days_ago(30),   "-16.00", "GBP", creditor_name="Notion Labs",        remittance="Notion Plus subscription"),
]

pending = [
    make_txn("txn_p01", days_ago(1), "-320.00", "GBP", creditor_name="FastNet Telecoms", remittance="Reserved PAYMENT FastNet May"),
]

bank = {"transactions": {"booked": booked, "pending": pending}}

with open("data/bank_transactions.json", "w") as f:
    json.dump(bank, f, indent=2)

print(f"  bank_transactions.json — {len(booked)} booked, {len(pending)} pending")


# ── Cloud usage breakdown ──────────────────────────────────────────────────────

cloud_usage = {
    "txn_001": {
        "vendor": "AWS",
        "billing_currency": "USD",
        "total_usd": 5519.00,
        "total_gbp": 4382.17,
        "fx_rate": 0.7940,
        "period": {"start": "2026-03-01", "end": "2026-03-31"},
        "services": [
            {"service": "Amazon EC2",        "amount_usd": 2645.00, "amount_gbp": 2100.00, "detail": "API cluster — 40% idle",        "waste": True,  "idle_cost_gbp": 840.00},
            {"service": "Amazon RDS",        "amount_usd": 2267.00, "amount_gbp": 1800.00, "detail": "Primary Postgres instance",     "waste": False, "idle_cost_gbp": 0},
            {"service": "Amazon S3 Egress",  "amount_usd":  607.00, "amount_gbp":  482.17, "detail": "Outbound data transfer costs",  "waste": False, "idle_cost_gbp": 0},
        ],
        "total_waste_gbp": 840.00,
        "recommendation": "Downscale EC2 API cluster during off-peak hours. Estimated saving: £840/month.",
    },
    "txn_002": {
        "vendor": "GCP",
        "total": 1204.50,
        "period": {"start": days_ago(15), "end": days_ago(1)},
        "services": [
            {"service": "Compute Engine",    "amount": 620.00, "detail": "n2-standard-4 instances",       "waste": False, "idle_cost": 0},
            {"service": "Cloud Storage",     "amount": 310.00, "detail": "Regional bucket — europe-west2","waste": False, "idle_cost": 0},
            {"service": "BigQuery",          "amount": 274.50, "detail": "On-demand query costs",         "waste": True,  "idle_cost": 150.00},
        ],
        "total_waste": 150.00,
        "recommendation": "Switch BigQuery to flat-rate pricing. Estimated saving: £150/month.",
    },
}

with open("data/cloud_usage.json", "w") as f:
    json.dump(cloud_usage, f, indent=2)

print(f"  cloud_usage.json — {len(cloud_usage)} cloud charge breakdowns")


# ── Emails ─────────────────────────────────────────────────────────────────────

emails = [
    # Legit invoices — suppliers match bank transactions
    {
        "id": "email_001",
        "date": days_ago(26),
        "from": "billing@acmehosting.com",
        "from_name": "Acme Hosting Ltd",
        "subject": "Invoice #AH-2041 — April Hosting Services",
        "body": "Please find attached invoice #AH-2041 for £850.00 covering hosting services for April 2026. Payment terms: 30 days.",
        "invoice_amount": 850.00,
        "invoice_ref": "AH-2041",
        "matched_txn": "txn_003",
        "verdict": "legitimate",
        "verdict_reason": "Supplier matches prior bank payments. Invoice amount consistent with monthly hosting plan.",
    },
    {
        "id": "email_002",
        "date": days_ago(21),
        "from": "accounts@dataflow.io",
        "from_name": "DataFlow Solutions",
        "subject": "Invoice INV-0089 for Data Pipeline Services",
        "body": "Hi, please see invoice INV-0089 for £2,100.00 for data pipeline services delivered in March–April 2026.",
        "invoice_amount": 2100.00,
        "invoice_ref": "INV-0089",
        "matched_txn": "txn_004",
        "verdict": "legitimate",
        "verdict_reason": "Ongoing supplier relationship. Amount matches agreed monthly retainer.",
    },
    {
        "id": "email_003",
        "date": days_ago(11),
        "from": "finance@fastnet.net",
        "from_name": "FastNet Telecoms",
        "subject": "April Telecoms Invoice — FastNet",
        "body": "Invoice for broadband and VoIP services for April 2026. Total due: £320.00.",
        "invoice_amount": 320.00,
        "invoice_ref": "FN-2026-04",
        "matched_txn": "txn_005",
        "verdict": "legitimate",
        "verdict_reason": "Recurring monthly charge. Matches bank payment exactly.",
    },
    # Suspicious invoice — no prior contact, no matching bank payment
    {
        "id": "email_004",
        "date": days_ago(2),
        "from": "pay@shadybill.biz",
        "from_name": "ShadyBill Ltd",
        "subject": "URGENT: Outstanding Invoice — £3,200.00",
        "body": "This is a reminder that invoice SB-9921 for £3,200.00 is overdue. Please arrange payment immediately to avoid late fees.",
        "invoice_amount": 3200.00,
        "invoice_ref": "SB-9921",
        "matched_txn": None,
        "verdict": "suspicious",
        "verdict_reason": "No prior email contact with this supplier. No matching bank transaction. Domain registered 3 months ago. Do not pay without verification.",
    },
    # AWS cost report email (matches txn_001)
    {
        "id": "email_005",
        "date": days_ago(28),
        "from": "no-reply@aws.amazon.com",
        "from_name": "Amazon Web Services",
        "subject": "Your AWS Cost & Usage Report — April 2026",
        "body": "Your estimated AWS charges for April 2026 are $4,382.17. Log in to Cost Explorer for a full breakdown.",
        "invoice_amount": 4382.17,
        "invoice_ref": "AWS-APR-2026",
        "matched_txn": "txn_001",
        "verdict": "legitimate",
        "verdict_reason": "Official AWS billing email. Amount matches bank transaction.",
    },
]

with open("data/emails.json", "w") as f:
    json.dump(emails, f, indent=2)

print(f"  emails.json — {len(emails)} emails ({sum(1 for e in emails if e['verdict'] == 'suspicious')} suspicious)")
print("\nDone. Files written to ./data/")
