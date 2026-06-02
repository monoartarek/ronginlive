import React, {
  useEffect, useState, useMemo, useCallback, useRef,
} from "react";
import Parse from "../../parseConfig";
import "./Gifts.css";

/* ══════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════ */
const GRADIENTS = [
  "linear-gradient(135deg,#f59e0b,#f97316)",
  "linear-gradient(135deg,#8b5cf6,#ec4899)",
  "linear-gradient(135deg,#14b8a6,#3b82f6)",
  "linear-gradient(135deg,#f43f5e,#f97316)",
  "linear-gradient(135deg,#10b981,#14b8a6)",
  "linear-gradient(135deg,#38bdf8,#8b5cf6)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#06b6d4,#3b82f6)",
];

const avatarGrad = (s = "") => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h += s.charCodeAt(i);
  return GRADIENTS[h % GRADIENTS.length];
};

const initials = (name = "") =>
  name ? name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }) : "—";

const fmtCredits = (n) => {
  if (!n && n !== 0) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
};

/* ── Field readers — handles all possible field names ── */
const getName     = r => r.get("name")       || r.get("giftName") || r.get("title")    || "Unnamed Gift";
const getCategory = r => r.get("categories") || r.get("category") || r.get("type")     || "";
const getCredits  = r => r.get("coins")      ?? r.get("credits")  ?? r.get("price")    ?? null;
const getImage    = r => {
  /* Your Parse class uses "file" for image and "preview" for SVGA preview */
  /* Try preview first (PNG preview of SVGA), then file (if PNG), then other fields */
  const preview = r.get("preview");
  const file    = r.get("file");
  const img     = r.get("image") || r.get("giftImage") || r.get("photo") || r.get("icon") || r.get("thumbnail");

  const extractUrl = (f) => {
    if (!f) return null;
    if (typeof f === "string") return f;
    if (typeof f.url === "function") return f.url();
    if (f._url) return f._url;
    if (f.url && typeof f.url === "string") return f.url;
    return null;
  };

  /* Use preview if it's a PNG (best for display) */
  const previewUrl = extractUrl(preview);
  if (previewUrl) return previewUrl;

  /* Use file only if it's an image (not .svga) */
  const fileUrl = extractUrl(file);
  if (fileUrl && !fileUrl.toLowerCase().endsWith(".svga")) return fileUrl;

  /* Other possible fields */
  return extractUrl(img);
};

/* ── Category color ── */
const CAT_COLORS = [
  { bg: "rgba(139,92,246,0.15)",  border: "rgba(139,92,246,0.35)",  text: "#c4b5fd" },
  { bg: "rgba(20,184,166,0.15)",  border: "rgba(20,184,166,0.35)",  text: "#5eead4" },
  { bg: "rgba(56,189,248,0.12)",  border: "rgba(56,189,248,0.30)",  text: "#38bdf8" },
  { bg: "rgba(244,63,94,0.12)",   border: "rgba(244,63,94,0.30)",   text: "#fda4af" },
  { bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.28)",  text: "#6ee7b7" },
  { bg: "rgba(245,158,11,0.15)",  border: "rgba(245,158,11,0.35)",  text: "#fbbf24" },
  { bg: "rgba(249,115,22,0.12)",  border: "rgba(249,115,22,0.30)",  text: "#fdba74" },
  { bg: "rgba(99,102,241,0.12)",  border: "rgba(99,102,241,0.30)",  text: "#a5b4fc" },
];
const catColor = (cat = "") => {
  let h = 0; for (let i = 0; i < cat.length; i++) h += cat.charCodeAt(i);
  return CAT_COLORS[h % CAT_COLORS.length];
};

/* ── Export utils ── */
const toRows = items => items.map(r => ({
  ObjectId: r.id,
  Date:     fmtDate(r.get("createdAt")),
  Name:     getName(r),
  Category: getCategory(r) || "—",
  Credits:  getCredits(r)  ?? 0,
  Image:    getImage(r)    || "—",
}));

