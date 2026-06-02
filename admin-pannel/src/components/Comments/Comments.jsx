import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import "./Comments.css";
import Parse from "../../parseConfig";

const PAGE_SIZE = 50;

/* ── helpers ── */
function timeAgo(d) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
const avatarColors = [
  "linear-gradient(135deg,#f59e0b,#f97316)",
  "linear-gradient(135deg,#ec4899,#f43f5e)",
  "linear-gradient(135deg,#8b5cf6,#6366f1)",
  "linear-gradient(135deg,#06b6d4,#3b82f6)",
  "linear-gradient(135deg,#22c55e,#06b6d4)",
];
function avatarColor(str) {
  let h = 0;
  for (let i = 0; i < (str || "").length; i++) h += str.charCodeAt(i);
  return avatarColors[h % avatarColors.length];
}
function getInitial(str) { return (str || "?").charAt(0).toUpperCase(); }
function copyText(text) {
  navigator.clipboard?.writeText(text).catch(() => {
    const el = document.createElement("textarea");
    el.value = text; document.body.appendChild(el);
    el.select(); document.execCommand("copy");
    document.body.removeChild(el);
  });
}

/* ── export helpers ── */
function doCSV(data) {
  const rows = [["ObjectId","AuthorId","PostId","Text","Created"],
    ...data.map(c => [`"${c.id}"`,`"${c.authorId}"`,`"${c.postId}"`,
      `"${(c.text||"").replace(/"/g,'""')}"`,`"${fmtDate(c.createdAt)}"`].join(","))];
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "comments.csv"; a.click();
}
function doPDF(data) {
  const win = window.open("", "_blank");
  win.document.write(`<html><head><title>Comments</title>
    <style>body{font-family:sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;}
    th,td{border:1px solid #ddd;padding:8px;font-size:12px;text-align:left;}
    th{background:#1a1511;color:#f5ede0;}</style></head><body>
    <h2>Comments Export — ${new Date().toLocaleString()}</h2>
    <table><thead><tr><th>ObjectId</th><th>AuthorId</th><th>PostId</th><th>Text</th><th>Date</th></tr></thead>
    <tbody>${data.map(c=>`<tr><td>${c.id}</td><td>${c.authorId}</td><td>${c.postId}</td>
    <td>${c.text||""}</td><td>${fmtDate(c.createdAt)}</td></tr>`).join("")}</tbody></table></body></html>`);
  win.document.close(); setTimeout(() => win.print(), 400);
}

/* ── build server query ── */
function buildQuery(Comment, srch) {
  const trim = (srch || "").trim();
  if (!trim) return new Parse.Query(Comment);
  const queries = [];
  const qPost   = new Parse.Query(Comment); qPost.contains("postId",   trim); queries.push(qPost);
  const qAuthor = new Parse.Query(Comment); qAuthor.contains("authorId", trim); queries.push(qAuthor);
  return Parse.Query.or(...queries);
}

