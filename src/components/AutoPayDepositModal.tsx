import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowLeft,
  X,
  Copy,
  Check,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Lock,
  ChevronDown,
  Sparkles,
  Phone
} from 'lucide-react';
import { AuthUser, DepositMethodItem } from '../types';
import { playDepositSuccessSound } from '../utils/audioAlert';

interface AutoPayDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  onOpenAuthModal: () => void;
  methods: DepositMethodItem[];
  onDepositSuccess?: (receipt: {
    orderId: string;
    amount: number;
    currency: string;
    method: string;
    trxId: string;
    bdtAmount?: number;
    rateToBdt?: number;
  }) => void;
  lang?: 'bn' | 'en';
}

export function AutoPayDepositModal({
  isOpen,
  onClose,
  user,
  onOpenAuthModal,
  methods,
  onDepositSuccess,
  lang = 'bn'
}: AutoPayDepositModalProps) {
  // Step 1: amount, Step 2: method selection, Step 3: payment details & trx submission
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [amountBdt, setAmountBdt] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<DepositMethodItem | null>(null);

  // Step 3 form states
  const [senderNumber, setSenderNumber] = useState<string>('');
  const [trxId, setTrxId] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    orderId: string;
    amountUsd: number;
    amountBdt: number;
    methodName: string;
    trxId: string;
  } | null>(null);

  // Active enabled methods from admin
  const activeMethods = methods.filter((m) => m.enabled !== false);
  const mfsMethods = activeMethods.filter((m) => m.category === 'mfs' || m.currency === 'BDT');
  // Fallback to activeMethods if no mfs methods specifically
  const displayMethods = mfsMethods.length > 0 ? mfsMethods : activeMethods;

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setAmountBdt('');
      setSelectedMethod(null);
      setSenderNumber('');
      setTrxId('');
      setErrorMessage(null);
      setSuccessInfo(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const getMethodThemeClass = (m: DepositMethodItem | null) => {
    if (!m) return { bg: 'bg-[#5b21b6]', border: 'border-[#5b21b6]', text: 'text-[#5b21b6]', hex: '#5b21b6' };
    const nameLower = m.name.toLowerCase();
    const idLower = m.id.toLowerCase();
    if (nameLower.includes('bkash') || idLower.includes('bkash') || m.logoType === 'bkash') {
      return { bg: 'bg-[#e2136e]', border: 'border-[#e2136e]', text: 'text-[#e2136e]', hex: '#e2136e' };
    }
    if (nameLower.includes('nagad') || idLower.includes('nagad') || m.logoType === 'nagad') {
      return { bg: 'bg-[#f7941d]', border: 'border-[#f7941d]', text: 'text-[#f7941d]', hex: '#f7941d' };
    }
    if (nameLower.includes('rocket') || idLower.includes('rocket') || m.logoType === 'rocket') {
      return { bg: 'bg-[#8c3494]', border: 'border-[#8c3494]', text: 'text-[#8c3494]', hex: '#8c3494' };
    }
    if (m.color) {
      return { bg: 'bg-slate-800', border: 'border-slate-700', text: 'text-amber-400', hex: m.color };
    }
    return { bg: 'bg-[#5b21b6]', border: 'border-[#5b21b6]', text: 'text-[#5b21b6]', hex: '#5b21b6' };
  };

  const getMethodLogoUrl = (m: DepositMethodItem) => {
    if (m.logoUrl) return m.logoUrl;
    const nameLower = m.name.toLowerCase();
    if (nameLower.includes('bkash')) return 'https://i.ibb.co.com/7N6nH6P6/images.png';
    if (nameLower.includes('nagad')) return 'https://i.ibb.co.com/LDLfDhC9/images.jpg';
    if (nameLower.includes('rocket')) return 'https://i.ibb.co.com/mr7Hs740/images-1.png';
    return '/logo-icon.png';
  };

  // Step 1 -> Step 2 validation
  const goToMethodStep = () => {
    const num = parseFloat(amountBdt);
    if (!num || num < 10) {
      setErrorMessage('অনুগ্রহ করে ন্যূনতম ১০ টাকা বা তার বেশি পরিমাণ লিখুন');
      return;
    }
    setErrorMessage(null);
    setCurrentStep(2);
  };

  // Step 2 -> Step 3
  const handleSelectMethod = (m: DepositMethodItem) => {
    setSelectedMethod(m);
    setErrorMessage(null);
    setCurrentStep(3);
  };

  // Step 3: Submit deposit to backend
  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!user) {
      onOpenAuthModal();
      return;
    }

    if (!selectedMethod) {
      setErrorMessage('পেমেন্ট মেথড সিলেক্ট করুন');
      return;
    }

    const numBdt = parseFloat(amountBdt);
    if (!numBdt || numBdt < 10) {
      setErrorMessage('সঠিক ডিপোজিট পরিমাণ নির্ধারণ করুন (ন্যূনতম ১০ টাকা)');
      return;
    }

    if (!senderNumber.trim()) {
      setErrorMessage('যে নাম্বার থেকে টাকা পাঠিয়েছেন তা লিখুন');
      return;
    }

    if (!trxId.trim()) {
      setErrorMessage('পেমেন্টের পর প্রাপ্ত Transaction ID (TrxID) লিখুন');
      return;
    }

    setSubmitting(true);
    try {
      const rate = selectedMethod.rateToBdt || 120;
      const amountUsd = parseFloat((numBdt / rate).toFixed(2));
      const orderIdGen = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const cleanTrx = trxId.trim().toUpperCase();

      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          amount: amountUsd,
          currency: 'USD',
          method: selectedMethod.name,
          senderIdentifier: senderNumber.trim(),
          transactionId: cleanTrx,
          bdtAmount: numBdt,
          rateToBdt: rate,
          orderId: orderIdGen,
          userId: user.id,
          userEmail: user.email,
          note: `AutoPay Deposit (${selectedMethod.name} - ৳${numBdt} BDT / $${amountUsd} USD)`
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        playDepositSuccessSound();
        const receipt = {
          orderId: orderIdGen,
          amount: amountUsd,
          currency: 'USD',
          method: selectedMethod.name,
          trxId: cleanTrx,
          bdtAmount: numBdt,
          rateToBdt: rate
        };
        setSuccessInfo({
          orderId: orderIdGen,
          amountUsd,
          amountBdt: numBdt,
          methodName: selectedMethod.name,
          trxId: cleanTrx
        });
        if (onDepositSuccess) {
          onDepositSuccess(receipt);
        }
      } else {
        setErrorMessage(data.error || 'ডিপোজিট সাবমিট ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'নেটওয়ার্ক সংযোগে সমস্যা হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  const theme = getMethodThemeClass(selectedMethod);
  const parsedBdt = parseFloat(amountBdt) || 0;
  const currentRate = selectedMethod?.rateToBdt || 120;
  const parsedUsd = parsedBdt > 0 ? (parsedBdt / currentRate).toFixed(2) : '0.00';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#faf8fc] text-[#1e1b2e] min-h-screen sm:min-h-0 sm:rounded-2xl shadow-2xl overflow-hidden relative flex flex-col sm:max-h-[92vh]">
        
        {/* ============================================================== */}
        {/* SUCCESS RECEIPT STATE */}
        {/* ============================================================== */}
        {successInfo ? (
          <div className="p-6 text-center space-y-5 my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">পেমেন্ট সফলভাবে জমা হয়েছে!</h3>
              <p className="text-xs text-gray-600 mt-1">
                আপনার ডিপোজিট রিকোয়েস্ট অ্যাডমিন প্যানেলে পাঠানো হয়েছে। অ্যাডমিন অনুমোদন করলেই স্বয়ংক্রিয়ভাবে ব্যালেন্স জমা হবে।
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-[#e2dbf0] shadow-sm text-left space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-500">অর্ডার নম্বর:</span>
                <span className="font-mono font-bold text-gray-900">#{successInfo.orderId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">পরিশোধিত টাকা:</span>
                <span className="font-bold text-[#e2136e] text-sm">৳{successInfo.amountBdt.toLocaleString()} BDT</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">ওয়ালেটে জমা হবে:</span>
                <span className="font-bold text-emerald-600 text-sm">${successInfo.amountUsd} USD</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">মেথড:</span>
                <span className="font-bold text-gray-800">{successInfo.methodName}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="text-gray-500">Transaction ID:</span>
                <span className="font-mono font-bold text-gray-900 truncate max-w-[180px]">{successInfo.trxId}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full bg-[#5b21b6] hover:bg-[#4c1d95] text-white font-bold py-3 rounded-xl shadow-lg transition-all text-xs uppercase tracking-wider"
            >
              সম্পন্ন করুন (Close)
            </button>
          </div>
        ) : (
          <>
            {/* ============================================================== */}
            {/* STEP 1: AMOUNT INPUT (Matching New File6.html am-step-1) */}
            {/* ============================================================== */}
            {currentStep === 1 && (
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* Top Bar */}
                  <div className="bg-white p-3.5 shadow-sm border-b border-[#e9e3f5] flex items-center justify-between">
                    <h2 className="font-bold text-sm text-[#1e1b2e] uppercase tracking-wide flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-[#5b21b6]" />
                      <span>Add Money / ডিপোজিট</span>
                    </h2>
                    <button
                      type="button"
                      onClick={onClose}
                      className="text-[#9ca3af] hover:text-gray-700 p-1"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e2dbf0] text-center">
                      <label className="block text-[#6b7280] text-[11px] font-bold mb-3 uppercase tracking-wider">
                        Enter Amount to Deposit (টাকার পরিমাণ লিখুন)
                      </label>

                      <div className="relative mb-5 max-w-[180px] mx-auto">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl font-bold text-[#9ca3af]">
                          ৳
                        </span>
                        <input
                          type="number"
                          min="10"
                          value={amountBdt}
                          onChange={(e) => {
                            setAmountBdt(e.target.value);
                            setErrorMessage(null);
                          }}
                          placeholder="0"
                          className="w-full border-b-2 border-gray-300 py-2 pl-9 pr-2 text-center text-2xl font-bold text-[#1e1b2e] focus:outline-none focus:border-[#e2136e] transition-colors bg-transparent"
                          autoFocus
                        />
                      </div>

                      {/* Quick Presets */}
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        {[100, 200, 500, 1000].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setAmountBdt(String(preset))}
                            className="py-1.5 px-2 rounded-lg bg-[#f3effa] hover:bg-[#e9e3f5] text-xs font-bold text-[#5b21b6] border border-[#e2dbf0] transition-colors"
                          >
                            ৳{preset}
                          </button>
                        ))}
                      </div>

                      {errorMessage && (
                        <div className="mb-3 p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-600 font-semibold">
                          {errorMessage}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={goToMethodStep}
                        className="w-full bg-[#5b21b6] hover:bg-[#4c1d95] text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all text-xs uppercase tracking-wide cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>PROCEED TO PAYMENT</span>
                      </button>
                    </div>

                    <div className="mt-4 p-3 rounded-xl bg-purple-50/70 border border-purple-100 text-[11px] text-[#5b21b6] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 shrink-0 text-[#5b21b6]" />
                      <span>স্বয়ংক্রিয় ও নিরাপদ মোবাইল ব্যাংকিং গেটওয়ে (bKash, Nagad, Rocket)</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 text-center text-[10px] text-gray-400">
                  Secure Checkout Powered by Auto Pay
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* STEP 2: PAYMENT METHOD (Matching New File6.html am-step-2) */}
            {/* ============================================================== */}
            {currentStep === 2 && (
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* Top Bar with Back Arrow, Deposit Title, Close */}
                  <div className="bg-white p-3 flex items-center justify-between shadow-sm sticky top-0 z-10 border-b border-[#e9e3f5]">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-[#6b7280] hover:text-gray-900 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="text-center">
                      <span className="font-bold text-xs text-[#5b21b6] uppercase tracking-wider">
                        Deposit ৳{amountBdt} BDT
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="text-[#9ca3af] hover:text-gray-700 w-8 h-8 flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col justify-center items-center px-5 py-6">
                    <div className="bg-white rounded-full w-20 h-20 flex items-center justify-center shadow-sm border border-[#e9e3f5] mb-2 p-3">
                      <Wallet className="w-10 h-10 text-[#5b21b6]" />
                    </div>

                    <h2 className="text-[#6b7280] font-semibold mb-4 text-sm uppercase tracking-wide">
                      Auto Pay
                    </h2>

                    {/* Blue Title Header Banner */}
                    <div className="w-full bg-[#003399] text-white py-2 text-center text-xs font-bold rounded-t-xl mb-0 shadow-md">
                      মোবাইল ব্যাংকিং
                    </div>

                    {/* Gateways Grid */}
                    <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-white p-3 rounded-b-xl shadow-sm border border-[#e2dbf0] border-t-0">
                      {displayMethods.map((m) => {
                        const logoUrl = getMethodLogoUrl(m);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleSelectMethod(m)}
                            className="bg-white border border-[#e2dbf0] rounded-xl p-2.5 flex items-center justify-center hover:border-pink-500 hover:shadow-md transition h-14 group cursor-pointer active:scale-95"
                          >
                            <img
                              src={logoUrl}
                              className="h-6 max-w-[90px] object-contain group-hover:scale-105 transition-transform"
                              alt={m.name}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/logo-icon.png';
                              }}
                            />
                          </button>
                        );
                      })}
                    </div>

                    {/* Notice */}
                    <div className="mt-4 text-center">
                      <p className="text-[11px] text-gray-500">
                        আপনার পছন্দের পেমেন্ট মাধ্যম নির্বাচন করুন
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 text-center text-[10px] text-gray-400">
                  Auto Pay Bangladesh • All rights reserved
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* STEP 3: PAYMENT SUBMISSION (Matching New File6.html am-step-3) */}
            {/* ============================================================== */}
            {currentStep === 3 && selectedMethod && (
              <div className="flex-1 flex flex-col justify-between overflow-y-auto max-h-[85vh]">
                <div>
                  {/* Top Bar with Back, Language Pill, Close */}
                  <div className="bg-white p-2.5 shadow-sm flex justify-between items-center sticky top-0 z-20 border-b border-[#e9e3f5]">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="w-8 h-8 rounded-full bg-[#f3effa] flex items-center justify-center text-[#6b7280] hover:bg-[#e9e3f5]"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="bg-[#f3effa] px-2.5 py-1 rounded-full text-[10px] font-bold text-[#6b7280] flex items-center gap-1">
                        <span>Bangla</span>
                        <ChevronDown className="w-3 h-3" />
                      </span>
                      <button
                        type="button"
                        onClick={onClose}
                        className="text-[#9ca3af] hover:text-gray-700 w-8 h-8 flex items-center justify-center"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Payment Method Logo Center */}
                  <div className="text-center py-3">
                    <img
                      src={getMethodLogoUrl(selectedMethod)}
                      className="h-8 mx-auto object-contain drop-shadow-sm"
                      alt={selectedMethod.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/logo-icon.png';
                      }}
                    />
                  </div>

                  <div className="px-3.5 space-y-3 pb-6">
                    {/* Amount Pill Display */}
                    <div className="bg-white rounded-xl p-2.5 shadow-sm flex items-center justify-between border border-[#e2dbf0]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-bold text-gray-700">৳</span>
                        <span className="text-xl font-bold text-[#1e1b2e]">
                          {amountBdt}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                        ≈ ${parsedUsd} USD
                      </span>
                    </div>

                    {/* Payment Theme Card (bKash pink / Nagad orange / Rocket purple) */}
                    <div
                      style={{ backgroundColor: theme.hex }}
                      className="rounded-2xl shadow-lg overflow-hidden text-white mb-3 relative transition-colors duration-300 p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-90">
                          {selectedMethod.name} Personal
                        </span>
                        <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded font-bold">
                          Send Money
                        </span>
                      </div>

                      <div className="mb-3">
                        <div className="text-[10px] opacity-80 mb-0.5">
                          {selectedMethod.accountLabel || 'মার্চেন্ট / পার্সোনাল একাউন্ট নম্বর:'}
                        </div>
                        <div className="flex items-center justify-between bg-black/15 p-2 rounded-lg border border-white/20">
                          <span className="font-mono text-base font-bold tracking-wider">
                            {selectedMethod.accountValue}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(selectedMethod.accountValue, 'accNum')}
                            className="text-xs bg-white text-gray-900 px-3 py-1 rounded font-bold hover:bg-gray-100 active:scale-95 transition-all flex items-center gap-1 shadow-sm"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedField === 'accNum' ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Instructions in card */}
                      <div className="text-[10px] leading-relaxed bg-black/20 p-2.5 rounded-lg border border-white/10">
                        {selectedMethod.instructions || 'উল্লেখিত নম্বরে Send Money করুন। টাকা পাঠানো শেষে প্রাপ্ত TrxID নিচে লিখুন।'}
                      </div>
                    </div>

                    {/* Step-by-Step Instructions Text Box */}
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-[#e2dbf0] text-xs text-gray-700 space-y-1.5">
                      <div className="font-bold text-[#1e1b2e] flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#5b21b6]" />
                        <span>টাকা পাঠানোর নিয়ম:</span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-600">
                        <li>আপনার {selectedMethod.name} অ্যাপ বা ডায়াল কোড ওপেন করুন।</li>
                        <li><strong>Send Money</strong> অপশন বেছে নিয়ে উপরের নম্বরটি পেস্ট করুন।</li>
                        <li>ঠিক <strong>৳{amountBdt}</strong> টাকা পাঠিয়ে ট্রানজেকশন সফল করুন।</li>
                        <li>পেমেন্ট শেষ হলে নিচে আপনার নম্বর ও TrxID লিখে সাবমিট করুন।</li>
                      </ol>
                    </div>

                    {/* Error Banner */}
                    {errorMessage && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {/* Submission Form */}
                    <form onSubmit={handleSubmitDeposit} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          আপনার {selectedMethod.name} নম্বর (যে নম্বর থেকে পাঠিয়েছেন): *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={senderNumber}
                            onChange={(e) => setSenderNumber(e.target.value)}
                            placeholder="যেমন: 017XXXXXXXX"
                            className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#e2dbf0] text-sm text-[#1e1b2e] font-mono focus:border-[#5b21b6] focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Transaction ID (TrxID): *
                        </label>
                        <input
                          type="text"
                          required
                          value={trxId}
                          onChange={(e) => setTrxId(e.target.value)}
                          placeholder="যেমন: 9J7A29DFG"
                          className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#e2dbf0] text-sm text-[#1e1b2e] font-mono uppercase focus:border-[#5b21b6] focus:outline-none transition-colors"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        style={{ backgroundColor: theme.hex }}
                        className="w-full text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <span>যাচাই করা হচ্ছে...</span>
                        ) : (
                          <span>পেমেন্ট নিশ্চিত করুন (SUBMIT)</span>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
