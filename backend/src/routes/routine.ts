import { Router } from 'express';
import Routine from '../models/Routine';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { date, startDate, endDate } = req.query;
    const filter: any = { userId: req.userId, archived: { $ne: true } };

    if (date) {
      const d = new Date(date as string);
      const dayOfWeek = d.getDay();
      filter.$or = [
        { frequency: 'daily' },
        { frequency: 'custom', daysOfWeek: dayOfWeek },
        { frequency: 'weekly' },
      ];
    } else if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      const daysInRange: number[] = [];
      const current = new Date(start);
      while (current <= end) {
        daysInRange.push(current.getDay());
        current.setDate(current.getDate() + 1);
      }
      const uniqueDays = [...new Set(daysInRange)];
      filter.$or = [
        { frequency: 'daily' },
        { frequency: 'custom', daysOfWeek: { $in: uniqueDays } },
        { frequency: 'weekly' },
      ];
    }

    const routines = await Routine.find(filter).sort({ time: 1 });
    res.json(routines);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/all', async (req: AuthRequest, res) => {
  try {
    const routines = await Routine.find({ userId: req.userId, archived: { $ne: true } }).sort({ time: 1 });
    res.json(routines);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const routine = await Routine.create({ ...req.body, userId: req.userId });
    res.json(routine);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const routine = await Routine.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    res.json(routine);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await Routine.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
