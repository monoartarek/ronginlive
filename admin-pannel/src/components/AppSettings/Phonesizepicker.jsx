import React, { useState, useRef, useCallback, useEffect } from "react";

export default function PhoneSizePicker({ game, onClose, onSave }) {
  const [size,     setSize]     = useState(game?.size ?? 1.0);
  const [dragging, setDragging] = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
  const screenRef = useRef(null);

  /* detect resize */
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  const sizeFromY = useCallback((clientY) => {
    const el = screenRef.current;
    if (!el) return size;
    const rect = el.getBoundingClientRect();
    const ratio = (clientY - rect.top) / rect.height;
    return clamp(1 - ratio, 0.10, 1.0);
  }, [size]);

  const onPointerDown = (e) => {
    e.preventDefault();
    setDragging(true);
    setSize(sizeFromY(e.clientY ?? e.touches?.[0]?.clientY));
  };

  useEffect(() => {
    if (!dragging) return;
    const move = (e) => {
      const y = e.clientY ?? e.touches?.[0]?.clientY;
      if (y != null) setSize(sizeFromY(y));
    };
    const up = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, sizeFromY]);

  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => onSave(parseFloat(size.toFixed(2))), 320);
  };

  const pct       = Math.round(size * 100);
  const labelText = size >= 0.95 ? "Full Screen"
                  : size >= 0.75 ? "Large"
                  : size >= 0.50 ? "Medium"
                  : size >= 0.30 ? "Small"
                  : "Tiny";
  const accent    = size >= 0.8 ? "#6366f1"
                  : size >= 0.5 ? "#f59e0b"
                  : "#f43f5e";

  const PRESETS = [
    { label: "Full",  val: 1.00 },
    { label: "90%",   val: 0.90 },
    { label: "80%",   val: 0.80 },
    { label: "70%",   val: 0.70 },
    { label: "50%",   val: 0.50 },
    { label: "10%",   val: 0.10 },
  ];

  /* phone dimensions */
  const phoneW = isMobile ? 150 : 180;
  const phoneH = isMobile ? 300 : 360;

  /* ── PHONE MOCKUP (shared) ── */
  const PhoneMockup = () => (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        width: phoneW, height: phoneH, borderRadius: 32,
        background: "linear-gradient(160deg,#1e2336,#0d1022)",
        border: "2.5px solid rgba(255,255,255,0.14)",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 60px rgba(0,0,0,0.8)",
        position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>
        {/* notch */}
        <div style={{
          width: 64, height: 22, background: "#0d1022",
          borderRadius: "0 0 14px 14px",
          margin: "7px auto 0", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          position: "relative", zIndex: 10,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#1e2743" }}/>
          <div style={{ width: 20, height: 4, borderRadius: 4, background: "#1e2743" }}/>
        </div>

        {/* interactive screen */}
        <div
          ref={screenRef}
          onPointerDown={onPointerDown}
          style={{
            flex: 1, position: "relative", overflow: "hidden",
            cursor: dragging ? "grabbing" : "grab",
            userSelect: "none", touchAction: "none",
            background: "#0a0d1a",
            margin: "5px 7px 8px", borderRadius: 16,
          }}>

          {/* non-game area */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0,
            height: `${(1 - size) * 100}%`,
            background: "linear-gradient(180deg,#0f1526,#0a0d1a)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "flex-end", paddingBottom: 5,
            transition: dragging ? "none" : "height .2s ease", zIndex: 2,
          }}>
            {size < 0.95 && (
              <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                <div style={{ width: 22, height: 2.5, borderRadius: 2, background: "rgba(255,255,255,0.12)" }}/>
                <div style={{ width: 11, height: 2.5, borderRadius: 2, background: "rgba(255,255,255,0.07)" }}/>
              </div>
            )}
          </div>

          {/* game fill */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            height: `${pct}%`,
            transition: dragging ? "none" : "height .2s ease",
            overflow: "hidden", zIndex: 1,
          }}>
            {game?.image
              ? <img src={game.image} alt={game.name} draggable={false}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/>
              : <div style={{
                  width: "100%", height: "100%",
                  background: `linear-gradient(160deg,${accent}30,${accent}08)`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32,
                }}>🎮</div>
            }
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(180deg,rgba(99,102,241,0.07) 0%,transparent 40%)",
              pointerEvents: "none",
            }}/>
          </div>

          {/* handle line */}
          <div style={{
            position: "absolute", left: 0, right: 0,
            top: `${(1 - size) * 100}%`, height: 2,
            background: accent,
            boxShadow: `0 0 10px ${accent}, 0 0 20px ${accent}50`,
            transition: dragging ? "none" : "top .2s ease, background .3s",
            zIndex: 5, pointerEvents: "none",
          }}/>

          {/* knob */}
          <div style={{
            position: "absolute", left: "50%",
            top: `${(1 - size) * 100}%`,
            transform: "translate(-50%,-50%)",
            width: 28, height: 28, borderRadius: "50%",
            background: accent,
            border: "3px solid rgba(255,255,255,0.9)",
            boxShadow: `0 0 0 4px ${accent}40, 0 4px 14px rgba(0,0,0,0.5)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: dragging ? "grabbing" : "grab",
            zIndex: 6,
            transition: dragging ? "none" : "top .2s ease, background .3s",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 8, height: 1.5, borderRadius: 1, background: "rgba(255,255,255,0.9)" }}/>
              ))}
            </div>
          </div>

          {/* % badge */}
          <div style={{
            position: "absolute",
            top: `${Math.min((1 - size) * 100 + 4, 85)}%`,
            right: 5,
            padding: "2px 6px", borderRadius: 7,
            background: accent, color: "#fff",
            fontSize: 9, fontWeight: 800, letterSpacing: "0.04em",
            zIndex: 7, pointerEvents: "none",
            transition: dragging ? "none" : "top .2s ease",
            boxShadow: `0 2px 8px ${accent}60`,
          }}>{pct}%</div>
        </div>

        {/* home bar */}
        <div style={{ height: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ width: 44, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.15)" }}/>
        </div>
      </div>

      {/* side buttons */}
      <div style={{ position: "absolute", right: -3, top: 70,  width: 3, height: 38, background: "rgba(255,255,255,0.1)", borderRadius: "0 3px 3px 0" }}/>
      <div style={{ position: "absolute", left: -3, top: 60,   width: 3, height: 24, background: "rgba(255,255,255,0.1)", borderRadius: "3px 0 0 3px" }}/>
      <div style={{ position: "absolute", left: -3, top: 92,   width: 3, height: 38, background: "rgba(255,255,255,0.1)", borderRadius: "3px 0 0 3px" }}/>
      <div style={{ position: "absolute", left: -3, top: 138,  width: 3, height: 38, background: "rgba(255,255,255,0.1)", borderRadius: "3px 0 0 3px" }}/>
    </div>
  );

  /* ── CONTROLS PANEL (shared) ── */
  const Controls = () => (
    <div style={{
      display: "flex",
      flexDirection: isMobile ? "row" : "column",
      flexWrap: isMobile ? "wrap" : "nowrap",
      alignItems: isMobile ? "flex-start" : "stretch",
      gap: isMobile ? 12 : 18,
      width: isMobile ? "100%" : 160,
      flexShrink: 0,
    }}>

      {/* big readout */}
      <div style={{ textAlign: "center", minWidth: isMobile ? 90 : "auto", flex: isMobile ? "0 0 auto" : undefined }}>
        <div style={{
          fontSize: isMobile ? 48 : 60,
          fontWeight: 900, color: accent, lineHeight: 1,
          fontFamily: "'DM Mono',monospace",
          transition: "color .3s",
          textShadow: `0 0 28px ${accent}50`,
        }}>{pct}</div>
        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginTop: 2 }}>percent</div>
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
          textTransform: "uppercase", color: accent, marginTop: 6,
          padding: "3px 10px", borderRadius: 20,
          background: `${accent}15`, border: `1px solid ${accent}30`,
          display: "inline-block", transition: "all .3s",
        }}>{labelText}</div>

        {/* number input */}
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 8, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
            Exact
          </div>
          <input
            type="number" min={0.10} max={1.0} step={0.01}
            value={parseFloat(size.toFixed(2))}
            onChange={e => setSize(clamp(parseFloat(e.target.value) || 0.10, 0.10, 1.0))}
            style={{
              width: 90, padding: "7px 10px", borderRadius: 9,
              background: "rgba(255,255,255,0.05)",
              border: `1.5px solid ${accent}50`,
              color: accent, fontSize: 14, fontWeight: 800,
              fontFamily: "'DM Mono',monospace",
              outline: "none", textAlign: "center",
            }}
          />
        </div>
      </div>

      {/* presets */}
      <div style={{ flex: 1, minWidth: isMobile ? 0 : "auto" }}>
        <div style={{ fontSize: 8, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
          Quick Presets
        </div>
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "row" : "column",
          flexWrap: isMobile ? "wrap" : "nowrap",
          gap: 5,
        }}>
          {PRESETS.map(p => {
            const isActive = Math.abs(size - p.val) < 0.02;
            return (
              <button key={p.label} onClick={() => setSize(p.val)} style={{
                padding: isMobile ? "7px 10px" : "8px 14px",
                borderRadius: 10,
                border: `1.5px solid ${isActive ? accent : "rgba(255,255,255,0.1)"}`,
                background: isActive ? `${accent}20` : "rgba(255,255,255,0.04)",
                color: isActive ? accent : "#64748b",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center",
                justifyContent: isMobile ? "center" : "space-between",
                gap: 6, transition: "all .14s",
                flex: isMobile ? "1 0 calc(33% - 5px)" : undefined,
                minWidth: 0,
              }}>
                <span>{p.label}</span>
                {!isMobile && <span style={{ fontSize: 10, opacity: 0.5 }}>{Math.round(p.val*100)}%</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  /* ════════════════════════
     DESKTOP LAYOUT (≥600px)
     Centered modal, phone LEFT, controls RIGHT
  ════════════════════════ */
  if (!isMobile) {
    return (
      <div
        onClick={(e) => e.target === e.currentTarget && onClose()}
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(2,4,14,0.92)",
          backdropFilter: "blur(14px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20, animation: "pspFadeIn .22s ease",
        }}>

        <style>{`
          @keyframes pspFadeIn { from{opacity:0} to{opacity:1} }
          @keyframes pspUp     { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
          @keyframes pspSaved  { 0%{transform:scale(1)} 50%{transform:scale(1.08)} 100%{transform:scale(1)} }
        `}</style>

        <div style={{
          background: "linear-gradient(160deg,#0d1022,#08091a)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 28,
          padding: "28px 24px 24px",
          width: "100%", maxWidth: 560,
          display: "flex", flexDirection: "column", gap: 20,
          boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
          animation: "pspUp .3s cubic-bezier(.22,1,.36,1)",
          position: "relative", overflow: "hidden",
          maxHeight: "96vh", overflowY: "auto",
        }}>

          {/* ambient glow */}
          <div style={{
            position: "absolute", top: -60, right: -60,
            width: 200, height: 200, borderRadius: "50%",
            background: `radial-gradient(circle,${accent}18,transparent 70%)`,
            pointerEvents: "none", transition: "background .4s",
          }}/>

          {/* header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#475569", marginBottom: 3 }}>
                Screen Size
              </div>
              <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 20, margin: 0, lineHeight: 1.2 }}>
                {game?.name || "Game"}
              </h2>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                Drag the handle inside the phone screen
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 34, height: 34, borderRadius: 10,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#94a3b8", cursor: "pointer", fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "all .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; e.currentTarget.style.color = "#f87171"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#94a3b8"; }}>
              ✕
            </button>
          </div>

          {/* body: phone LEFT + controls RIGHT */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 32 }}>
            <PhoneMockup/>
            <Controls/>
          </div>

          {/* footer */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: "12px", borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "#94a3b8", fontSize: 13, fontWeight: 700,
              cursor: "pointer", transition: "all .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#94a3b8"; }}>
              Cancel
            </button>
            <button onClick={handleSave} style={{
              flex: 2, padding: "12px", borderRadius: 14, border: "none",
              background: saved
                ? "linear-gradient(135deg,#10b981,#059669)"
                : `linear-gradient(135deg,${accent},${accent}cc)`,
              color: "#fff", fontSize: 13, fontWeight: 800,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: `0 4px 20px ${accent}40`,
              transition: "background .3s",
              animation: saved ? "pspSaved .32s ease" : "none",
            }}>
              {saved ? <><span>✓</span> Saved!</> : <><span>📐</span> Set to {pct}% — {labelText}</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════
     MOBILE LAYOUT (<600px)
     Bottom sheet, phone TOP, controls BELOW
  ════════════════════════ */
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(2,4,14,0.92)",
        backdropFilter: "blur(12px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        animation: "pspFadeIn .22s ease",
      }}>

      <style>{`
        @keyframes pspFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes pspUp     { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pspSaved  { 0%{transform:scale(1)} 50%{transform:scale(1.08)} 100%{transform:scale(1)} }
      `}</style>

      <div style={{
        background: "linear-gradient(160deg,#0d1022,#08091a)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: "24px 24px 0 0",
        padding: "12px 16px 16px",
        width: "100%",
        display: "flex", flexDirection: "column", gap: 14,
        boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
        animation: "pspUp .3s cubic-bezier(.22,1,.36,1)",
        position: "relative", overflow: "hidden",
        maxHeight: "92dvh", overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}>

        {/* ambient glow */}
        <div style={{
          position: "absolute", top: -40, right: -40,
          width: 140, height: 140, borderRadius: "50%",
          background: `radial-gradient(circle,${accent}18,transparent 70%)`,
          pointerEvents: "none",
        }}/>

        {/* drag pill */}
        <div style={{
          width: 38, height: 4, borderRadius: 4,
          background: "rgba(255,255,255,0.18)",
          margin: "0 auto",
        }}/>

        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: "#475569", marginBottom: 2 }}>
              Screen Size
            </div>
            <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 16, margin: 0, lineHeight: 1.2 }}>
              {game?.name || "Game"}
            </h2>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 9,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#94a3b8", cursor: "pointer", fontSize: 12,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>✕</button>
        </div>

        {/* phone centered */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <PhoneMockup/>
        </div>

        {/* controls below phone */}
        <Controls/>

        {/* footer */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "12px", borderRadius: 13,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)",
            color: "#94a3b8", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={handleSave} style={{
            flex: 2, padding: "12px", borderRadius: 13, border: "none",
            background: saved
              ? "linear-gradient(135deg,#10b981,#059669)"
              : `linear-gradient(135deg,${accent},${accent}cc)`,
            color: "#fff", fontSize: 13, fontWeight: 800,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            boxShadow: `0 4px 18px ${accent}40`,
            transition: "background .3s",
            animation: saved ? "pspSaved .32s ease" : "none",
          }}>
            {saved ? <><span>✓</span> Saved!</> : <><span>📐</span> Set {pct}% · {labelText}</>}
          </button>
        </div>

        <div style={{ height: "env(safe-area-inset-bottom, 0px)" }}/>
      </div>
    </div>
  );
}