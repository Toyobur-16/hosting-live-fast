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
  Film,
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

interface SupportCenterPageProps {
  user: AuthUser | null;
  onBack: () => void;
  onOpenAuthModal: () => void;
  lang?: 'bn' | 'en';
  onNavigateToDeploy?: () => void;
  onNavigateToPlans?: () => void;
  onNavigateToRewards?: () => void;
  initialTab?: 'faq' | 'reward_ads' | 'contact';
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
  const [activeTab, setActiveTab] = useState<'faq' | 'reward_ads' | 'contact'>(initialTab);
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

  // Reward ads snippet tab state
  const [activeCodeSnippet, setActiveCodeSnippet] = useState<'monetag' | 'adsterra' | 'server'>('monetag');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [openAdFaqId, setOpenAdFaqId] = useState<string | null>('ad-net-best');

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

  const codeSnippets = {
    monetag: `<!-- 1. Monetag Rewarded Interstitial Tag -->
<script src="https://alwingulla.com/88/tag.min.js" data-zone="YOUR_MONETAG_ZONE_ID" async data-cfasync="false"></script>
<script>
  // Trigger rewarded video playback on button click
  function triggerMonetagRewardedAd(sessionId, userToken) {
    if (typeof show_YOUR_MONETAG_ZONE_ID === 'function') {
      show_YOUR_MONETAG_ZONE_ID().then(function() {
        // Video finished successfully - notify cloud backend to reward user
        fetch('/api/rewards/ads/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + userToken
          },
          body: JSON.stringify({ sessionId: sessionId })
        }).then(res => res.json()).then(data => {
          if (data.success) {
            alert('🎉 Reward credited: +' + data.rewardAmount + ' USD');
          }
        });
      });
    }
  }
</script>`,
    adsterra: `<!-- 2. Adsterra Video / Social Bar Snippet -->
<script type="text/javascript">
  atOptions = {
    'key': 'YOUR_ADSTERRA_KEY_HERE',
    'format': 'iframe',
    'height': 300,
    'width': 250,
    'params': {}
  };
</script>
<script type="text/javascript" src="//www.topcreativeformat.com/YOUR_KEY/invoke.js"></script>

<!-- Adsterra Direct Smartlink Video Event Callback -->
<script>
  function handleAdsterraVideoWatched(sessionId, userToken) {
    fetch('/api/rewards/ads/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + userToken
      },
      body: JSON.stringify({ sessionId: sessionId })
    });
  }
</script>`,
    server: `// 3. Platform Anti-Fraud Server Guard (Node/Express)
app.post('/api/rewards/ads/complete', async (req, res) => {
  const user = getAuthUser(req);
  const { sessionId } = req.body;

  // 1. Verify cryptographic session
  const session = activeSessions.get(sessionId);
  if (!session || session.userId !== user.id) {
    return res.status(403).json({ error: 'Invalid or forged ad session' });
  }

  // 2. Minimum duration enforcement (Anti-Skip)
  const elapsedSeconds = (Date.now() - session.startedAt) / 1000;
  if (elapsedSeconds < 15) {
    return res.status(400).json({ error: 'Video watched duration was insufficient' });
  }

  // 3. Atomic wallet credit & daily limit check
  const result = await creditUserRewardWallet(user.id, session.rewardAmount);
  res.json({ success: true, rewardAmount: session.rewardAmount, newBalance: result.newBalance });
});`
  };

  const handleCopySnippet = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const toggleAdFaq = (id: string) => {
    setOpenAdFaqId((prev) => (prev === id ? null : id));
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
              ? 'বট হোস্টিং, রিওয়ার্ড ভিডিও অ্যাড প্রোভাইডার নির্দেশিকা ও সরাসরি যোগাযোগ'
              : 'Bot hosting answers, rewarded ad network guides, and direct support'}
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

