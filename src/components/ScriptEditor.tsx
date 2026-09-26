import React, { useState, useEffect } from 'react';
import { FileCode, Save, Upload, RotateCw, CheckCircle2, AlertCircle, FileText, Plus, Trash2, FolderOpen, AlertTriangle, Download } from 'lucide-react';

interface FileDetail {
  name: string;
  size: number;
  modified: string;
  isEntry: boolean;
  isEditable: boolean;
}

interface ScriptEditorProps {
  lang: 'bn' | 'en';
  botId?: string;
  botName?: string;
  onFileSaved?: () => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ lang, botId, botName, onFileSaved }) => {
  const [files, setFiles] = useState<string[]>([]);
  const [fileDetails, setFileDetails] = useState<FileDetail[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('bot.py');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoRestart, setAutoRestart] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileInput, setShowNewFileInput] = useState(false);

  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const [syntaxStatus, setSyntaxStatus] = useState<{
    checking: boolean;
    valid?: boolean;
    message?: string;
    error?: string;
    line?: number | null;
  } | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('bot_auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const checkPythonSyntax = async () => {
    if (!content) return;
    setSyntaxStatus({ checking: true });
    try {
      const res = await fetch('/api/code/syntax-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ code: content })
      });
      const data = await res.json();
      setSyntaxStatus({
        checking: false,
        valid: data.valid,
        message: data.message,
        error: data.error,
        line: data.line
      });
    } catch (e: any) {
      setSyntaxStatus({
        checking: false,
        valid: false,
        error: e.message || 'Failed to check syntax'
      });
    }
  };

  const fetchFiles = async () => {
    try {
      const url = botId ? `/api/bots/${botId}/files` : '/api/files';
      const res = await fetch(url, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.files && Array.isArray(data.files)) {
        setFiles(data.files);
        if (data.fileDetails && Array.isArray(data.fileDetails)) {
          setFileDetails(data.fileDetails);
        }
        if (!data.files.includes(selectedFile) && data.files.length > 0) {
          setSelectedFile(data.files[0]);
        }
      }
    } catch {
      // Ignore
    }
  };

  const loadFileContent = async (filename: string) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const url = botId
        ? `/api/bots/${botId}/file?name=${encodeURIComponent(filename)}`
        : `/api/files/read?name=${encodeURIComponent(filename)}`;
      const res = await fetch(url, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.content !== undefined) {
        setContent(data.content);
      } else {
        setErrorMessage(data.error || 'Failed to load file');
      }
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [botId]);

  useEffect(() => {
    if (selectedFile) {
      loadFileContent(selectedFile);
    }
  }, [selectedFile, botId]);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage('');
    try {
      const url = botId ? `/api/bots/${botId}/file` : '/api/files/save';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          filename: selectedFile,
          content,
          restart: autoRestart
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        if (onFileSaved) onFileSaved();
      } else {
        setErrorMessage(data.error || 'Failed to save');
      }
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Upload files or ZIP directly into this bot
  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setSaving(true);
    setErrorMessage('');
    try {
      if (fileList.length === 1 && fileList[0].name.toLowerCase().endsWith('.zip')) {
        const zipFile = fileList[0];
        const buffer = await zipFile.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunkSize = 8192;
        for (let j = 0; j < bytes.length; j += chunkSize) {
          const chunk = bytes.subarray(j, j + chunkSize);
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        const zipBase64 = btoa(binary);
        const url = botId ? `/api/bots/${botId}/upload-zip` : '/api/upload-zip';
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({
            zipBase64,
            restart: autoRestart
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to extract zip');
      } else {
        const filesPayload: { name: string; content?: string; base64?: string }[] = [];
        for (let i = 0; i < fileList.length; i++) {
          const file = fileList[i];
          const isText = file.name.endsWith('.py') || file.name.endsWith('.json') || file.name.endsWith('.txt') || file.name.endsWith('.env') || file.name.endsWith('.md');
          if (isText) {
            const text = await file.text();
            filesPayload.push({ name: file.name, content: text });
          } else {
            const buffer = await file.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = '';
            const chunkSize = 8192;
            for (let j = 0; j < bytes.length; j += chunkSize) {
              const chunk = bytes.subarray(j, j + chunkSize);
              binary += String.fromCharCode.apply(null, Array.from(chunk));
            }
            filesPayload.push({ name: file.name, base64: btoa(binary) });
          }
        }
        const url = botId ? `/api/bots/${botId}/upload-files` : '/api/upload-files';
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({
            files: filesPayload,
            restart: autoRestart
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to upload files');
      }
      await fetchFiles();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };

  const handleDownloadZip = () => {
    if (!botId) return;
    const token = localStorage.getItem('bot_auth_token') || '';
    window.open(`/api/bots/${botId}/export/zip?token=${encodeURIComponent(token)}`, '_blank');
  };

  const handleCreateNewFile = async () => {
    if (!newFileName.trim()) return;
    const safe = newFileName.trim();
    setSaving(true);
    try {
      const url = botId ? `/api/bots/${botId}/file` : '/api/files/save';
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          filename: safe,
          content: `# ${safe}\n`,
          restart: false
        })
      });
      setNewFileName('');
      setShowNewFileInput(false);
      await fetchFiles();
      setSelectedFile(safe);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete || !botId) return;
    setDeletingFile(true);
    try {
      const res = await fetch(`/api/bots/${botId}/delete-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ filename: fileToDelete })
      });
      const data = await res.json();
      if (data.success) {
        setDeleteSuccess(fileToDelete);
        setTimeout(() => setDeleteSuccess(null), 3000);
        await fetchFiles();
        if (selectedFile === fileToDelete) {
          const remaining = files.filter(f => f !== fileToDelete);
          if (remaining.length > 0) {
            setSelectedFile(remaining[0]);
          } else {
            setContent('');
          }
        }
      } else {
        setErrorMessage(data.error || 'Failed to delete file');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setDeletingFile(false);
      setFileToDelete(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {fileToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1f293d] rounded-2xl p-6 max-w-sm w-full shadow-2xl transition-colors">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[#1e293b] dark:text-white">
              {lang === 'bn' ? 'ফাইল ডিলিট নিশ্চিত করুন' : 'Confirm File Deletion'}
            </h4>
            <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1.5 leading-relaxed">
              {lang === 'bn'
                ? `আপনি কি নিশ্চিত যে '${fileToDelete}' ফাইলটি মুছে ফেলতে চান?`
                : `Are you sure you want to permanently delete '${fileToDelete}'?`}
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setFileToDelete(null)}
                disabled={deletingFile}
                className="px-3.5 py-2 rounded-xl bg-[#f8fafc] dark:bg-[#1e293b] hover:bg-[#f1f5f9] dark:hover:bg-[#334155] text-[#64748b] dark:text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-white text-xs font-semibold border border-[#e2e8f0] dark:border-[#334155] cursor-pointer"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={confirmDeleteFile}
                disabled={deletingFile}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingFile ? (lang === 'bn' ? 'ডিলিট হচ্ছে...' : 'Deleting...') : (lang === 'bn' ? 'ডিলিট করুন' : 'Delete File')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1f293d] rounded-2xl overflow-hidden shadow-xs transition-colors">
        <div className="bg-[#fcfdfe] dark:bg-[#111827] px-5 py-3.5 border-b border-[#f1f5f9] dark:border-[#1f293d] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-7 h-7 rounded-xl bg-[#0088cc]/10 dark:bg-[#0088cc]/20 flex items-center justify-center text-[#0088cc]">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#1e293b] dark:text-white">
                  {botName ? `${botName} - ` : ''}{lang === 'bn' ? 'কোড ও ফাইল এডিটর' : 'Script & File Editor'}
                </span>
                <select
                  value={selectedFile}
                  onChange={(e) => setSelectedFile(e.target.value)}
                  className="bg-[#f8fafc] dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] rounded-xl px-2.5 py-1 text-xs font-mono font-semibold text-[#1e293b] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0088cc] cursor-pointer"
                >
                  {files.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <label
                  htmlFor="editor-file-upload"
                  className="px-2.5 py-1 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/20 text-[#0088cc] border border-[#0088cc]/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title={lang === 'bn' ? 'ফাইল বা জিপ আপলোড করুন' : 'Upload files or ZIP archive'}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'ফাইল/জিপ আপলোড' : 'Upload Files / ZIP'}</span>
                  <input
                    id="editor-file-upload"
                    type="file"
                    multiple
                    accept=".py,.json,.txt,.zip,.env,.md"
                    onChange={handleDirectUpload}
                    className="hidden"
                  />
                </label>
                {botId && (
                  <button
                    onClick={handleDownloadZip}
                    className="px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    title={lang === 'bn' ? 'সম্পূর্ণ বট প্রজেক্ট জিপ হিসেবে ডাউনলোড / স্টক করে রাখুন' : 'Download and stock entire bot project as ZIP'}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'জিপ ডাউনলোড' : 'Download ZIP'}</span>
                  </button>
                )}
                <button
                  onClick={() => setShowNewFileInput(!showNewFileInput)}
                  className="p-1.5 rounded-xl bg-[#f8fafc] dark:bg-[#1e293b] hover:bg-[#f1f5f9] dark:hover:bg-[#334155] text-[#64748b] dark:text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-white border border-[#e2e8f0] dark:border-[#334155] cursor-pointer transition-colors"
                  title={lang === 'bn' ? 'নতুন ফাইল তৈরি করুন' : 'Create new file'}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                {selectedFile && (
                  <button
                    onClick={() => setFileToDelete(selectedFile)}
                    className="px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    title={lang === 'bn' ? 'বর্তমান ফাইলটি ডিলিট করুন' : 'Delete this file'}
                  >
                    <Trash2 className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                    <span>{lang === 'bn' ? 'ডিলিট' : 'Delete'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedFile.endsWith('.py') && (
              <button
                type="button"
                onClick={checkPythonSyntax}
                disabled={syntaxStatus?.checking || loading}
                className="px-3 py-1.5 bg-[#f1f5f9] dark:bg-[#1e293b] hover:bg-[#e2e8f0] dark:hover:bg-[#334155] text-[#1e293b] dark:text-white border border-[#cbd5e1] dark:border-[#334155] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                title={lang === 'bn' ? 'সিনট্যাক্স চেক করুন' : 'Check Python syntax'}
              >
                {syntaxStatus?.checking ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-[#0088cc]" />
                ) : (
                  <span className="text-sm">✓</span>
                )}
                <span>{lang === 'bn' ? 'সিনট্যাক্স চেক' : 'Check Syntax'}</span>
              </button>
            )}
            <label className="flex items-center gap-1.5 text-xs text-[#64748b] dark:text-[#94a3b8] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRestart}
                onChange={(e) => setAutoRestart(e.target.checked)}
                className="rounded text-[#0088cc] border-[#cbd5e1] focus:ring-[#0088cc]"
              />
              <span>{lang === 'bn' ? 'অটো-রিস্টার্ট' : 'Auto-restart'}</span>
            </label>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-4 py-1.5 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm shadow-[#0088cc]/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{lang === 'bn' ? 'সংরক্ষণ' : 'Save'}</span>
            </button>
          </div>
        </div>

        {syntaxStatus && !syntaxStatus.checking && (
          <div
            className={`px-5 py-3 border-b text-xs flex items-start justify-between gap-3 ${
              syntaxStatus.valid
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-300'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {syntaxStatus.valid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold">
                  {syntaxStatus.valid
                    ? (lang === 'bn' ? 'সিনট্যাক্স সঠিক আছে! কোনো সমস্যা নেই।' : 'Python Syntax OK! No issues detected.')
                    : (lang === 'bn' ? `সিনট্যাক্স সমস্যা${syntaxStatus.line ? ` (লাইন ${syntaxStatus.line})` : ''}:` : `Syntax Error${syntaxStatus.line ? ` (Line ${syntaxStatus.line})` : ''}:`)}
                </p>
                {syntaxStatus.error && (
                  <pre className="mt-1 font-mono text-[11px] bg-rose-100/70 dark:bg-rose-900/40 p-2 rounded-lg text-rose-950 dark:text-rose-200 overflow-x-auto whitespace-pre-wrap">
                    {syntaxStatus.error}
                  </pre>
                )}
              </div>
            </div>
            <button
              onClick={() => setSyntaxStatus(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {showNewFileInput && (
          <div className="bg-[#f8fafc] dark:bg-[#1e293b] border-b border-[#e2e8f0] dark:border-[#334155] px-5 py-3 flex items-center gap-2">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="filename.py or config.json"
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#334155] text-xs font-mono text-[#1e293b] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0088cc]"
            />
            <button
              onClick={handleCreateNewFile}
              className="px-3 py-1.5 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-semibold cursor-pointer"
            >
              {lang === 'bn' ? 'তৈরি করুন' : 'Create'}
            </button>
            <button
              onClick={() => setShowNewFileInput(false)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#334155] text-[#64748b] dark:text-[#94a3b8] text-xs cursor-pointer"
            >
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
          </div>
        )}

        {saveSuccess && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800 px-5 py-2.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{lang === 'bn' ? 'ফাইলটি হুবহু অক্ষতভাবে সংরক্ষিত হয়েছে!' : 'File saved successfully without modifications!'}</span>
          </div>
        )}

        {deleteSuccess && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800 px-5 py-2.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{lang === 'bn' ? `'${deleteSuccess}' ফাইলটি সফলভাবে ডিলিট করা হয়েছে!` : `'${deleteSuccess}' deleted successfully!`}</span>
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-800 px-5 py-2.5 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            className="w-full h-[440px] bg-[#0a0f1d] text-slate-200 p-5 font-mono text-xs leading-relaxed focus:outline-none resize-none selection:bg-[#0088cc]/40"
            placeholder="Loading code..."
          />
        </div>

        <div className="bg-[#fcfdfe] dark:bg-[#111827] px-5 py-2.5 border-t border-[#f1f5f9] dark:border-[#1f293d] flex items-center justify-between text-[11px] text-[#64748b] dark:text-[#94a3b8]">
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#94a3b8]" />
            <span className="font-semibold text-[#1e293b] dark:text-white">{selectedFile}</span>
            <span>•</span>
            <span>{content.split('\n').length} {lang === 'bn' ? 'লাইন' : 'lines'}</span>
          </span>
          <span className="font-mono text-[#94a3b8]">UTF-8 • Python 3</span>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1f293d] rounded-2xl p-5 shadow-xs transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9] dark:border-[#1f293d] mb-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#0088cc]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1e293b] dark:text-white">
              {lang === 'bn' ? 'বটের ফাইল ম্যানেজার' : 'Hosted Files & File Deletion Manager'}
            </h4>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f1f5f9] dark:bg-[#1e293b] text-[#64748b] dark:text-[#94a3b8] font-semibold">
              {files.length} {lang === 'bn' ? 'টি ফাইল' : 'files'}
            </span>
          </div>
          <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
            {lang === 'bn' ? 'যেকোনো ফাইল এডিট বা ডিলিট করতে পাশের বাটনে ক্লিক করুন' : 'Click delete next to any file you want to remove'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {files.map((fn) => {
            const detail = fileDetails.find(d => d.name === fn);
            const isCurrent = fn === selectedFile;
            return (
              <div
                key={fn}
                className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                  isCurrent
                    ? 'bg-[#0088cc]/10 dark:bg-[#0088cc]/15 border-[#0088cc]/40 ring-1 ring-[#0088cc]/30'
                    : 'bg-[#f8fafc] dark:bg-[#1e293b]/70 border-[#e2e8f0] dark:border-[#334155]'
                }`}
              >
                <div
                  onClick={() => setSelectedFile(fn)}
                  className="min-w-0 flex-1 cursor-pointer"
                >
                  <div className="text-xs font-mono font-bold text-[#1e293b] dark:text-white truncate flex items-center gap-1.5">
                    <FileCode className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-[#0088cc]' : 'text-[#64748b] dark:text-[#94a3b8]'}`} />
                    <span className="truncate">{fn}</span>
                  </div>
                  <div className="text-[10px] text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                    {detail ? formatBytes(detail.size) : 'File'}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedFile(fn)}
                    className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#334155] text-[#0088cc] hover:bg-[#0088cc]/10 cursor-pointer"
                    title={lang === 'bn' ? 'ফাইল এডিট করুন' : 'Edit file'}
                  >
                    {lang === 'bn' ? 'এডিট' : 'Edit'}
                  </button>
                  <button
                    onClick={() => setFileToDelete(fn)}
                    className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 cursor-pointer transition-colors"
                    title={lang === 'bn' ? `'${fn}' ডিলিট করুন` : `Delete '${fn}'`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
