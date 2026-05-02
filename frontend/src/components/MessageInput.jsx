import { useState, useRef, useEffect } from "react";

export default function MessageInput({ onSend, disabled }) {
  const [text, setText]   = useState("");
  const textareaRef       = useRef();

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [text]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  };

  const handleKeyDown = (e) => {
    // Enter = send, Shift+Enter = new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={{ ...styles.inputRow, ...(disabled ? styles.inputRowDisabled : {}) }}>
        <textarea
          ref={textareaRef}
          style={styles.textarea}
          placeholder={disabled ? "LLaMA soch raha hai..." : "Apna sawaal likho... (Enter = send)"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
        />
        <button
          style={{
            ...styles.sendBtn,
            ...((!text.trim() || disabled) ? styles.sendBtnDisabled : styles.sendBtnActive),
          }}
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          title="Send (Enter)"
        >
          ➤
        </button>
      </div>
      <p style={styles.hint}>Enter se bhejo · Shift+Enter se naya line</p>
    </div>
  );
}

const styles = {
  wrap: {
    padding: "1rem 1.5rem 1.5rem",
    borderTop: "1px solid #1e2333",
    background: "#0f1117",
    flexShrink: 0,
  },
  inputRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: "10px",
    background: "#161922",
    border: "1px solid #252a38",
    borderRadius: "14px",
    padding: "10px 10px 10px 16px",
    transition: "border-color 0.2s",
  },
  inputRowDisabled: {
    opacity: 0.5,
  },
  textarea: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    resize: "none",
    fontSize: "14px",
    fontFamily: "'DM Sans', sans-serif",
    color: "#e0d5bb",
    lineHeight: "1.6",
    minHeight: "24px",
    maxHeight: "160px",
    overflowY: "auto",
  },
  sendBtn: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    border: "none",
    fontSize: "15px",
    cursor: "pointer",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s",
  },
  sendBtnActive: {
    background: "#e8c97a",
    color: "#0f0d06",
  },
  sendBtnDisabled: {
    background: "#1e2333",
    color: "#374151",
    cursor: "not-allowed",
  },
  hint: {
    fontSize: "11px",
    color: "#374151",
    fontFamily: "'DM Sans', sans-serif",
    marginTop: "8px",
    textAlign: "center",
  },
};
