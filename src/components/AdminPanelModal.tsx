import React, { useState, useEffect, useRef } from 'react';
import {
  X, ShieldCheck, Users, CheckCircle2, XCircle, Clock, Search,
  RefreshCw, Bot, CreditCard, DollarSign, Settings, AlertTriangle,
  Play, Square, RotateCw, Trash2, Check, Copy, ExternalLink, ShieldAlert,
  Plus, Wallet, ArrowRight, Link, Sparkles, Headphones, BellRing,
  ArrowUp, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, BarChart3, Layers, Sliders,
  Upload, Image as ImageIcon, Loader2
} from 'lucide-react';
import { PlanRequest, AuthUser, HostedBot, PaymentSettings, HostingPlan, FreeTrialSettings, CustomDepositMethod } from '../types';
import { AdminBannersManager } from './admin/AdminBannersManager';
import { AdminSupportManager } from './admin/AdminSupportManager';
import { AdminNoticesManager } from './admin/AdminNoticesManager';
import { AdminSiteSettingsManager } from './admin/AdminSiteSettingsManager';
import { AdminSmtpManager } from './admin/AdminSmtpManager';
import { AdminAdsManager } from './admin/AdminAdsManager';
import { AdminWebsitesManager } from './admin/AdminWebsitesManager';
import { Mail, Film, Globe } from 'lucide-react';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  lang: 'bn' | 'en';
  onBotAction?: () => void;
  onPlansUpdated?: () => void;
}

export type AdminTabType = 'requests' | 'users' | 'pricing' | 'banners' | 'notices' | 'support' | 'payments' | 'bots' | 'site' | 'websites' | 'ads' | 'smtp';

