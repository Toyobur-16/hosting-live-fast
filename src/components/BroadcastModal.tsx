import React, { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, Radio, X } from 'lucide-react';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'bn' | 'en';
}

export const BroadcastModal: React.FC<BroadcastModalProps> = ({ isOpen, onClose, lang }) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendBroadcast = async () => {
    if (!message.trim()) return;
    setSending(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setResult(
          lang === 'bn'
            ? `সকল ইউজারের কাছে নোটিশ সফলভাবে পাঠানো হয়েছে (${data.totalRecipients} জন ইউজার)`
            : `Broadcast sent to ${data.totalRecipients} users!`
        );
        setMessage('');
      } else {
        setError(data.error || 'Failed to send broadcast');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 max-w-lg w-full shadow-xl">
        <div className="flex items-center justify-between pb-3.5 border-b border-[#f1f5f9] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0088cc]/10 flex items-center justify-center text-[#0088cc]">
              <Radio className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#1e293b]">
              {lang === 'bn' ? 'এডমিন ব্রডকাস্ট নোটিশ' : 'Send Admin Broadcast'}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#94a3b8] hover:text-[#1e293b] p-1 cursor-pointer transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#64748b] mb-3 leading-relaxed">
          {lang === 'bn'
            ? 'এই মেসেজটি আপনার বটের সকল নিবন্ধিত ইউজারের টেলিগ্রামে এডমিন নোটিশ হিসেবে চলে যাবে।'
            : 'This message will be sent to all bot users via Telegram Bot API with Admin Notification formatting.'}
        </p>

        {result && (
          <div className="mb-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{result}</span>
          </div>
        )}

        {error && (
          <div className="mb-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="mb-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              lang === 'bn'
                ? 'নোটিশ মেসেজ লিখুন... (HTML সাপোর্ট করে: <b>লেখা</b>, <code>কোড</code>)'
                : 'Type announcement message (HTML supported: <b>text</b>, <code>code</code>)...'
            }
            className="w-full h-32 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5 text-xs text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#0088cc] font-sans"
          />
        </div>

        <div className="flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#64748b] hover:text-[#1e293b] text-xs font-semibold border border-[#e2e8f0] cursor-pointer transition-all"
          >
            {lang === 'bn' ? 'বাতিল' : 'Cancel'}
          </button>
          <button
            onClick={handleSendBroadcast}
            disabled={!message.trim() || sending}
            className="px-5 py-2 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 shadow-sm shadow-[#0088cc]/20 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sending ? (lang === 'bn' ? 'পাঠানো হচ্ছে...' : 'Sending...') : (lang === 'bn' ? 'সকলকে পাঠান' : 'Send to All')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
