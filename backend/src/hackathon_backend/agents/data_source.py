"""Data source shim.

Prefers Agent A's fixtures package when present, falls back to inline seeds.
"""

from __future__ import annotations

from . import seeds


def _try_fixtures(loader_name: str, fallback):
    try:
        from hackathon_backend.fixtures import loaders  # type: ignore

        loader = getattr(loaders, loader_name, None)
        if loader is None:
            return fallback
        return loader()
    except Exception:
        return fallback


def get_raw_transactions() -> list[dict]:
    return _try_fixtures("load_transactions", seeds.RAW_TRANSACTIONS)


def get_aws_breakdowns() -> dict[str, dict]:
    return _try_fixtures("load_aws_breakdowns", seeds.AWS_BREAKDOWNS)


def get_vendors() -> dict[str, dict]:
    return _try_fixtures("load_vendors", seeds.VENDORS)


def get_gmail_threads() -> dict[str, dict]:
    return _try_fixtures("load_gmail_threads", seeds.GMAIL_THREADS)


def get_whatsapp_threads() -> dict[str, dict]:
    return _try_fixtures("load_whatsapp_threads", seeds.WHATSAPP_THREADS)


def get_raw_invoices() -> list[dict]:
    return _try_fixtures("load_invoices", seeds.RAW_INVOICES)
