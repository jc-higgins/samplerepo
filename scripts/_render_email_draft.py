#!/usr/bin/env python3
"""Pretty-print a Cursor-SDK email draft from stdin (used by scripts/demo.sh)."""

from __future__ import annotations

import json
import sys
import textwrap


def main() -> int:
    raw = sys.stdin.read()
    try:
        d = json.loads(raw)
    except json.JSONDecodeError:
        sys.stderr.write(f"render_email_draft: not JSON: {raw[:200]!r}\n")
        return 1

    M = "\033[1;35m" if sys.stdout.isatty() else ""
    B = "\033[1m" if sys.stdout.isatty() else ""
    D = "\033[2m" if sys.stdout.isatty() else ""
    R = "\033[0m" if sys.stdout.isatty() else ""

    model = d.get("model", "?")
    elapsed_ms = d.get("elapsed_ms") or 0
    elapsed_s = round(elapsed_ms / 1000, 1) if isinstance(elapsed_ms, (int, float)) else "?"
    subject = d.get("subject", "")
    body = d.get("body", "") or ""
    cta = d.get("call_to_action", "")

    print(f"{M}from Cursor SDK ({model}, {elapsed_s}s){R}")
    print(f"{B}subject:{R} {subject}")
    print()
    for para in body.split("\n\n"):
        print(textwrap.fill(para.strip(), width=78))
        print()
    print(f"{D}CTA: {cta}{R}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
