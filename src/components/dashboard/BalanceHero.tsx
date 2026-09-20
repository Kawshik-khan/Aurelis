import React from 'react';
import {
  Send,
  ArrowDownLeft,
  ArrowLeftRight,
  Plus,
  TrendingUp,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CURRENCIES, formatCurrency } from '../../utils/currency';
import { Button } from '../common/Button';
import { clsx } from 'clsx';

export const BalanceHero: React.FC = () => {
  const {
    user,
    totalBalanceUSD,
    preferredDisplayCurrency,
    setPreferredDisplayCurrency,
    totalConsolidatedBalance,
    openModal,
    setCurrentTab,
  } = useApp();

  // Dynamic greeting based on hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user.name.split(' ')[0] || 'Client';
  const displayAmount = preferredDisplayCurrency === 'USD' ? totalBalanceUSD : totalConsolidatedBalance;
  const bdtRate = CURRENCIES.BDT.rateToUSD || 1 / 120;
  const secondaryAmount = preferredDisplayCurrency === 'USD' ? totalBalanceUSD / bdtRate : totalBalanceUSD;

  return (
    <section className="rounded-3xl p-6 sm:p-8 sm:py-9 relative overflow-hidden bg-gradient-to-br from-[#0066FF] via-[#0052CC] to-[#0A1D47] text-white shadow-[0_20px_50px_-12px_rgba(0,102,255,0.35)] border border-blue-400/30">
      {/* Specular Top Edge Light Refraction */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

      {/* Ambient Fluid Cyan & Royal Blue Mesh Orbs */}
      <div className="absolute -right-12 -top-12 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none select-none" />
      <div className="absolute right-1/4 -bottom-16 w-72 h-72 bg-blue-400/25 rounded-full blur-3xl pointer-events-none select-none" />
      <div className="absolute left-1/3 top-0 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none select-none" />

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative z-10">
        <div className="space-y-4">
          {/* Greeting & Sovereign Account Pill */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-100/90">
              {getGreeting()}, {firstName}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-white bg-white/15 px-2.5 py-0.5 rounded-full border border-white/20 backdrop-blur-md">
              <ShieldCheck className="w-3 h-3 text-cyan-300" />
              Sovereign Account • Bangladesh
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold text-white tracking-tight leading-tight">
            Your global capital, beautifully organized.
          </h1>

          {/* Consolidated Total Balance & Currency Switcher */}
          <div className="pt-2 flex flex-wrap items-baseline gap-3 sm:gap-4">
            <div className="flex items-center justify-between gap-3 w-full">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200/80">
                TOTAL CONSOLIDATED PORTFOLIO
              </span>
              {/* Quick Currency Valuation Switcher */}
              <div className="inline-flex items-center bg-black/25 backdrop-blur-md rounded-xl p-1 border border-white/20 shadow-xs">
                <button
                  type="button"
                  onClick={() => setPreferredDisplayCurrency('BDT')}
                  className={clsx(
                    'px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1',
                    preferredDisplayCurrency === 'BDT'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-blue-100/80 hover:text-white'
                  )}
                  title="View balance in Bangladeshi Taka (BDT)"
                >
                  <span>৳ BDT</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreferredDisplayCurrency('USD')}
                  className={clsx(
                    'px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1',
                    preferredDisplayCurrency === 'USD'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-blue-100/80 hover:text-white'
                  )}
                  title="View balance in US Dollars (USD)"
                >
                  <span>$ USD</span>
                </button>
              </div>
            </div>
            
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight font-mono-nums drop-shadow-sm">
              {formatCurrency(displayAmount, preferredDisplayCurrency)}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-blue-100/80 bg-white/10 px-2.5 py-1 rounded-lg border border-white/15 backdrop-blur-md">
                ≈ {formatCurrency(secondaryAmount, preferredDisplayCurrency === 'USD' ? 'BDT' : 'USD')}
              </span>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white text-xs font-bold backdrop-blur-md">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-300" />
                <span>+4.82% this month</span>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Quick Actions Bento Dock */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button
            onClick={() => openModal('send')}
            className="px-5 py-2.5 rounded-2xl bg-white text-blue-600 hover:bg-blue-50 font-bold text-xs shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            <Send className="w-4 h-4 text-blue-600" />
            <span>Send Money</span>
          </button>

          <button
            onClick={() => setCurrentTab('receive')}
            className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs border border-white/20 backdrop-blur-md transition-all flex items-center gap-2"
          >
            <ArrowDownLeft className="w-4 h-4 text-cyan-300" />
            <span>Receive</span>
          </button>

          <button
            onClick={() => setCurrentTab('exchange')}
            className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs border border-white/20 backdrop-blur-md transition-all flex items-center gap-2"
          >
            <ArrowLeftRight className="w-4 h-4 text-cyan-300" />
            <span>Convert</span>
          </button>

          <button
            onClick={() => openModal('add-funds')}
            className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs border border-white/20 backdrop-blur-md transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Add Money</span>
          </button>
        </div>
      </div>
    </section>
  );
};
