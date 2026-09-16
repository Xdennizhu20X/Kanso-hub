'use client';

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';

interface Task {
  _id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
  color: string;
  projectId: string;
}

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
}

interface CalendarEvent {
  id: string;
  title: string;
  time?: string;
  endTime?: string;
  category?: string;
  color: string;
  type: 'task' | 'routine';
  data: Task | Routine;
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS_HEADER = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

const TASK_COLORS: Record<string, string> = {
  '#3b82f6': 'Azul',
  '#10b981': 'Verde',
  '#f59e0b': 'Amarillo',
  '#ef4444': 'Rojo',
  '#8b5cf6': 'Morado',
  '#ec4899': 'Rosa',
  '#06b6d4': 'Cyan',
  '#f97316': 'Naranja',
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

function isRoutineActiveOnDay(routine: Routine, dayOfWeek: number): boolean {
  if (routine.frequency === 'daily') return true;
  if (routine.frequency === 'custom') return routine.daysOfWeek.includes(dayOfWeek);
  if (routine.frequency === 'weekly') return true;
  return false;
}

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [view, setView] = useState<'month' | 'week'>('month');

  // Layer toggles
  const [showRoutines, setShowRoutines] = useState(true);
  const [showTasks, setShowTasks] = useState(true);

  const today = new Date();
  const todayStr = formatDate(today);

  useEffect(() => {
    api.get<Task[]>('/api/tasks').then(setTasks).catch(() => {});
    api.get<Routine[]>('/api/routine/all').then(setRoutines).catch(() => {});
  }, []);

  const { daysInMonth, startDay } = getDaysInMonth(currentYear, currentMonth);

  const calendarDays = useMemo(() => {
    const days: { date: string; day: number; isCurrentMonth: boolean; isToday: boolean }[] = [];
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevMonthDays = new Date(prevYear, prevMonth + 1, 0).getDate();

    for (let i = startDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const d = new Date(prevYear, prevMonth, day);
      days.push({ date: formatDate(d), day, isCurrentMonth: false, isToday: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(currentYear, currentMonth, i);
      const dateStr = formatDate(d);
      days.push({ date: dateStr, day: i, isCurrentMonth: true, isToday: dateStr === todayStr });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      days.push({ date: formatDate(d), day: i, isCurrentMonth: false, isToday: false });
    }

    return days;
  }, [currentMonth, currentYear, daysInMonth, startDay, todayStr]);

  const getEventsForDate = (dateStr: string): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    const d = new Date(dateStr + 'T12:00:00');
    const dayOfWeek = d.getDay();

    if (showTasks) {
      tasks.forEach(task => {
        if (task.dueDate && task.dueDate.split('T')[0] === dateStr) {
          events.push({
            id: `task-${task._id}`,
            title: task.title,
            color: task.color || '#3b82f6',
            type: 'task',
            data: task,
          });
        }
      });
    }

    if (showRoutines) {
      routines.forEach(routine => {
        if (isRoutineActiveOnDay(routine, dayOfWeek)) {
          events.push({
            id: `routine-${routine._id}-${dateStr}`,
            title: routine.activity,
            time: routine.time,
            endTime: routine.endTime,
            category: routine.category,
            color: routine.color || '#10b981',
            type: 'routine',
            data: routine,
          });
        }
      });
    }

    return events.sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    });
  };

  const selectedDateEvents = useMemo(() => getEventsForDate(selectedDate), [tasks, routines, selectedDate]);

  const weekDays = useMemo(() => {
    const curr = new Date(selectedDate + 'T12:00:00');
    const dayOfWeek = curr.getDay(); // 0 = Dom, 1 = Lun...
    const sunday = new Date(curr);
    sunday.setDate(curr.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const dateStr = formatDate(d);
      days.push({
        date: dateStr,
        day: d.getDate(),
        dayLabel: DAYS_HEADER[i],
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
      });
    }
    return days;
  }, [selectedDate, todayStr]);

  const prevPeriod = () => {
    if (view === 'month') {
      if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
      else setCurrentMonth(m => m - 1);
    } else {
      const d = new Date(selectedDate + 'T12:00:00');
      d.setDate(d.getDate() - 7);
      const nextDateStr = formatDate(d);
      setSelectedDate(nextDateStr);
      setCurrentMonth(d.getMonth());
      setCurrentYear(d.getFullYear());
    }
  };

