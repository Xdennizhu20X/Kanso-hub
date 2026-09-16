'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight, Filter, FolderKanban } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';

interface Task {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  color: string;
  projectId: string;
  tags: string[];
}

interface Project {
  _id: string;
  name: string;
  color: string;
}

type ViewMode = 'kanban' | 'list' | 'calendar';

const STATUS_LABELS: Record<string, string> = {
  todo: 'Por hacer',
  in_progress: 'En progreso',
  done: 'Hecho',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-emerald-500/10 text-emerald-400',
  medium: 'bg-amber-500/10 text-amber-400',
  high: 'bg-red-500/10 text-red-400',
};

const TASK_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
const DAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function getDaysInMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  let startDay = firstDay.getDay();
  return { daysInMonth, startDay };
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function DroppableColumn({
  id,
  title,
  count,
  children,
}: {
  id: string;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`bg-[var(--bg-secondary)] rounded-xl p-4 border transition-colors ${
        isOver ? 'border-[var(--accent)] bg-[var(--accent-muted)]/10' : 'border-[var(--border)]'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{title}</h3>
        <span className="text-[10px] font-medium text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded tabular-nums">
          {count}
        </span>
      </div>
      <div className="space-y-2 min-h-[160px]">{children}</div>
    </div>
  );
}

function DraggableTaskCard({
  task,
  project,
  onEdit,
  onDelete,
  onMove,
}: {
  task: Task;
  project?: Project | null;
  onEdit: () => void;
  onDelete: () => void;
  onMove?: (status: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task._id,
    data: { task },
  });

  const style: React.CSSProperties = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-[var(--bg-primary)] rounded-lg p-3.5 border transition-all ${
        isDragging
          ? 'opacity-40 border-[var(--accent)] shadow-xl'
          : 'border-[var(--border)] hover:border-[var(--border-hover)]'
      } group`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0" {...attributes} {...listeners} style={{ cursor: 'grab' }}>
          <div className="w-1.5 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: task.color || '#3b82f6' }} />
          <h4 className="text-sm font-medium truncate">{task.title}</h4>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="text-[var(--text-muted)] hover:text-[var(--accent)]">
            <Edit2 size={13} />
          </button>
          <button onClick={onDelete} className="text-[var(--text-muted)] hover:text-[var(--danger)]">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      {task.description && <p className="text-[var(--text-muted)] text-xs mt-1.5 line-clamp-2">{task.description}</p>}
      <div className="flex items-center gap-1.5 flex-wrap mt-3">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${PRIORITY_COLORS[task.priority]}`}>
          {task.priority}
        </span>
        {project && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
            {project.name}
          </span>
        )}
        {task.dueDate && (
          <span className="text-[10px] text-[var(--text-muted)] ml-auto tabular-nums">
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
      {onMove && (
        <div className="flex gap-1.5 mt-2.5 pt-2 border-t border-[var(--border)]/40">
          {task.status === 'todo' && (
            <button
              onClick={() => onMove('in_progress')}
              className="text-[10px] font-medium bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded hover:bg-amber-500/20 transition-colors"
            >
              En progreso →
            </button>
          )}
          {task.status === 'in_progress' && (
            <button
              onClick={() => onMove('done')}
              className="text-[10px] font-medium bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded hover:bg-emerald-500/20 transition-colors"
            >
              Completar ✓
            </button>
          )}
          {task.status === 'done' && (
            <button
              onClick={() => onMove('todo')}
              className="text-[10px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              ← Reabrir
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TasksContent() {
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get('projectId') || '';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [view, setView] = useState<ViewMode>('kanban');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [error, setError] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: '',
    color: '#3b82f6',
    projectId: initialProjectId,
    tags: '',
  });

  const today = new Date();
  const todayStr = formatDate(today);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    api.get<Task[]>('/api/tasks').then(setTasks).catch(() => {});
    api.get<Project[]>('/api/projects').then(setProjects).catch(() => {});
  }, []);

  const projectMap = useMemo(() => new Map(projects.map(p => [p._id, p])), [projects]);

  const filteredTasks = useMemo(() => {
    if (!selectedProjectId) return tasks;
    return tasks.filter(t => t.projectId === selectedProjectId);
  }, [tasks, selectedProjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const body: any = {
      title: form.title,
      description: form.description,
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate || undefined,
      color: form.color,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    };
    if (form.projectId) body.projectId = form.projectId;

    try {
      if (editing) {
        const updated = await api.put<Task>(`/api/tasks/${editing._id}`, body);
        setTasks(tasks.map(t => (t._id === editing._id ? updated : t)));
      } else {
        const created = await api.post<Task>('/api/tasks', body);
        setTasks([created, ...tasks]);
      }
      setShowForm(false);
      setEditing(null);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la tarea');
    }
  };

  const resetForm = () =>
    setForm({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: '',
      color: '#3b82f6',
      projectId: selectedProjectId,
      tags: '',
    });

  const handleDelete = async (id: string) => {
    await api.delete(`/api/tasks/${id}`);
    setTasks(tasks.filter(t => t._id !== id));
  };

  const startEdit = (task: Task) => {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate?.split('T')[0] || '',
      color: task.color || '#3b82f6',
      projectId: task.projectId || '',
      tags: task.tags?.join(', ') || '',
    });
    setShowForm(true);
  };

  const moveTask = async (taskId: string, newStatus: string) => {
    const updated = await api.put<Task>(`/api/tasks/${taskId}`, { status: newStatus });
    setTasks(tasks.map(t => (t._id === taskId ? updated : t)));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const newStatus = over.id as string;
    const currentTask = tasks.find(t => t._id === taskId);
    if (currentTask && currentTask.status !== newStatus && ['todo', 'in_progress', 'done'].includes(newStatus)) {
      moveTask(taskId, newStatus);
    }
  };

  const columns = ['todo', 'in_progress', 'done'];
  const { daysInMonth, startDay } = getDaysInMonth(currentYear, currentMonth);

  const getTasksForDate = (date: string): Task[] => {
    return filteredTasks.filter(t => t.dueDate && t.dueDate.split('T')[0] === date);
  };

  const selectedDateTasks = useMemo(() => getTasksForDate(selectedDate), [filteredTasks, selectedDate]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tareas</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {selectedProjectId ? `Proyecto: ${projectMap.get(selectedProjectId)?.name || 'Filtrado'}` : 'Todas las tareas'}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Project Filter */}
          <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-xs">
            <Filter size={12} className="text-[var(--text-muted)]" />
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="bg-transparent text-xs text-[var(--text-primary)] outline-none cursor-pointer max-w-[140px] sm:max-w-none truncate"
            >
              <option value="">Todos los proyectos</option>
              {projects.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex bg-[var(--bg-secondary)] rounded-lg p-0.5 border border-[var(--border)]">
            {(['kanban', 'list', 'calendar'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  view === v ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {v === 'kanban' ? 'Kanban' : v === 'list' ? 'Lista' : 'Calendario'}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setShowForm(true);
              setEditing(null);
              resetForm();
            }}
            className="flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          >
            <Plus size={14} />
            Nueva tarea
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[var(--bg-secondary)] rounded-xl p-4 sm:p-6 border border-[var(--border)] mb-8">
          {error && <p className="text-[var(--danger)] text-sm mb-4">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <input
              type="text"
              placeholder="Título"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              required
            />
            <input
              type="date"
              value={form.dueDate}
              onChange={e => setForm({ ...form, dueDate: e.target.value })}
              className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] text-sm text-[var(--text-primary)]"
            />
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Color del calendario</label>
              <div className="flex gap-2">
                {TASK_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      form.color === c ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-secondary)] scale-110' : ''
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
              <option value="todo">Por hacer</option>
              <option value="in_progress">En progreso</option>
              <option value="done">Hecho</option>
            </select>
            <select
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
              className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] text-sm text-[var(--text-primary)]"
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
            <select
              value={form.projectId}
              onChange={e => setForm({ ...form, projectId: e.target.value })}
              className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] text-sm text-[var(--text-primary)]"
            >
              <option value="">Sin proyecto</option>
              {projects.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Tags (separados por coma)"
              value={form.tags}
              onChange={e => setForm({ ...form, tags: e.target.value })}
              className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              {editing ? 'Actualizar' : 'Crear'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className="bg-[var(--bg-tertiary)] hover:bg-[var(--border-hover)] px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {view === 'kanban' && (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {columns.map(col => {
              const colTasks = filteredTasks.filter(t => t.status === col);
              return (
                <DroppableColumn key={col} id={col} title={STATUS_LABELS[col]} count={colTasks.length}>
                  {colTasks.map(task => (
                    <DraggableTaskCard
                      key={task._id}
                      task={task}
                      project={task.projectId ? projectMap.get(task.projectId) : null}
                      onEdit={() => startEdit(task)}
                      onDelete={() => handleDelete(task._id)}
                      onMove={newStatus => moveTask(task._id, newStatus)}
                    />
                  ))}
                  {colTasks.length === 0 && (
                    <p className="text-[var(--text-muted)] text-xs text-center py-8 opacity-50">Arrastra tareas aquí</p>
                  )}
                </DroppableColumn>
              );
            })}
          </div>
        </DndContext>
      )}

      {view === 'list' && (
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
          {filteredTasks.length === 0 ? (
            <p className="text-[var(--text-muted)] p-8 text-center text-sm">No hay tareas</p>
          ) : (
            filteredTasks.map(task => {
              const project = task.projectId ? projectMap.get(task.projectId) : null;
              return (
                <div key={task._id} className="flex items-center gap-2 sm:gap-4 px-3.5 sm:px-5 py-3 hover:bg-[var(--bg-tertiary)] transition-colors group">
                  <button
                    onClick={() => moveTask(task._id, task.status === 'done' ? 'todo' : 'done')}
                    className={`w-4 h-4 rounded border-2 flex-shrink-0 transition-colors ${
                      task.status === 'done'
                        ? 'bg-[var(--accent)] border-[var(--accent)]'
                        : 'border-[var(--border-hover)] group-hover:border-[var(--accent)]'
                    }`}
                  >
                    {task.status === 'done' && (
                      <svg viewBox="0 0 12 12" className="w-full h-full text-white">
                        <path d="M3 6l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm ${task.status === 'done' ? 'line-through text-[var(--text-muted)]' : ''}`}>{task.title}</h4>
                    {task.description && <p className="text-[var(--text-muted)] text-xs mt-0.5 truncate">{task.description}</p>}
                  </div>
                  {project && (
                    <span className="hidden xs:inline-block text-[10px] font-medium px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                      {project.name}
                    </span>
                  )}
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                  {task.dueDate && <span className="text-[11px] text-[var(--text-muted)] tabular-nums hidden sm:inline">{new Date(task.dueDate).toLocaleDateString()}</span>}
                  <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(task)} className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)]">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(task._id)} className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)]">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {view === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 lg:col-span-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">
                {MONTHS[currentMonth]} {currentYear}
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    if (currentMonth === 0) {
                      setCurrentMonth(11);
                      setCurrentYear(y => y - 1);
                    } else setCurrentMonth(m => m - 1);
                  }}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => {
                    if (currentMonth === 11) {
                      setCurrentMonth(0);
                      setCurrentYear(y => y + 1);
                    } else setCurrentMonth(m => m + 1);
                  }}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-medium text-[var(--text-muted)] py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const dayTasks = getTasksForDate(dateStr);
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-colors ${
                      isSelected
                        ? 'bg-[var(--accent)] text-white'
                        : isToday
                        ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    <span className="font-medium">{day}</span>
                    {dayTasks.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayTasks.slice(0, 3).map((t, ti) => (
                          <div
                            key={ti}
                            className="w-1 h-1 rounded-full"
                            style={{
                              backgroundColor:
                                t.status === 'done'
                                  ? isSelected
                                    ? '#fff'
                                    : 'var(--accent)'
                                  : isSelected
                                  ? 'rgba(255,255,255,0.4)'
                                  : t.priority === 'high'
                                  ? '#ef4444'
                                  : t.priority === 'medium'
                                  ? '#f59e0b'
                                  : '#10b981',
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-5">
              <h3 className="text-sm font-medium mb-1">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mb-4">
                {selectedDateTasks.filter(t => t.status === 'done').length}/{selectedDateTasks.length} completadas
              </p>
              {selectedDateTasks.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] text-center py-4">Sin tareas para este día</p>
              ) : (
                <div className="space-y-2">
                  {selectedDateTasks.map(task => (
                    <div key={task._id} className="flex items-center gap-3 py-2">
                      <button
                        onClick={() => moveTask(task._id, task.status === 'done' ? 'todo' : 'done')}
                        className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
                          task.status === 'done'
                            ? 'bg-[var(--accent)] border-[var(--accent)]'
                            : 'border-[var(--border-hover)]'
                        }`}
                      >
                        {task.status === 'done' && (
                          <svg viewBox="0 0 12 12" className="w-full h-full text-white">
                            <path d="M3 6l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs ${task.status === 'done' ? 'line-through text-[var(--text-muted)]' : ''}`}>
                          {task.title}
                        </span>
                      </div>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority]}`}>
                        {task.priority}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-5">
              <h3 className="text-sm font-medium mb-3">Resumen</h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Total</span>
                  <span className="font-medium tabular-nums">{filteredTasks.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Pendientes</span>
                  <span className="font-medium tabular-nums">{filteredTasks.filter(t => t.status !== 'done').length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Completadas</span>
                  <span className="font-medium tabular-nums text-[var(--accent)]">
                    {filteredTasks.filter(t => t.status === 'done').length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Sin fecha</span>
                  <span className="font-medium tabular-nums">{filteredTasks.filter(t => !t.dueDate).length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-[var(--text-muted)]">Cargando tareas...</div>}>
      <TasksContent />
    </Suspense>
  );
}
