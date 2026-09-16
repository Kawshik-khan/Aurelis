import React, { useState } from 'react';
import {
  Plus,
  Send,
  ArrowDownLeft,
  ArrowLeftRight,
  PlusCircle,
  ArrowUpRight,
  Copy,
  Check,
  Building2,
  ShieldCheck,
  Wallet as WalletIcon,
  WalletCards,
  Globe2,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CurrencyCode, Wallet } from '../../types';
import { CURRENCIES, formatCurrency } from '../../utils/currency';
import { Button } from '../common/Button';
import { CurrencyBadge } from '../common/CurrencyBadge';
import { AddFundsModal } from './AddFundsModal';
import { WithdrawModal } from './WithdrawModal';
import { CreateWalletModal } from './CreateWalletModal';
import { clsx } from 'clsx';

export const WalletsView: React.FC = () => {
  const {
    wallets,
    totalBalanceUSD,
    prefillSendModal,
    setDefaultWallet,
    setCurrentTab,
  } = useApp();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedWalletForAction, setSelectedWalletForAction] = useState<Wallet | null>(null);
  const [actionType, setActionType] = useState<'deposit' | 'withdraw' | null>(null);
  const [createWalletOpen, setCreateWalletOpen] = useState(false);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in pb-16 lg:pb-0">
      {/* Header Bento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-white/10 border border-blue-200/60 dark:border-white/15 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-2">
            <WalletCards className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>GLOBAL MULTI-CURRENCY VAULTS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Multi-Currency Vaults
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your sovereign fiat holding accounts, routing credentials, and cross-border liquidity rails.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setCreateWalletOpen(true)}
            leftIcon={<Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
          >
            Open Currency Vault
          </Button>

          <Button
            variant="primary"
            onClick={() => {
              setSelectedWalletForAction(wallets[0]);
              setActionType('deposit');
            }}
            leftIcon={<PlusCircle className="w-4 h-4 text-white" />}
            className="shadow-[0_8px_20px_-4px_rgba(0,102,255,0.4)]"
          >
            Deposit Capital
          </Button>
        </div>
      </div>

      {/* Total Consolidated Valuation Bento Card */}
      <div className="glass-bento rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-gray-900 dark:text-white">
        {/* Soft background blue blur */}
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Consolidated Treasury Valuation
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white font-mono tracking-tight">
            {formatCurrency(totalBalanceUSD, 'USD')}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            <span>{wallets.length} active fiat settlement vaults with instant clearing</span>
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => setCurrentTab('exchange')}
            leftIcon={<ArrowLeftRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
          >
            Instant FX Swap
          </Button>
        </div>
      </div>

      {/* Wallets Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {wallets.map((wallet) => {
          const meta = CURRENCIES[wallet.currency] || CURRENCIES.USD;

          return (
            <div
              key={wallet.id}
              className={clsx(
                'glass-bento glass-bento-interactive rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group text-gray-900 dark:text-white',
                wallet.isPrimary && 'ring-1 ring-blue-500/40 shadow-[0_8px_30px_-8px_rgba(0,102,255,0.3)]'
              )}
            >
              {/* Subtle top specular line */}
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />

              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <CurrencyBadge currency={wallet.currency} size="lg" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {wallet.currency} Vault
                        </h3>
                        {wallet.isPrimary && (
                          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-white/10 border border-blue-200 dark:border-white/15 px-2 py-0.5 rounded-full">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {meta.name} ({meta.country})
                      </div>
                    </div>
                  </div>

                  {!wallet.isPrimary && (
                    <button
                      onClick={() => setDefaultWallet(wallet.currency)}
                      className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition-colors"
                    >
                      Set Primary
                    </button>
                  )}
                </div>

                {/* Big Balance Box */}
                <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 space-y-1 mb-5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Settled Liquidity
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white font-mono tracking-tight">
                    {formatCurrency(wallet.balance, wallet.currency)}
                  </div>
                  {wallet.pendingBalance > 0 && (
                    <div className="text-[11px] text-amber-500 dark:text-amber-400 font-medium">
                      + {formatCurrency(wallet.pendingBalance, wallet.currency)} pending clearing
                    </div>
                  )}
                </div>

                {/* Account Routing Details */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Account No:</span>
                    <div className="flex items-center gap-1.5 font-mono font-semibold text-gray-900 dark:text-white">
                      <span>{wallet.accountNumber}</span>
                      <button
                        onClick={() => copyText(wallet.accountNumber, `acc_${wallet.id}`)}
                        className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        title="Copy Account Number"
                      >
                        {copiedKey === `acc_${wallet.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {wallet.iban && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">IBAN:</span>
                      <div className="flex items-center gap-1.5 font-mono font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
                        <span className="truncate">{wallet.iban}</span>
                        <button
                          onClick={() => copyText(wallet.iban!, `iban_${wallet.id}`)}
                          className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0"
                          title="Copy IBAN"
                        >
                          {copiedKey === `iban_${wallet.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-black/10 dark:border-slate-800 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => prefillSendModal(undefined, undefined, wallet.currency)}
                  leftIcon={<Send className="w-3.5 h-3.5 text-white" />}
                  className="flex-1"
                >
                  Send
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedWalletForAction(wallet);
                    setActionType('deposit');
                  }}
                  leftIcon={<PlusCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                  className="flex-1"
                >
                  Deposit
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSelectedWalletForAction(wallet);
                    setActionType('withdraw');
                  }}
                  leftIcon={<ArrowUpRight className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
                >
                  Withdraw
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <AddFundsModal
        isOpen={actionType === 'deposit'}
        onClose={() => setActionType(null)}
        defaultCurrency={selectedWalletForAction?.currency || 'USD'}
      />

      <WithdrawModal
        isOpen={actionType === 'withdraw'}
        onClose={() => setActionType(null)}
        defaultCurrency={selectedWalletForAction?.currency || 'USD'}
      />

      <CreateWalletModal
        isOpen={createWalletOpen}
        onClose={() => setCreateWalletOpen(false)}
      />
    </div>
  );
};
