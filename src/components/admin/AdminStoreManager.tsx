import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  FileCode,
  Image as ImageIcon,
  Loader2,
  FileArchive,
  HardDrive,
  X,
  FileText
} from 'lucide-react';
import { StoreItem, StoreCategory } from '../../types';

export function AdminStoreManager() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [editingItem, setEditingItem] = useState<Partial<StoreItem> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchItemsAndCategories();
  }, []);

  const fetchItemsAndCategories = async () => {
    try {
      const token = localStorage.getItem('bot_auth_token');
      const [itRes, catRes] = await Promise.all([
        fetch('/api/admin/store-items', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/store/categories')
      ]);

      if (itRes.ok) {
        const itData = await itRes.json();
        setItems(itData.items || []);
      }
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      }
    } catch {}
  };

  // Direct Thumbnail Image Upload
  const handleThumbnailSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setNotification({ type: 'error', text: 'অনুগ্রহ করে সঠিক ছবি ফাইল (JPG, PNG, WEBP) সিলেক্ট করুন।' });
      return;
    }

    try {
      setUploadingThumbnail(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const fileData = reader.result as string;
        const token = localStorage.getItem('bot_auth_token');
        const res = await fetch('/api/admin/upload-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            fileName: file.name,
            fileData,
            fileType: 'thumbnail'
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setNotification({ type: 'error', text: data.error || 'ছবি আপলোড ব্যর্থ হয়েছে।' });
          return;
        }

        setEditingItem((prev) => (prev ? { ...prev, imageUrl: data.url } : prev));
        setNotification({ type: 'success', text: '✅ থাম্বনেইল ছবি সফলভাবে আপলোড হয়েছে!' });
        setTimeout(() => setNotification(null), 2500);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'ছবি আপলোডে সমস্যা হয়েছে।' });
    } finally {
      setUploadingThumbnail(false);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
    }
  };

  // Direct Product / Source Code File Upload (ZIP, PY, RAR, etc.)
  const handleProductFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFile(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const fileData = reader.result as string;
        const token = localStorage.getItem('bot_auth_token');
        const res = await fetch('/api/admin/upload-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            fileName: file.name,
            fileData,
            fileType: 'product_file'
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setNotification({ type: 'error', text: data.error || 'ফাইল আপলোড ব্যর্থ হয়েছে।' });
          return;
        }

        setEditingItem((prev) =>
          prev
            ? {
                ...prev,
                fileStorageName: data.storedFileName,
                originalFileName: data.originalFileName,
                fileSizeFormatted: data.fileSizeFormatted
              }
            : prev
        );
        setNotification({
          type: 'success',
          text: `✅ ফাইল (${data.originalFileName} - ${data.fileSizeFormatted}) সফলভাবে আপলোড হয়েছে!`
        });
        setTimeout(() => setNotification(null), 3000);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'ফাইল আপলোডে ত্রুটি দেখা দিয়েছে।' });
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.title?.trim()) {
      setNotification({ type: 'error', text: 'ফাইলের শিরোনাম (Title) দেওয়া আবশ্যক।' });
      return;
    }

    if (!editingItem?.imageUrl) {
      setNotification({ type: 'error', text: 'অনুগ্রহ করে একটি থাম্বনেইল ছবি আপলোড করুন।' });
      return;
    }

    try {
      const token = localStorage.getItem('bot_auth_token');
      const pUsd = parseFloat(String(editingItem.priceUsd)) || 0;
      const pBdt = parseFloat(String(editingItem.priceBdt)) || Math.round(pUsd * 120);
      const itemToSave = {
        ...editingItem,
        priceUsd: pUsd,
        priceBdt: pBdt
      };

      const res = await fetch('/api/admin/store-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(itemToSave)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotification({ type: 'error', text: data.error || 'সংরক্ষণ করা সম্ভব হয়নি।' });
        return;
      }

      setNotification({ type: 'success', text: '🎉 পণ্য ও ফাইল সফলভাবে সেভ করা হয়েছে!' });
      setEditingItem(null);
      fetchItemsAndCategories();
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('এই আইটেমটি স্থায়ীভাবে মুছে ফেলতে চান?')) return;
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch(`/api/admin/store-items/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotification({ type: 'success', text: 'আইটেম মুছে ফেলা হয়েছে।' });
        fetchItemsAndCategories();
        setTimeout(() => setNotification(null), 2500);
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#00d293]" />
            <span>স্টোর ফাইল ও পণ্য কন্ট্রোল (Store Products)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            সরাসরি থাম্বনেইল ছবি ও সোর্স কোড/ফাইল আপলোড করে বিক্রির জন্য উন্মুক্ত করুন
          </p>
        </div>

        <button
          onClick={() => {
            setIsNew(true);
            setEditingItem({
              title: '',
              titleBn: '',
              categoryId: categories[0]?.id || 'vip_file',
              categoryName: categories[0]?.name || 'VIP FILE',
              priceBdt: 100,
              priceUsd: 1.0,
              rating: 5,
              downloads: 0,
              badge: 'নতুন',
              imageUrl: '',
              description: '',
              planId: '',
              fileUrl: '',
              originalFileName: '',
              fileStorageName: '',
              fileSizeFormatted: '',
              featured: true,
              active: true
            });
          }}
          className="px-4 py-2.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>+ নতুন ফাইল / পণ্য যুক্ত করুন</span>
        </button>
      </div>

      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border border-rose-800 text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Add / Edit Form */}
      {editingItem && (
        <div className="p-6 rounded-3xl bg-[#0d1424] border border-[#1e2e42] shadow-2xl space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
            <h4 className="text-sm font-black text-[#00d293] uppercase flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              <span>{isNew ? 'নতুন পণ্য ও ফাইল আপলোড' : 'পণ্য তথ্য এডিট করুন'}</span>
            </h4>
            <button
              onClick={() => setEditingItem(null)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              ✕ বন্ধ করুন
            </button>
          </div>

          <form onSubmit={handleSaveItem} className="space-y-4">
            {/* Direct Thumbnail Upload Section */}
            <div className="p-4 rounded-2xl bg-[#070b14] border border-[#1e293b] space-y-3">
              <label className="block text-xs font-bold text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#00d293]" />
                  <span>১. থাম্বনেইল ছবি ডাইরেক্ট আপলোড (Direct Image Upload) *</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">JPG, PNG, WEBP</span>
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {editingItem.imageUrl ? (
                  <div className="relative w-32 h-24 rounded-xl overflow-hidden border-2 border-[#00d293] bg-slate-900 shrink-0">
                    <img
                      src={editingItem.imageUrl}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, imageUrl: '' })}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs hover:bg-rose-700 cursor-pointer"
                      title="ছবি মুছুন"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-24 rounded-xl border border-dashed border-slate-700 bg-slate-900/50 flex flex-col items-center justify-center text-slate-500 text-[10px] shrink-0">
                    <ImageIcon className="w-6 h-6 mb-1 text-slate-600" />
                    <span>কোন ছবি নেই</span>
                  </div>
                )}

                <div className="flex-1 w-full space-y-2">
                  <input
                    type="file"
                    ref={thumbnailInputRef}
                    onChange={handleThumbnailSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => thumbnailInputRef.current?.click()}
                    disabled={uploadingThumbnail}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#1e293b] hover:bg-[#283950] border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {uploadingThumbnail ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#00d293]" />
                        <span>ছবি আপলোড হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4 text-[#00d293]" />
                        <span>ডিভাইস থেকে থাম্বনেইল ছবি সিলেক্ট করুন</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-400">
                    💡 কোনো লিংকের প্রয়োজন নেই। আপনার ফোন বা পিসি থেকে সরাসরি ছবি সিলেক্ট করলে এটি নিজে থেকেই আপলোড হয়ে যাবে।
                  </p>
                </div>
              </div>
            </div>

            {/* Direct Product File Upload Section */}
            <div className="p-4 rounded-2xl bg-[#070b14] border border-[#1e293b] space-y-3">
              <label className="block text-xs font-bold text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileArchive className="w-4 h-4 text-emerald-400" />
                  <span>২. ডিজিটাল ফাইল / সোর্স কোড ডাইরেক্ট আপলোড (Direct File Upload) *</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">ZIP, RAR, PY, JS, PDF, JSON</span>
              </label>

              <div className="space-y-3">
                {editingItem.originalFileName ? (
                  <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <FileCode className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {editingItem.originalFileName}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-semibold">
                          ✅ আপলোড সম্পন্ন • সাইজ: {editingItem.fileSizeFormatted || 'Ready'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setEditingItem({
                          ...editingItem,
                          originalFileName: '',
                          fileStorageName: '',
                          fileSizeFormatted: ''
                        })
                      }
                      className="text-xs text-rose-400 hover:text-rose-300 font-bold px-2 py-1 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 cursor-pointer"
                    >
                      পরিবর্তন / মুছুন
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleProductFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="w-full py-4 rounded-xl border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/10 hover:bg-emerald-950/20 text-white font-bold text-xs flex flex-col items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                    >
                      {uploadingFile ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                          <span>ফাইল সার্ভারে সরাসরি আপলোড হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-7 h-7 text-emerald-400" />
                          <span className="text-sm font-black text-emerald-300">
                            📁 আপনার মূল ফাইলটি এখানে আপলোড করুন (Upload Source File)
                          </span>
                          <span className="text-[10px] text-slate-400">
                            টেলিগ্রাম মিনি অ্যাপ জিপ ফাইল, পাইথন বট স্ক্রিপ্ট বা যেকোনো ফাইল
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )}
                <p className="text-[11px] text-slate-400">
                  💡 ব্যবহারকারী ওয়ালেট ব্যালেন্স দিয়ে কিনলে এই আপলোডকৃত মূল ফাইলটি তার ডিভাইসে সাথে সাথে ডাউনলোড হবে।
                </p>
              </div>
            </div>

            {/* Product Metadata Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Title (English) *
                </label>
                <input
                  type="text"
                  value={editingItem.title || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  placeholder="e.g. VIP Telegram Bot Source 2026"
                  className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white focus:border-[#00d293] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  শিরোনাম (বাংলা নাম)
                </label>
                <input
                  type="text"
                  value={editingItem.titleBn || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, titleBn: e.target.value })}
                  placeholder="যেমন: ভিআইপি টেলিগ্রাম বট কোড"
                  className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white focus:border-[#00d293] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">ক্যাটাগরি</label>
                <select
                  value={editingItem.categoryId || ''}
                  onChange={(e) => {
                    const sel = categories.find((c) => c.id === e.target.value);
                    setEditingItem({
                      ...editingItem,
                      categoryId: e.target.value,
                      categoryName: sel?.name || 'VIP FILE'
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white focus:border-[#00d293] outline-none cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.nameBn || c.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-400 mb-1">
                  মূল্য ($ USDT) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={editingItem.priceUsd ?? ''}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditingItem({
                      ...editingItem,
                      priceUsd: val as any,
                      priceBdt: val === '' ? ('' as any) : Math.round((parseFloat(val) || 0) * 120)
                    });
                  }}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white focus:border-[#00d293] outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  ব্যাজ (Badge Tag)
                </label>
                <input
                  type="text"
                  value={editingItem.badge || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, badge: e.target.value })}
                  placeholder="যেমন: সাশ্রয়ী দামে / হট ফাইল"
                  className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white focus:border-[#00d293] outline-none"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  ফাইল বিবরণ (Description)
                </label>
                <textarea
                  rows={2}
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  placeholder="ফাইলের সুবিধাসমূহ ও ব্যবহারের নিয়ম লিখুন..."
                  className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white resize-none focus:border-[#00d293] outline-none"
                />
              </div>

              <div className="flex items-center gap-4 sm:col-span-2">
                <label className="flex items-center gap-2 text-xs text-white font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingItem.featured)}
                    onChange={(e) => setEditingItem({ ...editingItem, featured: e.target.checked })}
                    className="rounded text-[#00d293]"
                  />
                  <span>হোমপেজে ফিচার্ড হিসেবে দেখান (Featured On Homepage)</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#1e293b]">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2.5 rounded-xl bg-[#111827] text-slate-300 text-xs font-bold cursor-pointer hover:bg-[#1a2335]"
              >
                বাতিল করুন
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs shadow-md cursor-pointer transition-all hover:scale-102"
              >
                পণ্য সংরক্ষণ করুন (Save Product)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Product list */}
      {items.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#0f172a] border border-[#1e293b] text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#162238] text-[#00d293] flex items-center justify-center mx-auto">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-white">বর্তমানে কোনো ডেমো ফাইল বা পণ্য নেই</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            ডেমো আইটেমগুলো মুছে ফেলা হয়েছে। এখন ওপরের <strong>"+ নতুন ফাইল / পণ্য যুক্ত করুন"</strong> বাটনে ক্লিক করে সরাসরি আপনার ডিভাইস থেকে থাম্বনেইল ছবি ও সোর্স ফাইল আপলোড করে নিন।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <div
              key={it.id}
              className="p-4 rounded-2xl bg-[#0f172a] border border-[#1e293b] flex flex-col justify-between space-y-3 shadow-md"
            >
              <div className="flex items-center gap-3">
                <img
                  src={it.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80'}
                  alt={it.title}
                  className="w-16 h-14 rounded-xl object-cover border border-[#1e293b] shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-black text-white block truncate">{it.title}</span>
                  <span className="text-[10px] text-[#00d293] font-bold block">{it.categoryName}</span>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                    <span className="font-bold text-emerald-400">${it.priceUsd} USDT</span>
                    <span>• ↓ {it.downloads || 0}</span>
                  </div>
                </div>
              </div>

              {it.originalFileName && (
                <div className="p-2 rounded-xl bg-[#070b14] border border-[#1e293b] flex items-center gap-2 text-[10px] text-emerald-400 truncate">
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">আপলোডকৃত ফাইল: {it.originalFileName}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-[#1e293b]">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-bold">
                  {it.badge || 'সাশ্রয়ী'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsNew(false);
                      setEditingItem(it);
                    }}
                    className="p-2 rounded-lg bg-[#111827] text-slate-300 hover:text-white cursor-pointer hover:bg-[#1a263c]"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(it.id)}
                    className="p-2 rounded-lg bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
