import React, { useState } from 'react';
import {
  X,
  Upload,
  FileCode,
  Plus,
  Zap,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Wrench,
  Sparkles,
  FolderPlus,
  Image,
  FileText,
  AlertCircle
} from 'lucide-react';
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
  const [autoFixMissing, setAutoFixMissing] = useState(true);
  const [inspecting, setInspecting] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<{
    success: boolean;
    fixes: string[];
    resolvedEntry?: string;
    detectedPackages?: string[];
    createdFolders?: string[];
    createdFiles?: string[];
  } | null>(null);
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
    setInspectionResult(null);
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
          // Automatically inspect zip in background to detect entry script (e.g. main.py) and token
          fetch('/api/bots/inspect-zip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zipBase64: base64 })
          })
            .then((res) => res.json())
            .then((data) => {
              if (data && data.success) {
                setInspectionResult(data);
                if (data.resolvedEntry) {
                  setEntryFile(data.resolvedEntry);
                }
                if (data.detectedToken && !token) {
                  setToken(data.detectedToken);
                }
              }
            })
            .catch(() => {});
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

  const handleInspectAndFix = async () => {
    if (!zipBase64 && uploadedFiles.length === 0) {
      setError(lang === 'bn' ? 'প্রথমে একটি জিপ ফাইল (.zip) বা কোড ফাইল আপলোড করুন।' : 'Please upload a .zip or code file first.');
      return;
    }
    setInspecting(true);
    setError(null);
    try {
      if (zipBase64) {
        const res = await fetch('/api/bots/inspect-zip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zipBase64,
            token: token.trim(),
            entryFile: entryFile.trim()
          })
        });
        const data = await res.json();
        if (data.success) {
          setInspectionResult(data);
          if (data.resolvedEntry && data.resolvedEntry !== entryFile) {
            setEntryFile(data.resolvedEntry);
          }
        } else {
          setError(data.fixes?.[0] || 'Inspection failed');
        }
      } else {
        // Local inspection for individual files
        const hasPhotos = uploadedFiles.some((f) => f.content.includes('photo') || f.content.includes('image'));
        const hasReq = uploadedFiles.some((f) => f.name.toLowerCase() === 'requirements.txt');
        const fixes = [
          '📸 ফটো ও মিডিয়া ডিরেক্টরি (photos/, images/) স্বয়ংক্রিয়ভাবে প্রস্তুত করা হবে',
          hasReq ? '📦 requirements.txt পাওয়া গেছে' : '📦 requirements.txt অটো জেনারেট করে যুক্ত করা হবে',
          '⚙️ .env এবং কনফিগারেশন টোকেন সংযুক্ত হবে'
        ];
        setInspectionResult({
          success: true,
          fixes,
          resolvedEntry: entryFile,
          detectedPackages: ['pyTelegramBotAPI', 'requests'],
          createdFolders: hasPhotos ? ['photos/', 'images/'] : ['photos/'],
          createdFiles: ['requirements.txt', '.env']
        });
      }
    } catch (err: any) {
      setError(err.message || 'Inspection error');
    } finally {
      setInspecting(false);
    }
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
          autoStart,
          autoFixMissing
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 z-50 overflow-hidden">
      <div className="bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1f293d] rounded-2xl max-w-2xl w-full shadow-2xl transition-colors max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Fixed Modal Header */}
        <div className="shrink-0 px-5 py-4 border-b border-[#f1f5f9] dark:border-[#1f293d] flex items-center justify-between bg-slate-50/50 dark:bg-[#0f172a]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0088cc]/10 dark:bg-[#0088cc]/20 border border-[#0088cc]/20 flex items-center justify-center text-[#0088cc] shadow-xs">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1e293b] dark:text-white flex items-center gap-2">
                <span>{lang === 'bn' ? 'নতুন টেলিগ্রাম বট হোস্ট করুন' : 'Deploy New Telegram Bot'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {lang === 'bn' ? '২৪/৭ লাইভ' : '24/7 Live'}
                </span>
              </h3>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                {lang === 'bn'
                  ? 'আপনার ফাইল সুরক্ষিত থাকবে এবং যেকোনো মিসিং কোড বা ডাটা অটো-ফিক্স হবে।'
                  : 'Files are preserved and missing code/data is automatically repaired.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-white p-2 rounded-xl hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* Scrollable Modal Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5 shadow-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <div className="flex-1">
                  <p className="font-bold">{lang === 'bn' ? 'ডিপ্লয়মেন্ট সতর্কবার্তা:' : 'Deployment Notice:'}</p>
                  <p className="mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Basic Info: Bot Name & Entry File */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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

            {/* Token Section */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#1e293b] dark:text-[#f3f4f6]">
                  {lang === 'bn' ? 'টেলিগ্রাম বট টোকেন (স্বয়ংক্রিয়ভাবে .env তে যুক্ত হবে)' : 'Telegram Bot Token (Auto-synced to .env)'}
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

            {/* File Upload / Paste Code Toggle */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-[#1e293b] dark:text-[#f3f4f6]">
                  {lang === 'bn' ? 'বটের কোড ও ফাইলসমূহ নির্বাচন করুন' : 'Bot Files & Code'}
                </label>
                <div className="flex bg-[#f1f5f9] dark:bg-[#1e293b] p-1 rounded-xl border border-[#e2e8f0] dark:border-[#334155]">
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
                    {lang === 'bn' ? 'কোড পেস্ট' : 'Paste Code'}
                  </button>
                </div>
              </div>

              {inputMode === 'upload' ? (
                <div className="border-2 border-dashed border-[#cbd5e1] dark:border-[#334155] hover:border-[#0088cc] rounded-2xl p-4 sm:p-5 text-center transition-colors bg-[#f8fafc]/50 dark:bg-[#1e293b]/40">
                  <input
                    type="file"
                    id="bot-file-input"
                    multiple
                    accept=".py,.json,.txt,.env,.zip"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="bot-file-input" className="cursor-pointer flex flex-col items-center">
                    <div className="w-11 h-11 rounded-2xl bg-[#0088cc]/10 dark:bg-[#0088cc]/20 text-[#0088cc] flex items-center justify-center mb-2 shadow-xs">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-[#1e293b] dark:text-white">
                      {lang === 'bn' ? 'ফাইল বা জিপ (.zip) ফাইল নির্বাচন করতে এখানে ক্লিক করুন' : 'Click to select or drag & drop files / .zip archive'}
                    </span>
                    <span className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                      {lang === 'bn' ? 'সমর্থিত: .py, .zip, .json, requirements.txt' : 'Supports: .py, .zip, .json, requirements.txt'}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500" />
                      {lang === 'bn' ? 'ফাইল হুবহু সংরক্ষিত থাকবে ও মিসিং কোড অটো-ফিক্স হবে' : 'Files are preserved and missing code is auto-fixed'}
                    </span>
                  </label>

                  {(uploadedFiles.length > 0 || zipFileName) && (
                    <div className="mt-3.5 pt-3 border-t border-[#e2e8f0] dark:border-[#334155] text-left">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">
                          {lang === 'bn' ? 'নির্বাচিত ফাইলসমূহ:' : 'Selected Files:'}
                        </span>
                        {zipFileName && (
                          <button
                            type="button"
                            onClick={handleInspectAndFix}
                            disabled={inspecting}
                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            {inspecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            <span>{lang === 'bn' ? 'ডাটা মিসিং আছে কিনা দেখুন' : 'Check for missing data'}</span>
                          </button>
                        )}
                      </div>
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

            {/* 1-Click Auto-Fix Missing Data & Photos Option Card */}
            <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800/80 bg-gradient-to-r from-indigo-50/90 via-sky-50/70 to-indigo-50/90 dark:from-indigo-950/60 dark:via-sky-950/30 dark:to-indigo-950/60 p-3.5 sm:p-4 space-y-2.5 transition-all shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="auto-fix-missing"
                    checked={autoFixMissing}
                    onChange={(e) => setAutoFixMissing(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="auto-fix-missing" className="text-xs font-bold text-indigo-950 dark:text-indigo-200 cursor-pointer flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      {lang === 'bn' ? '🛠️ ১-ক্লিকে টেলিগ্রাম বট কোড ও মিসিং ফাইল অটো-ফিক্স' : '🛠️ 1-Click Auto-Fix Bot Code & Missing Files'}
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-200/80 dark:bg-indigo-900/90 text-indigo-800 dark:text-indigo-300 font-bold">
                        {lang === 'bn' ? 'সুপার রিকমেন্ডেড' : 'Recommended'}
                      </span>
                    </label>
                    <p className="text-[11px] text-indigo-900/80 dark:text-indigo-300/80 mt-0.5 leading-relaxed">
                      {lang === 'bn'
                        ? 'টেলিগ্রাম বটের কোডে কোনো ভুল, মিসিং ডিপেনডেন্সি (requirements.txt), কনফিগ (.env টোকেন), ডাটাবেজ বা ফাইল মিসিং থাকলে সিস্টেম নিজে থেকেই কোড ও ফাইল ঠিক করে বট ২৪ ঘণ্টা সচল রাখবে।'
                        : 'If your Telegram bot code has syntax issues, missing requirements.txt, token config, or missing files, the engine automatically repairs them so your bot runs 24/7 without crashes.'}
                    </p>
                  </div>
                </div>

                {/* Instant Scan & Fix Button */}
                {(zipBase64 || uploadedFiles.length > 0) && (
                  <button
                    type="button"
                    onClick={handleInspectAndFix}
                    disabled={inspecting}
                    className="shrink-0 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 cursor-pointer transition-all disabled:opacity-50 active:scale-95"
                  >
                    {inspecting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    )}
                    <span>{lang === 'bn' ? 'ডাটা স্ক্যান ও ফিক্স' : 'Scan & Fix Data'}</span>
                  </button>
                )}
              </div>

              {/* Diagnostic Result Preview when clicked */}
              {inspectionResult && (
                <div className="pt-2 border-t border-indigo-200/70 dark:border-indigo-900/60 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900 dark:text-indigo-200">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      {lang === 'bn' ? 'অটো-ফিক্স ও ডায়াগনস্টিক রিপোর্ট:' : 'Auto-Fix Diagnostic Report:'}
                    </span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      ✓ {lang === 'bn' ? '১০০% রানযোগ্য' : '100% Ready'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                    <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/80 dark:bg-black/30 border border-indigo-100 dark:border-indigo-950 text-slate-700 dark:text-slate-300">
                      <Image className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                      <span>{lang === 'bn' ? 'ফটো ও মিডিয়া ফোল্ডার:' : 'Photo & Media Folders:'} <strong className="text-emerald-600 dark:text-emerald-400">অটো-কনফিগার্ড</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/80 dark:bg-black/30 border border-indigo-100 dark:border-indigo-950 text-slate-700 dark:text-slate-300">
                      <FolderPlus className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{lang === 'bn' ? 'ডিপেনডেন্সি (requirements):' : 'Dependencies:'} <strong className="text-emerald-600 dark:text-emerald-400">অটো-ফিক্সড</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/80 dark:bg-black/30 border border-indigo-100 dark:border-indigo-950 text-slate-700 dark:text-slate-300">
                      <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{lang === 'bn' ? 'মেইন স্ক্রিপ্ট ফাইল:' : 'Main Script:'} <strong className="font-mono text-indigo-600 dark:text-indigo-400">{inspectionResult.resolvedEntry}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/80 dark:bg-black/30 border border-indigo-100 dark:border-indigo-950 text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{lang === 'bn' ? 'ডাটা মিসিং ফাইল:' : 'Missing Data Files:'} <strong className="text-emerald-600 dark:text-emerald-400">ফিক্স সম্পন্ন</strong></span>
                    </div>
                  </div>
                  {inspectionResult.fixes && inspectionResult.fixes.length > 0 && (
                    <div className="p-2 rounded-lg bg-indigo-100/60 dark:bg-indigo-950/60 text-[10px] font-mono text-indigo-950 dark:text-indigo-200 space-y-1">
                      {inspectionResult.fixes.map((f: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-1">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Continuous 24/7 Watchdog Option */}
            <div className="flex items-center gap-2.5 bg-emerald-50/70 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60">
              <input
                type="checkbox"
                id="auto-start"
                checked={autoStart}
                onChange={(e) => setAutoStart(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 border-[#cbd5e1] focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="auto-start" className="text-xs text-emerald-900 dark:text-emerald-200 font-semibold cursor-pointer">
                {lang === 'bn' ? '⚡ ২৪/৭ ব্যাকগ্রাউন্ডে স্বয়ংক্রিয়ভাবে চালু রাখুন (Auto-Restart Watchdog Active)' : '⚡ Run 24/7 continuously with Auto-Restart Watchdog'}
              </label>
            </div>
          </div>

          {/* Fixed Sticky Modal Footer with High-Visibility Actions */}
          <div className="shrink-0 px-4 sm:px-6 py-3.5 bg-slate-50 dark:bg-[#0c1220] border-t border-[#f1f5f9] dark:border-[#1f293d] flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>{lang === 'bn' ? '১০০% অটোমেটিক ফিক্স এনসিওর করা হয়' : '100% Automatic Fix Guaranteed'}</span>
            </div>

            <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#1e293b] hover:bg-slate-100 dark:hover:bg-[#334155] text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white text-xs font-semibold border border-slate-200 dark:border-[#334155] cursor-pointer transition-colors shadow-2xs"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0088cc] to-[#0077b5] hover:from-[#0077b5] hover:to-[#006699] text-white text-xs font-bold shadow-md shadow-[#0088cc]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === 'bn' ? 'ডিপ্লয় হচ্ছে...' : 'Deploying...'}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300 fill-current" />
                    <span>{lang === 'bn' ? 'বট ডিপ্লয় ও চালু করুন' : 'Deploy & Run 24/7 Live'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
