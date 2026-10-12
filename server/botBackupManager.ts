import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import AdmZip from 'adm-zip';
import { UserAutoBackupSettings, UserStorageStats } from '../src/types';

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
  encrypted?: boolean;
  algorithm?: string;
  userId?: string;
  savedInAccountStorage?: boolean;
  isCustomPassword?: boolean;
}

const HOSTED_BOTS_DIR = path.join(process.cwd(), 'hosted_bots');
const BOT_BACKUPS_BASE_DIR = path.join(HOSTED_BOTS_DIR, 'bot_backups');
const USER_BACKUP_CONFIGS_FILE = path.join(HOSTED_BOTS_DIR, 'user_backup_configs.json');

const EXCLUDED_FILES = new Set([
  'bot.log',
  'deployments.json',
  '.backups',
  '__pycache__',
  '.git',
  '.DS_Store',
  'node_modules'
]);

const DEFAULT_BACKUP_SECRET = process.env.VERIFICATION_SECRET || 'hlf_auto_backup_aes256_key_2026';

function deriveKey(password?: string): { key: Buffer; salt: Buffer } {
  const secret = password && password.trim() ? password.trim() : DEFAULT_BACKUP_SECRET;
  const salt = Buffer.from('hlf_backup_salt_vector_v1');
  const key = crypto.scryptSync(secret, salt, 32);
  return { key, salt };
}

function encryptBuffer(data: Buffer, password?: string): Buffer {
  const { key } = deriveKey(password);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([iv, encrypted]);
}

