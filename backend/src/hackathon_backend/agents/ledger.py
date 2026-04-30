"""Ledger Intelligence Agent — categorize + explain bank lines.

Pure heuristics over the seed/fixture data. No LLM calls.
"""

from __future__ import annotations

from collections import defaultdict
from statistics import median

from . import data_source


# (keyword tuple, category, confidence, explanation template)
_RULES: list[tuple[tuple[str, ...], str, float, str]] = [
    (
        ("AMAZON WEB SERVICES", "AWS"),
        "software",
        0.95,
        "Monthly AWS bill for production infrastructure.",
    ),
    (
        ("GOOGLE CLOUD", "GCP", "GOOGLE *CLOUD"),
        "software",
        0.95,
        "Monthly Google Cloud bill (GKE, data, storage).",
    ),
    (
        ("WISE PAYROLL", "PAYROLL", "DEEL", "GUSTO"),
        "payroll",
        0.96,
        "Monthly payroll run.",
    ),
    (("HMRC", "VAT", "CORPORATION TAX"), "tax", 0.95, "HMRC tax remittance."),
    (("VERCEL",), "software", 0.94, "Vercel hosting subscription."),
    (("LINEAR",), "software", 0.94, "Linear project management subscription."),
    (("NOTION",), "software", 0.94, "Notion workspace subscription."),
    (("FIGMA",), "software", 0.94, "Figma design tools subscription."),
    (("GITHUB",), "software", 0.94, "GitHub team subscription."),
    (
        ("STRIPE PAYOUT", "STRIPE PAYOUTS"),
        "misc",
        0.93,
        "Stripe payout from card revenue.",
    ),
    (
        ("FASTER PAYMENT",),
        "misc",
        0.85,
        "Inbound faster payment from a customer.",
    ),
]


def _match_rule(description: str) -> tuple[str, float, str] | None:
    desc = description.upper()
    for keys, cat, conf, expl in _RULES:
        if any(k in desc for k in keys):
            return cat, conf, expl
    return None


def _classify(raw: dict, vendors: dict[str, dict]) -> dict:
    rule = _match_rule(raw["description"])
    if rule is not None:
        cat, conf, expl = rule
        if cat == "misc" and raw["amount"] > 0:
            expl = f"Customer inflow from {raw['counterparty']}."
        return {
            "category": cat,
            "confidence": conf,
            "explanation": expl,
            "review_flag": False,
        }

    if raw["counterparty"] in vendors:
        v = vendors[raw["counterparty"]]
        return {
            "category": "vendor",
            "confidence": 0.88,
            "explanation": (
                f"Recurring payment to known vendor {v['name']} "
                f"({v['payment_count']} prior payments)."
            ),
            "review_flag": False,
        }

    if raw["amount"] > 0:
        return {
            "category": "misc",
            "confidence": 0.78,
            "explanation": f"Inbound payment from {raw['counterparty']}.",
            "review_flag": False,
        }

    return {
        "category": "unknown",
        "confidence": 0.55,
        "explanation": (
            "Unable to confidently classify this charge — review needed."
        ),
        "review_flag": True,
    }


def _detect_anomaly(
    raw: dict,
    history_by_counterparty: dict[str, list[float]],
    vendors: dict[str, dict],
) -> str | None:
    cp = raw["counterparty"]
    amount = raw["amount"]

    if amount >= 0:
        return None

    out_amount = abs(amount)
    history = [abs(a) for a in history_by_counterparty.get(cp, []) if a < 0]

    if cp not in vendors and len(history) <= 1 and out_amount >= 1000:
        return (
            f"First or near-first outflow to {cp} for £{out_amount:,.2f} — "
            "no established history."
        )

    if len(history) >= 2:
        med = median(history)
        if med > 0 and out_amount > 2 * med:
            return (
                f"Amount £{out_amount:,.2f} is {out_amount / med:.1f}× the "
                f"typical £{med:,.2f} for {cp}."
            )
    return None


def _build_history(raws: list[dict]) -> dict[str, list[float]]:
    hist: dict[str, list[float]] = defaultdict(list)
    for r in raws:
        hist[r["counterparty"]].append(r["amount"])
    return hist


