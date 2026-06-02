import React, { useEffect, useState, useCallback, useMemo } from "react";
import Parse from "../../parseConfig";
import "./BannedDevice.css";

/* ═══════════════════════════════════════════════════════════
   BannedDevice.jsx
   Parse class: BannedDevices
   Fields: device_id (String), auther_id (String = _User objectId),
           status (Boolean — true = banned, false = unbanned)

   Features:
   • Shows all users with ban status
   • Ban / Unban any user's device
   • Add new ban by device_id or user search
   • Search by name, username, device_id
   • Filter: All / Banned / Unbanned
   • Pagination
═══════════════════════════════════════════════════════════ */

const PAGE_SIZE = 20;

/* ── helpers ── */
function ini(name = "") {
  return name.trim().split(/\s+/).map(w => w[0] || "").join("").toUpperCase().slice(0, 2) || "?";
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
}
function fmtTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });
}
const COLORS = ["#f87171","#fb923c","#fbbf24","#34d399","#60a5fa","#a78bfa","#f472b6","#22d3ee"];
function avatarColor(str = "") {
  let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}
function copyText(text, showToast) {
  navigator.clipboard?.writeText(text)
    .then(() => showToast("Copied!", "copy"))
    .catch(() => showToast("Copy failed", "error"));
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTS
═══════════════════════════════════════════════════════════ */

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`bd-toast bd-toast--${toast.type}`}>
      <span className="bd-toast-dot" />
      {toast.msg}
    </div>
  );
}

