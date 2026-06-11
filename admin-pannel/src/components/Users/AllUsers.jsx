import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Parse from "../../parseConfig";

const PAGE_SIZE = 25;

/* ── TAG OPTIONS ── */
const TAG_OPTIONS = [
  { label: "None",        value: "",               color: "text-slate-400" },
  { label: "CS",          value: "CS_Tag",          color: "text-sky-400" },
  { label: "Super Admin", value: "Super_Admin_Tag", color: "text-rose-400" },
  { label: "Official",    value: "Official_Tag",    color: "text-blue-400" },
  { label: "CEO",         value: "CEO_Tag",         color: "text-amber-400" },
  { label: "Manager",     value: "Manager_Tag",     color: "text-purple-400" },
  { label: "Admin",       value: "Admin_Tag",       color: "text-emerald-400" },
];
function getTagLabel(val) {
  const f = TAG_OPTIONS.find(t => t.value === val);
  return f ? f.label : (val || "—");
}
function getTagColor(val) {
  const f = TAG_OPTIONS.find(t => t.value === val);
  return f ? f.color : "text-slate-400";
}

/* ── helpers ── */
function getInitial(name) { return (name || "?").charAt(0).toUpperCase(); }
function getAvatarColor(str) {
  const p = ["#6366f1","#f472b6","#34d399","#fbbf24","#f87171","#60a5fa","#a78bfa","#22d3ee","#fb923c","#e879f9"];
  let h = 0;
  for (let i = 0; i < (str||"").length; i++) h = str.charCodeAt(i) + ((h<<5)-h);
  return p[Math.abs(h) % p.length];
}
function timeAgo(d) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff/60000);
  if (m<1) return "just now";
  if (m<60) return `${m}m ago`;
  const h = Math.floor(m/60);
  if (h<24) return `${h}h ago`;
  const day = Math.floor(h/24);
  if (day<30) return `${day}d ago`;
  return new Date(d).toLocaleDateString("en-GB");
}
function fmtDate(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}); }
  catch { return "—"; }
}
function fmtNum(n) {
  if (!n && n!==0) return "—";
  return Number(n).toLocaleString();
}
function copyText(text, showToast) {
  const t = String(text);
  navigator.clipboard?.writeText(t)
    .then(() => showToast(`Copied: ${t}`, "copy"))
    .catch(() => {
      const el = document.createElement("textarea");
      el.value = t; document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
      showToast(`Copied: ${t}`, "copy");
    });
}

/* ── query builder ── */
function buildQuery(User, statusFilter, srch) {
  const trim = srch.trim();
  if (trim) {
    const queries = [];
    const qN = new Parse.Query(User); qN.contains("name", trim); queries.push(qN);
    const qU = new Parse.Query(User); qU.contains("username", trim); queries.push(qU);
    const n = parseInt(trim);
    if (!isNaN(n)) { const qI = new Parse.Query(User); qI.equalTo("uid", n); queries.push(qI); }
    const combined = Parse.Query.or(...queries);
    if (statusFilter === "suspended") combined.equalTo("status", "suspended");
    if (statusFilter === "active") combined.notEqualTo("status", "suspended");
    if (statusFilter === "banned") combined.equalTo("is_banned", true);
    return combined;
  }
  const q = new Parse.Query(User);
  if (statusFilter === "suspended") q.equalTo("status", "suspended");
  if (statusFilter === "active") q.notEqualTo("status", "suspended");
  if (statusFilter === "banned") q.equalTo("is_banned", true);
  return q;
}

/* ── map parse user ── */
function mapUser(u) {
  const av = u.get("avatar");
  let avatarUrl = null;
  if (av && typeof av.url === "function") avatarUrl = av.url();
  else if (typeof av === "string") avatarUrl = av;

  const uaf = u.get("using_avatar_frame");
  let uafUrl = null, uafName = null;
  if (uaf && typeof uaf.url === "function") { uafUrl = uaf.url(); uafName = uaf.name(); }

  const uee = u.get("using_entrance_effect");
  let ueeUrl = null;
  if (uee && typeof uee.url === "function") ueeUrl = uee.url();

  const upt = u.get("using_party_theme");
  let uptUrl = null;
  if (upt && typeof upt.url === "function") uptUrl = upt.url();

  const listImgs = (u.get("list_of_images")||[]).map(f => {
    if (f && typeof f.url === "function") return { url: f.url(), name: f.name() };
    return null;
  }).filter(Boolean);

  return {
    objectId:                    u.id,
    uid:                         String(u.get("uid") || u.id),
    name:                        u.get("name") || "—",
    username:                    u.get("username") || "anonymous",
    gender:                      u.get("gender") || "—",
    status:                      u.get("status") || "active",
    email:                       u.get("email") || "—",
    birthday:                    u.get("birthday") || null,
    device_id:                   u.get("device_id") || null,
    device_fingerprint:          u.get("device_fingerprint") || null,
    is_banned:                   !!u.get("is_banned"),
    avatar:                      avatarUrl,
    createdAt:                   u.get("createdAt"),
    updatedAt:                   u.get("updatedAt"),
    lastOnline:                  u.get("lastOnline") || null,
    country:                     u.get("country") || "",
    credit:                      u.get("credit") || 0,
    diamonds:                    u.get("diamonds") || 0,
    creditSent:                  u.get("creditSent") || 0,
    diamondsTotal:               u.get("diamondsTotal") || 0,
    total_recharged_credits:     u.get("total_recharged_credits") || 0,
    bio:                         u.get("bio") || "",
    first_name:                  u.get("first_name") || "",
    last_name:                   u.get("last_name") || "",
    tag:                         u.get("tag") || "",
    user_designation:            u.get("user_designation") || "",
    admin_role:                  u.get("admin_role") || "",
    agency_name:                 u.get("agency_name") || "",
    agency_role:                 u.get("agency_role") || "",
    bkash_number:                u.get("bkash_number") || "",
    using_avatar_frame:          uaf || null,
    using_avatar_frame_url:      uafUrl,
    using_avatar_frame_name:     uafName,
    using_avatar_frame_id:       u.get("using_avatar_frame_id") || "",
    can_use_using_avatar_frame:  !!u.get("can_use_using_avatar_frame"),
    using_entrance_effect:       uee || null,
    using_entrance_effect_url:   ueeUrl,
    using_entrance_effect_id:    u.get("using_entrance_effect_id") || "",
    can_use_entrance_effect:     !!u.get("can_use_entrance_effect"),
    using_party_theme:           upt || null,
    using_party_theme_url:       uptUrl,
    using_party_theme_id:        u.get("using_party_theme_id") || "",
    can_use_using_party_theme:   !!u.get("can_use_using_party_theme"),
    list_of_images:              listImgs,
    isreseller:                  !!u.get("isreseller"),
    my_obtained_items:           u.get("my_obtained_items") || [],
    reseller_coins:              u.get("reseller_coins") || 0,
    reseller_whatsAppnumber:     u.get("reseller_whatsAppnumber") || "",
    isViewer:                    !!u.get("isViewer"),
    Room_priority:               !!u.get("Room_priority"),
    My_obtained_frame_link:      u.get("My_obtained_frame_link") || "",
  };
}

/* ════════════════════════════════
   SVGA PREVIEW COMPONENT
   Renders .svga files using canvas
   Falls back to img/video for others
════════════════════════════════ */
function SvgaPreview({ url, size = 56 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!url || !canvasRef.current) return;
    const isSvga = url.toLowerCase().includes(".svga");
    if (!isSvga) return;

    let player = null;
    let cancelled = false;

    const load = async () => {
      try {
        const mod = await import("svga.lite").catch(() => null);
        if (!mod || cancelled) return;
        const { Parser, Player } = mod;
        const parser = new Parser();
        const data = await parser.load(url);
        if (cancelled) return;
        player = new Player(canvasRef.current);
        await player.mount(data);
        if (cancelled) { player.destroy(); return; }
        player.start();
      } catch (e) {
        console.warn("SVGA render failed:", e.message);
      }
    };
    load();

    return () => {
      cancelled = true;
      if (player) { try { player.destroy(); } catch (_) {} }
    };
  }, [url]);

  if (!url) return <span className="text-slate-600 text-xl">🖼</span>;

  const isSvga = url.toLowerCase().includes(".svga");
  if (isSvga) {
    return (
      <canvas
        ref={canvasRef}
        width={size * 2}
        height={size * 2}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    );
  }
  if (url.match(/\.(mp4|webm)$/i)) {
    return <video src={url} style={{ width: size, height: size, objectFit: "contain" }} autoPlay loop muted playsInline />;
  }
  return <img src={url} style={{ width: size, height: size, objectFit: "cover" }} alt="preview" />;
}

