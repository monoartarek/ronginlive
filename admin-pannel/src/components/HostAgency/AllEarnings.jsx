import React, { useState, useEffect, useCallback, useRef } from 'react';
import Parse from '../../parseConfig';
import {
  Users, UserCheck, Search, RefreshCw, Download,
  Database, ChevronLeft, ChevronRight, AlertTriangle,
  TrendingUp, Video, Mic, Gem, Hash, Building2,
  ChevronsLeft, ChevronsRight, X, Loader2,
  Shield, Clock
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ─── constants ───────────────────────────────── */
const PAGE_SIZE = 50;

/* ─── tiny helpers ────────────────────────────── */
const fmtMin = (min = 0) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const Avatar = ({ name = '?' }) => {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const palettes = [
    'bg-sky-100 text-sky-700',
    'bg-emerald-100 text-emerald-700',
    'bg-violet-100 text-violet-700',
    'bg-rose-100 text-rose-700',
    'bg-amber-100 text-amber-700',
    'bg-teal-100 text-teal-700',
  ];
  return (
    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold shrink-0 ${palettes[name.charCodeAt(0) % palettes.length]}`}>
      {initials}
    </span>
  );
};

const Badge = ({ children, variant = 'default' }) => {
    const styles = {
      default: 'bg-gray-800 text-gray-300',
      blue:    'bg-sky-900/40 text-sky-300',
      green:   'bg-emerald-900/40 text-emerald-300',
      amber:   'bg-amber-900/40 text-amber-300',
      violet:  'bg-violet-900/40 text-violet-300',
    };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${styles[variant]}`}>
      {children}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, loading, color }) => {
  const colors = {
   blue: {
  bg: 'bg-[#162033] border-[#22304d]',
  icon: 'bg-sky-900/40 text-sky-300',
  val: 'text-sky-300'
},
    green:   { bg: 'bg-emerald-50 border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', val: 'text-emerald-700' },
    violet:  { bg: 'bg-violet-50 border-violet-100', icon: 'bg-violet-100 text-violet-600', val: 'text-violet-700' },
    amber:   { bg: 'bg-amber-50 border-amber-100',  icon: 'bg-amber-100 text-amber-600',  val: 'text-amber-700'  },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`rounded-2xl border p-5 ${c.bg} flex items-center gap-4`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-300 uppercase tracking-wider">{label}</p>
        {loading
          ? <div className="w-12 h-6 bg-gray-200 animate-pulse rounded mt-1" />
          : <p className={`text-2xl font-bold mt-0.5 ${c.val}`}>{value?.toLocaleString() ?? '—'}</p>
        }
      </div>
    </div>
  );
};

/* ─── Toast ───────────────────────────────────── */
const Toast = ({ msg, type, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [onDone]);
  const base = 'fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium';
  const styles = { success: 'bg-emerald-600 text-white', error: 'bg-red-600 text-white', info: 'bg-gray-900 text-white' };
  return (
    <div className={`${base} ${styles[type] || styles.info}`} style={{ animation: 'fadeUp .2s ease-out' }}>
      {type === 'success' && <Shield size={15} className="shrink-0" />}
      {type === 'error'   && <AlertTriangle size={15} className="shrink-0" />}
      {msg}
    </div>
  );
};

