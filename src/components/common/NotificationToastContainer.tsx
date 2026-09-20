import React from 'react';
import { Smartphone, Mail, X, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { clsx } from 'clsx';

export const NotificationToastContainer: React.FC = () => {
  const { activeToasts, dismissToast, openAlertPreview } = useApp();
  const { isDark } = useTheme();

  if (!activeToasts || activeToasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {activeToasts.map((toast) => {
        const isSms = toast.channel === 'SMS';
        const isEmail = toast.channel === 'EMAIL';

        return (
          <div
            key={toast.id}
            className={clsx(
              'pointer-events-auto rounded-2xl p-4 border backdrop-blur-xl shadow-2xl transition-all animate-slide-up flex flex-col gap-2 relative overflow-hidden',
              isDark
                ? 'bg-[#0B0E1A]/95 border-white/15 text-white shadow-[0_16px_36px_-6px_rgba(0,0,0,0.8)]'
                : 'bg-white/95 border-gray-200 text-gray-900 shadow-[0_16px_36px_-6px_rgba(0,0,0,0.15)]'
            )}
          >
            {/* Top Bar with Channel Badge & Dismiss */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={clsx(
                    'w-7 h-7 rounded-xl flex items-center justify-center border',
                    isSms
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-500'
                  )}
                >
                  {isSms ? <Smartphone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                </div>

                <div>
                  <div className="text-xs font-bold leading-none flex items-center gap-1.5">
                    <span>{toast.title}</span>
                    <ShieldCheck className="w-3 h-3 text-blue-500" />
                  </div>
                  {toast.recipient && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {toast.recipient}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => dismissToast(toast.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Message Body */}
            <p className="text-xs line-clamp-2 text-slate-600 dark:text-slate-300 pl-9">
              {toast.message}
            </p>

            {/* Action Bar */}
            {toast.alert && (
              <div className="flex items-center justify-end pt-1 border-t border-black/5 dark:border-white/5">
                <button
                  onClick={() => {
                    dismissToast(toast.id);
                    openAlertPreview(toast.alert!);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <span>{isSms ? 'Open SMS View' : 'Read Full Email'}</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
