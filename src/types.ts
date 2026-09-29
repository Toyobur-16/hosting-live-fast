export interface StoreBanner {
  id: string;
  title: string;
  titleBn?: string;
  subtitle: string;
  subtitleBn?: string;
  badge?: string;
  imageUrl: string;
  link?: string;
  active: boolean;
  order?: number;
}

export interface StoreCategory {
  id: string;
  name: string;
  nameBn?: string;
  icon: string;
  count?: number;
  active: boolean;
}

export interface StoreItem {
  id: string;
  title: string;
  titleBn?: string;
  categoryId: string;
  categoryName?: string;
  priceBdt: number;
  priceUsd: number;
  rating: number;
  downloads: number;
  badge?: string;
  imageUrl: string;
  description?: string;
  planId?: string;
  fileUrl?: string;
  originalFileName?: string;
  fileStorageName?: string;
  fileSizeFormatted?: string;
  featured?: boolean;
  active: boolean;
  createdAt?: string;
}

export interface SupportSettings {
  email: string;
  whatsapp: string;
  telegram: string;
  workingHours?: string;
  noticeBn?: string;
  noticeEn?: string;
}

export interface SupportMessage {
  id: string;
  userId?: string;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  status: 'pending' | 'resolved' | 'replied';
  reply?: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  phoneVerified?: boolean;
  role?: 'admin' | 'user';
  plan?: string;
  planExpiresAt?: number | null;
  maxBots?: number;
  balanceBdt?: number;
  balanceUsd?: number;
  purchasedItemIds?: string[];
  purchasedItems?: Array<{
    itemId: string;
    title: string;
    fileUrl?: string;
    purchasedAt: number;
  }>;
  emailVerified?: boolean;
  maxWebsites?: number;
  maxStorageMb?: number;
  avatar?: string;
  isVerified?: boolean;
  verificationToken?: string;
  hasClaimedFreeTrial?: boolean;
  hasClaimedFreePlan?: boolean;
  freeTrialClaimedAt?: string;
  createdAt: string;
}

export interface FreeTrialSettings {
  enabled: boolean;
  durationDays: number;
  maxBots: number;
  maxWebsites?: number;
  nameBn?: string;
  nameEn?: string;
  featuresBn?: string[];
  featuresEn?: string[];
  titleBn?: string;
  titleEn?: string;
  descriptionBn?: string;
  descriptionEn?: string;
}

export interface HostingPlan {
  id: string;
  nameBn: string;
  nameEn: string;
  durationDays: number;
  maxBots: number;
  maxWebsites?: number;
  maxStorageMb?: number;
  priceBdt: number;
  priceUsd: number;
  popular?: boolean;
  isFreeTrial?: boolean;
  featuresBn: string[];
  featuresEn: string[];
}

export interface WalletTransaction {
  id: string;
  userId: string;
  userEmail: string;
  type: 'deposit' | 'ad_reward' | 'plan_purchase' | 'refund' | 'admin_adjustment' | 'hosting_payment' | 'task_reward';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed' | 'rejected';
  source: string;
  referenceId?: string;
}

export interface RewardAdSettings {
  enabled: boolean;
  rewardAmountUsd: number;
  dailyLimit: number;
  cooldownSeconds: number;
  adProvider:
    | 'monetag'
    | 'adsterra'
    | 'exoclick'
    | 'adsgram'
    | 'hilltopads'
    | 'richads'
    | 'admob'
    | 'adsense'
    | 'unity'
    | 'applovin'
    | 'google_ad_manager'
    | 'custom_network'
    | 'custom';
  appId?: string;
  adUnitId?: string;
  adsterraWebsiteId?: string;
  vastTagUrl?: string;
  vastTagUrls?: string[];
  videoUrl?: string;
  adRedirectUrl?: string;
  adScriptHtml?: string;
  minDurationSeconds?: number;
  testMode?: boolean;
}

