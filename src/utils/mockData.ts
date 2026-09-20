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

export const INITIAL_WALLETS: Wallet[] = [];

export const INITIAL_RECIPIENTS: Recipient[] = [];

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
