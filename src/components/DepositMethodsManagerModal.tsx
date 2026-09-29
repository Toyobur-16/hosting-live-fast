import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Check,
  AlertCircle,
  CreditCard,
  QrCode,
  Upload,
  CheckCircle2
} from 'lucide-react';
import { DepositMethodItem } from '../types';
import { BkashLogo, NagadLogo, BinanceLogo, BscLogo, TronLogo, PolygonLogo, TonLogo } from './DepositStorePage';

interface DepositMethodsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  methods: DepositMethodItem[];
  onMethodsUpdated: (methods: DepositMethodItem[]) => void;
  isAdmin: boolean;
}

export const DepositMethodsManagerModal: React.FC<DepositMethodsManagerModalProps> = ({
  isOpen,
  onClose,
  methods,
  onMethodsUpdated,
  isAdmin
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'edit'>('list');
  const [editingMethod, setEditingMethod] = useState<DepositMethodItem | null>(null);

  // Form states for new or edited method
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

  if (!isOpen) return null;

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
    setFormId(`method_${Date.now()}`);
    setFormSubtitle('USDT');
    setActiveTab('add');
  };

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
          setMessage({ type: 'success', text: 'কিউআর কোড বা ছবি সফলভাবে আপলোড হয়েছে!' });
        } else {
          setMessage({ type: 'error', text: data.error || 'ছবি আপলোড ব্যর্থ হয়েছে' });
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'ছবি আপলোড ব্যর্থ হয়েছে' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setMessage({ type: 'error', text: 'মেথডের নাম লিখুন' });
      return;
    }
    if (!formAccountValue.trim()) {
      setMessage({ type: 'error', text: 'একাউন্ট নাম্বার বা ওয়ালেট এড্রেস দিন' });
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

    setSaving(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/deposit-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ method: itemToSave })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onMethodsUpdated(data.methods);
        setMessage({ type: 'success', text: 'ডিপোজিট মেথড সফলভাবে সংরক্ষিত হয়েছে!' });
        setTimeout(() => {
          setActiveTab('list');
          resetForm();
        }, 800);
      } else {
        setMessage({ type: 'error', text: data.error || 'সংরক্ষণ ব্যর্থ হয়েছে' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'নেটওয়ার্ক ত্রুটি' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMethod = async (id: string) => {
    setSaving(true);
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch(`/api/deposit-methods/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onMethodsUpdated(data.methods);
        setDeleteConfirmId(null);
        setMessage({ type: 'success', text: 'মেথড সম্পূর্ণ ডিলিট করা হয়েছে!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'ডিলিট ব্যর্থ হয়েছে' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'নেটওয়ার্ক ত্রুটি' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (m: DepositMethodItem) => {
    const updatedItem = { ...m, enabled: !m.enabled };
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/deposit-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ method: updatedItem })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onMethodsUpdated(data.methods);
      }
    } catch {}
  };

  const handleResetToDefault = async () => {
    if (!window.confirm('আপনি কি নিশ্চিত যে সকল ডিপোজিট মেথড ডিফল্ট অবস্থায় রিস্টোর করতে চান?')) {
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/deposit-methods/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onMethodsUpdated(data.methods);
        setMessage({ type: 'success', text: 'ডিফল্ট মেথডসমূহ সফলভাবে রিস্টোর হয়েছে!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'রিসেট ব্যর্থ হয়েছে' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'নেটওয়ার্ক ত্রুটি' });
    } finally {
      setSaving(false);
    }
  };

  const renderLogoPreview = (type: DepositMethodItem['logoType'], qrUrl?: string) => {
    if (qrUrl) {
      return <img src={qrUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-white/20 shrink-0" />;
    }
    switch (type) {
      case 'bkash':
        return <BkashLogo className="w-8 h-8" />;
      case 'nagad':
        return <NagadLogo className="w-8 h-8" />;
      case 'binance':
        return <BinanceLogo className="w-8 h-8" />;
      case 'bep20':
        return <BscLogo className="w-8 h-8" />;
      case 'trc20':
        return <TronLogo className="w-8 h-8" />;
      case 'polygon':
        return <PolygonLogo className="w-8 h-8" />;
      case 'ton':
        return <TonLogo className="w-8 h-8" />;
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <CreditCard className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0a101f] border border-[#1e2d48] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1e2d48] flex items-center justify-between bg-[#080d1a]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/15 text-amber-400 flex items-center justify-center">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                ডিপোজিট মেথড ম্যানেজমেন্ট
              </h3>
              <p className="text-[11px] text-slate-400">
                যেকোনো মেথড সম্পূর্ণ ডিলিট করুন অথবা আপনার ইচ্ছামতো নতুন মেথড যুক্ত করুন
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-3 bg-[#0d1527] border-b border-[#1e2d48]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('list');
              setMessage(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'list'
                ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            মেথড তালিকা ({methods.length})
          </button>
          <button
            type="button"
            onClick={handleStartAdd}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'add'
                ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ নতুন মেথড যোগ করুন</span>
          </button>
        </div>

        {/* Notification Message */}
        {message && (
          <div
            className={`mx-4 mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: METHODS LIST */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              {methods.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <CreditCard className="w-12 h-12 text-slate-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-400">
                    কোনো ডিপোজিট মেথড পাওয়া যায়নি
                  </p>
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-black"
                  >
                    ডিফল্ট মেথড রিস্টোর করুন
                  </button>
                </div>
              ) : (
                methods.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      m.enabled
                        ? 'bg-[#0e172a] border-[#1e2d48]'
                        : 'bg-[#0a0f1d] border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {renderLogoPreview(m.logoType, m.qrImageUrl)}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-white truncate">
                            {m.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-400/15 text-amber-400 border border-amber-400/20">
                            {m.subtitle || m.currency}
                          </span>
                          {!m.enabled && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-800 text-slate-400">
                              বন্ধ আছে
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-300 font-mono truncate mt-0.5">
                          {m.accountValue}
                        </div>
                        {m.memoOrTag && (
                          <div className="text-[10px] text-amber-300/80 font-mono">
                            Memo/Tag: {m.memoOrTag}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {/* Toggle Active */}
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(m)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-colors ${
                          m.enabled
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                        title={m.enabled ? 'মেথড বন্ধ করুন' : 'মেথড চালু করুন'}
                      >
                        {m.enabled ? 'চালু' : 'বন্ধ'}
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(m)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
                        title="এডিট করুন"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      {deleteConfirmId === m.id ? (
                        <div className="flex items-center gap-1 animate-in fade-in">
                          <button
                            type="button"
                            onClick={() => handleDeleteMethod(m.id)}
                            disabled={saving}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black cursor-pointer shadow-md"
                          >
                            ডিলিট করুন!
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(m.id)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 cursor-pointer transition-colors"
                          title="মেথড ডিলিট করুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Reset to Default Button */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  ভুলবশত কিছু মুছে ফেললে পুনরায় ডিফল্ট করুন:
                </span>
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3 text-amber-400" />
                  <span>ডিফল্ট মেথড রিস্টোর করুন</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2 & 3: ADD OR EDIT METHOD FORM */}
          {(activeTab === 'add' || activeTab === 'edit') && (
            <form onSubmit={handleSaveMethod} className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <span>{activeTab === 'add' ? '✨ নতুন ডিপোজিট মেথড যোগ করুন' : '✏️ ডিপোজিট মেথড এডিট করুন'}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('list');
                    resetForm();
                  }}
                  className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  তালিকায় ফিরে যান
                </button>
              </div>

              {/* Name & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    মেথডের নাম *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. bKash, USDT (TRC-20), Rocket, Binance Pay"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070c17] border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    সাবটাইটেল / নেটওয়ার্ক ব্যাজ
                  </label>
                  <input
                    type="text"
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    placeholder="e.g. Send Money, TRC20, BEP20, BINANCE_PAY"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070c17] border border-slate-700 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Category & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ক্যাটাগরি
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070c17] border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="crypto">Crypto (USDT / On-Chain / Binance)</option>
                    <option value="mfs">MFS (Mobile Banking: bKash, Nagad, Rocket)</option>
                    <option value="custom">Custom (অন্যান্য পেমেন্ট)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    মুদ্রা (Currency)
                  </label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070c17] border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="USDT">USDT (ডলার)</option>
                    <option value="BDT">BDT (বাংলাদেশি টাকা)</option>
                    <option value="USD">USD (ডলার)</option>
                  </select>
                </div>
              </div>

              {/* Account Number / Wallet Address */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  একাউন্ট নম্বর / ওয়ালেট এড্রেস / Pay ID *
                </label>
                <input
                  type="text"
                  required
                  value={formAccountValue}
                  onChange={(e) => setFormAccountValue(e.target.value)}
                  placeholder="e.g. 017XXXXXXXX বা 0xadf205663826... বা 922593999"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070c17] border border-slate-700 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Account Label & Memo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    লেবেল (Display Label)
                  </label>
                  <input
                    type="text"
                    value={formAccountLabel}
                    onChange={(e) => setFormAccountLabel(e.target.value)}
                    placeholder="e.g. বিকাশ পার্সোনাল নম্বর (Send Money):"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#070c17] border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Memo / Tag (যদি থাকে)
                  </label>
                  <input
                    type="text"
                    value={formMemo}
                    onChange={(e) => setFormMemo(e.target.value)}
                    placeholder="e.g. 922593999"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#070c17] border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Icon Type Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  আইকন টাইপ নির্বাচন করুন
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {[
                    { id: 'bkash', label: 'bKash' },
                    { id: 'nagad', label: 'Nagad' },
                    { id: 'binance', label: 'Binance' },
                    { id: 'bep20', label: 'BEP20' },
                    { id: 'trc20', label: 'TRC20' },
                    { id: 'polygon', label: 'Polygon' },
                    { id: 'ton', label: 'TON' },
                    { id: 'custom', label: 'Custom' }
                  ].map((ic) => (
                    <button
                      key={ic.id}
                      type="button"
                      onClick={() => setFormLogoType(ic.id as any)}
                      className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        formLogoType === ic.id
                          ? 'bg-amber-400/20 border-amber-400 ring-2 ring-amber-400/40 text-white'
                          : 'bg-[#070c17] border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {renderLogoPreview(ic.id as any)}
                      <span className="text-[10px] font-bold">{ic.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct QR Code Upload or URL */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  পেমেন্ট কিউআর কোড (QR Code / ছবি)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formQrImageUrl}
                    onChange={(e) => setFormQrImageUrl(e.target.value)}
                    placeholder="https://... বা ছবি আপলোড করুন"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-[#070c17] border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <label className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>{uploadingImage ? 'আপলোড হচ্ছে...' : 'ছবি আপলোড'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>
                {formQrImageUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <img
                      src={formQrImageUrl}
                      alt="Preview"
                      className="w-12 h-12 rounded-lg object-contain bg-white p-0.5 border border-slate-700"
                    />
                    <span className="text-[11px] text-emerald-400 font-bold">
                      কিউআর প্রিভিউ দেখা যাচ্ছে
                    </span>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  ডিপোজিট নির্দেশিকা (Instructions)
                </label>
                <textarea
                  rows={2}
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="ইউজারকে কী করতে হবে বিস্তারিত লিখুন..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#070c17] border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('list');
                    resetForm();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-amber-400/20 active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{saving ? 'সংরক্ষণ হচ্ছে...' : activeTab === 'add' ? 'মেথড যোগ করুন' : 'আপডেট সম্পন্ন করুন'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
