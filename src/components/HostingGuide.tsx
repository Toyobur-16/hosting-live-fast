import React, { useState } from 'react';
import { Download, ExternalLink, Copy, Check, Radio } from 'lucide-react';

interface HostingGuideProps {
  lang: 'bn' | 'en';
  botId?: string;
  botName?: string;
}

export const HostingGuide: React.FC<HostingGuideProps> = ({ lang, botId, botName }) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const currentHost = typeof window !== 'undefined' ? window.location.origin : '';
  const keepAliveUrl = botId ? `${currentHost}/api/keepalive/${botId}` : `${currentHost}/api/ping`;
  const downloadUrl = botId ? `/api/bots/${botId}/export/zip` : '/api/export/zip';

  const copyPingUrl = () => {
    navigator.clipboard.writeText(keepAliveUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleDownloadZip = () => {
    setDownloading(true);
    window.location.href = downloadUrl;
    setTimeout(() => setDownloading(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 24/7 Offline Protection & Keep-Alive Box */}
      <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-xl">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider flex items-center gap-1.5 w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {lang === 'bn' ? '২৪/৭ ক্লাউড অটো-রিকভারি' : '24/7 Unlimited Live Protection'}
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#1e293b] mt-2.5">
              {botName ? `${botName} - ` : ''}
              {lang === 'bn'
                ? 'আপনার বট সবসময় সচল ও লাইভ থাকবে'
                : 'Your Bot Runs 24/7 Online Even When You Are Offline'}
            </h2>
            <p className="text-xs sm:text-sm text-[#64748b] mt-1.5 leading-relaxed">
              {lang === 'bn'
                ? 'BotHost ক্লাউড সিস্টেমে আপনার বট ফাইল সুরক্ষিত থাকে এবং প্রসেস ক্র্যাশ হলে অটো-রিস্টার্ট হয়। সাইটকে স্লিপ হওয়া থেকে রক্ষা করতে Keep-Alive URL ব্যবহার করুন।'
                : 'BotHost cloud runner keeps processes running detached in the background. If a script exits, our watchdog revives it immediately.'}
            </p>
          </div>
          <button
            onClick={handleDownloadZip}
            disabled={downloading}
            className="px-5 py-2.5 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs sm:text-sm font-semibold shadow-sm shadow-[#0088cc]/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'bn' ? 'বট ফাইলস (.ZIP) ডাউনলোড' : 'Download Bot Pack (.ZIP)'}</span>
          </button>
        </div>

        {/* 24/7 Keep-Alive Uptime Ping Section */}
        <div className="mt-5 pt-4 border-t border-[#f1f5f9] flex flex-wrap items-center justify-between gap-3 bg-[#f8fafc] p-3.5 rounded-xl border border-[#e2e8f0]">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#0088cc] animate-pulse" />
            <span className="text-xs text-[#1e293b] font-medium">
              {lang === 'bn' ? 'কিপ-এলাইভ URL (UptimeRobot এর জন্য):' : '24/7 Keep-Alive Ping URL (for UptimeRobot):'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
            <code className="bg-white border border-[#e2e8f0] px-3 py-1.5 rounded-lg text-xs font-mono text-[#0088cc] select-all truncate">
              {keepAliveUrl}
            </code>
            <button
              onClick={copyPingUrl}
              className="p-1.5 rounded-lg bg-white hover:bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0] transition-colors cursor-pointer"
              title="Copy URL"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Free Hosting Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Render */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#0088cc] bg-[#0088cc]/10 px-2.5 py-1 rounded-full">
                Render.com
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                100% Free
              </span>
            </div>
            <h3 className="font-bold text-[#1e293b] text-sm mb-1.5">Background Worker</h3>
            <p className="text-xs text-[#64748b] leading-relaxed mb-3">
              {lang === 'bn'
                ? 'Render-এ Background Worker হিসেবে বিনামূল্যে সরাসরি পাইথন বট চালানো যায়।'
                : 'Deploy as Background Worker or Web Service. Procfile and requirements.txt are preconfigured.'}
            </p>
            <ol className="text-xs text-[#64748b] list-decimal list-inside space-y-1 bg-[#f8fafc] p-3 rounded-xl border border-[#e2e8f0]">
              <li>GitHub এ আপলোড করুন</li>
              <li>New Web Service তৈরি করুন</li>
              <li>Start Command: <code className="text-[#0088cc] font-mono">python bot.py</code></li>
            </ol>
          </div>
          <a
            href="https://render.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#0088cc] hover:text-[#0077b5] py-2 border border-[#0088cc]/20 rounded-xl hover:bg-[#0088cc]/5 transition-all"
          >
            <span>Render এ দেখুন</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Koyeb */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#0088cc] bg-[#0088cc]/10 px-2.5 py-1 rounded-full">
                Koyeb
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Free Tier
              </span>
            </div>
            <h3 className="font-bold text-[#1e293b] text-sm mb-1.5">Serverless Container</h3>
            <p className="text-xs text-[#64748b] leading-relaxed mb-3">
              {lang === 'bn'
                ? 'Koyeb ক্লাউডে পাইথন পরিবেশ খুব সহজে ডিপ্লয় করা যায়।'
                : 'Zero-downtime micro-instances. Connect GitHub and deploy with native Python runtime.'}
            </p>
            <ol className="text-xs text-[#64748b] list-decimal list-inside space-y-1 bg-[#f8fafc] p-3 rounded-xl border border-[#e2e8f0]">
              <li>Koyeb একাউন্ট খুলুন</li>
              <li>GitHub Repo কানেক্ট করুন</li>
              <li>Build Command: <code className="text-[#0088cc] font-mono">pip install -r requirements.txt</code></li>
            </ol>
          </div>
          <a
            href="https://www.koyeb.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#0088cc] hover:text-[#0077b5] py-2 border border-[#0088cc]/20 rounded-xl hover:bg-[#0088cc]/5 transition-all"
          >
            <span>Koyeb এ দেখুন</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* VPS / Linux */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#0088cc] bg-[#0088cc]/10 px-2.5 py-1 rounded-full">
                Linux VPS / Ubuntu
              </span>
              <span className="text-xs font-semibold text-[#64748b] bg-[#f8fafc] px-2 py-0.5 rounded-full border border-[#e2e8f0]">
                systemd / pm2
              </span>
            </div>
            <h3 className="font-bold text-[#1e293b] text-sm mb-1.5">Self-Hosted Server</h3>
            <p className="text-xs text-[#64748b] leading-relaxed mb-3">
              {lang === 'bn'
                ? 'একটি ছোট VPS সার্ভারে PM2 বা Systemd দিয়ে বট আজীবন নিরবচ্ছিন্নভাবে চালানো যায়।'
                : 'Run continuously in the background using PM2 or systemd service.'}
            </p>
            <div className="bg-[#0f172a] text-slate-300 p-3 rounded-xl text-[11px] font-mono space-y-1">
              <p className="text-slate-400"># Run with PM2:</p>
              <p className="text-emerald-400">pm2 start bot.py --interpreter python3 --name "telebot"</p>
              <p className="text-emerald-400">pm2 save && pm2 startup</p>
            </div>
          </div>
          <div className="mt-4 py-2 text-center text-xs text-[#64748b] font-medium">
            {lang === 'bn' ? 'স্থায়ী ২৪/৭ সার্ভিস' : 'Continuous 24/7 Service'}
          </div>
        </div>
      </div>
    </div>
  );
};
