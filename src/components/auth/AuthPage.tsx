import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import {
  ShieldCheck,
  Lock,
  Fingerprint,
  ArrowRight,
  Globe,
  CreditCard,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
} from 'lucide-react';
import { clsx } from 'clsx';

export const AuthPage: React.FC = () => {
  const { login, loginWithPasskey, registerUser } = useApp();
  const { isDark, toggleTheme } = useTheme();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricScanning, setIsBiometricScanning] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Sign In Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form State (Clean production fields: Name, Email, Password, Confirm Password)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
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

  const handlePasskeyAuth = async () => {
    setError(null);
    setIsBiometricScanning(true);

    setTimeout(async () => {
      try {
        const res = await loginWithPasskey();
        if (!res.success) {
          setError(res.error || 'Biometric authentication failed.');
        }
      } catch (err: any) {
        setError(err.message || 'Passkey verification failed.');
      } finally {
        setIsBiometricScanning(false);
      }
    }, 900);
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

  const featureCardCls = clsx(
    'p-4 rounded-2xl border shadow-xs transition-all space-y-2 group',
    isDark
      ? 'bg-white/[0.03] border-white/10 hover:border-white/25 hover:bg-white/[0.06]'
      : 'bg-white/60 border-gray-200 hover:border-gray-300 hover:bg-white/90'
  );

  return (
    <div className={clsx(
      'min-h-screen w-full flex flex-col justify-between overflow-x-hidden selection:bg-blue-600 selection:text-white relative theme-transition',
      isDark ? 'bg-[#0B0D14] text-white' : 'bg-[#F4F5F9] text-gray-900'
    )}>
      {/* Background Radial Accent */}
      {isDark && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[550px] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(0,102,255,0.18),transparent)] pointer-events-none" />
      )}

      {/* Top Header */}
      <header className={clsx(
        'w-full max-w-7xl mx-auto px-6 py-5 sm:py-6 flex items-center justify-between z-10 border-b backdrop-blur-md sticky top-0 theme-transition',
        isDark ? 'border-white/10 bg-[#0A0A12]/80' : 'border-gray-200 bg-white/80'
      )}>
        <div className="flex items-center gap-3 group cursor-pointer">
          {/* Blue Minimalist Monogram Seal */}
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:bg-blue-500 transition-all">
            <svg
              className="w-5 h-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <polygon points="12 2 2 22 22 22" fill="currentColor" fillOpacity="0.25" />
              <path d="M12 2L2 22h20L12 2z" />
              <path d="M9 16h6" />
              <circle cx="12" cy="10" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <div>
            <span className={clsx('text-xl font-bold tracking-wider block leading-tight', isDark ? 'text-white' : 'text-gray-900')}>
              AURELIS
            </span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-blue-400 font-bold block">
              Private Wealth Vault
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

          <div className={clsx(
            'hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border font-mono text-[11px]',
            isDark
              ? 'bg-white/[0.04] border-white/10 text-blue-400'
              : 'bg-blue-50 border-blue-200 text-blue-600'
          )}>
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="font-medium">Zurich Gateway 2.6 • Active</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center z-10">
        
        {/* Left Side: Brand Showcase & Institutional Assurance (6 Columns) */}
        <div className="lg:col-span-6 space-y-7 animate-fade-in">
          <div className="space-y-4">
            <div className={clsx(
              'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wider shadow-xs',
              isDark ? 'bg-white/[0.04] border-white/10 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
            )}>
              <ShieldCheck className="w-4 h-4" />
              <span>Sovereign Wealth Architecture</span>
            </div>

            <h1 className={clsx('text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.15]', isDark ? 'text-white' : 'text-gray-900')}>
              The Modern Standard for <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-sky-300 bg-clip-text text-transparent">Global Multi-Currency Wealth.</span>
            </h1>

            <p className={clsx('text-sm sm:text-base max-w-xl leading-relaxed', isDark ? 'text-slate-400' : 'text-gray-500')}>
              Institutional-grade multi-currency settlement, zero spread markup interbank FX liquidity, and biometric hardware cryptographic isolation.
            </p>
          </div>

          {/* Three Feature Highlight Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className={featureCardCls}>
              <div className={clsx(
                'w-9 h-9 rounded-xl border flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors',
                isDark ? 'bg-white/10 border-white/15' : 'bg-blue-50 border-blue-200'
              )}>
                <Globe className="w-4 h-4" />
              </div>
              <div className={clsx('text-xs font-bold', isDark ? 'text-white' : 'text-gray-900')}>0.00% Spread FX</div>
              <div className={clsx('text-[11px] leading-snug', isDark ? 'text-slate-400' : 'text-gray-500')}>
                Direct mid-market rates across 10+ major global reserve currencies.
              </div>
            </div>

            <div className={featureCardCls}>
              <div className={clsx(
                'w-9 h-9 rounded-xl border flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors',
                isDark ? 'bg-white/10 border-white/15' : 'bg-blue-50 border-blue-200'
              )}>
                <Fingerprint className="w-4 h-4" />
              </div>
              <div className={clsx('text-xs font-bold', isDark ? 'text-white' : 'text-gray-900')}>FIDO2 Passkeys</div>
              <div className={clsx('text-[11px] leading-snug', isDark ? 'text-slate-400' : 'text-gray-500')}>
                Hardware biometric isolation with zero-knowledge credentials.
              </div>
            </div>

            <div className={featureCardCls}>
              <div className={clsx(
                'w-9 h-9 rounded-xl border flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors',
                isDark ? 'bg-white/10 border-white/15' : 'bg-blue-50 border-blue-200'
              )}>
                <CreditCard className="w-4 h-4" />
              </div>
              <div className={clsx('text-xs font-bold', isDark ? 'text-white' : 'text-gray-900')}>Titanium Cards</div>
              <div className={clsx('text-[11px] leading-snug', isDark ? 'text-slate-400' : 'text-gray-500')}>
                Instant multi-currency debit with real-time biometric limit controls.
              </div>
            </div>
          </div>

          {/* Institutional Metric Ribbon */}
          <div className={clsx(
            'p-5 rounded-2xl border shadow-sm flex items-center justify-between gap-4',
            isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/60 border-gray-200'
          )}>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-blue-400 font-mono-nums">$48.2B+</div>
              <div className={clsx('text-[10px] sm:text-xs font-semibold uppercase tracking-wider', isDark ? 'text-slate-500' : 'text-gray-400')}>Settled Volume</div>
            </div>
            <div className={clsx('h-8 w-px', isDark ? 'bg-white/10' : 'bg-gray-200')} />
            <div>
              <div className={clsx('text-xl sm:text-2xl font-bold font-mono-nums', isDark ? 'text-white' : 'text-gray-900')}>140+</div>
              <div className={clsx('text-[10px] sm:text-xs font-semibold uppercase tracking-wider', isDark ? 'text-slate-500' : 'text-gray-400')}>Jurisdictions</div>
            </div>
            <div className={clsx('h-8 w-px', isDark ? 'bg-white/10' : 'bg-gray-200')} />
            <div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono-nums">&lt; 1.2s</div>
              <div className={clsx('text-[10px] sm:text-xs font-semibold uppercase tracking-wider', isDark ? 'text-slate-500' : 'text-gray-400')}>Settlement Speed</div>
            </div>
          </div>

          {/* Swiss Quote */}
          <div className={clsx(
            'border-l-2 p-3.5 rounded-r-xl text-xs italic',
            isDark ? 'border-white/20 bg-white/[0.02] text-slate-300' : 'border-blue-300 bg-blue-50/50 text-gray-600'
          )}>
            "AURELIS delivers the discreet precision of private Swiss banking married with sub-second global digital liquidity."
            <span className="block not-italic font-semibold text-blue-400 mt-1">— Geneva Multi-Family Office Alliance</span>
          </div>
        </div>

        {/* Right Side: Authentication Card (6 Columns) */}
        <div className="lg:col-span-6 max-w-md w-full mx-auto">
          <div className="glass-bento rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
            
            {/* Header / Mode Switcher */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                    {mode === 'login' ? 'Vault Authentication' : 'Sovereign Onboarding'}
                  </h2>
                  <p className={clsx('text-xs mt-0.5', isDark ? 'text-slate-400' : 'text-gray-500')}>
                    {mode === 'login'
                      ? 'Unlock your private multi-currency vault.'
                      : 'Provision institutional access in under 2 minutes.'}
                  </p>
                </div>
                <div className={clsx(
                  'w-10 h-10 rounded-xl border flex items-center justify-center text-blue-400 shadow-inner',
                  isDark ? 'bg-white/10 border-white/15' : 'bg-blue-50 border-blue-200'
                )}>
                  <Lock className="w-5 h-5" />
                </div>
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
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
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
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
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
                    Accredited Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="client@aurelis.com"
                      required
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={clsx('text-xs font-bold', isDark ? 'text-slate-300' : 'text-gray-700')}>
                      Vault Security Key / Password
                    </label>
                    <button
                      type="button"
                      onClick={() => alert('Please contact the private wealth concierge at concierge@aurelis.com for vault key recovery.')}
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold hover:underline"
                    >
                      Forgot key?
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

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className={clsx('flex items-center gap-2 cursor-pointer font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>
                    <input
                      type="checkbox"
                      defaultChecked
                      className={clsx('rounded text-blue-600', isDark ? 'bg-white/[0.04] border-white/15 focus:ring-white/20' : 'bg-gray-100 border-gray-300 focus:ring-blue-200')}
                    />
                    <span>Remember terminal</span>
                  </label>
                  <span className="text-[11px] text-blue-400/80 font-mono">TLS 256-Bit</span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isBiometricScanning}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-[0_8px_20px_-4px_rgba(0,102,255,0.4)] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 active:scale-[0.99] cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Authenticate & Unlock Vault</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <div className="relative flex py-2 items-center">
                  <div className={clsx('flex-grow border-t', isDark ? 'border-white/10' : 'border-gray-200')} />
                  <span className={clsx('flex-shrink mx-3 text-[10px] uppercase tracking-wider font-semibold', isDark ? 'text-slate-500' : 'text-gray-400')}>
                    Or Biometric Assertion
                  </span>
                  <div className={clsx('flex-grow border-t', isDark ? 'border-white/10' : 'border-gray-200')} />
                </div>

                <button
                  type="button"
                  onClick={handlePasskeyAuth}
                  disabled={isLoading || isBiometricScanning}
                  className={clsx(
                    'w-full py-2.5 px-4 rounded-xl border font-semibold text-xs transition-all flex items-center justify-center gap-2.5 group disabled:opacity-50 shadow-xs cursor-pointer',
                    isDark
                      ? 'bg-white/[0.04] hover:bg-white/[0.08] border-white/15 hover:border-white/30 text-slate-300 hover:text-white'
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-900'
                  )}
                >
                  {isBiometricScanning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-blue-400 font-bold">Scanning Face ID / FIDO2 Passkey...</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                      <span>FIDO2 Passkey / Face ID Instant Unlock</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Register / Sovereign Onboarding Form */
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className={clsx('block text-xs font-bold mb-1', isDark ? 'text-slate-300' : 'text-gray-700')}>
                    Legal Full Name
                  </label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Lord Alexander Sterling"
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
                    placeholder="name@domain.com"
                    required
                    className={inputCls}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={clsx('text-xs font-bold', isDark ? 'text-slate-300' : 'text-gray-700')}>
                      Vault Master Security Password
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
                    Confirm Master Password
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

                <div className={clsx(
                  'p-3 rounded-xl border flex items-center gap-2 text-[11px] font-medium',
                  isDark ? 'bg-white/[0.04] border-white/10 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-600'
                )}>
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-400" />
                  <span>Instant vault activation with primary USD base account.</span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-[0_8px_20px_-4px_rgba(0,102,255,0.4)] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 mt-1 active:scale-[0.99] cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Establish Sovereign Account</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Footer Assurance */}
            <div className={clsx('pt-2 text-center text-[10px] font-medium', isDark ? 'text-slate-500' : 'text-gray-400')}>
              FINMA & Swiss Banking Security Standard • 256-Bit Hardware HSM Encrypted
            </div>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className={clsx(
        'w-full max-w-7xl mx-auto px-6 py-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs z-10 theme-transition',
        isDark ? 'border-white/10 text-slate-500 bg-[#0A0A12]/60' : 'border-gray-200 text-gray-400 bg-white/60'
      )}>
        <div className="flex items-center gap-4">
          <span>© 2026 AURELIS Global Wealth AG.</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">Zurich • Geneva • Singapore • London • New York</span>
        </div>
        <div className="flex items-center gap-6 font-medium">
          <button onClick={() => alert('AURELIS maintains Tier-1 regulatory compliance across all operating jurisdictions.')} className="hover:text-blue-400 transition-colors">
            Regulatory Disclosures
          </button>
          <button onClick={() => alert('All vault communications are encrypted end-to-end with HSM hardware keys.')} className="hover:text-blue-400 transition-colors">
            Security Architecture
          </button>
          <button onClick={() => alert('Direct accredited concierge hotline: +41 22 819 0000')} className="text-blue-400 hover:underline font-semibold">
            Accredited Concierge
          </button>
        </div>
      </footer>
    </div>
  );
};
