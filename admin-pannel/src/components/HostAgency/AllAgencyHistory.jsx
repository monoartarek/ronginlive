import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Parse from '../../parseConfig';
import {
  History, Search, Download, RefreshCw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  AlertTriangle, X, Loader2, Shield, Hash,
  Gem, TrendingUp, Clock, Wallet, Building2, User,
  Mail, AtSign, Copy, Check, FileText, CreditCard,
  ArrowLeft, Video, LayoutList, LayoutGrid, CheckCheck,
  Activity, Eye
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ══════════════════════════════════════════════
   CONSTANTS & THEME
══════════════════════════════════════════════ */
const PAGE_SIZE = 50;
const BG        = '#0d1525';
const BG2       = 'rgba(255,255,255,0.03)';
const BORDER    = 'rgba(255,255,255,0.07)';
const BORDER2   = 'rgba(255,255,255,0.12)';
const ACCENT    = '#3b82f6';
const EMERALD   = '#10b981';
const VIOLET    = '#8b5cf6';
const CYAN      = '#06b6d4';
const ROSE      = '#f43f5e';
const AMBER     = '#f59e0b';

const fmt = n => Number(n || 0).toLocaleString();

/* ── Type color mapping ── */
const typeStyle = (type) => {
  if (!type || type === '—') return { bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.3)', color: '#94a3b8', dot: '#64748b' };
  const t = type.toLowerCase();
  if (t.includes('video') || t.includes('live')) return { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)', color: '#60a5fa', dot: '#3b82f6' };
  if (t.includes('audio'))  return { bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.3)', color: '#a78bfa', dot: '#8b5cf6' };
  if (t.includes('bonus'))  return { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', color: '#34d399', dot: '#10b981' };
  if (t.includes('with'))   return { bg: 'rgba(244,63,94,0.15)',  border: 'rgba(244,63,94,0.3)',  color: '#fb7185', dot: '#f43f5e' };
  return { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', color: '#fbbf24', dot: '#f59e0b' };
};

const TypeBadge = ({ type }) => {
  const s = typeStyle(type);
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
      {type || '—'}
    </span>
  );
};

/* ── Avatar ── */
const Avatar = ({ name = '?', size = 36 }) => {
  const initials = name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#3b82f6','#8b5cf6','#10b981','#f43f5e','#f59e0b','#06b6d4'];
  const c = colors[(name || '?').charCodeAt(0) % colors.length];
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 text-white font-bold"
      style={{ width: size, height: size, background: c, fontSize: size < 40 ? 11 : 13, border: '2px solid rgba(255,255,255,0.1)' }}>
      {initials}
    </div>
  );
};

/* ── Copy chip ── */
const useCopy = () => {
  const [copied, setCopied] = useState(null);
  const copy = (text, key) => {
    navigator.clipboard?.writeText(String(text)).then(() => {
      setCopied(key); setTimeout(() => setCopied(null), 1800);
    });
  };
  return { copied, copy };
};

const CopyChip = ({ value, copyKey, copied, copy, label }) => (
  <button
    onClick={e => { e.stopPropagation(); copy(value, copyKey); }}
    className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-semibold transition-all active:scale-95 border"
    style={{
      background: 'rgba(255,255,255,0.05)',
      borderColor: copied === copyKey ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)',
      color: copied === copyKey ? '#10b981' : '#94a3b8',
    }}>
    {copied === copyKey
      ? <><CheckCheck size={10} className="text-emerald-400" /><span className="text-emerald-400">{value}</span></>
      : <><Copy size={10} className="opacity-40 group-hover:opacity-100" />{value}</>
    }
  </button>
);

/* ── Toast ── */
const Toast = ({ msg, type, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed top-5 right-5 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold border"
      style={{
        background: type === 'error' ? '#dc2626' : type === 'success' ? '#059669' : '#1e293b',
        borderColor: type === 'error' ? 'rgba(239,68,68,0.4)' : type === 'success' ? 'rgba(16,185,129,0.4)' : BORDER2,
        animation: 'toastIn .25s cubic-bezier(.34,1.56,.64,1)',
      }}>
      {type === 'success' ? <CheckCheck size={14} /> : <AlertTriangle size={14} />}
      {msg}
    </div>
  );
};

