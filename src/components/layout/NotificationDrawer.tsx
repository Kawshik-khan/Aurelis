import React, { useState } from 'react';
import { X, CheckCheck, ArrowUpRight, ArrowDownLeft, ShieldAlert, TrendingUp, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../common/Button';
import { clsx } from 'clsx';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    transactions,
    openTxnDetail,
  } = useApp();

  const { isDark } = useTheme();

  const [activeFilter, setActiveFilter] = useState<'all' | 'transfer' | 'security'>('all');

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'all') return true;
    return n.type === activeFilter;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'transfer':
        return <ArrowUpRight className="w-4 h-4 text-blue-600" />;
      case 'security':
        return <ShieldAlert className="w-4 h-4 text-amber-600" />;
      case 'rate':
        return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      default:
        return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  const handleNotificationClick = (notifId: string, linkedTxnId?: string) => {
    markNotificationRead(notifId);
    if (linkedTxnId) {
      const txn = transactions.find((t) => t.id === linkedTxnId);
      if (txn) {
        onClose();
        openTxnDetail(txn);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className={clsx('fixed inset-0 backdrop-blur-sm transition-opacity duration-300 animate-fade-in', isDark ? 'bg-black/60' : 'bg-black/30')}
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className={clsx(
          'w-screen max-w-md backdrop-blur-2xl border-l flex flex-col animate-slide-up theme-transition',
          isDark
            ? 'bg-[#0A0A12]/85 border-white/10 shadow-[0_24px_64px_-8px_rgba(0,0,0,0.9)] text-white'
            : 'bg-white/95 border-gray-200 shadow-[0_24px_64px_-8px_rgba(0,0,0,0.15)] text-gray-900'
        )}>
          {/* Header */}
          <div className={clsx('px-6 py-5 border-b flex items-center justify-between', isDark ? 'border-white/10' : 'border-gray-200')}>
            <div>
              <h2 className={clsx('text-lg font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                Notifications
              </h2>
              <p className={clsx('text-xs mt-0.5', isDark ? 'text-slate-400' : 'text-gray-500')}>
                Private wealth activity & security alerts
              </p>
            </div>

            <button
              onClick={onClose}
              className={clsx(
                'p-1.5 rounded-lg transition-colors',
                isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Bar & Mark Read */}
          <div className={clsx('px-6 py-3 border-b flex items-center justify-between gap-2', isDark ? 'border-white/10' : 'border-gray-200')}>
            <div className="flex items-center gap-1.5">
              {(['all', 'transfer', 'security'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={clsx(
                    'px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors',
                    activeFilter === filter
                      ? 'bg-blue-600 text-white font-semibold'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>

            <button
              onClick={markAllNotificationsRead}
              className={clsx(
                'text-xs flex items-center gap-1 transition-colors',
                isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-16">
                <div className={clsx(
                  'w-12 h-12 rounded-full border flex items-center justify-center mx-auto mb-3',
                  isDark ? 'bg-white/[0.04] border-white/10 text-slate-400' : 'bg-gray-100 border-gray-200 text-gray-400'
                )}>
                  <Info className="w-5 h-5" />
                </div>
                <p className={clsx('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>All caught up</p>
                <p className={clsx('text-xs mt-1', isDark ? 'text-slate-400' : 'text-gray-500')}>
                  No new notifications in this category
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif.id, notif.linkedTxnId)}
                  className={clsx(
                    'p-4 rounded-2xl border transition-all cursor-pointer relative group',
                    notif.isRead
                      ? isDark
                        ? 'bg-white/[0.03] border-white/10 hover:border-white/20 shadow-xs'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300 shadow-xs'
                      : isDark
                        ? 'bg-blue-500/10 border-white/20 hover:border-white/30 shadow-xs'
                        : 'bg-blue-50 border-blue-200 hover:border-blue-300 shadow-xs'
                  )}
                >
                  {!notif.isRead && (
                    <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500" />
                  )}

                  <div className="flex items-start gap-3">
                    <div className={clsx(
                      'p-2 rounded-xl border shrink-0 shadow-xs',
                      isDark ? 'bg-white/[0.04] border-white/10' : 'bg-gray-100 border-gray-200'
                    )}>
                      {getIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <div className={clsx('text-xs font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                        {notif.title}
                      </div>
                      <p className={clsx('text-xs mt-1 leading-relaxed', isDark ? 'text-slate-400' : 'text-gray-500')}>
                        {notif.description}
                      </p>
                      <div className={clsx('mt-2 text-[10px] font-mono-nums flex items-center justify-between', isDark ? 'text-slate-500' : 'text-gray-400')}>
                        <span>{notif.timestamp}</span>
                        {notif.linkedTxnId && (
                          <span className="text-blue-400 font-semibold group-hover:underline">
                            View Receipt →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
