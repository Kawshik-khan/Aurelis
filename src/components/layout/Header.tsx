import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  Send,
  Plus,
  Shield,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { clsx } from 'clsx';

interface HeaderProps {
  onOpenNotifications: () => void;
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNotifications,
  onOpenSearch,
}) => {
  const {
    user,
    unreadNotificationsCount,
    openModal,
    setCurrentTab,
    logout,
    preferredDisplayCurrency,
    setPreferredDisplayCurrency,
  } = useApp();

  const { isDark, toggleTheme } = useTheme();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className={clsx(
        'sticky top-0 z-20 backdrop-blur-2xl border-b px-4 sm:px-8 py-3 flex items-center justify-between gap-4 transition-all theme-transition',
        isDark
          ? 'bg-[#0A0A12]/80 border-white/10 text-white'
          : 'bg-white/80 border-gray-200 text-gray-900'
      )}
    >
      {/* Mobile Brand Title (visible only on mobile) */}
      <div
        onClick={() => setCurrentTab('dashboard')}
        className="flex lg:hidden items-center gap-2.5 cursor-pointer"
      >
        <div className="w-8 h-8 rounded-lg bg-[#E60000] flex items-center justify-center text-white shadow-[0_2px_12px_rgba(230,0,0,0.4)]">
          <span className="font-black text-xs">DBS</span>
        </div>
        <span className={clsx('text-base font-black tracking-tight', isDark ? 'text-white' : 'text-gray-900')}>
          DBS BANK
        </span>
      </div>

      {/* Global Search Bar (triggers search overlay) */}
      <div className="flex-1 max-w-md hidden sm:flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSearch}
          className={clsx(
            'flex-1 flex items-center justify-between px-3.5 py-2 rounded-xl border text-left text-xs transition-all shadow-xs group',
            isDark
              ? 'bg-white/[0.04] border-white/10 hover:border-white/20 text-slate-400 hover:text-slate-200'
              : 'bg-gray-100/80 border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-700'
          )}
        >
          <div className="flex items-center gap-2.5">
            <Search className={clsx('w-4 h-4 transition-colors', isDark ? 'text-slate-400 group-hover:text-red-400' : 'text-gray-400 group-hover:text-red-500')} />
            <span>Search transactions, beneficiaries, bKash, banks...</span>
          </div>
          <kbd className={clsx(
            'hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono rounded',
            isDark
              ? 'bg-white/[0.06] border border-white/10 text-slate-400'
              : 'bg-gray-200/60 border border-gray-300 text-gray-500'
          )}>
            ⌘K
          </kbd>
        </button>

        {/* Live Network Sync Telemetry */}
        <div className={clsx(
          'hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono',
          isDark
            ? 'bg-white/[0.04] border-white/10 text-blue-400'
            : 'bg-blue-50 border-blue-200 text-blue-600'
        )}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span>LIVE 4ms</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3 ml-auto">
        {/* Quick Send Button */}
        <Button
          size="sm"
          variant="primary"
          onClick={() => openModal('send')}
          leftIcon={<Send className="w-3.5 h-3.5" />}
          className="hidden sm:inline-flex"
        >
          Send
        </Button>

        {/* Quick Add Funds Button */}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => openModal('add-funds')}
          leftIcon={<Plus className="w-3.5 h-3.5 text-blue-400" />}
          className="hidden md:inline-flex"
        >
          Add Money
        </Button>

        {/* ৳ BDT / $ USD Currency Switcher Pill */}
        <div className="hidden sm:inline-flex items-center bg-black/[0.04] dark:bg-white/[0.06] rounded-xl p-1 border border-black/10 dark:border-white/15 shadow-xs">
          <button
            type="button"
            onClick={() => setPreferredDisplayCurrency('BDT')}
            className={clsx(
              'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1',
              preferredDisplayCurrency === 'BDT'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            )}
            title="Display amounts in Bangladeshi Taka (BDT)"
          >
            <span>৳ BDT</span>
          </button>
          <button
            type="button"
            onClick={() => setPreferredDisplayCurrency('USD')}
            className={clsx(
              'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1',
              preferredDisplayCurrency === 'USD'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            )}
            title="Display amounts in US Dollars (USD)"
          >
            <span>$ USD</span>
          </button>
        </div>

        {/* 🌗 Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className={clsx(
            'relative p-2.5 rounded-xl border shadow-xs transition-all overflow-hidden group',
            isDark
              ? 'bg-white/[0.04] border-white/10 hover:border-white/20 hover:bg-white/5 text-slate-300 hover:text-amber-300'
              : 'bg-gray-100/80 border-gray-200 hover:border-gray-300 hover:bg-gray-200/80 text-gray-500 hover:text-indigo-600'
          )}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <div className="relative w-4 h-4">
            <Sun
              className={clsx(
                'absolute inset-0 w-4 h-4 transition-all duration-300',
                isDark
                  ? 'opacity-0 rotate-90 scale-50'
                  : 'opacity-100 rotate-0 scale-100 text-amber-500'
              )}
            />
            <Moon
              className={clsx(
                'absolute inset-0 w-4 h-4 transition-all duration-300',
                isDark
                  ? 'opacity-100 rotate-0 scale-100'
                  : 'opacity-0 -rotate-90 scale-50'
              )}
            />
          </div>
        </button>

        {/* Search button on small screens */}
        <button
          onClick={onOpenSearch}
          className={clsx(
            'sm:hidden p-2 rounded-xl border border-transparent transition-colors',
            isDark
              ? 'text-slate-400 hover:text-white hover:bg-white/5 hover:border-white/10'
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100 hover:border-gray-200'
          )}
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Notification Bell */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className={clsx(
            'relative p-2.5 rounded-xl border shadow-xs transition-all',
            isDark
              ? 'bg-white/[0.04] border-white/10 hover:border-white/20 hover:bg-white/5 text-slate-300 hover:text-white'
              : 'bg-gray-100/80 border-gray-200 hover:border-gray-300 hover:bg-gray-200/80 text-gray-500 hover:text-gray-700'
          )}
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className={clsx(
              'absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 animate-pulse ring-2',
              isDark ? 'ring-[#0A0A12]' : 'ring-white'
            )} />
          )}
        </button>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className={clsx(
              'flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl border transition-all text-left shadow-xs',
              isDark
                ? 'bg-white/[0.04] border-white/10 hover:border-white/20'
                : 'bg-gray-100/80 border-gray-200 hover:border-gray-300'
            )}
          >
            <Avatar src={user.avatar} name={user.name} size="sm" />
            <span className={clsx('hidden md:inline-block text-xs font-semibold max-w-[100px] truncate', isDark ? 'text-white' : 'text-gray-900')}>
              {user.name.split(' ')[0]}
            </span>
            <ChevronDown className={clsx('w-3 h-3', isDark ? 'text-slate-400' : 'text-gray-400')} />
          </button>

          {profileDropdownOpen && (
            <div className={clsx(
              'absolute right-0 mt-2 w-64 backdrop-blur-xl rounded-2xl border shadow-[0_16px_40px_-8px_rgba(0,0,0,0.3)] z-50 p-2 animate-scale-in',
              isDark
                ? 'bg-[#0E0E18]/95 border-white/10'
                : 'bg-white/95 border-gray-200'
            )}>
              <div className={clsx('px-3 py-2.5 border-b mb-1', isDark ? 'border-white/10' : 'border-gray-200')}>
                <div className={clsx('text-xs font-bold', isDark ? 'text-white' : 'text-gray-900')}>{user.name}</div>
                <div className={clsx('text-[11px] truncate', isDark ? 'text-slate-400' : 'text-gray-500')}>{user.email}</div>
                {user.tier && (
                  <div className={clsx(
                    'mt-1.5 inline-block text-[10px] uppercase font-bold tracking-wider text-blue-400 px-2 py-0.5 rounded-md border',
                    isDark ? 'bg-white/[0.06] border-white/10' : 'bg-blue-50 border-blue-200'
                  )}>
                    {user.tier}
                  </div>
                )}
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setCurrentTab('profile');
                    setProfileDropdownOpen(false);
                  }}
                  className={clsx(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors text-left',
                    isDark
                      ? 'text-slate-300 hover:bg-blue-950/50 hover:text-white'
                      : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                  )}
                >
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span>Security & Profile</span>
                </button>

                <div className={clsx('my-1 border-t', isDark ? 'border-slate-800' : 'border-gray-200')} />

                <button
                  onClick={() => {
                    logout();
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-950/40 transition-colors text-left font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Lock Vault & Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
