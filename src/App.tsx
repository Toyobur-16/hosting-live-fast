import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, X, Bell } from 'lucide-react';
import { AppStoreHeader } from './components/AppStoreHeader';
import { SidebarDrawer } from './components/SidebarDrawer';
import { BottomNavBar } from './components/BottomNavBar';
import { StoreHomePage } from './components/StoreHomePage';
import { StoreWalletPage } from './components/StoreWalletPage';
import { DepositStorePage } from './components/DepositStorePage';
import { SupportCenterPage } from './components/SupportCenterPage';
import { ProfilePage } from './components/ProfilePage';
import { PlansPage } from './components/PlansPage';
import { BotList } from './components/BotList';
import { LiveConsole } from './components/LiveConsole';
import { NewBotModal } from './components/NewBotModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { TokenCheckModal } from './components/TokenCheckModal';
import { SafeUploadModal } from './components/SafeUploadModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { NotificationsModal } from './components/NotificationsModal';
import { WebsitesPage } from './components/WebsitesPage';
import { WatchAndEarnPage } from './components/WatchAndEarnPage';
import { HostedBot, LogEntry, AuthUser, SiteSettings } from './types';
import { playBotStoppedAlert } from './utils/audioAlert';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'wallet' | 'support' | 'profile' | 'plans' | 'bots' | 'terminal' | 'deposit-store' | 'websites' | 'rewards'>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [bots, setBots] = useState<HostedBot[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    siteName: 'hosting live fast',
    logoUrl: '/site-logo.png',
    taglineBn: '২৪/৭ ক্লাউড বট ও টপ আপ সার্ভিস',
    taglineEn: '24/7 Cloud Bot & Top Up Service'
  });

  const fetchSiteSettings = () => {
    fetch('/api/site-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          setSiteSettings(data.settings);
          // Dynamically update page title and favicon
          if (data.settings.siteName) {
            document.title = data.settings.siteName;
          }
          if (data.settings.logoUrl) {
            const iconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
            if (iconLink) {
              iconLink.href = data.settings.logoUrl;
            }
            const appleIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
            if (appleIcon) {
              appleIcon.href = data.settings.logoUrl;
            }
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchSiteSettings();
    const handleSettingsUpdate = () => fetchSiteSettings();
    window.addEventListener('site-settings-updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('site-settings-updated', handleSettingsUpdate);
    };
  }, []);

  const [lang, setLang] = useState<'bn' | 'en'>(() => {
    const saved = localStorage.getItem('bot_lang');
    return saved === 'en' ? 'en' : 'bn';
  });

  useEffect(() => {
    localStorage.setItem('bot_lang', lang);
  }, [lang]);

  const [showNewBotModal, setShowNewBotModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTokenCheckModal, setShowTokenCheckModal] = useState(false);
  const [showSafeUploadModal, setShowSafeUploadModal] = useState(false);
  const [safeUploadBot, setSafeUploadBot] = useState<HostedBot | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [tokenForDeploy, setTokenForDeploy] = useState<{ token: string; botName?: string } | null>(null);
  const [settingsInitialTab, setSettingsInitialTab] = useState<string>('overview');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sound Notification Toggle State (persisted in localStorage)
  const [soundAlertEnabled, setSoundAlertEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('bot_sound_alert_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleSoundAlert = (enabled: boolean) => {
    setSoundAlertEnabled(enabled);
    try {
      localStorage.setItem('bot_sound_alert_enabled', String(enabled));
    } catch {}
  };

  // Track previous bot statuses to play sound alert when a bot's status changes from 'running' to 'stopped'
  const prevBotsStatusRef = useRef<Record<string, string>>({});
  const initialBotStatusCheckRef = useRef<boolean>(true);

  useEffect(() => {
    if (!bots || bots.length === 0) return;

    // Skip playing sound on first load when populating initial statuses
    if (initialBotStatusCheckRef.current) {
      const initialMap: Record<string, string> = {};
      bots.forEach((b) => {
        initialMap[b.id] = b.status;
      });
      prevBotsStatusRef.current = initialMap;
      initialBotStatusCheckRef.current = false;
      return;
    }

    let transitionedToStopped = false;
    let stoppedBotName = '';

    bots.forEach((b) => {
      const prevStatus = prevBotsStatusRef.current[b.id];
      if (prevStatus === 'running' && b.status === 'stopped') {
        transitionedToStopped = true;
        stoppedBotName = b.name;
      }
      prevBotsStatusRef.current[b.id] = b.status;
    });

    if (transitionedToStopped && soundAlertEnabled) {
      playBotStoppedAlert();
      setToastMessage(
        lang === 'bn'
          ? `⚠️ সতর্কতা: ${stoppedBotName || 'বট'} অফলাইন বা স্টপ হয়েছে!`
          : `⚠️ Alert: ${stoppedBotName || 'Bot'} stopped running!`
      );
      setTimeout(() => setToastMessage(null), 4000);
    }
  }, [bots, soundAlertEnabled, lang]);

  // Dark Mode Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('bot_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('bot_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('bot_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalKey, setAuthModalKey] = useState(0);

  const openAuthModal = () => {
    setAuthModalKey((prev) => prev + 1);
    setShowAuthModal(true);
  };

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('bot_auth_token');
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(url, { ...options, headers });
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('bot_auth_token');
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem('bot_auth_token');
        localStorage.removeItem('bot_auth_user');
        setCurrentUser(null);
        return;
      }
      const data = await res.json();
      if ((data.authenticated || data.success) && data.user) {
        setCurrentUser(data.user);
        localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
      }
    } catch {}
  };

  const fetchAdminOverview = async () => {
    if (currentUser?.role !== 'admin') return;
    try {
      const res = await authFetch('/api/admin/overview');
      if (res.ok) {
        const data = await res.json();
        setPendingRequestsCount(data.pendingRequestsCount || 0);
      }
    } catch {}
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchAdminOverview();
      const interval = setInterval(fetchAdminOverview, 15000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const isAdmin = Boolean(
    currentUser && (
      currentUser.role === 'admin' ||
      currentUser.email?.toLowerCase().trim() === 'toyoburrahman9090@gmail.com' ||
      currentUser.email?.toLowerCase().trim() === 'toyoburrahman526@gmail.com' ||
      currentUser.email?.toLowerCase().trim() === 'mdtayburrahman1111@gmail.com' ||
      currentUser.email?.toLowerCase().trim() === 'badsharahmanbd@gmail.com' ||
      currentUser.email?.toLowerCase().trim() === 'toyobur@telegram.bot'
    )
  );

  const hasActivePlan = Boolean(
    currentUser && (
      isAdmin ||
      (currentUser.plan && currentUser.plan !== 'free' && currentUser.plan !== 'none' && currentUser.plan !== 'expired' && (!currentUser.planExpiresAt || currentUser.planExpiresAt > Date.now()))
    )
  );

  // Private Admin URL Detection (?admin=true, /admin, #admin)
  useEffect(() => {
    const checkAdminRoute = () => {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.toLowerCase();
      const pathname = window.location.pathname.toLowerCase();

      const isAdminUrl =
        params.get('admin') === 'true' ||
        params.get('admin') === 'portal' ||
        params.get('portal') === 'admin' ||
        pathname === '/admin' ||
        pathname.startsWith('/admin/') ||
        hash === '#admin' ||
        hash === '#admin-portal';

      if (isAdminUrl) {
        if (isAdmin) {
          setShowAdminModal(true);
        } else if (!currentUser) {
          openAuthModal();
        } else {
          // Regular user is logged in. They do not need or expect any admin permission messages.
          // Silently remove any lingering admin query parameters, hash, or path from the URL
          // so the user smoothly stays on their regular dashboard without any annoying warnings.
          try {
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete('admin');
            cleanUrl.searchParams.delete('portal');
            if (cleanUrl.hash === '#admin' || cleanUrl.hash === '#admin-portal') {
              cleanUrl.hash = '';
            }
            if (cleanUrl.pathname === '/admin' || cleanUrl.pathname.startsWith('/admin/')) {
              cleanUrl.pathname = '/';
            }
            window.history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
          } catch {}
        }
      }
    };

    checkAdminRoute();
    window.addEventListener('hashchange', checkAdminRoute);
    window.addEventListener('popstate', checkAdminRoute);
    return () => {
      window.removeEventListener('hashchange', checkAdminRoute);
      window.removeEventListener('popstate', checkAdminRoute);
    };
  }, [currentUser, isAdmin, lang]);

  const fetchBots = async () => {
    try {
      const res = await authFetch('/api/bots');
      const data = await res.json();
      if (data.bots && Array.isArray(data.bots)) {
        setBots(data.bots);
        if (!selectedBotId && data.bots.length > 0) {
          setSelectedBotId(data.bots[0].id);
        } else if (selectedBotId && !data.bots.some((b: HostedBot) => b.id === selectedBotId)) {
          setSelectedBotId(data.bots.length > 0 ? data.bots[0].id : null);
        }
      } else {
        setBots([]);
      }
    } catch {}
  };

  const fetchLogs = async (botId: string | null) => {
    if (!botId) return;
    try {
      const res = await authFetch(`/api/bots/${botId}/logs?limit=400`);
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch {}
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    fetchBots();
  }, [currentUser]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchBots();
      if (activeTab === 'terminal' && selectedBotId) {
        fetchLogs(selectedBotId);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [currentUser, activeTab, selectedBotId]);

  const handleStartBot = async (botId: string) => {
    setLoading(true);
    setBots((prev) =>
      prev.map((b) => (b.id === botId ? { ...b, status: 'running' } : b))
    );
    try {
      const res = await authFetch(`/api/bots/${botId}/start`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToastMessage(data.error || (lang === 'bn' ? 'বট চালু করতে ব্যর্থ হয়েছে' : 'Failed to start bot'));
        if (data.planExpired || data.planRequired) {
          setActiveTab('plans');
        }
      } else {
        setToastMessage(lang === 'bn' ? 'বট সফলভাবে চালু হয়েছে' : 'Bot started successfully');
      }
      await fetchBots();
      fetchLogs(botId);
    } catch {
      setToastMessage(lang === 'bn' ? 'নেটওয়ার্ক বা সার্ভার ত্রুটি' : 'Network or server error');
    } finally {
      setLoading(false);
    }
  };

  const handleStopBot = async (botId: string) => {
    setLoading(true);
    setBots((prev) =>
      prev.map((b) => (b.id === botId ? { ...b, status: 'stopped' } : b))
    );
    try {
      await authFetch(`/api/bots/${botId}/stop`, { method: 'POST' });
      await fetchBots();
      fetchLogs(botId);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleRestartBot = async (botId: string) => {
    setLoading(true);
    setBots((prev) =>
      prev.map((b) => (b.id === botId ? { ...b, status: 'starting' } : b))
    );
    try {
      const res = await authFetch(`/api/bots/${botId}/restart`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToastMessage(data.error || (lang === 'bn' ? 'বট রিস্টার্ট করতে ব্যর্থ হয়েছে' : 'Failed to restart bot'));
        if (data.planExpired || data.planRequired) {
          setActiveTab('plans');
        }
      } else {
        setToastMessage(lang === 'bn' ? 'বট রিস্টার্ট করা হয়েছে' : 'Bot restarted successfully');
      }
      await fetchBots();
      fetchLogs(botId);
    } catch {
      setToastMessage(lang === 'bn' ? 'নেটওয়ার্ক বা সার্ভার ত্রুটি' : 'Network or server error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBot = async (botId: string) => {
    const bot = bots.find((b) => b.id === botId);
    if (!bot) return;
    const confirmMsg =
      lang === 'bn'
        ? `আপনি কি নিশ্চিতভাবে '${bot.name}' বটটি মুছে ফেলতে চান?`
        : `Are you sure you want to delete '${bot.name}'?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await authFetch(`/api/bots/${botId}`, { method: 'DELETE' });
      await fetchBots();
      if (selectedBotId === botId) {
        setSelectedBotId(null);
        setLogs([]);
      }
      setToastMessage(
        lang === 'bn' ? `'${bot.name}' মুছে ফেলা হয়েছে` : `'${bot.name}' deleted`
      );
    } catch {}
  };

  const handleClearLogs = async () => {
    if (!selectedBotId) return;
    try {
      await authFetch(`/api/bots/${selectedBotId}/logs`, { method: 'DELETE' });
      setLogs([]);
    } catch {}
  };

  const handleLogout = () => {
    localStorage.removeItem('bot_auth_token');
    localStorage.removeItem('bot_auth_user');
    try {
      localStorage.removeItem('bot_registered_email');
    } catch {}
    setCurrentUser(null);
    setAuthModalKey((prev) => prev + 1);
    setToastMessage(lang === 'bn' ? 'সফলভাবে লগআউট করা হয়েছে' : 'Logged out successfully');
  };

  const selectedBot = bots.find((b) => b.id === selectedBotId);

  // Plan-Gated Deployment Handler requested by user:
  // "Deploy New Bot এই বটম অ্যাড করবেন যখন ইউজার প্লান কিনবে প্ল্যানটি কিনবে তখন এই অটোমে ক্লিক করলে হোস্টিং এর সিস্টেম টা আসবে এবং ইউজার যদি প্ল্যান না কিনে তাহলে সেটি আসবেনা এটাতে ক্লিক করলে প্ল্যান কিনার জন্য অপশনে নিয়ে যাবে"
  const handleDeployNewBot = () => {
    if (!currentUser) {
      openAuthModal();
      setToastMessage(
        lang === 'bn'
          ? 'বট ডিপ্লয় করতে প্রথমে আপনার একাউন্টে লগইন করুন।'
          : 'Please log in to your account first to deploy bots.'
      );
      return;
    }
    if (!hasActivePlan) {
      setActiveTab('plans');
      setToastMessage(
        lang === 'bn'
          ? '⚠️ আপনার কোনো সক্রিয় হোস্টিং প্ল্যান নেই। নতুন বট ডিপ্লয় করতে প্রথমে যেকোনো একটি প্ল্যান কিনুন।'
          : '⚠️ You do not have an active hosting plan. Please purchase a plan first to deploy bots.'
      );
      return;
    }
    setShowNewBotModal(true);
  };

  const handleClaimFreeTrial = async () => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/free-trial/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        setToastMessage(data.error || 'ফ্রি ট্রায়াল ক্লেইম করা সম্ভব হয়নি');
        return;
      }
      if (data.user) {
        setCurrentUser(data.user);
        localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
      }
      setToastMessage(data.message || (lang === 'bn' ? '🎉 অভিনন্দন! ১ মাসের ফ্রি ট্রায়াল প্ল্যান সক্রিয় হয়েছে!' : '1-Month Free Trial Activated!'));
      fetchBots();
    } catch (err: any) {
      setToastMessage(err.message || 'Error claiming free trial');
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-[#00d293] selection:text-slate-950 pb-20 sm:pb-8">
      {/* Top App Store Header */}
      <AppStoreHeader
        user={currentUser}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'deploy') {
            handleDeployNewBot();
          } else {
            setActiveTab(tab as any);
          }
        }}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onOpenAuthModal={openAuthModal}
        onOpenNotifications={() => setShowNotificationsModal(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        lang={lang}
        onToggleLang={() => setLang((prev) => (prev === 'bn' ? 'en' : 'bn'))}
        onDeployNewBot={handleDeployNewBot}
        hasActivePlan={hasActivePlan}
        botsCount={bots.length}
        pendingCount={pendingRequestsCount}
        siteSettings={siteSettings}
      />

      {/* Slide-out Navigation Drawer */}
      <SidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'deploy') {
            handleDeployNewBot();
          } else {
            setActiveTab(tab as any);
          }
        }}
        user={currentUser}
        onOpenAuthModal={openAuthModal}
        onOpenAdminModal={() => setShowAdminModal(true)}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        pendingRequestsCount={pendingRequestsCount}
        lang={lang}
        onDeployNewBot={handleDeployNewBot}
        botsCount={bots.length}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onToggleLang={() => setLang((prev) => (prev === 'bn' ? 'en' : 'bn'))}
        siteSettings={siteSettings}
      />

      {/* Main Page Content - Generous bottom padding on mobile so bottom bar never obscures content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 lg:pb-8 min-w-0 overflow-x-hidden">
        {toastMessage && (
          <div className="mb-4 p-3.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 rounded-2xl text-xs flex items-center justify-between shadow-lg animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-emerald-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 1. Store Home Page */}
        {activeTab === 'home' && (
          <StoreHomePage
            user={currentUser}
            onNavigateToWallet={() => setActiveTab('wallet')}
            onNavigateToDepositStore={() => setActiveTab('deposit-store')}
            onNavigateToPlans={() => setActiveTab('plans')}
            onNavigateToBots={() => setActiveTab('bots')}
            onNavigateToWebsites={() => setActiveTab('websites')}
            onNavigateToRewards={() => setActiveTab('rewards')}
            onDeployNewBot={handleDeployNewBot}
            onNavigateToSupport={() => setActiveTab('support')}
            onOpenAuthModal={openAuthModal}
            onOpenAdminModal={() => setShowAdminModal(true)}
            hasActivePlan={hasActivePlan}
            lang={lang}
            botsCount={bots.length}
            siteSettings={siteSettings}
          />
        )}

        {/* 3. Wallet & Deposit Page */}
        {activeTab === 'wallet' && (
          <StoreWalletPage
            user={currentUser}
            onOpenAuthModal={openAuthModal}
            onNavigateToPlans={() => setActiveTab('plans')}
            onNavigateToDepositStore={() => setActiveTab('deposit-store')}
            onUserUpdated={(u) => {
              setCurrentUser(u);
              checkAuth();
            }}
          />
        )}

        {/* 3.5. Dedicated Deposit Store Page */}
        {activeTab === 'deposit-store' && (
          <DepositStorePage
            user={currentUser}
            onOpenAuthModal={openAuthModal}
            onNavigateToPlans={() => setActiveTab('plans')}
            onUserUpdated={(u) => {
              setCurrentUser(u);
              checkAuth();
            }}
            lang={lang}
          />
        )}

        {/* 5. Support Center Page with Accordion FAQ */}
        {activeTab === 'support' && (
          <SupportCenterPage
            user={currentUser}
            onBack={() => setActiveTab('home')}
            onOpenAuthModal={openAuthModal}
            lang={lang}
            onNavigateToDeploy={handleDeployNewBot}
            onNavigateToPlans={() => setActiveTab('plans')}
            onNavigateToRewards={() => setActiveTab('rewards')}
          />
        )}

        {/* 6. Profile Page */}
        {activeTab === 'profile' && (
          <ProfilePage
            user={currentUser}
            onOpenAuthModal={openAuthModal}
            onNavigateToWallet={() => setActiveTab('wallet')}
            onNavigateToPlans={() => setActiveTab('plans')}
            onNavigateToBots={() => setActiveTab('bots')}
            onLogout={handleLogout}
            isAdmin={isAdmin}
            onOpenAdminModal={() => setShowAdminModal(true)}
            onUserUpdate={(u) => setCurrentUser(u)}
            lang={lang}
          />
        )}

        {/* 7. Hosting Plans Page */}
        {activeTab === 'plans' && (
          <PlansPage
            user={currentUser}
            onOpenAuthModal={openAuthModal}
            onNavigateToWallet={() => setActiveTab('wallet')}
            onPlanActivated={(updatedUser) => {
              setCurrentUser(updatedUser);
              fetchBots();
              setToastMessage(
                lang === 'bn'
                  ? '🎉 হোস্টিং প্লান সফলভাবে অ্যাক্টিভ হয়েছে! এখন আপনি নতুন বট ডিপ্লয় করতে পারবেন।'
                  : '🎉 Hosting plan activated! You can now deploy new bots.'
              );
            }}
            lang={lang}
            onNavigateToDeploy={handleDeployNewBot}
            onNavigateToSupport={() => setActiveTab('support')}
          />
        )}

        {/* 8. Bot List / Manager */}
        {activeTab === 'bots' && (
          <div className="space-y-4">
            <BotList
              bots={bots}
              selectedBotId={selectedBotId}
              onSelectBot={(id) => {
                setSelectedBotId(id);
                setActiveTab('terminal');
              }}
              onStartBot={handleStartBot}
              onStopBot={handleStopBot}
              onRestartBot={handleRestartBot}
              onDeleteBot={handleDeleteBot}
              onOpenNewBotModal={handleDeployNewBot}
              onOpenFileEditor={(botId) => {
                setSelectedBotId(botId);
                setSettingsInitialTab('files');
                setShowSettingsModal(true);
              }}
              onOpenSafeUpload={(bot) => {
                setSafeUploadBot(bot);
                setShowSafeUploadModal(true);
              }}
              onOpenDeployments={(botId) => {
                setSelectedBotId(botId);
                setSettingsInitialTab('deployments');
                setShowSettingsModal(true);
              }}
              hasActivePlan={hasActivePlan}
              onOpenPlans={() => setActiveTab('plans')}
              lang={lang}
              user={currentUser}
              onClaimFreeTrial={handleClaimFreeTrial}
            />
          </div>
        )}

        {/* 9. Live Console Terminal */}
        {activeTab === 'terminal' && (
          <LiveConsole
            logs={logs}
            onClear={handleClearLogs}
            lang={lang}
            botName={selectedBot?.name}
            botStatus={selectedBot?.status}
            onStart={() => selectedBot && handleStartBot(selectedBot.id)}
            onStop={() => selectedBot && handleStopBot(selectedBot.id)}
            onRestart={() => selectedBot && handleRestartBot(selectedBot.id)}
            loading={loading}
            onBackToBots={() => setActiveTab('bots')}
          />
        )}

        {/* 10. Static Website Hosting Page */}
        {activeTab === 'websites' && (
          <WebsitesPage
            user={currentUser}
            onOpenAuthModal={openAuthModal}
            onNavigateToPlans={() => setActiveTab('plans')}
            lang={lang}
          />
        )}

        {/* 11. Watch Ads & Earn USD Page */}
        {activeTab === 'rewards' && (
          <WatchAndEarnPage
            user={currentUser}
            onOpenAuthModal={openAuthModal}
            onNavigateToWallet={() => setActiveTab('wallet')}
            onNavigateToPlans={() => setActiveTab('plans')}
            onUserUpdated={(u) => setCurrentUser(u)}
            lang={lang}
          />
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNavBar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'deploy') {
            handleDeployNewBot();
          } else {
            setActiveTab(tab as any);
          }
        }}
        lang={lang}
        botsCount={bots.length}
        onDeployNewBot={handleDeployNewBot}
      />

      {/* Modals */}
      <AuthModal
        key={`auth-modal-${authModalKey}`}
        isOpen={showAuthModal}
        canDismiss={true}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          setShowAuthModal(false);
          setActiveTab('home');
          fetchBots();
          setToastMessage(
            lang === 'bn'
              ? `🎉 স্বাগতম, ${user.name}! সফলভাবে আপনার অ্যাকাউন্টে লগইন হয়েছেন।`
              : `🎉 Welcome, ${user.name}! Successfully signed in.`
          );
        }}
        lang={lang}
      />

      {showNewBotModal && (
        <NewBotModal
          onClose={() => {
            setShowNewBotModal(false);
            setTokenForDeploy(null);
          }}
          onCreated={(newBot) => {
            fetchBots();
            setSelectedBotId(newBot.id);
            setActiveTab('terminal');
            fetchLogs(newBot.id);
            setToastMessage(
              lang === 'bn'
                ? `'${newBot.name}' সফলভাবে ডিপ্লয় করা হয়েছে এবং লাইভ চলছে!`
                : `'${newBot.name}' hosted successfully and is now running 24/7!`
            );
            setShowNewBotModal(false);
            setTokenForDeploy(null);
          }}
          lang={lang}
          initialToken={tokenForDeploy?.token || ''}
          initialName={tokenForDeploy?.botName || ''}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          lang={lang}
          currentUser={currentUser}
          bots={bots}
          selectedBotId={selectedBotId}
          onSelectBot={(id) => setSelectedBotId(id)}
          onBotsUpdated={() => fetchBots()}
          onTestToken={() => setShowTokenCheckModal(true)}
          onUserUpdated={(u) => setCurrentUser(u)}
          initialTab={settingsInitialTab}
          soundAlertEnabled={soundAlertEnabled}
          onToggleSoundAlert={handleToggleSoundAlert}
        />
      )}

      <TokenCheckModal
        isOpen={showTokenCheckModal}
        onClose={() => setShowTokenCheckModal(false)}
        lang={lang}
        onDeployWithToken={(token, botName) => {
          setTokenForDeploy({ token, botName });
          setShowTokenCheckModal(false);
          setShowNewBotModal(true);
        }}
      />

      {showSafeUploadModal && safeUploadBot && (
        <SafeUploadModal
          isOpen={showSafeUploadModal}
          onClose={() => {
            setShowSafeUploadModal(false);
            setSafeUploadBot(null);
          }}
          bot={safeUploadBot}
          onSuccess={() => {
            fetchBots();
            setToastMessage(
              lang === 'bn'
                ? `'${safeUploadBot.name}' এর ফাইল সফলভাবে আপডেট হয়েছে এবং ব্যালেন্স অক্ষত আছে!`
                : `'${safeUploadBot.name}' files safely updated and balances preserved!`
            );
          }}
          lang={lang}
        />
      )}

      {showAdminModal && (
        <AdminPanelModal
          isOpen={showAdminModal}
          onClose={() => setShowAdminModal(false)}
          currentUser={currentUser}
          lang={lang}
          onBotAction={() => fetchBots()}
          onPlansUpdated={() => {
            window.dispatchEvent(new CustomEvent('plans-updated'));
          }}
        />
      )}

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <NotificationsModal
          isOpen={showNotificationsModal}
          onClose={() => setShowNotificationsModal(false)}
          currentUser={currentUser}
          lang={lang}
        />
      )}
    </div>
  );
}
