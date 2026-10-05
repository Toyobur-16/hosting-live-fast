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
  Zap,
  ShieldCheck,
  Check
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

// Ensure mode is strictly one of the 4 valid states
const normalizeMode = (m: any): AuthMode => {
  if (m === 'register' || m === 'forgot' || m === 'reset') return m;
  return 'login';
};

// Password strength calculator
function getPasswordStrength(pass: string): {
  score: number;
  labelBn: string;
  labelEn: string;
  colorClass: string;
} {
  if (!pass) return { score: 0, labelBn: '', labelEn: '', colorClass: 'bg-slate-700' };
  let score = 0;
  if (pass.length >= 6) score += 1;
  if (pass.length >= 8) score += 1;
  if (/[0-9]/.test(pass) && /[a-zA-Z]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;

  if (score <= 1) return { score: 1, labelBn: 'দুর্বল (Weak)', labelEn: 'Weak', colorClass: 'bg-rose-500' };
  if (score === 2) return { score: 2, labelBn: 'চলনসই (Fair)', labelEn: 'Fair', colorClass: 'bg-amber-500' };
  if (score === 3) return { score: 3, labelBn: 'ভালো (Good)', labelEn: 'Good', colorClass: 'bg-cyan-500' };
  return { score: 4, labelBn: 'খুব শক্তিশালী (Strong)', labelEn: 'Strong', colorClass: 'bg-[#00d293]' };
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
  const [mode, setMode] = useState<AuthMode>(() => normalizeMode(initialMode));
  const [name, setName] = useState('');
  const [email, setEmail] = useState(typeof initialEmail === 'string' ? initialEmail : '');
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

  const resetAllState = (targetMode: AuthMode) => {
    setMode(normalizeMode(targetMode));
    setError(null);
    setSuccessMessage(null);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      setMode(normalizeMode(initialMode));
      if (initialEmail && typeof initialEmail === 'string') setEmail(initialEmail);
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, initialEmail, initialMode]);

  // Derived mode checks
  const safeMode = normalizeMode(mode);
  const isRegister = safeMode === 'register';
  const isLogin = safeMode === 'login';
  const isForgotOrReset = safeMode === 'forgot' || safeMode === 'reset';

  // Real-time validations
  const isEmailValid = email.trim().length > 3 && email.includes('@') && email.includes('.');
  const strength = getPasswordStrength(isRegister ? password : newPassword);
  const passwordsMatch =
    isRegister
      ? confirmPassword.length > 0 && password === confirmPassword
      : confirmNewPassword.length > 0 && newPassword === confirmNewPassword;
  const passwordsMismatch =
    isRegister
      ? confirmPassword.length > 0 && password !== confirmPassword
      : confirmNewPassword.length > 0 && newPassword !== confirmNewPassword;

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

    if (isLogin) {
      if (!password) {
        setError(lang === 'bn' ? 'আপনার পাসওয়ার্ড লিখুন' : 'Please enter your password');
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
        setError(err?.message || (lang === 'bn' ? 'লগইন ব্যর্থ হয়েছে' : 'Login failed'));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isRegister) {
      if (!name.trim()) {
        setError(lang === 'bn' ? 'আপনার পুরো নাম লিখুন' : 'Please enter your full name');
        return;
      }
      if (password.length < 6) {
        setError(lang === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে باشد' : 'Password must be at least 6 characters');
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
              ? '✅ এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট তৈরি করা আছে! নিচে পাসওয়ার্ড দিয়ে সরাসরি লগইন করুন।'
              : '✅ This email is already registered! Please sign in below with your password.'
          );
          return;
        }

        if (!res.ok || (data && !data.success)) {
          throw new Error(data?.error || (lang === 'bn' ? 'রেজিস্ট্রেশন ব্যর্থ হয়েছে' : 'Registration failed'));
        }

        // Instant registration success - direct login without waiting for email verification!
        if (data?.token && data?.user) {
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

  // Direct Password Reset (No email code/link bottleneck)
  const handleDirectPasswordReset = async (e: React.FormEvent) => {
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
          token: resetToken || ''
        })
      });
      const data = await safeJsonParse(res);

      if (!res.ok || (data && !data.success)) {
        // Fallback: try forgot-password with direct newPassword parameter
        const fbRes = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, newPassword })
        });
        const fbData = await safeJsonParse(fbRes);

        if (!fbRes.ok || (fbData && !fbData.success)) {
          throw new Error(data?.error || fbData?.error || (lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে' : 'Password reset failed'));
        }

        if (fbData?.token && fbData?.user) {
          localStorage.setItem('bot_auth_token', fbData.token);
          localStorage.setItem('bot_auth_user', JSON.stringify(fbData.user));
          onSuccess(fbData.user, fbData.token);
          if (onClose) onClose();
          return;
        }
      }

      if (data?.token && data?.user) {
        localStorage.setItem('bot_auth_token', data.token);
        localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
        onSuccess(data.user, data.token);
        if (onClose) onClose();
      } else {
        setMode('login');
        setPassword(newPassword);
        setSuccessMessage(
          lang === 'bn'
            ? '🎉 পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে! এখন সরাসরি লগইন করুন।'
            : '🎉 Password changed successfully! Please sign in.'
        );
      }
    } catch (err: any) {
      setError(err?.message || (lang === 'bn' ? 'পাসওয়ার্ড সংরক্ষণে সমস্যা হয়েছে' : 'Failed to update password'));
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In with Firebase popup and direct email fallback
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      let activeAuth = auth;
      try {
        if (!activeAuth) activeAuth = fallbackAuth;
      } catch {}

      if (activeAuth && googleProvider) {
        try {
          const result = await signInWithPopup(activeAuth, googleProvider);
          const user = result.user;
          if (user && user.email) {
            const res = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: user.email,
                name: user.displayName || user.email.split('@')[0],
                picture: user.photoURL || '',
                googleId: user.uid
              })
            });
            const data = await safeJsonParse(res);
            if (res.ok && data?.success && data?.token && data?.user) {
              localStorage.setItem('bot_auth_token', data.token);
              localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
              onSuccess(data.user, data.token);
              if (onClose) onClose();
              return;
            }
          }
        } catch (popupErr: any) {
          console.warn('Google popup auth blocked or closed, falling back to manual entry:', popupErr);
          setShowGoogleInput(true);
          return;
        }
      }
      setShowGoogleInput(true);
    } catch (err: any) {
      setShowGoogleInput(true);
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
      setError(err?.message || 'Google sign in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#070b14] border border-[#1e2d48] rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[94vh] overflow-y-auto">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gradient-to-b from-[#00d293]/20 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        {canDismiss && onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/60 transition cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Brand Header */}
        <div className="text-center mb-5 relative">
          <div className="relative w-14 h-14 mx-auto mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#00d293]/20 via-teal-500/20 to-cyan-500/20 border border-[#00d293]/30 flex items-center justify-center shadow-lg shadow-[#00d293]/15 text-[#00d293]">
              <Bot className="w-7 h-7" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[#070b14]"></span>
            </span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">
            {isForgotOrReset
              ? lang === 'bn'
                ? 'পাসওয়ার্ড পরিবর্তন করুন'
                : 'Direct Password Reset'
              : isRegister
              ? lang === 'bn'
                ? 'নতুন একাউন্ট খুলুন'
                : 'Create Your Account'
              : lang === 'bn'
              ? 'একাউন্টে লগইন করুন'
              : 'Sign In to Your Account'}
          </h2>

          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-sm mx-auto">
            {isForgotOrReset
              ? lang === 'bn'
                ? 'ইমেইল ও নতুন পাসওয়ার্ড দিয়ে তাৎক্ষণিক অ্যাকাউন্ট আপডেট করুন'
                : 'Enter your email and new password to instantly update & sign in'
              : isRegister
              ? lang === 'bn'
                ? '১-ক্লিকে ইনস্ট্যান্ট অ্যাক্টিভেশন • ইমেইল ভেরিফিকেশনের কোনো ঝামেলা নেই'
                : 'Instant 1-Click Access · Zero Email Verification Required'
              : lang === 'bn'
              ? 'হোস্টিং লাইভ ফাস্টে আপনার বট ও ওয়ালেটে নিরাপদে প্রবেশ করুন'
              : 'Access your hosted bots, websites, and balance'}
          </p>
        </div>

        {/* Tab Switcher (Segmented Control for Sign In / Sign Up) */}
        {!isForgotOrReset && (
          <div className="p-1 mb-5 bg-[#0b1220] border border-[#1e2d48] rounded-2xl flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => resetAllState('login')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isLogin
                  ? 'bg-gradient-to-r from-[#00d293] to-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>{lang === 'bn' ? '🔑 লগইন (Sign In)' : 'Sign In'}</span>
            </button>
            <button
              type="button"
              onClick={() => resetAllState('register')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isRegister
                  ? 'bg-gradient-to-r from-[#00d293] to-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isRegister ? 'text-slate-950' : 'text-[#00d293]'}`} />
              <span>{lang === 'bn' ? '⚡ রেজিস্ট্রেশন (Sign Up)' : 'Sign Up'}</span>
            </button>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span className="leading-relaxed flex-1">{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="leading-relaxed flex-1">{error}</span>
          </div>
        )}

        {/* 1. FORGOT / RESET PASSWORD VIEW (Direct, No Email Dependency) */}
        {isForgotOrReset ? (
          <form onSubmit={handleDirectPasswordReset} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                <span>{lang === 'bn' ? 'নিবন্ধিত ইমেইল এড্রেস' : 'Registered Email Address'}</span>
                {isEmailValid && <span className="text-[#00d293] flex items-center gap-1 text-[10px]"><Check className="w-3 h-3" /> সঠিক</span>}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full bg-[#0b1220] border border-[#1f2d48] focus:border-[#00d293] rounded-xl text-white placeholder-slate-500 py-3 pl-10 pr-4 text-xs focus:outline-none transition-all"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">
                {lang === 'bn' ? 'নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)' : 'New Password (min 6 characters)'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0b1220] border border-[#1f2d48] focus:border-[#00d293] rounded-xl text-white placeholder-slate-500 py-3 pl-10 pr-10 text-xs focus:outline-none transition-all"
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
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="text-slate-300">{lang === 'bn' ? 'নতুন পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm New Password'}</span>
                {passwordsMatch && (
                  <span className="text-[#00d293] flex items-center gap-1 text-[10px]">
                    <Check className="w-3 h-3" /> {lang === 'bn' ? 'পাসওয়ার্ড মিলেছে' : 'Matches'}
                  </span>
                )}
                {passwordsMismatch && (
                  <span className="text-rose-400 text-[10px]">{lang === 'bn' ? 'পাসওয়ার্ড মিলছে না' : 'Does not match'}</span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full bg-[#0b1220] border rounded-xl text-white placeholder-slate-500 py-3 pl-10 pr-10 text-xs focus:outline-none transition-all ${
                    passwordsMismatch
                      ? 'border-rose-500 focus:border-rose-500'
                      : passwordsMatch
                      ? 'border-[#00d293] focus:border-[#00d293]'
                      : 'border-[#1f2d48] focus:border-[#00d293]'
                  }`}
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
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#00d293] via-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              <span>
                {lang === 'bn'
                  ? 'পাসওয়ার্ড আপডেট ও সরাসরি লগইন করুন'
                  : 'Update Password & Instant Sign In'}
              </span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => resetAllState('login')}
                className="text-xs text-slate-400 hover:text-white transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'লগইনে ফিরে যান' : 'Back to Sign In'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* 2. REGISTRATION & LOGIN FORM */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name Field (Register Mode Only) */}
            {isRegister && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#00d293]" />
                  <span>{lang === 'bn' ? 'আপনার পুরো নাম (Full Name)' : 'Full Name'}</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={lang === 'bn' ? 'যেমন: মোঃ তৈবুর রহমান' : 'e.g. John Doe'}
                    className="w-full bg-[#0b1220] border border-[#1f2d48] focus:border-[#00d293] rounded-xl text-white placeholder-slate-500 py-3 px-4 text-xs focus:outline-none transition-all font-medium"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <label className="text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#00d293]" />
                  <span>{lang === 'bn' ? 'ইমেইল এড্রেস (Email Address)' : 'Email Address'}</span>
                </label>
                {isEmailValid && (
                  <span className="text-[#00d293] flex items-center gap-1 text-[10px]">
                    <Check className="w-3 h-3" /> {lang === 'bn' ? 'সঠিক' : 'Valid'}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full bg-[#0b1220] border border-[#1f2d48] focus:border-[#00d293] rounded-xl text-white placeholder-slate-500 py-3 px-4 text-xs focus:outline-none transition-all font-medium"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#00d293]" />
                <span>{lang === 'bn' ? 'পাসওয়ার্ড (Password)' : 'Password'}</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={lang === 'bn' ? 'কমপক্ষে ৬ অক্ষর' : 'Min 6 characters'}
                  className="w-full bg-[#0b1220] border border-[#1f2d48] focus:border-[#00d293] rounded-xl text-white placeholder-slate-500 py-3 pl-4 pr-10 text-xs focus:outline-none transition-all font-medium"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                  className="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Clean, right-aligned Forgot Password link right under the password input */}
              {isLogin && (
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => resetAllState('forgot')}
                    className="text-xs text-slate-400 hover:text-[#00d293] hover:underline transition cursor-pointer"
                  >
                    {lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot Password?'}
                  </button>
                </div>
              )}

              {/* Password Strength Meter (Register Mode) */}
              {isRegister && password.length > 0 && (
                <div className="pt-1.5 space-y-1 animate-in fade-in">
                  <div className="grid grid-cols-4 gap-1 h-1.5">
                    <div className={`rounded-full transition-all duration-300 ${strength.score >= 1 ? strength.colorClass : 'bg-slate-800'}`} />
                    <div className={`rounded-full transition-all duration-300 ${strength.score >= 2 ? strength.colorClass : 'bg-slate-800'}`} />
                    <div className={`rounded-full transition-all duration-300 ${strength.score >= 3 ? strength.colorClass : 'bg-slate-800'}`} />
                    <div className={`rounded-full transition-all duration-300 ${strength.score >= 4 ? strength.colorClass : 'bg-slate-800'}`} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{lang === 'bn' ? 'পাসওয়ার্ড শক্তি:' : 'Strength:'} <strong className="text-white font-medium">{lang === 'bn' ? strength.labelBn : strength.labelEn}</strong></span>
                    <span>{password.length < 6 ? (lang === 'bn' ? 'কমপক্ষে ৬ অক্ষর' : 'Min 6 chars') : '✓'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password (Register Mode Only) */}
            {isRegister && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <label className="text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#00d293]" />
                    <span>{lang === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'}</span>
                  </label>
                  {passwordsMatch && (
                    <span className="text-[#00d293] flex items-center gap-1 text-[10px]">
                      <Check className="w-3 h-3" /> {lang === 'bn' ? 'পাসওয়ার্ড মিলেছে' : 'Matches'}
                    </span>
                  )}
                  {passwordsMismatch && (
                    <span className="text-rose-400 text-[10px]">
                      {lang === 'bn' ? 'পাসওয়ার্ড মিলছে না' : 'Does not match'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={lang === 'bn' ? 'একই পাসওয়ার্ড আবার লিখুন' : 'Re-enter password'}
                    className={`w-full bg-[#0b1220] border rounded-xl text-white placeholder-slate-500 py-3 pl-4 pr-10 text-xs focus:outline-none transition-all font-medium ${
                      passwordsMismatch
                        ? 'border-rose-500 focus:border-rose-500'
                        : passwordsMatch
                        ? 'border-[#00d293] focus:border-[#00d293]'
                        : 'border-[#1f2d48] focus:border-[#00d293]'
                    }`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label="Toggle confirm password visibility"
                    className="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#00d293] via-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4 active:scale-[0.99]"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              ) : isLogin ? (
                <span>{lang === 'bn' ? 'লগইন করুন (Sign In)' : 'Sign In'}</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'তাত্ক্ষণিক একাউন্ট তৈরি করুন' : 'Create Account & Continue'}</span>
                </>
              )}
            </button>

            {/* Mode Switch Helper */}
            <div className="text-center pt-2 space-y-1.5">
              {isLogin ? (
                <p className="text-xs text-slate-400">
                  {lang === 'bn' ? 'কোনো অ্যাকাউন্ট নেই?' : "Don't have an account?"}{' '}
                  <button
                    type="button"
                    onClick={() => resetAllState('register')}
                    className="text-[#00d293] hover:text-emerald-300 font-bold hover:underline cursor-pointer ml-1"
                  >
                    {lang === 'bn' ? 'ফ্রি অ্যাকাউন্ট খুলুন' : 'Sign Up Free'}
                  </button>
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  {lang === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট আছে?' : 'Already have an account?'}{' '}
                  <button
                    type="button"
                    onClick={() => resetAllState('login')}
                    className="text-[#00d293] hover:text-emerald-300 font-bold hover:underline cursor-pointer ml-1"
                  >
                    {lang === 'bn' ? 'লগইন করুন' : 'Sign In Here'}
                  </button>
                </p>
              )}
            </div>

            {/* Google Sign-In Divider & Button */}
            <div className="pt-3 border-t border-[#1f2d48] space-y-3">
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
                      <span>{lang === 'bn' ? 'গুগল ইমেইল এড্রেস লিখুন' : 'Enter your Google Email'}</span>
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
                  className="w-full py-2.5 px-4 bg-[#0b1220] hover:bg-slate-800/80 border border-slate-700/80 hover:border-slate-500 rounded-xl text-slate-200 text-xs font-semibold flex items-center justify-center gap-2.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
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
                      <span>{lang === 'bn' ? 'Google দিয়ে সহজে প্রবেশ করুন' : 'Sign in with Google'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
