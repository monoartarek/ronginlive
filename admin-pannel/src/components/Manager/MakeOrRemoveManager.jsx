import React, { useEffect, useState, useCallback, useMemo } from "react";
import Parse from "../../parseConfig";
import "./MakeOrRemoveManager.css";

const PAGE_SIZE = 25; // server-side: 25 users fetched per page

/* ── helpers ── */
function getInitial(name) {
  return (name || "?").charAt(0).toUpperCase();
}
function getAvatarColor(str) {
  const palette = [
    "#6366f1","#f472b6","#34d399","#fbbf24",
    "#f87171","#60a5fa","#a78bfa","#22d3ee",
  ];
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}
function getRoleStyle(role) {
  if (role === "manager") return { bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.35)", text: "#34d399" };
  if (role === "admin")   return { bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.35)",  text: "#fbbf24" };
  return                         { bg: "rgba(99,102,241,0.12)",  border: "rgba(99,102,241,0.35)",  text: "#818cf8" };
}

/* ── build Parse query with current filters ── */
function buildQuery(roleFilter, search) {
  const User = Parse.Object.extend("_User");
  const q    = new Parse.Query(User);
  q.descending("createdAt");
  q.select("uid", "name", "username", "role", "avatar");

  // role filter
  if (roleFilter === "manager") q.equalTo("role", "manager");
  if (roleFilter === "user")    q.equalTo("role", "user");

  // search: Parse supports startsWith, combine with OR
  if (search.trim()) {
    const s  = search.trim();
    const qN = new Parse.Query(Parse.User); qN.startsWith("name",     s);
    const qU = new Parse.Query(Parse.User); qU.startsWith("username", s);
    const qI = new Parse.Query(Parse.User); qI.startsWith("uid",      s);
    return Parse.Query.or(qN, qU, qI);
  }

  return q;
}

