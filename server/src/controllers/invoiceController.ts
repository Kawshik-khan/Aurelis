import { Request, Response } from 'express';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { CurrencyCode, PaymentRequestEntity } from '../types';

export class InvoiceController {
  public static async createPaymentRequest(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });
    const { amount, currency, recipientEmail, message } = req.body;

    const user = await db.users.get(userId);
    const slug = `${user?.fullName.toLowerCase().replace(/\s+/g, '.') || 'client'}-${Date.now().toString(36)}`;

    const reqEntity: PaymentRequestEntity = {
      id: `req_${Date.now()}`,
      userId,
      amount: parseFloat(amount) || 0,
      currency: (currency as CurrencyCode) || 'USD',
      recipientEmail,
      message,
      slug,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    await db.paymentRequests.set(reqEntity.id, reqEntity);
    await db.paymentRequests.set(slug, reqEntity);

    res.status(201).json({
      message: 'Payment request generated.',
      paymentRequest: reqEntity,
      paymentUrl: `https://aurelis.com/pay/${slug}`,
    });
  }

  public static async getPaymentRequestBySlug(req: Request, res: Response) {
    const { slug } = req.params as { slug: string };
    const paymentReq = await db.paymentRequests.get(slug);

    if (!paymentReq) {
      return res.status(404).json({ error: 'Payment request not found or expired.' });
    }

    const user = await db.users.get(paymentReq.userId);

    res.json({
      paymentRequest: paymentReq,
      beneficiary: {
        name: user?.fullName || 'AURELIS Client',
        aurelisTag: user?.aurelisTag,
        avatar: user?.avatar,
      },
    });
  }
}
