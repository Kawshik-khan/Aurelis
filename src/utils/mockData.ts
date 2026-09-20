import { CardItem, NotificationItem, Recipient, Transaction, UserProfile, Wallet } from '../types';

export const INITIAL_USER: UserProfile = {
  id: '',
  name: '',
  email: '',
  phone: '',
  avatar: '',
  aurelisTag: '',
  memberSince: '2026',
  primaryCurrency: 'BDT',
  twoFactorEnabled: true,
  biometricEnabled: true,
  passkeyEnabled: true,
  address: {
    street: 'Gulshan Avenue, Road 11',
    city: 'Dhaka',
    country: 'Bangladesh',
    postalCode: '1212',
  },
  activeSessions: [],
  transactionPin: '1234',
};

export const VICTORIA_USER: UserProfile = { ...INITIAL_USER };

export const VICTORIA_WALLETS: Wallet[] = [];

export const INITIAL_WALLETS: Wallet[] = [];

export const INITIAL_RECIPIENTS: Recipient[] = [
  {
    id: 'rec_bkash_1',
    name: 'bKash Personal (01712345678)',
    email: 'bkash.payee@dbsbank.com',
    phone: '01712345678',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    currency: 'BDT',
    bankName: 'bKash MFS',
    accountNumber: '01712345678',
    routingOrIban: 'BKASHBDDH',
    lastTransferDate: 'Just now',
    isFavorite: true,
    aurelisTag: '@bkash.01712',
  },
  {
    id: 'rec_nagad_2',
    name: 'Nagad Wallet (01996990184)',
    email: 'nagad.payee@dbsbank.com',
    phone: '01996990184',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    currency: 'BDT',
    bankName: 'Nagad Post Office MFS',
    accountNumber: '01996990184',
    routingOrIban: 'NAGADBDDH',
    lastTransferDate: 'Yesterday',
    isFavorite: true,
    aurelisTag: '@nagad.01996',
  },
  {
    id: 'rec_brac_3',
    name: 'BRAC Bank Account',
    email: 'brac.corporate@dbsbank.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    currency: 'BDT',
    bankName: 'BRAC Bank Ltd (Gulshan Branch)',
    accountNumber: '1501203948501001',
    routingOrIban: '060261354',
    lastTransferDate: '2 days ago',
    isFavorite: true,
    aurelisTag: '@brac.corporate',
  },
  {
    id: 'rec_city_4',
    name: 'City Bank Ltd (CityTouch)',
    email: 'city.treasury@dbsbank.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    currency: 'BDT',
    bankName: 'The City Bank Ltd',
    accountNumber: '1102938475601',
    routingOrIban: '225271458',
    lastTransferDate: 'Last week',
    isFavorite: false,
    aurelisTag: '@citytouch.bd',
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_CARDS: CardItem[] = [];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export const FX_PAIR_DETAILS: Record<
  string,
  {
    symbol: string;
    flag: string;
    country: string;
    volatility: 'Low' | 'Medium' | 'High';
    spread: string;
    dailyVolume: string;
  }
> = {
  EUR: { symbol: '€', flag: '🇪🇺', country: 'Eurozone', volatility: 'Low', spread: '0.02%', dailyVolume: '$2.1T' },
  GBP: { symbol: '£', flag: '🇬🇧', country: 'United Kingdom', volatility: 'Low', spread: '0.03%', dailyVolume: '$950B' },
  CHF: { symbol: '₣', flag: '🇨🇭', country: 'Switzerland', volatility: 'Low', spread: '0.02%', dailyVolume: '$380B' },
  JPY: { symbol: '¥', flag: '🇯🇵', country: 'Japan', volatility: 'Medium', spread: '0.03%', dailyVolume: '$1.2T' },
  CAD: { symbol: '$', flag: '🇨🇦', country: 'Canada', volatility: 'Medium', spread: '0.04%', dailyVolume: '$420B' },
  AUD: { symbol: '$', flag: '🇦🇺', country: 'Australia', volatility: 'Medium', spread: '0.04%', dailyVolume: '$460B' },
  SGD: { symbol: '$', flag: '🇸🇬', country: 'Singapore', volatility: 'Low', spread: '0.03%', dailyVolume: '$280B' },
  AED: { symbol: 'د.إ', flag: '🇦🇪', country: 'United Arab Emirates', volatility: 'Low', spread: '0.01%', dailyVolume: '$190B' },
  BDT: { symbol: '৳', flag: '🇧🇩', country: 'Bangladesh', volatility: 'Medium', spread: '0.08%', dailyVolume: '$45B' },
  USD: { symbol: '$', flag: '🇺🇸', country: 'United States', volatility: 'Low', spread: '0.01%', dailyVolume: '$3.8T' },
};
