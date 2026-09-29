import React, { useState, useEffect, useRef } from 'react';
import {
  Film,
  Play,
  Coins,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Wallet,
  Zap,
  ArrowRight,
  Gift,
  Award,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthUser, AdRewardStats } from '../types';

interface WatchAndEarnPageProps {
  user: AuthUser | null;
  onOpenAuthModal: () => void;
  onNavigateToWallet: () => void;
  onNavigateToPlans: () => void;
  onUserUpdated?: (updatedUser: AuthUser) => void;
  lang?: 'bn' | 'en';
}

export const WatchAndEarnPage = ({
  user,
  onOpenAuthModal,
  onNavigateToWallet,
  onNavigateToPlans,
  onUserUpdated,
  lang = 'bn'
}: WatchAndEarnPageProps) => {
  const [stats, setStats] = useState<AdRewardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Ad Watching Modal State
  const DEFAULT_VIDEO_ADS = [
    'https://n2j9y0x0.bxcdn.net/library/342126/1d38c863ceaac9cb1c656e91234b0cf43ed2db7d.mp4',
    'https://n2j9y0x0.bxcdn.net/library/1001276/06966f9de226ef7ef2f931b239f5008168a80b5d.mp4',
    'https://storage.googleapis.com/gvabox/media/samples/stock.mp4',
    'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-576p.mp4',
    'https://vjs.zencdn.net/v/oceans.mp4'
  ];

  const DEFAULT_EXOCLICK_VAST_URLS = [
    'https://s.magsrv.com/v1/vast.php?idzone=6042506',
    'https://s.magsrv.com/v1/vast.php?idz=6042500',
    'https://s.magsrv.com/v1/vast.php?idzone=6042500'
  ];

  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [watchProgress, setWatchProgress] = useState(0);
  const [adDurationSeconds, setAdDurationSeconds] = useState(15);
  const [remainingAdTime, setRemainingAdTime] = useState(15);
  const [adMuted, setAdMuted] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [adCompletedReady, setAdCompletedReady] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [earlyCloseNotice, setEarlyCloseNotice] = useState<string | null>(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string>('');
  const [activeRedirectUrl, setActiveRedirectUrl] = useState<string>(
    'https://s.magsrv.com/click.php?d=H4sIAAAAAAAAA42PwW6DMAyGn6a3EiWOTeLjLt1hh03aEwQILVILFTDQJD_8ArQThx0mO7KjfL_9x6NGclq0XMbxPhzsywFOKed5VvX1q6nu1_Ade1V2N0mQcayJkYDl0g1j056zazPFrA7DmE15M6iu7WNbPRQWVUogVIa8GMtMzhuQXCOQzgXZL1NBvFuGaxYxKUQAQBDYxao0XDAFLH2kUGMIdR61D0WoV.F_XOg1_iaPT_K4_tA84CWM9xoIFjfJmpbdE_6CZmsFUiUSSmy6yefrxw7fCd3WKL2onkMGdQvnoZ9Wt8v3EwBblXxbk86Udry_CRI7LAzbwhaRY4XeJJtsIrgQbFH9AEUyD87SAQAA'
  );
  const [activeDisplayDomain, setActiveDisplayDomain] = useState<string>('exoclick.com');
  const [activeCtaText, setActiveCtaText] = useState<string>('View More');
  const [activeZoneId, setActiveZoneId] = useState<string>('6042506');
  const [activeAdId, setActiveAdId] = useState<string>('8404570');
  const [vastTrackingEvents, setVastTrackingEvents] = useState<Record<string, string[]>>({});
  const [vastClickTrackingUrls, setVastClickTrackingUrls] = useState<string[]>([]);
  const firedVastEventsRef = useRef<Set<string>>(new Set());
  const watchedVideosHistoryRef = useRef<string[]>([]);
  const adClickCountRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fullScreenContainerRef = useRef<HTMLDivElement | null>(null);

  const getWatchedHistory = (): string[] => {
    try {
      const saved = sessionStorage.getItem('exoclick_watched_videos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          watchedVideosHistoryRef.current = parsed;
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
    return watchedVideosHistoryRef.current;
  };

  const recordWatchedVideo = (videoUrl: string) => {
    if (!videoUrl) return;
    const current = getWatchedHistory().filter((u) => u !== videoUrl);
    // Keep last 4 watched videos in exclusion history so all 5 creatives rotate before repeating
    const updated = [videoUrl, ...current].slice(0, 4);
    watchedVideosHistoryRef.current = updated;
    try {
      sessionStorage.setItem('exoclick_watched_videos', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const pickNextUnseenFallbackVideo = (): string => {
    const history = new Set(getWatchedHistory());
    const unseen = DEFAULT_VIDEO_ADS.filter((u) => !history.has(u));
    if (unseen.length > 0) {
      return unseen[adClickCountRef.current % unseen.length];
    }
    return DEFAULT_VIDEO_ADS[adClickCountRef.current % DEFAULT_VIDEO_ADS.length];
  };

  const fireTrackingUrls = (urls?: string[]) => {
    if (!urls || !Array.isArray(urls)) return;
    const validUrls = urls.filter((u) => u && u.startsWith('http'));
    if (validUrls.length === 0) return;

    validUrls.forEach((u) => {
      try {
        const img = new Image();
        img.referrerPolicy = 'no-referrer-when-downgrade';
        img.src = u;
      } catch {
        fetch(u, { mode: 'no-cors', keepalive: true }).catch(() => {});
      }
    });

    // Also fire via server-side ExoClick proxy with verified Referer so 100% of views register
    fetch('/api/ads/vast-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: validUrls })
    }).catch(() => {});
  };

  const parseClientVastXml = (xmlText: string) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const adId = xmlDoc.querySelector('Ad')?.getAttribute('id')?.trim() || '';

    const impressionUrls: string[] = [];
    xmlDoc.querySelectorAll('Impression').forEach((el) => {
      const val = el.textContent?.trim();
      if (val && val.startsWith('http')) impressionUrls.push(val);
    });

    const wrapperUri = xmlDoc.querySelector('VASTAdTagURI')?.textContent?.trim() || '';

    const mediaCandidates: { url: string; type: string; bitrate: number }[] = [];
    xmlDoc.querySelectorAll('MediaFile').forEach((el) => {
      const url = el.textContent?.trim() || '';
      const type = (el.getAttribute('type') || 'video/mp4').toLowerCase();
      const bitrate = parseInt(el.getAttribute('bitrate') || '0', 10) || 0;
      if (url.startsWith('http')) {
        mediaCandidates.push({ url, type, bitrate });
      }
    });

    mediaCandidates.sort((a, b) => {
      const aMp4 = a.type.includes('mp4') ? 1 : 0;
      const bMp4 = b.type.includes('mp4') ? 1 : 0;
      if (aMp4 !== bMp4) return bMp4 - aMp4;
      return b.bitrate - a.bitrate;
    });

    const clickThroughUrl = xmlDoc.querySelector('ClickThrough')?.textContent?.trim() || '';
    const displayUrl = xmlDoc.querySelector('DisplayUrl')?.textContent?.trim() || '';
    const ctaText =
      xmlDoc.querySelector('MobileText')?.textContent?.trim() ||
      xmlDoc.querySelector('PCText')?.textContent?.trim() ||
      '';

    const clickTrackingUrls: string[] = [];
    xmlDoc.querySelectorAll('ClickTracking').forEach((el) => {
      const val = el.textContent?.trim();
      if (val && val.startsWith('http')) clickTrackingUrls.push(val);
    });

    const trackingEvents: Record<string, string[]> = {};
    const addTrack = (evKey: string, u: string) => {
      if (!trackingEvents[evKey]) trackingEvents[evKey] = [];
      if (!trackingEvents[evKey].includes(u)) trackingEvents[evKey].push(u);
    };

    xmlDoc.querySelectorAll('Tracking').forEach((el) => {
      const ev = el.getAttribute('event')?.trim() || '';
      const id = el.getAttribute('id')?.trim() || '';
      const val = el.textContent?.trim() || '';
      if (!val || !val.startsWith('http')) return;

      if (ev === 'progress') {
        if (id === 'prog_1' || val.includes('progress=0%')) {
          addTrack('start', val);
        } else if (id === 'prog_2' || val.includes('progress=25%')) {
          addTrack('firstQuartile', val);
        } else if (id === 'prog_3' || val.includes('progress=50%')) {
          addTrack('midpoint', val);
        } else if (id === 'prog_4' || val.includes('progress=75%')) {
          addTrack('thirdQuartile', val);
        } else if (id === 'prog_5' || val.includes('progress=100%')) {
          addTrack('complete', val);
        } else {
          addTrack('progress', val);
        }
      } else if (ev) {
        addTrack(ev, val);
      }
    });

    return {
      adId,
      wrapperUri,
      mediaFileUrl: mediaCandidates[0]?.url || '',
      clickThroughUrl,
      displayUrl,
      ctaText,
      impressionUrls,
      clickTrackingUrls,
      trackingEvents
    };
  };

  const resolveExoClickVastVideo = async (candidateUrls: string[], excludedList: string[]) => {
    const excludedSet = new Set(excludedList.filter(Boolean));
    const baseUrls = Array.from(
      new Set([...DEFAULT_EXOCLICK_VAST_URLS, ...candidateUrls].filter((u) => u && u.startsWith('http')))
    );
    const urlsToTry = baseUrls.map(
      (_, idx) => baseUrls[(idx + adClickCountRef.current) % baseUrls.length]
    );

    // 1. Try direct browser fetch first so ExoClick receives client IP + Delegate-CH Sec-CH-UA headers directly
    for (const baseVastUrl of urlsToTry) {
      let currentUrl = baseVastUrl;
      const zoneMatch = baseVastUrl.match(/idzone=(\d+)|idz=(\d+)/i);
      const zoneId = zoneMatch ? (zoneMatch[1] || zoneMatch[2] || '6042506') : '6042506';
      const impressions: string[] = [];
      const clickTracks: string[] = [];
      const events: Record<string, string[]> = {};

      for (let depth = 0; depth < 3; depth++) {
        try {
          const res = await fetch(currentUrl, {
            method: 'GET',
            credentials: 'omit'
          });
          if (!res.ok) break;
          const xmlText = await res.text();
          if (!xmlText || !xmlText.includes('<VAST')) break;

          const parsed = parseClientVastXml(xmlText);
          impressions.push(...parsed.impressionUrls);
          clickTracks.push(...parsed.clickTrackingUrls);
          Object.entries(parsed.trackingEvents).forEach(([k, list]) => {
            if (!events[k]) events[k] = [];
            events[k].push(...list);
          });

          // Only use direct browser creative if it is NOT a repeat of what the user just watched
          if (parsed.mediaFileUrl && !excludedSet.has(parsed.mediaFileUrl)) {
            return {
              adId: parsed.adId || `EXO-${zoneId}`,
              zoneId,
              mediaFileUrl: parsed.mediaFileUrl,
              clickThroughUrl: parsed.clickThroughUrl,
              displayUrl: parsed.displayUrl,
              ctaText: parsed.ctaText,
              impressionUrls: impressions,
              clickTrackingUrls: clickTracks,
              trackingEvents: events
            };
          }

          if (parsed.wrapperUri && parsed.wrapperUri.startsWith('http')) {
            currentUrl = parsed.wrapperUri;
            continue;
          }
          break;
        } catch {
          break;
        }
      }
    }

    // 2. Query backend ExoClick VAST resolver (which rotates device/IP profiles & guarantees a non-repeating creative)
    try {
      const primaryUrl = urlsToTry[0] || DEFAULT_EXOCLICK_VAST_URLS[0];
      const excludeVideo = excludedList[0] || '';
      const excludeListParam = excludedList.join(',');
      const res = await fetch(
        `/api/ads/vast-resolve?url=${encodeURIComponent(primaryUrl)}&excludeVideo=${encodeURIComponent(excludeVideo)}&excludeList=${encodeURIComponent(excludeListParam)}&_t=${Date.now()}`
      );
      const data = await res.json();
      if (data && data.success && data.mediaFileUrl) {
        return {
          adId: (data.adId as string) || '8404570',
          zoneId: (data.zoneId as string) || '6042506',
          mediaFileUrl: data.mediaFileUrl as string,
          clickThroughUrl: (data.clickThroughUrl as string) || '',
          displayUrl: (data.displayUrl as string) || 'exoclick.com',
          ctaText: (data.ctaText as string) || 'View More',
          impressionUrls: (data.impressionUrls as string[]) || [],
          clickTrackingUrls: (data.clickTrackingUrls as string[]) || [],
          trackingEvents: (data.trackingEvents as Record<string, string[]>) || {}
        };
      }
    } catch {
      // Ignore
    }

    return null;
  };

  const formatCooldownTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return lang === 'bn'
        ? `${hrs} ঘণ্টা ${mins} মি. ${secs} সে.`
        : `${hrs}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return lang === 'bn' ? `${mins} মি. ${secs} সে.` : `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const fetchStats = async () => {
    if (!user) return;
    setLoadingStats(true);
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/rewards/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
        if (data.stats.adRedirectUrl) {
          setActiveRedirectUrl(data.stats.adRedirectUrl);
        }
        // Strictly only show 24h countdown after all 20 ads are completed (never a 30s cooldown after 1 ad)
        if (data.stats.remainingToday <= 0 && data.stats.nextAvailableAt) {
          const diff = Math.ceil((data.stats.nextAvailableAt - Date.now()) / 1000);
          setCooldownTime(diff > 60 ? diff : 0);
        } else {
          setCooldownTime(0);
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    document
      .querySelectorAll('script[data-adsterra-injected], script[src*="profitableratecpmnetwork.com"]')
      .forEach((el) => el.remove());
    fetchStats();
    // Pre-fetch real ExoClick VAST ad on mount so a fresh non-repeating video is ready immediately
    resolveExoClickVastVideo(DEFAULT_EXOCLICK_VAST_URLS, getWatchedHistory()).then((vastResult) => {
      if (vastResult && vastResult.mediaFileUrl) {
        setActiveVideoUrl(vastResult.mediaFileUrl);
        if (vastResult.zoneId) setActiveZoneId(vastResult.zoneId);
        if (vastResult.adId) setActiveAdId(vastResult.adId);
        if (vastResult.clickThroughUrl) setActiveRedirectUrl(vastResult.clickThroughUrl);
        if (vastResult.displayUrl) setActiveDisplayDomain(vastResult.displayUrl);
        if (vastResult.ctaText) setActiveCtaText(vastResult.ctaText);
      }
    });
  }, [user]);

  // 24-hour cooldown countdown tick (only active after 20 ads are watched)
  useEffect(() => {
    if (cooldownTime <= 0) return;
    const interval = setInterval(() => {
      setCooldownTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          fetchStats();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownTime]);

  // Rewarded Video Watch Timer Tick + VAST Quartile Event Tracking
  useEffect(() => {
    if (!isWatchingAd || adCompletedReady) return;

    const timer = setInterval(() => {
      setRemainingAdTime((prev) => {
        const nextTime = prev - 1;
        const progress = Math.min(100, Math.round(((adDurationSeconds - nextTime) / adDurationSeconds) * 100));
        setWatchProgress(progress);

        // Fire VAST tracking pixels at start, 25%, 50%, 75%, and 100%
        if (progress >= 5 && !firedVastEventsRef.current.has('start')) {
          firedVastEventsRef.current.add('start');
          fireTrackingUrls(vastTrackingEvents.start);
          fireTrackingUrls(vastTrackingEvents.creativeView);
        }
        if (progress >= 25 && !firedVastEventsRef.current.has('firstQuartile')) {
          firedVastEventsRef.current.add('firstQuartile');
          fireTrackingUrls(vastTrackingEvents.firstQuartile);
        }
        if (progress >= 50 && !firedVastEventsRef.current.has('midpoint')) {
          firedVastEventsRef.current.add('midpoint');
          fireTrackingUrls(vastTrackingEvents.midpoint);
        }
        if (progress >= 75 && !firedVastEventsRef.current.has('thirdQuartile')) {
          firedVastEventsRef.current.add('thirdQuartile');
          fireTrackingUrls(vastTrackingEvents.thirdQuartile);
        }

        if (nextTime <= 0) {
          clearInterval(timer);
          if (!firedVastEventsRef.current.has('complete')) {
            firedVastEventsRef.current.add('complete');
            fireTrackingUrls(vastTrackingEvents.complete);
          }
          setEarlyCloseNotice(null);
          setAdCompletedReady(true);
          return 0;
        }
        return nextTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isWatchingAd, adCompletedReady, adDurationSeconds, vastTrackingEvents]);

  const handleStartWatchAd = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setError(null);
    setSuccessMsg(null);
    setEarlyCloseNotice(null);

    if (!user) {
      onOpenAuthModal();
      return;
    }

    if (user.emailVerified === false && user.role !== 'admin') {
      setError(
        lang === 'bn'
          ? 'বিজ্ঞাপন দেখে ব্যালেন্স পেতে প্রথমে আপনার ইমেইল ভেরিফাই করুন।'
          : 'Please verify your email before watching ads.'
      );
      return;
    }

    if (stats && stats.remainingToday <= 0 && cooldownTime > 0) {
      setError(
        lang === 'bn'
          ? `আপনার ২০টি বিজ্ঞাপন দেখা শেষ হয়েছে! পরবর্তী ২০টি বিজ্ঞাপন দেখতে অপেক্ষা করুন (${formatCooldownTime(cooldownTime)})।`
          : `20 ads completed! Next 20 ads unlock in ${formatCooldownTime(cooldownTime)}.`
      );
      return;
    }

    // Track ad click count & history so the same video NEVER repeats on consecutive clicks
    const excludedVideos = getWatchedHistory();
    const immediateFallbackVideo = pickNextUnseenFallbackVideo();
    adClickCountRef.current += 1;

    // Open Full-Screen Video Ad Player IMMEDIATELY with a non-repeated video stream
    const initialVideoToPlay =
      activeVideoUrl && !excludedVideos.includes(activeVideoUrl)
        ? activeVideoUrl
        : immediateFallbackVideo;

    setActiveVideoUrl(initialVideoToPlay);
    setAdDurationSeconds(15);
    setRemainingAdTime(15);
    setWatchProgress(0);
    setVideoPlaying(false);
    setAdCompletedReady(false);
    setAdMuted(false);
    setVastTrackingEvents({});
    setVastClickTrackingUrls([]);
    firedVastEventsRef.current = new Set();
    setCurrentSessionId('starting');
    sessionIdRef.current = 'starting';
    setIsWatchingAd(true);

    // Attempt native browser Fullscreen in addition to 100vw x 100vh fixed overlay
    setTimeout(() => {
      try {
        if (fullScreenContainerRef.current && document.fullscreenElement !== fullScreenContainerRef.current) {
          fullScreenContainerRef.current.requestFullscreen?.().catch(() => {});
        }
      } catch {
        // Ignore if blocked by iframe policy
      }
    }, 50);

    // Resolve fresh ExoClick VAST Tags (idzone=6042506 & idz=6042500) excluding recently watched videos
    const initialVastCandidates = [
      ...(stats?.vastTagUrls || []),
      stats?.vastTagUrl || '',
      ...DEFAULT_EXOCLICK_VAST_URLS
    ].filter(Boolean);

    resolveExoClickVastVideo(initialVastCandidates, excludedVideos).then((vastResult) => {
      if (vastResult && vastResult.mediaFileUrl) {
        setActiveVideoUrl(vastResult.mediaFileUrl);
        recordWatchedVideo(vastResult.mediaFileUrl);
        if (vastResult.zoneId) setActiveZoneId(vastResult.zoneId);
        if (vastResult.adId) setActiveAdId(vastResult.adId);
        if (vastResult.clickThroughUrl) {
          setActiveRedirectUrl(vastResult.clickThroughUrl);
        }
        if (vastResult.displayUrl) {
          setActiveDisplayDomain(vastResult.displayUrl);
        }
        if (vastResult.ctaText) {
          setActiveCtaText(vastResult.ctaText);
        }
        setVastTrackingEvents(vastResult.trackingEvents || {});
        setVastClickTrackingUrls(vastResult.clickTrackingUrls || []);
        fireTrackingUrls(vastResult.impressionUrls);
      } else {
        recordWatchedVideo(initialVideoToPlay);
      }
    });

    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/rewards/start-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {});
        }
        setIsWatchingAd(false);
        setCurrentSessionId(null);
        sessionIdRef.current = null;
        throw new Error(data.error || 'Failed to start ad session');
      }

      setCurrentSessionId(data.sessionId);
      sessionIdRef.current = data.sessionId;
      if (data.adRedirectUrl || stats?.adRedirectUrl) {
        setActiveRedirectUrl((prev) => prev || data.adRedirectUrl || stats?.adRedirectUrl || '');
      }
    } catch (err: any) {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
      setIsWatchingAd(false);
      setCurrentSessionId(null);
      sessionIdRef.current = null;
      setError(err.message || 'Error starting ad');
    }
  };

  const handleCrossCloseClick = async () => {
    if (!adCompletedReady) {
      setEarlyCloseNotice(
        lang === 'bn'
          ? `⚠️ সম্পূর্ণ অ্যাড দেখার পর ক্রস (✕) আইকনে ক্লিক করতে পারবেন! আরো ${remainingAdTime} সেকেন্ড দেখুন।`
          : `⚠️ Please watch the full ad first! Cross (✕) unlocks in ${remainingAdTime}s.`
      );
      return;
    }
    await handleClaimReward();
  };

  const handleClaimReward = async () => {
    if (isClaiming) return;
    setIsClaiming(true);
    setError(null);

    try {
      // Wait briefly if session ID is still initializing
      let activeSid = sessionIdRef.current || currentSessionId;
      for (let i = 0; i < 10 && (!activeSid || activeSid === 'starting'); i++) {
        await new Promise((r) => setTimeout(r, 200));
        activeSid = sessionIdRef.current || currentSessionId;
      }

      if (!activeSid || activeSid === 'starting') {
        throw new Error('Ad session could not be verified. Please try again.');
      }

      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/rewards/ad-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId: activeSid })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Reward validation failed');
      }

      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
      setIsWatchingAd(false);
      const remainingAfter = data.stats?.remainingToday ?? 0;
      setSuccessMsg(
        lang === 'bn'
          ? remainingAfter > 0
            ? `🎉 অভিনন্দন! $${data.rewardEarned || 0.01} USD আপনার ওয়ালেটে যোগ হয়েছে! এখনই পরের ভিডিও অ্যাডটি দেখতে পারেন (${remainingAfter}টি বাকি)।`
            : `🎉 অভিনন্দন! আপনার আজকের ২০টি বিজ্ঞাপন দেখা সম্পূর্ণ হয়েছে। ২৪ ঘণ্টা পর আবার ২০টি বিজ্ঞাপন দেখতে পারবেন!`
          : remainingAfter > 0
            ? `🎉 Success! $${data.rewardEarned || 0.01} USD credited! You can immediately watch the next video ad (${remainingAfter} left).`
            : `🎉 All 20 ads completed! You can watch 20 more ads after 24 hours.`
      );

      if (data.stats) {
        setStats(data.stats);
        // Never trigger a 30s cooldown after 1 ad! Only start 24h timer when all 20 ads are completed.
        if (data.stats.remainingToday <= 0 && data.stats.nextAvailableAt) {
          const diff = Math.ceil((data.stats.nextAvailableAt - Date.now()) / 1000);
          setCooldownTime(diff > 60 ? diff : 0);
        } else {
          setCooldownTime(0);
        }
      }

      if (user && data.newBalanceUsd !== undefined) {
        const updatedUser = { ...user, balanceUsd: data.newBalanceUsd };
        localStorage.setItem('bot_auth_user', JSON.stringify(updatedUser));
        if (onUserUpdated) onUserUpdated(updatedUser);
      }
    } catch (err: any) {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
      setIsWatchingAd(false);
      setError(err.message || 'Could not claim reward');
    } finally {
      setIsClaiming(false);
    }
  };

  const rewardPerAd = stats?.rewardPerAd || 0.01;
  const adsWatchedToday = stats?.adsWatchedToday || 0;
  const dailyLimit = stats?.dailyLimit || 20;
  const remainingToday = stats?.remainingToday !== undefined ? stats.remainingToday : 20;
  const todayEarnings = stats?.todayEarningsUsd || 0;
  const totalEarnings = stats?.totalEarningsUsd || 0;
  const currentBalance = user?.balanceUsd || 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 text-slate-100">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br from-[#0c1427] via-[#091122] to-[#040813] border border-cyan-500/25 shadow-2xl mb-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold mb-3">
              <Film className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? '🎬 ওয়াচ ভিডিও অ্যান্ড আর্ন' : '🎬 Watch Ads & Earn USD'}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {lang === 'bn' ? 'ভিডিও বিজ্ঞাপন দেখে ফ্রি USD আয় করুন' : 'Watch Video Ads & Earn Real USD'}
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-xl leading-relaxed">
              {lang === 'bn'
                ? 'প্রতিটি ১৫ সেকেন্ডের স্পন্সরড ভিডিও বিজ্ঞাপন দেখলে সাথে সাথে পাবেন $০.০১ USD ওয়ালেট রিওয়ার্ড। অর্জিত ব্যালেন্স দিয়ে প্রিমিয়াম বট ও ওয়েবসাইট হোস্টিং প্ল্যান সক্রিয় করুন!'
                : 'Watch short 15-second sponsored rewarded video ads and get $0.01 USD instantly added to your wallet balance. Use your earnings to activate premium bot and website hosting plans!'}
            </p>
          </div>

          <div className="flex flex-col items-center sm:items-end w-full md:w-auto">
            <div className="bg-[#0e172a]/90 border border-slate-700/60 p-4 rounded-2xl text-center md:text-right w-full sm:w-auto shadow-inner">
              <p className="text-xs text-slate-400 font-medium">{lang === 'bn' ? 'আপনার USD ওয়ালেট ব্যালেন্স' : 'Your USD Wallet Balance'}</p>
              <div className="text-2xl font-black text-emerald-400 flex items-center justify-center md:justify-end gap-1.5 mt-1 font-mono">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <span>${currentBalance.toFixed(2)} USD</span>
              </div>
              <button
                onClick={onNavigateToWallet}
                className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 font-medium cursor-pointer"
              >
                <span>{lang === 'bn' ? 'ওয়ালেট ট্রানজেকশন হিস্ট্রি' : 'View Ledger History'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-950/50 border border-emerald-500/50 rounded-2xl text-emerald-300 text-sm flex items-center gap-3 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="flex-1 font-semibold">{successMsg}</div>
          <button
            onClick={onNavigateToPlans}
            className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-emerald-400 cursor-pointer"
          >
            {lang === 'bn' ? 'প্ল্যান কিনুন' : 'Buy Plan'}
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-rose-950/50 border border-rose-500/50 rounded-2xl text-rose-300 text-sm flex items-center gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#0b1222] border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>{lang === 'bn' ? 'প্রতি বিজ্ঞাপনে রিওয়ার্ড' : 'Reward per Video'}</span>
          </div>
          <p className="text-xl font-bold text-amber-400 font-mono">+${rewardPerAd.toFixed(2)} USD</p>
          <p className="text-[11px] text-slate-500 mt-1">{lang === 'bn' ? 'ইনস্ট্যান্ট ওয়ালেট ক্রেডিট' : 'Instant credit'}</p>
        </div>

        <div className="bg-[#0b1222] border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Film className="w-4 h-4 text-cyan-400" />
            <span>{lang === 'bn' ? 'আজকের বিজ্ঞাপন' : 'Watched Today'}</span>
          </div>
          <p className="text-xl font-bold text-cyan-300 font-mono">
            {adsWatchedToday} / {dailyLimit}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {remainingToday} {lang === 'bn' ? 'টি বাকি আছে' : 'remaining today'}
          </p>
        </div>

        <div className="bg-[#0b1222] border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>{lang === 'bn' ? 'আজকের আয়' : "Today's Earnings"}</span>
          </div>
          <p className="text-xl font-bold text-emerald-400 font-mono">${todayEarnings.toFixed(2)}</p>
          <p className="text-[11px] text-slate-500 mt-1">{lang === 'bn' ? 'আজকের মোট উপার্জন' : 'Earned today'}</p>
        </div>

        <div className="bg-[#0b1222] border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Award className="w-4 h-4 text-purple-400" />
            <span>{lang === 'bn' ? 'সর্বমোট আর্নিং' : 'Total Earnings'}</span>
          </div>
          <p className="text-xl font-bold text-purple-400 font-mono">${totalEarnings.toFixed(2)}</p>
          <p className="text-[11px] text-slate-500 mt-1">{lang === 'bn' ? 'বিজ্ঞাপন থেকে মোট' : 'Lifetime ad earnings'}</p>
        </div>
      </div>

      {/* Primary Action Card */}
      <div className="bg-[#0b1222] border border-slate-800 rounded-3xl p-6 md:p-8 text-center relative overflow-hidden shadow-xl mb-8">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/25 text-slate-950">
            <Play className="w-10 h-10 fill-current translate-x-0.5" />
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
            {lang === 'bn' ? '🎬 স্পন্সরড ভিডিও বিজ্ঞাপন দেখুন' : '🎬 Watch Sponsored Video Ad'}
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            {lang === 'bn'
              ? 'নিচের বাটনে ক্লিক করে ১৫ সেকেন্ডের ভিডিও বিজ্ঞাপনটি সম্পূর্ণ দেখুন এবং সাথে সাথে $০.০১ USD জিতে নিন।'
              : 'Click the button below to watch a 15-second rewarded video and receive $0.01 USD immediately.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={handleStartWatchAd}
              disabled={cooldownTime > 0 || (stats !== null && stats.remainingToday <= 0)}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 active:scale-[0.98] text-slate-950 font-black text-base rounded-2xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cooldownTime > 0 || (stats && stats.remainingToday <= 0) ? (
                <>
                  <Clock className="w-5 h-5 animate-spin" />
                  <span>
                    {lang === 'bn'
                      ? `২৪ ঘণ্টার টাইমার চলছে (${formatCooldownTime(cooldownTime)})`
                      : `24h Cooldown (${formatCooldownTime(cooldownTime)})`}
                  </span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>{lang === 'bn' ? 'Watch Video Ad (+$0.01 USD)' : 'Watch Video Ad (+$0.01 USD)'}</span>
                </>
              )}
            </button>

            {activeRedirectUrl && (
              <a
                href={activeRedirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => fireTrackingUrls(vastClickTrackingUrls)}
                className="w-full sm:w-auto px-6 py-4 bg-[#111c33] hover:bg-[#162441] border border-amber-500/40 text-amber-300 font-bold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{lang === 'bn' ? '🔗 স্পন্সর ডাইরেক্ট অ্যাড লিংক' : '🔗 Visit Sponsor Direct Link'}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            )}
          </div>

          {cooldownTime > 0 ? (
            <p className="text-xs text-amber-400 mt-3 font-semibold">
              ⏱{' '}
              {lang === 'bn'
                ? `আপনার ২০টি বিজ্ঞাপন দেখা শেষ হয়েছে! পরবর্তী ২০টি বিজ্ঞাপন চালু হবে: ${formatCooldownTime(cooldownTime)} পর`
                : `20 ads completed! Next 20 ads unlock in: ${formatCooldownTime(cooldownTime)}`}
            </p>
          ) : (
            <p className="text-xs text-emerald-400/90 mt-3 font-medium">
              ✨{' '}
              {lang === 'bn'
                ? `কোনো বিরতি ছাড়াই পরপর ২০টি ভিডিও বিজ্ঞাপন দেখতে পারবেন (${remainingToday}টি বাকি) — ২০টি শেষ হলে ২৪ ঘণ্টার টাইমার শুরু হবে`
                : `Watch 20 video ads back-to-back with no wait (${remainingToday} left) — 24h timer starts after 20 ads`}
            </p>
          )}

          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'bn' ? 'সার্ভার ভেরিফায়েড রিওয়ার্ড' : 'Server Verified Security'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>{lang === 'bn' ? 'ইনস্ট্যান্ট ওয়ালেট ডিপোজিট' : 'Instant Wallet Credit'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-purple-400" />
              <span>{lang === 'bn' ? 'প্ল্যান কেনার সুযোগ' : 'Use for Hosting Plans'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Screen Rewarded Video Ad Player (Opens 100% Full Screen & Unlocks Cross [X] Button After Watching Complete Ad) */}
      <AnimatePresence>
        {isWatchingAd && (
          <div
            ref={fullScreenContainerRef}
            className="fixed inset-0 z-[99999] w-screen h-screen bg-black text-white flex flex-col justify-between overflow-hidden select-none"
          >
            {/* Top Progress Strip */}
            <div className="relative z-30 w-full bg-slate-900/90 h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-teal-300 h-full transition-all duration-1000 ease-linear"
                style={{ width: `${watchProgress}%` }}
              />
            </div>

            {/* Top Overlay Controls Bar (Ad Badge, Sound Toggle, Countdown & Cross [X] Close Button) */}
            <div className="relative z-30 flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-b from-black/90 via-black/60 to-transparent">
              {/* Left: Live Ad Badge + Sound Toggle */}
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-xs font-bold text-amber-300 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>
                    {lang === 'bn' ? 'স্পন্সরড অ্যাড' : 'Sponsored Ad'} (ID: {activeZoneId}) •{' '}
                    {remainingAdTime > 0 ? `${remainingAdTime}s` : lang === 'bn' ? 'সম্পন্ন' : 'Completed'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const nextMuted = !adMuted;
                    setAdMuted(nextMuted);
                    if (videoRef.current) {
                      videoRef.current.muted = nextMuted;
                      videoRef.current.play().catch(() => {});
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 hover:bg-black/90 backdrop-blur-md border border-white/15 text-xs font-bold text-white cursor-pointer transition shadow-lg"
                >
                  {adMuted ? (
                    <>
                      <VolumeX className="w-4 h-4 text-rose-400" />
                      <span className="hidden sm:inline">{lang === 'bn' ? 'সাউন্ড চালু করুন' : 'Unmute'}</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                      <span className="hidden sm:inline">{lang === 'bn' ? 'সাউন্ড চালু' : 'Sound On'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right: Countdown & Cross (X) Button — Only unlocks after full ad is watched */}
              <div className="flex items-center gap-2.5">
                {adCompletedReady ? (
                  <button
                    type="button"
                    onClick={handleCrossCloseClick}
                    disabled={isClaiming}
                    title={lang === 'bn' ? 'ক্রস চাপুন ও রিওয়ার্ড নিন' : 'Close Ad & Claim Reward'}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/40 ring-4 ring-emerald-400/30 transition-all cursor-pointer"
                  >
                    {isClaiming ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>{lang === 'bn' ? 'যোগ হচ্ছে...' : 'Claiming...'}</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {lang === 'bn' ? 'রিওয়ার্ড সহ বন্ধ করুন (+$0.01)' : 'Claim +$0.01 & Close'}
                        </span>
                        <span className="w-7 h-7 rounded-full bg-slate-950 text-white flex items-center justify-center">
                          <X className="w-4 h-4 stroke-[3]" />
                        </span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCrossCloseClick}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/80 border border-white/20 text-slate-300 text-xs font-mono font-bold cursor-not-allowed opacity-90 shadow-lg"
                  >
                    <span className="text-amber-400 font-extrabold">
                      {lang === 'bn' ? `${remainingAdTime} সেকেন্ড বাকি` : `Reward in ${remainingAdTime}s`}
                    </span>
                    <span className="w-6 h-6 rounded-full bg-white/10 text-slate-400 flex items-center justify-center">
                      <X className="w-3.5 h-3.5" />
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Warning Toast if user taps Cross (X) before ad completes */}
            {earlyCloseNotice && !adCompletedReady && (
              <div className="relative z-30 mx-auto px-4 py-2 rounded-full bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs font-bold shadow-xl animate-bounce">
                {earlyCloseNotice}
              </div>
            )}

            {/* Full-Screen Real ExoClick VAST Video Stream Container */}
            <div className="absolute inset-0 z-10 w-full h-full bg-black flex items-center justify-center">
              {!videoPlaying && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050914] z-10">
                  <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin mb-3" />
                  <p className="text-sm font-bold text-slate-200">
                    {lang === 'bn' ? 'স্পন্সরড ভিডিও বিজ্ঞাপন লোড হচ্ছে...' : 'Loading Sponsored Video Ad...'}
                  </p>
                </div>
              )}

              <video
                ref={videoRef}
                key={activeVideoUrl || DEFAULT_VIDEO_ADS[0]}
                src={activeVideoUrl || DEFAULT_VIDEO_ADS[0]}
                autoPlay
                playsInline
                muted={adMuted}
                loop
                preload="auto"
                onClick={() => {
                  if (videoRef.current) {
                    if (adMuted) {
                      setAdMuted(false);
                      videoRef.current.muted = false;
                    }
                    videoRef.current.play().catch(() => {});
                  }
                }}
                onPlaying={() => setVideoPlaying(true)}
                onLoadedData={(e) => {
                  setVideoPlaying(true);
                  const vid = e.currentTarget;
                  vid.play().catch(() => {
                    // If browser blocks unmuted autoplay, fallback to muted playback immediately
                    setAdMuted(true);
                    vid.muted = true;
                    vid.play().catch(() => {});
                  });
                }}
                onError={() => {
                  const fallbackNext = pickNextUnseenFallbackVideo();
                  if (activeVideoUrl !== fallbackNext) {
                    setActiveVideoUrl(fallbackNext);
                  } else if (activeVideoUrl !== DEFAULT_VIDEO_ADS[0]) {
                    setActiveVideoUrl(DEFAULT_VIDEO_ADS[0]);
                  }
                }}
                className="w-full h-full object-contain md:object-cover bg-black cursor-pointer"
              />
            </div>

            {/* Bottom Full-Screen Overlay Bar (Advertiser Link + Completion Instruction) */}
            <div className="relative z-30 mt-auto px-4 sm:px-8 py-5 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-cyan-300" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-white">
                    {adCompletedReady
                      ? lang === 'bn'
                        ? '✅ সম্পূর্ণ অ্যাড দেখা শেষ! উপরের ক্রস (✕) আইকনে ক্লিক করে বের হন ও রিওয়ার্ড নিন'
                        : '✅ Ad Complete! Click the top-right Cross (✕) icon to claim your reward & close'
                      : lang === 'bn'
                        ? `🎬 ফুল-স্ক্রিন অ্যাড চলছে... আরো ${remainingAdTime} সেকেন্ড দেখুন`
                        : `🎬 Watching full-screen ad... ${remainingAdTime}s remaining`}
                  </p>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {lang === 'bn'
                      ? `স্পন্সর: ${activeDisplayDomain || 'ExoClick Ad Network'} • জোন আইডি: #${activeZoneId} (Ad #${activeAdId}) • রিওয়ার্ড: +$0.01 USD`
                      : `Sponsor: ${activeDisplayDomain || 'ExoClick Ad Network'} • Zone ID: #${activeZoneId} (Ad #${activeAdId}) • Reward: +$0.01 USD`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-center">
                {activeRedirectUrl && (
                  <a
                    href={activeRedirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => fireTrackingUrls(vastClickTrackingUrls)}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg transition flex items-center gap-2 cursor-pointer"
                  >
                    <span>{activeCtaText || (lang === 'bn' ? 'ভিজিট সাইট' : 'Visit Site')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                )}

                {adCompletedReady && (
                  <button
                    type="button"
                    onClick={handleCrossCloseClick}
                    disabled={isClaiming}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-4 h-4 stroke-[3]" />
                    <span>{lang === 'bn' ? 'ক্রস (✕) / বন্ধ করুন' : 'Close (✕)'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
