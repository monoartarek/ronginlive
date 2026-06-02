import React, { useEffect, useState, useCallback, useRef } from "react";
import Parse from "../../parseConfig";
import "./FullReport.css";

/* ═══════════════════════════════════════════════════════════
   FullReport.jsx — Salary Job Analytics
   Parse class: SalaryReportResult
   Fields: runDate (Date), status (String: "SUCCESS"|other),
           totalProcessed (Number), successCount (Number),
           failCount (Number), durationText (String),
           errorLogs (Array<String>)
   Cloud Fn: getSalaryCountdown → { seconds: Number }
═══════════════════════════════════════════════════════════ */

/* ── Helpers ── */
const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString("en-US", { year:"numeric", month:"short", day:"numeric" })
  : "—";
const fmtTime = (d) => d
  ? new Date(d).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit", second:"2-digit" })
  : "";
const fmtShortDate = (d) => d
  ? new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric" })
  : "";

function fmtCountdown(sec) {
  if (sec <= 0) return null;
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  let out = "";
  if (d > 0) out += `${d}d `;
  if (h > 0 || d > 0) out += `${h}h `;
  out += `${m}m ${s}s`;
  return out.trim();
}

/* ── Mini Bar Chart (pure CSS/SVG) ── */
function BarChart({ data }) {
  if (!data || data.length === 0) return <div className="fr-chart-empty">No data</div>;
  const maxVal = Math.max(...data.map(d => Math.max(d.success, d.fail)), 1);
  return (
    <div className="fr-bar-chart">
      {data.map((d, i) => (
        <div key={i} className="fr-bar-group">
          <div className="fr-bar-cols">
            <div className="fr-bar fr-bar--success"
              style={{ height: `${(d.success / maxVal) * 100}%` }}
              title={`Success: ${d.success}`} />
            <div className="fr-bar fr-bar--fail"
              style={{ height: `${(d.fail / maxVal) * 100}%` }}
              title={`Failed: ${d.fail}`} />
          </div>
          <span className="fr-bar-label">{d.label}</span>
        </div>
      ))}
      <div className="fr-bar-legend">
        <span className="fr-legend-dot fr-legend-dot--success" /> Success
        <span className="fr-legend-dot fr-legend-dot--fail" /> Failed
      </div>
    </div>
  );
}

/* ── Donut Chart (SVG) ── */
function DonutChart({ success, fail }) {
  const total = success + fail;
  if (total === 0) return (
    <div className="fr-donut-wrap">
      <svg viewBox="0 0 100 100" className="fr-donut-svg">
        <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="14"/>
      </svg>
      <div className="fr-donut-center"><span className="fr-donut-pct">—</span><span className="fr-donut-sub">No data</span></div>
    </div>
  );
  const pct    = Math.round((success / total) * 100);
  const radius = 38;
  const circ   = 2 * Math.PI * radius;
  const sDash  = (success / total) * circ;
  const fDash  = (fail / total) * circ;
  const sOffset = 0;
  const fOffset = -sDash;
  return (
    <div className="fr-donut-wrap">
      <svg viewBox="0 0 100 100" className="fr-donut-svg">
        <circle cx="50" cy="50" r={radius} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="14"/>
        {success > 0 && (
          <circle cx="50" cy="50" r={radius} fill="none"
            stroke="#34d399" strokeWidth="14"
            strokeDasharray={`${sDash} ${circ - sDash}`}
            strokeDashoffset={circ / 4}
            strokeLinecap="round" />
        )}
        {fail > 0 && (
          <circle cx="50" cy="50" r={radius} fill="none"
            stroke="#f87171" strokeWidth="14"
            strokeDasharray={`${fDash} ${circ - fDash}`}
            strokeDashoffset={circ / 4 - sDash}
            strokeLinecap="round" />
        )}
      </svg>
      <div className="fr-donut-center">
        <span className="fr-donut-pct">{pct}%</span>
        <span className="fr-donut-sub">success</span>
      </div>
    </div>
  );
}

