import { Response } from 'express';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { CurrencyCode } from '../types';
import { FXService } from '../services/fxService';
import { TransferService } from '../services/transferService';

export class TransferController {
  public static async getQuote(req: AuthenticatedRequest, res: Response) {
    const { amount, sourceCurrency, destinationCurrency } = req.body as {
      amount: number;
      sourceCurrency: CurrencyCode;
      destinationCurrency: CurrencyCode;
    };

    const parsedAmount = parseFloat(String(amount)) || 0;
    const rate = FXService.getRate(sourceCurrency, destinationCurrency);
    const converted = parsedAmount * rate;
    const fee = 4.99; // Standard international swift fee

    res.json({
      sourceCurrency,
      destinationCurrency,
      amount: parsedAmount,
      convertedAmount: Number(converted.toFixed(2)),
      exchangeRate: Number(rate.toFixed(6)),
      fee,
      totalCharged: Number((parsedAmount + fee).toFixed(2)),
      estimatedArrival: 'Today (Within minutes)',
    });
  }

  public static async executeTransfer(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to execute transfers.' });
    }
    const idempotencyKey = req.headers['idempotency-key'] as string;

    const {
      recipientId,
      recipientName,
      recipientEmail,
      sourceCurrency,
      destinationCurrency,
      amount,
      reference,
      pin,
    } = req.body;

    const senderUser = await db.getUserById(userId);
    const expectedPin = senderUser?.transactionPin || '1234';

    if (!pin) {
      return res.status(400).json({ error: 'Security PIN is required to authorize this transfer.' });
    }

    if (String(pin).trim() !== String(expectedPin).trim()) {
      return res.status(400).json({ error: 'Incorrect Security PIN. Authorization rejected.' });
    }

    try {
      const txn = await TransferService.executeTransfer({
        userId,
        recipientId,
        recipientName,
        recipientEmail,
        sourceCurrency,
        destinationCurrency: destinationCurrency || sourceCurrency,
        amount: parseFloat(amount),
        reference,
        idempotencyKey,
        pin,
      });

      res.status(201).json({
        message: 'Transfer processed and settled successfully.',
        transaction: txn,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Transfer failed.' });
    }
  }

  public static async getTransferById(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params as { id: string };
    const txn = await db.transactions.get(id);

    if (!txn) {
      return res.status(404).json({ error: 'Transaction reference not found.' });
    }

    res.json({ transaction: txn });
  }
}
