import React, { useState, useEffect } from 'react';
import {
  Film,
  Play,
  Wallet,
  CreditCard,
  Zap,
  Globe,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Server,
  PlusCircle,
  HelpCircle,
  Sparkles,
  Layers
} from 'lucide-react';
import { getEmbedVideoUrl } from './HostingTutorialSection';

interface HostingTutorialPageProps {
  lang?: 'bn' | 'en';
  onNavigateToWallet: () => void;
  onNavigateToPlans: () => void;
  onNavigateToDeploy: () => void;
  onNavigateToWebsites: () => void;
  onNavigateToFaq: () => void;
}

export function HostingTutorialPage({
  lang = 'bn',
  onNavigateToWallet,
  onNavigateToPlans,
  onNavigateToDeploy,
  onNavigateToWebsites,
  onNavigateToFaq
}: HostingTutorialPageProps) {
  const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);
  const [showVideoModal, setShowVideoModal] = useState(false);

  useEffect(() => {
    fetch('/api/site-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.hostingVideoUrl) {
          setVideoUrl(data.hostingVideoUrl);
        }
      })
      .catch(() => {});
  }, []);

  const embedUrl = getEmbedVideoUrl(videoUrl);

  const steps = [
    {
      step: 1,
      titleBn: 'ওয়ালেটে ব্যালেন্স ডিপোজিট করুন',
      titleEn: 'Deposit Balance to Wallet',
      descBn: 'বিকাশ, নগদ বা Binance Pay (USDT) দিয়ে আপনার অ্যাকাউন্টে প্রয়োজনীয় ব্যালেন্স ইনস্ট্যান্ট যোগ করুন।',
      descEn: 'Add required balance instantly via bKash, Nagad, or Binance Pay (USDT).',
      icon: Wallet,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/30',
      btnTextBn: '💳 ডিপোজিট পেজে যান',
      btnTextEn: 'Go to Wallet Deposit',
      btnAction: onNavigateToWallet,
      btnColor: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
    },
    {
      step: 2,
      titleBn: 'পছন্দের হোস্টিং প্ল্যান বেছে নিন',
      titleEn: 'Select Your Hosting Plan',
      descBn: '১ মাস, ৩ মাস, ৬ মাস বা ১ বছরের প্রিমিয়াম ক্লাউড হোস্টিং প্যাকেজ থেকে আপনার পছন্দের প্ল্যান নির্বাচন করুন।',
      descEn: 'Choose your desired 1 Month, 3 Months, 6 Months, or 1 Year hosting package.',
      icon: CreditCard,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10 border-cyan-500/30',
      btnTextBn: '👑 হোস্টিং প্ল্যান দেখুন',
      btnTextEn: 'View Hosting Plans',
      btnAction: onNavigateToPlans,
      btnColor: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black'
    },
    {
      step: 3,
      titleBn: '১-ক্লিকে ইনস্ট্যান্ট চালু করুন',
      titleEn: '1-Click Instant Activation',
      descBn: '"প্ল্যান চালু করুন" বাটনে চাপ দিলেই ওয়ালেট ব্যালেন্স থেকে সার্ভিস স্বয়ংক্রিয়ভাবে সক্রিয় হয়ে যাবে।',
      descEn: 'Click "Activate Plan" to instantly activate the package with your wallet balance.',
      icon: Zap,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/30',
      btnTextBn: '🚀 নতুন বট ডিপ্লয় করুন',
      btnTextEn: 'Deploy New Bot',
      btnAction: onNavigateToDeploy,
      btnColor: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
    },
    {
      step: 4,
      titleBn: 'বট বা ওয়েবসাইট লাইভ চালান',
      titleEn: 'Run Bot or Website 24/7',
      descBn: 'টেলিগ্রাম বা ডিসকর্ড বট ২৪/৭ রান করুন অথবা Netlify ক্লাউডে নিজস্ব ডোমেন সহ ওয়েবসাইট লাইভ চালান।',
      descEn: 'Run Telegram/Discord bots 24/7 or host your websites on Netlify with custom domain.',
      icon: Globe,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/30',
      btnTextBn: '🌐 ওয়েবসাইট হোস্ট করুন',
      btnTextEn: 'Host Website Live',
      btnAction: onNavigateToWebsites,
      btnColor: 'bg-purple-500 hover:bg-purple-400 text-white font-black'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1424] via-[#0f1b33] to-[#14233e] border border-cyan-500/30 p-6 sm:p-9 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-black tracking-wide uppercase">
              <Film className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lang === 'bn' ? 'ভিডিও টিউটোরিয়াল ও হোস্টিং গাইড' : 'Video Tutorial & Hosting Guide'}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              {lang === 'bn' ? 'সহজ ৪ ধাপে হোস্টিং নিন ও লাইভ সার্ভিস চালান' : 'Get Hosting & Run Live Services in 4 Steps'}
            </h1>

            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              {lang === 'bn'
                ? 'বিকাশ, নগদ বা বাইন্যান্স দিয়ে ব্যালেন্স যোগ করে ১-ক্লিকেই প্ল্যান চালু করুন। পুরো প্রক্রিয়াটি পরিষ্কারভাবে বুঝতে নিচের ভিডিও টিউটোরিয়াল ও প্রতিটি ধাপের বাটনগুলো ব্যবহার করুন।'
                : 'Follow the 4 simple steps to deposit, activate hosting plans, and run your bots or websites live 24/7.'}
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={() => setShowVideoModal(true)}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-red-600/30 transition-all hover:scale-102 active:scale-98 cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
              </div>
              <span>{lang === 'bn' ? 'ভিডিও টিউটোরিয়াল দেখুন' : 'Watch Video Tutorial'}</span>
            </button>

            <button
              type="button"
              onClick={onNavigateToFaq}
              className="px-5 py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>{lang === 'bn' ? 'সচরাচর প্রশ্নোত্তর (FAQ)' : 'View FAQ'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Video Player Card (If video is configured) */}
      <div className="bg-[#0b1222] border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
              <Play className="w-4 h-4 fill-red-400 ml-0.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {lang === 'bn' ? 'অফিসিয়াল ভিডিও গাইডলাইন' : 'Official Video Walkthrough'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'bn' ? 'কীভাবে ডিপোজিট করবেন ও সার্ভিস সক্রিয় করবেন তার সম্পূর্ণ ভিডিও' : 'Step by step video guide'}
              </p>
            </div>
          </div>

          <a
            href={videoUrl || 'https://www.youtube.com'}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1.5 transition"
          >
            <span>{lang === 'bn' ? 'ইউটিউবে খুলুন' : 'Open in YouTube'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-800 bg-black/60 shadow-2xl">
          <iframe
            src={embedUrl}
            title="Hosting Live Fast Video Tutorial"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>

      {/* 4 Steps Section with Separate Buttons */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white">
              {lang === 'bn' ? 'হোস্টিং শুরু করার ৪টি প্রধান ধাপ' : '4 Main Steps to Start Hosting'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'bn' ? 'প্রতিটি ধাপের জন্য আলাদা বাটন দেওয়া আছে' : 'Dedicated button for each separate action'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                className="relative rounded-2xl bg-[#0b1222] border border-slate-800 hover:border-slate-700 p-5 shadow-lg flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${s.bgColor}`}>
                        <Icon className={`w-5 h-5 ${s.color}`} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Step 0{s.step}
                        </span>
                        <h4 className="text-base font-bold text-white leading-tight">
                          {lang === 'bn' ? s.titleBn : s.titleEn}
                        </h4>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-5">
                    {lang === 'bn' ? s.descBn : s.descEn}
                  </p>
                </div>

                {/* Separate Dedicated Button for this Step */}
                <button
                  type="button"
                  onClick={s.btnAction}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${s.btnColor}`}
                >
                  <span>{lang === 'bn' ? s.btnTextBn : s.btnTextEn}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="bg-[#0b1222] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          {lang === 'bn' ? '⚡ দ্রুত প্রয়োজনীয় পেইজে যান (Quick Links)' : '⚡ Quick Actions'}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={onNavigateToPlans}
            className="p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 flex flex-col items-center justify-center gap-2 transition cursor-pointer text-center"
          >
            <CreditCard className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold">{lang === 'bn' ? '👑 হোস্টিং প্লান' : 'Hosting Plans'}</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToWallet}
            className="p-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex flex-col items-center justify-center gap-2 transition cursor-pointer text-center"
          >
            <Wallet className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-bold">{lang === 'bn' ? '💳 ওয়ালেট ডিপোজিট' : 'Wallet Deposit'}</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToWebsites}
            className="p-3.5 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 flex flex-col items-center justify-center gap-2 transition cursor-pointer text-center"
          >
            <Globe className="w-5 h-5 text-cyan-400" />
            <span className="text-xs font-bold">{lang === 'bn' ? '🌐 ওয়েবসাইট হোস্ট' : 'Host Websites'}</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToDeploy}
            className="p-3.5 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 flex flex-col items-center justify-center gap-2 transition cursor-pointer text-center"
          >
            <Server className="w-5 h-5 text-purple-400" />
            <span className="text-xs font-bold">{lang === 'bn' ? '🤖 বট ডিপ্লয় করুন' : 'Deploy Bots'}</span>
          </button>
        </div>
      </div>

      {/* Video Modal Popup */}
      {showVideoModal && (
        <div
          onClick={() => setShowVideoModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between p-4 bg-slate-800/80 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-red-500 fill-red-500" />
                <span className="text-sm font-bold text-white">
                  {lang === 'bn' ? 'ভিডিও টিউটোরিয়াল: কিভাবে হোস্টিং নিবেন?' : 'Video Tutorial: How to get hosting'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowVideoModal(false)}
                className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-bold text-white cursor-pointer"
              >
                {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                src={embedUrl}
                title="Tutorial Video"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
