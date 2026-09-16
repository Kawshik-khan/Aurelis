import React from 'react';
import { BalanceHero } from './BalanceHero';
import { BalanceTrendChart } from './BalanceTrendChart';
import { QuickRecipients } from './QuickRecipients';
import { RecentActivity } from './RecentActivity';

export const DashboardView: React.FC = () => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16 lg:pb-0">
      {/* 1. Hero Balance Section */}
      <BalanceHero />

      {/* 3. 12-Column Desktop Grid for Chart + Quick Recipients & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Left Column: Visual Analytics & Recent Activity (8 cols) */}
        <div className="lg:col-span-8 space-y-6 sm:space-y-8">
          <BalanceTrendChart />
          <RecentActivity />
        </div>

        {/* Right Column: Quick Recipients & Instant Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-6 sm:space-y-8">
          <QuickRecipients />

          {/* Institutional Spot Execution Bento Card */}
          <div className="glass-bento p-6 relative overflow-hidden text-gray-900 dark:text-white">
            {/* Ambient blue glow orb */}
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-white/10 px-2.5 py-1 rounded-md mb-3 border border-blue-200 dark:border-white/15">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse" />
                Institutional FX Execution
              </div>

              <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white mb-2">
                Real-Time Spot Treasury
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Execute cross-currency transfers up to $500,000 with sub-second clearing and institutional interbank spread parity.
              </p>

              <div className="space-y-2 pt-3 border-t border-black/10 dark:border-white/10 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">USD/EUR Rate</span>
                  <span className="text-gray-900 dark:text-white font-bold">1.0845</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Interbank Spread</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">0.00% Zero Fee</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
