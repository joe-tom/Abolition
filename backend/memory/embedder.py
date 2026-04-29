import numpy as np
from sentence_transformers import SentenceTransformer

_model: SentenceTransformer | None = None


def get_embedder() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("BAAI/bge-m3")
    return _model


def embed(text: str) -> bytes:
    vec = get_embedder().encode(text, normalize_embeddings=True)
    return vec.astype(np.float32).tobytes()


def cosine(a: bytes, b: bytes) -> float:
    va = np.frombuffer(a, dtype=np.float32)
    vb = np.frombuffer(b, dtype=np.float32)
    return float(np.dot(va, vb))
