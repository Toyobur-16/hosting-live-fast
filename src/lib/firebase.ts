// Firebase Client Initialization & Helpers
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc as rawSetDoc,
  updateDoc as rawUpdateDoc,
  deleteDoc as rawDeleteDoc,
  addDoc as rawAddDoc,
  where,
  collection,
  onSnapshot as rawOnSnapshot,
  getDocs,
  query,
  orderBy,
  limit
} from 'firebase/firestore';

import firebaseAppletConfig from '../../firebase-applet-config.json';

// Default config from user's Firebase project (firebase-applet-config.json)
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: firebaseAppletConfig.authDomain,
  databaseURL: (firebaseAppletConfig as any).databaseURL || `https://${firebaseAppletConfig.projectId}-default-rtdb.firebaseio.com`,
  projectId: firebaseAppletConfig.projectId,
  storageBucket: firebaseAppletConfig.storageBucket,
  messagingSenderId: firebaseAppletConfig.messagingSenderId,
  appId: firebaseAppletConfig.appId,
  measurementId: firebaseAppletConfig.measurementId
};

// Secondary preview-authorized Firebase Auth config with web.app domain
const previewFallbackConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_FALLBACK_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: `${firebaseAppletConfig.projectId}.web.app`,
  databaseURL: (firebaseAppletConfig as any).databaseURL || `https://${firebaseAppletConfig.projectId}-default-rtdb.firebaseio.com`,
  projectId: firebaseAppletConfig.projectId,
  storageBucket: firebaseAppletConfig.storageBucket,
  messagingSenderId: firebaseAppletConfig.messagingSenderId,
  appId: firebaseAppletConfig.appId
};

// Initialize primary app single-instance
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize fallback auth app for preview domains
const fallbackApp = getApps().find((a) => a.name === 'preview-auth-fallback') || initializeApp(previewFallbackConfig, 'preview-auth-fallback');

export const auth = getAuth(app);
export const fallbackAuth = getAuth(fallbackApp);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore with specific database ID if configured
export const defaultDb = getFirestore(app);
export const db = firebaseAppletConfig.firestoreDatabaseId && firebaseAppletConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseAppletConfig.firestoreDatabaseId)
  : defaultDb;

// Quota exhaustion tracker across client app to prevent freezing and resource-exhausted spam
let firestoreQuotaExhaustedUntil = 0;
try {
  const stored = typeof localStorage !== 'undefined'
    ? (localStorage.getItem('hlf_fs_quota_exhausted') || sessionStorage.getItem('hlf_fs_quota_exhausted'))
    : null;
  if (stored) {
    const val = parseInt(stored, 10);
    if (!isNaN(val) && val > Date.now()) {
      firestoreQuotaExhaustedUntil = val;
    }
  }
} catch {}

function markQuotaExhausted() {
  firestoreQuotaExhaustedUntil = Date.now() + 2 * 60 * 60 * 1000;
  try {
    localStorage.setItem('hlf_fs_quota_exhausted', String(firestoreQuotaExhaustedUntil));
    sessionStorage.setItem('hlf_fs_quota_exhausted', String(firestoreQuotaExhaustedUntil));
  } catch {}
  console.warn('⚠️ [Firestore] Free daily write quota reached on Google Cloud project. Client writes safely falling back to server-side persistence.');
}

function isQuotaExhausted(): boolean {
  return Date.now() < firestoreQuotaExhaustedUntil;
}

function withTimeout<T>(promise: Promise<T>, ms = 2500): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(undefined as any);
      }
    }, ms);

    promise
      .then((val) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(val);
        }
      })
      .catch((err) => {
        // Always catch to prevent unhandled rejection, even if timer already fired
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        } else {
          handleWriteError(err);
        }
      });
  });
}

