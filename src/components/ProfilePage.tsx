import React, { useState, useEffect } from 'react';
import {
  User,
  Crown,
  Wallet,
  Bot,
  Calendar,
  ShieldCheck,
  LogOut,
  Sparkles,
  Database,
  Globe,
  Share2,
  Edit3,
  Check,
  X,
  RefreshCw,
  FileText,
  CreditCard,
  Phone,
  Mail,
  CheckCircle2
} from 'lucide-react';
import { AuthUser } from '../types';
import { db, doc, setDoc, collection, query, where, getDocs } from '../lib/firebase';

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
  onUserUpdate,
  lang = 'bn'
}: ProfilePageProps) {
  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Firestore Document Counts
  const [docStats, setDocStats] = useState({
    botsCount: 0,
    websitesCount: 0,
    tasksCount: 0,
    depositsCount: 0,
    transactionsCount: 0,
    isSynced: false,
    lastSyncedAt: ''
  });
  const [syncingDocs, setSyncingDocs] = useState(false);

  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditPhone(user.phoneNumber || '');
      setEditAvatar(user.avatar || '');
      fetchUserFirestoreDocuments();
    }
  }, [user?.id, user?.email]);

  const fetchUserFirestoreDocuments = async () => {
    if (!user) return;
    try {
      setSyncingDocs(true);
      let botsCount = 0;
      let websitesCount = 0;
      let tasksCount = 0;
      let depositsCount = 0;
      let transactionsCount = 0;

      // 1. Fetch user's bots from Firestore
      try {
        const botsSnap = await getDocs(query(collection(db, 'bots'), where('ownerId', '==', user.id)));
        botsCount = botsSnap.size;
        if (botsCount === 0 && user.email) {
          const botsEmailSnap = await getDocs(query(collection(db, 'bots'), where('ownerEmail', '==', user.email.toLowerCase())));
          botsCount = botsEmailSnap.size;
        }
      } catch {}

      // 2. Fetch user's websites from Firestore
      try {
        const siteSnap = await getDocs(query(collection(db, 'websites'), where('userId', '==', user.id)));
        websitesCount = siteSnap.size;
      } catch {}

      // 3. Fetch user's completed social tasks from Firestore
      try {
        const taskSnap = await getDocs(query(collection(db, 'task_completions'), where('userId', '==', user.id)));
        tasksCount = taskSnap.size;
      } catch {}

      // 4. Fetch user's deposits & plan requests from Firestore
      try {
        const reqSnap = await getDocs(query(collection(db, 'plan_requests'), where('userId', '==', user.id)));
        depositsCount = reqSnap.size;
      } catch {}

      // 5. Fetch user's wallet transactions ledger
      try {
        const txSnap = await getDocs(query(collection(db, 'wallet_transactions'), where('userId', '==', user.id)));
        transactionsCount = txSnap.size;
      } catch {}

      setDocStats({
        botsCount,
        websitesCount,
        tasksCount,
        depositsCount,
        transactionsCount,
        isSynced: true,
        lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } catch {
      // Fallback
    } finally {
      setSyncingDocs(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const finalName = editName.trim() || user.name || 'User';
    const finalPhone = editPhone.trim();

    try {
      setSaving(true);
      const updatedUser: AuthUser = {
        ...user,
        name: finalName,
        phoneNumber: finalPhone,
        avatar: editAvatar.trim() || user.avatar || ''
      };

      // 1. Direct write to Firebase Firestore /accounts/{user.id}
      try {
        await setDoc(doc(db, 'accounts', user.id), {
          ...updatedUser,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Direct Firestore account write error:', err);
      }

      // 2. Update server backend
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: finalName,
          phone: finalPhone,
          avatar: editAvatar.trim()
        })
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.user) {
          onUserUpdate?.(data.user);
        } else {
          onUserUpdate?.(updatedUser);
        }
      } else {
        onUserUpdate?.(updatedUser);
      }

      localStorage.setItem('bot_auth_user', JSON.stringify(updatedUser));
      setIsEditing(false);
      setNotification({
        type: 'success',
        text: '✓ প্রোফাইল তথ্য সফলভাবে আপডেট হয়েছে এবং ফায়ারবেজে সেভ হয়েছে!'
      });
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err?.message || 'প্রোফাইল সংরক্ষণ করতে সমস্যা হয়েছে।'
      });
    } finally {
      setSaving(false);
    }
  };

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
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/80 border border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0f1b2b] to-[#070e18] border border-[#1e2e42] shadow-xl flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left relative">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1e293b] to-[#0f172a] border-3 border-[#00d293] flex items-center justify-center text-white font-black text-2xl shadow-lg shrink-0 overflow-hidden">
          {user.avatar ? (
            <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            (user.name || user.email || 'U').charAt(0).toUpperCase()
          )}
        </div>

        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-xl font-black text-white truncate">{user.name || 'User'}</h2>
            {isAdmin && (
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-black">
                👑 Super Admin
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-1.5">
            <Mail className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate">{user.email}</span>
          </p>
          {user.phoneNumber && (
            <p className="text-xs text-emerald-400 font-mono font-bold flex items-center justify-center sm:justify-start gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-500" />
              <span>{user.phoneNumber}</span>
              {user.phoneVerified && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-sans font-semibold">
                  ভেরিফাইড
                </span>
              )}
            </p>
          )}
          <p className="text-[11px] text-[#00d293] font-semibold flex items-center justify-center sm:justify-start gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Account (Firebase Synced)</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer shadow-md transition-all border border-slate-700 flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isEditing ? 'বাতিল' : 'প্রোফাইল এডিট'}</span>
          </button>

          {isAdmin && (
            <button
              onClick={onOpenAdminModal}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer shadow-md transition-all shrink-0"
            >
              Admin Panel
            </button>
          )}
        </div>
      </div>

      {/* Edit Profile Form (Toggled via "প্রোফাইল এডিট") */}
      {isEditing && (
        <div className="p-5 sm:p-6 rounded-3xl bg-[#0d1424] border border-cyan-500/40 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-black text-white">প্রোফাইল তথ্য আপডেট করুন</h3>
            </div>
            <span className="text-[11px] text-cyan-400 font-mono">Firestore: /accounts/{user.id}</span>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                আপনার পুরো নাম *
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="যেমন: Md Taybur Rahman"
                className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  মোবাইল নম্বর (বিকাশ / নগদ / সাপোর্ট)
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="017XXXXXXXX বা +8801..."
                  className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  প্রোফাইল ছবির লিংক (Avatar URL)
                </label>
                <input
                  type="url"
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  placeholder="https://... (ঐচ্ছিক)"
                  className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-600/30 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'ফায়ারবেজে সেভ হচ্ছে...' : 'সেভ ও সিঙ্ক করুন'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MY FIREBASE DOCUMENTS SECTION */}
      <div className="p-6 rounded-3xl bg-[#0d1424] border border-[#1e293b] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-black text-white">আমার ফায়ারবেজ ডকুমেন্টস (Firebase Documents)</h3>
              <p className="text-[11px] text-slate-400">আপনার সমস্ত ডাটা ও ফাইল ফায়ারবেজ ক্লাউডে নিরাপদভাবে সংরক্ষিত</p>
            </div>
          </div>
          {docStats.lastSyncedAt && (
            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
              শেষ সিঙ্ক: {docStats.lastSyncedAt}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
          {/* User Account Document */}
          <div className="p-3.5 rounded-2xl bg-[#070b14] border border-emerald-500/30 space-y-1">
            <div className="flex items-center justify-between">
              <User className="w-4 h-4 text-emerald-400" />
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300">
                ACTIVE
              </span>
            </div>
            <h4 className="text-xs font-black text-slate-200">ইউজার প্রোফাইল</h4>
            <p className="text-[10px] text-slate-400 font-mono truncate">/accounts/{user.id.substring(0, 10)}...</p>
            <span className="text-[10px] text-emerald-400 font-bold block pt-0.5">✓ ক্লাউডে সুরক্ষিত</span>
          </div>

          {/* Hosted Bots Documents */}
          <div
            onClick={onNavigateToBots}
            className="p-3.5 rounded-2xl bg-[#070b14] border border-[#1e293b] hover:border-purple-500/40 space-y-1 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <Bot className="w-4 h-4 text-purple-400" />
              <span className="text-base font-black text-purple-400 font-mono">
                {docStats.botsCount}
              </span>
            </div>
            <h4 className="text-xs font-black text-slate-200">হোস্টেড বট</h4>
            <p className="text-[10px] text-slate-400 font-mono">/bots/collection</p>
            <span className="text-[10px] text-purple-300 font-medium block pt-0.5">বটসমূহ দেখুন →</span>
          </div>

          {/* Websites Documents */}
          <div className="p-3.5 rounded-2xl bg-[#070b14] border border-[#1e293b] space-y-1">
            <div className="flex items-center justify-between">
              <Globe className="w-4 h-4 text-sky-400" />
              <span className="text-base font-black text-sky-400 font-mono">
                {docStats.websitesCount}
              </span>
            </div>
            <h4 className="text-xs font-black text-slate-200">ওয়েবসাইটস</h4>
            <p className="text-[10px] text-slate-400 font-mono">/websites/collection</p>
            <span className="text-[10px] text-sky-300 font-medium block pt-0.5">হোস্টেড সাইট</span>
          </div>

          {/* Completed Social Tasks */}
          <div className="p-3.5 rounded-2xl bg-[#070b14] border border-[#1e293b] space-y-1">
            <div className="flex items-center justify-between">
              <Share2 className="w-4 h-4 text-pink-400" />
              <span className="text-base font-black text-pink-400 font-mono">
                {docStats.tasksCount}
              </span>
            </div>
            <h4 className="text-xs font-black text-slate-200">সোশ্যাল টাস্ক</h4>
            <p className="text-[10px] text-slate-400 font-mono">/task_completions</p>
            <span className="text-[10px] text-pink-300 font-medium block pt-0.5">জমাকৃত প্রমাণাদি</span>
          </div>

          {/* Deposits & Orders */}
          <div
            onClick={onNavigateToWallet}
            className="p-3.5 rounded-2xl bg-[#070b14] border border-[#1e293b] hover:border-emerald-500/40 space-y-1 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span className="text-base font-black text-emerald-400 font-mono">
                {docStats.depositsCount}
              </span>
            </div>
            <h4 className="text-xs font-black text-slate-200">ডিপোজিট অর্ডার</h4>
            <p className="text-[10px] text-slate-400 font-mono">/plan_requests</p>
            <span className="text-[10px] text-emerald-300 font-medium block pt-0.5">অর্ডার হিস্ট্রি →</span>
          </div>

          {/* Wallet Ledger Transactions */}
          <div
            onClick={onNavigateToWallet}
            className="p-3.5 rounded-2xl bg-[#070b14] border border-[#1e293b] hover:border-amber-500/40 space-y-1 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <FileText className="w-4 h-4 text-amber-400" />
              <span className="text-base font-black text-amber-400 font-mono">
                {docStats.transactionsCount}
              </span>
            </div>
            <h4 className="text-xs font-black text-slate-200">ওয়ালেট লেজার</h4>
            <p className="text-[10px] text-slate-400 font-mono">/wallet_transactions</p>
            <span className="text-[10px] text-amber-300 font-medium block pt-0.5">লেনদেন খতিয়ান →</span>
          </div>
        </div>
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
