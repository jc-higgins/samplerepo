# AutoCFO: Autonomous Financial Intelligence

AutoCFO is an autonomous CFO agent built with the Cursor SDK.
It does not only analyze finances; it takes action:

- Monitors cashflow and predicts runway risk.
- Categorizes transactions and explains unclear bank lines.
- Detects potential fraud and escalates uncertain cases.
- Automates finance operations (invoice chasing, payment timing optimization).

Core principle: **safe autonomy over blind autonomy**.
Every action is scored with confidence and tested against realistic financial scenarios (Spectre-style testing) before execution.

---

## Product Vision

This project targets the **Financial Intelligence** track:

- Categorize transactions and explicitly flag uncertainty.
- Detect fraud and ask for human review when signal quality is mixed.
- Explain bank lines and escalate weird/unknown patterns.

AutoCFO connects to:

- Bank account activity (incoming/outgoing transactions)
- Gmail (invoice requests, vendor communication, reminders)
- WhatsApp (informal payment and invoice context)

By joining these sources, AutoCFO can:

- Generate and tag invoices from outgoing payments.
- Validate incoming invoice requests against email + WhatsApp history.
- Decide whether to execute, delay, chase, or escalate an action.

---

## 3-Agent Split (Roles and Ownership)

This README is intentionally split into **3 parts** so each agent can pick up a clear role.

### Part 1 - Ledger Intelligence Agent (Sense + Explain)

**Mission**
Turn messy transaction streams into structured, explainable financial events.

**Inputs**
- Bank transactions
- Existing chart-of-accounts/tags
- Historical labeled examples

**Responsibilities**
- Categorize transactions (`payroll`, `vendor`, `software`, `tax`, `misc`).
- Explain each bank line in plain English ("what this charge is for").
- Detect low-confidence classifications and emit `REVIEW_REQUIRED`.
- Surface anomalies (new merchant, amount spikes, unusual cadence).

**Outputs**
- `transaction_classification` record:
  - `category`
  - `confidence` (0.00-1.00)
  - `explanation`
  - `review_flag` (boolean)
  - `anomaly_reason` (nullable)

**Escalation Rules**
- Confidence < `0.80` -> always escalate.
- Unknown merchant + high amount -> escalate.
- Contradictory historical pattern -> escalate.

---

### Part 2 - Invoice & Communication Verification Agent (Cross-Channel Truth)

**Mission**
Confirm whether invoice/payment requests are legitimate by cross-checking communications and financial records.

**Inputs**
- Incoming invoice requests (email/WhatsApp)
- Gmail threads and metadata
- WhatsApp message context
- Bank history and vendor history

**Responsibilities**
- Match invoice requests to known vendors/conversations.
- Validate amount, due date, account details, and request context.
- Detect fraud indicators (urgent tone shift, new bank details, spoof patterns).
- Produce a legitimacy decision with evidence traces.

**Outputs**
- `invoice_verification` record:
  - `decision` (`LEGIT`, `SUSPICIOUS`, `UNKNOWN`)
  - `confidence` (0.00-1.00)
  - `evidence` (list of matched signals)
  - `risk_flags` (list)
  - `requires_human_review` (boolean)

**Escalation Rules**
- Conflicting identity/payment details -> escalate.
- First-time sender + payment urgency -> escalate.
- Confidence < `0.85` -> escalate.

---

### Part 3 - Cashflow Actions Agent (Decide + Act Safely)

**Mission**
Take operational finance actions that protect runway while respecting trust boundaries.

**Inputs**
- Cashflow forecast + runway model
- Outputs from Part 1 and Part 2
- Policy constraints (approval thresholds, blocked counterparties, limits)

**Responsibilities**
- Predict short-term cash pressure and recommend interventions.
- Trigger actions:
  - Chase overdue invoices
  - Delay/schedule non-critical payments
  - Approve low-risk recurring payments
- Enforce policy-based guardrails before executing any action.
- Request human approval when risk, uncertainty, or impact is high.

**Outputs**
- `action_plan` record:
  - `recommended_action`
  - `expected_cash_impact`
  - `confidence` (0.00-1.00)
  - `execution_mode` (`AUTO`, `HUMAN_APPROVAL`)
  - `rationale`

**Escalation Rules**
- Any high-impact action above threshold -> human approval.
- Depends on upstream item marked `REVIEW_REQUIRED` -> human approval.
- Confidence < `0.90` -> human approval.

---

## Shared Contract Between All 3 Parts

All agents must return:

- `decision`
- `confidence`
- `rationale`
- `evidence`
- `next_step` (`AUTO_EXECUTE`, `REQUEST_HUMAN`, `REJECT`)

Confidence is mandatory and cannot be omitted.
If evidence is weak or contradictory, default to `REQUEST_HUMAN`.

---

## Human-in-the-Loop Policy

AutoCFO is not trying to remove humans from finance; it is trying to route human attention to the highest-risk decisions.

- **Auto mode**: high-confidence, low-impact, policy-safe actions.
- **Review mode**: mixed signals, novel counterparties, unusual amounts.
- **Block mode**: suspected fraud or policy violation.

When in doubt, escalate.

---

## Why This Fits the Track

- Categorizes transactions and flags uncertainty.
- Detects fraud and asks for review when confidence is mixed.
- Explains bank lines in plain language and escalates weird cases.
- Adds actionability (autonomous CFO behavior) with explicit trust controls.
