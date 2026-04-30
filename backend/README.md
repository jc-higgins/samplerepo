# Backend

Python with [uv](https://docs.astral.sh/uv/). Package name: `hackathon_backend`.

```bash
uv venv && source .venv/bin/activate && uv sync
uv run uvicorn hackathon_backend.main:app --reload --port 8000
```

Add dependencies: `uv add <package>`.
