import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Headphones,
  Mail,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  HelpCircle,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Share2,
  Play,
  Coins,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Zap,
  Globe,
  DollarSign,
  TrendingUp,
  Layers,
  Lock,
  Code2,
  Tv,
  Award,
  Clock,
  Settings,
  Download
} from 'lucide-react';
import { AuthUser, SupportSettings } from '../types';
import { FAQAccordion } from './FAQAccordion';
import { SocialTasksGuide } from './SocialTasksGuide';

interface SupportCenterPageProps {
  user: AuthUser | null;
  onBack: () => void;
  onOpenAuthModal: () => void;
  lang?: 'bn' | 'en';
  onNavigateToDeploy?: () => void;
  onNavigateToPlans?: () => void;
  onNavigateToRewards?: () => void;
  initialTab?: 'faq' | 'social_tasks' | 'contact' | 'reward_ads';
}

export function SupportCenterPage({
  user,
  onBack,
  onOpenAuthModal,
  lang = 'bn',
  onNavigateToDeploy,
  onNavigateToPlans,
  onNavigateToRewards,
  initialTab = 'faq'
}: SupportCenterPageProps) {
  const [activeTab, setActiveTab] = useState<'faq' | 'social_tasks' | 'contact'>(
    initialTab === 'reward_ads' ? 'social_tasks' : (initialTab as any)
  );
  const [settings, setSettings] = useState<SupportSettings>({
    email: 'toyoburrahman560@gmail.com',
    whatsapp: '01304104492',
    telegram: 'toyoburrahman',
    workingHours: '24/7 Live Support'
  });

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSupportSettings();
    if (user) {
      setSenderName(user.name || '');
      setSenderEmail(user.email || '');
    }
  }, [user]);

  const fetchSupportSettings = async () => {
    try {
      const res = await fetch('/api/support/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch {}
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setStatusMessage({
        type: 'error',
        text: lang === 'bn' ? 'অনুগ্রহ করে আপনার সমস্যার বিবরণ লিখুন।' : 'Please describe your inquiry or issue.'
      });
      return;
    }

    try {
      setSending(true);
      setStatusMessage(null);
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/support/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          name: senderName || user?.name || 'Customer',
          email: senderEmail || user?.email || 'No email'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusMessage({
          type: 'error',
          text: data.error || (lang === 'bn' ? 'মেসেজ পাঠানো সম্ভব হয়নি।' : 'Failed to send message.')
        });
        return;
      }

      setStatusMessage({
        type: 'success',
        text:
          lang === 'bn'
            ? '🎉 আপনার মেসেজটি সফলভাবে সাপোর্ট টিমের কাছে পৌঁছেছে! আমরা খুব শীঘ্রই যোগাযোগ করব।'
            : '🎉 Your message has been sent to our support team! We will get back to you shortly.'
      });
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 animate-in fade-in duration-200">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-amber-500 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'bn' ? 'পেছনে ফিরুন' : 'Back'}</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{settings.workingHours || (lang === 'bn' ? '২৪/৭ লাইভ সাপোর্ট' : '24/7 Live Support')}</span>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
          <Headphones className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {lang === 'bn' ? 'হেল্প ও সাপোর্ট সেন্টার' : 'Help & Support Center'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {lang === 'bn'
              ? 'বট হোস্টিং, সোশ্যাল টাস্ক আর্ন নির্দেশিকা ও সরাসরি যোগাযোগ'
              : 'Bot hosting answers, social tasks earn guides, and direct support'}
          </p>
        </div>
      </div>

      {/* Direct Project Code ZIP Download Banner (Solves GitHub Export Permission Errors) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
            <Download className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{lang === 'bn' ? 'সম্পূর্ণ প্রজেক্ট সোর্স কোড ডাউনলোড (ZIP)' : 'Download Full Project Source (ZIP)'}</span>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">1-Click</span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              {lang === 'bn'
                ? 'GitHub-এ "permission denied" বা কোনো সমস্যা ছাড়াই সরাসরি আপনার ফোনে বা কম্পিউটারে পুরো কোড ডাউনলোড করুন।'
                : 'Download all project source files directly to your phone/PC without GitHub permission blocks.'}
            </p>
          </div>
        </div>
        <a
          href="/api/export-project-zip"
          download="bot-hosting-complete-project.zip"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-md shadow-amber-500/20 cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>{lang === 'bn' ? 'ডাউনলোড জিপ (.ZIP)' : 'Download ZIP'}</span>
        </a>
      </div>

      {/* 3 Section Switcher Tabs */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-[#0c1424] border border-slate-200 dark:border-[#162035]">
        {/* Tab 1: Hosting FAQ */}
        <button
          type="button"
          onClick={() => setActiveTab('faq')}
          className={`py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeTab === 'faq'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span className="truncate">{lang === 'bn' ? 'হোস্টিং FAQ' : 'FAQ'}</span>
        </button>

        {/* Tab 2: Social Tasks Guide */}
        <button
          type="button"
          onClick={() => setActiveTab('social_tasks')}
          className={`py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition cursor-pointer relative ${
            activeTab === 'social_tasks'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Share2 className="w-4 h-4 shrink-0 text-amber-500 group-hover:text-amber-400" />
          <span className="truncate">{lang === 'bn' ? 'সোশ্যাল টাস্ক আর্ন' : 'Social Tasks'}</span>
          <span
            className={`text-[9px] px-1 py-0.2 rounded-full font-black uppercase tracking-wider hidden xs:inline ${
              activeTab === 'social_tasks' ? 'bg-slate-950/20 text-slate-950' : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            Earn $
          </span>
        </button>

        {/* Tab 3: Contact & Ticket */}
        <button
          type="button"
          onClick={() => setActiveTab('contact')}
          className={`py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeTab === 'contact'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span className="truncate">{lang === 'bn' ? 'সরাসরি সাপোর্ট' : 'Support'}</span>
        </button>
      </div>

      {/* 1. FAQ Accordion Tab */}
      {activeTab === 'faq' && (
        <div className="space-y-4">
          <FAQAccordion
            lang={lang}
            onNavigateToDeploy={onNavigateToDeploy}
            onNavigateToPlans={onNavigateToPlans}
            onNavigateToSupport={() => setActiveTab('contact')}
          />
        </div>
      )}

      {/* 2. SOCIAL TASKS & REWARDS GUIDE TAB */}
      {activeTab === 'social_tasks' && (
        <SocialTasksGuide
          lang={lang}
          onNavigateToRewards={onNavigateToRewards}
          onContactSupport={() => setActiveTab('contact')}
        />
      )}

      {/* 3. Direct Contact & Message Form Tab */}
      {activeTab === 'contact' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Quick return tip */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-slate-700 dark:text-slate-300 truncate">
                {lang === 'bn'
                  ? 'বট ডিপ্লয় ও সোশ্যাল টাস্ক আর্ন গাইড দেখতে FAQ অথবা টাস্ক গাইড ট্যাব দেখুন।'
                  : 'Check our FAQ & Social Tasks guide for instant walk-throughs.'}
              </span>
            </div>
            <button
              onClick={() => setActiveTab('social_tasks')}
              className="text-amber-500 font-bold hover:underline shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <span>{lang === 'bn' ? 'টাস্ক গাইড' : 'Tasks Guide'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Contact Channels (Email, WhatsApp, Telegram) */}
          <div className="space-y-3">
            {/* Email Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black text-slate-900 dark:text-white block">
                    {lang === 'bn' ? 'ইমেইল সাপোর্ট' : 'Email Support'}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">
                    {settings.email || 'toyoburrahman560@gmail.com'}
                  </span>
                </div>
              </div>

              <a
                href={`mailto:${settings.email || 'toyoburrahman560@gmail.com'}?subject=Support%20Inquiry`}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition shrink-0"
              >
                <span>{lang === 'bn' ? 'ইমেইল পাঠান' : 'Send'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* WhatsApp Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black text-slate-900 dark:text-white block">WhatsApp</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">
                    {settings.whatsapp || '01304104492'}
                  </span>
                </div>
              </div>

              <a
                href={`https://wa.me/88${(settings.whatsapp || '01304104492').replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition shrink-0"
              >
                <span>{lang === 'bn' ? 'চ্যাট করুন' : 'Chat'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Telegram Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-500 flex items-center justify-center shrink-0">
                  <Send className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black text-slate-900 dark:text-white block">Telegram</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">
                    @{settings.telegram || 'toyoburrahman'}
                  </span>
                </div>
              </div>

              <a
                href={`https://t.me/${(settings.telegram || 'toyoburrahman').replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition shrink-0"
              >
                <span>{lang === 'bn' ? 'টেলিগ্রাম চ্যাট' : 'Chat'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Direct Support Message Ticket Form */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-[#1e2e42] shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {lang === 'bn' ? 'সাপোর্ট টিমের কাছে মেসেজ পাঠান' : 'Send a Message Ticket'}
              </h3>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-4">
              {!user && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {lang === 'bn' ? 'আপনার নাম (Your Name)' : 'Your Name'}
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="e.g. Rahim"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {lang === 'bn' ? 'আপনার ইমেইল (Your Email)' : 'Your Email'}
                    </label>
                    <input
                      type="email"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      placeholder="e.g. rahim@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {lang === 'bn' ? 'বিষয় / Subject *' : 'Subject *'}
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={
                    lang === 'bn'
                      ? 'সমস্যার বিষয় (যেমন: বট ডিপ্লয় করতে পারছি না / সোশ্যাল টাস্ক ইস্যু)'
                      : 'What is your inquiry about?'
                  }
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {lang === 'bn' ? 'বিস্তারিত বিবরণ / Message *' : 'Message Details *'}
                </label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    lang === 'bn'
                      ? 'আপনার সমস্যার বিবরণ বিস্তারিত লিখুন...'
                      : 'Describe your issue or question in detail...'
                  }
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-amber-500 focus:outline-hidden resize-none"
                />
              </div>

              {statusMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    statusMessage.type === 'success'
                      ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/60 border border-rose-800 text-rose-300'
                  }`}
                >
                  {statusMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={sending}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 transition-all hover:scale-101 active:scale-98 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>
                  {sending
                    ? (lang === 'bn' ? 'পাঠানো হচ্ছে...' : 'Sending...')
                    : (lang === 'bn' ? 'মেসেজ পাঠান' : 'Send Message')}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
