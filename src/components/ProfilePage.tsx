import React from 'react';
import {
  User,
  Crown,
  Wallet,
  Bot,
  Calendar,
  ShieldCheck,
  LogOut,
  Sparkles,
  ArrowRight,
  Zap,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { AuthUser } from '../types';

interface ProfilePageProps {
  user: AuthUser | null;
  onOpenAuthModal: () => void;
  onNavigateToWallet: () => void;
  onNavigateToPlans: () => void;
  onNavigateToBots: () => void;
  onLogout: () => void;
  isAdmin: boolean;
  onOpenAdminModal: () => void;
  onUserUpdate?: (user: AuthUser) => void;
  lang?: 'bn' | 'en';
}

export function ProfilePage({
  user,
  onOpenAuthModal,
  onNavigateToWallet,
  onNavigateToPlans,
  onNavigateToBots,
  onLogout,
  isAdmin,
  onOpenAdminModal,
  lang = 'bn'
}: ProfilePageProps) {
  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 px-6 text-center rounded-3xl bg-[#0d1424] border border-[#1e293b] space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#162238] flex items-center justify-center mx-auto text-[#00d293]">
          <User className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-white">প্রোফাইল দেখতে লগইন করুন</h3>
        <p className="text-xs text-slate-400">
          আপনার ওয়ালেট ব্যালেন্স, প্লান ও বট দেখতে অ্যাকাউন্টে লগইন করুন বা নতুন রেজিস্টার করুন।
        </p>
        <button
          onClick={onOpenAuthModal}
          className="px-6 py-3 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs cursor-pointer shadow-lg shadow-[#00d293]/20"
        >
          Login / Register
        </button>
      </div>
    );
  }

  const isExpired = user.planExpiresAt ? user.planExpiresAt < Date.now() : false;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 animate-in fade-in duration-200">
      {/* Profile Header Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0f1b2b] to-[#070e18] border border-[#1e2e42] shadow-xl flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1e293b] to-[#0f172a] border-3 border-[#00d293] flex items-center justify-center text-white font-black text-2xl shadow-lg shrink-0">
          {(user.name || user.email || 'U').charAt(0).toUpperCase()}
        </div>

        <div className="space-y-1.5 flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-xl font-black text-white">{user.name || 'User'}</h2>
            {isAdmin && (
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-black">
                👑 Super Admin
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">{user.email}</p>
          {user.phoneNumber && (
            <p className="text-xs text-emerald-400 font-mono font-bold flex items-center justify-center sm:justify-start gap-1.5">
              <span>📱 {user.phoneNumber}</span>
              {user.phoneVerified && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-sans font-semibold">
                  ফোন ভেরিফাইড
                </span>
              )}
            </p>
          )}
          <p className="text-[11px] text-[#00d293] font-semibold flex items-center justify-center sm:justify-start gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Account</span>
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={onOpenAdminModal}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer shadow-md transition-all shrink-0"
          >
            Admin Panel
          </button>
        )}
      </div>

      {/* Wallet Balance Card */}
      <div className="p-6 rounded-3xl bg-[#0d1424] border border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-slate-400 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#00d293]" />
            <span>মোট ওয়ালেট ব্যালেন্স (USDT)</span>
          </span>
          <div className="flex items-baseline gap-2.5 mt-1">
            <span className="text-2xl sm:text-3xl font-black text-white">${Number(user.balanceUsd || 0).toFixed(2)}</span>
            <span className="text-xs font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-[#00d293] uppercase">USDT</span>
          </div>
        </div>

        <button
          onClick={onNavigateToWallet}
          className="px-5 py-2.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all hover:scale-102 self-start sm:self-center"
        >
          + USDT ডিপোজিট করুন
        </button>
      </div>

      {/* Subscription Plan Card */}
      <div className="p-6 rounded-3xl bg-[#0d1424] border border-[#1e293b] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black text-white">হোস্টিং সাবস্ক্রিপশন</h3>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full font-black ${
              user.plan && user.plan !== 'free' && !isExpired
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {user.plan && user.plan !== 'free' ? (isExpired ? 'EXPIRED' : 'ACTIVE') : 'FREE TIER'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-[#070b14] border border-[#1e293b]">
          <div>
            <span className="text-[11px] text-slate-400">বর্তমান প্যাকেজ:</span>
            <span className="text-sm font-black text-white block uppercase mt-0.5">
              {user.plan || 'Free'}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400">বট হোস্টিং লিমিট:</span>
            <span className="text-sm font-black text-[#00d293] block mt-0.5">
              {user.maxBots || 0} টি বট চালাতে পারবেন
            </span>
          </div>
          <div className="sm:col-span-2 pt-2 border-t border-[#1e293b]/60 flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>মেয়াদ উত্তীর্ণের তারিখ:</span>
            </span>
            <span className="font-bold text-slate-200">
              {user.planExpiresAt ? new Date(user.planExpiresAt).toLocaleDateString() : 'লাইফটাইম ফ্রি / নো সাবস্ক্রিপশন'}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onNavigateToPlans}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>নতুন প্ল্যান আপগ্রেড করুন</span>
          </button>
          <button
            onClick={onNavigateToBots}
            className="flex-1 py-2.5 rounded-xl bg-[#111827] hover:bg-[#1f293d] border border-[#1e293b] text-slate-200 font-bold text-xs cursor-pointer transition-all"
          >
            আমার বট সমূহ দেখুন
          </button>
        </div>
      </div>

      {/* Purchased Files & Source Code Section */}
      <div className="p-6 rounded-3xl bg-[#0d1424] border border-[#1e293b] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#00d293]" />
            <h3 className="text-base font-black text-white">আমার কেনা ফাইল ও সোর্স কোড (Purchased Files)</h3>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#1e293b] text-slate-300 font-bold">
            {user.purchasedItems?.length || user.purchasedItemIds?.length || 0} টি ফাইল
          </span>
        </div>

        {user.purchasedItems && user.purchasedItems.length > 0 ? (
          <div className="space-y-3">
            {user.purchasedItems.map((p, idx) => (
              <div
                key={`${p.itemId}_${idx}`}
                className="p-4 rounded-2xl bg-[#070b14] border border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <h4 className="text-sm font-bold text-white">{p.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>কেনা হয়েছে: {new Date(p.purchasedAt).toLocaleDateString()}</span>
                  </p>
                </div>

                <button
                  onClick={() => {
                    const token = localStorage.getItem('bot_auth_token') || '';
                    if (p.fileUrl && (p.fileUrl.startsWith('http://') || p.fileUrl.startsWith('https://'))) {
                      window.open(p.fileUrl, '_blank');
                    } else {
                      window.open(`/api/store/items/${p.itemId}/download?token=${encodeURIComponent(token)}`, '_blank');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer shadow-md flex items-center justify-center gap-1.5 transition-all hover:scale-102"
                >
                  <span>📥 ফাইল ডাউনলোড করুন</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-[#070b14] border border-[#1e293b] text-center space-y-2">
            <p className="text-xs text-slate-400">আপনি এখনও কোনো প্রিমিয়াম ফাইল বা সোর্স কোড ক্রয় করেননি।</p>
            <p className="text-[11px] text-slate-500">
              হোমপেজ বা মার্কেটপ্লেস থেকে যেকোনো ফাইল ক্রয় করলে তা এখানে যুক্ত হবে এবং সরাসরি ডাউনলোড করতে পারবেন।
            </p>
          </div>
        )}
      </div>

      {/* Logout button */}
      <button
        onClick={onLogout}
        className="w-full py-3 rounded-2xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span>অ্যাকাউন্ট থেকে লগআউট করুন</span>
      </button>
    </div>
  );
}
