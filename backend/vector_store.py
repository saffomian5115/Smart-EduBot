"""
vector_store.py — ChromaDB ke saath vector storage aur retrieval
Har book ka alag collection hota hai ChromaDB mein
"""

import chromadb
from chromadb.config import Settings
from pathlib import Path
from embedder import embed_chunks, embed_query

# ─── ChromaDB client (persistent — disk pe save hota hai) ────────────
CHROMA_DIR = Path("storage/chromadb")
CHROMA_DIR.mkdir(parents=True, exist_ok=True)

client = chromadb.PersistentClient(path=str(CHROMA_DIR))


def _get_collection(book_id: str):
    """Book ke liye ChromaDB collection lo ya banao."""
    return client.get_or_create_collection(
        name=f"book_{book_id}",
        metadata={"hnsw:space": "cosine"}  # Cosine similarity use karo
    )


def index_book(book_id: str, chunks: list[str]) -> int:
    """
    Book ke chunks ko embed karke ChromaDB mein store karo.
    
    Args:
        book_id: Unique book ID
        chunks:  Text chunks ki list
    
    Returns:
        Kitne chunks store hue
    """
    if not chunks:
        return 0

    collection = _get_collection(book_id)

    # Agar pehle se indexed hai to skip karo (duplicate prevention)
    existing = collection.count()
    if existing > 0:
        print(f"[VectorStore] Book {book_id} pehle se indexed hai ({existing} chunks). Skip.")
        return existing

    print(f"[VectorStore] {len(chunks)} chunks embed ho rahe hain...")
    embeddings = embed_chunks(chunks)

    # ChromaDB mein store karo
    collection.add(
        ids        = [f"{book_id}_chunk_{i}" for i in range(len(chunks))],
        embeddings = embeddings,
        documents  = chunks,
        metadatas  = [{"chunk_index": i, "book_id": book_id} for i in range(len(chunks))]
    )

    print(f"[VectorStore] {len(chunks)} chunks successfully store ho gaye!")
    return len(chunks)


def retrieve_chunks(book_id: str, query: str, top_k: int = 5) -> list[dict]:
    """
    Query ke liye relevant chunks retrieve karo.
    
    Args:
        book_id: Konsi book se search karein
        query:   User ka sawaal
        top_k:   Kitne chunks chahiye (default 5)
    
    Returns:
        List of dicts: {text, chunk_index, distance}
    """
    collection = _get_collection(book_id)

    if collection.count() == 0:
        return []

    query_embedding = embed_query(query)

    results = collection.query(
        query_embeddings = [query_embedding],
        n_results        = min(top_k, collection.count()),
        include          = ["documents", "metadatas", "distances"]
    )

    output = []
    for i, doc in enumerate(results["documents"][0]):
        output.append({
            "text":        doc,
            "chunk_index": results["metadatas"][0][i]["chunk_index"],
            "distance":    round(results["distances"][0][i], 4)
        })

    return output


def delete_book_index(book_id: str) -> bool:
    """
    Book ka ChromaDB collection delete karo.
    
    Returns:
        True agar delete hua, False agar collection tha hi nahi
    """
    try:
        client.delete_collection(name=f"book_{book_id}")
        print(f"[VectorStore] Book {book_id} ka index delete ho gaya.")
        return True
    except Exception:
        return False


def get_collection_info(book_id: str) -> dict:
    """Book ke collection ki info lo."""
    try:
        col = _get_collection(book_id)
        return {"book_id": book_id, "chunk_count": col.count(), "indexed": col.count() > 0}
    except Exception:
        return {"book_id": book_id, "chunk_count": 0, "indexed": False}
