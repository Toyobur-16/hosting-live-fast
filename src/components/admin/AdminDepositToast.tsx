import React, { useState, useEffect } from 'react';
import {
  Wallet, CheckCircle2, Copy, Check, Eye, X, BellRing,
  ArrowRight, ExternalLink, Loader2, Sparkles, Clock
} from 'lucide-react';
import { PlanRequest } from '../../types';

export interface DepositToastNotification {
  id: string;
  request: PlanRequest;
  timestamp: number;
}

interface AdminDepositToastProps {
  toasts: DepositToastNotification[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  onViewInQueue: (request: PlanRequest) => void;
  onApprove: (id: string) => Promise<void>;
  onViewScreenshot: (url: string) => void;
  actionLoadingId: string | null;
  lang: 'bn' | 'en';
}

function getMethodBadgeStyle(method: string = ''): { bg: string; text: string; border: string; label: string } {
  const m = method.toLowerCase();
  if (m.includes('bkash')) {
    return { bg: 'bg-[#e2136e]/20', text: 'text-[#ff4396]', border: 'border-[#e2136e]/40', label: 'bKash' };
  }
  if (m.includes('nagad')) {
    return { bg: 'bg-[#f15a24]/20', text: 'text-[#ff7849]', border: 'border-[#f15a24]/40', label: 'Nagad' };
  }
  if (m.includes('rocket')) {
    return { bg: 'bg-[#8c3494]/20', text: 'text-[#bf5fd0]', border: 'border-[#8c3494]/40', label: 'Rocket' };
  }
  if (m.includes('upay')) {
    return { bg: 'bg-[#0b549e]/20', text: 'text-[#38bdf8]', border: 'border-[#0b549e]/40', label: 'Upay' };
  }
  if (m.includes('binance') || m.includes('usdt')) {
    return { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/40', label: 'Binance Pay' };
  }
  return { bg: 'bg-slate-700/40', text: 'text-slate-300', border: 'border-slate-600/40', label: method.toUpperCase() || 'MANUAL' };
}

export const AdminDepositToast: React.FC<AdminDepositToastProps> = ({
  toasts,
  onDismiss,
  onClearAll,
  onViewInQueue,
  onApprove,
  onViewScreenshot,
  actionLoadingId,
  lang
}) => {
  const [copiedTrxId, setCopiedTrxId] = useState<string | null>(null);
  const [hoveredToastId, setHoveredToastId] = useState<string | null>(null);

  const handleCopyTrx = (trxId: string, toastId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!trxId) return;
    try {
      navigator.clipboard.writeText(trxId);
      setCopiedTrxId(toastId);
      setTimeout(() => setCopiedTrxId(null), 2000);
    } catch {}
  };

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className="fixed top-3 sm:top-5 right-2 sm:right-5 z-[9999] flex flex-col gap-3 max-w-[95vw] sm:max-w-md w-full pointer-events-none"
      aria-live="polite"
    >
      {toasts.length > 1 && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#070d18]/90 border border-emerald-500/30 backdrop-blur-md shadow-lg pointer-events-auto">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <BellRing className="w-3.5 h-3.5 animate-bounce" />
            <span>
              {lang === 'bn'
                ? `${toasts.length}টি নতুন ডিপোজিট রিকোয়েস্ট জমা হয়েছে`
                : `${toasts.length} new deposit requests received`}
            </span>
          </div>
          <button
            type="button"
            onClick={onClearAll}
            className="text-[11px] text-slate-400 hover:text-rose-400 font-semibold cursor-pointer transition-colors px-2 py-0.5 rounded hover:bg-white/5"
          >
            {lang === 'bn' ? 'সব মুছুন' : 'Clear all'}
          </button>
        </div>
      )}

