from rag.retriever import search_playbooks as rag_search
from database import supabase


def search_playbooks(query: str, limit: int = 2) -> list[dict]:
    results = rag_search(query, limit=limit)

    if not results:
        return []

    playbook_ids = list({r["playbook_id"] for r in results})
    playbooks_res = (
        supabase.table("playbooks")
        .select("slug, title, content, activates_when, crisis_escalation")
        .in_("id", playbook_ids)
        .execute()
    )

    return [
        {
            "slug": p["slug"],
            "title": p["title"],
            "content": p["content"][:800],
            "crisis_escalation": p["crisis_escalation"],
        }
        for p in playbooks_res.data
    ]
