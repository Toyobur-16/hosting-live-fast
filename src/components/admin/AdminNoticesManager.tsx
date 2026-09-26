import React, { useState, useEffect } from 'react';
import {
  BellRing,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Radio,
  Clock,
  Sparkles
} from 'lucide-react';

interface Announcement {
  id: string;
  titleBn: string;
  titleEn: string;
  messageBn: string;
  messageEn: string;
  date: string;
  priority?: 'normal' | 'high';
}

export function AdminNoticesManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    titleBn: '',
    titleEn: '',
    messageBn: '',
    messageEn: '',
    priority: 'high' as 'normal' | 'high',
    sendBroadcast: true
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/announcements');
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titleBn && !formData.titleEn) {
      setNotification({ type: 'error', text: 'নোটিশের শিরোনাম প্রদান করুন।' });
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/admin/announcements', {
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
          text: formData.sendBroadcast
            ? 'নোটিশ পোস্ট হয়েছে এবং সকল ইউজারের কাছে ব্রডকাস্ট পাঠানো হয়েছে!'
            : 'নোটিশ সফলভাবে হোমপেজে যুক্ত হয়েছে!'
        });
        setFormData({
          titleBn: '',
          titleEn: '',
          messageBn: '',
          messageEn: '',
          priority: 'high',
          sendBroadcast: true
        });
        fetchAnnouncements();
        setTimeout(() => setNotification(null), 4000);
      } else {
        setNotification({ type: 'error', text: data.error || 'নোটিশ প্রকাশে সমস্যা হয়েছে।' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm('এই নোটিশটি মুছে ফেলতে চান?')) return;
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotification({ type: 'success', text: 'নোটিশ মুছে ফেলা হয়েছে।' });
        fetchAnnouncements();
        setTimeout(() => setNotification(null), 2500);
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <BellRing className="w-5 h-5 text-[#00d293]" />
            <span>জরুরি নোটিশ ও ব্রডকাস্ট সিস্টেম (Notice & Broadcast)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            হোমপেজের নোটিশ টিকারে নতুন বার্তা যুক্ত করুন এবং সকল ইউজারদের কাছে পাঠাতে পারেন
          </p>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border border-rose-800 text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Post New Announcement Form */}
      <form onSubmit={handleCreateAnnouncement} className="p-5 rounded-2xl bg-[#0f172a] border border-[#1e293b] space-y-4">
        <h4 className="text-xs font-black text-[#00d293] uppercase flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          <span>নতুন নোটিশ পোস্ট করুন</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              নোটিশ শিরোনাম (বাংলা) *
            </label>
            <input
              type="text"
              required
              value={formData.titleBn}
              onChange={(e) => setFormData({ ...formData, titleBn: e.target.value })}
              placeholder="e.g. নতুন হাই-স্পিড সার্ভার চালু করা হয়েছে"
              className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              Notice Title (English)
            </label>
            <input
              type="text"
              value={formData.titleEn}
              onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
              placeholder="e.g. New High-Speed Node Available"
              className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              বিস্তারিত বার্তা (বাংলা) *
            </label>
            <textarea
              rows={3}
              required
              value={formData.messageBn}
              onChange={(e) => setFormData({ ...formData, messageBn: e.target.value })}
              placeholder="e.g. প্রিয় গ্রাহকবৃন্দ, এখন থেকে আরও দ্রুত গতিতে টেলিগ্রাম বট হোস্টিং উপভোগ করুন..."
              className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              Detailed Message (English)
            </label>
            <textarea
              rows={3}
              value={formData.messageEn}
              onChange={(e) => setFormData({ ...formData, messageEn: e.target.value })}
              placeholder="e.g. Dear users, our new hosting servers are online with instant auto restart..."
              className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.sendBroadcast}
              onChange={(e) => setFormData({ ...formData, sendBroadcast: e.target.checked })}
              className="rounded text-[#00d293]"
            />
            <Radio className="w-3.5 h-3.5 text-[#00d293]" />
            <span>সকল ইউজারদের নোটিফিকেশনে পুশ ব্রডকাস্ট পাঠান</span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'পাঠানো হচ্ছে...' : 'নোটিশ প্রকাশ করুন'}</span>
          </button>
        </div>
      </form>

      {/* Active Announcements List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          বর্তমান নোটিশ সমূহ ({announcements.length})
        </h4>

        {announcements.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs rounded-2xl bg-[#0d1527] border border-[#1e293b]">
            বর্তমানে কোনো নোটিশ সক্রিয় নেই।
          </div>
        ) : (
          announcements.map((ann) => (
            <div
              key={ann.id}
              className="p-4 rounded-2xl bg-[#0d1527] border border-[#1e293b] flex items-start justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white">
                    {ann.titleBn || ann.titleEn}
                  </span>
                  {ann.titleEn && ann.titleBn && (
                    <span className="text-[11px] text-slate-400">
                      ({ann.titleEn})
                    </span>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(ann.date).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {ann.messageBn || ann.messageEn}
                </p>
              </div>

              <button
                onClick={() => handleDeleteAnnouncement(ann.id)}
                className="p-2 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-400 hover:text-white cursor-pointer transition-colors"
                title="মুছে ফেলুন"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
