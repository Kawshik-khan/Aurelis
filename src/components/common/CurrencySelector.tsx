import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { CurrencyCode } from '../../types';
import { CURRENCIES, formatCurrency } from '../../utils/currency';
import { useApp } from '../../context/AppContext';
import { CurrencyBadge } from './CurrencyBadge';
import { clsx } from 'clsx';

interface CurrencySelectorProps {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
  allowedCurrencies?: CurrencyCode[];
  showBalance?: boolean;
  className?: string;
  label?: string;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  value,
  onChange,
  allowedCurrencies,
  showBalance = false,
  className,
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { wallets } = useApp();

  const activeMeta = CURRENCIES[value] || CURRENCIES.USD;
  const currencyList = (allowedCurrencies || (Object.keys(CURRENCIES) as CurrencyCode[])).map(
    (code) => CURRENCIES[code]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getWalletBalance = (curr: CurrencyCode) => {
    const w = wallets.find((item) => item.currency === curr);
    return w ? w.balance : 0;
  };

  return (
    <div className={clsx('relative flex flex-col gap-1.5', className)} ref={dropdownRef}>
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all duration-200 text-sm font-medium focus:outline-none focus:ring-2 shadow-xs',
          'bg-black/[0.03] dark:bg-white/[0.04] border-gray-300 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/25 text-gray-900 dark:text-white focus:ring-blue-500/20 dark:focus:ring-white/10'
        )}
      >
        <div className="flex items-center gap-2">
          <CurrencyBadge currency={activeMeta.code} size="xs" />
          <span className="font-semibold tracking-wide text-gray-900 dark:text-white">{activeMeta.code}</span>
        </div>
        <ChevronDown
          className={clsx(
            'w-4 h-4 text-gray-400 dark:text-slate-400 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 max-h-72 overflow-y-auto bg-white/95 dark:bg-[#0E0E18]/95 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl dark:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.85)] z-50 p-1.5 animate-scale-in">
          <div className="text-[10px] uppercase font-semibold tracking-wider text-gray-400 dark:text-slate-400 px-3 py-1.5">
            Select Currency
          </div>
          {currencyList.map((c) => {
            const isSelected = c.code === value;
            const bal = getWalletBalance(c.code);

            return (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  onChange(c.code);
                  setIsOpen(false);
                }}
                className={clsx(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors',
                  isSelected
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-slate-300'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <CurrencyBadge currency={c.code} size="xs" />
                  <div>
                    <div className={clsx('font-medium flex items-center gap-1.5', isSelected ? 'text-white' : 'text-gray-900 dark:text-white')}>
                      <span>{c.code}</span>
                      <span className={clsx('text-[11px] font-normal', isSelected ? 'text-blue-100' : 'text-gray-500 dark:text-slate-400')}>
                        ({c.name})
                      </span>
                    </div>
                    {showBalance && (
                      <div className={clsx('text-[10px] font-mono-nums', isSelected ? 'text-blue-200' : 'text-gray-500 dark:text-slate-400')}>
                        Bal: {formatCurrency(bal, c.code)}
                      </div>
                    )}
                  </div>
                </div>

                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
