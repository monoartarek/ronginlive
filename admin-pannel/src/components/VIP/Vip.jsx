import React, {
  useEffect, useState, useCallback, useRef, useMemo
} from "react";
import Parse from "../../parseConfig";
import "./Vip.css";

/* ═══════════════════════════════════════════════════════════════
   VipAssets.jsx  —  Parse class: "Vip_assets"
   Fields on each record:
     name, price,
     frame, frame_image, Medal, Medal_image,
     short_bg, short_bg_image, short_bg_header,
     chat_room_bubble, tags,
     floating_entry_image, floating_entry,
     mic, mic_image
   Actions:
     Add    → new Vip_assets record
     Edit   → price field only
     Delete → destroy record
     Replace file → set one file field + save
     Send VIP → creates 6 ObtainedItems rows + updates _User.vip_level
═══════════════════════════════════════════════════════════════ */

/* ─── constants ─── */
const FILE_FIELDS = [
  { key:"frame",                label:"Frame",            type:"svga",  icon:"🎬" },
  { key:"frame_image",          label:"Frame Image",      type:"image", icon:"🖼" },
  { key:"Medal",                label:"Medal",            type:"svga",  icon:"🎬" },
  { key:"Medal_image",          label:"Medal Image",      type:"image", icon:"🖼" },
  { key:"short_bg",             label:"Short BG",         type:"svga",  icon:"🎬" },
  { key:"short_bg_image",       label:"Short BG Img",     type:"image", icon:"🖼" },
  { key:"short_bg_header",      label:"BG Header",        type:"image", icon:"🖼" },
  { key:"chat_room_bubble",     label:"Chat Bubble",      type:"image", icon:"💬" },
  { key:"tags",                 label:"Tags",             type:"image", icon:"🏷" },
  { key:"floating_entry_image", label:"Float Entry Img",  type:"image", icon:"🖼" },
  { key:"floating_entry",       label:"Float Entry",      type:"svga",  icon:"🎬" },
  { key:"mic",                  label:"Mic",              type:"svga",  icon:"🎬" },
  { key:"mic_image",            label:"Mic Image",        type:"image", icon:"🎤" },
];

/* 6 slots sent to ObtainedItems (mirrors PHP switch case 0-5) */
const SEND_SLOTS = [
  { type:"vip_frame",            urlField:"frame" },
  { type:"vip_short_bg",         urlField:"short_bg" },
  { type:"vip_short_bg_header",  urlField:"short_bg_header" },
  { type:"vip_chat_room_bubble", urlField:"chat_room_bubble" },
  { type:"vip_floating_entrance",urlField:"floating_entry" },
  { type:"vip_mic",              urlField:"mic" },
];

/* ─── helpers ─── */
const getUrl = f => {
  if (!f) return null;
  if (typeof f === "string") return f;
  if (typeof f.url === "function") return f.url();
  if (f._url) return f._url;
  return null;
};
const fmtPrice = n => Number(n||0).toLocaleString();
const fmtDate  = d => d ? new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const ini = s  => (s||"?")[0].toUpperCase();
const avatarPalette = ["#6366f1","#f472b6","#34d399","#fbbf24","#f87171","#60a5fa","#a78bfa","#22d3ee"];
const aClr = s => { let h=0; for(let i=0;i<(s||"").length;i++) h=s.charCodeAt(i)+((h<<5)-h); return avatarPalette[Math.abs(h)%avatarPalette.length]; };

/* ─── map Parse object → plain JS ─── */
const mapItem = r => {
  const files = {};
  FILE_FIELDS.forEach(f => { files[f.key] = getUrl(r.get(f.key)); });
  return {
    objectId:  r.id,
    name:      r.get("name") || "—",
    price:     r.get("price") ?? 0,
    createdAt: r.get("createdAt"),
    files,
    _obj:      r,
  };
};

/* ─── Toast ─── */
function Toast({ t }) {
  if (!t) return null;
  const icons = { success:"✓", error:"✕", info:"ℹ", warn:"⚠" };
  return (
    <div className={`va-toast va-toast--${t.type}`}>
      <span className="va-toast-ico">{icons[t.type]||"•"}</span>
      <span>{t.msg}</span>
    </div>
  );
}

