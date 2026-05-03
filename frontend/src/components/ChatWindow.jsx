import { useEffect, useRef, useState } from "react";

const TYPING_MSG = "Llama2 model is totally free and work offline perfectly, but it's need a high power device jiske pass kam se kam 4GB ka graphic card ho Nvidia ka — nai to iska response slow ho jata hai or ye kam se kam 3 mint leta hai aik response dene me......";

function TypingPlaceholder() {
  const [displayed, setDisplayed] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= TYPING_MSG.length) return;
    const timeout = setTimeout(() => {
      setDisplayed((prev) => prev + TYPING_MSG[index]);
      setIndex((prev) => prev + 1);
    }, 150); // speed — 35ms per character = ~3 minutes for full message
    return () => clearTimeout(timeout);
  }, [index]);

  return (
    <p style={{ fontSize: "13px", color: "#6b7280", fontFamily: "'DM Sans', sans-serif", margin: 0, lineHeight: "1.6" }}>
      {displayed}
      <span style={{ display: "inline-block", color: "#e8c97a", animation: "blink 1s step-end infinite", marginLeft: "1px" }}>▋</span>
    </p>
  );
}

// ── MessageActions: Copy + TTS buttons ──────────────────────────────
function MessageActions({ content, isStreaming }) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const handleCopy = async () => {
    if (isStreaming) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard access denied
    }
  };

  const handleTTS = () => {
    if (isStreaming) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(content);

    // Simple language detect — Urdu chars
    const urduChars = /[\u0600-\u06FF]/;
    utterance.lang = urduChars.test(content) ? "ur-PK" : "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 1;

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  return (
    <div style={actionStyles.bar}>
      {/* Copy */}
      <button
        style={{
          ...actionStyles.btn,
          ...(isStreaming ? actionStyles.btnDisabled : {}),
          ...(copied ? actionStyles.btnCopied : {}),
        }}
        onClick={handleCopy}
        disabled={isStreaming}
        title="Copy"
      >
        {copied ? "✓" : "📋"}
      </button>

      {/* TTS */}
      <button
        style={{
          ...actionStyles.btn,
          ...(isStreaming ? actionStyles.btnDisabled : {}),
          ...(speaking ? actionStyles.btnSpeaking : {}),
        }}
        onClick={handleTTS}
        disabled={isStreaming}
        title={speaking ? "Stop" : "Text-to-Speech"}
      >
        {speaking ? "⏹" : "🔊"}
      </button>
    </div>
  );
}

const actionStyles = {
  bar: {
    display: "flex",
    gap: "4px",
    marginTop: "5px",
    paddingLeft: "2px",
  },
  btn: {
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: "6px",
    padding: "3px 7px",
    fontSize: "12px",
    cursor: "pointer",
    color: "#4b5563",
    transition: "all 0.15s",
    opacity: 0.6,
    lineHeight: 1,
  },
  btnDisabled: {
    opacity: 0.25,
    cursor: "not-allowed",
  },
  btnCopied: {
    color: "#7ecf7e",
    border: "1px solid #2d5a2d",
    opacity: 1,
  },
  btnSpeaking: {
    color: "#e8c97a",
    border: "1px solid #4a3d10",
    opacity: 1,
    animation: "pulse 1.5s ease-in-out infinite",
  },
};

