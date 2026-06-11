import React, { useState, useEffect, useRef, useCallback } from "react";
import Parse from "../../parseConfig";

// ─────────────────────────────────────────────────────────────
//  SIDEBAR PERMISSION KEYS (only these will appear)
// ─────────────────────────────────────────────────────────────
const SIDEBAR_PERMISSION_KEYS = [
  "dashboard",
  "panels",
  "manager",
  "reseller",
  "users",
  "app_admin",
  "host_agency",
  "daily_bonus",
  "live_bonus",
  "live_streams",
  "splash_banner",
  "banner_image",
  "messages",
  "posts",
  "comments",
  "stories",
  "official_announce",
  "gifts",
  "vip",
  "avatar_frame",
  "party_theme",
  "entrance_effect",
  "salary_reports",
  "top_streams",
  "gift_coins_history",
  "game_history",
  "app_settings",
  "report",
  "login_history",
  "users_device_ban",
];

// ─────────────────────────────────────────────────────────────
//  PERMISSION GROUPS
// ─────────────────────────────────────────────────────────────
const ALL_SIDEBAR_GROUPS = [
  {
    group: "Core Access", icon: "⬡",
    items: [
      { key: "dashboard", label: "Dashboard" },
      { key: "panels", label: "Panels" },
      { key: "manager",   label: "Manager Panel" },
      { key: "app_admin", label: "App Admin" },
    ],
  },
  {
    group: "Reseller", icon: "◈",
    items: [
      { key: "reseller", label: "Reseller Panel" },
    ],
  },
  {
    group: "Users & Devices", icon: "◎",
    items: [
      { key: "users", label: "All Users" },
      { key: "users_device_ban", label: "Device Ban" },
    ],
  },
  {
    group: "Host / Agency", icon: "◉",
    items: [{ key: "host_agency", label: "Host & Agency" }],
  },
  {
    group: "Content", icon: "▣",
    items: [
      { key: "daily_bonus",      label: "Daily Bonus" },
      { key: "live_bonus",       label: "Live Bonus" },
      { key: "live_streams",     label: "Live Streams" },
      { key: "splash_banner",    label: "Splash Banner" },
      { key: "banner_image",     label: "Banner Image" },
      { key: "messages",         label: "Messages" },
      { key: "posts",            label: "Posts" },
      { key: "comments",         label: "Comments" },
      { key: "stories",          label: "Stories" },
      { key: "official_announce",label: "Official Announcements" },
    ],
  },
  {
    group: "Gifts & VIP", icon: "◇",
    items: [
      { key: "gifts", label: "All Gifts" },
      { key: "vip", label: "VIP Assets" },
    ],
  },
  {
    group: "Customization", icon: "◆",
    items: [
      { key: "avatar_frame", label: "Avatar Frames" },
      { key: "party_theme", label: "Party Themes" },
      { key: "entrance_effect", label: "Entrance Effects" },
    ],
  },
  {
    group: "Reports & History", icon: "▤",
    items: [
      { key: "salary_reports",     label: "Salary Reports" },
      { key: "top_streams",        label: "Top Streams" },
      { key: "gift_coins_history", label: "Gift & Coin History" },
      { key: "game_history",       label: "Game History" },
      { key: "report",             label: "Reports" },
      { key: "login_history",      label: "Login History" },
    ],
  },
  {
    group: "Settings", icon: "◳",
    items: [
      { key: "app_settings", label: "App Settings" },
    ],
  },
];

// Filter groups to only those items whose key is in SIDEBAR_PERMISSION_KEYS
const PERMISSION_GROUPS = ALL_SIDEBAR_GROUPS
  .map(group => ({
    ...group,
    items: group.items.filter(item => SIDEBAR_PERMISSION_KEYS.includes(item.key)),
  }))
  .filter(group => group.items.length > 0);

const ALL_KEYS = PERMISSION_GROUPS.flatMap(g => g.items.map(i => i.key));

