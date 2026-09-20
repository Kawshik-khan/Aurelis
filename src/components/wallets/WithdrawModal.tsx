import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { CurrencySelector } from '../common/CurrencySelector';
import { CurrencyCode } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/currency';
import { ArrowUpRight, Check, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCurrency?: CurrencyCode;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  defaultCurrency = 'USD',
}) => {
  const { withdrawFunds, wallets, openTxnDetail } = useApp();
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency);
  const [amount, setAmount] = useState('1000.00');
  const [destinationAccount, setDestinationAccount] = useState('Chase Checking (•••• 9021)');
  const [isProcessing, setIsProcessing] = useState(false);

  const activeWallet = wallets.find((w) => w.currency === currency);
  const availableBalance = activeWallet ? activeWallet.balance : 0;
  const parsedAmount = parseFloat(amount) || 0;
  const isInsufficient = parsedAmount > availableBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0 || isInsufficient) return;

    setIsProcessing(true);
    setTimeout(async () => {
      const txn = await withdrawFunds(currency, parsedAmount, destinationAccount);
      setIsProcessing(false);
      onClose();
      openTxnDetail(txn);
    }, 800);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Withdraw Capital"
      subtitle="Transfer funds from your DBS Bank reserves to an external bank account or MFS"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Withdrawal Amount"
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <CurrencySelector
            label="Source Vault"
            value={currency}
            onChange={setCurrency}
            showBalance
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Destination Depository
          </label>
          <div className="space-y-2">
            {[
              { id: 'brac', name: 'BRAC Bank Checking (•••• 9021)', desc: 'Primary Linked Account · BEFTN / NPSB Instant' },
              { id: 'bkash', name: 'bKash Wallet (•••• 4810)', desc: 'Instant MFS Disbursement Rail' },
            ].map((acc) => {
              const isSelected = destinationAccount === acc.name;

              return (
                <div
                  key={acc.id}
                  onClick={() => setDestinationAccount(acc.name)}
                  className={clsx(
                    'p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all',
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-600/20'
                      : 'border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] hover:border-black/20 dark:hover:border-white/20'
                  )}
                >
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white">{acc.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{acc.desc}</div>
                  </div>

                  <div
                    className={clsx(
                      'w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all',
                      isSelected
                        ? 'border-blue-500 bg-blue-600 text-white'
                        : 'border-black/15 dark:border-white/15 bg-black/5 dark:bg-white/10'
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {isInsufficient && (
          <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center gap-2.5 text-xs text-red-600 dark:text-red-300">
            <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
            <span>
              Insufficient balance in {currency} vault ({formatCurrency(availableBalance, currency)} available).
            </span>
          </div>
        )}

        <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Total Debited from Vault</span>
          <span className="text-xl font-extrabold text-gray-900 dark:text-white font-mono">
            {formatCurrency(parsedAmount, currency)}
          </span>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1 shadow-[0_8px_20px_-4px_rgba(0,102,255,0.4)]"
            disabled={isInsufficient || parsedAmount <= 0}
            isLoading={isProcessing}
            leftIcon={<ArrowUpRight className="w-4 h-4 text-white" />}
          >
            Authorize Wire
          </Button>
        </div>
      </form>
    </Modal>
  );
};
