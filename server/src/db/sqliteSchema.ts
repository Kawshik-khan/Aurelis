// ============================================================================
// AURELIS PRIVATE WEALTH & GLOBAL TRANSFERS
// SQLite Production Database Schema
// Strict Double-Entry Accounting, Referential Constraints & Audit Trails
// ============================================================================

export const SQLITE_PRAGMAS = `
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
  PRAGMA cache_size = -64000;
`;

export const SQLITE_SCHEMA = `
  -- 1. USERS TABLE
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    aurelis_tag TEXT UNIQUE NOT NULL COLLATE NOCASE,
    tier TEXT DEFAULT 'Private Client',
    base_currency TEXT DEFAULT 'USD',
    avatar TEXT,
    two_factor_enabled INTEGER DEFAULT 1,
    two_factor_secret TEXT,
    biometric_enabled INTEGER DEFAULT 1,
    passkey_enabled INTEGER DEFAULT 1,
    address TEXT,
    transaction_pin TEXT DEFAULT '1234',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_aurelis_tag ON users(aurelis_tag);

  -- 2. WALLETS TABLE
  CREATE TABLE IF NOT EXISTS wallets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 0.0 CHECK(balance >= 0.0),
    pending_balance REAL NOT NULL DEFAULT 0.0 CHECK(pending_balance >= 0.0),
    account_number TEXT NOT NULL,
    routing_number TEXT,
    iban TEXT,
    bic TEXT NOT NULL,
    is_primary INTEGER DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'FROZEN', 'CLOSED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, currency)
  );

  CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
  CREATE INDEX IF NOT EXISTS idx_wallets_user_currency ON wallets(user_id, currency);

  -- 3. RECIPIENTS / BENEFICIARIES TABLE
  CREATE TABLE IF NOT EXISTS recipients (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE,
    phone TEXT,
    avatar TEXT,
    currency TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    routing_or_iban TEXT NOT NULL,
    aurelis_tag TEXT COLLATE NOCASE,
    last_transfer_date TEXT,
    is_favorite INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_recipients_user ON recipients(user_id);
  CREATE INDEX IF NOT EXISTS idx_recipients_email ON recipients(email);

  -- 4. TRANSACTIONS TABLE
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('send', 'receive', 'exchange', 'deposit', 'withdrawal', 'card_payment')),
    amount REAL NOT NULL CHECK(amount > 0),
    currency TEXT NOT NULL,
    source_currency TEXT,
    destination_currency TEXT,
    destination_amount REAL,
    exchange_rate REAL,
    fee REAL DEFAULT 0.0,
    total_charged REAL NOT NULL,
    source_wallet_id TEXT REFERENCES wallets(id) ON DELETE SET NULL,
    dest_wallet_id TEXT REFERENCES wallets(id) ON DELETE SET NULL,
    recipient_id TEXT,
    recipient_name TEXT,
    recipient_email TEXT,
    recipient_avatar TEXT,
    recipient_aurelis_tag TEXT,
    sender_name TEXT,
    payment_method TEXT NOT NULL,
    status TEXT DEFAULT 'Completed' CHECK(status IN ('Completed', 'Pending', 'Processing', 'Failed', 'Cancelled')),
    date TEXT NOT NULL,
    reference TEXT,
    category TEXT DEFAULT 'Transfer',
    idempotency_key TEXT UNIQUE,
    receipt_signature TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
  CREATE INDEX IF NOT EXISTS idx_transactions_idempotency ON transactions(idempotency_key);

  -- 5. DOUBLE-ENTRY FINANCIAL LEDGER TABLE
  CREATE TABLE IF NOT EXISTS ledger_entries (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    entry_type TEXT NOT NULL CHECK(entry_type IN ('DEBIT', 'CREDIT')),
    amount REAL NOT NULL CHECK(amount > 0),
    currency TEXT NOT NULL,
    balance_after REAL NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_ledger_wallet ON ledger_entries(wallet_id);
  CREATE INDEX IF NOT EXISTS idx_ledger_transaction ON ledger_entries(transaction_id);

  -- 6. CARDS TABLE
  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('physical', 'virtual')),
    tier TEXT NOT NULL CHECK(tier IN ('Black Titanium', 'Champagne Gold', 'Pearl Sovereign')),
    card_number TEXT NOT NULL,
    masked_number TEXT NOT NULL,
    holder_name TEXT NOT NULL,
    expiry TEXT NOT NULL,
    cvv TEXT NOT NULL,
    is_frozen INTEGER DEFAULT 0,
    is_primary INTEGER DEFAULT 0,
    monthly_limit REAL DEFAULT 25000.0,
    current_spent REAL DEFAULT 0.0,
    contactless_enabled INTEGER DEFAULT 1,
    online_purchases_enabled INTEGER DEFAULT 1,
    atm_withdrawals_enabled INTEGER DEFAULT 1,
    pin TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(user_id);

  -- 7. NOTIFICATIONS TABLE
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('transfer', 'security', 'rate', 'system')),
    timestamp TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    linked_txn_id TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

  -- 8. PAYMENT REQUESTS / INVOICES TABLE
  CREATE TABLE IF NOT EXISTS payment_requests (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    recipient_email TEXT,
    message TEXT,
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PAID', 'EXPIRED')),
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_payment_requests_slug ON payment_requests(slug);

  -- 9. RATE LOCKS TABLE (FX Quotes)
  CREATE TABLE IF NOT EXISTS rate_locks (
    quote_id TEXT PRIMARY KEY,
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    rate REAL NOT NULL,
    from_amount REAL NOT NULL,
    to_amount REAL NOT NULL,
    fee REAL NOT NULL,
    expires_at INTEGER NOT NULL
  );

  -- 10. IDEMPOTENCY STORE TABLE
  CREATE TABLE IF NOT EXISTS idempotency_store (
    key TEXT PRIMARY KEY,
    status INTEGER NOT NULL,
    body TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );
`;
