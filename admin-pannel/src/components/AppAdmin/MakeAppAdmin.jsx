import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Parse from '../../parseConfig';
import {
  Search, X, RefreshCw, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Loader2, AlertTriangle,
  Shield, Phone, UserMinus, UserPlus,
  Building2, Hash, Users, Check, ArrowLeft,
  LayoutList, LayoutGrid, Copy, CheckCheck,
  Gem, Eye, FileText, Table, Printer,
  ChevronsUpDown, ChevronUp, ChevronDown, Activity,
  Pencil, Clock, User
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ─────────────────────────────────────────────
   CONSTANTS & HELPERS
───────────────────────────────────────────── */
const PAGE_SIZE = 10;
const fmt    = n          => Number(n  || 0).toLocaleString();
const fmtDur = (d=0,m=0) => `${d}d ${m}m`;

const getInitials = (name = '?') =>
  name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();

const AVATAR_GRADS = [
  ['#3b82f6','#06b6d4'], ['#8b5cf6','#6366f1'], ['#10b981','#14b8a6'],
  ['#f43f5e','#ec4899'], ['#f59e0b','#f97316'], ['#6366f1','#8b5cf6'],
];
const avatarGrad = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADS[Math.abs(h) % AVATAR_GRADS.length];
};

/* ─────────────────────────────────────────────
   HOOKS
───────────────────────────────────────────── */
const useCopy = () => {
  const [copied, setCopied] = useState(null);
  const copy = (text, key) => {
    navigator.clipboard.writeText(String(text)).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    });
  };
  return { copied, copy };
};

/* ─────────────────────────────────────────────
   TINY SHARED COMPONENTS
   (all defined before any component that uses them)
───────────────────────────────────────────── */

/* CopyChip */
const CopyChip = ({ value, copyKey, copied, copy }) => (
  <button
    onClick={e => { e.stopPropagation(); copy(value, copyKey); }}
    className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-semibold transition-all duration-150 active:scale-95 border"
    style={{
      background:   'rgba(255,255,255,0.05)',
      borderColor:  copied === copyKey ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)',
      color:        copied === copyKey ? '#10b981' : '#94a3b8',
    }}>
    {copied === copyKey
      ? <><CheckCheck size={10} className="text-emerald-400"/><span className="text-emerald-400">{value}</span></>
      : <><Copy size={10} className="opacity-40 group-hover:opacity-100"/>{value}</>}
  </button>
);

/* SortIcon */
const SortIcon = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col) return <ChevronsUpDown size={11} className="text-slate-600 ml-1 shrink-0"/>;
  return sortDir === 'asc'
    ? <ChevronUp   size={11} className="text-blue-400 ml-1 shrink-0"/>
    : <ChevronDown size={11} className="text-blue-400 ml-1 shrink-0"/>;
};

/* Avatar */
const Avatar = ({ name, username, avatarUrl, size = 36 }) => {
  const [c1] = avatarGrad(username);
  if (avatarUrl) return (
    <img src={avatarUrl} alt={name} className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size, border: '2px solid rgba(59,130,246,0.3)' }}/>
  );
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 text-white font-bold"
      style={{ width: size, height: size, background: c1, border: '2px solid rgba(255,255,255,0.1)', fontSize: size < 40 ? 11 : 14 }}>
      {getInitials(name)}
    </div>
  );
};

/* DetailRow */
const DetailRow = ({ label, children }) => (
  <div className="flex flex-wrap items-center gap-2">
    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0 w-24">{label}</span>
    <div className="flex-1">{children}</div>
  </div>
);

/* OverlayStatBox */
const OverlayStatBox = ({ label, value, icon: Icon, color, glow }) => (
  <div className="flex-1 rounded-2xl px-5 py-5 flex items-center gap-4"
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: `inset 0 0 40px ${glow}` }}>
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
      style={{ background: glow, border: `1px solid ${color}30` }}>
      <Icon size={20} style={{ color }}/>
    </div>
    <div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-black mt-0.5" style={{ color }}>{value}</p>
    </div>
  </div>
);

/* ExportBtnDark */
const ExportBtnDark = ({ icon: Icon, label, onClick, accent }) => {
  const S = {
    red:   { bg:'rgba(239,68,68,0.12)',  border:'rgba(239,68,68,0.3)',  color:'#f87171' },
    green: { bg:'rgba(34,197,94,0.12)',  border:'rgba(34,197,94,0.3)',  color:'#4ade80' },
    teal:  { bg:'rgba(20,184,166,0.12)', border:'rgba(20,184,166,0.3)', color:'#2dd4bf' },
  };
  const s = S[accent] || { bg:'rgba(255,255,255,0.06)', border:'rgba(255,255,255,0.12)', color:'#94a3b8' };
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
      <Icon size={12}/>{label}
    </button>
  );
};

