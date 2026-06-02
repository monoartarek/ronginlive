// Posts.jsx
import React, {
  useEffect, useState, useMemo, useCallback, useRef,
} from "react";
import Parse from "../../parseConfig";
import "./Stories.css";

/* ══════════════════════════════════════════
   ICONS
══════════════════════════════════════════ */
const Ic = {
  posts:   <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2"/><path d="M7 8h10M7 12h7M7 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  search:  <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  close:   <svg width="9" height="9" fill="none" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  copy:    <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8"/></svg>,
  csv:     <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/><path d="M8 13c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  excel:   <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/><path d="M9 15l2-3 2 3M11 12v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  pdf:     <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/><path d="M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  print:   <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="1.8"/><rect x="6" y="14" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.8"/></svg>,
  edit:    <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  trash:   <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  save:    <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="1.8"/><path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  eye:     <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>,
  image:   <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="m3 16 5-5 4 4 3-3 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/></svg>,
  prev:    <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  next:    <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
};

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
const GRADIENTS = [
  "linear-gradient(135deg,#06b6d4,#8b5cf6)",
  "linear-gradient(135deg,#8b5cf6,#ec4899)",
  "linear-gradient(135deg,#10b981,#06b6d4)",
  "linear-gradient(135deg,#f59e0b,#f97316)",
  "linear-gradient(135deg,#f43f5e,#8b5cf6)",
  "linear-gradient(135deg,#3b82f6,#06b6d4)",
];

const avatarGrad = (s = "") => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h += s.charCodeAt(i);
  return GRADIENTS[h % GRADIENTS.length];
};

const initials = (name = "") =>
  name ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() : "?";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }) : "—";

const fmtViews = (n) => {
  if (!n && n !== 0) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
};

/* ══════════════════════════════════════════
   EXPORT UTILS
══════════════════════════════════════════ */
const toRows = (items) =>
  items.map((r) => ({
    ObjectId: r.id,
    Date:     fmtDate(r.get("createdAt")),
    Author:   r.get("author") || r.get("username") || r.get("name") || "—",
    Text:     (r.get("text") || r.get("content") || r.get("body") || "").substring(0, 200),
    Picture:  r.get("picture")?.url?.() || r.get("image")?.url?.() || r.get("thumbnail")?.url?.() || "",
    Views:    r.get("views") ?? r.get("viewCount") ?? 0,
  }));

const doCSV = (items) => {
  const cols = ["ObjectId","Date","Author","Text","Picture","Views"];
  const rows = toRows(items).map((r) =>
    cols.map((c) => `"${String(r[c]).replace(/"/g,'""')}"`).join(",")
  );
  const blob = new Blob([cols.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "posts_export.csv"; a.click();
};

const doExcel = (el) => {
  if (!el) return;
  const uri = "data:application/vnd.ms-excel," + encodeURIComponent(el.outerHTML);
  const a = document.createElement("a"); a.href = uri;
  a.download = "posts_export.xls"; a.click();
};

const doPDF = (items) => {
  const cols = ["ObjectId","Date","Author","Text","Views"];
  const data = toRows(items);
  const ths  = cols.map((c) => `<th>${c}</th>`).join("");
  const trs  = data.map((r) =>
    `<tr>${cols.map((c) => `<td>${r[c]}</td>`).join("")}</tr>`
  ).join("");
  const html = `<html><head><style>
    body{font-family:sans-serif;font-size:10px;color:#1e293b}
    h2{font-size:14px;margin-bottom:10px;color:#0f172a}
    p{font-size:9px;color:#64748b;margin-bottom:12px}
    table{width:100%;border-collapse:collapse}
    th{background:#07090f;color:#fff;padding:7px 10px;text-align:left;font-size:9px;letter-spacing:.06em}
    td{padding:6px 10px;border-bottom:1px solid #e2e8f0;vertical-align:top;color:#1e293b;max-width:200px;word-break:break-word}
    tr:nth-child(even) td{background:#f8fafc}
  </style></head><body>
    <h2>Posts Export</h2>
    <p>Generated ${new Date().toLocaleString()} · ${items.length} records</p>
    <table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
  </body></html>`;
  const w = window.open("","_blank");
  w.document.write(html); w.document.close(); w.print();
};

const doCopy = (items) => {
  const cols = ["ObjectId","Date","Author","Text","Views"];
  const data = toRows(items);
  const rows = data.map((r) => cols.map((c) => r[c]).join("\t"));
  const text = cols.join("\t") + "\n" + rows.join("\n");
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); document.body.removeChild(ta);
  });
};

