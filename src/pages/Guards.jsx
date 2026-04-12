import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus, Clock, CheckCircle2, X, AlertTriangle, RefreshCw, Ban, Edit3, Calendar } from 'lucide-react';
import MonthlyPlanner from '../components/guards/MonthlyPlanner';
import { toast } from 'sonner';

const inputStyle = { background: 'hsl(222,47%,16%)', border: '1px solid hsl(217,33%,26%)', color: 'white', outline: 'none' };
const cardStyle = { background: 'hsl(222,47%,12%)', border: '1px solid hsl(217,33%,18%)' };
const modalStyle = { background: 'hsl(222,47%,13%)', border: '1px solid hsl(217,33%,22%)' };
const labelCls = "text-xs font-medium text-gray-400 mb-1 block";
const inputCls = "w-full px-3 py-2 rounded-lg text-sm outline-none";
const muted = 'hsl(215,20%,55%)';

const ESTADO_COLORS = {
  programada: { bg: 'hsl(217,60%,18%)', text: '#60a5fa', label: 'Programada' },
  activa: { bg: 'hsl(142,60%,16%)', text: '#4ade80', label: 'Activa' },
  finalizada: { bg: 'hsl(217,33%,18%)', text: '#94a3b8', label: 'Finalizada' },
  cancelada: { bg: 'hsl(0,50%,18%)', text: '#f87171', label: 'Cancelada' },
  reemplazada: { bg: 'hsl(38,60%,18%)', text: '#fbbf24', label: 'Reemplazada' },
};

function getActiveGuardia(guardias) {
  const now = new Date();
  return guardias.find(g =>
    g.estado === 'activa' &&
    new Date(g.inicio) <= now &&
    new Date(g.fin) >= now
  ) || null;
}

