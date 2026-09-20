import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { CurrencySelector } from '../common/CurrencySelector';
import { CurrencyCode } from '../../types';
import { useApp } from '../../context/AppContext';
import { UserPlus, ShieldCheck } from 'lucide-react';

interface AddRecipientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddRecipientModal: React.FC<AddRecipientModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { addRecipient } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingOrIban, setRoutingOrIban] = useState('');
  const [aurelisTag, setAurelisTag] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    addRecipient({
      name,
      email,
      phone: phone || undefined,
      currency,
      bankName: bankName || 'Global Settlement Bank',
      accountNumber: accountNumber || `•••• ${Math.floor(1000 + Math.random() * 9000)}`,
      routingOrIban: routingOrIban || '021000021',
      aurelisTag: aurelisTag || `@${name.toLowerCase().replace(/\s+/g, '')}`,
      isFavorite: false,
    });

    onClose();
    setName('');
    setEmail('');
    setPhone('');
    setBankName('');
    setAccountNumber('');
    setRoutingOrIban('');
    setAurelisTag('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Beneficiary"
      subtitle="Register an accredited counterparty for instantaneous settlements"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Legal Name"
          placeholder="e.g. Julian Hastings"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Email Address"
            type="email"
            placeholder="julian@hastings.ch"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Phone Number (Optional)"
            placeholder="+880 1700-000000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CurrencySelector
            label="Receiving Currency"
            value={currency}
            onChange={setCurrency}
          />
          <Input
            label="DBS Tag (Optional)"
            placeholder="@dbs_user"
            value={aurelisTag}
            onChange={(e) => setAurelisTag(e.target.value)}
          />
        </div>

        <Input
          label="Financial Institution / MFS"
          placeholder="e.g. BRAC Bank / bKash / City Bank"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Account Number / Mask"
            placeholder="•••• 4810"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
          />
          <Input
            label="IBAN / Routing Code"
            placeholder="CH93 0081 2011..."
            value={routingOrIban}
            onChange={(e) => setRoutingOrIban(e.target.value)}
          />
        </div>

        <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-white/[0.04] border border-blue-200 dark:border-white/10 flex items-center gap-2.5 text-xs text-blue-700 dark:text-blue-300">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>Counterparties are validated against sanctions screening automatically.</span>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1 shadow-[0_8px_20px_-4px_rgba(0,102,255,0.4)]"
            leftIcon={<UserPlus className="w-4 h-4 text-white" />}
          >
            Save Beneficiary
          </Button>
        </div>
      </form>
    </Modal>
  );
};
