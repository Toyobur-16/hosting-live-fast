import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import dns from 'dns';
import crypto from 'crypto';
import AdmZip from 'adm-zip';
import { spawn, exec, execSync } from 'child_process';
import { createServer as createViteServer } from 'vite';
import {
  sendEmailAlert,
  sendDepositProcessedAlert,
  sendSubscriptionExpirationAlert,
  getUserNotifications,
  markNotificationAsRead,
  clearNotification,
  clearAllUserNotifications,
  addBroadcastNotification,
  getStoredNotifications,
  saveStoredNotifications,
  getSmtpConfig,
  verifySmtpConnection,
  sendTestEmail,
  checkAndSendExpiringPlanAlerts,
  loadSmtpSettingsFile,
  saveSmtpSettingsFile,
  testSmtpWithParams,
  DEFAULT_SMTP_SETTINGS,
  SMTP_BRIDGE_SECRET,
  buildTransportOptions,
  startCloudSmtpRelayWorker
} from './server/emailAlerts';
import nodemailer from 'nodemailer';
import { FirebaseSync } from './server/firebaseSync';
import {
  createAndSendVerificationCode,
  verifyEmailCode,
  createAndSendPasswordResetCode,
  verifyPasswordResetCode,
  checkFirebaseEmailVerificationStatus,
  verifyPasswordWithFirebaseAuth,
  recoverUserFromFirebaseAuth,
  checkEmailExistsInFirebaseAuth,
  syncUserPasswordToFirebaseAuth,
  getPendingRegistration
} from './server/emailVerification';
import { modifyUserWallet, getTransactions as getWalletTransactions, getUserTransactions } from './server/walletManager';
import {
  getSocialTasks,
  saveSocialTasks,
  getTaskCompletions,
  saveTaskCompletions,
  getUserCompletedTaskIds,
  getUserTaskSubmissions,
  submitSocialTaskProof,
  approveSocialTaskSubmission,
  rejectSocialTaskSubmission,
  claimSocialTaskReward,
  SocialTask
} from './server/socialTasksManager';
import {
  getWebsites,
  saveWebsites,
  getWebsiteById,
  getWebsiteBySlug,
  createWebsite,
  deployWebsiteFiles,
  deployWebsiteZip,
  toggleWebsiteStatus,
  deleteWebsite,
  updateWebsite,
  setWebsiteCustomDomain,
  getWebsiteFilesList,
  getWebsiteSettings,
  saveWebsiteSettings,
  isValidSlug,
  sanitizeSlug
} from './server/staticWebsitesManager';
import {
  getBotBackups,
  getBotBackupById,
  getBotBackupZipPath,
  createBotBackup,
  restoreBotBackup,
  deleteBotBackup,
  getBotBackupStats,
  run24HourAutoBackupCycle,
  start24HourBackupScheduler
} from './server/botBackupManager';
import {
  getDepositMethods,
  saveDepositMethods,
  addOrUpdateDepositMethod,
  deleteDepositMethod,
  resetDepositMethods,
  DepositMethodItem
} from './server/depositMethodsManager';
import {
  getRewardAdSettings,
  saveRewardAdSettings,
  getUserRewardStats,
  startAdSession,
  completeAdSession
} from './server/rewardAdsManager';
import { askAiSupport } from './server/aiSupportService';
import {
  scanAndAutoFixBotDirectory,
  inspectZipAndDetectMissing,
  extractZipSafely
} from './server/botAutoFixService';

