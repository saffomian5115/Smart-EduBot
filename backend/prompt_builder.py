"""
prompt_builder.py — Context + Question ko ek prompt mein combine karta hai
"""


def build_prompt(context_chunks: list[str], question: str) -> str:
    """
    Retrieved chunks aur user question se LLM prompt banao.

    Args:
        context_chunks: ChromaDB se aaye relevant text chunks
        question:       User ka sawaal

    Returns:
        Final prompt string jo LLaMA ko bheja jayega
    """
    context = "\n\n---\n\n".join(
        f"[Excerpt {i+1}]\n{chunk.strip()}"
        for i, chunk in enumerate(context_chunks)
    )

    prompt = f"""You are a helpful study assistant. A student is asking a question about a book they uploaded.

Use ONLY the excerpts provided below to answer the question. If the answer is not found in the excerpts, say "I could not find this in the provided book."

Be clear, concise, and helpful. If the student seems confused, explain step by step.

─────────────────────────────────────
EXCERPTS FROM THE BOOK:
─────────────────────────────────────
{context}

─────────────────────────────────────
STUDENT'S QUESTION:
{question}
─────────────────────────────────────

ANSWER:"""

    return prompt


def build_prompt_urdu(context_chunks: list[str], question: str) -> str:
    """
    Urdu/Hindi questions ke liye alternate prompt.
    Automatically detect karke main /ask endpoint call karta hai.
    """
    context = "\n\n---\n\n".join(
        f"[Hissa {i+1}]\n{chunk.strip()}"
        for i, chunk in enumerate(context_chunks)
    )

    prompt = f"""Aap ek helpful study assistant hain. Ek student ne apni book ke baare mein sawaal pucha hai.

Sirf neeche diye gaye excerpts ki madad se jawab dein. Agar jawab excerpts mein na mile to kahein: "Yeh information di gayi book mein nahi mili."

─────────────────────────────────────
BOOK KE EXCERPTS:
─────────────────────────────────────
{context}

─────────────────────────────────────
STUDENT KA SAWAAL:
{question}
─────────────────────────────────────

JAWAB:"""

    return prompt


def detect_language(text: str) -> str:
    """
    Simple language detection — Urdu/Arabic chars check karo.
    Returns: 'urdu' ya 'english'
    """
    urdu_chars = set('ابتثجحخدذرزسشصضطظعغفقکگلمنوہیآاةءأإ')
    count = sum(1 for ch in text if ch in urdu_chars)
    return 'urdu' if count > len(text) * 0.2 else 'english'
