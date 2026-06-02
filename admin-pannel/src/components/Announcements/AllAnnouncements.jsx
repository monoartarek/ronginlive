// AllAnnouncements.jsx
import React, {
  useEffect, useState, useMemo, useCallback, useRef,
} from "react";
import Parse from "../../parseConfig";
import "./AllAnnouncements.css";

/* ─────────────────────────────────────────
   ICONS
───────────────────────────────────────── */
const IC = {
  announce: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <path d="M22 8s-4 4-10 4S2 8 2 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M2 8v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 12v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  search: (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
      <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  x: (
    <svg width="9" height="9" fill="none" viewBox="0 0 24 24">
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  copy: (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  ),
  csv: (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M8 13c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  excel: (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M9 15l2-3 2 3M11 12v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  pdf: (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  print: (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="1.8"/>
      <rect x="6" y="14" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  ),
  edit: (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  trash: (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  save: (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  link: (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  eye: (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  ),
  image: (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
      <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  prev: (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  next: (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
};

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtViews(n) {
  if (n === null || n === undefined) return "—";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000)    return (n / 1000).toFixed(1) + "K";
  return String(n);
}

function getFileUrl(val) {
  if (!val) return null;
  if (typeof val === "string") return val;
  if (typeof val.url === "function") return val.url();
  if (val._url) return val._url;
  return null;
}

function truncate(str, len) {
  if (!str) return "—";
  return str.length > len ? str.slice(0, len) + "…" : str;
}

/* ─────────────────────────────────────────
   FIELD GETTERS
───────────────────────────────────────── */
function gTitle(r)    { return r.get("title")    || r.get("name")       || r.get("heading")   || "—"; }
function gSubtitle(r) { return r.get("subtitle") || r.get("subTitle")   || r.get("description") || r.get("body") || "—"; }
function gUrl(r)      { return r.get("url")      || r.get("link")       || r.get("actionUrl") || null; }
function gViews(r)    { return r.get("views")    ?? r.get("viewCount")  ?? r.get("viewsCount") ?? null; }
function gImage(r) {
  var val = r.get("previewImage") || r.get("image") || r.get("thumbnail") || r.get("picture") || r.get("banner") || null;
  return getFileUrl(val);
}

/* ─────────────────────────────────────────
   EXPORT UTILITIES
───────────────────────────────────────── */
function buildRows(items) {
  return items.map(function(r) {
    return {
      ObjectId:  r.id,
      Date:      fmtDate(r.get("createdAt")),
      Title:     gTitle(r),
      Subtitle:  gSubtitle(r),
      URL:       gUrl(r) || "—",
      Image:     gImage(r) || "—",
      Views:     String(gViews(r) !== null ? gViews(r) : "—"),
    };
  });
}

function doCSV(items) {
  var cols = ["ObjectId","Date","Title","Subtitle","URL","Image","Views"];
  var rows = buildRows(items).map(function(r) {
    return cols.map(function(c) { return '"' + String(r[c]).replace(/"/g,'""') + '"'; }).join(",");
  });
  var blob = new Blob([cols.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
  var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "announcements.csv"; a.click();
}

function doExcel(tableEl) {
  if (!tableEl) return;
  var a = document.createElement("a");
  a.href = "data:application/vnd.ms-excel," + encodeURIComponent(tableEl.outerHTML);
  a.download = "announcements.xls"; a.click();
}

function doPDF(items) {
  var cols = ["ObjectId","Date","Title","Subtitle","URL","Views"];
  var data = buildRows(items);
  var ths  = cols.map(function(c) { return "<th>" + c + "</th>"; }).join("");
  var trs  = data.map(function(r) {
    return "<tr>" + cols.map(function(c) {
      var v = r[c];
      return "<td>" + (c === "URL" && v !== "—" ? '<a href="' + v + '">' + v + "</a>" : v) + "</td>";
    }).join("") + "</tr>";
  }).join("");
  var html = [
    "<html><head><style>",
    "body{font-family:sans-serif;font-size:10px;color:#0f172a}",
    "h2{font-size:14px;margin-bottom:6px}p{font-size:9px;color:#64748b;margin-bottom:12px}",
    "table{width:100%;border-collapse:collapse}",
    "th{background:#0c1a2e;color:#fff;padding:7px 10px;text-align:left;font-size:9px;letter-spacing:.06em;text-transform:uppercase}",
    "td{padding:7px 10px;border-bottom:1px solid #e2e8f0}tr:nth-child(even) td{background:#f0fdf4}",
    "a{color:#059669}",
    "</style></head><body>",
    "<h2>Announcements Export</h2>",
    "<p>Generated " + new Date().toLocaleString() + " &middot; " + items.length + " records</p>",
    "<table><thead><tr>" + ths + "</tr></thead><tbody>" + trs + "</tbody></table></body></html>",
  ].join("");
  var w = window.open("","_blank"); w.document.write(html); w.document.close(); w.print();
}

function doCopy(items) {
  var cols = ["ObjectId","Date","Title","Subtitle","URL","Views"];
  var rows = buildRows(items).map(function(r) { return cols.map(function(c) { return r[c]; }).join("\t"); });
  var text = cols.join("\t") + "\n" + rows.join("\n");
  if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function() { fallbackCopy(text); });
  else fallbackCopy(text);
}

function fallbackCopy(text) {
  var ta = document.createElement("textarea"); ta.value = text;
  document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
}

/* ─────────────────────────────────────────
   IMAGE PREVIEW CELL
───────────────────────────────────────── */
function ImageCell({ url }) {
  var [open, setOpen] = useState(false);
  if (!url) return <span className="an-no-img">—</span>;
  return (
    <>
      <div className="an-img-cell" onClick={function() { setOpen(true); }} title="Click to preview">
        <img src={url} alt="preview" className="an-img-thumb" />
        <span className="an-img-overlay">{IC.eye}</span>
      </div>
      {open && (
        <div className="an-img-modal-overlay" onClick={function() { setOpen(false); }}>
          <div className="an-img-modal" onClick={function(e) { e.stopPropagation(); }}>
            <button className="an-img-modal-close" onClick={function() { setOpen(false); }}>✕</button>
            <img src={url} alt="full preview" className="an-img-modal-img" />
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────
   URL CELL
───────────────────────────────────────── */
function UrlCell({ url }) {
  if (!url) return <span className="an-no-url">—</span>;
  return (
    <a className="an-url-badge" href={url} target="_blank" rel="noopener noreferrer" title={url}>
      {IC.link}
      <span className="an-url-text">{url}</span>
    </a>
  );
}

/* ─────────────────────────────────────────
   EDIT MODAL
───────────────────────────────────────── */
function EditModal({ item, onClose, onSaved, showToast }) {
  var [title,    setTitle]    = useState(gTitle(item) === "—" ? "" : gTitle(item));
  var [subtitle, setSubtitle] = useState(gSubtitle(item) === "—" ? "" : gSubtitle(item));
  var [url,      setUrl]      = useState(gUrl(item) || "");
  var [views,    setViews]    = useState(gViews(item) !== null ? String(gViews(item)) : "");
  var [saving,   setSaving]   = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      if (item.get("title")       !== undefined) item.set("title",       title.trim());
      if (item.get("name")        !== undefined) item.set("name",        title.trim());
      if (item.get("heading")     !== undefined) item.set("heading",     title.trim());
      if (item.get("subtitle")    !== undefined) item.set("subtitle",    subtitle.trim());
      if (item.get("subTitle")    !== undefined) item.set("subTitle",    subtitle.trim());
      if (item.get("description") !== undefined) item.set("description", subtitle.trim());
      if (item.get("url")         !== undefined) item.set("url",         url.trim());
      if (item.get("link")        !== undefined) item.set("link",        url.trim());
      if (item.get("actionUrl")   !== undefined) item.set("actionUrl",   url.trim());
      var v = parseInt(views, 10);
      if (!isNaN(v)) {
        if (item.get("views")      !== undefined) item.set("views",      v);
        if (item.get("viewCount")  !== undefined) item.set("viewCount",  v);
        if (item.get("viewsCount") !== undefined) item.set("viewsCount", v);
      }
      await item.save();
      showToast("✓ Announcement updated");
      onSaved(item); onClose();
    } catch (err) {
      console.error("Save error:", err);
      showToast("✗ Failed to save — check console");
    } finally { setSaving(false); }
  }

  var imgUrl = gImage(item);

  return (
    <div className="an-overlay" onClick={function(e) { if (e.target === e.currentTarget) onClose(); }}>
      <div className="an-modal">
        <div className="an-modal-hdr">
          <div className="an-modal-title">{IC.edit} Edit Announcement</div>
          <button className="an-modal-x" onClick={onClose} type="button">{IC.x}</button>
        </div>

        {/* Object ID */}
        <div className="an-mfield">
          <label className="an-mlabel">Object ID</label>
          <input className="an-minput" value={item.id} readOnly
            style={{ opacity:.45, cursor:"not-allowed", fontFamily:"var(--an-mono)", fontSize:".74rem" }} />
        </div>

        {/* Title */}
        <div className="an-mfield">
          <label className="an-mlabel">Title</label>
          <input className="an-minput" value={title}
            onChange={function(e) { setTitle(e.target.value); }}
            placeholder="Announcement title" />
        </div>

        {/* Subtitle */}
        <div className="an-mfield">
          <label className="an-mlabel">Sub-title</label>
          <textarea className="an-mtextarea" value={subtitle}
            onChange={function(e) { setSubtitle(e.target.value); }}
            placeholder="Announcement sub-title or description"
            rows={3} />
        </div>

        {/* URL */}
        <div className="an-mfield">
          <label className="an-mlabel">URL</label>
          <input className="an-minput" value={url}
            onChange={function(e) { setUrl(e.target.value); }}
            placeholder="https://…" type="url" />
        </div>

        {/* Views */}
        <div className="an-mfield">
          <label className="an-mlabel">Views</label>
          <input className="an-minput" type="number" min="0" value={views}
            onChange={function(e) { setViews(e.target.value); }}
            placeholder="0" />
        </div>

        {/* Preview Image — read-only */}
        {imgUrl && (
          <div className="an-mfield">
            <label className="an-mlabel">Preview Image</label>
            <div className="an-mimg-wrap">
              <img src={imgUrl} alt="preview" className="an-mimg" />
              <a href={imgUrl} target="_blank" rel="noopener noreferrer" className="an-mimg-link">
                {IC.link} Open full image
              </a>
            </div>
          </div>
        )}

        <div className="an-modal-ftr">
          <button className="an-cancel" onClick={onClose} type="button">Cancel</button>
          <button className="an-save" onClick={handleSave} disabled={saving} type="button">
            {IC.save} {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function AllAnnouncements() {
  var [rows,      setRows]      = useState([]);
  var [loading,   setLoading]   = useState(true);
  var [search,    setSearch]    = useState("");
  var [page,      setPage]      = useState(0);
  var [perPage,   setPerPage]   = useState(10);
  var [editItem,  setEditItem]  = useState(null);
  var [toast,     setToast]     = useState("");
  var [sortBy,    setSortBy]    = useState("date");   // "date" | "views" | "title"
  var [sortDir,   setSortDir]   = useState("desc");
  var tableRef = useRef(null);

  /* ── Fetch ── */
  var fetchData = useCallback(async function() {
    setLoading(true);
    try {
      var q = new Parse.Query(Parse.Object.extend("Announcements"));
      q.descending("createdAt"); q.limit(2000);
      var results = await q.find();
      setRows(results);
    } catch (err) { console.error("Fetch error:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(function() { fetchData(); }, [fetchData]);
  useEffect(function() { setPage(0); }, [search, sortBy, sortDir, perPage]);

  var showToast = useCallback(function(msg) {
    setToast(msg);
    setTimeout(function() { setToast(""); }, 2500);
  }, []);

  var handleDelete = useCallback(async function(item) {
    if (!window.confirm('Delete "' + gTitle(item) + '"?')) return;
    try {
      await item.destroy();
      setRows(function(prev) { return prev.filter(function(r) { return r.id !== item.id; }); });
      showToast("✓ Announcement deleted");
    } catch (err) { console.error("Delete error:", err); showToast("✗ Delete failed"); }
  }, [showToast]);

  var handleSaved = useCallback(function(updated) {
    setRows(function(prev) { return prev.map(function(r) { return r.id === updated.id ? updated : r; }); });
  }, []);

  /* ── Stats ── */
  var totalViews = useMemo(function() {
    return rows.reduce(function(acc, r) { return acc + (gViews(r) || 0); }, 0);
  }, [rows]);

  var withImageCount = useMemo(function() {
    return rows.filter(function(r) { return !!gImage(r); }).length;
  }, [rows]);

  /* ── Sort helper ── */
  function toggleSort(col) {
    if (sortBy === col) setSortDir(function(d) { return d === "asc" ? "desc" : "asc"; });
    else { setSortBy(col); setSortDir("asc"); }
  }

  function SortIcon({ col }) {
    if (sortBy !== col) return <span className="an-sort-idle">⇅</span>;
    return <span className="an-sort-active">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  /* ── Filter + Sort ── */
  var filtered = useMemo(function() {
    var list = rows;
    var q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(function(r) {
        return (
          r.id.toLowerCase().includes(q) ||
          gTitle(r).toLowerCase().includes(q) ||
          gSubtitle(r).toLowerCase().includes(q) ||
          (gUrl(r) || "").toLowerCase().includes(q)
        );
      });
    }
    // sort
    list = list.slice().sort(function(a, b) {
      var va, vb;
      if (sortBy === "views") {
        va = gViews(a) || 0; vb = gViews(b) || 0;
        return sortDir === "asc" ? va - vb : vb - va;
      }
      if (sortBy === "title") {
        va = gTitle(a).toLowerCase(); vb = gTitle(b).toLowerCase();
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      // date
      va = new Date(a.get("createdAt") || 0).getTime();
      vb = new Date(b.get("createdAt") || 0).getTime();
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return list;
  }, [rows, search, sortBy, sortDir]);

  /* ── Pagination ── */
  var totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  var safePage   = Math.min(page, totalPages - 1);
  var pageItems  = filtered.slice(safePage * perPage, (safePage + 1) * perPage);
  var startIdx   = filtered.length === 0 ? 0 : safePage * perPage + 1;
  var endIdx     = Math.min((safePage + 1) * perPage, filtered.length);

  var pageNums = useMemo(function() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, function(_, i) { return i; });
    var arr = [0];
    if (safePage > 2) arr.push("…");
    for (var i = Math.max(1, safePage-1); i <= Math.min(totalPages-2, safePage+1); i++) arr.push(i);
    if (safePage < totalPages-3) arr.push("…");
    arr.push(totalPages-1);
    return arr;
  }, [totalPages, safePage]);

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <div className="an-page">
      <div className="an-topline" />
      <div className="an-wrap">

        {/* HEADER */}
        <div className="an-header">
          <div className="an-hdr-left">
            <div className="an-logo">{IC.announce}</div>
            <div>
              <div className="an-title">All Announcements</div>
              <div className="an-sub">Manage announcements, links &amp; preview images</div>
            </div>
          </div>
          <div className="an-chips">
            <div className="an-chip total">📢 {rows.length} total</div>
            <div className="an-chip images">🖼️ {withImageCount} with images</div>
            <div className="an-chip views">👁 {fmtViews(totalViews)} views</div>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="an-toolbar">
          {/* Search */}
          <div className="an-srch-wrap">
            <span className="an-srch-ico">{IC.search}</span>
            <input className="an-srch" type="text"
              placeholder="Search by title, subtitle or URL…"
              value={search} onChange={function(e) { setSearch(e.target.value); }} />
            {search && (
              <button className="an-srch-clr" type="button"
                onClick={function() { setSearch(""); }}>{IC.x}</button>
            )}
          </div>

          {/* Sort pills */}
          <div className="an-filters">
            {[
              { key:"date",  label:"Date" },
              { key:"title", label:"Title" },
              { key:"views", label:"Views" },
            ].map(function(s) {
              return (
                <button key={s.key}
                  className={"an-fbtn" + (sortBy === s.key ? " act" : "")}
                  onClick={function() { toggleSort(s.key); }} type="button">
                  {s.label} {sortBy === s.key ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </button>
              );
            })}
          </div>

          {/* Exports */}
          <div className="an-exports">
            <button className="an-exp copy" type="button"
              onClick={function() { doCopy(filtered); showToast("✓ Copied to clipboard!"); }}>
              {IC.copy} <span>Copy</span>
            </button>
            <button className="an-exp csv" type="button" onClick={function() { doCSV(filtered); }}>
              {IC.csv} <span>CSV</span>
            </button>
            <button className="an-exp excel" type="button" onClick={function() { doExcel(tableRef.current); }}>
              {IC.excel} <span>Excel</span>
            </button>
            <button className="an-exp pdf" type="button" onClick={function() { doPDF(filtered); }}>
              {IC.pdf} <span>PDF</span>
            </button>
            <button className="an-exp print" type="button" onClick={function() { window.print(); }}>
              {IC.print} <span>Print</span>
            </button>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="an-summary">
          <div className="an-info">
            Showing <strong>{startIdx}–{endIdx}</strong> of <strong>{filtered.length}</strong> announcements
            {search && ' matching "' + search + '"'}
          </div>
          <div className="an-ppwrap">
            <span>Rows:</span>
            <select className="an-ppsel" value={perPage}
              onChange={function(e) { setPerPage(Number(e.target.value)); }}>
              {[5,10,20,50,100].map(function(n) { return <option key={n} value={n}>{n}</option>; })}
            </select>
          </div>
        </div>

        {/* CARD */}
        <div className="an-card">
          {loading ? (
            <div className="an-loading">
              <div className="an-spinner" />
              Loading announcements…
            </div>
          ) : filtered.length === 0 ? (
            <div className="an-empty">
              <div className="an-empty-ico">📢</div>
              <div className="an-empty-title">
                {search ? "No results found" : "No announcements yet"}
              </div>
              <div className="an-empty-desc">
                {search ? 'Nothing matches "' + search + '"' : "Announcements will appear here once added."}
              </div>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="an-tbl-scroll">
                <table className="an-tbl" ref={tableRef}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th className="an-th-sort" onClick={function() { toggleSort("date"); }}>
                        Date <SortIcon col="date" />
                      </th>
                      <th>URL</th>
                      <th className="an-th-sort" onClick={function() { toggleSort("title"); }}>
                        Title <SortIcon col="title" />
                      </th>
                      <th>Sub-title</th>
                      <th>Preview Image</th>
                      <th className="an-th-sort" onClick={function() { toggleSort("views"); }}>
                        Views <SortIcon col="views" />
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map(function(item, idx) {
                      var title    = gTitle(item);
                      var subtitle = gSubtitle(item);
                      var url      = gUrl(item);
                      var imgUrl   = gImage(item);
                      var views    = gViews(item);
                      return (
                        <tr key={item.id}>
                          <td><span className="an-num">{startIdx + idx}</span></td>
                          <td><span className="an-date">{fmtDate(item.get("createdAt"))}</span></td>
                          <td><UrlCell url={url} /></td>
                          <td>
                            <div className="an-title-cell">
                              <span className="an-title-text" title={title}>{truncate(title, 36)}</span>
                            </div>
                          </td>
                          <td>
                            <span className="an-subtitle-text" title={subtitle !== "—" ? subtitle : ""}>
                              {truncate(subtitle, 48)}
                            </span>
                          </td>
                          <td><ImageCell url={imgUrl} /></td>
                          <td>
                            <span className="an-views">
                              {IC.eye} {fmtViews(views)}
                            </span>
                          </td>
                          <td>
                            <div className="an-actions">
                              <button className="an-btn-edit" type="button"
                                onClick={function() { setEditItem(item); }}>{IC.edit} Edit</button>
                              <button className="an-btn-del" type="button"
                                onClick={function() { handleDelete(item); }}>{IC.trash} Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="an-mob-list">
                {pageItems.map(function(item) {
                  var title    = gTitle(item);
                  var subtitle = gSubtitle(item);
                  var url      = gUrl(item);
                  var imgUrl   = gImage(item);
                  var views    = gViews(item);
                  return (
                    <div key={item.id} className="an-mob-card">
                      {/* Top row with image + title */}
                      <div className="an-mob-top">
                        {imgUrl
                          ? <img src={imgUrl} alt="" className="an-mob-thumb" />
                          : <div className="an-mob-thumb-empty">📢</div>
                        }
                        <div style={{ flex:1, minWidth:0 }}>
                          <div className="an-title-text" style={{ fontSize:".9rem", marginBottom:3 }}>
                            {truncate(title, 44)}
                          </div>
                          <div className="an-subtitle-text" style={{ fontSize:".75rem" }}>
                            {truncate(subtitle, 60)}
                          </div>
                        </div>
                      </div>

                      <div className="an-mob-grid">
                        <div className="an-mob-field">
                          <span className="an-mob-lbl">Date</span>
                          <span className="an-mob-val">{fmtDate(item.get("createdAt"))}</span>
                        </div>
                        <div className="an-mob-field">
                          <span className="an-mob-lbl">Views</span>
                          <span className="an-views" style={{ fontSize:".82rem" }}>
                            {IC.eye} {fmtViews(views)}
                          </span>
                        </div>
                        <div className="an-mob-field" style={{ gridColumn:"1/-1" }}>
                          <span className="an-mob-lbl">URL</span>
                          <UrlCell url={url} />
                        </div>
                      </div>

                      <div className="an-mob-footer">
                        <button className="an-btn-edit" type="button"
                          onClick={function() { setEditItem(item); }}>{IC.edit} Edit</button>
                        <button className="an-btn-del" type="button"
                          onClick={function() { handleDelete(item); }}>{IC.trash} Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* PAGINATION */}
          {!loading && filtered.length > 0 && (
            <div className="an-footer">
              <div className="an-foot-info">
                <strong>{startIdx}–{endIdx}</strong> of <strong>{filtered.length}</strong> announcements
              </div>
              <div className="an-pages">
                <button className="an-pg" type="button"
                  onClick={function() { setPage(function(p) { return Math.max(0,p-1); }); }}
                  disabled={safePage === 0}>{IC.prev}</button>
                {pageNums.map(function(p, i) {
                  if (p === "…") return <button key={"el"+i} className="an-pg" disabled type="button">…</button>;
                  return (
                    <button key={p} className={"an-pg" + (safePage===p?" on":"")}
                      onClick={function() { setPage(p); }} type="button">{p+1}</button>
                  );
                })}
                <button className="an-pg" type="button"
                  onClick={function() { setPage(function(p) { return Math.min(totalPages-1,p+1); }); }}
                  disabled={safePage >= totalPages-1}>{IC.next}</button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* EDIT MODAL */}
      {editItem && (
        <EditModal item={editItem}
          onClose={function() { setEditItem(null); }}
          onSaved={handleSaved} showToast={showToast} />
      )}

      {/* TOAST */}
      {toast && <div className="an-toast">{toast}</div>}
    </div>
  );
}