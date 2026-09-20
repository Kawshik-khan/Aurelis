export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'BDT' | 'CHF' | 'JPY' | 'CAD' | 'AUD' | 'SGD' | 'AED';

export interface CurrencyMeta {
  code: CurrencyCode;
  name: string;
  symbol: string;
  flag?: string;
  rateToUSD: number; // 1 unit in USD
  decimals: number;
  country: string;
}

export interface Wallet {
  id: string;
  currency: CurrencyCode;
  balance: number;
  pendingBalance: number;
  accountNumber: string;
  routingNumber?: string;
  iban?: string;
  bic?: string;
  isPrimary: boolean;
  color?: string;
}

export type TransactionType = 'send' | 'receive' | 'exchange' | 'deposit' | 'withdrawal' | 'card_payment';
export type TransactionStatus = 'Completed' | 'Pending' | 'Processing' | 'Failed' | 'Cancelled';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  sourceCurrency?: CurrencyCode;
  destinationCurrency?: CurrencyCode;
  destinationAmount?: number;
  exchangeRate?: number;
  fee: number;
  totalCharged: number;
  recipientName?: string;
  recipientEmail?: string;
  recipientAvatar?: string;
  recipientAurelisTag?: string;
  senderName?: string;
  paymentMethod: string;
  status: TransactionStatus;
  date: string; // ISO or formatted
  reference?: string;
  category: 'Transfer' | 'Subscription' | 'Dining' | 'Investment' | 'Exchange' | 'Salary' | 'Shopping' | 'Deposit' | 'Private Wealth';
  estimatedArrival?: string;
  createdAt?: string;
}

export interface Recipient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  currency: CurrencyCode;
  bankName: string;
  accountNumber: string;
  routingOrIban: string;
  lastTransferDate?: string;
  isFavorite?: boolean;
  aurelisTag?: string;
}

export type CardTier = 'Black Titanium' | 'Champagne Gold' | 'Pearl Sovereign';

export interface CardItem {
  id: string;
  type: 'physical' | 'virtual';
  tier: CardTier;
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
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: 'transfer' | 'security' | 'rate' | 'system';
  timestamp: string;
  isRead: boolean;
  linkedTxnId?: string;
  createdAt?: string;
}

export interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  aurelisTag: string;
  tier?: string;
  memberSince: string;
  primaryCurrency: CurrencyCode;
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
  passkeyEnabled: boolean;
  address: {
    street: string;
    city: string;
    country: string;
    postalCode: string;
  };
  activeSessions: ActiveSession[];
  transactionPin?: string;
  emailAlertsEnabled?: boolean;
  smsAlertsEnabled?: boolean;
}

export interface DispatchedAlert {
  id: string;
  userId: string;
  transactionId?: string;
  channel: 'EMAIL' | 'SMS';
  recipient: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  createdAt: string;
}

export type NavigationTab = 
  | 'dashboard' 
  | 'send' 
  | 'receive' 
  | 'exchange' 
  | 'transactions' 
  | 'recipients' 
  | 'wallets' 
  | 'cards' 
  | 'profile' 
  | 'settings';
