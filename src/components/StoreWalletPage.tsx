import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Plus,
  ArrowLeft,
  Copy,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  AlertCircle,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Send,
  Coins,
  Zap,
  Loader2,
  QrCode,
  Check,
  RefreshCw,
  X,
  Search,
  Receipt,
  Eye,
  ImageIcon,
  ArrowUpRight,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthUser, PaymentSettings, DepositRequest, BinancePayOrder, CustomDepositMethod } from '../types';

interface StoreWalletPageProps {
  user: AuthUser | null;
  onOpenAuthModal: () => void;
  onNavigateToPlans: () => void;
  onNavigateToDepositStore?: () => void;
  onUserUpdated?: (updatedUser: AuthUser) => void;
}

export function StoreWalletPage({
  user,
  onOpenAuthModal,
  onNavigateToPlans,
  onNavigateToDepositStore,
  onUserUpdated
}: StoreWalletPageProps) {
  const [view, setView] = useState<'overview' | 'deposit' | 'history'>('overview');
  const [activeHistoryTab, setActiveHistoryTab] = useState<'all' | 'deposits' | 'purchases'>('all');
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    binanceUid: '922593999',
    binancePayId: '922593999',
    binanceId: '922593999',
    binanceEnabled: true,
    binancePayApiEnabled: true,
    bkashNumber: '01614572747',
    bkashEnabled: true,
    nagadNumber: '01304104492',
    nagadEnabled: true
  });

  const [selectedGateway, setSelectedGateway] = useState<string>('binance');
  const [binanceMode, setBinanceMode] = useState<'automatic' | 'manual'>('automatic');
  const [depositAmount, setDepositAmount] = useState<string>('5');
  const [depositCurrency, setDepositCurrency] = useState<'USD' | 'BDT'>('USD');
  const [senderIdentifier, setSenderIdentifier] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');
  const [depositNote, setDepositNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Instant Binance Pay State
  const [binanceLoading, setBinanceLoading] = useState(false);
  const [activeBinanceOrder, setActiveBinanceOrder] = useState<BinancePayOrder | null>(null);
  const [binancePaymentPaid, setBinancePaymentPaid] = useState(false);
  const [checkingBinanceStatus, setCheckingBinanceStatus] = useState(false);
  const [returnSuccessMessage, setReturnSuccessMessage] = useState<string | null>(null);
  const [modalTrxId, setModalTrxId] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalSuccessMsg, setModalSuccessMsg] = useState<string | null>(null);
  const [modalErrorMsg, setModalErrorMsg] = useState<string | null>(null);

  // User Requests & Deposit History
  const [userRequests, setUserRequests] = useState<DepositRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<DepositRequest | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Auto-sync Balance State
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());
  const [balanceToast, setBalanceToast] = useState<string | null>(null);

  // Deposit Success Animation State
  const [successAnimationData, setSuccessAnimationData] = useState<{
    amount: number;
    currency: string;
    method: string;
    transactionId?: string;
    isAutomatic?: boolean;
  } | null>(null);

  const BDT_RATE = 120; // 1 USDT = 120 BDT
  const PRESET_AMOUNTS = [1, 2, 5, 10, 20, 50, 100];

  useEffect(() => {
    fetchPaymentSettings();
    if (user) {
      fetchUserRequests();
    }
  }, [user]);

  // Auto-sync Balance polling every 5 seconds when user is logged in
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      await performAutoSync(true); // background silent
    }, 5000);

    return () => clearInterval(interval);
  }, [user?.id, user?.balanceUsd]);

  // Check URL params from Binance Pay redirect: ?deposit=success&orderId=...
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const depositStatus = params.get('deposit');
    const orderId = params.get('orderId');

    if (depositStatus && orderId) {
      handleCheckReturnOrder(orderId);
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, []);

  // Poll for Binance Pay status when modal is open and pending
  useEffect(() => {
    if (!activeBinanceOrder || activeBinanceOrder.status === 'PAID') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/binance-pay/check-status/${activeBinanceOrder.orderId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'PAID') {
            setActiveBinanceOrder((prev) => (prev ? { ...prev, status: 'PAID' } : null));
            setBinancePaymentPaid(true);
            setSuccessAnimationData({
              amount: activeBinanceOrder.amount,
              currency: 'USD',
              method: 'Binance Pay (ইনস্ট্যান্ট)',
              transactionId: activeBinanceOrder.orderId,
              isAutomatic: true
            });
            refreshUserData();
            fetchUserRequests();
            clearInterval(interval);
          }
        }
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, [activeBinanceOrder]);

  const performAutoSync = async (silent = false) => {
    const token = localStorage.getItem('bot_auth_token');
    if (!token) return;
    try {
      if (!silent) setIsSyncing(true);
      const [userRes, depositsRes] = await Promise.all([
        fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/wallet/my-deposits', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.user && onUserUpdated) {
          const oldBal = user?.balanceUsd ?? 0;
          const newBal = userData.user.balanceUsd ?? 0;
          if (newBal > oldBal) {
            setBalanceToast(`🎉 ব্যালেন্স অটো-সিঙ্ক হয়েছে! +$${(newBal - oldBal).toFixed(2)} USDT যোগ হয়েছে।`);
            setTimeout(() => setBalanceToast(null), 4500);
          }
          onUserUpdated(userData.user);
        }
      }

      if (depositsRes.ok) {
        const depData = await depositsRes.json();
        setUserRequests(depData.deposits || []);
      }
      setLastSyncedAt(new Date());
    } catch {} finally {
      if (!silent) setIsSyncing(false);
    }
  };

  const refreshUserData = async () => {
    const token = localStorage.getItem('bot_auth_token');
    if (!token) return;
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
    } catch {}
  };

  const handleCheckReturnOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/binance-pay/check-status/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'PAID') {
          setSuccessAnimationData({
            amount: data.amount || 0,
            currency: 'USD',
            method: 'Binance Pay',
            transactionId: orderId,
            isAutomatic: true
          });
          refreshUserData();
          fetchUserRequests();
        } else {
          setReturnSuccessMessage(`অর্ডার #${orderId} সফলভাবে সম্পন্ন হয়েছে। ব্যালেন্স অটো আপডেট হচ্ছে...`);
          refreshUserData();
          fetchUserRequests();
        }
      }
    } catch {}
  };

  const handleCreateBinancePayOrder = async () => {
    if (!user) {
      onOpenAuthModal();
      return;
    }

    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) {
      setSubmitError('অনুগ্রহ করে সঠিক ডিপোজিট পরিমাণ লিখুন');
      return;
    }

    try {
      setBinanceLoading(true);
      setSubmitError(null);
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/binance-pay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: amt, currency: 'USD' })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.needsDirectMode) {
          setSubmitError('Binance Pay API কী এখনও কনফিগার করা হয়নি। আপনি নিচের ম্যানুয়াল ফর্ম দিয়ে ডিপোজিট করতে পারেন।');
          setBinanceMode('manual');
        } else {
          setSubmitError(data.error || 'Binance Pay অর্ডার তৈরি করতে ব্যর্থ হয়েছে');
        }
        return;
      }

      setActiveBinanceOrder(data.order);
      setModalTrxId('');
      setModalSuccessMsg(null);
      setModalErrorMsg(null);

      if (data.order.checkoutUrl && !data.order.isDirectMode) {
        window.open(data.order.checkoutUrl, '_blank');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Network error');
    } finally {
      setBinanceLoading(false);
    }
  };

  const handleModalSubmitTrx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBinanceOrder || !user) return;
    if (!modalTrxId.trim()) {
      setModalErrorMsg('Transaction ID বা Order ID লিখুন');
      return;
    }
    try {
      setModalSubmitting(true);
      setModalErrorMsg(null);
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: activeBinanceOrder.amount,
          currency: 'USD',
          method: 'binance',
          senderIdentifier: user.name || user.email || 'Binance User',
          transactionId: modalTrxId.trim(),
          note: `Binance Pay Order #${activeBinanceOrder.orderId}`
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setModalErrorMsg(data.error || 'সাবমিট ব্যর্থ হয়েছে');
        return;
      }
      setModalSuccessMsg('🎉 ডিপোজিট তথ্য সফলভাবে জমা দেওয়া হয়েছে! এডমিন দ্রুত ভেরিফাই করে ব্যালেন্স যোগ করবেন।');
      setModalTrxId('');
      fetchUserRequests();
      refreshUserData();

      // Trigger Deposit Success Animation:
      setSuccessAnimationData({
        amount: activeBinanceOrder.amount,
        currency: 'USD',
        method: 'Binance Pay',
        transactionId: modalTrxId.trim(),
        isAutomatic: false
      });

      setTimeout(() => {
        setActiveBinanceOrder(null);
        setModalSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      setModalErrorMsg(err.message || 'Error occurred');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleManualCheckBinanceOrder = async () => {
    if (!activeBinanceOrder) return;
    try {
      setCheckingBinanceStatus(true);
      const res = await fetch(`/api/binance-pay/check-status/${activeBinanceOrder.orderId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'PAID') {
          setActiveBinanceOrder((prev) => (prev ? { ...prev, status: 'PAID' } : null));
          setBinancePaymentPaid(true);
          setSuccessAnimationData({
            amount: activeBinanceOrder.amount,
            currency: 'USD',
            method: 'Binance Pay (ইনস্ট্যান্ট)',
            transactionId: activeBinanceOrder.orderId,
            isAutomatic: true
          });
          refreshUserData();
          fetchUserRequests();
        } else {
          setSubmitError('পেমেন্ট এখনও অনুমোদনের অপেক্ষায় আছে। বাইন্যান্সে কনফার্ম করে কয়েক সেকেন্ড পর আবার চেক করুন।');
          setTimeout(() => setSubmitError(null), 4000);
        }
      }
    } catch (err: any) {
      setSubmitError('স্ট্যাটাস চেক ব্যর্থ হয়েছে: ' + (err.message || 'Network error'));
    } finally {
      setCheckingBinanceStatus(false);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const res = await fetch('/api/settings/payment');
      if (res.ok) {
        const data = await res.json();
        setPaymentSettings(data);
      }
    } catch {}
  };

  const fetchUserRequests = async () => {
    const token = localStorage.getItem('bot_auth_token');
    if (!token) return;
    try {
      setLoadingRequests(true);
      const res = await fetch('/api/wallet/my-deposits', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserRequests(data.deposits || []);
      }
    } catch {} finally {
      setLoadingRequests(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuthModal();
      return;
    }

    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) {
      setSubmitError('অনুগ্রহ করে সঠিক ডিপোজিট পরিমাণ লিখুন');
      return;
    }

    if (!transactionId.trim()) {
      setSubmitError('অনুগ্রহ করে ট্রানজেকশন আইডি (TrxID) লিখুন');
      return;
    }

    if (selectedGateway !== 'binance' && !senderIdentifier.trim()) {
      setSubmitError('অনুগ্রহ করে যে নাম্বার থেকে টাকা পাঠিয়েছেন তা লিখুন');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(null);

      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: amt,
          currency: 'USD',
          method: selectedGateway,
          senderIdentifier: senderIdentifier.trim(),
          transactionId: transactionId.trim(),
          note: depositNote.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setSubmitError(data.error || 'ডিপোজিট রিকোয়েস্ট ব্যর্থ হয়েছে');
        return;
      }

      // Trigger Deposit Success Animation:
      setSuccessAnimationData({
        amount: amt,
        currency: 'USD',
        method: getGatewayTitle(),
        transactionId: transactionId.trim(),
        isAutomatic: false
      });

      setTransactionId('');
      setSenderIdentifier('');
      setDepositNote('');
      fetchUserRequests();
      refreshUserData();
    } catch (err: any) {
      setSubmitError(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper functions for gateway details
  const getGatewayNumber = () => {
    if (selectedGateway === 'binance') return paymentSettings.binancePayId || paymentSettings.binanceUid || paymentSettings.binanceId || '922593999';
    if (selectedGateway === 'bkash') return paymentSettings.bkashNumber || '01614572747';
    if (selectedGateway === 'nagad') return paymentSettings.nagadNumber || '01304104492';
    const custom = paymentSettings.customMethods?.find((cm) => cm.id === selectedGateway);
    if (custom) return custom.account || '';
    return '';
  };

  const getGatewayTitle = () => {
    if (selectedGateway === 'binance') return 'Binance (USDT)';
    if (selectedGateway === 'bkash') return 'bKash (বিকাশ)';
    if (selectedGateway === 'nagad') return 'Nagad (নগদ)';
    const custom = paymentSettings.customMethods?.find((cm) => cm.id === selectedGateway);
    if (custom) return custom.name || 'Custom Deposit';
    return '';
  };

  const getGatewayQrUrl = () => {
    // Only Binance displays QR code scanner as requested by user
    if (selectedGateway === 'binance') return paymentSettings.binanceQrUrl || '';
    return '';
  };

  const getGatewayInstructions = () => {
    const custom = paymentSettings.customMethods?.find((cm) => cm.id === selectedGateway);
    if (custom && custom.instructions) return custom.instructions;
    return paymentSettings.instructionsBn || '';
  };

  // Computed deposit stats
  const depositStats = useMemo(() => {
    let totalApprovedUsd = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    userRequests.forEach((r) => {
      const amt = Number(r.amount) || 0;
      if (r.status === 'approved') {
        totalApprovedUsd += amt;
        approvedCount++;
      } else if (r.status === 'pending') {
        pendingCount++;
      } else if (r.status === 'rejected') {
        rejectedCount++;
      }
    });

    return { totalApprovedUsd, pendingCount, approvedCount, rejectedCount, totalCount: userRequests.length };
  }, [userRequests]);

  // Filtered requests for Deposit History
  const filteredHistoryRequests = useMemo(() => {
    return userRequests.filter((req) => {
      if (historyFilter !== 'all' && req.status !== historyFilter) return false;
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase().trim();
        const matchesTrx = req.transactionId?.toLowerCase().includes(q);
        const matchesMethod = req.method?.toLowerCase().includes(q);
        const matchesSender = req.senderIdentifier?.toLowerCase().includes(q);
        const matchesNote = req.note?.toLowerCase().includes(q);
        return matchesTrx || matchesMethod || matchesSender || matchesNote;
      }
      return true;
    });
  }, [userRequests, historyFilter, historySearchQuery]);

  const calculatedBdt = (parseFloat(depositAmount) || 0) * BDT_RATE;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 animate-in fade-in duration-200 px-2 sm:px-4 w-full overflow-x-hidden">
      {/* Real-time Balance Toast Notification */}
      <AnimatePresence>
        {balanceToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-4 sm:right-8 z-50 p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-2xl flex items-center gap-3 border border-emerald-400/40"
          >
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <p>{balanceToast}</p>
              <span className="text-[10px] text-emerald-100">অটো-সিঙ্ক সক্রিয় আছে</span>
            </div>
            <button
              onClick={() => setBalanceToast(null)}
              className="p-1 hover:bg-white/20 rounded-lg cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Top Navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#0a101d] p-1.5 rounded-2xl border border-[#1a263d]">
        <div className="grid grid-cols-3 sm:flex items-center gap-1 sm:gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setView('overview')}
            className={`px-2.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              view === 'overview'
                ? 'bg-[#00d293] text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-[#111c30]'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">ওয়ালেট</span>
          </button>

          <button
            onClick={() => {
              if (!user) onOpenAuthModal();
              else setView('deposit');
            }}
            className={`px-2.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              view === 'deposit'
                ? 'bg-[#00d293] text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-[#111c30]'
            }`}
          >
            <Plus className="w-3.5 h-3.5 stroke-[3] shrink-0" />
            <span className="truncate">ডিপোজিট</span>
          </button>

          <button
            onClick={() => {
              if (!user) onOpenAuthModal();
              else setView('history');
            }}
            className={`px-2.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              view === 'history'
                ? 'bg-[#00d293] text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-[#111c30]'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">হিস্ট্রি</span>
            {userRequests.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black shrink-0 ${
                view === 'history' ? 'bg-slate-950 text-[#00d293]' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {userRequests.length}
              </span>
            )}
          </button>

          {onNavigateToDepositStore && (
            <button
              onClick={onNavigateToDepositStore}
              className="px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30"
              title="ডিপোজিট স্টোর পেজ খুলুন"
            >
              <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">ডিপোজিট স্টোর</span>
            </button>
          )}
        </div>

        {/* Auto-Sync Real-time Indicator & Manual Refresh Button */}
        {user && (
          <div className="flex items-center justify-end gap-2 px-1">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>অটো-সিঙ্ক</span>
            </div>

            <button
              onClick={() => performAutoSync(false)}
              disabled={isSyncing}
              className="p-1.5 px-2.5 rounded-lg bg-[#141e33] hover:bg-[#1c2a47] text-slate-300 hover:text-white border border-slate-700/60 cursor-pointer transition flex items-center gap-1.5 text-[11px] font-semibold disabled:opacity-50"
              title="ব্যালেন্স ও হিস্ট্রি রিফ্রেশ করুন"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isSyncing ? 'সিঙ্ক হচ্ছে...' : 'রিফ্রেশ'}</span>
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: OVERVIEW */}
      {view === 'overview' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#00d293]/15 flex items-center justify-center text-[#00d293]">
                <Wallet className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                My Wallet & Balance
              </h2>
            </div>
            {user && (
              <button
                onClick={onNavigateToPlans}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 cursor-pointer flex items-center gap-1"
              >
                <span>👑 হোস্টিং প্লান দেখুন</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Gradient Balance Card strictly in USDT */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#00d293]/20 via-[#0d1c2e] to-[#070e18] border border-[#00d293]/30 p-4 sm:p-7 shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Current Balance (বর্তমান ব্যালেন্স)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Auto-Synced
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                    ${(user?.balanceUsd || 0).toFixed(2)}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-[#00d293] px-2 py-0.5 rounded-lg bg-[#00d293]/15 uppercase tracking-wider">
                    USDT
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  এই ব্যালেন্স দিয়ে যেকোনো বট ফাইল, স্ক্রিপ্ট ও হোস্টিং প্লান কিনতে পারবেন।
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
                <button
                  id="wallet-open-deposit-btn"
                  onClick={() => {
                    if (!user) onOpenAuthModal();
                    else setView('deposit');
                  }}
                  className="px-4 py-2.5 sm:py-3 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-[#00d293]/30 cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Deposit USDT</span>
                </button>

                <button
                  onClick={() => {
                    if (!user) onOpenAuthModal();
                    else setView('history');
                  }}
                  className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-[#141f33] hover:bg-[#1c2c48] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer transition-all"
                >
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>হিস্ট্রি</span>
                </button>
              </div>
            </div>

            {/* Quick Mini Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-[#00d293]/20 text-xs">
              <div className="p-2 sm:p-2.5 rounded-xl bg-[#070d17]/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block truncate">মোট সফল ডিপোজিট</span>
                <span className="text-xs sm:text-sm font-black text-emerald-400 block truncate">${depositStats.totalApprovedUsd.toFixed(2)}</span>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-[#070d17]/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block truncate">অপেক্ষমান রিকোয়েস্ট</span>
                <span className="text-xs sm:text-sm font-black text-amber-400 block truncate">{depositStats.pendingCount} টি</span>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-[#070d17]/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block truncate">অনুমোদিত ডিপোজিট</span>
                <span className="text-xs sm:text-sm font-black text-white block truncate">{depositStats.approvedCount} টি</span>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-[#070d17]/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block truncate">সর্বশেষ সিঙ্ক সময়</span>
                <span className="text-[10px] sm:text-[11px] font-mono text-slate-300 block truncate">
                  {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Activity Teaser */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#00d293]" />
                <span>সাম্প্রতিক ডিপোজিট ও লেনদেন</span>
              </h3>
              <button
                onClick={() => setView('history')}
                className="text-xs font-bold text-[#00d293] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>সব হিস্ট্রি দেখুন ({userRequests.length})</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loadingRequests ? (
              <div className="p-8 text-center text-slate-400 text-xs">হিস্ট্রি লোড হচ্ছে...</div>
            ) : userRequests.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#0d1424] border border-[#1e2e42] text-center space-y-2">
                <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">কোনো ডিপোজিট রেকর্ড নেই। এখনই ডিপোজিট করুন।</p>
                <button
                  onClick={() => setView('deposit')}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#00d293] text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>টাকা জমা করুন</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {userRequests.slice(0, 4).map((req) => (
                  <div
                    key={req.id}
                    className="p-3 sm:p-4 rounded-2xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-between shadow-sm hover:border-slate-700 transition gap-2 sm:gap-3 overflow-hidden"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          req.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : req.status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {req.status === 'approved' ? (
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : req.status === 'rejected' ? (
                          <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : (
                          <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                          <span className="uppercase text-[11px] sm:text-xs truncate max-w-[110px] sm:max-w-none">{req.method} Deposit</span>
                          <span
                            className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-black shrink-0 ${
                              req.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : req.status === 'rejected'
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {req.status === 'approved' ? 'সফল' : req.status === 'rejected' ? 'বাতিল' : 'অপেক্ষমান'}
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate font-mono">
                          TrxID: {req.transactionId || 'N/A'} • {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-1 sm:ml-2">
                      <span className="text-xs sm:text-sm font-black text-[#00d293] block whitespace-nowrap">
                        +${Number(req.amount || 0).toFixed(2)} USDT
                      </span>
                      <button
                        onClick={() => setSelectedReceipt(req)}
                        className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer mt-0.5 inline-block"
                      >
                        রসিদ দেখুন
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: DEPOSIT FUNDS */}
      {view === 'deposit' && (
        <div className="space-y-6">
          {/* Back to Wallet Button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setView('overview')}
              className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-[#00d293] cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Wallet</span>
            </button>
            <button
              onClick={() => setView('history')}
              className="text-xs font-bold text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>ডিপোজিট হিস্ট্রি দেখুন</span>
            </button>
          </div>

          {/* Header */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00d293]/15 flex items-center justify-center text-[#00d293]">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              ডিপোজিট মেথড নির্বাচন করুন
            </h2>
          </div>

          {/* Gateways Grid (Binance, bKash, Nagad, Rocket, and any Custom Methods added by admin!) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {/* 1. Binance */}
            {paymentSettings.binanceEnabled !== false && (
              <button
                type="button"
                onClick={() => setSelectedGateway('binance')}
                className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                  selectedGateway === 'binance'
                    ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/30 shadow-lg'
                    : 'bg-[#0d1424] border-[#1e2e42] hover:border-amber-400/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center font-black text-sm shrink-0">
                    ₮
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-white block truncate">Binance Pay</span>
                    <span className="text-[10px] text-amber-400 font-bold truncate">
                      Pay ID / UID
                    </span>
                  </div>
                </div>
              </button>
            )}

            {/* 2. bKash */}
            {paymentSettings.bkashEnabled !== false && (
              <button
                type="button"
                onClick={() => setSelectedGateway('bkash')}
                className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                  selectedGateway === 'bkash'
                    ? 'bg-pink-500/15 border-pink-500 ring-2 ring-pink-500/30 shadow-lg'
                    : 'bg-[#0d1424] border-[#1e2e42] hover:border-pink-500/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {paymentSettings.bkashQrUrl ? (
                    <img
                      src={paymentSettings.bkashQrUrl}
                      alt="bKash"
                      className="w-8 h-8 rounded-lg object-cover border border-pink-500/40 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center font-black text-xs shrink-0">
                      বিকাশ
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-xs font-black text-white block truncate">bKash</span>
                    <span className="text-[10px] text-pink-400 font-bold truncate">Send Money</span>
                  </div>
                </div>
              </button>
            )}

            {/* 3. Nagad */}
            {paymentSettings.nagadEnabled !== false && (
              <button
                type="button"
                onClick={() => setSelectedGateway('nagad')}
                className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                  selectedGateway === 'nagad'
                    ? 'bg-orange-500/15 border-orange-500 ring-2 ring-orange-500/30 shadow-lg'
                    : 'bg-[#0d1424] border-[#1e2e42] hover:border-orange-500/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {paymentSettings.nagadQrUrl ? (
                    <img
                      src={paymentSettings.nagadQrUrl}
                      alt="Nagad"
                      className="w-8 h-8 rounded-lg object-cover border border-orange-500/40 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-black text-xs shrink-0">
                      নগদ
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-xs font-black text-white block truncate">Nagad</span>
                    <span className="text-[10px] text-orange-400 font-bold truncate">Send Money</span>
                  </div>
                </div>
              </button>
            )}

            {/* Custom Methods with Direct Image / QR upload added by Admin */}
            {paymentSettings.customMethods?.filter((cm) => cm.enabled !== false).map((cm) => (
              <button
                key={cm.id}
                type="button"
                onClick={() => setSelectedGateway(cm.id)}
                className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                  selectedGateway === cm.id
                    ? 'bg-emerald-500/15 border-[#00d293] ring-2 ring-[#00d293]/30 shadow-lg'
                    : 'bg-[#0d1424] border-[#1e2e42] hover:border-[#00d293]/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {cm.imageUrl ? (
                    <img
                      src={cm.imageUrl}
                      alt={cm.name}
                      className="w-8 h-8 rounded-lg object-cover border border-[#00d293]/40 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-[#00d293]/20 text-[#00d293] flex items-center justify-center font-black text-xs shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-xs font-black text-white block truncate">{cm.name}</span>
                    <span className="text-[10px] text-[#00d293] font-bold truncate">Custom Pay</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Amount Preset Chips and Input */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0d1424] border border-[#1e2e42] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span>💰</span> ডিপোজিট এমাউন্ট সিলেক্ট করুন (Select Amount):
              </label>
              {selectedGateway !== 'binance' && (
                <span className="text-[11px] font-bold text-amber-400">
                  ১ USDT = ১২০ ৳ (BDT)
                </span>
              )}
            </div>

            {/* Preset Amount Chips */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {PRESET_AMOUNTS.map((amt) => {
                const isSelected = parseFloat(depositAmount) === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositAmount(String(amt))}
                    className={`py-2 px-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 ring-2 ring-amber-400/50 shadow-md scale-[1.02]'
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

              {selectedGateway !== 'binance' && (
                <div className="px-4 py-2 rounded-xl bg-[#0a0f1d] border border-slate-800 flex sm:flex-col justify-between sm:justify-center items-center sm:items-end min-w-[120px]">
                  <span className="text-[10px] text-slate-400 block font-bold">পরিশোধ করতে হবে:</span>
                  <span className="text-sm font-black text-[#00d293]">
                    ৳{calculatedBdt.toLocaleString()} BDT
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* DEPOSIT SUBMISSION FORM (Unified for Binance Pay, bKash, Nagad, Rocket, Custom) */}
          <div className="p-5 sm:p-7 rounded-3xl bg-[#0d1424] border border-[#1e2e42] shadow-xl space-y-5">
            {/* Step-by-Step Payment Instructions */}
            <div className="p-4 rounded-2xl bg-[#070b14] border border-[#1e293b] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>💎</span> {getGatewayTitle()} ডিপোজিট নির্দেশিকা
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00d293]/20 text-[#00d293] font-bold">
                    {selectedGateway === 'binance' ? 'USDT' : '১ USDT = ১২০ টাকা'}
                  </span>
                </div>

                {/* Admin Number / Pay ID with 1-click Copy */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0f172a] border border-slate-700">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-[11px] font-bold text-slate-300">
                      {selectedGateway === 'binance'
                        ? 'এডমিন Binance Pay ID / UID:'
                        : `এডমিন ${getGatewayTitle()} নাম্বার (Send Money):`}
                    </span>
                    <span className="text-base sm:text-lg font-black text-white tracking-wider mt-0.5 font-mono truncate">
                      {getGatewayNumber()}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(getGatewayNumber(), 'gatewayNumber')}
                    className="px-3.5 py-2 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95 shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedField === 'gatewayNumber' ? '✓ কপি হয়েছে!' : 'কপি করুন'}</span>
                  </button>
                </div>

                {/* Direct Uploaded Image / QR Code Display */}
                {getGatewayQrUrl() && (
                  <div className="p-3.5 rounded-xl bg-[#0a0f1d] border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={getGatewayQrUrl()}
                        alt="Payment QR"
                        onClick={() => setPreviewImage(getGatewayQrUrl())}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-contain bg-white p-1 border border-slate-700 shadow-md cursor-pointer hover:scale-105 transition"
                        title="বড় করে দেখতে ক্লিক করুন"
                      />
                      <div>
                        <span className="text-xs font-bold text-white flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                          <span>পেমেন্ট ছবি / কিউআর কোড (Direct QR)</span>
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          আপনার পেমেন্ট অ্যাপ দিয়ে সরাসরি স্ক্যান করে টাকা পাঠাতে পারেন।
                        </p>
                        <button
                          type="button"
                          onClick={() => setPreviewImage(getGatewayQrUrl())}
                          className="mt-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>ছবি বড় করে দেখুন</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Custom Instructions if provided */}
                {getGatewayInstructions() && (
                  <div className="p-3 rounded-xl bg-[#0c1424] border border-slate-800 text-xs text-slate-300">
                    <span className="font-bold text-amber-300 block mb-0.5">নির্দেশনা:</span>
                    <p className="whitespace-pre-line leading-relaxed">{getGatewayInstructions()}</p>
                  </div>
                )}
              </div>

              {/* Form Inputs */}
              <form onSubmit={handleSubmitDeposit} className="space-y-4">
                {selectedGateway !== 'binance' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      ১. আপনার প্রেরক একাউন্ট নাম্বার (যে নাম্বার থেকে টাকা পাঠিয়েছেন)
                    </label>
                    <input
                      type="text"
                      required
                      value={senderIdentifier}
                      onChange={(e) => setSenderIdentifier(e.target.value)}
                      placeholder="e.g. 017XXXXXXXX"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0f172a] border border-[#1e293b] text-sm text-white font-mono focus:border-[#00d293] focus:outline-hidden"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {selectedGateway === 'binance' ? '১. Binance Pay Transaction ID / Order ID' : '২. Transaction ID (TrxID)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. 9J83KLOP01"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0f172a] border border-[#1e293b] text-sm text-white font-bold uppercase tracking-wider focus:border-[#00d293] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    অতিরিক্ত নোট বা মন্তব্য (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={depositNote}
                    onChange={(e) => setDepositNote(e.target.value)}
                    placeholder="কোনো বিশেষ মন্তব্য থাকলে লিখতে পারেন"
                    className="w-full px-4 py-2 rounded-xl bg-[#0f172a] border border-[#1e293b] text-xs text-white focus:border-[#00d293] focus:outline-hidden"
                  />
                </div>

                {submitError && (
                  <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#00d293] to-emerald-400 hover:from-[#00be84] hover:to-emerald-500 text-slate-950 font-black text-sm shadow-xl shadow-[#00d293]/20 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  <Send className="w-4 h-4 stroke-[2.5]" />
                  <span>{submitting ? 'সাবমিট হচ্ছে...' : 'ডিপোজিট রিকোয়েস্ট সাবমিট করুন'}</span>
                </button>
              </form>
            </div>
        </div>
      )}

      {/* VIEW 3: FULL DEPOSIT HISTORY (Add Deposit History) */}
      {view === 'history' && (
        <div className="space-y-6">
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#00d293]/15 flex items-center justify-center text-[#00d293]">
                <Receipt className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  ডিপোজিট হিস্ট্রি (Deposit History)
                </h2>
                <p className="text-xs text-slate-400">
                  আপনার সমস্ত জমা হওয়া ডিপোজিট ও স্ট্যাটাস রিয়েল-টাইমে দেখতে পারবেন।
                </p>
              </div>
            </div>

            <button
              onClick={() => setView('deposit')}
              className="px-4 py-2.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>নতুন ডিপোজিট করুন</span>
            </button>
          </div>

          {/* Stats Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-[#0c1322] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400">মোট সফল ডিপোজিট</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400">
                ${depositStats.totalApprovedUsd.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-500 font-medium">USDT ওয়ালেটে জমা হয়েছে</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0c1322] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400">অপেক্ষমান রিকোয়েস্ট</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-400">
                {depositStats.pendingCount}
              </div>
              <span className="text-[10px] text-slate-500 font-medium">এডমিন ভেরিফিকেশনে আছে</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0c1322] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400">অনুমোদিত রিকোয়েস্ট</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">
                {depositStats.approvedCount}
              </div>
              <span className="text-[10px] text-slate-500 font-medium">সফলভাবে যাচাইকৃত</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0c1322] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400">মোট ট্রানজেকশন</span>
                <Receipt className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">
                {depositStats.totalCount}
              </div>
              <span className="text-[10px] text-slate-500 font-medium">রেকর্ড সংরক্ষিত</span>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="p-4 rounded-2xl bg-[#0c1322] border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setHistoryFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                    historyFilter === 'all'
                      ? 'bg-[#00d293] text-slate-950 font-black'
                      : 'bg-[#141f33] text-slate-300 hover:text-white'
                  }`}
                >
                  সব ({userRequests.length})
                </button>
                <button
                  onClick={() => setHistoryFilter('approved')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1 ${
                    historyFilter === 'approved'
                      ? 'bg-emerald-500 text-white font-black'
                      : 'bg-[#141f33] text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>অনুমোদিত ({depositStats.approvedCount})</span>
                </button>
                <button
                  onClick={() => setHistoryFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1 ${
                    historyFilter === 'pending'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-[#141f33] text-amber-400 hover:bg-amber-500/20'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>অপেক্ষমান ({depositStats.pendingCount})</span>
                </button>
                <button
                  onClick={() => setHistoryFilter('rejected')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1 ${
                    historyFilter === 'rejected'
                      ? 'bg-rose-500 text-white font-black'
                      : 'bg-[#141f33] text-rose-400 hover:bg-rose-500/20'
                  }`}
                >
                  <XCircle className="w-3 h-3" />
                  <span>বাতিল ({depositStats.rejectedCount})</span>
                </button>
              </div>

              {/* Search Box */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="TrxID বা প্রেরক নাম্বার দিয়ে খুঁজুন..."
                  className="w-full pl-9 pr-7 py-2 rounded-xl bg-[#070c16] border border-slate-700/80 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00d293]"
                />
                {historySearchQuery && (
                  <button
                    onClick={() => setHistorySearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Deposit Requests List */}
          {loadingRequests ? (
            <div className="p-12 text-center text-slate-400 text-xs space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#00d293]" />
              <p>হিস্ট্রি লোড হচ্ছে...</p>
            </div>
          ) : filteredHistoryRequests.length === 0 ? (
            <div className="p-12 rounded-3xl bg-[#0c1322] border border-slate-800 text-center space-y-3">
              <Receipt className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">কোনো ডিপোজিট রেকর্ড পাওয়া যায়নি</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {historySearchQuery
                  ? `"${historySearchQuery}" এর সাথে কোনো ট্রানজেকশন মেলেনি।`
                  : 'আপনি এখনও কোনো ডিপোজিট করেননি অথবা এই ক্যাটাগরিতে কোনো হিস্ট্রি নেই।'}
              </p>
              {historySearchQuery && (
                <button
                  onClick={() => {
                    setHistorySearchQuery('');
                    setHistoryFilter('all');
                  }}
                  className="text-xs text-[#00d293] hover:underline font-bold cursor-pointer"
                >
                  সার্চ ও ফিল্টার মুছুন
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistoryRequests.map((req) => {
                const isApproved = req.status === 'approved';
                const isRejected = req.status === 'rejected';
                const isPending = req.status === 'pending';

                return (
                  <div
                    key={req.id}
                    className="p-3.5 sm:p-5 rounded-2xl bg-[#0c1322] border border-slate-800/80 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-md overflow-hidden"
                  >
                    <div className="flex items-start sm:items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                      <div
                        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                          isApproved
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isRejected
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {isApproved ? (
                          <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                        ) : isRejected ? (
                          <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                        ) : (
                          <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-white uppercase truncate">
                            {req.method} Deposit
                          </span>
                          <span
                            className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-black flex items-center gap-1 shrink-0 ${
                              isApproved
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : isRejected
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isApproved ? 'bg-emerald-400' : isRejected ? 'bg-rose-400' : 'bg-amber-400 animate-ping'
                            }`} />
                            <span>
                              {isApproved ? 'অনুমোদিত' : isRejected ? 'বাতিল' : 'অপেক্ষমান'}
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-400 font-mono flex-wrap">
                          <span>TrxID:</span>
                          <span className="text-slate-200 font-bold bg-[#141f33] px-1.5 py-0.5 rounded border border-slate-700 break-all text-[11px]">
                            {req.transactionId || 'N/A'}
                          </span>
                          <button
                            onClick={() => handleCopy(req.transactionId, `trx_${req.id}`)}
                            className="text-slate-400 hover:text-white p-1 cursor-pointer"
                            title="TrxID কপি করুন"
                          >
                            {copiedField === `trx_${req.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {req.senderIdentifier && (
                          <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                            প্রেরক: <span className="text-slate-300 font-mono">{req.senderIdentifier}</span>
                          </p>
                        )}

                        <p className="text-[10px] text-slate-500">
                          তারিখ: {new Date(req.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-800 gap-2 shrink-0">
                      <div className="text-left sm:text-right">
                        <span className="text-sm sm:text-lg font-black text-[#00d293] block whitespace-nowrap">
                          +${Number(req.amount || 0).toFixed(2)} USDT
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-slate-400 font-bold block whitespace-nowrap">
                          ≈ ৳{(Number(req.amount || 0) * BDT_RATE).toLocaleString()} BDT
                        </span>
                      </div>

                      <button
                        onClick={() => setSelectedReceipt(req)}
                        className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#141f33] hover:bg-[#1e2f4d] text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer transition shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#00d293]" />
                        <span>রসিদ দেখুন</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DEPOSIT SUCCESS CELEBRATION ANIMATION MODAL */}
      <AnimatePresence>
        {successAnimationData && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="max-w-md w-full max-h-[90vh] overflow-y-auto bg-gradient-to-b from-[#0e1829] via-[#09101c] to-[#05080f] border-2 border-emerald-500/50 rounded-3xl p-5 sm:p-7 text-center space-y-4 shadow-2xl relative"
            >
              {/* Confetti & Glow FX */}
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-60 h-60 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

              {/* Animated Checkmark Circle */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/40 relative"
              >
                <Check className="w-8 h-8 sm:w-10 sm:h-10 stroke-[3]" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-2 border-dashed border-white/50"
                />
              </motion.div>

              <div className="space-y-1.5 relative z-10">
                <span className="text-[11px] font-black tracking-widest text-emerald-400 uppercase">
                  {successAnimationData.isAutomatic ? 'ইনস্ট্যান্ট পেমেন্ট সফল' : 'রিকোয়েস্ট জমা হয়েছে'}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {successAnimationData.isAutomatic ? 'ডিপোজিট সফল হয়েছে!' : '🎉 রিকোয়েস্ট সফল!'}
                </h3>
                <p className="text-xs text-slate-300">
                  {successAnimationData.isAutomatic
                    ? 'আপনার ওয়ালেটে সাথে সাথে ডলার যোগ হয়েছে।'
                    : 'এডমিন আপনার TrxID ভেরিফাই করে দ্রুত ওয়ালেটে ব্যালেন্স যুক্ত করবেন।'}
                </p>
              </div>

              {/* Amount Display Box */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0a1220] border border-emerald-500/30 space-y-1">
                <span className="text-[11px] font-bold text-slate-400">জমা হওয়া পরিমাণ:</span>
                <div className="text-2xl sm:text-4xl font-black text-[#00d293]">
                  +${successAnimationData.amount.toFixed(2)} USDT
                </div>
                <span className="text-xs font-bold text-slate-400">
                  ≈ ৳{(successAnimationData.amount * BDT_RATE).toLocaleString()} BDT
                </span>
              </div>

              {/* Details table */}
              <div className="text-xs text-left bg-[#070c16] p-3 rounded-xl border border-slate-800 space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">মেথড:</span>
                  <span className="text-white font-bold">{successAnimationData.method}</span>
                </div>
                {successAnimationData.transactionId && (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-400">TrxID:</span>
                    <span className="text-amber-300 font-bold truncate max-w-[200px]">{successAnimationData.transactionId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">স্ট্যাটাস:</span>
                  <span className="text-emerald-400 font-bold">
                    {successAnimationData.isAutomatic ? 'সম্পন্ন (Paid)' : 'ভেরিফিকেশনে আছে (Pending)'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessAnimationData(null);
                    setView('history');
                  }}
                  className="py-2.5 sm:py-3 rounded-xl bg-[#141f33] hover:bg-[#1e2e4a] text-white font-bold text-xs border border-slate-700 cursor-pointer transition"
                >
                  📜 হিস্ট্রি দেখুন
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessAnimationData(null);
                    setView('overview');
                  }}
                  className="py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs cursor-pointer shadow-lg transition hover:opacity-95"
                >
                  ওয়ালেটে যান
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RECEIPT VIEW MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="max-w-md w-full max-h-[90vh] overflow-y-auto bg-[#0c1220] border border-slate-700 rounded-3xl p-5 sm:p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#00d293]" />
                <h4 className="text-sm font-black text-white">ডিপোজিট রসিদ (Deposit Receipt)</h4>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#070b14] border border-slate-800 text-center space-y-1">
              <span className="text-xs text-slate-400">ডিপোজিট এমাউন্ট:</span>
              <div className="text-3xl font-black text-[#00d293]">
                ${Number(selectedReceipt.amount || 0).toFixed(2)} USDT
              </div>
              <span className="text-xs text-slate-400 font-bold">
                ৳{(Number(selectedReceipt.amount || 0) * BDT_RATE).toLocaleString()} BDT
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">স্ট্যাটাস:</span>
                <span className={`font-black uppercase ${
                  selectedReceipt.status === 'approved' ? 'text-emerald-400' : selectedReceipt.status === 'rejected' ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  {selectedReceipt.status}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800 font-mono">
                <span className="text-slate-400">মেথড:</span>
                <span className="text-white font-bold uppercase">{selectedReceipt.method}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800 font-mono">
                <span className="text-slate-400">Transaction ID:</span>
                <span className="text-amber-300 font-bold break-all text-right ml-2">{selectedReceipt.transactionId || 'N/A'}</span>
              </div>
              {selectedReceipt.senderIdentifier && (
                <div className="flex justify-between py-1.5 border-b border-slate-800 font-mono">
                  <span className="text-slate-400">প্রেরক:</span>
                  <span className="text-white break-all text-right ml-2">{selectedReceipt.senderIdentifier}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">রিকোয়েস্ট তারিখ:</span>
                <span className="text-slate-200">{new Date(selectedReceipt.createdAt).toLocaleString()}</span>
              </div>
              {selectedReceipt.note && (
                <div className="py-1.5 text-slate-300">
                  <span className="text-slate-400 block mb-0.5">নোট:</span>
                  <p className="bg-[#070b14] p-2 rounded-lg border border-slate-800">{selectedReceipt.note}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedReceipt(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}

      {/* FULL-SIZE IMAGE PREVIEW MODAL */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="max-w-md w-full max-h-[90vh] overflow-y-auto bg-[#0d1424] border border-amber-500/40 rounded-3xl p-4 space-y-3 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span>পেমেন্ট QR কোড / ছবি</span>
              </span>
              <button
                onClick={() => setPreviewImage(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-white rounded-2xl p-2 flex items-center justify-center shadow-inner">
              <img
                src={previewImage}
                alt="Enlarged QR"
                className="w-full max-h-80 object-contain rounded-xl"
              />
            </div>
            <p className="text-[11px] text-center text-slate-400">
              আপনার ব্যাংকিং বা ওয়ালেট অ্যাপ দিয়ে সরাসরি স্ক্যান করে পেমেন্ট করুন।
            </p>
          </div>
        </div>
      )}

      {/* ACTIVE BINANCE ORDER CHECKOUT MODAL */}
      {activeBinanceOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="max-w-md w-full max-h-[90vh] overflow-y-auto bg-[#0c1220] border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-black text-sm">
                  ₮
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">Binance Pay Checkout</h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Order: #{activeBinanceOrder.orderId.substring(4, 14)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveBinanceOrder(null);
                  setBinancePaymentPaid(false);
                }}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Success State */}
            {binancePaymentPaid || activeBinanceOrder.status === 'PAID' ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40 flex items-center justify-center mx-auto animate-bounce">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">পেমেন্ট সফল হয়েছে!</h3>
                  <p className="text-xs text-emerald-400 font-bold mt-1">
                    ${activeBinanceOrder.amount} USDT আপনার ওয়ালেটে সাথে সাথে যুক্ত হয়েছে।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveBinanceOrder(null);
                    setBinancePaymentPaid(false);
                    setView('overview');
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs cursor-pointer shadow-lg transition-all"
                >
                  ওয়ালেট ব্যালেন্স দেখুন
                </button>
              </div>
            ) : (
              /* Pending Payment State */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#070b14] border border-amber-500/30 text-center space-y-1">
                  <span className="text-xs font-bold text-slate-400">পরিশোধযোগ্য পরিমাণ:</span>
                  <div className="text-2xl font-black text-amber-400 font-mono flex items-center justify-center gap-2">
                    <span>${activeBinanceOrder.amount} USDT</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(`${activeBinanceOrder.amount}`, 'modal_amt')}
                      className="text-[11px] px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 font-bold hover:bg-amber-400/30 cursor-pointer"
                    >
                      {copiedField === 'modal_amt' ? '✓ কপি!' : 'কপি'}
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-amber-300 font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>
                      {activeBinanceOrder.isDirectMode
                        ? 'Binance Pay ID তে সেন্ড করুন অথবা QR স্ক্যান করুন'
                        : 'পেমেন্ট অনুমোদনের অপেক্ষা করা হচ্ছে...'}
                    </span>
                  </div>
                </div>

                {/* Direct Pay Info Box */}
                {activeBinanceOrder.isDirectMode && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-bold">Binance Pay ID:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-amber-400 text-sm">
                          {activeBinanceOrder.binancePayId || '922593999'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(activeBinanceOrder.binancePayId || '922593999', 'modal_payid')}
                          className="px-2 py-0.5 rounded-md bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 font-bold text-[10px] cursor-pointer"
                        >
                          {copiedField === 'modal_payid' ? '✓ কপি!' : 'কপি'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Primary Button */}
                <a
                  href={activeBinanceOrder.deeplink || activeBinanceOrder.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:opacity-95 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 transition-all text-center"
                >
                  <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {activeBinanceOrder.isDirectMode ? 'Binance অ্যাপে ওপেন করুন' : 'সরাসরি Binance Pay তে যান'}
                  </span>
                </a>

                {/* QR Code for Binance mobile app scanning */}
                <div className="p-2.5 bg-white rounded-2xl mx-auto w-40 h-40 flex items-center justify-center shadow-inner">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                      activeBinanceOrder.checkoutUrl || activeBinanceOrder.qrContent || ''
                    )}`}
                    alt="Binance Pay QR Code"
                    className="w-36 h-36 object-contain"
                  />
                </div>
                <p className="text-[11px] text-center text-slate-400">
                  Binance মোবাইল অ্যাপ দিয়ে উপরের QR কোডটি স্ক্যান করেও পে করতে পারেন।
                </p>

                {/* Direct Pay: Instant TrxID Submission Form */}
                {activeBinanceOrder.isDirectMode ? (
                  <form onSubmit={handleModalSubmitTrx} className="space-y-2 pt-1 border-t border-slate-800">
                    <label className="block text-[11px] font-bold text-slate-300">
                      পেমেন্ট শেষ হলে Binance Order ID / TrxID দিন:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={modalTrxId}
                        onChange={(e) => setModalTrxId(e.target.value)}
                        placeholder="e.g. 2938491829..."
                        className="flex-1 bg-[#070b14] border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                      />
                      <button
                        type="submit"
                        disabled={modalSubmitting || !modalTrxId.trim()}
                        className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer disabled:opacity-40 transition-all shrink-0"
                      >
                        {modalSubmitting ? '...' : 'কনফার্ম'}
                      </button>
                    </div>

                    {modalErrorMsg && (
                      <p className="text-[11px] text-rose-400 font-bold">{modalErrorMsg}</p>
                    )}
                    {modalSuccessMsg && (
                      <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>{modalSuccessMsg}</span>
                      </div>
                    )}
                  </form>
                ) : (
                  /* Automated Check Status button */
                  <button
                    type="button"
                    onClick={handleManualCheckBinanceOrder}
                    disabled={checkingBinanceStatus}
                    className="w-full py-2.5 rounded-xl bg-[#141e33] hover:bg-[#1a2742] border border-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${checkingBinanceStatus ? 'animate-spin' : ''}`} />
                    <span>{checkingBinanceStatus ? 'যাচাই করা হচ্ছে...' : 'আমি পেমেন্ট করেছি, চেক করুন (Verify Now)'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
