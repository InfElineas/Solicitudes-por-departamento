import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Search, RotateCcw, Filter } from 'lucide-react';
import { toast } from 'sonner';

const cardStyle = { background: 'hsl(222,47%,12%)', border: '1px solid hsl(217,33%,18%)' };
const muted = 'hsl(215,20%,55%)';

const ENTITY_LABELS = { request: 'Solicitud', incident: 'Incidencia', activo: 'Activo' };
const ACTION_COLORS = {
  create: { bg: 'hsl(142,60%,16%)', text: '#4ade80', label: 'Creado' },
  update: { bg: 'hsl(217,60%,18%)', text: '#60a5fa', label: 'Modificado' },
  delete: { bg: 'hsl(0,50%,18%)', text: '#f87171', label: 'Eliminado' },
  status_change: { bg: 'hsl(270,50%,18%)', text: '#c084fc', label: 'Estado' },
};
const ENTITY_COLORS = { request: '#60a5fa', incident: '#fbbf24', activo: '#34d399' };

function RestoreModal({ log, onClose, onRestored }) {
  const [restoring, setRestoring] = useState(false);

  const handleRestore = async () => {
    if (!log.snapshot) { toast.error('No hay snapshot disponible para restaurar'); return; }
    setRestoring(true);
    const data = JSON.parse(log.snapshot);
    const { id, created_date, updated_date, created_by, ...restoreData } = data;
    if (log.entity_type === 'request') {
      await base44.entities.Request.update(log.entity_id, restoreData);
    } else if (log.entity_type === 'incident') {
      await base44.entities.Incident.update(log.entity_id, restoreData);
    } else if (log.entity_type === 'activo') {
      await base44.entities.Activo.update(log.entity_id, restoreData);
    }
    setRestoring(false);
    toast.success('Estado restaurado correctamente');
    onRestored();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="rounded-xl p-6 w-full max-w-sm" style={{ background: 'hsl(222,47%,14%)', border: '1px solid hsl(217,33%,22%)' }} onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-white mb-1">¿Restaurar estado anterior?</h3>
        <p className="text-xs mb-1" style={{ color: muted }}>Entidad: <strong className="text-white">{log.entity_title}</strong></p>
        <p className="text-xs mb-4" style={{ color: muted }}>
          Esto aplicará el snapshot del {new Date(log.created_date).toLocaleString('es')} sobre el registro actual.
        </p>
        {!log.snapshot && (
          <p className="text-xs text-red-400 mb-3">⚠ No hay snapshot disponible para este registro.</p>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-gray-300 hover:bg-white/10">Cancelar</button>
          <button onClick={handleRestore} disabled={restoring || !log.snapshot}
            className="px-4 py-2 text-sm rounded-lg text-white font-medium disabled:opacity-50"
            style={{ background: 'hsl(217,91%,45%)' }}>
            {restoring ? 'Restaurando...' : 'Restaurar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuditLog() {
  const [search, setSearch] = useState('');
  const [filterEntity, setFilterEntity] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [restoreLog, setRestoreLog] = useState(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;
  const qc = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 500),
  });

  const filtered = useMemo(() => {
    let l = logs;
    if (filterEntity !== 'all') l = l.filter(x => x.entity_type === filterEntity);
    if (filterAction !== 'all') l = l.filter(x => x.action === filterAction);
    if (search) {
      const s = search.toLowerCase();
      l = l.filter(x =>
        x.entity_title?.toLowerCase().includes(s) ||
        x.by_user_name?.toLowerCase().includes(s) ||
        x.field_changed?.toLowerCase().includes(s) ||
        x.new_value?.toLowerCase().includes(s)
      );
    }
    return l;
  }, [logs, filterEntity, filterAction, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const selectStyle = { background: 'hsl(222,47%,14%)', border: '1px solid hsl(217,33%,22%)', color: 'hsl(215,20%,70%)' };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" /> Registro de Auditoría
          </h1>
          <p className="text-xs mt-0.5" style={{ color: muted }}>Historial completo de cambios en el sistema</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(ACTION_COLORS).map(([key, cfg]) => {
          const count = logs.filter(l => l.action === key).length;
          return (
            <div key={key} className="rounded-xl p-3 cursor-pointer hover:opacity-80" style={cardStyle}
              onClick={() => setFilterAction(filterAction === key ? 'all' : key)}>
              <p className="text-xl font-bold" style={{ color: cfg.text }}>{count}</p>
              <p className="text-[10px] mt-0.5" style={{ color: muted }}>{cfg.label}s</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: muted }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Buscar por entidad, usuario, campo..."
            className="w-full pl-8 pr-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'hsl(222,47%,14%)', border: '1px solid hsl(217,33%,22%)', color: 'white' }} />
        </div>
        <select value={filterEntity} onChange={e => { setFilterEntity(e.target.value); setPage(0); }} className="px-3 py-2 rounded-lg text-xs outline-none cursor-pointer" style={selectStyle}>
          <option value="all">Todas las entidades</option>
          {Object.entries(ENTITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(0); }} className="px-3 py-2 rounded-lg text-xs outline-none cursor-pointer" style={selectStyle}>
          <option value="all">Todas las acciones</option>
          {Object.entries(ACTION_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <span className="text-xs" style={{ color: muted }}>{filtered.length} registros</span>
      </div>

      {/* Log list */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-500">Cargando auditoría...</div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-16 rounded-xl text-gray-500" style={cardStyle}>
          <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin registros de auditoría</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {paginated.map(log => {
            const actionCfg = ACTION_COLORS[log.action] || ACTION_COLORS.update;
            const entityColor = ENTITY_COLORS[log.entity_type] || '#94a3b8';
            return (
              <div key={log.id} className="rounded-xl px-4 py-3 flex items-start gap-3 flex-wrap" style={cardStyle}>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: actionCfg.bg, color: actionCfg.text }}>
                    {actionCfg.label}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${entityColor}22`, color: entityColor }}>
                    {ENTITY_LABELS[log.entity_type] || log.entity_type}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{log.entity_title}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs mt-0.5" style={{ color: muted }}>
                    {log.field_changed && <span>Campo: <strong className="text-white">{log.field_changed}</strong></span>}
                    {log.old_value && <span>Antes: <span className="text-red-300">{log.old_value.slice(0, 40)}</span></span>}
                    {log.new_value && <span>Después: <span className="text-green-300">{log.new_value.slice(0, 40)}</span></span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-white">{log.by_user_name}</p>
                  <p className="text-[10px]" style={{ color: muted }}>{new Date(log.created_date).toLocaleString('es')}</p>
                  {log.snapshot && (
                    <button onClick={() => setRestoreLog(log)}
                      className="mt-1 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded hover:opacity-80"
                      style={{ background: 'hsl(217,33%,22%)', color: '#60a5fa' }}>
                      <RotateCcw className="w-2.5 h-2.5" /> Restaurar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-center gap-3 text-xs" style={{ color: muted }}>
        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 rounded hover:bg-white/10 disabled:opacity-30">Anterior</button>
        <span>Página {page + 1} / {totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 rounded hover:bg-white/10 disabled:opacity-30">Siguiente</button>
      </div>

      {restoreLog && (
        <RestoreModal log={restoreLog} onClose={() => setRestoreLog(null)} onRestored={() => { setRestoreLog(null); qc.invalidateQueries({ queryKey: ['audit-logs'] }); }} />
      )}
    </div>
  );
}