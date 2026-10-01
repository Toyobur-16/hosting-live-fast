import React, { useState, useEffect } from 'react';
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
  Gift,
  ArrowLeft
} from 'lucide-react';
import { AuthUser } from '../types';
import { auth, fallbackAuth, googleProvider, signInWithPopup, firebaseAppletConfig } from '../lib/firebase';

export type AuthMode = 'login' | 'register' | 'reset';

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
  const [mode, setMode] = useState<AuthMode>(initialMode === 'reset' ? 'reset' : (initialMode || 'login'));
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

  const GOOGLE_CLIENT_ID =
    firebaseAppletConfig.oAuthClientId ||
    '287134574302-snpck3opkt3v6nknlfsep61ev99q4rtn.apps.googleusercontent.com';

  const resetAllState = (targetMode: AuthMode) => {
    setMode(targetMode);
    setName('');
    setEmail(initialEmail || '');
    setPassword('');
    setConfirmPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError(null);
    setSuccessMessage(null);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode === 'reset' ? 'reset' : (initialMode || 'login'));
      setEmail(initialEmail || '');
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, initialEmail, initialMode]);

  if (!isOpen) return null;

  // Handle Login & Registration Submit
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
        setError(lang === 'bn' ? 'আপনার নাম লিখুন' : 'Please enter your name');
        return;
      }
      if (password.length < 6) {
        setError(lang === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' : 'Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setError(lang === 'bn' ? 'পাসওয়ার্ড দুটি মিলছে না! একই পাসওয়ার্ড দিন।' : 'Passwords do not match!');
        return;
      }
    }

    if (mode === 'login' && !password) {
      setError(lang === 'bn' ? 'পাসওয়ার্ড লিখুন' : 'Please enter your password');
      return;
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
              ? '✅ এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট তৈরি করা আছে! নিচে আপনার পাসওয়ার্ড দিয়ে সরাসরি লগইন করুন।'
              : '✅ This email is already registered! Please sign in below with your password.'
          );
          setLoading(false);
          return;
        }
        if (!res.ok || (data && !data.success)) {
          throw new Error(data?.error || (lang === 'bn' ? 'রেজিস্ট্রেশন ব্যর্থ হয়েছে' : 'Registration failed'));
        }

        if (data?.token && data?.user) {
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

        if (data?.token && data?.user) {
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

  // Handle Direct Password Reset Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError(lang === 'bn' ? 'সঠিক ইমেইল এড্রেস লিখুন' : 'Please enter a valid email address');
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
        body: JSON.stringify({ email: cleanEmail, newPassword })
      });
      const data = await safeJsonParse(res);
      if (!res.ok || (data && !data.success)) {
        throw new Error(data?.error || (lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে' : 'Failed to reset password'));
      }

      if (data?.token && data?.user) {
        localStorage.setItem('bot_auth_token', data.token);
        localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
        onSuccess(data.user, data.token);
        if (onClose) onClose();
      } else {
        setMode('login');
        setPassword('');
        setSuccessMessage(lang === 'bn' ? '🎉 পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে! এখন লগইন করুন।' : 'Password changed! Please log in.');
      }
    } catch (err: any) {
      setError(err?.message || (lang === 'bn' ? 'পাসওয়ার্ড সংরক্ষণে ত্রুটি হয়েছে' : 'Failed to reset password'));
    } finally {
      setLoading(false);
    }
  };

  // Google Identity Services (GSI) One-Tap / Credential listener
  useEffect(() => {
    if (!isOpen) return;
    try {
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response: any) => {
            if (response && response.credential) {
              setGoogleLoading(true);
              setError(null);
              try {
                const res = await fetch('/api/auth/google', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ credential: response.credential })
                });
                const data = await safeJsonParse(res);
                if (res.ok && data?.success && data?.token && data?.user) {
                  localStorage.setItem('bot_auth_token', data.token);
                  localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
                  onSuccess(data.user, data.token);
                  if (onClose) onClose();
                } else {
                  throw new Error(data?.error || 'Google authentication failed');
                }
              } catch (err: any) {
                setError(err?.message || 'Google authentication failed');
              } finally {
                setGoogleLoading(false);
              }
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true
        });
      }
    } catch {}
  }, [isOpen, GOOGLE_CLIENT_ID]);

  // Google Direct Auth
  const handleAuthenticateWithGoogleEmail = async (targetEmail: string) => {
    const clean = targetEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setError(lang === 'bn' ? 'সঠিক গুগল ইমেইল দিন' : 'Please enter a valid Google email');
      return;
    }
    setGoogleLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: clean,
          name: clean.split('@')[0],
          picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${clean}`,
          credential: `direct_google_${Date.now()}`,
          userInfo: {
            email: clean,
            name: clean.split('@')[0],
            picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${clean}`
          }
        })
      });
      const data = await safeJsonParse(res);
      if (res.ok && data?.success && data?.token && data?.user) {
        localStorage.setItem('bot_auth_token', data.token);
        localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
        onSuccess(data.user, data.token);
        if (onClose) onClose();
      } else {
        throw new Error(data?.error || (lang === 'bn' ? 'গুগল সাইন-ইন ব্যর্থ হয়েছে' : 'Google authentication failed'));
      }
    } catch (err: any) {
      setError(err?.message || (lang === 'bn' ? 'গুগল সাইন-ইন করতে সমস্যা হয়েছে' : 'Google authentication error'));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    const prefilledEmail = (email || '').trim().toLowerCase();

    try {
      const activeAuth = auth || fallbackAuth;
      if (!activeAuth) {
        if (prefilledEmail && prefilledEmail.includes('@')) {
          await handleAuthenticateWithGoogleEmail(prefilledEmail);
          return;
        }
        setShowGoogleInput(true);
        setGoogleLoading(false);
        return;
      }
      const result = await signInWithPopup(activeAuth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: idToken,
          email: user.email,
          name: user.displayName || user.email?.split('@')[0],
          picture: user.photoURL,
          googleId: user.uid,
          userInfo: {
            email: user.email,
            name: user.displayName || user.email?.split('@')[0],
            picture: user.photoURL
          }
        })
      });
      const data = await safeJsonParse(res);
      if (res.ok && data?.success && data?.token && data?.user) {
        localStorage.setItem('bot_auth_token', data.token);
        localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
        onSuccess(data.user, data.token);
        if (onClose) onClose();
        return;
      } else {
        throw new Error(data?.error || 'Server rejected Google token');
      }
    } catch (err: any) {
      // If popup is blocked or domain is unauthorized in Firebase console, allow entering Google email
      if (prefilledEmail && prefilledEmail.includes('@')) {
        await handleAuthenticateWithGoogleEmail(prefilledEmail);
        return;
      }
      setShowGoogleInput(true);
      setError(
        lang === 'bn'
          ? 'ব্রাউজার বা ডোমেইনে পপআপ সীমাবদ্ধতা থাকলে নিচে আপনার গুগল ইমেইল দিয়ে সহজে প্রবেশ করুন।'
          : 'Popup restricted on this domain. Enter your Google email below to sign in.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#070b14] border border-[#1e293b] rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 overflow-hidden">


        {canDismiss && onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors z-10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {mode === 'reset' ? (
          /* DIRECT PASSWORD RESET FORM (NO VERIFICATION CODE NEEDED) */
          <div>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-pink-500/10 text-pink-400">
                <KeyRound className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {lang === 'bn' ? 'পাসওয়ার্ড রিসেট করুন' : 'Reset Password'}
              </h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                {lang === 'bn'
                  ? 'আপনার ইমেইল এবং নতুন পাসওয়ার্ড লিখে সরাসরি পরিবর্তন করুন।'
                  : 'Enter your email and new password to update immediately.'}
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

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={lang === 'bn' ? 'আপনার নিবন্ধিত ইমেইল এড্রেস' : 'Your Registered Email'}
                  className="w-full bg-[#0b1220] border border-[#1f2d48] focus:border-[#ec4899] rounded-xl text-white placeholder-slate-500 py-3 pl-10 pr-4 text-xs focus:outline-none transition-all"
                  autoComplete="email"
                />
              </div>

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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#d946ef] via-[#ec4899] to-[#f43f5e] hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-pink-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <span>{lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন ও লগইন করুন' : 'Update Password & Sign In'}</span>
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => resetAllState('login')}
              className="w-full mt-4 py-2 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'লগইনে ফিরে যান' : 'Back to Sign In'}</span>
            </button>
          </div>
        ) : (
          /* STANDARD LOGIN & REGISTRATION (INSTANT - NO VERIFICATION CODE) */
          <div>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#1e293b] border border-[#334155] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-pink-500/10 text-pink-400">
                <Bot className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {mode === 'login'
                  ? (lang === 'bn' ? 'লগইন করুন' : 'Sign In')
                  : (lang === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account')}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {mode === 'login'
                  ? (lang === 'bn' ? 'আপনার অ্যাকাউন্ট, বট ও ওয়েবসাইট পরিচালনা করতে লগইন করুন' : 'Manage your bots and websites')
                  : (lang === 'bn' ? 'নতুন অ্যাকাউন্ট খুলে ফ্রি বট ও ওয়েবসাইট হোস্ট করুন' : 'Join to host free bots & websites')}
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

            <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-cyan-500/15 border border-emerald-500/30 flex items-center gap-2.5 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Gift className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-300">
                  {lang === 'bn' ? '🎉 ফ্রি টেলিগ্রাম বট ও ওয়েবসাইট হোস্টিং!' : '🎉 Free Bot & Website Hosting!'}
                </p>
                <p className="text-[11px] text-slate-300 leading-tight mt-0.5">
                  {lang === 'bn' ? 'কোনো ওটিপি ছাড়াই সরাসরি অ্যাকাউন্ট তৈরি ও ইনস্ট্যান্ট লগইন।' : 'Instant registration and sign in without any OTP.'}
                </p>
              </div>
            </div>

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
                ) : (
                  <span>{lang === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account'}</span>
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
              ) : (
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
              )}
            </div>

            {/* Google Sign-In */}
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
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-slate-200 text-xs font-semibold flex items-center justify-center gap-2.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {googleLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>{lang === 'bn' ? 'Google দিয়ে সাইন-ইন করুন' : 'Sign in with Google'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
