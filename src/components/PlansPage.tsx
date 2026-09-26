import React, { useState, useEffect } from 'react';
import {
  Crown, Check, ShieldCheck, Zap, Sparkles, AlertCircle,
  CheckCircle2, ArrowRight, Wallet, RefreshCw, Clock, Bot,
  CreditCard, ChevronRight, ShoppingCart, X, AlertTriangle
} from 'lucide-react';
import { HostingPlan, AuthUser, FreeTrialSettings } from '../types';
import { FAQAccordion } from './FAQAccordion';

interface PlansPageProps {
  user: AuthUser | null;
  onOpenAuthModal: () => void;
  onNavigateToWallet: () => void;
  onPlanActivated: (updatedUser: AuthUser) => void;
  lang: 'bn' | 'en';
  onNavigateToDeploy?: () => void;
  onNavigateToSupport?: () => void;
}

export const PlansPage: React.FC<PlansPageProps> = ({
  user,
  onOpenAuthModal,
  onNavigateToWallet,
  onPlanActivated,
  lang,
  onNavigateToDeploy,
  onNavigateToSupport
}) => {
  const [plans, setPlans] = useState<HostingPlan[]>([]);
  const [freeTrial, setFreeTrial] = useState<FreeTrialSettings | null>(null);
  const [claimingTrial, setClaimingTrial] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedCurrency] = useState<'USD'>('USD');
  const [purchasingPlanId, setPurchasingPlanId] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  // Modal dialog states
  const [confirmPlan, setConfirmPlan] = useState<HostingPlan | null>(null);
  const [insufficientBalancePlan, setInsufficientBalancePlan] = useState<HostingPlan | null>(null);

  useEffect(() => {
    fetchPlans();

    const handlePlansUpdated = () => {
      fetchPlans();
    };

    window.addEventListener('plans-updated', handlePlansUpdated);
    window.addEventListener('focus', handlePlansUpdated);

    return () => {
      window.removeEventListener('plans-updated', handlePlansUpdated);
      window.removeEventListener('focus', handlePlansUpdated);
    };
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/plans?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await res.json();
      if (data.freeTrial) {
        setFreeTrial(data.freeTrial);
      }
      if (data.plans && Array.isArray(data.plans)) {
        const orderMap: Record<string, number> = {
          '1_month': 1,
          '3_months': 2,
          '6_months': 3,
          '1_year': 4
        };
        const sorted = [...data.plans].sort((a, b) => {
          const aOrder = orderMap[a.id] || 99;
          const bOrder = orderMap[b.id] || 99;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return (a.durationDays || 0) - (b.durationDays || 0);
        });
        setPlans(sorted);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const handleClaimFreeTrial = async () => {
    if (!user) {
      onOpenAuthModal();
      return;
    }
    setClaimingTrial(true);
    setPurchaseError(null);
    setPurchaseSuccess(null);
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/free-trial/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ফ্রি ট্রায়াল ক্লেইম করা যায়নি');
      }
      setPurchaseSuccess(data.message || (lang === 'bn' ? '🎉 অভিনন্দন! ১ মাসের ফ্রি ট্রায়াল প্ল্যান সক্রিয় হয়েছে!' : '1-Month Free Trial Activated!'));
      if (data.user) {
        localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
        onPlanActivated(data.user);
      }
      fetchPlans();
    } catch (err: any) {
      setPurchaseError(err.message || 'Error claiming free trial');
    } finally {
      setClaimingTrial(false);
    }
  };

  const handleBuyButtonClick = (plan: HostingPlan) => {
    setPurchaseError(null);
    setPurchaseSuccess(null);

    if (!user) {
      onOpenAuthModal();
      return;
    }

    const price = plan.priceUsd || 1.5;
    const currentBalance = user.balanceUsd || 0;

    if (currentBalance < price) {
      setInsufficientBalancePlan(plan);
    } else {
      setConfirmPlan(plan);
    }
  };

  const executePurchase = async (plan: HostingPlan) => {
    setPurchasingPlanId(plan.id);
    setPurchaseError(null);
    setPurchaseSuccess(null);

    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/plans/buy-with-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          planId: plan.id,
          currency: selectedCurrency
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to purchase plan');
      }

      setPurchaseSuccess(data.message || (lang === 'bn' ? 'প্যাকেজ সফলভাবে ক্রয় করা হয়েছে!' : 'Plan purchased successfully!'));
      setConfirmPlan(null);
      if (data.user) {
        localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
        onPlanActivated(data.user);
      }
    } catch (err: any) {
      setPurchaseError(err.message || 'Error processing purchase');
    } finally {
      setPurchasingPlanId(null);
    }
  };

  const hasActivePlan = Boolean(
    user && (user.role === 'admin' || (user.plan && user.plan !== 'free' && user.plan !== 'none' && user.plan !== 'expired' && (!user.planExpiresAt || user.planExpiresAt > Date.now())))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/30 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'হোস্টিং প্লান ও প্যাকেজ' : 'Hosting Packages'}</span>
              </span>
              <button
                type="button"
                onClick={() => fetchPlans()}
                disabled={loading}
                title={lang === 'bn' ? 'প্লান তালিকা রিফ্রেশ করুন' : 'Refresh Plans'}
                className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-slate-300 hover:text-white text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
                <span>{loading ? (lang === 'bn' ? 'লোড হচ্ছে...' : 'Loading...') : (lang === 'bn' ? 'রিফ্রেশ' : 'Refresh')}</span>
              </button>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {lang === 'bn' ? '১ মাস থেকে ১ বছর মেয়াদি hosting live fast' : 'hosting live fast (1 Month to 1 Year)'}
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              {lang === 'bn'
                ? 'বট হোস্ট করতে যেকোনো একটি প্লান বেছে নিন। যেকোনো প্লান কেনার সাথে সাথে "Deploy New Bot" বাটন আনলক হবে এবং আপনার বট সার্বক্ষণিক লাইভ থাকবে।'
                : 'Select a hosting plan to unlock the "Deploy New Bot" button and keep your bots live 24/7.'}
            </p>
          </div>

          {/* User Status Bar */}
          <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 min-w-[260px] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold">{lang === 'bn' ? 'ওয়ালেট ব্যালেন্স:' : 'Wallet Balance:'}</span>
              <span className="text-emerald-400 font-black text-sm">
                ${user ? (user.balanceUsd || 0).toFixed(2) : '0.00'} USDT
              </span>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-white/10 pt-2">
              <span className="text-slate-400">{lang === 'bn' ? 'বর্তমান প্লান:' : 'Active Plan:'}</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                hasActivePlan ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {hasActivePlan ? (user?.role === 'admin' ? 'এডমিন আনলিমিটেড' : `${user?.plan}`) : (lang === 'bn' ? 'কোনো প্লান নেই' : 'No Plan')}
              </span>
            </div>

            <button
              type="button"
              onClick={onNavigateToWallet}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 transition-colors"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span>{lang === 'bn' ? 'USDT ডিপোজিট করুন' : 'Deposit USDT / Wallet'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Header Info & Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-2xl">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {lang === 'bn' ? 'মুদ্রা:' : 'Currency:'}
          </span>
          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-black">
            USDT ($)
          </span>
        </div>

        <button
          type="button"
          onClick={fetchPlans}
          disabled={loading}
          className="text-xs font-bold text-[#0088cc] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{lang === 'bn' ? 'প্লান রিফ্রেশ' : 'Refresh Plans'}</span>
        </button>
      </div>

      {/* Alert Banners */}
      {purchaseSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between shadow-xs animate-in zoom-in-95">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-bold">{purchaseSuccess}</span>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
            {lang === 'bn' ? 'সফল' : 'Active'}
          </span>
        </div>
      )}

      {purchaseError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <span className="font-semibold">{purchaseError}</span>
          </div>
          <button
            type="button"
            onClick={onNavigateToWallet}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-xs"
          >
            {lang === 'bn' ? 'এখনই ডিপোজিট করুন' : 'Deposit Now'}
          </button>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1-Month Free Trial Plan Card (Visible ONLY if user has NOT claimed it yet) */}
        {(!user || !user.hasClaimedFreeTrial) && (freeTrial ? freeTrial.enabled : true) && (
          <div className="rounded-3xl p-6 flex flex-col justify-between transition-all relative bg-gradient-to-b from-emerald-950/40 via-teal-950/20 to-slate-900/90 border-2 border-emerald-500 shadow-xl shadow-emerald-500/15">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-[10px] tracking-wider uppercase shadow-md flex items-center gap-1 whitespace-nowrap">
              <Sparkles className="w-3 h-3" />
              <span>{lang === 'bn' ? '১ মাস সম্পূর্ণ ফ্রি (নতুন ইউজার)' : '1 Month Free (New User)'}</span>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{lang === 'bn' ? (freeTrial?.nameBn || '১ মাস ফ্রি ট্রায়াল') : (freeTrial?.nameEn || '1 Month Free Trial')}</span>
                </h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold text-[11px]">
                    {freeTrial?.durationDays || 30} {lang === 'bn' ? 'দিন মেয়াদ' : 'Days Free'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 font-bold text-[11px]">
                    {freeTrial?.maxBots || 1} {lang === 'bn' ? 'টি বট হোস্টিং' : 'Bot Hosting'}
                  </span>
                </div>
              </div>

              {/* Price Display */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-emerald-400">
                    $0.00
                  </span>
                  <span className="text-xs font-bold text-emerald-300">
                    / {lang === 'bn' ? '৩০ দিন ফ্রি' : '30 Days Free'}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-400 font-bold mt-0.5">
                  {lang === 'bn' ? 'প্রতি নতুন ইউজারের জন্য ১ বার প্রযোজ্য' : 'Valid once for new users'}
                </div>
              </div>

              {/* Features list */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {lang === 'bn' ? 'ফ্রি ট্রায়াল সুবিধাসমূহ:' : 'Free Trial Includes:'}
                </span>
                <ul className="space-y-2">
                  {(lang === 'bn'
                    ? (freeTrial?.featuresBn || [
                        '১টি টেলিগ্রাম বট ২৪/৭ সার্বক্ষণিক লাইভ হোস্টিং',
                        '১ মাস (৩০ দিন) সম্পূর্ণ ফ্রি অ্যাক্সেস',
                        'অটো-রিস্টার্ট ও ক্র্যাশ প্রোটেকশন',
                        'লাইভ কনসোল ও রিয়েল-টাইম লগস',
                        'ফাইল এডিটর ও ডাটাবেজ ব্যাকআপ'
                      ])
                    : (freeTrial?.featuresEn || [
                        '1 Telegram Bot 24/7 Live Hosting',
                        '1 Month (30 Days) Completely Free Access',
                        'Auto-Restart & Crash Protection',
                        'Live Console & Real-time Logs',
                        'File Editor & Database Backup'
                      ])
                  ).map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Claim Button */}
            <div className="pt-6 border-t border-slate-100 dark:border-[#1f293d] mt-4">
              <button
                type="button"
                onClick={handleClaimFreeTrial}
                disabled={claimingTrial}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {claimingTrial ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>{lang === 'bn' ? 'সক্রিয় হচ্ছে...' : 'Activating...'}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-slate-950" />
                    <span>{user ? (lang === 'bn' ? '🎁 ১ মাসের ফ্রি প্ল্যান নিন' : '🎁 Claim 1-Month Free') : (lang === 'bn' ? 'লগইন করে ১ মাস ফ্রি নিন' : 'Login to Claim Free Trial')}</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-center text-emerald-400/90 mt-2 font-medium">
                {lang === 'bn' ? '১টি বট ২৪/৭ সার্বক্ষণিক লাইভ থাকবে' : '1 Bot will run 24/7 live'}
              </p>
            </div>
          </div>
        )}

        {plans.map((plan) => {
          const isPopular = Boolean(plan.popular);
          const price = plan.priceUsd || 1.5;

          return (
            <div
              key={plan.id}
              className={`rounded-3xl p-6 flex flex-col justify-between transition-all relative ${
                isPopular
                  ? 'bg-gradient-to-b from-indigo-950/70 to-slate-900/90 border-2 border-[#0088cc] shadow-xl shadow-[#0088cc]/10'
                  : 'bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1f293d] shadow-sm hover:shadow-md'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[10px] tracking-wider uppercase shadow-md flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>{lang === 'bn' ? 'সবচেয়ে জনপ্রিয়' : 'Most Popular'}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Header */}
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {lang === 'bn' ? plan.nameBn : plan.nameEn}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="px-2 py-0.5 rounded-md bg-sky-500/15 text-[#0088cc] dark:text-sky-300 font-bold text-[11px]">
                      {plan.durationDays} {lang === 'bn' ? 'দিন মেয়াদ' : 'Days'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                      {plan.maxBots >= 999 ? (lang === 'bn' ? 'আনলিমিটেড বট' : 'Unlimited Bots') : `${plan.maxBots} ${lang === 'bn' ? 'টি বট' : 'Bots'}`}
                    </span>
                  </div>
                </div>

                {/* Price Display */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0d1627] border border-slate-200 dark:border-[#1f2d48]">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">
                      ${price.toFixed(2)}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      /{plan.durationDays} {lang === 'bn' ? 'দিন' : 'days'}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-500 font-bold mt-0.5">
                    USDT (TRC20 / BEP20)
                  </div>
                </div>

                {/* Features list */}
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {lang === 'bn' ? 'প্যাকেজ সুবিধাসমূহ:' : 'Features Included:'}
                  </span>
                  <ul className="space-y-2">
                    {(lang === 'bn' ? plan.featuresBn : plan.featuresEn)?.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Purchase Button */}
              <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  type="button"
                  id={`buy-plan-btn-${plan.id}`}
                  onClick={() => handleBuyButtonClick(plan)}
                  className={`w-full py-3 px-4 rounded-xl font-black text-xs cursor-pointer shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 ${
                    isPopular
                      ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/25'
                      : 'bg-[#0088cc] hover:bg-[#0077b5] text-white shadow-[#0088cc]/20'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{lang === 'bn' ? '⚡ প্ল্যান কিনুন (Buy Plan)' : '⚡ Buy Plan Now'}</span>
                </button>

                <p className="text-[10px] text-center text-slate-400">
                  {lang === 'bn' ? 'ক্রয় করার সাথে সাথে "Deploy New Bot" আনলক হবে' : 'Unlocks "Deploy New Bot" instantly'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Accordion FAQ Section for Hosting Plans & Deployment */}
      <div className="pt-6">
        <FAQAccordion
          lang={lang}
          onNavigateToDeploy={onNavigateToDeploy}
          onNavigateToSupport={onNavigateToSupport}
          defaultOpenFirst={false}
        />
      </div>

      {/* Confirmation Modal */}
      {confirmPlan && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmPlan(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in cursor-pointer"
        >
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 cursor-default">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {lang === 'bn' ? 'প্ল্যান কেনার নিশ্চিতকরণ' : 'Confirm Plan Purchase'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {lang === 'bn' ? confirmPlan.nameBn : confirmPlan.nameEn}
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="confirm-plan-close-btn"
                onClick={() => setConfirmPlan(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0d1627] border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">{lang === 'bn' ? 'প্যাকেজের মেয়াদ:' : 'Plan Duration:'}</span>
                <span className="font-bold text-slate-900 dark:text-white">{confirmPlan.durationDays} {lang === 'bn' ? 'দিন' : 'Days'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">{lang === 'bn' ? 'বট সাপোর্ট:' : 'Bot Limit:'}</span>
                <span className="font-bold text-slate-900 dark:text-white">{confirmPlan.maxBots >= 999 ? (lang === 'bn' ? 'আনলিমিটেড' : 'Unlimited') : `${confirmPlan.maxBots} ${lang === 'bn' ? 'টি' : 'Bots'}`}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">{lang === 'bn' ? 'মূল্য (কর্তন হবে):' : 'Plan Price:'}</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  ${(confirmPlan.priceUsd || 1.5).toFixed(2)} USDT
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">{lang === 'bn' ? 'আপনার বর্তমান ব্যালেন্স:' : 'Your Balance:'}</span>
                <span className="font-bold text-slate-900 dark:text-white">${(user?.balanceUsd || 0).toFixed(2)} USDT</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {lang === 'bn'
                ? 'নিশ্চিত করার সাথে সাথে আপনার ওয়ালেট থেকে ব্যালেন্স কেটে নেওয়া হবে এবং "Deploy New Bot" বাটন আনলক হয়ে যাবে।'
                : 'Confirming will deduct from your wallet balance and immediately unlock bot deployments.'}
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPlan(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={purchasingPlanId === confirmPlan.id}
                onClick={() => executePurchase(confirmPlan)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {purchasingPlanId === confirmPlan.id ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{lang === 'bn' ? 'প্রসেসিং...' : 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? '✅ নিশ্চিত করে কিনুন' : 'Confirm Purchase'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insufficient Balance Modal */}
      {insufficientBalancePlan && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setInsufficientBalancePlan(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in cursor-pointer"
        >
          <div className="bg-white dark:bg-[#111827] border border-amber-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 cursor-default">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {lang === 'bn' ? 'পর্যাপ্ত ওয়ালেট ব্যালেন্স নেই' : 'Insufficient Wallet Balance'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {lang === 'bn' ? insufficientBalancePlan.nameBn : insufficientBalancePlan.nameEn}
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="insufficient-balance-close-btn"
                onClick={() => setInsufficientBalancePlan(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">{lang === 'bn' ? 'প্যাকেজের মূল্য:' : 'Plan Price:'}</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ${(insufficientBalancePlan.priceUsd || 1.5).toFixed(2)} USDT
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">{lang === 'bn' ? 'আপনার বর্তমান ব্যালেন্স:' : 'Current Balance:'}</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ${(user?.balanceUsd || 0).toFixed(2)} USDT
                </span>
              </div>
              <div className="pt-2 border-t border-amber-200 dark:border-amber-800 flex justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
                <span>{lang === 'bn' ? 'প্রয়োজনীয় বাকি ডলার:' : 'Needed Amount:'}</span>
                <span>
                  ${Math.max(0, (insufficientBalancePlan.priceUsd || 1.5) - (user?.balanceUsd || 0)).toFixed(2)} USDT
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {lang === 'bn'
                ? 'এই প্ল্যানটি কিনতে প্রথমে ওয়ালেট ডিপোজিট পেজে গিয়ে বাইন্যান্স (Binance UID / Pay ID) এর মাধ্যমে ডলার ডিপোজিট করুন। ব্যালেন্স এড হওয়ার পর প্ল্যান পেজে এসে এই বাই বাটনে ক্লিক করলেই প্ল্যান চালু হয়ে যাবে।'
                : 'To buy this plan, please deposit USDT via Binance in the Wallet Deposit page first. Once credited, click Buy Plan to activate immediately.'}
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                id="insufficient-balance-dismiss-btn"
                onClick={() => setInsufficientBalancePlan(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
              <button
                type="button"
                id="go-to-deposit-page-btn"
                onClick={() => {
                  setInsufficientBalancePlan(null);
                  onNavigateToWallet();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5 text-slate-950" />
                <span>{lang === 'bn' ? '💳 ওয়ালেট ডিপোজিটে যান' : 'Go to Deposit Page'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
