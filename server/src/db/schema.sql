-- ============================================================================
-- AURELIS PRIVATE WEALTH & GLOBAL TRANSFERS
-- PostgreSQL Production Database Schema
-- Strict Double-Entry Accounting, Row-Level Constraints & Audit Trails
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & PRIVATE CLIENT PROFILES
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    phone_number VARCHAR(32),
    aurelis_tag VARCHAR(64) UNIQUE NOT NULL,
    tier VARCHAR(32) DEFAULT 'Private Wealth Sovereign',
    base_currency VARCHAR(3) DEFAULT 'USD',
    avatar_url TEXT,
    two_factor_enabled BOOLEAN DEFAULT TRUE,
    two_factor_secret VARCHAR(255),
    biometric_enabled BOOLEAN DEFAULT TRUE,
    passkey_enabled BOOLEAN DEFAULT TRUE,
    street_address VARCHAR(255),
    city VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_aurelis_tag ON users(aurelis_tag);

-- 2. MULTI-CURRENCY WALLETS
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL,
    balance NUMERIC(20, 4) NOT NULL DEFAULT 0.0000 CHECK (balance >= 0.0000),
    pending_balance NUMERIC(20, 4) NOT NULL DEFAULT 0.0000 CHECK (pending_balance >= 0.0000),
    account_number VARCHAR(32) NOT NULL,
    routing_number VARCHAR(32),
    iban VARCHAR(34),
    bic_swift VARCHAR(11) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FROZEN', 'CLOSED')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_currency UNIQUE (user_id, currency)
);

CREATE INDEX idx_wallets_user_currency ON wallets(user_id, currency);

-- 3. RECIPIENTS / BENEFICIARIES
CREATE TABLE IF NOT EXISTS recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(32),
    avatar_url TEXT,
    currency VARCHAR(3) NOT NULL,
    bank_name VARCHAR(120) NOT NULL,
    account_number VARCHAR(34) NOT NULL,
    routing_or_iban VARCHAR(34) NOT NULL,
    aurelis_tag VARCHAR(64),
    is_favorite BOOLEAN DEFAULT FALSE,
    last_transfer_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recipients_user ON recipients(user_id);

-- 4. TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(32) PRIMARY KEY, -- e.g. "TXN-8F29A41C"
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(32) NOT NULL CHECK (type IN ('send', 'receive', 'exchange', 'deposit', 'withdrawal', 'card_payment')),
    amount NUMERIC(20, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    source_currency VARCHAR(3),
    destination_currency VARCHAR(3),
    destination_amount NUMERIC(20, 4),
    exchange_rate NUMERIC(14, 6),
    fee NUMERIC(20, 4) DEFAULT 0.0000,
    total_charged NUMERIC(20, 4) NOT NULL,
    source_wallet_id UUID REFERENCES wallets(id),
    dest_wallet_id UUID REFERENCES wallets(id),
    recipient_name VARCHAR(120),
    recipient_email VARCHAR(255),
    recipient_avatar TEXT,
    recipient_tag VARCHAR(64),
    sender_name VARCHAR(120),
    payment_method VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'Completed' CHECK (status IN ('Completed', 'Pending', 'Processing', 'Failed', 'Cancelled')),
    reference VARCHAR(255),
    category VARCHAR(64) DEFAULT 'Transfer',
    idempotency_key VARCHAR(128) UNIQUE,
    receipt_signature TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_idempotency ON transactions(idempotency_key);

-- 5. DOUBLE-ENTRY FINANCIAL LEDGER
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id VARCHAR(32) NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    amount NUMERIC(20, 4) NOT NULL CHECK (amount > 0.0000),
    currency VARCHAR(3) NOT NULL,
    balance_after NUMERIC(20, 4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ledger_wallet ON ledger_entries(wallet_id);
CREATE INDEX idx_ledger_transaction ON ledger_entries(transaction_id);

-- 6. CARDS & PAYMENT INSTRUMENTS
CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('physical', 'virtual')),
    tier VARCHAR(32) NOT NULL CHECK (tier IN ('Black Titanium', 'Champagne Gold', 'Pearl Sovereign')),
    card_number VARCHAR(255) NOT NULL, -- Encrypted/Tokenized in production
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
    pin_hash VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cards_user ON cards(user_id);

-- 7. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(32) NOT NULL CHECK (type IN ('transfer', 'security', 'rate', 'system')),
    is_read BOOLEAN DEFAULT FALSE,
    linked_txn_id VARCHAR(32),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
