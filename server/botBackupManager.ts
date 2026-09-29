import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

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
  zipFileName: string;
  files: BotBackupFile[];
  description: string;
  status: 'completed' | 'failed';
  restoredAt?: string;
}

const HOSTED_BOTS_DIR = path.join(process.cwd(), 'hosted_bots');
const BOT_BACKUPS_BASE_DIR = path.join(HOSTED_BOTS_DIR, 'bot_backups');

const EXCLUDED_FILES = new Set([
  'bot.log',
  'deployments.json',
  '.backups',
  '__pycache__',
  '.git',
  '.DS_Store',
  'node_modules'
]);

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

export function getBotBackupZipPath(botId: string, backupId: string): string | null {
  const backup = getBotBackupById(botId, backupId);
  if (!backup) return null;
  const zipPath = path.join(getBotBackupsDir(botId), backup.zipFileName || `${backupId}.zip`);
  return fs.existsSync(zipPath) ? zipPath : null;
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
  description?: string
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
  const zipFileName = `${backupId}.zip`;
  const botBackupsDir = getBotBackupsDir(bot.id);
  const zipFilePath = path.join(botBackupsDir, zipFileName);

  zip.writeZip(zipFilePath);

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
    status: 'completed'
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
  backupId: string
): { success: boolean; backup: BotBackupRecord; restoredFilesCount: number } {
  const botBackupsDir = getBotBackupsDir(bot.id);
  const backups = getBotBackups(bot.id);
  const targetIndex = backups.findIndex((b) => b.id === backupId);

  if (targetIndex === -1) {
    throw new Error('Backup snapshot record not found');
  }

  const target = backups[targetIndex];
  const zipPath = path.join(botBackupsDir, target.zipFileName || `${backupId}.zip`);

  if (!fs.existsSync(zipPath)) {
    throw new Error('Backup archive .zip file not found on disk');
  }

  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  if (!fs.existsSync(botDir)) {
    fs.mkdirSync(botDir, { recursive: true });
  }

  // Extract all files from backup archive, overwriting workspace files
  const zip = new AdmZip(zipPath);
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

export function deleteBotBackup(botId: string, backupId: string): boolean {
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
    // If no auto backup exists yet, next is scheduled soon
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
        const backupRecord = createBotBackup(bot, 'auto_24h', 'Automatic 24-Hour Backup');
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
  appendLogFn?: (botId: string, level: string, msg: string) => void
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
