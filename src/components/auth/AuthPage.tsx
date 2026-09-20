import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import {
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Sun,
  Moon,
} from 'lucide-react';
import { clsx } from 'clsx';

export const AuthPage: React.FC = () => {
  const { login, registerUser } = useApp();
  const { isDark, toggleTheme } = useTheme();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Sign In Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form State (Clean production fields: Name, Email, Phone, Password, Confirm Password)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      setError('Please enter both email address and password.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const res = await login(loginEmail.trim(), loginPassword);
      if (!res.success) {
        setError(res.error || 'Invalid credentials. Please verify your email and password.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
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
      setError('Passwords do not match. Please ensure both passwords match.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await registerUser({
        name: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        password: regPassword,
      });

      if (!res.success) {
        setError(res.error || 'Account provisioning failed. Please retry.');
      }
    } catch (err: any) {
      setError(err.message || 'Registration error. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reusable input class
  const inputCls = clsx(
    'w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all shadow-xs',
    isDark
      ? 'bg-white/[0.04] border-white/10 text-white placeholder-slate-500 focus:border-white/30 focus:ring-white/10'
      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:ring-blue-100'
  );

  return (
    <div className={clsx(
      'min-h-screen w-full flex flex-col justify-between overflow-x-hidden selection:bg-blue-600 selection:text-white relative theme-transition',
      isDark ? 'bg-[#0B0D14] text-white' : 'bg-[#F4F5F9] text-gray-900'
    )}>
      {/* Ambient Lighting Gradients & Subtle Grid Texture */}
      {isDark ? (
        <>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[750px] rounded-full bg-[radial-gradient(circle,rgba(230,0,0,0.08)_0%,transparent_70%)] pointer-events-none blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
        </>
      ) : (
        <>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[750px] rounded-full bg-[radial-gradient(circle,rgba(230,0,0,0.04)_0%,transparent_70%)] pointer-events-none blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
        </>
      )}

      {/* Top Header - Full Width Edge-to-Edge */}
      <header className={clsx(
        'w-full z-10 border-b backdrop-blur-md sticky top-0 theme-transition',
        isDark ? 'border-white/10 bg-[#0A0A12]/80' : 'border-gray-200 bg-white/80'
      )}>
        <div className="w-full px-6 sm:px-10 lg:px-12 py-4 sm:py-5 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            {/* DBS Iconic Red Emblem */}
            <div className="w-10 h-10 rounded-xl bg-[#E60000] flex items-center justify-center shadow-lg shadow-red-500/30 group-hover:bg-[#cc0000] transition-all">
              <span className="text-white font-black text-base tracking-tight">DBS</span>
            </div>
            <div>
              <span className={clsx('text-xl font-extrabold tracking-tight block leading-tight', isDark ? 'text-white' : 'text-gray-900')}>
                DBS BANK
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] text-red-500 dark:text-red-400 font-bold block">
                Digital Banking Bangladesh
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3.5 text-xs">
            {/* Theme Toggle on Auth Page */}
            <button
              type="button"
              onClick={toggleTheme}
              className={clsx(
                'p-2.5 rounded-xl border shadow-xs transition-all overflow-hidden',
                isDark
                  ? 'bg-white/[0.04] border-white/10 hover:border-white/20 hover:bg-white/5 text-slate-300 hover:text-amber-300'
                  : 'bg-gray-100/80 border-gray-200 hover:border-gray-300 hover:bg-gray-200/80 text-gray-500 hover:text-indigo-600'
              )}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <div className="relative w-4 h-4">
                <Sun className={clsx('absolute inset-0 w-4 h-4 transition-all duration-300', isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100 text-amber-500')} />
                <Moon className={clsx('absolute inset-0 w-4 h-4 transition-all duration-300', isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50')} />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Centered Container */}
      <main className="flex-1 w-full flex items-center justify-center p-6 sm:p-10 z-10">
        <div className="w-full max-w-md sm:max-w-[460px]">
          <div className="w-full glass-bento rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden border border-white/10">
            
            {/* Header / Mode Switcher */}
            <div className="space-y-4">
              <div>
                <h2 className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                  {mode === 'login' ? 'DBS Internet Banking' : 'Open DBS Account'}
                </h2>
                <p className={clsx('text-xs mt-0.5', isDark ? 'text-slate-400' : 'text-gray-500')}>
                  {mode === 'login'
                    ? 'Sign in to access your BDT & multi-currency accounts.'
                    : 'Instant digital onboarding for Bangladeshi residents & NRBs.'}
                </p>
              </div>

              {/* Mode Toggle Tabs */}
              <div className={clsx(
                'grid grid-cols-2 p-1 rounded-xl border',
                isDark ? 'bg-white/[0.04] border-white/10' : 'bg-gray-100 border-gray-200'
              )}>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    mode === 'login'
                      ? 'bg-[#E60000] text-white shadow-md shadow-red-500/30'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
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
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    mode === 'register'
                      ? 'bg-[#E60000] text-white shadow-md shadow-red-500/30'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Create Account
                </button>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 flex items-start gap-2.5 text-xs text-rose-400 animate-slide-up">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="flex-1 font-medium">{error}</span>
              </div>
            )}

            {/* Login Form */}
            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className={clsx('block text-xs font-bold mb-1.5', isDark ? 'text-slate-300' : 'text-gray-700')}>
                    Email Address or User ID
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="user@dbsbank.com"
                      required
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={clsx('text-xs font-bold', isDark ? 'text-slate-300' : 'text-gray-700')}>
                      Password / Security PIN
                    </label>
                    <button
                      type="button"
                      onClick={() => alert('Please contact DBS 24/7 Helpline at 16234 or support@dbsbank.com for password recovery.')}
                      className="text-[11px] text-red-500 hover:text-red-400 font-semibold hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your security password"
                      required
                      className={clsx(inputCls, 'pr-10')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={clsx('absolute right-3 top-1/2 -translate-y-1/2', isDark ? 'text-slate-500 hover:text-white' : 'text-gray-400 hover:text-gray-700')}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="text-xs pt-1">
                  <label className={clsx('flex items-center gap-2 cursor-pointer font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>
                    <input
                      type="checkbox"
                      defaultChecked
                      className={clsx('rounded text-red-600', isDark ? 'bg-white/[0.04] border-white/15 focus:ring-white/20' : 'bg-gray-100 border-gray-300 focus:ring-red-200')}
                    />
                    <span>Remember this device</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-[#E60000] hover:bg-[#cc0000] text-white font-bold text-sm shadow-[0_8px_20px_-4px_rgba(230,0,0,0.4)] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 active:scale-[0.99] cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In to DBS Bank</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

              </form>
            ) : (
              /* Register / DBS Account Opening Form */
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className={clsx('block text-xs font-bold mb-1', isDark ? 'text-slate-300' : 'text-gray-700')}>
                    Full Name (As per NID / Passport)
                  </label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Rahim Ahmed"
                    required
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={clsx('block text-xs font-bold mb-1', isDark ? 'text-slate-300' : 'text-gray-700')}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="rahim@dbsbank.com"
                    required
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={clsx('block text-xs font-bold mb-1', isDark ? 'text-slate-300' : 'text-gray-700')}>
                    Mobile Phone Number
                  </label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className={inputCls}
                  />
                  <span className={clsx('text-[10px] mt-1 block', isDark ? 'text-slate-500' : 'text-gray-500')}>
                    Instant transaction alerts & welcome SMS will be delivered to this number.
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={clsx('text-xs font-bold', isDark ? 'text-slate-300' : 'text-gray-700')}>
                      Account Security Password
                    </label>
                    <span className={clsx('text-[10px]', isDark ? 'text-slate-500' : 'text-gray-400')}>Min. 6 characters</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Create master security password"
                      required
                      className={clsx(inputCls, 'pr-10')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className={clsx('absolute right-3 top-1/2 -translate-y-1/2', isDark ? 'text-slate-500 hover:text-white' : 'text-gray-400 hover:text-gray-700')}
                      tabIndex={-1}
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={clsx('block text-xs font-bold mb-1', isDark ? 'text-slate-300' : 'text-gray-700')}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Confirm master security password"
                      required
                      className={clsx(inputCls, 'pr-10')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      className={clsx('absolute right-3 top-1/2 -translate-y-1/2', isDark ? 'text-slate-500 hover:text-white' : 'text-gray-400 hover:text-gray-700')}
                      tabIndex={-1}
                    >
                      {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>


                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-[#E60000] hover:bg-[#cc0000] text-white font-bold text-sm shadow-[0_8px_20px_-4px_rgba(230,0,0,0.4)] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 mt-1 active:scale-[0.99] cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Open DBS Account</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            )}


          </div>
        </div>
      </main>

      {/* Page Footer - Full Width Edge-to-Edge */}
      <footer className={clsx(
        'w-full border-t z-10 theme-transition',
        isDark ? 'border-white/10 text-slate-500 bg-[#0A0A12]/80' : 'border-gray-200 text-gray-400 bg-white/80'
      )}>
        <div className="w-full px-6 sm:px-10 lg:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4">
            <span>© 2026 DBS Bank Ltd.</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">Dhaka • Singapore • Hong Kong • London</span>
          </div>
          <div className="flex items-center gap-6 font-medium">
            <button onClick={() => alert('DBS Bank Bangladesh operates under Bangladesh Bank regulatory guidelines and foreign bank representative compliance.')} className="hover:text-red-500 transition-colors">
              Regulatory Disclosures
            </button>
            <button onClick={() => alert('All digital banking sessions are encrypted end-to-end with 256-bit HSM cryptography.')} className="hover:text-red-500 transition-colors">
              Security & Protection
            </button>
            <button onClick={() => alert('DBS Bank 24/7 Bangladesh Concierge Helpline: 16234 / +880 2 988 1234')} className="text-red-500 hover:underline font-semibold">
              Helpline: 16234
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
