import React, { useState, useEffect } from 'react';
import {
  Share2,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  ExternalLink,
  DollarSign,
  Users,
  Clock,
  Sparkles,
  RefreshCw,
  X,
  Send,
  Youtube,
  Facebook,
  Instagram,
  Twitter,
  Globe,
  MessageSquare,
  Video,
  Award,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  TrendingUp,
  FileText,
  Eye,
  Check,
  AlertCircle
} from 'lucide-react';
import { SocialTask, SocialPlatform, TaskCompletionLog } from '../../types';

interface AdminSocialTasksManagerProps {
  lang?: 'en' | 'bn';
}

const PLATFORM_OPTIONS: { id: SocialPlatform; name: string; nameBn: string; color: string; bg: string; icon: any }[] = [
  { id: 'telegram', name: 'Telegram', nameBn: 'টেলিগ্রাম', color: 'text-sky-400', bg: 'bg-sky-500/15 border-sky-500/30', icon: Send },
  { id: 'youtube', name: 'YouTube', nameBn: 'ইউটিউব', color: 'text-red-500', bg: 'bg-red-500/15 border-red-500/30', icon: Youtube },
  { id: 'facebook', name: 'Facebook', nameBn: 'ফেসবুক', color: 'text-blue-500', bg: 'bg-blue-500/15 border-blue-500/30', icon: Facebook },
  { id: 'instagram', name: 'Instagram', nameBn: 'ইনস্টাগ্রাম', color: 'text-pink-500', bg: 'bg-pink-500/15 border-pink-500/30', icon: Instagram },
  { id: 'twitter', name: 'X (Twitter)', nameBn: 'এক্স (টুইটার)', color: 'text-slate-300', bg: 'bg-slate-500/15 border-slate-500/30', icon: Twitter },
  { id: 'tiktok', name: 'TikTok', nameBn: 'টিকটক', color: 'text-cyan-400', bg: 'bg-cyan-500/15 border-cyan-500/30', icon: Video },
  { id: 'website', name: 'Website Visit', nameBn: 'ওয়েবসাইট ভিজিট', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', icon: Globe },
  { id: 'discord', name: 'Discord', nameBn: 'ডিসকর্ড', color: 'text-indigo-400', bg: 'bg-indigo-500/15 border-indigo-500/30', icon: MessageSquare },
  { id: 'custom', name: 'Custom Task', nameBn: 'কাস্টম টাস্ক', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30', icon: Sparkles }
];

export const AdminSocialTasksManager: React.FC<AdminSocialTasksManagerProps> = ({ lang = 'bn' }) => {
  const [tasks, setTasks] = useState<SocialTask[]>([]);
  const [stats, setStats] = useState({
    totalTasks: 0,
    activeTasks: 0,
    totalCompletions: 0,
    totalDistributedUsd: 0
  });
  const [submissions, setSubmissions] = useState<TaskCompletionLog[]>([]);
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [viewScreenshotUrl, setViewScreenshotUrl] = useState<string | null>(null);
  const [rejectingSub, setRejectingSub] = useState<TaskCompletionLog | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [processingSubId, setProcessingSubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'submissions'>('tasks');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<SocialTask>>({
    platform: 'telegram',
    title: '',
    titleBn: '',
    description: '',
    descriptionBn: '',
    link: '',
    rewardUsd: 0.05,
    badgeText: 'HOT',
    timerSeconds: 8,
    enabled: true,
    order: 1
  });

  useEffect(() => {
    fetchTasks();
    fetchSubmissions();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/admin/social-tasks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTasks(data.tasks || []);
        if (data.stats) setStats(data.stats);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/admin/social-tasks/submissions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubmissions(data.logs || []);
      }
    } catch {}
  };

  const handleApproveSubmission = async (submissionId: string) => {
    try {
      setProcessingSubId(submissionId);
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch(`/api/admin/social-tasks/submissions/${submissionId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: 'success', text: data.message || 'টাস্ক সফলভাবে অ্যাপ্রুভ হয়েছে!' });
        fetchSubmissions();
        fetchTasks();
      } else {
        setNotification({ type: 'error', text: data.error || 'অ্যাপ্রুভ করতে সমস্যা হয়েছে।' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'নেটওয়ার্ক এরর' });
    } finally {
      setProcessingSubId(null);
    }
  };

  const handleRejectSubmission = async () => {
    if (!rejectingSub) return;
    try {
      setProcessingSubId(rejectingSub.id);
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch(`/api/admin/social-tasks/submissions/${rejectingSub.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: rejectReasonInput.trim() || 'প্রদত্ত স্ক্রিনশট প্রমাণ সঠিক নয়' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: 'success', text: 'টাস্কটি বাতিল (Rejected) করা হয়েছে।' });
        setRejectingSub(null);
        setRejectReasonInput('');
        fetchSubmissions();
      } else {
        setNotification({ type: 'error', text: data.error || 'বাতিল করতে সমস্যা হয়েছে।' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'নেটওয়ার্ক এরর' });
    } finally {
      setProcessingSubId(null);
    }
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({
      platform: 'telegram',
      title: '',
      titleBn: '',
      description: '',
      descriptionBn: '',
      link: '',
      rewardUsd: 0.05,
      badgeText: 'HOT',
      timerSeconds: 8,
      enabled: true,
      order: tasks.length + 1
    });
    setShowModal(true);
  };

  const handleOpenEdit = (task: SocialTask) => {
    setIsEditing(true);
    setFormData({ ...task });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.link) {
      setNotification({ type: 'error', text: 'টাস্ক শিরোনাম ও লিংক দেওয়া আবশ্যক!' });
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/admin/social-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({
          type: 'success',
          text: isEditing ? 'টাস্ক সফলভাবে আপডেট হয়েছে!' : 'নতুন সোশ্যাল টাস্ক যোগ করা হয়েছে এবং ফায়ারবেজে সেভ হয়েছে!'
        });
        setShowModal(false);
        fetchTasks();
        setTimeout(() => setNotification(null), 3500);
      } else {
        setNotification({ type: 'error', text: data.error || 'টাস্ক সেভ করতে সমস্যা হয়েছে।' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'নেটওয়ার্ক এরর' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই টাস্কটি মুছে ফেলতে চান?')) return;
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch(`/api/admin/social-tasks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotification({ type: 'success', text: 'টাস্ক সফলভাবে ডিলিট করা হয়েছে।' });
        fetchTasks();
        setTimeout(() => setNotification(null), 3000);
      }
    } catch {}
  };

  const handleToggleStatus = async (task: SocialTask) => {
    try {
      const token = localStorage.getItem('bot_auth_token');
      const updated = { ...task, enabled: !task.enabled };
      const res = await fetch('/api/admin/social-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch {}
  };

  const getPlatformMeta = (plat: SocialPlatform) => {
    return PLATFORM_OPTIONS.find((p) => p.id === plat) || PLATFORM_OPTIONS[0];
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-white">
                {lang === 'bn' ? 'সোশ্যাল টাস্ক আর্ন ম্যানেজার' : 'Social Tasks & Rewards Manager'}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                🔥 ফায়ারবেজ ক্লাউড সিঙ্ক
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {lang === 'bn'
                ? 'টেলিগ্রাম, ইউটিউব, ফেসবুক ও ইনস্টাগ্রাম টাস্ক যোগ করুন এবং প্রতি টাস্কে কত ডলার পাবে নির্ধারণ করুন'
                : 'Add social media tasks & set reward amounts in USD for user wallet earnings'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={fetchTasks}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition-colors"
            title="রিফ্রেশ"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-purple-500/25 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'bn' ? '+ নতুন টাস্ক যোগ করুন' : '+ Add New Task'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-md ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification.text}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#0c1220] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">{lang === 'bn' ? 'সক্রিয় টাস্ক' : 'Active Tasks'}</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-black text-white">{stats.activeTasks} / {stats.totalTasks}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0c1220] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">{lang === 'bn' ? 'মোট সম্পন্ন' : 'Completions'}</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-black text-white">{stats.totalCompletions} বার</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0c1220] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">{lang === 'bn' ? 'মোট বিতরণকৃত USD' : 'Total Rewarded'}</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400">${stats.totalDistributedUsd.toFixed(2)} USD</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0c1220] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">{lang === 'bn' ? 'সিঙ্ক স্ট্যাটাস' : 'Persistence'}</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xs font-black text-amber-300">Firebase Firestore</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'tasks' ? 'bg-purple-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{lang === 'bn' ? 'টাস্কসমূহ' : 'Tasks List'} ({tasks.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('submissions');
            fetchSubmissions();
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'submissions' ? 'bg-purple-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{lang === 'bn' ? 'কমপ্লিশন হিস্ট্রি' : 'Recent Claims'} ({submissions.length})</span>
        </button>
      </div>

      {/* TAB 1: Tasks List */}
      {activeTab === 'tasks' && (
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#080d19] border border-slate-800 text-slate-400">
              <Share2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold">কোনো সোশ্যাল টাস্ক যোগ করা নেই</p>
              <button
                onClick={handleOpenAdd}
                className="mt-3 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold cursor-pointer"
              >
                + প্রথম টাস্ক যোগ করুন
              </button>
            </div>
          ) : (
            tasks.map((task) => {
              const meta = getPlatformMeta(task.platform);
              const PlatformIcon = meta.icon;

              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    task.enabled
                      ? 'bg-[#0a0f1d] border-slate-800 hover:border-slate-700'
                      : 'bg-[#080c16]/60 border-slate-900 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${meta.bg} ${meta.color}`}>
                        <PlatformIcon className="w-6 h-6" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${meta.bg} ${meta.color}`}>
                            {meta.name}
                          </span>
                          {task.badgeText && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/15 border border-amber-500/30 text-amber-300">
                              {task.badgeText}
                            </span>
                          )}
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                            +${task.rewardUsd.toFixed(2)} USD
                          </span>
                        </div>

                        <h4 className="text-sm font-black text-white">{task.titleBn || task.title}</h4>
                        {task.descriptionBn && (
                          <p className="text-xs text-slate-400 max-w-xl">{task.descriptionBn}</p>
                        )}

                        <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
                          <a
                            href={task.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-400 hover:underline flex items-center gap-1 font-mono"
                          >
                            <span>{task.link}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>{task.timerSeconds || 8}s টাইমার</span>
                          </span>
                          <span>•</span>
                          <span className="text-emerald-400 font-bold">
                            {task.totalCompletions || 0} জন সম্পন্ন করেছে
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(task)}
                        className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                          task.enabled
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                        }`}
                        title={task.enabled ? 'টাস্ক বন্ধ করুন' : 'টাস্ক চালু করুন'}
                      >
                        {task.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        <span className="text-[11px]">{task.enabled ? 'সক্রিয়' : 'বন্ধ'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(task)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
                        title="এডিট করুন"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(task.id)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 cursor-pointer transition-colors"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: Submissions Log */}
      {activeTab === 'submissions' && (
        <div className="space-y-2">
          {submissions.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#080d19] border border-slate-800 text-slate-400">
              <p className="text-sm font-bold">এখনো কোনো ইউজার টাস্ক ক্লেইম করেনি।</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0c1322] text-slate-400 uppercase text-[10px] font-black border-b border-slate-800">
                  <tr>
                    <th className="p-3">ইউজার / নাম</th>
                    <th className="p-3">টাস্ক</th>
                    <th className="p-3">প্ল্যাটফর্ম</th>
                    <th className="p-3">রিওয়ার্ড</th>
                    <th className="p-3">তারিখ ও সময়</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-[#070b14]">
                  {submissions.map((sub) => {
                    const meta = getPlatformMeta(sub.platform);
                    return (
                      <tr key={sub.id} className="hover:bg-slate-900/50">
                        <td className="p-3">
                          <div className="font-bold text-white">{sub.userName || 'User'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{sub.userEmail || sub.userId}</div>
                        </td>
                        <td className="p-3 font-semibold text-slate-200">{sub.taskTitle}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${meta.bg} ${meta.color}`}>
                            {meta.name}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-black text-emerald-400">+${sub.rewardUsd.toFixed(2)} USD</span>
                        </td>
                        <td className="p-3 text-slate-400 text-[11px] font-mono">
                          {new Date(sub.completedAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ADD / EDIT TASK MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="max-w-xl w-full bg-[#0d1424] border border-purple-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <h4 className="text-base font-black text-white">
                  {isEditing ? 'সোশ্যাল টাস্ক এডিট করুন' : 'নতুন সোশ্যাল টাস্ক তৈরি করুন'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Platform Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  সোশ্যাল প্ল্যাটফর্ম নির্বাচন করুন *
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {PLATFORM_OPTIONS.map((plat) => {
                    const Icon = plat.icon;
                    const isSelected = formData.platform === plat.id;
                    return (
                      <button
                        key={plat.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, platform: plat.id })}
                        className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? `${plat.bg} ${plat.color} border-current ring-2 ring-purple-500/50 shadow-md font-black`
                            : 'bg-[#080d19] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[10px] truncate max-w-full">{plat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title Bangla & English */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    টাস্ক শিরোনাম (বাংলা) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.titleBn || ''}
                    onChange={(e) => setFormData({ ...formData, titleBn: e.target.value, title: formData.title || e.target.value })}
                    placeholder="যেমন: অফিসিয়াল টেলিগ্রাম চ্যানেলে জয়েন করুন"
                    className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Task Title (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Join Official Telegram Channel"
                    className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Target Link */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  সোশ্যাল মিডিয়া টার্গেট লিংক / URL *
                </label>
                <div className="relative">
                  <input
                    type="url"
                    required
                    value={formData.link || ''}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    placeholder="https://t.me/hostinglivefast বা https://youtube.com/@channel"
                    className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500 pr-10"
                  />
                  {formData.link && (
                    <a
                      href={formData.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-2.5 top-2.5 text-sky-400 hover:text-sky-300"
                      title="লিংক টেস্ট করুন"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Reward in USD ($) and Quick Select Buttons */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/30 to-purple-950/30 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span>ইউজার কত ডলার ($ USD) রিওয়ার্ড পাবে? *</span>
                  </label>
                  <span className="text-sm font-black text-emerald-400 font-mono">
                    ${Number(formData.rewardUsd || 0).toFixed(2)} USD
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.005"
                    min="0.001"
                    max="10"
                    required
                    value={formData.rewardUsd || ''}
                    onChange={(e) => setFormData({ ...formData, rewardUsd: parseFloat(e.target.value) || 0.01 })}
                    className="w-32 bg-[#070b14] border border-emerald-500/50 rounded-xl px-3 py-2 text-sm font-black text-emerald-400 focus:outline-none font-mono"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[0.02, 0.03, 0.05, 0.10, 0.20, 0.50].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setFormData({ ...formData, rewardUsd: amt })}
                        className={`px-2 py-1 rounded-lg text-[10px] font-black transition-colors cursor-pointer ${
                          formData.rewardUsd === amt
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  নির্দেশনা / বিবরণ (বাংলা)
                </label>
                <textarea
                  rows={2}
                  value={formData.descriptionBn || ''}
                  onChange={(e) => setFormData({ ...formData, descriptionBn: e.target.value })}
                  placeholder="যেমন: চ্যানেলে জয়েন করুন এবং ১০ সেকেন্ড অপেক্ষা করে ক্লেইম করুন।"
                  className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Extra Settings: Timer, Badge, Active */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ভেরিফিকেশন টাইমার (সেকেন্ড)
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="60"
                    value={formData.timerSeconds || 8}
                    onChange={(e) => setFormData({ ...formData, timerSeconds: parseInt(e.target.value, 10) || 8 })}
                    className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ব্যাজ টেক্সট (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.badgeText || ''}
                    onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                    placeholder="HOT / POPULAR / EASY"
                    className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    স্ট্যাটাস
                  </label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.enabled !== false}
                      onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-xs font-bold text-white">সক্রিয় রাখুন (Active)</span>
                  </label>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white text-xs font-black shadow-lg shadow-purple-500/25 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'সেভ হচ্ছে...' : isEditing ? 'আপডেট করুন' : 'টাস্ক প্রকাশ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
