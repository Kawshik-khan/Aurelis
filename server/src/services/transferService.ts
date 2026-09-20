import { db } from '../db/database';
import { CurrencyCode, RecipientEntity, TransactionEntity, WalletEntity } from '../types';
import { FXService } from './fxService';
import { LedgerService } from './ledgerService';
import { SocketService } from '../sockets/websocketServer';
import { NotificationDispatchService } from './notificationDispatchService';

export class TransferService {
  public static generateTxnId(): string {
    const chars = '0123456789ABCDEF';
    let hash = '';
    for (let i = 0; i < 8; i++) {
      hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `TXN-${hash}`;
  }

  /**
   * Execute atomic transfer with ledger settlement
   */
  public static async executeTransfer(params: {
    userId: string;
    recipientId?: string;
    recipientName?: string;
    recipientEmail?: string;
    sourceCurrency: CurrencyCode;
    destinationCurrency: CurrencyCode;
    amount: number;
    reference?: string;
    idempotencyKey?: string;
    pin?: string;
  }): Promise<TransactionEntity> {
    // 1. Find or validate source wallet
    const wallets = await db.wallets.findByUser(params.userId);
    const sourceWallet = wallets.find((w) => w.currency === params.sourceCurrency);

    if (!sourceWallet) {
      throw new Error(`Source wallet for ${params.sourceCurrency} not found.`);
    }

    // 2. Calculate fee & FX conversion
    const senderUser = await db.users.get(params.userId);
    const recipient = params.recipientId ? await db.recipients.get(params.recipientId) : null;
    const targetEmail = (recipient?.email || params.recipientEmail || '').toLowerCase().trim();
    const targetTag = (recipient?.aurelisTag || '').toLowerCase().trim();
    const targetName = (recipient?.name || params.recipientName || '').toLowerCase().trim();

    // Look up if recipient is a registered DBS Bank user
    let recipientUser =
      (params.recipientId ? await db.getUserById(params.recipientId) : null) ||
      (params.recipientId ? await db.findUserByEmailOrTag(params.recipientId) : null) ||
      (targetEmail ? await db.findUserByEmailOrTag(targetEmail) : null) ||
      (targetTag ? await db.findUserByEmailOrTag(targetTag) : null) ||
      (params.recipientName ? await db.findUserByEmailOrTag(params.recipientName) : null);

    if (!recipientUser) {
      const allUsers = await db.users.values();
      recipientUser = allUsers.find(
        (u) =>
          (params.recipientId && u.id.toLowerCase().trim() === params.recipientId.toLowerCase().trim()) ||
          (targetEmail && u.email.toLowerCase().trim() === targetEmail) ||
          (targetTag && u.aurelisTag.toLowerCase().trim() === targetTag) ||
          (params.recipientName && u.fullName.toLowerCase().trim() === params.recipientName.toLowerCase().trim())
      );
    }

    // If not in db.users, check if recipient is a registered beneficiary in db.recipients
    if (!recipientUser) {
      const allRecipients = await db.recipients.values();
      const matchedRec =
        recipient ||
        allRecipients.find(
          (r) =>
            (params.recipientId && r.id.toLowerCase().trim() === params.recipientId.toLowerCase().trim()) ||
            (targetEmail && r.email.toLowerCase().trim() === targetEmail) ||
            (targetTag && r.aurelisTag && r.aurelisTag.toLowerCase().trim() === targetTag) ||
            (params.recipientName && r.name.toLowerCase().trim() === params.recipientName.toLowerCase().trim())
        );

      if (matchedRec) {
        recipientUser = {
          id: matchedRec.id,
          email: matchedRec.email || `${matchedRec.id}@vault.dbs.com.bd`,
          fullName: matchedRec.name,
          phone: matchedRec.phone || '+880 1700-000000',
          passwordHash: '',
          aurelisTag: matchedRec.aurelisTag || `@${matchedRec.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          baseCurrency: matchedRec.currency || params.destinationCurrency,
          avatar: matchedRec.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          twoFactorEnabled: true,
          biometricEnabled: false,
          passkeyEnabled: false,
          address: { street: 'Gulshan Avenue, Road 11', city: 'Dhaka', country: 'Bangladesh', postalCode: '1212' },
          transactionPin: '1234',
          createdAt: matchedRec.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await db.users.set(recipientUser.id, recipientUser);
      }
    }

    // 1b. Strict recipient existence check: Recipient MUST be registered in database or beneficiaries
    if (!recipientUser) {
      const identifier = params.recipientEmail || params.recipientId || params.recipientName || 'unknown';
      throw new Error(
        `Transfer rejected: Recipient "${identifier}" was not found in the DBS Bank registry. No funds were debited from your account.`
      );
    }

    // Prevent self-transfer (sending money to own email/tag/account)
    if (
      recipientUser.id === params.userId ||
      (senderUser && targetEmail && senderUser.email.toLowerCase().trim() === targetEmail) ||
      (senderUser && targetTag && senderUser.aurelisTag.toLowerCase().trim() === targetTag) ||
      (params.recipientId && params.recipientId === params.userId)
    ) {
      throw new Error(
        'Self-transfer is not permitted. To move or convert funds between your own multi-currency wallets, please use the Currency Exchange feature.'
      );
    }

    const feeInUSD = 0.00; // Zero fee for verified peer sovereign transfers
    const feeInSource = feeInUSD; // In USD equivalent
    const totalCharged = params.amount + feeInSource;

    if (sourceWallet.balance < totalCharged) {
      throw new Error(
        `Insufficient funds in ${params.sourceCurrency} wallet. Balance: ${sourceWallet.balance.toFixed(2)}, Required: ${totalCharged.toFixed(2)}`
      );
    }

    const exchangeRate = FXService.getRate(params.sourceCurrency, params.destinationCurrency);
    const destinationAmount = params.amount * exchangeRate;

    // 3. Atomically Deduct Balance from Sender
    sourceWallet.balance = Number((sourceWallet.balance - totalCharged).toFixed(4));
    sourceWallet.updatedAt = new Date().toISOString();

    // 4. Generate Primary Transaction Entity & Persist to Database
    const txnId = this.generateTxnId();

    const newTxn: TransactionEntity = {
      id: txnId,
      userId: params.userId,
      type: 'send',
      amount: params.amount,
      currency: params.sourceCurrency,
      sourceCurrency: params.sourceCurrency,
      destinationCurrency: params.destinationCurrency,
      destinationAmount,
      exchangeRate,
      fee: feeInSource,
      totalCharged,
      sourceWalletId: sourceWallet.id,
      recipientId: recipient?.id,
      recipientName: recipient?.name || params.recipientName || 'External Payee',
      recipientEmail: recipient?.email || params.recipientEmail,
      recipientAvatar: recipient?.avatar,
      recipientAurelisTag: recipient?.aurelisTag,
      paymentMethod: `DBS Bank ${params.sourceCurrency} Wallet`,
      status: 'Completed',
      date: new Date().toISOString(),
      reference: params.reference || 'Global Transfer Settlement',
      category: 'Transfer',
      idempotencyKey: params.idempotencyKey,
      receiptSignature: `DBS_BANK_SHA256_${txnId}_SIG_VALID`,
    };

    // Save transaction and updated source wallet
    await db.transactions.set(newTxn.id, newTxn);
    await db.wallets.set(sourceWallet.id, sourceWallet);

    // 5. Write Immutable Double-Entry Ledger Record for Sender
    await LedgerService.recordEntry({
      transactionId: newTxn.id,
      walletId: sourceWallet.id,
      entryType: 'DEBIT',
      amount: totalCharged,
      currency: params.sourceCurrency,
      balanceAfter: sourceWallet.balance,
    });

    // 6. If recipient is an internal DBS Bank user, credit their wallet & record ledger/transaction
    let recipientWallet: WalletEntity | undefined;
    let receiveTxn: TransactionEntity | undefined;
    if (recipientUser && recipientUser.id !== params.userId) {
      const recWallets = await db.wallets.findByUser(recipientUser.id);
      recipientWallet = recWallets.find((w) => w.currency === params.destinationCurrency);

      if (!recipientWallet) {
        const newWalletId = `w_${params.destinationCurrency.toLowerCase()}_${Date.now()}`;
        recipientWallet = {
          id: newWalletId,
          userId: recipientUser.id,
          currency: params.destinationCurrency,
          balance: 0,
          pendingBalance: 0,
          accountNumber: `DBS ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
          iban: `BD89 DBSB ${Math.floor(100000000000 + Math.random() * 900000000000)}`,
          bic: 'DBSBBDDHXXX',
          isPrimary: false,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await db.wallets.set(newWalletId, recipientWallet);
      }

      recipientWallet.balance = Number((recipientWallet.balance + destinationAmount).toFixed(4));
      recipientWallet.updatedAt = new Date().toISOString();
      await db.wallets.set(recipientWallet.id, recipientWallet);

      // Record incoming transaction for recipient
      const recTxnId = `${txnId}_REC`;
      receiveTxn = {
        id: recTxnId,
        userId: recipientUser.id,
        type: 'receive',
        amount: destinationAmount,
        currency: params.destinationCurrency,
        sourceCurrency: params.sourceCurrency,
        destinationCurrency: params.destinationCurrency,
        destinationAmount,
        exchangeRate,
        fee: 0,
        totalCharged: 0,
        senderName: senderUser ? senderUser.fullName : 'DBS Bank Customer',
        recipientName: recipientUser.fullName,
        recipientEmail: recipientUser.email,
        paymentMethod: `DBS Bank ${params.sourceCurrency} Instant Transfer`,
        status: 'Completed',
        date: new Date().toISOString(),
        reference: params.reference || 'P2P Transfer Settlement',
        category: 'Transfer',
        receiptSignature: `DBS_BANK_RECEIVE_${txnId}`,
      };
      await db.transactions.set(receiveTxn.id, receiveTxn);

      // Record CREDIT entry in ledger referencing receiveTxn
      await LedgerService.recordEntry({
        transactionId: receiveTxn.id,
        walletId: recipientWallet.id,
        entryType: 'CREDIT',
        amount: destinationAmount,
        currency: params.destinationCurrency,
        balanceAfter: recipientWallet.balance,
      });

      // Add notification for recipient
      const recNotifId = `notif_${Date.now()}_rec`;
      await db.notifications.set(recNotifId, {
        id: recNotifId,
        userId: recipientUser.id,
        title: 'Money received',
        description: `You received ${params.destinationCurrency} ${destinationAmount.toFixed(2)} from ${senderUser?.fullName || 'DBS Bank Customer'}.`,
        type: 'transfer',
        timestamp: 'Just now',
        isRead: false,
        linkedTxnId: receiveTxn.id,
      });

      // Automatically register counterparty in sender's private beneficiaries list
      const senderRecipients = await db.recipients.findByUser(params.userId);
      const existingRec = senderRecipients.find(
        (r) => r.email.toLowerCase() === recipientUser!.email.toLowerCase() || r.id === recipientUser!.id
      );
      if (existingRec) {
        existingRec.lastTransferDate = new Date().toISOString();
        await db.recipients.set(existingRec.id, existingRec);
      } else {
        const recId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await db.recipients.set(recId, {
          id: recId,
          userId: params.userId,
          name: recipientUser.fullName,
          email: recipientUser.email,
          avatar: recipientUser.avatar,
          currency: params.destinationCurrency,
          bankName: 'DBS Bank Bangladesh',
          accountNumber: `ID: ${recipientUser.id}`,
          routingOrIban: recipientUser.id,
          aurelisTag: recipientUser.aurelisTag,
          lastTransferDate: new Date().toISOString(),
          isFavorite: true,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 7. Update Recipient last transfer date
    if (recipient) {
      recipient.lastTransferDate = 'Just now';
      await db.recipients.set(recipient.id, recipient);
    }

    // 8. Write Notification for Sender
    const notifId = `notif_${Date.now()}`;
    const senderNotif = {
      id: notifId,
      userId: params.userId,
      title: 'Transfer dispatched',
      description: `Dispatched ${params.sourceCurrency} ${params.amount.toFixed(2)} to ${newTxn.recipientName}.`,
      type: 'transfer' as const,
      timestamp: 'Just now',
      isRead: false,
      linkedTxnId: newTxn.id,
    };
    await db.notifications.set(notifId, senderNotif);

    db.saveToFile();

    // 9. Real-Time WebSocket Push Notifications & Settlement Broadcasts
    try {
      // Notify sender
      SocketService.broadcastToUser(params.userId, {
        type: 'WALLET_UPDATED',
        payload: sourceWallet,
      });
      SocketService.broadcastToUser(params.userId, {
        type: 'TRANSACTION_CREATED',
        payload: newTxn,
      });
      SocketService.broadcastToUser(params.userId, {
        type: 'NOTIFICATION_CREATED',
        payload: senderNotif,
      });

      // Notify counterparty if registered
      if (recipientUser && recipientUser.id !== params.userId) {
        const targetRecWallets = await db.wallets.findByUser(recipientUser.id);
        const targetRecWallet = targetRecWallets.find((w) => w.currency === params.destinationCurrency);
        if (targetRecWallet) {
          SocketService.broadcastToUser(recipientUser.id, {
            type: 'WALLET_UPDATED',
            payload: targetRecWallet,
          });
        }
        const recTxn = await db.transactions.get(`${txnId}_REC`);
        if (recTxn) {
          SocketService.broadcastToUser(recipientUser.id, {
            type: 'TRANSACTION_CREATED',
            payload: recTxn,
          });
        }
        const recNotif = await db.notifications.get(`notif_${Date.now()}_rec`);
        if (recNotif) {
          SocketService.broadcastToUser(recipientUser.id, {
            type: 'NOTIFICATION_CREATED',
            payload: recNotif,
          });
        }

        // Dispatch Email and Mobile SMS alerts to counterparty recipient
        const finalRecTxn = recTxn || receiveTxn;
        if (finalRecTxn) {
          NotificationDispatchService.dispatchTransactionAlerts(finalRecTxn, recipientUser, {
            walletBalance: targetRecWallet?.balance ?? recipientWallet?.balance,
            currency: params.destinationCurrency,
            counterpartyName: senderUser?.phone || senderUser?.fullName || 'DBS Bank Customer',
            counterpartyEmail: senderUser?.email,
          }).catch((err) => console.warn('Recipient notification dispatch error:', err));
        }
      }

      // 10. Dispatch Email and Mobile SMS alerts to sender
      if (senderUser) {
        NotificationDispatchService.dispatchTransactionAlerts(newTxn, senderUser, {
          walletBalance: sourceWallet.balance,
          currency: params.sourceCurrency,
          counterpartyName: recipientUser?.phone || newTxn.recipientName,
          counterpartyEmail: newTxn.recipientEmail,
        }).catch((err) => console.warn('Sender notification dispatch error:', err));
      }
    } catch (wsErr) {
      console.warn('WebSocket broadcast error (non-fatal):', wsErr);
    }

    return newTxn;
  }
}
