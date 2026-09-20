import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useApp } from '../../context/AppContext';
import { ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, registerUser } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      setError('Please enter both email address and password.');
      return;
    }
    setError(null);
    setIsAuthenticating(true);
    try {
      const res = await login(loginEmail.trim(), loginPassword);
      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'Invalid credentials. Please verify your email and password.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setError('Please fill in all required identity fields.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Vault master password must be at least 6 characters.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setError(null);
    setIsAuthenticating(true);
    try {
      const res = await registerUser({
        name: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        country: 'Bangladesh',
        currency: 'BDT',
        password: regPassword,
      });
      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'Registration failed. Please check your details.');
      }
    } catch (err: any) {
      setError(err.message || 'Registration error. Please check your details.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm"
      showCloseButton
    >
      <div className="py-2 space-y-6 animate-fade-in">
        {/* Brand Emblem */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#E60000] flex items-center justify-center mx-auto shadow-lg shadow-red-500/30">
            <span className="text-white font-black text-lg tracking-tight">DBS</span>
          </div>

          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            {mode === 'login' ? 'DBS Internet Banking' : 'Open DBS Account'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {mode === 'login'
              ? 'Enter your credentials to access your DBS Bank accounts.'
              : 'Instant digital onboarding for Bangladeshi residents & NRBs.'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-black/[0.04] dark:bg-white/[0.04] p-1 rounded-xl border border-black/10 dark:border-white/10">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-[#E60000] text-white shadow-md shadow-red-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-[#E60000] text-white shadow-md shadow-red-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email Address or User ID"
              type="email"
              placeholder="user@dbsbank.com"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter your security password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded bg-black/[0.04] dark:bg-white/[0.04] border-black/15 dark:border-white/15 text-red-600 focus:ring-red-500/20"
                />
                <span>Remember device</span>
              </label>
              <button
                type="button"
                onClick={() => alert('Please contact DBS 24/7 Helpline at 16234 or support@dbsbank.com for password recovery.')}
                className="text-red-600 dark:text-red-400 hover:text-red-500 font-semibold hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isAuthenticating}
              className="mt-2 bg-[#E60000] hover:bg-[#cc0000] text-white shadow-[0_8px_20px_-4px_rgba(230,0,0,0.4)]"
            >
              Sign In to DBS Bank
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <Input
              label="Legal Full Name (NID / Passport)"
              placeholder="e.g. Rahim Ahmed"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              required
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="rahim@dbsbank.com"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              required
            />
            <Input
              label="Mobile Phone Number"
              type="tel"
              value={regPhone}
              onChange={(e) => setRegPhone(e.target.value)}
              helperText="Instant transaction alerts & welcome SMS via sms.net.bd"
            />
            <Input
              label="Account Security Password"
              type="password"
              placeholder="Create master security password (min. 6 chars)"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm master security password"
              value={regConfirmPassword}
              onChange={(e) => setRegConfirmPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isAuthenticating}
              className="mt-2 bg-[#E60000] hover:bg-[#cc0000] text-white shadow-[0_8px_20px_-4px_rgba(230,0,0,0.4)]"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Open DBS Account
            </Button>
          </form>
        )}
      </div>
    </Modal>
  );
};
