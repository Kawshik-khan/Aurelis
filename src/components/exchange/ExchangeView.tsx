import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeftRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  Check,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { CurrencyCode } from '../../types';
import { CURRENCIES, formatCurrency, getExchangeRate } from '../../utils/currency';
import { Button } from '../common/Button';
import { CurrencySelector } from '../common/CurrencySelector';
import { clsx } from 'clsx';

export const ExchangeView: React.FC = () => {
  const { wallets, exchangeCurrency, openTxnDetail } = useApp();
  const { isDark } = useTheme();

  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>('USD');
  const [toCurrency, setToCurrency] = useState<CurrencyCode>('EUR');
  const [fromAmountStr, setFromAmountStr] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [rateCountdown, setRateCountdown] = useState(60);

  // Rate lock countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setRateCountdown((prev) => (prev > 1 ? prev - 1 : 60));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fromWallet = wallets.find((w) => w.currency === fromCurrency);
  const availableBalance = fromWallet ? fromWallet.balance : 0;

  const currentRate = useMemo(
    () => getExchangeRate(fromCurrency, toCurrency),
    [fromCurrency, toCurrency]
  );

  const parsedFromAmount = parseFloat(fromAmountStr) || 0;
  const toAmount = parsedFromAmount * currentRate;
  const isInsufficient = parsedFromAmount > availableBalance;

  const handleSwap = () => {
    setIsSwapping(true);
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
    setTimeout(() => setIsSwapping(false), 300);
  };

  const handleConvert = async () => {
    if (parsedFromAmount <= 0 || isInsufficient) return;
    setIsConverting(true);

    try {
      const txn = await exchangeCurrency(
        fromCurrency,
        toCurrency,
        parsedFromAmount,
        toAmount,
        currentRate
      );
      setIsConverting(false);
      openTxnDetail(txn);
    } catch {
      setIsConverting(false);
    }
  };

  const selectPair = (from: CurrencyCode, to: CurrencyCode) => {
    setFromCurrency(from);
    setToCurrency(to);
  };

  const pairKey = `${fromCurrency}/${toCurrency}`;

  interface TrendPoint {
    time: string;
    rate: number;
  }

  const trendData: TrendPoint[] = [

    { time: 'Aug 23', rate: currentRate * 0.995 },
    { time: 'Aug 24', rate: currentRate * 0.998 },
    { time: 'Aug 25', rate: currentRate * 0.996 },
    { time: 'Aug 26', rate: currentRate * 1.002 },
    { time: 'Aug 27', rate: currentRate * 1.004 },
    { time: 'Aug 28', rate: currentRate * 1.001 },
    { time: 'Aug 29', rate: currentRate },
  ];

  // SVG dimensions for trend sparkline
  const minRate = Math.min(...trendData.map((d: TrendPoint) => d.rate)) * 0.998;
  const maxRate = Math.max(...trendData.map((d: TrendPoint) => d.rate)) * 1.002;
  const svgWidth = 600;
  const svgHeight = 160;
  const padding = 20;

  const points = trendData.map((d: TrendPoint, i: number) => {
    const x = padding + (i / (trendData.length - 1)) * (svgWidth - padding * 2);
    const y =
      svgHeight -
      padding -
      ((d.rate - minRate) / (maxRate - minRate)) * (svgHeight - padding * 2);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc: string, p: { x: number; y: number }, i: number) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cpX = (prev.x + p.x) / 2;
    return `${acc} C ${cpX} ${prev.y}, ${cpX} ${p.y}, ${p.x} ${p.y}`;
  }, '');


  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-16 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Institutional FX Execution
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mt-1">
            Currency Exchange
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time interbank foreign exchange with zero markups and guaranteed 60-second rate locks.
          </p>
        </div>

        {/* Rate Lock Timer */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-xs font-mono text-slate-700 dark:text-slate-300 shadow-xs self-start sm:self-auto">
          <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-pulse" />
          <span>Guaranteed rate: {rateCountdown}s</span>
        </div>
      </div>

      {/* Popular Currency Pairs Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">
          Popular Pairs:
        </span>
        {[
          { from: 'USD', to: 'EUR' },
          { from: 'USD', to: 'GBP' },
          { from: 'USD', to: 'BDT' },
          { from: 'EUR', to: 'GBP' },
          { from: 'GBP', to: 'BDT' },
          { from: 'USD', to: 'CHF' },
        ].map((pair) => {
          const isSelected = fromCurrency === pair.from && toCurrency === pair.to;
          return (
            <button
              key={`${pair.from}-${pair.to}`}
              onClick={() => selectPair(pair.from as CurrencyCode, pair.to as CurrencyCode)}
              className={clsx(
                'px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide shrink-0 transition-all border shadow-xs',
                isSelected
                  ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                  : 'bg-black/[0.04] dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              {pair.from} / {pair.to}
            </button>
          );
        })}
      </div>

      {/* Main Centered Conversion Console */}
      <div className="glass-bento p-6 sm:p-8 relative text-gray-900 dark:text-white">
        <div className="space-y-4">
          {/* FROM CARD */}
          <div className="p-5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] space-y-3 transition-all focus-within:border-blue-500/50 focus-within:bg-black/[0.05] dark:focus-within:bg-white/[0.06] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                FROM
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-nums">
                Vault Balance: {formatCurrency(availableBalance, fromCurrency)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-400 dark:text-slate-500 absolute left-0 top-1/2 -translate-y-1/2">
                  {CURRENCIES[fromCurrency].symbol}
                </span>
                <input
                  type="number"
                  step="any"
                  value={fromAmountStr}
                  onChange={(e) => setFromAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white pl-8 focus:outline-none font-mono-nums"
                />
              </div>

              <div className="w-36 sm:w-44 shrink-0">
                <CurrencySelector
                  value={fromCurrency}
                  onChange={setFromCurrency}
                  showBalance
                />
              </div>
            </div>

            {/* Quick percentage buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setFromAmountStr((availableBalance * 0.25).toFixed(2))}
                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-black/[0.04] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 text-slate-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white shadow-xs"
              >
                25%
              </button>
              <button
                type="button"
                onClick={() => setFromAmountStr((availableBalance * 0.50).toFixed(2))}
                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-black/[0.04] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 text-slate-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white shadow-xs"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => setFromAmountStr(availableBalance.toFixed(2))}
                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-black/[0.04] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 text-slate-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white shadow-xs"
              >
                Max ({formatCurrency(availableBalance, fromCurrency)})
              </button>
            </div>
          </div>

          {/* SWAP BUTTON ICON */}
          <div className="flex justify-center -my-2 relative z-10">
            <button
              type="button"
              onClick={handleSwap}
              className={clsx(
                'w-11 h-11 rounded-full bg-white dark:bg-[#0A1020] border border-black/15 dark:border-white/20 hover:border-blue-400 shadow-md flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-all duration-300 active:scale-95',
                isSwapping && 'rotate-180'
              )}
              aria-label="Swap source and destination currencies"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          {/* TO CARD */}
          <div className="p-5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] space-y-3 transition-all shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                TO (ESTIMATED SETTLEMENT)
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-nums">
                Target: {CURRENCIES[toCurrency].name}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 absolute left-0 top-1/2 -translate-y-1/2">
                  {CURRENCIES[toCurrency].symbol}
                </span>
                <div className="w-full text-3xl sm:text-4xl font-extrabold text-blue-600 dark:text-blue-400 pl-8 font-mono-nums truncate">
                  {new Intl.NumberFormat('en-US', {
                    minimumFractionDigits: CURRENCIES[toCurrency].decimals,
                    maximumFractionDigits: CURRENCIES[toCurrency].decimals,
                  }).format(toAmount)}
                </div>
              </div>

              <div className="w-36 sm:w-44 shrink-0">
                <CurrencySelector
                  value={toCurrency}
                  onChange={setToCurrency}
                  showBalance
                />
              </div>
            </div>
          </div>
        </div>

        {/* Rate & Fee Breakdown */}
        <div className="mt-6 pt-5 border-t border-black/10 dark:border-white/10 space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>Exchange rate</span>
            <span className="font-mono font-bold text-gray-900 dark:text-white">
              1 {fromCurrency} = {currentRate.toFixed(4)} {toCurrency}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>DBS Bank fee</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">$0.00 (Zero Spread Markup)</span>
          </div>

          <div className="flex items-center justify-between text-sm font-bold text-gray-900 dark:text-white pt-2 border-t border-black/10 dark:border-white/10">
            <span>You'll receive</span>
            <span className="text-lg text-blue-600 dark:text-blue-400 font-extrabold font-mono-nums">
              {formatCurrency(toAmount, toCurrency)}
            </span>
          </div>
        </div>

        {isInsufficient && (
          <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-3">
            Insufficient funds in {fromCurrency} wallet ({formatCurrency(availableBalance, fromCurrency)} available).
          </p>
        )}

        {/* CTA Convert Button */}
        <div className="mt-6">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleConvert}
            disabled={parsedFromAmount <= 0 || isInsufficient || fromCurrency === toCurrency}
            isLoading={isConverting}
            leftIcon={<Sparkles className="w-5 h-5 text-white" />}
          >
            Convert Currency Now
          </Button>
        </div>
      </div>

      {/* FX Market Trend & Interbank Metrics */}
      <div className="glass-bento p-6 sm:p-7 text-gray-900 dark:text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
              {pairKey} Spot Market Trend (7-Day)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live mid-market rates straight from institutional liquidity providers
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
            <TrendingUp className="w-4 h-4" />
            <span>High: {maxRate.toFixed(4)} · Low: {minRate.toFixed(4)}</span>
          </div>
        </div>

        {/* Sparkline Chart */}
        <div className="relative w-full h-36">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <line
              x1={padding}
              y1={padding}
              x2={svgWidth - padding}
              y2={padding}
              stroke={isDark ? '#1E293B' : '#E2E8F0'}
              strokeDasharray="4 4"
            />
            <line
              x1={padding}
              y1={svgHeight - padding}
              x2={svgWidth - padding}
              y2={svgHeight - padding}
              stroke={isDark ? '#1E293B' : '#E2E8F0'}
            />
            <path
              d={pathD}
              fill="none"
              stroke="#0066FF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((p: { x: number; y: number }, i: number) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill="#0066FF"
                stroke={isDark ? '#0A0A12' : '#FFFFFF'}
                strokeWidth="2"
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
};
