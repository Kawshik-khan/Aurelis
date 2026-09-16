import React from 'react';
import { clsx } from 'clsx';
import { TransactionStatus } from '../../types';

export interface BadgeProps {
  status?: TransactionStatus | 'success' | 'warning' | 'error' | 'neutral' | 'gold';
  children: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  status = 'neutral',
  children,
  size = 'md',
  className,
}) => {
  const statusStyles: Record<string, string> = {
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/80 font-semibold shadow-xs',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/80 font-semibold shadow-xs',
    Pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80 font-medium',
    Processing: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/80 font-medium',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80 font-medium',
    Failed: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/80 font-semibold',
    error: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/80 font-semibold',
    Cancelled: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-[#0E0E18] dark:text-slate-400 dark:border-slate-800 font-medium',
    neutral: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-[#0E0E18] dark:text-slate-300 dark:border-slate-800 font-medium',
    gold: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-800 font-semibold',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 font-medium tracking-wide uppercase',
    md: 'text-xs px-2.5 py-1 font-medium tracking-wide',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-full border shrink-0',
        statusStyles[status] || statusStyles.neutral,
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
};
