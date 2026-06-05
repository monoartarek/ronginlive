import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Parse from "../../parseConfig";

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
const PAGE_SIZE = 20;

function avatarColor(str) {
  const p = ["#6366f1","#f472b6","#34d399","#fbbf24","#f87171","#60a5fa","#a78bfa","#22d3ee"];
  let h = 0;
  for (let i = 0; i < (str||"").length; i++) h = str.charCodeAt(i) + ((h<<5)-h);
  return p[Math.abs(h) % p.length];
}

function mapUser(u) {
  const av = u.get("avatar");
  let avatarUrl = null;
  if (av && typeof av.url === "function") avatarUrl = av.url();
  else if (typeof av === "string") avatarUrl = av;
  const rp = u.get("Room_priority");
  return {
    objectId:    u.id,
    uid:         String(u.get("uid") || "—"),
    name:        u.get("name")     || "—",
    username:    u.get("username") || u.get("email") || "—",
    email:       u.get("email")    || "—",
    roomPriority:rp === true || rp === "true",
    myAgentId:   u.get("my_agent_id") || null, // plain ObjectId string
    agencyName:  null,   // filled in after agent lookup
    avatarUrl,
  };
}

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
function Toast({ toast }) {
  if (!toast) return null;
  const cfg = {
    success:"bg-emerald-900/95 border-emerald-500/40 text-emerald-200",
    error:  "bg-red-950/95 border-red-500/40 text-red-200",
    info:   "bg-sky-950/95 border-sky-500/40 text-sky-200",
  };
  const icons = { success:"✓", error:"✕", info:"ℹ" };
  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-5 sm:translate-x-0 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl text-sm font-semibold backdrop-blur-sm max-w-sm ${cfg[toast.type]||cfg.info}`}
      style={{animation:"toastIn .3s cubic-bezier(.34,1.56,.64,1)"}}>
      <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs shrink-0">
        {icons[toast.type]||"ℹ"}
      </span>
      {toast.msg}
    </div>
  );
}

/* ══════════════════════════════════════════
   CONFIRM MODAL
══════════════════════════════════════════ */
function ConfirmModal({ data, onClose, onConfirm, loading }) {
  if (!data) return null;
  return (
    <div className="fixed inset-0 z-[8000] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{background:"#0c0e1a",border:"1px solid rgba(255,255,255,0.1)",animation:"modalUp .3s cubic-bezier(.22,1,.36,1)"}}>
        <div className={`h-0.5 ${data.enable?"bg-gradient-to-r from-emerald-400 to-teal-400":"bg-gradient-to-r from-red-400 to-rose-400"}`}/>
        <div className="p-7 flex flex-col items-center gap-4 text-center">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl
            ${data.enable?"bg-emerald-500/15 border border-emerald-500/30":"bg-red-500/15 border border-red-500/30"}`}>
            {data.enable?"🟢":"🔴"}
          </div>
          <div>
            <h3 className="text-white font-black text-base mb-1.5">{data.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed" dangerouslySetInnerHTML={{__html:data.body}}/>
          </div>
          {data.user&&(
            <div className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left"
              style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
              <UserAvatar user={data.user} size={36}/>
              <div className="min-w-0">
                <div className="text-white font-bold text-sm truncate">{data.user.name}</div>
                <div className="text-slate-500 text-xs font-mono">@{data.user.username} · UID {data.user.uid}</div>
              </div>
            </div>
          )}
          <div className="flex gap-3 w-full pt-1">
            <button onClick={onClose} disabled={loading}
              className="flex-1 py-3 rounded-xl border border-white/10 bg-white/5 text-slate-400 text-sm font-semibold hover:bg-white/10 hover:text-white transition-all">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={loading}
              className={`flex-1 py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[.98]
                ${data.enable?"bg-emerald-600 hover:bg-emerald-500":"bg-red-600 hover:bg-red-500"}`}>
              {loading&&<span className="w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin"/>}
              {loading?"Updating…":data.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   USER AVATAR
══════════════════════════════════════════ */
function UserAvatar({ user, size=36 }) {
  const bg  = avatarColor(user.username);
  const r   = Math.round(size*0.28);
  const ini = (user.name||user.username||"?")[0].toUpperCase();
  return (
    <div className="relative shrink-0" style={{width:size,height:size}}>
      {user.avatarUrl
        ?<img src={user.avatarUrl} alt={user.name} className="object-cover"
            style={{width:size,height:size,borderRadius:r,border:"1.5px solid rgba(255,255,255,0.1)"}}/>
        :<div className="flex items-center justify-center font-bold text-white"
            style={{width:size,height:size,borderRadius:r,background:bg,
              fontSize:Math.max(10,size*0.36),border:"1.5px solid rgba(255,255,255,0.08)"}}>
            {ini}
          </div>
      }
      <span className="absolute -bottom-0.5 -right-0.5"
        style={{width:12,height:12,borderRadius:"50%",
          background:user.roomPriority?"#10b981":"#6b7280",
          border:"2px solid #060c18",
          boxShadow:user.roomPriority?"0 0 6px rgba(16,185,129,0.6)":"none",
          display:"block"}}/>
    </div>
  );
}

/* ══════════════════════════════════════════
   PRIORITY TOGGLE
══════════════════════════════════════════ */
function PriorityToggle({ user, onToggle, loading }) {
  const isLoading = loading===user.objectId;
  return (
    <button onClick={()=>onToggle(user)} disabled={isLoading}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
        ${user.roomPriority
          ?"bg-emerald-500/12 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/22"
          :"bg-slate-500/10 border border-slate-500/25 text-slate-400 hover:bg-slate-500/20"}`}>
      {isLoading
        ?<span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin"/>
        :<span className={`w-3.5 h-3.5 rounded-full transition-all ${user.roomPriority?"bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]":"bg-slate-600"}`}/>
      }
      {user.roomPriority?"Enabled":"Disabled"}
    </button>
  );
}

/* ══════════════════════════════════════════
   AGENCY NAME BADGE
══════════════════════════════════════════ */
function AgencyBadge({ name }) {
  if (!name) return <span className="text-slate-600 text-xs">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{background:"rgba(96,165,250,0.1)",border:"1px solid rgba(96,165,250,0.25)",color:"#93c5fd"}}>
      🏢 {name}
    </span>
  );
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function AgencyClients() {
  const [users,         setUsers]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [agencyLoading, setAgencyLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast,         setToast]         = useState(null);
  const [confirm,       setConfirm]       = useState(null);
  const [searchInput,   setSearchInput]   = useState("");
  const [search,        setSearch]        = useState("");
  const [page,          setPage]          = useState(0);
  const [totalCount,    setTotalCount]    = useState(0);
  const [viewMode,      setViewMode]      = useState("list");
  const [stats,         setStats]         = useState({total:0,enabled:0,disabled:0});
  const searchRef = useRef();

  const showToast = useCallback((msg,type="success")=>{
    setToast({msg,type});
    setTimeout(()=>setToast(null),3200);
  },[]);

  /* ── debounce ── */
  useEffect(()=>{
    const t=setTimeout(()=>{setSearch(searchInput);setPage(0);},380);
    return ()=>clearTimeout(t);
  },[searchInput]);

  /* ══════════════════════════════════════════
     FETCH AGENCY NAMES
     my_agent_id is a plain ObjectId string on _User.
     Batch-fetch all unique agent records in one query.
  ══════════════════════════════════════════ */
  const enrichWithAgencyNames = useCallback(async(userList) => {
    // collect unique non-null agent IDs
    const agentIds = [...new Set(
      userList.map(u=>u.myAgentId).filter(Boolean)
    )];
    if (!agentIds.length) return userList;

    setAgencyLoading(true);
    try {
      const q = new Parse.Query("_User");
      q.containedIn("objectId", agentIds);
      q.select(["agency_name"]);
      q.limit(agentIds.length + 10);
      const agents = await q.find({ useMasterKey:true });

      // build objectId → agency_name map
      const nameMap = {};
      agents.forEach(a => { nameMap[a.id] = a.get("agency_name") || null; });

      return userList.map(u => ({
        ...u,
        agencyName: u.myAgentId ? (nameMap[u.myAgentId] || null) : null,
      }));
    } catch(e) {
      console.error("Agency name fetch failed:", e.message);
      return userList;
    } finally {
      setAgencyLoading(false);
    }
  },[]);

  /* ── fetch users ── */
  const fetchUsers = useCallback(async(pg=0, srch="") => {
    setLoading(true);
    try {
      const mk   = {useMasterKey:true};
      const trim = srch.trim();

      const buildQ = () => {
        const q = new Parse.Query("_User");
        q.equalTo("agency_role","agency_client");
        if (trim) {
          const n=parseInt(trim);
          if (!isNaN(n)) q.equalTo("uid",n);
          else           q.contains("username",trim);
        }
        return q;
      };

      const dq=buildQ();
      dq.descending("createdAt");
      dq.limit(PAGE_SIZE);
      dq.skip(pg*PAGE_SIZE);

      const cq=buildQ();

      /* stats query (always unfiltered) */
      const allQ=new Parse.Query("_User");
      allQ.equalTo("agency_role","agency_client");
      allQ.limit(2000);

      const [results, count, allUsers] = await Promise.all([
        dq.find(mk), cq.count(mk), allQ.find(mk)
      ]);

      setTotalCount(count);

      // stats
      const enabled=allUsers.filter(u=>u.get("Room_priority")===true).length;
      setStats({total:allUsers.length, enabled, disabled:allUsers.length-enabled});

      // map and enrich with agency names
      const mapped = results.map(mapUser);
      const enriched = await enrichWithAgencyNames(mapped);
      setUsers(enriched);
    } catch(e) {
      showToast("Fetch failed: "+e.message,"error");
    } finally {
      setLoading(false);
    }
  },[showToast, enrichWithAgencyNames]);

  useEffect(()=>{fetchUsers(0,"");},[fetchUsers]);
  useEffect(()=>{fetchUsers(page,search);},[page,search]);

  const totalPages=Math.ceil(totalCount/PAGE_SIZE)||1;

  /* ── toggle confirm ── */
  const askToggle=(user)=>{
    const next=!user.roomPriority;
    setConfirm({
      title:        next?"Enable Room Priority":"Disable Room Priority",
      body:         `Set <strong>Room Priority</strong> to <strong style="color:${next?"#34d399":"#f87171"}">${next}</strong> for this user?`,
      confirmLabel: next?"Yes, Enable":"Yes, Disable",
      enable:       next, user,
    });
  };

  const doToggle=async()=>{
    if(!confirm) return;
    const {user}=confirm; const next=!user.roomPriority;
    setConfirm(null); setActionLoading(user.objectId);
    try {
      const mk={useMasterKey:true};
      const obj=await new Parse.Query("_User").get(user.objectId,mk);
      obj.set("Room_priority",next);
      await obj.save(null,mk);
      setUsers(prev=>prev.map(u=>u.objectId===user.objectId?{...u,roomPriority:next}:u));
      setStats(s=>({...s,enabled:s.enabled+(next?1:-1),disabled:s.disabled+(next?-1:1)}));
      showToast(`Room Priority ${next?"enabled":"disabled"} for @${user.username}`);
    } catch(e){showToast("Update failed: "+e.message,"error");}
    finally{setActionLoading(null);}
  };

  /* ══════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════ */
  return (
    <div className="min-h-screen text-slate-200"
      style={{background:"#060c18",fontFamily:"'Inter',-apple-system,sans-serif"}}>

      <style>{`
        @keyframes toastIn {from{opacity:0;transform:translateY(-10px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes modalUp {from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeUp  {from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)}}
        @keyframes spin    {to{transform:rotate(360deg)}}
      `}</style>

      <Toast toast={toast}/>
      <ConfirmModal data={confirm} onClose={()=>setConfirm(null)} onConfirm={doToggle} loading={!!actionLoading}/>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">

        {/* ── HEADER ── */}
        <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-1.5">Dashboard / Users</p>
            <h1 className="text-2xl font-black text-white flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0"
                style={{background:"rgba(16,185,129,0.2)",border:"1px solid rgba(16,185,129,0.3)"}}>
                🏢
              </span>
              Top Streams
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-mono">
              <code className="text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded text-xs">agency_role = agency_client</code>
            </p>
          </div>
          <button onClick={()=>fetchUsers(page,search)} disabled={loading||agencyLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-400 text-xs font-bold hover:text-white hover:bg-white/10 transition-all disabled:opacity-40">
            <span style={{display:"inline-block",animation:(loading||agencyLoading)?"spin .8s linear infinite":"none"}}>↻</span>
            Refresh
          </button>
        </div>

        {/* ── STATS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            {label:"Total Clients",value:stats.total,   color:"#60a5fa",glow:"rgba(96,165,250,0.15)",   icon:"👥"},
            {label:"Priority ON",  value:stats.enabled, color:"#34d399",glow:"rgba(52,211,153,0.15)",   icon:"🟢"},
            {label:"Priority OFF", value:stats.disabled,color:"#94a3b8",glow:"rgba(148,163,184,0.12)",  icon:"⚫"},
          ].map(s=>(
            <div key={s.label} className="rounded-2xl p-4 sm:p-5 flex items-center gap-4 transition-all hover:-translate-y-0.5"
              style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",boxShadow:`inset 0 0 30px ${s.glow}`}}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{background:s.glow,border:`1px solid ${s.color}30`}}>
                {s.icon}
              </div>
              <div>
                <div className="text-2xl font-black tabular-nums" style={{color:s.color}}>{s.value.toLocaleString()}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── TOOLBAR ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">⌕</span>
            <input ref={searchRef} value={searchInput}
              onChange={e=>setSearchInput(e.target.value)}
              placeholder="Search by UID or username…"
              className="w-full pl-10 pr-9 py-2.5 rounded-xl text-white text-sm outline-none transition-all"
              style={{background:"rgba(255,255,255,0.05)",border:"1.5px solid rgba(255,255,255,0.1)"}}
              onFocus={e=>e.target.style.borderColor="#10b98180"}
              onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
            {searchInput&&(
              <button onClick={()=>{setSearchInput("");setSearch("");setPage(0);searchRef.current?.focus();}}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-[10px] transition-colors">
                ✕
              </button>
            )}
          </div>
          <div className="flex rounded-xl overflow-hidden border border-white/10 shrink-0">
            {[["list","☰"],["card","⊞"]].map(([v,l])=>(
              <button key={v} onClick={()=>setViewMode(v)}
                className="px-3.5 py-2.5 text-sm font-bold transition-all"
                style={{background:viewMode===v?"#10b981":"rgba(255,255,255,0.04)",color:viewMode===v?"#fff":"#64748b"}}>
                {l}
              </button>
            ))}
          </div>
          {!loading&&(
            <span className="text-xs text-slate-500 font-mono px-3 py-2 rounded-xl shrink-0"
              style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
              {totalCount.toLocaleString()} client{totalCount!==1?"s":""}
            </span>
          )}
        </div>

        {/* ── CONTENT ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-500">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-500" style={{animation:"spin .9s linear infinite"}}/>
              <div className="absolute inset-3 rounded-full border-2 border-transparent border-t-teal-400" style={{animation:"spin .55s linear infinite reverse"}}/>
            </div>
            <p className="text-sm">Loading clients…</p>
          </div>

        ) : users.length===0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-slate-500">
            <div className="text-5xl opacity-20">🏢</div>
            <p className="text-sm">{search?`No clients match "${search}"`:"No agency clients found"}</p>
            {search&&<button onClick={()=>{setSearchInput("");setSearch("");setPage(0);}}
              className="text-xs px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white transition-all">
              Clear search
            </button>}
          </div>

        ) : viewMode==="card" ? (

          /* ═══ CARD VIEW ═══ */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {users.map((user,i)=>(
              <div key={user.objectId}
                className="rounded-2xl p-4 flex flex-col gap-3 transition-all hover:-translate-y-0.5"
                style={{
                  background:user.roomPriority?"rgba(16,185,129,0.05)":"rgba(255,255,255,0.03)",
                  border:`1.5px solid ${user.roomPriority?"rgba(16,185,129,0.2)":"rgba(255,255,255,0.07)"}`,
                  animation:`fadeUp .25s ease ${i*20}ms both`,
                }}>
                <div className="flex items-center gap-3">
                  <UserAvatar user={user} size={44}/>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white text-sm truncate">{user.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">@{user.username}</div>
                  </div>
                  {user.roomPriority&&(
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0"
                      style={{background:"rgba(16,185,129,0.15)",border:"1px solid rgba(16,185,129,0.3)",color:"#34d399"}}>
                      PRIORITY
                    </span>
                  )}
                </div>

                {/* info grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {l:"UID",      v:user.uid,                      mono:true},
                    {l:"ObjectId", v:user.objectId.slice(0,10)+"…", mono:true},
                  ].map(item=>(
                    <div key={item.l} className="rounded-xl px-3 py-2"
                      style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)"}}>
                      <div className="text-[9px] text-slate-600 font-bold uppercase tracking-wider mb-0.5">{item.l}</div>
                      <div className={`text-xs text-slate-300 truncate ${item.mono?"font-mono":""}`}>{item.v}</div>
                    </div>
                  ))}
                </div>

                {/* Agency name */}
                <div className="rounded-xl px-3 py-2"
                  style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)"}}>
                  <div className="text-[9px] text-slate-600 font-bold uppercase tracking-wider mb-1">Agency</div>
                  {agencyLoading&&!user.agencyName
                    ?<span className="inline-block w-16 h-3 rounded animate-pulse" style={{background:"rgba(255,255,255,0.08)"}}/>
                    :<AgencyBadge name={user.agencyName}/>
                  }
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                  <span className="text-xs text-slate-500 font-semibold">Room Priority</span>
                  <PriorityToggle user={user} onToggle={askToggle} loading={actionLoading}/>
                </div>
              </div>
            ))}
          </div>

        ) : (

          /* ═══ LIST VIEW ═══ */
          <div className="rounded-2xl overflow-hidden" style={{border:"1px solid rgba(255,255,255,0.07)"}}>
            {/* header row */}
            <div className="hidden sm:grid px-4 py-2.5 text-[9px] font-bold text-slate-600 uppercase tracking-widest"
              style={{
                gridTemplateColumns:"40px 1fr 90px 1fr 130px 140px",
                gap:"12px",
                background:"rgba(0,0,0,0.2)",
                borderBottom:"1px solid rgba(255,255,255,0.06)"
              }}>
              {["","Name / Username","UID","Agency Name","Room Priority","Action"].map(h=>(
                <span key={h}>{h}</span>
              ))}
            </div>

            {users.map((user,i)=>(
              <div key={user.objectId}
                className={`flex sm:grid items-center px-4 py-3.5 border-b border-white/[0.04] transition-colors gap-3
                  hover:bg-white/[0.025] ${user.roomPriority?"bg-emerald-500/[0.025]":""}`}
                style={{
                  gridTemplateColumns:"40px 1fr 90px 1fr 130px 140px",
                  gap:"12px",
                  animation:`fadeUp .2s ease ${i*14}ms both`,
                }}>

                {/* avatar */}
                <div className="shrink-0">
                  <UserAvatar user={user} size={36}/>
                </div>

                {/* name */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white text-sm truncate max-w-[160px]">{user.name}</span>
                    {user.roomPriority&&(
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0"
                        style={{background:"rgba(16,185,129,0.15)",border:"1px solid rgba(16,185,129,0.3)",color:"#34d399"}}>
                        PRIORITY
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">@{user.username}</span>
                </div>

                {/* UID */}
                <div className="hidden sm:block">
                  <span className="font-mono text-xs text-slate-400 px-2 py-1 rounded-lg"
                    style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
                    {user.uid}
                  </span>
                </div>

                {/* ── AGENCY NAME COLUMN ── */}
                <div className="hidden sm:block min-w-0">
                  {agencyLoading&&!user.agencyName
                    ? <span className="inline-block w-24 h-5 rounded-lg animate-pulse" style={{background:"rgba(255,255,255,0.07)"}}/>
                    : <AgencyBadge name={user.agencyName}/>
                  }
                </div>

                {/* room priority status */}
                <div className="hidden sm:block">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-bold
                    ${user.roomPriority
                      ?"bg-emerald-500/12 border border-emerald-500/30 text-emerald-400"
                      :"bg-white/[0.04] border border-white/[0.08] text-slate-500"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${user.roomPriority?"bg-emerald-400":"bg-slate-600"}`}/>
                    {user.roomPriority?"Enabled":"Disabled"}
                  </span>
                </div>

                {/* action */}
                <div className="sm:flex sm:justify-end">
                  <PriorityToggle user={user} onToggle={askToggle} loading={actionLoading}/>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PAGINATION ── */}
        {totalPages>1&&(
          <div className="flex items-center justify-center gap-1.5 flex-wrap py-2">
            {[["«",0],["‹",page-1]].map(([l,t],i)=>(
              <button key={i} disabled={page===0} onClick={()=>setPage(Math.max(0,t))}
                className="h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                {l}
              </button>
            ))}
            {Array.from({length:Math.min(totalPages,7)},(_,i)=>{
              const p=totalPages<=7?i:Math.max(0,Math.min(totalPages-7,page-3))+i;
              return(
                <button key={p} onClick={()=>setPage(p)}
                  className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold transition-all
                    ${page===p?"bg-emerald-600 text-white shadow-lg shadow-emerald-500/30":"border border-white/10 bg-white/5 text-slate-400 hover:text-white"}`}>
                  {p+1}
                </button>
              );
            })}
            {[["›",page+1],["»",totalPages-1]].map(([l,t],i)=>(
              <button key={i} disabled={page===totalPages-1} onClick={()=>setPage(Math.min(totalPages-1,t))}
                className="h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                {l}
              </button>
            ))}
            <span className="text-xs text-slate-600 font-mono pl-2">{page+1} / {totalPages}</span>
          </div>
        )}
      </div>
    </div>
  );
}