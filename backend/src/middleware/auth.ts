import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import ApiKey from '../models/ApiKey';

const getJwtSecret = (): string => process.env.JWT_SECRET || 'lifeos-secret-key-change-in-production';

export interface AuthRequest extends Request {
  userId?: string;
  authType?: 'jwt' | 'pat';
  apiKeyScopes?: string[];
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const rawHeader = req.headers.authorization;
  if (!rawHeader || !rawHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = rawHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Check if it is a Personal Access Token (PAT)
  if (token.startsWith('kanso_pat_') || token.startsWith('lifeos_pat_')) {
    try {
      const keyHash = crypto.createHash('sha256').update(token).digest('hex');
      const apiKey = await ApiKey.findOne({ keyHash });

      if (!apiKey) {
        return res.status(401).json({ error: 'Clave de API inválida o revocada' });
      }

      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return res.status(401).json({ error: 'Clave de API expirada' });
      }

      req.userId = apiKey.userId.toString();
      req.authType = 'pat';
      req.apiKeyScopes = apiKey.scopes;

      // Update lastUsedAt asynchronously
      ApiKey.updateOne({ _id: apiKey._id }, { $set: { lastUsedAt: new Date() } }).catch((err) => {
        console.error('Error updating apiKey lastUsedAt:', err);
      });

      return next();
    } catch (error) {
      console.error('Error validating PAT:', error);
      return res.status(500).json({ error: 'Error al validar clave de API' });
    }
  }

  // Standard JWT validation
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: string };
    req.userId = decoded.userId;
    req.authType = 'jwt';
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: '7d' });
};

