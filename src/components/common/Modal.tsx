import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
  showCloseButton = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={clsx(
          'relative w-full glass-bento rounded-3xl overflow-hidden z-10 animate-scale-in my-auto text-gray-900 dark:text-white shadow-[0_24px_64px_-8px_rgba(0,0,0,0.15)] dark:shadow-[0_24px_64px_-8px_rgba(0,0,0,0.85)]',
          maxWidthStyles[maxWidth]
        )}
      >
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-200 dark:border-white/10">
            <div>
              {title && (
                <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{subtitle}</p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
