import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import {
  FileText, CheckCircle2, Loader2, Eye, Clock, Users, Award,
  XCircle, AlarmClock, Percent, BarChart2, Download, AlertTriangle, Mail,
  Star, Zap, Target, TrendingUp
} from 'lucide-react';
import ScheduledReportModal from '../components/analisys/ScheduleReportModal';

const cardStyle = { background: 'hsl(222,47%,11%)', border: '1px solid hsl(217,33%,18%)' };
const selectStyle = { background: 'hsl(222,47%,14%)', border: '1px solid hsl(217,33%,22%)', color: 'hsl(215,20%,70%)' };
const muted = 'hsl(215,20%,55%)';
const tooltipStyle = { background: 'hsl(222,47%,14%)', border: '1px solid hsl(217,33%,22%)', color: 'white', fontSize: 11 };

const PRIORITY_COLORS = { Alta: '#f87171', Media: '#fbbf24', Baja: '#4ade80' };
const LEVEL_WEIGHT = { 'Difícil': 3, 'Medio': 2, 'Fácil': 1 };
const LEVEL_COLORS = { 'Fácil': '#4ade80', 'Medio': '#fbbf24', 'Difícil': '#f87171' };
const STATUS_COLORS = { 'Pendiente': '#fbbf24', 'En progreso': '#3b82f6', 'En revisión': '#8b5cf6', 'Finalizada': '#22c55e', 'Rechazada': '#f87171' };
const REQUEST_TYPE_COLORS = {
  'Desarrollo': '#818cf8', 'Corrección de errores': '#f87171', 'Mejora funcional': '#22d3ee',
  'Mejora visual': '#f472b6', 'Migración': '#fb923c', 'Automatización': '#a3e635'
};

function exportCSV(filename, headers, rows) {
  const lines = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename + '.csv'; a.click();
  URL.revokeObjectURL(url);
}

function exportTablePDF(title, headers, rows) {
  const win = window.open('', '_blank');
  const th = headers.map(h => `<th style="padding:6px 10px;border:1px solid #ccc;background:#1e3a5f;color:white;font-size:12px">${h}</th>`).join('');
  const trs = rows.map(r =>
    `<tr>${r.map(v => `<td style="padding:5px 10px;border:1px solid #ddd;font-size:12px">${v}</td>`).join('')}</tr>`
  ).join('');
  win.document.write(`
    <html><head><title>${title}</title></head>
    <body style="font-family:sans-serif;padding:20px">
      <h2 style="color:#1e3a5f;margin-bottom:16px">${title}</h2>
      <table style="border-collapse:collapse;width:100%"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>
      <p style="color:#888;font-size:11px;margin-top:16px">Exportado: ${new Date().toLocaleString('es')}</p>
    </body></html>`);
  win.document.close();
  win.print();
}

function StatCard({ title, value, subtitle, icon: Icon, iconColor, highlight }) {
  return (
    <div className="rounded-xl p-5" style={cardStyle}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: muted }}>{title}</p>
          <p className={`text-3xl font-bold ${highlight || 'text-white'}`}>{value}</p>
          {subtitle && <p className="text-xs mt-1" style={{ color: 'hsl(215,20%,50%)' }}>{subtitle}</p>}
        </div>
        {Icon && <Icon className={`w-5 h-5 mt-1 ${iconColor || 'text-gray-500'}`} />}
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: muted }}>{subtitle}</p>}
    </div>
  );
}

function ExportBtn({ onCSV, onPDF }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:opacity-80"
        style={{ background: 'hsl(217,33%,22%)', color: 'hsl(215,20%,70%)' }}>
        <Download className="w-3 h-3" /> Exportar
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 rounded-lg shadow-xl py-1 min-w-[110px]"
          style={{ background: 'hsl(222,47%,16%)', border: '1px solid hsl(217,33%,25%)' }}>
          <button onClick={() => { onCSV(); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 text-white">CSV</button>
          <button onClick={() => { onPDF(); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 text-white">PDF (imprimir)</button>
        </div>
      )}
    </div>
  );
}

function MiniBar({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs truncate" style={{ color: muted, minWidth: 70, maxWidth: 90 }}>{label}</span>
      <div className="flex-1 rounded-full h-1.5" style={{ background: 'hsl(217,33%,20%)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold text-white w-5 text-right">{value}</span>
    </div>
  );
}

// Score badge — color por score 0-100
function ScoreBadge({ score }) {
  const color = score >= 75 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#f87171';
  const label = score >= 75 ? 'Alto' : score >= 50 ? 'Medio' : 'Bajo';
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: `${color}22`, color }}>
      {score} · {label}
    </span>
  );
}

