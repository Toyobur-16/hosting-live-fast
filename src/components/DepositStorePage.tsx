import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  CreditCard,
  Coins,
  History,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Send,
  Zap,
  Tag,
  QrCode,
  ArrowLeft,
  Receipt,
  Plus,
  Settings,
  Eye,
  ImageIcon
} from 'lucide-react';
import { AuthUser, DepositMethodItem } from '../types';
import { playDepositSuccessSound } from '../utils/audioAlert';
import { checkIsAdmin } from '../utils/adminCheck';
import { db, doc, setDoc, onSnapshot } from '../lib/firebase';

export interface DepositStorePageProps {
  user: AuthUser | null;
  onOpenAuthModal: () => void;
  onNavigateToPlans?: () => void;
  onNavigateToWallet?: () => void;
  onUserUpdated?: (user: AuthUser) => void;
  lang?: 'bn' | 'en';
}

export const BkashLogo = ({ className = "w-11 h-11" }: { className?: string }) => (
  <div className={`${className} rounded-2xl bg-[#E2136E] flex items-center justify-center p-2 shadow-lg shadow-[#E2136E]/25 shrink-0 text-white font-black text-xs`}>
    বিকাশ
  </div>
);

export const NagadLogo = ({ className = "w-11 h-11" }: { className?: string }) => (
  <div className={`${className} rounded-2xl bg-gradient-to-tr from-[#D9381E] via-[#F15A24] to-[#F7931E] flex items-center justify-center p-2 shadow-lg shadow-[#F15A24]/25 shrink-0 text-white font-black text-xs`}>
    নগদ
  </div>
);

export const BinanceLogo = ({ className = "w-11 h-11" }: { className?: string }) => (
  <div className={`${className} rounded-2xl bg-[#F3BA2F] flex items-center justify-center p-1.5 shadow-lg shadow-[#F3BA2F]/25 shrink-0 text-slate-950 font-black text-sm`}>
    ₮
  </div>
);

export const TronLogo = ({ className = "w-11 h-11" }: { className?: string }) => (
  <div className={`${className} rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center p-1.5 shadow-lg shadow-red-500/25 shrink-0 text-white font-black text-sm`}>
    ₮
  </div>
);

export const BscLogo = ({ className = "w-11 h-11" }: { className?: string }) => (
  <div className={`${className} rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center p-1.5 shadow-lg shadow-amber-500/25 shrink-0 text-slate-950 font-black text-sm`}>
    ₮
  </div>
);

export const PolygonLogo = ({ className = "w-11 h-11" }: { className?: string }) => (
  <div className={`${className} rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center p-1.5 shadow-lg shadow-purple-500/25 shrink-0 text-white font-black text-sm`}>
    ₮
  </div>
);

export const TonLogo = ({ className = "w-11 h-11" }: { className?: string }) => (
  <div className={`${className} rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center p-1.5 shadow-lg shadow-sky-500/25 shrink-0 text-white font-black text-sm`}>
    ₮
  </div>
);

export interface UnifiedPaymentOption {
  id: string;
  name: string;
  category: 'mfs' | 'crypto' | 'custom';
  currency: 'USD' | 'BDT';
  badge: string;
  badgeColor: string;
  accountLabel: string;
  accountValue: string;
  memoOrTag?: string;
  subtext: string;
  instructions: string;
  logoType: 'bkash' | 'nagad' | 'binance' | 'tron' | 'bsc' | 'polygon' | 'ton' | 'crypto' | 'custom';
  logoUrl?: string;
  hasQr?: boolean;
  qrImageUrl?: string;
  appUrl?: string;
  appButtonText?: string;
  color: string;
}

const PRESET_AMOUNTS = [1, 2, 5, 10, 20, 50, 100];
const BDT_RATE = 120; // 1 USDT = 120 BDT