/* ════════════════════════════════
   TOAST
════════════════════════════════ */
function Toast({ toast }) {
  if (!toast) return null;
  const s = {
    success: "bg-emerald-900/95 border-emerald-500/60 text-emerald-200",
    error:   "bg-red-900/95 border-red-500/60 text-red-200",
    info:    "bg-indigo-900/95 border-indigo-500/60 text-indigo-200",
    copy:    "bg-cyan-900/95 border-cyan-500/60 text-cyan-200",
  };
  const ic = { success:"✓", error:"✕", info:"i", copy:"⎘" };
  return (
    <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl text-sm font-medium max-w-xs ${s[toast.type]||s.info}`}
      style={{ animation:"fadeUp 0.25s ease" }}>
      <span className="w-6 h-6 rounded-full bg-current/20 flex items-center justify-center text-xs font-bold flex-shrink-0">
        {ic[toast.type]||"i"}
      </span>
      {toast.msg}
    </div>
  );
}

/* ════════════════════════════════
   CONFIRM MODAL
════════════════════════════════ */
function ConfirmModal({ data, onClose, onConfirm, loading }) {
  if (!data) return null;
  return (
    <div className="fixed inset-0 z-[8500] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-[#0f1629] border border-white/12 rounded-2xl p-7 w-full max-w-sm shadow-2xl"
        style={{ animation:"fadeUp 0.2s ease" }}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl mx-auto mb-4
          ${data.danger?"bg-red-500/15 text-red-400":"bg-emerald-500/15 text-emerald-400"}`}>
          {data.danger?"⚠":"✓"}
        </div>
        <h3 className="text-lg font-bold text-white text-center mb-2">{data.title}</h3>
        <p className="text-sm text-slate-400 text-center mb-6 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: data.body }} />
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-slate-600 bg-slate-800 text-slate-300 hover:text-white transition-all text-sm font-medium">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center transition-all
              ${data.danger?"bg-red-500 hover:bg-red-600 text-white":"bg-emerald-500 hover:bg-emerald-600 text-white"}`}>
            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : data.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   SAVE CONFIRM POPUP
════════════════════════════════ */
function SaveConfirmModal({ onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 z-[9800] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-[#0f1629] border border-indigo-500/40 rounded-2xl p-7 w-full max-w-sm shadow-2xl"
        style={{ animation:"fadeUp 0.22s ease" }}>
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 flex items-center justify-center text-3xl mx-auto mb-4">
          💾
        </div>
        <h3 className="text-lg font-bold text-white text-center mb-2">Save Changes?</h3>
        <p className="text-sm text-slate-400 text-center leading-relaxed mb-2">
          You are about to update this user's profile.
        </p>
        <p className="text-xs text-amber-400 text-center font-medium mb-6 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
          ⚠ Make sure all changes are correct before saving.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-slate-600 bg-slate-800 text-slate-300 hover:text-white transition-all text-sm font-medium">
            ← Go Back
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all">
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : "✓ Yes, Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   FIELD ROW
════════════════════════════════ */
function FieldRow({ label, value, mono, onClick }) {
  return (
    <div className={`flex items-start gap-3 py-2.5 border-b border-white/5
      ${onClick?"cursor-pointer group hover:bg-white/3 rounded-lg px-2 -mx-2 transition-colors":""}`}
      onClick={onClick}>
      <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold w-28 flex-shrink-0 mt-0.5">{label}</span>
      <span className={`text-sm flex-1 break-all ${mono?"font-mono text-slate-300":"text-slate-200"} ${onClick?"group-hover:text-cyan-400 transition-colors":""}`}>
        {value || "—"}
        {onClick && <span className="ml-1 text-slate-600 group-hover:text-cyan-400 text-xs">⎘</span>}
      </span>
    </div>
  );
}

/* ════════════════════════════════
   VIEW MODAL
════════════════════════════════ */
function ViewModal({ user, devBan, onClose, onEdit, showToast, onToggleBan, onToggleSuspend, askConfirm }) {
  if (!user) return null;
  const clr = getAvatarColor(user.username);
  const suspended = user.status === "suspended";
  const isDevBanned = devBan?.status || false;

  return (
    <div className="fixed inset-0 z-[9000] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-[#080d1a] border border-white/10 rounded-2xl w-full max-w-2xl my-4 shadow-2xl overflow-hidden"
        style={{ animation:"fadeUp 0.25s ease" }}>
        <div className="relative h-24 overflow-hidden"
          style={{ background:"linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#0f172a 100%)" }}>
          <div className="absolute inset-0" style={{ background:`radial-gradient(circle at 30% 50%,${clr}30,transparent 65%)` }} />
          <button onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all">✕</button>
        </div>
        <div className="px-6 pb-6 -mt-12">
          <div className="flex items-end gap-4 mb-5">
            <div className="relative flex-shrink-0">
              {user.avatar
                ? <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-2xl border-4 border-[#080d1a] object-cover shadow-xl" />
                : <div className="w-20 h-20 rounded-2xl border-4 border-[#080d1a] flex items-center justify-center text-2xl font-bold shadow-xl"
                    style={{ background:`linear-gradient(135deg,${clr}cc,${clr}55)` }}>
                    {getInitial(user.name)}
                  </div>
              }
              <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#080d1a]
                ${suspended?"bg-amber-500":user.is_banned?"bg-red-500":"bg-emerald-500"}`} />
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h2 className="text-xl font-bold text-white truncate">{user.name}</h2>
              <p className="text-slate-400 text-sm font-mono cursor-pointer hover:text-cyan-400 transition-colors"
                onClick={() => copyText(user.username, showToast)}>
                @{user.username} ⎘
              </p>
            </div>
            <div className="flex gap-1.5 flex-wrap justify-end">
              {suspended && <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">Suspended</span>}
              {user.is_banned && <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 font-medium">🔒 Blocked</span>}
              {isDevBanned && <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 font-medium">📵 Dev Ban</span>}
              {user.can_use_using_avatar_frame && <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 font-medium">🖼 Frame</span>}
              {user.tag && (
                <span className={`text-xs px-2.5 py-1 rounded-full bg-white/8 border border-white/12 font-medium ${getTagColor(user.tag)}`}>
                  {getTagLabel(user.tag)}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2 mt-1">Identity</p>
              <FieldRow label="UID"        value={user.uid}           mono onClick={() => copyText(user.uid, showToast)} />
              <FieldRow label="Name"       value={user.name} />
              <FieldRow label="Username"   value={`@${user.username}`} mono onClick={() => copyText(user.username, showToast)} />
              <FieldRow label="First Name" value={user.first_name} />
              <FieldRow label="Last Name"  value={user.last_name} />
              <FieldRow label="Gender"     value={user.gender} />
              <FieldRow label="Birthday"   value={fmtDate(user.birthday)} />
              <FieldRow label="Email"      value={user.email} mono onClick={() => copyText(user.email, showToast)} />
              <FieldRow label="Country"    value={user.country} />
              <FieldRow label="Bio"        value={user.bio} />
              <FieldRow label="Bkash"      value={user.bkash_number} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2 mt-1">Economy</p>
              <FieldRow label="Coins"           value={fmtNum(user.credit)} />
              <FieldRow label="Earn"            value={fmtNum(user.diamonds)} />
              <FieldRow label="Total Earn"      value={fmtNum(user.diamondsTotal)} />
              <FieldRow label="Credit Sent"     value={fmtNum(user.creditSent)} />
              <FieldRow label="Total Recharged" value={fmtNum(user.total_recharged_credits)} />
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2 mt-4">System</p>
              <FieldRow label="Status"      value={suspended?"Suspended":"Active"} />
              <FieldRow label="Admin Role"  value={user.admin_role} />
              <FieldRow label="Tag"         value={getTagLabel(user.tag)} />
              <FieldRow label="Designation" value={user.user_designation} />
              <FieldRow label="Agency"      value={user.agency_name} />
              <FieldRow label="Agency Role" value={user.agency_role} />
              <FieldRow label="Last Online" value={timeAgo(user.lastOnline)} />
              <FieldRow label="Device ID"   value={user.device_id} mono onClick={user.device_id?()=>copyText(user.device_id,showToast):null} />
              <FieldRow label="Fingerprint" value={user.device_fingerprint} mono onClick={user.device_fingerprint ? () => copyText(user.device_fingerprint, showToast) : null} />
              <FieldRow label="Object ID"   value={user.objectId}  mono onClick={() => copyText(user.objectId, showToast)} />
            </div>
          </div>
          {(user.using_avatar_frame_url||user.using_entrance_effect_url||user.using_party_theme_url) && (
            <div className="mt-5 pt-4 border-t border-white/6">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Cosmetics</p>
              <div className="flex gap-3 flex-wrap">
                {user.using_avatar_frame_url && (
                  <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3 border border-white/8">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/30 flex items-center justify-center">
                      <SvgaPreview url={user.using_avatar_frame_url} size={40} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">Avatar Frame</p>
                      <p className="text-xs text-slate-500 font-mono">{user.using_avatar_frame_id||"—"}</p>
                      <p className="text-[10px] mt-0.5">{user.can_use_using_avatar_frame
                        ? <span className="text-emerald-400">● Enabled</span>
                        : <span className="text-slate-500">● Disabled</span>}</p>
                    </div>
                  </div>
                )}
                {user.using_entrance_effect_url && (
                  <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3 border border-white/8">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/30 flex items-center justify-center">
                      <SvgaPreview url={user.using_entrance_effect_url} size={40} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">Entrance Effect</p>
                      <p className="text-xs text-slate-500 font-mono">{user.using_entrance_effect_id||"—"}</p>
                      <p className="text-[10px] mt-0.5">{user.can_use_entrance_effect
                        ? <span className="text-emerald-400">● Enabled</span>
                        : <span className="text-slate-500">● Disabled</span>}</p>
                    </div>
                  </div>
                )}
                {user.using_party_theme_url && (
                  <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3 border border-white/8">
                    <img src={user.using_party_theme_url} className="w-10 h-10 rounded-lg object-cover" alt="party theme" />
                    <div>
                      <p className="text-xs font-semibold text-white">Party Theme</p>
                      <p className="text-xs text-slate-500 font-mono">{user.using_party_theme_id||"—"}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {user.list_of_images?.length > 0 && (
            <div className="mt-5 pt-4 border-t border-white/6">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Profile Images ({user.list_of_images.length})</p>
              <div className="flex gap-2 flex-wrap">
                {user.list_of_images.map((img,i) => (
                  <img key={i} src={img.url} alt={`img-${i}`} className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 mt-6 flex-wrap">
            <button onClick={() => { onClose(); onEdit(user); }}
              className="flex-1 min-w-[120px] py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all">
              ✎ Edit
            </button>
            <button onClick={() => { onClose(); askConfirm({ title:suspended?"Activate":"Suspend", body:`${suspended?"Activate":"Suspend"} <strong>@${user.username}</strong>?`, confirmLabel:suspended?"Activate":"Suspend", danger:!suspended, action:()=>onToggleSuspend(user) }); }}
              className={`flex-1 min-w-[100px] py-2.5 rounded-xl text-sm font-semibold transition-all ${suspended?"bg-emerald-600 hover:bg-emerald-700 text-white":"bg-amber-600 hover:bg-amber-700 text-white"}`}>
              {suspended?"✓ Activate":"⊘ Suspend"}
            </button>
            <button onClick={() => { onClose(); askConfirm({ title:user.is_banned?"Unblock":"Block", body:`${user.is_banned?"Unblock":"Block"} <strong>@${user.username}</strong>?`, confirmLabel:user.is_banned?"Unblock":"Block", danger:!user.is_banned, action:()=>onToggleBan(user) }); }}
              className={`flex-1 min-w-[100px] py-2.5 rounded-xl text-sm font-semibold transition-all ${user.is_banned?"bg-emerald-600 hover:bg-emerald-700 text-white":"bg-red-600 hover:bg-red-700 text-white"}`}>
              {user.is_banned?"🔓 Unblock":"🔒 Block"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   EDIT HELPERS
════════════════════════════════ */
function EditSection({ title, children }) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-600/40 p-4 mb-4">
      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">{title}</h4>
      {children}
    </div>
  );
}
function EditField({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}
function ToggleSwitch({ checked, onChange, labelOn, labelOff }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none py-1">
      <div className="relative flex-shrink-0" onClick={() => onChange(!checked)}>
        <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${checked?"bg-indigo-600":"bg-slate-600"}`} />
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${checked?"translate-x-5":"translate-x-0"}`} />
      </div>
      <span className={`text-sm font-medium ${checked?"text-indigo-300":"text-slate-500"}`}>
        {checked ? labelOn : labelOff}
      </span>
    </label>
  );
}
const iCls = "w-full bg-slate-800 border border-slate-600 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all";
const sCls = "w-full bg-slate-800 border border-slate-600 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all cursor-pointer";

/* ════════════════════════════════
   ITEM CARD — reusable card for
   frames / effects / themes
════════════════════════════════ */
function ItemCard({ item, accentColor, onDelete }) {
  return (
    <div
      className="relative group flex flex-col items-center gap-1.5 rounded-xl p-2.5 border transition-all cursor-default"
      style={{
        width: "90px",
        background: "rgba(255,255,255,0.04)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = accentColor + "80"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
    >
      {/* Active badge */}
      {item.isActive && (
        <span className="absolute -top-1.5 -left-1.5 text-[7px] px-1.5 py-0.5 rounded-full bg-indigo-600 text-white font-bold z-10 whitespace-nowrap">
          Active
        </span>
      )}

      {/* Preview */}
      <div
        className="rounded-lg overflow-hidden bg-black/50 border border-white/5 flex items-center justify-center flex-shrink-0"
        style={{ width: 64, height: 64 }}
      >
        {item.url
          ? <SvgaPreview url={item.url} size={64} />
          : <span className="text-slate-600 text-2xl">
              {item.type === "Avatar Frame" ? "🖼" :
               item.type === "Entrance Effect" ? "✨" :
               item.type === "Party Theme" ? "🎨" : "📦"}
            </span>
        }
      </div>

      {/* Name */}
      <p className="text-[9px] text-slate-300 text-center truncate w-full font-medium leading-tight">
        {item.name}
      </p>

      {/* ID */}
      <p className="text-[7px] text-slate-600 font-mono text-center truncate w-full">
        {item.id}
      </p>

      {/* Delete button — appears on hover */}
      <button
        type="button"
        onClick={() => onDelete(item)}
        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 hover:bg-red-400 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
        title="Remove"
      >
        ✕
      </button>
    </div>
  );
}

/* ════════════════════════════════
   EDIT MODAL
════════════════════════════════ */
function EditModal({ user: initUser, onClose, onSave, actionLoading, showToast }) {
  const [user,           setUser]           = useState(initUser ? { ...initUser } : null);
  const [showSaveConfirm,setShowSaveConfirm]= useState(false);

  /* obtained items (my_obtained_items array) */
  const [obtainedItems,  setObtainedItems]  = useState([]);
  const [itemsLoading,   setItemsLoading]   = useState(false);

  /* all frames / effects / themes fetched separately */
  const [allCosmetics,   setAllCosmetics]   = useState({ frames:[], effects:[], themes:[] });
  const [cosmeticsLoading, setCosmeticsLoading] = useState(false);

  /* password */
  const [pwForm,   setPwForm]   = useState({ newPassword: "", confirm: "" });
  const [pwError,  setPwError]  = useState("");
  const [pwLoading,setPwLoading]= useState(false);
  const [showPw,   setShowPw]   = useState(false);

  /* sync initUser → user state */
  useEffect(() => { if (initUser) setUser({ ...initUser }); }, [initUser]);

  /* ── fetch my_obtained_items ── */
  useEffect(() => {
    const fetchItems = async () => {
      const userItemIds = initUser?.my_obtained_items || [];
      if (!initUser?.objectId || userItemIds.length === 0) {
        setObtainedItems([]); return;
      }
      setItemsLoading(true);
      try {
        const mk = { useMasterKey: true };
        let mapped = [];

        /* try "item" class first */
        try {
          const q = new Parse.Query("item");
          q.containedIn("objectId", userItemIds);
          q.limit(1000);
          const results = await q.find(mk);
          if (results.length > 0) {
            mapped = results.map(i => {
              const file = i.get("file") || i.get("svga") || i.get("image") ||
                           i.get("frame_file") || i.get("effect_file") || i.get("theme_file");
              const typeRaw = (i.get("type") || i.get("item_type") || "").toLowerCase();
              const type =
                typeRaw.includes("frame")    ? "Avatar Frame"    :
                typeRaw.includes("effect")   ? "Entrance Effect" :
                typeRaw.includes("entrance") ? "Entrance Effect" :
                typeRaw.includes("theme")    ? "Party Theme"     : "Item";
              let url = null;
              if (file && typeof file.url === "function") url = file.url();
              else if (file?.url) url = file.url;
              return {
                id:    i.id,
                type,
                name:  i.get("name") || i.get("title") || i.id,
                url,
                isActive: i.id === initUser.using_avatar_frame_id || i.id === initUser.using_entrance_effect_id,
              };
            });
          }
        } catch (_) {}

        /* fallback: try individual class names */
        if (mapped.length === 0) {
          const classMap = [
            { cls: "AvatarFrame",   type: "Avatar Frame",    fields: ["file","svga","frame_file"] },
            { cls: "EntranceEffect",type: "Entrance Effect", fields: ["file","svga","effect_file"] },
            { cls: "PartyTheme",    type: "Party Theme",     fields: ["file","image","theme_file"] },
            { cls: "Frame",         type: "Avatar Frame",    fields: ["file","svga"] },
            { cls: "Effect",        type: "Entrance Effect", fields: ["file","svga"] },
          ];
          for (const { cls, type, fields } of classMap) {
            try {
              const q = new Parse.Query(cls);
              q.containedIn("objectId", userItemIds);
              q.limit(500);
              const res = await q.find(mk);
              res.forEach(r => {
                let url = null;
                for (const f of fields) {
                  const fv = r.get(f);
                  if (fv && typeof fv.url === "function") { url = fv.url(); break; }
                }
                mapped.push({
                  id: r.id, type,
                  name: r.get("name") || r.id,
                  url,
                  isActive: r.id === initUser.using_avatar_frame_id || r.id === initUser.using_entrance_effect_id,
                });
              });
            } catch (_) {}
          }
        }

        /* unknown IDs */
        const foundIds = mapped.map(m => m.id);
        const unknown  = userItemIds
          .filter(id => !foundIds.includes(id))
          .map(id => ({ id, type: "Unknown", name: id, url: null, isActive: false }));

        setObtainedItems([...mapped, ...unknown]);
      } catch (err) {
        console.error("fetchItems:", err);
      } finally {
        setItemsLoading(false);
      }
    };
    fetchItems();
  }, [initUser]);

  /* ── fetch ALL cosmetics for this user (frames, effects, themes) ── */
  useEffect(() => {
    const fetchCosmetics = async () => {
      if (!initUser?.objectId) return;
      setCosmeticsLoading(true);
      try {
        const mk  = { useMasterKey: true };
        const uid = initUser.objectId;

        /* helper to try multiple class names + query strategies */
        const tryFetch = async (classNames, type) => {
          for (const cls of classNames) {
            try {
              /* try by user objectId string */
              const q1 = new Parse.Query(cls);
              q1.equalTo("user_id", uid);
              q1.limit(200);
              const r1 = await q1.find(mk);
              if (r1.length > 0) return { results: r1, cls, type };

              /* try by uid number */
              const q2 = new Parse.Query(cls);
              q2.equalTo("uid", Number(initUser.uid));
              q2.limit(200);
              const r2 = await q2.find(mk);
              if (r2.length > 0) return { results: r2, cls, type };

              /* try by Pointer to _User */
              const q3 = new Parse.Query(cls);
              q3.equalTo("user", { __type:"Pointer", className:"_User", objectId: uid });
              q3.limit(200);
              const r3 = await q3.find(mk);
              if (r3.length > 0) return { results: r3, cls, type };
            } catch (_) {}
          }
          return { results: [], cls: null, type };
        };

        const [fRes, eRes, tRes] = await Promise.all([
          tryFetch(["UserFrame","ObtainedFrame","user_frame","avatarFrame","AvatarFrame_user"], "Avatar Frame"),
          tryFetch(["UserEffect","ObtainedEffect","user_effect","EntranceEffect_user","userEffect"], "Entrance Effect"),
          tryFetch(["UserTheme","ObtainedTheme","user_theme","PartyTheme_user"], "Party Theme"),
        ]);

        const mapResults = (res, type) =>
          res.results.map(r => {
            const fileFields = ["file","svga","frame_file","effect_file","theme_file","image","link","svga_file"];
            let url = null;
            for (const f of fileFields) {
              const fv = r.get(f);
              if (fv && typeof fv.url === "function") { url = fv.url(); break; }
              if (typeof fv === "string" && fv.startsWith("http")) { url = fv; break; }
            }
            const itemId = r.get("frame_id") || r.get("effect_id") || r.get("theme_id") || r.get("item_id") || r.id;
            return {
              id:        r.id,
              itemId,
              type,
              name:      r.get("name") || r.get("frame_name") || r.get("title") || type,
              url,
              className: res.cls,
              isActive:
                itemId === initUser.using_avatar_frame_id ||
                itemId === initUser.using_entrance_effect_id ||
                r.id   === initUser.using_avatar_frame_id ||
                r.id   === initUser.using_entrance_effect_id,
            };
          });

        /* if no separate class found, build from current frame fields */
        let frames  = mapResults(fRes, "Avatar Frame");
        let effects = mapResults(eRes, "Entrance Effect");
        const themes  = mapResults(tRes, "Party Theme");

        /* fallback: use _User fields directly for current frame */
        if (frames.length === 0 && initUser.using_avatar_frame_url) {
          frames = [{
            id:        "current_frame",
            itemId:    initUser.using_avatar_frame_id,
            type:      "Avatar Frame",
            name:      initUser.using_avatar_frame_name || "Current Frame",
            url:       initUser.using_avatar_frame_url,
            className: "_User",
            isActive:  true,
          }];
        }
        if (frames.length === 0 && initUser.My_obtained_frame_link) {
          frames.push({
            id:        "obtained_frame_link",
            itemId:    null,
            type:      "Avatar Frame",
            name:      "Obtained Frame",
            url:       initUser.My_obtained_frame_link,
            className: "_User",
            isActive:  false,
          });
        }
        if (effects.length === 0 && initUser.using_entrance_effect_url) {
          effects = [{
            id:        "current_effect",
            itemId:    initUser.using_entrance_effect_id,
            type:      "Entrance Effect",
            name:      "Current Entrance Effect",
            url:       initUser.using_entrance_effect_url,
            className: "_User",
            isActive:  true,
          }];
        }

        setAllCosmetics({ frames, effects, themes });
      } catch (err) {
        console.error("fetchCosmetics:", err);
      } finally {
        setCosmeticsLoading(false);
      }
    };
    fetchCosmetics();
  }, [initUser]);

  if (!initUser || !user) return null;

  const set = (k, v) => setUser(p => ({ ...p, [k]: v }));

  /* ── delete obtained item (my_obtained_items array) ── */
  const deleteObtainedItem = async (item) => {
    try {
      const obj = await new Parse.Query("_User").get(user.objectId, { useMasterKey: true });
      const current = obj.get("my_obtained_items") || [];
      const updated = current.filter(id => id !== item.id);
      obj.set("my_obtained_items", updated);
      await obj.save(null, { useMasterKey: true });
      set("my_obtained_items", updated);
      setObtainedItems(prev => prev.filter(i => i.id !== item.id));
      showToast("Item removed", "success");
    } catch (err) {
      showToast("Failed: " + err.message, "error");
    }
  };

  /* ── delete cosmetic (frame / effect / theme from separate class) ── */
  const deleteCosmetic = async (item, cosmeticType) => {
    try {
      if (item.className && item.className !== "_User") {
        const obj = await new Parse.Query(item.className).get(item.id, { useMasterKey: true });
        await obj.destroy({ useMasterKey: true });
      } else {
        /* stored on _User itself */
        const obj = await new Parse.Query("_User").get(user.objectId, { useMasterKey: true });
        if (item.isActive) {
          if (cosmeticType === "Avatar Frame") {
            obj.unset("using_avatar_frame");
            obj.set("using_avatar_frame_id", "");
            obj.set("can_use_using_avatar_frame", false);
            set("using_avatar_frame_url", null);
            set("using_avatar_frame_id", "");
            set("can_use_using_avatar_frame", false);
          }
          if (cosmeticType === "Entrance Effect") {
            obj.unset("using_entrance_effect");
            obj.set("using_entrance_effect_id", "");
            obj.set("can_use_entrance_effect", false);
            set("using_entrance_effect_url", null);
            set("using_entrance_effect_id", "");
            set("can_use_entrance_effect", false);
          }
        }
        if (item.id === "obtained_frame_link") obj.unset("My_obtained_frame_link");
        await obj.save(null, { useMasterKey: true });
      }

      /* update local cosmetics state */
      setAllCosmetics(prev => ({
        frames:  prev.frames.filter(f => f.id !== item.id),
        effects: prev.effects.filter(e => e.id !== item.id),
        themes:  prev.themes.filter(t => t.id !== item.id),
      }));
      showToast("Removed successfully", "success");
    } catch (err) {
      showToast("Failed: " + err.message, "error");
    }
  };

  const handleAvatarUpload = async (file) => {
    if (!file) return;
    try {
      const pf = new Parse.File(file.name, file);
      await pf.save();
      set("avatar", pf); set("_avatarUrl", pf.url());
      showToast("Avatar uploaded", "success");
    } catch(e) { showToast("Upload failed: "+e.message, "error"); }
  };

  const avatarDisplay = user._avatarUrl
    || (typeof user.avatar==="string" ? user.avatar : null)
    || (user.avatar && typeof user.avatar.url==="function" ? user.avatar.url() : null);

  const saving = actionLoading === `edit_${user.objectId}`;

  const handlePasswordChange = async () => {
    setPwError("");
    if (!pwForm.newPassword || pwForm.newPassword.length < 6) {
      setPwError("Password must be at least 6 characters."); return;
    }
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwError("Passwords do not match."); return;
    }
    setPwLoading(true);
    try {
      const obj = await new Parse.Query("_User").get(user.objectId, { useMasterKey: true });
      obj.set("password", pwForm.newPassword);
      await obj.save(null, { useMasterKey: true });
      setPwForm({ newPassword: "", confirm: "" });
      setShowPw(false);
      showToast("Password changed successfully", "success");
    } catch (e) { setPwError("Failed: " + e.message); }
    finally { setPwLoading(false); }
  };

  /* ── cosmetics section render helper ── */
  const CosmeticsGroup = ({ title, items, accentColor, cosmeticType }) => {
    if (items.length === 0) return (
      <p className="text-xs text-slate-600 italic py-1">No {title.toLowerCase()} found.</p>
    );
    return (
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: accentColor }}>
          {title} ({items.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              accentColor={accentColor}
              onDelete={() => deleteCosmetic(item, cosmeticType)}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {showSaveConfirm && (
        <SaveConfirmModal
          loading={saving}
          onClose={() => setShowSaveConfirm(false)}
          onConfirm={() => { setShowSaveConfirm(false); onSave(user); }}
        />
      )}

      <div className="fixed inset-0 z-[9000] bg-black/85 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
        <div className="bg-[#0b1121] border border-slate-600/50 rounded-2xl w-full max-w-2xl my-4 shadow-2xl"
          style={{ animation:"fadeUp 0.25s ease" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60">
            <div>
              <h2 className="text-lg font-bold text-white">Edit User</h2>
              <p className="text-sm text-slate-400 font-mono">@{initUser.username} · UID {initUser.uid}</p>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-all">
              ✕
            </button>
          </div>

          <div className="px-6 py-5 max-h-[75vh] overflow-y-auto"
            style={{ scrollbarWidth:"thin", scrollbarColor:"rgba(255,255,255,0.1) transparent" }}>

            {/* ── Basic Info ── */}
            <EditSection title="Basic Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <EditField label="Display Name"><input className={iCls} value={user.name||""} onChange={e=>set("name",e.target.value)} placeholder="Display name" /></EditField>
                <EditField label="Username"><input className={iCls} value={user.username||""} onChange={e=>set("username",e.target.value)} placeholder="Username" /></EditField>
                <EditField label="First Name"><input className={iCls} value={user.first_name||""} onChange={e=>set("first_name",e.target.value)} placeholder="First name" /></EditField>
                <EditField label="Last Name"><input className={iCls} value={user.last_name||""} onChange={e=>set("last_name",e.target.value)} placeholder="Last name" /></EditField>
                <EditField label="Email"><input className={iCls} value={user.email||""} onChange={e=>set("email",e.target.value)} placeholder="Email" /></EditField>
                <EditField label="UID"><input className={iCls} type="number" value={user.uid||""} onChange={e=>set("uid",e.target.value)} /></EditField>
                <EditField label="Gender">
                  <select className={sCls} value={user.gender||""} onChange={e=>set("gender",e.target.value)}>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="MAL">MAL</option>
                    <option value="FML">FML</option>
                    <option value="other">Other</option>
                  </select>
                </EditField>
                <EditField label="Birthday"><input className={iCls} type="date" value={user.birthday?new Date(user.birthday).toISOString().split("T")[0]:""} onChange={e=>set("birthday",e.target.value)} /></EditField>
                <EditField label="Country"><input className={iCls} value={user.country||""} onChange={e=>set("country",e.target.value)} placeholder="Country" /></EditField>
                <EditField label="Bkash Number"><input className={iCls} value={user.bkash_number||""} onChange={e=>set("bkash_number",e.target.value)} placeholder="Bkash number" /></EditField>
              </div>
              <EditField label="Bio">
                <textarea className={`${iCls} resize-none`} rows={3} value={user.bio||""} onChange={e=>set("bio",e.target.value)} placeholder="Bio..." />
              </EditField>
            </EditSection>

            {/* ── Economy ── */}
            <EditSection title="Economy & Credits">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4">
                <EditField label="Coins"><input className={iCls} type="number" value={user.credit??0} onChange={e=>set("credit",Number(e.target.value))} /></EditField>
                <EditField label="Earn (Diamonds)"><input className={iCls} type="number" value={user.diamonds??0} onChange={e=>set("diamonds",Number(e.target.value))} /></EditField>
                <EditField label="Total Earn"><input className={iCls} type="number" value={user.diamondsTotal??0} onChange={e=>set("diamondsTotal",Number(e.target.value))} /></EditField>
                <EditField label="Credit Sent"><input className={iCls} type="number" value={user.creditSent??0} onChange={e=>set("creditSent",Number(e.target.value))} /></EditField>
                <EditField label="Total Recharged"><input className={iCls} type="number" value={user.total_recharged_credits??0} onChange={e=>set("total_recharged_credits",Number(e.target.value))} /></EditField>
              </div>
            </EditSection>

            {/* ── Roles ── */}
            <EditSection title="Roles & Designation">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <EditField label="Admin Role"><input className={iCls} value={user.admin_role||""} onChange={e=>set("admin_role",e.target.value)} placeholder="admin, mod…" /></EditField>
                <EditField label="Tag">
                  <select className={sCls} value={user.tag||""} onChange={e=>set("tag",e.target.value)}>
                    {TAG_OPTIONS.map(opt=>(
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {user.tag && (
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">
                      DB value: <span className="text-indigo-300">{user.tag}</span>
                    </p>
                  )}
                </EditField>
                <EditField label="Designation"><input className={iCls} value={user.user_designation||""} onChange={e=>set("user_designation",e.target.value)} placeholder="Designation" /></EditField>
                <EditField label="Agency Name"><input className={iCls} value={user.agency_name||""} onChange={e=>set("agency_name",e.target.value)} placeholder="Agency name" /></EditField>
                <EditField label="Agency Role"><input className={iCls} value={user.agency_role||""} onChange={e=>set("agency_role",e.target.value)} placeholder="agent, agency_client…" /></EditField>
              </div>
              <div className="flex gap-6 mt-3 flex-wrap">
                {[["isreseller","Is Reseller"],["isViewer","Is Viewer"],["Room_priority","Room Priority"]].map(([k,lbl])=>(
                  <label key={k} className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                    <input type="checkbox" checked={!!user[k]} onChange={e=>set(k,e.target.checked)} className="w-4 h-4 rounded accent-indigo-500" />
                    {lbl}
                  </label>
                ))}
              </div>
            </EditSection>

            {/* ── Reseller Settings ── */}
            <EditSection title="Reseller Settings">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 ${user.isreseller ? "bg-amber-500/20 text-amber-400" : "bg-slate-700 text-slate-500"}`}>
                  ◈
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {user.isreseller ? "This user is a Reseller" : "This user is NOT a Reseller"}
                  </p>
                  <p className="text-xs text-slate-500">Toggle the checkbox above to change reseller status</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <EditField label="Reseller Coins">
                  <input className={iCls} type="number" min="0" value={user.reseller_coins??0}
                    onChange={e=>set("reseller_coins",Number(e.target.value))} placeholder="0" />
                </EditField>
                <EditField label="WhatsApp Number">
                  <input className={iCls} type="text" value={user.reseller_whatsAppnumber||""}
                    onChange={e=>set("reseller_whatsAppnumber",e.target.value)} placeholder="+8801XXXXXXXXX" />
                </EditField>
              </div>
              {user.isreseller && (
                <div className="mt-2 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
                  <span>◈</span><span>Reseller is active — coins and WhatsApp number will be saved.</span>
                </div>
              )}
            </EditSection>

            {/* ── Profile Avatar ── */}
            <EditSection title="Profile Avatar">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-700 border border-slate-600 flex-shrink-0 flex items-center justify-center">
                  {avatarDisplay ? <img src={avatarDisplay} alt="avatar" className="w-full h-full object-cover" /> : <span className="text-slate-500 text-2xl">👤</span>}
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/25 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/40 cursor-pointer text-sm font-medium transition-all">
                    📤 Upload Avatar
                    <input type="file" accept="image/*" hidden onChange={e=>handleAvatarUpload(e.target.files[0])} />
                  </label>
                  {avatarDisplay && (
                    <button type="button" onClick={()=>{set("avatar",null);set("_avatarUrl",null);}}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/15 border border-red-500/30 text-red-400 hover:bg-red-600/25 text-sm font-medium transition-all">
                      🗑 Remove Avatar
                    </button>
                  )}
                </div>
              </div>
            </EditSection>

            {/* ══════════════════════════════════════
                AVATAR FRAMES — ALL frames shown
                with delete button on each
            ══════════════════════════════════════ */}
            <EditSection title={`Avatar Frames (${allCosmetics.frames.length})`}>
              {cosmeticsLoading ? (
                <div className="flex items-center gap-2 py-3 text-slate-400 text-sm">
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin flex-shrink-0" />
                  Loading frames…
                </div>
              ) : (
                <CosmeticsGroup
                  title="Avatar Frames"
                  items={allCosmetics.frames}
                  accentColor="#a78bfa"
                  cosmeticType="Avatar Frame"
                />
              )}
              <div className="pt-3 border-t border-white/5 mt-2">
                <ToggleSwitch
                  checked={!!user.can_use_using_avatar_frame}
                  onChange={v => set("can_use_using_avatar_frame", v)}
                  labelOn="Avatar Frame Enabled"
                  labelOff="Avatar Frame Disabled"
                />
              </div>
            </EditSection>

            {/* ══════════════════════════════════════
                ENTRANCE EFFECTS — ALL effects shown
                with delete button on each
            ══════════════════════════════════════ */}
            <EditSection title={`Entrance Effects (${allCosmetics.effects.length})`}>
              {cosmeticsLoading ? (
                <div className="flex items-center gap-2 py-3 text-slate-400 text-sm">
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin flex-shrink-0" />
                  Loading effects…
                </div>
              ) : (
                <CosmeticsGroup
                  title="Entrance Effects"
                  items={allCosmetics.effects}
                  accentColor="#34d399"
                  cosmeticType="Entrance Effect"
                />
              )}
              <div className="pt-3 border-t border-white/5 mt-2">
                <ToggleSwitch
                  checked={!!user.can_use_entrance_effect}
                  onChange={v => set("can_use_entrance_effect", v)}
                  labelOn="Entrance Effect Enabled"
                  labelOff="Entrance Effect Disabled"
                />
              </div>
            </EditSection>

            {/* ── Party Theme ── */}
            <EditSection title={`Party Themes (${allCosmetics.themes.length})`}>
              {cosmeticsLoading ? (
                <div className="flex items-center gap-2 py-3 text-slate-400 text-sm">
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin flex-shrink-0" />
                  Loading themes…
                </div>
              ) : (
                <CosmeticsGroup
                  title="Party Themes"
                  items={allCosmetics.themes}
                  accentColor="#fbbf24"
                  cosmeticType="Party Theme"
                />
              )}
              {user.using_party_theme_url && (
                <div className="flex items-center gap-3 bg-slate-700/40 rounded-xl p-3 mb-3 border border-slate-600/40">
                  <img src={user.using_party_theme_url} className="w-12 h-12 rounded-lg object-cover" alt="party theme" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-white">Current Party Theme</p>
                    <p className="text-xs text-slate-400 font-mono">{user.using_party_theme_id}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-3 border-t border-white/5">
                <EditField label="Theme ID">
                  <input className={iCls} value={user.using_party_theme_id||""} onChange={e=>set("using_party_theme_id",e.target.value)} placeholder="Party theme ID" />
                </EditField>
                <ToggleSwitch
                  checked={!!user.can_use_using_party_theme}
                  onChange={v => set("can_use_using_party_theme", v)}
                  labelOn="Party Theme Enabled"
                  labelOff="Party Theme Disabled"
                />
              </div>
              {user.using_party_theme && (
                <button type="button"
                  onClick={()=>{set("using_party_theme",null);set("using_party_theme_url","");set("using_party_theme_id","");set("can_use_using_party_theme",false);}}
                  className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/15 border border-red-500/30 text-red-400 hover:bg-red-600/25 text-sm font-medium transition-all">
                  🗑 Remove Current Party Theme
                </button>
              )}
            </EditSection>

            {/* ── Obtained Items (my_obtained_items array) ── */}
            {user.my_obtained_items?.length > 0 && (
              <EditSection title={`Obtained Items (${user.my_obtained_items.length})`}>
                {itemsLoading ? (
                  <div className="flex items-center gap-2 py-3 text-slate-400 text-sm">
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin flex-shrink-0" />
                    Loading items…
                  </div>
                ) : obtainedItems.length === 0 ? (
                  <p className="text-sm text-slate-500 py-2">Items could not be loaded from database.</p>
                ) : (
                  <>
                    {["Avatar Frame","Entrance Effect","Party Theme","Item","Unknown"].map(type => {
                      const group = obtainedItems.filter(i => i.type === type);
                      if (group.length === 0) return null;
                      const color =
                        type==="Avatar Frame"    ? "#a78bfa" :
                        type==="Entrance Effect" ? "#34d399" :
                        type==="Party Theme"     ? "#fbbf24" :
                        type==="Item"            ? "#60a5fa" : "#94a3b8";
                      return (
                        <div key={type} className="mb-4">
                          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color }}>
                            {type} ({group.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {group.map(item => (
                              <ItemCard
                                key={item.id}
                                item={item}
                                accentColor={color}
                                onDelete={() => deleteObtainedItem(item)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Raw ID list */}
                <div className="mt-3 pt-3 border-t border-white/5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">
                    All Item IDs ({user.my_obtained_items.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto"
                    style={{ scrollbarWidth:"thin", scrollbarColor:"rgba(255,255,255,0.1) transparent" }}>
                    {user.my_obtained_items.map(id => (
                      <div key={id}
                        className="relative group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono text-slate-400 border transition-colors hover:border-red-500/30"
                        style={{ background:"rgba(255,255,255,0.04)", borderColor:"rgba(255,255,255,0.08)" }}>
                        {id}
                        <button type="button"
                          onClick={() => deleteObtainedItem({ id })}
                          className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              </EditSection>
            )}

            {/* ── Profile Images ── */}
            {user.list_of_images?.length > 0 && (
              <EditSection title={`Profile Images (${user.list_of_images.length})`}>
                <div className="flex gap-2 flex-wrap">
                  {user.list_of_images.map((img,i)=>(
                    <div key={i} className="relative group">
                      <img src={img.url} alt={`img-${i}`} className="w-16 h-16 rounded-xl object-cover border border-slate-600" />
                      <button type="button"
                        onClick={()=>set("list_of_images",user.list_of_images.filter((_,idx)=>idx!==i))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </EditSection>
            )}

            {/* ── Change Password ── */}
            <EditSection title="Change Password">
              <p className="text-xs text-slate-400 mb-4 leading-relaxed bg-slate-700/40 border border-slate-600/40 rounded-lg px-3 py-2">
                🔐 This will immediately update the user's login password.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <EditField label="New Password">
                  <div className="relative">
                    <input className={iCls} type={showPw?"text":"password"} placeholder="Min. 6 characters"
                      value={pwForm.newPassword} onChange={e=>setPwForm(p=>({...p,newPassword:e.target.value}))} />
                    <button type="button" onClick={()=>setShowPw(p=>!p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-sm transition-colors">
                      {showPw?"🙈":"👁"}
                    </button>
                  </div>
                </EditField>
                <EditField label="Confirm Password">
                  <div className="relative">
                    <input className={iCls} type={showPw?"text":"password"} placeholder="Repeat new password"
                      value={pwForm.confirm} onChange={e=>setPwForm(p=>({...p,confirm:e.target.value}))} />
                    {pwForm.confirm.length > 0 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
                        {pwForm.newPassword===pwForm.confirm?"✅":"❌"}
                      </span>
                    )}
                  </div>
                </EditField>
              </div>
              {pwForm.newPassword.length > 0 && (
                <div className="flex items-center gap-2 mt-2 mb-1">
                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${
                      pwForm.newPassword.length<6?"w-1/4 bg-red-500":
                      pwForm.newPassword.length<10?"w-2/4 bg-amber-500":
                      pwForm.newPassword.length<14?"w-3/4 bg-blue-500":"w-full bg-emerald-500"}`} />
                  </div>
                  <span className={`text-[10px] font-semibold ${
                    pwForm.newPassword.length<6?"text-red-400":
                    pwForm.newPassword.length<10?"text-amber-400":
                    pwForm.newPassword.length<14?"text-blue-400":"text-emerald-400"}`}>
                    {pwForm.newPassword.length<6?"Too Short":pwForm.newPassword.length<10?"Weak":pwForm.newPassword.length<14?"Good":"Strong"}
                  </span>
                </div>
              )}
              {pwError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2 mt-2 flex items-center gap-2">
                  <span>⚠</span> {pwError}
                </p>
              )}
              <button type="button" onClick={handlePasswordChange}
                disabled={pwLoading||!pwForm.newPassword||!pwForm.confirm}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all">
                {pwLoading?<span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:"🔑 Update Password"}
              </button>
            </EditSection>

          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-slate-700/60">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-600 bg-slate-800 text-slate-300 hover:text-white hover:border-slate-500 transition-all text-sm font-medium">
              Cancel
            </button>
            <button onClick={()=>setShowSaveConfirm(true)} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all">
              {saving?<span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:"💾 Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════
   MAIN COMPONENT
════════════════════════════════ */
export default function AllUsers() {
  const [users,         setUsers]         = useState([]);
  const [searchInput,   setSearchInput]   = useState("");
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [sortBy,        setSortBy]        = useState("newest");
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [page,          setPage]          = useState(0);
  const [totalCount,    setTotalCount]    = useState(0);
  const [viewMode,      setViewMode]      = useState("list");
  const [toast,         setToast]         = useState(null);
  const [statCounts,    setStatCounts]    = useState({ total:0, active:0, suspended:0, banned:0 });
  const [deviceBanMap,  setDeviceBanMap]  = useState({});
  const [viewUser,      setViewUser]      = useState(null);
  const [editUser,      setEditUser]      = useState(null);
  const [confirmModal,  setConfirmModal]  = useState(null);

  const showToast = useCallback((msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0); }, 380);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchStatCounts = useCallback(async () => {
    try {
      const User = Parse.Object.extend("_User");
      const mk = { useMasterKey:true };
      const [total, suspended, banned] = await Promise.all([
        new Parse.Query(User).count(mk),
        (()=>{ const q=new Parse.Query(User); q.equalTo("status","suspended"); return q.count(mk); })(),
        (()=>{ const q=new Parse.Query(User); q.equalTo("is_banned",true); return q.count(mk); })(),
      ]);
      setStatCounts({ total, suspended, banned, active:total-suspended });
    } catch(e) { console.error(e); }
  }, []);

  const fetchPage = useCallback(async (pg, statusF, srch, sort) => {
    setLoading(true);
    try {
      const User = Parse.Object.extend("_User");
      const mk = { useMasterKey:true };
      const q      = buildQuery(User, statusF, srch);
      const countQ = buildQuery(User, statusF, srch);
      if (sort==="oldest") q.ascending("createdAt");
      else if (sort==="name") q.ascending("name");
      else q.descending("createdAt");
      q.limit(PAGE_SIZE); q.skip(pg*PAGE_SIZE);
      q.select(
        "uid","name","username","gender","status","email","birthday","avatar","createdAt","updatedAt",
        "device_id","is_banned","country","credit","diamonds","creditSent","diamondsTotal","total_recharged_credits",
        "bio","first_name","last_name","lastOnline","using_avatar_frame","using_avatar_frame_id",
        "can_use_using_avatar_frame","tag","user_designation","admin_role","agency_name","agency_role",
        "bkash_number","using_entrance_effect","using_entrance_effect_id","can_use_entrance_effect",
        "using_party_theme","using_party_theme_id","can_use_using_party_theme",
        "list_of_images","isreseller","reseller_coins","reseller_whatsAppnumber",
        "isViewer","Room_priority","my_obtained_items","My_obtained_frame_link"
      );
      const [batch, count] = await Promise.all([q.find(mk), countQ.count(mk)]);
      setTotalCount(count);
      const mapped = batch.map(mapUser);
      setUsers(mapped);
      const deviceIds = mapped.map(u=>u.device_id).filter(Boolean);
      if (deviceIds.length > 0) {
        const bq = new Parse.Query("BannedDevices");
        bq.containedIn("device_id", deviceIds);
        bq.limit(deviceIds.length*2);
        const bans = await bq.find(mk);
        const bm = {};
        bans.forEach(b => { bm[b.get("device_id")]={ hasBan:true, status:!!b.get("status"), banObjId:b.id }; });
        const byU = {};
        mapped.forEach(u => { if (u.device_id) byU[u.objectId]=bm[u.device_id]||{ hasBan:false,status:false }; });
        setDeviceBanMap(byU);
      }
    } catch(e) { showToast("Fetch failed: "+e.message,"error"); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { fetchPage(page,statusFilter,search,sortBy); }, [page,statusFilter,search,sortBy,fetchPage]);
  useEffect(() => { fetchStatCounts(); }, [fetchStatCounts]);

  const toggleUserBan = useCallback(async (user) => {
    const nb = !user.is_banned;
    setConfirmModal(null); setActionLoading(`ban_${user.objectId}`);
    try {
      const obj = await new Parse.Query("_User").get(user.objectId,{useMasterKey:true});
      obj.set("is_banned",nb); await obj.save(null,{useMasterKey:true});
      setUsers(prev=>prev.map(u=>u.objectId===user.objectId?{...u,is_banned:nb}:u));
      fetchStatCounts(); showToast(`${user.username} ${nb?"blocked":"unblocked"}`,nb?"info":"success");
    } catch(e) { showToast("Failed: "+e.message,"error"); }
    finally { setActionLoading(null); }
  },[showToast,fetchStatCounts]);

const toggleDeviceBan = useCallback(async (user) => {
  if (!user.device_id) { showToast("No device ID","error"); return; }
  setConfirmModal(null); setActionLoading(`dev_${user.objectId}`);
  try {
    const mk = { useMasterKey: true };
    const bq = new Parse.Query("BannedDevices"); bq.equalTo("device_id", user.device_id);
    const existing = await bq.first(mk);
    let ns;
    if (existing) {
      ns = !existing.get("status");
      existing.set("status", ns);
      // ── update fingerprint (keep it fresh) ──
      existing.set("device_fingerprint", user.device_fingerprint || "");
      await existing.save(null, mk);
      setDeviceBanMap(p => ({...p, [user.objectId]: { hasBan: true, status: ns, banObjId: existing.id }}));
    } else {
      const Ban = Parse.Object.extend("BannedDevices"); const nb = new Ban();
      nb.set("device_id", user.device_id);
      nb.set("auther_id", user.objectId);
      nb.set("status", true);
      // ── store fingerprint on creation ──
      nb.set("device_fingerprint", user.device_fingerprint || "");
      await nb.save(null, mk);
      ns = true;
      setDeviceBanMap(p => ({...p, [user.objectId]: { hasBan: true, status: true, banObjId: nb.id }}));
    }
    showToast(`Device ${ns ? "banned" : "unbanned"} for ${user.username}`, ns ? "info" : "success");
  } catch(e) { showToast("Device ban failed: " + e.message, "error"); }
  finally { setActionLoading(null); }
}, [showToast]);

  const toggleSuspend = useCallback(async (user) => {
    const ns=user.status==="suspended"?"active":"suspended";
    setConfirmModal(null); setActionLoading(`sus_${user.objectId}`);
    try {
      const obj=await new Parse.Query("_User").get(user.objectId,{useMasterKey:true});
      obj.set("status",ns); await obj.save(null,{useMasterKey:true});
      setUsers(prev=>prev.map(u=>u.objectId===user.objectId?{...u,status:ns}:u));
      fetchStatCounts(); showToast(`${user.username} ${ns==="suspended"?"suspended":"activated"}`,ns==="suspended"?"info":"success");
    } catch(e) { showToast("Failed: "+e.message,"error"); }
    finally { setActionLoading(null); }
  },[showToast,fetchStatCounts]);

  const saveEdit = useCallback(async (editedUser) => {
    if (!editedUser) return;
    setActionLoading(`edit_${editedUser.objectId}`);
    try {
      const obj = await new Parse.Query("_User").get(editedUser.objectId, { useMasterKey: true });
      const direct = [
        "username","name","first_name","last_name","email","country","bio","gender",
        "bkash_number","tag","user_designation","admin_role","agency_name","agency_role",
        "using_avatar_frame_id","using_entrance_effect_id","using_party_theme_id",
        "can_use_using_avatar_frame","can_use_entrance_effect","can_use_using_party_theme",
        "isreseller","reseller_whatsAppnumber","isViewer","Room_priority",
        "diamondsTotal","total_recharged_credits",
      ];
      direct.forEach(k => { if (editedUser[k] !== undefined) obj.set(k, editedUser[k]); });
      if (editedUser.uid !== undefined)           obj.set("uid",            Number(editedUser.uid)            || 0);
      if (editedUser.credit !== undefined)        obj.set("credit",         Number(editedUser.credit)         || 0);
      if (editedUser.diamonds !== undefined)      obj.set("diamonds",       Number(editedUser.diamonds)       || 0);
      if (editedUser.creditSent !== undefined)    obj.set("creditSent",     Number(editedUser.creditSent)     || 0);
      if (editedUser.reseller_coins !== undefined)obj.set("reseller_coins", Number(editedUser.reseller_coins) || 0);
      if (editedUser.birthday)                    obj.set("birthday",       new Date(editedUser.birthday));
      if (editedUser.avatar === null)             obj.unset("avatar");
      else if (editedUser.avatar instanceof Parse.File) obj.set("avatar", editedUser.avatar);
      if (editedUser.using_party_theme === null)  obj.unset("using_party_theme");
      await obj.save(null, { useMasterKey: true });
      const updated = mapUser(obj);
      setUsers(prev => prev.map(u => u.objectId === editedUser.objectId ? updated : u));
      setEditUser(null);
      showToast(`${editedUser.username} updated`, "success");
    } catch(e) { showToast("Update failed: " + e.message, "error"); }
    finally { setActionLoading(null); }
  }, [showToast]);

  const askConfirm = useCallback((data) => setConfirmModal(data), []);
  const refresh = useCallback(() => { fetchPage(page,statusFilter,search,sortBy); fetchStatCounts(); },[page,statusFilter,search,sortBy,fetchPage,fetchStatCounts]);

  const totalPages = Math.ceil(totalCount/PAGE_SIZE);
  const pageRange  = useMemo(() => {
    const delta=2, r=[];
    for(let i=Math.max(0,page-delta); i<=Math.min(totalPages-1,page+delta); i++) r.push(i);
    return r;
  },[page,totalPages]);
  const changePage = n => { setPage(n); window.scrollTo({top:0,behavior:"smooth"}); };

  function rowBg(user) {
    const db=deviceBanMap[user.objectId];
    if (user.is_banned||db?.status) return "bg-red-950/35 border-l-2 border-l-red-500/60 hover:bg-red-950/50";
    if (user.status==="suspended") return "bg-amber-950/25 border-l-2 border-l-amber-500/50 hover:bg-amber-950/40";
    return "hover:bg-slate-800/40";
  }

  function IBtn({ title, onClick, loading:ld, color, icon }) {
    const c={
      blue:"bg-blue-500/15 border-blue-500/35 text-blue-400 hover:bg-blue-500/30",
      amber:"bg-amber-500/15 border-amber-500/35 text-amber-400 hover:bg-amber-500/30",
      red:"bg-red-500/15 border-red-500/35 text-red-400 hover:bg-red-500/30",
      green:"bg-emerald-500/15 border-emerald-500/35 text-emerald-400 hover:bg-emerald-500/30",
      orange:"bg-orange-500/15 border-orange-500/35 text-orange-400 hover:bg-orange-500/30",
    };
    return (
      <button title={title} onClick={onClick} disabled={ld}
        className={`relative group w-8 h-8 rounded-lg border flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${c[color]||c.blue}`}>
        {ld?<span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin"/>:icon}
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-0.5 bg-slate-900 border border-white/10 text-white text-[10px] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">{title}</span>
      </button>
    );
  }

  function ActionBtns({ user }) {
    const db=deviceBanMap[user.objectId]||{};
    const aLd=k=>actionLoading===k;
    return (
      <div className="flex items-center gap-1.5">
        <IBtn title="View Profile" color="blue" onClick={()=>setViewUser(user)}
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}/>
        <IBtn title="Edit Profile" color="amber" onClick={()=>setEditUser(user)}
          icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}/>
        <IBtn title={user.is_banned?"Unblock User":"Block User"} color={user.is_banned?"green":"red"}
          loading={aLd(`ban_${user.objectId}`)}
          icon={user.is_banned
            ?<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            :<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>}
          onClick={()=>askConfirm({title:user.is_banned?"Unblock":"Block",body:`${user.is_banned?"Unblock":"Block"} <strong>@${user.username}</strong>?`,confirmLabel:user.is_banned?"Unblock":"Block",danger:!user.is_banned,action:()=>toggleUserBan(user)})}/>
        {user.device_id && (
          <IBtn title={db.status?"Unban Device":"Ban Device"} color={db.status?"green":"orange"}
            loading={aLd(`dev_${user.objectId}`)}
            icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/>{db.status?<line x1="4" y1="4" x2="20" y2="20"/>:<circle cx="12" cy="16" r="1"/>}</svg>}
            onClick={()=>askConfirm({title:db.status?"Unban Device":"Ban Device",body:`${db.status?"Unban":"Ban"} device for <strong>@${user.username}</strong>?`,confirmLabel:db.status?"Unban":"Ban Device",danger:!db.status,action:()=>toggleDeviceBan(user)})}/>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060b14] text-slate-200 p-4 sm:p-6 lg:p-8 flex flex-col gap-5">
      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        .row-in { animation:slideIn 0.22s ease forwards; opacity:0; }
        select option { background:#1e293b; color:#e2e8f0; }
      `}</style>

      <Toast toast={toast} />
      <ConfirmModal data={confirmModal} onClose={()=>setConfirmModal(null)}
        onConfirm={()=>{ if(confirmModal?.action) confirmModal.action(); }}
        loading={!!actionLoading} />
      {viewUser && (
        <ViewModal user={viewUser} devBan={deviceBanMap[viewUser.objectId]}
          onClose={()=>setViewUser(null)} onEdit={u=>{setViewUser(null);setEditUser(u);}}
          showToast={showToast} onToggleBan={toggleUserBan} onToggleSuspend={toggleSuspend}
          askConfirm={askConfirm} />
      )}
      {editUser && (
        <EditModal user={editUser} onClose={()=>setEditUser(null)}
          onSave={saveEdit} actionLoading={actionLoading} showToast={showToast} />
      )}

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[3px] text-slate-600 mb-1">Dashboard</p>
          <h1 className="text-3xl font-black text-white tracking-tight">User Management</h1>
          <p className="text-sm text-slate-500 mt-1 font-mono">
            {statCounts.total.toLocaleString()} total · {statCounts.active.toLocaleString()} active · {statCounts.suspended.toLocaleString()} suspended · {statCounts.banned.toLocaleString()} blocked
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-800 border border-slate-600 rounded-xl p-1 gap-1">
            {[["list","☰ List"],["card","⊞ Cards"]].map(([v,lbl])=>(
              <button key={v} onClick={()=>setViewMode(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode===v?"bg-indigo-600 text-white":"text-slate-400 hover:text-slate-200"}`}>
                {lbl}
              </button>
            ))}
          </div>
          <button onClick={refresh} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-600 bg-slate-800 text-slate-300 hover:text-white hover:border-slate-500 disabled:opacity-40 text-xs font-semibold transition-all">
            {loading?<span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:"↻"} Refresh
          </button>
        </div>
      </div>

      {/* Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {key:"all",      label:"Total",     val:statCounts.total,     accent:"#818cf8"},
          {key:"active",   label:"Active",    val:statCounts.active,    accent:"#34d399"},
          {key:"suspended",label:"Suspended", val:statCounts.suspended, accent:"#fbbf24"},
          {key:"banned",   label:"Blocked",   val:statCounts.banned,    accent:"#f87171"},
        ].map(s=>(
          <button key={s.key} onClick={()=>{setStatusFilter(s.key);setPage(0);}}
            className={`relative flex flex-col gap-1 p-4 rounded-2xl border transition-all text-left overflow-hidden
              ${statusFilter===s.key?"border-white/20 bg-white/8":"border-slate-700/60 bg-slate-800/50 hover:bg-slate-800/80 hover:border-slate-600"}`}>
            <span className="absolute top-0 left-6 right-6 h-[2px] rounded-b-full"
              style={{background:s.accent,boxShadow:`0 0 10px ${s.accent}`}}/>
            <span className="text-2xl font-black text-white mt-1">{s.val.toLocaleString()}</span>
            <span className="text-xs font-medium text-slate-400">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-base pointer-events-none">⌕</span>
          <input
            className="w-full bg-slate-800 border-2 border-slate-600 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-0 transition-all"
            placeholder="Search name, username or UID…"
            value={searchInput}
            onChange={e=>setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button onClick={()=>{setSearchInput("");setSearch("");setPage(0);}}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs w-5 h-5 rounded-full bg-slate-600 hover:bg-slate-500 flex items-center justify-center transition-all">
              ✕
            </button>
          )}
        </div>
        <select value={sortBy} onChange={e=>{setSortBy(e.target.value);setPage(0);}}
          className="bg-slate-800 border-2 border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer appearance-none pr-8"
          style={{backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 5 5-5z' fill='%2394a3b8'/%3E%3C/svg%3E\")",backgroundRepeat:"no-repeat",backgroundPosition:"right 10px center"}}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">By Name</option>
        </select>
        {!loading && (
          <span className="text-xs text-slate-300 font-mono whitespace-nowrap bg-slate-800 border-2 border-slate-600 px-3 py-2.5 rounded-xl">
            {totalCount.toLocaleString()} result{totalCount!==1?"s":""}
          </span>
        )}
      </div>

      {!loading && totalPages>1 && (
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono bg-slate-800/70 border border-slate-700 rounded-xl px-4 py-2 w-fit">
          <span>Page <strong className="text-white">{page+1}</strong> of <strong className="text-white">{totalPages}</strong></span>
          <span className="w-1 h-1 rounded-full bg-slate-600"/>
          <span>Records <strong className="text-white">{page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE,totalCount)}</strong> of <strong className="text-white">{totalCount}</strong></span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-500">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-2 border-transparent border-t-blue-500 rounded-full animate-spin"/>
            <div className="absolute inset-2 border-2 border-transparent border-t-indigo-400 rounded-full animate-spin" style={{animationDirection:"reverse",animationDuration:"0.6s"}}/>
          </div>
          <p className="text-sm">Fetching users…</p>
        </div>
      ) : users.length===0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-slate-500">
          <div className="text-5xl opacity-20">◎</div>
          <p className="text-sm">No users found</p>
          <button onClick={()=>{setSearchInput("");setSearch("");setStatusFilter("all");setPage(0);}}
            className="text-xs px-4 py-2 rounded-xl border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all">
            Clear filters
          </button>
        </div>
      ) : viewMode==="card" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {users.map((user,i)=>{
            const clr=getAvatarColor(user.username);
            const suspended=user.status==="suspended";
            const db=deviceBanMap[user.objectId]||{};
            const bad=user.is_banned||db.status;
            return (
              <div key={user.objectId}
                style={{animation:`fadeUp 0.35s ease ${i*28}ms forwards`,opacity:0}}
                className={`rounded-2xl border p-4 flex flex-col gap-3 transition-all
                  ${bad?"bg-red-950/30 border-red-800/50":""}
                  ${!bad&&suspended?"bg-amber-950/20 border-amber-800/40":""}
                  ${!bad&&!suspended?"bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/70 hover:border-slate-600":""}`}>
                <div className="flex items-start justify-between">
                  <div className="relative">
                    {user.avatar
                      ?<img src={user.avatar} alt={user.name} className="w-14 h-14 rounded-xl object-cover border-2 border-white/10"/>
                      :<div className="w-14 h-14 rounded-xl border-2 border-white/10 flex items-center justify-center text-xl font-bold"
                          style={{background:`linear-gradient(135deg,${clr}bb,${clr}44)`}}>{getInitial(user.name)}</div>}
                    <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#060b14] ${suspended?"bg-amber-500":user.is_banned?"bg-red-500":"bg-emerald-500"}`}/>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end max-w-[130px]">
                    {user.is_banned && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">🔒</span>}
                    {db.status && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25">📵</span>}
                    {user.can_use_using_avatar_frame && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25">🖼</span>}
                    {user.tag && <span className={`text-[9px] px-1.5 py-0.5 rounded-full bg-white/8 border border-white/10 font-medium truncate max-w-[80px] ${getTagColor(user.tag)}`}>{getTagLabel(user.tag)}</span>}
                  </div>
                </div>
                <div>
                  <p className="font-bold text-white text-sm truncate">{user.name}</p>
                  <p className="text-xs text-slate-400 font-mono truncate">@{user.username}</p>
                </div>
                <button onClick={()=>copyText(user.uid,showToast)}
                  className="flex items-center gap-2 bg-slate-700/60 hover:bg-cyan-500/10 border border-slate-600 hover:border-cyan-500/40 rounded-lg px-3 py-1.5 transition-all group w-full">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">UID</span>
                  <span className="font-mono text-xs text-slate-300 group-hover:text-cyan-400 flex-1 text-left transition-colors">{user.uid}</span>
                  <span className="text-slate-500 group-hover:text-cyan-400 text-[10px] transition-colors">⎘</span>
                </button>
                <div className="text-xs text-slate-500 flex items-center justify-between">
                  <span>{user.gender}</span><span>{timeAgo(user.createdAt)}</span>
                </div>
                <ActionBtns user={user}/>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-700/50 overflow-hidden">
          <div className="hidden md:grid grid-cols-[52px_1fr_110px_100px_90px_160px] gap-4 px-4 py-3 bg-slate-800/70 border-b border-slate-700/60 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <span/><span>Name / Username</span><span>UID</span><span>Joined</span><span>Status</span><span className="text-right">Actions</span>
          </div>
          {users.map((user,i)=>{
            const clr=getAvatarColor(user.username);
            const suspended=user.status==="suspended";
            const db=deviceBanMap[user.objectId]||{};
            return (
              <div key={user.objectId} style={{animationDelay:`${i*16}ms`}}
                className={`row-in flex flex-wrap md:grid md:grid-cols-[52px_1fr_110px_100px_90px_160px] gap-2 md:gap-4 items-center px-4 py-3 border-b border-slate-800/80 last:border-b-0 transition-all ${rowBg(user)}`}>
                <div className="relative flex-shrink-0">
                  {user.avatar
                    ?<img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-xl object-cover border border-white/10"/>
                    :<div className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-sm font-bold"
                        style={{background:`linear-gradient(135deg,${clr}99,${clr}44)`}}>{getInitial(user.name)}</div>}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[1.5px] border-[#060b14] ${suspended||user.is_banned?"bg-red-500":db.status?"bg-orange-500":"bg-emerald-500"}`}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-white text-sm truncate max-w-[160px]">{user.name}</span>
                    {user.is_banned && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">🔒</span>}
                    {db.status && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25">📵</span>}
                    {user.can_use_using_avatar_frame && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25">🖼</span>}
                    {user.tag && <span className={`text-[9px] px-1.5 py-0.5 rounded-full bg-white/6 border border-white/10 ${getTagColor(user.tag)}`}>{getTagLabel(user.tag)}</span>}
                  </div>
                  <span className="font-mono text-xs text-slate-500 truncate block">@{user.username}</span>
                </div>
                <div className="hidden md:block">
                  <button onClick={()=>copyText(user.uid,showToast)}
                    className="font-mono text-xs text-slate-400 hover:text-cyan-400 bg-slate-700/50 hover:bg-cyan-500/10 border border-slate-600 hover:border-cyan-500/35 rounded-lg px-2 py-1 transition-all group flex items-center gap-1 max-w-[105px] w-full">
                    <span className="truncate flex-1">{user.uid}</span>
                    <span className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">⎘</span>
                  </button>
                </div>
                <div className="hidden md:block">
                  <span className="font-mono text-xs text-slate-500">{timeAgo(user.createdAt)}</span>
                </div>
                <div className="hidden md:block">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${suspended?"bg-amber-500/10 text-amber-400 border-amber-500/30":"bg-emerald-500/10 text-emerald-400 border-emerald-500/30"}`}>
                    {suspended?"Suspended":"Active"}
                  </span>
                </div>
                <div className="flex justify-end w-full md:w-auto"><ActionBtns user={user}/></div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages>1 && (
        <div className="flex items-center justify-center gap-1.5 flex-wrap pt-2">
          {[["«",()=>changePage(0)],["‹",()=>changePage(page-1)]].map(([l,fn],i)=>(
            <button key={i} disabled={page===0||loading} onClick={fn}
              className="w-8 h-8 rounded-lg border border-slate-600 bg-slate-800 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-all">{l}</button>
          ))}
          {pageRange[0]>0 && (<>
            <button onClick={()=>changePage(0)} className="w-8 h-8 rounded-lg border border-slate-600 bg-slate-800 text-slate-400 hover:text-white hover:border-slate-500 text-xs font-medium transition-all">1</button>
            {pageRange[0]>1 && <span className="text-slate-600 px-1">…</span>}
          </>)}
          {pageRange.map(i=>(
            <button key={i} onClick={()=>changePage(i)}
              className={`w-8 h-8 rounded-lg border text-xs font-semibold transition-all ${page===i?"bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/25":"border-slate-600 bg-slate-800 text-slate-400 hover:text-white hover:border-slate-500"}`}>
              {i+1}
            </button>
          ))}
          {pageRange[pageRange.length-1]<totalPages-1 && (<>
            {pageRange[pageRange.length-1]<totalPages-2 && <span className="text-slate-600 px-1">…</span>}
            <button onClick={()=>changePage(totalPages-1)} className="w-8 h-8 rounded-lg border border-slate-600 bg-slate-800 text-slate-400 hover:text-white hover:border-slate-500 text-xs font-medium transition-all">{totalPages}</button>
          </>)}
          {[["›",()=>changePage(page+1)],["»",()=>changePage(totalPages-1)]].map(([l,fn],i)=>(
            <button key={i} disabled={page===totalPages-1||loading} onClick={fn}
              className="w-8 h-8 rounded-lg border border-slate-600 bg-slate-800 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-all">{l}</button>
          ))}
          <span className="font-mono text-xs text-slate-500 pl-2">Page {page+1}/{totalPages}</span>
        </div>
      )}
    </div>
  );
}