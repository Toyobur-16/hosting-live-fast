import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, AlertCircle, Loader2, ExternalLink, Copy, Check, Plus, Bot } from 'lucide-react';

interface TokenCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'bn' | 'en';
  onDeployWithToken?: (token: string, botName?: string) => void;
  initialToken?: string;
}

export const TokenCheckModal: React.FC<TokenCheckModalProps> = ({
  isOpen,
  onClose,
  lang,
  onDeployWithToken,
  initialToken = ''
}) => {
  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token.trim()) {
      setError(lang === 'bn' ? 'অনুগ্রহ করে টেলিগ্রাম বট টোকেন লিখুন।' : 'Please enter a Telegram bot token.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/telegram/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() })
      });
      const data = await res.json();

      if (data.ok && data.result) {
        setResult(data.result);
      } else {
        setError(
          data.description ||
            (lang === 'bn'
              ? 'টোকেনটি সঠিক নয় অথবা টেলিগ্রাম বটফাদার থেকে বাতিল করা হয়েছে।'
              : 'Invalid bot token or revoked in BotFather.')
        );
      }
    } catch (err: any) {
      setError(
        lang === 'bn'
          ? 'টেলিগ্রাম সার্ভারে সংযোগ করতে সমস্যা হয়েছে: ' + err.message
          : 'Failed to connect to Telegram API: ' + err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUsername = (username: string) => {
    navigator.clipboard.writeText(`@${username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setToken(text.trim());
      }
    } catch {}
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1f293d] rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden transition-colors">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#e2e8f0] dark:border-[#1f293d] flex items-center justify-between bg-[#f8fafc] dark:bg-[#161f30]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0088cc]/10 dark:bg-[#0088cc]/20 border border-[#0088cc]/20 flex items-center justify-center text-[#0088cc]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1e293b] dark:text-white">
                {lang === 'bn' ? 'টেলিগ্রাম বট টোকেন চেকার' : 'Telegram Bot Token Checker'}
              </h3>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                {lang === 'bn' ? 'অফিসিয়াল টেলিগ্রাম API দিয়ে লাইভ ভেরিফিকেশন' : 'Live verification via official Telegram API'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-white hover:bg-[#e2e8f0] dark:hover:bg-[#1f293d] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          <form onSubmit={handleVerify} className="space-y-3">
            <label className="block text-xs font-semibold text-[#1e293b] dark:text-[#f3f4f6]">
              {lang === 'bn' ? 'বট টোকেন পেস্ট করুন' : 'Enter or Paste Bot Token'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setError(null);
                }}
                placeholder="123456789:AAH..."
                className="w-full px-3.5 py-2.5 pr-20 rounded-xl bg-[#f8fafc] dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-xs font-mono text-[#1e293b] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#0088cc]"
              />
              <button
                type="button"
                onClick={handlePaste}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-[#0f172a] hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] text-[#64748b] dark:text-[#94a3b8] rounded-lg border border-[#e2e8f0] dark:border-[#334155] cursor-pointer transition-colors"
              >
                {lang === 'bn' ? 'পেস্ট' : 'Paste'}
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                {lang === 'bn' ? 'টোকেন @BotFather থেকে পাওয়া যায়' : 'Get tokens from @BotFather on Telegram'}
              </span>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold shadow-sm shadow-[#0088cc]/20 cursor-pointer disabled:opacity-50 transition-all hover:scale-[1.01]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{lang === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Verifying...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'টোকেন চেক করুন' : 'Check Token'}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">{lang === 'bn' ? 'টোকেন যাচাই ব্যর্থ হয়েছে:' : 'Verification Failed:'}</span>
                <p className="font-mono text-[11px] text-rose-700 dark:text-rose-300">{error}</p>
                <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1">
                  {lang === 'bn'
                    ? 'টিপস: টোকেনের শুরুতে বা শেষে কোনো অতিরিক্ত স্পেস আছে কিনা এবং @BotFather থেকে পুনরায় নতুন টোকেন তৈরি করেছেন কিনা দেখুন।'
                    : 'Tip: Check for extra whitespace or generate a new token via @BotFather.'}
                </p>
              </div>
            </div>
          )}

          {/* Success Result Card */}
          {result && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      {lang === 'bn' ? 'টোকেনটি ১০০% সক্রিয় ও প্রস্তুত!' : 'Token is 100% Valid & Online!'}
                    </span>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      {lang === 'bn' ? 'এই বট দিয়ে অবিলম্বে হোস্টিং শুরু করতে পারেন।' : 'Ready to deploy and host 24/7.'}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold uppercase">
                  ACTIVE
                </span>
              </div>

              <div className="bg-[#f8fafc] dark:bg-[#161f30] border border-[#e2e8f0] dark:border-[#1f293d] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0] dark:border-[#1f293d]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0088cc] text-white flex items-center justify-center font-bold text-base shadow-xs">
                      {result.first_name ? result.first_name.charAt(0).toUpperCase() : 'B'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#1e293b] dark:text-white">{result.first_name}</h4>
                      <div className="flex items-center gap-1.5 text-xs text-[#0088cc] font-semibold mt-0.5">
                        <span>@{result.username}</span>
                        <button
                          onClick={() => handleCopyUsername(result.username)}
                          className="text-[#94a3b8] hover:text-[#0088cc] p-0.5 cursor-pointer"
                          title="Copy username"
                        >
                          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <a
                    href={`https://t.me/${result.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] text-xs font-semibold text-[#0088cc] hover:bg-[#f1f5f9] dark:hover:bg-[#334155] transition-colors"
                  >
                    <span>{lang === 'bn' ? 'টেলিগ্রামে খুলুন' : 'Open in TG'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1f293d]">
                    <span className="text-[#64748b] dark:text-[#94a3b8] block">{lang === 'bn' ? 'বট আইডি:' : 'Bot ID:'}</span>
                    <span className="font-mono font-bold text-[#1e293b] dark:text-white">{result.id}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1f293d]">
                    <span className="text-[#64748b] dark:text-[#94a3b8] block">{lang === 'bn' ? 'গ্রুপ সাপোর্ট:' : 'Group Support:'}</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {result.can_join_groups !== false ? (lang === 'bn' ? 'হ্যাঁ (যোগ হতে পারবে)' : 'Yes') : (lang === 'bn' ? 'না' : 'No')}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1f293d]">
                    <span className="text-[#64748b] dark:text-[#94a3b8] block">{lang === 'bn' ? 'গ্রুপ মেসেজ রিড:' : 'Group Read:'}</span>
                    <span className="font-semibold text-[#1e293b] dark:text-white">
                      {result.can_read_all_group_messages ? (lang === 'bn' ? 'সরাসরি সব মেসেজ' : 'All Messages') : (lang === 'bn' ? 'প্রাইভেসি মোড সক্রিয়' : 'Privacy Mode')}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1f293d]">
                    <span className="text-[#64748b] dark:text-[#94a3b8] block">{lang === 'bn' ? 'ইনলাইন মোড:' : 'Inline Queries:'}</span>
                    <span className="font-semibold text-[#1e293b] dark:text-white">
                      {result.supports_inline_queries ? (lang === 'bn' ? 'সক্রিয়' : 'Supported') : (lang === 'bn' ? 'নিষ্ক্রিয়' : 'Disabled')}
                    </span>
                  </div>
                </div>

                {onDeployWithToken && (
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        onDeployWithToken(token.trim(), result.first_name);
                        onClose();
                      }}
                      className="w-full py-2.5 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-[#0088cc]/20 cursor-pointer transition-all hover:scale-[1.01]"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        {lang === 'bn'
                          ? `এই টোকেন দিয়ে সরাসরি '${result.first_name}' ডিপ্লয় করুন`
                          : `Deploy '${result.first_name}' With This Token`}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-[#f8fafc] dark:bg-[#161f30] border-t border-[#e2e8f0] dark:border-[#1f293d] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-[#1e293b] hover:bg-[#f1f5f9] dark:hover:bg-[#334155] text-[#64748b] hover:text-[#1e293b] dark:text-[#94a3b8] dark:hover:text-white text-xs font-semibold rounded-xl border border-[#e2e8f0] dark:border-[#334155] cursor-pointer transition-colors"
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
