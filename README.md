# 📖 Smart EduBot

Apni PDF book upload karo aur seedha sawaal poecho — AI jawab dega.

---

## Tech Stack

- **Frontend** — React + Vite
- **Backend** — FastAPI (Python)
- **Embeddings** — sentence-transformers (`all-MiniLM-L6-v2`)
- **Vector DB** — ChromaDB
- **LLM** — LLaMA 2 via Ollama (local)

---

## Requirements

- Python 3.10+
- Node.js 20+
- [Ollama](https://ollama.com) installed

---

## Installation & Setup

### 1. Ollama setup
```bash
ollama pull llama2
ollama serve
```

### 2. Backend
```bash
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate   # Mac/Linux
source venv/Scripts/activate    #for git batch terminal


pip install -r backend/requirements.txt
cd backend
uvicorn main:app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

App open ho jaayegi: `http://localhost:5173`

> **Windows shortcut:** Root folder mein `start.bat` double-click karo — sab automatically start ho jaayega.

---

## How to Use

1. **Upload** — PDF drag-and-drop karo ya click karke select karo
2. **Index** — Agar book "not indexed" dikhaye to sidebar mein `⟳ Index` button dabaao
3. **Chat** — Sidebar se book select karo aur sawaal poecho

---

## Project Structure

```
├── backend/
│   ├── main.py            # FastAPI endpoints
│   ├── chunker.py         # Text chunking
│   ├── embedder.py        # Sentence embeddings
│   ├── vector_store.py    # ChromaDB operations
│   ├── prompt_builder.py  # LLM prompt templates
│   ├── llm.py             # Ollama API calls
│   └── storage/           # Books, chunks, history
├── frontend/
│   └── src/
│       ├── pages/         # UploadPage, ChatPage
│       └── components/    # Sidebar, ChatWindow, MessageInput
└── start.bat              # Windows one-click launcher
```

---

## Notes

- Sirf **text-based PDFs** kaam karti hain — scanned images support nahi
- Max file size: **50MB**
- Ollama locally run hona chahiye — internet LLM nahi use hota