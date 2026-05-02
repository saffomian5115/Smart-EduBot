import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://localhost:8000";

export default function UploadPage() {
  const [dragging, setDragging]   = useState(false);
  const [file, setFile]           = useState(null);
  const [progress, setProgress]   = useState(0);
  const [status, setStatus]       = useState("idle"); // idle | uploading | success | error
  const [message, setMessage]     = useState("");
  const [toast, setToast]         = useState(null);
  const inputRef  = useRef();
  const navigate  = useNavigate();

  // ── Toast helper ────────────────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── File validation ──────────────────────────────────────────────
  const validateFile = (f) => {
    if (!f) return "Koi file select nahi ki.";
    if (!f.name.endsWith(".pdf")) return "Sirf PDF files allowed hain.";
    if (f.size > 50 * 1024 * 1024) return "File 50MB se badi hai.";
    return null;
  };

  // ── Pick file ───────────────────────────────────────────────────
  const handleFile = (f) => {
    const err = validateFile(f);
    if (err) { showToast(err, "error"); return; }
    setFile(f);
    setStatus("idle");
    setProgress(0);
    setMessage("");
  };

  // ── Drag events ─────────────────────────────────────────────────
  const onDragOver  = useCallback((e) => { e.preventDefault(); setDragging(true);  }, []);
  const onDragLeave = useCallback((e) => { e.preventDefault(); setDragging(false); }, []);
  const onDrop      = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  // ── Upload ───────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) { showToast("Pehle ek PDF file select karo.", "error"); return; }

    const formData = new FormData();
    formData.append("file", file);

    setStatus("uploading");
    setProgress(0);
    setMessage("");

    try {
      const res = await axios.post(`${API}/upload-pdf`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded / e.total) * 100);
          setProgress(pct);
        },
      });

      setStatus("success");
      setProgress(100);
      showToast(`"${res.data.title}" successfully upload ho gayi! ${res.data.chunk_count} chunks bane.`, "success");

      setTimeout(() => {
        navigate("/chat", { state: { book: res.data } });
      }, 1800);

    } catch (err) {
      setStatus("error");
      const detail = err.response?.data?.detail || "Upload fail hui. Dobara try karo.";
      setMessage(detail);
      showToast(detail, "error");
    }
  };

  // ── Reset ────────────────────────────────────────────────────────
  const reset = () => {
    setFile(null); setProgress(0);
    setStatus("idle"); setMessage("");
  };

  return (
    <div style={styles.page}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ ...styles.toast, ...(toast.type === "error" ? styles.toastError : styles.toastSuccess) }}>
          <span>{toast.type === "error" ? "✕" : "✓"}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── Header ── */}
      <header style={styles.header}>
        <div style={styles.logo}>📖 EduBot</div>
        <p style={styles.tagline}>Your AI-powered study companion</p>
      </header>

      {/* ── Main Card ── */}
      <main style={styles.main}>
        <div style={styles.card}>
          <h1 style={styles.title}>Upload Your Book</h1>
          <p style={styles.subtitle}>
            Apni PDF upload karo aur usse seedha sawaal pucho
          </p>

          {/* ── Drop Zone ── */}
          <div
            style={{
              ...styles.dropzone,
              ...(dragging ? styles.dropzoneDrag : {}),
              ...(file     ? styles.dropzoneHasFile : {}),
            }}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => !file && inputRef.current.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files[0])}
            />

            {!file ? (
              <>
                <div style={styles.dropIcon}>📄</div>
                <p style={styles.dropText}>Yahan PDF drag karo</p>
                <p style={styles.dropSub}>ya click karke select karo</p>
                <span style={styles.dropBadge}>Max 50MB</span>
              </>
            ) : (
              <div style={styles.filePreview}>
                <div style={styles.fileIcon}>📕</div>
                <div style={styles.fileMeta}>
                  <p style={styles.fileName}>{file.name}</p>
                  <p style={styles.fileSize}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button style={styles.removeBtn} onClick={(e) => { e.stopPropagation(); reset(); }}>
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* ── Progress Bar ── */}
          {status === "uploading" && (
            <div style={styles.progressWrap}>
              <div style={styles.progressTrack}>
                <div style={{ ...styles.progressFill, width: `${progress}%` }} />
              </div>
              <p style={styles.progressLabel}>
                {progress < 100 ? `Uploading... ${progress}%` : "Processing & indexing..."}
              </p>
            </div>
          )}

          {/* ── Error message ── */}
          {status === "error" && message && (
            <div style={styles.errorBox}>⚠ {message}</div>
          )}

          {/* ── Success ── */}
          {status === "success" && (
            <div style={styles.successBox}>✓ Upload complete! Chat pe ja raha hun...</div>
          )}

          {/* ── Buttons ── */}
          <div style={styles.actions}>
            {status !== "success" && (
              <button
                style={{
                  ...styles.uploadBtn,
                  ...(status === "uploading" ? styles.uploadBtnDisabled : {}),
                }}
                onClick={handleUpload}
                disabled={status === "uploading"}
              >
                {status === "uploading" ? "⏳ Processing..." : "Upload & Start Learning"}
              </button>
            )}

            {file && status !== "uploading" && status !== "success" && (
              <button style={styles.ghostBtn} onClick={reset}>
                Cancel
              </button>
            )}
          </div>

          {/* ── Tips ── */}
          <div style={styles.tips}>
            <p style={styles.tipsTitle}>Tips</p>
            <p style={styles.tipItem}>✦ Text-based PDFs best kaam karte hain</p>
            <p style={styles.tipItem}>✦ Scanned images se text extract nahi hota</p>
            <p style={styles.tipItem}>✦ Large files mein thoda waqt lagta hai</p>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "100vh",
    background: "#0f1117",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontFamily: "'Crimson Pro', Georgia, serif",
    padding: "0 1rem 4rem",
    position: "relative",
  },
  toast: {
    position: "fixed",
    top: "1.5rem",
    right: "1.5rem",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 20px",
    borderRadius: "10px",
    fontSize: "14px",
    fontFamily: "'DM Sans', sans-serif",
    zIndex: 999,
    maxWidth: "380px",
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
  header: {
    textAlign: "center",
    padding: "3rem 0 1rem",
  },
  logo: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#e8c97a",
    letterSpacing: "0.02em",
    fontFamily: "'Crimson Pro', Georgia, serif",
  },
  tagline: {
    fontSize: "14px",
    color: "#6b7280",
    marginTop: "4px",
    fontFamily: "'DM Sans', sans-serif",
  },
  main: {
    width: "100%",
    maxWidth: "520px",
    marginTop: "2rem",
  },
  card: {
    background: "#161922",
    border: "1px solid #252a38",
    borderRadius: "20px",
    padding: "2.5rem 2rem",
  },
  title: {
    fontSize: "26px",
    fontWeight: "700",
    color: "#f0e6c8",
    margin: "0 0 8px",
    letterSpacing: "-0.01em",
  },
  subtitle: {
    fontSize: "15px",
    color: "#6b7280",
    margin: "0 0 2rem",
    fontFamily: "'DM Sans', sans-serif",
    lineHeight: "1.5",
  },
  dropzone: {
    border: "2px dashed #2d3449",
    borderRadius: "14px",
    padding: "2.5rem 1rem",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.2s ease",
    background: "#0f1117",
  },
  dropzoneDrag: {
    border: "2px dashed #e8c97a",
    background: "#1a1810",
    transform: "scale(1.01)",
  },
  dropzoneHasFile: {
    border: "2px solid #2d5a2d",
    background: "#0f1a0f",
    cursor: "default",
  },
  dropIcon: {
    fontSize: "48px",
    marginBottom: "12px",
    display: "block",
  },
  dropText: {
    fontSize: "17px",
    color: "#c8bfa0",
    margin: "0 0 4px",
    fontWeight: "600",
  },
  dropSub: {
    fontSize: "13px",
    color: "#4b5563",
    margin: "0 0 16px",
    fontFamily: "'DM Sans', sans-serif",
  },
  dropBadge: {
    fontSize: "11px",
    color: "#e8c97a",
    background: "#2a2510",
    border: "1px solid #4a3d10",
    borderRadius: "20px",
    padding: "3px 12px",
    fontFamily: "'DM Sans', sans-serif",
  },
  filePreview: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "0 8px",
  },
  fileIcon: { fontSize: "36px" },
  fileMeta: { flex: 1, textAlign: "left" },
  fileName: {
    fontSize: "15px",
    color: "#e0d5bb",
    margin: "0 0 4px",
    fontWeight: "600",
    wordBreak: "break-all",
  },
  fileSize: {
    fontSize: "12px",
    color: "#4b5563",
    margin: 0,
    fontFamily: "'DM Sans', sans-serif",
  },
  removeBtn: {
    background: "transparent",
    border: "1px solid #3d2a2a",
    color: "#cf7e7e",
    borderRadius: "8px",
    width: "32px",
    height: "32px",
    cursor: "pointer",
    fontSize: "13px",
    flexShrink: 0,
  },
  progressWrap: { marginTop: "1.5rem" },
  progressTrack: {
    height: "6px",
    background: "#252a38",
    borderRadius: "100px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #e8c97a, #c4a03a)",
    borderRadius: "100px",
    transition: "width 0.3s ease",
  },
  progressLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginTop: "8px",
    fontFamily: "'DM Sans', sans-serif",
    textAlign: "center",
  },
  errorBox: {
    marginTop: "1.2rem",
    background: "#2e1a1a",
    border: "1px solid #5a2d2d",
    color: "#cf7e7e",
    borderRadius: "10px",
    padding: "12px 16px",
    fontSize: "13px",
    fontFamily: "'DM Sans', sans-serif",
  },
  successBox: {
    marginTop: "1.2rem",
    background: "#1a2e1a",
    border: "1px solid #2d5a2d",
    color: "#7ecf7e",
    borderRadius: "10px",
    padding: "12px 16px",
    fontSize: "13px",
    fontFamily: "'DM Sans', sans-serif",
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "1.5rem",
  },
  uploadBtn: {
    width: "100%",
    padding: "14px",
    background: "#e8c97a",
    color: "#0f0d06",
    border: "none",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: "0.01em",
    transition: "opacity 0.2s",
  },
  uploadBtnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  ghostBtn: {
    width: "100%",
    padding: "12px",
    background: "transparent",
    color: "#4b5563",
    border: "1px solid #252a38",
    borderRadius: "12px",
    fontSize: "14px",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  tips: {
    marginTop: "2rem",
    borderTop: "1px solid #1e2333",
    paddingTop: "1.2rem",
  },
  tipsTitle: {
    fontSize: "11px",
    color: "#4b5563",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: "10px",
  },
  tipItem: {
    fontSize: "13px",
    color: "#4b5563",
    margin: "0 0 6px",
    fontFamily: "'DM Sans', sans-serif",
    lineHeight: "1.5",
  },
};
