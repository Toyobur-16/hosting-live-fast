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
  getRewardAdSettings,
  saveRewardAdSettings,
  getUserRewardStats,
  startAdSession,
  completeAdSession
} from './server/rewardAdsManager';
import {
  getWebsites,
  getWebsiteById,
  getWebsiteBySlug,
  createWebsite,
  deployWebsiteFiles,
  deployWebsiteZip,
  toggleWebsiteStatus,
  deleteWebsite,
  updateWebsite,
  getWebsiteFilesList,
  getWebsiteSettings,
  saveWebsiteSettings,
  isValidSlug,
  sanitizeSlug
} from './server/staticWebsitesManager';

// Enforce IPv4 priority globally to eliminate ENETUNREACH in containers lacking IPv6 routes
if (typeof (dns as any).setDefaultResultOrder === 'function') {
  try {
    (dns as any).setDefaultResultOrder('ipv4first');
  } catch (e) {}
}

const app = express();
const PORT = 3000;

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
    if (curr.bkashNumber?.includes('01711223344') || !curr.bkashNumber) {
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
    "subtitle": "HTML, CSS, JS ও ফ্রন্টএন্ড কোড ফাইল সহজে হোস্ট ও পরিচালনা করুন",
    "subtitleBn": "HTML, CSS, JS ও ফ্রন্টএন্ড কোড ফাইল সহজে হোস্ট ও পরিচালনা করুন",
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

const DEFAULT_CATEGORIES = [
  { id: 'vip_file', name: 'VIP FILE', nameBn: 'ভিআইপি ফাইল', icon: 'folder', count: 12, active: true },
  { id: 'telegram_bots', name: 'Telegram Bots', nameBn: 'টেলিগ্রাম বটস', icon: 'bot', count: 8, active: true },
  { id: 'mini_apps', name: 'Mini Apps', nameBn: 'মিনি অ্যাপস', icon: 'sparkles', count: 15, active: true },
  { id: 'hosting_plans', name: 'Hosting Plans', nameBn: 'হোস্টিং প্লান', icon: 'crown', count: 4, active: true }
];

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
function runPipInstall(args: string, cwd?: string, timeout = 60000): void {
  const dir = cwd || process.cwd();
  try {
    execSync(`python3 -m pip install --break-system-packages --no-cache-dir ${args}`, { cwd: dir, timeout });
  } catch {
    try {
      execSync(`pip3 install --break-system-packages --no-cache-dir ${args}`, { cwd: dir, timeout });
    } catch {
      try {
        execSync(`apt-get update && apt-get install -y python3-pip python3-venv`, { timeout: 90000 });
        execSync(`python3 -m pip install --break-system-packages --no-cache-dir ${args}`, { cwd: dir, timeout });
      } catch (err: any) {
        throw err;
      }
    }
  }
}

// Background environment verification ensuring pip and core libraries are ready when bots are hosted
function ensurePythonBotDependencies() {
  const reg = getRegistry();
  if (!reg || reg.length === 0) return;
  exec('python3 -c "import httpx, telebot, telegram, aiogram, requests"', (err) => {
    if (err) {
      console.log('Installing core Python bot dependencies...');
      exec('python3 -m pip install --break-system-packages --no-cache-dir httpx "httpx[http2]" pyTelegramBotAPI python-telegram-bot aiogram requests aiohttp pillow beautifulsoup4 pydantic pytz schedule', (instErr) => {
        if (instErr) {
          exec('apt-get update && apt-get install -y python3-pip python3-venv && python3 -m pip install --break-system-packages --no-cache-dir httpx "httpx[http2]" pyTelegramBotAPI python-telegram-bot aiogram requests aiohttp pillow beautifulsoup4 pydantic pytz schedule');
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
  fs.writeFileSync(PAYMENT_SETTINGS_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
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
  fs.writeFileSync(SITE_SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
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
  if (
    email === 'toyoburrahman9090@gmail.com' ||
    email === 'mdtayburrahman1111@gmail.com' ||
    email === 'badsharahmanbd@gmail.com' ||
    email === 'toyobur@telegram.bot'
  ) {
    return true;
  }
  return false;
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
    emailVerified: Boolean(user.emailVerified && user.isVerified),
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
      if (user.emailVerified === false || user.isVerified === false) {
        delete sessions[token];
        saveSessions(sessions);
        return null;
      }
      return enrichUserWithPlanAndRole(user);
    }
  }

  // 2. Structured self-healing token (retains login across container restarts for 30 days, ONLY for verified accounts)
  if (token.startsWith('bt_')) {
    try {
      const jsonStr = Buffer.from(token.slice(3), 'base64url').toString('utf-8');
      const payload = JSON.parse(jsonStr);
      if (payload && payload.userId && payload.expiresAt && payload.expiresAt > Date.now()) {
        // Reject any token that was issued before email verification
        if (payload.emailVerified === false) {
          return null;
        }
        let user = accounts.find(
          (a) => a.id === payload.userId || (payload.email && a.email?.toLowerCase() === payload.email.toLowerCase())
        );
        if (user) {
          if (user.emailVerified === false || user.isVerified === false) {
            return null;
          }
          sessions[token] = user.id;
          saveSessions(sessions);
          return enrichUserWithPlanAndRole(user);
        } else if (payload.emailVerified === true) {
          const isAdmin =
            payload.email &&
            (payload.email.toLowerCase() === 'mdtayburrahman1111@gmail.com' ||
              payload.email.toLowerCase() === 'badsharahmanbd@gmail.com' ||
              payload.email.toLowerCase() === 'toyoburrahman9090@gmail.com' ||
              payload.email.toLowerCase() === 'toyoburrahman526@gmail.com' ||
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
                    latestAccs[idx] = {
                      ...latestAccs[idx],
                      ...cloudUser,
                      password: cloudUser.password || latestAccs[idx].password || '',
                      balanceUsd: Math.max(latestAccs[idx].balanceUsd || 0, cloudUser.balanceUsd || 0),
                      balanceBdt: Math.max(latestAccs[idx].balanceBdt || 0, cloudUser.balanceBdt || 0)
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

  return null;
}

// Bot runner
function launchBotProcess(bot: any): boolean {
  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  if (!fs.existsSync(botDir)) {
    appendLog(bot.id, 'error', `Workspace folder not found: ${botDir}`);
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

  const entry = bot.entryFile || 'bot.py';
  const entryPath = path.join(botDir, entry);
  if (!fs.existsSync(entryPath)) {
    appendLog(bot.id, 'error', `Entry script '${entry}' does not exist in workspace.`);
    return false;
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
    { name: 'custom_services.json', content: '[]' }
  ];
  for (const jf of defaultJsons) {
    const p = path.join(botDir, jf.name);
    if (!fs.existsSync(p)) {
      try {
        fs.writeFileSync(p, jf.content, 'utf-8');
      } catch {}
    }
  }

  // Auto install requirements.txt if present
  const reqFile = path.join(botDir, 'requirements.txt');
  if (fs.existsSync(reqFile)) {
    try {
      runPipInstall(`-r "${reqFile}"`, botDir, 60000);
    } catch {}
  }

  appendLog(bot.id, 'info', `Starting python process: python3 ${entry}`);

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PYTHONUNBUFFERED: '1',
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

          // Auto-heal missing python modules or packages
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
              PIL: 'pillow',
              bs4: 'beautifulsoup4',
              cv2: 'opencv-python',
              dotenv: 'python-dotenv'
            };
            const targetPkg = pkgAliases[missingPkg] || missingPkg;
            appendLog(bot.id, 'info', `Auto-healing: Installing missing library '${targetPkg}' via python pip...`);
            try {
              runPipInstall(`"${targetPkg}"`, botDir, 45000);
              appendLog(bot.id, 'info', `Library '${targetPkg}' installed! Re-launching bot process...`);
              setTimeout(() => {
                launchBotProcess(bot);
              }, 1500);
            } catch (instErr: any) {
              appendLog(bot.id, 'warn', `Could not auto-install '${targetPkg}': ${instErr.message}`);
            }
          }
        }
      }
    });

    child.on('close', (code: number) => {
      appendLog(bot.id, code === 0 ? 'info' : 'error', `Process exited with code ${code}`);
      runningProcesses.delete(bot.id);
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
    cleanEmail === 'mdtayburrahman1111@gmail.com' ||
    cleanEmail === 'badsharahmanbd@gmail.com' ||
    cleanEmail === 'toyoburrahman9090@gmail.com' ||
    cleanEmail === 'toyoburrahman526@gmail.com' ||
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
  const { name, email, password } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'নাম এবং ইমেইল প্রদান করা আবশ্যক' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const accounts = getAccounts();
  let existingIdx = accounts.findIndex((a) => a.email && a.email.trim().toLowerCase() === cleanEmail);

  // If not found in local accounts.json (e.g. after a site update), check Firebase Cloud Vault & Firebase Auth
  if (existingIdx === -1) {
    const cloudUser = await FirebaseSync.loadSingleAccountByEmail(cleanEmail);
    if (cloudUser && cloudUser.email) {
      accounts.push(cloudUser);
      saveAccounts(accounts);
      existingIdx = accounts.length - 1;
    } else {
      const fbRecovered = await recoverUserFromFirebaseAuth(cleanEmail, password);
      if (fbRecovered.found && fbRecovered.emailVerified) {
        const restored = buildVerifiedUserRecord(cleanEmail, fbRecovered.name || name.trim(), fbRecovered.passwordMatched ? password : '');
        accounts.push(restored);
        saveAccounts(accounts);
        existingIdx = accounts.length - 1;
      }
    }
  }

  if (existingIdx !== -1) {
    const existing = accounts[existingIdx];
    // If the existing account is already verified, inform the user that this Gmail is already registered!
    if (existing.emailVerified && existing.isVerified) {
      return res.status(409).json({
        success: false,
        alreadyRegistered: true,
        email: cleanEmail,
        error: 'এই জিমেইল দিয়ে ইতিমধ্যে রেজিস্ট্রেশন করা আছে! অনুগ্রহ করে আপনার পাসওয়ার্ড দিয়ে লগইন করুন।'
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
  try {
    await createAndSendVerificationCode(cleanEmail, name.trim(), true, {
      name: name.trim(),
      email: cleanEmail,
      password: password || ''
    });
  } catch (err) {
    console.error('Failed to send initial verification code:', err);
  }

  res.json({
    success: true,
    requiresVerification: true,
    email: cleanEmail,
    message: 'আমরা আপনার ইমেইলে একটি ৬ সংখ্যার ভেরিফিকেশন কোড পাঠিয়েছি। কোডটি দিয়ে ভেরিফাই করলে আপনার রেজিস্ট্রেশন সম্পন্ন হবে।'
  });
});

// Send or resend 6-digit verification code
app.post('/api/auth/send-verification-code', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'ইমেইল এড্রেস আবশ্যক' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const accounts = getAccounts();
  const user = accounts.find((a) => a.email && a.email.trim().toLowerCase() === cleanEmail);

  const result = await createAndSendVerificationCode(cleanEmail, user?.name);
  if (!result.success) {
    return res.status(429).json(result);
  }
  res.json({
    success: true,
    message: 'আমরা আপনার ইমেইলে একটি ৬ সংখ্যার verification code পাঠিয়েছি।'
  });
});

// Resend 6-digit verification code
app.post('/api/auth/resend-verification-code', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'ইমেইল এড্রেস আবশ্যক' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const accounts = getAccounts();
  const user = accounts.find((a) => a.email && a.email.trim().toLowerCase() === cleanEmail);

  const result = await createAndSendVerificationCode(cleanEmail, user?.name);
  if (!result.success) {
    return res.status(429).json(result);
  }
  res.json({
    success: true,
    message: 'নতুন ৬ সংখ্যার ভেরিফিকেশন কোড পাঠানো হয়েছে।'
  });
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
    const validInFirebase = await verifyPasswordWithFirebaseAuth(cleanEmail, password);
    if (validInFirebase) {
      user.password = password;
      saveAccounts(accounts);
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

// Request 6-digit password reset OTP code
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'আপনার নিবন্ধিত ইমেইল এড্রেস লিখুন' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const accounts = getAccounts();
  let user = accounts.find((a) => a.email && a.email.trim().toLowerCase() === cleanEmail);

  if (!user) {
    const cloudUser = await FirebaseSync.loadSingleAccountByEmail(cleanEmail);
    if (cloudUser && cloudUser.email) {
      user = cloudUser;
      accounts.push(user);
      saveAccounts(accounts);
    } else {
      const existsInFb = await checkEmailExistsInFirebaseAuth(cleanEmail);
      if (existsInFb) {
        user = buildVerifiedUserRecord(cleanEmail);
        accounts.push(user);
        saveAccounts(accounts);
      }
    }
  }

  if (!user) {
    return res.status(404).json({ error: 'এই ইমেইল দিয়ে কোনো নিবন্ধিত অ্যাকাউন্ট পাওয়া যায়নি।' });
  }

  const result = await createAndSendPasswordResetCode(cleanEmail, user.name);
  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json({
    success: true,
    message: 'আমরা আপনার ইমেইলে একটি ৬ সংখ্যার পাসওয়ার্ড রিসেট কোড পাঠিয়েছি।'
  });
});

// Resend 6-digit password reset OTP code
app.post('/api/auth/resend-reset-code', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'ইমেইল এড্রেস প্রদান করুন' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const accounts = getAccounts();
  let user = accounts.find((a) => a.email && a.email.trim().toLowerCase() === cleanEmail);
  if (!user) {
    const cloudUser = await FirebaseSync.loadSingleAccountByEmail(cleanEmail);
    if (cloudUser && cloudUser.email) {
      user = cloudUser;
      accounts.push(user);
      saveAccounts(accounts);
    }
  }
  if (!user) {
    return res.status(404).json({ error: 'অ্যাকাউন্ট খুঁজে পাওয়া যায়নি' });
  }

  const result = await createAndSendPasswordResetCode(cleanEmail, user.name);
  if (!result.success) {
    return res.status(429).json(result);
  }

  res.json({
    success: true,
    message: 'নতুন ৬ সংখ্যার পাসওয়ার্ড রিসেট কোড পাঠানো হয়েছে।'
  });
});

// Verify 6-digit code and set new password
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: 'ইমেইল এবং নতুন পাসওয়ার্ড প্রদান করুন' });
  }
  if (!code) {
    return res.status(400).json({ error: 'ইমেইলে পাঠানো ৬ সংখ্যার কোড প্রদান করুন' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const verifyResult = verifyPasswordResetCode(cleanEmail, code);
  if (!verifyResult.success) {
    return res.status(400).json(verifyResult);
  }

  const accounts = getAccounts();
  let user = accounts.find((a) => a.email && a.email.trim().toLowerCase() === cleanEmail);
  if (!user) {
    const cloudUser = await FirebaseSync.loadSingleAccountByEmail(cleanEmail);
    if (cloudUser && cloudUser.email) {
      user = cloudUser;
      accounts.push(user);
    } else {
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

  res.json({
    success: true,
    message: '🎉 পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে এবং আপনি সফলভাবে লগইন হয়েছেন!',
    token,
    user: enriched
  });
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

// Admin Rewards, Websites & User Wallet adjustment endpoints
app.get('/api/admin/rewards/settings', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.json({ success: true, settings: getRewardAdSettings() });
});

app.post('/api/admin/rewards/settings', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const saved = saveRewardAdSettings(req.body);
  res.json({ success: saved, settings: getRewardAdSettings() });
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
      email === 'mdtayburrahman1111@gmail.com' ||
      email === 'badsharahmanbd@gmail.com' ||
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

  res.json({
    success: true,
    message: 'আপনার প্লান রিকোয়েস্ট সফলভাবে জমা হয়েছে। এডমিন ভেরিফাই করে অনুমোদন (Approve) করলেই প্লান সক্রিয় হবে।',
    request: newRequest
  });
});

// Wallet Deposit Submission Endpoint
app.post('/api/wallet/deposit', async (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'ডিপোজিট করতে প্রথমে লগইন করুন (Please login to deposit)' });
  }

  const { amount, currency, method, senderIdentifier, transactionId, note } = req.body;
  const numAmount = parseFloat(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'সঠিক পরিমাণ (Amount) লিখুন' });
  }
  if (!senderIdentifier || !senderIdentifier.trim()) {
    return res.status(400).json({ error: 'প্রেরক ফোন নাম্বার বা Binance UID দিন' });
  }
  if (!transactionId || !transactionId.trim()) {
    return res.status(400).json({ error: 'Transaction ID (TrxID) দিন' });
  }

  const requests = getPlanRequests();
  const cleanTrx = transactionId.trim().toUpperCase();
  const newRequest: any = {
    id: `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type: 'deposit',
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    planId: 'wallet_deposit',
    planName: `ওয়ালেট ডিপোজিট (${numAmount} ${currency || 'USD'})`,
    amount: numAmount,
    currency: currency === 'BDT' ? 'BDT' : 'USD',
    method: method || 'binance',
    senderNumber: senderIdentifier.trim(),
    senderIdentifier: senderIdentifier.trim(),
    transactionId: cleanTrx,
    note: (note || '').trim(),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  // If method is binance or usdt, attempt instant live auto-verification against Binance API
  if ((method === 'binance' || method === 'usdt') && cleanTrx) {
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
          }

          requests.unshift(newRequest);
          savePlanRequests(requests);

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

  res.json({
    success: true,
    message: 'আপনার ডিপোজিট রিকোয়েস্ট সফলভাবে জমা হয়েছে। এডমিন ভেরিফাই করে অনুমোদন করলেই আপনার ওয়ালেটে ব্যালেন্স যোগ হবে।',
    request: newRequest
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

  const accounts = getAccounts();
  const targetUser = accounts.find((a) => a.id === user.id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  if (targetUser.emailVerified === false && targetUser.role !== 'admin') {
    return res.status(403).json({ error: 'প্যাকেজ কেনার পূর্বে আপনার ইমেইল ভেরিফাই করুন।' });
  }

  targetUser.balanceBdt = typeof targetUser.balanceBdt === 'number' ? targetUser.balanceBdt : 0;
  targetUser.balanceUsd = typeof targetUser.balanceUsd === 'number' ? targetUser.balanceUsd : 0;

  const payCurrency = currency === 'BDT' ? 'BDT' : 'USD';
  const price = payCurrency === 'BDT' ? (plan.priceBdt || 0) : (plan.priceUsd || 0);

  if (payCurrency === 'USD') {
    if (targetUser.balanceUsd < price) {
      return res.status(400).json({
        error: `আপনার ওয়ালেটে পর্যাপ্ত USD ব্যালেন্স নেই। প্রয়োজন: $${price} USD, বর্তমান ব্যালেন্স: $${targetUser.balanceUsd.toFixed(2)} USD। প্রথমে ডিপোজিট করুন বা Ad দেখে আয় করুন।`,
        needsDeposit: true,
        requiredAmount: price,
        currentBalance: targetUser.balanceUsd,
        currency: 'USD'
      });
    }

    const deductResult = modifyUserWallet(
      targetUser.id,
      -price,
      'plan_purchase',
      `Hosting Plan: ${plan.nameBn || plan.nameEn} ($${price} USD)`,
      'wallet_plan_purchase',
      plan.id
    );

    if (!deductResult.success) {
      return res.status(400).json({ error: deductResult.error || 'ব্যালেন্স কাটা সম্ভব হয়নি' });
    }
  } else {
    if (targetUser.balanceBdt < price) {
      return res.status(400).json({
        error: `আপনার ওয়ালেটে পর্যাপ্ত BDT ব্যালেন্স নেই। প্রয়োজন: ৳${price} BDT, বর্তমান ব্যালেন্স: ৳${targetUser.balanceBdt.toFixed(2)} BDT। প্রথমে ডিপোজিট করুন।`,
        needsDeposit: true,
        requiredAmount: price,
        currentBalance: targetUser.balanceBdt,
        currency: 'BDT'
      });
    }
    targetUser.balanceBdt = parseFloat((targetUser.balanceBdt - price).toFixed(2));
    saveAccounts(accounts);
  }

  // Reload targetUser to reflect new balance
  const refreshedUser = accounts.find((a) => a.id === user.id) || targetUser;

  // Activate / extend user plan & website limits
  const durationDays = plan.durationDays || 30;
  refreshedUser.plan = plan.id;
  refreshedUser.maxBots = plan.maxBots || 3;
  refreshedUser.maxWebsites = plan.maxWebsites || (plan.id === '1_year' ? 999 : (plan.id === '6_months' ? 10 : (plan.id === '3_months' ? 5 : 3)));
  refreshedUser.maxStorageMb = plan.maxStorageMb || 100;
  const currentExpiry = (refreshedUser.planExpiresAt && refreshedUser.planExpiresAt > Date.now()) ? refreshedUser.planExpiresAt : Date.now();
  refreshedUser.planExpiresAt = currentExpiry + durationDays * 24 * 60 * 60 * 1000;
  saveAccounts(accounts);

  // Send in-app notification & email alert
  sendEmailAlert({
    to: refreshedUser.email,
    userId: refreshedUser.id,
    type: 'plan_purchased',
    subject: `🎉 প্যাকেজ সফলভাবে কেনা হয়েছে (${plan.nameBn})`,
    html: `<p>প্রিয় ${refreshedUser.name}, আপনি সফলভাবে <strong>${plan.nameBn}</strong> প্যাকেজটি ক্রয় করেছেন। ওয়ালেট থেকে ${price} ${payCurrency} কাটা হয়েছে। আপনার নতুন মেয়াদ: ${new Date(refreshedUser.planExpiresAt).toLocaleDateString('bn-BD')}।</p>`,
    text: `আপনি সফলভাবে ${plan.nameBn} প্যাকেজটি কিনেছেন। ওয়ালেট থেকে ${price} ${payCurrency} কাটা হয়েছে।`
  });

  res.json({
    success: true,
    message: `🎉 অভিনন্দন! "${plan.nameBn}" সফলভাবে ক্রয় করা হয়েছে। আপনার প্লান সক্রিয় করা হয়েছে।`,
    user: enrichUserWithPlanAndRole(refreshedUser)
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

  res.json({
    totalUsers: accounts.length,
    totalBots: reg.length,
    runningBots: runningProcesses.size,
    pendingRequestsCount: pendingRequests.length,
    approvedRequestsCount: approvedRequests.length,
    totalRevenueUsd: totalRevenue,
    totalRevenueBdt: totalRevenue,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/admin/plan-requests', (req, res) => {
  const user = getAuthUser(req);
  if (!isUserAdmin(user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.json({ requests: getPlanRequests() });
});

app.post('/api/admin/plan-requests/:id/approve', async (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id } = req.params;
  const requests = getPlanRequests();
  const reqIdx = requests.findIndex((r) => r.id === id);
  if (reqIdx === -1) {
    return res.status(404).json({ error: 'Request not found' });
  }

  const request = requests[reqIdx];
  if (request.status === 'approved') {
    return res.status(400).json({ error: 'Request is already approved' });
  }

  request.status = 'approved';
  request.reviewedAt = new Date().toISOString();
  request.reviewedBy = admin ? admin.email : 'admin';
  savePlanRequests(requests);

  // Update target user account
  const accounts = getAccounts();
  const targetUser = accounts.find((a) => a.id === request.userId || (a.email && a.email.toLowerCase() === request.userEmail.toLowerCase()));
  if (targetUser) {
    if (request.type === 'deposit') {
      // Wallet deposit approval (credit balance in USDT via modifyUserWallet ledger)
      const depAmount = Number(request.amount || 0);
      modifyUserWallet(
        targetUser.id,
        depAmount,
        'deposit',
        `Approved Deposit: ${request.method || 'Manual'} (${request.currency || 'USD'} ${depAmount})`,
        request.method || 'manual_deposit',
        request.transactionId
      );
      await sendDepositProcessedAlert(targetUser, request, 'approved');
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

      saveAccounts(accounts);
      await sendDepositProcessedAlert(targetUser, request, 'approved');
    }
  }

  res.json({ success: true, message: 'অনুমোদন সফল হয়েছে (Approved successfully)', request, updatedUser: targetUser });
});

app.post('/api/admin/plan-requests/:id/reject', async (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id } = req.params;
  const { reason } = req.body;
  const requests = getPlanRequests();
  const reqIdx = requests.findIndex((r) => r.id === id);
  if (reqIdx === -1) {
    return res.status(404).json({ error: 'Request not found' });
  }

  const request = requests[reqIdx];
  request.status = 'rejected';
  request.rejectReason = reason || 'ভুল বা অপর্যাপ্ত ট্রানজেকশন তথ্য (Invalid or unpaid)';
  request.reviewedAt = new Date().toISOString();
  request.reviewedBy = admin ? admin.email : 'admin';
  savePlanRequests(requests);

  const accounts = getAccounts();
  const targetUser = accounts.find((a) => a.id === request.userId || (a.email && a.email.toLowerCase() === request.userEmail.toLowerCase()));
  if (targetUser) {
    await sendDepositProcessedAlert(targetUser, request, 'rejected');
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

  try {
    const transport = nodemailer.createTransport(buildTransportOptions({
      hostOrIp: host,
      originalHost: host,
      port: 587,
      secure: false,
      user,
      pass
    }));

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
  const updatedCreds = getBinanceCredentials();

  res.json({
    success: true,
    settings: {
      ...newSettings,
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

  const { siteName, logoUrl, taglineBn, taglineEn } = req.body;
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
    ...(typeof taglineEn === 'string' ? { taglineEn: taglineEn.trim() } : {})
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
    badge: badge || 'অল্প দামে',
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    link: link || 'market',
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

// Categories
app.get('/api/store/categories', (req, res) => {
  const categories = getCategories();
  const activeCats = categories.filter((c) => c.active !== false);
  res.json({ categories: activeCats });
});

app.get('/api/admin/categories', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });
  res.json({ categories: getCategories() });
});

app.post('/api/admin/categories', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const { id, name, nameBn, icon, count, active } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });

  const categories = getCategories();
  const catId = (id || name.toLowerCase().replace(/[^a-z0-9]+/g, '_')).trim();
  const existingIdx = categories.findIndex((c) => c.id === catId);

  const catData = {
    id: catId,
    name: name.trim(),
    nameBn: (nameBn || name).trim(),
    icon: icon || 'folder',
    count: parseInt(count, 10) || 0,
    active: active !== false
  };

  if (existingIdx >= 0) {
    categories[existingIdx] = catData;
  } else {
    categories.push(catData);
  }

  saveCategories(categories);
  res.json({ success: true, category: catData, categories });
});

app.delete('/api/admin/categories/:id', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  let categories = getCategories();
  categories = categories.filter((c) => c.id !== req.params.id);
  saveCategories(categories);
  res.json({ success: true, categories });
});

// Store Items / Files
app.get('/api/store/items', (req, res) => {
  const items = getStoreItems();
  const { category, search, featured } = req.query;

  let filtered = items.filter((i) => i.active !== false);
  if (category && category !== 'all') {
    filtered = filtered.filter((i) => i.categoryId === category);
  }
  if (featured === 'true') {
    filtered = filtered.filter((i) => i.featured);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.titleBn && i.titleBn.toLowerCase().includes(q)) ||
        (i.description && i.description.toLowerCase().includes(q))
    );
  }

  res.json({ items: filtered });
});

// Serve uploaded store thumbnails
app.get('/api/store/thumbnails/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(STORE_THUMBNAILS_DIR, filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Thumbnail not found');
  }
});

// Admin direct file and thumbnail upload endpoint
app.post('/api/admin/upload-file', (req, res) => {
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

    const isImage = fileType === 'thumbnail' || fileType === 'image' || fileType === 'payment_qr' || fileType === 'site_logo' || fileType === 'logo' || /\.(png|jpe?g|webp|gif|svg|ico)$/i.test(fileName);
    if (isImage) {
      const storedFileName = `img_${timestamp}_${cleanName}`;
      const destPath = path.join(STORE_THUMBNAILS_DIR, storedFileName);
      fs.writeFileSync(destPath, buffer);

      // If it's a site logo, also mirror it to public/site-logo.png
      if (fileType === 'site_logo') {
        try {
          const publicLogo = path.join(process.cwd(), 'public', 'site-logo.png');
          fs.writeFileSync(publicLogo, buffer);
        } catch {}
      }

      return res.json({
        success: true,
        url: `/api/store/thumbnails/${storedFileName}`,
        storedFileName,
        originalFileName: fileName
      });
    } else {
      // product file / script / zip / rar / code
      const storedFileName = `product_${timestamp}_${cleanName}`;
      const destPath = path.join(STORE_UPLOADS_DIR, storedFileName);
      fs.writeFileSync(destPath, buffer);

      const bytes = buffer.length;
      let sizeFormatted = `${(bytes / 1024).toFixed(1)} KB`;
      if (bytes >= 1024 * 1024) {
        sizeFormatted = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      }

      return res.json({
        success: true,
        storedFileName,
        originalFileName: fileName,
        fileSizeFormatted: sizeFormatted
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'File upload failed' });
  }
});

app.get('/api/admin/store-items', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });
  res.json({ items: getStoreItems() });
});

app.post('/api/admin/store-items', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const {
    id,
    title,
    titleBn,
    categoryId,
    categoryName,
    priceBdt,
    priceUsd,
    rating,
    downloads,
    badge,
    imageUrl,
    description,
    planId,
    fileUrl,
    originalFileName,
    fileStorageName,
    fileSizeFormatted,
    featured,
    active
  } = req.body;

  if (!title) return res.status(400).json({ error: 'Item title is required' });

  const items = getStoreItems();
  const itemId = id || `item_${Date.now()}`;
  const existingIdx = items.findIndex((i) => i.id === itemId);

  const itemData = {
    id: itemId,
    title: title.trim(),
    titleBn: (titleBn || title).trim(),
    categoryId: categoryId || 'vip_file',
    categoryName: categoryName || 'VIP FILE',
    priceBdt: parseFloat(priceBdt) || 0,
    priceUsd: parseFloat(priceUsd) || 0,
    rating: typeof rating !== 'undefined' ? parseFloat(rating) : 5,
    downloads: parseInt(downloads, 10) || 0,
    badge: badge || 'সাশ্রয়ী দামে',
    imageUrl: imageUrl || '',
    description: description || '',
    planId: planId || '',
    fileUrl: fileUrl || '',
    originalFileName: originalFileName || (existingIdx >= 0 ? items[existingIdx].originalFileName : ''),
    fileStorageName: fileStorageName || (existingIdx >= 0 ? items[existingIdx].fileStorageName : ''),
    fileSizeFormatted: fileSizeFormatted || (existingIdx >= 0 ? items[existingIdx].fileSizeFormatted : ''),
    featured: Boolean(featured),
    active: active !== false,
    createdAt: items[existingIdx]?.createdAt || new Date().toISOString()
  };

  if (existingIdx >= 0) {
    items[existingIdx] = itemData;
  } else {
    items.push(itemData);
  }

  saveStoreItems(items);
  res.json({ success: true, item: itemData, items });
});

app.delete('/api/admin/store-items/:id', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  let items = getStoreItems();
  items = items.filter((i) => i.id !== req.params.id);
  saveStoreItems(items);
  res.json({ success: true, items });
});

// Buy Store Item with Wallet Balance
app.post('/api/store/items/:id/buy', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Please login to purchase files or plans' });

  const { currency } = req.body;
  const items = getStoreItems();
  const item = items.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const payCurrency = currency === 'BDT' ? 'BDT' : 'USD';
  const price = payCurrency === 'BDT' ? item.priceBdt : item.priceUsd;

  const accounts = getAccounts();
  const targetUser = accounts.find((a) => a.id === user.id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  targetUser.balanceBdt = typeof targetUser.balanceBdt === 'number' ? targetUser.balanceBdt : 0;
  targetUser.balanceUsd = typeof targetUser.balanceUsd === 'number' ? targetUser.balanceUsd : 0;

  if (payCurrency === 'USD') {
    if (targetUser.balanceUsd < price) {
      return res.status(400).json({
        error: `পর্যাপ্ত USD ব্যালেন্স নেই। প্রয়োজন: $${price} USD, বর্তমান: $${targetUser.balanceUsd.toFixed(2)} USD। ডিপোজিট করুন।`,
        needsDeposit: true,
        requiredAmount: price,
        currentBalance: targetUser.balanceUsd,
        currency: 'USD'
      });
    }
    targetUser.balanceUsd = parseFloat((targetUser.balanceUsd - price).toFixed(2));
  } else {
    if (targetUser.balanceBdt < price) {
      return res.status(400).json({
        error: `পর্যাপ্ত BDT ব্যালেন্স নেই। প্রয়োজন: ৳${price} BDT, বর্তমান: ৳${targetUser.balanceBdt.toFixed(2)} BDT। ডিপোজিট করুন।`,
        needsDeposit: true,
        requiredAmount: price,
        currentBalance: targetUser.balanceBdt,
        currency: 'BDT'
      });
    }
    targetUser.balanceBdt = parseFloat((targetUser.balanceBdt - price).toFixed(2));
  }

  // Increment item download / purchase count
  item.downloads = (item.downloads || 0) + 1;
  saveStoreItems(items);

  // Record user purchased items
  targetUser.purchasedItemIds = targetUser.purchasedItemIds || [];
  if (!targetUser.purchasedItemIds.includes(item.id)) {
    targetUser.purchasedItemIds.push(item.id);
  }
  targetUser.purchasedItems = targetUser.purchasedItems || [];
  targetUser.purchasedItems.push({
    itemId: item.id,
    title: item.title,
    titleBn: item.titleBn,
    priceBdt: item.priceBdt,
    priceUsd: item.priceUsd,
    fileUrl: item.fileUrl || '',
    purchasedAt: Date.now()
  });

  // If item corresponds to a hosting plan, activate it!
  if (item.planId) {
    const plans = getPlans();
    const matchedPlan = plans.find((p) => p.id === item.planId);
    if (matchedPlan) {
      const durationDays = matchedPlan.durationDays || 30;
      targetUser.plan = matchedPlan.id;
      targetUser.maxBots = matchedPlan.maxBots || 3;
      const currentExpiry = (targetUser.planExpiresAt && targetUser.planExpiresAt > Date.now()) ? targetUser.planExpiresAt : Date.now();
      targetUser.planExpiresAt = currentExpiry + durationDays * 24 * 60 * 60 * 1000;
    }
  }

  saveAccounts(accounts);

  // Send notification & email alert
  sendEmailAlert({
    to: targetUser.email,
    userId: targetUser.id,
    type: 'plan_purchased',
    subject: `🎉 সফল কেনাকাটা: ${item.titleBn || item.title}`,
    html: `<p>প্রিয় ${targetUser.name}, আপনি সফলভাবে <strong>${item.titleBn || item.title}</strong> ক্রয় করেছেন। ওয়ালেট থেকে ${price} ${payCurrency} কাটা হয়েছে।</p>`,
    text: `আপনি সফলভাবে ${item.titleBn || item.title} ক্রয় করেছেন।`
  });

  const downloadUrl = item.fileUrl || `/api/store/items/${item.id}/download`;

  res.json({
    success: true,
    message: `🎉 অভিনন্দন! "${item.titleBn || item.title}" সফলভাবে ক্রয় সম্পন্ন হয়েছে।`,
    user: enrichUserWithPlanAndRole(targetUser),
    item,
    downloadUrl
  });
});

// Authenticated Download Endpoint for Store Files
app.get('/api/store/items/:id/download', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1] || (req.query.token as string);
  let user: any = null;
  if (token) {
    try {
      if (token.startsWith('bt_')) {
        const payloadStr = Buffer.from(token.replace('bt_', ''), 'base64url').toString('utf-8');
        const payload = JSON.parse(payloadStr);
        const accounts = getAccounts();
        user = accounts.find((a) => a.id === payload.userId) || null;
      }
    } catch {}
  }

  const items = getStoreItems();
  const item = items.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).send('Item not found');

  const isAdmin = isUserAdmin(user);
  const hasPurchased = user && Array.isArray(user.purchasedItemIds) && user.purchasedItemIds.includes(item.id);

  if (!isAdmin && !hasPurchased) {
    return res.status(403).send('এই ফাইলটি ডাউনলোড করার আগে আপনাকে ক্রয় করতে হবে (Purchase required to download)');
  }

  // 1. If admin uploaded an actual file (zip, rar, py, json, etc.), stream it directly!
  if (item.fileStorageName) {
    const uploadedFilePath = path.join(STORE_UPLOADS_DIR, item.fileStorageName);
    if (fs.existsSync(uploadedFilePath)) {
      const clientFileName = item.originalFileName || `${(item.title || 'download').replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`;
      return res.download(uploadedFilePath, clientFileName);
    }
  }

  // 2. If external fileUrl is specified, redirect to it
  if (item.fileUrl && (item.fileUrl.startsWith('http://') || item.fileUrl.startsWith('https://'))) {
    return res.redirect(item.fileUrl);
  }

  // Provide a clean ready-to-use Telegram Bot / Mini App Source Code Bundle
  const safeFilename = (item.title || 'telegram_source_bundle').replace(/[^a-zA-Z0-9_-]/g, '_');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.py"`);
  res.setHeader('Content-Type', 'text/x-python; charset=utf-8');

  const sampleSourceCode = `# ========================================================
# ${item.title}
# Downloaded from App Store Premium Portal
# Customer: ${user?.name || 'Authorized Buyer'} (${user?.email || ''})
# Generated at: ${new Date().toISOString()}
# ========================================================

import os
import sys
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

logging.basicConfig(level=logging.INFO)

# Mini App Configuration
WEB_APP_URL = "https://ai.studio/build"

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_name = update.effective_user.first_name
    keyboard = [
        [InlineKeyboardButton("🚀 Open Mini App", web_app=WebAppInfo(url=WEB_APP_URL))],
        [InlineKeyboardButton("💰 Check Wallet Balance", callback_data="wallet")],
        [InlineKeyboardButton("💬 24/7 Support", url="https://t.me/toyoburrahman")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        f"👋 Welcome {user_name}! Your Telegram Mini App is ready to run.",
        reply_markup=reply_markup
    )

def main():
    token = os.getenv("BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
    app = ApplicationBuilder().token(token).build()
    app.add_handler(CommandHandler("start", start))
    print("🤖 Bot started successfully on 24/7 Cloud Host!")
    app.run_polling()

if __name__ == "__main__":
    main()
`;

  res.send(sampleSourceCode);
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
app.get('/api/wishlist', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.json({ items: [] });

  const map = getWishlistMap();
  const itemIds = map[user.id] || [];
  const allItems = getStoreItems();
  const wishlistItems = allItems.filter((i) => itemIds.includes(i.id));

  res.json({ itemIds, items: wishlistItems });
});

app.post('/api/wishlist/toggle', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Please login to save wishlist' });

  const { itemId } = req.body;
  if (!itemId) return res.status(400).json({ error: 'Item ID required' });

  const map = getWishlistMap();
  const list = map[user.id] || [];
  const idx = list.indexOf(itemId);

  let inWishlist = false;
  if (idx >= 0) {
    list.splice(idx, 1);
    inWishlist = false;
  } else {
    list.push(itemId);
    inWishlist = true;
  }

  map[user.id] = list;
  saveWishlistMap(map);

  res.json({ success: true, inWishlist, itemIds: list });
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
app.get('/api/bots', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    // Unauthenticated visitors do not see any user's hosted bots
    return res.json({ bots: [] });
  }

  const reg = getRegistry();
  // Admins see all bots, normal users ONLY see bots they own
  const userBots = isUserAdmin(user) ? reg : reg.filter((b) => canUserAccessBot(b, user));

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
  const { name, entryFile, token, files, zipBase64, autoStart } = req.body;
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

  // Handle uploaded files
  if (Array.isArray(files)) {
    for (const f of files) {
      if (f.name && (f.content !== undefined || f.base64)) {
        const filePath = path.join(botDir, f.name);
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
      execSync(`python3 -m zipfile -e "${zipPath}" "${botDir}"`);
      try { fs.unlinkSync(zipPath); } catch {}

      // If the zip contained a single enclosing directory (e.g. repo-main/bot.py), flatten it
      const currentItems = fs.readdirSync(botDir).filter((f) => f !== '_archive.zip');
      if (currentItems.length === 1) {
        const singleItemPath = path.join(botDir, currentItems[0]);
        if (fs.statSync(singleItemPath).isDirectory()) {
          const subItems = fs.readdirSync(singleItemPath);
          for (const sub of subItems) {
            const src = path.join(singleItemPath, sub);
            const dest = path.join(botDir, sub);
            if (!fs.existsSync(dest)) {
              fs.renameSync(src, dest);
            }
          }
          try { fs.rmdirSync(singleItemPath); } catch {}
        }
      }
    } catch (err: any) {
      appendLog(botId, 'error', `Zip extraction error: ${err.message}`);
    }
  }

  // Detect entry file if specified file doesn't exist
  let resolvedEntry = finalEntry;
  if (!fs.existsSync(path.join(botDir, resolvedEntry))) {
    if (fs.existsSync(path.join(botDir, 'bot.py'))) {
      resolvedEntry = 'bot.py';
    } else if (fs.existsSync(path.join(botDir, 'main.py'))) {
      resolvedEntry = 'main.py';
    } else {
      const allFiles = fs.readdirSync(botDir);
      const pyFile = allFiles.find((f) => f.endsWith('.py'));
      if (pyFile) {
        resolvedEntry = pyFile;
      }
    }
  }

  // Ensure entry file exists
  const entryPath = path.join(botDir, resolvedEntry);
  if (!fs.existsSync(entryPath)) {
    fs.writeFileSync(
      entryPath,
      `# Telegram Bot: ${name}\nimport os\nprint("Bot started: ${name}")\n`,
      'utf-8'
    );
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

  res.json({ success: true, bot: newBot });
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
app.get('/api/bots/:id/files', (req, res) => {
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

app.get('/api/bots/:id/file', (req, res) => {
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
      const p = path.join(botDir, path.basename(f.name));
      if (f.content !== undefined) {
        fs.writeFileSync(p, f.content, 'utf-8');
      } else if (f.base64) {
        fs.writeFileSync(p, Buffer.from(f.base64, 'base64'));
      }
    }
  }

  appendLog(id, 'info', `Uploaded ${files.length} files.`);
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
      execSync(`python3 -m zipfile -e "${tempZipPath}" "${tempExtractDir}"`);
      try { fs.unlinkSync(tempZipPath); } catch {}

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

  // 4. Auto-connect and initialize database files if missing
  if (autoConnectDatabase) {
    for (const dbFile of PROTECTED_DB_FILES) {
      const p = path.join(botDir, dbFile);
      if (!fs.existsSync(p)) {
        fs.writeFileSync(p, dbFile === 'activity_logs.json' ? '[]' : '{}', 'utf-8');
      }
    }
  }

  // 5. Read protected user stats
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

// Google AdMob & AdSense verification routes (app-ads.txt & ads.txt)
app.get(['/app-ads.txt', '/ads.txt'], (req, res) => {
  const settings = getRewardAdSettings();
  const rawId = settings.appId || settings.adUnitId || 'ca-app-pub-2943337025131771~1508810719';
  const match = rawId.match(/pub-\d{16}/);
  const pubId = match ? match[0] : 'pub-2943337025131771';
  res.type('text/plain');
  res.send(`google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`);
});

// ExoClick Site Ownership Verification routes (.html, .txt, and bare path)
app.get(
  [
    '/b7642159c47d7c756e6ebb61ef9767d2.html',
    '/b7642159c47d7c756e6ebb61ef9767d2.txt',
    '/b7642159c47d7c756e6ebb61ef9767d2'
  ],
  (req, res) => {
    res.type(req.path.endsWith('.html') ? 'text/html' : 'text/plain');
    res.send('b7642159c47d7c756e6ebb61ef9767d2');
  }
);

// ExoClick VAST XML Resolver & Proxy (handles Client Hints forwarding, Wrapper chains, and MediaFile extraction)
function extractCdataOrText(xmlChunk: string): string {
  const cdataMatch = xmlChunk.match(/<!\[CDATA\[([\s\S]*?)\]\]>/i);
  if (cdataMatch && cdataMatch[1]) {
    return cdataMatch[1].trim();
  }
  return xmlChunk.replace(/<[^>]+>/g, '').trim();
}

function parseVastXmlString(xml: string) {
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

  const clickTrackingUrls: string[] = [];
  const clickTrackRegex = /<ClickTracking[^>]*>([\s\S]*?)<\/ClickTracking>/gi;
  while ((match = clickTrackRegex.exec(xml)) !== null) {
    const url = extractCdataOrText(match[1]);
    if (url.startsWith('http')) clickTrackingUrls.push(url);
  }

  const trackingEvents: Record<string, string[]> = {};
  const trackRegex = /<Tracking[^>]*event=["']([^"']+)["'][^>]*>([\s\S]*?)<\/Tracking>/gi;
  while ((match = trackRegex.exec(xml)) !== null) {
    const eventName = match[1].trim();
    const url = extractCdataOrText(match[2]);
    if (url.startsWith('http')) {
      if (!trackingEvents[eventName]) trackingEvents[eventName] = [];
      trackingEvents[eventName].push(url);
    }
  }

  return {
    wrapperUrl,
    mediaFileUrl: mediaFiles[0]?.url || '',
    clickThroughUrl,
    impressionUrls,
    clickTrackingUrls,
    trackingEvents
  };
}

app.get('/api/ads/vast-resolve', async (req, res) => {
  try {
    const settings = getRewardAdSettings();
    const requestedUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    const candidateUrls = Array.from(
      new Set(
        [
          requestedUrl,
          ...(settings.vastTagUrls || []),
          settings.vastTagUrl || '',
          'https://s.magsrv.com/v1/vast.php?idzone=6042506',
          'https://s.magsrv.com/v1/vast.php?idz=6042500',
          'https://s.magsrv.com/v1/vast.php?idzone=6042500'
        ].filter((u) => u && u.startsWith('http'))
      )
    );

    const forwardHeaders: Record<string, string> = {
      'User-Agent': (req.headers['user-agent'] as string) || 'Mozilla/5.0',
      Accept: 'application/xml, text/xml, */*;q=0.8',
      'Accept-Language': (req.headers['accept-language'] as string) || 'en-US,en;q=0.9',
      Referer: (req.headers['referer'] as string) || `https://${req.headers.host || 'localhost'}/`
    };

    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '';
    if (clientIp) {
      forwardHeaders['X-Forwarded-For'] = clientIp;
    }

    const chHeaders = [
      'sec-ch-ua',
      'sec-ch-ua-mobile',
      'sec-ch-ua-arch',
      'sec-ch-ua-model',
      'sec-ch-ua-platform',
      'sec-ch-ua-platform-version',
      'sec-ch-ua-bitness',
      'sec-ch-ua-full-version-list',
      'sec-ch-ua-full-version'
    ];
    for (const h of chHeaders) {
      if (typeof req.headers[h] === 'string') {
        forwardHeaders[h] = req.headers[h] as string;
      }
    }

    for (const baseVastUrl of candidateUrls) {
      let currentVastUrl = baseVastUrl;
      const aggregatedImpressions: string[] = [];
      const aggregatedClickTracking: string[] = [];
      const aggregatedEvents: Record<string, string[]> = {};

      for (let depth = 0; depth < 3; depth++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
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
            return res.json({
              success: true,
              resolvedFrom: baseVastUrl,
              mediaFileUrl: parsed.mediaFileUrl,
              clickThroughUrl: parsed.clickThroughUrl || settings.adRedirectUrl || '',
              impressionUrls: aggregatedImpressions,
              clickTrackingUrls: aggregatedClickTracking,
              trackingEvents: aggregatedEvents
            });
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

    res.json({
      success: false,
      fallbackVideoUrl: settings.videoUrl,
      fallbackClickUrl: settings.adRedirectUrl
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bot-Host server running on http://0.0.0.0:${PORT}`);
    // Start Firebase Cloud Sync for user accounts & balances
    FirebaseSync.initSync(getAccounts, saveAccounts).catch((err) => {
      console.warn('Firebase initial sync warning:', err);
    });
    // Start Cloud SMTP Relay Worker to dispatch any emails queued over HTTPS Port 443
    startCloudSmtpRelayWorker();
  });
}

start();
