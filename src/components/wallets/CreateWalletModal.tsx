import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CurrencyCode } from '../../types';
import { useApp } from '../../context/AppContext';
import { CURRENCIES } from '../../utils/currency';
import { CurrencyBadge } from '../common/CurrencyBadge';
import { Plus, Check, ShieldCheck, Globe2 } from 'lucide-react';
import { clsx } from 'clsx';

interface CreateWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateWalletModal: React.FC<CreateWalletModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { wallets, createWallet } = useApp();
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('JPY');

  const existingCurrencies = wallets.map((w) => w.currency);
  const availableToOpen = (Object.keys(CURRENCIES) as CurrencyCode[]).filter(
    (c) => !existingCurrencies.includes(c)
  );

  const handleOpen = () => {
    if (selectedCurrency) {
      createWallet(selectedCurrency);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Provision Global Vault"
      subtitle="Instantly assign dedicated clearing credentials and IBAN"
      maxWidth="md"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Select an institutional currency. A dedicated account number and settlement clearing code will be provisioned in your name immediately.
        </p>

        {availableToOpen.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-200 dark:border-emerald-800/60">
              <Check className="w-6 h-6 stroke-[2.5]" />
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              All supported currency vaults are currently active.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
            {availableToOpen.map((code) => {
              const meta = CURRENCIES[code];
              const isSelected = selectedCurrency === code;

              return (
                <div
                  key={code}
                  onClick={() => setSelectedCurrency(code)}
                  className={clsx(
                    'p-3.5 rounded-2xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all',
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500'
                      : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <CurrencyBadge currency={code} size="sm" />
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white">
                        {meta.code}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {meta.name}
                      </div>
                    </div>
                  </div>

                  <div
                    className={clsx(
                      'w-5 h-5 rounded-full border flex items-center justify-center transition-all',
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
        )}

        <div className="p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>Zero account opening and holding fees across all reserves.</span>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleOpen}
            disabled={availableToOpen.length === 0}
            className="flex-1 shadow-[0_8px_20px_-4px_rgba(0,102,255,0.4)]"
            leftIcon={<Plus className="w-4 h-4 text-white" />}
          >
            Provision Vault
          </Button>
        </div>
      </div>
    </Modal>
  );
};
