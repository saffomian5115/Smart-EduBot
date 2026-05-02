"""
chunker.py — Text ko chunks mein divide karta hai
Strategy: 500 words per chunk, 50 words overlap
"""


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """
    Text ko words ke hisaab se chunks mein divide karo.
    
    Args:
        text:       Full extracted text
        chunk_size: Har chunk mein kitne words (default 500)
        overlap:    Agle chunk mein kitne words repeat hon (default 50)
    
    Returns:
        List of text chunks
    """
    # Text clean karo
    text = text.strip()
    if not text:
        return []

    # Words mein split karo
    words = text.split()
    if not words:
        return []

    chunks = []
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunk_words = words[start:end]
        chunk = " ".join(chunk_words)
        chunks.append(chunk)

        # Agar last chunk hai to loop khatam
        if end >= len(words):
            break

        # Overlap ke saath aage badho
        start = end - overlap

    return chunks


def chunk_text_by_chars(text: str, chunk_size: int = 2000, overlap: int = 200) -> list[str]:
    """
    Alternative: Character-based chunking (Urdu/Arabic text ke liye better)
    """
    text = text.strip()
    if not text:
        return []

    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size

        # Word boundary pe cut karo
        if end < len(text):
            boundary = text.rfind(" ", start, end)
            if boundary != -1:
                end = boundary

        chunks.append(text[start:end].strip())

        if end >= len(text):
            break

        start = end - overlap

    return [c for c in chunks if c]  # Empty chunks remove karo
