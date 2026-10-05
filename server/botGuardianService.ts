import fs from 'fs';
import path from 'path';
import { scanAndAutoFixBotDirectory } from './botAutoFixService';

export interface GuardianStats {
  active: boolean;
  monitoredBots: number;
  runningBots: number;
  totalHeals: number;
  lastCheck: string;
  uptimeSeconds: number;
  guardianVersion: string;
}

let guardianStarted = false;
let guardianTimer: NodeJS.Timeout | null = null;
let totalAutoHeals = 0;
const guardianStartTime = Date.now();
let lastCheckTime = new Date().toISOString();

// Backoff tracker to avoid CPU spikes during severe crashes while guaranteeing 24/7 recovery
const guardianBotBackoff = new Map<string, { lastAttempt: number; delayMs: number; failCount: number }>();

export function getAiGuardianStats(getRegistry?: () => any[]): GuardianStats {
  let monitored = 0;
  let running = 0;
  if (getRegistry) {
    try {
      const bots = getRegistry();
      monitored = bots.length;
      running = bots.filter((b) => b.status === 'running').length;
    } catch {}
  }
  return {
    active: true,
    monitoredBots: monitored,
    runningBots: running,
    totalHeals: totalAutoHeals,
    lastCheck: lastCheckTime,
    uptimeSeconds: Math.floor((Date.now() - guardianStartTime) / 1000),
    guardianVersion: '2.4.0-AI-GUARDIAN'
  };
}

export function start24HourAiBotGuardian(
  getRegistry: () => any[],
  saveRegistry: (bots: any[]) => void,
  launchBotProcess: (bot: any) => boolean,
  appendLog: (botId: string, type: 'info' | 'error' | 'warn', message: string) => void,
  isProcessRunning: (botId: string) => boolean,
  hostedBotsDir: string
) {
  if (guardianStarted) return;
  guardianStarted = true;

  console.log('🛡️ [24/7 AI Bot Guardian] Initialized & actively monitoring all Telegram bots...');

  const runGuardianCheck = async () => {
    lastCheckTime = new Date().toISOString();
    try {
      const bots = getRegistry();
      if (!bots || bots.length === 0) return;

      const now = Date.now();

      for (const bot of bots) {
        if (!bot || !bot.id) continue;

        // A bot is intended to be live if status is 'running' or autoRestart is true
        const shouldBeRunning = bot.status === 'running' || bot.autoRestart !== false;
        if (!shouldBeRunning) continue;

        const isAlive = isProcessRunning(bot.id);

        if (!isAlive) {
          // Check backoff
          const backoff = guardianBotBackoff.get(bot.id) || { lastAttempt: 0, delayMs: 2000, failCount: 0 };
          if (now - backoff.lastAttempt < backoff.delayMs) {
            continue;
          }

          backoff.lastAttempt = now;
          backoff.failCount++;
          // Progressive backoff capped at 15s to keep bot 24/7 live
          backoff.delayMs = Math.min(15000, backoff.delayMs + 3000);
          guardianBotBackoff.set(bot.id, backoff);

          totalAutoHeals++;
          bot.guardianHeals = (bot.guardianHeals || 0) + 1;
          bot.lastGuardianHeal = new Date().toISOString();
          bot.aiGuardianStatus = 'active';

          appendLog(
            bot.id,
            'info',
            `[🛡️ 24/7 AI Guardian] Bot process recovered & revived! Keeping your bot live 24/7 (Guardian Heal #${bot.guardianHeals})`
          );

          // Deep Auto-Heal workspace files before re-launch
          const botDir = path.join(hostedBotsDir, bot.dirName || bot.id);
          if (fs.existsSync(botDir)) {
            try {
              scanAndAutoFixBotDirectory(botDir, {
                defaultToken: bot.token,
                requestedEntry: bot.entryFile
              });
            } catch (err: any) {
              console.warn(`[24/7 AI Guardian] Workspace fix error for ${bot.name}:`, err.message);
            }

            // Clear Telegram 409 conflict & webhook lock if token is available
            if (bot.token && bot.token.includes(':')) {
              try {
                fetch(`https://api.telegram.org/bot${bot.token}/deleteWebhook?drop_pending_updates=true`, {
                  signal: AbortSignal.timeout(3000)
                }).catch(() => {});
              } catch {}
            }
          }

          // Launch bot process
          try {
            const launched = launchBotProcess(bot);
            if (launched) {
              bot.status = 'running';
              // If launched successfully, reset fail count gradually
              setTimeout(() => {
                if (isProcessRunning(bot.id)) {
                  guardianBotBackoff.delete(bot.id);
                }
              }, 10000);
            }
          } catch (e: any) {
            appendLog(bot.id, 'warn', `[24/7 AI Guardian] Launch retry warning: ${e.message}`);
          }

          saveRegistry(bots);
        } else {
          // If already running smoothly, clear backoff
          if (guardianBotBackoff.has(bot.id)) {
            guardianBotBackoff.delete(bot.id);
          }
          if (bot.aiGuardianStatus !== 'active') {
            bot.aiGuardianStatus = 'active';
            saveRegistry(bots);
          }
        }
      }
    } catch (err: any) {
      console.warn('[24/7 AI Guardian] Cycle error:', err.message);
    }
  };

  // Run guardian check every 5 seconds
  guardianTimer = setInterval(runGuardianCheck, 5000);
  // Initial check after 2 seconds
  setTimeout(runGuardianCheck, 2000);
}