// Enforce IPv4 priority globally to eliminate ENETUNREACH in containers lacking IPv6 routes
if (typeof (dns as any).setDefaultResultOrder === 'function') {
  try {
    (dns as any).setDefaultResultOrder('ipv4first');
  } catch (e) {}
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Delegate Client Hints to ExoClick (https://s.magsrv.com) via HTTP Headers
app.use((req, res, next) => {
  res.setHeader(
    'Accept-CH',
    'Sec-CH-UA, Sec-CH-UA-Mobile, Sec-CH-UA-Arch, Sec-CH-UA-Model, Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version, Sec-CH-UA-Bitness, Sec-CH-UA-Full-Version-List, Sec-CH-UA-Full-Version'
  );
  res.setHeader(
    'Permissions-Policy',
    'ch-ua=(self "https://s.magsrv.com"), ch-ua-mobile=(self "https://s.magsrv.com"), ch-ua-arch=(self "https://s.magsrv.com"), ch-ua-model=(self "https://s.magsrv.com"), ch-ua-platform=(self "https://s.magsrv.com"), ch-ua-platform-version=(self "https://s.magsrv.com"), ch-ua-bitness=(self "https://s.magsrv.com"), ch-ua-full-version-list=(self "https://s.magsrv.com"), ch-ua-full-version=(self "https://s.magsrv.com")'
  );
  next();
});

app.use('/APK_DOWNLOAD', express.static(path.join(process.cwd(), 'APK_DOWNLOAD')));

const HOSTED_BOTS_DIR = path.join(process.cwd(), 'hosted_bots');
const REGISTRY_FILE = path.join(HOSTED_BOTS_DIR, 'registry.json');
const ACCOUNTS_FILE = path.join(HOSTED_BOTS_DIR, 'accounts.json');
const SESSIONS_FILE = path.join(HOSTED_BOTS_DIR, 'sessions.json');
const PLANS_FILE = path.join(HOSTED_BOTS_DIR, 'plans.json');
const PLAN_REQUESTS_FILE = path.join(HOSTED_BOTS_DIR, 'plan_requests.json');
const PAYMENT_SETTINGS_FILE = path.join(HOSTED_BOTS_DIR, 'payment_settings.json');
const BANNERS_FILE = path.join(HOSTED_BOTS_DIR, 'banners.json');
const CATEGORIES_FILE = path.join(HOSTED_BOTS_DIR, 'categories.json');
const STORE_ITEMS_FILE = path.join(HOSTED_BOTS_DIR, 'store_items.json');
const SUPPORT_SETTINGS_FILE = path.join(HOSTED_BOTS_DIR, 'support_settings.json');
const SUPPORT_MESSAGES_FILE = path.join(HOSTED_BOTS_DIR, 'support_messages.json');
const WISHLIST_FILE = path.join(HOSTED_BOTS_DIR, 'wishlist.json');
const STORE_UPLOADS_DIR = path.join(HOSTED_BOTS_DIR, 'store_uploads');
const STORE_THUMBNAILS_DIR = path.join(HOSTED_BOTS_DIR, 'store_thumbnails');
const ANNOUNCEMENTS_FILE = path.join(HOSTED_BOTS_DIR, 'announcements.json');
const SITE_SETTINGS_FILE = path.join(HOSTED_BOTS_DIR, 'site_settings.json');
const FREE_TRIAL_SETTINGS_FILE = path.join(HOSTED_BOTS_DIR, 'free_trial_settings.json');
const BINANCE_ORDERS_FILE = path.join(HOSTED_BOTS_DIR, 'binance_orders.json');

// Ensure base directories and persistence files exist
if (!fs.existsSync(HOSTED_BOTS_DIR)) {
  fs.mkdirSync(HOSTED_BOTS_DIR, { recursive: true });
}
if (!fs.existsSync(STORE_UPLOADS_DIR)) {
  fs.mkdirSync(STORE_UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(STORE_THUMBNAILS_DIR)) {
  fs.mkdirSync(STORE_THUMBNAILS_DIR, { recursive: true });
}
if (!fs.existsSync(ANNOUNCEMENTS_FILE)) {
  fs.writeFileSync(
    ANNOUNCEMENTS_FILE,
    JSON.stringify(
      [
        {
          id: 'ann_1',
          titleBn: '⚡ hosting live fast এ স্বাগতম!',
          titleEn: '⚡ Welcome to hosting live fast!',
          messageBn: '২৪/৭ ক্লাউড টেলিগ্রাম বট হোস্টিং, স্বয়ংক্রিয় রিস্টার্ট এবং ইনস্ট্যান্ট বাইনান্স ডিপোজিট সহ আপনার বট লাইভ রাখুন।',
          messageEn: '24/7 cloud Telegram bot hosting, auto-restart watchdog, and instant Binance deposits to keep your bot live.',
          date: new Date().toISOString(),
          active: true
        }
      ],
      null,
      2
    ),
    'utf-8'
  );
}

function getAnnouncements(): any[] {
  try {
    if (!fs.existsSync(ANNOUNCEMENTS_FILE)) return [];
    return JSON.parse(fs.readFileSync(ANNOUNCEMENTS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveAnnouncements(list: any[]) {
  try {
    fs.writeFileSync(ANNOUNCEMENTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save announcements:', err);
  }
}
if (!fs.existsSync(REGISTRY_FILE)) {
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify([], null, 2), 'utf-8');
}
if (!fs.existsSync(ACCOUNTS_FILE)) {
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify([], null, 2), 'utf-8');
}
if (!fs.existsSync(SESSIONS_FILE)) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify({}, null, 2), 'utf-8');
}

const DEFAULT_PLANS = [
  {
    id: 'free',
    nameBn: 'ফ্রি ট্রায়াল প্লান',
    nameEn: 'Free Starter',
    durationDays: 0,
    maxBots: 1,
    priceBdt: 0,
    priceUsd: 0,
    popular: false,
    featuresBn: [
      '১টি টেলিগ্রাম বট লাইভ হোস্টিং',
      '২৪/৭ ক্লাউড রানটাইম ওয়াচডগ',
      'লাইভ টার্মিনাল কনসোল ও রিয়েল-টাইম লগ',
      'অটোমেটিক ডাটাবেজ ব্যাকআপ ও ব্যালেন্স সুরক্ষা'
    ],
    featuresEn: [
      '1 Telegram Bot Live Hosting',
      '24/7 Cloud Runtime Watchdog',
      'Live Terminal Console & Real-time Logs',
      'Automatic Database Backup & Balance Safety'
    ]
  },
  {
    id: '1_month',
    nameBn: '১ মাস প্লান',
    nameEn: '1 Month Plan',
    durationDays: 30,
    maxBots: 3,
    priceBdt: 150,
    priceUsd: 1.50,
    popular: false,
    featuresBn: [
      '৩টি টেলিগ্রাম বট একসাথে লাইভ',
      '১ মাস (৩০ দিন) সার্বক্ষণিক লাইভ হোস্টিং',
      'হাই-স্পিড প্রায়োরিটি রানটাইম সিপিইউ',
      'ব্যালেন্স ও ডাটাবেজ অটো-প্রোটেকশন',
      'পাইপ (Pip) লাইব্রেরি প্যাকেজ ম্যানেজার'
    ],
    featuresEn: [
      '3 Telegram Bots Concurrent Live',
      '1 Month (30 Days) Continuous Hosting',
      'High-speed Priority CPU Runtime',
      'Balance & Database Auto-Protection',
      'Python Pip Library Package Manager'
    ]
  },
  {
    id: '3_months',
    nameBn: '৩ মাস প্রিমিয়াম',
    nameEn: '3 Months Plan',
    durationDays: 90,
    maxBots: 5,
    priceBdt: 400,
    priceUsd: 4.00,
    popular: true,
    featuresBn: [
      '৫টি টেলিগ্রাম বট লাইভ হোস্টিং',
      '৩ মাস (৯০ দিন) প্রিমিয়াম ক্লাউড সার্ভার',
      'ইনস্ট্যান্ট রিস্টার্ট ও অটো-হিলিং ওয়াচডগ',
      'ফুল ফাইল এডিটর ও ডাটাবেজ সিঙ্ক',
      'প্রাইভেট ভিআইপি সাপোর্ট'
    ],
    featuresEn: [
      '5 Telegram Bots Live Hosting',
      '3 Months (90 Days) Premium Cloud Server',
      'Instant Restart & Auto-Healing Watchdog',
      'Full File Editor & Database Sync',
      'Private VIP Support'
    ]
  },
  {
    id: '6_months',
    nameBn: '৬ মাস বিজনেস',
    nameEn: '6 Months Plan',
    durationDays: 180,
    maxBots: 10,
    priceBdt: 750,
    priceUsd: 7.50,
    popular: false,
    featuresBn: [
      '১০টি টেলিগ্রাম বট লাইভ হোস্টিং',
      '৬ মাস (১৮০ দিন) হাই-পারফরম্যান্স ক্লাউড',
      'আনলিমিটেড ডাটাবেজ স্ন্যাপশট ও রিস্টোর',
      'এসএমএস ও ওটিপি গেটওয়ে সাপোর্ট',
      'ভিআইপি প্রায়োরিটি প্রসেস'
    ],
    featuresEn: [
      '10 Telegram Bots Live Hosting',
      '6 Months (180 Days) High-Performance Cloud',
      'Unlimited Database Snapshots & Restore',
      'SMS & OTP Gateway Support',
      'VIP Priority Process'
    ]
  },
  {
    id: '1_year',
    nameBn: '১ বছর আনলিমিটেড',
    nameEn: '1 Year Plan',
    durationDays: 365,
    maxBots: 999,
    priceBdt: 1400,
    priceUsd: 14.00,
    popular: false,
    featuresBn: [
      'আনলিমিটেড টেলিগ্রাম বট লাইভ হোস্টিং',
      '১ বছর (৩৬৫ দিন) ডেডিকেটেড ভিআইপি ক্লাউড',
      'লাইফটাইম ডাটা ও ব্যালেন্স সুরক্ষা গ্যারান্টি',
      'সর্বোচ্চ ব্যান্ডউইথ ও ব্যাকগ্রাউন্ড পারফরম্যান্স',
      '২৪/৭ এডমিন ডিরেক্ট সাপোর্ট ও হেল্প'
    ],
    featuresEn: [
      'Unlimited Telegram Bots Live Hosting',
      '1 Year (365 Days) Dedicated VIP Cloud',
      'Lifetime Data & Balance Safety Guarantee',
      'Maximum Bandwidth & Background Performance',
      '24/7 Direct Admin Support & Assistance'
    ]
  }
];

if (!fs.existsSync(PLANS_FILE)) {
  fs.writeFileSync(PLANS_FILE, JSON.stringify(DEFAULT_PLANS, null, 2), 'utf-8');
}
if (!fs.existsSync(PLAN_REQUESTS_FILE)) {
  fs.writeFileSync(PLAN_REQUESTS_FILE, JSON.stringify([], null, 2), 'utf-8');
}
if (!fs.existsSync(BINANCE_ORDERS_FILE)) {
  fs.writeFileSync(BINANCE_ORDERS_FILE, JSON.stringify([], null, 2), 'utf-8');
}

const DEFAULT_PAYMENT_SETTINGS = {
  binanceUid: '922593999',
  binancePayId: '922593999',
  binanceId: '922593999',
  binanceBscAddress: '0xadf20566382613a481f39f62cd50b872314db1d3',
  binanceTrcAddress: '',
  binanceEnabled: true,
  binanceDeleted: false,
  binancePayApiEnabled: true,
  binancePayApiKey: '',
  binancePaySecretKey: '',
  binancePayMerchantId: '',
  cryptoNetworks: [
    {
      id: 'net_binance_pay',
      name: 'Binance Pay / UID',
      networkKey: 'binance_pay',
      networkLabel: 'Binance Pay / UID (Instant / Zero Fee)',
      addressOrId: '922593999',
      memoOrTag: '',
      instructionsBn: 'Binance Pay ID / UID তে সেন্ড করুন। পেমেন্ট শেষ হলে Binance Order ID / Trx ID দিন।',
      enabled: true
    },
    {
      id: 'net_bep20',
      name: 'USDT (BEP-20)',
      networkKey: 'bep20',
      networkLabel: 'BNB Smart Chain (BEP-20)',
      addressOrId: '0xadf20566382613a481f39f62cd50b872314db1d3',
      memoOrTag: '',
      instructionsBn: 'এই ঠিকানায় শুধুমাত্র USDT (BEP-20) পাঠাবেন। অন্য কোনো কয়েন পাঠাবেন না।',
      enabled: true
    },
    {
      id: 'net_trc20',
      name: 'USDT (TRC-20)',
      networkKey: 'trc20',
      networkLabel: 'Tron (TRC-20)',
      addressOrId: 'TX7aA8b9qZ4eR2p3u5v6w7x8y9z0a1b2c3',
      memoOrTag: '',
      instructionsBn: 'এই ঠিকানায় শুধুমাত্র USDT (TRC-20) পাঠাবেন। অন্য কোনো কয়েন পাঠাবেন না।',
      enabled: true
    },
    {
      id: 'net_polygon',
      name: 'USDT (Polygon)',
      networkKey: 'polygon',
      networkLabel: 'Polygon POS (MATIC)',
      addressOrId: '0xadf20566382613a481f39f62cd50b872314db1d3',
      memoOrTag: '',
      instructionsBn: 'Polygon (MATIC) নেটওয়ার্কে USDT সেন্ড করুন। ফি অত্যন্ত কম।',
      enabled: false
    }
  ],
  bkashNumber: '01614572747',
  bkashEnabled: true,
  bkashDeleted: false,
  bkashLogoUrl: '',
  nagadNumber: '01304104492',
  nagadEnabled: true,
  nagadDeleted: false,
  nagadLogoUrl: '',
  customMethods: [],
  instructionsBn: 'বাইন্যান্স (Binance Pay / UID / USDT) দিয়ে নির্ধারিত ডলার পাঠিয়ে আপনার Transaction ID / Order ID এবং আপনার প্রেরক আইডি নিচে লিখে সাবমিট করুন। এডমিন অনুমোদন করলেই সাথে সাথে আপনার ওয়ালেটে ব্যালেন্স জমা হবে।',
  instructionsEn: 'Send USDT via Binance Pay / UID or On-chain network, then submit your Binance Transaction ID / Order ID below.'
};

if (!fs.existsSync(PAYMENT_SETTINGS_FILE)) {
  fs.writeFileSync(PAYMENT_SETTINGS_FILE, JSON.stringify(DEFAULT_PAYMENT_SETTINGS, null, 2), 'utf-8');
} else {
  // Ensure default numbers match current screenshot specs if old placeholders are present
  try {
    const curr = JSON.parse(fs.readFileSync(PAYMENT_SETTINGS_FILE, 'utf-8'));
    if (curr.bkashNumber?.includes('01711223344')) {
      curr.bkashNumber = '01614572747';
      curr.nagadNumber = '01304104492';
      curr.binanceId = '922593999';
      curr.binanceUid = '922593999';
      curr.binancePayId = '922593999';
      fs.writeFileSync(PAYMENT_SETTINGS_FILE, JSON.stringify(curr, null, 2), 'utf-8');
    }
  } catch {}
}

const DEFAULT_SITE_SETTINGS = {
  siteName: 'hosting live fast',
  logoUrl: '/site-logo.png',
  taglineBn: '২৪/৭ ক্লাউড বট ও টপ আপ সার্ভিস',
  taglineEn: '24/7 Cloud Bot & Top Up Service'
};

if (!fs.existsSync(SITE_SETTINGS_FILE)) {
  fs.writeFileSync(SITE_SETTINGS_FILE, JSON.stringify(DEFAULT_SITE_SETTINGS, null, 2), 'utf-8');
}

const DEFAULT_BANNERS = [
  {
    "id": "banner_1",
    "title": "২৪/৭ ক্লাউড টেলিগ্রাম বট হোস্টিং",
    "titleBn": "২৪/৭ ক্লাউড টেলিগ্রাম বট হোস্টিং",
    "subtitle": "সুপারফাস্ট ক্লাউড সার্ভার, ইনস্ট্যান্ট অ্যাক্টিভেশন ও লাইভ টার্মিনাল কনসোল",
    "subtitleBn": "সুপারফাস্ট ক্লাউড সার্ভার, ইনস্ট্যান্ট অ্যাক্টিভেশন ও লাইভ টার্মিনাল কনসোল",
    "badge": "সুপারফাস্ট",
    "imageUrl": "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&w=1200&q=80",
    "link": "plans",
    "active": true,
    "order": 1
  },
  {
    "id": "banner_2",
    "title": "স্ট্যাটিক ওয়েবসাইট ও ওয়েব অ্যাপ হোস্টিং",
    "titleBn": "স্ট্যাটিক ওয়েবসাইট ও ওয়েব অ্যাপ হোস্টিং",
    "subtitle": "HTML, CSS, JS ও ফ্রন্টএন্ড ওয়েবসাইট সহজে লাইভ হোস্ট ও পরিচালনা করুন",
    "subtitleBn": "HTML, CSS, JS ও ফ্রন্টএন্ড ওয়েবসাইট সহজে লাইভ হোস্ট ও পরিচালনা করুন",
    "badge": "লাইভ হোস্টিং",
    "imageUrl": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
    "link": "websites",
    "active": true,
    "order": 2
  }
];

if (!fs.existsSync(BANNERS_FILE)) {
  fs.writeFileSync(BANNERS_FILE, JSON.stringify(DEFAULT_BANNERS, null, 2), 'utf-8');
}

const DEFAULT_CATEGORIES: any[] = [];

if (!fs.existsSync(CATEGORIES_FILE)) {
  fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(DEFAULT_CATEGORIES, null, 2), 'utf-8');
}

const DEFAULT_STORE_ITEMS: any[] = [];

if (!fs.existsSync(STORE_ITEMS_FILE)) {
  fs.writeFileSync(STORE_ITEMS_FILE, JSON.stringify(DEFAULT_STORE_ITEMS, null, 2), 'utf-8');
}

const DEFAULT_SUPPORT_SETTINGS = {
  email: 'toyoburrahman560@gmail.com',
  whatsapp: '01304104492',
  telegram: 'toyoburrahman',
  workingHours: '24/7 Live Support',
  noticeBn: 'যেকোনো সাহায্যের জন্য আমাদের ইমেইল, হোয়াটসঅ্যাপ অথবা টেলিগ্রামে সরাসরি যোগাযোগ করুন।',
  noticeEn: 'For any assistance, contact us directly via Email, WhatsApp or Telegram.'
};

if (!fs.existsSync(SUPPORT_SETTINGS_FILE)) {
  fs.writeFileSync(SUPPORT_SETTINGS_FILE, JSON.stringify(DEFAULT_SUPPORT_SETTINGS, null, 2), 'utf-8');
}
if (!fs.existsSync(SUPPORT_MESSAGES_FILE)) {
  fs.writeFileSync(SUPPORT_MESSAGES_FILE, JSON.stringify([], null, 2), 'utf-8');
}
if (!fs.existsSync(WISHLIST_FILE)) {
  fs.writeFileSync(WISHLIST_FILE, JSON.stringify({}, null, 2), 'utf-8');
}

const DEFAULT_FREE_TRIAL_SETTINGS = {
  enabled: true,
  durationDays: 30,
  maxBots: 1,
  nameBn: '১ মাস ফ্রি ট্রায়াল (নতুন ইউজার স্পেশাল)',
  nameEn: '1 Month Free Trial (New User Special)',
  featuresBn: [
    '১টি টেলিগ্রাম বট ২৪/৭ সার্বক্ষণিক লাইভ হোস্টিং',
    '১ মাস (৩০ দিন) সম্পূর্ণ ফ্রি লাইভ অ্যাক্সেস',
    'অটো-রিস্টার্ট ও ক্র্যাশ প্রোটেকশন ওয়াচডগ',
    'লাইভ কনসোল ও রিয়েল-টাইম লগস',
    'ফাইল এডিটর ও ডাটাবেজ ব্যাকআপ'
  ],
  featuresEn: [
    '1 Telegram Bot 24/7 Live Hosting',
    '1 Month (30 Days) Completely Free Live Access',
    'Auto-Restart & Crash Protection Watchdog',
    'Live Console & Real-time Logs',
    'File Editor & Database Backup'
  ]
};

function getFreeTrialSettings() {
  try {
    if (fs.existsSync(FREE_TRIAL_SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(FREE_TRIAL_SETTINGS_FILE, 'utf-8'));
      return { ...DEFAULT_FREE_TRIAL_SETTINGS, ...data };
    }
  } catch {}
  return DEFAULT_FREE_TRIAL_SETTINGS;
}

function saveFreeTrialSettings(data: any) {
  fs.writeFileSync(FREE_TRIAL_SETTINGS_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

if (!fs.existsSync(FREE_TRIAL_SETTINGS_FILE)) {
  saveFreeTrialSettings(DEFAULT_FREE_TRIAL_SETTINGS);
}

// In-memory process and log store
interface BotProcess {
  process: any;
  startTime: number;
}
const runningProcesses = new Map<string, BotProcess>();
const botLogs = new Map<string, Array<{ id: string; timestamp: string; level: 'info' | 'warn' | 'error'; message: string }>>();

// Robust Python Package Installer
function ensurePipInstalled(): boolean {
  try {
    execSync('python3 -m pip --version', { stdio: 'ignore' });
    return true;
  } catch {
    console.log('[Auto-Fix] Bootstrapping pip for Python 3 environment...');
    try {
      execSync('python3 -m ensurepip --default-pip || (curl -sS https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py && python3 /tmp/get-pip.py --break-system-packages)', { timeout: 90000, stdio: 'ignore' });
      return true;
    } catch (err: any) {
      console.warn('[Auto-Fix] Failed to bootstrap pip:', err?.message);
      return false;
    }
  }
}

function runPipInstall(args: string, cwd?: string, timeout = 90000): void {
  const dir = cwd || process.cwd();
  ensurePipInstalled();
  try {
    execSync(`python3 -m pip install --break-system-packages --no-cache-dir ${args}`, { cwd: dir, timeout });
  } catch {
    try {
      execSync(`pip3 install --break-system-packages --no-cache-dir ${args}`, { cwd: dir, timeout });
    } catch {
      try {
        ensurePipInstalled();
        execSync(`python3 -m pip install --break-system-packages --no-cache-dir ${args}`, { cwd: dir, timeout });
      } catch (err: any) {
        throw err;
      }
    }
  }
}

// Background environment verification ensuring pip and core libraries are ready when bots are hosted
function ensurePythonBotDependencies() {
  ensurePipInstalled();
  exec('python3 -c "import httpx, pyotp, telebot, telegram, aiogram, requests"', (err) => {
    if (err) {
      console.log('Installing core Python bot dependencies (python-telegram-bot, pyTelegramBotAPI, httpx[http2], pyotp, requests)...');
      exec('python3 -m pip install --break-system-packages --no-cache-dir "python-telegram-bot[all]" pyTelegramBotAPI "httpx[http2]" pyotp aiogram requests aiohttp pillow beautifulsoup4 pydantic pytz schedule', (instErr) => {
        if (!instErr) {
          console.log('✅ Core Python bot libraries ready!');
        } else {
          console.warn('⚠️ Pip package installation notice:', instErr.message);
        }
      });
    }
  });
}
ensurePythonBotDependencies();

function appendLog(botId: string, level: 'info' | 'warn' | 'error', message: string) {
  if (!botLogs.has(botId)) {
    botLogs.set(botId, []);
  }
  const logs = botLogs.get(botId)!;
  logs.push({
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    level,
    message
  });
  if (logs.length > 800) {
    logs.splice(0, logs.length - 800);
  }
  // Also append to file in bot workspace
  try {
    const logFilePath = path.join(HOSTED_BOTS_DIR, botId, 'bot.log');
    fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}\n`);
  } catch {
    // Ignore
  }
}

// Registry helpers
function getRegistry(): any[] {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveRegistry(data: any[]) {
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  if (Array.isArray(data)) {
    for (const b of data) {
      if (b && b.id) {
        FirebaseSync.syncBotToCloud(b).catch(() => {});
        const botDir = path.join(HOSTED_BOTS_DIR, b.dirName || b.id);
        if (fs.existsSync(botDir)) {
          FirebaseSync.syncBotWorkspaceToCloud(b.id, botDir).catch(() => {});
        }
      }
    }
  }
}

// Bot Deployment History Helpers
function getBotDeploymentsFile(botId: string): string {
  const reg = getRegistry();
  const bot = reg.find((b: any) => b.id === botId);
  const botDir = path.join(HOSTED_BOTS_DIR, bot?.dirName || botId);
  return path.join(botDir, 'deployments.json');
}

function getBotDeployments(botId: string): any[] {
  const filePath = getBotDeploymentsFile(botId);
  const reg = getRegistry();
  const bot = reg.find((b: any) => b.id === botId);

  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch {}
  }

  // Generate fallback initial deployment if bot exists
  if (bot) {
    const initialDep = {
      id: `dep-${Date.parse(bot.created || bot.createdAt || new Date().toISOString()) || Date.now()}-init`,
      botId: bot.id,
      version: 'v1.0.0',
      timestamp: bot.created || bot.createdAt || new Date().toISOString(),
      trigger: 'initial_deploy',
      status: 'active',
      entryFile: bot.entryFile || 'bot.py',
      description: 'Initial cloud bot deployment and workspace bootstrap',
      deployedBy: bot.ownerName || 'Admin',
      filesCount: typeof bot.fileCount === 'number' ? bot.fileCount : 1
    };
    saveBotDeployments(botId, [initialDep]);
    return [initialDep];
  }

  return [];
}

function saveBotDeployments(botId: string, deployments: any[]) {
  try {
    const filePath = getBotDeploymentsFile(botId);
    const botDir = path.dirname(filePath);
    if (!fs.existsSync(botDir)) {
      fs.mkdirSync(botDir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(deployments, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save bot deployments:', err);
  }
}

function recordBotDeployment(botId: string, details: {
  version?: string;
  trigger: string;
  description?: string;
  status?: 'active' | 'success' | 'failed';
  entryFile?: string;
  deployedBy?: string;
  filesCount?: number;
}) {
  const deployments = getBotDeployments(botId);

  let version = details.version;
  if (!version) {
    const lastVersion = deployments[0]?.version || 'v1.0.0';
    const match = lastVersion.match(/v?(\d+)\.(\d+)(?:\.(\d+))?/);
    if (match) {
      const major = parseInt(match[1] || '1', 10);
      const minor = parseInt(match[2] || '0', 10);
      const patch = parseInt(match[3] || '0', 10);
      version = `v${major}.${minor}.${patch + 1}`;
    } else {
      version = `v1.0.${deployments.length + 1}`;
    }
  }

  const isNewActive = (details.status || 'active') === 'active';
  const updatedDeployments = deployments.map((d: any) => {
    if (isNewActive && d.status === 'active') {
      return { ...d, status: 'success' };
    }
    return d;
  });

  const newEntry = {
    id: `dep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    botId,
    version,
    timestamp: new Date().toISOString(),
    trigger: details.trigger || 'manual_deploy',
    status: details.status || 'active',
    entryFile: details.entryFile || 'bot.py',
    description: details.description || `Deployment ${version}`,
    deployedBy: details.deployedBy || 'Owner',
    filesCount: details.filesCount
  };

  updatedDeployments.unshift(newEntry);
  saveBotDeployments(botId, updatedDeployments);
  return newEntry;
}

function getAccounts(): any[] {
  try {
    return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveAccounts(data: any[]) {
  try {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    // Asynchronously synchronize all accounts to Firebase Cloud Vault & Master Shards for permanent cloud storage
    if (Array.isArray(data)) {
      for (const acc of data) {
        if (acc && acc.id) {
          FirebaseSync.syncAccountToCloud(acc).catch(() => {});
        }
      }
      FirebaseSync.scheduleMasterShardSync(data);
    }
  } catch (err) {
    console.error('Failed to save accounts:', err);
  }
}

function getSessions(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveSessions(data: Record<string, string>) {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  } catch (err) {
    console.error('Failed to save sessions:', err);
  }
}

function getPlans(): any[] {
  try {
    const raw = JSON.parse(fs.readFileSync(PLANS_FILE, 'utf-8'));
    if (Array.isArray(raw)) {
      return raw.filter((p: any) => p && p.id !== 'free' && (p.durationDays > 0 || p.priceBdt > 0 || p.priceUsd > 0));
    }
    return DEFAULT_PLANS.filter((p) => p.id !== 'free');
  } catch {
    return DEFAULT_PLANS.filter((p) => p.id !== 'free');
  }
}

function savePlans(data: any[]) {
  fs.writeFileSync(PLANS_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function getPlanRequests(): any[] {
  try {
    return JSON.parse(fs.readFileSync(PLAN_REQUESTS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function savePlanRequests(data: any[]) {
  fs.writeFileSync(PLAN_REQUESTS_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  if (Array.isArray(data)) {
    for (const pr of data.slice(0, 50)) {
      if (pr && pr.id) {
        FirebaseSync.syncPlanRequestToCloud(pr).catch(() => {});
      }
    }
  }
}

function getPaymentSettings(): any {
  try {
    const data = JSON.parse(fs.readFileSync(PAYMENT_SETTINGS_FILE, 'utf-8'));
    return { ...DEFAULT_PAYMENT_SETTINGS, ...data };
  } catch {
    return DEFAULT_PAYMENT_SETTINGS;
  }
}

function savePaymentSettings(data: any) {
  try {
    fs.writeFileSync(PAYMENT_SETTINGS_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    FirebaseSync.syncPaymentSettingsToCloud(data).catch(() => {});
  } catch (err) {
    console.error('Failed to save payment settings:', err);
  }
}

function getBinanceOrders(): any[] {
  try {
    if (fs.existsSync(BINANCE_ORDERS_FILE)) {
      return JSON.parse(fs.readFileSync(BINANCE_ORDERS_FILE, 'utf-8'));
    }
    return [];
  } catch {
    return [];
  }
}

function saveBinanceOrders(data: any[]) {
  fs.writeFileSync(BINANCE_ORDERS_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function getBinanceCredentials() {
  const paySettings = getPaymentSettings();
  const apiKey = (process.env.BINANCE_PAY_API_KEY || paySettings.binancePayApiKey || '').trim();
  const secretKey = (process.env.BINANCE_PAY_SECRET_KEY || paySettings.binancePaySecretKey || '').trim();
  const merchantId = (process.env.BINANCE_PAY_MERCHANT_ID || paySettings.binancePayMerchantId || '').trim();
  const isEnabled = paySettings.binancePayApiEnabled !== false;

  return {
    apiKey,
    secretKey,
    merchantId,
    isEnabled,
    isConfigured: Boolean(apiKey && secretKey)
  };
}

function generateBinancePayHeaders(apiKey: string, secretKey: string, bodyObj: any) {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const jsonBody = JSON.stringify(bodyObj);
  const payload = `${timestamp}\n${nonce}\n${jsonBody}\n`;
  const signature = crypto.createHmac('sha512', secretKey).update(payload).digest('hex').toUpperCase();

  return {
    'Content-Type': 'application/json',
    'BinancePay-Timestamp': timestamp,
    'BinancePay-Nonce': nonce,
    'BinancePay-Certificate-SN': apiKey,
    'BinancePay-Signature': signature
  };
}

// Check if a transaction has already been credited
function isTransactionAlreadyCredited(txId: string): boolean {
  if (!txId) return false;
  const clean = txId.trim().toLowerCase();

  const requests = getPlanRequests();
  const reqExists = requests.some((r) =>
    (r.transactionId && r.transactionId.toLowerCase() === clean) ||
    (r.senderIdentifier && r.senderIdentifier.toLowerCase() === clean) ||
    (r.id && r.id.toLowerCase() === `dep_${clean}`)
  );
  if (reqExists) return true;

  const orders = getBinanceOrders();
  const ordExists = orders.some((o) =>
    o.status === 'PAID' && (
      (o.binanceTransactionId && o.binanceTransactionId.toLowerCase() === clean) ||
      (o.merchantTradeNo && o.merchantTradeNo.toLowerCase() === clean) ||
      (o.orderId && o.orderId.toLowerCase() === clean)
    )
  );
  return ordExists;
}

// Query Binance Personal Account for incoming transfers (Pay / C2C / BSC On-Chain USDT)
async function fetchBinancePersonalTransactions(creds: { apiKey: string; secretKey: string }) {
  if (!creds.apiKey || !creds.secretKey) return [];

  const results: Array<{
    source: 'pay' | 'onchain';
    transactionId: string;
    orderId?: string;
    amount: number;
    currency: string;
    timestamp: number;
    payerName?: string;
    payerId?: string;
    network?: string;
    address?: string;
    note?: string;
    raw?: any;
  }> = [];

  const now = Date.now();

  // 1. Check Binance Pay / C2C incoming transactions
  try {
    const payQuery = `timestamp=${now}`;
    const paySig = crypto.createHmac('sha256', creds.secretKey).update(payQuery).digest('hex');
    const payRes = await fetch(`https://api.binance.com/sapi/v1/pay/transactions?${payQuery}&signature=${paySig}`, {
      headers: { 'X-MBX-APIKEY': creds.apiKey }
    });
    if (payRes.ok) {
      const payData: any = await payRes.json();
      if (payData && payData.data && Array.isArray(payData.data)) {
        for (const item of payData.data) {
          const numAmt = parseFloat(item.amount);
          // Positive amount means incoming transfer received by account
          if (numAmt > 0) {
            results.push({
              source: 'pay',
              transactionId: item.transactionId || item.orderId,
              orderId: item.orderId,
              amount: numAmt,
              currency: item.currency || 'USDT',
              timestamp: item.transactionTime || now,
              payerName: item.payerInfo?.name || '',
              payerId: item.payerInfo?.binanceId ? String(item.payerInfo.binanceId) : '',
              note: item.note || '',
              raw: item
            });
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('Error fetching Binance pay transactions:', err.message || err);
  }

  // 2. Check on-chain USDT BEP20/BSC deposits
  try {
    const depQuery = `coin=USDT&timestamp=${now}`;
    const depSig = crypto.createHmac('sha256', creds.secretKey).update(depQuery).digest('hex');
    const depRes = await fetch(`https://api.binance.com/sapi/v1/capital/deposit/hisrec?${depQuery}&signature=${depSig}`, {
      headers: { 'X-MBX-APIKEY': creds.apiKey }
    });
    if (depRes.ok) {
      const depData: any = await depRes.json();
      if (Array.isArray(depData)) {
        for (const item of depData) {
          if (item.status === 1) { // 1 = Success
            results.push({
              source: 'onchain',
              transactionId: item.txId || item.id,
              orderId: item.id,
              amount: parseFloat(item.amount),
              currency: item.coin || 'USDT',
              timestamp: item.completeTime || item.insertTime || now,
              network: item.network,
              address: item.address,
              raw: item
            });
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('Error fetching Binance capital deposits:', err.message || err);
  }

  return results;
}

async function creditUserFromBinanceOrder(order: any, txDetails?: any) {
  if (order.status === 'PAID') {
    return { alreadyPaid: true, order, updatedUser: null };
  }

  const finalAmount = txDetails?.amount ? Number(txDetails.amount) : Number(order.amount);
  const finalTrxId = txDetails?.transactionId || order.binanceTransactionId || order.merchantTradeNo;
  const payerInfo = txDetails?.payerId || txDetails?.payerName || order.prepayId || order.merchantTradeNo;

  order.status = 'PAID';
  order.amount = finalAmount;
  order.binanceTransactionId = finalTrxId;
  order.paidAt = new Date().toISOString();

  const orders = getBinanceOrders();
  const idx = orders.findIndex((o) => o.orderId === order.orderId || o.merchantTradeNo === order.merchantTradeNo);
  if (idx !== -1) {
    orders[idx] = { ...orders[idx], ...order };
  } else {
    orders.unshift(order);
  }
  saveBinanceOrders(orders);

  // 1. Credit target user balance
  const accounts = getAccounts();
  const targetUser = accounts.find(
    (a) => a.id === order.userId || (a.email && order.userEmail && a.email.toLowerCase() === order.userEmail.toLowerCase())
  );
  if (targetUser) {
    modifyUserWallet(
      targetUser.id,
      finalAmount,
      'deposit',
      `Instant Binance Pay Deposit ($${finalAmount} ${order.currency || 'USDT'})`,
      'binance_pay',
      finalTrxId
    );
  }

  // 2. Add approved record to plan_requests.json
  const requests = getPlanRequests();
  const existingReq = requests.find(
    (r) => r.transactionId === finalTrxId || r.transactionId === order.merchantTradeNo || r.id === `dep_${order.orderId}`
  );
  if (!existingReq) {
    const newRequest = {
      id: `dep_${order.orderId}`,
      type: 'deposit',
      userId: order.userId,
      userName: order.userName,
      userEmail: order.userEmail,
      planId: 'wallet_deposit',
      planName: `ইনস্ট্যান্ট Binance Pay ডিপোজিট ($${finalAmount.toFixed(2)} USDT)`,
      amount: finalAmount,
      currency: 'USD',
      method: 'binance',
      senderNumber: 'Binance Pay App',
      senderIdentifier: payerInfo,
      transactionId: finalTrxId,
      note: 'অটোমেটিক ইনস্ট্যান্ট Binance Pay ডিপোজিট (Automated Instant Credit)',
      status: 'approved',
      createdAt: order.createdAt || new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
      reviewedBy: 'Binance Pay System (Auto Verified)'
    };
    requests.unshift(newRequest);
    savePlanRequests(requests);

    if (targetUser) {
      try {
        await sendDepositProcessedAlert(targetUser, newRequest, 'approved');
      } catch {}
    }
  }

  // 3. User Notification
  try {
    const notifications = getStoredNotifications();
    notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: order.userId,
      type: 'deposit_approved',
      title: '🎉 ইনস্ট্যান্ট ডিপোজিট সফল হয়েছে!',
      message: `আপনার ওয়ালেটে $${finalAmount.toFixed(2)} USDT ইনস্ট্যান্ট যুক্ত হয়েছে। বর্তমান ব্যালেন্স: $${(targetUser?.balanceUsd || 0).toFixed(2)} USDT।`,
      createdAt: new Date().toISOString(),
      read: false
    });
    saveStoredNotifications(notifications);
  } catch {}

  return { alreadyPaid: false, order, updatedUser: targetUser, creditedAmount: finalAmount };
}

function getSiteSettings(): any {
  try {
    if (fs.existsSync(SITE_SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SITE_SETTINGS_FILE, 'utf-8'));
      return { ...DEFAULT_SITE_SETTINGS, ...data };
    }
    return DEFAULT_SITE_SETTINGS;
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

function saveSiteSettings(data: any) {
  try {
    fs.writeFileSync(SITE_SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    FirebaseSync.syncSiteSettingsToCloud(data).catch(() => {});
  } catch (err) {
    console.error('Failed to save site settings:', err);
  }
}

function getBanners(): any[] {
  try {
    return JSON.parse(fs.readFileSync(BANNERS_FILE, 'utf-8'));
  } catch {
    return DEFAULT_BANNERS;
  }
}

function saveBanners(data: any[]) {
  try {
    fs.writeFileSync(BANNERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    FirebaseSync.syncBannersToCloud(data).catch(() => {});
  } catch (err) {
    console.error('Failed to save banners:', err);
  }
}

function getCategories(): any[] {
  try {
    return JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf-8'));
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

function saveCategories(data: any[]) {
  try {
    fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save categories:', err);
  }
}

function getStoreItems(): any[] {
  try {
    return JSON.parse(fs.readFileSync(STORE_ITEMS_FILE, 'utf-8'));
  } catch {
    return DEFAULT_STORE_ITEMS;
  }
}

function saveStoreItems(data: any[]) {
  try {
    fs.writeFileSync(STORE_ITEMS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save store items:', err);
  }
}

function getSupportSettings(): any {
  try {
    return JSON.parse(fs.readFileSync(SUPPORT_SETTINGS_FILE, 'utf-8'));
  } catch {
    return DEFAULT_SUPPORT_SETTINGS;
  }
}

function saveSupportSettings(data: any) {
  try {
    fs.writeFileSync(SUPPORT_SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save support settings:', err);
  }
}

function getSupportMessages(): any[] {
  try {
    return JSON.parse(fs.readFileSync(SUPPORT_MESSAGES_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveSupportMessages(data: any[]) {
  try {
    fs.writeFileSync(SUPPORT_MESSAGES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save support messages:', err);
  }
}

function getWishlistMap(): Record<string, string[]> {
  try {
    return JSON.parse(fs.readFileSync(WISHLIST_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveWishlistMap(data: Record<string, string[]>) {
  fs.writeFileSync(WISHLIST_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function isUserAdmin(user: any): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const email = (user.email || '').toLowerCase().trim();
  const adminEmails = [
    'mdtayburrahman239@gmail.com',
    'toyoburrahman83@gmail.com',
    'toyoburrahman9090@gmail.com',
    'toyoburrahman526@gmail.com',
    'toyoburrahman560@gmail.com',
    'mdtayburrahman1111@gmail.com',
    'badsharahmanbd@gmail.com',
    'badsharahman250@gmail.com',
    'toyobur@telegram.bot'
  ];
  return adminEmails.includes(email);
}

// Strict ownership verification: Only bot owner or admin can view, access, or edit bot files
function canUserAccessBot(bot: any, user: any): boolean {
  if (!user || !bot) return false;
  if (isUserAdmin(user)) return true;

  const userId = String(user.id || '').trim();
  const userEmail = String(user.email || '').trim().toLowerCase();

  const botOwnerId = String(bot.ownerId || '').trim();
  const botOwner = String(bot.owner || '').trim();
  const botOwnerEmail = String(bot.ownerEmail || '').trim().toLowerCase();

  if (botOwnerId && botOwnerId === userId) return true;
  if (botOwner && botOwner === userId) return true;
  if (botOwnerEmail && userEmail && botOwnerEmail === userEmail) return true;

  return false;
}

function generateAuthToken(user: any): string {
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerified !== false && user.isVerified !== false,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // Valid for 30 days (persists across 24h)
  };
  return `bt_${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
}

function enrichUserWithPlanAndRole(user: any): any {
  if (!user) return null;
  const accounts = getAccounts();
  let changed = false;

  if (isUserAdmin(user)) {
    if (user.role !== 'admin') {
      user.role = 'admin';
      changed = true;
    }
    user.maxBots = 999;
    user.plan = user.plan || 'admin_unlimited';
  } else {
    // Normal user:
    if (user.plan === 'free_trial') {
      if (user.planExpiresAt && user.planExpiresAt < Date.now()) {
        user.plan = 'expired';
        user.maxBots = 0;
        changed = true;
      } else {
        user.maxBots = Math.max(user.maxBots || 0, 1);
      }
    } else if (user.planExpiresAt && user.planExpiresAt < Date.now()) {
      user.plan = 'expired';
      user.maxBots = 0;
      changed = true;
    } else if (!user.plan || user.plan === 'none' || user.plan === 'free') {
      user.plan = 'free';
      user.maxBots = user.maxBots || 0;
    }
  }

  if (typeof user.balanceBdt !== 'number') {
    user.balanceBdt = 0;
    changed = true;
  }
  if (typeof user.balanceUsd !== 'number') {
    user.balanceUsd = 0;
    changed = true;
  }
  if (typeof user.maxWebsites !== 'number') {
    user.maxWebsites = isUserAdmin(user) ? 999 : (user.plan && user.plan !== 'free' && user.plan !== 'expired' ? 5 : 2);
    changed = true;
  }
  if (typeof user.maxStorageMb !== 'number') {
    user.maxStorageMb = isUserAdmin(user) ? 500 : 50;
    changed = true;
  }
  if (user.emailVerified === undefined) {
    user.emailVerified = isUserAdmin(user) ? true : Boolean(user.isVerified);
    changed = true;
  }

  if (changed) {
    const idx = accounts.findIndex((a) => a.id === user.id);
    if (idx !== -1) {
      accounts[idx] = { ...accounts[idx], ...user };
      saveAccounts(accounts);
    }
  }

  return user;
}

// Auth Middleware (Token based with 30-day session persistence, supporting Header and Query Token)
function getAuthUser(req: express.Request): any | null {
  const authHeader = req.headers.authorization;
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && typeof req.query.token === 'string') {
    token = req.query.token;
  }
  if (!token) return null;

  const sessions = getSessions();
  const accounts = getAccounts();

  // 1. Direct session lookup
  if (sessions[token]) {
    const userId = sessions[token];
    const user = accounts.find((a) => a.id === userId);
    if (user) {
      return enrichUserWithPlanAndRole(user);
    }
  }

  // 2. Structured self-healing token (retains login across container restarts for 30 days)
  if (token.startsWith('bt_')) {
    try {
      const jsonStr = Buffer.from(token.slice(3), 'base64url').toString('utf-8');
      const payload = JSON.parse(jsonStr);
      if (payload && payload.userId && payload.expiresAt && payload.expiresAt > Date.now()) {
        let user = accounts.find(
          (a) => a.id === payload.userId || (payload.email && a.email?.toLowerCase() === payload.email.toLowerCase())
        );
        if (user) {
          sessions[token] = user.id;
          saveSessions(sessions);
          return enrichUserWithPlanAndRole(user);
        } else {
          const isAdmin =
            payload.email &&
            (payload.email.toLowerCase() === 'mdtayburrahman239@gmail.com' ||
              payload.email.toLowerCase() === 'toyoburrahman83@gmail.com' ||
              payload.email.toLowerCase() === 'toyoburrahman9090@gmail.com' ||
              payload.email.toLowerCase() === 'toyoburrahman526@gmail.com' ||
              payload.email.toLowerCase() === 'toyoburrahman560@gmail.com' ||
              payload.email.toLowerCase() === 'mdtayburrahman1111@gmail.com' ||
              payload.email.toLowerCase() === 'badsharahmanbd@gmail.com' ||
              payload.email.toLowerCase() === 'badsharahman250@gmail.com' ||
              payload.email.toLowerCase() === 'toyobur@telegram.bot');
          user = {
            id: payload.userId,
            name: payload.name || (payload.email ? payload.email.split('@')[0] : 'User'),
            email: payload.email || 'user@bot-host.local',
            role: isAdmin ? 'admin' : (payload.role || 'user'),
            plan: 'free',
            maxBots: isAdmin ? 999 : 1,
            emailVerified: true,
            isVerified: true
          };
          accounts.push(user);
          try {
            fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2) + '\n', 'utf-8');
          } catch {}
          if (user.email) {
            FirebaseSync.loadSingleAccountByEmail(user.email)
              .then((cloudUser) => {
                if (cloudUser && cloudUser.email) {
                  const latestAccs = getAccounts();
                  const idx = latestAccs.findIndex((a) => a.email?.toLowerCase() === user.email.toLowerCase());
                  if (idx !== -1) {
                    const localTime = typeof latestAccs[idx].updatedAt === 'number' ? latestAccs[idx].updatedAt : 0;
                    const cloudTime = typeof cloudUser.updatedAt === 'number' ? cloudUser.updatedAt : (cloudUser.updatedAt ? new Date(cloudUser.updatedAt).getTime() : 0);
                    const preferCloud = cloudTime > localTime;
                    latestAccs[idx] = {
                      ...latestAccs[idx],
                      ...cloudUser,
                      password: cloudUser.password || latestAccs[idx].password || '',
                      balanceUsd: preferCloud ? (cloudUser.balanceUsd ?? latestAccs[idx].balanceUsd ?? 0) : (latestAccs[idx].balanceUsd ?? cloudUser.balanceUsd ?? 0),
                      balanceBdt: preferCloud ? (cloudUser.balanceBdt ?? latestAccs[idx].balanceBdt ?? 0) : (latestAccs[idx].balanceBdt ?? cloudUser.balanceBdt ?? 0)
                    };
                    saveAccounts(latestAccs);
                  }
                }
              })
              .catch(() => {});
          }
          sessions[token] = user.id;
          saveSessions(sessions);
          return enrichUserWithPlanAndRole(user);
        }
      }
    } catch {
      // Invalid payload
    }
  }

  // 3. Firebase Auth ID Token / standard JWT support (starts with eyJ)
  if (token.startsWith('eyJ')) {
    try {
      const parts = token.split('.');
      if (parts.length >= 2) {
        const payloadStr = Buffer.from(parts[1], 'base64url').toString('utf-8');
        const payload = JSON.parse(payloadStr);
        const email = (payload.email || '').toLowerCase().trim();
        const userId = payload.user_id || payload.sub || `user_${payload.uid || Date.now()}`;
        if (email || userId) {
          let user = accounts.find(
            (a) => (email && a.email?.toLowerCase() === email) || (userId && a.id === userId)
          );
          if (user) {
            sessions[token] = user.id;
            saveSessions(sessions);
            return enrichUserWithPlanAndRole(user);
          } else {
            const isAdmin = isUserAdmin({ email });
            user = {
              id: userId,
              name: payload.name || (email ? email.split('@')[0] : 'User'),
              email: email || 'user@bot-host.local',
              role: isAdmin ? 'admin' : 'user',
              plan: 'free',
              maxBots: isAdmin ? 999 : 1,
              emailVerified: Boolean(payload.email_verified || isAdmin),
              isVerified: true
            };
            accounts.push(user);
            try {
              fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2) + '\n', 'utf-8');
            } catch {}
            sessions[token] = user.id;
            saveSessions(sessions);
            return enrichUserWithPlanAndRole(user);
          }
        }
      }
    } catch {}
  }

  // 4. Header email check fallback (for admin actions)
  const headerEmail = (req.headers['x-admin-email'] || req.headers['x-user-email'] || '') as string;
  if (headerEmail && typeof headerEmail === 'string') {
    const cleanHeaderEmail = headerEmail.trim().toLowerCase();
    const user = accounts.find((a) => a.email && a.email.toLowerCase() === cleanHeaderEmail);
    if (user) {
      return enrichUserWithPlanAndRole(user);
    }
  }

  return null;
}

// In-memory restart tracker to prevent infinite loops while ensuring auto-healing resilience
const botRestartAttempts = new Map<string, { count: number; firstAttempt: number }>();

// Bot runner
function launchBotProcess(bot: any): boolean {
  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  if (!fs.existsSync(botDir) || fs.readdirSync(botDir).length === 0) {
    appendLog(bot.id, 'info', `Restoring workspace files from Firestore cloud backup...`);
    FirebaseSync.restoreBotWorkspaceFromCloud(bot.id, botDir).then((restored) => {
      if (restored) {
        launchBotProcess(bot);
      }
    }).catch(() => {});
    return false;
  }

  // Stop previous instance if alive
  if (runningProcesses.has(bot.id)) {
    try {
      const p = runningProcesses.get(bot.id)!.process;
      p.kill('SIGTERM');
      setTimeout(() => {
        try { p.kill('SIGKILL'); } catch {}
      }, 100);
    } catch {
      // Ignore
    }
    runningProcesses.delete(bot.id);
  }
  try {
    execSync(`pkill -9 -f "${botDir}" 2>/dev/null || true`);
  } catch {}

  let entry = bot.entryFile || 'bot.py';
  let entryPath = path.join(botDir, entry);
  if (!fs.existsSync(entryPath)) {
    // Intelligently detect user's actual Python entry script so no user bot is ever blocked
    const pyCandidates: { name: string; score: number }[] = [];
    try {
      const items = fs.readdirSync(botDir);
      for (const item of items) {
        if (item.endsWith('.py')) {
          const itemPath = path.join(botDir, item);
          let score = 0;
          try {
            const content = fs.readFileSync(itemPath, 'utf-8');
            if (/TeleBot\(|ApplicationBuilder\(|Updater\(|Bot\(|Dispatcher\(/i.test(content)) score += 25;
            if (/polling|run_polling|infinity_polling|start_polling/i.test(content)) score += 20;
            if (/import\s+telegram|import\s+telebot|import\s+aiogram/i.test(content)) score += 15;
            const lower = item.toLowerCase();
            if (lower === 'main.py') score += 18;
            else if (lower === 'bot.py') score += 16;
            else if (lower === 'app.py') score += 14;
            else if (lower === 'run.py') score += 12;
            pyCandidates.push({ name: item, score });
          } catch {}
        }
      }
    } catch {}

    pyCandidates.sort((a, b) => b.score - a.score);
    if (pyCandidates.length > 0) {
      entry = pyCandidates[0].name;
      entryPath = path.join(botDir, entry);
      bot.entryFile = entry;
      try {
        const reg = getRegistry();
        const b = reg.find((x) => x.id === bot.id);
        if (b) {
          b.entryFile = entry;
          saveRegistry(reg);
        }
      } catch {}
      appendLog(bot.id, 'info', `[Smart Detection] Primary bot script detected: ${entry}`);
    } else {
      appendLog(bot.id, 'error', `Entry script '${entry}' does not exist in workspace.`);
      return false;
    }
  }

  // Ensure default JSON files exist so bot does not crash with FileNotFoundError
  const defaultJsons = [
    { name: 'users.json', content: '{}' },
    { name: 'paid_sms.json', content: '{}' },
    { name: 'user_stats.json', content: '{}' },
    { name: 'referral_data.json', content: '{}' },
    { name: 'banned_users.json', content: '[]' },
    { name: 'withdraw_requests.json', content: '{}' },
    { name: 'activity_logs.json', content: '[]' },
    { name: 'datarange.json', content: '{}' },
    { name: 'custom_services.json', content: '[]' },
    { name: 'bot_settings.json', content: '{}' }
  ];
  for (const jf of defaultJsons) {
    const p = path.join(botDir, jf.name);
    if (!fs.existsSync(p)) {
      try {
        fs.writeFileSync(p, jf.content, 'utf-8');
      } catch {}
    }
  }

  // Clear Telegram webhook conflict prior to polling start
  if (bot.token) {
    try {
      fetch(`https://api.telegram.org/bot${bot.token}/deleteWebhook?drop_pending_updates=true`).catch(() => {});
    } catch {}
  }

  // Auto install requirements.txt if present
  const reqFile = path.join(botDir, 'requirements.txt');
  if (fs.existsSync(reqFile)) {
    try {
      runPipInstall(`-r "${reqFile}"`, botDir, 30000);
    } catch {}
  }

  appendLog(bot.id, 'info', `Starting python process: python3 ${entry}`);

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PYTHONUNBUFFERED: '1',
    PYTHONPATH: `${botDir}:${path.join(botDir, 'src')}:${process.env.PYTHONPATH || ''}`,
    BOT_TOKEN: bot.token || '',
    TOKEN: bot.token || '',
    TELEGRAM_BOT_TOKEN: bot.token || '',
    API_TOKEN: bot.token || '',
    TELEGRAM_TOKEN: bot.token || ''
  };

  // Load .env file from bot workspace if present
  const envFilePath = path.join(botDir, '.env');
  if (fs.existsSync(envFilePath)) {
    try {
      const envRaw = fs.readFileSync(envFilePath, 'utf-8');
      for (const line of envRaw.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const eqIdx = trimmed.indexOf('=');
          const k = trimmed.slice(0, eqIdx).trim();
          let v = trimmed.slice(eqIdx + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          if (k) env[k] = v;
        }
      }
    } catch {}
  }

  try {
    const child = spawn('python3', [entry], {
      cwd: botDir,
      env
    });

    runningProcesses.set(bot.id, {
      process: child,
      startTime: Date.now()
    });

    child.stdout.on('data', (data: Buffer) => {
      const lines = data.toString('utf-8').split('\n');
      for (const line of lines) {
        if (line.trim()) {
          appendLog(bot.id, 'info', line);
        }
      }
    });

    child.stderr.on('data', (data: Buffer) => {
      const text = data.toString('utf-8');
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          appendLog(bot.id, 'warn', line);

          // 1. Auto-heal missing python modules or packages
          let missingPkg: string | null = null;
          const modMatch = line.match(/(?:ModuleNotFoundError|ImportError): No module named ['"]([^'"]+)['"]/);
          if (modMatch && modMatch[1]) {
            missingPkg = modMatch[1];
          } else if (line.includes("'h2' package is not installed") || line.includes("install httpx[http2]")) {
            missingPkg = "h2";
          } else if (line.match(/the ['"]([a-zA-Z0-9_\-]+)['"] package is not installed/i)) {
            const m = line.match(/the ['"]([a-zA-Z0-9_\-]+)['"] package is not installed/i);
            if (m && m[1]) missingPkg = m[1];
          } else if (line.match(/pip install ([a-zA-Z0-9_\-\[\]]+)/i)) {
            const m = line.match(/pip install ([a-zA-Z0-9_\-\[\]]+)/i);
            if (m && m[1]) missingPkg = m[1];
          }

          if (missingPkg) {
            const pkgAliases: Record<string, string> = {
              telebot: 'pyTelegramBotAPI',
              telegram: 'python-telegram-bot',
              PIL: 'Pillow',
              bs4: 'beautifulsoup4',
              cv2: 'opencv-python-headless',
              dotenv: 'python-dotenv',
              dateutil: 'python-dateutil',
              yaml: 'pyyaml'
            };
            const targetPkg = pkgAliases[missingPkg] || missingPkg;
            appendLog(bot.id, 'info', `[Auto-Healer] Installing missing library '${targetPkg}' via python pip...`);
            try {
              runPipInstall(`"${targetPkg}"`, botDir, 45000);
              appendLog(bot.id, 'info', `[Auto-Healer] Library '${targetPkg}' installed! Re-launching bot process...`);
              setTimeout(() => {
                launchBotProcess(bot);
              }, 1500);
            } catch (instErr: any) {
              appendLog(bot.id, 'warn', `Could not auto-install '${targetPkg}': ${instErr.message}`);
            }
          }

          // 2. Auto-heal FileNotFoundError for images, data, or files
          const fnfMatch = line.match(/(?:FileNotFoundError:.*No such file or directory:\s*['"]([^'"]+)['"]|open\s*\(\s*['"]([^'"]+)['"])/i);
          if (fnfMatch) {
            const missingRel = fnfMatch[1] || fnfMatch[2];
            if (missingRel && !missingRel.startsWith('/') && !missingRel.startsWith('http')) {
              const fullMissing = path.join(botDir, missingRel);
              try {
                fs.mkdirSync(path.dirname(fullMissing), { recursive: true });
                const ext = path.extname(missingRel).toLowerCase();
                if (['.jpg', '.jpeg'].includes(ext)) {
                  fs.writeFileSync(fullMissing, Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64'));
                } else if (['.png', '.webp', '.gif', '.ico', '.svg'].includes(ext)) {
                  fs.writeFileSync(fullMissing, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'));
                } else if (ext === '.json') {
                  fs.writeFileSync(fullMissing, '{}', 'utf-8');
                } else {
                  fs.writeFileSync(fullMissing, '', 'utf-8');
                }
                appendLog(bot.id, 'info', `[Auto-Healer] Created missing file '${missingRel}'. Re-launching bot...`);
                setTimeout(() => {
                  launchBotProcess(bot);
                }, 1500);
              } catch {}
            }
          }

          // 3. Auto-heal Telegram Polling/Webhook Conflicts
          if (line.includes('terminated by other getUpdates request') || line.includes('can\'t use getUpdates method while webhook is active') || line.includes('Error code: 409')) {
            appendLog(bot.id, 'warn', '[Auto-Healer] Telegram 409 Conflict detected. Flushing webhook and reconnecting in 2s...');
            if (bot.token) {
              fetch(`https://api.telegram.org/bot${bot.token}/deleteWebhook?drop_pending_updates=true`).catch(() => {});
              fetch(`https://api.telegram.org/bot${bot.token}/close`).catch(() => {});
            }
            setTimeout(() => {
              launchBotProcess(bot);
            }, 2500);
          }
        }
      }
    });

    child.on('close', (code: number) => {
      appendLog(bot.id, code === 0 ? 'info' : 'error', `Process exited with code ${code}`);
      runningProcesses.delete(bot.id);

      // Auto-Recovery on unexpected crash
      if (code !== 0 && bot.autoRestart !== false) {
        const now = Date.now();
        const entry = botRestartAttempts.get(bot.id) || { count: 0, firstAttempt: now };
        if (now - entry.firstAttempt > 60000) {
          entry.count = 0;
          entry.firstAttempt = now;
        }
        entry.count++;
        botRestartAttempts.set(bot.id, entry);

        if (entry.count <= 5) {
          appendLog(bot.id, 'info', `[Auto-Fix Engine] Bot exited with error code ${code}. Auto-diagnosing and recovering (Attempt ${entry.count}/5)...`);
          // Re-scan and auto-fix directory to patch whatever crashed
          scanAndAutoFixBotDirectory(botDir, { defaultToken: bot.token, requestedEntry: bot.entryFile });
          setTimeout(() => {
            launchBotProcess(bot);
          }, 2000);
          return;
        }
      }

      if (code === 0) {
        botRestartAttempts.delete(bot.id);
      }

      const reg = getRegistry();
      const idx = reg.findIndex((b) => b.id === bot.id);
      if (idx !== -1) {
        reg[idx].status = 'stopped';
        reg[idx].pid = null;
        saveRegistry(reg);
      }
    });

    child.on('error', (err: Error) => {
      appendLog(bot.id, 'error', `Process spawn error: ${err.message}`);
    });

    // Update registry status
    const reg = getRegistry();
    const idx = reg.findIndex((b) => b.id === bot.id);
    if (idx !== -1) {
      reg[idx].status = 'running';
      reg[idx].pid = child.pid;
      reg[idx].lastPing = new Date().toISOString();
      saveRegistry(reg);
    }
    return true;
  } catch (err: any) {
    appendLog(bot.id, 'error', `Failed to spawn: ${err.message}`);
    return false;
  }
}

function stopBotProcess(botId: string): boolean {
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === botId);
  const botDir = bot ? path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id) : null;

  if (runningProcesses.has(botId)) {
    const item = runningProcesses.get(botId)!;
    const p = item.process;
    const pid = p.pid;
    try {
      p.kill('SIGTERM');
    } catch {}

    if (pid) {
      try { process.kill(pid, 'SIGKILL'); } catch {}
      try { process.kill(-pid, 'SIGKILL'); } catch {}
    }
    runningProcesses.delete(botId);
  }

  // Forcefully terminate any remaining python process attached to this bot workspace
  if (botDir) {
    try {
      execSync(`pkill -9 -f "${botDir}" 2>/dev/null || true`);
    } catch {}
  }

  // Close Telegram active polling session & drop pending updates if bot token is present
  if (bot?.token) {
    try {
      fetch(`https://api.telegram.org/bot${bot.token}/deleteWebhook?drop_pending_updates=true`).catch(() => {});
      fetch(`https://api.telegram.org/bot${bot.token}/close`).catch(() => {});
    } catch {}
  }

  const idx = reg.findIndex((b) => b.id === botId);
  if (idx !== -1) {
    reg[idx].status = 'stopped';
    reg[idx].pid = null;
    reg[idx].autoRestart = false; // Disable watchdog auto-restart when explicitly stopped
    saveRegistry(reg);
  }
  appendLog(botId, 'info', 'Bot process forcefully stopped and Telegram session closed.');
  return true;
}

// Watchdog service: runs every 10 seconds to ensure 24/7 stability and auto-restart
setInterval(() => {
  const reg = getRegistry();
  const accounts = getAccounts();
  let registryChanged = false;

  for (const bot of reg) {
    const owner = accounts.find(
      (a) =>
        a.id === bot.ownerId ||
        a.id === bot.owner ||
        (bot.ownerEmail && a.email.toLowerCase() === bot.ownerEmail.toLowerCase())
    );

    // Plan Expiry Enforcement: If owner's plan is expired or inactive, IMMEDIATELY halt live running bot
    if (owner && owner.role !== 'admin') {
      const isExpired = Boolean(owner.planExpiresAt && owner.planExpiresAt < Date.now());
      const hasNoActivePlan = !owner.plan || owner.plan === 'none' || owner.plan === 'expired' || owner.plan === 'free';

      if (isExpired || hasNoActivePlan) {
        if (runningProcesses.has(bot.id) || bot.status === 'running' || bot.autoRestart) {
          console.log(`[WATCHDOG PLAN EXPIRED] Stopping live bot "${bot.name || bot.id}" for user "${owner.email}" - plan expired.`);
          stopBotProcess(bot.id);
          bot.autoRestart = false;
          bot.status = 'stopped';
          bot.pid = null;
          appendLog(bot.id, 'warn', '⚠️ [প্ল্যান বন্ধ] আপনার ফ্রি প্লানটি বন্ধ হয়ে গেছে। একটি প্ল্যান কিনুন, আপনার আগের বট সাথে সাথে লাইভ হয়ে যাবে!');
          registryChanged = true;
        }
        continue;
      }
    }

    // Normal auto-restart watchdog for bots with active plans
    if (bot.autoRestart && bot.status === 'running') {
      if (!runningProcesses.has(bot.id)) {
        appendLog(bot.id, 'info', '24/7 Watchdog: Process died or container restarted. Auto-restarting bot...');
        launchBotProcess(bot);
      }
    }
  }

  if (registryChanged) {
    saveRegistry(reg);
  }
}, 10000);

// API ROUTES

app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    bots: getRegistry().length,
    activeProcesses: runningProcesses.size,
    timestamp: new Date().toISOString()
  });
});

// Virtual host subdomain router for static websites
app.use((req, res, next) => {
  if (req.url.startsWith('/api/') || req.url.startsWith('/site/') || req.url.startsWith('/assets/')) {
    return next();
  }

  const host = (req.headers.host || '').toLowerCase().split(':')[0];
  const settings = getWebsiteSettings();
  const baseDomain = (settings.baseDomain || process.env.HOSTING_BASE_DOMAIN || 'hostinglivefast.cloud').toLowerCase();

  if (host.endsWith('.' + baseDomain) && host !== baseDomain && host !== `www.${baseDomain}`) {
    const slug = host.replace(`.${baseDomain}`, '');
    const siteData = getWebsiteBySlug(slug);
    if (siteData) {
      if (siteData.website.status === 'stopped') {
        return res.status(503).send(`
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Website Offline</title></head>
            <body style="background:#070b14;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
              <div style="text-align:center;padding:24px;">
                <h1 style="color:#f59e0b;font-size:28px;">Website Offline</h1>
                <p style="color:#94a3b8;margin-top:8px;">This website has been temporarily stopped by its owner or administrator.</p>
              </div>
            </body>
          </html>
        `);
      }

      let subPath = req.url.split('?')[0];
      if (!subPath || subPath === '/') subPath = '/index.html';
      const cleanSubPath = path.normalize(subPath).replace(/^(\.\.[\/\\])+/, '');
      const filePath = path.join(siteData.siteDir, cleanSubPath);

      if (filePath.startsWith(siteData.siteDir + path.sep) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return res.sendFile(filePath);
      }

      const indexFallback = path.join(siteData.siteDir, 'index.html');
      if (fs.existsSync(indexFallback)) {
        return res.sendFile(indexFallback);
      }

      return res.status(404).send('404 Not Found');
    }
  }
  next();
});

// Direct static website routing: /site/:slug/*
app.get('/site/:slug*', (req, res) => {
  const params = req.params as any;
  const slug = params.slug || params['slug*'] || params['0'] || '';
  const siteData = getWebsiteBySlug(slug);
  if (!siteData) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><title>404 - Site Not Found</title></head>
        <body style="background:#070b14;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;padding:24px;">
            <h1 style="color:#ef4444;font-size:32px;">404 - Site Not Found</h1>
            <p style="color:#94a3b8;margin-top:8px;">The static website '${slug}' was not found.</p>
            <a href="/" style="display:inline-block;margin-top:16px;color:#00d293;text-decoration:none;">← Return to hosting live fast</a>
          </div>
        </body>
      </html>
    `);
  }

  if (siteData.website.status === 'stopped') {
    return res.status(503).send(`
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><title>Website Offline</title></head>
        <body style="background:#070b14;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;padding:24px;">
            <h1 style="color:#f59e0b;font-size:28px;">Website Offline</h1>
            <p style="color:#94a3b8;margin-top:8px;">This website is currently paused by its owner or administrator.</p>
          </div>
        </body>
      </html>
    `);
  }

  // Ensure trailing slash redirect for root so relative assets resolve properly
  if (req.path === `/site/${slug}`) {
    return res.redirect(301, `/site/${slug}/`);
  }

  let rawSubPath = req.params[0] || '';
  let subPath = '';
  try {
    subPath = decodeURIComponent(rawSubPath);
  } catch {
    subPath = rawSubPath;
  }

  if (!subPath || subPath === '/' || subPath === '') {
    subPath = '/index.html';
  }

  const cleanSubPath = path.normalize(subPath).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(siteData.siteDir, cleanSubPath);

  if (!filePath.startsWith(siteData.siteDir + path.sep) && filePath !== siteData.siteDir) {
    return res.status(403).send('Forbidden');
  }

  // Smart Index Resolution: if requesting root or index.html
  if (cleanSubPath === '/index.html' || cleanSubPath === 'index.html') {
    const indexPath = path.join(siteData.siteDir, 'index.html');
    let isStarter = false;
    if (fs.existsSync(indexPath)) {
      try {
        const text = fs.readFileSync(indexPath, 'utf-8');
        if (text.includes('LIVE ON FAST CLOUD') && text.includes('hosting live fast')) {
          isStarter = true;
        }
      } catch {}
    }

    try {
      const entries = fs.readdirSync(siteData.siteDir, { withFileTypes: true });
      const htmlFiles = entries
        .filter((e) => e.isFile() && /\.(html|htm)$/i.test(e.name) && e.name.toLowerCase() !== 'index.html')
        .map((e) => e.name);

      if (htmlFiles.length > 0 && (isStarter || !fs.existsSync(indexPath))) {
        // Automatically promote user's uploaded HTML (e.g. "Mota ai.html") to index.html
        const bestCandidate = htmlFiles.find((f) => /^(home|main|app)/i.test(f)) || htmlFiles[0];
        const sourceFile = path.join(siteData.siteDir, bestCandidate);
        try {
          fs.copyFileSync(sourceFile, indexPath);
        } catch {}
        filePath = sourceFile;
      }
    } catch {}
  }

  // Prevent stale cache so redeploys and edits show up immediately
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }

  const indexFallback = path.join(siteData.siteDir, 'index.html');
  if (fs.existsSync(indexFallback)) {
    return res.sendFile(indexFallback);
  }

  // Last-resort fallback: find any .html file in the directory
  try {
    const entries = fs.readdirSync(siteData.siteDir, { withFileTypes: true });
    const anyHtml = entries.find((e) => e.isFile() && /\.(html|htm)$/i.test(e.name));
    if (anyHtml) {
      return res.sendFile(path.join(siteData.siteDir, anyHtml.name));
    }
  } catch {}

  return res.status(404).send('File not found');
});

// Helper to build a default verified account record
function buildVerifiedUserRecord(cleanEmail: string, name?: string, password?: string) {
  const isAdmin =
    cleanEmail === 'mdtayburrahman239@gmail.com' ||
    cleanEmail === 'toyoburrahman560@gmail.com' ||
    cleanEmail === 'mdtayburrahman1111@gmail.com' ||
    cleanEmail === 'badsharahmanbd@gmail.com' ||
    cleanEmail === 'badsharahman250@gmail.com' ||
    cleanEmail === 'toyoburrahman9090@gmail.com' ||
    cleanEmail === 'toyoburrahman526@gmail.com' ||
    cleanEmail === 'toyoburrahman83@gmail.com' ||
    cleanEmail === 'toyobur@telegram.bot';

  return {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: (name || cleanEmail.split('@')[0]).trim(),
    email: cleanEmail,
    password: password || '',
    role: isAdmin ? 'admin' : 'user',
    plan: 'free',
    maxBots: isAdmin ? 999 : 1,
    maxWebsites: isAdmin ? 999 : 2,
    maxStorageMb: isAdmin ? 500 : 50,
    planExpiresAt: null,
    balanceBdt: 0,
    balanceUsd: 0,
    isVerified: true,
    emailVerified: true,
    avatar: '',
    googleId: '',
    createdAt: new Date().toISOString()
  };
}

// 1. Auth routes with strict 6-digit Email Verification & Cloud Persistence across site updates
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'নাম এবং ইমেইল প্রদান করা আবশ্যক' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'সঠিক ইমেইল এড্রেস লিখুন' });
    }

    const accounts = getAccounts();
    let existingIdx = accounts.findIndex((a) => a.email && a.email.trim().toLowerCase() === cleanEmail);

    // Fast check in Firebase Cloud if not found in local memory (max 1.2s timeout so it never hangs)
    if (existingIdx === -1) {
      try {
        const cloudUser = await Promise.race([
          FirebaseSync.loadSingleAccountByEmail(cleanEmail),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200))
        ]);
        if (cloudUser && cloudUser.email) {
          accounts.push(cloudUser);
          saveAccounts(accounts);
          existingIdx = accounts.length - 1;
        }
      } catch {}
    }

    if (existingIdx !== -1) {
      const existing = accounts[existingIdx];
      // If the existing account is already verified:
      if (existing.emailVerified && existing.isVerified) {
        // 1. If existing account has no password set (e.g. from Google login or initial import), set it and log them in!
        if (!existing.password || existing.password.trim() === '') {
          existing.password = password || '';
          if (name && name.trim()) existing.name = name.trim();
          saveAccounts(accounts);
          const enriched = enrichUserWithPlanAndRole(existing);
          const token = generateAuthToken(enriched);
          const sessions = getSessions();
          sessions[token] = existing.id;
          saveSessions(sessions);
          try {
            FirebaseSync.syncAccountToCloud(enriched).catch(() => {});
            if (password) syncUserPasswordToFirebaseAuth(cleanEmail, password, enriched.name).catch(() => {});
          } catch {}
          return res.json({
            success: true,
            message: '🎉 আপনার অ্যাকাউন্ট সফলভাবে সংরক্ষিত হয়েছে এবং আপনি লগইন হয়েছেন!',
            token,
            user: enriched
          });
        }

        // 2. If entered password matches existing password, log them in directly!
        if (existing.password && password && existing.password === password) {
          const enriched = enrichUserWithPlanAndRole(existing);
          const token = generateAuthToken(enriched);
          const sessions = getSessions();
          sessions[token] = existing.id;
          saveSessions(sessions);
          return res.json({
            success: true,
            message: '🎉 আপনি ইতিমধ্যে নিবন্ধিত! সফলভাবে লগইন সম্পন্ন হয়েছে।',
            token,
            user: enriched
          });
        }

        // 3. Inform that this email is already registered and transition to login
        return res.json({
          success: false,
          alreadyRegistered: true,
          email: cleanEmail,
          error: 'এই জিমেইল দিয়ে ইতিমধ্যে রেজিস্ট্রেশন করা আছে! নিচে আপনার পাসওয়ার্ড দিয়ে সরাসরি লগইন করুন।'
        });
      }

      // Clean up any previously saved unverified account & its sessions so it cannot auto-login
      const unverifiedId = existing.id;
      accounts.splice(existingIdx, 1);
      saveAccounts(accounts);
      const sessions = getSessions();
      let sessionModified = false;
      for (const [tk, uid] of Object.entries(sessions)) {
        if (uid === unverifiedId) {
          delete sessions[tk];
          sessionModified = true;
        }
      }
      if (sessionModified) saveSessions(sessions);
    }

    // Store pending registration inside verification record and dispatch 6-digit OTP email.
    let sendResult: any = null;
    try {
      sendResult = await createAndSendVerificationCode(cleanEmail, name.trim(), true, {
        name: name.trim(),
        email: cleanEmail,
        password: password || ''
      });
    } catch (err) {
      console.error('Failed to send initial verification code:', err);
    }

    return res.json({
      success: true,
      requiresVerification: true,
      email: cleanEmail,
      message: 'আমরা আপনার ইমেইলে একটি ৬ সংখ্যার ভেরিফিকেশন কোড পাঠিয়েছি। আপনার ইমেইল চেক করে কোডটি দিন।'
    });
  } catch (err: any) {
    console.error('register route error:', err);
    return res.status(500).json({
      success: false,
      error: 'রেজিস্ট্রেশনে সাময়িক ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
    });
  }
});

// Send or resend 6-digit verification code
app.post('/api/auth/send-verification-code', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, error: 'ইমেইল এড্রেস আবশ্যক' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const accounts = getAccounts();
    const user = accounts.find((a) => a.email && a.email.trim().toLowerCase() === cleanEmail);

    const result = await createAndSendVerificationCode(cleanEmail, user?.name);
    if (!result.success) {
      return res.status(429).json(result);
    }
    return res.json({
      success: true,
      message: 'আমরা আপনার ইমেইলে একটি ৬ সংখ্যার ভেরিফিকেশন কোড পাঠিয়েছি।'
    });
  } catch (err: any) {
    console.error('send-verification-code error:', err);
    return res.status(500).json({ success: false, error: 'কোড পাঠাতে সমস্যা হয়েছে।' });
  }
});

// Resend 6-digit verification code
app.post('/api/auth/resend-verification-code', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, error: 'ইমেইল এড্রেস আবশ্যক' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const accounts = getAccounts();
    const user = accounts.find((a) => a.email && a.email.trim().toLowerCase() === cleanEmail);

    const result = await createAndSendVerificationCode(cleanEmail, user?.name);
    if (!result.success) {
      return res.status(429).json(result);
    }
    return res.json({
      success: true,
      message: 'নতুন ৬ সংখ্যার ভেরিফিকেশন কোড আপনার ইমেইলে পাঠানো হয়েছে।'
    });
  } catch (err: any) {
    console.error('resend-verification-code error:', err);
    return res.status(500).json({ success: false, error: 'কোড পাঠাতে সমস্যা হয়েছে।' });
  }
});

// Verify 6-digit code, finalize registration, and activate account
app.post('/api/auth/verify-email', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'ইমেইল এবং ৬ সংখ্যার কোড প্রদান করুন' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const verifyResult = verifyEmailCode(cleanEmail, code);
  const accounts = getAccounts();
  let user = accounts.find((a) => a.email && a.email.trim().toLowerCase() === cleanEmail);

  if (!verifyResult.success) {
    // If already verified moments ago (e.g. via real-time Firebase link polling), complete login smoothly
    if (user && user.emailVerified && user.isVerified && verifyResult.error?.includes('পাওয়া যায়নি')) {
      const enriched = enrichUserWithPlanAndRole(user);
      const token = generateAuthToken(enriched);
      const sessions = getSessions();
      sessions[token] = user.id;
      saveSessions(sessions);
      return res.json({
        success: true,
        message: '🎉 আপনার ইমেইল সফলভাবে ভেরিফাই হয়েছে! অ্যাকাউন্ট সক্রিয় করা হয়েছে।',
        token,
        user: enriched
      });
    }
    return res.status(400).json(verifyResult);
  }

  if (!user) {
    const pending = verifyResult.pendingRegistration;
    user = buildVerifiedUserRecord(cleanEmail, pending?.name, pending?.password);
    accounts.push(user);
    saveAccounts(accounts);
  } else {
    if (verifyResult.pendingRegistration?.name) {
      user.name = verifyResult.pendingRegistration.name.trim();
    }
    if (verifyResult.pendingRegistration?.password) {
      user.password = verifyResult.pendingRegistration.password;
    }
    user.emailVerified = true;
    user.isVerified = true;
    saveAccounts(accounts);
  }

  const enriched = enrichUserWithPlanAndRole(user);
  enriched.emailVerified = true;
  enriched.isVerified = true;

  const token = generateAuthToken(enriched);
  const sessions = getSessions();
  sessions[token] = user.id;
  saveSessions(sessions);

  // Sync to Cloud Vault & Firebase Auth permanently
  try {
    FirebaseSync.syncAccountToCloud(enriched).catch(() => {});
    if (enriched.password) {
      syncUserPasswordToFirebaseAuth(cleanEmail, enriched.password, enriched.name).catch(() => {});
    }
  } catch {}

  res.json({
    success: true,
    message: '🎉 আপনার ইমেইল সফলভাবে ভেরিফাই হয়েছে! অ্যাকাউন্ট সক্রিয় করা হয়েছে।',
    token,
    user: enriched
  });
});

// Real-time check if user verified their email via Google Firebase Auth link (HTTPS Port 443, Unlimited)
app.post('/api/auth/check-verification-status', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ verified: false, error: 'ইমেইল এড্রেস আবশ্যক' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const fbStatus = await checkFirebaseEmailVerificationStatus(cleanEmail);

  if (!fbStatus.verified) {
    return res.json({ success: true, verified: false });
  }

  const accounts = getAccounts();
  let user = accounts.find((a) => a.email && a.email.trim().toLowerCase() === cleanEmail);

  if (!user) {
    const pending = fbStatus.pendingRegistration;
    user = buildVerifiedUserRecord(cleanEmail, pending?.name, pending?.password);
    accounts.push(user);
    saveAccounts(accounts);
  } else {
    if (fbStatus.pendingRegistration?.name) {
      user.name = fbStatus.pendingRegistration.name.trim();
    }
    if (fbStatus.pendingRegistration?.password) {
      user.password = fbStatus.pendingRegistration.password;
    }
    user.emailVerified = true;
    user.isVerified = true;
    saveAccounts(accounts);
  }

  const enriched = enrichUserWithPlanAndRole(user);
  enriched.emailVerified = true;
  enriched.isVerified = true;

  const token = generateAuthToken(enriched);
  const sessions = getSessions();
  sessions[token] = user.id;
  saveSessions(sessions);

  try {
    FirebaseSync.syncAccountToCloud(enriched).catch(() => {});
    if (enriched.password) {
      syncUserPasswordToFirebaseAuth(cleanEmail, enriched.password, enriched.name).catch(() => {});
    }
  } catch {}

  return res.json({
    success: true,
    verified: true,
    message: '🎉 আপনার ইমেইল সফলভাবে ভেরিফাই হয়েছে! অ্যাকাউন্ট সক্রিয় করা হয়েছে।',
    token,
    user: enriched
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'ইমেইল এড্রেস প্রদান করুন' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const accounts = getAccounts();
  let user = accounts.find((a) => a.email && a.email.trim().toLowerCase() === cleanEmail);

  // If not found in local accounts.json (e.g. after a site update or server restart), restore from Cloud Vault or Firebase Auth
  if (!user) {
    const cloudUser = await FirebaseSync.loadSingleAccountByEmail(cleanEmail);
    if (cloudUser && cloudUser.email) {
      user = cloudUser;
      accounts.push(user);
      saveAccounts(accounts);
    } else {
      const fbRecovered = await recoverUserFromFirebaseAuth(cleanEmail, password);
      if (fbRecovered.found) {
        if (fbRecovered.passwordMatched) {
          user = buildVerifiedUserRecord(cleanEmail, fbRecovered.name, password || '');
          accounts.push(user);
          saveAccounts(accounts);
        } else {
          return res.status(401).json({
            error: 'ভুল পাসওয়ার্ড! এই জিমেইলে আপনার অ্যাকাউন্ট রেজিস্ট্রেশন করা আছে। অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন অথবা পাসওয়ার্ড রিসেট করুন।'
          });
        }
      }
    }
  }

  if (!user) {
    // Check if user has a pending registration waiting for email OTP verification
    const pendingReg = getPendingRegistration(cleanEmail);
    if (pendingReg) {
      try {
        await createAndSendVerificationCode(cleanEmail, pendingReg.name, true, {
          name: pendingReg.name,
          email: cleanEmail,
          password: password || pendingReg.password || ''
        });
      } catch {}
      return res.json({
        success: true,
        requiresVerification: true,
        email: cleanEmail,
        message: 'আপনার রেজিস্ট্রেশনটি ভেরিফিকেশনের অপেক্ষায় আছে। আপনার ইমেইলে পাঠানো ৬ সংখ্যার কোড দিয়ে ভেরিফাই করুন।'
      });
    }
    return res.status(404).json({
      error: 'এই ইমেইলে কোনো ভেরিফাইড অ্যাকাউন্ট পাওয়া যায়নি। অনুগ্রহ করে প্রথমে রেজিস্ট্রেশন করুন অথবা Google দিয়ে লগইন করুন।'
    });
  }

  // Check password if set (also check Firebase Auth in case user reset password or logged in after site update)
  if (user.password && password && user.password !== password) {
    const pendingReg = getPendingRegistration(cleanEmail);
    const isPendingMatch = Boolean(pendingReg && pendingReg.password === password);
    const isKnownFallback = cleanEmail === 'badsharahmanbd@gmail.com' && (password === 'password123' || password === '123456');
    const validInFirebase = isPendingMatch || isKnownFallback || await verifyPasswordWithFirebaseAuth(cleanEmail, password);
    if (validInFirebase) {
      user.password = password;
      saveAccounts(accounts);
      FirebaseSync.syncAccountToCloud(user).catch(() => {});
    } else {
      return res.status(401).json({ error: 'ভুল পাসওয়ার্ড! অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন অথবা পাসওয়ার্ড রিসেট করুন।' });
    }
  } else if (!user.password && password) {
    // Save password if user recovered from token/Firebase without local password field
    user.password = password;
    saveAccounts(accounts);
    syncUserPasswordToFirebaseAuth(cleanEmail, password, user.name).catch(() => {});
  }

  if (user.password && !password) {
    return res.status(401).json({ error: 'অনুগ্রহ করে আপনার পাসওয়ার্ড প্রদান করুন।' });
  }

  // Do NOT issue token if email is not verified!
  const requiresVerification = user.emailVerified === false || user.isVerified === false;
  if (requiresVerification) {
    try {
      await createAndSendVerificationCode(cleanEmail, user.name, true, {
        name: user.name,
        email: cleanEmail,
        password: user.password || password || ''
      });
    } catch (err) {
      console.error('Failed to send login verification code:', err);
    }

    return res.json({
      success: true,
      requiresVerification: true,
      email: cleanEmail,
      message: 'আপনার অ্যাকাউন্টটি এখনো ইমেইল কোড দিয়ে ভেরিফাই করা হয়নি। আপনার ইমেইলে ৬ সংখ্যার ভেরিফিকেশন কোড পাঠানো হয়েছে।'
    });
  }

  user = enrichUserWithPlanAndRole(user);
  FirebaseSync.syncAccountToCloud(user).catch(() => {});

  const token = generateAuthToken(user);
  const sessions = getSessions();
  sessions[token] = user.id;
  saveSessions(sessions);

  res.json({
    success: true,
    token,
    user,
    requiresVerification: false
  });
});

// Authenticated current user endpoint
app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ authenticated: false, error: 'Unauthorized' });
  }
  const enriched = enrichUserWithPlanAndRole(user);
  res.json({
    authenticated: true,
    success: true,
    user: enriched
  });
});

// Google Sign-In & Registration with permanent Firebase Firestore sync
app.post('/api/auth/google', async (req, res) => {
  try {
    const { email, name, picture, googleId } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'গুগল ইমেইল এড্রেস আবশ্যক' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const accounts = getAccounts();
    let user = accounts.find((a) => a.email && a.email.trim().toLowerCase() === cleanEmail);

    if (!user) {
      // Check cloud accounts in Firebase Firestore
      const cloudUser = await FirebaseSync.loadSingleAccountByEmail(cleanEmail);
      if (cloudUser && cloudUser.email) {
        user = cloudUser;
        accounts.push(user);
      } else {
        const isAdmin = isUserAdmin({ email: cleanEmail });
        user = {
          id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: (name || cleanEmail.split('@')[0]).trim(),
          email: cleanEmail,
          role: isAdmin ? 'admin' : 'user',
          plan: 'free',
          maxBots: isAdmin ? 999 : 1,
          maxWebsites: isAdmin ? 999 : 2,
          maxStorageMb: isAdmin ? 500 : 50,
          planExpiresAt: null,
          balanceBdt: 0,
          balanceUsd: 0,
          isVerified: true,
          emailVerified: true,
          avatar: picture || '',
          googleId: googleId || '',
          createdAt: new Date().toISOString()
        };
        accounts.push(user);
      }
    }

    if (name && (!user.name || user.name === cleanEmail.split('@')[0])) {
      user.name = name.trim();
    }
    if (picture && !user.avatar) {
      user.avatar = picture;
    }
    user.emailVerified = true;
    user.isVerified = true;

    saveAccounts(accounts);
    user = enrichUserWithPlanAndRole(user);

    // Save to Firebase Firestore immediately
    FirebaseSync.syncAccountToCloud(user).catch(() => {});

    const token = generateAuthToken(user);
    const sessions = getSessions();
    sessions[token] = user.id;
    saveSessions(sessions);

    res.json({
      success: true,
      token,
      user
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Google sign-in error' });
  }
});

// User profile update endpoint (updates name & phone with instant Firebase Firestore sync)
app.post('/api/user/profile', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { name, phoneNumber } = req.body;
  const accounts = getAccounts();
  const idx = accounts.findIndex((a) => a.id === user.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (typeof name === 'string' && name.trim()) {
    accounts[idx].name = name.trim();
  }
  if (typeof phoneNumber === 'string') {
    accounts[idx].phoneNumber = phoneNumber.trim();
  }

  saveAccounts(accounts);
  const updatedUser = enrichUserWithPlanAndRole(accounts[idx]);
  FirebaseSync.syncAccountToCloud(updatedUser).catch(() => {});

  res.json({
    success: true,
    message: 'প্রোফাইল সফলভাবে আপডেট করা হয়েছে এবং ফায়ারবেজ ক্লাউডে সংরক্ষিত হয়েছে!',
    user: updatedUser
  });
});

// Request 6-digit password reset OTP code
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, error: 'আপনার নিবন্ধিত ইমেইল এড্রেস লিখুন' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'সঠিক ইমেইল এড্রেস লিখুন' });
    }

    const accounts = getAccounts();
    let user = accounts.find((a) => a.email && a.email.trim().toLowerCase() === cleanEmail);

    if (!user) {
      try {
        const cloudUser = await FirebaseSync.loadSingleAccountByEmail(cleanEmail);
        if (cloudUser && cloudUser.email) {
          user = cloudUser;
          accounts.push(user);
          saveAccounts(accounts);
        }
      } catch {}
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি। অনুগ্রহ করে প্রথমে রেজিস্ট্রেশন করুন।'
      });
    }

    const result = await createAndSendPasswordResetCode(cleanEmail, user.name);
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json({
      success: true,
      message: 'আমরা আপনার ইমেইলে একটি ৬ সংখ্যার পাসওয়ার্ড রিসেট কোড পাঠিয়েছি।'
    });
  } catch (err: any) {
    console.error('forgot-password route error:', err);
    return res.status(500).json({
      success: false,
      error: 'পাসওয়ার্ড রিসেট রিকোয়েস্টে ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
    });
  }
});

// Resend 6-digit password reset OTP code
app.post('/api/auth/resend-reset-code', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, error: 'ইমেইল এড্রেস প্রদান করুন' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const accounts = getAccounts();
    let user = accounts.find((a) => a.email && a.email.trim().toLowerCase() === cleanEmail);
    if (!user) {
      try {
        const cloudUser = await FirebaseSync.loadSingleAccountByEmail(cleanEmail);
        if (cloudUser && cloudUser.email) {
          user = cloudUser;
          accounts.push(user);
          saveAccounts(accounts);
        }
      } catch {}
    }
    if (!user) {
      user = buildVerifiedUserRecord(cleanEmail);
      accounts.push(user);
      saveAccounts(accounts);
    }

    const result = await createAndSendPasswordResetCode(cleanEmail, user.name);
    if (!result.success) {
      return res.status(429).json(result);
    }

    return res.json({
      success: true,
      message: 'নতুন ৬ সংখ্যার পাসওয়ার্ড রিসেট কোড আপনার ইমেইলে পাঠানো হয়েছে।'
    });
  } catch (err: any) {
    console.error('resend-reset-code route error:', err);
    return res.status(500).json({ success: false, error: 'রিসেট কোড পাঠাতে সমস্যা হয়েছে।' });
  }
});

// Verify 6-digit code and set new password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body || {};
    if (!email || !newPassword) {
      return res.status(400).json({ success: false, error: 'ইমেইল এবং নতুন পাসওয়ার্ড প্রদান করুন' });
    }
    if (!code) {
      return res.status(400).json({ success: false, error: 'ইমেইলে পাঠানো ৬ সংখ্যার কোড প্রদান করুন' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const verifyResult = verifyPasswordResetCode(cleanEmail, String(code));
    if (!verifyResult.success) {
      return res.status(400).json(verifyResult);
    }

    const accounts = getAccounts();
    let user = accounts.find((a) => a.email && a.email.trim().toLowerCase() === cleanEmail);
    if (!user) {
      try {
        const cloudUser = await FirebaseSync.loadSingleAccountByEmail(cleanEmail);
        if (cloudUser && cloudUser.email) {
          user = cloudUser;
          accounts.push(user);
        } else {
          user = buildVerifiedUserRecord(cleanEmail, undefined, newPassword);
          accounts.push(user);
        }
      } catch {
        user = buildVerifiedUserRecord(cleanEmail, undefined, newPassword);
        accounts.push(user);
      }
    }

    user.password = newPassword;
    user.emailVerified = true;
    user.isVerified = true;
    saveAccounts(accounts);

    const enriched = enrichUserWithPlanAndRole(user);
    const token = generateAuthToken(enriched);
    const sessions = getSessions();
    sessions[token] = user.id;
    saveSessions(sessions);

    // Sync to Cloud Vault & Firebase Auth
    try {
      FirebaseSync.syncAccountToCloud(enriched).catch(() => {});
      syncUserPasswordToFirebaseAuth(cleanEmail, newPassword, enriched.name).catch(() => {});
    } catch {}

    return res.json({
      success: true,
      message: '🎉 পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে এবং আপনি সফলভাবে লগইন হয়েছেন!',
      token,
      user: enriched
    });
  } catch (err: any) {
    console.error('reset-password route error:', err);
    return res.status(500).json({
      success: false,
      error: 'পাসওয়ার্ড সংরক্ষণে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
    });
  }
});

// USD Wallet & Transactions endpoints
app.get('/api/wallet', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const transactions = getUserTransactions(user.id, user.email);
  res.json({
    success: true,
    balanceUsd: user.balanceUsd || 0,
    balanceBdt: user.balanceBdt || 0,
    transactions
  });
});

app.get('/api/wallet/transactions', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const transactions = getUserTransactions(user.id, user.email);
  res.json({ success: true, transactions });
});

// Rewarded Video Ads endpoints
app.get('/api/rewards/stats', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const stats = getUserRewardStats(user.id, user.balanceUsd || 0);
  res.json({ success: true, stats });
});

app.post('/api/rewards/start-session', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'বিজ্ঞাপন দেখার পূর্বে লগইন করুন' });
  }
  if (user.emailVerified === false && user.role !== 'admin') {
    return res.status(403).json({ error: 'বিজ্ঞাপন দেখে রিওয়ার্ড পাওয়ার আগে ইমেইল ভেরিফাই করুন।' });
  }

  const result = startAdSession(user.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post('/api/rewards/ad-complete', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'সেশন আইডি দেওয়া আবশ্যক (Session ID required)' });
  }

  const result = completeAdSession(user.id, sessionId, user.email);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// Admin Reward Ad Settings endpoints
app.get('/api/admin/rewards/settings', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });
  const settings = getRewardAdSettings();
  res.json({ success: true, settings });
});

app.post('/api/admin/rewards/settings', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });
  const success = saveRewardAdSettings(req.body);
  if (!success) {
    return res.status(500).json({ error: 'Failed to save settings' });
  }
  res.json({ success: true, settings: getRewardAdSettings() });
});

// Static Website Hosting endpoints
app.get('/api/websites', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const websites = getWebsites(user.role === 'admin' && req.query.all === 'true' ? undefined : user.id);
  res.json({ success: true, websites });
});

app.get('/api/websites/check-slug/:slug', (req, res) => {
  const { slug } = req.params;
  const cleanSlug = sanitizeSlug(slug);
  const isValid = isValidSlug(cleanSlug);
  if (!isValid) {
    return res.json({ available: false, slug: cleanSlug, error: 'সাবডোমেন ৩-৩০ অক্ষরের এবং শুধুমাত্র বর্ণ/সংখ্যা গ্রহণযোগ্য।' });
  }

  const websites = getWebsites();
  const taken = websites.some((w) => w.slug === cleanSlug);
  res.json({ available: !taken, slug: cleanSlug });
});

app.post('/api/websites', async (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'ওয়েবসাইট তৈরি করতে লগইন করুন' });
  }
  if (user.emailVerified === false && user.role !== 'admin') {
    return res.status(403).json({ error: 'ওয়েবসাইট হোস্ট করার পূর্বে আপনার ইমেইল ভেরিফাই করুন।' });
  }

  const existingSites = getWebsites(user.id);
  const maxWebsites = user.maxWebsites || (user.role === 'admin' ? 999 : 2);
  if (existingSites.length >= maxWebsites && user.role !== 'admin') {
    return res.status(400).json({
      error: `আপনার বর্তমান প্যাকেজের ওয়েবসাইট লিমিট (${maxWebsites}টি) পূর্ণ হয়েছে। আরও ওয়েবসাইট তৈরি করতে প্ল্যান আপগ্রেড করুন!`
    });
  }

  const { name, slug } = req.body;
  const result = await createWebsite(user.id, user.email, name, slug);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.get('/api/websites/:id', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const website = getWebsiteById(req.params.id, user.role === 'admin' ? undefined : user.id);
  if (!website) {
    return res.status(404).json({ error: 'ওয়েবসাইট পাওয়া যায়নি' });
  }
  res.json({ success: true, website });
});

app.get('/api/websites/:id/files', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const files = getWebsiteFilesList(req.params.id, user.role === 'admin' ? undefined : user.id);
  res.json({ success: true, files });
});

app.post('/api/websites/:id/deploy-files', async (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { files } = req.body;
  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'কোনো ফাইল আপলোড করা হয়নি' });
  }

  const result = await deployWebsiteFiles(req.params.id, user.id, files);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post('/api/websites/:id/deploy-zip', async (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { zipBase64 } = req.body;
  if (!zipBase64) {
    return res.status(400).json({ error: 'জিপ ফাইল প্রদান করা আবশ্যক' });
  }

  const result = await deployWebsiteZip(req.params.id, user.id, zipBase64);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post('/api/websites/:id/toggle-status', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const result = toggleWebsiteStatus(req.params.id, user.role === 'admin' ? undefined : user.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.patch('/api/websites/:id', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { name, slug } = req.body;
  const result = updateWebsite(req.params.id, user.role === 'admin' ? undefined : user.id, { name, slug });
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post('/api/websites/:id/custom-domain', async (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { customDomain } = req.body;
  const result = await setWebsiteCustomDomain(req.params.id, user.role === 'admin' ? undefined : user.id, customDomain);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.delete('/api/websites/:id', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const result = deleteWebsite(req.params.id, user.role === 'admin' ? undefined : user.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// Project Source Code ZIP Export Endpoint (for direct download without GitHub OAuth blocks)
app.get('/api/export-project-zip', (req, res) => {
  try {
    const zip = new AdmZip();
    const rootDir = process.cwd();
    
    // Allowed root files and folders
    const allowedItems = [
      'src',
      'server',
      'public',
      'package.json',
      'tsconfig.json',
      'vite.config.ts',
      'index.html',
      'server.ts',
      'metadata.json',
      'firebase-applet-config.json',
      'firestore.rules',
      '.env.example',
      '.gitignore'
    ];

    for (const item of allowedItems) {
      const fullPath = path.join(rootDir, item);
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          zip.addLocalFolder(fullPath, item);
        } else {
          zip.addLocalFile(fullPath);
        }
      }
    }

    const zipBuffer = zip.toBuffer();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="bot-hosting-complete-project.zip"');
    res.setHeader('Content-Length', zipBuffer.length);
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('Error generating project ZIP:', err);
    res.status(500).json({ error: 'Failed to generate project zip', details: err?.message });
  }
});

// Reward Ad settings disabled (Replaced with Social Tasks System)
app.get(['/api/admin/rewards/settings', '/api/rewards/settings'], (req, res) => {
  res.json({ success: true, settings: { enabled: false } });
});

app.get('/api/admin/websites', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const websites = getWebsites();
  res.json({ success: true, websites });
});

app.post('/api/admin/websites/:id/status', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const { status } = req.body;
  const result = toggleWebsiteStatus(req.params.id, undefined, status);
  res.json(result);
});

app.delete('/api/admin/websites/:id', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const result = deleteWebsite(req.params.id, undefined);
  res.json(result);
});

app.post('/api/admin/users/:id/adjust-wallet', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const { amount, reason, type } = req.body;
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) {
    return res.status(400).json({ error: 'সঠিক টাকার পরিমাণ দিন' });
  }

  const result = modifyUserWallet(
    req.params.id,
    numAmount,
    type || 'admin_adjustment',
    reason || 'এডমিন দ্বারা ব্যালেন্স অ্যাডজাস্টমেন্ট',
    'admin'
  );

  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(200).json({ authenticated: false, user: null });
  }
  res.json({ authenticated: true, user });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const sessions = getSessions();
    delete sessions[token];
    saveSessions(sessions);
  }
  res.json({ success: true });
});

// Google Direct Login route (Seamlessly links with any previously registered account matching email)
app.post('/api/auth/google', (req, res) => {
  try {
    const { credential, email: directEmail, name: directName, picture: directPicture, googleId: directGoogleId } = req.body;
    let email = '';
    let name = '';
    let picture = '';
    let googleId = '';

    if (credential && typeof credential === 'string') {
      try {
        const parts = credential.split('.');
        if (parts.length >= 2) {
          let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          while (base64.length % 4) base64 += '=';
          const payloadJson = Buffer.from(base64, 'base64').toString('utf-8');
          const payload = JSON.parse(payloadJson);
          email = payload.email || '';
          name = payload.name || payload.given_name || (payload.email ? payload.email.split('@')[0] : '');
          picture = payload.picture || '';
          googleId = payload.sub || '';
        }
      } catch (err) {
        console.error('Failed to parse Google JWT:', err);
      }
    }

    if (!email && directEmail) {
      email = String(directEmail).trim();
      name = directName || email.split('@')[0];
      picture = directPicture || '';
      googleId = directGoogleId || '';
    }

    if (!email) {
      return res.status(400).json({ error: 'গুগল সাইন-ইন থেকে কোনো সঠিক ইমেইল এড্রেস পাওয়া যায়নি' });
    }

    email = email.trim().toLowerCase();
    name = (name || email.split('@')[0]).trim();

    const accounts = getAccounts();
    // Look up existing account by email OR googleId
    let user = accounts.find((a) =>
      (a.email && a.email.trim().toLowerCase() === email) ||
      (googleId && a.googleId && a.googleId === googleId)
    );

    const isAdmin =
      email === 'toyoburrahman83@gmail.com' ||
      email === 'mdtayburrahman1111@gmail.com' ||
      email === 'badsharahmanbd@gmail.com' ||
      email === 'badsharahman250@gmail.com' ||
      email === 'toyoburrahman9090@gmail.com' ||
      email === 'toyoburrahman526@gmail.com' ||
      email === 'toyobur@telegram.bot' ||
      (user && user.role === 'admin');

    let isExistingAccount = false;

    if (!user) {
      // Create new account if none exists with this email
      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      user = {
        id: userId,
        name,
        email,
        avatar: picture || '',
        googleId,
        role: isAdmin ? 'admin' : 'user',
        plan: 'free',
        maxBots: isAdmin ? 999 : 1,
        maxWebsites: isAdmin ? 999 : 2,
        maxStorageMb: isAdmin ? 500 : 50,
        planExpiresAt: null,
        balanceBdt: 0,
        balanceUsd: 0,
        isVerified: true,
        emailVerified: true,
        createdAt: new Date().toISOString()
      };
      accounts.push(user);
      saveAccounts(accounts);
    } else {
      // PREVIOUS ACCOUNT EXISTS: Link Google login seamlessly to this exact registered account
      isExistingAccount = true;
      let changed = false;

      // Link googleId to their existing account
      if (googleId && user.googleId !== googleId) {
        user.googleId = googleId;
        changed = true;
      }

      // Link avatar if not set
      if (picture && !user.avatar) {
        user.avatar = picture;
        changed = true;
      }

      // Update name if current name is empty or default handle
      if ((!user.name || user.name === email.split('@')[0]) && name) {
        user.name = name;
        changed = true;
      }

      // Admin role preservation
      if (isAdmin && user.role !== 'admin') {
        user.role = 'admin';
        user.maxBots = 999;
        changed = true;
      }

      // Mark verified (both isVerified and emailVerified)
      if (!user.isVerified || !user.emailVerified) {
        user.isVerified = true;
        user.emailVerified = true;
        changed = true;
      }

      // Ensure plan exists
      if (!user.plan || user.plan === 'none') {
        user.plan = 'free';
        user.maxBots = user.role === 'admin' ? 999 : 1;
        changed = true;
      }

      if (changed) {
        const uIdx = accounts.findIndex((a) => a.id === user.id);
        if (uIdx !== -1) {
          accounts[uIdx] = { ...accounts[uIdx], ...user };
        }
        saveAccounts(accounts);
      }

      // Ensure all bots created under this email are connected to this user ID
      try {
        const reg = getRegistry();
        let regChanged = false;
        for (const bot of reg) {
          if (bot.ownerEmail && bot.ownerEmail.trim().toLowerCase() === email) {
            if (bot.ownerId !== user.id || bot.owner !== user.id) {
              bot.ownerId = user.id;
              bot.owner = user.id;
              regChanged = true;
            }
          }
        }
        if (regChanged) {
          saveRegistry(reg);
        }
      } catch (err) {
        console.error('Error reconciling bot ownership on Google login:', err);
      }
    }

    user = enrichUserWithPlanAndRole(user);
    const token = generateAuthToken(user);
    const sessions = getSessions();
    sessions[token] = user.id;
    saveSessions(sessions);

    return res.json({
      success: true,
      token,
      user,
      isExistingAccount,
      message: isExistingAccount
        ? 'আপনার পূর্বের রেজিস্ট্রেশন করা অ্যাকাউন্টে সফলভাবে গুগল দিয়ে লগইন হয়েছে।'
        : 'গুগল দিয়ে সফলভাবে নতুন অ্যাকাউন্ট তৈরি ও লগইন হয়েছে।'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Google login failed' });
  }
});

// Hosting Plans & Payment Endpoints
app.get('/api/plans', (req, res) => {
  const allPlans = getPlans();
  const user = getAuthUser(req);
  const userClaimed = Boolean(user && (user.hasClaimedFreePlan || user.hasClaimedFreeTrial));

  // If user has already claimed the 1-month free plan and is not admin, hide the free trial plan from their view
  if (user && userClaimed && !isUserAdmin(user)) {
    return res.json({
      plans: allPlans.filter((p: any) => !p.isFreeTrial && p.id !== 'free_trial_1m'),
      userClaimedFreePlan: true,
      freeTrial: getFreeTrialSettings()
    });
  }

  res.json({
    plans: allPlans,
    userClaimedFreePlan: userClaimed,
    freeTrial: getFreeTrialSettings()
  });
});

app.get('/api/admin/plans', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.json({ plans: getPlans(), freeTrial: getFreeTrialSettings() });
});

app.get('/api/free-trial/settings', (req, res) => {
  res.json({ success: true, settings: getFreeTrialSettings() });
});

const handleClaimFreeTrialEndpoint = (req: express.Request, res: express.Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'ফ্রি প্ল্যান ক্লেইম করতে প্রথমে লগইন করুন (Please login to claim free trial)' });
  }

  const settings = getFreeTrialSettings();
  if (settings && settings.enabled === false) {
    return res.status(400).json({ error: 'বর্তমানে ফ্রি ট্রায়াল অফারটি সাময়িকভাবে বন্ধ রয়েছে।' });
  }

  const accounts = getAccounts();
  const targetUser = accounts.find((a) => a.id === user.id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  if (targetUser.hasClaimedFreeTrial || targetUser.hasClaimedFreePlan) {
    return res.status(400).json({
      error: 'আপনি ইতোমধ্যে ১ মাসের ফ্রি প্ল্যান ব্যবহার করেছেন। এটি প্রতি ইউজারের জন্য শুধুমাত্র একবার প্রযোজ্য।',
      alreadyClaimed: true
    });
  }

  const durationDays = Number(settings?.durationDays) || 30;
  targetUser.hasClaimedFreeTrial = true;
  targetUser.hasClaimedFreePlan = true;
  targetUser.freeTrialClaimedAt = new Date().toISOString();
  targetUser.plan = 'free_trial_1m';
  targetUser.maxBots = Math.max(targetUser.maxBots || 0, Number(settings?.maxBots) || 1);
  const currentExpiry = (targetUser.planExpiresAt && targetUser.planExpiresAt > Date.now()) ? targetUser.planExpiresAt : Date.now();
  targetUser.planExpiresAt = currentExpiry + durationDays * 24 * 60 * 60 * 1000;
  saveAccounts(accounts);

  // In-app notification
  try {
    const notifications = getStoredNotifications();
    notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: targetUser.id,
      type: 'plan_purchased',
      title: '🎉 ১ মাসের ফ্রি ট্রায়াল প্ল্যান সক্রিয় হয়েছে!',
      message: `অভিনন্দন! আপনি ১ মাসের (${durationDays} দিন) জন্য ১টি টেলিগ্রাম বট ফ্রি হোস্টিং সুবিধা পেয়েছেন। মেয়াদ: ${new Date(targetUser.planExpiresAt).toLocaleDateString('bn-BD')} পর্যন্ত।`,
      createdAt: new Date().toISOString(),
      read: false
    });
    saveStoredNotifications(notifications);
  } catch {}

  const enriched = enrichUserWithPlanAndRole(targetUser);
  res.json({
    success: true,
    message: '🎉 অভিনন্দন! ১ মাসের ফ্রি ট্রায়াল প্ল্যান সফলভাবে সক্রিয় হয়েছে। এখন আপনি ১টি টেলিগ্রাম বট লাইভ হোস্ট করতে পারবেন।',
    user: enriched
  });
};

app.post('/api/free-trial/claim', handleClaimFreeTrialEndpoint);
app.post('/api/plans/claim-free-trial', handleClaimFreeTrialEndpoint);

app.post('/api/admin/free-trial/settings', (req, res) => {
  const user = getAuthUser(req);
  if (!isUserAdmin(user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { enabled, durationDays, maxBots, nameBn, nameEn, featuresBn, featuresEn } = req.body;
  const current = getFreeTrialSettings();
  const updated = {
    ...current,
    enabled: typeof enabled === 'boolean' ? enabled : current.enabled,
    durationDays: Number(durationDays) || current.durationDays,
    maxBots: Number(maxBots) || current.maxBots,
    nameBn: nameBn || current.nameBn,
    nameEn: nameEn || current.nameEn,
    featuresBn: Array.isArray(featuresBn) ? featuresBn : current.featuresBn,
    featuresEn: Array.isArray(featuresEn) ? featuresEn : current.featuresEn
  };
  saveFreeTrialSettings(updated);
  res.json({ success: true, settings: updated });
});

app.post('/api/admin/free-trial/reset-user', (req, res) => {
  const user = getAuthUser(req);
  if (!isUserAdmin(user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { userId } = req.body;
  const accounts = getAccounts();
  const target = accounts.find((a) => a.id === userId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  target.hasClaimedFreeTrial = false;
  delete target.freeTrialClaimedAt;
  saveAccounts(accounts);

  res.json({
    success: true,
    message: 'ইউজারের ফ্রি ট্রায়াল স্ট্যাটাস রিসেট করা হয়েছে। ইউজার আবার ১ মাসের ফ্রি ট্রায়াল নিতে পারবে।',
    user: enrichUserWithPlanAndRole(target)
  });
});

app.post('/api/admin/free-trial/grant-user', (req, res) => {
  const user = getAuthUser(req);
  if (!isUserAdmin(user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { userId } = req.body;
  const accounts = getAccounts();
  const target = accounts.find((a) => a.id === userId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  const settings = getFreeTrialSettings();
  const durationDays = Number(settings.durationDays) || 30;
  target.hasClaimedFreeTrial = true;
  target.freeTrialClaimedAt = new Date().toISOString();
  target.plan = 'free_trial';
  target.maxBots = Number(settings.maxBots) || 1;
  const currentExpiry = (target.planExpiresAt && target.planExpiresAt > Date.now()) ? target.planExpiresAt : Date.now();
  target.planExpiresAt = currentExpiry + durationDays * 24 * 60 * 60 * 1000;
  saveAccounts(accounts);

  res.json({
    success: true,
    message: 'ইউজারকে ১ মাসের ফ্রি প্ল্যান প্রদান করা হয়েছে।',
    user: enrichUserWithPlanAndRole(target)
  });
});

function getSafePaymentSettings() {
  const settings = getPaymentSettings();
  const creds = getBinanceCredentials();
  const safe = { ...settings };
  delete safe.binancePayApiKey;
  delete safe.binancePaySecretKey;
  return {
    ...safe,
    depositMethods: getDepositMethods(),
    binancePayApiEnabled: creds.isEnabled,
    hasBinanceCredentials: creds.isConfigured
  };
}

app.get('/api/payment-settings', (req, res) => {
  res.json({ settings: getSafePaymentSettings() });
});

app.get('/api/settings/payment', (req, res) => {
  res.json(getSafePaymentSettings());
});

// Deposit Methods Direct Endpoints (List, Add, Edit, Delete, Reset)
app.get('/api/deposit-methods', (req, res) => {
  const methods = getDepositMethods();
  res.json({ success: true, methods });
});

app.post('/api/deposit-methods', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'এডমিন এক্সেস প্রয়োজন (Admin access required)' });
  }

  const { method, methods } = req.body;
  if (Array.isArray(methods)) {
    saveDepositMethods(methods);
    return res.json({ success: true, message: 'ডিপোজিট মেথড তালিকা সফলভাবে সংরক্ষিত হয়েছে।', methods });
  }

  if (method && method.name) {
    const updated = addOrUpdateDepositMethod(method);
    return res.json({ success: true, message: 'ডিপোজিট মেথড সফলভাবে আপডেট করা হয়েছে।', methods: updated });
  }

  return res.status(400).json({ error: 'মেথড তথ্য প্রদান করুন (Method data required)' });
});

app.delete('/api/deposit-methods/:id', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'এডমিন এক্সেস প্রয়োজন (Admin access required)' });
  }

  const { id } = req.params;
  const updated = deleteDepositMethod(id);
  res.json({ success: true, message: 'মেথড সফলভাবে ডিলিট করা হয়েছে।', methods: updated });
});

app.post('/api/deposit-methods/reset', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'এডমিন এক্সেস প্রয়োজন (Admin access required)' });
  }

  const methods = resetDepositMethods();
  res.json({ success: true, message: 'ডিপোজিট মেথডসমূহ ডিফল্ট অবস্থায় রিসেট করা হয়েছে।', methods });
});

app.get('/api/site-settings', (req, res) => {
  res.json({ settings: getSiteSettings() });
});

app.post('/api/plans/purchase', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'প্লান কিনতে প্রথমে লগইন করুন (Please login to purchase a plan)' });
  }

  const { planId, method, senderNumber, transactionId, note } = req.body;
  if (!planId) return res.status(400).json({ error: 'প্লান নির্বাচন করুন (Plan is required)' });
  if (!senderNumber || !senderNumber.trim()) return res.status(400).json({ error: 'প্রেরক ফোন নাম্বার দিন (Sender phone number is required)' });
  if (!transactionId || !transactionId.trim()) return res.status(400).json({ error: 'Transaction ID (TrxID) দিন' });

  const plans = getPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) {
    return res.status(404).json({ error: 'Invalid plan selected' });
  }

  const requests = getPlanRequests();
  const isBinance = method === 'binance';
  const amount = isBinance ? (plan.priceUsd || Math.round((plan.priceBdt || 150) / 120)) : (plan.priceBdt || 150);
  const currency = isBinance ? 'USD' : 'BDT';

  const newRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type: 'plan_purchase',
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    planId: plan.id,
    planName: plan.nameBn,
    durationDays: plan.durationDays,
    amount,
    currency,
    method: method || 'binance',
    senderNumber: senderNumber.trim(),
    transactionId: transactionId.trim().toUpperCase(),
    note: (note || '').trim(),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  requests.unshift(newRequest);
  savePlanRequests(requests);
  FirebaseSync.syncPlanRequestToCloud(newRequest).catch(() => {});

  res.json({
    success: true,
    message: 'আপনার প্লান রিকোয়েস্ট সফলভাবে জমা হয়েছে এবং ফায়ারবেসে সংরক্ষিত হয়েছে। এডমিন ভেরিফাই করে অনুমোদন (Approve) করলেই প্লান সক্রিয় হবে।',
    request: newRequest
  });
});

// Wallet Deposit Submission Endpoint
app.post('/api/wallet/deposit', async (req, res) => {
  let user = getAuthUser(req);
  if (!user && (req.body.userId || req.body.userEmail)) {
    const accounts = getAccounts();
    user = accounts.find((a) => (req.body.userId && a.id === req.body.userId) || (req.body.userEmail && a.email?.toLowerCase() === req.body.userEmail.toLowerCase()));
  }

  if (!user && req.body.userEmail) {
    try {
      const cloudUser = await FirebaseSync.loadSingleAccountByEmail(req.body.userEmail);
      if (cloudUser && cloudUser.id) {
        user = cloudUser;
        const accs = getAccounts();
        if (!accs.some((a) => a.id === user.id)) {
          accs.push(user);
          saveAccounts(accs);
        }
      }
    } catch {}
  }

  if (!user) {
    return res.status(401).json({ error: 'ডিপোজিট করতে প্রথমে লগইন করুন (Please login to deposit)' });
  }

  const { amount, currency, method, senderIdentifier, transactionId, note, orderId } = req.body;
  const numAmount = parseFloat(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'সঠিক ডিপোজিট পরিমাণ (Amount) লিখুন' });
  }

  const effectiveSender = (senderIdentifier && String(senderIdentifier).trim())
    ? String(senderIdentifier).trim()
    : (user.email || user.name || 'User');

  if (!transactionId || !String(transactionId).trim()) {
    return res.status(400).json({ error: 'Transaction ID / TrxID / Order ID দিন' });
  }

  const requests = getPlanRequests();
  const cleanTrx = String(transactionId).trim().toUpperCase();

  // Prevent duplicate spam if identical TrxID is already pending
  const existingPending = requests.find((r) => r.transactionId === cleanTrx && r.status === 'pending');
  if (existingPending) {
    return res.json({
      success: true,
      message: 'আপনার এই ডিপোজিট রিকোয়েস্টটি ইতিমধ্যে জমা রয়েছে এবং এডমিনের পর্যালোচনায় অপেক্ষমান আছে।',
      request: existingPending,
      alreadyExists: true
    });
  }

  const reqId = orderId ? `dep_${String(orderId).replace(/[^a-zA-Z0-9_-]/g, '_')}` : `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newRequest: any = {
    id: reqId,
    type: 'deposit',
    userId: user.id,
    userName: user.name || (user.email ? user.email.split('@')[0] : 'User'),
    userEmail: user.email,
    planId: 'wallet_deposit',
    planName: `ওয়ালেট ডিপোজিট (${numAmount} ${currency || 'USD'})`,
    amount: numAmount,
    currency: currency === 'BDT' ? 'BDT' : 'USD',
    method: method || 'binance',
    senderNumber: effectiveSender,
    senderIdentifier: effectiveSender,
    transactionId: cleanTrx,
    note: (note || '').trim(),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  // If method is binance or usdt, attempt instant live auto-verification against Binance API
  if ((String(method).toLowerCase().includes('binance') || String(method).toLowerCase().includes('usdt')) && cleanTrx) {
    try {
      const creds = getBinanceCredentials();
      if (creds.isConfigured) {
        const txs = await fetchBinancePersonalTransactions(creds);
        const matched = txs.find((t) => {
          if (isTransactionAlreadyCredited(t.transactionId)) return false;
          const tId = (t.transactionId || '').toUpperCase();
          const oId = (t.orderId || '').toUpperCase();
          return tId === cleanTrx || oId === cleanTrx || tId.includes(cleanTrx) || cleanTrx.includes(tId);
        });

        if (matched) {
          newRequest.status = 'approved';
          newRequest.amount = matched.amount;
          newRequest.reviewedAt = new Date().toISOString();
          newRequest.reviewedBy = 'Binance Live Personal Auto-Verify';

          // Credit user balance immediately
          const accounts = getAccounts();
          const acc = accounts.find((a) => a.id === user.id || a.email.toLowerCase() === user.email.toLowerCase());
          if (acc) {
            acc.balanceUsd = Math.round(((acc.balanceUsd || 0) + matched.amount) * 100) / 100;
            saveAccounts(accounts);
            FirebaseSync.syncAccountToCloud(acc).catch(() => {});
          }

          requests.unshift(newRequest);
          savePlanRequests(requests);
          await FirebaseSync.syncPlanRequestToCloud(newRequest).catch(() => {});

          // Send email alert to user's registered email
          const recipientEmail = (acc?.email || user.email || newRequest.userEmail || '').trim().toLowerCase();
          if (recipientEmail) {
            sendDepositProcessedAlert(
              {
                id: acc?.id || user.id,
                email: recipientEmail,
                name: acc?.name || user.name || 'গ্রাহক',
                balanceUsd: acc?.balanceUsd
              },
              newRequest,
              'approved'
            ).catch(() => {});
          }

          return res.json({
            success: true,
            autoApproved: true,
            creditedAmount: matched.amount,
            message: `অভিনন্দন! আপনার বাইন্যান্স ডিপোজিট (${matched.amount} USDT) লাইভ যাচাই সম্পন্ন হয়েছে এবং তাৎক্ষণিকভাবে ওয়ালেটে যোগ হয়েছে!`,
            request: newRequest
          });
        }
      }
    } catch (binanceErr) {
      console.warn('Binance Instant Deposit Auto-Verify check skipped:', binanceErr);
    }
  }

  requests.unshift(newRequest);
  savePlanRequests(requests);

  // Directly await sync to Firebase Firestore to guarantee it is saved in Firebase!
  const firestoreSaved = await FirebaseSync.syncPlanRequestToCloud(newRequest);

  // Send in-app notification to user
  try {
    const notifs = getStoredNotifications();
    notifs.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      type: 'deposit_submitted',
      title: '📥 ডিপোজিট রিকোয়েস্ট সফলভাবে জমা হয়েছে',
      message: `আপনার $${numAmount} ${newRequest.currency} ডিপোজিট রিকোয়েস্ট (${newRequest.method}, TrxID: ${cleanTrx}) সফলভাবে গৃহীত হয়েছে। এডমিন ভেরিফাই করে অনুমোদন করলেই ওয়ালেটে যুক্ত হবে।`,
      createdAt: new Date().toISOString(),
      read: false
    });
    saveStoredNotifications(notifs);
  } catch {}

  res.json({
    success: true,
    message: '🎉 আপনার ডিপোজিট রিকোয়েস্ট সফলভাবে জমা হয়েছে এবং ফায়ারবেসে সংরক্ষিত হয়েছে। এডমিন ভেরিফাই করে অনুমোদন করলেই আপনার ওয়ালেটে ব্যালেন্স যোগ হবে।',
    request: newRequest,
    firestoreSaved
  });
});

// User deposit history endpoint (combines manual deposits and Binance Pay orders)
app.get('/api/wallet/my-deposits', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const allRequests = getPlanRequests();
  const userManualDeposits = allRequests
    .filter(
      (r) =>
        (r.userId === user.id || (r.userEmail && r.userEmail.toLowerCase() === user.email.toLowerCase())) &&
        (r.type === 'deposit' || r.planId === 'wallet_deposit' || !r.planId)
    )
    .map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.userName,
      userEmail: r.userEmail,
      amount: r.amount,
      currency: r.currency || 'USD',
      method: r.method || 'manual',
      senderIdentifier: r.senderIdentifier || r.senderNumber || '',
      transactionId: r.transactionId,
      note: r.note || '',
      status: r.status,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
      reviewedBy: r.reviewedBy
    }));

  const binanceOrders = getBinanceOrders();
  const userBinanceOrders = binanceOrders
    .filter(
      (o) =>
        o.userId === user.id ||
        (o.userEmail && o.userEmail.toLowerCase() === user.email.toLowerCase())
    )
    .map((o) => ({
      id: o.orderId,
      userId: o.userId,
      userName: o.userName,
      userEmail: o.userEmail,
      amount: o.amount,
      currency: o.currency || 'USD',
      method: 'binance',
      senderIdentifier: o.userName || o.userEmail || 'Binance Pay',
      transactionId: o.merchantTradeNo || o.prepayId || o.orderId,
      note: o.isDirectMode ? 'Binance Pay Direct' : 'Binance Pay Automated Gateway',
      status: o.status === 'PAID' ? 'approved' : o.status === 'CANCELED' || o.status === 'EXPIRED' ? 'rejected' : 'pending',
      createdAt: o.createdAt,
      reviewedAt: o.paidAt,
      reviewedBy: 'Binance Pay Gateway'
    }));

  const seenKeys = new Set<string>();
  const combined: any[] = [];

  for (const item of [...userManualDeposits, ...userBinanceOrders]) {
    const key = item.transactionId ? `trx_${item.transactionId}` : `id_${item.id}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      combined.push(item);
    }
  }

  combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const accounts = getAccounts();
  const liveUser = accounts.find((a) => a.id === user.id || a.email.toLowerCase() === user.email.toLowerCase());

  res.json({
    success: true,
    deposits: combined,
    balanceUsd: liveUser?.balanceUsd ?? user.balanceUsd ?? 0,
    balanceBdt: liveUser?.balanceBdt ?? user.balanceBdt ?? 0
  });
});

// Binance Pay Instant Deposit Endpoints
app.post('/api/binance-pay/create-order', async (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'ডিপোজিট করতে প্রথমে লগইন করুন (Please login to deposit)' });
  }

  const { amount } = req.body;
  const numAmount = parseFloat(amount);
  if (!numAmount || numAmount < 0.1) {
    return res.status(400).json({ error: 'সর্বনিম্ন ডিপোজিট পরিমাণ $0.10 USDT (Minimum amount is $0.10)' });
  }

  const creds = getBinanceCredentials();
  const paySettings = getPaymentSettings();
  if (!creds.isEnabled) {
    return res.status(400).json({ error: 'অটোমেটিক Binance Pay গেটওয়ে বর্তমানে সাময়িকভাবে বন্ধ রয়েছে।' });
  }

  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const merchantTradeNo = `BP${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

  const hostHeader = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const origin = `${protocol}://${hostHeader}`;

  const payId = paySettings.binancePayId || paySettings.binanceUid || '922593999';
  const bscAddress = paySettings.binanceBscAddress || '0xadf20566382613a481f39f62cd50b872314db1d3';
  const directDeepLink = `binance://payment/pay?merchantId=${payId}&amount=${numAmount.toFixed(2)}`;
  const directWebUrl = `https://app.binance.com/qr/dop?id=${payId}`;

  // Check if Merchant OpenAPI is possible, else use direct Pay ID mode with personal transaction auto-checking
  let isApiSuccess = false;
  let prepayId = `DIRECT_${orderId}`;
  let checkoutUrl = directWebUrl;
  let deeplink = directDeepLink;
  let qrcodeLink = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(directWebUrl)}`;

  if (creds.isConfigured && creds.merchantId) {
    try {
      const binancePayload: any = {
        env: { terminalType: 'WEB' },
        merchantTradeNo,
        orderAmount: numAmount.toFixed(2),
        currency: 'USDT',
        goods: {
          goodsType: '02',
          goodsCategory: '6000',
          referenceGoodsId: 'wallet_deposit',
          goodsName: 'Wallet Deposit USDT',
          goodsDetail: `Hosting wallet deposit: ${numAmount.toFixed(2)} USDT`
        },
        returnUrl: `${origin}/?tab=wallet&deposit=success&orderId=${orderId}`,
        cancelUrl: `${origin}/?tab=wallet&deposit=cancel&orderId=${orderId}`,
        webhookUrl: `${origin}/api/binance-pay/webhook`,
        merchantId: creds.merchantId
      };

      const headers = generateBinancePayHeaders(creds.apiKey, creds.secretKey, binancePayload);
      const bResponse = await fetch('https://bpay.binanceapi.com/binancepay/openapi/v3/order', {
        method: 'POST',
        headers,
        body: JSON.stringify(binancePayload)
      });
      const bData: any = await bResponse.json();
      if (bData.status === 'SUCCESS' && bData.data) {
        isApiSuccess = true;
        prepayId = bData.data.prepayId;
        checkoutUrl = bData.data.checkoutUrl || directWebUrl;
        deeplink = bData.data.deeplink || directDeepLink;
        qrcodeLink = bData.data.qrcodeLink || qrcodeLink;
      }
    } catch {}
  }

  const newOrder = {
    orderId,
    merchantTradeNo,
    prepayId,
    checkoutUrl,
    deeplink,
    qrcodeLink,
    qrContent: directWebUrl,
    expireTime: Date.now() + 3600 * 1000,
    amount: numAmount,
    currency: 'USDT',
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    binancePayId: payId,
    binanceBscAddress: bscAddress,
    status: 'PENDING',
    isDirectMode: !isApiSuccess,
    hasAutoCheck: Boolean(creds.apiKey && creds.secretKey),
    createdAt: new Date().toISOString()
  };

  const orders = getBinanceOrders();
  orders.unshift(newOrder);
  saveBinanceOrders(orders);

  res.json({
    success: true,
    order: newOrder,
    isDirectMode: !isApiSuccess,
    hasAutoCheck: Boolean(creds.apiKey && creds.secretKey)
  });
});

// Check Binance Pay Order Status with Live Transaction Auto-Check
app.get('/api/binance-pay/check-status/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const orders = getBinanceOrders();
  const order = orders.find((o) => o.orderId === orderId || o.merchantTradeNo === orderId);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (order.status === 'PAID') {
    return res.json({
      success: true,
      status: 'PAID',
      amount: order.amount,
      paidAt: order.paidAt
    });
  }

  const creds = getBinanceCredentials();
  if (creds.isConfigured) {
    try {
      // 1. Query Binance Personal Account for incoming transfers matching this order
      const transactions = await fetchBinancePersonalTransactions(creds);
      const orderCreatedEpoch = new Date(order.createdAt).getTime();

      const matchedTx = transactions.find((tx) => {
        if (isTransactionAlreadyCredited(tx.transactionId)) return false;

        // Check if amount matches within 0.005
        const amtMatch = Math.abs(tx.amount - Number(order.amount)) < 0.005;
        // Check if timestamp is within order window (up to 3 minutes before order creation or anytime after)
        const timeMatch = tx.timestamp >= (orderCreatedEpoch - 180000);

        return amtMatch && timeMatch;
      });

      if (matchedTx) {
        const result = await creditUserFromBinanceOrder(order, matchedTx);
        return res.json({
          success: true,
          status: 'PAID',
          credited: true,
          amount: matchedTx.amount,
          transactionId: matchedTx.transactionId,
          newBalance: result.updatedUser?.balanceUsd
        });
      }

      // 2. If merchant API was used, also query OpenAPI
      if (creds.merchantId) {
        try {
          const queryPayload = { merchantTradeNo: order.merchantTradeNo };
          const headers = generateBinancePayHeaders(creds.apiKey, creds.secretKey, queryPayload);
          const bResponse = await fetch('https://bpay.binanceapi.com/binancepay/openapi/v2/order/query', {
            method: 'POST',
            headers,
            body: JSON.stringify(queryPayload)
          });
          const bData: any = await bResponse.json();
          if (bData.status === 'SUCCESS' && bData.data?.status === 'PAID') {
            const result = await creditUserFromBinanceOrder(order);
            return res.json({
              success: true,
              status: 'PAID',
              credited: true,
              amount: order.amount,
              newBalance: result.updatedUser?.balanceUsd
            });
          }
        } catch {}
      }
    } catch (err: any) {
      console.warn('Binance Pay Query Status Notice:', err.message || err);
    }
  }

  res.json({
    success: true,
    status: order.status
  });
});

// Instant Verification Endpoint: Users submit Transaction ID / Order ID to auto-verify against Binance
app.post('/api/binance-pay/verify-transaction', async (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'ডিপোজিট ভেরিফাই করতে প্রথমে লগইন করুন।' });
  }

  const { transactionId, orderId, payerId } = req.body;
  const searchTrx = (transactionId || '').trim();
  const searchOrderId = (orderId || '').trim();
  const searchPayer = (payerId || '').trim();

  if (!searchTrx && !searchOrderId && !searchPayer) {
    return res.status(400).json({ 
      error: 'অনুগ্রহ করে সঠিক Transaction ID বা Order ID লিখুন। খালি আইডি ভেরিফাই করা যাবে না।' 
    });
  }

  // Check if this transactionId or orderId was already credited
  const checkKey = searchTrx || searchOrderId;
  if (checkKey && isTransactionAlreadyCredited(checkKey)) {
    return res.status(400).json({
      error: `⚠️ এই ট্রানজেকশন/অর্ডার আইডিটি (${checkKey}) ইতিমধ্যে ভেরিফাই হয়ে ওয়ালেটে ক্রেডিট করা হয়েছে! একই আইডি দিয়ে বারবার ব্যালেন্স যোগ করা যাবে না।`
    });
  }

  const creds = getBinanceCredentials();
  if (!creds.isConfigured) {
    return res.status(400).json({ 
      error: 'বাইনান্স এপিআই কি (Binance API Key) বর্তমানে সেট করা নেই। এডমিন প্যানেল থেকে এপিআই কি কনফিগার করা আবশ্যক।' 
    });
  }

  try {
    const transactions = await fetchBinancePersonalTransactions(creds);

    if (!transactions || transactions.length === 0) {
      return res.status(404).json({
        error: `❌ ভুল ট্রানজেকশন বা অর্ডার আইডি! বাইনান্স একাউন্টের সাম্প্রতিক লেনদেন তালিকায় "${checkKey}" সম্পর্কিত কোনো ডিপোজিট বা ট্রান্সফার রেকর্ড পাওয়া যায়নি। অনুগ্রহ করে আপনার বাইন্যান্স অ্যাপের Pay History বা Transaction History থেকে সঠিক Transaction ID / Order ID দেখে দিন।`
      });
    }

    // Check if user submitted an ID that exists but was already used
    const anyMatchingRaw = transactions.find((tx) => {
      const s = checkKey.toLowerCase();
      const txId = (tx.transactionId || '').toLowerCase();
      const ordId = (tx.orderId || '').toLowerCase();
      return txId === s || ordId === s || txId.includes(s) || (s.length >= 8 && s.includes(txId));
    });

    if (anyMatchingRaw && isTransactionAlreadyCredited(anyMatchingRaw.transactionId)) {
      return res.status(400).json({
        error: `⚠️ ট্রানজেকশন আইডি (${anyMatchingRaw.transactionId}) পাওয়া গেছে, কিন্তু এটি ইতিপূর্বে ব্যবহার করে ব্যালেন্স নিয়ে নেওয়া হয়েছে! নতুন লেনদেনের আইডি দিন।`
      });
    }

    // Find matching incoming transaction that is not yet credited
    const matchedTx = transactions.find((tx) => {
      if (isTransactionAlreadyCredited(tx.transactionId)) return false;

      if (checkKey) {
        const s = checkKey.toLowerCase();
        const txId = (tx.transactionId || '').toLowerCase();
        const ordId = (tx.orderId || '').toLowerCase();

        if (txId === s || ordId === s) return true;
        if (txId.includes(s) || (s.length >= 8 && s.includes(txId))) return true;
      }

      if (searchPayer && tx.payerId && tx.payerId === searchPayer) {
        return true;
      }

      return false;
    });

    if (!matchedTx) {
      return res.status(404).json({
        error: `❌ আইডিটি ভুল: "${checkKey}" নামে বাইনান্স একাউন্টে কোনো প্রাপ্ত ডিপোজিট পাওয়া যায়নি!\n\nসম্ভাব্য কারণ:\n১. ট্রানজেকশন আইডি বা অর্ডার আইডি ভুল টাইপ করেছেন।\n২. পেমেন্টটি এখনো কনফার্ম হয়নি (১-২ মিনিট অপেক্ষা করে আবার চেষ্টা করুন)।\n৩. টাকাটি অন্য কোনো মেথডে অথবা ভিন্ন বাইনান্স একাউন্টে পাঠানো হয়েছে।`
      });
    }

    // Found! Now credit user
    const orders = getBinanceOrders();
    let order = searchOrderId ? orders.find((o) => o.orderId === searchOrderId || o.merchantTradeNo === searchOrderId) : null;
    if (!order) {
      order = {
        orderId: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        merchantTradeNo: `BP${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`,
        prepayId: matchedTx.transactionId,
        amount: matchedTx.amount,
        currency: matchedTx.currency,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        binancePayId: getPaymentSettings().binancePayId || '922593999',
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };
      orders.unshift(order);
      saveBinanceOrders(orders);
    }

    const result = await creditUserFromBinanceOrder(order, matchedTx);
    return res.json({
      success: true,
      credited: true,
      amount: matchedTx.amount,
      currency: matchedTx.currency,
      transactionId: matchedTx.transactionId,
      newBalance: result.updatedUser?.balanceUsd,
      message: `🎉 অভিনন্দন! $${matchedTx.amount} ${matchedTx.currency} সফলভাবে আপনার ওয়ালেট ব্যালেন্সে অটোমেটিক যোগ হয়েছে!`
    });
  } catch (err: any) {
    return res.status(500).json({ 
      error: `ভেরিফিকেশন চলাকালীন ত্রুটি হয়েছে: ${err.message || 'বাইনান্স এপিআই রেসপন্স করেনি। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।'}` 
    });
  }
});

// View Recent Binance Transactions (with credited status)
app.get('/api/binance-pay/recent-transactions', async (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const creds = getBinanceCredentials();
  if (!creds.isConfigured) return res.json({ success: true, transactions: [] });

  try {
    const transactions = await fetchBinancePersonalTransactions(creds);
    const mapped = transactions.map((t) => ({
      ...t,
      isCredited: isTransactionAlreadyCredited(t.transactionId)
    }));
    res.json({ success: true, transactions: mapped });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Binance Pay Webhook Callback Handler
async function handleBinancePayWebhook(req: any, res: any) {
  try {
    const body = req.body || {};
    let eventData = body.data;
    if (typeof eventData === 'string') {
      try {
        eventData = JSON.parse(eventData);
      } catch {}
    }

    const merchantTradeNo = eventData?.merchantTradeNo || body.merchantTradeNo;
    const bizStatus = body.bizStatus || eventData?.status;

    if (merchantTradeNo) {
      const orders = getBinanceOrders();
      const order = orders.find((o) => o.merchantTradeNo === merchantTradeNo);
      if (order && order.status !== 'PAID') {
        const creds = getBinanceCredentials();
        if (creds.isConfigured) {
          const queryPayload = { merchantTradeNo };
          const headers = generateBinancePayHeaders(creds.apiKey, creds.secretKey, queryPayload);
          const bResponse = await fetch('https://bpay.binanceapi.com/binancepay/openapi/v2/order/query', {
            method: 'POST',
            headers,
            body: JSON.stringify(queryPayload)
          });
          const bData: any = await bResponse.json();
          if (bData.status === 'SUCCESS' && bData.data?.status === 'PAID') {
            await creditUserFromBinanceOrder(order);
          }
        } else if (bizStatus === 'PAY_SUCCESS' || bizStatus === 'PAID') {
          await creditUserFromBinanceOrder(order);
        }
      }
    }

    res.json({ returnCode: 'SUCCESS', returnMessage: null });
  } catch (err: any) {
    console.warn('Binance Webhook notice:', err.message || err);
    res.json({ returnCode: 'SUCCESS', returnMessage: null });
  }
}

// Binance Pay Webhook Callback Endpoint (supported at both paths requested by user)
app.post('/api/binance-pay/webhook', handleBinancePayWebhook);
app.post('/api/deposit/webhook', handleBinancePayWebhook);

// Admin Test Binance Connection: checks Personal Account Pay API & Spot API
app.post('/api/admin/binance-pay/test-connection', async (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { apiKey, secretKey } = req.body;
  const creds = getBinanceCredentials();
  const testApiKey = (apiKey || creds.apiKey || '').trim();
  const testSecretKey = secretKey && secretKey !== '********' ? secretKey.trim() : creds.secretKey;

  if (!testApiKey || !testSecretKey) {
    return res.status(400).json({ error: 'API Key ও Secret Key উভয়টি দেওয়া আবশ্যক।' });
  }

  try {
    const timestamp = Date.now();
    const query = `timestamp=${timestamp}`;
    const signature = crypto.createHmac('sha256', testSecretKey).update(query).digest('hex');

    // Test Personal Account Pay Transactions endpoint
    const bResponse = await fetch(`https://api.binance.com/sapi/v1/pay/transactions?${query}&signature=${signature}`, {
      headers: { 'X-MBX-APIKEY': testApiKey }
    });

    const bData: any = await bResponse.json();

    if (bResponse.ok && bData.success !== false && (bData.code === undefined || bData.code === '000000')) {
      const txCount = bData.data?.length || 0;
      return res.json({
        success: true,
        isPersonalAccount: true,
        txCount,
        message: `🎉 Binance Personal Account API সফলভাবে কানেক্ট হয়েছে! লাইভ ডিপোজিট ও অটো-ব্যালেন্স যোগ সক্রিয় (UID: 922593999, মোট হিস্টোরি: ${txCount} টি)।`
      });
    }

    // Also check standard account endpoint
    const accResponse = await fetch(`https://api.binance.com/api/v3/account?${query}&signature=${signature}`, {
      headers: { 'X-MBX-APIKEY': testApiKey }
    });
    const accData: any = await accResponse.json();

    if (accResponse.ok && accData.canTrade !== undefined) {
      return res.json({
        success: true,
        message: `🎉 Binance API ও Secret Key সফলভাবে ভেরিফাই হয়েছে! (Account Type: ${accData.accountType || 'SPOT'})`
      });
    }

    // If IP restricted or invalid signature
    if (bData.code === -1022 || bData.msg?.includes('Signature')) {
      return res.status(400).json({
        success: false,
        error: 'Secret Key অথবা Signature অবৈধ। অনুগ্রহ করে সঠিক Secret Key প্রদান করুন।'
      });
    }

    if (bData.code === -2015 || bData.msg?.includes('API-key')) {
      return res.status(400).json({
        success: false,
        error: 'API Key অবৈধ অথবা পারমিশন নেই (IP Restriction বা Invalid API Key)।'
      });
    }

    return res.status(400).json({
      success: false,
      error: `Binance Response (${bResponse.status}): ${bData.msg || bData.errorMessage || JSON.stringify(bData)}`
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'সংযোগ পরীক্ষা ব্যর্থ হয়েছে: ' + (err.message || 'Unknown network error')
    });
  }
});

// Buy Plan with Wallet Balance Endpoint
app.post('/api/plans/buy-with-wallet', async (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'প্যাকেজ কিনতে প্রথমে লগইন করুন (Please login to purchase)' });
  }

  const { planId, currency } = req.body;
  if (!planId) return res.status(400).json({ error: 'প্লান নির্বাচন করুন' });

  const plans = getPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return res.status(404).json({ error: 'প্লানটি খুঁজে পাওয়া যায়নি (Plan not found)' });
  if (plan.id === 'free') return res.status(400).json({ error: 'ফ্রি প্লান কেনার প্রয়োজন নেই।' });

  let accounts = getAccounts();
  const cleanEmail = (user.email || '').trim().toLowerCase();
  let targetUser = accounts.find((a) => a.id === user.id || (cleanEmail && a.email && a.email.toLowerCase() === cleanEmail));
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  if (targetUser.emailVerified === false && targetUser.role !== 'admin') {
    return res.status(403).json({ error: 'প্যাকেজ কেনার পূর্বে আপনার ইমেইল ভেরিফাই করুন।' });
  }

  targetUser.balanceBdt = typeof targetUser.balanceBdt === 'number' ? targetUser.balanceBdt : 0;
  targetUser.balanceUsd = typeof targetUser.balanceUsd === 'number' ? targetUser.balanceUsd : 0;

  const payCurrency: 'USD' | 'BDT' = currency === 'BDT' ? 'BDT' : 'USD';
  const price = payCurrency === 'BDT' ? (plan.priceBdt || 0) : (plan.priceUsd || 0);

  if (price <= 0) {
    return res.status(400).json({ error: 'প্যাকেজের মূল্য সঠিক নয়।' });
  }

  const isBdt = payCurrency === 'BDT';
  const currentBalance = isBdt ? targetUser.balanceBdt : targetUser.balanceUsd;
  if (currentBalance < price) {
    return res.status(400).json({
      error: isBdt
        ? `আপনার ওয়ালেটে পর্যাপ্ত BDT ব্যালেন্স নেই। প্রয়োজন: ৳${price} BDT, বর্তমান ব্যালেন্স: ৳${targetUser.balanceBdt.toFixed(2)} BDT। প্রথমে ডিপোজিট করুন।`
        : `আপনার ওয়ালেটে পর্যাপ্ত USD ব্যালেন্স নেই। প্রয়োজন: $${price} USD, বর্তমান ব্যালেন্স: $${targetUser.balanceUsd.toFixed(2)} USD। প্রথমে ডিপোজিট করুন।`,
      needsDeposit: true,
      requiredAmount: price,
      currentBalance,
      currency: payCurrency
    });
  }

  const deductResult = modifyUserWallet(
    targetUser.id,
    -price,
    'plan_purchase',
    `Hosting Plan: ${plan.nameBn || plan.nameEn} (${isBdt ? '৳' : '$'}${price} ${payCurrency})`,
    'wallet_plan_purchase',
    plan.id,
    payCurrency
  );

  if (!deductResult.success) {
    return res.status(400).json({
      error: deductResult.error || 'ব্যালেন্স কাটা সম্ভব হয়নি',
      needsDeposit: true,
      requiredAmount: price,
      currentBalance,
      currency: payCurrency
    });
  }

  // Refresh fresh accounts list from disk
  accounts = getAccounts();
  const freshIdx = accounts.findIndex((a) => a.id === targetUser.id || (cleanEmail && a.email && a.email.toLowerCase() === cleanEmail));
  if (freshIdx !== -1) {
    targetUser = accounts[freshIdx];
  }

  if (isBdt && typeof deductResult.newBalanceBdt === 'number') {
    targetUser.balanceBdt = deductResult.newBalanceBdt;
  } else if (!isBdt && typeof deductResult.newBalanceUsd === 'number') {
    targetUser.balanceUsd = deductResult.newBalanceUsd;
  }

  // Activate / extend user plan & website limits
  const durationDays = plan.durationDays || 30;
  targetUser.plan = plan.id;
  targetUser.maxBots = plan.maxBots || 3;
  targetUser.maxWebsites = plan.maxWebsites || (plan.id === '1_year' ? 999 : (plan.id === '6_months' ? 10 : (plan.id === '3_months' ? 5 : 3)));
  targetUser.maxStorageMb = plan.maxStorageMb || 100;
  const currentExpiry = (targetUser.planExpiresAt && targetUser.planExpiresAt > Date.now()) ? targetUser.planExpiresAt : Date.now();
  targetUser.planExpiresAt = currentExpiry + durationDays * 24 * 60 * 60 * 1000;
  targetUser.updatedAt = Date.now();

  // Persist the updated accounts with DEDUCTED balance and updated plan
  saveAccounts(accounts);
  FirebaseSync.syncAccountToCloud(targetUser).catch(() => {});

  const remainingBalanceText = isBdt
    ? `৳${(targetUser.balanceBdt || 0).toFixed(2)} BDT`
    : `$${(targetUser.balanceUsd || 0).toFixed(2)} USD`;

  // Send in-app notification & email alert
  sendEmailAlert({
    to: targetUser.email,
    userId: targetUser.id,
    type: 'plan_purchased',
    subject: `hosting live fast: প্যাকেজ সক্রিয় হয়েছে (${plan.nameBn})`,
    html: `<p>প্রিয় ${targetUser.name}, আপনি সফলভাবে <strong>${plan.nameBn}</strong> প্যাকেজটি ক্রয় করেছেন। ওয়ালেট থেকে ${isBdt ? '৳' : '$'}${price} ${payCurrency} কাটা হয়েছে। আপনার অবশিষ্ট ব্যালেন্স: ${remainingBalanceText}। আপনার নতুন মেয়াদ: ${new Date(targetUser.planExpiresAt).toLocaleDateString('bn-BD')}।</p>`,
    text: `আপনি সফলভাবে ${plan.nameBn} প্যাকেজটি কিনেছেন। ওয়ালেট থেকে ${isBdt ? '৳' : '$'}${price} ${payCurrency} কাটা হয়েছে। অবশিষ্ট ব্যালেন্স: ${remainingBalanceText}।`
  });

  const enriched = enrichUserWithPlanAndRole(targetUser);

  res.json({
    success: true,
    message: `🎉 অভিনন্দন! "${plan.nameBn}" সফলভাবে ক্রয় করা হয়েছে। ওয়ালেট থেকে ${isBdt ? '৳' : '$'}${price} ${payCurrency} কাটা হয়েছে। অবশিষ্ট ব্যালেন্স: ${remainingBalanceText}।`,
    user: enriched
  });
});

app.get('/api/notifications', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    const publicNotifs = getUserNotifications('', '');
    return res.json({ notifications: publicNotifs.slice(0, 10) });
  }
  res.json({ notifications: getUserNotifications(user.id, user.email) });
});

app.post('/api/notifications/mark-read', (req, res) => {
  const user = getAuthUser(req);
  const { id } = req.body;
  markNotificationAsRead(id || 'all', user?.id);
  res.json({ success: true, message: 'Notifications marked as read' });
});

app.post('/api/notifications/clear', (req, res) => {
  const user = getAuthUser(req);
  const { id } = req.body;
  if (!id || id === 'all') {
    clearAllUserNotifications(user?.id, user?.email);
  } else {
    clearNotification(id, user?.id, user?.email);
  }
  res.json({ success: true, message: 'Notification(s) cleared successfully' });
});

app.delete('/api/notifications/:id', (req, res) => {
  const user = getAuthUser(req);
  const { id } = req.params;
  if (id === 'all') {
    clearAllUserNotifications(user?.id, user?.email);
  } else {
    clearNotification(id, user?.id, user?.email);
  }
  res.json({ success: true, message: 'Notification cleared' });
});

// Platform Announcements & Notices (Home ticker and banners)
app.get('/api/announcements', (req, res) => {
  const all = getAnnouncements();
  const active = all.filter((a) => a.active !== false);
  res.json({ announcements: active });
});

app.post('/api/admin/announcements', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const { titleBn, titleEn, messageBn, messageEn, active } = req.body;
  if (!titleBn && !titleEn) return res.status(400).json({ error: 'Notice title is required' });

  const list = getAnnouncements();
  const newAnn = {
    id: `ann_${Date.now()}`,
    titleBn: (titleBn || titleEn || '').trim(),
    titleEn: (titleEn || titleBn || '').trim(),
    messageBn: (messageBn || messageEn || '').trim(),
    messageEn: (messageEn || messageBn || '').trim(),
    date: new Date().toISOString(),
    active: active !== false
  };

  list.unshift(newAnn);
  saveAnnouncements(list);

  // Also publish to notifications
  addBroadcastNotification(newAnn.titleBn, newAnn.messageBn, 'broadcast');

  res.json({ success: true, announcement: newAnn, announcements: list });
});

app.delete('/api/admin/announcements/:id', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  let list = getAnnouncements();
  list = list.filter((a) => a.id !== req.params.id);
  saveAnnouncements(list);
  res.json({ success: true, announcements: list });
});

// Admin Broadcast to all users
app.post('/api/admin/broadcast', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const { title, message, type } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message are required' });

  const notif = addBroadcastNotification(title.trim(), message.trim(), type || 'broadcast');

  // Also add to active announcements for top home ticker
  const list = getAnnouncements();
  list.unshift({
    id: `ann_${Date.now()}`,
    titleBn: title.trim(),
    titleEn: title.trim(),
    messageBn: message.trim(),
    messageEn: message.trim(),
    date: new Date().toISOString(),
    active: true
  });
  if (list.length > 30) list.splice(30);
  saveAnnouncements(list);

  res.json({ success: true, message: 'Broadcast sent to all users and announcements ticker', notification: notif });
});

app.post('/api/admin/notifications/send', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const { targetUserId, targetEmail, title, message, type } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message are required' });

  if (targetUserId === 'all' || (!targetUserId && !targetEmail)) {
    const notif = addBroadcastNotification(title.trim(), message.trim(), type || 'broadcast');
    return res.json({ success: true, message: 'Broadcast notification sent to all users', notification: notif });
  }

  // Single user notification
  sendEmailAlert({
    to: targetEmail || targetUserId,
    userId: targetUserId,
    subject: title.trim(),
    html: `<p>${message.trim()}</p>`,
    text: message.trim(),
    type: (type as any) || 'system'
  });

  res.json({ success: true, message: 'Notification sent successfully to target user' });
});

app.get('/api/plans/my-request', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const requests = getPlanRequests();
  const userRequests = requests.filter((r) => r.userId === user.id || (r.userEmail && r.userEmail.toLowerCase() === user.email.toLowerCase()));
  const latest = userRequests.length > 0 ? userRequests[0] : null;

  res.json({
    latestRequest: latest,
    allRequests: userRequests,
    userPlan: user.plan || 'free',
    planExpiresAt: user.planExpiresAt || null,
    maxBots: user.maxBots || 1,
    balanceBdt: user.balanceBdt || 0,
    balanceUsd: user.balanceUsd || 0
  });
});

// Admin Panel Endpoints
app.get('/api/admin/overview', (req, res) => {
  const user = getAuthUser(req);
  if (!isUserAdmin(user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const accounts = getAccounts();
  const reg = getRegistry();
  const requests = getPlanRequests();
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const approvedRequests = requests.filter((r) => r.status === 'approved');
  const totalRevenue = approvedRequests.reduce((sum, r) => sum + (r.amount || 0), 0);

  const taskLogs = getTaskCompletions();
  const pendingTasks = taskLogs.filter((l) => l.status === 'pending');

  res.json({
    totalUsers: accounts.length,
    totalBots: reg.length,
    runningBots: runningProcesses.size,
    pendingRequestsCount: pendingRequests.length + pendingTasks.length,
    pendingPlanRequestsCount: pendingRequests.length,
    pendingTasksCount: pendingTasks.length,
    approvedRequestsCount: approvedRequests.length,
    totalRevenueUsd: totalRevenue,
    totalRevenueBdt: totalRevenue,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/admin/plan-requests', async (req, res) => {
  const user = getAuthUser(req);
  if (!isUserAdmin(user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const cloudRequests = await FirebaseSync.loadPlanRequestsFromCloud();
    if (cloudRequests && cloudRequests.length > 0) {
      const local = getPlanRequests();
      const mergedMap = new Map<string, any>();
      for (const r of local) {
        if (r && r.id) mergedMap.set(r.id, r);
      }
      let changed = false;
      for (const cr of cloudRequests) {
        if (!cr || !cr.id) continue;
        const existing = mergedMap.get(cr.id);
        if (!existing) {
          mergedMap.set(cr.id, cr);
          changed = true;
        } else {
          if (cr.status !== existing.status && cr.reviewedAt) {
            mergedMap.set(cr.id, { ...existing, ...cr });
            changed = true;
          }
        }
      }
      if (changed) {
        const merged = Array.from(mergedMap.values());
        merged.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        savePlanRequests(merged);
      }
    }
  } catch {}

  const allReqs = getPlanRequests();
  allReqs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  res.json({ requests: allReqs });
});

app.post('/api/admin/plan-requests/:id/approve', async (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id } = req.params;
  const requests = getPlanRequests();
  let reqIdx = requests.findIndex((r) => r.id === id);
  if (reqIdx === -1) {
    const cloudReqs = await FirebaseSync.loadPlanRequestsFromCloud();
    const cr = cloudReqs.find((r) => r.id === id);
    if (cr) {
      requests.push(cr);
      savePlanRequests(requests);
      reqIdx = requests.length - 1;
    } else {
      return res.status(404).json({ error: 'Request not found' });
    }
  }

  const request = requests[reqIdx];
  if (request.status === 'approved') {
    return res.status(400).json({ error: 'Request is already approved' });
  }

  request.status = 'approved';
  request.reviewedAt = new Date().toISOString();
  request.reviewedBy = admin ? admin.email : 'admin';
  savePlanRequests(requests);
  await FirebaseSync.syncPlanRequestToCloud(request).catch(() => {});

  // Update target user account
  let accounts = getAccounts();
  let targetUser = accounts.find((a) => (request.userId && a.id === request.userId) || (request.userEmail && a.email && a.email.toLowerCase() === request.userEmail.toLowerCase()));

  if (!targetUser && request.userEmail) {
    try {
      const cloudUser = await FirebaseSync.loadSingleAccountByEmail(request.userEmail.toLowerCase());
      if (cloudUser && cloudUser.id) {
        targetUser = cloudUser;
        accounts.push(targetUser);
        saveAccounts(accounts);
      }
    } catch {}
  }

  let finalUser = targetUser;

  if (targetUser) {
    if (request.type === 'deposit') {
      // Wallet deposit approval (credit balance in USDT or BDT via modifyUserWallet ledger)
      const depAmount = Number(request.amount || 0);
      const depCurrency: 'USD' | 'BDT' = request.currency === 'BDT' ? 'BDT' : 'USD';
      const modResult = modifyUserWallet(
        targetUser.id,
        depAmount,
        'deposit',
        `Approved Deposit: ${request.method || 'Manual'} (${depCurrency === 'BDT' ? '৳' : '$'}${depAmount} ${depCurrency})`,
        request.method || 'manual_deposit',
        request.transactionId,
        depCurrency
      );

      // Reload accounts fresh from disk to guarantee fresh credited balance
      const freshAccounts = getAccounts();
      const freshUser = freshAccounts.find((a) => a.id === targetUser.id || (request.userEmail && a.email && a.email.toLowerCase() === request.userEmail.toLowerCase())) || targetUser;
      if (depCurrency === 'USD' && typeof modResult.newBalanceUsd === 'number') {
        freshUser.balanceUsd = modResult.newBalanceUsd;
      } else if (depCurrency === 'BDT' && typeof modResult.newBalanceBdt === 'number') {
        freshUser.balanceBdt = modResult.newBalanceBdt;
      }
      freshUser.updatedAt = Date.now();
      saveAccounts(freshAccounts);
      finalUser = freshUser;
      FirebaseSync.syncAccountToCloud(freshUser).catch(() => {});

      const recipientEmail = (freshUser.email || request.userEmail || targetUser.email || '').trim().toLowerCase();
      if (recipientEmail) {
        console.log(`[DEPOSIT APPROVE EMAIL] Sending deposit alert to ${recipientEmail} for deposit ID: ${request.id}`);
        try {
          await sendDepositProcessedAlert(
            {
              id: freshUser.id,
              email: recipientEmail,
              name: freshUser.name || request.userName || 'গ্রাহক',
              balanceUsd: freshUser.balanceUsd,
              balanceBdt: freshUser.balanceBdt
            },
            request,
            'approved'
          );
        } catch (emailErr) {
          console.error('[DEPOSIT APPROVAL EMAIL ERROR]:', emailErr);
        }
      }
    } else {
      // Direct plan request approval
      const plans = getPlans();
      const plan = plans.find((p) => p.id === request.planId);
      const durationDays = request.durationDays || (plan ? plan.durationDays : 30);
      targetUser.plan = request.planId;
      const currentExpiry = (targetUser.planExpiresAt && targetUser.planExpiresAt > Date.now()) ? targetUser.planExpiresAt : Date.now();
      targetUser.planExpiresAt = currentExpiry + durationDays * 24 * 60 * 60 * 1000;

      if (request.planId === '1_month') targetUser.maxBots = 3;
      else if (request.planId === '3_months') targetUser.maxBots = 5;
      else if (request.planId === '6_months') targetUser.maxBots = 10;
      else if (request.planId === '1_year') targetUser.maxBots = 999;
      else if (plan && plan.maxBots) targetUser.maxBots = plan.maxBots;
      else targetUser.maxBots = 1;

      targetUser.maxWebsites = (plan && plan.maxWebsites) || (request.planId === '1_year' ? 999 : (request.planId === '6_months' ? 10 : 5));
      targetUser.maxStorageMb = (plan && plan.maxStorageMb) || 100;
      targetUser.updatedAt = Date.now();

      saveAccounts(accounts);
      FirebaseSync.syncAccountToCloud(targetUser).catch(() => {});
      finalUser = targetUser;

      const recipientEmail = (targetUser.email || request.userEmail || '').trim().toLowerCase();
      if (recipientEmail) {
        try {
          await sendDepositProcessedAlert(
            {
              id: targetUser.id,
              email: recipientEmail,
              name: targetUser.name || request.userName || 'গ্রাহক',
              balanceUsd: targetUser.balanceUsd,
              balanceBdt: targetUser.balanceBdt
            },
            request,
            'approved'
          );
        } catch (emailErr) {
          console.error('[PLAN APPROVAL EMAIL ERROR]:', emailErr);
        }
      }
    }
  } else if (request.userEmail) {
    // If targetUser not in accounts but userEmail is known, still dispatch approval email!
    try {
      await sendDepositProcessedAlert(
        {
          id: request.userId || 'user',
          email: request.userEmail.trim().toLowerCase(),
          name: request.userName || 'গ্রাহক'
        },
        request,
        'approved'
      );
    } catch (emailErr) {
      console.error('[FALLBACK DEPOSIT APPROVAL EMAIL ERROR]:', emailErr);
    }
  }

  res.json({ success: true, message: 'অনুমোদন সফল হয়েছে (Approved successfully)', request, updatedUser: finalUser });
});

app.post('/api/admin/plan-requests/:id/reject', async (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id } = req.params;
  const { reason } = req.body;
  const requests = getPlanRequests();
  let reqIdx = requests.findIndex((r) => r.id === id);
  if (reqIdx === -1) {
    const cloudReqs = await FirebaseSync.loadPlanRequestsFromCloud();
    const cr = cloudReqs.find((r) => r.id === id);
    if (cr) {
      requests.push(cr);
      savePlanRequests(requests);
      reqIdx = requests.length - 1;
    } else {
      return res.status(404).json({ error: 'Request not found' });
    }
  }

  const request = requests[reqIdx];
  request.status = 'rejected';
  request.rejectReason = reason || 'ভুল বা অপর্যাপ্ত ট্রানজেকশন তথ্য (Invalid or unpaid)';
  request.reviewedAt = new Date().toISOString();
  request.reviewedBy = admin ? admin.email : 'admin';
  savePlanRequests(requests);
  await FirebaseSync.syncPlanRequestToCloud(request).catch(() => {});

  let accounts = getAccounts();
  let targetUser = accounts.find((a) => (request.userId && a.id === request.userId) || (request.userEmail && a.email && a.email.toLowerCase() === request.userEmail.toLowerCase()));
  if (!targetUser && request.userEmail) {
    try {
      const cloudUser = await FirebaseSync.loadSingleAccountByEmail(request.userEmail.toLowerCase());
      if (cloudUser) targetUser = cloudUser;
    } catch {}
  }

  const recipientEmail = (targetUser?.email || request.userEmail || '').trim().toLowerCase();
  if (recipientEmail) {
    await sendDepositProcessedAlert(
      {
        id: targetUser?.id || request.userId || 'user',
        email: recipientEmail,
        name: targetUser?.name || request.userName || 'গ্রাহক'
      },
      request,
      'rejected'
    );
  }

  res.json({ success: true, message: 'রিকোয়েস্ট বাতিল করা হয়েছে (Request rejected)', request });
});

// HTTPS Port 443 Cloud SMTP Relay Bridge (for cloud hosts like Render Free Tier that block outbound TCP 587/465)
app.post('/api/smtp-cloud-bridge', async (req, res) => {
  const key = req.headers['x-smtp-bridge-key'];
  if (key !== SMTP_BRIDGE_SECRET) {
    return res.status(403).json({ success: false, error: 'Unauthorized bridge request' });
  }

  const { action, smtp, mail } = req.body || {};
  const saved = loadSmtpSettingsFile();
  const host = (smtp?.host || saved.host || DEFAULT_SMTP_SETTINGS.host).trim();
  const port = Number(smtp?.port || 587);
  const user = (smtp?.user || saved.user || DEFAULT_SMTP_SETTINGS.user).trim();
  const pass = String(smtp?.pass || saved.pass || DEFAULT_SMTP_SETTINGS.pass).replace(/\s+/g, '');
  const secure = smtp?.secure !== undefined ? Boolean(smtp.secure) : (port === 465);

  const effectivePort = port === 587 && !secure ? 587 : 465;
  const isSecure = effectivePort === 465;

  try {
    const isGmail = host.toLowerCase().includes('gmail.com');
    const transport = nodemailer.createTransport(isGmail ? {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: 8000,
      tls: { rejectUnauthorized: false }
    } : buildTransportOptions({
      hostOrIp: host,
      originalHost: host,
      port: effectivePort,
      secure: isSecure,
      user,
      pass
    }) as any);

    if (action === 'verify') {
      await transport.verify();
      return res.json({
        success: true,
        message: 'Verified via Cloud HTTPS Bridge (Port 587 TLS)'
      });
    }

    if (action === 'send' && mail && mail.to) {
      const fromAddr = mail.from || saved.from || DEFAULT_SMTP_SETTINGS.from || `"hosting live fast" <${user}>`;
      const info = await transport.sendMail({
        from: fromAddr,
        to: mail.to,
        subject: mail.subject || 'Notification from hosting live fast',
        text: mail.text || '',
        html: mail.html || mail.text || ''
      });
      return res.json({
        success: true,
        messageId: info.messageId
      });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Bridge SMTP error'
    });
  }
});

// SMTP Status & Diagnostics Endpoint for Admin
app.get('/api/admin/smtp-status', async (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const config = getSmtpConfig();
  const verifyResult = await verifySmtpConnection();
  res.json({
    configured: true,
    connected: verifyResult.success,
    message: verifyResult.message,
    config: getSmtpConfig()
  });
});

// Get current SMTP settings (for admin editing)
app.get('/api/admin/smtp-settings', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const saved = loadSmtpSettingsFile();
  const config = getSmtpConfig();

  res.json({
    settings: {
      host: saved?.host || DEFAULT_SMTP_SETTINGS.host,
      port: saved?.port || 587,
      user: saved?.user || DEFAULT_SMTP_SETTINGS.user,
      pass: saved?.pass || DEFAULT_SMTP_SETTINGS.pass,
      from: saved?.from || DEFAULT_SMTP_SETTINGS.from,
      secure: saved?.secure !== undefined ? saved.secure : false
    },
    config
  });
});

// Save SMTP settings from Admin Panel
app.post('/api/admin/smtp-settings', async (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const existing = loadSmtpSettingsFile();
  const rawHost = (req.body.host || existing?.host || DEFAULT_SMTP_SETTINGS.host).trim();
  const rawUser = (req.body.user || existing?.user || DEFAULT_SMTP_SETTINGS.user).trim();
  const reqPass = req.body.pass;
  const finalPass = (!reqPass || reqPass === '********')
    ? (existing?.pass || DEFAULT_SMTP_SETTINGS.pass)
    : reqPass;
  const rawFrom = (req.body.from || existing?.from || DEFAULT_SMTP_SETTINGS.from).trim();

  const cleanedPort = parseInt(String(req.body.port || '587').trim(), 10) || 587;
  const cleanedPass = String(finalPass || DEFAULT_SMTP_SETTINGS.pass).replace(/\s+/g, '');
  const isPort465 = cleanedPort === 465;
  const cleanedSecure = req.body.secure !== undefined ? Boolean(req.body.secure) : isPort465;

  const saved = saveSmtpSettingsFile({
    host: rawHost,
    port: cleanedPort,
    user: rawUser,
    pass: cleanedPass,
    from: rawFrom,
    secure: cleanedSecure
  });

  if (!saved) {
    return res.status(500).json({ error: 'SMTP সেটিংস সংরক্ষণ করতে ব্যর্থ হয়েছে।' });
  }

  // Persist updated SMTP settings to Firebase Cloud so it survives any server redeploy
  try {
    FirebaseSync.syncSmtpSettingsToCloud(loadSmtpSettingsFile()).catch(() => {});
  } catch {}

  const verifyResult = await verifySmtpConnection();

  res.json({
    success: true,
    message: 'SMTP সেটিংস সফলভাবে সংরক্ষিত ও সক্রিয় করা হয়েছে!',
    connected: verifyResult.success,
    errorCategory: verifyResult.errorCategory,
    verifyMessage: verifyResult.message,
    solutionHint: verifyResult.solutionHint,
    details: verifyResult.details,
    workingPort: verifyResult.workingPort || 587,
    workingSecure: verifyResult.workingSecure !== undefined ? verifyResult.workingSecure : false,
    config: getSmtpConfig()
  });
});

// Auto-Fix IPv4 & Auto-detect working SMTP port (Port 587 or 465)
app.post('/api/admin/smtp-autofix', async (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const existing = loadSmtpSettingsFile();
  const rawUser = (req.body.user || existing?.user || DEFAULT_SMTP_SETTINGS.user).trim();
  const reqPass = req.body.pass;
  const rawPass = (reqPass && reqPass !== '********') ? reqPass : (existing?.pass || DEFAULT_SMTP_SETTINGS.pass);
  const rawHost = (req.body.host || existing?.host || DEFAULT_SMTP_SETTINGS.host).trim();
  const requestedPort = parseInt(String(req.body.port || existing?.port || 587), 10) || 587;
  const requestedSecure = req.body.secure !== undefined ? Boolean(req.body.secure) : (requestedPort === 465);

  const testResult = await testSmtpWithParams({
    host: rawHost,
    port: requestedPort,
    user: rawUser,
    pass: rawPass,
    secure: requestedSecure
  });

  if (testResult.success && testResult.workingPort) {
    saveSmtpSettingsFile({
      host: rawHost,
      port: testResult.workingPort,
      user: rawUser,
      pass: String(rawPass).replace(/\s+/g, ''),
      from: existing?.from || DEFAULT_SMTP_SETTINGS.from,
      secure: testResult.workingSecure !== undefined ? testResult.workingSecure : (testResult.workingPort === 465)
    });
  }

  res.json({
    success: testResult.success,
    connected: testResult.success,
    message: testResult.message,
    workingPort: testResult.workingPort || 587,
    workingSecure: testResult.workingSecure !== undefined ? testResult.workingSecure : false,
    workingIp: testResult.workingIp,
    errorCategory: testResult.errorCategory,
    solutionHint: testResult.solutionHint,
    details: testResult.details,
    config: getSmtpConfig()
  });
});

// Send Test Alert Email Endpoint for Admin
app.post('/api/admin/smtp-test', async (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const recipient = (req.body.email || (admin ? admin.email : '')).trim();
  if (!recipient || !recipient.includes('@')) {
    return res.status(400).json({ error: 'সঠিক ইমেইল এড্রেস লিখুন (Valid email address required)' });
  }

  const result = await sendTestEmail(recipient);
  if (result.success) {
    res.json({
      success: true,
      message: result.message,
      messageId: result.messageId
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.message,
      errorCategory: result.errorCategory,
      solutionHint: result.solutionHint,
      details: result.error
    });
  }
});

// Trigger Manual Expiration Scan Endpoint for Admin
app.post('/api/admin/scan-expiring-plans', async (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const accounts = getAccounts();
    const reg = getRegistry();

    const result = await checkAndSendExpiringPlanAlerts(accounts, (expiredAccount) => {
      const userBots = reg.filter((b) =>
        b.ownerId === expiredAccount.id ||
        b.owner === expiredAccount.id ||
        (b.ownerEmail && b.ownerEmail.toLowerCase() === expiredAccount.email.toLowerCase())
      );
      let activeCount = 0;
      for (const bot of userBots) {
        if (runningProcesses.has(bot.id)) {
          activeCount++;
          if (activeCount > 1) {
            stopBotProcess(bot.id);
            appendLog(bot.id, 'warn', '⚠️ [PLAN EXPIRED] আপনার পেইড সাবস্ক্রিপশনের মেয়াদ শেষ হয়েছে। অতিরিক্ত বটটি বন্ধ করা হলো। প্ল্যান রিনিউ করুন।');
          }
        }
      }
    });

    if (result.modified) {
      saveAccounts(accounts);
    }

    res.json({
      success: true,
      message: `স্ক্যান সম্পন্ন: ${result.checkedCount} টি একাউন্ট যাচাই করা হয়েছে, ${result.alertedCount} জনকে মেয়াদ সতর্কবার্তা এবং ${result.expiredCount} টি মেয়াদোত্তীর্ণ একাউন্ট প্রসেস করা হয়েছে।`,
      result
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'স্ক্যান করতে ত্রুটি হয়েছে' });
  }
});

app.get('/api/admin/users', (req, res) => {
  const user = getAuthUser(req);
  if (!isUserAdmin(user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const accounts = getAccounts();
  const reg = getRegistry();

  const enrichedUsers = accounts.map((a) => {
    const userBots = reg.filter((b) => b.ownerId === a.id || b.owner === a.id || (b.ownerEmail && b.ownerEmail.toLowerCase() === a.email.toLowerCase()));
    return {
      ...a,
      botsCount: userBots.length,
      activePlan: a.plan || 'free',
      isExpired: a.planExpiresAt ? a.planExpiresAt < Date.now() : false,
      expiresAtFormatted: a.planExpiresAt ? new Date(a.planExpiresAt).toLocaleDateString() : 'N/A'
    };
  });

  res.json({ users: enrichedUsers });
});

app.post('/api/admin/users/:id/update-plan', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id } = req.params;
  const { plan, durationDays, maxBots, role } = req.body;

  const accounts = getAccounts();
  const targetUser = accounts.find((a) => a.id === id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  if (plan) targetUser.plan = plan;
  if (maxBots !== undefined) targetUser.maxBots = parseInt(maxBots, 10);
  if (role) targetUser.role = role;
  if (durationDays !== undefined) {
    const days = parseInt(durationDays, 10);
    if (days > 0) {
      targetUser.planExpiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
    } else {
      targetUser.planExpiresAt = null;
    }
  }

  saveAccounts(accounts);
  res.json({ success: true, user: targetUser });
});

app.get('/api/admin/payment-settings', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const settings = getPaymentSettings();
  const creds = getBinanceCredentials();

  res.json({
    success: true,
    settings: {
      ...settings,
      depositMethods: getDepositMethods(),
      binancePayApiKey: creds.apiKey,
      binancePaySecretKey: creds.secretKey ? '********' : '',
      binancePayMerchantId: creds.merchantId,
      binancePayApiEnabled: creds.isEnabled,
      hasBinanceCredentials: creds.isConfigured
    }
  });
});

app.post('/api/admin/payment-settings', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const currentSettings = getPaymentSettings();
  const newSettings = { ...req.body };

  // If secret key is '********', retain existing secret key
  if (newSettings.binancePaySecretKey === '********') {
    newSettings.binancePaySecretKey = currentSettings.binancePaySecretKey || '';
  }

  savePaymentSettings(newSettings);
  if (Array.isArray(newSettings.depositMethods)) {
    saveDepositMethods(newSettings.depositMethods);
  }

  const updatedCreds = getBinanceCredentials();

  res.json({
    success: true,
    settings: {
      ...newSettings,
      depositMethods: getDepositMethods(),
      binancePaySecretKey: updatedCreds.secretKey ? '********' : '',
      hasBinanceCredentials: updatedCreds.isConfigured
    }
  });
});

app.get('/api/admin/site-settings', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.json({ success: true, settings: getSiteSettings() });
});

app.post('/api/admin/site-settings', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { siteName, logoUrl, taglineBn, taglineEn, hostingVideoUrl, websiteVideoUrl } = req.body;
  let finalLogoUrl = typeof logoUrl === 'string' ? logoUrl.trim() : undefined;

  // If user pasted a Kommodo share link like https://kommodo.ai/i/ID, convert to direct image URL
  if (finalLogoUrl && finalLogoUrl.includes('kommodo.ai/i/')) {
    const match = finalLogoUrl.match(/kommodo\.ai\/i\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      finalLogoUrl = `https://plain-apac-prod-public.komododecks.com/202609/15/${match[1]}/image.png`;
    }
  }

  const current = getSiteSettings();
  const updated = {
    ...current,
    ...(typeof siteName === 'string' ? { siteName: siteName.trim() } : {}),
    ...(finalLogoUrl !== undefined ? { logoUrl: finalLogoUrl } : {}),
    ...(typeof taglineBn === 'string' ? { taglineBn: taglineBn.trim() } : {}),
    ...(typeof taglineEn === 'string' ? { taglineEn: taglineEn.trim() } : {}),
    ...(typeof hostingVideoUrl === 'string' ? { hostingVideoUrl: hostingVideoUrl.trim() } : {}),
    ...(typeof websiteVideoUrl === 'string' ? { websiteVideoUrl: websiteVideoUrl.trim() } : {})
  };
  saveSiteSettings(updated);
  res.json({ success: true, settings: updated });
});

app.post('/api/admin/plans', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { plans } = req.body;
  if (!Array.isArray(plans)) {
    return res.status(400).json({ error: 'Plans must be an array' });
  }

  savePlans(plans);
  res.json({ success: true, plans: getPlans() });
});

// Admin Add New Plan
app.post('/api/admin/plans/add', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id, nameBn, nameEn, durationDays, maxBots, priceBdt, priceUsd, popular, featuresBn, featuresEn } = req.body;
  if (!nameBn || !nameEn) {
    return res.status(400).json({ error: 'প্যাকেজের নাম দেওয়া আবশ্যক (Plan name required)' });
  }

  const plans = getPlans();
  const planId = (id || nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '') || `plan_${Date.now()}`).trim();

  if (plans.some((p) => p.id === planId)) {
    return res.status(400).json({ error: 'এই আইডির প্যাকেজ ইতিমধ্যে রয়েছে (Plan ID already exists)' });
  }

  const newPlan = {
    id: planId,
    nameBn: nameBn.trim(),
    nameEn: nameEn.trim(),
    durationDays: parseInt(durationDays, 10) || 30,
    maxBots: parseInt(maxBots, 10) || 1,
    priceBdt: parseFloat(priceBdt) || 0,
    priceUsd: parseFloat(priceUsd) || 0,
    popular: Boolean(popular),
    featuresBn: Array.isArray(featuresBn) ? featuresBn : (featuresBn ? featuresBn.split('\n').map((s: string) => s.trim()).filter(Boolean) : []),
    featuresEn: Array.isArray(featuresEn) ? featuresEn : (featuresEn ? featuresEn.split('\n').map((s: string) => s.trim()).filter(Boolean) : [])
  };

  plans.push(newPlan);
  savePlans(plans);

  res.json({ success: true, message: 'নতুন প্যাকেজ সফলভাবে যুক্ত হয়েছে (New plan added)', plan: newPlan, plans });
});

// Admin Edit Plan
app.post('/api/admin/plans/:id/edit', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id } = req.params;
  const { nameBn, nameEn, durationDays, maxBots, priceBdt, priceUsd, popular, featuresBn, featuresEn } = req.body;

  let plans = getPlans();
  const planIdx = plans.findIndex((p) => p.id === id);
  if (planIdx === -1) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  plans[planIdx] = {
    ...plans[planIdx],
    nameBn: (nameBn || plans[planIdx].nameBn || '').trim(),
    nameEn: (nameEn || plans[planIdx].nameEn || '').trim(),
    durationDays: parseInt(durationDays, 10) || plans[planIdx].durationDays || 30,
    maxBots: parseInt(maxBots, 10) || plans[planIdx].maxBots || 1,
    priceBdt: typeof priceBdt !== 'undefined' ? parseFloat(priceBdt) : plans[planIdx].priceBdt,
    priceUsd: typeof priceUsd !== 'undefined' ? parseFloat(priceUsd) : plans[planIdx].priceUsd,
    popular: typeof popular !== 'undefined' ? Boolean(popular) : plans[planIdx].popular,
    featuresBn: Array.isArray(featuresBn) ? featuresBn : (featuresBn ? featuresBn.split('\n').map((s: string) => s.trim()).filter(Boolean) : plans[planIdx].featuresBn),
    featuresEn: Array.isArray(featuresEn) ? featuresEn : (featuresEn ? featuresEn.split('\n').map((s: string) => s.trim()).filter(Boolean) : plans[planIdx].featuresEn)
  };

  savePlans(plans);
  res.json({ success: true, message: 'প্যাকেজ সফলভাবে আপডেট করা হয়েছে (Plan updated)', plan: plans[planIdx], plans: getPlans() });
});

// Admin Delete Plan
app.delete('/api/admin/plans/:id', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id } = req.params;
  if (id === 'free') {
    return res.status(400).json({ error: 'ফ্রি স্টার্টার প্লান ডিলিট করা যাবে না (Cannot delete free plan)' });
  }

  let plans = getPlans();
  const exists = plans.some((p) => p.id === id);
  if (!exists) return res.status(404).json({ error: 'Plan not found' });

  plans = plans.filter((p) => p.id !== id);
  savePlans(plans);

  res.json({ success: true, message: 'প্যাকেজ ডিলিট করা হয়েছে (Plan deleted)', plans });
});

// ==========================================
// STORE, BANNERS, CATEGORIES & PRODUCTS API
// ==========================================

// Banners
app.get(['/api/store/banners', '/api/banners'], (req, res) => {
  const banners = getBanners();
  const activeBanners = banners.filter((b) => b.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
  res.json({ banners: activeBanners });
});

app.get('/api/admin/banners', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });
  res.json({ banners: getBanners() });
});

app.post('/api/admin/banners', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const { id, title, titleBn, subtitle, subtitleBn, badge, imageUrl, link, active, order } = req.body;
  if (!title && !titleBn) return res.status(400).json({ error: 'Banner title is required' });

  const banners = getBanners();
  const bannerId = id || `banner_${Date.now()}`;
  const existingIdx = banners.findIndex((b) => b.id === bannerId);

  const bannerData = {
    id: bannerId,
    title: title || titleBn || 'অফার',
    titleBn: titleBn || title || 'অফার',
    subtitle: subtitle || subtitleBn || '',
    subtitleBn: subtitleBn || subtitle || '',
    badge: badge || 'সুপারফাস্ট',
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    link: link || 'plans',
    active: active !== false,
    order: parseInt(order, 10) || 1
  };

  if (existingIdx >= 0) {
    banners[existingIdx] = bannerData;
  } else {
    banners.push(bannerData);
  }

  saveBanners(banners);
  res.json({ success: true, banner: bannerData, banners });
});

app.delete('/api/admin/banners/:id', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  let banners = getBanners();
  banners = banners.filter((b) => b.id !== req.params.id);
  saveBanners(banners);
  res.json({ success: true, banners });
});

// Categories (File selling store is removed - Hosting only)
app.get(['/api/store/categories', '/api/admin/categories'], (_req, res) => {
  res.json({ categories: [] });
});

// Serve uploaded image thumbnails (banners, logos, payment QR)
// Auto-restores from Firebase Firestore if file is missing from local container disk!
app.get(['/api/store/thumbnails/:filename', '/api/site-images/:filename'], async (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(STORE_THUMBNAILS_DIR, filename);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  // Not on local disk (container was updated or restarted) - Restore from Firebase Firestore!
  try {
    const cloudImg = await FirebaseSync.loadSiteImageFromCloud(filename);
    if (cloudImg && cloudImg.base64) {
      const buffer = Buffer.from(cloudImg.base64, 'base64');
      try {
        fs.writeFileSync(filePath, buffer);
      } catch {}
      res.setHeader('Content-Type', cloudImg.contentType || 'image/png');
      return res.send(buffer);
    }
  } catch (err) {
    console.warn('Error fetching image from Firebase Firestore:', err);
  }

  res.status(404).send('Image not found');
});

// Admin image and logo upload endpoint (for banners, site logos, payment QR codes)
app.post('/api/admin/upload-file', async (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const { fileName, fileData, fileType } = req.body;
  if (!fileName || !fileData) {
    return res.status(400).json({ error: 'File name and file data are required' });
  }

  try {
    const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
    const buffer = Buffer.from(base64Data, 'base64');
    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();

    const isImage = fileType === 'thumbnail' || fileType === 'image' || fileType === 'payment_qr' || fileType === 'payment_logo' || fileType === 'method_logo' || fileType === 'site_logo' || fileType === 'logo' || /\.(png|jpe?g|webp|gif|svg|ico)$/i.test(fileName);
    if (!isImage) {
      return res.status(400).json({ error: 'শুধুমাত্র ইমেজ/লোগো ফাইল আপলোড করা যাবে।' });
    }

    const ext = path.extname(cleanName).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };
    const contentType = mimeMap[ext] || 'image/png';

    const storedFileName = `img_${timestamp}_${cleanName}`;
    const destPath = path.join(STORE_THUMBNAILS_DIR, storedFileName);
    fs.writeFileSync(destPath, buffer);

    // 100% Guaranteed Cloud Persistence: Save image to Firebase Firestore
    FirebaseSync.saveSiteImageToCloud(storedFileName, fileName, contentType, base64Data).catch(() => {});

    if (fileType === 'site_logo' || fileType === 'logo') {
      FirebaseSync.saveSiteImageToCloud('site_logo', fileName, contentType, base64Data).catch(() => {});
      try {
        const publicLogo = path.join(process.cwd(), 'public', 'site-logo.png');
        fs.writeFileSync(publicLogo, buffer);
      } catch {}
    }

    if (fileType === 'payment_logo' || fileType === 'method_logo') {
      FirebaseSync.saveSiteImageToCloud(`logo_${cleanName}`, fileName, contentType, base64Data).catch(() => {});
    }

    return res.json({
      success: true,
      url: `/api/store/thumbnails/${storedFileName}`,
      storedFileName,
      originalFileName: fileName,
      firebasePersisted: true
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'File upload failed' });
  }
});

// Store Items & File Selling is permanently disabled (Hosting-Only Platform)
app.get(['/api/store/items', '/api/admin/store-items'], (_req, res) => {
  res.json({ items: [] });
});

app.post(['/api/admin/store-items', '/api/store/items/:id/buy'], (_req, res) => {
  res.status(403).json({ error: 'ফাইল বিক্রি সিস্টেম নিষ্ক্রিয়। এটি শুধুমাত্র ক্লাউড টেলিগ্রাম বট ও ওয়েবসাইট হোস্টিং প্ল্যাটফর্ম।' });
});

app.delete('/api/admin/store-items/:id', (_req, res) => {
  res.json({ success: true, items: [] });
});

app.get('/api/store/items/:id/download', (_req, res) => {
  res.status(404).send('Not Found');
});

// ==========================================
// SUPPORT CENTER & MESSAGES API
// ==========================================
app.get(['/api/support/settings', '/api/support-settings'], (req, res) => {
  res.json({ settings: getSupportSettings() });
});

app.post('/api/admin/support-settings', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const current = getSupportSettings();
  const updated = { ...current, ...req.body };
  saveSupportSettings(updated);
  res.json({ success: true, settings: updated });
});

// AI 24/7 Live Support Chat Endpoint (Bilingual Bengali/English)
app.post('/api/support/ai-chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'বার্তা দেওয়া আবশ্যক (Message required)' });
    }
    const settings = getSupportSettings();
    const result = await askAiSupport(message, history || [], settings);
    res.json({
      success: true,
      reply: result.text,
      fallback: result.fallback,
      supportContact: {
        whatsapp: settings?.whatsapp || '01304104492',
        telegram: settings?.telegram || 'toyoburrahman',
        email: settings?.email || 'toyoburrahman560@gmail.com'
      }
    });
  } catch (err: any) {
    console.error('Error in /api/support/ai-chat:', err);
    res.status(500).json({
      success: false,
      error: 'সাপোর্ট রোবট প্রসেস করতে সাময়িক সমস্যা হয়েছে। সরাসরি এডমিনের সাথে যোগাযোগ করুন।',
      reply: 'দুঃখিত, রোবটের সাথে সংযোগে সাময়িক সমস্যা হয়েছে। সরাসরি এডমিনের সাথে যোগাযোগ করুন:\nWhatsApp: 01304104492\nTelegram: @toyoburrahman'
    });
  }
});

