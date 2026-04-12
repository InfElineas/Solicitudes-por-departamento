import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Search, X, Edit3, Trash2, Eye, Tag } from 'lucide-react';
import { toast } from 'sonner';

const cardStyle = { background: 'hsl(222,47%,12%)', border: '1px solid hsl(217,33%,18%)' };
const modalStyle = { background: 'hsl(222,47%,14%)', border: '1px solid hsl(217,33%,22%)' };
const inputStyle = { background: 'hsl(222,47%,18%)', border: '1px solid hsl(217,33%,28%)', color: 'white', outline: 'none' };
const inputCls = "w-full px-3 py-2 rounded-lg text-sm";
const labelCls = "text-xs font-medium text-gray-400 mb-1 block";
const muted = 'hsl(215,20%,55%)';

const CATEGORIES = ['Hardware', 'Software', 'Red / Conectividad', 'Acceso / Permisos', 'Impresora / Periférico', 'Correo / Comunicación', 'Otro'];

const CAT_COLORS = {
  'Hardware': '#60a5fa',
  'Software': '#c084fc',
  'Red / Conectividad': '#34d399',
  'Acceso / Permisos': '#fbbf24',
  'Impresora / Periférico': '#fb923c',
  'Correo / Comunicación': '#f472b6',
  'Otro': '#94a3b8',
};

