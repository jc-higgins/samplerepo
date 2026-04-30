"""Cashflow Actions Agent — recommend interventions and project balance.

Owns three responsibilities:

1. Build the action plan list (with escalation rules applied).
2. Project a 90-day cashflow forecast that **reflects approved actions**
   (so the demo "approve a savings action -> forecast shifts" loop works).
3. Produce a runway / burn summary for the dashboard header.
"""

from __future__ import annotations

from datetime import date, timedelta

from . import data_source, ledger, invoice_verifier


_action_overrides: dict[str, dict] = {}


# --- Cashflow model constants ------------------------------------------------
#
# Hand-tuned so that recurring outflow > recurring inflow, giving the demo a
# realistic ~7-month runway against the starting balance below. Conservative
# forward inflow vs the spikier April historicals — story is "peak month behind
# us, planning on signed pipeline only".

_STARTING_BALANCE = 184_320.55

_AWS_MONTHLY = 4_382.17
_PAYROLL_MONTHLY = 42_500.00
_SAAS_MONTHLY = 768.00
_ACME_MONTHLY = 1_200.00
_HMRC_QUARTERLY = 28_400.00

_WEEKLY_INFLOW = 5_000.00
_MONTHLY_LUMP_INFLOW = 12_000.00


def _monthly_outflow_baseline() -> float:
    return (
        _AWS_MONTHLY
        + _PAYROLL_MONTHLY
        + _SAAS_MONTHLY
        + _ACME_MONTHLY
        + _HMRC_QUARTERLY / 3.0
    )


def _monthly_inflow_baseline() -> float:
    return _WEEKLY_INFLOW * (52 / 12) + _MONTHLY_LUMP_INFLOW


# --- Action effects on the forecast ------------------------------------------
#
# When an action is approved, its effect is layered onto the projection. Kept
# in-module so the wire contract stays the same — frontend just sees a shifted
# `projected_balance` series.

_ACTION_EFFECTS: dict[str, dict] = {
    "act_aws_downscale": {
        "kind": "monthly_saving",
        "amount": 900.00,
        "applies_to_day": 21,
    },
    "act_chase_globex": {
        "kind": "one_time_inflow",
        "amount": 12_400.00,
        "in_days": 14,
    },
    "act_block_suspicious": {
        "kind": "one_time_saving",
        "amount": 1_450.00,
        "in_days": 7,
    },
}


def _approved_action_ids() -> set[str]:
    return {
        aid
        for aid, override in _action_overrides.items()
        if override.get("executed")
    }


# --- Action plans ------------------------------------------------------------


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
            "expected_cash_impact": 12_400.00,
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
        (i for i in invoices if i["verification"]["decision"] == "SUSPICIOUS"),
        None,
    )
    if suspicious:
        actions.append(
            {
                "id": "act_block_suspicious",
                "related_ids": [suspicious["id"]],
                "title": (
                    f"Hold payment to suspicious invoice from {suspicious['vendor']}"
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

    upstream_review = {t["id"] for t in transactions if t.get("review_flag")}

    for action in actions:
        depends_on_review = any(
            rid in upstream_review for rid in action["related_ids"]
        )
        high_impact = abs(action["expected_cash_impact"]) >= 5_000
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


def get_action(action_id: str) -> dict | None:
    for action in _seed_actions():
        if action["id"] == action_id:
            return action
    return None


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


# --- Forecast & summary ------------------------------------------------------


def forecast(days: int = 90) -> list[dict]:
    today = date.today()
    bal = _STARTING_BALANCE
    points: list[dict] = []

    approved = _approved_action_ids()

    aws_monthly = _AWS_MONTHLY
    if "act_aws_downscale" in approved:
        aws_monthly -= _ACTION_EFFECTS["act_aws_downscale"]["amount"]

    one_time_offsets: dict[int, float] = {}
    for aid in approved:
        eff = _ACTION_EFFECTS.get(aid)
        if not eff:
            continue
        if eff["kind"] == "one_time_inflow":
            one_time_offsets[eff["in_days"]] = (
                one_time_offsets.get(eff["in_days"], 0.0) + eff["amount"]
            )
        elif eff["kind"] == "one_time_saving":
            one_time_offsets[eff["in_days"]] = (
                one_time_offsets.get(eff["in_days"], 0.0) + eff["amount"]
            )

    for i in range(days):
        d = today + timedelta(days=i)

        if d.weekday() == 4:
            bal += _WEEKLY_INFLOW
        if d.day == 19:
            bal += _MONTHLY_LUMP_INFLOW

        if d.day == 21:
            bal -= aws_monthly
        if d.day == 28:
            bal -= _PAYROLL_MONTHLY
        if d.day == 1:
            bal -= _SAAS_MONTHLY
        if d.day == 15:
            bal -= _ACME_MONTHLY
        if d.day == 7 and d.month in (1, 4, 7, 10):
            bal -= _HMRC_QUARTERLY

        if i in one_time_offsets:
            bal += one_time_offsets[i]

        points.append({"date": d.isoformat(), "projected_balance": round(bal, 2)})

    return points


def summary() -> dict:
    """Headline cashflow numbers for the dashboard header.

    Reflects approved-action effects on burn so the runway figure visibly
    improves when judges hit Approve.
    """
    approved = _approved_action_ids()

    monthly_outflow = _monthly_outflow_baseline()
    monthly_inflow = _monthly_inflow_baseline()

    if "act_aws_downscale" in approved:
        monthly_outflow -= _ACTION_EFFECTS["act_aws_downscale"]["amount"]

    monthly_net = monthly_inflow - monthly_outflow

    if monthly_net >= 0:
        runway_months: float | None = None
    else:
        runway_months = round(_STARTING_BALANCE / abs(monthly_net), 1)

    runway_if_revenue_stops = round(_STARTING_BALANCE / monthly_outflow, 1)

    return {
        "current_balance": round(_STARTING_BALANCE, 2),
        "currency": "GBP",
        "monthly_outflow": round(monthly_outflow, 2),
        "monthly_inflow": round(monthly_inflow, 2),
        "monthly_net": round(monthly_net, 2),
        "runway_months": runway_months,
        "runway_months_if_revenue_stops": runway_if_revenue_stops,
        "applied_actions": sorted(approved),
    }
