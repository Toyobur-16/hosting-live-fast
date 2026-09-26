import React, { useState, useEffect } from 'react';
import {
  Film,
  Sparkles,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Coins,
  ShieldCheck,
  Clock,
  Layers,
  HelpCircle,
  Sliders
} from 'lucide-react';
import { RewardAdSettings } from '../../types';

export const AdminAdsManager: React.FC<{ lang?: 'bn' | 'en' }> = ({ lang = 'bn' }) => {
  const [settings, setSettings] = useState<RewardAdSettings>({
    enabled: true,
    adProvider: 'admob',
    adUnitId: 'ca-app-pub-3940256099942544/5224354917',
    rewardAmountUsd: 0.005,
    dailyLimit: 20,
    cooldownSeconds: 30,
    testMode: true
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/admin/rewards/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch {
      setMessage({
        type: 'error',
        text: lang === 'bn' ? 'সেটিংস লোড করতে ব্যর্থ হয়েছে' : 'Failed to load settings'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/admin/rewards/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setMessage({
        type: 'success',
        text: lang === 'bn' ? '✅ অ্যাড রিওয়ার্ড সেটিংস সংরক্ষিত হয়েছে!' : '✅ Ad reward settings saved!'
      });
      if (data.settings) setSettings(data.settings);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || (lang === 'bn' ? 'সংরক্ষণ ব্যর্থ হয়েছে' : 'Save failed')
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0b1322] border border-[#1a2942]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>{lang === 'bn' ? 'ওয়াচ ভিডিও অ্যাড ও আর্ন কনফিগারেশন' : 'Rewarded Video Ads & Earning Setup'}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-pink-500/20 text-pink-300 border border-pink-500/30">
                USD Reward
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'bn'
                ? 'ইউজারদের ভিডিও বিজ্ঞাপন দেখে রিয়েল USD আর্ন করার সেটিংস ও অ্যান্টি-ফ্রড প্রটেকশন।'
                : 'Configure legitimate rewarded video ad parameters, USD reward per view, limits & cooldowns.'}
            </p>
          </div>
        </div>
        <button
          onClick={fetchSettings}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-[#142036] hover:bg-[#1b2b48] border border-[#223554] text-xs font-semibold text-slate-300 flex items-center gap-2 cursor-pointer transition shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{lang === 'bn' ? 'রিফ্রেশ' : 'Refresh'}</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-3 border ${
            message.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <div className="p-5 rounded-2xl bg-[#090f1c] border border-[#16253d] space-y-5">
          {/* Enable / Disable Switch */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#0f1a2e] border border-[#1e304f]">
            <div>
              <p className="text-sm font-bold text-white">
                {lang === 'bn' ? 'ভিডিও অ্যাড আর্নিং চালু রাখুন' : 'Enable Watch & Earn Ads'}
              </p>
              <p className="text-xs text-slate-400">
                {lang === 'bn'
                  ? 'বন্ধ রাখলে ইউজাররা অ্যাড পেজ দেখতে পাবে না বা আর্ন করতে পারবে না।'
                  : 'Toggle the entire ad reward feature on or off across the platform.'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ad Provider */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {lang === 'bn' ? 'বিজ্ঞাপন নেটওয়ার্ক / প্রোভাইডার' : 'Ad Provider Network'}
              </label>
              <select
                value={settings.adProvider}
                onChange={(e) => setSettings({ ...settings, adProvider: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1526] border border-[#1d2c47] text-white text-xs font-medium focus:border-sky-500 focus:outline-none"
              >
                <option value="admob">Google AdMob / Rewarded Ads</option>
                <option value="unity">Unity Ads Rewarded Video</option>
                <option value="applovin">AppLovin MAX Rewarded</option>
                <option value="google_ad_manager">Google Ad Manager (GAM)</option>
                <option value="custom">Custom Web SDK Provider</option>
              </select>
            </div>

            {/* Test Mode */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {lang === 'bn' ? 'টেস্ট মোড (Test Mode)' : 'Ad Test Mode'}
              </label>
              <div className="flex items-center gap-3 mt-1.5">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="testMode"
                    checked={settings.testMode}
                    onChange={() => setSettings({ ...settings, testMode: true })}
                    className="accent-pink-500"
                  />
                  <span>{lang === 'bn' ? 'চালু (Safe Testing)' : 'Enabled (Safe Test Ads)'}</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer ml-4">
                  <input
                    type="radio"
                    name="testMode"
                    checked={!settings.testMode}
                    onChange={() => setSettings({ ...settings, testMode: false })}
                    className="accent-pink-500"
                  />
                  <span>{lang === 'bn' ? 'লাইভ প্রোডাকশন' : 'Production Live Ads'}</span>
                </label>
              </div>
            </div>

            {/* Ad Unit ID */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {lang === 'bn' ? 'অ্যাড ইউনিট আইডি (Ad Unit ID / Placement ID)' : 'Ad Unit ID / Placement ID'}
              </label>
              <input
                type="text"
                value={settings.adUnitId}
                onChange={(e) => setSettings({ ...settings, adUnitId: e.target.value })}
                placeholder="ca-app-pub-3940256099942544/5224354917"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1526] border border-[#1d2c47] text-white text-xs font-mono focus:border-sky-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {lang === 'bn'
                  ? 'আপনার AdMob বা অ্যাড নেটওয়ার্ক থেকে পাওয়া Rewarded Video Ad Unit ID দিন।'
                  : 'Enter the Rewarded Ad Unit ID from your official advertising dashboard.'}
              </p>
            </div>

            {/* Reward Amount USD */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {lang === 'bn' ? 'প্রতি অ্যাডে রিওয়ার্ড ($ USD)' : 'Reward Amount per Ad ($ USD)'}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-xs">$</span>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  max="1.0"
                  value={settings.rewardAmountUsd}
                  onChange={(e) => setSettings({ ...settings, rewardAmountUsd: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-[#0d1526] border border-[#1d2c47] text-emerald-400 text-xs font-bold focus:border-sky-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {lang === 'bn' ? 'যেমন: 0.0050 = প্রতি সফল ভিডিওতে $0.005 যোগ হবে' : 'e.g., 0.005 = $0.005 USD per verified view'}
              </p>
            </div>

            {/* Daily Limit */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {lang === 'bn' ? 'দৈনিক সর্বোচ্চ অ্যাড দেখা যাবে' : 'Daily Ad View Limit per User'}
              </label>
              <input
                type="number"
                min="1"
                max="200"
                value={settings.dailyLimit}
                onChange={(e) => setSettings({ ...settings, dailyLimit: parseInt(e.target.value) || 10 })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1526] border border-[#1d2c47] text-white text-xs font-bold focus:border-sky-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {lang === 'bn' ? 'প্রতিদিন ১ জন ইউজার সর্বোচ্চ যতগুলো ভিডিও দেখতে পারবে' : 'Maximum number of ads one user can watch per UTC day'}
              </p>
            </div>

            {/* Cooldown Seconds */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {lang === 'bn' ? 'কুলডাউন সময় (Cooldown Seconds)' : 'Cooldown Between Ads (Seconds)'}
              </label>
              <input
                type="number"
                min="5"
                max="600"
                value={settings.cooldownSeconds}
                onChange={(e) => setSettings({ ...settings, cooldownSeconds: parseInt(e.target.value) || 30 })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1526] border border-[#1d2c47] text-white text-xs font-bold focus:border-sky-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {lang === 'bn' ? 'একটি অ্যাড দেখার পর পরবর্তী অ্যাড দেখার বিরতি' : 'Mandatory delay before the next ad session can start'}
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs shadow-lg shadow-pink-500/20 flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? (lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (lang === 'bn' ? 'সেটিংস সংরক্ষণ করুন' : 'Save Ad Settings')}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
