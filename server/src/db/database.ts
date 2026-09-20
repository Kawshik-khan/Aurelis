import { PostgresDatabaseEngine } from './postgresDb';
import { UserEntity } from '../types';

export class DatabaseService {
  private pgEngine: PostgresDatabaseEngine;
  public readonly isPostgres = true;

  constructor() {
    const dbUrl =
      process.env.DATABASE_URL ||
      'postgresql://neondb_owner:npg_yMYLP8g9rdXB@ep-lively-pond-b5otd0oa-pooler.c-7.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

    console.log('[AURELIS-DB] Initializing Neon Cloud PostgreSQL database engine...');
    this.pgEngine = new PostgresDatabaseEngine(dbUrl);
  }

  public get engine(): PostgresDatabaseEngine {
    return this.pgEngine;
  }

  public get users() {
    return this.pgEngine.users;
  }

  public get wallets() {
    return this.pgEngine.wallets;
  }

  public get recipients() {
    return this.pgEngine.recipients;
  }

  public get transactions() {
    return this.pgEngine.transactions;
  }

  public get cards() {
    return this.pgEngine.cards;
  }

  public get notifications() {
    return this.pgEngine.notifications;
  }

  public get dispatchedAlerts() {
    return this.pgEngine.dispatchedAlerts;
  }

  public get ledgerEntries() {
    return this.pgEngine.ledgerEntries;
  }

  public get paymentRequests() {
    return this.pgEngine.paymentRequests;
  }

  public get rateLocks() {
    return this.pgEngine.rateLocks;
  }

  public get idempotencyStore() {
    return this.pgEngine.idempotencyStore;
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