/* ─── Spinner ─── */
const Spin = () => <span className="va-spin"/>;

/* ─── Confirm Modal ─── */
function ConfirmModal({ data, onClose, onConfirm, loading }) {
  if (!data) return null;
  return (
    <div className="va-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="va-modal va-modal--confirm">
        <div className={`va-modal-ico ${data.danger?"va-modal-ico--red":"va-modal-ico--gold"}`}>
          {data.danger ? "🗑" : "✓"}
        </div>
        <h3 className="va-modal-title">{data.title}</h3>
        <p className="va-modal-body" dangerouslySetInnerHTML={{__html:data.body}}/>
        <div className="va-modal-btns">
          <button className="va-btn va-btn--ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className={`va-btn ${data.danger?"va-btn--red":"va-btn--gold"}`}
            onClick={onConfirm} disabled={loading}>
            {loading ? <Spin/> : data.ok}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Image Lightbox ─── */
function Lightbox({ src, title, onClose }) {
  useEffect(()=>{
    const h = e => e.key==="Escape" && onClose();
    document.addEventListener("keydown",h);
    return () => document.removeEventListener("keydown",h);
  },[onClose]);
  if (!src) return null;
  return (
    <div className="va-overlay va-overlay--dark" onClick={onClose}>
      <div className="va-lightbox" onClick={e=>e.stopPropagation()}>
        <button className="va-lightbox-close" onClick={onClose}>✕</button>
        <p className="va-lightbox-title">{title}</p>
        <img src={src} alt={title} className="va-lightbox-img"/>
      </div>
    </div>
  );
}

/* ─── File thumbnail ─── */
function FileTile({ fieldMeta, url, onView, onReplace }) {
  const fileRef = useRef(null);
  const hasFile = !!url;
  const isImg   = fieldMeta.type === "image";
  return (
    <div className={`va-tile ${hasFile?"va-tile--filled":""}`}
      title={fieldMeta.label}>
      <div className="va-tile-label">
        <span>{fieldMeta.icon}</span>
        <span className="va-tile-label-txt">{fieldMeta.label}</span>
      </div>
      <div className="va-tile-prev"
        onClick={()=> isImg && url && onView(url, fieldMeta.label)}>
        {isImg && url
          ? <img src={url} alt={fieldMeta.label} className="va-tile-img"/>
          : url
            ? <div className="va-tile-svga"><span>🎬</span><p>SVGA</p></div>
            : <div className="va-tile-empty">—</div>
        }
        {isImg && url && <div className="va-tile-zoom">🔍</div>}
      </div>
      <input ref={fileRef} type="file" style={{display:"none"}}
        accept={fieldMeta.type==="svga"?".svga":"image/png,image/webp,image/jpeg"}
        onChange={e=>{ const f=e.target.files?.[0]; if(f){ onReplace(f); e.target.value=""; }}}/>
      <button className="va-tile-replace"
        onClick={()=>fileRef.current?.click()}>
        ↑ Replace
      </button>
    </div>
  );
}

/* ─── Edit Price Modal ─── */
function EditPriceModal({ item, onClose, onSave, loading }) {
  const [price, setPrice] = useState(item?.price ?? 0);
  useEffect(()=>{ if(item) setPrice(item.price??0); },[item]);
  if (!item) return null;
  return (
    <div className="va-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="va-modal va-modal--edit">
        <h3 className="va-modal-title">Edit Price — <span style={{color:"var(--gold)"}}>{item.name}</span></h3>
        <div className="va-edit-field">
          <label className="va-edit-label">New Price (coins)</label>
          <div className="va-price-wrap">
            <span className="va-price-ico">💰</span>
            <input className="va-edit-input va-edit-input--gold" type="number" min="0"
              value={price} onChange={e=>setPrice(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&onSave(parseInt(price)||0)}
              autoFocus/>
          </div>
        </div>
        <div className="va-modal-btns">
          <button className="va-btn va-btn--ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="va-btn va-btn--gold" onClick={()=>onSave(parseInt(price)||0)} disabled={loading}>
            {loading ? <Spin/> : "Update Price"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Add Asset Modal ─── */
function AddAssetModal({ onClose, onAdded }) {
  const [name,    setName]    = useState("");
  const [price,   setPrice]   = useState("");
  const [files,   setFiles]   = useState({});
  const [saving,  setSaving]  = useState(false);
  const [progress,setProgress]= useState(0);
  const [progMsg, setProgMsg] = useState("");
  const [errors,  setErrors]  = useState({});

  const clrErr = k => setErrors(p=>{ const n={...p}; delete n[k]; return n; });

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Name is required";
    if (!price || isNaN(Number(price))) e.price = "Enter a valid price";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true); setProgress(5); setProgMsg("Uploading files…");
    try {
      const Vip = Parse.Object.extend("Vip_assets");
      const obj = new Vip();
      obj.set("name",  name.trim());
      obj.set("price", parseInt(price)||0);

      const fileKeys = Object.keys(files);
      let done = 0;
      for (const key of fileKeys) {
        const pf = new Parse.File(files[key].name.replace(/\s+/g,"_"), files[key]);
        await pf.save();
        obj.set(key, pf);
        done++;
        setProgress(Math.round(5+(done/Math.max(fileKeys.length,1))*80));
      }
      setProgMsg("Saving record…");
      await obj.save(null,{useMasterKey:true});
      setProgress(100); setProgMsg("Done!");

      const newFiles={};
      FILE_FIELDS.forEach(f=>{ newFiles[f.key]=files[f.key]?getUrl(obj.get(f.key)):null; });
      onAdded({
        objectId:obj.id, name:name.trim(), price:parseInt(price)||0,
        createdAt:obj.get("createdAt"), files:newFiles,
      });
    } catch(e) {
      setErrors(p=>({...p,save:e.message||"Save failed"}));
      setProgress(0); setProgMsg("");
    } finally { setSaving(false); }
  };

  return (
    <div className="va-overlay va-overlay--add" onClick={e=>e.target===e.currentTarget&&!saving&&onClose()}>
      <div className="va-add-modal">
        <div className="va-add-hdr">
          <div className="va-add-hdr-left">
            <div className="va-add-hdr-ico">👑</div>
            <div>
              <h2 className="va-add-title">New VIP Asset</h2>
              <p className="va-add-sub">Upload files for all slots</p>
            </div>
          </div>
          <button className="va-icon-btn" onClick={onClose} disabled={saving}>✕</button>
        </div>

        <div className="va-add-body">
          {/* Name + price */}
          <div className="va-add-row2">
            <div className="va-add-field">
              <label className="va-add-label">Name <span className="va-req">*</span></label>
              <input className={`va-edit-input${errors.name?" va-err-input":""}`}
                type="text" placeholder="e.g. VIP1, Diamond, Gold…" maxLength={60}
                value={name} onChange={e=>{setName(e.target.value);clrErr("name");}}/>
              {errors.name&&<span className="va-err-msg">{errors.name}</span>}
            </div>
            <div className="va-add-field">
              <label className="va-add-label">Price (coins) <span className="va-req">*</span></label>
              <div className="va-price-wrap">
                <span className="va-price-ico">💰</span>
                <input className={`va-edit-input va-edit-input--gold${errors.price?" va-err-input":""}`}
                  type="number" min="0" placeholder="5000"
                  value={price} onChange={e=>{setPrice(e.target.value);clrErr("price");}}/>
              </div>
              {errors.price&&<span className="va-err-msg">{errors.price}</span>}
            </div>
          </div>

          {/* File grid */}
          <div className="va-add-files-title">Asset Files</div>
          <div className="va-add-files-grid">
            {FILE_FIELDS.map(f => (
              <AddFileDrop key={f.key} field={f}
                file={files[f.key]}
                onFile={file=>setFiles(p=>({...p,[f.key]:file}))}
                onClear={()=>setFiles(p=>{ const n={...p}; delete n[f.key]; return n; })}/>
            ))}
          </div>

          {errors.save&&<div className="va-save-err">✗ {errors.save}</div>}
        </div>

        {saving && (
          <div className="va-add-prog">
            <div className="va-prog-bar"><div className="va-prog-fill" style={{width:progress+"%"}}/></div>
            <div className="va-prog-row"><span>{progMsg}</span><span>{progress}%</span></div>
          </div>
        )}

        <div className="va-add-footer">
          <span className="va-add-foot-hint">Fields marked <strong>*</strong> are required</span>
          <div className="va-add-foot-btns">
            <button className="va-btn va-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="va-btn va-btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? <><Spin/> Saving…</> : "👑 Save Asset"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Add file dropzone ─── */
function AddFileDrop({ field, file, onFile, onClear }) {
  const ref  = useRef(null);
  const [drag,setDrag] = useState(false);
  const src  = file && file.type?.startsWith("image/") ? URL.createObjectURL(file) : null;
  return (
    <div className="va-add-field">
      <label className="va-add-label">{field.icon} {field.label}</label>
      <div className={`va-dz${drag?" va-dz--drag":""}${file?" va-dz--filled":""}`}
        onDragOver={e=>{e.preventDefault();setDrag(true);}}
        onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files?.[0];if(f)onFile(f);}}
        onClick={()=>!file&&ref.current?.click()}>
        <input ref={ref} type="file" style={{display:"none"}}
          accept={field.type==="svga"?".svga":"image/png,image/webp,image/jpeg,image/gif"}
          onChange={e=>{const f=e.target.files?.[0];if(f)onFile(f);e.target.value="";}}/>
        {file ? (
          <div className="va-dz-filled">
            {src
              ? <img src={src} alt="" className="va-dz-prev"/>
              : <span className="va-dz-svga-ico">🎬</span>
            }
            <span className="va-dz-name">{file.name}</span>
            <button className="va-dz-clr" onClick={e=>{e.stopPropagation();onClear();}}>✕</button>
          </div>
        ):(
          <div className="va-dz-empty">
            <span className="va-dz-ico">{field.type==="svga"?"🎬":"🖼"}</span>
            <span className="va-dz-txt">{drag?"Drop!":"Click or drag"}</span>
            <span className="va-dz-ext">{field.type==="svga"?".svga":"PNG/WEBP"}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Send VIP Modal ─── */
function SendVipModal({ items, defaultItemId, onClose, onSent }) {
  const [vipId,      setVipId]      = useState(defaultItemId||"");
  const [uidInput,   setUidInput]   = useState("");
  const [duration,   setDuration]   = useState(15);
  const [foundUser,  setFoundUser]  = useState(null);
  const [lookLoading,setLookLoading]= useState(false);
  const [sending,    setSending]    = useState(false);
  const [error,      setError]      = useState("");

  /* user lookup via Parse SDK (mirrors ajax_lookup_user.php) */
  const lookupUser = async () => {
    const uid = parseInt(uidInput);
    if (!uid) { setError("Enter a valid UID"); return; }
    setLookLoading(true); setFoundUser(null); setError("");
    try {
      const q = new Parse.Query("_User");
      q.equalTo("uid", uid);
      q.select("uid","name","username","avatar","credit","vip_level");
      const u = await q.first({useMasterKey:true});
      if (!u) { setError(`No user found with UID ${uid}`); }
      else {
        const av = u.get("avatar");
        setFoundUser({
          objectId: u.id,
          uid:      u.get("uid"),
          name:     u.get("name")||u.get("username")||"—",
          username: u.get("username")||"—",
          avatar:   getUrl(av),
          credits:  u.get("credit")??0,
          vipLevel: u.get("vip_level")??0,
        });
      }
    } catch(e){ setError(e.message); }
    finally { setLookLoading(false); }
  };

  const handleSend = async () => {
    if (!vipId)      { setError("Select a VIP tier"); return; }
    if (!foundUser)  { setError("Look up a user first"); return; }
    setSending(true); setError("");
    try {
      const mk = {useMasterKey:true};

      /* fetch VIP asset */
      const vq   = new Parse.Query("Vip_assets");
      const vAsset = await vq.get(vipId, mk);
      const vName  = vAsset.get("name")||"";

      /* expiry date */
      const exp = new Date(); exp.setDate(exp.getDate()+duration);

      /* fetch target user */
      const uq   = new Parse.Query("_User");
      const tUser = await uq.get(foundUser.objectId, mk);

      /* create 6 ObtainedItems rows */
      const OI = Parse.Object.extend("ObtainedItems");
      await Promise.all(SEND_SLOTS.map(slot => {
        const fileObj = vAsset.get(slot.urlField);
        const fileUrl = getUrl(fileObj)||"";
        const oi = new OI();
        oi.set("author_id",           foundUser.objectId);
        oi.set("vip_name",            vName);
        oi.set("vip_type",            slot.type);
        oi.set("Vip_Item_Single_Url", fileUrl);
        oi.set("vip_item",            vAsset);
        oi.set("expiration_date",     exp);
        return oi.save(null, mk);
      }));

      /* update vip_level (only upgrade) */
      let vipLevel = 0;
      const m = vName.toLowerCase().match(/(\d+)/);
      if (m) vipLevel = parseInt(m[1]);
      if (vipLevel === 0) {
        const allQ = new Parse.Query("Vip_assets");
        allQ.ascending("createdAt");
        const all = await allQ.find(mk);
        vipLevel = all.findIndex(a=>a.id===vipId)+1;
      }
      const curLevel = parseInt(tUser.get("vip_level")||0);
      if (vipLevel > curLevel) tUser.set("vip_level", vipLevel);
      tUser.set("vip_duration", String(duration));
      tUser.set("vip_purcharge_rechage_time", new Date());
      await tUser.save(null, mk);

      onSent(foundUser.name, vName);
    } catch(e){ setError(e.message||"Send failed"); }
    finally { setSending(false); }
  };

  const aClrUser = foundUser ? aClr(foundUser.name) : "#6366f1";

  return (
    <div className="va-overlay va-overlay--send" onClick={e=>e.target===e.currentTarget&&!sending&&onClose()}>
      <div className="va-send-modal">
        <div className="va-send-hdr">
          <div className="va-send-hdr-left">
            <div className="va-send-hdr-ico">🚀</div>
            <div>
              <h2 className="va-send-title">Send VIP to User</h2>
              <p className="va-send-sub">Admin gift — no coins deducted</p>
            </div>
          </div>
          <button className="va-icon-btn" onClick={onClose} disabled={sending}>✕</button>
        </div>

        <div className="va-send-body">
          {/* Info note */}
          <div className="va-send-note">
            ℹ Sends all 6 VIP item slots (frame, short_bg, chat bubble, floating entry, mic, bg header) to
            <code>ObtainedItems</code> and updates the user's <code>vip_level</code>.
          </div>

          <div className="va-send-fields">
            {/* VIP tier */}
            <div className="va-add-field">
              <label className="va-add-label">VIP Tier <span className="va-req">*</span></label>
              <select className="va-select" value={vipId}
                onChange={e=>setVipId(e.target.value)}>
                <option value="">— Select VIP tier —</option>
                {items.map(it=>(
                  <option key={it.objectId} value={it.objectId}>
                    {it.name} · {fmtPrice(it.price)} coins
                  </option>
                ))}
              </select>
            </div>

            {/* User UID */}
            <div className="va-add-field">
              <label className="va-add-label">User UID <span className="va-req">*</span></label>
              <div className="va-uid-row">
                <input className="va-edit-input va-edit-input--teal" type="number" min="1"
                  placeholder="e.g. 426048" value={uidInput}
                  onChange={e=>{setUidInput(e.target.value);setFoundUser(null);setError("");}}
                  onKeyDown={e=>e.key==="Enter"&&lookupUser()}/>
                <button className="va-btn va-btn--teal va-btn--sm" onClick={lookupUser}
                  disabled={lookLoading||!uidInput}>
                  {lookLoading?<Spin/>:"🔍"}
                </button>
              </div>
              {/* User preview card */}
              {foundUser && (
                <div className="va-user-prev">
                  {foundUser.avatar
                    ? <img src={foundUser.avatar} alt={foundUser.name} className="va-user-prev-av"/>
                    : <div className="va-user-prev-av-init" style={{background:aClrUser}}>
                        {ini(foundUser.name)}
                      </div>
                  }
                  <div className="va-user-prev-info">
                    <span className="va-user-prev-name">{foundUser.name}</span>
                    <span className="va-user-prev-meta">
                      UID {foundUser.uid} · 💰 {Number(foundUser.credits).toLocaleString()} credits
                      {foundUser.vipLevel>0&&<> · VIP {foundUser.vipLevel}</>}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Duration */}
            <div className="va-add-field">
              <label className="va-add-label">Duration</label>
              <select className="va-select" value={duration}
                onChange={e=>setDuration(parseInt(e.target.value))}>
                <option value={15}>15 days</option>
                <option value={30}>30 days (1 month)</option>
                <option value={90}>90 days (3 months)</option>
                <option value={180}>180 days (6 months)</option>
                <option value={365}>365 days (1 year)</option>
              </select>
            </div>
          </div>

          {error && <div className="va-send-err">⚠ {error}</div>}
        </div>

        <div className="va-send-footer">
          <button className="va-btn va-btn--ghost" onClick={onClose} disabled={sending}>Cancel</button>
          <button className="va-btn va-btn--teal" onClick={handleSend}
            disabled={sending||!vipId||!foundUser}>
            {sending ? <><Spin/> Sending…</> : "🚀 Send VIP"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
export default function VipAssets() {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [actLoad,    setActLoad]    = useState(null);
  const [toast,      setToast]      = useState(null);
  const [view,       setView]       = useState("card");
  const [search,     setSearch]     = useState("");

  /* modals */
  const [showAdd,    setShowAdd]    = useState(false);
  const [showSend,   setShowSend]   = useState(false);
  const [sendItemId, setSendItemId] = useState("");
  const [editItem,   setEditItem]   = useState(null);
  const [confirm,    setConfirm]    = useState(null);
  const [lightbox,   setLightbox]   = useState(null);

  const show$ = useCallback((msg,type="success")=>{
    setToast({msg,type}); setTimeout(()=>setToast(null),3200);
  },[]);

  /* ─── fetch ─── */
  const fetchItems = useCallback(async()=>{
    setLoading(true);
    try {
      const q = new Parse.Query("Vip_assets");
      q.descending("createdAt");
      q.limit(200);
      const res = await q.find({useMasterKey:true});
      setItems(res.map(mapItem));
    } catch(e){ show$("Load failed: "+e.message,"error"); }
    finally { setLoading(false); }
  },[show$]);

  useEffect(()=>{ fetchItems(); },[fetchItems]);

  /* ─── search filter ─── */
  const filtered = useMemo(()=>{
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(it=>
      it.name.toLowerCase().includes(q)||
      it.objectId.toLowerCase().includes(q)||
      String(it.price).includes(q)
    );
  },[items,search]);

  /* ─── stats ─── */
  const stats = useMemo(()=>{
    let svga=0, img=0;
    items.forEach(it=>{
      FILE_FIELDS.forEach(f=>{
        if(it.files[f.key]) f.type==="svga"?svga++:img++;
      });
    });
    return { total:items.length, svga, img, all:svga+img };
  },[items]);

  /* ─── edit price ─── */
  const handleEditPrice = async (newPrice) => {
    if (!editItem) return;
    setActLoad("price");
    try {
      const q   = new Parse.Query("Vip_assets");
      const obj = await q.get(editItem.objectId,{useMasterKey:true});
      obj.set("price", newPrice);
      await obj.save(null,{useMasterKey:true});
      setItems(p=>p.map(it=>it.objectId===editItem.objectId?{...it,price:newPrice}:it));
      setEditItem(null);
      show$(`${editItem.name} price updated to ${fmtPrice(newPrice)} coins`,"success");
    } catch(e){ show$("Update failed: "+e.message,"error"); }
    finally { setActLoad(null); }
  };

  /* ─── replace file ─── */
  const handleReplaceFile = async (item, fieldKey, file) => {
    const loadKey = `${item.objectId}_${fieldKey}`;
    setActLoad(loadKey);
    try {
      const pf = new Parse.File(file.name.replace(/\s+/g,"_"), file);
      await pf.save();
      const q   = new Parse.Query("Vip_assets");
      const obj = await q.get(item.objectId,{useMasterKey:true});
      obj.set(fieldKey, pf);
      await obj.save(null,{useMasterKey:true});
      const newUrl = getUrl(pf);
      setItems(p=>p.map(it=>
        it.objectId===item.objectId
          ? {...it, files:{...it.files,[fieldKey]:newUrl}}
          : it
      ));
      const fieldLabel = FILE_FIELDS.find(f=>f.key===fieldKey)?.label||fieldKey;
      show$(`${item.name} — ${fieldLabel} replaced`,"success");
    } catch(e){ show$("Replace failed: "+e.message,"error"); }
    finally { setActLoad(null); }
  };

  /* ─── delete ─── */
  const handleDelete = async () => {
    const item = confirm?.item;
    if (!item) return;
    setActLoad("delete");
    try {
      const q   = new Parse.Query("Vip_assets");
      const obj = await q.get(item.objectId,{useMasterKey:true});
      await obj.destroy({useMasterKey:true});
      setItems(p=>p.filter(it=>it.objectId!==item.objectId));
      setConfirm(null);
      show$(`${item.name} deleted`,"info");
    } catch(e){ show$("Delete failed: "+e.message,"error"); }
    finally { setActLoad(null); }
  };

  /* ─── send VIP ─── */
  const handleSendDone = (userName, vipName) => {
    setShowSend(false);
    show$(`${vipName} sent to ${userName} ✓`,"success");
  };

  /* ─── quick send from card/row ─── */
  const quickSend = (id) => { setSendItemId(id); setShowSend(true); };

  /* ════ RENDER ════ */
  return (
    <div className="va-root">
      <Toast t={toast}/>

      {/* Modals */}
      {showAdd && (
        <AddAssetModal onClose={()=>setShowAdd(false)}
          onAdded={newItem=>{
            setItems(p=>[newItem,...p]);
            setShowAdd(false);
            show$(`"${newItem.name}" created`,"success");
          }}/>
      )}
      {showSend && (
        <SendVipModal items={items} defaultItemId={sendItemId}
          onClose={()=>{setShowSend(false);setSendItemId("");}}
          onSent={handleSendDone}/>
      )}
      <EditPriceModal item={editItem} onClose={()=>setEditItem(null)}
        onSave={handleEditPrice} loading={actLoad==="price"}/>
      <ConfirmModal
        data={confirm?{
          title:`Delete ${confirm.item.name}?`,
          body:`This VIP tier will be permanently removed.`,
          ok:"Delete", danger:true
        }:null}
        onClose={()=>setConfirm(null)}
        onConfirm={handleDelete}
        loading={actLoad==="delete"}/>
      {lightbox && <Lightbox src={lightbox.src} title={lightbox.title} onClose={()=>setLightbox(null)}/>}

      {/* ── Header ── */}
      <div className="va-header">
        <div className="va-header-left">
          <div className="va-header-icon">👑</div>
          <div>
            <h1 className="va-title">VIP Assets</h1>
            <p className="va-subtitle">Manage VIP tiers · frames · medals · animations</p>
          </div>
        </div>
        <div className="va-header-right">
          <button className="va-btn va-btn--teal" onClick={()=>{setSendItemId("");setShowSend(true);}}>
            🚀 Send VIP
          </button>
          <button className="va-btn va-btn--primary" onClick={()=>setShowAdd(true)}>
            + Add Asset
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="va-stats">
        {[
          {val:stats.total, lbl:"VIP Tiers",   color:"var(--gold)"},
          {val:stats.svga,  lbl:"SVGA Files",  color:"var(--violet)"},
          {val:stats.img,   lbl:"Image Assets", color:"var(--teal)"},
          {val:stats.all,   lbl:"Total Files",  color:"var(--blue)"},
        ].map((s,i)=>(
          <div key={i} className="va-stat">
            <span className="va-stat-val" style={{color:s.color}}>{s.val}</span>
            <span className="va-stat-lbl">{s.lbl}</span>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="va-toolbar">
        <div className="va-search-wrap">
          <span className="va-search-ico">⌕</span>
          <input className="va-search" placeholder="Search name, ID or price…"
            value={search} onChange={e=>setSearch(e.target.value)}/>
          {search&&<button className="va-search-x" onClick={()=>setSearch("")}>✕</button>}
        </div>
        <div className="va-toolbar-right">
          <span className="va-count">{filtered.length} asset{filtered.length!==1?"s":""}</span>
          <div className="va-view-tog">
            <button className={`va-vtb${view==="card"?" on":""}`} onClick={()=>setView("card")}>⊞</button>
            <button className={`va-vtb${view==="list"?" on":""}`} onClick={()=>setView("list")}>☰</button>
          </div>
          <button className="va-refresh" onClick={fetchItems} disabled={loading}>
            {loading?<Spin/>:"↻"}
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="va-loading">
          <div className="va-spinner"/><div className="va-spinner va-spinner--2"/>
          <p>Loading VIP assets…</p>
        </div>
      ) : filtered.length===0 ? (
        <div className="va-empty">
          <div className="va-empty-orb">👑</div>
          <h3>{search?`No results for "${search}"`:"No VIP Assets yet"}</h3>
          <p>{search ? "Try a different search term" : 'Click "+ Add Asset" to get started'}</p>
          {search&&<button className="va-btn va-btn--ghost va-btn--sm" onClick={()=>setSearch("")}>Clear</button>}
        </div>
      ) : view==="card" ? (
        /* ════ CARD VIEW ════ */
        <div className="va-cards-grid">
          {filtered.map((item,i)=>(
            <div key={item.objectId} className="va-card"
              style={{animationDelay:`${i*40}ms`}}>
              {/* Card header */}
              <div className="va-card-hd">
                <div>
                  <h2 className="va-card-name">{item.name}</h2>
                  <p className="va-card-id">{item.objectId}</p>
                </div>
                <button className="va-price-badge" onClick={()=>setEditItem(item)}>
                  💰 {fmtPrice(item.price)}
                </button>
              </div>

              {/* Date */}
              <div className="va-card-date">📅 {fmtDate(item.createdAt)}</div>

              {/* File tiles */}
              <div className="va-tiles-grid">
                {FILE_FIELDS.map(f=>(
                  <FileTile key={f.key} fieldMeta={f}
                    url={item.files[f.key]}
                    onView={(src,title)=>setLightbox({src,title:`${title} — ${item.name}`})}
                    onReplace={file=>handleReplaceFile(item,f.key,file)}/>
                ))}
              </div>

              {/* Card footer */}
              <div className="va-card-ft">
                <button className="va-btn va-btn--teal va-btn--sm"
                  onClick={()=>quickSend(item.objectId)}>🚀 Send</button>
                <button className="va-btn va-btn--gold va-btn--sm"
                  onClick={()=>setEditItem(item)}>✏ Price</button>
                <button className="va-btn va-btn--red va-btn--sm"
                  onClick={()=>setConfirm({item})}>🗑 Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ════ LIST VIEW ════ */
        <div className="va-list">
          {filtered.map((item,i)=>(
            <div key={item.objectId} className="va-row"
              style={{animationDelay:`${i*30}ms`}}>
              {/* info */}
              <div className="va-row-info">
                <div className="va-row-name">{item.name}</div>
                <div className="va-row-id">{item.objectId}</div>
                <div className="va-row-date">{fmtDate(item.createdAt)}</div>
              </div>
              {/* price */}
              <button className="va-price-badge" onClick={()=>setEditItem(item)}>
                💰 {fmtPrice(item.price)}
              </button>
              {/* file chips */}
              <div className="va-row-chips">
                {FILE_FIELDS.map(f=>{
                  const url = item.files[f.key];
                  const isImg = f.type==="image";
                  return (
                    <div key={f.key} className="va-chip" title={f.label}>
                      <div className="va-chip-thumb">
                        {isImg&&url
                          ? <img src={url} alt={f.label}
                              onClick={()=>setLightbox({src:url,title:`${f.label} — ${item.name}`})}/>
                          : url
                            ? <span>🎬</span>
                            : <span className="va-chip-empty">—</span>
                        }
                        <div className="va-chip-hover">↑</div>
                        <input type="file" className="va-chip-input"
                          accept={f.type==="svga"?".svga":"image/png,image/webp,image/jpeg"}
                          onChange={e=>{const fl=e.target.files?.[0];if(fl){handleReplaceFile(item,f.key,fl);e.target.value="";}}}/>
                      </div>
                      <span className="va-chip-lbl">{f.label}</span>
                    </div>
                  );
                })}
              </div>
              {/* actions */}
              <div className="va-row-acts">
                <button className="va-btn va-btn--teal va-btn--sm"
                  onClick={()=>quickSend(item.objectId)}>🚀</button>
                <button className="va-btn va-btn--gold va-btn--sm"
                  onClick={()=>setEditItem(item)}>✏</button>
                <button className="va-btn va-btn--red va-btn--sm"
                  onClick={()=>setConfirm({item})}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}