// ── helpers ──
function getAvatarColor(str) {
  const palette = ["#6366f1","#f472b6","#34d399","#fbbf24","#f87171","#60a5fa","#a78bfa","#22d3ee"];
  let hash = 0;
  for (let i = 0; i < (str||"").length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function getInitial(name) { return (name||"?").charAt(0).toUpperCase(); }

// ── indeterminate checkbox ──
function IndeterminateCheckbox({ checked, indeterminate, onChange, className }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <input ref={ref} type="checkbox" checked={checked}
      onChange={onChange} onClick={e => e.stopPropagation()} className={className} />
  );
}

// ── toast ──
function Toast({ toast }) {
  if (!toast) return null;
  const colors = { 
    success: "bg-emerald-500/90 border-emerald-400", 
    error: "bg-red-500/90 border-red-400", 
    info: "bg-blue-500/90 border-blue-400" 
  };
  const icons = { success: "✓", error: "✕", info: "i" };
  return (
    <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md text-white text-sm font-medium shadow-2xl animate-fade-in ${colors[toast.type]}`}>
      <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">{icons[toast.type]}</span>
      {toast.msg}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function ManagerPermissions() {
  const [managers,    setManagers]    = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [panelObj,    setPanelObj]    = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [search,      setSearch]      = useState("");
  const [permSearch,  setPermSearch]  = useState("");
  const [toast,       setToast]       = useState(null);
  const [collapsed,   setCollapsed]   = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab,   setActiveTab]   = useState("permissions");
  const [credPassword, setCredPassword] = useState("");
  const [credUrl,      setCredUrl]      = useState("");
  const [showPass,     setShowPass]     = useState(false);
  const [savingCreds,  setSavingCreds]  = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  /* load all managers from _User */
  const loadManagers = useCallback(async () => {
    setLoading(true);
    try {
      const User = Parse.Object.extend("_User");
      const q = new Parse.Query(User);
      q.equalTo("role", "manager");
      q.descending("createdAt");
      q.limit(200);
      q.select("name", "username", "avatar", "uid", "email");
      const results = await q.find();
      setManagers(results.map(u => {
        const av = u.get("avatar");
        let avatarUrl = null;
        if (av && typeof av.url === "function") avatarUrl = av.url();
        else if (typeof av === "string") avatarUrl = av;
        return {
          objectId: u.id,
          name:     u.get("name") || u.get("username") || "—",
          username: u.get("username") || "anonymous",
          uid:      String(u.get("uid") || u.id),
          avatar:   avatarUrl,
          email:    u.get("email") || "",
        };
      }));
    } catch (err) {
      showToast("Failed to load managers: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadManagers(); }, [loadManagers]);

  /* select manager → load or create panels row */
  const selectManager = async (mgr) => {
    setSelected(mgr);
    setPanelObj(null);
    setPermissions([]);
    setCredPassword("");
    setCredUrl("");
    setSidebarOpen(false);
    setActiveTab("permissions");
    setRefreshing(true);
    try {
      const Panels = Parse.Object.extend("panels");
      const q = new Parse.Query(Panels);
      q.equalTo("username", mgr.username);
      q.equalTo("role", "manager");
      let panel = await q.first();
      
      if (!panel) {
        // Create new panel entry
        panel = new Panels();
        panel.set("role", "manager");
        panel.set("username", mgr.username);
        panel.set("permissions", []);
        panel.set("panel_url", "");
        panel.set("password", "");
        
        // Set ACL
        const acl = new Parse.ACL();
        acl.setPublicReadAccess(true);
        acl.setPublicWriteAccess(true);
        panel.setACL(acl);
        
        await panel.save();
        showToast("Created new panel entry for " + mgr.username, "info");
      } else {
        // Update username if changed
        if (panel.get("username") !== mgr.username) {
          panel.set("username", mgr.username);
          await panel.save();
        }
      }
      
      setPanelObj(panel);
      setPermissions(panel.get("permissions") || []);
      setCredPassword(panel.get("password") || "");
      setCredUrl(panel.get("panel_url") || "");
    } catch (err) {
      showToast("Failed to load panel config: " + err.message, "error");
    } finally {
      setRefreshing(false);
    }
  };

  const togglePerm = (key) =>
    setPermissions(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const toggleGroup = (keys) => {
    const allOn = keys.every(k => permissions.includes(k));
    setPermissions(prev =>
      allOn ? prev.filter(k => !keys.includes(k)) : [...new Set([...prev, ...keys])]
    );
  };

  const handleSavePermissions = async () => {
    if (!panelObj) return;
    setSaving(true);
    try {
      panelObj.set("permissions", permissions);
      await panelObj.save();
      showToast(`✅ Permissions saved for @${selected.username}`, "success");
      
      // Refresh the managers list to update badges
      await loadManagers();
      
      // Refresh panel data
      const Panels = Parse.Object.extend("panels");
      const q = new Parse.Query(Panels);
      q.equalTo("username", selected.username);
      q.equalTo("role", "manager");
      const refreshed = await q.first();
      if (refreshed) {
        setPanelObj(refreshed);
        setPermissions(refreshed.get("permissions") || []);
      }
    } catch (err) {
      showToast("❌ Save failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!panelObj) return;
    if (!credPassword.trim()) return showToast("Password is required", "error");
    setSavingCreds(true);
    try {
      panelObj.set("password",  credPassword);
      panelObj.set("panel_url", credUrl.trim());
      await panelObj.save();
      showToast("🔑 Credentials saved! Manager can now log in.", "success");
      
      // Refresh panel data
      const Panels = Parse.Object.extend("panels");
      const q = new Parse.Query(Panels);
      q.equalTo("username", selected.username);
      q.equalTo("role", "manager");
      const refreshed = await q.first();
      if (refreshed) {
        setPanelObj(refreshed);
        setCredPassword(refreshed.get("password") || "");
        setCredUrl(refreshed.get("panel_url") || "");
      }
    } catch (err) {
      showToast("❌ Save failed: " + err.message, "error");
    } finally {
      setSavingCreds(false);
    }
  };

  /* filtered groups (search) */
  const filteredGroups = permSearch.trim()
    ? PERMISSION_GROUPS.map(g => ({
        ...g,
        items: g.items.filter(i =>
          i.label.toLowerCase().includes(permSearch.toLowerCase()) ||
          i.key.toLowerCase().includes(permSearch.toLowerCase())
        ),
      })).filter(g => g.items.length > 0)
    : PERMISSION_GROUPS;

  const filteredManagers = managers.filter(m =>
    m.username.toLowerCase().includes(search.toLowerCase()) ||
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const pct = ALL_KEYS.length > 0 ? Math.round((permissions.length / ALL_KEYS.length) * 100) : 0;
  const toggleCollapse = (group) => setCollapsed(prev => ({ ...prev, [group]: !prev[group] }));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        .perm-root { font-family: 'DM Sans', sans-serif; }
        .perm-root h1, .perm-root h2, .perm-root h3, .perm-mgr-name { font-family: 'Syne', sans-serif; }
        @keyframes fade-in { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(99,102,241,0.4);} 70%{box-shadow:0 0 0 8px rgba(99,102,241,0);} 100%{box-shadow:0 0 0 0 rgba(99,102,241,0);} }
        .animate-fade-in { animation: fade-in 0.25s ease; }
        .pulse-ring { animation: pulse-ring 2s infinite; }
        .perm-check { appearance:none; -webkit-appearance:none; width:16px; height:16px; border-radius:4px; border:1.5px solid #4b5563; background:transparent; cursor:pointer; position:relative; transition:all 0.15s; flex-shrink:0; }
        .perm-check:checked { background:#6366f1; border-color:#6366f1; }
        .perm-check:checked::after { content:''; position:absolute; left:4px; top:1.5px; width:5px; height:8px; border:2px solid white; border-top:none; border-left:none; transform:rotate(45deg); }
        .perm-check:indeterminate { background:rgba(99,102,241,0.25); border-color:#6366f1; }
        .perm-check:indeterminate::after { content:''; position:absolute; left:3px; top:6px; width:8px; height:2px; background:#6366f1; border-radius:1px; }
        .perm-check:hover { border-color:#6366f1; }
        .perm-scroll::-webkit-scrollbar { width:4px; }
        .perm-scroll::-webkit-scrollbar-track { background:transparent; }
        .perm-scroll::-webkit-scrollbar-thumb { background:#374151; border-radius:2px; }
        @keyframes shimmer { 0%{background-position:-200% center;} 100%{background-position:200% center;} }
        .progress-shimmer { background:linear-gradient(90deg,#6366f1 0%,#818cf8 40%,#a5b4fc 50%,#818cf8 60%,#6366f1 100%); background-size:200% auto; animation:shimmer 2.5s linear infinite; }
      `}</style>

      <Toast toast={toast} />

      <div className="perm-root min-h-screen bg-[#0a0a0f] text-gray-100">

        {/* PAGE HEADER */}
        <div className="px-4 sm:px-6 pt-6 pb-4 border-b border-white/5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-medium text-indigo-400 tracking-widest uppercase mb-1">Admin Panel</p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Manager Permissions</h1>
              <p className="text-sm text-gray-400 mt-1">{managers.length} manager{managers.length !== 1 ? "s" : ""} · assign sidebar access</p>
            </div>
            <button className="sm:hidden flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300" onClick={() => setSidebarOpen(true)}>
              <span>☰</span> Managers
            </button>
          </div>
        </div>

        <div className="flex h-[calc(100vh-130px)]">

          {/* MOBILE BACKDROP */}
          {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden" onClick={() => setSidebarOpen(false)} />}
          
          {/* SIDEBAR – manager list */}
          <aside className={`fixed sm:relative z-50 sm:z-auto top-0 left-0 h-full w-72 sm:w-64 lg:w-72 bg-[#0d0d15] border-r border-white/5 flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"} perm-scroll overflow-y-auto`}>
            <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0d0d15] z-10">
              <span className="text-xs font-semibold text-gray-400 tracking-widest uppercase">Managers</span>
              <button className="sm:hidden text-gray-500 hover:text-gray-300 text-lg" onClick={() => setSidebarOpen(false)}>✕</button>
            </div>
            <div className="px-3 py-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">⌕</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search managers…"
                  className="w-full bg-white/5 border border-white/8 rounded-lg pl-8 pr-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-indigo-500/50 transition-all" />
              </div>
            </div>
            <div className="flex-1 px-2 py-1 space-y-0.5">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/3 animate-pulse mx-1 mb-1" />)
              ) : filteredManagers.length === 0 ? (
                <div className="text-center py-12 text-gray-600 text-sm">No managers found</div>
              ) : filteredManagers.map((mgr) => {
                const isActive = selected?.objectId === mgr.objectId;
                const color = getAvatarColor(mgr.username);
                return (
                  <button key={mgr.objectId} onClick={() => selectManager(mgr)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 relative ${isActive ? "bg-indigo-500/15 border border-indigo-500/30" : "hover:bg-white/5 border border-transparent"}`}>
                    <div className="relative shrink-0">
                      {mgr.avatar
                        ? <img src={mgr.avatar} alt={mgr.username} className="w-9 h-9 rounded-full object-cover" />
                        : <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: color }}>{getInitial(mgr.name)}</div>
                      }
                      {isActive && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-indigo-500 rounded-full border-2 border-[#0d0d15]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold truncate perm-mgr-name ${isActive ? "text-indigo-300" : "text-gray-200"}`}>{mgr.name}</p>
                      <p className="text-xs text-gray-500 truncate">@{mgr.username}</p>
                    </div>
                    <PermBadge username={mgr.username} />
                  </button>
                );
              })}
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <main className="flex-1 min-w-0 flex flex-col perm-scroll overflow-y-auto">
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
                <div className="w-20 h-20 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center text-4xl">⬡</div>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-300 mb-1">Select a Manager</h2>
                  <p className="text-sm text-gray-600 max-w-xs">Choose a manager from the sidebar to edit their sidebar permissions and login credentials.</p>
                </div>
                <button className="sm:hidden flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium" onClick={() => setSidebarOpen(true)}>Open manager list</button>
              </div>
            ) : refreshing ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-400 text-sm">Loading permissions...</p>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-6 flex flex-col gap-5 animate-fade-in">

                {/* Manager header card */}
                <div className="rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="relative shrink-0">
                      {selected.avatar
                        ? <img src={selected.avatar} alt={selected.username} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/40" />
                        : <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white ring-2 ring-indigo-500/40" style={{ background: getAvatarColor(selected.username) }}>{getInitial(selected.name)}</div>
                      }
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-xs pulse-ring">⬡</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight">{selected.name}</h2>
                      <p className="text-sm text-gray-400">@{selected.username}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">⬡ Manager</span>
                        {panelObj && <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 text-gray-400 border border-white/10">ID: {panelObj.id}</span>}
                        {panelObj?.get("password")
                          ? <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">🔑 Login set</span>
                          : <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25">⚠ No password</span>
                        }
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-5 sm:shrink-0">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-indigo-400">{permissions.length}</p>
                      <p className="text-xs text-gray-500">enabled</p>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-400">{ALL_KEYS.length - permissions.length}</p>
                      <p className="text-xs text-gray-500">blocked</p>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-400">{pct}%</p>
                      <p className="text-xs text-gray-500">access</p>
                    </div>
                  </div>
                </div>

                {/* Tab switcher */}
                <div className="flex gap-1 p-1 bg-white/4 border border-white/8 rounded-xl w-fit">
                  <button
                    onClick={() => setActiveTab("permissions")}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "permissions" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-gray-400 hover:text-gray-200"}`}
                  >
                    🔒 Sidebar Permissions
                  </button>
                  <button
                    onClick={() => setActiveTab("credentials")}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "credentials" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-gray-400 hover:text-gray-200"}`}
                  >
                    🔑 Login Credentials
                  </button>
                </div>

                {/* PERMISSIONS TAB */}
                {activeTab === "permissions" && (
                  <>
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span>{permissions.length} of {ALL_KEYS.length} sidebar permissions</span>
                        <span>{pct}% access level</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full progress-shimmer transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">⌕</span>
                        <input value={permSearch} onChange={e => setPermSearch(e.target.value)} placeholder="Search sidebar permissions…"
                          className="w-full bg-white/5 border border-white/8 rounded-xl pl-8 pr-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-indigo-500/50 transition-all" />
                        {permSearch && <button onClick={() => setPermSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs">✕</button>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => setPermissions([...ALL_KEYS])} className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-sm text-gray-300 transition-all">Select All</button>
                        <button onClick={() => setPermissions([])} className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-sm text-gray-300 transition-all">Clear All</button>
                        <button onClick={handleSavePermissions} disabled={saving || !panelObj}
                          className={`px-5 py-2 rounded-xl font-semibold text-sm transition-all ${saving ? "bg-indigo-600/50 text-indigo-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 active:scale-95"}`}>
                          {saving ? "Saving…" : "💾 Save"}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 pb-10">
                      {filteredGroups.map((group) => {
                        const keys = group.items.map(i => i.key);
                        const enabledCount = keys.filter(k => permissions.includes(k)).length;
                        const allOn = enabledCount === keys.length;
                        const someOn = enabledCount > 0 && !allOn;
                        const isOpen = !collapsed[group.group];
                        return (
                          <div key={group.group} className="rounded-2xl border border-white/6 bg-white/[0.02] overflow-hidden">
                            <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-white/3 transition-all select-none" onClick={() => toggleCollapse(group.group)}>
                              <IndeterminateCheckbox checked={allOn} indeterminate={someOn} onChange={() => toggleGroup(keys)} className="perm-check" />
                              <span className="text-lg shrink-0">{group.icon}</span>
                              <span className="flex-1 text-sm font-semibold text-gray-200">{group.group}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${enabledCount === keys.length ? "bg-emerald-500/15 text-emerald-400" : enabledCount > 0 ? "bg-indigo-500/15 text-indigo-400" : "bg-white/5 text-gray-500"}`}>
                                {enabledCount}/{keys.length}
                              </span>
                              <span className={`text-gray-600 text-xs transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>▼</span>
                            </div>
                            {isOpen && (
                              <div className="px-4 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 border-t border-white/5 animate-fade-in">
                                {group.items.map(item => {
                                  const on = permissions.includes(item.key);
                                  return (
                                    <label key={item.key} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer border transition-all duration-150 ${on ? "bg-indigo-500/10 border-indigo-500/25 hover:bg-indigo-500/15" : "bg-transparent border-transparent hover:bg-white/4 hover:border-white/8"}`}>
                                      <input type="checkbox" checked={on} onChange={() => togglePerm(item.key)} className="perm-check" />
                                      <span className={`text-sm flex-1 ${on ? "text-gray-100" : "text-gray-400"}`}>{item.label}</span>
                                      {on && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />}
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {filteredGroups.length === 0 && <div className="text-center py-12 text-gray-600 text-sm">No permissions match "{permSearch}"</div>}
                    </div>
                  </>
                )}

                {/* CREDENTIALS TAB */}
                {activeTab === "credentials" && (
                  <div className="max-w-lg space-y-4 pb-10 animate-fade-in">
                    <div className="p-4 rounded-2xl bg-indigo-500/8 border border-indigo-500/20 text-sm text-indigo-300">
                      <p className="font-semibold mb-1">🔑 Manager Login Credentials</p>
                      <p className="text-indigo-400/70 text-xs">These credentials are used by the manager to log into the manager panel.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Username</label>
                      <input type="text" value={selected.username} disabled
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-100 cursor-not-allowed opacity-70" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
                      <div className="relative">
                        <input type={showPass ? "text" : "password"} value={credPassword} onChange={e => setCredPassword(e.target.value)}
                          placeholder="Enter manager password"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-gray-100 focus:border-indigo-500/50 focus:bg-white/8 transition-all" />
                        <button type="button" onClick={() => setShowPass(!showPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs">
                          {showPass ? "🙈" : "👁"}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Panel URL <span className="normal-case text-gray-600 font-normal">(optional)</span></label>
                      <input type="text" value={credUrl} onChange={e => setCredUrl(e.target.value)}
                        placeholder="https://manager.yourapp.com"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-100 focus:border-indigo-500/50 transition-all" />
                    </div>
                    <button onClick={handleSaveCredentials} disabled={savingCreds || !panelObj}
                      className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${savingCreds ? "bg-indigo-600/50 text-indigo-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 active:scale-[0.98]"}`}>
                      {savingCreds ? "Saving…" : "💾 Save Credentials"}
                    </button>
                  </div>
                )}

              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

/* PermBadge – shows permission count */
function PermBadge({ username }) {
  const [count, setCount] = useState(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const Panels = Parse.Object.extend("panels");
        const q = new Parse.Query(Panels);
        q.equalTo("username", username);
        q.equalTo("role", "manager");
        const panel = await q.first();
        if (mounted) setCount(panel ? (panel.get("permissions") || []).length : 0);
      } catch { if (mounted) setCount(0); }
    })();
    return () => { mounted = false; };
  }, [username]);
  if (count === null) return <span className="w-6 h-4 rounded bg-white/5 animate-pulse shrink-0" />;
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium shrink-0 ${count > 0 ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-gray-600"}`}>
      {count}
    </span>
  );
}