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

// Default config from user's Firebase project
export const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey || "AIzaSyA08M7c1iHvXhQHeUf8kXS5cUvtJ8s_kqY",
  authDomain: firebaseAppletConfig.authDomain || "hosting-live-fast-11b13.firebaseapp.com",
  projectId: firebaseAppletConfig.projectId || "hosting-live-fast-11b13",
  storageBucket: firebaseAppletConfig.storageBucket || "hosting-live-fast-11b13.firebasestorage.app",
  messagingSenderId: firebaseAppletConfig.messagingSenderId || "880032238370",
  appId: firebaseAppletConfig.appId || "1:880032238370:web:c0510582bebc2ce71c737b",
  measurementId: firebaseAppletConfig.measurementId || "G-K2NFZE486M"
};

// Initialize app single-instance
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore with specific database ID if configured
export const db = firebaseAppletConfig.firestoreDatabaseId && firebaseAppletConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseAppletConfig.firestoreDatabaseId)
  : getFirestore(app);

export {
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