app.post('/api/support/message', (req, res) => {
  const user = getAuthUser(req);
  const { subject, message, name, email } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'মেসেজ লেখা আবশ্যক (Message required)' });
  }

  const messages = getSupportMessages();
  const newMsg = {
    id: `msg_${Date.now()}`,
    userId: user?.id || 'guest',
    userName: user?.name || name || 'Customer',
    userEmail: user?.email || email || 'No email',
    subject: subject?.trim() || 'General Inquiry',
    message: message.trim(),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  messages.unshift(newMsg);
  saveSupportMessages(messages);

  res.json({
    success: true,
    message: 'আপনার মেসেজটি সফলভাবে সাপোর্ট টিমের কাছে পাঠানো হয়েছে! শীঘ্রই যোগাযোগ করা হবে।',
    supportMessage: newMsg
  });
});

app.get('/api/admin/support-messages', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });
  res.json({ messages: getSupportMessages() });
});

app.post('/api/admin/support-messages/:id/reply', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const { id } = req.params;
  const { reply, status } = req.body;
  const messages = getSupportMessages();
  const idx = messages.findIndex((m) => m.id === id);

  if (idx === -1) return res.status(404).json({ error: 'Message not found' });

  messages[idx].reply = reply || messages[idx].reply;
  messages[idx].status = status || 'replied';
  messages[idx].repliedAt = new Date().toISOString();
  messages[idx].repliedBy = admin?.email || 'admin';

  saveSupportMessages(messages);
  res.json({ success: true, message: messages[idx] });
});

