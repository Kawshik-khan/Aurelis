import { Pool, PoolClient } from 'pg';
import {
  CardEntity,
  DispatchedAlertEntity,
  FXRateLock,
  LedgerEntryEntity,
  NotificationEntity,
  PaymentRequestEntity,
  RecipientEntity,
  TransactionEntity,
  UserEntity,
  WalletEntity,
} from '../types';
import { NEON_POSTGRES_SCHEMA } from './neonSchema';

export class PostgresDatabaseEngine {
  private pool: Pool;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(connectionString: string) {
    const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    this.pool = new Pool({
      connectionString,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    this.pool.on('error', (err) => {
      console.error('[AURELIS-POSTGRES] Unexpected client error in pool:', err);
    });
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        console.log('[AURELIS-POSTGRES] Connecting to Neon PostgreSQL and synchronizing schema...');
        await this.pool.query(NEON_POSTGRES_SCHEMA);
        this.isInitialized = true;
        console.log('[AURELIS-POSTGRES] Schema successfully verified & online.');
      } catch (err) {
        console.error('[AURELIS-POSTGRES] Error initializing Neon schema:', err);
        throw err;
      }
    })();

    return this.initPromise;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    await this.init();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN;');
      const result = await fn(client);
      await client.query('COMMIT;');
      return result;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Pessimistic row-level lock on multiple wallets, sorted by ID to prevent deadlocks.
   */
  public async getWalletsForUpdate(
    client: PoolClient,
    walletIds: string[]
  ): Promise<Map<string, WalletEntity>> {
    if (!walletIds || walletIds.length === 0) return new Map();
    const uniqueSorted = [...new Set(walletIds)].sort();
    const res = await client.query(
      `SELECT * FROM wallets WHERE id = ANY($1::text[]) FOR UPDATE`,
      [uniqueSorted]
    );
    const map = new Map<string, WalletEntity>();
    for (const row of res.rows) {
      map.set(row.id, this.mapRowToWallet(row));
    }
    return map;
  }

  /**
   * Pessimistic row-level lock on a single wallet.
   */
  public async getWalletForUpdate(
    client: PoolClient,
    walletId: string
  ): Promise<WalletEntity | undefined> {
    const res = await client.query(
      `SELECT * FROM wallets WHERE id = $1 LIMIT 1 FOR UPDATE`,
      [walletId]
    );
    return res.rows[0] ? this.mapRowToWallet(res.rows[0]) : undefined;
  }

  /**
   * Atomic wallet balance update inside a transaction.
   */
  public async updateWalletBalanceTx(
    client: PoolClient,
    walletId: string,
    balance: number,
    pendingBalance?: number
  ): Promise<WalletEntity> {
    const updatedAt = new Date().toISOString();
    const res = await client.query(
      `UPDATE wallets 
       SET balance = $1, 
           pending_balance = COALESCE($2, pending_balance),
           updated_at = $3
       WHERE id = $4
       RETURNING *`,
      [Number(balance), pendingBalance !== undefined ? Number(pendingBalance) : null, updatedAt, walletId]
    );
    if (!res.rows[0]) {
      throw new Error(`Wallet ${walletId} not found during atomic update.`);
    }
    return this.mapRowToWallet(res.rows[0]);
  }

  /**
   * Atomic transaction record insertion inside a database transaction.
   */
  public async insertTransactionTx(client: PoolClient, t: TransactionEntity): Promise<void> {
    const query = `
      INSERT INTO transactions (
        id, user_id, type, amount, currency,
        source_currency, destination_currency, destination_amount, exchange_rate, fee,
        total_charged, source_wallet_id, dest_wallet_id, recipient_id, recipient_name,
        recipient_email, recipient_avatar, recipient_aurelis_tag, sender_name, payment_method,
        status, date, reference, category, idempotency_key, receipt_signature, created_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27
      )
      ON CONFLICT(id) DO UPDATE SET
        status = EXCLUDED.status,
        destination_amount = EXCLUDED.destination_amount,
        receipt_signature = EXCLUDED.receipt_signature
    `;

    await client.query(query, [
      t.id,
      t.userId,
      t.type,
      Number(t.amount),
      t.currency,
      t.sourceCurrency || null,
      t.destinationCurrency || null,
      t.destinationAmount ? Number(t.destinationAmount) : null,
      t.exchangeRate ? Number(t.exchangeRate) : null,
      Number(t.fee || 0),
      Number(t.totalCharged),
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
      t.date ? new Date(t.date).toISOString() : new Date().toISOString(),
      t.reference || null,
      t.category || 'Transfer',
      t.idempotencyKey || null,
      t.receiptSignature || null,
      t.createdAt || new Date().toISOString(),
    ]);
  }

