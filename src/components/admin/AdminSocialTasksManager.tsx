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
import { db, collection, onSnapshot, getDocs, doc, updateDoc, setDoc, deleteDoc } from '../../lib/firebase';
import { playDepositSuccessSound } from '../../utils/audioAlert';

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
  const [rewardInput, setRewardInput] = useState<string>('0.05');
  const [timerInput, setTimerInput] = useState<string>('8');
  const [orderInput, setOrderInput] = useState<string>('1');
  const [taskToDelete, setTaskToDelete] = useState<SocialTask | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

    // Real-time Firestore live listener for instant tasks updates (adds/deletions)
    const unsubTasks = onSnapshot(collection(db, 'social_tasks'), (snapshot) => {
      if (!snapshot.empty) {
        const cloudTasks: SocialTask[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as SocialTask;
          if (item && item.id) cloudTasks.push(item);
        });
        if (cloudTasks.length > 0) {
          cloudTasks.sort((a, b) => (a.order || 0) - (b.order || 0));
          setTasks(cloudTasks);
          setStats((prev) => ({
            ...prev,
            totalTasks: cloudTasks.length,
            activeTasks: cloudTasks.filter((t) => t.enabled !== false).length
          }));
        }
      }
    }, () => {});

    // Real-time Firestore live listener for instant task submission updates
    const unsubSubs = onSnapshot(collection(db, 'task_completions'), (snapshot) => {
      if (!snapshot.empty) {
        setSubmissions((prev) => {
          const map = new Map<string, TaskCompletionLog>();
          prev.forEach((s) => { if (s && s.id) map.set(s.id, s); });
          snapshot.forEach((d) => {
            const data = d.data() as TaskCompletionLog;
            if (data && data.id) map.set(data.id, { ...map.get(data.id), ...data });
          });
          const list = Array.from(map.values());
          list.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
          return list;
        });
      }
    }, () => {});

    return () => {
      unsubTasks();
      unsubSubs();
    };
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('bot_auth_token');
      const authUserStr = localStorage.getItem('bot_auth_user');
      let adminEmail = '';
      try {
        if (authUserStr) adminEmail = JSON.parse(authUserStr)?.email || '';
      } catch {}

      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      if (adminEmail) headers['x-admin-email'] = adminEmail;

      const res = await fetch('/api/admin/social-tasks', { headers });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setTasks(data.tasks || []);
        if (data.stats) setStats(data.stats);
      } else {
        // Fallback to direct Firestore read
        try {
          const snap = await getDocs(collection(db, 'social_tasks'));
          if (!snap.empty) {
            const cloudTasks: SocialTask[] = [];
            snap.forEach((d) => {
              const item = d.data() as SocialTask;
              if (item && item.id) cloudTasks.push(item);
            });
            cloudTasks.sort((a, b) => (a.order || 0) - (b.order || 0));
            setTasks(cloudTasks);
          }
        } catch {}
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
      let combined: TaskCompletionLog[] = [];
      if (res.ok && data.success) {
        combined = data.logs || [];
      }

      // Also read Firestore client-side
      try {
        const snap = await getDocs(collection(db, 'task_completions'));
        if (!snap.empty) {
          const map = new Map<string, TaskCompletionLog>();
          combined.forEach((s) => { if (s && s.id) map.set(s.id, s); });
          snap.forEach((d) => {
            const item = d.data() as TaskCompletionLog;
            if (item && item.id) map.set(item.id, { ...map.get(item.id), ...item });
          });
          combined = Array.from(map.values());
          combined.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
        }
      } catch {}

      setSubmissions(combined);
    } catch {}
  };

  const handleApproveSubmission = async (submissionId: string) => {
    try {
      setProcessingSubId(submissionId);
      // Optimistic Firestore direct update
      try {
        await updateDoc(doc(db, 'task_completions', submissionId), {
          status: 'approved',
          completedAt: new Date().toISOString(),
          reviewedAt: new Date().toISOString(),
          reviewedBy: 'Admin'
        });
      } catch {}

      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch(`/api/admin/social-tasks/submissions/${submissionId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        playDepositSuccessSound();
        setNotification({ type: 'success', text: data.message || 'টাস্ক সফলভাবে অ্যাপ্রুভ হয়েছে এবং ওয়ালেটে ডলার যুক্ত হয়েছে!' });
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
    const reason = rejectReasonInput.trim() || 'প্রদত্ত স্ক্রিনশট প্রমাণ সঠিক নয়';
    try {
      setProcessingSubId(rejectingSub.id);
      // Optimistic Firestore direct update
      try {
        await updateDoc(doc(db, 'task_completions', rejectingSub.id), {
          status: 'rejected',
          reviewedAt: new Date().toISOString(),
          reviewedBy: 'Admin',
          rejectReason: reason
        });
      } catch {}

      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch(`/api/admin/social-tasks/submissions/${rejectingSub.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
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
      id: undefined,
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
    setRewardInput('0.05');
    setTimerInput('8');
    setOrderInput(String(tasks.length + 1));
    setShowModal(true);
  };

  const handleOpenEdit = (task: SocialTask) => {
    setIsEditing(true);
    setFormData({ ...task });
    setRewardInput(task.rewardUsd !== undefined ? String(task.rewardUsd) : '0.05');
    setTimerInput(task.timerSeconds !== undefined ? String(task.timerSeconds) : '8');
    setOrderInput(task.order !== undefined ? String(task.order) : '1');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitleBn = (formData.titleBn || formData.title || '').trim();
    const finalTitle = (formData.title || formData.titleBn || '').trim();
    const finalLink = (formData.link || '').trim();

    if (!finalTitle || !finalLink) {
      setNotification({ type: 'error', text: 'টাস্ক শিরোনাম ও লিংক দেওয়া আবশ্যক! (Title & Link are required)' });
      return;
    }

    const parsedReward = parseFloat(rewardInput);
    if (isNaN(parsedReward) || parsedReward <= 0) {
      setNotification({ type: 'error', text: 'অনুগ্রহ করে সঠিক রিওয়ার্ড অ্যামাউন্ট ($ USD) লিখুন! (Please enter a valid reward amount)' });
      return;
    }

    const parsedTimer = parseInt(timerInput, 10);
    const finalTimer = isNaN(parsedTimer) || parsedTimer < 1 ? 8 : parsedTimer;
    const parsedOrder = parseInt(orderInput, 10) || (tasks.length + 1);

    const finalTaskId = isEditing && formData.id ? formData.id : (formData.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);

    const payload: SocialTask = {
      ...(formData as any),
      id: finalTaskId,
      title: finalTitle,
      titleBn: finalTitleBn,
      link: finalLink,
      rewardUsd: parsedReward,
      timerSeconds: finalTimer,
      order: parsedOrder,
      enabled: formData.enabled !== false,
      totalCompletions: formData.totalCompletions || 0,
      createdAt: formData.createdAt || new Date().toISOString()
    };

    try {
      setSubmitting(true);
      // Direct Firestore write attempt for instant cloud persistence
      try {
        await setDoc(doc(db, 'social_tasks', finalTaskId), {
          ...payload,
          updatedAt: new Date().toISOString()
        });
      } catch {}

      const token = localStorage.getItem('bot_auth_token');
      const authUserStr = localStorage.getItem('bot_auth_user');
      let adminEmail = '';
      try {
        if (authUserStr) adminEmail = JSON.parse(authUserStr)?.email || '';
      } catch {}

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };
      if (adminEmail) headers['x-admin-email'] = adminEmail;

      const res = await fetch('/api/admin/social-tasks', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setNotification({
          type: 'success',
          text: isEditing ? '✓ টাস্ক সফলভাবে আপডেট হয়েছে!' : '✓ নতুন সোশ্যাল টাস্ক যোগ করা হয়েছে এবং ফায়ারবেজে সেভ হয়েছে!'
        });
        setShowModal(false);
        // Optimistically update list
        setTasks((prev) => {
          const idx = prev.findIndex((t) => t.id === finalTaskId);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = payload;
            return next;
          }
          return [...prev, payload];
        });
        fetchTasks();
        setTimeout(() => setNotification(null), 3500);
      } else {
        // Even if server failed, Firestore saved
        setNotification({
          type: 'success',
          text: '✓ টাস্ক ফায়ারবেজ ক্লাউডে সফলভাবে সেভ হয়েছে!'
        });
        setShowModal(false);
        setTasks((prev) => {
          const idx = prev.findIndex((t) => t.id === finalTaskId);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = payload;
            return next;
          }
          return [...prev, payload];
        });
        setTimeout(() => setNotification(null), 3500);
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'নেটওয়ার্ক এরর' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (task: SocialTask) => {
    setTaskToDelete(task);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    const deletedTask = taskToDelete;
    const deletedId = deletedTask.id;
    try {
      setIsDeleting(true);
      // 1. Direct Firestore deletion
      let firestoreDeleted = false;
      try {
        await deleteDoc(doc(db, 'social_tasks', deletedId));
        firestoreDeleted = true;
      } catch (e) {
        console.warn('Firestore direct delete warning:', e);
      }

      // 2. Server API deletion attempt (DELETE + POST fallback)
      const token = localStorage.getItem('bot_auth_token');
      const authUserStr = localStorage.getItem('bot_auth_user');
      let adminEmail = '';
      try {
        if (authUserStr) adminEmail = JSON.parse(authUserStr)?.email || '';
      } catch {}

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      if (adminEmail) headers['x-admin-email'] = adminEmail;

      let res = await fetch(`/api/admin/social-tasks/${deletedId}`, {
        method: 'DELETE',
        headers
      }).catch(() => null);

      if (!res || !res.ok) {
        // Fallback POST deletion
        res = await fetch(`/api/admin/social-tasks/${deletedId}/delete`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ id: deletedId })
        }).catch(() => null);
      }

      const serverOk = Boolean(res && res.ok);

      if (serverOk || firestoreDeleted) {
        setNotification({
          type: 'success',
          text: `✓ টাস্ক "${deletedTask.titleBn || deletedTask.title}" সফলভাবে ডিলিট করা হয়েছে।`
        });
        setTaskToDelete(null);
        // Optimistically remove from local list
        setTasks((prev) => prev.filter((t) => t.id !== deletedId));
        fetchTasks();
        setTimeout(() => setNotification(null), 3500);
      } else {
        setNotification({ type: 'error', text: 'টাস্ক ডিলিট করতে সমস্যা হয়েছে।' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'নেটওয়ার্ক এরর' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (task: SocialTask) => {
    try {
      const updatedStatus = task.enabled === false;
      const updatedTask = { ...task, enabled: updatedStatus };
      // Direct Firestore update
      try {
        await setDoc(doc(db, 'social_tasks', task.id), {
          ...updatedTask,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch {}

      const token = localStorage.getItem('bot_auth_token');
      const authUserStr = localStorage.getItem('bot_auth_user');
      let adminEmail = '';
      try {
        if (authUserStr) adminEmail = JSON.parse(authUserStr)?.email || '';
      } catch {}

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };
      if (adminEmail) headers['x-admin-email'] = adminEmail;

      await fetch('/api/admin/social-tasks', {
        method: 'POST',
        headers,
        body: JSON.stringify(updatedTask)
      }).catch(() => null);

      setTasks((prev) => prev.map((t) => t.id === task.id ? updatedTask : t));
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
      {(() => {
        const pendingCount = submissions.filter((s) => s.status === 'pending').length;
        const approvedCount = submissions.filter((s) => s.status === 'approved').length;
        const rejectedCount = submissions.filter((s) => s.status === 'rejected').length;

        const filteredSubmissions = submissions.filter((s) => {
          if (submissionFilter === 'all') return true;
          return s.status === submissionFilter;
        });

        return (
          <>
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'tasks'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white bg-[#0a0f1d] border border-slate-800'
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'টাস্কসমূহ' : 'Tasks List'} ({tasks.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('submissions');
                  fetchSubmissions();
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'submissions'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white bg-[#0a0f1d] border border-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'ইউজার সাবমিশন ও প্রুফ যাচাই' : 'User Submissions & Proofs'}</span>
                {pendingCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                    {pendingCount} {lang === 'bn' ? 'অপেক্ষমান' : 'pending'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                    {submissions.length}
                  </span>
                )}
              </button>
            </div>

            {/* Pending Alert Banner when on Tasks tab */}
            {pendingCount > 0 && activeTab === 'tasks' && (
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0 animate-spin" />
                  <div>
                    <p className="text-xs font-bold text-white">
                      {lang === 'bn'
                        ? `🔔 ${pendingCount} টি নতুন সোশ্যাল টাস্ক প্রুফ অনুমোদনের জন্য অপেক্ষমান রয়েছে!`
                        : `🔔 ${pendingCount} task submissions waiting for review!`}
                    </p>
                    <p className="text-[11px] text-amber-300/80">
                      {lang === 'bn'
                        ? 'ইউজাররা স্ক্রিনশট জমা দিয়েছেন। সাবমিশন ট্যাবে গিয়ে প্রুফ দেখে অনুমোদন দিন।'
                        : 'Users submitted screenshot proofs. Please review and approve.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('submissions');
                    setSubmissionFilter('pending');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shrink-0 transition shadow-md"
                >
                  {lang === 'bn' ? 'প্রুফগুলো রিভিউ করুন →' : 'Review Submissions →'}
                </button>
              </div>
            )}

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
                              onClick={() => handleDelete(task)}
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
              <div className="space-y-4">
                {/* Submissions Filter Pills */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#080d19] p-2.5 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSubmissionFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        submissionFilter === 'all'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-[#0f172a] text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {lang === 'bn' ? 'সবগুলো' : 'All'} ({submissions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubmissionFilter('pending')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        submissionFilter === 'pending'
                          ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                          : 'bg-[#0f172a] text-amber-400 hover:text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{lang === 'bn' ? 'অপেক্ষমান' : 'Pending'}</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white">
                        {pendingCount}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubmissionFilter('approved')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        submissionFilter === 'approved'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-[#0f172a] text-emerald-400 hover:text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{lang === 'bn' ? 'অনুমোদিত' : 'Approved'}</span>
                      <span>({approvedCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubmissionFilter('rejected')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        submissionFilter === 'rejected'
                          ? 'bg-rose-600 text-white shadow-md'
                          : 'bg-[#0f172a] text-rose-400 hover:text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{lang === 'bn' ? 'বাতিলকৃত' : 'Rejected'}</span>
                      <span>({rejectedCount})</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={fetchSubmissions}
                    className="text-xs text-slate-400 hover:text-white font-bold flex items-center gap-1.5 cursor-pointer px-2.5 py-1.5 rounded-lg bg-slate-800"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'রিফ্রেশ' : 'Refresh'}</span>
                  </button>
                </div>

                {filteredSubmissions.length === 0 ? (
                  <div className="p-10 text-center rounded-3xl bg-[#080d19] border border-slate-800 space-y-2">
                    <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-sm font-bold text-slate-300">
                      {submissionFilter === 'pending'
                        ? (lang === 'bn' ? 'কোনো অপেক্ষমান টাস্ক প্রুফ নেই।' : 'No pending submissions.')
                        : (lang === 'bn' ? 'কোনো সাবমিশন রেকর্ড পাওয়া যায়নি।' : 'No submissions found.')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3.5">
                    {filteredSubmissions.map((sub) => {
                      const meta = getPlatformMeta(sub.platform);
                      const PlatformIcon = meta.icon;
                      const isProcessing = processingSubId === sub.id;

                      return (
                        <div
                          key={sub.id}
                          className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                            sub.status === 'pending'
                              ? 'bg-[#0c1426] border-amber-500/40 shadow-lg shadow-amber-500/5'
                              : sub.status === 'approved'
                              ? 'bg-[#080e1a] border-emerald-500/30'
                              : 'bg-[#080c16] border-slate-800/80 opacity-75'
                          }`}
                        >
                          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                            {/* Left: User & Task info */}
                            <div className="flex items-start gap-3.5 flex-1 min-w-0">
                              <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${meta.bg} ${meta.color}`}>
                                <PlatformIcon className="w-6 h-6" />
                              </div>

                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-sm text-white">{sub.userName || 'User'}</span>
                                  <span className="text-xs text-slate-400 font-mono">({sub.userEmail || sub.userId})</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${meta.bg} ${meta.color}`}>
                                    {meta.name}
                                  </span>
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                                    +${sub.rewardUsd.toFixed(2)} USD
                                  </span>
                                </div>

                                <h4 className="text-sm font-bold text-slate-200">{sub.taskTitle}</h4>

                                <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                                  <span>
                                    {lang === 'bn' ? 'জমা দেওয়া হয়েছে:' : 'Submitted:'}{' '}
                                    {new Date(sub.submittedAt || sub.completedAt || Date.now()).toLocaleDateString()}{' '}
                                    {new Date(sub.submittedAt || sub.completedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {sub.reviewedBy && (
                                    <span>• {lang === 'bn' ? 'পর্যালোচক:' : 'Reviewer:'} {sub.reviewedBy}</span>
                                  )}
                                </div>

                                {sub.proofNote && (
                                  <p className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg mt-1 inline-block">
                                    📝 <strong>{lang === 'bn' ? 'ইউজার নোট:' : 'User Note:'}</strong> {sub.proofNote}
                                  </p>
                                )}

                                {sub.status === 'rejected' && sub.rejectReason && (
                                  <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg mt-1 inline-block">
                                    ✕ <strong>{lang === 'bn' ? 'বাতিলের কারণ:' : 'Reason:'}</strong> {sub.rejectReason}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Right: Screenshot Preview & Actions */}
                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 self-end lg:self-center shrink-0 w-full sm:w-auto justify-end">
                              {/* Screenshot thumbnail button */}
                              {sub.screenshotUrl ? (
                                <button
                                  type="button"
                                  onClick={() => setViewScreenshotUrl(sub.screenshotUrl || null)}
                                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-700 shadow-sm"
                                  title="স্ক্রিনশট প্রমাণ বড় করে দেখুন"
                                >
                                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>{lang === 'bn' ? 'স্ক্রিনশট দেখুন' : 'View Proof'}</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-500 italic px-2">
                                  {lang === 'bn' ? 'স্ক্রিনশট নেই' : 'No screenshot'}
                                </span>
                              )}

                              {/* Status / Action Buttons */}
                              {sub.status === 'pending' ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={() => handleApproveSubmission(sub.id)}
                                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-500/20 disabled:opacity-50"
                                  >
                                    <Check className="w-4 h-4" />
                                    <span>{isProcessing ? 'অনুমোদন হচ্ছে...' : (lang === 'bn' ? 'অনুমোদন ও ক্রেডিট' : 'Approve & Credit')}</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={() => {
                                      setRejectingSub(sub);
                                      setRejectReasonInput('');
                                    }}
                                    className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                                  >
                                    <X className="w-4 h-4" />
                                    <span>{lang === 'bn' ? 'বাতিল' : 'Reject'}</span>
                                  </button>
                                </div>
                              ) : sub.status === 'approved' ? (
                                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  <span>{lang === 'bn' ? 'অনুমোদিত (ক্রেডিট সম্পন্ন)' : 'Approved'}</span>
                                </span>
                              ) : (
                                <span className="px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5">
                                  <X className="w-4 h-4 text-rose-400" />
                                  <span>{lang === 'bn' ? 'বাতিলকৃত' : 'Rejected'}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}

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
                    value={formData.titleBn || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        titleBn: val,
                        title: prev.title ? prev.title : val
                      }));
                    }}
                    placeholder="যেমন: অফিসিয়াল টেলিগ্রাম চ্যানেলে জয়েন করুন"
                    className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Task Title (English) <span className="text-slate-500 font-normal">(ঐচ্ছিক - খালি রাখলে বাংলা নাম ব্যবহার হবে)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, link: e.target.value }))}
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
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/30 to-purple-950/30 border border-emerald-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span>ইউজার কত ডলার ($ USD) রিওয়ার্ড পাবে? *</span>
                  </label>
                  <span className="text-sm font-black text-emerald-400 font-mono">
                    ${(() => {
                      const n = parseFloat(rewardInput);
                      return isNaN(n) ? '0.00' : n.toFixed(3).replace(/\.?0+$/, '') || '0';
                    })()} USD
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-emerald-400 font-bold text-sm">$</span>
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      required
                      value={rewardInput}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRewardInput(val);
                        const num = parseFloat(val);
                        if (!isNaN(num)) {
                          setFormData((prev) => ({ ...prev, rewardUsd: num }));
                        }
                      }}
                      placeholder="0.05"
                      className="w-36 bg-[#070b14] border border-emerald-500/50 rounded-xl pl-7 pr-3 py-2 text-sm font-black text-emerald-400 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[0.01, 0.02, 0.03, 0.05, 0.10, 0.20, 0.50, 1.00].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setRewardInput(String(amt));
                          setFormData((prev) => ({ ...prev, rewardUsd: amt }));
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-colors cursor-pointer ${
                          parseFloat(rewardInput) === amt
                            ? 'bg-emerald-500 text-slate-950 font-bold ring-2 ring-emerald-400 shadow-sm'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        ${amt}
                      </button>
                    ))}

                    {rewardInput !== '' && (
                      <button
                        type="button"
                        onClick={() => {
                          setRewardInput('');
                          setFormData((prev) => ({ ...prev, rewardUsd: 0 }));
                        }}
                        className="px-2.5 py-1 rounded-lg text-[10px] text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 cursor-pointer"
                        title="ক্লিয়ার / মুছে ফেলুন"
                      >
                        ক্লিয়ার (✕)
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  💡 ইচ্ছেমত যে কোনো সংখ্যা লিখুন (যেমন 0.025, 0.05, 0.1, 1 ইত্যাদি)। ব্যাকস্পেস চেপে পুরো মুছে নতুন মান দিতে পারবেন।
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  নির্দেশনা / বিবরণ (বাংলা)
                </label>
                <textarea
                  rows={2}
                  value={formData.descriptionBn || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, descriptionBn: e.target.value }))}
                  placeholder="যেমন: চ্যানেলে জয়েন করুন এবং ১০ সেকেন্ড অপেক্ষা করে স্ক্রিনশট দিয়ে ক্লেইম করুন।"
                  className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Extra Settings: Timer, Badge, Order, Active */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ভেরিফিকেশন টাইমার (সেকেন্ড)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="600"
                    value={timerInput}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTimerInput(val);
                      const num = parseInt(val, 10);
                      if (!isNaN(num)) {
                        setFormData((prev) => ({ ...prev, timerSeconds: num }));
                      }
                    }}
                    placeholder="8"
                    className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    টাস্ক ক্রম (Order)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={orderInput}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOrderInput(val);
                      const num = parseInt(val, 10);
                      if (!isNaN(num)) {
                        setFormData((prev) => ({ ...prev, order: num }));
                      }
                    }}
                    placeholder="1"
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, badgeText: e.target.value }))}
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
                      onChange={(e) => setFormData((prev) => ({ ...prev, enabled: e.target.checked }))}
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

      {/* TASK DELETE CONFIRMATION MODAL (In-App Modal, Safe from iframe window.confirm blocks) */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0d1424] border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-base font-black text-white">
                আপনি কি নিশ্চিত যে এই টাস্কটি মুছে ফেলতে চান?
              </h4>
              <p className="text-xs text-slate-300 font-medium pt-1">
                "{taskToDelete.titleBn || taskToDelete.title}" (${taskToDelete.rewardUsd} USD)
              </p>
              <p className="text-[11px] text-slate-400">
                টাস্কটি ডিলিট করলে ইউজাররা আর এটি দেখতে বা সম্পন্ন করতে পারবে না।
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setTaskToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                না, রাখুন (Cancel)
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black cursor-pointer shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                {isDeleting ? 'ডিলিট হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* SCREENSHOT PREVIEW MODAL */}
      {viewScreenshotUrl && (
        <div
          onClick={() => setViewScreenshotUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 cursor-pointer animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-[#0a0f1d] border border-cyan-500/40 rounded-3xl p-4 shadow-2xl space-y-3 cursor-default"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                {lang === 'bn' ? 'ইউজারের জমাকৃত স্ক্রিনশট প্রমাণ' : 'Submitted Screenshot Proof'}
              </span>
              <button
                type="button"
                onClick={() => setViewScreenshotUrl(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto rounded-2xl bg-black flex items-center justify-center p-1">
              <img
                src={viewScreenshotUrl}
                alt="Task Proof"
                className="max-h-[72vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectingSub && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="max-w-md w-full bg-[#0d1424] border border-rose-500/40 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-black text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>{lang === 'bn' ? 'টাস্ক সাবমিশন বাতিল করুন' : 'Reject Task Submission'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setRejectingSub(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <p>ইউজার: <strong>{rejectingSub.userName}</strong> ({rejectingSub.userEmail})</p>
              <p>টাস্ক: <strong>{rejectingSub.taskTitle}</strong></p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {lang === 'bn' ? 'বাতিলের কারণ লিখুন *' : 'Reason for rejection *'}
              </label>
              <textarea
                rows={3}
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                placeholder={lang === 'bn' ? 'যেমন: প্রদত্ত স্ক্রিনশট অস্পষ্ট অথবা চ্যানেল জয়েন সম্পন্ন হয়নি।' : 'e.g. Invalid screenshot or task not completed'}
                className="w-full bg-[#070b14] border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRejectingSub(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                {lang === 'bn' ? 'ফিরে যান' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={processingSubId === rejectingSub.id}
                onClick={handleRejectSubmission}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
              >
                {processingSubId === rejectingSub.id ? 'বাতিল হচ্ছে...' : (lang === 'bn' ? 'নিশ্চিত বাতিল করুন' : 'Confirm Reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
