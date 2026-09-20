export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'BDT' | 'CHF' | 'JPY' | 'CAD' | 'AUD' | 'SGD' | 'AED';

export type UserTier = 'Private Wealth Sovereign' | 'Private Client' | 'Signature Elite';

export interface UserEntity {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string;
  aurelisTag: string;
  tier?: string;
  baseCurrency: CurrencyCode;
  avatar: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  biometricEnabled: boolean;
  passkeyEnabled: boolean;
  address: {
    street: string;
    city: string;
    country: string;
    postalCode: string;
  };
  transactionPin?: string;
  emailAlertsEnabled?: boolean;
  smsAlertsEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WalletEntity {
  id: string;
  userId: string;
  currency: CurrencyCode;
  balance: number;
  pendingBalance: number;
  accountNumber: string;
  routingNumber?: string;
  iban?: string;
  bic: string;
  isPrimary: boolean;
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'send' | 'receive' | 'exchange' | 'deposit' | 'withdrawal' | 'card_payment';
export type TransactionStatus = 'Completed' | 'Pending' | 'Processing' | 'Failed' | 'Cancelled';

export interface TransactionEntity {
  id: string; // e.g. "TXN-8F29A41C"
  userId: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  sourceCurrency?: CurrencyCode;
  destinationCurrency?: CurrencyCode;
  destinationAmount?: number;
  exchangeRate?: number;
  fee: number;
  totalCharged: number;
  sourceWalletId?: string;
  destWalletId?: string;
  recipientId?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientAvatar?: string;
  recipientAurelisTag?: string;
  senderName?: string;
  paymentMethod: string;
  status: TransactionStatus;
  date: string;
  reference?: string;
  category: string;
  idempotencyKey?: string;
  receiptSignature?: string;
  createdAt?: string;
}

export interface LedgerEntryEntity {
  id: string;
  transactionId: string;
  walletId: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
  currency: CurrencyCode;
  balanceAfter: number;
  createdAt: string;
}

export interface RecipientEntity {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  currency: CurrencyCode;
  bankName: string;
  accountNumber: string;
  routingOrIban: string;
  lastTransferDate?: string;
  isFavorite: boolean;
  aurelisTag?: string;
  createdAt: string;
}

export interface CardEntity {
  id: string;
  userId: string;
  type: 'physical' | 'virtual';
  tier: 'Black Titanium' | 'Champagne Gold' | 'Pearl Sovereign';
  cardNumber: string;
  maskedNumber: string;
  holderName: string;
  expiry: string;
  cvv: string;
  isFrozen: boolean;
  isPrimary: boolean;
  monthlyLimit: number;
  currentSpent: number;
  contactlessEnabled: boolean;
  onlinePurchasesEnabled: boolean;
  atmWithdrawalsEnabled: boolean;
  pin: string;
  createdAt: string;
}

export interface NotificationEntity {
  id: string;
  userId: string;
  title: string;
  description: string;
  type: 'transfer' | 'security' | 'rate' | 'system';
  timestamp: string;
  isRead: boolean;
  linkedTxnId?: string;
  createdAt?: string;
}

export interface FXRateLock {
  quoteId: string;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  rate: number;
  fromAmount: number;
  toAmount: number;
  fee: number;
  expiresAt: number; // timestamp in ms
}

export interface PaymentRequestEntity {
  id: string;
  userId: string;
  amount: number;
  currency: CurrencyCode;
  recipientEmail: string;
  message?: string;
  slug: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED';
  createdAt: string;
  expiresAt: string;
}

export type NotificationChannel = 'EMAIL' | 'SMS';

export interface DispatchedAlertEntity {
  id: string;
  userId: string;
  transactionId?: string;
  channel: NotificationChannel;
  recipient: string; // email address or phone number
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  createdAt: string;
}
