# Demo

Use this folder for anything judges see that is not raw product code:

- Talking points or a short script
- Screenshots or exported slides
- Links to deployed previews

Keep the live path obvious: which URL, which test user, which sample transaction.

## Rubric: demo clarity (~90 seconds)

Judges score whether they can see **what the agent does and why it matters** in about **90 seconds** (see [event rubric JSON](https://cusor-hack-london-2026-1.vercel.app/api/event-format) → `rubric.criteria` → Demo Clarity).

Suggested beat sheet (same story as `specs/README.md`):

| Sec | Beat |
| --- | --- |
| 0–10 | Name **Financial Intelligence** track + one-sentence problem (founder CFO workload). |
| 10–35 | Open **Statements** → AWS line → drill-down: enrichment + waste flag (**concrete workflow** + **track fit**). |
| 35–55 | **Invoices**: show LEGIT vs SUSPICIOUS + confidence / escalate (**human-in-the-loop**). |
| 55–85 | **Actions & cashflow**: approve one gated action → show forecast line (**technical execution** visible). |
| 85–90 | Close: what ships next (Specter / LLM / real bank) only if true — bonus buckets are separate.

Rehearse with a timer; trim UI paths if you run long.