export interface AdRewardStats {
  adsWatchedToday: number;
  dailyLimit: number;
  remainingToday: number;
  todayEarningsUsd: number;
  totalEarningsUsd: number;
  walletBalanceUsd: number;
  nextAvailableAt?: number;
  cooldownSeconds: number;
  rewardPerAd: number;
  adsEnabled: boolean;
  adProvider?: string;
  appId?: string;
  adUnitId?: string;
  adsterraWebsiteId?: string;
  vastTagUrl?: string;
  vastTagUrls?: string[];
  adScriptHtml?: string;
  videoUrl?: string;
  adRedirectUrl?: string;
  minDurationSeconds?: number;
}

export interface HostedWebsite {
  id: string;
  userId: string;
  userEmail: string;
  name: string;
  slug: string;
  aliases?: string[];
  subdomainUrl: string;
  directUrl: string;
  liveUrl?: string;
  status: 'online' | 'stopped' | 'suspended';
  storageBytes: number;
  filesCount: number;
  hasIndexHtml: boolean;
  createdAt: string;
  updatedAt: string;
  lastDeployedAt: string;
}

export interface WebsiteSettings {
  maxWebsitesPerUser: number;
  maxStorageMb: number;
  maxFileSizeMb: number;
  baseDomain: string;
  allowedExtensions: string[];
}

export interface DepositRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  currency: 'USD' | 'BDT';
  method: 'binance' | 'bkash' | 'nagad' | 'rocket' | string;
  senderIdentifier: string;
  transactionId: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectReason?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface UserNotification {
  id: string;
  userId: string;
  type: 'deposit_approved' | 'deposit_rejected' | 'plan_expiring' | 'plan_expired' | 'plan_purchased' | 'system';
  title: string;
  message: string;
  createdAt: string;
  read?: boolean;
}

