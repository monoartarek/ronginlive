import React, { useEffect, useState, useCallback, useMemo } from "react";
import Parse from "../../parseConfig";
import "./DailyBonus.css";

const PAGE_SIZE = 9;

const REWARD_TYPES  = ["Coin", "Avatar Frame", "Entrance Effect"];
const REWARD_ICONS  = { "Coin": "◎", "Avatar Frame": "◈", "Entrance Effect": "✦" };
const REWARD_COLORS = {
  "Coin":            { bg: "rgba(251,191,36,0.13)",  border: "rgba(251,191,36,0.40)",  text: "#fbbf24" },
  "Avatar Frame":    { bg: "rgba(129,140,248,0.13)", border: "rgba(129,140,248,0.40)", text: "#818cf8" },
  "Entrance Effect": { bg: "rgba(52,211,153,0.13)",  border: "rgba(52,211,153,0.40)",  text: "#34d399" },
};
const EMPTY_FORM = {
  day: "", rewardType: "Coin",
  coins: "", avatarName: "", avatarImage: "", effectName: "", effectPreview: "",
};

/* ── helpers ── */
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}

export default function DailyBonus() {
  const [data,        setData]        = useState([]);
  const [search,      setSearch]      = useState("");
  const [typeFilter,  setTypeFilter]  = useState("all");
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [page,        setPage]        = useState(0);
  const [viewMode,    setViewMode]    = useState("list");
  const [fontSize,    setFontSize]    = useState("md");   // "sm" | "md" | "lg"
  const [toast,       setToast]       = useState(null);
  const [animated,    setAnimated]    = useState(false);
  const [showModal,   setShowModal]   = useState(false);
  const [editItem,    setEditItem]    = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);

  /* toast */
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* fetch */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setAnimated(false);
    try {
      const q = new Parse.Query("DailyBonus");
      q.ascending("day");
      q.limit(1000);
      const results = await q.find({ useMasterKey: true });
      setData(results.map(item => ({
        objectId:      item.id,
        day:           item.get("day")           ?? "",
        rewardType:    item.get("rewardType")    ?? "Coin",
        coins:         item.get("coins")         ?? "",
        avatarName:    item.get("avatarName")    ?? "",
        avatarImage:   item.get("avatarImage")   ?? "",
        effectName:    item.get("effectName")    ?? "",
        effectPreview: item.get("effectPreview") ?? "",
        updatedAt:     item.updatedAt,
      })));
      setPage(0);
    } catch (err) {
      showToast("Fetch failed: " + err.message, "error");
    } finally {
      setLoading(false);
      setTimeout(() => setAnimated(true), 60);
    }
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* filter */
  const displayed = useMemo(() => {
    let list = [...data];
    if (typeFilter !== "all") list = list.filter(d => d.rewardType === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        String(d.day).includes(q) ||
        (d.rewardType  || "").toLowerCase().includes(q) ||
        (d.avatarName  || "").toLowerCase().includes(q) ||
        (d.effectName  || "").toLowerCase().includes(q) ||
        (d.coins       || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, search, typeFilter]);

  const totalPages = Math.ceil(displayed.length / PAGE_SIZE);
  const pageItems  = displayed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  /* helpers */
  const openAdd  = () => { setEditItem(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = item => {
    setEditItem(item);
    setForm({
      day: item.day, rewardType: item.rewardType, coins: item.coins,
      avatarName: item.avatarName, avatarImage: item.avatarImage,
      effectName: item.effectName, effectPreview: item.effectPreview,
    });
    setShowModal(true);
  };

  const getRewardDetail = item => {
    if (item.rewardType === "Coin")            return item.coins ? `${item.coins} coins` : "—";
    if (item.rewardType === "Avatar Frame")    return item.avatarName  || "—";
    if (item.rewardType === "Entrance Effect") return item.effectName  || "—";
    return "—";
  };
  const getPreviewImg = item => {
    if (item.rewardType === "Avatar Frame")    return item.avatarImage   || null;
    if (item.rewardType === "Entrance Effect") return item.effectPreview || null;
    return null;
  };

  /* save */
  const saveBonus = async () => {
    if (!form.day) { showToast("Day number is required", "error"); return; }
    setSaving(true);
    try {
      const payload = {
        day:           Number(form.day),
        rewardType:    form.rewardType,
        coins:         form.rewardType === "Coin"             ? String(form.coins)       : "",
        avatarName:    form.rewardType === "Avatar Frame"     ? form.avatarName          : "",
        avatarImage:   form.rewardType === "Avatar Frame"     ? form.avatarImage         : "",
        effectName:    form.rewardType === "Entrance Effect"  ? form.effectName          : "",
        effectPreview: form.rewardType === "Entrance Effect"  ? form.effectPreview       : "",
      };
      if (editItem) {
        const obj = await new Parse.Query("DailyBonus").get(editItem.objectId, { useMasterKey: true });
        Object.entries(payload).forEach(([k, v]) => obj.set(k, v));
        await obj.save(null, { useMasterKey: true });
        showToast(`Day ${form.day} updated`, "success");
      } else {
        const DB  = Parse.Object.extend("DailyBonus");
        const obj = new DB();
        Object.entries(payload).forEach(([k, v]) => obj.set(k, v));
        await obj.save(null, { useMasterKey: true });
        showToast(`Day ${form.day} reward added`, "success");
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      showToast("Save failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  /* delete */
  const confirmDelete = async () => {
    if (!deleteModal) return;
    const item = deleteModal;
    setDeleteModal(null);
    try {
      const obj = await new Parse.Query("DailyBonus").get(item.objectId, { useMasterKey: true });
      await obj.destroy({ useMasterKey: true });
      setData(prev => prev.filter(d => d.objectId !== item.objectId));
      showToast(`Day ${item.day} reward deleted`, "info");
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    }
  };

  /* pagination */
  const pageRange = useMemo(() => {
    const d = 2, r = [];
    for (let i = Math.max(0, page - d); i <= Math.min(totalPages - 1, page + d); i++) r.push(i);
    return r;
  }, [page, totalPages]);
  const changePage = n => { setPage(n); window.scrollTo({ top: 0, behavior: "smooth" }); };

  /* stats */
  const counts = useMemo(() => ({
    all:    data.length,
    Coin:             data.filter(d => d.rewardType === "Coin").length,
    "Avatar Frame":   data.filter(d => d.rewardType === "Avatar Frame").length,
    "Entrance Effect":data.filter(d => d.rewardType === "Entrance Effect").length,
  }), [data]);

  /* ════════════════ RENDER ════════════════ */
  return (
    <div className={`db-root db-fs--${fontSize}`}>

      {/* Toast */}
      {toast && (
        <div className={`db-toast db-toast--${toast.type}`}>
          <span className="db-toast-dot" />
          {toast.msg}
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteModal && (
        <div className="db-overlay" onClick={() => setDeleteModal(null)}>
          <div className="db-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="db-confirm-icon">✕</div>
            <h3 className="db-confirm-title">Delete Reward</h3>
            <p className="db-confirm-desc">
              Delete <strong>Day {deleteModal.day}</strong> ({deleteModal.rewardType})?<br />
              This cannot be undone.
            </p>
            <div className="db-confirm-btns">
              <button className="db-cancel-btn" onClick={() => setDeleteModal(null)}>Cancel</button>
              <button className="db-delete-confirm-btn" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="db-overlay" onClick={() => setShowModal(false)}>
          <div className="db-form-modal" onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="db-form-header">
              <h3 className="db-form-title">
                {editItem
                  ? `Edit Day ${editItem.day}`
                  : "Add Daily Reward"}
              </h3>
              <button className="db-form-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {/* Form body */}
            <div className="db-form-body">

              {/* Day */}
              <div className="db-field">
                <label className="db-label">Day Number *</label>
                <input
                  className="db-input"
                  type="number"
                  min="1"
                  placeholder="e.g. 1"
                  value={form.day}
                  onChange={e => setForm(p => ({ ...p, day: e.target.value }))}
                />
              </div>

              {/* Reward type */}
              <div className="db-field db-field--full">
                <label className="db-label">Reward Type</label>
                <div className="db-type-row">
                  {REWARD_TYPES.map(t => {
                    const rc = REWARD_COLORS[t];
                    const on = form.rewardType === t;
                    return (
                      <button
                        key={t}
                        className={`db-type-btn ${on ? "db-type-btn--on" : ""}`}
                        style={on ? { background: rc.bg, borderColor: rc.border, color: rc.text } : {}}
                        onClick={() => setForm(p => ({ ...p, rewardType: t }))}
                      >
                        {REWARD_ICONS[t]} {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Coin */}
              {form.rewardType === "Coin" && (
                <div className="db-field db-field--full">
                  <label className="db-label">Coin Amount</label>
                  <input
                    className="db-input"
                    type="number"
                    min="0"
                    placeholder="e.g. 100"
                    value={form.coins}
                    onChange={e => setForm(p => ({ ...p, coins: e.target.value }))}
                  />
                </div>
              )}

              {/* Avatar Frame */}
              {form.rewardType === "Avatar Frame" && (
                <>
                  <div className="db-field">
                    <label className="db-label">Frame Name</label>
                    <input className="db-input" placeholder="e.g. Golden Crown"
                      value={form.avatarName}
                      onChange={e => setForm(p => ({ ...p, avatarName: e.target.value }))} />
                  </div>
                  <div className="db-field">
                    <label className="db-label">Image URL</label>
                    <input className="db-input" placeholder="https://…"
                      value={form.avatarImage}
                      onChange={e => setForm(p => ({ ...p, avatarImage: e.target.value }))} />
                  </div>
                  {form.avatarImage && (
                    <div className="db-field db-field--full">
                      <label className="db-label">Preview</label>
                      <img
                        src={form.avatarImage}
                        alt="preview"
                        className="db-preview-img"
                        onError={e => { e.target.style.display = "none"; }}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Entrance Effect */}
              {form.rewardType === "Entrance Effect" && (
                <>
                  <div className="db-field">
                    <label className="db-label">Effect Name</label>
                    <input className="db-input" placeholder="e.g. Fire Entrance"
                      value={form.effectName}
                      onChange={e => setForm(p => ({ ...p, effectName: e.target.value }))} />
                  </div>
                  <div className="db-field">
                    <label className="db-label">Preview URL</label>
                    <input className="db-input" placeholder="https://…"
                      value={form.effectPreview}
                      onChange={e => setForm(p => ({ ...p, effectPreview: e.target.value }))} />
                  </div>
                </>
              )}

            </div>

            {/* Modal footer */}
            <div className="db-form-footer">
              <button className="db-cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button
                className="db-save-btn"
                onClick={saveBonus}
                disabled={saving}
              >
                {saving ? <span className="db-spin" /> : editItem ? "Save Changes" : "Add Reward"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="db-header">
        <div className="db-header-left">
          <p className="db-eyebrow">Rewards Config</p>
          <h1 className="db-title">Daily Bonus</h1>
          <p className="db-sub">
            {loading ? "Loading…" : `${data.length} day${data.length !== 1 ? "s" : ""} configured`}
          </p>
        </div>
        <div className="db-header-right">
          {/* Font size toggle */}
          <div className="db-toolbar-group">
            {[
              { key: "sm", label: "S" },
              { key: "md", label: "M" },
              { key: "lg", label: "L" },
            ].map(f => (
              <button
                key={f.key}
                className={`db-icon-btn db-fs-btn ${fontSize === f.key ? "on" : ""}`}
                onClick={() => setFontSize(f.key)}
                title={f.key === "sm" ? "Small" : f.key === "md" ? "Medium" : "Large"}
              >{f.label}</button>
            ))}
          </div>
          {/* View toggle */}
          <div className="db-toolbar-group">
            <button
              className={`db-icon-btn ${viewMode === "list" ? "on" : ""}`}
              onClick={() => setViewMode("list")} title="List view">≡</button>
            <button
              className={`db-icon-btn ${viewMode === "card" ? "on" : ""}`}
              onClick={() => setViewMode("card")} title="Card view">⊞</button>
          </div>
          <button className="db-add-btn" onClick={openAdd}>+ Add Reward</button>
          <button className="db-icon-btn db-refresh-btn" onClick={fetchData} disabled={loading}>
            {loading ? <span className="db-spin" /> : "↻"}
          </button>
        </div>
      </div>

      {/* ── Type Filter Pills ── */}
      <div className="db-filter-row">
        {[
          { key: "all", label: "All", count: counts.all, color: "#818cf8" },
          { key: "Coin", label: "Coin", count: counts["Coin"], color: "#fbbf24" },
          { key: "Avatar Frame", label: "Avatar Frame", count: counts["Avatar Frame"], color: "#818cf8" },
          { key: "Entrance Effect", label: "Entrance Effect", count: counts["Entrance Effect"], color: "#34d399" },
        ].map((f, i) => (
          <button
            key={f.key}
            className={`db-filter-pill ${typeFilter === f.key ? "on" : ""}`}
            style={{ animationDelay: `${i * 55}ms` }}
            onClick={() => { setTypeFilter(f.key); setPage(0); }}
          >
            <span className="db-pill-dot" style={{ background: f.color }} />
            <span className="db-pill-count">{loading ? "…" : f.count}</span>
            <span className="db-pill-label">{f.label}</span>
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="db-search-row">
        <div className="db-search-wrap">
          <span className="db-search-icon">⌕</span>
          <input
            className="db-search"
            placeholder="Search by day, type, name or coins…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
          {search && (
            <button className="db-search-x" onClick={() => { setSearch(""); setPage(0); }}>✕</button>
          )}
        </div>
        {!loading && (
          <span className="db-count">{displayed.length} result{displayed.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="db-loading">
          <div className="db-loading-ring" />
          <p>Loading rewards…</p>
        </div>
      ) : pageItems.length === 0 ? (
        <div className="db-empty">
          <span className="db-empty-icon">◎</span>
          <p>{search || typeFilter !== "all" ? "No rewards match" : "No daily rewards yet"}</p>
          {!search && typeFilter === "all" && (
            <button className="db-add-btn" onClick={openAdd}>+ Add First Reward</button>
          )}
          {(search || typeFilter !== "all") && (
            <button className="db-empty-reset"
              onClick={() => { setSearch(""); setTypeFilter("all"); setPage(0); }}>
              Clear filters
            </button>
          )}
        </div>
      ) : viewMode === "card" ? (

        /* ════ CARD VIEW ════ */
        <div className={`db-cards ${animated ? "in" : ""}`}>
          {pageItems.map((item, i) => {
            const rc   = REWARD_COLORS[item.rewardType] || REWARD_COLORS["Coin"];
            const img  = getPreviewImg(item);
            return (
              <div
                key={item.objectId}
                className="db-card"
                style={{ animationDelay: `${i * 45}ms`, borderColor: rc.border }}
              >
                {/* Top accent */}
                <div className="db-card-accent" style={{ background: rc.text }} />

                {/* Day badge */}
                <div className="db-card-day" style={{ background: rc.bg, color: rc.text }}>
                  Day {item.day}
                </div>

                {/* Type badge */}
                <div className="db-card-type" style={{ background: rc.bg, borderColor: rc.border, color: rc.text }}>
                  {REWARD_ICONS[item.rewardType]} {item.rewardType}
                </div>

                {/* Preview image */}
                {img && (
                  <div className="db-card-img-wrap">
                    <img
                      src={img}
                      alt=""
                      className="db-card-img"
                      onError={e => { e.target.parentElement.style.display = "none"; }}
                    />
                  </div>
                )}

                {/* Detail */}
                <p className="db-card-detail">{getRewardDetail(item)}</p>

                {/* Updated */}
                <p className="db-card-date">{fmtDate(item.updatedAt)}</p>

                {/* Actions */}
                <div className="db-card-actions">
                  <button className="db-edit-btn" onClick={() => openEdit(item)}>✎ Edit</button>
                  <button className="db-del-btn"  onClick={() => setDeleteModal(item)}>✕</button>
                </div>
              </div>
            );
          })}
        </div>

      ) : (

        /* ════ LIST VIEW ════ */
        <div className={`db-list ${animated ? "in" : ""}`}>
          {/* List head */}
          <div className="db-list-head">
            <span className="db-lh" style={{ width: 56 }}>Day</span>
            <span className="db-lh" style={{ flex: 1 }}>Type</span>
            <span className="db-lh db-lh--md" style={{ flex: 1.4 }}>Detail</span>
            <span className="db-lh db-lh--lg" style={{ width: 70 }}>Preview</span>
            <span className="db-lh db-lh--lg" style={{ width: 100 }}>Updated</span>
            <span className="db-lh" style={{ width: 110, textAlign: "right" }}>Actions</span>
          </div>

          {pageItems.map((item, i) => {
            const rc  = REWARD_COLORS[item.rewardType] || REWARD_COLORS["Coin"];
            const img = getPreviewImg(item);
            return (
              <div key={item.objectId} className="db-row" style={{ animationDelay: `${i * 28}ms` }}>

                {/* Day */}
                <div className="db-td" style={{ width: 56 }}>
                  <span className="db-day" style={{ color: rc.text }}>{item.day}</span>
                </div>

                {/* Type */}
                <div className="db-td" style={{ flex: 1 }}>
                  <span className="db-type-badge"
                    style={{ background: rc.bg, borderColor: rc.border, color: rc.text }}>
                    {REWARD_ICONS[item.rewardType]} {item.rewardType}
                  </span>
                </div>

                {/* Detail */}
                <div className="db-td db-td--md" style={{ flex: 1.4 }}>
                  <span className="db-detail">{getRewardDetail(item)}</span>
                </div>

                {/* Preview */}
                <div className="db-td db-td--lg" style={{ width: 70 }}>
                  {img
                    ? <img src={img} alt="" className="db-thumb"
                        onError={e => { e.target.style.display = "none"; }} />
                    : <span className="db-no-img">—</span>}
                </div>

                {/* Date */}
                <div className="db-td db-td--lg" style={{ width: 100 }}>
                  <span className="db-date">{fmtDate(item.updatedAt)}</span>
                </div>

                {/* Actions */}
                <div className="db-td db-td--actions" style={{ width: 110 }}>
                  <button className="db-edit-btn" onClick={() => openEdit(item)}>Edit</button>
                  <button className="db-del-btn"  onClick={() => setDeleteModal(item)}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="db-pages">
          <button className="db-page db-page--nav"
            disabled={page === 0} onClick={() => changePage(0)}>«</button>
          <button className="db-page db-page--nav"
            disabled={page === 0} onClick={() => changePage(page - 1)}>‹</button>
          {pageRange[0] > 0 && (
            <><button className="db-page" onClick={() => changePage(0)}>1</button>
            {pageRange[0] > 1 && <span className="db-dots">…</span>}</>
          )}
          {pageRange.map(i => (
            <button key={i}
              className={`db-page ${page === i ? "db-page--on" : ""}`}
              onClick={() => changePage(i)}>{i + 1}</button>
          ))}
          {pageRange[pageRange.length - 1] < totalPages - 1 && (
            <>{pageRange[pageRange.length - 1] < totalPages - 2 && <span className="db-dots">…</span>}
            <button className="db-page" onClick={() => changePage(totalPages - 1)}>{totalPages}</button></>
          )}
          <button className="db-page db-page--nav"
            disabled={page === totalPages - 1} onClick={() => changePage(page + 1)}>›</button>
          <button className="db-page db-page--nav"
            disabled={page === totalPages - 1} onClick={() => changePage(totalPages - 1)}>»</button>
          <span className="db-page-info">Page {page + 1} / {totalPages}</span>
        </div>
      )}

    </div>
  );
}