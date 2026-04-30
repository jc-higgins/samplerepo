# Track pivot — Financial Intelligence

**Event pillar / track:** Financial Intelligence ([Cursor × Briefcase · London 2026](https://cusor-hack-london-2026-1.vercel.app)).

**Problem statement:** Founders without a finance team can't see *why* money moves — opaque bank lines, hidden cloud waste, and lookalike invoices slip through until cash hurts.

**User / buyer:** Founder / operator of a 1–50-person company with no in-house CFO; pays for AutoCFO out of the ops/finance budget.

**Demo promise (~90 seconds, rehearsed — matches judge “demo clarity” rubric):**

1. Click a £4,382 "AMAZON WEB SERVICES" line → AutoCFO breaks it into EC2/RDS/S3 and flags ~£900/mo idle compute.
2. Two invoices arrive from "Acme Hosting Ltd" — the real one is marked **LEGIT** (matched IBAN, 4 prior payments, 12-message thread); the lookalike is **SUSPICIOUS** with three explicit risk flags (new IBAN, sender-domain typo, urgency language).
3. A third invoice from a brand-new sender is marked **UNKNOWN** and held for human review.
4. Approve the AWS downscale action; cashflow forecast for the next 90 days is on screen.

Beat sheet and rubric mapping: `specs/README.md`, `demo/README.md`.

**Out of scope (for this hackathon):**

- Real bank, AWS/GCP/Azure, Gmail, or WhatsApp integrations — every external system is a fixture.
- Real LLM / Cursor SDK calls — categorisation, verification, and action decisions are deterministic Python rules.
- Auth, multi-user, persistence — in-memory + JSON only.
- Tests beyond a manual smoke check.
- Mobile, settings UI, design system.

**Open risks:**

- Synthetic data needs to *look* credible at demo distance — the AWS hero line and the suspicious-invoice triplet are the ones that have to read as real.
- Rule-based "agents" can feel thin under questioning; lean on the **confidence + evidence + escalation** framing rather than claiming ML.
- Three panels in ~90 seconds — demo script must call the drill-down, the verification badges, and the approve→forecast loop in that order without stalling.
- All three workstreams (mock data / backend / frontend) must converge on the shared JSON contract in `specs/01-mvp-split.md`; any shape change has to land there first.

**Rubric cross-check (core /7):** Workflow value + track fit + HITL gates + working stack + clear demo — see `specs/README.md`. Canonical criterion text: [`/api/event-format`](https://cusor-hack-london-2026-1.vercel.app/api/event-format). Bonus buckets (Cursor / Specter / LLM): same file.

**Decision log**

| Date       | Decision | Why |
|------------|----------|-----|
| 2026-04-30 | Target the **Financial Intelligence** track with AutoCFO (autonomous CFO for founders). | Plays to the multi-agent + human-in-the-loop angle and differentiates from accountant-facing tools like Briefcase. |
| 2026-04-30 | Replace the README's Part 1/2/3 agent split with a **layer split**: Mock Data (A) / Backend Agents API (B) / Frontend Dashboard (C). | The role-based split serialises three backend agents on the same data; the layer split lets three workers run truly in parallel inside the 1-hour budget. |
| 2026-04-30 | All external systems (bank, AWS, Gmail, WhatsApp) are **mocked via fixtures**, not integrated. | 1-hour MVP; integrations are demo risk with zero demo upside. |
| 2026-04-30 | Agents are **rule-based heuristics**, not LLM calls. | Determinism, speed, and zero API-key/setup friction; the value of the demo is the workflow shape, not the classifier quality. |
| 2026-04-30 | Shared JSON contract lives in `specs/01-mvp-split.md` and is the only coordination point between A/B/C. | Avoids constant cross-talk; any shape change updates that file first. |
