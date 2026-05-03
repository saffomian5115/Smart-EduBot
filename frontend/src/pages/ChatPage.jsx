import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import Sidebar      from "../components/Sidebar";
import ChatWindow   from "../components/ChatWindow";
import MessageInput from "../components/MessageInput";

const API = "http://localhost:8000";

export default function ChatPage() {
  const location                        = useLocation();
  const [selectedBook, setSelectedBook] = useState(null);
  const [messages, setMessages]         = useState([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [ollamaOk, setOllamaOk] = useState(true);

  // ── Auto-select book from upload redirect ────────────────────────
  useEffect(() => {
    if (location.state?.book) setSelectedBook(location.state.book);
  }, [location.state]);

  // ── Load history when book changes ──────────────────────────────
  useEffect(() => {
    if (!selectedBook) { setMessages([]); return; }
    axios.get(`${API}/history/${selectedBook.book_id}`)
      .then((res) => setMessages(res.data.history || []))
      .catch(() => setMessages([]));
  }, [selectedBook]);

  // ── Check Ollama on mount ────────────────────────────────────────
  useEffect(() => {
    axios.get(`${API}/health/ollama`)
      .then((res) => setOllamaOk(res.data.running && res.data.llama2_ready))
      .catch(() => setOllamaOk(false));
  }, []);

  // ── Handle book deleted from sidebar ────────────────────────────
  const handleBookDeleted = () => {
    setSelectedBook(null);
    setMessages([]);
    setStreamingText("");
  };

  // ── Send message with streaming ──────────────────────────────────
  const handleSend = async (question) => {
    if (!selectedBook || isLoading) return;

    // Optimistic user bubble
    const userMsg = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setStreamingText("");

    try {
      const response = await fetch(`${API}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_id:  selectedBook.book_id,
          question: question,
          stream:   true,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Kuch ghalat hua.");
      }

      // Stream tokens
      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let fullAnswer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const token = decoder.decode(value, { stream: true });
        fullAnswer += token;
        setStreamingText(fullAnswer);
      }

      // Commit final bot message
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: fullAnswer },
      ]);

    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠ ${err.message || "Jawab nahi mila. Dobara try karo."}`,
        },
      ]);
    } finally {
      setIsLoading(false);
      setStreamingText("");
    }
  };

  return (
    <div style={styles.layout}>
      <Sidebar
        selectedBook={selectedBook}
        onSelectBook={(book) => {
          setSelectedBook(book);
          setStreamingText("");
        }}
        onBookDeleted={handleBookDeleted}
      />

      <div style={styles.chatArea}>

        {/* ── Top bar ── */}
        <div style={styles.topBar}>
          {selectedBook ? (
            <>
              <div>
                <p style={styles.topBarLabel}>READING</p>
                <p style={styles.topBarTitle}>{selectedBook.title}</p>
              </div>
              <div style={styles.topBarRight}>
                {!ollamaOk && (
                  <span style={styles.ollamaWarn}>
                    ⚠ Ollama nahi chal raha
                  </span>
                )}
                <span style={styles.topBarMeta}>
                  {selectedBook.pages} pages · {selectedBook.chunk_count} chunks
                </span>
                <button
                  style={styles.clearBtn}
                  onClick={async () => {
                    await axios.delete(`${API}/history/${selectedBook.book_id}`);
                    setMessages([]);
                  }}
                  title="Chat history clear karo"
                >
                  🗑 Clear
                </button>
              </div>
            </>
          ) : (
            <p style={styles.topBarTitle}>📖 EduBot</p>
          )}
        </div>

        {/* ── Main content ── */}
        {!selectedBook ? (
          <div style={styles.noBookState}>
            <p style={styles.noBookIcon}>📚</p>
            <p style={styles.noBookTitle}>Koi book select nahi ki</p>
            <p style={styles.noBookSub}>
              Sidebar se koi book choose karo, ya{" "}
              <a href="/" style={styles.uploadLink}>nayi upload karo</a>
            </p>
          </div>
        ) : (
          <>
            <ChatWindow
              messages={messages}
              isLoading={isLoading}
              streamingText={streamingText}
            />
            <MessageInput
              onSend={handleSend}
              disabled={isLoading || !ollamaOk}
            />
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  layout: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
    background: "#0f1117",
  },
  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem 1.5rem",
    borderBottom: "1px solid #1e2333",
    background: "#0d1016",
    flexShrink: 0,
    minHeight: "64px",
  },
  topBarLabel: {
    fontSize: "10px",
    color: "#4b5563",
    letterSpacing: "0.12em",
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: "2px",
  },
  topBarTitle: {
    fontSize: "16px",
    color: "#e8c97a",
    fontFamily: "'Crimson Pro', Georgia, serif",
    fontWeight: "600",
    margin: 0,
  },
  topBarRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  topBarMeta: {
    fontSize: "12px",
    color: "#374151",
    fontFamily: "'DM Sans', sans-serif",
  },
  ollamaWarn: {
    fontSize: "12px",
    color: "#cf7e7e",
    background: "#2e1a1a",
    border: "1px solid #5a2d2d",
    borderRadius: "8px",
    padding: "4px 10px",
    fontFamily: "'DM Sans', sans-serif",
  },
  clearBtn: {
    background: "transparent",
    border: "1px solid #252a38",
    color: "#4b5563",
    borderRadius: "8px",
    padding: "5px 12px",
    fontSize: "12px",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  noBookState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "2rem",
  },
  noBookIcon: { fontSize: "52px", marginBottom: "1rem" },
  noBookTitle: {
    fontSize: "22px",
    color: "#c8bfa0",
    fontFamily: "'Crimson Pro', Georgia, serif",
    fontWeight: "600",
    marginBottom: "8px",
  },
  noBookSub: {
    fontSize: "14px",
    color: "#4b5563",
    fontFamily: "'DM Sans', sans-serif",
  },
  uploadLink: {
    color: "#e8c97a",
    textDecoration: "none",
  },
};