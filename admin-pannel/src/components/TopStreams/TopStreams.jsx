// RoomUsers.jsx
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Parse from "../../parseConfig";
import "./TopStreams.css";

/* ══════════════════════════════════════
   ICONS
══════════════════════════════════════ */
const Ic = {
  users:  <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  search: <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  close:  <svg width="9" height="9" fill="none" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  copy:   <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8"/></svg>,
  csv:    <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/><path d="M8 13c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  excel:  <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/><path d="M9 15l2-3 2 3M11 12v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  pdf:    <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/><path d="M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  print:  <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="1.8"/><rect x="6" y="14" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.8"/></svg>,
  edit:   <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  trash:  <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  save:   <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="1.8"/><path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  prev:   <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  next:   <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
};

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#4f46e5,#7c3aed)",
  "linear-gradient(135deg,#0284c7,#0891b2)",
  "linear-gradient(135deg,#059669,#0d9488)",
  "linear-gradient(135deg,#d97706,#ea580c)",
  "linear-gradient(135deg,#e11d48,#db2777)",
  "linear-gradient(135deg,#7c3aed,#a21caf)",
];

const avatarGradient = (str = "") => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h += str.charCodeAt(i);
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
};

const initials = (name = "") => {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
};

const PRIORITIES = ["normal", "low", "medium", "high"];

const priorityClass = (p = "") => {
  const v = p.toLowerCase();
  if (["high","urgent","vip"].includes(v))   return "high";
  if (["medium","mid"].includes(v))           return "medium";
  if (["low","basic"].includes(v))            return "low";
  return "normal";
};

/* ══════════════════════════════════════
   EXPORT UTILS
══════════════════════════════════════ */
const toExportRows = (items) =>
  items.map((r) => ({
    ObjectId:     r.id,
    UID:          r.get("uid") || r.get("userId") || r.get("hostUID") || "—",
    Username:     r.get("username") || r.get("name") || "—",
    Email:        r.get("email") || "—",
    RoomPriority: r.get("roomPriority") || r.get("priority") || "normal",
  }));

const doCSV = (items) => {
  const cols = ["ObjectId","UID","Username","Email","RoomPriority"];
  const rows = toExportRows(items).map((r) =>
    cols.map((c) => `"${(r[c] || "").toString().replace(/"/g,'""')}"`).join(",")
  );
  const blob = new Blob([cols.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "room_users.csv"; a.click();
};

const doExcel = (tableEl) => {
  if (!tableEl) return;
  const uri = "data:application/vnd.ms-excel," + encodeURIComponent(tableEl.outerHTML);
  const a = document.createElement("a"); a.href = uri;
  a.download = "room_users.xls"; a.click();
};

const doPDF = (items) => {
  const cols = ["ObjectId","UID","Username","Email","RoomPriority"];
  const rows = toExportRows(items).map((r) => cols.map((c) => r[c] || ""));
  const ths  = cols.map((c) => `<th>${c}</th>`).join("");
  const trs  = rows.map((r) => `<tr>${r.map((v) => `<td>${v}</td>`).join("")}</tr>`).join("");
  const html = `<html><head><style>
    body{font-family:sans-serif;font-size:11px;color:#1e293b}
    h2{margin-bottom:10px;font-size:15px;color:#0f172a}
    table{width:100%;border-collapse:collapse}
    th{background:#4f46e5;color:#fff;padding:8px 10px;text-align:left;font-size:10px;letter-spacing:.05em}
    td{padding:7px 10px;border-bottom:1px solid #e2e8f0;color:#1e293b}
    tr:nth-child(even) td{background:#f8f9fc}
  </style></head><body>
    <h2>Room Users — ${new Date().toLocaleDateString()} · ${items.length} records</h2>
    <table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
  </body></html>`;
  const w = window.open("","_blank");
  w.document.write(html); w.document.close(); w.print();
};

const doCopy = (items) => {
  const cols = ["ObjectId","UID","Username","Email","RoomPriority"];
  const rows = toExportRows(items).map((r) => cols.map((c) => r[c] || "").join("\t"));
  const text = cols.join("\t") + "\n" + rows.join("\n");
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); document.body.removeChild(ta);
  });
};

