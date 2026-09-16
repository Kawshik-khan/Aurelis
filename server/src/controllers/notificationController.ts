import { Response } from 'express';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class NotificationController {
  public static async getNotifications(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });

    const list = await db.notifications.findByUser(userId);
    res.json({ notifications: list });
  }

  public static async markRead(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });
    const { id } = req.params as { id: string };

    const notif = await db.notifications.get(id);
    if (!notif || notif.userId !== userId) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    notif.isRead = true;
    await db.notifications.set(notif.id, notif);
    db.saveToFile();

    res.json({ message: 'Notification marked as read.', notification: notif });
  }

  public static async markAllRead(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });

    const userNotifs = await db.notifications.findByUser(userId);

    for (const notif of userNotifs) {
      if (!notif.isRead) {
        notif.isRead = true;
        await db.notifications.set(notif.id, notif);
      }
    }
    db.saveToFile();

    res.json({ message: 'All notifications marked as read.' });
  }
}
