import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Mail,
  Check,
  Copy,
  Download,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { DispatchedAlert } from '../../types';
import { useApp } from '../../context/AppContext';
import { clsx } from 'clsx';

interface MessagePreviewModalProps {
  alert: DispatchedAlert | null;
  onClose: () => void;
}

export const MessagePreviewModal: React.FC<MessagePreviewModalProps> = ({ alert, onClose }) => {
  const { user } = useApp();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview');

  if (!alert) return null;

  const isEmail = alert.channel === 'EMAIL';
  const isSms = alert.channel === 'SMS';

  const handleCopy = () => {
    navigator.clipboard.writeText(alert.bodyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    if (alert.bodyHtml) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(alert.bodyHtml);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 250);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className={clsx(
          'relative w-full rounded-3xl border shadow-2xl overflow-hidden flex flex-col transition-all my-auto',
          isEmail ? 'max-w-2xl bg-[#0B0E1A] border-white/15 text-white max-h-[92vh]' : 'max-w-md bg-[#0B0E1A] border-white/15 text-white'
        )}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                'w-10 h-10 rounded-2xl flex items-center justify-center border',
                isEmail
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              )}
            >
              {isEmail ? <Mail className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {isEmail ? 'Transaction Email Receipt' : 'Mobile SMS Notification'}
                </h3>
                <span
                  className={clsx(
                    'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border',
                    isEmail
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  )}
                >
                  {alert.channel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Delivered to <span className="font-mono text-slate-200">{alert.recipient}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5"
              title="Copy text"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            {isEmail && alert.bodyHtml && (
              <button
                onClick={handlePrint}
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5"
                title="Print or Save PDF"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* ==============================================
              1. SMARTPHONE SMS MOCKUP VIEW
             ============================================== */}
          {isSms && (
            <div className="py-2 flex flex-col items-center">
              {/* Smartphone Frame */}
              <div className="w-full max-w-[340px] rounded-[38px] border-[6px] border-[#1E2436] bg-[#070913] p-4 shadow-2xl relative overflow-hidden">
                {/* Dynamic Island / Speaker Notch */}
                <div className="w-24 h-4 bg-[#1E2436] rounded-full mx-auto mb-3 flex items-center justify-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-black/60" />
                </div>

                {/* Mobile Status Bar */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 mb-4">
                  <span className="font-semibold">9:41</span>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span>5G</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Sender Contact Header */}
                <div className="text-center pb-4 border-b border-white/5 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-red-600 to-rose-600 text-white flex items-center justify-center mx-auto text-xs font-bold shadow-md">
                    DBS
                  </div>
                  <div className="text-xs font-bold text-white mt-1.5 flex items-center justify-center gap-1">
                    <span>DBS Bank Alerts</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Sender: DBS Bank (sms.net.bd)
                  </div>
                </div>

                {/* Message Bubble Thread */}
                <div className="space-y-3 min-h-[200px] flex flex-col justify-end">
                  <div className="text-center text-[10px] text-slate-500 font-medium">
                    Today • {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  {/* SMS Bubble */}
                  <div className="self-start max-w-[90%] p-3.5 rounded-2xl rounded-tl-sm bg-[#1A2238] border border-blue-500/20 text-slate-100 text-xs leading-relaxed shadow-lg">
                    {alert.bodyText}
                  </div>

                  <div className="self-start text-[10px] text-slate-500 pl-2 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Delivered via DBS Bangladesh SMS Gateway</span>
                  </div>
                </div>

                {/* Mockup Bottom Message Bar */}
                <div className="mt-6 pt-3 border-t border-white/5 flex items-center gap-2">
                  <div className="flex-1 py-1.5 px-3 rounded-full bg-white/[0.04] border border-white/10 text-[11px] text-slate-500">
                    Reply STOP to opt out
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================
              2. LUXURY EMAIL CLIENT VIEWER
             ============================================== */}
          {isEmail && (
            <div className="space-y-3">
              {/* Mail Meta Header */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">From:</span>
                  <span className="font-semibold text-white">
                    DBS Bank Bangladesh &lt;alerts@dbs.com.bd&gt;
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">To:</span>
                  <span className="font-mono text-slate-200">{alert.recipient}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Subject:</span>
                  <span className="font-bold text-blue-400">{alert.subject}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Security:</span>
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    DKIM, SPF & TLS 1.3 Verified
                  </span>
                </div>
              </div>

              {/* Email Content */}
              {alert.bodyHtml ? (
                <div className="rounded-2xl border border-white/10 overflow-hidden bg-white">
                  <iframe
                    title="Email Preview"
                    srcDoc={alert.bodyHtml}
                    className="w-full h-[480px] border-0"
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : (
                <pre className="p-4 rounded-2xl bg-black/60 border border-white/10 text-xs font-mono text-slate-300 whitespace-pre-wrap overflow-x-auto">
                  {alert.bodyText}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Dispatched {new Date(alert.createdAt).toLocaleString()}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
