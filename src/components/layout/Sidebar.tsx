import React from 'react';
import {
  LayoutDashboard,
  SendHorizontal,
  ArrowDownLeft,
  ArrowLeftRight,
  ReceiptText,
  Users,
  WalletCards,
  CreditCard,
  Settings,
  HelpCircle,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { NavigationTab } from '../../types';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../common/Avatar';
import { clsx } from 'clsx';

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const { currentTab, setCurrentTab, user, openModal, logout } = useApp();
  const { isDark } = useTheme();

  const mainNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'send', label: 'Send Money', icon: SendHorizontal },
    { id: 'receive', label: 'Receive', icon: ArrowDownLeft },
    { id: 'exchange', label: 'Exchange', icon: ArrowLeftRight },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText },
    { id: 'recipients', label: 'Recipients', icon: Users },
    { id: 'wallets', label: 'Wallets', icon: WalletCards },
    { id: 'cards', label: 'Cards', icon: CreditCard },
  ];

  const secondaryNavItems: NavItem[] = [
    { id: 'profile', label: 'Security & Profile', icon: ShieldCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={clsx(
        'hidden lg:flex flex-col w-64 xl:w-72 backdrop-blur-2xl border-r h-screen sticky top-0 shrink-0 z-30 select-none theme-transition',
        isDark
          ? 'bg-[#0A0A12]/80 border-white/10 text-white'
          : 'bg-white/90 border-gray-200 text-gray-900'
      )}
    >
      {/* Brand Header */}
      <div className={clsx('px-6 py-6 border-b flex items-center justify-between', isDark ? 'border-white/10' : 'border-gray-200')}>
        <div
          onClick={() => setCurrentTab('dashboard')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          {/* Modern Electric Blue Seal Emblem */}
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-[0_4px_16px_rgba(0,102,255,0.4)] group-hover:bg-blue-500 transition-colors">
            <svg
              className="w-5 h-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="12 2 2 22 22 22" fill="currentColor" fillOpacity="0.2" />
              <path d="M12 2L2 22h20L12 2z" />
              <circle cx="12" cy="11" r="1.5" fill="currentColor" />
            </svg>
          </div>

          <div>
            <span className={clsx('text-lg font-extrabold tracking-tight block', isDark ? 'text-white' : 'text-gray-900')}>
              AURELIS
            </span>
            <span className="text-[10px] uppercase tracking-wider text-blue-400 font-bold block">
              Global Wealth
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation List */}
      <div className="flex-1 px-4 py-5 overflow-y-auto space-y-1">
        <div className={clsx('text-[10px] font-bold uppercase tracking-wider px-3 mb-2', isDark ? 'text-slate-500' : 'text-gray-400')}>
          Banking & Transfers
        </div>

        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={clsx(
                'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-blue-600 text-white shadow-[0_4px_16px_rgba(0,102,255,0.35)] font-semibold'
                  : isDark
                    ? 'text-slate-400 hover:text-white hover:bg-white/5'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={clsx(
                    'w-4 h-4 transition-colors',
                    isActive
                      ? 'text-white'
                      : isDark
                        ? 'text-slate-400 group-hover:text-blue-400'
                        : 'text-gray-400 group-hover:text-blue-500'
                  )}
                />
                <span>{item.label}</span>
              </div>

              {item.id === 'send' && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal('send');
                  }}
                  title="Quick Send"
                  className={clsx(
                    'text-[10px] px-1.5 py-0.5 rounded font-mono transition-opacity',
                    isActive
                      ? 'bg-white/20 text-white'
                      : isDark
                        ? 'bg-white/10 text-slate-400 opacity-0 group-hover:opacity-100'
                        : 'bg-gray-200 text-gray-500 opacity-0 group-hover:opacity-100'
                  )}
                >
                  ⌘S
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-5">
          <div className={clsx('text-[10px] font-bold uppercase tracking-wider px-3 mb-2', isDark ? 'text-slate-500' : 'text-gray-400')}>
            Governance & Security
          </div>

          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-blue-600 text-white shadow-[0_4px_16px_rgba(0,102,255,0.35)] font-semibold'
                    : isDark
                      ? 'text-slate-400 hover:text-white hover:bg-white/5'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                <Icon
                  className={clsx(
                    'w-4 h-4',
                    isActive ? 'text-white' : isDark ? 'text-slate-400' : 'text-gray-400'
                  )}
                />
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            onClick={() => alert('AURELIS 24/7 Institutional Wealth Concierge is active. Priority dispatch available.')}
            className={clsx(
              'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all',
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            )}
          >
            <HelpCircle className={clsx('w-4 h-4', isDark ? 'text-slate-400' : 'text-gray-400')} />
            <span>VIP Concierge</span>
          </button>
        </div>
      </div>

      {/* Profile & Tier Box in Footer */}
      <div className={clsx('p-3.5 border-t flex items-center justify-between gap-2', isDark ? 'border-white/10' : 'border-gray-200')}>
        <div
          onClick={() => setCurrentTab('profile')}
          className={clsx(
            'flex-1 flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-colors min-w-0',
            isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
          )}
        >
          <Avatar src={user.avatar} name={user.name} size="md" />
          <div className="min-w-0 flex-1">
            <div className={clsx('text-sm font-bold truncate', isDark ? 'text-white' : 'text-gray-900')}>
              {user.name}
            </div>
            <div className="text-[11px] text-blue-400 font-semibold flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block"></span>
              <span className="truncate">{user.tier}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          title="Lock Vault & Sign Out"
          className={clsx(
            'p-2 rounded-xl transition-colors shrink-0',
            isDark
              ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
              : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
          )}
          aria-label="Lock Vault"
        >
          <Lock className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
