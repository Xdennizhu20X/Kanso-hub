'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Plus, Edit2, Trash2, CheckCircle2, ArrowRight } from 'lucide-react';

interface Project {
  _id: string;
  name: string;
  description: string;
  color: string;
  status: string;
}

interface Task {
  _id: string;
  projectId?: string | null;
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  paused: 'Pausado',
  completed: 'Completado',
  archived: 'Archivado',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-[var(--accent-muted)] text-[var(--accent)]',
  paused: 'bg-amber-500/10 text-amber-400',
  completed: 'bg-blue-500/10 text-blue-400',
  archived: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0], status: 'active' });

  useEffect(() => {
    Promise.all([
      api.get<Project[]>('/api/projects'),
      api.get<Task[]>('/api/tasks').catch(() => [] as Task[]),
    ]).then(([fetchedProjects, fetchedTasks]) => {
      setProjects(fetchedProjects);
      setTasks(fetchedTasks || []);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        const updated = await api.put<Project>(`/api/projects/${editing._id}`, form);
        setProjects(projects.map(p => p._id === editing._id ? updated : p));
      } else {
        const created = await api.post<Project>('/api/projects', form);
        setProjects([created, ...projects]);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', description: '', color: COLORS[0], status: 'active' });
    } catch (err: any) {
      setError(err.message || 'Error al guardar proyecto');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este proyecto? Las tareas asociadas no serán borradas.')) return;
    await api.delete(`/api/projects/${id}`);
    setProjects(projects.filter(p => p._id !== id));
  };

  const startEdit = (project: Project) => {
    setEditing(project);
    setForm({ name: project.name, description: project.description, color: project.color, status: project.status });
    setShowForm(true);
  };

  const filteredProjects = useMemo(() => {
    if (statusFilter === 'all') return projects;
    return projects.filter(p => p.status === statusFilter);
  }, [projects, statusFilter]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Proyectos</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {projects.length} {projects.length === 1 ? 'proyecto' : 'proyectos'} en total
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditing(null);
            setForm({ name: '', description: '', color: COLORS[0], status: 'active' });
          }}
          className="flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-3.5 py-2 rounded-lg text-xs font-medium transition-colors self-start sm:self-auto"
        >
          <Plus size={14} />
          Nuevo proyecto
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6 scrollbar-none">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            statusFilter === 'all'
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border)]'
          }`}
        >
          Todos ({projects.length})
        </button>
        {Object.entries(STATUS_LABELS).map(([k, label]) => {
          const count = projects.filter(p => p.status === k).length;
          return (
            <button
              key={k}
              onClick={() => setStatusFilter(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === k
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border)]'
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[var(--bg-secondary)] rounded-xl p-6 border border-[var(--border)] mb-8">
          {error && <p className="text-[var(--danger)] text-sm mb-4">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nombre del proyecto"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              required
            />
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Color</label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      form.color === c ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-primary)] scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <textarea
              placeholder="Descripción"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] focus:border-[var(--accent)] outline-none col-span-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              rows={2}
            />
            <select
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
              className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] text-sm text-[var(--text-primary)]"
            >
              <option value="active">Activo</option>
              <option value="paused">Pausado</option>
              <option value="completed">Completado</option>
              <option value="archived">Archivado</option>
            </select>
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
        {filteredProjects.map(project => {
          const projectTasks = tasks.filter(t => t.projectId === project._id);
          const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
          const totalTasks = projectTasks.length;
          const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

          return (
            <div
              key={project._id}
              className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[var(--border)] hover:border-[var(--border-hover)] transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                    <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">{project.name}</h3>
                  </div>
                  <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => startEdit(project)}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)]"
                      title="Editar"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(project._id)}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)]"
                      title="Eliminar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <p className="text-[var(--text-muted)] text-xs mb-4 line-clamp-2">
                  {project.description || 'Sin descripción'}
                </p>

                {/* Progress bar and task metrics */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-1.5">
                    <span>Progreso ({completedTasks}/{totalTasks} tareas)</span>
                    <span className="font-medium text-[var(--text-secondary)]">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${progressPercent}%`,
                        backgroundColor: project.color || 'var(--accent)',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] mt-2">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${STATUS_STYLES[project.status] || STATUS_STYLES.active}`}>
                  {STATUS_LABELS[project.status] || project.status}
                </span>

                <Link
                  href={`/tasks?projectId=${project._id}`}
                  className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline font-medium"
                >
                  Ver tareas
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          );
        })}

        {filteredProjects.length === 0 && projects.length > 0 && (
          <div className="col-span-full bg-[var(--bg-secondary)] rounded-xl p-12 border border-[var(--border)] text-center">
            <p className="text-[var(--text-muted)] text-sm">No hay proyectos en esta categoría</p>
            <button
              onClick={() => setStatusFilter('all')}
              className="mt-3 text-[var(--accent)] text-sm font-medium hover:underline"
            >
              Ver todos los proyectos
            </button>
          </div>
        )}

        {projects.length === 0 && (
          <div className="col-span-full bg-[var(--bg-secondary)] rounded-xl p-12 border border-[var(--border)] text-center">
            <p className="text-[var(--text-muted)] text-sm">No hay proyectos</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-[var(--accent)] text-sm font-medium hover:underline"
            >
              Crear primer proyecto
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
