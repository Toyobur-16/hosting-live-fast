import React, { useState, useEffect, useRef } from 'react';
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
  ShieldCheck,
  Upload,
  Image as ImageIcon,
  Eye,
  FileCheck,
  ListOrdered
} from 'lucide-react';
import { SocialTask, SocialPlatform, TaskCompletionLog } from '../types';
import { db, doc, setDoc } from '../lib/firebase';

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
  const [activeTab, setActiveTab] = useState<'available' | 'completed'>('available');
  const [tasks, setTasks] = useState<SocialTask[]>([]);
  const [mySubmissions, setMySubmissions] = useState<TaskCompletionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');

  // Submit proof modal
  const [activeTask, setActiveTask] = useState<SocialTask | null>(null);
  const [visitedLink, setVisitedLink] = useState(false);
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [screenshotFileName, setScreenshotFileName] = useState<string>('');
  const [proofNote, setProofNote] = useState('');
  const [submittingProof, setSubmittingProof] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // View screenshot modal
  const [viewImageSrc, setViewImageSrc] = useState<string | null>(null);

  const [successToast, setSuccessToast] = useState<{ title: string; reward: number; isPending?: boolean } | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTasksAndSubmissions();
  }, [user]);

  const fetchTasksAndSubmissions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('bot_auth_token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [tasksRes, subsRes] = await Promise.all([
        fetch('/api/social-tasks', { headers }).then((r) => r.json()).catch(() => ({ success: false })),
        token ? fetch('/api/user/social-tasks/submissions', { headers }).then((r) => r.json()).catch(() => ({ success: false })) : { success: false }
      ]);

      if (tasksRes.success) {
        setTasks(tasksRes.tasks || []);
      }
      if (subsRes.success) {
        setMySubmissions(subsRes.submissions || []);
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
    setScreenshotData(null);
    setScreenshotFileName('');
    setProofNote('');
    setModalError(null);
  };

  const handleOpenLink = () => {
    if (!activeTask) return;
    window.open(activeTask.link, '_blank', 'noopener,noreferrer');
    setVisitedLink(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setModalError(lang === 'bn' ? 'অনুগ্রহ করে শুধুমাত্র ছবি ফাইল (JPG, PNG) আপলোড করুন।' : 'Please upload an image file (JPG, PNG).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setModalError(lang === 'bn' ? 'ছবির সাইজ সর্বোচ্চ 10MB হতে পারে।' : 'Image size cannot exceed 10MB.');
      return;
    }

    setModalError(null);
    setScreenshotFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async () => {
    if (!activeTask) return;
    if (!user) {
      onOpenAuthModal();
      return;
    }

    if (!screenshotData) {
      setModalError(lang === 'bn' ? 'টাস্ক সম্পন্ন করার স্ক্রিনশট প্রমাণ আপলোড করা আবশ্যক!' : 'Screenshot proof is required!');
      return;
    }

    try {
      setSubmittingProof(true);
      setModalError(null);
      const token = localStorage.getItem('bot_auth_token');

      const res = await fetch(`/api/social-tasks/${activeTask.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          screenshot: screenshotData,
          proofNote: proofNote.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Direct real-time sync to Firestore so admin panel catches it live immediately
        if (data.submission) {
          try {
            const cleanSub = JSON.parse(JSON.stringify(data.submission));
            await setDoc(doc(db, 'task_completions', data.submission.id), cleanSub);
          } catch (fbErr) {
            console.warn('Direct Firestore task submission sync notice:', fbErr);
          }
        }

        setSuccessToast({
          title: activeTask.titleBn || activeTask.title,
          reward: activeTask.rewardUsd,
          isPending: true
        });

        setActiveTask(null);
        setActiveTab('completed');
        fetchTasksAndSubmissions();
        setTimeout(() => setSuccessToast(null), 7000);
      } else {
        setModalError(data.error || 'টাস্ক সাবমিট করা যায়নি।');
      }
    } catch (err: any) {
      setModalError(err.message || 'নেটওয়ার্ক সমস্যা হয়েছে।');
    } finally {
      setSubmittingProof(false);
    }
  };

  // Filter available tasks: User has NOT submitted them yet (or completed)
  const submittedTaskIds = new Set(
    mySubmissions.filter((s) => s.status !== 'rejected').map((s) => s.taskId)
  );

  const availableTasks = tasks.filter((t) => !submittedTaskIds.has(t.id) && !t.completed);

  const filteredAvailableTasks = availableTasks.filter((t) => {
    if (selectedPlatform === 'all') return true;
    return t.platform === selectedPlatform;
  });

  const totalRewardEarned = mySubmissions
    .filter((s) => s.status === 'approved')
    .reduce((sum, s) => sum + (s.rewardUsd || 0), 0);

  const pendingSubmissionsCount = mySubmissions.filter((s) => s.status === 'pending').length;

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
              {lang === 'bn' ? 'টাস্ক সম্পন্ন করুন ও স্ক্রিনশট দিয়ে ডলার আয় করুন' : 'Complete Tasks & Earn Instant USD Rewards'}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {lang === 'bn'
                ? 'চ্যানেলে জয়েন, লাইক, কমেন্ট বা সাবস্ক্রাইব করে একটি স্ক্রিনশট জমা দিন। এডমিন ভেরিফাই করে সরাসরি আপনার ওয়ালেটে ডলার যুক্ত করে দিবে। অর্জিত ডলার দিয়ে বট ও ওয়েবসাইট হোস্ট করুন!'
                : 'Join channels, like, comment, or subscribe and submit a screenshot proof. Admin approves and credits USD directly to your wallet!'}
            </p>

            <div className="flex items-center gap-3 pt-2 text-xs font-bold flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>{lang === 'bn' ? 'স্ক্রিনশট প্রুফ সিস্টেম' : 'Screenshot Proof System'}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'bn' ? 'এডমিন ভেরিফাইড ক্যাশআউট' : 'Admin Verified Payout'}</span>
              </div>
            </div>
          </div>

          {/* User Earnings Card */}
          <div className="shrink-0 w-full sm:w-auto p-4 rounded-2xl bg-[#0d1424] border border-purple-500/30 shadow-xl space-y-3 min-w-[240px]">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
              <span>{lang === 'bn' ? 'আপনার মোট আয়:' : 'Total Earned:'}</span>
              <span className="font-mono text-emerald-400 font-black text-sm">
                +${totalRewardEarned.toFixed(2)} USD
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
              <span>{lang === 'bn' ? 'বর্তমান ব্যালেন্স:' : 'Wallet Balance:'}</span>
              <span className="font-mono text-cyan-400 font-black text-sm">
                ${Number(user?.balanceUsd || 0).toFixed(2)} USDT
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={onNavigateToWallet}
                className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'ওয়ালেট' : 'Wallet'}</span>
              </button>
              <button
                type="button"
                onClick={onNavigateToPlans}
                className="flex-1 py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <span>{lang === 'bn' ? 'প্ল্যান কিনুন' : 'Buy Plans'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TOASTS */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between shadow-xl animate-in zoom-in-95">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-sm">
                {lang === 'bn' ? '✓ স্ক্রিনশট সফলভাবে জমা হয়েছে!' : '✓ Screenshot proof submitted!'}
              </p>
              <p className="text-[11px] text-emerald-300">
                {lang === 'bn'
                  ? `"${successToast.title}" টাস্কটি এডমিন পর্যালোচনার পর $${successToast.reward.toFixed(2)} USD আপনার ওয়ালেটে যুক্ত হবে।`
                  : `Admin will review and credit $${successToast.reward.toFixed(2)} USD to your wallet shortly.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="p-1 rounded-lg hover:bg-emerald-900/50 text-emerald-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorToast && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between shadow-xl animate-in zoom-in-95">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="font-bold">{errorToast}</span>
          </div>
          <button
            onClick={() => setErrorToast(null)}
            className="p-1 rounded-lg hover:bg-rose-900/50 text-rose-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MAIN TWO NAVIGATION TABS */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {/* Tab 1: Available Tasks */}
          <button
            type="button"
            onClick={() => setActiveTab('available')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'available'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                : 'bg-[#080d19] border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-300" />
            <span>{lang === 'bn' ? 'উপলব্ধ টাস্কসমূহ' : 'Available Tasks'}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white">
              {availableTasks.length}
            </span>
          </button>

          {/* Tab 2: My Submitted / Completed Tasks */}
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer relative ${
              activeTab === 'completed'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                : 'bg-[#080d19] border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <FileCheck className="w-4 h-4 text-emerald-300" />
            <span>{lang === 'bn' ? 'আমার জমাকৃত ও সম্পন্ন টাস্ক' : 'My Submissions'}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white">
              {mySubmissions.length}
            </span>
            {pendingSubmissionsCount > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping absolute -top-1 -right-1" />
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={fetchTasksAndSubmissions}
          className="text-xs text-slate-400 hover:text-white font-bold flex items-center gap-1 cursor-pointer transition"
        >
          <span>{lang === 'bn' ? 'রিফ্রেশ' : 'Refresh'}</span>
        </button>
      </div>

      {/* VIEW 1: AVAILABLE TASKS */}
      {activeTab === 'available' && (
        <div className="space-y-4">
          {/* Platform Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedPlatform('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedPlatform === 'all'
                  ? 'bg-slate-200 text-slate-950 font-black'
                  : 'bg-[#080d19] border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'সকল টাস্ক' : 'All Tasks'} ({availableTasks.length})
            </button>

            {Object.entries(PLATFORM_ICONS).map(([key, meta]) => {
              const count = availableTasks.filter((t) => t.platform === key).length;
              if (count === 0 && selectedPlatform !== key) return null;
              const Icon = meta.icon;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedPlatform(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    selectedPlatform === key
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-[#080d19] border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{meta.name}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Tasks List */}
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400 mb-2" />
              <p className="text-xs">{lang === 'bn' ? 'টাস্ক লোড হচ্ছে...' : 'Loading tasks...'}</p>
            </div>
          ) : filteredAvailableTasks.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#080d19] border border-slate-800 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">
                {lang === 'bn' ? '🎉 আপনি সকল উপলব্ধ টাস্ক সম্পন্ন করেছেন!' : 'All Tasks Completed!'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                {lang === 'bn'
                  ? 'আপনার জমাকৃত টাস্কের স্ট্যাটাস দেখতে উপরের "আমার জমাকৃত ও সম্পন্ন টাস্ক" ট্যাবে যান। নতুন টাস্ক যোগ হলে এখানে দেখা যাবে।'
                  : 'Check "My Submissions" tab to see approval status of your completed tasks.'}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('completed')}
                className="mt-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition cursor-pointer"
              >
                {lang === 'bn' ? 'জমাকৃত টাস্কের স্ট্যাটাস দেখুন' : 'View Submitted Tasks'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAvailableTasks.map((task) => {
                const meta = PLATFORM_ICONS[task.platform] || PLATFORM_ICONS.custom;
                const Icon = meta.icon;

                return (
                  <div
                    key={task.id}
                    className="relative rounded-2xl bg-[#0a1020] border border-slate-800/80 hover:border-purple-500/50 p-5 shadow-lg flex flex-col justify-between transition-all group"
                  >
                    <div>
                      {/* Card Header: Platform & Reward */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${meta.bg}`}>
                            <Icon className={`w-4 h-4 ${meta.color}`} />
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                              {meta.name}
                            </span>
                            {task.badgeText && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                <Flame className="w-2.5 h-2.5 text-amber-400" />
                                {task.badgeText}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black">
                          <span>+${task.rewardUsd.toFixed(2)} USD</span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-sm sm:text-base font-bold text-white mb-1.5 leading-snug group-hover:text-purple-300 transition-colors">
                        {lang === 'bn' ? (task.titleBn || task.title) : task.title}
                      </h3>

                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-4">
                        {lang === 'bn' ? (task.descriptionBn || task.description) : task.description}
                      </p>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={() => handleStartTask(task)}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-600/20 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{lang === 'bn' ? 'টাস্ক করুন ও স্ক্রিনশট জমা দিন' : 'Complete & Submit Proof'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: MY SUBMITTED & COMPLETED TASKS */}
      {activeTab === 'completed' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#080d19] border border-slate-800 p-4 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-white">
                {lang === 'bn' ? 'আপনার সকল জমাকৃত ও সম্পন্ন টাস্ক' : 'Your Task Submissions'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'bn'
                  ? 'স্ক্রিনশট জমা দেওয়ার পর এডমিন যাচাই করে অ্যাপ্রুভ করলে সাথে সাথে ওয়ালেটে ডলার যোগ হয়ে যায়।'
                  : 'Track submission approvals and earnings here.'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">মোট জমাকৃত</span>
              <span className="text-base font-black text-purple-400">{mySubmissions.length} টি</span>
            </div>
          </div>

          {mySubmissions.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#080d19] border border-slate-800 space-y-3">
              <Upload className="w-10 h-10 mx-auto text-slate-500" />
              <p className="text-sm font-bold text-slate-300">
                {lang === 'bn' ? 'আপনি এখনো কোনো টাস্কের স্ক্রিনশট জমা দেননি।' : 'No submissions yet.'}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('available')}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition cursor-pointer"
              >
                {lang === 'bn' ? 'উপলব্ধ টাস্কসমূহ দেখুন' : 'Browse Available Tasks'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {mySubmissions.map((sub) => {
                const meta = PLATFORM_ICONS[sub.platform] || PLATFORM_ICONS.custom;
                const Icon = meta.icon;

                return (
                  <div
                    key={sub.id}
                    className="p-4 sm:p-5 rounded-2xl bg-[#0a1020] border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${meta.bg}`}>
                        <Icon className={`w-5 h-5 ${meta.color}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="text-sm font-bold text-white truncate">{sub.taskTitle}</h4>
                          <span className="font-mono text-xs font-black text-emerald-400">
                            +${sub.rewardUsd.toFixed(2)} USD
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                          <span>{meta.name}</span>
                          <span>•</span>
                          <span className="font-mono text-[11px]">
                            {new Date(sub.submittedAt).toLocaleDateString()} {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {sub.proofNote && (
                          <p className="text-xs text-slate-400 mt-1 italic">
                            মন্তব্য: {sub.proofNote}
                          </p>
                        )}

                        {sub.status === 'rejected' && sub.rejectReason && (
                          <p className="text-xs text-rose-400 font-medium mt-1">
                            বাতিলের কারণ: {sub.rejectReason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                      {/* Screenshot Preview Button */}
                      {sub.screenshotUrl && (
                        <button
                          type="button"
                          onClick={() => setViewImageSrc(sub.screenshotUrl || null)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
                          title="আপনার জমা দেওয়া স্ক্রিনশট দেখুন"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{lang === 'bn' ? 'স্ক্রিনশট' : 'Proof'}</span>
                        </button>
                      )}

                      {/* Status Badge */}
                      {sub.status === 'pending' && (
                        <span className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                          <span>{lang === 'bn' ? 'পর্যালোচনায় আছে' : 'Pending Review'}</span>
                        </span>
                      )}

                      {sub.status === 'approved' && (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{lang === 'bn' ? 'অ্যাপ্রুভড (ক্রেডিটেড)' : 'Approved'}</span>
                        </span>
                      )}

                      {sub.status === 'rejected' && (
                        <span className="px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-rose-400" />
                          <span>{lang === 'bn' ? 'বাতিল হয়েছে' : 'Rejected'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: SUBMIT PROOF MODAL */}
      {activeTask && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !submittingProof) setActiveTask(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in cursor-pointer"
        >
          <div className="bg-[#0b1222] border border-purple-500/40 rounded-3xl p-5 sm:p-6 max-w-lg w-full text-slate-100 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto cursor-default">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {lang === 'bn' ? 'টাস্ক করুন ও স্ক্রিনশট জমা দিন' : 'Submit Task Proof'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {activeTask.titleBn || activeTask.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTask(null)}
                disabled={submittingProof}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Task Info Pill */}
            <div className="p-3 bg-[#060c18] border border-slate-800 rounded-2xl flex items-center justify-between">
              <span className="text-xs text-slate-400">{lang === 'bn' ? 'অর্জিত হবে:' : 'Reward:'}</span>
              <span className="text-sm font-black text-emerald-400 font-mono">
                +${activeTask.rewardUsd.toFixed(2)} USD
              </span>
            </div>

            {/* Steps Instructions */}
            <div className="space-y-3">
              {/* Step 1: Open Target Link */}
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center">
                      ১
                    </span>
                    <span>{lang === 'bn' ? 'লিংকে গিয়ে কাজটি সম্পন্ন করুন' : 'Step 1: Open & Complete Action'}</span>
                  </span>
                  {visitedLink && (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>{lang === 'bn' ? 'ওপেন করা হয়েছে' : 'Opened'}</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300">
                  {lang === 'bn'
                    ? 'নিচের বাটনে ক্লিক করে সোশ্যাল মিডিয়ায় কাজটি (লাইক, সাবস্ক্রাইব, কমেন্ট বা ফলো) করুন:'
                    : 'Click below to visit and complete the action (like, subscribe, comment, or follow):'}
                </p>

                <button
                  type="button"
                  onClick={handleOpenLink}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'লিংকটি ওপেন করুন (নতুন ট্যাব)' : 'Open Target Link'}</span>
                </button>
              </div>

              {/* Step 2: Upload Screenshot */}
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center">
                    ২
                  </span>
                  <span>{lang === 'bn' ? 'কাজের স্ক্রিনশট প্রমাণ আপলোড করুন *' : 'Step 2: Upload Screenshot Proof *'}</span>
                </span>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {screenshotData ? (
                  <div className="relative rounded-2xl overflow-hidden border border-emerald-500/50 bg-black/60 p-2 space-y-2">
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center">
                      <img
                        src={screenshotData}
                        alt="Screenshot Preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-emerald-400 font-bold truncate max-w-[200px]">
                        ✓ {screenshotFileName || 'Screenshot Ready'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setScreenshotData(null);
                          setScreenshotFileName('');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer"
                      >
                        {lang === 'bn' ? 'মুছে ফেলুন' : 'Remove'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-5 rounded-2xl border-2 border-dashed border-slate-700 hover:border-purple-500 bg-[#060c18] text-center cursor-pointer transition space-y-2"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-500/15 text-purple-400 flex items-center justify-center mx-auto">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">
                        {lang === 'bn' ? 'কাজের স্ক্রিনশট সিলেক্ট করতে এখানে ক্লিক করুন' : 'Click to Upload Screenshot'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        JPG, PNG (Max 10MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Optional Username / Note */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {lang === 'bn' ? 'ইউজারনেম বা মন্তব্য (Optional):' : 'Social Username or Note (Optional):'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'bn' ? 'যেমন: Telegram @username বা YouTube নাম' : 'e.g. Telegram @username or YouTube name'}
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#060c18] border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              {modalError && (
                <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl text-xs text-rose-300 font-medium">
                  {modalError}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTask(null)}
                disabled={submittingProof}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>

              <button
                type="button"
                disabled={submittingProof || !screenshotData}
                onClick={handleSubmitProof}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-black text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {submittingProof ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === 'bn' ? 'জমা হচ্ছে...' : 'Submitting...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{lang === 'bn' ? 'স্ক্রিনশট জমা দিন' : 'Submit Task Proof'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: FULL IMAGE PREVIEW */}
      {viewImageSrc && (
        <div
          onClick={() => setViewImageSrc(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-2 cursor-default"
          >
            <div className="flex items-center justify-between p-2 pb-3 border-b border-slate-800 mb-2">
              <span className="text-xs font-bold text-slate-300">
                {lang === 'bn' ? 'জমা দেওয়া স্ক্রিনশট প্রমাণ' : 'Submitted Screenshot Proof'}
              </span>
              <button
                type="button"
                onClick={() => setViewImageSrc(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[80vh] overflow-auto flex items-center justify-center bg-black/60 rounded-xl">
              <img
                src={viewImageSrc}
                alt="Submitted Proof"
                className="max-w-full max-h-[75vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
