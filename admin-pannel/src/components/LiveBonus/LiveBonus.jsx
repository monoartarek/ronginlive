import React, { useEffect, useState, useMemo, useCallback } from "react";
import Parse from "../../parseConfig";
import "./LiveBonus.css";

// ── Inline SVG icons (zero extra dependencies) ────────────────────────────
const Icon = {
  save: (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
      <path d="M5 3H19C20.1 3 21 3.9 21 5V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3ZM9 17H15V19H9V17ZM9 11H15V15H9V11ZM15 3V8H9V3H15Z" fill="currentColor" />
    </svg>
  ),
  edit: (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z" fill="currentColor" />
    </svg>
  ),
  trash: (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM8 9H16V19H8V9ZM15.5 4L14.5 3H9.5L8.5 4H5V6H19V4H15.5Z" fill="currentColor" />
    </svg>
  ),
  cancel: (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
      <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor" />
    </svg>
  ),
  clock: (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12S7.59 4 12 4 20 7.59 20 12 16.41 20 12 20ZM12.5 7H11V13L16.25 16.15L17 14.92L12.5 12.25V7Z" fill="currentColor" />
    </svg>
  ),
  zap: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
      <path d="M7 2V13H10V22L17 11H13L17 2H7Z" fill="currentColor" />
    </svg>
  ),
};

/* ─── saved value → display label mapping ─── */
const TYPE_OPTIONS = [
  { value: "audio", label: "Audioroom"  },
  { value: "video", label: "Videoroom"  },
  { value: "multi", label: "Multiroom"  },
];

const typeLabel = (savedValue) => {
  const found = TYPE_OPTIONS.find((o) => o.value === savedValue);
  return found ? found.label : savedValue || "—";
};

