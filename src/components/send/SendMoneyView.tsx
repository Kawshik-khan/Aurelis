import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { SendMoneyModal } from './SendMoneyModal';
import { Recipient } from '../../types';
import { Button } from '../common/Button';
import { Avatar } from '../common/Avatar';
import { SendHorizontal, Search, UserPlus, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { clsx } from 'clsx';

export const SendMoneyView: React.FC = () => {
  const { user, recipients, openModal, prefillSendModal, wallets } = useApp();
  const { isDark } = useTheme();
  const [search, setSearch] = useState('');

  const safeRecipients = Array.isArray(recipients) ? recipients : [];
  const safeWallets = Array.isArray(wallets) ? wallets : [];
  const userEmail = (user?.email || '').toLowerCase().trim();
  const searchNormalized = (search || '').toLowerCase().trim();

  const filtered = safeRecipients.filter((r) => {
    if (!r) return false;
    const rId = String(r.id || '');
    const rEmail = String(r.email || '').toLowerCase().trim();
    const rName = String(r.name || '').toLowerCase();
    const rTag = String(r.aurelisTag || '').toLowerCase();

    // Prevent transferring to self
    if (user?.id && rId === user.id) return false;
    if (userEmail && rEmail === userEmail) return false;

    if (!searchNormalized) return true;
    return (
      rId.toLowerCase().includes(searchNormalized) ||
      rName.includes(searchNormalized) ||
      rEmail.includes(searchNormalized) ||
      rTag.includes(searchNormalized)
    );
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-16 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className={clsx(
            'inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold mb-2 shadow-xs',
            isDark ? 'bg-white/10 border-white/15 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-600'
          )}>
            <SendHorizontal className="w-3.5 h-3.5" />
            <span>GLOBAL MONEY MOVEMENT</span>
          </span>
          <h1 className={clsx('text-2xl sm:text-3xl font-extrabold tracking-tight mt-1', isDark ? 'text-white' : 'text-gray-900')}>
            Send Capital
          </h1>
          <p className={clsx('text-xs mt-1', isDark ? 'text-slate-400' : 'text-gray-500')}>
            Instantaneous cross-border settlements with institutional rate transparency.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => openModal('send')}
          leftIcon={<SendHorizontal className="w-4 h-4 text-white" />}
          className="shadow-[0_8px_20px_-4px_rgba(0,102,255,0.4)]"
        >
          Initiate New Transfer
        </Button>
      </div>

      {/* Quick Transfer Bento Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => openModal('send')}
          className="glass-bento p-6 glass-bento-interactive cursor-pointer group rounded-3xl"
        >
          <div className={clsx(
            'w-10 h-10 rounded-xl border flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-xs',
            isDark ? 'bg-white/10 text-blue-400 border-white/15' : 'bg-blue-50 text-blue-500 border-blue-200'
          )}>
            <SendHorizontal className="w-5 h-5" />
          </div>
          <h3 className={clsx('text-base font-bold', isDark ? 'text-white' : 'text-gray-900')}>
            Send Money
          </h3>
          <p className={clsx('text-xs mt-1 leading-relaxed', isDark ? 'text-slate-400' : 'text-gray-500')}>
            Transfer directly using recipient's User ID or Email.
          </p>
        </div>

        <div
          onClick={() => openModal('send')}
          className="glass-bento p-6 glass-bento-interactive cursor-pointer group rounded-3xl"
        >
          <div className={clsx(
            'w-10 h-10 rounded-xl border flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-xs',
            isDark ? 'bg-white/10 text-blue-400 border-white/15' : 'bg-blue-50 text-blue-500 border-blue-200'
          )}>
            <Search className="w-5 h-5" />
          </div>
          <h3 className={clsx('text-base font-bold', isDark ? 'text-white' : 'text-gray-900')}>
            Direct Peer Search
          </h3>
          <p className={clsx('text-xs mt-1 leading-relaxed', isDark ? 'text-slate-400' : 'text-gray-500')}>
            Zero fees between sovereign accounts. No contact setup required.
          </p>
        </div>

        <div
          onClick={() => openModal('request-money')}
          className="glass-bento p-6 glass-bento-interactive cursor-pointer group rounded-3xl"
        >
          <div className={clsx(
            'w-10 h-10 rounded-xl border flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-xs',
            isDark ? 'bg-white/10 text-blue-400 border-white/15' : 'bg-blue-50 text-blue-500 border-blue-200'
          )}>
            <ArrowRight className="w-5 h-5" />
          </div>
          <h3 className={clsx('text-base font-bold', isDark ? 'text-white' : 'text-gray-900')}>
            Request Inbound Wire
          </h3>
          <p className={clsx('text-xs mt-1 leading-relaxed', isDark ? 'text-slate-400' : 'text-gray-500')}>
            Generate formal wire instruction slips with sovereign IBAN & routing.
          </p>
        </div>
      </div>

      {/* Recipient Directory Bento */}
      <div className="glass-bento rounded-3xl p-6 sm:p-8 space-y-6">
        <div className={clsx('flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4', isDark ? 'border-white/10' : 'border-gray-200')}>
          <div>
            <h2 className={clsx('text-lg font-bold', isDark ? 'text-white' : 'text-gray-900')}>
              Frequent Counterparties
            </h2>
            <p className={clsx('text-xs mt-0.5', isDark ? 'text-slate-400' : 'text-gray-500')}>
              Verified private client accounts and global banking rails
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className={clsx('w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2', isDark ? 'text-slate-500' : 'text-gray-400')} />
            <input
              type="text"
              placeholder="Search by User ID, email, or @tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={clsx(
                'w-full rounded-xl border pl-10 pr-4 py-2 text-xs focus:outline-none transition-all',
                isDark
                  ? 'bg-white/[0.04] border-white/10 text-white placeholder-slate-500 focus:border-white/30'
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-400'
              )}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className={clsx(
            'p-8 text-center rounded-2xl border border-dashed',
            isDark ? 'bg-white/[0.03] border-white/15' : 'bg-gray-50 border-gray-300'
          )}>
            <p className={clsx('text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>
              {search
                ? 'No counterparties found matching your search.'
                : 'No recent counterparties recorded yet. Use the "Initiate New Transfer" button above to send money to any User ID or Email.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((r) => (
              <div
                key={r.id || `${r.email}-${Math.random()}`}
                onClick={() => prefillSendModal(r)}
                className={clsx(
                  'p-4 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all group shadow-xs backdrop-blur-md',
                  isDark
                    ? 'border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06]'
                    : 'border-gray-200 hover:border-gray-300 bg-white/50 hover:bg-white/80'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar src={r.avatar} name={r.name || 'Beneficiary'} size="md" />
                  <div className="min-w-0">
                    <div className={clsx('text-sm font-bold group-hover:text-blue-400 transition-colors truncate', isDark ? 'text-white' : 'text-gray-900')}>
                      {r.name || 'Sovereign Beneficiary'}
                    </div>
                    <div className={clsx('text-xs truncate', isDark ? 'text-slate-400' : 'text-gray-500')}>
                      {r.email || 'No email recorded'}
                    </div>
                    <div className={clsx('text-[11px] font-mono mt-0.5', isDark ? 'text-slate-500' : 'text-gray-400')}>
                      ID: {r.id || 'N/A'} • {r.aurelisTag || 'DBS Bank Account'}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={clsx(
                    'text-[10px] font-mono font-bold uppercase border px-2 py-0.5 rounded-md',
                    isDark ? 'bg-white/10 text-blue-300 border-white/15' : 'bg-blue-50 text-blue-600 border-blue-200'
                  )}>
                    {r.currency || 'USD'}
                  </span>
                  <div className="text-xs font-bold text-blue-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1">
                    <span>Send</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
