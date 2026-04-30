"""Data source shim.

Prefers Agent A's fixtures package when present, falls back to inline seeds.
"""

from __future__ import annotations

from . import seeds


_injected_raw_transactions: list[dict] = []


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
    base = _try_fixtures("load_transactions", seeds.RAW_TRANSACTIONS)
    return list(base) + list(_injected_raw_transactions)


def inject_raw_transaction(raw: dict) -> None:
    """Append a raw bank line to the in-memory feed.

    The ledger agent picks it up on the next ``categorize_all()`` call —
    used by ``POST /transactions`` for live demo injection.
    """
    _injected_raw_transactions.append(raw)


def reset_injected_transactions() -> int:
    n = len(_injected_raw_transactions)
    _injected_raw_transactions.clear()
    return n


def get_aws_breakdowns() -> dict[str, dict]:
    return _try_fixtures("load_aws_breakdowns", seeds.AWS_BREAKDOWNS)


def get_gcp_breakdowns() -> dict[str, dict]:
    return _try_fixtures("load_gcp_breakdowns", seeds.GCP_BREAKDOWNS)


def get_cloud_breakdowns() -> dict[str, dict]:
    """Merged AWS + GCP line-item enrichments keyed by transaction id."""
    aws = get_aws_breakdowns()
    gcp = get_gcp_breakdowns()
    return {**aws, **gcp}


def get_vendors() -> dict[str, dict]:
    return _try_fixtures("load_vendors", seeds.VENDORS)


def get_gmail_threads() -> dict[str, dict]:
    return _try_fixtures("load_gmail_threads", seeds.GMAIL_THREADS)


def get_whatsapp_threads() -> dict[str, dict]:
    return _try_fixtures("load_whatsapp_threads", seeds.WHATSAPP_THREADS)


def get_raw_invoices() -> list[dict]:
    return _try_fixtures("load_invoices", seeds.RAW_INVOICES)
