import React, { useState, useEffect } from 'react';
import { 
  X, Settings, FileCode, Package, Database, ShieldCheck, Cloud, ChevronRight, HardDrive, ArrowLeft,
  Bell, BellOff, Volume2, History, Rocket, Tag, Archive, Lock, Unlock, Key, CheckCircle2,
  AlertTriangle, RefreshCw, Sparkles, FolderArchive, Clock
} from 'lucide-react';
import { ScriptEditor } from './ScriptEditor';
import { DatabaseManager } from './DatabaseManager';
import { HostingGuide } from './HostingGuide';
import { PipManagerModal } from './PipManagerModal';
import { DeploymentHistoryView } from './DeploymentHistoryView';
import { BotBackupsView } from './BotBackupsView';
import { HostedBot, AuthUser, UserAutoBackupSettings, UserStorageStats } from '../types';
import { playBotStoppedAlert } from '../utils/audioAlert';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'bn' | 'en';
  currentUser: AuthUser | null;
  bots: HostedBot[];
  selectedBotId: string | null;
  onSelectBot: (id: string) => void;
  onBotsUpdated: () => void;
  onTestToken: () => void;
  onUserUpdated?: (user: AuthUser) => void;
  initialTab?: string;
  soundAlertEnabled?: boolean;
  onToggleSoundAlert?: (enabled: boolean) => void;
  onTestIdleWarning?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  lang,
  currentUser,
  bots,
  selectedBotId,
  onSelectBot,
  onBotsUpdated,
  onTestToken,
  onUserUpdated,
  initialTab = 'overview',
  soundAlertEnabled = true,
  onToggleSoundAlert,
  onTestIdleWarning
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [showPip, setShowPip] = useState(false);

  // Auto-Backup & Account Storage State
  const [autoBackupConfig, setAutoBackupConfig] = useState<UserAutoBackupSettings | null>(null);
  const [storageStats, setStorageStats] = useState<UserStorageStats | null>(null);
  const [loadingAutoBackup, setLoadingAutoBackup] = useState(false);
  const [updatingAutoBackup, setUpdatingAutoBackup] = useState(false);
  const [runningDailyNow, setRunningDailyNow] = useState(false);
  const [backupSuccessToast, setBackupSuccessToast] = useState<string | null>(null);
  const [backupErrorToast, setBackupErrorToast] = useState<string | null>(null);

  // Idle Session Security State
  const [idleTimerEnabled, setIdleTimerEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('bot_idle_timer_enabled');
      return saved !== 'false';
    } catch {
      return true;
    }
  });

  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('bot_idle_timeout_min');
      return saved ? parseInt(saved, 10) : 15;
    } catch {
      return 15;
    }
  });

  const handleToggleIdleTimer = (newVal: boolean) => {
    setIdleTimerEnabled(newVal);
    localStorage.setItem('bot_idle_timer_enabled', String(newVal));
    window.dispatchEvent(new CustomEvent('idle-settings-updated'));
  };

  const handleChangeIdleTimeout = (minutes: number) => {
    setIdleTimeoutMinutes(minutes);
    localStorage.setItem('bot_idle_timeout_min', String(minutes));
    window.dispatchEvent(new CustomEvent('idle-settings-updated'));
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('bot_auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchAutoBackupSettings = async () => {
    setLoadingAutoBackup(true);
    try {
      const res = await fetch('/api/user/auto-backup-settings', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) setAutoBackupConfig(data.config);
        if (data.storage) setStorageStats(data.storage);
      }
    } catch (err) {
      console.warn('[SettingsModal] Failed to load auto-backup settings:', err);
    } finally {
      setLoadingAutoBackup(false);
    }
  };

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchAutoBackupSettings();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedBot = bots.find((b) => b.id === selectedBotId) || (bots.length > 0 ? bots[0] : null);

  const handleToggleAutoBackup = async (enabled: boolean) => {
    setUpdatingAutoBackup(true);
    setBackupErrorToast(null);
    try {
      const res = await fetch('/api/user/auto-backup-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ enabled })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to update auto-backup setting');
      }
      const data = await res.json();
      if (data.config) setAutoBackupConfig(data.config);
      if (data.storage) setStorageStats(data.storage);
      setBackupSuccessToast(
        enabled
          ? (lang === 'bn' ? 'দৈনিক এনক্রিপ্টেড অটো-ব্যাকআপ সক্রিয় করা হয়েছে!' : 'Daily encrypted auto-backup enabled!')
          : (lang === 'bn' ? 'অটো-ব্যাকআপ সাময়িকভাবে বন্ধ করা হয়েছে।' : 'Daily auto-backup paused.')
      );
      setTimeout(() => setBackupSuccessToast(null), 3500);
    } catch (err: any) {
      setBackupErrorToast(err.message || 'Error updating auto-backup setting');
      setTimeout(() => setBackupErrorToast(null), 4000);
    } finally {
      setUpdatingAutoBackup(false);
    }
  };

  const handleToggleEncryption = async (encryptionEnabled: boolean) => {
    setUpdatingAutoBackup(true);
    setBackupErrorToast(null);
    try {
      const res = await fetch('/api/user/auto-backup-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ encryptionEnabled })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to update encryption setting');
      }
      const data = await res.json();
      if (data.config) setAutoBackupConfig(data.config);
      setBackupSuccessToast(
        encryptionEnabled
          ? (lang === 'bn' ? '🔒 AES-256 মিলিটারি এনক্রিপশন সক্রিয়!' : '🔒 AES-256 encryption enabled!')
          : (lang === 'bn' ? 'এনক্রিপশন বন্ধ করা হয়েছে।' : 'Encryption disabled.')
      );
      setTimeout(() => setBackupSuccessToast(null), 3500);
    } catch (err: any) {
      setBackupErrorToast(err.message || 'Error updating encryption');
      setTimeout(() => setBackupErrorToast(null), 4000);
    } finally {
      setUpdatingAutoBackup(false);
    }
  };

  const handleRunDailyBackupNow = async () => {
    if (!selectedBot) return;
    setRunningDailyNow(true);
    setBackupErrorToast(null);
    try {
      const res = await fetch('/api/user/auto-backup/run-now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ botId: selectedBot.id })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to run daily backup');
      }
      const data = await res.json();
      if (data.storage) setStorageStats(data.storage);
      setBackupSuccessToast(
        lang === 'bn'
          ? `🔒 '${selectedBot.name}' এর দৈনিক এনক্রিপ্টেড ব্যাকআপ অ্যাকাউন্ট স্টোরেজে সফলভাবে তৈরি হয়েছে!`
          : `🔒 Daily encrypted backup for '${selectedBot.name}' created successfully in account storage!`
      );
      setTimeout(() => setBackupSuccessToast(null), 5000);
      onBotsUpdated();
    } catch (err: any) {
      setBackupErrorToast(err.message || 'Error triggering daily backup');
      setTimeout(() => setBackupErrorToast(null), 4500);
    } finally {
      setRunningDailyNow(false);
    }
  };

  const isAutoEnabled = autoBackupConfig?.enabled !== false;
  const isEncEnabled = autoBackupConfig?.encryptionEnabled !== false;

  const SETTING_ITEMS = [
    {
      id: 'backups',
      icon: Archive,
      titleBn: 'অটো-ব্যাকআপ ও অ্যাকাউন্ট স্টোরেজ',
      titleEn: 'Auto-Backup & Encrypted Storage',
      descBn: 'দৈনিক স্বয়ংক্রিয় AES-256 এনক্রিপ্ট ব্যাকআপ, অ্যাকাউন্ট ক্লাউড স্টোরেজ ও রিস্টোর',
      descEn: 'Daily recurring AES-256 encrypted backups, account storage & one-click restore',
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
    },
    {
      id: 'deployments',
      icon: History,
      titleBn: 'ডিপ্লয়মেন্ট হিস্ট্রি ও ভার্সন',
      titleEn: 'Deployment History & Versions',
      descBn: 'অতীতের ডিপ্লয়মেন্ট টাইমস্ট্যাম্প, রিলিজ নোট, ভার্সন ও সোর্স ট্র্যাক করুন',
      descEn: 'Inspect past deployment timestamps, versions, release notes and rollback targets',
      color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800'
    },
    {
      id: 'files',
      icon: FileCode,
      titleBn: 'ফাইল আপলোড ও এডিটর',
      titleEn: 'File Upload & Script Editor',
      descBn: 'বটের কোড ও ফাইল দেখুন, লাইভ এডিট করুন বা নতুন ফাইল আপলোড করুন',
      descEn: 'Edit bot code, upload python scripts and inspect files',
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800'
    },
    {
      id: 'pip',
      icon: Package,
      titleBn: 'প্যাকেজ ম্যানেজার (Pip Install)',
      titleEn: 'Python Pip Packages',
      descBn: 'telebot, aiogram, python-telegram-bot, requests ইত্যাদি লাইব্রেরি ইনস্টল করুন',
      descEn: 'Install python libraries and bot dependencies with one click',
      color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800',
      isAction: true,
      action: () => setShowPip(true)
    },
    {
      id: 'database',
      icon: Database,
      titleBn: 'ডাটাবেজ ও স্টোরেজ ব্যাকআপ',
      titleEn: 'Database & Storage Backup',
      descBn: 'বটের JSON ফাইল, ডাটাবেজ ব্যাকআপ ডাউনলোড ও স্টোরেজ চেক করুন',
      descEn: 'Download full bot data backup and inspect storage',
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
    },
    {
      id: 'token_test',
      icon: ShieldCheck,
      titleBn: 'বট টোকেন ভেরিফাই',
      titleEn: 'Verify Bot Token',
      descBn: 'টেলিগ্রাম অফিসিয়াল API দিয়ে টোকেন সক্রিয় আছে কিনা পরীক্ষা করুন',
      descEn: 'Verify bot token with official Telegram API',
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
      isAction: true,
      action: () => {
        onClose();
        onTestToken();
      }
    },
    {
      id: 'guide',
      icon: Cloud,
      titleBn: '২৪/৭ হোস্টিং গাইড ও সিস্টেম ডেমো',
      titleEn: '24/7 Hosting Guide',
      descBn: 'যেকোনো পাইথন টেলিগ্রাম বট সবসময় চালু রাখার গাইড ও তথ্য',
      descEn: 'Step by step guide to build and host telegram bots',
      color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800'
    }
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-start sm:justify-center p-0 sm:p-5 z-50 animate-in fade-in duration-200 pt-[max(0.35rem,env(safe-area-inset-top))] pb-[max(0.35rem,env(safe-area-inset-bottom))]">
        <div className="bg-white dark:bg-[#111827] border-0 sm:border border-[#e2e8f0] dark:border-[#1f293d] rounded-none sm:rounded-3xl max-w-5xl w-full h-full sm:h-[88vh] max-h-[100dvh] sm:max-h-[850px] shadow-2xl flex flex-col overflow-hidden transition-colors">
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-[#e2e8f0] dark:border-[#1f293d] flex items-center justify-between bg-[#f8fafc] dark:bg-[#111827]">
            <div className="flex items-center gap-3">
              {activeTab !== 'overview' && (
                <button
                  onClick={() => setActiveTab('overview')}
                  className="p-1.5 rounded-xl hover:bg-[#e2e8f0] dark:hover:bg-[#1f293d] text-[#64748b] dark:text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-white transition-colors cursor-pointer"
                  title="Back to Settings Menu"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="w-10 h-10 rounded-2xl bg-[#0088cc]/10 dark:bg-[#0088cc]/20 border border-[#0088cc]/20 flex items-center justify-center text-[#0088cc]">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1e293b] dark:text-white">
                  {activeTab === 'overview'
                    ? (lang === 'bn' ? 'কন্ট্রোল সেন্টার ও সেটিংস' : 'Control Center & Settings')
                    : (lang === 'bn'
                        ? SETTING_ITEMS.find((i) => i.id === activeTab)?.titleBn
                        : SETTING_ITEMS.find((i) => i.id === activeTab)?.titleEn) || 'Settings'}
                </h3>
                <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                  {activeTab === 'overview'
                    ? (lang === 'bn' ? 'বট ম্যানেজমেন্ট, অটো-ব্যাকআপ ও স্টোরেজ নিয়ন্ত্রণ' : 'Advanced management tools, files, backups and configuration')
                    : (lang === 'bn'
                        ? SETTING_ITEMS.find((i) => i.id === activeTab)?.descBn
                        : SETTING_ITEMS.find((i) => i.id === activeTab)?.descEn) || ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeTab !== 'overview' && (
                <button
                  onClick={() => setActiveTab('overview')}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-white hover:bg-[#f1f5f9] dark:hover:bg-[#334155] transition-all cursor-pointer hidden sm:flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'মেনু' : 'Back to Menu'}</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-white hover:bg-[#e2e8f0] dark:hover:bg-[#1e293b] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Content Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 text-[#1e293b] dark:text-[#f3f4f6]">
            {activeTab === 'overview' ? (
              <div className="space-y-6">
                {currentUser && (
                  <div className="p-4 bg-gradient-to-r from-slate-50 dark:from-[#1e293b]/70 to-blue-50/50 dark:to-blue-950/30 border border-[#e2e8f0] dark:border-[#1f293d] rounded-2xl flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#0088cc] text-white flex items-center justify-center font-bold text-base shadow-sm">
                        {(currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#1e293b] dark:text-white">{currentUser.name || currentUser.email || 'User'}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                            {lang === 'bn' ? 'সক্রিয় একাউন্ট' : 'Active Account'}
                          </span>
                        </div>
                        <p className="text-xs text-[#64748b] dark:text-[#94a3b8] font-mono mt-0.5">{currentUser.email}</p>
                      </div>
                    </div>
                    <div className="text-xs text-[#64748b] dark:text-[#94a3b8] flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-[#0088cc]" />
                      <span>{bots.length} {lang === 'bn' ? 'টি বট হোস্ট করা' : 'Bots Hosted'}</span>
                    </div>
                  </div>
                )}

                {bots.length > 1 && (
                  <div className="flex items-center justify-between p-3 bg-[#f8fafc] dark:bg-[#1e293b]/70 border border-[#e2e8f0] dark:border-[#334155] rounded-xl text-xs">
                    <span className="font-semibold text-[#1e293b] dark:text-white">
                      {lang === 'bn' ? 'বর্তমান বট নির্বাচন:' : 'Default Selected Bot:'}
                    </span>
                    <select
                      value={selectedBotId || ''}
                      onChange={(e) => onSelectBot(e.target.value)}
                      className="bg-white dark:bg-[#111827] border border-[#cbd5e1] dark:border-[#334155] rounded-lg px-3 py-1 font-medium text-[#1e293b] dark:text-white cursor-pointer"
                    >
                      {bots.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.status === 'running' ? 'LIVE' : 'OFF'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Toast Messages */}
                {backupSuccessToast && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{backupSuccessToast}</span>
                  </div>
                )}

                {backupErrorToast && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{backupErrorToast}</span>
                  </div>
                )}

                {/* Auto-Backup Feature Card in Settings Modal */}
                <div
                  id="auto-backup-feature-card"
                  className="bg-gradient-to-br from-amber-50/50 via-white to-blue-50/40 dark:from-[#141d2e] dark:via-[#161f30] dark:to-[#0f172a] border border-amber-200/80 dark:border-[#1f293d] hover:border-amber-400/60 rounded-3xl p-5 sm:p-6 shadow-sm transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 transition-colors shadow-sm ${
                          isAutoEnabled
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-500 dark:text-amber-400'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                        }`}
                      >
                        <Archive className="w-6 h-6 stroke-[2.2]" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-[#1e293b] dark:text-white">
                            {lang === 'bn' ? 'ডেইলি অটো-ব্যাকআপ (Auto-Backup)' : 'Daily Auto-Backup Feature'}
                          </h4>
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                              isAutoEnabled
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {isAutoEnabled ? (lang === 'bn' ? 'চালু' : 'Active') : (lang === 'bn' ? 'বন্ধ' : 'Paused')}
                          </span>
                          {isEncEnabled && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              <span>AES-256 Encrypted</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1 leading-relaxed">
                          {lang === 'bn'
                            ? 'প্রতি ২৪ ঘণ্টায় স্বয়ংক্রিয়ভাবে বট ফাইলের এনক্রিপ্টেড ব্যাকআপ তৈরি হয়ে ইউজারের অ্যাকাউন্ট স্টোরেজে সেভ হবে।'
                            : 'Enables recurring 24-hour encrypted backups of your bot code and database saved directly in your account storage.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <span className="text-xs font-semibold text-[#1e293b] dark:text-white">
                        {isAutoEnabled ? (lang === 'bn' ? 'অটো-ব্যাকআপ সক্রিয়' : 'Auto-Backup Enabled') : (lang === 'bn' ? 'অটো-ব্যাকআপ বন্ধ' : 'Disabled')}
                      </span>
                      <button
                        type="button"
                        id="btn-toggle-auto-backup"
                        role="switch"
                        aria-checked={isAutoEnabled}
                        disabled={updatingAutoBackup}
                        onClick={() => handleToggleAutoBackup(!isAutoEnabled)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0088cc] ${
                          isAutoEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        title={isAutoEnabled ? 'Disable daily auto backup' : 'Enable daily auto backup'}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            isAutoEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Account Storage & Encryption Details Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 text-xs">
                    {/* Storage Meter */}
                    <div className="p-3 rounded-2xl bg-white/70 dark:bg-[#111827]/70 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <HardDrive className="w-3.5 h-3.5 text-amber-500" />
                          <span>{lang === 'bn' ? 'অ্যাকাউন্ট স্টোরেজ ব্যবহার:' : 'Account Storage Used:'}</span>
                        </span>
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                          {storageStats ? `${storageStats.usedMb} MB / ${storageStats.maxStorageMb} MB (${storageStats.percentUsed}%)` : '0 MB'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            (storageStats?.percentUsed || 0) > 85 ? 'bg-rose-500' : (storageStats?.percentUsed || 0) > 60 ? 'bg-amber-400' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(4, storageStats?.percentUsed || 5))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                        <span>{storageStats?.backupsCount ?? 0} {lang === 'bn' ? 'টি ব্যাকআপ ফাইল' : 'backups stored'}</span>
                        <span>{storageStats?.freeMb ?? 50} MB {lang === 'bn' ? 'ফ্রি স্পেস' : 'free'}</span>
                      </div>
                    </div>

                    {/* Encryption Setting */}
                    <div className="p-3 rounded-2xl bg-white/70 dark:bg-[#111827]/70 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl ${isEncEnabled ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-100 text-slate-400'}`}>
                          {isEncEnabled ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-white block">
                            {lang === 'bn' ? 'AES-256 এনক্রিপশন' : 'AES-256 Encryption'}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                            {isEncEnabled
                              ? (lang === 'bn' ? 'মিলিটারি-গ্রেড সুরক্ষায় সংরক্ষিত' : 'Authenticated AES-GCM security')
                              : (lang === 'bn' ? 'স্ট্যান্ডার্ড জিপ আর্কাইভ' : 'Standard unencrypted zip')}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleEncryption(!isEncEnabled)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isEncEnabled
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {isEncEnabled ? (lang === 'bn' ? 'এনক্রিপ্ট চালু' : 'Encrypted ON') : (lang === 'bn' ? 'বন্ধ' : 'OFF')}
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('backups')}
                      className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{lang === 'bn' ? 'ব্যাকআপের তালিকা ও বিস্তারিত কনফিগারেশন দেখুন' : 'Manage All Backups & Restore Files'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={handleRunDailyBackupNow}
                      disabled={runningDailyNow}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer hover:scale-[1.02] disabled:opacity-50"
                    >
                      {runningDailyNow ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {runningDailyNow
                          ? (lang === 'bn' ? 'ব্যাকআপ হচ্ছে...' : 'Backing up...')
                          : (lang === 'bn' ? 'দৈনিক ব্যাকআপ রান করুন' : 'Run Daily Backup Now')}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Sound Alert Notification Toggle */}
                <div 
                  id="bot-sound-alert-card"
                  className="bg-white dark:bg-[#161f30] border border-[#e2e8f0] dark:border-[#1f293d] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 transition-colors ${
                        soundAlertEnabled
                          ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                          : 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {soundAlertEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[#1e293b] dark:text-white">
                          {lang === 'bn' ? 'বট অফলাইন/স্টপ সাউন্ড অ্যালার্ট' : 'Bot Stopped Sound Alert'}
                        </h4>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            soundAlertEnabled
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {soundAlertEnabled ? (lang === 'bn' ? 'চালু' : 'Enabled') : (lang === 'bn' ? 'বন্ধ' : 'Muted')}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1 leading-relaxed">
                        {lang === 'bn'
                          ? 'কোনো বটের স্ট্যাটাস "running" থেকে "stopped" বা অফলাইন হলে সাথে সাথে ছোট অডিও বিপ অ্যালার্ট বাজবে।'
                          : "Plays a short audio tone immediately whenever a bot's status changes from running to stopped."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      id="btn-test-sound-alert"
                      onClick={() => playBotStoppedAlert()}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                      title={lang === 'bn' ? 'অ্যালার্ট সাউন্ড পরীক্ষা করুন' : 'Test sound alert'}
                    >
                      <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                      <span>{lang === 'bn' ? 'টেস্ট সাউন্ড' : 'Test Sound'}</span>
                    </button>

                    <button
                      type="button"
                      id="btn-toggle-sound-alert"
                      role="switch"
                      aria-checked={soundAlertEnabled}
                      onClick={() => onToggleSoundAlert && onToggleSoundAlert(!soundAlertEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0088cc] ${
                        soundAlertEnabled ? 'bg-[#0088cc]' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      title={soundAlertEnabled ? (lang === 'bn' ? 'সাউন্ড বন্ধ করুন' : 'Mute sound alert') : (lang === 'bn' ? 'সাউন্ড চালু করুন' : 'Enable sound alert')}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          soundAlertEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Idle Session Security & Warning Card */}
                <div 
                  id="idle-session-security-card"
                  className="bg-white dark:bg-[#161f30] border border-[#e2e8f0] dark:border-[#1f293d] rounded-2xl p-4 sm:p-5 flex flex-col gap-4 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 transition-colors ${
                          idleTimerEnabled
                            ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                            : 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#1e293b] dark:text-white">
                            {lang === 'bn' ? 'সেশন নিষ্ক্রিয়তা নিরাপত্তা ও ওয়ার্নিং' : 'Idle Session Security & Warning'}
                          </h4>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              idleTimerEnabled
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {idleTimerEnabled ? (lang === 'bn' ? 'সক্রিয়' : 'Active') : (lang === 'bn' ? 'নিষ্ক্রিয়' : 'Disabled')}
                          </span>
                        </div>
                        <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1 leading-relaxed">
                          {lang === 'bn'
                            ? 'দীর্ঘক্ষণ নিষ্ক্রিয় থাকলে ৬০ সেকেন্ডের কাউন্টডাউন সহ "Session Expiring" ওয়ার্নিং প্রদর্শিত হবে এবং এক ক্লিকেই সেশন বাড়ানো যাবে।'
                            : 'Displays a 60-second "Session Expiring" warning modal when inactive, providing a one-click button to extend the session.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      {onTestIdleWarning && (
                        <button
                          type="button"
                          id="btn-test-idle-warning"
                          onClick={() => {
                            onClose();
                            setTimeout(() => {
                              onTestIdleWarning();
                            }, 150);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800/70 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                          title={lang === 'bn' ? 'ওয়ার্নিং মোডাল টেস্ট করুন' : 'Test warning modal'}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{lang === 'bn' ? 'টেস্ট ওয়ার্নিং' : 'Test Warning'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        id="btn-toggle-idle-timer"
                        role="switch"
                        aria-checked={idleTimerEnabled}
                        onClick={() => handleToggleIdleTimer(!idleTimerEnabled)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0088cc] ${
                          idleTimerEnabled ? 'bg-[#0088cc]' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        title={idleTimerEnabled ? (lang === 'bn' ? 'বন্ধ করুন' : 'Disable') : (lang === 'bn' ? 'চালু করুন' : 'Enable')}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            idleTimerEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Timeout Duration Selector */}
                  {idleTimerEnabled && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        {lang === 'bn' ? 'নিষ্ক্রিয়তার সময়সীমা (Inactivity Limit):' : 'Inactivity Timeout Limit:'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {[5, 10, 15, 30, 60].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => handleChangeIdleTimeout(mins)}
                            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                              idleTimeoutMinutes === mins
                                ? 'bg-sky-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            {mins} {lang === 'bn' ? 'মিনিট' : 'min'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Bot Version & Deployment Quick Banner */}
                {selectedBot && (
                  <div className="p-4 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-200 dark:border-purple-900/50 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                        <Rocket className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#1e293b] dark:text-white">
                            {selectedBot.name}
                          </h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 font-bold border border-purple-300 dark:border-purple-800">
                            {selectedBot.currentVersion || 'v1.0.0'}
                          </span>
                        </div>
                        <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                          {lang === 'bn' 
                            ? `মোট ${selectedBot.deploymentCount || 1} টি ডিপ্লয়মেন্ট রেকর্ড সংরক্ষিত আছে`
                            : `${selectedBot.deploymentCount || 1} deployment release(s) recorded`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('backups')}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                      >
                        <Archive className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{lang === 'bn' ? 'অটো-ব্যাকআপ' : 'Auto-Backups'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('deployments')}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>{lang === 'bn' ? 'ডিপ্লয়মেন্ট হিস্ট্রি' : 'Deployments'}</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SETTING_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (item.isAction && item.action) {
                            item.action();
                          } else {
                            setActiveTab(item.id);
                          }
                        }}
                        className="bg-white dark:bg-[#161f30] border border-[#e2e8f0] dark:border-[#1f293d] hover:border-[#0088cc]/60 hover:shadow-md rounded-2xl p-5 transition-all cursor-pointer flex items-start justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${item.color} group-hover:scale-105 transition-transform`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-[#1e293b] dark:text-white group-hover:text-[#0088cc] transition-colors">
                              {lang === 'bn' ? item.titleBn : item.titleEn}
                            </h4>
                            <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1 leading-relaxed">
                              {lang === 'bn' ? item.descBn : item.descEn}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#94a3b8] group-hover:text-[#0088cc] group-hover:translate-x-0.5 transition-all shrink-0 mt-3" />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : activeTab === 'backups' ? (
              <BotBackupsView
                lang={lang}
                botId={selectedBot?.id}
                botName={selectedBot?.name}
                currentUser={currentUser}
                onBotsUpdated={onBotsUpdated}
              />
            ) : activeTab === 'deployments' ? (
              <DeploymentHistoryView
                lang={lang}
                botId={selectedBot?.id}
                botName={selectedBot?.name}
                onBotsUpdated={onBotsUpdated}
              />
            ) : activeTab === 'files' ? (
              <ScriptEditor
                lang={lang}
                botId={selectedBot?.id}
                botName={selectedBot?.name}
                onFileSaved={() => {
                  onBotsUpdated();
                }}
              />
            ) : activeTab === 'database' ? (
              <DatabaseManager lang={lang} />
            ) : activeTab === 'guide' ? (
              <HostingGuide
                lang={lang}
                botId={selectedBot?.id}
                botName={selectedBot?.name}
              />
            ) : null}
          </div>
        </div>
      </div>

      {showPip && (
        <PipManagerModal onClose={() => setShowPip(false)} lang={lang} />
      )}
    </>
  );
};
