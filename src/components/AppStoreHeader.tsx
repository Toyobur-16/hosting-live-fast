import React, { useState, useEffect } from 'react';
import {
  Server,
  Bell,
  Menu,
  MoreVertical,
  Languages,
  User,
  Wallet,
  Sun,
  Moon,
  PlusCircle,
  Crown,
  Coins,
  Headphones
} from 'lucide-react';
import { AuthUser, SiteSettings } from '../types';

interface AppStoreHeaderProps {
  user: AuthUser | null;
  onOpenSidebar: () => void;
  onOpenAuthModal: () => void;
  onOpenNotifications: () => void;
  onSelectTab: (tab: string) => void;
  activeTab: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  lang: 'bn' | 'en';
  onToggleLang: () => void;
  onDeployNewBot: () => void;
  hasActivePlan: boolean;
  botsCount?: number;
  pendingCount?: number;
  siteSettings?: SiteSettings;
}

export function AppStoreHeader({
  user,
  onOpenSidebar,
  onOpenAuthModal,
  onOpenNotifications,
  onSelectTab,
  activeTab,
  theme,
  onToggleTheme,
  lang,
  onToggleLang,
  onDeployNewBot,
  hasActivePlan,
  botsCount = 0,
  pendingCount = 0,
  siteSettings
}: AppStoreHeaderProps) {
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  useEffect(() => {
    const token = localStorage.getItem('bot_auth_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch('/api/notifications', { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data.notifications) {
          const unread = data.notifications.filter((n: any) => !n.read).length;
          setUnreadNotifications(unread);
        }
      })
      .catch(() => {});
  }, [user]);

  const getUserInitial = () => {
    if (!user) return 'U';
    return (user.name || user.email || 'U').charAt(0).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#070b13]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#162035] transition-colors">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 h-15 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-3 w-full">
        {/* Left Branding: Site Logo & Name */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 sm:flex-initial overflow-hidden">
          <button
            type="button"
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-1.5 sm:gap-3 group cursor-pointer text-left focus:outline-hidden min-w-0 overflow-hidden"
          >
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl overflow-hidden bg-slate-900 border border-amber-500/50 flex items-center justify-center shadow-md shadow-amber-500/10 group-hover:scale-105 transition-transform shrink-0">
              <img
                src={siteSettings?.logoUrl || '/site-logo.png'}
                alt={siteSettings?.siteName || 'Logo'}
                className="w-full h-full object-contain p-0.5"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  if (!target.src.endsWith('site-logo.png')) {
                    target.src = '/site-logo.png';
                  } else if (!target.src.endsWith('site-logo.jpg')) {
                    target.src = '/site-logo.jpg';
                  } else if (!target.src.endsWith('logo-icon.png')) {
                    target.src = '/logo-icon.png';
                  }
                }}
              />
            </div>
            <div className="flex flex-col min-w-0 overflow-hidden">
              <span className="text-xs xs:text-sm sm:text-base lg:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                {siteSettings?.siteName || 'hosting live fast'}
              </span>
              <span className="hidden sm:block text-[9px] sm:text-[10px] font-bold text-amber-500 dark:text-amber-400 tracking-wider uppercase truncate">
                {lang === 'bn'
                  ? (siteSettings?.taglineBn || '২৪/৭ ক্লাউড বট ও টপ আপ')
                  : (siteSettings?.taglineEn || '24/7 Cloud Bot & Top Up')}
              </span>
            </div>
          </button>
        </div>

        {/* Center Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-[#0f172a]/80 p-1 rounded-xl border border-slate-200 dark:border-[#1e293b]">
          <button
            onClick={() => onSelectTab('home')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'home'
                ? 'bg-[#00d293] text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {lang === 'bn' ? 'হোম' : 'Home'}
          </button>

          <button
            onClick={() => onSelectTab('plans')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'plans'
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            {lang === 'bn' ? 'প্ল্যানস' : 'Plans'}
          </button>

          <button
            onClick={() => onSelectTab('deposit-store')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'deposit-store'
                ? 'bg-amber-400 text-slate-950 shadow-xs font-black'
                : 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            {lang === 'bn' ? 'ডিপোজিট' : 'Deposit'}
          </button>

          <button
            onClick={onDeployNewBot}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-[#00d293]/15 hover:bg-[#00d293]/25 text-[#00a876] dark:text-[#00d293] border border-[#00d293]/30"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            {lang === 'bn' ? 'ডিপ্লয় বট' : 'Deploy Bot'}
          </button>

          <button
            onClick={() => onSelectTab('bots')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'bots' || activeTab === 'terminal'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'আমার বট' : 'My Bots'}</span>
            {botsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-white/20 text-current">
                {botsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('wallet')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'wallet'
                ? 'bg-[#00d293] text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            {lang === 'bn' ? 'ওয়ালেট' : 'Wallet'}
          </button>

          <button
            onClick={() => onSelectTab('support')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'support'
                ? 'bg-[#00d293] text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            {lang === 'bn' ? 'সাপোর্ট' : 'Support'}
          </button>
        </nav>

        {/* Right Actions: Mobile Optimized, Compact, Never Cut Off */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* EXACTLY ONE USDT Wallet Balance Button */}
          <button
            id="header-single-usdt-balance-button"
            type="button"
            onClick={() => (user ? onSelectTab('wallet') : onOpenAuthModal())}
            className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-black text-emerald-600 dark:text-[#00d293] cursor-pointer transition-all shadow-xs hover:scale-102 shrink-0 min-h-[34px]"
            title={user ? (lang === 'bn' ? 'ওয়ালেট ও ডিপোজিট দেখুন' : 'View USDT Wallet & Deposit') : (lang === 'bn' ? 'লগইন করুন' : 'Login to view balance')}
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="font-extrabold tracking-tight whitespace-nowrap text-[11px] sm:text-xs">
              ${user ? Number(user.balanceUsd || 0).toFixed(2) : '0.00'}
            </span>
            <span className="hidden xs:inline-block px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[8px] sm:text-[9px] font-black uppercase tracking-wider shrink-0">
              USDT
            </span>
          </button>

          {/* Language Switch Button (Desktop & Tablet) */}
          <button
            onClick={onToggleLang}
            className="hidden md:flex p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-[#111827] hover:bg-slate-200 dark:hover:bg-[#1f293d] border border-slate-200 dark:border-[#1e293b] text-slate-700 dark:text-slate-300 font-bold text-xs items-center gap-1 cursor-pointer transition-colors shrink-0 min-h-[34px]"
            title={lang === 'bn' ? 'Switch to English' : 'বাংলা ভাষায় দেখুন'}
          >
            <Languages className="w-3.5 h-3.5 text-[#00d293] shrink-0" />
            <span className="text-[11px] font-black">{lang === 'bn' ? 'EN' : 'বাংলা'}</span>
          </button>

          {/* Theme Toggle Button (Desktop & Tablet) */}
          <button
            onClick={onToggleTheme}
            className="hidden md:flex p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-[#111827] hover:bg-slate-200 dark:hover:bg-[#1f293d] border border-slate-200 dark:border-[#1e293b] text-slate-700 dark:text-slate-300 hover:text-amber-500 cursor-pointer transition-colors shrink-0 min-h-[34px]"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'ডার্ক মোড চালু করুন'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
          </button>

          {/* Notification Bell */}
          <button
            id="header-notification-btn"
            onClick={onOpenNotifications}
            className="relative w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl bg-slate-100 dark:bg-[#111827] hover:bg-slate-200 dark:hover:bg-[#1f293d] border border-slate-200 dark:border-[#1e293b] text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white cursor-pointer transition-colors shrink-0 flex items-center justify-center"
            title={lang === 'bn' ? 'নোটিফিকেশন সেন্টার' : 'Notifications'}
          >
            <Bell className="w-4 h-4 shrink-0" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-md animate-pulse">
                {unreadNotifications}
              </span>
            )}
          </button>

          {/* User Profile or Login */}
          {user ? (
            <button
              id="header-user-avatar-btn"
              onClick={() => onSelectTab('profile')}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-200 dark:bg-[#1e293b] border-2 border-[#00d293] flex items-center justify-center text-slate-900 dark:text-white font-black text-xs sm:text-sm shadow-md hover:scale-105 cursor-pointer transition-transform shrink-0"
              title={`${user.name || user.email} (${lang === 'bn' ? 'প্রোফাইল দেখুন' : 'View Profile'})`}
            >
              {getUserInitial()}
            </button>
          ) : (
            <button
              id="header-login-btn"
              onClick={onOpenAuthModal}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 text-xs font-black shadow-md cursor-pointer transition-all shrink-0 hover:scale-102 min-h-[34px] flex items-center justify-center"
            >
              {lang === 'bn' ? 'লগইন' : 'Login'}
            </button>
          )}

          {/* Three-Dot (⋮) Options & Menu Button - ALWAYS FULLY VISIBLE IN ITS EXACT PLACE */}
          <button
            id="header-sidebar-menu-btn"
            onClick={onOpenSidebar}
            className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl bg-[#00d293]/15 hover:bg-[#00d293]/25 active:bg-[#00d293]/35 border border-[#00d293]/40 text-[#00a876] dark:text-[#00d293] cursor-pointer transition-all shrink-0 shadow-xs flex items-center justify-center active:scale-95 ml-0.5"
            title={lang === 'bn' ? 'থ্রি ডট মেনু ও অপশনস' : 'Three Dot Menu & Options'}
            aria-label="Three Dot Menu"
          >
            <MoreVertical className="w-5 h-5 text-[#00a876] dark:text-[#00d293] stroke-[2.5] shrink-0" />
          </button>
        </div>
      </div>
    </header>
  );
}
