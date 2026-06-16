import React, { useEffect, useState, useCallback, useMemo } from "react";
import Parse from "../../parseConfig";
import "./MakeReseller.css";

const PAGE_SIZE = 25;

function getInitial(name) { return (name || "?").charAt(0).toUpperCase(); }
function getAvatarColor(str) {
  const p = ["#6366f1","#f472b6","#34d399","#fbbf24","#f87171","#60a5fa","#a78bfa","#22d3ee"];
  let h = 0;
  for (let i = 0; i < (str||"").length; i++) h = str.charCodeAt(i) + ((h<<5)-h);
  return p[Math.abs(h) % p.length];
}
function copyToClipboard(text, showToast) {
  navigator.clipboard?.writeText(text)
    .then(() => showToast(`Copied: ${text}`, "copy"))
    .catch(() => {
      const el = document.createElement("textarea");
      el.value = text; document.body.appendChild(el);
      el.select(); document.execCommand("copy");
      document.body.removeChild(el);
      showToast(`Copied: ${text}`, "copy");
    });
}

export default function MakeReseller() {

  const [users,         setUsers]         = useState([]);
  const [search,        setSearch]        = useState("");
  const [searchInput,   setSearchInput]   = useState("");
  const [filter,        setFilter]        = useState("all");
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [page,          setPage]          = useState(0);
  const [totalCount,    setTotalCount]    = useState(0);
  const [viewMode,      setViewMode]      = useState("list");
  const [toast,         setToast]         = useState(null);
  const [animated,      setAnimated]      = useState(false);
  const [statCounts,    setStatCounts]    = useState({ total: 0, reseller: 0 });

  const [coinModal,     setCoinModal]     = useState(null);
  const [coinInput,     setCoinInput]     = useState("");
  const [coinError,     setCoinError]     = useState("");
  const [resellerModal, setResellerModal] = useState(null);
  const [whatsappInput, setWhatsappInput] = useState("");

  /* ── toast ── */
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  /* ── debounce search ── */
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0); }, 380);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* ════════════════════════════════════════════════
     FETCH STAT COUNTS
  ════════════════════════════════════════════════ */
  const fetchStatCounts = useCallback(async () => {
    try {
      const User = Parse.Object.extend("_User");
      const mk   = { useMasterKey: true };
      const [total, reseller] = await Promise.all([
        new Parse.Query(User).count(mk),
        (() => {
          const q = new Parse.Query(User);
          q.equalTo("isreseller", true);
          return q.count(mk);
        })(),
      ]);
      setStatCounts({ total, reseller });
    } catch (err) { console.error("fetchStatCounts:", err); }
  }, []);

  /* ════════════════════════════════════════════════
     MAP USER PARSE OBJECT
  ════════════════════════════════════════════════ */
  const mapUser = (u) => {
    const av = u.get("avatar");
    let avatarUrl = null;
    if (av && typeof av.url === "function") avatarUrl = av.url();
    else if (typeof av === "string") avatarUrl = av;
    return {
      objectId:              u.id,
      uid:                   String(u.get("uid") || u.id),
      name:                  u.get("name")                   || "—",
      username:              u.get("username")               || "anonymous",
      gender:                u.get("gender")                 || "—",
      credit:                u.get("credit")                 || 0,
      reseller_coins:        u.get("reseller_coins")         || 0,
      reseller_whatsapp:     u.get("reseller_whatsAppnumber")|| "",
      isReseller:            !!u.get("isreseller"),
      avatar:                avatarUrl,
    };
  };

  /* ════════════════════════════════════════════════
     FETCH PAGE
  ════════════════════════════════════════════════ */
  const fetchPage = useCallback(async (pageNum, filterF, searchQ) => {
    setLoading(true); setAnimated(false);
    try {
      const User    = Parse.Object.extend("_User");
      const mk      = { useMasterKey: true };
      const trimmed = searchQ.trim();

      const buildBaseQuery = () => {
        if (trimmed) {
          const byName = new Parse.Query(User); byName.contains("name", trimmed);
          const byUser = new Parse.Query(User); byUser.contains("username", trimmed);
          const queries = [byName, byUser];
          const n = parseInt(trimmed);
          if (!isNaN(n)) {
            const byUid = new Parse.Query(User);
            byUid.equalTo("uid", n);
            queries.push(byUid);
          }
          return Parse.Query.or(...queries);
        }
        return new Parse.Query(User);
      };

      const q      = buildBaseQuery();
      const countQ = buildBaseQuery();

      /* apply reseller filter */
      if (filterF === "reseller") {
        q.equalTo("isreseller", true);
        countQ.equalTo("isreseller", true);
      } else if (filterF === "user") {
        q.notEqualTo("isreseller", true);
        countQ.notEqualTo("isreseller", true);
      }

      q.descending("createdAt");
      q.limit(PAGE_SIZE);
      q.skip(pageNum * PAGE_SIZE);
      q.select([
        "uid", "name", "username", "gender",
        "credit", "reseller_coins", "reseller_whatsAppnumber",
        "isreseller", "avatar",
      ]);

      const [batch, count] = await Promise.all([q.find(mk), countQ.count(mk)]);
      setTotalCount(count);
      setUsers(batch.map(mapUser));

    } catch (err) {
      console.error("fetchPage:", err);
      showToast("Fetch failed: " + err.message, "error");
    } finally {
      setLoading(false);
      setTimeout(() => setAnimated(true), 60);
    }
  }, [showToast]);

  /* ── initial load ── */
  useEffect(() => {
    fetchPage(0, "all", "");
    fetchStatCounts();
  }, []); // eslint-disable-line
  
  useEffect(() => {
  syncExistingResellers();
}, []); // eslint-disable-line

  /* ── re-fetch on filter / search / page change ── */
  useEffect(() => {
    fetchPage(page, filter, search);
  }, [page, filter, search]); // eslint-disable-line

  /* ── pagination ── */
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const pageRange  = useMemo(() => {
    const delta = 2, range = [];
    for (let i = Math.max(0,page-delta); i <= Math.min(totalPages-1,page+delta); i++) range.push(i);
    return range;
  }, [page, totalPages]);
  const changePage = n => { setPage(n); window.scrollTo({ top: 0, behavior: "smooth" }); };

  /* ════════════════════════════════════════════════
     COIN UPDATE  (uses "credit" field)
  ════════════════════════════════════════════════ */
  const openCoinModal = (user, type) => {
    setCoinModal({ user, type }); setCoinInput(""); setCoinError("");
  };