const doCSV = (items) => {
  const cols = ["ObjectId","Date","Name","Category","Credits"];
  const rows = toRows(items).map(r => cols.map(c => `"${String(r[c]).replace(/"/g,'""')}"`).join(","));
  const blob = new Blob([cols.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "gifts_export.csv"; a.click();
};

const doPDF = (items) => {
  const cols = ["ObjectId","Date","Name","Category","Credits"];
  const data = toRows(items);
  const ths  = cols.map(c => `<th>${c}</th>`).join("");
  const trs  = data.map(r =>
    `<tr>${cols.map(c => `<td>${r[c]}</td>`).join("")}</tr>`
  ).join("");
  const html = `<html><head><style>
    body{font-family:sans-serif;font-size:10px;color:#1e293b}
    h2{font-size:14px;margin-bottom:6px}
    table{width:100%;border-collapse:collapse}
    th{background:#07090f;color:#fff;padding:7px 10px;text-align:left;font-size:9px;letter-spacing:.06em}
    td{padding:6px 10px;border-bottom:1px solid #e2e8f0}
    tr:nth-child(even) td{background:#fafafa}
  </style></head><body>
    <h2>🎁 Gifts Export — ${new Date().toLocaleString()} · ${items.length} records</h2>
    <table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
  </body></html>`;
  const w = window.open("","_blank"); w.document.write(html); w.document.close(); w.print();
};

/* ══════════════════════════════════════════════════════
   IMAGE LIGHTBOX
══════════════════════════════════════════════════════ */
const Lightbox = ({ src, name, onClose }) => (
  <div className="gf-lightbox" onClick={onClose}>
    <div className="gf-lightbox-inner" onClick={e => e.stopPropagation()}>
      <button className="gf-lightbox-close" onClick={onClose}>✕</button>
      <img src={src} alt={name} className="gf-lightbox-img" />
      <p className="gf-lightbox-name">{name}</p>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════
   EDIT MODAL
══════════════════════════════════════════════════════ */
const EditModal = ({ item, categories, onClose, onSaved, showToast }) => {
  const [name,     setName]     = useState(getName(item));
  const [category, setCategory] = useState(getCategory(item));
  const [credits,  setCredits]  = useState(String(getCredits(item) ?? ""));
  const [saving,   setSaving]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      /* name field */
      if (item.get("name")     !== undefined) item.set("name",     name);
      if (item.get("giftName") !== undefined) item.set("giftName", name);
      if (item.get("title")    !== undefined) item.set("title",    name);
      /* category field — your data uses "categories" */
      if (item.get("categories") !== undefined) item.set("categories", category);
      else if (item.get("category") !== undefined) item.set("category", category);
      else if (item.get("type")     !== undefined) item.set("type",     category);
      /* credits field — your data uses "coins" */
      const c = parseFloat(credits);
      if (!isNaN(c)) {
        if (item.get("coins")   !== undefined) item.set("coins",   c);
        else if (item.get("credits") !== undefined) item.set("credits", c);
        else if (item.get("price")   !== undefined) item.set("price",   c);
      }
      await item.save();
      showToast("Gift updated ✓", "success");
      onSaved(item);
      onClose();
    } catch (err) {
      showToast("Failed to save: " + err.message, "error");
    } finally { setSaving(false); }
  };

  return (
    <div className="gf-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="gf-modal">
        <div className="gf-modal-header">
          <span className="gf-modal-title">✏ Edit Gift</span>
          <button className="gf-modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Preview image if exists */}
        {getImage(item) && (
          <div className="gf-modal-img-wrap">
            <img src={getImage(item)} alt={name} className="gf-modal-img-preview" />
          </div>
        )}

        <div className="gf-form-field">
          <label className="gf-form-label">Object ID</label>
          <input className="gf-form-input gf-form-input--mono" value={item.id} readOnly />
        </div>
        <div className="gf-form-field">
          <label className="gf-form-label">Name</label>
          <input className="gf-form-input" value={name}
            onChange={e => setName(e.target.value)} placeholder="Gift name" />
        </div>
        <div className="gf-form-field">
          <label className="gf-form-label">Category</label>
          {categories.length > 1 ? (
            <select className="gf-form-select" value={category}
              onChange={e => setCategory(e.target.value)}>
              <option value="">Select category…</option>
              {categories.filter(Boolean).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          ) : (
            <input className="gf-form-input" value={category}
              onChange={e => setCategory(e.target.value)} placeholder="e.g. Special, Premium…" />
          )}
        </div>
        <div className="gf-form-field">
          <label className="gf-form-label">Credits / Price</label>
          <input className="gf-form-input" type="number" min="0"
            value={credits} onChange={e => setCredits(e.target.value)} placeholder="0" />
        </div>
        <div className="gf-modal-footer">
          <button className="gf-modal-cancel" onClick={onClose}>Cancel</button>
          <button className="gf-modal-save" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "💾 Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   DELETE CONFIRM MODAL
══════════════════════════════════════════════════════ */
const DeleteModal = ({ item, onClose, onConfirm }) => (
  <div className="gf-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="gf-modal gf-modal--sm">
      <div className="gf-modal-header">
        <span className="gf-modal-title gf-modal-title--danger">🗑 Delete Gift</span>
        <button className="gf-modal-close-btn" onClick={onClose}>✕</button>
      </div>
      {getImage(item) && (
        <div className="gf-modal-img-wrap">
          <img src={getImage(item)} alt={getName(item)} className="gf-modal-img-preview" />
        </div>
      )}
      <p className="gf-delete-desc">
        Delete <strong>"{getName(item)}"</strong>?<br/>
        <span>This action cannot be undone.</span>
      </p>
      <div className="gf-modal-footer">
        <button className="gf-modal-cancel" onClick={onClose}>Cancel</button>
        <button className="gf-modal-delete" onClick={onConfirm}>Yes, Delete</button>
      </div>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════
   GIFT CARD
══════════════════════════════════════════════════════ */
const GiftCard = ({ item, idx, onEdit, onDelete, onImageClick, showToast }) => {
  const name     = getName(item);
  const category = getCategory(item);
  const credits  = getCredits(item);
  const imgUrl   = getImage(item);
  const cc       = catColor(category);

  return (
    <div className="gf-card" style={{ animationDelay: `${idx * 35}ms` }}>

      {/* Image / Placeholder */}
      <div className="gf-card-img-wrap"
        onClick={() => imgUrl && onImageClick(imgUrl, name)}>
        {imgUrl ? (
          <>
            <img src={imgUrl} alt={name} className="gf-card-img" />
            <div className="gf-card-img-overlay">
              <span className="gf-card-img-zoom">🔍 View</span>
            </div>
          </>
        ) : (
          <div className="gf-card-img-placeholder" style={{ background: avatarGrad(name) }}>
            <span className="gf-card-img-initials">{initials(name)}</span>
            <span className="gf-card-img-no-img">No Image</span>
          </div>
        )}
        {/* Credits badge on image */}
        <div className="gf-card-credits-badge">
          🪙 {fmtCredits(credits)}
        </div>
      </div>

      {/* Body */}
      <div className="gf-card-body">
        {/* Name */}
        <p className="gf-card-name" title={name}>{name}</p>

        {/* Category */}
        {category ? (
          <span className="gf-cat-badge"
            style={{ background: cc.bg, borderColor: cc.border, color: cc.text }}>
            <span className="gf-cat-dot" style={{ background: cc.text }} />
            {category}
          </span>
        ) : (
          <span className="gf-cat-badge gf-cat-badge--empty">Uncategorized</span>
        )}

        {/* Meta row */}
        <div className="gf-card-meta">
          <div className="gf-card-meta-item">
            <span className="gf-meta-label">Object ID</span>
            <span className="gf-meta-oid"
              title="Click to copy"
              onClick={() => {
                navigator.clipboard?.writeText(item.id);
                showToast("Object ID copied!", "copy");
              }}>
              {item.id.slice(0, 8)}… ⎘
            </span>
          </div>
          <div className="gf-card-meta-item">
            <span className="gf-meta-label">Added</span>
            <span className="gf-meta-val">{fmtDate(item.get("createdAt"))}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="gf-card-actions">
          <button className="gf-btn-edit" onClick={() => onEdit(item)}>
            ✏ Edit
          </button>
          <button className="gf-btn-del" onClick={() => onDelete(item)}>
            🗑
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export default function Gifts() {
  const [rows,       setRows]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [searchInput,setSearchInput]= useState("");
  const [catFilter,  setCatFilter]  = useState("All");
  const [sortBy,     setSortBy]     = useState("newest");
  const [page,       setPage]       = useState(0);
  const [perPage,    setPerPage]    = useState(24);
  const [editItem,   setEditItem]   = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [lightbox,   setLightbox]   = useState(null); // { src, name }
  const [toast,      setToast]      = useState(null);

  /* ── debounce search ── */
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* ── toast ── */
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }, []);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const q = new Parse.Query(Parse.Object.extend("Gifts"));
      q.descending("createdAt");
      q.limit(3000);
      const res = await q.find();
      setRows(res);
    } catch (err) {
      showToast("Fetch failed: " + err.message, "error");
    } finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(0); }, [search, catFilter, sortBy, perPage]);

  /* ── Categories ── */
  // const categories = useMemo(() => {
  //   const s = new Set(rows.map(r => getCategory(r)).filter(Boolean));
  //   return Array.from(s).sort();
  // }, [rows]);

  //selected items are show using useMemo
  const categories = useMemo(() => {
    const blocked = ["avatar_frame", "entrance_effect", "party_theme"];

    const s = new Set(
      rows
        .map(r => getCategory(r))
        .filter(cat => cat && !blocked.includes(cat))
    );

    return Array.from(s).sort();
  }, [rows]); 

  /* ── Stats ── */
  const totalCredits = useMemo(() =>
    rows.reduce((acc, r) => acc + (getCredits(r) || 0), 0), [rows]);
  const withImages = useMemo(() =>
    rows.filter(r => getImage(r)).length, [rows]);

  /* ── Filter + sort ── */
  // const filtered = useMemo(() => {
  //   let list = rows;
  //   if (catFilter !== "All") list = list.filter(r => getCategory(r) === catFilter);
  //   const q = search.trim().toLowerCase();
  //   if (q) {
  //     list = list.filter(r =>
  //       r.id.toLowerCase().includes(q) ||
  //       getName(r).toLowerCase().includes(q) ||
  //       getCategory(r).toLowerCase().includes(q)
  //     );
  //   }
  //   if (sortBy === "newest")     list = [...list].sort((a,b) => new Date(b.get("createdAt")) - new Date(a.get("createdAt")));
  //   if (sortBy === "oldest")     list = [...list].sort((a,b) => new Date(a.get("createdAt")) - new Date(b.get("createdAt")));
  //   if (sortBy === "name")       list = [...list].sort((a,b) => getName(a).localeCompare(getName(b)));
  //   if (sortBy === "credits-hi") list = [...list].sort((a,b) => (getCredits(b)||0) - (getCredits(a)||0));
  //   if (sortBy === "credits-lo") list = [...list].sort((a,b) => (getCredits(a)||0) - (getCredits(b)||0));
  //   return list;
  // }, [rows, search, catFilter, sortBy]);

 //removed from all gifts also 
  const filtered = useMemo(() => {
    const blocked = ["avatar_frame", "entrance_effect", "party_theme"];

    // remove unwanted categories completely
    let list = rows.filter(r => !blocked.includes(getCategory(r)));

    if (catFilter !== "All") {
      list = list.filter(r => getCategory(r) === catFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        r.id.toLowerCase().includes(q) ||
        getName(r).toLowerCase().includes(q) ||
        getCategory(r).toLowerCase().includes(q)
      );
    }

    if (sortBy === "newest")
      list = [...list].sort((a,b) => new Date(b.get("createdAt")) - new Date(a.get("createdAt")));
    if (sortBy === "oldest")
      list = [...list].sort((a,b) => new Date(a.get("createdAt")) - new Date(b.get("createdAt")));
    if (sortBy === "name")
      list = [...list].sort((a,b) => getName(a).localeCompare(getName(b)));
    if (sortBy === "credits-hi")
      list = [...list].sort((a,b) => (getCredits(b)||0) - (getCredits(a)||0));
    if (sortBy === "credits-lo")
      list = [...list].sort((a,b) => (getCredits(a)||0) - (getCredits(b)||0));

    return list;
  }, [rows, search, catFilter, sortBy]);

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage   = Math.min(page, totalPages - 1);
  const pageItems  = filtered.slice(safePage * perPage, (safePage + 1) * perPage);
  const startIdx   = filtered.length === 0 ? 0 : safePage * perPage + 1;
  const endIdx     = Math.min((safePage + 1) * perPage, filtered.length);

  /* ── Page range ── */
  const pageNums = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
    const arr = [0];
    if (safePage > 2) arr.push("…");
    for (let i = Math.max(1, safePage-1); i <= Math.min(totalPages-2, safePage+1); i++) arr.push(i);
    if (safePage < totalPages - 3) arr.push("…");
    arr.push(totalPages - 1);
    return arr;
  }, [totalPages, safePage]);

  /* ── Delete ── */
  const handleDelete = useCallback(async () => {
    if (!deleteItem) return;
    const item = deleteItem;
    setDeleteItem(null);
    try {
      await item.destroy();
      setRows(prev => prev.filter(r => r.id !== item.id));
      showToast("Gift deleted ✓", "success");
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    }
  }, [deleteItem, showToast]);

  /* ── After edit ── */
  const handleSaved = useCallback(updated => {
    setRows(prev => prev.map(r => r.id === updated.id ? updated : r));
  }, []);

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <div className="gf-page">
      <div className="gf-topbar" />

      <div className="gf-inner">

        {/* ── HEADER ── */}
        <div className="gf-header">
          <div className="gf-header-left">
            <div className="gf-logo">🎁</div>
            <div>
              <h1 className="gf-title">Gifts</h1>
              <p className="gf-subtitle">Manage gift items, images &amp; credit values</p>
            </div>
          </div>
          <div className="gf-header-stats">
            <div className="gf-stat-chip gf-stat-chip--gold">
              🎁 <strong>{rows.length}</strong> gifts
            </div>
            <div className="gf-stat-chip gf-stat-chip--teal">
              🪙 <strong>{fmtCredits(totalCredits)}</strong> credits
            </div>
            <div className="gf-stat-chip gf-stat-chip--violet">
              🖼 <strong>{withImages}</strong> with images
            </div>
          </div>
        </div>

        {/* ── TOOLBAR ── */}
        <div className="gf-toolbar">
          {/* Search */}
          <div className="gf-search-wrap">
            <span className="gf-search-ico">⌕</span>
            <input className="gf-search"
              placeholder="Search by ID, name or category…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)} />
            {searchInput && (
              <button className="gf-search-x"
                onClick={() => { setSearchInput(""); setSearch(""); }}>✕</button>
            )}
          </div>

          {/* Sort */}
          <select className="gf-sort-select" value={sortBy}
            onChange={e => setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name A–Z</option>
            <option value="credits-hi">Credits ↓</option>
            <option value="credits-lo">Credits ↑</option>
          </select>

          {/* Per page */}
          <select className="gf-sort-select" value={perPage}
            onChange={e => setPerPage(Number(e.target.value))}>
            {[12, 24, 48, 96].map(n => (
              <option key={n} value={n}>{n} per page</option>
            ))}
          </select>

          {/* Export */}
          <div className="gf-export-group">
            <button className="gf-exp gf-exp--csv"
              onClick={() => doCSV(filtered)}>📄 CSV</button>
            <button className="gf-exp gf-exp--pdf"
              onClick={() => doPDF(filtered)}>📑 PDF</button>
            <button className="gf-exp gf-exp--refresh"
              onClick={fetchData} disabled={loading}>
              {loading ? "⟳" : "↻"} Refresh
            </button>
          </div>
        </div>

        {/* ── CATEGORY FILTER ── */}
        <div className="gf-cat-bar">
          <button
            className={`gf-cat-btn ${catFilter === "All" ? "on" : ""}`}
            onClick={() => setCatFilter("All")}>
            All <span className="gf-cat-count">{rows.length}</span>
          </button>
          {categories.map(cat => {
            const cc = catColor(cat);
            return (
              <button key={cat}
                className={`gf-cat-btn ${catFilter === cat ? "on" : ""}`}
                style={catFilter === cat
                  ? { background: cc.bg, borderColor: cc.border, color: cc.text }
                  : {}}
                onClick={() => setCatFilter(cat)}>
                {cat}
                <span className="gf-cat-count">
                  {rows.filter(r => getCategory(r) === cat).length}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── RESULTS INFO ── */}
        <div className="gf-results-bar">
          <span className="gf-results-text">
            {filtered.length === 0
              ? "No results"
              : `Showing ${startIdx}–${endIdx} of ${filtered.length} gifts`
            }
            {search && ` · "${search}"`}
            {catFilter !== "All" && ` · ${catFilter}`}
          </span>
        </div>

        {/* ── CARDS ── */}
        {loading ? (
          <div className="gf-loading">
            <div className="gf-spinner" />
            <p>Loading gifts…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="gf-empty">
            <div className="gf-empty-icon">🎁</div>
            <p className="gf-empty-title">
              {search || catFilter !== "All" ? "No results found" : "No gifts yet"}
            </p>
            <p className="gf-empty-desc">
              {search
                ? `Nothing matches "${search}"`
                : catFilter !== "All"
                  ? `No gifts in "${catFilter}"`
                  : "Gift items will appear here once added."}
            </p>
            {(search || catFilter !== "All") && (
              <button className="gf-empty-reset"
                onClick={() => { setSearchInput(""); setSearch(""); setCatFilter("All"); }}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="gf-grid">
            {pageItems.map((item, idx) => (
              <GiftCard
                key={item.id}
                item={item}
                idx={idx}
                onEdit={setEditItem}
                onDelete={setDeleteItem}
                onImageClick={(src, name) => setLightbox({ src, name })}
                showToast={showToast}
              />
            ))}
          </div>
        )}

        {/* ── PAGINATION ── */}
        {!loading && filtered.length > perPage && (
          <div className="gf-pagination">
            <div className="gf-pg-info">
              {startIdx}–{endIdx} of {filtered.length}
            </div>
            <div className="gf-pages">
              <button className="gf-pg-btn" disabled={safePage === 0}
                onClick={() => setPage(p => Math.max(0, p-1))}>‹</button>
              {pageNums.map((p, i) =>
                p === "…"
                  ? <button key={`el-${i}`} className="gf-pg-btn" disabled>…</button>
                  : <button key={p}
                      className={`gf-pg-btn ${safePage === p ? "on" : ""}`}
                      onClick={() => setPage(p)}>
                      {p + 1}
                    </button>
              )}
              <button className="gf-pg-btn" disabled={safePage >= totalPages - 1}
                onClick={() => setPage(p => Math.min(totalPages-1, p+1))}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      {editItem && (
        <EditModal
          item={editItem}
          categories={categories}
          onClose={() => setEditItem(null)}
          onSaved={handleSaved}
          showToast={showToast}
        />
      )}

      {deleteItem && (
        <DeleteModal
          item={deleteItem}
          onClose={() => setDeleteItem(null)}
          onConfirm={handleDelete}
        />
      )}

      {lightbox && (
        <Lightbox
          src={lightbox.src}
          name={lightbox.name}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div className={`gf-toast gf-toast--${toast.type}`}>
          <span className="gf-toast-dot" />
          {toast.msg}
        </div>
      )}
    </div>
  );
}