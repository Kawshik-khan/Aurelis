import { Response } from 'express';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class TransactionController {
  public static async getTransactions(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });
    const { type, currency, search, limit = '50', offset = '0' } = req.query;

    let list = await db.transactions.findByUser(userId);

    if (type && type !== 'all') {
      list = list.filter((t) => t.type === type);
    }

    if (currency && currency !== 'all') {
      list = list.filter((t) => t.currency === currency || t.destinationCurrency === currency);
    }

    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          (t.recipientName && t.recipientName.toLowerCase().includes(q)) ||
          (t.senderName && t.senderName.toLowerCase().includes(q)) ||
          (t.reference && t.reference.toLowerCase().includes(q))
      );
    }

    // Sort descending by date
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = list.length;
    const paginated = list.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      total,
      limit: Number(limit),
      offset: Number(offset),
      transactions: paginated,
    });
  }

  public static async getTransactionReceipt(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params as { id: string };
    const txn = await db.transactions.get(id);

    if (!txn || txn.userId !== req.user?.id) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    res.json({
      receipt: {
        receiptNumber: `REC-${txn.id}`,
        transactionId: txn.id,
        issueDate: txn.date,
        settlementStatus: txn.status,
        amount: txn.amount,
        currency: txn.currency,
        counterparty: txn.recipientName || txn.senderName,
        paymentMethod: txn.paymentMethod,
        fee: txn.fee,
        exchangeRate: txn.exchangeRate,
        destinationAmount: txn.destinationAmount,
        destinationCurrency: txn.destinationCurrency,
        referenceMemo: txn.reference,
        cryptographicSignature: txn.receiptSignature || 'AURELIS_VERIFIED_SETTLEMENT',
        issuer: 'AURELIS Swiss Custody & Settlement AG',
      },
    });
  }
}
