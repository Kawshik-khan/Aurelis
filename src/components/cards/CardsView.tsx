import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Sliders,
  ShieldCheck,
  Building2,
  Check,
  Wifi,
  Globe,
  Sparkles,
  Zap,
  ArrowUpRight,
  RefreshCw,
  Copy,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CardItem } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { Button } from '../common/Button';
import { IssueCardModal } from './IssueCardModal';
import { AurelisApiClient } from '../../services/api';
import { clsx } from 'clsx';

interface LinkedBankAccount {
  id: string;
  name: string;
  acc: string;
  isPrimary: boolean;
  type: string;
}

export const CardsView: React.FC = () => {
  const { cards, user, toggleCardFreeze, updateCardLimits } = useApp();

  const [selectedCardId, setSelectedCardId] = useState<string>(cards[0]?.id || '');
  const [revealedCardId, setRevealedCardId] = useState<string | null>(null);
  const [revealedDetails, setRevealedDetails] = useState<
    Record<string, { cardNumber: string; cvv: string; expiry: string; pin: string }>
  >({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [issueModalOpen, setIssueModalOpen] = useState(false);

  const [linkedBankAccounts, setLinkedBankAccounts] = useState<LinkedBankAccount[]>(() => {
    const key = `aurelis_vault_${user?.id || 'default'}_bank_accounts`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [
      { id: 'bank_1', name: 'Chase Private Client', acc: '•••• 9021', isPrimary: true, type: 'Checking' },
      { id: 'bank_2', name: 'UBS Custody Switzerland', acc: '•••• 4810', isPrimary: false, type: 'Custody / Treasury' },
    ];
  });

  const [isAddingBank, setIsAddingBank] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newBankAcc, setNewBankAcc] = useState('');
  const [newBankType, setNewBankType] = useState('Checking');

  useEffect(() => {
    if (user?.id) {
      const key = `aurelis_vault_${user.id}_bank_accounts`;
      localStorage.setItem(key, JSON.stringify(linkedBankAccounts));
    }
  }, [linkedBankAccounts, user?.id]);

  const activeCard = cards.find((c) => c.id === selectedCardId) || cards[0];

  const handleToggleReveal = async (cardId: string) => {
    if (revealedCardId === cardId) {
      setRevealedCardId(null);
    } else {
      if (!revealedDetails[cardId]) {
        try {
          const details = await AurelisApiClient.revealCardDetails(cardId);
          if (details) {
            setRevealedDetails((prev) => ({ ...prev, [cardId]: details }));
          }
        } catch (err) {
          console.warn('API revealCardDetails fallback:', err);
        }
      }
      setRevealedCardId(cardId);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSetPrimaryBank = (id: string) => {
    setLinkedBankAccounts((prev: LinkedBankAccount[]) =>
      prev.map((b) => ({ ...b, isPrimary: b.id === id }))
    );
  };

  const handleRemoveBank = (id: string) => {
    setLinkedBankAccounts((prev: LinkedBankAccount[]) => prev.filter((b) => b.id !== id));
  };

  const handleAddBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim()) return;
    const lastDigits = newBankAcc.trim().slice(-4) || `${Math.floor(1000 + Math.random() * 9000)}`;
    const newAcc: LinkedBankAccount = {
      id: `bank_${Date.now()}`,
      name: newBankName.trim(),
      acc: `•••• ${lastDigits}`,
      isPrimary: linkedBankAccounts.length === 0,
      type: newBankType,
    };
    setLinkedBankAccounts((prev) => [...prev, newAcc]);
    setNewBankName('');
    setNewBankAcc('');
    setIsAddingBank(false);
  };

  const getCardVisuals = (tier: CardItem['tier']) => {
    switch (tier) {
      case 'Black Titanium':
        return {
          cardBg: 'bg-gradient-to-br from-[#0066FF] via-[#004CBD] to-[#0A1A3A] text-white border-blue-400/40 shadow-[0_24px_60px_-12px_rgba(0,102,255,0.4)]',
          meshGlow: 'bg-cyan-400/25',
          chipBg: 'bg-gradient-to-br from-amber-200 via-amber-300 to-amber-400 border-amber-500/40',
          logoColor: 'text-white',
          tagBg: 'bg-white/20 text-white border-white/30 backdrop-blur-md',
        };
      case 'Champagne Gold':
        return {
          cardBg: 'bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#020617] text-white border-amber-400/30 shadow-[0_24px_50px_-12px_rgba(217,119,6,0.25)]',
          meshGlow: 'bg-amber-500/20',
          chipBg: 'bg-gradient-to-br from-amber-200 via-amber-300 to-amber-400 border-amber-500/40',
          logoColor: 'text-amber-300',
          tagBg: 'bg-amber-400/20 text-amber-200 border-amber-400/30',
        };
      case 'Pearl Sovereign':
      default:
        return {
          cardBg: 'bg-gradient-to-br from-[#0F172A] via-[#0B1120] to-[#050811] text-white border-white/20 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.6)]',
          meshGlow: 'bg-blue-400/20',
          chipBg: 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 border-slate-400/40',
          logoColor: 'text-white',
          tagBg: 'bg-white/10 text-slate-300 border-white/20',
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in pb-16 lg:pb-0">
      {/* Top Header Bento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-white/10 border border-blue-200/60 dark:border-white/15 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-2">
            <CreditCard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>PAYMENT INSTRUMENTS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Cards & Banking Rails
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Physical aerospace-grade titanium, instant tokenized virtual cards, and connected liquidity rails.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIssueModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4 text-white" />}
          className="shadow-[0_8px_20px_-4px_rgba(0,102,255,0.4)]"
        >
          Issue New Card
        </Button>
      </div>

      {/* Main Grid: Card Presentation & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Physical Card Showcase & Selector (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {activeCard && (
            <div className="space-y-4">
              {/* Luxury Realistic Titanium / Virtual Card */}
              {(() => {
                const visual = getCardVisuals(activeCard.tier);
                const isRevealed = revealedCardId === activeCard.id;
                const fullNumber = isRevealed
                  ? revealedDetails[activeCard.id]?.cardNumber || activeCard.cardNumber || '4820 9912 3456 7890'
                  : activeCard.maskedNumber.replace('••••', '•••• •••• ••••');

                return (
                  <div
                    className={clsx(
                      'w-full aspect-[1.586/1] rounded-3xl p-7 sm:p-8 border relative overflow-hidden transition-all duration-300 select-none flex flex-col justify-between group',
                      visual.cardBg,
                      activeCard.isFrozen && 'opacity-65 grayscale-[60%]'
                    )}
                  >
                    {/* Ambient Glow Mesh Behind Card */}
                    <div
                      className={clsx(
                        'absolute -right-12 -top-12 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-50 transition-opacity',
                        visual.meshGlow
                      )}
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.12] pointer-events-none" />

                    {/* Top Row: Monogram, Tier & Contactless Status */}
                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={clsx('font-black text-xl tracking-[0.22em]', visual.logoColor)}>
                            AURELIS
                          </span>
                          <span className={clsx('text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border', visual.tagBg)}>
                            {activeCard.type}
                          </span>
                        </div>
                        <span className="text-[10px] uppercase font-mono tracking-wider opacity-75 mt-0.5 block">
                          {activeCard.tier}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {activeCard.isFrozen && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            FROZEN
                          </span>
                        )}
                        <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
                          <Wifi className="w-4 h-4 opacity-80 rotate-90" />
                        </div>
                      </div>
                    </div>

                    {/* Middle: EMV Holographic Chip & Quick Actions */}
                    <div className="my-auto relative z-10 flex items-center justify-between">
                      <div className={clsx('w-12 h-9 rounded-lg border shadow-xs relative overflow-hidden', visual.chipBg)}>
                        <div className="absolute inset-0 border-t border-b border-black/20 top-2.5 bottom-2.5" />
                        <div className="absolute inset-0 border-l border-r border-black/20 left-3.5 right-3.5" />
                      </div>

                      {/* Card Reveal Button floating */}
                      <button
                        onClick={() => handleToggleReveal(activeCard.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/15 transition-colors"
                      >
                        {isRevealed ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Hide</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Unmask Details</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Bottom: Number, Holder, Expiry & CVV */}
                    <div className="space-y-3 relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-base sm:text-xl tracking-[0.24em] font-medium drop-shadow-sm">
                          {fullNumber}
                        </div>
                        {isRevealed && (
                          <button
                            onClick={() => copyToClipboard(fullNumber.replace(/\s+/g, ''), 'number')}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                            title="Copy Card Number"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-end justify-between text-xs pt-1 border-t border-white/10">
                        <div>
                          <div className="text-[9px] uppercase tracking-widest opacity-60 font-semibold">
                            CARDHOLDER
                          </div>
                          <div className="font-bold tracking-wider uppercase text-xs sm:text-sm mt-0.5">
                            {activeCard.holderName}
                          </div>
                        </div>

                        <div className="flex items-center gap-5">
                          <div>
                            <div className="text-[9px] uppercase tracking-widest opacity-60 font-semibold">
                              EXPIRES
                            </div>
                            <div className="font-mono font-medium text-xs sm:text-sm mt-0.5">
                              {activeCard.expiry}
                            </div>
                          </div>

                          <div>
                            <div className="text-[9px] uppercase tracking-widest opacity-60 font-semibold">
                              CVV
                            </div>
                            <div className="font-mono font-medium text-xs sm:text-sm mt-0.5">
                              {isRevealed
                                ? revealedDetails[activeCard.id]?.cvv || activeCard.cvv
                                : '•••'}
                            </div>
                          </div>

                          {isRevealed && (
                            <div>
                              <div className="text-[9px] uppercase tracking-widest opacity-60 font-semibold text-blue-400">
                                PIN
                              </div>
                              <div className="font-mono font-bold text-xs sm:text-sm text-blue-400 mt-0.5">
                                {revealedDetails[activeCard.id]?.pin || activeCard.pin || '••••'}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Card Switcher Dock */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                {cards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => setSelectedCardId(card.id)}
                    className={clsx(
                      'px-4 py-2.5 rounded-2xl text-xs font-semibold tracking-wide border transition-all flex items-center gap-2.5 whitespace-nowrap',
                      selectedCardId === card.id
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                        : 'bg-black/[0.04] dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                    )}
                  >
                    <CreditCard className={clsx('w-4 h-4', selectedCardId === card.id ? 'text-white' : 'text-blue-600 dark:text-blue-400')} />
                    <span>{card.tier}</span>
                    <span className="font-mono text-[10px] opacity-75">{card.maskedNumber}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Cryptographic Security & Spending Limits (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {activeCard && (
            <div className="glass-bento rounded-3xl p-6 space-y-5 text-gray-900 dark:text-white">
              <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Card Security & Rails
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Real-time cryptographic card configuration
                  </p>
                </div>

                <div className="p-2 rounded-xl bg-black/5 dark:bg-white/10 text-gray-900 dark:text-white border border-black/10 dark:border-white/15">
                  <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>

              {/* Freeze Toggle Row */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 shadow-xs">
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      'p-2.5 rounded-xl border',
                      activeCard.isFrozen
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                    )}
                  >
                    {activeCard.isFrozen ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white">
                      {activeCard.isFrozen ? 'Card is Frozen' : 'Card is Active'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {activeCard.isFrozen ? 'All POS & online charges blocked' : 'Global liquidity active'}
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={activeCard.isFrozen ? 'primary' : 'outline'}
                  onClick={() => toggleCardFreeze(activeCard.id)}
                  className={activeCard.isFrozen ? 'bg-rose-600 hover:bg-rose-500 text-white' : ''}
                >
                  {activeCard.isFrozen ? 'Unfreeze' : 'Freeze Card'}
                </Button>
              </div>

              {/* Monthly Spending Limit Slider */}
              <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      Monthly Spending Cap
                    </span>
                  </div>
                  <span className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">
                    {formatCurrency(activeCard.monthlyLimit, 'USD')}
                  </span>
                </div>

                <input
                  type="range"
                  min="5000"
                  max="100000"
                  step="5000"
                  value={activeCard.monthlyLimit}
                  onChange={(e) => updateCardLimits(activeCard.id, Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none"
                />

                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>Spent: {formatCurrency(activeCard.currentSpent, 'USD')}</span>
                  <span>Available: {formatCurrency(Math.max(0, activeCard.monthlyLimit - activeCard.currentSpent), 'USD')}</span>
                </div>
              </div>

              {/* Toggle Rails */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03]">
                  <div className="flex items-center gap-2.5">
                    <Wifi className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Contactless Tap-to-Pay</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03]">
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">International Online Payments</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03]">
                  <div className="flex items-center gap-2.5">
                    <Zap className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">ATM Cash Withdrawals</span>
                  </div>
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                      activeCard.atmWithdrawalsEnabled
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-black/5 dark:bg-white/5 text-slate-400 dark:text-slate-500 border-black/10 dark:border-white/10'
                    )}
                  >
                    {activeCard.atmWithdrawalsEnabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Linked Institutional Banking Accounts Bento */}
      <div className="glass-bento rounded-3xl p-6 sm:p-8 space-y-5 text-gray-900 dark:text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/10 dark:border-slate-800 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
              <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>CLEARING RAILS</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Linked External Bank Accounts
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Institutional depository accounts configured for bidirectional treasury transfers & sweeps.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAddingBank(!isAddingBank)}
            leftIcon={<Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
          >
            {isAddingBank ? 'Cancel' : 'Add Bank Account'}
          </Button>
        </div>

        {isAddingBank && (
          <form
            onSubmit={handleAddBankAccount}
            className="p-5 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] space-y-4 animate-fade-in"
          >
            <div className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Connect External Banking Rail
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Bank Name (e.g. JPMorgan Chase, UBS)"
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                required
                className="px-3.5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] text-xs text-gray-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="Account No / IBAN (last 4 digits)"
                value={newBankAcc}
                onChange={(e) => setNewBankAcc(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] text-xs text-gray-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
              />
              <select
                value={newBankType}
                onChange={(e) => setNewBankType(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Checking">Checking Account</option>
                <option value="Savings / Custody">Savings / Custody</option>
                <option value="Treasury">Treasury Deposit</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setIsAddingBank(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" type="submit">
                Link Depository
              </Button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {linkedBankAccounts.map((acc) => (
            <div
              key={acc.id}
              className="p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] hover:border-black/20 dark:hover:border-white/20 transition-all flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-white/[0.04] border border-blue-200/60 dark:border-white/10 text-blue-600 dark:text-blue-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>{acc.name}</span>
                    {acc.isPrimary && (
                      <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-white/[0.06] border border-blue-200 dark:border-white/10 px-2 py-0.5 rounded-full">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {acc.acc} • {acc.type}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!acc.isPrimary && (
                  <button
                    onClick={() => handleSetPrimaryBank(acc.id)}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors"
                  >
                    Set Primary
                  </button>
                )}
                <button
                  onClick={() => handleRemoveBank(acc.id)}
                  className="text-xs text-slate-400 hover:text-rose-500 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <IssueCardModal
        isOpen={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
      />
    </div>
  );
};
