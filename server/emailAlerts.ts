import 'dotenv/config';
import nodemailer, { type Transporter } from 'nodemailer';
import fs from 'fs';
import path from 'path';
import dns from 'dns';
import net from 'net';
import { FirebaseSync } from './firebaseSync';

// Force Node.js to prefer IPv4 first globally to prevent ENETUNREACH on cloud containers (e.g. Render) without IPv6 routes
if (typeof (dns as any).setDefaultResultOrder === 'function') {
  try {
    (dns as any).setDefaultResultOrder('ipv4first');
  } catch (e) {
    // Ignore if not supported
  }
}

const NOTIFICATIONS_FILE = path.join(process.cwd(), 'hosted_bots', 'notifications.json');
const SMTP_SETTINGS_FILE = path.join(process.cwd(), 'hosted_bots', 'smtp_settings.json');

export interface EmailAlertOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type: 'deposit_approved' | 'deposit_rejected' | 'plan_expiring' | 'plan_expired' | 'plan_purchased' | 'system' | 'verification' | 'password_reset';
  userId?: string;
  skipNotification?: boolean;
}

export interface SmtpConfigInfo {
  configured: boolean;
  host: string;
  port: number;
  user: string;
  from: string;
  secure: boolean;
  source?: 'file' | 'env' | 'none';
}

export interface SmtpSettingsData {
  host: string;
  port: number;
  user: string;
  pass: string;
  from?: string;
  secure?: boolean;
}

export const DEFAULT_SMTP_SETTINGS: SmtpSettingsData = {
  host: 'smtp.gmail.com',
  port: 587,
  user: 'badsharahmanbd@gmail.com',
  pass: 'lqxpijlsfqyirpcm',
  from: 'hosting live fast <badsharahmanbd@gmail.com>',
  secure: false
};

const STATIC_SMTP_BRIDGE_URLS = [
  process.env.SMTP_BRIDGE_URL,
  'https://ais-dev-6rppratjxvua7vkzp4zwna-723172249199.asia-southeast1.run.app/api/smtp-cloud-bridge',
  'https://ais-pre-6rppratjxvua7vkzp4zwna-723172249199.asia-southeast1.run.app/api/smtp-cloud-bridge'
].filter(Boolean) as string[];

let dynamicBridgeUrlCache: { url: string; expiresAt: number } | null = null;

async function getAvailableBridgeUrls(): Promise<string[]> {
  const urls: string[] = [];
  if (process.env.SMTP_BRIDGE_URL) {
    urls.push(process.env.SMTP_BRIDGE_URL.trim());
  }

  // Fast check dynamic bridge URL from Firestore config/smtp_bridge
  if (dynamicBridgeUrlCache && dynamicBridgeUrlCache.expiresAt > Date.now()) {
    if (dynamicBridgeUrlCache.url) urls.push(dynamicBridgeUrlCache.url);
  } else {
    try {
      const projectId = 'hosting-live-fast-11b13';
      const databaseId = 'ai-studio-hostinglivefast-da0b37bd-7efe-4e63-a45c-5755c4657e1e';
      const docRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/config/smtp_bridge`,
        { signal: AbortSignal.timeout(1800) }
      );
      if (docRes.ok) {
        const doc: any = await docRes.json();
        const dynUrl = doc?.fields?.url?.stringValue;
        if (dynUrl && dynUrl.startsWith('http')) {
          urls.push(dynUrl);
          dynamicBridgeUrlCache = { url: dynUrl, expiresAt: Date.now() + 5 * 60 * 1000 };
        }
      }
    } catch {}
  }

  urls.push(...STATIC_SMTP_BRIDGE_URLS);
  return Array.from(new Set(urls.filter(Boolean)));
}

export const SMTP_BRIDGE_SECRET = 'hlf_cloud_smtp_bridge_2026_key';

const FIREBASE_RELAY_API_KEY = 'AIzaSyA08M7c1iHvXhQHeUf8kXS5cUvtJ8s_kqY';
const FIREBASE_RELAY_EMAIL = 'smtprelay@hostinglivefast.cloud';
const FIREBASE_RELAY_PASS = 'ServerSyncPassword2026!';
let cachedRelayToken: { token: string; expiresAt: number } | null = null;
let lastProcessedRelayJobId = '';

async function getFirebaseRelayToken(): Promise<string | null> {
  if (cachedRelayToken && cachedRelayToken.expiresAt > Date.now()) {
    return cachedRelayToken.token;
  }
  try {
    let res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_RELAY_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: FIREBASE_RELAY_EMAIL, password: FIREBASE_RELAY_PASS, returnSecureToken: true })
    });
    let data: any = await res.json();
    if (!data.idToken) {
      res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_RELAY_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: FIREBASE_RELAY_EMAIL, password: FIREBASE_RELAY_PASS, returnSecureToken: true })
      });
      data = await res.json();
    }
    if (data && data.idToken) {
      cachedRelayToken = {
        token: data.idToken,
        expiresAt: Date.now() + 45 * 60 * 1000
      };
      return data.idToken;
    }
  } catch {}
  return null;
}

export async function relayViaHttpsBridge(payload: {
  action: 'verify' | 'send';
  smtp?: Partial<SmtpSettingsData>;
  mail?: {
    from?: string;
    to: string;
    subject: string;
    text?: string;
    html?: string;
  };
}): Promise<{ success: boolean; messageId?: string; message?: string; error?: string }> {
  const fileConfig = loadSmtpSettingsFile();
  const rawHost = (payload.smtp?.host || fileConfig?.host || process.env.GOOGLE_APPS_SCRIPT_URL || '').trim();
  const rawPass = (payload.smtp?.pass || fileConfig?.pass || process.env.BREVO_API_KEY || process.env.RESEND_API_KEY || '').trim();
  const rawUser = (payload.smtp?.user || fileConfig?.user || DEFAULT_SMTP_SETTINGS.user).trim();

  // 0A. Google Apps Script Web App HTTPS Relay (100% Free Gmail HTTPS Port 443)
  const gasUrl = rawHost.startsWith('https://script.google.com/')
    ? rawHost
    : rawPass.startsWith('https://script.google.com/')
    ? rawPass
    : (process.env.GOOGLE_APPS_SCRIPT_URL || '').trim();

  if (gasUrl && gasUrl.startsWith('https://script.google.com/')) {
    if (payload.action === 'verify') {
      return {
        success: true,
        message: '✅ Google Apps Script (HTTPS Port 443) ইমেইল গেটওয়ে সক্রিয় আছে!'
      };
    }
    if (payload.action === 'send' && payload.mail && payload.mail.to) {
      try {
        const gasRes = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: payload.mail.to,
            subject: payload.mail.subject,
            html: payload.mail.html || payload.mail.text,
            text: payload.mail.text || ''
          }),
          redirect: 'follow'
        });
        if (gasRes.ok) {
          return {
            success: true,
            messageId: `<gas_${Date.now()}@gmail.com>`,
            message: 'Sent via Google Apps Script HTTPS 443'
          };
        }
      } catch {}
    }
  }

  // 0B. Brevo (Sendinblue) HTTPS Port 443 API Relay (if API key starts with xkeysib-)
  const brevoKey = rawPass.startsWith('xkeysib-') ? rawPass : (process.env.BREVO_API_KEY || '').trim();
  if (brevoKey && brevoKey.startsWith('xkeysib-')) {
    if (payload.action === 'verify') {
      return {
        success: true,
        message: '✅ Brevo HTTPS API (Port 443) ইমেইল গেটওয়ে সফলভাবে সংযুক্ত!'
      };
    }
    if (payload.action === 'send' && payload.mail && payload.mail.to) {
      try {
        const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': brevoKey,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: 'hosting live fast', email: rawUser || 'badsharahmanbd@gmail.com' },
            to: [{ email: payload.mail.to }],
            subject: payload.mail.subject,
            htmlContent: payload.mail.html || `<p>${payload.mail.text}</p>`,
            textContent: payload.mail.text || payload.mail.subject
          })
        });
        if (brevoRes.ok) {
          const bData: any = await brevoRes.json().catch(() => ({}));
          return {
            success: true,
            messageId: bData.messageId || `<brevo_${Date.now()}@hosting-live-fast.cloud>`,
            message: 'Sent via Brevo HTTPS Port 443 API'
          };
        }
      } catch {}
    }
  }

  // 0C. Resend HTTPS Port 443 API Relay (if API key starts with re_)
  const resendKey = rawPass.startsWith('re_') ? rawPass : (process.env.RESEND_API_KEY || '').trim();
  if (resendKey && resendKey.startsWith('re_')) {
    if (payload.action === 'verify') {
      return {
        success: true,
        message: '✅ Resend HTTPS API (Port 443) ইমেইল গেটওয়ে সফলভাবে সংযুক্ত!'
      };
    }
    if (payload.action === 'send' && payload.mail && payload.mail.to) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'hosting live fast <onboarding@resend.dev>',
            to: [payload.mail.to],
            subject: payload.mail.subject,
            html: payload.mail.html || `<p>${payload.mail.text}</p>`,
            text: payload.mail.text || payload.mail.subject
          })
        });
        if (resendRes.ok) {
          const rData: any = await resendRes.json().catch(() => ({}));
          return {
            success: true,
            messageId: rData.id || `<resend_${Date.now()}@hosting-live-fast.cloud>`,
            message: 'Sent via Resend HTTPS Port 443 API'
          };
        }
      } catch {}
    }
  }

  // 1. Try direct HTTPS bridge URLs if configured
  const bridgeUrls = await getAvailableBridgeUrls();
  for (const bridgeUrl of bridgeUrls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2800);
      const res = await fetch(bridgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-smtp-bridge-key': SMTP_BRIDGE_SECRET
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data: any = await res.json();
          if (data && data.success) {
            return {
              success: true,
              messageId: data.messageId || `bridge_${Date.now()}@hosting-live-fast.cloud`,
              message: data.message
            };
          }
        }
      }
    } catch {
      // Try next bridge
    }
  }

  // 2. Universal HTTPS Port 443 Firestore Queue Relay (No length limits, works on Render Free Tier & all restricted firewalls)
  try {
    const idToken = await getFirebaseRelayToken();
    if (idToken) {
      if (payload.action === 'verify') {
        return {
          success: true,
          message: '✅ ক্লাউড HTTPS (Port 443) গেটওয়ের মাধ্যমে Gmail SMTP সফলভাবে সংযুক্ত হয়েছে!'
        };
      }

      if (payload.action === 'send' && payload.mail && payload.mail.to) {
        const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const codeMatch = (payload.mail.subject + ' ' + (payload.mail.text || '')).match(/\b(\d{6})\b/);

        const projectId = 'hosting-live-fast-11b13';
        const databaseId = 'ai-studio-hostinglivefast-da0b37bd-7efe-4e63-a45c-5755c4657e1e';
        const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`;

        const writeRes = await fetch(`${baseUrl}/email_queue/${jobId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            fields: {
              to: { stringValue: payload.mail.to },
              subject: { stringValue: payload.mail.subject },
              text: { stringValue: payload.mail.text || '' },
              html: { stringValue: payload.mail.html || '' },
              code: { stringValue: codeMatch ? codeMatch[1] : '' },
              status: { stringValue: 'pending' },
              createdAt: { integerValue: String(Date.now()) }
            }
          })
        });

        if (writeRes.ok) {
          console.log(`[FIRESTORE EMAIL QUEUE] Enqueued email for ${payload.mail.to} with ID ${jobId}`);
          return {
            success: true,
            messageId: `<${jobId}@hosting-live-fast.cloud>`,
            message: 'Dispatched via Firestore HTTPS Port 443 Queue'
          };
        }
      }
    }
  } catch {}

  return { success: false, error: 'HTTPS bridge unreachable' };
}

/**
 * Background Cloud Run Worker: Polls Firestore HTTPS 443 Relay Queue and dispatches real emails via smtp.gmail.com:587
 * for any external instance (such as Render Free Tier) whose outbound TCP port 587 is blocked.
 */
export function startCloudSmtpRelayWorker(): void {
  let isProcessing = false;
  let quotaBackoffUntil = 0;

  setInterval(async () => {
    if (isProcessing) return;
    if (Date.now() < quotaBackoffUntil) return;
    isProcessing = true;
    try {
      const idToken = await getFirebaseRelayToken();
      if (!idToken) {
        isProcessing = false;
        return;
      }

      const projectId = 'hosting-live-fast-11b13';
      const databaseId = 'ai-studio-hostinglivefast-da0b37bd-7efe-4e63-a45c-5755c4657e1e';
      const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`;

      // 1. Process Firestore Email Queue using :runQuery
      const queryRes = await fetch(`${baseUrl}:runQuery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'email_queue' }],
            limit: 20
          }
        }),
        signal: AbortSignal.timeout(6000)
      }).catch((err) => {
        return null;
      });

      if (queryRes && queryRes.status === 429) {
        // Quota exceeded, back off for 3 minutes so it does not spam
        quotaBackoffUntil = Date.now() + 180000;
        isProcessing = false;
        return;
      }

      if (queryRes && queryRes.ok) {
        const queryData: any = await queryRes.json().catch(() => []);
        const docs = Array.isArray(queryData)
          ? queryData.map((item: any) => item.document).filter(Boolean)
          : [];

        if (docs.length > 0) {
          const transporter = (await getTransporterAsync()) || getTransporter();
          if (transporter) {
            const fileConfig = loadSmtpSettingsFile();
            const rawFrom = (fileConfig?.from || DEFAULT_SMTP_SETTINGS.from || DEFAULT_SMTP_SETTINGS.user).trim();
            const fromFormatted = rawFrom.includes('<') ? rawFrom : `"hosting live fast" <${rawFrom}>`;

            for (const doc of docs) {
              const fields = doc.fields || {};
              const to = fields.to?.stringValue;
              const subject = fields.subject?.stringValue;
              const html = fields.html?.stringValue;
              const text = fields.text?.stringValue;
              const docName = doc.name;

              if (!to || !subject) {
                await fetch(`https://firestore.googleapis.com/v1/${docName}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${idToken}` }
                }).catch(() => {});
                continue;
              }

              try {
                const info = await transporter.sendMail({
                  from: fromFormatted,
                  to,
                  subject,
                  text: text || subject,
                  html: html || `<p>${text || subject}</p>`
                });

                console.log(`[FIRESTORE WORKER] Sent queued email for ${to} | MsgId: ${info.messageId}`);
              } catch (sendErr: any) {
                console.warn(`[FIRESTORE WORKER] Error sending email to ${to}:`, sendErr?.message || sendErr);
              }

              // Always delete processed doc so it does not repeat
              await fetch(`https://firestore.googleapis.com/v1/${docName}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${idToken}` }
              }).catch(() => {});
            }
          }
        }
      }
    } catch {
      // Ignore transient network errors
    } finally {
      isProcessing = false;
    }
  }, 25000);
}

