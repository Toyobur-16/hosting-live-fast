import React, { useState, useEffect } from 'react';
import {
  Share2,
  CheckCircle2,
  ExternalLink,
  DollarSign,
  Clock,
  Sparkles,
  Send,
  Youtube,
  Facebook,
  Instagram,
  Twitter,
  Globe,
  MessageSquare,
  Video,
  Award,
  Wallet,
  ArrowRight,
  AlertCircle,
  X,
  Loader2,
  Check,
  Flame,
  ShieldCheck
} from 'lucide-react';
import { SocialTask, SocialPlatform } from '../types';

interface SocialTasksPageProps {
  user: any;
  onOpenAuthModal: () => void;
  onNavigateToWallet: () => void;
  onNavigateToPlans: () => void;
  lang?: 'en' | 'bn';
}

const PLATFORM_ICONS: Record<SocialPlatform, { icon: any; color: string; bg: string; name: string }> = {
  telegram: { icon: Send, color: 'text-sky-400', bg: 'bg-sky-500/15 border-sky-500/30', name: 'Telegram' },
  youtube: { icon: Youtube, color: 'text-red-500', bg: 'bg-red-500/15 border-red-500/30', name: 'YouTube' },
  facebook: { icon: Facebook, color: 'text-blue-500', bg: 'bg-blue-500/15 border-blue-500/30', name: 'Facebook' },
  instagram: { icon: Instagram, color: 'text-pink-500', bg: 'bg-pink-500/15 border-pink-500/30', name: 'Instagram' },
  twitter: { icon: Twitter, color: 'text-slate-300', bg: 'bg-slate-500/15 border-slate-500/30', name: 'X / Twitter' },
  tiktok: { icon: Video, color: 'text-cyan-400', bg: 'bg-cyan-500/15 border-cyan-500/30', name: 'TikTok' },
  website: { icon: Globe, color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', name: 'Website' },
  discord: { icon: MessageSquare, color: 'text-indigo-400', bg: 'bg-indigo-500/15 border-indigo-500/30', name: 'Discord' },
  custom: { icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30', name: 'Task' }
};

export const SocialTasksPage: React.FC<SocialTasksPageProps> = ({
  user,
  onOpenAuthModal,
  onNavigateToWallet,
  onNavigateToPlans,
  lang = 'bn'
}) => {
  const [tasks, setTasks] = useState<SocialTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [activeTask, setActiveTask] = useState<SocialTask | null>(null);

  // Verification modal state
  const [visitedLink, setVisitedLink] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [successToast, setSuccessToast] = useState<{ title: string; reward: number } | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<number>(user?.balanceUsd || 0);

  useEffect(() => {
    fetchTasks();
  }, [user]);

  useEffect(() => {
    if (user?.balanceUsd !== undefined) {
      setUserBalance(user.balanceUsd);
    }
  }, [user?.balanceUsd]);

  // Timer countdown
  useEffect(() => {
    let interval: any = null;
    if (visitedLink && timerRemaining > 0) {
      interval = setInterval(() => {
        setTimerRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [visitedLink, timerRemaining]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/social-tasks', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTasks(data.tasks || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = (task: SocialTask) => {
    if (!user) {
      onOpenAuthModal();
      return;
    }
    setActiveTask(task);
    setVisitedLink(false);
    setTimerRemaining(task.timerSeconds || 8);
    setErrorToast(null);
  };

  const handleOpenLink = () => {
    if (!activeTask) return;
    window.open(activeTask.link, '_blank', 'noopener,noreferrer');
    setVisitedLink(true);
    setTimerRemaining(activeTask.timerSeconds || 8);
  };

  const handleClaimReward = async () => {
    if (!activeTask) return;
    if (!user) {
      onOpenAuthModal();
      return;
    }

    try {
      setClaiming(true);
      setErrorToast(null);
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch(`/api/social-tasks/${activeTask.id}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const reward = data.rewardUsd || activeTask.rewardUsd;
        setSuccessToast({
          title: activeTask.titleBn || activeTask.title,
          reward
        });

        if (data.user?.balanceUsd !== undefined) {
          setUserBalance(data.user.balanceUsd);
        } else {
          setUserBalance((prev) => prev + reward);
        }

        // Play ding sound
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
          audio.volume = 0.5;
          audio.play().catch(() => {});
        } catch {}

        setActiveTask(null);
        fetchTasks();
        setTimeout(() => setSuccessToast(null), 5000);
      } else {
        setErrorToast(data.error || 'টাস্ক ক্লেইম করা যায়নি।');
      }
    } catch (err: any) {
      setErrorToast(err.message || 'নেটওয়ার্ক এরর');
    } finally {
      setClaiming(false);
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const totalPossibleUsd = tasks.reduce((sum, t) => sum + (t.rewardUsd || 0), 0);

  const filteredTasks = tasks.filter((t) => {
    if (selectedPlatform === 'all') return true;
    return t.platform === selectedPlatform;
  });

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 space-y-6">
      {/* HERO SECTION */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#120f2c] via-[#0b1022] to-[#070b14] border border-purple-500/30 p-5 sm:p-7 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>{lang === 'bn' ? 'সোশ্যাল টাস্ক অ্যান্ড আর্ন USD' : 'Social Tasks & Earn Real USD'}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              {lang === 'bn' ? 'সোশ্যাল টাস্ক সম্পন্ন করে ফ্রি USD আয় করুন' : 'Complete Simple Social Tasks & Earn USD'}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {lang === 'bn'
                ? 'টেলিগ্রাম চ্যানেলে জয়েন, ইউটিউব সাবস্ক্রাইব, ফেসবুক ও ইনস্টাগ্রাম ফলো করার মাধ্যমে সরাসরি ওয়ালেটে USD ব্যালেন্স যোগ করুন। অর্জিত ব্যালেন্স দিয়ে প্রিমিয়াম বট ও ওয়েবসাইট হোস্টিং প্যাকেজ চালু করুন!'
                : 'Join Telegram channels, subscribe to YouTube, and follow on Facebook & Instagram to earn instant USD wallet credits. Use your earnings to host live bots and websites!'}
            </p>

            <div className="flex items-center gap-3 pt-2 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>ইনস্ট্যান্ট ওয়ালেট ক্রেডিট</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5 text-purple-400">
                <Flame className="w-4 h-4" />
                <span>হোস্টিং প্ল্যানে ব্যবহারযোগ্য</span>
              </span>
            </div>
          </div>

          {/* User Balance Card */}
          <div className="w-full md:w-auto shrink-0">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#080d19]/90 border border-purple-500/30 backdrop-blur-md shadow-xl text-center sm:text-right space-y-2">
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                {lang === 'bn' ? 'আপনার বর্তমান ব্যালেন্স' : 'Your USD Wallet Balance'}
              </div>
              <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight flex items-center justify-center sm:justify-end gap-1.5">
                <Wallet className="w-6 h-6 text-emerald-400" />
                <span>${userBalance.toFixed(2)}</span>
                <span className="text-xs text-[#00d293] font-sans font-black bg-[#00d293]/15 px-2 py-0.5 rounded-md">
                  USDT
                </span>
              </div>
              <div className="flex items-center justify-center sm:justify-end gap-2 pt-1">
                <button
                  onClick={onNavigateToWallet}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>ওয়ালেট দেখুন</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  onClick={onNavigateToPlans}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black cursor-pointer transition-all shadow-md shadow-emerald-500/20"
                >
                  হোস্টিং প্ল্যান
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar Row */}
        <div className="mt-6 pt-5 border-t border-purple-500/20 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div className="sm:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300">
                {lang === 'bn' ? 'আপনার সম্পন্নকৃত টাস্ক:' : 'Completed Tasks:'} {completedCount} / {totalCount}
              </span>
              <span className="text-purple-400 font-black">{progressPercent}% সম্পন্ন</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="text-center sm:text-right">
            <span className="text-[11px] text-slate-400 block font-medium">মোট সম্ভাব্য আর্নিং</span>
            <span className="text-sm font-black text-emerald-400">+${totalPossibleUsd.toFixed(2)} USD</span>
          </div>
        </div>
      </div>

      {/* SUCCESS CELEBRATION TOAST */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 to-[#081812] border-2 border-emerald-500 text-emerald-200 shadow-2xl flex items-center justify-between gap-3 animate-bounce">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 font-black">
              ✓
            </div>
            <div>
              <h4 className="text-sm font-black text-white">🎉 টাস্ক সম্পন্ন হয়েছে!</h4>
              <p className="text-xs text-emerald-300">
                "{successToast.title}" সম্পন্ন করার জন্য আপনার ওয়ালেটে{' '}
                <strong className="text-white">+${successToast.reward.toFixed(2)} USD</strong> যোগ হয়েছে!
              </p>
            </div>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Platform Filter Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <button
          onClick={() => setSelectedPlatform('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            selectedPlatform === 'all'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
              : 'bg-[#0a0f1d] hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>সকল প্ল্যাটফর্ম ({tasks.length})</span>
        </button>

        {['telegram', 'youtube', 'facebook', 'instagram', 'twitter', 'website'].map((plat) => {
          const meta = PLATFORM_ICONS[plat as SocialPlatform] || PLATFORM_ICONS.custom;
          const Icon = meta.icon;
          const count = tasks.filter((t) => t.platform === plat).length;
          if (count === 0) return null;

          const isSelected = selectedPlatform === plat;
          return (
            <button
              key={plat}
              onClick={() => setSelectedPlatform(plat)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'bg-[#0a0f1d] hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
              <span>{meta.name}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* TASKS GRID */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
          <p className="text-xs font-bold">সোশ্যাল টাস্ক লোড হচ্ছে...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-10 text-center rounded-3xl bg-[#080d19] border border-slate-800 text-slate-400 space-y-2">
          <Share2 className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-white">কোনো টাস্ক পাওয়া যায়নি</h4>
          <p className="text-xs text-slate-400">খুব শীঘ্রই এডমিন থেকে নতুন সোশ্যাল টাস্ক যোগ করা হবে।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => {
            const meta = PLATFORM_ICONS[task.platform] || PLATFORM_ICONS.custom;
            const Icon = meta.icon;
            const isCompleted = Boolean(task.completed);

            return (
              <div
                key={task.id}
                className={`p-5 rounded-3xl border transition-all relative flex flex-col justify-between ${
                  isCompleted
                    ? 'bg-[#080c16]/70 border-emerald-500/30'
                    : 'bg-[#0a0f1d] border-slate-800 hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-500/5'
                }`}
              >
                <div>
                  {/* Card Header: Platform Badge + Reward */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${meta.bg} ${meta.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-black text-slate-300 block">{meta.name}</span>
                        {task.badgeText && (
                          <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            {task.badgeText}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-black text-sm shadow-inner inline-flex items-center gap-1">
                        <span>+${task.rewardUsd.toFixed(2)}</span>
                        <span className="text-[10px] text-emerald-300 font-sans font-bold">USD</span>
                      </div>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-black text-white leading-snug mb-1.5">
                    {task.titleBn || task.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {task.descriptionBn || task.description}
                  </p>
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{task.timerSeconds || 8} সেকেন্ড ভেরিফিকেশন</span>
                  </div>

                  {isCompleted ? (
                    <div className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>সম্পন্ন হয়েছে</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartTask(task)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-md shadow-purple-500/20 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    >
                      <span>টাস্ক শুরু করুন</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* INTERACTIVE TASK VERIFICATION MODAL */}
      {activeTask && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="max-w-md w-full bg-[#0d1424] border border-purple-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                {(() => {
                  const meta = PLATFORM_ICONS[activeTask.platform] || PLATFORM_ICONS.custom;
                  const Icon = meta.icon;
                  return (
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${meta.bg} ${meta.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  );
                })()}
                <div>
                  <h4 className="text-sm font-black text-white">{activeTask.titleBn || activeTask.title}</h4>
                  <span className="text-[10px] text-emerald-400 font-bold">
                    রিওয়ার্ড: +${activeTask.rewardUsd.toFixed(2)} USD
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTask(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorToast && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorToast}</span>
              </div>
            )}

            {/* Instruction Steps */}
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-[#080d19] border border-slate-800 space-y-2">
                <div className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">
                    ১
                  </span>
                  <span>প্রথম ধাপ: সোশ্যাল পেজ ভিজিট করুন</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  নিচের বাটনে ক্লিক করে অফিশিয়াল সোশ্যাল পেজটি নতুন ট্যাবে খুলুন এবং ফলো/সাবস্ক্রাইব/জয়েন সম্পন্ন করুন।
                </p>

                <button
                  type="button"
                  onClick={handleOpenLink}
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{visitedLink ? 'আবার লিংকটি খুলুন' : 'লিংক ওপেন করুন ও ফলো করুন'}</span>
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#080d19] border border-slate-800 space-y-2">
                <div className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                    ২
                  </span>
                  <span>দ্বিতীয় ধাপ: স্বয়ংক্রিয় ভেরিফিকেশন ও ক্লেইম</span>
                </div>

                {!visitedLink ? (
                  <p className="text-[11px] text-slate-500 italic text-center py-2">
                    ভেরিফিকেশন শুরু করতে প্রথমে উপরের লিংকটি ওপেন করুন।
                  </p>
                ) : timerRemaining > 0 ? (
                  <div className="text-center py-3 space-y-1.5">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border-2 border-amber-400 text-amber-400 font-mono font-black text-lg animate-pulse">
                      {timerRemaining}s
                    </div>
                    <p className="text-[11px] text-slate-400">
                      ভেরিফিকেশন সম্পন্ন হচ্ছে, দয়া করে অপেক্ষা করুন...
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-2 space-y-1">
                    <div className="text-emerald-400 text-xs font-black flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ভেরিফিকেশন সফল হয়েছে!</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      এখন নিচের বাটনে ক্লিক করে সরাসরি ওয়ালেটে রিওয়ার্ড জমা করুন।
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Claim Reward Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={!visitedLink || timerRemaining > 0 || claiming}
                onClick={handleClaimReward}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                {claiming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>ব্যালেন্স যুক্ত হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Award className="w-5 h-5 text-amber-300" />
                    <span>রিওয়ার্ড ক্লেইম করুন (+${activeTask.rewardUsd.toFixed(2)} USD)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
