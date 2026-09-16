import { PostgresDatabaseEngine } from './postgresDb';
import { SQLiteDatabaseEngine } from './sqliteDb';
import { UserEntity } from '../types';

export class DatabaseService {
  private pgEngine: PostgresDatabaseEngine | null = null;
  private sqliteEngine: SQLiteDatabaseEngine | null = null;
  public readonly isPostgres: boolean;

  constructor() {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'))) {
      console.log('[AURELIS-DB] Initializing Neon Cloud PostgreSQL database engine...');
      this.pgEngine = new PostgresDatabaseEngine(dbUrl);
      this.isPostgres = true;
    } else {
      console.log('[AURELIS-DB] No DATABASE_URL provided. Initializing local SQLite fallback engine...');
      this.sqliteEngine = new SQLiteDatabaseEngine();
      this.isPostgres = false;
    }
  }

  public get users() {
    if (this.pgEngine) return this.pgEngine.users;
    const s = this.sqliteEngine!.users;
    return {
      get: async (idOrEmailOrTag: string) => s.get(idOrEmailOrTag),
      has: async (idOrEmail: string) => s.has(idOrEmail),
      set: async (id: string, user: UserEntity) => s.set(id, user),
      delete: async (id: string) => s.delete(id),
      values: async () => s.values(),
      count: async () => s.count(),
    };
  }

  public get wallets() {
    if (this.pgEngine) return this.pgEngine.wallets;
    const s = this.sqliteEngine!.wallets;
    return {
      get: async (id: string) => s.get(id),
      set: async (id: string, wallet: any) => s.set(id, wallet),
      delete: async (id: string) => s.delete(id),
      values: async () => s.values(),
      findByUser: async (userId: string) => s.findByUser(userId),
      getByUserId: async (userId: string) => s.findByUser(userId),
    };
  }

  public get recipients() {
    if (this.pgEngine) return this.pgEngine.recipients;
    const s = this.sqliteEngine!.recipients;
    return {
      get: async (id: string) => s.get(id),
      set: async (id: string, rec: any) => s.set(id, rec),
      delete: async (id: string) => s.delete(id),
      values: async () => s.values(),
      findByUser: async (userId: string) => s.findByUser(userId),
      getByUserId: async (userId: string) => s.findByUser(userId),
    };
  }

  public get transactions() {
    if (this.pgEngine) return this.pgEngine.transactions;
    const s = this.sqliteEngine!.transactions;
    return {
      get: async (id: string) => s.get(id),
      set: async (id: string, txn: any) => s.set(id, txn),
      delete: async (id: string) => s.delete(id),
      values: async () => s.values(),
      findByUser: async (userId: string) => s.findByUser(userId),
      getByUserId: async (userId: string) => s.findByUser(userId),
      findByIdempotencyKey: async (key: string) => s.findByIdempotencyKey(key),
    };
  }

  public get cards() {
    if (this.pgEngine) return this.pgEngine.cards;
    const s = this.sqliteEngine!.cards;
    return {
      get: async (id: string) => s.get(id),
      set: async (id: string, card: any) => s.set(id, card),
      delete: async (id: string) => s.delete(id),
      values: async () => s.values(),
      findByUser: async (userId: string) => s.findByUser(userId),
      getByUserId: async (userId: string) => s.findByUser(userId),
    };
  }

  public get notifications() {
    if (this.pgEngine) return this.pgEngine.notifications;
    const s = this.sqliteEngine!.notifications;
    return {
      get: async (id: string) => s.get(id),
      set: async (id: string, notif: any) => s.set(id, notif),
      delete: async (id: string) => s.delete(id),
      values: async () => s.values(),
      findByUser: async (userId: string) => s.findByUser(userId),
      getByUserId: async (userId: string) => s.getByUserId(userId),
    };
  }

  public get ledgerEntries() {
    if (this.pgEngine) return this.pgEngine.ledgerEntries;
    const s = this.sqliteEngine!.ledgerEntries;
    return {
      push: async (entry: any) => s.push(entry),
      filter: async (predicate: any) => s.filter(predicate),
      findByWallet: async (walletId: string) => s.findByWallet(walletId),
      values: async () => s.values(),
    };
  }

  public get paymentRequests() {
    if (this.pgEngine) return this.pgEngine.paymentRequests;
    const s = this.sqliteEngine!.paymentRequests;
    return {
      get: async (idOrSlug: string) => s.get(idOrSlug),
      set: async (id: string, req: any) => s.set(id, req),
      delete: async (id: string) => s.delete(id),
      values: async () => s.values(),
    };
  }

  public get rateLocks() {
    if (this.pgEngine) return this.pgEngine.rateLocks;
    const s = this.sqliteEngine!.rateLocks;
    return {
      get: async (quoteId: string) => s.get(quoteId),
      set: async (quoteId: string, lock: any) => s.set(quoteId, lock),
      delete: async (quoteId: string) => s.delete(quoteId),
    };
  }

  public get idempotencyStore() {
    if (this.pgEngine) return this.pgEngine.idempotencyStore;
    const s = this.sqliteEngine!.idempotencyStore;
    return {
      get: async (key: string) => s.get(key),
      set: async (key: string, data: any) => s.set(key, data),
    };
  }

  public async getUserByEmail(email: string): Promise<UserEntity | undefined> {
    return this.users.get(email);
  }

  public async getUserById(id: string): Promise<UserEntity | undefined> {
    return this.users.get(id);
  }

  public async findUserByEmailOrTag(identifier: string): Promise<UserEntity | undefined> {
    return this.users.get(identifier);
  }

  public saveToFile(): void {
    // Retained for backward-compatibility
  }

  public scheduleSave(): void {
    // Retained for backward-compatibility
  }
}

export const db = new DatabaseService();