/* ── Pagination ── */
const Pagination = ({ page, totalPages, onChange, totalCount, pageSize }) => {
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, totalCount);
  const pages = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) pages.push(i);
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-white/5"
      style={{ background: 'rgba(0,0,0,0.1)' }}>
      <p className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-300">{start}–{end}</span> of <span className="font-semibold text-slate-300">{totalCount.toLocaleString()}</span> records
      </p>
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <PgBtn onClick={() => onChange(1)}       disabled={page===1}          icon={ChevronsLeft} />
        <PgBtn onClick={() => onChange(page-1)}  disabled={page===1}          icon={ChevronLeft} />
        {pages[0] > 1 && <span className="text-slate-600 px-1 text-xs">…</span>}
        {pages.map(p => (
          <button key={p} onClick={() => onChange(p)}
            className="w-8 h-8 rounded-lg text-xs font-semibold transition-all"
            style={p===page
              ? { background: ACCENT, color: '#fff', boxShadow: '0 0 12px rgba(59,130,246,0.4)' }
              : { background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: '#64748b' }}>
            {p}
          </button>
        ))}
        {pages[pages.length-1] < totalPages && <span className="text-slate-600 px-1 text-xs">…</span>}
        <PgBtn onClick={() => onChange(page+1)}       disabled={page===totalPages} icon={ChevronRight} />
        <PgBtn onClick={() => onChange(totalPages)}   disabled={page===totalPages} icon={ChevronsRight} />
      </div>
    </div>
  );
};
const PgBtn = ({ onClick, disabled, icon: Icon }) => (
  <button onClick={onClick} disabled={disabled}
    className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition">
    <Icon size={13} />
  </button>
);

/* ── Mini stat card ── */
const MiniStat = ({ icon: Icon, label, value, loading, color, glow }) => (
  <div className="rounded-2xl p-4 flex items-center gap-3"
    style={{ background: BG2, border: `1px solid ${BORDER}` }}>
    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: glow, border: `1px solid ${color}30` }}>
      <Icon size={17} style={{ color }} />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      {loading
        ? <div className="w-16 h-5 rounded animate-pulse mt-1" style={{ background: 'rgba(255,255,255,0.07)' }} />
        : <p className="text-xl font-black mt-0.5" style={{ color }}>{value?.toLocaleString() ?? '—'}</p>
      }
    </div>
  </div>
);

