import React, { useState, useEffect, useMemo } from 'react';
import { Search, ArrowRight, User, ReceiptText, WalletCards, ArrowLeftRight, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NavigationTab } from '../../types';
import { formatCurrency } from '../../utils/currency';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    recipients,
    transactions,
    wallets,
    setCurrentTab,
    openTxnDetail,
    prefillSendModal,
  } = useApp();

  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // toggle handled externally or open
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const q = (query || '').toLowerCase().trim();

  const safeRecipients = Array.isArray(recipients) ? recipients : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeWallets = Array.isArray(wallets) ? wallets : [];

  const matchedRecipients = safeRecipients.filter(
    (r) =>
      r &&
      (String(r.name || '').toLowerCase().includes(q) ||
        String(r.email || '').toLowerCase().includes(q) ||
        String(r.id || '').toLowerCase().includes(q) ||
        String(r.aurelisTag || '').toLowerCase().includes(q))
  ).slice(0, 3);

  const matchedTransactions = safeTransactions.filter(
    (t) =>
      t &&
      (String(t.id || '').toLowerCase().includes(q) ||
        (t.recipientName && String(t.recipientName).toLowerCase().includes(q)) ||
        (t.senderName && String(t.senderName).toLowerCase().includes(q)) ||
        (t.reference && String(t.reference).toLowerCase().includes(q)))
  ).slice(0, 4);

  const matchedWallets = safeWallets.filter(
    (w) => w && String(w.currency || '').toLowerCase().includes(q)
  );

  const navigateTo = (tab: NavigationTab) => {
    setCurrentTab(tab);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl glass-bento rounded-3xl overflow-hidden z-10 animate-scale-in text-gray-900 dark:text-white shadow-xl dark:shadow-[0_24px_64px_-8px_rgba(0,0,0,0.85)]">
        {/* Search Input */}
        <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center gap-3">
          <Search className="w-5 h-5 text-blue-500 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command, beneficiary, or transaction reference..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-gray-400 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="p-4 max-h-96 overflow-y-auto space-y-4 text-xs">
          {/* Quick Nav Suggestions */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 px-2 mb-1.5">
              Quick Navigation
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { label: 'Overview', tab: 'dashboard' as NavigationTab },
                { label: 'Send Money', tab: 'send' as NavigationTab },
                { label: 'Exchange FX', tab: 'exchange' as NavigationTab },
                { label: 'Cards & Limits', tab: 'cards' as NavigationTab },
              ].map((item) => (
                <button
                  key={item.tab}
                  onClick={() => navigateTo(item.tab)}
                  className="p-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] hover:bg-blue-600 hover:text-white border border-gray-200 dark:border-white/10 text-left font-medium text-gray-700 dark:text-slate-300 transition-all"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Matched Beneficiaries */}
          {matchedRecipients.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 px-2 mb-1.5 flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>Beneficiaries</span>
              </div>
              <div className="space-y-1">
                {matchedRecipients.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => {
                      onClose();
                      prefillSendModal(r);
                    }}
                    className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-between cursor-pointer group transition-colors"
                  >
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors">
                        {r.name}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-slate-400">{r.email}</div>
                    </div>
                    <span className="text-[10px] font-semibold text-blue-500 group-hover:underline flex items-center gap-0.5">
                      Send Money <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Transactions */}
          {matchedTransactions.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 px-2 mb-1.5 flex items-center gap-1">
                <ReceiptText className="w-3 h-3" />
                <span>Transactions</span>
              </div>
              <div className="space-y-1">
                {matchedTransactions.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      onClose();
                      openTxnDetail(t);
                    }}
                    className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-between cursor-pointer group transition-colors"
                  >
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors">
                        {t.recipientName || t.senderName || 'Conversion'} ({t.id})
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-slate-400">{t.reference || t.category}</div>
                    </div>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      {formatCurrency(t.amount, t.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Wallets */}
          {matchedWallets.length > 0 && query && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 px-2 mb-1.5 flex items-center gap-1">
                <WalletCards className="w-3 h-3" />
                <span>Wallets</span>
              </div>
              <div className="space-y-1">
                {matchedWallets.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => navigateTo('wallets')}
                    className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-between cursor-pointer group transition-colors"
                  >
                    <span className="font-bold text-gray-900 dark:text-white">{w.currency} Account</span>
                    <span className="font-mono font-bold text-blue-500">
                      {formatCurrency(w.balance, w.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
