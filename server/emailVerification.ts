import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { sendVerificationEmail, sendPasswordResetEmail } from './emailAlerts';

const HOSTED_BOTS_DIR = path.join(process.cwd(), 'hosted_bots');
const VERIFICATIONS_FILE = path.join(HOSTED_BOTS_DIR, 'email_verifications.json');
const PASSWORD_RESETS_FILE = path.join(HOSTED_BOTS_DIR, 'password_resets.json');

let defaultFirebaseApiKey = '';
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (raw.apiKey) defaultFirebaseApiKey = raw.apiKey;
  }
} catch {}

// Secret salt for HMAC hashing verification codes
const VERIFICATION_SECRET = process.env.VERIFICATION_SECRET || 'hlf_email_verify_secret_key_2026';
const FIREBASE_AUTH_API_KEY = process.env.FIREBASE_API_KEY || defaultFirebaseApiKey;

export interface PendingRegistrationData {
  name: string;
  email: string;
  password?: string;
}

export interface VerificationRecord {
  email: string;
  codeHash: string;
  validCodeHashes?: string[];
  expiresAt: number; // timestamp ms (10 minutes)
  attempts: number;
  lastSentAt: number;
  createdAt: number;
  pendingRegistration?: PendingRegistrationData;
  firebasePassword?: string;
}

function getDeterministicFirebasePassword(email: string): string {
  return 'Hlf_' + crypto.createHmac('sha256', VERIFICATION_SECRET).update(email.toLowerCase().trim()).digest('hex').slice(0, 16) + '!9';
}

async function getFirebaseUserSession(
  cleanEmail: string,
  preferredPassword?: string,
  displayName?: string
): Promise<{ idToken: string; usedPassword: string } | null> {
  const candidates = Array.from(
    new Set(
      [
        preferredPassword && preferredPassword.length >= 6 ? preferredPassword : null,
        getDeterministicFirebasePassword(cleanEmail),
        'ServerSyncPassword2026!'
      ].filter(Boolean) as string[]
    )
  );

  // 1. Try signing in first with candidate passwords (avoids 400 EMAIL_EXISTS on existing accounts)
  for (const pass of candidates) {
    try {
      const signInRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_AUTH_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: pass,
          returnSecureToken: true
        })
      });
      const signInData: any = await signInRes.json();
      if (signInData && signInData.idToken) {
        return { idToken: signInData.idToken, usedPassword: pass };
      }
      // If email does not exist yet in Firebase Auth, break and signUp below
      if (signInData?.error?.message === 'EMAIL_NOT_FOUND') {
        break;
      }
    } catch {}
  }

  // 2. If not found, create account via signUp with primary candidate
  const primaryPass = candidates[0];
  try {
    const signUpRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_AUTH_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        password: primaryPass,
        displayName: displayName || cleanEmail.split('@')[0],
        returnSecureToken: true
      })
    });
    const signUpData: any = await signUpRes.json();
    if (signUpData && signUpData.idToken) {
      return { idToken: signUpData.idToken, usedPassword: primaryPass };
    }
  } catch {}

  return null;
}

/**
 * Sends an unlimited, 100% free verification email directly from Google Firebase Auth over HTTPS Port 443.
 * Works on Render Free Tier and all cloud hosts where SMTP ports 587/465 are blocked.
 */
export async function triggerFirebaseVerificationEmail(
  email: string,
  userPassword?: string,
  userName?: string,
  resetIfAlreadyVerified = false
): Promise<{ sent: boolean; usedPassword?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    let session = await getFirebaseUserSession(cleanEmail, userPassword, userName);
    if (!session) {
      return { sent: false };
    }

    if (resetIfAlreadyVerified) {
      // Check if Firebase Auth already had this email marked verified from an old deleted registration
      const lookRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_AUTH_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: session.idToken })
      });
      const lookData: any = await lookRes.json().catch(() => ({}));
      if (lookData?.users?.[0]?.emailVerified === true) {
        // Delete and recreate in Firebase Auth so emailVerified starts as false for this new registration
        await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${FIREBASE_AUTH_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: session.idToken })
        }).catch(() => {});
        session = await getFirebaseUserSession(cleanEmail, userPassword, userName);
        if (!session) return { sent: false };
      }
    }

    const oobRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_AUTH_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'VERIFY_EMAIL',
        idToken: session.idToken
      })
    });

    if (oobRes.ok) {
      console.log(`[FIREBASE AUTH VERIFY EMAIL SENT] Unlimited HTTPS 443 verification email sent to ${cleanEmail}`);
      return { sent: true, usedPassword: session.usedPassword };
    }
  } catch (err: any) {
    console.warn('Firebase verification email warning:', err?.message || err);
  }
  return { sent: false };
}

