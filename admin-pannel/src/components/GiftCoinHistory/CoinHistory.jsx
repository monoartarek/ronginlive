import React, { useState, useEffect, useCallback, useRef } from "react";
import Parse from "../../parseConfig";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Copy, Download, RefreshCw, Search, Coins, X } from "lucide-react";
import "./Coin.css";

const PAGE_SIZE = 20;

/* ── helpers ─────────────────────────────────────── */
const fmt = (n) => Number(n).toLocaleString();

const toBase64 = (url) =>
  new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth || 80;
        c.height = img.naturalHeight || 80;
        c.getContext("2d").drawImage(img, 0, 0);
        resolve(c.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url + (url.includes("?") ? "&" : "?") + "_t=" + Date.now();
  });

/* ── component ───────────────────────────────────── */
export default function CoinTransactions() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [uid, setUid] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [toast, setToast] = useState("");
  const [activePreset, setActivePreset] = useState(null);
  const timerRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(""), 2400);
  };

  const copyUID = (val) => {
    navigator.clipboard.writeText(String(val));
    showToast("Copied: " + val);
  };

  const mapRow = (r) => {
    const a = r.get("author");
    const b = r.get("receiver");
    return {
      id: r.id,
      transactedAmount: r.get("transacted_amount") || 0,
      amountAfterTransaction: r.get("amount_after_transaction") || 0,
      transactionType: r.get("transaction_type") || "sent",
      createdAt: r.createdAt,
      author: {
        name: a?.get("name") || "User",
        uid: a?.get("uid") ?? r.get("author_id") ?? "—",
        avatar: a?.get("avatar")?.url?.() ?? null,
      },
      receiver: {
        name: b?.get("name") || "User",
        uid: b?.get("uid") ?? r.get("receiver_id") ?? "—",
        avatar: b?.get("avatar")?.url?.() ?? null,
      },
    };
  };

  const buildQ = useCallback(() => {
    const Q = new Parse.Query(Parse.Object.extend("CoinsTransactions"));
    if (uid.trim()) {
      const uQ = new Parse.Query(Parse.User);
      uQ.equalTo("uid", Number(uid.trim()));
      Q.matchesQuery("author", uQ);
    }
    if (startDate) Q.greaterThanOrEqualTo("createdAt", new Date(startDate));
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      Q.lessThanOrEqualTo("createdAt", e);
    }
    Q.include("author", "receiver");
    Q.descending("createdAt");
    return Q;
  }, [uid, startDate, endDate]);

  const fetchData = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setSpinning(true);
    else setLoading(true);
    try {
      const base = buildQ();
      const paged = buildQ();
      paged.limit(PAGE_SIZE);
      paged.skip(page * PAGE_SIZE);

      const [results, count, all] = await Promise.all([
        paged.find({ useMasterKey: true }),
        base.count({ useMasterKey: true }),
        base.find({ useMasterKey: true }),
      ]);

      setRows(results.map(mapRow));
      setTotalCount(count);
      setTotalCoins(all.reduce((s, r) => s + (r.get("transacted_amount") || 0), 0));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  }, [buildQ, page]);

  useEffect(() => {
    fetchData();
  }, [page]); // eslint-disable-line

  const handleSearch = () => {
    setPage(0);
    fetchData();
  };
  const handleRefresh = () => fetchData({ isRefresh: true });
  const setRange = (d) => {
    const now = new Date(),
      s = new Date();
    s.setDate(now.getDate() - d);
    setStartDate(s.toISOString().split("T")[0]);
    setEndDate(now.toISOString().split("T")[0]);
    setActivePreset(d);
  };

  /* ── PDF Export — ALL filtered records ── */
  const handleExport = async () => {
    setExporting(true);
    try {
      const q = buildQ();
      q.limit(10000);
      const records = await q.find({ useMasterKey: true });
      const data = records.map(mapRow);

      const cache = {};
      const urls = [
        ...new Set(data.flatMap((d) => [d.author.avatar, d.receiver.avatar]).filter(Boolean)),
      ];
      await Promise.all(urls.map(async (u) => {
        cache[u] = await toBase64(u);
      }));

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const PW = doc.internal.pageSize.getWidth();
      const PH = doc.internal.pageSize.getHeight();

      /* header */
      doc.setFillColor(10, 10, 16);
      doc.rect(0, 0, PW, 54, "F");
      doc.setFillColor(255, 200, 0);
      doc.rect(0, 54, PW, 3, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(19);
      doc.setFont("helvetica", "bold");
      doc.text("Coin Transactions Report", 28, 36);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(170, 170, 170);
      doc.text("Generated: " + new Date().toLocaleString(), PW - 28, 36, { align: "right" });

      /* summary bar */
      doc.setFillColor(255, 251, 224);
      doc.roundedRect(28, 64, PW - 56, 26, 4, 4, "F");
      doc.setTextColor(80, 55, 0);
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.text("Total Records: " + data.length, 42, 81);
      doc.text("Total Coins: " + fmt(totalCoins), PW / 2, 81, { align: "center" });
      const dateRange =
        startDate && endDate
          ? startDate + "  to  " + endDate
          : startDate
          ? "From " + startDate
          : endDate
          ? "Until " + endDate
          : "All time";
      doc.text("Period: " + dateRange, PW - 42, 81, { align: "right" });

      /* column layout */
      const C = {
        sender: 28,
        receiver: 204,
        amount: 382,
        after: 492,
        date: 618,
      };
      const RH = 44;
      const AS = 28;
      let y = 100;

      const drawTHead = () => {
        doc.setFillColor(18, 18, 26);
        doc.rect(28, y, PW - 56, 22, "F");
        const hdrs = [
          ["SENDER", C.sender + 2],
          ["RECEIVER", C.receiver + 2],
          ["AMOUNT", C.amount + 2],
          ["BALANCE AFTER", C.after + 2],
          ["DATE & TIME", C.date + 2],
        ];
        doc.setTextColor(255, 200, 0);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        hdrs.forEach(([t, x]) => doc.text(t, x, y + 15));
        y += 22;
      };

      drawTHead();

      data.forEach((item, i) => {
        if (y + RH > PH - 22) {
          doc.addPage();
          y = 20;
          drawTHead();
        }

        if (i % 2 === 0) {
          doc.setFillColor(255, 255, 255);
        } else {
          doc.setFillColor(248, 249, 252);
        }
        doc.rect(28, y, PW - 56, RH, "F");
        doc.setDrawColor(220, 224, 232);
        doc.line(28, y + RH, PW - 28, y + RH);

        const mid = y + RH / 2;
        const avaY = y + (RH - AS) / 2;

        /* sender */
        const aImg = item.author.avatar ? cache[item.author.avatar] : null;
        if (aImg) {
          doc.addImage(aImg, "PNG", C.sender + 2, avaY, AS, AS);
        } else {
          doc.setFillColor(59, 130, 246);
          doc.circle(C.sender + 2 + AS / 2, mid, AS / 2, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(11);
          doc.text(
            (item.author.name[0] || "?").toUpperCase(),
            C.sender + 2 + AS / 2,
            mid + 4,
            { align: "center" }
          );
        }
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.text(item.author.name.slice(0, 16), C.sender + AS + 8, mid - 3);
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text("UID: " + String(item.author.uid), C.sender + AS + 8, mid + 7);

        /* receiver */
        const rImg = item.receiver.avatar ? cache[item.receiver.avatar] : null;
        if (rImg) {
          doc.addImage(rImg, "PNG", C.receiver + 2, avaY, AS, AS);
        } else {
          doc.setFillColor(16, 185, 129);
          doc.circle(C.receiver + 2 + AS / 2, mid, AS / 2, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(11);
          doc.text(
            (item.receiver.name[0] || "?").toUpperCase(),
            C.receiver + 2 + AS / 2,
            mid + 4,
            { align: "center" }
          );
        }
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.text(item.receiver.name.slice(0, 16), C.receiver + AS + 8, mid - 3);
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text("UID: " + String(item.receiver.uid), C.receiver + AS + 8, mid + 7);

        /* amount */
        doc.setTextColor(37, 99, 235);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(fmt(item.transactedAmount), C.amount + 4, mid + 3);

        /* balance after */
        doc.setTextColor(16, 185, 129);
        doc.setFontSize(9);
        doc.text(fmt(item.amountAfterTransaction), C.after + 4, mid + 3);

        /* date */
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.text(new Date(item.createdAt).toLocaleString(), C.date + 4, mid + 3);

        y += RH;
      });

      const tp = doc.internal.getNumberOfPages();
      for (let p = 1; p <= tp; p++) {
        doc.setPage(p);
        doc.setFillColor(10, 10, 16);
        doc.rect(0, PH - 18, PW, 18, "F");
        doc.setTextColor(130, 130, 130);
        doc.setFontSize(7.5);
        doc.text(
          "Page " + p + " of " + tp + "   |   Coin Transactions Export",
          PW / 2,
          PH - 5,
          { align: "center" }
        );
      }

      doc.save("coin-transactions-" + new Date().toISOString().slice(0, 10) + ".pdf");
      showToast("PDF exported — " + data.length + " records");
    } catch (err) {
      console.error("Export error:", err);
      showToast("Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  /* ── render ──────────────────────────────── */
  return (
    <div className="gc-root">
      {toast && <div className="gc-toast">{toast}</div>}

      {/* Top bar */}
      <div className="gc-topbar">
        <div className="gc-topbar-inner">
          <div className="gc-logo-row">
            <Coins size={20} className="gc-logo-icon" />
            <h1 className="gc-heading">Coin Transactions</h1>
          </div>
          <div className="gc-actions">
            <button
              className={`gc-btn-refresh${spinning ? " spinning" : ""}`}
              onClick={handleRefresh}
              disabled={spinning || loading}
            >
              <RefreshCw size={14} className={spinning ? "spin" : ""} />
              <span>Refresh</span>
            </button>
            <button
              className="gc-btn-export"
              onClick={handleExport}
              disabled={exporting}
            >
              <Download size={14} />
              <span>{exporting ? "Exporting…" : "Export PDF"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="gc-body">
        {/* Stat card */}
        <div className="gc-stat">
          <div>
            <p className="gc-stat-lbl">Total Coins · Filtered</p>
            <div className="gc-stat-num">🪙 {fmt(totalCoins)}</div>
            <p className="gc-stat-sub">{fmt(totalCount)} total records</p>
          </div>
          <Coins size={60} className="gc-stat-gem" />
        </div>

        {/* Filters */}
        <div className="gc-filter-card">
          <div className="gc-filter-grid">
            <div className="gc-field">
              <label>Search by UID</label>
              <div className="gc-iw">
                <Search size={13} className="gc-ii" />
                <input
                  placeholder="Enter user UID…"
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
            </div>
            <div className="gc-field">
              <label className={startDate ? "gc-label--active" : ""}>Start Date</label>
              <input
                type="date"
                value={startDate}
                className={startDate ? "gc-input--active" : ""}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActivePreset(null);
                }}
              />
            </div>
            <div className="gc-field">
              <label className={endDate ? "gc-label--active" : ""}>End Date</label>
              <input
                type="date"
                value={endDate}
                className={endDate ? "gc-input--active" : ""}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActivePreset(null);
                }}
              />
            </div>
            <button className="gc-search-btn" onClick={handleSearch}>
              <Search size={13} /> Search
            </button>
          </div>
          <div className="gc-chips">
            {[0, 1, 7, 15, 30].map((d) => (
              <button
                key={d}
                className={`gc-chip${activePreset === d ? " gc-chip--active" : ""}`}
                onClick={() => setRange(d)}
              >
                Last {d} d
              </button>
            ))}
            <button
              className="gc-chip gc-chip-x"
              onClick={() => {
                setUid("");
                setStartDate("");
                setEndDate("");
                setActivePreset(null);
              }}
            >
              <X size={10} /> Clear
            </button>
          </div>
        </div>

        {/* Data */}
        {loading ? (
          <div className="gc-loader">
            <div className="gc-spin-ring" />
            <p>Loading records…</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="gc-tbl-wrap">
              <table className="gc-tbl">
                <thead>
                  <tr>
                    <th>Sender</th>
                    <th>Receiver</th>
                    <th>Amount</th>
                    <th>Balance After</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="gc-no-data">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="gc-trow">
                        <td>
                          <div className="gc-ucell">
                            <img
                              src={r.author.avatar || "/logo.png"}
                              className="gc-ava"
                              alt=""
                              onError={(e) => {
                                e.target.src = "/logo.png";
                              }}
                            />
                            <div>
                              <div className="gc-uname">{r.author.name}</div>
                              <button
                                className="gc-uid-btn"
                                onClick={() => copyUID(r.author.uid)}
                              >
                                {r.author.uid} <Copy size={9} />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="gc-ucell">
                            <img
                              src={r.receiver.avatar || "/logo.png"}
                              className="gc-ava"
                              alt=""
                              onError={(e) => {
                                e.target.src = "/logo.png";
                              }}
                            />
                            <div>
                              <div className="gc-uname">{r.receiver.name}</div>
                              <button
                                className="gc-uid-btn"
                                onClick={() => copyUID(r.receiver.uid)}
                              >
                                {r.receiver.uid} <Copy size={9} />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="gc-amount">🪙 {fmt(r.transactedAmount)}</td>
                        <td className="gc-balance">⚖️ {fmt(r.amountAfterTransaction)}</td>
                        <td className="gc-dt">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="gc-card-list">
              {rows.length === 0 ? (
                <div className="gc-no-card">No records found</div>
              ) : (
                rows.map((r) => (
                  <div key={r.id} className="gc-card">
                    <div className="gc-card-hd">
                      <span className="gc-card-date">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                      <span className="gc-card-coins">🪙 {fmt(r.transactedAmount)}</span>
                    </div>
                    <div className="gc-card-balance-after">
                      Balance after: {fmt(r.amountAfterTransaction)}
                    </div>
                    <div className="gc-card-users">
                      <div className="gc-cu">
                        <img
                          src={r.author.avatar || "/logo.png"}
                          className="gc-card-ava"
                          alt=""
                          onError={(e) => {
                            e.target.src = "/logo.png";
                          }}
                        />
                        <div className="gc-cu-role">SENDER</div>
                        <div className="gc-cu-name">{r.author.name}</div>
                        <button
                          className="gc-uid-btn"
                          onClick={() => copyUID(r.author.uid)}
                        >
                          {r.author.uid} <Copy size={9} />
                        </button>
                      </div>
                      <div className="gc-arrow">→</div>
                      <div className="gc-cu">
                        <img
                          src={r.receiver.avatar || "/logo.png"}
                          className="gc-card-ava"
                          alt=""
                          onError={(e) => {
                            e.target.src = "/logo.png";
                          }}
                        />
                        <div className="gc-cu-role">RECEIVER</div>
                        <div className="gc-cu-name">{r.receiver.name}</div>
                        <button
                          className="gc-uid-btn"
                          onClick={() => copyUID(r.receiver.uid)}
                        >
                          {r.receiver.uid} <Copy size={9} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            <div className="gc-pager">
              <button
                className="gc-pg-btn"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <span className="gc-pg-info">
                <strong>{page + 1}</strong> / <strong>{totalPages}</strong>
              </span>
              <button
                className="gc-pg-btn"
                disabled={(page + 1) * PAGE_SIZE >= totalCount}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}