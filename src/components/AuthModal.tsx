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
  RefreshCw,
  KeyRound,
  Gift,
  ArrowLeft,
  Sparkles,
  Send,
  ExternalLink
} from 'lucide-react';
import { AuthUser } from '../types';
import { auth, fallbackAuth, googleProvider, signInWithPopup, firebaseAppletConfig } from '../lib/firebase';

export type AuthMode = 'login' | 'register' | 'forgot' | 'reset' | 'activation_pending';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: (user: AuthUser, token: string) => void;
  canDismiss?: boolean;
  lang?: 'bn' | 'en';
  initialEmail?: string;
  initialMode?: AuthMode;
  resetToken?: string;
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
  initialMode = 'login',
  resetToken = ''
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
  const [resending, setResending] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleInput, setShowGoogleInput] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');

  const GOOGLE_CLIENT_ID =
    firebaseAppletConfig.oAuthClientId ||
    '287134574302-snpck3opkt3v6nknlfsep61ev99q4rtn.apps.googleusercontent.com';

  const resetAllState = (targetMode: AuthMode) => {
    setMode(targetMode);
    setError(null);
    setSuccessMessage(null);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode || 'login');
      if (initialEmail) setEmail(initialEmail);
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, initialEmail, initialMode]);

  // Polling for email activation status while in 'activation_pending' mode
  useEffect(() => {
    if (!isOpen || mode !== 'activation_pending' || !email) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/check-activation-status?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        if (res.ok) {
          const data = await safeJsonParse(res);
          if (data && data.active && data.token && data.user) {
            localStorage.setItem('bot_auth_token', data.token);
            localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
            onSuccess(data.user, data.token);
            if (onClose) onClose();
          }
        }
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, mode, email, onSuccess, onClose]);

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

    if (mode === 'login') {
      if (!password) {
        setError(lang === 'bn' ? 'পাসওয়ার্ড লিখুন' : 'Please enter your password');
        return;
      }

      setLoading(true);
      try {
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
      } catch (err: any) {
        const msg = err?.message || '';
        setError(msg || (lang === 'bn' ? 'লগইন ব্যর্থ হয়েছে' : 'Login failed'));
      } finally {
        setLoading(false);
      }
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

      setLoading(true);
      try {
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
          return;
        }
        if (!res.ok || (data && !data.success)) {
          throw new Error(data?.error || (lang === 'bn' ? 'রেজিস্ট্রেশন ব্যর্থ হয়েছে' : 'Registration failed'));
        }

        if (data?.requiresActivation) {
          setMode('activation_pending');
          setSuccessMessage(
            data.message || (lang === 'bn'
              ? '📩 আপনার ইমেইলে একটি একাউন্ট একটিভেশন লিঙ্ক পাঠানো হয়েছে!'
              : '📩 Activation link sent to your email!')
          );
        } else if (data?.token && data?.user) {
          localStorage.setItem('bot_auth_token', data.token);
          localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
          onSuccess(data.user, data.token);
          if (onClose) onClose();
        }
      } catch (err: any) {
        setError(err?.message || (lang === 'bn' ? 'রেজিস্ট্রেশন ব্যর্থ হয়েছে' : 'Registration failed'));
      } finally {
        setLoading(false);
      }
      return;
    }
  };

  // Handle Forgot Password Submit (Request Reset Link)
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError(lang === 'bn' ? 'সঠিক ইমেইল এড্রেস লিখুন' : 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
      const data = await safeJsonParse(res);
      if (!res.ok || (data && !data.success)) {
        throw new Error(data?.error || (lang === 'bn' ? 'রিসেট লিঙ্ক পাঠাতে ব্যর্থ হয়েছে' : 'Failed to send reset link'));
      }

      setSuccessMessage(
        data?.message || (lang === 'bn'
          ? '📩 আপনার ইমেইলে পাসওয়ার্ড রিসেট লিঙ্ক পাঠানো হয়েছে! ইমেইল চেক করে "Reset Password" বাটনে ক্লিক করুন।'
          : '📩 Password reset link sent to your email! Please check your inbox.')
      );
    } catch (err: any) {
      setError(err?.message || (lang === 'bn' ? 'রিসেট লিঙ্ক পাঠাতে সমস্যা হয়েছে' : 'Failed to send reset link'));
    } finally {
      setLoading(false);
    }
  };

  // Handle Password Reset Submit
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
        body: JSON.stringify({
          email: cleanEmail,
          newPassword,
          token: resetToken
        })
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
        setSuccessMessage(lang === 'bn' ? '🎉 পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে! এখন লগইন করুন।' : 'Password changed! Please sign in.');
      }
    } catch (err: any) {
      setError(err?.message || (lang === 'bn' ? 'পাসওয়ার্ড সংরক্ষণে ত্রুটি হয়েছে' : 'Failed to reset password'));
    } finally {
      setLoading(false);
    }
  };

  // Handle Resending Activation Link
  const handleResendActivationLink = async () => {
    setResending(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/resend-activation-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const data = await safeJsonParse(res);
      if (res.ok && data?.success) {
        setSuccessMessage(lang === 'bn' ? '✅ নতুন অ্যাক্টিভেশন লিঙ্ক আপনার ইমেইলে পাঠানো হয়েছে।' : '✅ New activation link sent to your email.');
      } else {
        throw new Error(data?.error || 'Failed to resend');
      }
    } catch (err: any) {
      setError(err?.message || (lang === 'bn' ? 'লিঙ্ক পাঠাতে ব্যর্থ হয়েছে' : 'Failed to resend link'));
    } finally {
      setResending(false);
    }
  };

  // Google Sign-In with One-Tap / Popup
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const activeAuth = auth || fallbackAuth;
      if (!activeAuth) {
        setShowGoogleInput(true);
        setGoogleLoading(false);
        return;
      }

      const result = await signInWithPopup(activeAuth, googleProvider);
      const user = result.user;
      if (!user) throw new Error('No user returned from Google popup');

      const idToken = await user.getIdToken();
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: idToken,
          email: user.email,
          name: user.displayName,
          picture: user.photoURL,
          googleId: user.uid
        })
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
      const errMsg = err?.message || '';
      if (errMsg.includes('popup-blocked') || errMsg.includes('popup-closed-by-user') || errMsg.includes('network-request-failed')) {
        setShowGoogleInput(true);
      } else {
        setError(errMsg || 'Google authentication failed');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAuthenticateWithGoogleEmail = async (userProvidedEmail: string) => {
    const cleanEmail = (userProvidedEmail || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError(lang === 'bn' ? 'সঠিক গুগল ইমেইল এড্রেস লিখুন' : 'Please enter a valid Google email address');
      return;
    }
    setGoogleLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: cleanEmail.split('@')[0],
          googleId: `google_direct_${Date.now()}`
        })
      });
      const data = await safeJsonParse(res);
      if (res.ok && data?.success && data?.token && data?.user) {
        localStorage.setItem('bot_auth_token', data.token);
        localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
        onSuccess(data.user, data.token);
        if (onClose) onClose();
      } else {
        throw new Error(data?.error || 'Google direct authentication failed');
      }
    } catch (err: any) {
      setError(err?.message || 'Google direct sign in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-[#070b14] border border-[#1e2d48] rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-[#00d293]/15 rounded-full blur-3xl pointer-events-none" />

        {canDismiss && onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* 1. ACTIVATION PENDING VIEW (Check Your Email) */}
        {mode === 'activation_pending' ? (
          <div className="text-center py-2 animate-in fade-in">
            <div className="relative w-18 h-18 mx-auto mb-4">
              <div className="w-18 h-18 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-[#00d293]">
                <Mail className="w-9 h-9" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-[#070b14]"></span>
              </span>
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight">
              {lang === 'bn' ? 'ইমেইল চেক করুন (Check Email)' : 'Check Your Email'}
            </h2>

            <p className="text-xs text-slate-300 mt-2 leading-relaxed px-2">
              {lang === 'bn' ? (
                <>
                  আমরা আপনার <strong className="text-emerald-400 font-semibold">{email}</strong> ইমেইলে একটি অ্যাকাউন্ট অ্যাক্টিভেশন লিঙ্ক পাঠিয়েছি।
                </>
              ) : (
                <>
                  We sent an activation link to <strong className="text-emerald-400 font-semibold">{email}</strong>.
                </>
              )}
            </p>

            <div className="my-5 p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-left space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{lang === 'bn' ? 'অ্যাকাউন্ট চালু করার নিয়ম:' : 'How to Activate:'}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {lang === 'bn' ? (
                  <>
                    ১. আপনার জিমেইল / ইনবক্স খুলুন।<br />
                    ২. ইমেইলে থাকা <strong className="text-emerald-300 font-bold">"Active Account"</strong> বাটনে ক্লিক করুন।<br />
                    ৩. ক্লিক করার সাথে সাথে অ্যাকাউন্ট স্বয়ংক্রিয়ভাবে সক্রিয় হয়ে যাবে।
                  </>
                ) : (
                  <>
                    1. Open your inbox or Gmail.<br />
                    2. Click the <strong className="text-emerald-300 font-bold">"Active Account"</strong> button inside.<br />
                    3. Your account will instantly activate and log you in.
                  </>
                )}
              </p>
              <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 text-emerald-400/90 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  {lang === 'bn' ? 'লিঙ্কে ক্লিক করার অপেক্ষায়...' : 'Waiting for activation...'}
                </span>
                <span className="text-[10px] text-slate-500">Auto-detects</span>
              </div>
            </div>

            {successMessage && (
              <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2 mt-4">
              <button
                type="button"
                onClick={handleResendActivationLink}
                disabled={resending}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {resending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{lang === 'bn' ? 'পুনরায় লিঙ্ক পাঠান (Resend Link)' : 'Resend Activation Link'}</span>
              </button>

              <button
                type="button"
                onClick={() => resetAllState('login')}
                className="w-full py-2 text-xs text-slate-400 hover:text-white transition cursor-pointer"
              >
                {lang === 'bn' ? '← লগইনে ফিরে যান' : '← Back to Sign In'}
              </button>
            </div>
          </div>
        ) : mode === 'forgot' ? (
          /* 2. FORGOT PASSWORD VIEW (Request Reset Link) */
          <div className="animate-in fade-in">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/10 text-blue-400">
                <KeyRound className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {lang === 'bn' ? 'পাসওয়ার্ড রিসেট লিঙ্ক' : 'Reset Password'}
              </h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                {lang === 'bn'
                  ? 'আপনার নিবন্ধিত ইমেইল লিখুন। আপনার ইমেইলে রিসেট লিঙ্ক পাঠানো হবে:'
                  : 'Enter your email to receive a password reset link:'}
              </p>
            </div>

            {successMessage && (
              <div className="mb-4 p-3.5 bg-blue-950/50 border border-blue-500/40 rounded-xl text-blue-200 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
                <div className="space-y-1">
                  <p className="font-semibold text-white">{lang === 'bn' ? 'ইমেইল পাঠানো হয়েছে!' : 'Email Sent!'}</p>
                  <p className="leading-relaxed">{successMessage}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={lang === 'bn' ? 'আপনার নিবন্ধিত ইমেইল এড্রেস' : 'Your Registered Email'}
                  className="w-full bg-[#0b1220] border border-[#1f2d48] focus:border-blue-500 rounded-xl text-white placeholder-slate-500 py-3 pl-10 pr-4 text-xs focus:outline-none transition-all"
                  autoComplete="email"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{lang === 'bn' ? 'রিসেট লিঙ্ক পাঠান (Send Reset Link)' : 'Send Reset Link'}</span>
              </button>
            </form>

            <div className="text-center mt-5">
              <button
                type="button"
                onClick={() => resetAllState('login')}
                className="text-xs text-slate-400 hover:text-white transition flex items-center justify-center gap-1 mx-auto cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'লগইনে ফিরে যান' : 'Back to Sign In'}</span>
              </button>
            </div>
          </div>
        ) : mode === 'reset' ? (
          /* 3. SET NEW PASSWORD VIEW (Arrived from email link) */
          <div className="animate-in fade-in">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-pink-500/10 text-pink-400">
                <KeyRound className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {lang === 'bn' ? 'নতুন পাসওয়ার্ড সেট করুন' : 'Set New Password'}
              </h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                {lang === 'bn'
                  ? 'আপনার নতুন পাসওয়ার্ড লিখে সরাসরি সেভ করুন ও লগইন হন:'
                  : 'Enter your new password to sign in:'}
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
                className="w-full py-3.5 px-4 bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-pink-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{lang === 'bn' ? 'পাসওয়ার্ড সংরক্ষণ ও লগইন করুন' : 'Save Password & Sign In'}</span>
              </button>
            </form>

            <div className="text-center mt-5">
              <button
                type="button"
                onClick={() => resetAllState('login')}
                className="text-xs text-slate-400 hover:text-white transition flex items-center justify-center gap-1 mx-auto cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'লগইনে ফিরে যান' : 'Back to Sign In'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* 4. LOGIN & REGISTRATION VIEW */
          <div>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#00d293]/20 to-teal-500/20 border border-[#00d293]/30 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#00d293]/10 text-[#00d293]">
                <Bot className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {mode === 'login'
                  ? lang === 'bn'
                    ? 'অ্যাকাউন্টে লগইন করুন'
                    : 'Sign In to Your Account'
                  : lang === 'bn'
                  ? 'নতুন অ্যাকাউন্ট তৈরি করুন'
                  : 'Create an Account'}
              </h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                {mode === 'login'
                  ? lang === 'bn'
                    ? 'আপনার ইমেইল ও পাসওয়ার্ড দিয়ে সহজে প্রবেশ করুন:'
                    : 'Sign in to access your hosted bots & wallet'
                  : lang === 'bn'
                  ? 'নাম, ইমেইল ও পাসওয়ার্ড লিখে রেজিস্ট্রেশন সম্পন্ন করুন:'
                  : 'Sign up to start hosting your bots & websites'}
              </p>
            </div>

            {/* Free Trial Highlight */}
            {mode === 'register' && (
              <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-cyan-500/15 border border-emerald-500/30 flex items-center gap-2.5 shadow-sm">
                <Gift className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-left flex-1">
                  <p className="text-xs font-bold text-emerald-300">
                    {lang === 'bn' ? '🎁 ১ মাসের ফ্রি ট্রায়াল অফার!' : '🎁 1-Month Free Trial Included!'}
                  </p>
                  <p className="text-[11px] text-slate-300">
                    {lang === 'bn' ? 'রেজিস্ট্রেশনের পর ইমেইল অ্যাক্টিভ করে ফ্রি হোস্টিং শুরু করুন।' : 'Activate your account via email to start free hosting.'}
                  </p>
                </div>
              </div>
            )}

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

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'register' && (
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={lang === 'bn' ? 'আপনার পুরো নাম' : 'Full Name'}
                    className="w-full bg-[#0b1220] border border-[#1f2d48] focus:border-[#00d293] rounded-xl text-white placeholder-slate-500 py-3 pl-10 pr-4 text-xs focus:outline-none transition-all"
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
                  className="w-full bg-[#0b1220] border border-[#1f2d48] focus:border-[#00d293] rounded-xl text-white placeholder-slate-500 py-3 pl-10 pr-4 text-xs focus:outline-none transition-all"
                  autoComplete="email"
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
                  placeholder={lang === 'bn' ? 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)' : 'Password (min 6 chars)'}
                  className="w-full bg-[#0b1220] border border-[#1f2d48] focus:border-[#00d293] rounded-xl text-white placeholder-slate-500 py-3 pl-10 pr-10 text-xs focus:outline-none transition-all"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => resetAllState('forgot')}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium hover:underline cursor-pointer"
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
                    className="w-full bg-[#0b1220] border border-[#1f2d48] focus:border-[#00d293] rounded-xl text-white placeholder-slate-500 py-3 pl-10 pr-10 text-xs focus:outline-none transition-all"
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
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#00d293] via-teal-500 to-emerald-600 hover:opacity-95 text-[#04121e] font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-900" />
                ) : mode === 'login' ? (
                  <span>{lang === 'bn' ? 'লগইন করুন' : 'Sign In'}</span>
                ) : (
                  <span>{lang === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন (Sign Up)' : 'Create Account & Continue'}</span>
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
                    className="text-[#00d293] hover:text-emerald-300 font-semibold hover:underline cursor-pointer ml-1"
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
                    className="text-[#00d293] hover:text-emerald-300 font-semibold hover:underline cursor-pointer ml-1"
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
                  {lang === 'bn' ? 'অথবা গুগল দিয়ে সরাসরি প্রবেশ করুন' : 'or continue with Google'}
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
