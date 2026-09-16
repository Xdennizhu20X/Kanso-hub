import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

function formatUserResponse(user: any) {
  const categories: Record<string, any> = {};
  if (user.categories) {
    user.categories.forEach((value: any, key: string) => {
      categories[key] = value;
    });
  }
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    categories,
    githubUsername: user.githubUsername || null,
    telegramChatId: user.telegramChatId || null,
    preferences: user.preferences || {
      theme: 'dark',
      emailNotifications: true,
      pushNotifications: true,
      dailySummaryTime: '20:00',
    },
  };
}


router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId).select('-password -masterKey');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(formatUserResponse(user));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, nombre y contraseña son requeridos' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email: email.toLowerCase().trim(), name: name.trim(), password: hashedPassword });

    const token = generateToken(user._id.toString());
    res.json({ token, user: formatUserResponse(user) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const token = generateToken(user._id.toString());
    res.json({ token, user: formatUserResponse(user) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/master-key', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { masterKey } = req.body;
    if (!masterKey || typeof masterKey !== 'string' || masterKey.length < 4) {
      return res.status(400).json({ error: 'La contraseña maestra debe tener al menos 4 caracteres' });
    }
    const hashedKey = await bcrypt.hash(masterKey, 10);

    await User.findByIdAndUpdate(req.userId, { masterKey: hashedKey });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/preferences', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { preferences, githubUsername } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (preferences) {
      user.preferences = { ...(user.preferences as any || {}), ...preferences };
    }
    if (githubUsername !== undefined) {
      user.githubUsername = githubUsername ? String(githubUsername).trim() : null;
    }
    await user.save();
    res.json({ success: true, preferences: user.preferences, githubUsername: user.githubUsername });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});


function slugify(text: string): string {
  return text.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

router.post('/categories', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { label, color, key: providedKey } = req.body;
    if (!label) return res.status(400).json({ error: 'Label is required' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let key = providedKey || slugify(label);
    const cats: any = user.categories || new Map();
    if (cats.has(key)) {
      let suffix = 2;
      while (cats.has(`${key}-${suffix}`)) suffix++;
      key = `${key}-${suffix}`;
    }

    cats.set(key, { key, label, color: color || '#3b82f6' });
    user.categories = cats;
    await user.save();

    res.status(201).json({ key, label, color: color || '#3b82f6' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/categories/:key', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { key } = req.params;
    const { label, color } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const cats: any = user.categories || new Map();
    if (!cats.has(key)) return res.status(404).json({ error: 'Category not found' });

    const existing = cats.get(key);
    cats.set(key, {
      key,
      label: label || existing.label,
      color: color || existing.color,
    });
    user.categories = cats;
    await user.save();

    res.json({ key, label: label || existing.label, color: color || existing.color });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/categories/:key', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { key } = req.params;
    const { reassignTo } = req.query;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const cats: any = user.categories || new Map();
    if (!cats.has(key)) return res.status(404).json({ error: 'Category not found' });

    if (key === 'other') return res.status(400).json({ error: 'No se puede eliminar la categoría "Otro"' });

    const targetKey = (reassignTo as string) || 'other';
    if (!cats.has(targetKey)) return res.status(400).json({ error: 'Categoría destino inválida' });

    const Resource = require('../models/Resource').default;
    await Resource.updateMany(
      { userId: req.userId, category: key },
      { $set: { category: targetKey } }
    );

    cats.delete(key);
    user.categories = cats;
    await user.save();

    res.json({ success: true, reassignedTo: targetKey });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
