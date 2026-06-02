// AddNewGift.jsx
import React, { useState, useRef, useCallback } from "react";
import Parse from "../../parseConfig";
import "./AddNewGifts.css";

/* ══════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════ */
const CATEGORIES = [
  { key: "love",         label: "Love",         emoji: "❤️" },
  { key: "moods",        label: "Moods",        emoji: "😊" },
  { key: "artists",      label: "Artists",      emoji: "🎨" },
  { key: "collectibles", label: "Collectibles", emoji: "💎" },
  { key: "game",         label: "Game",         emoji: "🎮" },
  { key: "family",       label: "Family",       emoji: "👨‍👩‍👧" },
  { key: "classic",      label: "Classic",      emoji: "✨" },
  { key: "3d",           label: "3D",           emoji: "🌀" },
  { key: "vip",          label: "VIP",          emoji: "👑" },
];

const GIFT_ACCEPT  = ".svga,.mp4,video/mp4,application/octet-stream";
const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

const fmtSize = (bytes) => {
  if (!bytes) return "";
  if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(1) + " MB";
  return (bytes / 1_000).toFixed(0) + " KB";
};

/* ══════════════════════════════════════════
   DROP ZONE COMPONENT
══════════════════════════════════════════ */
const DropZone = ({ accept, file, onFile, onClear, icon, title, subtext, badges }) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  const handleChange = (e) => {
    const f = e.target.files[0];
    if (f) onFile(f);
  };

  const isImg = file && file.type.startsWith("image/");
  const isVid = file && (file.type.startsWith("video/") || file.name.endsWith(".mp4"));

  return (
    <div
      className={`ang-dropzone${dragging ? " dragging" : ""}${file ? " has-file" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !file && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        style={{ display: "none" }}
      />

      {file ? (
        <div className="ang-file-selected">
          {isImg && (
            <img
              src={URL.createObjectURL(file)}
              alt="preview"
              className="ang-file-preview-img"
            />
          )}
          {isVid && (
            <video
              src={URL.createObjectURL(file)}
              className="ang-file-preview-video"
              muted
              loop
              autoPlay
              playsInline
            />
          )}
          {!isImg && !isVid && (
            <div style={{ fontSize: 32, marginBottom: 4 }}>{icon}</div>
          )}
          <div className="ang-file-name" title={file.name}>{file.name}</div>
          <div className="ang-file-size">{fmtSize(file.size)}</div>
          <button
            className="ang-file-clear"
            type="button"
            title="Remove file"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
          >
            ✕
          </button>
        </div>
      ) : (
        <>
          <div className="ang-dz-icon">{icon}</div>
          <div className="ang-dz-title">{title}</div>
          <div className="ang-dz-sub">{subtext}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            {badges.map((b) => (
              <span key={b.label} className={`ang-dz-badge ${b.cls}`}>{b.label}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════
   LIVE PREVIEW CARD
══════════════════════════════════════════ */
const LivePreview = ({ name, category, credits, previewFile }) => {
  const catInfo = CATEGORIES.find((c) => c.key === category);
  const previewUrl = previewFile ? URL.createObjectURL(previewFile) : null;

  return (
    <div className="ang-preview-panel">
      <div className="ang-preview-label">Live Preview</div>
      <div className="ang-preview-card">
        <div className="ang-preview-thumb">
          {previewUrl
            ? <img src={previewUrl} alt="gift preview" />
            : <span>🎁</span>
          }
        </div>
        <div className="ang-preview-info">
          <div className={`ang-preview-name${!name ? " empty" : ""}`}>
            {name || "Gift name will appear here…"}
          </div>
          <div className="ang-preview-row">
            {catInfo && (
              <span className={`ang-cat-btn active`} data-cat={catInfo.key}
                style={{ padding: "3px 10px", fontSize: "0.72rem", pointerEvents: "none" }}>
                {catInfo.emoji} {catInfo.label}
              </span>
            )}
            {credits && (
              <span className="ang-preview-credits">🪙 {Number(credits).toLocaleString()}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function AddNewGift() {
  const [giftName,     setGiftName]     = useState("");
  const [category,     setCategory]     = useState("");
  const [credits,      setCredits]      = useState("");
  const [giftFile,     setGiftFile]     = useState(null);
  const [previewFile,  setPreviewFile]  = useState(null);

  const [errors,       setErrors]       = useState({});
  const [saving,       setSaving]       = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [progressMsg,  setProgressMsg]  = useState("");
  const [success,      setSuccess]      = useState(null);

  /* ── Validation ── */
  const validate = () => {
    const e = {};
    if (!giftName.trim())   e.giftName = "Gift name is required";
    if (!category)          e.category = "Please select a category";
    if (!credits || isNaN(Number(credits)) || Number(credits) < 0)
                            e.credits  = "Enter a valid credit amount";
    if (!giftFile)          e.giftFile = "Gift file (.svga or .mp4) is required";
    if (!previewFile)       e.previewFile = "Preview image is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── Reset ── */
  const handleReset = useCallback(() => {
    setGiftName(""); setCategory(""); setCredits("");
    setGiftFile(null); setPreviewFile(null);
    setErrors({}); setSuccess(null);
    setProgress(0); setProgressMsg("");
  }, []);

  /* ── Save to Parse ── */
  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    setProgress(0);
    setProgressMsg("Preparing upload…");

    try {
      // 1. Upload gift file
      setProgress(15);
      setProgressMsg("Uploading gift file…");
      const giftParseFile = new Parse.File(
        giftFile.name.replace(/\s+/g, "_"),
        giftFile
      );
      await giftParseFile.save({
        progress: (v) => setProgress(15 + Math.round(v * 40)),
      });

      // 2. Upload preview image
      setProgress(55);
      setProgressMsg("Uploading preview image…");
      const previewParseFile = new Parse.File(
        previewFile.name.replace(/\s+/g, "_"),
        previewFile
      );
      await previewParseFile.save({
        progress: (v) => setProgress(55 + Math.round(v * 30)),
      });

      // 3. Save Parse object
      setProgress(88);
      setProgressMsg("Saving gift record…");
      const Gift = Parse.Object.extend("Gifts");
      const gift = new Gift();
      gift.set("name",        giftName.trim());
      gift.set("giftName",    giftName.trim());
      gift.set("category",    category);
      gift.set("credits",     parseFloat(credits));
      gift.set("price",       parseFloat(credits));
      gift.set("giftFile",    giftParseFile);
      gift.set("previewImage",previewParseFile);
      gift.set("picture",     previewParseFile);
      await gift.save();

      setProgress(100);
      setProgressMsg("Done!");
      setSuccess({
        name: giftName.trim(),
        id:   gift.id,
      });

      // Auto-reset form after 4s
      setTimeout(() => {
        handleReset();
      }, 4000);

    } catch (err) {
      console.error("Save error:", err);
      setErrors({ submit: err.message || "Upload failed. Please try again." });
      setProgress(0);
      setProgressMsg("");
    } finally {
      setSaving(false);
    }
  };

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <div className="ang-page">
      <div className="ang-topline" />
      <div className="ang-inner">

        {/* ── HEADER ── */}
        <div className="ang-header">
          <div className="ang-logo">🎁</div>
          <div>
            <div className="ang-title">Add New Gift</div>
            <div className="ang-subtitle">Create a new gift with category, credits &amp; animation file</div>
          </div>
        </div>

        {/* ── SUCCESS BANNER ── */}
        {success && (
          <div className="ang-success-banner">
            <div className="ang-success-icon">✓</div>
            <div className="ang-success-text">
              Gift "{success.name}" saved successfully!
              <span>ID: {success.id} · Form resets in 4 seconds…</span>
            </div>
          </div>
        )}

        {/* ── FORM CARD ── */}
        <div className="ang-form-card">

          {/* ── SECTION 1: Basic Info ── */}
          <div className="ang-section">
            <div className="ang-section-label">
              <span className="ang-section-label-icon">✏️</span>
              Basic Information
            </div>

            {/* Gift Name */}
            <div className="ang-field">
              <label className="ang-label" htmlFor="gift-name">
                Gift Name <span className="ang-label-req">*</span>
              </label>
              <input
                id="gift-name"
                className="ang-input"
                type="text"
                value={giftName}
                onChange={(e) => {
                  setGiftName(e.target.value);
                  if (errors.giftName) setErrors((p) => ({ ...p, giftName: "" }));
                }}
                placeholder="e.g. Golden Heart, Flying Dragon…"
                maxLength={80}
                autoComplete="off"
              />
              {errors.giftName && (
                <span className="ang-field-error">⚠ {errors.giftName}</span>
              )}
            </div>

            {/* Credits */}
            <div className="ang-field">
              <label className="ang-label" htmlFor="gift-credits">
                Credits <span className="ang-label-req">*</span>
              </label>
              <div className="ang-credits-wrap">
                <span className="ang-credits-prefix">🪙</span>
                <input
                  id="gift-credits"
                  className="ang-input ang-credits-input"
                  type="number"
                  min="0"
                  step="1"
                  value={credits}
                  onChange={(e) => {
                    setCredits(e.target.value);
                    if (errors.credits) setErrors((p) => ({ ...p, credits: "" }));
                  }}
                  placeholder="e.g. 100"
                />
              </div>
              {errors.credits && (
                <span className="ang-field-error">⚠ {errors.credits}</span>
              )}
            </div>
          </div>

          {/* ── SECTION 2: Category ── */}
          <div className="ang-section">
            <div className="ang-section-label">
              <span className="ang-section-label-icon">🏷️</span>
              Category <span style={{ color: "var(--pink)", marginLeft: 4 }}>*</span>
            </div>

            <div className="ang-cat-grid">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  data-cat={cat.key}
                  className={`ang-cat-btn${category === cat.key ? " active" : ""}`}
                  onClick={() => {
                    setCategory(cat.key);
                    if (errors.category) setErrors((p) => ({ ...p, category: "" }));
                  }}
                >
                  <span className="ang-cat-check">
                    {category === cat.key ? "✓" : ""}
                  </span>
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>

            {errors.category && (
              <span className="ang-field-error" style={{ marginTop: 10, display: "flex" }}>
                ⚠ {errors.category}
              </span>
            )}
          </div>

          {/* ── SECTION 3: File Uploads ── */}
          <div className="ang-section">
            <div className="ang-section-label">
              <span className="ang-section-label-icon">📁</span>
              Files
            </div>

            <div className="ang-upload-grid">
              {/* Gift animation file */}
              <div>
                <div className="ang-label" style={{ marginBottom: 8 }}>
                  Gift File <span className="ang-label-req">*</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-4)", fontWeight: 400, marginLeft: 4 }}>
                    (.svga or .mp4)
                  </span>
                </div>
                <DropZone
                  accept={GIFT_ACCEPT}
                  file={giftFile}
                  onFile={(f) => {
                    setGiftFile(f);
                    if (errors.giftFile) setErrors((p) => ({ ...p, giftFile: "" }));
                  }}
                  onClear={() => setGiftFile(null)}
                  icon="🌀"
                  title="Drop gift file here"
                  subtext="or click to browse"
                  badges={[
                    { label: "SVGA", cls: "svga" },
                    { label: "MP4",  cls: "mp4"  },
                  ]}
                />
                {errors.giftFile && (
                  <span className="ang-field-error" style={{ marginTop: 6, display: "flex" }}>
                    ⚠ {errors.giftFile}
                  </span>
                )}
              </div>

              {/* Preview image */}
              <div>
                <div className="ang-label" style={{ marginBottom: 8 }}>
                  Preview Image <span className="ang-label-req">*</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-4)", fontWeight: 400, marginLeft: 4 }}>
                    (PNG, JPG, WEBP)
                  </span>
                </div>
                <DropZone
                  accept={IMAGE_ACCEPT}
                  file={previewFile}
                  onFile={(f) => {
                    setPreviewFile(f);
                    if (errors.previewFile) setErrors((p) => ({ ...p, previewFile: "" }));
                  }}
                  onClear={() => setPreviewFile(null)}
                  icon="🖼️"
                  title="Drop preview image here"
                  subtext="or click to browse"
                  badges={[
                    { label: "PNG",  cls: "img" },
                    { label: "JPG",  cls: "img" },
                    { label: "WEBP", cls: "img" },
                  ]}
                />
                {errors.previewFile && (
                  <span className="ang-field-error" style={{ marginTop: 6, display: "flex" }}>
                    ⚠ {errors.previewFile}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── SECTION 4: Live Preview ── */}
          {(giftName || category || credits || previewFile) && (
            <LivePreview
              name={giftName}
              category={category}
              credits={credits}
              previewFile={previewFile}
            />
          )}

          {/* ── Upload Progress ── */}
          {saving && (
            <div style={{ padding: "0 clamp(20px,4vw,34px) 16px" }}>
              <div className="ang-progress-wrap">
                <div className="ang-progress-bar">
                  <div className="ang-progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <div className="ang-progress-label">
                  <span>{progressMsg}</span>
                  <span>{progress}%</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Submit error ── */}
          {errors.submit && (
            <div style={{ padding: "0 clamp(20px,4vw,34px) 14px" }}>
              <div style={{
                padding: "10px 14px",
                background: "var(--error-dim)",
                border: "1px solid rgba(255,82,82,0.3)",
                borderRadius: "var(--r-sm)",
                color: "var(--error)",
                fontSize: "0.82rem",
                fontWeight: 600,
              }}>
                ✗ {errors.submit}
              </div>
            </div>
          )}

          {/* ── FOOTER ── */}
          <div className="ang-form-footer">
            <div className="ang-footer-hint">
              Fields marked <strong style={{ color: "var(--pink)" }}>*</strong> are required
            </div>
            <div className="ang-btn-group">
              <button
                className="ang-btn-reset"
                type="button"
                onClick={handleReset}
                disabled={saving}
              >
                Reset
              </button>
              <button
                className="ang-btn-save"
                type="button"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="ang-btn-save-spinner" />
                    Uploading…
                  </>
                ) : (
                  <>
                    🎁 Save Gift
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}