      {toasts.map((toast) => {
        const { request } = toast;
        const methodBadge = getMethodBadgeStyle(request.method);
        const isApproving = actionLoadingId === request.id;
        const isHovered = hoveredToastId === toast.id;

        return (
          <div
            key={toast.id}
            onMouseEnter={() => setHoveredToastId(toast.id)}
            onMouseLeave={() => setHoveredToastId(null)}
            className="pointer-events-auto relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#0e172a] via-[#091120] to-[#060b16] border-2 border-emerald-500/70 shadow-[0_12px_40px_rgba(0,0,0,0.8),0_0_24px_rgba(16,185,129,0.35)] backdrop-blur-2xl transition-all duration-300 animate-in slide-in-from-top-4 sm:slide-in-from-right-6 text-white"
          >
            {/* Header / Accent Bar */}
            <div className="px-3.5 sm:px-4 pt-3 pb-2 flex items-center justify-between border-b border-emerald-500/20 bg-emerald-950/25">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative flex items-center justify-center shrink-0">
                  <span className="absolute inline-flex h-7 w-7 rounded-xl bg-emerald-400 opacity-50 animate-ping" />
                  <div className="relative w-7 h-7 rounded-xl bg-emerald-500/30 border border-emerald-400/60 text-emerald-300 flex items-center justify-center shadow-sm">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-black text-white tracking-wide flex items-center gap-1 truncate">
                      <span>{lang === 'bn' ? '🔔 নতুন ডিপোজিট রিকোয়েস্ট!' : '🔔 New Deposit Request!'}</span>
                    </h4>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-400/40">
                      LIVE
                    </span>
                  </div>
                  <div className="text-[10px] text-emerald-300/80 flex items-center gap-1">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>{lang === 'bn' ? 'এইমাত্র জমা হয়েছে' : 'Just submitted'}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0"
                title={lang === 'bn' ? 'বন্ধ করুন' : 'Dismiss'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-3.5 sm:p-4 space-y-2.5 text-xs">
              {/* Highlighted Amount & Method Pill */}
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#070d18]/90 border border-slate-800">
                <div className="flex items-baseline gap-2 flex-wrap min-w-0">
                  <span className="text-lg sm:text-xl font-black text-emerald-400 tracking-tight font-mono">
                    ${request.amount} USD
                  </span>
                  {request.bdtAmount && (
                    <span className="px-2 py-0.5 rounded-md bg-pink-500/20 text-pink-300 font-black text-[11px] border border-pink-500/30 font-mono">
                      ৳{request.bdtAmount} BDT
                    </span>
                  )}
                </div>

                <div className={`px-2.5 py-1 rounded-lg font-bold text-[11px] uppercase border shrink-0 ${methodBadge.bg} ${methodBadge.text} ${methodBadge.border}`}>
                  {request.method || methodBadge.label}
                </div>
              </div>

              {/* User Details */}
              <div className="space-y-1 text-[11px] bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/70">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">{lang === 'bn' ? 'গ্রাহক:' : 'User:'}</span>
                  <span className="font-bold text-white text-right truncate max-w-[200px]">
                    {request.userName || 'User'}
                  </span>
                </div>
                {request.userEmail && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">{lang === 'bn' ? 'ইমেইল:' : 'Email:'}</span>
                    <span className="text-slate-300 font-mono text-[10px] text-right truncate max-w-[200px]">
                      {request.userEmail}
                    </span>
                  </div>
                )}
                {(request.senderNumber || request.senderIdentifier) && (
                  <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-slate-800/60">
                    <span className="text-slate-400">{lang === 'bn' ? 'প্রেরক নম্বর:' : 'Sender No:'}</span>
                    <span className="font-mono font-bold text-amber-300 text-right truncate">
                      {request.senderNumber || request.senderIdentifier}
                    </span>
                  </div>
                )}
                {request.transactionId && (
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-slate-400">TrxID:</span>
                    <div className="flex items-center gap-1 font-mono font-bold text-pink-400 text-right min-w-0">
                      <span className="truncate max-w-[140px] sm:max-w-[180px]">{request.transactionId}</span>
                      <button
                        type="button"
                        onClick={(e) => handleCopyTrx(request.transactionId, toast.id, e)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer transition-colors shrink-0"
                        title={lang === 'bn' ? 'TrxID কপি করুন' : 'Copy TrxID'}
                      >
                        {copiedTrxId === toast.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Screenshot button if available */}
              {request.screenshotUrl && (
                <button
                  type="button"
                  onClick={() => onViewScreenshot(request.screenshotUrl!)}
                  className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold cursor-pointer transition-all"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? '📸 পেমেন্ট স্ক্রিনশট দেখুন' : 'View Payment Proof Screenshot'}</span>
                </button>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onViewInQueue(request)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700/80 cursor-pointer transition-all active:scale-95"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'অনুরোধ দেখুন' : 'View in Queue'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onApprove(request.id)}
                  disabled={isApproving}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer transition-all disabled:opacity-50 active:scale-95"
                >
                  {isApproving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>{lang === 'bn' ? 'অনুমোদন করুন' : 'Approve Now'}</span>
                </button>
              </div>
            </div>

            {/* Subtle Progress Bar */}
            <div className="h-1 w-full bg-slate-800/80 overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r from-emerald-500 to-teal-400 ${
                  isHovered ? 'w-full' : 'animate-[toastProgress_14s_linear_forwards]'
                }`}
                style={{
                  animationPlayState: isHovered ? 'paused' : 'running'
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
