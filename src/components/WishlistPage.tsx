import React, { useState, useEffect } from 'react';
import { Heart, Download, Star, ArrowRight, Trash2, ShoppingBag, Folder } from 'lucide-react';
import { StoreItem, AuthUser } from '../types';

interface WishlistPageProps {
  user: AuthUser | null;
  wishlistIds: string[];
  onToggleWishlist: (itemId: string) => void;
  onNavigateToMarket: () => void;
  onNavigateToWallet: () => void;
  onOpenAuthModal: () => void;
}

export function WishlistPage({
  user,
  wishlistIds,
  onToggleWishlist,
  onNavigateToMarket,
  onNavigateToWallet,
  onOpenAuthModal
}: WishlistPageProps) {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchWishlistItems();
  }, [wishlistIds]);

  const fetchWishlistItems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/store/items');
      if (res.ok) {
        const data = await res.json();
        const allItems: StoreItem[] = data.items || [];
        setItems(allItems.filter((i) => wishlistIds.includes(i.id)));
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleBuy = async (item: StoreItem) => {
    if (!user) {
      onOpenAuthModal();
      return;
    }

    const token = localStorage.getItem('bot_auth_token');
    try {
      setBuyingId(item.id);
      setMessage(null);
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
        setMessage(data.error || 'Error purchasing item');
        return;
      }

      setMessage(data.message || `অভিনন্দন! ${item.title} সফলভাবে ক্রয় সম্পন্ন হয়েছে।`);
    } catch (err: any) {
      setMessage(err.message || 'Error');
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-400">
            <Heart className="w-5 h-5 fill-rose-500 stroke-none" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            My Wishlist ({items.length})
          </h2>
        </div>

        <button
          onClick={onNavigateToMarket}
          className="text-xs font-bold text-[#00d293] hover:underline cursor-pointer"
        >
          মার্কেটপ্লেস ব্রাউজ করুন →
        </button>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-[#0f172a] border border-[#00d293]/40 text-xs text-[#00d293] font-bold">
          {message}
        </div>
      )}

      {items.length === 0 ? (
        <div className="py-16 px-6 rounded-3xl bg-[#0d1424] border border-[#1e293b] flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#162238] flex items-center justify-center text-slate-400 shadow-inner">
            <Heart className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h4 className="text-sm font-bold text-white">
            আপনার উইশলিস্ট খালি
          </h4>
          <p className="text-xs text-slate-400 max-w-xs">
            যেকোনো ফাইল বা বটের ওপর থাকা হার্ট আইকনে ক্লিক করে উইশলিস্টে সংরক্ষণ করতে পারেন।
          </p>
          <button
            onClick={onNavigateToMarket}
            className="mt-2 px-5 py-2.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 text-xs font-black cursor-pointer shadow-md"
          >
            Explore Market
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-[#0f172a] border border-[#1e293b] overflow-hidden shadow-lg flex flex-col justify-between"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                {item.badge && (
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-black shadow-md">
                    {item.badge}
                  </span>
                )}
                <button
                  onClick={() => onToggleWishlist(item.id)}
                  className="absolute top-2.5 right-2.5 p-2 rounded-full bg-rose-500 text-white cursor-pointer hover:scale-110 transition-transform shadow-md"
                  title="Remove from wishlist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white line-clamp-1">{item.title}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{item.description}</p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-[#1e293b]">
                  <div>
                    <span className="text-base font-black text-[#00d293]">${item.priceUsd}</span>
                    <span className="text-[10px] text-emerald-400 uppercase font-bold ml-1">USDT</span>
                  </div>

                  <button
                    onClick={() => handleBuy(item)}
                    disabled={buyingId === item.id}
                    className="px-3.5 py-1.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 text-xs font-black shadow-md cursor-pointer transition-all disabled:opacity-50"
                  >
                    {buyingId === item.id ? 'কিনা হচ্ছে...' : 'কিনুন'}
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