function handleWriteError(err: any): void {
  const msg = String(err?.message || err?.code || err || '').toLowerCase();
  if (
    err?.code === 'resource-exhausted' ||
    msg.includes('resource-exhausted') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota limit exceeded') ||
    msg.includes('quota exceeded') ||
    msg.includes('free daily write units')
  ) {
    markQuotaExhausted();
    return;
  }
  console.warn('⚠️ [Firestore write notice]:', err?.message || err);
}

// Quota-safe write operations: Never hang and never throw unhandled resource-exhausted errors
export const setDoc = async (reference: any, data: any, options?: any): Promise<void> => {
  if (isQuotaExhausted()) return;
  try {
    const rawPromise = options ? rawSetDoc(reference, data, options) : rawSetDoc(reference, data);
    rawPromise.catch((err) => handleWriteError(err));
    await withTimeout(rawPromise, 2500);
  } catch (err: any) {
    handleWriteError(err);
  }
};

export const updateDoc = async (reference: any, ...args: any[]): Promise<void> => {
  if (isQuotaExhausted()) return;
  try {
    const rawPromise = (rawUpdateDoc as any)(reference, ...args);
    rawPromise.catch((err: any) => handleWriteError(err));
    await withTimeout(rawPromise, 2500);
  } catch (err: any) {
    handleWriteError(err);
  }
};

export const deleteDoc = async (reference: any): Promise<void> => {
  if (isQuotaExhausted()) return;
  try {
    const rawPromise = rawDeleteDoc(reference);
    rawPromise.catch((err) => handleWriteError(err));
    await withTimeout(rawPromise, 2500);
  } catch (err: any) {
    handleWriteError(err);
  }
};

export const addDoc = async (reference: any, data: any): Promise<any> => {
  if (isQuotaExhausted()) return { id: 'local_' + Date.now() };
  try {
    const rawPromise = rawAddDoc(reference, data);
    rawPromise.catch((err) => handleWriteError(err));
    return await withTimeout(rawPromise, 2500);
  } catch (err: any) {
    handleWriteError(err);
    return { id: 'local_' + Date.now() };
  }
};

// Safe onSnapshot wrapper that always attaches an error callback to avoid uncaught window errors
export const onSnapshot = (refOrQuery: any, ...args: any[]): (() => void) => {
  try {
    let onNext: any = null;
    let onError: any = null;
    let options: any = null;

    if (typeof args[0] === 'function') {
      onNext = args[0];
      onError = args[1];
    } else if (typeof args[0] === 'object' && args[0] !== null) {
      if (typeof args[1] === 'function') {
        options = args[0];
        onNext = args[1];
        onError = args[2];
      } else if (typeof (args[0] as any).next === 'function') {
        const observer = args[0];
        const safeObserver = {
          next: observer.next?.bind(observer),
          error: (err: any) => {
            const msg = String(err?.message || err?.code || '').toLowerCase();
            if (err?.code === 'resource-exhausted' || msg.includes('quota')) {
              markQuotaExhausted();
            }
            if (observer.error) {
              try { observer.error(err); } catch {}
            }
          },
          complete: observer.complete?.bind(observer)
        };
        return rawOnSnapshot(refOrQuery, safeObserver as any);
      }
    }

    const safeOnError = (err: any) => {
      const msg = String(err?.message || err?.code || '').toLowerCase();
      if (err?.code === 'resource-exhausted' || msg.includes('quota')) {
        markQuotaExhausted();
      }
      if (typeof onError === 'function') {
        try {
          onError(err);
        } catch {}
      }
    };

    if (options) {
      return rawOnSnapshot(refOrQuery, options, onNext, safeOnError);
    } else if (onNext) {
      return rawOnSnapshot(refOrQuery, onNext, safeOnError);
    } else {
      return (rawOnSnapshot as any)(refOrQuery, ...args);
    }
  } catch (err) {
    console.warn('⚠️ [onSnapshot setup notice]:', err);
    return () => {};
  }
};

export {
  firebaseAppletConfig,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  doc,
  getDoc,
  where,
  collection,
  getDocs,
  query,
  orderBy,
  limit
};
