import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Save, RefreshCw, CheckCircle2, AlertCircle, Sparkles, Sliders, Upload, Loader2, Trash2 } from 'lucide-react';
import { SiteSettings } from '../../types';

export function AdminSiteSettingsManager() {
  const [settings, setSettings] = useState<SiteSettings>({
    siteName: 'hosting live fast',
    logoUrl: '/site-logo.png',
    taglineBn: '২৪/৭ ক্লাউড বট ও টপ আপ সার্ভিস',
    taglineEn: '24/7 Cloud Bot & Top Up Service'
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/admin/site-settings', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setNotification({ type: 'error', text: 'শুধুমাত্র ইমেজ ফাইল (PNG, JPG, WebP, SVG) আপলোড করা যাবে।' });
      return;
    }

    try {
      setUploadingLogo(true);
      setNotification(null);
      const token = localStorage.getItem('bot_auth_token');

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await fetch('/api/admin/upload-file', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              fileName: file.name,
              fileData: base64Data,
              fileType: 'site_logo'
            })
          });

          const data = await res.json();
          if (res.ok && data.success) {
            setSettings((prev) => ({
              ...prev,
              logoUrl: data.url
            }));
            setNotification({ type: 'success', text: 'লোগো ছবি সফলভাবে আপলোড হয়েছে! নিচে সেভ বাটনে ক্লিক করুন।' });
          } else {
            setNotification({ type: 'error', text: data.error || 'ছবি আপলোড ব্যর্থ হয়েছে।' });
          }
        } catch (err: any) {
          setNotification({ type: 'error', text: err.message || 'আপলোড এরর' });
        } finally {
          setUploadingLogo(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'আপলোড এরর' });
      setUploadingLogo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setNotification(null);
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(settings)
      });

      if (res.ok) {
        setNotification({ type: 'success', text: 'সাইট লোগো ও ব্র্যান্ডিং সফলভাবে সেভ হয়েছে!' });
        window.dispatchEvent(new CustomEvent('site-settings-updated'));
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const err = await res.json();
        setNotification({ type: 'error', text: err.error || 'সেটিংস সেভ করতে সমস্যা হয়েছে' });
      }
    } catch {
      setNotification({ type: 'error', text: 'নেটওয়ার্ক এরর' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-[#162035]">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">সাইট লোগো ও ব্র্যান্ডিং সেটিংস</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              সাইটের অফিসিয়াল লোগো পিকচার, ব্র্যান্ডের নাম এবং ট্যাগলাইন পরিবর্তন ও প্রিভিউ করুন
            </p>
          </div>
        </div>
        <button
          onClick={fetchSettings}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-100 dark:bg-[#111827] text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          title="রিফ্রেশ করুন"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {notification && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-md ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
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

      {/* Live Preview Box */}
      <div className="rounded-2xl border border-amber-500/30 bg-slate-950 p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-black text-amber-400 uppercase tracking-wide">লাইভ লোগো প্রিভিউ (Live Preview)</span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-black/80 border-2 border-amber-500/50 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10 p-1">
            <img
              src={settings.logoUrl || '/logo-icon.png'}
              alt="Preview"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/logo-icon.png';
              }}
            />
          </div>
          <div className="flex flex-col text-center sm:text-left min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-xl font-black text-white">{settings.siteName || 'hosting live fast'}</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase">Official</span>
            </div>
            <span className="text-xs text-amber-400 font-bold mt-0.5">{settings.taglineBn || '২৪/৭ ক্লাউড বট ও টপ আপ সার্ভিস'}</span>
            <span className="text-[11px] text-slate-400 mt-0.5">{settings.taglineEn || '24/7 Cloud Bot & Top Up Service'}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            সাইটের লোগো পিকচার (Site Logo / Name Picture - Direct Upload)
          </label>

          {/* Direct File Upload Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border-2 border-dashed border-amber-500/40 hover:border-amber-400 transition-colors mb-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                  {uploadingLogo ? (
                    <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                  ) : (
                    <Upload className="w-6 h-6 text-amber-400" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-black text-white flex items-center gap-2">
                    <span>সরাসরি আপনার ডিভাইস থেকে ছবি আপলোড করুন</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Direct File Upload
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    JPG, PNG, WebP বা SVG ফরম্যাটের ছবি সিলেক্ট করলেই সাথে সাথে লোগো হিসেবে সেট হবে।
                  </p>
                </div>
              </div>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoFileUpload}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                >
                  {uploadingLogo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>আপলোড হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>📁 ছবি বেছে নিন (Upload Logo)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={settings.logoUrl || ''}
              onChange={(e) => {
                let val = e.target.value;
                if (val.includes('kommodo.ai/i/')) {
                  const match = val.match(/kommodo\.ai\/i\/([a-zA-Z0-9_-]+)/);
                  if (match && match[1]) {
                    val = `https://plain-apac-prod-public.komododecks.com/202609/15/${match[1]}/image.png`;
                  }
                }
                setSettings({ ...settings, logoUrl: val });
              }}
              placeholder="বা ছবির ইউআরএল দিন: https://... অথবা /site-logo.png"
              className="flex-1 min-w-[220px] px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-[#162035] text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 font-mono"
            />
            <button
              type="button"
              onClick={() => setSettings({ ...settings, logoUrl: 'https://plain-apac-prod-public.komododecks.com/202609/15/ITIrJC4dcVtKMXpxe1Il/image.png' })}
              className="px-3 py-2.5 rounded-xl bg-amber-500/10 text-xs font-bold text-amber-500 hover:bg-amber-500/20 border border-amber-500/30 transition cursor-pointer shrink-0"
            >
              আপনার লোগো
            </button>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, logoUrl: '/site-logo.png' })}
              className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-[#111827] text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1e293b] transition cursor-pointer shrink-0"
            >
              ডিফল্ট লোগো
            </button>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, logoUrl: '/logo-icon.png' })}
              className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-[#111827] text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1e293b] transition cursor-pointer shrink-0"
            >
              আইকন লোগো
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            টিপস: আপনি সরাসরি ফাইল আপলোড করতে পারেন অথবা যেকোনো ইমেজ লিংক (URL) পেস্ট করতে পারেন।
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            সাইটের নাম (Site Name)
          </label>
          <input
            type="text"
            value={settings.siteName || ''}
            onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
            placeholder="hosting live fast"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-[#162035] text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              বাংলা ট্যাগলাইন (Tagline Bangla)
            </label>
            <input
              type="text"
              value={settings.taglineBn || ''}
              onChange={(e) => setSettings({ ...settings, taglineBn: e.target.value })}
              placeholder="২৪/৭ ক্লাউড বট ও টপ আপ সার্ভিস"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-[#162035] text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              ইংরেজি ট্যাগলাইন (Tagline English)
            </label>
            <input
              type="text"
              value={settings.taglineEn || ''}
              onChange={(e) => setSettings({ ...settings, taglineEn: e.target.value })}
              placeholder="24/7 Cloud Bot & Top Up Service"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-[#162035] text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'সেভ হচ্ছে...' : 'লোগো ও সেটিংস সেভ করুন'}</span>
        </button>
      </form>
    </div>
  );
}
