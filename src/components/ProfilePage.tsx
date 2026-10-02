import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Crown,
  Wallet,
  Bot,
  Calendar,
  ShieldCheck,
  LogOut,
  Sparkles,
  Edit3,
  Check,
  X,
  Camera,
  Upload,
  Mail,
  CheckCircle2,
  Loader2,
  Download
} from 'lucide-react';
import { AuthUser } from '../types';
import { db, doc, setDoc } from '../lib/firebase';
import { usePWAInstall } from '../hooks/usePWAInstall';

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
  onOpenInstallApp?: () => void;
}

function formatPlanName(plan: string | undefined, lang: 'bn' | 'en'): string {
  if (!plan || plan.toLowerCase() === 'free') {
    return lang === 'bn' ? 'ফ্রি প্ল্যান' : 'Free Plan';
  }
  const p = plan.toUpperCase();
  if (p === '1_YEAR' || p === 'YEARLY') {
    return lang === 'bn' ? '১ বছরের প্ল্যান' : '1 Year Plan';
  }
  if (p === '6_MONTHS') {
    return lang === 'bn' ? '৬ মাসের প্ল্যান' : '6 Months Plan';
  }
  if (p === '3_MONTHS') {
    return lang === 'bn' ? '৩ মাসের প্ল্যান' : '3 Months Plan';
  }
  if (p === '1_MONTH' || p === 'MONTHLY') {
    return lang === 'bn' ? '১ মাসের প্ল্যান' : '1 Month Plan';
  }
  if (p === 'STUDENT') {
    return lang === 'bn' ? 'স্টুডেন্ট প্ল্যান' : 'Student Plan';
  }
  if (p === 'STANDARD') {
    return lang === 'bn' ? 'স্ট্যান্ডার্ড প্ল্যান' : 'Standard Plan';
  }
  if (p === 'PRO') {
    return lang === 'bn' ? 'প্রো প্ল্যান' : 'Pro Plan';
  }
  return plan;
}

