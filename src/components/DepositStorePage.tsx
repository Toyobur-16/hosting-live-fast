import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Sparkles,
  Copy,
  Check,
  Smartphone,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  CreditCard,
  Coins,
  History,
  Gift,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthUser, PaymentSettings } from '../types';
import { playDepositSuccessSound } from '../utils/audioAlert';

interface DepositStorePageProps {
  user: AuthUser | null;
  onOpenAuthModal: () => void;
  onNavigateToPlans: () => void;
  onUserUpdated?: (user: AuthUser) => void;
  lang?: 'bn' | 'en';
}

interface StorePackage {
  id: string;
  usd: number;
  bdt: number;
  bonusPercent: number;
  bonusUsd: number;
  tag?: string;
  popular?: boolean;
  bestValue?: boolean;
  descriptionBn: string;
}

const STORE_PACKAGES: StorePackage[] = [
  {
    id: 'pack_1',
    usd: 1,
    bdt: 120,
    bonusPercent: 0,
    bonusUsd: 0,
    tag: 'স্টার্টার',
    descriptionBn: '১টি বট হোস্টিং অথবা টেস্টের জন্য আদর্শ'
  },
  {
    id: 'pack_2',
    usd: 2,
    bdt: 240,
    bonusPercent: 0,
    bonusUsd: 0,
    tag: 'স্ট্যান্ডার্ড',
    descriptionBn: 'বেসিক হোস্টিং ও সম্পূর্ণ রিয়েলটাইম কনসোল'
  },
  {
    id: 'pack_5',
    usd: 5,
    bdt: 600,
    bonusPercent: 5,
    bonusUsd: 0.25,
    popular: true,
    tag: 'সবচেয়ে জনপ্রিয়',
    descriptionBn: 'বোনাস সহ $5.25 ব্যালেন্স যোগ হবে'
  },
  {
    id: 'pack_10',
    usd: 10,
    bdt: 1200,
    bonusPercent: 10,
    bonusUsd: 1.0,
    tag: 'প্রো প্যাক',
    descriptionBn: 'বোনাস সহ $11.00 ব্যালেন্স যোগ হবে'
  },
  {
    id: 'pack_20',
    usd: 20,
    bdt: 2400,
    bonusPercent: 15,
    bonusUsd: 3.0,
    bestValue: true,
    tag: 'ভিআইপি ডিল',
    descriptionBn: 'বোনাস সহ $23.00 ব্যালেন্স যোগ হবে'
  },
  {
    id: 'pack_50',
    usd: 50,
    bdt: 6000,
    bonusPercent: 20,
    bonusUsd: 10.0,
    tag: 'এন্টারপ্রাইজ',
    descriptionBn: 'বোনাস সহ $60.00 ব্যালেন্স যোগ হবে'
  }
];

/**
 * High-Definition Brand Logo Components
 */
export const BkashLogo = ({ className = "w-11 h-11" }: { className?: string }) => (
  <div className={`${className} rounded-2xl bg-[#E2136E] flex items-center justify-center p-2 shadow-lg shadow-[#E2136E]/25 shrink-0`}>
    <svg viewBox="0 0 100 100" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <polygon points="50,15 85,38 72,65 50,45" fill="white" opacity="0.95" />
      <polygon points="15,48 50,15 50,45 32,68" fill="white" opacity="0.9" />
      <polygon points="50,45 72,65 50,85" fill="white" opacity="0.8" />
      <polygon points="32,68 50,45 50,85" fill="white" opacity="0.75" />
      <polygon points="50,15 62,5 72,25" fill="white" opacity="0.95" />
    </svg>
  </div>
);

export const NagadLogo = ({ className = "w-11 h-11" }: { className?: string }) => (
  <div className={`${className} rounded-2xl bg-gradient-to-tr from-[#D9381E] via-[#F15A24] to-[#F7931E] flex items-center justify-center p-2 shadow-lg shadow-[#F15A24]/25 shrink-0`}>
    <svg viewBox="0 0 100 100" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 10C36 28 28 44 28 60C28 75 39 88 54 88C69 88 80 75 75 56C73 46 64 39 64 39C64 39 68 47 64 56C60 64 49 65 45 56C41 46 47 35 50 10Z" fill="white" />
      <circle cx="53" cy="62" r="7" fill="#F7931E" opacity="0.9" />
    </svg>
  </div>
);

export const BinanceLogo = ({ className = "w-11 h-11" }: { className?: string }) => (
  <div className={`${className} rounded-2xl bg-[#F3BA2F] flex items-center justify-center p-2 shadow-lg shadow-[#F3BA2F]/25 shrink-0 text-slate-950 font-black`}>
    <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <polygon points="50,16 62,28 50,40 38,28" />
      <polygon points="76,40 88,52 76,64 64,52" />
      <polygon points="24,40 36,52 24,64 12,52" />
      <polygon points="50,64 62,76 50,88 38,76" />
      <polygon points="50,46 56,52 50,58 44,52" />
    </svg>
  </div>
);

