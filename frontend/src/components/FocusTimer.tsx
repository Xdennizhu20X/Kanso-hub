'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, Maximize2, Minimize2, X, Timer, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { api } from '@/lib/api';

interface TaskOption {
  _id: string;
  title: string;
  priority: string;
  status: string;
  actualMinutes?: number;
}

const MODES = [
  { id: 'pomodoro', label: 'Pomodoro', minutes: 25 },
  { id: 'deepwork', label: 'Deep Work', minutes: 50 },
  { id: 'shortbreak', label: 'Descanso', minutes: 5 },
  { id: 'longbreak', label: 'Pausa Larga', minutes: 15 },
];

export default function FocusTimer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [selectedMode, setSelectedMode] = useState('pomodoro');
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  // Linked Task state
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  // Audio ambiance (White/Pink noise generator via Web Audio API)
  const [ambientSound, setAmbientSound] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioNode | null>(null);

  // Fetch pending tasks when opening
  useEffect(() => {
    if (isOpen && tasks.length === 0) {
      api.get<TaskOption[]>('/api/tasks?status=in_progress,todo')
        .then(res => {
          if (Array.isArray(res)) setTasks(res);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Timer interval countdown
  useEffect(() => {
    let interval: any = null;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (isRunning && secondsLeft === 0) {
      setIsRunning(false);
      handleTimerComplete();
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft]);

  // Ambient sound generator using Web Audio API
  useEffect(() => {
    if (ambientSound && isRunning) {
      startAmbientNoise();
    } else {
      stopAmbientNoise();
    }
    return () => stopAmbientNoise();
  }, [ambientSound, isRunning]);

  const startAmbientNoise = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Pink noise filter
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 0.15; // gentle volume
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const gain = ctx.createGain();
      gain.gain.value = 0.08;

      noise.connect(gain);
      gain.connect(ctx.destination);
      noise.start(0);
      noiseNodeRef.current = noise;
    } catch {
      // AudioContext fallback
    }
  };

  const stopAmbientNoise = () => {
    try {
      if (noiseNodeRef.current) {
        (noiseNodeRef.current as any).stop();
        noiseNodeRef.current.disconnect();
        noiseNodeRef.current = null;
      }
    } catch {}
  };

  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch {}
  };

  const handleTimerComplete = async () => {
    playChime();
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('¡Sesión de Foco Completada! 🎯', {
        body: `Completaste tu sesión de ${MODES.find(m => m.id === selectedMode)?.label}. ¡Buen trabajo!`,
        icon: '/favicon.ico',
      });
    }

    // Accumulate actual minutes to task
    if (selectedTaskId) {
      const elapsedMins = Math.round(totalSeconds / 60);
      try {
        const currentTask = tasks.find(t => t._id === selectedTaskId);
        const prevMinutes = currentTask?.actualMinutes || 0;
        await api.put(`/api/tasks/${selectedTaskId}`, {
          actualMinutes: prevMinutes + elapsedMins,
        });
      } catch (err) {
        console.error('Error updating task actualMinutes:', err);
      }
    }
  };

  const handleModeChange = (modeId: string) => {
    const found = MODES.find(m => m.id === modeId);
    if (!found) return;
    setSelectedMode(modeId);
    setTotalSeconds(found.minutes * 60);
    setSecondsLeft(found.minutes * 60);
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSecondsLeft(totalSeconds);
  };

  const handleMarkTaskDone = async () => {
    if (!selectedTaskId) return;
    try {
      await api.put(`/api/tasks/${selectedTaskId}`, { status: 'done' });
      setTasks(prev => prev.filter(t => t._id !== selectedTaskId));
      setSelectedTaskId('');
    } catch (err) {
      console.error('Error marking task as done:', err);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.max(0, Math.min(100, ((totalSeconds - secondsLeft) / totalSeconds) * 100));
  const activeTask = tasks.find(t => t._id === selectedTaskId);

  // Floating trigger button when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border)] shadow-xl text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent)] transition-all group"
        title="Abrir Modo Enfoque / Pomodoro"
      >
        <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
        <Timer size={15} className="text-[var(--accent)] group-hover:scale-110 transition-transform" />
        <span className="hidden sm:inline">Modo Enfoque</span>
        {isRunning && (
          <span className="font-mono tabular-nums text-[var(--accent)] font-semibold">
            {formatTime(secondsLeft)}
          </span>
        )}
      </button>
    );
  }

  // Maximized distraction-free mode
  if (isMaximized) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--bg-primary)] flex flex-col items-center justify-between p-4 sm:p-8 backdrop-blur-2xl">
        <div className="w-full flex items-center justify-between max-w-2xl">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--text-muted)]">
            <Sparkles size={16} className="text-[var(--accent)]" />
            <span className="truncate">Modo Concentración Absoluta</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAmbientSound(!ambientSound)}
              className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
                ambientSound ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)]'
              }`}
              title="Sonido de lluvia / ruido rosa para concentración"
            >
              {ambientSound ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span className="hidden xs:inline">{ambientSound ? 'Ruido Rosa ON' : 'Sonido OFF'}</span>
            </button>
            <button
              onClick={() => setIsMaximized(false)}
              className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <Minimize2 size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center my-auto space-y-6 sm:space-y-8 text-center px-2">
          {activeTask ? (
            <div className="px-4 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-xs sm:text-sm font-medium text-[var(--text-secondary)] max-w-sm truncate">
              Enfocado en: <strong className="text-[var(--text-primary)]">{activeTask.title}</strong>
            </div>
          ) : (
            <div className="text-xs text-[var(--text-muted)]">Sin tarea asignada (Enfoque Libre)</div>
          )}

          {/* Huge Timer Display */}
          <div className="font-mono text-6xl sm:text-8xl md:text-9xl font-bold tracking-tighter text-[var(--text-primary)] tabular-nums select-none">
            {formatTime(secondsLeft)}
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base font-semibold text-white shadow-2xl flex items-center gap-2 transition-transform hover:scale-105 ${
                isRunning ? 'bg-amber-600 hover:bg-amber-500' : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)]'
              }`}
            >
              {isRunning ? <Pause size={18} /> : <Play size={18} />}
              <span>{isRunning ? 'Pausar' : 'Iniciar'}</span>
            </button>
            <button
              onClick={handleReset}
              className="p-3.5 sm:p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              title="Reiniciar"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>

        <div className="text-[11px] sm:text-xs text-[var(--text-muted)] text-center">
          Presiona minimizar para volver a la interfaz de Kanso Hub
        </div>
      </div>
    );
  }

  // Floating modal widget in bottom right
  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-primary)]/60">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
          <Timer size={15} className="text-[var(--accent)]" />
          <span>Temporizador de Enfoque</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAmbientSound(!ambientSound)}
            className={`p-1.5 rounded-md text-xs transition-colors ${
              ambientSound ? 'text-[var(--accent)] bg-[var(--accent-muted)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            title="Generador de Ruido Rosa (Concentración)"
          >
            {ambientSound ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
          <button
            onClick={() => setIsMaximized(true)}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Pantalla Completa"
          >
            <Maximize2 size={14} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Cerrar"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[var(--bg-primary)] rounded-lg border border-[var(--border)]">
          {MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => handleModeChange(mode.id)}
              className={`py-1.5 rounded text-[11px] font-medium transition-all ${
                selectedMode === mode.id
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Task Selector */}
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
            Vincular con Tarea activa
          </label>
          <select
            value={selectedTaskId}
            onChange={e => setSelectedTaskId(e.target.value)}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="">(Sin vincular - Foco general)</option>
            {tasks.map(t => (
              <option key={t._id} value={t._id}>
                [{t.priority.toUpperCase()}] {t.title}
              </option>
            ))}
          </select>
        </div>

        {/* Main Countdown Display */}
        <div className="flex flex-col items-center py-2">
          <div className="font-mono text-5xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums mb-2 select-none">
            {formatTime(secondsLeft)}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[var(--bg-primary)] h-1.5 rounded-full overflow-hidden border border-[var(--border)]">
            <div
              className="bg-[var(--accent)] h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors shadow-sm ${
              isRunning ? 'bg-amber-600 hover:bg-amber-500' : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)]'
            }`}
          >
            {isRunning ? <Pause size={15} /> : <Play size={15} />}
            <span>{isRunning ? 'Pausar' : 'Iniciar'}</span>
          </button>
          <button
            onClick={handleReset}
            className="p-2 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Reiniciar"
          >
            <RotateCcw size={15} />
          </button>
          {selectedTaskId && (
            <button
              onClick={handleMarkTaskDone}
              className="p-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
              title="Marcar tarea vinculada como Completada"
            >
              <CheckCircle size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
