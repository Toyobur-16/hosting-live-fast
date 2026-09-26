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

export function getRewardAdSettings(): RewardAdSettings {
  const defaultSettings: RewardAdSettings = {
    enabled: true,
    rewardAmountUsd: 0.01,
    dailyLimit: 20,
    cooldownSeconds: 45,
    adProvider: 'custom_network',
    adUnitId: process.env.REWARDED_AD_UNIT_ID || 'rewarded_video_cloud_unit'
  };

  try {
    if (fs.existsSync(AD_SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(AD_SETTINGS_FILE, 'utf-8'));
      return { ...defaultSettings, ...data };
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
 * Get user's reward statistics for today and all time
 */
export function getUserRewardStats(userId: string, currentBalanceUsd = 0): AdRewardStats {
  const settings = getRewardAdSettings();
  const logs = getRewardLogs();
  const dateKey = getUtcDateKey();

  const userLogs = logs.filter((l) => l.userId === userId);
  const todayLogs = userLogs.filter((l) => l.dateKey === dateKey);

  const adsWatchedToday = todayLogs.length;
  const remainingToday = Math.max(0, settings.dailyLimit - adsWatchedToday);
  const todayEarningsUsd = parseFloat(todayLogs.reduce((acc, curr) => acc + (curr.rewardAmount || 0), 0).toFixed(4));
  const totalEarningsUsd = parseFloat(userLogs.reduce((acc, curr) => acc + (curr.rewardAmount || 0), 0).toFixed(4));

  // Check last completed ad for cooldown calculation
  let nextAvailableAt: number | undefined = undefined;
  if (userLogs.length > 0) {
    const lastTimestamp = new Date(userLogs[0].timestamp).getTime();
    const cooldownMs = settings.cooldownSeconds * 1000;
    const readyAt = lastTimestamp + cooldownMs;
    if (Date.now() < readyAt) {
      nextAvailableAt = readyAt;
    }
  }

  return {
    adsWatchedToday,
    dailyLimit: settings.dailyLimit,
    remainingToday,
    todayEarningsUsd,
    totalEarningsUsd,
    walletBalanceUsd: currentBalanceUsd,
    nextAvailableAt,
    cooldownSeconds: settings.cooldownSeconds,
    rewardPerAd: settings.rewardAmountUsd,
    adsEnabled: settings.enabled
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
  error?: string;
} {
  const settings = getRewardAdSettings();
  if (!settings.enabled) {
    return { success: false, error: 'বিজ্ঞাপন দেখে আয় করার ফিচারটি বর্তমানে সাময়িকভাবে বন্ধ রয়েছে।' };
  }

  const stats = getUserRewardStats(userId);
  if (stats.remainingToday <= 0) {
    return {
      success: false,
      error: `আজকের দৈনিক লিমিট (${settings.dailyLimit}টি বিজ্ঞাপন) শেষ হয়েছে! আগামীকাল আবার আসুন।`
    };
  }

  if (stats.nextAvailableAt && Date.now() < stats.nextAvailableAt) {
    const waitSec = Math.ceil((stats.nextAvailableAt - Date.now()) / 1000);
    return {
      success: false,
      nextAvailableSeconds: waitSec,
      error: `অনুগ্রহ করে ${waitSec} সেকেন্ড অপেক্ষা করুন (কুলডাউন চলছে)`
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

  return {
    success: true,
    sessionId,
    minDurationSeconds: 15, // minimum watch duration
    rewardAmount: settings.rewardAmountUsd
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
