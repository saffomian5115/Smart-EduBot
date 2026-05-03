import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import Sidebar        from "../components/Sidebar";
import ChatWindow     from "../components/ChatWindow";
import MessageInput   from "../components/MessageInput";
import ModelSelector  from "../components/ModelSelector";
import UploadModal    from "../components/UploadModal";

const API = "http://localhost:8000";

export default function ChatPage() {
  const location = useLocation();

  // ── Core state ───────────────────────────────────────────────────
  const [selectedBook, setSelectedBook]   = useState(null);
  const [messages, setMessages]           = useState([]);
  const [isLoading, setIsLoading]         = useState(false);
  const [streamingText, setStreamingText] = useState("");

  // ── Model state ──────────────────────────────────────────────────
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem("edubot_model") || "llama2"
  );
  const [ollamaOk, setOllamaOk]           = useState(true);
  const [geminiKeyOk, setGeminiKeyOk]     = useState(false);

  // ── Upload modal state ───────────────────────────────────────────
  const [showUploadModal, setShowUploadModal] = useState(false);

  // ── Sidebar refresh trigger ──────────────────────────────────────
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  // ── Auto-select book from upload redirect ────────────────────────
  useEffect(() => {
    if (location.state?.book) setSelectedBook(location.state.book);
  }, [location.state]);

  // ── Load chat history when book changes ─────────────────────────
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

  // ── Check Gemini key on mount ────────────────────────────────────
  useEffect(() => {
    axios.get(`${API}/settings/api-key`)
      .then((res) => setGeminiKeyOk(res.data.has_key))
      .catch(() => setGeminiKeyOk(false));
  }, []);

  // ── Persist model selection ──────────────────────────────────────
  const handleModelChange = (model) => {
    setSelectedModel(model);
    localStorage.setItem("edubot_model", model);
  };

  // ── Handle book deleted from sidebar ────────────────────────────
  const handleBookDeleted = () => {
    setSelectedBook(null);
    setMessages([]);
    setStreamingText("");
  };

  // ── Handle upload success from modal ────────────────────────────
  const handleUploadSuccess = (newBook) => {
    setSelectedBook(newBook);
    setMessages([]);
    setStreamingText("");
    // Tell sidebar to refresh its book list
    setSidebarRefreshKey((k) => k + 1);
  };

  // ── Is input disabled? ───────────────────────────────────────────
  const isGeminiMissingKey = selectedModel === "gemini" && !geminiKeyOk;
  const isOllamaDown       = selectedModel === "llama2" && !ollamaOk;
  const inputDisabled      = isLoading || isGeminiMissingKey || isOllamaDown;

  // ── Send message with streaming ──────────────────────────────────
  const handleSend = async (question) => {
    if (!selectedBook || inputDisabled) return;

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
          model:    selectedModel,        // ← model field
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Kuch ghalat hua.");
      }

      const reader   = response.body.getReader();
      const decoder  = new TextDecoder();
      let fullAnswer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const token = decoder.decode(value, { stream: true });
        fullAnswer += token;
        setStreamingText(fullAnswer);
      }

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

  // ── Disabled reason for MessageInput placeholder ─────────────────
  const getDisabledReason = () => {
    if (isGeminiMissingKey) return "gemini-no-key";
    if (isOllamaDown)       return "ollama-down";
    return null;
  };

  return (
    <div style={styles.layout}>

      {/* ── Upload Modal ── */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={handleUploadSuccess}
        />
      )}

      {/* ── Sidebar ── */}
      <Sidebar
        selectedBook={selectedBook}
        onSelectBook={(book) => {
          setSelectedBook(book);
          setStreamingText("");
        }}
        onBookDeleted={handleBookDeleted}
        onUploadClick={() => setShowUploadModal(true)}
        refreshKey={sidebarRefreshKey}
      />

      {/* ── Main chat area ── */}
      <div style={styles.chatArea}>

        {/* ── Top bar ── */}
        <div style={styles.topBar}>
          {selectedBook ? (
            <>
              {/* Left: book info */}
              <div style={styles.topBarLeft}>
                <p style={styles.topBarLabel}>READING</p>
                <p style={styles.topBarTitle}>{selectedBook.title}</p>
              </div>

              {/* Right: controls */}
              <div style={styles.topBarRight}>

                {/* Ollama warning */}
                {selectedModel === "llama2" && !ollamaOk && (
                  <span style={styles.warnBadge}>
                    ⚠ Ollama nahi chal raha
                  </span>
                )}

                {/* Gemini no-key warning */}
                {selectedModel === "gemini" && !geminiKeyOk && (
                  <span style={styles.warnBadge}>
                    ⚠{" "}
                    <a href="/keys" style={styles.warnLink}>
                      Gemini key add karo
                    </a>
                  </span>
                )}

                {/* Book meta */}
                <span style={styles.topBarMeta}>
                  {selectedBook.pages}p · {selectedBook.chunk_count} chunks
                </span>

                {/* Model selector */}
                <ModelSelector
                  selectedModel={selectedModel}
                  onModelChange={handleModelChange}
                />

                {/* Clear history */}
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
            /* No book selected — show app name + model selector */
            <div style={styles.topBarNoBook}>
              <p style={styles.topBarTitle}>📖 EduBot</p>
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={handleModelChange}
              />
            </div>
          )}
        </div>

        {/* ── Content area ── */}
        {!selectedBook ? (
          <div style={styles.noBookState}>
            <p style={styles.noBookIcon}>📚</p>
            <p style={styles.noBookTitle}>Koi book select nahi ki</p>
            <p style={styles.noBookSub}>
              Sidebar se koi book choose karo, ya{" "}
              <button
                style={styles.uploadLinkBtn}
                onClick={() => setShowUploadModal(true)}
              >
                nayi upload karo
              </button>
            </p>
          </div>
        ) : (
          <>
            <ChatWindow
              messages={messages}
              isLoading={isLoading}
              streamingText={streamingText}
            />

            {/* Gemini no-key inline notice above input */}
            {isGeminiMissingKey && (
              <div style={styles.keyNotice}>
                ✨ Gemini use karne ke liye{" "}
                <a href="/keys" style={styles.keyNoticeLink}>
                  Key Management
                </a>{" "}
                mein API key add karo, phir wapas aao.
              </div>
            )}

            <MessageInput
              onSend={handleSend}
              disabled={inputDisabled}
              disabledReason={getDisabledReason()}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
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
    minWidth: 0,
  },

  // ── Top bar ──
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.75rem 1.25rem",
    borderBottom: "1px solid #1e2333",
    background: "#0d1016",
    flexShrink: 0,
    minHeight: "60px",
    gap: "12px",
  },
  topBarLeft: {
    minWidth: 0,
    flex: "0 1 auto",
  },
  topBarNoBook: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  topBarLabel: {
    fontSize: "9px",
    color: "#4b5563",
    letterSpacing: "0.12em",
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: "2px",
  },
  topBarTitle: {
    fontSize: "15px",
    color: "#e8c97a",
    fontFamily: "'Crimson Pro', Georgia, serif",
    fontWeight: "600",
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "260px",
  },
  topBarRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexShrink: 0,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  topBarMeta: {
    fontSize: "11px",
    color: "#374151",
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: "nowrap",
  },
  warnBadge: {
    fontSize: "11px",
    color: "#cf7e7e",
    background: "#2e1a1a",
    border: "1px solid #5a2d2d",
    borderRadius: "8px",
    padding: "3px 10px",
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: "nowrap",
  },
  warnLink: {
    color: "#cf7e7e",
    textDecoration: "underline",
  },
  clearBtn: {
    background: "transparent",
    border: "1px solid #252a38",
    color: "#4b5563",
    borderRadius: "8px",
    padding: "5px 10px",
    fontSize: "12px",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: "nowrap",
  },

  // ── No book state ──
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
  uploadLinkBtn: {
    background: "none",
    border: "none",
    color: "#e8c97a",
    cursor: "pointer",
    fontSize: "14px",
    fontFamily: "'DM Sans', sans-serif",
    textDecoration: "underline",
    textDecorationColor: "#4a3d10",
    padding: 0,
  },

  // ── Gemini key notice (above input) ──
  keyNotice: {
    padding: "10px 1.5rem",
    background: "#1a1508",
    borderTop: "1px solid #2a2010",
    fontSize: "12px",
    color: "#c4a03a",
    fontFamily: "'DM Sans', sans-serif",
    textAlign: "center",
    flexShrink: 0,
  },
  keyNoticeLink: {
    color: "#e8c97a",
    textDecoration: "underline",
    textDecorationColor: "#4a3d10",
  },
};