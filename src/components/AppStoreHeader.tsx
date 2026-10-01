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
  Headphones,
  Film,
  HelpCircle,
  Globe,
  Download
} from 'lucide-react';
import { AuthUser, SiteSettings } from '../types';
import { normalizeLogoUrl } from '../utils/logoUrl';

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
  onOpenInstallApp?: () => void;
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
  siteSettings,
  onOpenInstallApp
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

  const resolvedLogoUrl = normalizeLogoUrl(siteSettings?.logoUrl || '/site-logo.png');

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#070b13]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#162035] transition-colors">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 h-15 sm:h-16 flex items-center justify-between gap-2 sm:gap-3 w-full">
        {/* Left Branding: Full Brand Logo Banner spanning the header left area */}
        <div className="flex items-center min-w-0 flex-1 lg:flex-initial overflow-hidden py-0.5 pr-1">
          <button
            type="button"
            onClick={() => onSelectTab('home')}
            className="flex items-center group cursor-pointer text-left focus:outline-hidden w-full max-w-[185px] sm:max-w-[260px] md:max-w-[320px] min-w-0 overflow-hidden transition-transform hover:scale-102"
            title={siteSettings?.siteName || 'hosting-live-fast'}
          >
            <img
              src={resolvedLogoUrl}
              alt={siteSettings?.siteName || 'hosting-live-fast'}
              className="h-10 sm:h-11 md:h-12 w-full object-contain object-left drop-shadow-md select-none"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (!target.src.endsWith('site-logo.png')) {
                  target.src = '/site-logo.png';
                } else if (!target.src.endsWith('hosting-live-fast-logo.png')) {
                  target.src = '/hosting-live-fast-logo.png';
                }
              }}
            />
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
            onClick={() => onSelectTab('guide')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300'
            }`}
            title={lang === 'bn' ? 'ভিডিও টিউটোরিয়াল ও হোস্টিং গাইড' : 'Video Tutorial & Guide'}
          >
            <Film className="w-3.5 h-3.5" />
            {lang === 'bn' ? 'গাইড' : 'Guide'}
          </button>

          <button
            onClick={() => onSelectTab('faq')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'faq'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300'
            }`}
            title={lang === 'bn' ? 'সচরাচর জিজ্ঞাসিত প্রশ্নোত্তর' : 'FAQ'}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {lang === 'bn' ? 'FAQ' : 'FAQ'}
          </button>

          <button
            onClick={() => onSelectTab('websites')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'websites'
                ? 'bg-cyan-500 text-slate-950 shadow-xs font-bold'
                : 'text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            {lang === 'bn' ? 'ওয়েবসাইট' : 'Websites'}
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

          {/* In-App Install & Download Button */}
          {onOpenInstallApp && (
            <button
              id="header-install-app-btn"
              type="button"
              onClick={onOpenInstallApp}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-[#00d293]/15 to-emerald-500/15 hover:from-[#00d293]/25 hover:to-emerald-500/25 border border-[#00d293]/40 text-emerald-600 dark:text-[#00d293] font-bold text-xs cursor-pointer transition-all shadow-xs shrink-0 min-h-[34px] hover:scale-102"
              title={lang === 'bn' ? 'অফিসিয়াল অ্যাপ ইন্সটল ও ডাউনলোড' : 'Install & Download App'}
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
              <span className="hidden xs:inline text-[11px] font-black">{lang === 'bn' ? 'অ্যাপস' : 'App'}</span>
            </button>
          )}

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
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-200 dark:bg-[#1e293b] border-2 border-[#00d293] flex items-center justify-center text-slate-900 dark:text-white font-black text-xs sm:text-sm shadow-md hover:scale-105 cursor-pointer transition-transform shrink-0 overflow-hidden"
              title={`${user.name || user.email} (${lang === 'bn' ? 'প্রোফাইল দেখুন' : 'View Profile'})`}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || 'User'}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = 'none';
                    if (target.parentElement) {
                      target.parentElement.textContent = getUserInitial();
                    }
                  }}
                />
              ) : (
                getUserInitial()
              )}
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
