import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import Task from '../models/Task';
import Project from '../models/Project';
import Habit from '../models/Habit';
import Routine from '../models/Routine';
import Note from '../models/Note';
import AgentSession from '../models/AgentSession';
import User from '../models/User';

const router = Router();

router.use(authMiddleware);

// GET /api/agent/summary - Context briefing for AI Agent
router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('name email');
    
    // Active projects
    const projects = await Project.find({ userId: req.userId }).select('_id name color status');

    // Tasks: in progress and pending
    const tasks = await Task.find({
      userId: req.userId,
      status: { $in: ['todo', 'in_progress'] },
    }).sort({ priority: -1, dueDate: 1 }).limit(20);

    // Habits for today
    const habits = await Habit.find({ userId: req.userId });
    const todayStr = new Date().toISOString().split('T')[0];
    const todayHabits = habits.map(h => {
      const completedToday = (h.completedDates || []).some(
        d => new Date(d).toISOString().split('T')[0] === todayStr
      );
      return {
        _id: h._id,
        name: h.name,
        currentStreak: h.currentStreak || 0,
        bestStreak: h.bestStreak || 0,
        completedToday,
        frequency: h.frequency,
      };
    });

    // Routine blocks for today (0 = Sunday, 1 = Monday, etc.)
    const currentDay = new Date().getDay();
    const routineBlocks = await Routine.find({
      userId: req.userId,
      archived: { $ne: true },
      $or: [
        { frequency: 'daily' },
        { daysOfWeek: currentDay },
      ],
    }).sort({ time: 1 });


    // Recent active agent sessions
    const recentSessions = await AgentSession.find({
      userId: req.userId,
      status: 'active',
    }).sort({ updatedAt: -1 }).limit(5);

    // Recent notes
    const recentNotes = await Note.find({
      userId: req.userId,
    }).sort({ updatedAt: -1 }).limit(5).select('_id title category tags updatedAt');

    const formattedDate = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date());

    res.json({
      briefing: {
        userName: user?.name || 'Usuario',
        currentDate: formattedDate,
        dayOfWeek: currentDay,
      },
      stats: {
        pendingTasksCount: tasks.length,
        habitsCompletedToday: todayHabits.filter(h => h.completedToday).length,
        totalHabitsToday: todayHabits.length,
        activeProjectsCount: projects.length,
      },
      projects,
      tasks,
      todayHabits,
      routineBlocks,
      recentSessions,
      recentNotes,
    });
  } catch (error) {
    console.error('Error fetching agent summary:', error);
    res.status(500).json({ error: 'Error al generar resumen para el agente' });
  }
});

// GET /api/agent/projects - Simplified list of active projects
router.get('/projects', async (req: AuthRequest, res: Response) => {
  try {
    const projects = await Project.find({ userId: req.userId }).sort({ updatedAt: -1 });
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects for agent:', error);
    res.status(500).json({ error: 'Error al obtener proyectos' });
  }
});

// POST /api/agent/tasks/batch - Create multiple tasks in one call (ideal for task decomposition)
router.post('/tasks/batch', async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, tasks } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'Se requiere un arreglo "tasks" con al menos un elemento' });
    }

    const tasksToCreate = tasks.map((t: any) => ({
      userId: req.userId,
      projectId: projectId || t.projectId || null,
      title: t.title?.trim() || 'Nueva tarea',
      description: t.description || '',
      priority: ['low', 'medium', 'high'].includes(t.priority) ? t.priority : 'medium',
      status: ['todo', 'in_progress', 'done'].includes(t.status) ? t.status : 'todo',
      dueDate: t.dueDate ? new Date(t.dueDate) : null,
      tags: Array.isArray(t.tags) ? t.tags : [],
      color: t.color || '#3b82f6',
      estimatedMinutes: typeof t.estimatedMinutes === 'number' ? t.estimatedMinutes : 0,
    }));

    const createdTasks = await Task.insertMany(tasksToCreate);

    res.status(201).json({
      message: `${createdTasks.length} tareas creadas exitosamente`,
      tasks: createdTasks,
    });
  } catch (error) {
    console.error('Error creating batch tasks:', error);
    res.status(500).json({ error: 'Error al crear lote de tareas' });
  }
});

