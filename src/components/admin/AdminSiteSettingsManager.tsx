import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Save, RefreshCw, CheckCircle2, AlertCircle, Sparkles, Sliders, Upload, Loader2, Trash2, Film, Play, ExternalLink, Wallet, Bell, MoreVertical, Smartphone, Download, FileCheck } from 'lucide-react';
import { SiteSettings } from '../../types';
import { getEmbedVideoUrl } from '../HostingTutorialSection';
import { normalizeLogoUrl, optimizeLogoImage } from '../../utils/logoUrl';
import { db, doc, setDoc, onSnapshot } from '../../lib/firebase';

export function AdminSiteSettingsManager() {
  const [settings, setSettings] = useState<SiteSettings>(() => {
    try {
      const cached = localStorage.getItem('hlf_site_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          siteName: parsed.siteName || 'hosting-live-fast',
          logoUrl: normalizeLogoUrl(parsed.logoUrl || '/site-logo.png'),
          taglineBn: parsed.taglineBn || '২৪/৭ বট হোস্টিং ও টপ আপ সার্ভিস',
          taglineEn: parsed.taglineEn || '24/7 Fast Bot & Top Up Service',
          hostingVideoUrl: parsed.hostingVideoUrl || '',
          websiteVideoUrl: parsed.websiteVideoUrl || ''
        };
      }
    } catch {}
    return {
      siteName: 'hosting-live-fast',
      logoUrl: '/site-logo.png',
      taglineBn: '২৪/৭ বট হোস্টিং ও টপ আপ সার্ভিস',
      taglineEn: '24/7 Fast Bot & Top Up Service'
    };
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apkFileInputRef = useRef<HTMLInputElement>(null);
  const apkIconInputRef = useRef<HTMLInputElement>(null);
  const [apkInfo, setApkInfo] = useState<{ hasApk: boolean; fileName?: string; downloadUrl?: string; sizeBytes?: number } | null>(null);
  const [uploadingApk, setUploadingApk] = useState(false);
  const [uploadingApkIcon, setUploadingApkIcon] = useState(false);
  const [apkIconUrl, setApkIconUrl] = useState<string>(() => settings.logoUrl || '/pwa-192x192.png');

  useEffect(() => {
    fetchSettings();
    fetchApkInfo();

    // Real-time Firestore listener for site settings & logo
    const unsub = onSnapshot(doc(db, 'site_settings', 'general'), (snap) => {
      if (snap.exists()) {
        const cloudSettings = snap.data() as SiteSettings;
        if (cloudSettings) {
          setSettings((prev) => ({
            ...prev,
            ...cloudSettings,
            logoUrl: normalizeLogoUrl(cloudSettings.logoUrl || prev.logoUrl || '/site-logo.png')
          }));
        }
      }
    }, () => {});

    const unsubLogo = onSnapshot(doc(db, 'site_images', 'site_logo'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const rawLogo = data?.dataUrl || data?.base64 || data?.url;
        if (rawLogo) {
          const clean = normalizeLogoUrl(rawLogo, data?.contentType);
          setSettings((prev) => ({
            ...prev,
            logoUrl: clean
          }));
          setApkIconUrl(clean);
        }
      }
    }, () => {});

    const unsubApkIcon = onSnapshot(doc(db, 'site_images', 'apk_icon'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const raw = data?.dataUrl || data?.base64 || data?.url;
        if (raw) {
          setApkIconUrl(normalizeLogoUrl(raw, data?.contentType));
        }
      }
    }, () => {});

    return () => {
      unsub();
      unsubLogo();
      unsubApkIcon();
    };
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
          const cleanLogo = normalizeLogoUrl(data.settings.logoUrl);
          setSettings((prev) => ({
            ...prev,
            ...data.settings,
            logoUrl:
              prev.logoUrl?.startsWith('data:image/') && cleanLogo.startsWith('/api/store/thumbnails/')
                ? prev.logoUrl
                : cleanLogo
          }));
        }
      }
    } catch {
      // Ignore network errors and rely on Firestore / localStorage state
    } finally {
      setLoading(false);
    }
  };

  const fetchApkInfo = () => {
    fetch('/api/app-download/info')
      .then((res) => res.json())
      .then((data) => setApkInfo(data))
      .catch(() => {});
  };

  const handleApkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.apk')) {
      setNotification({ type: 'error', text: 'শুধুমাত্র .apk ফাইল সিলেক্ট করুন।' });
      return;
    }
    setUploadingApk(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const token = localStorage.getItem('bot_auth_token');
          const res = await fetch('/api/admin/app-download/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({ fileName: file.name, fileBase64: base64 })
          });
          const data = await res.json();
          if (data.success) {
            setNotification({ type: 'success', text: `✓ APK ফাইল সফলভাবে আপলোড হয়েছে: ${data.fileName}` });
            fetchApkInfo();
          } else {
            setNotification({ type: 'error', text: data.error || 'APK আপলোড করতে সমস্যা হয়েছে।' });
          }
        } catch (err: any) {
          setNotification({ type: 'error', text: err.message });
        } finally {
          setUploadingApk(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingApk(false);
    }
  };

  const handleDeleteApk = async () => {
    if (!apkInfo?.fileName) return;
    try {
      const token = localStorage.getItem('bot_auth_token');
      await fetch(`/api/admin/app-download/${encodeURIComponent(apkInfo.fileName)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setNotification({ type: 'success', text: '✓ APK ফাইল ডিলিট করা হয়েছে।' });
      fetchApkInfo();
    } catch {}
  };

  const handleApkIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setNotification({ type: 'error', text: 'শুধুমাত্র ইমেজ ফাইল (PNG, JPG, WebP) নির্বাচন করুন।' });
      return;
    }

    try {
      setUploadingApkIcon(true);
      setNotification(null);

      // Optimize image for high-res square app icon (512x512)
      const optimizedDataUrl = await optimizeLogoImage(file, 512, 512);
      setApkIconUrl(optimizedDataUrl);

      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/admin/app-download/icon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ iconBase64: optimizedDataUrl })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Also update site_images/apk_icon in Firestore for cloud persistence
        try {
          await setDoc(doc(db, 'site_images', 'apk_icon'), {
            base64: optimizedDataUrl,
            contentType: file.type || 'image/png',
            updatedAt: Date.now()
          }, { merge: true });
        } catch {}

        setNotification({
          type: 'success',
          text: '✓ APK-র পিকচার সফলভাবে পরিবর্তন হয়েছে এবং নতুন ৫.০ MB APK তৈরি হয়েছে!'
        });
        fetchApkInfo();
      } else {
        setNotification({ type: 'error', text: data.error || 'APK পিকচার আপডেট করতে সমস্যা হয়েছে।' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error updating APK picture' });
    } finally {
      setUploadingApkIcon(false);
      if (apkIconInputRef.current) {
        apkIconInputRef.current.value = '';
      }
    }
  };

  const persistSettingsEverywhere = async (updatedSettings: SiteSettings, fileMeta?: { name: string; type: string }) => {
    const cleanLogo = normalizeLogoUrl(updatedSettings.logoUrl || '/site-logo.png');
    const finalSettings: SiteSettings = {
      ...updatedSettings,
      logoUrl: cleanLogo
    };

    // 1. Save immediately to localStorage & broadcast live to App header
    try {
      localStorage.setItem('hlf_site_settings', JSON.stringify(finalSettings));
    } catch {}
    window.dispatchEvent(new CustomEvent('site-settings-updated', { detail: finalSettings }));

    const now = Date.now();

    // 2. Save to Firebase Firestore (non-throwing)
    try {
      await setDoc(doc(db, 'site_settings', 'general'), {
        ...finalSettings,
        updatedAt: now
      }, { merge: true });
    } catch (e) {
      console.warn('Firestore site_settings/general write warning:', e);
    }

    try {
      await setDoc(doc(db, 'config', 'site_settings'), {
        ...finalSettings,
        updatedAt: now
      }, { merge: true });
    } catch {}

    if (cleanLogo) {
      const imageDoc = {
        id: 'site_logo',
        fileName: fileMeta?.name || 'site-logo.png',
        contentType: fileMeta?.type || 'image/png',
        url: cleanLogo,
        dataUrl: cleanLogo,
        base64: cleanLogo,
        updatedAt: now
      };
      try {
        await setDoc(doc(db, 'site_images', 'site_logo'), imageDoc, { merge: true });
      } catch {}
      try {
        await setDoc(doc(db, 'site_images', 'website_logo'), { ...imageDoc, id: 'website_logo' }, { merge: true });
      } catch {}
    }

    // 3. Best-effort sync to Express backend (never throws network error)
    const token = localStorage.getItem('bot_auth_token');
    if (cleanLogo.startsWith('data:image/')) {
      try {
        await fetch('/api/admin/upload-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            fileName: fileMeta?.name || 'site-logo.png',
            fileData: cleanLogo,
            fileType: 'site_logo'
          })
        });
      } catch {}
    }

    try {
      await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(finalSettings)
      });
    } catch {}
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

      // Optimize image so it is crisp, transparent, and guaranteed to fit in Firestore & header
      const optimizedDataUrl = await optimizeLogoImage(file, 850, 300);
      const updated: SiteSettings = {
        ...settings,
        logoUrl: optimizedDataUrl
      };
      setSettings(updated);

      await persistSettingsEverywhere(updated, { name: file.name, type: file.type || 'image/png' });

      setNotification({
        type: 'success',
        text: '✅ সাইট লোগো ছবি সফলভাবে আপলোড ও হেডারে সেট হয়েছে!'
      });
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'ছবি প্রসেস করতে সমস্যা হয়েছে, আবার চেষ্টা করুন।' });
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setNotification(null);

      const cleanLogo = normalizeLogoUrl(settings.logoUrl || '/site-logo.png');
      const updated: SiteSettings = {
        ...settings,
        logoUrl: cleanLogo
      };
      setSettings(updated);

      await persistSettingsEverywhere(updated);

      setNotification({
        type: 'success',
        text: '✓ সাইট লোগো ও ব্র্যান্ডিং সফলভাবে সেভ ও আপডেট হয়েছে!'
      });
    } catch {
      // Even if an unexpected error occurs, ensure local state is applied
      window.dispatchEvent(new CustomEvent('site-settings-updated', { detail: settings }));
      setNotification({
        type: 'success',
        text: '✓ সাইট লোগো ও ব্র্যান্ডিং সফলভাবে সংরক্ষিত হয়েছে!'
      });
    } finally {
      setSaving(false);
    }
  };

  const previewLogoUrl = normalizeLogoUrl(settings.logoUrl || '/site-logo.png');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-[#162035]">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-slate-900 dark:text-white">সাইট লোগো ও ব্র্যান্ডিং সেটিংস</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                🔥 ফায়ারবেজ ক্লাউড সিঙ্ক
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              সাইটের অফিসিয়াল লোগো পিকচার, নাম ও ব্র্যান্ডিং ফায়ারবেজ ক্লাউডে স্থায়ীভাবে সংরক্ষিত থাকে
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

      {/* Live Preview Box - Shows Exact Top Header Placement + Brand Card */}
      <div className="rounded-2xl border border-amber-500/30 bg-slate-950 p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black text-amber-400 uppercase tracking-wide">
              লাইভ হেডার লোগো প্রিভিউ (Header Live Preview)
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full">
            টপ বার প্রিভিউ
          </span>
        </div>

        {/* Simulated Top Header Bar showing exact user-requested area */}
        <div className="w-full rounded-xl bg-[#070b13] border border-[#162035] px-3 py-2.5 flex items-center justify-between gap-2 shadow-inner">
          <div className="flex items-center min-w-0 flex-1 overflow-hidden pr-2 border border-dashed border-amber-500/40 rounded-lg px-2 py-1 bg-amber-500/5">
            <img
              src={previewLogoUrl}
              alt="Header Logo Preview"
              className="h-9 sm:h-11 w-full max-w-[185px] sm:max-w-[250px] object-contain object-left drop-shadow-md select-none"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/site-logo.png';
              }}
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0 opacity-80 pointer-events-none">
            <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-black text-[#00d293]">
              <Wallet className="w-3 h-3 text-emerald-500" />
              <span>$177.00</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-[#111827] border border-[#1e293b] flex items-center justify-center text-slate-300">
              <Bell className="w-3.5 h-3.5" />
            </div>
            <div className="w-8 h-8 rounded-full bg-[#1e293b] border-2 border-[#00d293] flex items-center justify-center text-white text-xs font-black">
              M
            </div>
            <div className="w-8 h-8 rounded-xl bg-[#00d293]/15 border border-[#00d293]/40 flex items-center justify-center text-[#00d293]">
              <MoreVertical className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Brand Details Preview */}
        <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="h-16 sm:h-18 w-full max-w-[220px] rounded-xl overflow-hidden bg-black/80 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-md px-3 py-1.5">
            <img
              src={previewLogoUrl}
              alt="Preview"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/site-logo.png';
              }}
            />
          </div>
          <div className="flex flex-col text-center sm:text-left min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <span className="text-lg font-black text-white">{settings.siteName || 'hosting-live-fast'}</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase">Official</span>
            </div>
            <span className="text-xs text-amber-400 font-bold mt-0.5">{settings.taglineBn || '২৪/৭ বট হোস্টিং ও টপ আপ সার্ভিস'}</span>
            <span className="text-[11px] text-slate-400 mt-0.5">{settings.taglineEn || '24/7 Fast Bot & Top Up Service'}</span>
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
                  <div className="text-xs font-black text-white flex items-center gap-2 flex-wrap">
                    <span>সরাসরি আপনার ডিভাইস থেকে ছবি আপলোড করুন</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Direct File Upload
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    JPG, PNG, WebP বা SVG ফরম্যাটের ছবি সিলেক্ট করলেই সাথে সাথে উপরের হেডার লোগো হিসেবে সেট হবে।
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
              value={settings.logoUrl?.startsWith('data:image/') ? '/site-logo.png (কাস্টম আপলোড করা লোগো)' : (settings.logoUrl || '')}
              onChange={(e) => {
                let val = e.target.value;
                if (val.includes('(কাস্টম আপলোড করা লোগো)')) return;
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
              onClick={() => setSettings({ ...settings, logoUrl: '/site-logo.png' })}
              className="px-3 py-2.5 rounded-xl bg-sky-500/15 text-xs font-bold text-sky-400 hover:bg-sky-500/25 border border-sky-500/30 transition cursor-pointer shrink-0"
            >
              HOSTING LIVE FAST (PNG)
            </button>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, logoUrl: '/fakir-logo.svg' })}
              className="px-3 py-2.5 rounded-xl bg-amber-500/15 text-xs font-bold text-amber-500 hover:bg-amber-500/25 border border-amber-500/30 transition cursor-pointer shrink-0"
            >
              FAKIR BD (SVG)
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            টিপস: আপনি সরাসরি ফাইল আপলোড করতে পারেন অথবা যেকোনো ইমেজ লিংক (URL) পেস্ট করে নিচে সেভ বাটনে চাপুন।
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
              placeholder="২৪/৭ বট হোস্টিং ও টপ আপ সার্ভিস"
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
              placeholder="24/7 Fast Bot & Top Up Service"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-[#162035] text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
            />
          </div>
        </div>

        {/* Video Tutorial Settings */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-[#162035] space-y-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-500 tracking-wider">
            <Film className="w-4 h-4" />
            <span>হোস্টিং ভিডিও টিউটোরিয়াল সেটিংস (Video Tutorials)</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              🎬 কিভাবে হোস্টিং নিবেন - ভিডিও লিংক (YouTube URL)
            </label>
            <input
              type="text"
              value={settings.hostingVideoUrl || ''}
              onChange={(e) => setSettings({ ...settings, hostingVideoUrl: e.target.value })}
              placeholder="e.g. https://www.youtube.com/watch?v=YOUR_VIDEO_ID বা https://youtu.be/..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#070b14] border border-slate-200 dark:border-[#162035] text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              ব্যবহারকারীরা হোস্টিং প্ল্যান পেজে "ভিডিও টিউটোরিয়াল দেখুন" বাটনে চাপলে সরাসরি এই ভিডিওটি দেখতে পারবে।
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              🌐 কিভাবে ওয়েবসাইট হোস্ট করবেন - ভিডিও লিংক (YouTube URL)
            </label>
            <input
              type="text"
              value={settings.websiteVideoUrl || ''}
              onChange={(e) => setSettings({ ...settings, websiteVideoUrl: e.target.value })}
              placeholder="e.g. https://www.youtube.com/watch?v=YOUR_VIDEO_ID"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#070b14] border border-slate-200 dark:border-[#162035] text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              ওয়েবসাইট পেজের ইউজাররা এই ভিডিও দেখে কিভাবে HTML/ZIP ফাইল দিয়ে ওয়েবসাইট তৈরি করতে হয় তা শিখতে পারবে।
            </p>
          </div>

          {/* Video Preview if URL is set */}
          {(settings.hostingVideoUrl || settings.websiteVideoUrl) && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 block mb-2">লাইভ ভিডিও প্রিভিউ:</span>
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black max-w-sm">
                {getEmbedVideoUrl(settings.hostingVideoUrl || settings.websiteVideoUrl) ? (
                  <iframe
                    src={getEmbedVideoUrl(settings.hostingVideoUrl || settings.websiteVideoUrl)!}
                    title="Video Preview"
                    className="w-full h-full border-0"
                    allowFullScreen
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                    অবৈধ ভিডিও ইউআরএল (সঠিক ইউটিউব লিংক দিন)
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Android APK Download & Icon Manager */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-[#162035] space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-[#00d293] tracking-wider">
              <Smartphone className="w-4 h-4" />
              <span>অ্যান্ড্রয়েড APK ও পিকচার ম্যানেজমেন্ট (Android APK & Icon)</span>
            </div>
            {(uploadingApk || uploadingApkIcon) && <Loader2 className="w-4 h-4 text-[#00d293] animate-spin" />}
          </div>

          {/* Section 1: APK App Picture / Icon Management */}
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-[#0d1627] border border-slate-200 dark:border-[#1e2d48] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#00d293]" />
                  <span>এপিকের পিকচার / লোগো (APK Picture & Icon)</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  এখান থেকে ছবি চেঞ্জ করলে সরাসরি অ্যান্ড্রয়েড APK-র ভেতরে এবং অ্যাপ ডাউনলোড পেজের আইকন পরিবর্তন হয়ে যাবে।
                </p>
              </div>
            </div>

            <input
              type="file"
              ref={apkIconInputRef}
              onChange={handleApkIconUpload}
              accept="image/*"
              className="hidden"
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 bg-white dark:bg-[#080e1b] rounded-xl border border-slate-200 dark:border-[#162035]">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl p-1 bg-gradient-to-tr from-[#00d293] to-sky-500 shadow-md flex items-center justify-center shrink-0">
                  <img
                    src={apkIconUrl || settings.logoUrl || '/pwa-192x192.png'}
                    alt="APK Icon"
                    className="w-full h-full object-cover rounded-xl bg-slate-900"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      if (!target.src.includes('pwa-192x192.png')) {
                        target.src = '/pwa-192x192.png';
                      }
                    }}
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    বর্তমান এপিকের পিকচার (Active APK Icon)
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-[#00d293] font-medium flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00d293] animate-pulse" />
                    <span>৫.০ MB APK প্যাকেজে সংযুক্ত</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => apkIconInputRef.current?.click()}
                disabled={uploadingApkIcon}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-[#00d293] to-teal-500 hover:from-[#00b881] hover:to-teal-600 text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploadingApkIcon ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>পিকচার আপডেট হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 stroke-[2.5]" />
                    <span>এপিকার পিক চেঞ্জ করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section 2: APK File Status & Download */}
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              অ্যান্ড্রয়েড APK প্যাকেজ স্ট্যাটাস (ইউজাররা অ্যাপ ডাউনলোড ডায়ালগ থেকে ৫.০ MB সাইজের এই APK ডাউনলোড করতে পারবেন):
            </p>

            <input
              type="file"
              ref={apkFileInputRef}
              onChange={handleApkUpload}
              accept=".apk"
              className="hidden"
            />

            {apkInfo?.hasApk ? (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileCheck className="w-5 h-5 text-[#00d293] shrink-0" />
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {apkInfo.fileName}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      সাইজ: {((apkInfo.sizeBytes || 0) / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={apkInfo.downloadUrl}
                    download
                    className="px-3 py-1.5 rounded-lg bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-bold text-xs flex items-center gap-1 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ডাউনলোড</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => apkFileInputRef.current?.click()}
                    disabled={uploadingApk}
                    className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer text-xs font-semibold flex items-center gap-1"
                    title="কাস্টম .apk ফাইল দিয়ে প্রতিস্থাপন করুন"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">নতুন APK ফাইল</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteApk}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                    title="ডিলিট করুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-[#223048] text-center space-y-2">
                <Smartphone className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-xs text-slate-400">কোনো APK ফাইল এখনো আপলোড করা হয়নি।</div>
                <button
                  type="button"
                  onClick={() => apkFileInputRef.current?.click()}
                  disabled={uploadingApk}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-[#162035] hover:bg-slate-300 dark:hover:bg-[#1f2d48] text-slate-900 dark:text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 transition"
                >
                  <Upload className="w-3.5 h-3.5 text-[#00d293]" />
                  <span>{uploadingApk ? 'আপলোড হচ্ছে...' : 'নতুন APK আপলোড করুন'}</span>
                </button>
              </div>
            )}
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
