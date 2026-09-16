import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Check,
  ArrowRight,
  ArrowDown,
  ShieldCheck,
  Fingerprint,
  Download,
  ReceiptText,
  Clock,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Loader2,
  UserCheck,
  Lock,
  Eye,
  EyeOff,
  Delete,
  ArrowLeft,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CurrencyCode, Recipient, Transaction } from '../../types';
import { CURRENCIES, calculateTransferQuote, formatCurrency, getExchangeRate } from '../../utils/currency';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { CurrencySelector } from '../common/CurrencySelector';
import { Input } from '../common/Input';
import { printReceipt } from '../../utils/receiptGenerator';
import { AurelisApiClient } from '../../services/api';
import { clsx } from 'clsx';

interface SendMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRecipient?: Recipient;
  initialAmount?: number;
  initialCurrency?: CurrencyCode;
}

type Step = 'recipient' | 'amount' | 'review' | 'security' | 'success';

interface MatchedUserSummary {
  id: string;
  fullName: string;
  email: string;
  aurelisTag?: string;
  avatar?: string;
  tier?: string;
  baseCurrency?: CurrencyCode;
}

export const SendMoneyModal: React.FC<SendMoneyModalProps> = ({
  isOpen,
  onClose,
  initialRecipient,
  initialAmount,
  initialCurrency = 'USD',
}) => {
  const {
    user,
    recipients,
    wallets,
    sendMoney,
    openTxnDetail,
  } = useApp();

  const [step, setStep] = useState<Step>('recipient');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [lookupResult, setLookupResult] = useState<{
    found: boolean;
    isSelf?: boolean;
    user?: MatchedUserSummary;
    matches?: MatchedUserSummary[];
  } | null>(null);

  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);

  // Amount & Transfer Details
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>(initialCurrency);
  const [toCurrency, setToCurrency] = useState<CurrencyCode>('USD');
  const [amountStr, setAmountStr] = useState<string>(
    initialAmount ? initialAmount.toString() : ''
  );
  const [recipientAmountStr, setRecipientAmountStr] = useState<string>('');
  const [reference, setReference] = useState('');

  // Security & PIN State
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);

  // Resulting Transaction
  const [completedTxn, setCompletedTxn] = useState<Transaction | null>(null);

  // Initialize or reset when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialRecipient) {
        setSelectedRecipient(initialRecipient);
        setToCurrency(initialRecipient.currency);
        setStep('amount');
        if (initialAmount) {
          const rate = getExchangeRate(initialCurrency || 'USD', initialRecipient.currency);
          const dec = CURRENCIES[initialRecipient.currency]?.decimals ?? 2;
          setRecipientAmountStr((initialAmount * rate).toFixed(dec));
        } else {
          setRecipientAmountStr('');
        }
      } else {
        setSelectedRecipient(null);
        setStep('recipient');
        setRecipientAmountStr('');
      }
      setSearchQuery('');
      setLookupResult(null);
      setIsSearching(false);
      setPin('');
      setShowPin(false);
      setPinError(null);
      setIsShaking(false);
      setIsAuthenticating(false);
      setAuthSuccess(false);
      setCompletedTxn(null);
      if (initialAmount) setAmountStr(initialAmount.toString());
      if (initialCurrency) setFromCurrency(initialCurrency);
    }
  }, [isOpen, initialRecipient, initialAmount, initialCurrency]);

  // Real-time lookup effect as user types User ID or Email
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setLookupResult(null);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await AurelisApiClient.lookupUser(trimmed);
        setLookupResult(res);
      } catch (err) {
        console.warn('Live recipient lookup error:', err);
        setLookupResult({ found: false });
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleTriggerSearch = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setIsSearching(true);
    try {
      const res = await AurelisApiClient.lookupUser(trimmed);
      setLookupResult(res);
    } catch (err) {
      setLookupResult({ found: false });
    } finally {
      setIsSearching(false);
    }
  };

  const currentRate = getExchangeRate(fromCurrency, toCurrency);

  const handleSendAmountChange = (val: string) => {
    setAmountStr(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const dec = CURRENCIES[toCurrency]?.decimals ?? 2;
      setRecipientAmountStr((num * currentRate).toFixed(dec));
    } else {
      setRecipientAmountStr('');
    }
  };

  const handleRecipientAmountChange = (val: string) => {
    setRecipientAmountStr(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const dec = CURRENCIES[fromCurrency]?.decimals ?? 2;
      const calculatedSend = (num / currentRate).toFixed(dec);
      setAmountStr(calculatedSend);
    } else {
      setAmountStr('');
    }
  };

  const handleFromCurrencyChange = (newCurr: CurrencyCode) => {
    setFromCurrency(newCurr);
    const newRate = getExchangeRate(newCurr, toCurrency);
    const num = parseFloat(amountStr);
    if (!isNaN(num) && num > 0) {
      const dec = CURRENCIES[toCurrency]?.decimals ?? 2;
      setRecipientAmountStr((num * newRate).toFixed(dec));
    }
  };

  const safeWallets = Array.isArray(wallets) ? wallets : [];
  const fromWallet = safeWallets.find((w) => w?.currency === fromCurrency) || safeWallets[0];
  const availableBalance = fromWallet ? fromWallet.balance : 0;

  const handleQuickPercent = (pct: number) => {
    const calculated = Number((availableBalance * pct).toFixed(2));
    handleSendAmountChange(calculated.toString());
  };

  const parsedAmount = parseFloat(amountStr) || 0;
  const isAurelisPeer = selectedRecipient?.aurelisTag ? true : false;
  const quote = calculateTransferQuote(parsedAmount, fromCurrency, toCurrency, isAurelisPeer);
  const isInsufficient = quote.totalCharged > availableBalance;

  // Filter recent recipients excluding current logged-in user
  const safeRecipients = Array.isArray(recipients) ? recipients : [];
  const userEmail = (user?.email || '').toLowerCase().trim();
  const filteredRecipients = safeRecipients.filter((r) => {
    if (!r) return false;
    const rId = String(r.id || '');
    const rEmail = String(r.email || '').toLowerCase().trim();
    if (user?.id && rId === user.id) return false;
    if (userEmail && rEmail === userEmail) return false;
    return true;
  });

  const handleSelectFoundUser = (matched: MatchedUserSummary) => {
    const matchedId = String(matched?.id || '');
    const matchedEmail = String(matched?.email || '').toLowerCase().trim();
    if ((user?.id && matchedId === user.id) || (userEmail && matchedEmail === userEmail)) {
      alert('Self-transfer is not permitted. To move or convert funds between your own wallets, use Currency Exchange.');
      return;
    }

    const recipientObj: Recipient = {
      id: matched.id,
      name: matched.fullName || 'Beneficiary',
      email: matched.email || '',
      currency: matched.baseCurrency || 'USD',
      bankName: 'Aurelis Sovereign Vault',
      accountNumber: `ID: ${matched.id}`,
      routingOrIban: 'SWIFT-AURLCHZZ',
      aurelisTag: matched.aurelisTag || `@${matched.fullName.toLowerCase().replace(/\s+/g, '')}`,
      avatar: matched.avatar,
    };

    setSelectedRecipient(recipientObj);
    setToCurrency(recipientObj.currency);
    setStep('amount');

    if (amountStr) {
      const rate = getExchangeRate(fromCurrency, recipientObj.currency);
      const dec = CURRENCIES[recipientObj.currency]?.decimals ?? 2;
      setRecipientAmountStr((parseFloat(amountStr) * rate).toFixed(dec));
    }
  };

  const handleSelectRecipient = (r: Recipient) => {
    const rId = String(r?.id || '');
    const rEmail = String(r?.email || '').toLowerCase().trim();
    if ((user?.id && rId === user.id) || (userEmail && rEmail === userEmail)) {
      alert('Self-transfer is not permitted. To move or convert funds between your own wallets, use Currency Exchange.');
      return;
    }

    setSelectedRecipient(r);
    setToCurrency(r.currency);
    setStep('amount');

    if (amountStr) {
      const rate = getExchangeRate(fromCurrency, r.currency);
      const dec = CURRENCIES[r.currency]?.decimals ?? 2;
      setRecipientAmountStr((parseFloat(amountStr) * rate).toFixed(dec));
    }
  };

  // PIN Verification Handlers
  const handleVerifyPinAndSend = async (pinCandidate?: string) => {
    if (!selectedRecipient) return;
    const pinToVerify = pinCandidate !== undefined ? pinCandidate : pin;

    if (!pinToVerify || pinToVerify.length !== 4) {
      setPinError('Please enter your complete 4-digit Security PIN.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    const expectedPin = user?.transactionPin || '1234';
    if (pinToVerify.trim() !== expectedPin.trim()) {
      setIsShaking(true);
      setPinError('Incorrect Security PIN. Authorization rejected.');
      setTimeout(() => {
        setIsShaking(false);
        setPin('');
      }, 600);
      return;
    }

    setIsAuthenticating(true);
    setPinError(null);

    try {
      const txn = await sendMoney({
        recipient: selectedRecipient,
        amount: parsedAmount,
        currency: toCurrency,
        fee: quote.fee,
        reference,
        fromWalletCurrency: fromCurrency,
        exchangeRate: quote.rate,
        destinationAmount: quote.converted,
        pin: pinToVerify,
      });

      setAuthSuccess(true);
      setTimeout(() => {
        setCompletedTxn(txn);
        setIsAuthenticating(false);
        setStep('success');
      }, 600);
    } catch (err: any) {
      setIsAuthenticating(false);
      setAuthSuccess(false);
      setIsShaking(true);
      setPinError(err.message || 'Transfer failed. Please check your credentials.');
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (isAuthenticating || authSuccess) return;
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setPinError(null);
      if (nextPin.length === 4) {
        handleVerifyPinAndSend(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    if (isAuthenticating || authSuccess) return;
    setPin((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  const handleClearPin = () => {
    if (isAuthenticating || authSuccess) return;
    setPin('');
    setPinError(null);
  };

  const handleBiometricQuickAuth = () => {
    if (isAuthenticating || authSuccess) return;
    setIsAuthenticating(true);
    setPinError(null);
    setTimeout(() => {
      const expectedPin = user?.transactionPin || '1234';
      setPin(expectedPin);
      handleVerifyPinAndSend(expectedPin);
    }, 700);
  };

  // Physical keyboard listener for PIN step
  useEffect(() => {
    if (!isOpen || step !== 'security' || isAuthenticating || authSuccess) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleKeypadPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setStep('review');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step, pin, isAuthenticating, authSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={() => {
          if (!isAuthenticating) onClose();
        }}
      />

      {/* Frosted Glass Modal Card */}
      <div className="glass-bento relative w-full max-w-lg rounded-3xl overflow-hidden z-10 animate-scale-in my-auto text-gray-900 dark:text-white shadow-xl dark:shadow-[0_24px_64px_-8px_rgba(0,0,0,0.85)]">
        {/* Header with Step Indicator */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-500 dark:text-blue-400 block">
              Private Sovereign Transfer • Step {step === 'recipient' ? '1 of 4' : step === 'amount' ? '2 of 4' : step === 'review' ? '3 of 4' : step === 'security' ? '4 of 4' : 'Confirmation'}
            </span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight mt-0.5">
              {step === 'recipient' && 'Find Recipient by User ID or Email'}
              {step === 'amount' && 'Specify Transfer Amount'}
              {step === 'review' && 'Review & Authorize'}
              {step === 'security' && 'Security PIN Verification'}
              {step === 'success' && 'Transfer Dispatched'}
            </h3>
          </div>

          <button
            onClick={onClose}
            disabled={isAuthenticating}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* STEP 1: DIRECT SEARCH BY USER ID OR EMAIL */}
          {step === 'recipient' && (
            <div className="space-y-4 animate-fade-in">
              {/* Direct Search Bar */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 block">
                  Search by User ID, Email, or @Tag
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. usr_02 or victoria@sterling.ch"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleTriggerSearch();
                        }
                      }}
                      autoFocus
                      className="w-full bg-black/[0.03] dark:bg-white/[0.04] rounded-xl border border-gray-300 dark:border-white/10 pl-10 pr-9 py-3 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-blue-500 dark:focus:border-white/30 focus:outline-none transition-colors"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setLookupResult(null);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <Button
                    size="md"
                    variant="primary"
                    onClick={handleTriggerSearch}
                    disabled={!searchQuery.trim() || isSearching}
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                  </Button>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  Search directly via User ID or Email to send money immediately. No contact setup required.
                </p>
              </div>

              {/* Searching Indicator */}
              {isSearching && (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  <span className="text-xs">Searching Aurelis client registry...</span>
                </div>
              )}

              {/* Self-transfer Warning Banner */}
              {!isSearching && lookupResult?.isSelf && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-3 animate-slide-up">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-sm text-amber-900 dark:text-amber-200">Self-transfer is not permitted</span>
                    You entered your own Aurelis account ({user?.email || user?.id}). To convert or transfer funds between your own multi-currency wallets, please use the Currency Exchange feature.
                  </div>
                </div>
              )}

              {/* Matched Clients Found */}
              {!isSearching && lookupResult?.found && !lookupResult.isSelf && (
                <div className="space-y-2 animate-slide-up">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-500 dark:text-blue-400">
                    {lookupResult.matches && lookupResult.matches.length > 1
                      ? `Matched Sovereign Clients (${lookupResult.matches.length})`
                      : 'Verified Sovereign Recipient'}
                  </div>

                  {((lookupResult.matches && lookupResult.matches.length > 0)
                    ? lookupResult.matches
                    : lookupResult.user
                    ? [lookupResult.user]
                    : []
                  ).map((matched) => (
                    <div
                      key={matched.id}
                      onClick={() => handleSelectFoundUser(matched)}
                      className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] hover:bg-white/90 dark:hover:bg-white/[0.06] hover:border-gray-300 dark:hover:border-white/25 flex items-center justify-between gap-3 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar src={matched.avatar} name={matched.fullName} size="md" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors truncate">
                              {matched.fullName}
                            </span>
                            <span className="text-[9px] uppercase font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-white/10 px-1.5 py-0.5 rounded border border-blue-200 dark:border-white/15">
                              Verified
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">
                            {matched.email}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-blue-600 dark:text-blue-400 mt-1">
                            <span className="bg-blue-50 dark:bg-white/10 px-1.5 py-0.5 rounded border border-blue-200 dark:border-white/15">
                              ID: {matched.id}
                            </span>
                            {matched.aurelisTag && (
                              <span className="text-gray-400 dark:text-slate-500 font-normal">
                                {matched.aurelisTag}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono font-bold uppercase bg-blue-600 text-white px-2 py-0.5 rounded shadow-sm">
                          {matched.baseCurrency || 'USD'}
                        </span>
                        <div className="mt-2 flex items-center justify-end gap-1 text-xs font-bold text-blue-500 group-hover:translate-x-0.5 transition-transform">
                          <span>Select</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No Registered Client Found */}
              {!isSearching && lookupResult && !lookupResult.found && !lookupResult.isSelf && searchQuery.trim().length > 0 && (
                <div className="p-6 rounded-xl border border-dashed border-gray-300 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02] text-center space-y-1.5 animate-fade-in">
                  <Search className="w-6 h-6 text-gray-400 dark:text-slate-500 mx-auto opacity-50 mb-1" />
                  <div className="text-xs font-bold text-gray-900 dark:text-white">No Registered Client Found</div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 max-w-xs mx-auto">
                    No Aurelis account found matching "<span className="font-mono text-blue-500">{searchQuery}</span>". Please verify the User ID or Email.
                  </p>
                </div>
              )}

              {/* Recent Counterparties / Quick Select */}
              {!lookupResult?.found && filteredRecipients.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-white/10">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">
                    <span>Recent Counterparties</span>
                    <span>Quick Select</span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {filteredRecipients.map((r) => (
                      <div
                        key={r.id || `${r.email}-${Math.random()}`}
                        onClick={() => handleSelectRecipient(r)}
                        className="p-3 rounded-xl border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-white/60 dark:bg-white/[0.03] hover:bg-white/90 dark:hover:bg-white/[0.06] flex items-center justify-between gap-3 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar src={r.avatar} name={r.name || 'Beneficiary'} size="md" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors truncate flex items-center gap-1.5">
                              <span>{r.name || 'Sovereign Beneficiary'}</span>
                              {r.aurelisTag && (
                                <span className="text-[10px] text-blue-500 font-mono">
                                  {r.aurelisTag}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                              {r.email || 'No email recorded'}
                            </div>
                            <div className="text-[10px] font-mono text-gray-400 dark:text-slate-500 mt-0.5">
                              ID: {r.id || 'N/A'}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-mono font-bold uppercase bg-blue-50 dark:bg-white/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-white/15 px-2 py-0.5 rounded">
                            {r.currency || 'USD'}
                          </span>
                          <div className="mt-1 text-[11px] font-semibold text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1">
                            <span>Send</span>
                            <ArrowRight className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Helpful Instructions when Search is Empty and No Recent Contacts */}
              {!searchQuery && filteredRecipients.length === 0 && (
                <div className="p-6 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-white/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-white/15 flex items-center justify-center mx-auto">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    Instant Peer Transfers
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
                    Type any recipient's User ID (e.g. <span className="font-mono text-blue-500">usr_02</span>) or Email above to search, select, and send funds directly.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: AMOUNT & CURRENCY */}
          {step === 'amount' && selectedRecipient && (
            <div className="space-y-5 animate-fade-in">
              {/* Selected Beneficiary Summary Tag */}
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar src={selectedRecipient.avatar} name={selectedRecipient.name} size="sm" />
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white">
                      Sending to {selectedRecipient.name}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-slate-400 flex items-center gap-2">
                      <span>{selectedRecipient.email}</span>
                      {selectedRecipient.id && (
                        <span className="font-mono text-blue-500 dark:text-blue-400 text-[10px]">
                          ID: {selectedRecipient.id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('recipient')}
                  className="text-xs font-semibold text-blue-500 dark:text-blue-400 hover:underline"
                >
                  Change
                </button>
              </div>

              {/* Dual-Currency Amount Input Container */}
              <div className="space-y-3">
                {/* You Send Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 space-y-3 focus-within:border-blue-400 dark:focus-within:border-white/30 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                      You Send ({fromCurrency})
                    </span>
                    <span className="text-xs text-gray-500 dark:text-slate-400 font-mono-nums">
                      Available: {formatCurrency(availableBalance, fromCurrency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <span className="text-2xl text-gray-400 dark:text-slate-500 absolute left-0 top-1/2 -translate-y-1/2">
                        {CURRENCIES[fromCurrency]?.symbol || '$'}
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={amountStr}
                        onChange={(e) => handleSendAmountChange(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-transparent text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white pl-7 focus:outline-none"
                      />
                    </div>

                    <CurrencySelector
                      value={fromCurrency}
                      onChange={handleFromCurrencyChange}
                      showBalance
                    />
                  </div>

                  {/* Quick percentage pills */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => handleQuickPercent(0.25)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      25%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPercent(0.50)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPercent(1.0)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      Max
                    </button>
                  </div>
                </div>

                {/* Interactive Currency Conversion Rate Divider (when cross-currency) */}
                {fromCurrency !== toCurrency && (
                  <div className="relative flex items-center justify-center my-0.5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200 dark:border-white/10"></div>
                    </div>
                    <div className="relative px-3 py-1 bg-white dark:bg-[#0E0E18]/80 border border-gray-200 dark:border-white/15 rounded-full text-[11px] font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2 shadow-sm">
                      <ArrowDown className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 animate-bounce" />
                      <span className="font-mono">
                        1 {fromCurrency} = {currentRate.toFixed(4)} {toCurrency}
                      </span>
                    </div>
                  </div>
                )}

                {/* Recipient Receives Card (when cross-currency) */}
                {fromCurrency !== toCurrency && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 space-y-3 focus-within:border-blue-400 dark:focus-within:border-white/30 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        {selectedRecipient.name} Receives ({toCurrency})
                      </span>
                      <span className="text-[11px] text-blue-500 dark:text-blue-300 font-semibold">
                        Guaranteed Rate Lock
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="relative flex-1">
                        <span className="text-2xl text-blue-500 dark:text-blue-400 absolute left-0 top-1/2 -translate-y-1/2">
                          {CURRENCIES[toCurrency]?.symbol || ''}
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={recipientAmountStr}
                          onChange={(e) => handleRecipientAmountChange(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-transparent text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white pl-7 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/[0.06] px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm shrink-0">
                        <span className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400">
                          {toCurrency}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 pt-1">
                      Type the exact {toCurrency} amount {selectedRecipient.name} needs to receive, or enter what you send above.
                    </p>
                  </div>
                )}
              </div>

              {/* Quote Breakdown */}
              <div className="space-y-2 text-xs border-t border-gray-200 dark:border-white/10 pt-3">
                <div className="flex justify-between text-gray-500 dark:text-slate-400">
                  <span>Exchange rate</span>
                  <span className="font-mono text-gray-900 dark:text-white">
                    1 {fromCurrency} = {quote.rate.toFixed(4)} {toCurrency}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-slate-400">
                  <span>Transfer fee</span>
                  <span className="text-gray-900 dark:text-white">{quote.fee === 0 ? 'Complimentary ($0.00)' : formatCurrency(quote.fee, fromCurrency)}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-slate-400">
                  <span>Estimated arrival</span>
                  <span className="text-blue-500 dark:text-blue-400 font-medium">{quote.estimatedArrival}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-white/10">
                  <span>Total charged</span>
                  <span className="font-mono-nums text-blue-500 dark:text-blue-400">{formatCurrency(quote.totalCharged, fromCurrency)}</span>
                </div>
              </div>

              {/* Note / Memo */}
              <Input
                label="Transfer Reference / Memo"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. Invoice settlement"
              />

              {isInsufficient && (
                <p className="text-xs text-rose-500 dark:text-rose-400 font-medium">
                  Insufficient funds in {fromCurrency} wallet ({formatCurrency(availableBalance, fromCurrency)} available).
                </p>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('recipient')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={parsedAmount <= 0 || isInsufficient}
                  onClick={() => setStep('review')}
                  className="flex-1 shadow-[0_8px_20px_-4px_rgba(0,102,255,0.4)]"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Review Details
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW CONFIRMATION */}
          {step === 'review' && selectedRecipient && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-5 rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 space-y-3.5">
                <div className="flex justify-between text-xs pb-2 border-b border-gray-200 dark:border-white/10">
                  <span className="text-gray-500 dark:text-slate-400">From</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    AURELIS {fromCurrency} Wallet
                  </span>
                </div>

                <div className="flex justify-between text-xs pb-2 border-b border-gray-200 dark:border-white/10">
                  <span className="text-gray-500 dark:text-slate-400">To</span>
                  <span className="font-semibold text-gray-900 dark:text-white text-right">
                    {selectedRecipient.name}
                    <div className="text-[10px] text-gray-400 dark:text-slate-500 font-normal">
                      {selectedRecipient.email}
                    </div>
                  </span>
                </div>

                <div className="flex justify-between text-xs pb-2 border-b border-gray-200 dark:border-white/10">
                  <span className="text-gray-500 dark:text-slate-400">Amount</span>
                  <span className="font-semibold text-gray-900 dark:text-white font-mono-nums">
                    {formatCurrency(parsedAmount, fromCurrency)}
                  </span>
                </div>

                {fromCurrency !== toCurrency && (
                  <div className="flex justify-between text-xs pb-2 border-b border-gray-200 dark:border-white/10">
                    <span className="text-gray-500 dark:text-slate-400">Recipient Gets</span>
                    <span className="font-semibold text-blue-500 dark:text-blue-400 font-mono-nums">
                      {formatCurrency(quote.converted, toCurrency)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-xs pb-2 border-b border-gray-200 dark:border-white/10">
                  <span className="text-gray-500 dark:text-slate-400">Fee</span>
                  <span className="text-gray-900 dark:text-white">
                    {quote.fee === 0 ? 'Complimentary' : formatCurrency(quote.fee, fromCurrency)}
                  </span>
                </div>

                <div className="flex justify-between text-xs pb-2 border-b border-gray-200 dark:border-white/10">
                  <span className="text-gray-500 dark:text-slate-400">Estimated Arrival</span>
                  <span className="text-blue-500 dark:text-blue-400 font-semibold">Today (Instant)</span>
                </div>

                <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white pt-1">
                  <span>Total</span>
                  <span className="text-blue-500 dark:text-blue-400 font-mono-nums">
                    {formatCurrency(quote.totalCharged, fromCurrency)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 text-xs text-gray-500 dark:text-slate-400 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
                <span>
                  Protected by AURELIS Sovereign Cryptographic Settlement. Irreversible once dispatched.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('amount')}
                  className="flex-1"
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    setStep('security');
                    setPin('');
                    setPinError(null);
                    setIsShaking(false);
                  }}
                  className="flex-1 shadow-[0_8px_20px_-4px_rgba(0,102,255,0.4)]"
                  leftIcon={<ShieldCheck className="w-4 h-4 text-white" />}
                >
                  Authorize with PIN
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: SECURITY PIN VERIFICATION */}
          {step === 'security' && selectedRecipient && (
            <div className="space-y-6 animate-fade-in py-2">
              {/* Security Badge & Context Header */}
              <div className="text-center space-y-2">
                <div className="relative w-16 h-16 rounded-full bg-blue-50 dark:bg-white/[0.04] border border-blue-200 dark:border-white/15 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 shadow-[0_0_25px_rgba(0,102,255,0.2)]">
                  {authSuccess ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 animate-scale-in" />
                  ) : isAuthenticating ? (
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 dark:text-blue-400" />
                  ) : (
                    <Lock className="w-7 h-7 text-blue-500 dark:text-blue-400" />
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                    {authSuccess
                      ? 'PIN Verified • Transfer Authorized'
                      : isAuthenticating
                      ? 'Authenticating & Settling Transfer...'
                      : 'Enter Security PIN'}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
                    {isAuthenticating ? (
                      'Executing cryptographic vault dispatch...'
                    ) : (
                      <>
                        Authorize transfer of{' '}
                        <span className="font-semibold text-blue-500 dark:text-blue-400 font-mono-nums">
                          {formatCurrency(quote.totalCharged, fromCurrency)}
                        </span>{' '}
                        to <span className="font-semibold text-gray-900 dark:text-white">{selectedRecipient.name}</span>
                        {fromCurrency !== toCurrency && (
                          <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-1.5 font-medium bg-blue-50 dark:bg-white/[0.04] py-1 px-3 rounded-lg border border-blue-200 dark:border-white/10 inline-block">
                            Recipient receives <span className="font-bold">{formatCurrency(quote.converted, toCurrency)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* 4-Digit Luxury PIN Indicator Cells */}
              <div className="space-y-2.5">
                <div
                  className={clsx(
                    'flex items-center justify-center gap-3 sm:gap-3.5 py-1',
                    isShaking && 'animate-shake'
                  )}
                >
                  {[0, 1, 2, 3].map((index) => {
                    const isFilled = pin.length > index;
                    const isCurrent = pin.length === index;
                    const digit = pin[index];

                    return (
                      <div
                        key={index}
                        className={clsx(
                          'w-13 h-14 sm:w-14 sm:h-16 rounded-2xl border-2 flex items-center justify-center transition-all duration-200 select-none shadow-sm',
                          isFilled
                            ? 'border-blue-500 dark:border-white/40 bg-blue-50 dark:bg-white/10 shadow-[0_0_20px_rgba(0,102,255,0.25)]'
                            : isCurrent
                            ? 'border-blue-500 dark:border-white/40 bg-blue-50/50 dark:bg-white/[0.06] ring-2 ring-blue-400/20 dark:ring-white/20'
                            : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03]'
                        )}
                      >
                        {isFilled ? (
                          showPin ? (
                            <span className="font-mono text-xl sm:text-2xl font-bold text-gray-900 dark:text-white animate-scale-in">
                              {digit}
                            </span>
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full bg-blue-500 dark:bg-blue-400 animate-scale-in" />
                          )
                        ) : isCurrent ? (
                          <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse" />
                        ) : null}
                      </div>
                    );
                  })}

                  {/* Mask / Reveal Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="p-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] hover:border-gray-300 dark:hover:border-white/20 text-gray-400 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-all ml-1 cursor-pointer"
                    title={showPin ? 'Mask PIN' : 'Reveal PIN'}
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Error Banner */}
                {pinError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-center gap-2 animate-fade-in max-w-sm mx-auto">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{pinError}</span>
                  </div>
                )}

                {/* Helpful Default PIN Hint */}
                <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-gray-500 dark:text-slate-400">
                  <span className="bg-gray-100 dark:bg-white/[0.04] text-blue-600 dark:text-blue-400 px-2.5 py-0.5 rounded-full border border-gray-200 dark:border-white/10 font-medium">
                    Default PIN: <strong className="font-mono text-gray-900 dark:text-white">{user?.transactionPin || '1234'}</strong>
                  </span>
                  <button
                    type="button"
                    disabled={isAuthenticating || authSuccess}
                    onClick={() => {
                      const demoPin = user?.transactionPin || '1234';
                      setPin(demoPin);
                      handleVerifyPinAndSend(demoPin);
                    }}
                    className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    Quick Fill & Authorize
                  </button>
                </div>
              </div>

              {/* Luxury Virtual Numeric Keypad */}
              <div className="max-w-xs mx-auto space-y-2 select-none">
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      disabled={isAuthenticating || authSuccess}
                      onClick={() => handleKeypadPress(digit)}
                      className="h-12 sm:h-13 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 dark:hover:bg-white/[0.07] active:scale-95 transition-all flex items-center justify-center text-lg font-bold text-gray-900 dark:text-white shadow-sm cursor-pointer"
                    >
                      {digit}
                    </button>
                  ))}

                  {/* Bottom Row: Biometrics or Clear, 0, Backspace */}
                  <button
                    type="button"
                    disabled={isAuthenticating || authSuccess}
                    onClick={user?.biometricEnabled ? handleBiometricQuickAuth : handleClearPin}
                    className="h-12 sm:h-13 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 dark:hover:bg-white/[0.07] active:scale-95 transition-all flex flex-col items-center justify-center text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white shadow-sm cursor-pointer"
                    title={user?.biometricEnabled ? 'Touch ID / Passkey' : 'Clear'}
                  >
                    {user?.biometricEnabled ? (
                      <Fingerprint className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                    ) : (
                      <span>C</span>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isAuthenticating || authSuccess}
                    onClick={() => handleKeypadPress('0')}
                    className="h-12 sm:h-13 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 dark:hover:bg-white/[0.07] active:scale-95 transition-all flex items-center justify-center text-lg font-bold text-gray-900 dark:text-white shadow-sm cursor-pointer"
                  >
                    0
                  </button>

                  <button
                    type="button"
                    disabled={isAuthenticating || authSuccess}
                    onClick={handleBackspace}
                    className="h-12 sm:h-13 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 dark:hover:bg-white/[0.07] active:scale-95 transition-all flex items-center justify-center text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white shadow-sm cursor-pointer"
                    title="Backspace"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Navigation Back Button */}
              <div className="flex items-center justify-center pt-1">
                <button
                  type="button"
                  disabled={isAuthenticating || authSuccess}
                  onClick={() => {
                    setStep('review');
                    setPin('');
                    setPinError(null);
                  }}
                  className="text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Review Details</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: TRANSFER SUCCESS */}
          {step === 'success' && completedTxn && selectedRecipient && (
            <div className="py-4 text-center space-y-6 animate-fade-in">
              {/* Success Check Icon */}
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-white/[0.04] border border-blue-200 dark:border-white/15 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 shadow-[0_0_25px_rgba(0,102,255,0.2)]">
                <Check className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div>
                <h4 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Transfer Dispatched
                </h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Your funds are on their way to{' '}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {selectedRecipient.name}
                  </span>.
                </p>
              </div>

              {/* Amount Display */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 inline-block min-w-[220px]">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-slate-400 font-bold">
                  Amount Transferred
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5 font-mono-nums">
                  {formatCurrency(completedTxn.amount, completedTxn.currency)}
                </div>
                {completedTxn.destinationCurrency && completedTxn.destinationCurrency !== completedTxn.currency && (
                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1 font-mono-nums">
                    Recipient receives {formatCurrency(completedTxn.destinationAmount || completedTxn.amount, completedTxn.destinationCurrency)}
                  </div>
                )}
                <div className="text-[11px] font-mono text-gray-400 dark:text-slate-500 mt-1">
                  Reference: {completedTxn.id}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2 max-w-xs mx-auto">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => {
                    onClose();
                    openTxnDetail(completedTxn);
                  }}
                  leftIcon={<ReceiptText className="w-4 h-4" />}
                  className="shadow-[0_8px_20px_-4px_rgba(0,102,255,0.4)]"
                >
                  View Transaction
                </Button>

                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => printReceipt(completedTxn)}
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Download Receipt
                </Button>

                <Button
                  variant="ghost"
                  fullWidth
                  onClick={onClose}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