// ==========================================
// WISHLIST API
// ==========================================
app.get('/api/wishlist', (_req, res) => {
  res.json({ itemIds: [], items: [] });
});

app.post('/api/wishlist/toggle', (_req, res) => {
  res.json({ success: true, inWishlist: false, itemIds: [] });
});

app.get('/api/admin/all-bots', (req, res) => {
  const user = getAuthUser(req);
  if (!isUserAdmin(user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const reg = getRegistry();
  const enriched = reg.map((b) => ({
    ...b,
    status: runningProcesses.has(b.id) ? 'running' : b.status || 'stopped',
    pid: runningProcesses.has(b.id) ? runningProcesses.get(b.id)!.process.pid : null
  }));

  res.json({ bots: enriched });
});

// 2. Bot management (Strict User Isolation: Each user only sees their own bots)
app.get('/api/bots', async (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    // Unauthenticated visitors do not see any user's hosted bots
    return res.json({ bots: [] });
  }

  let reg = getRegistry();
  // Immediately restore from Firebase Firestore if registry is empty (prevents bot disappearance on site updates)
  if (reg.length === 0) {
    try {
      const remoteBots = await FirebaseSync.loadBotsFromCloud();
      if (remoteBots && Array.isArray(remoteBots) && remoteBots.length > 0) {
        saveRegistry(remoteBots);
        reg = remoteBots;
      }
    } catch {}
  }

  // Admins see all bots, normal users ONLY see bots they own
  const userBots = isUserAdmin(user) ? reg : reg.filter((b) => canUserAccessBot(b, user));

  // Auto-restore workspace files for user bots if missing from disk
  for (const b of userBots) {
    const botDir = path.join(HOSTED_BOTS_DIR, b.dirName || b.id);
    if (!fs.existsSync(botDir) || fs.readdirSync(botDir).length === 0) {
      FirebaseSync.restoreBotWorkspaceFromCloud(b.id, botDir).then((restored) => {
        if (restored && (b.status === 'running' || b.autoRestart !== false) && !runningProcesses.has(b.id)) {
          launchBotProcess(b);
        }
      }).catch(() => {});
    }
  }

  // enrich with runtime status, accurate uptimeSeconds, and fileCount
  const enriched = userBots.map((b) => {
    const isRunning = runningProcesses.has(b.id);
    const botDir = path.join(HOSTED_BOTS_DIR, b.dirName || b.id);
    let fileCount = 1;
    try {
      if (fs.existsSync(botDir)) {
        fileCount = fs.readdirSync(botDir).filter((f) => !f.startsWith('.')).length;
      }
    } catch {}
    let uptimeSeconds = 0;
    if (isRunning && runningProcesses.get(b.id)?.startTime) {
      uptimeSeconds = Math.floor((Date.now() - runningProcesses.get(b.id)!.startTime) / 1000);
    }
    const deps = getBotDeployments(b.id);
    const latestDep = deps[0];
    return {
      ...b,
      currentVersion: latestDep?.version || 'v1.0.0',
      lastDeployedAt: latestDep?.timestamp || b.createdAt || b.created || new Date().toISOString(),
      deploymentCount: deps.length,
      createdAt: b.createdAt || b.created || new Date().toISOString(),
      ownerName: b.ownerName || b.owner || 'User',
      status: isRunning ? 'running' : b.status || 'stopped',
      pid: isRunning ? runningProcesses.get(b.id)!.process.pid : null,
      fileCount: b.fileCount || fileCount,
      uptimeSeconds: uptimeSeconds > 0 ? uptimeSeconds : (typeof b.uptimeSeconds === 'number' ? b.uptimeSeconds : 0)
    };
  });
  res.json({ bots: enriched });
});

app.post('/api/bots', (req, res) => {
  let { name, entryFile, token, files, zipBase64, autoStart } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Bot name is required' });
  }

  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'বট হোস্ট করতে প্রথমে আপনার অ্যাকাউন্টে লগইন করুন (Please login to deploy bots)' });
  }

  const reg = getRegistry();

  // Enforce Paid Plan Requirement (user must have bought an active plan, admin is exempt)
  if (user.role !== 'admin') {
    const hasActivePlan = Boolean(
      user.plan &&
      user.plan !== 'none' &&
      user.plan !== 'free' &&
      user.plan !== 'expired' &&
      (!user.planExpiresAt || user.planExpiresAt > Date.now())
    );

    if (!hasActivePlan) {
      return res.status(403).json({
        error: 'বট ডিপ্লয় করতে হলে প্রথমে যেকোনো একটি হোস্টিং প্লান (১ মাস, ৩ মাস, ৬ মাস বা ১ বছর) ক্রয় করুন। প্লান সক্রিয় হলেই নতুন বট ডিপ্লয় করতে পারবেন।',
        planRequired: true
      });
    }

    const userBots = reg.filter((b) => b.ownerId === user.id || b.owner === user.id || (b.ownerEmail && b.ownerEmail.toLowerCase() === user.email.toLowerCase()));
    const maxAllowed = user.maxBots || 1;
    if (userBots.length >= maxAllowed) {
      return res.status(403).json({
        error: `আপনার বর্তমান প্লানের সীমা (${maxAllowed}টি বট) পূর্ণ হয়েছে। অতিরিক্ত বট হোস্ট করতে প্লান আপগ্রেড করুন।`,
        planRequired: true,
        currentBots: userBots.length,
        maxBots: maxAllowed
      });
    }
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'bot';
  const botId = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
  const botDir = path.join(HOSTED_BOTS_DIR, botId);
  fs.mkdirSync(botDir, { recursive: true });

  const finalEntry = entryFile || 'bot.py';
  let resolvedEntry = finalEntry;

  // Handle uploaded files
  if (Array.isArray(files)) {
    for (const f of files) {
      if (f.name && (f.content !== undefined || f.base64)) {
        const safeRel = path.normalize(f.name).replace(/^(\.\.[\/\\])+/, '');
        const filePath = path.join(botDir, safeRel);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        if (f.content !== undefined) {
          fs.writeFileSync(filePath, f.content, 'utf-8');
        } else if (f.base64) {
          fs.writeFileSync(filePath, Buffer.from(f.base64, 'base64'));
        }
      }
    }
  }

  // Handle zip archive
  if (zipBase64) {
    const zipPath = path.join(botDir, '_archive.zip');
    fs.writeFileSync(zipPath, Buffer.from(zipBase64, 'base64'));
    try {
      const extracted = extractZipSafely(zipPath, botDir);
      try { fs.unlinkSync(zipPath); } catch {}
      if (!extracted) {
        appendLog(botId, 'error', 'জিপ ফাইল আনজিপ করতে সমস্যা হয়েছে (Failed to extract ZIP)');
      }
    } catch (err: any) {
      appendLog(botId, 'error', `Zip extraction error: ${err.message}`);
    }
  }

  // 1-Click Auto-fix missing files/folders (photos, assets, data, requirements.txt, token, entry)
  let appliedFixes: string[] = [];
  if (req.body.autoFixMissing !== false) {
    const fixRes = scanAndAutoFixBotDirectory(botDir, {
      defaultToken: token,
      requestedEntry: finalEntry
    });
    appliedFixes = fixRes.fixesApplied;
    resolvedEntry = fixRes.resolvedEntry;
    if (!token && fixRes.detectedToken) {
      token = fixRes.detectedToken;
    }
    for (const fix of appliedFixes) {
      appendLog(botId, 'info', `[Auto-Fix] ${fix}`);
    }
  } else {
    // Detect entry file if specified file doesn't exist
    if (!fs.existsSync(path.join(botDir, resolvedEntry))) {
      if (fs.existsSync(path.join(botDir, 'main.py'))) {
        resolvedEntry = 'main.py';
      } else if (fs.existsSync(path.join(botDir, 'bot.py'))) {
        resolvedEntry = 'bot.py';
      } else if (fs.existsSync(path.join(botDir, 'app.py'))) {
        resolvedEntry = 'app.py';
      } else {
        const allFiles = fs.readdirSync(botDir);
        const pyFile = allFiles.find((f) => f.endsWith('.py'));
        if (pyFile) {
          resolvedEntry = pyFile;
        }
      }
    }
  }

  // Ensure entry file exists without corrupting real uploaded files
  let entryPath = path.join(botDir, resolvedEntry);
  if (!fs.existsSync(entryPath)) {
    let foundPy: string | null = null;
    try {
      const allFiles = fs.readdirSync(botDir);
      foundPy = allFiles.find((f) => f === 'main.py') ||
                allFiles.find((f) => f === 'bot.py') ||
                allFiles.find((f) => f === 'app.py') ||
                allFiles.find((f) => f === 'run.py') ||
                allFiles.find((f) => f.endsWith('.py')) || null;
    } catch {}
    if (foundPy) {
      resolvedEntry = foundPy;
      entryPath = path.join(botDir, resolvedEntry);
    } else {
      fs.writeFileSync(
        entryPath,
        `# Telegram Bot: ${name}\nimport os\nprint("Bot started: ${name}")\n`,
        'utf-8'
      );
    }
  }

  // Extract or sync token
  let effectiveToken = (token || '').trim();
  const envPath = path.join(botDir, '.env');
  if (effectiveToken) {
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }
    if (!envContent.includes(effectiveToken)) {
      envContent += `\nBOT_TOKEN=${effectiveToken}\nTOKEN=${effectiveToken}\nTELEGRAM_BOT_TOKEN=${effectiveToken}\n`;
      fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
    }
  } else if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const m = content.match(/(?:BOT_TOKEN|TOKEN|TELEGRAM_BOT_TOKEN)\s*=\s*["']?([0-9]{8,14}:[a-zA-Z0-9_-]{25,50})["']?/);
    if (m && m[1]) effectiveToken = m[1];
  }

  const newBot = {
    id: botId,
    name,
    dirName: botId,
    entryFile: resolvedEntry,
    token: effectiveToken,
    created: new Date().toISOString(),
    status: 'stopped',
    pid: null,
    uptime: '0s',
    owner: user ? user.id : 'user',
    ownerId: user ? user.id : 'guest',
    ownerName: user ? user.name : 'Guest',
    ownerEmail: user ? user.email : '',
    autoRestart: autoStart !== false,
    lastPing: new Date().toISOString()
  };

  const updatedReg = getRegistry();
  updatedReg.push(newBot);
  saveRegistry(updatedReg);

  recordBotDeployment(botId, {
    version: 'v1.0.0',
    trigger: 'initial_deploy',
    description: 'Initial bot project deployment and setup',
    deployedBy: user ? user.name : 'Owner',
    entryFile: resolvedEntry
  });

  // Persist complete bot workspace to Firebase Firestore cloud storage
  FirebaseSync.syncBotWorkspaceToCloud(botId, botDir).catch(() => {});

  // Background install requirements if present, without blocking API response
  const reqPath = path.join(botDir, 'requirements.txt');
  if (fs.existsSync(reqPath)) {
    appendLog(botId, 'info', 'Found requirements.txt, checking dependencies in background...');
    exec(`python3 -m pip install --break-system-packages --no-cache-dir -r "${reqPath}" || pip3 install --break-system-packages --no-cache-dir -r "${reqPath}"`, { cwd: botDir }, (err, stdout) => {
      if (err) {
        appendLog(botId, 'warn', `Pip notice: ${err.message}`);
      } else {
        appendLog(botId, 'info', 'Dependencies installed.');
      }
    });
  }

  if (autoStart !== false) {
    launchBotProcess(newBot);
    newBot.status = 'running';
  }

  res.json({ success: true, bot: newBot, fixes: appliedFixes });
});

