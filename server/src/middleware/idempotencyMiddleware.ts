import { Request, Response, NextFunction } from 'express';
import { db } from '../db/database';

export async function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const idempotencyKey = req.headers['idempotency-key'] as string;

  if (!idempotencyKey || req.method !== 'POST') {
    return next();
  }

  const cached = await db.idempotencyStore.get(idempotencyKey);
  if (cached) {
    // Return previously calculated response to prevent duplicate executions
    let parsedBody = cached.body;
    try {
      if (typeof cached.body === 'string') {
        parsedBody = JSON.parse(cached.body);
      }
    } catch {
      // ignore
    }

    res.status(cached.status).json({
      ...(typeof parsedBody === 'object' && parsedBody !== null ? parsedBody : { data: parsedBody }),
      _idempotentReplay: true,
    });
    return;
  }

  // Intercept json() response to cache it
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    db.idempotencyStore.set(idempotencyKey, {
      status: res.statusCode,
      body: bodyStr,
    }).catch((err) => {
      console.error('[IDEMPOTENCY] Failed to cache response:', err);
    });
    return originalJson(body);
  };

  next();
}
