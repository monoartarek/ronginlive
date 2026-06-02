import React, { useEffect, useState, useCallback, useMemo } from "react";
import Parse from "../../parseConfig";
import "./Banner.css";

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

/* ── CSV export (no external lib needed) ── */
function exportCSV(data) {
  const rows = [["ObjectId", "Image URL"], ...data.map(b => [b.id, b.image || ""])];
  const csv  = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "banners.csv"; a.click();
  URL.revokeObjectURL(url);
}

/* ── PDF export (basic, no jspdf needed — uses print) ── */
function exportPDF(data) {
  const win = window.open("", "_blank");
  win.document.write(`
    <html><head><title>Banners Export</title>
    <style>body{font-family:sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;}
    th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:12px;}
    th{background:#6366f1;color:white;}img{width:100px;height:60px;object-fit:cover;border-radius:4px;}</style>
    </head><body>
    <h2>Banner Management Export</h2>
    <p>Generated: ${new Date().toLocaleString()}</p>
    <table><thead><tr><th>ObjectId</th><th>Image</th></tr></thead><tbody>
    ${data.map(b => `<tr><td>${b.id}</td><td>${b.image ? `<img src="${b.image}"/>` : "No image"}</td></tr>`).join("")}
    </tbody></table></body></html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

/* ════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════ */
export default function Banners() {
  const [banners,      setBanners]      = useState([]);
  const [search,       setSearch]       = useState("");
  const [loading,      setLoading]      = useState(true);
  const [uploading,    setUploading]    = useState(false);
  const [page,         setPage]         = useState(0);
  const [viewMode,     setViewMode]     = useState("card");
  const [fontSize,     setFontSize]     = useState("md");
  const [animated,     setAnimated]     = useState(false);
  const [toast,        setToast]        = useState(null);

  /* modals */
  const [uploadModal,  setUploadModal]  = useState(false);
  const [editModal,    setEditModal]    = useState(null);  // { id, image }
  const [deleteModal,  setDeleteModal]  = useState(null);  // { id, image }
  const [lightbox,     setLightbox]     = useState(null);  // url

  /* form state */
  const [file,         setFile]         = useState(null);
  const [preview,      setPreview]      = useState(null);

  /* toast */
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* fetch */
  const fetchBanners = useCallback(async () => {
    setLoading(true); setAnimated(false);
    try {
      const Banner = Parse.Object.extend("banners");
      const q = new Parse.Query(Banner);
      q.descending("createdAt"); q.limit(500);
      const results = await q.find({ useMasterKey: true });
      setBanners(results.map(item => ({
        id:        item.id,
        image:     item.get("file")?.url() || null,
        createdAt: item.get("createdAt"),
      })));
      setPage(0);
    } catch (err) {
      showToast("Fetch failed: " + err.message, "error");
    } finally {
      setLoading(false);
      setTimeout(() => setAnimated(true), 60);
    }
  }, [showToast]);

  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  /* search filter */
  const displayed = useMemo(() => {
    if (!search.trim()) return banners;
    return banners.filter(b => b.id.toLowerCase().includes(search.toLowerCase()));
  }, [banners, search]);

  const totalPages = Math.ceil(displayed.length / PAGE_SIZE);
  const pageItems  = displayed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageRange  = useMemo(() => {
    const d = 2, r = [];
    for (let i = Math.max(0, page - d); i <= Math.min(totalPages - 1, page + d); i++) r.push(i);
    return r;
  }, [page, totalPages]);
  const changePage = n => { setPage(n); window.scrollTo({ top: 0, behavior: "smooth" }); };

  /* form helpers */
  const resetForm  = () => { setFile(null); setPreview(null); };
  const handleFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f); setPreview(URL.createObjectURL(f));
  };

  /* upload new */
  const handleUpload = async () => {
    if (!file) { showToast("Please select an image", "error"); return; }
    setUploading(true);
    try {
      const parseFile = new Parse.File(file.name, file);
      await parseFile.save({ useMasterKey: true });
      const Banner = Parse.Object.extend("banners");
      const obj = new Banner();
      obj.set("file", parseFile);
      await obj.save(null, { useMasterKey: true });
      showToast("Banner uploaded successfully", "success");
      resetForm(); setUploadModal(false); fetchBanners();
    } catch (err) { showToast("Upload failed: " + err.message, "error"); }
    finally { setUploading(false); }
  };

  /* update */
  const handleUpdate = async () => {
    if (!editModal) return;
    setUploading(true);
    try {
      const Banner = Parse.Object.extend("banners");
      const obj = await new Parse.Query(Banner).get(editModal.id, { useMasterKey: true });
      if (file) {
        const parseFile = new Parse.File(file.name, file);
        await parseFile.save({ useMasterKey: true });
        obj.set("file", parseFile);
      }
      await obj.save(null, { useMasterKey: true });
      showToast("Banner updated successfully", "success");
      resetForm(); setEditModal(null); fetchBanners();
    } catch (err) { showToast("Update failed: " + err.message, "error"); }
    finally { setUploading(false); }
  };

  /* delete */
  const handleDelete = async () => {
    if (!deleteModal) return;
    const id = deleteModal.id; setDeleteModal(null);
    try {
      const Banner = Parse.Object.extend("banners");
      const obj = await new Parse.Query(Banner).get(id, { useMasterKey: true });
      await obj.destroy({ useMasterKey: true });
      setBanners(prev => prev.filter(b => b.id !== id));
      showToast("Banner deleted", "info");
    } catch (err) { showToast("Delete failed: " + err.message, "error"); }
  };

  /* open edit */
  const openEdit = item => { resetForm(); setPreview(item.image); setEditModal(item); };

  /* ════════════ RENDER ════════════ */
  return (
    <div className={`bn-root bn-fs--${fontSize}`}>

      {/* Toast */}
      {toast && (
        <div className={`bn-toast bn-toast--${toast.type}`}>
          <span className="bn-toast-dot" />
          {toast.msg}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="bn-lightbox" onClick={() => setLightbox(null)}>
          <button className="bn-lb-close">✕</button>
          <img src={lightbox} alt="preview" className="bn-lb-img" />
          <p className="bn-lb-hint">Click anywhere to close</p>
        </div>
      )}

      {/* Delete confirm */}
      {deleteModal && (
        <div className="bn-overlay" onClick={() => setDeleteModal(null)}>
          <div className="bn-modal bn-modal--sm" onClick={e => e.stopPropagation()}>
            <div className="bn-modal-icon bn-modal-icon--red">✕</div>
            <h3 className="bn-modal-title">Delete Banner</h3>
            <p className="bn-modal-desc">
              Permanently delete this banner?<br />
              <span className="bn-id-chip">{deleteModal.id.slice(-10)}</span>
            </p>
            {deleteModal.image && <img src={deleteModal.image} alt="" className="bn-modal-preview" />}
            <div className="bn-modal-btns">
              <button className="bn-btn bn-btn--ghost" onClick={() => setDeleteModal(null)}>Cancel</button>
              <button className="bn-btn bn-btn--red" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Upload modal */}
      {uploadModal && (
        <div className="bn-overlay" onClick={() => { setUploadModal(false); resetForm(); }}>
          <div className="bn-modal bn-modal--form" onClick={e => e.stopPropagation()}>
            <div className="bn-form-header">
              <h3 className="bn-modal-title">Upload Banner</h3>
              <button className="bn-form-close" onClick={() => { setUploadModal(false); resetForm(); }}>✕</button>
            </div>
            <div className="bn-form-body">
              <label className="bn-dropzone" htmlFor="bn-file-new">
                {preview
                  ? <img src={preview} alt="preview" className="bn-dropzone-preview" />
                  : <>
                      <span className="bn-dropzone-icon">⊕</span>
                      <span className="bn-dropzone-text">Click to select image</span>
                      <span className="bn-dropzone-sub">PNG, JPG, WEBP · any ratio</span>
                    </>
                }
                <input id="bn-file-new" type="file" accept="image/*" className="bn-file-input" onChange={handleFile} />
              </label>
              {preview && (
                <button className="bn-btn bn-btn--ghost bn-btn--sm" onClick={() => { setFile(null); setPreview(null); }}>
                  ✕ Remove
                </button>
              )}
            </div>
            <div className="bn-form-footer">
              <button className="bn-btn bn-btn--ghost" onClick={() => { setUploadModal(false); resetForm(); }}>Cancel</button>
              <button className="bn-btn bn-btn--blue" onClick={handleUpload} disabled={uploading || !file}>
                {uploading ? <span className="bn-spin" /> : "Upload Banner"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editModal && (
        <div className="bn-overlay" onClick={() => { setEditModal(null); resetForm(); }}>
          <div className="bn-modal bn-modal--form" onClick={e => e.stopPropagation()}>
            <div className="bn-form-header">
              <h3 className="bn-modal-title">Edit Banner</h3>
              <button className="bn-form-close" onClick={() => { setEditModal(null); resetForm(); }}>✕</button>
            </div>
            <div className="bn-form-body">
              {editModal.image && (
                <div className="bn-edit-current">
                  <span className="bn-field-label">Current Image</span>
                  <img src={editModal.image} alt="current" className="bn-edit-current-img" />
                </div>
              )}
              <label className="bn-dropzone bn-dropzone--sm" htmlFor="bn-file-edit">
                {preview && preview !== editModal.image
                  ? <img src={preview} alt="new" className="bn-dropzone-preview" />
                  : <>
                      <span className="bn-dropzone-icon">✎</span>
                      <span className="bn-dropzone-text">Click to replace image</span>
                      <span className="bn-dropzone-sub">Leave empty to keep current</span>
                    </>
                }
                <input id="bn-file-edit" type="file" accept="image/*" className="bn-file-input" onChange={handleFile} />
              </label>
              {preview && preview !== editModal.image && (
                <button className="bn-btn bn-btn--ghost bn-btn--sm"
                  onClick={() => { setFile(null); setPreview(editModal.image); }}>
                  ↩ Revert to current
                </button>
              )}
              <div className="bn-id-row bn-copyable"
                onClick={() => copyToClipboard(editModal.id, showToast)}
                title="Click to copy ID">
                <span className="bn-field-label">Object ID</span>
                <span className="bn-id-val">{editModal.id}</span>
                <span className="bn-copy-icon">⎘</span>
              </div>
            </div>
            <div className="bn-form-footer">
              <button className="bn-btn bn-btn--ghost" onClick={() => { setEditModal(null); resetForm(); }}>Cancel</button>
              <button className="bn-btn bn-btn--blue" onClick={handleUpdate} disabled={uploading}>
                {uploading ? <span className="bn-spin" /> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="bn-header">
        <div className="bn-header-left">
          <p className="bn-eyebrow">Media Management</p>
          <h1 className="bn-title">Banner Management</h1>
          <p className="bn-sub">{loading ? "Loading…" : `${banners.length} banner${banners.length !== 1 ? "s" : ""}`}</p>
        </div>
        <div className="bn-header-right">
          {/* Font size */}
          <div className="bn-toolbar-group">
            {["sm","md","lg"].map(f => (
              <button key={f}
                className={`bn-tool-btn bn-fs-btn ${fontSize === f ? "on" : ""}`}
                onClick={() => setFontSize(f)}
                title={f === "sm" ? "Small" : f === "md" ? "Medium" : "Large"}
              >{f.toUpperCase()}</button>
            ))}
          </div>
          {/* View toggle */}
          <div className="bn-toolbar-group">
            <button className={`bn-tool-btn ${viewMode === "card" ? "on" : ""}`}
              onClick={() => setViewMode("card")} title="Card view">⊞</button>
            <button className={`bn-tool-btn ${viewMode === "list" ? "on" : ""}`}
              onClick={() => setViewMode("list")} title="List view">≡</button>
          </div>
          {/* Export */}
          <div className="bn-toolbar-group">
            <button className="bn-tool-btn bn-tool-btn--label"
              onClick={() => exportCSV(displayed)} title="Export CSV">CSV</button>
            <button className="bn-tool-btn bn-tool-btn--label"
              onClick={() => exportPDF(displayed)} title="Export PDF">PDF</button>
            <button className="bn-tool-btn bn-tool-btn--label"
              onClick={() => window.print()} title="Print">⎙</button>
          </div>
          <button className="bn-upload-btn" onClick={() => { resetForm(); setUploadModal(true); }}>
            + Upload Banner
          </button>
          <button className="bn-tool-btn bn-tool-btn--solo" onClick={fetchBanners} disabled={loading}>
            {loading ? <span className="bn-spin" /> : "↻"}
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="bn-stats">
        {[
          { label: "Total",    val: banners.length,                       color: "violet" },
          { label: "Showing",  val: displayed.length,                     color: "blue"   },
          { label: "With Image", val: banners.filter(b=>b.image).length,  color: "green"  },
        ].map((s, i) => (
          <div key={i} className={`bn-stat-card bn-stat-card--${s.color}`}>
            <span className="bn-stat-val">{loading ? "…" : s.val}</span>
            <span className="bn-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="bn-search-row">
        <div className="bn-search-wrap">
          <span className="bn-search-icon">⌕</span>
          <input className="bn-search" placeholder="Search by Object ID…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
          {search && <button className="bn-search-x" onClick={() => { setSearch(""); setPage(0); }}>✕</button>}
        </div>
        {!loading && <span className="bn-count">{displayed.length} result{displayed.length !== 1 ? "s" : ""}</span>}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="bn-loading"><div className="bn-loading-ring" /><p>Fetching banners…</p></div>
      ) : pageItems.length === 0 ? (
        <div className="bn-empty">
          <span className="bn-empty-icon">◎</span>
          <p>{search ? "No banners match your search" : "No banners uploaded yet"}</p>
          {!search && <button className="bn-upload-btn" onClick={() => { resetForm(); setUploadModal(true); }}>+ Upload First Banner</button>}
        </div>
      ) : viewMode === "card" ? (

        /* ════ CARD VIEW ════ */
        <div className={`bn-cards ${animated ? "in" : ""}`}>
          {pageItems.map((b, i) => (
            <div key={b.id} className="bn-card" style={{ animationDelay: `${i * 45}ms` }}>
              {/* Image */}
              <div className="bn-card-img-wrap" onClick={() => b.image && setLightbox(b.image)}>
                {b.image
                  ? <img src={b.image} alt="banner" className="bn-card-img" />
                  : <div className="bn-card-no-img">No Image</div>
                }
                {b.image && <div className="bn-card-zoom">🔍 View</div>}
              </div>
              {/* Info */}
              <div className="bn-card-body">
                <div className="bn-card-id bn-copyable"
                  onClick={() => copyToClipboard(b.id, showToast)} title="Copy ID">
                  <span className="bn-field-label-sm">ID</span>
                  <span className="bn-card-id-val">{b.id.slice(-10)}</span>
                  <span className="bn-copy-icon">⎘</span>
                </div>
                <span className="bn-card-time">{timeAgo(b.createdAt)}</span>
              </div>
              {/* Actions */}
              <div className="bn-card-actions">
                <button className="bn-btn bn-btn--edit bn-btn--flex" onClick={() => openEdit(b)}>✎ Edit</button>
                <button className="bn-btn bn-btn--del" onClick={() => setDeleteModal({ id: b.id, image: b.image })}>✕</button>
              </div>
            </div>
          ))}
        </div>

      ) : (

        /* ════ LIST VIEW ════ */
        <div className={`bn-list ${animated ? "in" : ""}`}>
          <div className="bn-list-head">
            <span className="bn-lh" style={{ width: 80 }}>Thumbnail</span>
            <span className="bn-lh bn-lh--grow">Object ID</span>
            <span className="bn-lh bn-lh--md">Added</span>
            <span className="bn-lh" style={{ width: 110, textAlign: "right" }}>Actions</span>
          </div>
          {pageItems.map((b, i) => (
            <div key={b.id} className="bn-row" style={{ animationDelay: `${i * 28}ms` }}>
              {/* Thumb */}
              <div className="bn-td" style={{ width: 80 }}>
                {b.image
                  ? <div className="bn-thumb-wrap" onClick={() => setLightbox(b.image)}>
                      <img src={b.image} alt="" className="bn-thumb" />
                      <div className="bn-thumb-hover">🔍</div>
                    </div>
                  : <div className="bn-no-thumb">—</div>
                }
              </div>
              {/* ID */}
              <div className="bn-td bn-td--grow">
                <div className="bn-row-id bn-copyable"
                  onClick={() => copyToClipboard(b.id, showToast)} title="Copy ID">
                  <span className="bn-row-id-val">{b.id}</span>
                  <span className="bn-copy-icon">⎘</span>
                </div>
              </div>
              {/* Time */}
              <div className="bn-td bn-td--md">
                <span className="bn-row-time">{timeAgo(b.createdAt)}</span>
              </div>
              {/* Actions */}
              <div className="bn-td bn-td--right" style={{ width: 110 }}>
                <button className="bn-btn bn-btn--edit bn-btn--sm" onClick={() => openEdit(b)}>Edit</button>
                <button className="bn-btn bn-btn--del bn-btn--del-sm"
                  onClick={() => setDeleteModal({ id: b.id, image: b.image })}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="bn-pages">
          <button className="bn-page bn-page--nav" disabled={page===0} onClick={() => changePage(0)}>«</button>
          <button className="bn-page bn-page--nav" disabled={page===0} onClick={() => changePage(page-1)}>‹</button>
          {pageRange[0]>0 && <><button className="bn-page" onClick={() => changePage(0)}>1</button>{pageRange[0]>1&&<span className="bn-dots">…</span>}</>}
          {pageRange.map(i => <button key={i} className={`bn-page ${page===i?"bn-page--on":""}`} onClick={() => changePage(i)}>{i+1}</button>)}
          {pageRange[pageRange.length-1]<totalPages-1 && <>{pageRange[pageRange.length-1]<totalPages-2&&<span className="bn-dots">…</span>}<button className="bn-page" onClick={() => changePage(totalPages-1)}>{totalPages}</button></>}
          <button className="bn-page bn-page--nav" disabled={page===totalPages-1} onClick={() => changePage(page+1)}>›</button>
          <button className="bn-page bn-page--nav" disabled={page===totalPages-1} onClick={() => changePage(totalPages-1)}>»</button>
          <span className="bn-page-info">Page {page+1} / {totalPages}</span>
        </div>
      )}

    </div>
  );
}