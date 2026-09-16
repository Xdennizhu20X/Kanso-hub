import { Router, Response } from 'express';
import crypto from 'crypto';
import ApiKey from '../models/ApiKey';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// GET /api/api-keys - List all active API keys for user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const keys = await ApiKey.find({ userId: req.userId })
      .select('_id name prefix scopes lastUsedAt expiresAt createdAt')
      .sort({ createdAt: -1 });

    res.json(keys);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Error al obtener claves de API' });
  }
});

// POST /api/api-keys - Create a new API key
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, scopes = ['all'], expiresDays } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'El nombre de la clave es requerido' });
    }

    // Generate random secure token
    const randomSecret = crypto.randomBytes(24).toString('hex');
    const fullToken = `kanso_pat_${randomSecret}`;
    const prefix = `kanso_pat_${randomSecret.slice(0, 8)}...`;
    const keyHash = crypto.createHash('sha256').update(fullToken).digest('hex');

    let expiresAt: Date | null = null;
    if (expiresDays && typeof expiresDays === 'number' && expiresDays > 0) {
      expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000);
    }

    const newKey = await ApiKey.create({
      userId: req.userId,
      name: name.trim(),
      keyHash,
      prefix,
      scopes: Array.isArray(scopes) && scopes.length > 0 ? scopes : ['all'],
      expiresAt,
    });

    res.status(201).json({
      token: fullToken,
      apiKey: {
        _id: newKey._id,
        name: newKey.name,
        prefix: newKey.prefix,
        scopes: newKey.scopes,
        expiresAt: newKey.expiresAt,
        createdAt: newKey.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Error al generar clave de API' });
  }
});

// DELETE /api/api-keys/:id - Revoke an API key
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const key = await ApiKey.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!key) {
      return res.status(404).json({ error: 'Clave de API no encontrada' });
    }

    res.json({ message: 'Clave de API revocada exitosamente' });
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(500).json({ error: 'Error al revocar clave de API' });
  }
});

export default router;
