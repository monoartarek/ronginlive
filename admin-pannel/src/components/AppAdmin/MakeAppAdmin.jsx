import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Parse from "../../parseConfig";

/* ══════════════════════════════════════════════════════
   CONSTANTS & HELPERS
══════════════════════════════════════════════════════ */
const PAGE_SIZE = 10;

function getInitial(n) { return (n || "?").charAt(0).toUpperCase(); }

function avatarBg(str) {
  const p = ["#7c3aed","#6366f1","#ec4899","#f43f5e","#f59e0b","#10b981","#06b6d4","#3b82f6"];
  let h = 0;
  for (let i = 0; i < (str || "").length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return p[Math.abs(h) % p.length];
}

function timeAgo(d) {
  if (!d) return "—";
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function mapUser(u) {
  const av = u.get("avatar");
  let avatarUrl = null;
  if (av && typeof av.url === "function") avatarUrl = av.url();
  else if (typeof av === "string") avatarUrl = av;
  return {
    objectId:  u.id,
    uid:       String(u.get("uid") || u.id),
    name:      u.get("name")            || "—",
    username:  u.get("username")        || "anonymous",
    email:     u.get("email")           || "—",
    gender:    u.get("gender")          || "—",
    country:   u.get("country")         || "—",
    birthday:  u.get("birthday")        || null,
    createdAt: u.get("createdAt"),
    isAdmin:   u.get("admin_role") === "admin",
    adminRole: u.get("admin_role")      || "",
    whatsapp:  u.get("whatsapp_number") || "",
    avatarUrl,
  };
}

/* ══════════════════════════════════════════════════════
   SMALL SHARED COMPONENTS
══════════════════════════════════════════════════════ */

/* ── Avatar ── */
function Av({ user, size = 36, badge = true }) {
  const bg = avatarBg(user.username);
  const radius = Math.round(size * 0.28);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {user.avatarUrl
        ? <img src={user.avatarUrl} alt={user.name} className="object-cover"
            style={{ width: size, height: size, borderRadius: radius, border: "1.5px solid rgba(255,255,255,0.1)" }} />
        : <div className="flex items-center justify-center font-bold text-white select-none"
            style={{ width: size, height: size, borderRadius: radius, background: bg,
              fontSize: Math.max(11, size * 0.36), border: "1.5px solid rgba(255,255,255,0.08)" }}>
            {getInitial(user.name)}
          </div>
      }
      {badge && user.isAdmin && (
        <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center text-[7px] select-none"
          style={{ width: 14, height: 14, borderRadius: "50%", background: "#f59e0b",
            border: "2px solid #060c18", boxShadow: "0 0 6px rgba(245,158,11,0.5)" }}>
          🛡
        </span>
      )}
    </div>
  );
}

/* ── Toast ── */
function Toast({ toast }) {
  if (!toast) return null;
  const cfg = {
    success: { cls: "bg-emerald-900/95 border-emerald-500/40 text-emerald-200", icon: "✓" },
    error:   { cls: "bg-red-950/95 border-red-500/40 text-red-200",           icon: "✕" },
    info:    { cls: "bg-indigo-950/95 border-indigo-500/40 text-indigo-200",  icon: "ℹ" },
    copy:    { cls: "bg-sky-950/95 border-sky-500/40 text-sky-200",           icon: "⎘" },
  };
  const c = cfg[toast.type] || cfg.info;
  return (
    <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl text-sm font-semibold max-w-xs backdrop-blur-sm ${c.cls}`}
      style={{ animation: "slideDown .3s ease" }}>
      <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">{c.icon}</span>
      {toast.msg}
    </div>
  );
}

/* ── Confirm Modal ── */
function ConfirmModal({ data, onClose, onConfirm, loading }) {
  if (!data) return null;
  return (
    <div className="fixed inset-0 z-[9200] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-3xl p-7 text-center shadow-2xl"
        style={{ background: "#0d1525", border: "1px solid rgba(255,255,255,0.1)", animation: "pop .25s cubic-bezier(.34,1.56,.64,1)" }}>

        {/* User preview card */}
        {data.user && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-5 text-left"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Av user={data.user} size={44} badge={false} />
            <div className="min-w-0">
              <div className="font-bold text-white text-sm truncate">{data.user.name}</div>
              <div className="text-xs text-slate-500 font-mono">@{data.user.username} · UID {data.user.uid}</div>
            </div>
          </div>
        )}

        <div className={`w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center text-xl
          ${data.danger ? "bg-red-500/15 text-red-400" : "bg-indigo-500/15 text-indigo-400"}`}>
          {data.danger ? "⚠" : "🛡"}
        </div>

        <h3 className="text-white font-bold text-base mb-2">{data.title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed mb-5"
          dangerouslySetInnerHTML={{ __html: data.body }} />

        {data.showWhatsapp && (
          <div className="mb-5 text-left">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              WhatsApp Number (optional)
            </label>
            <input type="tel" placeholder="+8801XXXXXXXXX"
              value={data.whatsapp} onChange={e => data.setWhatsapp(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-400 text-sm font-semibold hover:bg-white/10 transition-all">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all
              ${data.danger ? "bg-red-600 hover:bg-red-500" : "bg-indigo-600 hover:bg-indigo-500"}`}>
            {loading && <span className="w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin" />}
            {loading ? "Processing…" : data.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Stat Card ── */
function StatCard({ icon, label, value, color, glow, onClick, active, tip }) {
  return (
    <button onClick={onClick}
      className={`relative group flex flex-col gap-2 p-5 rounded-2xl text-left w-full transition-all duration-200 overflow-hidden
        ${onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-xl" : "cursor-default"}`}
      style={{
        background: active ? `${color}12` : "rgba(255,255,255,0.03)",
        border: `1px solid ${active ? `${color}50` : "rgba(255,255,255,0.07)"}`,
        boxShadow: active ? `0 0 0 1px ${color}25, inset 0 0 40px ${color}08` : "none",
      }}>
      {/* glow layer */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: `radial-gradient(circle at 25% 60%, ${color}15, transparent 65%)` }} />

      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          {icon}
        </div>
        {onClick && (
          <span className="text-[9px] font-bold tracking-widest opacity-50 group-hover:opacity-100 transition-opacity pt-0.5"
            style={{ color }}>
            {active ? "● ACTIVE" : "VIEW →"}
          </span>
        )}
      </div>
      <div className="text-2xl font-black tabular-nums" style={{ color }}>{value.toLocaleString()}</div>
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-none">{label}</div>
      {tip && active && (
        <div className="text-[10px] text-slate-600 mt-0.5">{tip}</div>
      )}
    </button>
  );
}

/* ── Tabs ── */
function Tabs({ active, onChange, items }) {
  return (
    <div className="flex gap-0 border-b border-white/[0.07] mb-6">
      {items.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 -mb-px transition-all
            ${active === t.key
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-300 hover:border-white/20"}`}>
          <span>{t.icon}</span>
          <span>{t.label}</span>
          {t.badge != null && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold
              ${active === t.key ? "bg-indigo-500/20 text-indigo-400" : "bg-white/[0.07] text-slate-500"}`}>
              {t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ── Search bar ── */
function SearchBar({ value, onChange, onClear, placeholder, accentColor = "#6366f1" }) {
  const ref = useRef();
  return (
    <div className="relative flex-1 min-w-[180px]">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-[15px] pointer-events-none select-none">⌕</span>
      <input ref={ref} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-9 py-2.5 rounded-xl text-white text-sm outline-none transition-all"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        onFocus={e => e.target.style.borderColor = accentColor + "80"}
        onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
      {value && (
        <button onClick={() => { onChange(""); ref.current?.focus(); onClear?.(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-[10px] transition-colors">
          ✕
        </button>
      )}
    </div>
  );
}

/* ── View toggle ── */
function ViewToggle({ mode, onChange, color }) {
  return (
    <div className="flex rounded-xl overflow-hidden border border-white/10 shrink-0">
      {[["list", "☰ List"], ["card", "⊞ Cards"]].map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)}
          className="px-3.5 py-2.5 text-xs font-bold transition-all"
          style={{
            background: mode === v ? color || "#6366f1" : "rgba(255,255,255,0.04)",
            color: mode === v ? "#fff" : "#64748b",
          }}>{l}</button>
      ))}
    </div>
  );
}

/* ── Refresh btn ── */
function RefreshBtn({ loading, onClick }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-400 text-xs font-bold hover:text-white hover:bg-white/10 transition-all disabled:opacity-40 shrink-0">
      <span style={{ display: "inline-block", animation: loading ? "spin .8s linear infinite" : "none" }}>↻</span>
      Refresh
    </button>
  );
}

/* ── Pagination ── */
function Pager({ page, total, onChange }) {
  if (total <= 1) return null;
  const delta = 2, pages = [];
  for (let i = Math.max(0, page - delta); i <= Math.min(total - 1, page + delta); i++) pages.push(i);
  const btn = (label, onClick, disabled, active) => (
    <button onClick={onClick} disabled={disabled}
      className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed
        ${active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"}`}>
      {label}
    </button>
  );
  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap py-4">
      {btn("«", () => onChange(0),       page === 0)}
      {btn("‹", () => onChange(page - 1), page === 0)}
      {pages[0] > 0 && <>{btn("1", () => onChange(0), false)}{pages[0] > 1 && <span className="text-slate-600 px-1 text-xs">…</span>}</>}
      {pages.map(p => btn(p + 1, () => onChange(p), false, p === page))}
      {pages[pages.length - 1] < total - 1 && <>
        {pages[pages.length - 1] < total - 2 && <span className="text-slate-600 px-1 text-xs">…</span>}
        {btn(total, () => onChange(total - 1), false)}
      </>}
      {btn("›", () => onChange(page + 1), page === total - 1)}
      {btn("»", () => onChange(total - 1), page === total - 1)}
      <span className="text-xs text-slate-600 font-mono pl-2">{page + 1} / {total}</span>
    </div>
  );
}

/* ── Loading Spinner ── */
function Spinner({ color = "#6366f1", size = 40 }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-slate-500">
      <div className="relative" style={{ width: size, height: size }}>
        <div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: color }} />
        <div className="absolute rounded-full border-2 border-transparent animate-spin"
          style={{ inset: size * 0.2, borderTopColor: color + "80", animationDirection: "reverse", animationDuration: "0.5s" }} />
      </div>
      <p className="text-sm">Loading…</p>
    </div>
  );
}

