import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from './middleware/auth';
import { isSafeUrl } from './services/security';

import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import routineRoutes from './routes/routine';
import resourceRoutes from './routes/resources';
import passwordRoutes from './routes/passwords';
import noteRoutes from './routes/notes';
import habitRoutes from './routes/habits';
import goalRoutes from './routes/goals';
import notificationRoutes from './routes/notifications';
import agentSessionRoutes from './routes/agentSessions';
import apiKeyRoutes from './routes/apiKeys';
import agentApiRoutes from './routes/agentApi';
import backupRoutes from './routes/backup';

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URL || process.env.MONGODB_URL || 'mongodb://localhost:27017/kanso';

app.use(cors());

app.use(express.json({ limit: '10mb' }));

// Rate limiters for security
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Demasiadas peticiones de autenticación. Intenta de nuevo más tarde.' },
});

const proxyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  message: { error: 'Límite de solicitudes de proxy excedido.' },
});

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/tasks', authMiddleware, taskRoutes);
app.use('/api/routine', authMiddleware, routineRoutes);
app.use('/api/resources', authMiddleware, resourceRoutes);
app.use('/api/passwords', authMiddleware, passwordRoutes);
app.use('/api/notes', authMiddleware, noteRoutes);
app.use('/api/habits', authMiddleware, habitRoutes);
app.use('/api/goals', authMiddleware, goalRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);
app.use('/api/agent-sessions', authMiddleware, agentSessionRoutes);
app.use('/api/api-keys', authMiddleware, apiKeyRoutes);
app.use('/api/agent', authMiddleware, agentApiRoutes);
app.use('/api/backup', authMiddleware, backupRoutes);




app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/image-proxy', proxyLimiter, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string' || !isSafeUrl(url)) {
      return res.status(400).json({ error: 'Valid and safe URL required' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).end();
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    if (!contentType.startsWith('image/')) {
      return res.status(400).end();
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > 10 * 1024 * 1024) {
      return res.status(413).end();
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).end();
  }
});

// Centralized error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

import { startTelegramBot } from './services/telegram';

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startTelegramBot();
});

export default app;