/* ══════════════════════════════════════
   PRIORITY BADGE
══════════════════════════════════════ */
const PriorityBadge = ({ value }) => {
  const cls   = priorityClass(value);
  const label = value || "Normal";
  return (
    <span className={`ru-priority ${cls}`}>
      <span className="ru-priority-dot" />
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
  );
};

/* ══════════════════════════════════════
   EDIT MODAL
══════════════════════════════════════ */
const EditModal = ({ item, onClose, onSaved, showToast }) => {
  const [uid,      setUid]      = useState(item.get("uid")          || item.get("userId") || "");
  const [username, setUsername] = useState(item.get("username")     || item.get("name")   || "");
  const [email,    setEmail]    = useState(item.get("email")        || "");
  const [priority, setPriority] = useState(item.get("roomPriority") || item.get("priority") || "normal");
  const [saving,   setSaving]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      item.set("uid",          uid);
      item.set("username",     username);
      item.set("email",        email);
      item.set("roomPriority", priority);
      await item.save();
      showToast("✓ User updated successfully");
      onSaved(item);
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      showToast("✗ Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ru-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ru-modal">
        <div className="ru-modal-header">
          <div className="ru-modal-title">
            {Ic.edit} Edit User
          </div>
          <button className="ru-modal-close" onClick={onClose} type="button">{Ic.close}</button>
        </div>

        <div className="ru-form-field">
          <label className="ru-form-label">UID</label>
          <input className="ru-form-input" value={uid} onChange={(e) => setUid(e.target.value)} placeholder="User ID" />
        </div>

        <div className="ru-form-field">
          <label className="ru-form-label">Username</label>
          <input className="ru-form-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
        </div>

        <div className="ru-form-field">
          <label className="ru-form-label">Email</label>
          <input className="ru-form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
        </div>

        <div className="ru-form-field">
          <label className="ru-form-label">Room Priority</label>
          <select className="ru-form-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>

        <div className="ru-modal-footer">
          <button className="ru-modal-cancel" onClick={onClose} type="button">Cancel</button>
          <button className="ru-modal-save" onClick={handleSave} disabled={saving} type="button">
            {Ic.save} {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
export default function RoomUsers() {
  const [rows,      setRows]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [page,      setPage]      = useState(0);
  const [perPage,   setPerPage]   = useState(10);
  const [editItem,  setEditItem]  = useState(null);
  const [toast,     setToast]     = useState("");
  const tableRef = useRef(null);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const query = new Parse.Query(Parse.Object.extend("RoomUsers"));
      query.descending("createdAt");
      query.limit(2000);
      const results = await query.find();
      setRows(results);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(0); }, [search, perPage]);

  /* ── Toast ── */
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  }, []);

  /* ── Delete ── */
  const handleDelete = useCallback(async (item) => {
    if (!window.confirm(`Delete user "${item.get("username") || item.id}"?`)) return;
    try {
      await item.destroy();
      setRows((prev) => prev.filter((r) => r.id !== item.id));
      showToast("✓ User deleted");
    } catch (err) {
      console.error("Delete error:", err);
      showToast("✗ Failed to delete");
    }
  }, [showToast]);

  /* ── After edit saved ── */
  const handleSaved = useCallback((updated) => {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }, []);

  /* ── Filter ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const uid   = (r.get("uid") || r.get("userId") || r.get("hostUID") || "").toLowerCase();
      const oid   = r.id.toLowerCase();
      const uname = (r.get("username") || r.get("name") || "").toLowerCase();
      const email = (r.get("email") || "").toLowerCase();
      return oid.includes(q) || uid.includes(q) || uname.includes(q) || email.includes(q);
    });
  }, [rows, search]);

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage   = Math.min(page, totalPages - 1);
  const pageItems  = filtered.slice(safePage * perPage, (safePage + 1) * perPage);
  const startIdx   = filtered.length === 0 ? 0 : safePage * perPage + 1;
  const endIdx     = Math.min((safePage + 1) * perPage, filtered.length);

  /* ── Smart page numbers ── */
  const pageNums = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
    const pages = [0];
    if (safePage > 2) pages.push("…");
    for (let i = Math.max(1, safePage - 1); i <= Math.min(totalPages - 2, safePage + 1); i++) pages.push(i);
    if (safePage < totalPages - 3) pages.push("…");
    pages.push(totalPages - 1);
    return pages;
  }, [totalPages, safePage]);

  /* ── Getters ── */
  const getUID      = (r) => r.get("uid")      || r.get("userId") || r.get("hostUID") || "—";
  const getUsername = (r) => r.get("username") || r.get("name")   || "—";
  const getEmail    = (r) => r.get("email")    || "";
  const getPriority = (r) => r.get("roomPriority") || r.get("priority") || "normal";

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <div className="ru-page">
      <div className="ru-inner">

        {/* ── HEADER ── */}
        <div className="ru-header">
          <div className="ru-header-left">
            <div className="ru-icon-box">{Ic.users}</div>
            <div>
              <div className="ru-title">Room Users</div>
              <div className="ru-subtitle">Manage user access &amp; room priorities</div>
            </div>
          </div>
          <div className="ru-count-pill">
            👥 <span>{rows.length} users</span>
          </div>
        </div>

        {/* ── TOOLBAR ── */}
        <div className="ru-toolbar">
          {/* Search */}
          <div className="ru-search-wrap">
            <span className="ru-search-icon">{Ic.search}</span>
            <input
              className="ru-search"
              type="text"
              placeholder="Search by ID, UID, name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="ru-search-clear" onClick={() => setSearch("")} type="button">
                {Ic.close}
              </button>
            )}
          </div>

          {/* Exports */}
          <div className="ru-export-group">
            <button className="ru-exp copy" type="button"
              onClick={() => { doCopy(filtered); showToast("✓ Copied to clipboard!"); }}>
              {Ic.copy} <span>Copy</span>
            </button>
            <button className="ru-exp csv"   type="button" onClick={() => doCSV(filtered)}>
              {Ic.csv}   <span>CSV</span>
            </button>
            <button className="ru-exp excel" type="button" onClick={() => doExcel(tableRef.current)}>
              {Ic.excel} <span>Excel</span>
            </button>
            <button className="ru-exp pdf"   type="button" onClick={() => doPDF(filtered)}>
              {Ic.pdf}   <span>PDF</span>
            </button>
            <button className="ru-exp print" type="button" onClick={() => window.print()}>
              {Ic.print} <span>Print</span>
            </button>
          </div>

          <div className="ru-results">
            <strong>{filtered.length}</strong> of {rows.length} records
          </div>
        </div>

        {/* ── MAIN CARD ── */}
        <div className="ru-card">

          {loading ? (
            <div className="ru-loading">
              <div className="ru-spinner" />
              Loading room users…
            </div>
          ) : filtered.length === 0 ? (
            <div className="ru-empty">
              <div className="ru-empty-icon">👥</div>
              <div className="ru-empty-title">{search ? "No results found" : "No users yet"}</div>
              <div className="ru-empty-desc">
                {search ? `No records match "${search}"` : "Room users will appear here once added."}
              </div>
            </div>
          ) : (
            <>
              {/* ── DESKTOP TABLE ── */}
              <div className="ru-table-scroll">
                <table className="ru-table" ref={tableRef}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Object ID</th>
                      <th>UID</th>
                      <th>Username / Email</th>
                      <th>Room Priority</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item, idx) => {
                      const name     = getUsername(item);
                      const email    = getEmail(item);
                      const uid      = getUID(item);
                      const priority = getPriority(item);
                      return (
                        <tr key={item.id}>
                          <td>
                            <span className="ru-num">{startIdx + idx}</span>
                          </td>
                          <td>
                            <span
                              className="ru-oid"
                              title={`Click to copy: ${item.id}`}
                              onClick={() => {
                                navigator.clipboard?.writeText(item.id);
                                showToast("✓ Object ID copied!");
                              }}
                            >
                              {item.id}
                            </span>
                          </td>
                          <td>
                            <span className="ru-uid">{uid}</span>
                          </td>
                          <td>
                            <div className="ru-user">
                              <div
                                className="ru-avatar"
                                style={{ background: avatarGradient(name) }}
                              >
                                {initials(name)}
                              </div>
                              <div className="ru-user-info">
                                <span className="ru-username">{name}</span>
                                {email && <span className="ru-email">{email}</span>}
                              </div>
                            </div>
                          </td>
                          <td>
                            <PriorityBadge value={priority} />
                          </td>
                          <td>
                            <div className="ru-actions">
                              <button
                                className="ru-btn-edit"
                                type="button"
                                onClick={() => setEditItem(item)}
                              >
                                {Ic.edit} Edit
                              </button>
                              <button
                                className="ru-btn-del"
                                type="button"
                                onClick={() => handleDelete(item)}
                              >
                                {Ic.trash} Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── MOBILE CARD LIST ── */}
              <div className="ru-card-list">
                {pageItems.map((item, idx) => {
                  const name     = getUsername(item);
                  const email    = getEmail(item);
                  const uid      = getUID(item);
                  const priority = getPriority(item);
                  const pCls     = priorityClass(priority);
                  return (
                    <div key={item.id} className={`ru-row-card ${pCls}`}>
                      {/* Top: user + priority */}
                      <div className="ru-row-card-top">
                        <div className="ru-user">
                          <div
                            className="ru-avatar"
                            style={{ background: avatarGradient(name), width: 36, height: 36, fontSize: "0.72rem" }}
                          >
                            {initials(name)}
                          </div>
                          <div className="ru-user-info">
                            <span className="ru-username">{name}</span>
                            {email && <span className="ru-email">{email}</span>}
                          </div>
                        </div>
                        <PriorityBadge value={priority} />
                      </div>

                      {/* Meta grid */}
                      <div className="ru-row-card-grid">
                        <div className="ru-row-card-field">
                          <span className="ru-field-label">Object ID</span>
                          <span
                            className="ru-oid"
                            style={{ maxWidth: "100%", fontSize: "0.67rem" }}
                            title={item.id}
                            onClick={() => {
                              navigator.clipboard?.writeText(item.id);
                              showToast("✓ Copied!");
                            }}
                          >
                            {item.id}
                          </span>
                        </div>
                        <div className="ru-row-card-field">
                          <span className="ru-field-label">UID</span>
                          <span className="ru-uid" style={{ fontSize: "0.75rem" }}>{uid}</span>
                        </div>
                        <div className="ru-row-card-field">
                          <span className="ru-field-label">Row</span>
                          <span className="ru-field-value">#{startIdx + idx}</span>
                        </div>
                      </div>

                      {/* Footer: actions */}
                      <div className="ru-row-card-footer">
                        <button
                          className="ru-btn-edit"
                          type="button"
                          style={{ flex: 1, justifyContent: "center" }}
                          onClick={() => setEditItem(item)}
                        >
                          {Ic.edit} Edit
                        </button>
                        <button
                          className="ru-btn-del"
                          type="button"
                          style={{ flex: 1, justifyContent: "center" }}
                          onClick={() => handleDelete(item)}
                        >
                          {Ic.trash} Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── PAGINATION FOOTER ── */}
          {!loading && filtered.length > 0 && (
            <div className="ru-footer">
              <div className="ru-per-page">
                <span>Show</span>
                <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
                  {[5, 10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span>per page</span>
              </div>

              <div className="ru-footer-info">
                <strong>{startIdx}–{endIdx}</strong> of <strong>{filtered.length}</strong> users
              </div>

              <div className="ru-pages">
                <button
                  className="ru-page-btn" type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  aria-label="Previous page"
                >
                  {Ic.prev}
                </button>

                {pageNums.map((p, i) =>
                  p === "…" ? (
                    <button key={`el-${i}`} className="ru-page-btn" disabled type="button">…</button>
                  ) : (
                    <button
                      key={p}
                      className={`ru-page-btn ${safePage === p ? "active" : ""}`}
                      onClick={() => setPage(p)}
                      type="button"
                    >
                      {p + 1}
                    </button>
                  )
                )}

                <button
                  className="ru-page-btn" type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  aria-label="Next page"
                >
                  {Ic.next}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── EDIT MODAL ── */}
      {editItem && (
        <EditModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSaved={handleSaved}
          showToast={showToast}
        />
      )}

      {/* ── TOAST ── */}
      {toast && <div className="ru-toast">{toast}</div>}
    </div>
  );
}