"""Inline seed data for the AutoCFO MVP.

This module is the local fallback used when ``hackathon_backend.fixtures``
(owned by Agent A) hasn't shipped yet. The agents import from
``data_source`` which prefers the fixtures package and falls back here.
"""

from __future__ import annotations


# Raw bank transactions. Agent modules add category, confidence, explanation,
# enrichment, anomaly_reason on top of these.
RAW_TRANSACTIONS: list[dict] = [
    # --- Hero AWS bill (drives the demo) ---
    {
        "id": "txn_aws_apr",
        "date": "2026-04-21",
        "description": "AMAZON WEB SERVICES EMEA",
        "amount": -4382.17,
        "currency": "GBP",
        "counterparty": "Amazon Web Services",
    },
    {
        "id": "txn_aws_mar",
        "date": "2026-03-21",
        "description": "AMAZON WEB SERVICES EMEA",
        "amount": -4120.40,
        "currency": "GBP",
        "counterparty": "Amazon Web Services",
    },
    # --- GCP (second cloud cost center) ---
    {
        "id": "txn_gcp_apr",
        "date": "2026-04-18",
        "description": "GOOGLE CLOUD EMEA LTD",
        "amount": -1680.33,
        "currency": "GBP",
        "counterparty": "Google Cloud",
    },
    {
        "id": "txn_gcp_mar",
        "date": "2026-03-16",
        "description": "GOOGLE CLOUD EMEA LTD",
        "amount": -1522.90,
        "currency": "GBP",
        "counterparty": "Google Cloud",
    },
    # --- Payroll (recurring) ---
    {
        "id": "txn_payroll_apr",
        "date": "2026-04-28",
        "description": "WISE PAYROLL APR2026",
        "amount": -42500.00,
        "currency": "GBP",
        "counterparty": "Wise Payroll",
    },
    {
        "id": "txn_payroll_mar",
        "date": "2026-03-28",
        "description": "WISE PAYROLL MAR2026",
        "amount": -41200.00,
        "currency": "GBP",
        "counterparty": "Wise Payroll",
    },
    # --- SaaS ---
    {
        "id": "txn_vercel",
        "date": "2026-04-01",
        "description": "VERCEL INC SUBSCRIPTION",
        "amount": -240.00,
        "currency": "GBP",
        "counterparty": "Vercel",
    },
    {
        "id": "txn_linear",
        "date": "2026-04-03",
        "description": "LINEAR APP TEAM PLAN",
        "amount": -82.00,
        "currency": "GBP",
        "counterparty": "Linear",
    },
    {
        "id": "txn_notion",
        "date": "2026-04-05",
        "description": "NOTION LABS WORKSPACE",
        "amount": -56.00,
        "currency": "GBP",
        "counterparty": "Notion",
    },
    {
        "id": "txn_figma",
        "date": "2026-04-07",
        "description": "FIGMA INC ANNUAL",
        "amount": -180.00,
        "currency": "GBP",
        "counterparty": "Figma",
    },
    {
        "id": "txn_github",
        "date": "2026-04-10",
        "description": "GITHUB INC TEAM",
        "amount": -210.00,
        "currency": "GBP",
        "counterparty": "GitHub",
    },
    # --- Known vendor: Acme Hosting (matches inv_001) ---
    {
        "id": "txn_acme_jan",
        "date": "2026-01-15",
        "description": "ACME HOSTING LTD INV-1019",
        "amount": -1200.00,
        "currency": "GBP",
        "counterparty": "Acme Hosting Ltd",
    },
    {
        "id": "txn_acme_feb",
        "date": "2026-02-15",
        "description": "ACME HOSTING LTD INV-1021",
        "amount": -1200.00,
        "currency": "GBP",
        "counterparty": "Acme Hosting Ltd",
    },
    {
        "id": "txn_acme_mar",
        "date": "2026-03-15",
        "description": "ACME HOSTING LTD INV-1022",
        "amount": -1200.00,
        "currency": "GBP",
        "counterparty": "Acme Hosting Ltd",
    },
    # --- HMRC ---
    {
        "id": "txn_hmrc_q1",
        "date": "2026-04-07",
        "description": "HMRC VAT Q1-2026",
        "amount": -28400.00,
        "currency": "GBP",
        "counterparty": "HMRC",
    },
    # --- Anomaly: new merchant, high amount ---
    {
        "id": "txn_anomaly_meridian",
        "date": "2026-04-15",
        "description": "MERIDIAN CONSULTING LLP REF 88134",
        "amount": -8900.00,
        "currency": "GBP",
        "counterparty": "Meridian Consulting",
    },
    # --- Low-confidence / review-required ---
    {
        "id": "txn_unknown_dd",
        "date": "2026-04-10",
        "description": "REF 8819XQ DD COLLECT",
        "amount": -245.00,
        "currency": "GBP",
        "counterparty": "Unknown Direct Debit",
    },
    {
        "id": "txn_unknown_card",
        "date": "2026-04-18",
        "description": "POS 22:14 *PMNT 41Z",
        "amount": -67.50,
        "currency": "GBP",
        "counterparty": "Unknown",
    },
    # --- Inflows ---
    {
        "id": "txn_inflow_globex",
        "date": "2026-04-12",
        "description": "FASTER PAYMENT GLOBEX CORP",
        "amount": 18000.00,
        "currency": "GBP",
        "counterparty": "Globex Corp",
    },
    {
        "id": "txn_inflow_initech",
        "date": "2026-04-19",
        "description": "FASTER PAYMENT INITECH LTD",
        "amount": 24500.00,
        "currency": "GBP",
        "counterparty": "Initech",
    },
    {
        "id": "txn_inflow_hooli",
        "date": "2026-04-25",
        "description": "FASTER PAYMENT HOOLI INC",
        "amount": 12000.00,
        "currency": "GBP",
        "counterparty": "Hooli",
    },
    {
        "id": "txn_inflow_stripe",
        "date": "2026-04-22",
        "description": "STRIPE PAYOUT 4QH82",
        "amount": 6420.85,
        "currency": "GBP",
        "counterparty": "Stripe Payouts",
    },
]


