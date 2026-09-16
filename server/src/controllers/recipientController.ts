import { Response } from 'express';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { RecipientEntity } from '../types';

export class RecipientController {
  public static async getRecipients(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const list = await db.recipients.findByUser(userId);
    res.json({ recipients: list });
  }

  public static async createRecipient(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const { name, email, phone, currency, bankName, accountNumber, routingOrIban, aurelisTag } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    const newRec: RecipientEntity = {
      id: `rec_${Date.now()}`,
      userId,
      name,
      email,
      phone,
      currency: currency || 'USD',
      bankName: bankName || 'Global Private Bank',
      accountNumber: accountNumber || `•••• ${Math.floor(1000 + Math.random() * 9000)}`,
      routingOrIban: routingOrIban || '021000021',
      aurelisTag: aurelisTag || `@${name.toLowerCase().replace(/\s+/g, '')}`,
      isFavorite: false,
      createdAt: new Date().toISOString(),
    };

    await db.recipients.set(newRec.id, newRec);
    db.saveToFile();

    res.status(201).json({
      message: 'Beneficiary registered successfully.',
      recipient: newRec,
    });
  }

  public static async updateRecipient(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });
    const { id } = req.params as { id: string };
    const rec = await db.recipients.get(id);

    if (!rec || rec.userId !== userId) {
      return res.status(404).json({ error: 'Recipient not found.' });
    }

    Object.assign(rec, req.body);
    await db.recipients.set(rec.id, rec);
    db.saveToFile();

    res.json({
      message: 'Recipient details updated.',
      recipient: rec,
    });
  }

  public static async deleteRecipient(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });
    const { id } = req.params as { id: string };
    const rec = await db.recipients.get(id);

    if (!rec || rec.userId !== userId) {
      return res.status(404).json({ error: 'Recipient not found.' });
    }

    await db.recipients.delete(id);
    db.saveToFile();
    res.json({ message: 'Recipient removed from registry.' });
  }

  public static async toggleFavorite(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });
    const { id } = req.params as { id: string };
    const rec = await db.recipients.get(id);
    if (!rec || rec.userId !== userId) return res.status(404).json({ error: 'Recipient not found.' });

    rec.isFavorite = !rec.isFavorite;
    await db.recipients.set(rec.id, rec);
    db.saveToFile();
    res.json({ recipient: rec });
  }
}
