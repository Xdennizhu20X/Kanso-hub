'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import DailyStandupModal from '@/components/DailyStandupModal';
import {
  CheckSquare, FolderKanban, Bookmark, Target, Dumbbell,
  Plus, X, ChevronLeft, ChevronRight, Trash2, CalendarDays, Zap
} from 'lucide-react';

interface Task {
  _id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
  color: string;
  projectId: string;
  tags: string[];
  description: string;
}

interface Routine {
  _id: string;
  activity: string;
  time: string;
  frequency: string;
  daysOfWeek: number[];
  color: string;
  completedDates: string[];
}

interface Project {
  _id: string;
  name: string;
  color: string;
  status: string;
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const TASK_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
const ROUTINE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function getDaysInMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;
  return { daysInMonth, startDay };
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function isRoutineActiveOnDay(routine: Routine, dayOfWeek: number): boolean {
  if (routine.frequency === 'daily') return true;
  if (routine.frequency === 'custom') return routine.daysOfWeek.includes(dayOfWeek);
  if (routine.frequency === 'weekly') return true;
  return false;
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [standupOpen, setStandupOpen] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showRoutineForm, setShowRoutineForm] = useState(false);
  const [taskError, setTaskError] = useState('');
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', priority: 'medium',
    dueDate: formatDate(new Date()), color: TASK_COLORS[0], projectId: '', tags: ''
  });
  const [routineForm, setRoutineForm] = useState({
    activity: '', time: '10:00', frequency: 'daily',
    daysOfWeek: [] as number[], color: ROUTINE_COLORS[0], notes: ''
  });

  const today = new Date();
  const todayStr = formatDate(today);

  const loadData = () => {
    if (!user) return;
    Promise.all([
      api.get<Task[]>('/api/tasks').catch(() => []),
      api.get<Routine[]>('/api/routine/all').catch(() => []),
      api.get<Project[]>('/api/projects').catch(() => []),
      api.get<any[]>('/api/habits').catch(() => []),
      api.get<any[]>('/api/resources').catch(() => []),
      api.get<any[]>('/api/goals').catch(() => []),
    ]).then(([t, r, p, h, res, g]) => {
      setTasks(t);
      setRoutines(r);
      setProjects(p);
      setHabits(h);
      setResources(res);
      setGoals(g);
    });
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
      return;
    }
    loadData();
  }, [user, loading, router]);

  if (loading) return null;
  if (!user) return null;

  const stats = {
    totalTasks: tasks.length,
    pendingTasks: tasks.filter(t => t.status !== 'done').length,
    completedTasks: tasks.filter(t => t.status === 'done').length,
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === 'active').length,
    unreadResources: resources.filter(r => !r.reviewed).length,
    totalHabits: habits.length,
    habitsStreak: habits.reduce((max, h) => Math.max(max, h.currentStreak || 0), 0),
    activeGoals: goals.filter(g => g.status === 'active').length,
  };

  const categories = [
    { label: 'Todas', count: stats.totalTasks },
    { label: 'Pendientes', count: stats.pendingTasks },
    { label: 'Completadas', count: stats.completedTasks },
    { label: 'Alta prioridad', count: tasks.filter(t => t.priority === 'high' && t.status !== 'done').length },
  ];

  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    if (activeCategory === 'Pendientes') result = result.filter(t => t.status !== 'done');
    else if (activeCategory === 'Completadas') result = result.filter(t => t.status === 'done');
    else if (activeCategory === 'Alta prioridad') result = result.filter(t => t.priority === 'high');
    return result.sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (a.status !== 'done' && b.status === 'done') return -1;
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return (priorityOrder[a.priority as keyof typeof priorityOrder] || 1) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 1);
    }).slice(0, 8);
  }, [tasks, activeCategory]);

  const todayTasks = useMemo(() =>
    tasks.filter(t => t.dueDate && t.dueDate.split('T')[0] === todayStr),
    [tasks, todayStr]
  );

  const todayRoutines = useMemo(() =>
    routines.filter(r => isRoutineActiveOnDay(r, today.getDay())),
    [routines]
  );

  const completedToday = todayRoutines.filter(r => r.completedDates.includes(todayStr)).length;

  const weeklyProgress = useMemo(() => {
    const days = [];
    const dayNames = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      const dayRoutines = routines.filter(r => isRoutineActiveOnDay(r, d.getDay()));
      const completed = dayRoutines.filter(r => r.completedDates.includes(dateStr)).length;
      const pct = dayRoutines.length > 0 ? Math.round((completed / dayRoutines.length) * 100) : 0;
      days.push({ label: dayNames[d.getDay()], date: dateStr, pct, completed, total: dayRoutines.length });
    }
    return days;
  }, [routines]);

  const { daysInMonth, startDay } = getDaysInMonth(currentYear, currentMonth);

  const getEventsForDate = (date: string) => {
    const d = new Date(date + 'T12:00:00');
    const dayOfWeek = d.getDay();
    const taskEvents = tasks
      .filter(t => t.dueDate && t.dueDate.split('T')[0] === date)
      .map(t => ({ type: 'task' as const, color: t.color, title: t.title, id: t._id, done: t.status === 'done' }));
    const routineEvents = routines
      .filter(r => isRoutineActiveOnDay(r, dayOfWeek))
      .map(r => ({ type: 'routine' as const, color: r.color, title: r.activity, id: r._id, done: r.completedDates.includes(date) }));
    return [...taskEvents, ...routineEvents];
  };

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    const updated = await api.put<Task>(`/api/tasks/${task._id}`, { status: newStatus });
    setTasks(tasks.map(t => t._id === task._id ? updated : t));
  };

  const deleteTask = async (id: string) => {
    await api.delete(`/api/tasks/${id}`);
    setTasks(tasks.filter(t => t._id !== id));
  };

  const toggleRoutineToday = async (routine: Routine) => {
    const isCompleted = routine.completedDates.includes(todayStr);
    const newDates = isCompleted
      ? routine.completedDates.filter(d => d !== todayStr)
      : [...routine.completedDates, todayStr];
    const updated = await api.put<Routine>(`/api/routine/${routine._id}`, { completedDates: newDates });
    setRoutines(routines.map(r => r._id === routine._id ? updated : r));
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskError('');
    const body: any = {
      title: taskForm.title,
      description: taskForm.description,
      status: 'todo',
      priority: taskForm.priority,
      dueDate: taskForm.dueDate || undefined,
      color: taskForm.color,
      tags: taskForm.tags.split(',').map(t => t.trim()).filter(Boolean),
    };
    if (taskForm.projectId) body.projectId = taskForm.projectId;
    try {
      const created = await api.post<Task>('/api/tasks', body);
      setTasks([created, ...tasks]);
      setShowTaskForm(false);
      setTaskForm({ title: '', description: '', priority: 'medium', dueDate: formatDate(new Date()), color: TASK_COLORS[0], projectId: '', tags: '' });
    } catch (err: any) {
      setTaskError(err.message || 'Error al crear tarea');
    }
  };

  const handleRoutineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.post<Routine>('/api/routine', routineForm);
      setRoutines([...routines, created]);
      setShowRoutineForm(false);
      setRoutineForm({ activity: '', time: '10:00', frequency: 'daily', daysOfWeek: [], color: ROUTINE_COLORS[0], notes: '' });
    } catch (err: any) {
      setTaskError(err.message || 'Error al crear rutina');
    }
  };

  const statsCards = [
    { label: 'Tareas pendientes', value: stats.pendingTasks, icon: CheckSquare, color: 'text-amber-400', href: '/tasks' },
    { label: 'Proyectos activos', value: stats.activeProjects, icon: FolderKanban, color: 'text-[var(--accent)]', href: '/projects' },
    { label: 'Metas activas', value: stats.activeGoals, icon: Target, color: 'text-blue-400', href: '/goals' },
    { label: 'Streak actual', value: `${stats.habitsStreak}d`, icon: Dumbbell, color: 'text-purple-400', href: '/habits' },
  ];

  const projectMap = new Map(projects.map(p => [p._id, p]));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Hola, {user.name || 'bienvenido'}
          </h1>
          <p className="text-[var(--text-muted)] text-xs sm:text-sm mt-1">
            {today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button onClick={() => setShowTaskForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium transition-colors">
            <Plus size={14} />
            Tarea
          </button>
          <button onClick={() => setShowRoutineForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)] text-[var(--text-primary)] text-xs font-medium transition-colors">
            <Plus size={14} />
            Rutina
          </button>
        </div>
      </div>

      {/* Daily Standup Developer Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
            <Zap size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Sincronización Matutina / Daily Standup</h3>
            <p className="text-xs text-[var(--text-muted)]">Revisa en 1 minuto lo completado recientemente, tu horario de hoy y bloqueos para compartir.</p>
          </div>
        </div>
        <button
          onClick={() => setStandupOpen(true)}
          className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs transition-colors self-start sm:self-auto flex items-center gap-1.5 cursor-pointer flex-shrink-0"
        >
          <Zap size={14} />
          Iniciar Standup
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statsCards.map(({ label, value, icon: Icon, color, href }) => (
          <button key={label} onClick={() => router.push(href)}
            className="bg-[var(--bg-secondary)] rounded-xl p-4 sm:p-5 border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors text-left">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-[var(--text-muted)] text-[11px] sm:text-xs font-medium uppercase tracking-wider line-clamp-1">{label}</span>
              <Icon size={16} strokeWidth={1.8} className={color} />
            </div>
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium">Tareas</h2>
              <button onClick={() => router.push('/tasks')}
                className="text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                Ver todas →
              </button>
            </div>
            <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-none">
              {categories.map(({ label, count }) => (
                <button key={label} onClick={() => setActiveCategory(label)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    activeCategory === label
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--border-hover)]'
                  }`}>
                  {label} <span className="ml-1 opacity-60 tabular-nums">{count}</span>
                </button>
              ))}
            </div>

            <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
              {filteredTasks.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-[var(--text-muted)] text-sm">No hay tareas</p>
                  <button onClick={() => setShowTaskForm(true)}
                    className="mt-2 text-[var(--accent)] text-sm font-medium hover:underline">
                    Crear primera tarea
                  </button>
                </div>
              ) : (
                filteredTasks.map(task => {
                  const project = task.projectId ? projectMap.get(task.projectId) : null;
                  return (
                    <div key={task._id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--bg-tertiary)] transition-colors group">
                      <div className="w-1 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: task.color || '#3b82f6' }} />
                      <button onClick={() => toggleTask(task)}
                        className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                          task.status === 'done'
                            ? 'bg-[var(--accent)] border-[var(--accent)]'
                            : 'border-[var(--border-hover)] group-hover:border-[var(--accent)]'
                        }`}>
                        {task.status === 'done' && (
                          <svg viewBox="0 0 12 12" className="w-full h-full text-white">
                            <path d="M3 6l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                      <span className={`text-sm flex-1 min-w-0 truncate ${task.status === 'done' ? 'line-through text-[var(--text-muted)]' : ''}`}>
                        {task.title}
                      </span>
                      {task.priority === 'high' && task.status !== 'done' && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-red-500/10 text-red-400">Alta</span>
                      )}
                      {project && (
                        <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline">{project.name}</span>
                      )}
                      {task.dueDate && (
                        <span className="text-[11px] text-[var(--text-muted)] tabular-nums hidden sm:inline">
                          {new Date(task.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      <button onClick={() => deleteTask(task._id)}
                        className="text-[var(--text-muted)] hover:text-[var(--danger)] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium">Rutina de hoy</h2>
              <button onClick={() => router.push('/routine')}
                className="text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                Ver rutina →
              </button>
            </div>
            <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
              {todayRoutines.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-[var(--text-muted)] text-sm">Sin rutinas para hoy</p>
                  <button onClick={() => setShowRoutineForm(true)}
                    className="mt-2 text-[var(--accent)] text-sm font-medium hover:underline">
                    Crear rutina
                  </button>
                </div>
              ) : (
                todayRoutines
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map(routine => {
                    const isCompleted = routine.completedDates.includes(todayStr);
                    return (
                      <div key={routine._id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--bg-tertiary)] transition-colors group">
                        <div className="w-1 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: routine.color }} />
                        <button onClick={() => toggleRoutineToday(routine)}
                          className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                            isCompleted ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border-hover)] group-hover:border-[var(--accent)]'
                          }`}>
                          {isCompleted && (
                            <svg viewBox="0 0 12 12" className="w-full h-full text-white">
                              <path d="M3 6l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                        <span className={`text-sm flex-1 min-w-0 truncate ${isCompleted ? 'line-through text-[var(--text-muted)]' : ''}`}>
                          {routine.activity}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] tabular-nums">{routine.time}</span>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">{MONTHS[currentMonth]} {currentYear}</h3>
              <div className="flex gap-1">
                <button onClick={() => {
                  if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
                  else setCurrentMonth(m => m - 1);
                }} className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <button onClick={() => {
                  if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
                  else setCurrentMonth(m => m + 1);
                }} className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-medium text-[var(--text-muted)] py-1">{d}</div>
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
                const events = getEventsForDate(dateStr);
                return (
                  <button key={day} onClick={() => router.push('/calendar')}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-colors relative ${
                      isToday ? 'bg-[var(--accent)] text-white font-medium' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                    }`}>
                    <span>{day}</span>
                    {events.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {events.slice(0, 3).map((e, ei) => (
                          <div key={ei} className="w-1 h-1 rounded-full"
                            style={{ backgroundColor: isToday ? 'rgba(255,255,255,0.7)' : e.color }} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-5">
            <h3 className="text-sm font-medium mb-3">Progreso semanal</h3>
            <div className="space-y-2.5">
              {weeklyProgress.map(({ label, pct, completed, total }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-[11px] text-[var(--text-muted)] w-6">{label}</span>
                  <div className="flex-1 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] w-12 text-right tabular-nums">
                    {completed}/{total}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-5">
            <h3 className="text-sm font-medium mb-3">Hoy</h3>
            <div className="space-y-2.5">
              <button onClick={() => router.push('/tasks')} className="w-full flex items-center justify-between text-sm hover:text-[var(--accent)] transition-colors">
                <span className="text-[var(--text-secondary)]">Tareas pendientes</span>
                <span className="font-medium tabular-nums">{todayTasks.filter(t => t.status !== 'done').length}</span>
              </button>
              <button onClick={() => router.push('/routine')} className="w-full flex items-center justify-between text-sm hover:text-[var(--accent)] transition-colors">
                <span className="text-[var(--text-secondary)]">Rutinas completadas</span>
                <span className="font-medium tabular-nums">{completedToday}/{todayRoutines.length}</span>
              </button>
              <button onClick={() => router.push('/habits')} className="w-full flex items-center justify-between text-sm hover:text-[var(--accent)] transition-colors">
                <span className="text-[var(--text-secondary)]">Hábitos registrados</span>
                <span className="font-medium tabular-nums">{stats.totalHabits}</span>
              </button>
              <button onClick={() => router.push('/resources')} className="w-full flex items-center justify-between text-sm hover:text-[var(--accent)] transition-colors">
                <span className="text-[var(--text-secondary)]">Herramientas sin leer</span>
                <span className="font-medium tabular-nums">{stats.unreadResources}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showTaskForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowTaskForm(false)}>
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h2 className="text-sm font-medium">Nueva tarea</h2>
              <button onClick={() => setShowTaskForm(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={16} /></button>
            </div>
            <form onSubmit={handleTaskSubmit} className="p-4 space-y-3">
              {taskError && <p className="text-[var(--danger)] text-xs">{taskError}</p>}
              <input autoFocus type="text" placeholder="Título" value={taskForm.title}
                onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                className="w-full bg-[var(--bg-secondary)] rounded-lg px-3 py-2 border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" required />
              <textarea placeholder="Descripción (opcional)" value={taskForm.description}
                onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                className="w-full bg-[var(--bg-secondary)] rounded-lg px-3 py-2 border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" rows={2} />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={taskForm.dueDate}
                  onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="bg-[var(--bg-secondary)] rounded-lg px-3 py-2 border border-[var(--border)] text-sm text-[var(--text-primary)]" />
                <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}
                  className="bg-[var(--bg-secondary)] rounded-lg px-3 py-2 border border-[var(--border)] text-sm text-[var(--text-primary)]">
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </div>
              <select value={taskForm.projectId} onChange={e => setTaskForm({ ...taskForm, projectId: e.target.value })}
                className="w-full bg-[var(--bg-secondary)] rounded-lg px-3 py-2 border border-[var(--border)] text-sm text-[var(--text-primary)]">
                <option value="">Sin proyecto</option>
                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5">Color</label>
                <div className="flex gap-2">
                  {TASK_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setTaskForm({ ...taskForm, color: c })}
                      className={`w-6 h-6 rounded-full transition-transform ${taskForm.color === c ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-primary)] scale-110' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white py-2 rounded-lg text-sm font-medium transition-colors">Crear tarea</button>
                <button type="button" onClick={() => setShowTaskForm(false)}
                  className="px-4 bg-[var(--bg-tertiary)] hover:bg-[var(--border-hover)] py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] transition-colors">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRoutineForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowRoutineForm(false)}>
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h2 className="text-sm font-medium">Nueva rutina</h2>
              <button onClick={() => setShowRoutineForm(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={16} /></button>
            </div>
            <form onSubmit={handleRoutineSubmit} className="p-4 space-y-3">
              <input autoFocus type="text" placeholder="Actividad" value={routineForm.activity}
                onChange={e => setRoutineForm({ ...routineForm, activity: e.target.value })}
                className="w-full bg-[var(--bg-secondary)] rounded-lg px-3 py-2 border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" required />
              <div className="grid grid-cols-2 gap-3">
                <input type="time" value={routineForm.time}
                  onChange={e => setRoutineForm({ ...routineForm, time: e.target.value })}
                  className="bg-[var(--bg-secondary)] rounded-lg px-3 py-2 border border-[var(--border)] text-sm text-[var(--text-primary)]" />
                <select value={routineForm.frequency} onChange={e => setRoutineForm({ ...routineForm, frequency: e.target.value })}
                  className="bg-[var(--bg-secondary)] rounded-lg px-3 py-2 border border-[var(--border)] text-sm text-[var(--text-primary)]">
                  <option value="daily">Diario</option>
                  <option value="custom">Personalizado</option>
                  <option value="weekly">Semanal</option>
                </select>
              </div>
              {routineForm.frequency === 'custom' && (
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1.5">Días</label>
                  <div className="flex gap-1.5">
                    {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map((d, i) => (
                      <button key={i} type="button" onClick={() => setRoutineForm(f => ({
                        ...f, daysOfWeek: f.daysOfWeek.includes(i) ? f.daysOfWeek.filter(x => x !== i) : [...f.daysOfWeek, i].sort()
                      }))}
                        className={`w-9 h-9 rounded-lg text-xs font-medium transition-colors ${
                          routineForm.daysOfWeek.includes(i) ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]'
                        }`}>{d}</button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5">Color</label>
                <div className="flex gap-2">
                  {ROUTINE_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setRoutineForm({ ...routineForm, color: c })}
                      className={`w-6 h-6 rounded-full transition-transform ${routineForm.color === c ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-primary)] scale-110' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white py-2 rounded-lg text-sm font-medium transition-colors">Crear rutina</button>
                <button type="button" onClick={() => setShowRoutineForm(false)}
                  className="px-4 bg-[var(--bg-tertiary)] hover:bg-[var(--border-hover)] py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] transition-colors">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Daily Standup Modal */}
      <DailyStandupModal
        isOpen={standupOpen}
        onClose={() => setStandupOpen(false)}
      />
    </div>
  );
}