export interface PlanRequest {
  id: string;
  type?: 'plan_purchase' | 'deposit';
  userId: string;
  userName: string;
  userEmail: string;
  planId: string;
  planName: string;
  durationDays: number;
  amount: number;
  currency: string;
  method: string;
  senderNumber: string;
  senderIdentifier?: string;
  transactionId: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface CryptoNetworkItem {
  id: string;
  name: string; // e.g. "Binance Pay / UID" or "USDT (BEP-20)" or "USDT (TRC-20)"
  networkKey: string; // 'binance_pay' | 'bep20' | 'trc20' | 'polygon' | 'solana' | 'ton' | 'erc20' | string
  networkLabel: string; // 'BNB Smart Chain (BEP-20)' | 'Tron (TRC-20)'
  addressOrId: string; // address or ID
  memoOrTag?: string; // Optional deposit memo / tag
  qrImageUrl?: string;
  instructionsBn?: string;
  instructionsEn?: string;
  enabled: boolean;
}

export interface DepositMethodItem {
  id: string;
  name: string;
  subtitle: string;
  category: 'mfs' | 'crypto' | 'custom';
  currency: 'USDT' | 'USD' | 'BDT';
  accountValue: string;
  accountLabel: string;
  memoOrTag?: string;
  instructions: string;
  logoType: 'bkash' | 'nagad' | 'binance' | 'bep20' | 'trc20' | 'polygon' | 'ton' | 'custom';
  logoUrl?: string;
  qrImageUrl?: string;
  enabled: boolean;
  rateToBdt?: number;
  color?: string;
}

export const DEFAULT_DEPOSIT_METHODS: DepositMethodItem[] = [
  {
    id: 'bkash',
    name: 'bKash',
    subtitle: 'Send Money',
    category: 'mfs',
    currency: 'BDT',
    accountValue: '01614572747',
    accountLabel: 'বিকাশ পার্সোনাল নম্বর (Send Money):',
    instructions: 'বিকাশ পার্সোনাল নাম্বারে Send Money করুন। টাকা পাঠানো শেষে TrxID ও যে নাম্বার থেকে পাঠিয়েছেন তা নিচে লিখে কনফার্ম করুন।',
    logoType: 'bkash',
    enabled: true,
    rateToBdt: 120,
    color: '#E2136E'
  },
  {
    id: 'nagad',
    name: 'Nagad',
    subtitle: 'Send Money',
    category: 'mfs',
    currency: 'BDT',
    accountValue: '01304104492',
    accountLabel: 'নগদ পার্সোনাল নম্বর (Send Money):',
    instructions: 'নগদ পার্সোনাল নাম্বারে Send Money করুন। টাকা পাঠানো শেষে TrxID ও যে নাম্বার থেকে পাঠিয়েছেন তা নিচে লিখে কনফার্ম করুন।',
    logoType: 'nagad',
    enabled: true,
    rateToBdt: 120,
    color: '#F15A24'
  },
  {
    id: 'binance_pay',
    name: 'Binance Pay / UID',
    subtitle: 'BINANCE_PAY',
    category: 'crypto',
    currency: 'USDT',
    accountValue: '922593999',
    accountLabel: 'Binance Pay ID / UID:',
    instructions: 'Binance Pay ID / UID তে ডলার সেন্ড করুন (০% ফি ও তাৎক্ষণিক)। পেমেন্ট শেষ হলে Binance Order ID / Trx ID দিন।',
    logoType: 'binance',
    enabled: true,
    color: '#F3BA2F'
  },
  {
    id: 'usdt_bep20',
    name: 'USDT (BEP-20)',
    subtitle: 'BEP20',
    category: 'crypto',
    currency: 'USDT',
    accountValue: '0xadf20566382613a481f39f62cd50b872314db1d3',
    accountLabel: 'BNB Smart Chain (BEP-20) ওয়ালেট এড্রেস:',
    instructions: 'শুধুমাত্র BNB Smart Chain (BEP-20) নেটওয়ার্কে USDT সেন্ড করবেন। পেমেন্ট শেষ হলে ট্রানজেকশন হ্যাশ (TxID) নিচে দিন।',
    logoType: 'bep20',
    enabled: true,
    color: '#F59E0B'
  },
  {
    id: 'usdt_trc20',
    name: 'USDT (TRC-20)',
    subtitle: 'TRC20',
    category: 'crypto',
    currency: 'USDT',
    accountValue: 'TX7aA8b9qZ4eR2p3u5v6w7x8y9z0a1b2c3',
    accountLabel: 'Tron (TRC-20) ওয়ালেট এড্রেস:',
    instructions: 'শুধুমাত্র Tron (TRC-20) নেটওয়ার্কে USDT সেন্ড করবেন। পেমেন্ট সম্পন্ন হলে ট্রানজেকশন হ্যাশ (TxID) নিচে দিন।',
    logoType: 'trc20',
    enabled: true,
    color: '#EF4444'
  }
];

export interface CustomDepositMethod {
  id: string;
  name: string;
  type: string;
  account: string;
  network?: string;
  imageUrl?: string;
  qrImageUrl?: string;
  instructions?: string;
  currency?: 'BDT' | 'USD';
  enabled: boolean;
}

export interface PaymentSettings {
  binanceUid?: string;
  binancePayId?: string;
  binanceId?: string;
  binanceBscAddress?: string;
  binanceTrcAddress?: string;
  binanceEnabled?: boolean;
  binanceDeleted?: boolean;
  binancePayApiEnabled?: boolean;
  binancePayApiKey?: string;
  binancePaySecretKey?: string;
  binancePayMerchantId?: string;
  hasBinanceCredentials?: boolean;
  binanceQrUrl?: string;
  cryptoNetworks?: CryptoNetworkItem[];
  bkashNumber?: string;
  bkashEnabled?: boolean;
  bkashQrUrl?: string;
  bkashLogoUrl?: string;
  bkashDeleted?: boolean;
  nagadNumber?: string;
  nagadEnabled?: boolean;
  nagadQrUrl?: string;
  nagadLogoUrl?: string;
  nagadDeleted?: boolean;
  rocketNumber?: string;
  rocketEnabled?: boolean;
  rocketDeleted?: boolean;
  rocketQrUrl?: string;
  customMethods?: CustomDepositMethod[];
  depositMethods?: DepositMethodItem[];
  instructionsBn?: string;
  instructionsEn?: string;
}

export interface BinancePayOrder {
  orderId: string;
  merchantTradeNo: string;
  prepayId?: string;
  checkoutUrl?: string;
  deeplink?: string;
  qrcodeLink?: string;
  qrContent?: string;
  amount: number;
  currency: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELED' | 'PROCESSING';
  createdAt: string;
  paidAt?: string;
  isDirectMode?: boolean;
  binancePayId?: string;
  ipNotice?: string | null;
}

export interface SiteSettings {
  siteName: string;
  logoUrl?: string;
  taglineBn?: string;
  taglineEn?: string;
  hostingVideoUrl?: string;
  websiteVideoUrl?: string;
}

export interface HostedBot {
  id: string;
  name: string;
  entryFile: string;
  owner?: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  dirName?: string;
  token?: string;
  botUsername?: string;
  status: 'running' | 'stopped' | 'starting' | 'error';
  pid: number | null;
  uptimeSeconds?: number;
  uptime?: string;
  startTime?: string | null;
  createdAt?: string;
  created?: string;
  autoRestart: boolean;
  fileCount?: number;
  error?: string;
  env?: Record<string, string>;
  currentVersion?: string;
  deploymentCount?: number;
  lastPing?: string;
}

export interface DeploymentRecord {
  id: string;
  botId: string;
  version: string;
  timestamp: string;
  trigger: 'initial_deploy' | 'code_update' | 'file_upload' | 'zip_upload' | 'safe_update' | 'manual_deploy' | 'restart' | string;
  status: 'active' | 'success' | 'failed';
  entryFile?: string;
  description?: string;
  deployedBy?: string;
  filesCount?: number;
  commitHash?: string;
}

export interface BotBackupFile {
  name: string;
  size: number;
  modified?: string;
}

export interface BotBackupRecord {
  id: string;
  botId: string;
  botName: string;
  timestamp: string;
  trigger: 'auto_24h' | 'manual';
  filesCount: number;
  totalSizeBytes: number;
  zipFileName?: string;
  files: BotBackupFile[];
  description: string;
  status: 'completed' | 'failed';
  restoredAt?: string;
}

export interface BotStatus {
  status: 'running' | 'stopped' | 'starting' | 'error';
  pid: number | null;
  uptimeSeconds: number;
  startTime: string | null;
  pythonVersion: string;
  botInfo?: {
    ok: boolean;
    username?: string;
    firstName?: string;
    id?: number;
    error?: string;
  };
  logSummary: {
    totalLogs: number;
    lastLogTime: string | null;
  };
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'otp' | 'system';
  message: string;
}

export interface ServiceRange {
  range: string;
  country: string;
}

export interface ServiceItem {
  sid: string;
  ranges: ServiceRange[];
}

export interface UserRecord {
  user_id: string;
  username?: string;
  full_name?: string;
  balance: number;
  total_numbers?: number;
  referral_count?: number;
  created_at?: string;
  is_banned?: boolean;
}

export interface WithdrawRecord {
  payment_id: string;
  user_id: string | number;
  method: string;
  amount: number;
  number: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
}

export interface OtpRecord {
  id: string;
  number: string;
  otp: string;
  service?: string;
  country?: string;
  full_sms?: string;
  timestamp: string;
}

export type SocialPlatform =
  | 'telegram'
  | 'youtube'
  | 'facebook'
  | 'instagram'
  | 'twitter'
  | 'tiktok'
  | 'website'
  | 'discord'
  | 'custom';

export interface SocialTask {
  id: string;
  platform: SocialPlatform;
  title: string;
  titleBn?: string;
  description: string;
  descriptionBn?: string;
  link: string;
  rewardUsd: number;
  badgeText?: string;
  timerSeconds?: number;
  requiresProof?: boolean;
  enabled: boolean;
  order: number;
  totalCompletions: number;
  createdAt: string;
  completed?: boolean;
}

export interface TaskCompletionLog {
  id: string;
  taskId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  platform: SocialPlatform;
  taskTitle: string;
  rewardUsd: number;
  completedAt: string;
  proofNote?: string;
}