/* ══════════════════════════════════════════════
   DETAIL OVERLAY — full page, sidebar-aware
══════════════════════════════════════════════ */
const DetailOverlay = ({ row, onClose }) => {
  const { copied, copy } = useCopy();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const ts = typeStyle(row.type);

  const exportPDF = () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      doc.setFontSize(16); doc.setFont('helvetica', 'bold');
      doc.text('Agency History — Record Detail', 14, 18);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);
      autoTable(doc, {
        head: [['Field', 'Value']],
        body: [
          ['Object ID', row.objectId], ['Host UID', `#${row.uid}`], ['Host Name', row.name],
          ['Username', `@${row.username}`], ['Email', row.email || '—'],
          ['Agency Name', row.agencyName], ['Agency Owner UID', row.agencyOwnerId],
          ['Board Type', row.type], ['Earning', fmt(row.earning)],
          ['Duration', `${row.duration} min`], ['Bonus', fmt(row.bonus)],
          ['Withdraw Amount', fmt(row.withdrawAmount)], ['Withdraw Type', row.withdrawType],
        ],
        startY: 30, theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 },
      });
      doc.save(`Record_${row.uid}_${Date.now()}.pdf`);
    } catch (e) { alert('PDF failed: ' + e.message); }
  };

  const metrics = [
    { icon: TrendingUp, label: 'Earning',   value: fmt(row.earning),        color: EMERALD, glow: 'rgba(16,185,129,0.15)' },
    { icon: Clock,      label: 'Duration',  value: `${row.duration} min`,   color: CYAN,    glow: 'rgba(6,182,212,0.15)'  },
    { icon: Gem,        label: 'Bonus',     value: fmt(row.bonus),          color: VIOLET,  glow: 'rgba(139,92,246,0.15)' },
    { icon: Wallet,     label: 'Withdrawn', value: fmt(row.withdrawAmount),  color: ROSE,    glow: 'rgba(244,63,94,0.15)'  },
  ];

  return (
    <div className="fixed top-0 right-0 bottom-0 left-0 lg:left-64 z-50 overflow-y-auto"
      style={{ background: BG, animation: 'overlayIn .3s cubic-bezier(.22,1,.36,1)' }}>

      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 border-b border-white/[0.06]"
        style={{ background: 'rgba(13,21,37,0.95)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-3 flex items-center gap-3 flex-wrap">
          <button onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-blue-300 text-sm font-bold transition active:scale-95 shrink-0"
            style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)' }}>
            <ArrowLeft size={14} /> Back to History
          </button>
          <nav className="hidden sm:flex items-center gap-1.5 text-sm text-slate-500 min-w-0">
            <span>Agency History</span><span>/</span>
            <span className="text-white font-semibold truncate">{row.name}</span>
          </nav>
          <div className="ml-auto flex gap-2 shrink-0">
            <button onClick={exportPDF}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition active:scale-95"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
              <FileText size={12} /> PDF
            </button>
            <button onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition text-slate-500 hover:text-white"
              style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}` }}>
              <X size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-6 space-y-5">

        {/* Profile banner */}
        <div className="rounded-2xl p-6 flex flex-wrap items-center gap-5"
          style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div className="flex items-center gap-4">
            <button onClick={onClose}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-blue-300 text-sm font-bold transition active:scale-95 shrink-0 self-start"
              style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)' }}>
              <ArrowLeft size={13} /> Back
            </button>
            <Avatar name={row.name} size={64} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-white">{row.name}</h1>
            <p className="text-slate-400 text-sm mt-0.5">@{row.username}</p>
            {row.email && row.email !== '—' && (
              <p className="text-slate-500 text-xs mt-1 flex items-center gap-1"><Mail size={11} />{row.email}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              <CopyChip value={row.uid}      copyKey={`uid-${row.objectId}`}  copied={copied} copy={copy} label="UID" />
              <CopyChip value={row.objectId} copyKey={`oid-${row.objectId}`}  copied={copied} copy={copy} label="Object ID" />
              <TypeBadge type={row.type} />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            {metrics.map(m => (
              <div key={m.label} className="px-4 py-3 rounded-xl text-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}` }}>
                <p className="text-lg font-black" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Detail cards grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Host Info */}
          <div className="rounded-2xl overflow-hidden" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-white/[0.06]">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.2)' }}>
                <User size={14} className="text-blue-400" />
              </div>
              <h2 className="text-blue-400 text-sm font-bold uppercase tracking-widest">Host Information</h2>
            </div>
            <div className="px-6 py-4 space-y-3">
              {[
                { label: 'UID',       value: row.uid,      copy: true, copyKey: `d-uid-${row.objectId}` },
                { label: 'Object ID', value: row.objectId, copy: true, copyKey: `d-oid-${row.objectId}` },
                { label: 'Name',      value: row.name },
                { label: 'Username',  value: `@${row.username}` },
                { label: 'Email',     value: row.email || '—' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{r.label}</span>
                  {r.copy
                    ? <CopyChip value={r.value} copyKey={r.copyKey} copied={copied} copy={copy} />
                    : <span className="text-sm text-slate-300 font-medium">{r.value}</span>
                  }
                </div>
              ))}
            </div>
          </div>

          {/* Agency Info */}
          <div className="rounded-2xl overflow-hidden" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-white/[0.06]">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.2)' }}>
                <Building2 size={14} className="text-violet-400" />
              </div>
              <h2 className="text-violet-400 text-sm font-bold uppercase tracking-widest">Agency Information</h2>
            </div>
            <div className="px-6 py-4 space-y-3">
              {[
                { label: 'Agency Name', value: row.agencyName },
                { label: 'Owner UID',   value: row.agencyOwnerId },
                { label: 'Board Type',  value: row.type, badge: true },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{r.label}</span>
                  {r.badge ? <TypeBadge type={r.value} /> : <span className="text-sm text-slate-300 font-medium">{r.value}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Earnings */}
          <div className="rounded-2xl overflow-hidden" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-white/[0.06]">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.2)' }}>
                <TrendingUp size={14} className="text-emerald-400" />
              </div>
              <h2 className="text-emerald-400 text-sm font-bold uppercase tracking-widest">Earnings Breakdown</h2>
            </div>
            <div className="px-6 py-4 grid grid-cols-3 gap-4">
              {[
                { label: 'Earning', value: fmt(row.earning), color: EMERALD },
                { label: 'Duration', value: `${row.duration}m`, color: CYAN },
                { label: 'Bonus', value: fmt(row.bonus), color: VIOLET },
              ].map(m => (
                <div key={m.label} className="text-center py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                  <p className="text-lg font-black" style={{ color: m.color }}>{m.value}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Withdrawal */}
          <div className="rounded-2xl overflow-hidden" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-white/[0.06]">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(244,63,94,0.2)' }}>
                <Wallet size={14} className="text-rose-400" />
              </div>
              <h2 className="text-rose-400 text-sm font-bold uppercase tracking-widest">Withdrawal</h2>
            </div>
            <div className="px-6 py-4 space-y-3">
              {[
                { label: 'Withdraw Amount', value: fmt(row.withdrawAmount), color: ROSE },
                { label: 'Withdraw Type',   value: row.withdrawType || '—' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{r.label}</span>
                  <span className="text-sm font-bold" style={{ color: r.color || '#e2e8f0' }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-center pb-6">
          <button onClick={onClose}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-slate-400 hover:text-white transition"
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}` }}>
            <ArrowLeft size={14} /> Back to History
          </button>
        </div>
      </div>

      <style>{`@keyframes overlayIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  );
};

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
const AgencyHistory = () => {
  const [rows,         setRows]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [page,         setPage]         = useState(1);
  const [totalCount,   setTotalCount]   = useState(0);
  const [search,       setSearch]       = useState('');
  const [debouncedQ,   setDebouncedQ]   = useState('');
  const [stats,        setStats]        = useState({ total: 0, totalEarning: 0, totalBonus: 0, totalWithdraw: 0 });
  const [toast,        setToast]        = useState(null);
  const [detailRow,    setDetailRow]    = useState(null);
  const [viewMode,     setViewMode]     = useState('list');

  const searchRef = useRef();
  const { copied, copy } = useCopy();
  const showToast = (msg, type = 'info') => setToast({ msg, type });

  /* debounce search */
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(search); setPage(1); }, 420);
    return () => clearTimeout(t);
  }, [search]);

  /* build search sub-query */
  const buildSearchQuery = useCallback((q) => {
    if (!q?.trim()) return null;
    const trimQ = q.trim();
    const uidNum = parseInt(trimQ, 10);
    const nameQ = new Parse.Query('_User');
    nameQ.matches('name', trimQ, 'i');
    if (!isNaN(uidNum)) {
      const uidQ = new Parse.Query('_User'); uidQ.equalTo('uid', uidNum);
      return Parse.Query.or(nameQ, uidQ);
    }
    return nameQ;
  }, []);

  /* map row — single host+agent lookup */
  const mapRow = useCallback(async (obj) => {
    const hostId  = obj.get?.('host_id');
    const agentId = obj.get?.('agency_id');
    let uid = '—', name = 'Unknown', username = '—', email = '—';
    if (hostId) {
      try {
        const hq = new Parse.Query('_User');
        hq.equalTo('objectId', hostId);
        const host = await hq.first({ useMasterKey: true });
        if (host) { uid = host.get?.('uid') ?? '—'; name = host.get?.('name') ?? 'Unknown'; username = host.get?.('username') ?? '—'; email = host.get?.('email') ?? '—'; }
      } catch (_) {}
    }
    let agencyName = '—', agencyOwnerId = '—';
    if (agentId) {
      try {
        const aq = new Parse.Query('_User');
        aq.equalTo('objectId', agentId);
        const agent = await aq.first({ useMasterKey: true });
        if (agent) { agencyName = agent.get?.('agency_name') ?? '—'; agencyOwnerId = agent.get?.('uid') ?? '—'; }
      } catch (_) {}
    }
    return {
      objectId: obj.id || '—', uid, name, username, email, agencyName, agencyOwnerId,
      type: obj.get?.('type') ?? '—', earning: obj.get?.('earning') ?? 0,
      duration: obj.get?.('duration') ?? 0, bonus: obj.get?.('bonus') ?? 0,
      withdrawAmount: obj.get?.('withdraw_amount') ?? 0, withdrawType: obj.get?.('withdraw_type') ?? '—',
      hostId, agentId,
    };
  }, []);

  /* SERVER-SIDE fetch page */
  const fetchPage = useCallback(async (pg, q) => {
    setLoading(true);
    try {
      const skip = (pg - 1) * PAGE_SIZE;
      const buildBase = () => {
        const qry = new Parse.Query('AgencyHistory');
        qry.descending('createdAt');
        const sub = buildSearchQuery(q);
        if (sub) qry.matchesKeyInQuery('host_id', 'objectId', sub);
        return qry;
      };
      const countQ = buildBase(); const dataQ = buildBase();
      dataQ.limit(PAGE_SIZE); dataQ.skip(skip);
      const [count, results] = await Promise.all([
        countQ.count({ useMasterKey: true }),
        dataQ.find({ useMasterKey: true }),
      ]);
      setTotalCount(count ?? 0);
      setRows(await Promise.all(results.map(mapRow)));
    } catch (e) {
      console.error(e); showToast('Failed to load: ' + e.message, 'error');
    } finally { setLoading(false); }
  }, [buildSearchQuery, mapRow]);

  /* fetch stats */
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const q = new Parse.Query('AgencyHistory'); q.limit(5000);
      const all = await q.find({ useMasterKey: true });
      let totalEarning = 0, totalBonus = 0, totalWithdraw = 0;
      all.forEach(obj => {
        totalEarning  += obj.get?.('earning')         ?? 0;
        totalBonus    += obj.get?.('bonus')           ?? 0;
        totalWithdraw += obj.get?.('withdraw_amount') ?? 0;
      });
      setStats({ total: all.length, totalEarning, totalBonus, totalWithdraw });
    } catch (e) { console.error(e); }
    finally { setStatsLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchPage(page, debouncedQ); }, [fetchPage, page, debouncedQ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  /* export PDF list */
  const exportPDF = async () => {
    showToast('Generating PDF…', 'info');
    try {
      const q = new Parse.Query('AgencyHistory');
      q.descending('createdAt'); q.limit(100);
      const sub = buildSearchQuery(debouncedQ);
      if (sub) q.matchesKeyInQuery('host_id', 'objectId', sub);
      const all = await q.find({ useMasterKey: true });
      const mapped = await Promise.all(all.map(mapRow));
      const doc = new jsPDF('l', 'mm', 'a4');
      doc.setFontSize(15); doc.text('Agency History Report', 14, 16);
      doc.setFontSize(9); doc.setTextColor(80);
      doc.text(`Generated: ${new Date().toLocaleString()} | ${mapped.length} records`, 14, 23);
      autoTable(doc, {
        head: [['Obj ID','UID','Name','Agency','Owner','Type','Earning','Duration','Bonus','Withdraw','W.Type']],
        body: mapped.map(r => [r.objectId,r.uid,r.name,r.agencyName,r.agencyOwnerId,r.type,r.earning,`${r.duration}m`,r.bonus,r.withdrawAmount,r.withdrawType]),
        startY: 28, theme: 'striped', headStyles: { fillColor: [59,130,246] }, styles: { fontSize: 6.5 },
      });
      doc.save('Agency_History_Report.pdf');
      showToast('PDF exported!', 'success');
    } catch (e) { showToast('PDF failed: ' + e.message, 'error'); }
  };

  /* initial loading screen */
  if (loading && page === 1 && rows.length === 0 && !debouncedQ) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading agency history…</p>
      </div>
    </div>
  );

  /* ══════════════════ RENDER ══════════════════ */
  return (
    <div className="min-h-screen" style={{ background: BG, fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {detailRow && <DetailOverlay row={detailRow} onClose={() => setDetailRow(null)} />}

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-30 border-b border-white/[0.06]"
        style={{ background: 'rgba(13,21,37,0.95)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}>
              <History size={17} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Agency History</h1>
              <nav className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                <span>Users</span><span>/</span><span className="text-slate-400">Agency History</span>
              </nav>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex rounded-xl overflow-hidden border border-white/10">
              {[{ mode: 'list', Icon: LayoutList }, { mode: 'card', Icon: LayoutGrid }].map(({ mode, Icon }) => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition"
                  style={viewMode === mode ? { background: ACCENT, color: '#fff' } : { background: 'rgba(255,255,255,0.04)', color: '#475569' }}>
                  <Icon size={13} /><span className="hidden sm:inline capitalize">{mode}</span>
                </button>
              ))}
            </div>
            <button onClick={() => { fetchStats(); fetchPage(page, debouncedQ); }} disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-slate-400 text-sm font-semibold transition disabled:opacity-50 active:scale-95"
              style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}` }}>
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button onClick={exportPDF}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-sm font-semibold transition active:scale-95"
              style={{ background: ACCENT }}>
              <Download size={14} />
              <span className="hidden sm:inline">Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniStat icon={History}    label="Total Records"   value={stats.total}         loading={statsLoading} color={ACCENT}  glow="rgba(59,130,246,0.12)" />
          <MiniStat icon={TrendingUp} label="Total Earnings"  value={stats.totalEarning}  loading={statsLoading} color={EMERALD} glow="rgba(16,185,129,0.12)" />
          <MiniStat icon={Gem}        label="Total Bonus"     value={stats.totalBonus}    loading={statsLoading} color={VIOLET}  glow="rgba(139,92,246,0.12)" />
          <MiniStat icon={Wallet}     label="Total Withdrawn" value={stats.totalWithdraw} loading={statsLoading} color={ROSE}    glow="rgba(244,63,94,0.12)"  />
        </div>

        {/* Search bar */}
        <div className="rounded-2xl px-4 py-3.5 flex flex-wrap items-center gap-3"
          style={{ background: BG2, border: `1px solid ${BORDER}` }}>
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input ref={searchRef} type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by host name or UID…"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}` }} />
            {search && (
              <button onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                <X size={13} />
              </button>
            )}
          </div>
          <span className="text-sm text-slate-500 shrink-0">
            {loading
              ? <span className="flex items-center gap-2"><Loader2 size={12} className="animate-spin text-blue-400" /> Loading…</span>
              : <span className="px-3 py-1.5 rounded-lg font-semibold text-slate-400" style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}` }}>
                  {totalCount.toLocaleString()} records · Page {page}/{totalPages}
                </span>
            }
          </span>
        </div>

        {/* ── LIST VIEW ── */}
        {viewMode === 'list' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1100px]">
                <thead>
                  <tr className="border-b border-white/[0.06]" style={{ background: 'rgba(0,0,0,0.25)' }}>
                    {['#','UID / Obj ID','Name','Username','Email','Agency Name','Owner UID','Board Type','Earning','Duration','Bonus','Withdraw','W.Type','Action'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-white/[0.03]">
                        {Array.from({ length: 14 }).map((_, j) => (
                          <td key={j} className="px-4 py-4">
                            <div className="h-3.5 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)', width: `${40+(j*9)%40}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={14} className="px-5 py-16 text-center">
                      <History size={32} className="mx-auto mb-3 text-slate-700" />
                      <p className="text-sm text-slate-500">No records found{search ? ` for "${search}"` : ''}.</p>
                    </td></tr>
                  ) : rows.map((row, idx) => (
                    <tr key={row.objectId + idx}
                      className="transition-colors border-b border-white/[0.03]"
                      style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}>

                      {/* # */}
                      <td className="px-4 py-3.5 text-xs text-slate-600 font-mono">{(page-1)*PAGE_SIZE+idx+1}</td>

                      {/* UID / Obj ID — copyable */}
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col gap-1">
                          <CopyChip value={row.uid}      copyKey={`uid-${row.objectId}-${idx}`}  copied={copied} copy={copy} />
                          <CopyChip value={row.objectId} copyKey={`oid-${row.objectId}-${idx}`}  copied={copied} copy={copy} />
                        </div>
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={row.name} size={30} />
                          <span className="font-semibold text-slate-200 whitespace-nowrap text-sm">{row.name}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-500 font-mono">{row.username}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 truncate max-w-[130px]">{row.email || '—'}</td>

                      {/* Agency Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={11} className="text-slate-600 shrink-0" />
                          <span className="text-slate-300 text-sm font-medium truncate max-w-[120px]">{row.agencyName}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-500 font-mono">{row.agencyOwnerId}</td>

                      {/* Type */}
                      <td className="px-4 py-3.5"><TypeBadge type={row.type} /></td>

                      {/* Numbers */}
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-bold text-emerald-400 text-sm">{fmt(row.earning)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-400 text-xs whitespace-nowrap">{row.duration} min</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-bold text-violet-400 text-sm flex items-center gap-1 justify-end">
                          <Gem size={11} className="text-violet-500" />{fmt(row.bonus)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-bold text-rose-400 text-sm">{fmt(row.withdrawAmount)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <TypeBadge type={row.withdrawType !== '—' ? row.withdrawType : null} />
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5">
                        <button onClick={() => setDetailRow(row)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 whitespace-nowrap"
                          style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa' }}>
                          <Eye size={11} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!loading && rows.length > 0 && (
              <Pagination page={page} totalPages={totalPages} onChange={setPage} totalCount={totalCount} pageSize={PAGE_SIZE} />
            )}
          </div>
        )}

        {/* ── CARD VIEW ── */}
        {viewMode === 'card' && (
          <div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
                    <div className="flex gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }} />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 rounded" style={{ background: 'rgba(255,255,255,0.07)', width: '70%' }} />
                        <div className="h-2.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', width: '50%' }} />
                      </div>
                    </div>
                    {[80, 60, 90, 70].map((w, j) => <div key={j} className="h-2.5 rounded mb-2.5" style={{ background: 'rgba(255,255,255,0.04)', width: `${w}%` }} />)}
                  </div>
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-20">
                <History size={36} className="mx-auto mb-3 text-slate-700" />
                <p className="text-slate-500 text-sm">No records found{search ? ` for "${search}"` : ''}.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {rows.map((row, idx) => (
                  <div key={row.objectId + idx}
                    className="rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200"
                    style={{ background: BG2, border: `1px solid ${BORDER}` }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.transform = 'translateY(0)'; }}>

                    {/* Header */}
                    <div className="flex items-start gap-3">
                      <Avatar name={row.name} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white text-sm truncate">{row.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5 font-mono">@{row.username}</p>
                        <div className="mt-1.5"><TypeBadge type={row.type} /></div>
                      </div>
                    </div>

                    {/* Copy chips */}
                    <div className="flex flex-wrap gap-1.5">
                      <CopyChip value={row.uid}      copyKey={`cuid-${row.objectId}-${idx}`} copied={copied} copy={copy} />
                      <CopyChip value={row.objectId} copyKey={`coid-${row.objectId}-${idx}`} copied={copied} copy={copy} />
                    </div>

                    {/* Metrics grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Earning',   value: fmt(row.earning),       color: EMERALD },
                        { label: 'Duration',  value: `${row.duration}m`,     color: CYAN    },
                        { label: 'Bonus',     value: fmt(row.bonus),         color: VIOLET  },
                        { label: 'Withdrawn', value: fmt(row.withdrawAmount), color: ROSE    },
                      ].map(m => (
                        <div key={m.label} className="rounded-xl px-3 py-2.5 text-center"
                          style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}` }}>
                          <p className="text-base font-black" style={{ color: m.color }}>{m.value}</p>
                          <p className="text-[9px] text-slate-600 uppercase tracking-wider mt-0.5">{m.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Info rows */}
                    <div className="space-y-1.5 text-xs border-t border-white/[0.05] pt-3">
                      {[
                        { label: 'Agency',      value: row.agencyName },
                        { label: 'Owner UID',   value: row.agencyOwnerId },
                        { label: 'W. Type',     value: row.withdrawType },
                      ].map(r => (
                        <div key={r.label} className="flex justify-between">
                          <span className="text-slate-600">{r.label}</span>
                          <span className="text-slate-400 font-medium truncate max-w-[140px] text-right">{r.value}</span>
                        </div>
                      ))}
                      {row.email && row.email !== '—' && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Email</span>
                          <span className="text-slate-500 truncate max-w-[140px] text-right">{row.email}</span>
                        </div>
                      )}
                    </div>

                    <button onClick={() => setDetailRow(row)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 mt-auto"
                      style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa' }}>
                      <Eye size={13} /> View Details
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!loading && rows.length > 0 && (
              <div className="mt-4 rounded-2xl overflow-hidden" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
                <Pagination page={page} totalPages={totalPages} onChange={setPage} totalCount={totalCount} pageSize={PAGE_SIZE} />
              </div>
            )}
          </div>
        )}

      </div>

      <style>{`
        @keyframes toastIn   { from{opacity:0;transform:translateY(-8px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes overlayIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
};

export default AgencyHistory;