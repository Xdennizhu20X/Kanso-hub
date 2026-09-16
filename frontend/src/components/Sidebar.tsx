'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, FolderKanban, CheckSquare, CalendarDays,
  CalendarRange, Bookmark, StickyNote, Target, Key, Dumbbell, Settings, LogOut, X,
  Search, Zap, Bot
} from 'lucide-react';

export const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/calendar', label: 'Calendario', icon: CalendarDays },
  { href: '/projects', label: 'Proyectos', icon: FolderKanban },
  { href: '/tasks', label: 'Tareas', icon: CheckSquare },
  { href: '/routine', label: 'Rutina', icon: CalendarRange },
  { href: '/agent-sessions', label: 'Sesiones IA', icon: Bot },
  { href: '/resources', label: 'Herramientas', icon: Bookmark },
  { href: '/notes', label: 'Notas', icon: StickyNote },
  { href: '/habits', label: 'Hábitos', icon: Dumbbell },
  { href: '/goals', label: 'Metas', icon: Target },
  { href: '/passwords', label: 'Contraseñas', icon: Key },
  { href: '/settings', label: 'Configuración', icon: Settings },
];

interface SidebarProps {
  onItemClick?: () => void;
  onClose?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenStandup?: () => void;
  className?: string;
}

export default function Sidebar({
  onItemClick,
  onClose,
  onOpenCommandPalette,
  onOpenStandup,
  className = '',
}: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className={`w-56 border-r border-[var(--border)] bg-[var(--bg-primary)] flex flex-col h-screen ${className}`}>
      <div className="p-5 pb-2 flex items-center justify-between">
        <h1 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">Kanso Hub</h1>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Quick developer actions: Command Palette & Standup */}
      <div className="px-3 pt-1 pb-2 space-y-1.5">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--border-hover)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          title="Abrir Command Palette (Ctrl+K)"
        >
          <div className="flex items-center gap-2">
            <Search size={13} />
            <span>Buscar...</span>
          </div>
          <kbd className="font-mono text-[10px] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded border border-[var(--border)]">
            Ctrl K
          </kbd>
        </button>

        <button
          onClick={() => {
            onItemClick?.();
            onOpenStandup?.();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium transition-colors cursor-pointer"
        >
          <Zap size={13} />
          <span>Daily Standup</span>
        </button>
      </div>

      <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onItemClick}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <Icon size={16} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[var(--border)]">
        <button
          onClick={() => {
            onItemClick?.();
            logout();
          }}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors w-full"
        >
          <LogOut size={16} strokeWidth={1.8} />
          <span>Salir</span>
        </button>
      </div>
    </aside>
  );
}
