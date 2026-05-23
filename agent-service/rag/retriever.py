from rag.embedder import embed_text
from database import supabase
from typing import List


def search_playbooks(query: str, limit: int = 3) -> List[dict]:
    query_vector = embed_text(query)

    result = supabase.rpc(
        "match_playbook_chunks",
        {
            "query_embedding": query_vector,
            "match_threshold": 0.4,
            "match_count": limit,
        },
    ).execute()

    return result.data or []
