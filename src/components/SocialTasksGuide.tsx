import React from 'react';
import {
  Share2,
  Zap,
  DollarSign,
  Sparkles,
  ShieldCheck,
  Award,
  ChevronRight
} from 'lucide-react';

interface SocialTasksGuideProps {
  lang?: 'bn' | 'en';
  onNavigateToRewards?: () => void;
  onContactSupport: () => void;
}

export const SocialTasksGuide: React.FC<SocialTasksGuideProps> = ({
  lang = 'bn',
  onNavigateToRewards,
  onContactSupport
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hero Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0c1424] via-[#0f1b33] to-[#162238] border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-black tracking-wide uppercase">
            <Share2 className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'সোশ্যাল টাস্ক ও ওয়ালেট রিওয়ার্ড গাইড' : 'Social Tasks & Rewards Guide'}</span>
          </div>

          <h3 className="text-lg sm:text-2xl font-black text-white leading-tight">
            {lang === 'bn'
              ? 'সহজ সোশ্যাল টাস্ক সম্পন্ন করে ফ্রি ব্যালেন্স উপার্জন করুন'
              : 'Complete Easy Social Tasks & Earn Free Wallet Balance'}
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            {lang === 'bn'
              ? 'টেলিগ্রাম চ্যানেল বা গ্রুপে জয়েন, ইউটিউব সাবস্ক্রাইব এবং ফেসবুক পেজে যুক্ত হয়ে রিয়েল ওয়ালেট ব্যালেন্স ($USD ও টাকা) আয় করুন। অর্জিত ব্যালেন্স দিয়ে নিজের পকেট থেকে টাকা ছাড়াই সম্পূর্ণ ফ্রিতে প্রিমিয়াম বট ও ওয়েবসাইট হোস্টিং প্ল্যান চালু করুন!'
              : 'Join Telegram channels, subscribe to YouTube, and follow social channels to earn real wallet balance. Use your earnings to activate premium bot hosting & websites 100% free!'}
          </p>

          {/* Fast Key Metrics Pill Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                {lang === 'bn' ? 'টাস্কের ধরন' : 'Task Types'}
              </span>
              <span className="text-xs sm:text-sm font-black text-emerald-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'টেলিগ্রাম ও সোশ্যাল' : 'TG & Social'}</span>
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                {lang === 'bn' ? 'রিওয়ার্ড ক্রেডিট' : 'Reward Credit'}
              </span>
              <span className="text-xs sm:text-sm font-black text-amber-400 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'সরাসরি ওয়ালেটে' : 'Direct Wallet'}</span>
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                {lang === 'bn' ? 'হোস্টিং সুবিধা' : 'Hosting Benefit'}
              </span>
              <span className="text-xs sm:text-sm font-black text-sky-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? '১০০% ফ্রি হোস্টিং' : '100% Free Plan'}</span>
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                {lang === 'bn' ? 'ভেরিফিকেশন' : 'Verification'}
              </span>
              <span className="text-xs sm:text-sm font-black text-indigo-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'দ্রুত এডমিন রিভিউ' : 'Fast Admin Review'}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Step by step guide */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#0d1526] border border-slate-200 dark:border-[#1e293b] space-y-4">
        <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          <span>{lang === 'bn' ? 'কীভাবে সোশ্যাল টাস্ক সম্পন্ন করবেন?' : 'How to Complete Social Tasks?'}</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-amber-500 font-black">১. টাস্ক নির্বাচন করুন</span>
            <p className="text-slate-600 dark:text-slate-300">
              সোশ্যাল টাস্ক আর্ন পেজে গিয়ে সক্রিয় টেলিগ্রাম চ্যানেল, গ্রুপ বা ইউটিউব টাস্কের তালিকা থেকে পছন্দের টাস্ক সিলেক্ট করুন।
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-amber-500 font-black">২. লিংকে ক্লিক ও জয়েন</span>
            <p className="text-slate-600 dark:text-slate-300">
              'টাস্কে যান' বাটনে ক্লিক করে অফিশিয়াল চ্যানেলে যুক্ত হোন বা ইউটিউব চ্যানেলে সাবস্ক্রাইব করুন।
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-amber-500 font-black">৩. প্রমাণ সাবমিট করুন</span>
            <p className="text-slate-600 dark:text-slate-300">
              টাস্কের বক্সে আপনার টেলিগ্রাম ইউজারনেম (@username) বা চ্যানেল লিংক লিখে 'সাবমিট করুন' বাটনে চাপ দিন।
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-amber-500 font-black">৪. ওয়ালেটে ব্যালেন্স রিওয়ার্ড</span>
            <p className="text-slate-600 dark:text-slate-300">
              এডমিন যাচাই করার পরপরই আপনার একাউন্টে প্রতিশ্রুত রিওয়ার্ড স্বয়ংক্রিয়ভাবে জমা হয়ে যাবে।
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          {onNavigateToRewards && (
            <button
              type="button"
              onClick={onNavigateToRewards}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 transition active:scale-95"
            >
              <Share2 className="w-4 h-4 stroke-[2.5]" />
              <span>{lang === 'bn' ? 'সোশ্যাল টাস্ক সেন্টারে প্রবেশ করুন' : 'Go to Social Tasks'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onContactSupport}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
          >
            <span>{lang === 'bn' ? 'সাপোর্টে প্রশ্ন করুন' : 'Contact Support'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
