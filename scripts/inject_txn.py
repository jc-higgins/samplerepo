#!/usr/bin/env python3
"""Live-inject a synthetic bank transaction into the running AutoCFO backend.

Use this during a demo to show the ledger agent classifying a brand-new
bank line in real time. The backend exposes ``POST /transactions`` which
runs the same heuristics used for historical data, so the result you see
here is exactly what the dashboard will render on its next fetch.

Usage
-----

    scripts/inject_txn.py                     # list available scenarios
    scripts/inject_txn.py aws_spike           # fire one named scenario
    scripts/inject_txn.py --list              # show last few transactions
    scripts/inject_txn.py --reset             # clear all live-injected txns
    scripts/inject_txn.py --custom \
        --description "FOO" --amount -123.45 \
        --counterparty "Foo Ltd"

Equivalent curl (no Python needed):

    curl -sS -X POST http://127.0.0.1:8000/transactions \
        -H 'content-type: application/json' \
        -d '{"description":"AMAZON WEB SERVICES EMEA",
             "amount":-10247.00,
             "counterparty":"Amazon Web Services"}' | jq

The script only uses the Python stdlib so it runs without activating venv.
"""

from __future__ import annotations

import argparse
import json
import sys
from urllib import error, request

DEFAULT_API = "http://127.0.0.1:8000"


SCENARIOS: dict[str, dict] = {
    "aws_spike": {
        "description": "AMAZON WEB SERVICES EMEA INVOICE",
        "amount": -10_247.00,
        "counterparty": "Amazon Web Services",
        "story": "AWS bill 2.4x the usual run-rate — anomaly fires on a known vendor.",
    },
    "rogue_vendor": {
        "description": "BLACKWOOD ADVISORY LTD INV-1422",
        "amount": -6_800.00,
        "counterparty": "Blackwood Advisory",
        "story": "Brand new vendor, large outflow — anomaly + review_required.",
    },
    "new_saas": {
        "description": "STRIPE INC SUBSCRIPTION",
        "amount": -49.00,
        "counterparty": "Stripe",
        "story": "Small clean SaaS charge — confident category, no flags.",
    },
    "ambiguous_dd": {
        "description": "REF 4470XB DD COLLECT",
        "amount": -184.50,
        "counterparty": "Unknown DD",
        "story": "Opaque direct debit — low confidence, review_required.",
    },
    "customer_inflow": {
        "description": "FASTER PAYMENT CONTINGENT VENTURES",
        "amount": 15_000.00,
        "counterparty": "Contingent Ventures",
        "story": "New customer payment in — categorised as misc inflow.",
    },
    "payroll": {
        "description": "WISE PAYROLL MAY2026",
        "amount": -42_500.00,
        "counterparty": "Wise Payroll",
        "story": "Recurring payroll run — clean payroll category, no flags.",
    },
    "hmrc_vat": {
        "description": "HMRC VAT Q2-2026",
        "amount": -29_180.00,
        "counterparty": "HMRC",
        "story": "Quarterly VAT remittance — clean tax category.",
    },
}


# --- formatting helpers -----------------------------------------------------

ANSI = {
    "reset": "\x1b[0m",
    "bold": "\x1b[1m",
    "dim": "\x1b[2m",
    "red": "\x1b[31m",
    "green": "\x1b[32m",
    "yellow": "\x1b[33m",
    "blue": "\x1b[34m",
    "magenta": "\x1b[35m",
    "cyan": "\x1b[36m",
}


def color(text: str, name: str) -> str:
    if not sys.stdout.isatty():
        return text
    return f"{ANSI[name]}{text}{ANSI['reset']}"


def fmt_money(amount: float, currency: str = "GBP") -> str:
    sign = "-" if amount < 0 else ("+" if amount > 0 else " ")
    symbol = "£" if currency == "GBP" else f"{currency} "
    return f"{sign}{symbol}{abs(amount):,.2f}"


# --- HTTP helpers -----------------------------------------------------------

