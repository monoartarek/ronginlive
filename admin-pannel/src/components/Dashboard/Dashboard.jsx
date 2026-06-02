import React, { useEffect, useState, useCallback } from "react";
import Parse from "../../parseConfig";
import "./Dashboard.css";

/* ════════════════════════════════════════════════════════════
   Dashboard.jsx — All-in-one
   Includes all PieChartMF logic inline (no separate file needed)
   • Stat counts via Promise.all (fast, parallel)
   • Charts: Gender donut, Age bars, Country bars, Growth polygon
   • Recently joined: 10 users only
   • No All Users table, No Top Streamers
════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────── */
const AGE_GROUPS = [
  { label: "Under 18", min: 0,  max: 17  },
  { label: "18 – 24",  min: 18, max: 24  },
  { label: "25 – 34",  min: 25, max: 34  },
  { label: "35 – 44",  min: 35, max: 44  },
  { label: "45 – 54",  min: 45, max: 54  },
  { label: "55+",      min: 55, max: 999 },
];
const AGE_COLORS     = ["#a78bfa","#60a5fa","#34d399","#fbbf24","#f87171","#f472b6"];
const COUNTRY_COLORS = ["#6366f1","#06b6d4","#10b981","#f59e0b","#f43f5e","#8b5cf6","#ec4899","#14b8a6"];
const AVATAR_PALETTE = ["#6366f1","#06b6d4","#f59e0b","#10b981","#f43f5e","#8b5cf6","#ec4899","#14b8a6"];

/* ─────────────────────────────────────────────────────────
   PURE HELPERS
───────────────────────────────────────────────────────── */
function fmt(n) {
  if (n === null || n === undefined) return "…";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}
function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000)    return (n / 1000).toFixed(1) + "K";
  return String(n);
}
function timeAgo(d) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function calcAge(birthday) {
  if (!birthday) return null;
  const birth = new Date(birthday);
  if (isNaN(birth)) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}
function getLast6Months() {
  const months = [], now = new Date();
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    months.push({ label: start.toLocaleString("default", { month: "short" }), start, end });
  }
  return months;
}
function avatarColor(str) {
  let h = 0;
  for (let i = 0; i < (str || "").length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}
function getInitial(name)    { return (name || "?").charAt(0).toUpperCase(); }
function getInitials(name)   { return (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2); }

/* ─────────────────────────────────────────────────────────
   SVG DONUT HELPERS
───────────────────────────────────────────────────────── */
const CX = 110, CY = 110, R = 90, IR = 58;
function polar(angle, radius) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}
function arcPath(a1, a2, ro, ri) {
  if (Math.abs(a2 - a1) >= 360) a2 = a1 + 359.99;
  const s = polar(a1, ro), e = polar(a2, ro);
  const si = polar(a1, ri), ei = polar(a2, ri);
  const lg = a2 - a1 > 180 ? 1 : 0;
  return [`M ${s.x} ${s.y}`,`A ${ro} ${ro} 0 ${lg} 1 ${e.x} ${e.y}`,`L ${ei.x} ${ei.y}`,`A ${ri} ${ri} 0 ${lg} 0 ${si.x} ${si.y}`,"Z"].join(" ");
}

