import React from 'react';
import { CurrencyCode } from '../../types';
import { CURRENCIES } from '../../utils/currency';
import { clsx } from 'clsx';

interface CurrencyBadgeProps {
  currency: CurrencyCode;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const CurrencyBadge: React.FC<CurrencyBadgeProps> = ({
  currency,
  size = 'md',
  className,
}) => {
  const meta = CURRENCIES[currency] || CURRENCIES.USD;

  const sizeClasses = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-6 h-6 text-[11px]',
    md: 'w-7 h-7 text-xs',
    lg: 'w-8 h-8 text-sm',
  };

  return (
    <div
      className={clsx(
        'rounded-lg font-bold font-mono inline-flex items-center justify-center shrink-0 border select-none',
        'bg-blue-50 dark:bg-white/[0.06] text-blue-600 dark:text-blue-300 border-blue-200 dark:border-white/10 shadow-xs',
        sizeClasses[size],
        className
      )}
      title={`${meta.name} (${currency})`}
    >
      <span>{meta.symbol}</span>
    </div>
  );
};
