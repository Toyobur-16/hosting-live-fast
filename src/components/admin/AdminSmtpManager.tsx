import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Send, Lock, Key, Server, HelpCircle, Eye, EyeOff } from 'lucide-react';

interface AdminSmtpManagerProps {
  lang?: 'bn' | 'en';
}

export const AdminSmtpManager: React.FC<AdminSmtpManagerProps> = ({ lang = 'bn' }) => {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoFixing, setAutoFixing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [statusData, setStatusData] = useState<{
    configured: boolean;
    connected?: boolean;
    message?: string;
    config?: {
      host: string;
      port: number;
      user: string;
      from: string;
      secure: boolean;
      source?: string;
    };
  } | null>({
    configured: true,
    connected: true,
    message: '✅ SMTP সংযোগ সক্রিয় রয়েছে (smtp.gmail.com:587 TLS)! ইমেইল ও ভেরিফিকেশন কোড পাঠানোর জন্য সম্পূর্ণ প্রস্তুত।'
  });

  const [formData, setFormData] = useState({
    host: 'smtp.gmail.com',
    port: 587,
    user: 'hostinglivefast.official@gmail.com',
    pass: 'ykulrbgpoduzbawk',
    from: '"hosting live fast" <hostinglivefast.official@gmail.com>',
    secure: false
  });

  const [testEmail, setTestEmail] = useState('hostinglivefast.official@gmail.com');

  const [saveResult, setSaveResult] = useState<{
    success: boolean;
    connected?: boolean;
    errorCategory?: string;
    message: string;
    details?: string;
    solutionHint?: string;
    workingPort?: number;
    workingSecure?: boolean;
  } | null>(null);

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    errorCategory?: string;
    solutionHint?: string;
    error?: string;
  } | null>(null);

  const token = localStorage.getItem('bot_auth_token');
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  useEffect(() => {
    fetchSmtpStatus();
  }, []);

  const fetchSmtpStatus = async () => {
    setLoading(true);
    try {
      // 1. Fetch settings for form
      const settRes = await fetch('/api/admin/smtp-settings', { headers: authHeaders });
      if (settRes.ok) {
        const settData = await settRes.json();
        if (settData.settings) {
          setFormData({
            host: settData.settings.host || 'smtp.gmail.com',
            port: settData.settings.port || 587,
            user: settData.settings.user || 'hostinglivefast.official@gmail.com',
            pass: settData.settings.pass || 'ykulrbgpoduzbawk',
            from: settData.settings.from || '"hosting live fast" <hostinglivefast.official@gmail.com>',
            secure: settData.settings.secure !== undefined ? settData.settings.secure : false
          });
          if (settData.settings.user && !testEmail) {
            setTestEmail(settData.settings.user);
          } else if (!testEmail) {
            setTestEmail('hostinglivefast.official@gmail.com');
          }
        }
      }

      // 2. Fetch live status
      const statRes = await fetch('/api/admin/smtp-status', { headers: authHeaders });
      if (statRes.ok) {
        const statData = await statRes.json();
        setStatusData(statData);
      }
    } catch (err: any) {
      console.error('Error fetching SMTP settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFix = async () => {
    setAutoFixing(true);
    setSaveResult(null);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/smtp-autofix', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSaveResult({
          success: true,
          connected: true,
          message: data.message,
          solutionHint: data.solutionHint,
          details: data.details,
          workingPort: data.workingPort,
          workingSecure: data.workingSecure
        });
        if (data.workingPort) {
          setFormData((prev) => ({
            ...prev,
            port: data.workingPort,
            secure: data.workingSecure !== undefined ? data.workingSecure : (data.workingPort === 465)
          }));
        }
        setStatusData({
          configured: true,
          connected: true,
          message: data.message,
          config: data.config
        });
      } else {
        setSaveResult({
          success: false,
          connected: false,
          errorCategory: data.errorCategory || 'Error',
          message: data.message || data.error || 'স্বয়ংক্রিয় ফিক্স ব্যর্থ হয়েছে',
          solutionHint: data.solutionHint,
          details: data.details,
          workingPort: data.workingPort,
          workingSecure: data.workingSecure
        });
        if (data.workingPort) {
          setFormData((prev) => ({
            ...prev,
            port: data.workingPort,
            secure: data.workingSecure !== undefined ? data.workingSecure : (data.workingPort === 465)
          }));
        }
      }
    } catch (err: any) {
      setSaveResult({
        success: false,
        connected: false,
        errorCategory: 'Network Error',
        message: err.message || 'স্বয়ংক্রিয় ফিক্সের সময়ে নেটওয়ার্ক সমস্যা হয়েছে।'
      });
    } finally {
      setAutoFixing(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveResult(null);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/smtp-settings', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSaveResult({
          success: true,
          connected: data.connected,
          errorCategory: data.errorCategory,
          message: data.connected
            ? `${data.message} (সার্ভারের সাথে সফলভাবে সংযুক্ত)`
            : (data.verifyMessage || 'সংযোগ ব্যর্থ হয়েছে'),
          details: data.details,
          solutionHint: data.solutionHint
        });
        setStatusData({
          configured: true,
          connected: data.connected,
          message: data.verifyMessage,
          config: data.config
        });
        if (data.config?.port && data.config.port !== formData.port) {
          setFormData((prev) => ({
            ...prev,
            port: data.config.port,
            secure: data.config.secure !== undefined ? data.config.secure : prev.secure
          }));
        }
      } else {
        setSaveResult({
          success: false,
          connected: false,
          errorCategory: data.errorCategory || 'Error',
          message: data.error || data.verifyMessage || 'সংরক্ষণ ব্যর্থ হয়েছে',
          details: data.details,
          solutionHint: data.solutionHint
        });
      }
    } catch (err: any) {
      setSaveResult({
        success: false,
        connected: false,
        errorCategory: 'Network Error',
        message: err.message || 'সংরক্ষণকালে সমস্যা হয়েছে'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    const trimmed = (testEmail || '').trim();
    if (!trimmed || !trimmed.includes('@')) {
      alert(lang === 'bn' ? 'দয়া করে একটি সঠিক ও পূর্ণাঙ্গ ইমেইল এড্রেস লিখুন (যেমন: yourname@gmail.com)।' : 'Please enter a valid complete email address.');
      return;
    }
    if (!trimmed.includes('.') || trimmed.endsWith('@gma') || trimmed.endsWith('@gmail')) {
      alert(lang === 'bn' ? 'ইমেইল এড্রেসটি অসম্পূর্ণ মনে হচ্ছে! দয়া করে ডোমেইনটি সম্পূর্ণ করুন (যেমন: .com সহ)' : 'Incomplete email address domain. Please write complete email with .com');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/smtp-test', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ email: trimmed })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || 'টেস্ট ইমেইল সফলভাবে পাঠানো হয়েছে!'
        });
      } else {
        setTestResult({
          success: false,
          errorCategory: data.errorCategory,
          message: data.error || 'ইমেইল পাঠানো যায়নি',
          solutionHint: data.solutionHint,
          error: data.details
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        errorCategory: 'Network Error',
        message: err.message || 'টেস্ট ইমেইল পাঠানোর সময়ে নেটওয়ার্ক সমস্যা হয়েছে।'
      });
    } finally {
      setTesting(false);
    }
  };

  const applyPreset = (type: 'gmail-ssl' | 'gmail-tls' | 'custom') => {
    if (type === 'gmail-ssl') {
      setFormData((prev) => ({
        ...prev,
        host: 'smtp.gmail.com',
        port: 465,
        secure: true
      }));
    } else if (type === 'gmail-tls') {
      setFormData((prev) => ({
        ...prev,
        host: 'smtp.gmail.com',
        port: 587,
        secure: false
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        host: 'mail.yourdomain.com',
        port: 587,
        secure: false
      }));
    }
  };

  return (
    <div className="space-y-6 text-white pb-6 animate-in fade-in duration-200">
      
      {/* Header & Status Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#090f1d] border border-[#1e2d48] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/5">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <span>{lang === 'bn' ? 'SMTP ইমেইল নোটিফিকেশন কনফিগারেশন' : 'SMTP Email Alerts Setup'}</span>
              {statusData?.configured ? (
                statusData?.connected ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{lang === 'bn' ? 'সক্রিয় ও সংযুক্ত' : 'Active & Connected'}</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{lang === 'bn' ? 'সংযোগ ত্রুটি' : 'Connection Error'}</span>
                  </span>
                )
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {lang === 'bn' ? 'কনফিগার করা হয়নি' : 'Not Configured'}
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'bn'
                ? 'ডিপোজিট অ্যাপ্রুভাল ও হোস্টিং মেয়াদের সতর্কবার্তা সরাসরি গ্রাহকের জিমেইলে পাঠাতে এটি প্রয়োজন।'
                : 'Send real-time deposit approval and plan expiration alerts to customer email inboxes.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchSmtpStatus}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-xl bg-[#16233b] hover:bg-[#1e3052] border border-[#223657] text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{lang === 'bn' ? 'রিফ্রেশ স্ট্যাটাস' : 'Refresh Status'}</span>
        </button>
      </div>

      {/* Diagnostics / Connection Message Banner */}
      {statusData?.message && (
        <div className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          statusData.connected
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-start gap-2.5">
            {statusData.connected ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            )}
            <div className="leading-relaxed">
              <strong>{lang === 'bn' ? 'সার্ভার ডায়াগনস্টিক রিপোর্ট:' : 'Server Diagnostics:'}</strong> {statusData.message}
            </div>
          </div>

          {!statusData.connected && (
            <button
              type="button"
              onClick={handleAutoFix}
              disabled={autoFixing}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer self-start sm:self-center shadow-sm disabled:opacity-50"
            >
              {autoFixing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>⚡</span>}
              <span>{autoFixing ? 'ফিক্স হচ্ছে...' : 'অটো-ফিক্স ও কানেক্ট করুন'}</span>
            </button>
          )}
        </div>
      )}

      {/* Main Grid: Settings Form & Quick Test */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Settings Form Column */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#0b1222] border border-[#1f2d48] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1b2840]">
            <h5 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'bn' ? 'SMTP সার্ভার সেটিংস' : 'SMTP Server Settings'}</span>
            </h5>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-400 mr-1">{lang === 'bn' ? 'প্রিসেট:' : 'Presets:'}</span>
              <button
                type="button"
                onClick={() => applyPreset('gmail-tls')}
                className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 cursor-pointer font-bold flex items-center gap-1"
              >
                <span>⚡ Gmail 587 (TLS - রিকমেন্ডেড)</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('gmail-ssl')}
                className="px-2.5 py-1 rounded-lg bg-[#162238] hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 cursor-pointer font-medium"
              >
                Gmail 465 (SSL)
              </button>
            </div>
          </div>

          {/* Cloud hosting port hint */}
          <div className="p-2.5 rounded-xl bg-sky-950/30 border border-sky-500/25 text-[11px] text-sky-200 flex items-start gap-2">
            <span className="text-sm">💡</span>
            <span>
              {lang === 'bn'
                ? 'ক্লাউড হোস্টিংয়ে (Render, AWS, GCP ইত্যাদি) পোর্ট ৪৬৫ ব্লক থাকতে পারে। নিরবচ্ছিন্ন ভেরিফিকেশন কোড ও এলার্ট পাঠাতে Gmail Port 587 (TLS) ব্যবহার করুন।'
                : 'Outbound port 465 may be blocked on cloud hosting (Render, AWS, GCP). Use Gmail Port 587 (TLS) for guaranteed email delivery.'}
            </span>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  SMTP Host (সার্ভার এড্রেস) *
                </label>
                <input
                  type="text"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  placeholder="smtp.gmail.com"
                  className="w-full bg-[#080d19] border border-[#1e2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Port (পোর্ট) *
                </label>
                <input
                  type="number"
                  value={formData.port}
                  onChange={(e) => {
                    const port = parseInt(e.target.value, 10) || 587;
                    setFormData({
                      ...formData,
                      port,
                      secure: port === 465
                    });
                  }}
                  placeholder="587 বা 465"
                  className="w-full bg-[#080d19] border border-[#1e2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                User / Email (প্রেরক জিমেইল / ইমেইল) *
              </label>
              <input
                type="email"
                value={formData.user}
                onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                placeholder="badsha30k@gmail.com"
                className="w-full bg-[#080d19] border border-[#1e2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Password / Google App Password (১৬ সংখ্যার অ্যাপ পাসওয়ার্ড) *</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.pass}
                onChange={(e) => setFormData({ ...formData, pass: e.target.value.replace(/\s+/g, '') })}
                placeholder="abcd efgh ijkl mnop (Google App Password)"
                className="w-full bg-[#080d19] border border-[#1e2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
              <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5 text-[11px]">
                <p className="text-slate-400">
                  💡 <strong className="text-amber-300">টিপস:</strong> জিমেইলে সাধারণ পাসওয়ার্ড কাজ করে না। আপনার গুগল একাউন্টে ২-স্টেপ চালু করে ১৬ সংখ্যার App Password তৈরি করে দিন (স্পেস থাকলেও স্বয়ংক্রিয়ভাবে মুছে যাবে)।
                </p>
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold underline bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20"
                >
                  <span>Google App Password জেনারেটর খুলুন ↗</span>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Sender From Title (প্রেরকের নাম)
                </label>
                <input
                  type="text"
                  value={formData.from}
                  onChange={(e) => setFormData({ ...formData, from: e.target.value })}
                  placeholder='"hosting live fast" <badsha30k@gmail.com>'
                  className="w-full bg-[#080d19] border border-[#1e2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.secure}
                    onChange={(e) => setFormData({ ...formData, secure: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-0 focus:outline-none"
                  />
                  <span>SSL / TLS এনক্রিপশন সক্রিয় (Port 465 এর জন্য, Port 587 এ বন্ধ রাখুন)</span>
                </label>
              </div>
            </div>

            {saveResult && (
              <div className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                saveResult.connected
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold">
                    {saveResult.connected ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
                    <span>{saveResult.message}</span>
                  </div>
                  {saveResult.errorCategory && !saveResult.connected && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-[10px] font-bold text-rose-300 whitespace-nowrap">
                      {saveResult.errorCategory}
                    </span>
                  )}
                </div>

                {saveResult.solutionHint && (
                  <div className="p-2.5 rounded-lg bg-black/40 border border-amber-500/30 text-amber-200 text-[11px] leading-relaxed flex items-start gap-2">
                    <span className="text-sm shrink-0">💡</span>
                    <div>
                      <strong className="block text-amber-300 font-semibold mb-0.5">কীভাবে সমাধান করবেন:</strong>
                      <span>{saveResult.solutionHint}</span>
                    </div>
                  </div>
                )}

                {saveResult.details && (
                  <div className="text-[10px] text-slate-400 pl-3 border-l-2 border-slate-700 font-mono break-all">
                    টেকনিক্যাল ত্রুটি: {saveResult.details}
                  </div>
                )}

                {!saveResult.connected && (
                  <div className="pt-1 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleAutoFix}
                      disabled={autoFixing}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      {autoFixing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>⚡</span>}
                      <span>ক্লাউড অটো-ফিক্স ও পোর্ট টেস্ট (Auto-Fix IPv4)</span>
                    </button>
                    {formData.port === 465 && (
                      <button
                        type="button"
                        onClick={() => {
                          applyPreset('gmail-tls');
                          setTimeout(() => {
                            const formEl = document.querySelector('form');
                            if (formEl) formEl.requestSubmit();
                          }, 50);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <span>Gmail 587 (TLS) দিয়ে টেস্ট করুন</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="submit"
                disabled={saving || autoFixing}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/10 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{saving ? 'সংরক্ষণ ও সংযোগ পরীক্ষা হচ্ছে...' : 'সেটিংস সেভ ও সংযোগ পরীক্ষা (Save & Test)'}</span>
              </button>

              <button
                type="button"
                onClick={handleAutoFix}
                disabled={saving || autoFixing}
                className="px-4 py-2.5 rounded-xl bg-[#16233b] hover:bg-[#1e3052] border border-emerald-500/30 text-emerald-400 font-bold text-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                title="সার্ভারের সাথে IPv4 এবং পোর্ট স্বয়ংক্রিয়ভাবে পরীক্ষা ও সমাধান করুন"
              >
                {autoFixing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>⚡</span>}
                <span>{autoFixing ? 'ফিক্স হচ্ছে...' : 'অটো-ফিক্স (Auto-Fix)'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Live Test Email & Guide Column */}
        <div className="space-y-4">
          
          {/* Send Live Test Email Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0b1222] border border-[#1f2d48] space-y-3">
            <h5 className="text-sm font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-sky-400" />
              <span>{lang === 'bn' ? 'লাইভ টেস্ট ইমেইল পাঠান' : 'Send Live Test Email'}</span>
            </h5>
            <p className="text-xs text-slate-400">
              {lang === 'bn'
                ? 'কনফিগারেশনের পর নিচের বক্সে আপনার ইমেইল দিয়ে একটি রিয়েল টেস্ট বার্তা পাঠিয়ে চেক করুন।'
                : 'Send a real email to verify that your inbox receives alerts correctly.'}
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                প্রাপক ইমেইল এড্রেস (Recipient Email):
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="badsha30k@gmail.com"
                className="w-full bg-[#080d19] border border-[#1e2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={testing}
              className="w-full py-2.5 rounded-xl bg-[#0088cc] hover:bg-[#0099e6] text-white font-bold text-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{testing ? 'ইমেইল পাঠানো হচ্ছে...' : 'টেস্ট ইমেইল পাঠান (Send Test)'}</span>
            </button>

            {testResult && (
              <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                testResult.success
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold">
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                    <span>{testResult.success ? 'টেস্ট সফল!' : (testResult.errorCategory || 'টেস্ট ব্যর্থ')}</span>
                  </div>
                  {testResult.errorCategory && !testResult.success && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-[10px] font-bold text-rose-300 whitespace-nowrap">
                      {testResult.errorCategory}
                    </span>
                  )}
                </div>
                <p className="leading-relaxed">{testResult.message}</p>
                {testResult.solutionHint && !testResult.success && (
                  <div className="p-2 rounded-lg bg-black/40 border border-amber-500/30 text-amber-200 text-[11px] leading-relaxed">
                    <strong className="text-amber-300">💡 সমাধান: </strong>
                    {testResult.solutionHint}
                  </div>
                )}
                {testResult.error && (
                  <p className="text-[10px] font-mono text-slate-400 pl-2 border-l-2 border-slate-700 break-all">
                    ত্রুটি: {testResult.error}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Quick Guide on App Password */}
          <div className="p-4 rounded-2xl bg-[#090f1e] border border-[#1c2a44] space-y-2.5">
            <h6 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" />
              <span>জিমেইল App Password কিভাবে তৈরি করবেন?</span>
            </h6>
            <ol className="text-[11px] text-slate-300 space-y-1.5 pl-4 list-decimal leading-relaxed">
              <li>আপনার গুগল একাউন্টের <strong>Security</strong> ট্যাবে যান।</li>
              <li><strong>2-Step Verification</strong> চালু করুন।</li>
              <li>সার্চ বারে <strong>'App passwords'</strong> লিখে সার্চ করুন।</li>
              <li>অ্যাপের নাম দিন <code>HostingLive</code> এবং Create ক্লিক করুন।</li>
              <li>প্রাপ্ত ১৬ সংখ্যার হলুদ কোডটি কপি করে উপরের পাসওয়ার্ড বক্সে পেস্ট করুন।</li>
            </ol>
          </div>

        </div>

      </div>

    </div>
  );
};
