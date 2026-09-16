import React from 'react';
import { clsx } from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-1.5 rounded-lg gap-1.5',
    md: 'text-sm px-5 py-2.5 rounded-xl gap-2',
    lg: 'text-base px-6 py-3.5 rounded-xl gap-2.5 font-semibold',
  };

  const variantStyles = {
    primary:
      'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_4px_14px_rgba(0,102,255,0.4)] focus-visible:ring-blue-500 border border-blue-400/30 active:bg-blue-700',
    secondary:
      'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-200 hover:border-gray-300 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] dark:text-white dark:border-white/10 dark:hover:border-white/20 shadow-sm backdrop-blur-md focus-visible:ring-gray-300 dark:focus-visible:ring-white/20 active:bg-gray-200 dark:active:bg-white/[0.04]',
    outline:
      'bg-transparent text-gray-800 border border-gray-300 hover:border-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:text-white dark:border-white/15 dark:hover:border-white/30 dark:hover:bg-white/[0.06] dark:hover:text-white focus-visible:ring-gray-300 dark:focus-visible:ring-white/20',
    ghost:
      'bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/[0.06] focus-visible:ring-gray-300 dark:focus-visible:ring-white/20',
    destructive:
      'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500 shadow-sm',
    gold:
      'bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white shadow-[0_4px_14px_rgba(0,102,255,0.35)] focus-visible:ring-blue-500',
  };

  return (
    <button
      className={clsx(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
