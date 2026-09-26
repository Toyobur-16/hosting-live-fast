import React, { useState, useEffect } from 'react';
import {
  Search,
  Folder,
  Bot,
  Sparkles,
  Crown,
  Heart,
  Download,
  Star,
  Zap,
  ShoppingBag,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { StoreItem, StoreCategory, AuthUser } from '../types';

interface MarketplacePageProps {
  user: AuthUser | null;
  initialCategoryId?: string;
  onNavigateToWallet: () => void;
  onNavigateToPlans: () => void;
  onOpenAuthModal: () => void;
  wishlistIds: string[];
  onToggleWishlist: (itemId: string) => void;
}

export function MarketplacePage({
  user,
  initialCategoryId,
  onNavigateToWallet,
  onNavigateToPlans,
  onOpenAuthModal,
  wishlistIds,
  onToggleWishlist
}: MarketplacePageProps) {
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [items, setItems] = useState<StoreItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryId || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [buying, setBuying] = useState(false);
  const [downloadLink, setDownloadLink] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catsRes, itemsRes] = await Promise.all([
        fetch('/api/store/categories'),
        fetch('/api/store/items')
      ]);

      if (catsRes.ok) {
        const cData = await catsRes.json();
        setCategories(cData.categories || []);
      }
      if (itemsRes.ok) {
        const iData = await itemsRes.json();
        setItems(iData.items || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleDownloadItem = (item: StoreItem) => {
    const token = localStorage.getItem('bot_auth_token') || '';
    if (item.fileUrl && (item.fileUrl.startsWith('http://') || item.fileUrl.startsWith('https://'))) {
      window.open(item.fileUrl, '_blank');
    } else {
      window.open(`/api/store/items/${item.id}/download?token=${encodeURIComponent(token)}`, '_blank');
    }
  };

  const filteredItems = items.filter((item) => {
    if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.titleBn && item.titleBn.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  });

  const handleBuy = async (item: StoreItem) => {
    if (!user) {
      onOpenAuthModal();
      return;
    }

    const token = localStorage.getItem('bot_auth_token');
    try {
      setBuying(true);
      setMessage(null);
      setDownloadLink(null);
      const res = await fetch(`/api/store/items/${item.id}/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currency: 'USD' })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.needsDeposit) {
          setMessage({
            type: 'error',
            text: `পর্যাপ্ত ব্যালেন্স নেই! প্রয়োজন: $${item.priceUsd} USDT। অনুগ্রহ করে ওয়ালেটে USDT জমা দিন।`
          });
        } else {
          setMessage({ type: 'error', text: data.error || 'কেনা সম্ভব হয়নি।' });
        }
        return;
      }

      setMessage({
        type: 'success',
        text: `🎉 অভিনন্দন! "${item.title}" সফলভাবে ক্রয় সম্পন্ন হয়েছে।`
      });
      setDownloadLink(data.downloadUrl || item.fileUrl || `/api/store/items/${item.id}/download`);
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error processing purchase' });
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-200">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-[#00d293]" />
            <span>মার্কেটপ্লেস (Marketplace)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            টেলিগ্রাম বট স্ক্রিপ্ট, ওয়েব ফাইল, মিনি অ্যাপ সোর্স কোড ও হোস্টিং
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all files..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0f172a] border border-[#1e293b] text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-[#00d293]"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
            selectedCategory === 'all'
              ? 'bg-[#00d293] text-slate-950 font-black shadow-md'
              : 'bg-[#0f172a] border border-[#1e293b] text-slate-300 hover:text-white'
          }`}
        >
          All Files ({items.length})
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-2 ${
              selectedCategory === cat.id
                ? 'bg-[#00d293] text-slate-950 font-black shadow-md'
                : 'bg-[#0f172a] border border-[#1e293b] text-slate-300 hover:text-white'
            }`}
          >
            <span>{cat.name}</span>
          </button>
        ))}

        <button
          onClick={onNavigateToPlans}
          className="px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 cursor-pointer flex items-center gap-1.5"
        >
          <Crown className="w-3.5 h-3.5" />
          <span>হোস্টিং প্ল্যান কিনুন</span>
        </button>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-[#0d1424] border border-[#1e293b] p-8 space-y-3">
          <p className="text-sm font-bold text-slate-300">কোনো ফাইল পাওয়া যায়নি</p>
          <p className="text-xs text-slate-500">অন্য কোনো সার্চ বা ক্যাটেগরি নির্বাচন করে দেখুন।</p>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-[#00d293] text-slate-950 text-xs font-bold cursor-pointer"
          >
            রিসেট ফিল্টার
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const isWishlisted = wishlistIds.includes(item.id);

            return (
              <div
                key={item.id}
                className="group rounded-2xl bg-[#0f172a] border border-[#1e293b] hover:border-[#00d293]/50 overflow-hidden shadow-lg transition-all duration-200 flex flex-col justify-between"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {item.badge && (
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-black shadow-md">
                      {item.badge}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWishlist(item.id);
                    }}
                    className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all backdrop-blur-xs ${
                      isWishlisted
                        ? 'bg-rose-500 text-white shadow-md scale-110'
                        : 'bg-black/60 text-white hover:bg-rose-500 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-[#00d293] transition-colors line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-[#1e293b]">
                    <div className="flex items-center gap-1">
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400" />
                        ))}
                      </div>
                      <span className="text-[11px] font-bold text-slate-300 ml-1">
                        {item.rating || 5}.0
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.downloads || 0}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <div>
                      <span className="text-base font-black text-[#00d293]">
                        ${item.priceUsd}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold ml-1 uppercase">
                        USDT
                      </span>
                    </div>

                    {user?.purchasedItemIds?.includes(item.id) ? (
                      <button
                        onClick={() => handleDownloadItem(item)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-md cursor-pointer transition-all hover:scale-102 flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>ডাউনলোড</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 text-xs font-black shadow-md cursor-pointer transition-all hover:scale-102"
                      >
                        কিনুন (Buy)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Item Purchase Confirmation Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[#0d1424] border border-[#1e2e42] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-[#00d293] uppercase tracking-wide">
                  পণ্য বিস্তারিত ও ক্রয়
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  {selectedItem.title}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setMessage(null);
                  setDownloadLink(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-[#1e293b]">
              <img
                src={selectedItem.imageUrl}
                alt={selectedItem.title}
                className="w-full aspect-video object-cover"
              />
            </div>

            <p className="text-xs text-slate-300">
              {selectedItem.description}
            </p>

            <div className="p-3.5 rounded-2xl bg-[#070b14] border border-[#1e293b] space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>মূল্য (Price):</span>
                <span className="font-bold text-white">${selectedItem.priceUsd} USDT</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>আপনার ওয়ালেট ব্যালেন্স:</span>
                <span className="font-bold text-[#00d293]">
                  ${(user?.balanceUsd || 0).toFixed(2)} USDT
                </span>
              </div>
            </div>

            {message && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  message.type === 'success'
                    ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/60 border border-rose-800 text-rose-300'
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

            {/* Direct download button right inside the modal */}
            {downloadLink && (
              <button
                onClick={() => {
                  const token = localStorage.getItem('bot_auth_token') || '';
                  if (downloadLink.startsWith('http://') || downloadLink.startsWith('https://')) {
                    window.open(downloadLink, '_blank');
                  } else {
                    window.open(`${downloadLink}?token=${encodeURIComponent(token)}`, '_blank');
                  }
                }}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-102"
              >
                <Download className="w-4 h-4" />
                <span>📥 এখনই ফাইলটি ডাউনলোড করুন (Download File)</span>
              </button>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setMessage(null);
                  setDownloadLink(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#111827] hover:bg-[#1f293d] text-slate-300 text-xs font-bold border border-[#1e293b] cursor-pointer"
              >
                বন্ধ করুন
              </button>

              {!downloadLink && (
                <>
                  {(user?.balanceUsd || 0) < selectedItem.priceUsd ? (
                    <button
                      onClick={() => {
                        setSelectedItem(null);
                        onNavigateToWallet();
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>USDT ডিপোজিট করুন</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuy(selectedItem)}
                      disabled={buying}
                      className="flex-1 py-2.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 text-xs font-black shadow-lg shadow-[#00d293]/20 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {buying ? 'প্রক্রিয়া চলছে...' : 'ওয়ালেট দিয়ে কিনুন'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
