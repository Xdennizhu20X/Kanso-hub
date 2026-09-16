'use client';

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { Plus, Check, Trash2, ChevronLeft, ChevronRight, Clock, Repeat } from 'lucide-react';

interface Routine {
  _id: string;
  activity: string;
  time: string;
  endTime?: string;
  category?: string;
  frequency: string;
  daysOfWeek: number[];
  color: string;
  completedDates: string[];
  notes: string;
}

type ViewMode = 'list' | 'calendar';

const DAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
const DAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const CATEGORIES: Record<string, { label: string; defaultColor: string }> = {
  work: { label: 'Trabajo / Dev', defaultColor: '#3b82f6' },
  study: { label: 'Estudio / Aprendizaje', defaultColor: '#8b5cf6' },
  health: { label: 'Salud / Deporte', defaultColor: '#10b981' },
  personal: { label: 'Personal / Rutina', defaultColor: '#f59e0b' },
};

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

function isRoutineActiveOnDay(routine: Routine, date: Date | number): boolean {
  const dayOfWeek = typeof date === 'number' ? date : date.getDay();
  if (routine.frequency === 'daily') return true;
  if (routine.frequency === 'custom') return routine.daysOfWeek.includes(dayOfWeek);
  if (routine.frequency === 'weekly') {
    return routine.daysOfWeek?.length > 0 ? routine.daysOfWeek.includes(dayOfWeek) : dayOfWeek === 1;
  }
  return false;
}