/* ══════════════════════════════════════════
   EDIT MODAL
══════════════════════════════════════════ */
const EditModal = ({ item, onClose, onSaved, showToast }) => {
  const [author,  setAuthor]  = useState(item.get("author")  || item.get("username") || item.get("name") || "");
  const [text,    setText]    = useState(item.get("text")    || item.get("content")  || item.get("body") || "");
  const [views,   setViews]   = useState(String(item.get("views") ?? item.get("viewCount") ?? ""));
  const [saving,  setSaving]  = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (item.get("author")   !== undefined) item.set("author", author);
      if (item.get("username") !== undefined) item.set("username", author);
      if (item.get("name")     !== undefined) item.set("name", author);
      if (item.get("text")     !== undefined) item.set("text", text);
      if (item.get("content")  !== undefined) item.set("content", text);
      if (item.get("body")     !== undefined) item.set("body", text);
      const v = parseInt(views, 10);
      if (!isNaN(v)) {
        if (item.get("views")     !== undefined) item.set("views", v);
        if (item.get("viewCount") !== undefined) item.set("viewCount", v);
      }
      await item.save();
      showToast("✓ Post updated successfully");
      onSaved(item);
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      showToast("✗ Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ps-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ps-modal">
        <div className="ps-modal-header">
          <div className="ps-modal-title">{Ic.edit} Edit Post</div>
          <button className="ps-modal-close" onClick={onClose} type="button">{Ic.close}</button>
        </div>

        <div className="ps-form-field">
          <label className="ps-form-label">Object ID</label>
          <input className="ps-form-input" value={item.id} readOnly
            style={{ opacity: 0.5, cursor: "not-allowed", fontFamily: "var(--mono)", fontSize: "0.75rem" }} />
        </div>

        <div className="ps-form-field">
          <label className="ps-form-label">Author</label>
          <input className="ps-form-input" value={author}
            onChange={(e) => setAuthor(e.target.value)} placeholder="Author name" />
        </div>

        <div className="ps-form-field">
          <label className="ps-form-label">Text / Content</label>
          <textarea className="ps-form-textarea" value={text}
            onChange={(e) => setText(e.target.value)} placeholder="Post content…" />
        </div>

        <div className="ps-form-field">
          <label className="ps-form-label">Views</label>
          <input className="ps-form-input" type="number" min="0" value={views}
            onChange={(e) => setViews(e.target.value)} placeholder="0" />
        </div>

        <div className="ps-modal-footer">
          <button className="ps-modal-cancel" onClick={onClose} type="button">Cancel</button>
          <button className="ps-modal-save" onClick={handleSave} disabled={saving} type="button">
            {Ic.save} {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   LIGHTBOX
══════════════════════════════════════════ */
const Lightbox = ({ src, onClose }) => (
  <div className="ps-lightbox" onClick={onClose}>
    <button className="ps-lightbox-close" onClick={onClose} type="button">✕</button>
    <img src={src} alt="Preview" onClick={(e) => e.stopPropagation()} />
  </div>
);

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function Posts() {
  const [rows,       setRows]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filterHasPic, setFilterHasPic] = useState(false);
  const [page,       setPage]       = useState(0);
  const [perPage,    setPerPage]    = useState(10);
  const [editItem,   setEditItem]   = useState(null);
  const [lightbox,   setLightbox]   = useState(null);
  const [toast,      setToast]      = useState("");
  const tableRef = useRef(null);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const query = new Parse.Query(Parse.Object.extend("Posts"));
      query.descending("createdAt");
      query.limit(2000);
      const results = await query.find();
      setRows(results);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(0); }, [search, filterHasPic, perPage]);

  /* ── Toast ── */
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  /* ── Helpers ── */
  const getPicUrl = useCallback((item) =>
    item.get("picture")?.url?.() ||
    item.get("image")?.url?.()   ||
    item.get("thumbnail")?.url?.() || null,
  []);

  const getAuthor  = (item) => item.get("author")  || item.get("username") || item.get("name") || "Unknown";
  const getText    = (item) => item.get("text")     || item.get("content")  || item.get("body") || "";
  const getViews   = (item) => item.get("views")    ?? item.get("viewCount") ?? null;

  /* ── Total views ── */
  const totalViews = useMemo(() =>
    rows.reduce((acc, r) => acc + (getViews(r) || 0), 0), [rows]);

  /* ── Filter ── */
  const filtered = useMemo(() => {
    let list = rows;
    if (filterHasPic) list = list.filter((r) => !!getPicUrl(r));
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => {
      const oid    = r.id.toLowerCase();
      const author = getAuthor(r).toLowerCase();
      const text   = getText(r).toLowerCase();
      return oid.includes(q) || author.includes(q) || text.includes(q);
    });
  }, [rows, search, filterHasPic, getPicUrl]);

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage   = Math.min(page, totalPages - 1);
  const pageItems  = filtered.slice(safePage * perPage, (safePage + 1) * perPage);
  const startIdx   = filtered.length === 0 ? 0 : safePage * perPage + 1;
  const endIdx     = Math.min((safePage + 1) * perPage, filtered.length);

  /* ── Smart page nums ── */
  const pageNums = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
    const arr = [0];
    if (safePage > 2) arr.push("…");
    for (let i = Math.max(1, safePage - 1); i <= Math.min(totalPages - 2, safePage + 1); i++) arr.push(i);
    if (safePage < totalPages - 3) arr.push("…");
    arr.push(totalPages - 1);
    return arr;
  }, [totalPages, safePage]);

  /* ── Delete ── */
  const handleDelete = useCallback(async (item) => {
    if (!window.confirm("Delete this post permanently?")) return;
    try {
      await item.destroy();
      setRows((prev) => prev.filter((r) => r.id !== item.id));
      showToast("✓ Post deleted");
    } catch (err) {
      console.error("Delete error:", err);
      showToast("✗ Failed to delete");
    }
  }, [showToast]);

  /* ── After edit ── */
  const handleSaved = useCallback((updated) => {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }, []);

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <div className="ps-page">
      <div className="ps-topline" />
      <div className="ps-inner">

        {/* ── HEADER ── */}
        <div className="ps-header">
          <div className="ps-header-left">
            <div className="ps-logo">{Ic.posts}</div>
            <div>
              <div className="ps-page-title">Posts</div>
              <div className="ps-page-sub">Manage Contents of posts</div>
            </div>
          </div>
          <div className="ps-header-right">
            <div className="ps-stat-chip total">
              📄 {rows.length} posts
            </div>
            <div className="ps-stat-chip views">
              👁 {fmtViews(totalViews)} views
            </div>
          </div>
        </div>

        {/* ── TOOLBAR ── */}
        <div className="ps-toolbar">
          {/* Search */}
          <div className="ps-search-wrap">
            <span className="ps-search-icon">{Ic.search}</span>
            <input
              className="ps-search"
              type="text"
              placeholder="Search by ID, author, or content…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="ps-search-clear" onClick={() => setSearch("")} type="button">
                {Ic.close}
              </button>
            )}
          </div>

          {/* Filter pills */}
          <div className="ps-filter-group">
            <button
              className={`ps-filter-btn ${!filterHasPic ? "active" : ""}`}
              onClick={() => setFilterHasPic(false)}
              type="button"
            >
              All Posts
            </button>
            <button
              className={`ps-filter-btn ${filterHasPic ? "active" : ""}`}
              onClick={() => setFilterHasPic(true)}
              type="button"
            >
              {Ic.image} With Picture
            </button>
          </div>

          {/* Exports */}
          <div className="ps-export-group">
            <button className="ps-exp copy"  type="button"
              onClick={() => { doCopy(filtered); showToast("✓ Copied to clipboard!"); }}>
              {Ic.copy}  <span>Copy</span>
            </button>
            <button className="ps-exp csv"   type="button" onClick={() => doCSV(filtered)}>
              {Ic.csv}   <span>CSV</span>
            </button>
            <button className="ps-exp excel" type="button" onClick={() => doExcel(tableRef.current)}>
              {Ic.excel} <span>Excel</span>
            </button>
            <button className="ps-exp pdf"   type="button" onClick={() => doPDF(filtered)}>
              {Ic.pdf}   <span>PDF</span>
            </button>
            <button className="ps-exp print" type="button" onClick={() => window.print()}>
              {Ic.print} <span>Print</span>
            </button>
          </div>
        </div>

        {/* ── SUMMARY BAR ── */}
        <div className="ps-summary">
          <div className="ps-results-info">
            Showing <strong>{startIdx}–{endIdx}</strong> of <strong>{filtered.length}</strong> posts
            {search && ` matching "${search}"`}
          </div>
          <div className="ps-per-page-wrap">
            <span>Rows:</span>
            <select
              className="ps-per-page-select"
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
            >
              {[5, 10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* ── MAIN CARD ── */}
        <div className="ps-card">

          {loading ? (
            <div className="ps-loading">
              <div className="ps-spinner" />
              Loading posts…
            </div>
          ) : filtered.length === 0 ? (
            <div className="ps-empty">
              <div className="ps-empty-icon">📄</div>
              <div className="ps-empty-title">
                {search ? "No results found" : "No posts yet"}
              </div>
              <div className="ps-empty-desc">
                {search ? `Nothing matches "${search}"` : "Posts will appear here once created."}
              </div>
            </div>
          ) : (
            <>
              {/* ── DESKTOP TABLE ── */}
              <div className="ps-table-scroll">
                <table className="ps-table" ref={tableRef}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Object ID</th>
                      <th>Date</th>
                      <th>Author</th>
                      <th>Text</th>
                      <th>Picture</th>
                      <th>Views</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item, idx) => {
                      const author  = getAuthor(item);
                      const text    = getText(item);
                      const views   = getViews(item);
                      const picUrl  = getPicUrl(item);
                      return (
                        <tr key={item.id}>
                          <td><span className="ps-num">{startIdx + idx}</span></td>
                          <td>
                            <span
                              className="ps-oid"
                              title={`Click to copy: ${item.id}`}
                              onClick={() => {
                                navigator.clipboard?.writeText(item.id);
                                showToast("✓ Object ID copied!");
                              }}
                            >
                              {item.id}
                            </span>
                          </td>
                          <td><span className="ps-date">{fmtDate(item.get("createdAt"))}</span></td>
                          <td>
                            <div className="ps-author-cell">
                              <div className="ps-avatar" style={{ background: avatarGrad(author) }}>
                                {initials(author)}
                              </div>
                              <span className="ps-author-name">{author}</span>
                            </div>
                          </td>
                          <td><div className="ps-text-cell">{text || "—"}</div></td>
                          <td>
                            {picUrl
                              ? <img
                                  src={picUrl}
                                  alt="post"
                                  className="ps-thumb"
                                  onClick={() => setLightbox(picUrl)}
                                />
                              : <div className="ps-no-pic">🖼</div>
                            }
                          </td>
                          <td>
                            <span className="ps-views">
                              {Ic.eye} {fmtViews(views)}
                            </span>
                          </td>
                          <td>
                            <div className="ps-actions">
                              <button className="ps-btn-edit" type="button"
                                onClick={() => setEditItem(item)}>
                                {Ic.edit} Edit
                              </button>
                              <button className="ps-btn-del" type="button"
                                onClick={() => handleDelete(item)}>
                                {Ic.trash} Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── MOBILE CARD LIST ── */}
              <div className="ps-card-list">
                {pageItems.map((item, idx) => {
                  const author  = getAuthor(item);
                  const text    = getText(item);
                  const views   = getViews(item);
                  const picUrl  = getPicUrl(item);
                  return (
                    <div key={item.id} className="ps-row-card">
                      {/* Picture banner */}
                      {picUrl
                        ? <img
                            src={picUrl}
                            alt="post"
                            className="ps-card-img-banner"
                            onClick={() => setLightbox(picUrl)}
                          />
                        : <div className="ps-card-no-img">🖼</div>
                      }

                      <div className="ps-card-body">
                        {/* Top: author + views */}
                        <div className="ps-card-top">
                          <div className="ps-author-cell">
                            <div className="ps-avatar"
                              style={{ background: avatarGrad(author), width: 34, height: 34, fontSize: "0.68rem" }}>
                              {initials(author)}
                            </div>
                            <div>
                              <div className="ps-author-name">{author}</div>
                              <div style={{ fontSize:"0.68rem", color:"var(--text-4)", marginTop:1 }}>
                                #{startIdx + idx}
                              </div>
                            </div>
                          </div>
                          <span className="ps-views" style={{ fontSize:"0.8rem" }}>
                            {Ic.eye} {fmtViews(views)}
                          </span>
                        </div>

                        {/* Text */}
                        {text && <div className="ps-card-text">{text}</div>}

                        {/* Meta */}
                        <div className="ps-card-meta">
                          <div className="ps-card-field">
                            <span className="ps-card-field-label">Object ID</span>
                            <span
                              className="ps-oid"
                              style={{ maxWidth:"100%", fontSize:"0.67rem" }}
                              title={item.id}
                              onClick={() => {
                                navigator.clipboard?.writeText(item.id);
                                showToast("✓ Copied!");
                              }}
                            >
                              {item.id}
                            </span>
                          </div>
                          <div className="ps-card-field">
                            <span className="ps-card-field-label">Date</span>
                            <span className="ps-card-field-value">{fmtDate(item.get("createdAt"))}</span>
                          </div>
                        </div>

                        {/* Footer actions */}
                        <div className="ps-card-footer">
                          <button className="ps-btn-edit" type="button"
                            onClick={() => setEditItem(item)}>
                            {Ic.edit} Edit
                          </button>
                          <button className="ps-btn-del" type="button"
                            onClick={() => handleDelete(item)}>
                            {Ic.trash} Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── PAGINATION FOOTER ── */}
          {!loading && filtered.length > 0 && (
            <div className="ps-footer">
              <div className="ps-footer-info">
                <strong>{startIdx}–{endIdx}</strong> of <strong>{filtered.length}</strong> posts
              </div>

              <div className="ps-pages">
                <button className="ps-page-btn" type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0} aria-label="Previous">
                  {Ic.prev}
                </button>

                {pageNums.map((p, i) =>
                  p === "…"
                    ? <button key={`el-${i}`} className="ps-page-btn" disabled type="button">…</button>
                    : <button key={p}
                        className={`ps-page-btn ${safePage === p ? "active" : ""}`}
                        onClick={() => setPage(p)} type="button">
                        {p + 1}
                      </button>
                )}

                <button className="ps-page-btn" type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1} aria-label="Next">
                  {Ic.next}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── EDIT MODAL ── */}
      {editItem && (
        <EditModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSaved={handleSaved}
          showToast={showToast}
        />
      )}

      {/* ── LIGHTBOX ── */}
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}

      {/* ── TOAST ── */}
      {toast && <div className="ps-toast">{toast}</div>}
    </div>
  );
}