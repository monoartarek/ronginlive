import React, { useEffect, useState, useCallback, useMemo } from "react";
import Parse from "../../parseConfig";
import "./SplashBanner.css";

/* ── helpers ── */
function copyToClipboard(text, showToast) {
  navigator.clipboard?.writeText(text)
    .then(() => showToast("Copied: " + text, "copy"))
    .catch(() => {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      showToast("Copied: " + text, "copy");
    });
}
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

/* ════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════ */
export default function SplashBanner() {
  const [data,         setData]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [uploading,    setUploading]    = useState(false);
  const [toast,        setToast]        = useState(null);
  const [viewMode,     setViewMode]     = useState("card");
  const [fontSize,     setFontSize]     = useState("md");
  const [animated,     setAnimated]     = useState(false);
  const [search,       setSearch]       = useState("");

  /* modals */
  const [uploadModal,  setUploadModal]  = useState(false); // add new
  const [editModal,    setEditModal]    = useState(null);  // { id, imageUrl }
  const [deleteModal,  setDeleteModal]  = useState(null);  // { id }
  const [lightbox,     setLightbox]     = useState(null);  // imageUrl

  /* form state */
  const [file,         setFile]         = useState(null);
  const [preview,      setPreview]      = useState(null);

  /* toast */
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* fetch */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setAnimated(false);
    try {
      const Banner = Parse.Object.extend("splash");
      const q = new Parse.Query(Banner);
      q.descending("createdAt");
      q.limit(500);
      const results = await q.find({ useMasterKey: true });
      setData(results.map(item => ({
        id:        item.id,
        image:     item.get("images")?.url() || null,
        createdAt: item.get("createdAt"),
        updatedAt: item.get("updatedAt"),
      })));
    } catch (err) {
      showToast("Fetch failed: " + err.message, "error");
    } finally {
      setLoading(false);
      setTimeout(() => setAnimated(true), 60);
    }
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* filtered */
  const displayed = useMemo(() => {
    if (!search.trim()) return data;
    return data.filter(d => d.id.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  /* file select */
  const handleFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  /* reset form */
  const resetForm = () => { setFile(null); setPreview(null); };

  /* upload new */
  const handleUpload = async () => {
    if (!file) { showToast("Please select an image", "error"); return; }
    setUploading(true);
    try {
      const parseFile = new Parse.File(file.name, file);
      await parseFile.save({ useMasterKey: true });
      // const Banner = Parse.Object.extend("SplashBanner");
      const Banner = Parse.Object.extend("splash");
      const obj = new Banner();
      obj.set("images", parseFile);
      await obj.save(null, { useMasterKey: true });
      showToast("Banner uploaded successfully", "success");
      resetForm();
      setUploadModal(false);
      fetchData();
    } catch (err) {
      showToast("Upload failed: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  /* update */
  const handleUpdate = async () => {
    if (!editModal) return;
    setUploading(true);
    try {
      // const Banner = Parse.Object.extend("SplashBanner");
      const Banner = Parse.Object.extend("splash");
      const obj = await new Parse.Query(Banner).get(editModal.id, { useMasterKey: true });
      if (file) {
        const parseFile = new Parse.File(file.name, file);
        await parseFile.save({ useMasterKey: true });
        obj.set("images", parseFile);
      }
      await obj.save(null, { useMasterKey: true });
      showToast("Banner updated successfully", "success");
      resetForm();
      setEditModal(null);
      fetchData();
    } catch (err) {
      showToast("Update failed: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  /* delete */
  const handleDelete = async () => {
    if (!deleteModal) return;
    const id = deleteModal.id;
    setDeleteModal(null);
    try {
      // const Banner = Parse.Object.extend("SplashBanner");
      const Banner = Parse.Object.extend("splash");
      const obj = await new Parse.Query(Banner).get(id, { useMasterKey: true });
      await obj.destroy({ useMasterKey: true });
      setData(prev => prev.filter(d => d.id !== id));
      showToast("Banner deleted", "info");
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    }
  };

  /* open edit modal */
  const openEdit = item => {
    resetForm();
    setPreview(item.image);
    setEditModal(item);
  };

  /* ════════════ RENDER ════════════ */
  return (
    <div className={`sb-root sb-fs--${fontSize}`}>

      {/* Toast */}
      {toast && (
        <div className={`sb-toast sb-toast--${toast.type}`}>
          <span className="sb-toast-dot" />
          {toast.msg}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="sb-lightbox" onClick={() => setLightbox(null)}>
          <button className="sb-lb-close">✕</button>
          <img src={lightbox} alt="Banner preview" className="sb-lb-img" />
          <p className="sb-lb-hint">Click anywhere to close</p>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteModal && (
        <div className="sb-overlay" onClick={() => setDeleteModal(null)}>
          <div className="sb-modal sb-modal--sm" onClick={e => e.stopPropagation()}>
            <div className="sb-modal-icon sb-modal-icon--red">✕</div>
            <h3 className="sb-modal-title">Delete Banner</h3>
            <p className="sb-modal-desc">
              Delete banner <span className="sb-id-chip">{deleteModal.id.slice(-8)}</span>?
              <br />This cannot be undone.
            </p>
            {deleteModal.imageUrl && (
              <img src={deleteModal.imageUrl} alt="" className="sb-modal-preview" />
            )}
            <div className="sb-modal-btns">
              <button className="sb-btn sb-btn--ghost" onClick={() => setDeleteModal(null)}>Cancel</button>
              <button className="sb-btn sb-btn--red" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Upload modal */}
      {uploadModal && (
        <div className="sb-overlay" onClick={() => { setUploadModal(false); resetForm(); }}>
          <div className="sb-modal sb-modal--form" onClick={e => e.stopPropagation()}>
            <div className="sb-form-header">
              <h3 className="sb-modal-title">Upload Banner</h3>
              <button className="sb-form-close" onClick={() => { setUploadModal(false); resetForm(); }}>✕</button>
            </div>
            <div className="sb-form-body">
              <label className="sb-dropzone" htmlFor="sb-file-upload">
                {preview
                  ? <img src={preview} alt="preview" className="sb-dropzone-preview" />
                  : (
                    <>
                      <span className="sb-dropzone-icon">⊕</span>
                      <span className="sb-dropzone-text">Click to select image</span>
                      <span className="sb-dropzone-sub">PNG, JPG, WEBP supported</span>
                    </>
                  )
                }
                <input id="sb-file-upload" type="file" accept="image/*" className="sb-file-input" onChange={handleFile} />
              </label>
              {preview && (
                <button className="sb-btn sb-btn--ghost sb-btn--sm" onClick={() => { setFile(null); setPreview(null); }}>
                  ✕ Remove image
                </button>
              )}
            </div>
            <div className="sb-form-footer">
              <button className="sb-btn sb-btn--ghost" onClick={() => { setUploadModal(false); resetForm(); }}>Cancel</button>
              <button className="sb-btn sb-btn--blue" onClick={handleUpload} disabled={uploading || !file}>
                {uploading ? <span className="sb-spin" /> : "Upload Banner"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editModal && (
        <div className="sb-overlay" onClick={() => { setEditModal(null); resetForm(); }}>
          <div className="sb-modal sb-modal--form" onClick={e => e.stopPropagation()}>
            <div className="sb-form-header">
              <h3 className="sb-modal-title">Edit Banner</h3>
              <button className="sb-form-close" onClick={() => { setEditModal(null); resetForm(); }}>✕</button>
            </div>
            <div className="sb-form-body">
              {/* Current image */}
              {editModal.image && (
                <div className="sb-edit-current">
                  <span className="sb-edit-label">Current</span>
                  <img src={editModal.image} alt="current" className="sb-edit-current-img" />
                </div>
              )}
              <label className="sb-dropzone sb-dropzone--sm" htmlFor="sb-edit-upload">
                {preview && preview !== editModal.image
                  ? <img src={preview} alt="new preview" className="sb-dropzone-preview" />
                  : (
                    <>
                      <span className="sb-dropzone-icon">✎</span>
                      <span className="sb-dropzone-text">Click to replace image</span>
                      <span className="sb-dropzone-sub">Leave empty to keep current</span>
                    </>
                  )
                }
                <input id="sb-edit-upload" type="file" accept="image/*" className="sb-file-input" onChange={handleFile} />
              </label>
              {preview && preview !== editModal.image && (
                <button className="sb-btn sb-btn--ghost sb-btn--sm"
                  onClick={() => { setFile(null); setPreview(editModal.image); }}>
                  ✕ Revert to current
                </button>
              )}
              {/* ID */}
              <div
                className="sb-id-row sb-copyable"
                onClick={() => copyToClipboard(editModal.id, showToast)}
                title="Click to copy ID"
              >
                <span className="sb-id-label">Object ID</span>
                <span className="sb-id-val">{editModal.id}</span>
                <span className="sb-id-copy">⎘</span>
              </div>
            </div>
            <div className="sb-form-footer">
              <button className="sb-btn sb-btn--ghost" onClick={() => { setEditModal(null); resetForm(); }}>Cancel</button>
              <button className="sb-btn sb-btn--blue" onClick={handleUpdate} disabled={uploading}>
                {uploading ? <span className="sb-spin" /> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="sb-header">
        <div className="sb-header-left">
          <p className="sb-eyebrow">Media Management</p>
          <h1 className="sb-title">Splash Banners</h1>
          <p className="sb-sub">
            {loading ? "Loading…" : `${data.length} banner${data.length !== 1 ? "s" : ""} uploaded`}
          </p>
        </div>
        <div className="sb-header-right">
          {/* Font size */}
          <div className="sb-toolbar-group">
            {["sm","md","lg"].map(f => (
              <button key={f}
                className={`sb-tool-btn sb-fs-btn ${fontSize === f ? "on" : ""}`}
                onClick={() => setFontSize(f)}
                title={f === "sm" ? "Small" : f === "md" ? "Medium" : "Large"}
              >{f.toUpperCase()}</button>
            ))}
          </div>
          {/* View toggle */}
          <div className="sb-toolbar-group">
            <button className={`sb-tool-btn ${viewMode === "card" ? "on" : ""}`}
              onClick={() => setViewMode("card")} title="Card view">⊞</button>
            <button className={`sb-tool-btn ${viewMode === "list" ? "on" : ""}`}
              onClick={() => setViewMode("list")} title="List view">≡</button>
          </div>
          <button className="sb-upload-btn" onClick={() => { resetForm(); setUploadModal(true); }}>
            + Upload Banner
          </button>
          <button className="sb-tool-btn sb-tool-btn--solo" onClick={fetchData} disabled={loading}>
            {loading ? <span className="sb-spin" /> : "↻"}
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="sb-stats">
        <div className="sb-stat-card">
          <span className="sb-stat-val">{loading ? "…" : data.length}</span>
          <span className="sb-stat-label">Total Banners</span>
        </div>
        <div className="sb-stat-card sb-stat-card--blue">
          <span className="sb-stat-val">{loading ? "…" : displayed.length}</span>
          <span className="sb-stat-label">Showing</span>
        </div>
        <div className="sb-stat-card sb-stat-card--green">
          <span className="sb-stat-val">{loading ? "…" : data.filter(d => d.image).length}</span>
          <span className="sb-stat-label">With Image</span>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="sb-search-row">
        <div className="sb-search-wrap">
          <span className="sb-search-icon">⌕</span>
          <input
            className="sb-search"
            placeholder="Search by Object ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="sb-search-x" onClick={() => setSearch("")}>✕</button>
          )}
        </div>
        {!loading && (
          <span className="sb-count">{displayed.length} result{displayed.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="sb-loading">
          <div className="sb-loading-ring" />
          <p>Fetching Splash Banners…</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="sb-empty">
          <span className="sb-empty-icon">◎</span>
          <p>{search ? "No Splash Banners match your search" : "No Splash Banners uploaded yet"}</p>
          {!search && (
            <button className="sb-upload-btn" onClick={() => { resetForm(); setUploadModal(true); }}>
              + Upload First Splash Banner
            </button>
          )}
        </div>
      ) : viewMode === "card" ? (

        /* ════ CARD VIEW ════ */
        <div className={`sb-cards ${animated ? "in" : ""}`}>
          {displayed.map((item, i) => (
            <div key={item.id} className="sb-card" style={{ animationDelay: `${i * 45}ms` }}>

              {/* Image area */}
              <div
                className="sb-card-img-wrap"
                onClick={() => item.image && setLightbox(item.image)}
              >
                {item.image
                  ? <img src={item.image} alt="banner" className="sb-card-img" />
                  : <div className="sb-card-no-img">No Image</div>
                }
                {item.image && <div className="sb-card-zoom">🔍 View</div>}
              </div>

              {/* Info */}
              <div className="sb-card-body">
                <div
                  className="sb-card-id sb-copyable"
                  onClick={() => copyToClipboard(item.id, showToast)}
                  title="Click to copy ID"
                >
                  <span className="sb-id-label">ID</span>
                  <span className="sb-card-id-val">{item.id.slice(-10)}</span>
                  <span className="sb-id-copy">⎘</span>
                </div>
                <span className="sb-card-time">{timeAgo(item.createdAt)}</span>
              </div>

              {/* Actions */}
              <div className="sb-card-actions">
                <button className="sb-btn sb-btn--edit sb-btn--flex" onClick={() => openEdit(item)}>
                  ✎ Edit
                </button>
                <button
                  className="sb-btn sb-btn--del"
                  onClick={() => setDeleteModal({ id: item.id, imageUrl: item.image })}
                >✕</button>
              </div>
            </div>
          ))}
        </div>

      ) : (

        /* ════ LIST VIEW ════ */
        <div className={`sb-list ${animated ? "in" : ""}`}>
          <div className="sb-list-head">
            <span className="sb-lh" style={{ width: 80 }}>Thumbnail</span>
            <span className="sb-lh sb-lh--grow">Object ID</span>
            <span className="sb-lh sb-lh--md">Uploaded</span>
            <span className="sb-lh" style={{ width: 110, textAlign: "right" }}>Actions</span>
          </div>

          {displayed.map((item, i) => (
            <div key={item.id} className="sb-row" style={{ animationDelay: `${i * 28}ms` }}>

              {/* Thumbnail */}
              <div className="sb-td" style={{ width: 80 }}>
                {item.image
                  ? (
                    <div className="sb-thumb-wrap" onClick={() => setLightbox(item.image)}>
                      <img src={item.image} alt="" className="sb-thumb" />
                      <div className="sb-thumb-hover">🔍</div>
                    </div>
                  )
                  : <div className="sb-no-thumb">—</div>
                }
              </div>

              {/* ID */}
              <div className="sb-td sb-td--grow">
                <div
                  className="sb-row-id sb-copyable"
                  onClick={() => copyToClipboard(item.id, showToast)}
                  title="Click to copy"
                >
                  <span className="sb-row-id-val">{item.id}</span>
                  <span className="sb-id-copy">⎘</span>
                </div>
              </div>

              {/* Time */}
              <div className="sb-td sb-td--md">
                <span className="sb-row-time">{timeAgo(item.createdAt)}</span>
              </div>

              {/* Actions */}
              <div className="sb-td sb-td--right" style={{ width: 110 }}>
                <button className="sb-btn sb-btn--edit sb-btn--sm" onClick={() => openEdit(item)}>Edit</button>
                <button
                  className="sb-btn sb-btn--del sb-btn--del-sm"
                  onClick={() => setDeleteModal({ id: item.id, imageUrl: item.image })}
                >✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}