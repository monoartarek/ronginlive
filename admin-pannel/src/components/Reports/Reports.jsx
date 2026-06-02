// Reports.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Parse from "../../parseConfig";
import "./Reports.css";

/* ─────────────────────────────────────────
   ICONS
───────────────────────────────────────── */
function IconFlag() {
  return (
    <svg width="21" height="21" fill="none" viewBox="0 0 24 24">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
      <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IconX() {
  return (
    <svg width="9" height="9" fill="none" viewBox="0 0 24 24">
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
      <path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function IconChevLeft() {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IconChevRight() {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IconLive() {
  return (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" fill="currentColor"/>
      <path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IconPost() {
  return (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M7 8h10M7 12h6M7 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function IconCsv() {
  return (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
        stroke="currentColor" strokeWidth="1.8"/>
      <path d="M8 13c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
var PER_PAGE = 10;

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch (rr) {
    console.error("Date formatting error:", rr);
    return String(d);}
}

function fmtDateShort(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch (err) {
    console.error("Date formatting error:", err);
    return String(d);
  }
}

function truncate(str, n) {
  if (!str) return "—";
  return str.length > n ? str.slice(0, n) + "…" : str;
}

/* ─────────────────────────────────────────
   FIELD GETTERS
───────────────────────────────────────── */
function gType(r)      { return r.get("reportType") || "—"; }
function gMessage(r)   { return r.get("message")    || "—"; }
function gAccuserId(r) { return r.get("accuserId")  || (r.get("accuser") && r.get("accuser").id) || "—"; }
function gAccusedId(r) { return r.get("accusedId")  || (r.get("accused") && r.get("accused").id) || "—"; }
function gLinkedId(r) {
  var live = r.get("live");
  var post = r.get("post");
  if (live) return { label: "Live", id: live.id || "—" };
  if (post) return { label: "Post", id: post.id || "—" };
  return null;
}

/* ─────────────────────────────────────────
   SMALL COMPONENTS
───────────────────────────────────────── */
function TypeBadge({ type }) {
  var isLive = type === "LIVE";
  return (
    <span className={"rp-type-badge " + (isLive ? "live" : "post")}>
      {isLive ? <IconLive /> : <IconPost />}
      {type}
    </span>
  );
}

function IdChip({ value, onCopy }) {
  return (
    <span
      className="rp-id-chip"
      title={"Click to copy: " + value}
      onClick={function() { onCopy(value); }}
    >
      {truncate(value, 10)}
    </span>
  );
}

function Toast({ msg }) {
  return (
    <div className="rp-toast">
      <span>✓</span> {msg}
    </div>
  );
}

/* ─────────────────────────────────────────
   DETAIL MODAL
───────────────────────────────────────── */
function DetailModal({ item, onClose, onDelete }) {
  if (!item) return null;
  var type    = gType(item);
  var linked  = gLinkedId(item);

  function handleOverlay(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="rp-overlay" onClick={handleOverlay}>
      <div className="rp-modal">
        {/* Header */}
        <div className="rp-modal-hdr">
          <div className="rp-modal-title">
            <TypeBadge type={type} />
            Report Detail
          </div>
          <button className="rp-modal-close" type="button" onClick={onClose}>
            <IconX />
          </button>
        </div>

        {/* Body */}
        <div className="rp-modal-body">

          <div className="rp-detail-row">
            <span className="rp-dl">Object ID</span>
            <span className="rp-dv mono">{item.id}</span>
          </div>

          <div className="rp-detail-row">
            <span className="rp-dl">Report Type</span>
            <TypeBadge type={type} />
          </div>

          <div className="rp-detail-row">
            <span className="rp-dl">Message</span>
            <span className="rp-dv highlight">{gMessage(item)}</span>
          </div>

          <div className="rp-detail-row">
            <span className="rp-dl">Accuser ID</span>
            <span className="rp-dv mono">{gAccuserId(item)}</span>
          </div>

          <div className="rp-detail-row">
            <span className="rp-dl">Accused ID</span>
            <span className="rp-dv mono">{gAccusedId(item)}</span>
          </div>

          {linked && (
            <div className="rp-detail-row">
              <span className="rp-dl">{linked.label} ID</span>
              <span className="rp-dv mono">{linked.id}</span>
            </div>
          )}

          <div className="rp-detail-row">
            <span className="rp-dl">Created</span>
            <span className="rp-dv">{fmtDate(item.get("createdAt"))}</span>
          </div>

          <div className="rp-detail-row">
            <span className="rp-dl">Updated</span>
            <span className="rp-dv">{fmtDate(item.get("updatedAt"))}</span>
          </div>

        </div>

        {/* Footer */}
        <div className="rp-modal-ftr">
          <button className="rp-modal-cancel" type="button" onClick={onClose}>Close</button>
          <button className="rp-modal-delete" type="button"
            onClick={function() { onDelete(item); onClose(); }}>
            <IconTrash /> Delete Report
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   SKELETON
───────────────────────────────────────── */
function SkeletonRows() {
  return (
    <div className="rp-skeleton-wrap">
      {[1,2,3,4,5].map(function(i) {
        return (
          <div key={i} className="rp-skeleton-row">
            <div className="rp-sk s-xs" />
            <div className="rp-sk s-sm" />
            <div className="rp-sk s-md" />
            <div className="rp-sk s-lg" />
            <div className="rp-sk s-md" />
            <div className="rp-sk s-sm" />
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────
   STAT CARD
───────────────────────────────────────── */
function StatCard({ label, value, icon, variant }) {
  return (
    <div className={"rp-stat " + variant}>
      <div className="rp-stat-icon">{icon}</div>
      <div className="rp-stat-info">
        <span className="rp-stat-val">{value}</span>
        <span className="rp-stat-lbl">{label}</span>
      </div>
      <div className="rp-stat-glow" />
    </div>
  );
}

/* ─────────────────────────────────────────
   CSV EXPORT
───────────────────────────────────────── */
function exportCSV(rows) {
  var cols = ["ObjectId","Type","Message","AccuserId","AccusedId","LinkedId","CreatedAt"];
  var lines = rows.map(function(r) {
    var linked = gLinkedId(r);
    return cols.map(function(c) {
      var v = "";
      if (c === "ObjectId")  v = r.id;
      if (c === "Type")      v = gType(r);
      if (c === "Message")   v = gMessage(r);
      if (c === "AccuserId") v = gAccuserId(r);
      if (c === "AccusedId") v = gAccusedId(r);
      if (c === "LinkedId")  v = linked ? linked.id : "—";
      if (c === "CreatedAt") v = fmtDate(r.get("createdAt"));
      return '"' + String(v).replace(/"/g, '""') + '"';
    }).join(",");
  });
  var blob = new Blob([cols.join(",") + "\n" + lines.join("\n")], { type: "text/csv" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "reports.csv";
  a.click();
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function Reports() {
  var [rows,       setRows]       = useState([]);
  var [loading,    setLoading]    = useState(true);
  var [search,     setSearch]     = useState("");
  var [typeFilter, setTypeFilter] = useState("ALL");
  var [page,       setPage]       = useState(0);
  var [viewItem,   setViewItem]   = useState(null);
  var [toast,      setToast]      = useState("");

  /* ── showToast ── */
  var showToast = useCallback(function(msg) {
    setToast(msg);
    setTimeout(function() { setToast(""); }, 2500);
  }, []);

  /* ── fetchData ── */
  var fetchData = useCallback(function() {
    setLoading(true);
    var q = new Parse.Query("ReportsUser");
    q.descending("createdAt");
    q.limit(2000);
    q.find()
      .then(function(results) {
        setRows(results);
        setLoading(false);
      })
      .catch(function(err) {
        console.error("Report fetch error:", err);
        showToast("Failed to load reports.");
        setLoading(false);
      });
  }, [showToast]);

  useEffect(function() {
    fetchData();
  }, [fetchData]);

  /* Reset page on filter change */
  useEffect(function() { setPage(0); }, [search, typeFilter]);

  /* ── Copy ── */
  function handleCopy(val) {
    try {
      if (navigator.clipboard) navigator.clipboard.writeText(val).catch(function() {});
    } catch (err) {
      console.error("Copy error:", err);
    }
    showToast("Copied!");
  }

  /* ── Delete ── */
  var handleDelete = useCallback(async function(item) {
    if (!window.confirm("Delete this report? This cannot be undone.")) return;
    try {
      await item.destroy();
      setRows(function(prev) { return prev.filter(function(r) { return r.id !== item.id; }); });
      showToast("Report deleted.");
    } catch (err) {
      console.error("Delete error:", err);
      showToast("Delete failed.");
    }
  }, [showToast]);

  /* ── Stats ── */
  var liveCount = useMemo(function() {
    return rows.filter(function(r) { return gType(r) === "LIVE"; }).length;
  }, [rows]);

  var postCount = useMemo(function() {
    return rows.filter(function(r) { return gType(r) === "POST"; }).length;
  }, [rows]);

  /* ── Filter ── */
  var filtered = useMemo(function() {
    var list = rows;
    if (typeFilter !== "ALL") {
      list = list.filter(function(r) { return gType(r) === typeFilter; });
    }
    var q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(function(r) {
      return (
        r.id.toLowerCase().includes(q) ||
        gType(r).toLowerCase().includes(q) ||
        gMessage(r).toLowerCase().includes(q) ||
        gAccuserId(r).toLowerCase().includes(q) ||
        gAccusedId(r).toLowerCase().includes(q)
      );
    });
  }, [rows, typeFilter, search]);

  /* ── Pagination ── */
  var totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  var safePage   = Math.min(page, totalPages - 1);
  var pageItems  = filtered.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE);
  var startIdx   = filtered.length === 0 ? 0 : safePage * PER_PAGE + 1;
  var endIdx     = Math.min((safePage + 1) * PER_PAGE, filtered.length);

  var pageNums = useMemo(function() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, function(_, i) { return i; });
    var arr = [0];
    if (safePage > 2) arr.push("…");
    for (var i = Math.max(1, safePage - 1); i <= Math.min(totalPages - 2, safePage + 1); i++) arr.push(i);
    if (safePage < totalPages - 3) arr.push("…");
    arr.push(totalPages - 1);
    return arr;
  }, [totalPages, safePage]);

  /* ═══════════════════════════════════════
     RENDER
  ═══════════════════════════════════════ */
  return (
    <div className="rp-page">
      <div className="rp-topline" />

      {toast ? <Toast msg={toast} /> : null}

      {viewItem ? (
        <DetailModal
          item={viewItem}
          onClose={function() { setViewItem(null); }}
          onDelete={handleDelete}
        />
      ) : null}

      <div className="rp-wrap">

        {/* ── PAGE HEADER ── */}
        <div className="rp-page-hdr">
          <div className="rp-page-hdr-left">
            <div className="rp-page-logo"><IconFlag /></div>
            <div>
              <h1 className="rp-page-title">Reports</h1>
              <p className="rp-page-sub">Manage user-submitted reports from the Report Parse class</p>
            </div>
          </div>
          <div className="rp-hdr-actions">
            <button
              className="rp-csv-btn"
              type="button"
              disabled={loading || filtered.length === 0}
              onClick={function() { exportCSV(filtered); }}
            >
              <IconCsv /> Export CSV
            </button>
            <button
              className="rp-refresh-btn"
              type="button"
              disabled={loading}
              onClick={fetchData}
            >
              <IconRefresh /> Refresh
            </button>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="rp-stats">
          <StatCard
            label="Total Reports"
            value={rows.length}
            icon={<IconFlag />}
            variant="total"
          />
          <StatCard
            label="Live Reports"
            value={liveCount}
            icon={<IconLive />}
            variant="live"
          />
          <StatCard
            label="Post Reports"
            value={postCount}
            icon={<IconPost />}
            variant="post"
          />
          <StatCard
            label="Showing Now"
            value={filtered.length}
            icon={<IconSearch />}
            variant="filtered"
          />
        </div>

        {/* ── TOOLBAR ── */}
        <div className="rp-toolbar">
          {/* Search */}
          <div className="rp-search-wrap">
            <span className="rp-search-ico"><IconSearch /></span>
            <input
              className="rp-search"
              type="text"
              placeholder="Search by ID, type, message, user…"
              value={search}
              onChange={function(e) { setSearch(e.target.value); }}
            />
            {search ? (
              <button className="rp-search-clr" type="button"
                onClick={function() { setSearch(""); }}>
                <IconX />
              </button>
            ) : null}
          </div>

          {/* Filters */}
          <div className="rp-filters">
            {["ALL", "LIVE", "POST"].map(function(f) {
              return (
                <button
                  key={f}
                  type="button"
                  className={"rp-filter-btn" + (typeFilter === f ? " active " + f.toLowerCase() : "")}
                  onClick={function() { setTypeFilter(f); }}
                >
                  {f === "ALL" ? "All Types"
                    : f === "LIVE" ? <><IconLive /> Live</>
                    : <><IconPost /> Post</>
                  }
                </button>
              );
            })}
          </div>
        </div>

        {/* ── SUMMARY BAR ── */}
        <div className="rp-summary">
          <span className="rp-summary-text">
            {loading ? "Loading…" : (
              <>
                Showing <strong>{startIdx}–{endIdx}</strong> of{" "}
                <strong>{filtered.length}</strong> report{filtered.length !== 1 ? "s" : ""}
                {typeFilter !== "ALL" ? " · " + typeFilter + " only" : ""}
                {search ? ' · "' + search + '"' : ""}
              </>
            )}
          </span>
          <div className="rp-perpage">
            <span>Per page: <strong>{PER_PAGE}</strong></span>
          </div>
        </div>

        {/* ── MAIN CARD ── */}
        <div className="rp-card">

          {/* LOADING */}
          {loading ? <SkeletonRows /> : null}

          {/* EMPTY */}
          {!loading && filtered.length === 0 ? (
            <div className="rp-empty">
              <div className="rp-empty-icon">
                <IconFlag />
              </div>
              <p className="rp-empty-title">
                {rows.length === 0 ? "No reports found" : "No results match your filters"}
              </p>
              <p className="rp-empty-desc">
                {rows.length === 0
                  ? "Reports from the Report Parse class will appear here."
                  : "Try adjusting your search or filter."}
              </p>
            </div>
          ) : null}

          {/* DATA */}
          {!loading && filtered.length > 0 ? (
            <>
              {/* DESKTOP TABLE */}
              <div className="rp-tbl-scroll">
                <table className="rp-tbl">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Object ID</th>
                      <th>Type</th>
                      <th>Message</th>
                      <th>Accuser ID</th>
                      <th>Accused ID</th>
                      <th>Linked</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map(function(row, idx) {
                      var linked = gLinkedId(row);
                      var type   = gType(row);
                      return (
                        <tr key={row.id} className={type === "LIVE" ? "row-live" : "row-post"}>
                          <td><span className="rp-num">{startIdx + idx}</span></td>
                          <td>
                            <IdChip value={row.id} onCopy={handleCopy} />
                          </td>
                          <td><TypeBadge type={type} /></td>
                          <td>
                            <span className="rp-message" title={gMessage(row)}>
                              {truncate(gMessage(row), 34)}
                            </span>
                          </td>
                          <td>
                            <div className="rp-user-cell">
                              <div className="rp-user-av">
                                <IconUser />
                              </div>
                              <IdChip value={gAccuserId(row)} onCopy={handleCopy} />
                            </div>
                          </td>
                          <td>
                            <div className="rp-user-cell">
                              <div className="rp-user-av accused">
                                <IconUser />
                              </div>
                              <IdChip value={gAccusedId(row)} onCopy={handleCopy} />
                            </div>
                          </td>
                          <td>
                            {linked ? (
                              <div className="rp-linked-cell">
                                <span className={"rp-linked-label " + (linked.label === "Live" ? "live" : "post")}>
                                  {linked.label === "Live" ? <IconLive /> : <IconPost />}
                                  {linked.label}
                                </span>
                                <IdChip value={linked.id} onCopy={handleCopy} />
                              </div>
                            ) : (
                              <span className="rp-nil">—</span>
                            )}
                          </td>
                          <td>
                            <span className="rp-date">{fmtDateShort(row.get("createdAt"))}</span>
                          </td>
                          <td>
                            <div className="rp-actions">
                              <button
                                className="rp-btn-view"
                                type="button"
                                title="View detail"
                                onClick={function() { setViewItem(row); }}
                              >
                                <IconEye /> View
                              </button>
                              <button
                                className="rp-btn-del"
                                type="button"
                                title="Delete"
                                onClick={function() { handleDelete(row); }}
                              >
                                <IconTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="rp-mob-list">
                {pageItems.map(function(row, idx) {
                  var linked = gLinkedId(row);
                  var type   = gType(row);
                  return (
                    <div key={row.id} className={"rp-mob-card " + (type === "LIVE" ? "live" : "post")}>
                      {/* Header */}
                      <div className="rp-mob-hdr">
                        <div className="rp-mob-hdr-left">
                          <span className="rp-mob-num">#{startIdx + idx}</span>
                          <TypeBadge type={type} />
                        </div>
                        <span className="rp-mob-date">{fmtDateShort(row.get("createdAt"))}</span>
                      </div>

                      {/* Message highlight */}
                      <div className="rp-mob-message">
                        <span className="rp-mob-msg-label">Message</span>
                        <p className="rp-mob-msg-text">"{gMessage(row)}"</p>
                      </div>

                      {/* Fields grid */}
                      <div className="rp-mob-grid">
                        <div className="rp-mob-field">
                          <span className="rp-mob-lbl">Object ID</span>
                          <span
                            className="rp-mob-val mono clickable"
                            onClick={function() { handleCopy(row.id); }}
                          >
                            {truncate(row.id, 12)} <IconCopy />
                          </span>
                        </div>
                        <div className="rp-mob-field">
                          <span className="rp-mob-lbl">Accuser ID</span>
                          <span
                            className="rp-mob-val mono clickable"
                            onClick={function() { handleCopy(gAccuserId(row)); }}
                          >
                            {truncate(gAccuserId(row), 12)} <IconCopy />
                          </span>
                        </div>
                        <div className="rp-mob-field">
                          <span className="rp-mob-lbl">Accused ID</span>
                          <span
                            className="rp-mob-val mono clickable"
                            onClick={function() { handleCopy(gAccusedId(row)); }}
                          >
                            {truncate(gAccusedId(row), 12)} <IconCopy />
                          </span>
                        </div>
                        {linked ? (
                          <div className="rp-mob-field">
                            <span className="rp-mob-lbl">{linked.label} ID</span>
                            <span
                              className="rp-mob-val mono clickable"
                              onClick={function() { handleCopy(linked.id); }}
                            >
                              {truncate(linked.id, 12)} <IconCopy />
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {/* Actions */}
                      <div className="rp-mob-actions">
                        <button
                          className="rp-mob-btn view"
                          type="button"
                          onClick={function() { setViewItem(row); }}
                        >
                          <IconEye /> View Detail
                        </button>
                        <button
                          className="rp-mob-btn del"
                          type="button"
                          onClick={function() { handleDelete(row); }}
                        >
                          <IconTrash /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* PAGINATION */}
              <div className="rp-pagination">
                <div className="rp-page-info">
                  Page <strong>{safePage + 1}</strong> of <strong>{totalPages}</strong>
                </div>
                <div className="rp-page-btns">
                  <button
                    className="rp-pg-btn"
                    type="button"
                    disabled={safePage === 0}
                    onClick={function() { setPage(function(p) { return Math.max(0, p - 1); }); }}
                  >
                    <IconChevLeft />
                  </button>

                  {pageNums.map(function(p, i) {
                    if (p === "…") return <span key={"e" + i} className="rp-pg-ellipsis">…</span>;
                    return (
                      <button
                        key={p}
                        type="button"
                        className={"rp-pg-btn num" + (safePage === p ? " active" : "")}
                        onClick={function() { setPage(p); }}
                      >
                        {p + 1}
                      </button>
                    );
                  })}

                  <button
                    className="rp-pg-btn"
                    type="button"
                    disabled={safePage >= totalPages - 1}
                    onClick={function() { setPage(function(p) { return Math.min(totalPages - 1, p + 1); }); }}
                  >
                    <IconChevRight />
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}