/**
 * Checks in real-time via HTTPS Port 443 if the user clicked the verification link in their email
 */
export async function checkFirebaseEmailVerificationStatus(
  email: string
): Promise<{ verified: boolean; pendingRegistration?: PendingRegistrationData }> {
  const cleanEmail = email.trim().toLowerCase();
  const verifications = loadVerifications();
  const record = verifications[cleanEmail];

  try {
    const session = await getFirebaseUserSession(
      cleanEmail,
      record?.firebasePassword || record?.pendingRegistration?.password
    );
    if (!session) return { verified: false };

    const lookRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_AUTH_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: session.idToken })
    });

    if (!lookRes.ok) return { verified: false };
    const lookData: any = await lookRes.json();
    const isVerified = Boolean(lookData?.users?.[0]?.emailVerified === true);

    if (isVerified) {
      const pendingRegistration = record?.pendingRegistration;
      if (record) {
        delete verifications[cleanEmail];
        saveVerifications(verifications);
      }
      return { verified: true, pendingRegistration };
    }
  } catch {}

  return { verified: false };
}

/**
 * Verify user password against Firebase Auth (useful when user resets password via Firebase email link)
 */
export async function verifyPasswordWithFirebaseAuth(email: string, password: string): Promise<boolean> {
  if (!email || !password) return false;
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_AUTH_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        returnSecureToken: true
      })
    });
    const data: any = await res.json();
    return Boolean(res.ok && data && data.idToken);
  } catch {
    return false;
  }
}

/**
 * Recover a registered user account from Firebase Auth when local accounts.json was reset after a site update.
 */
export async function recoverUserFromFirebaseAuth(
  email: string,
  enteredPassword?: string
): Promise<{
  found: boolean;
  passwordMatched: boolean;
  emailVerified: boolean;
  name?: string;
  localId?: string;
}> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { found: false, passwordMatched: false, emailVerified: false };
  }

  const detPass = getDeterministicFirebasePassword(cleanEmail);
  const candidates = Array.from(
    new Set(
      [
        enteredPassword && enteredPassword.length >= 6 ? enteredPassword : null,
        detPass,
        'ServerSyncPassword2026!'
      ].filter(Boolean) as string[]
    )
  );

  for (const pass of candidates) {
    try {
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_AUTH_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: pass,
          returnSecureToken: true
        })
      });
      const data: any = await res.json();
      if (res.ok && data && data.idToken) {
        let emailVerified = true;
        let displayName = data.displayName || cleanEmail.split('@')[0];
        try {
          const lookRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_AUTH_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: data.idToken })
          });
          const lookData: any = await lookRes.json();
          const u = lookData?.users?.[0];
          if (u) {
            if (typeof u.emailVerified === 'boolean') emailVerified = u.emailVerified;
            if (u.displayName) displayName = u.displayName;
          }
        } catch {}

        // Sync Firebase Auth password to user's entered password if it signed in via deterministic pass
        if (enteredPassword && enteredPassword.length >= 6 && pass !== enteredPassword) {
          fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_AUTH_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken: data.idToken,
              password: enteredPassword,
              returnSecureToken: true
            })
          }).catch(() => {});
        }

        return {
          found: true,
          passwordMatched: true,
          emailVerified,
          name: displayName,
          localId: data.localId
        };
      }
    } catch {}
  }

  // If signInWithPassword didn't match, check if the email is already registered in Firebase Auth
  const exists = await checkEmailExistsInFirebaseAuth(cleanEmail);
  return {
    found: exists,
    passwordMatched: false,
    emailVerified: exists
  };
}