/* ── Empty State ── */
function Empty({ icon, msg, action }) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-slate-500">
      <div className="text-5xl opacity-20">{icon}</div>
      <p className="text-sm">{msg}</p>
      {action && <button onClick={action.onClick}
        className="text-xs px-4 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors">
        {action.label}
      </button>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export default function AppAdmin() {

  /* all-users */
  const [users,         setUsers]         = useState([]);
  const [searchInput,   setSearchInput]   = useState("");
  const [search,        setSearch]        = useState("");
  const [loading,       setLoading]       = useState(false);
  const [page,          setPage]          = useState(0);
  const [totalCount,    setTotalCount]    = useState(0);
  const [viewMode,      setViewMode]      = useState("list");

  /* admins */
  const [admins,        setAdmins]        = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminSearch,   setAdminSearch]   = useState("");
  const [adminPage,     setAdminPage]     = useState(0);
  const [adminView,     setAdminView]     = useState("list");

  /* shared */
  const [stats,         setStats]         = useState({ total: 0, admins: 0 });
  const [actionLoading, setActionLoading] = useState(null);
  const [toast,         setToast]         = useState(null);
  const [confirm,       setConfirm]       = useState(null);
  const [whatsapp,      setWhatsapp]      = useState("");
  const [copied,        setCopied]        = useState(null);
  const [tab,           setTab]           = useState("all");

  /* toast helper */
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  /* copy helper */
  const copy = (text, id) => {
    navigator.clipboard?.writeText(String(text)).then(() => {
      setCopied(id);
      showToast(`Copied: ${text}`, "copy");
      setTimeout(() => setCopied(null), 1800);
    });
  };

  /* debounce search */
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0); }, 380);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* ── fetch stats ── */
  const fetchStats = useCallback(async () => {
    try {
      const mk = { useMasterKey: true };
      const U  = Parse.Object.extend("_User");
      const [total, ac] = await Promise.all([
        new Parse.Query(U).count(mk),
        (() => { const q = new Parse.Query(U); q.equalTo("admin_role", "admin"); return q.count(mk); })(),
      ]);
      setStats({ total, admins: ac });
    } catch (e) { console.error(e); }
  }, []);

  /* ── fetch admins list ── */
  const fetchAdmins = useCallback(async () => {
    setAdminsLoading(true);
    try {
      const q = new Parse.Query("_User");
      q.equalTo("admin_role", "admin");
      q.descending("createdAt");
      q.limit(2000);
      q.select(["uid","name","username","email","gender","country","avatar","createdAt","admin_role","whatsapp_number","birthday"]);
      const res = await q.find({ useMasterKey: true });
      setAdmins(res.map(mapUser));
    } catch (e) { showToast("Load admins failed: " + e.message, "error"); }
    finally     { setAdminsLoading(false); }
  }, [showToast]);

  /* ── fetch users page ── */
  const fetchPage = useCallback(async (pg, srch) => {
    setLoading(true);
    try {
      const mk   = { useMasterKey: true };
      const U    = Parse.Object.extend("_User");
      const trim = srch.trim();
      let q, cq;
      if (trim) {
        const byN = new Parse.Query(U); byN.contains("name", trim);
        const byU = new Parse.Query(U); byU.contains("username", trim);
        const qs  = [byN, byU];
        const n   = parseInt(trim);
        if (!isNaN(n)) { const byI = new Parse.Query(U); byI.equalTo("uid", n); qs.push(byI); }
        q = Parse.Query.or(...qs); cq = Parse.Query.or(...qs);
      } else {
        q = new Parse.Query(U); cq = new Parse.Query(U);
      }
      q.descending("createdAt"); q.limit(PAGE_SIZE); q.skip(pg * PAGE_SIZE);
      q.select(["uid","name","username","email","gender","country","avatar","createdAt","admin_role","whatsapp_number"]);
      const [batch, count] = await Promise.all([q.find(mk), cq.count(mk)]);
      setTotalCount(count);
      setUsers(batch.map(mapUser));
    } catch (e) { showToast("Fetch failed: " + e.message, "error"); }
    finally     { setLoading(false); }
  }, [showToast]);

  /* initial load */
  useEffect(() => { fetchStats(); fetchPage(0, ""); fetchAdmins(); }, []);
  useEffect(() => { fetchPage(page, search); }, [page, search]);

  const totalPages  = Math.ceil(totalCount / PAGE_SIZE) || 1;

  /* filtered admin list */
  const filtAdmins = useMemo(() => {
    const q = adminSearch.toLowerCase().trim();
    if (!q) return admins;
    return admins.filter(a =>
      a.name.toLowerCase().includes(q) || a.username.toLowerCase().includes(q) ||
      a.uid.includes(q) || a.email.toLowerCase().includes(q)
    );
  }, [admins, adminSearch]);

  const admTotalPages = Math.ceil(filtAdmins.length / PAGE_SIZE) || 1;
  const admPaged      = filtAdmins.slice(adminPage * PAGE_SIZE, (adminPage + 1) * PAGE_SIZE);

  /* ── open confirm toggle ── */
  const askToggle = user => {
    setWhatsapp("");
    if (user.isAdmin) {
      setConfirm({
        title: "Remove Admin Role",
        body:  `Remove <strong style="color:#fff">@${user.username}</strong> from App Admin?<br/><span style="color:#64748b;font-size:11px">Their AgentRole record will also be deleted.</span>`,
        confirmLabel: "Yes, Remove",
        danger: true, user,
        showWhatsapp: false, whatsapp: "", setWhatsapp: () => {},
      });
    } else {
      setConfirm({
        title: "Make App Admin",
        body:  `Grant App Admin role to <strong style="color:#fff">@${user.username}</strong>?<br/><span style="color:#64748b;font-size:11px">An AgentRole record will be created automatically.</span>`,
        confirmLabel: "Yes, Make Admin",
        danger: false, user,
        showWhatsapp: true, whatsapp: whatsapp, setWhatsapp: setWhatsapp,
      });
    }
  };

  /* ── do toggle ── */
  const doToggle = async () => {
    if (!confirm) return;
    const { user } = confirm;
    const making   = !user.isAdmin;
    setConfirm(null);
    setActionLoading(user.objectId);
    try {
      const mk  = { useMasterKey: true };
      const obj = await new Parse.Query("_User").get(user.objectId, mk);
      if (making) {
        obj.set("admin_role", "admin");
        if (whatsapp.trim()) obj.set("whatsapp_number", whatsapp.trim());
        await obj.save(null, mk);
        const rec = new (Parse.Object.extend("AgentRole"))();
        rec.set("admin_id",    user.objectId);
        rec.set("admin_by_id", "admin");
        rec.set("total_points", 0);
        rec.set("points",       0);
        rec.set("total_agent",  0);
        rec.setArray("agents_list", []);
        await rec.save(null, mk);
        const upd = { ...user, isAdmin: true, adminRole: "admin", whatsapp: whatsapp.trim() || user.whatsapp };
        setUsers(p  => p.map(u => u.objectId === user.objectId ? upd : u));
        setAdmins(p => [upd, ...p]);
        showToast(`✓ @${user.username} is now App Admin!`);
      } else {
        obj.set("admin_role", "");
        await obj.save(null, mk);
        const aq = new Parse.Query("AgentRole");
        aq.equalTo("admin_id", user.objectId);
        const found = await aq.first(mk);
        if (found) await found.destroy(mk);
        const upd = { ...user, isAdmin: false, adminRole: "" };
        setUsers(p  => p.map(u => u.objectId === user.objectId ? upd : u));
        setAdmins(p => p.filter(a => a.objectId !== user.objectId));
        showToast(`@${user.username} removed from App Admin`, "info");
      }
      fetchStats();
      setWhatsapp("");
    } catch (e) { showToast("Failed: " + e.message, "error"); }
    finally     { setActionLoading(null); }
  };

  const doRefresh = () => { fetchStats(); fetchPage(page, search); fetchAdmins(); };

  /* ═══════════════════════════════════════
     USER ROW (All Users tab — list view)
  ═══════════════════════════════════════ */
  const UserRow = ({ user, i }) => {
    const il = actionLoading === user.objectId;
    return (
      <div
        className={`grid items-center px-4 py-3 border-b border-white/[0.04] transition-colors
          hover:bg-white/[0.025] ${user.isAdmin ? "bg-amber-500/[0.025]" : ""}`}
        style={{ gridTemplateColumns: "40px 1fr 100px 80px 120px 160px", gap: "10px",
          animation: `fadeUp .22s ease ${i * 14}ms both` }}>

        {/* avatar */}
        <Av user={user} size={34} />

        {/* name */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-white text-sm truncate max-w-[160px]">{user.name}</span>
            {user.isAdmin && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold shrink-0">
                ADMIN
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500 font-mono">@{user.username}</span>
        </div>

        {/* UID copy chip */}
        <button onClick={() => copy(user.uid, `u-${user.objectId}`)}
          className="flex items-center gap-1 font-mono text-[11px] px-2 py-1 rounded-lg transition-all overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: copied === `u-${user.objectId}` ? "#38bdf8" : "#94a3b8",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(56,189,248,0.08)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}>
          <span className="truncate">{user.uid}</span>
          <span className="text-[9px] opacity-50 shrink-0">⎘</span>
        </button>

        {/* joined */}
        <span className="text-[11px] text-slate-500 font-mono">{timeAgo(user.createdAt)}</span>

        {/* status badge */}
        <div>
          {user.isAdmin
            ? <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-amber-500/12 border border-amber-500/30 text-amber-400 font-bold">🛡 Admin</span>
            : <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-500">User</span>
          }
        </div>

        {/* action */}
        <button onClick={() => askToggle(user)} disabled={il}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed
            ${user.isAdmin
              ? "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
              : "bg-indigo-500/12 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/22"}`}>
          {il
            ? <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            : user.isAdmin ? "✕ Remove" : "🛡 Make Admin"
          }
        </button>
      </div>
    );
  };

  /* ═══════════════════════════════════════
     USER CARD (All Users tab — card view)
  ═══════════════════════════════════════ */
  const UserCard = ({ user, i }) => {
    const il = actionLoading === user.objectId;
    return (
      <div
        className={`rounded-2xl p-4 flex flex-col gap-3 transition-all hover:-translate-y-0.5
          ${user.isAdmin
            ? "bg-amber-500/[0.06] border border-amber-500/20 hover:border-amber-500/35"
            : "bg-white/[0.03] border border-white/[0.07] hover:border-white/15"}`}
        style={{ animation: `fadeUp .28s ease ${i * 24}ms both` }}>

        {/* header */}
        <div className="flex items-center gap-3">
          <Av user={user} size={46} />
          <div className="min-w-0 flex-1">
            <div className="font-bold text-white text-sm truncate">{user.name}</div>
            <div className="text-[11px] text-slate-500 font-mono">@{user.username}</div>
          </div>
          {user.isAdmin && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold shrink-0">
              🛡 ADMIN
            </span>
          )}
        </div>

        {/* UID copy */}
        <button onClick={() => copy(user.uid, `cu-${user.objectId}`)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all group"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(56,189,248,0.08)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}>
          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">UID</span>
          <span className={`font-mono text-xs flex-1 text-left ${copied === `cu-${user.objectId}` ? "text-sky-400" : "text-slate-300"}`}>
            {user.uid}
          </span>
          <span className="text-[10px] text-slate-600 group-hover:text-sky-400 transition-colors">⎘</span>
        </button>

        {/* meta row */}
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">Email</span>
            <span className="truncate">{user.email}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">Joined</span>
            <span>{timeAgo(user.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">Gender</span>
            <span>{user.gender === "MAL" ? "Male" : user.gender === "FML" ? "Female" : user.gender}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">Country</span>
            <span className="truncate">{user.country}</span>
          </div>
        </div>

        {/* action */}
        <button onClick={() => askToggle(user)} disabled={il}
          className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50
            ${user.isAdmin
              ? "bg-red-500/12 border border-red-500/30 text-red-400 hover:bg-red-500/22"
              : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"}`}>
          {il
            ? <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            : user.isAdmin ? "✕ Remove Admin Role" : "🛡 Make App Admin"
          }
        </button>
      </div>
    );
  };

  /* ═══════════════════════════════════════
     ADMIN ROW (App Admins tab — list view)
     Mirrors just_admin.php table columns
  ═══════════════════════════════════════ */
  const AdminRow = ({ admin, i }) => {
    const il = actionLoading === admin.objectId;
    return (
      <div
        className="grid items-center px-4 py-3 border-b border-white/[0.04] transition-colors hover:bg-amber-500/[0.03]"
        style={{ gridTemplateColumns: "38px 1fr 95px 95px 125px 100px 120px", gap: "10px",
          animation: `fadeUp .2s ease ${i * 12}ms both` }}>

        {/* avatar */}
        <Av user={admin} size={32} badge={false} />

        {/* name */}
        <div className="min-w-0">
          <div className="font-semibold text-white text-sm truncate">{admin.name}</div>
          <div className="text-[11px] text-slate-500 font-mono">@{admin.username}</div>
        </div>

        {/* UID */}
        <button onClick={() => copy(admin.uid, `a-${admin.objectId}`)}
          className="flex items-center gap-1 font-mono text-[11px] px-2 py-1 rounded-lg overflow-hidden transition-all"
          style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: copied === `a-${admin.objectId}` ? "#38bdf8" : "#94a3b8",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(56,189,248,0.08)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}>
          <span className="truncate">{admin.uid}</span>
          <span className="text-[9px] opacity-50 shrink-0">⎘</span>
        </button>

        {/* ObjectId */}
        <button onClick={() => copy(admin.objectId, `ao-${admin.objectId}`)}
          className="flex items-center gap-1 font-mono text-[10px] px-2 py-1 rounded-lg overflow-hidden transition-all"
          style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: copied === `ao-${admin.objectId}` ? "#38bdf8" : "#64748b",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(56,189,248,0.08)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}>
          <span className="truncate">{admin.objectId.slice(0, 8)}…</span>
          <span className="text-[9px] opacity-50 shrink-0">⎘</span>
        </button>

        {/* joined date */}
        <div>
          <div className="text-xs text-slate-400">{fmtDate(admin.createdAt)}</div>
          <div className="text-[10px] text-slate-600">{timeAgo(admin.createdAt)}</div>
        </div>

        {/* whatsapp */}
        <span className="text-[10px] text-slate-500 font-mono truncate">{admin.whatsapp || "—"}</span>

        {/* remove */}
        <button onClick={() => askToggle(admin)} disabled={il}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/22 transition-all disabled:opacity-50 whitespace-nowrap">
          {il
            ? <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            : "✕"
          }
          Remove
        </button>
      </div>
    );
  };

  /* ═══════════════════════════════════════
     ADMIN CARD (App Admins tab — card view)
  ═══════════════════════════════════════ */
  const AdminCard = ({ admin, i }) => {
    const il = actionLoading === admin.objectId;
    return (
      <div
        className="rounded-2xl p-4 flex flex-col gap-3 bg-amber-500/[0.05] border border-amber-500/[0.18] transition-all hover:border-amber-500/40 hover:-translate-y-0.5"
        style={{ animation: `fadeUp .26s ease ${i * 20}ms both` }}>

        {/* header */}
        <div className="flex items-center gap-3">
          <Av user={admin} size={44} badge={false} />
          <div className="min-w-0 flex-1">
            <div className="font-bold text-white text-sm truncate">{admin.name}</div>
            <div className="text-[11px] text-slate-500 font-mono">@{admin.username}</div>
          </div>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold shrink-0">🛡</span>
        </div>

        {/* info grid — mirrors just_admin.php columns */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { l: "UID",      v: admin.uid,                  mono: true,  copy: `ac-${admin.objectId}`, val: admin.uid },
            { l: "ObjectId", v: admin.objectId.slice(0,10)+"…", mono: true, copy: `aco-${admin.objectId}`, val: admin.objectId },
            { l: "Joined",   v: fmtDate(admin.createdAt),   mono: false },
            { l: "Gender",   v: admin.gender === "MAL" ? "Male" : admin.gender === "FML" ? "Female" : admin.gender || "—", mono: false },
            { l: "WhatsApp", v: admin.whatsapp || "—",       mono: true },
            { l: "Email",    v: admin.email,                 mono: false },
          ].map(item => (
            <div key={item.l}
              className={`rounded-xl px-3 py-2 ${item.copy ? "cursor-pointer transition-colors" : ""}`}
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              onClick={item.copy ? () => copy(item.val, item.copy) : undefined}
              onMouseEnter={e => item.copy && (e.currentTarget.style.background = "rgba(56,189,248,0.06)")}
              onMouseLeave={e => item.copy && (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}>
              <div className="text-[9px] text-slate-600 font-bold uppercase tracking-wider mb-1">{item.l}</div>
              <div className={`text-xs truncate ${item.copy && copied === item.copy ? "text-sky-400" : "text-slate-300"} ${item.mono ? "font-mono" : ""}`}>
                {item.v}
                {item.copy && <span className="text-[9px] opacity-30 ml-1">⎘</span>}
              </div>
            </div>
          ))}
        </div>

        {/* remove */}
        <button onClick={() => askToggle(admin)} disabled={il}
          className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-red-500/12 border border-red-500/30 text-red-400 hover:bg-red-500/22 transition-all disabled:opacity-50">
          {il
            ? <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            : "✕ Remove Admin Role"
          }
        </button>
      </div>
    );
  };

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <div className="min-h-screen text-slate-200"
      style={{ background: "#060c18", fontFamily: "'Inter',-apple-system,sans-serif" }}>

      <style>{`
        @keyframes slideDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pop       { from{opacity:0;transform:scale(.94)}        to{opacity:1;transform:scale(1)} }
        @keyframes fadeUp    { from{opacity:0;transform:translateY(8px)}   to{opacity:1;transform:translateY(0)} }
        @keyframes spin      { to{transform:rotate(360deg)} }
      `}</style>

      <Toast toast={toast} />
      <ConfirmModal
        data={confirm}
        onClose={() => { setConfirm(null); setWhatsapp(""); }}
        onConfirm={doToggle}
        loading={!!actionLoading}
      />

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-7">

        {/* ── PAGE TITLE ── */}
        <div className="mb-7">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-2">
            <span>Dashboard</span>
            <span className="opacity-40">›</span>
            <span>Users</span>
            <span className="opacity-40">›</span>
            <span className="text-slate-500">App Admin</span>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg"
                  style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)" }}>
                  🛡
                </span>
                App Admin Manager
              </h1>
              <p className="text-sm text-slate-500 mt-1.5 font-mono">
                {stats.total.toLocaleString()} total users &nbsp;·&nbsp; {stats.admins} app admins
              </p>
            </div>
            <RefreshBtn loading={loading || adminsLoading} onClick={doRefresh} />
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <StatCard icon="👥" label="Total Users"    value={stats.total}  color="#6366f1" />
          <StatCard icon="🛡" label="App Admins"     value={stats.admins} color="#f59e0b"
            onClick={() => setTab("admins")} active={tab === "admins"}
            tip="Click to manage admins" />
          <StatCard icon="📄" label="This Page"      value={users.length} color="#10b981" />
          <StatCard icon="🔍" label="Search Results" value={totalCount}   color="#06b6d4" />
        </div>

        {/* ── TABS ── */}
        <Tabs active={tab} onChange={setTab} items={[
          { key: "all",    label: "All Users",  icon: "👥", badge: null },
          { key: "admins", label: "App Admins", icon: "🛡", badge: stats.admins },
        ]} />

        {/* ══════════ TAB: ALL USERS ══════════ */}
        {tab === "all" && (
          <div>
            {/* toolbar */}
            <div className="flex items-center gap-3 flex-wrap mb-5">
              <SearchBar
                value={searchInput}
                onChange={setSearchInput}
                onClear={() => { setSearch(""); setPage(0); }}
                placeholder="Search by name, username or UID…"
              />
              <ViewToggle mode={viewMode} onChange={setViewMode} color="#6366f1" />
              {!loading && (
                <span className="text-xs text-slate-500 font-mono px-3 py-2 rounded-xl shrink-0"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {totalCount.toLocaleString()} results
                </span>
              )}
            </div>

            {/* content */}
            {loading ? (
              <Spinner color="#6366f1" />
            ) : users.length === 0 ? (
              <Empty icon="◎" msg="No users found"
                action={{ label: "Clear search", onClick: () => { setSearchInput(""); setSearch(""); setPage(0); } }} />
            ) : viewMode === "card" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
                {users.map((u, i) => <UserCard key={u.objectId} user={u} i={i} />)}
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden mb-2"
                style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                {/* table header */}
                <div className="grid px-4 py-2.5 text-[9px] font-bold text-slate-600 uppercase tracking-widest"
                  style={{ gridTemplateColumns: "40px 1fr 100px 80px 120px 160px", gap: "10px",
                    background: "rgba(0,0,0,0.2)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["", "Name / Username", "UID", "Joined", "Status", "Action"].map(h => <span key={h}>{h}</span>)}
                </div>
                {users.map((u, i) => <UserRow key={u.objectId} user={u} i={i} />)}
              </div>
            )}

            <Pager page={page} total={totalPages}
              onChange={n => { setPage(n); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
          </div>
        )}

        {/* ══════════ TAB: APP ADMINS ══════════ */}
        {tab === "admins" && (
          <div>
            {/* toolbar */}
            <div className="flex items-center gap-3 flex-wrap mb-5">
              <SearchBar
                value={adminSearch}
                onChange={v => { setAdminSearch(v); setAdminPage(0); }}
                placeholder="Search admins by name, username, UID or email…"
                accentColor="#f59e0b"
              />
              <ViewToggle mode={adminView} onChange={setAdminView} color="#f59e0b" />
              <span className="text-xs font-bold px-3 py-2 rounded-xl shrink-0"
                style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24" }}>
                🛡 {filtAdmins.length} admin{filtAdmins.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* content */}
            {adminsLoading ? (
              <Spinner color="#f59e0b" />
            ) : filtAdmins.length === 0 ? (
              <Empty icon="🛡" msg={adminSearch ? `No admins match "${adminSearch}"` : "No app admins yet"}
                action={!adminSearch ? { label: "👥 Go assign from All Users", onClick: () => setTab("all") } : undefined} />
            ) : adminView === "card" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
                {admPaged.map((a, i) => <AdminCard key={a.objectId} admin={a} i={i} />)}
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden mb-2"
                style={{ border: "1px solid rgba(245,158,11,0.18)" }}>
                {/* table header — mirrors just_admin.php columns */}
                <div className="grid px-4 py-2.5 text-[9px] font-bold text-slate-600 uppercase tracking-widest"
                  style={{ gridTemplateColumns: "38px 1fr 95px 95px 125px 100px 120px", gap: "10px",
                    background: "rgba(0,0,0,0.22)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["", "Name / Username", "UID", "Object ID", "Joined", "WhatsApp", "Action"].map(h => <span key={h}>{h}</span>)}
                </div>
                {admPaged.map((a, i) => <AdminRow key={a.objectId} admin={a} i={i} />)}
              </div>
            )}

            <Pager page={adminPage} total={admTotalPages} onChange={setAdminPage} />

            {/* tip */}
            {!adminsLoading && filtAdmins.length > 0 && (
              <div className="mt-5 p-4 rounded-2xl flex items-center gap-3 text-sm text-slate-400"
                style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
                <span className="text-xl shrink-0">💡</span>
                <span>
                  To add more admins, switch to the{" "}
                  <button onClick={() => setTab("all")} className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors underline underline-offset-2">
                    All Users
                  </button>{" "}
                  tab and click <strong className="text-indigo-400">Make App Admin</strong> on any user.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}