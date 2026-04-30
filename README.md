# Hackathon project template

Starter layout for team work at [Cursor × Briefcase: FinTech London Hackathon](https://forum.cursor.com/t/new-event-cursor-x-briefcase-fintech-london-hackathon/158749). Structure is intentionally boring so you can **pivot tracks** (payments, lending, compliance, infra, etc.) without fighting the repo.


## Layout

| Path | Purpose |
|------|---------|
| `specs/` | Plans, ADRs, user stories, track choice — keep decisions in markdown here |
| `backend/` | Python API (uv). Swap frameworks or add workers later without touching `frontend/` |
| `frontend/` | Vite + React UI |
| `demo/` | Judge narrative: script, screenshots, one-liner pitch |

## Backend (uv)

```bash
cd backend
uv venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
uv sync
uv run uvicorn hackathon_backend.main:app --reload --port 8000
```

API: `http://127.0.0.1:8000` — `GET /` and `GET /health`.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_URL` in `frontend/.env` if the API is not on the default (see `frontend/.env.example`).

## Pivoting fintech tracks

1. Duplicate or edit `specs/00-track-pivot.md` with your pillar hypothesis and scope.
2. Keep **contracts** thin: add request/response types in one place (e.g. `specs/api-sketch.md` or shared types later).
3. Prefer new modules under `backend/src/hackathon_backend/` over renaming the package mid-hackathon.

## Team workflow (three people)

- One person owns `specs/` + integration story for the demo.
- Split `frontend/` vs `backend/` by feature slices, not by “my folder only.”
