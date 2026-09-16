import React, { useState } from 'react';
import {
  X,
  Download,
  Printer,
  Share2,
  Check,
  Building2,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  ShieldCheck,
  Copy,
} from 'lucide-react';
import { Transaction } from '../../types';
import { CURRENCIES, formatCurrency } from '../../utils/currency';
import { printReceipt, downloadReceiptJson } from '../../utils/receiptGenerator';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  txn: Transaction | null;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  onClose,
  txn,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !txn) return null;

  const dateFormatted = new Date(txn.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const isOutgoing = txn.type === 'send' || txn.type === 'card_payment' || txn.type === 'withdrawal';
  const isIncoming = txn.type === 'receive' || txn.type === 'deposit';

  const copyTxnId = () => {
    navigator.clipboard.writeText(txn.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `AURELIS Transaction ${txn.id}`,
        text: `Transaction ${txn.id} for ${formatCurrency(txn.amount, txn.currency)} settled via AURELIS.`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      copyTxnId();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        id="printable-receipt"
        className="relative w-full max-w-lg glass-bento rounded-3xl overflow-hidden z-10 animate-scale-in my-auto text-gray-900 dark:text-white shadow-[0_24px_64px_-8px_rgba(0,0,0,0.85)]"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              Transaction Details
            </span>
            <Badge status={txn.status} size="sm">
              {txn.status}
            </Badge>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount Hero Section */}
        <div className="p-6 text-center bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/10 dark:border-white/10">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
            {isOutgoing ? 'Total Amount Sent' : isIncoming ? 'Total Amount Credited' : 'Exchange Volume'}
          </div>

          <div className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mt-1 font-mono tracking-tight">
            {isOutgoing ? '-' : isIncoming ? '+' : ''}
            {formatCurrency(txn.amount, txn.currency, { showCode: true })}
          </div>

          {txn.destinationAmount && (
            <div className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-1.5 font-mono">
              → Received {formatCurrency(txn.destinationAmount, txn.destinationCurrency)}
            </div>
          )}

          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span>{txn.id}</span>
            <button
              onClick={copyTxnId}
              className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10 transition-colors text-slate-400 hover:text-gray-900 dark:hover:text-white"
              title="Copy Reference ID"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Detailed Breakdown Rows */}
        <div className="p-6 space-y-3.5 text-xs">
          {txn.recipientName && (
            <div className="flex items-center justify-between pb-2.5 border-b border-black/10 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Recipient / Counterparty</span>
              <div className="text-right">
                <div className="font-bold text-gray-900 dark:text-white">{txn.recipientName}</div>
                {txn.recipientEmail && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{txn.recipientEmail}</div>
                )}
              </div>
            </div>
          )}

          {txn.senderName && (
            <div className="flex items-center justify-between pb-2.5 border-b border-black/10 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Sender / Originator</span>
              <span className="font-bold text-gray-900 dark:text-white">{txn.senderName}</span>
            </div>
          )}

          <div className="flex items-center justify-between pb-2.5 border-b border-black/10 dark:border-white/10">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Settlement Timestamp</span>
            <span className="font-semibold text-gray-900 dark:text-white">{dateFormatted}</span>
          </div>

          <div className="flex items-center justify-between pb-2.5 border-b border-black/10 dark:border-white/10">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Payment Instrument</span>
            <span className="font-semibold text-gray-900 dark:text-white">{txn.paymentMethod}</span>
          </div>

          {txn.exchangeRate && (
            <div className="flex items-center justify-between pb-2.5 border-b border-black/10 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Locked FX Rate</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                1 {txn.sourceCurrency} = {txn.exchangeRate.toFixed(4)} {txn.destinationCurrency}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pb-2.5 border-b border-black/10 dark:border-white/10">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Network Clearing Fee</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {txn.fee === 0 ? 'Complimentary ($0.00)' : formatCurrency(txn.fee, txn.currency)}
            </span>
          </div>

          {txn.reference && (
            <div className="flex items-center justify-between pb-2.5 border-b border-black/10 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Reference Memo</span>
              <span className="font-semibold text-gray-900 dark:text-white italic">"{txn.reference}"</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 text-sm font-bold text-gray-900 dark:text-white">
            <span>Total Debited / Credited</span>
            <span className="text-base text-blue-600 dark:text-blue-400 font-mono font-bold">
              {formatCurrency(txn.totalCharged || txn.amount, txn.currency, { showCode: true })}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-0 flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            className="flex-1 shadow-[0_8px_20px_-4px_rgba(0,102,255,0.4)]"
            onClick={() => printReceipt(txn)}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Download / Print
          </Button>

          <Button
            variant="outline"
            className="flex-1"
            onClick={() => downloadReceiptJson(txn)}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export JSON
          </Button>

          <Button
            variant="secondary"
            onClick={handleShare}
            leftIcon={<Share2 className="w-4 h-4" />}
          >
            Share
          </Button>
        </div>
      </div>
    </div>
  );
};