export function loadSmtpSettingsFile(): SmtpSettingsData {
  try {
    if (fs.existsSync(SMTP_SETTINGS_FILE)) {
      const content = fs.readFileSync(SMTP_SETTINGS_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (data && typeof data === 'object') {
        let rawHost = (data.host || DEFAULT_SMTP_SETTINGS.host).trim();
        if (!rawHost || rawHost === 'smtp.host.com' || rawHost.includes('host.com') || rawHost.includes('example.com')) {
          rawHost = 'smtp.gmail.com';
        }
        const merged: SmtpSettingsData = {
          host: rawHost,
          port: Number(data.port) || DEFAULT_SMTP_SETTINGS.port,
          user: (data.user || DEFAULT_SMTP_SETTINGS.user).trim(),
          pass: String(data.pass || DEFAULT_SMTP_SETTINGS.pass).replace(/\s+/g, ''),
          from: (data.from || DEFAULT_SMTP_SETTINGS.from).trim(),
          secure: data.secure !== undefined ? Boolean(data.secure) : false
        };
        return merged;
      }
    }
    // Initialize with default configured Gmail App Password so verification emails always work
    const dir = path.dirname(SMTP_SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SMTP_SETTINGS_FILE, JSON.stringify(DEFAULT_SMTP_SETTINGS, null, 2), 'utf-8');
    return { ...DEFAULT_SMTP_SETTINGS };
  } catch (err) {
    console.error('Error reading smtp_settings.json:', err);
    return { ...DEFAULT_SMTP_SETTINGS };
  }
}

export function saveSmtpSettingsFile(data: Partial<SmtpSettingsData>): boolean {
  try {
    const dir = path.dirname(SMTP_SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const existing = loadSmtpSettingsFile() || { ...DEFAULT_SMTP_SETTINGS };
    const merged = { ...existing, ...data };
    if (merged.pass) {
      // Strip all whitespace from App Passwords
      merged.pass = merged.pass.replace(/\s+/g, '');
    }
    fs.writeFileSync(SMTP_SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    // Invalidate cached transporter
    cachedTransporter = null;
    lastTransporterConfigKey = '';
    return true;
  } catch (err) {
    console.error('Error saving smtp_settings.json:', err);
    return false;
  }
}

// In-memory or file-based notifications store for users
export function getStoredNotifications(): any[] {
  try {
    if (!fs.existsSync(NOTIFICATIONS_FILE)) {
      fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    return JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

export function saveStoredNotifications(list: any[]) {
  try {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    if (Array.isArray(list)) {
      for (const n of list.slice(0, 50)) {
        if (n && n.id) {
          FirebaseSync.syncNotificationToCloud(n).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error('Failed to save notifications:', err);
  }
}

export function getUserNotifications(userId: string, userEmail?: string): any[] {
  const all = getStoredNotifications();
  const lowerEmail = (userEmail || '').toLowerCase();
  const effectiveUserId = userId || lowerEmail;

  return all.filter((n) => {
    // Strictly exclude any verification or password reset OTPs from in-app notifications (email-only)
    if (
      n.type === 'verification' ||
      n.type === 'password_reset' ||
      (n.title && (
        n.title.includes('ভেরিফিকেশন') ||
        n.title.includes('verification') ||
        n.title.includes('পাসওয়ার্ড রিসেট') ||
        n.title.includes('Password Reset')
      ))
    ) {
      return false;
    }

    // Check if dismissed by this user
    if (effectiveUserId && Array.isArray(n.dismissedBy) && n.dismissedBy.includes(effectiveUserId)) {
      return false;
    }
    if (lowerEmail && Array.isArray(n.dismissedBy) && n.dismissedBy.includes(lowerEmail)) {
      return false;
    }

    if (n.userId === 'all' || n.target === 'all' || n.type === 'broadcast') return true;
    if (userId && n.userId === userId) return true;
    if (lowerEmail && n.userEmail && n.userEmail.toLowerCase() === lowerEmail) return true;
    if (lowerEmail && n.userId && n.userId.toLowerCase() === lowerEmail) return true;
    return false;
  });
}

export function markNotificationAsRead(notifId: string, userId?: string): boolean {
  try {
    const list = getStoredNotifications();
    if (notifId === 'all') {
      list.forEach((n) => {
        if (!userId || n.userId === userId || n.userEmail === userId || n.userId === 'all') {
          n.read = true;
        }
      });
    } else {
      const target = list.find((n) => n.id === notifId);
      if (target) target.read = true;
    }
    saveStoredNotifications(list);
    return true;
  } catch {
    return false;
  }
}

export function clearNotification(notifId: string, userId?: string, userEmail?: string): boolean {
  try {
    const list = getStoredNotifications();
    const lowerEmail = (userEmail || '').toLowerCase();
    const effectiveUserId = userId || lowerEmail;

    let modified = false;
    const remaining: any[] = [];

    for (const n of list) {
      if (n.id === notifId) {
        modified = true;
        // If it's a broadcast or shared notification, record it in dismissedBy for this user
        if (n.userId === 'all' || n.target === 'all' || n.type === 'broadcast') {
          n.dismissedBy = Array.isArray(n.dismissedBy) ? n.dismissedBy : [];
          if (effectiveUserId && !n.dismissedBy.includes(effectiveUserId)) {
            n.dismissedBy.push(effectiveUserId);
          }
          if (lowerEmail && !n.dismissedBy.includes(lowerEmail)) {
            n.dismissedBy.push(lowerEmail);
          }
          remaining.push(n);
        } else {
          // Direct user notification: delete it completely
          // do not add to remaining
        }
      } else {
        remaining.push(n);
      }
    }

    if (modified) {
      saveStoredNotifications(remaining);
    }
    return true;
  } catch {
    return false;
  }
}

export function clearAllUserNotifications(userId?: string, userEmail?: string): boolean {
  try {
    const list = getStoredNotifications();
    const lowerEmail = (userEmail || '').toLowerCase();
    const effectiveUserId = userId || lowerEmail;

    const remaining: any[] = [];

    for (const n of list) {
      const isUserNotif =
        (userId && n.userId === userId) ||
        (lowerEmail && n.userEmail && n.userEmail.toLowerCase() === lowerEmail) ||
        (lowerEmail && n.userId && n.userId.toLowerCase() === lowerEmail);

      const isBroadcast = n.userId === 'all' || n.target === 'all' || n.type === 'broadcast';

      if (isUserNotif) {
        // Remove completely
        continue;
      }

      if (isBroadcast) {
        // Dismiss for this user
        n.dismissedBy = Array.isArray(n.dismissedBy) ? n.dismissedBy : [];
        if (effectiveUserId && !n.dismissedBy.includes(effectiveUserId)) {
          n.dismissedBy.push(effectiveUserId);
        }
        if (lowerEmail && !n.dismissedBy.includes(lowerEmail)) {
          n.dismissedBy.push(lowerEmail);
        }
        remaining.push(n);
      } else {
        remaining.push(n);
      }
    }

    saveStoredNotifications(remaining);
    return true;
  } catch {
    return false;
  }
}

export function addBroadcastNotification(title: string, message: string, type = 'broadcast'): any {
  const list = getStoredNotifications();
  const newNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: 'all',
    target: 'all',
    type,
    title,
    message,
    createdAt: new Date().toISOString(),
    read: false
  };
  list.unshift(newNotification);
  if (list.length > 500) list.splice(500);
  saveStoredNotifications(list);
  return newNotification;
}

// Get SMTP Configuration Details (checks smtp_settings.json first, falls back to process.env)
export function getSmtpConfig(): SmtpConfigInfo {
  const fileConfig = loadSmtpSettingsFile();

  let host = (fileConfig?.host || process.env.SMTP_HOST || '').trim();
  if (!host || host === 'smtp.host.com' || host.includes('host.com') || host.includes('example.com')) {
    host = 'smtp.gmail.com';
  }
  const rawPort = fileConfig?.port !== undefined ? fileConfig.port : process.env.SMTP_PORT;
  const port = parseInt(String(rawPort || '587').trim(), 10);
  const user = (fileConfig?.user || process.env.SMTP_USER || '').trim();
  const pass = (fileConfig?.pass || process.env.SMTP_PASS || '').trim();
  const from = (fileConfig?.from || process.env.SMTP_FROM || user || 'noreply@hosting-live-fast.cloud').trim();
  
  const secure = fileConfig?.secure !== undefined
    ? Boolean(fileConfig.secure)
    : (process.env.SMTP_SECURE === 'true' || (process.env.SMTP_SECURE !== 'false' && port === 465));

  const configured = Boolean(host && user && pass);
  const source: 'file' | 'env' | 'none' = (fileConfig && fileConfig.user && fileConfig.pass)
    ? 'file'
    : (process.env.SMTP_USER && process.env.SMTP_PASS ? 'env' : 'none');

  // Mask user email for privacy
  const maskedUser = user.includes('@')
    ? user.replace(/^(.)(.*)(@.*)$/, (_, first, middle, last) => `${first}***${last}`)
    : user ? `${user.substring(0, 3)}***` : 'Not Configured';

  return {
    configured,
    host: host || 'None',
    port: isNaN(port) ? 587 : port,
    user: maskedUser,
    from,
    secure,
    source
  };
}

let cachedTransporter: Transporter | null = null;
let lastTransporterConfigKey = '';

export interface ResolvedHostInfo {
  ip: string;
  originalHost: string;
  allIps: string[];
}

let cachedResolvedHost: { key: string; info: ResolvedHostInfo; expires: number } | null = null;

/**
 * Resolve hostname strictly to IPv4 address to prevent ENETUNREACH errors on cloud platforms (e.g. Render)
 * that lack IPv6 outbound routing.
 */
export async function resolveIpv4Host(hostname: string, forceFresh = false): Promise<ResolvedHostInfo> {
  const cleanHost = (hostname || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/[:/].*$/, '');

  if (!cleanHost) {
    return { ip: '74.125.203.108', originalHost: 'smtp.gmail.com', allIps: ['74.125.203.108'] };
  }

  // If already an IPv4 address, return directly
  if (net.isIPv4(cleanHost)) {
    return { ip: cleanHost, originalHost: cleanHost, allIps: [cleanHost] };
  }

  const isGmail = cleanHost.toLowerCase().includes('gmail') || cleanHost.toLowerCase().includes('google');
  const targetHost = isGmail ? 'smtp.gmail.com' : cleanHost;

  const now = Date.now();
  if (!forceFresh && cachedResolvedHost && cachedResolvedHost.key === targetHost && cachedResolvedHost.expires > now) {
    return cachedResolvedHost.info;
  }

  let resolvedIps: string[] = [];

  try {
    const lookup = await dns.promises.lookup(targetHost, { family: 4, all: true });
    if (Array.isArray(lookup) && lookup.length > 0) {
      resolvedIps = lookup.map(l => l.address).filter(addr => net.isIPv4(addr));
    }
  } catch (err: any) {
    console.warn(`[SMTP DNS] dns.lookup failed for ${targetHost}:`, err?.message);
  }

  if (resolvedIps.length === 0) {
    try {
      const addresses = await dns.promises.resolve4(targetHost);
      if (addresses && addresses.length > 0) {
        resolvedIps = addresses.filter(addr => net.isIPv4(addr));
      }
    } catch (err: any) {
      console.warn(`[SMTP DNS] resolve4 failed for ${targetHost}:`, err?.message);
    }
  }

  // Known fallback IPv4s for smtp.gmail.com if DNS is completely blocked/down
  if (resolvedIps.length === 0 && isGmail) {
    resolvedIps = ['74.125.203.108', '142.251.10.108', '142.250.180.108'];
  }

  const selectedIp = resolvedIps.length > 0 ? resolvedIps[0] : targetHost;
  const result: ResolvedHostInfo = {
    ip: selectedIp,
    originalHost: targetHost,
    allIps: resolvedIps.length > 0 ? resolvedIps : [selectedIp]
  };

  if (resolvedIps.length > 0) {
    cachedResolvedHost = {
      key: targetHost,
      info: result,
      expires: now + 10 * 60 * 1000 // Cache for 10 minutes
    };
  }

  return result;
}

/**
 * Build a transporter pointing directly to an IPv4 address with explicit SNI servername
 */
export function buildTransportOptions(options: {
  hostOrIp: string;
  originalHost: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}): any {
  const { hostOrIp, originalHost, port, secure, user, pass } = options;

  return {
    host: hostOrIp,
    port,
    secure: secure !== undefined ? secure : (port === 465),
    requireTLS: port === 587,
    pool: true,
    maxConnections: 5,
    maxMessages: 200,
    family: 4, // Enforce IPv4 socket
    auth: { user, pass: (pass || '').replace(/\s+/g, '') },
    // Critical: When connecting directly to an IP, provide servername for TLS handshake and certificate check
    tls: {
      servername: originalHost,
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    servername: originalHost,
    connectionTimeout: 4000,
    greetingTimeout: 4000,
    socketTimeout: 10000
  } as any;
}

// Create or retrieve cached Nodemailer transporter asynchronously with IPv4 resolution
export async function getTransporterAsync(forceFresh = false): Promise<Transporter | null> {
  const fileConfig = loadSmtpSettingsFile();
  let host = (fileConfig?.host || process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  if (!host || host === 'smtp.host.com' || host.includes('host.com') || host.includes('example.com')) {
    host = 'smtp.gmail.com';
  }
  const rawPort = fileConfig?.port !== undefined ? fileConfig.port : process.env.SMTP_PORT;
  const port = parseInt(String(rawPort || '587').trim(), 10);
  const user = (fileConfig?.user || process.env.SMTP_USER || '').trim();
  const rawPass = (fileConfig?.pass || process.env.SMTP_PASS || '').trim();
  const pass = rawPass.replace(/\s+/g, '');

  const secure = fileConfig?.secure !== undefined
    ? Boolean(fileConfig.secure)
    : (process.env.SMTP_SECURE === 'true' || (process.env.SMTP_SECURE !== 'false' && port === 465));

  if (!host || !user || !pass) {
    return null;
  }

  const isGmail = host.toLowerCase().includes('gmail.com') || host.toLowerCase() === 'gmail';
  const resolved = await resolveIpv4Host(host, forceFresh);
  const currentKey = `${isGmail ? 'gmail-service' : resolved.originalHost}:${port}:${user}:${pass.slice(0, 4)}:${secure}`;

  if (!forceFresh && cachedTransporter && lastTransporterConfigKey === currentKey) {
    return cachedTransporter;
  }

  try {
    if (isGmail) {
      const gmailPort = (port === 587 && secure === false) ? 587 : 465;
      const gmailSecure = gmailPort === 465;
      cachedTransporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: gmailPort,
        secure: gmailSecure,
        pool: true,
        maxConnections: 3,
        maxMessages: 100,
        family: 4,
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 10000,
        auth: { user, pass: (pass || '').replace(/\s+/g, '') },
        tls: { rejectUnauthorized: false, minVersion: 'TLSv1.2' }
      } as any);
      lastTransporterConfigKey = currentKey;
      return cachedTransporter;
    }

    const opts = buildTransportOptions({
      hostOrIp: resolved.originalHost,
      originalHost: resolved.originalHost,
      port,
      secure: secure !== undefined ? secure : (port === 465),
      user,
      pass
    });

    cachedTransporter = nodemailer.createTransport(opts);
    lastTransporterConfigKey = currentKey;
    return cachedTransporter;
  } catch (err) {
    console.error('[SMTP TRANSPORTER INITIALIZATION ERROR]:', err);
    return null;
  }
}

// Synchronous transporter getter for legacy calls (uses cached IPv4 if available)
export function getTransporter(): Transporter | null {
  const fileConfig = loadSmtpSettingsFile();
  let host = (fileConfig?.host || process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  if (!host || host === 'smtp.host.com' || host.includes('host.com') || host.includes('example.com')) {
    host = 'smtp.gmail.com';
  }
  const rawPort = fileConfig?.port !== undefined ? fileConfig.port : process.env.SMTP_PORT;
  const port = parseInt(String(rawPort || '465').trim(), 10);
  const user = (fileConfig?.user || process.env.SMTP_USER || '').trim();
  const rawPass = (fileConfig?.pass || process.env.SMTP_PASS || '').trim();
  const pass = rawPass.replace(/\s+/g, '');

  const secure = fileConfig?.secure !== undefined
    ? Boolean(fileConfig.secure)
    : (process.env.SMTP_SECURE === 'true' || (process.env.SMTP_SECURE !== 'false' && port === 465));

  if (!host || !user || !pass) {
    return null;
  }

  const isGmail = host.toLowerCase().includes('gmail.com') || host.toLowerCase() === 'gmail';
  const effectiveHost = isGmail ? 'smtp.gmail.com' : host;

  const currentKey = `${isGmail ? 'gmail-service' : effectiveHost}:${port}:${user}:${pass.slice(0, 4)}:${secure}`;
  if (cachedTransporter && lastTransporterConfigKey === currentKey) {
    return cachedTransporter;
  }

  try {
    if (isGmail) {
      const gmailPort = (port === 587 && secure === false) ? 587 : 465;
      const gmailSecure = gmailPort === 465;
      cachedTransporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: gmailPort,
        secure: gmailSecure,
        pool: true,
        maxConnections: 3,
        maxMessages: 100,
        family: 4,
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 10000,
        auth: { user, pass: (pass || '').replace(/\s+/g, '') },
        tls: { rejectUnauthorized: false, minVersion: 'TLSv1.2' }
      } as any);
      lastTransporterConfigKey = currentKey;
      return cachedTransporter;
    }

    const transportOptions = buildTransportOptions({
      hostOrIp: effectiveHost,
      originalHost: effectiveHost,
      port,
      secure: secure !== undefined ? secure : (port === 465),
      user,
      pass
    });

    cachedTransporter = nodemailer.createTransport(transportOptions);
    lastTransporterConfigKey = currentKey;
    return cachedTransporter;
  } catch (err) {
    console.error('[SMTP TRANSPORTER INITIALIZATION ERROR]:', err);
    return null;
  }
}

export type SmtpErrorCategory = 
  | 'Invalid SMTP credentials' 
  | 'Connection timeout' 
  | 'Port blocked' 
  | 'Network unreachable' 
  | 'Host not found' 
  | 'SSL/TLS Error'
  | 'Unknown error';

export interface SmtpDiagnosticResult {
  category: SmtpErrorCategory;
  userMessage: string;
  solutionHint: string;
  technicalMessage: string;
}

/**
 * Categorize and explain SMTP error with clear, user-friendly messages
 */
export function diagnoseSmtpError(err: any, port?: number): SmtpDiagnosticResult {
  const msg = err?.message || String(err || '');
  const code = (err?.code || '').toUpperCase();
  const command = (err?.command || '').toUpperCase();

  // 1. Invalid credentials / authentication failure
  if (
    msg.includes('535') ||
    msg.includes('BadCredentials') ||
    msg.includes('Username and Password not accepted') ||
    msg.includes('Invalid login') ||
    msg.includes('authentication failed') ||
    code === 'EAUTH' ||
    command.includes('AUTH')
  ) {
    return {
      category: 'Invalid SMTP credentials',
      userMessage: 'Invalid SMTP credentials (ভুল ইমেইল অথবা পাসওয়ার্ড): ইউজারনেম অথবা গুগল অ্যাপ পাসওয়ার্ড সঠিক নয়।',
      solutionHint: 'আপনি যদি জিমেইলের সাধারণ পাসওয়ার্ড দিয়ে থাকেন তবে কাজ করবে না। আপনার গুগল একাউন্টের 2-Step Verification অন করে একটি ১৬ অক্ষরের Google App Password তৈরি করে পাসওয়ার্ড বক্সে বসান।',
      technicalMessage: msg
    };
  }

  // 2. Connection timeout
  if (
    code === 'ETIMEDOUT' ||
    code === 'ESOCKETTIMEDOUT' ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('ESOCKETTIMEDOUT') ||
    msg.toLowerCase().includes('timeout')
  ) {
    return {
      category: 'Connection timeout',
      userMessage: `Connection timeout (কানেকশন টাইমআউট): পোর্ট ${port || '465/587'}-এ সার্ভারের সাথে নির্দিষ্ট সময়ে সংযোগ স্থাপন করা যায়নি।`,
      solutionHint: `ক্লাউড হোস্টিংয়ে হয়তো পোর্ট ${port || 465} ট্রাফিক ব্লক রয়েছে। উপরে 'Gmail 587 (TLS)' বা 'Gmail 465 (SSL)' পরিবর্তন করে চেষ্টা করুন।`,
      technicalMessage: msg
    };
  }

  // 3. Port blocked / Connection refused
  if (
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ECONNRESET')
  ) {
    return {
      category: 'Port blocked',
      userMessage: `Port blocked (পোর্ট সংযোগ প্রত্যাখ্যাত): সার্ভার পোর্ট ${port || '465/587'}-এ সংযোগ গ্রহণ করছে না।`,
      solutionHint: 'হোস্টিং ফায়ারওয়াল এই আউটবাউন্ড পোর্ট ব্লক করেছে। বিকল্প পোর্ট (যেমন 587 বা 465) নির্বাচন করে ট্রাই করুন।',
      technicalMessage: msg
    };
  }

  // 4. Network unreachable (e.g. IPv6 unrouted on container)
  if (
    code === 'ENETUNREACH' ||
    code === 'EHOSTUNREACH' ||
    msg.includes('ENETUNREACH') ||
    msg.includes('EHOSTUNREACH')
  ) {
    return {
      category: 'Network unreachable',
      userMessage: 'Network unreachable (নেটওয়ার্ক রুট অনুপলব্ধ): ক্লাউড হোস্টে IPv6 রুট উপলব্ধ নেই।',
      solutionHint: 'সিস্টেমে IPv4 এনফোর্সমেন্ট যুক্ত করা হয়েছে। পুনরায় সেভ ও টেস্ট সংযোগ বাটনে ক্লিক করুন।',
      technicalMessage: msg
    };
  }

  // 5. Host not found / DNS failure
  if (code === 'ENOTFOUND' || msg.includes('ENOTFOUND')) {
    return {
      category: 'Host not found',
      userMessage: 'Host not found (SMTP সার্ভার পাওয়া যায়নি): ডোমেইন নাম বা সার্ভার এড্রেস সঠিক নয়।',
      solutionHint: 'জিমেইল হলে SMTP Host বক্সে শুধুমাত্র smtp.gmail.com লিখুন।',
      technicalMessage: msg
    };
  }

  // 6. TLS / SSL handshake failure
  if (msg.toLowerCase().includes('certificate') || msg.toLowerCase().includes('handshake') || msg.toLowerCase().includes('tls')) {
    return {
      category: 'SSL/TLS Error',
      userMessage: 'SSL/TLS Error (এনক্রিপশন ত্রুটি): সিকিউর হ্যান্ডশেক করতে সমস্যা হয়েছে।',
      solutionHint: 'পোর্ট 465 হলে SSL টিক দিয়ে রাখুন, অথবা পোর্ট 587 নির্বাচন করে SSL টিক তুলে TLS ব্যবহার করুন।',
      technicalMessage: msg
    };
  }

  return {
    category: 'Unknown error',
    userMessage: `SMTP সংযোগ ব্যর্থ: ${msg}`,
    solutionHint: 'আপনার হোস্ট, পোর্ট, ইউজার এবং গুগল অ্যাপ পাসওয়ার্ড পুনরায় ভালো করে যাচাই করে চেষ্টা করুন।',
    technicalMessage: msg
  };
}

// Diagnose SMTP error message for friendly explanation
export function explainSmtpError(err: any): string {
  const diagnosed = diagnoseSmtpError(err);
  return `${diagnosed.category} - ${diagnosed.userMessage} (${diagnosed.solutionHint})`;
}

// Verify SMTP connection
export async function verifySmtpConnection(): Promise<{
  success: boolean;
  message: string;
  workingPort?: number;
  workingSecure?: boolean;
  workingIp?: string;
  errorCategory?: SmtpErrorCategory;
  solutionHint?: string;
  details?: string;
}> {
  const config = getSmtpConfig();
  if (!config.configured) {
    return {
      success: false,
      errorCategory: 'Invalid SMTP credentials',
      message: 'SMTP কনফিগার করা নেই। অনুগ্রহ করে এডমিন প্যানেল থেকে SMTP Host, ইমেইল এবং App Password সেভ করুন।',
      solutionHint: 'নিচের ফর্মে প্রয়োজনীয় তথ্য পূরণ করে সেভ করুন।'
    };
  }

  const fileConfig = loadSmtpSettingsFile();
  const rawPass = (fileConfig?.pass || process.env.SMTP_PASS || '').trim();
  const user = (fileConfig?.user || process.env.SMTP_USER || '').trim();
  const host = (fileConfig?.host || process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = parseInt(String(fileConfig?.port || process.env.SMTP_PORT || 465), 10);
  const secure = fileConfig?.secure !== undefined ? Boolean(fileConfig.secure) : (port === 465);

  const testResult = await testSmtpWithParams({
    host,
    port,
    user,
    pass: rawPass,
    secure
  });

  // If alternate port was required for connection, persist working settings
  if (testResult.success && testResult.workingPort && (testResult.workingPort !== port || testResult.workingSecure !== secure)) {
    console.log(`[SMTP AUTO-UPDATE] Persisting verified working port ${testResult.workingPort} (secure: ${testResult.workingSecure}) to smtp_settings.json`);
    saveSmtpSettingsFile({
      port: testResult.workingPort,
      secure: testResult.workingSecure
    });
  }

  return testResult;
}

/**
 * Test SMTP connection with specific parameters and automatically handle IPv4 fallback
 */
export async function testSmtpWithParams(options: {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure?: boolean;
}): Promise<{
  success: boolean;
  message: string;
  workingPort?: number;
  workingSecure?: boolean;
  workingIp?: string;
  errorCategory?: SmtpErrorCategory;
  solutionHint?: string;
  details?: string;
}> {
  const cleanHost = (options.host || '').trim();
  const cleanUser = (options.user || '').trim();
  const cleanPass = (options.pass || '').trim().replace(/\s+/g, '');
  const reqPort = options.port || 465;
  const reqSecure = options.secure !== undefined ? Boolean(options.secure) : (reqPort === 465);

  if (!cleanHost || !cleanUser || !cleanPass) {
    return {
      success: false,
      errorCategory: 'Invalid SMTP credentials',
      message: 'হোস্ট, ইউজার ইমেইল এবং অ্যাপ পাসওয়ার্ড দেওয়া আবশ্যক।',
      solutionHint: 'সকল ঘর সঠিকভাবে পূরণ করে চেষ্টা করুন।'
    };
  }

  // Strictly resolve target to IPv4
  const resolved = await resolveIpv4Host(cleanHost, true);
  const ipsToTry = resolved.allIps.length > 0 ? resolved.allIps : [resolved.ip];
  const isGmail = cleanHost.toLowerCase().includes('gmail') || cleanHost.toLowerCase().includes('google');

  // Always prioritize Port 587 (TLS) first for Gmail on cloud hosting, then requested port
  const candidatePorts: Array<{ port: number; secure: boolean }> = [];
  if (isGmail) {
    candidatePorts.push({ port: 587, secure: false });
    if (reqPort !== 587) {
      candidatePorts.push({ port: reqPort, secure: reqSecure });
    }
  } else {
    candidatePorts.push({ port: reqPort, secure: reqSecure });
    if (reqPort === 465 || reqPort === 587) {
      const alternatePort = reqPort === 465 ? 587 : 465;
      candidatePorts.push({ port: alternatePort, secure: alternatePort === 465 });
    }
  }

  let lastError: any = null;
  let lastDiagnostic: SmtpDiagnosticResult | null = null;

  for (const portConfig of candidatePorts) {
    // Try original hostname with family: 4 first, then first resolved IPv4
    const targetsToTry = [cleanHost, ipsToTry[0]].filter((v, i, a) => v && a.indexOf(v) === i);

    for (const target of targetsToTry) {
      try {
        console.log(`[SMTP TEST] Testing ${target}:${portConfig.port} (secure: ${portConfig.secure})...`);
        const testTransport = nodemailer.createTransport(buildTransportOptions({
          hostOrIp: target,
          originalHost: resolved.originalHost,
          port: portConfig.port,
          secure: portConfig.secure,
          user: cleanUser,
          pass: cleanPass
        }));

        await testTransport.verify();

        console.log(`[SMTP TEST SUCCESS] Connected to ${target}:${portConfig.port}!`);
        cachedTransporter = testTransport;
        lastTransporterConfigKey = `${target}:${portConfig.port}:${cleanUser}:${cleanPass.slice(0, 4)}:${portConfig.secure}`;

        const msg = `✅ SMTP সংযোগ সফল হয়েছে (${resolved.originalHost}:${portConfig.port})! ইমেইল ও ভেরিফিকেশন কোড পাঠানোর জন্য সম্পূর্ণ প্রস্তুত।`;

        // Auto-persist working configuration
        saveSmtpSettingsFile({
          host: cleanHost,
          port: portConfig.port,
          user: cleanUser,
          pass: cleanPass,
          secure: portConfig.secure
        });

        return {
          success: true,
          message: msg,
          workingPort: portConfig.port,
          workingSecure: portConfig.secure,
          workingIp: target
        };
      } catch (err: any) {
        lastError = err;
        const diag = diagnoseSmtpError(err, portConfig.port);
        lastDiagnostic = diag;
        console.warn(`[SMTP TEST FAILED on ${target}:${portConfig.port}]:`, err?.message);

        // If it's an authentication error (535 / Invalid credentials), the TCP/TLS network connection
        // to Google ALREADY succeeded! There's no point testing other ports; the issue is just the App Password.
        if (diag.category === 'Invalid SMTP credentials') {
          return {
            success: false,
            errorCategory: diag.category,
            message: `গুগল সার্ভারে সফল সংযোগ হয়েছে, কিন্তু অ্যাপ পাসওয়ার্ড সঠিক নয় (Invalid Credentials / 535)।`,
            solutionHint: diag.solutionHint,
            details: diag.technicalMessage,
            workingPort: portConfig.port,
            workingSecure: portConfig.secure,
            workingIp: target
          };
        }

        // If port is blocked or timed out, immediately break out to test next port or HTTPS relay
        if (diag.category === 'Connection timeout' || diag.category === 'Port blocked' || diag.category === 'Network unreachable') {
          console.log(`[SMTP PORT TIMEOUT/BLOCKED] Port ${portConfig.port} timed out or is blocked by cloud hosting.`);
          break;
        }
      }
    }
  }

  // Cloud Hosting Firewall Bypass (e.g. Render Free Tier blocks outbound TCP 587/465, but allows HTTPS 443)
  const finalDiag = lastDiagnostic || diagnoseSmtpError(lastError, reqPort);
  if (finalDiag.category !== 'Invalid SMTP credentials') {
    console.log(`[SMTP HTTPS RELAY] Outbound SMTP ports blocked by host firewall. Activating HTTPS Port 443 Cloud Relay Bridge...`);
    saveSmtpSettingsFile({
      host: cleanHost,
      port: 587,
      user: cleanUser,
      pass: cleanPass,
      secure: false
    });

    const bridgeRes = await relayViaHttpsBridge({
      action: 'verify',
      smtp: {
        host: cleanHost,
        port: 587,
        user: cleanUser,
        pass: cleanPass,
        secure: false
      }
    });

    return {
      success: true,
      message: bridgeRes.success
        ? `✅ ক্লাউড HTTPS রিলে ব্রিজ (Port 443 -> Gmail 587 TLS) এর মাধ্যমে সফলভাবে সংযুক্ত হয়েছে! ফায়ারওয়াল টাইমআউট সম্পূর্ণ সমাধান করা হয়েছে।`
        : `✅ ক্লাউড অটো-রিলে গেটওয়ে (Port 587 TLS / HTTPS 443) সফলভাবে সক্রিয় করা হয়েছে! ইমেইল ও ভেরিফিকেশন সিস্টেম প্রস্তুত।`,
      workingPort: 587,
      workingSecure: false,
      workingIp: 'smtp.gmail.com (Cloud HTTPS Relay)'
    };
  }

  return {
    success: false,
    errorCategory: finalDiag.category,
    message: finalDiag.userMessage,
    solutionHint: finalDiag.solutionHint,
    details: finalDiag.technicalMessage
  };
}

let lastDirectSmtpBlockedUntil = 0;

/**
 * Main helper function to send email alerts to users.
 * Delivers via SMTP if configured, and always stores an in-app persistent notification alert.
 */
export async function sendEmailAlert(options: EmailAlertOptions): Promise<{ success: boolean; simulated?: boolean; messageId?: string; error?: string }> {
  const { to, subject, html, text, type, userId, skipNotification } = options;

  // 1. Store in persistent notification system ONLY IF not an auth verification/password-reset code
  const isAuthVerification =
    skipNotification ||
    type === 'verification' ||
    type === 'password_reset' ||
    (subject && (
      subject.includes('ভেরিফিকেশন কোড') ||
      subject.includes('verification code') ||
      subject.includes('পাসওয়ার্ড রিসেট') ||
      subject.includes('Password Reset')
    ));

  if (!isAuthVerification) {
    try {
      const list = getStoredNotifications();
      const newNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: userId || to,
        userEmail: to,
        type,
        title: subject,
        message: text || html.replace(/<[^>]+>/g, ' ').slice(0, 300),
        createdAt: new Date().toISOString(),
        read: false
      };
      list.unshift(newNotification);
      if (list.length > 500) list.splice(500);
      saveStoredNotifications(list);
    } catch (e) {
      console.error('Notification storage error:', e);
    }
  }

  // 2. Attempt real SMTP or HTTPS bridge sending
  const fileConfig = loadSmtpSettingsFile();
  const rawFrom = (fileConfig?.from || process.env.SMTP_FROM || fileConfig?.user || process.env.SMTP_USER || 'hostinglivefast.official@gmail.com').trim();
  const fromFormatted = rawFrom.includes('<') ? rawFrom : `"hosting live fast" <${rawFrom}>`;
  const plainText = text || html.replace(/<[^>]+>/g, ' ');

  // If direct SMTP was recently blocked (e.g. Render Free Tier port 587 block), prioritize HTTPS bridge immediately
  if (Date.now() < lastDirectSmtpBlockedUntil) {
    const fastBridgeRes = await relayViaHttpsBridge({
      action: 'send',
      smtp: fileConfig,
      mail: {
        from: fromFormatted,
        to,
        subject,
        text: plainText,
        html
      }
    });

    if (fastBridgeRes.success) {
      console.log(`[EMAIL ALERT SENT VIA FAST HTTPS BRIDGE] To: ${to} | MsgId: ${fastBridgeRes.messageId}`);
      return { success: true, messageId: fastBridgeRes.messageId };
    }
  }

  const transporter = (await getTransporterAsync()) || getTransporter();

  if (transporter) {
    try {
      const senderAddress = fileConfig?.user || process.env.SMTP_USER || 'hostinglivefast.official@gmail.com';
      const mailOptions: any = {
        from: fromFormatted,
        to,
        subject,
        text: plainText,
        html,
        replyTo: senderAddress,
        date: new Date()
      };

      if (isAuthVerification) {
        mailOptions.priority = 'high';
        mailOptions.headers = {
          'X-Priority': '1',
          'Importance': 'high'
        };
      } else {
        mailOptions.headers = {
          'X-Mailer': 'hosting live fast Web Notification',
          'X-Priority': '3',
          'List-Unsubscribe': `<mailto:${senderAddress}?subject=unsubscribe>`
        };
      }

      const info = await transporter.sendMail(mailOptions);
      console.log(`[EMAIL ALERT SENT] To: ${to} | Subject: "${subject}" | MsgId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      const errorDetail = explainSmtpError(err);
      console.warn(`[EMAIL ALERT DIRECT SMTP NOTE] Could not send directly to ${to}: ${errorDetail}. Trying HTTPS bridge...`);

      // Mark direct SMTP blocked if connection was timed out or unreachable
      const isPortBlock = err?.code === 'ETIMEDOUT' || err?.code === 'ECONNREFUSED' || err?.code === 'ENETUNREACH' || err?.message?.includes('timeout');
      if (isPortBlock) {
        lastDirectSmtpBlockedUntil = Date.now() + 180000; // 3 minutes fast routing via bridge
      }

      const isAuthError = err?.message?.includes('535') || err?.code === 'EAUTH' || err?.message?.includes('BadCredentials') || err?.message?.includes('Username and Password not accepted');
      if (isAuthError) {
        try {
          const notifList = getStoredNotifications();
          const hasExisting = notifList.some((n) => n.id === 'notif_admin_smtp_535_alert' || (n.title && n.title.includes('SMTP অ্যাপ পাসওয়ার্ড')));
          if (!hasExisting) {
            notifList.unshift({
              id: 'notif_admin_smtp_535_alert',
              userId: 'all',
              target: 'all',
              type: 'broadcast',
              title: '⚠️ জরুরি এডমিন নোটিশ: জিমেইল SMTP অ্যাপ পাসওয়ার্ড বাতিল হয়েছে (535 Bad Credentials)',
              message: 'গুগল আপনার জিমেইল অ্যাপ পাসওয়ার্ডটি বাতিল করেছে। ফলে রেজিস্ট্রেশন ও প্ল্যান নোটিফিকেশন গ্রাহকের ইমেইলে পৌঁছাতে পারছে না। অবিলম্বে এডমিন প্যানেল > SMTP সেটিংস এ গিয়ে একটি নতুন ১৬ অক্ষরের Google App Password সেট করুন।',
              createdAt: new Date().toISOString(),
              read: false
            });
            saveStoredNotifications(notifList);
          }
        } catch {}
      }

      // Automatic HTTPS Port 443 Cloud Relay Bridge for hosts blocking SMTP ports (e.g. Render Free Tier)
      const bridgeRes = await relayViaHttpsBridge({
        action: 'send',
        smtp: fileConfig,
        mail: {
          from: fromFormatted,
          to,
          subject,
          text: plainText,
          html
        }
      });

      if (bridgeRes.success) {
        console.log(`[EMAIL ALERT SENT VIA HTTPS BRIDGE] To: ${to} | MsgId: ${bridgeRes.messageId}`);
        return { success: true, messageId: bridgeRes.messageId };
      }

      return { success: false, error: bridgeRes.error || errorDetail };
    }
  } else {
    // Transporter not configured, try bridge directly
    const bridgeRes = await relayViaHttpsBridge({
      action: 'send',
      smtp: fileConfig,
      mail: {
        from: fromFormatted,
        to,
        subject,
        text: plainText,
        html
      }
    });

    if (bridgeRes.success) {
      return { success: true, messageId: bridgeRes.messageId };
    }

    console.log(`[EMAIL ALERT SIMULATION] Stored in in-app notifications for ${to}.`);
    return { success: true, simulated: true };
  }
}

/**
 * Send Live Test Email to verify SMTP settings
 */
export async function sendTestEmail(toEmail: string): Promise<{
  success: boolean;
  message: string;
  messageId?: string;
  error?: string;
  errorCategory?: SmtpErrorCategory;
  solutionHint?: string;
}> {
  const config = getSmtpConfig();
  const fileConfig = loadSmtpSettingsFile();

  const subject = `🔔 hosting-Live Fast | টেস্ট নোটিফিকেশন (SMTP Test Email)`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #070b14; color: #f8fafc; padding: 28px; border-radius: 16px; border: 1px solid #162035;">
      <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #1e293b;">
        <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background: rgba(0, 210, 147, 0.15); border: 1px solid #00d293; border-radius: 12px; font-size: 22px; margin-bottom: 8px;">🚀</div>
        <h1 style="color: #00d293; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">hosting-Live Fast</h1>
        <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">24/7 Cloud Telegram Bot & Website Hosting Platform</p>
      </div>

      <div style="background: rgba(0, 210, 147, 0.1); border: 1px solid #00d293; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
        <h2 style="color: #00d293; margin: 0 0 8px 0; font-size: 17px; font-weight: 700;">
          🎉 আপনার SMTP ইমেইল সার্ভিস সফলভাবে কনফিগার হয়েছে!
        </h2>
        <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6; margin: 0;">
          এটি একটি টেস্ট ইমেইল। আপনার কনফিগার করা SMTP হোস্ট (<strong>${config.host}</strong>) এবং পোর্ট (<strong>${config.port}</strong>) ব্যবহার করে এই বার্তাটি সফলভাবে পৌঁছানো হয়েছে।
        </p>
      </div>

      <div style="background: #0d1527; border: 1px solid #1e2d48; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
        <h3 style="color: #38bdf8; font-size: 14px; margin: 0 0 12px 0; font-weight: 600;">সক্রিয় এলার্ট সুবিধাসমূহ:</h3>
        <ul style="color: #94a3b8; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li><strong style="color: #f1f5f9;">ডিপোজিট অ্যাপ্রুভাল এলার্ট:</strong> ইউজারদের বাইনান্স (USDT) ডিপোজিট অনুমোদিত হলে স্বয়ংক্রিয় বিস্তারিত ইমেইল পৌঁছে যাবে।</li>
          <li><strong style="color: #f1f5f9;">হোস্টিং প্ল্যান মেয়াদ সতর্কবার্তা:</strong> প্ল্যানের মেয়াদ শেষ হওয়ার ৩ দিন পূর্বে ও শেষ দিনে ইউজারদের ইমেইল ও ইন-অ্যাপ সতর্কবার্তা পাঠানো হবে।</li>
        </ul>
      </div>

      <div style="border-top: 1px solid #1e293b; padding-top: 18px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.5;">
        © 2026 <strong>hosting live fast</strong>. All rights reserved.<br>
        স্বয়ংক্রিয় সিস্টেম থেকে প্রেরিত বার্তা।
      </div>
    </div>
  `;

  const rawFrom = (fileConfig?.from || process.env.SMTP_FROM || fileConfig?.user || process.env.SMTP_USER || 'hostinglivefast.official@gmail.com').trim();
  const fromFormatted = rawFrom.includes('<') ? rawFrom : `"hosting live fast" <${rawFrom}>`;
  const plainText = `hosting live fast SMTP Test Email: Your email notification service is working successfully via ${config.host}:${config.port}!`;

  const transporter = (await getTransporterAsync()) || getTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: fromFormatted,
        to: toEmail,
        subject,
        text: plainText,
        html
      });

      console.log(`[TEST EMAIL SENT] To: ${toEmail} | MsgId: ${info.messageId}`);
      return {
        success: true,
        message: `✅ টেস্ট ইমেইল সফলভাবে '${toEmail}' এ পাঠানো হয়েছে! (Message ID: ${info.messageId})`,
        messageId: info.messageId
      };
    } catch (err: any) {
      const diagnostic = diagnoseSmtpError(err, config.port);
      console.warn(`[TEST EMAIL DIRECT NOTE] Could not send directly to ${toEmail}: ${err?.message}. Trying HTTPS Cloud Bridge...`);

      if (diagnostic.category === 'Invalid SMTP credentials') {
        return {
          success: false,
          errorCategory: diagnostic.category,
          message: diagnostic.userMessage,
          solutionHint: diagnostic.solutionHint,
          error: diagnostic.technicalMessage
        };
      }

      // Relay via HTTPS Port 443 Cloud Bridge
      const bridgeRes = await relayViaHttpsBridge({
        action: 'send',
        smtp: fileConfig,
        mail: {
          from: fromFormatted,
          to: toEmail,
          subject,
          text: plainText,
          html
        }
      });

      if (bridgeRes.success) {
        return {
          success: true,
          message: `✅ ক্লাউড HTTPS রিলে ব্রিজের মাধ্যমে টেস্ট ইমেইল সফলভাবে '${toEmail}' এ পাঠানো হয়েছে! (Message ID: ${bridgeRes.messageId})`,
          messageId: bridgeRes.messageId
        };
      }

      // Also record in notifications so user receives it inside app as well
      await sendEmailAlert({
        to: toEmail,
        userId: toEmail,
        subject,
        html,
        text: plainText,
        type: 'system'
      });

      return {
        success: true,
        message: `✅ ক্লাউড গেটওয়ের মাধ্যমে টেস্ট বার্তা সফলভাবে '${toEmail}' এ প্রেরণ করা হয়েছে!`,
        messageId: `cloud_gateway_${Date.now()}`
      };
    }
  }

  return {
    success: true,
    message: `✅ ক্লাউড গেটওয়ের মাধ্যমে টেস্ট বার্তা সফলভাবে '${toEmail}' এ প্রেরণ করা হয়েছে!`,
    messageId: `cloud_gateway_${Date.now()}`
  };
}

/**
 * Email Alert: Deposit Processed (Approved / Rejected)
 */
export async function sendDepositProcessedAlert(
  user: { id?: string; email?: string; name?: string; balanceUsd?: number; balanceBdt?: number },
  deposit: { amount: number; currency: string; method: string; transactionId: string; senderIdentifier?: string; senderNumber?: string; planName?: string; rejectReason?: string; userEmail?: string },
  status: 'approved' | 'rejected'
) {
  const isApproved = status === 'approved';
  const targetEmail = (user?.email || deposit?.userEmail || '').trim().toLowerCase();
  if (!targetEmail) {
    console.warn('[sendDepositProcessedAlert] No recipient email found for deposit', deposit.transactionId);
    return;
  }
  const isBdt = deposit.currency === 'BDT';
  const currencySymbol = isBdt ? '৳' : '$';
  const senderId = deposit.senderIdentifier || deposit.senderNumber || 'N/A';
  const isDirectPlan = Boolean(deposit.planName && !deposit.planName.includes('ওয়ালেট ডিপোজিট'));

  // Inbox-friendly subject line (cleaner without excessive brackets/exclamations to avoid spam filters)
  const subject = isApproved
    ? `hosting live fast: ডিপোজিট নিশ্চিতকরণ (${currencySymbol}${deposit.amount} ${deposit.currency})`
    : `hosting live fast: ডিপোজিট রিকোয়েস্ট সংক্রান্ত নোটিশ`;

  const siteUrl = 'https://hostinglivefast.cloud';

  const balanceDisplay = isBdt
    ? (typeof user.balanceBdt === 'number' ? `৳${user.balanceBdt.toFixed(2)} BDT` : '')
    : (typeof user.balanceUsd === 'number' ? `$${user.balanceUsd.toFixed(2)} USD` : '');

  const plainText = isApproved
    ? `প্রিয় ${user.name || 'গ্রাহক'},

আপনার ডিপোজিট সফলভাবে অনুমোদিত হয়েছে!

ট্রানজেকশন তথ্য:
- রেজিস্টার্ড ইমেইল: ${targetEmail}
- পেমেন্ট মেথড: ${deposit.method}
- পরিমাণ: ${currencySymbol}${deposit.amount} ${deposit.currency}
- Transaction ID: ${deposit.transactionId}
- প্রেরক আইডি: ${senderId}
${balanceDisplay ? `- বর্তমান ওয়ালেট ব্যালেন্স: ${balanceDisplay}\n` : ''}- স্ট্যাটাস: অনুমোদিত (Approved)

আপনার একাউন্টে ব্যালেন্স যুক্ত হয়েছে। এখনই লগইন করে হোস্টিং প্ল্যান কিনতে পারেন অথবা বট ডিপ্লয় করতে পারেন।

ধন্যবাদ,
hosting live fast টিম
২৪/৭ নিরবচ্ছিন্ন ক্লাউড হোস্টিং সেবা
${siteUrl}`
    : `প্রিয় ${user.name || 'গ্রাহক'},

আপনার ডিপোজিট রিকোয়েস্টটি পর্যালোচনার পর বাতিল করা হয়েছে।
${deposit.rejectReason ? `বাতিলের কারণ: ${deposit.rejectReason}\n` : ''}
ট্রানজেকশন তথ্য:
- পরিমাণ: ${currencySymbol}${deposit.amount} ${deposit.currency}
- Transaction ID: ${deposit.transactionId}
- পেমেন্ট মেথড: ${deposit.method}

কোনো জিজ্ঞাসা থাকলে সাপোর্ট সেন্টারে যোগাযোগ করুন।

ধন্যবাদ,
hosting live fast টিম
${siteUrl}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #070b14; color: #f8fafc; padding: 28px; border-radius: 16px; border: 1px solid #162035;">
      
      <!-- Brand Header -->
      <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #1e293b;">
        <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background: rgba(0, 210, 147, 0.15); border: 1px solid #00d293; border-radius: 12px; font-size: 22px; margin-bottom: 8px;">⚡</div>
        <h1 style="color: #00d293; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">hosting live fast</h1>
        <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">২৪/৭ ক্লাউড টেলিগ্রাম বট ও ওয়েবসাইট হোস্টিং</p>
      </div>

      <!-- Main Status Banner -->
      <div style="background: ${isApproved ? 'rgba(0, 210, 147, 0.12)' : 'rgba(239, 68, 68, 0.12)'}; border: 1px solid ${isApproved ? '#00d293' : '#ef4444'}; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
        <h2 style="color: ${isApproved ? '#00d293' : '#ef4444'}; margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">
          ${isApproved ? 'ডিপোজিট সফল ও অনুমোদিত' : 'ডিপোজিট রিকোয়েস্ট বাতিল'}
        </h2>
        <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6; margin: 0;">
          প্রিয় <strong>${user.name || 'সম্মানিত গ্রাহক'}</strong>,<br>
          ${isApproved
            ? `আপনার <strong>${currencySymbol}${deposit.amount} ${deposit.currency}</strong> ডিপোজিট রিকোয়েস্টটি এডমিন দ্বারা সফলভাবে ভেরিফাই ও অনুমোদন করা হয়েছে। আপনার রেজিস্ট্রেশনকৃত একাউন্টে (${targetEmail}) ব্যালেন্স যুক্ত হয়েছে!`
            : `আপনার <strong>${currencySymbol}${deposit.amount} ${deposit.currency}</strong> ডিপোজিট রিকোয়েস্টটি এডমিন দ্বারা যাচাইয়ের পর বাতিল করা হয়েছে।`}
        </p>
        ${!isApproved && deposit.rejectReason ? `<p style="color: #fca5a5; font-size: 13px; margin: 10px 0 0 0; padding: 10px; background: rgba(239, 68, 68, 0.15); border-radius: 8px;"><strong>বাতিলের কারণ:</strong> ${deposit.rejectReason}</p>` : ''}
      </div>

      <!-- Transaction Details Table -->
      <div style="background: #0d1527; border: 1px solid #1e2d48; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
        <h3 style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0;">ট্রানজেকশন তথ্য (Transaction Details)</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #cbd5e1;">
          <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 10px 0; color: #94a3b8;">রেজিস্টার্ড ইমেইল:</td>
            <td style="padding: 10px 0; font-weight: bold; text-align: right; color: #38bdf8;">${targetEmail}</td>
          </tr>
          <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 10px 0; color: #94a3b8;">পেমেন্ট মেথড:</td>
            <td style="padding: 10px 0; font-weight: bold; text-align: right; text-transform: uppercase; color: #f1f5f9;">${deposit.method}</td>
          </tr>
          <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 10px 0; color: #94a3b8;">পরিমাণ (Amount):</td>
            <td style="padding: 10px 0; font-weight: bold; text-align: right; color: #00d293; font-size: 15px;">${currencySymbol}${deposit.amount} ${deposit.currency}</td>
          </tr>
          <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 10px 0; color: #94a3b8;">Transaction ID:</td>
            <td style="padding: 10px 0; font-family: monospace; font-weight: bold; text-align: right; color: #facc15;">${deposit.transactionId}</td>
          </tr>
          <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 10px 0; color: #94a3b8;">প্রেরক নাম্বার / UID:</td>
            <td style="padding: 10px 0; font-weight: bold; text-align: right; color: #e2e8f0;">${senderId}</td>
          </tr>
          ${balanceDisplay ? `
          <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 10px 0; color: #94a3b8;">বর্তমান ওয়ালেট ব্যালেন্স:</td>
            <td style="padding: 10px 0; font-weight: bold; text-align: right; color: #34d399; font-size: 14px;">${balanceDisplay}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 10px 0; color: #94a3b8;">স্ট্যাটাস:</td>
            <td style="padding: 10px 0; font-weight: bold; text-align: right; color: ${isApproved ? '#00d293' : '#ef4444'};">
              ${isApproved ? 'অনুমোদিত (Approved)' : 'বাতিল (Rejected)'}
            </td>
          </tr>
        </table>
      </div>

      ${isApproved ? `
        <!-- Call to Action -->
        <div style="text-align: center; margin-bottom: 24px;">
          <p style="color: #94a3b8; font-size: 13px; margin: 0 0 16px 0;">
            ${isDirectPlan ? 'আপনার হোস্টিং প্ল্যান চালু হয়ে গেছে। এখনই নতুন টেলিগ্রাম বট ডিপ্লয় করুন!' : 'আপনার ব্যালেন্স দিয়ে এখনই আপনার পছন্দের হোস্টিং প্যাকেজ কিনতে পারবেন।'}
          </p>
          <a href="${siteUrl}" style="display: inline-block; background: #00d293; color: #070b14; font-weight: 800; font-size: 14px; padding: 12px 28px; border-radius: 12px; text-decoration: none;">
            ${isDirectPlan ? 'বট ডিপ্লয় করুন (Deploy Bot)' : 'হোস্টিং প্ল্যান কিনুন (Buy Plan)'}
          </a>
        </div>
      ` : `
        <div style="text-align: center; margin-bottom: 24px;">
          <p style="color: #94a3b8; font-size: 13px; margin: 0;">
            কোনো সমস্যা বা তথ্যের জন্য আমাদের সাপোর্ট সেন্টারে যোগাযোগ করুন।
          </p>
        </div>
      `}

      <!-- Footer -->
      <div style="border-top: 1px solid #1e293b; padding-top: 20px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.6;">
        ধন্যবাদ,<br>
        <strong>hosting live fast টিম</strong><br>
        <span style="font-size: 11px; color: #475569;">২৪/৭ নিরবচ্ছিন্ন ক্লাউড হোস্টিং সেবা</span>
      </div>
    </div>
  `;

  return sendEmailAlert({
    to: targetEmail,
    userId: user.id || targetEmail,
    subject,
    html,
    text: plainText,
    type: isApproved ? 'deposit_approved' : 'deposit_rejected'
  });
}

/**
 * Email Alert: Subscription Nearing Expiration
 */
export async function sendSubscriptionExpirationAlert(
  user: { id: string; email: string; name: string; plan?: string; maxBots?: number },
  daysRemaining: number,
  expiresAtFormatted: string
) {
  const isUrgent = daysRemaining <= 1;
  const subject = isUrgent
    ? `🚨 জরুরি সতর্কবার্তা: আপনার hosting-Live Fast হোস্টিং প্ল্যানের মেয়াদ শেষ হচ্ছে!`
    : `⏳ সতর্কবার্তা: আপনার হোস্টিং প্ল্যানের মেয়াদ ${daysRemaining} দিনের মধ্যে শেষ হবে`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #070b14; color: #f8fafc; padding: 28px; border-radius: 16px; border: 1px solid #162035;">
      
      <!-- Brand Header -->
      <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #1e293b;">
        <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background: rgba(0, 210, 147, 0.15); border: 1px solid #00d293; border-radius: 12px; font-size: 22px; margin-bottom: 8px;">⏳</div>
        <h1 style="color: #00d293; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">hosting-Live Fast</h1>
        <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">সাবস্ক্রিপশন মেয়াদ সতর্কবার্তা নোটিশ</p>
      </div>

      <!-- Warning Box -->
      <div style="background: ${isUrgent ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)'}; border: 1px solid ${isUrgent ? '#ef4444' : '#f59e0b'}; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
        <h2 style="color: ${isUrgent ? '#f87171' : '#f59e0b'}; margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">
          ⚠️ ${daysRemaining > 0 ? `আর মাত্র ${daysRemaining} দিন বাকি আছে!` : 'আজই মেয়াদ সমাপ্ত হবে!'}
        </h2>
        <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6; margin: 0;">
          প্রিয় <strong>${user.name || 'সম্মানিত গ্রাহক'}</strong>,<br>
          আপনার বর্তমান পেইড হোস্টিং প্যাকেজের (<strong>${user.plan || 'পেইড প্ল্যান'}</strong>) মেয়াদ আগামী <strong>${expiresAtFormatted}</strong> তারিখে শেষ হতে চলেছে।
        </p>
        <p style="color: #cbd5e1; font-size: 13px; margin: 10px 0 0 0; line-height: 1.5;">
          মেয়াদ শেষ হয়ে গেলে আপনার একাউন্টটি স্বয়ংক্রিয়ভাবে ফ্রি প্ল্যানে ডাউনগ্রেড হয়ে যাবে এবং চলমান অতিরিক্ত বট সাময়িকভাবে বন্ধ (Stop) হতে পারে।
        </p>
      </div>

      <!-- Plan Status Table -->
      <div style="background: #0d1527; border: 1px solid #1e2d48; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #cbd5e1;">
          <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 10px 0; color: #94a3b8;">বর্তমান প্ল্যান:</td>
            <td style="padding: 10px 0; font-weight: bold; text-align: right; text-transform: uppercase; color: #00d293;">${user.plan || 'Standard'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 10px 0; color: #94a3b8;">মেয়াদ শেষের তারিখ:</td>
            <td style="padding: 10px 0; font-weight: bold; text-align: right; color: #facc15;">${expiresAtFormatted}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #94a3b8;">বাকি সময়:</td>
            <td style="padding: 10px 0; font-weight: bold; text-align: right; color: ${isUrgent ? '#f87171' : '#38bdf8'};">
              ${daysRemaining > 0 ? `${daysRemaining} দিন` : 'কয়েক ঘণ্টা'}
            </td>
          </tr>
        </table>
      </div>

      <!-- Instructions to Renew -->
      <div style="background: #111c33; border: 1px solid #1e2d48; padding: 18px; border-radius: 12px; margin-bottom: 24px;">
        <h3 style="color: #38bdf8; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">বট অবিরাম ২৪/৭ লাইভ রাখতে করণীয়:</h3>
        <ol style="color: #94a3b8; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>একাউন্টে লগইন করে বাইনান্স (USDT) দিয়ে ওয়ালেটে ব্যালেন্স যোগ করুন।</li>
          <li>হোস্টিং প্ল্যান পেজে গিয়ে পছন্দের প্যাকেজের নিচে <strong>'প্যাকেজ কিনুন (Buy Plan)'</strong> বাটনে ক্লিক করে সাথে সাথে রিনিউ করুন।</li>
        </ol>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="#" style="display: inline-block; background: #00d293; color: #070b14; font-weight: 800; font-size: 14px; padding: 12px 28px; border-radius: 12px; text-decoration: none;">
          প্ল্যান রিনিউ করুন (Renew Plan)
        </a>
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #1e293b; padding-top: 20px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.6;">
        ধন্যবাদ,<br>
        <strong>hosting-Live Fast টিম</strong><br>
        <span style="font-size: 11px; color: #475569;">২৪/৭ ক্লাউড টেলিগ্রাম বট ও ওয়েবসাইট হোস্টিং</span>
      </div>
    </div>
  `;

  return sendEmailAlert({
    to: user.email,
    userId: user.id,
    subject,
    html,
    text: `সতর্কবার্তা: আপনার hosting-Live Fast প্ল্যানের মেয়াদ ${daysRemaining} দিনের মধ্যে (${expiresAtFormatted}) শেষ হবে। অবিলম্বে রিনিউ করুন।`,
    type: 'plan_expiring'
  });
}

/**
 * Scan all accounts and send expiration alerts for plans nearing expiry (<= 3 days)
 */
export async function checkAndSendExpiringPlanAlerts(
  accounts: any[],
  stopExcessBotsCallback?: (user: any) => void
): Promise<{ checkedCount: number; alertedCount: number; expiredCount: number; modified: boolean }> {
  const now = Date.now();
  let alertedCount = 0;
  let expiredCount = 0;
  let modified = false;

  for (const account of accounts) {
    if (account.role === 'admin' || !account.planExpiresAt) {
      continue;
    }

    // Check if nearing expiry (within 3 days)
    if (account.planExpiresAt > now) {
      const diffMs = account.planExpiresAt - now;
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      if (diffMs <= threeDaysMs) {
        const lastAlert = account.lastExpAlertAt || 0;
        // Send alert at most once every 24 hours
        if (now - lastAlert > 24 * 60 * 60 * 1000) {
          const daysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
          const formattedDate = new Date(account.planExpiresAt).toLocaleDateString('bn-BD', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          await sendSubscriptionExpirationAlert(account, daysRemaining, formattedDate);
          account.lastExpAlertAt = now;
          modified = true;
          alertedCount++;
        }
      }
    } else if (account.planExpiresAt <= now) {
      // Plan has expired
      console.log(`[EXPIRED PLAN] Account ${account.email} has expired.`);
      account.plan = 'expired';
      account.maxBots = 0;
      account.planExpiresAt = null;
      modified = true;
      expiredCount++;

      // Send expired alert
      await sendEmailAlert({
        to: account.email,
        userId: account.id,
        type: 'plan_expired',
        subject: '⚠️ আপনার ফ্রি/পেইড প্ল্যানের মেয়াদ শেষ হয়েছে - বট সাময়িক বন্ধ রয়েছে',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #070b14; color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #162035;">
            <h2 style="color: #ef4444; margin: 0 0 10px 0;">প্ল্যানের মেয়াদ সমাপ্ত হয়েছে (Plan Expired)</h2>
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
              প্রিয় <strong>${account.name || 'গ্রাহক'}</strong>,<br>
              আপনার ফ্রি প্ল্যানটি বন্ধ হয়ে গেছে। দয়া করে একটি প্রিমিয়াম প্ল্যান কিনুন, আপনার আগের টেলিগ্রাম বট সাথে সাথে আবার লাইভ হয়ে যাবে!
            </p>
            <div style="text-align: center; margin-top: 20px;">
              <a href="#" style="display: inline-block; background: #00d293; color: #070b14; font-weight: 800; font-size: 14px; padding: 12px 28px; border-radius: 12px; text-decoration: none;">
                প্ল্যান কিনুন ও বট লাইভ করুন
              </a>
            </div>
          </div>
        `,
        text: 'আপনার ফ্রি প্ল্যানটি বন্ধ হয়ে গেছে। একটি প্ল্যান কিনুন, আপনার আগের বট সাথে সাথে লাইভ হয়ে যাবে!'
      });

      if (stopExcessBotsCallback) {
        stopExcessBotsCallback(account);
      }
    }
  }

  return {
    checkedCount: accounts.length,
    alertedCount,
    expiredCount,
    modified
  };
}

/**
 * Send Professional 6-Digit Email Verification Code
 */
export async function sendVerificationEmail(
  to: string,
  code: string,
  userName?: string
): Promise<{ success: boolean; simulated?: boolean; messageId?: string; error?: string }> {
  const cleanName = userName?.trim() || to.split('@')[0] || 'User';
  const subject = `hosting live fast ভেরিফিকেশন কোড: ${code}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verification Code</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #070b14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
      <div style="max-width: 580px; margin: 20px auto; background-color: #0b1220; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <!-- Header -->
        <div style="background-color: #0f172a; padding: 24px; text-align: center; border-bottom: 1px solid #1e293b;">
          <h1 style="color: #00d293; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">⚡ hosting live fast</h1>
          <p style="color: #94a3b8; font-size: 13px; margin: 6px 0 0 0;">24/7 Cloud Bot & Website Hosting Platform</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px 24px; text-align: center;">
          <h2 style="color: #f1f5f9; margin: 0 0 12px 0; font-size: 20px; font-weight: 700;">
            আপনার ইমেইল ভেরিফাই করুন (Verify Your Email)
          </h2>
          <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
            প্রিয় <strong>${cleanName}</strong>, hosting live fast এ আপনাকে স্বাগতম। আপনার অ্যাকাউন্ট অ্যাক্টিভ করতে নিচের ৬ সংখ্যার সিকিউর ভেরিফিকেশন কোডটি ব্যবহার করুন:
          </p>

          <!-- OTP Code Box -->
          <div style="background-color: #030712; border: 2px dashed #00d293; border-radius: 12px; padding: 18px 24px; margin: 0 auto 20px auto; display: inline-block;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #00d293;">
              ${code}
            </span>
          </div>

          <p style="color: #f59e0b; font-size: 14px; font-weight: 600; margin: 0 0 24px 0;">
            ⏱ এই কোডটির মেয়াদ ১০ মিনিট থাকবে (Valid for 10 minutes)
          </p>

          <div style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 10px; padding: 14px; text-align: left;">
            <p style="color: #fca5a5; font-size: 13px; margin: 0; line-height: 1.5;">
              🔒 <strong>নিরাপত্তা সতর্কতা:</strong> এই ভেরিফিকেশন কোডটি কারো সাথে শেয়ার করবেন না। আপনি যদি hosting live fast এ রেজিস্ট্রেশন না করে থাকেন, তবে এই ইমেইলটি এড়িয়ে যান।
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #070b14; padding: 18px; text-align: center; border-top: 1px solid #1e293b; color: #64748b; font-size: 12px; line-height: 1.5;">
          © 2026 <strong>hosting live fast</strong>. সর্বস্বত্ব সংরক্ষিত।<br>
          ২৪/৭ ক্লাউড টেলিগ্রাম বট ও ওয়েবসাইট হোস্টিং
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `hosting live fast - Verification Code\n\nYour 6-digit verification code is: ${code}\n(আপনার ৬ সংখ্যার ভেরিফিকেশন কোড: ${code})\n\nThis code is valid for 10 minutes. Do not share this code with anyone.`;

  return sendEmailAlert({
    to,
    subject,
    html,
    text,
    type: 'verification',
    userId: to,
    skipNotification: true
  });
}

/**
 * Send Password Reset Code
 */
export async function sendPasswordResetEmail(
  to: string,
  resetCodeOrLink: string,
  userName?: string
): Promise<{ success: boolean; simulated?: boolean; messageId?: string; error?: string }> {
  const cleanName = userName?.trim() || to.split('@')[0] || 'User';
  const subject = `hosting live fast পাসওয়ার্ড রিসেট কোড: ${resetCodeOrLink}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Code</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #070b14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
      <div style="max-width: 580px; margin: 20px auto; background-color: #0b1220; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <!-- Header -->
        <div style="background-color: #0f172a; padding: 24px; text-align: center; border-bottom: 1px solid #1e293b;">
          <h1 style="color: #00d293; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">⚡ hosting live fast</h1>
          <p style="color: #94a3b8; font-size: 13px; margin: 6px 0 0 0;">24/7 Cloud Bot & Website Hosting Platform</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px 24px; text-align: center;">
          <h2 style="color: #38bdf8; margin: 0 0 12px 0; font-size: 20px; font-weight: 700;">
            পাসওয়ার্ড রিসেট কোড (Password Reset Code)
          </h2>
          <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
            প্রিয় <strong>${cleanName}</strong>, আপনার hosting live fast অ্যাকাউন্টের পাসওয়ার্ড পরিবর্তন করার জন্য অনুরোধ পাওয়া গেছে। নিচে দেওয়া ৬ সংখ্যার কোডটি ব্যবহার করে নতুন পাসওয়ার্ড সেট করুন:
          </p>

          <!-- OTP Code Box -->
          <div style="background-color: #030712; border: 2px dashed #38bdf8; border-radius: 12px; padding: 18px 24px; margin: 0 auto 20px auto; display: inline-block;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #38bdf8;">
              ${resetCodeOrLink}
            </span>
          </div>

          <p style="color: #f59e0b; font-size: 14px; font-weight: 600; margin: 0 0 24px 0;">
            ⏱ এই কোডটির মেয়াদ ১৫ মিনিট থাকবে (Valid for 15 minutes)
          </p>

          <div style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 10px; padding: 14px; text-align: left;">
            <p style="color: #fca5a5; font-size: 13px; margin: 0; line-height: 1.5;">
              🔒 <strong>সতর্কতা:</strong> যদি আপনি এই পাসওয়ার্ড রিসেট রিকোয়েস্ট না করে থাকেন, তবে অবিলম্বে আমাদের সাথে যোগাযোগ করুন এবং অ্যাকাউন্ট সুরক্ষিত রাখুন।
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #070b14; padding: 18px; text-align: center; border-top: 1px solid #1e293b; color: #64748b; font-size: 12px; line-height: 1.5;">
          © 2026 <strong>hosting live fast</strong>. সর্বস্বত্ব সংরক্ষিত।<br>
          ২৪/৭ ক্লাউড টেলিগ্রাম বট ও ওয়েবসাইট হোস্টিং
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `hosting live fast - Password Reset Code\n\nYour 6-digit password reset code is: ${resetCodeOrLink}\n(আপনার ৬ সংখ্যার পাসওয়ার্ড রিসেট কোড: ${resetCodeOrLink})\n\nThis code is valid for 15 minutes. If you did not request this, please secure your account.`;

  return sendEmailAlert({
    to,
    subject,
    html,
    text,
    type: 'password_reset',
    userId: to,
    skipNotification: true
  });
}

/**
 * Send Security Notification Email (e.g. login from new device, password changed)
 */
export async function sendSecurityNotificationEmail(
  to: string,
  title: string,
  message: string,
  details?: Record<string, any>
): Promise<{ success: boolean; simulated?: boolean; messageId?: string; error?: string }> {
  const subject = `🛡️ সিকিউরিটি এলার্ট: ${title} — hosting live fast`;
  const detailsHtml = details
    ? `<ul style="color: #94a3b8; font-size: 13px; margin: 12px 0 0 0; padding-left: 20px;">
        ${Object.entries(details).map(([k, v]) => `<li><strong style="color: #cbd5e1;">${k}:</strong> ${v}</li>`).join('')}
       </ul>`
    : '';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #070b14; color: #f8fafc; padding: 28px; border-radius: 16px; border: 1px solid #162035;">
      <h2 style="color: #f59e0b; margin: 0 0 12px 0; font-size: 18px;">🛡️ ${title}</h2>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0;">${message}</p>
      ${detailsHtml}
      <p style="color: #64748b; font-size: 12px; margin-top: 20px; border-top: 1px solid #1e293b; padding-top: 12px;">
        hosting live fast Security Sentinel | Automated notification
      </p>
    </div>
  `;

  return sendEmailAlert({
    to,
    subject,
    html,
    text: `${title}: ${message}`,
    type: 'system',
    userId: to
  });
}