/* ════════════════════════════════════════════════════════════
   GROWTH POLYGON CHART (inlined from PieChartMF)
════════════════════════════════════════════════════════════ */
function GrowthPolygon({ userGrowth, streamGrowth, coinGrowth, animated }) {
  const [activeMetric, setActiveMetric] = useState("users");
  const [tooltip,      setTooltip]      = useState(null);

  const dataMap = {
    users:   { data: userGrowth,   color: "#5b8af5", label: "Users",   key: "count", icon: "◈" },
    streams: { data: streamGrowth, color: "#34d399", label: "Streams", key: "count", icon: "⬡" },
    coins:   { data: coinGrowth,   color: "#fbbf24", label: "Coins",   key: "total", icon: "◎" },
  };
  const active    = dataMap[activeMetric];
  const values    = active.data.map(d => d[active.key] || 0);
  const labels    = active.data.map(d => d.label);
  const maxVal    = Math.max(...values, 1);
  const totalVal  = values.reduce((a, b) => a + b, 0);
  const latestVal = values[values.length - 1] || 0;
  const prevVal   = values[values.length - 2]  || 0;
  const growthPct = prevVal === 0 ? 100 : (((latestVal - prevVal) / prevVal) * 100);
  const isPos     = growthPct >= 0;

  const W = 340, H = 160, PL = 38, PR = 12, PT = 18, PB = 28;
  const plotW = W - PL - PR, plotH = H - PT - PB;
  const pts = values.map((v, i) => ({
    x: PL + (values.length < 2 ? plotW / 2 : (i / (values.length - 1)) * plotW),
    y: PT + plotH - (v / maxVal) * plotH, v,
  }));
  const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
  const areaPath = pts.length > 0
    ? `M ${pts[0].x},${PT + plotH} ` + pts.map(p => `L ${p.x},${p.y}`).join(" ") + ` L ${pts[pts.length-1].x},${PT + plotH} Z`
    : "";

  return (
    <div className="pmc-card pmc-card--growth">
      <div className="pmc-card-header">
        <div className="pmc-card-title-group">
          <span className="pmc-card-eyebrow">6-Month Trend</span>
          <h2 className="pmc-card-title">App Growth</h2>
        </div>
        <div className="pmc-tab-pills">
          {Object.entries(dataMap).map(([key, val]) => (
            <button key={key}
              className={`pmc-tab-pill ${activeMetric === key ? "is-active" : ""}`}
              onClick={() => setActiveMetric(key)}
              style={activeMetric === key ? { color: val.color, borderColor: `${val.color}55`, background: `${val.color}12` } : {}}>
              {val.icon} {val.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="pmc-growth-kpis">
        <div className="pmc-growth-kpi">
          <span className="pmc-growth-kpi-label">6-Month Total</span>
          <span className="pmc-growth-kpi-val" style={{ color: active.color }}>{formatNumber(totalVal)}</span>
        </div>
        <div className="pmc-growth-kpi">
          <span className="pmc-growth-kpi-label">This Month</span>
          <span className="pmc-growth-kpi-val" style={{ color: active.color }}>{formatNumber(latestVal)}</span>
        </div>
        <div className="pmc-growth-kpi">
          <span className="pmc-growth-kpi-label">vs Last Month</span>
          <span className="pmc-growth-kpi-val" style={{ color: isPos ? "#34d399" : "#f87171" }}>
            {isPos ? "▲" : "▼"} {Math.abs(growthPct).toFixed(1)}%
          </span>
        </div>
      </div>

      {active.data.length === 0 ? <div className="pmc-empty">No data yet</div> : (
        <>
          <div className="pmc-growth-svg-wrap" onMouseLeave={() => setTooltip(null)}>
            <svg viewBox={`0 0 ${W} ${H}`} className="pmc-growth-svg">
              <defs>
                <linearGradient id={`pg-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={active.color} stopOpacity="0.38" />
                  <stop offset="100%" stopColor={active.color} stopOpacity="0.02" />
                </linearGradient>
                <filter id="pgGlow">
                  <feGaussianBlur stdDeviation="2.5" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {[0,0.25,0.5,0.75,1].map((pct, i) => {
                const y = PT + plotH - pct * plotH;
                return (
                  <g key={i}>
                    <line x1={PL} y1={y} x2={PL+plotW} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray={i===0?"none":"3,5"} />
                    <text x={PL-4} y={y+3.5} fontSize="8" fill="rgba(255,255,255,0.2)" textAnchor="end" fontFamily="DM Mono, monospace">
                      {formatNumber(Math.round(maxVal * pct))}
                    </text>
                  </g>
                );
              })}
              <path d={areaPath} fill={`url(#pg-${activeMetric})`} />
              {tooltip !== null && pts[tooltip] && (
                <line x1={pts[tooltip].x} y1={PT} x2={pts[tooltip].x} y2={PT+plotH}
                  stroke={active.color} strokeWidth="1" strokeDasharray="3,4" opacity="0.45" />
              )}
              <polyline points={polyline} fill="none" stroke={active.color} strokeWidth="2.5"
                strokeLinejoin="round" strokeLinecap="round" filter="url(#pgGlow)" />
              {pts.map((p, i) => (
                <g key={i}>
                  <rect x={p.x-22} y={PT} width={44} height={plotH+PB} fill="transparent" onMouseEnter={() => setTooltip(i)} />
                  <text x={p.x} y={H-3} fontSize="9" fill="rgba(255,255,255,0.28)" textAnchor="middle" fontFamily="DM Sans, sans-serif">{labels[i]}</text>
                  <circle cx={p.x} cy={p.y} r="8" fill={active.color} opacity={tooltip===i?0.18:0.08} />
                  <circle cx={p.x} cy={p.y} r={tooltip===i?5:3.5} fill={active.color} filter="url(#pgGlow)" />
                  {tooltip === i && (
                    <g>
                      <rect x={p.x-28} y={p.y-32} width={56} height={20} rx="5" fill={active.color} opacity="0.93" />
                      <text x={p.x} y={p.y-18} fontSize="9.5" fill="#fff" textAnchor="middle" fontFamily="DM Mono, monospace" fontWeight="500">{p.v.toLocaleString()}</text>
                    </g>
                  )}
                </g>
              ))}
            </svg>
          </div>
          <div className="pmc-growth-strip">
            {values.map((v, i) => {
              const isMax = v === Math.max(...values);
              const hPct  = maxVal > 0 ? (v / maxVal) * 100 : 0;
              return (
                <div key={i} className="pmc-growth-strip-col">
                  <div className="pmc-growth-strip-bar-bg">
                    <div className="pmc-growth-strip-bar" style={{
                      height: animated ? `${Math.max(4, hPct)}%` : "0%",
                      background: isMax ? active.color : `${active.color}44`,
                      boxShadow: isMax ? `0 0 8px ${active.color}88` : "none",
                      transitionDelay: `${i * 65}ms`,
                    }} />
                  </div>
                  <span className="pmc-growth-strip-label">{labels[i]}</span>
                  <span className="pmc-growth-strip-val" style={{ color: isMax ? active.color : "var(--pmc-muted)" }}>{formatNumber(v)}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   STAT CARD (reusable widget)
════════════════════════════════════════════════════════════ */
function StatCard({ icon, label, value, color, loading, sub }) {
  return (
    <div className="dash-stat-card">
      <div className="dash-stat-icon-wrap" style={{ color, background: `${color}18` }}>{icon}</div>
      <div className="dash-stat-body">
        <span className="dash-stat-label">{label}</span>
        <span className="dash-stat-value" style={{ color }}>
          {loading ? <span className="dash-stat-skel" /> : value}
        </span>
        {sub && !loading && <span className="dash-stat-sub">{sub}</span>}
      </div>
      <div className="dash-stat-glow" style={{ background: `${color}30` }} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ANALYTICS SECTION (inlined PieChartMF)
   Fetches its own data independently from the stat cards above
════════════════════════════════════════════════════════════ */
function AnalyticsSection() {
  const [male,         setMale]         = useState(0);
  const [female,       setFemale]       = useState(0);
  const [ageCounts,    setAgeCounts]    = useState(Array(AGE_GROUPS.length).fill(0));
  const [countries,    setCountries]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [animated,     setAnimated]     = useState(false);
  const [hovered,      setHovered]      = useState(null);
  const [hoveredAge,   setHoveredAge]   = useState(null);
  const [hoveredCnt,   setHoveredCnt]   = useState(null);
  const [activeTab,    setActiveTab]    = useState("age");
  const [totalUsers,   setTotalUsers]   = useState(0);
  const [userGrowth,   setUserGrowth]   = useState([]);
  const [streamGrowth, setStreamGrowth] = useState([]);
  const [coinGrowth,   setCoinGrowth]   = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [ugData, sgData, cgData] = await Promise.all([
          fetchChartUsers(),
          fetchStreamers(),
          fetchUserGrowth(),
          fetchStreamGrowth(),
          fetchCoinGrowth(),
        ]).then(r => [r[2], r[3], r[4]]);
        setUserGrowth(ugData   || []);
        setStreamGrowth(sgData || []);
        setCoinGrowth(cgData   || []);
      } catch (err) {
        console.error("Analytics fetch error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loading) setTimeout(() => setAnimated(true), 80);
  }, [loading]);

  /* ── Fetch users for chart (gender, age, country) ── */
  async function fetchChartUsers() {
    let allUsers = [], skip = 0;
    while (true) {
      const q = new Parse.Query(Parse.User);
      q.select("gender", "birthday", "country");
      q.limit(1000); q.skip(skip);
      const batch = await q.find({ useMasterKey: true });
      allUsers = [...allUsers, ...batch];
      if (batch.length < 1000) break;
      skip += 1000;
    }
    let maleCount = 0, femaleCount = 0;
    const ageBuckets = Array(AGE_GROUPS.length).fill(0);
    const countryMap = {};
    allUsers.forEach(u => {
      const g = (u.get("gender") || "").toLowerCase();
      if (g === "male")   maleCount++;
      if (g === "female") femaleCount++;
      const age = calcAge(u.get("birthday"));
      if (age !== null) {
        for (let i = 0; i < AGE_GROUPS.length; i++) {
          if (age >= AGE_GROUPS[i].min && age <= AGE_GROUPS[i].max) { ageBuckets[i]++; break; }
        }
      }
      const c = (u.get("country") || "").trim();
      if (c) countryMap[c] = (countryMap[c] || 0) + 1;
    });
    setMale(maleCount);
    setFemale(femaleCount);
    setAgeCounts(ageBuckets);
    setCountries(Object.entries(countryMap).sort((a,b) => b[1]-a[1]).slice(0,8).map(([name,count]) => ({ name, count })));
    setTotalUsers(allUsers.length);
  }

  /* ── Fetch streamers (for stream count only, no streamer cards) ── */
  async function fetchStreamers() {
    try {
      const q = new Parse.Query("Streaming");
      q.limit(1000);
      const res = await q.find();
      return res; // just for count
    } catch { return []; }
  }

  /* ── Monthly user growth ── */
  async function fetchUserGrowth() {
    const months = getLast6Months(), results = [];
    for (const { label, start, end } of months) {
      try {
        const q = new Parse.Query(Parse.User);
        q.greaterThanOrEqualTo("createdAt", start); q.lessThan("createdAt", end);
        const count = await q.count({ useMasterKey: true });
        results.push({ label, count });
      } catch { results.push({ label, count: 0 }); }
    }
    return results;
  }

  /* ── Monthly stream growth ── */
  async function fetchStreamGrowth() {
    const months = getLast6Months(), results = [];
    for (const { label, start, end } of months) {
      try {
        const q = new Parse.Query("Streaming");
        q.greaterThanOrEqualTo("createdAt", start); q.lessThan("createdAt", end);
        const count = await q.count();
        results.push({ label, count });
      } catch { results.push({ label, count: 0 }); }
    }
    return results;
  }

  /* ── Monthly coin growth ──
     ⚠️  Change "CoinTransaction" to your actual class name
     ⚠️  Change "amount" to your actual field name           */
  async function fetchCoinGrowth() {
    const months = getLast6Months(), results = [];
    for (const { label, start, end } of months) {
      try {
        const q = new Parse.Query("CoinTransaction");
        q.greaterThanOrEqualTo("createdAt", start); q.lessThan("createdAt", end);
        const batch = await q.find({ useMasterKey: true });
        const total = batch.reduce((sum, obj) => sum + (obj.get("amount") || 0), 0);
        results.push({ label, total });
      } catch { results.push({ label, total: 0 }); }
    }
    return results;
  }

  /* ── Donut math ── */
  const total         = male + female;
  const malePercent   = total === 0 ? 50 : (male   / total) * 100;
  const femalePercent = total === 0 ? 50 : (female / total) * 100;
  const maleAng       = (malePercent / 100) * 360;
  const malePath      = arcPath(0,       maleAng, R,     IR);
  const femalePath    = arcPath(maleAng, 360,     R,     IR);
  const maleHov       = arcPath(0,       maleAng, R + 8, IR - 5);
  const femaleHov     = arcPath(maleAng, 360,     R + 8, IR - 5);
  const maxAge        = Math.max(...ageCounts, 1);
  const maxCnt        = Math.max(...countries.map(c => c.count), 1);

  if (loading) {
    return (
      <div className="pmc-loading">
        <div className="pmc-loading-orb">
          <div className="pmc-loading-ring" />
          <div className="pmc-loading-ring pmc-loading-ring--2" />
        </div>
        <p className="pmc-loading-text">Loading analytics…</p>
      </div>
    );
  }

  return (
    <div className={`pmc-root ${animated ? "is-animated" : ""}`}>

      {/* ── 3-Column Charts Row ── */}
      <div className="pmc-charts-row pmc-charts-row--3col">

        {/* Gender Donut */}
        <div className="pmc-card pmc-card--gender">
          <div className="pmc-card-header">
            <div className="pmc-card-title-group">
              <span className="pmc-card-eyebrow">Analytics</span>
              <h2 className="pmc-card-title">Gender Split</h2>
            </div>
            <div className="pmc-card-badge">{total.toLocaleString()} total</div>
          </div>
          <div className="pmc-donut-wrap">
            <svg viewBox="0 0 220 220" className="pmc-donut-svg">
              <defs>
                <filter id="glow-m"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <filter id="glow-f"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1e2436" strokeWidth={R - IR} />
              {total > 0 && femalePercent > 0 && (
                <path d={hovered==="female" ? femaleHov : femalePath} className="pmc-slice pmc-slice--f"
                  filter={hovered==="female" ? "url(#glow-f)" : ""}
                  onMouseEnter={() => setHovered("female")} onMouseLeave={() => setHovered(null)} />
              )}
              {total > 0 && malePercent > 0 && (
                <path d={hovered==="male" ? maleHov : malePath} className="pmc-slice pmc-slice--m"
                  filter={hovered==="male" ? "url(#glow-m)" : ""}
                  onMouseEnter={() => setHovered("male")} onMouseLeave={() => setHovered(null)} />
              )}
              {total === 0 && <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1e2436" strokeWidth={R-IR} />}
              <circle cx={CX} cy={CY} r={IR} className="pmc-hole" />
              <text x={CX} y={CY-14} className="pmc-center-big">
                {hovered==="male" ? formatNumber(male) : hovered==="female" ? formatNumber(female) : formatNumber(total)}
              </text>
              <text x={CX} y={CY+8}  className="pmc-center-mid">{hovered==="male" ? "Male" : hovered==="female" ? "Female" : "Users"}</text>
              <text x={CX} y={CY+26} className="pmc-center-pct">
                {hovered==="male" ? malePercent.toFixed(1)+"%" : hovered==="female" ? femalePercent.toFixed(1)+"%" : "Total"}
              </text>
            </svg>
            <div className="pmc-gender-legend">
              {[
                { key: "male",   label: "Male",   val: male,   pct: malePercent,   color: "#4f9cf9" },
                { key: "female", label: "Female", val: female, pct: femalePercent, color: "#f472b6" },
              ].map(({ key, label, val, pct, color }) => (
                <div key={key} className={`pmc-gender-row ${hovered===key ? "is-active" : ""}`}
                  onMouseEnter={() => setHovered(key)} onMouseLeave={() => setHovered(null)}>
                  <div className="pmc-gender-bar-bg">
                    <div className="pmc-gender-bar-fill" style={{ width: animated ? `${pct}%` : "0%", background: color, boxShadow: `0 0 12px ${color}55` }} />
                  </div>
                  <div className="pmc-gender-info">
                    <span className="pmc-gender-dot"  style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                    <span className="pmc-gender-label">{label}</span>
                    <span className="pmc-gender-count">{val.toLocaleString()}</span>
                    <span className="pmc-gender-pct"  style={{ color }}>{pct.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Age / Country Bars */}
        <div className="pmc-card pmc-card--bars">
          <div className="pmc-card-header">
            <div className="pmc-card-title-group">
              <span className="pmc-card-eyebrow">Demographics</span>
              <h2 className="pmc-card-title">{activeTab === "age" ? "Age Groups" : "Top Countries"}</h2>
            </div>
            <div className="pmc-tab-pills">
              <button className={`pmc-tab-pill ${activeTab==="age"     ? "is-active" : ""}`} onClick={() => setActiveTab("age")}>Age</button>
              <button className={`pmc-tab-pill ${activeTab==="country" ? "is-active" : ""}`} onClick={() => setActiveTab("country")}>Country</button>
            </div>
          </div>
          <div className="pmc-bars-list">
            {activeTab === "age"
              ? AGE_GROUPS.map((g, i) => {
                  const pct = (ageCounts[i] / maxAge) * 100;
                  return (
                    <div key={g.label} className={`pmc-bar-row ${hoveredAge===i ? "is-on" : ""}`}
                      onMouseEnter={() => setHoveredAge(i)} onMouseLeave={() => setHoveredAge(null)}>
                      <span className="pmc-bar-label">{g.label}</span>
                      <div className="pmc-bar-track">
                        <div className="pmc-bar-fill" style={{ width: animated ? `${pct}%` : "0%", background: AGE_COLORS[i], boxShadow: hoveredAge===i ? `0 0 14px ${AGE_COLORS[i]}88` : "none", transitionDelay: `${i*60}ms` }} />
                        <span className="pmc-bar-inner-pct" style={{ color: AGE_COLORS[i] }}>{pct.toFixed(0)}%</span>
                      </div>
                      <span className="pmc-bar-count">{ageCounts[i].toLocaleString()}</span>
                    </div>
                  );
                })
              : countries.length === 0
              ? <p className="pmc-empty">No country data</p>
              : countries.map((c, i) => {
                  const pct = (c.count / maxCnt) * 100;
                  const clr = COUNTRY_COLORS[i % COUNTRY_COLORS.length];
                  return (
                    <div key={c.name} className={`pmc-bar-row ${hoveredCnt===i ? "is-on" : ""}`}
                      onMouseEnter={() => setHoveredCnt(i)} onMouseLeave={() => setHoveredCnt(null)}>
                      <span className="pmc-bar-label">{c.name}</span>
                      <div className="pmc-bar-track">
                        <div className="pmc-bar-fill" style={{ width: animated ? `${pct}%` : "0%", background: clr, boxShadow: hoveredCnt===i ? `0 0 14px ${clr}88` : "none", transitionDelay: `${i*60}ms` }} />
                        <span className="pmc-bar-inner-pct" style={{ color: clr }}>{pct.toFixed(0)}%</span>
                      </div>
                      <span className="pmc-bar-count">{c.count.toLocaleString()}</span>
                    </div>
                  );
                })}
          </div>
        </div>

        {/* Growth Polygon */}
        <GrowthPolygon userGrowth={userGrowth} streamGrowth={streamGrowth} coinGrowth={coinGrowth} animated={animated} />

      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
════════════════════════════════════════════════════════════ */

/* ── helpers reused by Top10Agency & RecentUsers ── */
const EARN_FIELDS_T10 = ["audio_earning","livestreaming_earning","game_gratuities","party_earnings","match_earnings","live_earnings","p_coin_earnings","multiboard_earning","platform_reward"];
const RANK_COLORS_T10 = ["#fbbf24","#94a3b8","#c2713a","#818cf8","#818cf8","#818cf8","#818cf8","#818cf8","#818cf8","#818cf8"];
const RANK_MEDALS_T10 = ["🥇","🥈","🥉"];
function fmtEarn(n){if(!n&&n!==0)return"0";if(n>=1e6)return(n/1e6).toFixed(2)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"K";return n.toLocaleString();}

/* ── Avatar component ── */
function UserAv({ u, size=44 }) {
  const clr = avatarColor(u.username||u.agent_id||u.id||"");
  const ini = ((u.name||u.agent_id||"?").charAt(0)||"?").toUpperCase();
  return u.avatar
    ? <img src={u.avatar} alt={u.name} className="dash-av-img" style={{width:size,height:size}} />
    : <div className="dash-av-init" style={{width:size,height:size,background:clr,fontSize:size*.36}}>{ini}</div>;
}

/* ── View toggle ── */
function ViewToggle({ view, setView }) {
  return (
    <div className="dash-view-toggle">
      <button className={`dash-vbtn${view==="card"?" on":""}`} onClick={()=>setView("card")} title="Card view">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="0" width="6" height="6" rx="1.5"/><rect x="8" y="0" width="6" height="6" rx="1.5"/><rect x="0" y="8" width="6" height="6" rx="1.5"/><rect x="8" y="8" width="6" height="6" rx="1.5"/></svg>
      </button>
      <button className={`dash-vbtn${view==="list"?" on":""}`} onClick={()=>setView("list")} title="List view">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="0" width="14" height="2.5" rx="1.25"/><rect x="0" y="5.75" width="14" height="2.5" rx="1.25"/><rect x="0" y="11.5" width="14" height="2.5" rx="1.25"/></svg>
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TOP 10 AGENCY — resolves real avatar, name, username, uid
════════════════════════════════════════════════════════════ */
function Top10Agency() {
  const [agencies, setAgencies] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [animated, setAnimated] = useState(false);
  const [view,     setView]     = useState("card");

  useEffect(() => {
    (async () => {
      try {
        const q = new Parse.Query("AgencyMember");
        q.select(["agent_id",...EARN_FIELDS_T10]);
        q.limit(1000);
        const results = await q.find({ useMasterKey:true });

        const map = {};
        results.forEach(r => {
          const aid = r.get("agent_id")||"Unknown";
          if (!map[aid]) map[aid] = { agent_id:aid, total:0 };
          EARN_FIELDS_T10.forEach(f => { map[aid].total += Number(r.get(f)||0); });
        });
        const top10 = Object.values(map).sort((a,b)=>b.total-a.total).slice(0,10);

        /* resolve _User */
        const ids = top10.map(a=>a.agent_id).filter(Boolean);
        let uMap = {};
        if (ids.length) {
          const uq = new Parse.Query("_User");
          uq.containedIn("objectId", ids);
          uq.select("name","username","uid","avatar","country","gender","coins");
          uq.limit(ids.length);
          const users = await uq.find({ useMasterKey:true });
          users.forEach(u => {
            const av = u.get("avatar");
            let avatarUrl=null;
            if(av&&typeof av.url==="function") avatarUrl=av.url();
            else if(typeof av==="string") avatarUrl=av;
            uMap[u.id] = {
              name:u.get("name")||"—", username:u.get("username")||"—",
              uid:u.get("uid")||"—",  country:u.get("country")||"—",
              gender:u.get("gender")||"—", coins:u.get("coins")||0,
              avatar:avatarUrl,
            };
          });
        }
        setAgencies(top10.map(a=>({...a,...(uMap[a.agent_id]||{})})));
      } catch(e){ console.error(e); }
      finally { setLoading(false); setTimeout(()=>setAnimated(true),80); }
    })();
  }, []);

  const maxTotal = agencies[0]?.total||1;

  if (loading) return (
    <div className="t10-card">
      <div className="t10-header">
        <div className="t10-title-group">
          <span className="t10-eyebrow">Agency Leaderboard</span>
          <h2 className="t10-title">Top 10 Agencies</h2>
        </div>
      </div>
      <div className="t10-loading"><div className="t10-spinner"/><div className="t10-spinner t10-spinner--2"/><p>Loading…</p></div>
    </div>
  );

  if (!agencies.length) return (
    <div className="t10-card"><div className="t10-empty">No agency data</div></div>
  );

  return (
    <div className="t10-card">
      <div className="t10-header">
        <div className="t10-title-group">
          <span className="t10-eyebrow">Agency Leaderboard</span>
          <h2 className="t10-title">Top 10 Agencies</h2>
          <span className="t10-sub">Ranked by total combined earnings</span>
        </div>
        <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
          <span className="t10-badge">Top 10</span>
          <ViewToggle view={view} setView={setView} />
        </div>
      </div>

      {/* ── CARD VIEW ── */}
      {view==="card" && (
        <div className="t10-cards-grid">
          {agencies.map((ag,i) => {
            const color=RANK_COLORS_T10[i]||"#818cf8";
            const isTop3=i<3;
            const g=(ag.gender||"").toLowerCase();
            const gIcon=g==="male"?"♂":g==="female"?"♀":"◎";
            const gClr=g==="male"?"#4f9cf9":g==="female"?"#f472b6":"#94a3b8";
            return (
              <div key={ag.agent_id} className={`t10-agcard${isTop3?" t10-agcard--top3":""}`}
                style={{"--rc":color, animationDelay:`${i*60}ms`}}>
                {/* Crown / rank */}
                <div className="t10-agcard-rank">{i<3?RANK_MEDALS_T10[i]:`#${i+1}`}</div>
                {/* Avatar with glow ring */}
                <div className="t10-agcard-av-wrap">
                  <div className="t10-agcard-av-ring" style={{borderColor:`${color}55`}}>
                    <UserAv u={ag} size={60} />
                  </div>
                  {isTop3 && <div className="t10-agcard-av-glow" style={{background:color}}/>}
                </div>
                {/* Name */}
                <div className="t10-agcard-name">{ag.name||ag.agent_id}</div>
                <div className="t10-agcard-uname">@{ag.username||"—"}</div>
                {/* Chips */}
                <div className="t10-agcard-chips">
                  {ag.uid!=="—"&&<span className="t10-chip t10-chip--uid">#{ag.uid}</span>}
                  {ag.country!=="—"&&<span className="t10-chip t10-chip--cnt">🌏 {ag.country}</span>}
                  <span className="t10-chip" style={{color:gClr,borderColor:`${gClr}30`}}>{gIcon}</span>
                </div>
                {/* Earnings */}
                <div className="t10-agcard-earn" style={{color}}>
                  <span className="t10-agcard-earn-val">{fmtEarn(ag.total)}</span>
                  <span className="t10-agcard-earn-lbl">diamonds</span>
                </div>
                {/* Progress bar */}
                <div className="t10-agcard-bar">
                  <div className="t10-agcard-bar-fill" style={{
                    width:animated?`${Math.max((ag.total/maxTotal)*100,3)}%`:"0%",
                    background:`linear-gradient(90deg,${color}88,${color})`,
                    transitionDelay:`${i*60}ms`
                  }}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view==="list" && (
        <div className="t10-list-wrap">
          {agencies.map((ag,i) => {
            const color=RANK_COLORS_T10[i]||"#818cf8";
            const isTop3=i<3;
            const g=(ag.gender||"").toLowerCase();
            const gIcon=g==="male"?"♂":g==="female"?"♀":"◎";
            const gClr=g==="male"?"#4f9cf9":g==="female"?"#f472b6":"#94a3b8";
            return (
              <div key={ag.agent_id} className={`t10-lrow${isTop3?" t10-lrow--top3":""}`}
                style={{animationDelay:`${i*45}ms`}}>
                <div className="t10-lrow-rank" style={{color}}>{i<3?RANK_MEDALS_T10[i]:`#${i+1}`}</div>
                <UserAv u={ag} size={40}/>
                <div className="t10-lrow-info">
                  <span className="t10-lrow-name">{ag.name||ag.agent_id}</span>
                  <span className="t10-lrow-sub">
                    @{ag.username||"—"}
                    {ag.uid!=="—"&&<> · <span style={{fontFamily:"var(--dash-fm)"}}>UID {ag.uid}</span></>}
                    {ag.country!=="—"&&<> · {ag.country}</>}
                  </span>
                </div>
                <span style={{color:gClr,fontSize:"13px",flexShrink:0}}>{gIcon}</span>
                <div className="t10-lrow-bar">
                  <div className="t10-lrow-bar-fill" style={{
                    width:animated?`${Math.max((ag.total/maxTotal)*100,2)}%`:"0%",
                    background:color, transitionDelay:`${i*45}ms`
                  }}/>
                </div>
                <div className="t10-lrow-earn" style={{color}}>{fmtEarn(ag.total)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   RECENTLY JOINED — 20 users, card + list view
════════════════════════════════════════════════════════════ */
function RecentUsers({ users, loading }) {
  const [view, setView] = useState("card");

  const GenderChip = ({ gender }) => {
    const g=(gender||"").toLowerCase();
    const icon=g==="male"?"♂":g==="female"?"♀":"◎";
    const clr=g==="male"?"#4f9cf9":g==="female"?"#f472b6":"#94a3b8";
    return <span className="ru-gender-chip" style={{color:clr,borderColor:`${clr}30`}}>{icon} {gender!=="—"?gender:"N/A"}</span>;
  };

  return (
    <div className="ru-wrap">
      <div className="ru-header">
        <div>
          <p className="dash-eyebrow">Activity</p>
          <h2 className="dash-section-title">
            Recently Joined
            <span className="dash-section-badge">Last 20</span>
          </h2>
        </div>
        {!loading && users.length>0 && <ViewToggle view={view} setView={setView}/>}
      </div>

      {loading ? (
        <div className="ru-skels">
          {Array.from({length:6}).map((_,i)=>(
            <div key={i} className="ru-skel" style={{animationDelay:`${i*60}ms`}}/>
          ))}
        </div>
      ) : view==="card" ? (
        /* ── CARD VIEW ── */
        <div className="ru-cards-grid">
          {users.map((u,i) => {
            const g=(u.gender||"").toLowerCase();
            const gClr=g==="male"?"#4f9cf9":g==="female"?"#f472b6":"#94a3b8";
            return (
              <div key={u.id} className="ru-card" style={{animationDelay:`${i*35}ms`}}>
                <div className="ru-card-rank">#{i+1}</div>
                <div className="ru-card-av">
                  <UserAv u={u} size={56}/>
                  <div className="ru-card-av-ring" style={{borderColor:`${gClr}40`}}/>
                </div>
                <div className="ru-card-name">{u.name}</div>
                <div className="ru-card-uname">@{u.username}</div>
                <div className="ru-card-chips">
                  <GenderChip gender={u.gender}/>
                  {u.uid&&u.uid!=="—"&&<span className="ru-chip-uid">UID {u.uid}</span>}
                </div>
                <div className="ru-card-time">{timeAgo(u.createdAt)}</div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── LIST VIEW ── */
        <div className="ru-list">
          {users.map((u,i) => {
            const g=(u.gender||"").toLowerCase();
            const gClr=g==="male"?"#4f9cf9":g==="female"?"#f472b6":"#94a3b8";
            return (
              <div key={u.id} className="ru-row" style={{animationDelay:`${i*30}ms`}}>
                <span className="ru-row-rank">{i+1}</span>
                <UserAv u={u} size={36}/>
                <div className="ru-row-info">
                  <span className="ru-row-name">{u.name}</span>
                  <span className="ru-row-uname">@{u.username}{u.uid&&u.uid!=="—"?` · UID ${u.uid}`:""}</span>
                </div>
                <GenderChip gender={u.gender}/>
                <span className="ru-row-time">{timeAgo(u.createdAt)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {

  /* ── Overview stat counts ── */
  const [stats, setStats] = useState({
    total: null, male: null, female: null,
    managers: null, resellers: null, suspended: null,
    admins: null, newToday: null, newWeek: null,
  });

  /* ── Recently joined (10 users only) ── */
  const [recentUsers,   setRecentUsers]   = useState([]);
  const [loadingStats,  setLoadingStats]  = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);

  /* ══════════════════════════════════════════════
     FETCH STATS — 9 count() queries in parallel
     No user records transferred, just integers
  ══════════════════════════════════════════════ */
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const User       = Parse.Object.extend("_User");
      const now        = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const qTotal    = new Parse.Query(User);
      const qMale     = new Parse.Query(User); qMale.equalTo("gender", "male");
      const qFemale   = new Parse.Query(User); qFemale.equalTo("gender", "female");
      const qManager  = new Parse.Query(User); qManager.equalTo("role", "manager");
      const qReseller = new Parse.Query(User); qReseller.equalTo("role", "reseller");
      const qSuspend  = new Parse.Query(User); qSuspend.equalTo("status", "suspended");
      const qAdmin    = new Parse.Query(User); qAdmin.equalTo("isAdmin", true);
      const qToday    = new Parse.Query(User); qToday.greaterThanOrEqualTo("createdAt", todayStart);
      const qWeek     = new Parse.Query(User); qWeek.greaterThanOrEqualTo("createdAt", weekStart);

      const [total, male, female, managers, resellers, suspended, admins, newToday, newWeek] =
        await Promise.all([
          qTotal.count({ useMasterKey: true }),
          qMale.count({ useMasterKey: true }),
          qFemale.count({ useMasterKey: true }),
          qManager.count({ useMasterKey: true }),
          qReseller.count({ useMasterKey: true }),
          qSuspend.count({ useMasterKey: true }),
          qAdmin.count({ useMasterKey: true }),
          qToday.count({ useMasterKey: true }),
          qWeek.count({ useMasterKey: true }),
        ]);

      setStats({ total, male, female, managers, resellers, suspended, admins, newToday, newWeek });
    } catch (err) {
      console.error("Stats error:", err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  /* ══════════════════════════════════════════════
     FETCH RECENT USERS — 10 users, 4 fields only
  ══════════════════════════════════════════════ */
  const fetchRecentUsers = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const User = Parse.Object.extend("_User");
      const q    = new Parse.Query(User);
      q.descending("createdAt");
      q.limit(20);
      q.select("name","username","gender","avatar","createdAt","uid");
      const results = await q.find({ useMasterKey: true });
      setRecentUsers(results.map(u => {
        const av = u.get("avatar");
        let avatar = null;
        if (av && typeof av.url === "function") avatar = av.url();
        else if (typeof av === "string") avatar = av;
        return {
          id: u.id,
          name:      u.get("name")     || "—",
          username:  u.get("username") || "anonymous",
          gender:    u.get("gender")   || "—",
          uid:       u.get("uid")      || "—",
          avatar,
          createdAt: u.get("createdAt"),
        };
      }));
    } catch (err) {
      console.error("Recent users error:", err);
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useEffect(() => { fetchStats(); fetchRecentUsers(); }, [fetchStats, fetchRecentUsers]);

  /* ── Derived values ── */
  const malePercent   = stats.total ? Math.round((stats.male   / stats.total) * 100) : 0;
  const femalePercent = stats.total ? Math.round((stats.female / stats.total) * 100) : 0;
  const otherPercent  = Math.max(0, 100 - malePercent - femalePercent);
  const activeUsers   = stats.total !== null && stats.suspended !== null ? stats.total - stats.suspended : null;

  /* ════════════ RENDER ════════════ */
  return (
    <div className="dash-root">

      {/* ══════════ PAGE HEADER ══════════ */}
      <div className="dash-header">
        <div className="dash-header-left">
          <p className="dash-eyebrow">Admin Panel</p>
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-sub">Platform overview · counts fetched in parallel</p>
        </div>
        <button className="dash-refresh-btn"
          onClick={() => { fetchStats(); fetchRecentUsers(); }}
          disabled={loadingStats}>
          {loadingStats ? <span className="dash-spin" /> : "↻ Refresh"}
        </button>
      </div>

      {/* ══════════ HERO STAT CARDS ══════════ */}
      <div className="dash-stats-grid">
        <StatCard icon="◉" label="Total Users"   value={fmt(stats.total)}     color="#5ba8f5" loading={loadingStats} sub={`${fmt(activeUsers)} active`} />
        <StatCard icon="⬡" label="New Today"     value={fmt(stats.newToday)}  color="#34d399" loading={loadingStats} sub={`${fmt(stats.newWeek)} this week`} />
        <StatCard icon="⊘" label="Suspended"     value={fmt(stats.suspended)} color="#f87171" loading={loadingStats} sub={stats.total ? `${((stats.suspended/stats.total)*100).toFixed(1)}% of total` : ""} />
        <StatCard icon="★" label="Admins"        value={fmt(stats.admins)}    color="#fbbf24" loading={loadingStats} sub={`${fmt(stats.managers)} managers`} />
        <StatCard icon="◈" label="Resellers"     value={fmt(stats.resellers)} color="#818cf8" loading={loadingStats} sub="Active reseller accounts" />
        <StatCard icon="♂" label="Male Users"    value={fmt(stats.male)}      color="#4f9cf9" loading={loadingStats} sub={`${malePercent}% of users`} />
        <StatCard icon="♀" label="Female Users"  value={fmt(stats.female)}    color="#f472b6" loading={loadingStats} sub={`${femalePercent}% of users`} />
        <StatCard icon="◎" label="Other / N/A"   value={fmt(stats.total !== null ? stats.total - stats.male - stats.female : null)} color="#94a3b8" loading={loadingStats} sub="Unspecified gender" />
      </div>

      {/* ══════════ GENDER BAR ══════════ */}
      {!loadingStats && stats.total > 0 && (
        <div className="dash-gender-wrap">
          <div className="dash-gender-header">
            <span className="dash-gender-title">Gender Distribution</span>
            <div className="dash-gender-legend">
              <span style={{ color: "#4f9cf9" }}>♂ {malePercent}% Male</span>
              <span style={{ color: "#f472b6" }}>♀ {femalePercent}% Female</span>
              <span style={{ color: "#94a3b8" }}>◎ {otherPercent}% Other</span>
            </div>
          </div>
          <div className="dash-gender-bar">
            <div className="dash-gb-seg dash-gb-seg--male"   style={{ width: `${malePercent}%` }} />
            <div className="dash-gb-seg dash-gb-seg--female" style={{ width: `${femalePercent}%` }} />
            <div className="dash-gb-seg dash-gb-seg--other"  style={{ width: `${otherPercent}%` }} />
          </div>
        </div>
      )}

      {/* ══════════ QUICK PILLS ══════════ */}
      {!loadingStats && (
        <div className="dash-summary-pills">
          {[
            { label: "Active",    val: fmt(activeUsers),      color: "#34d399" },
            { label: "Suspended", val: fmt(stats.suspended),  color: "#f87171" },
            { label: "Managers",  val: fmt(stats.managers),   color: "#34d399" },
            { label: "Resellers", val: fmt(stats.resellers),  color: "#818cf8" },
            { label: "Admins",    val: fmt(stats.admins),     color: "#fbbf24" },
            { label: "Joined/wk", val: fmt(stats.newWeek),    color: "#5ba8f5" },
          ].map((p, i) => (
            <div key={i} className="dash-pill" style={{ animationDelay: `${i * 50}ms` }}>
              <span className="dash-pill-val" style={{ color: p.color }}>{p.val}</span>
              <span className="dash-pill-label">{p.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ══════════ ANALYTICS CHARTS ══════════ */}
      <div className="dash-section">
        <div className="dash-section-header">
          <p className="dash-eyebrow">Analytics</p>
          <h2 className="dash-section-title">Charts &amp; Growth</h2>
        </div>
        <AnalyticsSection />
      </div>

      {/* ══════════ TOP 10 AGENCIES ══════════ */}
      <div className="dash-section">
        <div className="dash-section-header">
          <p className="dash-eyebrow">Leaderboard</p>
          <h2 className="dash-section-title">Top Agencies</h2>
        </div>
        <Top10Agency />
      </div>

      {/* ══════════ RECENTLY JOINED ══════════ */}
      <div className="dash-section">
        <RecentUsers users={recentUsers} loading={loadingRecent} />
      </div>

    </div>
  );
}