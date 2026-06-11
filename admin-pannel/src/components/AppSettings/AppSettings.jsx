import React, { useEffect, useState, useCallback, useRef } from "react";
import Parse from "../../parseConfig";
import "./AppSettings.css";
import PhoneSizePicker from "./Phonesizepicker";

/* ═══════════════════════════════════════════════════
   Parse class: AppSettings (single record)
   Fields: appVersion, AgoraAppID, AgoraAppCertificate,
           appLogo (File), audiobg (File), AllGames (Array)
═══════════════════════════════════════════════════ */

const getFileUrl = (f) => {
  if (!f) return null;
  if (typeof f === "string") return f;
  if (typeof f.url === "function") return f.url();
  if (f._url) return f._url;
  if (f.url && typeof f.url === "string") return f.url;
  return null;
};

/* ── Toast ── */
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`as-toast as-toast--${toast.type}`}>
      <span className="as-toast-dot" />
      {toast.msg}
    </div>
  );
}

/* ── Section wrapper ── */
function Section({ icon, title, desc, children, action }) {
  return (
    <div className="as-section">
      <div className="as-section-head">
        <div className="as-section-head-left">
          <span className="as-section-icon">{icon}</span>
          <div>
            <h2 className="as-section-title">{title}</h2>
            {desc && <p className="as-section-desc">{desc}</p>}
          </div>
        </div>
        {action && <div className="as-section-action">{action}</div>}
      </div>
      {children}
    </div>
  );
}

/* ── Field wrapper ── */
function Field({ label, hint, children, full }) {
  return (
    <div className={`as-field ${full ? "as-field--full" : ""}`}>
      <label className="as-field-label">{label}</label>
      {hint && <p className="as-field-hint">{hint}</p>}
      {children}
    </div>
  );
}

/* ── Input ── */
function Input({ value, onChange, placeholder, mono, readOnly, type = "text" }) {
  return (
    <input
      className={`as-input ${mono ? "as-input--mono" : ""} ${readOnly ? "as-input--ro" : ""}`}
      value={value ?? ""}
      type={type}
      onChange={readOnly ? undefined : (e => onChange && onChange(e.target.value))}
      placeholder={placeholder}
      readOnly={!!readOnly}
    />
  );
}

/* ── Image upload card ── */
function MediaCard({ label, hint, fileObj, fieldKey, onUpload, uploading }) {
  const inputRef = useRef();
  const url = getFileUrl(fileObj);
  return (
    <div className="as-media-card">
      <div className="as-media-card-label">{label}</div>
      {hint && <p className="as-media-hint">{hint}</p>}
      <div className="as-media-preview">
        {url
          ? <img src={url} alt={label} className="as-media-img" />
          : <div className="as-media-ph"><span>📁</span><small>No file</small></div>
        }
      </div>
      <div className="as-media-btns">
        <button className="as-btn as-btn--sm as-btn--outline"
          disabled={uploading === fieldKey}
          onClick={() => inputRef.current?.click()}>
          {uploading === fieldKey ? <span className="as-spin" /> : "↑"} Upload
        </button>
        {url && (
          <a className="as-btn as-btn--sm as-btn--ghost"
            href={url} target="_blank" rel="noopener noreferrer">↗ View</a>
        )}
        <input ref={inputRef} type="file" accept="image/*"
          style={{ display: "none" }}
          onChange={e => e.target.files[0] && onUpload(fieldKey, e.target.files[0])} />
      </div>
      {url && (
        <div className="as-media-filename">
          {fileObj?.name || url.split("/").pop()}
        </div>
      )}
    </div>
  );
}