  const nextPeriod = () => {
    if (view === 'month') {
      if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
      else setCurrentMonth(m => m + 1);
    } else {
      const d = new Date(selectedDate + 'T12:00:00');
      d.setDate(d.getDate() + 7);
      const nextDateStr = formatDate(d);
      setSelectedDate(nextDateStr);
      setCurrentMonth(d.getMonth());
      setCurrentYear(d.getFullYear());
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(todayStr);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Calendario</h1>
          <button
            onClick={goToToday}
            className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            Hoy
          </button>

          {/* Layer toggles */}
          <div className="flex items-center gap-1.5 sm:ml-2 sm:pl-2 sm:border-l border-[var(--border)] flex-wrap">
            <button
              onClick={() => setShowRoutines(!showRoutines)}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                showRoutines
                  ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border)] opacity-60'
              }`}
              title="Mostrar u ocultar bloques de rutina / horario fijo"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
              Rutina
            </button>
            <button
              onClick={() => setShowTasks(!showTasks)}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                showTasks
                  ? 'bg-[#3b82f6]/15 text-[#3b82f6] border border-[#3b82f6]/30'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border)] opacity-60'
              }`}
              title="Mostrar u ocultar tareas con fecha"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
              Tareas
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
          <div className="flex bg-[var(--bg-secondary)] rounded-lg p-0.5 border border-[var(--border)]">
            {(['month', 'week'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md text-xs font-medium transition-colors ${
                  view === v ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {v === 'month' ? 'Mes' : 'Semana'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={prevPeriod} className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs sm:text-sm font-medium min-w-[120px] sm:min-w-[140px] text-center">
              {view === 'month'
                ? `${MONTHS[currentMonth]} ${currentYear}`
                : `${weekDays[0]?.day} - ${weekDays[6]?.day} ${MONTHS[currentMonth]} ${currentYear}`
              }
            </span>
            <button onClick={nextPeriod} className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-0 border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--bg-secondary)]">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="grid grid-cols-7 border-b border-[var(--border)]">
            {DAYS_HEADER.map(day => (
              <div key={day} className="py-2 sm:py-2.5 text-center text-[10px] sm:text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider border-r border-[var(--border)] last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {view === 'month' ? (
            <div className="grid grid-cols-7 flex-1">
              {calendarDays.map((dayInfo, idx) => {
                const events = getEventsForDate(dayInfo.date);
                const isSelected = dayInfo.date === selectedDate;
                return (
                  <div
                    key={idx}
                    onClick={() => { setSelectedDate(dayInfo.date); setShowDayDetail(true); }}
                    className={`border-r border-b border-[var(--border)] last:border-r-0 p-1 min-h-[60px] sm:min-h-[100px] cursor-pointer transition-colors ${
                      isSelected ? 'bg-[var(--accent-muted)]' :
                      dayInfo.isToday ? 'bg-[var(--bg-tertiary)]' :
                      'hover:bg-[var(--bg-primary)]'
                    } ${!dayInfo.isCurrentMonth ? 'opacity-40' : ''}`}
                  >
                    <div className={`text-[11px] sm:text-xs font-medium mb-1 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${
                      dayInfo.isToday ? 'bg-[var(--accent)] text-white' :
                      isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                    }`}>
                      {dayInfo.day}
                    </div>
                    <div className="space-y-0.5">
                      {events.slice(0, 2).map(event => (
                        <div
                          key={event.id}
                          className="text-[9px] sm:text-[10px] font-medium px-1 sm:px-1.5 py-0.5 rounded truncate text-white/90"
                          style={{ backgroundColor: event.color }}
                          title={`${event.time ? event.time + ' - ' : ''}${event.title}`}
                        >
                          <span className="hidden sm:inline">{event.time && `${event.time} `}</span>
                          {event.title}
                        </div>
                      ))}
                      {events.length > 2 && (
                        <div className="text-[8px] sm:text-[9px] text-[var(--text-muted)] px-1">
                          +{events.length - 2} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-7 flex-1 divide-x divide-[var(--border)] overflow-y-auto">
              {weekDays.map((dayInfo) => {
                const events = getEventsForDate(dayInfo.date);
                const isSelected = dayInfo.date === selectedDate;
                return (
                  <div
                    key={dayInfo.date}
                    onClick={() => { setSelectedDate(dayInfo.date); setShowDayDetail(true); }}
                    className={`flex flex-col p-2 min-h-[350px] cursor-pointer transition-colors ${
                      isSelected ? 'bg-[var(--accent-muted)]/20' :
                      dayInfo.isToday ? 'bg-[var(--bg-tertiary)]/30' :
                      'hover:bg-[var(--bg-primary)]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-[var(--border)]">
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{dayInfo.dayLabel}</span>
                      <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                        dayInfo.isToday ? 'bg-[var(--accent)] text-white' :
                        isSelected ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-primary)]'
                      }`}>
                        {dayInfo.day}
                      </span>
                    </div>

                    <div className="space-y-2 flex-1 overflow-y-auto">
                      {events.map((event) => {
                        const timeStr = event.endTime ? `${event.time} - ${event.endTime}` : event.time;
                        return (
                          <div
                            key={event.id}
                            className="p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors border-l-3"
                            style={{ borderLeftColor: event.color }}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <span
                                className="text-[9px] font-semibold uppercase px-1 py-0.2 rounded"
                                style={{ backgroundColor: event.color + '20', color: event.color }}
                              >
                                {event.type === 'task' ? 'Tarea' : 'Horario'}
                              </span>
                              {timeStr && (
                                <span className="text-[10px] text-[var(--text-muted)] ml-auto tabular-nums font-medium">{timeStr}</span>
                              )}
                            </div>
                            <p className="text-xs font-medium text-[var(--text-primary)] line-clamp-2">{event.title}</p>
                          </div>
                        );
                      })}
                      {events.length === 0 && (
                        <div className="text-center py-8 text-[11px] text-[var(--text-muted)] opacity-40">
                          Sin eventos
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="w-72 border-l border-[var(--border)] bg-[var(--bg-primary)] hidden lg:flex flex-col">
          <div className="p-4 border-b border-[var(--border)]">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-medium">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long' })}
              </h3>
            </div>
            <p className="text-2xl font-semibold tracking-tight">
              {new Date(selectedDate + 'T12:00:00').getDate()}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {selectedDateEvents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-[var(--text-muted)]">Sin eventos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDateEvents.map(event => {
                  const timeLabel = event.endTime ? `${event.time} - ${event.endTime}` : event.time;
                  return (
                    <div key={event.id} className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors group">
                      <div className="w-1 h-full min-h-[2rem] rounded-full flex-shrink-0" style={{ backgroundColor: event.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{event.title}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5 flex items-center gap-1.5">
                          {timeLabel && <span className="tabular-nums font-medium">{timeLabel}</span>}
                          <span className="px-1 py-0.5 rounded text-[8px] font-semibold" style={{ backgroundColor: event.color + '20', color: event.color }}>
                            {event.type === 'task' ? 'Tarea' : 'Horario / Rutina'}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-[var(--border)]">
            <h4 className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Leyenda</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" />
                <span className="text-[10px] text-[var(--text-secondary)]">Tareas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" />
                <span className="text-[10px] text-[var(--text-secondary)]">Rutinas</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Day Detail Modal Sheet */}
      {showDayDetail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 lg:hidden" onClick={() => setShowDayDetail(false)}>
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold capitalize text-[var(--text-primary)]">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {selectedDateEvents.length} eventos programados
                </p>
              </div>
              <button onClick={() => setShowDayDetail(false)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {selectedDateEvents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-[var(--text-muted)]">Sin eventos para este día</p>
                </div>
              ) : (
                selectedDateEvents.map(event => {
                  const timeLabel = event.endTime ? `${event.time} - ${event.endTime}` : event.time;
                  return (
                    <div key={event.id} className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
                      <div className="w-1.5 h-full min-h-[2.5rem] rounded-full flex-shrink-0" style={{ backgroundColor: event.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-[var(--text-primary)]">{event.title}</p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-1 flex items-center gap-2">
                          {timeLabel && <span className="tabular-nums font-medium">{timeLabel}</span>}
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ backgroundColor: event.color + '20', color: event.color }}>
                            {event.type === 'task' ? 'Tarea' : 'Horario / Rutina'}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
