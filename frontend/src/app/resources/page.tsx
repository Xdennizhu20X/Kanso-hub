'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Plus, ExternalLink, Check, Star, Trash2, RefreshCw, Globe, X, Settings, Tag } from 'lucide-react';
import SafeImage from '@/components/SafeImage';

interface Resource {
  _id: string;
  url: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  reviewed: boolean;
  rating: number;
  image: string;
  favicon: string;
  siteName: string;
  author: string;
  metadataFetched: boolean;
}

interface Category {
  key: string;
  label: string;
  color: string;
}

interface PreviewData {
  title: string;
  description: string;
  image: string;
  favicon: string;
  siteName: string;
  author: string;
}

const DEFAULT_CATEGORIES: Category[] = [
  { key: 'dev-tools', label: 'Dev Tools', color: '#3b82f6' },
  { key: 'design', label: 'Diseño', color: '#8b5cf6' },
  { key: 'ai', label: 'IA', color: '#10b981' },
  { key: 'learning', label: 'Aprendizaje', color: '#f59e0b' },
  { key: 'other', label: 'Otro', color: '#71717a' },
];

const COLOR_PALETTE = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
];

function colorWithAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getCategoryStyle(color: string): string {
  return `text-[${color}]`;
}

export default function ResourcesPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<Record<string, Category>>(DEFAULT_CATEGORIES.reduce((acc, c) => ({ ...acc, [c.key]: c }), {}));
  const [showForm, setShowForm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [filter, setFilter] = useState<{ type: 'all' | 'unread' | 'reviewed' | 'category'; value: string }>({ type: 'all', value: 'all' });
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [form, setForm] = useState({ url: '', category: 'other', tags: '' });
  const [newCategory, setNewCategory] = useState({ label: '', color: COLOR_PALETTE[0] });
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const previewTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user?.categories) {
      setCategories(user.categories);
    }
  }, [user]);

  const loadResources = () => {
    api.get<Resource[]>('/api/resources').then(setResources).catch(() => {});
  };

  useEffect(() => {
    loadResources();
  }, []);

  const fetchPreview = async (url: string) => {
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    try {
      const data = await api.get<PreviewData>(`/api/resources/preview?url=${encodeURIComponent(url)}`);
      setPreview(data);
    } catch {
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleUrlChange = (url: string) => {
    setForm({ ...form, url });
    if (previewTimeout.current) clearTimeout(previewTimeout.current);
    if (url.length > 8) {
      previewTimeout.current = setTimeout(() => fetchPreview(url), 600);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const body = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
    try {
      const created = await api.post<Resource>('/api/resources', body);
      setResources([created, ...resources]);
      setShowForm(false);
      setForm({ url: '', category: filter.type === 'category' ? filter.value : 'other', tags: '' });
      setPreview(null);
    } catch (err: any) {
      setError(err.message || 'Error al guardar recurso');
    }
  };

  const toggleReviewed = async (resource: Resource) => {
    const updated = await api.put<Resource>(`/api/resources/${resource._id}`, { reviewed: !resource.reviewed });
    setResources(resources.map(r => r._id === resource._id ? updated : r));
  };

  const setRating = async (resource: Resource, rating: number) => {
    const updated = await api.put<Resource>(`/api/resources/${resource._id}`, { rating });
    setResources(resources.map(r => r._id === resource._id ? updated : r));
  };

  const refreshMetadata = async (resource: Resource) => {
    const updated = await api.post<Resource>(`/api/resources/${resource._id}/refresh`, {});
    setResources(resources.map(r => r._id === resource._id ? updated : r));
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/api/resources/${id}`);
    setResources(resources.filter(r => r._id !== id));
  };

  const getHostname = (url: string) => {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
  };

  const refreshCategories = async () => {
    const u = await api.get<any>('/api/auth/me');
    if (u.categories) setCategories(u.categories);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.label.trim()) return;
    try {
      await api.post('/api/auth/categories', newCategory);
      setNewCategory({ label: '', color: COLOR_PALETTE[0] });
      await refreshCategories();
    } catch (err: any) {
      setError(err.message || 'Error al crear categoría');
    }
  };

  const handleUpdateCategory = async (key: string, label: string, color: string) => {
    try {
      await api.put(`/api/auth/categories/${key}`, { label, color });
      await refreshCategories();
      setEditingCategory(null);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar categoría');
    }
  };

  const handleDeleteCategory = async (key: string) => {
    const cat = categories[key];
    const count = resources.filter(r => r.category === key).length;
    const reassignTo = key !== 'other' && categories['other'] ? 'other' : Object.keys(categories).find(k => k !== key);
    if (!reassignTo) return;

    const message = count > 0
      ? `¿Eliminar "${cat.label}"? Los ${count} recursos se moverán a "${categories[reassignTo].label}".`
      : `¿Eliminar "${cat.label}"?`;

    if (!confirm(message)) return;

    try {
      await api.delete(`/api/auth/categories/${key}?reassignTo=${reassignTo}`);
      await refreshCategories();
      if (filter.type === 'category' && filter.value === key) {
        setFilter({ type: 'all', value: 'all' });
      }
    } catch (err: any) {
      setError(err.message || 'Error al eliminar categoría');
    }
  };

  const sortedCategories = Object.values(categories).sort((a, b) =>
    a.key === 'other' ? 1 : b.key === 'other' ? -1 : a.label.localeCompare(b.label)
  );

  const filteredByCategory = filter.type === 'category'
    ? resources.filter(r => r.category === filter.value)
    : filter.type === 'unread'
      ? resources.filter(r => !r.reviewed)
      : filter.type === 'reviewed'
        ? resources.filter(r => r.reviewed)
        : resources;

  const activeFilterLabel = filter.type === 'all' ? 'Todas' :
    filter.type === 'unread' ? 'Sin leer' :
      filter.type === 'reviewed' ? 'Revisadas' :
        categories[filter.value]?.label || filter.value;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Herramientas</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">Colección de utilidades, bookmarks y recursos con vista previa</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button onClick={() => setShowCategoryManager(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors">
            <Settings size={14} />
            Categorías
          </button>
          <button onClick={() => { setShowForm(true); setPreview(null); }}
            className="flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-3.5 py-2 rounded-lg text-xs font-medium transition-colors">
            <Plus size={14} />
            Guardar herramienta
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Estado</span>
          <span className="text-[11px] text-[var(--text-muted)] tabular-nums">{filteredByCategory.length} resultados</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[
            { type: 'all' as const, label: 'Todas', icon: Globe },
            { type: 'unread' as const, label: 'Sin leer', icon: null },
            { type: 'reviewed' as const, label: 'Revisadas', icon: Check },
          ].map(f => {
            const Icon = f.icon;
            const isActive = filter.type === f.type;
            return (
              <button key={f.type} onClick={() => setFilter({ type: f.type, value: 'all' })}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--border-hover)]'
                }`}>
                {Icon && <Icon size={11} />}
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Categorías</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {sortedCategories.map(cat => {
            const isActive = filter.type === 'category' && filter.value === cat.key;
            const count = resources.filter(r => r.category === cat.key).length;
            return (
              <button key={cat.key} onClick={() => setFilter({ type: 'category', value: cat.key })}
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)]'
                }`}
                style={isActive ? { backgroundColor: cat.color } : {}}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                {cat.label}
                <span className={`text-[10px] tabular-nums ${isActive ? 'opacity-80' : 'text-[var(--text-muted)]'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {showForm && (
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-4 sm:p-5 mb-8">
          {error && <p className="text-[var(--danger)] text-sm mb-3">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">URL</label>
                <input type="url" value={form.url}
                  onChange={e => handleUrlChange(e.target.value)}
                  placeholder="https://ejemplo.com"
                  className="w-full bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Categoría</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] text-sm text-[var(--text-primary)]">
                  {sortedCategories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
            </div>

            {previewLoading && (
              <div className="bg-[var(--bg-primary)] rounded-lg p-4 border border-[var(--border)] mb-4 flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
                <span className="text-xs text-[var(--text-muted)]">Obteniendo vista previa...</span>
              </div>
            )}

            {preview && !previewLoading && (
              <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border)] overflow-hidden mb-4">
                <div className="flex flex-col sm:flex-row">
                  {preview.image && (
                    <div className="w-full sm:w-40 h-36 sm:h-28 bg-[var(--bg-tertiary)] flex-shrink-0 relative overflow-hidden">
                      <SafeImage src={preview.image} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] mb-1">
                      {preview.favicon && <SafeImage src={preview.favicon} alt="" className="w-3 h-3 rounded" fallbackIcon />}
                      <span className="tabular-nums">{preview.siteName || getHostname(form.url)}</span>
                    </div>
                    <h4 className="text-sm font-medium text-[var(--text-primary)] truncate">{preview.title || 'Sin título'}</h4>
                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-0.5">{preview.description || 'Sin descripción'}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <input type="text" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
                placeholder="Tags (separados por coma)"
                className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
              <div className="flex items-center text-[11px] text-[var(--text-muted)] gap-1.5 px-1">
                <Globe size={12} />
                El título y descripción se obtienen automáticamente
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Guardar</button>
              <button type="button" onClick={() => { setShowForm(false); setPreview(null); }}
                className="bg-[var(--bg-tertiary)] hover:bg-[var(--border-hover)] px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] transition-colors">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {filteredByCategory.length === 0 ? (
        <div className="bg-[var(--bg-secondary)] rounded-xl p-12 border border-[var(--border)] text-center">
          <Tag size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
          <p className="text-[var(--text-muted)] text-sm">
            {filter.type === 'category'
              ? `No hay herramientas en "${activeFilterLabel}"`
              : filter.type === 'unread'
                ? 'No hay herramientas pendientes de revisar'
                : filter.type === 'reviewed'
                  ? 'No hay herramientas revisadas aún'
                  : 'No hay herramientas guardadas'}
          </p>
          {filter.type === 'all' && (
            <>
              <p className="text-[var(--text-muted)] text-xs mt-1">Pega una URL y se obtendrá automáticamente el título, descripción e imagen</p>
              <button onClick={() => setShowForm(true)} className="mt-4 inline-flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                <Plus size={14} /> Guardar primera herramienta
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredByCategory.map(resource => {
            const cat = categories[resource.category];
            return (
              <div key={resource._id} className={`bg-[var(--bg-secondary)] rounded-xl border transition-colors group overflow-hidden ${
                resource.reviewed ? 'border-[var(--border)]' : 'border-[var(--border-hover)]'
              } hover:border-[var(--border-hover)]`}>
                {resource.image && (
                  <a href={resource.url} target="_blank" rel="noopener noreferrer" className="block">
                    <div className="w-full h-36 bg-[var(--bg-tertiary)] overflow-hidden relative">
                      <SafeImage src={resource.image} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                  </a>
                )}

                <div className="p-4">
                  <div className="flex items-start gap-2 mb-2">
                    {resource.favicon && (
                      <SafeImage src={resource.favicon} alt="" className="w-4 h-4 rounded mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium truncate">{resource.title}</h3>
                      <p className="text-[10px] text-[var(--text-muted)] tabular-nums mt-0.5">
                        {resource.siteName || getHostname(resource.url)}
                      </p>
                    </div>
                    {resource.reviewed && (
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[var(--accent-muted)] text-[var(--accent)] flex-shrink-0">Revisado</span>
                    )}
                  </div>

                  <p className="text-xs text-[var(--text-muted)] line-clamp-3 mb-3 leading-relaxed">{resource.description || 'Sin descripción'}</p>

                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {cat && (
                        <button onClick={() => setFilter({ type: 'category', value: cat.key })}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors hover:opacity-80"
                          style={{ backgroundColor: colorWithAlpha(cat.color, 0.12), color: cat.color }}>
                          {cat.label}
                        </button>
                      )}
                      {resource.tags?.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[9px] text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">#{tag}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button key={star} onClick={() => setRating(resource, star)}
                            className={`${star <= resource.rating ? 'text-amber-400' : 'text-[var(--bg-tertiary)]'} hover:text-amber-400 transition-colors`}>
                            <Star size={11} fill={star <= resource.rating ? 'currentColor' : 'none'} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 mt-3 pt-3 border-t border-[var(--border)]">
                    <a href={resource.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                      <ExternalLink size={11} /> Abrir
                    </a>
                    <span className="text-[var(--border)]">·</span>
                    <button onClick={() => toggleReviewed(resource)}
                      className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                      <Check size={11} /> {resource.reviewed ? 'Pendiente' : 'Revisado'}
                    </button>
                    <button onClick={() => refreshMetadata(resource)}
                      className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors ml-auto">
                      <RefreshCw size={11} /> Actualizar
                    </button>
                    <button onClick={() => handleDelete(resource._id)}
                      className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCategoryManager && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowCategoryManager(false)}>
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)] flex-shrink-0">
              <h2 className="text-sm font-medium">Gestionar categorías</h2>
              <button onClick={() => setShowCategoryManager(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {sortedCategories.map(cat => (
                <div key={cat.key} className="flex items-center gap-2 bg-[var(--bg-secondary)] rounded-lg p-3 border border-[var(--border)]">
                  {editingCategory === cat.key ? (
                    <>
                      <input type="color" value={cat.color} onChange={e => {
                        const updated = { ...categories };
                        updated[cat.key] = { ...cat, color: e.target.value };
                        setCategories(updated);
                      }}
                        className="w-7 h-7 rounded cursor-pointer bg-transparent border-0" />
                      <input type="text" value={cat.label}
                        onChange={e => {
                          const updated = { ...categories };
                          updated[cat.key] = { ...cat, label: e.target.value };
                          setCategories(updated);
                        }}
                        className="flex-1 bg-[var(--bg-primary)] rounded px-2 py-1 text-sm border border-[var(--border)] text-[var(--text-primary)]" />
                      <button onClick={() => handleUpdateCategory(cat.key, cat.label, cat.color)}
                        className="text-[10px] px-2 py-1 rounded bg-[var(--accent)] text-white font-medium">Guardar</button>
                      <button onClick={() => setEditingCategory(null)}
                        className="text-[10px] px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">Cancelar</button>
                    </>
                  ) : (
                    <>
                      <div className="w-6 h-6 rounded flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="flex-1 text-sm text-[var(--text-primary)]">{cat.label}</span>
                      <span className="text-[10px] text-[var(--text-muted)] tabular-nums mr-2">
                        {resources.filter(r => r.category === cat.key).length}
                      </span>
                      <button onClick={() => setEditingCategory(cat.key)}
                        className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)]">Editar</button>
                      {cat.key !== 'other' && (
                        <button onClick={() => handleDeleteCategory(cat.key)}
                          className="text-[var(--text-muted)] hover:text-[var(--danger)] ml-1">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleAddCategory} className="p-4 border-t border-[var(--border)] bg-[var(--bg-secondary)] flex-shrink-0">
              <label className="block text-[11px] text-[var(--text-muted)] mb-2">Nueva categoría</label>
              <div className="flex gap-2">
                <input type="text" value={newCategory.label}
                  onChange={e => setNewCategory({ ...newCategory, label: e.target.value })}
                  placeholder="Ej: Podcasts, Newsletters..."
                  className="flex-1 bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
                <div className="flex gap-1">
                  {COLOR_PALETTE.slice(0, 5).map(c => (
                    <button key={c} type="button" onClick={() => setNewCategory({ ...newCategory, color: c })}
                      className={`w-7 h-7 rounded-full transition-transform ${newCategory.color === c ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-secondary)] scale-110' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <button type="submit" disabled={!newCategory.label.trim()}
                  className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors">
                  Añadir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
