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
    const exchangeRate = FXService.getRate(params.sourceCurrency, params.destinationCurrency);
    const destinationAmount = params.amount * exchangeRate;
    const txnId = this.generateTxnId();

    // 2. Prepare recipient wallet entity if internal DBS Bank recipient
    let recipientWalletId: string | undefined;
    if (recipientUser && recipientUser.id !== params.userId) {
      const recWallets = await db.wallets.findByUser(recipientUser.id);
      let targetRecWallet = recWallets.find((w) => w.currency === params.destinationCurrency);

      if (!targetRecWallet) {
        const newWalletId = `w_${params.destinationCurrency.toLowerCase()}_${Date.now()}`;
        targetRecWallet = {
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
        await db.wallets.set(newWalletId, targetRecWallet);
      }
      recipientWalletId = targetRecWallet.id;
    }

    const walletIdsToLock = [sourceWallet.id];
    if (recipientWalletId) {
      walletIdsToLock.push(recipientWalletId);
    }

    // 3. Prepare Sender Transaction Entity
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

    // 4. Prepare Recipient Transaction Entity if applicable
    let receiveTxn: TransactionEntity | undefined;
    if (recipientUser && recipientUser.id !== params.userId && recipientWalletId) {
      receiveTxn = {
        id: `${txnId}_REC`,
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
        sourceWalletId: sourceWallet.id,
        destWalletId: recipientWalletId,
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
    }

    // =========================================================================
    // 5. ATOMIC EXECUTION WITH PESSIMISTIC ROW LOCKS (FOR UPDATE) & DOUBLE-ENTRY
    // =========================================================================
    let sourceWalletFresh: WalletEntity = sourceWallet;
    let recipientWalletFresh: WalletEntity | undefined;

    await db.engine.transaction(async (client) => {
      // 5a. Acquire pessimistic row locks on all involved wallets
      const lockedMap = await db.engine.getWalletsForUpdate(client, walletIdsToLock);
      const lockedSource = lockedMap.get(sourceWallet.id);
      if (!lockedSource) {
        throw new Error(`Source wallet ${sourceWallet.id} could not be locked for settlement.`);
      }

      // 5b. Strict in-lock balance check (eliminates race condition double-spending)
      if (Number(lockedSource.balance) < totalCharged) {
        throw new Error(
          `Insufficient funds in ${params.sourceCurrency} wallet. Balance: ${Number(lockedSource.balance).toFixed(2)}, Required: ${totalCharged.toFixed(2)}`
        );
      }

      const senderBalanceAfter = Number((Number(lockedSource.balance) - totalCharged).toFixed(4));
      sourceWalletFresh = await db.engine.updateWalletBalanceTx(
        client,
        lockedSource.id,
        senderBalanceAfter
      );

      // 5c. Persist sender transaction & double-entry DEBIT ledger
      await db.engine.insertTransactionTx(client, newTxn);
      await db.engine.insertLedgerEntryTx(client, {
        id: `led_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        transactionId: newTxn.id,
        walletId: lockedSource.id,
        entryType: 'DEBIT',
        amount: totalCharged,
        currency: params.sourceCurrency,
        balanceAfter: senderBalanceAfter,
        createdAt: new Date().toISOString(),
      });

      // 5d. Credit recipient wallet & persist receive transaction + double-entry CREDIT ledger
      if (recipientWalletId && receiveTxn) {
        const lockedRec = lockedMap.get(recipientWalletId);
        if (!lockedRec) {
          throw new Error(`Recipient wallet ${recipientWalletId} could not be locked for settlement.`);
        }

        const recBalanceAfter = Number((Number(lockedRec.balance) + destinationAmount).toFixed(4));
        recipientWalletFresh = await db.engine.updateWalletBalanceTx(
          client,
          lockedRec.id,
          recBalanceAfter
        );

        await db.engine.insertTransactionTx(client, receiveTxn);
        await db.engine.insertLedgerEntryTx(client, {
          id: `led_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          transactionId: receiveTxn.id,
          walletId: lockedRec.id,
          entryType: 'CREDIT',
          amount: destinationAmount,
          currency: params.destinationCurrency,
          balanceAfter: recBalanceAfter,
          createdAt: new Date().toISOString(),
        });
      }
    });

    // Update local references to fresh committed state
    let recipientWallet: WalletEntity | undefined = recipientWalletFresh;

    if (recipientUser && recipientUser.id !== params.userId && receiveTxn) {
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
        payload: sourceWalletFresh,
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
          walletBalance: sourceWalletFresh.balance,
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