const confirmCoin = async () => {
  const amount = parseInt(coinInput);
  if (!coinInput || isNaN(amount) || amount <= 0) {
    setCoinError("Enter a valid positive number"); return;
  }
  const { user, type } = coinModal;
  const newResellerCoins = type === "inc"
    ? user.reseller_coins + amount
    : Math.max(0, user.reseller_coins - amount);

  setCoinModal(null);
  setActionLoading(user.objectId);
  try {
    const obj = await new Parse.Query("_User").get(user.objectId, { useMasterKey: true });
    obj.set("reseller_coins", newResellerCoins);
    await obj.save(null, { useMasterKey: true });
    setUsers(list => list.map(u =>
      u.objectId === user.objectId
        ? { ...u, reseller_coins: newResellerCoins }
        : u
    ));
    showToast(
      `${user.username}: ${type==="inc"?"+":"-"}${amount} reseller coins → ${newResellerCoins}`,
      type === "inc" ? "success" : "info"
    );
  } catch (err) {
    showToast("Failed: " + err.message, "error");
  } finally {
    setActionLoading(null);
  }
};

  /* ════════════════════════════════════════════════
     MAKE / REMOVE RESELLER
     Sets isreseller = true/false directly on _User
  ════════════════════════════════════════════════ */
  const openResellerModal = user => {
    setResellerModal(user);
    setWhatsappInput(user.reseller_whatsapp || "");
  };

 const confirmReseller = async () => {
  if (!resellerModal) return;
  const user      = resellerModal;
  const makingRes = !user.isReseller;
  setResellerModal(null);
  setActionLoading(user.objectId);
  try {
    const obj = await new Parse.Query("_User").get(user.objectId, { useMasterKey: true });

    if (makingRes) {
      obj.set("isreseller",              true);
      obj.set("reseller_whatsAppnumber", whatsappInput.trim() || "");
    } else {
      obj.set("isreseller",              false);
      obj.set("reseller_whatsAppnumber", "");
      obj.set("reseller_coins",          0);
    }

    await obj.save(null, { useMasterKey: true });

    // ───── Sync with the "reseller" class ─────
    const Reseller = Parse.Object.extend("reseller");
    const rQuery = new Parse.Query(Reseller);
    rQuery.equalTo("user_id", user.objectId);
    const existingEntry = await rQuery.first({ useMasterKey: true });

    if (makingRes) {
      let resellerEntry = existingEntry || new Reseller();
      resellerEntry.set("user_id",          user.objectId);
      resellerEntry.set("whatsapp_number",  whatsappInput.trim() || "");
      await resellerEntry.save(null, { useMasterKey: true });
    } else {
      if (existingEntry) {
        await existingEntry.destroy({ useMasterKey: true });
      }
    }
    // ─────────────────────────────────────────

    setUsers(list => list.map(u =>
      u.objectId === user.objectId
        ? {
            ...u,
            isReseller:        makingRes,
            reseller_whatsapp: makingRes ? whatsappInput.trim() : "",
            reseller_coins:    makingRes ? u.reseller_coins : 0,
          }
        : u
    ));

    fetchStatCounts();
    showToast(
      makingRes
        ? `${user.username} is now a Reseller`
        : `${user.username} removed from resellers`,
      makingRes ? "success" : "info"
    );
  } catch (err) {
    console.error("confirmReseller:", err);
    showToast("Failed: " + err.message, "error");
  } finally {
    setActionLoading(null);
  }
};