/* Toast */
const Toast = ({ msg, type, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold border
      ${type === 'error' ? 'bg-red-600 border-red-400/30' : 'bg-emerald-600 border-emerald-400/30'}`}
      style={{ animation: 'toastIn .25s cubic-bezier(.34,1.56,.64,1)' }}>
      {type === 'success' ? <CheckCheck size={14}/> : <AlertTriangle size={14}/>}
      {msg}
    </div>
  );
};

/* ── SIMPLE pagination button — NO icon prop, no dependency ── */
const SimplePgBtn = ({ label, onClick, disabled, active }) => (
  <button onClick={onClick} disabled={disabled}
    className="flex items-center gap-1 px-3 h-8 rounded-lg border border-white/10 bg-white/5 text-xs text-slate-400
      hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition font-medium"
    style={active ? { background:'#3b82f6', color:'#fff', border:'none' } : {}}>
    {label}
  </button>
);

/* ── Main Pagination (used by admin list at bottom) ── */
const Pagination = ({ page, totalPages, onChange, totalCount, pageSize }) => {
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, totalCount);
  const pages = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) pages.push(i);
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-white/5 bg-black/10">
      <p className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-300">{start}–{end}</span> of{' '}
        <span className="font-semibold text-slate-300">{totalCount.toLocaleString()}</span>
      </p>
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <SimplePgBtn label="«" onClick={() => onChange(1)}          disabled={page === 1}/>
        <SimplePgBtn label="‹" onClick={() => onChange(page - 1)}  disabled={page === 1}/>
        {pages[0] > 1 && <span className="text-slate-600 text-xs px-1">…</span>}
        {pages.map(p => (
          <SimplePgBtn key={p} label={String(p)} onClick={() => onChange(p)} active={p === page}/>
        ))}
        {pages[pages.length - 1] < totalPages && <span className="text-slate-600 text-xs px-1">…</span>}
        <SimplePgBtn label="›" onClick={() => onChange(page + 1)}      disabled={page === totalPages}/>
        <SimplePgBtn label="»" onClick={() => onChange(totalPages)}     disabled={page === totalPages}/>
      </div>
    </div>
  );
};

/* ── Inline pagination used INSIDE overlays (no external deps) ── */
const OverlayPager = ({ page, setPage, totalPages, total, pageSize }) => (
  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4"
    style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.1)' }}>
    <p className="text-sm text-slate-500">
      Showing {(page-1)*pageSize+1}–{Math.min(page*pageSize, total)} of {total}
    </p>
    <div className="flex items-center gap-1.5">
      <SimplePgBtn label="Prev" onClick={() => setPage(p => Math.max(1,p-1))}        disabled={page===1}/>
      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
        const p = totalPages<=5 ? i+1 : page<=3 ? i+1 : page>=totalPages-2 ? totalPages-4+i : page-2+i;
        return <SimplePgBtn key={p} label={String(p)} onClick={() => setPage(p)} active={p===page}/>;
      })}
      <SimplePgBtn label="Next" onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}/>
    </div>
  </div>
);

/* Confirm Modal */
const ConfirmModal = ({ title, desc, onConfirm, onCancel, loading, danger }) => (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9000] flex items-center justify-center p-4" onClick={onCancel}>
    <div className="rounded-2xl w-full max-w-sm p-7 text-center" onClick={e => e.stopPropagation()}
      style={{ background:'#111827', border:'1px solid rgba(255,255,255,0.12)', boxShadow:'0 24px 64px rgba(0,0,0,0.6)', animation:'modalIn .2s cubic-bezier(.34,1.56,.64,1)' }}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${danger ? 'bg-red-500/15 border border-red-500/30' : 'bg-blue-500/15 border border-blue-500/30'}`}>
        {danger ? <UserMinus size={22} className="text-red-400"/> : <UserPlus size={22} className="text-blue-400"/>}
      </div>
      <h3 className="text-base font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 mb-6 leading-relaxed">{desc}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-slate-400 hover:bg-white/10 transition">Cancel</button>
        <button onClick={onConfirm} disabled={loading}
          className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition disabled:opacity-60 flex items-center justify-center gap-2 ${danger?'bg-red-600 hover:bg-red-700':'bg-blue-600 hover:bg-blue-700'}`}>
          {loading && <Loader2 size={13} className="animate-spin"/>}
          {loading ? 'Processing…' : 'Confirm'}
        </button>
      </div>
    </div>
  </div>
);

/* WhatsApp Modal */
const WhatsAppModal = ({ user, onConfirm, onCancel, loading }) => {
  const [num, setNum] = useState(user.whatsapp || '');
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9000] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="rounded-2xl w-full max-w-sm p-7 text-center" onClick={e => e.stopPropagation()}
        style={{ background:'#111827', border:'1px solid rgba(255,255,255,0.12)', boxShadow:'0 24px 64px rgba(0,0,0,0.6)', animation:'modalIn .2s cubic-bezier(.34,1.56,.64,1)' }}>
        <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
          <Phone size={22} className="text-emerald-400"/>
        </div>
        <h3 className="text-base font-bold text-white mb-1">Set WhatsApp Number</h3>
        <p className="text-xs text-slate-500 mb-4">@{user.username}</p>
        <input type="tel" autoFocus value={num} onChange={e => setNum(e.target.value)}
          onKeyDown={e => e.key==='Enter' && onConfirm(num)}
          placeholder="+880 17..."
          className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)' }}/>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-slate-400 hover:bg-white/10 transition">Cancel</button>
          <button onClick={() => onConfirm(num)} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <Loader2 size={13} className="animate-spin"/>} Save
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   AGENT DETAIL OVERLAY
   z-index 200 — renders on top of everything
───────────────────────────────────────────── */
const AgentDetailOverlay = ({ agent, members, membersLoading, onClose, showToast }) => {
  const [search,     setSearch]     = useState('');
  const [pageSize,   setPageSize]   = useState(25);
  const [page,       setPage]       = useState(1);
  const [sortCol,    setSortCol]    = useState('createdAt');
  const [sortDir,    setSortDir]    = useState('desc');
  const [editName,   setEditName]   = useState(false);
  const [agencyName, setAgencyName] = useState(agent.get('agency_name') || '');
  const [removing,   setRemoving]   = useState(null);
  const { copied, copy } = useCopy();

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const toggleSort = col => {
    if (sortCol === col) setSortDir(d => d==='asc'?'desc':'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  };

  const totalHosts   = members.length;
  const totalEarning = useMemo(() => {
    const h = members.reduce((s, m) => s + (m.get('host')?.get('diamonds') || 0), 0);
    return h + (agent.get('diamonds') || 0);
  }, [members, agent]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter(m => {
      const h = m.get('host');
      return String(h?.get('uid')||'').includes(q) || (h?.get('name')||'').toLowerCase().includes(q);
    });
  }, [members, search]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const ha = a.get('host'), hb = b.get('host');
    let av, bv;
    if      (sortCol==='uid')      { av=ha?.get('uid')||0;    bv=hb?.get('uid')||0; }
    else if (sortCol==='name')     { av=ha?.get('name')||'';  bv=hb?.get('name')||''; }
    else if (sortCol==='liveDur')  { av=(a.get('livestream_duration_day')||0)*1440+(a.get('livestream_duration_minute')||0); bv=(b.get('livestream_duration_day')||0)*1440+(b.get('livestream_duration_minute')||0); }
    else if (sortCol==='audioDur') { av=(a.get('audio_duration_day')||0)*1440+(a.get('audio_duration_minute')||0); bv=(b.get('audio_duration_day')||0)*1440+(b.get('audio_duration_minute')||0); }
    else if (sortCol==='diamonds') { av=ha?.get('diamonds')||0; bv=hb?.get('diamonds')||0; }
    else if (sortCol==='createdAt'){ av=a.get('createdAt')||0; bv=b.get('createdAt')||0; }
    else return 0;
    if (av<bv) return sortDir==='asc'?-1:1;
    if (av>bv) return sortDir==='asc'?1:-1;
    return 0;
  }), [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated  = sorted.slice((page-1)*pageSize, page*pageSize);

  const saveName = async () => {
    try {
      agent.set('agency_name', agencyName.trim());
      await agent.save(null, { useMasterKey: true });
      showToast('Agency name updated!');
      setEditName(false);
    } catch(e) { showToast('Error: '+e.message,'error'); }
  };

  const doRemoveHost = async (hostId, hostUid) => {
    setRemoving(hostId);
    try {
      const h = await new Parse.Query('_User').get(hostId, { useMasterKey:true });
      h.set('agency_role',''); h.set('my_agent_id','');
      await h.save(null, { useMasterKey:true });
      showToast(`Host #${hostUid} removed!`);
    } catch(e) { showToast('Error: '+e.message,'error'); }
    finally { setRemoving(null); }
  };

  const removeAgency = async () => {
    if (!window.confirm('Remove this agency and unlink all hosts?')) return;
    try {
      agent.set('agency_name',''); agent.set('my_agent_id',''); agent.set('agency_role','');
      await agent.save(null, { useMasterKey:true });
      showToast('Agency removed!'); onClose();
    } catch(e) { showToast('Error: '+e.message,'error'); }
  };

  const exportPDF = () => {
    try {
      const doc = new jsPDF('l','mm','a4');
      doc.setFontSize(16); doc.setFont('helvetica','bold');
      doc.text(`Agency Report: ${agent.get('agency_name')||'—'}`, 14, 16);
      doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(80);
      doc.text(`UID: ${agent.get('uid')}  |  Hosts: ${totalHosts}  |  Total Earning: ${fmt(totalEarning)}  |  ${new Date().toLocaleString()}`, 14, 23);
      autoTable(doc, {
        head:[['Host UID','Host Name','Live Dur','Audio Dur','Diamonds','Created At']],
        body: sorted.map(m=>[
          m.get('host')?.get('uid')||'—', m.get('host')?.get('name')||'—',
          fmtDur(m.get('livestream_duration_day'),m.get('livestream_duration_minute')),
          fmtDur(m.get('audio_duration_day'),m.get('audio_duration_minute')),
          m.get('host')?.get('diamonds')||0, m.get('createdAt')?.toLocaleString()||'—',
        ]),
        startY:28, theme:'striped', headStyles:{fillColor:[59,130,246]}, styles:{fontSize:8.5},
      });
      doc.save(`Agency_${agent.get('uid')}_Report.pdf`);
      showToast('PDF exported!');
    } catch(e) { showToast('PDF failed: '+e.message,'error'); }
  };

  const exportCSV = () => {
    const rows = sorted.map(m=>[
      m.get('host')?.get('uid')||'', `"${m.get('host')?.get('name')||''}"`,
      fmtDur(m.get('livestream_duration_day'),m.get('livestream_duration_minute')),
      fmtDur(m.get('audio_duration_day'),m.get('audio_duration_minute')),
      m.get('host')?.get('diamonds')||0, m.get('createdAt')?.toLocaleString()||'',
    ]);
    const csv = [['Host UID','Host Name','Live Dur','Audio Dur','Diamonds','Created At'],...rows].map(r=>r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
    a.download = `Agency_${agent.get('uid')}_Hosts.csv`; a.click();
    showToast('CSV exported!');
  };

  const agentName  = agent.get('name')       || '—';
  const agentUser  = agent.get('username')   || '—';
  const agentEmail = agent.get('email')      || '—';
  const agentFirst = agent.get('first_name') || '—';
  const agentDiam  = agent.get('diamonds')   || 0;
  const agentUid   = agent.get('uid');
  const agentObjId = agent.id;
  const av = agent.get('avatar');
  let avatarUrl = null;
  if (av && typeof av.url==='function') avatarUrl = av.url();
  else if (av?.url) avatarUrl = av.url;
  const [c1, c2] = avatarGrad(agentUser);

  return (
    <div className="fixed inset-0 lg:left-64 overflow-y-auto" style={{ background:'#0d1525', zIndex:200, animation:'overlayIn .3s cubic-bezier(.22,1,.36,1)' }}>

      {/* Sticky top bar */}
      <div className="sticky top-0 z-20" style={{ background:'rgba(13,21,37,0.92)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-3 flex items-center gap-3">
          <button onClick={onClose}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-slate-300 text-sm font-medium transition active:scale-95 shrink-0"
            style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)' }}>
            <ArrowLeft size={14}/> <span className="hidden sm:inline">Back</span>
          </button>
          <nav className="hidden sm:flex items-center gap-1.5 text-sm text-slate-500 min-w-0">
            <span>Agents</span><span>/</span>
            <span className="text-white font-semibold truncate">{agent.get('agency_name')||agentName}</span>
          </nav>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button onClick={exportPDF}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition active:scale-95"
              style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)', color:'#f87171' }}>
              <FileText size={12}/> PDF
            </button>
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition active:scale-95"
              style={{ background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)', color:'#34d399' }}>
              <Table size={12}/> CSV
            </button>
            <button onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition"
              style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#94a3b8' }}>
              <X size={16}/>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-6 space-y-5">

        {/* Banner */}
        <div className="rounded-2xl p-6 sm:p-8 relative overflow-hidden"
          style={{ background:'linear-gradient(135deg,#1e3a8a 0%,#1e40af 40%,#1d4ed8 100%)', border:'1px solid rgba(59,130,246,0.3)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <button onClick={onClose}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition active:scale-95 shrink-0 self-start group"
              style={{ background:'linear-gradient(135deg,rgba(255,255,255,0.15),rgba(255,255,255,0.08))', border:'1px solid rgba(255,255,255,0.25)' }}>
              <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5"/> Back
            </button>
            {avatarUrl
              ? <img src={avatarUrl} alt={agentName} className="w-20 h-20 rounded-2xl object-cover border-2 border-white/20 shrink-0"/>
              : <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 border-2 border-white/20 text-white shadow-xl"
                  style={{ background:`linear-gradient(135deg,${c1},${c2})` }}>
                  {getInitials(agentName)}
                </div>
            }
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-black text-white truncate">{agentName}</h1>
              <p className="text-blue-200 mt-0.5 text-sm">@{agentUser} · UID <span className="font-bold text-white">#{agentUid}</span></p>
              {agentEmail !== '—' && <p className="text-blue-100/80 text-xs mt-1">{agentEmail}</p>}
            </div>
            <div className="shrink-0 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-white"
                style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)' }}>
                <Building2 size={13}/> {agent.get('agency_name')||'No Agency Name'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-emerald-200"
                style={{ background:'rgba(16,185,129,0.2)', border:'1px solid rgba(16,185,129,0.3)' }}>
                <Gem size={13}/> {fmt(agentDiam)} Diamonds
              </span>
            </div>
          </div>
        </div>

        {/* Info + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Agent Info Card */}
          <div className="lg:col-span-2 rounded-2xl overflow-hidden"
            style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2.5 px-6 py-4" style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background:'rgba(59,130,246,0.2)' }}>
                <User size={14} className="text-blue-400"/>
              </div>
              <h2 className="font-bold text-blue-400 text-sm tracking-wide uppercase">Agent Info</h2>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
                <div className="space-y-3.5">
                  <DetailRow label="Object ID"><CopyChip value={agentObjId} copyKey={`objid-${agentObjId}`} copied={copied} copy={copy}/></DetailRow>
                  <DetailRow label="UID"><CopyChip value={agentUid} copyKey={`uid-${agentUid}`} copied={copied} copy={copy}/></DetailRow>
                  <DetailRow label="Username"><span className="text-slate-300 text-sm">@{agentUser}</span></DetailRow>
                  <DetailRow label="Email"><span className="text-slate-300 text-sm truncate">{agentEmail}</span></DetailRow>
                </div>
                <div className="space-y-3.5">
                  <DetailRow label="Agency Name">
                    {editName ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <input autoFocus value={agencyName} onChange={e=>setAgencyName(e.target.value)}
                          onKeyDown={e=>{ if(e.key==='Enter')saveName(); if(e.key==='Escape')setEditName(false); }}
                          className="px-3 py-1 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
                          style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(59,130,246,0.5)' }}/>
                        <button onClick={saveName} className="p-1.5 rounded-lg" style={{ background:'rgba(16,185,129,0.2)',color:'#34d399' }}><Check size={12}/></button>
                        <button onClick={()=>{setEditName(false);setAgencyName(agent.get('agency_name')||'');}}
                          className="p-1.5 rounded-lg" style={{ background:'rgba(255,255,255,0.06)',color:'#94a3b8' }}><X size={12}/></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300 text-sm">{agent.get('agency_name')||'—'}</span>
                        <button onClick={()=>setEditName(true)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                          style={{ background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.3)',color:'#60a5fa' }}>
                          <Pencil size={9}/> Edit
                        </button>
                      </div>
                    )}
                  </DetailRow>
                  <DetailRow label="First Name"><span className="text-slate-300 text-sm">{agentFirst}</span></DetailRow>
                  <DetailRow label="Diamonds"><span className="text-emerald-400 font-bold text-sm">{fmt(agentDiam)}</span></DetailRow>
                </div>
              </div>
              <div className="mt-5 pt-4" style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={removeAgency}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition active:scale-95"
                  style={{ background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.3)',color:'#f87171' }}>
                  <X size={14}/> Remove Agency
                </button>
              </div>
            </div>
          </div>

          {/* Stat boxes */}
          <div className="flex flex-col gap-4">
            <OverlayStatBox label="Total Hosts"    value={totalHosts}        icon={Users} color="#10b981" glow="rgba(16,185,129,0.15)"/>
            <OverlayStatBox label="Agency Earning" value={fmt(totalEarning)} icon={Gem}   color="#06b6d4" glow="rgba(6,182,212,0.15)"/>
          </div>
        </div>

        {/* Hosts History Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>

          {/* Table header */}
          <div className="flex items-center gap-2.5 px-6 py-4" style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background:'rgba(6,182,212,0.2)' }}>
              <Clock size={14} className="text-cyan-400"/>
            </div>
            <h2 className="font-bold text-cyan-400 text-sm tracking-wide uppercase">Hosts History</h2>
            <span className="ml-auto text-xs text-slate-500 font-mono">{sorted.length} records</span>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-3.5"
            style={{ borderBottom:'1px solid rgba(255,255,255,0.05)', background:'rgba(0,0,0,0.15)' }}>
            <div className="flex items-center gap-2 flex-wrap">
              <ExportBtnDark icon={Printer}  label="Print" onClick={()=>window.print()}/>
              <ExportBtnDark icon={FileText} label="PDF"   onClick={exportPDF} accent="red"/>
              <ExportBtnDark icon={Table}    label="CSV"   onClick={exportCSV} accent="teal"/>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>Show</span>
                <select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}}
                  className="px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-lg"
                  style={{ background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)' }}>
                  {[10,25,50,100].map(n=><option key={n} value={n} style={{background:'#0d1525'}}>{n}</option>)}
                </select>
                <span>entries</span>
              </div>
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}
                  placeholder="Search hosts…"
                  className="pl-8 pr-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-lg w-44"
                  style={{ background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)' }}/>
              </div>
            </div>
          </div>

          {/* Table body */}
          {membersLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"/>
              <p className="text-sm text-slate-500">Loading hosts…</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[820px]">
                <thead>
                  <tr style={{ background:'rgba(0,0,0,0.2)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                    {[
                      {label:'Host UID',      col:'uid'},
                      {label:'Object ID',      col:null},
                      {label:'Host Name',      col:'name'},
                      {label:'Live Duration',  col:'liveDur'},
                      {label:'Audio Duration', col:'audioDur'},
                      {label:'Diamonds',       col:'diamonds'},
                      {label:'Created At',     col:'createdAt'},
                      {label:'Action',         col:null},
                    ].map(({label,col})=>(
                      <th key={label} onClick={()=>col&&toggleSort(col)}
                        className={`px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap select-none ${col?'cursor-pointer hover:text-slate-200 transition':''}`}>
                        <div className="flex items-center">{label}{col&&<SortIcon col={col} sortCol={sortCol} sortDir={sortDir}/>}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length===0 ? (
                    <tr><td colSpan={8} className="px-5 py-16 text-center text-slate-500 text-sm">
                      {search?`No hosts match "${search}"` : 'No host history found.'}
                    </td></tr>
                  ) : paginated.map((m,i)=>{
                    const h   = m.get('host');
                    const hId = h?.id;
                    const hUid= h?.get('uid');
                    const hNm = h?.get('name')||'N/A';
                    const hDm = h?.get('diamonds')||0;
                    const lD  = m.get('livestream_duration_day')||0;
                    const lM  = m.get('livestream_duration_minute')||0;
                    const aD  = m.get('audio_duration_day')||0;
                    const aM  = m.get('audio_duration_minute')||0;
                    const ca  = m.get('createdAt');
                    return (
                      <tr key={m.id} className="transition-colors"
                        style={{ borderBottom:'1px solid rgba(255,255,255,0.04)', background:i%2===0?'transparent':'rgba(255,255,255,0.015)' }}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(59,130,246,0.07)'}
                        onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'transparent':'rgba(255,255,255,0.015)'}>
                        <td className="px-4 py-3.5"><CopyChip value={hUid} copyKey={`huid-${hUid}`} copied={copied} copy={copy}/></td>
                        <td className="px-4 py-3.5"><CopyChip value={hId||'—'} copyKey={`hobj-${hId}`} copied={copied} copy={copy}/></td>
                        <td className="px-4 py-3.5 font-medium text-slate-200">{hNm}</td>
                        <td className="px-4 py-3.5 text-slate-400 text-xs">{fmtDur(lD,lM)}</td>
                        <td className="px-4 py-3.5 text-slate-400 text-xs">{fmtDur(aD,aM)}</td>
                        <td className="px-4 py-3.5"><span className="font-bold text-emerald-400 text-sm">{fmt(hDm)}</span></td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                          {ca ? ca.toLocaleString('en-GB',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).replace(',',' ') : '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <button onClick={()=>doRemoveHost(hId,hUid)} disabled={removing===hId}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 disabled:opacity-50 whitespace-nowrap"
                            style={{ background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.3)',color:'#fbbf24' }}>
                            {removing===hId
                              ? <div className="w-3 h-3 border border-amber-400/40 border-t-amber-400 rounded-full animate-spin"/>
                              : <X size={11}/>}
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Overlay pagination — uses OverlayPager, no external PgBtn */}
          {!membersLoading && sorted.length > 0 && (
            <OverlayPager page={page} setPage={setPage} totalPages={totalPages} total={sorted.length} pageSize={pageSize}/>
          )}
        </div>

        <div className="flex justify-center pb-6">
          <button onClick={onClose}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium transition"
            style={{ background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'#94a3b8' }}>
            <ArrowLeft size={14}/> Back
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   AGENTS TABLE  (shared by both overlays below)
───────────────────────────────────────────── */
const AgentsTable = ({ agencies, agLoading, exportPDF, exportCSV, onViewAgent }) => {
  const [search,   setSearch]   = useState('');
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortCol,  setSortCol]  = useState('name');
  const [sortDir,  setSortDir]  = useState('asc');
  const { copied, copy } = useCopy();

  const toggleSort = col => {
    if (sortCol===col) setSortDir(d=>d==='asc'?'desc':'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  };

  const filtered = useMemo(()=>{
    const q = search.toLowerCase();
    return agencies.filter(a=>
      a.name.toLowerCase().includes(q)||a.uid.includes(q)||
      a.agencyName.toLowerCase().includes(q)||a.username.toLowerCase().includes(q)
    );
  },[agencies,search]);

  const sorted = useMemo(()=>[...filtered].sort((a,b)=>{
    let av,bv;
    if      (sortCol==='uid')        {av=Number(a.uid)||0;    bv=Number(b.uid)||0;}
    else if (sortCol==='name')       {av=a.name;              bv=b.name;}
    else if (sortCol==='agencyName') {av=a.agencyName;        bv=b.agencyName;}
    else if (sortCol==='diamonds')   {av=a.diamonds;          bv=b.diamonds;}
    else if (sortCol==='createdAt')  {av=a.createdAt||0;      bv=b.createdAt||0;}
    else return 0;
    if(av<bv)return sortDir==='asc'?-1:1;
    if(av>bv)return sortDir==='asc'?1:-1;
    return 0;
  }),[filtered,sortCol,sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length/pageSize));
  const paginated  = sorted.slice((page-1)*pageSize, page*pageSize);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06]">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-cyan-500/15">
          <Building2 size={14} className="text-cyan-400"/>
        </div>
        <h2 className="text-cyan-400 text-sm font-bold uppercase tracking-widest">Agents</h2>
        <span className="ml-auto text-xs text-slate-600 font-mono">{sorted.length} records</span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-white/[0.04]" style={{background:'rgba(0,0,0,0.15)'}}>
        <div className="flex gap-2 flex-wrap">
          <ExportBtnDark icon={Printer}  label="Print" onClick={()=>window.print()} />
          <ExportBtnDark icon={FileText} label="PDF"   onClick={exportPDF} accent="red"/>
          <ExportBtnDark icon={Table}    label="CSV"   onClick={exportCSV} accent="green"/>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Show</span>
            <select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}}
              className="px-2 py-1 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)'}}>
              {[10,25,50,100].map(n=><option key={n} value={n} style={{background:'#0d1525'}}>{n}</option>)}
            </select>
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}
              placeholder="Search agents…"
              className="pl-8 pr-3 py-1.5 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
              style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)'}}/>
          </div>
        </div>
      </div>

      {/* Table */}
      {agLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"/>
          <p className="text-sm text-slate-500">Loading agents…</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="border-b border-white/[0.06]" style={{background:'rgba(0,0,0,0.2)'}}>
                {[
                  {label:'#',           col:null},
                  {label:'Agent',       col:'name'},
                  {label:'UID / Obj ID',col:'uid'},
                  {label:'Agency Name', col:'agencyName'},
                  {label:'Email',       col:null},
                  {label:'Diamonds',    col:'diamonds'},
                  {label:'Joined',      col:'createdAt'},
                  {label:'Action',      col:null},
                ].map(({label,col})=>(
                  <th key={label} onClick={()=>col&&toggleSort(col)}
                    className={`px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap select-none ${col?'cursor-pointer hover:text-slate-300 transition':''}`}>
                    <div className="flex items-center">{label}{col&&<SortIcon col={col} sortCol={sortCol} sortDir={sortDir}/>}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length===0 ? (
                <tr><td colSpan={8} className="px-5 py-16 text-center text-slate-500 text-sm">
                  {search?`No agents match "${search}"` : 'No agents found.'}
                </td></tr>
              ) : paginated.map((ag,i)=>(
                <tr key={ag.id} className="transition-colors"
                  style={{borderBottom:'1px solid rgba(255,255,255,0.03)',background:i%2===0?'transparent':'rgba(255,255,255,0.01)'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(59,130,246,0.06)'}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'transparent':'rgba(255,255,255,0.01)'}>
                  <td className="px-4 py-3.5 text-xs text-slate-600 font-mono">{(page-1)*pageSize+i+1}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={ag.name} username={ag.username} avatarUrl={ag.avatarUrl} size={32}/>
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{ag.name}</p>
                        <p className="text-xs text-slate-500">@{ag.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5" onClick={e=>e.stopPropagation()}>
                    <div className="flex flex-col gap-1">
                      <CopyChip value={ag.uid} copyKey={`auid-${ag.id}-${i}`} copied={copied} copy={copy}/>
                      <CopyChip value={ag.id}  copyKey={`aoid-${ag.id}-${i}`} copied={copied} copy={copy}/>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Building2 size={11} className="text-slate-600 shrink-0"/>
                      <span className="text-sm text-slate-300 font-medium truncate max-w-[140px]">{ag.agencyName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500 truncate max-w-[150px]">{ag.email}</td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                      <Gem size={11} className="text-emerald-500"/>{fmt(ag.diamonds)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                    {ag.createdAt?.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})||'—'}
                  </td>
                  <td className="px-4 py-3.5" onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>onViewAgent&&onViewAgent(ag.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95"
                      style={{background:'linear-gradient(135deg,#3b82f6,#2563eb)',color:'#fff',boxShadow:'0 2px 10px rgba(59,130,246,0.3)'}}>
                      <Eye size={12}/> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!agLoading && sorted.length>0 && (
        <OverlayPager page={page} setPage={setPage} totalPages={totalPages} total={sorted.length} pageSize={pageSize}/>
      )}
    </div>
  );
};

/* ── fetch agencies helper ── */
const fetchAgencies = async (adminObjectId) => {
  const q = new Parse.Query('_User');
  q.equalTo('admin_id', adminObjectId);
  q.equalTo('agency_role', 'agent');
  q.select(['uid','name','username','agency_name','agency_role','diamonds','avatar','email','first_name','createdAt']);
  q.limit(2500);
  const res = await q.find({ useMasterKey:true });
  return res.map(a=>{
    const av = a.get('avatar');
    let avatarUrl = null;
    if (av && typeof av.url==='function') avatarUrl = av.url();
    else if (av?.url) avatarUrl = av.url;
    return {
      id: a.id, uid: String(a.get('uid')||'—'),
      name: a.get('name')||'—', username: a.get('username')||'—',
      agencyName: a.get('agency_name')||'—', diamonds: a.get('diamonds')||0,
      email: a.get('email')||'—', createdAt: a.get('createdAt'), avatarUrl,
    };
  });
};

/* ── Shared overlay top bar ── */
const OverlayTopBar = ({ onClose, backLabel, breadcrumb, onPDF, onCSV }) => (
  <div className="sticky top-0 z-20 border-b border-white/[0.06]"
    style={{background:'rgba(13,21,37,0.95)',backdropFilter:'blur(20px)'}}>
    <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-3 flex items-center gap-3 flex-wrap">
      <button onClick={onClose}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-blue-300 text-sm font-bold transition active:scale-95 shrink-0"
        style={{background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.35)'}}>
        <ArrowLeft size={14}/> {backLabel}
      </button>
      <nav className="hidden sm:flex items-center gap-1.5 text-sm text-slate-500 min-w-0">{breadcrumb}</nav>
      <div className="ml-auto flex gap-2 shrink-0">
        <button onClick={onPDF} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition active:scale-95"
          style={{background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.25)',color:'#f87171'}}>
          <FileText size={12}/> PDF
        </button>
        <button onClick={onCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition active:scale-95"
          style={{background:'rgba(16,185,129,0.12)',border:'1px solid rgba(16,185,129,0.25)',color:'#34d399'}}>
          <Table size={12}/> CSV
        </button>
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl transition text-slate-500 hover:text-white"
          style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)'}}>
          <X size={15}/>
        </button>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   AGENTS OVERLAY  (z-50)
───────────────────────────────────────────── */
const AgentsOverlay = ({ admin, onClose, showToast, openAgentDetail }) => {
  const [agencies, setAgencies] = useState([]);
  const [agLoading, setAgLoading] = useState(true);

  useEffect(()=>{ document.body.style.overflow='hidden'; return()=>{ document.body.style.overflow=''; }; },[]);
  useEffect(()=>{ const fn=e=>{if(e.key==='Escape')onClose();}; window.addEventListener('keydown',fn); return()=>window.removeEventListener('keydown',fn); },[onClose]);
  useEffect(()=>{
    fetchAgencies(admin.objectId).then(setAgencies).catch(e=>showToast(e.message,'error')).finally(()=>setAgLoading(false));
  },[admin.objectId]);

  const totalDiamonds = useMemo(()=>agencies.reduce((s,a)=>s+a.diamonds,0),[agencies]);

  const doExportPDF = () => {
    try {
      const doc = new jsPDF('l','mm','a4');
      doc.setFontSize(15); doc.setFont('helvetica','bold');
      doc.text(`Agents of Admin: ${admin.name}`, 14, 16);
      doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(80);
      doc.text(`UID: ${admin.uid} | @${admin.username} | ${new Date().toLocaleString()}`, 14, 24);
      autoTable(doc,{
        head:[['Name','UID','Object ID','Agency','Diamonds','Joined']],
        body: agencies.map(a=>[a.name,a.uid,a.id,a.agencyName,fmt(a.diamonds),a.createdAt?.toLocaleDateString('en-GB')||'—']),
        startY:30,theme:'striped',headStyles:{fillColor:[59,130,246]},styles:{fontSize:8},
      });
      doc.save(`Admin_${admin.uid}_Agents.pdf`);
      showToast('PDF exported!');
    } catch(e){ showToast('PDF failed: '+e.message,'error'); }
  };
  const doExportCSV = () => {
    const rows = agencies.map(a=>[`"${a.name}"`,a.uid,a.id,`"${a.agencyName}"`,a.diamonds,a.createdAt?.toLocaleDateString('en-GB')||'']);
    const csv = [['Name','UID','Object ID','Agency','Diamonds','Joined'],...rows].map(r=>r.join(',')).join('\n');
    const el = document.createElement('a');
    el.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
    el.download=`Admin_${admin.uid}_Agents.csv`; el.click();
    showToast('CSV exported!');
  };

  return (
    <div className="fixed inset-0 lg:left-64 z-50 overflow-y-auto" style={{background:'#0d1525',animation:'overlayIn .3s cubic-bezier(.22,1,.36,1)'}}>
      <OverlayTopBar onClose={onClose} backLabel="Back to Admins"
        breadcrumb={<><span>Admins</span><span>/</span><span className="text-white font-semibold">{admin.name}</span><span>/</span><span className="text-slate-400">All Agents</span></>}
        onPDF={doExportPDF} onCSV={doExportCSV}/>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-6 space-y-5">
        <div className="rounded-2xl p-5 flex flex-wrap items-center gap-4"
          style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
          <button onClick={onClose} className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-blue-300 text-sm font-bold transition active:scale-95 shrink-0"
            style={{background:'rgba(59,130,246,0.12)',border:'1px solid rgba(59,130,246,0.3)'}}>
            <ArrowLeft size={13}/> Back
          </button>
          <Avatar name={admin.name} username={admin.username} avatarUrl={admin.avatarUrl} size={52}/>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-white">{admin.name}</h1>
            <p className="text-slate-500 text-sm">@{admin.username}</p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            {[{label:'Total Agents',value:agencies.length,color:'#10b981'},{label:'Total Diamonds',value:fmt(totalDiamonds),color:'#06b6d4'}].map(s=>(
              <div key={s.label} className="px-4 py-3 rounded-xl text-center" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}>
                <p className="text-xl font-black" style={{color:s.color}}>{s.value}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <AgentsTable agencies={agencies} agLoading={agLoading} exportPDF={doExportPDF} exportCSV={doExportCSV} onViewAgent={openAgentDetail}/>
        <div className="flex justify-center pb-6">
          <button onClick={onClose} className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-slate-400 hover:text-white transition"
            style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}>
            <ArrowLeft size={14}/> Back to Admins
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   ADMIN DETAIL OVERLAY  (z-50)
───────────────────────────────────────────── */
const AdminDetailOverlay = ({ admin, onClose, showToast, openAgentDetail }) => {
  const [agencies, setAgencies] = useState([]);
  const [agLoading, setAgLoading] = useState(true);
  const { copied, copy } = useCopy();

  useEffect(()=>{ document.body.style.overflow='hidden'; return()=>{ document.body.style.overflow=''; }; },[]);
  useEffect(()=>{ const fn=e=>{if(e.key==='Escape')onClose();}; window.addEventListener('keydown',fn); return()=>window.removeEventListener('keydown',fn); },[onClose]);
  useEffect(()=>{
    fetchAgencies(admin.objectId).then(setAgencies).catch(e=>showToast(e.message,'error')).finally(()=>setAgLoading(false));
  },[admin.objectId]);

  const totalDiamonds = useMemo(()=>agencies.reduce((s,a)=>s+a.diamonds,0),[agencies]);

  const doExportPDF = () => {
    try {
      const doc = new jsPDF('l','mm','a4');
      doc.setFontSize(15); doc.setFont('helvetica','bold');
      doc.text(`Admin Report: ${admin.name}`, 14, 16);
      doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(80);
      doc.text(`UID: ${admin.uid} | Agents: ${agencies.length} | ${new Date().toLocaleString()}`, 14, 24);
      autoTable(doc,{
        head:[['Agent Name','UID','Object ID','Agency Name','Diamonds','Joined']],
        body: agencies.map(a=>[a.name,a.uid,a.id,a.agencyName,fmt(a.diamonds),a.createdAt?.toLocaleDateString('en-GB')||'—']),
        startY:30,theme:'striped',headStyles:{fillColor:[59,130,246]},styles:{fontSize:8},
      });
      doc.save(`Admin_${admin.uid}_Report.pdf`);
      showToast('PDF exported!');
    } catch(e){ showToast('PDF failed: '+e.message,'error'); }
  };
  const doExportCSV = () => {
    const rows = agencies.map(a=>[`"${a.name}"`,a.uid,a.id,`"${a.agencyName}"`,a.diamonds,a.createdAt?.toLocaleDateString('en-GB')||'']);
    const csv = [['Agent Name','UID','Object ID','Agency Name','Diamonds','Joined'],...rows].map(r=>r.join(',')).join('\n');
    const el = document.createElement('a');
    el.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
    el.download=`Admin_${admin.uid}_Report.csv`; el.click();
    showToast('CSV exported!');
  };

  return (
    <div className="fixed inset-0 lg:left-64 z-50 overflow-y-auto" style={{background:'#0d1525',animation:'overlayIn .3s cubic-bezier(.22,1,.36,1)'}}>
      <OverlayTopBar onClose={onClose} backLabel="Back to Admins"
        breadcrumb={<><span>Admins</span><span>/</span><span className="text-white font-semibold">{admin.name}</span></>}
        onPDF={doExportPDF} onCSV={doExportCSV}/>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-6 space-y-5">
        {/* Banner */}
        <div className="rounded-2xl p-6 sm:p-8 flex flex-wrap items-center gap-5"
          style={{background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.22)'}}>
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-blue-300 text-sm font-bold transition active:scale-95 shrink-0 self-start"
              style={{background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.3)'}}>
              <ArrowLeft size={13}/> Back
            </button>
            <Avatar name={admin.name} username={admin.username} avatarUrl={admin.avatarUrl} size={72}/>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-white">{admin.name}</h1>
            <p className="text-slate-400 mt-0.5 text-sm">@{admin.username}</p>
            {admin.whatsapp && <p className="text-slate-500 text-xs mt-1">{admin.whatsapp}</p>}
            <div className="flex flex-wrap gap-2 mt-3">
              <CopyChip value={admin.uid}      copyKey={`duid-${admin.objectId}`} copied={copied} copy={copy}/>
              <CopyChip value={admin.objectId} copyKey={`doid-${admin.objectId}`} copied={copied} copy={copy}/>
              {admin.isAdmin && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-blue-300"
                  style={{background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.3)'}}>
                  <Shield size={9}/> Admin
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            {[{label:'Total Agents',value:agencies.length,color:'#10b981'},{label:'Total Diamonds',value:fmt(totalDiamonds),color:'#06b6d4'}].map(s=>(
              <div key={s.label} className="px-5 py-4 rounded-xl text-center"
                style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}>
                <p className="text-3xl font-black" style={{color:s.color}}>{s.value}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[{label:'Gender',value:admin.gender||'—'},{label:'WhatsApp',value:admin.whatsapp||'—'},{label:'Admin Role',value:admin.adminRole||'admin'}].map(s=>(
            <div key={s.label} className="rounded-xl px-5 py-4" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">{s.label}</p>
              <p className="text-slate-200 font-semibold text-sm">{s.value}</p>
            </div>
          ))}
        </div>
        <AgentsTable agencies={agencies} agLoading={agLoading} exportPDF={doExportPDF} exportCSV={doExportCSV} onViewAgent={openAgentDetail}/>
        <div className="flex justify-center pb-6">
          <button onClick={onClose} className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-slate-400 hover:text-white transition"
            style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}>
            <ArrowLeft size={14}/> Back to Admins
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
export default function AdminManagement() {
  const [admins,       setAdmins]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [actionLoading,setActionLoading]= useState(null);
  const [page,         setPage]         = useState(1);
  const [totalCount,   setTotalCount]   = useState(0);
  const [searchInput,  setSearchInput]  = useState('');
  const [searchTerm,   setSearchTerm]   = useState('');
  const [statCounts,   setStatCounts]   = useState({ total:0 });
  const [toast,        setToast]        = useState(null);
  const [viewMode,     setViewMode]     = useState('list');

  const [detailAdmin,  setDetailAdmin]  = useState(null);
  const [agentsAdmin,  setAgentsAdmin]  = useState(null);

  /* Agent detail */
  const [viewAgent,        setViewAgent]        = useState(null);
  const [viewAgentMembers, setViewAgentMembers] = useState([]);
  const [viewAgentLoading, setViewAgentLoading] = useState(false);

  const [toggleModal,  setToggleModal]  = useState(null);
  const [waModal,      setWaModal]      = useState(null);
  const [agentCounts,  setAgentCounts]  = useState({});
  const [countsLoading,setCountsLoading]= useState(false);

  const searchRef = useRef();
  const { copied, copy } = useCopy();

  const showToast = useCallback((msg,type='success')=>{
    setToast({msg,type});
    setTimeout(()=>setToast(null),3000);
  },[]);

  const mapAdmin = u => {
    const av = u.get('avatar');
    let avatarUrl = null;
    if (av && typeof av.url==='function') avatarUrl=av.url();
    else if (av?.url) avatarUrl=av.url;
    else if (typeof av==='string') avatarUrl=av;
    return {
      objectId: u.id, uid: String(u.get('uid')||u.id),
      name:      u.get('name')||'—', username: u.get('username')||'anonymous',
      gender:    u.get('gender')||'—', whatsapp: u.get('whatsapp_number')||'',
      adminRole: u.get('admin_role')||'', isAdmin: u.get('admin_role')==='admin', avatarUrl,
    };
  };

  const fetchCounts = async ids => {
    if (!ids.length) return;
    setCountsLoading(true);
    try {
      const counts = {};
      await Promise.all(ids.map(async id=>{
        const q = new Parse.Query('_User');
        q.equalTo('admin_id',id); q.equalTo('agency_role','agent');
        counts[id] = await q.count({useMasterKey:true});
      }));
      setAgentCounts(prev=>({...prev,...counts}));
    } catch(e){ console.error(e); }
    finally { setCountsLoading(false); }
  };

  const doFetchPage = useCallback(async(pg,q)=>{
    setLoading(true);
    try {
      const buildQ = () => {
        const qry = new Parse.Query('_User');
        qry.equalTo('admin_role','admin');
        qry.select(['uid','name','username','gender','avatar','admin_role','whatsapp_number']);
        if (q.trim()) {
          const n = parseInt(q.trim());
          if (!isNaN(n)) qry.equalTo('uid',n); else qry.matches('name',q.trim(),'i');
        }
        return qry;
      };
      const dq=buildQ(), cq=buildQ();
      dq.descending('createdAt'); dq.limit(PAGE_SIZE); dq.skip((pg-1)*PAGE_SIZE);
      const [results,count] = await Promise.all([dq.find({useMasterKey:true}),cq.count({useMasterKey:true})]);
      const mapped = results.map(mapAdmin);
      setAdmins(mapped); setTotalCount(count);
      fetchCounts(mapped.map(a=>a.objectId));
    } catch(e){ showToast('Fetch failed: '+e.message,'error'); }
    finally { setLoading(false); }
  },[showToast]);

  const fetchStats = useCallback(async()=>{
    try {
      const q = new Parse.Query('_User');
      q.equalTo('admin_role','admin');
      setStatCounts({total: await q.count({useMasterKey:true})});
    } catch(e){ console.error(e); }
  },[]);

  useEffect(()=>{ fetchStats(); doFetchPage(1,''); },[]);
  useEffect(()=>{ doFetchPage(page,searchTerm); },[page,searchTerm]);

  const totalPages = Math.max(1, Math.ceil(totalCount/PAGE_SIZE));

  /* Open agent detail overlay */
  const openAgentDetail = useCallback(async agentObjectId=>{
    setViewAgentMembers([]);
    setViewAgentLoading(true);
    try {
      const agent = await new Parse.Query('_User').get(agentObjectId,{useMasterKey:true});
      const mq = new Parse.Query('AgencyMember');
      mq.equalTo('agent',agent); mq.include('host');
      mq.descending('createdAt'); mq.limit(2500);
      const members = await mq.find({useMasterKey:true});
      setViewAgent(agent);
      setViewAgentMembers(members);
    } catch(e){
      showToast('Failed to load agent: '+e.message,'error');
    } finally {
      setViewAgentLoading(false);
    }
  },[showToast]);

  const closeAgentDetail = useCallback(()=>{
    setViewAgent(null); setViewAgentMembers([]);
  },[]);

  const confirmToggle = async () => {
    const admin = toggleModal; setToggleModal(null); setActionLoading(admin.objectId);
    try {
      const obj = await new Parse.Query('_User').get(admin.objectId,{useMasterKey:true});
      obj.set('admin_role', admin.isAdmin?'':'admin');
      await obj.save(null,{useMasterKey:true});
      if (admin.isAdmin) {
        const aq = new Parse.Query('AgentRole');
        aq.equalTo('admin_id',admin.objectId);
        const found = await aq.first({useMasterKey:true});
        if (found) await found.destroy({useMasterKey:true});
      } else {
        const rec = new (Parse.Object.extend('AgentRole'))();
        rec.set('admin_id',admin.objectId); rec.set('admin_by_id','admin');
        rec.set('total_points',0); rec.set('points',0); rec.set('total_agent',0);
        rec.setArray('agents_list',[]);
        await rec.save(null,{useMasterKey:true});
      }
      showToast(admin.isAdmin?`@${admin.username} removed from admins`:`@${admin.username} is now Admin ✓`);
      doFetchPage(page,searchTerm); fetchStats();
    } catch(e){ showToast('Failed: '+e.message,'error'); }
    finally { setActionLoading(null); }
  };

  const confirmWA = async num=>{
    const admin=waModal; setWaModal(null); setActionLoading(admin.objectId);
    try {
      const obj = await new Parse.Query('_User').get(admin.objectId,{useMasterKey:true});
      obj.set('whatsapp_number',num);
      await obj.save(null,{useMasterKey:true});
      setAdmins(list=>list.map(a=>a.objectId===admin.objectId?{...a,whatsapp:num}:a));
      showToast('WhatsApp updated!');
    } catch(e){ showToast('Failed: '+e.message,'error'); }
    finally { setActionLoading(null); }
  };

  const ActionBtns = ({ admin }) => {
    const il = actionLoading===admin.objectId;
    return (
      <div className="flex flex-wrap gap-1.5 items-center">
        <button onClick={e=>{e.stopPropagation();setAgentsAdmin(admin);}} disabled={il}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition active:scale-95 disabled:opacity-50 whitespace-nowrap"
          style={{background:'rgba(6,182,212,0.12)',border:'1px solid rgba(6,182,212,0.3)',color:'#22d3ee'}}>
          <Building2 size={10}/> All Agents
          {agentCounts[admin.objectId]!==undefined && (
            <span className="ml-0.5 px-1.5 rounded-full text-[9px] font-black" style={{background:'rgba(6,182,212,0.25)',color:'#67e8f9'}}>
              {agentCounts[admin.objectId]}
            </span>
          )}
          {countsLoading&&agentCounts[admin.objectId]===undefined&&<Loader2 size={9} className="animate-spin"/>}
        </button>
        <button onClick={e=>{e.stopPropagation();setWaModal(admin);}} disabled={il}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition active:scale-95 disabled:opacity-50"
          style={{background:'rgba(16,185,129,0.12)',border:'1px solid rgba(16,185,129,0.25)',color:'#34d399'}}>
          <Phone size={10}/> WA
        </button>
        <button onClick={e=>{e.stopPropagation();setToggleModal(admin);}} disabled={il}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition active:scale-95 disabled:opacity-50 ${admin.isAdmin?'text-red-400':'text-blue-400'}`}
          style={{background:admin.isAdmin?'rgba(239,68,68,0.12)':'rgba(59,130,246,0.12)',border:`1px solid ${admin.isAdmin?'rgba(239,68,68,0.25)':'rgba(59,130,246,0.25)'}`}}>
          {admin.isAdmin?<><UserMinus size={10}/> Remove</>:<><UserPlus size={10}/> Make Admin</>}
        </button>
        {il&&<Loader2 size={12} className="animate-spin text-blue-400"/>}
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{background:'#0d1525',fontFamily:"'Inter',-apple-system,sans-serif"}}>

      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}

      {toggleModal&&<ConfirmModal
        title={toggleModal.isAdmin?'Remove Admin':'Make Admin'}
        desc={toggleModal.isAdmin?`Remove @${toggleModal.username} from admin role?`:`Grant admin role to @${toggleModal.username}?`}
        danger={toggleModal.isAdmin} onConfirm={confirmToggle} onCancel={()=>setToggleModal(null)}
        loading={actionLoading===toggleModal?.objectId}/>}

      {waModal&&<WhatsAppModal user={waModal} onConfirm={confirmWA} onCancel={()=>setWaModal(null)} loading={actionLoading===waModal?.objectId}/>}

      {/* Admin detail overlay — z-50 */}
      {detailAdmin&&<AdminDetailOverlay admin={detailAdmin} onClose={()=>setDetailAdmin(null)} showToast={showToast} openAgentDetail={openAgentDetail}/>}

      {/* Agents overlay — z-50 */}
      {agentsAdmin&&<AgentsOverlay admin={agentsAdmin} onClose={()=>setAgentsAdmin(null)} showToast={showToast} openAgentDetail={openAgentDetail}/>}

      {/* Agent detail overlay — z-200, on top of everything */}
      {viewAgent&&<AgentDetailOverlay
        agent={viewAgent} members={viewAgentMembers} membersLoading={viewAgentLoading}
        onClose={closeAgentDetail} showToast={showToast}/>}

      {/* Sticky Header */}
      <div className="sticky top-0 z-30 border-b border-white/[0.06]"
        style={{background:'rgba(13,21,37,0.95)',backdropFilter:'blur(20px)'}}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.25)'}}>
              <Shield size={17} className="text-blue-400"/>
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Admin Management</h1>
              <nav className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                <span>Dashboard</span><span>/</span><span className="text-slate-400">Admins</span>
              </nav>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <div className="flex rounded-xl overflow-hidden border border-white/10">
              {[{mode:'list',label:'List',Icon:LayoutList},{mode:'card',label:'Card',Icon:LayoutGrid}].map(({mode,label,Icon})=>(
                <button key={mode} onClick={()=>setViewMode(mode)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition"
                  style={viewMode===mode?{background:'#3b82f6',color:'#fff'}:{background:'rgba(255,255,255,0.04)',color:'#475569'}}>
                  <Icon size={13}/><span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
            <button onClick={()=>{fetchStats();doFetchPage(page,searchTerm);}} disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-slate-400 text-sm font-semibold transition disabled:opacity-50 active:scale-95"
              style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)'}}>
              <RefreshCw size={13} className={loading?'animate-spin':''}/> <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {icon:Shield,   label:'Total Admins', value:statCounts.total, color:'#3b82f6',glow:'rgba(59,130,246,0.12)'},
            {icon:Users,    label:'This Page',    value:admins.length,    color:'#10b981',glow:'rgba(16,185,129,0.12)'},
            {icon:Hash,     label:'Total Pages',  value:totalPages,       color:'#8b5cf6',glow:'rgba(139,92,246,0.12)'},
            {icon:Activity, label:'Current Page', value:page,             color:'#06b6d4',glow:'rgba(6,182,212,0.12)'},
          ].map(s=>(
            <div key={s.label} className="rounded-2xl p-4 flex items-center gap-3"
              style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{background:s.glow,border:`1px solid ${s.color}30`}}>
                <s.icon size={17} style={{color:s.color}}/>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{s.label}</p>
                <p className="text-xl font-black mt-0.5" style={{color:s.color}}>{s.value.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="rounded-2xl px-4 py-3.5 flex flex-wrap items-center gap-3"
          style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
            <input ref={searchRef} type="text" value={searchInput}
              onChange={e=>setSearchInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'){setSearchTerm(searchInput);setPage(1);}}}
              placeholder="Search by name or UID… (press Enter)"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)'}}/>
            {searchInput&&(
              <button onClick={()=>{setSearchInput('');setSearchTerm('');setPage(1);searchRef.current?.focus();}}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                <X size={13}/>
              </button>
            )}
          </div>
          <button onClick={()=>{setSearchTerm(searchInput);setPage(1);}}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition active:scale-95 shrink-0"
            style={{background:'#3b82f6'}}>
            <Search size={13}/> Search
          </button>
          <span className="text-sm text-slate-500 shrink-0">
            {loading
              ? <span className="flex items-center gap-2"><Loader2 size={12} className="animate-spin text-blue-400"/> Loading…</span>
              : <span className="px-3 py-1.5 rounded-lg font-semibold text-slate-400" style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)'}}>{totalCount.toLocaleString()} admins</span>
            }
          </span>
        </div>

        {/* LIST VIEW */}
        {viewMode==='list'&&(
          <div className="rounded-2xl overflow-hidden" style={{background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.07)'}}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[960px]">
                <thead>
                  <tr className="border-b border-white/[0.06]" style={{background:'rgba(0,0,0,0.25)'}}>
                    {['#','Admin','UID / Object ID','Agents','WhatsApp','Status','Actions'].map(h=>(
                      <th key={h} className="px-4 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({length:6}).map((_,i)=>(
                      <tr key={i} className="border-b border-white/[0.03]">
                        {Array.from({length:7}).map((_,j)=>(
                          <td key={j} className="px-4 py-4">
                            <div className="h-3.5 rounded-md animate-pulse" style={{background:'rgba(255,255,255,0.06)',width:`${40+(j*13)%40}%`}}/>
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : admins.length===0 ? (
                    <tr><td colSpan={7} className="px-5 py-16 text-center">
                      <Shield size={32} className="mx-auto mb-3 text-slate-700"/>
                      <p className="text-sm text-slate-500">No admins found{searchTerm?` for "${searchTerm}"`:''}</p>
                    </td></tr>
                  ) : admins.map((admin,idx)=>(
                    <tr key={admin.objectId} className="transition-colors border-b border-white/[0.03]"
                      style={{background:idx%2===0?'transparent':'rgba(255,255,255,0.01)'}}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(59,130,246,0.05)'}
                      onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'transparent':'rgba(255,255,255,0.01)'}>
                      <td className="px-4 py-4 text-xs text-slate-600 font-mono">{(page-1)*PAGE_SIZE+idx+1}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={admin.name} username={admin.username} avatarUrl={admin.avatarUrl} size={36}/>
                          <div className="min-w-0">
                            <button onClick={()=>setDetailAdmin(admin)}
                              className="font-bold text-white text-sm hover:text-blue-400 transition-colors text-left block truncate max-w-[160px]">
                              {admin.name}
                            </button>
                            <p className="text-xs text-slate-500">@{admin.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4" onClick={e=>e.stopPropagation()}>
                        <div className="flex flex-col gap-1">
                          <CopyChip value={admin.uid}      copyKey={`uid-${admin.objectId}`} copied={copied} copy={copy}/>
                          <CopyChip value={admin.objectId} copyKey={`oid-${admin.objectId}`} copied={copied} copy={copy}/>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <button onClick={()=>setAgentsAdmin(admin)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition hover:scale-105 active:scale-95"
                          style={{background:'rgba(6,182,212,0.12)',border:'1px solid rgba(6,182,212,0.25)',color:'#22d3ee'}}>
                          <Users size={10}/>
                          {countsLoading&&agentCounts[admin.objectId]===undefined
                            ?<Loader2 size={9} className="animate-spin"/>
                            :(agentCounts[admin.objectId]??'—')}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500 font-mono">{admin.whatsapp||'—'}</td>
                      <td className="px-4 py-4">
                        {admin.isAdmin
                          ?<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-blue-300"
                              style={{background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.3)'}}>
                              <Shield size={9}/> Admin
                            </span>
                          :<span className="text-[11px] text-slate-600 border border-white/10 px-2.5 py-1 rounded-full">User</span>
                        }
                      </td>
                      <td className="px-4 py-4"><ActionBtns admin={admin}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!loading&&admins.length>0&&totalPages>1&&(
              <Pagination page={page} totalPages={totalPages} onChange={setPage} totalCount={totalCount} pageSize={PAGE_SIZE}/>
            )}
          </div>
        )}

        {/* CARD VIEW */}
        {viewMode==='card'&&(
          <div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({length:8}).map((_,i)=>(
                  <div key={i} className="rounded-2xl p-5 animate-pulse" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
                    <div className="flex gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full shrink-0" style={{background:'rgba(255,255,255,0.07)'}}/>
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 rounded" style={{background:'rgba(255,255,255,0.07)',width:'70%'}}/>
                        <div className="h-2.5 rounded" style={{background:'rgba(255,255,255,0.05)',width:'50%'}}/>
                      </div>
                    </div>
                    {[80,60,90].map((w,j)=><div key={j} className="h-2.5 rounded mb-2.5" style={{background:'rgba(255,255,255,0.04)',width:`${w}%`}}/>)}
                  </div>
                ))}
              </div>
            ) : admins.length===0 ? (
              <div className="text-center py-20">
                <Shield size={36} className="mx-auto mb-3 text-slate-700"/>
                <p className="text-slate-500 text-sm">No admins found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {admins.map(admin=>(
                  <div key={admin.objectId} className="rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200"
                    style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(59,130,246,0.25)';e.currentTarget.style.transform='translateY(-2px)';}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.07)';e.currentTarget.style.transform='translateY(0)';}}>
                    <div className="flex items-start gap-3">
                      <Avatar name={admin.name} username={admin.username} avatarUrl={admin.avatarUrl} size={44}/>
                      <div className="min-w-0 flex-1">
                        <button onClick={()=>setDetailAdmin(admin)}
                          className="font-bold text-white text-sm hover:text-blue-400 transition-colors text-left block truncate w-full">
                          {admin.name}
                        </button>
                        <p className="text-xs text-slate-500 mt-0.5">@{admin.username}</p>
                        {admin.isAdmin&&(
                          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-blue-300"
                            style={{background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.3)'}}>
                            <Shield size={8}/> Admin
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <CopyChip value={admin.uid}      copyKey={`cuid-${admin.objectId}`} copied={copied} copy={copy}/>
                      <CopyChip value={admin.objectId} copyKey={`coid-${admin.objectId}`} copied={copied} copy={copy}/>
                    </div>
                    <div className="space-y-2 text-xs border-t border-white/[0.05] pt-3">
                      <div className="flex justify-between"><span className="text-slate-500">WhatsApp</span><span className="text-slate-400 font-mono">{admin.whatsapp||'—'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Gender</span><span className="text-slate-400">{admin.gender}</span></div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Agents</span>
                        <button onClick={()=>setAgentsAdmin(admin)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold transition hover:scale-105"
                          style={{background:'rgba(6,182,212,0.12)',border:'1px solid rgba(6,182,212,0.25)',color:'#22d3ee'}}>
                          <Users size={9}/>{agentCounts[admin.objectId]??(countsLoading?'…':'—')}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-auto">
                      <button onClick={()=>setDetailAdmin(admin)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 text-white"
                        style={{background:'#3b82f6'}}>
                        <Eye size={13}/> View Full Info
                      </button>
                      <button onClick={()=>setAgentsAdmin(admin)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition active:scale-95"
                        style={{background:'rgba(6,182,212,0.12)',border:'1px solid rgba(6,182,212,0.3)',color:'#22d3ee'}}>
                        <Building2 size={12}/> All Agents
                        {agentCounts[admin.objectId]!==undefined&&(
                          <span className="px-1.5 rounded-full text-[9px] font-black" style={{background:'rgba(6,182,212,0.2)',color:'#67e8f9'}}>
                            {agentCounts[admin.objectId]}
                          </span>
                        )}
                      </button>
                      <div className="flex gap-2">
                        <button onClick={()=>setWaModal(admin)}
                          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition active:scale-95"
                          style={{background:'rgba(16,185,129,0.12)',border:'1px solid rgba(16,185,129,0.25)',color:'#34d399'}}>
                          <Phone size={11}/> WA
                        </button>
                        <button onClick={()=>setToggleModal(admin)}
                          className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${admin.isAdmin?'text-red-400':'text-blue-400'}`}
                          style={{background:admin.isAdmin?'rgba(239,68,68,0.12)':'rgba(59,130,246,0.12)',border:`1px solid ${admin.isAdmin?'rgba(239,68,68,0.25)':'rgba(59,130,246,0.25)'}`}}>
                          {admin.isAdmin?<><UserMinus size={11}/> Remove</>:<><UserPlus size={11}/> Make</>}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!loading&&admins.length>0&&totalPages>1&&(
              <div className="mt-4 rounded-2xl overflow-hidden" style={{background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.07)'}}>
                <Pagination page={page} totalPages={totalPages} onChange={setPage} totalCount={totalCount} pageSize={PAGE_SIZE}/>
              </div>
            )}
          </div>
        )}

      </div>

      <style>{`
        @keyframes toastIn   { from{opacity:0;transform:translateY(-8px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes modalIn   { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
        @keyframes overlayIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}