import React, {
  useEffect, useState, useCallback, useMemo, useRef
} from "react";
import Parse from "../../parseConfig";
import "./GamesHistory.css";

/* ═══════════════════════════════════════════════════════════
   GamesHistory.jsx
   Parse class : "Dell_game"
   Fields      : objectId, createdAt, uid, gameId, roundId,
                 orderId, coin, type (1=loss/company profit,
                 2=win/user profit), winId, roomid
═══════════════════════════════════════════════════════════ */

const PAGE_SIZE = 25; // rows per page (server-side)

/* ── helpers ── */
const fmt     = n  => (n == null ? "—" : Number(n).toLocaleString());
const fmtDate = d  => d ? new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "—";
const fmtTime = d  => d ? new Date(d).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" }) : "";
const short   = s  => s ? (s.length > 14 ? s.slice(0,12)+"…" : s) : "—";

/* ── PDF export (print-based, no extra lib) ── */
function exportPDF(rows, summary, dateFrom, dateTo, searchUid) {
  const title  = searchUid ? `Game History — UID: ${searchUid}` : "Game History — All Users";
  const period = (dateFrom || dateTo)
    ? `Period: ${dateFrom||"start"} → ${dateTo||"now"}`
    : "Period: All time";

  const tableRows = rows.map((r,i) => `
    <tr>
      <td>${i+1}</td>
      <td>${r.id}</td>
      <td>${r.uid||"—"}</td>
      <td>${r.gameId||"—"}</td>
      <td>${r.roundId||"—"}</td>
      <td class="${r.type===1?"loss":"win"}">${r.type===1?"Loss (1)":"Win (2)"}</td>
      <td class="${r.type===1?"loss":"win"}">${r.type===1?"-":"+"}${fmt(r.coin)}</td>
      <td>${fmtDate(r.createdAt)}</td>
      <td>${fmtTime(r.createdAt)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>${title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Segoe UI',sans-serif;padding:24px;color:#111;font-size:11px;}
    h1{font-size:18px;font-weight:700;margin-bottom:4px;}
    .meta{color:#555;font-size:11px;margin-bottom:16px;}
    .summary{display:flex;gap:20px;margin-bottom:20px;flex-wrap:wrap;}
    .s-box{background:#f5f5f5;border-radius:8px;padding:10px 16px;min-width:130px;}
    .s-label{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#666;}
    .s-val{font-size:18px;font-weight:700;margin-top:2px;}
    .s-val.red{color:#dc2626;} .s-val.green{color:#16a34a;} .s-val.blue{color:#2563eb;}
    table{width:100%;border-collapse:collapse;font-size:10px;}
    th{background:#1a1a2e;color:#fff;padding:7px 8px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.05em;}
    td{padding:6px 8px;border-bottom:1px solid #eee;vertical-align:middle;}
    tr:nth-child(even)td{background:#fafafa;}
    .win{color:#16a34a;font-weight:600;} .loss{color:#dc2626;font-weight:600;}
    @media print{body{padding:0;}}
  </style></head><body>
  <h1>${title}</h1>
  <p class="meta">${period} · Generated: ${new Date().toLocaleString("en-GB")} · Total shown: ${rows.length} records</p>
  <div class="summary">
    <div class="s-box"><div class="s-label">Total Records</div><div class="s-val blue">${summary.total}</div></div>
    <div class="s-box"><div class="s-label">User Wins (type=2)</div><div class="s-val green">+${fmt(summary.winTotal)}</div></div>
    <div class="s-box"><div class="s-label">User Losses (type=1)</div><div class="s-val red">-${fmt(summary.lossTotal)}</div></div>
    <div class="s-box"><div class="s-label">Company Net</div><div class="s-val ${summary.companyNet>=0?"red":"green"}">${summary.companyNet>=0?"+":""}${fmt(summary.companyNet)}</div></div>
  </div>
  <table><thead><tr><th>#</th><th>Object ID</th><th>UID</th><th>Game ID</th><th>Round ID</th><th>Type</th><th>Coins</th><th>Date</th><th>Time</th></tr></thead>
  <tbody>${tableRows}</tbody></table>
  </body></html>`;

  const w = window.open("","_blank","width=1100,height=750");
  w.document.write(html);
  w.document.close();
  setTimeout(()=>{ w.focus(); w.print(); }, 600);
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function GamesHistory() {
  const [rows,       setRows]       = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(0);
  const [view,       setView]       = useState("list");
  const [toast,      setToast]      = useState(null);

  /* filters */
  const [searchUid,  setSearchUid]  = useState("");
  const [appliedUid, setAppliedUid] = useState("");
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // "all"|"1"|"2"

  const inputRef = useRef(null);

  /* ── toast ── */
  const show$ = useCallback((msg, type="success") => {
    setToast({msg, type});
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* ── build Parse query ── */
  const buildQuery = useCallback(() => {
    const q = new Parse.Query("Dell_game");
    if (appliedUid.trim()) q.equalTo("uid", appliedUid.trim());
    if (typeFilter !== "all") q.equalTo("type", parseInt(typeFilter));
    if (dateFrom) q.greaterThanOrEqualTo("createdAt", new Date(dateFrom));
    if (dateTo) {
      const end = new Date(dateTo);
      end.setDate(end.getDate() + 1);
      q.lessThan("createdAt", end);
    }
    q.descending("createdAt");
    return q;
  }, [appliedUid, typeFilter, dateFrom, dateTo]);

  /* ── fetch page ── */
  const fetchPage = useCallback(async (pg = 0) => {
    setLoading(true);
    try {
      const q  = buildQuery();
      const cq = buildQuery();

      q.limit(PAGE_SIZE);
      q.skip(pg * PAGE_SIZE);
      q.select("uid","gameId","roundId","orderId","coin","type","winId","roomid","createdAt");

      const [results, cnt] = await Promise.all([
        q.find({ useMasterKey: true }),
        cq.count({ useMasterKey: true }),
      ]);

      setTotal(cnt);
      setRows(results.map(r => ({
        id:        r.id,
        uid:       r.get("uid")     || "—",
        gameId:    r.get("gameId")  || "—",
        roundId:   r.get("roundId") || "—",
        orderId:   r.get("orderId") || "—",
        roomid:    r.get("roomid")  || "—",
        winId:     r.get("winId")   || "—",
        coin:      r.get("coin")    ?? 0,
        type:      r.get("type"),
        createdAt: r.get("createdAt"),
      })));
    } catch(e) {
      show$("Fetch failed: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [buildQuery, show$]);

  useEffect(() => { fetchPage(page); }, [fetchPage, page]);

  /* ── summary (computed from loaded page) ── */
  const summary = useMemo(() => {
    let winTotal=0, lossTotal=0;
    rows.forEach(r => {
      if (r.type === 2) winTotal  += Number(r.coin||0);  // user won
      if (r.type === 1) lossTotal += Number(r.coin||0);  // user lost
    });
    const companyNet = lossTotal - winTotal; // positive = company profit
    return { total, winTotal, lossTotal, companyNet };
  }, [rows, total]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  // clamp to max 100 records display (4 pages of 25)
  const maxPages   = Math.min(totalPages, 4);

  const applySearch = () => {
    setAppliedUid(searchUid);
    setPage(0);
  };
  const clearSearch = () => {
    setSearchUid(""); setAppliedUid(""); setPage(0);
  };
  const applyFilters = () => setPage(0);
  const clearFilters = () => {
    setDateFrom(""); setDateTo(""); setTypeFilter("all"); setAppliedUid(""); setSearchUid(""); setPage(0);
  };

  /* ─── status dot ─── */
  const TypeChip = ({ t }) => (
    <span className={`gh-type-chip ${t===1?"loss":"win"}`}>
      {t===1 ? "Loss" : t===2 ? "Win" : "—"}
    </span>
  );

  /* ─── coin display ─── */
  const CoinCell = ({ row }) => (
    <span className={`gh-coin ${row.type===1?"loss":row.type===2?"win":""}`}>
      {row.type===1 ? "−" : row.type===2 ? "+" : ""}{fmt(row.coin)}
    </span>
  );

  /* ═══ RENDER ═══ */
  return (
    <div className="gh-root">

      {/* Toast */}
      {toast && <div className={`gh-toast gh-toast--${toast.type}`}>{toast.msg}</div>}

      {/* ── Header ── */}
      <div className="gh-header">
        <div className="gh-header-left">
          <div className="gh-header-icon">🎮</div>
          <div>
            <h1 className="gh-title">Games History</h1>
            <p className="gh-subtitle">
              {appliedUid ? `UID: ${appliedUid}` : "All Users"} · {total.toLocaleString()} records
            </p>
          </div>
        </div>
        <div className="gh-header-right">
          <div className="gh-view-tog">
            <button className={`gh-vtb${view==="list"?" on":""}`} onClick={()=>setView("list")}>☰ List</button>
            <button className={`gh-vtb${view==="card"?" on":""}`} onClick={()=>setView("card")}>⊞ Cards</button>
          </div>
          <button className="gh-export-btn"
            disabled={rows.length===0}
            onClick={()=>exportPDF(rows, summary, dateFrom, dateTo, appliedUid)}>
            ⬇ PDF
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="gh-stats">
        <div className="gh-stat gh-stat--blue">
          <span className="gh-stat-ico">📊</span>
          <div>
            <div className="gh-stat-lbl">Total Records</div>
            <div className="gh-stat-val">{total.toLocaleString()}</div>
            <div className="gh-stat-sub">showing last 100</div>
          </div>
        </div>
        <div className="gh-stat gh-stat--red">
          <span className="gh-stat-ico">📉</span>
          <div>
            <div className="gh-stat-lbl">User Losses (type 1)</div>
            <div className="gh-stat-val">−{fmt(summary.lossTotal)}</div>
            <div className="gh-stat-sub">coins lost by users</div>
          </div>
        </div>
        <div className="gh-stat gh-stat--green">
          <span className="gh-stat-ico">📈</span>
          <div>
            <div className="gh-stat-lbl">User Wins (type 2)</div>
            <div className="gh-stat-val">+{fmt(summary.winTotal)}</div>
            <div className="gh-stat-sub">coins won by users</div>
          </div>
        </div>
        <div className={`gh-stat ${summary.companyNet>=0?"gh-stat--gold":"gh-stat--purple"}`}>
          <span className="gh-stat-ico">{summary.companyNet>=0?"🏦":"💸"}</span>
          <div>
            <div className="gh-stat-lbl">Company Net</div>
            <div className="gh-stat-val">
              {summary.companyNet>=0?"+":"−"}{fmt(Math.abs(summary.companyNet))}
            </div>
            <div className="gh-stat-sub">{summary.companyNet>=0?"profit":"loss"} on this page</div>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="gh-filters">
        {/* UID search */}
        <div className="gh-search-wrap">
          <span className="gh-search-ico">⌕</span>
          <input
            ref={inputRef}
            className="gh-search"
            placeholder="Search by Object ID (UID)…"
            value={searchUid}
            onChange={e => setSearchUid(e.target.value)}
            onKeyDown={e => e.key==="Enter" && applySearch()}
          />
          {searchUid && (
            <button className="gh-search-x" onClick={clearSearch}>✕</button>
          )}
        </div>
        <button className="gh-btn gh-btn--primary" onClick={applySearch} disabled={loading}>
          {loading ? <span className="gh-spin"/> : "Search"}
        </button>

        {/* Date range */}
        <input className="gh-date" type="date" value={dateFrom}
          onChange={e=>setDateFrom(e.target.value)} title="From date"/>
        <input className="gh-date" type="date" value={dateTo}
          onChange={e=>setDateTo(e.target.value)} title="To date"/>

        {/* Type filter */}
        <select className="gh-select" value={typeFilter}
          onChange={e=>setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          <option value="1">Type 1 — Loss</option>
          <option value="2">Type 2 — Win</option>
        </select>

        <button className="gh-btn gh-btn--teal" onClick={applyFilters} disabled={loading}>Apply</button>
        <button className="gh-btn gh-btn--ghost" onClick={clearFilters}>Clear</button>
      </div>

      {/* ── Page info ── */}
      {!loading && total > 0 && (
        <div className="gh-page-info">
          Showing <strong>{page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE,total)}</strong> of <strong>{total.toLocaleString()}</strong> records
          {total > 100 && <span className="gh-cap-note"> (capped at 100 for performance)</span>}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="gh-loading">
          <div className="gh-spinner"/><div className="gh-spinner gh-spinner--2"/>
          <p>Fetching game history…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="gh-empty">
          <span className="gh-empty-ico">🎮</span>
          <h3>No records found</h3>
          <p>Try adjusting your filters or search UID</p>
          {(appliedUid||dateFrom||dateTo||typeFilter!=="all") && (
            <button className="gh-btn gh-btn--ghost" onClick={clearFilters}>Clear all filters</button>
          )}
        </div>
      ) : view === "list" ? (

        /* ════ LIST VIEW ════ */
        <div className="gh-table-wrap">
          <table className="gh-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Object ID</th>
                <th>UID</th>
                <th>Game ID</th>
                <th>Round ID</th>
                <th>Type</th>
                <th>Coins</th>
                <th>Room</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={`gh-tr${r.type===1?" loss":r.type===2?" win":""}`}>
                  <td className="gh-td-num">{page*PAGE_SIZE+i+1}</td>
                  <td className="gh-td-mono gh-copyable" title={r.id}
                    onClick={()=>{navigator.clipboard?.writeText(r.id);show$("Copied ID","copy");}}>
                    {short(r.id)} ⎘
                  </td>
                  <td className="gh-td-mono gh-copyable" title={r.uid}
                    onClick={()=>{navigator.clipboard?.writeText(r.uid);show$("Copied UID","copy");}}>
                    {short(r.uid)} ⎘
                  </td>
                  <td className="gh-td-mono">{short(r.gameId)}</td>
                  <td className="gh-td-mono">{short(r.roundId)}</td>
                  <td><TypeChip t={r.type}/></td>
                  <td><CoinCell row={r}/></td>
                  <td className="gh-td-mono gh-hide-sm">{short(r.roomid)}</td>
                  <td className="gh-td-date">
                    <span className="gh-date-main">{fmtDate(r.createdAt)}</span>
                    <span className="gh-date-time">{fmtTime(r.createdAt)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      ) : (

        /* ════ CARD VIEW ════ */
        <div className="gh-cards-grid">
          {rows.map((r, i) => (
            <div key={r.id}
              className={`gh-card${r.type===1?" loss":r.type===2?" win":""}`}
              style={{animationDelay:`${i*25}ms`}}>
              {/* stripe */}
              <div className="gh-card-stripe"/>
              {/* header */}
              <div className="gh-card-hd">
                <span className="gh-card-num">#{page*PAGE_SIZE+i+1}</span>
                <TypeChip t={r.type}/>
              </div>
              {/* coin */}
              <div className="gh-card-coin">
                <CoinCell row={r}/>
                <span className="gh-card-coin-lbl">coins</span>
              </div>
              {/* fields */}
              <div className="gh-card-fields">
                <div className="gh-cf">
                  <span className="gh-cf-lbl">Object ID</span>
                  <span className="gh-cf-val gh-copyable" title={r.id}
                    onClick={()=>{navigator.clipboard?.writeText(r.id);show$("Copied","copy");}}>
                    {short(r.id)} ⎘
                  </span>
                </div>
                <div className="gh-cf">
                  <span className="gh-cf-lbl">UID</span>
                  <span className="gh-cf-val gh-copyable" title={r.uid}
                    onClick={()=>{navigator.clipboard?.writeText(r.uid);show$("Copied","copy");}}>
                    {short(r.uid)} ⎘
                  </span>
                </div>
                <div className="gh-cf">
                  <span className="gh-cf-lbl">Game ID</span>
                  <span className="gh-cf-val">{short(r.gameId)}</span>
                </div>
                <div className="gh-cf">
                  <span className="gh-cf-lbl">Round ID</span>
                  <span className="gh-cf-val">{short(r.roundId)}</span>
                </div>
                <div className="gh-cf">
                  <span className="gh-cf-lbl">Room ID</span>
                  <span className="gh-cf-val">{short(r.roomid)}</span>
                </div>
                <div className="gh-cf">
                  <span className="gh-cf-lbl">Date</span>
                  <span className="gh-cf-val">{fmtDate(r.createdAt)} {fmtTime(r.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {maxPages > 1 && !loading && (
        <div className="gh-pag">
          <button className="gh-pb" disabled={page===0} onClick={()=>setPage(0)}>«</button>
          <button className="gh-pb" disabled={page===0} onClick={()=>setPage(p=>p-1)}>‹</button>
          {Array.from({length:maxPages},(_,i)=>(
            <button key={i} className={`gh-pb${page===i?" on":""}`} onClick={()=>setPage(i)}>{i+1}</button>
          ))}
          <button className="gh-pb" disabled={page>=maxPages-1} onClick={()=>setPage(p=>p+1)}>›</button>
          <button className="gh-pb" disabled={page>=maxPages-1} onClick={()=>setPage(maxPages-1)}>»</button>
          <span className="gh-pinfo">Page {page+1}/{maxPages}</span>
        </div>
      )}
    </div>
  );
}