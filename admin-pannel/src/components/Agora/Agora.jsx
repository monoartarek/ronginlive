// AgoraSettings.jsx
import React, { useState, useEffect } from "react";
import Parse from "../../parseConfig";
import "./Agora.css";

/* ─────────────────────────────────────────
   ICONS
───────────────────────────────────────── */
function IconSave() {
  return ( 
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
        stroke="currentColor" strokeWidth="2"/>
      <path d="M17 21v-8H7v8M7 3v5h8"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IconEye({ open }) {
  return open ? (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ) : (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M1 1l22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconSettingsGear() {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function IconDatabase() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
      <ellipse cx="12" cy="5" rx="9" ry="3" stroke="currentColor" strokeWidth="2"/>
      <path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12" stroke="currentColor" strokeWidth="2"/>
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function IconApps() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
      <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
      <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
      <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
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

function IconEdit() {
  return (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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

function IconLock() {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  );
}

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function maskValue(str) {
  if (!str) return "—";
  if (str.length <= 8) return "•".repeat(str.length);
  return str.slice(0, 4) + "•".repeat(Math.min(str.length - 8, 14)) + str.slice(-4);
}

function fmtDate(val) {
  if (!val) return "—";
  try {
    var d = val instanceof Date ? val : new Date(val);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch (_) { return String(val); }
}

/* ─────────────────────────────────────────
   COPY BUTTON
───────────────────────────────────────── */
function CopyBtn({ value }) {
  var [copied, setCopied] = useState(false);
  function handleCopy() {
    if (!value) return;
    if (navigator.clipboard) navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(function() { setCopied(false); }, 1800);
  }
  return (
    <button
      className={"ags-copy-btn" + (copied ? " copied" : "")}
      type="button"
      onClick={handleCopy}
      title="Copy to clipboard"
    >
      {copied ? <IconCheck /> : <IconCopy />}
      <span>{copied ? "Copied!" : "Copy"}</span>
    </button>
  );
}

/* ─────────────────────────────────────────
   TOAST
───────────────────────────────────────── */
function Toast({ msg, type }) {
  return (
    <div className={"ags-toast ags-toast-" + type}>
      <span className="ags-toast-icon">
        {type === "success" ? "✓" : type === "error" ? "✗" : "ℹ"}
      </span>
      <span>{msg}</span>
    </div>
  );
}

/* ─────────────────────────────────────────
   SECTION HEADER
───────────────────────────────────────── */
function SectionHeader({ icon, title, subtitle, action }) {
  return (
    <div className="ags-sec-hdr">
      <div className="ags-sec-hdr-left">
        <div className="ags-sec-icon">{icon}</div>
        <div className="ags-sec-text">
          <h2 className="ags-sec-title">{title}</h2>
          {subtitle && <p className="ags-sec-sub">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="ags-sec-action">{action}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────
   SKELETON ROWS
───────────────────────────────────────── */
function SkeletonRows() {
  return (
    <div className="ags-skeleton-wrap">
      {[1, 2, 3].map(function(i) {
        return (
          <div key={i} className="ags-skeleton-row">
            <div className="ags-skeleton short" />
            <div className="ags-skeleton medium" />
            <div className="ags-skeleton long" />
            <div className="ags-skeleton medium" />
            <div className="ags-skeleton short" />
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function AgoraSettings() {

  /* Form */
  var [appId,       setAppId]       = useState("");
  var [certificate, setCertificate] = useState("");

  /* Saved display */
  var [savedAppId,       setSavedAppId]       = useState("");
  var [savedCertificate, setSavedCertificate] = useState("");
  var [settingsParseObj, setSettingsParseObj] = useState(null);

  /* Table */
  var [tableData,    setTableData]    = useState([]);
  var [tableLoading, setTableLoading] = useState(true);

  /* UI */
  var [saving,    setSaving]    = useState(false);
  var [showAppId, setShowAppId] = useState(false);
  var [showCert,  setShowCert]  = useState(false);
  var [showSaved, setShowSaved] = useState(false);
  var [toast,     setToast]     = useState(null);
  var [errors,    setErrors]    = useState({});

  /* ── Load saved settings ── */
  useEffect(function() {
    var q = new Parse.Query(Parse.Object.extend("AgoraSettings"));
    q.descending("createdAt");
    q.first()
      .then(function(result) {
        if (result) {
          var id   = result.get("appId")       || "";
          var cert = result.get("certificate") || "";
          setAppId(id);
          setCertificate(cert);
          setSavedAppId(id);
          setSavedCertificate(cert);
          setSettingsParseObj(result);
        }
      })
      .catch(function(err) {
        console.error("Load AgoraSettings error:", err);
        showToast("Could not load settings from Parse.", "error");
      });
  }, []);

  /* ── Load AgoraList table ── */
  useEffect(function() {
    fetchTable();
  }, []);

  function fetchTable() {
    setTableLoading(true);
    var q = new Parse.Query(Parse.Object.extend("AgoraList"));
    q.descending("createdAt");
    q.limit(500);
    q.find()
      .then(function(results) {
        setTableData(results);
        setTableLoading(false);
      })
      .catch(function(err) {
        console.error("Fetch AgoraList error:", err);
        showToast("Could not load app list from Parse.", "error");
        setTableLoading(false);
      });
  }

  /* ── Helpers ── */
  function showToast(msg, type) {
    setToast({ msg: msg, type: type });
    setTimeout(function() { setToast(null); }, 3200);
  }

  function clearErr(key) {
    setErrors(function(prev) {
      var n = Object.assign({}, prev); delete n[key]; return n;
    });
  }

  function validate() {
    var e = {};
    if (!appId.trim())                                         e.appId       = "Agora App ID is required";
    else if (appId.trim().length < 6)                          e.appId       = "App ID seems too short";
    if (!certificate.trim())                                   e.certificate = "App Certificate is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  /* ── Save settings ── */
  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      var obj = settingsParseObj || new (Parse.Object.extend("AgoraSettings"))();
      obj.set("appId",       appId.trim());
      obj.set("certificate", certificate.trim());
      await obj.save();
      setSettingsParseObj(obj);
      setSavedAppId(appId.trim());
      setSavedCertificate(certificate.trim());
      showToast("Settings saved successfully!", "success");
    } catch (err) {
      console.error("Save error:", err);
      showToast("Failed to save. Check console.", "error");
    } finally {
      setSaving(false);
    }
  }

  /* ── Delete app ── */
  async function handleDeleteRow(item) {
    var name = gName(item);
    if (!window.confirm('Delete "' + name + '"?')) return;
    try {
      await item.destroy();
      setTableData(function(prev) { return prev.filter(function(r) { return r.id !== item.id; }); });
      showToast('"' + name + '" removed.', "info");
    } catch (err) {
      console.error("Delete error:", err);
      showToast("Failed to delete.", "error");
    }
  }

  /* ── Field getters ── */
  function gName(r)    { return r.get("name")        || r.get("appName")  || "Unnamed App"; }
  function gAppId(r)   { return r.get("appId")       || r.get("appID")    || ""; }
  function gCert(r)    { return r.get("certificate") || r.get("cert")     || ""; }
  function gUsed(r)    { return !!(r.get("used")     || r.get("isUsed")   || false); }
  function gLastUse(r) {
    return fmtDate(r.get("lastUse") || r.get("lastUsed") || r.get("updatedAt") || null);
  }

  /* ═══════════════════════════════════════
     RENDER
  ═══════════════════════════════════════ */
  return (
    <div className="ags-page">
      <div className="ags-topline" />
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div className="ags-wrap">

        {/* PAGE HEADER */}
        <div className="ags-page-hdr">
          <div className="ags-page-hdr-left">
            <div className="ags-page-logo">
              <IconSettingsGear />
            </div>
            <div>
              <h1 className="ags-page-title">Agora Settings</h1>
              <p className="ags-page-sub">Configure credentials &amp; manage Agora apps</p>
            </div>
          </div>
          <div className="ags-status-pill">
            <span className="ags-status-dot" />
            Live · Parse Connected
          </div>
        </div>

        {/* ══════════════════════════
            SECTION 1 — Update Settings
        ══════════════════════════ */}
        <div className="ags-card">
          <SectionHeader
            icon={<IconSettingsGear />}
            title="Update Agora Settings"
            subtitle="Credentials are stored in the AgoraSettings Parse class"
          />

          <div className="ags-form">

            {/* App ID Field */}
            <div className="ags-field">
              <label className="ags-label" htmlFor="ags-appid">
                Agora App ID <span className="ags-req">*</span>
              </label>
              <div className="ags-input-row">
                <div className="ags-input-icon"><IconLock /></div>
                <input
                  id="ags-appid"
                  className={"ags-input" + (errors.appId ? " err" : "")}
                  type={showAppId ? "text" : "password"}
                  value={appId}
                  onChange={function(e) { setAppId(e.target.value); clearErr("appId"); }}
                  placeholder="Paste your Agora App ID here"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  className="ags-eye-btn"
                  type="button"
                  onClick={function() { setShowAppId(function(v) { return !v; }); }}
                  title={showAppId ? "Hide" : "Show"}
                >
                  <IconEye open={showAppId} />
                </button>
              </div>
              {errors.appId
                ? <span className="ags-err-msg">⚠ {errors.appId}</span>
                : <span className="ags-hint-msg">Found in Agora Console → Project Management</span>
              }
            </div>

            {/* Certificate Field */}
            <div className="ags-field">
              <label className="ags-label" htmlFor="ags-cert">
                Agora App Certificate <span className="ags-req">*</span>
              </label>
              <div className="ags-input-row">
                <div className="ags-input-icon"><IconStar /></div>
                <input
                  id="ags-cert"
                  className={"ags-input" + (errors.certificate ? " err" : "")}
                  type={showCert ? "text" : "password"}
                  value={certificate}
                  onChange={function(e) { setCertificate(e.target.value); clearErr("certificate"); }}
                  placeholder="Paste your Agora App Certificate here"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  className="ags-eye-btn"
                  type="button"
                  onClick={function() { setShowCert(function(v) { return !v; }); }}
                  title={showCert ? "Hide" : "Show"}
                >
                  <IconEye open={showCert} />
                </button>
              </div>
              {errors.certificate
                ? <span className="ags-err-msg">⚠ {errors.certificate}</span>
                : <span className="ags-hint-msg">Enable App Certificate in Agora Console first</span>
              }
            </div>

            {/* Form Footer */}
            <div className="ags-form-footer">
              <p className="ags-form-note">
                {settingsParseObj
                  ? <><span className="ags-note-dot saved" />Updating record: <code>{settingsParseObj.id}</code></>
                  : <><span className="ags-note-dot new" />No record yet — will create on first save</>
                }
              </p>
              <button
                className="ags-save-btn"
                type="button"
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? <><span className="ags-btn-spin" /> Saving…</>
                  : <><IconSave /> Save Settings</>
                }
              </button>
            </div>

          </div>
        </div>

        {/* ══════════════════════════
            SECTION 2 — Current Data
        ══════════════════════════ */}
        <div className="ags-card">
          <SectionHeader
            icon={<IconDatabase />}
            title="Current Stored Data"
            subtitle="Live values loaded from Parse · AgoraSettings class"
          />

          <div className="ags-stored-body">

            {!savedAppId && !savedCertificate ? (
              <div className="ags-stored-empty">
                <span>No credentials saved yet. Use the form above to save settings.</span>
              </div>
            ) : (
              <div className="ags-stored-grid">

                {/* App ID */}
                <div className="ags-stored-card">
                  <div className="ags-stored-card-top">
                    <div className="ags-stored-label-row">
                      <span className="ags-dot blue" />
                      <span className="ags-stored-label">Agora App ID</span>
                    </div>
                    <CopyBtn value={savedAppId} />
                  </div>
                  <div className="ags-stored-value">
                    {showSaved ? (savedAppId || "—") : maskValue(savedAppId)}
                  </div>
                </div>

                {/* Certificate */}
                <div className="ags-stored-card">
                  <div className="ags-stored-card-top">
                    <div className="ags-stored-label-row">
                      <span className="ags-dot purple" />
                      <span className="ags-stored-label">App Certificate</span>
                    </div>
                    <CopyBtn value={savedCertificate} />
                  </div>
                  <div className="ags-stored-value">
                    {showSaved ? (savedCertificate || "—") : maskValue(savedCertificate)}
                  </div>
                </div>

              </div>
            )}

            <div className="ags-stored-footer">
              <button
                className="ags-reveal-btn"
                type="button"
                disabled={!savedAppId && !savedCertificate}
                onClick={function() { setShowSaved(function(v) { return !v; }); }}
              >
                <IconEye open={showSaved} />
                {showSaved ? "Hide Values" : "Reveal Values"}
              </button>
            </div>

          </div>
        </div>

        {/* ══════════════════════════
            SECTION 3 — Apps Table
        ══════════════════════════ */}
        <div className="ags-card">
          <SectionHeader
            icon={<IconApps />}
            title="Available Agora Apps"
            subtitle={"Fetched from AgoraList · " + (tableLoading ? "loading…" : tableData.length + " record" + (tableData.length !== 1 ? "s" : ""))}
            action={
              <button
                className="ags-refresh-btn"
                type="button"
                onClick={fetchTable}
                disabled={tableLoading}
              >
                <IconRefresh />
                <span>Refresh</span>
              </button>
            }
          />

          {/* Loading skeleton */}
          {tableLoading && <SkeletonRows />}

          {/* Empty state */}
          {!tableLoading && tableData.length === 0 && (
            <div className="ags-empty-state">
              <div className="ags-empty-icon-wrap">
                <svg width="40" height="40" fill="none" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2"
                    stroke="currentColor" strokeWidth="1.5" opacity=".3"/>
                  <path d="M3 9h18M9 9v12" stroke="currentColor"
                    strokeWidth="1.5" strokeLinecap="round" opacity=".3"/>
                </svg>
              </div>
              <p className="ags-empty-title">No Agora apps found</p>
              <p className="ags-empty-desc">
                Please add records to the <code>AgoraList</code> class in your Parse dashboard.
              </p>
            </div>
          )}

          {/* Data */}
          {!tableLoading && tableData.length > 0 && (
            <>
              {/* DESKTOP TABLE */}
              <div className="ags-tbl-wrap">
                <table className="ags-tbl">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>App ID</th>
                      <th>Certificate</th>
                      <th>Status</th>
                      <th>Last Use</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map(function(row, idx) {
                      var used = gUsed(row);
                      return (
                        <tr key={row.id}>
                          <td><span className="ags-row-num">{idx + 1}</span></td>
                          <td>
                            <div className="ags-name-cell">
                              <div className={"ags-name-avatar " + (used ? "active" : "")}>
                                {gName(row).charAt(0).toUpperCase()}
                              </div>
                              <span className="ags-name-text">{gName(row)}</span>
                            </div>
                          </td>
                          <td><span className="ags-mono-chip">{maskValue(gAppId(row))}</span></td>
                          <td><span className="ags-mono-chip">{maskValue(gCert(row))}</span></td>
                          <td>
                            <span className={"ags-badge " + (used ? "active" : "inactive")}>
                              <span className="ags-badge-dot" />
                              {used ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td><span className="ags-date">{gLastUse(row)}</span></td>
                          <td>
                            <div className="ags-row-actions">
                              <button className="ags-icon-btn edit" type="button" title="Edit">
                                <IconEdit />
                              </button>
                              <button
                                className="ags-icon-btn delete"
                                type="button"
                                title="Delete"
                                onClick={function() { handleDeleteRow(row); }}
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

              {/* MOBILE LIST */}
              <div className="ags-mob-list">
                {tableData.map(function(row, idx) {
                  var used = gUsed(row);
                  return (
                    <div key={row.id} className={"ags-mob-card " + (used ? "active" : "")}>
                      {/* Header */}
                      <div className="ags-mob-hdr">
                        <div className="ags-mob-left">
                          <div className={"ags-mob-avatar " + (used ? "active" : "")}>
                            {gName(row).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="ags-mob-name">{gName(row)}</div>
                            <div className="ags-mob-meta">#{idx + 1} · {gLastUse(row)}</div>
                          </div>
                        </div>
                        <span className={"ags-badge " + (used ? "active" : "inactive")}>
                          <span className="ags-badge-dot" />
                          {used ? "Active" : "Inactive"}
                        </span>
                      </div>

                      {/* Fields grid */}
                      <div className="ags-mob-grid">
                        <div className="ags-mob-field">
                          <span className="ags-mob-lbl">App ID</span>
                          <span className="ags-mob-val mono">{maskValue(gAppId(row))}</span>
                        </div>
                        <div className="ags-mob-field">
                          <span className="ags-mob-lbl">Certificate</span>
                          <span className="ags-mob-val mono">{maskValue(gCert(row))}</span>
                        </div>
                        <div className="ags-mob-field">
                          <span className="ags-mob-lbl">Object ID</span>
                          <span className="ags-mob-val mono small">{row.id}</span>
                        </div>
                        <div className="ags-mob-field">
                          <span className="ags-mob-lbl">Last Use</span>
                          <span className="ags-mob-val">{gLastUse(row)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="ags-mob-actions">
                        <button className="ags-mob-btn edit" type="button">
                          <IconEdit /> Edit
                        </button>
                        <button
                          className="ags-mob-btn delete"
                          type="button"
                          onClick={function() { handleDeleteRow(row); }}
                        >
                          <IconTrash /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer count */}
              <div className="ags-tbl-footer">
                <span className="ags-tbl-count">
                  {tableData.length} app{tableData.length !== 1 ? "s" : ""} in AgoraList
                </span>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}