// ── Component ──────────────────────────────────────────────────────────────
export default function LiveBonus() {
  const [type, setType]               = useState("");
  const [duration, setDuration]       = useState("");
  const [bonus, setBonus]             = useState("");
  const [bonuses, setBonuses]         = useState([]);
  const [editId, setEditId]           = useState(null);
  const [loading, setLoading]         = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const BonusClass = Parse.Object.extend("StreamingBonusSettings");
      const query = new Parse.Query(BonusClass);
      query.descending("createdAt");
      const results = await query.find();
      setBonuses(results);
    } catch (error) {
      console.error("Error fetching bonuses:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = useCallback(() => {
    setType("");
    setDuration("");
    setBonus("");
    setEditId(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!type || !duration || !bonus) {
      alert("Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      const BonusClass = Parse.Object.extend("StreamingBonusSettings");
      let obj;
      if (editId) {
        const query = new Parse.Query(BonusClass);
        obj = await query.get(editId);
      } else {
        obj = new BonusClass();
      }
      /* saves the short code: "audio" | "video" | "multi" */
      obj.set("type",     type);
      obj.set("duration", parseInt(duration, 10));
      obj.set("bonus",    parseFloat(bonus));
      await obj.save();
      await fetchData();
      resetForm();
    } catch (error) {
      console.error("Error saving bonus:", error);
      alert("Error saving. Check console for details.");
    } finally {
      setLoading(false);
    }
  }, [type, duration, bonus, editId, fetchData, resetForm]);

  const handleEdit = useCallback((item) => {
    setEditId(item.id);
    setType(item.get("type"));           /* reads "audio" / "video" / "multi" */
    setDuration(String(item.get("duration")));
    setBonus(String(item.get("bonus")));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm("Delete this bonus?")) return;
    setLoading(true);
    try {
      const BonusClass = Parse.Object.extend("StreamingBonusSettings");
      const query = new Parse.Query(BonusClass);
      const obj = await query.get(id);
      await obj.destroy();
      await fetchData();
    } catch (error) {
      console.error("Error deleting bonus:", error);
      alert("Error deleting. Check console for details.");
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  /* ── Derived stats ── */
  const stats = useMemo(() => {
    const audio = bonuses.filter((b) => b.get("type") === "audio").length;
    const video = bonuses.filter((b) => b.get("type") === "video").length;
    const multi = bonuses.filter((b) => b.get("type") === "multi").length;
    const maxB  = bonuses.reduce((m, b) => Math.max(m, b.get("bonus") || 0), 0);
    return { total: bonuses.length, audio, video, multi, maxB };
  }, [bonuses]);

  /* ── Pagination ── */
  const totalPages   = Math.ceil(bonuses.length / itemsPerPage);
  const indexOfFirst = (currentPage - 1) * itemsPerPage;
  const currentItems = bonuses.slice(indexOfFirst, indexOfFirst + itemsPerPage);
  const startIdx     = bonuses.length === 0 ? 0 : indexOfFirst + 1;
  const endIdx       = Math.min(indexOfFirst + itemsPerPage, bonuses.length);

  /* ── Type badge — shows human label, colour per type ── */
  const typeBadge = (savedValue) => {
    const cls =
      savedValue === "audio" ? "audio"
      : savedValue === "video" ? "live"
      : savedValue === "multi" ? "multi"
      : "audio";
    return (
      <span className={`type-badge ${cls}`}>
        <span className="type-badge-dot" />
        {typeLabel(savedValue)}
      </span>
    );
  };

  const fmtDate = (d) =>
    d
      ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—";

  /* ── Render ── */
  return (
    <div className="livebonus-page">
      <div className="livebonus-inner">

        {/* Header */}
        <div className="livebonus-header">
          <div className="livebonus-header-icon">{Icon.zap}</div>
          <div className="livebonus-header-text">
            <h2>Live Bonus Settings</h2>
            <p>Manage streaming &amp; room reward tiers</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Total Configs</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Audioroom</div>
            <div className="stat-value blue">{stats.audio}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Videoroom</div>
            <div className="stat-value green">{stats.video}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Multiroom</div>
            <div className="stat-value multi">{stats.multi}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Highest Bonus</div>
            <div className="stat-value green">{stats.maxB > 0 ? stats.maxB : "—"}</div>
          </div>
        </div>

        {/* Form Card */}
        <div className="form-card">
          <div className="form-card-title">
            {editId ? "✎  Editing Entry" : "+ New Bonus Rule"}
          </div>

          {editId && (
            <div className="edit-banner">
              <span className="edit-banner-dot" />
              Editing existing entry — make your changes and click Update.
            </div>
          )}

          <div className="form-grid">

            {/* Type — dropdown shows human label, saves short code */}
            <div className="field-group">
              <label htmlFor="lb-type">Type</label>
              <select
                id="lb-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="">Select type…</option>
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div className="field-group">
              <label htmlFor="lb-duration">Duration (mins)</label>
              <input
                id="lb-duration"
                type="number"
                min="0"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 60"
              />
            </div>

            {/* Bonus */}
            <div className="field-group">
              <label htmlFor="lb-bonus">Bonus Amount</label>
              <input
                id="lb-bonus"
                type="number"
                min="0"
                step="0.01"
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
                placeholder="e.g. 25.00"
              />
            </div>

            {/* Actions */}
            <div className="form-actions">
              <button className="btn-save" onClick={handleSave} disabled={loading} type="button">
                {Icon.save}
                {loading ? "Saving…" : editId ? "Update" : "Save"}
              </button>
              {editId && (
                <button className="btn-cancel" onClick={resetForm} type="button">
                  {Icon.cancel} Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Duration</th>
                  <th>Bonus</th>
                  <th>Created</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="loading-state">
                        <div className="loading-spinner" />
                        Loading bonuses…
                      </div>
                    </td>
                  </tr>
                ) : currentItems.length > 0 ? (
                  currentItems.map((item) => (
                    <tr key={item.id}>
                      <td>{typeBadge(item.get("type"))}</td>
                      <td>
                        <span className="duration-chip">
                          {Icon.clock}&nbsp;{item.get("duration")} min
                        </span>
                      </td>
                      <td>
                        <span className="bonus-value">{item.get("bonus")}</span>
                      </td>
                      <td><span className="date-text">{fmtDate(item.get("createdAt"))}</span></td>
                      <td><span className="date-text">{fmtDate(item.get("updatedAt"))}</span></td>
                      <td>
                        <div className="action-group">
                          <button className="btn-edit"   onClick={() => handleEdit(item)}    type="button">{Icon.edit}  <span>Edit</span></button>
                          <button className="btn-delete" onClick={() => handleDelete(item.id)} type="button">{Icon.trash} <span>Delete</span></button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <div className="empty-icon">🎯</div>
                        <p>No bonus rules yet — add your first one above.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-wrapper">
              <span className="pagination-info">
                Showing {startIdx}–{endIdx} of {bonuses.length}
              </span>
              <div className="pagination-controls">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    className={`page-btn ${currentPage === i + 1 ? "active" : ""}`}
                    onClick={() => setCurrentPage(i + 1)}
                    type="button"
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}