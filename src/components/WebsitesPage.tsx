import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Plus,
  ExternalLink,
  Copy,
  Check,
  Upload,
  Archive,
  FileCode,
  Folder,
  Trash2,
  Play,
  Square,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  HardDrive,
  Clock,
  Layers,
  Search,
  Eye,
  X,
  FileText,
  ShieldCheck,
  ArrowRight,
  Edit3,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';
import { HostedWebsite, AuthUser } from '../types';
import { HostingTutorialSection } from './HostingTutorialSection';

interface WebsitesPageProps {
  user: AuthUser | null;
  onOpenAuthModal: () => void;
  onNavigateToPlans: () => void;
  lang?: 'bn' | 'en';
}

export const WebsitesPage: React.FC<WebsitesPageProps> = ({
  user,
  onOpenAuthModal,
  onNavigateToPlans,
  lang = 'bn'
}) => {
  const [websites, setWebsites] = useState<HostedWebsite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Website Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteSlug, setNewSiteSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [creatingSite, setCreatingSite] = useState(false);

  // Edit Website Name & Slug Modal
  const [editSite, setEditSite] = useState<HostedWebsite | null>(null);
  const [editSiteName, setEditSiteName] = useState('');
  const [editSiteSlug, setEditSiteSlug] = useState('');
  const [updatingSite, setUpdatingSite] = useState(false);
  const [editCheckingSlug, setEditCheckingSlug] = useState(false);
  const [editSlugAvailable, setEditSlugAvailable] = useState<boolean | null>(null);
  const [editSlugError, setEditSlugError] = useState<string | null>(null);

  // Redeploy / Upload Modal
  const [deployTargetSite, setDeployTargetSite] = useState<HostedWebsite | null>(null);
  const [deployMethod, setDeployMethod] = useState<'zip' | 'files'>('zip');
  const [selectedZip, setSelectedZip] = useState<{ name: string; base64: string; size: number } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Array<{ name: string; content?: string; base64?: string; size: number }>>([]);
  const [uploadingDeploy, setUploadingDeploy] = useState(false);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  // File browser modal
  const [browseSite, setBrowseSite] = useState<HostedWebsite | null>(null);
  const [fileList, setFileList] = useState<Array<{ path: string; size: number; modified: string }>>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Live Preview Modal
  const [previewSite, setPreviewSite] = useState<HostedWebsite | null>(null);

  // Delete modal
  const [deleteTargetSite, setDeleteTargetSite] = useState<HostedWebsite | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [websiteVideoUrl, setWebsiteVideoUrl] = useState<string | undefined>(undefined);

  // Custom Domain modal states
  const [domainTargetSite, setDomainTargetSite] = useState<HostedWebsite | null>(null);
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [domainSaving, setDomainSaving] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);

  const handleSaveCustomDomain = async () => {
    if (!domainTargetSite) return;
    try {
      setDomainSaving(true);
      setDomainError(null);
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch(`/api/websites/${domainTargetSite.id}/custom-domain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ customDomain: customDomainInput.trim() || null })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setDomainError(data.error || (lang === 'bn' ? 'ডোমেন আপডেট করতে সমস্যা হয়েছে।' : 'Failed to update custom domain'));
        return;
      }
      setSuccessMsg(
        customDomainInput.trim()
          ? (lang === 'bn' ? `✓ কাস্টম ডোমেন https://${customDomainInput.trim()} সফলভাবে যুক্ত হয়েছে!` : `✓ Custom domain updated!`)
          : (lang === 'bn' ? '✓ কাস্টম ডোমেন সফলভাবে অপসারণ করা হয়েছে।' : '✓ Custom domain removed.')
      );
      setDomainTargetSite(null);
      fetchWebsites();
    } catch (err: any) {
      setDomainError(err.message || 'Error updating custom domain');
    } finally {
      setDomainSaving(false);
    }
  };

  const fetchWebsites = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/websites', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.websites)) {
        setWebsites(data.websites);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsites();
    fetch('/api/site-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings?.websiteVideoUrl || data.settings?.hostingVideoUrl) {
          setWebsiteVideoUrl(data.settings.websiteVideoUrl || data.settings.hostingVideoUrl);
        }
      })
      .catch(() => {});
  }, [user]);

  // Transliterate Bangla to clean Latin slug
  const banglaToEnglishSlug = (text: string): string => {
    const map: Record<string, string> = {
      'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u', 'ঋ': 'ri',
      'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou',
      'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
      'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n',
      'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
      'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
      'প': 'p', 'ফ': 'f', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
      'য': 'y', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h',
      'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y', 'ৎ': 't',
      '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
      'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u', 'ৃ': 'ri',
      'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou', '্': ''
    };
    const converted = text.split('').map((ch) => (map[ch] !== undefined ? map[ch] : ch)).join('');
    return converted
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);
  };

  // Slug check debouncing for new website
  useEffect(() => {
    if (!newSiteSlug.trim()) {
      setSlugAvailable(null);
      setSlugError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingSlug(true);
      setSlugError(null);
      try {
        const res = await fetch(`/api/websites/check-slug/${encodeURIComponent(newSiteSlug.trim())}`);
        const data = await res.json();
        setSlugAvailable(data.available);
        if (!data.available && data.error) {
          setSlugError(data.error);
        } else if (!data.available) {
          setSlugError(lang === 'bn' ? 'এই সাবডোমেনটি ইতোমধ্যে ব্যবহৃত হয়েছে' : 'Subdomain is already taken');
        }
      } catch {
        setSlugAvailable(null);
      } finally {
        setCheckingSlug(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [newSiteSlug, lang]);

  // Slug check debouncing for editing website
  useEffect(() => {
    if (!editSite || !editSiteSlug.trim() || editSiteSlug.trim() === editSite.slug) {
      setEditSlugAvailable(true);
      setEditSlugError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setEditCheckingSlug(true);
      setEditSlugError(null);
      try {
        const res = await fetch(`/api/websites/check-slug/${encodeURIComponent(editSiteSlug.trim())}`);
        const data = await res.json();
        setEditSlugAvailable(data.available);
        if (!data.available && data.error) {
          setEditSlugError(data.error);
        } else if (!data.available) {
          setEditSlugError(lang === 'bn' ? 'এই লিংকটি ইতোমধ্যে অন্য সাইট ব্যবহার করছে' : 'Link is already taken');
        }
      } catch {
        setEditSlugAvailable(null);
      } finally {
        setEditCheckingSlug(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [editSiteSlug, editSite, lang]);

  const handleNameChange = (val: string) => {
    setNewSiteName(val);
    if (!slugManuallyEdited) {
      setNewSiteSlug(banglaToEnglishSlug(val));
    }
  };

  const handleUpdateWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSite || !editSiteName.trim() || !editSiteSlug.trim()) return;

    setUpdatingSite(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch(`/api/websites/${editSite.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editSiteName.trim(),
          slug: editSiteSlug.trim()
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update website');
      }

      setEditSite(null);
      setSuccessMsg(
        lang === 'bn'
          ? `✅ ওয়েবসাইটের নাম ও লিংক সফলভাবে আপডেট হয়েছে! নতুন লিংক: /site/${data.website?.slug}/`
          : `✅ Website updated successfully! New link: /site/${data.website?.slug}/`
      );
      fetchWebsites();
    } catch (err: any) {
      setError(err.message || 'Error updating website');
    } finally {
      setUpdatingSite(false);
    }
  };

  const handleCreateWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName.trim()) return;

    setCreatingSite(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/websites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newSiteName.trim(),
          slug: newSiteSlug.trim()
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create website');
      }

      setShowNewModal(false);
      setNewSiteName('');
      setNewSiteSlug('');
      setSuccessMsg(
        lang === 'bn'
          ? `🎉 ওয়েবসাইট "${data.website?.name}" সফলভাবে তৈরি হয়েছে!`
          : `🎉 Website "${data.website?.name}" created successfully!`
      );
      fetchWebsites();
      // Prompt deploy
      if (data.website) {
        setDeployTargetSite(data.website);
      }
    } catch (err: any) {
      setError(err.message || 'Error creating website');
    } finally {
      setCreatingSite(false);
    }
  };

  const handleZipSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      setSelectedZip({
        name: file.name,
        base64,
        size: file.size
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFilesSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileListObj = e.target.files;
    if (!fileListObj || fileListObj.length === 0) return;

    const arr: Array<{ name: string; content?: string; base64?: string; size: number }> = [];
    for (let i = 0; i < fileListObj.length; i++) {
      const f = fileListObj[i];
      const isText = /\.(html|htm|css|js|json|svg|txt|xml|md|map)$/i.test(f.name);
      if (isText) {
        const text = await f.text();
        arr.push({ name: (f as any).webkitRelativePath || f.name, content: text, size: f.size });
      } else {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
          reader.readAsDataURL(f);
        });
        arr.push({ name: (f as any).webkitRelativePath || f.name, base64, size: f.size });
      }
    }
    setSelectedFiles(arr);
  };

  const handleExecuteDeploy = async () => {
    if (!deployTargetSite) return;
    setUploadingDeploy(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('bot_auth_token');
      if (deployMethod === 'zip') {
        if (!selectedZip) {
          throw new Error('অনুগ্রহ করে একটি ZIP ফাইল নির্বাচন করুন');
        }

        const res = await fetch(`/api/websites/${deployTargetSite.id}/deploy-zip`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ zipBase64: selectedZip.base64 })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'ZIP deploy failed');
        }
      } else {
        if (selectedFiles.length === 0) {
          throw new Error('অনুগ্রহ করে এক বা একাধিক ফাইল নির্বাচন করুন');
        }

        const res = await fetch(`/api/websites/${deployTargetSite.id}/deploy-files`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ files: selectedFiles })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Files deploy failed');
        }
      }

      setSuccessMsg(
        lang === 'bn'
          ? `🚀 "${deployTargetSite.name}" সফলভাবে ডিপ্লয় সম্পন্ন হয়েছে!`
          : `🚀 "${deployTargetSite.name}" successfully deployed!`
      );
      setDeployTargetSite(null);
      setSelectedZip(null);
      setSelectedFiles([]);
      fetchWebsites();
    } catch (err: any) {
      setError(err.message || 'Deploy error');
    } finally {
      setUploadingDeploy(false);
    }
  };

  const handleToggleStatus = async (site: HostedWebsite) => {
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch(`/api/websites/${site.id}/toggle-status`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchWebsites();
      }
    } catch {}
  };

  const handleDeleteSite = async () => {
    if (!deleteTargetSite) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch(`/api/websites/${deleteTargetSite.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDeleteTargetSite(null);
        fetchWebsites();
      }
    } catch {} finally {
      setDeleting(false);
    }
  };

  const handleOpenBrowseFiles = async (site: HostedWebsite) => {
    setBrowseSite(site);
    setLoadingFiles(true);
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch(`/api/websites/${site.id}/files`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.files)) {
        setFileList(data.files);
      }
    } catch {
      setFileList([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const dm = 1;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const maxWebsites = user?.maxWebsites || (user?.role === 'admin' ? 999 : 2);
  const totalStorageBytes = websites.reduce((acc, curr) => acc + (curr.storageBytes || 0), 0);
  const activeCount = websites.filter((w) => w.status === 'online').length;

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-6 text-slate-100 min-w-0 w-full overflow-hidden">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 md:p-8 bg-gradient-to-br from-[#0c1427] via-[#091122] to-[#040813] border border-cyan-500/25 shadow-2xl mb-6 sm:mb-8">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold mb-3">
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'bn' ? '🌐 স্ট্যাটিক ওয়েবসাইট হোস্টিং' : '🌐 Static Website Cloud Hosting'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {lang === 'bn' ? 'আপনার নিজস্ব ওয়েবসাইট ও পোর্টফোলিও লাইভ হোস্ট করুন' : 'Host Static Websites with Free Subdomains'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl leading-relaxed">
              {lang === 'bn'
                ? 'HTML, CSS, JavaScript ও ইমেজ দিয়ে তৈরি ওয়েবসাইট সরাসরি ZIP বা ফাইল আপলোড করে ফ্রিতে সাবডোমেন সহ লাইভ পাবলিশ করুন।'
                : 'Upload HTML, CSS, JS, and image assets via ZIP or folder. Instantly live with free SSL and custom subdomains.'}
            </p>
          </div>

          <button
            onClick={() => {
              if (!user) {
                onOpenAuthModal();
              } else {
                setShowNewModal(true);
              }
            }}
            className="w-full md:w-auto px-5 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3] shrink-0" />
            <span>{lang === 'bn' ? 'নতুন ওয়েবসাইট হোস্ট করুন' : 'Deploy New Website'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-950/50 border border-emerald-500/50 rounded-2xl text-emerald-300 text-xs sm:text-sm flex items-center gap-3 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="flex-1 font-semibold">{successMsg}</div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-rose-950/50 border border-rose-500/50 rounded-2xl text-rose-300 text-xs sm:text-sm flex items-center gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Video Tutorial & How to Host Websites Guide */}
      <HostingTutorialSection
        lang={lang}
        videoUrl={websiteVideoUrl}
        onNavigateToPlans={onNavigateToPlans}
        type="website"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-[#0b1222] border border-slate-800 p-3 sm:p-4 rounded-2xl shadow-sm min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1 min-w-0">
            <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{lang === 'bn' ? 'মোট ওয়েবসাইট' : 'Total Websites'}</span>
          </div>
          <p className="text-lg sm:text-xl font-bold text-white font-mono truncate">
            {websites.length} / {maxWebsites}
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 truncate">
            {maxWebsites - websites.length} {lang === 'bn' ? 'টি স্লট বাকি' : 'slots available'}
          </p>
        </div>

        <div className="bg-[#0b1222] border border-slate-800 p-3 sm:p-4 rounded-2xl shadow-sm min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1 min-w-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{lang === 'bn' ? 'অনলাইন সাইট' : 'Online Sites'}</span>
          </div>
          <p className="text-lg sm:text-xl font-bold text-emerald-400 font-mono truncate">{activeCount}</p>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 truncate">{lang === 'bn' ? 'লাইভ ভিজিটর রেডি' : 'Live & Serving'}</p>
        </div>

        <div className="bg-[#0b1222] border border-slate-800 p-3 sm:p-4 rounded-2xl shadow-sm min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1 min-w-0">
            <HardDrive className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="truncate">{lang === 'bn' ? 'স্টোরেজ ব্যবহার' : 'Storage Used'}</span>
          </div>
          <p className="text-lg sm:text-xl font-bold text-purple-400 font-mono truncate">{formatBytes(totalStorageBytes)}</p>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 truncate">{lang === 'bn' ? 'ফাস্ট এসএসডি ক্লাউড' : 'Cloud SSD storage'}</p>
        </div>

        <div className="bg-[#0b1222] border border-slate-800 p-3 sm:p-4 rounded-2xl shadow-sm min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1 min-w-0">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{lang === 'bn' ? 'SSL সিকিউরিটি' : 'SSL Protection'}</span>
          </div>
          <p className="text-lg sm:text-xl font-bold text-amber-400 font-mono truncate">HTTPS</p>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 truncate">{lang === 'bn' ? 'অটোমেটিক সার্টিফিকেট' : 'Auto Encrypted'}</p>
        </div>
      </div>

      {/* Website Cards Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-cyan-400" />
          <p>{lang === 'bn' ? 'ওয়েবসাইট তালিকা লোড হচ্ছে...' : 'Loading websites...'}</p>
        </div>
      ) : websites.length === 0 ? (
        <div className="p-12 text-center bg-[#0b1222] border border-slate-800 rounded-3xl shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            {lang === 'bn' ? 'এখনো কোনো ওয়েবসাইট হোস্ট করা হয়নি' : 'No websites deployed yet'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
            {lang === 'bn'
              ? 'আপনার তৈরি করা HTML ওয়েবসাইট বা পোর্টফোলিও আপলোড করে সরাসরি একটি ফ্রি সাবডোমেন পেয়ে যান।'
              : 'Deploy your first HTML website or portfolio and get a free instant subdomain with HTTPS.'}
          </p>
          <button
            onClick={() => {
              if (!user) {
                onOpenAuthModal();
              } else {
                setShowNewModal(true);
              }
            }}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'bn' ? 'প্রথম ওয়েবসাইট হোস্ট করুন' : 'Deploy First Website'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {websites.map((site) => {
            const isOnline = site.status === 'online';
            const directPath = site.directUrl || `/site/${site.slug}/`;
            const workingOrigin = typeof window !== 'undefined' ? window.location.origin : '';
            const fullLiveUrl = `${workingOrigin}${directPath}`;

            return (
              <div
                key={site.id}
                className="bg-[#0b1222] border border-slate-800 hover:border-slate-700 rounded-3xl p-4 sm:p-5 shadow-sm transition-all flex flex-col justify-between w-full min-w-0 overflow-hidden"
              >
                <div className="min-w-0">
                  {/* Top Status */}
                  <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center font-bold shrink-0">
                        <Globe className="w-5 h-5 shrink-0" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-white truncate">{site.name}</h3>
                        <p className="text-xs text-cyan-400 font-mono font-medium truncate">
                          {site.customDomain ? `https://${site.customDomain}` : (site.netlifyUrl || `https://${site.slug}.netlify.app`)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          isOnline
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                        <span>{isOnline ? (lang === 'bn' ? 'অনলাইন' : 'Online') : (lang === 'bn' ? 'বন্ধ' : 'Stopped')}</span>
                      </span>
                    </div>
                  </div>

                  {/* URL Card - Always provides Netlify URL / Custom Domain with direct preview access */}
                  {(() => {
                    const primaryLink = site.customDomain ? `https://${site.customDomain}` : (site.netlifyUrl || `https://${site.slug}.netlify.app`);
                    return (
                      <div className="bg-[#060c18] border border-cyan-500/30 rounded-2xl p-3 sm:p-3.5 mb-4 shadow-inner w-full min-w-0 overflow-hidden">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                            <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-extrabold truncate">
                              {site.customDomain
                                ? (lang === 'bn' ? '🌐 সক্রিয় কাস্টম ডোমেন' : '🌐 Active Custom Domain')
                                : (lang === 'bn' ? '⚡ Netlify ক্লাউড লাইভ লিংক' : '⚡ Netlify Cloud Live Link')}
                            </p>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/40 shrink-0">
                            HTTPS 24/7
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-1.5 sm:gap-2 bg-[#091120] border border-slate-800 rounded-xl px-2.5 sm:px-3 py-2 min-w-0">
                          <a
                            href={primaryLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-cyan-300 hover:text-cyan-200 hover:underline truncate block font-mono font-bold flex-1 min-w-0"
                            title={primaryLink}
                          >
                            {primaryLink}
                          </a>

                          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                copyToClipboard(primaryLink, site.id);
                                setSuccessMsg(
                                  lang === 'bn'
                                    ? `✓ লিংক কপি হয়েছে: ${primaryLink}`
                                    : `✓ Copied: ${primaryLink}`
                                );
                              }}
                              className="px-2 sm:px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold shrink-0"
                              title={lang === 'bn' ? 'লিংক কপি করুন' : 'Copy Live Link'}
                            >
                              {copiedId === site.id ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                              <span>{copiedId === site.id ? (lang === 'bn' ? 'কপি' : 'Done') : (lang === 'bn' ? 'কপি' : 'Copy')}</span>
                            </button>
                            <a
                              href={primaryLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 sm:p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 transition-colors cursor-pointer shrink-0"
                              title={lang === 'bn' ? 'নতুন ট্যাবে সাইট ওপেন করুন' : 'Open Website in New Tab'}
                            >
                              <ExternalLink className="w-4 h-4 shrink-0" />
                            </a>
                          </div>
                        </div>

                        {site.customDomain && (
                          <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                            <span className="truncate">Netlify: https://{site.slug}.netlify.app</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-4 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <HardDrive className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{formatBytes(site.storageBytes)} ({site.filesCount || 0} {lang === 'bn' ? 'ফাইল' : 'files'})</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end min-w-0">
                      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{new Date(site.lastDeployedAt || site.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Clean 3-Tier Structured Responsive Layout */}
                <div className="pt-3.5 border-t border-slate-800/80 space-y-2.5 w-full min-w-0">
                  {/* Tier 1: Primary Actions (Live Preview & Upload/Redeploy) */}
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <button
                      onClick={() => setPreviewSite(site)}
                      className="w-full py-2.5 px-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
                      title={lang === 'bn' ? 'লাইভ প্রিভিউ দেখুন' : 'Live Preview'}
                    >
                      <Eye className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span className="truncate">{lang === 'bn' ? 'লাইভ প্রিভিউ' : 'Live Preview'}</span>
                    </button>

                    <button
                      onClick={() => setDeployTargetSite(site)}
                      className="w-full py-2.5 px-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
                      title={lang === 'bn' ? 'ফাইল আপলোড বা রিডিপ্লয় করুন' : 'Upload / Redeploy'}
                    >
                      <Upload className="w-4 h-4 shrink-0 text-cyan-400" />
                      <span className="truncate">{lang === 'bn' ? 'রিডিপ্লয়' : 'Redeploy'}</span>
                    </button>
                  </div>

                  {/* Tier 2: Management Tools (Files, Edit Link, Custom Domain) */}
                  <div className="grid grid-cols-3 gap-2 w-full">
                    <button
                      onClick={() => handleOpenBrowseFiles(site)}
                      className="w-full py-2 px-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-98"
                      title={lang === 'bn' ? 'ফাইল ম্যানেজার' : 'Files'}
                    >
                      <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{lang === 'bn' ? 'ফাইলস' : 'Files'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditSite(site);
                        setEditSiteName(site.name);
                        setEditSiteSlug(site.slug);
                        setEditSlugAvailable(true);
                        setEditSlugError(null);
                      }}
                      className="w-full py-2 px-1.5 bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-98"
                      title={lang === 'bn' ? 'ওয়েবসাইটের নাম ও লিংক পরিবর্তন' : 'Change name & URL'}
                    >
                      <Edit3 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{lang === 'bn' ? 'লিংক এডিট' : 'Edit Link'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setDomainTargetSite(site);
                        setCustomDomainInput(site.customDomain || '');
                        setDomainError(null);
                      }}
                      className="w-full py-2 px-1.5 bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-98"
                      title={lang === 'bn' ? 'কাস্টম ডোমেন কনফিগার করুন' : 'Configure Custom Domain'}
                    >
                      <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{site.customDomain ? (lang === 'bn' ? 'ডোমেন' : 'Domain') : (lang === 'bn' ? '+ ডোমেন' : '+ Domain')}</span>
                    </button>
                  </div>

                  {/* Tier 3: Controls (Start/Stop Website & Delete) */}
                  <div className="flex items-center gap-2 pt-0.5 w-full">
                    <button
                      onClick={() => handleToggleStatus(site)}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-98 min-h-[38px] ${
                        isOnline
                          ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                      title={isOnline ? (lang === 'bn' ? 'সাইট সাময়িক বন্ধ করুন' : 'Stop Website') : (lang === 'bn' ? 'সাইট চালু করুন' : 'Start Website')}
                    >
                      {isOnline ? (
                        <>
                          <Square className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{lang === 'bn' ? 'সাইট বন্ধ করুন' : 'Stop Website'}</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{lang === 'bn' ? 'সাইট চালু করুন' : 'Start Website'}</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setDeleteTargetSite(site)}
                      className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-98 min-h-[38px] min-w-[38px] flex items-center justify-center"
                      title={lang === 'bn' ? 'সাইট মুছে ফেলুন' : 'Delete Website'}
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Website Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-700 rounded-3xl max-w-md w-full p-6 text-slate-100 shadow-2xl relative">
            <button
              onClick={() => {
                setShowNewModal(false);
                setSlugManuallyEdited(false);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {lang === 'bn' ? 'নতুন ওয়েবসাইট হোস্ট করুন' : 'Deploy New Website'}
                </h3>
                <p className="text-xs text-slate-400">
                  {lang === 'bn' ? 'আপনার ওয়েবসাইটের নাম ও লিংক দিন' : 'Enter website name and URL link'}
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateWebsite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {lang === 'bn' ? 'ওয়েবসাইটের নাম (Website Name)' : 'Website Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'bn' ? 'যেমন: My Portfolio বা Incom Free BD' : 'e.g. My Portfolio or Incom Free BD'}
                  value={newSiteName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0b1220] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {lang === 'bn' ? 'ওয়েবসাইটের লিংক / স্লাগ (Website URL Slug)' : 'Free Website Link Slug'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="incom-free-bd"
                    value={newSiteSlug}
                    onChange={(e) => {
                      setSlugManuallyEdited(true);
                      setNewSiteSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    }}
                    className="w-full px-4 py-2.5 bg-[#0b1220] border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-cyan-400 pr-10"
                  />
                  <div className="absolute right-3 top-3">
                    {checkingSlug ? (
                      <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                    ) : slugAvailable === true ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : slugAvailable === false ? (
                      <X className="w-4 h-4 text-rose-400" />
                    ) : null}
                  </div>
                </div>

                {slugError && <p className="text-xs text-rose-400 mt-1">{slugError}</p>}
              </div>

              {/* Real-time exact Live Link Card */}
              <div className="p-3.5 bg-cyan-950/40 border border-cyan-800/60 rounded-xl">
                <div className="flex items-center justify-between gap-2 text-xs text-cyan-300 font-semibold mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{lang === 'bn' ? 'তৈরি হওয়ার পর আপনার সাইটের লাইভ লিংক হবে:' : 'Your live website link will be:'}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    HTTPS 24/7
                  </span>
                </div>
                <div className="text-sm font-mono text-cyan-300 font-bold break-all bg-black/50 px-3 py-2 rounded-lg border border-cyan-900/50 flex items-center justify-between gap-2">
                  <span>{`https://${newSiteSlug || 'incom-free-bd'}.netlify.app`}</span>
                  <span className="text-[10px] text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60 shrink-0 font-sans">
                    Netlify CDN
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 leading-relaxed">
                💡 {lang === 'bn' ? 'ওয়েবসাইট তৈরি করার পর সরাসরি Netlify-তে লাইভ হবে এবং আপনি কাস্টম ডোমেন (.com, .net, .xyz) বা যেকোনো HTML/ZIP ফাইল আপলোড করতে পারবেন।' : 'Your site deploys to Netlify with free SSL and custom domain support.'}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewModal(false);
                    setSlugManuallyEdited(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={creatingSite || slugAvailable === false || !newSiteSlug.trim()}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  {creatingSite ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    lang === 'bn' ? 'তৈরি করুন' : 'Create Website'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Website Name & Slug Modal */}
      {editSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-700 rounded-3xl max-w-md w-full p-6 text-slate-100 shadow-2xl relative">
            <button
              onClick={() => setEditSite(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {lang === 'bn' ? 'ওয়েবসাইটের নাম ও লিংক পরিবর্তন' : 'Edit Website Name & Link'}
                </h3>
                <p className="text-xs text-slate-400">
                  {lang === 'bn' ? 'পছন্দসই নাম দিন এবং যে নামে লিংক চান তা লিখুন' : 'Set custom name and exact link for your website'}
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateWebsite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {lang === 'bn' ? 'ওয়েবসাইটের নাম (Website Name)' : 'Website Name'}
                </label>
                <input
                  type="text"
                  required
                  value={editSiteName}
                  onChange={(e) => setEditSiteName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0b1220] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {lang === 'bn' ? 'ওয়েবসাইটের লিংক / স্লাগ (Website URL Slug)' : 'Website URL Slug'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={editSiteSlug}
                    onChange={(e) => setEditSiteSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full px-4 py-2.5 bg-[#0b1220] border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-cyan-400 pr-10"
                  />
                  <div className="absolute right-3 top-3">
                    {editCheckingSlug ? (
                      <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                    ) : editSlugAvailable === true ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : editSlugAvailable === false ? (
                      <X className="w-4 h-4 text-rose-400" />
                    ) : null}
                  </div>
                </div>

                {editSlugError && <p className="text-xs text-rose-400 mt-1">{editSlugError}</p>}
              </div>

              {/* Exact Live Link Preview */}
              <div className="p-3.5 bg-cyan-950/40 border border-cyan-800/60 rounded-xl">
                <div className="flex items-center justify-between gap-2 text-xs text-cyan-300 font-semibold mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{lang === 'bn' ? 'সেভ করার পর নতুন লাইভ লিংক হবে:' : 'New live website link will be:'}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    HTTPS 24/7
                  </span>
                </div>
                <div className="text-sm font-mono text-cyan-300 font-bold break-all bg-black/50 px-3 py-2 rounded-lg border border-cyan-900/50 flex items-center justify-between gap-2">
                  <span>{`https://${editSiteSlug || 'your-name'}.netlify.app`}</span>
                  <span className="text-[10px] text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60 shrink-0 font-sans">
                    Netlify CDN
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  ℹ️ {lang === 'bn' ? 'পূর্বের লিংকটিও সুরক্ষিত থাকবে এবং নতুন লিংকেও স্বয়ংক্রিয়ভাবে ভিজিট করা যাবে।' : 'Previous link will also route seamlessly.'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditSite(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={updatingSite || editSlugAvailable === false || !editSiteSlug.trim()}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  {updatingSite ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    lang === 'bn' ? 'আপডেট ও সেভ করুন' : 'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deploy / Redeploy Modal */}
      {deployTargetSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-700 rounded-3xl max-w-lg w-full p-6 text-slate-100 shadow-2xl relative">
            <button
              onClick={() => {
                setDeployTargetSite(null);
                setSelectedZip(null);
                setSelectedFiles([]);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {lang === 'bn' ? 'ফাইল আপলোড ও ডিপ্লয়' : 'Deploy Website Files'}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {deployTargetSite.name} ({deployTargetSite.slug})
                </p>
              </div>
            </div>

            {/* Method Tabs */}
            <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-2xl mb-5">
              <button
                type="button"
                onClick={() => setDeployMethod('zip')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  deployMethod === 'zip'
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Archive className="w-4 h-4" />
                <span>{lang === 'bn' ? 'পদ্ধতি ১: ZIP আপলোড' : 'Method A: Upload ZIP'}</span>
              </button>

              <button
                type="button"
                onClick={() => setDeployMethod('files')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  deployMethod === 'files'
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileCode className="w-4 h-4" />
                <span>{lang === 'bn' ? 'পদ্ধতি ২: মাল্টি-ফাইল আপলোড' : 'Method B: Upload Files'}</span>
              </button>
            </div>

            {/* Upload Area */}
            {deployMethod === 'zip' ? (
              <div className="space-y-4">
                <input
                  type="file"
                  ref={zipInputRef}
                  accept=".zip"
                  onChange={handleZipSelection}
                  className="hidden"
                />
                <div
                  onClick={() => zipInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-cyan-400 rounded-2xl p-8 text-center bg-slate-900/50 hover:bg-slate-900 transition-all cursor-pointer"
                >
                  <Archive className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
                  <p className="text-sm font-bold text-white mb-1">
                    {selectedZip ? selectedZip.name : (lang === 'bn' ? 'একটি .ZIP ফাইল নির্বাচন করুন' : 'Click to select .ZIP file')}
                  </p>
                  <p className="text-xs text-slate-400">
                    {selectedZip
                      ? formatBytes(selectedZip.size)
                      : (lang === 'bn' ? 'index.html সহ আপনার পুরো ওয়েবসাইটের জিপ ফাইল' : 'Containing index.html, style.css, assets')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <input
                  type="file"
                  multiple
                  ref={filesInputRef}
                  onChange={handleFilesSelection}
                  className="hidden"
                />
                <div
                  onClick={() => filesInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-cyan-400 rounded-2xl p-6 text-center bg-slate-900/50 hover:bg-slate-900 transition-all cursor-pointer"
                >
                  <FileCode className="w-10 h-10 text-cyan-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-white mb-1">
                    {selectedFiles.length > 0
                      ? `${selectedFiles.length} ${lang === 'bn' ? 'টি ফাইল নির্বাচিত' : 'files selected'}`
                      : (lang === 'bn' ? 'ফাইল নির্বাচন করুন (সিঙ্গেল HTML বা মাল্টিপল ফাইল)' : 'Click to select files (Single HTML or Multiple Files)')}
                  </p>
                  <p className="text-xs text-slate-400">
                    {lang === 'bn' ? 'যেকোনো HTML, CSS, JS, PNG, JPG, JSON ইত্যাদি ফাইল গ্রহণযোগ্য' : 'HTML, CSS, JS, Images, JSON, Fonts accepted'}
                  </p>
                </div>

                {/* Helpful Single HTML Note */}
                <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-xs text-cyan-200 leading-relaxed flex items-start gap-2">
                  <span className="text-sm">💡</span>
                  <span>
                    {lang === 'bn'
                      ? 'যেকোনো সিঙ্গেল HTML ফাইল (যেমন Mota ai.html বা portfolio.html) আপলোড করলে তা স্বয়ংক্রিয়ভাবে মূল হোমপেজ (index.html) হিসেবে সেট হয়ে যাবে এবং সরাসরি লিংকে আপনার সাইট লাইভ চালু হবে।'
                      : 'Uploading any single HTML file will automatically set it as the main homepage (index.html) and launch your site live.'}
                  </span>
                </div>

                {/* List of Selected Files */}
                {selectedFiles.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs">
                    {selectedFiles.map((file, idx) => {
                      const isHtml = /\.(html|htm)$/i.test(file.name);
                      return (
                        <div key={idx} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-800/60">
                          <span className="font-mono text-slate-200 truncate">{file.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isHtml && (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                                {lang === 'bn' ? '✓ লাইভ হোমপেজ' : '✓ Live Homepage'}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400">{formatBytes(file.size)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeployTargetSite(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={uploadingDeploy || (deployMethod === 'zip' ? !selectedZip : selectedFiles.length === 0)}
                onClick={handleExecuteDeploy}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-bold rounded-xl text-xs shadow transition-all cursor-pointer disabled:opacity-50"
              >
                {uploadingDeploy ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{lang === 'bn' ? 'ডিপ্লয় হচ্ছে...' : 'Deploying...'}</span>
                  </div>
                ) : (
                  lang === 'bn' ? 'লাইভ ডিপ্লয় করুন' : 'Deploy Website'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Files Browser Modal */}
      {browseSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-700 rounded-3xl max-w-xl w-full p-6 text-slate-100 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setBrowseSite(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Folder className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {lang === 'bn' ? 'ওয়েবসাইট ফাইল ম্যানেজার' : 'Website File Explorer'}
                </h3>
                <p className="text-xs text-slate-400 font-mono">{browseSite.name}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2 border border-slate-800 rounded-2xl p-3 bg-slate-900/60">
              {loadingFiles ? (
                <div className="p-8 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                  <p className="text-xs">{lang === 'bn' ? 'ফাইল লোড হচ্ছে...' : 'Loading files...'}</p>
                </div>
              ) : fileList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  {lang === 'bn' ? 'কোনো ফাইল পাওয়া যায়নি' : 'No files found in directory'}
                </div>
              ) : (
                fileList.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#0b1220] border border-slate-800/80 text-xs hover:border-slate-700"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="font-mono text-slate-300 truncate">{f.path}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 shrink-0 font-mono">
                      {formatBytes(f.size)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setBrowseSite(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Interactive Preview Modal */}
      {previewSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0b1222] border border-cyan-500/30 rounded-2xl sm:rounded-3xl max-w-5xl w-full h-[90vh] text-slate-100 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Browser-like Header */}
            <div className="px-4 py-3 bg-[#070b14] border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center gap-1.5 mr-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <span className="text-xs font-bold text-white truncate font-mono">
                  {previewSite.name}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {lang === 'bn' ? 'লাইভ প্রিভিউ' : 'LIVE'}
                </span>
              </div>

              {/* Address Bar */}
              <div className="flex-1 max-w-md hidden sm:flex items-center bg-[#0e1628] border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-mono truncate">
                <span className="text-emerald-400 mr-1.5">🔒</span>
                <span className="truncate">{`https://${previewSite.slug}.run.app`}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    const iframe = document.getElementById('preview-site-iframe') as HTMLIFrameElement;
                    if (iframe) iframe.src = `/site/${previewSite.slug}/?t=${Date.now()}`;
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  title={lang === 'bn' ? 'রিফ্রেশ' : 'Refresh'}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <a
                  href={`/site/${previewSite.slug}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 transition-colors cursor-pointer"
                  title={lang === 'bn' ? 'নতুন ট্যাবে সাইট ওপেন করুন' : 'Open in New Tab'}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setPreviewSite(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors cursor-pointer"
                  title={lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Live Iframe Body */}
            <div className="flex-1 w-full h-full bg-[#030407] relative">
              <iframe
                id="preview-site-iframe"
                src={`/site/${previewSite.slug}/`}
                title={previewSite.name}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-rose-500/40 rounded-3xl max-w-sm w-full p-6 text-slate-100 shadow-2xl relative text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              {lang === 'bn' ? 'ওয়েবসাইট মুছে ফেলবেন?' : 'Delete Website?'}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              {lang === 'bn'
                ? `আপনি কি নিশ্চিত যে "${deleteTargetSite.name}" এবং এর সমস্ত ফাইল স্থায়ীভাবে ডিলিট করতে চান?`
                : `Are you sure you want to permanently delete "${deleteTargetSite.name}" and all uploaded files?`}
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteTargetSite(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                disabled={deleting}
                onClick={handleDeleteSite}
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs shadow cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  lang === 'bn' ? 'হ্যাঁ, ডিলিট করুন' : 'Yes, Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Domain Modal */}
      {domainTargetSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0b1222] border border-amber-500/40 rounded-3xl max-w-lg w-full text-slate-100 shadow-2xl overflow-hidden flex flex-col relative">
            <div className="p-6 bg-[#070b14] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {lang === 'bn' ? 'কাস্টম ডোমেন যুক্ত করুন' : 'Add Custom Domain'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {domainTargetSite.name} ({domainTargetSite.slug}.netlify.app)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDomainTargetSite(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {lang === 'bn' ? 'আপনার নিজস্ব ডোমেন নাম লিখুন (Domain Name):' : 'Enter Your Custom Domain:'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. mywebsite.com বা www.mybrand.xyz"
                    value={customDomainInput}
                    onChange={(e) => setCustomDomainInput(e.target.value.toLowerCase().replace(/https?:\/\//, ''))}
                    className="w-full px-4 py-3 bg-[#060c18] border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                  />
                  <div className="absolute right-3 top-3.5">
                    <Globe className="w-4 h-4 text-amber-400" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {lang === 'bn'
                    ? 'আপনার কেনা যেকোনো .com, .net, .org, .xyz বা সাব-ডোমেন লিখতে পারেন।'
                    : 'Enter any domain or subdomain you own (e.g. mywebsite.com or shop.mywebsite.com).'}
                </p>
                {domainError && <p className="text-xs text-rose-400 mt-2 font-medium">{domainError}</p>}
              </div>

              {/* DNS Setup Guide Card */}
              <div className="p-4 rounded-2xl bg-[#060c18] border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Sparkles className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'সহজ DNS সেটআপ গাইড (ডোমেন প্যানেলে দিন):' : 'DNS Setup Records (Add to your domain DNS):'}</span>
                </div>

                <div className="overflow-x-auto text-xs font-mono">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                        <th className="py-1.5 px-2">Type</th>
                        <th className="py-1.5 px-2">Host / Name</th>
                        <th className="py-1.5 px-2">Value / Points to</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px]">
                      <tr>
                        <td className="py-2 px-2 text-cyan-400 font-bold">CNAME</td>
                        <td className="py-2 px-2">@ বা www</td>
                        <td className="py-2 px-2 text-emerald-400 break-all select-all font-bold">
                          {domainTargetSite.slug}.netlify.app
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2 text-cyan-400 font-bold">A Record</td>
                        <td className="py-2 px-2">@</td>
                        <td className="py-2 px-2 text-emerald-400 font-bold select-all">
                          75.2.60.5
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {lang === 'bn'
                      ? 'ডোমেন সেভ করার পর Netlify স্বয়ংক্রিয়ভাবে ফ্রি লাইফটাইম SSL (HTTPS) সক্রিয় করে নিবে।'
                      : 'Netlify automatically provisions free Let\'s Encrypt SSL once DNS propagates.'}
                  </span>
                </div>
              </div>

              {domainTargetSite.customDomain && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
                  <div>
                    <span className="font-bold">বর্তমান ডোমেন: </span>
                    <a href={`https://${domainTargetSite.customDomain}`} target="_blank" rel="noreferrer" className="underline font-mono">
                      https://{domainTargetSite.customDomain}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomDomainInput('');
                      handleSaveCustomDomain();
                    }}
                    disabled={domainSaving}
                    className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer"
                  >
                    ডোমেন মুছুন
                  </button>
                </div>
              )}
            </div>

            <div className="p-5 bg-[#070b14] border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setDomainTargetSite(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>

              <button
                type="button"
                disabled={domainSaving}
                onClick={handleSaveCustomDomain}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {domainSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{lang === 'bn' ? 'সেভ হচ্ছে...' : 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{lang === 'bn' ? 'ডোমেন সেভ করুন' : 'Save Domain'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
