import React, { useState, useEffect } from 'react';
import {
  Wallet, ShieldCheck, Copy, Check, Clock, CheckCircle2, XCircle,
  AlertCircle, ArrowUpRight, RefreshCw, Sparkles, ExternalLink,
  DollarSign, ArrowRight, ShieldAlert, CreditCard
} from 'lucide-react';
import { AuthUser, PaymentSettings, PlanRequest } from '../types';

interface WalletDepositPageProps {
  user: AuthUser | null;
  onOpenAuthModal: () => void;
  onNavigateToPlans: () => void;
  lang: 'bn' | 'en';
  onUserUpdated?: (user: AuthUser) => void;
}

export const WalletDepositPage: React.FC<WalletDepositPageProps> = ({
  user,
  onOpenAuthModal,
  onNavigateToPlans,
  lang,
  onUserUpdated
}) => {
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    binanceUid: '849201948',
    binancePayId: '849201948',
    binanceId: 'USDT (TRC20): TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
    binanceEnabled: true,
    bkashNumber: '',
    nagadNumber: '',
    instructionsBn: 'বাইন্যান্স (Binance Pay / UID) দিয়ে নির্ধারিত ডলার পাঠিয়ে আপনার Transaction ID / Order ID এবং আপনার প্রেরক আইডি নিচে লিখে সাবমিট করুন। এডমিন অনুমোদন করলেই সাথে সাথে আপনার ওয়ালেটে ব্যালেন্স জমা হবে।',
    instructionsEn: 'Send USDT via Binance Pay / UID, then submit your Binance Transaction ID / Order ID below. Once approved by admin, your balance is credited instantly.'
  });

  const [depositAmount, setDepositAmount] = useState<string>('5.00');
  const [senderIdentifier, setSenderIdentifier] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState<string | null>(null);
  const [depositError, setDepositError] = useState<string | null>(null);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [history, setHistory] = useState<PlanRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Quick preset amounts (corresponding to 1 Month $1.5, 3 Months $4.0, 6 Months $7.5, 1 Year $14.0)
  const presetAmounts = [
    { label: '$1.50 (১ মাস)', val: '1.50' },
    { label: '$4.00 (৩ মাস)', val: '4.00' },
    { label: '$7.50 (৬ মাস)', val: '7.50' },
    { label: '$14.00 (১ বছর)', val: '14.00' },
    { label: '$25.00 (কাস্টম)', val: '25.00' }
  ];

  useEffect(() => {
    fetchPaymentSettings();
    if (user) {
      fetchDepositHistory();
    }
  }, [user]);

  const fetchPaymentSettings = async () => {
    try {
      const res = await fetch('/api/payment-settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setPaymentSettings(data.settings);
      }
    } catch {
      // Use fallback
    }
  };

  const fetchDepositHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/plans/my-request', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const all = data.allRequests || [];
        setHistory(all.filter((r: PlanRequest) => r.type === 'deposit' || r.type === 'plan_purchase'));
      }
    } catch {
      // Ignore
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError(null);
    setDepositSuccess(null);

    if (!user) {
      onOpenAuthModal();
      return;
    }

    const numAmount = parseFloat(depositAmount);
    if (!numAmount || numAmount <= 0) {
      setDepositError(lang === 'bn' ? 'সঠিক পরিমাণ (Amount) লিখুন।' : 'Please enter a valid amount.');
      return;
    }

    if (!senderIdentifier.trim()) {
      setDepositError(lang === 'bn' ? 'আপনার Binance UID বা Pay ID দিন।' : 'Sender Binance UID or Pay ID is required.');
      return;
    }

    if (!transactionId.trim()) {
      setDepositError(lang === 'bn' ? 'Transaction ID / Order ID দিন।' : 'Transaction ID is required.');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: numAmount,
          currency: 'USD',
          method: 'binance',
          senderIdentifier: senderIdentifier.trim(),
          transactionId: transactionId.trim().toUpperCase(),
          note: note.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit deposit');
      }

      setDepositSuccess(
        lang === 'bn'
          ? '🎉 ডিপোজিট রিকোয়েস্ট সফলভাবে জমা হয়েছে! এডমিন ভেরিফাই করে অনুমোদন করলেই আপনার ব্যালেন্সে USD যোগ হবে।'
          : 'Deposit request submitted successfully! Admin will verify and credit your balance shortly.'
      );
      setTransactionId('');
      setNote('');
      fetchDepositHistory();
    } catch (err: any) {
      setDepositError(err.message || 'Error processing deposit');
    } finally {
      setSubmitting(false);
    }
  };

  const hasActivePlan = Boolean(
    user && (user.role === 'admin' || (user.plan && user.plan !== 'free' && user.plan !== 'none' && user.plan !== 'expired' && (!user.planExpiresAt || user.planExpiresAt > Date.now())))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 border border-sky-800/40 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#0088cc]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-300 border border-sky-500/30">
                <Wallet className="w-6 h-6" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {lang === 'bn' ? 'ব্যক্তিগত ওয়ালেট ও ডিপোজিট সিস্টেম' : 'Wallet & Deposit Hub'}
              </h1>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              {lang === 'bn'
                ? 'বাইনান্স (Binance Pay / UID) দিয়ে সরাসরি ডলার ডিপোজিট করুন। আপনার ওয়ালেটে ব্যালেন্স জমা হলে যেকোনো মেয়াদের (১ মাস, ৩ মাস, ৬ মাস বা ১ বছর) হোস্টিং প্লান এক ক্লিকে কিনতে পারবেন।'
                : 'Deposit USD directly via Binance Pay / UID. Once credited, activate any hosting plan instantly with one click.'}
            </p>
          </div>

          {/* User Balance Overview Card */}
          <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 min-w-[260px] space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold border-b border-white/10 pb-2">
              <span>{lang === 'bn' ? 'বর্তমান ওয়ালেট ব্যালেন্স' : 'Wallet Balance'}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                {user ? (lang === 'bn' ? 'সক্রিয় একাউন্ট' : 'Active Account') : (lang === 'bn' ? 'লগইন প্রয়োজন' : 'Guest')}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-emerald-400">
                  ${user ? (user.balanceUsd || 0).toFixed(2) : '0.00'}
                </span>
                <span className="text-sm font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 uppercase">
                  USDT
                </span>
              </div>
            </div>

            {/* Active plan status */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-slate-400">{lang === 'bn' ? 'হোস্টিং প্লান:' : 'Current Plan:'}</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                hasActivePlan ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {hasActivePlan ? (user?.role === 'admin' ? 'এডমিন আনলিমিটেড' : `${user?.plan}`) : (lang === 'bn' ? 'কোনো সক্রিয় প্লান নেই' : 'No Active Plan')}
              </span>
            </div>

            <button
              onClick={onNavigateToPlans}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all hover:scale-[1.01]"
            >
              <span>{lang === 'bn' ? '👑 প্যাকেজ কিনুন / আপগ্রেড করুন' : '👑 Browse & Buy Plans'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Binance Credentials & Instructions, Right = Deposit Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Official Binance Payment Hub (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1f293d] rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-black text-amber-500 text-xl">
                  B
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{lang === 'bn' ? 'বাইনান্স পে / ইউআইডি (Binance Pay / UID)' : 'Binance Pay & UID Hub'}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                      {lang === 'bn' ? 'ইনস্ট্যান্ট ভেরিফাইড' : 'Verified'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {lang === 'bn' ? 'বর্তমানে শুধু বাইন্যান্স এর মাধ্যমে ডিপোজিট গ্রহণ করা হচ্ছে' : 'Direct zero-fee deposits supported via Binance'}
                  </p>
                </div>
              </div>
            </div>

            {/* Credential 1: Binance UID */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0d1524] border border-slate-200 dark:border-[#1f2d48] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'bn' ? 'বাইনান্স ইউআইডি (Binance UID)' : 'Binance UID'}:
                </span>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                  Zero Fee • Instant
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-[#070b14] border border-slate-300 dark:border-slate-700 font-mono text-sm sm:text-base font-bold text-slate-900 dark:text-emerald-400 tracking-wider">
                  {paymentSettings.binanceUid || '849201948'}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(paymentSettings.binanceUid || '849201948', 'uid')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                    copiedField === 'uid'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#0088cc] hover:bg-[#0077b5] text-white'
                  }`}
                >
                  {copiedField === 'uid' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{lang === 'bn' ? 'কপি হয়েছে' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>{lang === 'bn' ? 'কপি করুন' : 'Copy'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Credential 2: Binance Pay ID */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0d1524] border border-slate-200 dark:border-[#1f2d48] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'bn' ? 'বাইনান্স পে আইডি (Binance Pay ID)' : 'Binance Pay ID'}:
                </span>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                  Binance Pay App
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-[#070b14] border border-slate-300 dark:border-slate-700 font-mono text-sm sm:text-base font-bold text-slate-900 dark:text-emerald-400 tracking-wider">
                  {paymentSettings.binancePayId || '849201948'}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(paymentSettings.binancePayId || '849201948', 'payId')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                    copiedField === 'payId'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#0088cc] hover:bg-[#0077b5] text-white'
                  }`}
                >
                  {copiedField === 'payId' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{lang === 'bn' ? 'কপি হয়েছে' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>{lang === 'bn' ? 'কপি করুন' : 'Copy'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Credential 3: USDT Address (TRC20) */}
            {paymentSettings.binanceId && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0d1524] border border-slate-200 dark:border-[#1f2d48] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {lang === 'bn' ? 'ইউএসডিটি অ্যাড্রেস (USDT TRC20)' : 'USDT TRC20 Address'}:
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    TRON (TRC20)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={paymentSettings.binanceId}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-[#070b14] border border-slate-300 dark:border-slate-700 font-mono text-xs font-semibold text-slate-900 dark:text-slate-300 truncate"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(paymentSettings.binanceId, 'trc20')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                      copiedField === 'trc20'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                    }`}
                  >
                    {copiedField === 'trc20' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedField === 'trc20' ? (lang === 'bn' ? 'কপি' : 'Done') : (lang === 'bn' ? 'কপি' : 'Copy')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step-by-Step Deposit Guide */}
            <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 space-y-3">
              <h4 className="font-bold text-xs text-sky-900 dark:text-sky-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>{lang === 'bn' ? 'ডিপোজিট করার সহজ ৪টি ধাপ:' : 'How to Deposit in 4 Easy Steps:'}</span>
              </h4>
              <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 pl-4 list-decimal">
                <li>
                  {lang === 'bn'
                    ? 'আপনার Binance অ্যাপ ওপেন করুন এবং Pay অপশন বা Send অপশনে যান।'
                    : 'Open Binance App and navigate to Pay or Funding Wallet.'}
                </li>
                <li>
                  {lang === 'bn'
                    ? 'উপরের Binance UID অথবা Pay ID দিয়ে কাঙ্ক্ষিত পরিমাণ ডলার (USDT) সেন্ড করুন।'
                    : 'Send desired USDT to the UID or Pay ID provided above.'}
                </li>
                <li>
                  {lang === 'bn'
                    ? 'পেমেন্ট সম্পন্ন হওয়ার পর প্রাপ্ত Order ID / Transaction ID (TrxID) কপি করুন।'
                    : 'Copy the completed Order ID / Transaction ID (TrxID).'}
                </li>
                <li>
                  {lang === 'bn'
                    ? 'ডানপাশের ফর্মে আপনার UID, TrxID ও ডলার পরিমাণ লিখে সাবমিট বাটনে চাপুন।'
                    : 'Fill out the form on the right and submit for instant verification.'}
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* Right Column: Deposit Submission Form (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1f293d] rounded-3xl p-6 shadow-sm space-y-5">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                <span>{lang === 'bn' ? 'ডিপোজিট রিকোয়েস্ট ফর্ম' : 'Submit Deposit Request'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'bn'
                  ? 'ডলার পাঠানোর পর সঠিক তথ্য দিয়ে সাবমিট করুন'
                  : 'Submit your payment details after sending USD'}
              </p>
            </div>

            {/* Notification messages */}
            {depositSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">{depositSuccess}</p>
                  <button
                    type="button"
                    onClick={onNavigateToPlans}
                    className="mt-1 text-xs text-emerald-700 dark:text-emerald-300 underline font-extrabold cursor-pointer"
                  >
                    {lang === 'bn' ? 'হোস্টিং প্যাকেজ পেজে যান →' : 'Go to Hosting Plans →'}
                  </button>
                </div>
              </div>
            )}

            {depositError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <p className="font-semibold">{depositError}</p>
              </div>
            )}

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              {/* Quick Amount Selectors */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'bn' ? 'ডিপোজিট পরিমাণ নির্বাচন করুন (USD):' : 'Select Deposit Amount (USD):'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {presetAmounts.map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setDepositAmount(preset.val)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                        depositAmount === preset.val
                          ? 'bg-[#0088cc] border-[#0088cc] text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-[#0d1627] border-slate-200 dark:border-[#1f2d48] text-slate-700 dark:text-slate-300 hover:border-[#0088cc]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount Input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'bn' ? 'ডলার পরিমাণ ($ USD):' : 'Amount ($ USD):'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={depositAmount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="e.g. 5.00"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0d1627] border border-slate-200 dark:border-[#1f2d48] text-sm font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0088cc]"
                    required
                  />
                </div>
              </div>

              {/* Sender Identifier */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'bn' ? 'আপনার Binance UID বা Pay ID:' : 'Your Binance UID or Pay ID:'}
                </label>
                <input
                  type="text"
                  value={senderIdentifier}
                  onChange={(e) => setSenderIdentifier(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: 849201948' : 'e.g. 849201948'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0d1627] border border-slate-200 dark:border-[#1f2d48] text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0088cc]"
                  required
                />
              </div>

              {/* Transaction ID */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'bn' ? 'Transaction ID / Order ID (TrxID):' : 'Transaction ID / Order ID:'}
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder={lang === 'bn' ? 'বাইন্যান্স থেকে প্রাপ্ত TrxID' : 'e.g. 219840291083'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0d1627] border border-slate-200 dark:border-[#1f2d48] text-xs font-mono uppercase text-slate-900 dark:text-emerald-400 focus:outline-hidden focus:border-[#0088cc]"
                  required
                />
              </div>

              {/* Optional Note */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'bn' ? 'নোট (ঐচ্ছিক):' : 'Note (Optional):'}
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: ৩ মাসের প্যাকেজ কেনার জন্য' : 'e.g. Depositing for 3 months plan'}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0d1627] border border-slate-200 dark:border-[#1f2d48] text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0088cc]"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#0088cc] to-sky-600 hover:from-[#0077b5] hover:to-sky-500 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-sky-500/20 cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{lang === 'bn' ? 'জমা দেওয়া হচ্ছে...' : 'Submitting...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{lang === 'bn' ? 'ডিপোজিট রিকোয়েস্ট সাবমিট করুন' : 'Submit Deposit Request'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Transaction / Deposit History */}
      <div className="bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1f293d] rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#0088cc]" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              {lang === 'bn' ? 'আপনার ডিপোজিট ও পেমেন্ট হিস্ট্রি' : 'Deposit & Transaction History'}
            </h3>
          </div>
          <button
            type="button"
            onClick={fetchDepositHistory}
            disabled={loadingHistory}
            className="text-xs text-[#0088cc] hover:underline font-bold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
            <span>{lang === 'bn' ? 'রিফ্রেশ' : 'Refresh'}</span>
          </button>
        </div>

        {!user ? (
          <div className="py-8 text-center space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'bn' ? 'আপনার ডিপোজিট হিস্ট্রি দেখতে লগইন করুন।' : 'Please login to view your deposit history.'}
            </p>
            <button
              onClick={onOpenAuthModal}
              className="px-4 py-2 rounded-xl bg-[#0088cc] text-white text-xs font-bold cursor-pointer"
            >
              {lang === 'bn' ? 'লগইন করুন' : 'Login'}
            </button>
          </div>
        ) : history.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            {loadingHistory
              ? (lang === 'bn' ? 'ডাটা লোড হচ্ছে...' : 'Loading history...')
              : (lang === 'bn' ? 'এখনো কোনো ডিপোজিট রেকর্ড পাওয়া যায়নি।' : 'No deposit records found yet.')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">{lang === 'bn' ? 'তারিখ' : 'Date'}</th>
                  <th className="py-2.5 px-3">{lang === 'bn' ? 'ধরণ' : 'Type'}</th>
                  <th className="py-2.5 px-3">{lang === 'bn' ? 'মেথড' : 'Method'}</th>
                  <th className="py-2.5 px-3">{lang === 'bn' ? 'পরিমাণ' : 'Amount'}</th>
                  <th className="py-2.5 px-3">TrxID / UID</th>
                  <th className="py-2.5 px-3 text-right">{lang === 'bn' ? 'স্ট্যাটাস' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {history.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                      {new Date(req.createdAt).toLocaleDateString()} {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                      {req.planName || (req.type === 'deposit' ? 'Wallet Deposit' : 'Plan Purchase')}
                    </td>
                    <td className="py-3 px-3 uppercase font-bold text-amber-500">
                      {req.method || 'Binance'}
                    </td>
                    <td className="py-3 px-3 font-extrabold text-emerald-600 dark:text-emerald-400">
                      ${req.amount} {req.currency || 'USD'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                      {req.transactionId}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {req.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-[10px]">
                          <Clock className="w-3 h-3 animate-spin" />
                          <span>{lang === 'bn' ? 'অপেক্ষমান' : 'Pending'}</span>
                        </span>
                      ) : req.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{lang === 'bn' ? 'অনুমোদিত' : 'Approved'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold text-[10px]">
                          <XCircle className="w-3 h-3" />
                          <span>{lang === 'bn' ? 'বাতিল' : 'Rejected'}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
