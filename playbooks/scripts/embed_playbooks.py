#!/usr/bin/env python3
"""
Embeds all processed playbooks into Supabase pgvector.
Run once (or after adding new playbooks).

Usage: python embed_playbooks.py
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../agent-service"))

from pathlib import Path
from database import supabase
from rag.embedder import embed_texts

PLAYBOOKS_DIR = Path(__file__).parent.parent / "processed"
CHUNK_SIZE = 400


def extract_frontmatter(content: str) -> tuple[dict, str]:
    if not content.startswith("---"):
        return {}, content
    end = content.find("---", 3)
    if end == -1:
        return {}, content
    frontmatter_text = content[3:end].strip()
    body = content[end + 3:].strip()
    meta: dict = {}
    for line in frontmatter_text.split("\n"):
        if ": " in line:
            key, value = line.split(": ", 1)
            meta[key.strip()] = value.strip()
    return meta, body


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE) -> list[str]:
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) < chunk_size:
            current += "\n\n" + para if current else para
        else:
            if current:
                chunks.append(current)
            current = para
    if current:
        chunks.append(current)
    return chunks or [text[:chunk_size]]


def embed_all_playbooks() -> None:
    print("Searching for playbooks...")
    playbook_files = list(PLAYBOOKS_DIR.glob("*.md"))
    print(f"Found: {len(playbook_files)} files\n")

    for filepath in playbook_files:
        content = filepath.read_text(encoding="utf-8")
        meta, body = extract_frontmatter(content)
        slug = meta.get("slug", filepath.stem)
        title = slug.replace("-", " ").title()
        print(f"Processing: {slug}")

        playbook_res = supabase.table("playbooks").upsert(
            {
                "slug": slug,
                "title": title,
                "signal_type": meta.get("signal_type", "behavioral"),
                "content": body,
                "activates_when": meta.get("activates_when", ""),
                "crisis_escalation": meta.get("crisis_escalation", "false").lower() == "true",
            },
            on_conflict="slug",
        ).execute()

        playbook_id = playbook_res.data[0]["id"]
        supabase.table("playbook_chunks").delete().eq("playbook_id", playbook_id).execute()

        chunks = chunk_text(body)
        embeddings = embed_texts(chunks)

        rows = [
            {
                "playbook_id": playbook_id,
                "chunk_text": chunk,
                "embedding": embedding,
                "chunk_index": i,
            }
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
        ]

        supabase.table("playbook_chunks").insert(rows).execute()
        print(f"  {len(chunks)} chunks embedded\n")

    print("All playbooks embedded successfully.")


if __name__ == "__main__":
    embed_all_playbooks()
