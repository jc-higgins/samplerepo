# AutoCFO / hackathon — quick setup and demo
# Requires: uv (https://docs.astral.sh/uv/), Node 20+ with npm (react-router-dom v7)

SHELL := /bin/bash

FRONTEND_DIR := frontend
BACKEND_HOST := 127.0.0.1
BACKEND_PORT ?= 8000

.PHONY: help setup backend frontend demo build health \
	inject inject-list demo-reset demo-run llm-status sdk-setup

help: ## Show available targets
	@grep -E '^[a-zA-Z0-9_-]+:.*?##' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

setup: ## Install Python deps (uv) + frontend npm packages; copy .env if missing
	uv sync
	cd $(FRONTEND_DIR) && npm install
	@test -f $(FRONTEND_DIR)/.env || cp $(FRONTEND_DIR)/.env.example $(FRONTEND_DIR)/.env
	@echo "Setup done. Run \`make demo\` or \`make backend\` + \`make frontend\` in two terminals."

backend: ## Start FastAPI with reload (default http://127.0.0.1:8000)
	uv run uvicorn hackathon_backend.main:app --reload --host $(BACKEND_HOST) --port $(BACKEND_PORT)

frontend: ## Start Vite dev server (default http://localhost:5173)
	cd $(FRONTEND_DIR) && npm run dev

demo: ## Run backend + frontend in one terminal (Ctrl+C stops both)
	@echo "API  http://$(BACKEND_HOST):$(BACKEND_PORT)  ·  UI  http://localhost:5173"
	@trap 'for p in $$(jobs -p); do kill $$p 2>/dev/null; done; exit 0' INT TERM; \
		uv run uvicorn hackathon_backend.main:app --reload --host $(BACKEND_HOST) --port $(BACKEND_PORT) & \
		cd $(FRONTEND_DIR) && npm run dev & \
		wait

build: ## Production build of the frontend
	cd $(FRONTEND_DIR) && npm run build

health: ## GET /health from the API (expects backend running)
	@curl -sS "http://$(BACKEND_HOST):$(BACKEND_PORT)/health" && echo

llm-status: ## GET /llm/status — is the Cursor SDK wired up?
	@curl -sS "http://$(BACKEND_HOST):$(BACKEND_PORT)/llm/status" | python3 -m json.tool

sdk-setup: ## npm install @cursor/sdk in services/ (one-off)
	cd services && npm install

# Demo helpers --------------------------------------------------------------
# Run the live-injection CLI. `make inject` lists scenarios; pass SCENARIO=...
# to fire one. Pass SKIP_AGENT=1 to bypass the Cursor SDK hop.
SCENARIO ?=
SKIP_AGENT ?=

inject: ## Inject a demo bank line (SCENARIO=aws_spike|rogue_vendor|...)
	@if [ -z "$(SCENARIO)" ]; then \
		scripts/inject_txn.py; \
	elif [ -n "$(SKIP_AGENT)" ]; then \
		scripts/inject_txn.py $(SCENARIO) --skip-agent; \
	else \
		scripts/inject_txn.py $(SCENARIO); \
	fi

inject-list: ## Show the last 6 transactions the API knows about
	@scripts/inject_txn.py --list

demo-reset: ## Clear injected txns + action approvals + email drafts (POST /demo/reset)
	@curl -sX POST "http://$(BACKEND_HOST):$(BACKEND_PORT)/demo/reset" | python3 -m json.tool

demo-run: ## Run the full 90s demo walkthrough (requires `make backend` running)
	@./scripts/demo.sh