def _uniq_strs(seq: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for x in seq:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


def _resolve_account(raw: dict) -> tuple[str, str]:
    if raw.get("account_id") and raw.get("account_label"):
        return str(raw["account_id"]), str(raw["account_label"])
    desc_u = raw["description"].upper()
    cp = raw["counterparty"]
    amt = float(raw["amount"])
    if "PAYROLL" in desc_u or cp == "Wise Payroll":
        return "acc_payroll", "Payroll ring-fenced"
    if cp == "Pied Piper" and amt > 0:
        return "acc_product", "Product dedicated"
    return "acc_primary", "Primary operating"


def _infer_tags(raw: dict) -> list[str]:
    desc_u = raw["description"].upper()
    cp = raw["counterparty"]
    amt = float(raw["amount"])
    tags: list[str] = []
    if "PAYROLL" in desc_u or cp == "Wise Payroll":
        tags.append("infra:payroll")
    if amt > 0:
        if cp == "Initech" or "INITECH" in desc_u:
            tags.extend(["product:core-api", "revenue:enterprise"])
        elif cp == "Hooli":
            tags.append("product:mobile-app")
        elif cp == "Globex Corp" or "GLOBEX CORP" in desc_u:
            tags.append("product:core-api")
        elif cp == "Stripe Payouts" or "STRIPE PAYOUT" in desc_u:
            tags.append("product:core-api")
        elif cp == "Pied Piper":
            tags.append("product:experimental")
    if amt < 0:
        if cp in ("Amazon Web Services", "Google Cloud"):
            tags.extend(["product:core-api", "infra:cloud"])
        elif cp in ("Vercel", "GitHub", "Linear", "Notion", "Figma"):
            tags.append("product:core-api")
        elif cp == "HMRC" or "HMRC" in desc_u:
            tags.append("infra:tax")
    return tags


def accounts_catalog() -> list[dict]:
    return [
        {"id": "acc_primary", "label": "Primary operating", "currency": "GBP"},
        {"id": "acc_payroll", "label": "Payroll ring-fenced", "currency": "GBP"},
        {"id": "acc_product", "label": "Product dedicated", "currency": "GBP"},
    ]


def filter_transactions(
    rows: list[dict],
    account_ids: list[str] | None,
    tag: str | None,
) -> list[dict]:
    out = rows
    if account_ids:
        allow = set(account_ids)
        out = [t for t in out if t.get("account_id") in allow]
    if tag:
        out = [t for t in out if tag in (t.get("tags") or [])]
    return out


def transaction_tags_union(rows: list[dict]) -> list[str]:
    found: set[str] = set()
    ordered: list[str] = []
    for t in rows:
        for x in t.get("tags") or []:
            if x not in found:
                found.add(x)
                ordered.append(x)
    return sorted(ordered)


def categorize_all() -> list[dict]:
    raws = list(data_source.get_raw_transactions())
    vendors = data_source.get_vendors()
    breakdowns = data_source.get_cloud_breakdowns()
    history = _build_history(raws)

    results: list[dict] = []
    for raw in raws:
        meta = _classify(raw, vendors)
        anomaly = _detect_anomaly(raw, history, vendors)
        review_flag = meta["review_flag"] or anomaly is not None or meta["confidence"] < 0.80

        aid, alab = _resolve_account(raw)
        tags = _uniq_strs(list(raw.get("tags") or []) + _infer_tags(raw))

        txn = {
            "id": raw["id"],
            "date": raw["date"],
            "description": raw["description"],
            "amount": raw["amount"],
            "currency": raw["currency"],
            "counterparty": raw["counterparty"],
            "account_id": aid,
            "account_label": alab,
            "tags": tags,
            "category": meta["category"],
            "confidence": meta["confidence"],
            "explanation": meta["explanation"],
            "review_flag": review_flag,
            "anomaly_reason": anomaly,
        }

        if raw["id"] in breakdowns:
            txn["enrichment"] = breakdowns[raw["id"]]
        elif raw.get("enrichment"):
            txn["enrichment"] = raw["enrichment"]

        if raw.get("agent_insight"):
            txn["agent_insight"] = raw["agent_insight"]

        results.append(txn)

    results.sort(key=lambda t: t["date"], reverse=True)
    return results


def get_transaction(txn_id: str) -> dict | None:
    for t in categorize_all():
        if t["id"] == txn_id:
            return t
    return None


def specter_domain_for(txn_id: str) -> str | None:
    for raw in data_source.get_raw_transactions():
        if raw["id"] != txn_id:
            continue
        d = raw.get("specter_domain")
        return d.strip() if isinstance(d, str) and d.strip() else None
    return None
