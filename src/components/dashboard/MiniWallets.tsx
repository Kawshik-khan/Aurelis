import React from 'react';
import { Plus, ArrowUpRight, ArrowLeftRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CURRENCIES, formatCurrency } from '../../utils/currency';
import { CurrencyBadge } from '../common/CurrencyBadge';
import { clsx } from 'clsx';

export const MiniWallets: React.FC = () => {
  const { wallets, setCurrentTab, openModal, prefillSendModal } = useApp();

  return (
    <section className="space-y-3.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Active Multi-Currency Accounts
        </h2>
        <button
          onClick={() => setCurrentTab('wallets')}
          className="text-xs text-blue-400 hover:text-blue-300 font-bold hover:underline flex items-center gap-1"
        >
          <span>Manage Vaults</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {wallets.map((wallet) => {
          const meta = CURRENCIES[wallet.currency] || CURRENCIES.USD;

          return (
            <div
              key={wallet.id}
              onClick={() => setCurrentTab('wallets')}
              className={clsx(
                'group relative p-4 sm:p-5 rounded-2xl border transition-all duration-300 cursor-pointer backdrop-blur-xl',
                'hover:shadow-[0_10px_30px_-5px_rgba(0,102,255,0.2)] hover:-translate-y-0.5',
                wallet.isPrimary
                  ? 'bg-gradient-to-br from-blue-600/25 via-white/[0.06] to-white/[0.02] shadow-lg text-white border-white/25 border-t-white/40'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] shadow-md text-white border-white/10 border-t-white/20 hover:border-white/25'
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CurrencyBadge currency={wallet.currency} size="sm" />
                  <span className="text-xs font-bold text-white tracking-wide">
                    {wallet.currency}
                  </span>
                </div>

                {wallet.isPrimary ? (
                  <span className="text-[9px] uppercase font-bold tracking-wider text-blue-300 bg-white/10 px-2 py-0.5 rounded-md border border-white/15">
                    Primary
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {meta.country.slice(0, 3).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Balance */}
              <div className="text-base sm:text-lg font-extrabold font-mono-nums text-white tracking-tight truncate">
                {formatCurrency(wallet.balance, wallet.currency)}
              </div>

              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                {meta.name}
              </div>

              {/* Hover Quick Actions */}
              <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    prefillSendModal(undefined, undefined, wallet.currency);
                  }}
                  className="text-[11px] font-bold text-blue-400 hover:underline flex items-center gap-0.5"
                >
                  Send
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentTab('exchange');
                  }}
                  className="text-[11px] font-bold text-slate-400 hover:text-white hover:underline flex items-center gap-0.5"
                >
                  <ArrowLeftRight className="w-2.5 h-2.5" />
                  Swap
                </button>
              </div>
            </div>
          );
        })}

        {/* Add New Wallet Tile */}
        <button
          type="button"
          onClick={() => openModal('create-wallet')}
          className="p-4 rounded-2xl border border-dashed border-white/20 hover:border-white/40 bg-white/[0.02] hover:bg-white/[0.05] flex flex-col items-center justify-center gap-2 text-slate-300 hover:text-white transition-all group min-h-[110px] shadow-xs"
        >
          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-300 group-hover:text-white">Open Currency</span>
        </button>
      </div>
    </section>
  );
};