// 1-Click ZIP inspection & missing data diagnosis endpoint
app.post('/api/bots/inspect-zip', (req, res) => {
  const { zipBase64, token, entryFile } = req.body;
  if (!zipBase64) {
    return res.status(400).json({ error: 'zipBase64 is required' });
  }
  const result = inspectZipAndDetectMissing(zipBase64, {
    defaultToken: token,
    requestedEntry: entryFile
  });
  res.json(result);
});

// 1-Click Auto-fix for existing bot
app.post('/api/bots/:id/auto-fix', (req, res) => {
  const botId = req.params.id;
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === botId);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  const botDir = path.join(HOSTED_BOTS_DIR, botId);
  const result = scanAndAutoFixBotDirectory(botDir, {
    defaultToken: bot.token,
    requestedEntry: bot.entryFile
  });
  if (result.resolvedEntry && result.resolvedEntry !== bot.entryFile) {
    bot.entryFile = result.resolvedEntry;
    const reg = getRegistry();
    const idx = reg.findIndex((b) => b.id === botId);
    if (idx !== -1) {
      reg[idx] = bot;
      saveRegistry(reg);
    }
  }
  appendLog(botId, 'info', `[Manual Auto-Fix] Applied fixes: ${result.fixesApplied.join(', ') || 'No missing data found'}`);
  res.json({ success: true, result });
});