function formatExpiryDate(timestamp: number | undefined, lang: 'bn' | 'en'): string {
  if (!timestamp) {
    return lang === 'bn' ? 'লাইফটাইম ফ্রি / নো সাবস্ক্রিপশন' : 'Lifetime Free / No Subscription';
  }
  const d = new Date(timestamp);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
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
  lang = 'bn',
  onOpenInstallApp
}: ProfilePageProps) {
  const { isDownloaded } = usePWAInstall();
  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarImgFailed, setAvatarImgFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditAvatar(user.avatar || '');
      setAvatarPreview(user.avatar || null);
      setAvatarImgFailed(false);
    }
  }, [user?.id, user?.email, user?.name, user?.avatar]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.onerror = () => resolve(event.target?.result as string);
        img.src = event.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      // Auto-compress to clean, fast-loading 400x400 avatar (~50KB)
      const compressedBase64 = await compressImage(file);
      if (!compressedBase64) {
        setUploadingImage(false);
        return;
      }
      setAvatarPreview(compressedBase64);

      // Upload to server thumbnail storage
      const token = localStorage.getItem('bot_auth_token');
      try {
        const res = await fetch('/api/user/upload-avatar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            base64: compressedBase64,
            fileName: `avatar_${user?.id || 'usr'}_${Date.now()}.jpg`
          })
        });

        const data = await res.json().catch(() => ({}));
        if (data.success && data.url) {
          setEditAvatar(data.url);
          setAvatarPreview(data.url);
          // Auto-update user state if already saved
          if (user) {
            const updatedUser: AuthUser = { ...user, avatar: data.url };
            onUserUpdate?.(updatedUser);
            localStorage.setItem('bot_auth_user', JSON.stringify(updatedUser));
          }
        } else {
          setEditAvatar(compressedBase64);
        }
      } catch {
        setEditAvatar(compressedBase64);
      } finally {
        setUploadingImage(false);
      }
    } catch {
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    const finalName = editName.trim() || user.name || 'User';
    const finalAvatar = editAvatar.trim() || avatarPreview || user.avatar || '';

    try {
      setSaving(true);
      const updatedUser: AuthUser = {
        ...user,
        name: finalName,
        avatar: finalAvatar
      };

      // 1. Direct write to Firestore /accounts/{user.id}
      try {
        await setDoc(doc(db, 'accounts', user.id), {
          ...updatedUser,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Account sync write:', err);
      }

      // 2. Update server backend
      const token = localStorage.getItem('bot_auth_token');
      try {
        const res = await fetch('/api/user/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            name: finalName,
            avatar: finalAvatar
          })
        });

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.user) {
            onUserUpdate?.(data.user);
            localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
          } else {
            onUserUpdate?.(updatedUser);
            localStorage.setItem('bot_auth_user', JSON.stringify(updatedUser));
          }
        } else {
          onUserUpdate?.(updatedUser);
          localStorage.setItem('bot_auth_user', JSON.stringify(updatedUser));
        }
      } catch {
        onUserUpdate?.(updatedUser);
        localStorage.setItem('bot_auth_user', JSON.stringify(updatedUser));
      }

      window.dispatchEvent(new CustomEvent('bot_auth_change', { detail: updatedUser }));
      setIsEditing(false);
      setNotification({
        type: 'success',
        text: lang === 'bn' ? '✓ প্রোফাইল ও ছবি সফলভাবে সংরক্ষিত হয়েছে!' : '✓ Profile & photo saved successfully!'
      });
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err?.message || (lang === 'bn' ? 'প্রোফাইল সংরক্ষণ করতে সমস্যা হয়েছে।' : 'Failed to update profile.')
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
        <h3 className="text-lg font-black text-white">
          {lang === 'bn' ? 'প্রোফাইল দেখতে লগইন করুন' : 'Login to View Profile'}
        </h3>
        <p className="text-xs text-slate-400">
          {lang === 'bn'
            ? 'আপনার ওয়ালেট ব্যালেন্স, প্ল্যান ও বট দেখতে অ্যাকাউন্টে লগইন করুন বা নতুন রেজিস্টার করুন।'
            : 'Login to your account or register to manage wallet balance, plans, and hosted bots.'}
        </p>
        <button
          onClick={onOpenAuthModal}
          className="px-6 py-3 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs cursor-pointer shadow-lg shadow-[#00d293]/20"
        >
          {lang === 'bn' ? 'লগইন / রেজিস্টার' : 'Login / Register'}
        </button>
      </div>
    );
  }

  const isExpired = user.planExpiresAt ? user.planExpiresAt < Date.now() : false;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 animate-in fade-in duration-200">
      {/* Hidden File Input for Direct Avatar Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileChange}
        accept="image/*"
        className="hidden"
      />

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
        {/* Direct Avatar Area with Instant Camera Click */}
        <div className="relative group shrink-0">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1e293b] to-[#0f172a] border-3 border-[#00d293] flex items-center justify-center text-white font-black text-2xl shadow-lg overflow-hidden">
            {uploadingImage ? (
              <Loader2 className="w-6 h-6 text-[#00d293] animate-spin" />
            ) : (avatarPreview || user.avatar) && !avatarImgFailed ? (
              <img
                src={avatarPreview || user.avatar}
                alt="Avatar"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={() => setAvatarImgFailed(true)}
              />
            ) : (
              (user.name || user.email || 'U').charAt(0).toUpperCase()
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setIsEditing(true);
              fileInputRef.current?.click();
            }}
            title={lang === 'bn' ? 'ছবি পরিবর্তন করুন' : 'Change Profile Picture'}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#00d293] hover:bg-[#00be84] text-slate-950 flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-110 border-2 border-[#0f1b2b]"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
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
          <p className="text-[11px] text-[#00d293] font-semibold flex items-center justify-center sm:justify-start gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'ভেরিফাইড অ্যাকাউন্ট' : 'Verified Account'}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer shadow-md transition-all border border-slate-700 flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isEditing ? (lang === 'bn' ? 'বাতিল' : 'Cancel') : (lang === 'bn' ? 'প্রোফাইল এডিট' : 'Edit Profile')}</span>
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

      {/* Edit Profile Form (Name & Direct Pic ONLY - Clean & Minimal) */}
      {isEditing && (
        <div className="p-5 sm:p-6 rounded-3xl bg-[#0d1424] border border-cyan-500/40 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-black text-white">
                {lang === 'bn' ? 'প্রোফাইল তথ্য পরিবর্তন' : 'Update Profile Info'}
              </h3>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Direct Profile Picture Upload Area */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">
                {lang === 'bn' ? 'প্রোফাইল ছবি (সরাসরি আপলোড)' : 'Profile Picture (Direct Upload)'}
              </label>
              <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-[#070b14] border border-slate-800">
                <div className="w-16 h-16 rounded-full bg-slate-850 border-2 border-cyan-500/40 flex items-center justify-center overflow-hidden shrink-0">
                  {uploadingImage ? (
                    <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  ) : avatarPreview || editAvatar ? (
                    <img
                      src={avatarPreview || editAvatar}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-slate-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'ছবি নির্বাচন করুন' : 'Choose Photo'}</span>
                  </button>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'bn'
                      ? 'মোবাইল গ্যালারি বা কম্পিউটার থেকে সরাসরি ছবি বেছে নিন (PNG, JPG)'
                      : 'Select an image directly from your gallery or files (PNG, JPG)'}
                  </p>
                </div>
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {lang === 'bn' ? 'আপনার নাম *' : 'Your Name *'}
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={lang === 'bn' ? 'যেমন: Md Taybur Rahman' : 'e.g. John Doe'}
                className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setAvatarPreview(user.avatar || null);
                  setEditAvatar(user.avatar || '');
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-colors"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={saving || uploadingImage}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-600/30 disabled:opacity-50 transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{lang === 'bn' ? 'সেভ করুন' : 'Save Changes'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Wallet Balance Card */}
      <div className="p-6 rounded-3xl bg-[#0d1424] border border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-slate-400 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#00d293]" />
            <span>
              {lang === 'bn' ? 'মোট ওয়ালেট ব্যালেন্স (USDT)' : 'Total Wallet Balance (USDT)'}
            </span>
          </span>
          <div className="flex items-baseline gap-2.5 mt-1">
            <span className="text-2xl sm:text-3xl font-black text-white">
              ${Number(user.balanceUsd || 0).toFixed(2)}
            </span>
            <span className="text-xs font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-[#00d293] uppercase">
              USDT
            </span>
          </div>
        </div>

        <button
          onClick={onNavigateToWallet}
          className="px-5 py-2.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all hover:scale-102 self-start sm:self-center"
        >
          {lang === 'bn' ? '+ USDT ডিপোজিট করুন' : '+ Deposit USDT'}
        </button>
      </div>

      {/* Subscription Plan Card */}
      <div className="p-6 rounded-3xl bg-[#0d1424] border border-[#1e293b] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black text-white">
              {lang === 'bn' ? 'হোস্টিং সাবস্ক্রিপশন' : 'Hosting Subscription'}
            </h3>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full font-black ${
              user.plan && user.plan !== 'free' && !isExpired
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {user.plan && user.plan !== 'free'
              ? isExpired
                ? (lang === 'bn' ? 'মেয়াদ উত্তীর্ণ' : 'EXPIRED')
                : (lang === 'bn' ? 'সক্রিয়' : 'ACTIVE')
              : (lang === 'bn' ? 'ফ্রি টিয়ার' : 'FREE TIER')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-[#070b14] border border-[#1e293b]">
          <div>
            <span className="text-[11px] text-slate-400">
              {lang === 'bn' ? 'বর্তমান প্যাকেজ:' : 'Current Package:'}
            </span>
            <span className="text-sm font-black text-white block mt-0.5">
              {formatPlanName(user.plan, lang)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400">
              {lang === 'bn' ? 'বট হোস্টিং লিমিট:' : 'Bot Hosting Limit:'}
            </span>
            <span className="text-sm font-black text-[#00d293] block mt-0.5">
              {lang === 'bn'
                ? `${user.maxBots || 0} টি বট চালাতে পারবেন`
                : `Can run up to ${user.maxBots || 0} bots`}
            </span>
          </div>
          <div className="sm:col-span-2 pt-2 border-t border-[#1e293b]/60 flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'মেয়াদ উত্তীর্ণের তারিখ:' : 'Expiry Date:'}</span>
            </span>
            <span className="font-bold text-slate-200">
              {formatExpiryDate(user.planExpiresAt, lang)}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onNavigateToPlans}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'নতুন প্ল্যান আপগ্রেড করুন' : 'Upgrade Plan'}</span>
          </button>
          <button
            onClick={onNavigateToBots}
            className="flex-1 py-2.5 rounded-xl bg-[#111827] hover:bg-[#1f293d] border border-[#1e293b] text-slate-200 font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
          >
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            <span>{lang === 'bn' ? 'আমার বট সমূহ দেখুন' : 'View My Bots'}</span>
          </button>
        </div>
      </div>

      {/* Official App Download & Install Card (Hidden once user has downloaded the APK or installed app) */}
      {onOpenInstallApp && !isDownloaded && (
        <div className="p-4 rounded-3xl bg-gradient-to-br from-[#0c1c2e] to-[#08121f] border border-[#1e3450] shadow-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00d293] to-sky-500 p-0.5 shadow-md shrink-0 flex items-center justify-center">
              <img
                src="/pwa-192x192.png"
                alt="App Icon"
                className="w-full h-full object-cover rounded-[14px]"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/logo.png';
                }}
              />
            </div>
            <div className="truncate">
              <div className="text-sm font-black text-white flex items-center gap-1.5">
                <span>{lang === 'bn' ? 'অফিসিয়াল অ্যাপস ডাউনলোড' : 'Download Official App'}</span>
              </div>
              <div className="text-xs text-slate-400 truncate">
                {lang === 'bn' ? 'হোমস্ক্রিন ইনস্টল ও অফিশিয়াল লোগো APK' : 'Official Logo, 1-Click Install & APK'}
              </div>
            </div>
          </div>
          <button
            onClick={onOpenInstallApp}
            className="px-4 py-2.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs shrink-0 cursor-pointer shadow-md flex items-center gap-1.5 transition-transform hover:scale-102"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{lang === 'bn' ? 'ডাউনলোড' : 'Install'}</span>
          </button>
        </div>
      )}

      {/* Logout button */}
      <button
        onClick={onLogout}
        className="w-full py-3 rounded-2xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span>{lang === 'bn' ? 'অ্যাকাউন্ট থেকে লগআউট করুন' : 'Logout from Account'}</span>
      </button>
    </div>
  );
}
