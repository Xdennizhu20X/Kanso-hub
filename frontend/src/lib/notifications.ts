'use client';

const notifiedIds = new Set<string>();

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return 'denied';
  }
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export function sendBrowserNotification(title: string, body?: string, icon?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
    });
  } catch (err) {
    console.error('Error al emitir notificación del navegador:', err);
  }
}

export function checkUpcomingRoutinesAndTasks(
  routines: Array<{ _id: string; activity: string; time: string; frequency: string; daysOfWeek?: number[] }>,
  tasks: Array<{ _id: string; title: string; dueDate?: string; status: string }>
) {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayDay = now.getDay();
  const todayStr = now.toISOString().split('T')[0];

  // Check routines starting in 0-15 minutes
  routines.forEach(r => {
    let isActiveToday = false;
    if (r.frequency === 'daily') isActiveToday = true;
    else if (r.frequency === 'custom' && r.daysOfWeek?.includes(todayDay)) isActiveToday = true;
    else if (r.frequency === 'weekly') isActiveToday = true;

    if (!isActiveToday) return;

    const [h, m] = r.time.split(':').map(Number);
    const routineMinutes = h * 60 + m;
    const diff = routineMinutes - currentMinutes;

    // Trigger alert if starts in 10-15 minutes or now
    if (diff >= 0 && diff <= 15) {
      const key = `routine-${r._id}-${todayStr}-${r.time}`;
      if (!notifiedIds.has(key)) {
        notifiedIds.add(key);
        sendBrowserNotification(
          `Recordatorio de Rutina: ${r.activity}`,
          diff === 0 ? '¡Tu bloque comienza ahora!' : `Comienza en ${diff} minutos (${r.time})`
        );
      }
    }
  });

  // Check tasks due today
  tasks.forEach(t => {
    if (t.status === 'completed') return;
    if (t.dueDate && t.dueDate.split('T')[0] === todayStr) {
      const key = `task-due-${t._id}-${todayStr}`;
      if (!notifiedIds.has(key)) {
        notifiedIds.add(key);
        sendBrowserNotification(
          'Tarea pendiente para hoy',
          `"${t.title}" vence hoy.`
        );
      }
    }
  });
}
