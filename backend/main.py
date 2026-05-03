from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import uuid
import fitz  # PyMuPDF
from chunker import chunk_text
from vector_store import index_book, delete_book_index, get_collection_info, retrieve_chunks
from prompt_builder import build_prompt, build_prompt_urdu, detect_language
from llm import ask_llm, ask_llm_stream, check_ollama
from pathlib import Path

app = FastAPI(title="Smart EduBot API")

# ─── CORS ────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Storage ─────────────────────────────────────────────────────────
STORAGE_DIR  = Path("storage")
BOOKS_FILE   = STORAGE_DIR / "books.json"
CHUNKS_DIR   = STORAGE_DIR / "chunks"
HISTORY_DIR  = STORAGE_DIR / "history"

for d in [STORAGE_DIR, CHUNKS_DIR, HISTORY_DIR]:
    d.mkdir(exist_ok=True)

if not BOOKS_FILE.exists():
    BOOKS_FILE.write_text(json.dumps([]))


# ─── Helpers ─────────────────────────────────────────────────────────
def load_books():
    return json.loads(BOOKS_FILE.read_text())

def save_books(books):
    BOOKS_FILE.write_text(json.dumps(books, indent=2, ensure_ascii=False))

def load_history(book_id: str) -> list:
    f = HISTORY_DIR / f"{book_id}.json"
    return json.loads(f.read_text()) if f.exists() else []

def save_history(book_id: str, history: list):
    f = HISTORY_DIR / f"{book_id}.json"
    f.write_text(json.dumps(history, indent=2, ensure_ascii=False))


# ─── Request schemas ──────────────────────────────────────────────────
class AskRequest(BaseModel):
    book_id:  str
    question: str
    stream:   bool = False


# ─── Root ─────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "Smart EduBot backend chal raha hai!"}


# ─── GET /health/ollama ───────────────────────────────────────────────
@app.get("/health/ollama")
async def ollama_health():
    return await check_ollama()


# ─── POST /upload-pdf ─────────────────────────────────────────────────
@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Sirf PDF files allowed hain.")

    pdf_bytes = await file.read()

    books = load_books()
    for book in books:
        if book["filename"] == file.filename:
            raise HTTPException(status_code=409, detail=f"'{file.filename}' pehle se upload hai.")

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception:
        raise HTTPException(status_code=422, detail="PDF corrupt ya invalid hai.")

    full_text = ""
    page_count = len(doc)
    for page in doc:
        full_text += page.get_text()
    doc.close()

    if not full_text.strip():
        raise HTTPException(status_code=422, detail="PDF mein readable text nahi mila.")

    chunks  = chunk_text(full_text)
    book_id = str(uuid.uuid4())
    book_meta = {
        "book_id":     book_id,
        "filename":    file.filename,
        "title":       file.filename.replace(".pdf", ""),
        "pages":       page_count,
        "chunk_count": len(chunks),
        "indexed":     False,
    }

    books.append(book_meta)
    save_books(books)

    (CHUNKS_DIR / f"{book_id}.json").write_text(
        json.dumps(chunks, ensure_ascii=False, indent=2)
    )

    stored = index_book(book_id, chunks)

    books = load_books()
    for b in books:
        if b["book_id"] == book_id:
            b["indexed"] = stored > 0
    save_books(books)

    return {
        "message":     "PDF upload, extract aur index ho gayi!",
        "book_id":     book_id,
        "title":       book_meta["title"],
        "pages":       page_count,
        "chunk_count": len(chunks),
        "indexed":     stored > 0,
    }


