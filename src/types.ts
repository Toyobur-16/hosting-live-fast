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
  type: 'deposit' | 'ad_reward' | 'plan_purchase' | 'refund' | 'admin_adjustment' | 'hosting_payment';
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
  adProvider: 'custom_network' | 'admob' | 'adsense' | 'unity' | 'applovin';
  adUnitId?: string;
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

export interface CustomDepositMethod {
  id: string;
  name: string;
  type: string;
  account: string;
  imageUrl?: string;
  instructions?: string;
  enabled: boolean;
}

export interface PaymentSettings {
  binanceUid?: string;
  binancePayId?: string;
  binanceId: string;
  binanceBscAddress?: string;
  binanceEnabled?: boolean;
  binancePayApiEnabled?: boolean;
  binancePayApiKey?: string;
  binancePaySecretKey?: string;
  binancePayMerchantId?: string;
  hasBinanceCredentials?: boolean;
  binanceQrUrl?: string;
  bkashNumber: string;
  bkashEnabled?: boolean;
  bkashQrUrl?: string;
  bkashLogoUrl?: string;
  nagadNumber: string;
  nagadEnabled?: boolean;
  nagadQrUrl?: string;
  nagadLogoUrl?: string;
  rocketNumber?: string;
  rocketEnabled?: boolean;
  rocketQrUrl?: string;
  customMethods?: CustomDepositMethod[];
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
