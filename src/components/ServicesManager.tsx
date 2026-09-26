import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Globe, Save, CheckCircle2, RefreshCw, Zap, Server, Key, Radio, AlertCircle } from 'lucide-react';
import { ServiceItem } from '../types';

interface ServicesManagerProps {
  lang: 'bn' | 'en';
  botId?: string;
  botName?: string;
}

export const ServicesManager: React.FC<ServicesManagerProps> = ({ lang, botId, botName }) => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [baseUrl, setBaseUrl] = useState('https://minosms.com');
  const [apiKey, setApiKey] = useState('');
  const [botToken, setBotToken] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);

  const [newServiceName, setNewServiceName] = useState('');
  const [selectedServiceIndex, setSelectedServiceIndex] = useState<number>(0);
  const [newRangeValue, setNewRangeValue] = useState('');
  const [newCountryName, setNewCountryName] = useState('');

  const fetchConfig = async () => {
    try {
      const url = botId ? `/api/bots/${botId}/sms-config` : '/api/sms-config';
      const res = await fetch(url);
      const data = await res.json();
      if (data.baseUrl) setBaseUrl(data.baseUrl);
      if (data.apiKey) setApiKey(data.apiKey);
      if (data.token) setBotToken(data.token);
    } catch {
      // Ignore
    }
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const url = botId ? `/api/services?botId=${botId}` : '/api/services';
      const res = await fetch(url);
      const data = await res.json();
      if (data.services && Array.isArray(data.services)) {
        setServices(data.services);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
    fetchConfig();
  }, [botId]);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const url = botId ? `/api/bots/${botId}/sms-config` : '/api/sms-config';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl, apiKey, token: botToken, botId })
      });
      const data = await res.json();
      if (data.success) {
        setConfigSuccess(true);
        setTimeout(() => setConfigSuccess(false), 3000);
      }
    } catch {
      // Ignore
    } finally {
      setSavingConfig(false);
    }
  };

  const handleResetDefaultServices = async () => {
    if (!window.confirm(lang === 'bn' ? 'আপনি কি সার্ভিস তালিকা ডিফল্টে রিসেট করতে চান?' : 'Restore default services?')) return;
    setLoading(true);
    try {
      const url = botId ? `/api/bots/${botId}/services/reset-default` : '/api/services/reset-default';
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ botId }) });
      const data = await res.json();
      if (data.services) {
        setServices(data.services);
        setSelectedServiceIndex(0);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllServices = async () => {
    if (!window.confirm(lang === 'bn' ? 'আপনি কি সব সার্ভিস মুছে ফেলতে চান? বটের গেট নাম্বার খালি হয়ে যাবে।' : 'Clear all services? Bot will have no active services.')) return;
    setLoading(true);
    try {
      const url = botId ? `/api/bots/${botId}/services/clear` : '/api/services/clear';
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ botId }) });
      const data = await res.json();
      if (data.success) {
        setServices([]);
        setSelectedServiceIndex(0);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSaveServices = async (updatedList: ServiceItem[]) => {
    setSaving(true);
    try {
      const url = botId ? `/api/services?botId=${botId}` : '/api/services';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: updatedList, botId })
      });
      const data = await res.json();
      if (data.success) {
        setServices(updatedList);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch {
      // Ignore
    } finally {
      setSaving(false);
    }
  };

  const handleAddService = () => {
    if (!newServiceName.trim()) return;
    const name = newServiceName.trim().toUpperCase();
    if (services.some(s => s.sid === name)) return;
    const updated = [...services, { sid: name, ranges: [] }];
    handleSaveServices(updated);
    setNewServiceName('');
    setSelectedServiceIndex(updated.length - 1);
  };

  const handleDeleteService = (index: number) => {
    const updated = services.filter((_, i) => i !== index);
    handleSaveServices(updated);
    if (selectedServiceIndex >= updated.length) {
      setSelectedServiceIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleAddRange = () => {
    if (!newRangeValue.trim()) return;
    const current = services[selectedServiceIndex];
    if (!current) return;
    let country = newCountryName.trim();
    if (!country) {
      country = 'International';
    }
    const updated = [...services];
    updated[selectedServiceIndex] = {
      ...current,
      ranges: [...current.ranges, { range: newRangeValue.trim().toUpperCase(), country }]
    };
    handleSaveServices(updated);
    setNewRangeValue('');
    setNewCountryName('');
  };

  const handleDeleteRange = (rangeIdx: number) => {
    const current = services[selectedServiceIndex];
    if (!current) return;
    const updated = [...services];
    updated[selectedServiceIndex] = {
      ...current,
      ranges: current.ranges.filter((_, i) => i !== rangeIdx)
    };
    handleSaveServices(updated);
  };

  const activeService = services[selectedServiceIndex];

  return (
    <div className="space-y-6">
      {/* SMS Gateway Config */}
      <div className="bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1f293d] rounded-2xl p-6 shadow-sm transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-[#f1f5f9] dark:border-[#1f293d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0088cc]/10 dark:bg-[#0088cc]/20 flex items-center justify-center text-[#0088cc]">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#1e293b] dark:text-white">
                  {lang === 'bn' ? 'SMS প্যানেল গেটওয়ে' : 'SMS Panel Site & API Gateway'}
                </h3>
                {botName && (
                  <span className="px-2 py-0.5 rounded-full bg-[#0088cc]/10 dark:bg-[#0088cc]/20 text-[#0088cc] text-[11px] font-semibold">
                    {botName}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                {lang === 'bn'
                  ? 'বটের জন্য Base URL এবং API Key কনফিগারেশন'
                  : 'Configure Base URL and API Key for Telegram bot.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearAllServices}
              disabled={loading || services.length === 0}
              className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
              title={lang === 'bn' ? 'সব সার্ভিস ডিলিট করুন' : 'Clear all services'}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>{lang === 'bn' ? 'সব মুছুন (Clear All)' : 'Clear All Services'}</span>
            </button>
            <button
              onClick={handleResetDefaultServices}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{lang === 'bn' ? 'ডিফল্ট রিসেট' : 'Reset All Services'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8] mb-1.5">
              {lang === 'bn' ? 'সাইট URL' : 'Site Base URL'}
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-[#94a3b8] absolute left-3 top-2.5" />
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://minosms.com"
                className="w-full pl-9 pr-3 py-2 bg-[#f8fafc] dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] rounded-xl text-xs text-[#1e293b] dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#0088cc]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8] mb-1.5">
              {lang === 'bn' ? 'প্যানেল API Key' : 'Panel API Key'}
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-[#94a3b8] absolute left-3 top-2.5" />
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="mino_live_..."
                className="w-full pl-9 pr-3 py-2 bg-[#f8fafc] dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] rounded-xl text-xs text-[#1e293b] dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#0088cc]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8] mb-1.5">
              {lang === 'bn' ? 'বট টোকেন' : 'Telegram Bot Token'}
            </label>
            <div className="relative">
              <Radio className="w-4 h-4 text-[#94a3b8] absolute left-3 top-2.5" />
              <input
                type="text"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="8814477083:AAH_..."
                className="w-full pl-9 pr-3 py-2 bg-[#f8fafc] dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] rounded-xl text-xs text-[#1e293b] dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#0088cc]"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingConfig ? (lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (lang === 'bn' ? 'কনফিগ সেভ করুন' : 'Save Config')}</span>
          </button>
          {configSuccess && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              {lang === 'bn' ? 'সফলভাবে সংরক্ষিত!' : 'Config saved successfully!'}
            </span>
          )}
        </div>
      </div>

      {/* Services List & Range Editor */}
      <div className="bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1f293d] rounded-2xl overflow-hidden shadow-sm p-6 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[#f1f5f9] dark:border-[#1f293d]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#0088cc]/10 dark:bg-[#0088cc]/20 flex items-center justify-center text-[#0088cc]">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1e293b] dark:text-white">
                {lang === 'bn' ? 'সার্ভিস ও নাম্বার রেঞ্জ' : 'Custom Services & Number Ranges'}
              </h3>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                {lang === 'bn'
                  ? 'টেলিগ্রাম বটের জন্য সার্ভিস ও কান্ট্রি রেঞ্জ'
                  : 'Configure supported apps and country phone prefixes for Telegram.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {lang === 'bn' ? 'সংরক্ষিত!' : 'Saved!'}
              </span>
            )}
            <button
              onClick={fetchServices}
              disabled={loading}
              className="p-2 rounded-xl bg-[#f8fafc] dark:bg-[#1e293b] hover:bg-[#f1f5f9] dark:hover:bg-[#283548] text-[#64748b] dark:text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-white border border-[#e2e8f0] dark:border-[#334155] transition-all cursor-pointer"
              title="Reload services"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-[#f8fafc] dark:bg-[#161f30] border border-[#e2e8f0] dark:border-[#1f293d] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8]">
                {lang === 'bn' ? 'সার্ভিস তালিকা' : 'Active Services'} ({services.length})
              </h4>
              {services.length === 0 && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5">
                  <AlertCircle className="w-3 h-3" />
                  {lang === 'bn' ? 'খালি' : 'Empty'}
                </span>
              )}
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder={lang === 'bn' ? 'উদা: NETFLIX' : 'e.g. NETFLIX'}
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                className="flex-1 bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] rounded-xl px-3 py-2 text-xs text-[#1e293b] dark:text-white uppercase placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#0088cc]"
              />
              <button
                onClick={handleAddService}
                disabled={!newServiceName.trim() || saving}
                className="px-3.5 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'যোগ' : 'Add'}</span>
              </button>
            </div>
            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
              {services.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#94a3b8]">
                  {lang === 'bn' ? 'কোনো সার্ভিস নেই। উপরের বক্সে নাম লিখে যোগ করুন।' : 'No services added. Type a name above to add.'}
                </div>
              ) : (
                services.map((svc, idx) => (
                  <div
                    key={svc.sid}
                    onClick={() => setSelectedServiceIndex(idx)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedServiceIndex === idx
                        ? 'bg-white dark:bg-[#1e293b] border-[#0088cc] text-[#0088cc] font-semibold shadow-xs ring-1 ring-[#0088cc]'
                        : 'bg-white dark:bg-[#1e293b] border-[#e2e8f0] dark:border-[#334155] text-[#1e293b] dark:text-white hover:border-[#cbd5e1] dark:hover:border-[#475569]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold">{svc.sid}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f1f5f9] dark:bg-[#283548] text-[#64748b] dark:text-[#94a3b8] font-semibold">
                        {svc.ranges.length} {lang === 'bn' ? 'টি রেঞ্জ' : 'ranges'}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteService(idx);
                      }}
                      className="text-[#94a3b8] hover:text-rose-600 p-1 transition-colors"
                      title="Delete service"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-[#f8fafc] dark:bg-[#161f30] border border-[#e2e8f0] dark:border-[#1f293d] rounded-2xl p-5">
            {activeService ? (
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#e2e8f0] dark:border-[#1f293d]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#1e293b] dark:text-white flex items-center gap-2">
                    <span className="text-[#0088cc] font-mono text-sm">{activeService.sid}</span>
                    <span className="text-[#64748b] dark:text-[#94a3b8] font-normal">
                      ({activeService.ranges.length} {lang === 'bn' ? 'টি রেঞ্জ আছে' : 'ranges available'})
                    </span>
                  </h4>
                </div>

                <div className="bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] rounded-xl p-4 mb-4 shadow-xs">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8] mb-2.5">
                    {lang === 'bn' ? 'নতুন রেঞ্জ যোগ করুন:' : 'Add New Number Range:'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      placeholder="Range (e.g. 23762XXX)"
                      value={newRangeValue}
                      onChange={(e) => setNewRangeValue(e.target.value)}
                      className="bg-[#f8fafc] dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#334155] rounded-xl px-3 py-2 text-xs text-[#1e293b] dark:text-white uppercase placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#0088cc] font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Country (e.g. Cameroon)"
                      value={newCountryName}
                      onChange={(e) => setNewCountryName(e.target.value)}
                      className="bg-[#f8fafc] dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#334155] rounded-xl px-3 py-2 text-xs text-[#1e293b] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#0088cc]"
                    />
                    <button
                      onClick={handleAddRange}
                      disabled={!newRangeValue.trim() || saving}
                      className="bg-[#0088cc] hover:bg-[#0077b5] text-white font-semibold text-xs rounded-xl px-4 py-2 flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-[#0088cc]/20 disabled:opacity-50 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{lang === 'bn' ? 'যুক্ত করুন' : 'Add Range'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {activeService.ranges.length === 0 ? (
                    <p className="text-xs text-[#94a3b8] py-8 text-center col-span-2">
                      {lang === 'bn' ? 'কোনো রেঞ্জ এখনো যোগ করা হয়নি।' : 'No number ranges added yet for this service.'}
                    </p>
                  ) : (
                    activeService.ranges.map((r, rIdx) => (
                      <div
                        key={`${r.range}-${rIdx}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] hover:border-[#cbd5e1] dark:hover:border-[#475569] shadow-xs transition-colors"
                      >
                        <div>
                          <div className="text-xs font-mono font-bold text-[#1e293b] dark:text-white">{r.range}</div>
                          <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-0.5">{r.country}</div>
                        </div>
                        <button
                          onClick={() => handleDeleteRange(rIdx)}
                          className="text-[#94a3b8] hover:text-rose-600 p-1 transition-colors"
                          title="Delete range"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-[#94a3b8] text-xs">
                {lang === 'bn' ? 'বাম পাশের তালিকা থেকে একটি সার্ভিস নির্বাচন করুন।' : 'Select a service from the left list.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