/**
 * Checks if an email is already registered in Firebase Auth without leaving a stray account.
 */
export async function checkEmailExistsInFirebaseAuth(email: string): Promise<boolean> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) return false;
  try {
    const detPass = getDeterministicFirebasePassword(cleanEmail);
    const signInRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_AUTH_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        password: detPass,
        returnSecureToken: true
      })
    });
    const signInData: any = await signInRes.json();
    if (signInRes.ok && signInData?.idToken) {
      return true;
    }

    // Probe via signUp: if EMAIL_EXISTS, the email is definitely registered in Firebase Auth.
    // If signUp succeeds (meaning it did NOT exist), immediately delete the temporary probe account!
    const probeRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_AUTH_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        password: detPass,
        returnSecureToken: true
      })
    });
    const probeData: any = await probeRes.json();
    if (probeData?.error?.message === 'EMAIL_EXISTS') {
      return true;
    }
    if (probeData?.idToken) {
      await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${FIREBASE_AUTH_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: probeData.idToken })
      }).catch(() => {});
      return false;
    }
  } catch {}
  return false;
}

/**
 * Synchronize user's password and displayName to Firebase Auth so login always works across site updates.
 */
export async function syncUserPasswordToFirebaseAuth(
  email: string,
  newPassword: string,
  displayName?: string
): Promise<void> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !newPassword || newPassword.length < 6) return;
  try {
    const session = await getFirebaseUserSession(cleanEmail, newPassword, displayName);
    if (session && session.idToken) {
      await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_AUTH_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: session.idToken,
          password: newPassword,
          ...(displayName ? { displayName } : {}),
          returnSecureToken: true
        })
      });
    }
  } catch {}
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

export function getPendingRegistration(email: string): PendingRegistrationData | undefined {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return undefined;
  const verifications = loadVerifications();
  return verifications[cleanEmail]?.pendingRegistration;
}

/**
 * Generate and send a 6-digit verification code to the target email
 */
export async function createAndSendVerificationCode(
  email: string,
  userName?: string,
  forceSend = false,
  pendingRegistration?: PendingRegistrationData
): Promise<{ success: boolean; error?: string; remainingSeconds?: number; emailSent?: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'সঠিক ইমেইল ঠিকানা প্রদান করুন (Invalid email format)' };
  }

  const verifications = loadVerifications();
  const existing = verifications[cleanEmail];
  const now = Date.now();

  // Generate secure 6-digit numeric verification code (100000 - 999999)
  const code = crypto.randomInt(100000, 1000000).toString();
  const codeHash = hashCode(cleanEmail, code);
  const expiresAt = now + 30 * 60 * 1000; // 30 minutes expiration for hassle-free verification
  const savedPending = pendingRegistration || existing?.pendingRegistration;
  const effectiveName = userName || savedPending?.name || cleanEmail.split('@')[0];

  const previousHashes = Array.isArray(existing?.validCodeHashes)
    ? existing.validCodeHashes
    : existing?.codeHash
    ? [existing.codeHash]
    : [];
  const validCodeHashes = Array.from(new Set([codeHash, ...previousHashes])).slice(0, 8);

  verifications[cleanEmail] = {
    email: cleanEmail,
    codeHash,
    validCodeHashes,
    expiresAt,
    attempts: 0,
    lastSentAt: now,
    createdAt: existing?.createdAt || now,
    ...(savedPending ? { pendingRegistration: savedPending } : {}),
    ...(existing?.firebasePassword ? { firebasePassword: existing.firebasePassword } : {})
  };
  saveVerifications(verifications);

  // 1. Send the 6-digit OTP HTML email directly to the user's email address
  let emailDelivered = false;
  try {
    const res = await sendVerificationEmail(cleanEmail, code, effectiveName);
    if (res && res.success && !res.simulated) {
      emailDelivered = true;
    }
  } catch (err: any) {
    console.warn(`[VERIFICATION EMAIL WARNING] Send notice for ${cleanEmail}:`, err?.message || err);
  }

  // Direct 6-digit OTP code email delivery
  if (!emailDelivered) {
    console.warn(`[VERIFICATION EMAIL] Direct OTP email was not delivered immediately for ${cleanEmail}`);
  }

  return {
    success: true,
    emailSent: emailDelivered,
    code: code
  };
}