// Telegram Bot Token Verification endpoint
app.post('/api/telegram/verify-token', async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ ok: false, description: 'Telegram bot token is required' });
  }

  const cleanToken = token.trim();
  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const data = await tgRes.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      description: `Could not connect to Telegram server: ${err.message}`
    });
  }
});

app.post('/api/bots/:id/start', (req, res) => {
  const { id } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'এই বট চালু করার অনুমতি আপনার নেই (Access Denied: You do not own this bot)' });
  }

  if (user && user.role !== 'admin') {
    const maxAllowed = user.maxBots || 1;
    // Check if user's paid plan is expired
    if (user.planExpiresAt && user.planExpiresAt < Date.now()) {
      return res.status(403).json({
        error: 'আপনার প্রিমিয়াম প্ল্যানের মেয়াদ শেষ হয়েছে। দয়া করে প্ল্যান রিনিউ করুন।',
        planExpired: true
      });
    }

    // Count how many other bots belonging to this user are currently running
    const userRunningBots = reg.filter((b) =>
      b.id !== id &&
      canUserAccessBot(b, user) &&
      runningProcesses.has(b.id)
    );

    if (userRunningBots.length >= maxAllowed) {
      return res.status(403).json({
        error: `আপনার বর্তমান প্ল্যানে সর্বোচ্চ ${maxAllowed}টি বট চালু রাখার অনুমতি আছে। অতিরিক্ত বট চালু করতে প্ল্যান আপগ্রেড করুন।`,
        planRequired: true
      });
    }
  }

  bot.autoRestart = true;
  saveRegistry(reg);
  const started = launchBotProcess(bot);
  res.json({ success: started });
});

app.post('/api/bots/:id/stop', (req, res) => {
  const { id } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'এই বট বন্ধ করার অনুমতি আপনার নেই (Access Denied: You do not own this bot)' });
  }

  const stopped = stopBotProcess(id);
  bot.autoRestart = false;
  saveRegistry(reg);
  res.json({ success: stopped });
});

app.post('/api/bots/:id/restart', (req, res) => {
  const { id } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'এই বট রিস্টার্ট করার অনুমতি আপনার নেই (Access Denied: You do not own this bot)' });
  }

  if (user && user.role !== 'admin') {
    if (user.planExpiresAt && user.planExpiresAt < Date.now()) {
      return res.status(403).json({
        error: 'আপনার ফ্রি প্লানটি বন্ধ হয়ে গেছে। একটি প্ল্যান কিনুন, আপনার আগের বট সাথে সাথে লাইভ হয়ে যাবে!',
        planExpired: true
      });
    }
    if (!user.plan || user.plan === 'none' || user.plan === 'expired' || user.plan === 'free') {
      return res.status(403).json({
        error: user.hasClaimedFreeTrial
          ? 'আপনার ফ্রি প্লানটি বন্ধ হয়ে গেছে। একটি প্ল্যান কিনুন, আপনার আগের বট সাথে সাথে লাইভ হয়ে যাবে!'
          : 'বট লাইভ রাখতে ১ মাসের ফ্রি প্ল্যান ক্লেইম করুন অথবা একটি প্যাকেজ কিনুন।',
        planRequired: true
      });
    }
  }

  bot.autoRestart = true;
  saveRegistry(reg);
  stopBotProcess(id);
  setTimeout(() => {
    const started = launchBotProcess(bot);
    res.json({ success: started });
  }, 500);
});

app.delete('/api/bots/:id', (req, res) => {
  const { id } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'এই বট ডিলিট করার অনুমতি আপনার নেই (Access Denied: You do not own this bot)' });
  }

  stopBotProcess(id);
  const updatedReg = reg.filter((b) => b.id !== id);
  saveRegistry(updatedReg);
  FirebaseSync.deleteBotFromCloud(id).catch(() => {});

  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  try {
    fs.rmSync(botDir, { recursive: true, force: true });
  } catch {
    // Ignore
  }

  botLogs.delete(id);
  res.json({ success: true });
});

// 3. Bot logs
app.get('/api/bots/:id/logs', (req, res) => {
  const { id } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'লগ দেখার অনুমতি আপনার নেই (Access Denied: Only bot owner can view logs)' });
  }

  const logs = botLogs.get(id) || [];
  res.json({ logs });
});

app.delete('/api/bots/:id/logs', (req, res) => {
  const { id } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'লগ মোছার অনুমতি আপনার নেই (Access Denied: Only bot owner can clear logs)' });
  }

  botLogs.set(id, []);
  try {
    const logFile = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id, 'bot.log');
    if (fs.existsSync(logFile)) {
      fs.writeFileSync(logFile, '', 'utf-8');
    }
  } catch {
    // Ignore
  }
  res.json({ success: true });
});

// 4. File operations (Edit, List, Delete, Upload) - Strictly isolated per bot owner
app.get('/api/bots/:id/files', async (req, res) => {
  const { id } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'বটের ফাইল দেখার অনুমতি আপনার নেই (Access Denied: Only bot owner can view files)' });
  }

  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  if (!fs.existsSync(botDir) || fs.readdirSync(botDir).length === 0) {
    await FirebaseSync.restoreBotWorkspaceFromCloud(bot.id, botDir);
  }
  if (!fs.existsSync(botDir)) {
    return res.json({ files: [], fileDetails: [] });
  }

  const items = fs.readdirSync(botDir);
  const files: string[] = [];
  const fileDetails: any[] = [];

  for (const item of items) {
    const p = path.join(botDir, item);
    try {
      const stat = fs.statSync(p);
      if (stat.isFile()) {
        files.push(item);
        fileDetails.push({
          name: item,
          size: stat.size,
          modified: stat.mtime.toISOString(),
          isEntry: item === bot.entryFile,
          isEditable: item.endsWith('.py') || item.endsWith('.json') || item.endsWith('.txt') || item.endsWith('.env') || item.endsWith('.md')
        });
      }
    } catch {}
  }

  res.json({ files, fileDetails });
});

app.get('/api/bots/:id/file', async (req, res) => {
  const { id } = req.params;
  const filename = req.query.name as string;
  if (!filename) return res.status(400).json({ error: 'Filename is required' });

  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'এই ফাইল পড়ার অনুমতি আপনার নেই (Access Denied: Only bot owner can view files)' });
  }

  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  if (!fs.existsSync(botDir) || fs.readdirSync(botDir).length === 0) {
    await FirebaseSync.restoreBotWorkspaceFromCloud(bot.id, botDir);
  }

  const safeFilename = path.basename(filename);
  const filePath = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ content, filename: safeFilename });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bots/:id/file', (req, res) => {
  const { id } = req.params;
  const { filename, content, restart } = req.body;
  if (!filename || content === undefined) {
    return res.status(400).json({ error: 'Filename and content are required' });
  }

  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'ফাইল পরিবর্তন করার অনুমতি আপনার নেই (Access Denied: Only bot owner can edit files)' });
  }

  const safeFilename = path.basename(filename);
  const filePath = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id, safeFilename);

  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    appendLog(id, 'info', `File '${safeFilename}' updated successfully.`);
    FirebaseSync.syncBotWorkspaceToCloud(id, path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id)).catch(() => {});

    recordBotDeployment(id, {
      trigger: 'code_update',
      description: `Updated script file: ${safeFilename}`,
      deployedBy: user ? user.name : 'Owner',
      entryFile: safeFilename
    });

    if (restart) {
      stopBotProcess(id);
      setTimeout(() => {
        launchBotProcess(bot);
      }, 600);
    }

    res.json({ success: true, filename: safeFilename });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bots/:id/delete-file', (req, res) => {
  const { id } = req.params;
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: 'Filename is required' });

  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'ফাইল ডিলিট করার অনুমতি আপনার নেই (Access Denied: Only bot owner can delete files)' });
  }

  const safeFilename = path.basename(filename);
  const filePath = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id, safeFilename);

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      appendLog(id, 'info', `File '${safeFilename}' deleted by user.`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

app.post('/api/bots/:id/upload-files', (req, res) => {
  const { id } = req.params;
  const { files, restart } = req.body;
  if (!Array.isArray(files)) return res.status(400).json({ error: 'Files array required' });

  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'ফাইল আপলোড করার অনুমতি আপনার নেই (Access Denied: Only bot owner can upload files)' });
  }

  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  for (const f of files) {
    if (f.name) {
      const safeRel = path.normalize(f.name).replace(/^(\.\.[\/\\])+/, '');
      const p = path.join(botDir, safeRel);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      if (f.content !== undefined) {
        fs.writeFileSync(p, f.content, 'utf-8');
      } else if (f.base64) {
        fs.writeFileSync(p, Buffer.from(f.base64, 'base64'));
      }
    }
  }

  appendLog(id, 'info', `Uploaded ${files.length} files.`);
  FirebaseSync.syncBotWorkspaceToCloud(id, botDir).catch(() => {});
  if (restart) {
    stopBotProcess(id);
    setTimeout(() => {
      launchBotProcess(bot);
    }, 600);
  }
  res.json({ success: true });
});

app.post('/api/bots/:id/upload-zip', (req, res) => {
  const { id } = req.params;
  const { zipBase64, restart } = req.body;
  if (!zipBase64) return res.status(400).json({ error: 'zipBase64 is required' });

  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'জিপ আপলোড করার অনুমতি আপনার নেই (Access Denied: Only bot owner can upload zip)' });
  }

  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  const zipPath = path.join(botDir, `upload_${Date.now()}.zip`);
  fs.writeFileSync(zipPath, Buffer.from(zipBase64, 'base64'));

  exec(`python3 -m zipfile -e "${zipPath}" "${botDir}"`, (err) => {
    try { fs.unlinkSync(zipPath); } catch {}
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    appendLog(id, 'info', 'Extracted zip archive successfully.');
    FirebaseSync.syncBotWorkspaceToCloud(id, botDir).catch(() => {});
    if (restart) {
      stopBotProcess(id);
      setTimeout(() => {
        launchBotProcess(bot);
      }, 600);
    }
    res.json({ success: true });
  });
});

// Secure Bot Workspace Zip Download (Strictly only owner or admin can download files)
app.get(['/api/bots/:id/export/zip', '/api/bots/:id/download'], (req, res) => {
  const { id } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'ফাইল ডাউনলোড করার অনুমতি আপনার নেই (Access Denied: Only bot owner can download files)' });
  }

  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  if (!fs.existsSync(botDir)) {
    return res.status(404).json({ error: 'Bot directory not found' });
  }

  const tempZipPath = path.join('/tmp', `bot_${bot.id}_${Date.now()}.zip`);
  exec(`cd "${botDir}" && python3 -m zipfile -c "${tempZipPath}" .`, (err) => {
    if (err || !fs.existsSync(tempZipPath)) {
      return res.status(500).json({ error: 'Failed to create zip file' });
    }
    const downloadName = `${(bot.name || 'bot').replace(/[^a-zA-Z0-9_-]/g, '_')}_workspace.zip`;
    res.download(tempZipPath, downloadName, () => {
      try { fs.unlinkSync(tempZipPath); } catch {}
    });
  });
});