/* ── Error Logs Modal ── */
function LogsModal({ job, onClose }) {
  if (!job) return null;
  const logs = job.errorLogs || [];
  return (
    <div className="fr-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="fr-modal">
        <div className="fr-modal-header">
          <div className="fr-modal-title">
            <span className="fr-modal-icon">⚠</span>
            Error Logs
            <span className="fr-modal-date">{fmtDate(job.runDate)} {fmtTime(job.runDate)}</span>
          </div>
          <button className="fr-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="fr-modal-body">
          {logs.length === 0 ? (
            <div className="fr-no-logs">No error logs available</div>
          ) : (
            <div className="fr-logs-list">
              {logs.map((log, i) => (
                <div key={i} className="fr-log-item">
                  <span className="fr-log-num">{i + 1}</span>
                  <span className="fr-log-text">{log}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="fr-modal-footer">
          <span className="fr-log-count">{logs.length} error{logs.length !== 1 ? "s" : ""}</span>
          <button className="fr-btn fr-btn--ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ── Toast ── */
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fr-toast fr-toast--${toast.type}`}>
      <span className="fr-toast-dot" />
      {toast.msg}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function FullReport() {

  const [jobs,        setJobs]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [countdown,   setCountdown]   = useState(0);  // seconds
  const [logsJob,     setLogsJob]     = useState(null);
  const [toast,       setToast]       = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* ════════════════════════════════════════════════════════
     FETCH DATA — mirrors PHP exactly
     Latest 20 records, descending runDate
  ════════════════════════════════════════════════════════ */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const q = new Parse.Query("SalaryReportResult");
      q.descending("runDate");
      q.limit(20);
      const results = await q.find({ useMasterKey: true });

      const mapped = results.map(r => ({
        id:             r.id,
        runDate:        r.get("runDate"),
        status:         r.get("status") || "UNKNOWN",
        totalProcessed: r.get("totalProcessed") || 0,
        successCount:   r.get("successCount")   || 0,
        failCount:      r.get("failCount")       || 0,
        durationText:   r.get("durationText")    || "—",
        errorLogs:      r.get("errorLogs")       || [],
      }));

      setJobs(mapped);
    } catch (e) {
      showToast("Load failed: " + e.message, "error");
    } finally { setLoading(false); }
  }, [showToast]);

  /* ════════════════════════════════════════════════════════
     FETCH COUNTDOWN from Cloud Function
  ════════════════════════════════════════════════════════ */
  const fetchCountdown = useCallback(async () => {
    try {
      const res = await Parse.Cloud.run("getSalaryCountdown");
      setCountdown(res?.seconds || 0);
    } catch { setCountdown(0); }
  }, []);

  useEffect(() => {
    fetchData();
    fetchCountdown();
  }, [fetchData, fetchCountdown]);

  /* Countdown tick */
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown(s => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  /* ─ Derived data ─ */
  const latest   = jobs[0] || null;
  const isSuccess = latest?.status === "SUCCESS";

  /* Chart data — reverse for chronological order */
  const chartData = [...jobs].reverse().map(j => ({
    label:   fmtShortDate(j.runDate),
    success: j.successCount,
    fail:    j.failCount,
  }));

  const countdownStr = fmtCountdown(countdown);

  /* ════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════ */
  return (
    <div className="fr-root">
      <Toast toast={toast} />

      {logsJob && <LogsModal job={logsJob} onClose={() => setLogsJob(null)} />}

      {/* ── HEADER ── */}
      <div className="fr-header">
        <div className="fr-header-left">
          <div className="fr-header-icon">📊</div>
          <div>
            <h1 className="fr-title">Salary Job Analytics</h1>
            <p className="fr-subtitle">Automated salary processing history &amp; performance metrics</p>
          </div>
        </div>
        <button className="fr-refresh-btn"
          onClick={() => { fetchData(); fetchCountdown(); }}
          disabled={loading}>
          {loading ? <span className="fr-spin" /> : "↻"} Refresh
        </button>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="fr-stats">

        {/* Last Job Status */}
        <div className={`fr-stat fr-stat--status ${isSuccess ? "fr-stat--green" : "fr-stat--red"}`}
          style={{animationDelay:"0ms"}}>
          <div className="fr-stat-icon">{isSuccess ? "✓" : "⚠"}</div>
          <div className="fr-stat-body">
            <span className="fr-stat-lbl">Last Job Status</span>
            <span className={`fr-stat-status ${isSuccess ? "fr-stat-status--ok" : "fr-stat-status--fail"}`}>
              {loading ? "—" : (latest?.status || "N/A")}
            </span>
            <span className="fr-stat-meta">
              {latest ? `${fmtDate(latest.runDate)} ${fmtTime(latest.runDate)}` : "—"}
            </span>
          </div>
        </div>

        {/* Total Processed */}
        <div className="fr-stat fr-stat--blue" style={{animationDelay:"70ms"}}>
          <div className="fr-stat-icon">👥</div>
          <div className="fr-stat-body">
            <span className="fr-stat-lbl">Total Processed</span>
            <span className="fr-stat-val">
              {loading ? <span className="fr-spin fr-spin--sm"/> : (latest?.totalProcessed ?? 0)}
            </span>
            <span className="fr-stat-meta">Last run agents</span>
          </div>
        </div>

        {/* Duration */}
        <div className="fr-stat fr-stat--violet" style={{animationDelay:"140ms"}}>
          <div className="fr-stat-icon">⏱</div>
          <div className="fr-stat-body">
            <span className="fr-stat-lbl">Job Duration</span>
            <span className="fr-stat-val fr-stat-val--mono">
              {loading ? "—" : (latest?.durationText || "—")}
            </span>
            <span className="fr-stat-meta">Processing time</span>
          </div>
        </div>

        {/* Countdown */}
        <div className="fr-stat fr-stat--dark" style={{animationDelay:"210ms"}}>
          <div className="fr-stat-icon">⏳</div>
          <div className="fr-stat-body">
            <span className="fr-stat-lbl">Next Salary Run</span>
            {countdown <= 0 ? (
              <span className="fr-stat-running">⚡ Running…</span>
            ) : (
              <span className="fr-stat-val fr-stat-val--mono fr-stat-val--countdown">
                {countdownStr}
              </span>
            )}
            <span className="fr-stat-meta">Auto-Scheduled</span>
          </div>
        </div>

      </div>

      {/* ── CHARTS ROW ── */}
      <div className="fr-charts-row">

        {/* Bar chart */}
        <div className="fr-chart-card fr-chart-card--wide">
          <div className="fr-chart-card-header">
            <h3 className="fr-chart-title">Processing History</h3>
            <div className="fr-chart-legend">
              <span><span className="fr-leg-dot fr-leg-dot--green" /> Success</span>
              <span><span className="fr-leg-dot fr-leg-dot--red" /> Failed</span>
            </div>
          </div>
          <div className="fr-chart-body">
            {loading
              ? <div className="fr-chart-loading"><div className="fr-spinner" /></div>
              : <BarChart data={chartData} />
            }
          </div>
        </div>

        {/* Donut chart */}
        <div className="fr-chart-card">
          <div className="fr-chart-card-header">
            <h3 className="fr-chart-title">Last Run Ratio</h3>
          </div>
          <div className="fr-chart-body fr-chart-body--center">
            {loading
              ? <div className="fr-chart-loading"><div className="fr-spinner" /></div>
              : <DonutChart
                  success={latest?.successCount || 0}
                  fail={latest?.failCount || 0}
                />
            }
            <div className="fr-donut-badges">
              <span className="fr-badge fr-badge--green">
                ✓ {latest?.successCount ?? 0} Success
              </span>
              <span className="fr-badge fr-badge--red">
                ✕ {latest?.failCount ?? 0} Failed
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ── EXECUTION LOGS TABLE ── */}
      <div className="fr-table-card">
        <div className="fr-table-header">
          <h3 className="fr-table-title">📋 Job Execution Logs</h3>
          <span className="fr-table-count">{jobs.length} records</span>
        </div>

        {loading ? (
          <div className="fr-loading">
            <div className="fr-spinner" />
            <p>Loading job history…</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="fr-empty">
            <span className="fr-empty-icon">📊</span>
            <p>No job history found</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="fr-table-wrap">
              <table className="fr-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Run Date</th>
                    <th>Duration</th>
                    <th className="text-center">Total Agents</th>
                    <th className="text-center">Success</th>
                    <th className="text-center">Failed</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Logs</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job, idx) => {
                    const ok   = job.status === "SUCCESS";
                    const hasLogs = job.errorLogs.length > 0;
                    return (
                      <tr key={job.id} className={ok ? "" : "fr-row--issue"}>
                        <td><span className="fr-row-num">{idx + 1}</span></td>
                        <td>
                          <span className="fr-date">{fmtDate(job.runDate)}</span>
                          <span className="fr-time">{fmtTime(job.runDate)}</span>
                        </td>
                        <td>
                          <span className="fr-duration">{job.durationText}</span>
                        </td>
                        <td className="text-center">
                          <span className="fr-total-badge">{job.totalProcessed}</span>
                        </td>
                        <td className="text-center">
                          <span className="fr-count fr-count--success">{job.successCount}</span>
                        </td>
                        <td className="text-center">
                          {job.failCount > 0
                            ? <span className="fr-count fr-count--fail">{job.failCount}</span>
                            : <span className="fr-none">—</span>
                          }
                        </td>
                        <td className="text-center">
                          <span className={`fr-status-badge ${ok ? "fr-status-badge--ok" : "fr-status-badge--issue"}`}>
                            {ok ? "✓ Success" : "⚠ Issues"}
                          </span>
                        </td>
                        <td className="text-center">
                          {hasLogs ? (
                            <button className="fr-logs-btn" onClick={() => setLogsJob(job)}>
                              ⚠ {job.errorLogs.length} error{job.errorLogs.length !== 1 ? "s" : ""}
                            </button>
                          ) : (
                            <span className="fr-no-logs-text">Clean</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="fr-mobile-list">
              {jobs.map((job, idx) => {
                const ok = job.status === "SUCCESS";
                const hasLogs = job.errorLogs.length > 0;
                return (
                  <div key={job.id} className={`fr-mc ${ok ? "" : "fr-mc--issue"}`}>
                    <div className="fr-mc-top">
                      <div className="fr-mc-info">
                        <span className="fr-date">{fmtDate(job.runDate)}</span>
                        <span className="fr-time">{fmtTime(job.runDate)}</span>
                      </div>
                      <span className={`fr-status-badge ${ok ? "fr-status-badge--ok" : "fr-status-badge--issue"}`}>
                        {ok ? "✓" : "⚠"} {job.status}
                      </span>
                    </div>
                    <div className="fr-mc-grid">
                      <div className="fr-mc-item">
                        <span className="fr-mc-lbl">Duration</span>
                        <span className="fr-duration">{job.durationText}</span>
                      </div>
                      <div className="fr-mc-item">
                        <span className="fr-mc-lbl">Agents</span>
                        <span className="fr-total-badge">{job.totalProcessed}</span>
                      </div>
                      <div className="fr-mc-item">
                        <span className="fr-mc-lbl">Success</span>
                        <span className="fr-count fr-count--success">{job.successCount}</span>
                      </div>
                      <div className="fr-mc-item">
                        <span className="fr-mc-lbl">Failed</span>
                        {job.failCount > 0
                          ? <span className="fr-count fr-count--fail">{job.failCount}</span>
                          : <span className="fr-none">—</span>
                        }
                      </div>
                    </div>
                    {hasLogs && (
                      <button className="fr-logs-btn fr-logs-btn--full"
                        onClick={() => setLogsJob(job)}>
                        ⚠ View {job.errorLogs.length} Error Log{job.errorLogs.length !== 1 ? "s" : ""}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}