import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { CurrencySelector } from '../common/CurrencySelector';
import { CurrencyCode, Recipient } from '../../types';
import { useApp } from '../../context/AppContext';
import { Check } from 'lucide-react';

interface EditRecipientModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: Recipient | null;
}

export const EditRecipientModal: React.FC<EditRecipientModalProps> = ({
  isOpen,
  onClose,
  recipient,
}) => {
  const { updateRecipient } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingOrIban, setRoutingOrIban] = useState('');
  const [aurelisTag, setAurelisTag] = useState('');

  useEffect(() => {
    if (recipient) {
      setName(recipient.name);
      setEmail(recipient.email);
      setPhone(recipient.phone || '');
      setCurrency(recipient.currency);
      setBankName(recipient.bankName);
      setAccountNumber(recipient.accountNumber);
      setRoutingOrIban(recipient.routingOrIban);
      setAurelisTag(recipient.aurelisTag || '');
    }
  }, [recipient]);

  if (!recipient) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateRecipient(recipient.id, {
      name,
      email,
      phone: phone || undefined,
      currency,
      bankName,
      accountNumber,
      routingOrIban,
      aurelisTag,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Beneficiary"
      subtitle={`Update credentials for ${recipient.name}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Legal Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Phone"
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
            label="DBS Tag"
            value={aurelisTag}
            onChange={(e) => setAurelisTag(e.target.value)}
          />
        </div>

        <Input
          label="Financial Institution"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Account Number"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
          />
          <Input
            label="IBAN / Routing Code"
            value={routingOrIban}
            onChange={(e) => setRoutingOrIban(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1 shadow-[0_8px_20px_-4px_rgba(0,102,255,0.4)]"
            leftIcon={<Check className="w-4 h-4 text-white stroke-[2.5]" />}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
