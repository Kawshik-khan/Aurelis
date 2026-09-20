import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  CreditCard,
  PlusCircle,
  Calendar,
  ChevronRight,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CurrencyCode, Transaction, TransactionType } from '../../types';
import { CURRENCIES, formatCurrency } from '../../utils/currency';
import { Badge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { clsx } from 'clsx';

export const TransactionsView: React.FC = () => {
  const { transactions, openTxnDetail } = useApp();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | CurrencyCode>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');

  const filteredTransactions = useMemo(() => {
    const s = (search || '').toLowerCase().trim();
    const safeTxns = Array.isArray(transactions) ? transactions : [];
    return safeTxns.filter((txn) => {
      if (!txn) return false;
      const matchSearch =
        s === '' ||
        String(txn.id || '').toLowerCase().includes(s) ||
        (txn.recipientName && String(txn.recipientName).toLowerCase().includes(s)) ||
        (txn.senderName && String(txn.senderName).toLowerCase().includes(s)) ||
        (txn.reference && String(txn.reference).toLowerCase().includes(s));

      const matchType = typeFilter === 'all' || txn.type === typeFilter;

      const matchCurrency =
        currencyFilter === 'all' ||
        txn.currency === currencyFilter ||
        txn.destinationCurrency === currencyFilter;

      const matchStatus = statusFilter === 'all' || txn.status === statusFilter;

      return matchSearch && matchType && matchCurrency && matchStatus;
    });
  }, [transactions, search, typeFilter, currencyFilter, statusFilter]);

  const getTxnIcon = (txn: Transaction) => {
    switch (txn.type) {
      case 'send':
        return <ArrowUpRight className="w-4 h-4 text-blue-600" />;
      case 'receive':
        return <ArrowDownLeft className="w-4 h-4 text-emerald-600" />;
      case 'exchange':
        return <ArrowLeftRight className="w-4 h-4 text-indigo-600" />;
      case 'card_payment':
        return <CreditCard className="w-4 h-4 text-slate-600" />;
      case 'deposit':
        return <PlusCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <ArrowUpRight className="w-4 h-4 text-slate-500" />;
    }
  };

  const getAmountDisplay = (txn: Transaction) => {
    const isOutgoing = txn.type === 'send' || txn.type === 'card_payment' || txn.type === 'withdrawal';
    const isIncoming = txn.type === 'receive' || txn.type === 'deposit';

    if (txn.type === 'exchange') {
      return {
        text: `${formatCurrency(txn.destinationAmount || 0, txn.destinationCurrency)}`,
        sub: `From ${formatCurrency(txn.amount, txn.sourceCurrency)}`,
        isPositive: true,
      };
    }

    return {
      text: `${isOutgoing ? '-' : isIncoming ? '+' : ''}${formatCurrency(txn.amount, txn.currency, { showCode: true })}`,
      sub: txn.paymentMethod,
      isPositive: isIncoming,
    };
  };

  const exportCSV = () => {
    const headers = ['Transaction ID', 'Type', 'Amount', 'Currency', 'Recipient', 'Sender', 'Status', 'Date', 'Reference'];
    const rows = filteredTransactions.map((t) => [
      t.id,
      t.type,
      t.amount,
      t.currency,
      t.recipientName || '',
      t.senderName || '',
      t.status,
      t.date,
      t.reference || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DBS-Bank-Audit-Ledger-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in pb-16 lg:pb-0">
      {/* Header Bento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-white/10 border border-blue-200/60 dark:border-white/15 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-2">
            <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>AUDIT LEDGER</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Settlement History & Ledger
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time auditable history of all private client wires, cross-border payments, and FX swaps.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={exportCSV}
          leftIcon={<FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
        >
          Export CSV Statement
        </Button>
      </div>

      {/* Filter & Search Bento */}
      <div className="glass-bento rounded-3xl p-5 space-y-4 text-gray-900 dark:text-white">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by counterparty, memo, reference, or TXID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/[0.03] dark:bg-white/[0.04] rounded-2xl border border-black/10 dark:border-white/10 pl-11 pr-4 py-2.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value as any)}
              className="w-full bg-black/[0.03] dark:bg-[#12121e] rounded-2xl border border-black/10 dark:border-white/10 px-4 py-2.5 text-xs text-gray-900 dark:text-white font-medium focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
            >
              <option value="all">All Currencies</option>
              {Object.keys(CURRENCIES).map((c) => (
                <option key={c} value={c}>
                  {c} ({CURRENCIES[c as CurrencyCode].name})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-black/[0.03] dark:bg-[#12121e] rounded-2xl border border-black/10 dark:border-white/10 px-4 py-2.5 text-xs text-gray-900 dark:text-white font-medium focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
            >
              <option value="all">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
            </select>
          </div>
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-t border-black/10 dark:border-white/10 pt-3">
          {[
            { id: 'all', label: 'All Operations' },
            { id: 'send', label: 'Sent Wires' },
            { id: 'receive', label: 'Inbound Transfers' },
            { id: 'exchange', label: 'FX Swaps' },
            { id: 'card_payment', label: 'Card Spend' },
            { id: 'deposit', label: 'Capital Deposits' },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setTypeFilter(type.id as any)}
              className={clsx(
                'px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all',
                typeFilter === type.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-slate-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white border border-black/10 dark:border-white/10'
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction Ledger Table Bento */}
      <div className="glass-bento rounded-3xl overflow-hidden text-gray-900 dark:text-white">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <p className="text-sm font-bold text-gray-900 dark:text-white">No transactions located</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Try adjusting your search criteria or clearing active filters
            </p>
          </div>
        ) : (
          <div className="divide-y divide-black/5 dark:divide-slate-800/80">
            {filteredTransactions.map((txn) => {
              const amountInfo = getAmountDisplay(txn);
              const title = txn.recipientName || txn.senderName || 'Internal Treasury Swap';
              const dateObj = new Date(txn.date);
              const dateString = dateObj.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div
                  key={txn.id}
                  onClick={() => openTxnDetail(txn)}
                  className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {txn.recipientAvatar ? (
                      <Avatar src={txn.recipientAvatar} name={title} size="md" />
                    ) : (
                      <div className="w-10 h-10 rounded-2xl bg-black/[0.03] dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center shrink-0 group-hover:border-black/20 dark:group-hover:border-white/25 transition-colors shadow-2xs">
                        {getTxnIcon(txn)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate flex items-center gap-2">
                        <span>{title}</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1.5 font-medium">
                        <span>{txn.reference || txn.category}</span>
                        <span>•</span>
                        <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">{dateString}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <div>
                      <div
                        className={clsx(
                          'text-sm font-bold font-mono tracking-tight',
                          amountInfo.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'
                        )}
                      >
                        {amountInfo.text}
                      </div>
                      <div className="flex items-center justify-end gap-1.5 mt-1">
                        <Badge status={txn.status} size="sm">
                          {txn.status}
                        </Badge>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all hidden sm:block" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
