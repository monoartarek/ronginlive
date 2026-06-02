import React, { useEffect, useState, useCallback, useMemo } from "react";
import Parse from "../../parseConfig";
import "./AddFrame.css";

/* ═══════════════════════════════════════════════════════════
   AllAvatarFrames.jsx
   Parse class: "Gifts" where categories === "avatar_frame"
   Fields:
     name       String
     coins      Number
     file       Parse.File (image / svga)
     categories String = "avatar_frame"
     privet     Boolean (private)
     createdAt  Date

   Actions (from PHP):
     Edit   → set coins + privet on Gifts record
     Delete → destroy Gifts record
     Send   → create ObtainedItems record for a user by UID
               fields: author_id, author(Pointer), item(Pointer),
                       item_id, category="avatar_frame", expiration_date(+30d)
═══════════════════════════════════════════════════════════ */

const PAGE_SIZE = 20;

/* ── helpers ── */
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"2-digit", year:"numeric" });
}
function getFileUrl(f) {
  if (!f) return null;
  if (typeof f === "string") return f;
  if (typeof f.url === "function") return f.url();
  if (f._url) return f._url;
  return null;
}
function isSvga(url) { return url && url.toLowerCase().endsWith(".svga"); }

/* ── Toast ── */
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`af-toast af-toast--${toast.type}`}>
      <span className="af-toast-dot" />
      {toast.msg}
    </div>
  );
}