// Compute a composite performance score per tech (0-100)
function computeScore(t) {
  const successRate = t.Asignadas > 0 ? (t.Finalizadas / t.Asignadas) * 100 : 0;
  const complexityBonus = Math.min(t.complexityScore / Math.max(t.Asignadas, 1) * 10, 30); // up to 30 pts
  const volumeScore = Math.min(t.Asignadas * 2, 30); // up to 30 pts for volume
  const speedScore = t.avgHrs !== '—' ? Math.max(0, 40 - parseFloat(t.avgHrs)) : 0; // faster = more pts, up to 40
  return Math.min(100, Math.round((successRate * 0.4) + (complexityBonus) + (volumeScore * 0.2) + (speedScore * 0.1)));
}

export default function Analysis() {
  const [periodFilter, setPeriodFilter] = useState('all');
  const [techFilter, setTechFilter] = useState('all');
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeTab, setActiveTab] = useState('solicitudes');

  const { data: requests = [] } = useQuery({
    queryKey: ['requests-analysis'],
    queryFn: () => base44.entities.Request.filter({ is_deleted: false }, '-created_date', 500),
  });
  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });
  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.list('-created_date', 500),
  });

  const techs = users.filter(u => u.role === 'admin' || u.role === 'support');

  const periodFiltered = useMemo(() => {
    let r = requests;
    const now = new Date();
    if (periodFilter === '7d') r = r.filter(x => new Date(x.created_date) > new Date(now - 7 * 86400000));
    if (periodFilter === '30d') r = r.filter(x => new Date(x.created_date) > new Date(now - 30 * 86400000));
    if (periodFilter === '90d') r = r.filter(x => new Date(x.created_date) > new Date(now - 90 * 86400000));
    if (techFilter !== 'all') r = r.filter(x => x.assigned_to_id === techFilter);
    return r;
  }, [requests, periodFilter, techFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    const total = periodFiltered.length;
    const finalizada = periodFiltered.filter(r => r.status === 'Finalizada').length;
    const enProgreso = periodFiltered.filter(r => r.status === 'En progreso').length;
    const enRevision = periodFiltered.filter(r => r.status === 'En revisión').length;
    const pendiente = periodFiltered.filter(r => r.status === 'Pendiente').length;
    const rechazada = periodFiltered.filter(r => r.status === 'Rechazada').length;
    const vencidas = periodFiltered.filter(r =>
      r.estimated_due && new Date(r.estimated_due) < now &&
      r.status !== 'Finalizada' && r.status !== 'Rechazada'
    ).length;
    const withTime = periodFiltered.filter(r => r.status === 'Finalizada' && r.completion_date && r.created_date);
    const avgResolutionHrs = withTime.length > 0
      ? (withTime.reduce((s, r) => s + (new Date(r.completion_date) - new Date(r.created_date)), 0) / withTime.length / 3600000).toFixed(1)
      : '—';
    const resolutionRate = total > 0 ? Math.round((finalizada / total) * 100) : 0;
    const activeTechs = techs.filter(t => periodFiltered.some(r => r.assigned_to_id === t.email));
    const avgPerTech = activeTechs.length > 0 ? (total / activeTechs.length).toFixed(1) : '0';
    const finishedPerTech = activeTechs.length > 0 ? (finalizada / activeTechs.length).toFixed(1) : '0';

    const byPriority = ['Alta', 'Media', 'Baja'].map(p => ({ name: p, value: periodFiltered.filter(r => r.priority === p).length }));
    const byLevel = ['Fácil', 'Medio', 'Difícil'].map(l => ({ name: l, value: periodFiltered.filter(r => r.level === l).length }));
    const byRequestType = ['Desarrollo', 'Corrección de errores', 'Mejora funcional', 'Mejora visual', 'Migración', 'Automatización']
      .map(t => ({ name: t, value: periodFiltered.filter(r => r.request_type === t).length }));

    const byStatus = ['Pendiente', 'En progreso', 'En revisión', 'Finalizada', 'Rechazada'].map(s => ({ name: s, value: periodFiltered.filter(r => r.status === s).length }));

    const deptMap = {};
    periodFiltered.forEach(r => r.department_names?.forEach(d => {
      if (!deptMap[d]) deptMap[d] = { total: 0, Finalizadas: 0, Pendientes: 0, 'En progreso': 0 };
      deptMap[d].total++;
      if (r.status === 'Finalizada') deptMap[d].Finalizadas++;
      else if (r.status === 'Pendiente') deptMap[d].Pendientes++;
      else if (r.status === 'En progreso') deptMap[d]['En progreso']++;
    }));
    const byDept = Object.entries(deptMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total);

    const weeklyTrend = Array.from({ length: 8 }, (_, i) => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (7 - i) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return {
        week: `S${i + 1}`,
        Creadas: requests.filter(r => { const d = new Date(r.created_date); return d >= weekStart && d < weekEnd; }).length,
        Finalizadas: requests.filter(r => { const d = r.completion_date ? new Date(r.completion_date) : null; return d && d >= weekStart && d < weekEnd; }).length,
      };
    });

    // Daily trend (last 14 days)
    const dailyTrend = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i));
      const dateStr = d.toLocaleDateString('es', { day: '2-digit', month: '2-digit' });
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      return {
        day: dateStr,
        Creadas: requests.filter(r => { const x = new Date(r.created_date); return x >= dayStart && x < dayEnd; }).length,
        Finalizadas: requests.filter(r => { const x = r.completion_date ? new Date(r.completion_date) : null; return x && x >= dayStart && x < dayEnd; }).length,
      };
    });

    return { total, finalizada, enProgreso, enRevision, pendiente, rechazada, vencidas, avgResolutionHrs, resolutionRate, activeTechs, avgPerTech, finishedPerTech, byPriority, byLevel, byRequestType, byStatus, byDept, weeklyTrend, dailyTrend };
  }, [periodFiltered, requests, techs]);

  // Rich tech productivity with complexity metrics
  const techProductivity = useMemo(() => techs.map(t => {
    const assigned = periodFiltered.filter(r => r.assigned_to_id === t.email);
    const finished = assigned.filter(r => r.status === 'Finalizada');
    const withTime = finished.filter(r => r.completion_date && r.created_date);
    const avgHrs = withTime.length > 0
      ? (withTime.reduce((s, r) => s + (new Date(r.completion_date) - new Date(r.created_date)), 0) / withTime.length / 3600000).toFixed(1)
      : '—';

    // Complexity score: sum of level weights for finished tasks
    const complexityScore = finished.reduce((s, r) => s + (LEVEL_WEIGHT[r.level] || 1), 0);
    const difficultCount = assigned.filter(r => r.level === 'Difícil').length;
    const mediumCount = assigned.filter(r => r.level === 'Medio').length;
    const easyCount = assigned.filter(r => r.level === 'Fácil').length;

    // On-time rate: finished before estimated_due
    const withDue = finished.filter(r => r.estimated_due && r.completion_date);
    const onTimeCount = withDue.filter(r => new Date(r.completion_date) <= new Date(r.estimated_due)).length;
    const onTimeRate = withDue.length > 0 ? Math.round((onTimeCount / withDue.length) * 100) : null;

    // Requests by type
    const byReqType = {};
    assigned.forEach(r => {
      if (r.request_type) byReqType[r.request_type] = (byReqType[r.request_type] || 0) + 1;
    });

    return {
      name: t.full_name || t.email,
      email: t.email,
      Asignadas: assigned.length,
      'En progreso': assigned.filter(r => r.status === 'En progreso').length,
      'En revisión': assigned.filter(r => r.status === 'En revisión').length,
      Finalizadas: finished.length,
      Pendientes: assigned.filter(r => r.status === 'Pendiente').length,
      Rechazadas: assigned.filter(r => r.status === 'Rechazada').length,
      avgHrs,
      complexityScore,
      difficultCount,
      mediumCount,
      easyCount,
      onTimeRate,
      byReqType,
    };
  }).filter(t => t.Asignadas > 0), [periodFiltered, techs]);

  const ranking = useMemo(() => {
    return [...techProductivity].map(t => ({ ...t, score: computeScore(t) }))
      .sort((a, b) => b.score - a.score);
  }, [techProductivity]);

  const distData = techProductivity.map(t => ({
    name: t.name.split(' ')[0],
    Difícil: t.difficultCount,
    Medio: t.mediumCount,
    Fácil: t.easyCount,
  }));

  const resolutionByTech = techProductivity
    .filter(t => t.avgHrs !== '—')
    .map(t => ({ name: t.name.split(' ')[0], horas: parseFloat(t.avgHrs) }))
    .sort((a, b) => a.horas - b.horas);

  const maxFin = ranking[0]?.Finalizadas || 1;
  const maxScore = ranking[0]?.score || 1;

  const exportRankingCSV = () => exportCSV('ranking_tecnicos',
    ['Pos.', 'Técnico', 'Score', 'Finalizadas', 'Asignadas', 'Tasa éxito', 'Complejidad', 'Prom.h', 'A tiempo %'],
    ranking.map((t, i) => {
      const rate = t.Asignadas > 0 ? Math.round((t.Finalizadas / t.Asignadas) * 100) : 0;
      return [i + 1, t.name, t.score, t.Finalizadas, t.Asignadas, `${rate}%`, t.complexityScore, t.avgHrs, t.onTimeRate !== null ? `${t.onTimeRate}%` : '—'];
    })
  );
  const exportRankingPDF = () => exportTablePDF('Ranking de Técnicos',
    ['Pos.', 'Técnico', 'Score', 'Finalizadas', 'Asignadas', 'Tasa éxito', 'Complejidad', 'Prom.h', 'A tiempo %'],
    ranking.map((t, i) => {
      const rate = t.Asignadas > 0 ? Math.round((t.Finalizadas / t.Asignadas) * 100) : 0;
      return [i + 1, t.name, t.score, t.Finalizadas, t.Asignadas, `${rate}%`, t.complexityScore, t.avgHrs, t.onTimeRate !== null ? `${t.onTimeRate}%` : '—'];
    })
  );
  const exportProdCSV = () => exportCSV('productividad_tecnicos',
    ['Técnico', 'Asignadas', 'Finalizadas', 'En progreso', 'Rechazadas', 'Prom.h', 'Complejidad', 'Difíciles', 'Medios', 'Fáciles', 'A tiempo%'],
    techProductivity.map(t => [t.name, t.Asignadas, t.Finalizadas, t['En progreso'], t.Rechazadas, t.avgHrs, t.complexityScore, t.difficultCount, t.mediumCount, t.easyCount, t.onTimeRate !== null ? `${t.onTimeRate}%` : '—'])
  );
  const exportProdPDF = () => exportTablePDF('Productividad por Técnico',
    ['Técnico', 'Asignadas', 'Finalizadas', 'En progreso', 'Rechazadas', 'Prom.h', 'Complejidad', 'A tiempo%'],
    techProductivity.map(t => [t.name, t.Asignadas, t.Finalizadas, t['En progreso'], t.Rechazadas, t.avgHrs, t.complexityScore, t.onTimeRate !== null ? `${t.onTimeRate}%` : '—'])
  );
  const exportDeptCSV = () => exportCSV('solicitudes_departamento',
    ['Departamento', 'Total', 'Finalizadas', 'En progreso', 'Pendientes'],
    stats.byDept.map(d => [d.name, d.total, d.Finalizadas, d['En progreso'], d.Pendientes])
  );
  const exportDeptPDF = () => exportTablePDF('Solicitudes por Departamento',
    ['Departamento', 'Total', 'Finalizadas', 'En progreso', 'Pendientes'],
    stats.byDept.map(d => [d.name, d.total, d.Finalizadas, d['En progreso'], d.Pendientes])
  );

  // Incident metrics by tech
  const incidentsByTech = useMemo(() => techs.map(t => {
    const assigned = incidents.filter(i => i.assigned_to === t.email);
    const resolved = assigned.filter(i => i.status === 'Resuelto');
    const withHrs = resolved.filter(i => i.resolution_hours);
    const avgHrs = withHrs.length > 0
      ? (withHrs.reduce((s, i) => s + i.resolution_hours, 0) / withHrs.length).toFixed(1)
      : '—';
    const pending = assigned.filter(i => i.status === 'Pendiente').length;
    const inProgress = assigned.filter(i => i.status === 'En atención').length;
    return { name: t.full_name || t.email, email: t.email, Asignadas: assigned.length, Resueltas: resolved.length, Pendientes: pending, 'En atención': inProgress, avgHrs };
  }).filter(t => t.Asignadas > 0), [incidents, techs]);

  const incidentStats = useMemo(() => {
    const total = incidents.length;
    const resolved = incidents.filter(i => i.status === 'Resuelto').length;
    const pending = incidents.filter(i => i.status === 'Pendiente').length;
    const inProgress = incidents.filter(i => i.status === 'En atención').length;
    const withHrs = incidents.filter(i => i.resolution_hours);
    const avgHrs = withHrs.length > 0 ? (withHrs.reduce((s, i) => s + i.resolution_hours, 0) / withHrs.length).toFixed(1) : '—';
    const byCategory = {};
    incidents.forEach(i => { if (i.category) byCategory[i.category] = (byCategory[i.category] || 0) + 1; });
    const byCategoryArr = Object.entries(byCategory).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    const byImpact = {};
    incidents.forEach(i => { if (i.impact) { const k = i.impact.split(' - ')[0]; byImpact[k] = (byImpact[k] || 0) + 1; } });
    const byImpactArr = Object.entries(byImpact).map(([name, value]) => ({ name, value }));
    return { total, resolved, pending, inProgress, avgHrs, byCategoryArr, byImpactArr, resolutionRate: total > 0 ? Math.round((resolved/total)*100) : 0 };
  }, [incidents]);

  const tabStyle = (t) => ({
    color: activeTab === t ? 'white' : 'hsl(215,20%,55%)',
    borderBottom: activeTab === t ? '2px solid hsl(217,91%,60%)' : '2px solid transparent',
    paddingBottom: 8,
    cursor: 'pointer',
    fontWeight: activeTab === t ? 700 : 400,
    fontSize: 13,
    background: 'none',
    border: 'none',
    outline: 'none',
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-white">Dashboard & Análisis</h2>
        <div className="flex gap-2 flex-wrap">
          <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs outline-none cursor-pointer" style={selectStyle}>
            <option value="all">Todos los tiempos</option>
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
          </select>
          <select value={techFilter} onChange={e => setTechFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs outline-none cursor-pointer" style={selectStyle}>
            <option value="all">Todos los técnicos</option>
            {techs.map(t => <option key={t.email} value={t.email}>{t.full_name || t.email}</option>)}
          </select>
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90"
            style={{ background: 'hsl(217,91%,40%)', color: 'white' }}
          >
            <Mail className="w-3.5 h-3.5" /> Enviar Reporte
          </button>
        </div>
      </div>

      {showReportModal && (
        <ScheduledReportModal onClose={() => setShowReportModal(false)} stats={stats} techProductivity={techProductivity} requests={periodFiltered} />
      )}

      {/* Tabs */}
      <div className="flex gap-6 border-b" style={{ borderColor: 'hsl(217,33%,18%)' }}>
        <button style={tabStyle('solicitudes')} onClick={() => setActiveTab('solicitudes')}>Solicitudes</button>
        <button style={tabStyle('incidencias')} onClick={() => setActiveTab('incidencias')}>Incidencias</button>
      </div>

      {activeTab === 'incidencias' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard title="Total incidencias" value={incidentStats.total} subtitle="Registradas" icon={FileText} iconColor="text-gray-400" />
            <StatCard title="Resueltas" value={incidentStats.resolved} subtitle={`Tasa ${incidentStats.resolutionRate}%`} icon={CheckCircle2} iconColor="text-green-400" highlight="text-green-400" />
            <StatCard title="En atención" value={incidentStats.inProgress} icon={Loader2} iconColor="text-blue-400" highlight="text-blue-400" />
            <StatCard title="Tiempo prom. resolución" value={incidentStats.avgHrs !== '—' ? `${incidentStats.avgHrs}h` : '—'} subtitle="Para resueltas" icon={AlarmClock} iconColor="text-orange-400" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl p-5" style={cardStyle}>
              <SectionTitle title="Por categoría" />
              <div className="space-y-2">
                {incidentStats.byCategoryArr.map(c => (
                  <MiniBar key={c.name} label={c.name} value={c.value} max={incidentStats.total} color="#818cf8" />
                ))}
                {incidentStats.byCategoryArr.length === 0 && <p className="text-xs" style={{ color: muted }}>Sin datos</p>}
              </div>
            </div>
            <div className="rounded-xl p-5" style={cardStyle}>
              <SectionTitle title="Por nivel de impacto" />
              <div className="space-y-2">
                {incidentStats.byImpactArr.map(imp => (
                  <MiniBar key={imp.name} label={imp.name} value={imp.value} max={incidentStats.total}
                    color={imp.name === 'Crítico' ? '#f87171' : imp.name === 'Alto' ? '#fb923c' : imp.name === 'Medio' ? '#fbbf24' : '#4ade80'} />
                ))}
                {incidentStats.byImpactArr.length === 0 && <p className="text-xs" style={{ color: muted }}>Sin datos</p>}
              </div>
            </div>
          </div>
          {incidentsByTech.length > 0 && (
            <div className="rounded-xl p-5" style={cardStyle}>
              <SectionTitle title="Desempeño de técnicos en incidencias" subtitle="Incidencias atendidas, resueltas y tiempo promedio" />
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[500px]">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(217,33%,22%)' }}>
                      {['Técnico', 'Asignadas', 'Resueltas', 'En atención', 'Pendientes', 'Tasa éxito', 'Prom. horas'].map(h => (
                        <th key={h} className="text-left py-2 px-2 font-medium" style={{ color: 'hsl(215,20%,45%)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {incidentsByTech.map((t, i) => {
                      const rate = t.Asignadas > 0 ? Math.round((t.Resueltas / t.Asignadas) * 100) : 0;
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid hsl(217,33%,16%)' }}>
                          <td className="py-2 px-2 text-blue-400 font-medium">{t.name}</td>
                          <td className="py-2 px-2 text-white">{t.Asignadas}</td>
                          <td className="py-2 px-2 text-green-400 font-semibold">{t.Resueltas}</td>
                          <td className="py-2 px-2 text-blue-300">{t['En atención']}</td>
                          <td className="py-2 px-2 text-yellow-400">{t.Pendientes}</td>
                          <td className="py-2 px-2"><span className={`font-semibold ${rate >= 70 ? 'text-green-400' : rate >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{rate}%</span></td>
                          <td className="py-2 px-2 text-orange-300">{t.avgHrs !== '—' ? `${t.avgHrs}h` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'solicitudes' && (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard title="Total solicitudes" value={stats.total} subtitle="En el periodo" icon={FileText} iconColor="text-gray-400" />
            <StatCard title="Finalizadas" value={stats.finalizada} subtitle={`Tasa ${stats.resolutionRate}%`} icon={CheckCircle2} iconColor="text-green-400" highlight="text-green-400" />
            <StatCard title="En progreso" value={stats.enProgreso} icon={Loader2} iconColor="text-blue-400" highlight="text-blue-400" />
            <StatCard title="Pendientes" value={stats.pendiente} icon={Clock} iconColor="text-yellow-400" highlight="text-yellow-400" />
            <StatCard title="En revisión" value={stats.enRevision} icon={Eye} iconColor="text-purple-400" highlight="text-purple-400" />
            <StatCard title="Rechazadas" value={stats.rechazada} icon={XCircle} iconColor="text-red-400" highlight="text-red-400" />
            <StatCard title="Tiempo prom. resolución" value={stats.avgResolutionHrs === '—' ? '—' : `${stats.avgResolutionHrs}h`} subtitle="Para finalizadas" icon={AlarmClock} iconColor="text-orange-400" />
            <StatCard title="⚠ Vencidas" value={stats.vencidas} subtitle="Fecha compromiso expirada" icon={AlertTriangle} iconColor="text-orange-400" highlight={stats.vencidas > 0 ? 'text-orange-400' : 'text-white'} />
          </div>

          {/* Daily trend */}
          <div className="rounded-xl p-5" style={cardStyle}>
            <SectionTitle title="Tendencia diaria" subtitle="Solicitudes creadas vs finalizadas (últimos 14 días)" />
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={stats.dailyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,33%,20%)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: muted }} />
                <YAxis tick={{ fontSize: 10, fill: muted }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: muted }} />
                <Line type="monotone" dataKey="Creadas" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Finalizadas" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Ranking */}
          {ranking.length > 0 && (
            <div className="rounded-xl p-5" style={cardStyle}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Award className="w-4 h-4 text-yellow-400" /> Ranking de Técnicos de Soporte</h3>
                  <p className="text-xs mt-0.5" style={{ color: muted }}>Score compuesto: volumen × tasa éxito × complejidad × velocidad de ejecución</p>
                </div>
                <ExportBtn onCSV={exportRankingCSV} onPDF={exportRankingPDF} />
              </div>
              <div className="space-y-3">
                {ranking.map((t, i) => {
                  const rate = t.Asignadas > 0 ? Math.round((t.Finalizadas / t.Asignadas) * 100) : 0;
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <div key={t.email} className="rounded-xl p-4" style={{ background: i === 0 ? 'hsl(38,40%,13%)' : 'hsl(222,47%,13%)', border: `1px solid ${i === 0 ? 'hsl(38,60%,25%)' : 'hsl(217,33%,20%)'}` }}>
                      <div className="flex items-start gap-4 flex-wrap">
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <span className="text-lg">{medals[i] || `#${i + 1}`}</span>
                          <div>
                            <p className="text-sm font-bold text-white">{t.name}</p>
                            <p className="text-[10px]" style={{ color: muted }}>{t.email}</p>
                          </div>
                        </div>
                        <div className="flex-1 min-w-[120px]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px]" style={{ color: muted }}>Score global</span>
                            <ScoreBadge score={t.score} />
                          </div>
                          <div className="w-full rounded-full h-2" style={{ background: 'hsl(217,33%,20%)' }}>
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${t.score}%`, background: t.score >= 75 ? '#4ade80' : t.score >= 50 ? '#fbbf24' : '#f87171' }} />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 w-full mt-1">
                          <MetricCell label="Asignadas" value={t.Asignadas} color="#60a5fa" icon={<Target className="w-3 h-3" />} />
                          <MetricCell label="Finalizadas" value={t.Finalizadas} color="#4ade80" icon={<CheckCircle2 className="w-3 h-3" />} />
                          <MetricCell label="Tasa éxito" value={`${rate}%`} color={rate >= 70 ? '#4ade80' : rate >= 40 ? '#fbbf24' : '#f87171'} icon={<Percent className="w-3 h-3" />} />
                          <MetricCell label="Prom. horas" value={t.avgHrs !== '—' ? `${t.avgHrs}h` : '—'} color="#fb923c" icon={<AlarmClock className="w-3 h-3" />} />
                          <MetricCell label="Complejidad" value={t.complexityScore} color="#c084fc" icon={<Zap className="w-3 h-3" />} />
                          <MetricCell label="A tiempo" value={t.onTimeRate !== null ? `${t.onTimeRate}%` : '—'} color={t.onTimeRate >= 80 ? '#4ade80' : t.onTimeRate >= 50 ? '#fbbf24' : '#f87171'} icon={<TrendingUp className="w-3 h-3" />} />
                        </div>
                        <div className="w-full mt-1 space-y-1">
                          <p className="text-[10px] font-medium" style={{ color: muted }}>Distribución por dificultad</p>
                          <div className="flex gap-3">
                            {[['Fácil', t.easyCount, '#4ade80'], ['Medio', t.mediumCount, '#fbbf24'], ['Difícil', t.difficultCount, '#f87171']].map(([l, v, c]) => (
                              <span key={l} className="flex items-center gap-1 text-xs" style={{ color: c }}>
                                <span className="w-2 h-2 rounded-full inline-block" style={{ background: c }} />
                                {l}: <strong>{v}</strong>
                              </span>
                            ))}
                            {Object.entries(t.byReqType).length > 0 && (
                              <span className="text-[10px] ml-auto" style={{ color: muted }}>
                                {Object.entries(t.byReqType).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Productivity table */}
          {techProductivity.length > 0 && (
            <div className="rounded-xl p-5" style={cardStyle}>
              <div className="flex items-center justify-between mb-3">
                <SectionTitle title="Tabla de métricas por técnico" subtitle="Detalle completo de rendimiento individual" />
                <ExportBtn onCSV={exportProdCSV} onPDF={exportProdPDF} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[800px]">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(217,33%,22%)' }}>
                      {['Técnico', 'Asignadas', 'Finalizadas', 'En progreso', 'Rechazadas', 'Tasa éxito', 'Prom. horas', 'A tiempo', 'Score complejidad', 'Difícil', 'Medio', 'Fácil'].map(h => (
                        <th key={h} className="text-left py-2 px-2 font-medium" style={{ color: 'hsl(215,20%,45%)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {techProductivity.map((t, i) => {
                      const rate = t.Asignadas > 0 ? Math.round((t.Finalizadas / t.Asignadas) * 100) : 0;
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid hsl(217,33%,16%)' }}>
                          <td className="py-2 px-2 text-blue-400 font-medium">{t.name}</td>
                          <td className="py-2 px-2 text-white">{t.Asignadas}</td>
                          <td className="py-2 px-2 text-green-400 font-semibold">{t.Finalizadas}</td>
                          <td className="py-2 px-2 text-blue-300">{t['En progreso']}</td>
                          <td className="py-2 px-2 text-red-400">{t.Rechazadas}</td>
                          <td className="py-2 px-2"><span className={`font-semibold ${rate >= 70 ? 'text-green-400' : rate >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{rate}%</span></td>
                          <td className="py-2 px-2 text-orange-300">{t.avgHrs !== '—' ? `${t.avgHrs}h` : '—'}</td>
                          <td className="py-2 px-2" style={{ color: t.onTimeRate >= 80 ? '#4ade80' : t.onTimeRate >= 50 ? '#fbbf24' : '#f87171' }}>
                            {t.onTimeRate !== null ? `${t.onTimeRate}%` : '—'}
                          </td>
                          <td className="py-2 px-2 text-purple-300 font-semibold">{t.complexityScore}</td>
                          <td className="py-2 px-2" style={{ color: '#f87171' }}>{t.difficultCount}</td>
                          <td className="py-2 px-2" style={{ color: '#fbbf24' }}>{t.mediumCount}</td>
                          <td className="py-2 px-2" style={{ color: '#4ade80' }}>{t.easyCount}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Complexity + resolution charts */}
          {distData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl p-5" style={cardStyle}>
                <SectionTitle title="Dificultad atendida por técnico" subtitle="Distribución de tareas Fácil / Medio / Difícil" />
                <ResponsiveContainer width="100%" height={Math.max(120, distData.length * 40)}>
                  <BarChart data={distData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: muted }} />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fill: muted }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="Fácil" stackId="a" fill="#4ade80" />
                    <Bar dataKey="Medio" stackId="a" fill="#fbbf24" />
                    <Bar dataKey="Difícil" stackId="a" fill="#f87171" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {resolutionByTech.length > 0 && (
                <div className="rounded-xl p-5" style={cardStyle}>
                  <SectionTitle title="Tiempo de resolución por técnico" subtitle="Promedio de horas hasta finalización" />
                  <ResponsiveContainer width="100%" height={Math.max(120, resolutionByTech.length * 40)}>
                    <BarChart data={resolutionByTech} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                      <XAxis type="number" tick={{ fontSize: 10, fill: muted }} unit="h" />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fill: muted }} />
                      <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v}h`, 'Prom. resolución']} />
                      <Bar dataKey="horas" fill="#f97316" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Weekly trend */}
          <div className="rounded-xl p-5" style={cardStyle}>
            <SectionTitle title="Tendencia semanal" subtitle="Solicitudes creadas vs finalizadas (últimas 8 semanas)" />
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={stats.weeklyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,33%,20%)" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: muted }} />
                <YAxis tick={{ fontSize: 10, fill: muted }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="Creadas" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Finalizadas" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: muted }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Distribution cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl p-4" style={cardStyle}>
              <SectionTitle title="Por prioridad" />
              <div className="space-y-2">
                {stats.byPriority.map(p => (
                  <MiniBar key={p.name} label={p.name} value={p.value} max={stats.total} color={PRIORITY_COLORS[p.name]} />
                ))}
              </div>
            </div>
            <div className="rounded-xl p-4" style={cardStyle}>
              <SectionTitle title="Por dificultad" />
              <div className="space-y-2">
                {stats.byLevel.map(l => (
                  <MiniBar key={l.name} label={l.name} value={l.value} max={stats.total} color={LEVEL_COLORS[l.name]} />
                ))}
              </div>
            </div>
            <div className="rounded-xl p-4" style={cardStyle}>
              <SectionTitle title="Por tipo de solicitud" />
              <div className="space-y-2">
                {stats.byRequestType.filter(t => t.value > 0).map(t => (
                  <MiniBar key={t.name} label={t.name.replace('Corrección de errores', 'Corrección')} value={t.value} max={stats.total} color={REQUEST_TYPE_COLORS[t.name]} />
                ))}
                {stats.byRequestType.every(t => t.value === 0) && <p className="text-xs" style={{ color: muted }}>Sin datos aún</p>}
              </div>
            </div>
            <div className="rounded-xl p-4" style={cardStyle}>
              <SectionTitle title="Por estado" />
              <div className="space-y-2">
                {stats.byStatus.map(s => (
                  <MiniBar key={s.name} label={s.name} value={s.value} max={stats.total} color={STATUS_COLORS[s.name]} />
                ))}
              </div>
            </div>
          </div>

          {/* By dept */}
          {stats.byDept.length > 0 && (
            <div className="rounded-xl p-5" style={cardStyle}>
              <div className="flex items-center justify-between mb-1">
                <SectionTitle title="Solicitudes por departamento" />
                <ExportBtn onCSV={exportDeptCSV} onPDF={exportDeptPDF} />
              </div>
              <ResponsiveContainer width="100%" height={Math.max(160, stats.byDept.length * 40)}>
                <BarChart data={stats.byDept} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: muted }} />
                  <YAxis tick={{ fontSize: 10, fill: muted }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 10, color: muted }} />
                  <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Finalizadas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="En progreso" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Pendientes" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCell({ label, value, color, icon }) {
  return (
    <div className="flex flex-col items-center rounded-lg px-2 py-2" style={{ background: 'hsl(222,47%,16%)' }}>
      <span className="flex items-center gap-1 mb-1" style={{ color }}>{icon}<span className="text-[10px]">{label}</span></span>
      <span className="text-sm font-bold" style={{ color }}>{value}</span>
    </div>
  );
}