function decryptBuffer(encryptedData: Buffer, password?: string): Buffer {
  if (encryptedData.length < 17) {
    throw new Error('Invalid encrypted backup payload: payload too short');
  }
  const { key } = deriveKey(password);
  const iv = encryptedData.subarray(0, 16);
  const ciphertext = encryptedData.subarray(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function getBotBackupsDir(botId: string): string {
  const dir = path.join(BOT_BACKUPS_BASE_DIR, botId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getBotBackupsMetaFile(botId: string): string {
  return path.join(getBotBackupsDir(botId), 'backups.json');
}

export function getBotBackups(botId: string): BotBackupRecord[] {
  const metaFile = getBotBackupsMetaFile(botId);
  if (!fs.existsSync(metaFile)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(metaFile, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveBotBackups(botId: string, backups: BotBackupRecord[]): void {
  const metaFile = getBotBackupsMetaFile(botId);
  fs.writeFileSync(metaFile, JSON.stringify(backups, null, 2), 'utf-8');
}

export function getBotBackupById(botId: string, backupId: string): BotBackupRecord | null {
  const backups = getBotBackups(botId);
  return backups.find((b) => b.id === backupId) || null;
}

export function getBotBackupZipPath(botId: string, backupId: string, _userId?: string): string | null {
  const backup = getBotBackupById(botId, backupId);
  const botDir = getBotBackupsDir(botId);
  if (backup?.zipFileName) {
    const p = path.join(botDir, backup.zipFileName);
    if (fs.existsSync(p)) return p;
  }
  const candidateEnc = path.join(botDir, `${backupId}.enc.zip`);
  if (fs.existsSync(candidateEnc)) return candidateEnc;
  const candidateZip = path.join(botDir, `${backupId}.zip`);
  if (fs.existsSync(candidateZip)) return candidateZip;
  return null;
}

function getAllBotFiles(dir: string, baseDir: string = dir): { relativePath: string; fullPath: string; size: number; mtime: Date }[] {
  if (!fs.existsSync(dir)) return [];
  const results: { relativePath: string; fullPath: string; size: number; mtime: Date }[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (EXCLUDED_FILES.has(entry.name) || entry.name.startsWith('.bak_')) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      results.push(...getAllBotFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      try {
        const stat = fs.statSync(fullPath);
        results.push({
          relativePath: relPath,
          fullPath,
          size: stat.size,
          mtime: stat.mtime
        });
      } catch {}
    }
  }

  return results;
}

export function createBotBackup(
  bot: any,
  trigger: 'auto_24h' | 'manual',
  description?: string,
  options?: {
    encrypted?: boolean;
    password?: string;
    userId?: string;
    saveToAccountStorage?: boolean;
  }
): BotBackupRecord {
  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  if (!fs.existsSync(botDir)) {
    fs.mkdirSync(botDir, { recursive: true });
    // If no entry file, create a default bot.py
    const defaultEntry = path.join(botDir, bot.entryFile || 'bot.py');
    if (!fs.existsSync(defaultEntry)) {
      fs.writeFileSync(defaultEntry, '# Telegram Bot workspace\nprint("Bot ready")\n', 'utf-8');
    }
  }

  const files = getAllBotFiles(botDir);
  const zip = new AdmZip();

  const fileSummaries: BotBackupFile[] = [];
  for (const f of files) {
    const parentRel = path.dirname(f.relativePath);
    const zipDest = parentRel === '.' ? '' : parentRel;
    try {
      zip.addLocalFile(f.fullPath, zipDest);
      fileSummaries.push({
        name: f.relativePath,
        size: f.size,
        modified: f.mtime.toISOString()
      });
    } catch (zipErr) {
      console.warn(`[BotBackupManager] Could not add file to zip: ${f.relativePath}`, zipErr);
    }
  }

  const backupId = `bak_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const isEncrypted = Boolean(options?.encrypted);
  const zipFileName = isEncrypted ? `${backupId}.enc.zip` : `${backupId}.zip`;
  const botBackupsDir = getBotBackupsDir(bot.id);
  const zipFilePath = path.join(botBackupsDir, zipFileName);

  const zipBuffer = zip.toBuffer();
  if (isEncrypted) {
    const encData = encryptBuffer(zipBuffer, options?.password);
    fs.writeFileSync(zipFilePath, encData);
  } else {
    fs.writeFileSync(zipFilePath, zipBuffer);
  }

  let zipSize = 0;
  try {
    zipSize = fs.statSync(zipFilePath).size;
  } catch {
    zipSize = fileSummaries.reduce((acc, cur) => acc + cur.size, 0);
  }

  const newBackup: BotBackupRecord = {
    id: backupId,
    botId: bot.id,
    botName: bot.name,
    timestamp: new Date().toISOString(),
    trigger,
    filesCount: fileSummaries.length,
    totalSizeBytes: zipSize,
    zipFileName,
    files: fileSummaries,
    description: description || (trigger === 'auto_24h' ? 'Automatic 24-Hour Backup' : 'Manual File Snapshot'),
    status: 'completed',
    encrypted: isEncrypted,
    algorithm: isEncrypted ? 'aes-256-cbc' : undefined,
    userId: options?.userId || bot.ownerId || bot.owner,
    savedInAccountStorage: options?.saveToAccountStorage !== false,
    isCustomPassword: Boolean(options?.password)
  };

  const currentBackups = getBotBackups(bot.id);
  currentBackups.unshift(newBackup);

  // Retain up to 30 backups per bot, prune older ones
  if (currentBackups.length > 30) {
    const toRemove = currentBackups.splice(30);
    for (const old of toRemove) {
      try {
        const oldZip = path.join(botBackupsDir, old.zipFileName || `${old.id}.zip`);
        if (fs.existsSync(oldZip)) {
          fs.unlinkSync(oldZip);
        }
      } catch {}
    }
  }

  saveBotBackups(bot.id, currentBackups);
  return newBackup;
}

export function restoreBotBackup(
  bot: any,
  backupId: string,
  options?: { password?: string; userId?: string }
): { success: boolean; backup: BotBackupRecord; restoredFilesCount: number } {
  const botBackupsDir = getBotBackupsDir(bot.id);
  const backups = getBotBackups(bot.id);
  const targetIndex = backups.findIndex((b) => b.id === backupId);

  if (targetIndex === -1) {
    throw new Error('Backup snapshot record not found');
  }

  const target = backups[targetIndex];
  const zipPath = getBotBackupZipPath(bot.id, backupId, options?.userId) || path.join(botBackupsDir, target.zipFileName || `${backupId}.zip`);

  if (!fs.existsSync(zipPath)) {
    throw new Error('Backup archive .zip file not found on disk');
  }

  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  if (!fs.existsSync(botDir)) {
    fs.mkdirSync(botDir, { recursive: true });
  }

  const isEncrypted = Boolean(target.encrypted) || zipPath.endsWith('.enc.zip') || zipPath.endsWith('.enc');

  let zip: AdmZip;
  if (isEncrypted) {
    try {
      const encryptedData = fs.readFileSync(zipPath);
      const decrypted = decryptBuffer(encryptedData, options?.password);
      zip = new AdmZip(decrypted);
    } catch (err: any) {
      throw new Error('পাসওয়ার্ড ভুল অথবা এনক্রিপ্টেড ব্যাকআপ ডিক্রিপশন ব্যর্থ হয়েছে (Decryption failed - incorrect password or corrupt backup)');
    }
  } else {
    zip = new AdmZip(zipPath);
  }

  // Extract all files from backup archive, overwriting workspace files
  zip.extractAllTo(botDir, true);

  // Mark restoredAt timestamp on backup record
  target.restoredAt = new Date().toISOString();
  backups[targetIndex] = target;
  saveBotBackups(bot.id, backups);

  return {
    success: true,
    backup: target,
    restoredFilesCount: target.filesCount
  };
}

export function deleteBotBackup(botId: string, backupId: string, _userId?: string): boolean {
  const botBackupsDir = getBotBackupsDir(botId);
  const backups = getBotBackups(botId);
  const target = backups.find((b) => b.id === backupId);

  if (!target) return false;

  const remaining = backups.filter((b) => b.id !== backupId);
  saveBotBackups(botId, remaining);

  try {
    const zipPath = path.join(botBackupsDir, target.zipFileName || `${backupId}.zip`);
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    const encPath = path.join(botBackupsDir, `${backupId}.enc.zip`);
    if (fs.existsSync(encPath)) {
      fs.unlinkSync(encPath);
    }
  } catch {}

  return true;
}

export function getBotBackupStats(botId: string): {
  totalBackups: number;
  lastBackupTime: string | null;
  lastAutoBackupTime: string | null;
  nextScheduledAutoBackup: string | null;
  totalSizeBytes: number;
} {
  const backups = getBotBackups(botId);
  const autoBackups = backups.filter((b) => b.trigger === 'auto_24h');
  const latestBackup = backups[0] || null;
  const latestAuto = autoBackups[0] || null;

  let nextScheduledAutoBackup: string | null = null;
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  if (latestAuto) {
    const nextTime = new Date(latestAuto.timestamp).getTime() + TWENTY_FOUR_HOURS;
    nextScheduledAutoBackup = new Date(nextTime).toISOString();
  } else {
    nextScheduledAutoBackup = new Date().toISOString();
  }

  const totalSizeBytes = backups.reduce((acc, b) => acc + (b.totalSizeBytes || 0), 0);

  return {
    totalBackups: backups.length,
    lastBackupTime: latestBackup?.timestamp || null,
    lastAutoBackupTime: latestAuto?.timestamp || null,
    nextScheduledAutoBackup,
    totalSizeBytes
  };
}

export function getUserAutoBackupConfig(userId: string): UserAutoBackupSettings {
  const defaults: UserAutoBackupSettings = {
    enabled: true,
    schedule: 'daily',
    encryptionEnabled: true,
    hasCustomPassword: false,
    maxBackupsToKeep: 15,
    saveToAccountStorage: true
  };
  try {
    if (fs.existsSync(USER_BACKUP_CONFIGS_FILE)) {
      const all = JSON.parse(fs.readFileSync(USER_BACKUP_CONFIGS_FILE, 'utf-8'));
      if (all && all[userId]) {
        return {
          ...defaults,
          ...all[userId],
          hasCustomPassword: Boolean(all[userId].customPassword)
        };
      }
    }
  } catch {}
  return defaults;
}

export function saveUserAutoBackupConfig(
  userId: string,
  updates: Partial<UserAutoBackupSettings>
): UserAutoBackupSettings {
  let all: Record<string, any> = {};
  try {
    if (fs.existsSync(USER_BACKUP_CONFIGS_FILE)) {
      all = JSON.parse(fs.readFileSync(USER_BACKUP_CONFIGS_FILE, 'utf-8')) || {};
    }
  } catch {
    all = {};
  }
  const current = getUserAutoBackupConfig(userId);
  const updated: UserAutoBackupSettings = {
    ...current,
    ...updates,
    hasCustomPassword: updates.customPassword !== undefined ? Boolean(updates.customPassword) : current.hasCustomPassword
  };
  all[userId] = updated;
  try {
    if (!fs.existsSync(HOSTED_BOTS_DIR)) {
      fs.mkdirSync(HOSTED_BOTS_DIR, { recursive: true });
    }
    fs.writeFileSync(USER_BACKUP_CONFIGS_FILE, JSON.stringify(all, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[BotBackupManager] Error writing user backup config file:', err);
  }
  return updated;
}

export function getAllUserBackups(userId: string, getRegistryFn?: () => any[]): BotBackupRecord[] {
  const bots = typeof getRegistryFn === 'function' ? getRegistryFn() : [];
  const userBots = bots.filter((b: any) => b.ownerId === userId || b.owner === userId || b.userId === userId);
  const results: BotBackupRecord[] = [];
  for (const bot of userBots) {
    const list = getBotBackups(bot.id);
    results.push(...list);
  }
  return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getUserStorageStats(
  userId: string,
  maxStorageMb: number = 50,
  getRegistryFn?: () => any[]
): UserStorageStats {
  const bots = typeof getRegistryFn === 'function' ? getRegistryFn() : [];
  const userBots = bots.filter((b: any) => b.ownerId === userId || b.owner === userId || b.userId === userId);

  let botsSizeBytes = 0;
  for (const b of userBots) {
    const botDir = path.join(HOSTED_BOTS_DIR, b.dirName || b.id);
    if (fs.existsSync(botDir)) {
      const files = getAllBotFiles(botDir);
      botsSizeBytes += files.reduce((acc, f) => acc + f.size, 0);
    }
  }

  const userBackups = getAllUserBackups(userId, getRegistryFn);
  const backupsSizeBytes = userBackups.reduce((acc, b) => acc + (b.totalSizeBytes || 0), 0);

  const usedBytes = botsSizeBytes + backupsSizeBytes;
  const usedMb = Number((usedBytes / (1024 * 1024)).toFixed(2));
  const safeMax = maxStorageMb || 50;
  const freeMb = Math.max(0, Number((safeMax - usedMb).toFixed(2)));
  const percentUsed = Math.min(100, Math.round((usedMb / safeMax) * 100));

  return {
    usedBytes,
    usedMb,
    maxStorageMb: safeMax,
    freeMb,
    percentUsed,
    backupsCount: userBackups.length,
    backupsSizeBytes,
    botsCount: userBots.length,
    botsSizeBytes
  };
}

export function run24HourAutoBackupCycle(
  bots: any[],
  appendLogFn?: (botId: string, level: string, msg: string) => void
): { createdCount: number; skippedCount: number; errors: any[] } {
  const results = {
    createdCount: 0,
    skippedCount: 0,
    errors: [] as any[]
  };

  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (const bot of bots) {
    try {
      const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
      if (!fs.existsSync(botDir)) {
        results.skippedCount++;
        continue;
      }

      const backups = getBotBackups(bot.id);
      const latestAuto = backups.find((b) => b.trigger === 'auto_24h');

      const shouldBackup =
        !latestAuto || now - new Date(latestAuto.timestamp).getTime() >= TWENTY_FOUR_HOURS_MS;

      if (shouldBackup) {
        const userCfg = (bot.ownerId || bot.owner) ? getUserAutoBackupConfig(bot.ownerId || bot.owner) : null;
        const isEncrypted = userCfg ? userCfg.encryptionEnabled !== false : true;
        const desc = isEncrypted ? '🔒 Daily Encrypted Auto-Backup (AES-256)' : 'Automatic 24-Hour Backup';
        const backupRecord = createBotBackup(bot, 'auto_24h', desc, {
          encrypted: isEncrypted,
          password: userCfg?.customPassword,
          userId: bot.ownerId || bot.owner,
          saveToAccountStorage: true
        });
        results.createdCount++;
        if (appendLogFn) {
          appendLogFn(
            bot.id,
            'info',
            `💾 [Auto-Backup] 24-Hour recurring backup completed (${backupRecord.filesCount} files, ${(backupRecord.totalSizeBytes / 1024).toFixed(1)} KB)`
          );
        }
      } else {
        results.skippedCount++;
      }
    } catch (err: any) {
      results.errors.push({ botId: bot.id, error: err.message });
      if (appendLogFn) {
        appendLogFn(bot.id, 'warn', `⚠️ [Auto-Backup] 24-Hour recurring backup error: ${err.message}`);
      }
    }
  }

  return results;
}

export function start24HourBackupScheduler(
  getBotsFn: () => any[],
  appendLogFn?: (botId: string, level: string, msg: string) => void,
  _getAccountsFn?: () => any[]
): NodeJS.Timeout {
  console.log('[BotBackupManager] Initializing 24-Hour recurring automatic bot backup service...');

  // Run initial check after 5 seconds to catch any overdue 24h backups without delaying server boot
  setTimeout(() => {
    try {
      const bots = getBotsFn();
      if (Array.isArray(bots) && bots.length > 0) {
        run24HourAutoBackupCycle(bots, appendLogFn);
      }
    } catch (err) {
      console.warn('[BotBackupManager] Initial auto-backup error:', err);
    }
  }, 5000);

  // Periodically check every 30 minutes to see if 24 hours have elapsed for any bot
  const interval = setInterval(() => {
    try {
      const bots = getBotsFn();
      if (Array.isArray(bots) && bots.length > 0) {
        run24HourAutoBackupCycle(bots, appendLogFn);
      }
    } catch (err) {
      console.warn('[BotBackupManager] Recurring auto-backup interval check error:', err);
    }
  }, 30 * 60 * 1000);

  return interval;
}
