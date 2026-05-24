from functools import lru_cache
from typing import List

MODEL_NAME = "all-MiniLM-L6-v2"

_model = None
_model_failed = False


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


def embed_text(text: str) -> List[float]:
    model = _load_model()
    if model is None:
        return []
    vector = model.encode(text, normalize_embeddings=True)
    return vector.tolist()


def embed_texts(texts: List[str]) -> List[List[float]]:
    model = _load_model()
    if model is None:
        return [[] for _ in texts]
    vectors = model.encode(texts, normalize_embeddings=True)
    return vectors.tolist()