const syncExistingResellers = useCallback(async () => {
  try {
    const User = Parse.Object.extend("_User");
    const userQuery = new Parse.Query(User);
    userQuery.equalTo("isreseller", true);
    userQuery.limit(1000);
    const resellers = await userQuery.find({ useMasterKey: true });

    const Reseller = Parse.Object.extend("reseller");
    let created = 0;

    for (const userObj of resellers) {
      const userId = userObj.id;
      const whatsapp = userObj.get("reseller_whatsAppnumber") || "";

      const rQuery = new Parse.Query(Reseller);
      rQuery.equalTo("user_id", userId);
      const existing = await rQuery.first({ useMasterKey: true });

      if (!existing) {
        const entry = new Reseller();
        entry.set("user_id", userId);
        entry.set("whatsapp_number", whatsapp);
        await entry.save(null, { useMasterKey: true });
        created++;
      }
    }

    if (created > 0) {
      console.log(`Auto-synced ${created} reseller(s) to reseller class`);
    }
  } catch (err) {
    console.error("auto-sync resellers failed:", err);
  }
}, []);
  /* ════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════ */
  return (
    <div className="rs-root">

      {/* Toast */}
      {toast && (
        <div className={`rs-toast rs-toast--${toast.type}`}>
          <span className="rs-toast-icon">
            {toast.type==="success"?"✓":toast.type==="error"?"✕":toast.type==="copy"?"⎘":"i"}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Coin Modal */}
      {coinModal && (
        <div className="rs-overlay" onClick={() => setCoinModal(null)}>
          <div className="rs-modal" onClick={e => e.stopPropagation()}>
            <div className="rs-modal-icon"
              style={{ background: coinModal.type==="inc" ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)" }}>
              {coinModal.type==="inc" ? "+" : "−"}
            </div>
            <h3 className="rs-modal-title">
              {coinModal.type==="inc" ? "Add Credits" : "Deduct Credits"}
            </h3>
            <p className="rs-modal-body">
              {coinModal.type==="inc" ? "Add credits to" : "Deduct credits from"}{" "}
              <strong>@{coinModal.user.username}</strong><br/>
<span className="rs-modal-current">
  Current Reseller Coins: <b>{coinModal.user.reseller_coins.toLocaleString()}</b>
</span>
            </p>
            <div className="rs-coin-input-wrap">
              <input
                className={`rs-coin-input ${coinError ? "is-error" : ""}`}
                type="number" min="1" placeholder="Enter amount…"
                value={coinInput} autoFocus
                onChange={e => { setCoinInput(e.target.value); setCoinError(""); }}
                onKeyDown={e => e.key==="Enter" && confirmCoin()}
              />
              {coinError && <span className="rs-coin-error">{coinError}</span>}
            </div>
            <div className="rs-modal-actions">
              <button className="rs-modal-cancel" onClick={() => setCoinModal(null)}>Cancel</button>
              <button
                className={`rs-modal-confirm ${coinModal.type==="inc"?"is-green":"is-red"}`}
                onClick={confirmCoin}>
                {coinModal.type==="inc" ? "Add Credits" : "Deduct Credits"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reseller Modal */}
      {resellerModal && (
        <div className="rs-overlay" onClick={() => setResellerModal(null)}>
          <div className="rs-modal" onClick={e => e.stopPropagation()}>
            <div className="rs-modal-icon" style={{ background: "rgba(251,191,36,0.15)" }}>◈</div>
            <h3 className="rs-modal-title">
              {resellerModal.isReseller ? "Remove Reseller" : "Make Reseller"}
            </h3>
            <p className="rs-modal-body">
              {resellerModal.isReseller
                ? <>Remove <strong>@{resellerModal.username}</strong> from resellers?<br/>
                    <span className="rs-modal-current">
                      This will set isreseller = false on their account.
                    </span>
                  </>
                : <>Make <strong>@{resellerModal.username}</strong> a reseller?<br/>
                    <span className="rs-modal-current">
                      This will set isreseller = true on their account.
                    </span>
                  </>
              }
            </p>
            {!resellerModal.isReseller && (
              <div className="rs-coin-input-wrap">
                <input
                  className="rs-coin-input"
                  type="text"
                  placeholder="WhatsApp number (optional)"
                  value={whatsappInput}
                  onChange={e => setWhatsappInput(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && confirmReseller()}
                />
              </div>
            )}
            <div className="rs-modal-actions">
              <button className="rs-modal-cancel" onClick={() => setResellerModal(null)}>Cancel</button>
              <button
                className={`rs-modal-confirm ${resellerModal.isReseller ? "is-red" : "is-amber"}`}
                onClick={confirmReseller}>
                {resellerModal.isReseller ? "Yes, Remove" : "Yes, Make Reseller"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="rs-header">
        <div className="rs-header-left">
          <span className="rs-eyebrow">Coin &amp; Role Management</span>
          <h1 className="rs-title">Reseller Control</h1>
          <span className="rs-subtitle">
            {loading
              ? "Loading…"
              : `${statCounts.total.toLocaleString()} users · ${statCounts.reseller} resellers · showing ${users.length} of ${totalCount}`
            }
          </span>
        </div>
        <div className="rs-header-right">
          <div className="rs-view-toggle">
            <button className={`rs-toggle-btn ${viewMode==="list"?"is-active":""}`} onClick={() => setViewMode("list")}>≡ List</button>
            <button className={`rs-toggle-btn ${viewMode==="card"?"is-active":""}`} onClick={() => setViewMode("card")}>⊞ Cards</button>
          </div>
          <button className="rs-refresh-btn"
            onClick={() => { fetchPage(page,filter,search); fetchStatCounts(); }}
            disabled={loading}>
            {loading ? <span className="rs-btn-spin"/> : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* Stat Pills */}
      <div className="rs-stat-pills">
        {[
          { label:"Total",     val: statCounts.total,                         color:"violet", key:"all"      },
          { label:"Users",     val: statCounts.total - statCounts.reseller,    color:"blue",   key:"user"     },
          { label:"Resellers", val: statCounts.reseller,                       color:"amber",  key:"reseller" },
        ].map((s, i) => (
          <button key={s.key}
            className={`rs-stat-pill rs-stat-pill--${s.color} ${filter===s.key?"is-active":""}`}
            style={{ animationDelay: `${i*70}ms` }}
            onClick={() => { setFilter(s.key); setPage(0); }}>
            <span className="rs-stat-val">{s.val.toLocaleString()}</span>
            <span className="rs-stat-label">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="rs-toolbar">
        <div className="rs-search-wrap">
          <span className="rs-search-icon">⌕</span>
          <input className="rs-search"
            placeholder="Search name, username or UID…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)} />
          {searchInput && (
            <button className="rs-search-clear"
              onClick={() => { setSearchInput(""); setSearch(""); setPage(0); }}>✕</button>
          )}
        </div>
        <span className="rs-result-count">
          {!loading && `${totalCount} result${totalCount!==1?"s":""}`}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="rs-loading">
          <div className="rs-spinner-wrap">
            <div className="rs-spinner"/>
            <div className="rs-spinner rs-spinner--2"/>
          </div>
          <p>Fetching users…</p>
        </div>
      ) : users.length === 0 ? (
        <div className="rs-empty">
          <div className="rs-empty-icon">◎</div>
          <p>No users found</p>
          <button className="rs-empty-reset"
            onClick={() => { setSearchInput(""); setSearch(""); setFilter("all"); setPage(0); }}>
            Clear filters
          </button>
        </div>
      ) : viewMode === "card" ? (

        /* ═══ CARD VIEW ═══ */
        <div className={`rs-card-grid ${animated?"is-animated":""}`}>
          {users.map((user, i) => {
            const ac = getAvatarColor(user.username);
            const il = actionLoading === user.objectId;
            const ir = user.isReseller;
            return (
              <div key={user.objectId} className="rs-card" style={{ animationDelay: `${i*40}ms` }}>
                <div className="rs-card-av-wrap">
                  {user.avatar
                    ? <img src={user.avatar} alt={user.username} className="rs-card-av"/>
                    : <div className="rs-card-av rs-card-av--init" style={{ background: ac }}>{getInitial(user.name)}</div>
                  }
                  <div className="rs-card-av-ring" style={{ borderColor: ac+"55" }}/>
                </div>
                <div className="rs-card-info">
                  <p className="rs-card-name">{user.name}</p>
                  <p className="rs-card-uname rs-copyable"
                    onClick={() => copyToClipboard(user.username, showToast)}>@{user.username}</p>
                  <span className="rs-role-badge" style={ir
                    ? { background:"rgba(251,191,36,0.12)", borderColor:"rgba(251,191,36,0.35)", color:"#fbbf24" }
                    : { background:"rgba(129,140,248,0.12)", borderColor:"rgba(129,140,248,0.35)", color:"#818cf8" }}>
                    {ir ? "◈ Reseller" : "User"}
                  </span>
                </div>
                <div className="rs-card-uid rs-copyable" onClick={() => copyToClipboard(user.uid, showToast)}>
                  <span className="rs-uid-label">UID</span>
                  <span className="rs-uid-val">{user.uid}</span>
                  <span className="rs-copy-icon">⎘</span>
                </div>
                <div className="rs-card-coins">
                  <div className="rs-coin-item">
                    <span className="rs-coin-label">Credits</span>
                    <span className="rs-coin-val rs-coin-val--gold">{user.credit.toLocaleString()}</span>
                  </div>
                  <div className="rs-coin-divider"/>
                  <div className="rs-coin-item">
                    <span className="rs-coin-label">R-Coins</span>
                    <span className="rs-coin-val rs-coin-val--violet">{user.reseller_coins.toLocaleString()}</span>
                  </div>
                </div>
                <div className="rs-card-coin-btns">
                  <button className="rs-coin-btn rs-coin-btn--plus" disabled={il} onClick={() => openCoinModal(user,"inc")}>
                    {il ? <span className="rs-btn-spin"/> : "+ Add"}
                  </button>
                  <button className="rs-coin-btn rs-coin-btn--minus" disabled={il} onClick={() => openCoinModal(user,"dec")}>
                    {il ? <span className="rs-btn-spin"/> : "− Deduct"}
                  </button>
                </div>
                <button className={`rs-action-btn ${ir?"is-demote":"is-promote"}`}
                  disabled={il} onClick={() => openResellerModal(user)}>
                  {il ? <span className="rs-btn-spin"/> : ir ? "✕ Remove Reseller" : "◈ Make Reseller"}
                </button>
              </div>
            );
          })}
        </div>

      ) : (

        /* ═══ LIST VIEW ═══ */
        <div className={`rs-list-wrap ${animated?"is-animated":""}`}>
          <div className="rs-list-head">
            <span style={{ width:48, flexShrink:0 }}/>
            <span className="rs-list-hcol rs-list-hcol--grow">Name / Username</span>
            <span className="rs-list-hcol rs-list-hcol--hide-sm">UID</span>
            <span className="rs-list-hcol rs-list-hcol--hide-md">Gender</span>
            <span className="rs-list-hcol">Credits</span>
            <span className="rs-list-hcol rs-list-hcol--hide-sm">R-Coins</span>
            <span className="rs-list-hcol">Status</span>
            <span className="rs-list-hcol rs-list-hcol--right">Actions</span>
          </div>
          {users.map((user, i) => {
            const ac = getAvatarColor(user.username);
            const il = actionLoading === user.objectId;
            const ir = user.isReseller;
            return (
              <div key={user.objectId} className="rs-list-row" style={{ animationDelay: `${i*28}ms` }}>
                <div className="rs-list-av-wrap">
                  {user.avatar
                    ? <img src={user.avatar} alt={user.username} className="rs-list-av"/>
                    : <div className="rs-list-av rs-list-av--init" style={{ background: ac }}>{getInitial(user.name)}</div>
                  }
                </div>
                <div className="rs-list-cell rs-list-cell--grow">
                  <span className="rs-list-name">{user.name}</span>
                  <span className="rs-list-uname rs-copyable"
                    onClick={() => copyToClipboard(user.username, showToast)}>@{user.username}</span>
                </div>
                <div className="rs-list-cell rs-list-cell--hide-sm">
                  <span className="rs-list-uid rs-copyable"
                    onClick={() => copyToClipboard(user.uid, showToast)}>
                    {user.uid} <span className="rs-copy-icon">⎘</span>
                  </span>
                </div>
                <div className="rs-list-cell rs-list-cell--hide-md">
                  <span className="rs-list-text">{user.gender}</span>
                </div>
                <div className="rs-list-cell">
                  <span className="rs-list-coin rs-list-coin--gold">{user.credit.toLocaleString()}</span>
                </div>
                <div className="rs-list-cell rs-list-cell--hide-sm">
                  <span className="rs-list-coin rs-list-coin--violet">{user.reseller_coins.toLocaleString()}</span>
                </div>
                <div className="rs-list-cell">
                  <span className="rs-role-badge" style={ir
                    ? { background:"rgba(251,191,36,0.12)", borderColor:"rgba(251,191,36,0.35)", color:"#fbbf24" }
                    : { background:"rgba(129,140,248,0.12)", borderColor:"rgba(129,140,248,0.35)", color:"#818cf8" }}>
                    {ir ? "◈ Reseller" : "User"}
                  </span>
                </div>
                <div className="rs-list-cell rs-list-cell--right rs-list-actions">
                  <button className="rs-coin-btn rs-coin-btn--plus rs-coin-btn--sm"
                    disabled={il} onClick={() => openCoinModal(user,"inc")} title="Add credits">
                    {il ? <span className="rs-btn-spin"/> : "+"}
                  </button>
                  <button className="rs-coin-btn rs-coin-btn--minus rs-coin-btn--sm"
                    disabled={il} onClick={() => openCoinModal(user,"dec")} title="Deduct credits">
                    {il ? <span className="rs-btn-spin"/> : "−"}
                  </button>
                  <button className={`rs-action-btn rs-action-btn--sm ${ir?"is-demote":"is-promote"}`}
                    disabled={il} onClick={() => openResellerModal(user)}>
                    {il ? <span className="rs-btn-spin"/> : ir ? "Remove" : "Reseller"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="rs-pagination">
          <button className="rs-page-btn rs-page-nav" disabled={page===0||loading} onClick={() => changePage(0)}>«</button>
          <button className="rs-page-btn rs-page-nav" disabled={page===0||loading} onClick={() => changePage(page-1)}>‹ Prev</button>
          {pageRange[0] > 0 && (<><button className="rs-page-btn" onClick={() => changePage(0)}>1</button>{pageRange[0]>1&&<span className="rs-page-ellipsis">…</span>}</>)}
          {pageRange.map(i => (
            <button key={i} className={`rs-page-btn rs-page-num ${page===i?"is-active":""}`} onClick={() => changePage(i)}>{i+1}</button>
          ))}
          {pageRange[pageRange.length-1] < totalPages-1 && (<>{pageRange[pageRange.length-1]<totalPages-2&&<span className="rs-page-ellipsis">…</span>}<button className="rs-page-btn" onClick={() => changePage(totalPages-1)}>{totalPages}</button></>)}
          <button className="rs-page-btn rs-page-nav" disabled={page===totalPages-1||loading} onClick={() => changePage(page+1)}>Next ›</button>
          <button className="rs-page-btn rs-page-nav" disabled={page===totalPages-1||loading} onClick={() => changePage(totalPages-1)}>»</button>
          <span className="rs-page-info">Page {page+1} / {totalPages}</span>
        </div>
      )}
    </div>
  );
}