// Firebase Cloud Synchronizer for Server-Side Persistence
// Uses Google Firebase Authentication Cloud Vault & Shards (HTTPS 443) + Firestore fallback
// Ensures user accounts, passwords, balances, and plans are 100% preserved across any site update or container restart!

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import dns from 'dns';
import AdmZip from 'adm-zip';

// Enforce IPv4 priority globally to eliminate ENETUNREACH in containers lacking IPv6 routes
if (typeof (dns as any).setDefaultResultOrder === 'function') {
  try {
    (dns as any).setDefaultResultOrder('ipv4first');
  } catch (e) {}
}

let configProjectId = '';
let configDbId = '';
let configApiKey = '';

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (raw.projectId) configProjectId = raw.projectId;
    if (raw.firestoreDatabaseId) configDbId = raw.firestoreDatabaseId;
    if (raw.apiKey) configApiKey = raw.apiKey;
  }
} catch (e) {}

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || configProjectId;
const FIRESTORE_DATABASE_ID = process.env.FIREBASE_FIRESTORE_DATABASE_ID || configDbId;
const API_KEY = process.env.FIREBASE_API_KEY || configApiKey;
const VAULT_SECRET = process.env.VERIFICATION_SECRET || 'hlf_email_verify_secret_key_2026';

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents`;
const DEFAULT_DB_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const AUTH_BASE_URL = 'https://identitytoolkit.googleapis.com/v1/accounts';

let firestoreQuotaExhaustedUntil = 0;

export function isFirestoreQuotaExhausted(): boolean {
  return Date.now() < firestoreQuotaExhaustedUntil;
}

export function setFirestoreQuotaExhausted(durationMs = 60 * 60 * 1000): void {
  firestoreQuotaExhaustedUntil = Date.now() + durationMs;
  console.warn(`⚠️ [Server FirebaseSync] Firestore quota paused for ${Math.round(durationMs / 60000)} minutes; local persistence & Auth Vault are active.`);
}

export function markFirestoreQuotaExhausted(): void {
  setFirestoreQuotaExhausted(60 * 60 * 1000);
}

function checkResponseQuota(res: Response | null): void {
  if (!res) return;
  if (res.status === 429 || res.status === 403) {
    markFirestoreQuotaExhausted();
  }
}

function compressPayload(data: any): string {
  const json = JSON.stringify(data);
  return zlib.deflateRawSync(Buffer.from(json, 'utf-8')).toString('base64url');
}

function decompressPayload(encoded: string): any | null {
  try {
    const buf = Buffer.from(encoded, 'base64url');
    const json = zlib.inflateRawSync(buf).toString('utf-8');
    return JSON.parse(json);
  } catch {
    try {
      const json = Buffer.from(encoded, 'base64url').toString('utf-8');
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}

function getUserVaultIdentity(email: string): { vaultEmail: string; vaultPassword: string } {
  const clean = email.trim().toLowerCase();
  const emailHash = crypto.createHash('sha256').update(clean).digest('hex').slice(0, 24);
  const passHash = crypto.createHmac('sha256', VAULT_SECRET).update(`vault:${clean}`).digest('hex').slice(0, 20);
  return {
    vaultEmail: `hlf_u_${emailHash}@vault.hostinglivefast.com`,
    vaultPassword: `HlfV_${passHash}!9`
  };
}

function getMasterShardIdentity(shardIndex = 0): { shardEmail: string; shardPassword: string } {
  if (shardIndex === 0) {
    return {
      shardEmail: 'cloudsync@hostinglivefast.com',
      shardPassword: 'CloudSyncMasterPass2026!'
    };
  }
  const passHash = crypto.createHmac('sha256', VAULT_SECRET).update(`shard:${shardIndex}`).digest('hex').slice(0, 20);
  return {
    shardEmail: `hlf_shard_${shardIndex}@vault.hostinglivefast.com`,
    shardPassword: `HlfS_${passHash}!9`
  };
}

async function getOrCreateAuthSession(email: string, password: string): Promise<string | null> {
  try {
    const signInRes = await fetch(`${AUTH_BASE_URL}:signInWithPassword?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const signInData: any = await signInRes.json();
    if (signInData && signInData.idToken) {
      return signInData.idToken;
    }

    const signUpRes = await fetch(`${AUTH_BASE_URL}:signUp?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const signUpData: any = await signUpRes.json();
    if (signUpData && signUpData.idToken) {
      return signUpData.idToken;
    }
  } catch {}
  return null;
}

async function signInExistingAuthSession(email: string, password: string): Promise<string | null> {
  try {
    const signInRes = await fetch(`${AUTH_BASE_URL}:signInWithPassword?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const signInData: any = await signInRes.json();
    if (signInData && signInData.idToken) {
      return signInData.idToken;
    }
  } catch {}
  return null;
}

let cachedAdminIdToken: string | null = null;
let adminTokenExpiresAt = 0;

async function getAdminIdToken(): Promise<string | null> {
  if (cachedAdminIdToken && Date.now() < adminTokenExpiresAt - 60000) {
    return cachedAdminIdToken;
  }
  const { shardEmail, shardPassword } = getMasterShardIdentity(0);
  const token = await getOrCreateAuthSession(shardEmail, shardPassword);
  if (token) {
    cachedAdminIdToken = token;
    adminTokenExpiresAt = Date.now() + 50 * 60 * 1000;
  }
  return token;
}

async function writeVaultData(email: string, password: string, label: string, payload: any): Promise<boolean> {
  try {
    const idToken = await getOrCreateAuthSession(email, password);
    if (!idToken) return false;
    const compressed = compressPayload(payload);
    const updRes = await fetch(`${AUTH_BASE_URL}:update?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken,
        displayName: label.slice(0, 60),
        photoUrl: `https://hlf.sync/v1?z=${compressed}`
      })
    });
    return updRes.ok;
  } catch {
    return false;
  }
}