/* ── Confirm Modal ── */
function ConfirmModal({ data, onClose, onConfirm, loading }) {
  if (!data) return null;
  const { user, action } = data; // action: "ban" | "unban" | "delete"
  const isBan    = action === "ban";
  const isDelete = action === "delete";
  return (
    <div className="bd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bd-modal">
        <div className={`bd-modal-icon bd-modal-icon--${isDelete ? "red" : isBan ? "red" : "green"}`}>
          {isDelete ? "🗑" : isBan ? "🚫" : "✓"}
        </div>
        <h3 className="bd-modal-title">
          {isDelete ? "Remove Ban Record" : isBan ? "Ban Device" : "Unban Device"}
        </h3>
        <p className="bd-modal-desc">
          {isDelete
            ? <>Permanently delete the ban record for <strong>{user?.username || user?.objectId}</strong>?</>
            : isBan
              ? <>Ban <strong>{user?.name || user?.username}</strong>'s device?<br /><small>They won't be able to open the app.</small></>
              : <>Unban <strong>{user?.name || user?.username}</strong>'s device?<br /><small>They'll regain access to the app.</small></>
          }
        </p>
        {user?.device_id && (
          <div className="bd-modal-device">
            <span className="bd-modal-device-label">Device ID</span>
            <code className="bd-modal-device-id">{user.device_id}</code>
          </div>
        )}
        <div className="bd-modal-btns">
          <button className="bd-btn bd-btn--ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button
            className={`bd-btn ${isDelete || isBan ? "bd-btn--red" : "bd-btn--green"}`}
            onClick={onConfirm} disabled={loading}>
            {loading ? <span className="bd-spin" /> : isDelete ? "Delete" : isBan ? "Ban Device" : "Unban Device"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Add Ban Modal ── */
function AddBanModal({ onClose, onAdd, loading, showToast }) {
  const [mode,     setMode]     = useState("search"); // "search" | "manual"
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState([]);
  const [searching,setSearching]= useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [userId,   setUserId]   = useState("");

  const searchUsers = async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const User = Parse.Object.extend("_User");
      const byName = new Parse.Query(User); byName.contains("name", q);
      const byUser = new Parse.Query(User); byUser.contains("username", q);
      const n = parseInt(q); const queries = [byName, byUser];
      if (!isNaN(n)) { const byUid = new Parse.Query(User); byUid.equalTo("uid", n); queries.push(byUid); }
      const combined = Parse.Query.or(...queries);
      combined.limit(8); combined.select("uid","name","username","avatar");
      const res = await combined.find({ useMasterKey: true });
      setResults(res.map(u => {
        const av = u.get("avatar");
        let avatarUrl = null;
        if (av && typeof av.url === "function") avatarUrl = av.url();
        else if (typeof av === "string") avatarUrl = av;
        return { objectId: u.id, name: u.get("name")||"—", username: u.get("username")||"—", uid: u.get("uid"), avatar: avatarUrl };
      }));
    } catch (e) { showToast("Search error: " + e.message, "error"); }
    finally { setSearching(false); }
  };

  useEffect(() => {
    const t = setTimeout(() => searchUsers(query), 380);
    return () => clearTimeout(t);
  }, [query]);

  const handleManualAdd = () => {
    if (!deviceId.trim()) { showToast("Enter a device ID", "error"); return; }
    onAdd({ device_id: deviceId.trim(), auther_id: userId.trim() || "manual" });
  };

  return (
    <div className="bd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bd-modal bd-modal--wide">
        <div className="bd-modal-header">
          <h3 className="bd-modal-title">🚫 Add Ban</h3>
          <button className="bd-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Mode toggle */}
        <div className="bd-add-tabs">
          <button className={`bd-add-tab ${mode==="search"?"on":""}`} onClick={() => setMode("search")}>
            🔍 Search User
          </button>
          <button className={`bd-add-tab ${mode==="manual"?"on":""}`} onClick={() => setMode("manual")}>
            ✏ Manual Entry
          </button>
        </div>

        {mode === "search" ? (
          <div className="bd-add-search">
            <input
              className="bd-add-input"
              placeholder="Search by name, username or UID…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            <div className="bd-search-results">
              {searching && <div className="bd-search-loading"><span className="bd-spin" /> Searching…</div>}
              {!searching && query && results.length === 0 && (
                <div className="bd-search-empty">No users found</div>
              )}
              {results.map(u => (
                <div key={u.objectId} className="bd-search-result"
                  onClick={() => onAdd({ auther_id: u.objectId, user: u })}>
                  <div className="bd-search-av"
                    style={{ background: u.avatar ? "transparent" : avatarColor(u.username) }}>
                    {u.avatar
                      ? <img src={u.avatar} alt={u.name} className="bd-search-av-img" />
                      : ini(u.name)
                    }
                  </div>
                  <div className="bd-search-info">
                    <span className="bd-search-name">{u.name}</span>
                    <span className="bd-search-user">@{u.username} · uid {u.uid}</span>
                  </div>
                  <span className="bd-search-ban-btn">Ban</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bd-add-manual">
            <div className="bd-add-field">
              <label className="bd-add-label">Device ID <span className="bd-required">*</span></label>
              <input className="bd-add-input bd-add-input--mono"
                placeholder="e.g. be32f53c5b9285ac"
                value={deviceId} onChange={e => setDeviceId(e.target.value)} autoFocus />
            </div>
            <div className="bd-add-field">
              <label className="bd-add-label">User Object ID <span className="bd-optional">(optional)</span></label>
              <input className="bd-add-input bd-add-input--mono"
                placeholder="e.g. 2GTkTkomLe"
                value={userId} onChange={e => setUserId(e.target.value)} />
            </div>
            <button className="bd-btn bd-btn--red bd-btn--full"
              onClick={handleManualAdd} disabled={loading}>
              {loading ? <><span className="bd-spin" /> Adding…</> : "🚫 Add Ban"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function BannedDevice() {

  /* data */
  const [bans,         setBans]         = useState([]); // BannedDevices records
  const [userMap,      setUserMap]      = useState({}); // { autherId: userObj }
  const [loading,      setLoading]      = useState(true);
  const [actionLoading,setActionLoading]= useState(null);

  /* UI */
  const [filter,       setFilter]       = useState("all"); // all | banned | unbanned
  const [search,       setSearch]       = useState("");
  const [searchInput,  setSearchInput]  = useState("");
  const [page,         setPage]         = useState(0);
  const [toast,        setToast]        = useState(null);
  const [confirmData,  setConfirmData]  = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* debounce search */
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* ════════════════════════════════════════════════════════
     FETCH — load all BannedDevices then resolve user data
  ════════════════════════════════════════════════════════ */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      /* 1. Fetch all ban records */
      const q = new Parse.Query("BannedDevices");
      q.descending("createdAt");
      q.limit(2000);
      const banRecords = await q.find({ useMasterKey: true });
      setBans(banRecords);

      /* 2. Collect unique auther_ids and fetch _User data */
      const ids = [...new Set(banRecords.map(b => b.get("auther_id")).filter(Boolean))];
      if (ids.length > 0) {
        const User = Parse.Object.extend("_User");
        const uq = new Parse.Query(User);
        uq.containedIn("objectId", ids);
        uq.limit(ids.length);
        uq.select("uid","name","username","avatar","coins");
        const users = await uq.find({ useMasterKey: true });

        const map = {};
        users.forEach(u => {
          const av = u.get("avatar");
          let avatarUrl = null;
          if (av && typeof av.url === "function") avatarUrl = av.url();
          else if (typeof av === "string") avatarUrl = av;
          map[u.id] = {
            objectId: u.id,
            uid:      u.get("uid") || "—",
            name:     u.get("name") || "—",
            username: u.get("username") || "—",
            coins:    u.get("coins") || 0,
            avatar:   avatarUrl,
          };
        });
        setUserMap(map);
      }
    } catch (err) {
      showToast("Load failed: " + err.message, "error");
    } finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ════════════════════════════════════════════════════════
     FILTER + SEARCH + PAGINATE
  ════════════════════════════════════════════════════════ */
  const filtered = useMemo(() => {
    let list = bans;

    if (filter === "banned")   list = list.filter(b => b.get("status") === true);
    if (filter === "unbanned") list = list.filter(b => b.get("status") !== true);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(b => {
        const u    = userMap[b.get("auther_id")] || {};
        const devId = (b.get("device_id") || "").toLowerCase();
        const name  = (u.name     || "").toLowerCase();
        const uname = (u.username || "").toLowerCase();
        const uid   = String(u.uid || "").toLowerCase();
        const authId= (b.get("auther_id") || "").toLowerCase();
        return devId.includes(q) || name.includes(q) || uname.includes(q) || uid.includes(q) || authId.includes(q);
      });
    }
    return list;
  }, [bans, filter, search, userMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages - 1);
  const pageItems  = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const pageNums = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
    const arr = [0];
    if (safePage > 2) arr.push("…");
    for (let i = Math.max(1,safePage-1); i <= Math.min(totalPages-2,safePage+1); i++) arr.push(i);
    if (safePage < totalPages-3) arr.push("…");
    arr.push(totalPages-1);
    return arr;
  }, [totalPages, safePage]);

  /* ════════════════════════════════════════════════════════
     STATS
  ════════════════════════════════════════════════════════ */
  const stats = useMemo(() => ({
    total:    bans.length,
    banned:   bans.filter(b => b.get("status") === true).length,
    unbanned: bans.filter(b => b.get("status") !== true).length,
  }), [bans]);

  /* ════════════════════════════════════════════════════════
     ACTIONS
  ════════════════════════════════════════════════════════ */

  /* Ban: create record in BannedDevices OR set status=true */
  const executeBan = useCallback(async () => {
    if (!confirmData) return;
    const { user, action, banRecord } = confirmData;
    setActionLoading(user?.objectId || "new");

    try {
      if (action === "ban") {
        if (banRecord) {
          /* existing record — just set status=true */
          banRecord.set("status", true);
          await banRecord.save(null, { useMasterKey: true });
          setBans(prev => prev.map(b => b.id === banRecord.id ? banRecord : b));
        } else {
          /* new ban — create BannedDevices record */
          const BanClass = Parse.Object.extend("BannedDevices");
          const newBan   = new BanClass();
          newBan.set("device_id",  user.device_id || "");
          newBan.set("auther_id",  user.objectId || user.auther_id || "");
          newBan.set("status",     true);
          await newBan.save(null, { useMasterKey: true });
          setBans(prev => [newBan, ...prev]);
        }
        showToast(`Device banned ✓`, "success");

      } else if (action === "unban") {
        banRecord.set("status", false);
        await banRecord.save(null, { useMasterKey: true });
        setBans(prev => prev.map(b => b.id === banRecord.id ? banRecord : b));
        showToast(`Device unbanned ✓`, "success");

      } else if (action === "delete") {
        await banRecord.destroy({ useMasterKey: true });
        setBans(prev => prev.filter(b => b.id !== banRecord.id));
        showToast(`Ban record deleted`, "info");
      }
    } catch (err) {
      showToast("Action failed: " + err.message, "error");
    } finally {
      setActionLoading(null);
      setConfirmData(null);
    }
  }, [confirmData, showToast]);

  /* Handle Add from modal */
  const handleAdd = useCallback(async ({ device_id, auther_id, user }) => {
    setShowAddModal(false);
    setActionLoading("new");
    try {
      const BanClass = Parse.Object.extend("BannedDevices");
      const newBan   = new BanClass();
      newBan.set("device_id", device_id || "");
      newBan.set("auther_id", auther_id || user?.objectId || "");
      newBan.set("status",    true);
      await newBan.save(null, { useMasterKey: true });
      setBans(prev => [newBan, ...prev]);

      /* update userMap if user data provided */
      if (user) {
        setUserMap(prev => ({ ...prev, [user.objectId]: user }));
      }

      showToast("Device banned ✓", "success");
    } catch (err) {
      showToast("Ban failed: " + err.message, "error");
    } finally { setActionLoading(null); }
  }, [showToast]);

  /* ════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════ */
  return (
    <div className="bd-root">
      <Toast toast={toast} />

      <ConfirmModal
        data={confirmData}
        onClose={() => setConfirmData(null)}
        onConfirm={executeBan}
        loading={!!actionLoading}
      />

      {showAddModal && (
        <AddBanModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAdd}
          loading={!!actionLoading}
          showToast={showToast}
        />
      )}

      {/* ── HEADER ── */}
      <div className="bd-header">
        <div className="bd-header-left">
          <div className="bd-header-icon">🚫</div>
          <div>
            <h1 className="bd-title">Banned Devices</h1>
            <p className="bd-subtitle">Manage device bans — blocked devices cannot open the app</p>
          </div>
        </div>
        <div className="bd-header-right">
          <button className="bd-btn bd-btn--ghost" onClick={fetchData} disabled={loading}>
            {loading ? <span className="bd-spin" /> : "↻"} Refresh
          </button>
          <button className="bd-btn bd-btn--red" onClick={() => setShowAddModal(true)}>
            + Add Ban
          </button>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="bd-stats">
        {[
          { label: "Total Records", val: stats.total,    color: "blue",  icon: "📋", key: "all"      },
          { label: "Banned",        val: stats.banned,   color: "red",   icon: "🚫", key: "banned"   },
          { label: "Unbanned",      val: stats.unbanned, color: "green", icon: "✓",  key: "unbanned" },
        ].map((s, i) => (
          <button key={s.key}
            className={`bd-stat ${filter === s.key ? "bd-stat--on" : ""} bd-stat--${s.color}`}
            style={{ animationDelay: `${i * 70}ms` }}
            onClick={() => { setFilter(s.key); setPage(0); }}>
            <span className="bd-stat-icon">{s.icon}</span>
            <span className="bd-stat-val">{s.val}</span>
            <span className="bd-stat-label">{s.label}</span>
          </button>
        ))}
      </div>

      {/* ── TOOLBAR ── */}
      <div className="bd-toolbar">
        <div className="bd-search-wrap">
          <span className="bd-search-ico">⌕</span>
          <input className="bd-search"
            placeholder="Search name, username, UID or device ID…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)} />
          {searchInput && (
            <button className="bd-search-x"
              onClick={() => { setSearchInput(""); setSearch(""); }}>✕</button>
          )}
        </div>
        <span className="bd-result-count">
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── TABLE ── */}
      <div className="bd-card">
        {loading ? (
          <div className="bd-loading">
            <div className="bd-spinner" />
            <p>Loading ban records…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bd-empty">
            <span className="bd-empty-icon">🚫</span>
            <p>{search ? `No results for "${search}"` : filter !== "all" ? `No ${filter} devices` : "No ban records yet"}</p>
            {(search || filter !== "all") && (
              <button className="bd-btn bd-btn--ghost bd-btn--sm"
                onClick={() => { setSearchInput(""); setSearch(""); setFilter("all"); }}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="bd-table-wrap">
              <table className="bd-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>User</th>
                    <th>Device ID</th>
                    <th>User ID</th>
                    <th>Status</th>
                    <th>Banned On</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((ban, idx) => {
                    const authId  = ban.get("auther_id") || "";
                    const devId   = ban.get("device_id")  || "—";
                    const status  = ban.get("status") === true;
                    const user    = userMap[authId] || null;
                    const clr     = avatarColor(user?.username || authId);
                    const isAct   = actionLoading === (user?.objectId || ban.id);

                    return (
                      <tr key={ban.id} className={status ? "bd-row--banned" : ""}>
                        <td><span className="bd-num">{safePage * PAGE_SIZE + idx + 1}</span></td>
                        <td>
                          <div className="bd-user-cell">
                            <div className="bd-av"
                              style={{ background: user?.avatar ? "transparent" : clr }}>
                              {user?.avatar
                                ? <img src={user.avatar} alt={user.name} className="bd-av-img" />
                                : ini(user?.name || authId)
                              }
                              {status && <span className="bd-av-banned">🚫</span>}
                            </div>
                            <div className="bd-user-info">
                              <span className="bd-user-name">{user?.name || <em className="bd-unknown">Unknown User</em>}</span>
                              <span className="bd-user-uname">@{user?.username || "—"} {user?.uid ? `· ${user.uid}` : ""}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="bd-device-id"
                            title="Click to copy"
                            onClick={() => copyText(devId, showToast)}>
                            {devId} <span className="bd-copy-ico">⎘</span>
                          </span>
                        </td>
                        <td>
                          <span className="bd-auth-id"
                            title="Click to copy"
                            onClick={() => copyText(authId, showToast)}>
                            {authId.slice(0, 8)}… <span className="bd-copy-ico">⎘</span>
                          </span>
                        </td>
                        <td>
                          <span className={`bd-status ${status ? "bd-status--banned" : "bd-status--ok"}`}>
                            {status ? "🚫 Banned" : "✓ Active"}
                          </span>
                        </td>
                        <td>
                          <span className="bd-date">{fmtDate(ban.get("createdAt"))}</span>
                          <span className="bd-time">{fmtTime(ban.get("createdAt"))}</span>
                        </td>
                        <td>
                          <span className="bd-date">{fmtDate(ban.get("updatedAt"))}</span>
                        </td>
                        <td>
                          <div className="bd-actions">
                            {status ? (
                              <button className="bd-act-btn bd-act-btn--unban"
                                disabled={isAct}
                                onClick={() => setConfirmData({ user: { ...user, device_id: devId, objectId: authId }, action: "unban", banRecord: ban })}>
                                {isAct ? <span className="bd-spin" /> : "✓ Unban"}
                              </button>
                            ) : (
                              <button className="bd-act-btn bd-act-btn--ban"
                                disabled={isAct}
                                onClick={() => setConfirmData({ user: { ...user, device_id: devId, objectId: authId }, action: "ban", banRecord: ban })}>
                                {isAct ? <span className="bd-spin" /> : "🚫 Ban"}
                              </button>
                            )}
                            <button className="bd-act-btn bd-act-btn--del"
                              disabled={isAct}
                              onClick={() => setConfirmData({ user: { ...user, device_id: devId, objectId: authId }, action: "delete", banRecord: ban })}>
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="bd-mobile-list">
              {pageItems.map((ban, idx) => {
                const authId = ban.get("auther_id") || "";
                const devId  = ban.get("device_id")  || "—";
                const status = ban.get("status") === true;
                const user   = userMap[authId] || null;
                const clr    = avatarColor(user?.username || authId);
                const isAct  = actionLoading === (user?.objectId || ban.id);

                return (
                  <div key={ban.id} className={`bd-mobile-card ${status ? "bd-mobile-card--banned" : ""}`}>
                    {/* Top row */}
                    <div className="bd-mc-top">
                      <div className="bd-av bd-av--sm"
                        style={{ background: user?.avatar ? "transparent" : clr }}>
                        {user?.avatar
                          ? <img src={user.avatar} alt={user.name} className="bd-av-img" />
                          : ini(user?.name || authId)
                        }
                        {status && <span className="bd-av-banned">🚫</span>}
                      </div>
                      <div className="bd-mc-user">
                        <span className="bd-user-name">{user?.name || <em className="bd-unknown">Unknown</em>}</span>
                        <span className="bd-user-uname">@{user?.username || "—"}{user?.uid ? ` · ${user.uid}` : ""}</span>
                      </div>
                      <span className={`bd-status ${status ? "bd-status--banned" : "bd-status--ok"}`}>
                        {status ? "🚫" : "✓"}
                      </span>
                    </div>

                    {/* Device ID */}
                    <div className="bd-mc-row">
                      <span className="bd-mc-label">Device ID</span>
                      <span className="bd-device-id bd-device-id--sm"
                        onClick={() => copyText(devId, showToast)}>
                        {devId} ⎘
                      </span>
                    </div>
                    <div className="bd-mc-row">
                      <span className="bd-mc-label">User ID</span>
                      <span className="bd-auth-id" onClick={() => copyText(authId, showToast)}>
                        {authId.slice(0,8)}… ⎘
                      </span>
                    </div>
                    <div className="bd-mc-row">
                      <span className="bd-mc-label">Banned On</span>
                      <span className="bd-date">{fmtDate(ban.get("createdAt"))}</span>
                    </div>

                    {/* Actions */}
                    <div className="bd-mc-actions">
                      {status ? (
                        <button className="bd-act-btn bd-act-btn--unban bd-act-btn--full"
                          disabled={isAct}
                          onClick={() => setConfirmData({ user: { ...user, device_id: devId, objectId: authId }, action: "unban", banRecord: ban })}>
                          {isAct ? <span className="bd-spin" /> : "✓ Unban Device"}
                        </button>
                      ) : (
                        <button className="bd-act-btn bd-act-btn--ban bd-act-btn--full"
                          disabled={isAct}
                          onClick={() => setConfirmData({ user: { ...user, device_id: devId, objectId: authId }, action: "ban", banRecord: ban })}>
                          {isAct ? <span className="bd-spin" /> : "🚫 Ban Device"}
                        </button>
                      )}
                      <button className="bd-act-btn bd-act-btn--del"
                        disabled={isAct}
                        onClick={() => setConfirmData({ user: { ...user, device_id: devId, objectId: authId }, action: "delete", banRecord: ban })}>
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── PAGINATION ── */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="bd-pagination">
            <span className="bd-pg-info">
              {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="bd-pages">
              <button className="bd-pg" disabled={safePage === 0}
                onClick={() => setPage(p => Math.max(0, p-1))}>‹</button>
              {pageNums.map((p, i) =>
                p === "…"
                  ? <button key={`el-${i}`} className="bd-pg" disabled>…</button>
                  : <button key={p} className={`bd-pg ${safePage === p ? "on" : ""}`}
                      onClick={() => setPage(p)}>{p+1}</button>
              )}
              <button className="bd-pg" disabled={safePage >= totalPages-1}
                onClick={() => setPage(p => Math.min(totalPages-1, p+1))}>›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}