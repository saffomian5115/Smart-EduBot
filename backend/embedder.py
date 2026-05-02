"""
embedder.py — Sentence Transformers se chunks ko embed karta hai
Model: all-MiniLM-L6-v2 (fast, lightweight, good quality)
"""

from sentence_transformers import SentenceTransformer
from pathlib import Path

# ─── Model load (ek baar load hota hai, poora app mein reuse hota hai) ───
MODEL_NAME = "all-MiniLM-L6-v2"

print(f"[Embedder] Model load ho raha hai: {MODEL_NAME}")
model = SentenceTransformer(MODEL_NAME)
print(f"[Embedder] Model ready!")


def embed_chunks(chunks: list[str]) -> list[list[float]]:
    """
    Chunks ki list lo, embeddings ki list return karo.
    
    Args:
        chunks: Text chunks (strings ki list)
    
    Returns:
        List of embedding vectors (float lists)
    """
    if not chunks:
        return []

    embeddings = model.encode(
        chunks,
        show_progress_bar=True,
        batch_size=32,
        convert_to_numpy=True
    )

    return embeddings.tolist()


def embed_query(query: str) -> list[float]:
    """
    Single query string ko embed karo (search ke liye).
    
    Args:
        query: User ka sawaal
    
    Returns:
        Single embedding vector
    """
    embedding = model.encode(query, convert_to_numpy=True)
    return embedding.tolist()
