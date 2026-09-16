'use client';

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { Plus, Pin, PinOff, Trash2, Edit2, Search, X, Tag } from 'lucide-react';

interface Note {
  _id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  pinned: boolean;
}

const CATEGORIES: Record<string, string> = {
  idea: 'Idea', snippet: 'Snippet', learning: 'Aprendizaje', reminder: 'Recordatorio', other: 'Otro'
};

const CATEGORY_STYLES: Record<string, string> = {
  idea: 'bg-purple-500/10 text-purple-400',
  snippet: 'bg-blue-500/10 text-blue-400',
  learning: 'bg-emerald-500/10 text-emerald-400',
  reminder: 'bg-amber-500/10 text-amber-400',
  other: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', content: '', category: 'other', tags: '' });

  // Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    api.get<Note[]>('/api/notes').then(setNotes).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const body = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
    try {
      if (editing) {
        const updated = await api.put<Note>(`/api/notes/${editing._id}`, body);
        setNotes(notes.map(n => n._id === editing._id ? updated : n));
      } else {
        const created = await api.post<Note>('/api/notes', body);
        setNotes([created, ...notes]);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ title: '', content: '', category: 'other', tags: '' });
    } catch (err: any) {
      setError(err.message || 'Error al guardar nota');
    }
  };

  const togglePin = async (note: Note) => {
    const updated = await api.put<Note>(`/api/notes/${note._id}`, { pinned: !note.pinned });
    setNotes(notes.map(n => n._id === note._id ? updated : n));
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/api/notes/${id}`);
    setNotes(notes.filter(n => n._id !== id));
  };

  const startEdit = (note: Note) => {
    setEditing(note);
    setForm({ title: note.title, content: note.content, category: note.category, tags: note.tags?.join(', ') || '' });
    setShowForm(true);
  };

  const filteredNotes = useMemo(() => {
    return notes
      .filter(note => {
        if (selectedCategory !== 'all' && note.category !== selectedCategory) {
          return false;
        }
        if (selectedTag && !note.tags?.some(t => t.toLowerCase() === selectedTag.toLowerCase())) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = note.title.toLowerCase().includes(q);
          const matchContent = note.content.toLowerCase().includes(q);
          const matchTag = note.tags?.some(t => t.toLowerCase().includes(q));
          if (!matchTitle && !matchContent && !matchTag) return false;
        }
        return true;
      })
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  }, [notes, selectedCategory, selectedTag, searchQuery]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notas</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {notes.length} {notes.length === 1 ? 'nota' : 'notas'} registradas
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditing(null);
            setForm({ title: '', content: '', category: 'other', tags: '' });
          }}
          className="flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-3.5 py-2 rounded-lg text-xs font-medium transition-colors self-start sm:self-auto"
        >
          <Plus size={14} />
          Nueva nota
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Buscar notas por título, contenido o etiqueta..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border)]'
            }`}
          >
            Todas ({notes.length})
          </button>
          {Object.entries(CATEGORIES).map(([key, label]) => {
            const count = notes.filter(n => n.category === key).length;
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === key
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border)]'
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Active tag filter banner */}
      {selectedTag && (
        <div className="flex items-center gap-2 mb-4 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400 w-fit">
          <Tag size={12} />
          <span>Filtrando por etiqueta: <strong>#{selectedTag}</strong></span>
          <button onClick={() => setSelectedTag(null)} className="hover:text-blue-200 ml-1">
            <X size={12} />
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[var(--bg-secondary)] rounded-xl p-6 border border-[var(--border)] mb-8">
          {error && <p className="text-[var(--danger)] text-sm mb-4">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Título"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              required
            />
            <select
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] text-sm text-[var(--text-primary)]"
            >
              {Object.entries(CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <textarea
              placeholder="Contenido"
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
              className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] focus:border-[var(--accent)] outline-none col-span-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              rows={4}
            />
            <input
              type="text"
              placeholder="Tags (separados por coma, ej: react, dev, personal)"
              value={form.tags}
              onChange={e => setForm({ ...form, tags: e.target.value })}
              className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] col-span-2"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {editing ? 'Actualizar' : 'Crear'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditing(null); }}
              className="bg-[var(--bg-tertiary)] hover:bg-[var(--border-hover)] px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNotes.map(note => (
          <div
            key={note._id}
            className={`bg-[var(--bg-secondary)] rounded-xl p-5 border transition-colors group flex flex-col justify-between ${
              note.pinned ? 'border-amber-500/30' : 'border-[var(--border)] hover:border-[var(--border-hover)]'
            }`}
          >
            <div>
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-medium flex-1 min-w-0 truncate">{note.title}</h3>
                <div className="flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
                  <button
                    onClick={() => togglePin(note)}
                    className={`p-1 transition-colors ${note.pinned ? 'text-amber-400 hover:text-amber-300' : 'text-[var(--text-muted)] hover:text-amber-400'}`}
                    title={note.pinned ? 'Desfijar' : 'Fijar'}
                  >
                    {note.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                  </button>
                  <button
                    onClick={() => startEdit(note)}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)]"
                    title="Editar"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(note._id)}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)]"
                    title="Eliminar"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <p className="text-[var(--text-muted)] text-xs mb-3 whitespace-pre-wrap line-clamp-4">
                {note.content}
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[var(--border)]">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${CATEGORY_STYLES[note.category] || CATEGORY_STYLES.other}`}>
                {CATEGORIES[note.category] || note.category}
              </span>
              {note.tags?.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                    selectedTag === tag
                      ? 'bg-blue-500/20 text-blue-300 font-medium'
                      : 'text-[var(--text-muted)] bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        ))}

        {filteredNotes.length === 0 && notes.length > 0 && (
          <div className="col-span-full bg-[var(--bg-secondary)] rounded-xl p-12 border border-[var(--border)] text-center">
            <p className="text-[var(--text-muted)] text-sm">No se encontraron notas que coincidan con la búsqueda o filtros.</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setSelectedTag(null); }}
              className="mt-3 text-[var(--accent)] text-sm font-medium hover:underline"
            >
              Restablecer filtros
            </button>
          </div>
        )}

        {notes.length === 0 && (
          <div className="col-span-full bg-[var(--bg-secondary)] rounded-xl p-12 border border-[var(--border)] text-center">
            <p className="text-[var(--text-muted)] text-sm">No hay notas registradas</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-[var(--accent)] text-sm font-medium hover:underline"
            >
              Crear primera nota
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