/* ── Game row / card ── */
function GameCard({ game, idx, total, onChange, onDelete, onMoveUp, onMoveDown, onSizePick }) {
  const imgUrl = game.image || "";
  const gameSize = game.size ?? 1;
  return (
    <div className={`as-game ${game.active ? "" : "as-game--inactive"}`}>
      <div className="as-game-top">
        <div className="as-game-thumb">
          {imgUrl
            ? <img src={imgUrl} alt={game.name} className="as-game-thumb-img" />
            : <div className="as-game-thumb-ph">🎮</div>
          }
        </div>
        <div className="as-game-id-col">
          <span className="as-game-id">#{game.id}</span>
          <button
            className={`as-status-btn ${game.active ? "as-status-btn--on" : "as-status-btn--off"}`}
            onClick={() => onChange(idx, "active", !game.active)}>
            {game.active ? "● Active" : "○ Off"}
          </button>
        </div>
        <div className="as-game-order">
          <button className="as-icon-btn" disabled={idx === 0} onClick={() => onMoveUp(idx)} title="Move up">↑</button>
          <button className="as-icon-btn" disabled={idx === total - 1} onClick={() => onMoveDown(idx)} title="Move down">↓</button>
          <button
            className="as-icon-btn"
            onClick={() => onSizePick(idx)}
            title={`Screen size: ${Math.round(gameSize * 100)}%`}
            style={{
              width: "50%",
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 900,
              color: "white",
              letterSpacing: "0.03em",
              background: "rgba(99,102,241,0.08)",
              border: "2px solid transparent",
              backgroundImage: `
                linear-gradient(rgba(99,102,241,0.08), rgba(99,102,241,0.08)),
                conic-gradient(from var(--angle,0deg),
                  #6366f1, #f59e0b, #10b981, #f43f5e, #06b6d4, #a855f7, #6366f1)
              `,
              backgroundOrigin: "border-box",
              animation: "borderSpin 2.5s linear infinite",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0,
              transition: "transform .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            <span style={{ fontSize: 13 }}></span>
            <span>View:</span>
            <span style={{
              borderRadius: 20,
              background: "rgba(99,102,241,0.2)",
              border: "1px solid rgba(99,102,241,0.4)",
              fontSize: 10,
              fontWeight: 900,
              color: "white",
            }}>
              {Math.round(gameSize * 100)}%
            </span>
          </button>
          <button className="as-icon-btn as-icon-btn--red" onClick={() => onDelete(idx)} title="Delete">🗑</button>
        </div>
      </div>
      <div className="as-game-fields">
        <div className="as-game-row">
          <div className="as-game-field">
            <label className="as-game-field-label">Name</label>
            <input className="as-game-input" value={game.name || ""}
              onChange={e => onChange(idx, "name", e.target.value)}
              placeholder="Game name" />
          </div>
          <div className="as-game-field">
            <label className="as-game-field-label">Company</label>
            <select
              className="as-game-input"
              value={game.company || ""}
              onChange={(e) => onChange(idx, "company", e.target.value)}
            >
              <option value="">Select Company</option>
              <option value="dell">dell</option>
              <option value="baisun">baisun</option>
              <option value="sud">sud</option>
              <option value="bytesun">bytesun</option>
              <option value="joysdk">joysdk</option>
            </select>
          </div>
        </div>
        <div className="as-game-field">
          <label className="as-game-field-label">Image URL</label>
          <input className="as-game-input as-game-input--url" value={game.image || ""}
            onChange={e => onChange(idx, "image", e.target.value)}
            placeholder="https://cdn.example.com/game.png" />
        </div>
        <div className="as-game-field">
          <label className="as-game-field-label">Game URL</label>
          <input className="as-game-input as-game-input--url" value={game.url || ""}
            onChange={e => onChange(idx, "url", e.target.value)}
            placeholder="https://cdn.example.com/games/..." />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════ */
export default function AppSettings() {

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState("general");
  const [unsaved, setUnsaved] = useState(false);
  const [sizePicker, setSizePicker] = useState(null);

  /* form state */
  const [appVersion, setAppVersion] = useState("");
  const [appLogo, setAppLogo] = useState(null);
  const [audioBg, setAudioBg] = useState(null);
  const [audioSeat, setAudioSeat] = useState(null);
  const [multiBg, setMultiBg] = useState(null);
  const [games, setGames] = useState([]);
  // Agora fields - using exact Parse column names: AgoraAppID and AgoraAppCertificate
  const [agoraAppId, setAgoraAppId] = useState("");
  const [agoraAppCertificate, setAgoraAppCertificate] = useState("");

  const initialized = useRef(false);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* ── Load settings from Parse ── */
  useEffect(() => {
    (async () => {
      try {
        const q = new Parse.Query("AppSettings");
        const obj = await q.first({ useMasterKey: true });
        if (!obj) { 
          showToast("No AppSettings found", "error"); 
          setLoading(false); 
          return; 
        }
        setRecord(obj);
        setAppVersion(obj.get("appVersion") || "");
        // FIXED: Use correct field name "AgoraAppID" (capital D)
        setAgoraAppId(obj.get("AgoraAppID") || "");
        setAgoraAppCertificate(obj.get("AgoraAppCertificate") || "");
        setAppLogo(obj.get("appLogo") || null);
        setAudioBg(obj.get("audiobg") || null);
        setAudioSeat(obj.get("audio_seat") || null);
        setMultiBg(obj.get("multibg") || null);
        
        const loadedGames = (obj.get("AllGames") || []).map(g => ({
          ...g,
          size: g.size ?? 1,
          active: g.active ?? true,
        }));
        setGames(loadedGames);
        
        setTimeout(() => { initialized.current = true; }, 100);
      } catch (e) { 
        showToast("Load failed: " + e.message, "error"); 
      } finally {
        setLoading(false);
      }
    })();
  }, [showToast]);

  /* mark unsaved only after initial load */
  useEffect(() => {
    if (!initialized.current) return;
    setUnsaved(true);
  }, [appVersion, agoraAppId, agoraAppCertificate, appLogo, audioBg, audioSeat, multiBg, games]);

  /* ── File upload handler ── */
  const handleUpload = async (field, file) => {
    setUploading(field);
    try {
      const pf = new Parse.File(file.name, file);
      await pf.save({ useMasterKey: true });
      if (field === "appLogo") setAppLogo(pf);
      if (field === "audiobg") setAudioBg(pf);
      if (field === "audio_seat") setAudioSeat(pf);
      if (field === "multibg") setMultiBg(pf);
      showToast("File uploaded ✓", "success");
    } catch (e) { 
      showToast("Upload failed: " + e.message, "error"); 
    } finally {
      setUploading(null);
    }
  };

  /* ── Save all settings to Parse ── */
  const handleSave = async () => {
    if (!record) return;
    setSaving(true);
    try {
      record.set("appVersion", appVersion.trim());
      // FIXED: Use correct field name "AgoraAppID"
      record.set("AgoraAppID", agoraAppId);
      record.set("AgoraAppCertificate", agoraAppCertificate);
      if (appLogo) record.set("appLogo", appLogo);
      if (audioBg) record.set("audiobg", audioBg);
      if (audioSeat) record.set("audio_seat", audioSeat);
      if (multiBg) record.set("multibg", multiBg);
      record.set("AllGames", games);
      await record.save(null, { useMasterKey: true });
      setUnsaved(false);
      initialized.current = true;
      showToast("Settings saved successfully ✓", "success");
    } catch (e) { 
      showToast("Save failed: " + e.message, "error"); 
    } finally {
      setSaving(false);
    }
  };

  /* ── Reset to last saved values ── */
  const handleReset = () => {
    if (!record) return;
    initialized.current = false;
    setAppVersion(record.get("appVersion") || "");
    setAgoraAppId(record.get("AgoraAppID") || "");
    setAgoraAppCertificate(record.get("AgoraAppCertificate") || "");
    setAppLogo(record.get("appLogo") || null);
    setAudioBg(record.get("audiobg") || null);
    setAudioSeat(record.get("audio_seat") || null);
    setMultiBg(record.get("multibg") || null);
    const resetGames = (record.get("AllGames") || []).map(g => ({
      ...g,
      size: g.size ?? 1,
      active: g.active ?? true,
    }));
    setGames(resetGames);
    setUnsaved(false);
    setTimeout(() => { initialized.current = true; }, 100);
    showToast("Reset to saved values", "info");
  };

  /* ── Game management helpers ── */
  const gameChange = (i, key, val) => setGames(g => g.map((x, j) => j === i ? { ...x, [key]: val } : x));
  const gameDelete = (i) => { 
    setGames(g => g.filter((_, j) => j !== i)); 
    showToast("Game removed (save to apply)", "info"); 
  };
  const gameMoveUp = (i) => {
    if (i === 0) return;
    setGames(g => { 
      const a = [...g]; 
      [a[i-1], a[i]] = [a[i], a[i-1]]; 
      return a; 
    });
  };
  const gameMoveDown = (i) => {
    setGames(g => { 
      if (i >= g.length-1) return g; 
      const a = [...g]; 
      [a[i], a[i+1]] = [a[i+1], a[i]]; 
      return a; 
    });
  };
  const gameAdd = () => setGames(g => [...g, { 
    id: Date.now(), 
    name: "", 
    image: "", 
    url: "", 
    company: "", 
    active: true,
    size: 1 
  }]);

  const TABS = [
    { key: "general", label: "General", icon: "⚙" },
    { key: "media", label: "Media", icon: "🖼" },
    { key: "agora", label: "Agora", icon: "📡" },
    { key: "games", label: "Games", icon: "🎮", count: games.length },
  ];

  /* ════════════ RENDER ════════════ */
  if (loading) return (
    <div className="as-root">
      <div className="as-loading">
        <div className="as-spinner" />
        <p>Loading settings…</p>
      </div>
    </div>
  );

  if (!record) return (
    <div className="as-root">
      <div className="as-empty-state">
        <span>⚙</span><p>No AppSettings record found.</p>
      </div>
    </div>
  );

  return (
    <>
      <div className="as-root">
        <Toast toast={toast} />

        {/* ── HEADER ── */}
        <div className="as-header">
          <div className="as-header-left">
            <div className="as-header-icon">⚙</div>
            <div>
              <h1 className="as-title">App Settings</h1>
              <p className="as-subtitle">Configure version, media, streaming &amp; games</p>
            </div>
          </div>
          <div className="as-header-right">
            {unsaved && <span className="as-unsaved-dot" title="Unsaved changes" />}
            <div className="as-record-pill">
              <span>ID:</span>
              <code>{record.id}</code>
            </div>
            <button className="as-btn as-btn--ghost" onClick={handleReset} disabled={saving}>↺ Reset</button>
            <button className="as-btn as-btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? <><span className="as-spin" /> Saving…</> : "💾 Save Changes"}
            </button>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="as-tabs">
          {TABS.map(t => (
            <button key={t.key} className={`as-tab ${tab === t.key ? "on" : ""}`}
              onClick={() => setTab(t.key)}>
              <span className="as-tab-icon">{t.icon}</span>
              {t.label}
              {t.count !== undefined && <span className="as-tab-badge">{t.count}</span>}
            </button>
          ))}
        </div>

        {/* ── CONTENT ── */}
        <div className="as-body">

          {/* ══ GENERAL ══ */}
          {tab === "general" && (
            <Section icon="⚙" title="General" desc="Core app configuration and metadata">
              <div className="as-fields">
                <Field label="App Version" hint="Current version shown to users, used for forced update checks">
                  <Input value={appVersion} onChange={setAppVersion} placeholder="e.g. 1.03" />
                </Field>
                <Field label="Object ID" hint="Parse record identifier (read-only)">
                  <Input value={record.id} mono readOnly />
                </Field>
                <Field label="Last Updated" hint="When these settings were last saved">
                  <Input value={record.updatedAt ? new Date(record.updatedAt).toLocaleString() : "—"} mono readOnly />
                </Field>
                <Field label="Created At" hint="When this record was first created">
                  <Input value={record.createdAt ? new Date(record.createdAt).toLocaleString() : "—"} mono readOnly />
                </Field>
              </div>
              <div className="as-info-box">
                <div className="as-info-box-icon">📱</div>
                <div>
                  <strong>Current Version: {appVersion || "—"}</strong>
                  <p>The mobile app compares its installed version against this value to decide whether to prompt for an update.</p>
                </div>
              </div>
            </Section>
          )}

          {/* ══ MEDIA ══ */}
          {tab === "media" && (
            <Section icon="🖼" title="Media Assets" desc="App logo and audio room background image">
              <div className="as-media-grid">
                <MediaCard
                  label="App Logo"
                  hint="Main logo shown in app header and splash screen"
                  fileObj={appLogo}
                  fieldKey="appLogo"
                  onUpload={handleUpload}
                  uploading={uploading}
                />
                <MediaCard
                  label="Audio Room Background"
                  hint="Background image shown in audio/voice rooms"
                  fileObj={audioBg}
                  fieldKey="audiobg"
                  onUpload={handleUpload}
                  uploading={uploading}
                />
                <MediaCard
                  label="Audio Seat"
                  hint="Mic seat icon shown in audio rooms"
                  fileObj={audioSeat}
                  fieldKey="audio_seat"
                  onUpload={handleUpload}
                  uploading={uploading}
                />
                <MediaCard
                  label="Multi Room Background"
                  hint="Background image shown in multi-host rooms"
                  fileObj={multiBg}
                  fieldKey="multibg"
                  onUpload={handleUpload}
                  uploading={uploading}
                />
              </div>
            </Section>
          )}

          {/* ══ AGORA (only two input fields, using AgoraAppID and AgoraAppCertificate) ══ */}
          {tab === "agora" && (
            <Section icon="📡" title="Agora Configuration" desc="Agora App ID and Certificate for video/voice calls">
              <div className="as-fields">
                <Field label="Agora App ID" hint="Your Agora application identifier">
                  <Input 
                    value={agoraAppId} 
                    onChange={setAgoraAppId} 
                    placeholder="Enter Agora App ID" 
                  />
                </Field>
                
                <Field label="Agora App Certificate" hint="Your Agora application certificate (for token generation)">
                  <Input 
                    type="password"
                    value={agoraAppCertificate} 
                    onChange={setAgoraAppCertificate} 
                    placeholder="Enter Agora App Certificate" 
                  />
                </Field>
                
                <div className="as-info-box">
                  <div className="as-info-box-icon">📡</div>
                  <div>
                    <strong>Agora Configuration</strong>
                    <p>These credentials are used for video calls, voice rooms, and live streaming features.</p>
                    <p style={{ fontSize: "12px", marginTop: "8px", color: "#f59e0b" }}>
                      ⚠️ Keep your App Certificate secure. Never expose it to clients.
                    </p>
                    <p style={{ fontSize: "12px", marginTop: "4px", color: "#6b7280" }}>
                      ✅ Stored in Parse fields: <code>AgoraAppID</code> and <code>AgoraAppCertificate</code>
                    </p>
                  </div>
                </div>
              </div>
            </Section>
          )}       

          {/* ══ GAMES ══ */}
          {tab === "games" && (
            <Section
              icon="🎮"
              title="In-App Games"
              desc="Manage games available inside the app — toggle, reorder, update URLs"
              action={
                <button className="as-btn as-btn--primary" onClick={gameAdd}>+ Add Game</button>
              }
            >
              <div className="as-games-summary">
                <span className="as-pill as-pill--green">✓ {games.filter(g=>g.active).length} active</span>
                <span className="as-pill as-pill--red">✕ {games.filter(g=>!g.active).length} inactive</span>
                <span className="as-pill as-pill--blue">{games.length} total</span>
              </div>

              {games.length === 0 ? (
                <div className="as-games-empty">
                  <span>🎮</span>
                  <p>No games configured</p>
                  <button className="as-btn as-btn--outline" onClick={gameAdd}>+ Add First Game</button>
                </div>
              ) : (
                <div className="as-games-list">
                  {games.map((game, idx) => (
                    <GameCard
                      key={game.id || idx}
                      game={game} 
                      idx={idx} 
                      total={games.length}
                      onChange={gameChange}
                      onDelete={gameDelete}
                      onMoveUp={gameMoveUp}
                      onMoveDown={gameMoveDown}
                      onSizePick={(i) => setSizePicker({ idx: i, game: games[i] })}
                    />
                  ))}
                </div>
              )}  
            </Section>
          )}

        </div>

        {/* ── STICKY BOTTOM BAR ── */}
        <div className={`as-bottom-bar ${unsaved ? "as-bottom-bar--visible" : ""}`}>
          <span className="as-bottom-bar-msg">⚠ You have unsaved changes</span>
          <div className="as-bottom-bar-btns">
            <button className="as-btn as-btn--ghost" onClick={handleReset} disabled={saving}>↺ Discard</button>
            <button className="as-btn as-btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? <><span className="as-spin" /> Saving…</> : "💾 Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {sizePicker && (
        <PhoneSizePicker
          game={sizePicker.game}
          onClose={() => setSizePicker(null)}
          onSave={(newSize) => {
            gameChange(sizePicker.idx, "size", newSize);
            setSizePicker(null);
            showToast(`✓ ${sizePicker.game.name} screen set to ${Math.round(newSize * 100)}%`);
          }}
        />
      )}
    </>
  );
}