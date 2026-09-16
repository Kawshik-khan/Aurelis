import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import {
  CardEntity,
  FXRateLock,
  LedgerEntryEntity,
  NotificationEntity,
  PaymentRequestEntity,
  RecipientEntity,
  TransactionEntity,
  UserEntity,
  WalletEntity,
} from '../types';
import { SQLITE_PRAGMAS, SQLITE_SCHEMA } from './sqliteSchema';

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
const DB_FILE = path.join(DATA_DIR, 'aurelis.db');

export class SQLiteDatabaseEngine {
  private db: DatabaseSync;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    this.db = new DatabaseSync(DB_FILE);
    this.init();
  }

  private init() {
    this.db.exec(SQLITE_PRAGMAS);
    this.db.exec(SQLITE_SCHEMA);
    console.log(`[AURELIS-SQLITE] Production SQLite database initialized at ${DB_FILE}`);
  }

  public getRawDb(): DatabaseSync {
    return this.db;
  }

  public transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      const result = fn();
      this.db.exec('COMMIT;');
      return result;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  // ==========================================
  // USERS REPOSITORY
  // ==========================================
  public users = {
    get: (idOrEmailOrTag: string): UserEntity | undefined => {
      if (!idOrEmailOrTag) return undefined;
      const clean = idOrEmailOrTag.toLowerCase().trim();
      const cleanTag = clean.startsWith('@') ? clean : `@${clean}`;

      const stmt = this.db.prepare(`
        SELECT * FROM users 
        WHERE LOWER(id) = ? 
           OR LOWER(email) = ? 
           OR LOWER(aurelis_tag) = ? 
           OR LOWER(full_name) = ?
        LIMIT 1
      `);
      const row = stmt.get(clean, clean, cleanTag, clean) as any;
      return row ? this.mapRowToUser(row) : undefined;
    },

    has: (idOrEmail: string): boolean => {
      if (!idOrEmail) return false;
      const clean = idOrEmail.toLowerCase().trim();
      const cleanTag = clean.startsWith('@') ? clean : `@${clean}`;
      const stmt = this.db.prepare(`
        SELECT 1 FROM users 
        WHERE LOWER(id) = ? OR LOWER(email) = ? OR LOWER(aurelis_tag) = ?
        LIMIT 1
      `);
      return Boolean(stmt.get(clean, clean, cleanTag));
    },

    set: (id: string, user: UserEntity): void => {
      const stmt = this.db.prepare(`
        INSERT INTO users (
          id, email, password_hash, full_name, phone, aurelis_tag,
          tier, base_currency, avatar, two_factor_enabled, two_factor_secret,
          biometric_enabled, passkey_enabled, address, transaction_pin,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          email = excluded.email,
          password_hash = excluded.password_hash,
          full_name = excluded.full_name,
          phone = excluded.phone,
          aurelis_tag = excluded.aurelis_tag,
          tier = excluded.tier,
          base_currency = excluded.base_currency,
          avatar = excluded.avatar,
          two_factor_enabled = excluded.two_factor_enabled,
          two_factor_secret = excluded.two_factor_secret,
          biometric_enabled = excluded.biometric_enabled,
          passkey_enabled = excluded.passkey_enabled,
          address = excluded.address,
          transaction_pin = excluded.transaction_pin,
          updated_at = excluded.updated_at
      `);

      stmt.run(
        user.id,
        user.email.toLowerCase().trim(),
        user.passwordHash,
        user.fullName,
        user.phone || null,
        user.aurelisTag,
        user.tier || 'Private Client',
        user.baseCurrency || 'USD',
        user.avatar || null,
        user.twoFactorEnabled ? 1 : 0,
        user.twoFactorSecret || null,
        user.biometricEnabled ? 1 : 0,
        user.passkeyEnabled ? 1 : 0,
        user.address ? JSON.stringify(user.address) : null,
        user.transactionPin || '1234',
        user.createdAt || new Date().toISOString(),
        user.updatedAt || new Date().toISOString()
      );
    },

    delete: (id: string): boolean => {
      const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
      const res = stmt.run(id);
      return (res as any)?.changes > 0;
    },

    values: (): UserEntity[] => {
      const stmt = this.db.prepare('SELECT * FROM users ORDER BY created_at ASC');
      const rows = stmt.all() as any[];
      return rows.map((r) => this.mapRowToUser(r));
    },

    count: (): number => {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM users');
      const res = stmt.get() as any;
      return Number(res?.count || 0);
    },
  };

  private mapRowToUser(row: any): UserEntity {
    let address = { street: '', city: '', country: '', postalCode: '' };
    if (row.address) {
      try {
        address = JSON.parse(row.address);
      } catch {
        // ignore
      }
    }

    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      fullName: row.full_name,
      phone: row.phone || '',
      aurelisTag: row.aurelis_tag,
      tier: row.tier,
      baseCurrency: row.base_currency,
      avatar: row.avatar || '',
      twoFactorEnabled: Boolean(row.two_factor_enabled),
      twoFactorSecret: row.two_factor_secret || undefined,
      biometricEnabled: Boolean(row.biometric_enabled),
      passkeyEnabled: Boolean(row.passkey_enabled),
      address,
      transactionPin: row.transaction_pin || '1234',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ==========================================
  // WALLETS REPOSITORY
  // ==========================================
  public wallets = {
    get: (id: string): WalletEntity | undefined => {
      const stmt = this.db.prepare('SELECT * FROM wallets WHERE id = ? LIMIT 1');
      const row = stmt.get(id) as any;
      return row ? this.mapRowToWallet(row) : undefined;
    },

    set: (id: string, wallet: WalletEntity): void => {
      const stmt = this.db.prepare(`
        INSERT INTO wallets (
          id, user_id, currency, balance, pending_balance,
          account_number, routing_number, iban, bic, is_primary,
          status, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          balance = excluded.balance,
          pending_balance = excluded.pending_balance,
          account_number = excluded.account_number,
          routing_number = excluded.routing_number,
          iban = excluded.iban,
          bic = excluded.bic,
          is_primary = excluded.is_primary,
          status = excluded.status,
          updated_at = excluded.updated_at
      `);

      stmt.run(
        wallet.id,
        wallet.userId,
        wallet.currency,
        Number(wallet.balance) || 0,
        Number(wallet.pendingBalance) || 0,
        wallet.accountNumber,
        wallet.routingNumber || null,
        wallet.iban || null,
        wallet.bic,
        wallet.isPrimary ? 1 : 0,
        wallet.status || 'ACTIVE',
        wallet.createdAt || new Date().toISOString(),
        wallet.updatedAt || new Date().toISOString()
      );
    },

    delete: (id: string): boolean => {
      const stmt = this.db.prepare('DELETE FROM wallets WHERE id = ?');
      const res = stmt.run(id);
      return (res as any)?.changes > 0;
    },

    values: (): WalletEntity[] => {
      const stmt = this.db.prepare('SELECT * FROM wallets ORDER BY created_at ASC');
      const rows = stmt.all() as any[];
      return rows.map((r) => this.mapRowToWallet(r));
    },

    findByUser: (userId: string): WalletEntity[] => {
      const stmt = this.db.prepare('SELECT * FROM wallets WHERE user_id = ? ORDER BY is_primary DESC, created_at ASC');
      const rows = stmt.all(userId) as any[];
      return rows.map((r) => this.mapRowToWallet(r));
    },

    getByUserId: (userId: string): WalletEntity[] => {
      return this.wallets.findByUser(userId);
    },
  };

  private mapRowToWallet(row: any): WalletEntity {
    return {
      id: row.id,
      userId: row.user_id,
      currency: row.currency,
      balance: Number(row.balance),
      pendingBalance: Number(row.pending_balance),
      accountNumber: row.account_number,
      routingNumber: row.routing_number || undefined,
      iban: row.iban || undefined,
      bic: row.bic,
      isPrimary: Boolean(row.is_primary),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ==========================================
  // RECIPIENTS REPOSITORY
  // ==========================================
  public recipients = {
    get: (id: string): RecipientEntity | undefined => {
      const stmt = this.db.prepare('SELECT * FROM recipients WHERE id = ? LIMIT 1');
      const row = stmt.get(id) as any;
      return row ? this.mapRowToRecipient(row) : undefined;
    },

    set: (id: string, r: RecipientEntity): void => {
      const stmt = this.db.prepare(`
        INSERT INTO recipients (
          id, user_id, name, email, phone, avatar,
          currency, bank_name, account_number, routing_or_iban,
          aurelis_tag, last_transfer_date, is_favorite, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          email = excluded.email,
          phone = excluded.phone,
          avatar = excluded.avatar,
          currency = excluded.currency,
          bank_name = excluded.bank_name,
          account_number = excluded.account_number,
          routing_or_iban = excluded.routing_or_iban,
          aurelis_tag = excluded.aurelis_tag,
          last_transfer_date = excluded.last_transfer_date,
          is_favorite = excluded.is_favorite
      `);

      stmt.run(
        r.id,
        r.userId,
        r.name,
        r.email.toLowerCase().trim(),
        r.phone || null,
        r.avatar || null,
        r.currency,
        r.bankName,
        r.accountNumber,
        r.routingOrIban,
        r.aurelisTag || null,
        r.lastTransferDate || null,
        r.isFavorite ? 1 : 0,
        r.createdAt || new Date().toISOString()
      );
    },

    delete: (id: string): boolean => {
      const stmt = this.db.prepare('DELETE FROM recipients WHERE id = ?');
      const res = stmt.run(id);
      return (res as any)?.changes > 0;
    },

    values: (): RecipientEntity[] => {
      const stmt = this.db.prepare('SELECT * FROM recipients ORDER BY created_at DESC');
      const rows = stmt.all() as any[];
      return rows.map((r) => this.mapRowToRecipient(r));
    },

    findByUser: (userId: string): RecipientEntity[] => {
      const stmt = this.db.prepare('SELECT * FROM recipients WHERE user_id = ? ORDER BY is_favorite DESC, created_at DESC');
      const rows = stmt.all(userId) as any[];
      return rows.map((r) => this.mapRowToRecipient(r));
    },

    getByUserId: (userId: string): RecipientEntity[] => {
      return this.recipients.findByUser(userId);
    },
  };

  private mapRowToRecipient(row: any): RecipientEntity {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      email: row.email,
      phone: row.phone || undefined,
      avatar: row.avatar || undefined,
      currency: row.currency,
      bankName: row.bank_name,
      accountNumber: row.account_number,
      routingOrIban: row.routing_or_iban,
      aurelisTag: row.aurelis_tag || undefined,
      lastTransferDate: row.last_transfer_date || undefined,
      isFavorite: Boolean(row.is_favorite),
      createdAt: row.created_at,
    };
  }

  // ==========================================
  // TRANSACTIONS REPOSITORY
  // ==========================================
  public transactions = {
    get: (id: string): TransactionEntity | undefined => {
      const stmt = this.db.prepare('SELECT * FROM transactions WHERE id = ? LIMIT 1');
      const row = stmt.get(id) as any;
      return row ? this.mapRowToTransaction(row) : undefined;
    },

    set: (id: string, t: TransactionEntity): void => {
      const stmt = this.db.prepare(`
        INSERT INTO transactions (
          id, user_id, type, amount, currency,
          source_currency, destination_currency, destination_amount, exchange_rate,
          fee, total_charged, source_wallet_id, dest_wallet_id,
          recipient_id, recipient_name, recipient_email, recipient_avatar, recipient_aurelis_tag,
          sender_name, payment_method, status, date,
          reference, category, idempotency_key, receipt_signature, created_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          status = excluded.status,
          receipt_signature = excluded.receipt_signature
      `);

      stmt.run(
        t.id,
        t.userId,
        t.type,
        Number(t.amount),
        t.currency,
        t.sourceCurrency || null,
        t.destinationCurrency || null,
        t.destinationAmount !== undefined ? Number(t.destinationAmount) : null,
        t.exchangeRate !== undefined ? Number(t.exchangeRate) : null,
        Number(t.fee) || 0,
        Number(t.totalCharged) || Number(t.amount),
        t.sourceWalletId || null,
        t.destWalletId || null,
        t.recipientId || null,
        t.recipientName || null,
        t.recipientEmail || null,
        t.recipientAvatar || null,
        t.recipientAurelisTag || null,
        t.senderName || null,
        t.paymentMethod,
        t.status || 'Completed',
        t.date || new Date().toISOString(),
        t.reference || null,
        t.category || 'Transfer',
        t.idempotencyKey || null,
        t.receiptSignature || null,
        new Date().toISOString()
      );
    },

    delete: (id: string): boolean => {
      const stmt = this.db.prepare('DELETE FROM transactions WHERE id = ?');
      const res = stmt.run(id);
      return (res as any)?.changes > 0;
    },

    values: (): TransactionEntity[] => {
      const stmt = this.db.prepare('SELECT * FROM transactions ORDER BY date DESC');
      const rows = stmt.all() as any[];
      return rows.map((r) => this.mapRowToTransaction(r));
    },

    findByUser: (userId: string): TransactionEntity[] => {
      const stmt = this.db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC');
      const rows = stmt.all(userId) as any[];
      return rows.map((r) => this.mapRowToTransaction(r));
    },

    getByUserId: (userId: string): TransactionEntity[] => {
      return this.transactions.findByUser(userId);
    },

    findByIdempotencyKey: (key: string): TransactionEntity | undefined => {
      if (!key) return undefined;
      const stmt = this.db.prepare('SELECT * FROM transactions WHERE idempotency_key = ? LIMIT 1');
      const row = stmt.get(key) as any;
      return row ? this.mapRowToTransaction(row) : undefined;
    },
  };

  private mapRowToTransaction(row: any): TransactionEntity {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      amount: Number(row.amount),
      currency: row.currency,
      sourceCurrency: row.source_currency || undefined,
      destinationCurrency: row.destination_currency || undefined,
      destinationAmount: row.destination_amount !== null ? Number(row.destination_amount) : undefined,
      exchangeRate: row.exchange_rate !== null ? Number(row.exchange_rate) : undefined,
      fee: Number(row.fee),
      totalCharged: Number(row.total_charged),
      sourceWalletId: row.source_wallet_id || undefined,
      destWalletId: row.dest_wallet_id || undefined,
      recipientId: row.recipient_id || undefined,
      recipientName: row.recipient_name || undefined,
      recipientEmail: row.recipient_email || undefined,
      recipientAvatar: row.recipient_avatar || undefined,
      recipientAurelisTag: row.recipient_aurelis_tag || undefined,
      senderName: row.sender_name || undefined,
      paymentMethod: row.payment_method,
      status: row.status,
      date: row.date,
      reference: row.reference || undefined,
      category: row.category || 'Transfer',
      idempotencyKey: row.idempotency_key || undefined,
      receiptSignature: row.receipt_signature || undefined,
    };
  }

  // ==========================================
  // CARDS REPOSITORY
  // ==========================================
  public cards = {
    get: (id: string): CardEntity | undefined => {
      const stmt = this.db.prepare('SELECT * FROM cards WHERE id = ? LIMIT 1');
      const row = stmt.get(id) as any;
      return row ? this.mapRowToCard(row) : undefined;
    },

    set: (id: string, c: CardEntity): void => {
      const stmt = this.db.prepare(`
        INSERT INTO cards (
          id, user_id, type, tier, card_number, masked_number,
          holder_name, expiry, cvv, is_frozen, is_primary,
          monthly_limit, current_spent, contactless_enabled,
          online_purchases_enabled, atm_withdrawals_enabled, pin, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          tier = excluded.tier,
          is_frozen = excluded.is_frozen,
          is_primary = excluded.is_primary,
          monthly_limit = excluded.monthly_limit,
          current_spent = excluded.current_spent,
          contactless_enabled = excluded.contactless_enabled,
          online_purchases_enabled = excluded.online_purchases_enabled,
          atm_withdrawals_enabled = excluded.atm_withdrawals_enabled,
          pin = excluded.pin
      `);

      stmt.run(
        c.id,
        c.userId,
        c.type,
        c.tier,
        c.cardNumber,
        c.maskedNumber,
        c.holderName,
        c.expiry,
        c.cvv,
        c.isFrozen ? 1 : 0,
        c.isPrimary ? 1 : 0,
        Number(c.monthlyLimit) || 25000,
        Number(c.currentSpent) || 0,
        c.contactlessEnabled ? 1 : 0,
        c.onlinePurchasesEnabled ? 1 : 0,
        c.atmWithdrawalsEnabled ? 1 : 0,
        c.pin || null,
        c.createdAt || new Date().toISOString()
      );
    },

    delete: (id: string): boolean => {
      const stmt = this.db.prepare('DELETE FROM cards WHERE id = ?');
      const res = stmt.run(id);
      return (res as any)?.changes > 0;
    },

    values: (): CardEntity[] => {
      const stmt = this.db.prepare('SELECT * FROM cards ORDER BY created_at DESC');
      const rows = stmt.all() as any[];
      return rows.map((r) => this.mapRowToCard(r));
    },

    findByUser: (userId: string): CardEntity[] => {
      const stmt = this.db.prepare('SELECT * FROM cards WHERE user_id = ? ORDER BY is_primary DESC, created_at DESC');
      const rows = stmt.all(userId) as any[];
      return rows.map((r) => this.mapRowToCard(r));
    },

    getByUserId: (userId: string): CardEntity[] => {
      return this.cards.findByUser(userId);
    },
  };

  private mapRowToCard(row: any): CardEntity {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      tier: row.tier,
      cardNumber: row.card_number,
      maskedNumber: row.masked_number,
      holderName: row.holder_name,
      expiry: row.expiry,
      cvv: row.cvv,
      isFrozen: Boolean(row.is_frozen),
      isPrimary: Boolean(row.is_primary),
      monthlyLimit: Number(row.monthly_limit),
      currentSpent: Number(row.current_spent),
      contactlessEnabled: Boolean(row.contactless_enabled),
      onlinePurchasesEnabled: Boolean(row.online_purchases_enabled),
      atmWithdrawalsEnabled: Boolean(row.atm_withdrawals_enabled),
      pin: row.pin || '',
      createdAt: row.created_at,
    };
  }

  // ==========================================
  // NOTIFICATIONS REPOSITORY
  // ==========================================
  public notifications = {
    get: (id: string): NotificationEntity | undefined => {
      const stmt = this.db.prepare('SELECT * FROM notifications WHERE id = ? LIMIT 1');
      const row = stmt.get(id) as any;
      return row ? this.mapRowToNotification(row) : undefined;
    },

    set: (id: string, n: NotificationEntity): void => {
      const stmt = this.db.prepare(`
        INSERT INTO notifications (
          id, user_id, title, description, type,
          timestamp, is_read, linked_txn_id, created_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          is_read = excluded.is_read
      `);

      stmt.run(
        n.id,
        n.userId,
        n.title,
        n.description,
        n.type,
        n.timestamp || 'Just now',
        n.isRead ? 1 : 0,
        n.linkedTxnId || null,
        new Date().toISOString()
      );
    },

    delete: (id: string): boolean => {
      const stmt = this.db.prepare('DELETE FROM notifications WHERE id = ?');
      const res = stmt.run(id);
      return (res as any)?.changes > 0;
    },

    values: (): NotificationEntity[] => {
      const stmt = this.db.prepare('SELECT * FROM notifications ORDER BY created_at DESC');
      const rows = stmt.all() as any[];
      return rows.map((r) => this.mapRowToNotification(r));
    },

    findByUser: (userId: string): NotificationEntity[] => {
      const stmt = this.db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC');
      const rows = stmt.all(userId) as any[];
      return rows.map((r) => this.mapRowToNotification(r));
    },

    getByUserId: (userId: string): NotificationEntity[] => {
      const stmt = this.db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC');
      const rows = stmt.all(userId) as any[];
      return rows.map((r) => this.mapRowToNotification(r));
    },
  };


  private mapRowToNotification(row: any): NotificationEntity {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      type: row.type,
      timestamp: row.timestamp,
      isRead: Boolean(row.is_read),
      linkedTxnId: row.linked_txn_id || undefined,
    };
  }

  // ==========================================
  // LEDGER ENTRIES REPOSITORY
  // ==========================================
  public ledgerEntries = {
    push: (entry: LedgerEntryEntity): void => {
      const stmt = this.db.prepare(`
        INSERT INTO ledger_entries (
          id, transaction_id, wallet_id, entry_type, amount, currency, balance_after, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);

      stmt.run(
        entry.id,
        entry.transactionId,
        entry.walletId,
        entry.entryType,
        Number(entry.amount),
        entry.currency,
        Number(entry.balanceAfter),
        entry.createdAt || new Date().toISOString()
      );
    },

    filter: (predicate: (e: LedgerEntryEntity) => boolean): LedgerEntryEntity[] => {
      const stmt = this.db.prepare('SELECT * FROM ledger_entries ORDER BY created_at ASC');
      const rows = (stmt.all() as any[]).map((r) => this.mapRowToLedger(r));
      return rows.filter(predicate);
    },

    findByWallet: (walletId: string): LedgerEntryEntity[] => {
      const stmt = this.db.prepare('SELECT * FROM ledger_entries WHERE wallet_id = ? ORDER BY created_at ASC');
      const rows = stmt.all(walletId) as any[];
      return rows.map((r) => this.mapRowToLedger(r));
    },

    values: (): LedgerEntryEntity[] => {
      const stmt = this.db.prepare('SELECT * FROM ledger_entries ORDER BY created_at ASC');
      const rows = stmt.all() as any[];
      return rows.map((r) => this.mapRowToLedger(r));
    },
  };

  private mapRowToLedger(row: any): LedgerEntryEntity {
    return {
      id: row.id,
      transactionId: row.transaction_id,
      walletId: row.wallet_id,
      entryType: row.entry_type,
      amount: Number(row.amount),
      currency: row.currency,
      balanceAfter: Number(row.balance_after),
      createdAt: row.created_at,
    };
  }

  // ==========================================
  // PAYMENT REQUESTS REPOSITORY
  // ==========================================
  public paymentRequests = {
    get: (idOrSlug: string): PaymentRequestEntity | undefined => {
      const stmt = this.db.prepare('SELECT * FROM payment_requests WHERE id = ? OR slug = ? LIMIT 1');
      const row = stmt.get(idOrSlug, idOrSlug) as any;
      return row ? this.mapRowToPaymentRequest(row) : undefined;
    },

    set: (id: string, p: PaymentRequestEntity): void => {
      const stmt = this.db.prepare(`
        INSERT INTO payment_requests (
          id, slug, user_id, amount, currency, recipient_email, message, status, created_at, expires_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          status = excluded.status
      `);

      stmt.run(
        p.id,
        p.slug,
        p.userId,
        Number(p.amount),
        p.currency,
        p.recipientEmail || null,
        p.message || null,
        p.status || 'PENDING',
        p.createdAt || new Date().toISOString(),
        p.expiresAt
      );
    },

    delete: (id: string): boolean => {
      const stmt = this.db.prepare('DELETE FROM payment_requests WHERE id = ?');
      const res = stmt.run(id);
      return (res as any)?.changes > 0;
    },

    values: (): PaymentRequestEntity[] => {
      const stmt = this.db.prepare('SELECT * FROM payment_requests ORDER BY created_at DESC');
      const rows = stmt.all() as any[];
      return rows.map((r) => this.mapRowToPaymentRequest(r));
    },
  };

  private mapRowToPaymentRequest(row: any): PaymentRequestEntity {
    return {
      id: row.id,
      slug: row.slug,
      userId: row.user_id,
      amount: Number(row.amount),
      currency: row.currency,
      recipientEmail: row.recipient_email || '',
      message: row.message || undefined,
      status: row.status,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  }

  // ==========================================
  // RATE LOCKS (In SQLite for zero-loss FX states)
  // ==========================================
  public rateLocks = {
    get: (quoteId: string): FXRateLock | undefined => {
      const stmt = this.db.prepare('SELECT * FROM rate_locks WHERE quote_id = ? LIMIT 1');
      const row = stmt.get(quoteId) as any;
      if (!row) return undefined;
      return {
        quoteId: row.quote_id,
        fromCurrency: row.from_currency,
        toCurrency: row.to_currency,
        rate: Number(row.rate),
        fromAmount: Number(row.from_amount),
        toAmount: Number(row.to_amount),
        fee: Number(row.fee),
        expiresAt: Number(row.expires_at),
      };
    },

    set: (quoteId: string, lock: FXRateLock): void => {
      const stmt = this.db.prepare(`
        INSERT INTO rate_locks (
          quote_id, from_currency, to_currency, rate, from_amount, to_amount, fee, expires_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(quote_id) DO UPDATE SET
          rate = excluded.rate,
          expires_at = excluded.expires_at
      `);
      stmt.run(
        lock.quoteId,
        lock.fromCurrency,
        lock.toCurrency,
        Number(lock.rate),
        Number(lock.fromAmount),
        Number(lock.toAmount),
        Number(lock.fee),
        Number(lock.expiresAt)
      );
    },

    delete: (quoteId: string): boolean => {
      const stmt = this.db.prepare('DELETE FROM rate_locks WHERE quote_id = ?');
      const res = stmt.run(quoteId);
      return (res as any)?.changes > 0;
    },
  };

  // ==========================================
  // IDEMPOTENCY STORE
  // ==========================================
  public idempotencyStore = {
    get: (key: string): { status: number; body: any; timestamp: number } | undefined => {
      const stmt = this.db.prepare('SELECT * FROM idempotency_store WHERE key = ? LIMIT 1');
      const row = stmt.get(key) as any;
      if (!row) return undefined;
      let body: any = {};
      try {
        body = JSON.parse(row.body);
      } catch {
        body = row.body;
      }
      return {
        status: Number(row.status),
        body,
        timestamp: Number(row.timestamp),
      };
    },

    set: (key: string, data: { status: number; body: any; timestamp: number }): void => {
      const stmt = this.db.prepare(`
        INSERT INTO idempotency_store (key, status, body, timestamp)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          status = excluded.status,
          body = excluded.body,
          timestamp = excluded.timestamp
      `);
      stmt.run(
        key,
        Number(data.status),
        typeof data.body === 'string' ? data.body : JSON.stringify(data.body),
        Number(data.timestamp)
      );
    },
  };
}