/* ════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════ */
export default function Comments() {
  const [comments,     setComments]     = useState([]);
  const [searchInput,  setSearchInput]  = useState("");
  const [search,       setSearch]       = useState("");
  const [loading,      setLoading]      = useState(true);
  const [page,         setPage]         = useState(0);
  const [totalCount,   setTotalCount]   = useState(0);
  const [statCounts,   setStatCounts]   = useState({ total: 0 });
  const [toast,        setToast]        = useState("");
  const [deleteModal,  setDeleteModal]  = useState(null);
  const [animated,     setAnimated]     = useState(false);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  /* debounce search */
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* ── stat count ── */
  const fetchStatCount = useCallback(async () => {
    try {
      const Comment = Parse.Object.extend("Comments");
      const q = new Parse.Query(Comment);
      const total = await q.count({ useMasterKey: true });
      setStatCounts({ total });
    } catch (err) { console.error(err); }
  }, []);

  /* ── fetch page ── */
  const fetchPage = useCallback(async (pageNum, srch) => {
    setLoading(true); setAnimated(false);
    try {
      const Comment = Parse.Object.extend("Comments");
      const mk = { useMasterKey: true };

      const q      = buildQuery(Comment, srch);
      const countQ = buildQuery(Comment, srch);

      q.descending("createdAt");
      q.limit(PAGE_SIZE);
      q.skip(pageNum * PAGE_SIZE);
      q.select(["authorId","postId","text","createdAt","updatedAt"]);

      const [batch, count] = await Promise.all([q.find(mk), countQ.count(mk)]);

      setTotalCount(count);
      setComments(batch.map(c => ({
        id:        c.id,
        authorId:  c.get("authorId") || "—",
        postId:    c.get("postId")   || "—",
        text:      c.get("text")     || "",
        createdAt: c.get("createdAt"),
        updatedAt: c.get("updatedAt"),
      })));
    } catch (err) {
      console.error("Fetch error:", err);
      showToast("Fetch failed");
    } finally {
      setLoading(false);
      setTimeout(() => setAnimated(true), 60);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPage(page, search);
  }, [page, search, fetchPage]);

  useEffect(() => { fetchStatCount(); }, [fetchStatCount]);

  /* pagination */
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const pageRange  = useMemo(() => {
    const d = 2, r = [];
    for (let i = Math.max(0, page - d); i <= Math.min(totalPages - 1, page + d); i++) r.push(i);
    return r;
  }, [page, totalPages]);
  const changePage = n => { setPage(n); window.scrollTo({ top: 0, behavior: "smooth" }); };

  /* delete */
  const handleDelete = async () => {
    if (!deleteModal) return;
    const id = deleteModal.id; setDeleteModal(null);
    try {
      const Comment = Parse.Object.extend("Comments");
      const obj = await new Parse.Query(Comment).get(id, { useMasterKey: true });
      await obj.destroy({ useMasterKey: true });
      setComments(prev => prev.filter(c => c.id !== id));
      setTotalCount(n => n - 1);
      setStatCounts(s => ({ ...s, total: s.total - 1 }));
      showToast("✓ Comment deleted");
    } catch (err) { showToast("Delete failed"); }
  };

  const refresh = () => { fetchPage(page, search); fetchStatCount(); };

  const startIdx = totalCount === 0 ? 0 : page * PAGE_SIZE + 1;
  const endIdx   = Math.min((page + 1) * PAGE_SIZE, totalCount);

  /* ════════════ RENDER ════════════ */
  return (
    <div className="cm-page">
      <div className="cm-inner">

        {/* Delete Modal */}
        {deleteModal && (
          <div className="cm-overlay" onClick={() => setDeleteModal(null)}>
            <div className="cm-modal" onClick={e => e.stopPropagation()}>
              <div className="cm-modal-icon">🗑</div>
              <h3 className="cm-modal-title">Delete Comment</h3>
              <p className="cm-modal-desc">
                Permanently delete this comment?<br />
                {deleteModal.text && <em>"{deleteModal.text.slice(0, 60)}{deleteModal.text.length > 60 ? "…" : ""}"</em>}
              </p>
              <div className="cm-modal-btns">
                <button className="cm-modal-cancel" onClick={() => setDeleteModal(null)}>Cancel</button>
                <button className="cm-modal-confirm" onClick={handleDelete}>Yes, Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* ── HEADER ── */}
        <div className="cm-header">
          <div className="cm-header-left">
            <div className="cm-logo">💬</div>
            <div>
              <div className="cm-title">Comments</div>
              <div className="cm-sub">Post comments &amp; moderation</div>
            </div>
          </div>
          <div className="cm-header-right">
            <div className="cm-total-badge">
              💬 {statCounts.total.toLocaleString()} total
            </div>
            <button className="cm-refresh-btn" onClick={refresh} disabled={loading}>
              {loading ? <span className="cm-spin" /> : "↻"}
            </button>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="cm-stats">
          {[
            { label: "Total Comments", val: statCounts.total.toLocaleString(), color: "#f59e0b" },
            { label: "This Filter",    val: totalCount.toLocaleString(),        color: "#6ee7b7" },
            { label: "This Page",      val: comments.length,                    color: "#a78bfa" },
            { label: "Page",           val: `${page + 1} / ${totalPages || 1}`, color: "#fb7185" },
          ].map((s, i) => (
            <div key={i} className="cm-stat-card" style={{ animationDelay: `${i * 55}ms` }}>
              <span className="cm-stat-val" style={{ color: s.color }}>{s.val}</span>
              <span className="cm-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── TOOLBAR ── */}
        <div className="cm-toolbar">
          <div className="cm-search-wrap">
            <span className="cm-search-icon">⌕</span>
            <input className="cm-search" type="text"
              placeholder="Search by Post ID or Author ID…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)} />
            {searchInput && (
              <button className="cm-search-clear"
                onClick={() => { setSearchInput(""); setSearch(""); setPage(0); }}>✕</button>
            )}
          </div>

          <div className="cm-export-group">
            <button className="cm-exp copy" onClick={() => {
              const txt = comments.map(c => `${c.id}\t${c.authorId}\t${c.postId}\t${c.text}`).join("\n");
              copyText(txt); showToast("✓ Copied!");
            }}>⎘ Copy</button>
            <button className="cm-exp csv"   onClick={() => doCSV(comments)}>CSV</button>
            <button className="cm-exp pdf"   onClick={() => doPDF(comments)}>PDF</button>
            <button className="cm-exp print" onClick={() => window.print()}>⎙ Print</button>
          </div>

          {!loading && (
            <span className="cm-results-chip">
              <strong>{totalCount.toLocaleString()}</strong> results
            </span>
          )}
        </div>

        {/* ── PAGE INDICATOR ── */}
        {!loading && totalPages > 1 && (
          <div className="cm-page-indicator">
            <span>Page <strong>{page + 1}</strong> of <strong>{totalPages}</strong></span>
            <span className="cm-pi-dot" />
            <span>Records <strong>{startIdx}–{endIdx}</strong> of <strong>{totalCount}</strong></span>
          </div>
        )}

        {/* ── MAIN CARD ── */}
        <div className="cm-card">
          {loading ? (
            <div className="cm-loading">
              <div className="cm-spinner" />
              <div className="cm-spinner cm-spinner--2" />
              <p>Fetching comments…</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="cm-empty">
              <div className="cm-empty-icon">💬</div>
              <div className="cm-empty-title">{search ? "No results found" : "No comments yet"}</div>
              <div className="cm-empty-desc">
                {search ? `Nothing matches "${search}"` : "Comments will appear here when users engage."}
              </div>
              {search && (
                <button className="cm-clear-btn"
                  onClick={() => { setSearchInput(""); setSearch(""); setPage(0); }}>
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <>
              {/* ── TABLE ── */}
              <div className="cm-table-scroll">
                <table className="cm-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Author ID</th>
                      <th>Post ID</th>
                      <th>Comment</th>
                      <th>Time</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comments.map((c, idx) => (
                      <tr key={c.id} className={animated ? "in" : ""}
                        style={{ animationDelay: `${Math.min(idx * 20, 400)}ms` }}>
                        <td>
                          <span className="cm-row-num">{startIdx + idx}</span>
                        </td>
                        <td>
                          <div className="cm-author">
                            <div className="cm-avatar" style={{ background: avatarColor(c.authorId) }}>
                              {getInitial(c.authorId)}
                            </div>
                            <span className="cm-oid cm-copyable"
                              onClick={() => { copyText(c.authorId); showToast("✓ Author ID copied!"); }}
                              title={c.authorId}>
                              {c.authorId}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="cm-oid cm-oid--post cm-copyable"
                            onClick={() => { copyText(c.postId); showToast("✓ Post ID copied!"); }}
                            title={c.postId}>
                            {c.postId}
                          </span>
                        </td>
                        <td>
                          <div className="cm-text">{c.text || <em className="cm-no-text">No text</em>}</div>
                        </td>
                        <td>
                          <span className="cm-date">{timeAgo(c.createdAt)}</span>
                        </td>
                        <td>
                          <button className="cm-del-btn"
                            onClick={() => setDeleteModal(c)}>
                            🗑 Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── MOBILE CARD LIST ── */}
              <div className="cm-card-list">
                {comments.map((c, idx) => (
                  <div key={c.id} className="cm-row-card"
                    style={{ animationDelay: `${Math.min(idx * 20, 400)}ms` }}>
                    <div className="cm-row-card-top">
                      <div className="cm-author">
                        <div className="cm-avatar" style={{ background: avatarColor(c.authorId) }}>
                          {getInitial(c.authorId)}
                        </div>
                        <div>
                          <div className="cm-oid cm-copyable"
                            onClick={() => { copyText(c.authorId); showToast("✓ Copied!"); }}>
                            {c.authorId}
                          </div>
                          <div style={{ fontSize: "0.65rem", color: "var(--text-4)", marginTop: 2 }}>
                            #{startIdx + idx}
                          </div>
                        </div>
                      </div>
                      <button className="cm-del-btn" onClick={() => setDeleteModal(c)}>🗑</button>
                    </div>
                    {c.text && <div className="cm-row-card-body">{c.text}</div>}
                    <div className="cm-row-card-meta">
                      <div>
                        <div className="cm-row-card-field-label">Post ID</div>
                        <span className="cm-oid cm-oid--post cm-copyable"
                          onClick={() => { copyText(c.postId); showToast("✓ Copied!"); }}>
                          {c.postId}
                        </span>
                      </div>
                      <div>
                        <div className="cm-row-card-field-label">Time</div>
                        <div className="cm-row-card-field-value">{timeAgo(c.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── FOOTER / PAGINATION ── */}
              <div className="cm-footer">
                <div className="cm-footer-info">
                  <strong>{startIdx}–{endIdx}</strong> of <strong>{totalCount.toLocaleString()}</strong> comments
                </div>
                <div className="cm-pages">
                  <button className="cm-page-btn" disabled={page === 0 || loading}
                    onClick={() => changePage(0)}>«</button>
                  <button className="cm-page-btn" disabled={page === 0 || loading}
                    onClick={() => changePage(page - 1)}>‹</button>

                  {pageRange[0] > 0 && (
                    <><button className="cm-page-btn" onClick={() => changePage(0)}>1</button>
                    {pageRange[0] > 1 && <button className="cm-page-btn" disabled>…</button>}</>
                  )}
                  {pageRange.map(i => (
                    <button key={i}
                      className={`cm-page-btn ${page === i ? "active" : ""}`}
                      onClick={() => changePage(i)}>{i + 1}</button>
                  ))}
                  {pageRange[pageRange.length - 1] < totalPages - 1 && (
                    <>{pageRange[pageRange.length - 1] < totalPages - 2 &&
                      <button className="cm-page-btn" disabled>…</button>}
                    <button className="cm-page-btn" onClick={() => changePage(totalPages - 1)}>{totalPages}</button></>
                  )}

                  <button className="cm-page-btn" disabled={page >= totalPages - 1 || loading}
                    onClick={() => changePage(page + 1)}>›</button>
                  <button className="cm-page-btn" disabled={page >= totalPages - 1 || loading}
                    onClick={() => changePage(totalPages - 1)}>»</button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>

      {/* Toast */}
      {toast && <div className="cm-toast">{toast}</div>}
    </div>
  );
}