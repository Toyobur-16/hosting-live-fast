import React, { useState } from 'react';
import {
  Gift,
  CheckCircle2,
  Sparkles,
  Bot,
  Clock,
  ShieldCheck,
  Zap,
  X,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { AuthUser } from '../types';

interface FreeTrialClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onSuccess: (updatedUser: AuthUser) => void;
  lang?: 'bn' | 'en';
}

export const FreeTrialClaimModal: React.FC<FreeTrialClaimModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSuccess,
  lang = 'bn'
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimedSuccess, setClaimedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleClaim = async () => {
    setError(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/free-trial/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (lang === 'bn' ? 'ফ্রি প্ল্যান ক্লেইম করা সম্ভব হয়নি' : 'Could not claim free plan'));
      }

      if (data.user) {
        localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
        onSuccess(data.user);
      }

      setClaimedSuccess(true);
      setTimeout(() => {
        setClaimedSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="free-trial-claim-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050811]/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-[#0f172a] border border-[#1e293b] shadow-2xl rounded-3xl max-w-md w-full p-6 sm:p-7 text-white relative overflow-hidden">
        {/* Glow background accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-28 bg-gradient-to-b from-emerald-500/20 via-[#0088cc]/15 to-transparent blur-2xl pointer-events-none" />

        <button
          id="close-free-trial-modal-btn"
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {claimedSuccess ? (
          <div className="text-center py-6 space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-white">
                {lang === 'bn' ? '🎉 অভিনন্দন!' : '🎉 Congratulations!'}
              </h3>
              <p className="text-xs text-emerald-300 font-bold">
                {lang === 'bn'
                  ? '১ মাসের ফ্রি প্ল্যান সফলভাবে সক্রিয় হয়েছে!'
                  : '1-Month Free Hosting Plan Activated Successfully!'}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                {lang === 'bn'
                  ? 'এখন আপনি ১টি টেলিগ্রাম বট লাইভ হোস্ট করতে পারবেন।'
                  : 'You can now host 1 live Telegram bot 24/7.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header Icon & Title */}
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-sky-500/20 border border-emerald-500/40 text-emerald-400 shadow-md">
                <Gift className="w-8 h-8" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-extrabold uppercase">
                <Sparkles className="w-3 h-3" />
                <span>{lang === 'bn' ? 'নতুন ইউজার স্পেশাল অফার' : 'New User Welcome Gift'}</span>
              </div>
              <h3 className="text-xl font-black text-white">
                {lang === 'bn' ? '১ মাস ফ্রি বট হোস্টিং প্ল্যান' : '1-Month Free Bot Hosting Plan'}
              </h3>
              <p className="text-xs text-slate-300">
                {lang === 'bn'
                  ? 'রেজিস্ট্রেশন করার জন্য ধন্যবাদ! আপনি পাচ্ছেন সম্পূর্ণ বিনামূল্যে ১ মাসের জন্য ১টি টেলিগ্রাম বট লাইভ হোস্ট করার সুযোগ।'
                  : 'Thank you for joining! Enjoy 1 month of complimentary 24/7 Telegram bot hosting.'}
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Feature Perks Box */}
            <div className="p-4 rounded-2xl bg-[#0a101d] border border-[#1e293b] space-y-3">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2.5">
                <span className="text-xs text-slate-400">{lang === 'bn' ? 'প্যাকেজের মেয়াদ' : 'Plan Duration'}:</span>
                <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>৩০ দিন (১ মাস)</span>
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2.5">
                <span className="text-xs text-slate-400">{lang === 'bn' ? 'হোস্টিং সক্ষমতা' : 'Bot Capacity'}:</span>
                <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5" />
                  <span>১টি টেলিগ্রাম বট (লাইভ)</span>
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2.5">
                <span className="text-xs text-slate-400">{lang === 'bn' ? 'সার্ভার ফি' : 'Server Fee'}:</span>
                <span className="text-xs font-black text-white px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  $0.00 / সম্পূর্ণ ফ্রি
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{lang === 'bn' ? 'অফার শর্ত' : 'Eligibility'}:</span>
                <span className="text-[11px] font-bold text-sky-400">
                  {lang === 'bn' ? 'নতুন ইউজারের জন্য একবার প্রযোজ্য' : 'Once per new user'}
                </span>
              </div>
            </div>

            {/* Notice about 1 month expiry */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px] leading-relaxed">
              💡 {lang === 'bn'
                ? '১ মাস মেয়াদ শেষ হলে আপনার বট সাময়িকভাবে বন্ধ থাকবে। তখন যেকোনো একটি পেইড প্ল্যান কিনলে আপনার আগের বট সাথে সাথে পুনরায় লাইভ হয়ে যাবে।'
                : 'After 1 month, purchasing any plan will immediately bring your previous bot back to live.'}
            </div>

            {/* Claim Action Button */}
            <button
              id="confirm-claim-free-trial-btn"
              type="button"
              disabled={loading}
              onClick={handleClaim}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.99] text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60"
            >
              {loading ? (
                <span>{lang === 'bn' ? 'ক্লেইম হচ্ছে...' : 'Claiming Free Plan...'}</span>
              ) : (
                <>
                  <Gift className="w-4 h-4" />
                  <span>{lang === 'bn' ? '🎁 ১ মাস ফ্রি প্ল্যান ক্লেইম করুন' : '🎁 Claim 1-Month Free Plan'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
