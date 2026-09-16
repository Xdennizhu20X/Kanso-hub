import { Router } from 'express';
import AgentSession from '../models/AgentSession';
import { AuthRequest } from '../middleware/auth';

const router = Router();

function buildDefaultCommand(agent: string, conversationId: string): string {
  const id = conversationId.trim();
  switch (agent) {
    case 'antigravity':
      return `agy --conversation=${id}`;
    case 'claudecode':
      return `claude --resume ${id}`;
    case 'opencode':
      return `opencode --session ${id}`;
    case 'cursor':
      return `cursor --conversation ${id}`;
    default:
      return id;
  }
}

// GET /api/agent-sessions
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { agent, account, status, projectId, search } = req.query;
    const filter: any = { userId: req.userId };

    if (agent && agent !== 'all') {
      filter.agent = agent;
    }
    if (account && account !== 'all') {
      filter.account = account;
    }
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (projectId) {
      filter.projectId = projectId;
    }
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { conversationId: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } },
      ];
    }

    const sessions = await AgentSession.find(filter)
      .populate('projectId', 'name color')
      .sort({ updatedAt: -1 });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener sesiones de agentes' });
  }
});

// GET /api/agent-sessions/accounts (Distinct accounts list)
router.get('/accounts', async (req: AuthRequest, res) => {
  try {
    const accounts = await AgentSession.distinct('account', { userId: req.userId });
    res.json(accounts.filter(Boolean));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cuentas' });
  }
});

// GET /api/agent-sessions/:id
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const session = await AgentSession.findOne({ _id: req.params.id, userId: req.userId })
      .populate('projectId', 'name color');
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada' });
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener sesión' });
  }
});

// POST /api/agent-sessions
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { title, description, agent, account, conversationId, command, projectId, tags, status, notes } = req.body;

    if (!title || !conversationId) {
      return res.status(400).json({ error: 'Título e ID de conversación requeridos' });
    }

    const finalAgent = agent || 'antigravity';
    const finalCommand = command && command.trim()
      ? command.trim()
      : buildDefaultCommand(finalAgent, conversationId);

    const session = await AgentSession.create({
      userId: req.userId,
      title,
      description: description || '',
      agent: finalAgent,
      account: account && account.trim() ? account.trim() : 'Personal',
      conversationId: conversationId.trim(),
      command: finalCommand,
      projectId: projectId || null,
      tags: Array.isArray(tags) ? tags : [],
      status: status || 'active',
      notes: notes || '',
    });

    const populated = await AgentSession.findById(session._id).populate('projectId', 'name color');
    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al guardar sesión' });
  }
});

// PUT /api/agent-sessions/:id
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.agent && updateData.conversationId && !updateData.command) {
      updateData.command = buildDefaultCommand(updateData.agent, updateData.conversationId);
    }

    const updated = await AgentSession.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updateData,
      { new: true }
    ).populate('projectId', 'name color');

    if (!updated) return res.status(404).json({ error: 'Sesión no encontrada' });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al actualizar sesión' });
  }
});

// DELETE /api/agent-sessions/:id
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const deleted = await AgentSession.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!deleted) return res.status(404).json({ error: 'Sesión no encontrada' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar sesión' });
  }
});

export default router;
