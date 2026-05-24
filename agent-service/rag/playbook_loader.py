"""
Playbook loader — DB-backed verification that RAG data is available.
Used by E2E tests and health checks to confirm chunks are populated.
"""
from database import supabase
from typing import List


def load_all_playbooks() -> List[dict]:
    """Return all playbook records from the DB (slug, title, signal_type)."""
    try:
        res = supabase.table("playbooks").select("slug, title, signal_type").execute()
        return res.data or []
    except Exception:
        return []


def get_playbook_count() -> int:
    """Return the total number of embedded chunks in playbook_chunks."""
    try:
        res = supabase.table("playbook_chunks").select("id", count="exact").execute()
        return res.count or 0
    except Exception:
        return 0


def get_chunks_per_playbook() -> dict[str, int]:
    """Return {slug: chunk_count} for all playbooks that have chunks."""
    try:
        res = (
            supabase.table("playbook_chunks")
            .select("playbook_id, playbooks(slug)")
            .execute()
        )
        counts: dict[str, int] = {}
        for row in (res.data or []):
            slug = (row.get("playbooks") or {}).get("slug", "unknown")
            counts[slug] = counts.get(slug, 0) + 1
        return counts
    except Exception:
        return {}
