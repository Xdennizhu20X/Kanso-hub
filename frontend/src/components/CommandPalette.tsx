'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  Search, LayoutDashboard, CalendarDays, FolderKanban, CheckSquare,
  CalendarRange, Bookmark, StickyNote, Dumbbell, Target, Key, Settings,
  Sun, Moon, Zap, ArrowRight, CornerDownLeft, X, Bot
} from 'lucide-react';

interface Task {
  _id: string;
  title: string;
}

interface Note {
  _id: string;
  title: string;
  content: string;
}

interface AgentSession {
  _id: string;
  title: string;
  agent: string;
  command: string;
  conversationId: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStandup: () => void;
}

export default function CommandPalette({ isOpen, onClose, onOpenStandup }: CommandPaletteProps) {
  const router = useRouter();
  const { user, updatePreferences } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Preload tasks, notes and agent sessions for instant live search
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      api.get<Task[]>('/api/tasks').then(setTasks).catch(() => {});
      api.get<Note[]>('/api/notes').then(setNotes).catch(() => {});
      api.get<AgentSession[]>('/api/agent-sessions').then(setSessions).catch(() => {});
    }
  }, [isOpen]);

  const toggleTheme = async () => {
    const current = user?.preferences?.theme || 'dark';
    const nextTheme = current === 'dark' ? 'light' : 'dark';
    await updatePreferences({ theme: nextTheme });
    onClose();
  };

  const navItems = [
    { label: 'Ir a Dashboard', icon: LayoutDashboard, category: 'Navegación', action: () => { router.push('/'); onClose(); } },
    { label: 'Ir a Calendario y Horario', icon: CalendarDays, category: 'Navegación', action: () => { router.push('/calendar'); onClose(); } },
    { label: 'Ir a Tablero de Tareas (Kanban)', icon: CheckSquare, category: 'Navegación', action: () => { router.push('/tasks'); onClose(); } },
    { label: 'Ir a Rutinas y Horario Semanal', icon: CalendarRange, category: 'Navegación', action: () => { router.push('/routine'); onClose(); } },
    { label: 'Ir a Sesiones de Agentes IA', icon: Bot, category: 'Navegación', action: () => { router.push('/agent-sessions'); onClose(); } },
    { label: 'Ir a Proyectos', icon: FolderKanban, category: 'Navegación', action: () => { router.push('/projects'); onClose(); } },
    { label: 'Ir a Hábitos', icon: Dumbbell, category: 'Navegación', action: () => { router.push('/habits'); onClose(); } },
    { label: 'Ir a Notas e Ideas', icon: StickyNote, category: 'Navegación', action: () => { router.push('/notes'); onClose(); } },
    { label: 'Ir a Metas', icon: Target, category: 'Navegación', action: () => { router.push('/goals'); onClose(); } },
    { label: 'Ir a Bóveda de Contraseñas', icon: Key, category: 'Navegación', action: () => { router.push('/passwords'); onClose(); } },
    { label: 'Ir a Herramientas y Bookmarks', icon: Bookmark, category: 'Navegación', action: () => { router.push('/resources'); onClose(); } },
    { label: 'Ir a Configuración', icon: Settings, category: 'Navegación', action: () => { router.push('/settings'); onClose(); } },
  ];

  const actionItems = [
    {
      label: '⚡ Iniciar Daily Standup Matutino',
      icon: Zap,
      category: 'Acciones Rápidas',
      action: () => {
        onClose();
        onOpenStandup();
      },
    },
    {
      label: `Alternar Tema (${user?.preferences?.theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'})`,
      icon: user?.preferences?.theme === 'light' ? Moon : Sun,
      category: 'Acciones Rápidas',
      action: toggleTheme,
    },
  ];

  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return [...actionItems, ...navItems];
    }
    const q = query.toLowerCase();

    const filteredActions = actionItems.filter(item => item.label.toLowerCase().includes(q));
    const filteredNav = navItems.filter(item => item.label.toLowerCase().includes(q));

    const matchedSessions = sessions
      .filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.agent.toLowerCase().includes(q) ||
        s.conversationId.toLowerCase().includes(q) ||
        s.command?.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map(s => ({
        label: `Agente (${s.agent}): ${s.title}`,
        icon: Bot,
        category: 'Sesiones IA',
        action: () => {
          if (s.command) navigator.clipboard.writeText(s.command);
          router.push('/agent-sessions');
          onClose();
        },
      }));

    const matchedTasks = tasks
      .filter(t => t.title.toLowerCase().includes(q))
      .slice(0, 5)
      .map(t => ({
        label: `Tarea: ${t.title}`,
        icon: CheckSquare,
        category: 'Tareas',
        action: () => { router.push('/tasks'); onClose(); },
      }));

    const matchedNotes = notes
      .filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
      .slice(0, 5)
      .map(n => ({
        label: `Nota: ${n.title}`,
        icon: StickyNote,
        category: 'Notas',
        action: () => { router.push('/notes'); onClose(); },
      }));

    return [...filteredActions, ...matchedSessions, ...filteredNav, ...matchedTasks, ...matchedNotes];
  }, [query, tasks, notes, sessions, user]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (searchResults.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + searchResults.length) % (searchResults.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults[selectedIndex]) {
        searchResults[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-xl bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Input Bar */}
        <div className="flex items-center gap-3 px-3.5 sm:px-4 py-3 sm:py-3.5 border-b border-[var(--border)]">
          <Search size={18} className="text-[var(--text-muted)] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar página, tarea, nota o ejecutar acción..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X size={14} />
            </button>
          )}
          <span className="text-[10px] bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-muted)] px-1.5 py-0.5 rounded font-mono">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {searchResults.map((item, index) => {
            const Icon = item.icon;
            const isSelected = index === selectedIndex;
            return (
              <button
                key={`${item.category}-${item.label}-${index}`}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors ${
                  isSelected
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon size={16} className={isSelected ? 'text-white' : 'text-[var(--text-muted)]'} />
                  <span className="truncate font-medium">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                  }`}>
                    {item.category}
                  </span>
                  {isSelected && <CornerDownLeft size={12} className="text-white/80" />}
                </div>
              </button>
            );
          })}

          {searchResults.length === 0 && (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              No se encontraron resultados para &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-[var(--bg-primary)] border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono bg-[var(--bg-secondary)] px-1 py-0.5 rounded border border-[var(--border)]">↑</kbd> <kbd className="font-mono bg-[var(--bg-secondary)] px-1 py-0.5 rounded border border-[var(--border)]">↓</kbd> navegar</span>
            <span><kbd className="font-mono bg-[var(--bg-secondary)] px-1 py-0.5 rounded border border-[var(--border)]">↵</kbd> seleccionar</span>
          </div>
          <span className="hidden sm:inline">Kanso Hub Command Palette</span>
        </div>
      </div>
    </div>
  );
}
