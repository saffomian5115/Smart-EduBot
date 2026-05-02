import { useEffect, useRef } from "react";

export default function ChatWindow({ messages, isLoading, streamingText }) {
  const bottomRef = useRef();

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  return (
    <div style={styles.window}>
      {messages.length === 0 && !isLoading && (
        <div style={styles.emptyChat}>
          <p style={styles.emptyChatIcon}>💬</p>
          <p style={styles.emptyChatTitle}>Sawaal pucho apni book se</p>
          <p style={styles.emptyChatSub}>LLaMA 2 tumhare book ke content se jawab dega</p>
        </div>
      )}

      {messages.map((msg, i) => (
        <div
          key={i}
          style={{
            ...styles.msgRow,
            ...(msg.role === "user" ? styles.msgRowUser : styles.msgRowBot),
          }}
        >
          {msg.role === "assistant" && (
            <div style={styles.avatar}>🤖</div>
          )}

          <div
            style={{
              ...styles.bubble,
              ...(msg.role === "user" ? styles.bubbleUser : styles.bubbleBot),
            }}
          >
            <p style={styles.bubbleText}>{msg.content}</p>
          </div>

          {msg.role === "user" && (
            <div style={styles.avatar}>👤</div>
          )}
        </div>
      ))}

      {/* Streaming bubble — real-time typing */}
      {(isLoading || streamingText) && (
        <div style={{ ...styles.msgRow, ...styles.msgRowBot }}>
          <div style={styles.avatar}>🤖</div>
          <div style={{ ...styles.bubble, ...styles.bubbleBot }}>
            {streamingText ? (
              <p style={styles.bubbleText}>
                {streamingText}
                <span style={styles.cursor}>▋</span>
              </p>
            ) : (
              <div style={styles.thinkingDots}>
                <span style={{ ...styles.dot, animationDelay: "0ms"   }} />
                <span style={{ ...styles.dot, animationDelay: "180ms" }} />
                <span style={{ ...styles.dot, animationDelay: "360ms" }} />
              </div>
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
  emptyChatIcon:  { fontSize: "48px", marginBottom: "1rem" },
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
  msgRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: "10px",
    animation: "fadeUp 0.25s ease",
  },
  msgRowUser: { flexDirection: "row-reverse" },
  msgRowBot:  { flexDirection: "row" },
  avatar: {
    fontSize: "20px",
    flexShrink: 0,
    marginBottom: "2px",
  },
  bubble: {
    maxWidth: "72%",
    borderRadius: "16px",
    padding: "12px 16px",
    lineHeight: "1.6",
  },
  bubbleUser: {
    background: "#e8c97a",
    borderBottomRightRadius: "4px",
  },
  bubbleBot: {
    background: "#161922",
    border: "1px solid #252a38",
    borderBottomLeftRadius: "4px",
  },
  bubbleText: {
    fontSize: "14px",
    fontFamily: "'DM Sans', sans-serif",
    color: "#0f1117",
    margin: 0,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  cursor: {
    display: "inline-block",
    color: "#e8c97a",
    animation: "blink 1s step-end infinite",
    marginLeft: "1px",
  },
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