function GuardiaForm({ guardia, techs, user, onClose, onSaved }) {
  const isEdit = !!guardia;
  const now = new Date();
  const defaultInicio = guardia?.inicio?.slice(0, 16) || new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const defaultFin = guardia?.fin?.slice(0, 16) || '';

  const [form, setForm] = useState({
    tecnico_id: guardia?.tecnico_id || '',
    inicio: defaultInicio,
    fin: defaultFin,
    tipo: guardia?.tipo || 'normal',
    estado: guardia?.estado || 'programada',
    observaciones: guardia?.observaciones || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const selectedTech = techs.find(t => t.email === form.tecnico_id);

  const handleSave = async () => {
    if (!form.tecnico_id || !form.inicio || !form.fin) {
      toast.error('Completa técnico, inicio y fin');
      return;
    }
    if (new Date(form.fin) <= new Date(form.inicio)) {
      toast.error('La fecha de fin debe ser posterior al inicio');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      tecnico_nombre: selectedTech?.full_name || selectedTech?.email || form.tecnico_id,
      inicio: new Date(form.inicio).toISOString(),
      fin: new Date(form.fin).toISOString(),
    };
    if (isEdit) {
      await base44.entities.Guardia.update(guardia.id, payload);
      // Notify tech if changed
      await base44.entities.Notification.create({
        user_id: form.tecnico_id,
        type: 'status_change',
        title: '🛡️ Guardia modificada',
        message: `Tu guardia del ${new Date(form.inicio).toLocaleString('es')} al ${new Date(form.fin).toLocaleString('es')} fue modificada.`,
        is_read: false,
      });
    } else {
      await base44.entities.Guardia.create({
        ...payload,
        creada_por: user?.email,
        creada_por_nombre: user?.full_name || user?.email,
      });
      // Notify assigned tech
      await base44.entities.Notification.create({
        user_id: form.tecnico_id,
        type: 'assigned',
        title: '🛡️ Fuiste asignado a una guardia',
        message: `Tienes una guardia ${form.tipo} del ${new Date(form.inicio).toLocaleString('es')} al ${new Date(form.fin).toLocaleString('es')}.`,
        is_read: false,
      });
    }
    setSaving(false);
    toast.success(isEdit ? 'Guardia actualizada' : 'Guardia creada');
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="rounded-xl p-6 w-full max-w-md" style={modalStyle} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">{isEdit ? 'Editar guardia' : 'Nueva guardia'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Técnico *</label>
            <select value={form.tecnico_id} onChange={e => set('tecnico_id', e.target.value)}
              className={inputCls + " cursor-pointer"} style={inputStyle}>
              <option value="">Seleccionar técnico...</option>
              {techs.map(t => <option key={t.email} value={t.email}>{t.full_name || t.email}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Inicio *</label>
              <input type="datetime-local" value={form.inicio} onChange={e => set('inicio', e.target.value)}
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls}>Fin *</label>
              <input type="datetime-local" value={form.fin} onChange={e => set('fin', e.target.value)}
                className={inputCls} style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tipo</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
                className={inputCls + " cursor-pointer"} style={inputStyle}>
                <option value="normal">Normal</option>
                <option value="urgencia">Urgencia</option>
                <option value="fin_de_semana">Fin de semana</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <select value={form.estado} onChange={e => set('estado', e.target.value)}
                className={inputCls + " cursor-pointer"} style={inputStyle}>
                <option value="programada">Programada</option>
                <option value="activa">Activa</option>
                <option value="finalizada">Finalizada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Observaciones</label>
            <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)}
              rows={2} className={inputCls + " resize-none"} style={inputStyle}
              placeholder="Notas adicionales..." />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-gray-300 hover:bg-white/10">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm rounded-lg text-white font-medium disabled:opacity-50"
            style={{ background: 'hsl(217,91%,45%)' }}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear guardia'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReplaceTechModal({ guardia, techs, user, onClose, onSaved }) {
  const [newTechId, setNewTechId] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleReplace = async () => {
    if (!newTechId) { toast.error('Selecciona un técnico'); return; }
    setSaving(true);
    const tech = techs.find(t => t.email === newTechId);
    // Mark old guardia as reemplazada
    await base44.entities.Guardia.update(guardia.id, {
      estado: 'reemplazada',
      reemplazado_por_id: newTechId,
      reemplazado_por_nombre: tech?.full_name || tech?.email,
      observaciones: (guardia.observaciones || '') + ` [Reemplazado por ${tech?.full_name || newTechId}: ${note}]`,
    });
    // Create new guardia for replacement tech
    const newGuardia = await base44.entities.Guardia.create({
      tecnico_id: newTechId,
      tecnico_nombre: tech?.full_name || tech?.email,
      inicio: guardia.inicio,
      fin: guardia.fin,
      tipo: guardia.tipo || 'normal',
      estado: guardia.estado === 'activa' ? 'activa' : 'programada',
      observaciones: `Reemplazo de ${guardia.tecnico_nombre}. ${note}`,
      creada_por: user?.email,
      creada_por_nombre: user?.full_name || user?.email,
    });
    // Notify new tech
    await base44.entities.Notification.create({
      user_id: newTechId,
      type: 'assigned',
      title: '🔄 Asignado como reemplazo de guardia',
      message: `Reemplazas a ${guardia.tecnico_nombre} en su guardia (${new Date(guardia.inicio).toLocaleString('es')} - ${new Date(guardia.fin).toLocaleString('es')}).`,
      is_read: false,
    });
    // Notify original tech
    await base44.entities.Notification.create({
      user_id: guardia.tecnico_id,
      type: 'status_change',
      title: '🔄 Tu guardia fue reemplazada',
      message: `${tech?.full_name || newTechId} te reemplaza en tu guardia. ${note}`,
      is_read: false,
    });
    setSaving(false);
    toast.success('Guardia reemplazada correctamente');
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="rounded-xl p-6 w-full max-w-sm" style={modalStyle} onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-white mb-1">Reemplazar técnico</h3>
        <p className="text-xs mb-4" style={{ color: muted }}>Guardia de {guardia.tecnico_nombre}</p>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Nuevo técnico *</label>
            <select value={newTechId} onChange={e => setNewTechId(e.target.value)}
              className={inputCls + " cursor-pointer"} style={inputStyle}>
              <option value="">Seleccionar...</option>
              {techs.filter(t => t.email !== guardia.tecnico_id).map(t => (
                <option key={t.email} value={t.email}>{t.full_name || t.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Motivo</label>
            <input value={note} onChange={e => setNote(e.target.value)}
              className={inputCls} style={inputStyle} placeholder="Ej: vacaciones, enfermedad..." />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-gray-300 hover:bg-white/10">Cancelar</button>
          <button onClick={handleReplace} disabled={saving || !newTechId}
            className="px-4 py-2 text-sm rounded-lg text-white font-medium disabled:opacity-50"
            style={{ background: 'hsl(38,80%,35%)' }}>
            {saving ? '...' : 'Reemplazar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Guards() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [editGuardia, setEditGuardia] = useState(null);
  const [replaceGuardia, setReplaceGuardia] = useState(null);
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterTech, setFilterTech] = useState('all');
  const qc = useQueryClient();

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const role = user?.role || 'employee';
  const canManage = role === 'admin';
  const isSupport = role === 'support';

  const { data: guardias = [], isLoading } = useQuery({
    queryKey: ['guardias'],
    queryFn: () => base44.entities.Guardia.list('-inicio', 200),
    refetchInterval: 60000,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const techs = allUsers.filter(u => u.role === 'admin' || u.role === 'support');

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['guardias'] });
    setShowForm(false);
    setEditGuardia(null);
    setReplaceGuardia(null);
  };

  const activeGuardia = useMemo(() => getActiveGuardia(guardias), [guardias]);

  const myGuardia = useMemo(() =>
    guardias.find(g => g.tecnico_id === user?.email && (g.estado === 'activa' || g.estado === 'programada') &&
      new Date(g.fin) > new Date()),
    [guardias, user]);

  const filtered = useMemo(() => {
    let g = isSupport ? guardias.filter(g => g.tecnico_id === user?.email) : guardias;
    if (filterEstado !== 'all') g = g.filter(x => x.estado === filterEstado);
    if (filterTech !== 'all') g = g.filter(x => x.tecnico_id === filterTech);
    return g;
  }, [guardias, filterEstado, filterTech, isSupport, user]);

  const handleCancel = async (g) => {
    if (!window.confirm('¿Cancelar esta guardia?')) return;
    await base44.entities.Guardia.update(g.id, { estado: 'cancelada' });
    // Notify tech
    await base44.entities.Notification.create({
      user_id: g.tecnico_id,
      type: 'status_change',
      title: '🚫 Guardia cancelada',
      message: `Tu guardia del ${new Date(g.inicio).toLocaleString('es')} fue cancelada.`,
      is_read: false,
    });
    toast.success('Guardia cancelada');
    refresh();
  };

  const handleActivate = async (g) => {
    await base44.entities.Guardia.update(g.id, { estado: 'activa' });
    toast.success('Guardia activada');
    refresh();
  };

  const formatRange = (g) => {
    const ini = new Date(g.inicio).toLocaleString('es', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const fin = new Date(g.fin).toLocaleString('es', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    return `${ini} → ${fin}`;
  };

  const duration = (g) => {
    const h = (new Date(g.fin) - new Date(g.inicio)) / 3600000;
    return `${h.toFixed(1)}h`;
  };

  const selectStyle = { background: 'hsl(222,47%,13%)', border: '1px solid hsl(217,33%,22%)', color: 'hsl(215,20%,70%)' };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" /> Sistema de Guardias
          </h1>
          <p className="text-xs mt-0.5" style={{ color: muted }}>
            Gestión de turnos técnicos para atención de incidencias
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button onClick={() => setShowPlanner(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90"
              style={{ background: 'hsl(217,33%,22%)', color: 'hsl(215,20%,75%)' }}>
              <Calendar className="w-4 h-4" /> Planificar mes
            </button>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90"
              style={{ background: 'hsl(217,91%,45%)' }}>
              <Plus className="w-4 h-4" /> Nueva guardia
            </button>
          </div>
        )}
      </div>

      {/* Active guardia banner */}
      {activeGuardia ? (
        <div className="rounded-xl p-4 flex items-center gap-3 flex-wrap" style={{ background: 'hsl(142,50%,12%)', border: '1px solid hsl(142,60%,22%)' }}>
          <Shield className="w-5 h-5 text-green-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-300">Guardia activa ahora</p>
            <p className="text-xs text-green-400/80">
              🔧 {activeGuardia.tecnico_nombre} — {formatRange(activeGuardia)}
            </p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: 'hsl(142,60%,18%)', color: '#4ade80' }}>
            EN TURNO
          </span>
        </div>
      ) : (
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'hsl(38,50%,12%)', border: '1px solid hsl(38,60%,22%)' }}>
          <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-300">Sin guardia activa</p>
            <p className="text-xs" style={{ color: 'hsl(38,60%,55%)' }}>
              Las incidencias nuevas deberán asignarse manualmente.
            </p>
          </div>
        </div>
      )}

      {/* My guardia (for support) */}
      {isSupport && myGuardia && (
        <div className="rounded-xl p-4" style={cardStyle}>
          <p className="text-xs font-semibold text-blue-400 mb-1 uppercase tracking-wide">Tu próxima guardia</p>
          <p className="text-sm font-semibold text-white">{formatRange(myGuardia)}</p>
          <p className="text-xs mt-1" style={{ color: muted }}>
            Tipo: {myGuardia.tipo} · Duración: {duration(myGuardia)} · Estado: {ESTADO_COLORS[myGuardia.estado]?.label}
          </p>
          {myGuardia.observaciones && <p className="text-xs mt-1 italic" style={{ color: muted }}>{myGuardia.observaciones}</p>}
        </div>
      )}

      {/* Filters */}
      {canManage && (
        <div className="flex items-center gap-3 flex-wrap">
          <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs outline-none cursor-pointer" style={selectStyle}>
            <option value="all">Todos los estados</option>
            {Object.entries(ESTADO_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterTech} onChange={e => setFilterTech(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs outline-none cursor-pointer" style={selectStyle}>
            <option value="all">Todos los técnicos</option>
            {techs.map(t => <option key={t.email} value={t.email}>{t.full_name || t.email}</option>)}
          </select>
          <span className="text-xs" style={{ color: muted }}>{filtered.length} guardia(s)</span>
        </div>
      )}

      {/* Guardia list */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-500">Cargando guardias...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl text-gray-500" style={cardStyle}>
          <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay guardias registradas</p>
          {canManage && <p className="text-xs mt-1">Crea la primera guardia con el botón de arriba</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(g => {
            const estadoCfg = ESTADO_COLORS[g.estado] || ESTADO_COLORS.programada;
            const isNow = g.estado === 'activa' && new Date(g.inicio) <= new Date() && new Date(g.fin) >= new Date();
            return (
              <div key={g.id} className="rounded-xl p-4" style={{ ...cardStyle, border: isNow ? '1px solid hsl(142,60%,28%)' : cardStyle.border }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-white">{g.tecnico_nombre}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: estadoCfg.bg, color: estadoCfg.text }}>
                        {estadoCfg.label}
                      </span>
                      {isNow && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'hsl(142,60%,16%)', color: '#4ade80' }}>
                          ● EN TURNO
                        </span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'hsl(217,33%,20%)', color: muted }}>
                        {g.tipo}
                      </span>
                    </div>
                    <p className="text-xs text-white/80 flex items-center gap-1">
                      <Clock className="w-3 h-3 shrink-0" /> {formatRange(g)} · {duration(g)}
                    </p>
                    {g.reemplazado_por_nombre && (
                      <p className="text-xs mt-0.5" style={{ color: '#fbbf24' }}>
                        🔄 Reemplazado por: {g.reemplazado_por_nombre}
                      </p>
                    )}
                    {g.observaciones && (
                      <p className="text-xs mt-0.5 italic" style={{ color: muted }}>{g.observaciones}</p>
                    )}
                    <p className="text-[10px] mt-1" style={{ color: muted }}>
                      Creado por {g.creada_por_nombre || g.creada_por} · {new Date(g.created_date).toLocaleDateString('es')}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex gap-1.5 flex-wrap shrink-0">
                      {g.estado === 'programada' && (
                        <button onClick={() => handleActivate(g)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium hover:opacity-80"
                          style={{ background: 'hsl(142,50%,18%)', color: '#4ade80' }}>
                          <CheckCircle2 className="w-3 h-3" /> Activar
                        </button>
                      )}
                      {(g.estado === 'activa' || g.estado === 'programada') && (
                        <button onClick={() => setReplaceGuardia(g)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium hover:opacity-80"
                          style={{ background: 'hsl(38,50%,18%)', color: '#fbbf24' }}>
                          <RefreshCw className="w-3 h-3" /> Reemplazar
                        </button>
                      )}
                      {g.estado !== 'cancelada' && g.estado !== 'finalizada' && g.estado !== 'reemplazada' && (
                        <button onClick={() => setEditGuardia(g)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium hover:opacity-80"
                          style={{ background: 'hsl(217,33%,22%)', color: 'hsl(215,20%,75%)' }}>
                          <Edit3 className="w-3 h-3" /> Editar
                        </button>
                      )}
                      {g.estado !== 'cancelada' && g.estado !== 'finalizada' && (
                        <button onClick={() => handleCancel(g)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium hover:opacity-80"
                          style={{ background: 'hsl(0,50%,20%)', color: '#f87171' }}>
                          <Ban className="w-3 h-3" /> Cancelar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <GuardiaForm techs={techs} user={user} onClose={() => setShowForm(false)} onSaved={refresh} />
      )}
      {editGuardia && (
        <GuardiaForm guardia={editGuardia} techs={techs} user={user} onClose={() => setEditGuardia(null)} onSaved={refresh} />
      )}
      {replaceGuardia && (
        <ReplaceTechModal guardia={replaceGuardia} techs={techs} user={user} onClose={() => setReplaceGuardia(null)} onSaved={refresh} />
      )}
      {showPlanner && (
        <MonthlyPlanner techs={techs} user={user} onClose={() => setShowPlanner(false)} onSaved={() => { setShowPlanner(false); refresh(); }} />
      )}
    </div>
  );
}