        {/* Tab 2: Reward Ads Guide */}
        <button
          type="button"
          onClick={() => setActiveTab('reward_ads')}
          className={`py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition cursor-pointer relative ${
            activeTab === 'reward_ads'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Film className="w-4 h-4 shrink-0 text-amber-500 group-hover:text-amber-400" />
          <span className="truncate">{lang === 'bn' ? 'ভিডিও অ্যাড গাইড' : 'Reward Ads'}</span>
          <span
            className={`text-[9px] px-1 py-0.2 rounded-full font-black uppercase tracking-wider hidden xs:inline ${
              activeTab === 'reward_ads' ? 'bg-slate-950/20 text-slate-950' : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            Hot
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

      {/* 2. REWARD-BASED AD PROVIDERS & MONETIZATION GUIDE TAB */}
      {activeTab === 'reward_ads' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Hero Banner */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0c1424] via-[#0f1b33] to-[#162238] border border-amber-500/30 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-black tracking-wide uppercase">
                <Film className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'রিওয়ার্ডেড ভিডিও অ্যাড মনিটাইজেশন গাইড' : 'Rewarded Video Ads Guide'}</span>
              </div>

              <h3 className="text-lg sm:text-2xl font-black text-white leading-tight">
                {lang === 'bn'
                  ? 'সেরা ভিডিও অ্যাড প্রোভাইডার ও ইন্টিগ্রেশন নির্দেশিকা'
                  : 'Best Reward Video Ad Networks & Regional Integration'}
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                {lang === 'bn'
                  ? 'আমাদের অঞ্চল (বাংলাদেশ ও দক্ষিণ এশিয়া)-এর ট্রাফিকের জন্য কোন কোন ভিডিও বিজ্ঞাপন নেটওয়ার্ক সবচেয়ে বেশি CPM ও ১০০% ফিল রেট দেয় এবং কীভাবে খুব সহজে এই প্ল্যাটফর্মে ইন্টিগ্রেট করবেন তার বিস্তারিত গাইড।'
                  : 'Complete overview of which reward ad networks yield top CPM and fill rates for Bangladesh & South Asian traffic, and how to configure them effortlessly.'}
              </p>

              {/* Fast Key Metrics Pill Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {lang === 'bn' ? 'অনুমোদন সময়' : 'Approval Speed'}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-emerald-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'তাৎক্ষণিক (১ মিনিট)' : 'Instant'}</span>
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {lang === 'bn' ? 'আঞ্চলিক ফিল রেট' : 'Regional Fill'}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-amber-400 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" />
                    <span>98% - 100%</span>
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {lang === 'bn' ? 'মিনিমাম ক্যাশআউট' : 'Min Cashout'}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-sky-400 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>$5.00 USD</span>
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {lang === 'bn' ? 'নিরাপত্তা গার্ড' : 'Anti-Fraud'}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-indigo-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>HMAC Token</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ad Providers Comparison Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>
                  {lang === 'bn'
                    ? '১. শীর্ষ ভিডিও অ্যাড নেটওয়ার্কগুলোর পর্যালোচনা'
                    : '1. Top Rewarded Ad Networks Compared'}
                </span>
              </h4>
              <span className="text-[11px] text-slate-400">
                {lang === 'bn' ? 'বাংলাদেশ ও গ্লোবাল ট্রাফিক' : 'BD & Global Traffic'}
              </span>
            </div>

            {/* Provider 1: Monetag */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0d1526] border border-amber-500/30 dark:border-amber-500/30 shadow-md relative overflow-hidden group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-black text-base border border-amber-500/30">
                    M
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">Monetag</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-bold border border-amber-500/30">
                        {lang === 'bn' ? '🏆 সবচেয়ে বেশি রিকমেন্ডেড' : '🏆 Top Pick'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {lang === 'bn' ? 'সাবেক PropellerAds - রিওয়ার্ডেডের জন্য সেরা' : 'Formerly PropellerAds'}
                    </span>
                  </div>
                </div>

                <a
                  href="https://monetag.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition cursor-pointer shadow-xs"
                >
                  <span>{lang === 'bn' ? 'একাউন্ট খুলুন' : 'Visit Monetag'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">{lang === 'bn' ? 'অনুমোদন' : 'Approval'}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {lang === 'bn' ? 'তাৎক্ষণিক (০ ট্রাফিক)' : 'Instant (No min.)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">{lang === 'bn' ? 'ফিল রেট (BD)' : 'Fill Rate'}</span>
                  <span className="font-bold text-emerald-500">৯৯.৫% (প্রায় ১০০%)</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">{lang === 'bn' ? 'মিনিমাম পেআউট' : 'Min Payout'}</span>
                  <span className="font-bold text-sky-400">$5.00 USD</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">{lang === 'bn' ? 'পেমেন্ট মাধ্যম' : 'Payment'}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                    PayPal, Skrill, Bank
                  </span>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-[#090f1d] p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                {lang === 'bn'
                  ? '💡 কেন বেছে নিবেন: কোনো ট্রাফিক বা ভিজিটর ভলিউমের শর্ত নেই। ৫ মিনিটেই একাউন্ট একটিভ হয়। এদের "Rewarded Interstitial" ও "In-Page Push" ফরম্যাট বাংলাদেশ ও এশিয়ান ট্রাফিকে সবচেয়ে বেশি বিজ্ঞাপনের ম্যাচ এনে দেয়।'
                  : '💡 Why choose it: No traffic restrictions, instant activation, and industry-leading fill rates for regional traffic with Rewarded Interstitial format.'}
              </p>
            </div>

            {/* Provider 2: Adsterra */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0d1526] border border-slate-200 dark:border-[#1e293b] shadow-md relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center font-black text-base border border-sky-500/30">
                    A
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">Adsterra</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-bold border border-sky-500/30">
                        {lang === 'bn' ? '⚡ দ্রুত ক্রিপ্টো পেআউট' : '⚡ Fast Crypto Payout'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {lang === 'bn' ? 'সোশ্যাল বার ও VAST ভিডিও ফরম্যাট' : 'Social Bar & VAST Video'}
                    </span>
                  </div>
                </div>

                <a
                  href="https://adsterra.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-black transition cursor-pointer"
                >
                  <span>{lang === 'bn' ? 'একাউন্ট খুলুন' : 'Visit Adsterra'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">{lang === 'bn' ? 'অনুমোদন' : 'Approval'}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {lang === 'bn' ? 'তাৎক্ষণিক (১ মিনিট)' : 'Instant'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">{lang === 'bn' ? 'ফিল রেট (BD)' : 'Fill Rate'}</span>
                  <span className="font-bold text-emerald-500">৯৮%</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">{lang === 'bn' ? 'মিনিমাম পেআউট' : 'Min Payout'}</span>
                  <span className="font-bold text-sky-400">$5.00 USD</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">{lang === 'bn' ? 'পেমেন্ট মাধ্যম' : 'Payment'}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">USDT, WebMoney, Wire</span>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-[#090f1d] p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                {lang === 'bn'
                  ? '💡 কেন বেছে নিবেন: যদি আপনি উপার্জিত টাকা সরাসরি USDT (Crypto) বা WebMoney-তে ক্যাশআউট করতে চান। নতুন সাইটে কোনো ঝামেলা ছাড়াই সহজে ভিডিও প্রি-রোল এবং সোশ্যাল বার দিয়ে শুরু করা যায়।'
                  : '💡 Why choose it: Best option for developers wanting crypto (USDT) payouts, lightweight scripts, and direct smartlinks.'}
              </p>
            </div>

            {/* Provider 3: Google AdSense / Ad Manager */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0d1526] border border-slate-200 dark:border-[#1e293b] shadow-md relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center font-black text-base border border-rose-500/30">
                    G
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                        Google AdSense / H5 Ads
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
                        {lang === 'bn' ? '💰 সর্বোচ্চ CPM' : '💰 Highest CPM'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {lang === 'bn' ? 'অফিসিয়াল ওয়েব রিওয়ার্ডেড বিজ্ঞাপন' : 'Official Web Rewarded Ads'}
                    </span>
                  </div>
                </div>

                <a
                  href="https://adsense.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-black transition cursor-pointer"
                >
                  <span>{lang === 'bn' ? 'অ্যাডসেন্স দেখুন' : 'Visit AdSense'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">{lang === 'bn' ? 'অনুমোদন' : 'Approval'}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {lang === 'bn' ? '১-২ সপ্তাহ (রিভিউ)' : '1-2 weeks'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">{lang === 'bn' ? 'ফিল রেট (BD)' : 'Fill Rate'}</span>
                  <span className="font-bold text-emerald-500">৯৫%+</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">{lang === 'bn' ? 'মিনিমাম পেআউট' : 'Min Payout'}</span>
                  <span className="font-bold text-sky-400">$100 USD</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">{lang === 'bn' ? 'পেমেন্ট মাধ্যম' : 'Payment'}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                    {lang === 'bn' ? 'লোকাল ব্যাংক ডিপোজিট' : 'Direct Local Bank Wire'}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-[#090f1d] p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                {lang === 'bn'
                  ? '💡 কেন জেনে রাখা দরকার: গুগলের "H5 Rewarded Ads" ওয়েব অ্যাপের জন্য সবচেয়ে বেশি রেভিনিউ এনে দেয়। তবে এর জন্য সাইটে কন্টেন্ট পলিসি পূরণ করতে হয় এবং এপ্রুভাল পেতে সময় লাগে। দীর্ঘমেয়াদে সবচেয়ে নির্ভরযোগ্য মাধ্যম।'
                  : '💡 Note: AdSense H5 Rewarded Web Ads offer top monetization tiers and direct bank deposits, but require rigorous site approval.'}
              </p>
            </div>
          </div>

          {/* 4-Step Integration Pipeline */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-[#162035] shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-amber-500" />
              <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {lang === 'bn'
                  ? '২. কীভাবে এই প্ল্যাটফর্মে ভিডিও অ্যাড ইন্টিগ্রেট করবেন?'
                  : '2. Step-by-Step Integration Guide'}
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Step 1 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                    ১
                  </span>
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {lang === 'bn' ? 'অ্যাকাউন্ট ও ডোমেইন যোগ' : 'Register & Add Domain'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {lang === 'bn'
                    ? 'Monetag বা Adsterra-তে বিনামূল্যে সাইন-আপ করে আপনার ওয়েবসাইটের ডোমেইন যুক্ত করুন।'
                    : 'Sign up for free at Monetag or Adsterra and add your live website URL.'}
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                    ২
                  </span>
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {lang === 'bn' ? 'Rewarded Ad ট্যাগ সংগ্রহ' : 'Create Rewarded Zone'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {lang === 'bn'
                    ? 'অ্যাড ফরম্যাট থেকে "Rewarded Interstitial" বা "Video Ad" সিলেক্ট করে Zone ID বা স্ক্রিপ্ট কোড কপি করুন।'
                    : 'Select "Rewarded Interstitial" or "Video Ad" and copy your Zone ID or snippet.'}
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                    ৩
                  </span>
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {lang === 'bn' ? 'অ্যাডমিন প্যানেলে কনফিগারেশন' : 'Admin Panel Setup'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {lang === 'bn'
                    ? 'আমাদের অ্যাডমিন ড্যাশবোর্ডের "Ad Settings" ট্যাবে গিয়ে প্রোভাইডার সিলেক্ট করে Ad Unit ID পেস্ট করুন।'
                    : 'Go to Admin Dashboard > Ad Settings, select your provider, and paste the unit ID.'}
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                    ৪
                  </span>
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {lang === 'bn' ? 'রিওয়ার্ড মান ও ইউজার লিমিট' : 'Reward Value & Limits'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {lang === 'bn'
                    ? 'প্রতি ভিডিও দেখার জন্য কত USD পাবেন (যেমন $0.01) এবং বিরতি (Cooldown) সেট করে সেভ করুন। ব্যস!'
                    : 'Set the payout per completion (e.g. $0.01) and cooldown timer. Done!'}
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Code Snippet Tabs */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-[#1e2e42] shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-amber-500" />
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  {lang === 'bn' ? 'কোড ও স্ক্রিপ্ট উদাহরণ (Developer Snippets)' : 'Developer Snippets'}
                </span>
              </div>

              {/* Snippet Picker */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#080d17] p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px]">
                <button
                  onClick={() => setActiveCodeSnippet('monetag')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    activeCodeSnippet === 'monetag'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Monetag SDK
                </button>
                <button
                  onClick={() => setActiveCodeSnippet('adsterra')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    activeCodeSnippet === 'adsterra'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Adsterra Tag
                </button>
                <button
                  onClick={() => setActiveCodeSnippet('server')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    activeCodeSnippet === 'server'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Anti-Fraud Server
                </button>
              </div>
            </div>

            {/* Code Block Container */}
            <div className="relative rounded-2xl bg-[#090d16] border border-slate-800 p-4 font-mono text-[11px] sm:text-xs text-slate-300 overflow-x-auto">
              <button
                onClick={() => handleCopySnippet(codeSnippets[activeCodeSnippet])}
                className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-sans font-bold flex items-center gap-1 cursor-pointer transition shadow-xs border border-slate-700"
              >
                {copiedSnippet ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">{lang === 'bn' ? 'কপি হয়েছে' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-400" />
                    <span>{lang === 'bn' ? 'কপি কোড' : 'Copy'}</span>
                  </>
                )}
              </button>

              <pre className="whitespace-pre overflow-x-auto pb-2 text-slate-300">
                {codeSnippets[activeCodeSnippet]}
              </pre>
            </div>
          </div>

          {/* Regional CPM & Revenue Insights */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-[#162035] shadow-xl space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {lang === 'bn'
                  ? '৩. আঞ্চলিক ট্রাফিকে প্রত্যাশিত CPM ও উপার্জন'
                  : '3. Regional CPM & Earning Expectations'}
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 uppercase font-black">
                    <th className="py-2.5 px-3">{lang === 'bn' ? 'অ্যাড ফরম্যাট' : 'Ad Format'}</th>
                    <th className="py-2.5 px-3">{lang === 'bn' ? 'বাংলাদেশ / এশিয়া CPM' : 'BD / Regional CPM'}</th>
                    <th className="py-2.5 px-3">{lang === 'bn' ? 'গ্লোবাল / ইউএসএ CPM' : 'Tier-1 (US/EU) CPM'}</th>
                    <th className="py-2.5 px-3">{lang === 'bn' ? 'ব্যবহার উপযোগিতা' : 'Best Suited For'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-amber-500" />
                      <span>Rewarded Video</span>
                    </td>
                    <td className="py-3 px-3 text-emerald-500 font-bold">$1.20 - $3.50+</td>
                    <td className="py-3 px-3 text-sky-400 font-bold">$8.00 - $22.00+</td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                      {lang === 'bn' ? 'Watch & Earn (সর্বোচ্চ ইউজার রিটেনশন)' : 'Watch & Earn rewards'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Tv className="w-3.5 h-3.5 text-sky-400" />
                      <span>Rewarded Interstitial</span>
                    </td>
                    <td className="py-3 px-3 text-emerald-500 font-bold">$0.90 - $2.40</td>
                    <td className="py-3 px-3 text-sky-400 font-bold">$6.00 - $16.00</td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                      {lang === 'bn' ? 'বট ডিপ্লয় বা পেইজ ট্রানজিশনে' : 'App transitions & actions'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Social Bar / Push</span>
                    </td>
                    <td className="py-3 px-3 text-emerald-500 font-bold">$0.40 - $1.20</td>
                    <td className="py-3 px-3 text-sky-400 font-bold">$3.00 - $7.50</td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                      {lang === 'bn' ? 'বিজ্ঞাপন নোটিফিকেশনে' : 'Lightweight notification alerts'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Specific FAQ Q&A Accordion */}
          <div className="space-y-3">
            <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-500" />
              <span>
                {lang === 'bn'
                  ? '৪. রিওয়ার্ড অ্যাড সম্পর্কিত সাধারণ প্রশ্নোত্তর'
                  : '4. Frequently Asked Questions about Reward Ads'}
              </span>
            </h4>

            {/* Q1 */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1526] border border-slate-200 dark:border-[#1e293b] shadow-xs">
              <button
                onClick={() => toggleAdFaq('ad-net-best')}
                className="w-full flex items-center justify-between text-left gap-3 cursor-pointer"
              >
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  {lang === 'bn'
                    ? 'আমাদের দেশের জন্য Monetag নাকি Adsterra কোনটি দিয়ে শুরু করা ভালো হবে?'
                    : 'Should I start with Monetag or Adsterra for Bangladesh traffic?'}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    openAdFaqId === 'ad-net-best' ? 'rotate-180 text-amber-500' : ''
                  }`}
                />
              </button>
              {openAdFaqId === 'ad-net-best' && (
                <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                  {lang === 'bn'
                    ? 'আপনি যদি প্রথমবার শুরু করতে চান, তবে Monetag (পূর্বে PropellerAds) দিয়ে শুরু করা সবচেয়ে সহজ ও কার্যকর। কারণ এদের Rewarded Interstitial ফরম্যাটটি বাংলাদেশ, ভারত সহ পুরো দক্ষিণ এশিয়ায় প্রায় ১০০% ফিল রেট দেয় এবং ন্যূনতম $5 হলেই PayPal বা লোকাল ব্যাংকে পেআউট পাওয়া যায়।'
                    : 'Monetag is generally recommended as the easiest starting point because its Rewarded Interstitial format delivers nearly 100% fill rates in South Asia and cashouts start at just $5.'}
                </p>
              )}
            </div>

            {/* Q2 */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1526] border border-slate-200 dark:border-[#1e293b] shadow-xs">
              <button
                onClick={() => toggleAdFaq('ad-fraud')}
                className="w-full flex items-center justify-between text-left gap-3 cursor-pointer"
              >
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  {lang === 'bn'
                    ? 'ইউজাররা যাতে কোনো বট বা অটোমেটেড স্ক্রিপ্ট দিয়ে ভিডিও স্কিপ না করে তার কী নিরাপত্তা আছে?'
                    : 'How is ad fraud and robotic bot skipping prevented?'}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    openAdFaqId === 'ad-fraud' ? 'rotate-180 text-amber-500' : ''
                  }`}
                />
              </button>
              {openAdFaqId === 'ad-fraud' && (
                <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                  {lang === 'bn'
                    ? 'আমাদের সিস্টেমে সার্ভার-সাইড ক্রিপ্টোগ্রাফিক সেশন আইডি ইস্যু করা হয়। ইউজার ভিডিও সম্পূর্ণ দেখার পূর্বে (যেমন ১৫-৩০ সেকেন্ডের আগে) রিকোয়েস্ট পাঠালে সার্ভার স্বয়ংক্রিয়ভাবে রিওয়ার্ড বাতিল করে দেয়। এছাড়াও প্রতিটি অ্যাডের মাঝে বাধ্যতামূলক ৪৫-৬০ সেকেন্ড কুলডাউন পিরিয়ড এবং দিনে নির্দিষ্ট লিমিট থাকে।'
                    : 'The server issues unique HMAC cryptographic session tokens. If a user attempts to claim the reward prematurely without watching the full duration, the request is rejected immediately. Cooldown timers and daily limits further enforce compliance.'}
                </p>
              )}
            </div>

            {/* Q3 */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1526] border border-slate-200 dark:border-[#1e293b] shadow-xs">
              <button
                onClick={() => toggleAdFaq('ad-activation-time')}
                className="w-full flex items-center justify-between text-left gap-3 cursor-pointer"
              >
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  {lang === 'bn'
                    ? 'স্ক্রিপ্ট বা Ad Unit ID বসানোর পর অ্যাড চালু হতে কতক্ষণ সময় লাগে?'
                    : 'How long does it take for ads to start displaying after setup?'}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    openAdFaqId === 'ad-activation-time' ? 'rotate-180 text-amber-500' : ''
                  }`}
                />
              </button>
              {openAdFaqId === 'ad-activation-time' && (
                <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                  {lang === 'bn'
                    ? 'Monetag বা Adsterra-র ক্ষেত্রে সাধারণত ৫ থেকে ১০ মিনিটের মধ্যে লাইভ বিজ্ঞাপন প্লে হওয়া শুরু হয়। আপনি সরাসরি "Watch & Earn" পেজে গিয়ে একটি টেস্ট প্লে করলেই লাইভ দেখতে পাবেন।'
                    : 'For Monetag and Adsterra, live ad feeds typically start serving within 5-10 minutes after saving your Ad Unit ID.'}
                </p>
              )}
            </div>

            {/* Q4 */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1526] border border-slate-200 dark:border-[#1e293b] shadow-xs">
              <button
                onClick={() => toggleAdFaq('ad-wallet-use')}
                className="w-full flex items-center justify-between text-left gap-3 cursor-pointer"
              >
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  {lang === 'bn'
                    ? 'ভিডিও অ্যাড দেখে উপার্জিত ডলার দিয়ে ইউজাররা কী কী করতে পারে?'
                    : 'What can users do with dollars earned from watching ads?'}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    openAdFaqId === 'ad-wallet-use' ? 'rotate-180 text-amber-500' : ''
                  }`}
                />
              </button>
              {openAdFaqId === 'ad-wallet-use' && (
                <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                  {lang === 'bn'
                    ? 'উপার্জিত ডলার ইউজারের ইন-অ্যাপ ওয়ালেটে যোগ হয়। সেই ব্যালেন্স দিয়ে তারা বিনামূল্যে টেলিগ্রাম বট হোস্টিং প্ল্যান চালু করতে পারে, বটের মেমোরি বাড়াতে পারে, কিংবা এডমিনের অনুমোদন সাপেক্ষে বিকাশ/নগদে ক্যাশআউট করতে পারে।'
                    : 'Earnings are credited to user wallets, allowing them to purchase or renew bot hosting plans, expand RAM/storage, or withdraw via admin payout mechanisms.'}
                </p>
              )}
            </div>
          </div>

          {/* Bottom Action Cards */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
              <span className="text-slate-800 dark:text-slate-200 font-bold">
                {lang === 'bn'
                  ? 'সরাসরি ভিডিও অ্যাড দেখে ইনকাম টেস্ট করতে চান?'
                  : 'Want to test watching rewarded ads right now?'}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onNavigateToRewards && (
                <button
                  onClick={onNavigateToRewards}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{lang === 'bn' ? 'Watch & Earn পেজে যান' : 'Go to Watch & Earn'}</span>
                </button>
              )}
              <button
                onClick={() => setActiveTab('contact')}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition"
              >
                <span>{lang === 'bn' ? 'সাপোর্টে প্রশ্ন করুন' : 'Ask Support'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
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
                  ? 'বট ডিপ্লয় ও ভিডিও অ্যাড গাইড দেখতে FAQ অথবা অ্যাড গাইড ট্যাব দেখুন।'
                  : 'Check our FAQ & Reward Ads guide for instant technical walk-throughs.'}
              </span>
            </div>
            <button
              onClick={() => setActiveTab('reward_ads')}
              className="text-amber-500 font-bold hover:underline shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <span>{lang === 'bn' ? 'অ্যাড গাইড' : 'Ads Guide'}</span>
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
                      ? 'সমস্যার বিষয় (যেমন: বট ডিপ্লয় করতে পারছি না / ভিডিও অ্যাড ইস্যু)'
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
