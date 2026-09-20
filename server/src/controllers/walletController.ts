import { Response } from 'express';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { CurrencyCode, WalletEntity } from '../types';
import { BASE_RATES_TO_USD } from '../services/fxService';
import { LedgerService } from '../services/ledgerService';
import { TransferService } from '../services/transferService';
import { SocketService } from '../sockets/websocketServer';
import { NotificationDispatchService } from '../services/notificationDispatchService';

export class WalletController {
  public static async getWallets(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });
    const userWallets = await db.wallets.findByUser(userId);

    const totalValuationUSD = userWallets.reduce((sum, w) => {
      const rateToUSD = BASE_RATES_TO_USD[w.currency] || 1.0;
      return sum + w.balance * rateToUSD;
    }, 0);

    res.json({
      totalValuationUSD: Number(totalValuationUSD.toFixed(2)),
      wallets: userWallets,
    });
  }

  public static async createWallet(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });
    const { currency } = req.body as { currency: CurrencyCode };

    if (!currency) {
      return res.status(400).json({ error: 'Currency is required.' });
    }

    const userWallets = await db.wallets.findByUser(userId);
    const existing = userWallets.find((w) => w.currency === currency);

    if (existing) {
      return res.json({ wallet: existing });
    }

    const newWallet: WalletEntity = {
      id: `w_${currency.toLowerCase()}_${Date.now()}`,
      userId,
      currency,
      balance: 0,
      pendingBalance: 0,
      accountNumber: `AURL ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
      iban: `${currency}29 AURL ${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      bic: `AURL${currency}XX`,
      isPrimary: false,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.wallets.set(newWallet.id, newWallet);
    db.saveToFile();

    try {
      SocketService.broadcastToUser(userId, {
        type: 'WALLET_UPDATED',
        payload: newWallet,
      });
    } catch (e) {
      console.warn('Socket broadcast error:', e);
    }

    res.status(201).json({
      message: 'Currency account provisioned successfully.',
      wallet: newWallet,
    });
  }

  public static async deposit(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });
    const { currency, amount, fundingSource } = req.body;

    const parsedAmount = parseFloat(amount) || 0;
    if (parsedAmount <= 0) {
      return res.status(400).json({ error: 'Valid deposit amount required.' });
    }

    const userWallets = await db.wallets.findByUser(userId);
    let wallet = userWallets.find((w) => w.currency === currency);

    if (!wallet) {
      const newWalletId = `w_${currency.toLowerCase()}_${Date.now()}`;
      wallet = {
        id: newWalletId,
        userId,
        currency: currency as CurrencyCode,
        balance: 0,
        pendingBalance: 0,
        accountNumber: `AURL ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
        iban: `${currency}29 AURL ${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        bic: `AURL${currency}XX`,
        isPrimary: false,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.wallets.set(wallet.id, wallet);
    }

    const txnId = TransferService.generateTxnId();
    const txn = {
      id: txnId,
      userId,
      type: 'deposit' as const,
      amount: parsedAmount,
      currency: currency as CurrencyCode,
      senderName: fundingSource || 'Direct ACH Deposit',
      recipientName: `DBS Bank ${currency} Wallet`,
      paymentMethod: fundingSource || 'Linked Bank Account',
      fee: 0.00,
      totalCharged: parsedAmount,
      status: 'Completed' as const,
      date: new Date().toISOString(),
      reference: 'Capital Reserve Deposit',
      category: 'Deposit',
    };

    let freshWallet: WalletEntity = wallet;

    await db.engine.transaction(async (client) => {
      const lockedWallet = await db.engine.getWalletForUpdate(client, wallet.id);
      if (!lockedWallet) {
        throw new Error(`Wallet ${wallet.id} not found for deposit.`);
      }
      const newBalance = Number((Number(lockedWallet.balance) + parsedAmount).toFixed(4));
      freshWallet = await db.engine.updateWalletBalanceTx(client, lockedWallet.id, newBalance);

      await db.engine.insertTransactionTx(client, txn as any);
      await db.engine.insertLedgerEntryTx(client, {
        id: `led_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        transactionId: txn.id,
        walletId: wallet.id,
        entryType: 'CREDIT',
        amount: parsedAmount,
        currency: currency as CurrencyCode,
        balanceAfter: newBalance,
        createdAt: new Date().toISOString(),
      });
    });

    wallet = freshWallet;
    db.saveToFile();

    try {
      SocketService.broadcastToUser(userId, {
        type: 'WALLET_UPDATED',
        payload: wallet,
      });
      SocketService.broadcastToUser(userId, {
        type: 'TRANSACTION_CREATED',
        payload: txn,
      });

      // Dispatch Email & Mobile SMS alerts for deposit ("Add Money")
      const user = await db.getUserById(userId);
      if (user) {
        NotificationDispatchService.dispatchTransactionAlerts(txn, user, {
          walletBalance: wallet.balance,
          currency: currency as CurrencyCode,
        }).catch((err) => console.warn('Deposit alert dispatch note:', err));
      }
    } catch (e) {
      console.warn('Socket/alert broadcast error:', e);
    }

    res.json({
      message: 'Funds credited successfully.',
      transaction: txn,
      wallet,
    });
  }

  public static async withdraw(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });
    const { currency, amount, targetAccount } = req.body;

    const parsedAmount = parseFloat(amount) || 0;
    if (parsedAmount <= 0) {
      return res.status(400).json({ error: 'Valid withdrawal amount required.' });
    }

    const userWallets = await db.wallets.findByUser(userId);
    let wallet = userWallets.find((w) => w.currency === currency);

    if (!wallet) {
      return res.status(404).json({ error: `Wallet for ${currency} not found.` });
    }

    const txnId = TransferService.generateTxnId();
    const txn = {
      id: txnId,
      userId,
      type: 'withdrawal' as const,
      amount: parsedAmount,
      currency: currency as CurrencyCode,
      recipientName: targetAccount || 'External Bank',
      paymentMethod: `DBS Bank ${currency} Wallet`,
      fee: 0.00,
      totalCharged: parsedAmount,
      status: 'Completed' as const,
      date: new Date().toISOString(),
      reference: `External Wire to ${targetAccount}`,
      category: 'Transfer',
    };

    let freshWallet: WalletEntity = wallet;

    try {
      await db.engine.transaction(async (client) => {
        const lockedWallet = await db.engine.getWalletForUpdate(client, wallet.id);
        if (!lockedWallet) {
          throw new Error(`Wallet ${wallet.id} not found for withdrawal.`);
        }
        if (Number(lockedWallet.balance) < parsedAmount) {
          throw new Error('Insufficient funds.');
        }

        const newBalance = Number((Number(lockedWallet.balance) - parsedAmount).toFixed(4));
        freshWallet = await db.engine.updateWalletBalanceTx(client, lockedWallet.id, newBalance);

        await db.engine.insertTransactionTx(client, txn as any);
        await db.engine.insertLedgerEntryTx(client, {
          id: `led_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          transactionId: txn.id,
          walletId: wallet.id,
          entryType: 'DEBIT',
          amount: parsedAmount,
          currency: currency as CurrencyCode,
          balanceAfter: newBalance,
          createdAt: new Date().toISOString(),
        });
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Withdrawal failed.' });
    }

    wallet = freshWallet;
    db.saveToFile();

    try {
      SocketService.broadcastToUser(userId, {
        type: 'WALLET_UPDATED',
        payload: wallet,
      });
      SocketService.broadcastToUser(userId, {
        type: 'TRANSACTION_CREATED',
        payload: txn,
      });

      // Dispatch Email & Mobile SMS alerts for withdrawal
      const user = await db.getUserById(userId);
      if (user) {
        NotificationDispatchService.dispatchTransactionAlerts(txn, user, {
          walletBalance: wallet.balance,
          currency: currency as CurrencyCode,
          counterpartyName: targetAccount,
        }).catch((err) => console.warn('Withdrawal alert dispatch note:', err));
      }
    } catch (e) {
      console.warn('Socket/alert broadcast error:', e);
    }

    res.json({
      message: 'Withdrawal dispatched successfully.',
      transaction: txn,
      wallet,
    });
  }
}
