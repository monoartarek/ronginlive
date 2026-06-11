import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Parse from '../../parseConfig';
import {
  Users, Search, X, Loader2, RefreshCw,
  ChevronLeft, ChevronRight,
  Building2, Gem, User, Clock, Printer,
  FileText, Table, FileSpreadsheet, Check,
  AlertTriangle, Pencil, ArrowLeft, TrendingUp,
  Hash, ChevronsUpDown, ChevronUp, ChevronDown,
  Mail, Shield, Eye, Download, Copy, LayoutList,
  LayoutGrid, CheckCheck, Star, Activity, Zap
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImg from '../../assets/logo.png';

/* ══════════════════════════════════════════════
   CONSTANTS & HELPERS
══════════════════════════════════════════════ */
const fmt    = n  => Number(n  || 0).toLocaleString();
const fmtDur = (days = 0, mins = 0) => `${days}d ${mins}m`;

const ACCENT   = '#3b82f6';
const EMERALD  = '#10b981';
const VIOLET   = '#8b5cf6';
const AMBER    = '#f59e0b';
const ROSE     = '#f43f5e';
const CYAN     = '#06b6d4';

const AVATAR_GRADIENTS = [
  'from-blue-500 to-cyan-500',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-pink-500',
  'from-amber-500 to-orange-500',
  'from-indigo-500 to-blue-600',
  'from-teal-500 to-emerald-600',
  'from-fuchsia-500 to-violet-500',
];
const avatarGrad = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
};
const getInitials = (name = '?') =>
  name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();

/* ── Copy to clipboard ── */
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

const CopyChip = ({ value, label, copyKey, copied, copy }) => (
  <button
    onClick={e => { e.stopPropagation(); copy(value, copyKey); }}
    title={`Copy ${label}`}
    className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-semibold transition-all duration-150
      bg-white/5 border border-white/10 text-slate-300 hover:bg-blue-500/20 hover:border-blue-400/40 hover:text-blue-300 active:scale-95"
  >
    {copied === copyKey
      ? <><CheckCheck size={10} className="text-emerald-400" /><span className="text-emerald-400">{value}</span></>
      : <><Copy size={10} className="opacity-50 group-hover:opacity-100" />{value}</>
    }
  </button>
);

/* ── Sort icon ── */
const SortIcon = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col) return <ChevronsUpDown size={11} className="text-slate-600 ml-1 shrink-0" />;
  return sortDir === 'asc'
    ? <ChevronUp   size={11} className="text-blue-400 ml-1 shrink-0" />
    : <ChevronDown size={11} className="text-blue-400 ml-1 shrink-0" />;
};

/* ── Toast ── */
const Toast = ({ msg, type, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div
      className={`fixed top-5 right-5 z-[999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold
        ${type === 'error' ? 'bg-rose-600 border border-rose-400/30' : 'bg-emerald-600 border border-emerald-400/30'}`}
      style={{ animation: 'toastIn .25s cubic-bezier(.34,1.56,.64,1) forwards', backdropFilter: 'blur(12px)' }}
    >
      {type === 'error' ? <AlertTriangle size={15} /> : <CheckCheck size={15} />}
      {msg}
    </div>
  );
};

/* ── Pg Button ── */
const PgBtn = ({ label, icon: Icon, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled}
    className="flex items-center gap-1 px-3 h-8 rounded-lg border border-white/10 bg-white/5 text-xs text-slate-300
      hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition font-medium">
    {Icon && <Icon size={12} />}{label}
  </button>
);

/* ── Stat dot badge ── */
const Dot = ({ color }) => <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />;