/* ════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════ */
export default function MakeOrRemoveManager() {
  const [users,        setUsers]        = useState([]);    // current page users
  const [totalCount,   setTotalCount]   = useState(0);     // total matching count
  const [managerCount, setManagerCount] = useState(0);     // total managers (for stat)
  const [search,       setSearch]       = useState("");
  const [searchInput,  setSearchInput]  = useState("");    // debounced input
  const [roleFilter,   setRoleFilter]   = useState("all");
  const [loading,      setLoading]      = useState(true);
  const [countLoading, setCountLoading] = useState(true);
  const [actionLoading,setActionLoading]= useState(null);
  const [page,         setPage]         = useState(0);
  const [viewMode,     setViewMode]     = useState("list");
  const [toast,        setToast]        = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [animated,     setAnimated]     = useState(false);

  /* toast */
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  /* ──────────────────────────────────────────────────────
     FETCH: only current page (25 users)
  ────────────────────────────────────────────────────── */
  const fetchPage = useCallback(async (pageNum, role, srch) => {
    setLoading(true);
    setAnimated(false);
    try {
      const User = Parse.Object.extend("_User");

      /* ── helper: apply role constraint to a query ── */
      const applyRole = (q) => {
        if (role === "manager") {
          q.equalTo("role", "manager");
        } else if (role === "user") {
          // "user" = role is "user" OR null OR doesn't exist
          const qUser   = new Parse.Query(User); qUser.equalTo("role", "user");
          const qNull   = new Parse.Query(User); qNull.equalTo("role", null);
          const qNone   = new Parse.Query(User); qNone.doesNotExist("role");
          return Parse.Query.or(qUser, qNull, qNone);
        }
        return q;
      };

      let q = new Parse.Query(User);
      if (role === "user") {
        q = applyRole(q); // returns a new OR query
      } else {
        applyRole(q);
      }

      q.descending("createdAt");
      q.select("uid", "name", "username", "role", "avatar");
      q.limit(PAGE_SIZE);
      q.skip(pageNum * PAGE_SIZE);

      // search filter
        if (srch.trim()) {
      const s      = srch.trim();
      const mk     = { useMasterKey: true };
      const queries = [];

      // name — string, startsWith works
      const qN = new Parse.Query(User);
      qN.startsWith("name", s);
      queries.push(qN);

      // username — string, startsWith works
      const qU = new Parse.Query(User);
      qU.startsWith("username", s);
      queries.push(qU);

      // uid — number, only equalTo works
      const uidNum = parseInt(s);
      if (!isNaN(uidNum)) {
        const qI = new Parse.Query(User);
        qI.equalTo("uid", uidNum);
        queries.push(qI);
      }

      let combined = Parse.Query.or(...queries);

      // apply role filter on top of search
      if (role === "manager") {
        combined.equalTo("role", "manager");
      }

      combined.descending("createdAt");
      combined.limit(PAGE_SIZE);
      combined.skip(pageNum * PAGE_SIZE);
      combined.select("uid", "name", "username", "role", "avatar");

      const results = await combined.find({ useMasterKey: true });

      // if role==="user", filter client-side (Parse can't chain OR+OR)
      const filtered = role === "user"
        ? results.filter(u => { const r = u.get("role"); return !r || r === "user"; })
        : results;

      setUsers(mapUsers(filtered));
      return;
    }

      const results = await q.find({ useMasterKey: true });
      setUsers(mapUsers(results));
    } catch (err) {
      showToast("Fetch failed: " + err.message, "error");
    } finally {
      setLoading(false);
      setTimeout(() => setAnimated(true), 60);
    }
  }, [showToast]);

  /* ──────────────────────────────────────────────────────
     COUNT: lightweight — just the number, no data
  ────────────────────────────────────────────────────── */
    const fetchCount = useCallback(async (role, srch) => {
    setCountLoading(true);
    try {
      const User = Parse.Object.extend("_User");
      const mk   = { useMasterKey: true };

      let countQ;

      if (srch.trim()) {
        const s       = srch.trim();
        const queries = [];

        const qN = new Parse.Query(User); qN.startsWith("name", s);     queries.push(qN);
        const qU = new Parse.Query(User); qU.startsWith("username", s); queries.push(qU);
        const uidNum = parseInt(s);
        if (!isNaN(uidNum)) {
          const qI = new Parse.Query(User); qI.equalTo("uid", uidNum);  queries.push(qI);
        }

        countQ = Parse.Query.or(...queries);
        if (role === "manager") countQ.equalTo("role", "manager");
      } else {
        if (role === "manager") {
          countQ = new Parse.Query(User); countQ.equalTo("role", "manager");
        } else if (role === "user") {
          const qUser = new Parse.Query(User); qUser.equalTo("role", "user");
          const qNull = new Parse.Query(User); qNull.equalTo("role", null);
          const qNone = new Parse.Query(User); qNone.doesNotExist("role");
          countQ = Parse.Query.or(qUser, qNull, qNone);
        } else {
          countQ = new Parse.Query(User);
        }
      }

      const [total, mgrCount] = await Promise.all([
        countQ.count(mk),
        (() => { const q = new Parse.Query(User); q.equalTo("role","manager"); return q.count(mk); })(),
      ]);

      setTotalCount(total);
      setManagerCount(mgrCount);
    } catch (err) {
      console.error("Count error:", err);
    } finally {
      setCountLoading(false);
    }
  }, []);

  /* map Parse objects → plain objects */
  function mapUsers(results) {
    return results.map(u => {
      const av = u.get("avatar");
      let avatarUrl = null;
      if (av && typeof av.url === "function") avatarUrl = av.url();
      else if (typeof av === "string") avatarUrl = av;
      const role = u.get("role");
      return {
        objectId: u.id,
        uid:      String(u.get("uid") || u.id),
        name:     u.get("name")     || "—",
        username: u.get("username") || "anonymous",
        role:     role || "user",   // null/undefined → treat as regular user
        avatar:   avatarUrl,
      };
    });
  }

  /* initial load + whenever filter/page changes */
  useEffect(() => {
    fetchPage(page, roleFilter, search);
  }, [fetchPage, page, roleFilter, search]);

  useEffect(() => {
    fetchCount(roleFilter, search);
  }, [fetchCount, roleFilter, search]);

  /* debounce search input (500ms) */
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* pagination */
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const pageRange  = useMemo(() => {
    const d = 2, r = [];
    for (let i = Math.max(0, page - d); i <= Math.min(totalPages - 1, page + d); i++) r.push(i);
    return r;
  }, [page, totalPages]);

  const changePage = n => {
    setPage(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* role action */
  const handleAction = user => {
    const newRole = user.role === "manager" ? "user" : "manager";
    setConfirmModal({ user, newRole });
  };

  const confirmAction = async () => {
    if (!confirmModal) return;
    const { user, newRole } = confirmModal;
    setConfirmModal(null);
    setActionLoading(user.objectId);
    try {
      const User = Parse.Object.extend("_User");
      const obj  = await new Parse.Query(User).get(user.objectId, { useMasterKey: true });
      obj.set("role", newRole);
      await obj.save(null, { useMasterKey: true });

      // update local page
      setUsers(prev => prev.map(u =>
        u.objectId === user.objectId ? { ...u, role: newRole } : u
      ));
      // refresh counts
      fetchCount(roleFilter, search);

      showToast(
        newRole === "manager"
          ? `${user.username} is now a Manager`
          : `${user.username} role changed to User`,
        newRole === "manager" ? "success" : "info"
      );
    } catch (err) {
      showToast("Failed: " + err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const refresh = () => {
    fetchPage(page, roleFilter, search);
    fetchCount(roleFilter, search);
  };

  /* ════════════ RENDER ════════════ */
  return (
    <div className="mrm-root">

      {/* Toast */}
      {toast && (
        <div className={`mrm-toast mrm-toast--${toast.type}`}>
          <span className="mrm-toast-icon">
            {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "i"}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="mrm-modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="mrm-modal" onClick={e => e.stopPropagation()}>
            <div className="mrm-modal-icon">
              {confirmModal.newRole === "manager" ? "⬡" : "◎"}
            </div>
            <h3 className="mrm-modal-title">
              {confirmModal.newRole === "manager" ? "Make Manager" : "Remove Manager"}
            </h3>
            <p className="mrm-modal-body">
              {confirmModal.newRole === "manager"
                ? <>Grant manager role to <strong>@{confirmModal.user.username}</strong>?</>
                : <>Remove manager role from <strong>@{confirmModal.user.username}</strong>?</>
              }
            </p>
            <div className="mrm-modal-actions">
              <button className="mrm-modal-cancel" onClick={() => setConfirmModal(null)}>Cancel</button>
              <button
                className={`mrm-modal-confirm ${confirmModal.newRole === "manager" ? "is-promote" : "is-demote"}`}
                onClick={confirmAction}
              >
                {confirmModal.newRole === "manager" ? "Yes, Make Manager" : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="mrm-header">
        <div className="mrm-header-left">
          <span className="mrm-eyebrow">Role Management</span>
          <h1 className="mrm-title">Manager Control</h1>
          <span className="mrm-subtitle">
            {countLoading ? "Counting…" : `${totalCount.toLocaleString()} users · ${managerCount} managers`}
          </span>
        </div>
        <div className="mrm-header-right">
          <div className="mrm-view-toggle">
            <button className={`mrm-toggle-btn ${viewMode === "list" ? "is-active" : ""}`}
              onClick={() => setViewMode("list")}>≡ List</button>
            <button className={`mrm-toggle-btn ${viewMode === "card" ? "is-active" : ""}`}
              onClick={() => setViewMode("card")}>⊞ Cards</button>
          </div>
          <button className="mrm-refresh-btn" onClick={refresh} disabled={loading}>
            {loading ? <span className="mrm-btn-spin" /> : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* ── Stat Pills ── */}
      <div className="mrm-stat-pills">
        {[
          { label: "Total",    val: totalCount,                    color: "violet", key: "all"     },
          { label: "Users",    val: totalCount - managerCount,     color: "blue",   key: "user"    },
          { label: "Managers", val: managerCount,                  color: "green",  key: "manager" },
        ].map((s, i) => (
          <button key={s.key}
            className={`mrm-stat-pill mrm-stat-pill--${s.color} ${roleFilter === s.key ? "is-active" : ""}`}
            style={{ animationDelay: `${i * 70}ms` }}
            onClick={() => { setRoleFilter(s.key); setPage(0); }}
          >
            <span className="mrm-stat-val">{countLoading ? "…" : s.val.toLocaleString()}</span>
            <span className="mrm-stat-label">{s.label}</span>
          </button>
        ))}
      </div>

      {/* ── Speed info banner ── */}
      {/* <div className="mrm-speed-info">
        <span className="mrm-speed-dot">⚡</span>
        Showing {PAGE_SIZE} users per page — fetched live from server for maximum speed
        {totalPages > 1 && ` · Page ${page + 1} of ${totalPages}`}
      </div> */}

      {/* ── Toolbar (search) ── */}
      <div className="mrm-toolbar">
        <div className="mrm-search-wrap">
          <span className="mrm-search-icon">⌕</span>
          <input
            className="mrm-search"
            placeholder="Search by name, username or UID… (searches server)"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button className="mrm-search-clear"
              onClick={() => { setSearchInput(""); setSearch(""); setPage(0); }}>✕</button>
          )}
        </div>
        <span className="mrm-result-count">
          {countLoading ? "Counting…" : `${totalCount.toLocaleString()} result${totalCount !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="mrm-loading">
          <div className="mrm-spinner-wrap">
            <div className="mrm-spinner" />
            <div className="mrm-spinner mrm-spinner--2" />
          </div>
          <p>Fetching page {page + 1}…</p>
        </div>
      ) : users.length === 0 ? (
        <div className="mrm-empty">
          <div className="mrm-empty-icon">◎</div>
          <p>No users found on this page</p>
          <button className="mrm-empty-reset"
            onClick={() => { setSearchInput(""); setSearch(""); setRoleFilter("all"); setPage(0); }}>
            Clear filters
          </button>
        </div>
      ) : viewMode === "card" ? (
        /* ════ CARD VIEW ════ */
        <div className={`mrm-card-grid ${animated ? "is-animated" : ""}`}>
          {users.map((user, i) => {
            const roleStyle = getRoleStyle(user.role);
            const avatarClr = getAvatarColor(user.username);
            const isLoading = actionLoading === user.objectId;
            return (
              <div key={user.objectId} className="mrm-card" style={{ animationDelay: `${i * 45}ms` }}>
                <div className="mrm-card-avatar-wrap">
                  {user.avatar
                    ? <img src={user.avatar} alt={user.username} className="mrm-card-avatar" />
                    : <div className="mrm-card-avatar mrm-card-avatar--init" style={{ background: avatarClr }}>
                        {getInitial(user.name)}
                      </div>
                  }
                  <div className="mrm-card-avatar-ring" style={{ borderColor: avatarClr + "55" }} />
                </div>
                <div className="mrm-card-info">
                  <p className="mrm-card-name">{user.name}</p>
                  <p className="mrm-card-username">@{user.username}</p>
                  <span className="mrm-role-badge"
                    style={{ background: roleStyle.bg, borderColor: roleStyle.border, color: roleStyle.text }}>
                    {user.role === "manager" ? "⬡ Manager" : "◎ User"}
                  </span>
                </div>
                <div className="mrm-card-uid">
                  <span className="mrm-uid-label">UID</span>
                  <span className="mrm-uid-val">{user.uid.slice(-10)}</span>
                </div>
                <button
                  className={`mrm-action-btn ${user.role === "manager" ? "is-demote" : "is-promote"}`}
                  onClick={() => handleAction(user)} disabled={isLoading}
                >
                  {isLoading ? <span className="mrm-btn-spin" />
                    : user.role === "manager" ? "✕ Remove Manager" : "✦ Make Manager"}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* ════ LIST VIEW ════ */
        <div className={`mrm-list-wrap ${animated ? "is-animated" : ""}`}>
          <div className="mrm-list-head">
            <span className="mrm-list-hcol" style={{ width: 48 }} />
            <span className="mrm-list-hcol mrm-list-hcol--grow">Name / Username</span>
            <span className="mrm-list-hcol mrm-list-hcol--hide-sm">UID</span>
            <span className="mrm-list-hcol">Role</span>
            <span className="mrm-list-hcol mrm-list-hcol--right">Action</span>
          </div>
          {users.map((user, i) => {
            const roleStyle = getRoleStyle(user.role);
            const avatarClr = getAvatarColor(user.username);
            const isLoading = actionLoading === user.objectId;
            return (
              <div key={user.objectId} className="mrm-list-row" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="mrm-list-avatar-wrap">
                  {user.avatar
                    ? <img src={user.avatar} alt={user.username} className="mrm-list-avatar" />
                    : <div className="mrm-list-avatar mrm-list-avatar--init" style={{ background: avatarClr }}>
                        {getInitial(user.name)}
                      </div>
                  }
                </div>
                <div className="mrm-list-cell mrm-list-cell--grow">
                  <span className="mrm-list-name">{user.name}</span>
                  <span className="mrm-list-uname">@{user.username}</span>
                </div>
                <div className="mrm-list-cell mrm-list-cell--hide-sm">
                  <span className="mrm-list-uid">{user.uid}</span>
                </div>
                <div className="mrm-list-cell">
                  <span className="mrm-role-badge"
                    style={{ background: roleStyle.bg, borderColor: roleStyle.border, color: roleStyle.text }}>
                    {user.role === "manager" ? "⬡ Manager" : "◎ User"}
                  </span>
                </div>
                <div className="mrm-list-cell mrm-list-cell--right">
                  <button
                    className={`mrm-action-btn mrm-action-btn--sm ${user.role === "manager" ? "is-demote" : "is-promote"}`}
                    onClick={() => handleAction(user)} disabled={isLoading}
                  >
                    {isLoading ? <span className="mrm-btn-spin" />
                      : user.role === "manager" ? "Remove" : "Make Manager"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="mrm-pagination">
          <button className="mrm-page-btn mrm-page-nav" disabled={page===0} onClick={() => changePage(0)}>«</button>
          <button className="mrm-page-btn mrm-page-nav" disabled={page===0} onClick={() => changePage(page-1)}>‹ Prev</button>
          {pageRange[0]>0&&<><button className="mrm-page-btn" onClick={() => changePage(0)}>1</button>{pageRange[0]>1&&<span className="mrm-page-ellipsis">…</span>}</>}
          {pageRange.map(i=><button key={i} className={`mrm-page-btn mrm-page-num ${page===i?"is-active":""}`} onClick={() => changePage(i)}>{i+1}</button>)}
          {pageRange[pageRange.length-1]<totalPages-1&&<>{pageRange[pageRange.length-1]<totalPages-2&&<span className="mrm-page-ellipsis">…</span>}<button className="mrm-page-btn" onClick={() => changePage(totalPages-1)}>{totalPages}</button></>}
          <button className="mrm-page-btn mrm-page-nav" disabled={page===totalPages-1} onClick={() => changePage(page+1)}>Next ›</button>
          <button className="mrm-page-btn mrm-page-nav" disabled={page===totalPages-1} onClick={() => changePage(totalPages-1)}>»</button>
          <span className="mrm-page-info">Page {page+1} / {totalPages} · {totalCount.toLocaleString()} total</span>
        </div>
      )}

    </div>
  );
}