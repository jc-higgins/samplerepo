#!/usr/bin/env bash
# scripts/demo.sh — one-shot AutoCFO demo run-through.
#
# Walks the five best beats with paced narration so a judge can read
# along: pre-flight, clean slate, baseline runway, live AWS-spike with
# Cursor SDK insight, approve a savings action (runway shifts on the
# wire), Cursor SDK drafts the Globex chase email.
#
# Requires the backend running on $API (default http://127.0.0.1:8000).
# Start it in another terminal with `make backend` (or `make demo` for
# backend + frontend together).
#
# Tweak pacing with PAUSE=1.0 ./scripts/demo.sh.

set -euo pipefail

API="${API:-http://127.0.0.1:8000}"
PAUSE="${PAUSE:-2.0}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INJECT="${ROOT_DIR}/scripts/inject_txn.py"

# ANSI helpers ---------------------------------------------------------------
if [ -t 1 ]; then
  R=$'\033[0m'; B=$'\033[1m'; D=$'\033[2m'
  RED=$'\033[31m'; GRN=$'\033[32m'; YEL=$'\033[33m'
  CYAN=$'\033[1;36m'; MAG=$'\033[1;35m'
else
  R=""; B=""; D=""; RED=""; GRN=""; YEL=""; CYAN=""; MAG=""
fi

beat() {
  printf "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${R}\n"
  printf "${CYAN}▌ %s${R}\n" "$1"
  printf "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${R}\n"
  sleep 0.4
}

say()   { printf "  ${D}%s${R}\n" "$1"; sleep "$PAUSE"; }
point() { printf "  ${YEL}→${R} ${B}%s${R}\n" "$1"; }
fail()  { printf "${RED}✗ %s${R}\n" "$1"; exit 1; }

# Pre-flight -----------------------------------------------------------------
if ! curl -sf "${API}/health" >/dev/null 2>&1; then
  fail "Backend not reachable at ${API}. Start it with: make backend"
fi

beat "0/5  Pre-flight — backend up, Cursor SDK ready"
curl -sS "${API}/llm/status" | python3 -m json.tool
say "available=true means the live Cursor agent is wired in."

# Clean slate ----------------------------------------------------------------
beat "1/5  Clean slate — clear any prior demo state"
"${INJECT}" --reset

# Baseline -------------------------------------------------------------------
beat "2/5  Baseline runway — before approving any actions"
say "Watch monthly_outflow and runway_months. We'll hit them again after Approve."
curl -sS "${API}/cashflow/summary" | python3 -m json.tool

# Hero beat: live AWS spike --------------------------------------------------
beat "3/5  Live bank webhook — AWS bill 2.4× the run-rate"
say "POST /transactions runs the rule engine AND asks the Cursor SDK for a second opinion."
point "Dashboard cue: refresh Statements — the new line appears at the top."
"${INJECT}" aws_spike

# Approve a savings action ---------------------------------------------------
beat "4/5  Human-in-the-loop — approve 'Downscale AWS' savings action"
say "POST /actions/act_aws_downscale/approve. monthly_outflow drops £900, runway extends."
curl -sX POST "${API}/actions/act_aws_downscale/approve" >/dev/null
curl -sS "${API}/cashflow/summary" | python3 -m json.tool
point "Dashboard cue: header runway figure shifts; forecast line flexes up."

# Cursor SDK drafts the chase email ------------------------------------------
beat "5/5  Cursor SDK drafts the Globex chase email"
say "POST /actions/act_chase_globex/draft-email — composer-2 returns {subject, body, call_to_action}."
curl -sX POST "${API}/actions/act_chase_globex/draft-email" \
     -H 'content-type: application/json' -d '{}' \
  | python3 "${ROOT_DIR}/scripts/_render_email_draft.py"
point "Dashboard cue: email panel for Globex now has a live draft body, not a template."

# Wrap -----------------------------------------------------------------------
beat "Done — demo run complete"
printf "  ${GRN}✓${R} 5 beats: pre-flight → reset → baseline → live spike → approve → SDK email\n"
printf "  ${B}Dashboard:${R} http://localhost:5173\n"
printf "  ${D}Replay any time:${R} ./scripts/demo.sh   (PAUSE=1.0 for a faster run)\n\n"
