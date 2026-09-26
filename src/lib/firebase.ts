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
  setDoc,
  updateDoc,
  collection,
  onSnapshot
} from 'firebase/firestore';

import firebaseAppletConfig from '../../firebase-applet-config.json';

// Default config from user's Firebase project (hosting-live-fast-11b13)
export const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey || "AIzaSyA08M7c1iHvXhQHeUf8kXS5cUvtJ8s_kqY",
  authDomain: firebaseAppletConfig.authDomain || "hosting-live-fast-11b13.firebaseapp.com",
  projectId: firebaseAppletConfig.projectId || "hosting-live-fast-11b13",
  storageBucket: firebaseAppletConfig.storageBucket || "hosting-live-fast-11b13.firebasestorage.app",
  messagingSenderId: firebaseAppletConfig.messagingSenderId || "880032238370",
  appId: firebaseAppletConfig.appId || "1:880032238370:web:c0510582bebc2ce71c737b",
  measurementId: firebaseAppletConfig.measurementId || "G-K2NFZE486M"
};

// Secondary preview-authorized Firebase Auth config (used automatically if current preview domain is not yet added in hosting-live-fast-11b13)
const previewFallbackConfig = {
  apiKey: "AIzaSyCEhmg6xeuuPrDRnfbPiKhC9qaEEKMFwc4",
  authDomain: "gen-lang-client-0570339332.firebaseapp.com",
  projectId: "gen-lang-client-0570339332",
  storageBucket: "gen-lang-client-0570339332.firebasestorage.app",
  messagingSenderId: "287134574302",
  appId: "1:287134574302:web:c47b18fa31bbc39b7d844f"
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
export const db = firebaseAppletConfig.firestoreDatabaseId && firebaseAppletConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseAppletConfig.firestoreDatabaseId)
  : getFirestore(app);

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
  setDoc,
  updateDoc,
  collection,
  onSnapshot
};
