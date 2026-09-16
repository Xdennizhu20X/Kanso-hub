import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendDailySummary = async (email: string, tasks: any[], habits: any[]) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const pendingTasks = tasks.filter(t => t.status !== 'done').length;
  const habitsCompleted = habits.filter(h =>
    Array.isArray(h.completedDates) &&
    h.completedDates.some((d: any) => {
      try {
        return new Date(d).toISOString().split('T')[0] === todayStr;
      } catch {
        return false;
      }
    })
  ).length;
  const totalHabits = habits.length;

  const html = `
    <h2>Resumen Diario - Kanso Hub</h2>
    <p><strong>Tareas pendientes:</strong> ${pendingTasks}</p>
    <p><strong>Hábitos completados:</strong> ${habitsCompleted}/${totalHabits}</p>
    <hr/>
    <h3>Tareas pendientes:</h3>
    <ul>
      ${tasks.filter(t => t.status !== 'done').map(t => `<li>${t.title}</li>`).join('')}
    </ul>
    <hr/>
    <p>¡Sigue así! 💪</p>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Resumen Diario - Kanso Hub',
    html,
  });
};

export const sendNotification = async (email: string, title: string, message: string) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: title,
    html: `<p>${message}</p>`,
  });
};