def _request(method: str, url: str, payload: dict | None = None, timeout: float = 5.0):
    body = json.dumps(payload).encode() if payload is not None else None
    req = request.Request(url, data=body, method=method)
    if body is not None:
        req.add_header("content-type", "application/json")
    try:
        with request.urlopen(req, timeout=timeout) as resp:
            data = resp.read().decode() or "null"
            return resp.status, json.loads(data)
    except error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "null")
    except error.URLError as e:
        print(color(f"  ! could not reach {url}: {e.reason}", "red"))
        print(color("    is the backend running? try `make backend`.", "dim"))
        sys.exit(2)


# --- commands ---------------------------------------------------------------

def render_classification(t: dict) -> None:
    cat = t["category"]
    cat_color = {
        "software": "cyan",
        "payroll": "magenta",
        "tax": "yellow",
        "vendor": "blue",
        "misc": "green",
        "unknown": "red",
    }.get(cat, "reset")

    review = "REVIEW" if t.get("review_flag") else "ok"
    review_color = "yellow" if t.get("review_flag") else "dim"

    bar = color("─" * 64, "dim")
    print(bar)
    print(
        f"  {color(t['date'], 'dim')}  "
        f"{color(t['counterparty'][:28].ljust(28), 'bold')}  "
        f"{fmt_money(t['amount'], t.get('currency', 'GBP')):>13}"
    )
    print(
        f"     category   {color(cat.ljust(10), cat_color)}"
        f"  confidence {t['confidence']:.2f}"
        f"  status {color(review, review_color)}"
    )
    print(f"     why        {t['explanation']}")
    if t.get("anomaly_reason"):
        print(f"     {color('ANOMALY', 'yellow')}    {t['anomaly_reason']}")
    enrichment = t.get("enrichment")
    if enrichment:
        src = (enrichment.get("source") or "").upper()
        print(f"     enrichment {src} line items:")
        for li in enrichment.get("line_items", []):
            note = f"  {color('— ' + li['note'], 'dim')}" if li.get("note") else ""
            print(
                f"       · {li['label'][:24].ljust(24)}  "
                f"{fmt_money(-abs(float(li['amount'])), t.get('currency', 'GBP')):>13}{note}"
            )
        if enrichment.get("waste_flag"):
            print(f"     {color('WASTE', 'yellow')}      {enrichment['waste_flag']}")
    print(bar)
    render_agent_insight(t.get("agent_insight"))


def _wrap(text: str, width: int = 72, indent: str = "     ") -> str:
    import textwrap

    if not text:
        return ""
    return "\n".join(
        textwrap.fill(line, width=width, initial_indent=indent, subsequent_indent=indent)
        for line in text.splitlines()
    )


def render_agent_insight(insight: dict | None) -> None:
    if not insight:
        return
    meta = insight.get("_meta", {})
    model = meta.get("model", "?")
    elapsed = meta.get("elapsed_ms")
    elapsed_str = f"{elapsed/1000:.1f}s" if isinstance(elapsed, (int, float)) else "?"
    head = color(f"  Cursor agent  ({model}, {elapsed_str})", "magenta")
    print(head)
    nat = insight.get("natural_explanation") or ""
    if nat:
        print(_wrap(nat))
    concern = (insight.get("concern_level") or "").lower()
    concern_color = {"low": "green", "medium": "yellow", "high": "red"}.get(concern, "reset")
    if concern:
        print(
            f"     concern    {color(concern.upper(), concern_color)}"
            f"   {insight.get('concern_reason') or ''}"
        )
    if insight.get("agrees_with_rule_engine") is False:
        print(f"     {color('NOTE', 'yellow')}       agent disagrees with the rule engine")
    nxt = insight.get("suggested_followup") or ""
    if nxt:
        print(f"     next step  {nxt}")
    print(color("─" * 64, "dim"))


