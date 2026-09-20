import { Request, Response } from 'express';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { CurrencyCode, WalletEntity } from '../types';
import { FXService } from '../services/fxService';
import { LedgerService } from '../services/ledgerService';
import { TransferService } from '../services/transferService';
import { SocketService } from '../sockets/websocketServer';
import { NotificationDispatchService } from '../services/notificationDispatchService';

export class FXController {
  public static async getLiveRates(req: Request, res: Response) {
    const rates = FXService.getAllRates();
    res.json({
      timestamp: new Date().toISOString(),
      provider: 'AURELIS Institutional Interbank Liquidity Matrix',
      rates,
    });
  }

  public static async getRateTrends(req: Request, res: Response) {
    const pair = (req.query.pair as string) || 'USD/EUR';
    const trend = FXService.getHistoricalTrend(pair);

    res.json({
      pair,
      trend,
    });
  }

  public static async lockRate(req: AuthenticatedRequest, res: Response) {
    const { fromCurrency, toCurrency, fromAmount } = req.body as {
      fromCurrency: CurrencyCode;
      toCurrency: CurrencyCode;
      fromAmount: number;
    };

    const lock = await FXService.createRateLock(fromCurrency, toCurrency, parseFloat(String(fromAmount)) || 1000);

    res.json({
      message: 'Rate locked for 60 seconds.',
      lock,
    });
  }

  public static async executeConversion(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });
    const { fromCurrency, toCurrency, fromAmount, quoteId } = req.body;

    const parsedFrom = parseFloat(fromAmount) || 0;
    if (parsedFrom <= 0) {
      return res.status(400).json({ error: 'Valid conversion amount required.' });
    }

    let rate = FXService.getRate(fromCurrency, toCurrency);
    if (quoteId) {
      const lock = await FXService.verifyRateLock(quoteId);
      if (lock) {
        rate = lock.rate;
      }
    }

    const toAmount = Number((parsedFrom * rate).toFixed(4));

    // Find source and dest wallets
    const wallets = await db.wallets.findByUser(userId);
    const fromWallet = wallets.find((w) => w.currency === fromCurrency);
    let toWallet = wallets.find((w) => w.currency === toCurrency);

    if (!fromWallet || fromWallet.balance < parsedFrom) {
      return res.status(400).json({ error: `Insufficient funds in ${fromCurrency} wallet.` });
    }

    // Auto-create target wallet if not exists
    if (!toWallet) {
      toWallet = {
        id: `w_${toCurrency.toLowerCase()}_${Date.now()}`,
        userId,
        currency: toCurrency,
        balance: 0,
        pendingBalance: 0,
        accountNumber: `AURL ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
        iban: `${toCurrency}29 AURL ${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        bic: `AURL${toCurrency}XX`,
        isPrimary: false,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.wallets.set(toWallet.id, toWallet);
    }

    const txnId = TransferService.generateTxnId();
    const txn = {
      id: txnId,
      userId,
      type: 'exchange' as const,
      amount: parsedFrom,
      currency: fromCurrency,
      sourceCurrency: fromCurrency,
      destinationCurrency: toCurrency,
      destinationAmount: toAmount,
      exchangeRate: rate,
      fee: 0.00,
      totalCharged: parsedFrom,
      sourceWalletId: fromWallet.id,
      destWalletId: toWallet.id,
      recipientName: `DBS Bank ${toCurrency} Wallet`,
      paymentMethod: 'Internal Treasury Exchange',
      status: 'Completed' as const,
      date: new Date().toISOString(),
      reference: `FX Conversion ${fromCurrency} → ${toCurrency}`,
      category: 'Exchange',
      receiptSignature: `DBS_FX_SHA256_${txnId}_SIG_VALID`,
    };

    let freshFromWallet: WalletEntity = fromWallet;
    let freshToWallet: WalletEntity = toWallet;

    try {
      await db.engine.transaction(async (client) => {
        const lockedMap = await db.engine.getWalletsForUpdate(client, [fromWallet.id, toWallet.id]);
        const lockedFrom = lockedMap.get(fromWallet.id);
        const lockedTo = lockedMap.get(toWallet.id);

        if (!lockedFrom || !lockedTo) {
          throw new Error('Could not acquire lock on exchange wallets.');
        }

        if (Number(lockedFrom.balance) < parsedFrom) {
          throw new Error(`Insufficient funds in ${fromCurrency} wallet.`);
        }

        const fromBalanceAfter = Number((Number(lockedFrom.balance) - parsedFrom).toFixed(4));
        const toBalanceAfter = Number((Number(lockedTo.balance) + toAmount).toFixed(4));

        freshFromWallet = await db.engine.updateWalletBalanceTx(client, lockedFrom.id, fromBalanceAfter);
        freshToWallet = await db.engine.updateWalletBalanceTx(client, lockedTo.id, toBalanceAfter);

        await db.engine.insertTransactionTx(client, txn as any);

        await db.engine.insertLedgerEntryTx(client, {
          id: `led_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          transactionId: txn.id,
          walletId: fromWallet.id,
          entryType: 'DEBIT',
          amount: parsedFrom,
          currency: fromCurrency,
          balanceAfter: fromBalanceAfter,
          createdAt: new Date().toISOString(),
        });

        await db.engine.insertLedgerEntryTx(client, {
          id: `led_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          transactionId: txn.id,
          walletId: toWallet.id,
          entryType: 'CREDIT',
          amount: toAmount,
          currency: toCurrency,
          balanceAfter: toBalanceAfter,
          createdAt: new Date().toISOString(),
        });
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Currency conversion failed.' });
    }

    fromWallet = freshFromWallet;
    toWallet = freshToWallet;
    db.saveToFile();

    try {
      SocketService.broadcastToUser(userId, {
        type: 'WALLET_UPDATED',
        payload: fromWallet,
      });
      SocketService.broadcastToUser(userId, {
        type: 'WALLET_UPDATED',
        payload: toWallet,
      });
      SocketService.broadcastToUser(userId, {
        type: 'TRANSACTION_CREATED',
        payload: txn,
      });

      // Dispatch Email & Mobile SMS alerts for FX conversion
      const user = await db.getUserById(userId);
      if (user) {
        NotificationDispatchService.dispatchTransactionAlerts(txn, user, {
          walletBalance: toWallet.balance,
          currency: toCurrency,
        }).catch((err) => console.warn('FX alert dispatch note:', err));
      }
    } catch (e) {
      console.warn('Socket broadcast error:', e);
    }

    res.status(201).json({
      message: 'Currency conversion settled instantaneously.',
      transaction: txn,
      fromWallet,
      toWallet,
    });
  }
}
