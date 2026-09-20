import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CardItem } from '../../types';
import { useApp } from '../../context/AppContext';
import { CreditCard, Sparkles, ShieldCheck, Check } from 'lucide-react';
import { clsx } from 'clsx';

interface IssueCardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IssueCardModal: React.FC<IssueCardModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { issueNewCard } = useApp();
  const [tier, setTier] = useState<CardItem['tier']>('Black Titanium');
  const [type, setType] = useState<'physical' | 'virtual'>('physical');

  const handleIssue = () => {
    issueNewCard({ tier, type });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Issue DBS Bank Card"
      subtitle="Select metal craftsmanship or instant virtual tokenization"
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Tier Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Card Edition
          </label>
          <div className="space-y-2.5">
            {[
              {
                tier: 'Black Titanium' as const,
                desc: 'Precision laser-engraved aerospace titanium alloy in Electric Sapphire Blue. $50,000 monthly limit.',
                badge: 'Signature Sapphire',
              },
              {
                tier: 'Champagne Gold' as const,
                desc: 'Muted champagne gold finish with brushed PVD coating. $25,000 monthly limit.',
                badge: 'Executive',
              },
              {
                tier: 'Pearl Sovereign' as const,
                desc: 'High-density obsidian composite with micro-engraving. $25,000 monthly limit.',
                badge: 'Ceramic Composite',
              },
            ].map((option) => (
              <div
                key={option.tier}
                onClick={() => setTier(option.tier)}
                className={clsx(
                  'p-4 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3',
                  tier === option.tier
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50 dark:bg-white/10 shadow-xs'
                    : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/25 bg-black/[0.02] dark:bg-white/[0.03]'
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{option.tier}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-white/[0.06] text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-white/10">
                      {option.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{option.desc}</p>
                </div>
                <div
                  className={clsx(
                    'w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all',
                    tier === option.tier
                      ? 'border-blue-500 bg-blue-600 text-white'
                      : 'border-black/15 dark:border-white/15 bg-black/5 dark:bg-white/[0.04]'
                  )}
                >
                  {tier === option.tier && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Type Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Card Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'physical' as const, name: 'Physical Metal Card', desc: 'Secure DHL Express dispatch' },
              { id: 'virtual' as const, name: 'Virtual Instant Card', desc: 'Apple Pay & Google Pay ready' },
            ].map((fmt) => (
              <div
                key={fmt.id}
                onClick={() => setType(fmt.id)}
                className={clsx(
                  'p-3.5 rounded-2xl border cursor-pointer transition-all',
                  type === fmt.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-white/10 ring-1 ring-blue-500/20'
                    : 'border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] hover:border-black/20 dark:hover:border-white/25'
                )}
              >
                <div className="text-xs font-bold text-gray-900 dark:text-white">{fmt.name}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{fmt.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-white/[0.04] border border-blue-200 dark:border-white/10 flex items-center gap-2.5 text-xs text-blue-700 dark:text-blue-300">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>Complimentary issuance & zero annual maintenance fee.</span>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleIssue}
            className="flex-1 shadow-[0_8px_20px_-4px_rgba(0,102,255,0.4)]"
            leftIcon={<Sparkles className="w-4 h-4 text-white" />}
          >
            Activate Card
          </Button>
        </div>
      </div>
    </Modal>
  );
};
