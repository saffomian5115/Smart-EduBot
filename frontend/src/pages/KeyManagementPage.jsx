import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://localhost:8000";

export default function KeyManagementPage() {
  const navigate = useNavigate();

  // ── State ─────────────────────────────────────────────────────────
  const [maskedKey, setMaskedKey]     = useState("");
  const [hasKey, setHasKey]           = useState(false);
  const [inputKey, setInputKey]       = useState("");
  const [showInput, setShowInput]     = useState(false);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast]             = useState(null);
  const [inputVisible, setInputVisible] = useState(false);

  // ── Toast helper ──────────────────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Fetch current key status ──────────────────────────────────────
  const fetchKeyStatus = async () => {
    try {
      const res = await axios.get(`${API}/settings/api-key`);
      setHasKey(res.data.has_key);
      setMaskedKey(res.data.masked_key || "");
    } catch {
      showToast("Key status load nahi ho saka.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKeyStatus(); }, []);

  // ── Save key ──────────────────────────────────────────────────────
  const handleSave = async () => {
    const trimmed = inputKey.trim();
    if (!trimmed) {
      showToast("API key empty nahi ho sakti.", "error");
      return;
    }
    if (!trimmed.startsWith("AIza")) {
      showToast("Valid Gemini key 'AIza' se shuru hoti hai.", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await axios.post(`${API}/settings/api-key`, { key: trimmed });
      setHasKey(true);
      setMaskedKey(res.data.masked_key);
      setInputKey("");
      setShowInput(false);
      showToast("✓ API key save aur validate ho gayi!", "success");
    } catch (err) {
      const detail = err.response?.data?.detail || "Key save nahi ho saki.";
      showToast(`✕ ${detail}`, "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete key ────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`${API}/settings/api-key`);
      setHasKey(false);
      setMaskedKey("");
      setConfirmDelete(false);
      setShowInput(false);
      showToast("API key delete ho gayi.", "success");
    } catch {
      showToast("Key delete nahi ho saki.", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={styles.page}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          ...styles.toast,
          ...(toast.type === "error" ? styles.toastError : styles.toastSuccess),
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── Back button ── */}
      <button style={styles.backBtn} onClick={() => navigate("/chat")}>
        ← Chat pe wapas jao
      </button>

      {/* ── Main card ── */}
      <div style={styles.container}>

        {/* ── Page header ── */}
        <div style={styles.pageHeader}>
          <div style={styles.headerIcon}>🔑</div>
          <div>
            <p style={styles.pageLabel}>SETTINGS</p>
            <h1 style={styles.pageTitle}>Key Management</h1>
            <p style={styles.pageSubtitle}>
              Gemini API key manage karo online model use karne ke liye
            </p>
          </div>
        </div>

        <div style={styles.divider} />

        {/* ── Current key status ── */}
        <div style={styles.section}>
          <p style={styles.sectionLabel}>GEMINI API KEY</p>

          {loading ? (
            <div style={styles.statusCard}>
              <p style={styles.statusText}>Loading...</p>
            </div>
          ) : hasKey ? (
            <div style={{ ...styles.statusCard, ...styles.statusCardActive }}>
              <div style={styles.statusRow}>
                <div>
                  <p style={styles.statusTitle}>
                    <span style={styles.statusDotGreen}>●</span> Key Saved
                  </p>
                  <p style={styles.maskedKey}>{maskedKey}</p>
                </div>
                <div style={styles.statusActions}>
                  <button
                    style={styles.replaceBtn}
                    onClick={() => { setShowInput(!showInput); setConfirmDelete(false); }}
                  >
                    {showInput ? "Cancel" : "Replace"}
                  </button>
                  {!confirmDelete ? (
                    <button
                      style={styles.deleteBtn}
                      onClick={() => { setConfirmDelete(true); setShowInput(false); }}
                    >
                      Delete
                    </button>
                  ) : (
                    <div style={styles.confirmRow}>
                      <span style={styles.confirmText}>Sure?</span>
                      <button
                        style={styles.confirmYes}
                        onClick={handleDelete}
                        disabled={deleting}
                      >
                        {deleting ? "..." : "Yes, delete"}
                      </button>
                      <button
                        style={styles.confirmNo}
                        onClick={() => setConfirmDelete(false)}
                      >
                        No
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.statusCard}>
              <p style={styles.statusTitle}>
                <span style={styles.statusDotRed}>●</span> No Key Saved
              </p>
              <p style={styles.statusSubtext}>
                Gemini model use karne ke liye API key add karo
              </p>
            </div>
          )}
        </div>

        {/* ── Input section (add / replace) ── */}
        {(!hasKey || showInput) && (
          <div style={styles.section}>
            <p style={styles.sectionLabel}>{hasKey ? "REPLACE KEY" : "ADD KEY"}</p>
            <div style={styles.inputGroup}>
              <div style={styles.inputWrap}>
                <input
                  type={inputVisible ? "text" : "password"}
                  style={styles.keyInput}
                  placeholder="AIzaSy..."
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  spellCheck={false}
                  autoComplete="off"
                />
                <button
                  style={styles.toggleVisBtn}
                  onClick={() => setInputVisible((p) => !p)}
                  title={inputVisible ? "Key chupao" : "Key dikhao"}
                >
                  {inputVisible ? "🙈" : "👁"}
                </button>
              </div>
              <button
                style={{
                  ...styles.saveBtn,
                  ...(saving ? styles.saveBtnDisabled : {}),
                }}
                onClick={handleSave}
                disabled={saving || !inputKey.trim()}
              >
                {saving ? "Validating..." : "Save & Validate"}
              </button>
            </div>
            <p style={styles.inputHint}>
              Key save hone se pehle Gemini API pe validate hogi
            </p>
          </div>
        )}

        <div style={styles.divider} />

        {/* ── How to get key ── */}
        <div style={styles.section}>
          <p style={styles.sectionLabel}>API KEY KAISE MILEGI?</p>

          <div style={styles.stepsGrid}>
            {[
              {
                num: "1",
                title: "Google AI Studio kholein",
                desc: "aistudio.google.com pe jao",
                link: "https://aistudio.google.com",
                linkLabel: "aistudio.google.com →",
              },
              {
                num: "2",
                title: "Account banao ya login karo",
                desc: "Google account se sign in karo",
              },
              {
                num: "3",
                title: "API Key generate karo",
                desc: '"Get API Key" button pe click karo',
              },
              {
                num: "4",
                title: "Key yahan paste karo",
                desc: "Copy karke upar input mein daalo",
              },
            ].map((step) => (
              <div key={step.num} style={styles.stepCard}>
                <div style={styles.stepNum}>{step.num}</div>
                <div style={styles.stepContent}>
                  <p style={styles.stepTitle}>{step.title}</p>
                  <p style={styles.stepDesc}>{step.desc}</p>
                  {step.link && (
                    <a
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.stepLink}
                    >
                      {step.linkLabel}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.divider} />

        {/* ── Info note ── */}
        <div style={styles.infoNote}>
          <span style={styles.infoIcon}>ℹ</span>
          <p style={styles.infoText}>
            API key sirf aapke local machine pe save hoti hai — backend ki{" "}
            <code style={styles.infoCode}>storage/settings.json</code> file mein.
            Kisi server ya cloud pe nahi jaati.
          </p>
        </div>

      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0f1117",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "1.5rem 1rem 4rem",
    position: "relative",
    fontFamily: "'DM Sans', sans-serif",
  },

  // ── Toast ──
  toast: {
    position: "fixed",
    top: "1.5rem",
    right: "1.5rem",
    padding: "12px 20px",
    borderRadius: "10px",
    fontSize: "14px",
    fontFamily: "'DM Sans', sans-serif",
    zIndex: 999,
    maxWidth: "360px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    animation: "slideIn 0.3s ease",
  },
  toastSuccess: {
    background: "#1a2e1a",
    color: "#7ecf7e",
    border: "1px solid #2d5a2d",
  },
  toastError: {
    background: "#2e1a1a",
    color: "#cf7e7e",
    border: "1px solid #5a2d2d",
  },

  // ── Back button ──
  backBtn: {
    alignSelf: "flex-start",
    background: "transparent",
    border: "none",
    color: "#4b5563",
    fontSize: "13px",
    cursor: "pointer",
    padding: "4px 0",
    marginBottom: "1.5rem",
    fontFamily: "'DM Sans', sans-serif",
    transition: "color 0.2s",
  },

  // ── Container ──
  container: {
    width: "100%",
    maxWidth: "580px",
  },

  // ── Page header ──
  pageHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "1.5rem",
  },
  headerIcon: {
    fontSize: "36px",
    marginTop: "4px",
  },
  pageLabel: {
    fontSize: "10px",
    color: "#4b5563",
    letterSpacing: "0.12em",
    marginBottom: "4px",
  },
  pageTitle: {
    fontSize: "28px",
    color: "#f0e6c8",
    fontFamily: "'Crimson Pro', Georgia, serif",
    fontWeight: "700",
    margin: "0 0 6px",
    letterSpacing: "-0.01em",
  },
  pageSubtitle: {
    fontSize: "14px",
    color: "#6b7280",
    margin: 0,
    lineHeight: "1.5",
  },

  divider: {
    height: "1px",
    background: "#1e2333",
    margin: "1.5rem 0",
  },

  // ── Section ──
  section: {
    marginBottom: "0.5rem",
  },
  sectionLabel: {
    fontSize: "10px",
    color: "#4b5563",
    letterSpacing: "0.12em",
    marginBottom: "12px",
  },

  // ── Status card ──
  statusCard: {
    background: "#161922",
    border: "1px solid #252a38",
    borderRadius: "14px",
    padding: "16px 18px",
  },
  statusCardActive: {
    border: "1px solid #2d3a2d",
    background: "#131a13",
  },
  statusRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
  },
  statusTitle: {
    fontSize: "14px",
    color: "#e0d5bb",
    fontWeight: "500",
    margin: "0 0 6px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  statusDotGreen: {
    color: "#4a7c4a",
    fontSize: "10px",
  },
  statusDotRed: {
    color: "#7c4a4a",
    fontSize: "10px",
  },
  statusText: {
    fontSize: "13px",
    color: "#4b5563",
    margin: 0,
  },
  statusSubtext: {
    fontSize: "12px",
    color: "#4b5563",
    margin: "4px 0 0",
  },
  maskedKey: {
    fontSize: "13px",
    color: "#6b7280",
    fontFamily: "monospace",
    margin: 0,
    letterSpacing: "0.05em",
  },
  statusActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  replaceBtn: {
    padding: "5px 14px",
    background: "transparent",
    border: "1px solid #252a38",
    color: "#9ca3af",
    borderRadius: "8px",
    fontSize: "12px",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  deleteBtn: {
    padding: "5px 14px",
    background: "transparent",
    border: "1px solid #5a2d2d",
    color: "#cf7e7e",
    borderRadius: "8px",
    fontSize: "12px",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  confirmRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  confirmText: {
    fontSize: "12px",
    color: "#cf7e7e",
  },
  confirmYes: {
    padding: "4px 12px",
    background: "#2e1a1a",
    border: "1px solid #5a2d2d",
    color: "#cf7e7e",
    borderRadius: "7px",
    fontSize: "12px",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  confirmNo: {
    padding: "4px 12px",
    background: "transparent",
    border: "1px solid #252a38",
    color: "#4b5563",
    borderRadius: "7px",
    fontSize: "12px",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },

  // ── Input group ──
  inputGroup: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  inputWrap: {
    flex: 1,
    minWidth: "200px",
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  keyInput: {
    flex: 1,
    padding: "11px 40px 11px 14px",
    background: "#161922",
    border: "1px solid #252a38",
    borderRadius: "10px",
    color: "#e0d5bb",
    fontSize: "13px",
    fontFamily: "monospace",
    outline: "none",
    letterSpacing: "0.05em",
    width: "100%",
    transition: "border-color 0.2s",
  },
  toggleVisBtn: {
    position: "absolute",
    right: "10px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    padding: "4px",
  },
  saveBtn: {
    padding: "11px 20px",
    background: "#e8c97a",
    color: "#0f0d06",
    border: "none",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: "nowrap",
    transition: "opacity 0.2s",
  },
  saveBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  inputHint: {
    fontSize: "11px",
    color: "#374151",
    marginTop: "8px",
  },

  // ── Steps ──
  stepsGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  stepCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "14px 16px",
    background: "#161922",
    border: "1px solid #1e2333",
    borderRadius: "12px",
  },
  stepNum: {
    width: "26px",
    height: "26px",
    borderRadius: "50%",
    background: "#1e2333",
    border: "1px solid #2d3449",
    color: "#e8c97a",
    fontSize: "12px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontFamily: "'DM Sans', sans-serif",
  },
  stepContent: { flex: 1 },
  stepTitle: {
    fontSize: "13px",
    color: "#c8bfa0",
    fontWeight: "500",
    margin: "0 0 3px",
  },
  stepDesc: {
    fontSize: "12px",
    color: "#4b5563",
    margin: 0,
    lineHeight: "1.4",
  },
  stepLink: {
    display: "inline-block",
    marginTop: "6px",
    fontSize: "12px",
    color: "#e8c97a",
    textDecoration: "none",
    fontFamily: "monospace",
  },

  // ── Info note ──
  infoNote: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    padding: "14px 16px",
    background: "#0f1310",
    border: "1px solid #1e3020",
    borderRadius: "12px",
  },
  infoIcon: {
    fontSize: "14px",
    color: "#4a7c4a",
    flexShrink: 0,
    marginTop: "1px",
  },
  infoText: {
    fontSize: "12px",
    color: "#4b5563",
    margin: 0,
    lineHeight: "1.6",
  },
  infoCode: {
    background: "#1e2333",
    color: "#9ca3af",
    padding: "1px 5px",
    borderRadius: "4px",
    fontFamily: "monospace",
    fontSize: "11px",
  },
};
