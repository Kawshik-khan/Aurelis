import React, { useState } from 'react';
import {
  Search,
  UserPlus,
  Send,
  Edit2,
  Trash2,
  Star,
  Building2,
  Mail,
  Phone,
  ArrowRight,
  Users2,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CurrencyCode, Recipient } from '../../types';
import { CURRENCIES } from '../../utils/currency';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { EditRecipientModal } from './EditRecipientModal';
import { clsx } from 'clsx';

export const RecipientsView: React.FC = () => {
  const {
    recipients,
    openModal,
    prefillSendModal,
    removeRecipient,
    toggleFavoriteRecipient,
  } = useApp();

  const [search, setSearch] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | CurrencyCode>('all');
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null);

  const safeRecipients = Array.isArray(recipients) ? recipients : [];
  const searchNormalized = (search || '').toLowerCase().trim();

  const filteredRecipients = safeRecipients.filter((r) => {
    if (!r) return false;
    const rName = String(r.name || '').toLowerCase();
    const rEmail = String(r.email || '').toLowerCase();
    const rTag = String(r.aurelisTag || '').toLowerCase();
    const rBank = String(r.bankName || '').toLowerCase();
    const rId = String(r.id || '').toLowerCase();

    const matchSearch =
      searchNormalized === '' ||
      rName.includes(searchNormalized) ||
      rEmail.includes(searchNormalized) ||
      rTag.includes(searchNormalized) ||
      rBank.includes(searchNormalized) ||
      rId.includes(searchNormalized);

    const matchCurrency = currencyFilter === 'all' || r.currency === currencyFilter;

    return matchSearch && matchCurrency;
  });

  const handleDelete = (r: Recipient) => {
    if (window.confirm(`Are you sure you want to remove ${r.name} from your beneficiary registry?`)) {
      removeRecipient(r.id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in pb-16 lg:pb-0">
      {/* Header Bento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-white/[0.04] border border-blue-200/60 dark:border-white/10 text-blue-700 dark:text-blue-400 text-xs font-semibold mb-2">
            <Users2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>COUNTERPARTY DIRECTORY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Recipients & Beneficiaries
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your verified counterparties, correspondent banks, and instant settlement tags.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => openModal('add-recipient')}
          leftIcon={<UserPlus className="w-4 h-4 text-white" />}
          className="shadow-[0_8px_20px_-4px_rgba(0,102,255,0.4)]"
        >
          Add New Beneficiary
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-bento rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-gray-900 dark:text-white">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search counterparties by name, email, or bank..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/[0.03] dark:bg-white/[0.04] rounded-2xl border border-black/10 dark:border-white/10 pl-11 pr-4 py-2.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value as any)}
            className="bg-black/[0.03] dark:bg-[#12121e] rounded-2xl border border-black/10 dark:border-white/10 px-4 py-2.5 text-xs text-gray-900 dark:text-white font-medium focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
          >
            <option value="all">All Currencies</option>
            {Object.keys(CURRENCIES).map((c) => (
              <option key={c} value={c}>
                {c} ({CURRENCIES[c as CurrencyCode].name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Recipients Grid or Empty State */}
      {filteredRecipients.length === 0 ? (
        <div className="glass-bento rounded-3xl p-12 text-center max-w-xl mx-auto space-y-3 text-gray-900 dark:text-white">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-white/[0.04] text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4 border border-blue-200 dark:border-white/10">
            <Building2 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {search || currencyFilter !== 'all'
              ? 'No Matching Beneficiaries'
              : 'No Saved Beneficiaries Yet'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
            {search || currencyFilter !== 'all'
              ? 'No counterparties matched your query. Try clearing filters or revising keywords.'
              : 'Your private beneficiary registry is currently empty. When you transfer funds to any User ID or Email, they are automatically saved here.'}
          </p>
          <div className="pt-3 flex items-center justify-center gap-3">
            {search || currencyFilter !== 'all' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setCurrencyFilter('all');
                }}
              >
                Clear Filters
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => openModal('send')}
                leftIcon={<Send className="w-3.5 h-3.5 text-white" />}
              >
                Send Money via ID or Email
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRecipients.map((r) => (
            <div
              key={r.id}
              className="glass-bento glass-bento-interactive rounded-3xl p-6 flex flex-col justify-between group relative overflow-hidden text-gray-900 dark:text-white"
            >
              {/* Top specular shimmer */}
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />

              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={r.avatar} name={r.name} size="lg" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {r.name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => toggleFavoriteRecipient(r.id)}
                          className="text-slate-400 hover:text-amber-500 transition-colors"
                          title={r.isFavorite ? 'Remove favorite' : 'Mark as favorite'}
                        >
                          <Star
                            className={clsx(
                              'w-4 h-4',
                              r.isFavorite
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-400'
                            )}
                          />
                        </button>
                      </div>

                      {r.aurelisTag && (
                        <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-medium block">
                          {r.aurelisTag}
                        </span>
                      )}

                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{r.email}</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-bold uppercase bg-blue-50 dark:bg-white/[0.06] text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-white/10 px-2.5 py-1 rounded-full shrink-0">
                    {r.currency}
                  </span>
                </div>

                {/* Bank Details Box */}
                <div className="mt-4 p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 text-xs space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{r.bankName}</span>
                    </span>
                    <span className="font-mono font-semibold text-gray-900 dark:text-white">
                      {r.accountNumber}
                    </span>
                  </div>
                  {r.routingOrIban && (
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                      Routing / IBAN: {r.routingOrIban}
                    </div>
                  )}
                  {r.lastTransferDate && (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-black/10 dark:border-white/10">
                      Last transfer: {r.lastTransferDate}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Bar */}
              <div className="mt-5 pt-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => prefillSendModal(r)}
                  leftIcon={<Send className="w-3.5 h-3.5 text-white" />}
                  className="shadow-xs"
                >
                  Send Money
                </Button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingRecipient(r)}
                    className="p-2 rounded-xl text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    title="Edit details"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Remove beneficiary"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <EditRecipientModal
        isOpen={Boolean(editingRecipient)}
        onClose={() => setEditingRecipient(null)}
        recipient={editingRecipient}
      />
    </div>
  );
};
