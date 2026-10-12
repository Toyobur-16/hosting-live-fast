import React, { useState, useEffect } from 'react';
import {
  Play,
  Film,
  Sparkles,
  Wallet,
  CheckCircle2,
  ArrowRight,
  Globe,
  Bot,
  ShieldCheck,
  Zap,
  ExternalLink,
  HelpCircle,
  X,
  CreditCard
} from 'lucide-react';

export interface VideoInfo {
  embedUrl: string | null;
  directVideoUrl?: string | null;
  platform: 'youtube' | 'drive' | 'vimeo' | 'facebook' | 'direct' | 'unknown';
  rawUrl: string;
}

/**
 * Normalizes any video URL (YouTube, Vimeo, Google Drive, direct MP4, iframe tag)
 * into a functional embeddable URL and platform metadata.
 */
export function parseVideoUrl(input?: string): VideoInfo {
  if (!input || typeof input !== 'string') {
    return { embedUrl: null, platform: 'unknown', rawUrl: '' };
  }
  let clean = input.trim();
  if (!clean) {
    return { embedUrl: null, platform: 'unknown', rawUrl: '' };
  }

  // 1. If user pasted a full HTML <iframe> code
  if (clean.includes('<iframe') && clean.includes('src=')) {
    const srcMatch = clean.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      clean = srcMatch[1].trim();
    }
  }

  // 2. Direct video files (.mp4, .webm, .ogg, .mov, .m4v)
  if (/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(clean)) {
    return {
      embedUrl: clean,
      directVideoUrl: clean,
      platform: 'direct',
      rawUrl: clean
    };
  }

  // 3. YouTube extraction
  let ytId: string | null = null;

  // Check URL query parameters for v=...
  const vParamMatch = clean.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (vParamMatch && vParamMatch[1]) {
    ytId = vParamMatch[1];
  }

  // Check youtu.be/ID
  if (!ytId) {
    const youtuBeMatch = clean.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (youtuBeMatch && youtuBeMatch[1]) {
      ytId = youtuBeMatch[1];
    }
  }

  // Check /embed/, /shorts/, /live/, /v/
  if (!ytId) {
    const embedOrShortsMatch = clean.match(/(?:youtube(?:-nocookie)?\.com\/(?:embed|shorts|live|v)\/)([a-zA-Z0-9_-]{11})/);
    if (embedOrShortsMatch && embedOrShortsMatch[1]) {
      ytId = embedOrShortsMatch[1];
    }
  }

  // Check if raw 11-character video ID was given
  if (!ytId && /^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    ytId = clean;
  }

  if (ytId) {
    return {
      embedUrl: `https://www.youtube.com/embed/${ytId}?rel=0&enablejsapi=1`,
      platform: 'youtube',
      rawUrl: clean
    };
  }

  // 4. Google Drive
  const gDriveMatch = clean.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gDriveMatch && gDriveMatch[1]) {
    return {
      embedUrl: `https://drive.google.com/file/d/${gDriveMatch[1]}/preview`,
      platform: 'drive',
      rawUrl: clean
    };
  }

  // 5. Vimeo
  const vimeoMatch = clean.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      platform: 'vimeo',
      rawUrl: clean
    };
  }

  // 6. Facebook Video
  if (clean.includes('facebook.com') && (clean.includes('/videos/') || clean.includes('/watch') || clean.includes('fb.watch'))) {
    return {
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(clean)}&show_text=0`,
      platform: 'facebook',
      rawUrl: clean
    };
  }

  // 7. General URL with http/https
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return {
      embedUrl: clean,
      platform: 'unknown',
      rawUrl: clean
    };
  }

  return { embedUrl: null, platform: 'unknown', rawUrl: clean };
}

export function getEmbedVideoUrl(url?: string): string | null {
  const info = parseVideoUrl(url);
  return info.embedUrl;
}

/**
 * Universal video player component that renders either a native <video> tag
 * for direct MP4/WebM files or an <iframe> with proper permissions for YouTube, Drive, etc.
 */
export function VideoEmbedPlayer({
  url,
  title = 'Video Player',
  className = 'w-full h-full',
  autoPlay = false
}: {
  url?: string;
  title?: string;
  className?: string;
  autoPlay?: boolean;
}) {
  const info = parseVideoUrl(url);

  if (!info.embedUrl) {
    return null;
  }

  if (info.platform === 'direct' && info.directVideoUrl) {
    return (
      <video
        src={info.directVideoUrl}
        controls
        autoPlay={autoPlay}
        playsInline
        className={`${className} bg-black object-contain`}
      >
        Your browser does not support the video tag.
      </video>
    );
  }

  const embedSrc =
    autoPlay && info.platform === 'youtube' && !info.embedUrl.includes('autoplay=1')
      ? `${info.embedUrl}&autoplay=1`
      : info.embedUrl;

  return (
    <iframe
      src={embedSrc}
      title={title}
      className={`${className} border-0`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    />
  );
}

export interface HostingTutorialSectionProps {
  lang?: 'bn' | 'en' | string;
  videoUrl?: string;
  onNavigateToWallet?: () => void;
  onNavigateToPlans?: () => void;
  onNavigateToDeploy?: () => void;
  defaultOpenVideo?: boolean;
  type?: 'general' | 'website' | 'plans';
}

export function HostingTutorialSection({
  lang = 'bn',
  videoUrl: initialVideoUrl,
  onNavigateToWallet,
  onNavigateToPlans,
  onNavigateToDeploy,
  defaultOpenVideo = false,
  type = 'general'
}: HostingTutorialSectionProps) {
  const [showVideoModal, setShowVideoModal] = useState(defaultOpenVideo);
  const [videoUrl, setVideoUrl] = useState<string | undefined>(initialVideoUrl);

  // Sync with prop and auto-fetch from site-settings if not provided
  useEffect(() => {
    if (initialVideoUrl) {
      setVideoUrl(initialVideoUrl);
      return;
    }

    // Try reading cached site settings
    try {
      const cached = localStorage.getItem('hlf_site_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        const candidate =
          type === 'website'
            ? parsed.websiteVideoUrl || parsed.hostingVideoUrl
            : parsed.hostingVideoUrl || parsed.websiteVideoUrl;
        if (candidate) {
          setVideoUrl(candidate);
        }
      }
    } catch {}

    // Fetch live from server
    fetch('/api/site-settings')
      .then((res) => res.json())
      .then((data) => {
        const s = data?.settings || data;
        const candidate =
          type === 'website'
            ? s?.websiteVideoUrl || s?.hostingVideoUrl
            : s?.hostingVideoUrl || s?.websiteVideoUrl;
        if (candidate) {
          setVideoUrl(candidate);
        }
      })
      .catch(() => {});

    // Listen to live broadcast update
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const s = customEvent.detail;
      if (s) {
        const candidate =
          type === 'website'
            ? s?.websiteVideoUrl || s?.hostingVideoUrl
            : s?.hostingVideoUrl || s?.websiteVideoUrl;
        if (candidate) {
          setVideoUrl(candidate);
        }
      }
    };
    window.addEventListener('site-settings-updated', handleUpdate);
    return () => window.removeEventListener('site-settings-updated', handleUpdate);
  }, [initialVideoUrl, type]);

  const embedUrl = getEmbedVideoUrl(videoUrl);

  const steps = [
    {
      step: 1,
      titleBn: 'ওয়ালেটে ব্যালেন্স ডিপোজিট করুন',
      titleEn: 'Deposit Balance to Wallet',
      descBn: 'বিকাশ, নগদ বা Binance Pay দিয়ে ইনস্ট্যান্ট ব্যালেন্স যোগ করুন।',
      descEn: 'Add instant balance via bKash, Nagad, or Binance Pay.',
      icon: Wallet,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/30'
    },
    {
      step: 2,
      titleBn: 'পছন্দের হোস্টিং প্ল্যান বেছে নিন',
      titleEn: 'Select Your Hosting Plan',
      descBn: '১ মাস, ৩ মাস, ৬ মাস বা ১ বছরের প্রিমিয়াম সার্ভার প্ল্যান সিলেক্ট করুন।',
      descEn: 'Choose 1 Month, 3 Months, 6 Months, or 1 Year hosting package.',
      icon: CreditCard,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10 border-cyan-500/30'
    },
    {
      step: 3,
      titleBn: '১-ক্লিকে ইনস্ট্যান্ট চালু করুন',
      titleEn: '1-Click Instant Activation',
      descBn: '"প্ল্যান চালু করুন" বাটনে চাপ দিলেই ব্যালেন্স থেকে স্বয়ংক্রিয়ভাবে সক্রিয় হবে।',
      descEn: 'Click "Activate Plan" to instantly activate using your wallet balance.',
      icon: Zap,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/30'
    },
    {
      step: 4,
      titleBn: type === 'website' ? 'ওয়েবসাইট লাইভ চালান' : 'বট ২৪/৭ লাইভ চালান',
      titleEn: type === 'website' ? 'Host Website Live' : 'Run Bot 24/7 Live',
      descBn: type === 'website' ? 'ZIP বা ফাইল আপলোড করে নিজস্ব সাইট প্রকাশ করুন।' : 'টেলিগ্রাম বট স্ক্রিপ্ট আপলোড করে লাইভ সার্ভারে চালান।',
      descEn: type === 'website' ? 'Upload HTML/ZIP and get your live run.app URL.' : 'Upload bot script and run non-stop with watchdog.',
      icon: type === 'website' ? Globe : Bot,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/30'
    }
  ];

  return (
    <div className="relative rounded-3xl bg-gradient-to-br from-[#0c1322] via-[#090f1d] to-[#060a14] border border-cyan-500/30 p-5 sm:p-7 shadow-2xl overflow-hidden mb-6 sm:mb-8">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      <div className="relative z-10">
        {/* Header Badge & Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-black tracking-wide uppercase">
              <Film className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lang === 'bn' ? 'ভিডিও টিউটোরিয়াল ও হোস্টিং গাইড' : 'Video Tutorial & Guide'}</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {type === 'website'
                ? (lang === 'bn' ? 'কিভাবে ওয়েবসাইট হোস্ট করবেন ও লাইভ চালাবেন?' : 'How to Host & Publish Websites?')
                : (lang === 'bn' ? 'কিভাবে হোস্টিং নিবেন ও সার্ভিস চালু করবেন?' : 'How to Get Hosting & Activate Services?')}
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {lang === 'bn'
                ? 'নিচের সহজ ৪টি ধাপে আপনি যেকোনো সময় সার্ভিস নিতে পারেন। সম্পূর্ণ প্রক্রিয়াটি সরাসরি দেখতে ভিডিও টিউটোরিয়াল চালু করুন।'
                : 'Follow the 4 simple steps below to purchase hosting anytime, or watch our complete video walkthrough.'}
            </p>
          </div>

          {/* Watch Video Button */}
          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowVideoModal(true)}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs sm:text-sm flex items-center gap-2.5 shadow-lg shadow-red-600/30 transition-all hover:scale-102 active:scale-98 cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
              </div>
              <span>{lang === 'bn' ? 'ভিডিও টিউটোরিয়াল দেখুন' : 'Watch Video Tutorial'}</span>
            </button>
          </div>
        </div>

        {/* 4 Step Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          {steps.map((st) => {
            const Icon = st.icon;
            return (
              <div
                key={st.step}
                className="p-4 rounded-2xl bg-[#080e1b]/80 border border-slate-800/80 hover:border-cyan-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 text-cyan-400 font-black text-xs flex items-center justify-center border border-slate-700">
                      {st.step}
                    </span>
                    <div className={`w-8 h-8 rounded-xl ${st.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${st.color}`} />
                    </div>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white mb-1">
                    {lang === 'bn' ? st.titleBn : st.titleEn}
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {lang === 'bn' ? st.descBn : st.descEn}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Shortcuts Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              {lang === 'bn'
                ? 'ইনস্ট্যান্ট অটো-অ্যাক্টিভেশন • ২৪/৭ রিয়েলটাইম লাইভ সাপোর্ট'
                : 'Instant Auto-Activation • 24/7 Live Support'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToWallet && (
              <button
                type="button"
                onClick={onNavigateToWallet}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'ওয়ালেট টপ-আপ' : 'Top-Up Wallet'}</span>
              </button>
            )}

            {onNavigateToPlans && (
              <button
                type="button"
                onClick={onNavigateToPlans}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>{lang === 'bn' ? 'প্ল্যান দেখুন' : 'View Plans'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {onNavigateToDeploy && (
              <button
                type="button"
                onClick={onNavigateToDeploy}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'ডিপ্লয় করুন' : 'Deploy'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Video Tutorial Modal */}
      {showVideoModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowVideoModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="bg-[#0b1222] border border-cyan-500/40 rounded-3xl max-w-3xl w-full text-slate-100 shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-[#070b14] border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">
                    {type === 'website'
                      ? (lang === 'bn' ? 'ভিডিও টিউটোরিয়াল: কিভাবে ওয়েবসাইট তৈরি করবেন' : 'Video Tutorial: How to Host Websites')
                      : (lang === 'bn' ? 'ভিডিও টিউটোরিয়াল: কিভাবে হোস্টিং নিবেন' : 'Video Tutorial: How to Get Hosting')}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'bn' ? 'সহজেই ওয়ালেট ডিপোজিট করে হোস্টিং চালু করার সম্পূর্ণ গাইড' : 'Complete step-by-step video guide'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {videoUrl && (
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 transition text-xs flex items-center gap-1 font-bold"
                    title={lang === 'bn' ? 'সরাসরি ব্রাউজারে খুলুন' : 'Open in New Tab'}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setShowVideoModal(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video Player Container */}
            <div className="relative aspect-video bg-black w-full flex items-center justify-center">
              {embedUrl ? (
                <VideoEmbedPlayer
                  url={videoUrl}
                  title="Hosting Video Tutorial"
                  className="w-full h-full"
                  autoPlay={true}
                />
              ) : (
                <div className="text-center p-8 max-w-md space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
                    <Film className="w-8 h-8" />
                  </div>
                  <h5 className="text-base font-bold text-white">
                    {lang === 'bn' ? 'হোস্টিং নেওয়ার ভিডিও টিউটোরিয়াল' : 'Hosting Video Tutorial'}
                  </h5>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {lang === 'bn'
                      ? 'এডমিন প্যানেলের সাইট সেটিংস থেকে আপনার ইউটিউব বা ভিডিও লিংক যুক্ত করলে সরাসরি এখানে প্লে হবে।'
                      : 'Add your YouTube or video link in Admin Settings to play it here.'}
                  </p>
                  <div className="p-3 rounded-xl bg-[#0f172a] border border-slate-800 text-left space-y-2 text-xs text-slate-300">
                    <p className="font-bold text-cyan-400">⚡ সংক্ষিপ্ত নির্দেশিকা:</p>
                    <p>১. ওয়ালেটে bKash, Nagad বা Binance Pay দিয়ে ব্যালেন্স যোগ করুন।</p>
                    <p>২. হোস্টিং প্ল্যান পেজে গিয়ে যেকোনো প্ল্যান ইনস্ট্যান্ট চালু করুন।</p>
                    <p>৩. সাথে সাথে টেলিগ্রাম বট বা ওয়েবসাইট লাইভ সার্ভার রেডি হয়ে যাবে!</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#070b14] border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-400">
                {lang === 'bn' ? 'কোনো সহায়তার প্রয়োজন হলে আমাদের সাথে যোগাযোগ করুন।' : 'Need assistance? Reach out to support.'}
              </span>
              <button
                type="button"
                onClick={() => setShowVideoModal(false)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black cursor-pointer transition"
              >
                {lang === 'bn' ? 'ঠিক আছে' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
