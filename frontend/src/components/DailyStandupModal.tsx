'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { X, Check, Copy, Zap, Clock, AlertCircle, Calendar, Sparkles, GitCommit, Bot } from 'lucide-react';

interface Task {
  _id: string;
  title: string;
  status: string;
  dueDate?: string;
  updatedAt?: string;
}

interface Routine {
  _id: string;
  activity: string;
  time: string;
  endTime?: string;
  frequency: string;
  daysOfWeek: number[];
  completedDates: string[];
}

interface Habit {
  _id: string;
  name: string;
  completedDates: string[];
}

interface AgentSession {
  _id: string;
  title: string;
  agent: string;
  command: string;
  status: string;
}

interface GitHubActivity {
  configured: boolean;
  username?: string;
  commitsCount: number;
  repos?: Array<{ name: string; commits: string[] }>;
}

interface DailyStandupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DailyStandupModal({ isOpen, onClose }: DailyStandupModalProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [agentSessions, setAgentSessions] = useState<AgentSession[]>([]);
  const [githubActivity, setGithubActivity] = useState<GitHubActivity | null>(null);
  const [focusGoal, setFocusGoal] = useState('');
  const [blockers, setBlockers] = useState('Ninguno');
  const [copied, setCopied] = useState(false);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const dayOfWeek = today.getDay();

  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      Promise.all([
        api.get<Task[]>('/api/tasks').catch(() => []),
        api.get<Routine[]>('/api/routine/all').catch(() => []),
        api.get<Habit[]>('/api/habits').catch(() => []),
        api.get<AgentSession[]>('/api/agent-sessions?status=active').catch(() => []),
        api.get<GitHubActivity>('/api/agent/github-activity').catch(() => null),
      ]).then(([t, r, h, s, gh]) => {
        setTasks(t);
        setRoutines(r);
        setHabits(h);
        setAgentSessions(Array.isArray(s) ? s : []);
        setGithubActivity(gh);
      });
    }
  }, [isOpen]);

  // Tasks completed recently
  const completedTasks = useMemo(() => {
    return tasks.filter(t => t.status === 'done' || t.status === 'completed').slice(0, 5);
  }, [tasks]);

  // Active routines for today
  const todayRoutines = useMemo(() => {
    return routines.filter(r => {
      if (r.frequency === 'daily') return true;
      if (r.frequency === 'custom') return r.daysOfWeek?.includes(dayOfWeek);
      if (r.frequency === 'weekly') return true;
      return false;
    });
  }, [routines, dayOfWeek]);

  // Tasks pending or in progress
  const todayTasks = useMemo(() => {
    return tasks.filter(t => t.status === 'in_progress' || (t.dueDate && t.dueDate.split('T')[0] === todayStr));
  }, [tasks, todayStr]);

  const completedHabitsToday = useMemo(() => {
    return habits.filter(h => h.completedDates?.some(d => d.split('T')[0] === todayStr));
  }, [habits, todayStr]);

  const standupMarkdown = useMemo(() => {
    const formattedDate = today.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    let md = `☀️ **Daily Standup - ${formattedDate}**\n\n`;

    md += `✅ **¿Qué hice / completado recientemente?**\n`;
    if (completedTasks.length === 0 && completedHabitsToday.length === 0 && (!githubActivity || githubActivity.commitsCount === 0)) {
      md += `- Sin tareas cerradas registradas\n`;
    } else {
      completedTasks.forEach(t => {
        md += `- Tarea cerrada: ${t.title}\n`;
      });
      completedHabitsToday.forEach(h => {
        md += `- Hábito cumplido: ${h.name}\n`;
      });
      if (githubActivity && githubActivity.commitsCount > 0 && githubActivity.repos) {
        githubActivity.repos.forEach(repo => {
          repo.commits.slice(0, 3).forEach(c => {
            md += `- Git commit (${repo.name}): ${c}\n`;
          });
        });
      }
    }

    if (agentSessions.length > 0) {
      md += `\n🤖 **Sesiones de IA / Agentes activas:**\n`;
      agentSessions.slice(0, 3).forEach(s => {
        md += `- [${s.agent.toUpperCase()}] ${s.title}\n`;
      });
    }

    md += `\n🎯 **¿Qué haré hoy?**\n`;
    if (todayRoutines.length > 0) {
      todayRoutines.forEach(r => {
        const timeRange = r.endTime ? `${r.time} - ${r.endTime}` : r.time;
        md += `- [${timeRange}] ${r.activity}\n`;
      });
    }
    if (todayTasks.length > 0) {
      todayTasks.forEach(t => {
        md += `- Tarea: ${t.title} (${t.status === 'in_progress' ? 'En progreso' : 'Prioritaria'})\n`;
      });
    }
    if (todayRoutines.length === 0 && todayTasks.length === 0) {
      md += `- Trabajo general en proyectos personales\n`;
    }

    if (focusGoal.trim()) {
      md += `\n🚀 **Foco principal del día (One Big Thing):**\n- ${focusGoal.trim()}\n`;
    }

    if (blockers.trim()) {
      md += `\n⚠️ **Bloqueos / Obstáculos:**\n- ${blockers.trim()}\n`;
    }

    return md;
  }, [completedTasks, completedHabitsToday, todayRoutines, todayTasks, githubActivity, agentSessions, focusGoal, blockers, today]);

  const handleCopy = () => {
    navigator.clipboard.writeText(standupMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-2xl bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0">
              <Zap size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">Daily Standup Matutino</h2>
              <p className="text-[11px] sm:text-xs text-[var(--text-muted)] line-clamp-1">Sincroniza tus prioridades y comparte tu avance diario</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
          {/* Quick inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-400" />
                Foco principal de hoy (One Big Thing)
              </label>
              <input
                type="text"
                placeholder="ej. Terminar el módulo de autenticación..."
                value={focusGoal}
                onChange={e => setFocusGoal(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 flex items-center gap-1.5">
                <AlertCircle size={13} className="text-rose-400" />
                Bloqueos / Impedimentos
              </label>
              <input
                type="text"
                placeholder="Ninguno"
                value={blockers}
                onChange={e => setBlockers(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          {/* Standup Preview */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
              Vista previa en Markdown (Listo para Slack, Teams o Discord)
            </label>
            <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-3 sm:p-4 font-mono text-xs text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed max-h-52 sm:max-h-60 overflow-y-auto">
              {standupMarkdown}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 bg-[var(--bg-primary)] border-t border-[var(--border)] flex items-center justify-between gap-2">
          <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline">
            Generado automáticamente desde Kanso Hub
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleCopy}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? '¡Copiado!' : 'Copiar Standup'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] border border-[var(--border)] transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