# Cloud-cost breakdowns keyed by transaction id.
AWS_BREAKDOWNS: dict[str, dict] = {
    "txn_aws_apr": {
        "source": "aws",
        "line_items": [
            {
                "label": "EC2 (api-cluster)",
                "amount": 2100.00,
                "note": "40% idle over last 14 days",
            },
            {"label": "RDS (prod-db)", "amount": 1800.00},
            {"label": "S3 egress", "amount": 482.17},
        ],
        "waste_flag": "~£900/mo idle compute on api-cluster",
    },
    "txn_aws_mar": {
        "source": "aws",
        "line_items": [
            {"label": "EC2 (api-cluster)", "amount": 1980.00},
            {"label": "RDS (prod-db)", "amount": 1740.00},
            {"label": "S3 egress", "amount": 400.40},
        ],
        "waste_flag": None,
    },
}

# GCP cost-center style breakdowns (same enrichment shape as AWS).
GCP_BREAKDOWNS: dict[str, dict] = {
    "txn_gcp_apr": {
        "source": "gcp",
        "line_items": [
            {
                "label": "GKE (prod)",
                "amount": 720.00,
                "note": "regional 3-node pool",
            },
            {"label": "BigQuery (analytics)", "amount": 410.50},
            {"label": "Cloud Storage + egress", "amount": 549.83},
        ],
        "waste_flag": "BigQuery on-demand spikes on ad-hoc scans — consider slot reservations.",
    },
    "txn_gcp_mar": {
        "source": "gcp",
        "line_items": [
            {"label": "GKE (prod)", "amount": 680.00},
            {"label": "BigQuery (analytics)", "amount": 355.20},
            {"label": "Cloud Storage + egress", "amount": 487.70},
        ],
        "waste_flag": None,
    },
}


