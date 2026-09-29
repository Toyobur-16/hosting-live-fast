import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  X,
  Send,
  Sparkles,
  Phone,
  RotateCcw,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Code,
  Wrench,
  Zap,
  Loader2,
  ChevronDown,
  Terminal,
  ExternalLink,
  HelpCircle,
  FileCode,
  ShieldCheck,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthUser } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  isCodeFix?: boolean;
}

interface AiLiveSupportWidgetProps {
  currentUser: AuthUser | null;
  onNavigateToDeposit?: () => void;
  onNavigateToPlans?: () => void;
}

const QUICK_PROMPTS = [
  { label: '🛠️ আমার বটের কোড ঠিক করুন', query: 'আমার টেলিগ্রাম বটের কোডে ভুল হচ্ছে বা এরর দিচ্ছে। কীভাবে কোড ঠিক করব?' },
  { label: '💳 ডিপোজিট কীভাবে করব?', query: 'আমি কীভাবে ডিপোজিট করতে পারি? বিকাশ, নগদ বা বাইন্যান্সের নিয়ম বলুন।' },
  { label: '🤖 টেলিগ্রাম বট হোস্ট করার নিয়ম', query: 'টেলিগ্রাম বট কীভাবে আপলোড করে ২৪ ঘণ্টা হোস্ট করব?' },
  { label: '⏳ ডিপোজিট ব্যালেন্স আসেনি', query: 'আমার ওয়ালেটে ডিপোজিট ব্যালেন্স এখনো যোগ হয়নি, কী করব?' },
  { label: '🌐 ওয়েবসাইট হোস্টিং নিয়ম', query: 'ওয়েবসাইট কীভাবে হোস্ট করতে হয়?' },
  { label: '📞 সরাসরি এডমিনের সাথে কথা বলব', query: 'আমি সরাসরি এডমিনের সাথে যোগাযোগ করতে চাই।' }
];

