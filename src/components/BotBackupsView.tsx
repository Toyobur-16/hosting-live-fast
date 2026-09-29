import React, { useState, useEffect } from 'react';
import {
  Archive,
  RotateCcw,
  Download,
  Trash2,
  RefreshCw,
  Plus,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderArchive,
  Search,
  Filter,
  FileCode,
  HardDrive,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  X,
  Play,
  Layers
} from 'lucide-react';
import { BotBackupRecord } from '../types';

interface BotBackupsViewProps {
  botId?: string;
  botName?: string;
  lang: 'bn' | 'en';
  onBotsUpdated?: () => void;
}

export const BotBackupsView: React.FC<BotBackupsViewProps> = ({
  botId,
  botName,
  lang,
  onBotsUpdated
}) => {
  const [backups, setBackups] = useState<BotBackupRecord[]>([]);
  const [stats, setStats] = useState<{
    totalBackups: number;
    lastBackupTime: string | null;
    lastAutoBackupTime: string | null;
    nextScheduledAutoBackup: string | null;
    totalSizeBytes: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTrigger, setFilterTrigger] = useState<'all' | 'auto_24h' | 'manual'>('all');
  const [expandedBackupId, setExpandedBackupId] = useState<string | null>(null);

  // Modals
  const [restoreTarget, setRestoreTarget] = useState<BotBackupRecord | null>(null);
  const [restartOnRestore, setRestartOnRestore] = useState(true);
  const [restoring, setRestoring] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newBackupDesc, setNewBackupDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [triggeringAuto, setTriggeringAuto] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('bot_auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchBackups = async () => {
    if (!botId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bots/${botId}/backups`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to fetch backups list');
      }
      const data = await res.json();
      if (Array.isArray(data.backups)) {
        setBackups(data.backups);
      }
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading backups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, [botId]);

  const handleCreateManualBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botId) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/bots/${botId}/backups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          description: newBackupDesc.trim() || undefined
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to create backup');
      }

      const data = await res.json();
      setBackups(data.backups || []);
      if (data.stats) setStats(data.stats);
      setCreateModalOpen(false);
      setNewBackupDesc('');
      setSuccessMessage(
        lang === 'bn' ? 'স্ন্যাপশট ব্যাকআপ সফলভাবে তৈরি হয়েছে!' : 'Snapshot backup created successfully!'
      );
      setTimeout(() => setSuccessMessage(null), 4000);
      if (onBotsUpdated) onBotsUpdated();
    } catch (err: any) {
      setError(err.message || 'Error creating backup');
    } finally {
      setCreating(false);
    }
  };

  const handleTriggerAutoBackup = async () => {
    if (!botId) return;
    setTriggeringAuto(true);
    setError(null);
    try {
      const res = await fetch(`/api/bots/${botId}/backups/trigger-auto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to trigger 24h backup');
      }
      const data = await res.json();
      setBackups(data.backups || []);
      if (data.stats) setStats(data.stats);
      setSuccessMessage(
        lang === 'bn' ? '২৪ ঘণ্টার স্বয়ংক্রিয় ব্যাকআপ সম্পন্ন হয়েছে!' : '24-Hour automatic backup triggered successfully!'
      );
      setTimeout(() => setSuccessMessage(null), 4000);
      if (onBotsUpdated) onBotsUpdated();
    } catch (err: any) {
      setError(err.message || 'Error running 24h auto backup');
    } finally {
      setTriggeringAuto(false);
    }
  };

  const handleRestore = async () => {
    if (!botId || !restoreTarget) return;
    setRestoring(true);
    setError(null);
    try {
      const res = await fetch(`/api/bots/${botId}/backups/${restoreTarget.id}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          restart: restartOnRestore
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to restore backup');
      }

      const data = await res.json();
      setBackups(data.backups || []);
      if (data.stats) setStats(data.stats);
      const restoredName = restoreTarget.description || restoreTarget.id;
      setRestoreTarget(null);
      setSuccessMessage(
        lang === 'bn'
          ? `বট ফাইলগুলো '${restoredName}' ব্যাকআপ থেকে সফলভাবে রিস্টোর হয়েছে!`
          : `Bot workspace files restored successfully from '${restoredName}'!`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
      if (onBotsUpdated) onBotsUpdated();
    } catch (err: any) {
      setError(err.message || 'Error restoring files');
    } finally {
      setRestoring(false);
    }
  };

  const handleDelete = async (backupId: string) => {
    if (!botId) return;
    const confirmMsg =
      lang === 'bn'
        ? 'আপনি কি নিশ্চিত যে এই ব্যাকআপটি মুছে ফেলতে চান?'
        : 'Are you sure you want to permanently delete this backup snapshot?';
    if (!window.confirm(confirmMsg)) return;

    setDeletingId(backupId);
    try {
      const res = await fetch(`/api/bots/${botId}/backups/${backupId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to delete backup');
      }
      const data = await res.json();
      setBackups(data.backups || []);
      if (data.stats) setStats(data.stats);
      setSuccessMessage(lang === 'bn' ? 'ব্যাকআপ মুছে ফেলা হয়েছে।' : 'Backup deleted successfully.');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Error deleting backup');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (backupId: string) => {
    if (!botId) return;
    const token = localStorage.getItem('bot_auth_token');
    const url = `/api/bots/${botId}/backups/${backupId}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${botName || 'bot'}_backup_${backupId}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  const getRelativeTime = (iso: string) => {
    try {
      const diffMs = Date.now() - new Date(iso).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (lang === 'bn') {
        if (diffMins < 1) return 'এইমাত্র';
        if (diffMins < 60) return `${diffMins} মিনিট আগে`;
        if (diffHours < 24) return `${diffHours} ঘণ্টা আগে`;
        return `${diffDays} দিন আগে`;
      }
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  const filteredBackups = backups.filter((b) => {
    if (filterTrigger !== 'all' && b.trigger !== filterTrigger) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = b.description?.toLowerCase().includes(q);
      const matchId = b.id.toLowerCase().includes(q);
      const matchFile = b.files?.some((f) => f.name.toLowerCase().includes(q));
      return matchDesc || matchId || matchFile;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-[#0d1527] via-[#131d36] to-[#0f172a] border border-[#1f2c47] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-13 h-13 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
              <Archive className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {lang === 'bn' ? 'বট ফাইল ব্যাকআপ ও রিস্টোর' : 'Bot Files Backups & Restore'}
                </h2>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {lang === 'bn' ? '২৪ ঘণ্টা অটো-ব্যাকআপ সক্রিয়' : '24h Auto-Backup Active'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {lang === 'bn'
                  ? `প্রতি ২৪ ঘণ্টায় স্বয়ংক্রিয়ভাবে '${botName || 'বট'}' এর সমস্ত কোড ফাইল, ডাটাবেজ এবং স্ক্রিপ্টের ব্যাকআপ তৈরি হয়। যেকোনো ক্র্যাশ বা ভুলের পর এক ক্লিকে আগের অবস্থায় ফিরে যান।`
                  : `Automated recurring backups capture all Python scripts, JSON stores, and configs for '${botName || 'this bot'}' every 24 hours. Roll back or restore anytime with one click.`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleTriggerAutoBackup}
              disabled={triggeringAuto || loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 border border-amber-500/30 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
              title={lang === 'bn' ? '২৪ ঘণ্টার ব্যাকআপ এখনই ট্রিগার করুন' : 'Trigger 24-hour backup cycle now'}
            >
              <Clock className={`w-3.5 h-3.5 ${triggeringAuto ? 'animate-spin' : ''}`} />
              <span>{triggeringAuto ? (lang === 'bn' ? 'ব্যাকআপ হচ্ছে...' : 'Backing up...') : (lang === 'bn' ? '২৪ঘণ্টা অটো-রান' : 'Run 24h Backup')}</span>
            </button>

            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition-all shadow-md shadow-amber-500/20 cursor-pointer hover:scale-[1.02]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{lang === 'bn' ? 'নতুন ব্যাকআপ নিন' : 'New Snapshot'}</span>
            </button>

            <button
              type="button"
              onClick={fetchBackups}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
              title={lang === 'bn' ? 'রিফ্রেশ' : 'Refresh'}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <span className="text-slate-400 block text-[11px] font-medium">
              {lang === 'bn' ? 'মোট ব্যাকআপ সংখ্যা' : 'Total Backups'}
            </span>
            <span className="text-base font-bold text-white mt-0.5 block font-mono">
              {stats?.totalBackups ?? backups.length}
            </span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <span className="text-slate-400 block text-[11px] font-medium">
              {lang === 'bn' ? 'মোট ব্যাকআপ সাইজ' : 'Total Storage'}
            </span>
            <span className="text-base font-bold text-amber-400 mt-0.5 block font-mono">
              {formatBytes(stats?.totalSizeBytes ?? 0)}
            </span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <span className="text-slate-400 block text-[11px] font-medium">
              {lang === 'bn' ? 'সর্বশেষ অটো-ব্যাকআপ' : 'Last Auto-Backup'}
            </span>
            <span className="text-xs font-semibold text-emerald-400 mt-1 block truncate">
              {stats?.lastAutoBackupTime ? getRelativeTime(stats.lastAutoBackupTime) : (lang === 'bn' ? 'কোনো রেকর্ড নেই' : 'None yet')}
            </span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <span className="text-slate-400 block text-[11px] font-medium">
              {lang === 'bn' ? 'পরবর্তী শিডিউল ব্যাকআপ' : 'Next Auto-Backup'}
            </span>
            <span className="text-xs font-semibold text-sky-400 mt-1 block truncate">
              {stats?.nextScheduledAutoBackup
                ? formatDate(stats.nextScheduledAutoBackup)
                : (lang === 'bn' ? '২৪ ঘণ্টার মধ্যে' : 'Within 24 hours')}
            </span>
          </div>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-xs font-medium animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center justify-between gap-3 text-rose-800 dark:text-rose-300 text-xs font-medium animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="p-1 rounded-lg hover:bg-rose-200/50 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#161f30] p-3 rounded-2xl border border-slate-200 dark:border-[#1f293d]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              lang === 'bn' ? 'ব্যাকআপ বর্ণনা, ফাইলের নাম বা আইডি খুঁজুন...' : 'Search by description, file name, or backup ID...'
            }
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-center overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterTrigger('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
              filterTrigger === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {lang === 'bn' ? 'সকল ব্যাকআপ' : 'All'} ({backups.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTrigger('auto_24h')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              filterTrigger === 'auto_24h'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>{lang === 'bn' ? '২৪ঘণ্টা অটো' : '24h Auto'}</span>
            <span className="font-mono text-[10px]">
              ({backups.filter((b) => b.trigger === 'auto_24h').length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTrigger('manual')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              filterTrigger === 'manual'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>{lang === 'bn' ? 'ম্যানুয়াল স্ন্যাপশট' : 'Manual'}</span>
            <span className="font-mono text-[10px]">
              ({backups.filter((b) => b.trigger === 'manual').length})
            </span>
          </button>
        </div>
      </div>

      {/* Backups List */}
      {loading && backups.length === 0 ? (
        <div className="py-16 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-sm font-medium">
            {lang === 'bn' ? 'ব্যাকআপ রেকর্ড লোড হচ্ছে...' : 'Loading backup archives...'}
          </p>
        </div>
      ) : filteredBackups.length === 0 ? (
        <div className="py-16 bg-white dark:bg-[#161f30] rounded-3xl border border-slate-200 dark:border-[#1f293d] text-center p-8 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-4">
            <Archive className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-slate-800 dark:text-white">
            {lang === 'bn' ? 'কোনো ব্যাকআপ রেকর্ড পাওয়া যায়নি' : 'No Backups Found'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md">
            {searchQuery
              ? (lang === 'bn' ? 'আপনার সার্চ অনুযায়ী কোনো ব্যাকআপ মিলছে না।' : 'No backups match your search filter.')
              : (lang === 'bn'
                  ? 'এই বটের জন্য এখনো কোনো ব্যাকআপ নেই। আপনি উপরের "নতুন ব্যাকআপ নিন" বাটনে ক্লিক করে এখনই ইনস্ট্যান্ট স্ন্যাপশট নিতে পারেন।'
                  : 'No backups exist yet for this bot. Click "New Snapshot" or "Run 24h Backup" to capture one right away.')}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{lang === 'bn' ? 'প্রথম ব্যাকআপ নিন' : 'Take First Snapshot'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredBackups.map((b) => {
            const isAuto = b.trigger === 'auto_24h';
            const isExpanded = expandedBackupId === b.id;

            return (
              <div
                key={b.id}
                className="bg-white dark:bg-[#161f30] border border-slate-200 dark:border-[#1f293d] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-amber-500/40 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Info */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${
                        isAuto
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                          : 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400'
                      }`}
                    >
                      {isAuto ? <Clock className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            isAuto
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                              : 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                          }`}
                        >
                          {isAuto ? (lang === 'bn' ? '২৪ ঘণ্টা অটো ব্যাকআপ' : '24h Auto-Backup') : (lang === 'bn' ? 'ম্যানুয়াল স্ন্যাপশট' : 'Manual Snapshot')}
                        </span>

                        <span className="text-xs font-bold text-slate-800 dark:text-white">
                          {b.description || (isAuto ? 'Automatic 24-Hour Backup' : 'Manual Snapshot')}
                        </span>

                        {b.restoredAt && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{lang === 'bn' ? 'রিস্টোরকৃত' : 'Restored'}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(b.timestamp)}</span>
                          <span className="text-[11px] text-slate-400 font-mono">({getRelativeTime(b.timestamp)})</span>
                        </span>

                        <span className="flex items-center gap-1">
                          <FileCode className="w-3.5 h-3.5 text-slate-400" />
                          <button
                            type="button"
                            onClick={() => setExpandedBackupId(isExpanded ? null : b.id)}
                            className="text-amber-600 dark:text-amber-400 hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>{b.filesCount} {lang === 'bn' ? 'টি ফাইল' : 'files'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </span>

                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono">{formatBytes(b.totalSizeBytes)}</span>
                        </span>

                        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                          ID: {b.id}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setRestoreTarget(b)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer hover:scale-[1.02]"
                      title={lang === 'bn' ? 'এই ব্যাকআপ থেকে বট ফাইল রিস্টোর করুন' : 'Restore bot workspace to this backup snapshot'}
                    >
                      <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{lang === 'bn' ? 'রিস্টোর করুন' : 'Restore'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownload(b.id)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                      title={lang === 'bn' ? 'ZIP ডাউনলোড করুন' : 'Download ZIP archive'}
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(b.id)}
                      disabled={deletingId === b.id}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                      title={lang === 'bn' ? 'মুছে ফেলুন' : 'Delete backup'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Files Breakdown */}
                {isExpanded && b.files && b.files.length > 0 && (
                  <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-150">
                    <h5 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Layers className="w-3 h-3" />
                      <span>{lang === 'bn' ? 'ব্যাকআপে সংরক্ষিত ফাইলসমূহ:' : 'Files included in this backup snapshot:'}</span>
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {b.files.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <FileCode className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="font-mono text-slate-800 dark:text-slate-200 truncate">
                              {file.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                            {formatBytes(file.size)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {restoreTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {lang === 'bn' ? 'ব্যাকআপ ফাইল রিস্টোর নিশ্চিতকরণ' : 'Confirm Backup Restore'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {lang === 'bn' ? 'বটের কোড ও ফাইল পূর্বাবস্থায় ফিরিয়ে নিন' : 'Roll back bot workspace to this snapshot'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRestoreTarget(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-300 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  {lang === 'bn' ? 'সতর্কতা: রিস্টোর করলে কী ঘটবে?' : 'Notice: What happens upon restore?'}
                </span>
              </div>
              <p className="leading-relaxed">
                {lang === 'bn'
                  ? `আপনার বর্তমান বটের সমস্ত ফাইল এই ব্যাকআপ স্ন্যাপশট (${formatDate(restoreTarget.timestamp)}) দ্বারা প্রতিস্থাপিত হবে। ব্যাকআপে থাকা মোট ${restoreTarget.filesCount} টি ফাইল এক্সট্র্যাক্ট করা হবে।`
                  : `Your bot workspace files will be restored from snapshot '${restoreTarget.description || restoreTarget.id}' (${formatDate(restoreTarget.timestamp)}). Total ${restoreTarget.filesCount} file(s) will be extracted.`}
              </p>
            </div>

            {/* Restart Toggle */}
            <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Play className="w-4 h-4 text-emerald-500" />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">
                    {lang === 'bn' ? 'রিস্টোরের পর বট স্বয়ংক্রিয় রিস্টার্ট করুন' : 'Restart bot process after restore'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    {lang === 'bn'
                      ? 'নতুন রিস্টোরকৃত স্ক্রিপ্ট দিয়ে বট তৎক্ষণাৎ চালু হবে'
                      : 'Automatically launches the restored bot script'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={restartOnRestore}
                onChange={(e) => setRestartOnRestore(e.target.checked)}
                className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
              />
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRestoreTarget(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleRestore}
                disabled={restoring}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {restoring && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {restoring
                    ? (lang === 'bn' ? 'রিস্টোর হচ্ছে...' : 'Restoring...')
                    : (lang === 'bn' ? 'হ্যাঁ, রিস্টোর নিশ্চিত করুন' : 'Confirm & Restore')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Snapshot Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
                  <Archive className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {lang === 'bn' ? 'নতুন ফাইল স্ন্যাপশট ব্যাকআপ' : 'Create New File Snapshot'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {lang === 'bn' ? 'বর্তমান বটের সকল ফাইলের ইনস্ট্যান্ট ব্যাকআপ' : 'Capture an instant backup of current bot workspace'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualBackup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {lang === 'bn' ? 'স্ন্যাপশট নোট বা বর্ণনা (ঐচ্ছিক):' : 'Snapshot Note / Description (Optional):'}
                </label>
                <input
                  type="text"
                  value={newBackupDesc}
                  onChange={(e) => setNewBackupDesc(e.target.value)}
                  placeholder={
                    lang === 'bn'
                      ? 'যেমন: নতুন কোড বা পেমেন্ট হ্যান্ডলার যোগ করার আগে'
                      : 'e.g. Before refactoring payment handler or bot code'
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {lang === 'bn'
                  ? 'এই স্ন্যাপশটে বটের সমস্ত পাইথন স্ক্রিপ্ট (.py), কনফিগ (.json), টেক্সট (.txt) এবং পরিবেশ ভেরিয়েবল অন্তর্ভুক্ত থাকবে।'
                  : 'This snapshot will compress and archive all current scripts, databases, and configuration files into an immutable zip.'}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {creating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {creating
                      ? (lang === 'bn' ? 'তৈরি হচ্ছে...' : 'Creating...')
                      : (lang === 'bn' ? 'ব্যাকআপ তৈরি করুন' : 'Create Snapshot')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
