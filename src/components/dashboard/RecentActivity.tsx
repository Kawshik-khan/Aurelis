import React from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  CreditCard,
  PlusCircle,
  ExternalLink,
  ReceiptText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/currency';
import { Badge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import { Transaction } from '../../types';
import { clsx } from 'clsx';

export const RecentActivity: React.FC = () => {
  const { transactions, openTxnDetail, setCurrentTab } = useApp();

  const recentTxns = transactions.slice(0, 6);

  const getTxnIcon = (txn: Transaction) => {
    switch (txn.type) {
      case 'send':
        return <ArrowUpRight className="w-4 h-4 text-blue-600" />;
      case 'receive':
        return <ArrowDownLeft className="w-4 h-4 text-emerald-600" />;
      case 'exchange':
        return <ArrowLeftRight className="w-4 h-4 text-sky-600" />;
      case 'card_payment':
        return <CreditCard className="w-4 h-4 text-slate-500" />;
      case 'deposit':
        return <PlusCircle className="w-4 h-4 text-emerald-600" />;
      default:
        return <ReceiptText className="w-4 h-4 text-slate-400" />;
    }
  };

  const getAmountDisplay = (txn: Transaction) => {
    const isOutgoing = txn.type === 'send' || txn.type === 'card_payment' || txn.type === 'withdrawal';
    const isIncoming = txn.type === 'receive' || txn.type === 'deposit';

    if (txn.type === 'exchange') {
      return {
        text: `${formatCurrency(txn.destinationAmount || 0, txn.destinationCurrency)}`,
        subText: `From ${formatCurrency(txn.amount, txn.sourceCurrency)}`,
        isPositive: true,
      };
    }

    return {
      text: `${isOutgoing ? '-' : isIncoming ? '+' : ''}${formatCurrency(txn.amount, txn.currency, { showCode: true })}`,
      subText: txn.paymentMethod,
      isPositive: isIncoming,
    };
  };

  const formatTxnDate = (isoString: string) => {
    const d = new Date(isoString);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    if (isToday) {
      return `Today · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <section className="glass-bento p-6 sm:p-7">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">
            Recent Settlement Ledger
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
            Verified private vault movements
          </p>
        </div>

        <button
          onClick={() => setCurrentTab('transactions')}
          className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-bold hover:underline flex items-center gap-1"
        >
          <span>View All Ledger</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {recentTxns.length === 0 ? (
        <div className="py-10 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center mx-auto text-gray-400 dark:text-slate-400">
            <ReceiptText className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-gray-900 dark:text-white">No Transactions Yet</p>
          <p className="text-[11px] text-gray-500 dark:text-slate-400 max-w-xs mx-auto">
            Your initial settled transfers, currency exchanges, and deposits will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-white/[0.06]">
          {recentTxns.map((txn) => {
            const amountInfo = getAmountDisplay(txn);
            const title = txn.recipientName || txn.senderName || 'Currency Exchange';

            return (
              <div
                key={txn.id}
                onClick={() => openTxnDetail(txn)}
                className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-white/[0.04] -mx-3 px-3 rounded-2xl cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {txn.recipientAvatar ? (
                    <Avatar src={txn.recipientAvatar} name={title} size="md" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0 group-hover:border-gray-300 dark:group-hover:border-white/25 transition-colors shadow-xs">
                      {getTxnIcon(txn)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                      {title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                      <span>{txn.reference || txn.category}</span>
                      <span>·</span>
                      <span className="text-[11px] text-gray-400 dark:text-slate-500">{formatTxnDate(txn.date)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div
                    className={clsx(
                      'text-sm font-extrabold font-mono-nums tracking-tight',
                      amountInfo.isPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-900 dark:text-white'
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
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
