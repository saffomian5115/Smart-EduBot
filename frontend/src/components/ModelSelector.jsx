import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = "http://localhost:8000";

export default function ModelSelector({ selectedModel, onModelChange }) {
  const [open, setOpen]         = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [checking, setChecking] = useState(true);
  const dropdownRef             = useRef();

  // ── Check if Gemini key is saved ─────────────────────────────────
  useEffect(() => {
    axios.get(`${API}/settings/api-key`)
      .then((res) => setHasGeminiKey(res.data.has_key))
      .catch(() => setHasGeminiKey(false))
      .finally(() => setChecking(false));
  }, []);

  // ── Close dropdown on outside click ──────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const models = [
    {
      id:          "llama2",
      label:       "LLaMA 2",
      sublabel:    "Offline · Local",
      icon:        "🦙",
      available:   true,
      description: "Local model — internet nahi chahiye",
    },
    {
      id:          "gemini",
      label:       "Gemini",
      sublabel:    hasGeminiKey ? "Online · Ready" : "Online · Key Required",
      icon:        "✨",
      available:   hasGeminiKey,
      description: hasGeminiKey
        ? "Google Gemini — fast & accurate"
        : "Key Management se API key add karo",
    },
  ];

  const current = models.find((m) => m.id === selectedModel) || models[0];

  const handleSelect = (model) => {
    if (!model.available) return;
    onModelChange(model.id);
    setOpen(false);
  };

  if (checking) return null;

  return (
    <div ref={dropdownRef} style={styles.wrap}>
      {/* ── Trigger button ── */}
      <button
        style={{ ...styles.trigger, ...(open ? styles.triggerOpen : {}) }}
        onClick={() => setOpen((p) => !p)}
        title="Model select karo"
      >
        <span style={styles.triggerIcon}>{current.icon}</span>
        <span style={styles.triggerLabel}>{current.label}</span>
        <span style={styles.triggerSub}>{current.sublabel}</span>
        <span style={{ ...styles.chevron, ...(open ? styles.chevronUp : {}) }}>▾</span>
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div style={styles.dropdown}>
          <p style={styles.dropdownTitle}>Model chuno</p>
          {models.map((model) => {
            const isActive    = selectedModel === model.id;
            const isDisabled  = !model.available;
            return (
              <button
                key={model.id}
                style={{
                  ...styles.option,
                  ...(isActive   ? styles.optionActive   : {}),
                  ...(isDisabled ? styles.optionDisabled : {}),
                }}
                onClick={() => handleSelect(model)}
                disabled={isDisabled}
                title={isDisabled ? model.description : ""}
              >
                <span style={styles.optionIcon}>{model.icon}</span>
                <div style={styles.optionText}>
                  <p style={styles.optionLabel}>{model.label}</p>
                  <p style={styles.optionDesc}>{model.description}</p>
                </div>
                {isActive && <span style={styles.optionCheck}>✓</span>}
                {isDisabled && (
                  <span style={styles.optionLock}>🔑</span>
                )}
              </button>
            );
          })}

          {/* ── No key warning ── */}
          {!hasGeminiKey && (
            <div style={styles.keyWarning}>
              <span>⚠</span>
              <span>
                Gemini ke liye{" "}
                <a href="/keys" style={styles.keyLink}>Key Management</a>
                {" "}mein API key add karo
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: {
    position: "relative",
    userSelect: "none",
  },

  // ── Trigger ──
  trigger: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px 6px 10px",
    background: "#161922",
    border: "1px solid #252a38",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "border-color 0.2s, background 0.2s",
    whiteSpace: "nowrap",
  },
  triggerOpen: {
    borderColor: "#e8c97a",
    background: "#1a1810",
  },
  triggerIcon: {
    fontSize: "15px",
  },
  triggerLabel: {
    fontSize: "13px",
    color: "#e0d5bb",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: "500",
  },
  triggerSub: {
    fontSize: "10px",
    color: "#4b5563",
    fontFamily: "'DM Sans', sans-serif",
    borderLeft: "1px solid #252a38",
    paddingLeft: "6px",
    marginLeft: "2px",
  },
  chevron: {
    fontSize: "11px",
    color: "#4b5563",
    transition: "transform 0.2s",
    marginLeft: "2px",
  },
  chevronUp: {
    transform: "rotate(180deg)",
  },

  // ── Dropdown ──
  dropdown: {
    position: "absolute",
    top: "calc(100% + 6px)",
    right: 0,
    width: "240px",
    background: "#161922",
    border: "1px solid #252a38",
    borderRadius: "12px",
    padding: "10px",
    zIndex: 100,
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    animation: "fadeUp 0.15s ease",
  },
  dropdownTitle: {
    fontSize: "10px",
    color: "#4b5563",
    letterSpacing: "0.1em",
    fontFamily: "'DM Sans', sans-serif",
    textTransform: "uppercase",
    padding: "2px 4px 8px",
    borderBottom: "1px solid #1e2333",
    marginBottom: "6px",
  },

  // ── Option ──
  option: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px",
    borderRadius: "8px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    transition: "background 0.15s",
    marginBottom: "2px",
  },
  optionActive: {
    background: "#1a1810",
    border: "1px solid #4a3d10",
  },
  optionDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  optionIcon: {
    fontSize: "18px",
    flexShrink: 0,
  },
  optionText: {
    flex: 1,
    textAlign: "left",
  },
  optionLabel: {
    fontSize: "13px",
    color: "#e0d5bb",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: "500",
    margin: "0 0 2px",
  },
  optionDesc: {
    fontSize: "11px",
    color: "#4b5563",
    fontFamily: "'DM Sans', sans-serif",
    margin: 0,
  },
  optionCheck: {
    fontSize: "12px",
    color: "#e8c97a",
    flexShrink: 0,
  },
  optionLock: {
    fontSize: "12px",
    flexShrink: 0,
  },

  // ── Key warning ──
  keyWarning: {
    display: "flex",
    alignItems: "flex-start",
    gap: "6px",
    marginTop: "8px",
    padding: "8px 10px",
    background: "#2a1f0a",
    border: "1px solid #4a3510",
    borderRadius: "8px",
    fontSize: "11px",
    color: "#c4a03a",
    fontFamily: "'DM Sans', sans-serif",
    lineHeight: "1.5",
  },
  keyLink: {
    color: "#e8c97a",
    textDecoration: "underline",
    textDecorationColor: "#4a3d10",
  },
};