export function DepositStorePage({
  user,
  onOpenAuthModal,
  onNavigateToWallet,
  onUserUpdated
}: DepositStorePageProps) {
  const [methods, setMethods] = useState<DepositMethodItem[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('binance_pay');
  const [depositAmount, setDepositAmount] = useState<string>('5');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form State
  const [senderIdentifier, setSenderIdentifier] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal states
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedReceipt, setSubmittedReceipt] = useState<{
    orderId: string;
    amount: number;
    currency: string;
    method: string;
    trxId: string;
  } | null>(null);

  // Auto-sync & User Balance
  const [isSyncing, setIsSyncing] = useState(false);

  // Deposit History
  const [myDeposits, setMyDeposits] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'deposit' | 'history'>('deposit');

  // Check if current user is admin
  const isAdmin = useMemo(() => checkIsAdmin(user), [user]);

  // Fetch deposit methods from backend
  const fetchMethods = async () => {
    try {
      const res = await fetch('/api/deposit-methods');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.methods) && data.methods.length > 0) {
          setMethods(data.methods);
          return;
        }
      }
    } catch {}

    // Fallback: fetch from payment settings
    try {
      const res2 = await fetch('/api/settings/payment');
      if (res2.ok) {
        const data2 = await res2.json();
        if (Array.isArray(data2.depositMethods) && data2.depositMethods.length > 0) {
          setMethods(data2.depositMethods);
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
    let unsubscribe: (() => void) | null = null;
    try {
      const configDocRef = doc(db, 'config', 'deposit_methods');
      unsubscribe = onSnapshot(configDocRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (Array.isArray(data?.methods) && data.methods.length > 0) {
            setMethods(data.methods);
          }
        }
      });
    } catch {}

    fetchMethods();
    if (user) {
      handleAutoSync(true);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.id]);

  // Ensure a valid selectedMethodId is always selected
  useEffect(() => {
    const activeMethods = methods.filter((m) => m.enabled);
    if (activeMethods.length > 0) {
      const exists = activeMethods.some((m) => m.id === selectedMethodId);
      if (!exists) {
        setSelectedMethodId(activeMethods[0].id);
      }
    }
  }, [methods, selectedMethodId]);

  const activeMethods = useMemo(() => {
    return methods.filter((m) => m.enabled);
  }, [methods]);

  const selectedMethod = useMemo(() => {
    return activeMethods.find((m) => m.id === selectedMethodId) || activeMethods[0] || null;
  }, [activeMethods, selectedMethodId]);

  // Calculate parsed USD amount
  const parsedAmountUsd = useMemo(() => {
    const val = parseFloat(depositAmount);
    return isNaN(val) || val <= 0 ? 0 : val;
  }, [depositAmount]);

  // Calculate BDT equivalent
  const calculatedBdt = useMemo(() => {
    const rate = selectedMethod?.rateToBdt || BDT_RATE;
    return Math.round(parsedAmountUsd * rate);
  }, [parsedAmountUsd, selectedMethod]);

  const isBdtMethod = selectedMethod?.currency === 'BDT' || selectedMethod?.category === 'mfs';

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
    setFormMessage(null);

    if (!user) {
      onOpenAuthModal();
      return;
    }

    if (!selectedMethod) {
      setFormMessage({ type: 'error', text: 'দয়া করে একটি ডিপোজিট মেথড সিলেক্ট করুন।' });
      return;
    }

    if (parsedAmountUsd <= 0) {
      setFormMessage({ type: 'error', text: 'সঠিক ডিপোজিট পরিমাণ নির্ধারণ করুন।' });
      return;
    }

    if (isBdtMethod && !senderIdentifier.trim()) {
      setFormMessage({ type: 'error', text: 'আপনার প্রেরক ফোন নাম্বার দিন।' });
      return;
    }

    if (!transactionId.trim()) {
      setFormMessage({ type: 'error', text: 'Transaction ID / TrxID / TxHash দেওয়া আবশ্যক।' });
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('bot_auth_token');
      const orderIdGen = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const cleanTrx = transactionId.trim().toUpperCase();
      const reqId = `dep_${orderIdGen}`;
      const effectiveSender = senderIdentifier.trim() || user.email || 'User';
      const effectiveNote = note.trim() || `Deposit (${selectedMethod.name} - $${parsedAmountUsd} ${selectedMethod.currency || 'USD'})`;

      // 1. Direct write to Firestore for instant cloud persistence
      try {
        const firestorePayload = {
          id: reqId,
          type: 'deposit',
          userId: user.id,
          userName: user.name || (user.email ? user.email.split('@')[0] : 'User'),
          userEmail: user.email,
          planId: 'wallet_deposit',
          planName: `ওয়ালেট ডিপোজিট (${parsedAmountUsd} ${selectedMethod.currency || 'USD'})`,
          amount: parsedAmountUsd,
          currency: selectedMethod.currency || 'USD',
          method: selectedMethod.name,
          senderNumber: effectiveSender,
          senderIdentifier: effectiveSender,
          transactionId: cleanTrx,
          orderId: orderIdGen,
          note: effectiveNote,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: Date.now()
        };
        await setDoc(doc(db, 'plan_requests', reqId), firestorePayload);
        await setDoc(doc(db, 'deposits', reqId), firestorePayload);
      } catch (fbErr) {
        console.warn('Client direct Firestore write error (non-fatal, backend will sync):', fbErr);
      }

      // 2. Submit to backend API
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          amount: parsedAmountUsd,
          currency: selectedMethod.currency || 'USD',
          method: selectedMethod.name,
          senderIdentifier: effectiveSender,
          transactionId: cleanTrx,
          orderId: orderIdGen,
          note: effectiveNote
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        playDepositSuccessSound();
        setSubmittedReceipt({
          orderId: orderIdGen,
          amount: parsedAmountUsd,
          currency: selectedMethod.currency || 'USD',
          method: selectedMethod.name,
          trxId: transactionId.trim().toUpperCase()
        });
        setShowSuccessModal(true);
        setTransactionId('');
        setSenderIdentifier('');
        setNote('');
        setFormMessage(null);
        handleAutoSync(true);
      } else {
        setFormMessage({ type: 'error', text: data.error || 'ডিপোজিট সাবমিট ব্যর্থ হয়েছে।' });
      }
    } catch (err: any) {
      setFormMessage({ type: 'error', text: err.message || 'নেটওয়ার্ক সংযোগে সমস্যা হয়েছে।' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderCardLogo = (m: DepositMethodItem) => {
    // 1. If method has a custom or uploaded logo URL, use it!
    if (m.logoUrl) {
      return (
        <div className="w-10 h-10 rounded-xl bg-black/60 border border-white/20 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-md">
          <img
            src={m.logoUrl}
            alt={m.name}
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/logo-icon.png';
            }}
          />
        </div>
      );
    }

    // 2. Fall back to stylized brand badges (NOT QR Code!)
    switch (m.logoType) {
      case 'bkash':
        return (
          <div className="w-10 h-10 rounded-xl bg-[#E2136E] flex items-center justify-center p-1 text-white font-black text-xs shrink-0 shadow-md">
            বিকাশ
          </div>
        );
      case 'nagad':
        return (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D9381E] to-[#F7931E] flex items-center justify-center p-1 text-white font-black text-xs shrink-0 shadow-md">
            নগদ
          </div>
        );
      case 'binance':
      case 'bep20':
      case 'trc20':
        return (
          <div className="w-10 h-10 rounded-xl bg-[#2b2716] border border-amber-500/40 text-amber-400 flex items-center justify-center font-black text-sm shrink-0 shadow-md">
            ₮
          </div>
        );
      case 'polygon':
        return (
          <div className="w-10 h-10 rounded-xl bg-purple-900/40 border border-purple-500/40 text-purple-400 flex items-center justify-center font-black text-sm shrink-0 shadow-md">
            ₮
          </div>
        );
      case 'ton':
        return (
          <div className="w-10 h-10 rounded-xl bg-sky-900/40 border border-sky-500/40 text-sky-400 flex items-center justify-center font-black text-sm shrink-0 shadow-md">
            ₮
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-[#00d293] border border-emerald-500/30 flex items-center justify-center font-black text-xs shrink-0 shadow-md">
            <CreditCard className="w-5 h-5" />
          </div>
        );
    }
  };

  const getSubtitleColor = (m: DepositMethodItem) => {
    if (m.logoType === 'bkash') return 'text-pink-400';
    if (m.logoType === 'nagad') return 'text-orange-400';
    if (m.category === 'crypto') return 'text-amber-400';
    return 'text-[#00d293]';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-24 px-2.5 sm:px-4 w-full overflow-x-hidden animate-in fade-in duration-200">
      {/* Top Status & Sync Indicators (Matching Screenshot) */}
      <div className="flex items-center justify-end gap-2 px-1">
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>অটো-সিঙ্ক</span>
        </div>

        <button
          type="button"
          onClick={() => handleAutoSync(false)}
          disabled={isSyncing}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[11px] font-bold text-slate-300 hover:text-white border border-slate-700 cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
          <span>রিফ্রেশ</span>
        </button>
      </div>

      {/* Action Row: Back to Wallet & View Deposit History */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (activeTab === 'history') {
              setActiveTab('deposit');
            } else if (onNavigateToWallet) {
              onNavigateToWallet();
            }
          }}
          className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-[#00d293] cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Wallet</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab(activeTab === 'deposit' ? 'history' : 'deposit');
            fetchMyDeposits();
          }}
          className="text-xs font-bold text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>{activeTab === 'deposit' ? 'ডিপোজিট হিস্ট্রি দেখুন' : 'ডিপোজিটে ফিরে যান'}</span>
        </button>
      </div>

      {/* VIEW 1: DEPOSIT STORE (Exact layout matching the Screenshot!) */}
      {activeTab === 'deposit' && (
        <div className="space-y-5">
          {/* Clean Title Header without non-admin manage buttons */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#00d293]/15 text-[#00d293] flex items-center justify-center shadow-md shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  ডিপোজিট মেথড নির্বাচন করুন
                </h2>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  পছন্দের পেমেন্ট মাধ্যম সিলেক্ট করে উল্লেখিত একাউন্টে সরাসরি ডিপোজিট করুন
                </p>
              </div>
            </div>

            {/* If user is admin, show a subtle admin badge indicating methods are controlled from Admin Panel */}
            {isAdmin && (
              <div className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">এডমিন মোড (মেথডসমূহ এডমিন প্যানেল থেকে নিয়ন্ত্রিত)</span>
                <span className="sm:hidden">এডমিন মোড</span>
              </div>
            )}
          </div>

          {/* Gateways Grid: bKash, Nagad, Binance Pay / UID, USDT (BEP-20), USDT (TRC-20), Custom */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {activeMethods.map((m) => {
              const isSelected = selectedMethod?.id === m.id;
              let activeBorderColor = 'border-amber-400 ring-2 ring-amber-400/30 bg-amber-500/10';
              if (m.logoType === 'bkash') {
                activeBorderColor = 'border-pink-500 ring-2 ring-pink-500/30 bg-pink-500/15';
              } else if (m.logoType === 'nagad') {
                activeBorderColor = 'border-orange-500 ring-2 ring-orange-500/30 bg-orange-500/15';
              } else if (m.category === 'custom') {
                activeBorderColor = 'border-[#00d293] ring-2 ring-[#00d293]/30 bg-emerald-500/15';
              }

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMethodId(m.id)}
                  className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? `${activeBorderColor} shadow-lg scale-[1.01]`
                      : 'bg-[#0d1424] border-[#1e2e42] hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {renderCardLogo(m)}
                    <div className="min-w-0">
                      <span className="text-xs font-black text-white block truncate">
                        {m.name}
                      </span>
                      <span className={`text-[10px] font-bold block truncate uppercase ${getSubtitleColor(m)}`}>
                        {m.subtitle || m.currency}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Amount Preset Chips and Custom Input (Matching Screenshot) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0d1424] border border-[#1e2e42] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span>💰</span> ডিপোজিট এমাউন্ট সিলেক্ট করুন (Select Amount):
              </label>
              {isBdtMethod && (
                <span className="text-[11px] font-bold text-amber-400">
                  ১ USDT = ১২০ ৳ (BDT)
                </span>
              )}
            </div>

            {/* Preset Amount Chips ($1, $2, $5 highlighted, $10, $20, $50, $100) */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {PRESET_AMOUNTS.map((amt) => {
                const isSelected = parsedAmountUsd === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositAmount(String(amt))}
                    className={`py-2 px-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#F5A524] text-[#0a0e17] ring-2 ring-amber-400/50 shadow-md font-black scale-[1.02]'
                        : 'bg-[#0a0f1d] hover:bg-[#141e33] text-slate-300 border border-slate-800'
                    }`}
                  >
                    ${amt}
                  </button>
                );
              })}
            </div>

            {/* Custom Amount Field */}
            <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-amber-400">
                  $
                </span>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  value={depositAmount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Custom amount"
                  className="w-full pl-8 pr-16 py-2.5 rounded-xl bg-[#0a0f1d] border border-slate-700 text-sm font-black text-white focus:outline-none focus:border-amber-400"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                  USDT
                </span>
              </div>

              {isBdtMethod && (
                <div className="px-4 py-2 rounded-xl bg-[#0a0f1d] border border-slate-800 flex sm:flex-col justify-between sm:justify-center items-center sm:items-end min-w-[120px]">
                  <span className="text-[10px] text-slate-400 block font-bold">পরিশোধ করতে হবে:</span>
                  <span className="text-sm font-black text-[#00d293]">
                    ৳{calculatedBdt.toLocaleString()} BDT
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* DEPOSIT DETAILS & SUBMISSION FORM */}
          {selectedMethod && (
            <div className="p-4 sm:p-6 rounded-3xl bg-[#0d1424] border border-[#1e2e42] shadow-xl space-y-4">
              {/* Payment Info Box */}
              <div className="p-4 rounded-2xl bg-[#070b14] border border-[#1e293b] space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>💎</span> {selectedMethod.name} ডিপোজিট নির্দেশিকা
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00d293]/20 text-[#00d293] font-bold">
                    {isBdtMethod ? '১ USDT = ১২০ টাকা' : `${selectedMethod.subtitle || 'Crypto'}`}
                  </span>
                </div>

                {/* Account / Address with 1-Click Copy */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0f172a] border border-slate-700">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-[11px] font-bold text-slate-300">
                      {selectedMethod.accountLabel || `${selectedMethod.name} এড্রেস / নম্বর:`}
                    </span>
                    <span className="text-sm sm:text-base font-black text-white tracking-wider mt-0.5 font-mono truncate">
                      {selectedMethod.accountValue}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(selectedMethod.accountValue, 'accValue')}
                    className="px-3.5 py-2 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95 shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedField === 'accValue' ? '✓ কপি হয়েছে!' : 'কপি করুন'}</span>
                  </button>
                </div>

                {/* Memo or Tag if present */}
                {selectedMethod.memoOrTag && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#0f172a] border border-amber-500/30">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-[10px] font-bold text-amber-400">
                        Memo / Tag (অবশ্যই উল্লেখ করবেন):
                      </span>
                      <span className="text-sm font-black text-white font-mono mt-0.5">
                        {selectedMethod.memoOrTag}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(selectedMethod.memoOrTag || '', 'memoValue')}
                      className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedField === 'memoValue' ? '✓ কপি হয়েছে!' : 'কপি'}</span>
                    </button>
                  </div>
                )}

                {/* Direct QR Code Display if available */}
                {selectedMethod.qrImageUrl && (
                  <div className="p-3 rounded-xl bg-[#0a0f1d] border border-amber-500/30 flex items-center gap-3">
                    <img
                      src={selectedMethod.qrImageUrl}
                      alt="QR Code"
                      onClick={() => setPreviewImage(selectedMethod.qrImageUrl || null)}
                      className="w-16 h-16 rounded-xl object-contain bg-white p-1 border border-slate-700 shadow-md cursor-pointer hover:scale-105 transition"
                    />
                    <div>
                      <span className="text-xs font-bold text-white flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                        <span>পেমেন্ট কিউআর কোড (Direct QR)</span>
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        স্ক্যান করে সরাসরি পেমেন্ট করতে পারেন।
                      </p>
                      <button
                        type="button"
                        onClick={() => setPreviewImage(selectedMethod.qrImageUrl || null)}
                        className="mt-1 text-[11px] text-amber-300 font-bold underline cursor-pointer"
                      >
                        ছবি বড় করে দেখুন
                      </button>
                    </div>
                  </div>
                )}

                {/* Instructions */}
                {selectedMethod.instructions && (
                  <div className="p-3 rounded-xl bg-[#0c1424] border border-slate-800 text-xs text-slate-300">
                    <span className="font-bold text-amber-300 block mb-0.5">নির্দেশনা:</span>
                    <p className="whitespace-pre-line leading-relaxed">
                      {selectedMethod.instructions}
                    </p>
                  </div>
                )}
              </div>

              {/* Form Inputs */}
              <form onSubmit={handleSubmitDeposit} className="space-y-3.5">
                {isBdtMethod ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      ১. আপনার প্রেরক একাউন্ট নাম্বার (যে নাম্বার থেকে টাকা পাঠিয়েছেন) *
                    </label>
                    <input
                      type="text"
                      required
                      value={senderIdentifier}
                      onChange={(e) => setSenderIdentifier(e.target.value)}
                      placeholder="e.g. 017XXXXXXXX"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0f172a] border border-[#1e293b] text-sm text-white font-mono focus:border-[#00d293] focus:outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      ১. আপনার Binance UID / প্রেরক এড্রেস বা ইমেইল (ঐচ্ছিক)
                    </label>
                    <input
                      type="text"
                      value={senderIdentifier}
                      onChange={(e) => setSenderIdentifier(e.target.value)}
                      placeholder="e.g. 922593999 বা 0x... বা ইমেইল"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0f172a] border border-[#1e293b] text-sm text-white font-mono focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ২. Transaction ID / TrxID / TxHash *
                  </label>
                  <input
                    type="text"
                    required
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder={
                      isBdtMethod
                        ? 'e.g. 9J83KLOP01'
                        : selectedMethod.id.includes('binance')
                        ? 'e.g. Binance Order ID বা Transaction ID'
                        : 'e.g. 0xadf20... বা ট্রানজেকশন হ্যাশ'
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0f172a] border border-[#1e293b] text-sm text-white font-bold uppercase tracking-wider focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    অতিরিক্ত নোট বা মন্তব্য (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="কোনো বিশেষ মন্তব্য থাকলে লিখতে পারেন"
                    className="w-full px-4 py-2 rounded-xl bg-[#0f172a] border border-[#1e293b] text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                {formMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      formMessage.type === 'success'
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {formMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{formMessage.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.99] cursor-pointer transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{submitting ? 'সাবমিট হচ্ছে...' : 'ডিপোজিট রিকোয়েস্ট সাবমিট করুন'}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: DEPOSIT HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <History className="w-5 h-5 text-amber-400" />
              <span>আপনার ডিপোজিট হিস্ট্রি ({myDeposits.length})</span>
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab('deposit')}
              className="text-xs text-amber-400 hover:underline cursor-pointer font-bold"
            >
              ← ডিপোজিটে ফিরুন
            </button>
          </div>

          {myDeposits.length === 0 ? (
            <div className="p-8 text-center bg-[#0d1424] rounded-2xl border border-[#1e2e42] space-y-2">
              <Receipt className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-400">এখনও কোনো ডিপোজিট হিস্ট্রি পাওয়া যায়নি</p>
              <button
                type="button"
                onClick={() => setActiveTab('deposit')}
                className="mt-2 px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-black"
              >
                এখনই ডিপোজিট করুন
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {myDeposits.map((dep) => (
                <div
                  key={dep.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-[#0d1424] border border-[#1e2e42] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white truncate">
                        ${Number(dep.amount || 0).toFixed(2)} {dep.currency || 'USD'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          dep.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : dep.status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {dep.status === 'approved' ? 'অনুমোদিত' : dep.status === 'rejected' ? 'বাতিল' : 'পেন্ডিং'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                      মেথড: <span className="text-slate-200 font-bold">{dep.method}</span> • TrxID:{' '}
                      <span className="font-mono text-amber-300">{dep.transactionId}</span>
                    </div>

                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(dep.createdAt || dep.timestamp || Date.now()).toLocaleString()}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedReceipt({
                        orderId: dep.id,
                        amount: dep.amount,
                        currency: dep.currency || 'USD',
                        method: dep.method,
                        trxId: dep.transactionId
                      });
                      setShowSuccessModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white shrink-0 cursor-pointer"
                  >
                    রসিদ দেখুন
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUCCESS RECEIPT MODAL */}
      {showSuccessModal && submittedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm bg-[#0a101f] border border-amber-400/40 rounded-3xl p-5 sm:p-6 shadow-2xl text-center space-y-4">
            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">ডিপোজিট রিকোয়েস্ট গৃহীত হয়েছে</h3>
              <p className="text-xs text-slate-400 mt-1">
                এডমিন তথ্য ভেরিফাই করে অনুমোদন করলেই সাথে সাথে ব্যালেন্স জমা হবে।
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#060a12] border border-slate-800 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">অর্ডার আইডি:</span>
                <span className="text-white font-mono font-bold">#{submittedReceipt.orderId.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">পরিমাণ:</span>
                <span className="text-[#00d293] font-black text-sm">
                  ${submittedReceipt.amount.toFixed(2)} {submittedReceipt.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">মেথড:</span>
                <span className="text-amber-400 font-bold">{submittedReceipt.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">TrxID:</span>
                <span className="text-slate-200 font-mono font-bold truncate max-w-[160px]">
                  {submittedReceipt.trxId}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer shadow-md"
            >
              ঠিক আছে
            </button>
          </div>
        </div>
      )}

      {/* PREVIEW IMAGE MODAL */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-sm w-full bg-[#0a101f] border border-slate-700 rounded-3xl p-4 text-center space-y-3">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-xs font-black text-white">কিউআর কোড / পেমেন্ট ছবি</h4>
            <img
              src={previewImage}
              alt="QR Code"
              className="w-full max-h-80 object-contain rounded-2xl bg-white p-2 border border-slate-700 mx-auto"
            />
          </div>
        </div>
      )}

    </div>
  );
}
