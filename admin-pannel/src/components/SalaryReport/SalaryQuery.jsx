import React, { useEffect, useState, useCallback } from "react";
import Parse from "../../parseConfig";
import "./SalaryQuery.css";

/* ═══════════════════════════════════════════════════════════
   SalaryQuery.jsx
   Parse class: AgencySalaryPdf
   Fields:
     agent         → Pointer to _User (agent.name, agent.agency_name)
     agentUID      → Number
     totalPayoutUSD→ Number
     pdfFile       → Parse.File
     createdAt     → Date
═══════════════════════════════════════════════════════════ */

const PAGE_SIZE = 20;

/* ── helpers ── */
const fmtUSD = (n) => {
  if (!n && n !== 0) return "$0.00";
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { day:"numeric", month:"short", year:"numeric" });
};
const fmtTime = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });
};
const fmtCompact = (n) => {
  if (!n && n !== 0) return "$0";
  if (n >= 1_000_000) return "$" + (n/1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return "$" + (n/1_000).toFixed(1)     + "K";
  return "$" + Number(n).toFixed(2);
};
function ini(name = "") {
  return name.trim().split(/\s+/).map(w => w[0] || "").join("").toUpperCase().slice(0,2) || "?";
}
const COLORS = ["#60a5fa","#34d399","#f472b6","#fbbf24","#a78bfa","#22d3ee","#fb923c","#f87171"];
function avatarColor(s = "") {
  let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h<<5)-h);
  return COLORS[Math.abs(h) % COLORS.length];
}
function getFileUrl(f) {
  if (!f) return null;
  if (typeof f === "string") return f;
  if (typeof f.url === "function") return f.url();
  if (f._url) return f._url;
  return null;
}

/* ── Copy to clipboard ── */
function copyUID(uid, showToast) {
  const text = String(uid ?? "");
  navigator.clipboard?.writeText(text)
    .then(() => showToast(`UID ${text} copied!`, "copy"))
    .catch(() => showToast("Copy failed", "error"));
}

/* ══════════════════════════════════════════════════
   EXPORT UTILITIES
══════════════════════════════════════════════════ */

