import React, { useState, useEffect, useRef } from "react";
import Parse from "../../parseConfig";
import "./AddNewPartyThemes.css";

const GridIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </svg>
);
const ListIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
    <rect x="3" y="4" width="18" height="2.5" rx="1.25"/>
    <rect x="3" y="10.75" width="18" height="2.5" rx="1.25"/>
    <rect x="3" y="17.5" width="18" height="2.5" rx="1.25"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
);
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="pt-overlay" onClick={onCancel}>
    <div className="pt-confirm-modal" onClick={e => e.stopPropagation()}>
      <div className="pt-confirm-icon">⚠️</div>
      <p>{message}</p>
      <div className="pt-confirm-actions">
        <button className="pt-btn-cancel" onClick={onCancel}>Cancel</button>
        <button className="pt-btn-danger" onClick={onConfirm}>Delete</button>
      </div>
    </div>
  </div>
);

const EditModal = ({ theme, onSave, onCancel }) => {
  const [credits, setCredits] = useState(theme.credits);
  return (
    <div className="pt-overlay" onClick={onCancel}>
      <div className="pt-edit-modal" onClick={e => e.stopPropagation()}>
        <h3>Edit Credits</h3>
        <p className="pt-edit-subtitle">For: <strong>{theme.name}</strong></p>
        <input type="number" className="pt-edit-input" value={credits} onChange={e => setCredits(e.target.value)} min="0" autoFocus/>
        <div className="pt-confirm-actions">
          <button className="pt-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="pt-btn-primary" onClick={() => onSave(parseInt(credits))}>Update</button>
        </div>
      </div>
    </div>
  );
};

const AddThemeModal = ({ onClose, onSuccess }) => {
  const [name, setName] = useState("");
  const [credits, setCredits] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !credits || !file) { setError("All fields are required."); return; }
    setError(""); setLoading(true);
    try {
      const parseFile = new Parse.File(file.name.replace(/[^A-Za-z0-9_\-.]/g, "_"), file);
      await parseFile.save();
      const Gift = Parse.Object.extend("Gifts");
      const gift = new Gift();
      gift.set("name", name);
      gift.set("categories", "party_theme");
      gift.set("coins", parseInt(credits));
      gift.set("period", 30);
      gift.set("file", parseFile);
      await gift.save();
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-overlay" onClick={onClose}>
      <div className="pt-add-modal" onClick={e => e.stopPropagation()}>
        <div className="pt-modal-header">
          <h2>Add New Party Theme</h2>
          <button className="pt-modal-close" onClick={onClose}><CloseIcon /></button>
        </div>
        <form onSubmit={handleSubmit} className="pt-add-form">
          <div className="pt-form-group">
            <label>Theme Name <span className="pt-required">*</span></label>
            <input type="text" placeholder="e.g. Galaxy Night Party" value={name} onChange={e => setName(e.target.value)} required/>
          </div>
          <div className="pt-form-group">
            <label>Credits <span className="pt-required">*</span></label>
            <input type="number" placeholder="e.g. 500" value={credits} onChange={e => setCredits(e.target.value)} min="0" required/>
          </div>
          <div className="pt-form-group">
            <label>PNG File <span className="pt-required">*</span></label>
            <div className={`pt-drop-zone ${preview ? "has-preview" : ""}`} onClick={() => fileRef.current.click()}>
              {preview
                ? <img src={preview} alt="preview" className="pt-drop-preview"/>
                : <><div className="pt-drop-icon">🎨</div><p>Click to upload PNG</p></>}
              <input ref={fileRef} type="file" accept=".png" onChange={handleFile} style={{ display: "none" }}/>
            </div>
          </div>
          {error && <p className="pt-form-error">{error}</p>}
          <button type="submit" className="pt-btn-submit" disabled={loading}>
            {loading ? <span className="pt-spinner-sm"/> : "Save Party Theme"}
          </button>
        </form>
      </div>
    </div>
  );
};

const ThemeCard = ({ theme, onDelete, onEdit }) => (
  <div className="pt-card">
    <div className="pt-card-img-wrap">
      {theme.fileUrl
        ? <img src={theme.fileUrl} alt={theme.name} className="pt-card-img"/>
        : <div className="pt-card-no-img">No Image</div>}
    </div>
    <div className="pt-card-body">
      <p className="pt-card-name">{theme.name}</p>
      <p className="pt-card-credits">💰 {theme.credits}</p>
      <p className="pt-card-date">{theme.date}</p>
      <div className="pt-card-actions">
        <button className="pt-icon-btn pt-icon-edit" onClick={() => onEdit(theme)} title="Edit"><EditIcon/></button>
        <button className="pt-icon-btn pt-icon-delete" onClick={() => onDelete(theme)} title="Delete"><TrashIcon/></button>
      </div>
    </div>
  </div>
);

