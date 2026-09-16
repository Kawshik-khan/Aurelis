import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftElement,
      rightElement,
      fullWidth = true,
      className,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={clsx('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftElement && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-gray-400 dark:text-slate-400">
              {leftElement}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={clsx(
              'w-full rounded-xl text-sm transition-all duration-200',
              'bg-black/[0.03] dark:bg-white/[0.04] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500',
              'border border-gray-300 dark:border-white/10 focus:border-blue-500 dark:focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-white/10 shadow-inner',
              'disabled:bg-gray-100 dark:disabled:bg-white/[0.02] disabled:text-gray-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed',
              leftElement ? 'pl-10' : 'pl-4',
              rightElement ? 'pr-10' : 'pr-4',
              'py-2.5 sm:py-3',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              className
            )}
            {...props}
          />

          {rightElement && (
            <div className="absolute right-3.5 flex items-center text-gray-400 dark:text-slate-400">
              {rightElement}
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-0.5">{error}</p>
        )}

        {!error && helperText && (
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
