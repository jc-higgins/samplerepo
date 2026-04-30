"""Cashflow Actions Agent — recommend interventions and project balance."""

from __future__ import annotations

from datetime import date, timedelta

from . import data_source, ledger, invoice_verifier


# Module-level mutable state for the approve endpoint. Demo-only, no persistence.
_action_overrides: dict[str, dict] = {}


def _seed_actions() -> list[dict]:
    transactions = ledger.categorize_all()
    invoices = invoice_verifier.verify_all()

    by_id = {t["id"]: t for t in transactions}
    aws_txn = by_id.get("txn_aws_apr")

    actions: list[dict] = []

    if aws_txn and aws_txn.get("enrichment", {}).get("waste_flag"):
        actions.append(
            {
                "id": "act_aws_downscale",
                "related_ids": ["txn_aws_apr"],
                "title": "Downscale idle EC2 capacity on api-cluster",
                "recommended_action": (
                    "Reduce api-cluster from 8→5 nodes; switch 3 to spot pricing"
                ),
                "expected_cash_impact": 900.00,
                "confidence": 0.88,
                "rationale": (
                    "40% idle utilization observed over the last 14 days; "
                    "projected savings ~£900/mo with no SLA risk."
                ),
            }
        )

    actions.append(
        {
            "id": "act_chase_globex",
            "related_ids": ["txn_inflow_globex"],
            "title": "Chase overdue invoice from Globex Corp",
            "recommended_action": (
                "Send 2nd reminder email — invoice 14 days past due (£12,400)"
            ),
            "expected_cash_impact": 12400.00,
            "confidence": 0.92,
            "rationale": (
                "Standard 14-day chase cadence; counterparty has clean payment history."
            ),
        }
    )

    actions.append(
        {
            "id": "act_schedule_figma",
            "related_ids": ["txn_figma"],
            "title": "Defer Figma annual renewal by 14 days",
            "recommended_action": (
                "Move renewal from May 1 → May 15 to align with customer inflow cycle"
            ),
            "expected_cash_impact": 0.00,
            "confidence": 0.91,
            "rationale": (
                "No discount lost; smooths week-1 cash trough by ~£180."
            ),
        }
    )

    suspicious = next(
        (
            i
            for i in invoices
            if i["verification"]["decision"] == "SUSPICIOUS"
        ),
        None,
    )
    if suspicious:
        actions.append(
            {
                "id": "act_block_suspicious",
                "related_ids": [suspicious["id"]],
                "title": (
                    f"Hold payment to suspicious invoice from "
                    f"{suspicious['vendor']}"
                ),
                "recommended_action": (
                    "Do not pay until vendor identity is confirmed via a verified channel"
                ),
                "expected_cash_impact": suspicious["amount"],
                "confidence": 0.78,
                "rationale": (
                    "Conflicting account details and sender domain mismatch on "
                    f"invoice from {suspicious['vendor']}."
                ),
            }
        )

    upstream_review = {
        t["id"] for t in transactions if t.get("review_flag")
    }

    for action in actions:
        depends_on_review = any(
            rid in upstream_review for rid in action["related_ids"]
        )
        high_impact = abs(action["expected_cash_impact"]) >= 5000
        low_confidence = action["confidence"] < 0.90

        if low_confidence or depends_on_review or high_impact:
            action["execution_mode"] = "HUMAN_APPROVAL"
            action["next_step"] = "REQUEST_HUMAN"
        else:
            action["execution_mode"] = "AUTO"
            action["next_step"] = "AUTO_EXECUTE"

        action["executed"] = False

    for action in actions:
        override = _action_overrides.get(action["id"])
        if override:
            action.update(override)

    return actions


def list_actions() -> list[dict]:
    return _seed_actions()


def approve_action(action_id: str) -> dict | None:
    plans = _seed_actions()
    target = next((a for a in plans if a["id"] == action_id), None)
    if target is None:
        return None
    _action_overrides[action_id] = {
        "executed": True,
        "execution_mode": "AUTO",
        "next_step": "AUTO_EXECUTE",
    }
    target.update(_action_overrides[action_id])
    return target


# --- Cashflow forecast --------------------------------------------------------


_STARTING_BALANCE = 184_320.55


def forecast(days: int = 90) -> list[dict]:
    today = date.today()
    bal = _STARTING_BALANCE
    points: list[dict] = []

    aws_monthly = 4382.17
    payroll_monthly = 42500.00
    saas_monthly = 768.00
    acme_monthly = 1200.00
    weekly_inflow = 8500.00
    monthly_lump_inflow = 24000.00

    for i in range(days):
        d = today + timedelta(days=i)

        if d.weekday() == 4:
            bal += weekly_inflow
        if d.day == 19:
            bal += monthly_lump_inflow

        if d.day == 21:
            bal -= aws_monthly
        if d.day == 28:
            bal -= payroll_monthly
        if d.day == 1:
            bal -= saas_monthly
        if d.day == 15:
            bal -= acme_monthly
        if d.day == 7 and d.month in (1, 4, 7, 10):
            bal -= 28400.00

        points.append({"date": d.isoformat(), "projected_balance": round(bal, 2)})

    return points
