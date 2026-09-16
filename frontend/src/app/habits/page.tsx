'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Flame, Trash2, Check, Target, Hash, ChevronRight, Edit3 } from 'lucide-react';

interface DailyLog {
  date: string;
  value: number;
}

interface Habit {
  _id: string;
  name: string;
  frequency: string;
  kind?: 'boolean' | 'numeric';
  targetValue?: number;
  unit?: string;
  color: string;
  icon: string;
  completedDates: string[];
  dailyValues?: DailyLog[];
  currentStreak: number;
  bestStreak: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [exactValueInput, setExactValueInput] = useState<number>(0);
  const [form, setForm] = useState({
    name: '',
    kind: 'boolean' as 'boolean' | 'numeric',
    targetValue: 10000,
    unit: 'pasos',
    color: COLORS[0],
    icon: '✓',
    frequency: 'daily',
  });


  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    api.get<Habit[]>('/api/habits').then(setHabits).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        targetValue: form.kind === 'numeric' ? Number(form.targetValue) || 1 : 1,
        unit: form.kind === 'numeric' ? form.unit : '',
      };
      const created = await api.post<Habit>('/api/habits', payload);
      setHabits([...habits, created]);
      setShowForm(false);
      setForm({
        name: '',
        kind: 'boolean',
        targetValue: 10000,
        unit: 'pasos',
        color: COLORS[0],
        icon: '✓',
        frequency: 'daily',
      });
    } catch (err: any) {
      setError(err.message || 'Error al crear hábito');
    }
  };

  const toggleHabit = async (habit: Habit) => {
    if (habit.kind === 'numeric') {
      const current = getTodayValue(habit);
      const target = habit.targetValue || 1;
      const nextVal = current >= target ? 0 : target;
      const updated = await api.post<Habit>(`/api/habits/${habit._id}/progress`, {
        date: today,
        value: nextVal,
      });
      setHabits(habits.map(h => (h._id === habit._id ? updated : h)));
    } else {
      const updated = await api.post<Habit>(`/api/habits/${habit._id}/toggle`, { date: today });
      setHabits(habits.map(h => (h._id === habit._id ? updated : h)));
    }
  };

  const addProgress = async (habit: Habit, increment: number) => {
    const updated = await api.post<Habit>(`/api/habits/${habit._id}/progress`, {
      date: today,
      increment,
    });
    setHabits(habits.map(h => (h._id === habit._id ? updated : h)));
  };

  const setExactProgress = async (habitId: string, val: number) => {
    const updated = await api.post<Habit>(`/api/habits/${habitId}/progress`, {
      date: today,
      value: Math.max(0, val),
    });
    setHabits(habits.map(h => (h._id === habitId ? updated : h)));
    setEditingHabitId(null);
  };


  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este hábito?')) return;
    await api.delete(`/api/habits/${id}`);
    setHabits(habits.filter(h => h._id !== id));
  };

  const isCompletedToday = (habit: Habit) => {
    return habit.completedDates?.some(d => d.split('T')[0] === today);
  };

  const getTodayValue = (habit: Habit): number => {
    const log = habit.dailyValues?.find(v => v.date === today);
    return log ? log.value : 0;
  };

  const getValueForDate = (habit: Habit, dateStr: string): number => {
    const log = habit.dailyValues?.find(v => v.date === dateStr);
    return log ? log.value : 0;
  };

  const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toISOString().split('T')[0],
      label: dayNames[d.getDay()],
    };
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hábitos</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Construye consistencia con hábitos simples y métricas cuantitativas
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-3.5 py-2 rounded-lg text-xs font-medium transition-colors self-start sm:self-auto"
        >
          <Plus size={14} />
          Nuevo hábito
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[var(--bg-secondary)] rounded-xl p-6 border border-[var(--border)] mb-8">
          {error && <p className="text-[var(--danger)] text-sm mb-4">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nombre del hábito (ej. Caminar 10k pasos, Leer, Agua)"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] sm:col-span-2"
              required
            />

            {/* Tipo de hábito: Binario vs Numérico */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Tipo de registro</label>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, kind: 'boolean' })}
                  className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-colors ${
                    form.kind === 'boolean'
                      ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
                      : 'border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--border-hover)]'
                  }`}
                >
                  <Check size={16} className={form.kind === 'boolean' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
                  <div>
                    <div className="text-xs font-medium text-[var(--text-primary)]">Binario (Sí / No)</div>
                    <div className="text-[10px] text-[var(--text-muted)]">Check simple (ej. Tomar vitaminas, Meditar)</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setForm({ ...form, kind: 'numeric' })}
                  className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-colors ${
                    form.kind === 'numeric'
                      ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
                      : 'border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--border-hover)]'
                  }`}
                >
                  <Target size={16} className={form.kind === 'numeric' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
                  <div>
                    <div className="text-xs font-medium text-[var(--text-primary)]">Cuantitativo (Meta)</div>
                    <div className="text-[10px] text-[var(--text-muted)]">Con número (ej. 10.000 pasos, 2L agua)</div>
                  </div>
                </button>
              </div>
            </div>

            {form.kind === 'numeric' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Meta diaria</label>
                  <input
                    type="number"
                    placeholder="10000"
                    value={form.targetValue}
                    onChange={e => setForm({ ...form, targetValue: Number(e.target.value) })}
                    className="w-full bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Unidad de medida</label>
                  <input
                    type="text"
                    placeholder="ej. pasos, ml, páginas, pomodoros"
                    value={form.unit}
                    onChange={e => setForm({ ...form, unit: e.target.value })}
                    className="w-full bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Icono o Emoji</label>
              <input
                type="text"
                placeholder="✓ o emoji ej. 🚶‍♂️, 💧, 📚"
                value={form.icon}
                onChange={e => setForm({ ...form, icon: e.target.value })}
                className="w-full bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Color representativo</label>
              <div className="flex gap-2 pt-1">
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
          </div>

          <div className="flex gap-2 mt-6">
            <button
              type="submit"
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Crear hábito
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

      <div className="space-y-3">
        {habits.map(habit => {
          const isNumeric = habit.kind === 'numeric';
          const todayVal = getTodayValue(habit);
          const target = habit.targetValue || 1;
          const progressPercent = Math.min(100, Math.round((todayVal / target) * 100));
          const completed = isCompletedToday(habit);

          // Generate intelligent quick increment buttons based on target magnitude
          const increments = target >= 5000
            ? [1000, 2500, 5000]
            : target >= 1000
            ? [250, 500, 1000]
            : target >= 20
            ? [1, 5, 10]
            : [1, 2, 5];

          return (
            <div
              key={habit._id}
              className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[var(--border)] hover:border-[var(--border-hover)] transition-all group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  {/* Action button */}
                  <button
                    onClick={() => toggleHabit(habit)}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg transition-all flex-shrink-0 ${
                      completed
                        ? 'text-white shadow-sm scale-105'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:scale-105'
                    }`}
                    style={{ backgroundColor: completed ? habit.color : undefined }}
                    title={isNumeric ? `Meta: ${target} ${habit.unit}` : 'Marcar completado'}
                  >
                    {habit.icon || '✓'}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">{habit.name}</h3>
                      {isNumeric && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                          {habit.unit}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs">
                      <div className="flex items-center gap-1 text-orange-400">
                        <Flame size={13} />
                        <span className="tabular-nums font-medium">{habit.currentStreak} días</span>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)]">Récord: {habit.bestStreak}</span>

                      {isNumeric && (
                        editingHabitId === habit._id ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              setExactProgress(habit._id, exactValueInput);
                            }}
                            className="flex items-center gap-1.5 ml-1"
                          >
                            <input
                              type="number"
                              value={exactValueInput}
                              onChange={(e) => setExactValueInput(Number(e.target.value))}
                              className="w-20 bg-[var(--bg-primary)] px-2 py-0.5 rounded border border-[var(--accent)] text-xs text-[var(--text-primary)] focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="submit"
                              className="p-1 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                              title="Guardar valor exacto"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingHabitId(null)}
                              className="p-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                              title="Cancelar"
                            >
                              ✕
                            </button>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingHabitId(habit._id);
                              setExactValueInput(todayVal);
                            }}
                            className="group/val flex items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] tabular-nums ml-1 transition-colors"
                            title="Haz clic para ingresar un valor exacto (ej. 8432 pasos)"
                          >
                            <span>
                              Hoy: <strong className={completed ? 'text-[var(--accent)]' : ''}>{todayVal.toLocaleString()}</strong> / {target.toLocaleString()} {habit.unit} ({progressPercent}%)
                            </span>
                            <Edit3 size={11} className="opacity-100 sm:opacity-0 sm:group-hover/val:opacity-100 transition-opacity text-[var(--accent)]" />
                          </button>
                        )
                      )}

                    </div>
                  </div>
                </div>

                {/* Right side: 7-day visual & Controls */}
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-between sm:justify-end w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border)]/40">
                  {/* Quick increment buttons for numeric habits */}
                  {isNumeric && (
                    <div className="flex items-center gap-1">
                      {increments.map(inc => (
                        <button
                          key={inc}
                          onClick={() => addProgress(habit, inc)}
                          className="text-[11px] font-medium px-2 py-1 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--accent-muted)] hover:text-[var(--accent)] text-[var(--text-secondary)] transition-colors"
                          title={`Añadir +${inc.toLocaleString()} ${habit.unit}`}
                        >
                          +{inc >= 1000 ? `${inc / 1000}k` : inc}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 7-day streak grid */}
                  <div className="flex items-center gap-1.5 pl-2 sm:border-l border-[var(--border)]">
                    {last7Days.map(item => {
                      const isDone = habit.completedDates?.some(d => d.split('T')[0] === item.date);
                      const dayVal = getValueForDate(habit, item.date);
                      const isPartial = !isDone && isNumeric && dayVal > 0;

                      return (
                        <div key={item.date} className="flex flex-col items-center gap-1">
                          <span className="text-[9px] text-[var(--text-muted)] font-medium">{item.label}</span>
                          <div
                            className={`w-5 h-5 rounded-md transition-colors ${
                              isDone
                                ? ''
                                : isPartial
                                ? 'border border-dashed'
                                : 'bg-[var(--bg-tertiary)]'
                            }`}
                            style={{
                              backgroundColor: isDone ? habit.color : isPartial ? habit.color + '40' : undefined,
                              borderColor: isPartial ? habit.color : undefined,
                            }}
                            title={isNumeric ? `${dayVal} / ${target} ${habit.unit}` : undefined}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handleDelete(habit._id)}
                    className="text-[var(--text-muted)] hover:text-[var(--danger)] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1 ml-auto sm:ml-0"
                    title="Eliminar hábito"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Progress bar for numeric habits */}
              {isNumeric && (
                <div className="mt-3.5 pt-2 border-t border-[var(--border)]/60">
                  <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${progressPercent}%`,
                        backgroundColor: completed ? '#10b981' : habit.color || 'var(--accent)',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {habits.length === 0 && (
          <div className="bg-[var(--bg-secondary)] rounded-xl p-12 border border-[var(--border)] text-center">
            <p className="text-[var(--text-muted)] text-sm">No hay hábitos creados</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-[var(--accent)] text-sm font-medium hover:underline"
            >
              Crear primer hábito
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
