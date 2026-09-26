import React, { useState, useEffect } from 'react';
import {
  Server,
  PlusCircle,
  Crown,
  Wallet,
  Coins,
  Headphones,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  BellRing,
  ExternalLink,
  Code2,
  Globe,
  Film
} from 'lucide-react';
import { StoreBanner, AuthUser, SiteSettings } from '../types';

interface AnnouncementItem {
  id: string;
  titleBn: string;
  titleEn: string;
  messageBn: string;
  messageEn: string;
  date: string;
}

interface StoreHomePageProps {
  user: AuthUser | null;
  onNavigateToWallet: () => void;
  onNavigateToDepositStore?: () => void;
  onNavigateToPlans: () => void;
  onNavigateToBots: () => void;
  onNavigateToWebsites?: () => void;
  onNavigateToRewards?: () => void;
  onDeployNewBot: () => void;
  onNavigateToSupport: () => void;
  onOpenAuthModal: () => void;
  onOpenAdminModal?: () => void;
  hasActivePlan: boolean;
  lang: 'bn' | 'en';
  botsCount?: number;
  siteSettings?: SiteSettings;
}

export function StoreHomePage({
  user,
  onNavigateToWallet,
  onNavigateToDepositStore,
  onNavigateToPlans,
  onNavigateToBots,
  onNavigateToWebsites,
  onNavigateToRewards,
  onDeployNewBot,
  onNavigateToSupport,
  onOpenAuthModal,
  onOpenAdminModal,
  hasActivePlan,
  lang,
  botsCount = 0,
  siteSettings
}: StoreHomePageProps) {
  const isAdmin = Boolean(user && (user.role === 'admin' || user.email === 'toyoburrahman9090@gmail.com'));
  const [banners, setBanners] = useState<StoreBanner[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      setLoading(true);
      const [bannersRes, annsRes] = await Promise.all([
        fetch('/api/store/banners'),
        fetch('/api/announcements')
      ]);

      if (bannersRes.ok) {
        const bData = await bannersRes.json();
        setBanners(bData.banners || []);
      }
      if (annsRes.ok) {
        const aData = await annsRes.json();
        setAnnouncements(aData.announcements || []);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handlePrevBanner = () => {
    if (banners.length === 0) return;
    setCurrentBannerIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  };

  const handleNextBanner = () => {
    if (banners.length === 0) return;
    setCurrentBannerIndex((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(handleNextBanner, 6000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const activeBanner = banners[currentBannerIndex] || null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Brand Hero Card with Official Logo */}
      <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 bg-gradient-to-br from-slate-950 via-[#0e1628] to-slate-900 shadow-xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 sm:gap-5 w-full sm:w-auto">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-black/70 border-2 border-amber-500/50 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10 p-1">
            <img
              src={siteSettings?.logoUrl || '/logo-icon.png'}
              alt={siteSettings?.siteName || 'Logo'}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                {siteSettings?.siteName || 'hosting live fast'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 text-[10px] sm:text-xs font-black uppercase shadow-xs">
                Official
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              {lang === 'bn'
                ? (siteSettings?.taglineBn || '২৪/৭ ক্লাউড টেলিগ্রাম বট ও টপ আপ সেবা')
                : (siteSettings?.taglineEn || '24/7 Cloud Bot Hosting & Fast Top Up Service')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={onDeployNewBot}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{lang === 'bn' ? 'বট ডিপ্লয় করুন' : 'Deploy Bot'}</span>
          </button>
        </div>
      </div>

      {/* 1. Live Announcement Notice Ticker */}
      {announcements.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-[#00d293]/10 to-teal-500/10 border border-[#00d293]/30 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-slate-800 dark:text-slate-200">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-[#00d293] text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
              <BellRing className="w-4 h-4 animate-bounce" />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#00a876] dark:text-[#00d293] uppercase tracking-wide">
                  {lang === 'bn' ? 'জরুরি নোটিশ' : 'Notice'}
                </span>
                <span className="text-xs font-bold truncate">
                  {lang === 'bn'
                    ? announcements[0].titleBn || announcements[0].titleEn
                    : announcements[0].titleEn || announcements[0].titleBn}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                {lang === 'bn'
                  ? announcements[0].messageBn || announcements[0].messageEn
                  : announcements[0].messageEn || announcements[0].messageBn}
              </p>
            </div>
          </div>
          {isAdmin && onOpenAdminModal && (
            <button
              onClick={onOpenAdminModal}
              className="text-[11px] font-bold text-[#00a876] dark:text-[#00d293] hover:underline shrink-0 cursor-pointer"
            >
              {lang === 'bn' ? 'নোটিশ বদলান' : 'Edit Notice'}
            </button>
          )}
        </div>
      )}

      {/* 2. Hero Interactive Slider Banner */}
      {banners.length > 0 && activeBanner && (
        <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-[#162035] shadow-xl bg-slate-900 group">
          <div className="relative min-h-[260px] sm:min-h-[290px] md:h-80 w-full overflow-hidden">
            <img
              src={activeBanner.imageUrl}
              alt={activeBanner.title}
              className="w-full h-full object-cover object-center transform group-hover:scale-102 transition-transform duration-700 brightness-75"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/40 to-transparent" />

            {/* Banner Content */}
            <div className="absolute inset-0 p-5 sm:p-8 flex flex-col justify-end max-w-2xl">
              {activeBanner.badge && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00d293] text-slate-950 text-[11px] sm:text-xs font-black mb-2 w-fit shadow-md">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{activeBanner.badge}</span>
                </div>
              )}
              <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-white leading-tight mb-1.5">
                {lang === 'bn' ? activeBanner.titleBn || activeBanner.title : activeBanner.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 mb-3 sm:mb-4">
                {lang === 'bn' ? activeBanner.subtitleBn || activeBanner.subtitle : activeBanner.subtitle}
              </p>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    if (activeBanner.link === 'wallet') onNavigateToWallet();
                    else if (activeBanner.link === 'bots') onNavigateToBots();
                    else onNavigateToPlans();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <span>{lang === 'bn' ? 'হোস্টিং শুরু করুন' : 'Get Started Now'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onDeployNewBot}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold text-xs sm:text-sm border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-[#00d293]" />
                  <span>{lang === 'bn' ? 'ডিপ্লয় বট' : 'Deploy Bot'}</span>
                </button>
              </div>
            </div>

            {/* Navigation Arrows */}
            {banners.length > 1 && (
              <>
                <button
                  onClick={handlePrevBanner}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs transition cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextBanner}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs transition cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 3. Hosting Plan Status & Action Card (Gated) */}
      <div className="rounded-3xl border border-slate-200 dark:border-[#1e2d48] bg-white dark:bg-[#0d1527] p-5 sm:p-6 shadow-xl transition-colors">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-md ${
                hasActivePlan
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-[#00d293]'
                  : 'bg-amber-500/15 text-amber-500'
              }`}>
                {hasActivePlan ? <Server className="w-5 h-5" /> : <Crown className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {hasActivePlan
                      ? (lang === 'bn' ? '🎉 আপনার হোস্টিং প্লান সক্রিয় আছে!' : '🎉 Your Hosting Plan is Active!')
                      : (lang === 'bn' ? 'হোস্টিং শুরু করতে একটি প্ল্যান সক্রিয় করুন' : 'Activate a Plan to Deploy Bots')}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                    hasActivePlan
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-[#00d293] border border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  }`}>
                    {hasActivePlan ? (lang === 'bn' ? 'সক্রিয় (Active)' : 'Active') : (lang === 'bn' ? 'প্ল্যান প্রয়োজন' : 'Plan Required')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {hasActivePlan
                    ? (lang === 'bn'
                        ? `মোট হোস্টেড বট: ${botsCount} টি | আপনি যে কোনো সময় নতুন টেলিগ্রাম বট বা ওয়েবসাইট স্ক্রিপ্ট ডিপ্লয় করতে পারেন।`
                        : `Total Hosted Bots: ${botsCount} | You can deploy new Telegram bots or web scripts anytime.`)
                    : (lang === 'bn'
                        ? 'টেলিগ্রাম বট ও পাইথন স্ক্রিপ্ট ২৪/৭ সার্বক্ষণিক লাইভ রাখতে সাশ্রয়ী প্লান বেছে নিন।'
                        : 'Choose an affordable plan to run Telegram bots & Python scripts 24/7 uninterrupted.')}
                </p>
              </div>
            </div>

            {hasActivePlan && user?.planExpiresAt && (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 pl-12">
                <Clock className="w-3.5 h-3.5 text-[#00d293]" />
                <span>
                  {lang === 'bn' ? 'মেয়াদ শেষ হবে:' : 'Expires on:'}{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {new Date(user.planExpiresAt).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
                      dateStyle: 'long'
                    })}
                  </strong>
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
            {hasActivePlan ? (
              <>
                <button
                  onClick={onDeployNewBot}
                  className="flex-1 md:flex-initial px-6 py-3 rounded-2xl bg-gradient-to-r from-[#00d293] to-emerald-400 hover:from-[#00be84] hover:to-emerald-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-[#00d293]/20 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-102"
                >
                  <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                  <span>{lang === 'bn' ? 'Deploy New Bot' : 'Deploy New Bot'}</span>
                </button>
                <button
                  onClick={onNavigateToBots}
                  className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-[#162238] hover:bg-slate-200 dark:hover:bg-[#1f2f4c] text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm transition cursor-pointer"
                >
                  {lang === 'bn' ? 'আমার বট দেখুন' : 'View My Bots'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onNavigateToPlans}
                  className="flex-1 md:flex-initial px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-102"
                >
                  <Crown className="w-4 h-4 stroke-[2.5]" />
                  <span>{lang === 'bn' ? 'হোস্টিং প্ল্যান কিনুন (Buy Plan)' : 'View Plans'}</span>
                </button>
                <button
                  onClick={onDeployNewBot}
                  className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-[#162238] hover:bg-slate-200 dark:hover:bg-[#1f2f4c] text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm transition cursor-pointer"
                >
                  {lang === 'bn' ? 'Deploy New Bot' : 'Deploy New Bot'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3.5. Live Deposit Feature Banner */}
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-[#11192e] via-[#0d1424] to-[#0a0f1d] p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 shrink-0 shadow-lg shadow-amber-500/10">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  {lang === 'bn' ? '💳 ওয়ালেট ডিপোজিট ও লাইভ টপ-আপ' : '💳 Wallet Deposit & Top-Up'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/30">
                  {lang === 'bn' ? 'সরাসরি ডিপোজিট' : 'LIVE'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {lang === 'bn'
                  ? 'বাইনান্স (Binance Pay / UID), বিকাশ ও নগদে সহজে ওয়ালেটে ব্যালেন্স রিচার্জ করুন।'
                  : 'Deposit via Binance Pay / UID or bKash, Nagad and custom methods.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={onNavigateToDepositStore || onNavigateToWallet}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition hover:scale-102"
            >
              <span>{lang === 'bn' ? 'ডিপোজিট করুন' : 'Deposit Now'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Quick Actions Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Plans */}
        <div
          onClick={onNavigateToPlans}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1e2d48] bg-white dark:bg-[#0d1527] hover:border-amber-400/50 hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Crown className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            {lang === 'bn' ? 'হোস্টিং প্ল্যানস' : 'Hosting Plans'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {lang === 'bn' ? '৩০ দিন, ৫০ দিন, ১ বছর মেয়াদ সহ সাশ্রয়ী প্যাকেজ' : '30 days, 50 days, 1 year high-speed plans'}
          </p>
          <span className="text-[11px] font-bold text-amber-500 group-hover:underline flex items-center gap-1 mt-3">
            {lang === 'bn' ? 'প্ল্যান দেখুন →' : 'View Plans →'}
          </span>
        </div>

        {/* Card 2: My Bots */}
        <div
          onClick={onNavigateToBots}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1e2d48] bg-white dark:bg-[#0d1527] hover:border-sky-400/50 hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Server className="w-5 h-5" />
          </div>
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {lang === 'bn' ? 'আমার বট সমূহ' : 'My Hosted Bots'}
            </h4>
            {botsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-500">
                {botsCount} {lang === 'bn' ? 'লাইভ' : 'live'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {lang === 'bn' ? 'বট স্টার্ট, স্টপ, অটো-রিস্টার্ট ও ফাইল এডিটর' : 'Start, stop, auto-restart & file management'}
          </p>
          <span className="text-[11px] font-bold text-sky-500 group-hover:underline flex items-center gap-1 mt-3">
            {lang === 'bn' ? 'বট লিস্ট দেখুন →' : 'Open Bots →'}
          </span>
        </div>

        {/* Card 3: Static Website Hosting */}
        <div
          onClick={onNavigateToWebsites}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1e2d48] bg-white dark:bg-[#0d1527] hover:border-cyan-400/50 hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Globe className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            {lang === 'bn' ? 'ওয়েবসাইট হোস্টিং' : 'Static Website Hosting'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {lang === 'bn' ? 'ZIP বা HTML ফাইল আপলোড করে লাইভ সাইট হোস্ট করুন' : 'Deploy static HTML/CSS/JS websites with custom slug'}
          </p>
          <span className="text-[11px] font-bold text-cyan-400 group-hover:underline flex items-center gap-1 mt-3">
            {lang === 'bn' ? 'সাইট হোস্ট করুন →' : 'Deploy Website →'}
          </span>
        </div>

        {/* Card 4: Watch Ads & Earn USD */}
        <div
          onClick={onNavigateToRewards}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1e2d48] bg-white dark:bg-[#0d1527] hover:border-pink-400/50 hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Film className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            {lang === 'bn' ? 'ভিডিও অ্যাড ও আর্ন' : 'Watch Ads & Earn'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {lang === 'bn' ? 'পুরস্কৃত ভিডিও বিজ্ঞাপন দেখে সরাসরি USD আর্ন করুন' : 'Watch verified rewarded video ads & earn real USD balance'}
          </p>
          <span className="text-[11px] font-bold text-pink-400 group-hover:underline flex items-center gap-1 mt-3">
            {lang === 'bn' ? 'ভিডিও দেখুন →' : 'Watch & Earn →'}
          </span>
        </div>

        {/* Card 5: Wallet & Deposit */}
        <div
          onClick={onNavigateToWallet}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1e2d48] bg-white dark:bg-[#0d1527] hover:border-[#00d293]/50 hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Wallet className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            {lang === 'bn' ? 'ওয়ালেট ও বাইনান্স ডিপোজিট' : 'Binance Pay Deposit'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {lang === 'bn' ? 'Binance UID দিয়ে সহজে ব্যালেন্স যোগ করুন' : 'Send USDT via Binance UID & Order ID'}
          </p>
          <span className="text-[11px] font-bold text-[#00a876] dark:text-[#00d293] group-hover:underline flex items-center gap-1 mt-3">
            {lang === 'bn' ? 'ওয়ালেটে যান →' : 'Open Wallet →'}
          </span>
        </div>

        {/* Card 6: Support */}
        <div
          onClick={onNavigateToSupport}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1e2d48] bg-white dark:bg-[#0d1527] hover:border-indigo-400/50 hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Headphones className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            {lang === 'bn' ? '২৪/৭ সাপোর্ট সেন্টার' : '24/7 Support Center'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {lang === 'bn' ? 'টেলিগ্রাম, হোয়াটসঅ্যাপ ও ইমেইল সহায়তা' : 'Telegram, WhatsApp & direct email help'}
          </p>
          <span className="text-[11px] font-bold text-indigo-500 group-hover:underline flex items-center gap-1 mt-3">
            {lang === 'bn' ? 'যোগাযোগ করুন →' : 'Contact Us →'}
          </span>
        </div>
      </div>

      {/* 5. Key Platform Features */}
      <div className="rounded-3xl border border-slate-200 dark:border-[#1e2d48] bg-white dark:bg-[#0d1527] p-6 shadow-xl transition-colors space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#00d293]" />
          <span>{lang === 'bn' ? 'কেন hosting live fast বেছে নেবেন?' : 'Why Choose hosting live fast?'}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111c33] border border-slate-200 dark:border-[#1e2d48] space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                {lang === 'bn' ? '২৪/৭ বিরতিহীন ক্লাউড সার্ভার' : '24/7 Uninterrupted Uptime'}
              </h5>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {lang === 'bn'
                ? 'আপনার টেলিগ্রাম বট ও কোড স্বয়ংক্রিয় ব্যাকগ্রাউন্ড ডেমনে সার্বক্ষণিক সচল থাকবে।'
                : 'Your Telegram bots run as reliable background daemons with zero sleep timeout.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111c33] border border-slate-200 dark:border-[#1e2d48] space-y-2">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-sky-500" />
              <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                {lang === 'bn' ? 'অটো-ক্র্যাশ রিস্টার্ট ওয়াচডগ' : 'Auto-Crash Self Healing'}
              </h5>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {lang === 'bn'
                ? 'বট কোনো অপ্রত্যাশিত কারণে ক্র্যাশ করলে সিস্টেম সাথে সাথে স্বয়ংক্রিয়ভাবে পুনরায় চালু করবে।'
                : 'If a bot encounters a runtime exception or network disconnect, the watchdog reboots it.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111c33] border border-slate-200 dark:border-[#1e2d48] space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                {lang === 'bn' ? 'ডাটা ও ব্যালেন্স সুরক্ষা' : 'Isolated Safe Workspaces'}
              </h5>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {lang === 'bn'
                ? 'সেফ আপলোড মোডের মাধ্যমে বট আপডেট করার সময় ইউজার ব্যালেন্স ও ডাটা অক্ষত থাকে।'
                : 'Safe Upload preserve user balances, SQLite files, and configurations during code updates.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