export const AiLiveSupportWidget: React.FC<AiLiveSupportWidgetProps> = ({
  currentUser,
  onNavigateToDeposit,
  onNavigateToPlans
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'fixer'>('chat');
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Code Fixer State
  const [codeLanguage, setCodeLanguage] = useState<'python' | 'node'>('python');
  const [codeToFix, setCodeToFix] = useState('');
  const [errorLog, setErrorLog] = useState('');

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome_1',
      sender: 'bot',
      text: `👋 **আসসালামু আলাইকুম${currentUser?.name ? ' ' + currentUser.name : ''}!**\nআমি হোস্টিংলাইভফাস্ট-এর **২৪/৭ এআই লাইভ সাপোর্ট ও কোড ফিক্সার রোবট**।\n\n🎯 **আমি কী করতে পারি:**\n• 💳 বিকাশ, নগদ ও বাইন্যান্স ডিপোজিট সংক্রান্ত সমস্যার সমাধান\n• 🛠️ **টেলিগ্রাম বটের যেকোনা ভুল কোড বা এরর অটোমেটিক ঠিক করে দেওয়া**\n• 🤖 পাইথন ও নোডজেএস বট ২৪ ঘণ্টা রান করার গাইড\n• 🌐 ওয়েবসাইট হোস্টিং ও ডোমেন সাহায্য\n\nনিচে আপনার প্রশ্ন বা কোড লিখুন, অথবা উপরের **"🛠️ কোড ফিক্সার"** ট্যাবে গিয়ে সরাসরি কোড পেস্ট করে অটো ঠিক করে নিন!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [supportContact, setSupportContact] = useState({
    whatsapp: '01304104492',
    telegram: 'toyoburrahman',
    email: 'toyoburrahman560@gmail.com'
  });
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
      if (activeTab === 'chat') {
        setTimeout(() => inputRef.current?.focus(), 300);
      }
    }
  }, [isOpen, messages, activeTab]);

  const handleSendMessage = async (textToSend?: string, isCodeFix = false) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isCodeFix
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const res = await fetch('/api/support/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history,
          user: currentUser ? { name: currentUser.name, email: currentUser.email } : null
        })
      });

      const data = await res.json();
      if (data.supportContact) {
        setSupportContact(data.supportContact);
      }

      const botReplyText = data.reply || 'দুঃখিত, কোনো উত্তর পাওয়া যায়নি। অনুগ্রহ করে এডমিনের সাথে যোগাযোগ করুন।';

      const botMsg: Message = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: botReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCodeFix
      };

      setMessages((prev) => [...prev, botMsg]);
      if (!isOpen) {
        setUnreadCount((prev) => prev + 1);
      }
    } catch (err) {
      const errorMsg: Message = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: `⚠️ রোবটের সাথে সংযোগে সমস্যা হয়েছে। সরাসরি এডমিনের সাথে যোগাযোগ করুন:\n• **WhatsApp:** ${supportContact.whatsapp}\n• **Telegram:** @${supportContact.telegram}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeFixerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeToFix.trim()) return;

    const prompt = `🛠️ [AUTO-FIX TELEGRAM BOT CODE REQUEST]
ভাষা: ${codeLanguage === 'python' ? 'Python (telebot / python-telegram-bot / aiogram)' : 'Node.js (telegraf / node-telegram-bot-api)'}

নিচে আমার বটের কোড দেওয়া হলো:
\`\`\`${codeLanguage}
${codeToFix.trim()}
\`\`\`

${errorLog.trim() ? `কনসোল এরর বা সমস্যা:\n\`\`\`\n${errorLog.trim()}\n\`\`\`\n` : ''}
অনুগ্রহ করে কোডটি বিশ্লেষণ করে সমস্ত ভুল ঠিক করে দিন। সম্পূর্ণ ১০০% কার্যকর ও রেডি-টু-রান কোড দিন যাতে আমি সরাসরি কপি করে হোস্ট করতে পারি। সাথে requirements.txt বা package.json এর প্রয়োজনীয় লাইব্রেরি উল্লেখ করুন।`;

    setActiveTab('chat');
    handleSendMessage(prompt, true);
    setCodeToFix('');
    setErrorLog('');
  };

  const handleCopyCode = (codeContent: string, codeId: string) => {
    navigator.clipboard.writeText(codeContent);
    setCopiedCodeId(codeId);
    setTimeout(() => setCopiedCodeId(null), 2500);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        sender: 'bot',
        text: `👋 নতুন চ্যাট শুরু হয়েছে। আপনার যেকোনো সমস্যা বা কোড ডিবাগিং প্রশ্ন লিখুন!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Render message with parsed code blocks
  const renderMessageContent = (content: string, msgId: string) => {
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let blockCount = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.substring(lastIndex, match.index)
        });
      }
      blockCount++;
      parts.push({
        type: 'code',
        language: match[1] || 'code',
        code: match[2].trim(),
        id: `${msgId}_code_${blockCount}`
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex)
      });
    }

    return (
      <div className="space-y-2 text-sm leading-relaxed">
        {parts.map((part, pIdx) => {
          if (part.type === 'code') {
            const isCopied = copiedCodeId === part.id;
            return (
              <div
                key={pIdx}
                className="my-3 rounded-xl border border-indigo-500/30 bg-slate-950 overflow-hidden shadow-lg"
              >
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-indigo-500/20 text-xs">
                  <div className="flex items-center gap-1.5 text-indigo-300 font-mono font-medium">
                    <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{(part.language || 'CODE').toUpperCase()}</span>
                  </div>
                  <button
                    onClick={() => handleCopyCode(part.code, part.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                      isCopied
                        ? 'bg-emerald-500 text-white shadow'
                        : 'bg-indigo-600/30 hover:bg-indigo-600/60 text-indigo-200 border border-indigo-500/30'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>কপি হয়েছে! ✅</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>কোড কপি করুন</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3 overflow-x-auto max-h-[380px] text-xs font-mono text-cyan-200 bg-slate-950/90 leading-normal selection:bg-indigo-700 selection:text-white">
                  <pre>{part.code}</pre>
                </div>
              </div>
            );
          }

          // Plain text with bold markdown
          const lines = part.content.split('\n');
          return (
            <div key={pIdx} className="space-y-1.5">
              {lines.map((line, lIdx) => {
                if (!line.trim()) return <div key={lIdx} className="h-1" />;
                const textSegments = line.split(/(\*\*.*?\*\*)/g);
                return (
                  <p key={lIdx}>
                    {textSegments.map((seg, sIdx) => {
                      if (seg.startsWith('**') && seg.endsWith('**')) {
                        return (
                          <strong key={sIdx} className="font-semibold text-white">
                            {seg.slice(2, -2)}
                          </strong>
                        );
                      }
                      return seg;
                    })}
                  </p>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Floating Trigger Launcher - Positioned carefully above bottom navigation bar on mobile */}
      <div className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end pointer-events-auto">
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="mb-2 hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/95 border border-cyan-500/40 text-cyan-300 text-xs shadow-xl backdrop-blur-md cursor-pointer hover:border-cyan-400 transition"
              onClick={() => setIsOpen(true)}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-medium">২৪/৭ এআই লাইভ সাপোর্ট ও কোড ফিক্সার</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open AI Live Support & Code Fixer"
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 text-white shadow-2xl shadow-indigo-600/50 hover:shadow-cyan-500/50 border-2 border-white/20 transition-all duration-300 ring-4 ring-indigo-500/20"
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform rotate-0" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Bot className="w-7 h-7" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -left-2 bg-rose-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {unreadCount}
                </span>
              )}
            </div>
          )}
        </motion.button>
      </div>

      {/* FULL SCREEN Live Chat & Code Fixer Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`fixed z-50 bg-slate-950 flex flex-col shadow-2xl transition-all duration-200 ${
              isFullscreen
                ? 'inset-0 w-full h-[100dvh]'
                : 'bottom-20 right-4 sm:bottom-24 sm:right-6 w-[95vw] sm:w-[500px] h-[640px] max-h-[88vh] rounded-2xl border border-indigo-500/30'
            }`}
          >
            {/* Top Header Bar */}
            <div className="bg-slate-900/95 border-b border-indigo-500/20 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                    <Bot className="w-6 h-6" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base sm:text-lg">হোস্টিংলাইভফাস্ট এআই সাপোর্ট</h3>
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] border border-indigo-500/30">
                      <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                      অটো কোড ফিক্সার
                    </span>
                  </div>
                  <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    ২৪/৭ অনলাইন • কোড ডিবাগার ও ওয়েবসাইট হেল্প
                  </p>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-1 sm:gap-2 text-slate-400">
                <button
                  onClick={handleResetChat}
                  title="চ্যাট ক্লিয়ার করুন"
                  className="p-2 hover:text-white hover:bg-white/10 rounded-lg transition"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? 'উইন্ডো মোড' : 'ফুল স্ক্রিন'}
                  className="hidden sm:inline-flex p-2 hover:text-white hover:bg-white/10 rounded-lg transition"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="বন্ধ করুন"
                  className="p-2 hover:text-white hover:bg-rose-500/20 hover:text-rose-300 rounded-lg transition ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs (Live Chat vs Auto Code Fixer) */}
            <div className="bg-slate-900/60 border-b border-white/10 px-4 py-2 flex items-center justify-between gap-2 text-xs flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                    activeTab === 'chat'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>লাইভ চ্যাট সাপোর্ট</span>
                </button>
                <button
                  onClick={() => setActiveTab('fixer')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                    activeTab === 'fixer'
                      ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow'
                      : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                  <span>🛠️ কোড ফিক্সার (Auto Code Fix)</span>
                </button>
              </div>

              {/* Direct Human Escalation Links */}
              <div className="flex items-center gap-2">
                <a
                  href={`https://wa.me/88${supportContact.whatsapp.replace(/^0/, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition"
                >
                  <Phone className="w-3 h-3" />
                  WhatsApp
                </a>
                <a
                  href={`https://t.me/${supportContact.telegram}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition"
                >
                  <Send className="w-3 h-3" />
                  Telegram
                </a>
              </div>
            </div>

            {/* TAB CONTENT: 1. Live Chat Mode */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col min-h-0 bg-slate-950/80">
                {/* Messages Body */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  <div className="max-w-4xl mx-auto w-full space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-start gap-2.5 max-w-[92%] sm:max-w-[85%]">
                          {msg.sender === 'bot' && (
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center flex-shrink-0 text-white shadow mt-1">
                              <Bot className="w-4 h-4" />
                            </div>
                          )}
                          <div
                            className={`px-4 py-3 rounded-2xl ${
                              msg.sender === 'user'
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-none shadow-md'
                                : 'bg-slate-900 border border-indigo-500/20 text-slate-200 rounded-tl-none shadow-sm'
                            }`}
                          >
                            {renderMessageContent(msg.text, msg.id)}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1 px-2">{msg.timestamp}</span>
                      </div>
                    ))}

                    {loading && (
                      <div className="flex items-center gap-2.5 text-slate-400 text-xs">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600/40 border border-indigo-500/40 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-cyan-300 animate-spin" />
                        </div>
                        <div className="px-4 py-3 rounded-2xl bg-slate-900 border border-indigo-500/20 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                          <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.4s]" />
                          <span className="text-slate-300 text-xs ml-1 font-medium">রোবট চিন্তা করছে ও কোড ঠিক করছে...</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Quick Prompts Bar */}
                <div className="px-4 py-2 bg-slate-900/40 border-t border-white/5 flex gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
                  <div className="max-w-4xl mx-auto w-full flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {QUICK_PROMPTS.map((prompt, i) => (
                      <button
                        key={i}
                        disabled={loading}
                        onClick={() => handleSendMessage(prompt.query)}
                        className="px-3 py-1.5 text-xs rounded-full bg-slate-800/80 hover:bg-indigo-600/30 hover:text-indigo-200 border border-white/10 text-slate-300 whitespace-nowrap transition flex-shrink-0 disabled:opacity-50"
                      >
                        {prompt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat Input Bar */}
                <div className="p-3 sm:p-4 bg-slate-900/90 border-t border-indigo-500/20 flex-shrink-0">
                  <div className="max-w-4xl mx-auto w-full">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="আপনার প্রশ্ন বা এরর এখানে লিখুন (যেমন: আমার বট রান হচ্ছে না)..."
                        disabled={loading}
                        className="flex-1 bg-slate-950 border border-indigo-500/30 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={!inputMessage.trim() || loading}
                        className="p-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white disabled:opacity-40 hover:opacity-95 shadow-md shadow-cyan-600/20 transition flex-shrink-0"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      </button>
                    </form>

                    <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 px-1">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        Google Gemini 24/7 AI Engine
                      </span>
                      <div className="flex items-center gap-3">
                        <a
                          href={`https://wa.me/88${supportContact.whatsapp.replace(/^0/, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-emerald-400 transition"
                        >
                          WhatsApp: {supportContact.whatsapp}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 2. Auto Code Fixer Tool Mode */}
            {activeTab === 'fixer' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950">
                <div className="max-w-3xl mx-auto space-y-5">
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/30">
                    <div className="flex items-center gap-2 text-indigo-300 font-semibold mb-1">
                      <Wrench className="w-4 h-4 text-amber-400" />
                      <span>টেলিগ্রাম বট অটো কোড ফিক্সার (Auto Debugger)</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      আপনার টেলিগ্রাম বটের পাইথন বা নোডজেএস কোড এখানে পেস্ট করুন। এআই স্বয়ংক্রিয়ভাবে ইনডেন্টেশন, সিনট্যাক্স, লাইব্রেরি ও মেথড এরর চিহ্নিত করে **সম্পূর্ণ ১০০% ঠিক করা কোড** আপনাকে বানিয়ে দেবে!
                    </p>
                  </div>

                  <form onSubmit={handleCodeFixerSubmit} className="space-y-4">
                    {/* Language Selection */}
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-semibold text-slate-300">কোডিং ল্যাঙ্গুয়েজ:</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCodeLanguage('python')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            codeLanguage === 'python'
                              ? 'bg-indigo-600 text-white shadow'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
                          }`}
                        >
                          🐍 Python (telebot / ptb / aiogram)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCodeLanguage('node')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            codeLanguage === 'node'
                              ? 'bg-indigo-600 text-white shadow'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
                          }`}
                        >
                          ⚡ Node.js (telegraf / bot-api)
                        </button>
                      </div>
                    </div>

                    {/* Code Input Area */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5 text-xs text-slate-400">
                        <label className="font-medium text-slate-300 flex items-center gap-1.5">
                          <Code className="w-3.5 h-3.5 text-cyan-400" />
                          আপনার বটের কোড পেস্ট করুন:
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (codeLanguage === 'python') {
                              setCodeToFix(`import telebot\n\nbot = telebot.TeleBot("YOUR_TOKEN")\n\n@bot.message_handler(commands=['start'])\ndef start(msg):\n    bot.reply_to(msg, "Hello World")\n\nbot.polling()`);
                            } else {
                              setCodeToFix(`const { Telegraf } = require('telegraf');\nconst bot = new Telegraf(process.env.BOT_TOKEN);\n\nbot.start((ctx) => ctx.reply('Welcome!'));\nbot.launch();`);
                            }
                          }}
                          className="text-[11px] text-indigo-400 hover:underline"
                        >
                          স্যাম্পল কোড লোড করুন
                        </button>
                      </div>
                      <textarea
                        value={codeToFix}
                        onChange={(e) => setCodeToFix(e.target.value)}
                        placeholder={`# আপনার বটের কোড এখানে পেস্ট করুন...\nimport telebot\n\nbot = telebot.TeleBot("YOUR_BOT_TOKEN")\n...`}
                        rows={10}
                        required
                        className="w-full bg-slate-900 border border-indigo-500/30 rounded-xl p-3.5 font-mono text-xs text-cyan-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>

                    {/* Console Error / Traceback Input (Optional) */}
                    <div>
                      <label className="font-medium text-slate-300 text-xs flex items-center gap-1.5 mb-1.5">
                        <Terminal className="w-3.5 h-3.5 text-rose-400" />
                        টার্মিনাল এরর লগ বা Traceback (যদি থাকে):
                      </label>
                      <textarea
                        value={errorLog}
                        onChange={(e) => setErrorLog(e.target.value)}
                        placeholder="Traceback (most recent call last): IndentationError: unexpected indent / ModuleNotFoundError..."
                        rows={3}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 font-mono text-xs text-rose-200 placeholder-slate-600 focus:outline-none focus:border-rose-400"
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2 flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={!codeToFix.trim() || loading}
                        className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 text-white font-semibold text-sm hover:opacity-95 shadow-lg shadow-indigo-600/30 disabled:opacity-40 transition flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>অটো কোড ঠিক করুন ও ১০০% সমাধান নিন 🚀</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('chat')}
                        className="py-3.5 px-4 rounded-xl bg-slate-900 border border-white/10 text-slate-300 text-sm hover:bg-slate-800 transition"
                      >
                        বাতিল
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