  /**
   * Atomic double-entry ledger insertion inside a database transaction.
   */
  public async insertLedgerEntryTx(client: PoolClient, entry: LedgerEntryEntity): Promise<void> {
    const query = `
      INSERT INTO ledger_entries (
        id, transaction_id, wallet_id, entry_type, amount, currency, balance_after, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      )
    `;

    await client.query(query, [
      entry.id,
      entry.transactionId,
      entry.walletId,
      entry.entryType,
      Number(entry.amount),
      entry.currency,
      Number(entry.balanceAfter),
      entry.createdAt ? new Date(entry.createdAt).toISOString() : new Date().toISOString(),
    ]);
  }

  // ==========================================
  // USERS REPOSITORY
  // ==========================================
  public users = {
    get: async (idOrEmailOrTag: string): Promise<UserEntity | undefined> => {
      if (!idOrEmailOrTag) return undefined;
      await this.init();
      const clean = idOrEmailOrTag.toLowerCase().trim();
      const cleanTag = clean.startsWith('@') ? clean : `@${clean}`;

      const res = await this.pool.query(
        `SELECT * FROM users 
         WHERE LOWER(id) = $1 
            OR LOWER(email) = $1 
            OR LOWER(aurelis_tag) = $2
            OR LOWER(full_name) = $1
         LIMIT 1`,
        [clean, cleanTag]
      );
      return res.rows[0] ? this.mapRowToUser(res.rows[0]) : undefined;
    },

    has: async (idOrEmail: string): Promise<boolean> => {
      if (!idOrEmail) return false;
      await this.init();
      const clean = idOrEmail.toLowerCase().trim();
      const cleanTag = clean.startsWith('@') ? clean : `@${clean}`;

      const res = await this.pool.query(
        `SELECT 1 FROM users 
         WHERE LOWER(id) = $1 OR LOWER(email) = $1 OR LOWER(aurelis_tag) = $2
         LIMIT 1`,
        [clean, cleanTag]
      );
      return (res.rowCount || 0) > 0;
    },

    set: async (id: string, user: UserEntity): Promise<void> => {
      await this.init();
      const query = `
        INSERT INTO users (
          id, email, password_hash, full_name, phone, phone_number, aurelis_tag, dbs_tag,
          tier, base_currency, avatar, avatar_url, two_factor_enabled, two_factor_secret,
          biometric_enabled, passkey_enabled, address, street_address, city, country, postal_code,
          transaction_pin, email_alerts_enabled, sms_alerts_enabled,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21,
          $22, $23, $24,
          $25, $26
        )
        ON CONFLICT(id) DO UPDATE SET
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone,
          phone_number = EXCLUDED.phone_number,
          aurelis_tag = EXCLUDED.aurelis_tag,
          dbs_tag = EXCLUDED.dbs_tag,
          tier = EXCLUDED.tier,
          base_currency = EXCLUDED.base_currency,
          avatar = EXCLUDED.avatar,
          avatar_url = EXCLUDED.avatar_url,
          two_factor_enabled = EXCLUDED.two_factor_enabled,
          two_factor_secret = EXCLUDED.two_factor_secret,
          biometric_enabled = EXCLUDED.biometric_enabled,
          passkey_enabled = EXCLUDED.passkey_enabled,
          address = EXCLUDED.address,
          street_address = EXCLUDED.street_address,
          city = EXCLUDED.city,
          country = EXCLUDED.country,
          postal_code = EXCLUDED.postal_code,
          transaction_pin = EXCLUDED.transaction_pin,
          email_alerts_enabled = EXCLUDED.email_alerts_enabled,
          sms_alerts_enabled = EXCLUDED.sms_alerts_enabled,
          updated_at = EXCLUDED.updated_at
      `;

      await this.pool.query(query, [
        user.id,
        user.email.toLowerCase().trim(),
        user.passwordHash,
        user.fullName,
        user.phone || null,
        user.phone || null,
        user.aurelisTag,
        user.aurelisTag,
        user.tier || null,
        user.baseCurrency || 'BDT',
        user.avatar || null,
        user.avatar || null,
        Boolean(user.twoFactorEnabled),
        user.twoFactorSecret || null,
        Boolean(user.biometricEnabled),
        Boolean(user.passkeyEnabled),
        user.address ? JSON.stringify(user.address) : null,
        user.address?.street || null,
        user.address?.city || null,
        user.address?.country || null,
        user.address?.postalCode || null,
        user.transactionPin || '1234',
        user.emailAlertsEnabled !== false,
        user.smsAlertsEnabled !== false,
        user.createdAt || new Date().toISOString(),
        user.updatedAt || new Date().toISOString(),
      ]);
    },

    delete: async (id: string): Promise<boolean> => {
      await this.init();
      const res = await this.pool.query('DELETE FROM users WHERE id = $1', [id]);
      return (res.rowCount || 0) > 0;
    },

    values: async (): Promise<UserEntity[]> => {
      await this.init();
      const res = await this.pool.query('SELECT * FROM users ORDER BY created_at ASC');
      return res.rows.map((r) => this.mapRowToUser(r));
    },

    count: async (): Promise<number> => {
      await this.init();
      const res = await this.pool.query('SELECT COUNT(*) as count FROM users');
      return Number(res.rows[0]?.count || 0);
    },
  };

