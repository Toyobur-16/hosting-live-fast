import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Check,
  AlertCircle,
  CreditCard,
  QrCode,
  Upload,
  CheckCircle2,
  Loader2,
  Sparkles,
  Eye,
  X,
  Layers,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { DepositMethodItem, DEFAULT_DEPOSIT_METHODS } from '../../types';
import { db, doc, getDoc, setDoc, onSnapshot } from '../../lib/firebase';

interface AdminDepositMethodsManagerProps {
  lang?: 'bn' | 'en';
}

export const AdminDepositMethodsManager: React.FC<AdminDepositMethodsManagerProps> = ({
  lang = 'bn'
}) => {
  const [methods, setMethods] = useState<DepositMethodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'edit'>('list');
  const [editingMethod, setEditingMethod] = useState<DepositMethodItem | null>(null);

  // Form states
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formCategory, setFormCategory] = useState<'mfs' | 'crypto' | 'custom'>('crypto');
  const [formCurrency, setFormCurrency] = useState<'USDT' | 'USD' | 'BDT'>('USDT');
  const [formAccountValue, setFormAccountValue] = useState('');
  const [formAccountLabel, setFormAccountLabel] = useState('');
  const [formMemo, setFormMemo] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [formLogoType, setFormLogoType] = useState<DepositMethodItem['logoType']>('binance');
  const [formQrImageUrl, setFormQrImageUrl] = useState('');
  const [formRateToBdt, setFormRateToBdt] = useState<number>(120);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Real-time Firestore sync & Initial fetch
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    try {
      const configDocRef = doc(db, 'config', 'deposit_methods');
      unsubscribe = onSnapshot(configDocRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (Array.isArray(data?.methods) && data.methods.length > 0) {
            setMethods(data.methods);
            setLoading(false);
            return;
          }
        }
      }, () => {
        // Fallback to REST API if Firestore listener fails
        fetchFromApi();
      });
    } catch {
      fetchFromApi();
    }

    fetchFromApi();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const fetchFromApi = async () => {
    try {
      const res = await fetch('/api/deposit-methods');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.methods) && data.methods.length > 0) {
          setMethods(data.methods);
        }
      }
    } catch (e) {
      console.error('Failed to load deposit methods:', e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormId('');
    setFormName('');
    setFormSubtitle('');
    setFormCategory('crypto');
    setFormCurrency('USDT');
    setFormAccountValue('');
    setFormAccountLabel('');
    setFormMemo('');
    setFormInstructions('');
    setFormLogoType('binance');
    setFormQrImageUrl('');
    setFormRateToBdt(120);
    setEditingMethod(null);
    setMessage(null);
  };

  const handleStartEdit = (m: DepositMethodItem) => {
    setEditingMethod(m);
    setFormId(m.id);
    setFormName(m.name);
    setFormSubtitle(m.subtitle || '');
    setFormCategory(m.category);
    setFormCurrency(m.currency);
    setFormAccountValue(m.accountValue);
    setFormAccountLabel(m.accountLabel || '');
    setFormMemo(m.memoOrTag || '');
    setFormInstructions(m.instructions || '');
    setFormLogoType(m.logoType);
    setFormQrImageUrl(m.qrImageUrl || '');
    setFormRateToBdt(m.rateToBdt || 120);
    setActiveTab('edit');
    setMessage(null);
  };

  const handleStartAdd = () => {
    resetForm();
    const newId = `method_${Date.now()}`;
    setFormId(newId);
    setFormSubtitle('USDT');
    setActiveTab('add');
  };

  // Upload QR code or payment icon directly
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const token = localStorage.getItem('bot_auth_token');
        const res = await fetch('/api/admin/upload-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            fileName: file.name,
            fileData: base64,
            fileType: 'payment_qr'
          })
        });
        const data = await res.json();
        if (res.ok && data.url) {
          setFormQrImageUrl(data.url);
          // Also save in site_images doc in Firestore permanently
          try {
            const imgId = `qr_${Date.now()}`;
            await setDoc(doc(db, 'site_images', imgId), {
              url: data.url,
              dataUrl: base64,
              type: 'payment_qr',
              createdAt: Date.now()
            });
          } catch {}
          setMessage({
            type: 'success',
            text: lang === 'bn' ? 'ছবি / কিউআর কোড ক্লাউড ফায়ারবেসে সফলভাবে আপলোড হয়েছে!' : 'QR image uploaded to Firebase successfully!'
          });
        } else {
          // If server upload failed, use data URL directly
          setFormQrImageUrl(base64);
          setMessage({
            type: 'success',
            text: lang === 'bn' ? 'ছবি সফলভাবে লোড হয়েছে!' : 'Image loaded successfully!'
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'ছবি আপলোড ব্যর্থ হয়েছে' });
    } finally {
      setUploadingImage(false);
    }
  };

  // Sync updated methods list to Firestore AND REST API
  const persistMethods = async (updatedList: DepositMethodItem[]): Promise<boolean> => {
    setSaving(true);
    let success = false;
    try {
      // 1. Write directly to Firestore document `config/deposit_methods`
      try {
        await setDoc(
          doc(db, 'config', 'deposit_methods'),
          {
            methods: updatedList,
            updatedAt: Date.now()
          },
          { merge: true }
        );
        success = true;
      } catch (fsErr) {
        console.warn('Firestore write warning:', fsErr);
      }

      // 2. Write to backend API endpoint `/api/deposit-methods`
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/deposit-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ methods: updatedList })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMethods(data.methods || updatedList);
        success = true;
      } else if (success) {
        setMethods(updatedList);
      }
    } catch (err) {
      console.error('Error persisting deposit methods:', err);
    } finally {
      setSaving(false);
    }
    return success;
  };

  // Save (Add or Update) Method
  const handleSaveMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setMessage({ type: 'error', text: lang === 'bn' ? 'মেথডের নাম লিখুন' : 'Method name is required' });
      return;
    }
    if (!formAccountValue.trim()) {
      setMessage({
        type: 'error',
        text: lang === 'bn' ? 'একাউন্ট নাম্বার বা ওয়ালেট এড্রেস দিন' : 'Account value / wallet address is required'
      });
      return;
    }

    const itemToSave: DepositMethodItem = {
      id: formId || (editingMethod ? editingMethod.id : `method_${Date.now()}`),
      name: formName.trim(),
      subtitle: formSubtitle.trim() || (formCategory === 'mfs' ? 'Send Money' : formCurrency),
      category: formCategory,
      currency: formCurrency,
      accountValue: formAccountValue.trim(),
      accountLabel: formAccountLabel.trim() || `${formName.trim()} এড্রেস / নম্বর:`,
      memoOrTag: formMemo.trim() || undefined,
      instructions: formInstructions.trim() || `${formName} এর উল্লেখিত একাউন্টে পেমেন্ট করে TrxID বা TxHash নিচে দিন।`,
      logoType: formLogoType,
      qrImageUrl: formQrImageUrl.trim() || undefined,
      enabled: editingMethod ? editingMethod.enabled : true,
      rateToBdt: formCurrency === 'BDT' ? formRateToBdt : undefined
    };

    let updatedList: DepositMethodItem[];
    const existingIndex = methods.findIndex((m) => m.id === itemToSave.id);
    if (existingIndex >= 0) {
      updatedList = [...methods];
      updatedList[existingIndex] = itemToSave;
    } else {
      updatedList = [...methods, itemToSave];
    }

    const ok = await persistMethods(updatedList);
    if (ok) {
      setMessage({
        type: 'success',
        text: lang === 'bn' ? 'ডিপোজিট মেথড ফায়ারবেজ ও ডাটাবেজে সফলভাবে সংরক্ষিত হয়েছে!' : 'Deposit method saved to Firebase successfully!'
      });
      setTimeout(() => {
        setActiveTab('list');
        resetForm();
      }, 700);
    } else {
      setMessage({
        type: 'error',
        text: lang === 'bn' ? 'সংরক্ষণ ব্যর্থ হয়েছে। এডমিন অনুমতি যাচাই করুন।' : 'Failed to save. Please verify admin privileges.'
      });
    }
  };

  // Delete Method
  const handleDeleteMethod = async (id: string) => {
    const updatedList = methods.filter((m) => m.id !== id);
    const ok = await persistMethods(updatedList);
    if (ok) {
      setDeleteConfirmId(null);
      setMessage({
        type: 'success',
        text: lang === 'bn' ? 'মেথডটি সম্পূর্ণ ডিলিট করা হয়েছে!' : 'Deposit method deleted permanently!'
      });
    } else {
      setMessage({
        type: 'error',
        text: lang === 'bn' ? 'ডিলিট ব্যর্থ হয়েছে' : 'Failed to delete method'
      });
    }
  };

  // Toggle Enabled/Disabled
  const handleToggleEnabled = async (m: DepositMethodItem) => {
    const updatedList = methods.map((item) => {
      if (item.id === m.id) {
        return { ...item, enabled: !item.enabled };
      }
      return item;
    });
    await persistMethods(updatedList);
  };

  // Reset to Default Methods
  const handleResetToDefault = async () => {
    const confirmText = lang === 'bn'
      ? 'আপনি কি নিশ্চিত যে সকল ডিপোজিট মেথড ডিফল্ট অবস্থায় রিস্টোর করতে চান? (bKash, Nagad, Binance, BEP-20, TRC-20)'
      : 'Are you sure you want to restore default deposit methods?';
    if (!window.confirm(confirmText)) return;

    const ok = await persistMethods(DEFAULT_DEPOSIT_METHODS);
    if (ok) {
      setMessage({
        type: 'success',
        text: lang === 'bn' ? 'ডিফল্ট মেথডসমূহ রিস্টোর ও ফায়ারবেসে সেভ হয়েছে!' : 'Default deposit methods restored and saved to Firebase!'
      });
    }
  };

  const renderBadge = (m: DepositMethodItem) => {
    if (m.category === 'mfs') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-pink-500/15 border border-pink-500/30 text-pink-400 text-[10px] font-black uppercase">
          MFS (BDT)
        </span>
      );
    }
    if (m.category === 'crypto') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase">
          CRYPTO ({m.currency})
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase">
        CUSTOM
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#090f1e] border border-[#1d2d48] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black text-white">
              {lang === 'bn' ? 'ডিপোজিট মেথড এডমিন ম্যানেজমেন্ট' : 'Deposit Methods & Gateway Manager'}
            </h3>
            <span className="px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-400 text-[10px] font-bold">
              🔥 Firebase Synced
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'bn'
              ? 'শুধুমাত্র এডমিনরা এখান থেকে ডিপোজিট মেথড যোগ, এডিট এবং ডিলিট করতে পারবেন। সাধারণ ইউজারদের কাছে ম্যানেজ বা ডিলিট বাটন দেখানো হয় না।'
              : 'Only admins can add, edit, or delete deposit methods here. Regular users can only submit deposits.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleStartAdd}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer transition active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{lang === 'bn' ? 'নতুন মেথড যোগ করুন' : 'Add New Method'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetToDefault}
            disabled={saving}
            className="px-3 py-2 rounded-xl bg-[#141f33] hover:bg-[#1a2942] border border-[#223554] text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
            title={lang === 'bn' ? 'ডিফল্ট মেথড রিস্টোর' : 'Restore defaults'}
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">{lang === 'bn' ? 'ডিফল্ট রিস্টোর' : 'Restore Defaults'}</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {message && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in ${
            message.type === 'success'
              ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/70 border border-rose-500/50 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="p-1 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tabs Switcher (List vs Form) */}
      <div className="flex items-center gap-2 border-b border-[#1b2b45] pb-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab('list');
            setMessage(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'list'
              ? 'bg-amber-400 text-slate-950 font-black shadow-md'
              : 'bg-[#0f172a] text-slate-400 hover:text-white border border-[#1e2d48]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{lang === 'bn' ? `সকল মেথড তালিকা (${methods.length})` : `All Methods (${methods.length})`}</span>
        </button>

        {activeTab !== 'list' && (
          <button
            type="button"
            className="px-4 py-2 rounded-xl text-xs font-black bg-amber-400 text-slate-950 shadow-md flex items-center gap-2"
          >
            {activeTab === 'add' ? <Plus className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
            <span>
              {activeTab === 'add'
                ? lang === 'bn'
                  ? 'নতুন মেথড ফর্ম'
                  : 'New Method Form'
                : lang === 'bn'
                ? `এডিট: ${editingMethod?.name}`
                : `Edit: ${editingMethod?.name}`}
            </span>
          </button>
        )}
      </div>

      {/* TAB 1: LIST OF METHODS */}
      {activeTab === 'list' && (
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              <span className="text-xs">{lang === 'bn' ? 'ফায়ারবেজ থেকে মেথডসমূহ লোড হচ্ছে...' : 'Loading methods from Firebase...'}</span>
            </div>
          ) : methods.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#0a1120] border border-dashed border-[#1f2d48] space-y-3">
              <p className="text-sm text-slate-400">
                {lang === 'bn' ? 'কোনো ডিপোজিট মেথড পাওয়া যায়নি।' : 'No deposit methods configured yet.'}
              </p>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'ডিফল্ট মেথড রিস্টোর করুন' : 'Restore Default Methods'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {methods.map((m) => (
                <div
                  key={m.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    m.enabled
                      ? 'bg-[#0a1120] border-[#1e2f4a] hover:border-slate-600'
                      : 'bg-[#070b14] border-red-950/30 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Logo / QR Thumbnail */}
                      {m.qrImageUrl ? (
                        <img
                          src={m.qrImageUrl}
                          alt={m.name}
                          className="w-10 h-10 rounded-xl object-cover border border-white/20 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#142036] border border-[#213454] flex items-center justify-center font-bold text-xs text-amber-400 shrink-0">
                          {m.name.slice(0, 3).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black text-white truncate">{m.name}</h4>
                          {renderBadge(m)}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {m.subtitle} • {m.currency}
                        </p>
                      </div>
                    </div>

                    {/* Enable / Disable Switch */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <label className="flex items-center gap-1 cursor-pointer text-[11px] font-semibold text-slate-300">
                        <input
                          type="checkbox"
                          checked={m.enabled}
                          onChange={() => handleToggleEnabled(m)}
                          className="accent-emerald-500 rounded"
                        />
                        <span className={m.enabled ? 'text-emerald-400' : 'text-slate-500'}>
                          {m.enabled ? (lang === 'bn' ? 'সক্রিয়' : 'Active') : (lang === 'bn' ? 'বন্ধ' : 'Inactive')}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Account Value & Details */}
                  <div className="mt-3 p-2.5 rounded-xl bg-[#050810] border border-[#141f33] space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {m.accountLabel || (lang === 'bn' ? 'একাউন্ট / এড্রেস:' : 'Account / Address:')}
                    </div>
                    <div className="text-xs font-mono text-emerald-400 font-bold break-all select-all">
                      {m.accountValue}
                    </div>
                    {m.memoOrTag && (
                      <div className="text-[11px] text-amber-300 font-mono">
                        <span className="text-slate-400 font-sans text-[10px]">Memo/Tag: </span>
                        {m.memoOrTag}
                      </div>
                    )}
                    {m.rateToBdt && m.currency === 'BDT' && (
                      <div className="text-[10px] text-slate-400">
                        কনভার্সন রেট: 1 USDT = {m.rateToBdt} BDT
                      </div>
                    )}
                  </div>

                  {/* Instructions */}
                  {m.instructions && (
                    <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 italic">
                      "{m.instructions}"
                    </p>
                  )}

                  {/* Actions: Edit & Delete */}
                  <div className="mt-3 pt-3 border-t border-[#141f33] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(m)}
                      className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 font-bold text-xs flex items-center gap-1.5 border border-sky-500/30 cursor-pointer transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{lang === 'bn' ? 'এডিট করুন' : 'Edit'}</span>
                    </button>

                    {deleteConfirmId === m.id ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in">
                        <span className="text-[10px] font-bold text-rose-400">
                          {lang === 'bn' ? 'নিশ্চিত?' : 'Confirm?'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteMethod(m.id)}
                          disabled={saving}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-xs cursor-pointer"
                        >
                          {lang === 'bn' ? 'হ্যাঁ, মুছুন' : 'Yes, Delete'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs cursor-pointer"
                        >
                          {lang === 'bn' ? 'না' : 'No'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(m.id)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center gap-1.5 border border-rose-500/20 cursor-pointer transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{lang === 'bn' ? 'ডিলিট করুন' : 'Delete'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2 & 3: ADD OR EDIT FORM */}
      {(activeTab === 'add' || activeTab === 'edit') && (
        <form onSubmit={handleSaveMethod} className="p-5 rounded-2xl bg-[#090f1e] border border-[#1e2f4a] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1b2b45]">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>
                {activeTab === 'add'
                  ? lang === 'bn'
                    ? 'নতুন ডিপোজিট মেথড যোগ করুন'
                    : 'Add New Deposit Method'
                  : lang === 'bn'
                  ? 'ডিপোজিট মেথড পরিবর্তন করুন'
                  : 'Edit Deposit Method'}
              </span>
            </h4>
            <button
              type="button"
              onClick={() => {
                setActiveTab('list');
                resetForm();
              }}
              className="px-3 py-1 text-xs text-slate-400 hover:text-white rounded-lg bg-slate-800/80 cursor-pointer"
            >
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Category */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                {lang === 'bn' ? 'ক্যাটাগরি (Category):' : 'Category:'}
              </label>
              <select
                value={formCategory}
                onChange={(e) => {
                  const cat = e.target.value as any;
                  setFormCategory(cat);
                  if (cat === 'mfs') {
                    setFormCurrency('BDT');
                    setFormLogoType('bkash');
                  } else if (cat === 'crypto') {
                    setFormCurrency('USDT');
                    setFormLogoType('binance');
                  } else {
                    setFormLogoType('custom');
                  }
                }}
                className="w-full bg-[#05080f] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="mfs">মোবাইল ব্যাংকিং MFS (bKash, Nagad, Rocket, Upay - BDT)</option>
                <option value="crypto">ক্রিপ্টোকারেন্সি Crypto (Binance Pay, USDT, BEP-20, TRC-20, SOL)</option>
                <option value="custom">কাস্টম গেটওয়ে Custom (Bank, Cash, Agent, Manual)</option>
              </select>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                {lang === 'bn' ? 'কারেন্সি (Currency):' : 'Currency:'}
              </label>
              <select
                value={formCurrency}
                onChange={(e) => setFormCurrency(e.target.value as any)}
                className="w-full bg-[#05080f] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="USDT">USDT (ডলার)</option>
                <option value="USD">USD (ডলার)</option>
                <option value="BDT">BDT (বাংলাদেশি টাকা)</option>
              </select>
            </div>

            {/* Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                {lang === 'bn' ? 'মেথডের নাম (Name):' : 'Method Name:'} *
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={lang === 'bn' ? 'যেমন: bKash, Nagad, Binance Pay, Rocket' : 'e.g. bKash, Binance Pay'}
                className="w-full bg-[#05080f] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                {lang === 'bn' ? 'সাব-টাইটেল / নেটওয়ার্ক (Subtitle/Network):' : 'Subtitle / Network:'}
              </label>
              <input
                type="text"
                value={formSubtitle}
                onChange={(e) => setFormSubtitle(e.target.value)}
                placeholder={lang === 'bn' ? 'যেমন: Send Money, BEP20, TRC20, Agent' : 'e.g. Send Money, TRC20'}
                className="w-full bg-[#05080f] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Account Value */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                {lang === 'bn' ? 'একাউন্ট নম্বর / ওয়ালেট এড্রেস / Pay ID:' : 'Account Number / Wallet Address / Pay ID:'} *
              </label>
              <input
                type="text"
                required
                value={formAccountValue}
                onChange={(e) => setFormAccountValue(e.target.value)}
                placeholder={lang === 'bn' ? 'যেমন: 01614572747 অথবা 0xadf205663826... অথবা 922593999' : 'e.g. 01614572747 or 0xadf...'}
                className="w-full bg-[#05080f] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>

            {/* Account Label */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                {lang === 'bn' ? 'লেবেল (Label shown above number):' : 'Account Label:'}
              </label>
              <input
                type="text"
                value={formAccountLabel}
                onChange={(e) => setFormAccountLabel(e.target.value)}
                placeholder={lang === 'bn' ? 'যেমন: বিকাশ পার্সোনাল নম্বর (Send Money):' : 'e.g. bKash Personal Number:'}
                className="w-full bg-[#05080f] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Memo / Tag */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                {lang === 'bn' ? 'মেমো / ট্যাগ (Memo/Tag - ঐচ্ছিক):' : 'Memo / Tag (Optional):'}
              </label>
              <input
                type="text"
                value={formMemo}
                onChange={(e) => setFormMemo(e.target.value)}
                placeholder={lang === 'bn' ? 'ট্যাগ বা মেমো থাকলে লিখুন (যেমন TON মেমো)' : 'Optional Memo or Tag'}
                className="w-full bg-[#05080f] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>

            {/* Instructions */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                {lang === 'bn' ? 'ইউজারের জন্য পেমেন্ট নির্দেশনা (Instructions):' : 'Instructions for User:'}
              </label>
              <textarea
                rows={2}
                value={formInstructions}
                onChange={(e) => setFormInstructions(e.target.value)}
                placeholder={lang === 'bn' ? 'পেমেন্ট সম্পন্ন করে নিচের বক্সে TrxID বা TxHash দিন...' : 'Payment instructions...'}
                className="w-full bg-[#05080f] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Rate to BDT (if BDT currency) */}
            {formCurrency === 'BDT' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  {lang === 'bn' ? 'ডলার রেট (1 USDT = কত টাকা?):' : 'USDT to BDT Rate:'}
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  max="500"
                  value={formRateToBdt || ''}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormRateToBdt(val === '' ? ('' as any) : Number(val));
                  }}
                  className="w-full bg-[#05080f] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            )}

            {/* QR / Image Upload Section */}
            <div className="sm:col-span-2 p-3.5 rounded-xl bg-[#050912] border border-[#141f33] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-200">
                    📷 {lang === 'bn' ? 'পেমেন্ট QR কোড বা ছবি আপলোড (Cloud Upload)' : 'Payment QR Code or Picture Upload'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {lang === 'bn'
                      ? 'ডিপোজিট পেজে ইউজাররা এই QR কোড স্ক্যান করে সরাসরি পেমেন্ট করতে পারবেন।'
                      : 'Users can scan this QR code directly on the deposit page.'}
                  </div>
                </div>

                <label className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition">
                  {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{uploadingImage ? 'আপলোড হচ্ছে...' : 'ছবি / QR আপলোড'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>

              {formQrImageUrl ? (
                <div className="flex items-center gap-3 pt-2">
                  <img
                    src={formQrImageUrl}
                    alt="Uploaded QR"
                    className="w-16 h-16 rounded-xl object-contain bg-black/60 border border-amber-500/40 p-1"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      {lang === 'bn' ? 'ছবি ক্লাউডে যুক্ত আছে' : 'Image attached'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormQrImageUrl('')}
                      className="mt-1 text-[10px] text-rose-400 hover:underline cursor-pointer"
                    >
                      {lang === 'bn' ? 'ছবি রিমুভ করুন' : 'Remove Image'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-slate-500 italic">
                  {lang === 'bn' ? 'কোনো QR কোড ছবি আপলোড করা হয়নি (ঐচ্ছিক)' : 'No QR image attached (optional)'}
                </div>
              )}
            </div>
          </div>

          {/* Form Submit Buttons */}
          <div className="pt-3 border-t border-[#1b2b45] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('list');
                resetForm();
              }}
              className="px-4 py-2 rounded-xl bg-[#141f33] hover:bg-[#1a2942] text-slate-300 font-bold text-xs cursor-pointer transition"
            >
              {lang === 'bn' ? 'বাতিল করুন' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer transition active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
              <span>
                {saving
                  ? lang === 'bn'
                    ? 'ফায়ারবেজে সেভ হচ্ছে...'
                    : 'Saving to Firebase...'
                  : lang === 'bn'
                  ? 'ডিপোজিট মেথড সেভ করুন'
                  : 'Save Deposit Method'}
              </span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
