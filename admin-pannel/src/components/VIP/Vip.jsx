import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Parse from "../../parseConfig";

/* ═══════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════ */
const FILE_FIELDS = [
  { key:"frame",                label:"Frame",           type:"svga",  icon:"🎬" },
  { key:"frame_image",          label:"Frame Image",     type:"image", icon:"🖼" },
  { key:"Medal",                label:"Medal",           type:"svga",  icon:"🎖" },
  { key:"Medal_image",          label:"Medal Image",     type:"image", icon:"🏅" },
  { key:"short_bg",             label:"Short BG",        type:"svga",  icon:"🎬" },
  { key:"short_bg_image",       label:"Short BG Img",    type:"image", icon:"🖼" },
  { key:"short_bg_header",      label:"BG Header",       type:"image", icon:"🖼" },
  { key:"chat_room_bubble",     label:"Chat Bubble",     type:"image", icon:"💬" },
  { key:"tags",                 label:"Tags",            type:"image", icon:"🏷" },
  { key:"floating_entry_image", label:"Float Entry Img", type:"image", icon:"🖼" },
  { key:"floating_entry",       label:"Float Entry",     type:"svga",  icon:"🎬" },
  { key:"mic",                  label:"Mic",             type:"svga",  icon:"🎬" },
  { key:"mic_image",            label:"Mic Image",       type:"image", icon:"🎤" },
];

const SEND_SLOTS = [
  { type:"vip_frame",            urlField:"frame" },
  { type:"vip_short_bg",         urlField:"short_bg" },
  { type:"vip_short_bg_header",  urlField:"short_bg_header" },
  { type:"vip_chat_room_bubble", urlField:"chat_room_bubble" },
  { type:"vip_floating_entrance",urlField:"floating_entry" },
  { type:"vip_mic",              urlField:"mic" },
];

/* ═══════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════ */
const getUrl = f => {
  if (!f) return null;
  if (typeof f === "string") return f;
  if (typeof f.url === "function") return f.url();
  if (f._url) return f._url;
  return null;
};
const fmtPrice = n => Number(n||0).toLocaleString();
const fmtDate  = d => d ? new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const ini  = s => (s||"?")[0].toUpperCase();