/* ══════════════════════════════════════════════
   FULL-PAGE OVERLAY — Agent Detail
══════════════════════════════════════════════ */
const FullPageOverlay = ({ agent, members, membersLoading, onClose, showToast }) => {
  const [search,    setSearch]    = useState('');
  const [pageSize,  setPageSize]  = useState(25);
  const [page,      setPage]      = useState(1);
  const [sortCol,   setSortCol]   = useState('createdAt');
  const [sortDir,   setSortDir]   = useState('desc');
  const [editName,  setEditName]  = useState(false);
  const [agencyName,setAgencyName]= useState(agent.get('agency_name') || '');
  const [removing,  setRemoving]  = useState(null);
  const [hostsList, setHostsList] = useState([]);
  const { copied, copy } = useCopy();

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  // Sync local hosts list with the members prop (initial load or refresh)
useEffect(() => {
  setHostsList(members);
}, [members]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const toggleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
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
      return String(h?.get('uid') || '').includes(q) || (h?.get('name') || '').toLowerCase().includes(q);
    });
  }, [members, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ha = a.get('host'), hb = b.get('host');
      let av, bv;
      if      (sortCol === 'uid')      { av = ha?.get('uid') || 0;    bv = hb?.get('uid') || 0; }
      else if (sortCol === 'name')     { av = ha?.get('name') || '';   bv = hb?.get('name') || ''; }
      else if (sortCol === 'liveDur')  { av = (a.get('livestream_duration_day')||0)*1440+(a.get('livestream_duration_minute')||0); bv = (b.get('livestream_duration_day')||0)*1440+(b.get('livestream_duration_minute')||0); }
      else if (sortCol === 'audioDur') { av = (a.get('audio_duration_day')||0)*1440+(a.get('audio_duration_minute')||0); bv = (b.get('audio_duration_day')||0)*1440+(b.get('audio_duration_minute')||0); }
      else if (sortCol === 'diamonds') { av = ha?.get('diamonds') || 0; bv = hb?.get('diamonds') || 0; }
      else if (sortCol === 'createdAt'){ av = a.get('createdAt') || 0;  bv = b.get('createdAt') || 0; }
      else return 0;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated  = sorted.slice((page - 1) * pageSize, page * pageSize);

  const saveName = async () => {
    try {
      agent.set('agency_name', agencyName.trim());
      await agent.save(null, { useMasterKey: true });
      showToast('Agency name updated!');
      setEditName(false);
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  };

const doRemoveHost = async (hostId, hostUid) => {
  setRemoving(hostId);
  try {
    console.log('Removing host with objectId:', hostId);

    // 1. Fetch the host user
    const hq = new Parse.Query('_User');
    const host = await hq.get(hostId, { useMasterKey: true });
    console.log('Host found:', host.id);

    // 2. Clear agency fields (set to empty string – same as PHP)
    host.set('agency_role', '');
    host.set('my_agent_id', '');
    await host.save(null, { useMasterKey: true });
    console.log('Host fields cleared');

    // 3. Delete AgencyMember records where host_id = host.id
    const memberQuery = new Parse.Query('AgencyMember');
    memberQuery.equalTo('host_id', host.id);
    const membersToDelete = await memberQuery.find({ useMasterKey: true });
    if (membersToDelete.length) {
      await Parse.Object.destroyAll(membersToDelete, { useMasterKey: true });
      console.log(`Deleted ${membersToDelete.length} AgencyMember record(s)`);
    }

    // 4. Delete AgencyInvitation records where host_id = host.id
    const inviteQuery = new Parse.Query('AgencyInvitation');
    inviteQuery.equalTo('host_id', host.id);
    const invitesToDelete = await inviteQuery.find({ useMasterKey: true });
    if (invitesToDelete.length) {
      await Parse.Object.destroyAll(invitesToDelete, { useMasterKey: true });
      console.log(`Deleted ${invitesToDelete.length} AgencyInvitation record(s)`);
    }

    showToast(`Host #${hostUid} removed!`);
  } catch (e) {
    console.error('Remove host error:', e);
    showToast('Error: ' + e.message, 'error');
  } finally {
    setRemoving(null);
  }
};
  const removeAgency = async () => {
    if (!window.confirm('Remove this agency and unlink all hosts?')) return;
    try {
      agent.set('agency_name', ''); agent.set('my_agent_id', ''); agent.set('agency_role', '');
      await agent.save(null, { useMasterKey: true });
      showToast('Agency removed!');
      onClose();
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  };

  const exportPDF = async () => {
  try {
    const doc   = new jsPDF('l', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;

    /* ── COLORS ── */
    const DARK      = [15,  23,  42];
    const BLUE      = [37,  99,  235];
    const WHITE     = [255, 255, 255];
    const LIGHT_BG  = [241, 245, 249];
    const MUTED     = [100, 116, 135];
    const TEXT_DARK = [30,  41,  59];
    const DIVIDER   = [203, 213, 225];
    const GREEN     = [5,   150, 105];

    /* ── SAFE TEXT ── */
    const safe = (str) =>
      String(str || '').replace(/[^\x00-\x7F]/g, '').trim();

    const safeName       = safe(agentName)                || 'Agent';
    const safeUser       = safe(agentUser)                || 'unknown';
    const safeEmail      = safe(agentEmail)               || '—';
    const safeAgencyName = safe(agent.get('agency_name')) || '—';
    const safeAgentUid   = safe(String(agentUid || '—'));
    const safeJoined     = agent.get('createdAt')
      ? agent.get('createdAt').toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
        })
      : '—';

    /* ── LOAD LOGO FOR WATERMARK ── */
    let logoBase64 = null;
    try {
      const logoResponse = await fetch(logoImg);
      if (logoResponse.ok) {
        const logoBlob = await logoResponse.blob();
        logoBase64 = await new Promise((res, rej) => {
          const reader     = new FileReader();
          reader.onloadend = () => res(reader.result);
          reader.onerror   = rej;
          reader.readAsDataURL(logoBlob);
        });
      }
    } catch (logoErr) {
      console.warn('Logo load failed:', logoErr.message);
    }

    /* ── WATERMARK HELPER (called per page) ── */
    const drawWatermark = () => {
      if (!logoBase64) return;
      try {
        const wmW = 110;
        const wmH = 110;
        const wmX = (pageW - wmW) / 2;
        const wmY = (pageH - wmH) / 2;
        doc.saveGraphicsState();
        doc.setGState(doc.GState({ opacity: 0.20 }));
        doc.addImage(logoBase64, 'PNG', wmX, wmY, wmW, wmH);
        doc.restoreGraphicsState();
      } catch (e) {
        console.warn('Watermark draw failed:', e.message);
      }
    };

    /* ══════════════════════════════
       PAGE 1 WATERMARK
    ══════════════════════════════ */
    drawWatermark();

    /* ══════════════════════════════
       HEADER BAND
    ══════════════════════════════ */
    doc.setFillColor(...DARK);
    doc.rect(0, 0, pageW, 22, 'F');

    doc.setFillColor(...BLUE);
    doc.rect(0, 0, 5, 22, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...WHITE);
    doc.text('AGENCY REPORT', margin + 4, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 190, 210);
    const now = new Date().toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
    doc.text(`Generated: ${now}`, pageW - margin, 14, { align: 'right' });

    /* ══════════════════════════════
       AVATAR
    ══════════════════════════════ */
    let currentY = 30;

    const drawInitials = () => {
      doc.setFillColor(...BLUE);
      doc.circle(margin + 10, currentY + 10, 10, 'F');
      doc.setTextColor(...WHITE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      const initials = safeName
        .split(' ')
        .filter(Boolean)
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || '?';
      doc.text(initials, margin + 10, currentY + 11.5, { align: 'center' });
    };

    if (avatarUrl) {
      try {
        /* Method 1 — fetch as blob */
        const controller = new AbortController();
        const timeout    = setTimeout(() => controller.abort(), 8000);
        const response   = await fetch(avatarUrl, {
          signal: controller.signal,
          mode:   'cors',
          cache:  'no-cache',
        });
        clearTimeout(timeout);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const blob   = await response.blob();
        const base64 = await new Promise((res, rej) => {
          const reader     = new FileReader();
          reader.onloadend = () => res(reader.result);
          reader.onerror   = rej;
          reader.readAsDataURL(blob);
        });

        const img = new Image();
        await new Promise((res, rej) => {
          img.onload  = res;
          img.onerror = rej;
          img.src     = base64;
        });

        const size   = 160;
        const canvas = document.createElement('canvas');
        canvas.width  = size;
        canvas.height = size;
        const ctx    = canvas.getContext('2d');
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 0, 0, size, size);

        const cropped = canvas.toDataURL('image/jpeg', 0.95);
        doc.addImage(cropped, 'JPEG', margin, currentY, 22, 22);

      } catch (err) {
        console.warn('Avatar method 1 failed:', err.message);
        try {
          /* Method 2 — crossOrigin img */
          const img2 = new Image();
          img2.crossOrigin = 'anonymous';
          await new Promise((res, rej) => {
            img2.onload  = res;
            img2.onerror = rej;
            setTimeout(rej, 5000);
            img2.src = avatarUrl + '?t=' + Date.now();
          });

          const size2   = 160;
          const canvas2 = document.createElement('canvas');
          canvas2.width  = size2;
          canvas2.height = size2;
          const ctx2    = canvas2.getContext('2d');
          ctx2.beginPath();
          ctx2.arc(size2 / 2, size2 / 2, size2 / 2, 0, Math.PI * 2);
          ctx2.closePath();
          ctx2.clip();
          ctx2.drawImage(img2, 0, 0, size2, size2);

          const cropped2 = canvas2.toDataURL('image/jpeg', 0.95);
          doc.addImage(cropped2, 'JPEG', margin, currentY, 22, 22);

        } catch (err2) {
          console.warn('Avatar method 2 failed:', err2.message);
          drawInitials();
        }
      }
    } else {
      drawInitials();
    }

    /* ══════════════════════════════
       AGENT NAME + INFO
    ══════════════════════════════ */
    const nameX = margin + 26;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...TEXT_DARK);
    doc.text(safeName, nameX, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`@${safeUser}`, nameX, currentY + 13);

    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`Joined: ${safeJoined}`, nameX, currentY + 19);

    /* ══════════════════════════════
       INFO BLOCK
    ══════════════════════════════ */
    const infoY = currentY + 26;
    const infoH = 28;
    const infoW = pageW - margin * 2;
    const colW  = infoW / 5;

    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(margin, infoY, infoW, infoH, 2, 2, 'F');

    doc.setFillColor(...BLUE);
    doc.roundedRect(margin, infoY, infoW, 3, 1, 1, 'F');

    const infoItems = [
      { label: 'UID',            value: safeAgentUid,                    highlight: false },
      { label: 'Agency Name',    value: safeAgencyName,                  highlight: false },
      { label: 'Email',          value: safeEmail,                       highlight: false },
      { label: 'Total Hosts',    value: String(totalHosts),              highlight: true  },
      { label: 'Agency Earning', value: fmt(totalEarning) + ' diamonds', highlight: true  },
    ];

    infoItems.forEach((item, i) => {
      const x = margin + colW * i + colW / 2;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...MUTED);
      doc.text(item.label.toUpperCase(), x, infoY + 9, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(item.value.length > 20 ? 7 : 9);
      doc.setTextColor(
        item.highlight ? BLUE[0] : TEXT_DARK[0],
        item.highlight ? BLUE[1] : TEXT_DARK[1],
        item.highlight ? BLUE[2] : TEXT_DARK[2],
      );
      doc.text(item.value, x, infoY + 19, { align: 'center' });
    });

    /* vertical dividers */
    doc.setDrawColor(...DIVIDER);
    doc.setLineWidth(0.3);
    for (let i = 1; i < 5; i++) {
      const lx = margin + colW * i;
      doc.line(lx, infoY + 5, lx, infoY + infoH - 5);
    }

    /* ══════════════════════════════
       SECTION TITLE
    ══════════════════════════════ */
    const tableStartY = infoY + infoH + 8;

    doc.setFillColor(...BLUE);
    doc.rect(margin, tableStartY, 3, 6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_DARK);
    doc.text('HOST DETAILS', margin + 6, tableStartY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(
      `${sorted.length} record(s)`,
      pageW - margin, tableStartY + 4.5, { align: 'right' },
    );

    /* ══════════════════════════════
       HOST TABLE
    ══════════════════════════════ */
    autoTable(doc, {
      startY: tableStartY + 9,
      margin: { left: margin, right: margin },

      head: [[
        'No.',
        'Host UID',
        'Object ID',
        'Host Name',
        'Live Duration',
        'Audio Duration',
        'Diamonds',
        'Joined Date',
      ]],

      body: sorted.map((m, idx) => {
        const h  = m.get('host');
        const ca = m.get('createdAt');
        return [
          idx + 1,
          safe(String(h?.get('uid') || '—')),
          safe(h?.id || '—'),
          safe(h?.get('name') || '—') || '—',
          fmtDur(
            m.get('livestream_duration_day')    || 0,
            m.get('livestream_duration_minute') || 0,
          ),
          fmtDur(
            m.get('audio_duration_day')    || 0,
            m.get('audio_duration_minute') || 0,
          ),
          Number(h?.get('diamonds') || 0).toLocaleString(),
          ca
            ? ca.toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
              })
            : '—',
        ];
      }),

      headStyles: {
        fillColor:   BLUE,
        textColor:   WHITE,
        fontStyle:   'bold',
        fontSize:    7.5,
        cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
        halign:      'left',
      },

      bodyStyles: {
        fontSize:    7.5,
        textColor:   TEXT_DARK,
        cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
        lineColor:   DIVIDER,
        lineWidth:   0.2,
      },

      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },

      columnStyles: {
        0: { cellWidth: 10,     halign: 'center', textColor: MUTED },
        1: { cellWidth: 20,     fontStyle: 'bold' },
        2: { cellWidth: 28,     textColor: MUTED,  fontSize: 6.5 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 24,     halign: 'center' },
        5: { cellWidth: 24,     halign: 'center' },
        6: { cellWidth: 24,     halign: 'right',  fontStyle: 'bold', textColor: GREEN },
        7: { cellWidth: 26,     halign: 'center', textColor: MUTED },
      },

      showHead: 'everyPage',

      /* ── watermark + footer on every page ── */
      didDrawPage: (data) => {
        const totalPg = doc.internal.getNumberOfPages();
        const curPg   = data.pageNumber;

        /* watermark on page 2+ */
        if (curPg > 1) {
          drawWatermark();
        }

        /* footer line */
        doc.setDrawColor(...DIVIDER);
        doc.setLineWidth(0.3);
        doc.line(margin, pageH - 10, pageW - margin, pageH - 10);

        /* footer text left */
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text(
          `Agency: ${safeAgencyName}  |  Agent UID: ${safeAgentUid}  |  Agent: ${safeName}`,
          margin, pageH - 6,
        );

        /* footer text right */
        doc.text(
          `Page ${curPg} of ${totalPg}`,
          pageW - margin, pageH - 6, { align: 'right' },
        );
      },
    });

    /* ══════════════════════════════
       SAVE
    ══════════════════════════════ */
    const slug = safeAgencyName.replace(/\s+/g, '_') || 'Agency';
    doc.save(`${slug}_Report_${safeAgentUid}.pdf`);
    showToast('PDF exported successfully!');

  } catch (e) {
    console.error('exportPDF error:', e);
    showToast('PDF failed: ' + e.message, 'error');
  }
};

  const exportCSV = () => {
    const rows = sorted.map(m => [
      m.get('host')?.get('uid') || '',
      `"${m.get('host')?.get('name') || ''}"`,
      fmtDur(m.get('livestream_duration_day'), m.get('livestream_duration_minute')),
      fmtDur(m.get('audio_duration_day'), m.get('audio_duration_minute')),
      m.get('host')?.get('diamonds') || 0,
      m.get('createdAt')?.toLocaleString() || '',
    ]);
    const csv = [['Host UID','Host Name','Live Duration','Audio Duration','Diamonds','Created At'], ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `Agency_${agent.get('uid')}_Hosts.csv`; a.click();
    showToast('CSV exported!');
  };

  const agentName  = agent.get('name')      || '—';
  const agentUser  = agent.get('username')  || '—';
  const agentEmail = agent.get('email')     || '—';
  const agentFirst = agent.get('first_name')|| '—';
  const agentDiam  = agent.get('diamonds')  || 0;
  const agentUid   = agent.get('uid');
  const agentObjId = agent.id;
  const av         = agent.get('avatar');
  let   avatarUrl  = null;
  if (av && typeof av.url === 'function') avatarUrl = av.url();
  else if (av?.url) avatarUrl = av.url;
  const grad = avatarGrad(agentUser);

  return (
      <div className="fixed top-0 right-0 bottom-0 z-50 overflow-y-auto left-0 lg:left-64"
        style={{ background: '#0d1525' }}>
      {/* Sticky Top Bar */}
      <div style={{ background: 'rgba(13,21,37,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        className="sticky top-0 z-20">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-3 flex items-center gap-3">
          <button onClick={onClose}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-slate-300 text-sm font-medium transition active:scale-95 shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <ArrowLeft size={14} /> <span className="hidden sm:inline">Back</span>
          </button>
          <nav className="hidden sm:flex items-center gap-1.5 text-sm text-slate-500 min-w-0">
            <span>Users</span><span>/</span><span>Agents</span><span>/</span>
            <span className="text-white font-semibold truncate">{agent.get('agency_name') || 'Agent Detail'}</span>
          </nav>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button onClick={exportPDF}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition active:scale-95"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
              <FileText size={12} /> PDF
            </button>
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition active:scale-95"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }}>
              <Table size={12} /> CSV
            </button>
            <button onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-6 space-y-5">

        {/* Agent Banner */}
        <div className="rounded-2xl p-6 sm:p-8 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 40%, #1d4ed8 100%)', border: '1px solid rgba(59,130,246,0.3)' }}>

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">

            {/* Back button beside avatar */}
            <button onClick={onClose}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition active:scale-95 shrink-0 group self-start"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.08))',
                border: '1px solid rgba(255,255,255,0.25)',
                boxShadow: '0 0 16px rgba(0,0,0,0.2)',
              }}>
              <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
              Back
            </button>

            {avatarUrl
              ? <img src={avatarUrl} alt={agentName} className="w-20 h-20 rounded-2xl object-cover border-2 border-white/20 shrink-0" />
              : <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 bg-gradient-to-br ${grad} border-2 border-white/20 text-white shadow-xl`}>
                  {getInitials(agentName)}
                </div>
            }
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-black text-white truncate">{agentName}</h1>
              <p className="text-blue-200 mt-0.5 text-sm">@{agentUser} · UID <span className="font-bold text-white">#{agentUid}</span></p>
              {agentEmail !== '—' && <p className="text-blue-100/80 text-xs mt-1">{agentEmail}</p>}
            </div>
            <div className="shrink-0 flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-white"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <Building2 size={13} /> {agent.get('agency_name') || 'No Agency Name'}
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-emerald-200"
                style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)' }}>
                <Gem size={13} /> {fmt(agentDiam)} Diamonds
              </div>



            </div>
          </div>
        </div>

        {/* Info + Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Agent Info Card */}
          <div className="lg:col-span-2 rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2.5 px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.2)' }}>
                <User size={14} className="text-blue-400" />
              </div>
              <h2 className="font-bold text-blue-400 text-sm tracking-wide uppercase">Agent Info</h2>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
                <div className="space-y-3.5">
                  <DetailRow label="Object ID">
                    <CopyChip value={agentObjId} label="Object ID" copyKey={`objid-${agentObjId}`} copied={copied} copy={copy} />
                  </DetailRow>
                  <DetailRow label="UID">
                    <CopyChip value={agentUid} label="UID" copyKey={`uid-${agentUid}`} copied={copied} copy={copy} />
                  </DetailRow>
                  <DetailRow label="Username"><span className="text-slate-300 text-sm">@{agentUser}</span></DetailRow>
                  <DetailRow label="Email"><span className="text-slate-300 text-sm truncate">{agentEmail}</span></DetailRow>
                </div>
                <div className="space-y-3.5">
                  <DetailRow label="Agency Name">
                    {editName ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <input autoFocus value={agencyName}
                          onChange={e => setAgencyName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditName(false); }}
                          className="px-3 py-1 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(59,130,246,0.5)' }}
                        />
                        <button onClick={saveName} className="p-1.5 rounded-lg transition" style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399' }}><Check size={12} /></button>
                        <button onClick={() => { setEditName(false); setAgencyName(agent.get('agency_name') || ''); }}
                          className="p-1.5 rounded-lg transition" style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}><X size={12} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300 text-sm">{agent.get('agency_name') || '—'}</span>
                        <button onClick={() => setEditName(true)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition"
                          style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa' }}>
                          <Pencil size={9} /> Edit
                        </button>
                      </div>
                    )}
                  </DetailRow>
                  <DetailRow label="First Name"><span className="text-slate-300 text-sm">{agentFirst}</span></DetailRow>
                  <DetailRow label="Diamonds"><span className="text-emerald-400 font-bold text-sm">{fmt(agentDiam)}</span></DetailRow>
                </div>
              </div>
              <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={removeAgency}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition active:scale-95"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                  <X size={14} /> Remove Agency
                </button>
              </div>
            </div>
          </div>

          {/* Stat Boxes */}
          <div className="flex flex-col gap-4">
            <OverlayStatBox label="Total Hosts" value={totalHosts} icon={Users} color={EMERALD} glow="rgba(16,185,129,0.15)" />
            <OverlayStatBox label="Agency Earning" value={fmt(totalEarning)} icon={Gem} color={CYAN} glow="rgba(6,182,212,0.15)" />
          </div>
        </div>

        {/* Hosts History Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

          <div className="flex items-center gap-2.5 px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.2)' }}>
              <Clock size={14} className="text-cyan-400" />
            </div>
            <h2 className="font-bold text-cyan-400 text-sm tracking-wide uppercase">Hosts History</h2>
            <span className="ml-auto text-xs text-slate-500 font-mono">{sorted.length} records</span>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-3.5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)' }}>
            <div className="flex items-center gap-2 flex-wrap">
              <ExportBtnDark icon={Printer}         label="Print"  onClick={() => window.print()} />
              <ExportBtnDark icon={FileText}        label="PDF"    onClick={exportPDF} accent="red" />
              <ExportBtnDark icon={FileSpreadsheet} label="Excel"  onClick={exportCSV} accent="green" />
              <ExportBtnDark icon={Table}           label="CSV"    onClick={exportCSV} accent="teal" />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>Show</span>
                <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {[10, 25, 50, 100].map(n => <option key={n} value={n} style={{ background: '#0d1525' }}>{n}</option>)}
                </select>
                <span>entries</span>
              </div>
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search hosts…"
                  className="pl-8 pr-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-lg w-44"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
            </div>
          </div>

          {/* Table */}
          {membersLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Loading hosts…</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[820px]">
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {[
                      { label: 'Host UID',      col: 'uid'       },
                      { label: 'Object ID',      col: null        },
                      { label: 'Host Name',      col: 'name'      },
                      { label: 'Live Duration',  col: 'liveDur'   },
                      { label: 'Audio Duration', col: 'audioDur'  },
                      { label: 'Diamonds',       col: 'diamonds'  },
                      { label: 'Created At',     col: 'createdAt' },
                      { label: 'Action',         col: null        },
                    ].map(({ label, col }) => (
                      <th key={label} onClick={() => col && toggleSort(col)}
                        className={`px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap select-none ${col ? 'cursor-pointer hover:text-slate-200 transition' : ''}`}>
                        <div className="flex items-center">
                          {label}
                          {col && <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan={8} className="px-5 py-16 text-center text-slate-500 text-sm">
                      {search ? `No hosts match "${search}"` : 'No host history found.'}
                    </td></tr>
                  ) : paginated.map((m, i) => {
                    const h    = m.get('host');
                    const hId  = h?.id;
                    const hUid = h?.get('uid');
                    const hNm  = h?.get('name') || 'N/A';
                    const hDm  = h?.get('diamonds') || 0;
                    const lD   = m.get('livestream_duration_day')    || 0;
                    const lM   = m.get('livestream_duration_minute')  || 0;
                    const aD   = m.get('audio_duration_day')    || 0;
                    const aM   = m.get('audio_duration_minute')  || 0;
                    const ca   = m.get('createdAt');
                    return (
                      <tr key={m.id}
                        className="transition-colors"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.07)'}
                        onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}
                      >
                        <td className="px-4 py-3.5">
                          <CopyChip value={hUid} label="Host UID" copyKey={`huid-${hUid}`} copied={copied} copy={copy} />
                        </td>
                        <td className="px-4 py-3.5">
                          <CopyChip value={hId || '—'} label="Object ID" copyKey={`hobj-${hId}`} copied={copied} copy={copy} />
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-200">{hNm}</td>
                        <td className="px-4 py-3.5 text-slate-400 text-xs">{fmtDur(lD, lM)}</td>
                        <td className="px-4 py-3.5 text-slate-400 text-xs">{fmtDur(aD, aM)}</td>
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-emerald-400 text-sm">{fmt(hDm)}</span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                          {ca ? ca.toLocaleString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }).replace(',',' ') : '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <button onClick={() => doRemoveHost(hId, hUid)} disabled={removing === hId}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 disabled:opacity-50 whitespace-nowrap"
                            style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}>
                            {removing === hId
                              ? <div className="w-3 h-3 border border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
                              : <X size={11} />}
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

          {/* Pagination */}
          {!membersLoading && sorted.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.1)' }}>
              <p className="text-sm text-slate-500">
                Showing {(page-1)*pageSize+1}–{Math.min(page*pageSize, sorted.length)} of {sorted.length}
              </p>
              <div className="flex items-center gap-1.5">
                <PgBtn label="Prev" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} />
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = totalPages<=5 ? i+1 : page<=3 ? i+1 : page>=totalPages-2 ? totalPages-4+i : page-2+i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className="w-8 h-8 rounded-lg text-sm font-medium transition-all"
                      style={p===page
                        ? { background: '#3b82f6', color: '#fff', boxShadow: '0 0 12px rgba(59,130,246,0.4)' }
                        : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                      {p}
                    </button>
                  );
                })}
                <PgBtn label="Next" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center pb-6">
          <button onClick={onClose}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium transition"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
            <ArrowLeft size={14} /> Back to Agencies
          </button>
        </div>
      </div>

      <style>{`
        @keyframes overlayIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
};

/* ══════════════════════════════════════════════
   MAIN — AGENCIES LIST PAGE
══════════════════════════════════════════════ */
export default function AgenciesList() {
  const [agents,        setAgents]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [page,          setPage]          = useState(1);
  const [totalCount,    setTotalCount]    = useState(0);
  const [search,        setSearch]        = useState('');
  const [debouncedQ,    setDebouncedQ]    = useState('');
  const [pageSize,      setPageSize]      = useState(25);
  const [toast,         setToast]         = useState(null);
  const [sortCol,       setSortCol]       = useState('uid');
  const [sortDir,       setSortDir]       = useState('asc');
  const [viewMode,      setViewMode]      = useState('list'); // 'list' | 'card'

  const [selectedAgent,  setSelectedAgent]  = useState(null);
  const [drawerMembers,  setDrawerMembers]  = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const searchRef = useRef();
  const { copied, copy } = useCopy();

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(search); setPage(1); }, 420);
    return () => clearTimeout(t);
  }, [search]);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const buildQ = () => {
        const q = new Parse.Query('_User');
        q.equalTo('agency_role', 'agent');
        if (debouncedQ.trim()) {
          const n = parseInt(debouncedQ.trim());
          if (!isNaN(n)) q.equalTo('uid', n);
          else q.matches('name', debouncedQ.trim(), 'i');
        }
        return q;
      };
      const dq = buildQ(); const cq = buildQ();
      dq.descending('createdAt');
      dq.limit(pageSize);
      dq.skip((page - 1) * pageSize);
      dq.select(['uid', 'name', 'username', 'email', 'agency_name', 'first_name', 'diamonds', 'avatar', 'createdAt']);
      const [results, count] = await Promise.all([
        dq.find({ useMasterKey: true }),
        cq.count({ useMasterKey: true }),
      ]);
      setAgents(results);
      setTotalCount(count);
    } catch (e) {
      showToast('Failed to load: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedQ, showToast]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const sortedAgents = useMemo(() => {
    return [...agents].sort((a, b) => {
      let av, bv;
      if      (sortCol === 'uid')        { av = a.get('uid') || 0;         bv = b.get('uid') || 0; }
      else if (sortCol === 'name')       { av = a.get('name') || '';        bv = b.get('name') || ''; }
      else if (sortCol === 'agencyName') { av = a.get('agency_name') || ''; bv = b.get('agency_name') || ''; }
      else if (sortCol === 'diamonds')   { av = a.get('diamonds') || 0;     bv = b.get('diamonds') || 0; }
      else return 0;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [agents, sortCol, sortDir]);

  const toggleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const openDrawer = async (agentObj) => {
    setSelectedAgent(agentObj);
    setDrawerMembers([]);
    setMembersLoading(true);
    try {
      const mq = new Parse.Query('AgencyMember');
      mq.equalTo('agent', agentObj);
      mq.include('host');
      mq.descending('createdAt');
      mq.limit(2500);
      const res = await mq.find({ useMasterKey: true });
      setDrawerMembers(res);
    } catch (e) { showToast('Failed to load hosts: ' + e.message, 'error'); }
    finally { setMembersLoading(false); }
  };

  const closeDrawer = () => {
    setSelectedAgent(null);
    setDrawerMembers([]);
    fetchAgents();
  };

  return (
    <div className="min-h-screen" style={{ background: '#0d1525', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* Subtle grid overlay */}
      {/* <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} /> */}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {selectedAgent && (
        <FullPageOverlay
          agent={selectedAgent}
          members={drawerMembers}
          membersLoading={membersLoading}
          onClose={closeDrawer}
          showToast={showToast}
        />
      )}

      {/* Page Header */}
      <div className="sticky top-0 z-30" style={{ background: 'rgba(13,21,37,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="min-w-0 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', boxShadow: '0 0 20px rgba(59,130,246,0.3)' }}>
              <Building2 size={17} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Agencies</h1>
              <nav className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                <span>Users</span><span>/</span><span className="text-slate-300">All Agents</span>
              </nav>
            </div>
          </div>

          <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
              <button
                onClick={() => setViewMode('list')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition"
                style={viewMode === 'list' ? { background: '#3b82f6', color: '#fff' } : { color: '#64748b' }}>
                <LayoutList size={13} /> <span className="hidden sm:inline">List</span>
              </button>
              <button
                onClick={() => setViewMode('card')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition"
                style={viewMode === 'card' ? { background: '#3b82f6', color: '#fff' } : { color: '#64748b' }}>
                <LayoutGrid size={13} /> <span className="hidden sm:inline">Card</span>
              </button>
            </div>

            <button onClick={fetchAgents} disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50 active:scale-95 text-slate-300"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5 relative">

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MiniStat icon={Building2}  label="Total Agencies" value={totalCount}    color={ACCENT}  glow="rgba(59,130,246,0.15)" />
          <MiniStat icon={Users}      label="This Page"      value={agents.length} color={EMERALD} glow="rgba(16,185,129,0.15)" />
          <MiniStat icon={Hash}       label="Total Pages"    value={totalPages}    color={VIOLET}  glow="rgba(139,92,246,0.15)" />
          <MiniStat icon={Activity}   label="Current Page"   value={page}          color={CYAN}    glow="rgba(6,182,212,0.15)" />
        </div>

        {/* Main Table Card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-6 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.15)' }}>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Show</span>
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {[10, 25, 50, 100].map(n => <option key={n} value={n} style={{ background: '#0d1525' }}>{n}</option>)}
              </select>
              <span>entries</span>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name or UID…"
                className="pl-9 pr-9 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-xl w-52 transition"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              {search && (
                <button onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* ── LIST VIEW ── */}
          {viewMode === 'list' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {[
                      { label: '#',           col: null },
                      { label: 'Agent',       col: 'name' },
                      { label: 'UID / Obj ID',col: 'uid' },
                      { label: 'Agency',      col: 'agencyName' },
                      { label: 'Email',       col: null },
                      { label: 'First Name',  col: null },
                      { label: 'Diamonds',    col: 'diamonds' },
                      { label: 'Joined',      col: null },
                      { label: 'Action',      col: null },
                    ].map(({ label, col }) => (
                      <th key={label} onClick={() => col && toggleSort(col)}
                        className={`px-4 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap select-none ${col ? 'cursor-pointer hover:text-slate-300 transition' : ''}`}>
                        <div className="flex items-center">
                          {label}
                          {col && <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <td key={j} className="px-4 py-4">
                            <div className="h-3.5 rounded-md animate-pulse" style={{ background: 'rgba(255,255,255,0.06)', width: `${40 + (j * 11) % 40}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : sortedAgents.length === 0 ? (
                    <tr><td colSpan={9} className="px-5 py-16 text-center">
                      <Building2 size={36} className="mx-auto mb-3 text-slate-700" />
                      <p className="text-sm text-slate-500">No agencies found{search ? ` for "${search}"` : ''}.</p>
                    </td></tr>
                  ) : sortedAgents.map((agent, idx) => {
                    const av = agent.get('avatar');
                    let avatarUrl = null;
                    if (av && typeof av.url === 'function') avatarUrl = av.url();
                    else if (av?.url) avatarUrl = av.url;
                    const name      = agent.get('name')        || '—';
                    const username  = agent.get('username')    || '—';
                    const agUid     = agent.get('uid');
                    const agObjId   = agent.id;
                    const agName    = agent.get('agency_name') || '—';
                    const email     = agent.get('email')       || '—';
                    const firstName = agent.get('first_name')  || '—';
                    const diamonds  = agent.get('diamonds')    || 0;
                    const createdAt = agent.get('createdAt');
                    const grad      = avatarGrad(username);

                    return (
                      <tr key={agent.id}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                        className="transition-colors">
                        <td className="px-4 py-4 text-xs text-slate-600 font-mono">{(page-1)*pageSize+idx+1}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {avatarUrl
                              ? <img src={avatarUrl} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" style={{ border: '2px solid rgba(59,130,246,0.3)' }} />
                              : <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 bg-gradient-to-br ${grad} text-white shadow-lg`}>{getInitials(name)}</div>
                            }
                            <div className="min-w-0">
                              <p className="font-semibold text-white whitespace-nowrap truncate text-sm">{name}</p>
                              <p className="text-xs text-slate-500">@{username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1">
                            <CopyChip value={agUid} label="UID" copyKey={`uid-${agent.id}`} copied={copied} copy={copy} />
                            <CopyChip value={agObjId} label="Object ID" copyKey={`oid-${agent.id}`} copied={copied} copy={copy} />
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <Building2 size={11} className="text-slate-600 shrink-0" />
                            <span className="text-slate-300 font-medium text-sm truncate max-w-[130px]">{agName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-500 text-xs truncate max-w-[150px]">{email}</td>
                        <td className="px-4 py-4 text-slate-400 text-sm">{firstName}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-400 text-sm">
                            <Gem size={11} className="text-emerald-500" />{fmt(diamonds)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {createdAt?.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) || '—'}
                        </td>
                        <td className="px-4 py-4">
                          <button onClick={() => openDrawer(agent)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition active:scale-95 whitespace-nowrap"
                            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', boxShadow: '0 2px 12px rgba(59,130,246,0.3)' }}>
                            <Eye size={12} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── CARD VIEW ── */}
          {viewMode === 'card' && (
            <div className="p-4 sm:p-6">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-11 h-11 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 rounded-md" style={{ background: 'rgba(255,255,255,0.08)', width: '70%' }} />
                          <div className="h-2.5 rounded-md" style={{ background: 'rgba(255,255,255,0.05)', width: '50%' }} />
                        </div>
                      </div>
                      {[80, 60, 90].map((w, j) => (
                        <div key={j} className="h-3 rounded mb-2.5" style={{ background: 'rgba(255,255,255,0.05)', width: `${w}%` }} />
                      ))}
                    </div>
                  ))}
                </div>
              ) : sortedAgents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Building2 size={40} className="mb-3 text-slate-700" />
                  <p className="text-slate-500">No agencies found{search ? ` for "${search}"` : ''}.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sortedAgents.map((agent, idx) => {
                    const av = agent.get('avatar');
                    let avatarUrl = null;
                    if (av && typeof av.url === 'function') avatarUrl = av.url();
                    else if (av?.url) avatarUrl = av.url;
                    const name      = agent.get('name')        || '—';
                    const username  = agent.get('username')    || '—';
                    const agUid     = agent.get('uid');
                    const agObjId   = agent.id;
                    const agName    = agent.get('agency_name') || '—';
                    const email     = agent.get('email')       || '—';
                    const firstName = agent.get('first_name')  || '—';
                    const diamonds  = agent.get('diamonds')    || 0;
                    const createdAt = agent.get('createdAt');
                    const grad      = avatarGrad(username);

                    return (
                      <div key={agent.id}
                        className="rounded-2xl p-5 flex flex-col gap-4 group transition-all duration-200 cursor-pointer"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.07)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.25)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        {/* Card Header */}
                        <div className="flex items-start gap-3">
                          {avatarUrl
                            ? <img src={avatarUrl} alt={name} className="w-12 h-12 rounded-xl object-cover shrink-0" style={{ border: '2px solid rgba(59,130,246,0.3)' }} />
                            : <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black shrink-0 bg-gradient-to-br ${grad} text-white shadow-lg`}>{getInitials(name)}</div>
                          }
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-white text-sm truncate">{name}</p>
                            <p className="text-xs text-slate-500">@{username}</p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Building2 size={10} className="text-slate-600" />
                              <span className="text-xs text-slate-400 truncate">{agName}</span>
                            </div>
                          </div>
                        </div>

                        {/* IDs row */}
                        <div className="flex flex-wrap gap-1.5">
                          <CopyChip value={agUid} label="UID" copyKey={`cuid-${agent.id}`} copied={copied} copy={copy} />
                          <CopyChip value={agObjId} label="Object ID" copyKey={`coid-${agent.id}`} copied={copied} copy={copy} />
                        </div>

                        {/* Info rows */}
                        <div className="space-y-2 text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                          <div className="flex justify-between">
                            <span className="text-slate-600">First Name</span>
                            <span className="text-slate-300 font-medium">{firstName}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">Email</span>
                            <span className="text-slate-400 text-right truncate max-w-[140px]">{email}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">Diamonds</span>
                            <span className="font-bold text-emerald-400 flex items-center gap-1"><Gem size={10} />{fmt(diamonds)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Joined</span>
                            <span className="text-slate-500">{createdAt?.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) || '—'}</span>
                          </div>
                        </div>

                        <button onClick={() => openDrawer(agent)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition active:scale-95 mt-auto"
                          style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', boxShadow: '0 2px 12px rgba(59,130,246,0.25)' }}>
                          <Eye size={13} /> View Info
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {!loading && agents.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.1)' }}>
              <p className="text-sm text-slate-500">
                Showing {(page-1)*pageSize+1}–{Math.min(page*pageSize, totalCount)} of {totalCount.toLocaleString()}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                <PgBtn label="Previous" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} />
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = totalPages<=5 ? i+1 : page<=3 ? i+1 : page>=totalPages-2 ? totalPages-4+i : page-2+i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className="w-8 h-8 rounded-lg text-sm font-medium transition-all"
                      style={p===page
                        ? { background: '#3b82f6', color: '#fff', boxShadow: '0 0 16px rgba(59,130,246,0.4)' }
                        : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }}>
                      {p}
                    </button>
                  );
                })}
                <PgBtn label="Next" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} />
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes toastIn  { from{opacity:0;transform:translateY(-10px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes overlayIn{ from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

/* ── Shared tiny components ── */
const DetailRow = ({ label, children }) => (
  <div className="flex flex-wrap items-center gap-2">
    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0 w-24">{label}</span>
    <div className="flex-1">{children}</div>
  </div>
);

const OverlayStatBox = ({ label, value, icon: Icon, color, glow }) => (
  <div className="flex-1 rounded-2xl px-5 py-5 flex items-center gap-4"
    style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.07)`, boxShadow: `inset 0 0 40px ${glow}` }}>
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
      style={{ background: glow, border: `1px solid ${color}30` }}>
      <Icon size={20} style={{ color }} />
    </div>
    <div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-black mt-0.5" style={{ color }}>{value}</p>
    </div>
  </div>
);

const MiniStat = ({ icon: Icon, label, value, color, glow }) => (
  <div className="rounded-2xl p-4 flex items-center gap-3"
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: `inset 0 0 30px ${glow}` }}>
    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: glow, border: `1px solid ${color}30` }}>
      <Icon size={16} style={{ color }} />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">{label}</p>
      <p className="text-xl font-black mt-0.5" style={{ color }}>{Number(value).toLocaleString()}</p>
    </div>
  </div>
);

const ExportBtnDark = ({ icon: Icon, label, onClick, accent }) => {
  const styles = {
    red:   { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   color: '#f87171' },
    green: { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)',   color: '#4ade80' },
    teal:  { bg: 'rgba(20,184,166,0.12)',  border: 'rgba(20,184,166,0.3)',  color: '#2dd4bf' },
  };
  const s = styles[accent] || { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)', color: '#94a3b8' };
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
      <Icon size={12} />{label}
    </button>
  );
};