export function DepositStorePage({
  user,
  onOpenAuthModal,
  onUserUpdated
}: DepositStorePageProps) {
  const [selectedPackageId, setSelectedPackageId] = useState<string>('pack_1');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    binanceUid: '922593999',
    binancePayId: '922593999',
    binanceId: '922593999',
    binanceBscAddress: '0xadf20566382613a481f39f62cd50b872314db1d3',
    binanceEnabled: true,
    binancePayApiEnabled: true,
    bkashNumber: '01614572747',
    bkashEnabled: true,
    nagadNumber: '01304104492',
    nagadEnabled: true,
    customMethods: []
  });

  const [selectedGateway, setSelectedGateway] = useState<string>('bkash');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [orderId, setOrderId] = useState<string>(() => Math.floor(1000000000 + Math.random() * 9000000000).toString());

  // Form Submission
  const [senderIdentifier, setSenderIdentifier] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);
  const [manualMessage, setManualMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Success Confirmation Modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedReceipt, setSubmittedReceipt] = useState<{ orderId: string; amount: number; method: string; trxId: string } | null>(null);

  // Auto-sync & User Balance
  const [isSyncing, setIsSyncing] = useState(false);

  // Deposit History
  const [myDeposits, setMyDeposits] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'store' | 'history'>('store');

  const BDT_RATE = 120; // 1 USDT = 120 BDT

  // Calculate active final amount
  const activeAmountUsd = useMemo(() => {
    if (isCustom) {
      const val = parseFloat(customAmount);
      return isNaN(val) || val <= 0 ? 0 : val;
    }
    const pack = STORE_PACKAGES.find((p) => p.id === selectedPackageId);
    return pack ? pack.usd : 1;
  }, [isCustom, customAmount, selectedPackageId]);

  const activeAmountBdt = Math.round(activeAmountUsd * BDT_RATE);

  const activeBonusUsd = useMemo(() => {
    if (isCustom) {
      if (activeAmountUsd >= 50) return Math.round(activeAmountUsd * 0.2 * 100) / 100;
      if (activeAmountUsd >= 20) return Math.round(activeAmountUsd * 0.15 * 100) / 100;
      if (activeAmountUsd >= 10) return Math.round(activeAmountUsd * 0.1 * 100) / 100;
      if (activeAmountUsd >= 5) return Math.round(activeAmountUsd * 0.05 * 100) / 100;
      return 0;
    }
    const pack = STORE_PACKAGES.find((p) => p.id === selectedPackageId);
    return pack ? pack.bonusUsd : 0;
  }, [isCustom, activeAmountUsd, selectedPackageId]);

  // Selected Custom Method
  const selectedCustom = paymentSettings.customMethods?.find((cm) => cm.id === selectedGateway);

  // Method details helper
  const methodDetails = useMemo(() => {
    if (selectedGateway === 'binance') {
      return {
        name: 'Binance Pay',
        checkoutTitle: 'Binance Pay Checkout',
        accountLabel: 'Binance Pay ID:',
        accountValue: paymentSettings.binancePayId || paymentSettings.binanceUid || '922593999',
        notice: 'Binance Pay ID তে সেন্ড করুন অথবা QR স্ক্যান করুন',
        hasQr: true,
        qrImageUrl: paymentSettings.binanceQrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://app.binance.com/qr/dop?id=${paymentSettings.binancePayId || '922593999'}`,
        appButtonText: 'Binance অ্যাপে ওপেন করুন',
        appUrl: `binance://payment/pay?merchantId=${paymentSettings.binancePayId || '922593999'}&amount=${activeAmountUsd}`,
        placeholder: 'e.g.  2938491829...',
        trxLabel: 'পেমেন্ট শেষ হলে Binance Order ID / TrxID দিন:'
      };
    }
    if (selectedGateway === 'bkash') {
      return {
        name: 'bKash (বিকাশ)',
        checkoutTitle: 'bKash Checkout',
        accountLabel: 'বিকাশ পার্সোনাল নম্বর (Send Money):',
        accountValue: paymentSettings.bkashNumber || '01614572747',
        notice: 'বিকাশ পার্সোনাল নাম্বারে Send Money করুন',
        hasQr: false, // QR strictly disabled for bKash
        appButtonText: 'বিকাশ অ্যাপে ওপেন করুন',
        appUrl: 'bkash://',
        placeholder: 'e.g.  BLX9827361...',
        trxLabel: 'পেমেন্ট শেষ হলে বিকাশ TrxID / ট্রানজেকশন আইডি দিন:'
      };
    }
    if (selectedGateway === 'nagad') {
      return {
        name: 'Nagad (নগদ)',
        checkoutTitle: 'Nagad Checkout',
        accountLabel: 'নগদ পার্সোনাল নম্বর (Send Money):',
        accountValue: paymentSettings.nagadNumber || '01304104492',
        notice: 'নগদ পার্সোনাল নাম্বারে Send Money করুন',
        hasQr: false, // QR strictly disabled for Nagad
        appButtonText: 'নগদ অ্যাপে ওপেন করুন',
        appUrl: 'nagad://',
        placeholder: 'e.g.  9JKA8721...',
        trxLabel: 'পেমেন্ট শেষ হলে নগদ TrxID / ট্রানজেকশন আইডি দিন:'
      };
    }
    return {
      name: selectedCustom?.name || 'Custom Pay',
      checkoutTitle: `${selectedCustom?.name || 'Custom'} Checkout`,
      accountLabel: 'একাউন্ট নম্বর / তথ্য:',
      accountValue: selectedCustom?.account || '',
      notice: selectedCustom?.instructions || 'উল্লেখিত একাউন্টে Send Money করুন',
      hasQr: false, // QR disabled for custom methods
      appButtonText: `${selectedCustom?.name || 'পেমেন্ট'} অ্যাপে ওপেন করুন`,
      appUrl: '',
      placeholder: 'e.g.  TrxID বা লেনদেন নম্বর...',
      trxLabel: 'পেমেন্ট শেষ হলে TrxID / ট্রানজেকশন আইডি দিন:'
    };
  }, [selectedGateway, paymentSettings, selectedCustom, activeAmountUsd]);

  // Fetch payment settings
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/payment-settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setPaymentSettings(data.settings);
        }
      }
    } catch {}
  };

  // Fetch deposits history
  const fetchMyDeposits = async () => {
    const token = localStorage.getItem('bot_auth_token');
    if (!token) return;
    try {
      const res = await fetch('/api/wallet/my-deposits', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyDeposits(data.deposits || []);
        if (user && data.balanceUsd !== undefined && onUserUpdated) {
          if (data.balanceUsd !== user.balanceUsd) {
            onUserUpdated({
              ...user,
              balanceUsd: data.balanceUsd,
              balanceBdt: data.balanceBdt
            });
          }
        }
      }
    } catch {}
  };

  // Auto-sync user balance
  const handleAutoSync = async (silent = false) => {
    const token = localStorage.getItem('bot_auth_token');
    if (!token || !user) return;
    if (!silent) setIsSyncing(true);
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user && onUserUpdated) {
          onUserUpdated(data.user);
        }
      }
      await fetchMyDeposits();
    } catch {} finally {
      if (!silent) setTimeout(() => setIsSyncing(false), 400);
    }
  };

  useEffect(() => {
    fetchSettings();
    if (user) {
      handleAutoSync(true);
    }
  }, [user?.id]);

  // Copy helper
  const handleCopy = (text: string, fieldId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Submit Deposit
  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuthModal();
      return;
    }
    if (!transactionId.trim()) {
      setManualMessage({ type: 'error', text: 'অনুগ্রহ করে Transaction ID (TrxID) লিখুন।' });
      return;
    }
    if (selectedGateway !== 'binance' && !senderIdentifier.trim()) {
      setManualMessage({ type: 'error', text: 'যে নাম্বার থেকে টাকা পাঠিয়েছেন তা লিখুন।' });
      return;
    }
    if (activeAmountUsd <= 0) {
      setManualMessage({ type: 'error', text: 'সঠিক পরিমাণ নির্ধারণ করুন।' });
      return;
    }

    try {
      setSubmittingManual(true);
      setManualMessage(null);
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: activeAmountUsd,
          currency: 'USD',
          method: selectedGateway,
          senderIdentifier: senderIdentifier.trim() || 'Binance User',
          transactionId: transactionId.trim(),
          orderId: orderId,
          note: `ডিপোজিট স্টোর প্যাকেজ ($${activeAmountUsd} USDT / ৳${activeAmountBdt} BDT)`
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        playDepositSuccessSound();
        setSubmittedReceipt({
          orderId: orderId,
          amount: activeAmountUsd,
          method: methodDetails.name,
          trxId: transactionId.trim()
        });
        setShowSuccessModal(true);
        setShowCheckoutModal(false);
        setTransactionId('');
        setSenderIdentifier('');
        setManualMessage(null);
        // Generate fresh order ID for next payment
        setOrderId(Math.floor(1000000000 + Math.random() * 9000000000).toString());
        handleAutoSync(true);
      } else {
        setManualMessage({ type: 'error', text: data.error || 'সাবমিট ব্যর্থ হয়েছে।' });
      }
    } catch (err: any) {
      setManualMessage({ type: 'error', text: err.message || 'নেটওয়ার্ক এরর' });
    } finally {
      setSubmittingManual(false);
    }
  };

  /**
   * EXACT CHECKOUT CARD LAYOUT
   * As specified in user's reference screenshot:
   * Header -> Amount -> Account Number -> App Button -> QR Code (ONLY Binance) -> TrxID Input -> Confirm Button
   */
  const renderCheckoutCard = (isModal = false) => (
    <div className={`w-full bg-[#0a1122] border border-[#1b2b46] rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4 ${isModal ? 'max-w-lg' : ''}`}>
      {/* 1. Header with Circular Icon, Title, Order ID and optional Close button */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-[#16233b]">
        <div className="flex items-center gap-3">
          {selectedGateway === 'bkash' ? (
            paymentSettings.bkashLogoUrl ? (
              <img src={paymentSettings.bkashLogoUrl} alt="bKash" className="w-12 h-12 rounded-2xl object-cover shadow-lg shadow-[#E2136E]/20 shrink-0" />
            ) : (
              <BkashLogo className="w-12 h-12" />
            )
          ) : selectedGateway === 'nagad' ? (
            paymentSettings.nagadLogoUrl ? (
              <img src={paymentSettings.nagadLogoUrl} alt="Nagad" className="w-12 h-12 rounded-2xl object-cover shadow-lg shadow-[#F15A24]/20 shrink-0" />
            ) : (
              <NagadLogo className="w-12 h-12" />
            )
          ) : selectedGateway === 'binance' ? (
            <BinanceLogo className="w-12 h-12" />
          ) : selectedCustom?.imageUrl ? (
            <img src={selectedCustom.imageUrl} alt={selectedCustom.name} className="w-12 h-12 rounded-2xl object-cover border border-emerald-400/40 shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm border border-emerald-500/40 shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
          )}

          <div>
            <h3 className="text-base sm:text-lg font-black text-white leading-tight">
              {methodDetails.checkoutTitle}
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Order: #{orderId}
            </span>
          </div>
        </div>

        {isModal && (
          <button
            type="button"
            onClick={() => setShowCheckoutModal(false)}
            className="w-8 h-8 rounded-full bg-[#142036] hover:bg-[#1f2f4e] text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Amount Box */}
      <div className="p-4 rounded-2xl bg-[#060a14] border border-[#17253d] space-y-2">
        <div className="text-xs font-semibold text-slate-300">
          পরিশোধযোগ্য পরিমাণ:
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-wide">
            {selectedGateway === 'binance' ? (
              <span>${activeAmountUsd}  USDT</span>
            ) : (
              <span>৳{activeAmountBdt} BDT <span className="text-sm text-slate-400 font-normal">(${activeAmountUsd} USDT)</span></span>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleCopy(selectedGateway === 'binance' ? activeAmountUsd.toString() : activeAmountBdt.toString(), 'amt')}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            {copiedField === 'amt' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedField === 'amt' ? 'কপি হয়েছে' : 'কপি'}</span>
          </button>
        </div>
        <div className="text-xs text-slate-300 font-medium flex items-center gap-1.5 pt-0.5">
          <span className="text-amber-400">🟡</span>
          <span>{methodDetails.notice}</span>
        </div>
      </div>

      {/* 3. Account Number / Pay ID Box */}
      <div className="p-4 rounded-2xl bg-[#060a14] border border-[#17253d] space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-400">
            {methodDetails.accountLabel}
          </span>
          <button
            type="button"
            onClick={() => handleCopy(methodDetails.accountValue, 'accNum')}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            {copiedField === 'accNum' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedField === 'accNum' ? 'কপি হয়েছে' : 'কপি'}</span>
          </button>
        </div>
        <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono tracking-wider break-all">
          {methodDetails.accountValue}
        </div>
      </div>

      {/* 4. Action Button: Open App */}
      {methodDetails.appUrl ? (
        <a
          href={methodDetails.appUrl}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
        >
          <ExternalLink className="w-4 h-4 stroke-[2.5]" />
          <span>{methodDetails.appButtonText}</span>
        </a>
      ) : (
        <div className="text-center text-xs text-slate-400 py-1">
          উপরের নাম্বারে উল্লেখিত টাকা Send Money করুন।
        </div>
      )}

      {/* 5. QR Code Card - ONLY FOR BINANCE! (Omitted completely for Nagad, bKash, and Custom methods) */}
      {methodDetails.hasQr && methodDetails.qrImageUrl && (
        <div className="p-4 rounded-2xl bg-[#060a14] border border-[#17253d] flex flex-col items-center justify-center text-center space-y-3">
          <div className="p-3 bg-white rounded-2xl shadow-xl border border-amber-400/30 inline-block">
            <img
              src={methodDetails.qrImageUrl}
              alt="Binance QR"
              className="w-40 h-40 sm:w-44 sm:h-44 object-contain"
            />
          </div>
          <p className="text-xs text-slate-300 font-medium max-w-xs leading-relaxed">
            Binance মোবাইল অ্যাপ দিয়ে উপরের QR কোডটি স্ক্যান করেও পে করতে পারেন।
          </p>
        </div>
      )}

      {/* 6. TrxID / Transaction Details Form */}
      <form onSubmit={handleSubmitDeposit} className="space-y-3 pt-2">
        {/* If bKash, Nagad, or Custom: Require Sender Number */}
        {selectedGateway !== 'binance' && (
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              যে নাম্বার থেকে টাকা পাঠিয়েছেন (Sender Number):
            </label>
            <input
              type="text"
              value={senderIdentifier}
              onChange={(e) => setSenderIdentifier(e.target.value)}
              placeholder="e.g. 017XXXXXXXX"
              className="w-full bg-[#050912] border border-[#1a2842] rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">
            {methodDetails.trxLabel}
          </label>
          <input
            type="text"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder={methodDetails.placeholder}
            className="w-full bg-[#050912] border border-[#1a2842] rounded-xl p-3 text-xs text-white font-mono uppercase focus:outline-none focus:border-amber-400"
            required
          />
        </div>

        {manualMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              manualMessage.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}
          >
            {manualMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{manualMessage.text}</span>
          </div>
        )}

        {/* 7. Confirm Button - Exact layout styling */}
        <button
          type="submit"
          disabled={submittingManual}
          className="w-full py-3 rounded-xl bg-[#141b27] hover:bg-amber-400 text-amber-400 hover:text-slate-950 border border-amber-500/40 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
        >
          {submittingManual ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          <span>কনফার্ম</span>
        </button>
      </form>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 px-2 sm:px-4 w-full overflow-x-hidden animate-in fade-in duration-200">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1424] via-[#09101c] to-[#060a12] border border-amber-500/30 p-5 sm:p-7 shadow-2xl shadow-amber-500/5">
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-[#00d293]/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-400" />
              <span>ডিপোজিট স্টোর (Deposit Store)</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              ওয়ালেট <span className="text-amber-400">টপ-আপ ও ডিপোজিট</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              বিকাশ, নগদ, বাইন্যান্স (Binance Pay) বা কাস্টম মেথডে সহজেই ওয়ালেট রিচার্জ করুন।
            </p>
          </div>

          {/* Current Balance Card */}
          <div className="shrink-0 p-4 sm:p-5 rounded-2xl bg-[#0e172a]/90 border border-[#1e2d48] flex flex-col gap-2 min-w-[240px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-amber-400" />
                <span>বর্তমান ওয়ালেট ব্যালেন্স</span>
              </span>
              <button
                type="button"
                onClick={() => handleAutoSync(false)}
                disabled={isSyncing}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-colors"
                title="ব্যালেন্স রিফ্রেশ করুন"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">
                ${Number(user?.balanceUsd || 0).toFixed(2)}
              </span>
              <span className="text-xs font-bold text-amber-400">USDT</span>
            </div>

            <div className="text-xs font-semibold text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2 mt-1">
              <span>সমপরিমাণ টাকা:</span>
              <span className="font-bold text-emerald-400">
                ৳{Math.round(Number(user?.balanceUsd || 0) * BDT_RATE)} BDT
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Store / History) */}
      <div className="flex items-center gap-2 bg-[#090f1d] p-1.5 rounded-2xl border border-[#1a263d]">
        <button
          type="button"
          onClick={() => setActiveTab('store')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'store'
              ? 'bg-amber-400 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-[#111c30]'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>ডিপোজিট ও চেকআউট</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('history');
            fetchMyDeposits();
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-amber-400 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-[#111c30]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>ডিপোজিট হিস্ট্রি</span>
          {myDeposits.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeTab === 'history' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-300'
            }`}>
              {myDeposits.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: STORE PACKAGES & PAYMENT SELECTION */}
      {activeTab === 'store' && (
        <div className="space-y-6">
          {/* Step 1: Packages Section */}
          <div className="p-4 sm:p-6 rounded-3xl bg-[#0a101f] border border-[#1b2940] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-bold">1</span>
                  <span>ডিপোজিট প্যাকেজ সিলেক্ট করুন (Select Package)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  যেকোনো প্যাকেজ পছন্দ করুন অথবা নিজের প্রয়োজনমতো এমাউন্ট লিখুন।
                </p>
              </div>
              <div className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 shrink-0">
                ১ USDT = ১২০ ৳ (BDT)
              </div>
            </div>

            {/* Packages Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {STORE_PACKAGES.map((pkg) => {
                const isSelected = !isCustom && selectedPackageId === pkg.id;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => {
                      setIsCustom(false);
                      setSelectedPackageId(pkg.id);
                    }}
                    className={`relative p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/40 shadow-lg scale-[1.02]'
                        : 'bg-[#0e1628] border-[#1e2f4a] hover:border-amber-400/50'
                    }`}
                  >
                    {pkg.popular && (
                      <span className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[9px] shadow-sm">
                        POPULAR
                      </span>
                    )}
                    {pkg.bestValue && (
                      <span className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black text-[9px] shadow-sm">
                        BEST DEAL
                      </span>
                    )}

                    <div>
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                        {pkg.tag}
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl font-black text-white">${pkg.usd}</span>
                        <span className="text-[10px] text-slate-400">USDT</span>
                      </div>
                      <div className="text-xs font-bold text-emerald-400">
                        ৳{pkg.bdt}
                      </div>
                    </div>

                    {pkg.bonusPercent > 0 && (
                      <div className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 text-center">
                        +{pkg.bonusPercent}% বোনাস
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Amount Option */}
            <div className="pt-2 border-t border-[#1a273e] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="customAmountCheck"
                  checked={isCustom}
                  onChange={(e) => setIsCustom(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <label htmlFor="customAmountCheck" className="text-xs font-bold text-slate-200 cursor-pointer">
                  অন্য কোনো নির্দিষ্ট পরিমাণ ডিপোজিট করতে চান? (Custom Amount)
                </label>
              </div>

              {isCustom && (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400">$</span>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="e.g. 15"
                      className="w-32 bg-[#060a12] border border-amber-500/50 rounded-xl pl-7 pr-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-400">USDT</span>
                  <span className="text-xs font-bold text-emerald-400">
                    (= ৳{Math.round((parseFloat(customAmount) || 0) * BDT_RATE)} BDT)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Payment Gateways Section (REFINED CLEAN CARD-BASED LAYOUT) */}
          <div className="p-4 sm:p-6 rounded-3xl bg-[#0a101f] border border-[#1b2940] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-bold">2</span>
                  <span>ডিপোজিট মেথড নির্বাচন করুন (Payment Methods)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  বিকাশ, নগদ বা বাইন্যান্সের কার্ড থেকে নম্বর কপি করে টাকা পাঠান এবং নিচে TrxID দিন।
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCheckoutModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shrink-0"
              >
                <span>চেকআউট মোডাল খুলুন</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* REFINED CARD-BASED GRID WITH ENTRY ANIMATIONS & HOVER EFFECTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. bKash Card */}
              {paymentSettings.bkashEnabled !== false && (
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.04 }}
                  whileHover={{ y: -4, transition: { duration: 0.18, ease: 'easeOut' } }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => setSelectedGateway('bkash')}
                  className={`group relative p-5 rounded-3xl border text-left cursor-pointer transition-colors duration-200 flex flex-col justify-between gap-4 overflow-hidden ${
                    selectedGateway === 'bkash'
                      ? 'bg-gradient-to-b from-[#1c0e1e] to-[#0c060d] border-[#E2136E] ring-2 ring-[#E2136E]/40 shadow-2xl shadow-[#E2136E]/20 scale-[1.01]'
                      : 'bg-[#080d1a] border-[#18253b] hover:border-[#E2136E]/70 hover:bg-[#0c1424] hover:shadow-xl hover:shadow-[#E2136E]/10'
                  }`}
                >
                  {/* Subtle Brand Accent Radial Glow */}
                  <div
                    className={`absolute -top-12 -right-12 w-36 h-36 rounded-full blur-2xl pointer-events-none transition-opacity duration-300 ${
                      selectedGateway === 'bkash'
                        ? 'bg-[#E2136E]/25 opacity-100'
                        : 'bg-[#E2136E]/15 opacity-0 group-hover:opacity-100'
                    }`}
                  />

                  {/* Card Header: Brand Image, Name, Badge & Radio */}
                  <div className="flex items-start justify-between gap-3 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="group-hover:scale-105 transition-transform duration-200 shrink-0">
                        {paymentSettings.bkashLogoUrl ? (
                          <img src={paymentSettings.bkashLogoUrl} alt="bKash" className="w-12 h-12 rounded-2xl object-cover shadow-lg shadow-[#E2136E]/20" />
                        ) : (
                          <BkashLogo className="w-12 h-12" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white">bKash (বিকাশ)</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E2136E]/20 text-[#ff4081] border border-[#E2136E]/30">
                            Personal
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">Send Money (পার্সোনাল)</p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {selectedGateway === 'bkash' ? (
                        <motion.span
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="px-2.5 py-1 rounded-full bg-[#E2136E] text-white font-black text-[10px] flex items-center gap-1 shadow-md"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>নির্বাচিত</span>
                        </motion.span>
                      ) : (
                        <span className="w-5 h-5 rounded-full border-2 border-slate-600 group-hover:border-[#E2136E]/60 transition-colors block" />
                      )}
                    </div>
                  </div>

                  {/* Account Number Strip with Dedicated Copy Button */}
                  <div className="p-3.5 rounded-2xl bg-[#040811] border border-[#17243a] flex items-center justify-between gap-2 relative z-10">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        বিকাশ পার্সোনাল নম্বর
                      </span>
                      <span className="font-mono text-white font-black text-sm sm:text-base tracking-wider select-all block truncate">
                        {paymentSettings.bkashNumber || '01614572747'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(paymentSettings.bkashNumber || '01614572747', 'bkash_card');
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 hover:scale-105 active:scale-95 ${
                        copiedField === 'bkash_card'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-[#E2136E]/20 hover:bg-[#E2136E]/30 text-[#ff5c99] border border-[#E2136E]/40'
                      }`}
                    >
                      {copiedField === 'bkash_card' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>কপি হয়েছে</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>কপি নম্বর</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Bottom Footer Info */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 relative z-10">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#E2136E] animate-pulse" />
                      <span>ম্যানুয়াল সিম ভেরিফিকেশন</span>
                    </span>
                    <span className="text-[#ff5c99] font-bold group-hover:translate-x-0.5 transition-transform">
                      {selectedGateway === 'bkash' ? 'নিচে তথ্য দিন ↓' : 'সিলেক্ট করুন →'}
                    </span>
                  </div>
                </motion.div>
              )}

              {/* 2. Nagad Card */}
              {paymentSettings.nagadEnabled !== false && (
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
                  whileHover={{ y: -4, transition: { duration: 0.18, ease: 'easeOut' } }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => setSelectedGateway('nagad')}
                  className={`group relative p-5 rounded-3xl border text-left cursor-pointer transition-colors duration-200 flex flex-col justify-between gap-4 overflow-hidden ${
                    selectedGateway === 'nagad'
                      ? 'bg-gradient-to-b from-[#21110b] to-[#0d0704] border-[#F15A24] ring-2 ring-[#F15A24]/40 shadow-2xl shadow-[#F15A24]/20 scale-[1.01]'
                      : 'bg-[#080d1a] border-[#18253b] hover:border-[#F15A24]/70 hover:bg-[#0c1424] hover:shadow-xl hover:shadow-[#F15A24]/10'
                  }`}
                >
                  {/* Subtle Brand Accent Radial Glow */}
                  <div
                    className={`absolute -top-12 -right-12 w-36 h-36 rounded-full blur-2xl pointer-events-none transition-opacity duration-300 ${
                      selectedGateway === 'nagad'
                        ? 'bg-[#F15A24]/25 opacity-100'
                        : 'bg-[#F15A24]/15 opacity-0 group-hover:opacity-100'
                    }`}
                  />

                  {/* Card Header: Brand Image, Name, Badge & Radio */}
                  <div className="flex items-start justify-between gap-3 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="group-hover:scale-105 transition-transform duration-200 shrink-0">
                        {paymentSettings.nagadLogoUrl ? (
                          <img src={paymentSettings.nagadLogoUrl} alt="Nagad" className="w-12 h-12 rounded-2xl object-cover shadow-lg shadow-[#F15A24]/20" />
                        ) : (
                          <NagadLogo className="w-12 h-12" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white">Nagad (নগদ)</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F15A24]/20 text-orange-400 border border-[#F15A24]/30">
                            Personal
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">Send Money (পার্সোনাল)</p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {selectedGateway === 'nagad' ? (
                        <motion.span
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="px-2.5 py-1 rounded-full bg-gradient-to-r from-[#D9381E] to-[#F15A24] text-white font-black text-[10px] flex items-center gap-1 shadow-md"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>নির্বাচিত</span>
                        </motion.span>
                      ) : (
                        <span className="w-5 h-5 rounded-full border-2 border-slate-600 group-hover:border-[#F15A24]/60 transition-colors block" />
                      )}
                    </div>
                  </div>

                  {/* Account Number Strip with Dedicated Copy Button */}
                  <div className="p-3.5 rounded-2xl bg-[#040811] border border-[#17243a] flex items-center justify-between gap-2 relative z-10">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        নগদ পার্সোনাল নম্বর
                      </span>
                      <span className="font-mono text-white font-black text-sm sm:text-base tracking-wider select-all block truncate">
                        {paymentSettings.nagadNumber || '01304104492'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(paymentSettings.nagadNumber || '01304104492', 'nagad_card');
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 hover:scale-105 active:scale-95 ${
                        copiedField === 'nagad_card'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-[#F15A24]/20 hover:bg-[#F15A24]/30 text-orange-300 border border-[#F15A24]/40'
                      }`}
                    >
                      {copiedField === 'nagad_card' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>কপি হয়েছে</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>কপি নম্বর</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Bottom Footer Info */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 relative z-10">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#F15A24] animate-pulse" />
                      <span>ম্যানুয়াল সিম ভেরিফিকেশন</span>
                    </span>
                    <span className="text-orange-400 font-bold group-hover:translate-x-0.5 transition-transform">
                      {selectedGateway === 'nagad' ? 'নিচে তথ্য দিন ↓' : 'সিলেক্ট করুন →'}
                    </span>
                  </div>
                </motion.div>
              )}

              {/* 3. Binance Pay Card */}
              {paymentSettings.binanceEnabled !== false && (
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
                  whileHover={{ y: -4, transition: { duration: 0.18, ease: 'easeOut' } }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => setSelectedGateway('binance')}
                  className={`group relative p-5 rounded-3xl border text-left cursor-pointer transition-colors duration-200 flex flex-col justify-between gap-4 overflow-hidden ${
                    selectedGateway === 'binance'
                      ? 'bg-gradient-to-b from-[#1f1b0a] to-[#0c0a04] border-[#F3BA2F] ring-2 ring-[#F3BA2F]/40 shadow-2xl shadow-[#F3BA2F]/20 scale-[1.01]'
                      : 'bg-[#080d1a] border-[#18253b] hover:border-[#F3BA2F]/70 hover:bg-[#0c1424] hover:shadow-xl hover:shadow-[#F3BA2F]/10'
                  }`}
                >
                  {/* Subtle Brand Accent Radial Glow */}
                  <div
                    className={`absolute -top-12 -right-12 w-36 h-36 rounded-full blur-2xl pointer-events-none transition-opacity duration-300 ${
                      selectedGateway === 'binance'
                        ? 'bg-[#F3BA2F]/25 opacity-100'
                        : 'bg-[#F3BA2F]/15 opacity-0 group-hover:opacity-100'
                    }`}
                  />

                  {/* Card Header: Brand Image, Name, Badge & Radio */}
                  <div className="flex items-start justify-between gap-3 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="group-hover:scale-105 transition-transform duration-200 shrink-0">
                        <BinanceLogo className="w-12 h-12" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white">Binance Pay</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F3BA2F]/20 text-amber-300 border border-[#F3BA2F]/30">
                            USDT
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">Pay ID & QR Scanner</p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {selectedGateway === 'binance' ? (
                        <motion.span
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="px-2.5 py-1 rounded-full bg-[#F3BA2F] text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-md"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>নির্বাচিত</span>
                        </motion.span>
                      ) : (
                        <span className="w-5 h-5 rounded-full border-2 border-slate-600 group-hover:border-[#F3BA2F]/60 transition-colors block" />
                      )}
                    </div>
                  </div>

                  {/* Account Number Strip with Dedicated Copy Button */}
                  <div className="p-3.5 rounded-2xl bg-[#040811] border border-[#17243a] flex items-center justify-between gap-2 relative z-10">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Binance Pay ID / UID
                      </span>
                      <span className="font-mono text-amber-400 font-black text-sm sm:text-base tracking-wider select-all block truncate">
                        {paymentSettings.binancePayId || paymentSettings.binanceUid || '922593999'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(paymentSettings.binancePayId || paymentSettings.binanceUid || '922593999', 'binance_card');
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 hover:scale-105 active:scale-95 ${
                        copiedField === 'binance_card'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-[#F3BA2F]/20 hover:bg-[#F3BA2F]/30 text-amber-300 border border-[#F3BA2F]/40'
                      }`}
                    >
                      {copiedField === 'binance_card' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>কপি হয়েছে</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>কপি আইডি</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Bottom Footer Info */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 relative z-10">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#F3BA2F] animate-pulse" />
                      <span>QR স্ক্যানার ও Pay ID</span>
                    </span>
                    <span className="text-amber-400 font-bold group-hover:translate-x-0.5 transition-transform">
                      {selectedGateway === 'binance' ? 'নিচে তথ্য দিন ↓' : 'সিলেক্ট করুন →'}
                    </span>
                  </div>
                </motion.div>
              )}

              {/* 4. Custom Methods (if any configured by Admin) */}
              {paymentSettings.customMethods?.filter((cm) => cm.enabled !== false).map((cm, idx) => {
                const isSelected = selectedGateway === cm.id;
                return (
                  <motion.div
                    key={cm.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.16 + idx * 0.04 }}
                    whileHover={{ y: -4, transition: { duration: 0.18, ease: 'easeOut' } }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => setSelectedGateway(cm.id)}
                    className={`group relative p-5 rounded-3xl border text-left cursor-pointer transition-colors duration-200 flex flex-col justify-between gap-4 overflow-hidden ${
                      isSelected
                        ? 'bg-gradient-to-b from-[#0e1e18] to-[#040d09] border-emerald-400 ring-2 ring-emerald-400/40 shadow-2xl shadow-emerald-500/20 scale-[1.01]'
                        : 'bg-[#080d1a] border-[#18253b] hover:border-emerald-400/70 hover:bg-[#0c1424] hover:shadow-xl hover:shadow-emerald-500/10'
                    }`}
                  >
                    {/* Subtle Brand Accent Radial Glow */}
                    <div
                      className={`absolute -top-12 -right-12 w-36 h-36 rounded-full blur-2xl pointer-events-none transition-opacity duration-300 ${
                        isSelected
                          ? 'bg-emerald-500/25 opacity-100'
                          : 'bg-emerald-500/15 opacity-0 group-hover:opacity-100'
                      }`}
                    />

                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="group-hover:scale-105 transition-transform duration-200 shrink-0">
                          {cm.imageUrl ? (
                            <img
                              src={cm.imageUrl}
                              alt={cm.name}
                              className="w-12 h-12 rounded-2xl object-cover border border-emerald-400/40 shadow-md"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm border border-emerald-500/40 shadow-md">
                              <CreditCard className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-white">{cm.name}</h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Custom
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">কাস্টম পেমেন্ট মেথড</p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isSelected ? (
                          <motion.span
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-md"
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>নির্বাচিত</span>
                          </motion.span>
                        ) : (
                          <span className="w-5 h-5 rounded-full border-2 border-slate-600 group-hover:border-emerald-400/60 transition-colors block" />
                        )}
                      </div>
                    </div>

                    {/* Account Strip with Dedicated Copy Button */}
                    <div className="p-3.5 rounded-2xl bg-[#040811] border border-[#17243a] flex items-center justify-between gap-2 relative z-10">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          একাউন্ট নম্বর / তথ্য
                        </span>
                        <span className="font-mono text-emerald-300 font-black text-sm sm:text-base tracking-wider select-all block truncate">
                          {cm.account || 'Direct Pay'}
                        </span>
                      </div>

                      {cm.account && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(cm.account, `custom_${cm.id}`);
                          }}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 hover:scale-105 active:scale-95 ${
                            copiedField === `custom_${cm.id}`
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {copiedField === `custom_${cm.id}` ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>কপি হয়েছে</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>কপি নম্বর</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Bottom Footer Info */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 relative z-10">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{cm.instructions || 'সরাসরি সেন্ড মানি করুন'}</span>
                      </span>
                      <span className="text-emerald-400 font-bold group-hover:translate-x-0.5 transition-transform">
                        {isSelected ? 'নিচে তথ্য দিন ↓' : 'সিলেক্ট করুন →'}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Selected Amount Notice Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl bg-[#070c17] border border-[#172338]">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300 font-semibold">নির্বাচিত ডিপোজিট পরিমাণ:</span>
                <span className="text-sm font-black text-amber-400 font-mono">${activeAmountUsd} USDT</span>
                <span className="text-xs font-bold text-emerald-400">(= ৳{activeAmountBdt} BDT)</span>
              </div>
              {activeBonusUsd > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1">
                  <Gift className="w-3 h-3" />
                  <span>মোট ক্রেডিট হবে: ${(activeAmountUsd + activeBonusUsd).toFixed(2)} USDT</span>
                </span>
              )}
            </div>

            {/* In-page Direct Checkout Card (Exact Screenshot Layout) */}
            <div className="mt-4">
              {renderCheckoutCard(false)}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEPOSIT HISTORY */}
      {activeTab === 'history' && (
        <div className="p-4 sm:p-6 rounded-3xl bg-[#0a101f] border border-[#1b2940] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                আপনার ডিপোজিট হিস্ট্রি (Deposit History)
              </h3>
              <p className="text-xs text-slate-400">
                সকল পূর্ববর্তী ডিপোজিট ও ট্রানজেকশনের তালিকা নিচে দেওয়া হলো।
              </p>
            </div>
            <button
              type="button"
              onClick={fetchMyDeposits}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>রিফ্রেশ</span>
            </button>
          </div>

          {myDeposits.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-[#1b2b45] rounded-2xl">
              এখনও কোনো ডিপোজিট হিস্ট্রি নেই। উপরে প্যাকেজ সিলেক্ট করে ডিপোজিট করুন!
            </div>
          ) : (
            <div className="space-y-2.5">
              {myDeposits.map((dep, idx) => {
                const isApproved = dep.status === 'approved' || dep.status === 'PAID';
                const isPending = dep.status === 'pending';
                return (
                  <div
                    key={dep.id || idx}
                    className="p-3.5 rounded-xl bg-[#070d18] border border-[#17243b] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          isApproved
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isPending
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {isApproved ? '✓' : isPending ? '⏳' : '✕'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">
                            ${Number(dep.amount || 0).toFixed(2)} USDT
                          </span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                            {dep.method || 'Deposit'}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          TrxID: <span className="text-amber-400">{dep.transactionId || dep.id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                      <span className="text-[10px] text-slate-500">
                        {dep.createdAt ? new Date(dep.createdAt).toLocaleString('bn-BD') : ''}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          isApproved
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isPending
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {isApproved ? 'সফল (Approved)' : isPending ? 'অপেক্ষমাণ (Pending)' : 'বাতিল (Rejected)'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* POPUP CHECKOUT MODAL (Matching Screenshot) */}
      <AnimatePresence>
        {showCheckoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowCheckoutModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg my-auto"
            >
              {renderCheckoutCard(true)}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* POPUP SUCCESS CONFIRMATION RECEIPT MODAL */}
      <AnimatePresence>
        {showSuccessModal && submittedReceipt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md w-full bg-gradient-to-b from-[#0c1629] to-[#060a12] border-2 border-amber-400 p-6 sm:p-7 rounded-3xl shadow-2xl text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-emerald-400 text-slate-950 flex items-center justify-center mx-auto shadow-xl text-3xl font-black">
                🎉
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-white">ডিপোজিট রিকোয়েস্ট সফলভাবে জমা হয়েছে!</h3>
                <p className="text-xs text-emerald-400 font-bold">
                  আপনার ডিপোজিটটি এডমিন প্যানেলে পর্যালোচনার জন্য পাঠানো হয়েছে।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#060a14] border border-[#17253d] text-left text-xs space-y-2 font-mono">
                <div className="flex items-center justify-between text-slate-400">
                  <span>অর্ডার নম্বর:</span>
                  <span className="text-white font-bold">#{submittedReceipt.orderId}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>পেমেন্ট মেথড:</span>
                  <span className="text-amber-400 font-bold">{submittedReceipt.method}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>ডিপোজিট পরিমাণ:</span>
                  <span className="text-emerald-400 font-bold">${submittedReceipt.amount} USDT</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>TrxID / Order ID:</span>
                  <span className="text-amber-300 font-bold break-all">{submittedReceipt.trxId}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                এডমিন ভেরিফাই করে অনুমোদন করলেই ব্যালেন্স স্বয়ংক্রিয়ভাবে আপনার ওয়ালেটে যুক্ত হবে এবং হিস্ট্রিতে দেখতে পাবেন।
              </p>

              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg cursor-pointer transition"
              >
                ঠিক আছে, ধন্যবাদ
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
