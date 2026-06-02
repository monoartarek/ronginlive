import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Parse from "../../parseConfig";
import "./AddNewEntranceEffect.css";

/* ═══════════════════════════════════════════════════════════
   AllEntranceEffects.jsx
   Parse class : "Gifts" where categories === "entrance_effect"
   Fields      : name, coins, file (Parse.File), categories,
                 privet (bool), createdAt
   Actions     :
     Edit   → coins + privet on Gifts record
     Delete → destroy Gifts record
     Send   → ObtainedItems { author_id, author, item, item_id,
                               category:"entrance_effect", expiration_date+30d }
     Add    → new Gifts record with categories:"entrance_effect"
═══════════════════════════════════════════════════════════ */

const PAGE_SIZE  = 20;
const CATEGORY   = "entrance_effect";

/* ─── helpers ─── */
const fmtDate = d => d
  ? new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"2-digit", year:"numeric" })
  : "—";

const getFileUrl = f => {
  if (!f) return null;
  if (typeof f === "string") return f;
  if (typeof f.url === "function") return f.url();
  if (f._url) return f._url;
  return null;
};

const isSvga = url => !!(url && url.toLowerCase().endsWith(".svga"));

const fmtSize = b => {
  if (!b) return "";
  return b >= 1e6 ? (b/1e6).toFixed(1)+"MB" : Math.round(b/1000)+"KB";
};

/* ═══════════════════════════════════════════════════════════
   SHARED UI ATOMS
═══════════════════════════════════════════════════════════ */

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`ee-toast ee-toast--${toast.type}`}>
      <span className="ee-toast-dot" />
      {toast.msg}
    </div>
  );
}

function Spin() { return <span className="ee-spin" />; }