function ArticleForm({ article, user, onClose, onSaved }) {
  const isEdit = !!article;
  const [form, setForm] = useState({
    title: article?.title || '',
    content: article?.content || '',
    category: article?.category || 'Software',
    tags: article?.tags?.join(', ') || '',
    is_published: article?.is_published !== false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) { toast.error('Título y contenido son obligatorios'); return; }
    setSaving(true);
    const payload = {
      ...form,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      author_id: user?.email,
      author_name: user?.display_name || user?.full_name || user?.email,
    };
    if (isEdit) {
      await base44.entities.KnowledgeBase.update(article.id, payload);
      toast.success('Artículo actualizado');
    } else {
      await base44.entities.KnowledgeBase.create({ ...payload, views: 0 });
      toast.success('Artículo creado');
    }
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto" onClick={onClose}>
      <div className="rounded-xl p-6 w-full max-w-2xl my-8" style={modalStyle} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">{isEdit ? 'Editar artículo' : 'Nuevo artículo'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Título *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} className={inputCls} style={inputStyle} placeholder="Ej: Cómo resolver problemas de conexión VPN" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Categoría *</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className={inputCls + " cursor-pointer"} style={inputStyle}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Tags (separados por comas)</label>
              <input value={form.tags} onChange={e => set('tags', e.target.value)} className={inputCls} style={inputStyle} placeholder="vpn, red, acceso..." />
            </div>
          </div>
          <div>
            <label className={labelCls}>Solución / Contenido *</label>
            <textarea value={form.content} onChange={e => set('content', e.target.value)} rows={10}
              className={inputCls + " resize-none"} style={inputStyle}
              placeholder="Describe los pasos de solución detalladamente..." />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="published" checked={form.is_published} onChange={e => set('is_published', e.target.checked)} className="rounded" />
            <label htmlFor="published" className="text-xs text-gray-300 cursor-pointer">Publicar (visible para todos los usuarios)</label>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-gray-300 hover:bg-white/10">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg text-white font-medium disabled:opacity-50" style={{ background: 'hsl(217,91%,45%)' }}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Publicar artículo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ArticleModal({ article, onClose }) {
  useEffect(() => {
    base44.entities.KnowledgeBase.update(article.id, { views: (article.views || 0) + 1 }).catch(() => {});
  }, [article.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto" onClick={onClose}>
      <div className="rounded-xl p-6 w-full max-w-2xl my-8" style={modalStyle} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded mb-2 inline-block" style={{ background: `${CAT_COLORS[article.category]}22`, color: CAT_COLORS[article.category] }}>
              {article.category}
            </span>
            <h3 className="text-lg font-bold text-white">{article.title}</h3>
            <p className="text-xs mt-1" style={{ color: muted }}>Por {article.author_name} · {new Date(article.created_date).toLocaleDateString('es')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white shrink-0"><X className="w-4 h-4" /></button>
        </div>
        {article.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {article.tags.map(t => (
              <span key={t} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'hsl(217,33%,22%)', color: muted }}>
                <Tag className="w-2.5 h-2.5" />{t}
              </span>
            ))}
          </div>
        )}
        <div className="prose prose-sm max-w-none">
          <div className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed p-4 rounded-lg" style={{ background: 'hsl(222,47%,10%)' }}>
            {article.content}
          </div>
        </div>
        <div className="flex justify-between items-center mt-4">
          <span className="text-xs flex items-center gap-1" style={{ color: muted }}>
            <Eye className="w-3 h-3" /> {article.views || 0} visualizaciones
          </span>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-gray-300 hover:bg-white/10">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

export default function KnowledgeBase() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editArticle, setEditArticle] = useState(null);
  const [viewArticle, setViewArticle] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const qc = useQueryClient();

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const isStaff = user?.role === 'admin' || user?.role === 'support';

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['knowledge-base'],
    queryFn: () => base44.entities.KnowledgeBase.list('-created_date', 200),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['knowledge-base'] });

  const filtered = useMemo(() => {
    let a = isStaff ? articles : articles.filter(x => x.is_published !== false);
    if (filterCat !== 'all') a = a.filter(x => x.category === filterCat);
    if (search) {
      const s = search.toLowerCase();
      a = a.filter(x =>
        x.title?.toLowerCase().includes(s) ||
        x.content?.toLowerCase().includes(s) ||
        x.tags?.some(t => t.toLowerCase().includes(s))
      );
    }
    return a;
  }, [articles, search, filterCat, isStaff]);

  const handleDelete = async (id) => {
    await base44.entities.KnowledgeBase.delete(id);
    refresh();
    setDeleteId(null);
    toast.success('Artículo eliminado');
  };

  const selectStyle = { background: 'hsl(222,47%,14%)', border: '1px solid hsl(217,33%,22%)', color: 'hsl(215,20%,70%)' };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" /> Base de Conocimientos
          </h1>
          <p className="text-xs mt-0.5" style={{ color: muted }}>Soluciones a problemas técnicos frecuentes</p>
        </div>
        {isStaff && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90"
            style={{ background: 'hsl(217,91%,45%)' }}>
            <Plus className="w-4 h-4" /> Nuevo artículo
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {CATEGORIES.slice(0, 4).map(cat => {
          const count = articles.filter(a => a.category === cat && a.is_published !== false).length;
          return (
            <div key={cat} className="rounded-xl p-3 cursor-pointer hover:opacity-80 transition-opacity" style={cardStyle}
              onClick={() => setFilterCat(filterCat === cat ? 'all' : cat)}>
              <p className="text-lg font-bold" style={{ color: CAT_COLORS[cat] }}>{count}</p>
              <p className="text-[10px] mt-0.5 truncate" style={{ color: muted }}>{cat}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar artículos..."
            className="w-full pl-8 pr-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'hsl(222,47%,14%)', border: '1px solid hsl(217,33%,22%)', color: 'white' }} />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-3 py-2 rounded-lg text-xs outline-none cursor-pointer" style={selectStyle}>
          <option value="all">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <span className="text-xs" style={{ color: muted }}>{filtered.length} artículo(s)</span>
      </div>

      {/* Articles grid */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-500">Cargando artículos...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl text-gray-500" style={cardStyle}>
          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay artículos {search || filterCat !== 'all' ? 'con esos filtros' : 'publicados aún'}</p>
          {isStaff && !search && <p className="text-xs mt-1">Crea el primer artículo con el botón de arriba</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(a => (
            <div key={a.id} className="rounded-xl p-4 flex flex-col gap-2 cursor-pointer hover:opacity-90 transition-opacity" style={cardStyle}
              onClick={() => setViewArticle(a)}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${CAT_COLORS[a.category]}22`, color: CAT_COLORS[a.category] }}>
                  {a.category}
                </span>
                {isStaff && (
                  <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setEditArticle(a)}
                      className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(a.id)}
                      className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <h3 className="text-sm font-semibold text-white leading-snug">{a.title}</h3>
              <p className="text-xs line-clamp-2" style={{ color: muted }}>{a.content}</p>
              {a.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {a.tags.slice(0, 3).map(t => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'hsl(217,33%,22%)', color: muted }}>{t}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between text-[10px] pt-1" style={{ color: muted }}>
                <span>{a.author_name}</span>
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{a.views || 0}</span>
              </div>
              {!a.is_published && isStaff && (
                <span className="text-[10px] px-2 py-0.5 rounded-full self-start" style={{ background: 'hsl(38,60%,18%)', color: '#fbbf24' }}>Borrador</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showForm && user && (
        <ArticleForm user={user} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); refresh(); }} />
      )}
      {editArticle && user && (
        <ArticleForm article={editArticle} user={user} onClose={() => setEditArticle(null)} onSaved={() => { setEditArticle(null); refresh(); }} />
      )}
      {viewArticle && (
        <ArticleModal article={viewArticle} onClose={() => setViewArticle(null)} />
      )}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="rounded-xl p-6 w-full max-w-sm" style={modalStyle}>
            <h3 className="text-base font-semibold text-white mb-2">¿Eliminar artículo?</h3>
            <p className="text-sm text-gray-400 mb-4">Esta acción no puede deshacerse.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm rounded-lg text-gray-300 hover:bg-white/10">Cancelar</button>
              <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 text-sm rounded-lg text-white font-medium" style={{ background: 'hsl(0,70%,40%)' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}