// POST /api/agent/quick-log - Atomically log session, optional note, and mark completed tasks
router.post('/quick-log', async (req: AuthRequest, res: Response) => {
  try {
    const { session, note, completedTaskIds } = req.body;
    const results: Record<string, any> = {};

    // 1. Log Agent Session
    if (session && session.title) {
      const agent = session.agent || 'antigravity';
      let command = session.command;
      if (!command && session.conversationId) {
        if (agent === 'antigravity') command = `agy --conversation=${session.conversationId}`;
        else if (agent === 'claudecode') command = `claude --resume ${session.conversationId}`;
        else if (agent === 'opencode') command = `opencode --session ${session.conversationId}`;
        else if (agent === 'cursor') command = `cursor --conversation ${session.conversationId}`;
      }

      const createdSession = await AgentSession.create({
        userId: req.userId,
        title: session.title.trim(),
        description: session.description || '',
        agent,
        account: session.account || 'Personal',
        conversationId: session.conversationId || '',
        command: command || '',
        projectId: session.projectId || null,
        tags: Array.isArray(session.tags) ? session.tags : [],
        status: session.status || 'active',
        notes: session.notes || '',
      });
      results.session = createdSession;
    }

    // 2. Create Note
    if (note && note.title) {
      const validCategory = ['idea', 'snippet', 'learning', 'reminder', 'other'].includes(note.category?.toLowerCase())
        ? note.category.toLowerCase()
        : 'snippet';

      const createdNote = await Note.create({
        userId: req.userId,
        title: note.title.trim(),
        content: note.content || '',
        category: validCategory,
        tags: Array.isArray(note.tags) ? note.tags : [],
        pinned: Boolean(note.pinned),
      });
      results.note = createdNote;
    }


    // 3. Mark completed tasks
    if (Array.isArray(completedTaskIds) && completedTaskIds.length > 0) {
      await Task.updateMany(
        { _id: { $in: completedTaskIds }, userId: req.userId },
        { $set: { status: 'done' } }
      );
      results.completedTasksCount = completedTaskIds.length;
    }

    res.status(201).json({
      message: 'Registro rápido completado con éxito',
      results,
    });
  } catch (error) {
    console.error('Error in agent quick-log:', error);
    res.status(500).json({ error: 'Error al procesar el registro rápido' });
  }
});

// GET /api/agent/github-activity - Fetch today's commits from GitHub
router.get('/github-activity', async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    const username = (req.query.username as string) || user?.githubUsername || process.env.GITHUB_USERNAME;

    if (!username) {
      return res.json({ configured: false, events: [], commitsCount: 0 });
    }

    const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events/public`, {
      headers: {
        'User-Agent': 'KansoHub-Productivity/1.0',
        ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}),
      },
    });

    if (!response.ok) {
      return res.json({ configured: true, error: `GitHub API status: ${response.status}`, commitsCount: 0, repos: [] });
    }

    const events = (await response.json()) as any[];
    if (!Array.isArray(events)) {
      return res.json({ configured: true, commitsCount: 0, repos: [] });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const pushEvents = events.filter((e: any) =>
      e.type === 'PushEvent' &&
      e.created_at &&
      e.created_at.split('T')[0] === todayStr
    );

    let totalCommits = 0;
    const repoMap: Record<string, string[]> = {};

    pushEvents.forEach((e: any) => {
      const repo = e.repo?.name || 'unknown';
      const commitMessages = (e.payload?.commits || []).map((c: any) => c.message);
      totalCommits += commitMessages.length;
      if (!repoMap[repo]) repoMap[repo] = [];
      repoMap[repo].push(...commitMessages);
    });

    const repos = Object.entries(repoMap).map(([name, commits]) => ({ name, commits }));

    res.json({
      configured: true,
      username,
      commitsCount: totalCommits,
      pushEventsCount: pushEvents.length,
      repos,
    });
  } catch (error) {
    console.error('Error fetching GitHub activity:', error);
    res.status(500).json({ error: 'Error al consultar actividad de GitHub' });
  }
});

export default router;

