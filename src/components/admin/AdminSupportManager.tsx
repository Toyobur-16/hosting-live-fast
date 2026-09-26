import React, { useState, useEffect } from 'react';
import {
  Headphones,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Save,
  Server,
  BellRing
} from 'lucide-react';
import { SupportSettings, SupportMessage } from '../../types';

export function AdminSupportManager() {
  const [settings, setSettings] = useState<SupportSettings>({
    email: 'toyoburrahman560@gmail.com',
    whatsapp: '01304104492',
    telegram: 'toyoburrahman',
    workingHours: '24/7 Live Support'
  });

  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState<{ [id: string]: string }>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scanningPlans, setScanningPlans] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('bot_auth_token');
      const [setRes, msgRes] = await Promise.all([
        fetch('/api/support/settings'),
        fetch('/api/admin/support-messages', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (setRes.ok) {
        const sData = await setRes.json();
        if (sData.settings) setSettings(sData.settings);
      }
      if (msgRes.ok) {
        const mData = await msgRes.json();
        setMessages(mData.messages || []);
      }
    } catch {}
  };

  const handleScanExpiringPlans = async () => {
    try {
      setScanningPlans(true);
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/admin/scan-expiring-plans', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: 'success', text: data.message });
        setTimeout(() => setNotification(null), 5000);
      } else {
        setNotification({ type: 'error', text: data.error || 'স্ক্যান ব্যর্থ হয়েছে।' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setScanningPlans(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/admin/support-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (res.ok) {
        setNotification({ type: 'success', text: 'সাপোর্ট তথ্য সফলভাবে আপডেট হয়েছে!' });
        setTimeout(() => setNotification(null), 2500);
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleReplyMessage = async (msgId: string) => {
    const text = replyText[msgId];
    if (!text || !text.trim()) return;

    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch(`/api/admin/support-messages/${msgId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reply: text.trim(), status: 'replied' })
      });

      if (res.ok) {
        setNotification({ type: 'success', text: 'রিপ্লাই সফলভাবে পাঠানো হয়েছে!' });
        fetchData();
        setTimeout(() => setNotification(null), 2500);
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Headphones className="w-5 h-5 text-[#00d293]" />
            <span>সাপোর্ট সেন্টার সেটিংস ও ইনবক্স (Support Control)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            সাপোর্ট ইমেইল, হোয়াটসঅ্যাপ ও টেলিগ্রাম নাম্বার নিয়ন্ত্রণ করুন এবং ইউজারদের মেসেজ দেখুন
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

      {/* Expiring Plans Manual Trigger Card */}
      <div className="p-5 rounded-2xl bg-[#0f172a] border border-[#1e293b] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BellRing className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-black text-white">মেয়াদ শেষ হওয়ার সতর্কবার্তা স্ক্যান (Expiry Scanner)</h4>
            </div>
            <p className="text-[11px] text-slate-400">
              সকল ইউজারের একাউন্ট স্ক্যান করে যাদের হোস্টিং প্ল্যানের মেয়াদ ৩ দিন বা তার কম বাকি আছে তাদের ইন-অ্যাপ সতর্কবার্তা পাঠানো হবে।
            </p>
          </div>
          <button
            onClick={handleScanExpiringPlans}
            disabled={scanningPlans}
            className="px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] border border-slate-700 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-2 shrink-0"
          >
            <Clock className={`w-3.5 h-3.5 text-[#00d293] ${scanningPlans ? 'animate-spin' : ''}`} />
            <span>{scanningPlans ? 'স্ক্যান চলছে...' : 'সব একাউন্ট স্ক্যান করে এলার্ট পাঠান'}</span>
          </button>
        </div>
      </div>

      {/* Support Settings Card */}
      <div className="p-5 rounded-2xl bg-[#0f172a] border border-[#1e293b] space-y-4">
        <h4 className="text-xs font-black text-[#00d293] uppercase">যোগাযোগ তথ্য পরিবর্তন</h4>
        <form onSubmit={handleSaveSettings} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">সাপোর্ট ইমেইল (Email)</label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">হোয়াটসঅ্যাপ নাম্বার (WhatsApp)</label>
            <input
              type="text"
              value={settings.whatsapp}
              onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">টেলিগ্রাম ইউজারনেম (Telegram)</label>
            <input
              type="text"
              value={settings.telegram}
              onChange={(e) => setSettings({ ...settings, telegram: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">কাজের সময় (Working Hours)</label>
            <input
              type="text"
              value={settings.workingHours}
              onChange={(e) => setSettings({ ...settings, workingHours: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingSettings ? 'সেভ হচ্ছে...' : 'সেটিংস আপডেট করুন'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* User Inquiries Inbox */}
      <div className="space-y-3">
        <h4 className="text-xs font-black text-white uppercase">
          ইউজারদের সাপোর্ট মেসেজসমূহ ({messages.length})
        </h4>

        {messages.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[#0f172a] border border-[#1e293b] text-xs text-slate-400">
            কোনো মেসেজ জমা নেই।
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-2xl bg-[#0f172a] border border-[#1e293b] space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-black text-white block">{m.subject}</span>
                    <span className="text-[11px] text-slate-400">
                      From: {m.userName} ({m.userEmail}) • {new Date(m.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                      m.status === 'replied' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {m.status.toUpperCase()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-slate-300">
                  {m.message}
                </div>

                {m.reply && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-300">
                    <span className="font-bold block mb-1">এডমিন রিপ্লাই:</span>
                    {m.reply}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={replyText[m.id] || ''}
                    onChange={(e) => setReplyText({ ...replyText, [m.id]: e.target.value })}
                    placeholder="ইউজারকে রিপ্লাই লিখুন..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
                  />
                  <button
                    onClick={() => handleReplyMessage(m.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs cursor-pointer flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