# ─── POST /ask ────────────────────────────────────────────────────────
@app.post("/ask")
async def ask(req: AskRequest):
    # Book exist karti hai?
    books  = load_books()
    book   = next((b for b in books if b["book_id"] == req.book_id), None)
    if not book:
        raise HTTPException(status_code=404, detail="Book nahi mili.")
    if not book.get("indexed"):
        raise HTTPException(status_code=400, detail="Book abhi index nahi hui. Thodi der mein try karo.")

    # Top-5 relevant chunks retrieve karo
    chunks = retrieve_chunks(req.book_id, req.question, top_k=3)
    if not chunks:
        raise HTTPException(status_code=404, detail="Koi relevant content nahi mila.")

    chunk_texts = [c["text"] for c in chunks]

    # Language detect karo aur prompt banao
    lang   = detect_language(req.question)
    prompt = build_prompt_urdu(chunk_texts, req.question) if lang == 'urdu' \
             else build_prompt(chunk_texts, req.question)

    # ── Streaming response ────────────────────────────────────────────
    if req.stream:
        async def token_generator():
            full_answer = ""
            async for token in ask_llm_stream(prompt):
                full_answer += token
                yield token

            # History save karo
            history = load_history(req.book_id)
            history.append({"role": "user",      "content": req.question})
            history.append({"role": "assistant",  "content": full_answer})
            save_history(req.book_id, history)

        return StreamingResponse(token_generator(), media_type="text/plain")

    # ── Normal response ───────────────────────────────────────────────
    answer = await ask_llm(prompt)

    history = load_history(req.book_id)
    history.append({"role": "user",     "content": req.question})
    history.append({"role": "assistant","content": answer})
    save_history(req.book_id, history)

    return {
        "answer":   answer,
        "book_id":  req.book_id,
        "chunks_used": len(chunks),
        "language": lang,
    }


# ─── GET /history/{book_id} ───────────────────────────────────────────
@app.get("/history/{book_id}")
def get_history(book_id: str):
    return {"book_id": book_id, "history": load_history(book_id)}


# ─── DELETE /history/{book_id} ────────────────────────────────────────
@app.delete("/history/{book_id}")
def clear_history(book_id: str):
    save_history(book_id, [])
    return {"message": "History clear ho gayi.", "book_id": book_id}


# ─── GET /books ───────────────────────────────────────────────────────
@app.get("/books")
def get_books():
    return load_books()


# ─── DELETE /books/{book_id} ──────────────────────────────────────────
@app.delete("/books/{book_id}")
def delete_book(book_id: str):
    books     = load_books()
    new_books = [b for b in books if b["book_id"] != book_id]
    if len(new_books) == len(books):
        raise HTTPException(status_code=404, detail="Book nahi mili.")

    save_books(new_books)

    for f in [CHUNKS_DIR / f"{book_id}.json", HISTORY_DIR / f"{book_id}.json"]:
        if f.exists():
            f.unlink()

    delete_book_index(book_id)
    return {"message": "Book, history aur index sab delete ho gaye.", "book_id": book_id}


# ─── GET /books/{book_id}/info ────────────────────────────────────────
@app.get("/books/{book_id}/info")
def book_info(book_id: str):
    books = load_books()
    book  = next((b for b in books if b["book_id"] == book_id), None)
    if not book:
        raise HTTPException(status_code=404, detail="Book nahi mili.")
    return {**book, **get_collection_info(book_id)}


# ─── POST /index/{book_id} ────────────────────────────────────────────
@app.post("/index/{book_id}")
def reindex_book(book_id: str):
    books = load_books()
    book  = next((b for b in books if b["book_id"] == book_id), None)
    if not book:
        raise HTTPException(status_code=404, detail="Book nahi mili.")

    chunk_file = CHUNKS_DIR / f"{book_id}.json"
    if not chunk_file.exists():
        raise HTTPException(status_code=404, detail="Chunks file nahi mili.")

    chunks = json.loads(chunk_file.read_text())
    stored = index_book(book_id, chunks)

    for b in books:
        if b["book_id"] == book_id:
            b["indexed"] = stored > 0
    save_books(books)

    return {"message": "Book index ho gayi.", "book_id": book_id, "chunks_stored": stored}