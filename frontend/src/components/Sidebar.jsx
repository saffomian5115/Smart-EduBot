import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8000";

export default function Sidebar({ selectedBook, onSelectBook, onBookDeleted }) {
  const [books, setBooks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [confirmId, setConfirmId]   = useState(null);
  const [deleting, setDeleting]     = useState(null);
  const [collapsed, setCollapsed]   = useState(false);
  const [reindexing, setReindexing] = useState(null);
  const [toast, setToast]           = useState(null);

  // ── Toast helper ─────────────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch books ────────────────────────────────────────────────
  const fetchBooks = async () => {
    try {
      const res = await axios.get(`${API}/books`);
      setBooks(res.data);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBooks(); }, []);

  // ── Delete book ────────────────────────────────────────────────
  const handleDelete = async (bookId) => {
    setDeleting(bookId);
    try {
      await axios.delete(`${API}/books/${bookId}`);
      setBooks((prev) => prev.filter((b) => b.book_id !== bookId));
      if (selectedBook?.book_id === bookId) onBookDeleted();
    } catch {
      // silent fail
    } finally {
      setDeleting(null);
      setConfirmId(null);
    }
  };

  // ── Reindex book ───────────────────────────────────────────────
  const handleReindex = async (e, bookId) => {
    e.stopPropagation();
    setReindexing(bookId);
    try {
      const res = await axios.post(`${API}/index/${bookId}`);
      // Update indexed status locally
      setBooks((prev) =>
        prev.map((b) =>
          b.book_id === bookId ? { ...b, indexed: true } : b
        )
      );
      showToast(`✓ ${res.data.chunks_stored} chunks index ho gaye!`, "success");
    } catch (err) {
      const detail = err.response?.data?.detail || "Reindex fail hua. Dobara try karo.";
      showToast(`✕ ${detail}`, "error");
    } finally {
      setReindexing(null);
    }
  };

  if (collapsed) {
    return (
      <aside style={styles.sidebarCollapsed}>
        <button style={styles.collapseBtn} onClick={() => setCollapsed(false)} title="Sidebar kholein">
          ▶
        </button>
        <div style={styles.collapsedBooks}>
          {books.map((b) => (
            <button
              key={b.book_id}
              style={{
                ...styles.collapsedDot,
                ...(selectedBook?.book_id === b.book_id ? styles.collapsedDotActive : {}),
              }}
              onClick={() => { onSelectBook(b); setCollapsed(false); }}
              title={b.title}
            />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside style={styles.sidebar}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          ...styles.toast,
          ...(toast.type === "error" ? styles.toastError : styles.toastSuccess),
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div style={styles.sidebarHeader}>
        <div>
          <p style={styles.sidebarLabel}>MY LIBRARY</p>
          <p style={styles.bookCount}>{books.length} book{books.length !== 1 ? "s" : ""}</p>
        </div>
        <button style={styles.collapseBtn} onClick={() => setCollapsed(true)} title="Sidebar band karein">
          ◀
        </button>
      </div>

      {/* ── Upload button ── */}
      <a href="/" style={styles.uploadLink}>
        <span>+</span> New Book Upload
      </a>

      {/* ── Book list ── */}
      <div style={styles.bookList}>
        {loading && (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>Loading...</p>
          </div>
        )}

        {!loading && books.length === 0 && (
          <div style={styles.emptyState}>
            <p style={styles.emptyIcon}>📚</p>
            <p style={styles.emptyText}>Koi book upload nahi ki abhi</p>
            <p style={styles.emptySub}>Upar se PDF upload karo</p>
          </div>
        )}

        {!loading && books.map((book) => {
          const isActive    = selectedBook?.book_id === book.book_id;
          const isConfirm   = confirmId === book.book_id;
          const isDeleting  = deleting === book.book_id;
          const isReindexing = reindexing === book.book_id;

          return (
            <div
              key={book.book_id}
              style={{
                ...styles.bookItem,
                ...(isActive ? styles.bookItemActive : {}),
              }}
            >
              {/* ── Book row ── */}
              <button
                style={styles.bookBtn}
                onClick={() => !isConfirm && onSelectBook(book)}
              >
                <span style={styles.bookEmoji}>
                  {isActive ? "📖" : "📕"}
                </span>
                <div style={styles.bookInfo}>
                  <p style={{
                    ...styles.bookTitle,
                    ...(isActive ? styles.bookTitleActive : {}),
                  }}>
                    {book.title.length > 28 ? book.title.slice(0, 28) + "…" : book.title}
                  </p>
                  <p style={styles.bookMeta}>
                    {book.pages} pages · {book.chunk_count} chunks
                    {book.indexed
                      ? <span style={styles.indexedDot}> ✓ indexed</span>
                      : <span style={styles.pendingDot}> ✕ not indexed</span>}
                  </p>
                </div>
              </button>

              {/* ── Reindex btn — sirf tab dikhao jab indexed nahi ── */}
              {!book.indexed && !isConfirm && (
                <button
                  style={{
                    ...styles.reindexBtn,
                    ...(isReindexing ? styles.reindexBtnLoading : {}),
                  }}
                  onClick={(e) => handleReindex(e, book.book_id)}
                  disabled={isReindexing}
                  title="Index karo taake sawaal pooch sako"
                >
                  {isReindexing ? (
                    <span style={styles.reindexSpinner}>⟳</span>
                  ) : (
                    "⟳ Index"
                  )}
                </button>
              )}

              {/* ── Delete / Confirm ── */}
              {!isConfirm ? (
                <button
                  style={styles.deleteBtn}
                  onClick={(e) => { e.stopPropagation(); setConfirmId(book.book_id); }}
                  title="Delete"
                >
                  🗑
                </button>
              ) : (
                <div style={styles.confirmRow}>
                  <span style={styles.confirmText}>Delete?</span>
                  <button
                    style={styles.confirmYes}
                    onClick={() => handleDelete(book.book_id)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "..." : "Yes"}
                  </button>
                  <button
                    style={styles.confirmNo}
                    onClick={() => setConfirmId(null)}
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div style={styles.sidebarFooter}>
        <p style={styles.footerText}>📖 EduBot</p>
      </div>
    </aside>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const styles = {
  sidebar: {
    width: "270px",
    minWidth: "270px",
    height: "100vh",
    background: "#0d1016",
    borderRight: "1px solid #1e2333",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    overflowY: "auto",
    position: "relative",
  },
  sidebarCollapsed: {
    width: "52px",
    minWidth: "52px",
    height: "100vh",
    background: "#0d1016",
    borderRight: "1px solid #1e2333",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "1rem 0",
    gap: "10px",
    flexShrink: 0,
  },
  toast: {
    position: "absolute",
    bottom: "72px",
    left: "10px",
    right: "10px",
    padding: "10px 14px",
    borderRadius: "10px",
    fontSize: "12px",
    fontFamily: "'DM Sans', sans-serif",
    zIndex: 10,
    animation: "slideIn 0.3s ease",
    lineHeight: "1.4",
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
  collapsedDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#2d3449",
    border: "none",
    cursor: "pointer",
    padding: 0,
    transition: "background 0.2s",
  },
  collapsedDotActive: {
    background: "#e8c97a",
  },
  collapsedBooks: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    marginTop: "8px",
  },
  sidebarHeader: {
    padding: "1.5rem 1.2rem 0.8rem",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  sidebarLabel: {
    fontSize: "10px",
    color: "#4b5563",
    letterSpacing: "0.12em",
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: "2px",
  },
  bookCount: {
    fontSize: "18px",
    color: "#c8bfa0",
    fontFamily: "'Crimson Pro', Georgia, serif",
    fontWeight: "600",
  },
  collapseBtn: {
    background: "transparent",
    border: "1px solid #1e2333",
    color: "#4b5563",
    borderRadius: "8px",
    width: "30px",
    height: "30px",
    cursor: "pointer",
    fontSize: "11px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  uploadLink: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    margin: "0.5rem 1rem 1rem",
    padding: "10px 14px",
    background: "#1a1810",
    border: "1px dashed #4a3d10",
    borderRadius: "10px",
    color: "#e8c97a",
    fontSize: "13px",
    fontFamily: "'DM Sans', sans-serif",
    textDecoration: "none",
    transition: "background 0.2s",
    fontWeight: "500",
  },
  bookList: {
    flex: 1,
    overflowY: "auto",
    padding: "0 0.6rem",
  },
  emptyState: {
    textAlign: "center",
    padding: "3rem 1rem",
  },
  emptyIcon: {
    fontSize: "36px",
    marginBottom: "10px",
  },
  emptyText: {
    fontSize: "13px",
    color: "#4b5563",
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: "4px",
  },
  emptySub: {
    fontSize: "12px",
    color: "#374151",
    fontFamily: "'DM Sans', sans-serif",
  },
  bookItem: {
    borderRadius: "10px",
    marginBottom: "4px",
    overflow: "hidden",
    transition: "background 0.15s",
    border: "1px solid transparent",
  },
  bookItemActive: {
    background: "#1a1810",
    border: "1px solid #4a3d10",
  },
  bookBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 10px 6px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
  },
  bookEmoji: { fontSize: "20px", flexShrink: 0 },
  bookInfo: { flex: 1, overflow: "hidden" },
  bookTitle: {
    fontSize: "13px",
    color: "#9ca3af",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: "500",
    margin: "0 0 3px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  bookTitleActive: { color: "#e8c97a" },
  bookMeta: {
    fontSize: "11px",
    color: "#374151",
    fontFamily: "'DM Sans', sans-serif",
    margin: 0,
  },
  indexedDot:  { color: "#4a7c4a" },
  pendingDot:  { color: "#cf7e7e" },

  // ── Reindex button ──
  reindexBtn: {
    width: "calc(100% - 20px)",
    margin: "0 10px 4px",
    padding: "6px 10px",
    background: "#1a1f30",
    border: "1px solid #2d3a5a",
    color: "#7a9ecf",
    borderRadius: "8px",
    fontSize: "11px",
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    textAlign: "center",
    transition: "all 0.2s",
    letterSpacing: "0.03em",
    fontWeight: "500",
  },
  reindexBtnLoading: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  reindexSpinner: {
    display: "inline-block",
    animation: "spin 1s linear infinite",
  },

  deleteBtn: {
    width: "100%",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "13px",
    textAlign: "right",
    padding: "0 10px 8px",
    opacity: 0.4,
    transition: "opacity 0.2s",
  },
  confirmRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "0 10px 8px",
    justifyContent: "flex-end",
  },
  confirmText: {
    fontSize: "11px",
    color: "#cf7e7e",
    fontFamily: "'DM Sans', sans-serif",
  },
  confirmYes: {
    fontSize: "11px",
    padding: "3px 10px",
    background: "#2e1a1a",
    border: "1px solid #5a2d2d",
    color: "#cf7e7e",
    borderRadius: "6px",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  confirmNo: {
    fontSize: "11px",
    padding: "3px 10px",
    background: "transparent",
    border: "1px solid #252a38",
    color: "#4b5563",
    borderRadius: "6px",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  sidebarFooter: {
    padding: "1rem 1.2rem",
    borderTop: "1px solid #1e2333",
  },
  footerText: {
    fontSize: "13px",
    color: "#374151",
    fontFamily: "'Crimson Pro', Georgia, serif",
  },
};