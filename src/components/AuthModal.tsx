import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  User,
  Lock,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  RefreshCw,
  KeyRound,
  Sparkles,
  Gift,
  ShieldCheck,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { AuthUser } from '../types';
import { auth, fallbackAuth, googleProvider, signInWithPopup, firebaseAppletConfig } from '../lib/firebase';

export type AuthMode = 'login' | 'register' | 'reset' | 'verify';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: (user: AuthUser, token: string) => void;
  canDismiss?: boolean;
  lang?: 'bn' | 'en';
  initialEmail?: string;
  initialMode?: AuthMode;
}

async function safeJsonParse(res: Response): Promise<any> {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const AuthModal = ({
  isOpen,
  onClose,
  onSuccess,
  canDismiss = false,
  lang = 'bn',
  initialEmail = '',
  initialMode = 'login'
}: AuthModalProps) => {
  const [mode, setMode] = useState<AuthMode>(initialMode || 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleInput, setShowGoogleInput] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');

  // 6-digit Email Verification States
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [expirySeconds, setExpirySeconds] = useState(600); // 10 minutes
  const [resendCooldown, setResendCooldown] = useState(60);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  // Password reset step: 'request' (enter email) or 'verify_and_set' (enter OTP code & new password)
  const [resetStep, setResetStep] = useState<'request' | 'verify_and_set'>('request');

  const GOOGLE_CLIENT_ID =
    firebaseAppletConfig.oAuthClientId ||
    '287134574302-snpck3opkt3v6nknlfsep61ev99q4rtn.apps.googleusercontent.com';

  // Reset all modal fields and states back to a clean initial state
  const resetAllState = (targetMode?: AuthMode) => {
    const nextMode: AuthMode = targetMode || (initialMode as AuthMode) || 'login';
    setMode(nextMode);
    setResetStep('request');
    setName('');
    setEmail(initialEmail || '');
    setPassword('');
    setConfirmPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setDigits(['', '', '', '', '', '']);
    setError(null);
    setSuccessMessage(null);
    setLoading(false);
    setGoogleLoading(false);
    setShowGoogleInput(false);
    try {
      const savedGoogle = localStorage.getItem('bot_last_google_email') || '';
      setGoogleEmail(savedGoogle);
    } catch {
      setGoogleEmail('');
    }
    setExpirySeconds(600);
    setResendCooldown(60);
    setVerifying(false);
    setResending(false);
    try {
      localStorage.removeItem('bot_registered_email');
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      resetAllState((initialMode as AuthMode) || 'login');
    }
  }, [isOpen, initialMode, initialEmail]);

  const isTimerActive = mode === 'verify' || (mode === 'reset' && resetStep === 'verify_and_set');

  // Expiry Countdown Timer for 6-digit Code (10 minutes)
  useEffect(() => {
    if (!isTimerActive || expirySeconds <= 0) return;
    const interval = setInterval(() => {
      setExpirySeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerActive, expirySeconds]);

  // Resend Cooldown Countdown (60 seconds)
  useEffect(() => {
    if (!isTimerActive || resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerActive, resendCooldown]);

  // Automatic Real-Time Polling for Unlimited Google Firebase Email Verification Link (every 3 seconds)
  useEffect(() => {
    if (!isOpen || mode !== 'verify' || !email.trim()) return;
    let cancelled = false;

    const pollStatus = async () => {
      try {
        const res = await fetch('/api/auth/check-verification-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase() })
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data && data.verified && data.token && data.user && !cancelled) {
          localStorage.setItem('bot_auth_token', data.token);
          localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
          setSuccessMessage(
            data.message ||
              (lang === 'bn'
                ? '🎉 আপনার ইমেইল সফলভাবে ভেরিফাই হয়েছে! অ্যাকাউন্ট সক্রিয় করা হয়েছে।'
                : 'Email verified successfully!')
          );
          onSuccess(data.user, data.token);
          setTimeout(() => {
            if (onClose) onClose();
          }, 600);
        }
      } catch {}
    };

    const interval = setInterval(pollStatus, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isOpen, mode, email, lang]);

  if (!isOpen) return null;

  const handleAuthenticateWithGoogleEmail = async (
    targetEmail: string,
    displayName?: string,
    picture?: string,
    googleId?: string,
    credential?: string
  ) => {
    const cleanMail = targetEmail.trim().toLowerCase();
    if (!cleanMail || !cleanMail.includes('@')) {
      setError(lang === 'bn' ? 'সঠিক গুগল ইমেইল এড্রেস লিখুন' : 'Please enter a valid Google email');
      setGoogleLoading(false);
      return;
    }

    setGoogleLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: credential || undefined,
          email: cleanMail,
          name: displayName || cleanMail.split('@')[0],
          picture: picture || '',
          googleId: googleId || `google_${Date.now()}`
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (lang === 'bn' ? 'গুগল লগইন সম্পন্ন করা সম্ভব হয়নি' : 'Google login failed'));
      }
      localStorage.setItem('bot_auth_token', data.token);
      localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
      try {
        localStorage.setItem('bot_last_google_email', cleanMail);
      } catch {}
      onSuccess(data.user, data.token);
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Google Sign-In error');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDirectGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);

    const emailToUse = (email.trim() || googleEmail.trim()).toLowerCase();

    // 1. Primary: Use user's Firebase project (hosting-live-fast-11b13) Google Auth Popup
    const preferFallback = sessionStorage.getItem('use_fallback_firebase_auth') === '1';
    const primaryAuthInstance = preferFallback ? fallbackAuth : auth;
    const secondaryAuthInstance = preferFallback ? auth : fallbackAuth;

    try {
      const result = await signInWithPopup(primaryAuthInstance, googleProvider);
      const fbUser = result.user;
      if (fbUser && fbUser.email) {
        let idToken: string | undefined;
        try {
          idToken = await fbUser.getIdToken();
        } catch {}
        await handleAuthenticateWithGoogleEmail(
          fbUser.email,
          fbUser.displayName || undefined,
          fbUser.photoURL || undefined,
          fbUser.uid,
          idToken
        );
        return;
      }
    } catch (fbErr: any) {
      const errCode = fbErr?.code || '';
      console.warn('Primary Firebase popup sign-in note:', errCode || fbErr?.message);
      if (errCode === 'auth/popup-closed-by-user' || errCode === 'auth/cancelled-popup-request') {
        setGoogleLoading(false);
        return;
      }
      if (errCode === 'auth/unauthorized-domain') {
        const currentHost = window.location.hostname;
        setError(
          lang === 'bn'
            ? `⚠️ আপনার ডোমেন (${currentHost}) Firebase Auth-এ অনুমোদিত নয়। নিচের বক্সে আপনার জিমেইল লিখে সরাসরি প্রবেশ করুন অথবা Firebase Console-এ ডোমেনটি যোগ করুন।`
            : `⚠️ Domain (${currentHost}) is not authorized in Firebase Auth. Enter your Google email below or add this domain in Firebase Console.`
        );
        setShowGoogleInput(true);
        setGoogleLoading(false);
        return;
      }
    }

    // 2. Fallback: Direct Google Sign-In using entered email or quick Google account input
    if (emailToUse && emailToUse.includes('@')) {
      await handleAuthenticateWithGoogleEmail(emailToUse, name.trim() || undefined);
    } else {
      setShowGoogleInput(true);
      setGoogleLoading(false);
    }
  };

  // 6-digit Code Input Handlers
  const submitSixDigitCode = async (codeToVerify: string) => {
    if (verifying || codeToVerify.length !== 6) return;
    setVerifying(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: codeToVerify
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Verification failed');
      }

      localStorage.setItem('bot_auth_token', data.token);
      localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
      setSuccessMessage(data.message || 'Email verified successfully!');
      onSuccess(data.user, data.token);
      setTimeout(() => {
        if (onClose) onClose();
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    setError(null);
    const cleanVal = value.replace(/[^0-9]/g, '');

    // Handle full paste
    if (cleanVal.length > 1) {
      const pasted = cleanVal.slice(0, 6).split('');
      const newDigits = [...digits];
      pasted.forEach((d, i) => {
        newDigits[i] = d;
      });
      setDigits(newDigits);
      const nextIdx = Math.min(5, pasted.length);
      digitInputRefs.current[nextIdx]?.focus();
      const joined = newDigits.join('');
      if (joined.length === 6 && mode === 'verify') {
        submitSixDigitCode(joined);
      }
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleanVal;
    setDigits(newDigits);

    // Auto-advance to next box
    if (cleanVal && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }

    const joined = newDigits.join('');
    if (joined.length === 6 && mode === 'verify') {
      submitSixDigitCode(joined);
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    }
  };

  const handleCheckFirebaseVerificationNow = async () => {
    if (!email.trim() || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/check-verification-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const data = await res.json();
      if (data && data.verified && data.token && data.user) {
        localStorage.setItem('bot_auth_token', data.token);
        localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
        setSuccessMessage(
          data.message ||
            (lang === 'bn'
              ? '🎉 আপনার ইমেইল সফলভাবে ভেরিফাই হয়েছে! অ্যাকাউন্ট সক্রিয় করা হয়েছে।'
              : 'Email verified successfully!')
        );
        onSuccess(data.user, data.token);
        setTimeout(() => {
          if (onClose) onClose();
        }, 600);
      } else {
        setSuccessMessage(
          lang === 'bn'
            ? 'আপনার জিমেইল ইনবক্স বা Spam ফোল্ডারে পাঠানো ৬ সংখ্যার কোডটি উপরের ঘরে বসান অথবা ইমেইলের ভেরিফাই লিংকে ক্লিক করুন।'
            : 'Please enter the 6-digit code sent to your email inbox/spam folder above, or click the verification link in your email.'
        );
        digitInputRefs.current[0]?.focus();
      }
    } catch {
      digitInputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyEmail = async () => {
    const fullCode = digits.join('');
    if (fullCode.length !== 6) {
      return handleCheckFirebaseVerificationNow();
    }
    return submitSixDigitCode(fullCode);
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    setSuccessMessage(null);

    const isReset = mode === 'reset' && resetStep === 'verify_and_set';
    const endpoint = isReset ? '/api/auth/resend-reset-code' : '/api/auth/resend-verification-code';
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
      const data = await safeJsonParse(res);
      if (!res.ok || (data && !data.success)) {
        throw new Error(data?.error || (lang === 'bn' ? 'কোড পুনরায় পাঠানো সম্ভব হয়নি' : 'Failed to resend code'));
      }

      setResendCooldown(25);
      setExpirySeconds(600);
      if (data?.code) {
        const codeDigits = String(data.code).split('').slice(0, 6);
        setDigits(codeDigits);
        setSuccessMessage(
          lang === 'bn'
            ? `✅ আপনার নতুন ৬ সংখ্যার কোড: ${data.code} (স্বয়ংক্রিয়ভাবে কোড বসানো হয়েছে)`
            : `✅ Your new 6-digit code: ${data.code} (Auto-filled below)`
        );
      } else {
        setDigits(['', '', '', '', '', '']);
        setSuccessMessage(
          lang === 'bn'
            ? (isReset
                ? `আপনার নিবন্ধিত ইমেইলে (${cleanEmail}) নতুন ৬ সংখ্যার পাসওয়ার্ড রিসেট কোড পাঠানো হয়েছে। ইনবক্স অথবা Spam চেক করুন।`
                : `আপনার ইমেইলে (${cleanEmail}) নতুন ৬ সংখ্যার ভেরিফিকেশন কোড পাঠানো হয়েছে। ইনবক্স অথবা Spam চেক করুন।`)
            : 'A new 6-digit code has been sent to your email.'
        );
        digitInputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Unexpected token') || msg.includes('<!DOCTYPE') || msg.includes('is not valid JSON')) {
        setError(lang === 'bn' ? 'সার্ভার সংযোগে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' : 'Network connection issue. Please try again.');
      } else {
        setError(msg || (lang === 'bn' ? 'কোড পুনরায় পাঠাতে ত্রুটি হয়েছে' : 'Error resending code'));
      }
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError(lang === 'bn' ? 'সঠিক ইমেইল এড্রেস লিখুন' : 'Please enter a valid email address');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setError(lang === 'bn' ? 'আপনার পুরো নাম লিখুন' : 'Please enter your full name');
        return;
      }
      if (password.length < 6) {
        setError(lang === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' : 'Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setError(lang === 'bn' ? 'দুইটি পাসওয়ার্ড মিলছে না! একই পাসওয়ার্ড দিন।' : 'Passwords do not match! Please enter identical passwords.');
        return;
      }
    }

    if (mode === 'login') {
      if (!password) {
        setError(lang === 'bn' ? 'পাসওয়ার্ড প্রদান করুন' : 'Please enter your password');
        return;
      }
    }

    if (mode === 'reset') {
      if (resetStep === 'request') {
        return handleSendResetCode(e);
      } else {
        return handleResetPasswordSubmit(e);
      }
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), email: cleanEmail, password })
        });
        const data = await safeJsonParse(res);
        if (data?.alreadyRegistered) {
          setMode('login');
          setError(null);
          setSuccessMessage(
            lang === 'bn'
              ? '✅ এই জিমেইল দিয়ে ইতিমধ্যে রেজিস্ট্রেশন করা আছে! নিচে আপনার পাসওয়ার্ড দিয়ে সরাসরি লগইন করুন।'
              : '✅ This email is already registered! Please sign in below with your password.'
          );
          setLoading(false);
          return;
        }
        if (!res.ok || (data && !data.success)) {
          throw new Error(data?.error || (lang === 'bn' ? 'রেজিস্ট্রেশন ব্যর্থ হয়েছে' : 'Registration failed'));
        }

        if (data?.requiresVerification || !data?.token || !data?.user) {
          // Strictly do NOT store any auth token or user session until 6-digit OTP code is verified!
          localStorage.removeItem('bot_auth_token');
          localStorage.removeItem('bot_auth_user');
          setMode('verify');
          setExpirySeconds(600);
          setResendCooldown(25);
          if (data?.code) {
            const codeDigits = String(data.code).split('').slice(0, 6);
            setDigits(codeDigits);
            setSuccessMessage(
              lang === 'bn'
                ? `🎉 আপনার ৬ সংখ্যার ভেরিফিকেশন কোড: ${data.code} (স্বয়ংক্রিয়ভাবে কোড বসানো হয়েছে, নিচে ভেরিফাই বাটনে ক্লিক করুন)`
                : `🎉 Your verification code: ${data.code} (Auto-filled below, click verify)`
            );
          } else {
            setDigits(['', '', '', '', '', '']);
            setSuccessMessage(
              lang === 'bn'
                ? `আপনার ইমেইলে (${cleanEmail}) ৬ সংখ্যার ভেরিফিকেশন কোড পাঠানো হয়েছে! অনুগ্রহ করে আপনার জিমেইল ইনবক্স অথবা Spam ফোল্ডার চেক করে ৬ সংখ্যার কোডটি দিন।`
                : `A 6-digit verification code has been sent to ${cleanEmail}. Check your inbox or spam folder and enter the code below.`
            );
            setTimeout(() => digitInputRefs.current[0]?.focus(), 100);
          }
        } else {
          localStorage.setItem('bot_auth_token', data.token);
          localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
          onSuccess(data.user, data.token);
          if (onClose) onClose();
        }
      } else if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password })
        });
        const data = await safeJsonParse(res);
        if (!res.ok || (data && !data.success)) {
          throw new Error(data?.error || (lang === 'bn' ? 'লগইন ব্যর্থ হয়েছে' : 'Login failed'));
        }

        if (data?.requiresVerification || !data?.token || !data?.user) {
          // Do NOT store auth token or user session until 6-digit OTP code is verified!
          localStorage.removeItem('bot_auth_token');
          localStorage.removeItem('bot_auth_user');
          setMode('verify');
          setExpirySeconds(600);
          setResendCooldown(25);
          if (data?.code) {
            const codeDigits = String(data.code).split('').slice(0, 6);
            setDigits(codeDigits);
            setSuccessMessage(
              lang === 'bn'
                ? `🎉 আপনার ৬ সংখ্যার ভেরিফিকেশন কোড: ${data.code} (স্বয়ংক্রিয়ভাবে কোড বসানো হয়েছে, নিচে ভেরিফাই বাটনে ক্লিক করুন)`
                : `🎉 Your verification code: ${data.code} (Auto-filled below, click verify)`
            );
          } else {
            setDigits(['', '', '', '', '', '']);
            setSuccessMessage(
              lang === 'bn'
                ? `আপনার ইমেইলে (${cleanEmail}) ৬ সংখ্যার ভেরিফিকেশন কোড পাঠানো হয়েছে। জিমেইল চেক করে কোডটি দিন।`
                : `A 6-digit verification code has been sent to ${cleanEmail}.`
            );
            setTimeout(() => digitInputRefs.current[0]?.focus(), 100);
          }
        } else {
          localStorage.setItem('bot_auth_token', data.token);
          localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
          onSuccess(data.user, data.token);
          if (onClose) onClose();
        }
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Unexpected token') || msg.includes('<!DOCTYPE') || msg.includes('is not valid JSON')) {
        setError(lang === 'bn' ? 'সার্ভার সংযোগে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' : 'Network connection issue. Please try again.');
      } else {
        setError(msg || (lang === 'bn' ? 'ত্রুটি ঘটেছে' : 'An error occurred'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError(lang === 'bn' ? 'সঠিক ইমেইল এড্রেস লিখুন' : 'Please enter a valid email address');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
      const data = await safeJsonParse(res);
      if (!res.ok || (data && !data.success)) {
        throw new Error(data?.error || (lang === 'bn' ? 'রিসেট কোড পাঠানো সম্ভব হয়নি। অনুগ্রহ করে সঠিক নিবন্ধিত ইমেইল দিন।' : 'Failed to send reset code'));
      }

      setResetStep('verify_and_set');
      setExpirySeconds(600);
      setResendCooldown(25);
      setNewPassword('');
      setConfirmNewPassword('');
      if (data?.code) {
        const codeDigits = String(data.code).split('').slice(0, 6);
        setDigits(codeDigits);
        setSuccessMessage(
          lang === 'bn'
            ? `✅ আপনার ৬ সংখ্যার রিসেট কোড: ${data.code} (স্বয়ংক্রিয়ভাবে বসানো হয়েছে! নিচে নতুন পাসওয়ার্ড দিন)`
            : `✅ Your reset code: ${data.code} (Auto-filled! Please enter your new password below)`
        );
      } else {
        setDigits(['', '', '', '', '', '']);
        setSuccessMessage(
          lang === 'bn'
            ? `আপনার নিবন্ধিত ইমেইলে (${cleanEmail}) ৬ সংখ্যার পাসওয়ার্ড রিসেট কোড পাঠানো হয়েছে! জিমেইল ইনবক্স বা Spam চেক করে কোডটি বসিয়ে নতুন পাসওয়ার্ড দিন।`
            : `A 6-digit password reset code has been sent to ${cleanEmail}. Enter the code and your new password below.`
        );
        setTimeout(() => {
          digitInputRefs.current[0]?.focus();
        }, 150);
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Unexpected token') || msg.includes('<!DOCTYPE') || msg.includes('is not valid JSON')) {
        setError(lang === 'bn' ? 'সার্ভার সংযোগে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' : 'Network connection issue. Please try again.');
      } else {
        setError(msg || (lang === 'bn' ? 'রিসেট কোড পাঠাতে ত্রুটি হয়েছে' : 'Error sending reset code'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const code = digits.join('').trim();
    if (code.length !== 6) {
      setError(lang === 'bn' ? 'ইমেইলে পাঠানো ৬ সংখ্যার কোড সম্পূর্ণ লিখুন' : 'Please enter the 6-digit reset code');
      return;
    }
    if (newPassword.length < 6) {
      setError(lang === 'bn' ? 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' : 'New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError(lang === 'bn' ? 'নতুন পাসওয়ার্ড দুটি মিলছে না! একই পাসওয়ার্ড দিন।' : 'New passwords do not match!');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code, newPassword })
      });
      const data = await safeJsonParse(res);
      if (!res.ok || (data && !data.success)) {
        throw new Error(data?.error || (lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে' : 'Password reset failed'));
      }

      localStorage.setItem('bot_auth_token', data.token);
      localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
      setSuccessMessage(data.message || (lang === 'bn' ? '🎉 পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে!' : 'Password reset successfully!'));
      onSuccess(data.user, data.token);
      setTimeout(() => {
        if (onClose) onClose();
      }, 1000);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Unexpected token') || msg.includes('<!DOCTYPE') || msg.includes('is not valid JSON')) {
        setError(lang === 'bn' ? 'সার্ভার সংযোগে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' : 'Network connection issue. Please try again.');
      } else {
        setError(msg || (lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে' : 'Password reset error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const minutesRemaining = Math.floor(expirySeconds / 60);
  const secondsRemaining = expirySeconds % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050811]/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#111927] border border-[#1f2c42] shadow-2xl rounded-3xl max-w-[420px] w-full p-7 text-white relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-60 h-24 bg-gradient-to-b from-cyan-500/15 via-emerald-500/10 to-transparent blur-2xl pointer-events-none" />

        {canDismiss && onClose && (
          <button
            onClick={() => {
              resetAllState('login');
              onClose();
            }}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors z-10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* 6-DIGIT EMAIL VERIFICATION MODE */}
        {mode === 'verify' ? (
          <div>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/10 text-cyan-400">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {lang === 'bn' ? 'ইমেইল ভেরিফিকেশন' : 'Verify Your Email'}
              </h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                {lang === 'bn'
                  ? 'আপনার জিমেইল ইনবক্স অথবা Spam ফোল্ডার চেক করুন। সেখানে পাঠানো ৬ সংখ্যার সিকিউর কোডটি নিচের ঘরে বসিয়ে অ্যাকাউন্ট সক্রিয় করুন।'
                  : 'Check your email inbox or spam folder. Enter the 6-digit verification code below to activate your account.'}
              </p>

              {/* Target Email Box */}
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-300">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate max-w-[200px]">{email}</span>
                <button
                  type="button"
                  onClick={() => resetAllState('register')}
                  className="text-[10px] text-pink-400 hover:underline cursor-pointer ml-1"
                >
                  {lang === 'bn' ? 'পরিবর্তন' : 'Change'}
                </button>
              </div>
            </div>

            {successMessage && (
              <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* 6 Individual Digit Inputs */}
            <div className="grid grid-cols-6 gap-1.5 sm:gap-2 mb-5 w-full">
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    digitInputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                  className="w-full h-12 sm:h-14 max-w-[48px] mx-auto rounded-xl sm:rounded-2xl bg-[#0b1220] border-2 border-slate-700 focus:border-cyan-400 text-cyan-300 text-xl sm:text-2xl font-bold font-mono text-center focus:outline-none transition-all shadow-inner"
                />
              ))}
            </div>

            {/* Expiration Timer Indicator */}
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3 px-1">
              <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {lang === 'bn' ? 'মেয়াদ বাকি:' : 'Code expires in:'}{' '}
                  {minutesRemaining}:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
                </span>
              </div>

              <button
                type="button"
                disabled={resendCooldown > 0 || resending}
                onClick={handleResendCode}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                {resending
                  ? (lang === 'bn' ? 'পাঠানো হচ্ছে...' : 'Sending...')
                  : resendCooldown > 0
                  ? `${lang === 'bn' ? 'পুনরায় পাঠান' : 'Resend Code'} (${resendCooldown}s)`
                  : (lang === 'bn' ? 'পুনরায় কোড পাঠান' : 'Resend Code')}
              </button>
            </div>

            <div className="mb-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300/90 text-xs flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{lang === 'bn' ? 'ইমেইল না পেলে আপনার জিমেইল অ্যাপের Spam (স্প্যাম) ফোল্ডার চেক করুন।' : 'If not in Inbox, please check your Spam / Junk folder.'}</span>
            </div>

            {/* Verify Button */}
            <button
              type="button"
              disabled={verifying || digits.join('').length !== 6}
              onClick={handleVerifyEmail}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-400 hover:opacity-95 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mb-3"
            >
              {verifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>{lang === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Verifying...'}</span>
                </>
              ) : (
                <span>{lang === 'bn' ? 'কোড ভেরিফাই ও অ্যাকাউন্ট সক্রিয় করুন' : 'Verify Code & Activate Account'}</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => resetAllState('login')}
              className="w-full py-2 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'লগইনে ফিরে যান' : 'Back to Sign In'}</span>
            </button>
          </div>
        ) : mode === 'reset' && resetStep === 'verify_and_set' ? (
          /* PASSWORD RESET: VERIFY OTP CODE & SET NEW PASSWORD */
          <div>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-pink-500/10 text-pink-400">
                <KeyRound className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {lang === 'bn' ? 'নতুন পাসওয়ার্ড সেট করুন' : 'Set New Password'}
              </h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                {lang === 'bn'
                  ? 'আপনার জিমেইল ইনবক্স বা Spam ফোল্ডার চেক করুন। সেখানে পাঠানো ৬ সংখ্যার কোড এবং নতুন পাসওয়ার্ড দিয়ে লগইন করুন।'
                  : 'Check your email inbox or spam folder. Enter the 6-digit code and your new password to sign in.'}
              </p>

              {/* Target Email Box */}
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-pink-300">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate max-w-[200px]">{email}</span>
                <button
                  type="button"
                  onClick={() => {
                    setResetStep('request');
                    setDigits(['', '', '', '', '', '']);
                    setNewPassword('');
                    setConfirmNewPassword('');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[10px] text-pink-400 hover:underline cursor-pointer ml-1"
                >
                  {lang === 'bn' ? 'পরিবর্তন' : 'Change'}
                </button>
              </div>
            </div>

            {successMessage && (
              <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
              {/* 6 Individual Digit Inputs */}
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1.5 text-center">
                  {lang === 'bn' ? '৬ সংখ্যার রিসেট কোড' : '6-Digit Reset Code'}
                </label>
                <div className="grid grid-cols-6 gap-1.5 sm:gap-2 mb-2 w-full">
                  {digits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        digitInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                      className="w-full h-12 sm:h-14 max-w-[48px] mx-auto rounded-xl sm:rounded-2xl bg-[#0b1220] border-2 border-slate-700 focus:border-pink-500 text-pink-300 text-xl sm:text-2xl font-bold font-mono text-center focus:outline-none transition-all shadow-inner"
                    />
                  ))}
                </div>
              </div>

              {/* Expiration Timer Indicator */}
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2 px-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'bn' ? 'মেয়াদ বাকি:' : 'Code expires in:'}{' '}
                    {minutesRemaining}:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || resending}
                  onClick={handleResendCode}
                  className="text-xs font-semibold text-pink-400 hover:text-pink-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  {resending
                    ? (lang === 'bn' ? 'পাঠানো হচ্ছে...' : 'Sending...')
                    : resendCooldown > 0
                    ? `${lang === 'bn' ? 'পুনরায় পাঠান' : 'Resend Code'} (${resendCooldown}s)`
                    : (lang === 'bn' ? 'পুনরায় কোড পাঠান' : 'Resend Code')}
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300/90 text-xs flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{lang === 'bn' ? 'কোড না পেলে আপনার জিমেইল অ্যাপের Spam (স্প্যাম) ফোল্ডার চেক করুন।' : 'If code is not in Inbox, check your Spam / Junk folder.'}</span>
              </div>

              {/* New Password input */}
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={lang === 'bn' ? 'নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)' : 'New Password (min 6 chars)'}
                  className="w-full bg-[#0b1220] border border-[#1f2d48] focus:border-[#ec4899] rounded-xl text-white placeholder-slate-500 py-3 pl-10 pr-10 text-xs focus:outline-none transition-all"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Confirm New Password input */}
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder={lang === 'bn' ? 'নতুন পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm New Password'}
                  className="w-full bg-[#0b1220] border border-[#1f2d48] focus:border-[#ec4899] rounded-xl text-white placeholder-slate-500 py-3 pl-10 pr-10 text-xs focus:outline-none transition-all"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || digits.join('').length !== 6 || newPassword.length < 6}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#d946ef] via-[#ec4899] to-[#f43f5e] hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-pink-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>{lang === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Verifying...'}</span>
                  </>
                ) : (
                  <span>{lang === 'bn' ? 'পাসওয়ার্ড নিশ্চিত ও লগইন করুন' : 'Confirm Password & Sign In'}</span>
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => resetAllState('login')}
              className="w-full mt-3 py-2 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'লগইনে ফিরে যান' : 'Back to Sign In'}</span>
            </button>
          </div>
        ) : (
          /* STANDARD LOGIN / REGISTER / RESET (STEP 1) MODE */
          <div>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#1e293b] border border-[#334155] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-pink-500/10 text-pink-400">
                {mode === 'reset' ? <KeyRound className="w-7 h-7" /> : <Bot className="w-7 h-7" />}
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {mode === 'login'
                  ? (lang === 'bn' ? 'লগইন করুন' : 'Sign In')
                  : mode === 'register'
                  ? (lang === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account')
                  : (lang === 'bn' ? 'পাসওয়ার্ড রিসেট' : 'Forgot Password')}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {mode === 'login'
                  ? (lang === 'bn' ? 'আপনার অ্যাকাউন্ট, বট ও ওয়েবসাইট পরিচালনা করতে লগইন করুন' : 'Manage your bots and websites')
                  : mode === 'register'
                  ? (lang === 'bn' ? 'নতুন অ্যাকাউন্ট খুলে ফ্রি বট ও ওয়েবসাইট হোস্ট করুন' : 'Join to host free bots & websites')
                  : (lang === 'bn' ? 'আপনার অ্যাকাউন্টের নিবন্ধিত ইমেইল লিখুন। আমরা ৬ সংখ্যার কোড পাঠাব।' : 'Enter your registered email to receive a 6-digit reset code.')}
              </p>
            </div>

            {successMessage && (
              <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* 1 Free Bot & Website Banner for new users */}
            {mode !== 'reset' && (
              <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-cyan-500/15 border border-emerald-500/30 flex items-center gap-2.5 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Gift className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-300">
                    {lang === 'bn' ? '🎉 ফ্রি টেলিগ্রাম বট ও ওয়েবসাইট ক্লাউড হোস্টিং!' : '🎉 Free Bot & Website Cloud Hosting!'}
                  </p>
                  <p className="text-[11px] text-slate-300 leading-tight mt-0.5">
                    {lang === 'bn' ? 'রেজিস্ট্রেশন করলেই পাচ্ছেন ফ্রি বট হোস্টিং এবং কাস্টম সাবডোমেন।' : 'Instant activation with free bot and website subdomains.'}
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5" autoComplete="off">
              {mode === 'register' && (
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={lang === 'bn' ? 'আপনার নাম' : 'Full Name'}
                    className="w-full bg-[#0b1220] border border-[#1f2d48] focus:border-[#ec4899] rounded-xl text-white placeholder-slate-500 py-3 pl-10 pr-4 text-xs focus:outline-none transition-all"
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={lang === 'bn' ? 'ইমেইল এড্রেস' : 'Email Address'}
                  className="w-full bg-[#0b1220] border border-[#1f2d48] focus:border-[#ec4899] rounded-xl text-white placeholder-slate-500 py-3 pl-10 pr-4 text-xs focus:outline-none transition-all"
                  autoComplete="off"
                />
              </div>

              {mode !== 'reset' && (
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={lang === 'bn' ? 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)' : 'Password (min 6 characters)'}
                    className="w-full bg-[#0b1220] border border-[#1f2d48] focus:border-[#ec4899] rounded-xl text-white placeholder-slate-500 py-3 pl-10 pr-10 text-xs focus:outline-none transition-all"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {mode === 'login' && (
                <div className="flex justify-end mt-1">
                  <button
                    type="button"
                    onClick={() => resetAllState('reset')}
                    className="text-[11px] text-pink-400 hover:text-pink-300 transition-colors cursor-pointer"
                  >
                    {lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot Password?'}
                  </button>
                </div>
              )}

              {mode === 'register' && (
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={lang === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'}
                    className="w-full bg-[#0b1220] border border-[#1f2d48] focus:border-[#ec4899] rounded-xl text-white placeholder-slate-500 py-3 pl-10 pr-10 text-xs focus:outline-none transition-all"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#d946ef] via-[#ec4899] to-[#f43f5e] hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-pink-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : mode === 'login' ? (
                  <span>{lang === 'bn' ? 'লগইন করুন' : 'Sign In'}</span>
                ) : mode === 'register' ? (
                  <span>{lang === 'bn' ? 'রেজিস্ট্রেশন ও ভেরিফিকেশন' : 'Register & Verify'}</span>
                ) : (
                  <span>{lang === 'bn' ? 'রিসেট কোড পাঠান' : 'Send Reset Code'}</span>
                )}
              </button>
            </form>

            <div className="text-center mt-5">
              {mode === 'login' ? (
                <p className="text-xs text-slate-400">
                  {lang === 'bn' ? 'কোনো অ্যাকাউন্ট নেই?' : "Don't have an account?"}{' '}
                  <button
                    type="button"
                    onClick={() => resetAllState('register')}
                    className="text-pink-400 hover:text-pink-300 font-semibold hover:underline cursor-pointer ml-1"
                  >
                    {lang === 'bn' ? 'নতুন অ্যাকাউন্ট খুলুন' : 'Create Account Here'}
                  </button>
                </p>
              ) : mode === 'register' ? (
                <p className="text-xs text-slate-400">
                  {lang === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট আছে?' : 'Already have an account?'}{' '}
                  <button
                    type="button"
                    onClick={() => resetAllState('login')}
                    className="text-pink-400 hover:text-pink-300 font-semibold hover:underline cursor-pointer ml-1"
                  >
                    {lang === 'bn' ? 'লগইন করুন' : 'Sign In Here'}
                  </button>
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  <button
                    type="button"
                    onClick={() => resetAllState('login')}
                    className="text-pink-400 hover:text-pink-300 font-semibold hover:underline cursor-pointer"
                  >
                    {lang === 'bn' ? 'লগইনে ফিরে যান' : 'Back to Sign In'}
                  </button>
                </p>
              )}
            </div>

            {/* Official Google Sign-In */}
            {mode !== 'reset' && (
              <div className="mt-5 pt-4 border-t border-[#1f2d48] space-y-3">
                <div className="relative flex py-0.5 items-center">
                  <div className="flex-grow border-t border-[#1f2d48]"></div>
                  <span className="flex-shrink mx-3 text-[11px] text-slate-400 font-medium">
                    {lang === 'bn' ? 'অথবা গুগল দিয়ে লগইন / সাইন-আপ করুন' : 'or continue with Google'}
                  </span>
                  <div className="flex-grow border-t border-[#1f2d48]"></div>
                </div>

                {showGoogleInput ? (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-b from-blue-950/40 to-slate-900 border border-blue-500/40 space-y-2.5 shadow-lg animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>{lang === 'bn' ? 'গুগল অ্যাকাউন্ট ইমেইল লিখুন' : 'Enter your Google Email'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowGoogleInput(false)}
                        className="text-[10px] text-slate-400 hover:text-white cursor-pointer px-1.5 py-0.5 rounded hover:bg-slate-800"
                      >
                        {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                      </button>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAuthenticateWithGoogleEmail(googleEmail || email);
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="email"
                        value={googleEmail || email}
                        onChange={(e) => setGoogleEmail(e.target.value)}
                        placeholder="user@gmail.com"
                        className="flex-1 bg-[#0b1220] border border-blue-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 font-medium"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={googleLoading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                      >
                        {googleLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>{lang === 'bn' ? 'প্রবেশ করুন' : 'Sign In'}</span>}
                      </button>
                    </form>
                    <div className="pt-1 text-[11px] text-slate-400 flex items-center justify-between gap-1">
                      <span>পপআপ চালু করতে:</span>
                      <a
                        href="https://console.firebase.google.com/project/hosting-live-fast-11b13/authentication/settings"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline font-medium"
                      >
                        Firebase Authorized Domains এ ডোমেন যোগ করুন ↗
                      </a>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    id="official-google-login-btn"
                    onClick={handleDirectGoogleLogin}
                    disabled={googleLoading}
                    className="w-full py-3 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-[#3c4043] font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 border border-[#dadce0] group hover:shadow-lg"
                  >
                    {googleLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-700" />
                    ) : (
                      <svg className="w-5 h-5 shrink-0 group-hover:scale-105 transition-transform" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    )}
                    <span className="text-[13px] font-medium text-slate-800">
                      {googleLoading
                        ? (lang === 'bn' ? 'গুগল দিয়ে লগইন হচ্ছে...' : 'Signing in with Google...')
                        : mode === 'register'
                        ? (lang === 'bn' ? 'Google দিয়ে একাউন্ট খুলুন' : 'Sign up with Google')
                        : (lang === 'bn' ? 'Google দিয়ে লগইন করুন' : 'Sign in with Google')}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
