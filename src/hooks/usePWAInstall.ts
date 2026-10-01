import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function checkIsApkDownloaded(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const downloaded =
      localStorage.getItem('hlf_apk_downloaded') === 'true' ||
      localStorage.getItem('apk_downloaded') === 'true' ||
      (typeof document !== 'undefined' && document.cookie.includes('hlf_apk_downloaded=true'));
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      /Android.*wv|AndroidApp|MobileApp/i.test(window.navigator.userAgent) ||
      (typeof document !== 'undefined' && document.referrer.includes('android-app://'));
    return Boolean(downloaded || isStandalone);
  } catch {
    return false;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [apkDownloadUrl, setApkDownloadUrl] = useState<string | null>('/APK_DOWNLOAD/hosting-live-fast.apk');
  const [isDownloaded, setIsDownloaded] = useState<boolean>(() => checkIsApkDownloaded());

  const recordApkDownload = () => {
    try {
      localStorage.setItem('hlf_apk_downloaded', 'true');
      localStorage.setItem('apk_downloaded', 'true');
      if (typeof document !== 'undefined') {
        document.cookie = 'hlf_apk_downloaded=true; path=/; max-age=31536000; SameSite=Lax';
      }
      setIsDownloaded(true);
      window.dispatchEvent(new CustomEvent('hlf-apk-downloaded'));
    } catch {}
  };

  useEffect(() => {
    // Detect standalone mode (already installed as PWA or running in Android webview)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      /Android.*wv|AndroidApp|MobileApp/i.test(window.navigator.userAgent) ||
      document.referrer.includes('android-app://');

    setIsInstalled(isStandalone);
    if (isStandalone || checkIsApkDownloaded()) {
      setIsDownloaded(true);
    }

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      recordApkDownload();
      setDeferredPrompt(null);
    };

    const handleApkDownloadedEvent = () => {
      setIsDownloaded(true);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hlf_apk_downloaded' || e.key === 'apk_downloaded') {
        if (e.newValue === 'true') {
          setIsDownloaded(true);
        }
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('hlf-apk-downloaded', handleApkDownloadedEvent);
    window.addEventListener('storage', handleStorageChange);

    // Check if an APK file exists in /APK_DOWNLOAD
    fetch('/api/app-download/info')
      .then((res) => res.json())
      .then((data) => {
        if (data.hasApk && data.downloadUrl) {
          setApkDownloadUrl(data.downloadUrl);
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('hlf-apk-downloaded', handleApkDownloadedEvent);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) {
      return false;
    }
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsDownloaded(true);
      try {
        localStorage.setItem('hlf_apk_downloaded', 'true');
      } catch {}
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
    apkDownloadUrl,
    isDownloaded,
    recordApkDownload
  };
}
