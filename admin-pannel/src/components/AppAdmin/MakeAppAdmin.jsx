import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Parse from "../../parseConfig";

/* ══════════════════════════════
   HELPERS
══════════════════════════════ */
const PAGE_SIZE = 10;

function getInitial(n) { return (n || "?").charAt(0).toUpperCase(); }

function avatarBg(str) {
  const p = ["#7c3aed","#6366f1","#ec4899","#f43f5e","#f59e0b","#10b981","#06b6d4","#3b82f6"];
  let h = 0;
  for (let i = 0; i < (str||"").length; i++) h = str.charCodeAt(i) + ((h<<5)-h);
  return p[Math.abs(h) % p.length];
}

function timeAgo(d) {
  if (!d) return "—";
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
}

function mapUser(u) {
  const av = u.get("avatar");
  let avatarUrl = null;
  if (av && typeof av.url === "function") avatarUrl = av.url();
  else if (typeof av === "string") avatarUrl = av;
  return {
    objectId:  u.id,
    uid:       String(u.get("uid")||u.id),
    name:      u.get("name")            || "—",
    username:  u.get("username")        || "anonymous",
    email:     u.get("email")           || "—",
    gender:    u.get("gender")          || "—",
    country:   u.get("country")         || "—",
    createdAt: u.get("createdAt"),
    isAdmin:   u.get("admin_role") === "admin",
    adminRole: u.get("admin_role")      || "",
    whatsapp:  u.get("whatsapp_number") || "",
    avatarUrl,
  };
}

/* ── detect mobile ── */
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

/* ══════════════════════════════
   SHARED COMPONENTS
══════════════════════════════ */

function Av({ user, size=36, badge=true }) {
  const bg = avatarBg(user.username);
  const r  = Math.round(size*0.28);
  return (
    <div className="relative shrink-0" style={{width:size,height:size}}>
      {user.avatarUrl
        ? <img src={user.avatarUrl} alt={user.name} className="object-cover"
            style={{width:size,height:size,borderRadius:r,border:"1.5px solid rgba(255,255,255,0.1)"}}/>
        : <div className="flex items-center justify-center font-bold text-white select-none"
            style={{width:size,height:size,borderRadius:r,background:bg,
              fontSize:Math.max(10,size*0.36),border:"1.5px solid rgba(255,255,255,0.08)"}}>
            {getInitial(user.name)}
          </div>
      }
      {badge && user.isAdmin && (
        <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center text-[7px] select-none"
          style={{width:14,height:14,borderRadius:"50%",background:"#f59e0b",
            border:"2px solid #060c18",boxShadow:"0 0 6px rgba(245,158,11,0.5)"}}>
          🛡
        </span>
      )}
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const cfg = {
    success:{cls:"bg-emerald-900/95 border-emerald-500/40 text-emerald-200",icon:"✓"},
    error:  {cls:"bg-red-950/95 border-red-500/40 text-red-200",           icon:"✕"},
    info:   {cls:"bg-indigo-950/95 border-indigo-500/40 text-indigo-200",  icon:"ℹ"},
    copy:   {cls:"bg-sky-950/95 border-sky-500/40 text-sky-200",           icon:"⎘"},
  };
  const c = cfg[toast.type]||cfg.info;
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl text-sm font-semibold backdrop-blur-sm ${c.cls}`}
      style={{animation:"slideDown .3s ease",maxWidth:"calc(100vw - 32px)"}}>
      <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">{c.icon}</span>
      {toast.msg}
    </div>
  );
}

function ConfirmModal({ data, onClose, onConfirm, loading }) {
  if (!data) return null;
  return (
    <div className="fixed inset-0 z-[9200] bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 sm:p-7 text-center shadow-2xl"
        style={{background:"#0d1525",border:"1px solid rgba(255,255,255,0.1)",animation:"slideUp .3s ease"}}>

        {data.user && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-5 text-left"
            style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
            <Av user={data.user} size={44} badge={false}/>
            <div className="min-w-0">
              <div className="font-bold text-white text-sm truncate">{data.user.name}</div>
              <div className="text-xs text-slate-500 font-mono">@{data.user.username} · UID {data.user.uid}</div>
            </div>
          </div>
        )}

        <div className={`w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center text-xl
          ${data.danger?"bg-red-500/15 text-red-400":"bg-indigo-500/15 text-indigo-400"}`}>
          {data.danger?"⚠":"🛡"}
        </div>
        <h3 className="text-white font-bold text-base mb-2">{data.title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed mb-5" dangerouslySetInnerHTML={{__html:data.body}}/>

        {data.showWhatsapp && (
          <div className="mb-5 text-left">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">WhatsApp (optional)</label>
            <input type="tel" placeholder="+8801XXXXXXXXX"
              value={data.whatsapp} onChange={e=>data.setWhatsapp(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
              style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)"}}/>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-3 rounded-xl border border-white/10 bg-white/5 text-slate-400 text-sm font-semibold">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2
              ${data.danger?"bg-red-600":"bg-indigo-600"}`}>
            {loading&&<span className="w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin"/>}
            {loading?"Processing…":data.confirmLabel}
          </button>
        </div>
        {/* safe area bottom for iOS */}
        <div className="h-safe-area-inset-bottom sm:hidden" style={{height:"env(safe-area-inset-bottom,0px)"}}/>
      </div>
    </div>
  );
}