/* CSV */
function exportCSV(data, grandTotal) {
  const cols = ["#", "Date", "Time", "Agent Name", "Agency", "Agent UID", "Payout (USD)", "PDF URL"];
  const rows = data.map((r, i) => [
    i + 1,
    fmtDate(r.createdAt),
    fmtTime(r.createdAt),
    r.agentName,
    r.agencyName,
    r.agentUID ?? "",
    Number(r.payout).toFixed(2),
    r.pdfUrl || "",
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));

  const summary = `\n"","","","","","Total Page Payout","${data.reduce((s,r)=>s+r.payout,0).toFixed(2)}",""`;
  const content = [cols.join(","), ...rows, summary].join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `agency_salary_report_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

/* PDF — opens print window */
function exportPDF(data, pagePayout, grandTotal) {
  const rows = data.map((r, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${fmtDate(r.createdAt)}<br><small>${fmtTime(r.createdAt)}</small></td>
      <td><strong>${r.agentName}</strong><br><small>${r.agencyName}</small></td>
      <td><span class="uid">${r.agentUID ?? "—"}</span></td>
      <td class="payout">${fmtUSD(r.payout)}</td>
      <td>${r.pdfUrl ? `<a href="${r.pdfUrl}" target="_blank">Download</a>` : '<span class="miss">Missing</span>'}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <title>Agency Salary Report</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Segoe UI',sans-serif;font-size:12px;color:#1e293b;padding:24px;}
      h1{font-size:18px;font-weight:800;color:#0f172a;margin-bottom:4px;}
      .meta{font-size:11px;color:#64748b;margin-bottom:16px;}
      .summary{display:flex;gap:16px;margin-bottom:20px;}
      .stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 16px;}
      .stat-val{font-size:16px;font-weight:800;color:#0f172a;}
      .stat-lbl{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;}
      table{width:100%;border-collapse:collapse;}
      thead th{background:#0f172a;color:#fff;padding:9px 12px;font-size:10px;text-align:left;letter-spacing:.06em;text-transform:uppercase;}
      tbody td{padding:9px 12px;border-bottom:1px solid #f1f5f9;vertical-align:middle;}
      tbody tr:nth-child(even) td{background:#fafafa;}
      .uid{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:2px 7px;border-radius:4px;font-family:monospace;font-size:11px;}
      .payout{color:#15803d;font-weight:700;font-family:monospace;}
      tfoot td{padding:10px 12px;font-weight:700;background:#f0fdf4;border-top:2px solid #16a34a;}
      .foot-total{color:#15803d;font-size:13px;font-family:monospace;}
      .miss{color:#ef4444;}
      a{color:#2563eb;}
      @media print{button{display:none!important;}}
    </style>
  </head><body>
    <h1>💰 Agency Salary Reports</h1>
    <div class="meta">Generated: ${new Date().toLocaleString()} · ${data.length} records</div>
    <div class="summary">
      <div class="stat"><div class="stat-val">${fmtUSD(pagePayout)}</div><div class="stat-lbl">Page Payout Total</div></div>
      ${grandTotal !== null ? `<div class="stat"><div class="stat-val">${fmtUSD(grandTotal)}</div><div class="stat-lbl">All-Time Total</div></div>` : ""}
      <div class="stat"><div class="stat-val">${data.length}</div><div class="stat-lbl">Records on Page</div></div>
    </div>
    <table>
      <thead><tr><th>#</th><th>Date</th><th>Agent</th><th>UID</th><th>Payout</th><th>PDF</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="4" style="text-align:right;padding-right:8px;">Page Total →</td><td class="foot-total">${fmtUSD(pagePayout)}</td><td></td></tr></tfoot>
    </table>
    <script>window.onload=()=>{window.print();}<\/script>
  </body></html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
}

/* DOCX — uses HTML table inside a Word-compatible blob */
function exportDOCX(data, pagePayout) {
  const rows = data.map((r, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${fmtDate(r.createdAt)} ${fmtTime(r.createdAt)}</td>
      <td>${r.agentName}<br/>${r.agencyName}</td>
      <td>${r.agentUID ?? "—"}</td>
      <td>${fmtUSD(r.payout)}</td>
      <td>${r.pdfUrl || "—"}</td>
    </tr>`).join("");

  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
    xmlns:w='urn:schemas-microsoft-com:office:word'
    xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'>
    <style>
      body{font-family:Calibri,sans-serif;font-size:11pt;}
      h1{font-size:16pt;font-weight:bold;margin-bottom:4pt;}
      p.sub{font-size:9pt;color:#64748b;margin-bottom:12pt;}
      table{border-collapse:collapse;width:100%;}
      th{background:#0f172a;color:#fff;padding:6pt 8pt;font-size:9pt;text-align:left;}
      td{padding:5pt 8pt;border-bottom:1pt solid #e2e8f0;font-size:10pt;}
      .total{font-weight:bold;background:#f0fdf4;}
    </style></head>
    <body>
      <h1>Agency Salary Reports</h1>
      <p class="sub">Generated: ${new Date().toLocaleString()} · ${data.length} records · Page Total: ${fmtUSD(pagePayout)}</p>
      <table>
        <thead><tr><th>#</th><th>Date</th><th>Agent</th><th>UID</th><th>Payout</th><th>PDF URL</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="total"><td colspan="4" align="right">Page Total →</td><td>${fmtUSD(pagePayout)}</td><td></td></tr></tfoot>
      </table>
    </body></html>`;

  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `agency_salary_report_${new Date().toISOString().slice(0,10)}.doc`;
  a.click();
}

/* PRINT */
function doPrint() {
  window.print();
}

/* ── Toast ── */
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`sq-toast sq-toast--${toast.type}`}>
      <span className="sq-toast-dot" />
      {toast.msg}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function SalaryQuery() {

  const [reports,      setReports]      = useState([]);
  const [loading,      setLoading]      = useState(true);

  /* server-side pagination (like PHP) */
  const [page,         setPage]         = useState(1);
  const [hasNext,      setHasNext]      = useState(false);
  const [hasPrev,      setHasPrev]      = useState(false);

  /* search */
  const [searchInput,  setSearchInput]  = useState("");
  const [searchUID,    setSearchUID]    = useState("");

  /* totals for current page */
  const [pagePayout,   setPagePayout]   = useState(0);
  const [pageCount,    setPageCount]    = useState(0);

  /* grand totals — fetched once separately */
  const [grandTotal,   setGrandTotal]   = useState(null);
  const [totalRecords, setTotalRecords] = useState(null);

  const [toast,        setToast]        = useState(null);

  const showToast = useCallback((msg, type="success") => {
    setToast({msg, type});
    setTimeout(()=>setToast(null), 3000);
  }, []);

  /* ════════════════════════════════════════════════════════
     FETCH GRAND TOTALS — runs once on mount
  ════════════════════════════════════════════════════════ */
  const fetchGrandTotals = useCallback(async () => {
    try {
      const q = new Parse.Query("AgencySalaryPdf");
      q.limit(5000);
      q.select("totalPayoutUSD");
      const all = await q.find({ useMasterKey: true });
      const total = all.reduce((sum, r) => sum + (r.get("totalPayoutUSD") || 0), 0);
      setGrandTotal(total);
      setTotalRecords(all.length);
    } catch (e) { console.error("Grand total error:", e); }
  }, []);

  /* ════════════════════════════════════════════════════════
     FETCH PAGE — mirrors PHP pagination exactly
     Uses $limit + 1 trick to detect hasNextPage
  ════════════════════════════════════════════════════════ */
  const fetchPage = useCallback(async (pg, uid) => {
    setLoading(true);
    try {
      const skip = (pg - 1) * PAGE_SIZE;

      const q = new Parse.Query("AgencySalaryPdf");
      if (uid) q.equalTo("agentUID", parseInt(uid));
      q.include("agent");
      q.descending("createdAt");
      q.limit(PAGE_SIZE + 1); // fetch 1 extra to detect next page
      q.skip(skip);

      const results = await q.find({ useMasterKey: true });

      const hasNextPage = results.length > PAGE_SIZE;
      if (hasNextPage) results.pop(); // remove the 21st item

      /* map results */
      const mapped = results.map(r => {
        const agent   = r.get("agent");
        const pdfFile = r.get("pdfFile");
        const av      = agent?.get("avatar");
        let avatarUrl = null;
        if (av && typeof av.url === "function") avatarUrl = av.url();
        else if (typeof av === "string") avatarUrl = av;

        return {
          id:          r.id,
          agentName:   agent?.get("name")        || "Unknown Agent",
          agencyName:  agent?.get("agency_name") || "—",
          agentUID:    r.get("agentUID"),
          agentAvatar: avatarUrl,
          payout:      r.get("totalPayoutUSD")   || 0,
          pdfUrl:      getFileUrl(pdfFile),
          createdAt:   r.get("createdAt"),
          objectId:    r.id,
        };
      });

      setReports(mapped);
      setHasNext(hasNextPage);
      setHasPrev(pg > 1);
      setPageCount(mapped.length);
      setPagePayout(mapped.reduce((s, r) => s + r.payout, 0));
    } catch (e) {
      showToast("Load failed: " + e.message, "error");
    } finally { setLoading(false); }
  }, [showToast]);

  /* initial load */
  useEffect(() => {
    fetchGrandTotals();
    fetchPage(1, "");
  }, [fetchGrandTotals, fetchPage]);

  /* search submit */
  const handleSearch = () => {
    setPage(1);
    setSearchUID(searchInput);
    fetchPage(1, searchInput);
  };

  const handleClear = () => {
    setSearchInput("");
    setSearchUID("");
    setPage(1);
    fetchPage(1, "");
  };

  const goNext = () => {
    const next = page + 1;
    setPage(next);
    fetchPage(next, searchUID);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrev = () => {
    const prev = page - 1;
    setPage(prev);
    fetchPage(prev, searchUID);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════ */
  return (
    <div className="sq-root">
      <Toast toast={toast} />

      {/* ── HEADER ── */}
      <div className="sq-header">
        <div className="sq-header-left">
          <div className="sq-header-icon">💰</div>
          <div>
            <h1 className="sq-title">Agency Salary Reports</h1>
            <p className="sq-subtitle">Monthly salary statements &amp; PDF downloads for all agents</p>
          </div>
        </div>
        <button className="sq-refresh-btn" onClick={() => { fetchGrandTotals(); fetchPage(page, searchUID); }} disabled={loading}>
          {loading ? <span className="sq-spin" /> : "↻"} Refresh
        </button>
      </div>

      {/* ── GRAND TOTAL STATS ── */}
      <div className="sq-stats">
        <div className="sq-stat sq-stat--green" style={{animationDelay:"0ms"}}>
          <div className="sq-stat-icon">💵</div>
          <div className="sq-stat-body">
            <span className="sq-stat-val">
              {grandTotal === null ? <span className="sq-spin sq-spin--dark"/> : fmtCompact(grandTotal)}
            </span>
            <span className="sq-stat-label">Total Payout (All Time)</span>
          </div>
        </div>
        <div className="sq-stat sq-stat--blue" style={{animationDelay:"70ms"}}>
          <div className="sq-stat-icon">📋</div>
          <div className="sq-stat-body">
            <span className="sq-stat-val">
              {totalRecords === null ? <span className="sq-spin sq-spin--dark"/> : totalRecords.toLocaleString()}
            </span>
            <span className="sq-stat-label">Total Reports</span>
          </div>
        </div>
        <div className="sq-stat sq-stat--amber" style={{animationDelay:"140ms"}}>
          <div className="sq-stat-icon">📄</div>
          <div className="sq-stat-body">
            <span className="sq-stat-val">{loading ? <span className="sq-spin sq-spin--dark"/> : pageCount}</span>
            <span className="sq-stat-label">Reports on Page {page}</span>
          </div>
        </div>
        <div className="sq-stat sq-stat--violet" style={{animationDelay:"210ms"}}>
          <div className="sq-stat-icon">💲</div>
          <div className="sq-stat-body">
            <span className="sq-stat-val">{loading ? <span className="sq-spin sq-spin--dark"/> : fmtCompact(pagePayout)}</span>
            <span className="sq-stat-label">Page Payout Total</span>
          </div>
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      <div className="sq-toolbar">
        <h2 className="sq-section-title">Monthly Statements</h2>
        <div className="sq-toolbar-right">
          {/* Search group */}
          <div className="sq-search-group">
            <div className="sq-search-wrap">
              <span className="sq-search-ico">#</span>
              <input
                className="sq-search"
                type="number"
                placeholder="Search by Agent UID…"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
              {searchInput && (
                <button className="sq-search-x" onClick={handleClear}>✕</button>
              )}
            </div>
            <button className="sq-btn sq-btn--primary" onClick={handleSearch} disabled={loading}>
              🔍 Search
            </button>
            {searchUID && (
              <button className="sq-btn sq-btn--ghost" onClick={handleClear}>Clear</button>
            )}
          </div>

          {/* Export group */}
          {!loading && reports.length > 0 && (
            <div className="sq-export-group">
              <button className="sq-exp sq-exp--csv"
                onClick={() => exportCSV(reports, grandTotal)}
                title="Export as CSV">
                <span className="sq-exp-icon">⬇</span> CSV
              </button>
              <button className="sq-exp sq-exp--pdf"
                onClick={() => exportPDF(reports, pagePayout, grandTotal)}
                title="Export as PDF">
                <span className="sq-exp-icon">📑</span> PDF
              </button>
              <button className="sq-exp sq-exp--doc"
                onClick={() => exportDOCX(reports, pagePayout)}
                title="Export as Word Document">
                <span className="sq-exp-icon">📝</span> DOC
              </button>
              <button className="sq-exp sq-exp--print"
                onClick={doPrint}
                title="Print">
                <span className="sq-exp-icon">🖨</span> Print
              </button>
            </div>
          )}
        </div>
      </div>

      {searchUID && (
        <div className="sq-search-banner">
          Showing results for Agent UID: <strong>{searchUID}</strong>
          &nbsp;·&nbsp; {pageCount} report{pageCount !== 1 ? "s" : ""} found
        </div>
      )}

      {/* ── TABLE CARD ── */}
      <div className="sq-card">
        {loading ? (
          <div className="sq-loading">
            <div className="sq-spinner" />
            <p>Loading salary reports…</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="sq-empty">
            <span className="sq-empty-icon">📋</span>
            <p>{searchUID ? `No reports found for UID ${searchUID}` : "No salary reports found"}</p>
            {searchUID && (
              <button className="sq-btn sq-btn--ghost sq-btn--sm" onClick={handleClear}>Clear Search</button>
            )}
          </div>
        ) : (
          <>
            {/* ── DESKTOP TABLE ── */}
            <div className="sq-table-wrap">
              <table className="sq-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Generated Date</th>
                    <th>Agent</th>
                    <th>Agent UID</th>
                    <th>Total Payout</th>
                    <th>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r, idx) => {
                    const clr = avatarColor(r.agentName);
                    return (
                      <tr key={r.id}>
                        <td>
                          <span className="sq-row-num">
                            {(page - 1) * PAGE_SIZE + idx + 1}
                          </span>
                        </td>
                        <td>
                          <span className="sq-date">{fmtDate(r.createdAt)}</span>
                          <span className="sq-time">{fmtTime(r.createdAt)}</span>
                        </td>
                        <td>
                          <div className="sq-agent-cell">
                            <div className="sq-av"
                              style={{ background: r.agentAvatar ? "transparent" : clr }}>
                              {r.agentAvatar
                                ? <img src={r.agentAvatar} alt={r.agentName} className="sq-av-img" />
                                : ini(r.agentName)
                              }
                            </div>
                            <div className="sq-agent-info">
                              <span className="sq-agent-name">{r.agentName}</span>
                              <span className="sq-agency-name">{r.agencyName}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className="sq-uid-badge sq-uid-badge--copy"
                            title="Click to copy UID"
                            onClick={() => copyUID(r.agentUID, showToast)}>
                            {r.agentUID ?? "—"} <span className="sq-uid-copy-ico">⎘</span>
                          </span>
                        </td>
                        <td>
                          <span className="sq-payout">{fmtUSD(r.payout)}</span>
                        </td>
                        <td>
                          {r.pdfUrl ? (
                            <a href={r.pdfUrl} target="_blank" rel="noopener noreferrer"
                              className="sq-dl-btn">
                              ↓ PDF
                            </a>
                          ) : (
                            <span className="sq-no-file">Missing</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Table footer total */}
                <tfoot>
                  <tr>
                    <td colSpan={4} className="sq-tfoot-label">Page Total</td>
                    <td className="sq-tfoot-total">{fmtUSD(pagePayout)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ── MOBILE CARDS ── */}
            <div className="sq-mobile-list">
              {reports.map((r) => {
                const clr = avatarColor(r.agentName);
                return (
                  <div key={r.id} className="sq-mc">
                    <div className="sq-mc-top">
                      <div className="sq-av sq-av--sm"
                        style={{ background: r.agentAvatar ? "transparent" : clr }}>
                        {r.agentAvatar
                          ? <img src={r.agentAvatar} alt={r.agentName} className="sq-av-img" />
                          : ini(r.agentName)
                        }
                      </div>
                      <div className="sq-mc-agent">
                        <span className="sq-agent-name">{r.agentName}</span>
                        <span className="sq-agency-name">{r.agencyName}</span>
                      </div>
                      <span
                        className="sq-uid-badge sq-uid-badge--copy"
                        title="Click to copy UID"
                        onClick={() => copyUID(r.agentUID, showToast)}>
                        {r.agentUID ?? "—"} <span className="sq-uid-copy-ico">⎘</span>
                      </span>
                    </div>
                    <div className="sq-mc-body">
                      <div className="sq-mc-row">
                        <span className="sq-mc-label">Date</span>
                        <span className="sq-date">{fmtDate(r.createdAt)} <span className="sq-time">{fmtTime(r.createdAt)}</span></span>
                      </div>
                      <div className="sq-mc-row">
                        <span className="sq-mc-label">Payout</span>
                        <span className="sq-payout sq-payout--lg">{fmtUSD(r.payout)}</span>
                      </div>
                    </div>
                    <div className="sq-mc-foot">
                      {r.pdfUrl ? (
                        <a href={r.pdfUrl} target="_blank" rel="noopener noreferrer"
                          className="sq-dl-btn sq-dl-btn--full">
                          ↓ Download PDF
                        </a>
                      ) : (
                        <span className="sq-no-file">PDF Missing</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── PAGINATION ── */}
        {!loading && reports.length > 0 && (
          <div className="sq-pagination">
            <button className="sq-pg-btn" onClick={goPrev} disabled={!hasPrev}>
              ← Previous
            </button>
            <div className="sq-pg-info">
              <span className="sq-pg-page">Page <strong>{page}</strong></span>
              {!searchUID && totalRecords !== null && (
                <span className="sq-pg-total">of ~{Math.ceil(totalRecords / PAGE_SIZE)}</span>
              )}
            </div>
            <button className="sq-pg-btn sq-pg-btn--next" onClick={goNext} disabled={!hasNext}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}