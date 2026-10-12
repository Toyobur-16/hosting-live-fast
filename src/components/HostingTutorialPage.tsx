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
  Layers,
  X
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getEmbedVideoUrl, VideoEmbedPlayer } from './HostingTutorialSection';

interface HostingTutorialPageProps {
  lang?: 'bn' | 'en';
  videoUrl?: string;
  onNavigateToWallet: () => void;
  onNavigateToPlans: () => void;
  onNavigateToDeploy: () => void;
  onNavigateToWebsites: () => void;
  onNavigateToFaq: () => void;
}

export function HostingTutorialPage({
  lang = 'bn',
  videoUrl: propVideoUrl,
  onNavigateToWallet,
  onNavigateToPlans,
  onNavigateToDeploy,
  onNavigateToWebsites,
  onNavigateToFaq
}: HostingTutorialPageProps) {
  const [videoUrl, setVideoUrl] = useState<string | undefined>(propVideoUrl);
  const [showVideoModal, setShowVideoModal] = useState(false);

  useEffect(() => {
    if (propVideoUrl) {
      setVideoUrl(propVideoUrl);
      return;
    }

    // 1. Check cached site settings in localStorage
    try {
      const cached = localStorage.getItem('hlf_site_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.hostingVideoUrl || parsed.websiteVideoUrl) {
          setVideoUrl(parsed.hostingVideoUrl || parsed.websiteVideoUrl);
        }
      }
    } catch {}

    // 2. Fetch live settings from API
    fetch('/api/site-settings')
      .then((res) => res.json())
      .then((data) => {
        const s = data?.settings || data;
        const candidate = s?.hostingVideoUrl || s?.websiteVideoUrl;
        if (candidate) {
          setVideoUrl(candidate);
        }
      })
      .catch(() => {});

    // 3. Listen to custom event when admin updates settings live
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const s = customEvent.detail;
      if (s?.hostingVideoUrl || s?.websiteVideoUrl) {
        setVideoUrl(s.hostingVideoUrl || s.websiteVideoUrl);
      }
    };
    window.addEventListener('site-settings-updated', handleUpdate);

    // 4. Live Firestore listener
    const unsub = onSnapshot(
      doc(db, 'site_settings', 'general'),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d?.hostingVideoUrl || d?.websiteVideoUrl) {
            setVideoUrl(d.hostingVideoUrl || d.websiteVideoUrl);
          }
        }
      },
      () => {}
    );

    return () => {
      window.removeEventListener('site-settings-updated', handleUpdate);
      unsub();
    };
  }, [propVideoUrl]);

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
      descBn: '১ মাস, ৩ মাস, ৬ মাস বা ১ বছরের প্রিমিয়াম হোস্টিং প্যাকেজ থেকে আপনার পছন্দের প্ল্যান নির্বাচন করুন।',
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
      descBn: 'লাইভ টার্মিনাল কনসোল ও অটো-রিস্টার্ট ওয়াচডগ সহ ২৪/৭ নিরবচ্ছিন্ন ক্লাউড হোস্টিং উপভোগ করুন।',
      descEn: 'Enjoy continuous 24/7 cloud runtime with live console, auto-fix, and watchdog protection.',
      icon: Globe,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/30',
      btnTextBn: '🌐 ওয়েবসাইট হোস্টিং দেখুন',
      btnTextEn: 'View Static Websites',
      btnAction: onNavigateToWebsites,
      btnColor: 'bg-purple-500 hover:bg-purple-400 text-white font-bold'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Hero Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#0c1427] via-[#090f1d] to-[#050811] border border-cyan-500/30 p-6 sm:p-8 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

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

      {/* Embedded Video Player Card */}
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

          {videoUrl && (
            <a
              href={videoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1.5 transition"
            >
              <span>{lang === 'bn' ? 'নতুন ট্যাবে খুলুন' : 'Open in New Tab'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-800 bg-black/60 shadow-2xl flex items-center justify-center">
          {embedUrl ? (
            <VideoEmbedPlayer
              url={videoUrl}
              title="Hosting Live Fast Video Tutorial"
              className="w-full h-full"
              autoPlay={false}
            />
          ) : (
            <div className="text-center p-8 max-w-md space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
                <Film className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-white">
                {lang === 'bn' ? 'হোস্টিং নেওয়ার ভিডিও টিউটোরিয়াল' : 'Hosting Video Tutorial'}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {lang === 'bn'
                  ? 'এডমিন প্যানেলের সাইট সেটিংস থেকে ইউটিউব বা ভিডিও লিংক যুক্ত করলে সরাসরি এখানে চলবে।'
                  : 'Add your YouTube or video link in Admin Settings to display and play it here.'}
              </p>
              <button
                type="button"
                onClick={onNavigateToPlans}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>{lang === 'bn' ? 'হোস্টিং প্ল্যান পেজে যান' : 'Go to Plans'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
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
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl ${s.bgColor} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${s.color}`} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                          {lang === 'bn' ? `ধাপ ${s.step}` : `Step ${s.step}`}
                        </span>
                        <h3 className="text-base font-bold text-white">
                          {lang === 'bn' ? s.titleBn : s.titleEn}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {lang === 'bn' ? s.descBn : s.descEn}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={s.btnAction}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-md cursor-pointer ${s.btnColor}`}
                >
                  <span>{lang === 'bn' ? s.btnTextBn : s.btnTextEn}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Video Modal Popup */}
      {showVideoModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowVideoModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
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
              <div className="flex items-center gap-2">
                {videoUrl && (
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-cyan-300 transition text-xs flex items-center gap-1"
                    title={lang === 'bn' ? 'নতুন ট্যাবে খুলুন' : 'Open in New Tab'}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setShowVideoModal(false)}
                  className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-bold text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="aspect-video w-full bg-black flex items-center justify-center">
              {embedUrl ? (
                <VideoEmbedPlayer
                  url={videoUrl}
                  title="Tutorial Video"
                  className="w-full h-full"
                  autoPlay={true}
                />
              ) : (
                <div className="text-center p-8 max-w-md space-y-3">
                  <Film className="w-10 h-10 text-cyan-400 mx-auto" />
                  <p className="text-sm font-bold text-white">
                    {lang === 'bn' ? 'কোনো ভিডিও লিংক সেট করা নেই' : 'No video configured yet'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {lang === 'bn'
                      ? 'এডমিন প্যানেলে ভিডিও লিংক এড করলে স্বয়ংক্রিয়ভাবে এখানে দেখা যাবে।'
                      : 'Add a video link in Admin Settings to watch it here.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
