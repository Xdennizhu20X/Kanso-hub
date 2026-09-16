'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import Sidebar, { navItems } from './Sidebar';
import CommandPalette from './CommandPalette';
import DailyStandupModal from './DailyStandupModal';
import FocusTimer from './FocusTimer';
import { checkUpcomingRoutinesAndTasks } from '@/lib/notifications';
import { Menu, Search, Zap } from 'lucide-react';


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [standupOpen, setStandupOpen] = useState(false);
  const isAuthPage = pathname === '/auth';

  // Close mobile drawer on route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Global keyboard shortcuts (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // PWA Service Worker Registration
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('PWA ServiceWorker registration skipped/failed:', err);
      });
    }
  }, []);


  // Periodic notification checker for routines and tasks
  useEffect(() => {
    if (!user) return;

    const runCheck = () => {
      Promise.all([
        api.get<any[]>('/api/routine/all').catch(() => []),
        api.get<any[]>('/api/tasks').catch(() => []),
      ]).then(([routines, tasks]) => {
        checkUpcomingRoutinesAndTasks(routines, tasks);
      });
    };

    runCheck();
    const interval = setInterval(runCheck, 2 * 60 * 1000); // every 2 minutes
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthPage || !user) {
    return <>{children}</>;
  }

  const currentNav = navItems.find(item => item.href === pathname);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <Sidebar
        className="hidden md:flex sticky top-0"
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenStandup={() => setStandupOpen(true)}
      />

      {/* Mobile Header Bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-primary)] sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
          <span className="font-semibold text-sm tracking-tight text-[var(--text-primary)]">Kanso Hub</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
            aria-label="Buscar"
          >
            <Search size={18} />
          </button>
          <button
            onClick={() => setStandupOpen(true)}
            className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/15"
            aria-label="Standup"
            title="Daily Standup"
          >
            <Zap size={18} />
          </button>
          {currentNav && (
            <span className="text-xs font-medium text-[var(--text-muted)] hidden xs:inline">
              {currentNav.label}
            </span>
          )}
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          onItemClick={() => setMobileOpen(false)}
          onClose={() => setMobileOpen(false)}
          onOpenCommandPalette={() => {
            setMobileOpen(false);
            setCommandPaletteOpen(true);
          }}
          onOpenStandup={() => {
            setMobileOpen(false);
            setStandupOpen(true);
          }}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto max-w-[1200px] w-full mx-auto">
        {children}
      </main>

      {/* Global Command Palette & Standup Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenStandup={() => setStandupOpen(true)}
      />

      <DailyStandupModal
        isOpen={standupOpen}
        onClose={() => setStandupOpen(false)}
      />

      {/* Deep Work & Pomodoro Focus Timer */}
      <FocusTimer />
    </div>
  );
}