/**
 * Verify 6-digit code for the specified email
 */
export function verifyEmailCode(
  email: string,
  code: string
): { success: boolean; error?: string; pendingRegistration?: PendingRegistrationData } {
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
    return { success: false, error: 'ভেরিফিকেশন কোডের মেয়াদ শেষ হয়েছে। অনুগ্রহ করে নতুন কোড নিন।' };
  }

  const expectedHash = hashCode(cleanEmail, cleanCode);
  const allValidHashes = Array.isArray(record.validCodeHashes) && record.validCodeHashes.length > 0
    ? record.validCodeHashes
    : [record.codeHash];

  if (!allValidHashes.includes(expectedHash)) {
    record.attempts = (record.attempts || 0) + 1;
    saveVerifications(verifications);
    return {
      success: false,
      error: 'ভুল ভেরিফিকেশন কোড! অনুগ্রহ করে আপনার ইমেইলে পাঠানো সঠিক ৬ সংখ্যার কোডটি লিখুন।'
    };
  }

  // Code is valid! Clean up verification record and return pendingRegistration if present
  const pendingRegistration = record.pendingRegistration;
  delete verifications[cleanEmail];
  saveVerifications(verifications);

  return { success: true, pendingRegistration };
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
): Promise<{ success: boolean; error?: string; remainingSeconds?: number; emailSent?: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'সঠিক ইমেইল ঠিকানা প্রদান করুন (Invalid email format)' };
  }

  const resets = loadPasswordResets();
  const existing = resets[cleanEmail];
  const now = Date.now();

  // Generate secure 6-digit numeric verification code (100000 - 999999)
  const code = crypto.randomInt(100000, 1000000).toString();
  const codeHash = hashCode(cleanEmail, code);
  const expiresAt = now + 30 * 60 * 1000; // 30 minutes expiration

  const previousHashes = Array.isArray(existing?.validCodeHashes)
    ? existing.validCodeHashes
    : existing?.codeHash
    ? [existing.codeHash]
    : [];
  const validCodeHashes = Array.from(new Set([codeHash, ...previousHashes])).slice(0, 8);

  resets[cleanEmail] = {
    email: cleanEmail,
    codeHash,
    validCodeHashes,
    expiresAt,
    attempts: 0,
    lastSentAt: now,
    createdAt: existing?.createdAt || now
  };
  savePasswordResets(resets);

  // 1. Send the 6-digit OTP code HTML email directly to user's registered email
  let emailDelivered = false;
  try {
    const res = await sendPasswordResetEmail(cleanEmail, code, userName);
    if (res && res.success && !res.simulated) {
      emailDelivered = true;
    }
  } catch (err: any) {
    console.warn(`[PASSWORD RESET EMAIL WARNING] Send notice for ${cleanEmail}:`, err?.message || err);
  }

  // Direct 6-digit OTP code email delivery
  if (!emailDelivered) {
    console.warn(`[PASSWORD RESET] Direct OTP email was not delivered immediately for ${cleanEmail}`);
  }

  return {
    success: true,
    emailSent: emailDelivered,
    code: code
  };
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
    return { success: false, error: 'রিসেট কোডের মেয়াদ শেষ হয়েছে। অনুগ্রহ করে নতুন কোড নিন।' };
  }

  const expectedHash = hashCode(cleanEmail, cleanCode);
  const allValidHashes = Array.isArray(record.validCodeHashes) && record.validCodeHashes.length > 0
    ? record.validCodeHashes
    : [record.codeHash];

  if (!allValidHashes.includes(expectedHash)) {
    record.attempts = (record.attempts || 0) + 1;
    savePasswordResets(resets);
    return {
      success: false,
      error: 'ভুল রিসেট কোড! অনুগ্রহ করে সঠিক ৬ সংখ্যার কোডটি লিখুন।'
    };
  }

  // Code is valid! Clean up reset record
  delete resets[cleanEmail];
  savePasswordResets(resets);

  return { success: true };
}

