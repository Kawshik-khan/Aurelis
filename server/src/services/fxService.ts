import { db } from '../db/database';
import { CurrencyCode, FXRateLock } from '../types';

export const BASE_RATES_TO_USD: Record<CurrencyCode, number> = {
  USD: 1.0000,
  EUR: 1.1765,
  GBP: 1.2850,
  BDT: 0.008333,
  CHF: 1.1250,
  JPY: 0.00662,
  CAD: 0.7350,
  AUD: 0.6550,
  SGD: 0.7480,
  AED: 0.2723,
};

export class FXService {
  public static getRate(from: CurrencyCode, to: CurrencyCode): number {
    if (from === to) return 1.0;
    const fromUSD = BASE_RATES_TO_USD[from] || 1.0;
    const toUSD = BASE_RATES_TO_USD[to] || 1.0;
    return fromUSD / toUSD;
  }

  public static getAllRates(): Record<string, number> {
    const currencies = Object.keys(BASE_RATES_TO_USD) as CurrencyCode[];
    const matrix: Record<string, number> = {};

    for (const from of currencies) {
      for (const to of currencies) {
        if (from !== to) {
          matrix[`${from}/${to}`] = Number(this.getRate(from, to).toFixed(6));
        }
      }
    }
    return matrix;
  }

  /**
   * Lock a rate for 60 seconds (Redis TTL emulation)
   */
  public static async createRateLock(
    from: CurrencyCode,
    to: CurrencyCode,
    fromAmount: number
  ): Promise<FXRateLock> {
    const rate = this.getRate(from, to);
    const toAmount = fromAmount * rate;
    const quoteId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const lock: FXRateLock = {
      quoteId,
      fromCurrency: from,
      toCurrency: to,
      rate,
      fromAmount,
      toAmount,
      fee: 0.00, // Zero markup on Aurelis private exchange
      expiresAt: Date.now() + 60 * 1000, // 60 seconds TTL
    };

    await db.rateLocks.set(quoteId, lock);
    return lock;
  }

  /**
   * Verify rate lock validity before execution
   */
  public static async verifyRateLock(quoteId: string): Promise<FXRateLock | null> {
    const lock = await db.rateLocks.get(quoteId);
    if (!lock) return null;

    if (Date.now() > lock.expiresAt) {
      await db.rateLocks.delete(quoteId);
      return null;
    }
    return lock;
  }

  public static getHistoricalTrend(pair: string): Array<{ time: string; rate: number }> {
    const [from, to] = (pair.split('/') as [CurrencyCode, CurrencyCode]);
    const currentRate = this.getRate(from || 'USD', to || 'EUR');

    return [
      { time: 'Aug 23', rate: Number((currentRate * 0.995).toFixed(4)) },
      { time: 'Aug 24', rate: Number((currentRate * 0.998).toFixed(4)) },
      { time: 'Aug 25', rate: Number((currentRate * 0.996).toFixed(4)) },
      { time: 'Aug 26', rate: Number((currentRate * 1.002).toFixed(4)) },
      { time: 'Aug 27', rate: Number((currentRate * 1.004).toFixed(4)) },
      { time: 'Aug 28', rate: Number((currentRate * 1.001).toFixed(4)) },
      { time: 'Aug 29', rate: Number(currentRate.toFixed(4)) },
    ];
  }
}
