import { Router } from 'express';
import Goal from '../models/Goal';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { status } = req.query;
    const filter: any = { userId: req.userId };
    if (status) filter.status = status;

    const goals = await Goal.find(filter).sort({ targetDate: 1 });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const goal = await Goal.create({ ...req.body, userId: req.userId });
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/milestones', async (req: AuthRequest, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.userId });
    if (!goal) return res.status(404).json({ error: 'Not found' });

    goal.milestones.push(req.body);
    await goal.save();
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/milestones/:milestoneId', async (req: AuthRequest, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.userId });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const milestone = goal.milestones.id(req.params.milestoneId as string);
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

    milestone.set(req.body);
    await goal.save();
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/milestones/:milestoneId', async (req: AuthRequest, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.userId });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    goal.milestones.pull(req.params.milestoneId as string);
    await goal.save();
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await Goal.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
