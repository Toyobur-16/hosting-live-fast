import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { RewardAdSettings, AdRewardStats } from '../src/types';
import { modifyUserWallet } from './walletManager';

const HOSTED_BOTS_DIR = path.join(process.cwd(), 'hosted_bots');
const AD_SETTINGS_FILE = path.join(HOSTED_BOTS_DIR, 'reward_ad_settings.json');
const AD_REWARDS_FILE = path.join(HOSTED_BOTS_DIR, 'ad_rewards.json');

// In-memory active ad sessions awaiting legitimate completion
interface ActiveSession {
  sessionId: string;
  userId: string;
  startedAt: number;
  rewardAmount: number;
  redeemed: boolean;
}

const activeSessions = new Map<string, ActiveSession>();

export interface AdRewardLog {
  id: string;
  userId: string;
  userEmail?: string;
  rewardAmount: number;
  dateKey: string; // YYYY-MM-DD
  timestamp: string;
  sessionId: string;
}

const DEFAULT_VIDEO_ADS_POOL = [
  'https://www.w3schools.com/html/mov_bbb.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'
];

export function getRewardAdSettings(): RewardAdSettings {
  const defaultSettings: RewardAdSettings = {
    enabled: true,
    rewardAmountUsd: 0.01,
    dailyLimit: 20,
    cooldownSeconds: 0,
    adProvider: 'exoclick',
    appId: process.env.ADMOB_APP_ID || 'ca-app-pub-2943337025131771~1508810719',
    adUnitId: process.env.REWARDED_AD_UNIT_ID || '6042506, 6042500',
    adsterraWebsiteId: '6042506',
    vastTagUrl: 'https://s.magsrv.com/v1/vast.php?idzone=6042506',
    vastTagUrls: [
      'https://s.magsrv.com/v1/vast.php?idzone=6042506',
      'https://s.magsrv.com/v1/vast.php?idz=6042500',
      'https://s.magsrv.com/v1/vast.php?idzone=6042500'
    ],
    videoUrl: DEFAULT_VIDEO_ADS_POOL[2],
    adRedirectUrl: 'https://www.profitableratecpmnetwork.com/d0xhayqy?key=d84637eb2d016c3d3cbe33aed1604ce8',
    adScriptHtml: '<meta http-equiv="Delegate-CH" content="Sec-CH-UA https://s.magsrv.com; Sec-CH-UA-Mobile https://s.magsrv.com; Sec-CH-UA-Arch https://s.magsrv.com; Sec-CH-UA-Model https://s.magsrv.com; Sec-CH-UA-Platform https://s.magsrv.com; Sec-CH-UA-Platform-Version https://s.magsrv.com; Sec-CH-UA-Bitness https://s.magsrv.com; Sec-CH-UA-Full-Version-List https://s.magsrv.com; Sec-CH-UA-Full-Version https://s.magsrv.com;">\nhttps://s.magsrv.com/v1/vast.php?idzone=6042506\nhttps://s.magsrv.com/v1/vast.php?idz=6042500',
    testMode: false
  };

  try {
    if (fs.existsSync(AD_SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(AD_SETTINGS_FILE, 'utf-8'));
      const merged = { ...defaultSettings, ...data, cooldownSeconds: 0 };
      if (!merged.videoUrl || !merged.videoUrl.trim()) {
        merged.videoUrl = DEFAULT_VIDEO_ADS_POOL[2];
      }
      if (!merged.vastTagUrls || !Array.isArray(merged.vastTagUrls) || merged.vastTagUrls.length === 0) {
        merged.vastTagUrls = defaultSettings.vastTagUrls;
      }
      if (!merged.vastTagUrl || !merged.vastTagUrl.trim()) {
        merged.vastTagUrl = merged.vastTagUrls?.[0] || defaultSettings.vastTagUrl;
      }
      return merged;
    }
  } catch (err) {
    console.error('Error loading reward_ad_settings.json:', err);
  }
  return defaultSettings;
}

