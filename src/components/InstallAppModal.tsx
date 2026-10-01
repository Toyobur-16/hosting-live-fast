import React, { useState } from 'react';
import { Download, Smartphone, CheckCircle, ExternalLink, X, Shield, ArrowDownToLine, Share2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'bn' | 'en';
  siteName?: string;
  logoUrl?: string;
  onDownloaded?: () => void;
}

export function InstallAppModal({
  isOpen,
  onClose,
  lang,
  siteName = 'hosting live fast',
  logoUrl = '/pwa-192x192.png',
  onDownloaded
}: InstallAppModalProps) {
  const { isInstallable, isInstalled, isIOS, install, apkDownloadUrl, isDownloaded, recordApkDownload } = usePWAInstall();
  const [installing, setInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);
  const [downloadedSuccess, setDownloadedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (isInstallable) {
      setInstalling(true);
      try {
        const accepted = await install();
        if (accepted) {
          setInstalledSuccess(true);
          if (onDownloaded) onDownloaded();
        }
      } catch (err) {
        console.error('PWA install error:', err);
      } finally {
        setInstalling(false);
      }
    }
  };

  const handleApkDownloadClick = () => {
    recordApkDownload();
    setDownloadedSuccess(true);
    if (onDownloaded) onDownloaded();
    setTimeout(() => {
      onClose();
    }, 1600);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-[#1e293b] rounded-2xl shadow-2xl p-6 text-slate-900 dark:text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#1a2333] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Icon & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative w-20 h-20 rounded-2xl p-1 bg-gradient-to-tr from-[#00d293] to-sky-500 shadow-lg shadow-[#00d293]/20 mb-3 flex items-center justify-center">
            <img
              src={logoUrl || '/pwa-192x192.png'}
              alt={siteName}
              className="w-full h-full object-cover rounded-xl bg-slate-900"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (!target.src.includes('pwa-192x192.png')) {
                  target.src = '/pwa-192x192.png';
                }
              }}
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#00d293] text-slate-950 flex items-center justify-center shadow">
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </div>

          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {lang === 'bn' ? 'অ্যাপস ইন্সটল ও ডাউনলোড' : 'Install & Download App'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
            {lang === 'bn'
              ? 'মোবাইল হোমস্ক্রিনে ১-ক্লিকে অ্যাপের মতো যুক্ত করুন অথবা APK ফাইল ডাউনলোড করুন।'
              : 'Add to mobile home screen as a standalone native app or download the APK directly.'}
          </p>
        </div>

        {/* Status / Actions */}
        <div className="space-y-3">
          {isInstalled || installedSuccess || downloadedSuccess ? (
            <div className="p-4 rounded-xl bg-[#00d293]/15 border border-[#00d293]/30 text-center animate-in fade-in">
              <CheckCircle className="w-8 h-8 text-[#00d293] mx-auto mb-2" />
              <div className="text-sm font-bold text-[#00a876] dark:text-[#00d293]">
                {downloadedSuccess
                  ? (lang === 'bn' ? '✓ APK সফলভাবে ডাউনলোড হচ্ছে!' : '✓ APK download started successfully!')
                  : (lang === 'bn' ? 'অ্যাপটি ইতিমধ্যেই ইন্সটল করা হয়েছে!' : 'App is already installed!')}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {downloadedSuccess
                  ? (lang === 'bn'
                    ? 'আপনার ডিভাইসে ৫.০ MB APK ডাউনলোড শুরু হয়েছে। ইন্সটল করে ব্যবহার করুন!'
                    : 'The 5.0 MB APK download has started on your device. Enjoy!')
                  : (lang === 'bn'
                    ? 'আপনার হোমস্ক্রিনে বা অ্যাপ ড্রয়ারে লোগোসহ আইকন যুক্ত হয়েছে।'
                    : 'The icon with logo is added to your home screen or app drawer.')}
              </p>
            </div>
          ) : (
            <>
              {/* Native PWA Prompt Install Button (Chromium / Android) */}
              {isInstallable && (
                <button
                  onClick={handleInstallClick}
                  disabled={installing}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#00d293] to-[#00b07b] hover:from-[#00b07b] hover:to-[#009b6c] text-slate-950 font-black text-sm shadow-lg shadow-[#00d293]/25 flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-98"
                >
                  <Smartphone className="w-4.5 h-4.5" />
                  <span>
                    {installing
                      ? lang === 'bn' ? 'ইন্সটল হচ্ছে...' : 'Installing...'
                      : lang === 'bn' ? 'হোমস্ক্রিনে ইন্সটল করুন (অফিসিয়াল অ্যাপ)' : 'Install to Home Screen (Official App)'}
                  </span>
                </button>
              )}

              {/* Direct 5.0 MB APK Download Button */}
              <a
                href={apkDownloadUrl || '/api/app-download/apk'}
                download="hosting-live-fast.apk"
                onClick={handleApkDownloadClick}
                className="w-full p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-[#00d293]/15 to-teal-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 text-slate-900 dark:text-white border-2 border-[#00d293]/50 font-bold text-sm flex items-center justify-between transition cursor-pointer shadow-lg shadow-[#00d293]/15 group hover:scale-[1.01] active:scale-98"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#00d293] text-slate-950 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                    <ArrowDownToLine className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                      {lang === 'bn' ? 'অ্যান্ড্রয়েড APK ডাউনলোড করুন (.apk)' : 'Download Android APK (.apk)'}
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-[#00d293] font-medium flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00d293] animate-pulse" />
                      <span>{lang === 'bn' ? 'অফিসিয়াল অ্যাপ • ৫.০ MB' : 'Official App • 5.0 MB'}</span>
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-[#00d293]/20 text-[#00a876] dark:text-[#00d293] text-[10px] font-mono font-black border border-[#00d293]/30 shrink-0">
                  5.0 MB
                </span>
              </a>

              {/* iOS Safari Instructions */}
              {isIOS && (
                <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40 text-left">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-700 dark:text-sky-300 mb-2">
                    <Share2 className="w-4 h-4" />
                    <span>{lang === 'bn' ? 'iPhone / iPad ইউজারদের জন্য নিয়ম:' : 'How to install on iOS:'}</span>
                  </div>
                  <ol className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-decimal list-inside pl-1">
                    <li>
                      {lang === 'bn' ? 'Safari ব্রাউজারে নিচের' : 'Tap the'} <strong>Share</strong> {lang === 'bn' ? 'বাটনে চাপ দিন।' : 'icon in Safari.'}
                    </li>
                    <li>
                      {lang === 'bn' ? 'নিচে স্ক্রল করে' : 'Scroll down and select'} <strong>Add to Home Screen</strong> {lang === 'bn' ? 'সিলেক্ট করুন।' : '.'}
                    </li>
                    <li>
                      {lang === 'bn' ? 'উপরের ডানপাশে' : 'Tap'} <strong>Add</strong> {lang === 'bn' ? 'বাটনে চাপ দিলেই অ্যাপটি হোমস্ক্রিনে চলে আসবে।' : 'at the top right.'}
                    </li>
                  </ol>
                </div>
              )}

              {/* Android Chrome Browser Shortcut Instructions (if prompt not yet popped up) */}
              {!isInstallable && !isIOS && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-200 dark:border-[#1d273e] text-left">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-[#00d293]" />
                    <span>{lang === 'bn' ? 'ক্রোম ব্রাউজার থেকে ইন্সটল করার নিয়ম:' : 'How to install from Chrome:'}</span>
                  </div>
                  <ol className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 list-decimal list-inside">
                    <li>{lang === 'bn' ? 'ক্রোমের উপরের ডানপাশে ৩-ডট (⋮) মেনুতে চাপ দিন।' : 'Tap the three dots (⋮) menu in Chrome.'}</li>
                    <li>
                      {lang === 'bn' ? '"Install app" অথবা "Add to Home screen" চাপুন।' : 'Select "Install app" or "Add to Home screen".'}
                    </li>
                    <li>
                      {lang === 'bn' ? 'কনফার্ম করলেই সম্পূর্ণ লোগোসহ অ্যাপ যুক্ত হয়ে যাবে।' : 'Confirm to add with the official brand logo.'}
                    </li>
                  </ol>
                </div>
              )}
            </>
          )}

          {/* Features list */}
          <div className="pt-2 border-t border-slate-200 dark:border-[#162035] grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d293]" />
              <span>{lang === 'bn' ? 'সুপারফাস্ট লোডিং' : 'Superfast Loading'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d293]" />
              <span>{lang === 'bn' ? '২৪/৭ লাইভ নোটিফিকেশন' : '24/7 Notifications'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d293]" />
              <span>{lang === 'bn' ? 'ফুল স্ক্রিন অভিজ্ঞতা' : 'Full Screen Standalone'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d293]" />
              <span>{lang === 'bn' ? 'অফিসিয়াল লোগো আইকন' : 'Official Logo Icon'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