def cmd_inject(api: str, scenario: dict, *, skip_agent: bool = False) -> None:
    print()
    if "story" in scenario:
        print(f"  {color('story:', 'dim')} {scenario['story']}")
    print(f"  {color('POST', 'green')}  {api}/transactions")
    print(
        f"     description  {scenario['description']}\n"
        f"     amount       {fmt_money(scenario['amount'])}\n"
        f"     counterparty {scenario['counterparty']}"
    )
    if not skip_agent:
        print(
            color(
                "     (asking the live Cursor agent for a second opinion — ~10s)",
                "dim",
            )
        )
    payload = {
        "description": scenario["description"],
        "amount": scenario["amount"],
        "counterparty": scenario["counterparty"],
    }
    if skip_agent:
        payload["skip_agent"] = True
    code, body = _request(
        "POST", f"{api}/transactions", payload, timeout=45 if not skip_agent else 5.0
    )
    if code != 201:
        print(color(f"  ! POST failed ({code}): {body}", "red"))
        sys.exit(1)
    print()
    print(color("  AutoCFO classified the new line:", "bold"))
    render_classification(body)
    print(
        f"  Dashboard will pick this up on next fetch  →  "
        f"{color('http://localhost:5173', 'cyan')}\n"
    )


def cmd_list(api: str, n: int = 6) -> None:
    code, body = _request("GET", f"{api}/transactions")
    if code != 200 or not isinstance(body, list):
        print(color(f"  ! GET failed ({code}): {body}", "red"))
        sys.exit(1)
    body = body[:n]
    print(color(f"\n  Last {len(body)} transactions:", "bold"))
    for t in body:
        flags = []
        if t.get("review_flag"):
            flags.append(color("REVIEW", "yellow"))
        if t.get("anomaly_reason"):
            flags.append(color("ANOMALY", "yellow"))
        flag_str = " ".join(flags)
        print(
            f"   {t['date']}  {t['counterparty'][:24].ljust(24)} "
            f"{fmt_money(t['amount'], t.get('currency', 'GBP')):>13}  "
            f"{t['category']:<10}  conf {t['confidence']:.2f}  {flag_str}"
        )
    print()


def cmd_reset(api: str) -> None:
    code, body = _request("POST", f"{api}/demo/reset")
    if code != 200:
        print(color(f"  ! reset failed ({code}): {body}", "red"))
        sys.exit(1)
    n = body.get("cleared_injected_transactions", 0)
    print(color(f"\n  cleared {n} injected transaction(s).\n", "green"))


def list_scenarios() -> None:
    print(color("\n  Available scenarios:\n", "bold"))
    width = max(len(k) for k in SCENARIOS) + 2
    for name, s in SCENARIOS.items():
        print(
            f"   {color(name.ljust(width), 'cyan')}"
            f"{fmt_money(s['amount']):>13}   "
            f"{color(s.get('story', ''), 'dim')}"
        )
    print(
        f"\n  usage: {color('scripts/inject_txn.py <scenario>', 'bold')}"
        f"  (or --custom, --list, --reset)\n"
    )


# --- entrypoint -------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(
        description="Inject demo bank transactions into the AutoCFO backend.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    ap.add_argument(
        "scenario",
        nargs="?",
        choices=sorted(SCENARIOS),
        help="named scenario to inject (omit to list)",
    )
    ap.add_argument("--api", default=DEFAULT_API, help=f"backend base URL (default {DEFAULT_API})")
    ap.add_argument("--list", action="store_true", help="show last 6 transactions and exit")
    ap.add_argument("--reset", action="store_true", help="clear all live-injected transactions")
    ap.add_argument("--custom", action="store_true", help="use --description/--amount/--counterparty")
    ap.add_argument("--description")
    ap.add_argument("--amount", type=float)
    ap.add_argument("--counterparty")
    ap.add_argument(
        "--skip-agent",
        action="store_true",
        help="skip the live Cursor agent insight (rule-engine only, ~instant)",
    )
    args = ap.parse_args()

    if args.reset:
        cmd_reset(args.api)
        return 0

    if args.list:
        cmd_list(args.api)
        return 0

    if args.custom:
        if not (args.description and args.amount is not None and args.counterparty):
            ap.error("--custom requires --description, --amount, and --counterparty")
        cmd_inject(
            args.api,
            {
                "description": args.description,
                "amount": args.amount,
                "counterparty": args.counterparty,
                "story": "custom-injected line",
            },
            skip_agent=args.skip_agent,
        )
        return 0

    if not args.scenario:
        list_scenarios()
        return 0

    cmd_inject(args.api, SCENARIOS[args.scenario], skip_agent=args.skip_agent)
    return 0


if __name__ == "__main__":
    sys.exit(main())
