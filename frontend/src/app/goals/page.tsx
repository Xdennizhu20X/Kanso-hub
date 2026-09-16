'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Target, Trash2, CheckCircle2, Circle, ChevronDown, ChevronUp, Flag } from 'lucide-react';

interface Milestone {
  _id: string;
  name: string;
  completed: boolean;
}

interface Goal {
  _id: string;
  title: string;
  description: string;
  type: string;
  targetDate: string;
  progress: number;
  milestones: Milestone[];
  status: string;
}

const TYPE_LABELS: Record<string, string> = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  yearly: 'Anual',
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [newMilestoneText, setNewMilestoneText] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ title: '', description: '', type: 'monthly', targetDate: '', progress: 0, status: 'active' });

  useEffect(() => {
    api.get<Goal[]>('/api/goals').then(setGoals).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const created = await api.post<Goal>('/api/goals', { ...form, milestones: [] });
      setGoals([created, ...goals]);
      setShowForm(false);
      setForm({ title: '', description: '', type: 'monthly', targetDate: '', progress: 0, status: 'active' });
    } catch (err: any) {
      setError(err.message || 'Error al crear meta');
    }
  };

  const updateProgress = async (goal: Goal, progress: number) => {
    const updated = await api.put<Goal>(`/api/goals/${goal._id}`, { progress });
    setGoals(goals.map(g => (g._id === goal._id ? updated : g)));
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/api/goals/${id}`);
    setGoals(goals.filter(g => g._id !== id));
  };

  const handleAddMilestone = async (goalId: string) => {
    const text = (newMilestoneText[goalId] || '').trim();
    if (!text) return;

    try {
      const updated = await api.post<Goal>(`/api/goals/${goalId}/milestones`, { name: text, completed: false });
      setGoals(goals.map(g => (g._id === goalId ? updated : g)));
      setNewMilestoneText(prev => ({ ...prev, [goalId]: '' }));
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleToggleMilestone = async (goal: Goal, milestone: Milestone) => {
    const newCompleted = !milestone.completed;
    try {
      const updated = await api.put<Goal>(`/api/goals/${goal._id}/milestones/${milestone._id}`, {
        completed: newCompleted,
      });

      // Auto-recalculate progress if milestones exist
      if (updated.milestones && updated.milestones.length > 0) {
        const completedCount = updated.milestones.filter(m => m.completed).length;
        const autoProgress = Math.round((completedCount / updated.milestones.length) * 100);
        const finalUpdated = await api.put<Goal>(`/api/goals/${goal._id}`, { progress: autoProgress });
        setGoals(goals.map(g => (g._id === goal._id ? finalUpdated : g)));
      } else {
        setGoals(goals.map(g => (g._id === goal._id ? updated : g)));
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleDeleteMilestone = async (goalId: string, milestoneId: string) => {
    try {
      const updated = await api.delete<Goal>(`/api/goals/${goalId}/milestones/${milestoneId}`);
      setGoals(goals.map(g => (g._id === goalId ? updated : g)));
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Metas</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">Objetivos a corto, mediano y largo plazo con hitos</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-3.5 py-2 rounded-lg text-xs font-medium transition-colors self-start sm:self-auto"
        >
          <Plus size={14} />
          Nueva meta
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[var(--bg-secondary)] rounded-xl p-4 sm:p-6 border border-[var(--border)] mb-8">
          {error && <p className="text-[var(--danger)] text-sm mb-4">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Título de la meta"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              required
            />
            <input
              type="date"
              value={form.targetDate}
              onChange={e => setForm({ ...form, targetDate: e.target.value })}
              className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] text-sm text-[var(--text-primary)]"
            />
            <select
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
              className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] text-sm text-[var(--text-primary)]"
            >
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
              className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] text-sm text-[var(--text-primary)]"
            >
              <option value="active">Activa</option>
              <option value="completed">Completada</option>
              <option value="paused">Pausada</option>
            </select>
            <textarea
              placeholder="Descripción (opcional)"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] col-span-1 sm:col-span-2"
              rows={2}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Crear meta</button>
            <button type="button" onClick={() => setShowForm(false)}
              className="bg-[var(--bg-tertiary)] hover:bg-[var(--border-hover)] px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] transition-colors">Cancelar</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map(goal => {
          const isExpanded = expandedGoalId === goal._id;
          const milestonesCount = goal.milestones?.length || 0;
          const completedMilestones = goal.milestones?.filter(m => m.completed).length || 0;

          return (
            <div key={goal._id} className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors group flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center flex-shrink-0">
                    <Target size={16} className="text-[var(--accent)]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">{goal.title}</h3>
                    {goal.description && <p className="text-[var(--text-muted)] text-xs mt-0.5 line-clamp-2">{goal.description}</p>}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(goal._id)}
                  title="Eliminar meta"
                  className="text-[var(--text-muted)] hover:text-[var(--danger)] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[var(--text-muted)]">Progreso</span>
                  <span className="tabular-nums font-medium text-[var(--text-primary)]">{goal.progress}%</span>
                </div>
                <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--accent)] rounded-full transition-all duration-500" style={{ width: `${goal.progress}%` }} />
                </div>
              </div>

              <input
                type="range"
                min={0}
                max={100}
                value={goal.progress}
                onChange={e => updateProgress(goal, parseInt(e.target.value))}
                className="w-full h-1 appearance-none bg-[var(--bg-tertiary)] rounded-full cursor-pointer accent-[var(--accent)] mb-4"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t border-[var(--border)]/60 mt-auto">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                    {TYPE_LABELS[goal.type]}
                  </span>
                  <button
                    onClick={() => setExpandedGoalId(isExpanded ? null : goal._id)}
                    className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                  >
                    <Flag size={11} />
                    <span>Hitos ({completedMilestones}/{milestonesCount})</span>
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>
                <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
                  Meta: {new Date(goal.targetDate).toLocaleDateString()}
                </span>
              </div>

              {/* Expandable Milestones Section */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-2.5">
                  <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Hitos del objetivo:</h4>

                  {goal.milestones && goal.milestones.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {goal.milestones.map(milestone => (
                        <div key={milestone._id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-xs">
                          <button
                            onClick={() => handleToggleMilestone(goal, milestone)}
                            className="flex items-center gap-2 flex-1 text-left"
                          >
                            {milestone.completed ? (
                              <CheckCircle2 size={14} className="text-[var(--accent)] flex-shrink-0" />
                            ) : (
                              <Circle size={14} className="text-[var(--text-muted)] flex-shrink-0" />
                            )}
                            <span className={milestone.completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}>
                              {milestone.name}
                            </span>
                          </button>
                          <button
                            onClick={() => handleDeleteMilestone(goal._id, milestone._id)}
                            className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors ml-2"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] opacity-60">Aún no hay hitos para esta meta</p>
                  )}

                  {/* Add Milestone input */}
                  <div className="flex gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="Nuevo hito..."
                      value={newMilestoneText[goal._id] || ''}
                      onChange={e => setNewMilestoneText(prev => ({ ...prev, [goal._id]: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMilestone(goal._id);
                        }
                      }}
                      className="flex-1 bg-[var(--bg-primary)] rounded-lg px-2.5 py-1.5 border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddMilestone(goal._id)}
                      className="px-2.5 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {goals.length === 0 && (
          <div className="col-span-full bg-[var(--bg-secondary)] rounded-xl p-12 border border-[var(--border)] text-center">
            <p className="text-[var(--text-muted)] text-sm">No hay metas registradas</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-[var(--accent)] text-sm font-medium hover:underline">
              Crear primera meta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
