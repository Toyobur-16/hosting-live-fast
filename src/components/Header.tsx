import React from 'react';
import { Terminal, Settings, Globe, Plus, LogOut, User, CheckCircle2, Moon, Sun, ShieldCheck, Crown, ShieldAlert, Wallet } from 'lucide-react';
import { HostedBot, AuthUser, SiteSettings } from '../types';

interface HeaderProps {
  bots: HostedBot[];
  selectedBotId: string | null;
  onSelectBot: (botId: string) => void;
  onOpenNewBotModal: () => void;
  onOpenSettingsModal: (initialTab?: string) => void;
  onOpenTokenChecker: () => void;
  onOpenPlansModal?: () => void;
  onOpenWalletPage?: () => void;
  onOpenAdminModal?: () => void;
  pendingRequestsCount?: number;
  lang: 'bn' | 'en';
  setLang: (lang: 'bn' | 'en') => void;
  user: AuthUser | null;
  onLogout: () => void;
  onOpenAuthModal: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  siteSettings?: SiteSettings;
}

export const Header: React.FC<HeaderProps> = ({
  bots,
  selectedBotId,
  onSelectBot,
  onOpenNewBotModal,
  onOpenSettingsModal,
  onOpenTokenChecker,
  onOpenPlansModal,
  onOpenWalletPage,
  onOpenAdminModal,
  pendingRequestsCount = 0,
  lang,
  setLang,
  user,
  onLogout,
  onOpenAuthModal,
  theme,
  onToggleTheme,
  siteSettings
}) => {
  const runningCount = bots.filter((b) => b.status === 'running').length;
  const isAdmin = Boolean(
    user && (
      user.role === 'admin' ||
      user.email?.toLowerCase().trim() === 'toyoburrahman9090@gmail.com' ||
      user.email?.toLowerCase().trim() === 'mdtayburrahman1111@gmail.com' ||
      user.email?.toLowerCase().trim() === 'toyobur@telegram.bot'
    )
  );

  const hasActivePlan = Boolean(
    user && (
      isAdmin ||
      (user.plan && user.plan !== 'free' && user.plan !== 'none' && user.plan !== 'expired' && (!user.planExpiresAt || user.planExpiresAt > Date.now()))
    )
  );

  return (
    <header className="bg-white dark:bg-[#111827] border-b border-[#e2e8f0] dark:border-[#1f293d] text-[#1e293b] dark:text-[#f3f4f6] sticky top-0 z-30 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl overflow-hidden bg-slate-900 border border-amber-500/40 flex items-center justify-center shadow-sm shadow-amber-500/10 shrink-0">
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
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#1e293b] dark:text-white flex items-center gap-1.5">
                {siteSettings?.siteName || 'hosting live fast'}
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-semibold">
                  TOP UP
                </span>
                <span className="hidden sm:inline-flex text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-semibold">
                  ২৪/৭ লাইভ
                </span>
              </h1>
            </div>
            <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
              {lang === 'bn'
                ? (siteSettings?.taglineBn || '২৪/৭ ক্লাউড বট ও টপ আপ সার্ভিস')
                : (siteSettings?.taglineEn || '24/7 Cloud Bot & Top Up Service')}
            </p>
          </div>
        </div>

        {/* Live status badge */}
        <div className="flex items-center gap-2 bg-[#f8fafc] dark:bg-[#1e293b] px-3 py-1.5 rounded-xl border border-[#e2e8f0] dark:border-[#334155]">
          <span className="relative flex h-2 w-2">
            {runningCount > 0 && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                runningCount > 0 ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            ></span>
          </span>
          <span className="text-xs font-semibold text-[#1e293b] dark:text-[#e2e8f0]">
            {runningCount}/{bots.length} {lang === 'bn' ? 'বট লাইভ' : 'Bots Online'}
          </span>
          {bots.length > 1 && (
            <>
              <div className="h-3.5 w-px bg-[#e2e8f0] dark:bg-[#334155] mx-1"></div>
              <select
                value={selectedBotId || ''}
                onChange={(e) => onSelectBot(e.target.value)}
                className="bg-white dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#334155] rounded-lg px-2 py-0.5 text-xs font-medium text-[#1e293b] dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-[#0088cc] cursor-pointer"
              >
                {bots.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.status === 'running' ? 'LIVE' : 'OFF'})
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* Action Controls & User info */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Hosting Plans Button */}
          {onOpenPlansModal && (
            <button
              id="header-plans-btn"
              onClick={onOpenPlansModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-all shadow-2xs cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              title={lang === 'bn' ? 'হোস্টিং প্যাকেজ সমূহ দেখুন' : 'View Hosting Plans'}
            >
              <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{lang === 'bn' ? '👑 হোস্টিং প্লান' : '👑 Hosting Plans'}</span>
              {user?.plan && user.plan !== 'free' && user.plan !== 'none' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 font-extrabold uppercase">
                  {user.plan.replace('_', ' ')}
                </span>
              )}
            </button>
          )}

          {/* Wallet & Deposit Button */}
          {(onOpenWalletPage || onOpenPlansModal) && (
            <button
              id="header-wallet-btn"
              onClick={onOpenWalletPage || onOpenPlansModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-all shadow-2xs cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              title={lang === 'bn' ? 'ডিপোজিট ও ওয়ালেট ব্যালেন্স' : 'Wallet & Deposit Hub'}
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{lang === 'bn' ? '💳 ওয়ালেট ও ডিপোজিট' : '💳 Wallet & Deposit'}</span>
              {user && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black">
                  ${user.balanceUsd || 0}
                </span>
              )}
            </button>
          )}

          {/* Token Check Button */}
          <button
            id="header-token-check-btn"
            onClick={onOpenTokenChecker}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 text-[#0088cc] dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition-all shadow-2xs cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            title={lang === 'bn' ? 'টেলিগ্রাম বট টোকেন সক্রিয় আছে কিনা পরীক্ষা করুন' : 'Verify if Telegram Bot Token is valid & active'}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#0088cc] dark:text-sky-300" />
            <span>{lang === 'bn' ? 'টোকেন চেক' : 'Check Token'}</span>
          </button>

          {/* Deploy Bot Button (locked with 'Buy Plan' if no active plan purchased) */}
          {hasActivePlan ? (
            <button
              id="header-deploy-bot-btn"
              onClick={onOpenNewBotModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white transition-all shadow-sm shadow-[#0088cc]/20 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? '+ বট ডিপ্লয়' : '+ Deploy Bot'}</span>
            </button>
          ) : (
            <button
              id="header-buy-plan-btn"
              onClick={onOpenPlansModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 transition-all shadow-md shadow-amber-500/20 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              title={lang === 'bn' ? 'বট হোস্ট করতে প্রথমে প্ল্যান কিনুন' : 'Buy a plan to deploy bots'}
            >
              <Crown className="w-3.5 h-3.5 text-slate-950" />
              <span>{lang === 'bn' ? '🔒 প্ল্যান কিনুন' : '🔒 Buy Plan'}</span>
            </button>
          )}

          {/* Settings & Tools Button */}
          <button
            id="header-settings-btn"
            onClick={() => onOpenSettingsModal('overview')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] dark:bg-[#1e293b] dark:hover:bg-[#334155] text-[#1e293b] dark:text-[#f3f4f6] border border-[#e2e8f0] dark:border-[#334155] hover:border-[#0088cc]/40 transition-all cursor-pointer shadow-2xs"
            title={lang === 'bn' ? 'সেটিংস ও ফাইল ম্যানেজার' : 'Platform Settings & Tools'}
          >
            <Settings className="w-3.5 h-3.5 text-[#0088cc]" />
            <span>{lang === 'bn' ? 'সেটিংস' : 'Settings'}</span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            id="header-theme-toggle-btn"
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] dark:bg-[#1e293b] dark:hover:bg-[#334155] text-[#64748b] hover:text-[#1e293b] dark:text-[#94a3b8] dark:hover:text-white border border-[#e2e8f0] dark:border-[#334155] transition-all cursor-pointer"
            title={lang === 'bn' ? 'থিম পরিবর্তন করুন' : 'Toggle Dark Mode'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'bn' ? 'লাইট' : 'Light'}</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-[#0088cc]" />
                <span>{lang === 'bn' ? 'ডার্ক' : 'Dark'}</span>
              </>
            )}
          </button>

          {/* Language Switch */}
          <button
            onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] dark:bg-[#1e293b] dark:hover:bg-[#334155] text-[#64748b] hover:text-[#1e293b] dark:text-[#94a3b8] dark:hover:text-white border border-[#e2e8f0] dark:border-[#334155] transition-all cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#94a3b8]" />
            <span>{lang === 'bn' ? 'ENG' : 'বাংলা'}</span>
          </button>

          {/* User Account / Profile button */}
          {user ? (
            <div className="flex items-center gap-1.5 pl-2 ml-1 border-l border-[#e2e8f0] dark:border-[#334155]">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] text-xs">
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[11px]">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden lg:block leading-tight">
                  <p className="font-bold text-[#1e293b] dark:text-white text-xs truncate max-w-[120px]">{user.name}</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>{lang === 'bn' ? 'লগইন আছে' : 'Active'}</span>
                  </p>
                </div>
              </div>
              <button
                id="header-logout-btn"
                onClick={onLogout}
                className="p-2 rounded-xl bg-[#f8fafc] hover:bg-rose-50 dark:bg-[#1e293b] dark:hover:bg-rose-950/40 text-[#64748b] hover:text-rose-600 dark:text-[#94a3b8] dark:hover:text-rose-400 border border-[#e2e8f0] dark:border-[#334155] hover:border-rose-200 dark:hover:border-rose-800 transition-colors cursor-pointer"
                title={lang === 'bn' ? 'লগআউট' : 'Log Out'}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              id="header-login-btn"
              onClick={onOpenAuthModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs cursor-pointer ml-1"
            >
              <User className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'লগইন' : 'Sign In'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
