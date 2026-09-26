import React, { useState, useEffect } from 'react';
import {
  X, Check, ShieldCheck, Sparkles, Crown, Zap, Clock, CreditCard,
  Send, CheckCircle2, AlertCircle, Copy, HelpCircle, Wallet,
  ArrowRight, PlusCircle, RefreshCw, AlertTriangle, ArrowUpRight
} from 'lucide-react';
import { HostingPlan, PaymentSettings, AuthUser, PlanRequest, FreeTrialSettings } from '../types';

interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  onOpenAuthModal: () => void;
  lang: 'bn' | 'en';
  onUserUpdated?: (updatedUser: AuthUser) => void;
}

export const PlansModal: React.FC<PlansModalProps> = ({
  isOpen,
  onClose,
  user,
  onOpenAuthModal,
  lang,
  onUserUpdated
}) => {
  const [plans, setPlans] = useState<HostingPlan[]>([]);
  const [freeTrial, setFreeTrial] = useState<FreeTrialSettings | null>(null);
  const [claimingTrial, setClaimingTrial] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [activeView, setActiveView] = useState<'plans' | 'deposit' | 'history'>('plans');

  // Deposit Form State
  const [depositMethod, setDepositMethod] = useState<'binance' | 'bkash' | 'nagad'>('binance');
  const [depositCurrency, setDepositCurrency] = useState<'USD'>('USD');
  const [depositAmount, setDepositAmount] = useState<string>('5');
  const [senderIdentifier, setSenderIdentifier] = useState('');
  const [depositTrxId, setDepositTrxId] = useState('');
  const [depositNote, setDepositNote] = useState('');

  // Buy Flow State
  const [buyingPlan, setBuyingPlan] = useState<HostingPlan | null>(null);
  const [buyCurrency, setBuyCurrency] = useState<'USD'>('USD');
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buySuccess, setBuySuccess] = useState<string | null>(null);

  // Common State
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [allRequests, setAllRequests] = useState<PlanRequest[]>([]);
  const [latestRequest, setLatestRequest] = useState<PlanRequest | null>(null);

  // Current balance state (synced with user and backend)
  const [balanceBdt, setBalanceBdt] = useState<number>(user?.balanceBdt || 0);
  const [balanceUsd, setBalanceUsd] = useState<number>(user?.balanceUsd || 0);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      setBuyError(null);
      setBuySuccess(null);
      fetchPlans();
      fetchPaymentSettings();
      if (user) {
        fetchUserStatus();
      }
    }

    const handlePlansUpdated = () => {
      fetchPlans();
    };

    window.addEventListener('plans-updated', handlePlansUpdated);
    return () => {
      window.removeEventListener('plans-updated', handlePlansUpdated);
    };
  }, [isOpen, user]);

  useEffect(() => {
    if (user) {
      setBalanceBdt(user.balanceBdt || 0);
      setBalanceUsd(user.balanceUsd || 0);
    }
  }, [user]);

  // Adjust currency default when deposit method changes
  useEffect(() => {
    setDepositCurrency('USD');
    if (!depositAmount || depositAmount === '150') setDepositAmount('5');
  }, [depositMethod]);

  const fetchPlans = async () => {
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
        // Sort plans in order: free -> 1_month -> 3_months -> 6_months -> 1_year -> custom
        const orderMap: { [key: string]: number } = {
          free: 0,
          '1_month': 1,
          '3_months': 2,
          '6_months': 3,
          '1_year': 4
        };
        const sorted = [...data.plans].sort((a, b) => {
          const ordA = orderMap[a.id] !== undefined ? orderMap[a.id] : (a.durationDays || 50);
          const ordB = orderMap[b.id] !== undefined ? orderMap[b.id] : (b.durationDays || 50);
          return ordA - ordB;
        });
        setPlans(sorted);
      }
    } catch {}
  };

  const handleClaimFreeTrial = async () => {
    if (!user) {
      onOpenAuthModal();
      return;
    }
    setClaimingTrial(true);
    setError(null);
    setSuccessMsg(null);
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
        throw new Error(data.error || 'ফ্রি ট্রায়াল সক্রিয় করা যায়নি');
      }
      setSuccessMsg(data.message || (lang === 'bn' ? '🎉 ১ মাসের ফ্রি ট্রায়াল সক্রিয় হয়েছে!' : 'Free Trial Activated!'));
      if (data.user) {
        localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
        if (onUserUpdated) onUserUpdated(data.user);
      }
      fetchPlans();
    } catch (err: any) {
      setError(err.message || 'Error claiming free trial');
    } finally {
      setClaimingTrial(false);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const res = await fetch('/api/payment-settings');
      const data = await res.json();
      if (data.settings) setPaymentSettings(data.settings);
    } catch {}
  };

  const fetchUserStatus = async () => {
    const token = localStorage.getItem('bot_auth_token');
    if (!token) return;
    try {
      const res = await fetch('/api/plans/my-request', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.allRequests) setAllRequests(data.allRequests);
      if (data.latestRequest) setLatestRequest(data.latestRequest);
      if (typeof data.balanceBdt === 'number') setBalanceBdt(data.balanceBdt);
      if (typeof data.balanceUsd === 'number') setBalanceUsd(data.balanceUsd);
    } catch {}
  };

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleStartDepositForPlan = (plan: HostingPlan) => {
    setBuyingPlan(null);
    setActiveView('deposit');
    setDepositCurrency('USD');
    setDepositAmount((plan.priceUsd || 5).toString());
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuthModal();
      return;
    }

    const amountNum = parseFloat(depositAmount);
    if (!amountNum || amountNum <= 0) {
      setError(lang === 'bn' ? 'সঠিক জমার পরিমাণ (Amount) লিখুন' : 'Enter a valid amount');
      return;
    }

    if (!senderIdentifier.trim()) {
      setError(lang === 'bn' ? 'প্রেরক ফোন নাম্বার বা Binance UID প্রদান করুন' : 'Sender phone number or Binance UID is required');
      return;
    }

    if (!depositTrxId.trim()) {
      setError(lang === 'bn' ? 'Transaction ID (TrxID) প্রদান করুন' : 'Transaction ID (TrxID) is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: amountNum,
          currency: depositCurrency,
          method: depositMethod,
          senderIdentifier: senderIdentifier.trim(),
          transactionId: depositTrxId.trim(),
          note: depositNote.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ডিপোজিট সাবমিট ব্যর্থ হয়েছে');
      }

      setSuccessMsg(data.message || 'আপনার ডিপোজিট রিকোয়েস্ট সফলভাবে জমা হয়েছে। এডমিন অনুমোদন করলেই ব্যালেন্স যোগ হবে।');
      setSenderIdentifier('');
      setDepositTrxId('');
      setDepositNote('');
      fetchUserStatus();
    } catch (err: any) {
      setError(err.message || 'ডিপোজিট রিকোয়েস্ট পাঠানো যায়নি');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyWithWallet = async () => {
    if (!user) {
      onOpenAuthModal();
      return;
    }
    if (!buyingPlan) return;

    setBuyLoading(true);
    setBuyError(null);
    setBuySuccess(null);

    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/plans/buy-with-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          planId: buyingPlan.id,
          currency: buyCurrency
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'প্যাকেজ কেনা সম্পন্ন হয়নি');
      }

      setBuySuccess(data.message || 'প্যাকেজ সফলভাবে ক্রয় করা হয়েছে!');
      if (data.user) {
        setBalanceBdt(data.user.balanceBdt || 0);
        setBalanceUsd(data.user.balanceUsd || 0);
        if (onUserUpdated) onUserUpdated(data.user);
        localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
      }
      fetchUserStatus();
      setTimeout(() => {
        setBuyingPlan(null);
        setBuySuccess(null);
      }, 2500);
    } catch (err: any) {
      setBuyError(err.message || 'ব্যালেন্স দিয়ে প্যাকেজ কেনা সম্ভব হয়নি');
    } finally {
      setBuyLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-start sm:justify-center p-0 sm:p-4 bg-[#050811]/90 backdrop-blur-md animate-in fade-in duration-200 pt-[max(0.35rem,env(safe-area-inset-top))] pb-[max(0.35rem,env(safe-area-inset-bottom))]">
      <div className="bg-[#111927] border-0 sm:border border-[#1f2c42] shadow-2xl rounded-none sm:rounded-3xl max-w-5xl w-full p-4 sm:p-6 text-white relative overflow-hidden h-full sm:h-auto max-h-[100dvh] sm:max-h-[95vh] flex flex-col">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-[#1f2c42] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{lang === 'bn' ? 'হোস্টিং প্যাকেজ ও ওয়ালেট' : 'Hosting Packages & Wallet'}</span>
                <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {lang === 'bn' ? 'ডিপোজিট করুন ও কিনুন' : 'Deposit & Buy'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'bn'
                  ? 'প্রথমে ওয়ালেটে ব্যালেন্স এড করুন, তারপর পছন্দের প্যাকেজে "বাই নাও" ক্লিক করে চালু করুন।'
                  : 'Add balance to your wallet first, then click "Buy Now" on your desired plan.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Wallet & Navigation Tabs Banner */}
        <div className="bg-[#0b1220] border border-[#1f2d48] rounded-2xl p-3.5 sm:p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
          {/* User & Balance Display */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-400 font-semibold">{lang === 'bn' ? 'আপনার ওয়ালেট ব্যালেন্স:' : 'Wallet Balance:'}</span>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-xs border border-emerald-500/40 flex items-center gap-1.5">
                  <span>${balanceUsd.toFixed(2)}</span>
                  <span className="text-[10px] px-1 rounded bg-emerald-500/30 text-emerald-200 uppercase font-black">USDT</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {user ? (
                  <span>
                    {user.name} • {lang === 'bn' ? 'প্লান:' : 'Plan:'}{' '}
                    <strong className="text-emerald-400 uppercase">{user.plan || 'Free'}</strong>
                    {user.planExpiresAt && ` (মেয়াদ: ${new Date(user.planExpiresAt).toLocaleDateString('bn-BD')})`}
                  </span>
                ) : (
                  <span className="text-amber-400 font-medium">ডিপোজিট বা প্যাকেজ কিনতে প্রথমে লগইন করুন</span>
                )}
              </p>
            </div>
          </div>

          {/* Action Navigation Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('plans')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'plans'
                  ? 'bg-[#0088cc] text-white shadow-md shadow-[#0088cc]/20'
                  : 'bg-[#131f33] text-slate-300 hover:text-white hover:bg-[#1a2942]'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'সব প্যাকেজ' : 'All Plans'}</span>
            </button>

            <button
              onClick={() => setActiveView('deposit')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'deposit'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/60'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{lang === 'bn' ? 'ডিপোজিট করুন' : 'Deposit Money'}</span>
            </button>

            <button
              onClick={() => setActiveView('history')}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'history'
                  ? 'bg-[#1e2d48] text-white'
                  : 'bg-[#131f33] text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'লেনদেন হিস্টোরি' : 'History'}</span>
              {allRequests.filter((r) => r.status === 'pending').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              )}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto space-y-6 pr-1 flex-1">
          
          {/* VIEW 1: SERIALIZED PLANS LIST (Free -> 1 Month -> 3 Months -> 6 Months -> 1 Year) */}
          {activeView === 'plans' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>{lang === 'bn' ? 'হোস্টিং প্যাকেজসমূহ (সিরিয়াল অনুযায়ী)' : 'Sequential Hosting Packages'}</span>
                </h4>
                <span className="text-[11px] text-slate-400">
                  {lang === 'bn' ? 'প্যাকেজ বাছাই করে সরাসরি "বাই নাও" ক্লিক করুন' : 'Choose plan and click Buy Now'}
                </span>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {/* 1-Month Free Trial Card (Visible ONLY for users who haven't claimed it yet) */}
                {(!user || !user.hasClaimedFreeTrial) && (freeTrial ? freeTrial.enabled : true) && (
                  <div className="relative rounded-2xl p-4 transition-all border flex flex-col justify-between bg-gradient-to-b from-emerald-950/40 via-teal-950/20 to-[#0d1524] border-emerald-500 shadow-lg shadow-emerald-500/10">
                    <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md">
                      {lang === 'bn' ? '🎁 ১ মাস ফ্রি' : '🎁 1 Month Free'}
                    </span>

                    <div>
                      {/* Plan Header */}
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-extrabold text-base text-white">
                          {lang === 'bn' ? (freeTrial?.nameBn || '১ মাস ফ্রি ট্রায়াল') : (freeTrial?.nameEn || '1 Month Free Trial')}
                        </h5>
                        <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/15">
                          {lang === 'bn' ? 'নতুন ইউজার' : 'New User'}
                        </span>
                      </div>

                      {/* Price Display */}
                      <div className="mb-3">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-emerald-400">$0.00 / Free</span>
                          <span className="text-xs text-slate-400 font-medium">({freeTrial?.durationDays || 30} {lang === 'bn' ? 'দিন' : 'days'})</span>
                        </div>
                        <p className="text-[11px] text-emerald-400/90 font-medium mt-0.5">
                          {lang === 'bn' ? '১টি বট ২৪/৭ সার্বক্ষণিক লাইভ হোস্টিং' : '1 Bot 24/7 Live Hosting'}
                        </p>
                      </div>

                      {/* Features */}
                      <ul className="space-y-1.5 mb-4 border-t border-[#1f2d48] pt-2.5 text-xs text-slate-300">
                        {(lang === 'bn'
                          ? (freeTrial?.featuresBn || [
                              '১টি টেলিগ্রাম বট ২৪/৭ লাইভ হোস্টিং',
                              '১ মাস সম্পূর্ণ ফ্রি অ্যাক্সেস',
                              'অটো-রিস্টার্ট ওয়াচডগ ও রিয়েল-টাইম লগস'
                            ])
                          : (freeTrial?.featuresEn || [
                              '1 Telegram Bot 24/7 Live Hosting',
                              '1 Month Completely Free Access',
                              'Auto-Restart Watchdog & Real-time Logs'
                            ])
                        ).slice(0, 3).map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Action */}
                    <div className="pt-2 border-t border-[#1f2d48]">
                      <button
                        onClick={handleClaimFreeTrial}
                        disabled={claimingTrial}
                        className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-md shadow-emerald-500/20 active:scale-98"
                      >
                        {claimingTrial ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>{lang === 'bn' ? 'সক্রিয় হচ্ছে...' : 'Activating...'}</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5" />
                            <span>{user ? (lang === 'bn' ? '🎁 ১ মাসের ফ্রি প্ল্যান নিন' : 'Claim 1 Month Free') : (lang === 'bn' ? 'লগইন করে ফ্রি নিন' : 'Login to Claim Free')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {plans.map((p, idx) => {
                  const isFree = p.id === 'free';
                  const isCurrent = user?.plan === p.id;
                  const hasSufficientUsd = balanceUsd >= (p.priceUsd || 0);
                  const hasSufficientBdt = balanceBdt >= (p.priceBdt || 0);

                  return (
                    <div
                      key={p.id}
                      className={`relative rounded-2xl p-4 transition-all border flex flex-col justify-between ${
                        p.popular
                          ? 'bg-gradient-to-b from-[#16233b] to-[#0e1726] border-pink-500/50 shadow-lg shadow-pink-500/5 ring-1 ring-pink-500/30'
                          : isCurrent
                          ? 'bg-[#102035] border-emerald-500/50 shadow-md'
                          : 'bg-[#0d1524] border-[#1f2d48] hover:border-slate-600 hover:bg-[#111c2e]'
                      }`}
                    >
                      {p.popular && (
                        <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md">
                          {lang === 'bn' ? '⭐ বেস্ট চয়েস' : '⭐ Best Value'}
                        </span>
                      )}

                      {isCurrent && (
                        <span className="absolute -top-2.5 left-4 bg-emerald-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md">
                          {lang === 'bn' ? 'বর্তমান প্যাকেজ' : 'Current Active'}
                        </span>
                      )}

                      <div>
                        {/* Plan Header */}
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-extrabold text-base text-white">{lang === 'bn' ? p.nameBn : p.nameEn}</h5>
                          <span className="text-[11px] text-slate-400 font-bold">
                            #{idx + 1}
                          </span>
                        </div>

                        {/* Price Display */}
                        <div className="mb-3">
                          {isFree ? (
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-2xl font-black text-emerald-400">$0 / Free</span>
                              <span className="text-xs text-slate-400 font-medium">লাইফটাইম</span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-2xl font-black text-white">${p.priceUsd}</span>
                                <span className="text-xs font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30 uppercase">
                                  USDT
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 font-medium">
                                {p.durationDays} {lang === 'bn' ? 'দিন সার্বক্ষণিক মেয়াদ' : 'Days Hosting'}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Bot Capacity Badge */}
                        <div className="p-2.5 rounded-xl bg-[#090f1a] border border-[#1a2538] mb-3 text-xs flex items-center justify-between">
                          <span className="text-slate-300">{lang === 'bn' ? 'হোস্টিং সক্ষমতা:' : 'Capacity:'}</span>
                          <span className="text-[#0088cc] font-extrabold text-xs">
                            {p.maxBots === 999 ? (lang === 'bn' ? 'আনলিমিটেড বট' : 'Unlimited Bots') : `${p.maxBots}টি সক্রিয় বট`}
                          </span>
                        </div>

                        {/* Features */}
                        <ul className="space-y-1.5 text-xs text-slate-300 mb-4">
                          {(lang === 'bn' ? p.featuresBn : p.featuresEn).map((feat, fIdx) => (
                            <li key={fIdx} className="flex items-start gap-2">
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span className="leading-snug text-[11px]">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* BUY NOW BUTTON ON EVERY CARD */}
                      <div className="pt-2 border-t border-[#1a2538]">
                        {isFree ? (
                          <div className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-400 font-bold text-xs text-center">
                            {lang === 'bn' ? '✓ রেজিস্ট্রেশনে ডিফল্ট ফ্রি' : 'Included by Default'}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (!user) {
                                onOpenAuthModal();
                                return;
                              }
                              setBuyingPlan(p);
                              setBuyError(null);
                              setBuySuccess(null);
                              setBuyCurrency('USD');
                            }}
                            className={`w-full py-2.5 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md ${
                              p.popular
                                ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white shadow-pink-500/20'
                                : 'bg-[#0088cc] hover:bg-[#0077b5] text-white shadow-[#0088cc]/20'
                            }`}
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>{lang === 'bn' ? 'বাই নাও (Buy Now)' : 'Buy Now'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 2: DEPOSIT MONEY FORM */}
          {activeView === 'deposit' && (
            <div className="bg-[#0b1220] border border-[#1f2d48] rounded-2xl p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-[#1f2d48] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">
                      {lang === 'bn' ? 'ওয়ালেটে ব্যালেন্স ডিপোজিট করুন' : 'Deposit Funds to Wallet'}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {lang === 'bn'
                        ? 'Binance (USDT) বা বিকাশ, নগদ, রকেটে টাকা পাঠিয়ে TrxID সাবমিট করুন।'
                        : 'Transfer money via Binance (USDT), bKash, Nagad or Rocket and submit TrxID.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveView('plans')}
                  className="text-xs text-[#0088cc] hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <span>{lang === 'bn' ? 'প্যাকেজে ফিরে যান' : 'Back to Plans'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Status messages */}
              {successMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Method Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  {lang === 'bn' ? '১. পেমেন্ট মেথড (USDT):' : '1. Select Deposit Method (USDT):'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDepositMethod('binance')}
                    className="p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 cursor-pointer bg-[#f3ba2f]/15 border-[#f3ba2f] text-[#f3ba2f] ring-2 ring-[#f3ba2f]/30"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#f3ba2f] text-black font-black flex items-center justify-center text-xs">
                        ₮
                      </div>
                      <div className="text-left">
                        <span className="font-extrabold text-sm text-white block">USDT (Binance Pay / TRC20)</span>
                        <span className="text-[10px] text-amber-300 font-semibold">ইনস্ট্যান্ট ভেরিফিকেশন ও ওয়ালেট ব্যালেন্স</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
                      Active
                    </span>
                  </button>
                </div>
              </div>

              {/* Payment Account Details Box */}
              <div className="p-4 rounded-xl bg-[#080d17] border border-[#1f2d48] space-y-3 text-xs">
                <span className="text-[10px] font-bold text-[#0088cc] uppercase tracking-wider">
                  {lang === 'bn' ? 'ডলার (USDT) পাঠানোর Binance একাউন্ট তথ্য:' : 'USDT Payment Account Details:'}
                </span>

                {depositMethod === 'binance' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {paymentSettings?.binanceUid && (
                      <div className="p-2.5 rounded-lg bg-[#0d1627] border border-amber-500/30 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Binance UID (Personal)</p>
                          <p className="font-mono text-amber-400 font-extrabold text-sm select-all">{paymentSettings.binanceUid}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(paymentSettings.binanceUid, 'b_uid')}
                          className="px-2.5 py-1 rounded bg-[#16233b] hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey === 'b_uid' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'b_uid' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}

                    {paymentSettings?.binancePayId && (
                      <div className="p-2.5 rounded-lg bg-[#0d1627] border border-amber-500/30 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Binance Pay ID</p>
                          <p className="font-mono text-amber-400 font-extrabold text-sm select-all">{paymentSettings.binancePayId}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(paymentSettings.binancePayId, 'b_pay')}
                          className="px-2.5 py-1 rounded bg-[#16233b] hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey === 'b_pay' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'b_pay' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}

                    {paymentSettings?.binanceId && (
                      <div className="p-2.5 rounded-lg bg-[#0d1627] border border-amber-500/30 flex items-center justify-between sm:col-span-2">
                        <div className="truncate mr-2">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Binance USDT Address (TRC20)</p>
                          <p className="font-mono text-amber-300 font-semibold text-xs truncate select-all">{paymentSettings.binanceId}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(paymentSettings.binanceId, 'b_wallet')}
                          className="px-2.5 py-1 rounded bg-[#16233b] hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          {copiedKey === 'b_wallet' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'b_wallet' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-[#0d1627] border border-[#1f2d48] flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">
                        {depositMethod === 'bkash' ? 'bKash Personal (Send Money)' : 'Nagad Personal (Send Money)'}
                      </p>
                      <p className="font-mono text-white font-black text-base select-all">
                        {depositMethod === 'bkash'
                          ? paymentSettings?.bkashNumber || '01711223344'
                          : paymentSettings?.nagadNumber || '01811223344'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const num = depositMethod === 'bkash'
                          ? paymentSettings?.bkashNumber || '01711223344'
                          : paymentSettings?.nagadNumber || '01811223344';
                        handleCopy(num, 'bd_num');
                      }}
                      className="px-3 py-1.5 rounded bg-[#16233b] hover:bg-[#0088cc]/20 text-slate-300 hover:text-[#0088cc] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedKey === 'bd_num' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'bd_num' ? 'Copied' : 'Copy Number'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Deposit Form */}
              <form onSubmit={handleSubmitDeposit} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      {lang === 'bn' ? `জমার পরিমাণ (${depositCurrency}):` : `Amount to Deposit (${depositCurrency}):`}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={depositCurrency === 'USD' ? '0.1' : '10'}
                        step="any"
                        value={depositAmount}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder={depositCurrency === 'USD' ? '5.00' : '150'}
                        className="w-full bg-[#090e18] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                        required
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] font-bold text-emerald-400">
                        {depositCurrency}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      {depositMethod === 'binance'
                        ? (lang === 'bn' ? 'আপনার Binance UID / ইমেইল:' : 'Your Binance UID / Email:')
                        : (lang === 'bn' ? 'যে নাম্বার থেকে টাকা পাঠিয়েছেন:' : 'Sender Phone Number:')}
                    </label>
                    <input
                      type="text"
                      value={senderIdentifier}
                      onChange={(e) => setSenderIdentifier(e.target.value)}
                      placeholder={depositMethod === 'binance' ? '849201948' : '017XXXXXXXX'}
                      className="w-full bg-[#090e18] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-emerald-400 mb-1">
                      Transaction ID (TrxID):
                    </label>
                    <input
                      type="text"
                      value={depositTrxId}
                      onChange={(e) => setDepositTrxId(e.target.value)}
                      placeholder="e.g. 9J4K2L8M or 294819284"
                      className="w-full bg-[#090e18] border border-emerald-500/40 rounded-xl p-2.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-emerald-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-400 mb-1">
                      {lang === 'bn' ? 'মন্তব্য (ঐচ্ছিক):' : 'Note (Optional):'}
                    </label>
                    <input
                      type="text"
                      value={depositNote}
                      onChange={(e) => setDepositNote(e.target.value)}
                      placeholder="e.g. For 1 month plan"
                      className="w-full bg-[#090e18] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#0088cc]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
                  <p className="text-[11px] text-slate-400">
                    {lang === 'bn'
                      ? 'এডমিন অনুমোদন করলে আপনার ওয়ালেটে ব্যালেন্স জমা হবে এবং ইমেইল এলার্ট পাবেন।'
                      : 'You will receive an email confirmation once the admin approves your deposit.'}
                  </p>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 cursor-pointer transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{loading ? (lang === 'bn' ? 'জমা হচ্ছে...' : 'Submitting...') : (lang === 'bn' ? 'ডিপোজিট রিকোয়েস্ট জমা দিন' : 'Submit Deposit Request')}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VIEW 3: USER TRANSACTION & REQUEST HISTORY */}
          {activeView === 'history' && (
            <div className="bg-[#0b1220] border border-[#1f2d48] rounded-2xl p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-[#1f2d48] pb-3">
                <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>{lang === 'bn' ? 'আপনার ডিপোজিট ও সাবস্ক্রিপশন হিস্টোরি' : 'Your Deposit & Subscription History'}</span>
                </h4>
                <button
                  type="button"
                  onClick={fetchUserStatus}
                  className="px-2.5 py-1 rounded-lg bg-[#16233b] hover:bg-[#1f2d48] text-slate-300 text-xs flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{lang === 'bn' ? 'রিফ্রেশ' : 'Refresh'}</span>
                </button>
              </div>

              {allRequests.length === 0 ? (
                <div className="text-center py-8 text-slate-400 space-y-2">
                  <Clock className="w-8 h-8 mx-auto text-slate-600" />
                  <p>{lang === 'bn' ? 'আপনার কোনো পূর্ববর্তী রিকোয়েস্ট পাওয়া যায়নি।' : 'No deposit or plan requests found.'}</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {allRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-xl bg-[#0d1524] border border-[#1f2d48] flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-white text-xs">{req.planName}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#0088cc]/20 text-[#0088cc]">
                            {req.amount} {req.currency}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-slate-300">
                            {req.method}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          TrxID: <span className="text-white font-bold">{req.transactionId}</span> • {new Date(req.createdAt).toLocaleString('bn-BD')}
                        </p>
                      </div>

                      <div>
                        {req.status === 'pending' ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[11px] flex items-center gap-1.5 animate-pulse">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{lang === 'bn' ? 'অনুমোদনের অপেক্ষায় (Pending)' : 'Pending Approval'}</span>
                          </span>
                        ) : req.status === 'approved' ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[11px] flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{lang === 'bn' ? 'অনুমোদিত (Approved)' : 'Approved'}</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold text-[11px]">
                            {lang === 'bn' ? 'বাতিলকৃত' : 'Rejected'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL / OVERLAY: BUY NOW WITH WALLET CONFIRMATION */}
        {buyingPlan && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-[#111a2e] border border-[#223352] rounded-3xl max-w-md w-full p-5 text-white shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1f2d48] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold">
                    <Crown className="w-4 h-4" />
                  </div>
                  <h4 className="font-extrabold text-sm text-white">
                    {lang === 'bn' ? 'প্যাকেজ কেনার নিশ্চিতকরণ' : 'Confirm Package Purchase'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setBuyingPlan(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Package Summary */}
              <div className="p-3.5 rounded-xl bg-[#090f1a] border border-[#1a2538] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{buyingPlan.nameBn}</span>
                  <span className="px-2 py-0.5 rounded bg-[#0088cc]/20 text-[#0088cc] font-bold text-[10px]">
                    {buyingPlan.durationDays} দিন মেয়াদ
                  </span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  হোস্টিং সক্ষমতা: <strong className="text-emerald-400">{buyingPlan.maxBots === 999 ? 'আনলিমিটেড' : buyingPlan.maxBots}টি</strong> টেলিগ্রাম বট।
                </p>
              </div>

              {/* Purchase Cost & Balance Summary */}
              <div className="p-3.5 rounded-xl bg-[#090f1a] border border-[#1a2538] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">{lang === 'bn' ? 'প্যাকেজের মূল্য:' : 'Plan Price:'}</span>
                  <span className="text-base font-black text-emerald-400">${buyingPlan.priceUsd} USDT</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                  <span className="text-slate-400">{lang === 'bn' ? 'আপনার বর্তমান ব্যালেন্স:' : 'Your Wallet Balance:'}</span>
                  <span className="font-bold text-white">${balanceUsd.toFixed(2)} USDT</span>
                </div>
              </div>

              {/* Balance Check & Alerts */}
              {buySuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{buySuccess}</span>
                </div>
              )}

              {buyError && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{buyError}</span>
                </div>
              )}

              {/* Insufficient balance trigger */}
              {balanceUsd < (buyingPlan.priceUsd || 0) && (
                <div className="p-3.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{lang === 'bn' ? 'ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই!' : 'Insufficient Wallet Balance!'}</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {lang === 'bn'
                      ? `প্রয়োজন $${buyingPlan.priceUsd} USDT। আপনার আছে $${balanceUsd.toFixed(2)} USDT। প্রথমে ওয়ালেটে ডিপোজিট করুন।`
                      : `Required: $${buyingPlan.priceUsd} USDT. You have $${balanceUsd.toFixed(2)} USDT. Please deposit first.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleStartDepositForPlan(buyingPlan)}
                    className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'USDT ডিপোজিট করুন' : 'Deposit USDT Now'}</span>
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1f2d48]">
                <button
                  type="button"
                  onClick={() => setBuyingPlan(null)}
                  className="px-4 py-2 rounded-xl bg-[#16233b] hover:bg-[#1e2d48] text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>

                <button
                  type="button"
                  disabled={
                    buyLoading ||
                    balanceUsd < (buyingPlan.priceUsd || 0)
                  }
                  onClick={handleBuyWithWallet}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {buyLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  <span>
                    {buyLoading
                      ? (lang === 'bn' ? 'ক্রয় হচ্ছে...' : 'Processing...')
                      : (lang === 'bn' ? 'ব্যালেন্স দিয়ে কিনুন' : 'Confirm Purchase')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
