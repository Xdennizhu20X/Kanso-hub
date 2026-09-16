import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import User from '../models/User';
import Project from '../models/Project';
import Task from '../models/Task';
import Note from '../models/Note';
import Habit from '../models/Habit';
import Routine from '../models/Routine';
import Goal from '../models/Goal';
import Resource from '../models/Resource';
import Password from '../models/Password';
import AgentSession from '../models/AgentSession';
import ApiKey from '../models/ApiKey';

const router = Router();

router.use(authMiddleware);

// GET /api/backup/export - Export entire user database in JSON
router.get('/export', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const [
      user,
      projects,
      tasks,
      notes,
      habits,
      routines,
      goals,
      resources,
      passwords,
      agentSessions,
      apiKeys,
    ] = await Promise.all([
      User.findById(userId).select('name email preferences categories createdAt'),
      Project.find({ userId }),
      Task.find({ userId }),
      Note.find({ userId }),
      Habit.find({ userId }),
      Routine.find({ userId }),
      Goal.find({ userId }),
      Resource.find({ userId }),
      Password.find({ userId }).select('title username url encryptedPassword iv authTag notes category tags createdAt updatedAt'),
      AgentSession.find({ userId }),
      ApiKey.find({ userId }).select('name prefix scopes createdAt lastUsedAt expiresAt'),
    ]);

    const backupData = {
      meta: {
        app: 'Kanso Hub',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        userEmail: user?.email,
      },
      user,
      counts: {
        projects: projects.length,
        tasks: tasks.length,
        notes: notes.length,
        habits: habits.length,
        routines: routines.length,
        goals: goals.length,
        resources: resources.length,
        passwords: passwords.length,
        agentSessions: agentSessions.length,
        apiKeys: apiKeys.length,
      },
      data: {
        projects,
        tasks,
        notes,
        habits,
        routines,
        goals,
        resources,
        passwords,
        agentSessions,
        apiKeys,
      },
    };

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Disposition', `attachment; filename=kanso_backup_${dateStr}.json`);
    res.setHeader('Content-Type', 'application/json');
    res.json(backupData);
  } catch (error) {
    console.error('Error exporting backup:', error);
    res.status(500).json({ error: 'Error al exportar copia de seguridad' });
  }
});

export default router;