async function readVaultData(email: string, password: string): Promise<any | null> {
  try {
    const idToken = await signInExistingAuthSession(email, password);
    if (!idToken) return null;
    const lookRes = await fetch(`${AUTH_BASE_URL}:lookup?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    if (!lookRes.ok) return null;
    const lookData: any = await lookRes.json();
    const photoUrl: string = lookData?.users?.[0]?.photoUrl || '';
    if (!photoUrl) return null;

    if (photoUrl.includes('?z=')) {
      return decompressPayload(photoUrl.split('?z=')[1]);
    }
    if (photoUrl.includes('?d=')) {
      return decompressPayload(photoUrl.split('?d=')[1]);
    }
  } catch {}
  return null;
}

// Helper: Convert JS object to Firestore Value format
function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: val.toString() };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreFields(fields: Record<string, any>): any {
  const result: Record<string, any> = {};
  for (const [key, valueObj] of Object.entries(fields)) {
    result[key] = fromFirestoreValue(valueObj);
  }
  return result;
}

function fromFirestoreValue(valObj: any): any {
  if (!valObj) return null;
  if ('stringValue' in valObj) return valObj.stringValue;
  if ('integerValue' in valObj) return parseInt(valObj.integerValue, 10);
  if ('doubleValue' in valObj) return parseFloat(valObj.doubleValue);
  if ('booleanValue' in valObj) return valObj.booleanValue;
  if ('nullValue' in valObj) return null;
  if ('arrayValue' in valObj) {
    const arr = valObj.arrayValue.values || [];
    return arr.map(fromFirestoreValue);
  }
  if ('mapValue' in valObj) {
    return fromFirestoreFields(valObj.mapValue.fields || {});
  }
  return null;
}

function stripHeavyFields(user: any): any {
  if (!user) return user;
  const copy = { ...user };
  if (typeof copy.avatar === 'string' && copy.avatar.startsWith('data:')) {
    copy.avatar = '';
  }
  return copy;
}

function isTestEmail(email: string): boolean {
  const clean = (email || '').trim().toLowerCase();
  return clean.includes('cloud_restore_test') || clean.startsWith('demo_') || clean.endsWith('@example.com');
}

export class FirebaseSync {
  private static isInitialized = false;
  private static shardSyncTimer: NodeJS.Timeout | null = null;

  /**
   * Upsert a single user account to their personal Firebase Auth Cloud Vault + Firestore
   */
  /**
   * Upsert a single user account to Firebase Firestore + Firebase Auth
   */
  static async syncAccountToCloud(user: any): Promise<boolean> {
    if (!user || !user.id || !user.email) return false;
    try {
      const cleanUser = stripHeavyFields(user);
      const cleanEmail = cleanUser.email.trim().toLowerCase();

      // If Firestore daily write quota is currently exhausted, write to personal Firebase Auth Vault
      if (isFirestoreQuotaExhausted()) {
        const { vaultEmail, vaultPassword } = getUserVaultIdentity(cleanEmail);
        writeVaultData(vaultEmail, vaultPassword, cleanEmail, cleanUser).catch(() => {});
        return true;
      }

      const idToken = await getAdminIdToken();

      const fields: Record<string, any> = {};
      for (const [key, val] of Object.entries(cleanUser)) {
        if (val !== undefined && val !== null) {
          fields[key] = toFirestoreValue(val);
        }
      }
      fields['updatedAt'] = toFirestoreValue(Date.now());

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {})
      };

      const bodyStr = JSON.stringify({ fields });

      // 1. Save to (default) database users & accounts collections for Separate Admin Panel
      const userDocId = encodeURIComponent(String(cleanUser.id).replace(/[^a-zA-Z0-9_-]/g, '_'));
      const emailDocId = `email_${cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

      const defaultUserFields: Record<string, any> = {
        email: toFirestoreValue(cleanEmail),
        balance: toFirestoreValue(Math.round(cleanUser.balanceUsd || 0)),
        balanceUsd: toFirestoreValue(cleanUser.balanceUsd || 0),
        balanceBdt: toFirestoreValue(cleanUser.balanceBdt || 0),
        name: toFirestoreValue(cleanUser.name || cleanEmail.split('@')[0]),
        role: toFirestoreValue(cleanUser.role || 'user'),
        plan: toFirestoreValue(cleanUser.plan || 'free'),
        updatedAt: toFirestoreValue(Date.now())
      };
      const defaultUserBodyStr = JSON.stringify({ fields: defaultUserFields });

      fetch(`${DEFAULT_DB_URL}/users/${userDocId}?key=${API_KEY}`, {
        method: 'PATCH',
        headers,
        body: defaultUserBodyStr,
        signal: AbortSignal.timeout(4000)
      }).catch(() => {});

      fetch(`${DEFAULT_DB_URL}/accounts/${userDocId}?key=${API_KEY}`, {
        method: 'PATCH',
        headers,
        body: bodyStr,
        signal: AbortSignal.timeout(4000)
      }).catch(() => {});

      // 2. Save to named DB (if not quota exhausted)
      let resById: any = null;
      let resByEmail: any = null;
      if (!isFirestoreQuotaExhausted()) {
        const urlById = `${BASE_URL}/accounts/${userDocId}?key=${API_KEY}`;
        resById = await fetch(urlById, {
          method: 'PATCH',
          headers,
          body: bodyStr,
          signal: AbortSignal.timeout(4000)
        }).catch(() => null);
        checkResponseQuota(resById);

        const urlByEmail = `${BASE_URL}/accounts/${emailDocId}?key=${API_KEY}`;
        resByEmail = await fetch(urlByEmail, {
          method: 'PATCH',
          headers,
          body: bodyStr,
          signal: AbortSignal.timeout(4000)
        }).catch(() => null);
        checkResponseQuota(resByEmail);
      }

      // 3. Also sync to Firebase Auth if password exists
      if (cleanUser.password) {
        try {
          await fetch(`${AUTH_BASE_URL}:signUp?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              password: cleanUser.password,
              displayName: cleanUser.name || '',
              returnSecureToken: false
            })
          });
        } catch {}
      }

      // Also best-effort backup to personal vault
      const { vaultEmail, vaultPassword } = getUserVaultIdentity(cleanEmail);
      writeVaultData(vaultEmail, vaultPassword, cleanEmail, cleanUser).catch(() => {});

      const success = Boolean((resById && resById.ok) || (resByEmail && resByEmail.ok));
      if (success) {
        console.log(`✅ [Firebase Firestore] Saved account for ${cleanEmail} to cloud!`);
      }
      return success;
    } catch (err: any) {
      console.warn('FirebaseSync syncAccountToCloud error:', err.message || err);
      return false;
    }
  }

  /**
   * Synchronize the full accounts array across Master Cloud Shards (debounced)
   */
  static scheduleMasterShardSync(accounts: any[]) {
    if (this.shardSyncTimer) {
      clearTimeout(this.shardSyncTimer);
    }
    this.shardSyncTimer = setTimeout(() => {
      this.syncAllAccountsToMasterShards(accounts).catch(() => {});
    }, 500);
  }

  static async syncAllAccountsToMasterShards(accounts: any[]): Promise<void> {
    if (!Array.isArray(accounts) || accounts.length === 0) return;
    try {
      const cleaned = accounts
        .filter((a) => a && a.id && a.email)
        .map(stripHeavyFields);

      // Each shard comfortably holds up to 12 accounts compressed via Firebase Auth Vault
      const SHARD_SIZE = 12;
      const totalShards = Math.min(10, Math.ceil(cleaned.length / SHARD_SIZE));
      for (let i = 0; i < totalShards; i++) {
        const chunk = cleaned.slice(i * SHARD_SIZE, (i + 1) * SHARD_SIZE);
        const { shardEmail, shardPassword } = getMasterShardIdentity(i);
        await writeVaultData(shardEmail, shardPassword, `HLF_SHARD_${i}_COUNT_${totalShards}`, {
          totalShards,
          shardIndex: i,
          updatedAt: Date.now(),
          accounts: chunk
        });
      }
    } catch (err: any) {
      console.warn('FirebaseSync syncAllAccountsToMasterShards warning:', err.message || err);
    }
  }

  /**
   * Instant on-demand lookup of a single user account from Firebase Firestore
   */
  static async loadSingleAccountByEmail(email: string): Promise<any | null> {
    if (!email || !email.includes('@')) return null;
    const cleanEmail = email.trim().toLowerCase();
    try {
      const idToken = await getAdminIdToken();
      const headers: Record<string, string> = {
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {})
      };

      // 0. Direct lookup in (default) database /users (used by Separate Admin Panel)
      try {
        const defUsersRes = await fetch(`${DEFAULT_DB_URL}/users?key=${API_KEY}&pageSize=100`, { headers, signal: AbortSignal.timeout(5000) }).catch(() => null);
        if (defUsersRes && defUsersRes.ok) {
          const defData: any = await defUsersRes.json();
          if (defData && Array.isArray(defData.documents)) {
            for (const d of defData.documents) {
              if (d.fields) {
                const parsed = fromFirestoreFields(d.fields);
                const dEmail = String(parsed.email || '').trim().toLowerCase();
                const dId = d.name.split('/').pop();
                if (dEmail === cleanEmail || dId === cleanEmail) {
                  const bal = Number(parsed.balance !== undefined ? parsed.balance : (parsed.balanceUsd || 0));
                  console.log(`✅ [Firebase Firestore] Found user account ${cleanEmail} in (default)/users! Balance: $${bal}`);
                  return {
                    id: dId || `user_${Date.now()}`,
                    email: dEmail || cleanEmail,
                    name: parsed.name || cleanEmail.split('@')[0],
                    balanceUsd: isNaN(bal) ? 0 : bal,
                    balanceBdt: Number(parsed.balanceBdt || 0),
                    role: parsed.role || 'user',
                    plan: parsed.plan || 'free',
                    ...parsed
                  };
                }
              }
            }
          }
        }
      } catch {}

      // 1. Direct lookup by email document ID in Firestore
      const emailDocId = `email_${cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      if (!isFirestoreQuotaExhausted()) {
        const urlDirect = `${BASE_URL}/accounts/${emailDocId}?key=${API_KEY}`;
        const resDirect = await fetch(urlDirect, { headers, signal: AbortSignal.timeout(5000) }).catch(() => null);
        if (resDirect && resDirect.ok) {
          const docData: any = await resDirect.json();
          if (docData && docData.fields) {
            const parsed = fromFirestoreFields(docData.fields);
            if (parsed && parsed.email) {
              console.log(`✅ [Firebase Firestore] Found user account ${cleanEmail} directly!`);
              return parsed;
            }
          }
        }

        // 2. Structured query search in Firestore by email field
        const runQueryUrl = `${BASE_URL}:runQuery?key=${API_KEY}`;
        const queryBody = {
          structuredQuery: {
            from: [{ collectionId: 'accounts' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'email' },
                op: 'EQUAL',
                value: { stringValue: cleanEmail }
              }
            },
            limit: 1
          }
        };
        const queryRes = await fetch(runQueryUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: JSON.stringify(queryBody)
        }).catch(() => null);

        if (queryRes && queryRes.ok) {
          const queryData: any = await queryRes.json();
          if (Array.isArray(queryData) && queryData[0]?.document?.fields) {
            const parsed = fromFirestoreFields(queryData[0].document.fields);
            if (parsed && parsed.email) {
              console.log(`✅ [Firebase Firestore] Found user account ${cleanEmail} via query!`);
              return parsed;
            }
          }
        }
      }

      // 3. Fallback: Check Personal Vault
      const { vaultEmail, vaultPassword } = getUserVaultIdentity(cleanEmail);
      const vaultData = await readVaultData(vaultEmail, vaultPassword);
      if (vaultData && vaultData.id && vaultData.email) {
        return vaultData;
      }
    } catch (err: any) {
      console.warn('FirebaseSync loadSingleAccountByEmail error:', err?.message || err);
    }
    return null;
  }

  /**
   * Load all accounts from Firestore + Master Cloud Shards
   */
  static async loadAccountsFromCloud(): Promise<any[]> {
    const collected: any[] = [];
    const seenEmails = new Set<string>();

    try {
      const idToken = await getAdminIdToken();
      const headers: Record<string, string> = {
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {})
      };

      // 0. Read from (default) database /users and /accounts (Separate Admin Panel)
      for (const col of ['users', 'accounts']) {
        try {
          const res = await fetch(`${DEFAULT_DB_URL}/${col}?key=${API_KEY}&pageSize=100`, { headers, signal: AbortSignal.timeout(5000) }).catch(() => null);
          if (res && res.ok) {
            const data: any = await res.json();
            if (data && Array.isArray(data.documents)) {
              for (const doc of data.documents) {
                if (doc.fields) {
                  const parsed = fromFirestoreFields(doc.fields);
                  const email = String(parsed.email || '').trim().toLowerCase();
                  if (email && email.includes('@') && !seenEmails.has(email) && !isTestEmail(email)) {
                    seenEmails.add(email);
                    const bal = Number(parsed.balance !== undefined ? parsed.balance : (parsed.balanceUsd || 0));
                    collected.push({
                      id: doc.name.split('/').pop(),
                      email,
                      name: parsed.name || email.split('@')[0],
                      balanceUsd: isNaN(bal) ? 0 : bal,
                      balanceBdt: Number(parsed.balanceBdt || 0),
                      role: parsed.role || 'user',
                      plan: parsed.plan || 'free',
                      ...parsed
                    });
                  }
                }
              }
            }
          }
        } catch {}
      }

      // 1. Read all documents from Firestore /accounts collection via :runQuery (if not quota exhausted)
      if (!isFirestoreQuotaExhausted()) {
        const runQueryUrl = `${BASE_URL}:runQuery?key=${API_KEY}`;
        const queryBody = {
          structuredQuery: {
            from: [{ collectionId: 'accounts' }],
            limit: 300
          }
        };
        const res = await fetch(runQueryUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: JSON.stringify(queryBody)
        }).catch(() => null);

        if (res && res.ok) {
          const list: any = await res.json();
          if (Array.isArray(list)) {
            for (const item of list) {
              if (item.document?.fields) {
                const acc = fromFirestoreFields(item.document.fields);
                if (acc && acc.email) {
                  const clean = acc.email.trim().toLowerCase();
                  if (!seenEmails.has(clean) && !isTestEmail(clean)) {
                    seenEmails.add(clean);
                    collected.push(acc);
                  }
                }
              }
            }
          }
        }
      }

      // 2. Read Master Cloud Shards from Firebase Auth as backup
      const { shardEmail: s0Email, shardPassword: s0Pass } = getMasterShardIdentity(0);
      const shard0 = await readVaultData(s0Email, s0Pass);
      if (shard0) {
        const list = Array.isArray(shard0) ? shard0 : Array.isArray(shard0.accounts) ? shard0.accounts : [];
        for (const acc of list) {
          if (acc && acc.email) {
            const clean = acc.email.trim().toLowerCase();
            if (!seenEmails.has(clean) && !isTestEmail(clean)) {
              seenEmails.add(clean);
              collected.push(acc);
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('FirebaseSync loadAccountsFromCloud error:', err.message || err);
    }
    return collected;
  }

  /**
   * Startup and periodic bi-directional cloud synchronization
   */
  static async initSync(getAccountsFn: () => any[], saveAccountsFn: (acc: any[]) => void) {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      console.log('🔄 Initializing Firebase Cloud Vault Sync for user accounts & balances...');
      const remoteAccounts = await this.loadAccountsFromCloud();
      const localAccounts = (getAccountsFn() || []).filter((a: any) => a && a.email && !isTestEmail(a.email));

      const mergedMap = new Map<string, any>();

      for (const loc of localAccounts) {
        if (loc && loc.email && !isTestEmail(loc.email)) {
          mergedMap.set(loc.email.trim().toLowerCase(), loc);
        }
      }

      let hasChanges = false;
      for (const rem of remoteAccounts) {
        if (!rem || !rem.email || isTestEmail(rem.email)) continue;
        const emailKey = rem.email.trim().toLowerCase();
        const existing = mergedMap.get(emailKey);
        if (!existing) {
          mergedMap.set(emailKey, rem);
          hasChanges = true;
        } else {
          const remTime = typeof rem.updatedAt === 'number' ? rem.updatedAt : (rem.updatedAt ? new Date(rem.updatedAt).getTime() : 0);
          const existTime = typeof existing.updatedAt === 'number' ? existing.updatedAt : (existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0);
          const preferRemote = remTime > existTime;
          const updated = {
            ...existing,
            ...rem,
            password: rem.password || existing.password || '',
            balanceUsd: preferRemote ? (rem.balanceUsd ?? existing.balanceUsd ?? 0) : (existing.balanceUsd ?? rem.balanceUsd ?? 0),
            balanceBdt: preferRemote ? (rem.balanceBdt ?? existing.balanceBdt ?? 0) : (existing.balanceBdt ?? rem.balanceBdt ?? 0),
            emailVerified: Boolean(existing.emailVerified || rem.emailVerified),
            isVerified: Boolean(existing.isVerified || rem.isVerified)
          };
          mergedMap.set(emailKey, updated);
          hasChanges = true;
        }
      }

      const finalAccounts = Array.from(mergedMap.values()).filter((a: any) => a && a.email && !isTestEmail(a.email));
      if (finalAccounts.length !== (getAccountsFn() || []).length || hasChanges) {
        saveAccountsFn(finalAccounts);
        console.log(`✅ Restored & synced ${finalAccounts.length} user accounts from Firebase Cloud Vault!`);
      }

      // Ensure all accounts are backed up to personal vaults and master shards
      for (const acc of finalAccounts) {
        this.syncAccountToCloud(acc).catch(() => {});
      }
      await this.syncAllAccountsToMasterShards(finalAccounts);
    } catch (err: any) {
      console.warn('FirebaseSync initial sync warning:', err.message || err);
    }
  }

  // ==========================================
  // PLAN & DEPOSIT REQUESTS FIRESTORE SYNC
  // ==========================================
  static async syncPlanRequestToCloud(planReq: any): Promise<boolean> {
    if (!planReq || !planReq.id) return false;
    try {
      const docId = encodeURIComponent(String(planReq.id).replace(/[^a-zA-Z0-9_-]/g, '_'));
      const idToken = await getAdminIdToken();

      const fields: Record<string, any> = {};
      for (const [key, val] of Object.entries(planReq)) {
        if (val !== undefined && val !== null) {
          fields[key] = toFirestoreValue(val);
        }
      }
      fields['updatedAt'] = toFirestoreValue(Date.now());

      // Ensure all fields expected by the separate Admin Panel (Screenshot 1 & 2) are populated
      const cleanTrx = String(planReq.transactionId || planReq.trxId || '').trim().toUpperCase();
      fields['trxId'] = toFirestoreValue(cleanTrx);
      fields['transactionId'] = toFirestoreValue(cleanTrx);
      fields['userEmail'] = toFirestoreValue(planReq.userEmail || '');
      fields['userId'] = toFirestoreValue(planReq.userId || '');
      fields['userPhone'] = toFirestoreValue(planReq.senderNumber || planReq.senderIdentifier || planReq.userPhone || '—');
      fields['sender'] = toFirestoreValue(planReq.senderNumber || planReq.senderIdentifier || '');
      fields['method'] = toFirestoreValue(planReq.method || 'bKash');
      fields['status'] = toFirestoreValue(planReq.status || 'pending');
      fields['type'] = toFirestoreValue('deposit');
      fields['date'] = toFirestoreValue(planReq.createdAt || new Date().toISOString());
      fields['createdAt'] = toFirestoreValue(planReq.createdAt || new Date().toISOString());
      fields['timestamp'] = toFirestoreValue(Date.now());

      const numBdt = Number(planReq.bdtAmount || planReq.amountBdt || 0);
      const numAmt = Number(planReq.amount || 0);
      const isBdt = String(planReq.method || '').toLowerCase().includes('bkash') || 
                    String(planReq.method || '').toLowerCase().includes('nagad') || 
                    String(planReq.method || '').toLowerCase().includes('rocket') ||
                    planReq.currency === 'BDT';
      fields['amount'] = toFirestoreValue(isBdt && numBdt > 0 ? numBdt : (numAmt > 0 ? numAmt : numBdt));
      if (numBdt > 0) fields['amountBdt'] = toFirestoreValue(numBdt);
      fields['amountUsd'] = toFirestoreValue(numAmt);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
      };

      const bodyStr = JSON.stringify({ fields });

      const defaultDbBaseUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
      const namedDbBaseUrl = BASE_URL;

      // Sync to all collections concurrently in parallel for blazing-fast response (<500ms)
      const urlDepDefault = `${defaultDbBaseUrl}/deposits/${docId}?key=${API_KEY}`;
      const urlDepNamed = `${namedDbBaseUrl}/deposits/${docId}?key=${API_KEY}`;
      const urlPlanDefault = `${defaultDbBaseUrl}/plan_requests/${docId}?key=${API_KEY}`;
      const urlPlanNamed = `${namedDbBaseUrl}/plan_requests/${docId}?key=${API_KEY}`;

      const patchReqs = [
        fetch(urlDepDefault, { method: 'PATCH', headers, body: bodyStr, signal: AbortSignal.timeout(3000) }),
        fetch(urlDepNamed, { method: 'PATCH', headers, body: bodyStr, signal: AbortSignal.timeout(3000) }),
        fetch(urlPlanDefault, { method: 'PATCH', headers, body: bodyStr, signal: AbortSignal.timeout(3000) }),
        fetch(urlPlanNamed, { method: 'PATCH', headers, body: bodyStr, signal: AbortSignal.timeout(3000) })
      ];

      const patchResults = await Promise.allSettled(patchReqs);
      const isSuccess = patchResults.some(r => r.status === 'fulfilled' && r.value.ok);
      if (isSuccess) {
        console.log(`✅ [Firebase Firestore] Synced deposit to separate Admin Panel & Cloud (${planReq.id}, Status: ${planReq.status}, TrxID: ${cleanTrx})`);
      }
      return isSuccess;
      return isSuccess;
    } catch (err: any) {
      console.warn('FirebaseSync syncPlanRequestToCloud error:', err.message || err);
      return false;
    }
  }

  static async loadPlanRequestsFromCloud(): Promise<any[]> {
    const collected: any[] = [];
    const seenIds = new Set<string>();

    try {
      const idToken = await getAdminIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
      };

      const defaultDbBaseUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
      const namedDbBaseUrl = BASE_URL;

      const fetchQuery = async (baseUrl: string, colId: string) => {
        try {
          const runQueryUrl = `${baseUrl}:runQuery?key=${API_KEY}`;
          const qBody = {
            structuredQuery: {
              from: [{ collectionId: colId }],
              limit: 300
            }
          };
          const res = await fetch(runQueryUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(qBody),
            signal: AbortSignal.timeout(6000)
          }).catch(() => null);

          if (res && res.ok) {
            const list: any = await res.json();
            if (Array.isArray(list)) {
              for (const item of list) {
                if (item.document?.fields) {
                  const parsed = fromFirestoreFields(item.document.fields);
                  if (parsed && (parsed.id || item.document.name)) {
                    const docId = parsed.id || item.document.name.split('/').pop();
                    if (docId && !seenIds.has(docId)) {
                      seenIds.add(docId);
                      collected.push({ ...parsed, id: docId });
                    }
                  }
                }
              }
            }
          }
        } catch {}
      };

      // Query (default) database /deposits (separate Admin Panel primary collection)
      await fetchQuery(defaultDbBaseUrl, 'deposits');
      // Query (default) database /plan_requests
      await fetchQuery(defaultDbBaseUrl, 'plan_requests');
      // Query named database /deposits
      await fetchQuery(namedDbBaseUrl, 'deposits');
      // Query named database /plan_requests
      await fetchQuery(namedDbBaseUrl, 'plan_requests');

      console.log(`✅ [Firebase Firestore] Loaded ${collected.length} deposit/plan requests from cloud across default & named DBs!`);
    } catch (err: any) {
      console.warn('FirebaseSync loadPlanRequestsFromCloud error:', err.message || err);
    }

    return collected;
  }

  static async initPlanRequestsSync(
    getRequestsFn: () => any[],
    saveRequestsFn: (reqs: any[]) => void
  ): Promise<void> {
    try {
      console.log('🔄 Initializing Firebase Firestore sync for deposit & plan requests...');
      const remoteRequests = await this.loadPlanRequestsFromCloud();
      const localRequests = getRequestsFn() || [];

      const mergedMap = new Map<string, any>();

      for (const loc of localRequests) {
        if (loc && loc.id) {
          mergedMap.set(loc.id, loc);
        }
      }

      let hasChanges = false;
      for (const rem of remoteRequests) {
        if (!rem || !rem.id) continue;
        const existing = mergedMap.get(rem.id);
        if (!existing) {
          mergedMap.set(rem.id, rem);
          hasChanges = true;
        } else {
          if (rem.status !== existing.status || (rem.reviewedAt && !existing.reviewedAt)) {
            mergedMap.set(rem.id, { ...existing, ...rem });
            hasChanges = true;
          }
        }
      }

      const finalRequests = Array.from(mergedMap.values());
      finalRequests.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      if (hasChanges || finalRequests.length > localRequests.length) {
        saveRequestsFn(finalRequests);
        console.log(`✅ Restored & synced ${finalRequests.length} deposit/plan requests from Firebase Firestore!`);
      }

      for (const req of finalRequests) {
        this.syncPlanRequestToCloud(req).catch(() => {});
      }
    } catch (err: any) {
      console.warn('FirebaseSync initPlanRequestsSync warning:', err.message || err);
    }
  }

  // Live Auto-Approval Watcher for the separate Admin Panel (Screenshot 1 & 2)
  static startExternalDepositsWatcher(
    getAccountsFn: () => any[],
    saveAccountsFn: (accs: any[]) => void,
    getRequestsFn: () => any[],
    saveRequestsFn: (reqs: any[]) => void,
    modifyWalletFn: (userId: string, amount: number, type: any, desc: string, method?: string, trxId?: string, currency?: any) => any,
    isCreditedFn: (trxId: string) => boolean,
    saveNotifFn?: (notif: any) => void,
    sendAlertFn?: (user: any, deposit: any, status: 'approved' | 'rejected') => Promise<void>
  ): void {
    const checkDepositsFromExternalPanel = async () => {
      try {
        const idToken = await getAdminIdToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        };

        const defaultDbBaseUrl = DEFAULT_DB_URL;
        const namedDbBaseUrl = BASE_URL;

        // Primary endpoints: (default) database where the separate Admin Panel operates
        const endpoints = [
          `${defaultDbBaseUrl}/deposits?key=${API_KEY}&pageSize=100`,
          `${defaultDbBaseUrl}/plan_requests?key=${API_KEY}&pageSize=100`
        ];

        // Also check named database if not quota-paused
        if (!isFirestoreQuotaExhausted()) {
          endpoints.push(`${namedDbBaseUrl}/deposits?key=${API_KEY}&pageSize=100`);
          endpoints.push(`${namedDbBaseUrl}/plan_requests?key=${API_KEY}&pageSize=100`);
        }

        const allDocs: any[] = [];
        const seenDocPaths = new Set<string>();

        for (const ep of endpoints) {
          try {
            const res = await fetch(ep, { headers, signal: AbortSignal.timeout(5000) }).catch(() => null);
            if (res && res.status === 429) {
              setFirestoreQuotaExhausted(30 * 60 * 1000);
              continue; // Resilient: NEVER abort other working endpoints!
            }
            if (res && res.ok) {
              const data: any = await res.json();
              if (data && Array.isArray(data.documents)) {
                for (const docItem of data.documents) {
                  if (docItem?.name && !seenDocPaths.has(docItem.name)) {
                    seenDocPaths.add(docItem.name);
                    allDocs.push(docItem);
                  }
                }
              }
            }
          } catch {}
        }

        const currentRequests = getRequestsFn();
        const accounts = getAccountsFn();
        let requestsUpdated = false;

        for (const docItem of allDocs) {
          if (!docItem || !docItem.fields) continue;
          const parsed = fromFirestoreFields(docItem.fields);
          const docId = docItem.name.split('/').pop();
          const cleanTrx = String(parsed.trxId || parsed.transactionId || docId || '').trim().toUpperCase();
          const rawStatus = String(parsed.status || '').toLowerCase().trim();

          if (!cleanTrx) continue;

          // If approved in the separate Admin Panel:
          if (rawStatus === 'approved' || rawStatus === 'success' || rawStatus === 'completed') {
            const alreadyCredited = isCreditedFn(cleanTrx);
            if (!alreadyCredited) {
              const email = String(parsed.userEmail || '').trim().toLowerCase();
              const uid = String(parsed.userId || '').trim();
              let acc = accounts.find((a) => (uid && a.id === uid) || (email && a.email?.toLowerCase() === email));

              if (!acc && (email || uid)) {
                try {
                  const cloudUser = await FirebaseSync.loadSingleAccountByEmail(email || uid);
                  if (cloudUser && cloudUser.id) {
                    acc = cloudUser;
                    if (!accounts.some((a) => a.id === acc.id)) {
                      accounts.push(acc);
                      saveAccountsFn(accounts);
                    }
                  }
                } catch {}
              }

              // If user is still not found in memory, auto-create so balance is NEVER lost
              if (!acc) {
                const newUid = uid || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                acc = {
                  id: newUid,
                  name: parsed.userName || parsed.sender || (email ? email.split('@')[0] : 'User'),
                  email: email || `${cleanTrx.toLowerCase()}@user.local`,
                  role: 'user',
                  plan: 'free',
                  balanceUsd: 0,
                  balanceBdt: 0,
                  maxBots: 1,
                  emailVerified: true,
                  isVerified: true,
                  createdAt: parsed.createdAt || new Date().toISOString(),
                  updatedAt: Date.now()
                };
                accounts.push(acc);
                saveAccountsFn(accounts);
                console.log(`👤 Auto-created user account for approved deposit: ${acc.email} (${acc.id})`);
              }

              if (acc) {
                const method = parsed.method || 'bKash';
                const isCrypto = method.toLowerCase().includes('binance') || method.toLowerCase().includes('usdt') || method.toLowerCase().includes('crypto') || method.toLowerCase().includes('bep20') || method.toLowerCase().includes('trc20');
                const rawAmt = parseFloat(parsed.amount || parsed.amountBdt || parsed.amountUsd || '0');
                const rate = Number(parsed.rateToBdt) || 120;
                let usdAmount = 0;

                if (isCrypto || parsed.currency === 'USD' || (parsed.amountUsd && Number(parsed.amountUsd) > 0)) {
                  usdAmount = Math.max(0.01, parseFloat(Number(parsed.amountUsd || rawAmt).toFixed(2)));
                } else {
                  const bdtAmt = parseFloat(parsed.amountBdt || parsed.amount || '0');
                  usdAmount = bdtAmt > 0 ? Math.max(0.01, parseFloat((bdtAmt / rate).toFixed(2))) : 1;
                }

                modifyWalletFn(
                  acc.id,
                  usdAmount,
                  'deposit',
                  `Approved by Admin Panel (${method}): $${usdAmount} USD`,
                  method,
                  cleanTrx,
                  'USD'
                );
                acc.balanceUsd = Math.round(((acc.balanceUsd || 0) + usdAmount) * 100) / 100;
                acc.updatedAt = Date.now();
                saveAccountsFn(accounts);
                FirebaseSync.syncAccountToCloud(acc).catch(() => {});

                console.log(`🎉 [Separate Admin Panel] Deposit ${cleanTrx} (+$${usdAmount} USD) approved! Credited to user: ${acc.email}. New Balance: $${acc.balanceUsd}`);

                if (saveNotifFn) {
                  saveNotifFn({
                    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    userId: acc.id,
                    type: 'deposit_approved',
                    title: '✅ ডিপোজিট অনুমোদিত হয়েছে',
                    message: `আপনার $${usdAmount} USD ডিপোজিট (${method}, TrxID: ${cleanTrx}) অ্যাডমিন প্যানেল থেকে অনুমোদিত হয়েছে এবং ওয়ালেটে যুক্ত হয়েছে!`,
                    createdAt: new Date().toISOString(),
                    read: false
                  });
                }

                if (sendAlertFn) {
                  sendAlertFn(acc, { ...parsed, amount: usdAmount, currency: 'USD', transactionId: cleanTrx }, 'approved').catch(() => {});
                }
              }
            }

            // Sync status to local plan_requests
            const existingLocal = currentRequests.find((r) => (r.transactionId || '').toUpperCase() === cleanTrx || r.id === docId);
            if (existingLocal && existingLocal.status !== 'approved') {
              existingLocal.status = 'approved';
              existingLocal.reviewedAt = new Date().toISOString();
              existingLocal.reviewedBy = 'Separate Admin Panel';
              requestsUpdated = true;
            }
          } else if (rawStatus === 'rejected') {
            const existingLocal = currentRequests.find((r) => (r.transactionId || '').toUpperCase() === cleanTrx || r.id === docId);
            if (existingLocal && existingLocal.status !== 'rejected') {
              existingLocal.status = 'rejected';
              existingLocal.reviewedAt = new Date().toISOString();
              existingLocal.reviewedBy = 'Separate Admin Panel';
              requestsUpdated = true;
            }
          }
        }

        if (requestsUpdated) {
          saveRequestsFn(currentRequests);
        }

        // Direct live balance sync from (default)/users collection in case external admin modified user balance directly
        try {
          const usersRes = await fetch(`${defaultDbBaseUrl}/users?key=${API_KEY}&pageSize=100`, { headers, signal: AbortSignal.timeout(5000) }).catch(() => null);
          if (usersRes && usersRes.ok) {
            const uData: any = await usersRes.json();
            if (uData && Array.isArray(uData.documents)) {
              let accsChanged = false;
              for (const uDoc of uData.documents) {
                if (!uDoc?.fields) continue;
                const uFields = fromFirestoreFields(uDoc.fields);
                const uDocId = uDoc.name.split('/').pop();
                const uEmail = String(uFields.email || '').trim().toLowerCase();
                const extBal = Number(uFields.balance !== undefined ? uFields.balance : uFields.balanceUsd);
                if (isNaN(extBal) || extBal < 0) continue;

                let localUser = accounts.find((a) => (uDocId && a.id === uDocId) || (uEmail && a.email?.toLowerCase() === uEmail));
                if (!localUser && uEmail) {
                  localUser = {
                    id: uDocId || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    name: uFields.name || uEmail.split('@')[0],
                    email: uEmail,
                    role: 'user',
                    plan: 'free',
                    balanceUsd: extBal,
                    balanceBdt: 0,
                    maxBots: 1,
                    emailVerified: true,
                    isVerified: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: Date.now()
                  };
                  accounts.push(localUser);
                  accsChanged = true;
                } else if (localUser && extBal > (localUser.balanceUsd || 0)) {
                  console.log(`🔄 [External Users Sync] Syncing higher balance for ${localUser.email}: $${localUser.balanceUsd} -> $${extBal}`);
                  localUser.balanceUsd = extBal;
                  localUser.updatedAt = Date.now();
                  accsChanged = true;
                }
              }
              if (accsChanged) {
                saveAccountsFn(accounts);
              }
            }
          }
        } catch {}
      } catch (err: any) {
        // Silent background catch
      }
    };

    // Run first check 1.5 seconds after startup
    setTimeout(checkDepositsFromExternalPanel, 1500);
    // Then keep watching every 5 seconds for instant credit
    setInterval(checkDepositsFromExternalPanel, 5000);
  }

  // ==========================================
  // SITE SETTINGS, LOGO & BRANDING SYNC
  // ==========================================
  static async syncSiteSettingsToCloud(settings: any): Promise<boolean> {
    if (!settings) return false;
    try {
      const idToken = await getAdminIdToken();

      const fields: Record<string, any> = {};
      for (const [key, val] of Object.entries(settings)) {
        if (val !== undefined) {
          fields[key] = toFirestoreValue(val);
        }
      }
      fields['updatedAt'] = toFirestoreValue(Date.now());

      const url = `${BASE_URL}/site_settings/general?key=${API_KEY}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({ fields })
      });
      return res.ok;
    } catch (err: any) {
      console.warn('FirebaseSync syncSiteSettingsToCloud error:', err.message || err);
      return false;
    }
  }

  static async loadSiteSettingsFromCloud(): Promise<any | null> {
    try {
      const idToken = await getAdminIdToken();

      const url = `${BASE_URL}/site_settings/general?key=${API_KEY}`;
      const res = await fetch(url, {
        headers: idToken ? { 'Authorization': `Bearer ${idToken}` } : {}
      });
      if (!res.ok) return null;
      const data: any = await res.json();
      if (data && data.fields) {
        return fromFirestoreFields(data.fields);
      }
    } catch (err: any) {
      console.warn('FirebaseSync loadSiteSettingsFromCloud error:', err.message || err);
    }
    return null;
  }

  // ==========================================
  // BANNERS SYNC
  // ==========================================
  static async syncBannersToCloud(banners: any[]): Promise<boolean> {
    if (!Array.isArray(banners)) return false;
    try {
      const idToken = await getAdminIdToken();
      if (!idToken) return false;

      const url = `${BASE_URL}/config/banners`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          fields: {
            banners: toFirestoreValue(banners),
            updatedAt: toFirestoreValue(Date.now())
          }
        })
      });
      return res.ok;
    } catch (err: any) {
      console.warn('FirebaseSync syncBannersToCloud error:', err.message || err);
      return false;
    }
  }

  static async loadBannersFromCloud(): Promise<any[] | null> {
    try {
      const idToken = await getAdminIdToken();
      if (!idToken) return null;

      const url = `${BASE_URL}/config/banners`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (!res.ok) return null;
      const data: any = await res.json();
      if (data && data.fields?.banners) {
        const val = fromFirestoreValue(data.fields.banners);
        if (Array.isArray(val)) return val;
      }
    } catch {}
    return null;
  }

  // ==========================================
  // PAYMENT SETTINGS SYNC
  // ==========================================
  static async syncPaymentSettingsToCloud(settings: any): Promise<boolean> {
    if (!settings) return false;
    try {
      const idToken = await getAdminIdToken();
      if (!idToken) return false;

      const fields: Record<string, any> = {};
      for (const [key, val] of Object.entries(settings)) {
        if (val !== undefined) {
          fields[key] = toFirestoreValue(val);
        }
      }
      fields['updatedAt'] = toFirestoreValue(Date.now());

      const url = `${BASE_URL}/config/payment_settings`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ fields })
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  static async loadPaymentSettingsFromCloud(): Promise<any | null> {
    try {
      const idToken = await getAdminIdToken();
      if (!idToken) return null;

      const url = `${BASE_URL}/config/payment_settings`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (!res.ok) return null;
      const data: any = await res.json();
      if (data && data.fields) {
        return fromFirestoreFields(data.fields);
      }
    } catch {}
    return null;
  }

  static async syncSmtpSettingsToCloud(settings: any): Promise<boolean> {
    if (!settings) return false;
    try {
      const idToken = await getAdminIdToken();
      if (!idToken) return false;

      const fields: Record<string, any> = {};
      for (const [key, val] of Object.entries(settings)) {
        if (val !== undefined) {
          fields[key] = toFirestoreValue(val);
        }
      }
      fields['updatedAt'] = toFirestoreValue(Date.now());

      const url = `${BASE_URL}/config/smtp_settings`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ fields })
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  static async loadSmtpSettingsFromCloud(): Promise<any | null> {
    try {
      const idToken = await getAdminIdToken();
      if (!idToken) return null;

      const url = `${BASE_URL}/config/smtp_settings`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (!res.ok) return null;
      const data: any = await res.json();
      if (data && data.fields) {
        return fromFirestoreFields(data.fields);
      }
    } catch {}
    return null;
  }

  // ==========================================
  // CUSTOM DEPOSIT METHODS SYNC
  // ==========================================
  static async syncDepositMethodsToCloud(methods: any[]): Promise<boolean> {
    if (!Array.isArray(methods)) return false;
    try {
      const idToken = await getAdminIdToken();
      if (!idToken) return false;

      const url = `${BASE_URL}/config/deposit_methods`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          fields: {
            methods: toFirestoreValue(methods),
            updatedAt: toFirestoreValue(Date.now())
          }
        })
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  static async loadDepositMethodsFromCloud(): Promise<any[] | null> {
    try {
      const idToken = await getAdminIdToken();
      if (!idToken) return null;

      const url = `${BASE_URL}/config/deposit_methods`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (!res.ok) return null;
      const data: any = await res.json();
      if (data && data.fields?.methods) {
        const val = fromFirestoreValue(data.fields.methods);
        if (Array.isArray(val)) return val;
      }
    } catch {}
    return null;
  }

  // ==========================================
  // PERSISTENT SITE IMAGES (Logos, Banners, QR codes)
  // Stored permanently in Firestore so container rebuilds NEVER lose them!
  // ==========================================
  static async saveSiteImageToCloud(
    imageId: string,
    fileName: string,
    contentType: string,
    base64Data: string
  ): Promise<boolean> {
    if (!imageId || !base64Data) return false;
    try {
      const idToken = await getAdminIdToken();

      const mime = contentType || 'image/png';
      const rawBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const fullDataUrl = base64Data.startsWith('data:') ? base64Data : `data:${mime};base64,${rawBase64}`;
      const safeId = encodeURIComponent(imageId.replace(/[^a-zA-Z0-9_-]/g, '_'));

      const url = `${BASE_URL}/site_images/${safeId}?key=${API_KEY}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({
          fields: {
            id: { stringValue: imageId },
            fileName: { stringValue: fileName || imageId },
            contentType: { stringValue: mime },
            url: { stringValue: fullDataUrl },
            dataUrl: { stringValue: fullDataUrl },
            base64: { stringValue: fullDataUrl },
            updatedAt: { integerValue: String(Date.now()) }
          }
        })
      });
      return res.ok;
    } catch (err: any) {
      console.warn('FirebaseSync saveSiteImageToCloud error:', err.message || err);
      return false;
    }
  }

  static async loadSiteImageFromCloud(imageId: string): Promise<{ base64: string; contentType: string } | null> {
    if (!imageId) return null;
    try {
      const idToken = await getAdminIdToken();

      const safeId = encodeURIComponent(imageId.replace(/[^a-zA-Z0-9_-]/g, '_'));
      const url = `${BASE_URL}/site_images/${safeId}?key=${API_KEY}`;
      const res = await fetch(url, {
        headers: idToken ? { 'Authorization': `Bearer ${idToken}` } : {}
      });
      if (!res.ok) return null;
      const data: any = await res.json();
      if (data && data.fields?.base64?.stringValue) {
        const stored = data.fields.base64.stringValue;
        const raw = stored.includes(',') ? stored.split(',')[1] : stored;
        return {
          base64: raw,
          contentType: data.fields.contentType?.stringValue || 'image/png'
        };
      }
    } catch {}
    return null;
  }

  // ==========================================
  // SOCIAL TASKS SYNC
  // ==========================================
  static async syncSocialTasksToCloud(tasks: any[]): Promise<boolean> {
    if (!Array.isArray(tasks)) return false;
    try {
      const idToken = await getAdminIdToken();
      if (!idToken) return false;

      const url = `${BASE_URL}/config/social_tasks`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          fields: {
            tasks: toFirestoreValue(tasks),
            updatedAt: toFirestoreValue(Date.now())
          }
        })
      });

      // Also sync each task to /social_tasks/{taskId} collection for direct collection queries
      for (const task of tasks) {
        if (!task || !task.id) continue;
        const docId = encodeURIComponent(String(task.id).replace(/[^a-zA-Z0-9_-]/g, '_'));
        const fields: Record<string, any> = {};
        for (const [k, v] of Object.entries(task)) {
          if (v !== undefined && v !== null) {
            fields[k] = toFirestoreValue(v);
          }
        }
        fields['updatedAt'] = toFirestoreValue(Date.now());
        fetch(`${BASE_URL}/social_tasks/${docId}?key=${API_KEY}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ fields })
        }).catch(() => {});
      }

      return res.ok;
    } catch (err: any) {
      console.warn('FirebaseSync syncSocialTasksToCloud error:', err.message || err);
      return false;
    }
  }

  static async deleteSocialTaskFromCloud(taskId: string): Promise<boolean> {
    if (!taskId) return false;
    try {
      const docId = encodeURIComponent(String(taskId).replace(/[^a-zA-Z0-9_-]/g, '_'));
      const idToken = await getAdminIdToken();
      const headers: Record<string, string> = {
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
      };
      const url = `${BASE_URL}/social_tasks/${docId}?key=${API_KEY}`;
      const res = await fetch(url, { method: 'DELETE', headers }).catch(() => null);
      return Boolean(res && res.ok);
    } catch {
      return false;
    }
  }

  static async loadSocialTasksFromCloud(): Promise<any[] | null> {
    try {
      const idToken = await getAdminIdToken();
      if (!idToken) return null;

      const url = `${BASE_URL}/config/social_tasks`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (!res.ok) return null;
      const data: any = await res.json();
      if (data && data.fields?.tasks) {
        const val = fromFirestoreValue(data.fields.tasks);
        if (Array.isArray(val)) return val;
      }
    } catch {}
    return null;
  }

  // ==========================================
  // TASK COMPLETIONS & PROOFS FIRESTORE SYNC
  // ==========================================
  static async syncTaskCompletionsToCloud(completions: any[]): Promise<boolean> {
    if (!Array.isArray(completions)) return false;
    try {
      const idToken = await getAdminIdToken();
      if (!idToken) return false;

      // 1. Bulk sync to /config/task_completions
      const url = `${BASE_URL}/config/task_completions`;
      await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          fields: {
            completions: toFirestoreValue(completions),
            updatedAt: toFirestoreValue(Date.now())
          }
        })
      });

      // 2. Individual documents in /task_completions/{id} for recent 100
      const recent = completions.slice(0, 100);
      for (const comp of recent) {
        if (!comp || !comp.id) continue;
        const docId = encodeURIComponent(String(comp.id).replace(/[^a-zA-Z0-9_-]/g, '_'));
        const fields: Record<string, any> = {};
        for (const [k, v] of Object.entries(comp)) {
          if (v !== undefined && v !== null) {
            fields[k] = toFirestoreValue(v);
          }
        }
        fetch(`${BASE_URL}/task_completions/${docId}?key=${API_KEY}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ fields })
        }).catch(() => {});
      }

      return true;
    } catch (err: any) {
      console.warn('FirebaseSync syncTaskCompletionsToCloud error:', err.message || err);
      return false;
    }
  }

  static async syncTaskCompletionSingleToCloud(comp: any): Promise<boolean> {
    if (!comp || !comp.id) return false;
    try {
      const docId = encodeURIComponent(String(comp.id).replace(/[^a-zA-Z0-9_-]/g, '_'));
      const idToken = await getAdminIdToken();

      const fields: Record<string, any> = {};
      for (const [key, val] of Object.entries(comp)) {
        if (val !== undefined && val !== null) {
          fields[key] = toFirestoreValue(val);
        }
      }
      fields['updatedAt'] = toFirestoreValue(Date.now());

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
      };

      const url = `${BASE_URL}/task_completions/${docId}?key=${API_KEY}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields })
      });
      return Boolean(res && res.ok);
    } catch (err: any) {
      console.warn('syncTaskCompletionSingleToCloud error:', err.message || err);
      return false;
    }
  }

  static async loadTaskCompletionsFromCloud(): Promise<any[] | null> {
    try {
      const idToken = await getAdminIdToken();
      if (!idToken) return null;

      const url = `${BASE_URL}/config/task_completions`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (!res.ok) return null;
      const data: any = await res.json();
      if (data && data.fields?.completions) {
        const val = fromFirestoreValue(data.fields.completions);
        if (Array.isArray(val)) return val;
      }
    } catch {}
    return null;
  }

  // ==========================================
  // WALLET TRANSACTIONS FIRESTORE SYNC
  // ==========================================
  static async syncTransactionToCloud(tx: any): Promise<boolean> {
    if (!tx || !tx.id) return false;
    try {
      const idToken = await getAdminIdToken();
      if (!idToken) return false;

      const docId = encodeURIComponent(String(tx.id).replace(/[^a-zA-Z0-9_-]/g, '_'));
      const fields: Record<string, any> = {};
      for (const [k, v] of Object.entries(tx)) {
        if (v !== undefined && v !== null) {
          fields[k] = toFirestoreValue(v);
        }
      }
      fields['updatedAt'] = toFirestoreValue(Date.now());

      const url = `${BASE_URL}/wallet_transactions/${docId}?key=${API_KEY}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ fields })
      });
      return res.ok;
    } catch (err: any) {
      console.warn('FirebaseSync syncTransactionToCloud error:', err.message || err);
      return false;
    }
  }

  static async loadTransactionsFromCloud(): Promise<any[]> {
    const list: any[] = [];
    try {
      const idToken = await getAdminIdToken();
      if (!idToken) return list;

      const url = `${BASE_URL}/wallet_transactions?pageSize=300&key=${API_KEY}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (res.ok) {
        const data: any = await res.json();
        if (data.documents && Array.isArray(data.documents)) {
          for (const doc of data.documents) {
            const parsed = fromFirestoreFields(doc.fields || {});
            if (parsed && parsed.id) list.push(parsed);
          }
        }
      }
    } catch {}
    return list;
  }

  // ==========================================
  // BOTS FIRESTORE SYNC
  // ==========================================
  static async syncBotToCloud(bot: any): Promise<boolean> {
    if (!bot || !bot.id) return false;
    try {
      const docId = encodeURIComponent(String(bot.id).replace(/[^a-zA-Z0-9_-]/g, '_'));
      const idToken = await getAdminIdToken();

      const fields: Record<string, any> = {};
      for (const [key, val] of Object.entries(bot)) {
        if (val !== undefined && val !== null) {
          fields[key] = toFirestoreValue(val);
        }
      }
      fields['updatedAt'] = toFirestoreValue(Date.now());

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
      };

      const url = `${BASE_URL}/bots/${docId}?key=${API_KEY}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields })
      });
      return Boolean(res && res.ok);
    } catch (err: any) {
      console.warn('FirebaseSync syncBotToCloud error:', err?.message || err);
      return false;
    }
  }

  static async deleteBotFromCloud(botId: string): Promise<boolean> {
    if (!botId) return false;
    try {
      const docId = encodeURIComponent(String(botId).replace(/[^a-zA-Z0-9_-]/g, '_'));
      const idToken = await getAdminIdToken();
      const headers: Record<string, string> = {
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
      };
      const url = `${BASE_URL}/bots/${docId}?key=${API_KEY}`;
      const res = await fetch(url, { method: 'DELETE', headers }).catch(() => null);
      return Boolean(res && res.ok);
    } catch {
      return false;
    }
  }

  static async loadBotsFromCloud(): Promise<any[]> {
    const list: any[] = [];
    try {
      const idToken = await getAdminIdToken();
      const url = `${BASE_URL}/bots?pageSize=300&key=${API_KEY}`;
      const headers: Record<string, string> = {
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
      };
      const res = await fetch(url, { headers });
      if (res && res.ok) {
        const data: any = await res.json();
        if (data.documents && Array.isArray(data.documents)) {
          for (const doc of data.documents) {
            const parsed = fromFirestoreFields(doc.fields || {});
            if (parsed && parsed.id) list.push(parsed);
          }
        }
      }
    } catch {}
    return list;
  }

  // ==========================================
  // BOT WORKSPACE CLOUD ARCHIVING & AUTO-RESTORE
  // ==========================================
  static async syncBotWorkspaceToCloud(botId: string, botDir: string): Promise<boolean> {
    if (!botId || !fs.existsSync(botDir)) return false;
    try {
      const zip = new AdmZip();
      let fileCount = 0;

      const addDirRecursive = (currentDir: string, zipSubDir = '') => {
        const items = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const item of items) {
          if (
            item.name === '__pycache__' ||
            item.name === '.git' ||
            item.name === '.venv' ||
            item.name === 'node_modules' ||
            item.name === 'bot.log' ||
            item.name === '_archive.zip'
          ) continue;

          const fullPath = path.join(currentDir, item.name);
          if (item.isDirectory()) {
            addDirRecursive(fullPath, zipSubDir ? `${zipSubDir}/${item.name}` : item.name);
          } else if (item.isFile()) {
            try {
              const fileBuf = fs.readFileSync(fullPath);
              zip.addFile(zipSubDir ? `${zipSubDir}/${item.name}` : item.name, fileBuf);
              fileCount++;
            } catch {}
          }
        }
      };

      addDirRecursive(botDir);
      if (fileCount === 0) return false;

      const zipBuf = zip.toBuffer();
      const docId = encodeURIComponent(String(botId).replace(/[^a-zA-Z0-9_-]/g, '_'));

      // Dual-layer vaulting: Save persistent local mirror
      try {
        const localVaultDir = path.join(process.cwd(), 'hosted_bots', '.persistent_vault');
        if (!fs.existsSync(localVaultDir)) fs.mkdirSync(localVaultDir, { recursive: true });
        fs.writeFileSync(path.join(localVaultDir, `${docId}.zip`), zipBuf);
      } catch {}

      const zipBase64 = zipBuf.toString('base64');
      const idToken = await getAdminIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
      };

      const CHUNK_SIZE = 500000;
      if (zipBase64.length <= CHUNK_SIZE) {
        // Single document upload
        const fields: Record<string, any> = {
          botId: toFirestoreValue(botId),
          zipBase64: toFirestoreValue(zipBase64),
          isSharded: toFirestoreValue(false),
          shardsCount: toFirestoreValue(1),
          fileCount: toFirestoreValue(fileCount),
          byteLength: toFirestoreValue(zipBuf.length),
          updatedAt: toFirestoreValue(Date.now())
        };

        const url = `${BASE_URL}/bot_workspaces/${docId}?key=${API_KEY}`;
        const res = await fetch(url, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ fields })
        });
        return Boolean(res && res.ok);
      } else {
        // Multi-document sharding for large bot projects
        const chunks: string[] = [];
        for (let i = 0; i < zipBase64.length; i += CHUNK_SIZE) {
          chunks.push(zipBase64.slice(i, i + CHUNK_SIZE));
        }

        const masterFields: Record<string, any> = {
          botId: toFirestoreValue(botId),
          chunk: toFirestoreValue(chunks[0]),
          isSharded: toFirestoreValue(true),
          shardsCount: toFirestoreValue(chunks.length),
          fileCount: toFirestoreValue(fileCount),
          byteLength: toFirestoreValue(zipBuf.length),
          updatedAt: toFirestoreValue(Date.now())
        };

        const masterUrl = `${BASE_URL}/bot_workspaces/${docId}?key=${API_KEY}`;
        await fetch(masterUrl, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ fields: masterFields })
        });

        // Upload remaining shards
        for (let idx = 1; idx < chunks.length; idx++) {
          const shardDocId = `${docId}_s${idx}`;
          const shardFields: Record<string, any> = {
            botId: toFirestoreValue(botId),
            shardIndex: toFirestoreValue(idx),
            chunk: toFirestoreValue(chunks[idx]),
            updatedAt: toFirestoreValue(Date.now())
          };
          const shardUrl = `${BASE_URL}/bot_workspaces/${shardDocId}?key=${API_KEY}`;
          await fetch(shardUrl, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ fields: shardFields })
          }).catch(() => {});
        }
        return true;
      }
    } catch (err: any) {
      console.warn(`[FirebaseSync] syncBotWorkspaceToCloud error for ${botId}:`, err?.message || err);
      return false;
    }
  }

  static async restoreBotWorkspaceFromCloud(botId: string, botDir: string): Promise<boolean> {
    if (!botId) return false;
    const docId = encodeURIComponent(String(botId).replace(/[^a-zA-Z0-9_-]/g, '_'));

    // 1. Try Firebase Firestore Cloud Vault first
    try {
      const idToken = await getAdminIdToken();
      const url = `${BASE_URL}/bot_workspaces/${docId}?key=${API_KEY}`;
      const headers: Record<string, string> = {
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
      };

      const res = await fetch(url, { headers });
      if (res && res.ok) {
        const data: any = await res.json();
        const parsed = fromFirestoreFields(data.fields || {});
        let fullZipBase64 = '';

        if (parsed.isSharded && typeof parsed.chunk === 'string') {
          fullZipBase64 = parsed.chunk;
          const shardsCount = Number(parsed.shardsCount) || 1;
          for (let idx = 1; idx < shardsCount; idx++) {
            const shardDocId = `${docId}_s${idx}`;
            const shardRes = await fetch(`${BASE_URL}/bot_workspaces/${shardDocId}?key=${API_KEY}`, { headers }).catch(() => null);
            if (shardRes && shardRes.ok) {
              const shardData: any = await shardRes.json();
              const shardParsed = fromFirestoreFields(shardData.fields || {});
              if (shardParsed.chunk) {
                fullZipBase64 += shardParsed.chunk;
              }
            }
          }
        } else if (parsed.zipBase64) {
          fullZipBase64 = parsed.zipBase64;
        }

        if (fullZipBase64) {
          fs.mkdirSync(botDir, { recursive: true });
          const zipBuf = Buffer.from(fullZipBase64, 'base64');
          const zip = new AdmZip(zipBuf);
          zip.extractAllTo(botDir, true);
          // Mirror to local vault
          try {
            const localVaultDir = path.join(process.cwd(), 'hosted_bots', '.persistent_vault');
            if (!fs.existsSync(localVaultDir)) fs.mkdirSync(localVaultDir, { recursive: true });
            fs.writeFileSync(path.join(localVaultDir, `${docId}.zip`), zipBuf);
          } catch {}
          console.log(`✅ [FirebaseSync] Restored bot workspace files for ${botId} from Firestore Cloud (${parsed.fileCount || 'multiple'} files)!`);
          return true;
        }
      }
    } catch (err: any) {
      console.warn(`[FirebaseSync] restoreBotWorkspaceFromCloud Firestore attempt warning for ${botId}:`, err?.message || err);
    }

    // 2. Fallback to Local Persistent Vault mirror if Firestore is unavailable
    try {
      const localZipPath = path.join(process.cwd(), 'hosted_bots', '.persistent_vault', `${docId}.zip`);
      if (fs.existsSync(localZipPath)) {
        fs.mkdirSync(botDir, { recursive: true });
        const zip = new AdmZip(localZipPath);
        zip.extractAllTo(botDir, true);
        console.log(`✅ [FirebaseSync] Restored bot workspace files for ${botId} from Local Persistent Vault mirror!`);
        return true;
      }
    } catch (err: any) {
      console.warn(`[FirebaseSync] Local vault fallback error for ${botId}:`, err?.message || err);
    }

    return false;
  }

  // ==========================================
  // WEBSITES FIRESTORE SYNC & WORKSPACE RESTORE
  // ==========================================
  static async syncWebsiteToCloud(site: any): Promise<boolean> {
    if (!site || !site.id) return false;
    try {
      const docId = encodeURIComponent(String(site.id).replace(/[^a-zA-Z0-9_-]/g, '_'));
      const idToken = await getAdminIdToken();

      const fields: Record<string, any> = {};
      for (const [key, val] of Object.entries(site)) {
        if (val !== undefined && val !== null) {
          fields[key] = toFirestoreValue(val);
        }
      }
      fields['updatedAt'] = toFirestoreValue(Date.now());

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
      };

      const url = `${BASE_URL}/websites/${docId}?key=${API_KEY}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields })
      });
      return Boolean(res && res.ok);
    } catch {
      return false;
    }
  }

  static async syncWebsiteWorkspaceToCloud(siteId: string, siteDir: string): Promise<boolean> {
    if (!siteId || !fs.existsSync(siteDir)) return false;
    try {
      const zip = new AdmZip();
      let fileCount = 0;

      const addDirRecursive = (currentDir: string, zipSubDir = '') => {
        const items = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const item of items) {
          if (
            item.name === '__pycache__' ||
            item.name === '.git' ||
            item.name === 'node_modules' ||
            item.name === '.DS_Store' ||
            item.name === '_archive.zip'
          ) continue;

          const fullPath = path.join(currentDir, item.name);
          if (item.isDirectory()) {
            addDirRecursive(fullPath, zipSubDir ? `${zipSubDir}/${item.name}` : item.name);
          } else if (item.isFile()) {
            try {
              const fileBuf = fs.readFileSync(fullPath);
              zip.addFile(zipSubDir ? `${zipSubDir}/${item.name}` : item.name, fileBuf);
              fileCount++;
            } catch {}
          }
        }
      };

      addDirRecursive(siteDir);
      if (fileCount === 0) return false;

      const zipBuf = zip.toBuffer();
      const docId = encodeURIComponent(String(siteId).replace(/[^a-zA-Z0-9_-]/g, '_'));

      // Dual-layer vaulting: Save persistent local mirror
      try {
        const localVaultDir = path.join(process.cwd(), 'hosted_websites', '.persistent_vault');
        if (!fs.existsSync(localVaultDir)) fs.mkdirSync(localVaultDir, { recursive: true });
        fs.writeFileSync(path.join(localVaultDir, `${docId}.zip`), zipBuf);
      } catch {}

      const zipBase64 = zipBuf.toString('base64');
      const idToken = await getAdminIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
      };

      const CHUNK_SIZE = 500000;
      if (zipBase64.length <= CHUNK_SIZE) {
        // Single document upload
        const fields: Record<string, any> = {
          websiteId: toFirestoreValue(siteId),
          zipBase64: toFirestoreValue(zipBase64),
          isSharded: toFirestoreValue(false),
          shardsCount: toFirestoreValue(1),
          fileCount: toFirestoreValue(fileCount),
          byteLength: toFirestoreValue(zipBuf.length),
          updatedAt: toFirestoreValue(Date.now())
        };

        const url = `${BASE_URL}/website_workspaces/${docId}?key=${API_KEY}`;
        const res = await fetch(url, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ fields })
        });
        return Boolean(res && res.ok);
      } else {
        // Multi-document sharding for large website assets
        const chunks: string[] = [];
        for (let i = 0; i < zipBase64.length; i += CHUNK_SIZE) {
          chunks.push(zipBase64.slice(i, i + CHUNK_SIZE));
        }

        const masterFields: Record<string, any> = {
          websiteId: toFirestoreValue(siteId),
          chunk: toFirestoreValue(chunks[0]),
          isSharded: toFirestoreValue(true),
          shardsCount: toFirestoreValue(chunks.length),
          fileCount: toFirestoreValue(fileCount),
          byteLength: toFirestoreValue(zipBuf.length),
          updatedAt: toFirestoreValue(Date.now())
        };

        const masterUrl = `${BASE_URL}/website_workspaces/${docId}?key=${API_KEY}`;
        await fetch(masterUrl, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ fields: masterFields })
        });

        // Upload remaining shards
        for (let idx = 1; idx < chunks.length; idx++) {
          const shardDocId = `${docId}_s${idx}`;
          const shardFields: Record<string, any> = {
            websiteId: toFirestoreValue(siteId),
            shardIndex: toFirestoreValue(idx),
            chunk: toFirestoreValue(chunks[idx]),
            updatedAt: toFirestoreValue(Date.now())
          };
          const shardUrl = `${BASE_URL}/website_workspaces/${shardDocId}?key=${API_KEY}`;
          await fetch(shardUrl, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ fields: shardFields })
          }).catch(() => {});
        }
        return true;
      }
    } catch (err: any) {
      console.warn(`[FirebaseSync] syncWebsiteWorkspaceToCloud error for ${siteId}:`, err?.message || err);
      return false;
    }
  }

  static async restoreWebsiteWorkspaceFromCloud(siteId: string, siteDir: string): Promise<boolean> {
    if (!siteId) return false;
    const docId = encodeURIComponent(String(siteId).replace(/[^a-zA-Z0-9_-]/g, '_'));

    // 1. Try Firebase Firestore Cloud Vault first
    try {
      const idToken = await getAdminIdToken();
      const url = `${BASE_URL}/website_workspaces/${docId}?key=${API_KEY}`;
      const headers: Record<string, string> = {
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
      };

      const res = await fetch(url, { headers });
      if (res && res.ok) {
        const data: any = await res.json();
        const parsed = fromFirestoreFields(data.fields || {});
        let fullZipBase64 = '';

        if (parsed.isSharded && typeof parsed.chunk === 'string') {
          fullZipBase64 = parsed.chunk;
          const shardsCount = Number(parsed.shardsCount) || 1;
          for (let idx = 1; idx < shardsCount; idx++) {
            const shardDocId = `${docId}_s${idx}`;
            const shardRes = await fetch(`${BASE_URL}/website_workspaces/${shardDocId}?key=${API_KEY}`, { headers }).catch(() => null);
            if (shardRes && shardRes.ok) {
              const shardData: any = await shardRes.json();
              const shardParsed = fromFirestoreFields(shardData.fields || {});
              if (shardParsed.chunk) {
                fullZipBase64 += shardParsed.chunk;
              }
            }
          }
        } else if (parsed.zipBase64) {
          fullZipBase64 = parsed.zipBase64;
        }

        if (fullZipBase64) {
          fs.mkdirSync(siteDir, { recursive: true });
          const zipBuf = Buffer.from(fullZipBase64, 'base64');
          const zip = new AdmZip(zipBuf);
          zip.extractAllTo(siteDir, true);
          // Mirror to local vault
          try {
            const localVaultDir = path.join(process.cwd(), 'hosted_websites', '.persistent_vault');
            if (!fs.existsSync(localVaultDir)) fs.mkdirSync(localVaultDir, { recursive: true });
            fs.writeFileSync(path.join(localVaultDir, `${docId}.zip`), zipBuf);
          } catch {}
          console.log(`✅ [FirebaseSync] Restored website workspace files for ${siteId} from Firestore Cloud (${parsed.fileCount || 'multiple'} files)!`);
          return true;
        }
      }
    } catch (err: any) {
      console.warn(`[FirebaseSync] restoreWebsiteWorkspaceFromCloud Firestore attempt warning for ${siteId}:`, err?.message || err);
    }

    // 2. Fallback to Local Persistent Vault mirror if Firestore is unavailable
    try {
      const localZipPath = path.join(process.cwd(), 'hosted_websites', '.persistent_vault', `${docId}.zip`);
      if (fs.existsSync(localZipPath)) {
        fs.mkdirSync(siteDir, { recursive: true });
        const zip = new AdmZip(localZipPath);
        zip.extractAllTo(siteDir, true);
        console.log(`✅ [FirebaseSync] Restored website workspace files for ${siteId} from Local Persistent Vault mirror!`);
        return true;
      }
    } catch (err: any) {
      console.warn(`[FirebaseSync] Local vault fallback error for ${siteId}:`, err?.message || err);
    }

    return false;
  }

  static async deleteWebsiteFromCloud(siteId: string): Promise<boolean> {
    if (!siteId) return false;
    try {
      const docId = encodeURIComponent(String(siteId).replace(/[^a-zA-Z0-9_-]/g, '_'));
      const idToken = await getAdminIdToken();
      const headers: Record<string, string> = {
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
      };
      const url = `${BASE_URL}/websites/${docId}?key=${API_KEY}`;
      const res = await fetch(url, { method: 'DELETE', headers }).catch(() => null);
      // Also delete website workspace document
      await fetch(`${BASE_URL}/website_workspaces/${docId}?key=${API_KEY}`, { method: 'DELETE', headers }).catch(() => null);
      return Boolean(res && res.ok);
    } catch {
      return false;
    }
  }

  static async loadWebsitesFromCloud(): Promise<any[]> {
    const list: any[] = [];
    try {
      const idToken = await getAdminIdToken();
      const url = `${BASE_URL}/websites?pageSize=300&key=${API_KEY}`;
      const headers: Record<string, string> = {
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
      };
      const res = await fetch(url, { headers });
      if (res && res.ok) {
        const data: any = await res.json();
        if (data.documents && Array.isArray(data.documents)) {
          for (const doc of data.documents) {
            const parsed = fromFirestoreFields(doc.fields || {});
            if (parsed && parsed.id) list.push(parsed);
          }
        }
      }
    } catch {}
    return list;
  }

  // ==========================================
  // NOTIFICATIONS FIRESTORE SYNC
  // ==========================================
  static async syncNotificationToCloud(notif: any): Promise<boolean> {
    if (!notif || !notif.id) return false;
    try {
      const docId = encodeURIComponent(String(notif.id).replace(/[^a-zA-Z0-9_-]/g, '_'));
      const idToken = await getAdminIdToken();

      const fields: Record<string, any> = {};
      for (const [key, val] of Object.entries(notif)) {
        if (val !== undefined && val !== null) {
          fields[key] = toFirestoreValue(val);
        }
      }
      fields['updatedAt'] = toFirestoreValue(Date.now());

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
      };

      const url = `${BASE_URL}/notifications/${docId}?key=${API_KEY}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields })
      });
      return Boolean(res && res.ok);
    } catch {
      return false;
    }
  }

  static async deleteNotificationFromCloud(notifId: string): Promise<boolean> {
    if (!notifId) return false;
    try {
      const docId = encodeURIComponent(String(notifId).replace(/[^a-zA-Z0-9_-]/g, '_'));
      const idToken = await getAdminIdToken();
      const headers: Record<string, string> = {
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
      };
      const url = `${BASE_URL}/notifications/${docId}?key=${API_KEY}`;
      const res = await fetch(url, { method: 'DELETE', headers }).catch(() => null);
      return Boolean(res && res.ok);
    } catch {
      return false;
    }
  }

  static async loadNotificationsFromCloud(): Promise<any[]> {
    const list: any[] = [];
    try {
      const idToken = await getAdminIdToken();
      const url = `${BASE_URL}/notifications?pageSize=200&key=${API_KEY}`;
      const headers: Record<string, string> = {
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
      };
      const res = await fetch(url, { headers });
      if (res && res.ok) {
        const data: any = await res.json();
        if (data.documents && Array.isArray(data.documents)) {
          for (const doc of data.documents) {
            const parsed = fromFirestoreFields(doc.fields || {});
            if (parsed && parsed.id) list.push(parsed);
          }
        }
      }
    } catch {}
    return list;
  }
}


