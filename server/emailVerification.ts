import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { sendVerificationEmail, sendPasswordResetEmail } from './emailAlerts';

const HOSTED_BOTS_DIR = path.join(process.cwd(), 'hosted_bots');
const VERIFICATIONS_FILE = path.join(HOSTED_BOTS_DIR, 'email_verifications.json');
const PASSWORD_RESETS_FILE = path.join(HOSTED_BOTS_DIR, 'password_resets.json');

// Secret salt for HMAC hashing verification codes
const VERIFICATION_SECRET = process.env.VERIFICATION_SECRET || 'hlf_email_verify_secret_key_2026';

export interface VerificationRecord {
  email: string;
  codeHash: string;
  expiresAt: number; // timestamp ms (10 minutes)
  attempts: number; // max 5 attempts
  lastSentAt: number; // rate limit resend (60s)
  createdAt: number;
}

function loadVerifications(): Record<string, VerificationRecord> {
  try {
    if (!fs.existsSync(HOSTED_BOTS_DIR)) {
      fs.mkdirSync(HOSTED_BOTS_DIR, { recursive: true });
    }
    if (fs.existsSync(VERIFICATIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(VERIFICATIONS_FILE, 'utf-8'));
      return data || {};
    }
  } catch (err) {
    console.error('Error loading email_verifications.json:', err);
  }
  return {};
}

function saveVerifications(records: Record<string, VerificationRecord>): void {
  try {
    if (!fs.existsSync(HOSTED_BOTS_DIR)) {
      fs.mkdirSync(HOSTED_BOTS_DIR, { recursive: true });
    }
    fs.writeFileSync(VERIFICATIONS_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving email_verifications.json:', err);
  }
}

function hashCode(email: string, code: string): string {
  return crypto
    .createHmac('sha256', VERIFICATION_SECRET)
    .update(`${email.toLowerCase()}:${code}`)
    .digest('hex');
}

/**
 * Generate and send a 6-digit verification code to the target email
 */
export async function createAndSendVerificationCode(
  email: string,
  userName?: string
): Promise<{ success: boolean; error?: string; remainingSeconds?: number }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'সঠিক ইমেইল ঠিকানা প্রদান করুন (Invalid email format)' };
  }

  const verifications = loadVerifications();
  const existing = verifications[cleanEmail];
  const now = Date.now();

  // Enforce 60-second cooldown between resend requests
  if (existing && existing.lastSentAt && now - existing.lastSentAt < 60000) {
    const remainingSeconds = Math.ceil((60000 - (now - existing.lastSentAt)) / 1000);
    return {
      success: false,
      error: `অনুগ্রহ করে ${remainingSeconds} সেকেন্ড অপেক্ষা করে পুনরায় চেষ্টা করুন (Cooldown active)`,
      remainingSeconds
    };
  }

  // Generate secure 6-digit numeric verification code (100000 - 999999)
  const code = crypto.randomInt(100000, 1000000).toString();
  const codeHash = hashCode(cleanEmail, code);
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes expiration

  verifications[cleanEmail] = {
    email: cleanEmail,
    codeHash,
    expiresAt,
    attempts: 0,
    lastSentAt: now,
    createdAt: now
  };
  saveVerifications(verifications);

  // Send the professional HTML email
  try {
    const emailResult = await sendVerificationEmail(cleanEmail, code, userName);
    if (!emailResult.success && !emailResult.simulated) {
      console.warn(`[VERIFICATION EMAIL WARNING] Failed to deliver real SMTP email to ${cleanEmail}: ${emailResult.error}`);
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error in sendVerificationEmail:', err);
    return { success: true }; // Proceed so user is not blocked if dev SMTP is not set
  }
}

/**
 * Verify 6-digit code for the specified email
 */
export function verifyEmailCode(
  email: string,
  code: string
): { success: boolean; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = (code || '').trim().replace(/\s+/g, '');

  if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    return { success: false, error: '৬ সংখ্যার সঠিক কোড লিখুন (Enter valid 6-digit code)' };
  }

  const verifications = loadVerifications();
  const record = verifications[cleanEmail];

  if (!record) {
    return { success: false, error: 'কোনো ভেরিফিকেশন কোড পাওয়া যায়নি। অনুগ্রহ করে পুনরায় কোড পাঠান।' };
  }

  const now = Date.now();
  if (now > record.expiresAt) {
    delete verifications[cleanEmail];
    saveVerifications(verifications);
    return { success: false, error: 'ভেরিফিকেশন কোডের মেয়াদ শেষ হয়েছে (১০ মিনিট অতিক্রান্ত)। নতুন কোড নিন।' };
  }

  // Attempt limit protection (max 5 incorrect attempts)
  if (record.attempts >= 5) {
    delete verifications[cleanEmail];
    saveVerifications(verifications);
    return { success: false, error: 'অতিরিক্ত ভুল চেষ্টার কারণে কোডটি বাতিল করা হয়েছে। অনুগ্রহ করে নতুন কোড নিন।' };
  }

  const expectedHash = hashCode(cleanEmail, cleanCode);
  if (record.codeHash !== expectedHash) {
    record.attempts += 1;
    saveVerifications(verifications);
    const remainingAttempts = 5 - record.attempts;
    return {
      success: false,
      error: `ভুল ভেরিফিকেশন কোড! আর ${remainingAttempts} বার চেষ্টা করা যাবে।`
    };
  }

  // Code is valid! Clean up verification record
  delete verifications[cleanEmail];
  saveVerifications(verifications);

  return { success: true };
}

