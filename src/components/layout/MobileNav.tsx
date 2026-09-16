import React from 'react';
import {
  LayoutDashboard,
  SendHorizontal,
  ArrowLeftRight,
  ReceiptText,
  WalletCards,
} from 'lucide-react';
import { NavigationTab } from '../../types';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { clsx } from 'clsx';

export const MobileNav: React.FC = () => {
  const { currentTab, setCurrentTab, openModal } = useApp();
  const { isDark } = useTheme();

  const navItems = [
    { id: 'dashboard' as NavigationTab, label: 'Home', icon: LayoutDashboard },
    { id: 'send' as NavigationTab, label: 'Send', icon: SendHorizontal, isAction: true },
    { id: 'exchange' as NavigationTab, label: 'Exchange', icon: ArrowLeftRight },
    { id: 'transactions' as NavigationTab, label: 'History', icon: ReceiptText },
    { id: 'wallets' as NavigationTab, label: 'Wallets', icon: WalletCards },
  ];

  return (
    <nav
      className={clsx(
        'lg:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl border-t px-3 py-2 flex items-center justify-around safe-area-bottom theme-transition',
        isDark
          ? 'bg-[#0A0A12]/85 border-white/10 shadow-[0_-8px_24px_rgba(0,0,0,0.6)]'
          : 'bg-white/90 border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]'
      )}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => {
              if (item.isAction) {
                openModal('send');
              } else {
                setCurrentTab(item.id);
              }
            }}
            className={clsx(
              'flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all duration-200 min-w-[58px]',
              isActive && !item.isAction
                ? 'text-blue-500'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-gray-400 hover:text-gray-600'
            )}
          >
            {item.isAction ? (
              <div className={clsx(
                'w-11 h-11 -mt-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-[0_4px_16px_rgba(0,102,255,0.45)] border-2 active:scale-95 transition-transform',
                isDark ? 'border-[#0A0A12]' : 'border-white'
              )}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            ) : (
              <Icon
                className={clsx(
                  'w-5 h-5 transition-transform',
                  isActive ? 'scale-110 text-blue-500' : isDark ? 'text-slate-400' : 'text-gray-400'
                )}
              />
            )}
            <span
              className={clsx(
                'text-[10px] font-medium tracking-tight',
                isActive
                  ? 'font-bold text-blue-500'
                  : isDark ? 'text-slate-400' : 'text-gray-400'
              )}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
