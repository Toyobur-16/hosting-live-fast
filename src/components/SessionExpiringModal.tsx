import React, { useEffect } from 'react';
import { 
  ShieldAlert, 
  Clock, 
  RefreshCw, 
  LogOut, 
  Lock, 
  Sparkles,
  User as UserIcon 
} from 'lucide-react';
import { AuthUser } from '../types';

interface SessionExpiringModalProps {
  isOpen: boolean;
  user: AuthUser | null;
  secondsRemaining: number;
  totalWarningSeconds?: number;
  isExtending: boolean;
  onExtend: () => void;
  onLogout: () => void;
  lang?: 'bn' | 'en';
}

export const SessionExpiringModal: React.FC<SessionExpiringModalProps> = ({
  isOpen,
  user,
  secondsRemaining,
  totalWarningSeconds = 60,
  isExtending,
  onExtend,
  onLogout,
  lang = 'bn'
}) => {
  if (!isOpen) return null;

  // Calculate percentage remaining for the progress bar
  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / totalWarningSeconds) * 100));
  const isUrgent = secondsRemaining <= 15;

  // Keyboard shortcut listener: Enter or Space to extend, Escape to logout
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onExtend();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExtend]);

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expiring-title"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top glowing ambient gradient */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
        
        {/* Progress bar line */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1">
          <div 
            className={`h-full transition-all duration-1000 ease-linear ${
              isUrgent ? 'bg-rose-500' : 'bg-amber-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="p-6">
          {/* Header with pulsing alert badge */}
          <div className="flex items-start gap-4 mb-4">
            <div className={`relative flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center ${
              isUrgent 
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-700/50' 
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50'
            }`}>
              <ShieldAlert className={`w-7 h-7 ${isUrgent ? 'animate-bounce' : 'animate-pulse'}`} />
              {/* Ping glow ring */}
              <span className={`absolute -top-1 -right-1 flex h-3.5 w-3.5`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isUrgent ? 'bg-rose-400' : 'bg-amber-400'
                }`} />
                <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                  isUrgent ? 'bg-rose-500' : 'bg-amber-500'
                }`} />
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  {lang === 'bn' ? 'নিষ্ক্রিয় সেশন সতর্কতা' : 'Inactivity Warning'}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {lang === 'bn' ? 'সুরক্ষিত' : 'Security'}
                </span>
              </div>
              <h3 
                id="session-expiring-title"
                className="text-lg font-bold text-slate-900 dark:text-white mt-1 leading-snug"
              >
                {lang === 'bn' ? 'সেশনের মেয়াদ শেষ হতে চলেছে!' : 'Session Expiring Soon!'}
              </h3>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
            {lang === 'bn' ? (
              <>
                আপনি বেশ কিছুক্ষণ ধরে নিষ্ক্রিয় রয়েছেন। আপনার অ্যাকাউন্টের নিরাপত্তা নিশ্চিত করতে 
                স্বয়ংক্রিয়ভাবে লগআউট করা হবে যদি আপনি সেশন বৃদ্ধি না করেন।
              </>
            ) : (
              <>
                You have been inactive for a while. For your account security, you will be automatically 
                logged out unless you extend your session.
              </>
            )}
          </p>

          {/* Large Countdown Box */}
          <div className={`p-4 rounded-xl border flex items-center justify-between mb-5 transition-colors ${
            isUrgent 
              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50' 
              : 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                isUrgent ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
              }`}>
                <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {lang === 'bn' ? 'বাকি সময়:' : 'Time remaining:'}
                </p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {lang === 'bn' ? 'স্বয়ংক্রিয় লগআউটের পূর্বে' : 'Before automatic logout'}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className={`text-3xl font-black font-mono tracking-tight ${
                isUrgent ? 'text-rose-600 dark:text-rose-400 animate-pulse' : 'text-amber-600 dark:text-amber-400'
              }`}>
                {String(Math.floor(secondsRemaining / 60)).padStart(2, '0')}:{String(secondsRemaining % 60).padStart(2, '0')}
              </span>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                {lang === 'bn' ? 'সেকেন্ড বাকি' : 'seconds left'}
              </p>
            </div>
          </div>

          {/* Active User Pill */}
          {user && (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 mb-5 text-xs text-slate-600 dark:text-slate-400">
              <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                {user.name ? user.name[0].toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1 truncate">
                <span className="font-semibold text-slate-800 dark:text-slate-200">{user.name || user.email}</span>
                <span className="text-slate-400 dark:text-slate-500 ml-1.5">({user.email})</span>
              </div>
              {user.role === 'admin' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-medium">
                  Admin
                </span>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={onExtend}
              disabled={isExtending}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              <RefreshCw className={`w-4 h-4 ${isExtending ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              <span>
                {isExtending 
                  ? (lang === 'bn' ? 'বর্ধিত করা হচ্ছে...' : 'Extending...') 
                  : (lang === 'bn' ? 'সেশন বৃদ্ধি করুন' : 'Extend Session')}
              </span>
              <span className="hidden sm:inline-block ml-1 text-[11px] font-mono opacity-70 bg-black/20 px-1.5 py-0.5 rounded">
                Enter ↵
              </span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              disabled={isExtending}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 border border-slate-200 hover:border-rose-200 dark:border-slate-700 dark:hover:border-rose-900 font-medium transition-colors cursor-pointer text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>{lang === 'bn' ? 'লগআউট' : 'Log Out'}</span>
            </button>
          </div>

          <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-3 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            {lang === 'bn' 
              ? 'বাটনে ক্লিক করলে আপনার বর্তমান লগইন সেশন অবিলম্বে সচল থাকবে' 
              : 'Clicking extend immediately keeps your active login session safe'}
          </p>
        </div>
      </div>
    </div>
  );
};
