import { Router } from 'express';
import { AuthRequest } from '../middleware/auth';
import { sendDailySummary } from '../services/email';
import User from '../models/User';
import Task from '../models/Task';
import Habit from '../models/Habit';

const router = Router();

router.post('/daily-summary', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const tasks = await Task.find({ userId: req.userId });
    const habits = await Habit.find({ userId: req.userId });

    await sendDailySummary(user.email, tasks, habits);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/subscribe', async (req: AuthRequest, res) => {
  try {
    const { subscription } = req.body;
    await User.findByIdAndUpdate(req.userId, { pushSubscription: subscription });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