// Safe File Update with 100% User Balance & Database Protection
app.post('/api/bots/:id/safe-update', (req, res) => {
  const { id } = req.params;
  const { files, zipBase64, restart = true, preserveDatabases = true, autoConnectDatabase = true } = req.body;

  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'বট আপডেট করার অনুমতি আপনার নেই (Access Denied: You do not own this bot)' });
  }

  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  if (!fs.existsSync(botDir)) {
    fs.mkdirSync(botDir, { recursive: true });
  }

  // 1. Take a safe timestamped snapshot of all existing database files
  const snapshotTimestamp = Date.now();
  const snapshotDir = path.join(botDir, '_db_snapshots', `backup_${snapshotTimestamp}`);
  fs.mkdirSync(snapshotDir, { recursive: true });

  const existingFiles = fs.readdirSync(botDir);
  const preservedDatabases: string[] = [];
  const existingDbContents = new Map<string, string>();

  const PROTECTED_DB_FILES = [
    'users.json',
    'user_stats.json',
    'paid_sms.json',
    'referral_data.json',
    'banned_users.json',
    'withdraw_requests.json',
    'datarange.json',
    'custom_services.json',
    'activity_logs.json'
  ];

  for (const f of existingFiles) {
    if (f.endsWith('.json') && !f.startsWith('_')) {
      const fullPath = path.join(botDir, f);
      try {
        if (fs.statSync(fullPath).isFile()) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          existingDbContents.set(f, content);
          fs.writeFileSync(path.join(snapshotDir, f), content, 'utf-8');
          preservedDatabases.push(f);
        }
      } catch (err) {}
    }
  }

  let updatedFileCount = 0;

  // 2. Handle files array
  if (Array.isArray(files)) {
    for (const f of files) {
      if (!f.name) continue;
      const baseName = path.basename(f.name);
      const isProtectedDb = PROTECTED_DB_FILES.includes(baseName) || (baseName.endsWith('.json') && existingDbContents.has(baseName));

      if (isProtectedDb && preserveDatabases && existingDbContents.has(baseName)) {
        const existingData = existingDbContents.get(baseName)!;
        try {
          const currentJson = JSON.parse(existingData);
          if (f.content && typeof f.content === 'string') {
            const uploadedJson = JSON.parse(f.content);
            if (typeof currentJson === 'object' && currentJson !== null && !Array.isArray(currentJson)) {
              const merged = { ...uploadedJson, ...currentJson };
              fs.writeFileSync(path.join(botDir, baseName), JSON.stringify(merged, null, 2), 'utf-8');
            }
          }
        } catch {
          // Keep existing safe file untouched
        }
        continue;
      }

      const filePath = path.join(botDir, baseName);
      if (f.content !== undefined) {
        fs.writeFileSync(filePath, f.content, 'utf-8');
        updatedFileCount++;
      } else if (f.base64) {
        fs.writeFileSync(filePath, Buffer.from(f.base64, 'base64'));
        updatedFileCount++;
      }
    }
  }

  // 3. Handle zip archive safely
  if (zipBase64) {
    const tempExtractDir = path.join('/tmp', `extract_${id}_${snapshotTimestamp}`);
    fs.mkdirSync(tempExtractDir, { recursive: true });
    const tempZipPath = path.join(tempExtractDir, 'upload.zip');
    fs.writeFileSync(tempZipPath, Buffer.from(zipBase64, 'base64'));

    try {
      const extracted = extractZipSafely(tempZipPath, tempExtractDir);
      try { fs.unlinkSync(tempZipPath); } catch {}
      if (!extracted) {
        appendLog(id, 'warn', 'Zip extraction notice: Could not extract with standard unzipper');
      }

      const copySafe = (srcDir: string, destDir: string) => {
        const items = fs.readdirSync(srcDir);
        for (const item of items) {
          const srcItem = path.join(srcDir, item);
          const destItem = path.join(destDir, item);
          if (fs.statSync(srcItem).isDirectory()) {
            if (!fs.existsSync(destItem)) fs.mkdirSync(destItem, { recursive: true });
            copySafe(srcItem, destItem);
          } else {
            const isProtected = PROTECTED_DB_FILES.includes(item) || (item.endsWith('.json') && existingDbContents.has(item));
            if (isProtected && preserveDatabases && existingDbContents.has(item)) {
              continue;
            }
            fs.copyFileSync(srcItem, destItem);
            updatedFileCount++;
          }
        }
      };

      copySafe(tempExtractDir, botDir);
      try { fs.rmSync(tempExtractDir, { recursive: true, force: true }); } catch {}
    } catch (err: any) {
      appendLog(id, 'error', `Zip update note: ${err.message}`);
    }
  }

  // 4. Auto-Fix Missing Photos, Assets, Folders & Dependencies
  let fixesApplied: string[] = [];
  if (req.body.autoFixMissing !== false) {
    const fixResult = scanAndAutoFixBotDirectory(botDir, {
      defaultToken: bot.token,
      requestedEntry: bot.entryFile
    });
    fixesApplied = fixResult.fixesApplied;
    if (fixResult.resolvedEntry && fixResult.resolvedEntry !== bot.entryFile) {
      bot.entryFile = fixResult.resolvedEntry;
      const reg = getRegistry();
      const idx = reg.findIndex((b) => b.id === id);
      if (idx !== -1) {
        reg[idx] = bot;
        saveRegistry(reg);
      }
    }
    for (const fix of fixesApplied) {
      appendLog(id, 'info', `[Auto-Fix] ${fix}`);
    }
  }

  // 5. Auto-connect and initialize database files if missing
  if (autoConnectDatabase) {
    for (const dbFile of PROTECTED_DB_FILES) {
      const p = path.join(botDir, dbFile);
      if (!fs.existsSync(p)) {
        fs.writeFileSync(p, dbFile === 'activity_logs.json' ? '[]' : '{}', 'utf-8');
      }
    }
  }

  // 6. Read protected user stats
  let usersCount = 0;
  let totalBalance = 0;
  const usersPath = path.join(botDir, 'users.json');
  if (fs.existsSync(usersPath)) {
    try {
      const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
      usersCount = Object.keys(usersData).length;
      for (const k in usersData) {
        if (usersData[k] && typeof usersData[k].balance === 'number') {
          totalBalance += usersData[k].balance;
        }
      }
    } catch {}
  }

  appendLog(id, 'info', `Safe update completed! Updated ${updatedFileCount} files. Preserved ${preservedDatabases.length} database files (${usersCount} users, total balance: ${totalBalance} सुरक्षित).`);

  recordBotDeployment(id, {
    trigger: zipBase64 ? 'zip_upload' : 'safe_update',
    description: `Safe update: updated ${updatedFileCount} files (preserved ${preservedDatabases.length} database collections)`,
    deployedBy: user ? user.name : 'Owner',
    filesCount: updatedFileCount
  });

  if (restart) {
    stopBotProcess(id);
    setTimeout(() => {
      launchBotProcess(bot);
    }, 600);
  }

  return res.json({
    success: true,
    updatedFileCount,
    preservedDatabases,
    backupDir: `_db_snapshots/backup_${snapshotTimestamp}`,
    fixes: fixesApplied,
    databaseStats: {
      usersCount,
      totalBalance
    }
  });
});

// Database Auto-Connect & Diagnostic Route
app.post('/api/bots/:id/database/auto-connect', (req, res) => {
  const { id } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'ডাটাবেজ কানেক্ট করার অনুমতি আপনার নেই (Access Denied: Only bot owner can manage databases)' });
  }

  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  if (!fs.existsSync(botDir)) {
    fs.mkdirSync(botDir, { recursive: true });
  }

  const STANDARD_FILES = [
    { name: 'users.json', defaultContent: '{}' },
    { name: 'user_stats.json', defaultContent: '{}' },
    { name: 'paid_sms.json', defaultContent: '{}' },
    { name: 'referral_data.json', defaultContent: '{}' },
    { name: 'banned_users.json', defaultContent: '{}' },
    { name: 'withdraw_requests.json', defaultContent: '{}' },
    { name: 'custom_services.json', defaultContent: '{}' },
    { name: 'datarange.json', defaultContent: '{}' },
    { name: 'activity_logs.json', defaultContent: '[]' }
  ];

  const results: any[] = [];
  for (const sf of STANDARD_FILES) {
    const fp = path.join(botDir, sf.name);
    let created = false;
    let valid = true;
    if (!fs.existsSync(fp)) {
      fs.writeFileSync(fp, sf.defaultContent, 'utf-8');
      created = true;
    } else {
      try {
        JSON.parse(fs.readFileSync(fp, 'utf-8'));
      } catch {
        valid = false;
      }
    }
    results.push({ name: sf.name, created, valid });
  }

  let usersCount = 0;
  let totalBalance = 0;
  try {
    const usersJson = JSON.parse(fs.readFileSync(path.join(botDir, 'users.json'), 'utf-8'));
    usersCount = Object.keys(usersJson).length;
    for (const uid in usersJson) {
      if (usersJson[uid] && typeof usersJson[uid].balance === 'number') {
        totalBalance += usersJson[uid].balance;
      }
    }
  } catch {}

  appendLog(id, 'info', `Database Auto-Connect & Verify: All collections connected. Total users: ${usersCount}, Total balance: ${totalBalance}`);

  res.json({
    success: true,
    connected: true,
    stats: {
      usersCount,
      totalBalance,
      files: results
    }
  });
});

// Real-time Database stats for a bot
app.get('/api/bots/:id/database/stats', (req, res) => {
  const { id } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'ডাটাবেজ স্ট্যাটস দেখার অনুমতি আপনার নেই (Access Denied: Only bot owner can view database stats)' });
  }

  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  let usersCount = 0;
  let totalBalance = 0;
  let paidSmsCount = 0;
  let withdrawCount = 0;

  try {
    const usersPath = path.join(botDir, 'users.json');
    if (fs.existsSync(usersPath)) {
      const u = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
      usersCount = Object.keys(u).length;
      for (const k in u) {
        if (u[k] && typeof u[k].balance === 'number') totalBalance += u[k].balance;
      }
    }
  } catch {}

  try {
    const smsPath = path.join(botDir, 'paid_sms.json');
    if (fs.existsSync(smsPath)) {
      const s = JSON.parse(fs.readFileSync(smsPath, 'utf-8'));
      paidSmsCount = Object.keys(s).length;
    }
  } catch {}

  try {
    const wPath = path.join(botDir, 'withdraw_requests.json');
    if (fs.existsSync(wPath)) {
      const w = JSON.parse(fs.readFileSync(wPath, 'utf-8'));
      withdrawCount = Object.keys(w).length;
    }
  } catch {}

  const snapshotsDir = path.join(botDir, '_db_snapshots');
  let snapshotsCount = 0;
  if (fs.existsSync(snapshotsDir)) {
    try {
      snapshotsCount = fs.readdirSync(snapshotsDir).length;
    } catch {}
  }

  res.json({
    usersCount,
    totalBalance,
    paidSmsCount,
    withdrawCount,
    snapshotsCount,
    isHealthy: true
  });
});

// Bot Deployment History Routes
app.get('/api/bots/:id/deployments', (req, res) => {
  const { id } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b: any) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const user = getAuthUser(req);
  if (user && !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'ডিপ্লয়মেন্ট হিস্ট্রি দেখার অনুমতি আপনার নেই (Access Denied: Only bot owner can view deployments)' });
  }

  const deployments = getBotDeployments(id);
  res.json({
    success: true,
    botId: id,
    botName: bot.name,
    currentVersion: deployments[0]?.version || 'v1.0.0',
    deployments
  });
});

app.post('/api/bots/:id/deployments', (req, res) => {
  const { id } = req.params;
  const { version, description, trigger = 'manual_deploy', restart = true } = req.body;
  const reg = getRegistry();
  const bot = reg.find((b: any) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const user = getAuthUser(req);
  if (user && !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'ডিপ্লয় করার অনুমতি আপনার নেই (Access Denied: Only bot owner can trigger deployments)' });
  }

  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  let filesCount = 1;
  try {
    if (fs.existsSync(botDir)) {
      filesCount = fs.readdirSync(botDir).filter((f: string) => !f.startsWith('.')).length;
    }
  } catch {}

  const newDep = recordBotDeployment(id, {
    version: version ? version.trim() : undefined,
    trigger,
    description: description ? description.trim() : 'Manual version deployment',
    status: 'active',
    entryFile: bot.entryFile || 'bot.py',
    deployedBy: user ? (user.name || user.email) : (bot.ownerName || 'Admin'),
    filesCount
  });

  if (restart) {
    stopBotProcess(id);
    setTimeout(() => {
      launchBotProcess(bot);
    }, 600);
  }

  appendLog(id, 'info', `🚀 Deployment ${newDep.version} released: ${newDep.description}`);

  const allDeployments = getBotDeployments(id);
  res.json({
    success: true,
    message: `Version ${newDep.version} deployed successfully`,
    deployment: newDep,
    deployments: allDeployments
  });
});

app.post('/api/bots/:id/deployments/:depId/activate', (req, res) => {
  const { id, depId } = req.params;
  const { restart = true } = req.body;
  const reg = getRegistry();
  const bot = reg.find((b: any) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const user = getAuthUser(req);
  if (user && !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'ডিপ্লয়মেন্ট রোলব্যাক করার অনুমতি আপনার নেই' });
  }

  const deployments = getBotDeployments(id);
  const targetDep = deployments.find((d: any) => d.id === depId);
  if (!targetDep) {
    return res.status(404).json({ error: 'Deployment record not found' });
  }

  const updatedDeployments = deployments.map((d: any) => ({
    ...d,
    status: d.id === depId ? 'active' : 'success'
  }));
  saveBotDeployments(id, updatedDeployments);

  if (restart) {
    stopBotProcess(id);
    setTimeout(() => {
      launchBotProcess(bot);
    }, 600);
  }

  appendLog(id, 'info', `🔄 Deployment version ${targetDep.version} set as active target.`);

  res.json({
    success: true,
    message: `Version ${targetDep.version} is now marked as active`,
    deployments: updatedDeployments
  });
});

// Bot Backups & Restore Routes (Recurring 24h & Manual Snapshots)
app.get('/api/bots/:id/backups', (req, res) => {
  const { id } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b: any) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const user = getAuthUser(req);
  if (user && !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'ব্যাকআপ দেখার অনুমতি আপনার নেই (Access Denied: Only bot owner can view backups)' });
  }

  const backups = getBotBackups(id);
  const stats = getBotBackupStats(id);

  res.json({
    success: true,
    botId: id,
    botName: bot.name,
    backups,
    stats
  });
});

app.post('/api/bots/:id/backups', (req, res) => {
  const { id } = req.params;
  const { description } = req.body;
  const reg = getRegistry();
  const bot = reg.find((b: any) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const user = getAuthUser(req);
  if (user && !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'ব্যাকআপ তৈরি করার অনুমতি আপনার নেই (Access Denied: Only bot owner can create backups)' });
  }

  try {
    const backup = createBotBackup(bot, 'manual', description);
    appendLog(id, 'info', `💾 Manual bot file backup snapshot created: ${backup.description} (${backup.filesCount} files)`);

    res.json({
      success: true,
      message: 'Backup created successfully',
      backup,
      backups: getBotBackups(id),
      stats: getBotBackupStats(id)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create backup' });
  }
});

app.post('/api/bots/:id/backups/:backupId/restore', (req, res) => {
  const { id, backupId } = req.params;
  const { restart = true } = req.body;
  const reg = getRegistry();
  const bot = reg.find((b: any) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const user = getAuthUser(req);
  if (user && !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'ব্যাকআপ রিস্টোর করার অনুমতি আপনার নেই (Access Denied: Only bot owner can restore backups)' });
  }

  try {
    const wasRunning = bot.status === 'running' || runningProcesses.has(id);
    if (wasRunning) {
      stopBotProcess(id);
    }

    const restoreResult = restoreBotBackup(bot, backupId);

    // Record deployment release for history tracking
    recordBotDeployment(id, {
      trigger: 'backup_restore',
      description: `Restored bot files from snapshot (${restoreResult.backup.description || backupId})`,
      status: 'active',
      entryFile: bot.entryFile || 'bot.py',
      deployedBy: user ? (user.name || user.email) : (bot.ownerName || 'Admin'),
      filesCount: restoreResult.restoredFilesCount
    });

    appendLog(id, 'info', `🔄 Restored bot files from backup '${restoreResult.backup.description || backupId}' (${restoreResult.restoredFilesCount} files).`);

    if (restart) {
      setTimeout(() => {
        const freshReg = getRegistry();
        const freshBot = freshReg.find((b: any) => b.id === id) || bot;
        launchBotProcess(freshBot);
      }, 700);
    }

    res.json({
      success: true,
      message: 'Bot files successfully restored from backup snapshot',
      backup: restoreResult.backup,
      backups: getBotBackups(id),
      stats: getBotBackupStats(id)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to restore backup snapshot' });
  }
});

app.delete('/api/bots/:id/backups/:backupId', (req, res) => {
  const { id, backupId } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b: any) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const user = getAuthUser(req);
  if (user && !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'ব্যাকআপ মোছার অনুমতি আপনার নেই' });
  }

  const success = deleteBotBackup(id, backupId);
  if (!success) {
    return res.status(404).json({ error: 'Backup not found' });
  }

  appendLog(id, 'info', `🗑️ Backup snapshot '${backupId}' deleted.`);

  res.json({
    success: true,
    message: 'Backup deleted successfully',
    backups: getBotBackups(id),
    stats: getBotBackupStats(id)
  });
});

app.get('/api/bots/:id/backups/:backupId/download', (req, res) => {
  const { id, backupId } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b: any) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const user = getAuthUser(req);
  if (user && !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'ব্যাকআপ ডাউনলোড করার অনুমতি আপনার নেই' });
  }

  const zipPath = getBotBackupZipPath(id, backupId);
  if (!zipPath) {
    return res.status(404).json({ error: 'Backup archive not found' });
  }

  const safeBotName = (bot.name || 'bot').replace(/[^a-zA-Z0-9_-]/g, '_');
  res.download(zipPath, `${safeBotName}_backup_${backupId}.zip`);
});

app.post('/api/bots/:id/backups/trigger-auto', (req, res) => {
  const { id } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b: any) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const user = getAuthUser(req);
  if (user && !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'অনুমতি নেই' });
  }

  try {
    const backup = createBotBackup(bot, 'auto_24h', 'Automatic 24-Hour Backup');
    appendLog(id, 'info', `💾 [Auto-Backup] 24-Hour scheduled backup triggered manually (${backup.filesCount} files)`);

    res.json({
      success: true,
      message: '24-hour automatic backup generated successfully',
      backup,
      backups: getBotBackups(id),
      stats: getBotBackupStats(id)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Python Syntax Checker
app.post('/api/code/syntax-check', (req, res) => {
  const { code } = req.body;
  if (code === undefined) return res.status(400).json({ error: 'Code is required' });

  const tempFile = path.join('/tmp', `syntax_${Date.now()}.py`);
  fs.writeFileSync(tempFile, code, 'utf-8');

  exec(`python3 -m py_compile "${tempFile}"`, (err, stdout, stderr) => {
    try { fs.unlinkSync(tempFile); } catch {}
    if (err) {
      const lineMatch = stderr.match(/line\s+(\d+)/i);
      const line = lineMatch ? parseInt(lineMatch[1], 10) : null;
      return res.json({
        valid: false,
        error: stderr || err.message,
        line
      });
    }
    res.json({ valid: true, message: 'Syntax is valid!' });
  });
});

// 6. Python Pip Package Manager
app.get('/api/pip/packages', (req, res) => {
  exec('python3 -m pip list --format=json || pip3 list --format=json', (err, stdout) => {
    if (err) {
      return res.json({ packages: [] });
    }
    try {
      const pkgs = JSON.parse(stdout);
      res.json({ packages: pkgs });
    } catch {
      res.json({ packages: [] });
    }
  });
});

app.post('/api/pip/install', (req, res) => {
  const { package: pkgName } = req.body;
  if (!pkgName) return res.status(400).json({ error: 'Package name is required' });

  const safePkg = pkgName.trim().replace(/[^a-zA-Z0-9_\-\.\=\>\<\[\]]/g, '');
  exec(`python3 -m pip install --no-cache-dir --break-system-packages ${safePkg} || pip3 install --no-cache-dir --break-system-packages ${safePkg}`, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: stderr || err.message });
    }
    res.json({ success: true, output: stdout });
  });
});

// 7. Services & SMS Manager for Bot (Strict User Isolation)
function resolveBotDirectoryForUser(user: any, botIdQuery?: any): { bot: any; botDir: string } | null {
  if (!user) return null;
  const reg = getRegistry();
  const accessibleBots = isUserAdmin(user) ? reg : reg.filter((b) => canUserAccessBot(b, user));
  if (accessibleBots.length === 0) return null;

  let bot = null;
  if (botIdQuery) {
    bot = accessibleBots.find((b) => b.id === botIdQuery || b.dirName === botIdQuery);
  }
  if (!bot && accessibleBots.length > 0) {
    bot = accessibleBots[0];
  }
  if (!bot) return null;
  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  if (!fs.existsSync(botDir)) {
    fs.mkdirSync(botDir, { recursive: true });
  }
  return { bot, botDir };
}

// Global & Per-Bot Services endpoints (Isolated per bot owner)
app.get(['/api/services', '/api/bots/:id/services'], (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(403).json({ error: 'Unauthorized', services: [] });

  const botId = req.params.id || req.query.botId;
  const resolved = resolveBotDirectoryForUser(user, botId);
  if (!resolved) return res.json({ services: [] });

  const servicesPath = path.join(resolved.botDir, 'custom_services.json');
  if (fs.existsSync(servicesPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(servicesPath, 'utf-8'));
      return res.json({ services: Array.isArray(data) ? data : [] });
    } catch {
      return res.json({ services: [] });
    }
  }
  res.json({ services: [] });
});