function ConfirmModal({ data, onClose, onConfirm, loading }) {
  if (!data) return null;
  return (
    <div className="ee-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="ee-modal">
        <div className={`ee-modal-icon ${data.danger?"ee-modal-icon--red":"ee-modal-icon--cyan"}`}>
          {data.danger ? "⚠" : "✓"}
        </div>
        <h3 className="ee-modal-title">{data.title}</h3>
        <p className="ee-modal-body" dangerouslySetInnerHTML={{ __html: data.body }} />
        <div className="ee-modal-btns">
          <button className="ee-btn ee-btn--ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className={`ee-btn ${data.danger?"ee-btn--red":"ee-btn--cyan"}`}
            onClick={onConfirm} disabled={loading}>
            {loading ? <Spin/> : data.ok}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Toggle switch ─── */
function Toggle({ checked, onChange }) {
  return (
    <label className="ee-switch">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="ee-switch-track" />
    </label>
  );
}

/* ─── Private badge ─── */
function PrivBadge({ on }) {
  return <span className={`ee-priv-badge${on?" on":""}`}>{on?"Private":"Public"}</span>;
}

/* ═══════════════════════════════════════════════════════════
   EDIT MODAL
═══════════════════════════════════════════════════════════ */
function EditModal({ item, onClose, onSave, loading }) {
  const [coins,  setCoins]  = useState(item?.coins ?? 0);
  const [privet, setPrivet] = useState(!!item?.privet);
  useEffect(() => { if(item){ setCoins(item.coins??0); setPrivet(!!item.privet); } }, [item]);
  if (!item) return null;
  return (
    <div className="ee-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="ee-modal ee-modal--edit">
        <h3 className="ee-modal-title">Edit Entrance Effect</h3>
        <p className="ee-modal-sub">{item.name}</p>
        {item.fileUrl && (
          <div className="ee-edit-prev">
            {isSvga(item.fileUrl)
              ? <div className="ee-edit-prev-ph"><span>🌀</span><p>SVGA Animation</p></div>
              : <img src={item.fileUrl} alt={item.name} className="ee-edit-prev-img" />
            }
          </div>
        )}
        <div className="ee-edit-fields">
          <div className="ee-edit-field">
            <label className="ee-edit-label">Coins / Credits</label>
            <div className="ee-coin-wrap">
              <span className="ee-coin-ico">🪙</span>
              <input className="ee-edit-input ee-edit-input--coin" type="number" min="0"
                value={coins} onChange={e => setCoins(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="ee-edit-field ee-edit-field--row">
            <span className="ee-edit-label">Private</span>
            <div className="ee-tog-row">
              <Toggle checked={privet} onChange={setPrivet} />
              <span className={`ee-tog-val${privet?" on":""}`}>{privet?"Yes":"No"}</span>
            </div>
          </div>
        </div>
        <div className="ee-modal-btns">
          <button className="ee-btn ee-btn--ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="ee-btn ee-btn--primary" onClick={() => onSave({ coins:parseInt(coins)||0, privet })} disabled={loading}>
            {loading ? <Spin/> : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SEND MODAL
═══════════════════════════════════════════════════════════ */
function SendModal({ item, onClose, onSend, loading }) {
  const [uid, setUid] = useState("");
  if (!item) return null;
  return (
    <div className="ee-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="ee-modal ee-modal--send">
        <div className="ee-modal-icon ee-modal-icon--cyan">🎁</div>
        <h3 className="ee-modal-title">Send Entrance Effect</h3>
        <p className="ee-modal-body">Send <strong>{item.name}</strong> to a user by their UID (+30 day expiry).</p>
        <div className="ee-edit-field" style={{width:"100%"}}>
          <label className="ee-edit-label">User UID</label>
          <input className="ee-edit-input" type="number" min="0" placeholder="Enter UID…"
            value={uid} onChange={e => setUid(e.target.value)}
            onKeyDown={e => e.key==="Enter" && uid && onSend(parseInt(uid))} />
        </div>
        <div className="ee-modal-btns">
          <button className="ee-btn ee-btn--ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="ee-btn ee-btn--cyan" onClick={() => onSend(parseInt(uid))}
            disabled={loading||!uid}>
            {loading ? <Spin/> : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   LIGHTBOX
═══════════════════════════════════════════════════════════ */
function Lightbox({ url, name, onClose }) {
  if (!url) return null;
  return (
    <div className="ee-overlay ee-overlay--dark" onClick={onClose}>
      <div className="ee-lightbox" onClick={e => e.stopPropagation()}>
        <button className="ee-lightbox-close" onClick={onClose}>✕</button>
        <p className="ee-lightbox-name">{name}</p>
        <img src={url} alt={name} className="ee-lightbox-img" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DROP ZONE
═══════════════════════════════════════════════════════════ */
function DropZone({ label, accept, file, onFile, onClear, hint, icon }) {
  const ref  = useRef(null);
  const [drag, setDrag] = useState(false);
  const isImg = file && file.type && file.type.startsWith("image/");
  const src   = isImg ? URL.createObjectURL(file) : null;

  return (
    <div className="ee-add-field">
      <label className="ee-add-label">{label}</label>
      <div
        className={`ee-dz${drag?" ee-dz--drag":""}${file?" ee-dz--filled":""}`}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); const f=e.dataTransfer.files?.[0]; if(f) onFile(f); }}
        onClick={() => !file && ref.current?.click()}>
        <input ref={ref} type="file" accept={accept} style={{display:"none"}}
          onChange={e => { const f=e.target.files?.[0]; if(f) onFile(f); e.target.value=""; }} />
        {file ? (
          <div className="ee-dz-filled">
            {src
              ? <img src={src} alt="preview" className="ee-dz-img" />
              : <span className="ee-dz-file-ico">{icon}</span>
            }
            <span className="ee-dz-fname">{file.name}</span>
            <span className="ee-dz-fsize">{fmtSize(file.size)}</span>
            <span className="ee-dz-ready">✓ Ready</span>
            <button className="ee-dz-clr" onClick={e=>{e.stopPropagation();onClear();}}>✕</button>
          </div>
        ) : (
          <div className="ee-dz-empty">
            <span className="ee-dz-ico">{icon}</span>
            <span className="ee-dz-title">{drag?"Drop here":"Drag & drop or click"}</span>
            <span className="ee-dz-hint">{hint}</span>
            <button className="ee-dz-browse" type="button"
              onClick={e=>{e.stopPropagation();ref.current?.click();}}>
              Browse files
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ADD EFFECT MODAL
═══════════════════════════════════════════════════════════ */
function AddEffectModal({ onClose, onAdded }) {
  const [name,      setName]      = useState("");
  const [coins,     setCoins]     = useState("");
  const [privet,    setPrivet]    = useState(false);
  const [svgaFile,  setSvgaFile]  = useState(null);
  const [prevImg,   setPrevImg]   = useState(null);
  const [errors,    setErrors]    = useState({});
  const [saving,    setSaving]    = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [progMsg,   setProgMsg]   = useState("");

  const clrErr = k => setErrors(p => { const n={...p}; delete n[k]; return n; });

  const validate = () => {
    const e={};
    if (!name.trim())                                       e.name  = "Name is required";
    if (!coins||isNaN(Number(coins))||Number(coins)<0)      e.coins = "Enter a valid coin amount";
    if (!svgaFile)                                          e.svga  = "File is required";
    setErrors(e);
    return Object.keys(e).length===0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true); setProgress(5); setProgMsg("Preparing…");
    try {
      /* 1. Upload main file (SVGA or any) */
      setProgress(20); setProgMsg("Uploading effect file…");
      const filePF = new Parse.File(svgaFile.name.replace(/\s+/g,"_"), svgaFile);
      await filePF.save();
      setProgress(60);

      /* 2. Upload optional preview image */
      let prevPF = null;
      if (prevImg) {
        setProgress(65); setProgMsg("Uploading preview image…");
        prevPF = new Parse.File(prevImg.name.replace(/\s+/g,"_"), prevImg);
        await prevPF.save();
      }
      setProgress(85);

      /* 3. Save Gifts record */
      setProgMsg("Saving to database…");
      const Gifts = Parse.Object.extend("Gifts");
      const obj   = new Gifts();
      obj.set("name",       name.trim());
      obj.set("coins",      parseInt(coins)||0);
      obj.set("categories", CATEGORY);
      obj.set("privet",     privet);
      obj.set("file",       filePF);
      if (prevPF) obj.set("preview", prevPF);
      await obj.save(null, { useMasterKey:true });

      setProgress(100); setProgMsg("Done!");

      const fileUrl = getFileUrl(filePF);
      const previewUrl = prevPF ? getFileUrl(prevPF) : null;
      const imageUrl = previewUrl || (!isSvga(fileUrl) ? fileUrl : null) || fileUrl;

      onAdded({
        objectId:  obj.id,
        name:      name.trim(),
        coins:     parseInt(coins)||0,
        categories:CATEGORY,
        privet,
        fileUrl,
        imageUrl,
        createdAt: obj.get("createdAt"),
      });
    } catch(e) {
      setErrors(p => ({...p, save: e.message||"Upload failed"}));
      setProgress(0); setProgMsg("");
    } finally { setSaving(false); }
  };

  const checks = [
    { label:"Name",   done:!!name.trim() },
    { label:"Coins",  done:!!coins && !isNaN(Number(coins)) },
    { label:"File",   done:!!svgaFile },
  ];
  const allReady = checks.every(c=>c.done);
  const prevSrc  = prevImg && prevImg.type?.startsWith("image/")
    ? URL.createObjectURL(prevImg) : null;

  return (
    <div className="ee-overlay ee-overlay--add" onClick={e=>e.target===e.currentTarget&&!saving&&onClose()}>
      <div className="ee-add-modal">

        {/* Header */}
        <div className="ee-add-hdr">
          <div className="ee-add-hdr-left">
            <div className="ee-add-hdr-ico">✨</div>
            <div>
              <h2 className="ee-add-title">Add Entrance Effect</h2>
              <p className="ee-add-sub">Upload a new entrance effect to the Gifts library</p>
            </div>
          </div>
          <button className="ee-add-close" onClick={onClose} disabled={saving}>✕</button>
        </div>

        {/* Body */}
        <div className="ee-add-body">

          {/* ── Form column ── */}
          <div className="ee-add-form">

            <div className="ee-add-field">
              <label className="ee-add-label">Effect Name <span className="ee-add-req">*</span></label>
              <input className={`ee-add-input${errors.name?" ee-add-input--err":""}`}
                type="text" placeholder="e.g. Fireworks, Star Burst…" maxLength={80}
                value={name} onChange={e=>{setName(e.target.value);clrErr("name");}} />
              {errors.name && <span className="ee-add-err">{errors.name}</span>}
            </div>

            <div className="ee-add-field">
              <label className="ee-add-label">Coins / Credits <span className="ee-add-req">*</span></label>
              <div className="ee-coin-wrap">
                <span className="ee-coin-ico">🪙</span>
                <input className={`ee-add-input ee-add-input--coin${errors.coins?" ee-add-input--err":""}`}
                  type="number" min="0" placeholder="e.g. 80"
                  value={coins} onChange={e=>{setCoins(e.target.value);clrErr("coins");}} />
              </div>
              {errors.coins && <span className="ee-add-err">{errors.coins}</span>}
            </div>

            <div className="ee-add-field ee-add-field--row">
              <span className="ee-add-label">Private</span>
              <div className="ee-tog-row">
                <Toggle checked={privet} onChange={setPrivet} />
                <span className={`ee-tog-val${privet?" on":""}`}>{privet?"Yes":"No"}</span>
              </div>
            </div>

            <DropZone
              label="Effect File (SVGA) *"
              accept=".svga,application/octet-stream,video/*"
              file={svgaFile}
              onFile={f=>{setSvgaFile(f);clrErr("svga");}}
              onClear={()=>setSvgaFile(null)}
              hint=".svga · any animation file"
              icon="🌀"
            />
            {errors.svga && <span className="ee-add-err">{errors.svga}</span>}

            <DropZone
              label="Preview Image (optional)"
              accept="image/png,image/jpeg,image/webp,image/gif"
              file={prevImg}
              onFile={setPrevImg}
              onClear={()=>setPrevImg(null)}
              hint="PNG, JPG or WEBP thumbnail"
              icon="🖼"
            />

            {errors.save && <div className="ee-add-save-err">✗ {errors.save}</div>}
          </div>

          {/* ── Preview column ── */}
          <div className="ee-add-side">
            <div className="ee-add-preview-card">
              <div className="ee-add-prev-hdr">
                <span className="ee-add-live-dot" />
                <span className="ee-add-prev-title">Live Preview</span>
              </div>
              <div className="ee-add-prev-body">

                <div className="ee-add-mock">
                  <div className={`ee-add-mock-thumb${prevSrc?" has-img":svgaFile?" has-file":""}`}>
                    {prevSrc
                      ? <img src={prevSrc} alt="prev" />
                      : svgaFile
                        ? <span>🌀</span>
                        : <span>✨</span>
                    }
                  </div>
                  <div className="ee-add-mock-info">
                    <div className={`ee-add-mock-name${!name.trim()?" empty":""}`}>
                      {name.trim() || "Effect name…"}
                    </div>
                    {coins && !isNaN(Number(coins)) && (
                      <div className="ee-add-mock-coins">🪙 {Number(coins).toLocaleString()}</div>
                    )}
                    <PrivBadge on={privet} />
                  </div>
                </div>

                <div className="ee-add-checks">
                  <div className="ee-add-checks-ttl">Completion</div>
                  {checks.map(c => (
                    <div key={c.label} className={`ee-add-check${c.done?" done":""}`}>
                      <span className="ee-add-check-ico">{c.done?"✓":""}</span>
                      {c.label}
                    </div>
                  ))}
                </div>

                {allReady && <div className="ee-add-ready">Ready to save!</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Progress */}
        {saving && (
          <div className="ee-add-prog">
            <div className="ee-add-prog-bar">
              <div className="ee-add-prog-fill" style={{width:progress+"%"}} />
            </div>
            <div className="ee-add-prog-row">
              <span>{progMsg}</span><span>{progress}%</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="ee-add-footer">
          <span className="ee-add-foot-hint">Fields marked <strong>*</strong> are required</span>
          <div className="ee-add-foot-btns">
            <button className="ee-btn ee-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="ee-btn ee-btn--save" onClick={handleSave} disabled={saving}>
              {saving ? <><Spin/> Uploading…</> : "✨ Save Effect"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EFFECT CARD (card view)
═══════════════════════════════════════════════════════════ */
function EffectCard({ item, onEdit, onDelete, onSend, onView, idx }) {
  const hasImg = item.imageUrl && !isSvga(item.imageUrl);
  return (
    <div className="ee-card" style={{animationDelay:`${idx*40}ms`}}>

      <div className="ee-card-preview"
        onClick={() => hasImg && onView(item)}>
        {hasImg
          ? <img src={item.imageUrl} alt={item.name} className="ee-card-img" />
          : item.fileUrl
            ? <div className="ee-card-svga"><span>🌀</span><p>SVGA</p></div>
            : <div className="ee-card-noimg"><span>✨</span></div>
        }
        {hasImg && <div className="ee-card-view-ovr">👁 View</div>}
        <div className="ee-card-cat-badge">entrance_effect</div>
      </div>

      <div className="ee-card-body">
        <h3 className="ee-card-name">{item.name||"—"}</h3>
        <div className="ee-card-meta">
          <div className="ee-card-meta-row">
            <span className="ee-meta-lbl">Coins</span>
            <span className="ee-meta-val ee-meta-val--gold">🪙 {(item.coins||0).toLocaleString()}</span>
          </div>
          <div className="ee-card-meta-row">
            <span className="ee-meta-lbl">Private</span>
            <PrivBadge on={item.privet} />
          </div>
          <div className="ee-card-meta-row">
            <span className="ee-meta-lbl">Created</span>
            <span className="ee-meta-val">{fmtDate(item.createdAt)}</span>
          </div>
        </div>
        <div className="ee-card-id">
          <span className="ee-card-id-lbl">ID</span>
          <span className="ee-card-id-val">{item.objectId}</span>
        </div>
      </div>

      <div className="ee-card-actions">
        <button className="ee-act ee-act--edit"   onClick={()=>onEdit(item)}>Edit</button>
        <button className="ee-act ee-act--send"   onClick={()=>onSend(item)}>Send</button>
        <button className="ee-act ee-act--delete" onClick={()=>onDelete(item)}>Delete</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EFFECT ROW (list view)
═══════════════════════════════════════════════════════════ */
function EffectRow({ item, onEdit, onDelete, onSend, onView, idx }) {
  const hasImg = item.imageUrl && !isSvga(item.imageUrl);
  return (
    <tr className="ee-row" style={{animationDelay:`${idx*22}ms`}}>
      <td className="ee-td-img">
        {hasImg
          ? <img src={item.imageUrl} alt={item.name} className="ee-row-img"
              onClick={()=>onView(item)} title="Click to view"/>
          : item.fileUrl
            ? <div className="ee-row-svga">🌀</div>
            : <div className="ee-row-noimg">—</div>
        }
      </td>
      <td className="ee-td-name">
        <span className="ee-row-name">{item.name||"—"}</span>
        <span className="ee-row-id">{item.objectId}</span>
      </td>
      <td className="ee-td-cat ee-hide">
        <span className="ee-cat-badge">entrance_effect</span>
      </td>
      <td className="ee-td-coins">
        <span className="ee-coins-val">🪙 {(item.coins||0).toLocaleString()}</span>
      </td>
      <td className="ee-td-priv">
        <PrivBadge on={item.privet} />
      </td>
      <td className="ee-td-date ee-hide">
        <span className="ee-date">{fmtDate(item.createdAt)}</span>
      </td>
      <td className="ee-td-acts">
        <button className="ee-rb ee-rb--edit"   onClick={()=>onEdit(item)}>Edit</button>
        <button className="ee-rb ee-rb--send"   onClick={()=>onSend(item)}>Send</button>
        <button className="ee-rb ee-rb--delete" onClick={()=>onDelete(item)}>Delete</button>
      </td>
    </tr>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function AllEntranceEffects() {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [actLoad,    setActLoad]    = useState(null);
  const [toast,      setToast]      = useState(null);
  const [view,       setView]       = useState("card");
  const [search,     setSearch]     = useState("");
  const [page,       setPage]       = useState(0);
  const [total,      setTotal]      = useState(0);
  const [showAdd,    setShowAdd]    = useState(false);

  const [editItem,   setEditItem]   = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [sendItem,   setSendItem]   = useState(null);
  const [lightbox,   setLightbox]   = useState(null);

  const show$ = useCallback((msg, type="success") => {
    setToast({msg,type}); setTimeout(()=>setToast(null), 3200);
  }, []);

  /* ─── fetch ─── */
  const fetchItems = useCallback(async (pg=0) => {
    setLoading(true);
    try {
      const q  = new Parse.Query("Gifts");
      q.equalTo("categories", CATEGORY);
      q.descending("createdAt");
      q.limit(PAGE_SIZE); q.skip(pg*PAGE_SIZE);

      const cq = new Parse.Query("Gifts");
      cq.equalTo("categories", CATEGORY);

      const [results, cnt] = await Promise.all([
        q.find({useMasterKey:true}),
        cq.count({useMasterKey:true}),
      ]);

      setTotal(cnt);
      setItems(results.map(r => {
        const file = r.get("file");
        const prev = r.get("preview");
        const fileUrl    = getFileUrl(file)||null;
        const previewUrl = getFileUrl(prev)||null;
        const imageUrl   = previewUrl || (!isSvga(fileUrl)?fileUrl:null) || fileUrl;
        return {
          objectId:  r.id,
          name:      r.get("name")||"—",
          coins:     r.get("coins")??0,
          categories:r.get("categories")||"",
          privet:    !!r.get("privet"),
          fileUrl,
          imageUrl,
          createdAt: r.get("createdAt"),
        };
      }));
    } catch(e) { show$("Load failed: "+e.message, "error"); }
    finally    { setLoading(false); }
  }, [show$]);

  useEffect(() => { fetchItems(page); }, [fetchItems, page]);

  /* ─── client search ─── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.objectId.toLowerCase().includes(q) ||
      String(f.coins).includes(q)
    );
  }, [items, search]);

  const totalPages = Math.ceil(total/PAGE_SIZE);

  /* ─── edit ─── */
  const handleEdit = async ({coins, privet}) => {
    if (!editItem) return;
    setActLoad("edit");
    try {
      const q   = new Parse.Query("Gifts");
      const obj = await q.get(editItem.objectId, {useMasterKey:true});
      obj.set("coins",  coins);
      obj.set("privet", privet);
      await obj.save(null, {useMasterKey:true});
      setItems(p => p.map(f => f.objectId===editItem.objectId?{...f,coins,privet}:f));
      setEditItem(null);
      show$(`${editItem.name} updated`, "success");
    } catch(e) { show$("Update failed: "+e.message, "error"); }
    finally    { setActLoad(null); }
  };

  /* ─── delete ─── */
  const handleDelete = async () => {
    if (!deleteItem) return;
    setActLoad("delete");
    try {
      const q   = new Parse.Query("Gifts");
      const obj = await q.get(deleteItem.objectId, {useMasterKey:true});
      await obj.destroy({useMasterKey:true});
      setItems(p => p.filter(f => f.objectId!==deleteItem.objectId));
      setTotal(t => t-1);
      setDeleteItem(null);
      show$(`${deleteItem.name} deleted`, "info");
    } catch(e) { show$("Delete failed: "+e.message, "error"); }
    finally    { setActLoad(null); }
  };

  /* ─── send → ObtainedItems (category: entrance_effect) ─── */
  const handleSend = async uid => {
    if (!sendItem || isNaN(uid)) return;
    setActLoad("send");
    try {
      const mk = {useMasterKey:true};
      const uq = new Parse.Query("_User");
      uq.equalTo("uid", uid);
      const user = await uq.first(mk);
      if (!user) { show$(`User UID ${uid} not found`, "error"); setActLoad(null); return; }

      const gq   = new Parse.Query("Gifts");
      const gift = await gq.get(sendItem.objectId, mk);

      const OI   = Parse.Object.extend("ObtainedItems");
      const item = new OI();
      item.set("author_id",       user.id);
      item.set("author",          user);
      item.set("item",            gift);
      item.set("item_id",         sendItem.objectId);
      item.set("category",        "entrance_effect");   /* ← matches PHP exactly */
      const exp = new Date(); exp.setDate(exp.getDate()+30);
      item.set("expiration_date", exp);
      await item.save(null, mk);

      setSendItem(null);
      show$(`Effect sent to UID ${uid}`, "success");
    } catch(e) { show$("Send failed: "+e.message, "error"); }
    finally    { setActLoad(null); }
  };

  /* ─── render ─── */
  return (
    <div className="ee-root">
      <Toast toast={toast} />

      {/* Add modal */}
      {showAdd && (
        <AddEffectModal
          onClose={() => setShowAdd(false)}
          onAdded={newItem => {
            setItems(p => [newItem, ...p]);
            setTotal(t => t+1);
            setShowAdd(false);
            show$(`"${newItem.name}" added successfully`, "success");
          }}
        />
      )}

      {/* Edit modal */}
      <EditModal item={editItem} onClose={()=>setEditItem(null)}
        onSave={handleEdit} loading={actLoad==="edit"} />

      {/* Send modal */}
      <SendModal item={sendItem} onClose={()=>setSendItem(null)}
        onSend={handleSend} loading={actLoad==="send"} />

      {/* Delete confirm */}
      <ConfirmModal
        data={deleteItem?{
          title:"Delete Entrance Effect",
          body:`Delete <strong>${deleteItem.name}</strong>? This cannot be undone.`,
          ok:"Yes, Delete", danger:true,
        }:null}
        onClose={()=>setDeleteItem(null)}
        onConfirm={handleDelete}
        loading={actLoad==="delete"}
      />

      {/* Lightbox */}
      {lightbox && <Lightbox url={lightbox.url} name={lightbox.name} onClose={()=>setLightbox(null)}/>}

      {/* ── Page header ── */}
      <div className="ee-header">
        <div className="ee-header-left">
          <div className="ee-header-icon">✨</div>
          <div>
            <h1 className="ee-title">Entrance Effects</h1>
            <p className="ee-subtitle">
              {loading ? "Loading…" : `${total.toLocaleString()} effects in total`}
            </p>
          </div>
        </div>
        <div className="ee-header-right">
          <button className="ee-btn-add" onClick={()=>setShowAdd(true)}>
            + Add Effect
          </button>
          <div className="ee-view-tog">
            <button className={`ee-vtb${view==="card"?" on":""}`} onClick={()=>setView("card")}>
              ⊞ Cards
            </button>
            <button className={`ee-vtb${view==="list"?" on":""}`} onClick={()=>setView("list")}>
              ☰ List
            </button>
          </div>
          <button className="ee-refresh" onClick={()=>fetchItems(page)} disabled={loading}>
            {loading?<Spin/>:"↻ Refresh"}
          </button>
        </div>
      </div>

      {/* ── Search toolbar ── */}
      <div className="ee-toolbar">
        <div className="ee-search-wrap">
          <span className="ee-search-ico">⌕</span>
          <input className="ee-search" placeholder="Search name, ID or coins…"
            value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} />
          {search && <button className="ee-search-x" onClick={()=>setSearch("")}>✕</button>}
        </div>
        <span className="ee-count">{filtered.length} result{filtered.length!==1?"s":""}</span>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="ee-loading">
          <div className="ee-spinner"/><div className="ee-spinner ee-spinner--2"/>
          <p>Loading entrance effects…</p>
        </div>
      ) : filtered.length===0 ? (
        <div className="ee-empty">
          <span className="ee-empty-icon">✨</span>
          <p>{search?`No results for "${search}"`:"No entrance effects found"}</p>
          {search && <button className="ee-btn ee-btn--ghost ee-btn--sm" onClick={()=>setSearch("")}>Clear</button>}
        </div>
      ) : view==="card" ? (
        <div className="ee-cards-grid">
          {filtered.map((f,i) => (
            <EffectCard key={f.objectId} item={f} idx={i}
              onEdit={setEditItem} onDelete={setDeleteItem}
              onSend={setSendItem}
              onView={it=>setLightbox({url:it.imageUrl,name:it.name})}/>
          ))}
        </div>
      ) : (
        <div className="ee-table-wrap">
          <table className="ee-table">
            <thead>
              <tr>
                <th className="ee-th-img">Preview</th>
                <th>Name / ID</th>
                <th className="ee-hide">Category</th>
                <th>Coins</th>
                <th>Private</th>
                <th className="ee-hide">Date</th>
                <th className="ee-th-act">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f,i) => (
                <EffectRow key={f.objectId} item={f} idx={i}
                  onEdit={setEditItem} onDelete={setDeleteItem}
                  onSend={setSendItem}
                  onView={it=>setLightbox({url:it.imageUrl,name:it.name})}/>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages>1 && !loading && (
        <div className="ee-pag">
          <button className="ee-pb" disabled={page===0} onClick={()=>setPage(0)}>«</button>
          <button className="ee-pb" disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))}>‹</button>
          {Array.from({length:Math.min(totalPages,7)},(_,i)=>{
            const p = totalPages<=7?i:page<4?i:page>totalPages-5?totalPages-7+i:page-3+i;
            return <button key={p} className={`ee-pb${page===p?" on":""}`} onClick={()=>setPage(p)}>{p+1}</button>;
          })}
          <button className="ee-pb" disabled={page===totalPages-1} onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))}>›</button>
          <button className="ee-pb" disabled={page===totalPages-1} onClick={()=>setPage(totalPages-1)}>»</button>
          <span className="ee-pinfo">Page {page+1}/{totalPages}</span>
        </div>
      )}
    </div>
  );
}