const ThemeRow = ({ theme, onDelete, onEdit }) => (
  <tr className="pt-list-row">
    <td>
      <div className="pt-row-info">
        {theme.fileUrl
          ? <img src={theme.fileUrl} alt={theme.name} className="pt-list-thumb"/>
          : <div className="pt-list-no-img">—</div>}
        <span className="pt-row-name">{theme.name}</span>
      </div>
    </td>
    <td><span className="pt-badge-credits">💰 {theme.credits}</span></td>
    <td className="pt-date-cell">{theme.date}</td>
    <td>
      <div className="pt-row-actions">
        <button className="pt-icon-btn pt-icon-edit" onClick={() => onEdit(theme)} title="Edit"><EditIcon/></button>
        <button className="pt-icon-btn pt-icon-delete" onClick={() => onDelete(theme)} title="Delete"><TrashIcon/></button>
      </div>
    </td>
  </tr>
);

export default function PartyThemes() {
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("card");
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchThemes = async () => {
    setLoading(true);
    try {
      const query = new Parse.Query("Gifts");
      query.equalTo("categories", "party_theme");
      query.descending("createdAt");
      const results = await query.find();
      setThemes(results.map(obj => ({
        objectId: obj.id,
        name: obj.get("name"),
        categories: obj.get("categories"),
        credits: obj.get("coins"),
        fileUrl: obj.get("file") ? obj.get("file").url() : null,
        date: obj.createdAt ? new Date(obj.createdAt).toLocaleDateString("en-GB") : "—",
      })));
    } catch (err) {
      showToast("Failed to load: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchThemes(); }, []);

  const handleDelete = async () => {
    try {
      const query = new Parse.Query("Gifts");
      const obj = await query.get(confirmDelete.objectId);
      await obj.destroy();
      showToast("Theme deleted.");
      fetchThemes();
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleEdit = async (newCredits) => {
    try {
      const query = new Parse.Query("Gifts");
      const obj = await query.get(editTarget.objectId);
      obj.set("coins", newCredits);
      await obj.save();
      showToast("Credits updated!");
      fetchThemes();
    } catch (err) {
      showToast("Update failed: " + err.message, "error");
    } finally {
      setEditTarget(null);
    }
  };

  return (
    <div className="pt-wrapper">
      {toast && <div className={`pt-toast pt-toast-${toast.type}`}>{toast.msg}</div>}
      {showAdd && <AddThemeModal onClose={() => setShowAdd(false)} onSuccess={() => { fetchThemes(); showToast("Theme added!"); }}/>}
      {confirmDelete && <ConfirmModal message={`Delete "${confirmDelete.name}"?`} onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)}/>}
      {editTarget && <EditModal theme={editTarget} onSave={handleEdit} onCancel={() => setEditTarget(null)}/>}

      <div className="pt-header">
        <div className="pt-header-left">
          <nav className="pt-breadcrumb">
            <span>Features</span><span className="pt-bc-sep">›</span>
            <span className="pt-bc-active">Party Themes</span>
          </nav>
          <h1 className="pt-title">
            Party Themes
            {!loading && <span className="pt-count-badge">{themes.length}</span>}
          </h1>
        </div>
        <div className="pt-header-right">
          <div className="pt-view-toggle">
            <button className={`pt-toggle-btn ${viewMode === "card" ? "active" : ""}`} onClick={() => setViewMode("card")} title="Card View"><GridIcon/></button>
            <button className={`pt-toggle-btn ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")} title="List View"><ListIcon/></button>
          </div>
          <button className="pt-btn-add" onClick={() => setShowAdd(true)}>
            <PlusIcon/><span className="pt-btn-add-text">Add New Theme</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="pt-loading"><div className="pt-spinner"/><p>Loading…</p></div>
      ) : themes.length === 0 ? (
        <div className="pt-empty">
          <div className="pt-empty-icon">🎉</div>
          <p>No party themes yet.</p>
          <button className="pt-btn-add" onClick={() => setShowAdd(true)}><PlusIcon/> <span>Add New Theme</span></button>
        </div>
      ) : viewMode === "card" ? (
        <div className="pt-card-grid">
          {themes.map(t => <ThemeCard key={t.objectId} theme={t} onDelete={setConfirmDelete} onEdit={setEditTarget}/>)}
        </div>
      ) : (
        <div className="pt-table-wrap">
          <table className="pt-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Credits</th>
                <th>Date</th>
                <th>Act.</th>
              </tr>
            </thead>
            <tbody>
              {themes.map(t => <ThemeRow key={t.objectId} theme={t} onDelete={setConfirmDelete} onEdit={setEditTarget}/>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}