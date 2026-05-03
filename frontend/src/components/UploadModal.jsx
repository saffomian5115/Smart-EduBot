import { useState, useRef, useCallback, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8000";

export default function UploadModal({ onClose, onUploadSuccess }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile]         = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus]     = useState("idle"); // idle | uploading | success | error
  const [message, setMessage]   = useState("");
  const inputRef                = useRef();

  // ── Close on Escape key ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── Prevent body scroll while modal open ─────────────────────────
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ── File validation ──────────────────────────────────────────────
  const validateFile = (f) => {
    if (!f) return "Koi file select nahi ki.";
    if (!f.name.endsWith(".pdf")) return "Sirf PDF files allowed hain.";
    if (f.size > 50 * 1024 * 1024) return "File 50MB se badi hai.";
    return null;
  };

  const handleFile = (f) => {
    const err = validateFile(f);
    if (err) { setMessage(err); setStatus("error"); return; }
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
    if (!file) { setMessage("Pehle ek PDF file select karo."); setStatus("error"); return; }

    const formData = new FormData();
    formData.append("file", file);

    setStatus("uploading");
    setProgress(0);
    setMessage("");

    try {
      const res = await axios.post(`${API}/upload-pdf`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });

      setStatus("success");
      setProgress(100);

      // After brief success flash, close & pass book up
      setTimeout(() => {
        onUploadSuccess(res.data);
        onClose();
      }, 1200);

    } catch (err) {
      setStatus("error");
      setMessage(err.response?.data?.detail || "Upload fail hui. Dobara try karo.");
    }
  };

  const reset = () => {
    setFile(null); setProgress(0);
    setStatus("idle"); setMessage("");
  };

  // ── Backdrop click closes modal ──────────────────────────────────
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div style={styles.backdrop} onClick={handleBackdropClick}>
      <div style={styles.modal}>

        {/* ── Header ── */}
        <div style={styles.modalHeader}>
          <div>
            <p style={styles.modalLabel}>LIBRARY</p>
            <h2 style={styles.modalTitle}>New Book Upload</h2>
          </div>
          <button style={styles.closeBtn} onClick={onClose} title="Band karo (Esc)">
            ✕
          </button>
        </div>

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
          onClick={() => !file && inputRef.current?.click()}
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
              <span style={styles.dropBadge}>Max 50MB · PDF only</span>
            </>
          ) : (
            <div style={styles.filePreview}>
              <div style={styles.fileIcon}>📕</div>
              <div style={styles.fileMeta}>
                <p style={styles.fileName}>{file.name}</p>
                <p style={styles.fileSize}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                style={styles.removeBtn}
                onClick={(e) => { e.stopPropagation(); reset(); }}
                disabled={status === "uploading"}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* ── Progress ── */}
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

        {/* ── Error ── */}
        {status === "error" && message && (
          <div style={styles.errorBox}>⚠ {message}</div>
        )}

        {/* ── Success ── */}
        {status === "success" && (
          <div style={styles.successBox}>✓ Upload complete! Book select ho rahi hai...</div>
        )}

        {/* ── Actions ── */}
        <div style={styles.actions}>
          {status !== "success" && (
            <button
              style={{
                ...styles.uploadBtn,
                ...(status === "uploading" || !file ? styles.uploadBtnDisabled : {}),
              }}
              onClick={handleUpload}
              disabled={status === "uploading" || !file}
            >
              {status === "uploading" ? "⏳ Processing..." : "Upload & Start Learning"}
            </button>
          )}
          <button
            style={styles.cancelBtn}
            onClick={onClose}
            disabled={status === "uploading"}
          >
            Cancel
          </button>
        </div>

        {/* ── Tips ── */}
        <div style={styles.tips}>
          <p style={styles.tipItem}>✦ Text-based PDFs best kaam karte hain</p>
          <p style={styles.tipItem}>✦ Scanned images se text extract nahi hota</p>
        </div>

      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
    padding: "1rem",
    animation: "fadeIn 0.2s ease",
  },
  modal: {
    width: "100%",
    maxWidth: "480px",
    background: "#161922",
    border: "1px solid #252a38",
    borderRadius: "20px",
    padding: "2rem",
    position: "relative",
    animation: "slideUp 0.25s ease",
    maxHeight: "90vh",
    overflowY: "auto",
  },

  // ── Header ──
  modalHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: "1.5rem",
  },
  modalLabel: {
    fontSize: "10px",
    color: "#4b5563",
    letterSpacing: "0.12em",
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: "4px",
  },
  modalTitle: {
    fontSize: "22px",
    color: "#f0e6c8",
    fontFamily: "'Crimson Pro', Georgia, serif",
    fontWeight: "700",
    margin: 0,
  },
  closeBtn: {
    background: "transparent",
    border: "1px solid #252a38",
    color: "#4b5563",
    borderRadius: "8px",
    width: "32px",
    height: "32px",
    cursor: "pointer",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "border-color 0.2s, color 0.2s",
  },

  // ── Drop zone ──
  dropzone: {
    border: "2px dashed #2d3449",
    borderRadius: "14px",
    padding: "2rem 1rem",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.2s ease",
    background: "#0f1117",
    marginBottom: "1rem",
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
    fontSize: "40px",
    marginBottom: "10px",
    display: "block",
  },
  dropText: {
    fontSize: "16px",
    color: "#c8bfa0",
    fontFamily: "'Crimson Pro', Georgia, serif",
    fontWeight: "600",
    margin: "0 0 4px",
  },
  dropSub: {
    fontSize: "12px",
    color: "#4b5563",
    fontFamily: "'DM Sans', sans-serif",
    margin: "0 0 12px",
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
    gap: "12px",
    padding: "0 4px",
  },
  fileIcon: { fontSize: "32px" },
  fileMeta: { flex: 1, textAlign: "left" },
  fileName: {
    fontSize: "14px",
    color: "#e0d5bb",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: "500",
    margin: "0 0 3px",
    wordBreak: "break-all",
  },
  fileSize: {
    fontSize: "11px",
    color: "#4b5563",
    fontFamily: "'DM Sans', sans-serif",
    margin: 0,
  },
  removeBtn: {
    background: "transparent",
    border: "1px solid #3d2a2a",
    color: "#cf7e7e",
    borderRadius: "7px",
    width: "28px",
    height: "28px",
    cursor: "pointer",
    fontSize: "12px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Progress ──
  progressWrap: { marginBottom: "1rem" },
  progressTrack: {
    height: "5px",
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
    fontSize: "11px",
    color: "#6b7280",
    marginTop: "6px",
    fontFamily: "'DM Sans', sans-serif",
    textAlign: "center",
  },

  // ── Status boxes ──
  errorBox: {
    marginBottom: "1rem",
    background: "#2e1a1a",
    border: "1px solid #5a2d2d",
    color: "#cf7e7e",
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "12px",
    fontFamily: "'DM Sans', sans-serif",
  },
  successBox: {
    marginBottom: "1rem",
    background: "#1a2e1a",
    border: "1px solid #2d5a2d",
    color: "#7ecf7e",
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "12px",
    fontFamily: "'DM Sans', sans-serif",
  },

  // ── Actions ──
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "1rem",
  },
  uploadBtn: {
    width: "100%",
    padding: "13px",
    background: "#e8c97a",
    color: "#0f0d06",
    border: "none",
    borderRadius: "11px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    transition: "opacity 0.2s",
  },
  uploadBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  cancelBtn: {
    width: "100%",
    padding: "11px",
    background: "transparent",
    color: "#4b5563",
    border: "1px solid #252a38",
    borderRadius: "11px",
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },

  // ── Tips ──
  tips: {
    borderTop: "1px solid #1e2333",
    paddingTop: "1rem",
  },
  tipItem: {
    fontSize: "12px",
    color: "#374151",
    fontFamily: "'DM Sans', sans-serif",
    margin: "0 0 4px",
    lineHeight: "1.5",
  },
};