export const PAYMENT_ICON_PRESETS = [
  {
    id: 'bkash',
    name: 'bKash (বিকাশ)',
    suggestedName: 'bKash (বিকাশ) Personal',
    color: '#E2136E',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%23E2136E"/><polygon points="50,15 85,38 72,65 50,45" fill="white" opacity="0.95"/><polygon points="15,48 50,15 50,45 32,68" fill="white" opacity="0.9"/><polygon points="50,45 72,65 50,85" fill="white" opacity="0.8"/><polygon points="32,68 50,45 50,85" fill="white" opacity="0.75"/><polygon points="50,15 62,5 72,25" fill="white" opacity="0.95"/></svg>'
  },
  {
    id: 'nagad',
    name: 'Nagad (নগদ)',
    suggestedName: 'Nagad (নগদ) Personal',
    color: '#F15A24',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%23F15A24"/><path d="M50 10C36 28 28 44 28 60C28 75 39 88 54 88C69 88 80 75 75 56C73 46 64 39 64 39C64 39 68 47 64 56C60 64 49 65 45 56C41 46 47 35 50 10Z" fill="white"/><circle cx="53" cy="62" r="7" fill="%23F7931E" opacity="0.9"/></svg>'
  },
  {
    id: 'upay',
    name: 'Upay (উপায়)',
    suggestedName: 'Upay (উপায়) Personal',
    color: '#0B549E',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%230B549E"/><text x="50" y="62" font-family="sans-serif" font-size="34" font-weight="900" fill="%23FFD100" text-anchor="middle">upay</text></svg>'
  },
  {
    id: 'rocket',
    name: 'Rocket (রকেট)',
    suggestedName: 'DBBL Rocket (রকেট)',
    color: '#8C3494',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%238C3494"/><polygon points="50,15 65,55 50,48 35,55" fill="white"/><polygon points="50,48 60,75 50,68 40,75" fill="%23FFD100"/><circle cx="50" cy="35" r="5" fill="%238C3494"/></svg>'
  },
  {
    id: 'binance',
    name: 'Binance Pay',
    suggestedName: 'Binance Pay / USDT',
    color: '#F3BA2F',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%23F3BA2F"/><polygon points="50,16 62,28 50,40 38,28" fill="%231E2329"/><polygon points="76,40 88,52 76,64 64,52" fill="%231E2329"/><polygon points="24,40 36,52 24,64 12,52" fill="%231E2329"/><polygon points="50,64 62,76 50,88 38,76" fill="%231E2329"/><polygon points="50,46 56,52 50,58 44,52" fill="%231E2329"/></svg>'
  },
  {
    id: 'bank',
    name: 'Bank / Card',
    suggestedName: 'Bank Transfer / Card',
    color: '#3B82F6',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%230F172A"/><rect x="18" y="28" width="64" height="44" rx="8" fill="%233B82F6"/><rect x="18" y="38" width="64" height="10" fill="%231E293B"/><circle cx="32" cy="58" r="5" fill="%23EF4444"/><circle cx="40" cy="58" r="5" fill="%23F59E0B" fill-opacity="0.8"/></svg>'
  },
  {
    id: 'cash',
    name: 'Cash / Agent',
    suggestedName: 'Cash / Agent Pay',
    color: '#10B981',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%23059669"/><rect x="22" y="30" width="56" height="40" rx="6" fill="%2310B981" stroke="white" stroke-width="2"/><circle cx="50" cy="50" r="12" fill="white" fill-opacity="0.25"/><text x="50" y="56" font-family="sans-serif" font-size="20" font-weight="900" fill="white" text-anchor="middle">৳</text></svg>'
  }
];

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  lang,
  onBotAction,
  onPlansUpdated
}) => {
  const [activeTab, setActiveTab] = useState<AdminTabType>('requests');
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<{
    totalUsers: number;
    totalBots: number;
    runningBots: number;
    pendingRequestsCount: number;
    approvedRequestsCount: number;
    totalRevenueUsd?: number;
    totalRevenueBdt?: number;
  } | null>(null);

  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<HostingPlan[]>([]);
  const [allBots, setAllBots] = useState<HostedBot[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    bkashNumber: '',
    nagadNumber: '',
    binanceId: '',
    binanceUid: '',
    binancePayId: '',
    binancePayApiEnabled: true,
    binancePayApiKey: '',
    binancePaySecretKey: '',
    binancePayMerchantId: '',
    instructionsBn: '',
    instructionsEn: ''
  });

  const [uploadingQrField, setUploadingQrField] = useState<string | null>(null);

  const handleUploadPaymentImage = async (file: File, fieldKey: string, callback: (url: string) => void) => {
    if (!file.type.startsWith('image/')) {
      setNotification({ type: 'error', message: 'শুধুমাত্র ইমেজ ফাইল আপলোড করা যাবে।' });
      return;
    }
    try {
      setUploadingQrField(fieldKey);
      const token = localStorage.getItem('bot_auth_token');
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await fetch('/api/admin/upload-file', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              fileName: file.name,
              fileData: base64Data,
              fileType: 'payment_qr'
            })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            callback(data.url);
            setNotification({ type: 'success', message: 'পেমেন্ট মেথড ছবি/কিউআর সফলভাবে আপলোড হয়েছে!' });
          } else {
            setNotification({ type: 'error', message: data.error || 'আপলোড ব্যর্থ হয়েছে।' });
          }
        } catch (err: any) {
          setNotification({ type: 'error', message: err.message || 'আপলোড এরর' });
        } finally {
          setUploadingQrField(null);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'আপলোড এরর' });
      setUploadingQrField(null);
    }
  };

  // Add Plan Form State (support string typing so zero can be deleted cleanly)
  const [showAddPlanForm, setShowAddPlanForm] = useState(false);
  const [newPlanData, setNewPlanData] = useState<{
    id: string;
    nameBn: string;
    nameEn: string;
    durationDays: string | number;
    maxBots: string | number;
    priceBdt: string | number;
    priceUsd: string | number;
    popular: boolean;
    featuresBn: string;
    featuresEn: string;
  }>({
    id: '',
    nameBn: '',
    nameEn: '',
    durationDays: '30',
    maxBots: '3',
    priceBdt: '240',
    priceUsd: '2.0',
    popular: false,
    featuresBn: '২৪/৭ সার্বক্ষণিক লাইভ বট\nস্বয়ংক্রিয় ক্র্যাশ রিস্টার্ট\nলাইভ কনসোল ও লগস',
    featuresEn: '24/7 Priority Bot Uptime\nAuto Crash Recovery\nLive Console & Logs'
  });

  // Free Trial Management State
  const [freeTrialSettings, setFreeTrialSettings] = useState<FreeTrialSettings>({
    enabled: true,
    durationDays: 30,
    maxBots: 1,
    nameBn: '১ মাস ফ্রি ট্রায়াল',
    nameEn: '1 Month Free Trial',
    featuresBn: [
      '১টি টেলিগ্রাম বট ২৪/৭ সার্বক্ষণিক লাইভ হোস্টিং',
      '১ মাস (৩০ দিন) সম্পূর্ণ ফ্রি অ্যাক্সেস',
      'অটো-রিস্টার্ট ও ক্র্যাশ প্রোটেকশন',
      'লাইভ কনসোল ও রিয়েল-টাইম লগস',
      'ফাইল এডিটর ও ডাটাবেজ ব্যাকআপ'
    ],
    featuresEn: [
      '1 Telegram Bot 24/7 Live Hosting',
      '1 Month (30 Days) Completely Free Access',
      'Auto-Restart & Crash Protection',
      'Live Console & Real-time Logs',
      'File Editor & Database Backup'
    ]
  });
  const [freeTrialBnFeatures, setFreeTrialBnFeatures] = useState('');
  const [freeTrialEnFeatures, setFreeTrialEnFeatures] = useState('');
  const [savingFreeTrial, setSavingFreeTrial] = useState(false);
  const [freeTrialMsg, setFreeTrialMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const adminDirectUrl = `${window.location.origin}/?admin=true`;

  // UI, Scrolling and Viewport state
  const [showStatsExpanded, setShowStatsExpanded] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const tabsNavRef = useRef<HTMLDivElement | null>(null);
  const tabButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const scrollToTop = () => {
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectTab = (tabId: AdminTabType) => {
    setActiveTab(tabId);
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setTimeout(() => {
      tabButtonRefs.current[tabId]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }, 50);
  };

  const scrollTabsNav = (direction: 'left' | 'right') => {
    if (tabsNavRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      tabsNavRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  useEffect(() => {
    if (isOpen) {
      loadAllAdminData();
    }
  }, [isOpen]);

  const loadAllAdminData = async () => {
    setLoading(true);
    const token = localStorage.getItem('bot_auth_token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // 1. Overview
      const ovRes = await fetch('/api/admin/overview', { headers });
      if (ovRes.ok) {
        const ovData = await ovRes.json();
        setOverview(ovData);
      }

      // 2. Plan requests
      const reqRes = await fetch('/api/admin/plan-requests', { headers });
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setRequests(reqData.requests || []);
      }

      // 3. Users
      const uRes = await fetch('/api/admin/users', { headers });
      if (uRes.ok) {
        const uData = await uRes.json();
        setUsers(uData.users || []);
      }

      // 4. Payment settings
      const payRes = await fetch('/api/admin/payment-settings', { headers });
      if (payRes.ok) {
        const payData = await payRes.json();
        if (payData.settings) setPaymentSettings(payData.settings);
      } else {
        const fallbackRes = await fetch('/api/payment-settings');
        if (fallbackRes.ok) {
          const payData = await fallbackRes.json();
          if (payData.settings) setPaymentSettings(payData.settings);
        }
      }

      // 5. Bots
      const bRes = await fetch('/api/admin/all-bots', { headers });
      if (bRes.ok) {
        const bData = await bRes.json();
        setAllBots(bData.bots || []);
      }

      // 6. Hosting Plans & Free Trial
      const plRes = await fetch('/api/plans');
      if (plRes.ok) {
        const plData = await plRes.json();
        setPlans(plData.plans || []);
        if (plData.freeTrial) {
          setFreeTrialSettings(plData.freeTrial);
          setFreeTrialBnFeatures(Array.isArray(plData.freeTrial.featuresBn) ? plData.freeTrial.featuresBn.join('\n') : '');
          setFreeTrialEnFeatures(Array.isArray(plData.freeTrial.featuresEn) ? plData.freeTrial.featuresEn.join('\n') : '');
        }
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error loading admin data' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApproveRequest = async (requestId: string) => {
    setActionLoadingId(requestId);
    const token = localStorage.getItem('bot_auth_token');
    try {
      const res = await fetch(`/api/admin/plan-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Approval failed');
      }
      setNotification({
        type: 'success',
        message: 'অনুরোধ সফলভাবে অনুমোদন করা হয়েছে (Approved successfully) এবং ইউজারের একাউন্টে ব্যালেন্স/প্ল্যান যুক্ত হয়েছে!'
      });
      loadAllAdminData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const reason = window.prompt('বাতিলের কারণ লিখুন (Reason for rejection):', 'ভুয়া বা অননুমোদিত TrxID');
    if (reason === null) return;

    setActionLoadingId(requestId);
    const token = localStorage.getItem('bot_auth_token');
    try {
      const res = await fetch(`/api/admin/plan-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Rejection failed');
      }
      setNotification({ type: 'success', message: 'অনুরোধ বাতিল করা হয়েছে (Request rejected).' });
      loadAllAdminData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoadingId('save_payments');
    const token = localStorage.getItem('bot_auth_token');
    try {
      const res = await fetch('/api/admin/payment-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(paymentSettings)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save settings');
      setNotification({ type: 'success', message: 'পেমেন্ট সেটিংস সফলভাবে সংরক্ষিত হয়েছে!' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSavePlans = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoadingId('save_plans');
    const token = localStorage.getItem('bot_auth_token');
    try {
      const sanitizedPlans = plans.map((p) => ({
        ...p,
        priceUsd: parseFloat(String(p.priceUsd)) || 0,
        priceBdt: parseFloat(String(p.priceBdt)) || Math.round((parseFloat(String(p.priceUsd)) || 0) * 120),
        maxBots: parseInt(String(p.maxBots), 10) || 1,
        durationDays: parseInt(String(p.durationDays), 10) || 30
      }));

      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plans: sanitizedPlans })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save plans');
      setNotification({ type: 'success', message: 'প্লান ও প্রাইসিং সফলভাবে সংরক্ষিত ও সাইটে আপডেট হয়েছে!' });
      loadAllAdminData();
      window.dispatchEvent(new CustomEvent('plans-updated', { detail: sanitizedPlans }));
      if (onPlansUpdated) onPlansUpdated();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAddNewPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoadingId('add_new_plan');
    const token = localStorage.getItem('bot_auth_token');
    try {
      const priceUsdNum = parseFloat(String(newPlanData.priceUsd)) || 0;
      const priceBdtNum = parseFloat(String(newPlanData.priceBdt)) || Math.round(priceUsdNum * 120);
      const durationNum = parseInt(String(newPlanData.durationDays), 10) || 30;
      const maxBotsNum = parseInt(String(newPlanData.maxBots), 10) || 1;
      const cleanId = (
        newPlanData.id.trim() ||
        newPlanData.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '') ||
        `plan_${Date.now()}`
      ).trim();

      const payload = {
        ...newPlanData,
        id: cleanId,
        priceUsd: priceUsdNum,
        priceBdt: priceBdtNum,
        durationDays: durationNum,
        maxBots: maxBotsNum
      };

      const res = await fetch('/api/admin/plans/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'প্যাকেজ যোগ করতে ব্যর্থ');
      
      setNotification({ type: 'success', message: '🎉 নতুন হোস্টিং প্যাকেজ সফলভাবে যোগ ও সাইটে আপডেট হয়েছে!' });
      setShowAddPlanForm(false);
      setNewPlanData({
        id: '',
        nameBn: '',
        nameEn: '',
        durationDays: '30',
        maxBots: '3',
        priceBdt: '240',
        priceUsd: '2.0',
        popular: false,
        featuresBn: '২৪/৭ সার্বক্ষণিক লাইভ বট\nস্বয়ংক্রিয় ক্র্যাশ রিস্টার্ট\nলাইভ কনসোল ও লগস',
        featuresEn: '24/7 Priority Bot Uptime\nAuto Crash Recovery\nLive Console & Logs'
      });
      loadAllAdminData();
      window.dispatchEvent(new CustomEvent('plans-updated', { detail: data.plans || data.plan }));
      if (onPlansUpdated) onPlansUpdated();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (planId === 'free') {
      alert('ফ্রি প্যাকেজ ডিলিট করা যাবে না।');
      return;
    }
    if (!confirm(`আপনি কি নিশ্চিত যে এই প্যাকেজটি (${planId}) ডিলিট করতে চান?`)) return;

    setActionLoadingId(`del_${planId}`);
    const token = localStorage.getItem('bot_auth_token');
    try {
      const res = await fetch(`/api/admin/plans/${planId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'ডিলিট করতে ব্যর্থ');
      setNotification({ type: 'success', message: 'প্যাকেজ ডিলিট করা হয়েছে এবং সাইট থেকে মুছে দেওয়া হয়েছে।' });
      loadAllAdminData();
      window.dispatchEvent(new CustomEvent('plans-updated', { detail: data.plans }));
      if (onPlansUpdated) onPlansUpdated();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUserPlanUpdate = async (userId: string, plan: string, durationDays: number, maxBots: number, role: string) => {
    const token = localStorage.getItem('bot_auth_token');
    try {
      const res = await fetch(`/api/admin/users/${userId}/update-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan, durationDays, maxBots, role })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Update failed');
      setNotification({ type: 'success', message: 'ইউজার প্লান সফলভাবে আপডেট করা হয়েছে!' });
      loadAllAdminData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  const handleSaveFreeTrialSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFreeTrial(true);
    setFreeTrialMsg(null);
    const token = localStorage.getItem('bot_auth_token');
    try {
      const payload = {
        ...freeTrialSettings,
        durationDays: Number(freeTrialSettings.durationDays) || 30,
        maxBots: Number(freeTrialSettings.maxBots) || 1,
        featuresBn: freeTrialBnFeatures.split('\n').map(s => s.trim()).filter(Boolean),
        featuresEn: freeTrialEnFeatures.split('\n').map(s => s.trim()).filter(Boolean)
      };
      const res = await fetch('/api/admin/free-trial/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save free trial settings');
      }
      setFreeTrialMsg(data.message || 'ফ্রি ট্রায়াল সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
      if (data.settings) {
        setFreeTrialSettings(data.settings);
      }
      setNotification({ type: 'success', message: 'ফ্রি ট্রায়াল সেটিংস সফলভাবে আপডেট করা হয়েছে!' });
      if (onPlansUpdated) onPlansUpdated();
    } catch (err: any) {
      setFreeTrialMsg('ত্রুটি: ' + (err.message || 'সেভ করা সম্ভব হয়নি'));
      setNotification({ type: 'error', message: err.message || 'Failed to save free trial settings' });
    } finally {
      setSavingFreeTrial(false);
    }
  };

  const handleGrantFreeTrialUser = async (userId: string) => {
    const token = localStorage.getItem('bot_auth_token');
    setActionLoadingId('grant_' + userId);
    try {
      const res = await fetch('/api/admin/free-trial/grant-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to grant trial');
      setNotification({ type: 'success', message: data.message || '১ মাসের ফ্রি প্ল্যান দেওয়া হয়েছে!' });
      loadAllAdminData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error granting free trial' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResetFreeTrialUser = async (userId: string) => {
    const token = localStorage.getItem('bot_auth_token');
    setActionLoadingId('reset_' + userId);
    try {
      const res = await fetch('/api/admin/free-trial/reset-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset trial');
      setNotification({ type: 'success', message: data.message || 'ফ্রি ট্রায়াল স্ট্যাটাস রিসেট করা হয়েছে!' });
      loadAllAdminData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error resetting free trial' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.userName?.toLowerCase().includes(q) ||
      r.userEmail?.toLowerCase().includes(q) ||
      r.senderNumber?.includes(q) ||
      r.transactionId?.toLowerCase().includes(q) ||
      (r.type && r.type.includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-start sm:justify-center p-0 sm:p-4 bg-[#030712]/95 backdrop-blur-md animate-in fade-in duration-200 pt-[max(0.35rem,env(safe-area-inset-top))] pb-[max(0.35rem,env(safe-area-inset-bottom))]">
      <div className="bg-[#0b1120] border-0 sm:border border-[#1e2e48] shadow-2xl rounded-none sm:rounded-3xl max-w-6xl w-full p-2.5 sm:p-5 text-white relative h-full sm:h-[95vh] max-h-[100dvh] sm:max-h-[95vh] flex flex-col overflow-hidden">
        
        {/* Pinned Responsive Header (shrink-0) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1f2c42] pb-2 sm:pb-2.5 mb-2 shrink-0 pt-0.5 sm:pt-0">
          <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/10 shrink-0">
                <ShieldCheck className="w-4.5 h-4.5 sm:w-6 sm:h-6 shrink-0" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-base lg:text-lg font-bold text-white flex items-center gap-1.5 flex-wrap truncate">
                  <span className="truncate">{lang === 'bn' ? 'এডমিন কন্ট্রোল প্যানেল' : 'Admin Control Panel'}</span>
                  <span className="text-[8px] sm:text-[10px] uppercase font-black px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                    {lang === 'bn' ? 'এডমিন মোড' : 'Admin'}
                  </span>
                </h3>
                <p className="text-[9px] sm:text-xs text-slate-400 truncate max-w-[200px] sm:max-w-none">
                  {lang === 'bn'
                    ? 'অনুমোদন, প্যাকেজ, ব্যানার, নোটিশ ও ইউজার কন্ট্রোল'
                    : 'Approve deposits, manage packages, banners & users'}
                </p>
              </div>
            </div>

            {/* Mobile close button at top right for quick thumb access */}
            <button
              onClick={onClose}
              className="sm:hidden h-8 w-8 rounded-lg bg-[#121d30] hover:bg-rose-900/50 border border-[#223554] hover:border-rose-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4 shrink-0" />
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 bg-[#09101d] p-1 rounded-xl border border-[#1d2d47] w-full sm:w-auto">
            {/* Direct URL Copy Button */}
            <button
              type="button"
              onClick={() => handleCopy(adminDirectUrl, 'admin_url')}
              title={adminDirectUrl}
              className="flex-1 sm:flex-initial h-8 px-2 sm:px-2.5 rounded-lg bg-[#121d30] hover:bg-[#0088cc]/20 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer border border-[#223554] transition-all shrink-0"
            >
              {copiedId === 'admin_url' ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
              <span className="text-[11px] sm:text-xs">{copiedId === 'admin_url' ? 'কপি হয়েছে' : 'এডমিন লিংক'}</span>
            </button>

            {/* Overview Stats Toggle */}
            <button
              type="button"
              onClick={() => setShowStatsExpanded(!showStatsExpanded)}
              className={`flex-1 sm:flex-initial h-8 px-2 sm:px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer border transition-all shrink-0 ${
                showStatsExpanded
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-[#121d30] border-[#223554] text-slate-300 hover:text-white hover:bg-[#192740]'
              }`}
              title="পরিসংখ্যান দেখুন / লুকান"
            >
              <BarChart3 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[11px] sm:text-xs">পরিসংখ্যান</span>
              {showStatsExpanded ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />}
            </button>

            {/* Reload Data Button */}
            <button
              onClick={loadAllAdminData}
              title={lang === 'bn' ? 'ডাটা রিফ্রেশ করুন' : 'Refresh Data'}
              className="h-8 w-8 rounded-lg bg-[#121d30] hover:bg-[#192740] border border-[#223554] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${loading ? 'animate-spin text-[#0088cc]' : ''}`} />
            </button>

            {/* Close Button on Desktop / Tablet */}
            <button
              onClick={onClose}
              className="hidden sm:flex h-8 w-8 rounded-lg bg-[#121d30] hover:bg-rose-900/50 border border-[#223554] hover:border-rose-700 text-slate-300 hover:text-white items-center justify-center transition-colors cursor-pointer shrink-0"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>

        {/* Collapsible Overview Stats (shrink-0) */}
        {overview && (
          <div className="shrink-0 mb-2.5">
            {showStatsExpanded ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 p-2.5 rounded-2xl bg-[#080e1a] border border-[#1e2d48] animate-in fade-in duration-150">
                <div className="p-2 sm:p-2.5 rounded-xl bg-[#0e1726] border border-[#1f2e46]">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{lang === 'bn' ? 'মোট ইউজার' : 'Total Users'}</p>
                  <p className="text-sm sm:text-base font-black text-white mt-0.5">{overview.totalUsers}</p>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-[#0e1726] border border-[#1f2e46]">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{lang === 'bn' ? 'লাইভ বট' : 'Live Bots'}</p>
                  <p className="text-sm sm:text-base font-black text-emerald-400 mt-0.5">{overview.runningBots} / {overview.totalBots}</p>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-[#0e1726] border border-[#1f2e46]">
                  <p className="text-[10px] font-bold text-amber-400 uppercase">{lang === 'bn' ? 'অপেক্ষমান রিকোয়েস্ট' : 'Pending Requests'}</p>
                  <p className="text-sm sm:text-base font-black text-amber-300 mt-0.5">{overview.pendingRequestsCount}</p>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-[#0e1726] border border-[#1f2e46]">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase">{lang === 'bn' ? 'অনুমোদিত' : 'Approved'}</p>
                  <p className="text-sm sm:text-base font-black text-emerald-300 mt-0.5">{overview.approvedRequestsCount}</p>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-[#0e1726] border border-[#1f2e46] col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase">{lang === 'bn' ? 'মোট আয়' : 'Revenue'}</p>
                  <p className="text-sm sm:text-base font-black text-emerald-300 mt-0.5">${Number(overview.totalRevenueUsd ?? overview.totalRevenueBdt ?? 0).toFixed(2)} USDT</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#080e1a] border border-[#1e2d48] text-[11px] text-slate-300">
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                  <span>👥 ইউজার: <strong className="text-white">{overview.totalUsers}</strong></span>
                  <span>🤖 লাইভ বট: <strong className="text-emerald-400">{overview.runningBots}</strong>/{overview.totalBots}</span>
                  <span>⏰ পেন্ডিং: <strong className={overview.pendingRequestsCount > 0 ? 'text-amber-400 font-black' : 'text-slate-400'}>{overview.pendingRequestsCount}</strong></span>
                  <span className="hidden sm:inline">💰 মোট আয়: <strong className="text-emerald-400 font-bold">${Number(overview.totalRevenueUsd ?? overview.totalRevenueBdt ?? 0).toFixed(2)} USDT</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStatsExpanded(true)}
                  className="text-amber-400 hover:text-amber-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                >
                  <span>পূর্ণ ভিউ</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Notification Toast */}
        {notification && (
          <div className={`p-2.5 rounded-xl mb-2 text-xs flex items-center justify-between gap-2 shrink-0 animate-in fade-in ${
            notification.type === 'success' ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300' : 'bg-rose-950/60 border border-rose-500/50 text-rose-300'
          }`}>
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="cursor-pointer text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Unified Tabs Navigation Bar (Fixed / shrink-0) */}
        <div className="shrink-0 mb-3 bg-[#080e1a] p-1.5 rounded-2xl border border-[#182740]">
          <div className="relative flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollTabsNav('left')}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#0f192b] hover:bg-[#18263f] border border-[#1f304d] text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 shadow-sm"
              title={lang === 'bn' ? 'বামে স্ক্রোল করুন' : 'Scroll left'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div
              ref={tabsNavRef}
              className="flex items-center gap-1.5 overflow-x-auto py-0.5 scroll-smooth no-scrollbar flex-1"
            >
              {[
                { id: 'requests' as AdminTabType, labelBn: 'অনুরোধ ও ডিপোজিট', labelEn: 'Requests & Deposits', icon: Clock, iconColor: 'text-sky-400', badge: overview?.pendingRequestsCount },
                { id: 'users' as AdminTabType, labelBn: 'ইউজার ও ওয়ালেট', labelEn: 'Users & Wallets', icon: Users, iconColor: 'text-indigo-400' },
                { id: 'pricing' as AdminTabType, labelBn: 'প্যাকেজ ও প্রাইসিং', labelEn: 'Packages & Pricing', icon: DollarSign, iconColor: 'text-amber-400' },
                { id: 'banners' as AdminTabType, labelBn: 'ব্যানার স্লাইডার', labelEn: 'Banners', icon: Sparkles, iconColor: 'text-pink-400' },
                { id: 'notices' as AdminTabType, labelBn: 'জরুরি নোটিশ', labelEn: 'Notices', icon: BellRing, iconColor: 'text-teal-400' },
                { id: 'support' as AdminTabType, labelBn: 'সাপোর্ট ইনবক্স', labelEn: 'Support Inbox', icon: Headphones, iconColor: 'text-cyan-400' },
                { id: 'payments' as AdminTabType, labelBn: 'পেমেন্ট নাম্বার', labelEn: 'Payment Numbers', icon: CreditCard, iconColor: 'text-purple-400' },
                { id: 'bots' as AdminTabType, labelBn: 'সকল বট নিয়ন্ত্রণ', labelEn: 'All Bots Control', icon: Bot, iconColor: 'text-blue-400' },
                { id: 'websites' as AdminTabType, labelBn: 'ওয়েবসাইট হোস্টিং', labelEn: 'Hosted Websites', icon: Globe, iconColor: 'text-cyan-400' },
                { id: 'ads' as AdminTabType, labelBn: 'ভিডিও অ্যাড সেটিংস', labelEn: 'Rewarded Ads', icon: Film, iconColor: 'text-pink-400' },
                { id: 'smtp' as AdminTabType, labelBn: 'SMTP ইমেইল কনফিগ', labelEn: 'SMTP Config', icon: Mail, iconColor: 'text-emerald-400' },
                { id: 'site' as AdminTabType, labelBn: 'সাইট লোগো ও নাম', labelEn: 'Site Logo & Branding', icon: Sliders, iconColor: 'text-amber-400' },
              ].map((tab) => {
                const IconComp = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    ref={(el) => (tabButtonRefs.current[tab.id] = el)}
                    onClick={() => handleSelectTab(tab.id)}
                    className={`min-h-[38px] px-3.5 sm:px-4 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 border ${
                      isActive
                        ? 'bg-gradient-to-r from-[#0088cc] to-[#0072ad] border-sky-400 text-white shadow-md shadow-[#0088cc]/25'
                        : 'bg-[#0e1728] border-[#1b2b45] text-slate-300 hover:text-white hover:bg-[#15233c] hover:border-slate-600'
                    }`}
                  >
                    <IconComp className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : tab.iconColor}`} />
                    <span className="shrink-0">{lang === 'bn' ? tab.labelBn : tab.labelEn}</span>
                    {typeof tab.badge === 'number' && tab.badge > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black animate-pulse leading-none shadow-sm shrink-0">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => scrollTabsNav('right')}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#0f192b] hover:bg-[#18263f] border border-[#1f304d] text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 shadow-sm"
              title={lang === 'bn' ? 'ডানে স্ক্রোল করুন' : 'Scroll right'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MASTER SCROLLABLE CONTENT VIEWPORT (flex-1 min-h-0 overflow-y-auto) */}
        <div
          ref={contentScrollRef}
          onScroll={(e) => {
            const target = e.currentTarget;
            setShowBackToTop(target.scrollTop > 180);
          }}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 sm:pr-2 pb-24 space-y-4 focus:outline-none custom-scrollbar"
          tabIndex={0}
        >
          {/* Tab 1: Requests & Deposits Queue */}
          {activeTab === 'requests' && (
            <div className="space-y-3 pr-1">
            {/* Filter & Search */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#09101d] p-2 rounded-2xl border border-[#1a2942]">
              <div className="flex items-center gap-1 bg-[#060b14] p-1 rounded-xl border border-[#16243b]">
                {(['pending', 'approved', 'rejected', 'all'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`h-7 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterStatus === st
                        ? 'bg-[#0088cc] text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-[#121c2e]'
                    }`}
                  >
                    {st === 'pending' ? (lang === 'bn' ? 'অপেক্ষমান' : 'Pending') :
                     st === 'approved' ? (lang === 'bn' ? 'অনুমোদিত' : 'Approved') :
                     st === 'rejected' ? (lang === 'bn' ? 'বাতিল' : 'Rejected') : (lang === 'bn' ? 'সবগুলো' : 'All')}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'bn' ? 'নাম, TrxID বা নাম্বার খুঁজুন...' : 'Search Name, TrxID, Phone...'}
                  className="bg-[#060b14] border border-[#16243b] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0088cc]"
                />
              </div>
            </div>

            {/* Requests Cards */}
            {filteredRequests.length === 0 ? (
              <div className="p-8 text-center bg-[#0d1524] border border-[#1f2d48] rounded-2xl">
                <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">
                  {lang === 'bn' ? 'কোনো অনুরোধ পাওয়া যায়নি।' : 'No requests found.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredRequests.map((req) => {
                  const isDeposit = req.type === 'deposit';

                  return (
                    <div
                      key={req.id}
                      className="p-3.5 sm:p-4 rounded-2xl bg-[#0d1524] border border-[#1f2d48] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 text-xs hover:border-slate-600 transition-colors"
                    >
                      <div className="space-y-1.5 max-w-xl w-full">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            isDeposit ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}>
                            {isDeposit ? '💰 ওয়ালেট ডিপোজিট' : '📦 প্যাকেজ সাবস্ক্রিপশন'}
                          </span>
                          <span className="font-bold text-white text-sm">{req.userName}</span>
                          <span className="text-slate-400 text-[11px]">({req.userEmail})</span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-[#0088cc]/20 text-[#0088cc] font-bold text-[11px]">
                            {req.planName}
                          </span>
                          <span className="font-black text-emerald-400 text-sm">
                            ${req.amount} USDT
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-bold text-[10px]">
                            {req.method}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-300 flex-wrap">
                          <span>প্রেরক: <strong className="font-mono text-white">{req.senderNumber || req.senderIdentifier}</strong></span>
                          <span className="flex items-center gap-1">
                            TrxID: <strong className="font-mono text-pink-400">{req.transactionId}</strong>
                            <button
                              type="button"
                              onClick={() => handleCopy(req.transactionId, req.id)}
                              className="p-1 hover:text-white cursor-pointer"
                            >
                              {copiedId === req.id ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                            </button>
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-500">
                          তারিখ: {new Date(req.createdAt).toLocaleString('bn-BD')} {req.note ? `• নোট: ${req.note}` : ''}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto pt-2.5 sm:pt-0 border-t sm:border-t-0 border-[#1f2d48]">
                        {req.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleApproveRequest(req.id)}
                              disabled={actionLoadingId === req.id}
                              className="flex-1 sm:flex-initial min-h-[38px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer disabled:opacity-50 transition-all shrink-0"
                            >
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                              <span>{isDeposit ? (lang === 'bn' ? 'ডিপোজিট অনুমোদন করুন' : 'Approve Deposit') : (lang === 'bn' ? 'প্লান অনুমোদন করুন' : 'Approve Plan')}</span>
                            </button>

                            <button
                              onClick={() => handleRejectRequest(req.id)}
                              disabled={actionLoadingId === req.id}
                              className="min-h-[38px] px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 transition-all shrink-0"
                            >
                              <XCircle className="w-4 h-4 shrink-0" />
                              <span>{lang === 'bn' ? 'বাতিল' : 'Reject'}</span>
                            </button>
                          </>
                        ) : req.status === 'approved' ? (
                          <div className="w-full sm:w-auto px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 shrink-0">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>{lang === 'bn' ? 'অনুমোদিত (Approved)' : 'Approved'}</span>
                          </div>
                        ) : (
                          <div className="w-full sm:w-auto px-3 py-2 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-400 text-xs font-semibold text-center shrink-0">
                            {lang === 'bn' ? 'বাতিলকৃত' : 'Rejected'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Users & Wallets */}
        {activeTab === 'users' && (
          <div className="space-y-2.5 pr-1">
            {users.map((u) => (
              <div
                key={u.id}
                className="p-3.5 rounded-2xl bg-[#0d1524] border border-[#1f2d48] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-sm">{u.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      u.role === 'admin' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {u.role || 'user'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold uppercase text-[10px]">
                      {u.activePlan || u.plan || 'free'}
                    </span>
                    {u.hasClaimedFreeTrial && (
                      <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold text-[10px]">
                        ট্রায়াল ক্লেইমড ✓
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-xs">{u.email}</p>
                  
                  {/* Balance Display */}
                  <div className="flex items-center gap-2 text-xs flex-wrap pt-0.5">
                    <span className="text-slate-400">ওয়ালেট ব্যালেন্স:</span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold font-mono">
                      ${Number(u.balanceUsd ?? 0).toFixed(2)} USDT
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    বট সংখ্যা: <strong className="text-white">{u.botsCount || 0}</strong> • সীমা: <strong className="text-[#0088cc]">{u.maxBots || 1}টি</strong> • মেয়াদ: {u.expiresAtFormatted}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-wrap pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1f2d48]">
                  <button
                    onClick={() => handleGrantFreeTrialUser(u.id)}
                    disabled={actionLoadingId === 'grant_' + u.id}
                    className="min-h-[32px] px-2.5 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-800 border border-emerald-700 text-emerald-300 text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1 shrink-0"
                    title="ইউজারকে সরাসরি ১ মাসের ফ্রি ট্রায়াল দিন"
                  >
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>{actionLoadingId === 'grant_' + u.id ? 'দিচ্ছে...' : '🎁 ১ মাস ফ্রি দিন'}</span>
                  </button>
                  {u.hasClaimedFreeTrial && (
                    <button
                      onClick={() => handleResetFreeTrialUser(u.id)}
                      disabled={actionLoadingId === 'reset_' + u.id}
                      className="min-h-[32px] px-2.5 py-1 rounded-lg bg-indigo-950/40 hover:bg-indigo-800 border border-indigo-700 text-indigo-300 text-[11px] font-semibold cursor-pointer transition-colors shrink-0"
                      title="ফ্রি ট্রায়াল ক্লেইম হিস্ট্রি রিসেট করুন যাতে ইউজার আবার ট্রায়াল নিতে পারে"
                    >
                      <span>{actionLoadingId === 'reset_' + u.id ? 'রিসেট হচ্ছে...' : '🔄 ট্রায়াল রিসেট'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleUserPlanUpdate(u.id, '1_month', 30, 3, u.role)}
                    className="min-h-[32px] px-2.5 py-1 rounded-lg bg-[#16233b] hover:bg-[#0088cc] text-slate-300 hover:text-white text-[11px] font-medium border border-[#1f2d48] cursor-pointer transition-colors shrink-0"
                  >
                    +১ মাস (৩ বট)
                  </button>
                  <button
                    onClick={() => handleUserPlanUpdate(u.id, '1_year', 365, 999, u.role)}
                    className="min-h-[32px] px-2.5 py-1 rounded-lg bg-[#16233b] hover:bg-emerald-600 text-slate-300 hover:text-white text-[11px] font-medium border border-[#1f2d48] cursor-pointer transition-colors shrink-0"
                  >
                    +১ বছর (আনলিমিটেড)
                  </button>
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => handleUserPlanUpdate(u.id, u.plan || '1_year', 365, 999, 'admin')}
                      className="min-h-[32px] px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[11px] font-semibold cursor-pointer transition-colors shrink-0"
                    >
                      মেক এডমিন
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Packages & Pricing */}
        {activeTab === 'pricing' && (
          <div className="space-y-4 pr-1">
            {/* Header with Add Plan Button */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="font-extrabold text-sm text-white">
                    {lang === 'bn' ? 'প্যাকেজ ও প্রাইসিং কনফিগারেশন' : 'Packages & Pricing Management'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'bn'
                      ? 'নতুন হোস্টিং প্যাকেজ যোগ করুন বা বিদ্যমান প্যাকেজের মূল্য ও বট লিমিট পরিবর্তন করুন।'
                      : 'Add new hosting plans or adjust prices and bot limits for existing ones.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddPlanForm(!showAddPlanForm)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{showAddPlanForm ? 'ফর্ম বন্ধ করুন' : '+ নতুন প্যাকেজ যোগ করুন'}</span>
              </button>
            </div>

            {/* 🎁 1-Month Free Trial Configuration Card for New Users */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-emerald-950/40 via-[#0d1627] to-[#0a0f1d] border-2 border-emerald-500/50 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1f2d48] pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-black text-sm text-white flex items-center gap-2">
                      <span>{lang === 'bn' ? '🎁 ১ মাস ফ্রি ট্রায়াল প্ল্যান সেটিংস (নতুন ইউজার)' : '🎁 1-Month Free Trial Plan Settings'}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        freeTrialSettings.enabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {freeTrialSettings.enabled ? (lang === 'bn' ? 'সক্রিয়' : 'Enabled') : (lang === 'bn' ? 'বন্ধ' : 'Disabled')}
                      </span>
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      {lang === 'bn'
                        ? 'নতুন ইউজার রেজিস্ট্রেশন বা গুগল লগইন করলে এক মাসের জন্য ১টি বট সম্পূর্ণ ফ্রিতে লাইভ হোস্ট করতে পারবে।'
                        : 'New users can claim a 1-month free trial to host 1 bot live for 30 days.'}
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-xl bg-[#132035] border border-[#233758]">
                  <input
                    type="checkbox"
                    checked={freeTrialSettings.enabled}
                    onChange={(e) => setFreeTrialSettings({ ...freeTrialSettings, enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-500"
                  />
                  <span className="text-xs font-bold text-white">
                    {lang === 'bn' ? 'ফ্রি ট্রায়াল চালু রাখুন' : 'Enable Free Trial'}
                  </span>
                </label>
              </div>

              {freeTrialMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{freeTrialMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveFreeTrialSettings} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      {lang === 'bn' ? 'প্ল্যান নাম (বাংলা):' : 'Plan Name (Bangla):'}
                    </label>
                    <input
                      type="text"
                      value={freeTrialSettings.nameBn}
                      onChange={(e) => setFreeTrialSettings({ ...freeTrialSettings, nameBn: e.target.value })}
                      className="w-full bg-[#090f1a] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      {lang === 'bn' ? 'প্ল্যান নাম (English):' : 'Plan Name (English):'}
                    </label>
                    <input
                      type="text"
                      value={freeTrialSettings.nameEn}
                      onChange={(e) => setFreeTrialSettings({ ...freeTrialSettings, nameEn: e.target.value })}
                      className="w-full bg-[#090f1a] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      {lang === 'bn' ? 'মেয়াদ (দিন) [সাধারণত ৩০ দিন]:' : 'Duration (Days) [Default: 30]:'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={freeTrialSettings.durationDays}
                      onChange={(e) => setFreeTrialSettings({ ...freeTrialSettings, durationDays: Number(e.target.value) || 30 })}
                      className="w-full bg-[#090f1a] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-hidden focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      {lang === 'bn' ? 'বট লিমিট (সংখ্যা) [সাধারণত ১টি]:' : 'Max Bots Limit [Default: 1]:'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={freeTrialSettings.maxBots}
                      onChange={(e) => setFreeTrialSettings({ ...freeTrialSettings, maxBots: Number(e.target.value) || 1 })}
                      className="w-full bg-[#090f1a] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-hidden focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      {lang === 'bn' ? 'ফ্রি ট্রায়ালের সুবিধাসমূহ (বাংলা - প্রতি লাইনে ১টি):' : 'Features (Bangla - one per line):'}
                    </label>
                    <textarea
                      rows={3}
                      value={freeTrialBnFeatures}
                      onChange={(e) => setFreeTrialBnFeatures(e.target.value)}
                      placeholder="১টি টেলিগ্রাম বট ২৪/৭ লাইভ হোস্টিং&#10;১ মাস সম্পূর্ণ ফ্রি অ্যাক্সেস&#10;অটো-রিস্টার্ট ও ক্র্যাশ প্রোটেকশন"
                      className="w-full bg-[#090f1a] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      {lang === 'bn' ? 'Features (English - one per line):' : 'Features (English - one per line):'}
                    </label>
                    <textarea
                      rows={3}
                      value={freeTrialEnFeatures}
                      onChange={(e) => setFreeTrialEnFeatures(e.target.value)}
                      placeholder="1 Telegram Bot 24/7 Live Hosting&#10;1 Month Completely Free Access&#10;Auto-Restart & Crash Protection"
                      className="w-full bg-[#090f1a] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                  <span className="text-[11px] text-emerald-400/90 font-medium">
                    {lang === 'bn'
                      ? '✓ নতুন ইউজার শুধু একবারই এই ফ্রি ট্রায়ালটি ক্লেইম করতে পারবেন।'
                      : '✓ New users can only claim this free trial once.'}
                  </span>
                  <button
                    type="submit"
                    disabled={savingFreeTrial}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {savingFreeTrial ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>{lang === 'bn' ? 'ফ্রি ট্রায়াল সেটিংস সেভ করুন' : 'Save Free Trial Settings'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Expandable Add Plan Form */}
            {showAddPlanForm && (
              <form onSubmit={handleAddNewPlan} className="p-4 rounded-2xl bg-[#090f1a] border border-emerald-500/40 space-y-3.5 text-xs animate-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-[#1f2d48] pb-2">
                  <span className="font-black text-emerald-400 text-xs uppercase tracking-wider">
                    নতুন প্যাকেজের তথ্য দিন (Add New Hosting Package)
                  </span>
                  <button type="button" onClick={() => setShowAddPlanForm(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      প্যাকেজ আইডি (Unique ID - ঐচ্ছিক):
                    </label>
                    <input
                      type="text"
                      value={newPlanData.id}
                      onChange={(e) => setNewPlanData({ ...newPlanData, id: e.target.value })}
                      placeholder="e.g. 2_months_special (খালি রাখলে স্বয়ংক্রিয় হবে)"
                      className="w-full bg-[#0d1627] border border-[#1f2d48] rounded-xl p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">নাম (বাংলা) *:</label>
                    <input
                      type="text"
                      value={newPlanData.nameBn}
                      onChange={(e) => setNewPlanData({ ...newPlanData, nameBn: e.target.value })}
                      placeholder="e.g. ২ মাস স্পেশাল"
                      className="w-full bg-[#0d1627] border border-[#1f2d48] rounded-xl p-2 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">নাম (English) *:</label>
                    <input
                      type="text"
                      value={newPlanData.nameEn}
                      onChange={(e) => setNewPlanData({ ...newPlanData, nameEn: e.target.value })}
                      placeholder="e.g. 2 Months Special"
                      className="w-full bg-[#0d1627] border border-[#1f2d48] rounded-xl p-2 text-xs text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-emerald-400 mb-1">মূল্য ($ USDT) *:</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={newPlanData.priceUsd}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewPlanData({
                          ...newPlanData,
                          priceUsd: val,
                          priceBdt: val === '' ? '' : Math.round((parseFloat(val) || 0) * 120)
                        });
                      }}
                      className="w-full bg-[#0d1627] border border-emerald-500/40 rounded-xl p-2 text-xs text-white font-bold"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">মেয়াদ (দিন) *:</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={newPlanData.durationDays}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNewPlanData({ ...newPlanData, durationDays: e.target.value })}
                      className="w-full bg-[#0d1627] border border-[#1f2d48] rounded-xl p-2 text-xs text-white"
                      placeholder="30"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">বট সীমা (Max Bots) *:</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={newPlanData.maxBots}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNewPlanData({ ...newPlanData, maxBots: e.target.value })}
                      className="w-full bg-[#0d1627] border border-[#1f2d48] rounded-xl p-2 text-xs text-white"
                      placeholder="1"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">সুবিধাসমূহ (বাংলা - প্রতি লাইনে একটি):</label>
                    <textarea
                      rows={2}
                      value={newPlanData.featuresBn}
                      onChange={(e) => setNewPlanData({ ...newPlanData, featuresBn: e.target.value })}
                      className="w-full bg-[#0d1627] border border-[#1f2d48] rounded-xl p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Features (English - one per line):</label>
                    <textarea
                      rows={2}
                      value={newPlanData.featuresEn}
                      onChange={(e) => setNewPlanData({ ...newPlanData, featuresEn: e.target.value })}
                      className="w-full bg-[#0d1627] border border-[#1f2d48] rounded-xl p-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={newPlanData.popular}
                      onChange={(e) => setNewPlanData({ ...newPlanData, popular: e.target.checked })}
                      className="rounded text-pink-500"
                    />
                    <span>⭐ পপুলার বা বেস্ট চয়েস ব্যাজ দেখান</span>
                  </label>

                  <button
                    type="submit"
                    disabled={actionLoadingId === 'add_new_plan'}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {actionLoadingId === 'add_new_plan' ? 'যুক্ত হচ্ছে...' : 'প্যাকেজ সেভ করুন'}
                  </button>
                </div>
              </form>
            )}

            {/* Existing Plans Form Grid */}
            <form onSubmit={handleSavePlans} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {plans.map((p, idx) => (
                  <div key={p.id} className="p-4 rounded-2xl bg-[#0d1524] border border-[#1f2d48] space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-white">{p.nameBn} ({p.nameEn})</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#0088cc]/20 text-[#0088cc] border border-[#0088cc]/30">
                          {p.id}
                        </span>
                        {p.id !== 'free' && (
                          <button
                            type="button"
                            onClick={() => handleDeletePlan(p.id)}
                            className="p-1 rounded-lg text-rose-400 hover:text-white hover:bg-rose-950/60 transition-colors cursor-pointer"
                            title="Delete Plan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-emerald-400 mb-1">
                          মূল্য ($ USDT):
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={p.priceUsd ?? ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updated = [...plans];
                            updated[idx] = {
                              ...updated[idx],
                              priceUsd: val as any,
                              priceBdt: val === '' ? ('' as any) : Math.round((parseFloat(val) || 0) * 120)
                            };
                            setPlans(updated);
                          }}
                          placeholder="0.00"
                          className="w-full bg-[#090e18] border border-[#1f2d48] focus:border-emerald-400 rounded-xl p-2 text-xs text-white font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          সর্বোচ্চ বট (Max Bots):
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={p.maxBots ?? ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updated = [...plans];
                            updated[idx] = { ...updated[idx], maxBots: val as any };
                            setPlans(updated);
                          }}
                          placeholder="1"
                          className="w-full bg-[#090e18] border border-[#1f2d48] focus:border-[#0088cc] rounded-xl p-2 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          মেয়াদ (Days):
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={p.durationDays ?? ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updated = [...plans];
                            updated[idx] = { ...updated[idx], durationDays: val as any };
                            setPlans(updated);
                          }}
                          placeholder="30"
                          className="w-full bg-[#090e18] border border-[#1f2d48] focus:border-[#0088cc] rounded-xl p-2 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={actionLoadingId === 'save_plans'}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-slate-950 font-black text-xs shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  {actionLoadingId === 'save_plans' ? 'সংরক্ষণ হচ্ছে...' : 'প্ল্যান ও প্রাইসিং সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 4: Payment Settings */}
        {activeTab === 'payments' && (
          <form onSubmit={handleSavePaymentSettings} className="space-y-4 pr-1">
            {/* Deposit Methods title */}
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider">
                    📋 ডিপোজিট মেথড ও কিউআর কোড সেটিংস (Deposit Methods & QR Codes)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    প্রতিটি মেথডের জন্য সরাসরি ছবি বা QR কোড আপলোড করতে পারবেন। ব্যবহারকারীরা ডিপোজিট করার সময় এই ছবি দেখতে পাবেন।
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* bKash */}
              <div className="p-3 rounded-xl bg-[#090e18] border border-[#1f2d48] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-pink-400 flex items-center gap-1.5">
                    <span>bKash (বিকাশ) একাউন্ট:</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300">
                    <input
                      type="checkbox"
                      checked={paymentSettings.bkashEnabled !== false}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, bkashEnabled: e.target.checked })}
                      className="accent-pink-500 rounded"
                    />
                    <span>সক্রিয়</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={paymentSettings.bkashNumber}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, bkashNumber: e.target.value })}
                  placeholder="01614572747 (Send Money Personal)"
                  className="w-full bg-[#05080f] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
                />

                {/* bKash Custom Logo / Icon */}
                <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-xl bg-[#050912] border border-[#141f32]">
                  <div className="flex items-center gap-2">
                    {paymentSettings.bkashLogoUrl ? (
                      <img src={paymentSettings.bkashLogoUrl} alt="bKash" className="w-8 h-8 rounded-lg object-contain bg-black/40 border border-pink-500/30 p-0.5" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-[#E2136E]/20 text-pink-400 border border-[#E2136E]/40 flex items-center justify-center font-bold text-[9px]">
                        বিকাশ
                      </div>
                    )}
                    <div>
                      <div className="text-[11px] font-bold text-slate-200">
                        লোগো / আইকন (Optional Logo)
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {paymentSettings.bkashLogoUrl ? 'কাস্টম লোগো সক্রিয়' : 'ডিফল্ট bKash লোগো'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {paymentSettings.bkashLogoUrl && (
                      <button
                        type="button"
                        onClick={() => setPaymentSettings({ ...paymentSettings, bkashLogoUrl: '' })}
                        className="px-2 py-1 text-[10px] font-bold rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 cursor-pointer"
                      >
                        রিমুভ
                      </button>
                    )}
                    <label className="px-2.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition">
                      {uploadingQrField === 'bkash_logo' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      <span>{paymentSettings.bkashLogoUrl ? 'পরিবর্তন' : '📷 লোগো আপলোড'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadPaymentImage(f, 'bkash_logo', (url) => setPaymentSettings((prev) => ({ ...prev, bkashLogoUrl: url })));
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Nagad */}
              <div className="p-3 rounded-xl bg-[#090e18] border border-[#1f2d48] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-orange-400 flex items-center gap-1.5">
                    <span>Nagad (নগদ) একাউন্ট:</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300">
                    <input
                      type="checkbox"
                      checked={paymentSettings.nagadEnabled !== false}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, nagadEnabled: e.target.checked })}
                      className="accent-orange-500 rounded"
                    />
                    <span>সক্রিয়</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={paymentSettings.nagadNumber}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, nagadNumber: e.target.value })}
                  placeholder="01304104492 (Send Money Personal)"
                  className="w-full bg-[#05080f] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                />

                {/* Nagad Custom Logo / Icon */}
                <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-xl bg-[#050912] border border-[#141f32]">
                  <div className="flex items-center gap-2">
                    {paymentSettings.nagadLogoUrl ? (
                      <img src={paymentSettings.nagadLogoUrl} alt="Nagad" className="w-8 h-8 rounded-lg object-contain bg-black/40 border border-orange-500/30 p-0.5" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-[#F15A24]/20 text-orange-400 border border-[#F15A24]/40 flex items-center justify-center font-bold text-[9px]">
                        নগদ
                      </div>
                    )}
                    <div>
                      <div className="text-[11px] font-bold text-slate-200">
                        লোগো / আইকন (Optional Logo)
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {paymentSettings.nagadLogoUrl ? 'কাস্টম লোগো সক্রিয়' : 'ডিফল্ট Nagad লোগো'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {paymentSettings.nagadLogoUrl && (
                      <button
                        type="button"
                        onClick={() => setPaymentSettings({ ...paymentSettings, nagadLogoUrl: '' })}
                        className="px-2 py-1 text-[10px] font-bold rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 cursor-pointer"
                      >
                        রিমুভ
                      </button>
                    )}
                    <label className="px-2.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition">
                      {uploadingQrField === 'nagad_logo' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      <span>{paymentSettings.nagadLogoUrl ? 'পরিবর্তন' : '📷 লোগো আপলোড'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadPaymentImage(f, 'nagad_logo', (url) => setPaymentSettings((prev) => ({ ...prev, nagadLogoUrl: url })));
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Binance USDT */}
              <div className="p-3 rounded-xl bg-[#090e18] border border-[#1f2d48] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-400 flex items-center gap-1.5">
                    <span>Binance Pay / UID / USDT Wallet:</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300">
                    <input
                      type="checkbox"
                      checked={paymentSettings.binanceEnabled !== false}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, binanceEnabled: e.target.checked })}
                      className="accent-amber-500 rounded"
                    />
                    <span>সক্রিয়</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={paymentSettings.binancePayId || paymentSettings.binanceUid || paymentSettings.binanceId}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, binancePayId: e.target.value, binanceUid: e.target.value })}
                  placeholder="849201948 (Binance Pay ID / UID)"
                  className="w-full bg-[#05080f] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                />
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Binance BEP-20 (BSC) USDT এড্রেস (ঐচ্ছিক):
                  </label>
                  <input
                    type="text"
                    value={paymentSettings.binanceBscAddress || ''}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, binanceBscAddress: e.target.value })}
                    placeholder="0xadf20566382613a481f39f62cd50b872314db1d3"
                    className="w-full bg-[#05080f] border border-[#1f2d48] rounded-xl p-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {paymentSettings.binanceQrUrl ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0 bg-[#0d1524] p-1.5 rounded-lg border border-[#1f2d48]">
                      <img src={paymentSettings.binanceQrUrl} alt="Binance QR" className="w-8 h-8 rounded object-cover border border-[#2b3d60]" />
                      <span className="text-[10px] text-slate-400 truncate flex-1">QR কোড যুক্ত আছে</span>
                      <button
                        type="button"
                        onClick={() => setPaymentSettings({ ...paymentSettings, binanceQrUrl: '' })}
                        className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                        title="রিমুভ করুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-500 flex-1">QR বা পিকচার নেই</span>
                  )}
                  <label className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shrink-0">
                    {uploadingQrField === 'binance' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Upload className="w-3 h-3" />
                    )}
                    <span>{paymentSettings.binanceQrUrl ? 'পরিবর্তন' : 'পিকচার আপলোড'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadPaymentImage(f, 'binance', (url) => setPaymentSettings((prev) => ({ ...prev, binanceQrUrl: url })));
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Custom Deposit Methods Section with Direct Picture Upload */}
            <div className="p-4 rounded-2xl bg-[#080d18] border border-[#1f2d48] space-y-3 mt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h5 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>কাস্টম ডিপোজিট মেথড (Direct Picture Upload সহ)</span>
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    আপনি নিজের পছন্দমতো যেকোনো মেথড (যেমন: Upay, Bank, Cash, Agent) সরাসরি পিকচার আপলোড করে যোগ করতে পারবেন। (QR শুধুমাত্র বাইন্যান্সের জন্য সংরক্ষিত)।
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {paymentSettings.customMethods && paymentSettings.customMethods.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('আপনি কি সব কাস্টম মেথড একসাথে ডিলিট করতে চান?')) {
                          setPaymentSettings({ ...paymentSettings, customMethods: [] });
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-bold text-xs flex items-center gap-1 border border-rose-500/30 cursor-pointer transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>সব মুছুন</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const newId = `cm_${Date.now()}`;
                      const currentList = paymentSettings.customMethods || [];
                      setPaymentSettings({
                        ...paymentSettings,
                        customMethods: [
                          ...currentList,
                          {
                            id: newId,
                            name: '',
                            type: 'custom',
                            account: '',
                            imageUrl: '',
                            instructions: '',
                            enabled: true
                          }
                        ]
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md cursor-pointer transition shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>নতুন মেথড যোগ করুন</span>
                  </button>
                </div>
              </div>

              {(!paymentSettings.customMethods || paymentSettings.customMethods.length === 0) ? (
                <div className="py-4 text-center text-xs text-slate-500 border border-dashed border-[#1f2d48] rounded-xl">
                  বর্তমানে কোনো কাস্টম ডিপোজিট মেথড নেই। উপরে "নতুন মেথড যোগ করুন" বাটনে ক্লিক করে সরাসরি পিকচার সহ মেথড যুক্ত করুন।
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentSettings.customMethods.map((cm, idx) => (
                    <div key={cm.id || idx} className="p-3.5 rounded-xl bg-[#0b1220] border border-[#1f2d48] space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-white">
                            {cm.name ? cm.name : 'নতুন ডিপোজিট মেথড'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-300">
                            <input
                              type="checkbox"
                              checked={cm.enabled !== false}
                              onChange={(e) => {
                                const list = [...(paymentSettings.customMethods || [])];
                                list[idx] = { ...list[idx], enabled: e.target.checked };
                                setPaymentSettings({ ...paymentSettings, customMethods: list });
                              }}
                              className="accent-amber-500 rounded"
                            />
                            <span>সক্রিয়</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const list = (paymentSettings.customMethods || []).filter((_, i) => i !== idx);
                              setPaymentSettings({ ...paymentSettings, customMethods: list });
                            }}
                            className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded cursor-pointer transition"
                            title="মেথড ডিলিট করুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 mb-1">
                            মেথডের নাম (Method Name):
                          </label>
                          <input
                            type="text"
                            value={cm.name}
                            onChange={(e) => {
                              const list = [...(paymentSettings.customMethods || [])];
                              list[idx] = { ...list[idx], name: e.target.value };
                              setPaymentSettings({ ...paymentSettings, customMethods: list });
                            }}
                            placeholder="যেমন: Upay (উপায়) বা Bank Asia"
                            className="w-full bg-[#05080f] border border-[#1f2d48] rounded-xl p-2 text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 mb-1">
                            একাউন্ট নাম্বার / তথ্য (Account Number / Details):
                          </label>
                          <input
                            type="text"
                            value={cm.account}
                            onChange={(e) => {
                              const list = [...(paymentSettings.customMethods || [])];
                              list[idx] = { ...list[idx], account: e.target.value };
                              setPaymentSettings({ ...paymentSettings, customMethods: list });
                            }}
                            placeholder="যেমন: 01XXXXXXXXX"
                            className="w-full bg-[#05080f] border border-[#1f2d48] rounded-xl p-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                          />
                        </div>
                      </div>

                      {/* Picture / Representative Icon Upload & Link for this custom method */}
                      <div className="p-3 rounded-2xl bg-[#060a14] border border-[#17253d] space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>মেথডের ছবি ও রেপ্রেজেন্টেটিভ আইকন (Method Image / Icon):</span>
                          </label>
                          {cm.imageUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                const list = [...(paymentSettings.customMethods || [])];
                                list[idx] = { ...list[idx], imageUrl: '' };
                                setPaymentSettings({ ...paymentSettings, customMethods: list });
                              }}
                              className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 transition cursor-pointer flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>ছবি সরান</span>
                            </button>
                          )}
                        </div>

                        {/* Top: Image Preview + Upload Button + Direct URL Link Input */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                          {/* Live Thumbnail Preview */}
                          <div className="flex items-center gap-2.5 shrink-0">
                            <div className="w-12 h-12 rounded-xl bg-[#0b1220] border-2 border-amber-500/40 p-1 flex items-center justify-center overflow-hidden shadow-md">
                              {cm.imageUrl ? (
                                <img
                                  src={cm.imageUrl}
                                  alt={cm.name || 'Preview'}
                                  className="w-full h-full object-contain rounded-lg"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="text-slate-500 flex flex-col items-center justify-center">
                                  <ImageIcon className="w-5 h-5 text-slate-500" />
                                </div>
                              )}
                            </div>
                            <div className="hidden sm:block">
                              <div className="text-[11px] font-bold text-slate-200">
                                {cm.imageUrl ? '✓ আইকন সক্রিয়' : 'নো আইকন'}
                              </div>
                              <div className="text-[9px] text-slate-400">
                                ডিপোজিট পেজে শো করবে
                              </div>
                            </div>
                          </div>

                          {/* File Upload Button + Image Link Input */}
                          <div className="flex-1 w-full flex flex-col sm:flex-row gap-2">
                            {/* File Upload Button */}
                            <label className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow transition shrink-0">
                              {uploadingQrField === `custom_${idx}` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Upload className="w-3.5 h-3.5" />
                              )}
                              <span>{cm.imageUrl ? 'ছবি পরিবর্তন' : '📷 পিকচার আপলোড'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) {
                                    handleUploadPaymentImage(f, `custom_${idx}`, (url) => {
                                      const list = [...(paymentSettings.customMethods || [])];
                                      list[idx] = { ...list[idx], imageUrl: url };
                                      setPaymentSettings({ ...paymentSettings, customMethods: list });
                                    });
                                  }
                                }}
                              />
                            </label>

                            {/* Direct URL Input */}
                            <div className="relative flex-1">
                              <Link className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="url"
                                value={cm.imageUrl || ''}
                                onChange={(e) => {
                                  const list = [...(paymentSettings.customMethods || [])];
                                  list[idx] = { ...list[idx], imageUrl: e.target.value };
                                  setPaymentSettings({ ...paymentSettings, customMethods: list });
                                }}
                                placeholder="বা ছবির সরাসরি লিংক পেস্ট করুন (e.g. https://.../logo.png)"
                                className="w-full bg-[#05080f] border border-[#1f2d48] rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Quick 1-Click Representative Icon Presets */}
                        <div className="pt-2 border-t border-slate-800/80">
                          <div className="text-[10px] font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                            <span>রেপ্রেজেন্টেটিভ আইকন নির্বাচন করুন (১-ক্লিক):</span>
                            <span className="text-[9px] text-amber-400">Bkash, Nagad, Upay ও অন্যান্য</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
                            {PAYMENT_ICON_PRESETS.map((preset) => {
                              const isSelected = cm.imageUrl === preset.url;
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => {
                                    const list = [...(paymentSettings.customMethods || [])];
                                    const updated = { ...list[idx], imageUrl: preset.url };
                                    if (!updated.name) {
                                      updated.name = preset.suggestedName;
                                    }
                                    list[idx] = updated;
                                    setPaymentSettings({ ...paymentSettings, customMethods: list });
                                  }}
                                  className={`p-1.5 rounded-xl border flex items-center gap-1.5 transition cursor-pointer text-left ${
                                    isSelected
                                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400/50'
                                      : 'bg-[#090f1d] border-[#18263e] hover:border-slate-500 text-slate-300 hover:bg-[#0f192d]'
                                  }`}
                                >
                                  <img src={preset.url} alt={preset.name} className="w-5 h-5 rounded-md shrink-0 object-contain" />
                                  <span className="text-[10px] font-bold truncate leading-tight">{preset.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          বিশেষ নির্দেশনা (ঐচ্ছিক):
                        </label>
                        <input
                          type="text"
                          value={cm.instructions || ''}
                          onChange={(e) => {
                            const list = [...(paymentSettings.customMethods || [])];
                            list[idx] = { ...list[idx], instructions: e.target.value };
                            setPaymentSettings({ ...paymentSettings, customMethods: list });
                          }}
                          placeholder="যেমন: Send Money করে TrxID ও আপনার নাম্বার দিন"
                          className="w-full bg-[#05080f] border border-[#1f2d48] rounded-xl p-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1 text-xs">
                সাধারণ পেমেন্ট নির্দেশাবলী (General Payment Instructions):
              </label>
              <textarea
                rows={3}
                value={paymentSettings.instructionsBn || ''}
                onChange={(e) => setPaymentSettings({ ...paymentSettings, instructionsBn: e.target.value })}
                className="w-full bg-[#090e18] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#0088cc]"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={actionLoadingId === 'save_payments'}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold text-xs shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                {actionLoadingId === 'save_payments' ? 'সংরক্ষণ হচ্ছে...' : 'পেমেন্ট মেথড ও সেটিংস সংরক্ষণ করুন'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 5: All Bots Control */}
        {activeTab === 'bots' && (
          <div className="space-y-2.5 pr-1">
            {allBots.map((bot) => (
              <div
                key={bot.id}
                className="p-3.5 rounded-2xl bg-[#0d1524] border border-[#1f2d48] flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{bot.name}</span>
                    <span className={`w-2 h-2 rounded-full ${bot.status === 'running' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className="text-[11px] font-semibold text-slate-400">({bot.id})</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    মালিক: <span className="text-slate-300 font-medium">{bot.ownerName || bot.ownerId || 'System'}</span> • PID: {bot.pid || 'None'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {bot.status === 'running' ? (
                    <button
                      onClick={async () => {
                        await fetch(`/api/bots/${bot.id}/stop`, { method: 'POST' });
                        loadAllAdminData();
                        if (onBotAction) onBotAction();
                      }}
                      className="min-w-[36px] min-h-[36px] p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900 border border-rose-800 text-rose-300 cursor-pointer flex items-center justify-center shrink-0"
                      title="Stop Bot"
                    >
                      <Square className="w-4 h-4 fill-current shrink-0" />
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        await fetch(`/api/bots/${bot.id}/start`, { method: 'POST' });
                        loadAllAdminData();
                        if (onBotAction) onBotAction();
                      }}
                      className="min-w-[36px] min-h-[36px] p-2 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white cursor-pointer flex items-center justify-center shrink-0"
                      title="Start Bot"
                    >
                      <Play className="w-4 h-4 fill-current shrink-0" />
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      await fetch(`/api/bots/${bot.id}/restart`, { method: 'POST' });
                      loadAllAdminData();
                      if (onBotAction) onBotAction();
                    }}
                    className="min-w-[36px] min-h-[36px] p-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-slate-300 cursor-pointer border border-[#334155] flex items-center justify-center shrink-0"
                    title="Restart Bot"
                  >
                    <RotateCw className="w-4 h-4 shrink-0" />
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm(`Are you sure you want to delete '${bot.name}'?`)) {
                        await fetch(`/api/bots/${bot.id}`, { method: 'DELETE' });
                        loadAllAdminData();
                        if (onBotAction) onBotAction();
                      }
                    }}
                    className="min-w-[36px] min-h-[36px] p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900 border border-rose-800 text-rose-400 cursor-pointer flex items-center justify-center shrink-0"
                    title="Delete Bot"
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Hero Banners Control Tab */}
        {activeTab === 'banners' && <AdminBannersManager />}

        {/* Notices & Broadcasts Tab */}
        {activeTab === 'notices' && <AdminNoticesManager />}

        {/* Support Inbox & Settings Tab */}
        {activeTab === 'support' && <AdminSupportManager />}

        {/* Site Logo & Branding Tab */}
        {activeTab === 'site' && <AdminSiteSettingsManager />}

        {/* Static Websites Admin Tab */}
        {activeTab === 'websites' && <AdminWebsitesManager lang={lang} />}

        {/* Rewarded Video Ads Config Tab */}
        {activeTab === 'ads' && <AdminAdsManager lang={lang} />}

        {/* SMTP Configuration Tab */}
        {activeTab === 'smtp' && <AdminSmtpManager lang={lang} />}

        </div>

        {/* Floating Quick Scroll to Top button */}
        {showBackToTop && (
          <button
            type="button"
            onClick={scrollToTop}
            className="absolute bottom-5 right-5 z-20 p-2.5 rounded-full bg-[#0088cc] hover:bg-[#0077b5] text-white shadow-xl flex items-center justify-center cursor-pointer transition-all hover:scale-105 border border-sky-400/30 animate-in fade-in"
            title={lang === 'bn' ? 'উপরে স্ক্রোল করুন' : 'Scroll to top'}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}

      </div>
    </div>
  );
};
