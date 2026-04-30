# 04 — Invoices panel

**Spec:** [`specs/agent-c-frontend.md`](../specs/agent-c-frontend.md) — `Invoices`.

## Checklist

- [ ] `GET /invoices` on mount.
- [ ] Card per invoice: vendor, amount, **channel** pill (`email` / `whatsapp`), due date.
- [ ] Badge from `verification.decision`: **LEGIT** (green), **SUSPICIOUS** (amber), **UNKNOWN** (grey).
- [ ] Expand/collapse: `verification.evidence` (bullets), `risk_flags` (red pills), `rationale` (paragraph), `confidence` as small bar.

## Contract

Shapes in [`specs/01-mvp-split.md`](../specs/01-mvp-split.md) — do not invent fields; ask Agent B if something is missing.
