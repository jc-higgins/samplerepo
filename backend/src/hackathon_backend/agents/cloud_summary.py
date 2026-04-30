"""Mock multi-cloud cost rollup for the dashboard (derived from ledger + enrichment)."""

from __future__ import annotations

from . import ledger


def cost_summary(
    account_ids: list[str] | None = None,
    tag: str | None = None,
) -> dict:
    txns = ledger.categorize_all()
    txns = ledger.filter_transactions(txns, account_ids, tag)
    currency = "GBP"
    providers: dict = {}

    for prov in ("aws", "gcp"):
        prov_txns = sorted(
            [t for t in txns if (t.get("enrichment") or {}).get("source") == prov],
            key=lambda t: t["date"],
        )
        if not prov_txns:
            providers[prov] = None
            continue

        history = []
        for t in prov_txns:
            history.append(
                {
                    "period": t["date"][:7],
                    "date": t["date"],
                    "amount": round(abs(float(t["amount"])), 2),
                    "transaction_id": t["id"],
                }
            )

        latest = prov_txns[-1]
        prev = prov_txns[-2] if len(prov_txns) >= 2 else None
        cur_amt = abs(float(latest["amount"]))
        prev_amt = abs(float(prev["amount"])) if prev else None
        mom_pct = None
        if prev_amt is not None and prev_amt > 0:
            mom_pct = round((cur_amt - prev_amt) / prev_amt * 100, 1)

        enr = latest.get("enrichment") or {}
        services = [
            {"label": li["label"], "amount": round(float(li["amount"]), 2)}
            for li in enr.get("line_items") or []
        ]

        providers[prov] = {
            "latest_transaction_id": latest["id"],
            "latest_period_label": latest["date"],
            "total_last_period": round(cur_amt, 2),
            "mom_delta_pct": mom_pct,
            "history": history,
            "services": services,
            "waste_flag": enr.get("waste_flag"),
        }

    return {"currency": currency, "providers": providers}
