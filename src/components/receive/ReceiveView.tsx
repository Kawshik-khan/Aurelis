import React, { useState } from 'react';
import {
  Copy,
  Check,
  QrCode,
  Share2,
  Send,
  Building2,
  Globe,
  Download,
  Receipt,
  ShieldCheck,
  ArrowDownLeft,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CurrencyCode } from '../../types';
import { CURRENCIES, formatCurrency } from '../../utils/currency';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { CurrencySelector } from '../common/CurrencySelector';
import { clsx } from 'clsx';

export const ReceiveView: React.FC = () => {
  const { user, wallets, openModal } = useApp();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');
  const [requestedAmount, setRequestedAmount] = useState<string>('');

  const safeWallets = Array.isArray(wallets) ? wallets : [];
  const activeWallet = safeWallets.find((w) => w?.currency === selectedCurrency) || safeWallets[0];
  const userNameSlug = (user?.name || 'vault').toLowerCase().replace(/\s+/g, '.');
  const paymentLink = `https://aurelis.com/pay/${userNameSlug}`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Generate crisp QR code on pure white background for optical scannability
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    `${paymentLink}?amount=${requestedAmount || '0'}&currency=${selectedCurrency}`
  )}&bgcolor=FFFFFF&color=090D1A`;

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in pb-16 lg:pb-0">
      {/* Header Bento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-white/10 border border-blue-200 dark:border-white/15 text-blue-600 dark:text-blue-300 text-xs font-semibold mb-2 shadow-xs">
            <ArrowDownLeft className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span>INBOUND LIQUIDITY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Receive Capital
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Share your private banking payment link, QR token, or multi-currency wire coordinates.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => openModal('request-money')}
          leftIcon={<Send className="w-4 h-4 text-white" />}
          className="shadow-[0_8px_20px_-4px_rgba(0,102,255,0.4)]"
        >
          Create Inbound Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Payment Identity & QR Code (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-bento rounded-3xl p-6 sm:p-7 text-center space-y-5">
            <div className="relative inline-block">
              <Avatar src={user.avatar} name={user.name} size="xl" className="mx-auto" />
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white dark:border-[#0A0F1D] shadow-xs">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {user.name}
              </h2>
              <div className="text-xs font-mono text-gray-500 dark:text-slate-400 mt-0.5">
                {user.email}
              </div>
              <div className="mt-2 inline-block text-[10px] uppercase font-bold tracking-wider text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-white/10 border border-blue-200 dark:border-white/15 px-3 py-1 rounded-full">
                {user.tier}
              </div>
            </div>

            {/* Payment Link Box */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 text-left shadow-2xs">
              <div className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-slate-400 mb-1.5">
                Direct Aurelis Transfer URI
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold truncate">
                  {paymentLink}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(paymentLink, 'pay-link')}
                  className="p-1.5 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/15 hover:border-gray-300 dark:hover:border-white/25 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors shrink-0"
                  title="Copy link"
                >
                  {copiedKey === 'pay-link' ? (
                    <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 stroke-[2.5]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Dynamic QR Code Card */}
            <div className="pt-1">
              <div className="p-5 rounded-2xl bg-white border border-gray-200 dark:border-white/20 inline-block shadow-lg dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                <img
                  src={qrSvgUrl}
                  alt="Aurelis Payment QR"
                  className="w-44 h-44 mx-auto rounded-xl"
                />
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-700 mt-2.5">
                  Scan with camera or banking app
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={() => copyToClipboard(paymentLink, 'share-link')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1.5 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share link with counterparties</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Direct Bank Coordinates (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-bento rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Direct Wire Coordinates
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Institutional Fedwire, SEPA, BACS, and SWIFT clearing credentials
                </p>
              </div>

              {/* Currency Selector */}
              <div className="w-44">
                <CurrencySelector
                  value={selectedCurrency}
                  onChange={setSelectedCurrency}
                />
              </div>
            </div>

            {/* Coordinates Container */}
            <div className="space-y-3">
              {/* Account Holder */}
              <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all flex items-center justify-between shadow-2xs">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Beneficiary Legal Name
                  </div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                    {user.name}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(user.name, 'name')}
                  className="p-1.5 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/15 hover:border-gray-300 dark:hover:border-white/25 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  {copiedKey === 'name' ? (
                    <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 stroke-[2.5]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Account Number */}
              <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all flex items-center justify-between shadow-2xs">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Account Number
                  </div>
                  <div className="text-sm font-mono font-bold text-gray-900 dark:text-white mt-0.5">
                    {activeWallet.accountNumber}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(activeWallet.accountNumber, 'acc')}
                  className="p-1.5 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/15 hover:border-gray-300 dark:hover:border-white/25 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  {copiedKey === 'acc' ? (
                    <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 stroke-[2.5]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* IBAN (if applicable) */}
              {activeWallet.iban && (
                <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all flex items-center justify-between shadow-2xs">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                      International IBAN
                    </div>
                    <div className="text-sm font-mono font-bold text-gray-900 dark:text-white mt-0.5">
                      {activeWallet.iban}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(activeWallet.iban!, 'iban')}
                    className="p-1.5 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/15 hover:border-gray-300 dark:hover:border-white/25 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                  >
                    {copiedKey === 'iban' ? (
                      <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 stroke-[2.5]" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}

              {/* Routing / SWIFT BIC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeWallet.routingNumber && (
                  <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all flex items-center justify-between shadow-2xs">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                        Routing / Sort Code
                      </div>
                      <div className="text-sm font-mono font-bold text-gray-900 dark:text-white mt-0.5">
                        {activeWallet.routingNumber}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(activeWallet.routingNumber!, 'route')}
                      className="p-1.5 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/15 hover:border-gray-300 dark:hover:border-white/25 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                    >
                      {copiedKey === 'route' ? (
                        <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 stroke-[2.5]" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}

                {activeWallet.bic && (
                  <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all flex items-center justify-between shadow-2xs">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                        SWIFT / BIC Code
                      </div>
                      <div className="text-sm font-mono font-bold text-gray-900 dark:text-white mt-0.5">
                        {activeWallet.bic}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(activeWallet.bic!, 'bic')}
                      className="p-1.5 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/15 hover:border-gray-300 dark:hover:border-white/25 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                    >
                      {copiedKey === 'bic' ? (
                        <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 stroke-[2.5]" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Correspondent Depository */}
              <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 flex items-center justify-between shadow-2xs">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Correspondent Banking Institution
                  </div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-white mt-0.5">
                    AURELIS Swiss Custody & Settlement AG (Zurich / New York)
                  </div>
                </div>
              </div>
            </div>

            {/* One-click copy all details */}
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                const allDetails = `AURELIS Banking Coordinates\nBeneficiary: ${user.name}\nCurrency: ${selectedCurrency}\nAccount: ${activeWallet.accountNumber}\nIBAN: ${activeWallet.iban || 'N/A'}\nSWIFT/BIC: ${activeWallet.bic || 'N/A'}\nRouting: ${activeWallet.routingNumber || 'N/A'}`;
                copyToClipboard(allDetails, 'all');
              }}
              leftIcon={
                copiedKey === 'all' ? (
                  <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 stroke-[2.5]" />
                ) : (
                  <Copy className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                )
              }
            >
              {copiedKey === 'all' ? 'All Coordinates Copied to Clipboard' : 'Copy Complete Banking Details'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