  private mapRowToUser(row: any): UserEntity {
    let address = { street: '', city: '', country: '', postalCode: '' };
    if (row.address) {
      try {
        address = typeof row.address === 'string' ? JSON.parse(row.address) : row.address;
      } catch {
        // ignore
      }
    } else if (row.street_address || row.city || row.country || row.postal_code) {
      address = {
        street: row.street_address || '',
        city: row.city || '',
        country: row.country || '',
        postalCode: row.postal_code || '',
      };
    }

    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      fullName: row.full_name,
      phone: row.phone || row.phone_number || '',
      aurelisTag: row.dbs_tag || row.aurelis_tag || '',
      tier: row.tier || undefined,
      baseCurrency: row.base_currency || 'BDT',
      avatar: row.avatar || row.avatar_url || '',
      twoFactorEnabled: Boolean(row.two_factor_enabled),
      twoFactorSecret: row.two_factor_secret || undefined,
      biometricEnabled: Boolean(row.biometric_enabled),
      passkeyEnabled: Boolean(row.passkey_enabled),
      address,
      transactionPin: row.transaction_pin || '1234',
      emailAlertsEnabled: row.email_alerts_enabled !== false,
      smsAlertsEnabled: row.sms_alerts_enabled !== false,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    };
  }

  // ==========================================
  // WALLETS REPOSITORY
  // ==========================================
  public wallets = {
    get: async (id: string): Promise<WalletEntity | undefined> => {
      await this.init();
      const res = await this.pool.query('SELECT * FROM wallets WHERE id = $1 LIMIT 1', [id]);
      return res.rows[0] ? this.mapRowToWallet(res.rows[0]) : undefined;
    },

    set: async (id: string, wallet: WalletEntity): Promise<void> => {
      await this.init();
      const query = `
        INSERT INTO wallets (
          id, user_id, currency, balance, pending_balance,
          account_number, routing_number, iban, bic, is_primary,
          status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13
        )
        ON CONFLICT(id) DO UPDATE SET
          balance = EXCLUDED.balance,
          pending_balance = EXCLUDED.pending_balance,
          account_number = EXCLUDED.account_number,
          routing_number = EXCLUDED.routing_number,
          iban = EXCLUDED.iban,
          bic = EXCLUDED.bic,
          is_primary = EXCLUDED.is_primary,
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at
      `;

      await this.pool.query(query, [
        wallet.id,
        wallet.userId,
        wallet.currency,
        Number(wallet.balance) || 0,
        Number(wallet.pendingBalance) || 0,
        wallet.accountNumber,
        wallet.routingNumber || null,
        wallet.iban || null,
        wallet.bic,
        Boolean(wallet.isPrimary),
        wallet.status || 'ACTIVE',
        wallet.createdAt || new Date().toISOString(),
        wallet.updatedAt || new Date().toISOString(),
      ]);
    },

    delete: async (id: string): Promise<boolean> => {
      await this.init();
      const res = await this.pool.query('DELETE FROM wallets WHERE id = $1', [id]);
      return (res.rowCount || 0) > 0;
    },

    values: async (): Promise<WalletEntity[]> => {
      await this.init();
      const res = await this.pool.query('SELECT * FROM wallets ORDER BY created_at ASC');
      return res.rows.map((r) => this.mapRowToWallet(r));
    },

    findByUser: async (userId: string): Promise<WalletEntity[]> => {
      await this.init();
      const res = await this.pool.query(
        'SELECT * FROM wallets WHERE user_id = $1 ORDER BY is_primary DESC, created_at ASC',
        [userId]
      );
      return res.rows.map((r) => this.mapRowToWallet(r));
    },

    getByUserId: async (userId: string): Promise<WalletEntity[]> => {
      return this.wallets.findByUser(userId);
    },
  };

  private mapRowToWallet(row: any): WalletEntity {
    return {
      id: row.id,
      userId: row.user_id,
      currency: row.currency,
      balance: parseFloat(row.balance) || 0,
      pendingBalance: parseFloat(row.pending_balance) || 0,
      accountNumber: row.account_number,
      routingNumber: row.routing_number || undefined,
      iban: row.iban || undefined,
      bic: row.bic,
      isPrimary: Boolean(row.is_primary),
      status: row.status,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    };
  }

  // ==========================================
  // RECIPIENTS REPOSITORY
  // ==========================================
  public recipients = {
    get: async (id: string): Promise<RecipientEntity | undefined> => {
      await this.init();
      const res = await this.pool.query('SELECT * FROM recipients WHERE id = $1 LIMIT 1', [id]);
      return res.rows[0] ? this.mapRowToRecipient(res.rows[0]) : undefined;
    },

    set: async (id: string, rec: RecipientEntity): Promise<void> => {
      await this.init();
      const query = `
        INSERT INTO recipients (
          id, user_id, name, email, phone, avatar,
          currency, bank_name, account_number, routing_or_iban,
          aurelis_tag, is_favorite, last_transfer_date, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13, $14
        )
        ON CONFLICT(id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          avatar = EXCLUDED.avatar,
          currency = EXCLUDED.currency,
          bank_name = EXCLUDED.bank_name,
          account_number = EXCLUDED.account_number,
          routing_or_iban = EXCLUDED.routing_or_iban,
          aurelis_tag = EXCLUDED.aurelis_tag,
          is_favorite = EXCLUDED.is_favorite,
          last_transfer_date = EXCLUDED.last_transfer_date
      `;

      await this.pool.query(query, [
        rec.id,
        rec.userId,
        rec.name,
        rec.email.toLowerCase().trim(),
        rec.phone || null,
        rec.avatar || null,
        rec.currency,
        rec.bankName,
        rec.accountNumber,
        rec.routingOrIban,
        rec.aurelisTag || null,
        Boolean(rec.isFavorite),
        rec.lastTransferDate ? String(rec.lastTransferDate) : null,
        rec.createdAt || new Date().toISOString(),
      ]);
    },

    delete: async (id: string): Promise<boolean> => {
      await this.init();
      const res = await this.pool.query('DELETE FROM recipients WHERE id = $1', [id]);
      return (res.rowCount || 0) > 0;
    },

    values: async (): Promise<RecipientEntity[]> => {
      await this.init();
      const res = await this.pool.query('SELECT * FROM recipients ORDER BY created_at DESC');
      return res.rows.map((r) => this.mapRowToRecipient(r));
    },

    findByUser: async (userId: string): Promise<RecipientEntity[]> => {
      await this.init();
      const res = await this.pool.query(
        'SELECT * FROM recipients WHERE user_id = $1 ORDER BY is_favorite DESC, created_at DESC',
        [userId]
      );
      return res.rows.map((r) => this.mapRowToRecipient(r));
    },

    getByUserId: async (userId: string): Promise<RecipientEntity[]> => {
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
      lastTransferDate: row.last_transfer_date ? String(row.last_transfer_date) : undefined,
      isFavorite: Boolean(row.is_favorite),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };
  }

  // ==========================================
  // TRANSACTIONS REPOSITORY
  // ==========================================
  public transactions = {
    get: async (id: string): Promise<TransactionEntity | undefined> => {
      await this.init();
      const res = await this.pool.query('SELECT * FROM transactions WHERE id = $1 LIMIT 1', [id]);
      return res.rows[0] ? this.mapRowToTransaction(res.rows[0]) : undefined;
    },

    set: async (id: string, t: TransactionEntity): Promise<void> => {
      await this.init();
      const query = `
        INSERT INTO transactions (
          id, user_id, type, amount, currency,
          source_currency, destination_currency, destination_amount, exchange_rate, fee,
          total_charged, source_wallet_id, dest_wallet_id, recipient_id, recipient_name,
          recipient_email, recipient_avatar, recipient_aurelis_tag, sender_name, payment_method,
          status, date, reference, category, idempotency_key, receipt_signature, created_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27
        )
        ON CONFLICT(id) DO UPDATE SET
          status = EXCLUDED.status,
          destination_amount = EXCLUDED.destination_amount,
          receipt_signature = EXCLUDED.receipt_signature
      `;

      await this.pool.query(query, [
        t.id,
        t.userId,
        t.type,
        Number(t.amount),
        t.currency,
        t.sourceCurrency || null,
        t.destinationCurrency || null,
        t.destinationAmount ? Number(t.destinationAmount) : null,
        t.exchangeRate ? Number(t.exchangeRate) : null,
        Number(t.fee || 0),
        Number(t.totalCharged),
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
        t.date ? new Date(t.date).toISOString() : new Date().toISOString(),
        t.reference || null,
        t.category || 'Transfer',
        t.idempotencyKey || null,
        t.receiptSignature || null,
        t.createdAt || new Date().toISOString(),
      ]);
    },

    delete: async (id: string): Promise<boolean> => {
      await this.init();
      const res = await this.pool.query('DELETE FROM transactions WHERE id = $1', [id]);
      return (res.rowCount || 0) > 0;
    },

    values: async (): Promise<TransactionEntity[]> => {
      await this.init();
      const res = await this.pool.query('SELECT * FROM transactions ORDER BY date DESC');
      return res.rows.map((r) => this.mapRowToTransaction(r));
    },

    findByUser: async (userId: string): Promise<TransactionEntity[]> => {
      await this.init();
      const res = await this.pool.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC', [userId]);
      return res.rows.map((r) => this.mapRowToTransaction(r));
    },

    getByUserId: async (userId: string): Promise<TransactionEntity[]> => {
      return this.transactions.findByUser(userId);
    },

    findByIdempotencyKey: async (key: string): Promise<TransactionEntity | undefined> => {
      if (!key) return undefined;
      await this.init();
      const res = await this.pool.query('SELECT * FROM transactions WHERE idempotency_key = $1 LIMIT 1', [key]);
      return res.rows[0] ? this.mapRowToTransaction(res.rows[0]) : undefined;
    },
  };

  private mapRowToTransaction(row: any): TransactionEntity {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      amount: parseFloat(row.amount) || 0,
      currency: row.currency,
      sourceCurrency: row.source_currency || undefined,
      destinationCurrency: row.destination_currency || undefined,
      destinationAmount: row.destination_amount ? parseFloat(row.destination_amount) : undefined,
      exchangeRate: row.exchange_rate ? parseFloat(row.exchange_rate) : undefined,
      fee: parseFloat(row.fee) || 0,
      totalCharged: parseFloat(row.total_charged) || 0,
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
      date: row.date ? new Date(row.date).toISOString() : new Date().toISOString(),
      reference: row.reference || undefined,
      category: row.category || 'Transfer',
      idempotencyKey: row.idempotency_key || undefined,
      receiptSignature: row.receipt_signature || undefined,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };
  }

  // ==========================================
  // CARDS REPOSITORY
  // ==========================================
  public cards = {
    get: async (id: string): Promise<CardEntity | undefined> => {
      await this.init();
      const res = await this.pool.query('SELECT * FROM cards WHERE id = $1 LIMIT 1', [id]);
      return res.rows[0] ? this.mapRowToCard(res.rows[0]) : undefined;
    },

    set: async (id: string, card: CardEntity): Promise<void> => {
      await this.init();
      const query = `
        INSERT INTO cards (
          id, user_id, type, tier, card_number, masked_number,
          holder_name, expiry, cvv, is_frozen, is_primary,
          monthly_limit, current_spent, contactless_enabled,
          online_purchases_enabled, atm_withdrawals_enabled, pin, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17, $18
        )
        ON CONFLICT(id) DO UPDATE SET
          is_frozen = EXCLUDED.is_frozen,
          is_primary = EXCLUDED.is_primary,
          monthly_limit = EXCLUDED.monthly_limit,
          current_spent = EXCLUDED.current_spent,
          contactless_enabled = EXCLUDED.contactless_enabled,
          online_purchases_enabled = EXCLUDED.online_purchases_enabled,
          atm_withdrawals_enabled = EXCLUDED.atm_withdrawals_enabled,
          pin = EXCLUDED.pin
      `;

      await this.pool.query(query, [
        card.id,
        card.userId,
        card.type,
        card.tier,
        card.cardNumber,
        card.maskedNumber,
        card.holderName,
        card.expiry,
        card.cvv,
        Boolean(card.isFrozen),
        Boolean(card.isPrimary),
        Number(card.monthlyLimit || 25000),
        Number(card.currentSpent || 0),
        Boolean(card.contactlessEnabled),
        Boolean(card.onlinePurchasesEnabled),
        Boolean(card.atmWithdrawalsEnabled),
        card.pin || null,
        card.createdAt || new Date().toISOString(),
      ]);
    },

    delete: async (id: string): Promise<boolean> => {
      await this.init();
      const res = await this.pool.query('DELETE FROM cards WHERE id = $1', [id]);
      return (res.rowCount || 0) > 0;
    },

    values: async (): Promise<CardEntity[]> => {
      await this.init();
      const res = await this.pool.query('SELECT * FROM cards ORDER BY created_at DESC');
      return res.rows.map((r) => this.mapRowToCard(r));
    },

    findByUser: async (userId: string): Promise<CardEntity[]> => {
      await this.init();
      const res = await this.pool.query(
        'SELECT * FROM cards WHERE user_id = $1 ORDER BY is_primary DESC, created_at DESC',
        [userId]
      );
      return res.rows.map((r) => this.mapRowToCard(r));
    },

    getByUserId: async (userId: string): Promise<CardEntity[]> => {
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
      monthlyLimit: parseFloat(row.monthly_limit) || 25000,
      currentSpent: parseFloat(row.current_spent) || 0,
      contactlessEnabled: Boolean(row.contactless_enabled),
      onlinePurchasesEnabled: Boolean(row.online_purchases_enabled),
      atmWithdrawalsEnabled: Boolean(row.atm_withdrawals_enabled),
      pin: row.pin || undefined,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };
  }

  // ==========================================
  // NOTIFICATIONS REPOSITORY
  // ==========================================
  public notifications = {
    get: async (id: string): Promise<NotificationEntity | undefined> => {
      await this.init();
      const res = await this.pool.query('SELECT * FROM notifications WHERE id = $1 LIMIT 1', [id]);
      return res.rows[0] ? this.mapRowToNotification(res.rows[0]) : undefined;
    },

    set: async (id: string, notif: NotificationEntity): Promise<void> => {
      await this.init();
      const query = `
        INSERT INTO notifications (
          id, user_id, title, description, type, timestamp, is_read, linked_txn_id, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        )
        ON CONFLICT(id) DO UPDATE SET
          is_read = EXCLUDED.is_read
      `;

      await this.pool.query(query, [
        notif.id,
        notif.userId,
        notif.title,
        notif.description,
        notif.type,
        notif.timestamp ? String(notif.timestamp) : new Date().toISOString(),
        Boolean(notif.isRead),
        notif.linkedTxnId || null,
        notif.createdAt && !isNaN(new Date(notif.createdAt).getTime()) ? new Date(notif.createdAt).toISOString() : new Date().toISOString(),
      ]);
    },

    delete: async (id: string): Promise<boolean> => {
      await this.init();
      const res = await this.pool.query('DELETE FROM notifications WHERE id = $1', [id]);
      return (res.rowCount || 0) > 0;
    },

    values: async (): Promise<NotificationEntity[]> => {
      await this.init();
      const res = await this.pool.query('SELECT * FROM notifications ORDER BY created_at DESC');
      return res.rows.map((r) => this.mapRowToNotification(r));
    },

    findByUser: async (userId: string): Promise<NotificationEntity[]> => {
      await this.init();
      const res = await this.pool.query(
        'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      return res.rows.map((r) => this.mapRowToNotification(r));
    },

    getByUserId: async (userId: string): Promise<NotificationEntity[]> => {
      return this.notifications.findByUser(userId);
    },
  };

  private mapRowToNotification(row: any): NotificationEntity {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      type: row.type,
      timestamp: row.timestamp ? String(row.timestamp) : new Date().toISOString(),
      isRead: Boolean(row.is_read),
      linkedTxnId: row.linked_txn_id || undefined,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };
  }

  // ==========================================
  // LEDGER ENTRIES REPOSITORY
  // ==========================================
  public ledgerEntries = {
    push: async (entry: LedgerEntryEntity): Promise<void> => {
      await this.init();
      const query = `
        INSERT INTO ledger_entries (
          id, transaction_id, wallet_id, entry_type, amount, currency, balance_after, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8
        )
      `;

      await this.pool.query(query, [
        entry.id,
        entry.transactionId,
        entry.walletId,
        entry.entryType,
        Number(entry.amount),
        entry.currency,
        Number(entry.balanceAfter),
        entry.createdAt ? new Date(entry.createdAt).toISOString() : new Date().toISOString(),
      ]);
    },

    filter: async (predicate: (e: LedgerEntryEntity) => boolean): Promise<LedgerEntryEntity[]> => {
      await this.init();
      const res = await this.pool.query('SELECT * FROM ledger_entries ORDER BY created_at ASC');
      const list = res.rows.map((r) => this.mapRowToLedger(r));
      return list.filter(predicate);
    },

    findByWallet: async (walletId: string): Promise<LedgerEntryEntity[]> => {
      await this.init();
      const res = await this.pool.query('SELECT * FROM ledger_entries WHERE wallet_id = $1 ORDER BY created_at ASC', [
        walletId,
      ]);
      return res.rows.map((r) => this.mapRowToLedger(r));
    },

    values: async (): Promise<LedgerEntryEntity[]> => {
      await this.init();
      const res = await this.pool.query('SELECT * FROM ledger_entries ORDER BY created_at ASC');
      return res.rows.map((r) => this.mapRowToLedger(r));
    },
  };

  private mapRowToLedger(row: any): LedgerEntryEntity {
    return {
      id: row.id,
      transactionId: row.transaction_id,
      walletId: row.wallet_id,
      entryType: row.entry_type,
      amount: parseFloat(row.amount) || 0,
      currency: row.currency,
      balanceAfter: parseFloat(row.balance_after) || 0,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };
  }

  // ==========================================
  // PAYMENT REQUESTS REPOSITORY
  // ==========================================
  public paymentRequests = {
    get: async (idOrSlug: string): Promise<PaymentRequestEntity | undefined> => {
      if (!idOrSlug) return undefined;
      await this.init();
      const res = await this.pool.query(
        'SELECT * FROM payment_requests WHERE id = $1 OR slug = $1 LIMIT 1',
        [idOrSlug]
      );
      return res.rows[0] ? this.mapRowToPaymentRequest(res.rows[0]) : undefined;
    },

    set: async (id: string, req: PaymentRequestEntity): Promise<void> => {
      await this.init();
      const query = `
        INSERT INTO payment_requests (
          id, slug, user_id, amount, currency, recipient_email, message, status, created_at, expires_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
        ON CONFLICT(id) DO UPDATE SET
          status = EXCLUDED.status
      `;

      await this.pool.query(query, [
        req.id,
        req.slug,
        req.userId,
        Number(req.amount),
        req.currency,
        req.recipientEmail || null,
        req.message || null,
        req.status || 'PENDING',
        req.createdAt ? new Date(req.createdAt).toISOString() : new Date().toISOString(),
        req.expiresAt ? new Date(req.expiresAt).toISOString() : new Date().toISOString(),
      ]);
    },

    delete: async (id: string): Promise<boolean> => {
      await this.init();
      const res = await this.pool.query('DELETE FROM payment_requests WHERE id = $1', [id]);
      return (res.rowCount || 0) > 0;
    },

    values: async (): Promise<PaymentRequestEntity[]> => {
      await this.init();
      const res = await this.pool.query('SELECT * FROM payment_requests ORDER BY created_at DESC');
      return res.rows.map((r) => this.mapRowToPaymentRequest(r));
    },
  };

  private mapRowToPaymentRequest(row: any): PaymentRequestEntity {
    return {
      id: row.id,
      slug: row.slug,
      userId: row.user_id,
      amount: parseFloat(row.amount) || 0,
      currency: row.currency,
      recipientEmail: row.recipient_email || undefined,
      message: row.message || undefined,
      status: row.status,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : new Date().toISOString(),
    };
  }

  // ==========================================
  // RATE LOCKS REPOSITORY
  // ==========================================
  public rateLocks = {
    get: async (quoteId: string): Promise<FXRateLock | undefined> => {
      if (!quoteId) return undefined;
      await this.init();
      const res = await this.pool.query('SELECT * FROM rate_locks WHERE quote_id = $1 LIMIT 1', [quoteId]);
      return res.rows[0] ? this.mapRowToRateLock(res.rows[0]) : undefined;
    },

    set: async (quoteId: string, lock: FXRateLock): Promise<void> => {
      await this.init();
      const query = `
        INSERT INTO rate_locks (quote_id, from_currency, to_currency, rate, from_amount, to_amount, fee, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT(quote_id) DO UPDATE SET
          rate = EXCLUDED.rate,
          expires_at = EXCLUDED.expires_at
      `;

      await this.pool.query(query, [
        lock.quoteId,
        lock.fromCurrency,
        lock.toCurrency,
        Number(lock.rate),
        Number(lock.fromAmount),
        Number(lock.toAmount),
        Number(lock.fee),
        Number(lock.expiresAt),
      ]);
    },

    delete: async (quoteId: string): Promise<boolean> => {
      await this.init();
      const res = await this.pool.query('DELETE FROM rate_locks WHERE quote_id = $1', [quoteId]);
      return (res.rowCount || 0) > 0;
    },
  };

  private mapRowToRateLock(row: any): FXRateLock {
    return {
      quoteId: row.quote_id,
      fromCurrency: row.from_currency,
      toCurrency: row.to_currency,
      rate: parseFloat(row.rate) || 0,
      fromAmount: parseFloat(row.from_amount) || 0,
      toAmount: parseFloat(row.to_amount) || 0,
      fee: parseFloat(row.fee) || 0,
      expiresAt: Number(row.expires_at),
    };
  }

  // ==========================================
  // IDEMPOTENCY STORE REPOSITORY
  // ==========================================
  public idempotencyStore = {
    get: async (key: string): Promise<{ status: number; body: string } | undefined> => {
      if (!key) return undefined;
      await this.init();
      const res = await this.pool.query('SELECT * FROM idempotency_store WHERE key = $1 LIMIT 1', [key]);
      if (!res.rows[0]) return undefined;
      return {
        status: Number(res.rows[0].status),
        body: res.rows[0].body,
      };
    },

    set: async (key: string, data: { status: number; body: string }): Promise<void> => {
      await this.init();
      const query = `
        INSERT INTO idempotency_store (key, status, body, timestamp)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT(key) DO UPDATE SET
          status = EXCLUDED.status,
          body = EXCLUDED.body,
          timestamp = EXCLUDED.timestamp
      `;

      await this.pool.query(query, [key, Number(data.status), data.body, Date.now()]);
    },
  };

  // ==========================================
  // DISPATCHED ALERTS REPOSITORY (EMAIL & SMS)
  // ==========================================
  public dispatchedAlerts = {
    get: async (id: string): Promise<DispatchedAlertEntity | undefined> => {
      await this.init();
      const res = await this.pool.query('SELECT * FROM dispatched_alerts WHERE id = $1 LIMIT 1', [id]);
      return res.rows[0] ? this.mapRowToDispatchedAlert(res.rows[0]) : undefined;
    },

    set: async (id: string, alert: DispatchedAlertEntity): Promise<void> => {
      await this.init();
      const query = `
        INSERT INTO dispatched_alerts (
          id, user_id, transaction_id, channel, recipient, subject, body_text, body_html, status, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
        ON CONFLICT(id) DO UPDATE SET
          status = EXCLUDED.status,
          body_text = EXCLUDED.body_text,
          body_html = EXCLUDED.body_html
      `;
      await this.pool.query(query, [
        alert.id,
        alert.userId,
        alert.transactionId || null,
        alert.channel,
        alert.recipient,
        alert.subject,
        alert.bodyText,
        alert.bodyHtml || null,
        alert.status || 'SENT',
        alert.createdAt && !isNaN(new Date(alert.createdAt).getTime()) ? new Date(alert.createdAt).toISOString() : new Date().toISOString(),
      ]);
    },

    create: async (alert: DispatchedAlertEntity): Promise<DispatchedAlertEntity> => {
      await this.dispatchedAlerts.set(alert.id, alert);
      return alert;
    },

    findByUser: async (userId: string, channel?: string, limit = 50): Promise<DispatchedAlertEntity[]> => {
      await this.init();
      let query = 'SELECT * FROM dispatched_alerts WHERE user_id = $1';
      const params: any[] = [userId];

      if (channel && channel !== 'all') {
        params.push(channel.toUpperCase());
        query += ` AND channel = $${params.length}`;
      }

      params.push(limit);
      query += ` ORDER BY created_at DESC LIMIT $${params.length}`;

      const res = await this.pool.query(query, params);
      return res.rows.map((r) => this.mapRowToDispatchedAlert(r));
    },

    findByTransaction: async (txnId: string): Promise<DispatchedAlertEntity[]> => {
      await this.init();
      const res = await this.pool.query(
        'SELECT * FROM dispatched_alerts WHERE transaction_id = $1 ORDER BY created_at ASC',
        [txnId]
      );
      return res.rows.map((r) => this.mapRowToDispatchedAlert(r));
    },
  };

  private mapRowToDispatchedAlert(row: any): DispatchedAlertEntity {
    return {
      id: row.id,
      userId: row.user_id,
      transactionId: row.transaction_id || undefined,
      channel: row.channel,
      recipient: row.recipient,
      subject: row.subject,
      bodyText: row.body_text,
      bodyHtml: row.body_html || undefined,
      status: row.status,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };
  }
}
