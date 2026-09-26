import React, { useState, useEffect } from 'react';
import {
  Film,
  Play,
  Coins,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Wallet,
  Zap,
  ArrowRight,
  Gift,
  Award,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthUser, AdRewardStats } from '../types';

interface WatchAndEarnPageProps {
  user: AuthUser | null;
  onOpenAuthModal: () => void;
  onNavigateToWallet: () => void;
  onNavigateToPlans: () => void;
  onUserUpdated?: (updatedUser: AuthUser) => void;
  lang?: 'bn' | 'en';
}

export const WatchAndEarnPage: React.FC<WatchAndEarnPageProps> = ({
  user,
  onOpenAuthModal,
  onNavigateToWallet,
  onNavigateToPlans,
  onUserUpdated,
  lang = 'bn'
}) => {
  const [stats, setStats] = useState<AdRewardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Ad Watching Modal State
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [watchProgress, setWatchProgress] = useState(0);
  const [adDurationSeconds, setAdDurationSeconds] = useState(15);
  const [remainingAdTime, setRemainingAdTime] = useState(15);
  const [adMuted, setAdMuted] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [adCompletedReady, setAdCompletedReady] = useState(false);

  const fetchStats = async () => {
    if (!user) return;
    setLoadingStats(true);
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/rewards/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
        if (data.stats.nextAvailableAt) {
          const diff = Math.ceil((data.stats.nextAvailableAt - Date.now()) / 1000);
          setCooldownTime(diff > 0 ? diff : 0);
        } else {
          setCooldownTime(0);
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  // Cooldown countdown tick
  useEffect(() => {
    if (cooldownTime <= 0) return;
    const interval = setInterval(() => {
      setCooldownTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownTime]);

  // Rewarded Video Watch Timer Tick
  useEffect(() => {
    if (!isWatchingAd || adCompletedReady) return;

    const timer = setInterval(() => {
      setRemainingAdTime((prev) => {
        const nextTime = prev - 1;
        const progress = Math.min(100, Math.round(((adDurationSeconds - nextTime) / adDurationSeconds) * 100));
        setWatchProgress(progress);

        if (nextTime <= 0) {
          clearInterval(timer);
          setAdCompletedReady(true);
          return 0;
        }
        return nextTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isWatchingAd, adCompletedReady, adDurationSeconds]);

  const handleStartWatchAd = async () => {
    setError(null);
    setSuccessMsg(null);

    if (!user) {
      onOpenAuthModal();
      return;
    }

    if (user.emailVerified === false && user.role !== 'admin') {
      setError(
        lang === 'bn'
          ? 'বিজ্ঞাপন দেখে ব্যালেন্স পেতে প্রথমে আপনার ইমেইল ভেরিফাই করুন।'
          : 'Please verify your email before watching ads.'
      );
      return;
    }

    if (cooldownTime > 0) {
      setError(
        lang === 'bn'
          ? `অনুগ্রহ করে ${cooldownTime} সেকেন্ড অপেক্ষা করুন।`
          : `Please wait ${cooldownTime} seconds cooldown.`
      );
      return;
    }

    if (stats && stats.remainingToday <= 0) {
      setError(
        lang === 'bn'
          ? 'আজকের দৈনিক লিমিট পূর্ণ হয়েছে! আগামীকাল আবার আসুন।'
          : 'Daily ad limit reached! Come back tomorrow.'
      );
      return;
    }

    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/rewards/start-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to start ad session');
      }

      setCurrentSessionId(data.sessionId);
      const duration = data.minDurationSeconds || 15;
      setAdDurationSeconds(duration);
      setRemainingAdTime(duration);
      setWatchProgress(0);
      setAdCompletedReady(false);
      setIsWatchingAd(true);
    } catch (err: any) {
      setError(err.message || 'Error starting ad');
    }
  };

  const handleClaimReward = async () => {
    if (!currentSessionId || isClaiming) return;
    setIsClaiming(true);
    setError(null);

    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/rewards/ad-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId: currentSessionId })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Reward validation failed');
      }

      setIsWatchingAd(false);
      setSuccessMsg(
        lang === 'bn'
          ? `🎉 অভিনন্দন! $${data.rewardEarned || 0.01} USD সফলভাবে আপনার ওয়ালেটে যোগ হয়েছে!`
          : `🎉 Success! $${data.rewardEarned || 0.01} USD credited to your wallet!`
      );

      if (data.stats) {
        setStats(data.stats);
        if (data.stats.nextAvailableAt) {
          const diff = Math.ceil((data.stats.nextAvailableAt - Date.now()) / 1000);
          setCooldownTime(diff > 0 ? diff : 0);
        }
      }

      if (user && data.newBalanceUsd !== undefined) {
        const updatedUser = { ...user, balanceUsd: data.newBalanceUsd };
        localStorage.setItem('bot_auth_user', JSON.stringify(updatedUser));
        if (onUserUpdated) onUserUpdated(updatedUser);
      }
    } catch (err: any) {
      setError(err.message || 'Could not claim reward');
    } finally {
      setIsClaiming(false);
    }
  };

  const rewardPerAd = stats?.rewardPerAd || 0.01;
  const adsWatchedToday = stats?.adsWatchedToday || 0;
  const dailyLimit = stats?.dailyLimit || 20;
  const remainingToday = stats?.remainingToday !== undefined ? stats.remainingToday : 20;
  const todayEarnings = stats?.todayEarningsUsd || 0;
  const totalEarnings = stats?.totalEarningsUsd || 0;
  const currentBalance = user?.balanceUsd || 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 text-slate-100">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br from-[#0c1427] via-[#091122] to-[#040813] border border-cyan-500/25 shadow-2xl mb-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold mb-3">
              <Film className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? '🎬 ওয়াচ ভিডিও অ্যান্ড আর্ন' : '🎬 Watch Ads & Earn USD'}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {lang === 'bn' ? 'ভিডিও বিজ্ঞাপন দেখে ফ্রি USD আয় করুন' : 'Watch Video Ads & Earn Real USD'}
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-xl leading-relaxed">
              {lang === 'bn'
                ? 'প্রতিটি ১৫ সেকেন্ডের স্পন্সরড ভিডিও বিজ্ঞাপন দেখলে সাথে সাথে পাবেন $০.০১ USD ওয়ালেট রিওয়ার্ড। অর্জিত ব্যালেন্স দিয়ে কিনুন প্রিমিয়াম বট ও ওয়েবসাইট হোস্টিং প্ল্যান!'
                : 'Watch short 15-second sponsored rewarded video ads and get $0.01 USD instantly added to your wallet balance. Use your earnings to buy premium bot and website hosting plans!'}
            </p>
          </div>

          <div className="flex flex-col items-center sm:items-end w-full md:w-auto">
            <div className="bg-[#0e172a]/90 border border-slate-700/60 p-4 rounded-2xl text-center md:text-right w-full sm:w-auto shadow-inner">
              <p className="text-xs text-slate-400 font-medium">{lang === 'bn' ? 'আপনার USD ওয়ালেট ব্যালেন্স' : 'Your USD Wallet Balance'}</p>
              <div className="text-2xl font-black text-emerald-400 flex items-center justify-center md:justify-end gap-1.5 mt-1 font-mono">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <span>${currentBalance.toFixed(2)} USD</span>
              </div>
              <button
                onClick={onNavigateToWallet}
                className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 font-medium cursor-pointer"
              >
                <span>{lang === 'bn' ? 'ওয়ালেট ট্রানজেকশন হিস্ট্রি' : 'View Ledger History'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-950/50 border border-emerald-500/50 rounded-2xl text-emerald-300 text-sm flex items-center gap-3 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="flex-1 font-semibold">{successMsg}</div>
          <button
            onClick={onNavigateToPlans}
            className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-emerald-400 cursor-pointer"
          >
            {lang === 'bn' ? 'প্ল্যান কিনুন' : 'Buy Plan'}
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-rose-950/50 border border-rose-500/50 rounded-2xl text-rose-300 text-sm flex items-center gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#0b1222] border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>{lang === 'bn' ? 'প্রতি বিজ্ঞাপনে রিওয়ার্ড' : 'Reward per Video'}</span>
          </div>
          <p className="text-xl font-bold text-amber-400 font-mono">+${rewardPerAd.toFixed(2)} USD</p>
          <p className="text-[11px] text-slate-500 mt-1">{lang === 'bn' ? 'ইনস্ট্যান্ট ওয়ালেট ক্রেডিট' : 'Instant credit'}</p>
        </div>

        <div className="bg-[#0b1222] border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Film className="w-4 h-4 text-cyan-400" />
            <span>{lang === 'bn' ? 'আজকের বিজ্ঞাপন' : 'Watched Today'}</span>
          </div>
          <p className="text-xl font-bold text-cyan-300 font-mono">
            {adsWatchedToday} / {dailyLimit}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {remainingToday} {lang === 'bn' ? 'টি বাকি আছে' : 'remaining today'}
          </p>
        </div>

        <div className="bg-[#0b1222] border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>{lang === 'bn' ? 'আজকের আয়' : "Today's Earnings"}</span>
          </div>
          <p className="text-xl font-bold text-emerald-400 font-mono">${todayEarnings.toFixed(2)}</p>
          <p className="text-[11px] text-slate-500 mt-1">{lang === 'bn' ? 'আজকের মোট উপার্জন' : 'Earned today'}</p>
        </div>

        <div className="bg-[#0b1222] border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Award className="w-4 h-4 text-purple-400" />
            <span>{lang === 'bn' ? 'সর্বমোট আর্নিং' : 'Total Earnings'}</span>
          </div>
          <p className="text-xl font-bold text-purple-400 font-mono">${totalEarnings.toFixed(2)}</p>
          <p className="text-[11px] text-slate-500 mt-1">{lang === 'bn' ? 'বিজ্ঞাপন থেকে মোট' : 'Lifetime ad earnings'}</p>
        </div>
      </div>

      {/* Primary Action Card */}
      <div className="bg-[#0b1222] border border-slate-800 rounded-3xl p-6 md:p-8 text-center relative overflow-hidden shadow-xl mb-8">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/25 text-slate-950">
            <Play className="w-10 h-10 fill-current translate-x-0.5" />
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
            {lang === 'bn' ? '🎬 স্পন্সরড ভিডিও বিজ্ঞাপন দেখুন' : '🎬 Watch Sponsored Video Ad'}
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            {lang === 'bn'
              ? 'নিচের বাটনে ক্লিক করে ১৫ সেকেন্ডের ভিডিও বিজ্ঞাপনটি সম্পূর্ণ দেখুন এবং সাথে সাথে $০.০১ USD জিতে নিন।'
              : 'Click the button below to watch a 15-second rewarded video and receive $0.01 USD immediately.'}
          </p>

          <button
            onClick={handleStartWatchAd}
            disabled={cooldownTime > 0 || (stats && stats.remainingToday <= 0)}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 active:scale-[0.98] text-slate-950 font-black text-base rounded-2xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-3 mx-auto cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cooldownTime > 0 ? (
              <>
                <Clock className="w-5 h-5 animate-spin" />
                <span>
                  {lang === 'bn' ? `কুলডাউন চলছে (${cooldownTime}s)` : `Cooldown Active (${cooldownTime}s)`}
                </span>
              </>
            ) : stats && stats.remainingToday <= 0 ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-slate-900" />
                <span>{lang === 'bn' ? 'আজকের লিমিট পূর্ণ' : 'Daily Limit Reached'}</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>{lang === 'bn' ? 'ভিডিও বিজ্ঞাপন দেখুন (+$০.০১)' : 'Watch Video Ad (+$0.01 USD)'}</span>
              </>
            )}
          </button>

          {cooldownTime > 0 && (
            <p className="text-xs text-amber-400 mt-3 font-medium">
              ⏱ {lang === 'bn' ? `পরবর্তী বিজ্ঞাপন দেখার জন্য ${cooldownTime} সেকেন্ড বাকি` : `${cooldownTime} seconds remaining until next ad`}
            </p>
          )}

          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'bn' ? 'সার্ভার ভেরিফায়েড রিওয়ার্ড' : 'Server Verified Security'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>{lang === 'bn' ? 'ইনস্ট্যান্ট ওয়ালেট ডিপোজিট' : 'Instant Wallet Credit'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-purple-400" />
              <span>{lang === 'bn' ? 'প্ল্যান কেনার সুযোগ' : 'Use for Hosting Plans'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rewarded Video Ad Modal */}
      <AnimatePresence>
        {isWatchingAd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-[#0b1325] border border-cyan-500/40 rounded-3xl max-w-lg w-full p-6 text-slate-100 shadow-2xl relative overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    {lang === 'bn' ? 'স্পন্সরড ভিডিও বিজ্ঞাপন' : 'Sponsored Rewarded Video'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setAdMuted(!adMuted)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    {adMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <div className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-amber-400">
                    {remainingAdTime > 0 ? `${remainingAdTime}s` : '✓ DONE'}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-6">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full transition-all duration-1000 ease-linear"
                  style={{ width: `${watchProgress}%` }}
                />
              </div>

              {/* Video Player Display Container */}
              <div className="aspect-video w-full rounded-2xl bg-gradient-to-br from-[#050b18] via-[#09152e] to-[#040813] border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden p-6 text-center shadow-inner mb-6">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-3">
                  <Film className="w-8 h-8 animate-pulse" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  hosting live fast Cloud Partners
                </h3>
                <p className="text-xs text-slate-400 max-w-xs">
                  {lang === 'bn'
                    ? '২৪/৭ ক্লাউড টেলিগ্রাম বট ও স্ট্যাটিক ওয়েবসাইট হোস্টিং স্পন্সরড ভিডিও চলছে...'
                    : '24/7 Cloud Telegram Bot & Website Hosting sponsored ad running...'}
                </p>

                <div className="mt-4 px-3 py-1 rounded-lg bg-black/50 border border-slate-700/80 text-[11px] font-mono text-cyan-300">
                  {adCompletedReady
                    ? (lang === 'bn' ? '✅ বিজ্ঞাপন দেখা সম্পন্ন হয়েছে!' : '✅ Ad Complete! Ready to Claim')
                    : (lang === 'bn' ? `⏱ অনুগ্রহ করে আরো ${remainingAdTime} সেকেন্ড দেখুন` : `⏱ Please watch for ${remainingAdTime} more seconds`)}
                </div>
              </div>

              {/* Claim Action Button */}
              {adCompletedReady ? (
                <button
                  onClick={handleClaimReward}
                  disabled={isClaiming}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 active:scale-[0.98] text-slate-950 font-black text-base rounded-2xl shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isClaiming ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>{lang === 'bn' ? 'রিওয়ার্ড যাচাই হচ্ছে...' : 'Verifying Reward...'}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 fill-current" />
                      <span>{lang === 'bn' ? 'রিওয়ার্ড ক্লেইম করুন ($০.০১ USD)' : 'Claim $0.01 USD Reward'}</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center text-xs text-slate-400">
                  🔒 {lang === 'bn' ? 'সম্পূর্ণ সময় সমাপ্ত হলে রিওয়ার্ড বাটন সক্রিয় হবে' : 'The reward button unlocks once timer completes'}
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