function Pager({ page, total, onChange, small=false }) {
  if (total<=1) return null;
  const delta=small?1:2, pages=[];
  for(let i=Math.max(0,page-delta);i<=Math.min(total-1,page+delta);i++) pages.push(i);
  const sz = small ? "h-7 min-w-[28px] text-[10px]" : "h-8 min-w-[32px] text-xs";
  const btn=(l,fn,dis,act)=>(
    <button onClick={fn} disabled={dis}
      className={`${sz} px-1.5 rounded-lg font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed
        ${act?"bg-indigo-600 text-white":"border border-white/10 bg-white/5 text-slate-400 hover:text-white"}`}>
      {l}
    </button>
  );
  return (
    <div className="flex items-center justify-center gap-1 flex-wrap py-3">
      {btn("«",()=>onChange(0),page===0)}
      {btn("‹",()=>onChange(page-1),page===0)}
      {pages[0]>0&&<>{btn("1",()=>onChange(0),false)}{pages[0]>1&&<span className="text-slate-600 text-xs px-0.5">…</span>}</>}
      {pages.map(p=>btn(p+1,()=>onChange(p),false,p===page))}
      {pages[pages.length-1]<total-1&&<>
        {pages[pages.length-1]<total-2&&<span className="text-slate-600 text-xs px-0.5">…</span>}
        {btn(total,()=>onChange(total-1),false)}
      </>}
      {btn("›",()=>onChange(page+1),page===total-1)}
      {btn("»",()=>onChange(total-1),page===total-1)}
      <span className="text-[10px] text-slate-600 font-mono pl-1">{page+1}/{total}</span>
    </div>
  );
}

function Spinner({ color="#6366f1" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-slate-500">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style={{borderTopColor:color}}/>
        <div className="absolute rounded-full border-2 border-transparent animate-spin" style={{inset:"20%",borderTopColor:color+"80",animationDirection:"reverse",animationDuration:"0.5s"}}/>
      </div>
      <p className="text-sm">Loading…</p>
    </div>
  );
}

function Empty({ icon, msg, action }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
      <div className="text-4xl opacity-20">{icon}</div>
      <p className="text-sm text-center">{msg}</p>
      {action&&<button onClick={action.onClick}
        className="text-xs px-4 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400">
        {action.label}
      </button>}
    </div>
  );
}

