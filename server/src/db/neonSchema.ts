// ============================================================================
// AURELIS PRIVATE WEALTH & GLOBAL TRANSFERS
// Neon Cloud PostgreSQL Database Schema
// Strict Double-Entry Accounting, Referential Constraints & Audit Trails
// ============================================================================

export const NEON_POSTGRES_SCHEMA = `
  -- 1. USERS TABLE
  CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    phone VARCHAR(32),
    aurelis_tag VARCHAR(64) UNIQUE NOT NULL,
    tier VARCHAR(32) DEFAULT 'Private Client',
    base_currency VARCHAR(3) DEFAULT 'USD',
    avatar TEXT,
    two_factor_enabled BOOLEAN DEFAULT TRUE,
    two_factor_secret VARCHAR(255),
    biometric_enabled BOOLEAN DEFAULT TRUE,
    passkey_enabled BOOLEAN DEFAULT TRUE,
    address TEXT,
    transaction_pin VARCHAR(32) DEFAULT '1234',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
  CREATE INDEX IF NOT EXISTS idx_users_aurelis_tag ON users(LOWER(aurelis_tag));

  -- 2. WALLETS TABLE
  CREATE TABLE IF NOT EXISTS wallets (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL,
    balance NUMERIC(20, 4) NOT NULL DEFAULT 0.0000 CHECK(balance >= 0.0),
    pending_balance NUMERIC(20, 4) NOT NULL DEFAULT 0.0000 CHECK(pending_balance >= 0.0),
    account_number VARCHAR(34) NOT NULL,
    routing_number VARCHAR(34),
    iban VARCHAR(34),
    bic VARCHAR(11) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'FROZEN', 'CLOSED')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_currency UNIQUE(user_id, currency)
  );

  CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
  CREATE INDEX IF NOT EXISTS idx_wallets_user_currency ON wallets(user_id, currency);

  -- 3. RECIPIENTS / BENEFICIARIES TABLE
  CREATE TABLE IF NOT EXISTS recipients (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(32),
    avatar TEXT,
    currency VARCHAR(3) NOT NULL,
    bank_name VARCHAR(120) NOT NULL,
    account_number VARCHAR(34) NOT NULL,
    routing_or_iban VARCHAR(34) NOT NULL,
    aurelis_tag VARCHAR(64),
    last_transfer_date TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_recipients_user ON recipients(user_id);
  CREATE INDEX IF NOT EXISTS idx_recipients_email ON recipients(LOWER(email));

  -- 4. TRANSACTIONS TABLE
  CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL CHECK(type IN ('send', 'receive', 'exchange', 'deposit', 'withdrawal', 'card_payment')),
    amount NUMERIC(20, 4) NOT NULL CHECK(amount > 0),
    currency VARCHAR(3) NOT NULL,
    source_currency VARCHAR(3),
    destination_currency VARCHAR(3),
    destination_amount NUMERIC(20, 4),
    exchange_rate NUMERIC(14, 6),
    fee NUMERIC(20, 4) DEFAULT 0.0000,
    total_charged NUMERIC(20, 4) NOT NULL,
    source_wallet_id VARCHAR(64) REFERENCES wallets(id) ON DELETE SET NULL,
    dest_wallet_id VARCHAR(64) REFERENCES wallets(id) ON DELETE SET NULL,
    recipient_id VARCHAR(64),
    recipient_name VARCHAR(120),
    recipient_email VARCHAR(255),
    recipient_avatar TEXT,
    recipient_aurelis_tag VARCHAR(64),
    sender_name VARCHAR(120),
    payment_method VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'Completed' CHECK(status IN ('Completed', 'Pending', 'Processing', 'Failed', 'Cancelled')),
    date TIMESTAMPTZ NOT NULL,
    reference VARCHAR(255),
    category VARCHAR(64) DEFAULT 'Transfer',
    idempotency_key VARCHAR(128) UNIQUE,
    receipt_signature TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
  CREATE INDEX IF NOT EXISTS idx_transactions_idempotency ON transactions(idempotency_key);

  -- 5. DOUBLE-ENTRY FINANCIAL LEDGER TABLE
  CREATE TABLE IF NOT EXISTS ledger_entries (
    id VARCHAR(64) PRIMARY KEY,
    transaction_id VARCHAR(64) NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    wallet_id VARCHAR(64) NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    entry_type VARCHAR(10) NOT NULL CHECK(entry_type IN ('DEBIT', 'CREDIT')),
    amount NUMERIC(20, 4) NOT NULL CHECK(amount > 0),
    currency VARCHAR(3) NOT NULL,
    balance_after NUMERIC(20, 4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_ledger_wallet ON ledger_entries(wallet_id);
  CREATE INDEX IF NOT EXISTS idx_ledger_transaction ON ledger_entries(transaction_id);

  -- 6. CARDS TABLE
  CREATE TABLE IF NOT EXISTS cards (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK(type IN ('physical', 'virtual')),
    tier VARCHAR(32) NOT NULL CHECK(tier IN ('Black Titanium', 'Champagne Gold', 'Pearl Sovereign')),
    card_number VARCHAR(255) NOT NULL,
    masked_number VARCHAR(19) NOT NULL,
    holder_name VARCHAR(120) NOT NULL,
    expiry VARCHAR(7) NOT NULL,
    cvv VARCHAR(4) NOT NULL,
    is_frozen BOOLEAN DEFAULT FALSE,
    is_primary BOOLEAN DEFAULT FALSE,
    monthly_limit NUMERIC(20, 4) DEFAULT 25000.0000,
    current_spent NUMERIC(20, 4) DEFAULT 0.0000,
    contactless_enabled BOOLEAN DEFAULT TRUE,
    online_purchases_enabled BOOLEAN DEFAULT TRUE,
    atm_withdrawals_enabled BOOLEAN DEFAULT TRUE,
    pin VARCHAR(32),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(user_id);

  -- 7. NOTIFICATIONS TABLE
  CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(32) NOT NULL CHECK(type IN ('transfer', 'security', 'rate', 'system')),
    timestamp TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    linked_txn_id VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

  -- 8. PAYMENT REQUESTS / INVOICES TABLE
  CREATE TABLE IF NOT EXISTS payment_requests (
    id VARCHAR(64) PRIMARY KEY,
    slug VARCHAR(128) UNIQUE NOT NULL,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(20, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    recipient_email VARCHAR(255),
    message TEXT,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PAID', 'EXPIRED')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_payment_requests_slug ON payment_requests(slug);

  -- 9. RATE LOCKS TABLE (FX Quotes)
  CREATE TABLE IF NOT EXISTS rate_locks (
    quote_id VARCHAR(64) PRIMARY KEY,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate NUMERIC(14, 6) NOT NULL,
    from_amount NUMERIC(20, 4) NOT NULL,
    to_amount NUMERIC(20, 4) NOT NULL,
    fee NUMERIC(20, 4) NOT NULL,
    expires_at BIGINT NOT NULL
  );

  -- 10. IDEMPOTENCY STORE TABLE
  CREATE TABLE IF NOT EXISTS idempotency_store (
    key VARCHAR(128) PRIMARY KEY,
    status INTEGER NOT NULL,
    body TEXT NOT NULL,
    timestamp BIGINT NOT NULL
  );

  -- 11. IDEMPOTENT COLUMN MIGRATIONS
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'recipients' AND column_name = 'last_transfer_date' AND data_type != 'text'
    ) THEN
      ALTER TABLE recipients ALTER COLUMN last_transfer_date TYPE TEXT USING last_transfer_date::TEXT;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notifications' AND column_name = 'timestamp' AND data_type != 'text'
    ) THEN
      ALTER TABLE notifications ALTER COLUMN timestamp TYPE TEXT USING timestamp::TEXT;
    END IF;
  END $$;
`;

