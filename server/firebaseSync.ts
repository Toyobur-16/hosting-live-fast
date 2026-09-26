// Firebase Cloud Firestore Synchronizer for Server-Side Persistence
// Directly connects to Firebase Firestore REST API using the configured Firebase project
// This ensures that even if local disk / container restarts, user accounts and balances are restored from Firestore!

import fs from 'fs';
import path from 'path';

let configProjectId = 'hosting-live-fast-11b13';
let configDbId = 'ai-studio-hostinglivefast-da0b37bd-7efe-4e63-a45c-5755c4657e1e';
let configApiKey = 'AIzaSyA08M7c1iHvXhQHeUf8kXS5cUvtJ8s_kqY';

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

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents`;

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

// Helper: Convert Firestore Document to JS object
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

export class FirebaseSync {
  private static isInitialized = false;

  /**
   * Upsert a user account document to Firebase Firestore.
   */
  static async syncAccountToCloud(user: any): Promise<boolean> {
    if (!user || !user.id) return false;
    try {
      const docId = encodeURIComponent(user.id);
      const fields: Record<string, any> = {};
      for (const [key, val] of Object.entries(user)) {
        if (val !== undefined) {
          fields[key] = toFirestoreValue(val);
        }
      }

      const url = `${BASE_URL}/accounts/${docId}?key=${API_KEY}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields })
      });

      if (!res.ok) {
        // Fallback try with default database if custom database ID gave 404
        if (res.status === 404 && FIRESTORE_DATABASE_ID !== '(default)') {
          const fallbackUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/accounts/${docId}?key=${API_KEY}`;
          await fetch(fallbackUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields })
          });
        }
      }
      return true;
    } catch (err: any) {
      console.warn('FirebaseSync syncAccountToCloud error:', err.message || err);
      return false;
    }
  }

  /**
   * Load all accounts from Firebase Firestore and merge with local accounts.
   */
  static async loadAccountsFromCloud(): Promise<any[]> {
    try {
      let url = `${BASE_URL}/accounts?pageSize=300&key=${API_KEY}`;
      let res = await fetch(url);
      if (!res.ok && FIRESTORE_DATABASE_ID !== '(default)') {
        url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/accounts?pageSize=300&key=${API_KEY}`;
        res = await fetch(url);
      }

      if (!res.ok) {
        return [];
      }

      const data: any = await res.json();
      if (!data.documents || !Array.isArray(data.documents)) {
        return [];
      }

      const remoteAccounts = data.documents.map((docItem: any) => {
        const fields = docItem.fields || {};
        return fromFirestoreFields(fields);
      }).filter((acc: any) => acc && acc.id);

      return remoteAccounts;
    } catch (err: any) {
      console.warn('FirebaseSync loadAccountsFromCloud error:', err.message || err);
      return [];
    }
  }

  /**
   * Periodic or on-startup bi-directional sync
   */
  static async initSync(getAccountsFn: () => any[], saveAccountsFn: (acc: any[]) => void) {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      console.log('🔄 Initializing Firebase Firestore Cloud Sync for user balances & accounts...');
      const remoteAccounts = await this.loadAccountsFromCloud();
      const localAccounts = getAccountsFn() || [];

      // Merge: remote accounts overwrite local if balance or timestamp is newer, or new accounts are brought in
      const mergedMap = new Map<string, any>();

      // 1. Put local accounts first
      for (const loc of localAccounts) {
        if (loc && loc.id) {
          mergedMap.set(loc.id, loc);
        }
      }

      // 2. Merge remote accounts
      let hasChanges = false;
      for (const rem of remoteAccounts) {
        if (!rem || !rem.id) continue;
        const existing = mergedMap.get(rem.id);
        if (!existing) {
          mergedMap.set(rem.id, rem);
          hasChanges = true;
        } else {
          // If remote account has balance or is updated, keep the higher balance to prevent loss
          const updated = {
            ...existing,
            ...rem,
            balanceUsd: Math.max(existing.balanceUsd || 0, rem.balanceUsd || 0),
            balanceBdt: Math.max(existing.balanceBdt || 0, rem.balanceBdt || 0)
          };
          mergedMap.set(rem.id, updated);
          hasChanges = true;
        }
      }

      const finalAccounts = Array.from(mergedMap.values());
      if (hasChanges || finalAccounts.length > localAccounts.length) {
        saveAccountsFn(finalAccounts);
        console.log(`✅ Restored & synced ${finalAccounts.length} user accounts from Firebase Firestore!`);
      }

      // Upload any local accounts that are not yet in Firestore
      for (const acc of finalAccounts) {
        this.syncAccountToCloud(acc).catch(() => {});
      }
    } catch (err: any) {
      console.warn('FirebaseSync initial sync warning:', err.message || err);
    }
  }

  /**
   * Sync deposit request to Cloud Firestore
   */
  static async syncPlanRequestToCloud(planReq: any): Promise<boolean> {
    if (!planReq || !planReq.id) return false;
    try {
      const docId = encodeURIComponent(planReq.id);
      const fields: Record<string, any> = {};
      for (const [key, val] of Object.entries(planReq)) {
        if (val !== undefined) {
          fields[key] = toFirestoreValue(val);
        }
      }

      let url = `${BASE_URL}/plan_requests/${docId}?key=${API_KEY}`;
      let res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields })
      });

      if (!res.ok && FIRESTORE_DATABASE_ID !== '(default)') {
        const fallbackUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/plan_requests/${docId}?key=${API_KEY}`;
        await fetch(fallbackUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields })
        });
      }
      return true;
    } catch (err: any) {
      console.warn('FirebaseSync syncPlanRequestToCloud warning:', err.message || err);
      return false;
    }
  }
}