/* ─── Confirm Modal ───────────────────────────── */
const ConfirmModal = ({ title, desc, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-[#111c31] rounded-2xl shadow-2xl max-w-sm w-full p-6">
      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle size={22} className="text-amber-600" />
      </div>
      <h3 className="text-base font-semibold text-white text-center mb-1">{title}</h3>
      <p className="text-sm text-gray-300 text-center mb-6">{desc}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-[#22304d] text-sm font-medium text-gray-600 hover:bg-[#162033] transition">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2">
          {loading ? <Loader2 size={15} className="animate-spin" /> : null}
          {loading ? 'Processing…' : 'Confirm'}
        </button>
      </div>
    </div>
  </div>
);

/* ─── Mobile Card ─────────────────────────────── */
const HostCard = ({ row }) => (
  <div className="bg-[#111c31] rounded-2xl border border-[#22304d] shadow-sm p-4 space-y-3">
    <div className="flex items-center gap-3">
      <Avatar name={row.name} />
      <div className="min-w-0">
        <p className="font-semibold text-white truncate">{row.name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <code className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">#{row.uid}</code>
          <Badge variant="blue">{row.agencyName || 'No Agency'}</Badge>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2 text-xs">
      <Metric icon={Video}  label="Video Earn" value={row.videoBoardEarning ?? '—'} />
      <Metric icon={Clock}  label="Video Dur"  value={fmtMin(row.videoBoardDuration)} />
      <Metric icon={Mic}    label="Audio Earn" value={row.audioBoardEarning ?? '—'} />
      <Metric icon={Clock}  label="Audio Dur"  value={fmtMin(row.audioBoardDuration)} />
      <Metric icon={TrendingUp} label="Board Total" value={row.totalEarning ?? '—'} accent="violet" />
      <Metric icon={Gem}    label="User Total" value={row.totalUserEarning ?? '—'} accent="emerald" />
    </div>

    <div className="flex items-center justify-between pt-1 border-t border-gray-50">
      <span className="text-[11px] text-gray-400">Agency Owner UID</span>
      <code className="text-[11px] font-mono text-gray-600">{row.agencyOwnerId || '—'}</code>
    </div>
    <div className="flex items-center justify-between pt-1 border-t border-gray-50">
      <span className="text-[11px] text-gray-400">Object ID</span>
      <code className="text-[11px] font-mono text-gray-300 truncate max-w-[180px]">{row.objectId || '—'}</code>
    </div>
  </div>
);

const Metric = ({ icon: Icon, label, value, accent }) => {
  const accents = { violet: 'text-violet-600', emerald: 'text-emerald-600' };
  return (
    <div className="bg-[#162033] rounded-xl p-2.5">
      <div className="flex items-center gap-1 text-gray-400 mb-1">
        <Icon size={11} />
        <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`font-bold text-sm ${accents[accent] || 'text-gray-800'}`}>{value}</p>
    </div>
  );
};

/* ─── Pagination ──────────────────────────────── */
const Pagination = ({ page, totalPages, onChange, totalCount, pageSize }) => {
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, totalCount);

  const pages = [];
  const delta = 2;
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    pages.push(i);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-[#22304d]">
      <p className="text-xs text-gray-400 order-2 sm:order-1">
        Showing <span className="font-medium text-gray-700">{start}–{end}</span> of <span className="font-medium text-gray-700">{totalCount.toLocaleString()}</span> records
      </p>
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <PgBtn onClick={() => onChange(1)}          disabled={page === 1}          icon={ChevronsLeft} />
        <PgBtn onClick={() => onChange(page - 1)}   disabled={page === 1}          icon={ChevronLeft} />
        {pages[0] > 1 && <span className="px-2 text-gray-400 text-sm">…</span>}
        {pages.map(p => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
              p === page
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {p}
          </button>
        ))}
        {pages[pages.length - 1] < totalPages && <span className="px-2 text-gray-400 text-sm">…</span>}
        <PgBtn onClick={() => onChange(page + 1)}   disabled={page === totalPages} icon={ChevronRight} />
        <PgBtn onClick={() => onChange(totalPages)} disabled={page === totalPages} icon={ChevronsRight} />
      </div>
    </div>
  );
};

const PgBtn = ({ onClick, disabled, icon: Icon }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
  >
    <Icon size={14} />
  </button>
);

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
const AllHosts = () => {
  /* state */
  const [rows,        setRows]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [page,        setPage]        = useState(1);
  const [totalCount,  setTotalCount]  = useState(0);
  const [search,      setSearch]      = useState('');
  const [debouncedQ,  setDebouncedQ]  = useState('');
  const [stats,       setStats]       = useState({ totalHosts: 0, totalAgents: 0 });
  const [toast,       setToast]       = useState(null);
  // const [modal,       setModal]       = useState(null); // { type: 'reset'|'backup' }
  const [modalLoading, setModalLoading] = useState(false);

  const searchRef = useRef();

  /* debounce search */
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(search); setPage(1); }, 420);
    return () => clearTimeout(t);
  }, [search]);

  /* ── build search sub-query (reused by fetchPage + exportPDF) ── */
  const buildSearchQuery = useCallback((q) => {
    if (!q || !q.trim()) return null;
    const trimQ = q.trim();
    const uidNum = parseInt(trimQ, 10);
    if (!isNaN(uidNum)) {
      const nameQ = new Parse.Query('_User');
      nameQ.matches('name', trimQ, 'i');
      const uidQ = new Parse.Query('_User');
      uidQ.equalTo('uid', uidNum);
      return Parse.Query.or(nameQ, uidQ);
    }
    const nameQ = new Parse.Query('_User');
    nameQ.matches('name', trimQ, 'i');
    return nameQ;
  }, []);

  /* ── fetch one page ───────────────────────── */
  const fetchPage = useCallback(async (pg, q) => {
    setLoading(true);
    try {
      const skip = (pg - 1) * PAGE_SIZE;

      // Build base query config (shared for count + data)
      const buildBase = () => {
        const qry = new Parse.Query('AgencyMember');
        qry.descending('createdAt');
        qry.include('host');
        qry.include('agent');
        const sub = buildSearchQuery(q);
        if (sub) qry.matchesQuery('host', sub);
        return qry;
      };

      // Run count + data in parallel (two queries, SDK-compatible)
      const countQ = buildBase();
      const dataQ  = buildBase();
      dataQ.limit(PAGE_SIZE);
      dataQ.skip(skip);

      const [count, results] = await Promise.all([
        countQ.count({ useMasterKey: true }),
        dataQ.find({ useMasterKey: true }),
      ]);

      setTotalCount(count ?? 0);

      const mapped = results.map(obj => {
        const host  = obj.get ? obj.get('host')  : null;
        const agent = obj.get ? obj.get('agent') : null;
        const vDay  = obj.get?.('livestream_duration_day')  ?? 0;
        const aDDay = obj.get?.('audio_duration_day') ?? 0;
        return {
          objectId:          obj.id || obj.getObjectId?.() || Math.random().toString(36),
          uid:               host?.get?.('uid')          ?? '—',
          name:              host?.get?.('name')         ?? 'Unknown',
          agencyName:        agent?.get?.('agency_name') ?? '—',
          agencyOwnerId:     agent?.get?.('uid')         ?? '—',
          videoBoardEarning: obj.get?.('livestreaming_earning')    ?? 0,
          videoBoardDuration:(obj.get?.('livestream_duration')     ?? 0) + vDay * 60,
          audioBoardEarning: obj.get?.('audio_earning')            ?? 0,
          audioBoardDuration:(obj.get?.('audio_duration')          ?? 0) + aDDay * 60,
          totalEarning:      obj.get?.('total_points_earnings')    ?? 0,
          totalUserEarning:  host?.get?.('diamonds')               ?? 0,
          role:              host?.get?.('agency_role')            ?? 'agency_client',
        };
      });

      setRows(mapped);
    } catch (e) {
      console.error(e);
      showToast('Failed to load data: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [buildSearchQuery]);

  /* ── fetch stats — mirrors PHP logic exactly ─ */
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      // Total Hosts = distinct hosts in AgencyMember where agency_role = 'agency_client'
      // Total Agents = distinct agent pointers in AgencyMember
      // We fetch all AgencyMember rows (host + agent included) and deduplicate by UID
      // — exactly what the PHP foreach loop did with $totalHosts[$uid] = true
      const q = new Parse.Query('AgencyMember');
      q.include('host');
      q.include('agent');
      q.limit(5000);

      const all = await q.find({ useMasterKey: true });

      const hostUIDs  = new Set();
      const agentUIDs = new Set();

      all.forEach(m => {
        const host  = m.get?.('host');
        const agent = m.get?.('agent');
        const role  = host?.get?.('agency_role') ?? 'agency_client';

        if (host) {
          const uid = host.get?.('uid');
          if (role === 'agency_client' && uid != null) hostUIDs.add(uid);
          if (role === 'agent'         && uid != null) agentUIDs.add(uid);
        }
        // also count the agent pointer owner as an agent
        if (agent) {
          const aUid = agent.get?.('uid');
          if (aUid != null) agentUIDs.add(aUid);
        }
      });

      setStats({ totalHosts: hostUIDs.size, totalAgents: agentUIDs.size });
    } catch (e) {
      console.error('fetchStats error:', e);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchPage(page, debouncedQ); }, [fetchPage, page, debouncedQ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  /* ── toast ────────────────────────────────── */
  const showToast = (msg, type = 'info') => setToast({ msg, type });

  // /* ── reset earnings ───────────────────────── */
  // const doReset = async () => {
  //   setModalLoading(true);
  //   try {
  //     const result = await Parse.Cloud.run('resetEarningsAndDelete', {});
  //     if (result?.success) {
  //       showToast('Earnings reset and data deleted successfully!', 'success');
  //       fetchPage(1, debouncedQ);
  //       fetchStats();
  //     } else {
  //       showToast('Error: ' + (result?.error || 'Unknown error'), 'error');
  //     }
  //   } catch (e) {
  //     showToast('Error: ' + e.message, 'error');
  //   } finally {
  //     setModalLoading(false);
  //     setModal(null);
  //   }
  // };

  // /* ── backup ───────────────────────────────── */
  // const doBackup = async () => {
  //   setModalLoading(true);
  //   try {
  //     const result = await Parse.Cloud.run('backupEarningsData', {});
  //     if (result?.success) {
  //       showToast('Data backed up successfully!', 'success');
  //     } else {
  //       showToast('Error: ' + (result?.error || 'Unknown error'), 'error');
  //     }
  //   } catch (e) {
  //     showToast('Error: ' + e.message, 'error');
  //   } finally {
  //     setModalLoading(false);
  //     setModal(null);
  //   }
  // };

  /* ── export PDF ───────────────────────────── */
  const exportPDF = async () => {
    showToast('Generating PDF, please wait…', 'info');
    try {
      /* fetch maximum 100 records for PDF */
      const allQ = new Parse.Query('AgencyMember');
      allQ.descending('createdAt');
      allQ.include('host');
      allQ.include('agent');
      allQ.limit(100);
      const pdfSub = buildSearchQuery(debouncedQ);
      if (pdfSub) allQ.matchesQuery('host', pdfSub);
      const all = await allQ.find({ useMasterKey: true });

      const doc = new jsPDF('l', 'mm', 'a4');
      doc.setFontSize(16);
      doc.text('All Hosts Report', 14, 16);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}  |  Showing: ${all.length} of max 100 records`, 14, 23);

      autoTable(doc, {
        head: [['Object ID', 'UID', 'Name', 'Agency', 'Owner UID', 'Video Earn', 'Video Dur', 'Audio Earn', 'Audio Dur', 'Board Total', 'User Total']],
        body: all.map(obj => {
          const h = obj.get?.('host');
          const a = obj.get?.('agent');
          const vDay = obj.get?.('livestream_duration_day') ?? 0;
          const aDDay = obj.get?.('audio_duration_day') ?? 0;
          return [
            obj.id || obj.getObjectId?.() || '—',
            h?.get?.('uid') ?? '—',
            h?.get?.('name') ?? '—',
            a?.get?.('agency_name') ?? '—',
            a?.get?.('uid') ?? '—',
            obj.get?.('livestreaming_earning') ?? 0,
            fmtMin((obj.get?.('livestream_duration') ?? 0) + vDay * 60),
            obj.get?.('audio_earning') ?? 0,
            fmtMin((obj.get?.('audio_duration') ?? 0) + aDDay * 60),
            obj.get?.('total_points_earnings') ?? 0,
            h?.get?.('diamonds') ?? 0,
          ];
        }),
        startY: 28,
        theme: 'striped',
        headStyles: { fillColor: [2, 132, 199] },
        styles: { fontSize: 8 },
      });

      doc.save('All_Hosts_Report.pdf');
      showToast('PDF exported!', 'success');
    } catch (e) {
      showToast('PDF failed: ' + e.message, 'error');
    }
  };

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#0d1525] text-gray-100">

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* Confirm Modal */}
      {/* {modal?.type === 'reset' && (
        <ConfirmModal
          title="Reset All Earnings?"
          desc="This will permanently delete all earnings data and reset values to zero. This cannot be undone."
          onConfirm={doReset}
          onCancel={() => setModal(null)}
          loading={modalLoading}
        />
      )}
      {modal?.type === 'backup' && (
        <ConfirmModal
          title="Backup Data?"
          desc="This will create a backup snapshot of all current earnings data."
          onConfirm={doBackup}
          onCancel={() => setModal(null)}
          loading={modalLoading}
        />
      )} */}

      {/* ── Page Header ── */}
     <div className="bg-[#111c31] border-b border-[#22304d] sticky top-0 z-30 backdrop-blur">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Title + Breadcrumb */}
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white leading-tight">All Hosts</h1>
              <nav className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                <span>Users</span>
                <span>/</span>
                <span className="text-gray-700 font-medium">All Hosts</span>
              </nav>
            </div>

            {/* Action Buttons */}
            <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
              {/* <button
                onClick={() => setModal({ type: 'reset' })}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-all active:scale-95"
              >
                <RefreshCw size={14} />
                <span className="hidden sm:inline">Reset Earnings</span>
              </button>
              <button
                onClick={() => setModal({ type: 'backup' })}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 text-sm font-medium hover:bg-sky-100 transition-all active:scale-95"
              >
                <Database size={14} />
                <span className="hidden sm:inline">Backup Data</span>
              </button> */}
              <button
                onClick={exportPDF}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium transition-all active:scale-95"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Export PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5">

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users}     label="Total Hosts"   value={stats.totalHosts}   loading={statsLoading} color="blue"   />
          <StatCard icon={UserCheck} label="Total Agents"  value={stats.totalAgents}  loading={statsLoading} color="green"  />
          <StatCard icon={Hash}      label="This Page"     value={rows.length}         loading={loading}      color="violet" />
          <StatCard icon={TrendingUp} label="Total Records" value={totalCount}         loading={loading}      color="amber"  />
        </div>

        {/* ── Search Bar ── */}
        <div className="bg-[#111c31] rounded-2xl border border-[#22304d] shadow-sm px-4 py-3.5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by host name or UID…"
              className="w-full pl-9 pr-10 py-2.5 text-sm border border-[#22304d] rounded-xl bg-[#162033] focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-[#111c31] transition"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
            {loading
              ? <><Loader2 size={13} className="animate-spin text-sky-500" /> Loading…</>
              : <>{totalCount.toLocaleString()} results • Page {page}/{totalPages}</>
            }
          </div>
        </div>

        {/* ── TABLE (desktop) / CARDS (mobile) ── */}

        {/* Desktop Table */}
        <div className="hidden md:block bg-[#111c31] rounded-2xl border border-[#22304d] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-[#162033] border-b border-[#22304d]">
                  {[
                    ['Object ID', ''],
                    ['#', 'w-10'],
                    ['Host UID', ''],
                    ['Name', ''],
                    ['Agency Name', ''],
                    ['Owner UID', ''],
                    ['Video Earn', 'text-right'],
                    ['Video Duration', 'text-right'],
                    ['Audio Earn', 'text-right'],
                    ['Audio Duration', 'text-right'],
                    ['Board Total', 'text-right'],
                    ['User Total', 'text-right'],
                  ].map(([h, cls]) => (
                    <th key={h} className={`px-4 py-3 text-[11px] font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap ${cls}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 12 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="h-4 bg-gray-100 rounded w-full" style={{ width: `${40 + (j * 13) % 40}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-5 py-16 text-center">
                      <Users size={32} className="mx-auto mb-2 text-gray-200" />
                      <p className="text-sm text-gray-400">No records found{search ? ` for "${search}"` : ''}.</p>
                    </td>
                  </tr>
                ) : rows.map((row, idx) => (
                  <tr key={row.objectId} className="hover:bg-[#1b2940] transition-colors group">
                    <td className="px-4 py-3.5">
                      <code className="text-[11px] bg-black-100 text-gray-300 px-2 py-1 rounded-md font-mono tracking-tight">{row.objectId}</code>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-400 font-mono">
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="px-4 py-3.5">
                      <code className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md font-mono">#{row.uid}</code>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={row.name} />
                        <span className="font-medium text-white whitespace-nowrap">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="blue">{row.agencyName}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <code className="text-xs text-gray-300 font-mono">{row.agencyOwnerId}</code>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-gray-700">{row.videoBoardEarning.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right text-gray-300">{fmtMin(row.videoBoardDuration)}</td>
                    <td className="px-4 py-3.5 text-right font-medium text-gray-700">{row.audioBoardEarning.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right text-gray-300">{fmtMin(row.audioBoardDuration)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-semibold text-violet-700">{row.totalEarning?.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <Gem size={11} className="text-emerald-400" />
                        {row.totalUserEarning?.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && rows.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              totalCount={totalCount}
              pageSize={PAGE_SIZE}
            />
          )}
        </div>

        {/* Mobile Card Grid */}
        <div className="md:hidden space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[#111c31] rounded-2xl border border-[#22304d] p-4 animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div key={j} className="h-14 bg-gray-100 rounded-xl" />
                  ))}
                </div>
              </div>
            ))
          ) : rows.length === 0 ? (
            <div className="bg-[#111c31] rounded-2xl border border-[#22304d] p-12 text-center">
              <Users size={32} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">No records found{search ? ` for "${search}"` : ''}.</p>
            </div>
          ) : (
            rows.map(row => <HostCard key={row.objectId} row={row} />)
          )}

          {/* Mobile Pagination */}
          {!loading && rows.length > 0 && (
            <div className="bg-[#111c31] rounded-2xl border border-[#22304d] shadow-sm">
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={setPage}
                totalCount={totalCount}
                pageSize={PAGE_SIZE}
              />
            </div>
          )}
        </div>

      </div>

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
};

export default AllHosts;