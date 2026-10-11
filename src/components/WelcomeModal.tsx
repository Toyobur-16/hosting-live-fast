import React, { useEffect } from 'react';
import { X, Sparkles, Check, PartyPopper } from 'lucide-react';
import { AuthUser, SiteSettings } from '../types';

export interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteSettings: SiteSettings;
  user?: AuthUser | null;
  lang?: 'bn' | 'en';
}

export const WelcomeModal = ({
  isOpen,
  onClose,
  siteSettings,
  user = null,
  lang = 'bn'
}: WelcomeModalProps) => {
  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const title =
    siteSettings.welcomeMessageTitle ||
    (lang === 'bn'
      ? `🎉 স্বাগতম ${user?.name ? user.name + '!' : 'হোস্টিং লাইভ ফাস্ট-এ!'}`
      : `🎉 Welcome ${user?.name ? user.name + '!' : 'to Hosting Live Fast!'}`);

  const badge =
    siteSettings.welcomeMessageBadge ||
    (lang === 'bn' ? '🌟 অফিসিয়াল ওয়েলকাম নোটিশ' : '🌟 Official Welcome Notice');

  const defaultBodyBn = `আমাদের ২৪/৭ ক্লাউড টেলিগ্রাম বট হোস্টিং ও ওয়েবসাইট সার্ভিসে আপনাকে স্বাগতম!

• 🚀 ২৪/৭ ক্লাউড টেলিগ্রাম বট হোস্টিং ও কিপ-অ্যালাইভ ওয়াচডগ
• 🛡️ এআই বট গার্ডিয়ান ও লাইভ কনসোল মনিটরিং
• 💳 ইনস্ট্যান্ট বিকাশ, নগদ ও বাইন্যান্স পে ডিপোজিট
• 🎁 ফ্রি ট্রায়াল অফার ও সোশ্যাল টাস্ক কমপ্লিট করে আয়

যেকোনো প্রয়োজনে আমাদের 24/7 AI লাইভ সাপোর্ট বা এডমিন প্যানেলে যোগাযোগ করুন। আপনার যাত্রা শুভ হোক!`;

  const defaultBodyEn = `Welcome to 24/7 Cloud Telegram Bot Hosting & Web Services!

• 🚀 24/7 Cloud Bot Hosting with auto-restart watchdog
• 🛡️ AI Bot Guardian & real-time live terminal console
• 💳 Instant bKash, Nagad, and Binance Pay deposits
• 🎁 Free Trial offer & earn rewards by completing social tasks

For any assistance, contact our 24/7 AI Live Support or Admin team anytime. Enjoy your experience!`;

  const body = siteSettings.welcomeMessageBody || (lang === 'bn' ? defaultBodyBn : defaultBodyEn);

  const buttonText =
    siteSettings.welcomeMessageButtonText ||
    (lang === 'bn' ? 'বুঝেছি, শুরু করুন' : 'Got it, Get Started');

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-gradient-to-b from-[#0f172a] via-[#0d1424] to-[#070b13] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 text-center shadow-2xl shadow-cyan-950/50 space-y-5 animate-in zoom-in-95 duration-200 my-auto"
      >
        {/* Prominent Cross / Close Icon */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close welcome message"
          className="absolute top-4 right-4 p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer shadow-md border border-slate-700/60 hover:scale-105 active:scale-95 z-20"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Optional Welcome Image / Banner */}
        {siteSettings.welcomeMessageImageUrl && (
          <div className="rounded-2xl overflow-hidden max-h-48 w-full border border-cyan-500/20 bg-black/50 shadow-md">
            <img
              src={siteSettings.welcomeMessageImageUrl}
              alt="Welcome Banner"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Header Icon & Badge */}
        <div className="flex flex-col items-center justify-center gap-2 pt-1">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-amber-500/20 to-emerald-500/20 border border-cyan-500/40 text-amber-400 flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <PartyPopper className="w-7 h-7 text-amber-400 animate-bounce" />
          </div>

          <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/15 to-cyan-500/15 border border-amber-500/30 text-amber-300 text-xs font-black inline-flex items-center gap-1.5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{badge}</span>
          </span>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
            {title}
          </h2>
          {user?.email && (
            <div className="text-[11px] text-cyan-400 font-mono">
              {user.email}
            </div>
          )}
        </div>

        {/* Message Body */}
        <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap text-left bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-800/90 shadow-inner max-h-60 overflow-y-auto">
          {body}
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#0088cc] via-cyan-500 to-emerald-500 hover:brightness-110 active:scale-[0.99] text-white font-black text-sm shadow-lg shadow-cyan-500/25 cursor-pointer transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{buttonText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
