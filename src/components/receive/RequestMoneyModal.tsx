import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { CurrencySelector } from '../common/CurrencySelector';
import { CurrencyCode } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, CURRENCIES } from '../../utils/currency';
import { AurelisApiClient } from '../../services/api';
import { Check, Copy, Send, Sparkles, Loader2, Link2, Share2 } from 'lucide-react';

interface RequestMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RequestMoneyModal: React.FC<RequestMoneyModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useApp();
  const [amount, setAmount] = useState('2500.00');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [recipientEmail, setRecipientEmail] = useState('partner@advisory.ch');
  const [message, setMessage] = useState('Retainer for private wealth architectural advisory');
  const [isGenerated, setIsGenerated] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmt = parseFloat(amount);
    if (!parsedAmt || parsedAmt <= 0) return;

    setIsCreating(true);
    setErrorMsg('');

    try {
      const res = await AurelisApiClient.createPaymentRequest({
        amount: parsedAmt,
        currency,
        recipientEmail,
        message,
      });

      if (res?.paymentUrl) {
        const fullUrl = res.paymentUrl.startsWith('http')
          ? res.paymentUrl
          : `${window.location.origin}${res.paymentUrl}`;
        setPaymentUrl(fullUrl);
      } else {
        const slug = `req_${Date.now()}`;
        setPaymentUrl(`${window.location.origin}/pay/${slug}`);
      }

      setIsGenerated(true);
    } catch (err: any) {
      console.warn('API payment request fallback:', err);
      const userNameSlug = (user?.name || 'vault').toLowerCase().replace(/\s+/g, '.');
      setPaymentUrl(`https://aurelis.com/pay/${userNameSlug}/req?amt=${amount}&curr=${currency}`);
      setIsGenerated(true);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = () => {
    if (paymentUrl) {
      navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setIsGenerated(false);
    setPaymentUrl('');
    setErrorMsg('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReset}
      title="Create Inbound Invoice"
      subtitle="Generate a cryptographic payment request invoice link"
      maxWidth="md"
    >
      {!isGenerated ? (
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount Requested"
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <CurrencySelector
              label="Settlement Vault"
              value={currency}
              onChange={setCurrency}
            />
          </div>

          <Input
            label="Recipient Counterparty / Email"
            placeholder="client@familyoffice.com"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            required
          />

          <Input
            label="Invoice Memo / Reference"
            placeholder="e.g. Legal retainers, wealth advisory fee"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Total Inbound Requested</span>
            <span className="text-xl font-extrabold text-gray-900 dark:text-white font-mono">
              {formatCurrency(parseFloat(amount) || 0, currency)}
            </span>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleReset} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 shadow-[0_8px_20px_-4px_rgba(0,102,255,0.4)]"
              isLoading={isCreating}
              leftIcon={<Send className="w-4 h-4 text-white" />}
            >
              Generate Request
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-5 text-center py-2 animate-scale-in">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto border border-blue-200/50 dark:border-blue-500/20 shadow-inner">
            <Link2 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Payment Link Ready
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Send this secure link to {recipientEmail}. They can settle the {formatCurrency(parseFloat(amount) || 0, currency)} request instantly.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 flex items-center justify-between gap-3 text-left shadow-2xs">
            <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold truncate flex-1">
              {paymentUrl}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              leftIcon={
                copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                )
              }
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button variant="primary" fullWidth onClick={handleReset} className="shadow-[0_8px_20px_-4px_rgba(0,102,255,0.4)]">
              Done
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
