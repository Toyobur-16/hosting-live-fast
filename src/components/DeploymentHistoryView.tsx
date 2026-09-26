import React, { useState, useEffect } from 'react';
import { 
  Rocket, History, Calendar, Clock, CheckCircle2, GitCommit, 
  FileCode, Tag, RefreshCw, Plus, ShieldCheck, AlertCircle, 
  User, FolderArchive, Sparkles, Copy, Check, ArrowUpRight,
  Filter, Search
} from 'lucide-react';
import { DeploymentRecord } from '../types';

interface DeploymentHistoryViewProps {
  botId?: string;
  botName?: string;
  lang: 'bn' | 'en';
  onBotsUpdated?: () => void;
}

export const DeploymentHistoryView: React.FC<DeploymentHistoryViewProps> = ({
  botId,
  botName,
  lang,
  onBotsUpdated
}) => {
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTrigger, setFilterTrigger] = useState<string>('all');

  // Deploy New Version Modal state
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [releaseNote, setReleaseNote] = useState('');
  const [restartBot, setRestartBot] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [deploySuccessMessage, setDeploySuccessMessage] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('bot_auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchDeployments = async () => {
    if (!botId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bots/${botId}/deployments`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to fetch deployment history');
      }
      const data = await res.json();
      if (Array.isArray(data.deployments)) {
        setDeployments(data.deployments);
        // Suggest next semantic version
        const latest = data.deployments[0]?.version || 'v1.0.0';
        const match = latest.match(/v?(\d+)\.(\d+)(?:\.(\d+))?/);
        if (match) {
          const major = parseInt(match[1] || '1', 10);
          const minor = parseInt(match[2] || '0', 10);
          const patch = parseInt(match[3] || '0', 10);
          setNewVersion(`v${major}.${minor}.${patch + 1}`);
        } else {
          setNewVersion('v1.0.1');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error loading deployment history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, [botId]);

  const handleTriggerDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botId) return;
    setDeploying(true);
    setError(null);
    try {
      const res = await fetch(`/api/bots/${botId}/deployments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          version: newVersion,
          description: releaseNote || (lang === 'bn' ? 'ম্যানুয়াল ডিপ্লয়মেন্ট' : 'Manual deployment'),
          trigger: 'manual_deploy',
          restart: restartBot
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Deployment failed');
      }

      setDeploySuccessMessage(
        lang === 'bn'
          ? `সফল হয়েছে! ভার্সন ${data.deployment?.version || newVersion} ডিপ্লয় সম্পন্ন!`
          : `Success! Version ${data.deployment?.version || newVersion} deployed!`
      );
      setShowDeployModal(false);
      setReleaseNote('');
      fetchDeployments();
      if (onBotsUpdated) onBotsUpdated();
      setTimeout(() => setDeploySuccessMessage(null), 4500);
    } catch (err: any) {
      setError(err.message || 'Failed to trigger deployment');
    } finally {
      setDeploying(false);
    }
  };

  const handleActivateDeployment = async (depId: string, version: string) => {
    if (!botId) return;
    setActivatingId(depId);
    try {
      const res = await fetch(`/api/bots/${botId}/deployments/${depId}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ restart: true })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to activate deployment');
      }
      setDeploySuccessMessage(
        lang === 'bn'
          ? `সফলভাবে ভার্সন ${version} সক্রিয় করা হয়েছে!`
          : `Version ${version} set as active deployment target!`
      );
      fetchDeployments();
      if (onBotsUpdated) onBotsUpdated();
      setTimeout(() => setDeploySuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to activate deployment');
    } finally {
      setActivatingId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatExactDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return isoString;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 60) {
        return lang === 'bn' ? 'এইমাত্র' : 'Just now';
      }
      if (diffMin < 60) {
        return lang === 'bn' ? `${diffMin} মিনিট আগে` : `${diffMin}m ago`;
      }
      if (diffHour < 24) {
        return lang === 'bn' ? `${diffHour} ঘণ্টা আগে` : `${diffHour}h ago`;
      }
      if (diffDay < 30) {
        return lang === 'bn' ? `${diffDay} দিন আগে` : `${diffDay}d ago`;
      }
      return date.toLocaleDateString();
    } catch {
      return isoString;
    }
  };

  const getTriggerMeta = (trigger: string) => {
    switch (trigger) {
      case 'initial_deploy':
        return {
          labelBn: 'প্রথম ডিপ্লয়মেন্ট',
          labelEn: 'Initial Deployment',
          icon: Sparkles,
          color: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800'
        };
      case 'code_update':
        return {
          labelBn: 'কোড এডিটর আপডেট',
          labelEn: 'Script Code Update',
          icon: FileCode,
          color: 'text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800'
        };
      case 'safe_update':
        return {
          labelBn: 'সেফ ডাটাবেজ আপডেট',
          labelEn: 'Safe Data Update',
          icon: ShieldCheck,
          color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800'
        };
      case 'zip_upload':
        return {
          labelBn: 'জিপ প্যাকেজ আপলোড',
          labelEn: 'ZIP Package Deploy',
          icon: FolderArchive,
          color: 'text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800'
        };
      case 'file_upload':
        return {
          labelBn: 'ফাইল আপলোড',
          labelEn: 'File Upload',
          icon: FileCode,
          color: 'text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-800'
        };
      case 'manual_deploy':
      default:
        return {
          labelBn: 'রিলিজ ডিপ্লয়মেন্ট',
          labelEn: 'Manual Release',
          icon: Rocket,
          color: 'text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800'
        };
    }
  };

  const filteredDeployments = deployments.filter((dep) => {
    const matchesQuery = 
      dep.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dep.description && dep.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (dep.deployedBy && dep.deployedBy.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = filterTrigger === 'all' || dep.trigger === filterTrigger;
    return matchesQuery && matchesFilter;
  });

  const activeDeployment = deployments.find((d) => d.status === 'active') || deployments[0];

  return (
    <div id="deployment-history-container" className="space-y-6">
      {/* Top Banner & Overview Card */}
      <div className="p-5 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-200 dark:border-purple-900/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-600/20">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'bn' ? 'ডিপ্লয়মেন্ট হিস্ট্রি ও ভার্সন কন্ট্রোল' : 'Deployment History & Versions'}
              </h3>
              {activeDeployment && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {lang === 'bn' ? `বর্তমান: ${activeDeployment.version}` : `Current: ${activeDeployment.version}`}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {lang === 'bn' 
                ? `বট "${botName || 'Selected Bot'}" এর অতীতের সকল ডিপ্লয়মেন্ট টাইমস্ট্যাম্প, রিলিজ নোট ও ভার্সন লগ`
                : `Past deployment timestamps, release notes, and version logs for ${botName || 'selected bot'}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
          <button
            type="button"
            id="btn-refresh-deployments"
            onClick={fetchDeployments}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title={lang === 'bn' ? 'রিফ্রেশ করুন' : 'Refresh list'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>

          <button
            type="button"
            id="btn-open-deploy-modal"
            onClick={() => setShowDeployModal(true)}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
          >
            <Rocket className="w-4 h-4" />
            <span>{lang === 'bn' ? 'নতুন ভার্সন ডিপ্লয় করুন' : 'Deploy New Version'}</span>
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {deploySuccessMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{deploySuccessMessage}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-800 dark:text-rose-200 flex items-center gap-2.5 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Trigger Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 dark:bg-[#161f30] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="input-search-deployments"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'bn' ? 'ভার্সন, রিলিজ নোট বা ইউজার খুঁজুন...' : 'Search by version, release notes or user...'}
            className="w-full pl-8.5 pr-3 py-1.5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            id="select-filter-trigger"
            value={filterTrigger}
            onChange={(e) => setFilterTrigger(e.target.value)}
            className="px-2.5 py-1.5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
          >
            <option value="all">{lang === 'bn' ? 'সকল সোর্স (All Triggers)' : 'All Sources'}</option>
            <option value="initial_deploy">{lang === 'bn' ? 'প্রথম ডিপ্লয় (Initial)' : 'Initial Deploy'}</option>
            <option value="code_update">{lang === 'bn' ? 'কোড এডিটর (Code Update)' : 'Code Update'}</option>
            <option value="safe_update">{lang === 'bn' ? 'সেফ ডাটাবেজ (Safe Update)' : 'Safe Update'}</option>
            <option value="zip_upload">{lang === 'bn' ? 'জিপ আর্কাইভ (ZIP)' : 'ZIP Deploy'}</option>
            <option value="manual_deploy">{lang === 'bn' ? 'ম্যানুয়াল রিলিজ (Manual)' : 'Manual Release'}</option>
          </select>
          <span className="text-slate-500 font-medium px-1">
            {filteredDeployments.length} {lang === 'bn' ? 'টি' : 'records'}
          </span>
        </div>
      </div>

      {/* Deployment Timeline List */}
      <div className="space-y-3">
        {loading && deployments.length === 0 ? (
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-3">
            <RefreshCw className="w-7 h-7 text-purple-600 animate-spin" />
            <p className="text-xs text-slate-500">
              {lang === 'bn' ? 'ডিপ্লয়মেন্ট হিস্ট্রি লোড হচ্ছে...' : 'Loading deployment history...'}
            </p>
          </div>
        ) : filteredDeployments.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#161f30]/40">
            <History className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {lang === 'bn' ? 'কোনো ডিপ্লয়মেন্ট পাওয়া যায়নি' : 'No Deployments Found'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery || filterTrigger !== 'all'
                ? (lang === 'bn' ? 'আপনার অনুসন্ধানের ফিল্টারের সাথে কোনো রেকর্ড মেলেনি।' : 'No records match your search or trigger filter.')
                : (lang === 'bn' ? 'এই বটের জন্য এখনো কোনো ভার্সন ডিপ্লয় রেকর্ড তৈরি হয়নি।' : 'No deployment records have been recorded for this bot yet.')}
            </p>
            <button
              type="button"
              onClick={() => setShowDeployModal(true)}
              className="mt-4 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'প্রথম ভার্সন ডিপ্লয় করুন' : 'Deploy First Version'}</span>
            </button>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 sm:ml-6 pl-5 sm:pl-7 space-y-4">
            {filteredDeployments.map((dep, index) => {
              const triggerMeta = getTriggerMeta(dep.trigger);
              const TriggerIcon = triggerMeta.icon;
              const isActive = dep.status === 'active' || (index === 0 && !deployments.some(d => d.status === 'active'));

              return (
                <div
                  key={dep.id}
                  id={`deployment-item-${dep.id}`}
                  className={`relative p-4 sm:p-5 rounded-2xl border transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-50/50 dark:from-purple-950/20 to-white dark:to-[#161f30] border-purple-300 dark:border-purple-800/80 shadow-sm'
                      : 'bg-white dark:bg-[#161f30] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Timeline Bullet Node */}
                  <div
                    className={`absolute -left-[27px] sm:-left-[35px] top-5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isActive
                        ? 'bg-purple-600 border-white dark:border-[#111827] ring-4 ring-purple-100 dark:ring-purple-950/80'
                        : 'bg-slate-300 dark:bg-slate-700 border-white dark:border-[#111827]'
                    }`}
                  />

                  {/* Header Row: Version Tag, Badges, and Timestamp */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800/60 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-white">
                          {dep.version}
                        </span>
                      </div>

                      {isActive ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{lang === 'bn' ? 'সক্রিয় ভার্সন' : 'Active Target'}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          {lang === 'bn' ? 'অতীত ভার্সন' : 'Previous'}
                        </span>
                      )}

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border flex items-center gap-1 ${triggerMeta.color}`}>
                        <TriggerIcon className="w-2.5 h-2.5" />
                        <span>{lang === 'bn' ? triggerMeta.labelBn : triggerMeta.labelEn}</span>
                      </span>
                    </div>

                    {/* Timestamp Section */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <div className="flex items-center gap-1.5" title={formatExactDate(dep.timestamp)}>
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">{formatExactDate(dep.timestamp)}</span>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {formatRelativeTime(dep.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Release Note / Description */}
                  <div className="mt-3">
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                      {dep.description || (lang === 'bn' ? 'কোনো রিলিজ নোট প্রদান করা হয়নি।' : 'No release notes provided for this deployment.')}
                    </p>
                  </div>

                  {/* Footer Meta Chips & Action Controls */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 flex-wrap text-slate-500 dark:text-slate-400 text-[11px]">
                      {dep.deployedBy && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{lang === 'bn' ? 'ডিপ্লয় করেছেন:' : 'By:'} <strong className="text-slate-700 dark:text-slate-300">{dep.deployedBy}</strong></span>
                        </div>
                      )}
                      {dep.entryFile && (
                        <div className="flex items-center gap-1">
                          <FileCode className="w-3 h-3 text-slate-400" />
                          <span className="font-mono text-slate-600 dark:text-slate-300">{dep.entryFile}</span>
                        </div>
                      )}
                      {typeof dep.filesCount === 'number' && (
                        <div className="flex items-center gap-1">
                          <FolderArchive className="w-3 h-3 text-slate-400" />
                          <span>{dep.filesCount} {lang === 'bn' ? 'টি ফাইল' : 'files'}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`${dep.version} - ${dep.timestamp}`, dep.id)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
                        title={lang === 'bn' ? 'ভার্সন ও টাইমস্ট্যাম্প কপি করুন' : 'Copy version & timestamp'}
                      >
                        {copiedId === dep.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => handleActivateDeployment(dep.id, dep.version)}
                          disabled={activatingId === dep.id}
                          className="px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800/80 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                          title={lang === 'bn' ? 'এই ভার্সনটি সক্রিয় টার্গেট হিসেবে সেট করুন' : 'Set this deployment as active target'}
                        >
                          {activatingId === dep.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3" />
                          )}
                          <span>{lang === 'bn' ? 'টার্গেট সক্রিয় করুন' : 'Set Active'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deploy New Version Modal Dialog */}
      {showDeployModal && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Rocket className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === 'bn' ? 'নতুন ভার্সন ডিপ্লয় করুন' : 'Deploy New Version'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {botName || botId}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDeployModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTriggerDeploy} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'ভার্সন ট্যাগ (Version Tag)' : 'Version Tag'}
                </label>
                <div className="relative">
                  <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    placeholder="e.g. v1.2.0"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#161f30] border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {lang === 'bn' ? 'সেমান্টিক ভার্সনিং যেমন: v1.0.1, v1.1.0' : 'Semantic version e.g. v1.0.1, v1.1.0'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'রিলিজ নোট / বিবরণ (Release Notes)' : 'Release Notes / Description'}
                </label>
                <textarea
                  rows={3}
                  value={releaseNote}
                  onChange={(e) => setReleaseNote(e.target.value)}
                  placeholder={lang === 'bn' ? 'এই ভার্সনে কী কী পরিবর্তন বা নতুন ফিচার যুক্ত হলো লিখুন...' : 'Summary of improvements, bug fixes or changes in this deployment...'}
                  className="w-full p-3 bg-slate-50 dark:bg-[#161f30] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 rounded-xl flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                    {lang === 'bn' ? 'বট প্রসেস রিস্টার্ট' : 'Restart Bot Process'}
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {lang === 'bn' ? 'ডিপ্লয় করার সাথে সাথে বট স্বয়ংক্রিয়ভাবে রিস্টার্ট হবে' : 'Immediately restart bot to apply active deployment changes'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={restartBot}
                  onChange={(e) => setRestartBot(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded cursor-pointer accent-purple-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeployModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={deploying || !newVersion.trim()}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-purple-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {deploying ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{lang === 'bn' ? 'ডিপ্লয় হচ্ছে...' : 'Deploying...'}</span>
                    </>
                  ) : (
                    <>
                      <Rocket className="w-3.5 h-3.5" />
                      <span>{lang === 'bn' ? 'এখনই ডিপ্লয় করুন' : 'Deploy Version'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
