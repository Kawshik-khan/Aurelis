import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { CurrencySelector } from '../common/CurrencySelector';
import { CurrencyCode } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/currency';
import { PlusCircle, Building2, ShieldCheck, Check } from 'lucide-react';
import { clsx } from 'clsx';

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCurrency?: CurrencyCode;
}

export const AddFundsModal: React.FC<AddFundsModalProps> = ({
  isOpen,
  onClose,
  defaultCurrency = 'USD',
}) => {
  const { addFunds, openTxnDetail } = useApp();
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency);
  const [amount, setAmount] = useState('5000.00');
  const [fundingSource, setFundingSource] = useState('Chase Private Client (•••• 9021)');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount) || 0;
    if (parsed <= 0) return;

    setIsProcessing(true);
    setTimeout(async () => {
      const txn = await addFunds(currency, parsed, fundingSource);
      setIsProcessing(false);
      onClose();
      openTxnDetail(txn);
    }, 800);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Deposit Vault Capital"
      subtitle="Instantly credit your multi-currency reserve accounts"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Deposit Amount"
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <CurrencySelector
            label="Target Vault"
            value={currency}
            onChange={setCurrency}
          />
        </div>

        {/* Funding Source Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Depository Funding Method
          </label>
          <div className="space-y-2">
            {[
              { id: 'chase', name: 'Chase Private Client (•••• 9021)', desc: 'Direct ACH Wire · Instant ($0 fee)' },
              { id: 'ubs', name: 'UBS Switzerland Custody (•••• 4810)', desc: 'Interbank SWIFT Wire ($0 fee)' },
              { id: 'card', name: 'Executive Platinum Card (•••• 8421)', desc: 'Immediate Card Liquidity ($0 fee)' },
            ].map((source) => {
              const isSelected = fundingSource === source.name;

              return (
                <div
                  key={source.id}
                  onClick={() => setFundingSource(source.name)}
                  className={clsx(
                    'p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all',
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-600/20'
                      : 'border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] hover:border-black/20 dark:hover:border-white/20'
                  )}
                >
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white">{source.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{source.desc}</div>
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

        {/* Settlement Summary Box */}
        <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Total Credit to Vault</span>
          <span className="text-xl font-extrabold text-gray-900 dark:text-white font-mono">
            {formatCurrency(parseFloat(amount) || 0, currency)}
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
            isLoading={isProcessing}
            leftIcon={<PlusCircle className="w-4 h-4 text-white" />}
          >
            Authorize Deposit
          </Button>
        </div>
      </form>
    </Modal>
  );
};