export default function RoutinePage() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [view, setView] = useState<ViewMode>('list');
  const [showForm, setShowForm] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    activity: '',
    time: '09:00',
    endTime: '13:00',
    category: 'work',
    frequency: 'daily' as string,
    daysOfWeek: [] as number[],
    color: '#3b82f6',
    notes: '',
  });

  const today = new Date();
  const todayStr = formatDate(today);

  useEffect(() => {
    api.get<Routine[]>('/api/routine/all').then(setRoutines).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const created = await api.post<Routine>('/api/routine', form);
      setRoutines([...routines, created]);
      setShowForm(false);
      setForm({
        activity: '',
        time: '09:00',
        endTime: '13:00',
        category: 'work',
        frequency: 'daily',
        daysOfWeek: [],
        color: '#3b82f6',
        notes: '',
      });
    } catch (err: any) {
      setError(err.message || 'Error al crear actividad');
    }
  };

  const toggleComplete = async (routine: Routine, date: string) => {
    const isCompleted = routine.completedDates.includes(date);
    const newDates = isCompleted
      ? routine.completedDates.filter(d => d !== date)
      : [...routine.completedDates, date];
    const updated = await api.put<Routine>(`/api/routine/${routine._id}`, { completedDates: newDates });
    setRoutines(routines.map(r => r._id === routine._id ? updated : r));
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/api/routine/${id}`);
    setRoutines(routines.filter(r => r._id !== id));
  };

  const toggleDayOfWeek = (day: number) => {
    setForm(f => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter(d => d !== day)
        : [...f.daysOfWeek, day].sort()
    }));
  };

  const todayRoutines = useMemo(() =>
    routines.filter(r => isRoutineActiveOnDay(r, new Date(selectedDate))),
    [routines, selectedDate]
  );

  const completedToday = todayRoutines.filter(r => r.completedDates.includes(selectedDate)).length;

  const { daysInMonth, startDay } = getDaysInMonth(currentYear, currentMonth);

  const getRoutinesForDate = (date: string): Routine[] => {
    const d = new Date(date + 'T12:00:00');
    return routines.filter(r => isRoutineActiveOnDay(r, d));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rutina</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            {completedToday}/{todayRoutines.length} completadas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[var(--bg-secondary)] rounded-lg p-0.5 border border-[var(--border)]">
            {(['list', 'calendar'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === v ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                {v === 'list' ? 'Lista' : 'Calendario'}
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
            <Plus size={14} />
            Nueva actividad
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[var(--text-muted)]">Progreso de hoy</span>
          <span className="text-xs text-[var(--text-muted)] tabular-nums">
            {todayRoutines.length > 0 ? Math.round((completedToday / todayRoutines.length) * 100) : 0}%
          </span>
        </div>
        <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
            style={{ width: `${todayRoutines.length > 0 ? (completedToday / todayRoutines.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Time-blocking notification banner */}
      <div className="mb-6 p-3.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl flex items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
        <div className="flex items-center gap-2.5">
          <span className="text-base">📅</span>
          <span>
            <strong className="text-[var(--text-primary)]">Horario semanal sincronizado:</strong> Tus actividades con hora de inicio y fin se reflejan automáticamente como bloques de tiempo (Time-blocking) en tu <strong>Calendario</strong>.
          </span>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[var(--bg-secondary)] rounded-xl p-6 border border-[var(--border)] mb-8">
          {error && <p className="text-[var(--danger)] text-sm mb-4">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Actividad o Bloque (ej. Trabajo / Backend, Estudio Docker, Gym)"
              value={form.activity}
              onChange={e => setForm({ ...form, activity: e.target.value })}
              className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] sm:col-span-2"
              required
            />

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Categoría</label>
              <select
                value={form.category}
                onChange={e => {
                  const cat = e.target.value;
                  setForm({ ...form, category: cat, color: CATEGORIES[cat]?.defaultColor || form.color });
                }}
                className="w-full bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] text-sm text-[var(--text-primary)]"
              >
                {Object.entries(CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Hora Inicio</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={e => setForm({ ...form, time: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] text-sm text-[var(--text-primary)]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Hora Fin (opcional)</label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={e => setForm({ ...form, endTime: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] text-sm text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Frecuencia</label>
              <div className="flex gap-2">
                {[
                  { value: 'daily', label: 'Diario' },
                  { value: 'custom', label: 'Personalizado' },
                  { value: 'weekly', label: 'Semanal' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, frequency: value })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      form.frequency === value
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {form.frequency === 'custom' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Días de la semana</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((day, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDayOfWeek(i)}
                      className={`w-10 h-10 rounded-lg text-xs font-medium transition-colors ${
                        form.daysOfWeek.includes(i)
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Color del bloque</label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      form.color === c ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-secondary)] scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <textarea
              placeholder="Notas o detalles de este bloque (opcional)"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] focus:border-[var(--accent)] outline-none sm:col-span-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              rows={2}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Crear actividad
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-[var(--bg-tertiary)] hover:bg-[var(--border-hover)] px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {view === 'list' && (
        <div className="space-y-2">
          {todayRoutines.length === 0 ? (
            <div className="bg-[var(--bg-secondary)] rounded-xl p-12 border border-[var(--border)] text-center">
              <Repeat size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
              <p className="text-[var(--text-muted)] text-sm">No hay actividades para este día</p>
              <button onClick={() => setShowForm(true)} className="mt-3 text-[var(--accent)] text-sm font-medium hover:underline">
                Crear primera actividad
              </button>
            </div>
          ) : (
            todayRoutines.map(routine => {
              const isCompleted = routine.completedDates.includes(selectedDate);
              const catInfo = CATEGORIES[routine.category || 'work'];
              const timeDisplay = routine.endTime ? `${routine.time} - ${routine.endTime}` : routine.time;

              return (
                <div
                  key={routine._id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl border transition-colors ${
                    isCompleted
                      ? 'bg-[var(--accent-muted)] border-[var(--accent)]/20'
                      : 'bg-[var(--bg-secondary)] border-[var(--border)] hover:border-[var(--border-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <button
                      onClick={() => toggleComplete(routine, selectedDate)}
                      className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
                        isCompleted
                          ? 'bg-[var(--accent)] border-[var(--accent)]'
                          : 'border-[var(--border-hover)] hover:border-[var(--accent)]'
                      }`}
                    >
                      {isCompleted && <Check size={12} strokeWidth={3} className="text-white" />}
                    </button>
                    <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: routine.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${isCompleted ? 'line-through text-[var(--text-muted)]' : ''}`}>
                          {routine.activity}
                        </span>
                        {catInfo && (
                          <span
                            className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: routine.color + '18', color: routine.color }}
                          >
                            {catInfo.label}
                          </span>
                        )}
                      </div>
                      {routine.notes && (
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{routine.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border)]/40 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                      <Clock size={12} />
                      <span className="text-xs tabular-nums">{timeDisplay}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {routine.frequency === 'daily' && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">Diario</span>
                      )}
                      {routine.frequency === 'custom' && routine.daysOfWeek.map(d => (
                        <span key={d} className="text-[10px] font-medium w-5 h-5 rounded flex items-center justify-center bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                          {DAYS[d]}
                        </span>
                      ))}
                      {routine.frequency === 'weekly' && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">Semanal</span>
                      )}
                    </div>
                    <button onClick={() => handleDelete(routine._id)}
                      className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors p-1">
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
              <h3 className="text-sm font-medium">{MONTHS[currentMonth]} {currentYear}</h3>
              <div className="flex gap-1">
                <button onClick={() => {
                  if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
                  else setCurrentMonth(m => m - 1);
                }} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => {
                  if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
                  else setCurrentMonth(m => m + 1);
                }} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  <ChevronRight size={16} />
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
                const isSelected = dateStr === selectedDate;
                const dayRoutines = getRoutinesForDate(dateStr);
                const completedCount = dayRoutines.filter(r => r.completedDates.includes(dateStr)).length;
                return (
                  <button key={day} onClick={() => setSelectedDate(dateStr)}
                    className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-colors ${
                      isSelected ? 'bg-[var(--accent)] text-white' :
                      isToday ? 'bg-[var(--accent-muted)] text-[var(--accent)]' :
                      'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                    }`}>
                    <span className={`font-medium ${isSelected ? '' : ''}`}>{day}</span>
                    {dayRoutines.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayRoutines.slice(0, 3).map((r, ri) => (
                          <div key={ri} className="w-1 h-1 rounded-full"
                            style={{ backgroundColor: r.completedDates.includes(dateStr) ? (isSelected ? '#fff' : 'var(--accent)') : (isSelected ? 'rgba(255,255,255,0.4)' : r.color) }} />
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
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mb-4">
                {completedToday}/{todayRoutines.length} completadas
              </p>
              {todayRoutines.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] text-center py-4">Sin actividades</p>
              ) : (
                <div className="space-y-2">
                  {todayRoutines.map(routine => {
                    const isCompleted = routine.completedDates.includes(selectedDate);
                    return (
                      <div key={routine._id} className="flex items-center gap-3 py-2">
                        <button onClick={() => toggleComplete(routine, selectedDate)}
                          className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
                            isCompleted ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border-hover)]'
                          }`}>
                          {isCompleted && <Check size={10} strokeWidth={3} className="text-white" />}
                        </button>
                        <div className="w-1 h-4 rounded-full" style={{ backgroundColor: routine.color }} />
                        <div className="flex-1 min-w-0">
                          <span className={`text-xs ${isCompleted ? 'line-through text-[var(--text-muted)]' : ''}`}>{routine.activity}</span>
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] tabular-nums">{routine.time}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-5">
              <h3 className="text-sm font-medium mb-3">Resumen semanal</h3>
              <div className="space-y-2">
                {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map((day, i) => {
                  const dayIndex = i === 6 ? 0 : i + 1;
                  const count = routines.filter(r => isRoutineActiveOnDay(r, dayIndex)).length;
                  return (
                    <div key={day} className="flex items-center gap-3">
                      <span className="text-[11px] text-[var(--text-muted)] w-6">{day}</span>
                      <div className="flex-1 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${Math.min(count * 25, 100)}%` }} />
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] w-4 text-right tabular-nums">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
