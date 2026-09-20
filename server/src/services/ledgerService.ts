import { db } from '../db/database';
import { CurrencyCode, LedgerEntryEntity } from '../types';

export class LedgerService {
  /**
   * Record a double-entry or single-entry audit event in the immutable financial ledger.
   */
  public static async recordEntry(params: {
    transactionId: string;
    walletId: string;
    entryType: 'DEBIT' | 'CREDIT';
    amount: number;
    currency: CurrencyCode;
    balanceAfter: number;
  }): Promise<LedgerEntryEntity> {
    const entry: LedgerEntryEntity = {
      id: `led_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      transactionId: params.transactionId,
      walletId: params.walletId,
      entryType: params.entryType,
      amount: params.amount,
      currency: params.currency,
      balanceAfter: params.balanceAfter,
      createdAt: new Date().toISOString(),
    };

    await db.ledgerEntries.push(entry);
    db.scheduleSave();
    return entry;
  }

  /**
   * Fetch all ledger movements for a specific wallet
   */
  public static async getWalletLedger(walletId: string): Promise<LedgerEntryEntity[]> {
    return db.ledgerEntries.findByWallet(walletId);
  }

  /**
   * Audit ledger balance integrity validation against actual PostgreSQL records.
   * Derives mathematical net balance from SUM(CREDITS) - SUM(DEBITS) and compares to current wallet balance.
   */
  public static async verifyLedgerIntegrity(
    walletId: string,
    currentBalance?: number
  ): Promise<{ valid: boolean; calculatedBalance: number; actualBalance: number; discrepancy: number }> {
    const entries = await this.getWalletLedger(walletId);
    let calculated = 0;

    for (const e of entries) {
      if (e.entryType === 'CREDIT') {
        calculated += Number(e.amount);
      } else {
        calculated -= Number(e.amount);
      }
    }

    calculated = Number(calculated.toFixed(4));

    let actual = currentBalance;
    if (actual === undefined) {
      const wallet = await db.wallets.get(walletId);
      actual = wallet ? Number(wallet.balance) : 0;
    }

    const discrepancy = Number(Math.abs(calculated - actual).toFixed(4));
    const valid = discrepancy < 0.0001;

    return {
      valid,
      calculatedBalance: calculated,
      actualBalance: actual,
      discrepancy,
    };
  }
}
