import React, { useState, useEffect } from 'react';
import {
  Globe,
  ExternalLink,
  Trash2,
  Play,
  Square,
  RefreshCw,
  Search,
  HardDrive,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  User,
  FileCode
} from 'lucide-react';
import { HostedWebsite } from '../../types';

export const AdminWebsitesManager: React.FC<{ lang?: 'bn' | 'en' }> = ({ lang = 'bn' }) => {
  const [websites, setWebsites] = useState<HostedWebsite[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'stopped'>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchWebsites = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/admin/websites', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.websites) {
        setWebsites(data.websites);
      }
    } catch {
      setMessage({
        type: 'error',
        text: lang === 'bn' ? 'ওয়েবসাইট তালিকা লোড করতে ব্যর্থ' : 'Failed to load websites list'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsites();
  }, []);

  const handleToggleStatus = async (site: HostedWebsite) => {
    const nextStatus = site.status === 'online' ? 'stopped' : 'online';
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch(`/api/admin/websites/${site.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      setMessage({
        type: 'success',
        text: `${site.name} ${nextStatus === 'online' ? 'সক্রিয় করা হয়েছে' : 'স্থগিত করা হয়েছে'}`
      });
      fetchWebsites();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Status update failed' });
    }
  };

  const handleDelete = async (site: HostedWebsite) => {
    const confirmPrompt =
      lang === 'bn'
        ? `আপনি কি নিশ্চিতভাবে '${site.name}' (${site.slug}) ওয়েবসাইট এবং এর সমস্ত ফাইল স্থায়ীভাবে ডিলিট করতে চান?`
        : `Are you sure you want to permanently delete '${site.name}' (${site.slug}) and all its uploaded files?`;
    if (!window.confirm(confirmPrompt)) return;

    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch(`/api/admin/websites/${site.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      setMessage({
        type: 'success',
        text: lang === 'bn' ? `'${site.name}' স্থায়ীভাবে ডিলিট হয়েছে` : `'${site.name}' permanently deleted`
      });
      fetchWebsites();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Delete failed' });
    }
  };

  const filtered = websites.filter((site) => {
    const matchesSearch =
      site.name.toLowerCase().includes(search.toLowerCase()) ||
      site.slug.toLowerCase().includes(search.toLowerCase()) ||
      site.userId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ? true : statusFilter === 'online' ? site.status === 'online' : site.status !== 'online';
    return matchesSearch && matchesStatus;
  });

  const totalStorageMb = (
    websites.reduce((acc, curr) => acc + (curr.storageBytes || 0), 0) /
    (1024 * 1024)
  ).toFixed(2);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Banner and Summary Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0b1322] border border-[#1a2942]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>{lang === 'bn' ? 'হোস্টেড ওয়েবসাইট অ্যাডমিন ম্যানেজমেন্ট' : 'Hosted Websites Management'}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {websites.length} Sites
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'bn'
                ? 'ইউজারদের ডিপ্লয় করা সকল স্ট্যাটিক HTML ওয়েবসাইট মনিটরিং, স্টোরেজ ব্যবহার ও নিয়ন্ত্রণ।'
                : 'Monitor all deployed static HTML websites, inspect storage metrics, suspend or delete sites.'}
            </p>
          </div>
        </div>

        <button
          onClick={fetchWebsites}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-[#142036] hover:bg-[#1b2b48] border border-[#223554] text-xs font-semibold text-slate-300 flex items-center gap-2 cursor-pointer transition shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{lang === 'bn' ? 'রিফ্রেশ' : 'Refresh'}</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0a101d] border border-[#17253d]">
          <p className="text-[11px] text-slate-400 font-medium">
            {lang === 'bn' ? 'মোট ওয়েবসাইট' : 'Total Sites'}
          </p>
          <p className="text-lg font-black text-white mt-1">{websites.length}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0a101d] border border-[#17253d]">
          <p className="text-[11px] text-slate-400 font-medium">
            {lang === 'bn' ? 'সক্রিয় লাইভ' : 'Active Live'}
          </p>
          <p className="text-lg font-black text-emerald-400 mt-1">
            {websites.filter((s) => s.status === 'online').length}
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0a101d] border border-[#17253d]">
          <p className="text-[11px] text-slate-400 font-medium">
            {lang === 'bn' ? 'স্থগিত / বন্ধ' : 'Suspended / Stopped'}
          </p>
          <p className="text-lg font-black text-amber-400 mt-1">
            {websites.filter((s) => s.status !== 'online').length}
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0a101d] border border-[#17253d]">
          <p className="text-[11px] text-slate-400 font-medium">
            {lang === 'bn' ? 'মোট স্টোরেজ খরচ' : 'Total Storage'}
          </p>
          <p className="text-lg font-black text-cyan-400 mt-1">{totalStorageMb} MB</p>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-3 border ${
            message.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              lang === 'bn'
                ? 'নাম, স্লাগ বা ইউজার আইডি দিয়ে খুঁজুন...'
                : 'Search by site name, slug, or user ID...'
            }
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0a101d] border border-[#182740] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0a101d] border border-[#182740] shrink-0">
          {(['all', 'online', 'stopped'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                statusFilter === filter
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {filter === 'all'
                ? lang === 'bn' ? 'সকল' : 'All'
                : filter === 'online'
                ? lang === 'bn' ? 'সক্রিয়' : 'Active'
                : lang === 'bn' ? 'স্থগিত' : 'Suspended'}
            </button>
          ))}
        </div>
      </div>

      {/* Website Table / Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-[#080d17] border border-[#16253d]">
            <Globe className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">
              {lang === 'bn' ? 'কোনো ওয়েবসাইট পাওয়া যায়নি' : 'No hosted websites found'}
            </p>
          </div>
        ) : (
          filtered.map((site) => {
            const sizeMb = ((site.storageBytes || 0) / (1024 * 1024)).toFixed(2);
            const liveUrl = site.liveUrl || `/site/${site.slug}/`;

            return (
              <div
                key={site.id}
                className="p-4 sm:p-5 rounded-2xl bg-[#0a101d] border border-[#182740] hover:border-cyan-500/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        site.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                      }`}
                    />
                    <h4 className="text-sm font-bold text-white truncate">{site.name}</h4>
                    <span className="px-2 py-0.5 rounded-md bg-[#131f34] text-[11px] font-mono text-cyan-300 border border-[#233758]">
                      /{site.slug}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        site.status === 'online'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {site.status === 'online'
                        ? lang === 'bn' ? 'অনলাইন লাইভ' : 'Online'
                        : lang === 'bn' ? 'স্থগিত (Suspended)' : 'Suspended'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1 font-mono">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>UID: {site.userId.slice(0, 14)}...</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                      <span>{sizeMb} MB</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {new Date(site.updatedAt || site.createdAt).toLocaleDateString()}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-xl bg-[#121c2e] hover:bg-[#1a2842] border border-[#233554] text-xs font-semibold text-cyan-300 flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'ভিজিট' : 'Visit'}</span>
                  </a>

                  <button
                    onClick={() => handleToggleStatus(site)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition border ${
                      site.status === 'online'
                        ? 'bg-amber-950/40 hover:bg-amber-900/60 border-amber-500/40 text-amber-300'
                        : 'bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-500/40 text-emerald-300'
                    }`}
                  >
                    {site.status === 'online' ? (
                      <>
                        <Square className="w-3.5 h-3.5" />
                        <span>{lang === 'bn' ? 'স্থগিত করুন' : 'Suspend'}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>{lang === 'bn' ? 'চালু করুন' : 'Resume'}</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDelete(site)}
                    className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-400 cursor-pointer transition"
                    title={lang === 'bn' ? 'ডিলিট করুন' : 'Delete website'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
