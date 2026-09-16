import React from 'react';
import { clsx } from 'clsx';

export interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  className,
}) => {
  const getInitials = (str: string) => {
    if (!str) return 'A';
    const parts = str.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const sizeStyles = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  return (
    <div
      className={clsx(
        'relative shrink-0 rounded-full overflow-hidden flex items-center justify-center font-medium border border-blue-200 dark:border-white/15 bg-blue-50 dark:bg-white/[0.06] text-blue-600 dark:text-blue-300 select-none',
        sizeStyles[size],
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : (
        <span className="tracking-tight">{getInitials(name)}</span>
      )}
    </div>
  );
};
