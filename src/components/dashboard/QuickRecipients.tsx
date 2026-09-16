import React from 'react';
import { Plus, Users, Send } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { Recipient } from '../../types';

export const QuickRecipients: React.FC = () => {
  const { recipients, openModal, prefillSendModal, setCurrentTab } = useApp();

  return (
    <section className="glass-bento p-6 sm:p-7">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">
            Frequent Beneficiaries
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
            Instant 1-click global dispatch
          </p>
        </div>

        <button
          onClick={() => setCurrentTab('recipients')}
          className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-bold hover:underline flex items-center gap-1"
        >
          <Users className="w-3.5 h-3.5" />
          <span>All Recipients</span>
        </button>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar">
        {/* Add New Recipient Button */}
        <button
          type="button"
          onClick={() => openModal('send')}
          className="shrink-0 flex flex-col items-center gap-2 p-2.5 rounded-2xl border border-dashed border-gray-300 dark:border-white/15 hover:border-blue-400 dark:hover:border-white/30 bg-black/[0.02] hover:bg-black/[0.04] dark:bg-white/[0.03] dark:hover:bg-white/[0.07] transition-all group min-w-[78px]"
        >
          <div className="w-11 h-11 rounded-full bg-blue-50 dark:bg-white/10 border border-blue-200 dark:border-white/15 flex items-center justify-center text-blue-600 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-400 group-hover:border-blue-300 dark:group-hover:border-white/30 transition-colors shadow-xs">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-gray-600 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-white truncate max-w-[64px]">
            New Payee
          </span>
        </button>

        {/* Saved Beneficiaries or Empty State */}
        {(() => {
          const safeRecipients = Array.isArray(recipients) ? recipients : [];
          if (safeRecipients.length === 0) {
            return (
              <div className="flex-1 flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 dark:bg-white/[0.03] rounded-2xl border border-dashed border-gray-200 dark:border-white/15">
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  No frequent beneficiaries yet. Transferred counterparties via User ID or Email will appear here.
                </span>
                <button
                  type="button"
                  onClick={() => openModal('send')}
                  className="text-xs font-bold text-blue-500 dark:text-blue-400 hover:underline shrink-0 flex items-center gap-1"
                >
                  <span>Transfer</span>
                  <Send className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                </button>
              </div>
            );
          }

          return safeRecipients.slice(0, 7).map((recipient: Recipient) => (
            <button
              key={recipient.id || `${recipient.email}-${Math.random()}`}
              type="button"
              onClick={() => prefillSendModal(recipient)}
              className="shrink-0 flex flex-col items-center gap-2 p-2.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 border border-transparent hover:border-gray-200 dark:hover:border-white/10 hover:shadow-xs transition-all group min-w-[78px] text-center"
            >
              <div className="relative">
                <Avatar src={recipient.avatar} name={recipient.name || 'Beneficiary'} size="lg" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs border-2 border-white dark:border-[#0A0A12] opacity-0 group-hover:opacity-100 transition-opacity">
                  <Send className="w-2.5 h-2.5 text-white" />
                </div>
              </div>

              <div className="w-full">
                <div className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 truncate max-w-[72px]">
                  {(recipient.name || 'Client').split(' ')[0]}
                </div>
                <div className="text-[10px] text-gray-400 dark:text-slate-400 font-mono uppercase">
                  {recipient.currency || 'USD'}
                </div>
              </div>
            </button>
          ));
        })()}
      </div>
    </section>
  );
};
