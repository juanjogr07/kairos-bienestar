import json
import subprocess
import sys
from typing import List

MODEL_NAME = "all-MiniLM-L6-v2"

_model = None
_model_failed = False
_subprocess_python: str | None = None


def _find_subprocess_python() -> str | None:
    """Find a system Python that can load sentence-transformers when venv fails."""
    candidates = [
        r"C:\Users\Windows\AppData\Local\Programs\Python\Python312\python.exe",
        r"C:\Users\Windows\AppData\Local\Programs\Python\Python311\python.exe",
        "python",
        "python3",
    ]
    for candidate in candidates:
        if candidate == sys.executable:
            continue
        try:
            result = subprocess.run(
                [candidate, "-c", "from sentence_transformers import SentenceTransformer; print('ok')"],
                capture_output=True, text=True, timeout=15,
            )
            if result.returncode == 0 and "ok" in result.stdout:
                return candidate
        except Exception:
            continue
    return None


def _load_model():
    global _model, _model_failed
    if _model_failed:
        return None
    if _model is not None:
        return _model
    try:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(MODEL_NAME)
    except Exception:
        _model_failed = True
        return None
    return _model


def _embed_via_subprocess(texts: List[str]) -> List[List[float]]:
    """Fallback: call a system Python when in-process PyTorch DLL fails (Windows)."""
    global _subprocess_python
    if _subprocess_python is None:
        _subprocess_python = _find_subprocess_python()
    if _subprocess_python is None:
        return [[] for _ in texts]
    try:
        code = (
            f"from sentence_transformers import SentenceTransformer, util; import json\n"
            f"m = SentenceTransformer({MODEL_NAME!r})\n"
            f"texts = {json.dumps(texts)}\n"
            f"vecs = m.encode(texts, normalize_embeddings=True)\n"
            f"print(json.dumps(vecs.tolist()))"
        )
        result = subprocess.run(
            [_subprocess_python, "-c", code],
            capture_output=True, text=True, timeout=60,
        )
        if result.returncode == 0:
            return json.loads(result.stdout)
    except Exception:
        pass
    return [[] for _ in texts]


def embed_text(text: str) -> List[float]:
    model = _load_model()
    if model is not None:
        return model.encode(text, normalize_embeddings=True).tolist()
    vecs = _embed_via_subprocess([text])
    return vecs[0] if vecs else []


def embed_texts(texts: List[str]) -> List[List[float]]:
    model = _load_model()
    if model is not None:
        return model.encode(texts, normalize_embeddings=True).tolist()
    return _embed_via_subprocess(texts)
