import React, { useState } from 'react';
import { X, Upload, FileCode, Plus, Zap, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { HostedBot } from '../types';

interface NewBotModalProps {
  onClose: () => void;
  onCreated: (bot: HostedBot) => void;
  lang: 'bn' | 'en';
  initialToken?: string;
  initialName?: string;
}

const TEMPLATES = [
  {
    id: 'blank',
    name: 'Standard Python Bot',
    entry: 'bot.py',
    code: `# Telegram Bot - Python
import os
import logging
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, ContextTypes, filters

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    await update.message.reply_text(f"Hello {user.first_name}! Your bot is running 24/7.")

async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(update.message.text)

if __name__ == '__main__':
    print("Bot starting...")
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))
    app.run_polling()
`
  }
];

export const NewBotModal: React.FC<NewBotModalProps> = ({ onClose, onCreated, lang, initialToken = '', initialName = '' }) => {
  const [name, setName] = useState(initialName);
  const [token, setToken] = useState(initialToken);
  const [entryFile, setEntryFile] = useState('bot.py');
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [code, setCode] = useState(TEMPLATES[0].code);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; content: string }[]>([]);
  const [zipBase64, setZipBase64] = useState<string | null>(null);
  const [zipFileName, setZipFileName] = useState<string | null>(null);
  const [autoStart, setAutoStart] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenChecking, setTokenChecking] = useState(false);
  const [tokenVerifyInfo, setTokenVerifyInfo] = useState<{ ok: boolean; message: string } | null>(null);

  const handleInlineTokenCheck = async () => {
    if (!token.trim()) return;
    setTokenChecking(true);
    setTokenVerifyInfo(null);
    try {
      const res = await fetch('/api/telegram/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() })
      });
      const data = await res.json();
      if (data.ok && data.result) {
        setTokenVerifyInfo({
          ok: true,
          message: `@${data.result.username} (${data.result.first_name})`
        });
        if (!name) {
          setName(data.result.first_name);
        }
      } else {
        setTokenVerifyInfo({
          ok: false,
          message: data.description || 'Invalid token'
        });
      }
    } catch (err: any) {
      setTokenVerifyInfo({
        ok: false,
        message: err.message || 'Connection error'
      });
    } finally {
      setTokenChecking(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);
    const readList: { name: string; content: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.toLowerCase().endsWith('.zip')) {
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const res = reader.result as string;
              resolve(res.includes(',') ? res.split(',')[1] : res);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          setZipBase64(base64);
          setZipFileName(file.name);
          if (!name) {
            const suggested = file.name.replace(/\.zip$/i, '').replace(/[_\-\(\)]+/g, ' ').trim();
            setName(suggested ? suggested.charAt(0).toUpperCase() + suggested.slice(1) : 'Telegram Bot');
          }
        } catch (err: any) {
          setError(lang === 'bn' ? 'জিপ রিড করতে সমস্যা: ' + err.message : 'Error reading zip file: ' + err.message);
        }
        continue;
      }

      try {
        const text = await file.text();
        readList.push({ name: file.name, content: text });
        if (file.name.toLowerCase().endsWith('.py')) {
          setEntryFile(file.name);
          if (!name) {
            const suggested = file.name.replace(/\.py$/i, '').replace(/[_\-\(\)]+/g, ' ').trim();
            setName(suggested ? suggested.charAt(0).toUpperCase() + suggested.slice(1) : 'Telegram Bot');
          }
          const match = text.match(/BOT_TOKEN\s*=\s*(?:os\.getenv\([^,]+,\s*)?["']([0-9]{8,14}:[a-zA-Z0-9_-]{25,50})["']/);
          if (match && match[1] && !token) {
            setToken(match[1]);
          }
        }
      } catch (err: any) {
        console.error('File read error:', err);
      }
    }
    setUploadedFiles(readList);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(lang === 'bn' ? 'বটের একটি নাম দিন।' : 'Bot name is required.');
      return;
    }

    let filesToSend: { name: string; content: string }[] = [];
    if (inputMode === 'upload') {
      if (uploadedFiles.length === 0 && !zipBase64) {
        setError(lang === 'bn' ? 'একটি পাইথন ফাইল (.py) অথবা জিপ ফাইল (.zip) নির্বাচন করুন।' : 'Please upload a .py file or zip archive.');
        return;
      }
      filesToSend = uploadedFiles;
    } else {
      filesToSend = [{ name: entryFile || 'bot.py', content: code }];
    }

    setSubmitting(true);
    setError(null);

    try {
      const tokenHeader = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenHeader ? { 'Authorization': `Bearer ${tokenHeader}` } : {})
        },
        body: JSON.stringify({
          name: name.trim(),
          entryFile: entryFile.trim() || 'bot.py',
          token: token.trim(),
          files: filesToSend,
          zipBase64: zipBase64 || undefined,
          autoStart
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to deploy bot');
      }

      onCreated(data.bot);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1f293d] rounded-2xl p-6 max-w-2xl w-full shadow-2xl my-8 transition-colors">
        <div className="flex items-center justify-between pb-4 border-b border-[#f1f5f9] dark:border-[#1f293d] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0088cc]/10 dark:bg-[#0088cc]/20 flex items-center justify-center text-[#0088cc]">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1e293b] dark:text-white">
                {lang === 'bn' ? 'নতুন টেলিগ্রাম বট হোস্ট করুন' : 'Deploy New Telegram Bot'}
              </h3>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                {lang === 'bn'
                  ? 'আপনার দেওয়া ফাইল অক্ষত থাকবে, কোনো কোড পরিবর্তন হবে না।'
                  : 'Your uploaded files remain exactly as uploaded without modifications.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-white p-1.5 rounded-lg hover:bg-[#f8fafc] dark:hover:bg-[#1e293b] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1e293b] dark:text-[#f3f4f6] mb-1.5">
                {lang === 'bn' ? 'বটের নাম *' : 'Bot Name *'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={lang === 'bn' ? 'যেমন: My Telegram Bot' : 'e.g. My Telegram Bot'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8fafc] dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] text-xs text-[#1e293b] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#0088cc]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1e293b] dark:text-[#f3f4f6] mb-1.5">
                {lang === 'bn' ? 'মেইন স্ক্রিপ্ট ফাইল' : 'Main Script File'}
              </label>
              <input
                type="text"
                value={entryFile}
                onChange={(e) => setEntryFile(e.target.value)}
                placeholder="bot.py"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8fafc] dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] text-xs font-mono text-[#1e293b] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0088cc]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#1e293b] dark:text-[#f3f4f6]">
                {lang === 'bn' ? 'টেলিগ্রাম বট টোকেন (ঐচ্ছিক)' : 'Telegram Bot Token (Optional)'}
              </label>
              {token.trim() && (
                <button
                  type="button"
                  onClick={handleInlineTokenCheck}
                  disabled={tokenChecking}
                  className="text-[11px] font-semibold text-[#0088cc] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {tokenChecking ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3 h-3" />
                  )}
                  <span>{lang === 'bn' ? 'টোকেন টেস্ট' : 'Test Token'}</span>
                </button>
              )}
            </div>
            <input
              type="text"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setTokenVerifyInfo(null);
              }}
              placeholder="123456789:AAH_..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8fafc] dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] text-xs font-mono text-[#1e293b] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#0088cc]"
            />
            {tokenVerifyInfo && (
              <div
                className={`mt-1.5 text-[11px] flex items-center gap-1.5 font-semibold ${
                  tokenVerifyInfo.ok
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {tokenVerifyInfo.ok ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>✓ {lang === 'bn' ? 'সঠিক টোকেন:' : 'Valid token:'} {tokenVerifyInfo.message}</span>
                  </>
                ) : (
                  <>
                    <X className="w-3.5 h-3.5 shrink-0" />
                    <span>✗ {tokenVerifyInfo.message}</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#1e293b] dark:text-[#f3f4f6]">
                {lang === 'bn' ? 'ফাইল আপলোড বা কোড পেস্ট' : 'Bot Code & Files'}
              </label>
              <div className="flex bg-[#f8fafc] dark:bg-[#1e293b] p-1 rounded-xl border border-[#e2e8f0] dark:border-[#334155]">
                <button
                  type="button"
                  onClick={() => setInputMode('upload')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    inputMode === 'upload'
                      ? 'bg-white dark:bg-[#0f172a] text-[#0088cc] shadow-xs'
                      : 'text-[#64748b] dark:text-[#94a3b8]'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 inline mr-1" />
                  {lang === 'bn' ? 'ফাইল আপলোড' : 'Upload File'}
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('paste')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    inputMode === 'paste'
                      ? 'bg-white dark:bg-[#0f172a] text-[#0088cc] shadow-xs'
                      : 'text-[#64748b] dark:text-[#94a3b8]'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 inline mr-1" />
                  {lang === 'bn' ? 'কোড লিখুন' : 'Paste Code'}
                </button>
              </div>
            </div>

            {inputMode === 'upload' ? (
              <div className="border-2 border-dashed border-[#cbd5e1] dark:border-[#334155] hover:border-[#0088cc] rounded-2xl p-6 text-center transition-colors bg-[#f8fafc]/50 dark:bg-[#1e293b]/40">
                <input
                  type="file"
                  id="bot-file-input"
                  multiple
                  accept=".py,.json,.txt,.env,.zip"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="bot-file-input" className="cursor-pointer flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#0088cc]/10 dark:bg-[#0088cc]/20 text-[#0088cc] flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-[#1e293b] dark:text-white">
                    {lang === 'bn' ? 'ফাইল বা জিপ (.zip) ফাইল নির্বাচন করতে এখানে ক্লিক করুন' : 'Click to select or drag & drop files / .zip archive'}
                  </span>
                  <span className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-1">
                    {lang === 'bn' ? 'সাপোর্ট: .py, .zip, .json, requirements.txt' : 'Supports: .py, .zip, .json, requirements.txt'}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    {lang === 'bn' ? 'আপনার ফাইল কোনো পরিবর্তন ছাড়াই হুবহু চলবে' : 'Files are preserved exactly as uploaded'}
                  </span>
                </label>

                {(uploadedFiles.length > 0 || zipFileName) && (
                  <div className="mt-4 pt-3 border-t border-[#e2e8f0] dark:border-[#334155] text-left">
                    <span className="text-[11px] font-semibold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider block mb-2">
                      {lang === 'bn' ? 'নির্বাচিত ফাইলসমূহ:' : 'Selected Files:'}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {zipFileName && (
                        <div className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-mono text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 font-semibold">
                          <FileCode className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{zipFileName}</span>
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded">ZIP Archive</span>
                        </div>
                      )}
                      {uploadedFiles.map((f, i) => (
                        <div key={i} className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] text-xs font-mono text-[#0088cc] flex items-center gap-1.5">
                          <FileCode className="w-3.5 h-3.5 text-[#64748b]" />
                          <span>{f.name}</span>
                          <span className="text-[10px] text-[#94a3b8]">({(f.content.length / 1024).toFixed(1)} KB)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  rows={8}
                  className="w-full p-3 rounded-xl bg-[#f8fafc] dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] text-xs font-mono text-[#1e293b] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0088cc]"
                  placeholder="# Paste your python bot code here..."
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1 bg-emerald-50/50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
            <input
              type="checkbox"
              id="auto-start"
              checked={autoStart}
              onChange={(e) => setAutoStart(e.target.checked)}
              className="w-4 h-4 rounded text-[#0088cc] border-[#cbd5e1] focus:ring-[#0088cc] cursor-pointer"
            />
            <label htmlFor="auto-start" className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold cursor-pointer">
              {lang === 'bn' ? '২৪/৭ ব্যাকগ্রাউন্ডে স্বয়ংক্রিয়ভাবে চালু রাখুন' : 'Run 24/7 continuously in background'}
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f1f5f9] dark:border-[#1f293d]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#f8fafc] dark:bg-[#1e293b] hover:bg-[#f1f5f9] dark:hover:bg-[#334155] text-[#64748b] hover:text-[#1e293b] dark:text-[#94a3b8] dark:hover:text-white text-xs font-semibold border border-[#e2e8f0] dark:border-[#334155] cursor-pointer transition-colors"
            >
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-semibold shadow-sm shadow-[#0088cc]/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{lang === 'bn' ? 'চালু হচ্ছে...' : 'Launching...'}</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'বট ডিপ্লয় ও চালু করুন' : 'Deploy & Run 24/7 Live'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
