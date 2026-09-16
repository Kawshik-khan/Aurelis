import React, { useState } from 'react';
import {
  Shield,
  Key,
  Smartphone,
  Fingerprint,
  Laptop,
  Check,
  Save,
  Globe,
  Bell,
  Lock,
  LogOut,
  Sparkles,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { clsx } from 'clsx';

export const ProfileView: React.FC = () => {
  const { user, updateUserProfile, updateTransactionPin, logout } = useApp();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [street, setStreet] = useState(user.address.street);
  const [city, setCity] = useState(user.address.city);
  const [country, setCountry] = useState(user.address.country);

  const [twoFactor, setTwoFactor] = useState(user.twoFactorEnabled);
  const [biometrics, setBiometrics] = useState(user.biometricEnabled);
  const [passkeys, setPasskeys] = useState(user.passkeyEnabled);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Transaction PIN Change State
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinStatusMessage, setPinStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPinLoading, setIsPinLoading] = useState(false);

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinStatusMessage(null);

    if (newPinInput.length !== 4 || !/^\d{4}$/.test(newPinInput)) {
      setPinStatusMessage({ type: 'error', text: 'New PIN must be exactly 4 numeric digits.' });
      return;
    }

    if (newPinInput !== confirmPinInput) {
      setPinStatusMessage({ type: 'error', text: 'New PIN and Confirmation PIN do not match.' });
      return;
    }

    const activePin = user.transactionPin || '1234';
    if (currentPinInput && currentPinInput !== activePin) {
      setPinStatusMessage({ type: 'error', text: 'Current Security PIN is incorrect.' });
      return;
    }

    setIsPinLoading(true);
    try {
      const res = await updateTransactionPin(newPinInput, currentPinInput);
      if (res.success) {
        setPinStatusMessage({ type: 'success', text: 'Security PIN updated successfully!' });
        setCurrentPinInput('');
        setNewPinInput('');
        setConfirmPinInput('');
        setTimeout(() => {
          setIsChangingPin(false);
          setPinStatusMessage(null);
        }, 1800);
      } else {
        setPinStatusMessage({ type: 'error', text: res.error || 'Failed to update PIN.' });
      }
    } catch (err: any) {
      setPinStatusMessage({ type: 'error', text: err.message || 'Failed to update PIN.' });
    } finally {
      setIsPinLoading(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      name,
      email,
      phone,
      address: {
        ...user.address,
        street,
        city,
        country,
      },
      twoFactorEnabled: twoFactor,
      biometricEnabled: biometrics,
      passkeyEnabled: passkeys,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-fade-in pb-16 lg:pb-0">
      {/* Header Bento */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-white/[0.04] border border-blue-200/60 dark:border-white/10 text-blue-700 dark:text-blue-400 text-xs font-semibold mb-2 shadow-xs">
          <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>ACCOUNT GOVERNANCE</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Profile & Security Center
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your verified sovereign identity, FIDO2 passkeys, multi-factor protocols, and active sessions.
        </p>
      </div>

      {/* User Hero Identity Bento Card */}
      <div className="glass-bento rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden text-gray-900 dark:text-white">
        <div className="flex items-center gap-4 relative z-10">
          <Avatar src={user.avatar} name={user.name} size="xl" />
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {user.name}
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-white/[0.06] border border-blue-200 dark:border-white/10 px-2.5 py-0.5 rounded-full">
                {user.tier}
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
              {user.email} • {user.aurelisTag}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
              Member since {user.memberSince} • Sovereign Swiss Custody ID: #AURL-98402
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          {savedSuccess && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 shadow-xs">
              <Check className="w-4 h-4 stroke-[2.5]" />
              Changes saved
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal Information Bento */}
        <div className="glass-bento rounded-3xl p-6 sm:p-8 space-y-5 text-gray-900 dark:text-white">
          <div className="border-b border-black/10 dark:border-white/10 pb-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Personal Information
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verified private client identity credentials
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Legal Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Primary Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Residential Street Address"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="City / State"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <Input
              label="Jurisdiction / Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>
        </div>

        {/* Security & Authentication Protocols Bento */}
        <div className="glass-bento rounded-3xl p-6 sm:p-8 space-y-5 text-gray-900 dark:text-white">
          <div className="border-b border-black/10 dark:border-white/10 pb-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Cryptographic Security & Authentication
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Hardware security tokens, biometric gates, and transaction authorization PIN
            </p>
          </div>

          <div className="space-y-3">
            {/* Passkeys */}
            <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 transition-all flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-white/10 border border-blue-200/60 dark:border-white/15 text-blue-600 dark:text-blue-400">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900 dark:text-white">
                    Hardware Passkeys / WebAuthn
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Sign in seamlessly using Apple Touch ID, Face ID, or YubiKey hardware
                  </div>
                </div>
              </div>

              <input
                type="checkbox"
                checked={passkeys}
                onChange={(e) => setPasskeys(e.target.checked)}
                className="w-5 h-5 accent-blue-600 rounded-md cursor-pointer"
              />
            </div>

            {/* 2FA */}
            <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 transition-all flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-white/10 border border-blue-200/60 dark:border-white/15 text-blue-600 dark:text-blue-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900 dark:text-white">
                    Two-Factor Authentication (2FA)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Require TOTP authentication code for all high-value outbound transfers
                  </div>
                </div>
              </div>

              <input
                type="checkbox"
                checked={twoFactor}
                onChange={(e) => setTwoFactor(e.target.checked)}
                className="w-5 h-5 accent-blue-600 rounded-md cursor-pointer"
              />
            </div>

            {/* Biometrics */}
            <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 transition-all flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-white/10 border border-blue-200/60 dark:border-white/15 text-blue-600 dark:text-blue-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900 dark:text-white">
                    Biometric Settlement Authorization
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Prompt fingerprint / facial recognition before finalizing wire settlements
                  </div>
                </div>
              </div>

              <input
                type="checkbox"
                checked={biometrics}
                onChange={(e) => setBiometrics(e.target.checked)}
                className="w-5 h-5 accent-blue-600 rounded-md cursor-pointer"
              />
            </div>

            {/* Sovereign Transaction PIN */}
            <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-white/10 border border-blue-200/60 dark:border-white/15 text-blue-600 dark:text-blue-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white">
                      Sovereign Transaction PIN (4-Digit)
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Cryptographic security code required to authorize all outbound money transfers
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isChangingPin && (
                    <span className="text-[11px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/80">
                      •••• (Active)
                    </span>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant={isChangingPin ? 'ghost' : 'outline'}
                    onClick={() => {
                      setIsChangingPin(!isChangingPin);
                      setPinStatusMessage(null);
                    }}
                  >
                    {isChangingPin ? 'Cancel' : 'Change PIN'}
                  </Button>
                </div>
              </div>

              {/* Expandable Change PIN Panel */}
              {isChangingPin && (
                <div className="pt-4 border-t border-black/10 dark:border-white/10 space-y-3 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                        Current PIN
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="Current 4-digit"
                        value={currentPinInput}
                        onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 font-mono tracking-widest text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                        New PIN (4 digits)
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="New 4-digit"
                        value={newPinInput}
                        onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 font-mono tracking-widest text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                        Confirm New PIN
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="Confirm 4-digit"
                        value={confirmPinInput}
                        onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 font-mono tracking-widest text-center"
                      />
                    </div>
                  </div>

                  {pinStatusMessage && (
                    <div
                      className={clsx(
                        'p-3 rounded-xl text-xs font-medium flex items-center gap-2',
                        pinStatusMessage.type === 'success'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80'
                      )}
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>{pinStatusMessage.text}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsChangingPin(false);
                        setPinStatusMessage(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      disabled={isPinLoading || newPinInput.length !== 4 || confirmPinInput.length !== 4}
                      onClick={handleChangePinSubmit}
                    >
                      {isPinLoading ? 'Saving...' : 'Update Security PIN'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Connected Sessions Bento */}
        <div className="glass-bento rounded-3xl p-6 sm:p-8 space-y-5 text-gray-900 dark:text-white">
          <div className="border-b border-black/10 dark:border-white/10 pb-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Active Verified Sessions
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Authorized client workstations and cryptographic session credentials
            </p>
          </div>

          <div className="space-y-3">
            {user.activeSessions.map((session) => (
              <div
                key={session.id}
                className="p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] hover:border-black/20 dark:hover:border-white/20 transition-all flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-white/10 border border-blue-200/60 dark:border-white/15 text-blue-600 dark:text-blue-400">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span>{session.device}</span>
                      {session.isCurrent && (
                        <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-2 py-0.5 rounded-full">
                          Current Device
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {session.browser} • {session.location} ({session.ip})
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                    {session.lastActive}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={logout}
            leftIcon={<LogOut className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
            className="w-full sm:w-auto text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/80 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-300 dark:hover:border-rose-700"
          >
            Lock Vault & Sign Out
          </Button>

          <Button
            type="submit"
            variant="primary"
            leftIcon={<Save className="w-4 h-4 text-white" />}
            className="w-full sm:w-auto shadow-[0_8px_20px_-4px_rgba(0,102,255,0.4)]"
          >
            Save Security Profile
          </Button>
        </div>
      </form>
    </div>
  );
};
