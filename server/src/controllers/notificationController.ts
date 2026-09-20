import { Response } from 'express';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { NotificationDispatchService } from '../services/notificationDispatchService';
import { EmailService } from '../services/emailService';
import { SmsService } from '../services/smsService';

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

  public static async getDispatchedAlerts(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });

    const channel = (req.query.channel as string) || 'all';
    const limit = parseInt(req.query.limit as string) || 50;

    const alerts = await db.dispatchedAlerts.findByUser(userId, channel, limit);
    res.json({ alerts });
  }

  public static async getAlertById(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });
    const { id } = req.params as { id: string };

    const alert = await db.dispatchedAlerts.get(id);
    if (!alert || alert.userId !== userId) {
      return res.status(404).json({ error: 'Alert not found.' });
    }

    res.json({ alert });
  }

  public static async getPreferences(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });

    const user = await db.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    res.json({
      emailAlertsEnabled: user.emailAlertsEnabled !== false,
      smsAlertsEnabled: user.smsAlertsEnabled !== false,
      email: user.email,
      phone: user.phone || '+1 (555) 019-8234',
    });
  }

  public static async updatePreferences(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });

    const user = await db.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const { emailAlertsEnabled, smsAlertsEnabled, phone } = req.body;

    if (emailAlertsEnabled !== undefined) {
      user.emailAlertsEnabled = Boolean(emailAlertsEnabled);
    }
    if (smsAlertsEnabled !== undefined) {
      user.smsAlertsEnabled = Boolean(smsAlertsEnabled);
    }
    if (phone !== undefined && typeof phone === 'string') {
      user.phone = phone.trim();
    }

    user.updatedAt = new Date().toISOString();
    await db.users.set(user.id, user);

    res.json({
      message: 'Alert preferences updated successfully.',
      preferences: {
        emailAlertsEnabled: user.emailAlertsEnabled,
        smsAlertsEnabled: user.smsAlertsEnabled,
        phone: user.phone,
      },
    });
  }

  public static async triggerTestAlert(req: AuthenticatedRequest, res: Response) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Test alert endpoint is disabled in production environment.' });
    }

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });

    const user = await db.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const { type = 'send', amount = 12500.0, currency = 'USD' } = req.body;

    const mockTxn = {
      id: `TXN-ALERT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      userId: user.id,
      type: type as any,
      amount: parseFloat(amount) || 12500.0,
      currency: currency as any,
      sourceCurrency: currency as any,
      destinationCurrency: currency as any,
      fee: 0.0,
      totalCharged: parseFloat(amount) || 12500.0,
      recipientName: type === 'send' ? 'DBS Sovereign Recipient' : undefined,
      recipientEmail: type === 'send' ? undefined : undefined,
      senderName: type === 'receive' ? 'DBS Sovereign Sender' : undefined,
      paymentMethod: type === 'deposit' ? 'Direct Bank Wire' : `DBS ${currency} Sovereign Account`,
      status: 'Completed' as const,
      date: new Date().toISOString(),
      reference: 'Sovereign Account Settlement Notification',
      category: 'Transfer',
      receiptSignature: `DBS_VERIFIED_SHA256_${Date.now()}`,
    };

    const userWallets = await db.wallets.findByUser(user.id);
    const targetWallet = userWallets.find((w) => w.currency === currency) || userWallets[0];

    const results = await NotificationDispatchService.dispatchTransactionAlerts(
      mockTxn,
      user,
      {
        walletBalance: targetWallet ? targetWallet.balance : 0.0,
        currency: currency as any,
        counterpartyName: mockTxn.recipientName || mockTxn.senderName,
      }
    );

    res.json({
      message: 'Transaction alerts dispatched via Email and Mobile SMS.',
      transaction: mockTxn,
      alerts: results,
    });
  }

  public static async sendTestEmail(req: AuthenticatedRequest, res: Response) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Test email endpoint is disabled in production environment.' });
    }

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });

    const user = await db.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Restrict strictly to authenticated user's own email to prevent open relay abuse
    const recipient = user.email;

    const result = await EmailService.sendEmail({
      to: recipient,
      subject: 'DBS Bank — Email Service Verification',
      text: `Your DBS Bank notification channel is active and operating. Timestamp: ${new Date().toUTCString()}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0E14; color: #F1F5F9; padding: 40px 24px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1E293B;">
          <div style="border-bottom: 1px solid #1E293B; padding-bottom: 20px; margin-bottom: 24px;">
            <span style="letter-spacing: 0.25em; font-size: 11px; text-transform: uppercase; color: #E11D48; font-weight: 700;">DBS BANK DIGITAL BANKING</span>
            <h1 style="font-size: 22px; font-weight: 600; color: #F8FAFC; margin: 8px 0 0 0;">Email Notification Service Connected</h1>
          </div>
          <p style="color: #94A3B8; font-size: 15px; line-height: 1.6;">Hello <strong>${user.fullName}</strong>,</p>
          <p style="color: #CBD5E1; font-size: 14px; line-height: 1.6;">This notification confirms that your <strong>Transactional Email Service</strong> is functioning correctly on your DBS Bank account.</p>
          <div style="background: #111827; border: 1px solid #1F2937; border-radius: 8px; padding: 18px; margin: 24px 0;">
            <div style="margin-bottom: 8px;"><strong style="color: #E11D48; font-size: 13px;">Recipient:</strong> <span style="color: #E2E8F0; font-size: 13px;">${recipient}</span></div>
            <div><strong style="color: #E11D48; font-size: 13px;">Timestamp:</strong> <span style="color: #E2E8F0; font-size: 13px;">${new Date().toUTCString()}</span></div>
          </div>
          <p style="color: #64748B; font-size: 12px; margin-top: 32px; border-top: 1px solid #1E293B; padding-top: 16px;">DBS Bank Real-Time Core Settlement &bull; Automated Notifications</p>
        </div>
      `,
    });

    res.json({
      message: result.success ? 'Email dispatched successfully.' : 'Email dispatch encountered an issue.',
      success: result.success,
      provider: result.provider,
      id: result.id,
      error: result.error,
      recipient,
    });
  }

  public static async sendTestSms(req: AuthenticatedRequest, res: Response) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Test SMS endpoint is disabled in production environment.' });
    }

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });

    const user = await db.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (!user.phone) {
      return res.status(400).json({ error: 'User does not have a registered mobile phone number.' });
    }

    // Restrict strictly to authenticated user's own phone number to prevent open relay abuse
    const recipient = user.phone;
    const msg = `[DBS Bank] Real-time SMS notification engine verification. Timestamp: ${new Date().toLocaleTimeString()}`;

    const result = await SmsService.sendSms({
      to: recipient,
      msg,
    });

    res.json({
      message: result.success ? 'SMS dispatched successfully.' : 'SMS dispatch encountered an issue.',
      success: result.success,
      provider: result.provider,
      requestId: result.requestId,
      error: result.error,
      errorCode: result.errorCode,
      recipient: result.recipient,
      raw: result.raw,
    });
  }

  public static async getSmsBalance(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });

    const result = await SmsService.getBalance();
    res.json(result);
  }
}