// ── Main ChatWindow ──────────────────────────────────────────────────
export default function ChatWindow({ messages, isLoading, streamingText }) {
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  return (
    <div style={styles.window}>
      {messages.length === 0 && !isLoading && (
        <div style={styles.emptyChat}>
          <p style={styles.emptyChatIcon}>💬</p>
          <p style={styles.emptyChatTitle}>Sawaal pucho apni book se</p>
          <p style={styles.emptyChatSub}>
            AI tumhare book ke content se jawab dega
          </p>
        </div>
      )}

      {messages.map((msg, i) => {
        const isUser = msg.role === "user";
        return (
          <div
            key={i}
            style={{
              ...styles.msgRow,
              ...(isUser ? styles.msgRowUser : styles.msgRowBot),
            }}
          >
            {!isUser && <div style={styles.avatar}>🤖</div>}

            <div style={styles.bubbleWrap}>
              <div
                style={{
                  ...styles.bubble,
                  ...(isUser ? styles.bubbleUser : styles.bubbleBot),
                }}
              >
                <p
                  style={{
                    ...styles.bubbleText,
                    ...(isUser ? styles.bubbleTextUser : styles.bubbleTextBot),
                  }}
                >
                  {msg.content}
                </p>
              </div>

              {/* Actions only for AI messages */}
              {!isUser && (
                <MessageActions content={msg.content} isStreaming={false} />
              )}
            </div>

            {isUser && <div style={styles.avatar}>👤</div>}
          </div>
        );
      })}

      {/* Streaming bubble */}
      {(isLoading || streamingText) && (
        <div style={{ ...styles.msgRow, ...styles.msgRowBot }}>
          <div style={styles.avatar}>🤖</div>

          <div style={styles.bubbleWrap}>
            <div style={{ ...styles.bubble, ...styles.bubbleBot }}>
              {streamingText ? (
                <p style={{ ...styles.bubbleText, ...styles.bubbleTextBot }}>
                  {streamingText}
                  <span style={styles.cursor}>▋</span>
                </p>
              ) : (
                <TypingPlaceholder />
              )}
            </div>

            {/* Actions disabled while streaming */}
            {streamingText && (
              <MessageActions content={streamingText} isStreaming={true} />
            )}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

const styles = {
  window: {
    flex: 1,
    overflowY: "auto",
    padding: "2rem 1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },

  // ── Empty state ──
  emptyChat: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    margin: "auto",
    textAlign: "center",
    padding: "3rem 2rem",
  },
  emptyChatIcon: { fontSize: "48px", marginBottom: "1rem" },
  emptyChatTitle: {
    fontSize: "20px",
    color: "#c8bfa0",
    fontFamily: "'Crimson Pro', Georgia, serif",
    fontWeight: "600",
    marginBottom: "8px",
  },
  emptyChatSub: {
    fontSize: "13px",
    color: "#4b5563",
    fontFamily: "'DM Sans', sans-serif",
  },

  // ── Message rows ──
  msgRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: "10px",
    animation: "fadeUp 0.25s ease",
  },
  msgRowUser: { flexDirection: "row-reverse" },
  msgRowBot: { flexDirection: "row" },

  avatar: {
    fontSize: "20px",
    flexShrink: 0,
    marginBottom: "2px",
  },

  // ── Bubble wrap (bubble + actions together) ──
  bubbleWrap: {
    display: "flex",
    flexDirection: "column",
    maxWidth: "72%",
  },

  // ── Bubbles ──
  bubble: {
    borderRadius: "16px",
    padding: "12px 16px",
    lineHeight: "1.6",
  },
  bubbleUser: {
    background: "#e8c97a",
    borderBottomRightRadius: "4px",
    alignSelf: "flex-end",
  },
  bubbleBot: {
    background: "#1e2433",
    border: "1px solid #2d3449",
    borderBottomLeftRadius: "4px",
  },

  // ── Text colors (FIXED) ──
  bubbleText: {
    fontSize: "14px",
    fontFamily: "'DM Sans', sans-serif",
    margin: 0,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  bubbleTextUser: {
    color: "#0f0d06", // dark text on gold background
  },
  bubbleTextBot: {
    color: "#e0d5bb", // cream/white — clearly readable on dark bg
  },

  // ── Streaming cursor ──
  cursor: {
    display: "inline-block",
    color: "#e8c97a",
    animation: "blink 1s step-end infinite",
    marginLeft: "1px",
  },

  // ── Thinking dots ──
  thinkingDots: {
    display: "flex",
    gap: "5px",
    alignItems: "center",
    padding: "4px 0",
  },
  dot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#4b5563",
    display: "inline-block",
    animation: "bounce 1.2s ease-in-out infinite",
  },
};
