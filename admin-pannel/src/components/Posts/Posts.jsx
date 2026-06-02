import React, { useEffect, useState, useCallback, useMemo } from "react";
import Parse from "../../parseConfig";
import "./Posts.css";

const PAGE_SIZE = 12;

/* ── helpers ── */
function copyToClipboard(text, showToast) {
  navigator.clipboard?.writeText(text)
    .then(() => showToast("Copied!", "copy"))
    .catch(() => {
      const el = document.createElement("textarea");
      el.value = text; document.body.appendChild(el);
      el.select(); document.execCommand("copy");
      document.body.removeChild(el);
      showToast("Copied!", "copy");
    });
}
function timeAgo(d) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function getAvatarColor(str) {
  const p = ["#6366f1","#f472b6","#34d399","#fbbf24","#f87171","#60a5fa","#a78bfa","#22d3ee"];
  let h = 0;
  for (let i = 0; i < (str || "").length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return p[Math.abs(h) % p.length];
}
function getInitial(str) { return (str || "?").charAt(0).toUpperCase(); }

/* ── export helpers ── */
function exportCSV(data) {
  const rows = [
    ["ObjectId","AuthorId","Text","Images","Likes","Num Pictures","Created"],
    ...data.map(p => [
      p.id, p.authorId,
      `"${(p.text || "").replace(/"/g,'""')}"`,
      p.images.length,
      p.likesCount,
      p.numPictures,
      new Date(p.createdAt).toLocaleString(),
    ]),
  ];
  const csv  = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "posts.csv"; a.click();
  URL.revokeObjectURL(url);
}
function exportPDF(data) {
  const win = window.open("", "_blank");
  win.document.write(`
    <html><head><title>Posts Export</title>
    <style>
      body{font-family:sans-serif;padding:20px;}
      h2{margin-bottom:8px;}p{font-size:12px;color:#555;margin-bottom:16px;}
      table{width:100%;border-collapse:collapse;}
      th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px;}
      th{background:#0c1220;color:#d8e4f8;}
      tr:nth-child(even){background:#f8f9fb;}
      img{width:80px;height:55px;object-fit:cover;border-radius:5px;}
    </style></head><body>
    <h2>Posts Management Export</h2>
    <p>Generated: ${new Date().toLocaleString()} · ${data.length} posts</p>
    <table><thead><tr>
      <th>ObjectId</th><th>Author ID</th><th>Text</th>
      <th>Images</th><th>Likes</th><th>Created</th>
    </tr></thead><tbody>
    ${data.map(p => `<tr>
      <td>${p.id}</td>
      <td>${p.authorId}</td>
      <td>${p.text || "—"}</td>
      <td>${p.images.slice(0,2).map(u=>`<img src="${u}"/>`).join(" ")}${p.images.length > 2 ? ` +${p.images.length-2}` : ""}</td>
      <td>${p.likesCount}</td>
      <td>${new Date(p.createdAt).toLocaleDateString()}</td>
    </tr>`).join("")}
    </tbody></table></body></html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

/* ════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════ */
export default function Posts() {
  const [posts,       setPosts]       = useState([]);
  const [search,      setSearch]      = useState("");
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(0);
  const [viewMode,    setViewMode]    = useState("card");
  const [animated,    setAnimated]    = useState(false);
  const [toast,       setToast]       = useState(null);

  /* modals */
  const [lightbox,    setLightbox]    = useState(null);   // { urls, idx }
  const [deleteModal, setDeleteModal] = useState(null);   // post obj

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* ── fetch all posts ── */
  const fetchPosts = useCallback(async () => {
    setLoading(true); setAnimated(false);
    try {
      const Post = Parse.Object.extend("Posts");
      let all = [], skip = 0;
      while (true) {
        const q = new Parse.Query(Post);
        q.limit(1000); q.skip(skip); q.descending("createdAt");
        q.select(["AuthorId","text","list_of_images","likes","numer_of_pictures",
                  "target_people_ids","createdAt","updatedAt"]);
        const batch = await q.find({ useMasterKey: true });
        if (!batch.length) break;
        all = [...all, ...batch.map(p => {
          const imgs = (p.get("list_of_images") || []).map(f => {
              if (!f) return "";
              if (typeof f.url === "function") return f.url();  // Parse File object
              if (typeof f.url === "string")   return f.url;    // plain JSON object
              return "";
            }).filter(Boolean);
          const likesArr = p.get("likes") || [];
          return {
            id:          p.id,
            authorId:    p.get("AuthorId") || "—",
            text:        p.get("text")     || "",
            images:      imgs,
            likesCount:  Array.isArray(likesArr) ? likesArr.length : Number(likesArr) || 0,
            numPictures: p.get("numer_of_pictures") || imgs.length,
            targetCount: (p.get("target_people_ids") || []).length,
            createdAt:   p.get("createdAt"),
            updatedAt:   p.get("updatedAt"),
          };
        })];
        if (batch.length < 1000) break;
        skip += 1000;
      }
      setPosts(all);
      setPage(0);
    } catch (err) {
      showToast("Fetch failed: " + err.message, "error");
    } finally {
      setLoading(false);
      setTimeout(() => setAnimated(true), 60);
    }
  }, [showToast]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  /* ── filter ── */
  const displayed = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return posts;
    return posts.filter(p =>
      p.id.toLowerCase().includes(q) ||
      p.authorId.toLowerCase().includes(q) ||
      (p.text || "").toLowerCase().includes(q)
    );
  }, [posts, search]);

  const totalPages = Math.ceil(displayed.length / PAGE_SIZE);
  const pageItems  = displayed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageRange  = useMemo(() => {
    const d = 2, r = [];
    for (let i = Math.max(0, page - d); i <= Math.min(totalPages - 1, page + d); i++) r.push(i);
    return r;
  }, [page, totalPages]);
  const changePage = n => { setPage(n); window.scrollTo({ top: 0, behavior: "smooth" }); };

  /* ── delete ── */
  const handleDelete = async () => {
    if (!deleteModal) return;
    const id = deleteModal.id; setDeleteModal(null);
    try {
      const Post = Parse.Object.extend("Posts");
      const obj  = await new Parse.Query(Post).get(id, { useMasterKey: true });
      await obj.destroy({ useMasterKey: true });
      setPosts(prev => prev.filter(p => p.id !== id));
      showToast("Post deleted", "info");
    } catch (err) { showToast("Delete failed: " + err.message, "error"); }
  };

  /* ── lightbox nav ── */
  const lbNext = () => setLightbox(lb => ({ ...lb, idx: (lb.idx + 1) % lb.urls.length }));
  const lbPrev = () => setLightbox(lb => ({ ...lb, idx: (lb.idx - 1 + lb.urls.length) % lb.urls.length }));

  /* ════════════ RENDER ════════════ */
  return (
    <div className="po-root">

      {/* Toast */}
      {toast && (
        <div className={`po-toast po-toast--${toast.type}`}>
          <span className="po-toast-dot" />{toast.msg}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="po-lightbox" onClick={() => setLightbox(null)}>
          <button className="po-lb-close" onClick={() => setLightbox(null)}>✕</button>
          <div className="po-lb-inner" onClick={e => e.stopPropagation()}>
            <img src={lightbox.urls[lightbox.idx]} alt="" className="po-lb-img" />
            {lightbox.urls.length > 1 && (
              <>
                <button className="po-lb-nav po-lb-nav--prev" onClick={lbPrev}>‹</button>
                <button className="po-lb-nav po-lb-nav--next" onClick={lbNext}>›</button>
                <div className="po-lb-counter">{lightbox.idx + 1} / {lightbox.urls.length}</div>
              </>
            )}
          </div>
          <p className="po-lb-hint">Click outside to close</p>
        </div>
      )}

      {/* Delete confirm */}
      {deleteModal && (
        <div className="po-overlay" onClick={() => setDeleteModal(null)}>
          <div className="po-modal" onClick={e => e.stopPropagation()}>
            <div className="po-modal-icon po-modal-icon--red">✕</div>
            <h3 className="po-modal-title">Delete Post</h3>
            <p className="po-modal-desc">
              Permanently delete this post?<br />
              <span className="po-id-chip">{deleteModal.id}</span>
            </p>
            {deleteModal.images[0] && (
              <img src={deleteModal.images[0]} alt="" className="po-modal-preview" />
            )}
            {deleteModal.text && (
              <p className="po-modal-text">"{deleteModal.text}"</p>
            )}
            <div className="po-modal-btns">
              <button className="po-btn po-btn--ghost" onClick={() => setDeleteModal(null)}>Cancel</button>
              <button className="po-btn po-btn--red" onClick={handleDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="po-header">
        <div className="po-header-left">
          <p className="po-eyebrow">Content Management</p>
          <h1 className="po-title">Posts</h1>
          <p className="po-sub">
            {loading ? "Loading…" : `${posts.length.toLocaleString()} posts · ${posts.filter(p=>p.images.length>0).length} with images`}
          </p>
        </div>
        <div className="po-header-right">
          {/* View toggle */}
          <div className="po-toolbar-group">
            <button className={`po-tool-btn ${viewMode === "card" ? "on" : ""}`}
              onClick={() => setViewMode("card")} title="Card view">⊞</button>
            <button className={`po-tool-btn ${viewMode === "list" ? "on" : ""}`}
              onClick={() => setViewMode("list")} title="List view">≡</button>
          </div>
          {/* Export */}
          <div className="po-toolbar-group">
            <button className="po-tool-btn po-tool-btn--label"
              onClick={() => exportCSV(displayed)}>CSV</button>
            <button className="po-tool-btn po-tool-btn--label"
              onClick={() => exportPDF(displayed)}>PDF</button>
            <button className="po-tool-btn po-tool-btn--label"
              onClick={() => window.print()}>⎙</button>
          </div>
          <button className="po-tool-btn po-tool-btn--solo" onClick={fetchPosts} disabled={loading}>
            {loading ? <span className="po-spin" /> : "↻"}
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="po-stats">
        {[
          { label: "Total Posts",   val: posts.length,                              color: "#818cf8" },
          { label: "With Images",   val: posts.filter(p=>p.images.length>0).length, color: "#34d399" },
          { label: "With Text",     val: posts.filter(p=>p.text).length,            color: "#60a5fa" },
          { label: "Total Likes",   val: posts.reduce((s,p)=>s+p.likesCount,0).toLocaleString(), color: "#fbbf24" },
        ].map((s, i) => (
          <div key={i} className="po-stat-card" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="po-stat-val" style={{ color: s.color }}>{loading ? "…" : s.val}</span>
            <span className="po-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="po-search-row">
        <div className="po-search-wrap">
          <span className="po-search-icon">⌕</span>
          <input className="po-search"
            placeholder="Search by ID, Author ID or text…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }} />
          {search && (
            <button className="po-search-x" onClick={() => { setSearch(""); setPage(0); }}>✕</button>
          )}
        </div>
        {!loading && (
          <span className="po-count">{displayed.length} result{displayed.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="po-loading">
          <div className="po-loading-ring" />
          <div className="po-loading-ring po-loading-ring--2" />
          <p>Fetching posts…</p>
        </div>
      ) : pageItems.length === 0 ? (
        <div className="po-empty">
          <span className="po-empty-icon">◎</span>
          <p>{search ? "No posts match your search" : "No posts found"}</p>
          {search && <button className="po-btn po-btn--ghost" onClick={() => setSearch("")}>Clear search</button>}
        </div>
      ) : viewMode === "card" ? (

        /* ════ CARD VIEW ════ */
        <div className={`po-cards ${animated ? "in" : ""}`}>
          {pageItems.map((p, i) => {
            const color = getAvatarColor(p.authorId);
            return (
              <div key={p.id} className="po-card" style={{ animationDelay: `${i * 40}ms` }}>

                {/* Image strip */}
                {p.images.length > 0 ? (
                  <div className="po-card-imgs"
                    onClick={() => setLightbox({ urls: p.images, idx: 0 })}>
                    <img src={p.images[0]} alt="" className="po-card-img-main" crossOrigin="anonymous"
                    onError={e => { e.target.style.display = "none"; }} />
                    {p.images.length > 1 && (
                      <div className="po-card-img-more">+{p.images.length - 1}</div>
                    )}
                    <div className="po-card-zoom">🔍</div>
                  </div>
                ) : (
                  <div className="po-card-no-img">No Image</div>
                )}

                {/* Body */}
                <div className="po-card-body">
                  {/* Author row */}
                  <div className="po-card-author">
                    <div className="po-av" style={{ background: color }}>
                      {getInitial(p.authorId)}
                    </div>
                    <span className="po-card-author-id po-copyable"
                      onClick={() => copyToClipboard(p.authorId, showToast)}
                      title="Copy Author ID">{p.authorId}</span>
                    <span className="po-card-time">{timeAgo(p.createdAt)}</span>
                  </div>

                  {/* Text */}
                  {p.text ? (
                    <p className="po-card-text">"{p.text}"</p>
                  ) : (
                    <p className="po-card-text po-card-text--empty">No caption</p>
                  )}

                  {/* Meta pills */}
                  <div className="po-card-meta">
                    <span className="po-meta-pill po-meta-pill--like">♥ {p.likesCount}</span>
                    <span className="po-meta-pill po-meta-pill--img">🖼 {p.numPictures}</span>
                    {p.targetCount > 0 && (
                      <span className="po-meta-pill po-meta-pill--tag">@ {p.targetCount}</span>
                    )}
                  </div>

                  {/* Object ID */}
                  <div className="po-card-id po-copyable"
                    onClick={() => copyToClipboard(p.id, showToast)}
                    title="Copy Object ID">
                    <span className="po-field-label-sm">ID</span>
                    <span className="po-card-id-val">{p.id.slice(-10)}</span>
                    <span className="po-copy-icon">⎘</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="po-card-actions">
                  <button className="po-btn po-btn--del po-btn--full"
                    onClick={() => setDeleteModal(p)}>✕ Delete</button>
                </div>
              </div>
            );
          })}
        </div>

      ) : (

        /* ════ LIST VIEW ════ */
        <div className={`po-list ${animated ? "in" : ""}`}>
          <div className="po-list-head">
            <span className="po-lh" style={{ width: 80 }}>Image</span>
            <span className="po-lh po-lh--grow">Author ID / Text</span>
            <span className="po-lh po-lh--center">Likes</span>
            <span className="po-lh po-lh--center po-lh--hide-sm">Pics</span>
            <span className="po-lh po-lh--hide-md">Object ID</span>
            <span className="po-lh po-lh--hide-md">Added</span>
            <span className="po-lh" style={{ width: 80, textAlign: "right" }}>Action</span>
          </div>

          {pageItems.map((p, i) => {
            const color = getAvatarColor(p.authorId);
            return (
              <div key={p.id} className="po-row" style={{ animationDelay: `${i * 28}ms` }}>

                {/* Thumbnail */}
                <div className="po-td" style={{ width: 80 }}>
                  {p.images.length > 0 ? (
                    <div className="po-thumb-wrap"
                      onClick={() => setLightbox({ urls: p.images, idx: 0 })}>
                      <img src={p.images[0]} alt="" className="po-thumb" crossOrigin="anonymous"
                      onError={e => { e.target.style.display = "none"; }} />
                      {p.images.length > 1 && (
                        <span className="po-thumb-count">+{p.images.length - 1}</span>
                      )}
                      <div className="po-thumb-hover">🔍</div>
                    </div>
                  ) : (
                    <div className="po-no-thumb">—</div>
                  )}
                </div>

                {/* Author + text */}
                <div className="po-td po-td--grow">
                  <div className="po-row-author">
                    <div className="po-av po-av--sm" style={{ background: color }}>
                      {getInitial(p.authorId)}
                    </div>
                    <span className="po-row-author-id po-copyable"
                      onClick={() => copyToClipboard(p.authorId, showToast)}
                      title="Copy Author ID">{p.authorId}</span>
                  </div>
                  {p.text && (
                    <span className="po-row-text">"{p.text}"</span>
                  )}
                </div>

                {/* Likes */}
                <div className="po-td po-td--center">
                  <span className="po-like-count">♥ {p.likesCount}</span>
                </div>

                {/* Pics */}
                <div className="po-td po-td--center po-td--hide-sm">
                  <span className="po-pic-count">🖼 {p.numPictures}</span>
                </div>

                {/* Object ID */}
                <div className="po-td po-td--hide-md">
                  <span className="po-row-id po-copyable"
                    onClick={() => copyToClipboard(p.id, showToast)}
                    title="Copy ID">
                    {p.id} <span className="po-copy-icon">⎘</span>
                  </span>
                </div>

                {/* Time */}
                <div className="po-td po-td--hide-md">
                  <span className="po-row-time">{timeAgo(p.createdAt)}</span>
                </div>

                {/* Delete */}
                <div className="po-td po-td--right" style={{ width: 80 }}>
                  <button className="po-btn po-btn--del po-btn--sm"
                    onClick={() => setDeleteModal(p)}>✕ Del</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="po-pages">
          <button className="po-page po-page--nav" disabled={page===0} onClick={() => changePage(0)}>«</button>
          <button className="po-page po-page--nav" disabled={page===0} onClick={() => changePage(page-1)}>‹</button>
          {pageRange[0]>0&&<><button className="po-page" onClick={()=>changePage(0)}>1</button>{pageRange[0]>1&&<span className="po-dots">…</span>}</>}
          {pageRange.map(i=><button key={i} className={`po-page ${page===i?"po-page--on":""}`} onClick={()=>changePage(i)}>{i+1}</button>)}
          {pageRange[pageRange.length-1]<totalPages-1&&<>{pageRange[pageRange.length-1]<totalPages-2&&<span className="po-dots">…</span>}<button className="po-page" onClick={()=>changePage(totalPages-1)}>{totalPages}</button></>}
          <button className="po-page po-page--nav" disabled={page===totalPages-1} onClick={()=>changePage(page+1)}>›</button>
          <button className="po-page po-page--nav" disabled={page===totalPages-1} onClick={()=>changePage(totalPages-1)}>»</button>
          <span className="po-page-info">Page {page+1} / {totalPages} · {displayed.length} posts</span>
        </div>
      )}

    </div>
  );
}