export function saveRewardAdSettings(settings: Partial<RewardAdSettings>): boolean {
  try {
    if (!fs.existsSync(HOSTED_BOTS_DIR)) {
      fs.mkdirSync(HOSTED_BOTS_DIR, { recursive: true });
    }
    const current = getRewardAdSettings();
    const updated = { ...current, ...settings };
    fs.writeFileSync(AD_SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving reward_ad_settings.json:', err);
    return false;
  }
}

function getRewardLogs(): AdRewardLog[] {
  try {
    if (fs.existsSync(AD_REWARDS_FILE)) {
      const data = JSON.parse(fs.readFileSync(AD_REWARDS_FILE, 'utf-8'));
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.error('Error loading ad_rewards.json:', err);
  }
  return [];
}

function saveRewardLogs(logs: AdRewardLog[]): void {
  try {
    if (!fs.existsSync(HOSTED_BOTS_DIR)) {
      fs.mkdirSync(HOSTED_BOTS_DIR, { recursive: true });
    }
    fs.writeFileSync(AD_REWARDS_FILE, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving ad_rewards.json:', err);
  }
}

function getUtcDateKey(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Get user's reward statistics for today and all time.
 * Users can watch `dailyLimit` (20) ads back-to-back with 0 cooldown between ads 1..19.
 * Once the 20th ad is completed, a 24-hour countdown starts before the next 20 ads unlock.
 */
export function getUserRewardStats(userId: string, currentBalanceUsd = 0): AdRewardStats {
  const settings = getRewardAdSettings();
  const logs = getRewardLogs();
  const dailyLimit = settings.dailyLimit || 20;
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  const nowMs = Date.now();

  const userLogs = logs.filter((l) => l.userId === userId);

  // Walk chronological logs (oldest -> newest) to track 20-ad batches and 24-hour lockouts
  const chronologicalLogs = [...userLogs].reverse();
  let batchCount = 0;
  let batchLockedUntil = 0;
  let currentBatchLogs: AdRewardLog[] = [];

  for (const log of chronologicalLogs) {
    const logTime = new Date(log.timestamp).getTime();
    if (isNaN(logTime)) continue;

    if (batchLockedUntil > 0 && logTime >= batchLockedUntil) {
      batchCount = 0;
      batchLockedUntil = 0;
      currentBatchLogs = [];
    }

    batchCount += 1;
    currentBatchLogs.push(log);

    if (batchCount >= dailyLimit) {
      // 20th ad completed! Start 24-hour countdown from this 20th ad
      batchLockedUntil = logTime + TWENTY_FOUR_HOURS_MS;
    }
  }

  let adsWatchedToday = 0;
  let remainingToday = dailyLimit;
  let nextAvailableAt: number | undefined = undefined;

  if (batchLockedUntil > 0) {
    if (nowMs < batchLockedUntil) {
      // Still within the 24-hour cooldown after completing 20 ads
      adsWatchedToday = dailyLimit;
      remainingToday = 0;
      nextAvailableAt = batchLockedUntil;
    } else {
      // 24 hours have passed since the 20th ad! Reset for a fresh 20-ad batch
      adsWatchedToday = 0;
      remainingToday = dailyLimit;
      nextAvailableAt = undefined;
      currentBatchLogs = [];
    }
  } else {
    // Watching ads 1..19: NO cooldown between individual ads!
    adsWatchedToday = batchCount;
    remainingToday = Math.max(0, dailyLimit - batchCount);
    nextAvailableAt = undefined;
  }

  const todayEarningsUsd = parseFloat(
    currentBatchLogs.reduce((acc, curr) => acc + (curr.rewardAmount || 0), 0).toFixed(4)
  );
  const totalEarningsUsd = parseFloat(
    userLogs.reduce((acc, curr) => acc + (curr.rewardAmount || 0), 0).toFixed(4)
  );

  return {
    adsWatchedToday,
    dailyLimit,
    remainingToday,
    todayEarningsUsd,
    totalEarningsUsd,
    walletBalanceUsd: currentBalanceUsd,
    nextAvailableAt,
    cooldownSeconds: 0,
    rewardPerAd: settings.rewardAmountUsd,
    adsEnabled: settings.enabled,
    adProvider: settings.adProvider,
    appId: settings.appId,
    adUnitId: settings.adUnitId,
    adsterraWebsiteId: settings.adsterraWebsiteId,
    vastTagUrl: settings.vastTagUrl,
    vastTagUrls: settings.vastTagUrls,
    videoUrl: settings.videoUrl,
    adRedirectUrl: settings.adRedirectUrl,
    adScriptHtml: settings.adScriptHtml,
    minDurationSeconds: settings.minDurationSeconds || 15
  };
}

/**
 * Initiates an authorized rewarded ad watch session
 */
export function startAdSession(userId: string): {
  success: boolean;
  sessionId?: string;
  minDurationSeconds?: number;
  rewardAmount?: number;
  nextAvailableSeconds?: number;
  vastTagUrl?: string;
  vastTagUrls?: string[];
  videoUrl?: string;
  adRedirectUrl?: string;
  adScriptHtml?: string;
  adProvider?: string;
  appId?: string;
  adUnitId?: string;
  error?: string;
} {
  const settings = getRewardAdSettings();
  if (!settings.enabled) {
    return { success: false, error: 'বিজ্ঞাপন দেখে আয় করার ফিচারটি বর্তমানে সাময়িকভাবে বন্ধ রয়েছে।' };
  }

  const stats = getUserRewardStats(userId);
  if (stats.nextAvailableAt && Date.now() < stats.nextAvailableAt) {
    const waitSec = Math.ceil((stats.nextAvailableAt - Date.now()) / 1000);
    const hours = Math.floor(waitSec / 3600);
    const minutes = Math.floor((waitSec % 3600) / 60);
    return {
      success: false,
      nextAvailableSeconds: waitSec,
      error: `আপনার ২০টি বিজ্ঞাপন দেখা সম্পন্ন হয়েছে! পরবর্তী ২০টি বিজ্ঞাপন দেখতে ${hours} ঘণ্টা ${minutes} মিনিট অপেক্ষা করুন।`
    };
  }

  if (stats.remainingToday <= 0) {
    return {
      success: false,
      error: `আজকের ${settings.dailyLimit}টি বিজ্ঞাপন দেখা শেষ হয়েছে! ২৪ ঘণ্টা পর আবার ২০টি বিজ্ঞাপন দেখতে পারবেন।`
    };
  }

  // Create single-use cryptographic session
  const sessionId = `ad_sess_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  activeSessions.set(sessionId, {
    sessionId,
    userId,
    startedAt: Date.now(),
    rewardAmount: settings.rewardAmountUsd,
    redeemed: false
  });

  // Automatically clean up stale sessions after 10 minutes
  setTimeout(() => {
    activeSessions.delete(sessionId);
  }, 10 * 60 * 1000);

  const randomPoolVideo =
    DEFAULT_VIDEO_ADS_POOL[Math.floor(Math.random() * DEFAULT_VIDEO_ADS_POOL.length)];
  const chosenVideoUrl =
    settings.videoUrl && !DEFAULT_VIDEO_ADS_POOL.includes(settings.videoUrl)
      ? settings.videoUrl
      : randomPoolVideo;

  return {
    success: true,
    sessionId,
    minDurationSeconds: settings.minDurationSeconds || 15, // minimum watch duration
    rewardAmount: settings.rewardAmountUsd,
    vastTagUrl: settings.vastTagUrl,
    vastTagUrls: settings.vastTagUrls,
    videoUrl: chosenVideoUrl,
    adRedirectUrl: settings.adRedirectUrl,
    adScriptHtml: settings.adScriptHtml,
    adProvider: settings.adProvider,
    appId: settings.appId,
    adUnitId: settings.adUnitId
  };
}

/**
 * Server-side verified completion of a rewarded video ad
 */
export function completeAdSession(
  userId: string,
  sessionId: string,
  userEmail?: string
): {
  success: boolean;
  rewardEarned?: number;
  newBalanceUsd?: number;
  stats?: AdRewardStats;
  error?: string;
} {
  const session = activeSessions.get(sessionId);

  if (!session) {
    return { success: false, error: 'অবৈধ বা মেয়াদোত্তীর্ণ বিজ্ঞাপন সেশন (Invalid or expired ad session)' };
  }

  if (session.userId !== userId) {
    return { success: false, error: 'অনুমোদনহীন অনুরোধ (Unauthorized session owner)' };
  }

  if (session.redeemed) {
    return { success: false, error: 'এই বিজ্ঞাপনের রিওয়ার্ড ইতোমধ্যে গ্রহণ করা হয়েছে (Session already redeemed)' };
  }

  const now = Date.now();
  const elapsedSeconds = (now - session.startedAt) / 1000;

  // Enforce minimum watch duration of 14 seconds to prevent simulated or instant clicks
  if (elapsedSeconds < 14) {
    return {
      success: false,
      error: 'সম্পূর্ণ ভিডিও বিজ্ঞাপন না দেখে রিওয়ার্ড পাওয়া যাবে না (You must watch the full ad)'
    };
  }

  // Double check daily limit
  const settings = getRewardAdSettings();
  const stats = getUserRewardStats(userId);
  if (stats.remainingToday <= 0) {
    return { success: false, error: 'আজকের লিমিট শেষ হয়ে গেছে।' };
  }

  // Mark session as redeemed immediately to prevent race conditions
  session.redeemed = true;
  activeSessions.delete(sessionId);

  // Credit user's wallet
  const walletResult = modifyUserWallet(
    userId,
    session.rewardAmount,
    'ad_reward',
    `Watch & Earn Rewarded Video Ad ($${session.rewardAmount})`,
    'rewarded_ad',
    sessionId
  );

  if (!walletResult.success) {
    return { success: false, error: walletResult.error || 'ওয়ালেটে রিওয়ার্ড জমা করা সম্ভব হয়নি' };
  }

  // Log completed reward
  const logs = getRewardLogs();
  logs.unshift({
    id: `rw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    userEmail: userEmail || '',
    rewardAmount: session.rewardAmount,
    dateKey: getUtcDateKey(),
    timestamp: new Date().toISOString(),
    sessionId
  });
  if (logs.length > 5000) logs.splice(5000);
  saveRewardLogs(logs);

  const updatedStats = getUserRewardStats(userId, walletResult.newBalanceUsd);

  return {
    success: true,
    rewardEarned: session.rewardAmount,
    newBalanceUsd: walletResult.newBalanceUsd,
    stats: updatedStats
  };
}
