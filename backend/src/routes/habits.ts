import { Router } from 'express';
import Habit from '../models/Habit';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthRequest, res) => {
  try {
    const habits = await Habit.find({ userId: req.userId });
    res.json(habits);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const habit = await Habit.create({ ...req.body, userId: req.userId });
    res.json(habit);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    res.json(habit);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/toggle', async (req: AuthRequest, res) => {
  try {
    const { date } = req.body;
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.userId });
    if (!habit) return res.status(404).json({ error: 'Not found' });

    const dateStr = new Date(date).toISOString().split('T')[0];
    const existingIndex = habit.completedDates.findIndex(
      d => d.toISOString().split('T')[0] === dateStr
    );

    if (existingIndex >= 0) {
      habit.completedDates.splice(existingIndex, 1);
    } else {
      habit.completedDates.push(new Date(date));
    }

    habit.currentStreak = calculateStreak(habit.completedDates);
    if (habit.currentStreak > habit.bestStreak) {
      habit.bestStreak = habit.currentStreak;
    }

    await habit.save();
    res.json(habit);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/progress', async (req: AuthRequest, res) => {
  try {
    const { date, value, increment } = req.body;
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.userId });
    if (!habit) return res.status(404).json({ error: 'Not found' });

    const targetDate = date ? new Date(date) : new Date();
    const dateStr = targetDate.toISOString().split('T')[0];

    let dailyLog = habit.dailyValues.find(dv => dv.date === dateStr);
    let currentVal = dailyLog ? dailyLog.value : 0;

    if (increment !== undefined) {
      currentVal = Math.max(0, currentVal + Number(increment));
    } else if (value !== undefined) {
      currentVal = Math.max(0, Number(value));
    }

    if (dailyLog) {
      dailyLog.value = currentVal;
    } else {
      habit.dailyValues.push({ date: dateStr, value: currentVal });
    }

    const target = habit.targetValue || 1;
    const existingIndex = habit.completedDates.findIndex(
      d => d.toISOString().split('T')[0] === dateStr
    );

    if (currentVal >= target) {
      if (existingIndex < 0) {
        habit.completedDates.push(targetDate);
      }
    } else {
      if (existingIndex >= 0) {
        habit.completedDates.splice(existingIndex, 1);
      }
    }

    habit.currentStreak = calculateStreak(habit.completedDates);
    if (habit.currentStreak > habit.bestStreak) {
      habit.bestStreak = habit.currentStreak;
    }

    await habit.save();
    res.json(habit);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await Habit.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

function calculateStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const sorted = dates
    .map(d => new Date(d).toISOString().split('T')[0])
    .sort()
    .reverse();

  let streak = 1;
  const today = new Date().toISOString().split('T')[0];

  if (sorted[0] !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (sorted[0] !== yesterday) return 0;
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = new Date(sorted[i]);
    const next = new Date(sorted[i + 1]);
    const diffDays = (current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export default router;
