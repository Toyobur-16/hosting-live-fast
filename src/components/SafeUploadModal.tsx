import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, ShieldCheck, CheckCircle2, AlertTriangle, FileCode, Archive, RefreshCw, Database, Coins, Users, Check } from 'lucide-react';
import { HostedBot } from '../types';

interface SafeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  bot: HostedBot | null;
  onSuccess: () => void;
  lang: 'bn' | 'en';
}

export const SafeUploadModal: React.FC<SafeUploadModalProps> = ({
  isOpen,
  onClose,
  bot,
  onSuccess,
  lang
}) => {
  const [selectedFiles, setSelectedFiles] = useState<{ name: string; content?: string; base64?: string; size: number }[]>([]);
  const [zipFile, setZipFile] = useState<{ name: string; base64: string; size: number } | null>(null);
  const [preserveDatabases, setPreserveDatabases] = useState(true);
  const [autoRestart, setAutoRestart] = useState(true);
  const [autoConnectDatabase, setAutoConnectDatabase] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ updatedFiles: number; preservedDbs: string[]; users: number; balance: number } | null>(null);
  const [dbStats, setDbStats] = useState<{ usersCount: number; totalBalance: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && bot) {
      setSelectedFiles([]);
      setZipFile(null);
      setError(null);
      setSuccessInfo(null);
      // Fetch live database stats to reassure user
      fetch(`/api/bots/${bot.id}/database/stats`)
        .then((res) => res.json())
        .then((data) => {
          setDbStats({
            usersCount: data.usersCount || 0,
            totalBalance: data.totalBalance || 0
          });
        })
        .catch(() => {});
    }
  }, [isOpen, bot]);

  if (!isOpen || !bot) return null;

  const handleFileSelection = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const filesArray = Array.from(fileList);
    const newFiles: { name: string; content?: string; base64?: string; size: number }[] = [];

    for (const file of filesArray) {
      if (file.name.endsWith('.zip')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          const base64 = result.split(',')[1] || '';
          setZipFile({ name: file.name, base64, size: file.size });
        };
        reader.readAsDataURL(file);
        continue;
      }

      // Check if text or binary
      const isText = /\.(py|txt|json|env|md|csv|sh|yaml|yml|cfg|ini)$/i.test(file.name);
      if (isText) {
        const text = await file.text();
        newFiles.push({ name: file.name, content: text, size: file.size });
      } else {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = (e) => {
            const res = e.target?.result as string;
            resolve(res.split(',')[1] || '');
          };
          reader.readAsDataURL(file);
        });
        newFiles.push({ name: file.name, base64, size: file.size });
      }
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleUploadSubmit = async () => {
    if (selectedFiles.length === 0 && !zipFile) {
      setError(lang === 'bn' ? 'অনুগ্রহ করে অন্তত একটি ফাইল বা জিপ নির্বাচন করুন' : 'Please select at least one file or zip');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const token = localStorage.getItem('bot_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const body: any = {
        preserveDatabases,
        autoConnectDatabase,
        restart: autoRestart
      };

      if (zipFile) {
        body.zipBase64 = zipFile.base64;
      }
      if (selectedFiles.length > 0) {
        body.files = selectedFiles;
      }

      const res = await fetch(`/api/bots/${bot.id}/safe-update`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'আপলোড সম্পন্ন করা সম্ভব হয়নি');
      }

      setSuccessInfo({
        updatedFiles: data.updatedFileCount || 0,
        preservedDbs: data.preservedDatabases || [],
        users: data.databaseStats?.usersCount || dbStats?.usersCount || 0,
        balance: data.databaseStats?.totalBalance || dbStats?.totalBalance || 0
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error occurred during safe upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050811]/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#111927] border border-[#1f2c42] shadow-2xl rounded-3xl max-w-xl w-full p-6 sm:p-7 text-white relative overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header decoration */}
        <div className="flex items-center justify-between border-b border-[#1f2c42] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{lang === 'bn' ? 'ফাইল আপলোড ও ডাটাবেজ সুরক্ষা' : 'Safe File Upload & Protection'}</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {lang === 'bn' ? '১০০% ডাটা সুরক্ষিত' : '100% Data Safe'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'bn' ? `টার্গেট বট: ${bot.name} (${bot.id})` : `Target Bot: ${bot.name} (${bot.id})`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-4 pr-1">
          {/* Safety Guarantee Banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-200 leading-relaxed">
              <p className="font-bold text-emerald-300">
                {lang === 'bn' ? 'বট ডিলিট না করেই নতুন ফাইল আপলোড করুন!' : 'Upload files without deleting your bot!'}
              </p>
              <p className="mt-0.5 text-emerald-200/90 text-[11px]">
                {lang === 'bn'
                  ? 'আপনার আগের ইউজারদের ব্যালেন্স, users.json, ডাটাবেজ এবং সেটিংস সম্পূর্ণ অক্ষত থাকবে। আপলোডের সাথে সাথে নিরাপদ অটো-ব্যাকআপ স্ন্যাপশট নেওয়া হয়।'
                  : 'Existing user balances, users.json, and databases will stay 100% preserved. An automatic safe backup snapshot is created before updating.'}
              </p>
            </div>
          </div>

          {/* Current Live Stats Pill */}
          {dbStats && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#0d1524] border border-[#1f2d48] flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">{lang === 'bn' ? 'বিদ্যমান ইউজার' : 'Active Users'}</p>
                  <p className="text-sm font-bold text-white">{dbStats.usersCount} জন</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#0d1524] border border-[#1f2d48] flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">{lang === 'bn' ? 'মোট সংরক্ষিত ব্যালেন্স' : 'Protected Balance'}</p>
                  <p className="text-sm font-bold text-emerald-400">${dbStats.totalBalance.toFixed(2)} USDT</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message Card */}
          {successInfo && (
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-xs space-y-2 animate-in zoom-in-95">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>{lang === 'bn' ? 'ফাইল আপডেট সফলভাবে সম্পন্ন হয়েছে!' : 'Safe Upload Completed!'}</span>
              </div>
              <p className="text-slate-300 text-xs">
                {lang === 'bn'
                  ? `মোট ${successInfo.updatedFiles}টি ফাইল সফলভাবে যুক্ত/আপডেট হয়েছে। ${successInfo.users} জন ইউজারের ব্যালেন্স (মোট ${successInfo.balance.toFixed(2)}) সম্পূর্ণ সুরক্ষিত আছে।`
                  : `Updated ${successInfo.updatedFiles} files safely. Preserved ${successInfo.users} users with total ${successInfo.balance.toFixed(2)} balance intact.`}
              </p>
              <div className="pt-2 border-t border-emerald-800/40 flex items-center justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-sm transition-all"
                >
                  {lang === 'bn' ? 'ঠিক আছে' : 'Done'}
                </button>
              </div>
            </div>
          )}

          {/* Drag and Drop Zone */}
          {!successInfo && (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileSelection(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-[#1f2d48] hover:border-emerald-500/50 bg-[#0d1524]/60 hover:bg-[#0d1524]'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept=".py,.txt,.json,.env,.zip,.md,.sh"
                  onChange={(e) => handleFileSelection(e.target.files)}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-[#1e293b] border border-[#334155] flex items-center justify-center mx-auto mb-2 text-emerald-400">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-white">
                  {lang === 'bn' ? 'ফাইল বা জিপ ড্রপ করুন অথবা ক্লিক করে নির্বাচন করুন' : 'Drop files / ZIP here or click to browse'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {lang === 'bn'
                    ? 'সমর্থিত: .py, .txt, .env, .zip, .json'
                    : 'Supported: .py, .txt, .env, .zip, .json'}
                </p>
              </div>

              {/* Selected Files List */}
              {(selectedFiles.length > 0 || zipFile) && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 rounded-xl bg-[#090e18] border border-[#1f2d48]">
                  <p className="text-[11px] font-bold text-slate-400 px-2">
                    {lang === 'bn' ? 'নির্বাচিত ফাইলসমূহ:' : 'Selected Files:'}
                  </p>
                  {zipFile && (
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-xs">
                      <div className="flex items-center gap-2">
                        <Archive className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-semibold text-emerald-200">{zipFile.name}</span>
                        <span className="text-[10px] text-slate-400">({(zipFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setZipFile(null)}
                        className="text-slate-400 hover:text-rose-400 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {selectedFiles.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#111927] border border-[#1f2d48] text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <FileCode className="w-3.5 h-3.5 text-sky-400" />
                        <span className="font-medium text-slate-200 truncate max-w-[240px]">{f.name}</span>
                        <span className="text-[10px] text-slate-400">({(f.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-400 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Safety Toggles */}
              <div className="space-y-2 pt-1 text-xs">
                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#0d1524] border border-[#1f2d48] cursor-pointer hover:bg-[#111b2e] transition-colors">
                  <input
                    type="checkbox"
                    checked={preserveDatabases}
                    onChange={(e) => setPreserveDatabases(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 bg-[#0b1220] border-[#1f2d48] cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-white block">
                      {lang === 'bn' ? '🛡️ পূর্বের ইউজার ব্যালেন্স ও ডাটাবেজ সংরক্ষণ করুন (প্রস্তাবিত)' : '🛡️ Preserve existing user balance & databases (Recommended)'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {lang === 'bn'
                        ? 'users.json, user_stats.json ইত্যাদি অপরিবর্তিত রেখে শুধু নতুন কোড আপডেট করবে।'
                        : 'Leaves user balances untouched while updating your bot code.'}
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#0d1524] border border-[#1f2d48] cursor-pointer hover:bg-[#111b2e] transition-colors">
                  <input
                    type="checkbox"
                    checked={autoRestart}
                    onChange={(e) => setAutoRestart(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 bg-[#0b1220] border-[#1f2d48] cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-white block">
                      {lang === 'bn' ? '🔄 আপলোড শেষ হলে বট স্বয়ংক্রিয়ভাবে রিস্টার্ট করুন' : '🔄 Auto-restart bot after upload completes'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {lang === 'bn' ? 'নতুন ফাইলগুলো তৎক্ষণাৎ কার্যকর হবে।' : 'Instantly loads new changes into live runtime.'}
                    </span>
                  </div>
                </label>
              </div>
            </>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!successInfo && (
          <div className="mt-5 pt-4 border-t border-[#1f2c42] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
            >
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleUploadSubmit}
              disabled={uploading || (selectedFiles.length === 0 && !zipFile)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer disabled:opacity-50 transition-all"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{lang === 'bn' ? 'সুরক্ষিতভাবে আপলোড হচ্ছে...' : 'Uploading Safely...'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'নিরাপদ আপলোড ও আপডেট' : 'Safe Upload & Update'}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
