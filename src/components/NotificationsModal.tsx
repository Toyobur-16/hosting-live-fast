import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, X, AlertCircle, Sparkles, CheckCircle2, Clock, RefreshCw, Trash2 } from 'lucide-react';
import { AuthUser } from '../types';

interface NotificationItem {
  id: string;
  userId?: string;
  userEmail?: string;
  type?: string;
  title: string;
  message: string;
  createdAt: string;
  read?: boolean;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  lang: 'bn' | 'en';
}

export function NotificationsModal({ isOpen, onClose, currentUser, lang }: NotificationsModalProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('bot_auth_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/notifications', { headers });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('bot_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: 'all' })
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  const handleMarkSingleRead = async (id: string) => {
    try {
      const token = localStorage.getItem('bot_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers,
        body: JSON.stringify({ id })
      });

      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {}
  };

  const handleClearSingle = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      // Optimistically remove from state immediately
      setNotifications((prev) => prev.filter((n) => n.id !== id));

      const token = localStorage.getItem('bot_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch('/api/notifications/clear', {
        method: 'POST',
        headers,
        body: JSON.stringify({ id })
      });
    } catch {
      // Re-sync on failure
      fetchNotifications();
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    try {
      setClearing(true);
      // Optimistically clear all notifications from state immediately
      setNotifications([]);

      const token = localStorage.getItem('bot_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch('/api/notifications/clear', {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: 'all' })
      });
    } catch {
      fetchNotifications();
    } finally {
      setClearing(false);
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-[#1e2d48] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1e2d48]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00d293]/10 text-[#00d293] flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {lang === 'bn' ? 'নোটিফিকেশন সেন্টার' : 'Notification Center'}
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#00d293] text-slate-950">
                    {unreadCount} {lang === 'bn' ? 'নতুন' : 'new'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'bn' ? 'ডিপোজিট অ্যাপ্রুভাল, নোটিশ ও আপডেট' : 'Deposit approvals, notices & system alerts'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={fetchNotifications}
              title={lang === 'bn' ? 'রিফ্রেশ' : 'Refresh'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#162238] transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#162238] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Actions bar: Unread status, Mark all as read, and Clear All */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-1 py-1 bg-slate-50 dark:bg-[#111c33] rounded-lg px-2 border border-slate-200 dark:border-[#1e2d48]">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {unreadCount > 0
                ? lang === 'bn'
                  ? `${unreadCount} টি অপঠিত`
                  : `${unreadCount} unread`
                : lang === 'bn'
                ? `মোট ${notifications.length} টি নোটিফিকেশন`
                : `${notifications.length} total`}
            </span>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-semibold text-[#00d293] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {lang === 'bn' ? 'সব পঠিত করুন' : 'Mark read'}
                </button>
              )}
              <button
                onClick={handleClearAll}
                disabled={clearing}
                className="text-xs font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title={lang === 'bn' ? 'সব নোটিফিকেশন ক্লিয়ার করুন' : 'Clear all notifications'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {lang === 'bn' ? 'সব মুছুন (Clear All)' : 'Clear all'}
              </button>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[50vh]">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
              <Bell className="w-10 h-10 mx-auto opacity-30 stroke-[1.5]" />
              <p className="text-sm font-medium">
                {lang === 'bn' ? 'কোনো নোটিফিকেশন পাওয়া যায়নি' : 'No notifications yet'}
              </p>
              <p className="text-xs">
                {lang === 'bn'
                  ? 'ডিপোজিট অ্যাপ্রুভ বা নতুন ঘোষণা আসলে এখানে দেখতে পাবেন।'
                  : 'Deposit approvals and system announcements will appear here.'}
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const isDeposit = item.type?.includes('deposit') || item.title?.includes('ডিপোজিট') || item.title?.includes('Deposit');
              const isApproved = item.type === 'deposit_approved' || item.title?.includes('অনুমোদিত') || item.title?.includes('Approved');
              const isRejected = item.type === 'deposit_rejected' || item.title?.includes('বাতিল') || item.title?.includes('Rejected');

              return (
                <div
                  key={item.id}
                  onClick={() => !item.read && handleMarkSingleRead(item.id)}
                  className={`p-3.5 rounded-xl border transition-all text-left relative group ${
                    !item.read
                      ? 'bg-emerald-50/70 dark:bg-[#00d293]/5 border-[#00d293]/30 shadow-xs'
                      : 'bg-slate-50 dark:bg-[#111c33] border-slate-200 dark:border-[#1e2d48] opacity-85'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 flex-1 pr-2">
                      <div className="mt-0.5 shrink-0">
                        {isApproved ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : isRejected ? (
                          <div className="w-6 h-6 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                            <AlertCircle className="w-4 h-4" />
                          </div>
                        ) : isDeposit ? (
                          <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                            <Clock className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-sky-500/10 text-sky-500 flex items-center justify-center">
                            <Sparkles className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                            {item.title}
                          </h4>
                          {!item.read && (
                            <span className="w-2 h-2 rounded-full bg-[#00d293] shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {item.message}
                        </p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 pt-0.5">
                          <Clock className="w-3 h-3" />
                          {new Date(item.createdAt).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Delete single notification button */}
                    <button
                      onClick={(e) => handleClearSingle(e, item.id)}
                      title={lang === 'bn' ? 'মুছে ফেলুন (Clear)' : 'Delete notification'}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200 dark:border-[#1e2d48] flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 rounded-xl bg-slate-900 dark:bg-[#00d293] hover:bg-slate-800 dark:hover:bg-[#00be84] text-white dark:text-slate-950 font-bold text-xs transition cursor-pointer"
          >
            {lang === 'bn' ? 'ঠিক আছে (Close)' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
