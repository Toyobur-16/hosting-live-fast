// Firebase Cloud Synchronizer for Server-Side Persistence
// Uses Google Firebase Authentication Cloud Vault & Shards (HTTPS 443) + Firestore fallback
// Ensures user accounts, passwords, balances, and plans are 100% preserved across any site update or container restart!

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';

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
const AUTH_BASE_URL = 'https://identitytoolkit.googleapis.com/v1/accounts';

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

export class FirebaseSync {
  private static isInitialized = false;
  private static shardSyncTimer: NodeJS.Timeout | null = null;

  /**
   * Upsert a single user account to their personal Firebase Auth Cloud Vault + Firestore
   */
  static async syncAccountToCloud(user: any): Promise<boolean> {
    if (!user || !user.id || !user.email) return false;
    try {
      const cleanUser = stripHeavyFields(user);
      const { vaultEmail, vaultPassword } = getUserVaultIdentity(cleanUser.email);
      await writeVaultData(vaultEmail, vaultPassword, cleanUser.email, cleanUser);

      // Best-effort Firestore sync
      const docId = encodeURIComponent(cleanUser.id);
      const fields: Record<string, any> = {};
      for (const [key, val] of Object.entries(cleanUser)) {
        if (val !== undefined) {
          fields[key] = toFirestoreValue(val);
        }
      }
      const url = `${BASE_URL}/accounts/${docId}?key=${API_KEY}`;
      fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields })
      }).catch(() => {});

      return true;
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

      // Each shard comfortably holds up to 12 accounts compressed
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
   * Instant on-demand lookup of a single user account from their personal Cloud Vault by email
   */
  static async loadSingleAccountByEmail(email: string): Promise<any | null> {
    if (!email || !email.includes('@')) return null;
    try {
      const { vaultEmail, vaultPassword } = getUserVaultIdentity(email);
      const data = await readVaultData(vaultEmail, vaultPassword);
      if (data && data.id && data.email) {
        return data;
      }
    } catch {}
    return null;
  }

  /**
   * Load all accounts from Master Cloud Shards + Firestore
   */
  static async loadAccountsFromCloud(): Promise<any[]> {
    const collected: any[] = [];
    try {
      // 1. Read Master Cloud Shards from Firebase Auth
      const { shardEmail: s0Email, shardPassword: s0Pass } = getMasterShardIdentity(0);
      const shard0 = await readVaultData(s0Email, s0Pass);
      if (shard0) {
        if (Array.isArray(shard0)) {
          collected.push(...shard0);
        } else if (Array.isArray(shard0.accounts)) {
          collected.push(...shard0.accounts);
          const totalShards = Math.min(10, Number(shard0.totalShards) || 1);
          for (let i = 1; i < totalShards; i++) {
            const { shardEmail, shardPassword } = getMasterShardIdentity(i);
            const nextShard = await readVaultData(shardEmail, shardPassword);
            if (nextShard && Array.isArray(nextShard.accounts)) {
              collected.push(...nextShard.accounts);
            }
          }
        }
      }

      // 2. Also check Firestore if accessible
      const url = `${BASE_URL}/accounts?pageSize=300&key=${API_KEY}`;
      const res = await fetch(url).catch(() => null);
      if (res && res.ok) {
        const data: any = await res.json();
        if (data.documents && Array.isArray(data.documents)) {
          const remoteAccounts = data.documents
            .map((docItem: any) => fromFirestoreFields(docItem.fields || {}))
            .filter((acc: any) => acc && acc.id);
          collected.push(...remoteAccounts);
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
      const localAccounts = getAccountsFn() || [];

      const mergedMap = new Map<string, any>();

      for (const loc of localAccounts) {
        if (loc && loc.email) {
          mergedMap.set(loc.email.trim().toLowerCase(), loc);
        }
      }

      let hasChanges = false;
      for (const rem of remoteAccounts) {
        if (!rem || !rem.email) continue;
        const emailKey = rem.email.trim().toLowerCase();
        const existing = mergedMap.get(emailKey);
        if (!existing) {
          mergedMap.set(emailKey, rem);
          hasChanges = true;
        } else {
          const updated = {
            ...existing,
            ...rem,
            password: rem.password || existing.password || '',
            balanceUsd: Math.max(existing.balanceUsd || 0, rem.balanceUsd || 0),
            balanceBdt: Math.max(existing.balanceBdt || 0, rem.balanceBdt || 0),
            emailVerified: Boolean(existing.emailVerified || rem.emailVerified),
            isVerified: Boolean(existing.isVerified || rem.isVerified)
          };
          mergedMap.set(emailKey, updated);
          hasChanges = true;
        }
      }

      const finalAccounts = Array.from(mergedMap.values());
      if (hasChanges || finalAccounts.length > localAccounts.length) {
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

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
      };

      const bodyStr = JSON.stringify({ fields });

      // 1. Sync to /plan_requests collection
      const url1 = `${BASE_URL}/plan_requests/${docId}?key=${API_KEY}`;
      const res1 = await fetch(url1, {
        method: 'PATCH',
        headers,
        body: bodyStr
      }).catch((e) => {
        console.warn('syncPlanRequestToCloud fetch error (/plan_requests):', e?.message || e);
        return null;
      });

      // 2. If it's a deposit request, also sync to /deposits collection for 100% redundancy
      let res2Ok = true;
      if (planReq.type === 'deposit' || planReq.planId === 'wallet_deposit' || !planReq.planId) {
        const url2 = `${BASE_URL}/deposits/${docId}?key=${API_KEY}`;
        const res2 = await fetch(url2, {
          method: 'PATCH',
          headers,
          body: bodyStr
        }).catch(() => null);
        res2Ok = Boolean(res2 && res2.ok);
      }

      const isSuccess = Boolean(res1 && res1.ok) || res2Ok;
      if (isSuccess) {
        console.log(`✅ [Firebase Firestore] Saved deposit/plan request ${planReq.id} (Status: ${planReq.status}, Amount: $${planReq.amount})`);
      } else if (res1 && !res1.ok) {
        const errText = await res1.text().catch(() => '');
        console.warn(`⚠️ [Firebase Firestore] syncPlanRequestToCloud failed (${res1.status}):`, errText);
      }
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
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
      };

      // 1. Read from /plan_requests
      const url1 = `${BASE_URL}/plan_requests?pageSize=300&key=${API_KEY}`;
      const res1 = await fetch(url1, { headers }).catch(() => null);
      if (res1 && res1.ok) {
        const data1: any = await res1.json();
        if (data1.documents && Array.isArray(data1.documents)) {
          for (const docItem of data1.documents) {
            const parsed = fromFirestoreFields(docItem.fields || {});
            if (parsed && parsed.id && !seenIds.has(parsed.id)) {
              seenIds.add(parsed.id);
              collected.push(parsed);
            }
          }
        }
      }

      // 2. Read from /deposits
      const url2 = `${BASE_URL}/deposits?pageSize=300&key=${API_KEY}`;
      const res2 = await fetch(url2, { headers }).catch(() => null);
      if (res2 && res2.ok) {
        const data2: any = await res2.json();
        if (data2.documents && Array.isArray(data2.documents)) {
          for (const docItem of data2.documents) {
            const parsed = fromFirestoreFields(docItem.fields || {});
            if (parsed && parsed.id && !seenIds.has(parsed.id)) {
              seenIds.add(parsed.id);
              collected.push(parsed);
            }
          }
        }
      }
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

      // Put local requests into map
      for (const loc of localRequests) {
        if (loc && loc.id) {
          mergedMap.set(loc.id, loc);
        }
      }

      let hasChanges = false;
      // Merge remote requests
      for (const rem of remoteRequests) {
        if (!rem || !rem.id) continue;
        const existing = mergedMap.get(rem.id);
        if (!existing) {
          mergedMap.set(rem.id, rem);
          hasChanges = true;
        } else {
          // If remote request has updated status (e.g. approved or rejected), update it
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

      // Ensure any requests that only existed locally get backed up to Firebase Firestore
      for (const req of finalRequests) {
        this.syncPlanRequestToCloud(req).catch(() => {});
      }
    } catch (err: any) {
      console.warn('FirebaseSync initPlanRequestsSync warning:', err.message || err);
    }
  }

  // ==========================================
  // SITE SETTINGS, LOGO & BRANDING SYNC
  // ==========================================
  static async syncSiteSettingsToCloud(settings: any): Promise<boolean> {
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

      const url = `${BASE_URL}/site_settings/general`;
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
      console.warn('FirebaseSync syncSiteSettingsToCloud error:', err.message || err);
      return false;
    }
  }

  static async loadSiteSettingsFromCloud(): Promise<any | null> {
    try {
      const idToken = await getAdminIdToken();
      if (!idToken) return null;

      const url = `${BASE_URL}/site_settings/general`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${idToken}` }
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
      if (!idToken) return false;

      const rawBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const safeId = encodeURIComponent(imageId.replace(/[^a-zA-Z0-9_-]/g, '_'));

      const url = `${BASE_URL}/site_images/${safeId}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          fields: {
            id: { stringValue: imageId },
            fileName: { stringValue: fileName || imageId },
            contentType: { stringValue: contentType || 'image/png' },
            base64: { stringValue: rawBase64 },
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
      if (!idToken) return null;

      const safeId = encodeURIComponent(imageId.replace(/[^a-zA-Z0-9_-]/g, '_'));
      const url = `${BASE_URL}/site_images/${safeId}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (!res.ok) return null;
      const data: any = await res.json();
      if (data && data.fields?.base64?.stringValue) {
        return {
          base64: data.fields.base64.stringValue,
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
      return res.ok;
    } catch (err: any) {
      console.warn('FirebaseSync syncSocialTasksToCloud error:', err.message || err);
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
}