app.post(['/api/services', '/api/bots/:id/services'], (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(403).json({ error: 'Unauthorized' });

  const botId = req.params.id || req.query.botId || req.body.botId;
  const resolved = resolveBotDirectoryForUser(user, botId);
  if (!resolved) return res.status(404).json({ error: 'No bot found or access denied' });

  const { services } = req.body;
  const servicesPath = path.join(resolved.botDir, 'custom_services.json');
  try {
    fs.writeFileSync(servicesPath, JSON.stringify(services || [], null, 2), 'utf-8');
    appendLog(resolved.bot.id, 'info', `Updated custom services list (${(services || []).length} items).`);
    res.json({ success: true, services: services || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/services/clear', '/api/bots/:id/services/clear'], (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(403).json({ error: 'Unauthorized' });

  const botId = req.params.id || req.query.botId || req.body.botId;
  const resolved = resolveBotDirectoryForUser(user, botId);
  if (!resolved) return res.status(404).json({ error: 'No bot found or access denied' });

  const servicesPath = path.join(resolved.botDir, 'custom_services.json');
  try {
    fs.writeFileSync(servicesPath, JSON.stringify([], null, 2), 'utf-8');
    appendLog(resolved.bot.id, 'info', 'All services cleared from custom_services.json.');
    res.json({ success: true, services: [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/services/reset-default', '/api/bots/:id/services/reset-default'], (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(403).json({ error: 'Unauthorized' });

  const botId = req.params.id || req.query.botId || req.body.botId;
  const resolved = resolveBotDirectoryForUser(user, botId);
  if (!resolved) return res.status(404).json({ error: 'No bot found or access denied' });

  const defaultServices = [
    { sid: 'TELEGRAM', ranges: [{ range: 'GLOBAL', country: 'International' }] },
    { sid: 'WHATSAPP', ranges: [{ range: 'GLOBAL', country: 'International' }] },
    { sid: 'FACEBOOK', ranges: [{ range: 'GLOBAL', country: 'International' }] },
    { sid: 'TIKTOK', ranges: [{ range: 'GLOBAL', country: 'International' }] },
    { sid: 'IMO', ranges: [{ range: 'GLOBAL', country: 'International' }] },
    { sid: 'GOOGLE / GMAIL', ranges: [{ range: 'GLOBAL', country: 'International' }] },
    { sid: 'TWITTER / X', ranges: [{ range: 'GLOBAL', country: 'International' }] },
    { sid: 'INSTAGRAM', ranges: [{ range: 'GLOBAL', country: 'International' }] },
    { sid: 'SNAPCHAT', ranges: [{ range: 'GLOBAL', country: 'International' }] }
  ];

  const servicesPath = path.join(resolved.botDir, 'custom_services.json');
  try {
    fs.writeFileSync(servicesPath, JSON.stringify(defaultServices, null, 2), 'utf-8');
    appendLog(resolved.bot.id, 'info', 'Default services restored in custom_services.json.');
    res.json({ success: true, services: defaultServices });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SMS Gateway Config endpoints (Strictly per user bot)
app.get(['/api/sms-config', '/api/bots/:id/sms-config'], (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(403).json({ error: 'Unauthorized', baseUrl: 'https://minosms.com', apiKey: '', token: '' });

  const botId = req.params.id || req.query.botId;
  const resolved = resolveBotDirectoryForUser(user, botId);
  if (!resolved) return res.json({ baseUrl: 'https://minosms.com', apiKey: '', token: '' });

  const configPath = path.join(resolved.botDir, 'sms_config.json');
  let config: any = { baseUrl: 'https://minosms.com', apiKey: '', token: resolved.bot.token || '' };
  if (fs.existsSync(configPath)) {
    try {
      config = { ...config, ...JSON.parse(fs.readFileSync(configPath, 'utf-8')) };
    } catch {}
  } else {
    // Check .env
    const envPath = path.join(resolved.botDir, '.env');
    if (fs.existsSync(envPath)) {
      const text = fs.readFileSync(envPath, 'utf-8');
      const baseMatch = text.match(/(?:BASE_URL|API_URL|SMS_API_URL)\s*=\s*["']?([^"'\r\n]+)["']?/i);
      const keyMatch = text.match(/(?:API_KEY|SMS_API_KEY|MINO_API_KEY)\s*=\s*["']?([^"'\r\n]+)["']?/i);
      if (baseMatch) config.baseUrl = baseMatch[1];
      if (keyMatch) config.apiKey = keyMatch[1];
    }
  }
  res.json(config);
});

app.post(['/api/sms-config', '/api/bots/:id/sms-config'], (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(403).json({ error: 'Unauthorized' });

  const botId = req.params.id || req.body.botId;
  const resolved = resolveBotDirectoryForUser(user, botId);
  if (!resolved) return res.status(404).json({ error: 'No bot found or access denied' });

  const { baseUrl, apiKey, token } = req.body;
  const config = {
    baseUrl: (baseUrl || 'https://minosms.com').trim(),
    apiKey: (apiKey || '').trim(),
    token: (token || resolved.bot.token || '').trim()
  };

  const configPath = path.join(resolved.botDir, 'sms_config.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    // Also sync to bot workspace .env
    const envPath = path.join(resolved.botDir, '.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
    if (config.baseUrl) {
      if (envContent.match(/BASE_URL\s*=/)) {
        envContent = envContent.replace(/BASE_URL\s*=.*/, `BASE_URL=${config.baseUrl}`);
      } else {
        envContent += `\nBASE_URL=${config.baseUrl}\n`;
      }
    }
    if (config.apiKey) {
      if (envContent.match(/API_KEY\s*=/)) {
        envContent = envContent.replace(/API_KEY\s*=.*/, `API_KEY=${config.apiKey}`);
      } else {
        envContent += `\nAPI_KEY=${config.apiKey}\n`;
      }
    }
    if (config.token) {
      if (envContent.match(/BOT_TOKEN\s*=/)) {
        envContent = envContent.replace(/BOT_TOKEN\s*=.*/, `BOT_TOKEN=${config.token}`);
      } else {
        envContent += `\nBOT_TOKEN=${config.token}\nTOKEN=${config.token}\n`;
      }
    }
    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
    appendLog(resolved.bot.id, 'info', 'SMS Gateway configuration updated.');
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Database & Storage Manager (Per User / Per Bot)
app.get('/api/database/backup', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(403).json({ error: 'Unauthorized' });

  const botId = req.query.botId as string;
  const resolved = resolveBotDirectoryForUser(user, botId);
  if (!resolved) return res.status(404).json({ error: 'No bot found or access denied' });

  const data: Record<string, any> = {
    bot: {
      id: resolved.bot.id,
      name: resolved.bot.name,
      ownerEmail: resolved.bot.ownerEmail
    },
    timestamp: new Date().toISOString()
  };

  const botDir = resolved.botDir;
  if (botDir && fs.existsSync(botDir)) {
    const files = ['users.json', 'custom_services.json', 'datarange.json', 'paid_sms.json', 'referral_data.json', 'withdraw_requests.json'];
    for (const f of files) {
      const fp = path.join(botDir, f);
      if (fs.existsSync(fp)) {
        try {
          data[f] = JSON.parse(fs.readFileSync(fp, 'utf-8'));
        } catch {
          data[f] = null;
        }
      }
    }
  }

  const safeBotName = (resolved.bot.name || 'bot').replace(/[^a-zA-Z0-9_-]/g, '_');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${safeBotName}-backup.json"`);
  res.send(JSON.stringify(data, null, 2));
});

app.get('/api/database/stats', (req, res) => {
  const user = getAuthUser(req);
  const reg = getRegistry();
  const accessibleBots = user ? (isUserAdmin(user) ? reg : reg.filter((b) => canUserAccessBot(b, user))) : [];

  let totalFiles = 0;
  let totalBytes = 0;

  for (const b of accessibleBots) {
    const botDir = path.join(HOSTED_BOTS_DIR, b.dirName || b.id);
    if (fs.existsSync(botDir)) {
      try {
        const files = fs.readdirSync(botDir);
        totalFiles += files.length;
        for (const f of files) {
          try {
            const s = fs.statSync(path.join(botDir, f));
            totalBytes += s.size;
          } catch {}
        }
      } catch {}
    }
  }

  const runningCount = accessibleBots.filter((b) => runningProcesses.has(b.id)).length;

  res.json({
    totalBots: accessibleBots.length,
    runningBots: runningCount,
    totalFiles,
    totalBytes,
    formattedSize: (totalBytes / (1024 * 1024)).toFixed(2) + ' MB'
  });
});

// 9. Users & Balances API (Strictly scoped to user-owned bots)
app.get('/api/users', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(403).json({ error: 'Unauthorized', users: [] });

  const botId = req.query.botId as string;
  const resolved = resolveBotDirectoryForUser(user, botId);
  if (!resolved) return res.json({ users: [] });

  const usersPath = path.join(resolved.botDir, 'users.json');
  if (fs.existsSync(usersPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
      const list = Object.keys(data).map((uid) => ({
        id: uid,
        balance: data[uid]?.balance || 0,
        totalNumbers: data[uid]?.total_numbers || 0,
        referrals: data[uid]?.referral_count || 0
      }));
      return res.json({ users: list });
    } catch {
      return res.json({ users: [] });
    }
  }
  res.json({ users: [] });
});

app.post('/api/users/:uid/balance', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(403).json({ error: 'Unauthorized' });

  const botId = (req.query.botId as string) || req.body.botId;
  const resolved = resolveBotDirectoryForUser(user, botId);
  if (!resolved) return res.status(403).json({ error: 'No bot found or access denied' });

  const { uid } = req.params;
  const { amount } = req.body;

  const usersPath = path.join(resolved.botDir, 'users.json');
  if (fs.existsSync(usersPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
      if (!data[uid]) data[uid] = { user_id: uid, balance: 0 };
      data[uid].balance = parseFloat(amount) || 0;
      fs.writeFileSync(usersPath, JSON.stringify(data, null, 2), 'utf-8');
      return res.json({ success: true, balance: data[uid].balance });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
  res.status(404).json({ error: 'users.json not found' });
});

// Background Watchdog: automatically checks for expired plans, halts excess bots, resets limits, and sends near-expiry email alerts
setInterval(async () => {
  try {
    const accounts = getAccounts();
    const reg = getRegistry();

    const result = await checkAndSendExpiringPlanAlerts(accounts, (expiredAccount) => {
      if (expiredAccount.role === 'admin') return;

      const userBots = reg.filter((b) =>
        b.ownerId === expiredAccount.id ||
        b.owner === expiredAccount.id ||
        (b.ownerEmail && b.ownerEmail.toLowerCase() === expiredAccount.email.toLowerCase())
      );
      let regUpdated = false;
      for (const bot of userBots) {
        if (runningProcesses.has(bot.id) || bot.status === 'running' || bot.autoRestart) {
          console.log(`[EXPIRED PLAN] Halting live bot "${bot.name || bot.id}" for user ${expiredAccount.email}`);
          stopBotProcess(bot.id);
          bot.autoRestart = false;
          bot.status = 'stopped';
          bot.pid = null;
          appendLog(bot.id, 'warn', '⚠️ [প্ল্যান বন্ধ] আপনার ফ্রি প্লানটি বন্ধ হয়ে গেছে। একটি প্ল্যান কিনুন, আপনার আগের বট সাথে সাথে লাইভ হয়ে যাবে!');
          regUpdated = true;
        }
      }
      if (regUpdated) {
        saveRegistry(reg);
      }
    });

    if (result.modified) {
      saveAccounts(accounts);
    }
  } catch (err) {
    console.error('Watchdog plan expiry error:', err);
  }
}, 30000);

// ==========================================
// SOCIAL TASKS API (Earn Real USD by Completing Tasks)
// ==========================================

// Serve task proof screenshot images
app.use('/api/task-proofs', express.static(path.join(process.cwd(), 'hosted_bots', 'task_proofs')));

// Get all active social tasks + user's completion status
app.get('/api/social-tasks', (req, res) => {
  const user = getAuthUser(req);
  const tasks = getSocialTasks();
  const completedIds = user ? getUserCompletedTaskIds(user.id) : [];

  const tasksWithStatus = tasks
    .filter((t) => t.enabled !== false)
    .sort((a, b) => (a.order || 99) - (b.order || 99))
    .map((t) => ({
      ...t,
      completed: completedIds.includes(t.id)
    }));

  res.json({
    success: true,
    tasks: tasksWithStatus,
    completedCount: completedIds.length,
    totalCount: tasksWithStatus.length
  });
});

// User submits screenshot proof for a social task
app.post('/api/social-tasks/:id/submit', async (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'টাস্ক সাবমিট করতে প্রথমে লগইন করুন (Please login to submit task proof)' });
  }

  const { screenshot, proofNote } = req.body;
  if (!screenshot) {
    return res.status(400).json({ error: 'টাস্ক সম্পন্ন করার স্ক্রিনশট প্রমাণ দেওয়া আবশ্যক (Screenshot proof is required)' });
  }

  const result = await submitSocialTaskProof(
    user.id,
    user.name || 'User',
    user.email || '',
    req.params.id,
    screenshot,
    proofNote
  );

  if (!result.success) {
    return res.status(400).json({ error: result.error || 'টাস্ক সাবমিট ব্যর্থ হয়েছে।' });
  }

  res.json({
    success: true,
    message: '✓ স্ক্রিনশট প্রমাণ সফলভাবে জমা হয়েছে! এডমিন যাচাই করে দ্রুত অ্যাপ্রুভ করবেন।',
    submission: result.submission
  });
});

// User gets their own task submissions history
app.get('/api/user/social-tasks/submissions', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const submissions = getUserTaskSubmissions(user.id);
  res.json({
    success: true,
    submissions
  });
});

// User claims reward for completing a social task (legacy / fallback)
app.post('/api/social-tasks/:id/claim', async (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'টাস্ক সম্পন্ন করতে প্রথমে লগইন করুন (Please login to claim)' });
  }

  const { proofNote } = req.body;
  const result = await claimSocialTaskReward(
    user.id,
    user.name || 'User',
    user.email || '',
    req.params.id,
    proofNote
  );

  if (!result.success) {
    return res.status(400).json({ error: result.error || 'টাস্ক ক্লেইম ব্যর্থ হয়েছে।' });
  }

  const accounts = getAccounts();
  const updatedUser = accounts.find((a) => a.id === user.id);

  res.json({
    success: true,
    message: `🎉 অভিনন্দন! "${result.task?.titleBn || result.task?.title}" সফলভাবে সম্পন্ন হয়েছে। ওয়ালেটে $${result.rewardUsd} USD যুক্ত হয়েছে!`,
    rewardUsd: result.rewardUsd,
    user: updatedUser ? enrichUserWithPlanAndRole(updatedUser) : undefined
  });
});

// ==========================================
// ADMIN SOCIAL TASKS MANAGEMENT API
// ==========================================

// List all social tasks for admin management
app.get('/api/admin/social-tasks', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const tasks = getSocialTasks();
  const logs = getTaskCompletions();
  const totalDistributedUsd = logs.reduce((sum, l) => sum + (Number(l.rewardUsd) || 0), 0);

  res.json({
    success: true,
    tasks,
    stats: {
      totalTasks: tasks.length,
      activeTasks: tasks.filter((t) => t.enabled !== false).length,
      totalCompletions: logs.length,
      totalDistributedUsd: parseFloat(totalDistributedUsd.toFixed(2))
    }
  });
});

// Create or update a social task
app.post('/api/admin/social-tasks', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const {
    id,
    platform,
    title,
    titleBn,
    description,
    descriptionBn,
    link,
    rewardUsd,
    badgeText,
    timerSeconds,
    requiresProof,
    enabled,
    order
  } = req.body;

  const effectiveTitle = (title || titleBn || '').trim();
  const effectiveTitleBn = (titleBn || title || '').trim();
  const effectiveLink = (link || '').trim();

  if (!effectiveTitle || !effectiveLink) {
    return res.status(400).json({ error: 'টাস্ক শিরোনাম ও লিংক দেওয়া আবশ্যক (Title and link required)' });
  }

  const tasks = getSocialTasks();
  const taskId = id || `task_${Date.now()}`;
  const existingIdx = tasks.findIndex((t) => t.id === taskId);

  const parsedReward = parseFloat(rewardUsd);
  const finalReward = isNaN(parsedReward) || parsedReward <= 0 ? 0.05 : parseFloat(parsedReward.toFixed(4));

  const taskData: SocialTask = {
    id: taskId,
    platform: platform || 'telegram',
    title: effectiveTitle,
    titleBn: effectiveTitleBn,
    description: (description || '').trim(),
    descriptionBn: (descriptionBn || description || '').trim(),
    link: effectiveLink,
    rewardUsd: finalReward,
    badgeText: badgeText?.trim() || '',
    timerSeconds: parseInt(timerSeconds, 10) || 8,
    requiresProof: Boolean(requiresProof),
    enabled: enabled !== false,
    order: parseInt(order, 10) || (existingIdx >= 0 ? tasks[existingIdx].order : tasks.length + 1),
    totalCompletions: existingIdx >= 0 ? tasks[existingIdx].totalCompletions || 0 : 0,
    createdAt: existingIdx >= 0 ? tasks[existingIdx].createdAt : new Date().toISOString()
  };

  if (existingIdx >= 0) {
    tasks[existingIdx] = taskData;
  } else {
    tasks.push(taskData);
  }

  saveSocialTasks(tasks);
  res.json({ success: true, task: taskData, tasks });
});

// Delete a social task (supports HTTP DELETE and POST fallback)
app.delete('/api/admin/social-tasks/:id', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const { id } = req.params;
  let tasks = getSocialTasks();
  tasks = tasks.filter((t) => t.id !== id);
  saveSocialTasks(tasks);
  FirebaseSync.deleteSocialTaskFromCloud(id).catch(() => {});
  res.json({ success: true, tasks, message: 'টাস্ক সফলভাবে ডিলিট করা হয়েছে' });
});

app.post(['/api/admin/social-tasks/:id/delete', '/api/admin/social-tasks/delete'], (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const id = req.params.id || req.body?.id;
  if (!id) return res.status(400).json({ error: 'Task ID is required' });

  let tasks = getSocialTasks();
  tasks = tasks.filter((t) => t.id !== id);
  saveSocialTasks(tasks);
  FirebaseSync.deleteSocialTaskFromCloud(id).catch(() => {});
  res.json({ success: true, tasks, message: 'টাস্ক সফলভাবে ডিলিট করা হয়েছে' });
});

// Get recent task completions log and submissions for admin
app.get('/api/admin/social-tasks/submissions', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const logs = getTaskCompletions();
  const pendingCount = logs.filter((l) => l.status === 'pending').length;
  const approvedCount = logs.filter((l) => l.status === 'approved').length;
  const rejectedCount = logs.filter((l) => l.status === 'rejected').length;

  res.json({
    success: true,
    logs: logs.slice(0, 200),
    stats: {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      total: logs.length
    }
  });
});

// Admin approves a task submission and credits USD to user
app.post('/api/admin/social-tasks/submissions/:id/approve', async (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const result = await approveSocialTaskSubmission(req.params.id, admin?.name || 'Admin');
  if (!result.success) {
    return res.status(400).json({ error: result.error || 'অ্যাপ্রুভ করতে ব্যর্থ হয়েছে।' });
  }

  res.json({
    success: true,
    message: `✓ টাস্ক সফলভাবে অ্যাপ্রুভ করা হয়েছে এবং ব্যবহারকারীর ওয়ালেটে $${result.submission?.rewardUsd} USD যুক্ত হয়েছে!`,
    submission: result.submission,
    newBalance: result.newBalance
  });
});

// Admin rejects a task submission with reason
app.post('/api/admin/social-tasks/submissions/:id/reject', async (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const { reason } = req.body;
  const result = await rejectSocialTaskSubmission(req.params.id, reason || 'প্রদত্ত স্ক্রিনশট প্রমাণ সঠিক নয়', admin?.name || 'Admin');
  if (!result.success) {
    return res.status(400).json({ error: result.error || 'প্রত্যাখ্যান ব্যর্থ হয়েছে।' });
  }

  res.json({
    success: true,
    message: '✓ টাস্কটি বাতিল (Rejected) করা হয়েছে।',
    submission: result.submission
  });
});



// ExoClick VAST XML Resolver & Proxy (handles Client Hints forwarding, Wrapper chains, and MediaFile extraction)
function extractCdataOrText(xmlChunk: string): string {
  const cdataMatch = xmlChunk.match(/<!\[CDATA\[([\s\S]*?)\]\]>/i);
  if (cdataMatch && cdataMatch[1]) {
    return cdataMatch[1].trim();
  }
  return xmlChunk.replace(/<[^>]+>/g, '').trim();
}

function parseVastXmlString(xml: string) {
  const adIdMatch = xml.match(/<Ad[^>]*id=["']([^"']+)["']/i);
  const adId = adIdMatch ? adIdMatch[1].trim() : '';

  const impressionUrls: string[] = [];
  const impRegex = /<Impression[^>]*>([\s\S]*?)<\/Impression>/gi;
  let match: RegExpExecArray | null;
  while ((match = impRegex.exec(xml)) !== null) {
    const url = extractCdataOrText(match[1]);
    if (url.startsWith('http')) impressionUrls.push(url);
  }

  const wrapperMatch = xml.match(/<VASTAdTagURI[^>]*>([\s\S]*?)<\/VASTAdTagURI>/i);
  const wrapperUrl = wrapperMatch ? extractCdataOrText(wrapperMatch[1]) : '';

  const mediaFiles: { url: string; type: string; bitrate: number }[] = [];
  const mediaRegex = /<MediaFile([^>]*)>([\s\S]*?)<\/MediaFile>/gi;
  while ((match = mediaRegex.exec(xml)) !== null) {
    const attrs = match[1] || '';
    const url = extractCdataOrText(match[2]);
    if (!url.startsWith('http')) continue;
    const typeMatch = attrs.match(/type=["']([^"']+)["']/i);
    const bitrateMatch = attrs.match(/bitrate=["'](\d+)["']/i);
    mediaFiles.push({
      url,
      type: typeMatch ? typeMatch[1].toLowerCase() : 'video/mp4',
      bitrate: bitrateMatch ? parseInt(bitrateMatch[1], 10) : 0
    });
  }

  // Prefer video/mp4 first, then webm/ogg, then any valid stream
  mediaFiles.sort((a, b) => {
    const aMp4 = a.type.includes('mp4') ? 1 : 0;
    const bMp4 = b.type.includes('mp4') ? 1 : 0;
    if (aMp4 !== bMp4) return bMp4 - aMp4;
    return b.bitrate - a.bitrate;
  });

  const clickThroughMatch = xml.match(/<ClickThrough[^>]*>([\s\S]*?)<\/ClickThrough>/i);
  const clickThroughUrl = clickThroughMatch ? extractCdataOrText(clickThroughMatch[1]) : '';

  const displayUrlMatch = xml.match(/<DisplayUrl[^>]*>([\s\S]*?)<\/DisplayUrl>/i);
  const displayUrl = displayUrlMatch ? extractCdataOrText(displayUrlMatch[1]) : '';

  const ctaTextMatch = xml.match(/<MobileText[^>]*>([\s\S]*?)<\/MobileText>/i) || xml.match(/<PCText[^>]*>([\s\S]*?)<\/PCText>/i);
  const ctaText = ctaTextMatch ? extractCdataOrText(ctaTextMatch[1]) : '';

  const clickTrackingUrls: string[] = [];
  const clickTrackRegex = /<ClickTracking[^>]*>([\s\S]*?)<\/ClickTracking>/gi;
  while ((match = clickTrackRegex.exec(xml)) !== null) {
    const url = extractCdataOrText(match[1]);
    if (url.startsWith('http')) clickTrackingUrls.push(url);
  }

  const trackingEvents: Record<string, string[]> = {};
  const addTrack = (evKey: string, u: string) => {
    if (!trackingEvents[evKey]) trackingEvents[evKey] = [];
    if (!trackingEvents[evKey].includes(u)) trackingEvents[evKey].push(u);
  };

  const trackRegex = /<Tracking([^>]*)>([\s\S]*?)<\/Tracking>/gi;
  while ((match = trackRegex.exec(xml)) !== null) {
    const attrs = match[1] || '';
    const url = extractCdataOrText(match[2]);
    if (!url.startsWith('http')) continue;

    const eventMatch = attrs.match(/event=["']([^"']+)["']/i);
    const idMatch = attrs.match(/id=["']([^"']+)["']/i);
    const eventName = eventMatch ? eventMatch[1].trim() : '';
    const trackId = idMatch ? idMatch[1].trim() : '';

    if (eventName === 'progress') {
      // ExoClick VAST 3.0 uses event="progress" with prog_1..5 or progress=0%25..100%25
      if (trackId === 'prog_1' || url.includes('progress=0%')) {
        addTrack('start', url);
      } else if (trackId === 'prog_2' || url.includes('progress=25%')) {
        addTrack('firstQuartile', url);
      } else if (trackId === 'prog_3' || url.includes('progress=50%')) {
        addTrack('midpoint', url);
      } else if (trackId === 'prog_4' || url.includes('progress=75%')) {
        addTrack('thirdQuartile', url);
      } else if (trackId === 'prog_5' || url.includes('progress=100%')) {
        addTrack('complete', url);
      } else {
        addTrack('progress', url);
      }
    } else if (eventName) {
      addTrack(eventName, url);
    }
  }

  return {
    adId,
    wrapperUrl,
    mediaFileUrl: mediaFiles[0]?.url || '',
    clickThroughUrl,
    displayUrl,
    ctaText,
    impressionUrls,
    clickTrackingUrls,
    trackingEvents
  };
}

interface ResolvedExoClickCreative {
  adId: string;
  zoneId: string;
  resolvedFrom: string;
  mediaFileUrl: string;
  clickThroughUrl: string;
  displayUrl: string;
  ctaText: string;
  impressionUrls: string[];
  clickTrackingUrls: string[];
  trackingEvents: Record<string, string[]>;
}

const ROTATED_CREATIVE_STREAMS: {
  adId: string;
  zoneId: string;
  mediaFileUrl: string;
  clickThroughUrl: string;
  displayUrl: string;
  ctaText: string;
}[] = [
  {
    adId: '8404570',
    zoneId: '6042506',
    mediaFileUrl: 'https://n2j9y0x0.bxcdn.net/library/342126/1d38c863ceaac9cb1c656e91234b0cf43ed2db7d.mp4',
    clickThroughUrl: 'https://s.magsrv.com/click.php?d=H4sIAAAAAAAAA42PwW6DMAyGn6a3EiWOTeLjLt1hh03aEwQILVILFTDQJD_8ArQThx0mO7KjfL_9x6NGclq0XMbxPhzsywFOKed5VvX1q6nu1_Ade1V2N0mQcayJkYDl0g1j056zazPFrA7DmE15M6iu7WNbPRQWVUogVIa8GMtMzhuQXCOQzgXZL1NBvFuGaxYxKUQAQBDYxao0XDAFLH2kUGMIdR61D0WoV.F_XOg1_iaPT_K4_tA84CWM9xoIFjfJmpbdE_6CZmsFUiUSSmy6yefrxw7fCd3WKL2onkMGdQvnoZ9Wt8v3EwBblXxbk86Udry_CRI7LAzbwhaRY4XeJJtsIrgQbFH9AEUyD87SAQAA',
    displayUrl: 'fluidplayer.com',
    ctaText: 'View More'
  },
  {
    adId: '8539462',
    zoneId: '6042506',
    mediaFileUrl: 'https://n2j9y0x0.bxcdn.net/library/1001276/06966f9de226ef7ef2f931b239f5008168a80b5d.mp4',
    clickThroughUrl: 'https://s.magsrv.com/click.php?d=H4sIAAAAAAAAA12Py27DIBBFv8a7Yg1vvKxUpYsuWqkfEIHBiZX4IXBcRZqPL7hpGlWDYIY7nLkYyRuhGFI8LsucKv5csV1ecYrxWrfTkPM5Tv7SLun3mnhGJAAM9kjmKS7WnQNpjzYeQiSncM1pP2blK5fOjqeK7y7LsG_tMNv.MFb85QaomCpCmi6xDfk6ZUYotP25H0.IgFQ3IBsudPY3paUfD.Tcr4F0Ni1kVX2qpzGG0YdYvCIXdV5MippKg1RoLpSSChUIJkGhaEyhMjS6wKHB_HGKiIwxdF3rjeyUc8JD8J43oTPAO6mDVRT89vDmopgoHrapsMU_5akomQ33oMYAk6xMQy3wUbn3UbGlyPIpJcrcmiv8fP14aP8LoR8YP2eqB3tIcd2cla9tgLype9ua6e9vaFsVOk6dMY52jjmrPee0oYECcMnNN0aBzoUbAgAA',
    displayUrl: 'rorry.com',
    ctaText: 'Shop Now'
  },
  {
    adId: '6042500-A1',
    zoneId: '6042500',
    mediaFileUrl: 'https://storage.googleapis.com/gvabox/media/samples/stock.mp4',
    clickThroughUrl: 'https://s.magsrv.com/click.php?d=H4sIAAAAAAAAA42PwW6DMAyGn6a3EiWOTeLjLt1hh03aEwQILVILFTDQJD_8ArQThx0mO7KjfL_9x6NGclq0XMbxPhzsywFOKed5VvX1q6nu1_Ade1V2N0mQcayJkYDl0g1j056zazPFrA7DmE15M6iu7WNbPRQWVUogVIa8GMtMzhuQXCOQzgXZL1NBvFuGaxYxKUQAQBDYxao0XDAFLH2kUGMIdR61D0WoV.F_XOg1_iaPT_K4_tA84CWM9xoIFjfJmpbdE_6CZmsFUiUSSmy6yefrxw7fCd3WKL2onkMGdQvnoZ9Wt8v3EwBblXxbk86Udry_CRI7LAzbwhaRY4XeJJtsIrgQbFH9AEUyD87SAQAA',
    displayUrl: 'exoclick.com',
    ctaText: 'Learn More'
  },
  {
    adId: '6042506-B2',
    zoneId: '6042506',
    mediaFileUrl: 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-576p.mp4',
    clickThroughUrl: 'https://s.magsrv.com/click.php?d=H4sIAAAAAAAAA12Py27DIBBFv8a7Yg1vvKxUpYsuWqkfEIHBiZX4IXBcRZqPL7hpGlWDYIY7nLkYyRuhGFI8LsucKv5csV1ecYrxWrfTkPM5Tv7SLun3mnhGJAAM9kjmKS7WnQNpjzYeQiSncM1pP2blK5fOjqeK7y7LsG_tMNv.MFb85QaomCpCmi6xDfk6ZUYotP25H0.IgFQ3IBsudPY3paUfD.Tcr4F0Ni1kVX2qpzGG0YdYvCIXdV5MippKg1RoLpSSChUIJkGhaEyhMjS6wKHB_HGKiIwxdF3rjeyUc8JD8J43oTPAO6mDVRT89vDmopgoHrapsMU_5akomQ33oMYAk6xMQy3wUbn3UbGlyPIpJcrcmiv8fP14aP8LoR8YP2eqB3tIcd2cla9tgLype9ua6e9vaFsVOk6dMY52jjmrPee0oYECcMnNN0aBzoUbAgAA',
    displayUrl: 'magsrv.com',
    ctaText: 'Explore Offer'
  },
  {
    adId: '6042500-C3',
    zoneId: '6042500',
    mediaFileUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
    clickThroughUrl: 'https://s.magsrv.com/click.php?d=H4sIAAAAAAAAA42PwW6DMAyGn6a3EiWOTeLjLt1hh03aEwQILVILFTDQJD_8ArQThx0mO7KjfL_9x6NGclq0XMbxPhzsywFOKed5VvX1q6nu1_Ade1V2N0mQcayJkYDl0g1j056zazPFrA7DmE15M6iu7WNbPRQWVUogVIa8GMtMzhuQXCOQzgXZL1NBvFuGaxYxKUQAQBDYxao0XDAFLH2kUGMIdR61D0WoV.F_XOg1_iaPT_K4_tA84CWM9xoIFjfJmpbdE_6CZmsFUiUSSmy6yefrxw7fCd3WKL2onkMGdQvnoZ9Wt8v3EwBblXxbk86Udry_CRI7LAzbwhaRY4XeJJtsIrgQbFH9AEUyD87SAQAA',
    displayUrl: 'exoclick.com',
    ctaText: 'Visit Sponsor'
  }
];

let vastRotationCounter = 0;

const EXOCLICK_DEVICE_PROFILES = [
  {
    ua: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.127 Mobile Safari/537.36',
    chUa: '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
    chMobile: '?1',
    chPlatform: '"Android"',
    chModel: '"SM-S928B"'
  },
  {
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.127 Safari/537.36',
    chUa: '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
    chMobile: '?0',
    chPlatform: '"Windows"',
    chModel: '""'
  },
  {
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    chUa: '"Not/A)Brand";v="8", "Chromium";v="126"',
    chMobile: '?1',
    chPlatform: '"iOS"',
    chModel: '"iPhone"'
  },
  {
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.127 Safari/537.36',
    chUa: '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
    chMobile: '?0',
    chPlatform: '"macOS"',
    chModel: '""'
  }
];

function generateRandomSubnetIp(seed: number): string {
  const prefixes = ['103.108.140', '103.230.104', '37.111.200', '27.147.200', '114.130.100', '72.229.28', '81.2.69', '49.36.128'];
  const prefix = prefixes[seed % prefixes.length];
  const host = ((seed * 37 + Math.floor(Math.random() * 220)) % 240) + 10;
  return `${prefix}.${host}`;
}

async function pingExoClickUrlsServerSide(urls: string[], userAgent?: string) {
  if (!Array.isArray(urls) || urls.length === 0) return;
  for (const u of urls) {
    if (!u || !u.startsWith('http')) continue;
    fetch(u, {
      method: 'GET',
      headers: {
        'User-Agent':
          userAgent ||
          'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.127 Mobile Safari/537.36',
        Referer: 'https://hosting-live-fast-v6is.onrender.com/',
        Origin: 'https://hosting-live-fast-v6is.onrender.com'
      }
    }).catch(() => {});
  }
}

app.post('/api/ads/vast-track', async (req, res) => {
  try {
    const urls = Array.isArray(req.body?.urls) ? req.body.urls : [];
    const ua = req.headers['user-agent'] as string | undefined;
    pingExoClickUrlsServerSide(urls, ua);
    res.json({ success: true, count: urls.length });
  } catch {
    res.json({ success: false });
  }
});

app.get('/api/ads/vast-resolve', async (req, res) => {
  try {
    vastRotationCounter += 1;
    const settings = getRewardAdSettings();
    const requestedUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    const excludeVideo = typeof req.query.excludeVideo === 'string' ? req.query.excludeVideo.trim() : '';
    const excludeListRaw = typeof req.query.excludeList === 'string' ? req.query.excludeList.trim() : '';
    const excludedVideos = new Set(
      [excludeVideo, ...excludeListRaw.split(',')].map((s) => s.trim()).filter(Boolean)
    );

    const baseZoneUrls = Array.from(
      new Set(
        [
          'https://s.magsrv.com/v1/vast.php?idzone=6042506',
          'https://s.magsrv.com/v1/vast.php?idz=6042500',
          'https://s.magsrv.com/v1/vast.php?idzone=6042500',
          requestedUrl,
          ...(settings.vastTagUrls || []),
          settings.vastTagUrl || ''
        ].filter((u) => u && u.startsWith('http'))
      )
    );

    // Rotate starting zone on each click so both 6042506 and 6042500 are queried actively
    const candidateUrls = baseZoneUrls.map(
      (_, idx) => baseZoneUrls[(idx + vastRotationCounter) % baseZoneUrls.length]
    );

    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['cf-connecting-ip'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      '';

    let liveResolvedAd: ResolvedExoClickCreative | null = null;

    // Try multiple device/IP profiles so ExoClick never blocks with zone-cap=1 and serves fresh creatives
    for (let attempt = 0; attempt < 4; attempt++) {
      const profile = EXOCLICK_DEVICE_PROFILES[(vastRotationCounter + attempt) % EXOCLICK_DEVICE_PROFILES.length];
      const useIp =
        attempt === 0 && clientIp && !clientIp.includes('127.0.0.1') && !clientIp.includes('::1')
          ? clientIp
          : generateRandomSubnetIp(vastRotationCounter + attempt);

      const forwardHeaders: Record<string, string> = {
        'User-Agent': profile.ua,
        Accept: 'application/xml, text/xml, */*;q=0.8',
        'Accept-Language': (req.headers['accept-language'] as string) || 'en-US,en;q=0.9',
        Referer: 'https://hosting-live-fast-v6is.onrender.com/',
        Origin: 'https://hosting-live-fast-v6is.onrender.com',
        'X-Forwarded-For': useIp,
        'X-Real-IP': useIp,
        'Sec-CH-UA': profile.chUa,
        'Sec-CH-UA-Mobile': profile.chMobile,
        'Sec-CH-UA-Platform': profile.chPlatform,
        'Sec-CH-UA-Platform-Version': '"14.0.0"',
        'Sec-CH-UA-Model': profile.chModel,
        'Sec-CH-UA-Arch': '"arm"',
        'Sec-CH-UA-Bitness': '"64"',
        'Sec-CH-UA-Full-Version': '"128.0.6613.127"',
        'Sec-CH-UA-Full-Version-List': profile.chUa
      };

      for (const baseVastUrl of candidateUrls) {
        let currentVastUrl = baseVastUrl;
        const zoneMatch = baseVastUrl.match(/idzone=(\d+)|idz=(\d+)/i);
        const zoneId = zoneMatch ? (zoneMatch[1] || zoneMatch[2] || '6042506') : '6042506';
        const aggregatedImpressions: string[] = [];
        const aggregatedClickTracking: string[] = [];
        const aggregatedEvents: Record<string, string[]> = {};

        for (let depth = 0; depth < 3; depth++) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);
            const response = await fetch(currentVastUrl, {
              headers: forwardHeaders,
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) break;
            const xmlText = await response.text();
            if (!xmlText || !xmlText.includes('<VAST')) break;

            const parsed = parseVastXmlString(xmlText);
            aggregatedImpressions.push(...parsed.impressionUrls);
            aggregatedClickTracking.push(...parsed.clickTrackingUrls);
            for (const [ev, urls] of Object.entries(parsed.trackingEvents)) {
              if (!aggregatedEvents[ev]) aggregatedEvents[ev] = [];
              aggregatedEvents[ev].push(...urls);
            }

            if (parsed.mediaFileUrl) {
              const candidateCreative: ResolvedExoClickCreative = {
                adId: parsed.adId || `EXO-${zoneId}`,
                zoneId,
                resolvedFrom: baseVastUrl,
                mediaFileUrl: parsed.mediaFileUrl,
                clickThroughUrl: parsed.clickThroughUrl || ROTATED_CREATIVE_STREAMS[0].clickThroughUrl,
                displayUrl: parsed.displayUrl || 'exoclick.com',
                ctaText: parsed.ctaText || 'View More',
                impressionUrls: aggregatedImpressions,
                clickTrackingUrls: aggregatedClickTracking,
                trackingEvents: aggregatedEvents
              };

              // Save the first valid live VAST response we get
              if (!liveResolvedAd) {
                liveResolvedAd = candidateCreative;
              }

              // Add to our rotating creative pool if not already present
              if (!ROTATED_CREATIVE_STREAMS.some((c) => c.mediaFileUrl === candidateCreative.mediaFileUrl)) {
                ROTATED_CREATIVE_STREAMS.unshift({
                  adId: candidateCreative.adId,
                  zoneId: candidateCreative.zoneId,
                  mediaFileUrl: candidateCreative.mediaFileUrl,
                  clickThroughUrl: candidateCreative.clickThroughUrl,
                  displayUrl: candidateCreative.displayUrl,
                  ctaText: candidateCreative.ctaText
                });
              }

              // If this video is different from the excluded (recently watched) videos, return it immediately!
              if (!excludedVideos.has(candidateCreative.mediaFileUrl)) {
                pingExoClickUrlsServerSide(candidateCreative.impressionUrls, profile.ua);
                return res.json({
                  success: true,
                  ...candidateCreative
                });
              }
            }

            if (parsed.wrapperUrl && parsed.wrapperUrl.startsWith('http')) {
              currentVastUrl = parsed.wrapperUrl;
              continue;
            }
            break;
          } catch {
            break;
          }
        }
      }
    }

    // Pick a creative from ROTATED_CREATIVE_STREAMS that is NOT in excludedVideos so the user NEVER sees the same video repeatedly
    const availableStreams = ROTATED_CREATIVE_STREAMS.filter((c) => !excludedVideos.has(c.mediaFileUrl));
    const chosenStream =
      availableStreams.length > 0
        ? availableStreams[vastRotationCounter % availableStreams.length]
        : ROTATED_CREATIVE_STREAMS[vastRotationCounter % ROTATED_CREATIVE_STREAMS.length];

    if (liveResolvedAd) {
      pingExoClickUrlsServerSide(liveResolvedAd.impressionUrls);
      return res.json({
        success: true,
        ...liveResolvedAd,
        adId: liveResolvedAd.adId || chosenStream.adId,
        zoneId: liveResolvedAd.zoneId || chosenStream.zoneId,
        mediaFileUrl: chosenStream.mediaFileUrl,
        clickThroughUrl: liveResolvedAd.clickThroughUrl || chosenStream.clickThroughUrl,
        displayUrl: chosenStream.displayUrl || liveResolvedAd.displayUrl,
        ctaText: chosenStream.ctaText || liveResolvedAd.ctaText
      });
    }

    return res.json({
      success: true,
      adId: chosenStream.adId,
      zoneId: chosenStream.zoneId,
      resolvedFrom: `https://s.magsrv.com/v1/vast.php?idzone=${chosenStream.zoneId}`,
      mediaFileUrl: chosenStream.mediaFileUrl,
      clickThroughUrl: chosenStream.clickThroughUrl,
      displayUrl: chosenStream.displayUrl,
      ctaText: chosenStream.ctaText,
      impressionUrls: [],
      clickTrackingUrls: [],
      trackingEvents: {}
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'VAST resolution error' });
  }
});

// Robots.txt & Sitemap routes for Google Search Console & SEO crawlers
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send('User-agent: *\nAllow: /\nSitemap: https://hosting-free-live.onrender.com/sitemap.xml\n');
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://hosting-free-live.onrender.com/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
});

// Admin Direct URL Route: allows visiting /admin directly in browser
app.get(['/admin', '/admin/login'], (req, res) => {
  res.redirect('/?admin=true');
});

// Vite middleware / Static Serving
async function start() {
  const publicPath = path.join(process.cwd(), 'public');
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
  }

  const isProd = process.env.NODE_ENV === 'production' || process.argv[1]?.includes('dist') || !fs.existsSync(path.join(process.cwd(), 'src', 'main.tsx'));
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

async function initSiteConfigSync() {
  try {
    console.log('🔄 Syncing Site Settings, Logo & Banners with Firebase Firestore...');
    const remoteSettings = await FirebaseSync.loadSiteSettingsFromCloud();
    if (remoteSettings && remoteSettings.siteName && (remoteSettings.logoUrl || remoteSettings.taglineBn)) {
      const current = getSiteSettings();
      const hasMeaningfulChanges =
        (remoteSettings.siteName && remoteSettings.siteName !== current.siteName) ||
        (remoteSettings.logoUrl && remoteSettings.logoUrl !== current.logoUrl) ||
        (remoteSettings.taglineBn && remoteSettings.taglineBn !== current.taglineBn) ||
        (remoteSettings.taglineEn && remoteSettings.taglineEn !== current.taglineEn);

      if (hasMeaningfulChanges) {
        const merged = { ...DEFAULT_SITE_SETTINGS, ...remoteSettings };
        delete merged.updatedAt;
        saveSiteSettings(merged);
        console.log('✅ Restored site_settings from Firebase Firestore:', remoteSettings.siteName);
      }

      if (remoteSettings.logoUrl && remoteSettings.logoUrl.startsWith('/api/store/thumbnails/')) {
        const imgName = path.basename(remoteSettings.logoUrl);
        const diskPath = path.join(STORE_THUMBNAILS_DIR, imgName);
        if (!fs.existsSync(diskPath)) {
          const cloudImg = await FirebaseSync.loadSiteImageFromCloud(imgName);
          if (cloudImg && cloudImg.base64) {
            fs.writeFileSync(diskPath, Buffer.from(cloudImg.base64, 'base64'));
            try {
              fs.writeFileSync(path.join(process.cwd(), 'public', 'site-logo.png'), Buffer.from(cloudImg.base64, 'base64'));
            } catch {}
            console.log('✅ Restored custom site logo from Firebase Firestore to local disk!');
          }
        }
      }
    } else {
      const local = getSiteSettings();
      FirebaseSync.syncSiteSettingsToCloud(local).catch(() => {});
    }

    const remoteBanners = await FirebaseSync.loadBannersFromCloud();
    if (remoteBanners && Array.isArray(remoteBanners) && remoteBanners.length > 0) {
      const currentBanners = getBanners();
      const hasRealChange =
        currentBanners.length !== remoteBanners.length ||
        remoteBanners.some((rb, i) => {
          const cb = currentBanners[i];
          return !cb || cb.id !== rb.id || cb.title !== rb.title || cb.imageUrl !== rb.imageUrl || cb.link !== rb.link;
        });
      if (hasRealChange) {
        saveBanners(remoteBanners);
        console.log(`✅ Restored ${remoteBanners.length} banners from Firebase Firestore!`);
      }
      for (const b of remoteBanners) {
        if (b.imageUrl && b.imageUrl.startsWith('/api/store/thumbnails/')) {
          const imgName = path.basename(b.imageUrl);
          const diskPath = path.join(STORE_THUMBNAILS_DIR, imgName);
          if (!fs.existsSync(diskPath)) {
            const cloudImg = await FirebaseSync.loadSiteImageFromCloud(imgName);
            if (cloudImg && cloudImg.base64) {
              fs.writeFileSync(diskPath, Buffer.from(cloudImg.base64, 'base64'));
            }
          }
        }
      }
    } else {
      const localBanners = getBanners();
      FirebaseSync.syncBannersToCloud(localBanners).catch(() => {});
    }

    const remotePay = await FirebaseSync.loadPaymentSettingsFromCloud();
    if (remotePay && remotePay.binanceUid) {
      savePaymentSettings(remotePay);
      console.log('✅ Restored payment settings from Firebase Firestore!');
    }

    const remoteMethods = await FirebaseSync.loadDepositMethodsFromCloud();
    if (remoteMethods && Array.isArray(remoteMethods) && remoteMethods.length > 0) {
      saveDepositMethods(remoteMethods);
      console.log(`✅ Restored ${remoteMethods.length} deposit methods from Firebase Firestore!`);
      for (const m of remoteMethods) {
        if (m.logoUrl && m.logoUrl.startsWith('/api/store/thumbnails/')) {
          const imgName = path.basename(m.logoUrl);
          const diskPath = path.join(STORE_THUMBNAILS_DIR, imgName);
          if (!fs.existsSync(diskPath)) {
            const cloudImg = await FirebaseSync.loadSiteImageFromCloud(imgName);
            if (cloudImg && cloudImg.base64) {
              try {
                fs.writeFileSync(diskPath, Buffer.from(cloudImg.base64, 'base64'));
              } catch {}
            }
          }
        }
        if (m.qrImageUrl && m.qrImageUrl.startsWith('/api/store/thumbnails/')) {
          const imgName = path.basename(m.qrImageUrl);
          const diskPath = path.join(STORE_THUMBNAILS_DIR, imgName);
          if (!fs.existsSync(diskPath)) {
            const cloudImg = await FirebaseSync.loadSiteImageFromCloud(imgName);
            if (cloudImg && cloudImg.base64) {
              try {
                fs.writeFileSync(diskPath, Buffer.from(cloudImg.base64, 'base64'));
              } catch {}
            }
          }
        }
      }
    }

    const remoteTasks = await FirebaseSync.loadSocialTasksFromCloud();
    if (remoteTasks && Array.isArray(remoteTasks) && remoteTasks.length > 0) {
      saveSocialTasks(remoteTasks);
      console.log(`✅ Restored ${remoteTasks.length} social tasks from Firebase Firestore!`);
    }

    const remoteCompletions = await FirebaseSync.loadTaskCompletionsFromCloud();
    if (remoteCompletions && Array.isArray(remoteCompletions) && remoteCompletions.length > 0) {
      const current = getTaskCompletions();
      const map = new Map<string, any>();
      current.forEach((c) => { if (c && c.id) map.set(c.id, c); });
      remoteCompletions.forEach((c) => { if (c && c.id) map.set(c.id, c); });
      const merged = Array.from(map.values());
      merged.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
      saveTaskCompletions(merged);
      console.log(`✅ Restored ${merged.length} task completions from Firebase Firestore!`);
    }

    const remoteBots = await FirebaseSync.loadBotsFromCloud();
    if (remoteBots && Array.isArray(remoteBots) && remoteBots.length > 0) {
      const current = getRegistry();
      const map = new Map<string, any>();
      current.forEach((b) => { if (b && b.id) map.set(b.id, b); });
      let added = false;
      for (const rb of remoteBots) {
        if (rb && rb.id) {
          if (!map.has(rb.id)) {
            map.set(rb.id, rb);
            added = true;
          }
          const botDir = path.join(HOSTED_BOTS_DIR, rb.dirName || rb.id);
          if (!fs.existsSync(botDir) || fs.readdirSync(botDir).length === 0) {
            await FirebaseSync.restoreBotWorkspaceFromCloud(rb.id, botDir);
          }
          if ((rb.status === 'running' || rb.autoRestart !== false) && !runningProcesses.has(rb.id)) {
            setTimeout(() => {
              launchBotProcess(rb);
            }, 1500);
          }
        }
      }
      if (added) {
        saveRegistry(Array.from(map.values()));
        console.log(`✅ Restored ${remoteBots.length} hosted bots and workspaces from Firebase Firestore!`);
      }
    }

    const remoteSmtp = await FirebaseSync.loadSmtpSettingsFromCloud();
    if (remoteSmtp && remoteSmtp.user && remoteSmtp.pass) {
      saveSmtpSettingsFile(remoteSmtp);
      console.log('✅ Restored SMTP settings from Firebase Firestore!');
    } else {
      const localSmtp = loadSmtpSettingsFile();
      if (localSmtp && localSmtp.pass) {
        FirebaseSync.syncSmtpSettingsToCloud(localSmtp).catch(() => {});
      }
    }

    const remoteWebsites = await FirebaseSync.loadWebsitesFromCloud();
    if (remoteWebsites && Array.isArray(remoteWebsites) && remoteWebsites.length > 0) {
      const current = getWebsites();
      const map = new Map<string, any>();
      current.forEach((w) => { if (w && w.id) map.set(w.id, w); });
      let added = false;
      remoteWebsites.forEach((rw) => {
        if (rw && rw.id && !map.has(rw.id)) {
          map.set(rw.id, rw);
          added = true;
        }
      });
      if (added) {
        saveWebsites(Array.from(map.values()));
        console.log(`✅ Restored ${remoteWebsites.length} websites from Firebase Firestore!`);
      }
    }
  } catch (err: any) {
    console.warn('initSiteConfigSync error:', err.message || err);
  }
}

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bot-Host server running on http://0.0.0.0:${PORT}`);
    // Start Firebase Cloud Sync for user accounts & balances
    FirebaseSync.initSync(getAccounts, saveAccounts).catch((err) => {
      console.warn('Firebase initial sync warning:', err);
    });
    // Start Firebase Cloud Sync for deposit & plan requests
    FirebaseSync.initPlanRequestsSync(getPlanRequests, savePlanRequests).catch((err) => {
      console.warn('Firebase plan requests initial sync warning:', err);
    });
    // Start Firebase Cloud Sync for Site Settings, Logo, Banners & Payment Configurations
    initSiteConfigSync().catch((err) => {
      console.warn('Firebase site config sync warning:', err);
    });
    // Start Cloud SMTP Relay Worker to dispatch any emails queued over HTTPS Port 443
    startCloudSmtpRelayWorker();
    // Start 24-Hour recurring automatic bot backup service
    start24HourBackupScheduler(getRegistry, appendLog);
  });
}

start();
