# AutoCFO / hackathon — quick setup and demo
# Requires: uv (https://docs.astral.sh/uv/), Node 18+ with npm

SHELL := /bin/bash

FRONTEND_DIR := frontend
BACKEND_HOST := 127.0.0.1
BACKEND_PORT ?= 8000

.PHONY: help setup backend frontend demo build health

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
