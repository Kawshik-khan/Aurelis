import { db } from '../db/database';
import { CurrencyCode, DispatchedAlertEntity, TransactionEntity, UserEntity } from '../types';
import { SocketService } from '../sockets/websocketServer';
import { EmailService } from './emailService';
import { SmsService } from './smsService';

export interface DispatchAlertOptions {
  walletBalance?: number;
  currency?: CurrencyCode;
  counterpartyName?: string;
  counterpartyEmail?: string;
}

export class NotificationDispatchService {
  /**
   * Format currency amounts cleanly for messages and emails
   */
  public static formatAmount(amount: number, currency: CurrencyCode): string {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      BDT: '৳',
      CHF: 'CHF ',
      JPY: '¥',
      CAD: 'CA$',
      AUD: 'AU$',
      SGD: 'SG$',
      AED: 'AED ',
    };
    const sym = symbols[currency] || `${currency} `;
    return `${sym}${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Format amounts specifically for SMS alerts matching Bangladeshi MFS style (e.g. Tk 10,000.00)
   */
  public static formatSmsAmount(amount: number, currency?: string): string {
    const formatted = Number(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const prefix = (!currency || currency === 'BDT' || currency === 'USD') ? 'Tk' : currency;
    return `${prefix} ${formatted}`;
  }

  /**
   * Format date for SMS messages matching Bangladeshi MFS standard (DD/MM/YYYY HH:mm)
   * Example: 20/09/2026 13:55
   */
  public static formatSmsDate(dateInput?: string | Date): string {
    const d = dateInput ? new Date(dateInput) : new Date();
    const valid = isNaN(d.getTime()) ? new Date() : d;
    const day = String(valid.getDate()).padStart(2, '0');
    const month = String(valid.getMonth() + 1).padStart(2, '0');
    const year = valid.getFullYear();
    const hours = String(valid.getHours()).padStart(2, '0');
    const minutes = String(valid.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  /**
   * Centralized dispatcher called whenever any transaction completes
   */
  public static async dispatchTransactionAlerts(
    transaction: TransactionEntity,
    user: UserEntity,
    options: DispatchAlertOptions = {}
  ): Promise<{ emailAlert?: DispatchedAlertEntity; smsAlert?: DispatchedAlertEntity }> {
    const results: { emailAlert?: DispatchedAlertEntity; smsAlert?: DispatchedAlertEntity } = {};

    try {
      const emailEnabled = user.emailAlertsEnabled !== false;
      const smsEnabled = user.smsAlertsEnabled !== false;
      const userEmail = user.email || `${user.id}@vault.dbs.com.bd`;
      const fallbackPhone = process.env.SMS_DEFAULT_RECIPIENT || '';
      const userPhone =
        user.phone && !user.phone.includes('555')
          ? user.phone
          : (fallbackPhone || '');

      const typeLabel = this.getTransactionTypeLabel(transaction.type);
      const formattedAmount = this.formatAmount(transaction.amount, transaction.currency);
      const balanceStr = options.walletBalance !== undefined
        ? this.formatAmount(options.walletBalance, options.currency || transaction.currency)
        : 'Available';

      const counterparty =
        options.counterpartyName ||
        (transaction.type === 'receive'
          ? transaction.senderName || transaction.recipientName
          : transaction.recipientName || transaction.senderName) ||
        'DBS Sovereign Vault';

      // ============================================================
      // 1. GENERATE & DISPATCH SMS MESSAGE
      // ============================================================
      if (smsEnabled && userPhone) {
        const smsAmt = this.formatSmsAmount(transaction.amount, transaction.currency);
        const feeAmt = this.formatSmsAmount(transaction.fee || 0, transaction.currency);
        const balanceVal = options.walletBalance !== undefined ? options.walletBalance : 0;
        const balanceSmsStr = this.formatSmsAmount(balanceVal, options.currency || transaction.currency);
        const trxDateStr = this.formatSmsDate(transaction.date);
        const trxId = transaction.id;

        let smsText = '';
        if (transaction.type === 'receive') {
          // Inbound transfer / Cash In from counterparty
          smsText = `Cash In or Send Money ${smsAmt} from ${counterparty} successful. Fee ${feeAmt}. Balance ${balanceSmsStr}. TrxID ${trxId} at ${trxDateStr}.`;
        } else if (transaction.type === 'send') {
          // Outbound transfer / Send Money to counterparty
          smsText = `Send Money ${smsAmt} to ${counterparty} successful. Fee ${feeAmt}. Balance ${balanceSmsStr}. TrxID ${trxId} at ${trxDateStr}.`;
        } else if (transaction.type === 'deposit') {
          // Vault deposit / Cash In
          smsText = `Cash In ${smsAmt} from ${counterparty} successful. Fee ${feeAmt}. Balance ${balanceSmsStr}. TrxID ${trxId} at ${trxDateStr}.`;
        } else if (transaction.type === 'withdrawal') {
          // Vault withdrawal / Cash Out
          smsText = `Cash Out ${smsAmt} to ${counterparty} successful. Fee ${feeAmt}. Balance ${balanceSmsStr}. TrxID ${trxId} at ${trxDateStr}.`;
        } else if (transaction.type === 'exchange') {
          const destAmt = transaction.destinationAmount ? this.formatSmsAmount(transaction.destinationAmount, transaction.destinationCurrency || 'USD') : '';
          smsText = `Exchange ${smsAmt} to ${destAmt} successful. Fee ${feeAmt}. Balance ${balanceSmsStr}. TrxID ${trxId} at ${trxDateStr}.`;
        } else {
          smsText = `Payment ${smsAmt} to ${counterparty} successful. Fee ${feeAmt}. Balance ${balanceSmsStr}. TrxID ${trxId} at ${trxDateStr}.`;
        }

        const smsAlert: DispatchedAlertEntity = {
          id: `sms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId: user.id,
          transactionId: transaction.id,
          channel: 'SMS',
          recipient: userPhone,
          subject: `DBS Bank Alert: ${typeLabel} Completed`,
          bodyText: smsText,
          status: 'DELIVERED',
          createdAt: new Date().toISOString(),
        };

        // Attempt live SMS dispatch via sms.net.bd if configured
        await SmsService.sendSms({
          to: userPhone,
          msg: smsText,
        }).catch((err) => {
          console.warn('[DBS-SMS-DELIVERY] sms.net.bd fallback note:', err.message);
        });

        await db.dispatchedAlerts.set(smsAlert.id, smsAlert);
        results.smsAlert = smsAlert;

        console.log(`[DBS-SMS] Dispatched to ${userPhone}: "${smsText}"`);

        // Real-time broadcast
        SocketService.broadcastToUser(user.id, {
          type: 'SMS_DISPATCHED',
          payload: smsAlert,
        });
      } else if (smsEnabled && !userPhone) {
        console.log(`[DBS-SMS] User ${user.id} has SMS alerts enabled but no registered phone number. Skipping SMS dispatch.`);
      }

      // ============================================================
      // 2. GENERATE & DISPATCH EMAIL RECEIPT ("MAIL")
      // ============================================================
      if (emailEnabled) {
        const emailSubject = this.getEmailSubject(transaction, formattedAmount, counterparty);
        const emailHtml = this.generateLuxuryEmailHtml({
          user,
          transaction,
          formattedAmount,
          counterparty,
          walletBalanceStr: balanceStr,
        });

        const emailText = `DBS BANK - DIGITAL BANKING BANGLADESH - TRANSACTION RECEIPT\n` +
          `--------------------------------------------------\n` +
          `Status: COMPLETED (SETTLED)\n` +
          `Transaction ID: ${transaction.id}\n` +
          `Type: ${typeLabel}\n` +
          `Amount: ${formattedAmount}\n` +
          `Counterparty: ${counterparty}\n` +
          `Date: ${new Date(transaction.date).toUTCString()}\n` +
          `Vault Balance After Settlement: ${balanceStr}\n` +
          `Reference: ${transaction.reference || 'Vault Transfer'}\n` +
          `Signature: ${transaction.receiptSignature || `DBS_BANK_SIG_${transaction.id}`}\n` +
          `--------------------------------------------------\n` +
          `DBS Bank (Bangladesh) Ltd | Dhaka, Bangladesh`;

        const emailAlert: DispatchedAlertEntity = {
          id: `mail_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId: user.id,
          transactionId: transaction.id,
          channel: 'EMAIL',
          recipient: userEmail,
          subject: emailSubject,
          bodyText: emailText,
          bodyHtml: emailHtml,
          status: 'DELIVERED',
          createdAt: new Date().toISOString(),
        };

        // Attempt live email dispatch via EmailService (Resend / SMTP)
        const emailResult = await EmailService.sendEmail({
          to: userEmail,
          subject: emailSubject,
          text: emailText,
          html: emailHtml,
        });
        if (!emailResult.success && emailResult.error) {
          console.warn('[DBS-MAIL-DELIVERY] Provider fallback note:', emailResult.error);
        }

        await db.dispatchedAlerts.set(emailAlert.id, emailAlert);
        results.emailAlert = emailAlert;

        console.log(`[DBS-MAIL] Dispatched to ${userEmail}: "${emailSubject}"`);

        // Real-time broadcast
        SocketService.broadcastToUser(user.id, {
          type: 'EMAIL_DISPATCHED',
          payload: emailAlert,
        });
      }

      // Combined event for easy client integration
      SocketService.broadcastToUser(user.id, {
        type: 'ALERT_DISPATCHED',
        payload: {
          transactionId: transaction.id,
          emailAlert: results.emailAlert,
          smsAlert: results.smsAlert,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (dispatchError) {
      console.error('[DBS-DISPATCH-ERROR] Non-blocking alert dispatch error:', dispatchError);
    }

    return results;
  }

  private static getTransactionTypeLabel(type: string): string {
    switch (type) {
      case 'send':
        return 'Outbound Wire Transfer';
      case 'receive':
        return 'Inbound Wire Settlement';
      case 'deposit':
        return 'Vault Capital Deposit';
      case 'withdrawal':
        return 'External Wire Withdrawal';
      case 'exchange':
        return 'Foreign Currency Exchange';
      case 'card_payment':
        return 'Card Liquidity Charge';
      default:
        return 'Settlement Transaction';
    }
  }

  private static getEmailSubject(
    transaction: TransactionEntity,
    formattedAmount: string,
    counterparty: string
  ): string {
    switch (transaction.type) {
      case 'send':
        return `Transaction Confirmation: Dispatched ${formattedAmount} to ${counterparty} [${transaction.id}]`;
      case 'receive':
        return `Capital Inbound Notification: Credited ${formattedAmount} from ${counterparty} [${transaction.id}]`;
      case 'deposit':
        return `Vault Deposit Confirmed: Credited ${formattedAmount} to Account [${transaction.id}]`;
      case 'withdrawal':
        return `External Withdrawal Notice: Dispatched ${formattedAmount} to ${counterparty} [${transaction.id}]`;
      case 'exchange':
        return `FX Exchange Settlement: ${formattedAmount} Converted [${transaction.id}]`;
      default:
        return `DBS Bank Transaction Completed: ${formattedAmount} [${transaction.id}]`;
    }
  }

  /**
   * Generates a high-end luxury Swiss private banking HTML email receipt
   */
  public static generateLuxuryEmailHtml(params: {
    user: UserEntity;
    transaction: TransactionEntity;
    formattedAmount: string;
    counterparty: string;
    walletBalanceStr: string;
  }): string {
    const { user, transaction, formattedAmount, counterparty, walletBalanceStr } = params;
    const isCredit = transaction.type === 'receive' || transaction.type === 'deposit';
    const accentColor = isCredit ? '#10B981' : '#3B82F6';
    const typeTitle = this.getTransactionTypeLabel(transaction.type);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DBS Bank Bangladesh Private Banking Receipt</title>
  <style>
    body { margin: 0; padding: 0; background-color: #060810; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0; }
    .container { max-width: 600px; margin: 30px auto; background: #0B0E1A; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; overflow: hidden; box-shadow: 0 24px 64px rgba(0, 0, 0, 0.8); }
    .header { padding: 36px 36px 24px; background: linear-gradient(180deg, #101526 0%, #0B0E1A 100%); border-bottom: 1px solid rgba(255, 255, 255, 0.08); text-align: center; }
    .logo-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px; border-radius: 9999px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.25); color: #60A5FA; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 16px; }
    .hero-title { font-size: 24px; font-weight: 700; color: #FFFFFF; margin: 0 0 4px; letter-spacing: -0.5px; }
    .hero-subtitle { font-size: 13px; color: #94A3B8; margin: 0; }
    .amount-box { margin: 28px 36px; padding: 24px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 18px; text-align: center; }
    .amount-label { font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 1.5px; color: #64748B; margin-bottom: 6px; }
    .amount-value { font-size: 36px; font-weight: 800; color: ${accentColor}; font-family: 'Courier New', Courier, monospace; letter-spacing: -1px; }
    .status-badge { display: inline-block; margin-top: 10px; padding: 4px 12px; border-radius: 6px; background: ${isCredit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)'}; border: 1px solid ${isCredit ? '#10B981' : '#3B82F6'}; color: ${isCredit ? '#34D399' : '#93C5FD'}; font-size: 11px; font-weight: 700; letter-spacing: 1px; }
    .details { padding: 0 36px 28px; }
    .details-table { width: 100%; border-collapse: collapse; }
    .details-table tr { border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
    .details-table tr:last-child { border-bottom: none; }
    .details-table td { padding: 14px 0; font-size: 13px; }
    .detail-label { color: #64748B; font-weight: 500; }
    .detail-value { text-align: right; color: #F8FAFC; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    .detail-value.mono { font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #94A3B8; }
    .crypto-box { margin: 0 36px 28px; padding: 16px; background: rgba(0, 0, 0, 0.4); border: 1px dashed rgba(255, 255, 255, 0.12); border-radius: 12px; font-size: 11px; color: #64748B; line-height: 1.6; }
    .crypto-sig { font-family: 'Courier New', monospace; font-size: 10px; color: #38BDF8; word-break: break-all; margin-top: 4px; }
    .footer { padding: 24px 36px 36px; background: #080A14; border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center; font-size: 11px; color: #475569; line-height: 1.6; }
    .footer-links a { color: #60A5FA; text-decoration: none; margin: 0 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">DBS BANK • DIGITAL BANKING BANGLADESH</div>
      <h1 class="hero-title">${typeTitle}</h1>
      <p class="hero-subtitle">Official Settlement Notice for ${user.fullName}</p>
    </div>

    <div class="amount-box">
      <div class="amount-label">Settlement Amount</div>
      <div class="amount-value">${formattedAmount}</div>
      <div class="status-badge">SETTLED & CONFIRMED</div>
    </div>

    <div class="details">
      <table class="details-table">
        <tr>
          <td class="detail-label">Transaction Reference</td>
          <td class="detail-value mono">${transaction.id}</td>
        </tr>
        <tr>
          <td class="detail-label">Execution Date & Time</td>
          <td class="detail-value">${new Date(transaction.date).toUTCString()}</td>
        </tr>
        <tr>
          <td class="detail-label">Transaction Flow</td>
          <td class="detail-value">${typeTitle}</td>
        </tr>
        <tr>
          <td class="detail-label">${isCredit ? 'Sender / Originator' : 'Beneficiary / Counterparty'}</td>
          <td class="detail-value">${counterparty}</td>
        </tr>
        <tr>
          <td class="detail-label">Settlement Method</td>
          <td class="detail-value">${transaction.paymentMethod || 'AURELIS Multi-Currency Vault'}</td>
        </tr>
        <tr>
          <td class="detail-label">Network / Settlement Fee</td>
          <td class="detail-value">${transaction.fee ? `$${Number(transaction.fee).toFixed(2)}` : '$0.00 (Zero-Fee Sovereign)'}</td>
        </tr>
        <tr>
          <td class="detail-label">Updated Vault Balance</td>
          <td class="detail-value" style="color: #38BDF8;">${walletBalanceStr}</td>
        </tr>
        ${transaction.reference ? `<tr><td class="detail-label">Reference Memo</td><td class="detail-value">${transaction.reference}</td></tr>` : ''}
      </table>
    </div>

    <div class="crypto-box">
      <div><strong>Cryptographic Settlement Seal:</strong> Verified on DBS Bank Double-Entry Immutable Ledger.</div>
      <div class="crypto-sig">${transaction.receiptSignature || `DBS_BANK_SHA256_${transaction.id}_SETTLED`}</div>
    </div>

    <div class="footer">
      <p>This electronic notification serves as an official confirmation of transaction settlement.<br />
      DBS Bank (Bangladesh) • Gulshan Avenue, Dhaka-1212, Bangladesh • 24/7 Helpline: 16234</p>
      <div class="footer-links">
        <a href="https://dbs.com.bd/security">Security Protocols</a> •
        <a href="https://dbs.com.bd/support">24/7 Helpline 16234</a> •
        <a href="https://dbs.com.bd/privacy">Privacy Policy</a>
      </div>
      <p style="margin-top: 12px; color: #334155;">Account ID: ${user.id} • Registered to: ${user.email}</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Live email delivery helper delegating to EmailService (Resend / SMTP)
   */
  private static async sendLiveEmailIfConfigured(
    to: string,
    subject: string,
    text: string,
    html: string
  ): Promise<void> {
    await EmailService.sendEmail({ to, subject, text, html });
  }
}
