import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/database';

export const JWT_SECRET = process.env.JWT_SECRET || 'aurelis_private_wealth_vault_key_2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    tier: string;
  };
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    res.status(401).json({ error: 'Authentication token is missing. Please sign in.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded || !decoded.id) {
      res.status(401).json({ error: 'Invalid authentication token. Please sign in.' });
      return;
    }

    const user = await db.getUserById(decoded.id);
    if (!user) {
      res.status(401).json({ error: 'User account not found or deactivated.' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      tier: user.tier || 'Private Client',
    };
    return next();
  } catch {
    res.status(401).json({ error: 'Session expired or token invalid. Please sign in again.' });
    return;
  }
}
