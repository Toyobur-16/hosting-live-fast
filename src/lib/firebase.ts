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
  apiKey: firebaseAppletConfig.apiKey || "",
  authDomain: firebaseAppletConfig.authDomain || "",
  projectId: firebaseAppletConfig.projectId || "",
  storageBucket: firebaseAppletConfig.storageBucket || "",
  messagingSenderId: firebaseAppletConfig.messagingSenderId || "",
  appId: firebaseAppletConfig.appId || "",
  measurementId: firebaseAppletConfig.measurementId || ""
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