function loadPasswordResets(): Record<string, VerificationRecord> {
  try {
    if (!fs.existsSync(HOSTED_BOTS_DIR)) {
      fs.mkdirSync(HOSTED_BOTS_DIR, { recursive: true });
    }
    if (fs.existsSync(PASSWORD_RESETS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PASSWORD_RESETS_FILE, 'utf-8'));
      return data || {};
    }
  } catch (err) {
    console.error('Error loading password_resets.json:', err);
  }
  return {};
}

function savePasswordResets(records: Record<string, VerificationRecord>): void {
  try {
    if (!fs.existsSync(HOSTED_BOTS_DIR)) {
      fs.mkdirSync(HOSTED_BOTS_DIR, { recursive: true });
    }
    fs.writeFileSync(PASSWORD_RESETS_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving password_resets.json:', err);
  }
}

/**
 * Generate and send a 6-digit password reset code to the target email
 */
export async function createAndSendPasswordResetCode(
  email: string,
  userName?: string
): Promise<{ success: boolean; error?: string; remainingSeconds?: number }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'সঠিক ইমেইল ঠিকানা প্রদান করুন (Invalid email format)' };
  }

  const resets = loadPasswordResets();
  const existing = resets[cleanEmail];
  const now = Date.now();

  // Enforce 60-second cooldown between resend requests
  if (existing && existing.lastSentAt && now - existing.lastSentAt < 60000) {
    const remainingSeconds = Math.ceil((60000 - (now - existing.lastSentAt)) / 1000);
    return {
      success: false,
      error: `অনুগ্রহ করে ${remainingSeconds} সেকেন্ড অপেক্ষা করে পুনরায় চেষ্টা করুন (Cooldown active)`,
      remainingSeconds
    };
  }

  // Generate secure 6-digit numeric verification code (100000 - 999999)
  const code = crypto.randomInt(100000, 1000000).toString();
  const codeHash = hashCode(cleanEmail, code);
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes expiration

  resets[cleanEmail] = {
    email: cleanEmail,
    codeHash,
    expiresAt,
    attempts: 0,
    lastSentAt: now,
    createdAt: now
  };
  savePasswordResets(resets);

  // Send the professional HTML email
  try {
    const emailResult = await sendPasswordResetEmail(cleanEmail, code, userName);
    if (!emailResult.success && !emailResult.simulated) {
      console.warn(`[PASSWORD RESET EMAIL WARNING] Failed to deliver real SMTP email to ${cleanEmail}: ${emailResult.error}`);
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error in sendPasswordResetEmail:', err);
    return { success: true };
  }
}

/**
 * Verify 6-digit password reset code for the specified email
 */
export function verifyPasswordResetCode(
  email: string,
  code: string
): { success: boolean; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = (code || '').trim().replace(/\s+/g, '');

  if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    return { success: false, error: '৬ সংখ্যার সঠিক রিসেট কোড লিখুন (Enter valid 6-digit code)' };
  }

  const resets = loadPasswordResets();
  const record = resets[cleanEmail];

  if (!record) {
    return { success: false, error: 'কোনো রিসেট কোড পাওয়া যায়নি বা মেয়াদোত্তীর্ণ হয়েছে। অনুগ্রহ করে পুনরায় কোড পাঠান।' };
  }

  const now = Date.now();
  if (now > record.expiresAt) {
    delete resets[cleanEmail];
    savePasswordResets(resets);
    return { success: false, error: 'রিসেট কোডের মেয়াদ শেষ হয়েছে (১০ মিনিট অতিক্রান্ত)। অনুগ্রহ করে নতুন কোড নিন।' };
  }

  // Attempt limit protection (max 5 incorrect attempts)
  if (record.attempts >= 5) {
    delete resets[cleanEmail];
    savePasswordResets(resets);
    return { success: false, error: 'অতিরিক্ত ভুল চেষ্টার কারণে রিসেট কোডটি বাতিল করা হয়েছে। নতুন কোড নিন।' };
  }

  const expectedHash = hashCode(cleanEmail, cleanCode);
  if (record.codeHash !== expectedHash) {
    record.attempts += 1;
    savePasswordResets(resets);
    const remainingAttempts = 5 - record.attempts;
    return {
      success: false,
      error: `ভুল রিসেট কোড! আর ${remainingAttempts} বার চেষ্টা করা যাবে।`
    };
  }

  // Code is valid! Clean up reset record
  delete resets[cleanEmail];
  savePasswordResets(resets);

  return { success: true };
}