const AVATAR_COLORS = ["#7c3aed","#db2777","#0891b2","#d97706","#16a34a","#dc2626","#7c3aed","#0369a1"];
const aClr = s => {
  let h = 0;
  for(let i = 0; i < (s||"").length; i++) h = s.charCodeAt(i) + ((h<<5)-h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

const mapItem = r => {
  const files = {};
  FILE_FIELDS.forEach(f => { files[f.key] = getUrl(r.get(f.key)); });
  return { objectId:r.id, name:r.get("name")||"—", price:r.get("price")??0, createdAt:r.get("createdAt"), files, _obj:r };
};

/* ═══════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════ */
function Toast({ t }) {
  if (!t) return null;
  const cfg = {
    success: "bg-emerald-950 border-emerald-500/40 text-emerald-300",
    error:   "bg-red-950 border-red-500/40 text-red-300",
    info:    "bg-violet-950 border-violet-500/40 text-violet-300",
    warn:    "bg-amber-950 border-amber-500/40 text-amber-300",
  };
  const icons = { success:"✓", error:"✕", info:"ℹ", warn:"⚠" };
  return (
    <div className={`fixed top-16 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl text-sm font-semibold backdrop-blur-sm max-w-xs ${cfg[t.type]||cfg.info}`}
      style={{animation:"toastIn .25s cubic-bezier(.34,1.56,.64,1)"}}>
      <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs shrink-0">{icons[t.type]||"•"}</span>
      {t.msg}
    </div>
  );
}

/* spinner */
const Spin = ({size="w-4 h-4"}) => (
  <span className={`${size} border-2 border-current/20 border-t-current rounded-full animate-spin inline-block shrink-0`}/>
);

/* ═══════════════════════════════════════════════════════
   CONFIRM MODAL
═══════════════════════════════════════════════════════ */
function ConfirmModal({ data, onClose, onConfirm, loading }) {
  if (!data) return null;
  return (
    <div className="fixed inset-0 z-[8000] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{background:"#0c0e1a",border:"1px solid rgba(255,255,255,0.1)",animation:"modalUp .3s cubic-bezier(.22,1,.36,1)"}}>
        <div className="h-0.5 bg-gradient-to-r from-violet-500 via-amber-400 to-cyan-500"/>
        <div className="p-7 flex flex-col items-center gap-4 text-center">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl
            ${data.danger?"bg-red-500/15 border border-red-500/30":"bg-amber-500/15 border border-amber-500/30"}`}>
            {data.danger?"🗑":"✓"}
          </div>
          <div>
            <h3 className="text-white font-black text-lg mb-1.5" style={{fontFamily:"'Clash Display',sans-serif"}}>{data.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed" dangerouslySetInnerHTML={{__html:data.body}}/>
          </div>
          <div className="flex gap-3 w-full pt-2">
            <button onClick={onClose} disabled={loading}
              className="flex-1 py-3 rounded-xl border border-white/10 bg-white/5 text-slate-400 text-sm font-semibold hover:bg-white/10 hover:text-white transition-all">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={loading}
              className={`flex-1 py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all
                ${data.danger?"bg-red-600 hover:bg-red-500":"bg-amber-500 hover:bg-amber-400 text-black"}`}>
              {loading?<Spin/>:data.ok}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LIGHTBOX
═══════════════════════════════════════════════════════ */
function Lightbox({ src, title, onClose }) {
  useEffect(()=>{
    const h = e => e.key==="Escape"&&onClose();
    document.addEventListener("keydown",h);
    return ()=>document.removeEventListener("keydown",h);
  },[onClose]);
  if (!src) return null;
  return (
    <div className="fixed inset-0 z-[9000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 gap-4"
      onClick={onClose}>
      <div className="flex items-center justify-between w-full max-w-3xl px-2">
        <p className="text-white/70 text-sm font-semibold">{title}</p>
        <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 text-white/70 hover:text-white flex items-center justify-center text-sm transition-all">✕</button>
      </div>
      <img src={src} alt={title} className="max-w-full max-h-[75vh] object-contain rounded-2xl border border-white/10 shadow-2xl" onClick={e=>e.stopPropagation()}/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   FILE TILE (card view)
═══════════════════════════════════════════════════════ */
function FileTile({ fieldMeta, url, onView, onReplace }) {
  const fileRef = useRef(null);
  const hasFile = !!url;
  const isImg   = fieldMeta.type==="image";
  return (
    <div className={`rounded-xl overflow-hidden flex flex-col transition-all group cursor-pointer
      ${hasFile?"border border-violet-500/25 bg-violet-950/20":"border border-white/[0.07] bg-white/[0.03]"}`}>
      {/* label */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-black/30 border-b border-white/[0.06]">
        <span className="text-[10px]">{fieldMeta.icon}</span>
        <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold truncate">{fieldMeta.label}</span>
      </div>
      {/* preview */}
      <div className="relative flex-1 flex items-center justify-center"
        style={{minHeight:52}}
        onClick={()=>isImg&&url&&onView(url,fieldMeta.label)}>
        {isImg&&url
          ? <img src={url} alt={fieldMeta.label} className="w-full h-14 object-cover"/>
          : url
            ? <div className="flex flex-col items-center gap-0.5 py-2 text-slate-500"><span className="text-xl">🎬</span><span className="text-[8px] uppercase tracking-wider">SVGA</span></div>
            : <div className="text-slate-700 text-xs py-3">—</div>
        }
        {/* hover overlay */}
        {(isImg&&url||url) && (
          <div className="absolute inset-0 bg-violet-600/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-lg">
            {isImg?"🔍":"▶"}
          </div>
        )}
      </div>
      {/* replace */}
      <input ref={fileRef} type="file" className="hidden"
        accept={fieldMeta.type==="svga"?".svga":"image/png,image/webp,image/jpeg"}
        onChange={e=>{const f=e.target.files?.[0];if(f){onReplace(f);e.target.value="";}}}/>
      <button className="w-full py-1 text-[8px] font-bold text-violet-400 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity hover:bg-violet-500/15 bg-black/20"
        onClick={()=>fileRef.current?.click()}>
        ↑ Replace
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   EDIT PRICE MODAL
═══════════════════════════════════════════════════════ */
function EditPriceModal({ item, onClose, onSave, loading }) {
  const [price, setPrice] = useState(item?.price??0);
  useEffect(()=>{if(item) setPrice(item.price??0);},[item]);
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-[8000] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{background:"#0c0e1a",border:"1px solid rgba(255,255,255,0.1)",animation:"modalUp .3s cubic-bezier(.22,1,.36,1)"}}>
        <div className="h-0.5 bg-gradient-to-r from-amber-400 to-yellow-300"/>
        <div className="p-6 flex flex-col gap-5">
          <div>
            <h3 className="text-white font-black text-lg" style={{fontFamily:"'Clash Display',sans-serif"}}>Edit Price</h3>
            <p className="text-amber-400 text-sm font-semibold mt-0.5">{item.name}</p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Price (coins)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg pointer-events-none">💰</span>
              <input type="number" min="0" autoFocus value={price}
                onChange={e=>setPrice(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&onSave(parseInt(price)||0)}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-amber-300 font-bold text-lg outline-none transition-all"
                style={{background:"rgba(245,158,11,0.08)",border:"1.5px solid rgba(245,158,11,0.3)"}}
                onFocus={e=>e.target.style.borderColor="rgba(245,158,11,0.7)"}
                onBlur={e=>e.target.style.borderColor="rgba(245,158,11,0.3)"}/>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} disabled={loading}
              className="flex-1 py-3 rounded-xl border border-white/10 bg-white/5 text-slate-400 text-sm font-semibold hover:bg-white/10 transition-all">
              Cancel
            </button>
            <button onClick={()=>onSave(parseInt(price)||0)} disabled={loading}
              className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-[.98]">
              {loading?<Spin/>:"💰 Update Price"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ADD FILE DROP ZONE
═══════════════════════════════════════════════════════ */
function AddFileDrop({ field, file, onFile, onClear }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const src = file&&file.type?.startsWith("image/") ? URL.createObjectURL(file) : null;
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
        {field.icon} {field.label}
      </label>
      <div className={`relative rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all min-h-[90px] overflow-hidden
        ${drag?"border-violet-400 bg-violet-500/10 scale-[1.01]":file?"border-emerald-500/50 bg-emerald-500/5 border-solid":"border-white/15 bg-white/[0.03] hover:border-violet-500/40 hover:bg-violet-500/5"}`}
        onDragOver={e=>{e.preventDefault();setDrag(true);}}
        onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files?.[0];if(f)onFile(f);}}
        onClick={()=>!file&&ref.current?.click()}>
        <input ref={ref} type="file" className="hidden"
          accept={field.type==="svga"?".svga":"image/png,image/webp,image/jpeg,image/gif"}
          onChange={e=>{const f=e.target.files?.[0];if(f)onFile(f);e.target.value="";}}/>
        {file ? (
          <div className="flex flex-col items-center gap-2 p-3 w-full">
            {src ? <img src={src} alt="" className="max-h-16 rounded-xl object-contain"/> : <span className="text-3xl">🎬</span>}
            <span className="text-[10px] text-emerald-400 font-mono truncate max-w-full px-2">{file.name}</span>
            <button className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
              onClick={e=>{e.stopPropagation();onClear();}}>✕</button>
          </div>
        ):(
          <div className="flex flex-col items-center gap-1.5 p-3 pointer-events-none">
            <span className="text-2xl opacity-40">{field.type==="svga"?"🎬":"🖼"}</span>
            <span className="text-[11px] text-slate-500 font-semibold">{drag?"Drop!":"Click or drag"}</span>
            <span className="text-[10px] text-slate-600">{field.type==="svga"?".svga":"PNG / WEBP"}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ADD ASSET MODAL
═══════════════════════════════════════════════════════ */
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
    if (!price||isNaN(Number(price))) e.price = "Enter a valid price";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true); setProgress(5); setProgMsg("Uploading files…");
    try {
      const Vip = Parse.Object.extend("Vip_assets");
      const obj = new Vip();
      obj.set("name", name.trim());
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
      onAdded({ objectId:obj.id, name:name.trim(), price:parseInt(price)||0, createdAt:obj.get("createdAt"), files:newFiles });
    } catch(e) {
      setErrors(p=>({...p,save:e.message||"Save failed"}));
      setProgress(0); setProgMsg("");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[8000] bg-black/80 backdrop-blur-md flex items-start justify-center overflow-y-auto p-3 sm:p-5"
      onClick={e=>e.target===e.currentTarget&&!saving&&onClose()}>
      <div className="w-full max-w-3xl my-4 rounded-3xl overflow-hidden shadow-2xl"
        style={{background:"#0c0e1a",border:"1px solid rgba(255,255,255,0.1)",animation:"modalUp .3s cubic-bezier(.22,1,.36,1)"}}>
        {/* rainbow top bar */}
        <div className="h-0.5 bg-gradient-to-r from-violet-500 via-amber-400 to-cyan-500"/>

        {/* header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
              style={{background:"linear-gradient(135deg,#3b0764,#7c3aed)",boxShadow:"0 0 20px rgba(124,58,237,0.3)"}}>
              👑
            </div>
            <div>
              <h2 className="text-white font-black text-base" style={{fontFamily:"'Clash Display',sans-serif"}}>New VIP Asset</h2>
              <p className="text-slate-500 text-xs mt-0.5">Upload files for all slots</p>
            </div>
          </div>
          <button onClick={onClose} disabled={saving}
            className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center text-sm transition-all">
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* name + price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Name <span className="text-violet-400">*</span>
              </label>
              <input type="text" maxLength={60} placeholder="e.g. VIP1, Diamond, Gold…"
                value={name} onChange={e=>{setName(e.target.value);clrErr("name");}}
                className={`px-4 py-3 rounded-2xl text-white text-sm font-medium outline-none transition-all ${errors.name?"border-red-500/50":"border-white/10"}`}
                style={{background:"rgba(255,255,255,0.05)",border:`1.5px solid ${errors.name?"rgba(239,68,68,0.5)":"rgba(255,255,255,0.1)"}`}}
                onFocus={e=>e.target.style.borderColor="rgba(124,58,237,0.6)"}
                onBlur={e=>e.target.style.borderColor=errors.name?"rgba(239,68,68,0.5)":"rgba(255,255,255,0.1)"}/>
              {errors.name&&<span className="text-red-400 text-xs">⚠ {errors.name}</span>}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Price (coins) <span className="text-violet-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-base">💰</span>
                <input type="number" min="0" placeholder="5000"
                  value={price} onChange={e=>{setPrice(e.target.value);clrErr("price");}}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl text-amber-300 font-bold text-sm outline-none transition-all"
                  style={{background:"rgba(245,158,11,0.08)",border:`1.5px solid ${errors.price?"rgba(239,68,68,0.5)":"rgba(245,158,11,0.25)"}`}}
                  onFocus={e=>e.target.style.borderColor="rgba(245,158,11,0.6)"}
                  onBlur={e=>e.target.style.borderColor=errors.price?"rgba(239,68,68,0.5)":"rgba(245,158,11,0.25)"}/>
              </div>
              {errors.price&&<span className="text-red-400 text-xs">⚠ {errors.price}</span>}
            </div>
          </div>

          {/* file grid */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-px bg-white/[0.07]"/>
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-2">Asset Files</span>
              <div className="flex-1 h-px bg-white/[0.07]"/>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {FILE_FIELDS.map(f=>(
                <AddFileDrop key={f.key} field={f}
                  file={files[f.key]}
                  onFile={file=>setFiles(p=>({...p,[f.key]:file}))}
                  onClear={()=>setFiles(p=>{ const n={...p}; delete n[f.key]; return n; })}/>
              ))}
            </div>
          </div>

          {errors.save&&(
            <div className="px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold">
              ✗ {errors.save}
            </div>
          )}
        </div>

        {/* progress */}
        {saving&&(
          <div className="px-5 py-3 border-t border-white/[0.07]">
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-2">
              <div className="h-full bg-gradient-to-r from-violet-500 to-amber-400 rounded-full transition-all duration-500" style={{width:progress+"%"}}/>
            </div>
            <div className="flex justify-between text-xs text-slate-500 font-mono">
              <span>{progMsg}</span><span>{progress}%</span>
            </div>
          </div>
        )}

        {/* footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-white/[0.07] flex-wrap">
          <span className="text-xs text-slate-600">Fields marked <strong className="text-violet-400">*</strong> are required</span>
          <div className="flex gap-3">
            <button onClick={onClose} disabled={saving}
              className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-400 text-sm font-semibold hover:bg-white/10 transition-all">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold transition-all active:scale-[.98]"
              style={{background:"linear-gradient(135deg,#7c3aed,#6d28d9)",boxShadow:"0 0 20px rgba(124,58,237,0.35)"}}>
              {saving?<><Spin/>Saving…</>:"👑 Save Asset"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SEND VIP MODAL
═══════════════════════════════════════════════════════ */
function SendVipModal({ items, defaultItemId, onClose, onSent }) {
  const [vipId,      setVipId]      = useState(defaultItemId||"");
  const [uidInput,   setUidInput]   = useState("");
  const [duration,   setDuration]   = useState(15);
  const [foundUser,  setFoundUser]  = useState(null);
  const [lookLoading,setLookLoading]= useState(false);
  const [sending,    setSending]    = useState(false);
  const [error,      setError]      = useState("");

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
        setFoundUser({ objectId:u.id, uid:u.get("uid"), name:u.get("name")||u.get("username")||"—",
          username:u.get("username")||"—", avatar:getUrl(av), credits:u.get("credit")??0, vipLevel:u.get("vip_level")??0 });
      }
    } catch(e){ setError(e.message); }
    finally { setLookLoading(false); }
  };

  const handleSend = async () => {
    if (!vipId)     { setError("Select a VIP tier"); return; }
    if (!foundUser) { setError("Look up a user first"); return; }
    setSending(true); setError("");
    try {
      const mk = {useMasterKey:true};
      const vq = new Parse.Query("Vip_assets");
      const vAsset = await vq.get(vipId, mk);
      const vName  = vAsset.get("name")||"";
      const exp = new Date(); exp.setDate(exp.getDate()+duration);
      const uq = new Parse.Query("_User");
      const tUser = await uq.get(foundUser.objectId, mk);
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
      let vipLevel = 0;
      const m = vName.toLowerCase().match(/(\d+)/);
      if (m) vipLevel = parseInt(m[1]);
      if (vipLevel===0) {
        const allQ = new Parse.Query("Vip_assets"); allQ.ascending("createdAt");
        const all = await allQ.find(mk);
        vipLevel = all.findIndex(a=>a.id===vipId)+1;
      }
      const curLevel = parseInt(tUser.get("vip_level")||0);
      if (vipLevel>curLevel) tUser.set("vip_level", vipLevel);
      tUser.set("vip_duration", String(duration));
      tUser.set("vip_purcharge_rechage_time", new Date());
      await tUser.save(null, mk);
      onSent(foundUser.name, vName);
    } catch(e){ setError(e.message||"Send failed"); }
    finally { setSending(false); }
  };

  const selectBase = "w-full px-4 py-3 rounded-2xl text-white text-sm outline-none transition-all appearance-none cursor-pointer";
  const selectStyle = {background:"rgba(255,255,255,0.05)",border:"1.5px solid rgba(255,255,255,0.1)"};

  return (
    <div className="fixed inset-0 z-[8000] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-5"
      onClick={e=>e.target===e.currentTarget&&!sending&&onClose()}>
      <div className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
        style={{background:"#0c0e1a",border:"1px solid rgba(255,255,255,0.1)",animation:"modalUp .3s cubic-bezier(.22,1,.36,1)"}}>
        <div className="h-0.5 bg-gradient-to-r from-cyan-500 to-teal-400"/>

        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
              style={{background:"linear-gradient(135deg,#083344,#0891b2)",boxShadow:"0 0 20px rgba(6,182,212,0.3)"}}>
              🚀
            </div>
            <div>
              <h2 className="text-white font-black text-base" style={{fontFamily:"'Clash Display',sans-serif"}}>Send VIP to User</h2>
              <p className="text-slate-500 text-xs mt-0.5">Admin gift — no coins deducted</p>
            </div>
          </div>
          <button onClick={onClose} disabled={sending}
            className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center text-sm transition-all">
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* info note */}
          <div className="px-4 py-3 rounded-2xl text-sm text-cyan-300 leading-relaxed"
            style={{background:"rgba(6,182,212,0.08)",border:"1px solid rgba(6,182,212,0.2)"}}>
            ℹ Sends 6 VIP slots to <code className="bg-white/10 rounded px-1.5 py-0.5 text-xs font-mono">ObtainedItems</code> and updates <code className="bg-white/10 rounded px-1.5 py-0.5 text-xs font-mono">vip_level</code>
          </div>

          {/* VIP tier */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">VIP Tier <span className="text-violet-400">*</span></label>
            <select className={selectBase} style={selectStyle} value={vipId}
              onChange={e=>setVipId(e.target.value)}
              onFocus={e=>e.target.style.borderColor="rgba(124,58,237,0.6)"}
              onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}>
              <option value="" style={{background:"#0c0e1a"}}>— Select VIP tier —</option>
              {items.map(it=>(
                <option key={it.objectId} value={it.objectId} style={{background:"#0c0e1a"}}>
                  {it.name} · {fmtPrice(it.price)} coins
                </option>
              ))}
            </select>
          </div>

          {/* user UID */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">User UID <span className="text-violet-400">*</span></label>
            <div className="flex gap-2">
              <input type="number" min="1" placeholder="e.g. 426048"
                value={uidInput}
                onChange={e=>{setUidInput(e.target.value);setFoundUser(null);setError("");}}
                onKeyDown={e=>e.key==="Enter"&&lookupUser()}
                className="flex-1 px-4 py-3 rounded-2xl text-cyan-300 font-bold text-sm outline-none transition-all"
                style={{background:"rgba(6,182,212,0.06)",border:"1.5px solid rgba(6,182,212,0.2)"}}
                onFocus={e=>e.target.style.borderColor="rgba(6,182,212,0.6)"}
                onBlur={e=>e.target.style.borderColor="rgba(6,182,212,0.2)"}/>
              <button onClick={lookupUser} disabled={lookLoading||!uidInput}
                className="px-5 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-40"
                style={{background:"rgba(6,182,212,0.15)",border:"1.5px solid rgba(6,182,212,0.35)",color:"#22d3ee"}}>
                {lookLoading?<Spin/>:"🔍"}
              </button>
            </div>
            {foundUser&&(
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{background:"rgba(6,182,212,0.07)",border:"1px solid rgba(6,182,212,0.25)",animation:"fadeUp .2s ease"}}>
                {foundUser.avatar
                  ? <img src={foundUser.avatar} alt={foundUser.name} className="w-11 h-11 rounded-2xl object-cover border-2 border-cyan-500/30 shrink-0"/>
                  : <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg text-white shrink-0 border-2 border-white/15"
                      style={{background:aClr(foundUser.name)}}>
                      {ini(foundUser.name)}
                    </div>
                }
                <div className="min-w-0">
                  <div className="text-cyan-300 font-black text-sm">{foundUser.name}</div>
                  <div className="text-slate-500 text-xs mt-0.5 font-mono">
                    UID {foundUser.uid} · 💰 {Number(foundUser.credits).toLocaleString()} credits
                    {foundUser.vipLevel>0&&<> · VIP {foundUser.vipLevel}</>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* duration */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Duration</label>
            <select className={selectBase} style={selectStyle} value={duration}
              onChange={e=>setDuration(parseInt(e.target.value))}
              onFocus={e=>e.target.style.borderColor="rgba(124,58,237,0.6)"}
              onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}>
              {[[15,"15 days"],[30,"30 days (1 month)"],[90,"90 days (3 months)"],[180,"180 days (6 months)"],[365,"365 days (1 year)"]].map(([v,l])=>(
                <option key={v} value={v} style={{background:"#0c0e1a"}}>{l}</option>
              ))}
            </select>
          </div>

          {error&&<div className="px-4 py-3 rounded-2xl text-red-400 text-sm font-semibold" style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)"}}>⚠ {error}</div>}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-white/[0.07]">
          <button onClick={onClose} disabled={sending}
            className="flex-1 py-3 rounded-xl border border-white/10 bg-white/5 text-slate-400 text-sm font-semibold hover:bg-white/10 transition-all">
            Cancel
          </button>
          <button onClick={handleSend} disabled={sending||!vipId||!foundUser}
            className="flex-1 py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[.98] disabled:opacity-40"
            style={{background:"linear-gradient(135deg,#0891b2,#06b6d4)",boxShadow:"0 0 20px rgba(6,182,212,0.25)"}}>
            {sending?<><Spin/>Sending…</>:"🚀 Send VIP"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════ */
export default function VipAssets() {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [actLoad,    setActLoad]    = useState(null);
  const [toast,      setToast]      = useState(null);
  const [view,       setView]       = useState("card");
  const [search,     setSearch]     = useState("");
  const [showAdd,    setShowAdd]    = useState(false);
  const [showSend,   setShowSend]   = useState(false);
  const [sendItemId, setSendItemId] = useState("");
  const [editItem,   setEditItem]   = useState(null);
  const [confirm,    setConfirm]    = useState(null);
  const [lightbox,   setLightbox]   = useState(null);

  const show$ = useCallback((msg,type="success")=>{
    setToast({msg,type});
    setTimeout(()=>setToast(null),3200);
  },[]);

  const fetchItems = useCallback(async()=>{
    setLoading(true);
    try {
      const q = new Parse.Query("Vip_assets");
      q.descending("createdAt"); q.limit(200);
      const res = await q.find({useMasterKey:true});
      setItems(res.map(mapItem));
    } catch(e){ show$("Load failed: "+e.message,"error"); }
    finally { setLoading(false); }
  },[show$]);

  useEffect(()=>{ fetchItems(); },[fetchItems]);

  const filtered = useMemo(()=>{
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(it=>it.name.toLowerCase().includes(q)||it.objectId.toLowerCase().includes(q)||String(it.price).includes(q));
  },[items,search]);

  const stats = useMemo(()=>{
    let svga=0,img=0;
    items.forEach(it=>{ FILE_FIELDS.forEach(f=>{ if(it.files[f.key]) f.type==="svga"?svga++:img++; }); });
    return {total:items.length,svga,img,all:svga+img};
  },[items]);

  const handleEditPrice = async (newPrice) => {
    if (!editItem) return;
    setActLoad("price");
    try {
      const obj = await new Parse.Query("Vip_assets").get(editItem.objectId,{useMasterKey:true});
      obj.set("price", newPrice);
      await obj.save(null,{useMasterKey:true});
      setItems(p=>p.map(it=>it.objectId===editItem.objectId?{...it,price:newPrice}:it));
      setEditItem(null);
      show$(`${editItem.name} price updated to ${fmtPrice(newPrice)} coins`);
    } catch(e){ show$("Update failed: "+e.message,"error"); }
    finally { setActLoad(null); }
  };

  const handleReplaceFile = async (item, fieldKey, file) => {
    const lk = `${item.objectId}_${fieldKey}`;
    setActLoad(lk);
    try {
      const pf = new Parse.File(file.name.replace(/\s+/g,"_"), file);
      await pf.save();
      const obj = await new Parse.Query("Vip_assets").get(item.objectId,{useMasterKey:true});
      obj.set(fieldKey, pf);
      await obj.save(null,{useMasterKey:true});
      const newUrl = getUrl(pf);
      setItems(p=>p.map(it=>it.objectId===item.objectId?{...it,files:{...it.files,[fieldKey]:newUrl}}:it));
      show$(`${item.name} — ${FILE_FIELDS.find(f=>f.key===fieldKey)?.label||fieldKey} replaced`);
    } catch(e){ show$("Replace failed: "+e.message,"error"); }
    finally { setActLoad(null); }
  };

  const handleDelete = async () => {
    const item = confirm?.item;
    if (!item) return;
    setActLoad("delete");
    try {
      const obj = await new Parse.Query("Vip_assets").get(item.objectId,{useMasterKey:true});
      await obj.destroy({useMasterKey:true});
      setItems(p=>p.filter(it=>it.objectId!==item.objectId));
      setConfirm(null);
      show$(`${item.name} deleted`,"info");
    } catch(e){ show$("Delete failed: "+e.message,"error"); }
    finally { setActLoad(null); }
  };

  const handleSendDone = (userName, vipName) => {
    setShowSend(false);
    show$(`${vipName} sent to ${userName} ✓`);
  };

  const quickSend = id => { setSendItemId(id); setShowSend(true); };

  /* ── input style helper ── */
  const inputCls = "w-full px-4 py-3 rounded-2xl text-white text-sm outline-none transition-all";
  const inputStyle = {background:"rgba(255,255,255,0.05)",border:"1.5px solid rgba(255,255,255,0.1)"};

  /* ══════════════════════════
     RENDER
  ══════════════════════════ */
  return (
    <div className="min-h-screen relative overflow-x-hidden"
      style={{background:"#070910",fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes toastIn  {from{opacity:0;transform:translateY(-12px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes modalUp  {from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeUp   {from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes cardIn   {from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes float    {0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes spin     {to{transform:rotate(360deg)}}
        @keyframes shimmer  {0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>

      {/* ambient glow blobs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{background:"radial-gradient(circle,#7c3aed,transparent 70%)"}}/>
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-8" style={{background:"radial-gradient(circle,#f59e0b,transparent 70%)"}}/>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-5" style={{background:"radial-gradient(circle,#06b6d4,transparent 70%)"}}/>
      </div>

      <div className="relative z-10 px-3 sm:px-5 lg:px-7 py-5 sm:py-7 flex flex-col gap-5 sm:gap-6 max-w-screen-2xl mx-auto">

        <Toast t={toast}/>

        {/* MODALS */}
        {showAdd&&(
          <AddAssetModal onClose={()=>setShowAdd(false)}
            onAdded={newItem=>{setItems(p=>[newItem,...p]);setShowAdd(false);show$(`"${newItem.name}" created`);}}/>
        )}
        {showSend&&(
          <SendVipModal items={items} defaultItemId={sendItemId}
            onClose={()=>{setShowSend(false);setSendItemId("");}}
            onSent={handleSendDone}/>
        )}
        <EditPriceModal item={editItem} onClose={()=>setEditItem(null)} onSave={handleEditPrice} loading={actLoad==="price"}/>
        <ConfirmModal
          data={confirm?{title:`Delete ${confirm.item.name}?`,body:"This VIP tier will be permanently removed.",ok:"Delete",danger:true}:null}
          onClose={()=>setConfirm(null)} onConfirm={handleDelete} loading={actLoad==="delete"}/>
        {lightbox&&<Lightbox src={lightbox.src} title={lightbox.title} onClose={()=>setLightbox(null)}/>}

        {/* ── HEADER ── */}
        <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sm:rounded-3xl flex items-center justify-center text-2xl sm:text-3xl shrink-0"
              style={{background:"linear-gradient(135deg,#3b0764,#7c3aed)",boxShadow:"0 0 30px rgba(124,58,237,0.4)"}}>
              👑
            </div>
            <div>
              <h1 className="font-black text-2xl sm:text-3xl leading-none"
                style={{background:"linear-gradient(135deg,#c084fc,#fbbf24)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontFamily:"'Clash Display',sans-serif"}}>
                VIP Assets
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">Frames · Medals · Animations · Effects</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button onClick={()=>{setSendItemId("");setShowSend(true);}}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-sm font-bold transition-all active:scale-95"
              style={{background:"rgba(6,182,212,0.12)",border:"1.5px solid rgba(6,182,212,0.3)",color:"#22d3ee"}}>
              🚀 <span>Send VIP</span>
            </button>
            <button onClick={()=>setShowAdd(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-sm font-bold text-white transition-all active:scale-95"
              style={{background:"linear-gradient(135deg,#7c3aed,#6d28d9)",boxShadow:"0 0 20px rgba(124,58,237,0.3)"}}>
              + <span>Add Asset</span>
            </button>
          </div>
        </div>

        {/* ── STATS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {val:stats.total, lbl:"VIP Tiers",    color:"#c084fc", glow:"rgba(192,132,252,0.15)"},
            {val:stats.svga,  lbl:"SVGA Files",   color:"#a78bfa", glow:"rgba(167,139,250,0.15)"},
            {val:stats.img,   lbl:"Image Assets", color:"#22d3ee", glow:"rgba(34,211,238,0.15)"},
            {val:stats.all,   lbl:"Total Files",  color:"#fbbf24", glow:"rgba(251,191,36,0.15)"},
          ].map((s,i)=>(
            <div key={i} className="rounded-2xl sm:rounded-3xl p-4 sm:p-5 transition-all hover:-translate-y-0.5"
              style={{background:`rgba(255,255,255,0.03)`,border:"1px solid rgba(255,255,255,0.07)",boxShadow:`inset 0 0 30px ${s.glow}`,animationDelay:`${i*60}ms`,animation:"cardIn .4s ease both"}}>
              <div className="text-2xl sm:text-3xl font-black tabular-nums" style={{color:s.color}}>{s.val}</div>
              <div className="text-[11px] text-slate-600 font-bold uppercase tracking-wider mt-1.5">{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* ── TOOLBAR ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">⌕</span>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search name, ID or price…"
              className="w-full pl-10 pr-10 py-3 rounded-2xl text-white text-sm outline-none transition-all"
              style={{background:"rgba(255,255,255,0.04)",border:"1.5px solid rgba(255,255,255,0.08)"}}
              onFocus={e=>e.target.style.borderColor="rgba(124,58,237,0.5)"}
              onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.08)"}/>
            {search&&<button onClick={()=>setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/10 text-slate-400 hover:text-red-400 flex items-center justify-center text-[10px] transition-colors">
              ✕
            </button>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-600 font-mono hidden sm:block">{filtered.length} asset{filtered.length!==1?"s":""}</span>
            <div className="flex rounded-xl overflow-hidden border border-white/10">
              {[["card","⊞"],["list","☰"]].map(([v,l])=>(
                <button key={v} onClick={()=>setView(v)}
                  className="px-3.5 py-2.5 text-sm transition-all"
                  style={{background:view===v?"rgba(124,58,237,0.3)":"rgba(255,255,255,0.04)",color:view===v?"#c084fc":"#64748b"}}>
                  {l}
                </button>
              ))}
            </div>
            <button onClick={fetchItems} disabled={loading}
              className="w-10 h-10 rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all disabled:opacity-40">
              {loading?<Spin/>:"↻"}
            </button>
          </div>
        </div>

        {/* ── CONTENT ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-500">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500 animate-spin"/>
              <div className="absolute inset-3 rounded-full border-2 border-transparent border-t-amber-400" style={{animation:"spin .5s linear infinite reverse"}}/>
            </div>
            <p className="text-sm">Loading VIP assets…</p>
          </div>
        ) : filtered.length===0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-slate-500 text-center">
            <div className="text-5xl opacity-20" style={{animation:"float 3s ease-in-out infinite"}}>👑</div>
            <div>
              <h3 className="text-slate-300 font-black text-lg mb-1">{search?`No results for "${search}"`:"No VIP Assets yet"}</h3>
              <p className="text-sm">{search?"Try a different search term":'Click "+ Add Asset" to get started'}</p>
            </div>
            {search&&<button onClick={()=>setSearch("")}
              className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-400 text-sm hover:text-white transition-all">
              Clear
            </button>}
          </div>
        ) : view==="card" ? (

          /* ════ CARD GRID ════ */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filtered.map((item,i)=>(
              <div key={item.objectId}
                className="rounded-3xl overflow-hidden flex flex-col transition-all hover:-translate-y-1 hover:shadow-2xl group"
                style={{background:"#0d1020",border:"1.5px solid rgba(255,255,255,0.07)",
                  animation:`cardIn .4s ease ${i*50}ms both`,
                  boxShadow:"0 4px 24px rgba(0,0,0,0.4)"}}>

                {/* glowing top accent */}
                <div className="h-0.5 bg-gradient-to-r from-violet-500/70 via-amber-400/50 to-transparent group-hover:from-violet-400 group-hover:via-amber-300 transition-all"/>

                {/* card header */}
                <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 flex items-start justify-between gap-3"
                  style={{background:"linear-gradient(135deg,rgba(124,58,237,0.12),rgba(245,158,11,0.07))"}}>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-white font-black text-lg sm:text-xl uppercase tracking-wide leading-none truncate"
                      style={{fontFamily:"'Clash Display',sans-serif",
                        background:"linear-gradient(135deg,#fff,#c084fc)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                      {item.name}
                    </h2>
                    <p className="font-mono text-[10px] text-slate-600 mt-1 truncate">{item.objectId}</p>
                  </div>
                  <button onClick={()=>setEditItem(item)}
                    className="shrink-0 px-3 py-1.5 rounded-xl font-black text-sm transition-all hover:scale-105 active:scale-95"
                    style={{background:"linear-gradient(135deg,#f59e0b,#fbbf24)",color:"#1a0800",
                      boxShadow:"0 3px 12px rgba(245,158,11,0.35)"}}>
                    💰 {fmtPrice(item.price)}
                  </button>
                </div>

                {/* date */}
                <div className="px-4 sm:px-5 py-2 text-xs text-slate-600">📅 {fmtDate(item.createdAt)}</div>

                {/* file tiles — 4-col on all screens, responsive heights */}
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2 px-3 sm:px-4 pb-2 flex-1">
                  {FILE_FIELDS.map(f=>(
                    <FileTile key={f.key} fieldMeta={f}
                      url={item.files[f.key]}
                      onView={(src,title)=>setLightbox({src,title:`${title} — ${item.name}`})}
                      onReplace={file=>handleReplaceFile(item,f.key,file)}/>
                  ))}
                </div>

                {/* card footer */}
                <div className="px-3 sm:px-4 py-3 border-t flex gap-2 justify-end"
                  style={{borderColor:"rgba(255,255,255,0.06)",background:"rgba(0,0,0,0.25)"}}>
                  <button onClick={()=>quickSend(item.objectId)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                    style={{background:"rgba(6,182,212,0.12)",border:"1px solid rgba(6,182,212,0.25)",color:"#22d3ee"}}>
                    🚀 Send
                  </button>
                  <button onClick={()=>setEditItem(item)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                    style={{background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.25)",color:"#fbbf24"}}>
                    ✏ Price
                  </button>
                  <button onClick={()=>setConfirm({item})}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                    style={{background:"rgba(244,63,94,0.1)",border:"1px solid rgba(244,63,94,0.25)",color:"#fb7185"}}>
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>

        ) : (
          /* ════ LIST VIEW ════ */
          <div className="flex flex-col gap-3">
            {filtered.map((item,i)=>(
              <div key={item.objectId}
                className="rounded-2xl flex items-center gap-3 sm:gap-4 p-3 sm:p-4 flex-wrap sm:flex-nowrap transition-all hover:translate-x-1 group"
                style={{background:"#0d1020",border:"1.5px solid rgba(255,255,255,0.07)",
                  animation:`cardIn .3s ease ${i*35}ms both`}}>

                {/* info */}
                <div className="min-w-0 flex-1 sm:min-w-[140px] sm:max-w-[180px]">
                  <div className="font-black text-violet-300 text-sm" style={{fontFamily:"'Clash Display',sans-serif"}}>{item.name}</div>
                  <div className="font-mono text-[10px] text-slate-600 mt-0.5 truncate">{item.objectId}</div>
                  <div className="text-[10px] text-slate-600 mt-0.5">{fmtDate(item.createdAt)}</div>
                </div>

                {/* price */}
                <button onClick={()=>setEditItem(item)}
                  className="shrink-0 px-3 py-1.5 rounded-xl font-black text-xs transition-all hover:scale-105 active:scale-95"
                  style={{background:"linear-gradient(135deg,#f59e0b,#fbbf24)",color:"#1a0800",
                    boxShadow:"0 2px 10px rgba(245,158,11,0.3)"}}>
                  💰 {fmtPrice(item.price)}
                </button>

                {/* file chips — hidden on mobile */}
                <div className="hidden sm:flex gap-1.5 flex-1 flex-wrap">
                  {FILE_FIELDS.map(f=>{
                    const url=item.files[f.key];
                    const isImg=f.type==="image";
                    return (
                      <div key={f.key} className="relative group/chip rounded-lg overflow-hidden border border-white/[0.07] cursor-pointer hover:border-violet-500/40 transition-all"
                        style={{width:36,height:36,background:"rgba(255,255,255,0.03)"}}>
                        {isImg&&url
                          ? <img src={url} alt={f.label} className="w-full h-full object-cover"
                              onClick={()=>setLightbox({src:url,title:`${f.label} — ${item.name}`})}/>
                          : url
                            ? <div className="w-full h-full flex items-center justify-center text-sm">🎬</div>
                            : <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-700">—</div>
                        }
                        <div className="absolute inset-0 bg-violet-600/80 flex items-center justify-center opacity-0 group-hover/chip:opacity-100 transition-opacity text-white text-sm">↑</div>
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          accept={f.type==="svga"?".svga":"image/png,image/webp,image/jpeg"}
                          onChange={e=>{const fl=e.target.files?.[0];if(fl){handleReplaceFile(item,f.key,fl);e.target.value="";}}}
                          title={`Replace ${f.label}`}/>
                      </div>
                    );
                  })}
                </div>

                {/* mobile file count */}
                <div className="sm:hidden flex items-center gap-1">
                  {[{l:"🖼",count:FILE_FIELDS.filter(f=>f.type==="image"&&item.files[f.key]).length},{l:"🎬",count:FILE_FIELDS.filter(f=>f.type==="svga"&&item.files[f.key]).length}].map(({l,count})=>(
                    <span key={l} className="text-xs text-slate-500 font-mono">{l}{count}</span>
                  ))}
                </div>

                {/* actions */}
                <div className="flex gap-2 shrink-0">
                  <button onClick={()=>quickSend(item.objectId)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all active:scale-95"
                    style={{background:"rgba(6,182,212,0.12)",border:"1px solid rgba(6,182,212,0.25)",color:"#22d3ee"}}>
                    🚀
                  </button>
                  <button onClick={()=>setEditItem(item)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all active:scale-95"
                    style={{background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.25)",color:"#fbbf24"}}>
                    ✏
                  </button>
                  <button onClick={()=>setConfirm({item})}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all active:scale-95"
                    style={{background:"rgba(244,63,94,0.1)",border:"1px solid rgba(244,63,94,0.25)",color:"#fb7185"}}>
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}