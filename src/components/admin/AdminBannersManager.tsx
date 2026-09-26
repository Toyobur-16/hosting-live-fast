import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Upload,
  Link as LinkIcon,
  Eye,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { StoreBanner } from '../../types';

export function AdminBannersManager() {
  const [banners, setBanners] = useState<StoreBanner[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Partial<StoreBanner> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/admin/banners', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBanners(data.banners || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setNotification({ type: 'error', text: 'শুধুমাত্র ইমেজ ফাইল (JPG, PNG, WebP) আপলোড করা যাবে।' });
      return;
    }

    try {
      setUploadingImage(true);
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
              fileType: 'thumbnail'
            })
          });

          const data = await res.json();
          if (res.ok && data.success) {
            setEditingBanner((prev) => ({
              ...prev,
              imageUrl: data.url
            }));
            setNotification({ type: 'success', text: 'ছবি সফলভাবে আপলোড হয়েছে!' });
            setTimeout(() => setNotification(null), 3000);
          } else {
            setNotification({ type: 'error', text: data.error || 'ছবি আপলোড ব্যর্থ হয়েছে।' });
          }
        } catch (err: any) {
          setNotification({ type: 'error', text: err.message });
        } finally {
          setUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
      setUploadingImage(false);
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner?.title && !editingBanner?.titleBn) {
      setNotification({ type: 'error', text: 'ব্যানারের শিরোনাম দেওয়া আবশ্যক।' });
      return;
    }

    if (!editingBanner?.imageUrl) {
      setNotification({ type: 'error', text: 'অনুগ্রহ করে একটি ব্যানার ছবি আপলোড করুন বা লিংক দিন।' });
      return;
    }

    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editingBanner)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotification({ type: 'error', text: data.error || 'ব্যানার সেভ করা যায়নি।' });
        return;
      }

      setNotification({ type: 'success', text: 'ব্যানার সফলভাবে সংরক্ষিত হয়েছে!' });
      setEditingBanner(null);
      fetchBanners();
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm('এই ব্যানারটি মুছে ফেলতে চান?')) return;
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch(`/api/admin/banners/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotification({ type: 'success', text: 'ব্যানার ডিলিট করা হয়েছে।' });
        fetchBanners();
        setTimeout(() => setNotification(null), 2500);
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>হোম ব্যানার ও স্লাইডার আপলোড কন্ট্রোল (Hero Banners)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            হোমপেজের স্লাইডারের ছবি সরাসরি কম্পিউটার বা মোবাইল থেকে আপলোড করে সেট করুন
          </p>
        </div>

        <button
          onClick={() => {
            setIsNew(true);
            setEditingBanner({
              title: 'hosting live fast - 24/7 Hosting',
              titleBn: '২৪/৭ সুপারফাস্ট টেলিগ্রাম ও ওয়েবসাইট ক্লাউড হোস্টিং',
              subtitle: 'Deploy bots with automated crash recovery and full terminal logs',
              subtitleBn: 'অটো রিস্টার্ট ওয়াচডগ এবং রিয়েল-টাইম কনসোল লগস সহ সর্বোচ্চ আপটাইম',
              badge: 'সুপারফাস্ট',
              imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
              link: 'plans',
              order: banners.length + 1,
              active: true
            });
          }}
          className="px-4 py-2 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন ব্যানার যুক্ত করুন</span>
        </button>
      </div>

      {notification && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
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

      {/* Edit/Add Form Modal */}
      {editingBanner && (
        <div className="p-5 rounded-2xl bg-[#0f172a] border border-[#1e293b] space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]">
            <h4 className="text-xs font-black text-[#00d293] uppercase">
              {isNew ? 'নতুন ব্যানার তৈরি করুন' : 'ব্যানার এডিট করুন'}
            </h4>
            <button
              onClick={() => setEditingBanner(null)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              বাতিল
            </button>
          </div>

          <form onSubmit={handleSaveBanner} className="space-y-4">
            {/* Direct Image Upload Area */}
            <div className="p-4 rounded-xl bg-[#070b14] border border-[#1e293b] space-y-3">
              <label className="block text-xs font-bold text-slate-200">
                ব্যানার ইমেজ (ডাইরেক্ট পিক আপলোড করুন বা লিংক দিন) *
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Preview */}
                <div className="w-full sm:w-48 h-28 rounded-xl bg-slate-900 border border-[#1e293b] overflow-hidden flex items-center justify-center relative shrink-0">
                  {editingBanner.imageUrl ? (
                    <img
                      src={editingBanner.imageUrl}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-center p-2 text-slate-500 text-xs">
                      <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
                      <span>কোন ছবি নেই</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 w-full">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>আপলোড হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>কম্পিউটার/মোবাইল থেকে পিক আপলোড করুন</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    বা সরাসরি ইমেজ লিঙ্ক বসান:
                  </p>
                  <input
                    type="text"
                    value={editingBanner.imageUrl || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl bg-[#0b101d] border border-[#1e293b] text-xs text-white"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  শিরোনাম (বাংলা) *
                </label>
                <input
                  type="text"
                  required
                  value={editingBanner.titleBn || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, titleBn: e.target.value })}
                  placeholder="e.g. ২৪/৭ ক্লাউড হোস্টিং"
                  className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Title (English)
                </label>
                <input
                  type="text"
                  value={editingBanner.title || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                  placeholder="e.g. 24/7 Cloud Hosting"
                  className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  সাবটাইটেল (বাংলা)
                </label>
                <input
                  type="text"
                  value={editingBanner.subtitleBn || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, subtitleBn: e.target.value })}
                  placeholder="e.g. অটো রিস্টার্ট এবং রিয়েল-টাইম লগস"
                  className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  হলুদ অফার ব্যাজ টেক্সট
                </label>
                <input
                  type="text"
                  value={editingBanner.badge || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, badge: e.target.value })}
                  placeholder="e.g. সুপারফাস্ট / ২০% ছাড়"
                  className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  ক্লিক লিংক গন্তব্য (Link target)
                </label>
                <select
                  value={editingBanner.link || 'plans'}
                  onChange={(e) => setEditingBanner({ ...editingBanner, link: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
                >
                  <option value="plans">Hosting Plans (প্ল্যান কিনুন)</option>
                  <option value="bots">My Bots (হোস্টেড বট দেখুন)</option>
                  <option value="wallet">Wallet / Deposit (ওয়ালেট)</option>
                  <option value="support">Support Center (সাপোর্ট)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  স্লাইডার ক্রম (Order)
                </label>
                <input
                  type="number"
                  min="1"
                  value={editingBanner.order || 1}
                  onChange={(e) => setEditingBanner({ ...editingBanner, order: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingBanner(null)}
                className="px-4 py-2 rounded-xl bg-[#111827] text-slate-300 text-xs font-bold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs cursor-pointer shadow-md"
              >
                ব্যানার সেভ করুন
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Banner List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {banners.map((b) => (
          <div
            key={b.id}
            className="p-4 rounded-2xl bg-[#0d1527] border border-[#1e293b] space-y-3 relative group"
          >
            <div className="h-36 rounded-xl overflow-hidden relative bg-slate-900">
              <img
                src={b.imageUrl}
                alt={b.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              {b.badge && (
                <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                  {b.badge}
                </span>
              )}
              <span className="absolute bottom-2 left-2 text-xs font-black text-white drop-shadow-md">
                {b.titleBn || b.title}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-mono text-slate-400">
                লিংক: <strong className="text-[#00d293]">{b.link || 'plans'}</strong>
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setIsNew(false);
                    setEditingBanner(b);
                  }}
                  className="p-1.5 rounded-lg bg-[#162238] text-slate-300 hover:text-white cursor-pointer"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteBanner(b.id)}
                  className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-400 hover:text-white cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
