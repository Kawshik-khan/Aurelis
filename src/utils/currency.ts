import { CurrencyCode, CurrencyMeta } from '../types';

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    rateToUSD: 1.0000,
    decimals: 2,
    country: 'United States',
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    rateToUSD: 1.1765, // 1 EUR = 1.1765 USD => 1 USD = 0.84999 EUR
    decimals: 2,
    country: 'European Union',
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    rateToUSD: 1.2850, // 1 GBP = 1.285 USD => 1 USD = 0.7782 GBP
    decimals: 2,
    country: 'United Kingdom',
  },
  BDT: {
    code: 'BDT',
    name: 'Bangladeshi Taka',
    symbol: '৳',
    rateToUSD: 0.008333333333333333, // 1 USD = 120.00 BDT
    decimals: 2,
    country: 'Bangladesh',
  },
  CHF: {
    code: 'CHF',
    name: 'Swiss Franc',
    symbol: '₣',
    rateToUSD: 1.1250, // 1 USD = 0.8888 CHF
    decimals: 2,
    country: 'Switzerland',
  },
  JPY: {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    rateToUSD: 0.00662, // 1 USD = 151.05 JPY
    decimals: 0,
    country: 'Japan',
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'CA$',
    rateToUSD: 0.7350,
    decimals: 2,
    country: 'Canada',
  },
  AUD: {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    rateToUSD: 0.6550,
    decimals: 2,
    country: 'Australia',
  },
  SGD: {
    code: 'SGD',
    name: 'Singapore Dollar',
    symbol: 'S$',
    rateToUSD: 0.7480,
    decimals: 2,
    country: 'Singapore',
  },
  AED: {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'د.إ',
    rateToUSD: 0.2723, // 1 USD = 3.6725 AED
    decimals: 2,
    country: 'United Arab Emirates',
  },
};

export function getExchangeRate(from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return 1.0;
  const fromMeta = CURRENCIES[from] || CURRENCIES.USD;
  const toMeta = CURRENCIES[to] || CURRENCIES.USD;
  
  // Rate = (from in USD) / (to in USD)
  const rate = (fromMeta?.rateToUSD || 1.0) / (toMeta?.rateToUSD || 1.0);
  return rate;
}

export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'USD',
  options?: {
    showCode?: boolean;
    showSymbol?: boolean;
    showSign?: boolean;
    compact?: boolean;
  }
): string {
  const meta = CURRENCIES[currency] || CURRENCIES.USD;
  const decimals = meta?.decimals ?? 2;
  
  const formattedNum = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    notation: options?.compact ? 'compact' : 'standard',
  }).format(Math.abs(amount || 0));

  const sign = options?.showSign ? (amount < 0 ? '-' : amount > 0 ? '+' : '') : (amount < 0 ? '-' : '');
  const symbol = options?.showSymbol !== false ? (meta?.symbol || '$') : '';
  const code = options?.showCode ? ` ${meta?.code || 'USD'}` : '';

  return `${sign}${symbol}${formattedNum}${code}`;
}

export function calculateTransferQuote(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  isAurelisPeer: boolean = true
) {
  const safeAmount = isNaN(amount) ? 0 : amount;
  const safeFrom = from in CURRENCIES ? from : 'USD';
  const safeTo = to in CURRENCIES ? to : 'USD';
  const rate = getExchangeRate(safeFrom, safeTo);
  const converted = safeAmount * rate;
  
  // Zero transfer fees for DBS Bank peer transfers, flat $4.99 for swift wires
  const feeInUSD = isAurelisPeer ? 0 : 4.99;
  const fromRate = (CURRENCIES[safeFrom] || CURRENCIES.USD).rateToUSD || 1.0;
  const feeInFromCurrency = feeInUSD / fromRate;
  const totalCharged = safeAmount + feeInFromCurrency;

  return {
    rate,
    converted,
    fee: feeInFromCurrency,
    totalCharged,
    estimatedArrival: isAurelisPeer ? 'Instant (within seconds)' : 'Today, ~14:30 EST',
  };
}

export function generateTxnId(): string {
  const chars = '0123456789ABCDEF';
  let hash = '';
  for (let i = 0; i < 8; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TXN-${hash}`;
}
