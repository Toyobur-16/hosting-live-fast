import React, { useState } from 'react';
import {
  Play,
  Film,
  Sparkles,
  Wallet,
  CheckCircle2,
  ArrowRight,
  Globe,
  Bot,
  ShieldCheck,
  Zap,
  ExternalLink,
  HelpCircle,
  X,
  CreditCard
} from 'lucide-react';

interface HostingTutorialSectionProps {
  lang?: 'bn' | 'en' | string;
  videoUrl?: string;
  onNavigateToWallet?: () => void;
  onNavigateToPlans?: () => void;
  onNavigateToDeploy?: () => void;
  defaultOpenVideo?: boolean;
  type?: 'general' | 'website' | 'plans';
}

/**
 * Normalizes any YouTube URL (watch?v=, youtu.be, shorts/) to an embed URL
 */
export function getEmbedVideoUrl(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim();
  if (!clean) return null;

  // YouTube watch?v=ID
  const watchMatch = clean.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (watchMatch && watchMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${watchMatch[1]}?autoplay=1&rel=0`;
  }

  // Direct iframe / video link
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  return null;
}

export function HostingTutorialSection({
  lang = 'bn',
  videoUrl,
  onNavigateToWallet,
  onNavigateToPlans,
  onNavigateToDeploy,
  type = 'general'
}: HostingTutorialSectionProps) {
  const [showVideoModal, setShowVideoModal] = useState(false);
  const embedUrl = getEmbedVideoUrl(videoUrl);

  const steps = [
    {
      step: 1,
      titleBn: 'ওয়ালেটে ব্যালেন্স ডিপোজিট করুন',
      titleEn: 'Deposit Balance to Wallet',
      descBn: 'বিকাশ, নগদ বা Binance Pay দিয়ে ইনস্ট্যান্ট ব্যালেন্স যোগ করুন।',
      descEn: 'Add instant balance via bKash, Nagad, or Binance Pay.',
      icon: Wallet,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/30'
    },
    {
      step: 2,
      titleBn: 'পছন্দের হোস্টিং প্ল্যান বেছে নিন',
      titleEn: 'Select Your Hosting Plan',
      descBn: '১ মাস, ৩ মাস, ৬ মাস বা ১ বছরের প্রিমিয়াম সার্ভার প্ল্যান সিলেক্ট করুন।',
      descEn: 'Choose 1 Month, 3 Months, 6 Months, or 1 Year hosting package.',
      icon: CreditCard,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10 border-cyan-500/30'
    },
    {
      step: 3,
      titleBn: '১-ক্লিকে ইনস্ট্যান্ট চালু করুন',
      titleEn: '1-Click Instant Activation',
      descBn: '"প্ল্যান চালু করুন" বাটনে চাপ দিলেই ব্যালেন্স থেকে স্বয়ংক্রিয়ভাবে সক্রিয় হবে।',
      descEn: 'Click "Activate Plan" to instantly activate using your wallet balance.',
      icon: Zap,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/30'
    },
    {
      step: 4,
      titleBn: 'বট বা ওয়েবসাইট লাইভ চালান',
      titleEn: 'Run Bot or Website 24/7',
      descBn: 'কোড আপলোড করে ২৪/৭ সুপারফাস্ট ক্লাউড সার্ভারে সচল রাখুন।',
      descEn: 'Upload files and keep your projects running 24/7 non-stop.',
      icon: Globe,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/30'
    }
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1424] via-[#0f1b33] to-[#14233e] border border-cyan-500/30 p-5 sm:p-7 shadow-2xl mb-8">
      {/* Glow Orbs */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

      <div className="relative z-10">
        {/* Header Badge & Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-black tracking-wide uppercase">
              <Film className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lang === 'bn' ? 'ভিডিও টিউটোরিয়াল ও হোস্টিং গাইড' : 'Video Tutorial & Guide'}</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {lang === 'bn'
                ? 'কিভাবে হোস্টিং নিবেন ও সার্ভিস চালু করবেন?'
                : 'How to Get Hosting & Activate Services?'}
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {lang === 'bn'
                ? 'নিচের সহজ ৪টি ধাপে আপনি যেকোনো সময় ক্লাউড হোস্টিং নিতে পারেন। সম্পূর্ণ প্রক্রিয়াটি বুঝতে ভিডিও টিউটোরিয়াল দেখুন।'
                : 'Follow the 4 simple steps below to purchase hosting anytime, or watch our complete video tutorial.'}
            </p>
          </div>

          {/* Watch Video Button */}
          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={() => setShowVideoModal(true)}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs sm:text-sm flex items-center gap-2.5 shadow-lg shadow-red-600/30 transition-all hover:scale-102 active:scale-98 cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
              </div>
              <span>{lang === 'bn' ? 'ভিডিও টিউটোরিয়াল দেখুন' : 'Watch Video Tutorial'}</span>
            </button>
          </div>
        </div>

        {/* 4 Step Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          {steps.map((st) => {
            const Icon = st.icon;
            return (
              <div
                key={st.step}
                className="p-4 rounded-2xl bg-[#080e1b]/80 border border-slate-800/80 hover:border-cyan-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 text-cyan-400 font-black text-xs flex items-center justify-center border border-slate-700">
                      {st.step}
                    </span>
                    <div className={`w-8 h-8 rounded-xl ${st.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${st.color}`} />
                    </div>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white mb-1">
                    {lang === 'bn' ? st.titleBn : st.titleEn}
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {lang === 'bn' ? st.descBn : st.descEn}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Shortcuts Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              {lang === 'bn'
                ? 'ইনস্ট্যান্ট অটো-অ্যাক্টিভেশন • ২৪/৭ রিয়েলটাইম লাইভ সাপোর্ট'
                : 'Instant Auto-Activation • 24/7 Live Support'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToWallet && (
              <button
                onClick={onNavigateToWallet}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'ওয়ালেট টপ-আপ' : 'Top-Up Wallet'}</span>
              </button>
            )}

            {onNavigateToPlans && (
              <button
                onClick={onNavigateToPlans}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>{lang === 'bn' ? 'প্ল্যান দেখুন' : 'View Plans'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Video Tutorial Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0b1222] border border-cyan-500/40 rounded-3xl max-w-3xl w-full text-slate-100 shadow-2xl overflow-hidden flex flex-col relative">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-[#070b14] border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">
                    {lang === 'bn' ? 'ভিডিও টিউটোরিয়াল: কিভাবে হোস্টিং নিবেন' : 'Video Tutorial: How to Get Hosting'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'bn' ? 'সহজেই ওয়ালেট ডিপোজিট করে হোস্টিং চালু করার সম্পূর্ণ গাইড' : 'Complete step-by-step video guide'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowVideoModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player Container */}
            <div className="relative aspect-video bg-black w-full flex items-center justify-center">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title="Hosting Video Tutorial"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="text-center p-8 max-w-md space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
                    <Film className="w-8 h-8" />
                  </div>
                  <h5 className="text-base font-bold text-white">
                    {lang === 'bn' ? 'হোস্টিং নেওয়ার ভিডিও টিউটোরিয়াল' : 'Hosting Video Tutorial'}
                  </h5>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {lang === 'bn'
                      ? 'এডমিন প্যানেলের সাইট সেটিংস থেকে আপনার ইউটিউব বা ভিডিও লিংক যুক্ত করলে সরাসরি এখানে প্লে হবে।'
                      : 'Add your YouTube or video link in Admin Settings to play it here.'}
                  </p>
                  <div className="p-3 rounded-xl bg-[#0f172a] border border-slate-800 text-left space-y-2 text-xs text-slate-300">
                    <p className="font-bold text-cyan-400">⚡ সংক্ষিপ্ত নির্দেশিকা:</p>
                    <p>১. ওয়ালেটে bKash, Nagad বা Binance Pay দিয়ে ব্যালেন্স যোগ করুন।</p>
                    <p>২. হোস্টিং প্ল্যান পেজে গিয়ে যেকোনো প্ল্যান ইনস্ট্যান্ট চালু করুন।</p>
                    <p>৩. সাথে সাথে টেলিগ্রাম বট বা ওয়েবসাইট লাইভ সার্ভার রেডি হয়ে যাবে!</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#070b14] border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-400">
                {lang === 'bn' ? 'কোনো সহায়তার প্রয়োজন হলে আমাদের সাথে যোগাযোগ করুন।' : 'Need assistance? Reach out to support.'}
              </span>
              <button
                onClick={() => setShowVideoModal(false)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black cursor-pointer transition"
              >
                {lang === 'bn' ? 'ঠিক আছে' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
