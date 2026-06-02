// AddNewAnnouncements.jsx
import React, { useState, useRef, useMemo } from "react";
import Parse from "../../parseConfig";
import "./AddNewAnnouncements.css";

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
var IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function fmtSize(bytes) {
  if (!bytes) return "";
  if (bytes >= 1000000) return (bytes / 1000000).toFixed(1) + " MB";
  return Math.round(bytes / 1000) + " KB";
}

function isImage(file) {
  if (!file) return false;
  return file.type.startsWith("image/");
}

function isValidUrl(str) {
  if (!str || !str.trim()) return true; // optional field
  try { new URL(str.trim()); return true; } catch { return false; }
}

/* ─────────────────────────────────────────
   DROP ZONE
───────────────────────────────────────── */
function DropZone({ file, onFile, onClear, hasError }) {
  var inputRef        = useRef(null);
  var [drag, setDrag] = useState(false);
  var imgSrc          = file && isImage(file) ? URL.createObjectURL(file) : null;

  function handleDragOver(e)  { e.preventDefault(); setDrag(true); }
  function handleDragLeave()  { setDrag(false); }
  function handleDrop(e) {
    e.preventDefault(); setDrag(false);
    var f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) onFile(f);
  }
  function handleClick()  { if (!file) inputRef.current && inputRef.current.click(); }
  function handleChange(e) {
    var f = e.target.files && e.target.files[0];
    if (f) onFile(f);
    e.target.value = "";
  }
  function handleClear(e) { e.stopPropagation(); onClear(); }

  var cls = "ana-drop";
  if (drag)     cls += " drag";
  if (file)     cls += " filled";
  if (hasError) cls += " error";

  return (
    <div className={cls}
      onDragOver={handleDragOver} onDragLeave={handleDragLeave}
      onDrop={handleDrop} onClick={handleClick}>

      <input ref={inputRef} type="file" accept={IMAGE_ACCEPT}
        style={{ display:"none" }} onChange={handleChange} />

      {file ? (
        <>
          <div className="ana-file-info">
            {imgSrc
              ? <img src={imgSrc} alt="preview" className="ana-img-prev" />
              : <div className="ana-file-icon">🖼️</div>
            }
            <div className="ana-file-name" title={file.name}>{file.name}</div>
            <div className="ana-file-meta">
              <span className="ana-file-size">{fmtSize(file.size)}</span>
              <span className="ana-file-ready">✓ Ready to upload</span>
            </div>
          </div>
          <button className="ana-file-clr" type="button"
            onClick={handleClear} title="Remove file">✕</button>
        </>
      ) : (
        <>
          <div className="ana-drop-icon-wrap">
            <svg width="30" height="30" fill="none" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2"
                stroke="currentColor" strokeWidth="1.8"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
              <path d="M21 15l-5-5L5 21"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="ana-drop-title">
            {drag ? "Drop image here!" : "Drag & drop your image here"}
          </div>
          <div className="ana-drop-sub">PNG, JPG or WEBP · max 10 MB</div>
          <button className="ana-browse" type="button"
            onClick={function(e) {
              e.stopPropagation();
              inputRef.current && inputRef.current.click();
            }}>
            Browse files
          </button>
          <span className="ana-drop-badge">PNG · JPG · WEBP</span>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   CHARACTER COUNT BAR
───────────────────────────────────────── */
function CharBar({ current, max}) {
  var pct = Math.min(100, Math.round((current / max) * 100));
  var warn = pct > 80;
  var over = current > max;
  return (
    <div className="ana-char-bar-wrap">
      <div className="ana-char-track">
        <div
          className={"ana-char-fill" + (over ? " over" : warn ? " warn" : "")}
          style={{ width: Math.min(100, pct) + "%" }}
        />
      </div>
      <span className={"ana-char-count" + (over ? " over" : warn ? " warn" : "")}>
        {current}/{max}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function AddNewAnnouncements() {
  var [title,     setTitle]     = useState("");
  var [subtitle,  setSubtitle]  = useState("");
  var [url,       setUrl]       = useState("");
  var [pngFile,   setPngFile]   = useState(null);

  var [errors,    setErrors]    = useState({});
  var [saving,    setSaving]    = useState(false);
  var [progress,  setProgress]  = useState(0);
  var [progMsg,   setProgMsg]   = useState("");
  var [success,   setSuccess]   = useState(null);
  var [submitErr, setSubmitErr] = useState("");

  function clearErr(key) {
    setErrors(function(prev) {
      var next = Object.assign({}, prev); delete next[key]; return next;
    });
  }

  function handlePngFile(file) {
    if (!isImage(file)) {
      setErrors(function(prev) {
        return Object.assign({}, prev, { pngFile: "Please choose a PNG, JPG or WEBP image" });
      });
      return;
    }
    setPngFile(file); clearErr("pngFile");
  }

  function validate() {
    var e = {};
    if (!title.trim())             e.title    = "Title is required";
    if (title.trim().length > 120) e.title    = "Title must be 120 characters or fewer";
    if (!subtitle.trim())          e.subtitle = "Sub-title is required";
    if (url.trim() && !isValidUrl(url)) e.url = "Please enter a valid URL (include https://)";
    if (!pngFile)                  e.pngFile  = "Preview image is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleReset() {
    setTitle(""); setSubtitle(""); setUrl(""); setPngFile(null);
    setErrors({}); setSuccess(null); setSubmitErr("");
    setProgress(0); setProgMsg("");
  }

  async function handleSave() {
    setSubmitErr("");
    if (!validate()) return;

    setSaving(true);
    setProgress(10);
    setProgMsg("Preparing…");

    try {
      // 1. Upload image
      setProgress(25);
      setProgMsg("Uploading preview image…");
      var imgParseFile = new Parse.File(
        pngFile.name.replace(/\s+/g, "_"), pngFile
      );
      await imgParseFile.save();
      setProgress(78);

      // 2. Save Parse object
      setProgMsg("Saving announcement…");
      var Announcement = Parse.Object.extend("Announcements");
      var obj = new Announcement();
      obj.set("title",        title.trim());
      obj.set("name",         title.trim());
      obj.set("heading",      title.trim());
      obj.set("subtitle",     subtitle.trim());
      obj.set("subTitle",     subtitle.trim());
      obj.set("description",  subtitle.trim());
      obj.set("url",          url.trim());
      obj.set("link",         url.trim());
      obj.set("actionUrl",    url.trim());
      obj.set("previewImage", imgParseFile);
      obj.set("image",        imgParseFile);
      obj.set("picture",      imgParseFile);
      obj.set("thumbnail",    imgParseFile);
      obj.set("views",        0);
      obj.set("viewCount",    0);
      await obj.save();

      setProgress(100);
      setProgMsg("Done!");
      setSuccess({ title: title.trim(), id: obj.id });
      setTimeout(function() { handleReset(); }, 4000);

    } catch (err) {
      console.error("Save error:", err);
      setSubmitErr((err && err.message) ? err.message : "Upload failed. Please try again.");
      setProgress(0); setProgMsg("");
    } finally {
      setSaving(false);
    }
  }

  /* Checklist */
  var checks = useMemo(function() {
    return [
      { label: "Title",         done: !!title.trim() && title.trim().length <= 120 },
      { label: "Sub-title",     done: !!subtitle.trim() },
      { label: "URL",           done: !!url.trim() && isValidUrl(url), optional: true },
      { label: "Preview image", done: !!pngFile },
    ];
  }, [title, subtitle, url, pngFile]);

  var requiredChecks = checks.filter(function(c) { return !c.optional; });
  var allDone        = requiredChecks.every(function(c) { return c.done; }) && !!pngFile;
  var doneCount      = checks.filter(function(c) { return c.done; }).length;
  var pct            = Math.round((doneCount / checks.length) * 100);
  var imgPreview     = pngFile && isImage(pngFile) ? URL.createObjectURL(pngFile) : null;

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <div className="ana-page">
      <div className="ana-topline" />
      <div className="ana-wrap">

        {/* HEADER */}
        <div className="ana-header">
          <div className="ana-logo">
            <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
              <path d="M22 8s-4 4-10 4S2 8 2 8" stroke="currentColor"
                strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M2 8v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M12 12v4" stroke="currentColor"
                strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className="ana-title">Add New Announcement</div>
            <div className="ana-subtitle">
              Create a new announcement with title, sub-title, URL &amp; preview image
            </div>
          </div>
        </div>

        {/* SUCCESS BANNER */}
        {success && (
          <div className="ana-success">
            <div className="ana-succ-ico">✓</div>
            <div className="ana-succ-text">
              "{success.title}" published successfully!
              <small>ID: {success.id} · Form resets in 4 seconds…</small>
            </div>
          </div>
        )}

        {/* ERROR BANNER */}
        {submitErr && <div className="ana-err-banner">✗ {submitErr}</div>}

        {/* TWO-COLUMN LAYOUT */}
        <div className="ana-layout">

          {/* ── FORM COLUMN ── */}
          <div className="ana-form-col">

            {/* ── 1. TITLE ── */}
            <div className="ana-section">
              <div className="ana-sec-hdr">
                <div className="ana-sec-ico ana-ico-title">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                    <path d="M4 6h16M4 12h10M4 18h7"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="ana-sec-label">Title</span>
                <span className="ana-req-pill">Required</span>
              </div>
              <div className="ana-sec-body">
                <div className="ana-field">
                  <label className="ana-label" htmlFor="ana-title">
                    Title <span className="ana-req">*</span>
                  </label>
                  <input
                    id="ana-title"
                    className={"ana-input" + (errors.title ? " has-err" : "")}
                    type="text"
                    value={title}
                    onChange={function(e) { setTitle(e.target.value); clearErr("title"); }}
                    placeholder="e.g. New Feature Launch, Summer Sale…"
                    maxLength={120}
                    autoComplete="off"
                  />
                  <CharBar current={title.length} max={120} />
                  {errors.title && <span className="ana-field-err">⚠ {errors.title}</span>}
                </div>
              </div>
            </div>

            {/* ── 2. SUB-TITLE ── */}
            <div className="ana-section">
              <div className="ana-sec-hdr">
                <div className="ana-sec-ico ana-ico-subtitle">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                    <path d="M4 6h16M4 10h12M4 14h8M4 18h5"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="ana-sec-label">Sub-Title</span>
                <span className="ana-req-pill">Required</span>
              </div>
              <div className="ana-sec-body">
                <div className="ana-field">
                  <label className="ana-label" htmlFor="ana-subtitle">
                    Sub-Title <span className="ana-req">*</span>
                  </label>
                  <textarea
                    id="ana-subtitle"
                    className={"ana-textarea" + (errors.subtitle ? " has-err" : "")}
                    value={subtitle}
                    onChange={function(e) { setSubtitle(e.target.value); clearErr("subtitle"); }}
                    placeholder="Write a short description or sub-heading for this announcement…"
                    rows={4}
                    maxLength={300}
                  />
                  <CharBar current={subtitle.length} max={300} />
                  {errors.subtitle && <span className="ana-field-err">⚠ {errors.subtitle}</span>}
                </div>
              </div>
            </div>

            {/* ── 3. URL ── */}
            <div className="ana-section">
              <div className="ana-sec-hdr">
                <div className="ana-sec-ico ana-ico-url">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="ana-sec-label">URL</span>
                <span className="ana-opt-pill">Optional</span>
              </div>
              <div className="ana-sec-body">
                <div className="ana-field">
                  <label className="ana-label" htmlFor="ana-url">
                    Link URL
                    <span className="ana-opt-tag">optional</span>
                  </label>
                  <div className="ana-url-wrap">
                    <span className="ana-url-pre">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </span>
                    <input
                      id="ana-url"
                      className={"ana-input ana-url-input" + (errors.url ? " has-err" : "")}
                      type="url"
                      value={url}
                      onChange={function(e) { setUrl(e.target.value); clearErr("url"); }}
                      placeholder="https://example.com/announcement"
                    />
                    {url && isValidUrl(url) && (
                      <span className="ana-url-ok">✓</span>
                    )}
                  </div>
                  {errors.url
                    ? <span className="ana-field-err">⚠ {errors.url}</span>
                    : <span className="ana-field-hint">Leave empty if no link is needed</span>
                  }
                </div>
              </div>
            </div>

            {/* ── 4. PNG FILE ── */}
            <div className="ana-section">
              <div className="ana-sec-hdr">
                <div className="ana-sec-ico ana-ico-img">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2"
                      stroke="currentColor" strokeWidth="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                    <path d="M21 15l-5-5L5 21"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="ana-sec-label">Preview Image</span>
                <span className="ana-req-pill">Required</span>
              </div>
              <div className="ana-sec-body">
                <DropZone
                  file={pngFile}
                  onFile={handlePngFile}
                  onClear={function() { setPngFile(null); }}
                  hasError={!!errors.pngFile}
                />
                {errors.pngFile && (
                  <span className="ana-field-err" style={{ marginTop:8, display:"flex" }}>
                    ⚠ {errors.pngFile}
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* ── SIDE PANEL ── */}
          <div className="ana-side-col">
            <div className="ana-preview-card">
              <div className="ana-prev-hdr">
                <span className="ana-live-dot" />
                <span className="ana-prev-label">Live Preview</span>
              </div>

              <div className="ana-prev-body">

                {/* Announcement mock card */}
                <div className="ana-mock">
                  {/* Banner image area */}
                  <div className={"ana-mock-banner" + (imgPreview ? " has-img" : "")}>
                    {imgPreview
                      ? <img src={imgPreview} alt="banner" />
                      : (
                        <div className="ana-mock-banner-empty">
                          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" opacity=".3">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                            <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                          </svg>
                          <span>Preview Image</span>
                        </div>
                      )
                    }
                    {/* Gradient overlay */}
                    <div className="ana-mock-banner-grad" />
                  </div>

                  {/* Text content */}
                  <div className="ana-mock-body">
                    <div className={"ana-mock-title" + (!title.trim() ? " empty" : "")}>
                      {title.trim() || "Announcement title…"}
                    </div>
                    <div className={"ana-mock-subtitle" + (!subtitle.trim() ? " empty" : "")}>
                      {subtitle.trim()
                        ? subtitle.trim().slice(0, 90) + (subtitle.trim().length > 90 ? "…" : "")
                        : "Sub-title will appear here…"}
                    </div>
                    {url && isValidUrl(url) && (
                      <div className="ana-mock-url">
                        <svg width="10" height="10" fill="none" viewBox="0 0 24 24">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        {url.length > 34 ? url.slice(0, 34) + "…" : url}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ring progress */}
                <div className="ana-ring-wrap">
                  <svg className="ana-ring" viewBox="0 0 72 72">
                    <circle cx="36" cy="36" r="29" className="ana-ring-bg" />
                    <circle cx="36" cy="36" r="29"
                      className="ana-ring-fill"
                      strokeDasharray="182.2"
                      strokeDashoffset={182.2 - (182.2 * pct / 100)}
                    />
                  </svg>
                  <div className="ana-ring-pct">{pct}%</div>
                </div>

                {/* Checklist */}
                <div>
                  <div className="ana-check-title">Completion</div>
                  <div className="ana-checks">
                    {checks.map(function(c) {
                      return (
                        <div key={c.label}
                          className={"ana-check" + (c.done ? " done" : "") + (c.optional ? " opt" : "")}>
                          <div className="ana-check-ico">{c.done ? "✓" : ""}</div>
                          <span>{c.label}</span>
                          {c.optional && <span className="ana-check-opt-tag">optional</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {allDone && (
                  <div className="ana-ready-msg">🚀 Ready to publish!</div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* PROGRESS BAR */}
        {saving && (
          <div className="ana-prog-wrap">
            <div className="ana-prog-track">
              <div className="ana-prog-fill" style={{ width: progress + "%" }} />
            </div>
            <div className="ana-prog-row">
              <span>{progMsg}</span>
              <span>{progress}%</span>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="ana-footer">
          <div className="ana-foot-hint">
            Fields marked <strong>*</strong> are required
          </div>
          <div className="ana-btn-group">
            <button className="ana-btn-reset" type="button"
              onClick={handleReset} disabled={saving}>
              Reset
            </button>
            <button className="ana-btn-save" type="button"
              onClick={handleSave} disabled={saving}>
              {saving ? (
                <><span className="ana-save-spin" /> Publishing…</>
              ) : (
                <>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <path d="M22 8s-4 4-10 4S2 8 2 8" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round"/>
                    <path d="M2 8v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M12 12v4" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Publish Announcement
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}