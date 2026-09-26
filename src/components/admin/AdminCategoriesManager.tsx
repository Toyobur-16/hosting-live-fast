import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Folder, CheckCircle2, AlertCircle } from 'lucide-react';
import { StoreCategory } from '../../types';

export function AdminCategoriesManager() {
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [editingCategory, setEditingCategory] = useState<Partial<StoreCategory> | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/admin/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch {}
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.name) return;

    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editingCategory)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotification({ type: 'error', text: data.error || 'সংরক্ষণ ব্যর্থ হয়েছে' });
        return;
      }

      setNotification({ type: 'success', text: 'ক্যাটেগরি সংরক্ষিত হয়েছে!' });
      setEditingCategory(null);
      fetchCategories();
      setTimeout(() => setNotification(null), 2500);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('ক্যাটেগরিটি মুছে ফেলতে চান?')) return;
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotification({ type: 'success', text: 'ক্যাটেগরি ডিলিট করা হয়েছে।' });
        fetchCategories();
        setTimeout(() => setNotification(null), 2500);
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Folder className="w-5 h-5 text-[#00d293]" />
            <span>ক্যাটেগরি ম্যানেজমেন্ট (Store Categories)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            হোমপেজ ও মার্কেটপ্লেসের সকল ক্যাটেগরি যোগ, পরিবর্তন ও নিয়ন্ত্রণ করুন
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCategory({
              name: '',
              nameBn: '',
              icon: 'folder',
              count: 0,
              active: true
            });
          }}
          className="px-4 py-2 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন ক্যাটেগরি</span>
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

      {editingCategory && (
        <div className="p-5 rounded-2xl bg-[#0f172a] border border-[#1e293b] space-y-3">
          <h4 className="text-xs font-black text-[#00d293] uppercase">ক্যাটেগরি তথ্য</h4>
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Name (English) *</label>
              <input
                type="text"
                required
                value={editingCategory.name || ''}
                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                placeholder="e.g. VIP FILE"
                className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">নাম (বাংলা)</label>
              <input
                type="text"
                value={editingCategory.nameBn || ''}
                onChange={(e) => setEditingCategory({ ...editingCategory, nameBn: e.target.value })}
                placeholder="e.g. ভিআইপি ফাইল"
                className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">আইকন (Icon)</label>
              <select
                value={editingCategory.icon || 'folder'}
                onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
              >
                <option value="folder">Folder 📁</option>
                <option value="bot">Bot 🤖</option>
                <option value="sparkles">Sparkles ✨</option>
                <option value="crown">Crown 👑</option>
              </select>
            </div>
            <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="px-4 py-1.5 rounded-xl bg-[#111827] text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 rounded-xl bg-[#00d293] text-slate-950 font-black text-xs"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categories.map((c) => (
          <div
            key={c.id}
            className="p-4 rounded-2xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#162238] flex items-center justify-center text-[#00d293]">
                <Folder className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black text-white block">{c.name}</span>
                <span className="text-[11px] text-slate-400">{c.nameBn} • Icon: {c.icon}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingCategory(c)}
                className="p-2 rounded-xl bg-[#111827] text-slate-300 hover:text-white"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(c.id)}
                className="p-2 rounded-xl bg-rose-950/40 text-rose-400 hover:bg-rose-900/60"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