/* ══════════════════════════════
   ADMINS DRAWER
   Full-screen drawer listing all admins
   with search + remove — works on mobile & desktop
══════════════════════════════ */
function AdminsDrawer({ admins, loading, onClose, onRemove, actionLoading, showToast }) {
  const [search,   setSearch]   = useState("");
  const [page,     setPage]     = useState(0);
  const [copied,   setCopied]   = useState(null);
  const isMobile = useIsMobile();

  useEffect(()=>{document.body.style.overflow="hidden";return()=>{document.body.style.overflow="";};},[]);
  useEffect(()=>{const fn=e=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",fn);return()=>window.removeEventListener("keydown",fn);},[onClose]);

  const filtered = useMemo(()=>{
    const q=search.toLowerCase().trim();
    if(!q) return admins;
    return admins.filter(a=>a.name.toLowerCase().includes(q)||a.username.toLowerCase().includes(q)||a.uid.includes(q)||a.email.toLowerCase().includes(q));
  },[admins,search]);

  const totalPages = Math.ceil(filtered.length/PAGE_SIZE)||1;
  const paged      = filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);

  const copy=(text,id)=>{
    navigator.clipboard?.writeText(String(text)).then(()=>{
      setCopied(id);
      showToast(`Copied: ${text}`,"copy");
      setTimeout(()=>setCopied(null),1500);
    });
  };

  return (
    <div className="fixed inset-0 z-[8500]" style={{background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)"}}>
      {/* backdrop click */}
      <div className="absolute inset-0" onClick={onClose}/>

      {/* drawer panel — slides up on mobile, appears from right on desktop */}
      <div className="absolute bottom-0 left-0 right-0 sm:right-0 sm:top-0 sm:left-auto sm:bottom-0 sm:w-[480px] flex flex-col"
        style={{background:"#0b1121",borderTop:"1px solid rgba(255,255,255,0.1)",
          boxShadow:"-8px 0 40px rgba(0,0,0,0.5)",
          borderRadius:isMobile?"24px 24px 0 0":"0",
          maxHeight:isMobile?"90vh":"100vh",
          animation:isMobile?"slideUp .35s cubic-bezier(.22,1,.36,1)":"slideRight .35s cubic-bezier(.22,1,.36,1)"}}>

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{borderBottom:"1px solid rgba(255,255,255,0.07)",background:"rgba(99,102,241,0.08)"}}>
          {/* drag handle on mobile */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/20 sm:hidden"/>
          <div className="flex items-center gap-3 mt-2 sm:mt-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
              style={{background:"rgba(245,158,11,0.2)",border:"1px solid rgba(245,158,11,0.35)"}}>🛡</div>
            <div>
              <h2 className="text-white font-bold text-base">App Admins</h2>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                {loading?"loading…":`${filtered.length} of ${admins.length} admin${admins.length!==1?"s":""}`}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)"}}>
            ✕
          </button>
        </div>

        {/* ── SEARCH ── */}
        <div className="px-4 py-3 shrink-0" style={{borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-[15px] pointer-events-none">⌕</span>
            <input autoFocus={!isMobile} value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}
              placeholder="Search by name, username, UID…"
              className="w-full pl-10 pr-9 py-2.5 rounded-xl text-white text-sm outline-none"
              style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)"}}
              onFocus={e=>e.target.style.borderColor="#f59e0b80"}
              onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
            {search&&<button onClick={()=>{setSearch("");setPage(0);}}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/10 text-slate-400 flex items-center justify-center text-[10px]">✕</button>}
          </div>
        </div>

        {/* ── LIST ── */}
        <div className="flex-1 overflow-y-auto" style={{WebkitOverflowScrolling:"touch"}}>
          {loading ? <Spinner color="#f59e0b"/> :
           filtered.length===0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
              <div className="text-4xl opacity-20">🛡</div>
              <p className="text-sm">{search?`No admins match "${search}"`:"No app admins yet"}</p>
            </div>
          ) : paged.map((admin,i)=>{
            const il = actionLoading===admin.objectId;
            return (
              <div key={admin.objectId}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors"
                style={{borderBottom:"1px solid rgba(255,255,255,0.04)",animation:`fadeUp .18s ease ${i*10}ms both`}}
                onMouseEnter={e=>!il&&(e.currentTarget.style.background="rgba(255,255,255,0.03)")}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>

                <Av user={admin} size={40} badge={false}/>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white text-sm truncate max-w-[160px]">{admin.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold shrink-0">🛡 ADMIN</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-slate-500 font-mono">@{admin.username}</span>
                    <button onClick={()=>copy(admin.uid,`d-${admin.objectId}`)}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded-md transition-colors"
                      style={{background:"rgba(255,255,255,0.05)",color:copied===`d-${admin.objectId}`?"#38bdf8":"#64748b"}}>
                      UID:{admin.uid} ⎘
                    </button>
                  </div>
                  {admin.whatsapp&&<div className="text-[10px] text-slate-600 font-mono mt-0.5">{admin.whatsapp}</div>}
                  <div className="text-[10px] text-slate-600 mt-0.5">{fmtDate(admin.createdAt)}</div>
                </div>

                <button onClick={()=>onRemove(admin)} disabled={il}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50 shrink-0 active:scale-95">
                  {il?<span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin"/>:"✕"}
                  Remove
                </button>
              </div>
            );
          })}
        </div>

        {/* ── PAGINATION ── */}
        {!loading&&filtered.length>0&&(
          <div className="shrink-0 px-4" style={{borderTop:"1px solid rgba(255,255,255,0.05)"}}>
            <Pager page={page} total={totalPages} onChange={setPage} small/>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div className="shrink-0 px-5 py-3 flex items-center justify-between"
          style={{borderTop:"1px solid rgba(255,255,255,0.05)",background:"rgba(0,0,0,0.15)"}}>
          <span className="text-xs text-slate-500">{admins.length} total admin{admins.length!==1?"s":""}</span>
          <button onClick={onClose}
            className="px-5 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-400 text-xs font-semibold hover:text-white transition-colors">
            Close
          </button>
        </div>
        {/* iOS safe area */}
        <div style={{height:"env(safe-area-inset-bottom,0px)"}}/>
      </div>
    </div>
  );
}

/* ══════════════════════════════
   MAIN COMPONENT
══════════════════════════════ */
export default function AppAdmin() {
  const isMobile = useIsMobile();

  /* all-users */
  const [users,         setUsers]         = useState([]);
  const [searchInput,   setSearchInput]   = useState("");
  const [search,        setSearch]        = useState("");
  const [loading,       setLoading]       = useState(false);
  const [page,          setPage]          = useState(0);
  const [totalCount,    setTotalCount]    = useState(0);
  const [viewMode,      setViewMode]      = useState(null); // null = auto

  /* admins drawer */
  const [admins,        setAdmins]        = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [drawerOpen,    setDrawerOpen]    = useState(false);

  /* shared */
  const [stats,         setStats]         = useState({total:0,admins:0});
  const [actionLoading, setActionLoading] = useState(null);
  const [toast,         setToast]         = useState(null);
  const [confirm,       setConfirm]       = useState(null);
  const [whatsapp,      setWhatsapp]      = useState("");
  const [copied,        setCopied]        = useState(null);

  const searchRef = useRef();

  /* effective view mode: auto-detect based on screen */
  const effectiveView = viewMode ?? (isMobile ? "card" : "list");

  const showToast = useCallback((msg,type="success")=>{
    setToast({msg,type});
    setTimeout(()=>setToast(null),3200);
  },[]);

  const copy=(text,id)=>{
    navigator.clipboard?.writeText(String(text)).then(()=>{
      setCopied(id);
      showToast(`Copied: ${text}`,"copy");
      setTimeout(()=>setCopied(null),1800);
    });
  };

  /* debounce */
  useEffect(()=>{const t=setTimeout(()=>{setSearch(searchInput);setPage(0);},380);return()=>clearTimeout(t);},[searchInput]);

  const fetchStats = useCallback(async()=>{
    try {
      const mk={useMasterKey:true};
      const U=Parse.Object.extend("_User");
      const [total,ac]=await Promise.all([
        new Parse.Query(U).count(mk),
        (()=>{const q=new Parse.Query(U);q.equalTo("admin_role","admin");return q.count(mk);})(),
      ]);
      setStats({total,admins:ac});
    } catch(e){console.error(e);}
  },[]);

  const fetchAdmins = useCallback(async()=>{
    setAdminsLoading(true);
    try {
      const q=new Parse.Query("_User");
      q.equalTo("admin_role","admin");
      q.descending("createdAt"); q.limit(2000);
      q.select(["uid","name","username","email","gender","country","avatar","createdAt","admin_role","whatsapp_number"]);
      const res=await q.find({useMasterKey:true});
      setAdmins(res.map(mapUser));
    } catch(e){showToast("Load admins failed: "+e.message,"error");}
    finally{setAdminsLoading(false);}
  },[showToast]);

  const fetchPage = useCallback(async(pg,srch)=>{
    setLoading(true);
    try {
      const mk={useMasterKey:true};
      const U=Parse.Object.extend("_User");
      const trim=srch.trim();
      let q,cq;
      if(trim){
        const byN=new Parse.Query(U); byN.contains("name",trim);
        const byU=new Parse.Query(U); byU.contains("username",trim);
        const qs=[byN,byU];
        const n=parseInt(trim);
        if(!isNaN(n)){const byI=new Parse.Query(U);byI.equalTo("uid",n);qs.push(byI);}
        q=Parse.Query.or(...qs); cq=Parse.Query.or(...qs);
      } else {q=new Parse.Query(U); cq=new Parse.Query(U);}
      q.descending("createdAt"); q.limit(PAGE_SIZE); q.skip(pg*PAGE_SIZE);
      q.select(["uid","name","username","email","gender","country","avatar","createdAt","admin_role","whatsapp_number"]);
      const [batch,count]=await Promise.all([q.find(mk),cq.count(mk)]);
      setTotalCount(count); setUsers(batch.map(mapUser));
    } catch(e){showToast("Fetch failed: "+e.message,"error");}
    finally{setLoading(false);}
  },[showToast]);

  useEffect(()=>{fetchStats();fetchPage(0,"");fetchAdmins();},[]);
  useEffect(()=>{fetchPage(page,search);},[page,search]);

  const totalPages=Math.ceil(totalCount/PAGE_SIZE)||1;

  const askToggle=(user)=>{
    setWhatsapp("");
    if(user.isAdmin){
      setConfirm({
        title:"Remove Admin Role",
        body:`Remove <strong style="color:#fff">@${user.username}</strong> from App Admin?<br/><span style="color:#64748b;font-size:11px">Their AgentRole record will also be deleted.</span>`,
        confirmLabel:"Yes, Remove",danger:true,user,
        showWhatsapp:false,whatsapp:"",setWhatsapp:()=>{},
      });
    } else {
      setConfirm({
        title:"Make App Admin",
        body:`Grant App Admin role to <strong style="color:#fff">@${user.username}</strong>?<br/><span style="color:#64748b;font-size:11px">An AgentRole record will be created automatically.</span>`,
        confirmLabel:"Yes, Make Admin",danger:false,user,
        showWhatsapp:true,whatsapp:whatsapp,setWhatsapp:setWhatsapp,
      });
    }
  };

  const doToggle=async()=>{
    if(!confirm) return;
    const {user}=confirm; const making=!user.isAdmin;
    setConfirm(null); setActionLoading(user.objectId);
    try {
      const mk={useMasterKey:true};
      const obj=await new Parse.Query("_User").get(user.objectId,mk);
      if(making){
        obj.set("admin_role","admin");
        if(whatsapp.trim()) obj.set("whatsapp_number",whatsapp.trim());
        await obj.save(null,mk);
        const rec=new (Parse.Object.extend("AgentRole"))();
        rec.set("admin_id",user.objectId); rec.set("admin_by_id","admin");
        rec.set("total_points",0); rec.set("points",0); rec.set("total_agent",0);
        rec.setArray("agents_list",[]);
        await rec.save(null,mk);
        const upd={...user,isAdmin:true,adminRole:"admin",whatsapp:whatsapp.trim()||user.whatsapp};
        setUsers(p=>p.map(u=>u.objectId===user.objectId?upd:u));
        setAdmins(p=>[upd,...p]);
        showToast(`✓ @${user.username} is now App Admin!`);
      } else {
        obj.set("admin_role","");
        await obj.save(null,mk);
        const aq=new Parse.Query("AgentRole"); aq.equalTo("admin_id",user.objectId);
        const found=await aq.first(mk);
        if(found) await found.destroy(mk);
        const upd={...user,isAdmin:false,adminRole:""};
        setUsers(p=>p.map(u=>u.objectId===user.objectId?upd:u));
        setAdmins(p=>p.filter(a=>a.objectId!==user.objectId));
        showToast(`@${user.username} removed from App Admin`,"info");
      }
      fetchStats(); setWhatsapp("");
    } catch(e){showToast("Failed: "+e.message,"error");}
    finally{setActionLoading(null);}
  };

  /* ── User Card ── */
  const UserCard=({user,i})=>{
    const il=actionLoading===user.objectId;
    return (
      <div className={`rounded-2xl p-4 flex flex-col gap-3 transition-all active:scale-[0.99]
        ${user.isAdmin?"bg-amber-500/[0.06] border border-amber-500/20":"bg-white/[0.03] border border-white/[0.07]"}`}
        style={{animation:`fadeUp .25s ease ${i*20}ms both`}}>

        <div className="flex items-center gap-3">
          <Av user={user} size={44}/>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-white text-sm truncate">{user.name}</div>
            <div className="text-[11px] text-slate-500 font-mono">@{user.username}</div>
          </div>
          {user.isAdmin&&<span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold shrink-0">🛡</span>}
        </div>

        <button onClick={()=>copy(user.uid,`cu-${user.objectId}`)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl active:scale-95 transition-all"
          style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)"}}>
          <span className="text-[9px] font-bold text-slate-600 uppercase">UID</span>
          <span className={`font-mono text-xs flex-1 text-left ${copied===`cu-${user.objectId}`?"text-sky-400":"text-slate-300"}`}>{user.uid}</span>
          <span className="text-[10px] text-slate-600">⎘</span>
        </button>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-500">
          <span className="truncate"><span className="text-slate-600 font-bold text-[9px] uppercase mr-1">Email</span>{user.email}</span>
          <span><span className="text-slate-600 font-bold text-[9px] uppercase mr-1">Joined</span>{timeAgo(user.createdAt)}</span>
          <span><span className="text-slate-600 font-bold text-[9px] uppercase mr-1">Gender</span>{user.gender==="MAL"?"Male":user.gender==="FML"?"Female":user.gender}</span>
          <span className="truncate"><span className="text-slate-600 font-bold text-[9px] uppercase mr-1">Country</span>{user.country}</span>
        </div>

        <button onClick={()=>askToggle(user)} disabled={il}
          className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50
            ${user.isAdmin?"bg-red-500/12 border border-red-500/30 text-red-400":"bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"}`}>
          {il?<span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin"/>
            :user.isAdmin?"✕ Remove Admin Role":"🛡 Make App Admin"}
        </button>
      </div>
    );
  };

  /* ── User Row (desktop list) ── */
  const UserRow=({user,i})=>{
    const il=actionLoading===user.objectId;
    return (
      <div className={`grid items-center px-4 py-3 border-b border-white/[0.04] transition-colors hover:bg-white/[0.025]
        ${user.isAdmin?"bg-amber-500/[0.025]":""}`}
        style={{gridTemplateColumns:"40px 1fr 100px 80px 120px 160px",gap:"10px",
          animation:`fadeUp .22s ease ${i*14}ms both`}}>

        <Av user={user} size={34}/>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-white text-sm truncate max-w-[160px]">{user.name}</span>
            {user.isAdmin&&<span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold shrink-0">ADMIN</span>}
          </div>
          <span className="text-[11px] text-slate-500 font-mono">@{user.username}</span>
        </div>

        <button onClick={()=>copy(user.uid,`u-${user.objectId}`)}
          className="flex items-center gap-1 font-mono text-[11px] px-2 py-1 rounded-lg transition-all overflow-hidden"
          style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",
            color:copied===`u-${user.objectId}`?"#38bdf8":"#94a3b8"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(56,189,248,0.08)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.04)"}>
          <span className="truncate">{user.uid}</span>
          <span className="text-[9px] opacity-50 shrink-0">⎘</span>
        </button>

        <span className="text-[11px] text-slate-500 font-mono">{timeAgo(user.createdAt)}</span>

        <div>
          {user.isAdmin
            ?<span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-amber-500/12 border border-amber-500/30 text-amber-400 font-bold">🛡 Admin</span>
            :<span className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-500">User</span>
          }
        </div>

        <button onClick={()=>askToggle(user)} disabled={il}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50
            ${user.isAdmin?"bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
              :"bg-indigo-500/12 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/22"}`}>
          {il?<span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin"/>
            :user.isAdmin?"✕ Remove":"🛡 Make Admin"}
        </button>
      </div>
    );
  };

  /* ════════════════════════════
     RENDER
  ════════════════════════════ */
  return (
    <div className="min-h-screen text-slate-200" style={{background:"#060c18",fontFamily:"'Inter',-apple-system,sans-serif"}}>
      <style>{`
        @keyframes slideDown  {from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp    {from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)}}
        @keyframes slideRight {from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)}}
        @keyframes pop        {from{opacity:0;transform:scale(.94)}       to{opacity:1;transform:scale(1)}}
        @keyframes fadeUp     {from{opacity:0;transform:translateY(8px)}  to{opacity:1;transform:translateY(0)}}
        @keyframes spin       {to{transform:rotate(360deg)}}
        @keyframes pulse      {0%,100%{opacity:1}50%{opacity:0.5}}
      `}</style>

      <Toast toast={toast}/>
      <ConfirmModal data={confirm} onClose={()=>{setConfirm(null);setWhatsapp("");}} onConfirm={doToggle} loading={!!actionLoading}/>

      {/* ADMINS DRAWER */}
      {drawerOpen&&(
        <AdminsDrawer
          admins={admins}
          loading={adminsLoading}
          onClose={()=>setDrawerOpen(false)}
          onRemove={askToggle}
          actionLoading={actionLoading}
          showToast={showToast}
        />
      )}

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">

        {/* ── PAGE HEADER ── */}
        <div className="mb-6">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-[0.15em] mb-3">
            <span>Dashboard</span><span className="opacity-40">›</span>
            <span>Users</span><span className="opacity-40">›</span>
            <span className="text-slate-500">App Admin</span>
          </div>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center text-base sm:text-lg shrink-0"
                  style={{background:"rgba(124,58,237,0.2)",border:"1px solid rgba(124,58,237,0.3)"}}>
                  🛡
                </span>
                App Admin Manager
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5 font-mono">
                {stats.total.toLocaleString()} users · {stats.admins} admins
              </p>
            </div>
            <button onClick={()=>{fetchStats();fetchPage(page,search);fetchAdmins();}} disabled={loading||adminsLoading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-400 text-xs font-bold hover:text-white transition-all disabled:opacity-40">
              <span style={{display:"inline-block",animation:(loading||adminsLoading)?"spin .8s linear infinite":"none"}}>↻</span>
              Refresh
            </button>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {/* Total Users */}
          <div className="flex flex-col gap-1.5 p-4 rounded-2xl"
            style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
              style={{background:"rgba(99,102,241,0.18)",border:"1px solid rgba(99,102,241,0.3)"}}>👥</div>
            <div className="text-xl sm:text-2xl font-black text-indigo-400 tabular-nums">{stats.total.toLocaleString()}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Users</div>
          </div>

          {/* App Admins — CLICKABLE, opens drawer */}
          <button onClick={()=>{setDrawerOpen(true);if(admins.length===0)fetchAdmins();}}
            className="flex flex-col gap-1.5 p-4 rounded-2xl text-left cursor-pointer transition-all hover:-translate-y-0.5 active:scale-[0.98] group"
            style={{background:"rgba(245,158,11,0.07)",border:"1px solid rgba(245,158,11,0.3)",
              boxShadow:"0 0 0 1px rgba(245,158,11,0.1)"}}>
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
                style={{background:"rgba(245,158,11,0.2)",border:"1px solid rgba(245,158,11,0.4)"}}>🛡</div>
              <span className="text-[9px] font-bold text-amber-500/50 group-hover:text-amber-400 transition-colors tracking-widest uppercase">
                VIEW →
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 tabular-nums">{stats.admins}</div>
            <div className="text-[10px] font-bold text-amber-500/70 uppercase tracking-wider">App Admins</div>
            <div className="text-[9px] text-amber-500/40 group-hover:text-amber-500/60 transition-colors">Tap to manage</div>
          </button>

          {/* This Page */}
          <div className="flex flex-col gap-1.5 p-4 rounded-2xl"
            style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
              style={{background:"rgba(16,185,129,0.18)",border:"1px solid rgba(16,185,129,0.3)"}}>📄</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 tabular-nums">{users.length}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">This Page</div>
          </div>

          {/* Search Results */}
          <div className="flex flex-col gap-1.5 p-4 rounded-2xl"
            style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
              style={{background:"rgba(6,182,212,0.18)",border:"1px solid rgba(6,182,212,0.3)"}}>🔍</div>
            <div className="text-xl sm:text-2xl font-black text-cyan-400 tabular-nums">{totalCount.toLocaleString()}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Results</div>
          </div>
        </div>

        {/* ── TOOLBAR ── */}
        <div className="flex items-center gap-2 flex-wrap mb-5">
          {/* Search */}
          <div className="relative flex-1 min-w-0" style={{minWidth:isMobile?"0":"200px"}}>
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-[15px] pointer-events-none">⌕</span>
            <input ref={searchRef} value={searchInput} onChange={e=>setSearchInput(e.target.value)}
              placeholder={isMobile?"Search…":"Search by name, username or UID…"}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl text-white text-sm outline-none transition-all"
              style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)"}}
              onFocus={e=>e.target.style.borderColor="#6366f180"}
              onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
            {searchInput&&<button onClick={()=>{setSearchInput("");setSearch("");setPage(0);searchRef.current?.focus();}}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/10 text-slate-400 flex items-center justify-center text-[10px]">✕</button>}
          </div>

          {/* View toggle — only show on non-mobile, or when manually overridden */}
          <div className="flex rounded-xl overflow-hidden border border-white/10 shrink-0">
            {[["list","☰"],["card","⊞"]].map(([v,l])=>(
              <button key={v} onClick={()=>setViewMode(v)}
                className="px-3 py-2.5 text-xs font-bold transition-all"
                style={{
                  background:effectiveView===v?"#6366f1":"rgba(255,255,255,0.04)",
                  color:effectiveView===v?"#fff":"#64748b",
                }}>
                {isMobile?l:`${l} ${v==="list"?"List":"Cards"}`}
              </button>
            ))}
          </div>

          {/* View Admins button — always visible */}
          <button onClick={()=>{setDrawerOpen(true);if(admins.length===0)fetchAdmins();}}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0"
            style={{background:"rgba(245,158,11,0.12)",border:"1px solid rgba(245,158,11,0.3)",color:"#fbbf24"}}>
            🛡
            {isMobile?"Admins":`View Admins (${stats.admins})`}
          </button>

          {!loading&&!isMobile&&(
            <span className="text-xs text-slate-500 font-mono px-3 py-2 rounded-xl shrink-0"
              style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
              {totalCount.toLocaleString()} results
            </span>
          )}
        </div>

        {/* ── CONTENT ── */}
        {loading ? (
          <Spinner color="#6366f1"/>
        ) : users.length===0 ? (
          <Empty icon="◎" msg="No users found"
            action={{label:"Clear search",onClick:()=>{setSearchInput("");setSearch("");setPage(0);}}}/>
        ) : effectiveView==="card" ? (
          /* CARD GRID */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
            {users.map((u,i)=><UserCard key={u.objectId} user={u} i={i}/>)}
          </div>
        ) : (
          /* LIST TABLE — desktop only */
          <div className="rounded-2xl overflow-hidden mb-2" style={{border:"1px solid rgba(255,255,255,0.07)"}}>
            <div className="grid px-4 py-2.5 text-[9px] font-bold text-slate-600 uppercase tracking-widest"
              style={{gridTemplateColumns:"40px 1fr 100px 80px 120px 160px",gap:"10px",
                background:"rgba(0,0,0,0.2)",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
              {["","Name / Username","UID","Joined","Status","Action"].map(h=><span key={h}>{h}</span>)}
            </div>
            {users.map((u,i)=><UserRow key={u.objectId} user={u} i={i}/>)}
          </div>
        )}

        {/* PAGINATION */}
        <Pager page={page} total={totalPages} onChange={n=>{setPage(n);window.scrollTo({top:0,behavior:"smooth"});}}/>

        {/* tip */}
        <div className="mt-4 p-4 rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-slate-400"
          style={{background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.15)"}}>
          <span className="text-lg shrink-0">💡</span>
          <span>
            Search any user and tap <strong className="text-indigo-400">🛡 Make App Admin</strong> to promote them.
            To see and manage all current admins, tap the{" "}
            <button onClick={()=>setDrawerOpen(true)}
              className="text-amber-400 font-semibold hover:text-amber-300 transition-colors underline underline-offset-2">
              View Admins
            </button>{" "}
            button.
          </span>
        </div>
      </div>

      {/* ── FLOATING BUTTON (mobile only) ── */}
      {isMobile&&(
        <button onClick={()=>{setDrawerOpen(true);if(admins.length===0)fetchAdmins();}}
          className="fixed bottom-6 right-5 flex items-center gap-2 px-5 py-3.5 rounded-full text-sm font-bold shadow-2xl z-[7000] transition-all active:scale-95"
          style={{background:"#f59e0b",color:"#000",
            boxShadow:"0 8px 32px rgba(245,158,11,0.4), 0 0 0 1px rgba(245,158,11,0.3)"}}>
          🛡 Admins
          <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black"
            style={{background:"rgba(0,0,0,0.25)"}}>
            {stats.admins}
          </span>
        </button>
      )}

      {/* bottom safe-area spacer for FAB */}
      {isMobile&&<div style={{height:"calc(80px + env(safe-area-inset-bottom, 0px))"}}/>}
    </div>
  );
}