/* ── Confirm Modal ── */
function ConfirmModal({ data, onClose, onConfirm, loading }) {
  if (!data) return null;
  return (
    <div className="af-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="af-modal">
        <div className={`af-modal-icon ${data.danger ? "af-modal-icon--red" : "af-modal-icon--green"}`}>
          {data.danger ? "⚠" : "✓"}
        </div>
        <h3 className="af-modal-title">{data.title}</h3>
        <p className="af-modal-body" dangerouslySetInnerHTML={{ __html: data.body }} />
        <div className="af-modal-btns">
          <button className="af-btn af-btn--ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button
            className={`af-btn ${data.danger ? "af-btn--red" : "af-btn--green"}`}
            onClick={onConfirm} disabled={loading}>
            {loading ? <span className="af-spin" /> : data.ok}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Edit Modal ── */
function EditModal({ frame, onClose, onSave, loading }) {
  const [coins,   setCoins]   = useState(frame?.coins ?? 0);
  const [privet,  setPrivet]  = useState(!!frame?.privet);

  useEffect(() => {
    if (frame) { setCoins(frame.coins ?? 0); setPrivet(!!frame.privet); }
  }, [frame]);

  if (!frame) return null;
  return (
    <div className="af-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="af-modal af-modal--edit">
        <h3 className="af-modal-title">Edit Avatar Frame</h3>
        <p className="af-modal-sub">{frame.name}</p>
        {frame.imageUrl && (
          <div className="af-edit-preview">
            {isSvga(frame.imageUrl)
              ? <div className="af-edit-preview-ph">SVGA</div>
              : <img src={frame.imageUrl} alt={frame.name} className="af-edit-img" />
            }
          </div>
        )}
        <div className="af-edit-fields">
          <div className="af-edit-field">
            <label className="af-edit-label">Coins / Credits</label>
            <input className="af-edit-input" type="number" min="0"
              value={coins} onChange={e => setCoins(e.target.value)}
              placeholder="Enter coins…" />
          </div>
          <div className="af-edit-field af-edit-field--check">
            <span className="af-edit-label">Private</span>
            <label className="af-switch">
              <input type="checkbox" checked={privet} onChange={e => setPrivet(e.target.checked)} />
              <span className="af-switch-track" />
            </label>
            <span className={`af-priv-val ${privet ? "on" : ""}`}>{privet ? "Yes" : "No"}</span>
          </div>
        </div>
        <div className="af-modal-btns">
          <button className="af-btn af-btn--ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="af-btn af-btn--primary" onClick={() => onSave({ coins: parseInt(coins) || 0, privet })}
            disabled={loading}>
            {loading ? <span className="af-spin" /> : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Send Modal ── */
function SendModal({ frame, onClose, onSend, loading }) {
  const [uid, setUid] = useState("");
  if (!frame) return null;
  return (
    <div className="af-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="af-modal af-modal--send">
        <div className="af-modal-icon af-modal-icon--green">🎁</div>
        <h3 className="af-modal-title">Send Avatar Frame</h3>
        <p className="af-modal-body">Send <strong>{frame.name}</strong> to a user by their UID.</p>
        <div className="af-edit-field" style={{ width:"100%" }}>
          <label className="af-edit-label">User UID</label>
          <input className="af-edit-input" type="number" min="0"
            value={uid} onChange={e => setUid(e.target.value)}
            placeholder="Enter UID…"
            onKeyDown={e => e.key === "Enter" && uid && onSend(parseInt(uid))} />
        </div>
        <div className="af-modal-btns">
          <button className="af-btn af-btn--ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="af-btn af-btn--green" onClick={() => onSend(parseInt(uid))}
            disabled={loading || !uid}>
            {loading ? <span className="af-spin" /> : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Image Lightbox ── */
function Lightbox({ url, name, onClose }) {
  if (!url) return null;
  return (
    <div className="af-overlay af-overlay--dark" onClick={onClose}>
      <div className="af-lightbox" onClick={e => e.stopPropagation()}>
        <button className="af-lightbox-close" onClick={onClose}>✕</button>
        <p className="af-lightbox-name">{name}</p>
        <img src={url} alt={name} className="af-lightbox-img" />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ADD FRAME MODAL — saves to Gifts class (categories=avatar_frame)
   Fields: name, coins, file (SVGA), preview (PNG/JPG), privet
════════════════════════════════════════════════════════════ */
function DropZone({ label, accept, file, onFile, onClear, hint }) {
  const inputRef = React.useRef(null);
  const [drag, setDrag] = useState(false);

  const previewSrc = file && file.type && file.type.startsWith("image/")
    ? URL.createObjectURL(file) : null;

  const handleDrop = e => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  return (
    <div className="af-add-field">
      <label className="af-add-label">{label}</label>
      <div
        className={`af-dz ${drag ? "af-dz--drag" : ""} ${file ? "af-dz--filled" : ""}`}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}>
        <input ref={inputRef} type="file" accept={accept} style={{ display:"none" }}
          onChange={e => { const f = e.target.files?.[0]; if(f) onFile(f); e.target.value=""; }} />
        {file ? (
          <div className="af-dz-filled">
            {previewSrc
              ? <img src={previewSrc} alt="preview" className="af-dz-img" />
              : <span className="af-dz-file-ico">📄</span>
            }
            <div className="af-dz-fname">{file.name}</div>
            <div className="af-dz-fsize">{file.size > 1e6 ? (file.size/1e6).toFixed(1)+"MB" : Math.round(file.size/1000)+"KB"}</div>
            <button className="af-dz-clr" onClick={e => { e.stopPropagation(); onClear(); }}>✕</button>
          </div>
        ) : (
          <div className="af-dz-empty">
            <span className="af-dz-ico">{label.includes("Preview") ? "🖼" : "🌀"}</span>
            <span className="af-dz-title">{drag ? "Drop here" : "Drag & drop or click"}</span>
            <span className="af-dz-hint">{hint}</span>
            <button className="af-dz-browse" type="button"
              onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}>
              Browse files
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AddFrameModal({ onClose, onAdded }) {
  const [name,       setName]       = useState("");
  const [coins,      setCoins]      = useState("");
  const [privet,     setPrivet]     = useState(false);
  const [svgaFile,   setSvgaFile]   = useState(null);
  const [previewImg, setPreviewImg] = useState(null);
  const [errors,     setErrors]     = useState({});
  const [saving,     setSaving]     = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [progMsg,    setProgMsg]    = useState("");

  const clearErr = k => setErrors(p => { const n={...p}; delete n[k]; return n; });

  const validate = () => {
    const e = {};
    if (!name.trim())                                  e.name     = "Frame name is required";
    if (!coins || isNaN(Number(coins)) || Number(coins)<0) e.coins = "Enter a valid coin amount";
    if (!svgaFile)                                     e.svga     = "SVGA file is required";
    if (!previewImg)                                   e.preview  = "Preview image is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true); setProgress(5); setProgMsg("Preparing…");
    try {
      /* 1. Upload SVGA */
      setProgress(15); setProgMsg("Uploading SVGA…");
      const svgaPF = new Parse.File(svgaFile.name.replace(/\s+/g,"_"), svgaFile);
      await svgaPF.save();
      setProgress(50);

      /* 2. Upload preview image */
      setProgress(55); setProgMsg("Uploading preview image…");
      const prevPF = new Parse.File(previewImg.name.replace(/\s+/g,"_"), previewImg);
      await prevPF.save();
      setProgress(85);

      /* 3. Save Gifts record */
      setProgMsg("Saving…");
      const Gifts = Parse.Object.extend("Gifts");
      const obj   = new Gifts();
      obj.set("name",       name.trim());
      obj.set("coins",      parseInt(coins) || 0);
      obj.set("categories", "avatar_frame");
      obj.set("privet",     privet);
      obj.set("file",       svgaPF);      /* SVGA animation */
      obj.set("preview",    prevPF);      /* PNG preview */
      await obj.save(null, { useMasterKey: true });

      setProgress(100); setProgMsg("Done!");
      onAdded({
        objectId:  obj.id,
        name:      name.trim(),
        coins:     parseInt(coins) || 0,
        categories:"avatar_frame",
        privet,
        imageUrl:  prevPF.url(),
        createdAt: obj.get("createdAt"),
      });
    } catch(e) {
      setErrors(p => ({ ...p, save: e.message || "Upload failed" }));
      setProgress(0); setProgMsg("");
    } finally { setSaving(false); }
  };

  /* checklist */
  const checks = [
    { label:"Name",   done: !!name.trim() },
    { label:"Coins",  done: !!coins && !isNaN(Number(coins)) },
    { label:"SVGA",   done: !!svgaFile },
    { label:"Preview",done: !!previewImg },
  ];
  const allReady = checks.every(c => c.done);
  const previewSrc = previewImg && previewImg.type?.startsWith("image/")
    ? URL.createObjectURL(previewImg) : null;

  return (
    <div className="af-overlay af-overlay--add" onClick={e => e.target===e.currentTarget && !saving && onClose()}>
      <div className="af-add-modal">
        {/* Header */}
        <div className="af-add-hdr">
          <div className="af-add-hdr-left">
            <div className="af-add-hdr-ico">🖼</div>
            <div>
              <h2 className="af-add-title">Add Avatar Frame</h2>
              <p className="af-add-sub">Upload SVGA animation + preview image to Gifts</p>
            </div>
          </div>
          <button className="af-add-close" onClick={onClose} disabled={saving}>✕</button>
        </div>

        {/* Body: two columns */}
        <div className="af-add-body">

          {/* ── LEFT: form ── */}
          <div className="af-add-form">

            {/* Name */}
            <div className="af-add-field">
              <label className="af-add-label">Frame Name <span className="af-add-req">*</span></label>
              <input className={`af-add-input ${errors.name?"af-add-input--err":""}`}
                type="text" placeholder="e.g. Galaxy Halo, Golden Ring…" maxLength={80}
                value={name} onChange={e => { setName(e.target.value); clearErr("name"); }} />
              {errors.name && <span className="af-add-err">{errors.name}</span>}
            </div>

            {/* Coins */}
            <div className="af-add-field">
              <label className="af-add-label">Coins / Credits <span className="af-add-req">*</span></label>
              <div className="af-add-coin-wrap">
                <span className="af-add-coin-ico">🪙</span>
                <input className={`af-add-input af-add-input--coin ${errors.coins?"af-add-input--err":""}`}
                  type="number" min="0" step="1" placeholder="e.g. 50"
                  value={coins} onChange={e => { setCoins(e.target.value); clearErr("coins"); }} />
              </div>
              {errors.coins && <span className="af-add-err">{errors.coins}</span>}
            </div>

            {/* Private toggle */}
            <div className="af-add-field af-add-field--row">
              <span className="af-add-label">Private</span>
              <div className="af-add-tog-wrap">
                <label className="af-switch">
                  <input type="checkbox" checked={privet} onChange={e => setPrivet(e.target.checked)} />
                  <span className="af-switch-track" />
                </label>
                <span className={`af-add-tog-val ${privet?"on":""}`}>{privet?"Yes":"No"}</span>
              </div>
            </div>

            {/* SVGA Drop */}
            <DropZone
              label="SVGA File *"
              accept=".svga,application/octet-stream"
              file={svgaFile}
              onFile={f => { setSvgaFile(f); clearErr("svga"); }}
              onClear={() => setSvgaFile(null)}
              hint=".svga format only"
            />
            {errors.svga && <span className="af-add-err">{errors.svga}</span>}

            {/* Preview Image Drop */}
            <DropZone
              label="Preview Image *"
              accept="image/png,image/jpeg,image/webp,image/gif"
              file={previewImg}
              onFile={f => { setPreviewImg(f); clearErr("preview"); }}
              onClear={() => setPreviewImg(null)}
              hint="PNG, JPG or WEBP"
            />
            {errors.preview && <span className="af-add-err">{errors.preview}</span>}

            {/* Save error */}
            {errors.save && (
              <div className="af-add-save-err">✗ {errors.save}</div>
            )}
          </div>

          {/* ── RIGHT: live preview ── */}
          <div className="af-add-side">
            <div className="af-add-preview-card">
              <div className="af-add-preview-hdr">
                <span className="af-add-live-dot" />
                <span className="af-add-preview-title">Live Preview</span>
              </div>
              <div className="af-add-preview-body">
                {/* Mock frame card */}
                <div className="af-add-mock">
                  <div className={`af-add-mock-thumb ${previewSrc?"has-img":""}`}>
                    {previewSrc
                      ? <img src={previewSrc} alt="preview" />
                      : <span>🖼</span>
                    }
                  </div>
                  <div className="af-add-mock-info">
                    <div className={`af-add-mock-name ${!name.trim()?"empty":""}`}>
                      {name.trim() || "Frame name…"}
                    </div>
                    {coins && !isNaN(Number(coins)) && (
                      <div className="af-add-mock-coins">🪙 {Number(coins).toLocaleString()}</div>
                    )}
                    <span className={`af-priv-badge ${privet?"on":""} af-add-mock-priv`}>
                      {privet ? "Private" : "Public"}
                    </span>
                  </div>
                </div>

                {/* Checklist */}
                <div className="af-add-checks">
                  <div className="af-add-checks-title">Completion</div>
                  {checks.map(c => (
                    <div key={c.label} className={`af-add-check ${c.done?"done":""}`}>
                      <span className="af-add-check-ico">{c.done?"✓":""}</span>
                      {c.label}
                    </div>
                  ))}
                </div>

                {allReady && <div className="af-add-ready">Ready to save!</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {saving && (
          <div className="af-add-prog">
            <div className="af-add-prog-bar">
              <div className="af-add-prog-fill" style={{ width: progress+"%" }} />
            </div>
            <div className="af-add-prog-row">
              <span>{progMsg}</span>
              <span>{progress}%</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="af-add-footer">
          <span className="af-add-foot-hint">Fields marked <strong>*</strong> are required</span>
          <div className="af-add-foot-btns">
            <button className="af-btn af-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="af-btn af-btn--add-save" onClick={handleSave} disabled={saving}>
              {saving ? <><span className="af-spin" /> Uploading…</> : "Save Frame"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function FrameCard({ frame, onEdit, onDelete, onSend, onView, idx }) {
  return (
    <div className="af-card" style={{ animationDelay: `${idx * 45}ms` }}>
      {/* Preview */}
      <div className="af-card-preview" onClick={() => frame.imageUrl && !isSvga(frame.imageUrl) && onView(frame)}>
        {frame.imageUrl && !isSvga(frame.imageUrl)
          ? <img src={frame.imageUrl} alt={frame.name} className="af-card-img" />
          : frame.imageUrl && isSvga(frame.imageUrl)
            ? <div className="af-card-svga">SVGA</div>
            : <div className="af-card-no-img">No Image</div>
        }
        {frame.imageUrl && !isSvga(frame.imageUrl) && (
          <div className="af-card-view-overlay">👁 View</div>
        )}
      </div>

      {/* Info */}
      <div className="af-card-body">
        <h3 className="af-card-name">{frame.name || "—"}</h3>
        <div className="af-card-meta">
          <span className="af-card-meta-item">
            <span className="af-meta-label">Coins</span>
            <span className="af-meta-val af-meta-val--gold">🪙 {(frame.coins||0).toLocaleString()}</span>
          </span>
          <span className="af-card-meta-item">
            <span className="af-meta-label">Private</span>
            <span className={`af-priv-badge ${frame.privet ? "on" : ""}`}>{frame.privet ? "Yes" : "No"}</span>
          </span>
          <span className="af-card-meta-item">
            <span className="af-meta-label">Created</span>
            <span className="af-meta-val">{fmtDate(frame.createdAt)}</span>
          </span>
        </div>
        <div className="af-card-id">
          <span className="af-card-id-label">ID</span>
          <span className="af-card-id-val">{frame.objectId}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="af-card-actions">
        <button className="af-act af-act--edit"   onClick={() => onEdit(frame)}>Edit</button>
        <button className="af-act af-act--send"   onClick={() => onSend(frame)}>Send</button>
        <button className="af-act af-act--delete" onClick={() => onDelete(frame)}>Delete</button>
      </div>
    </div>
  );
}

/* ── Frame Row (list view) ── */
function FrameRow({ frame, onEdit, onDelete, onSend, onView, idx }) {
  return (
    <tr className="af-row" style={{ animationDelay: `${idx * 25}ms` }}>
      <td className="af-td-img">
        {frame.imageUrl && !isSvga(frame.imageUrl)
          ? <img src={frame.imageUrl} alt={frame.name} className="af-row-img"
              onClick={() => onView(frame)} title="Click to view" />
          : frame.imageUrl
            ? <div className="af-row-svga">SVGA</div>
            : <div className="af-row-no-img">—</div>
        }
      </td>
      <td className="af-td-name">
        <span className="af-row-name">{frame.name || "—"}</span>
        <span className="af-row-id">{frame.objectId}</span>
      </td>
      <td className="af-td-cat">
        <span className="af-cat-badge">avatar_frame</span>
      </td>
      <td className="af-td-coins">
        <span className="af-coins-val">🪙 {(frame.coins||0).toLocaleString()}</span>
      </td>
      <td className="af-td-priv">
        <span className={`af-priv-badge ${frame.privet ? "on" : ""}`}>{frame.privet ? "Yes" : "No"}</span>
      </td>
      <td className="af-td-date">
        <span className="af-date">{fmtDate(frame.createdAt)}</span>
      </td>
      <td className="af-td-acts">
        <button className="af-rb af-rb--edit"   onClick={() => onEdit(frame)}>Edit</button>
        <button className="af-rb af-rb--send"   onClick={() => onSend(frame)}>Send</button>
        <button className="af-rb af-rb--delete" onClick={() => onDelete(frame)}>Delete</button>
      </td>
    </tr>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
export default function AllAvatarFrames() {
  const [frames,      setFrames]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [actionLoad,  setActionLoad]  = useState(null);
  const [toast,       setToast]       = useState(null);
  const [view,        setView]        = useState("card");
  const [search,      setSearch]      = useState("");
  const [page,        setPage]        = useState(0);
  const [total,       setTotal]       = useState(0);
  const [showAdd,     setShowAdd]     = useState(false);

  /* modals */
  const [editFrame,    setEditFrame]    = useState(null);
  const [deleteFrame,  setDeleteFrame]  = useState(null);
  const [sendFrame,    setSendFrame]    = useState(null);
  const [lightbox,     setLightbox]     = useState(null);
  const [confirm,      setConfirm]      = useState(null);

  const show$ = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  /* ── fetch ── */
  const fetchFrames = useCallback(async (pg = 0) => {
    setLoading(true);
    try {
      const q = new Parse.Query("Gifts");
      q.equalTo("categories", "avatar_frame");
      q.descending("createdAt");
      q.limit(PAGE_SIZE);
      q.skip(pg * PAGE_SIZE);

      const cq = new Parse.Query("Gifts");
      cq.equalTo("categories", "avatar_frame");

      const [results, cnt] = await Promise.all([
        q.find({ useMasterKey: true }),
        cq.count({ useMasterKey: true }),
      ]);

      setTotal(cnt);
      setFrames(results.map(r => {
        const file = r.get("file");
        const prev = r.get("preview");
        // prefer preview (PNG) over SVGA
        const previewUrl = getFileUrl(prev) || null;
        const fileUrl    = getFileUrl(file) || null;
        const imageUrl   = previewUrl || (!isSvga(fileUrl) ? fileUrl : null) || fileUrl;
        return {
          objectId:  r.id,
          name:      r.get("name")       || "—",
          coins:     r.get("coins")      ?? 0,
          categories:r.get("categories") || "",
          privet:    !!r.get("privet"),
          imageUrl,
          rawFile:   file,
          createdAt: r.get("createdAt"),
          _obj:      r,
        };
      }));
    } catch(e) { show$("Load failed: " + e.message, "error"); }
    finally    { setLoading(false); }
  }, [show$]);

  useEffect(() => { fetchFrames(page); }, [fetchFrames, page]);

  /* ── filtered list (client-side search on loaded page) ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return frames;
    return frames.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.objectId.toLowerCase().includes(q) ||
      String(f.coins).includes(q)
    );
  }, [frames, search]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  /* ════ ACTIONS ════ */

  /* Edit — update coins + privet */
  const handleEdit = async ({ coins, privet }) => {
    if (!editFrame) return;
    setActionLoad("edit");
    try {
      const q   = new Parse.Query("Gifts");
      const obj = await q.get(editFrame.objectId, { useMasterKey: true });
      obj.set("coins",  coins);
      obj.set("privet", privet);
      await obj.save(null, { useMasterKey: true });
      setFrames(p => p.map(f =>
        f.objectId === editFrame.objectId ? { ...f, coins, privet } : f
      ));
      setEditFrame(null);
      show$(`${editFrame.name} updated successfully`, "success");
    } catch(e) { show$("Update failed: " + e.message, "error"); }
    finally    { setActionLoad(null); }
  };

  /* Delete */
  const handleDelete = async () => {
    if (!deleteFrame) return;
    setActionLoad("delete");
    try {
      const q   = new Parse.Query("Gifts");
      const obj = await q.get(deleteFrame.objectId, { useMasterKey: true });
      await obj.destroy({ useMasterKey: true });
      setFrames(p => p.filter(f => f.objectId !== deleteFrame.objectId));
      setTotal(t => t - 1);
      setDeleteFrame(null);
      show$(`${deleteFrame.name} deleted`, "info");
    } catch(e) { show$("Delete failed: " + e.message, "error"); }
    finally    { setActionLoad(null); }
  };

  /* Send → creates ObtainedItems record (mirrors PHP exactly) */
  const handleSend = async (uid) => {
    if (!sendFrame || isNaN(uid)) return;
    setActionLoad("send");
    try {
      const mk = { useMasterKey: true };

      /* find user by UID */
      const uq = new Parse.Query("_User");
      uq.equalTo("uid", uid);
      const user = await uq.first(mk);
      if (!user) { show$(`User with UID ${uid} not found`, "error"); setActionLoad(null); return; }

      /* get the gift object */
      const gq  = new Parse.Query("Gifts");
      const gift = await gq.get(sendFrame.objectId, mk);

      /* create ObtainedItems record (+30 days expiry) */
      const ObtainedItems = Parse.Object.extend("ObtainedItems");
      const item = new ObtainedItems();
      item.set("author_id",       user.id);
      item.set("author",          user);
      item.set("item",            gift);
      item.set("item_id",         sendFrame.objectId);
      item.set("category",        "avatar_frame");
      const exp = new Date();
      exp.setDate(exp.getDate() + 30);
      item.set("expiration_date", exp);
      await item.save(null, mk);

      setSendFrame(null);
      show$(`Avatar frame sent to UID ${uid} successfully`, "success");
    } catch(e) { show$("Send failed: " + e.message, "error"); }
    finally    { setActionLoad(null); }
  };

  /* ════ RENDER ════ */
  return (
    <div className="af-root">
      <Toast toast={toast} />

      {/* Modals */}
      {showAdd && (
        <AddFrameModal
          onClose={() => setShowAdd(false)}
          onAdded={newFrame => {
            setFrames(p => [newFrame, ...p]);
            setTotal(t => t + 1);
            setShowAdd(false);
            show$(`"${newFrame.name}" added successfully`, "success");
          }}
        />
      )}
      <EditModal
        frame={editFrame}
        onClose={() => setEditFrame(null)}
        onSave={handleEdit}
        loading={actionLoad === "edit"}
      />
      <SendModal
        frame={sendFrame}
        onClose={() => setSendFrame(null)}
        onSend={handleSend}
        loading={actionLoad === "send"}
      />
      <ConfirmModal
        data={deleteFrame ? {
          title: "Delete Avatar Frame",
          body: `Delete <strong>${deleteFrame.name}</strong>? This cannot be undone.`,
          ok: "Yes, Delete",
          danger: true,
        } : null}
        onClose={() => setDeleteFrame(null)}
        onConfirm={handleDelete}
        loading={actionLoad === "delete"}
      />
      {lightbox && (
        <Lightbox url={lightbox.url} name={lightbox.name} onClose={() => setLightbox(null)} />
      )}

      {/* ── Header ── */}
      <div className="af-header">
        <div className="af-header-left">
          <div className="af-header-icon">🖼</div>
          <div>
            <h1 className="af-title">Avatar Frames</h1>
            <p className="af-subtitle">
              {loading ? "Loading…" : `${total.toLocaleString()} frames in total`}
            </p>
          </div>
        </div>
        <div className="af-header-right">
          <button className="af-btn-add" onClick={() => setShowAdd(true)}>
            + Add Frame
          </button>
          <div className="af-view-tog">
            <button className={`af-vtb ${view==="card"?"on":""}`} onClick={() => setView("card")}>
              ⊞ Cards
            </button>
            <button className={`af-vtb ${view==="list"?"on":""}`} onClick={() => setView("list")}>
              ☰ List
            </button>
          </div>
          <button className="af-refresh" onClick={() => fetchFrames(page)} disabled={loading}>
            {loading ? <span className="af-spin" /> : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="af-toolbar">
        <div className="af-search-wrap">
          <span className="af-search-ico">⌕</span>
          <input className="af-search" placeholder="Search name, ID or coins…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
          {search && (
            <button className="af-search-x" onClick={() => setSearch("")}>✕</button>
          )}
        </div>
        <span className="af-count">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="af-loading">
          <div className="af-spinner" /><div className="af-spinner af-spinner--2" />
          <p>Loading avatar frames…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="af-empty">
          <span className="af-empty-icon">🖼</span>
          <p>{search ? `No results for "${search}"` : "No avatar frames found"}</p>
          {search && <button className="af-btn af-btn--ghost af-btn--sm" onClick={() => setSearch("")}>Clear</button>}
        </div>
      ) : view === "card" ? (
        /* ── CARD VIEW ── */
        <div className="af-cards-grid">
          {filtered.map((f, i) => (
            <FrameCard key={f.objectId} frame={f} idx={i}
              onEdit={setEditFrame}
              onDelete={setDeleteFrame}
              onSend={setSendFrame}
              onView={fr => setLightbox({ url: fr.imageUrl, name: fr.name })}
            />
          ))}
        </div>
      ) : (
        /* ── LIST VIEW ── */
        <div className="af-table-wrap">
          <table className="af-table">
            <thead>
              <tr>
                <th className="af-th-img">Preview</th>
                <th>Name / ID</th>
                <th className="af-th-hide">Category</th>
                <th>Coins</th>
                <th>Private</th>
                <th className="af-th-hide">Date</th>
                <th className="af-th-act">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, i) => (
                <FrameRow key={f.objectId} frame={f} idx={i}
                  onEdit={setEditFrame}
                  onDelete={setDeleteFrame}
                  onSend={setSendFrame}
                  onView={fr => setLightbox({ url: fr.imageUrl, name: fr.name })}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && !loading && (
        <div className="af-pag">
          <button className="af-pb" disabled={page===0} onClick={() => setPage(0)}>«</button>
          <button className="af-pb" disabled={page===0} onClick={() => setPage(p => Math.max(0,p-1))}>‹</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = totalPages <= 7 ? i
              : page < 4 ? i
              : page > totalPages - 5 ? totalPages - 7 + i
              : page - 3 + i;
            return (
              <button key={p} className={`af-pb ${page===p?"on":""}`} onClick={() => setPage(p)}>
                {p + 1}
              </button>
            );
          })}
          <button className="af-pb" disabled={page===totalPages-1} onClick={() => setPage(p => Math.min(totalPages-1,p+1))}>›</button>
          <button className="af-pb" disabled={page===totalPages-1} onClick={() => setPage(totalPages-1)}>»</button>
          <span className="af-pinfo">Page {page+1}/{totalPages}</span>
        </div>
      )}
    </div>
  );
}