# Known vendors. Drives invoice verification.
VENDORS: dict[str, dict] = {
    "Acme Hosting Ltd": {
        "name": "Acme Hosting Ltd",
        "first_seen": "2025-08-12",
        "payment_count": 4,
        "known_account": "GB29 NWBK 6016 1331 9268 19",
        "known_email_domain": "acme-hosting.co.uk",
    },
    "Riley Designs": {
        "name": "Riley Designs",
        "first_seen": "2025-11-03",
        "payment_count": 3,
        "known_account": "GB12 HSBC 4001 2710 9911 03",
        "known_email_domain": None,
    },
}


GMAIL_THREADS: dict[str, dict] = {
    "thr_acme": {
        "id": "thr_acme",
        "participants": ["billing@acme-hosting.co.uk", "founder@startup.com"],
        "message_count": 12,
        "first_message_at": "2025-08-10",
        "last_message_at": "2026-04-22",
        "snippets": [
            "Welcome aboard! Setting up your hosting account today.",
            "Q1 invoice attached.",
            "Following our call last week, please find April invoice attached…",
        ],
    },
    "thr_acme_suspicious": {
        "id": "thr_acme_suspicious",
        "participants": [
            "billing.urgent@acme-hostings.co.uk",
            "founder@startup.com",
        ],
        "message_count": 1,
        "first_message_at": "2026-04-23",
        "last_message_at": "2026-04-23",
        "snippets": [
            "URGENT: Updated bank details — please remit ASAP, prior account suspended.",
        ],
    },
}


WHATSAPP_THREADS: dict[str, dict] = {
    "thr_riley_wa": {
        "id": "thr_riley_wa",
        "participants": ["+447700900123", "+447700900999"],
        "message_count": 24,
        "first_message_at": "2025-11-01",
        "last_message_at": "2026-04-22",
        "snippets": [
            "Hey! Sending the brand work invoice through, ping me when paid.",
            "Bank details same as last time.",
        ],
    },
}


# Raw incoming invoice requests. Verifier produces the .verification block.
RAW_INVOICES: list[dict] = [
    # LEGIT — known vendor, matching account, established thread
    {
        "id": "inv_001",
        "received_at": "2026-04-22T09:14:00Z",
        "channel": "email",
        "sender": "billing@acme-hosting.co.uk",
        "vendor": "Acme Hosting Ltd",
        "amount": 1200.00,
        "currency": "GBP",
        "due_date": "2026-05-06",
        "account_details": "GB29 NWBK 6016 1331 9268 19",
        "thread_excerpt": "Following our call last week, please find April invoice attached…",
        "thread_id": "thr_acme",
    },
    # SUSPICIOUS — same vendor name, new IBAN, urgency, sender domain typo
    {
        "id": "inv_002",
        "received_at": "2026-04-23T14:02:00Z",
        "channel": "email",
        "sender": "billing.urgent@acme-hostings.co.uk",
        "vendor": "Acme Hosting Ltd",
        "amount": 1450.00,
        "currency": "GBP",
        "due_date": "2026-04-24",
        "account_details": "GB17 BARC 2032 5364 8311 22",
        "thread_excerpt": (
            "URGENT: Updated bank details — please remit ASAP, prior account suspended."
        ),
        "thread_id": "thr_acme_suspicious",
    },
    # UNKNOWN — brand new sender, no history
    {
        "id": "inv_003",
        "received_at": "2026-04-24T11:22:00Z",
        "channel": "email",
        "sender": "ar@northbridge-solutions.io",
        "vendor": "Northbridge Solutions",
        "amount": 3200.00,
        "currency": "GBP",
        "due_date": "2026-05-08",
        "account_details": "GB55 RBOS 1612 7733 8290 41",
        "thread_excerpt": "Please find attached invoice for advisory services rendered.",
        "thread_id": None,
    },
    # WhatsApp legit
    {
        "id": "inv_004",
        "received_at": "2026-04-22T17:30:00Z",
        "channel": "whatsapp",
        "sender": "+447700900123",
        "vendor": "Riley Designs",
        "amount": 480.00,
        "currency": "GBP",
        "due_date": "2026-05-05",
        "account_details": "GB12 HSBC 4001 2710 9911 03",
        "thread_excerpt": "Hey! Sending the brand work invoice through, ping me when paid.",
        "thread_id": "thr_riley_wa",
    },
]
