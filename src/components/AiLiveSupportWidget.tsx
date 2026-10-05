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
  Wrench,
  Loader2,
  Terminal,
  FileCode,
  MessageSquare,
  Image as ImageIcon,
  Trash2,
  Languages,
  UploadCloud,
  Eye,
  WrapText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthUser } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  isCodeFix?: boolean;
  imagePreview?: string;
}

interface AiLiveSupportWidgetProps {
  currentUser: AuthUser | null;
  siteName?: string;
  lang?: 'bn' | 'en';
  onToggleLang?: () => void;
  onSelectLang?: (lang: 'bn' | 'en') => void;
  onNavigateToDeposit?: () => void;
  onNavigateToPlans?: () => void;
  onNavigateToWebsites?: () => void;
}

interface ParsedBlock {
  type: 'code' | 'text';
  language?: string;
  content: string;
  id?: string;
}

export const AiLiveSupportWidget: React.FC<AiLiveSupportWidgetProps> = (props) => {
  const {
    currentUser,
    siteName = 'hosting live fast',
    lang = 'bn',
    onToggleLang,
    onSelectLang,
    onNavigateToWebsites
  } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'image-to-site' | 'fixer'>('chat');
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Soft word-wrap toggle for code blocks so mobile users can view without scrolling
  const [codeWrapMode, setCodeWrapMode] = useState<Record<string, boolean>>({});

  // Live HTML preview modal state
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // Local Language State (synced with prop)
  const [currentLang, setCurrentLang] = useState<'bn' | 'en'>(lang === 'en' ? 'en' : 'bn');
  useEffect(() => {
    setCurrentLang(lang === 'en' ? 'en' : 'bn');
  }, [lang]);

  const toggleLanguage = () => {
    const next = currentLang === 'bn' ? 'en' : 'bn';
    setCurrentLang(next);
    if (onToggleLang) onToggleLang();
    try {
      localStorage.setItem('bot_lang', next);
    } catch {}
  };

  // Image upload state for multimodal vision analysis & website design
  const [attachedImage, setAttachedImage] = useState<{
    base64: string;
    mimeType: string;
    preview: string;
    fileName?: string;
  } | null>(null);

  // Code Fixer State
  const [codeLanguage, setCodeLanguage] = useState<'python' | 'node'>('python');
  const [codeToFix, setCodeToFix] = useState('');
  const [errorLog, setErrorLog] = useState('');

  const [messages, setMessages] = useState<Message[]>(() => {
    return [
      {
        id: 'welcome_1',
        sender: 'bot',
        text: currentLang === 'en'
          ? `👋 **Hello${currentUser?.name ? ' ' + currentUser.name : ''}!**\nI am the official **24/7 AI Live Support, Website Designer & Code Engineer** for HostingLiveFast.\n\n🎯 **What I can do for you:**\n• 🎨 **Picture-to-Website:** Send any screenshot or photo to generate responsive HTML/Tailwind website code.\n• 🛠️ **Code Fixer:** Automatic debugging for Python & Node.js Telegram bots.\n• 🛡️ **24/7 Bot Guardian:** Keeping all your Telegram bots alive non-stop around the clock.\n• 💳 **Deposit & Wallet:** bKash, Nagad, Binance USDT instructions & balance help.\n\nType any message, ask a question, or attach a picture to get started!`
          : `👋 **আসসালামু আলাইকুম${currentUser?.name ? ' ' + currentUser.name : ''}!**\nআমি হোস্টিংলাইভফাস্ট-এর **২৪/৭ এআই লাইভ সাপোর্ট, ওয়েবসাইট ডিজাইনার ও কোড ফিক্সার**।\n\n🎯 **আমি কী করতে পারি:**\n• 🎨 **ছবি দিয়ে ওয়েবসাইট ও কোড তৈরি:** যেকোনো স্ক্রিনশট বা ছবি দিলে সম্পূর্ণ রেসপনসিভ ওয়েবসাইট HTML/Tailwind কোড তৈরি করে দেওয়া।\n• 🛠️ **টেলিগ্রাম বট কোড ফিক্সার:** পাইথন বা নোডজেএস কোডের ভুল ও এরর ১০০% ঠিক করে দেওয়া।\n• 🛡️ **২৪ ঘণ্টা বট গার্ডিয়ান:** আপনার টেলিগ্রাম বট ২৪ ঘণ্টা অবিরাম লাইভ রাখা যাতে কখনো বন্ধ না হয়।\n• 💳 **ওয়ালেট ডিপোজিট:** বিকাশ, নগদ ও বাইন্যান্স পে সংক্রান্ত যেকোনো সাহায্য।\n\nনিচে যেকোনো প্রশ্ন বা বার্তা লিখুন অথবা ছবি আপলোড করে মুহূর্তেই কোড তৈরি করে নিন!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const [supportContact, setSupportContact] = useState({
    whatsapp: '01304104492',
    telegram: 'toyoburrahman',
    email: 'toyoburrahman560@gmail.com'
  });
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(currentLang === 'en' ? 'Please upload an image file (PNG, JPG, WEBP).' : 'অনুগ্রহ করে একটি ছবি ফাইল আপলোড করুন (PNG, JPG, WEBP)।');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert(currentLang === 'en' ? 'Image file size should be less than 8MB.' : 'ছবির সাইজ ৮ মেগাবাইটের কম হতে হবে।');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      setAttachedImage({
        base64,
        mimeType: file.type,
        preview: dataUrl,
        fileName: file.name
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSendMessage = async (textToSend?: string, isCodeFix = false, specificImage?: any) => {
    const text = (textToSend || inputMessage).trim();
    const img = specificImage || attachedImage;

    if ((!text && !img) || loading) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: text || (currentLang === 'en' ? 'Generate website and code based on this picture' : 'এই ছবি দেখে সুন্দর ওয়েবসাইট ডিজাইন ও কোড বানিয়ে দিন'),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isCodeFix,
      imagePreview: img?.preview
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    const imagePayload = img ? { base64: img.base64, mimeType: img.mimeType } : null;
    setAttachedImage(null);
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
          message: userMsg.text,
          history,
          imageBase64: imagePayload?.base64,
          imageMimeType: imagePayload?.mimeType,
          lang: currentLang,
          user: currentUser ? { name: currentUser.name, email: currentUser.email } : null
        })
      });

      const data = await res.json();
      if (data.supportContact) {
        setSupportContact(data.supportContact);
      }

      const botReplyText = data.reply || (
        currentLang === 'en'
          ? 'Sorry, no response received. Please contact admin.'
          : 'দুঃখিত, কোনো উত্তর পাওয়া যায়নি। অনুগ্রহ করে এডমিনের সাথে যোগাযোগ করুন।'
      );

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
    } catch {
      const errorMsg: Message = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: currentLang === 'en'
          ? `⚠️ Temporary connection issue. Contact admin directly:\n• **WhatsApp:** ${supportContact.whatsapp}\n• **Telegram:** @${supportContact.telegram}`
          : `⚠️ রোবটের সাথে সংযোগে সমস্যা হয়েছে। সরাসরি এডমিনের সাথে যোগাযোগ করুন:\n• **WhatsApp:** ${supportContact.whatsapp}\n• **Telegram:** @${supportContact.telegram}`,
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

    const prompt = currentLang === 'en'
      ? `🛠️ [AUTO-FIX TELEGRAM BOT CODE REQUEST]
Language: ${codeLanguage === 'python' ? 'Python (telebot / ptb / aiogram)' : 'Node.js (telegraf / bot-api)'}

Here is my code:
\`\`\`${codeLanguage}
${codeToFix.trim()}
\`\`\`

${errorLog.trim() ? `Console Error / Traceback:\n\`\`\`\n${errorLog.trim()}\n\`\`\`\n` : ''}
Please analyze and eliminate all errors, syntax problems, indentation or library issues. Provide the COMPLETE 100% WORKING, CRASH-PROOF READY-TO-RUN CODE with requirements.txt or package.json.`
      : `🛠️ [AUTO-FIX TELEGRAM BOT CODE REQUEST]
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
    try {
      navigator.clipboard.writeText(codeContent);
      setCopiedCodeId(codeId);
      setTimeout(() => setCopiedCodeId(null), 2500);
    } catch {
      // Fallback copy
      const el = document.createElement('textarea');
      el.value = codeContent;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedCodeId(codeId);
      setTimeout(() => setCopiedCodeId(null), 2500);
    }
  };

  const toggleCodeWrap = (codeId: string) => {
    setCodeWrapMode((prev) => ({
      ...prev,
      [codeId]: !prev[codeId]
    }));
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        sender: 'bot',
        text: currentLang === 'en'
          ? `👋 New conversation started. Ask any question, send a picture for a website, or paste your code!`
          : `👋 নতুন চ্যাট শুরু হয়েছে। যেকোনো প্রশ্ন করুন, ছবি দিয়ে ওয়েবসাইট বানাতে বলুন বা কোড পেস্ট করুন!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setAttachedImage(null);
  };

  const quickPrompts = currentLang === 'en'
    ? [
        { label: '🎨 Photo to Website', query: 'Can you generate a modern responsive website with HTML & Tailwind CSS based on an image?' },
        { label: '🛠️ Fix Bot Code', query: 'My Telegram bot is throwing an error. How do I fix the code and keep it running 24/7?' },
        { label: '🛡️ 24/7 Guardian', query: 'How does the 24/7 AI Bot Guardian prevent my Telegram bots from stopping?' },
        { label: '💳 How to Deposit?', query: 'How can I deposit money via bKash, Nagad, or Binance Pay?' },
        { label: '🌐 Website Hosting', query: 'How do I upload and host HTML/CSS/JS websites on HostingLiveFast?' },
        { label: '📞 Contact Admin', query: 'I want to talk directly to the human administrator.' }
      ]
    : [
        { label: '🎨 ছবি দিয়ে ওয়েবসাইট বানান', query: 'একটি ছবি বা ডিজাইনের মতো সুন্দর রেসপনসিভ ওয়েবসাইট এবং কোড তৈরি করে দিন।' },
        { label: '🛠️ বটের কোড ঠিক করুন', query: 'আমার টেলিগ্রাম বটের কোডে ভুল হচ্ছে বা এরর দিচ্ছে। কীভাবে কোড ঠিক করব?' },
        { label: '🛡️ ২৪ ঘণ্টা এআই গার্ডিয়ান', query: '২৪ ঘণ্টা এআই বট গার্ডিয়ান কীভাবে আমার বটকে বন্ধ হতে দেয় না?' },
        { label: '💳 ডিপোজিট কীভাবে করব?', query: 'আমি কীভাবে ডিপোজিট করতে পারি? বিকাশ, নগদ বা বাইন্যান্সের নিয়ম বলুন।' },
        { label: '🌐 ওয়েবসাইট হোস্টিং নিয়ম', query: 'ওয়েবসাইট কীভাবে হোস্ট করতে হয়?' },
        { label: '📞 সরাসরি এডমিনের সাথে কথা বলব', query: 'আমি সরাসরি এডমিনের সাথে যোগাযোগ করতে চাই।' }
      ];

  // Robust Markdown & Code Block Parser (Mobile friendly, never overflows)
  const parseMessageContent = (content: string, msgId: string): ParsedBlock[] => {
    const blocks: ParsedBlock[] = [];
    if (!content) return blocks;

    // Matches ```language\n code ``` or unclosed ``` at the end of text
    // Handles \r?\n, spaces around language tag, or missing language tag
    const codeBlockRegex = /```([a-zA-Z0-9_+#.-]*)[^\S\r\n]*\r?\n([\s\S]*?)(?:```|$)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let blockCount = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        const textChunk = content.substring(lastIndex, match.index);
        if (textChunk.trim()) {
          blocks.push({ type: 'text', content: textChunk });
        }
      }

      blockCount++;
      const langTag = (match[1] || 'code').trim().toLowerCase();
      const codeBody = match[2] || '';

      blocks.push({
        type: 'code',
        language: langTag || 'code',
        content: codeBody.trim(),
        id: `${msgId}_code_${blockCount}`
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      const remaining = content.substring(lastIndex);
      if (remaining.trim()) {
        blocks.push({ type: 'text', content: remaining });
      }
    }

    return blocks;
  };

  // Render formatted rich text (bold, inline code, bullets, links)
  const renderRichText = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1.5 break-words overflow-hidden w-full min-w-0">
        {lines.map((line, lIdx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={lIdx} className="h-1" />;

          // Header styling (# or ## or ###)
          if (trimmed.startsWith('### ')) {
            return (
              <h5 key={lIdx} className="font-bold text-cyan-300 text-xs sm:text-sm mt-2 mb-1">
                {trimmed.replace(/^###\s+/, '')}
              </h5>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h4 key={lIdx} className="font-bold text-white text-sm sm:text-base mt-2.5 mb-1 text-cyan-200">
                {trimmed.replace(/^##\s+/, '')}
              </h4>
            );
          }
          if (trimmed.startsWith('# ')) {
            return (
              <h3 key={lIdx} className="font-extrabold text-white text-sm sm:text-base mt-3 mb-1.5 pb-1 border-b border-white/10 text-cyan-100">
                {trimmed.replace(/^#\s+/, '')}
              </h3>
            );
          }

          // Bullet list item
          const isBullet = trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ');
          const displayLine = isBullet ? trimmed.replace(/^[•\-*]\s+/, '') : line;

          // Parse inline code `code` and bold **bold**
          const segments = displayLine.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);

          return (
            <div key={lIdx} className={`min-w-0 break-words ${isBullet ? 'flex items-start gap-1.5 pl-1.5' : ''}`}>
              {isBullet && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
              )}
              <p className="min-w-0 break-words leading-relaxed text-xs sm:text-sm">
                {segments.map((seg, sIdx) => {
                  if (seg.startsWith('`') && seg.endsWith('`')) {
                    const inlineCode = seg.slice(1, -1);
                    return (
                      <code
                        key={sIdx}
                        className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-800 border border-indigo-500/30 text-cyan-300 font-mono text-[11px] sm:text-xs font-semibold break-all inline-block"
                      >
                        {inlineCode}
                      </code>
                    );
                  }
                  if (seg.startsWith('**') && seg.endsWith('**')) {
                    return (
                      <strong key={sIdx} className="font-bold text-white">
                        {seg.slice(2, -2)}
                      </strong>
                    );
                  }
                  return <span key={sIdx}>{seg}</span>;
                })}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  // Mobile-Optimized render message with parsed code blocks & images
  const renderMessageContent = (content: string, msgId: string) => {
    const blocks = parseMessageContent(content, msgId);

    return (
      <div className="space-y-2.5 text-xs sm:text-sm leading-relaxed w-full min-w-0 max-w-full overflow-hidden">
        {blocks.map((block, pIdx) => {
          if (block.type === 'code') {
            const codeId = block.id || `${msgId}_code_${pIdx}`;
            const isCopied = copiedCodeId === codeId;
            const isWrapped = Boolean(codeWrapMode[codeId]);
            const isHtml = block.language?.includes('html') || block.content.includes('<!DOCTYPE') || block.content.includes('<html');
            const lineCount = block.content.split('\n').length;

            return (
              <div
                key={pIdx}
                className="my-3 rounded-xl border border-indigo-500/35 bg-[#0b0f19] shadow-xl overflow-hidden w-full max-w-full min-w-0"
              >
                {/* Code Block Header (Mobile compact, all buttons accessible) */}
                <div className="flex items-center justify-between px-2.5 sm:px-3 py-1.5 bg-slate-900 border-b border-indigo-500/20 text-xs gap-1.5 w-full min-w-0">
                  <div className="flex items-center gap-1.5 text-indigo-300 font-mono font-medium truncate min-w-0 flex-1">
                    <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate font-semibold text-[11px] sm:text-xs">
                      {(block.language || 'CODE').toUpperCase()}
                    </span>
                    <span className="text-[10px] text-slate-500 hidden sm:inline">
                      ({lineCount} {lineCount === 1 ? 'line' : 'lines'})
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Live HTML Preview button if this is website/HTML code */}
                    {isHtml && (
                      <button
                        type="button"
                        onClick={() => setPreviewHtml(block.content)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 transition shrink-0 cursor-pointer"
                        title={currentLang === 'en' ? 'Live Website Preview' : 'ওয়েবসাইট লাইভ প্রিভিউ দেখুন'}
                      >
                        <Eye className="w-3 h-3 text-cyan-300 shrink-0" />
                        <span>{currentLang === 'en' ? 'Preview' : 'প্রিভিউ'}</span>
                      </button>
                    )}

                    {/* Word Wrap Toggle for Mobile Viewers */}
                    <button
                      type="button"
                      onClick={() => toggleCodeWrap(codeId)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold transition shrink-0 cursor-pointer ${
                        isWrapped
                          ? 'bg-purple-600/40 text-purple-200 border border-purple-500/40'
                          : 'bg-slate-800 text-slate-300 hover:text-white border border-white/10'
                      }`}
                      title={isWrapped ? 'Disable wrap (horizontal scroll)' : 'Enable word wrap (no scroll)'}
                    >
                      <WrapText className="w-3 h-3 shrink-0" />
                      <span className="hidden xs:inline">{isWrapped ? 'Wrap: On' : 'Wrap'}</span>
                    </button>

                    {/* Copy Button */}
                    <button
                      type="button"
                      onClick={() => handleCopyCode(block.content, codeId)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition shrink-0 cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'bg-indigo-600/40 hover:bg-indigo-600 text-indigo-200 border border-indigo-500/40'
                      }`}
                      title={currentLang === 'en' ? 'Copy code to clipboard' : 'কোড কপি করুন'}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 shrink-0" />
                          <span>{currentLang === 'en' ? 'Copied!' : 'কপি হয়েছে!'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 shrink-0" />
                          <span>{currentLang === 'en' ? 'Copy' : 'কপি'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Code Content Container (Strict overflow bounds for mobile) */}
                <div
                  className={`p-2.5 sm:p-3.5 max-h-[380px] overflow-y-auto text-[11px] sm:text-xs font-mono text-cyan-200 bg-[#070b14] leading-relaxed selection:bg-indigo-700 selection:text-white w-full max-w-full min-w-0 ${
                    isWrapped
                      ? 'whitespace-pre-wrap break-all sm:break-words overflow-x-hidden'
                      : 'overflow-x-auto whitespace-pre'
                  }`}
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  <pre className="font-mono m-0 p-0">
                    <code>{block.content}</code>
                  </pre>
                </div>
              </div>
            );
          }

          // Plain rich text
          return <div key={pIdx} className="w-full min-w-0">{renderRichText(block.content)}</div>;
        })}
      </div>
    );
  };

  return (
    <>
      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Floating Trigger Launcher (Positioned carefully on mobile and desktop) */}
      <div className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-40 flex flex-col items-end pointer-events-auto">
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
              <span className="font-medium">
                {currentLang === 'en' ? '24/7 AI Support & Web Designer' : '২৪/৭ এআই লাইভ সাপোর্ট ও কোড ফিক্সার'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open AI Live Support"
          className="relative flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 text-white shadow-2xl shadow-indigo-600/50 hover:shadow-cyan-500/50 border-2 border-white/20 transition-all duration-300 ring-4 ring-indigo-500/20"
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform rotate-0" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Bot className="w-6 h-6 sm:w-7 sm:h-7" />
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

      {/* FULL SCREEN / EXPANDED Live Chat & Vision Designer Modal - 100% Mobile Safe */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`fixed inset-0 z-50 bg-slate-950 flex flex-col shadow-2xl overflow-hidden w-full max-w-[100vw] h-[100dvh] box-border ${
              !isFullscreen
                ? 'sm:inset-auto sm:bottom-24 sm:right-6 sm:w-[540px] sm:h-[680px] sm:max-h-[88vh] sm:rounded-2xl sm:border sm:border-indigo-500/30'
                : ''
            }`}
          >
            {/* Top Header Bar - Never Overflows on Any Mobile Screen */}
            <div className="bg-slate-900 border-b border-indigo-500/20 px-2.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between flex-shrink-0 min-w-0 w-full">
              <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                    <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-950" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h3 className="font-bold text-white text-xs sm:text-sm truncate">
                      {siteName || 'hosting live fast'}
                    </h3>
                  </div>
                  <p className="text-[10px] sm:text-xs text-emerald-400 flex items-center gap-1 truncate font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="truncate">
                      {currentLang === 'en' ? '24/7 AI Live Support' : '২৪/৭ এআই লাইভ সাপোর্ট'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Action Controls (Compact pill buttons, never clipped) */}
              <div className="flex items-center gap-1 shrink-0 text-slate-400">
                {/* Language Switch Button (বাংলা হলে 'বাংলা', English হলে 'English') */}
                <button
                  type="button"
                  onClick={toggleLanguage}
                  title={currentLang === 'bn' ? 'Switch to English' : 'বাংলা ভাষায় পরিবর্তন করুন'}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold transition shrink-0 cursor-pointer"
                >
                  <Languages className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span>{currentLang === 'bn' ? 'বাংলা' : 'English'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetChat}
                  title={currentLang === 'en' ? 'Clear Chat' : 'চ্যাট ক্লিয়ার করুন'}
                  className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? 'Window Mode' : 'Full Screen'}
                  className="hidden sm:inline-flex p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition shrink-0 cursor-pointer"
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title={currentLang === 'en' ? 'Close' : 'বন্ধ করুন'}
                  className="p-1.5 hover:text-white hover:bg-rose-500/20 hover:text-rose-300 rounded-lg transition shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs - Mobile Optimized Pills, Never Overflowing */}
            <div className="bg-slate-900/70 border-b border-white/10 px-2 sm:px-4 py-1.5 flex items-center justify-between gap-1.5 text-xs flex-shrink-0 w-full min-w-0 max-w-full">
              <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar py-0.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer ${
                    activeTab === 'chat'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span>{currentLang === 'en' ? 'Chat' : 'চ্যাট'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('image-to-site')}
                  className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer ${
                    activeTab === 'image-to-site'
                      ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow'
                      : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                  <span>{currentLang === 'en' ? '🎨 Photo to Site' : '🎨 ছবি থেকে সাইট'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('fixer')}
                  className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer ${
                    activeTab === 'fixer'
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{currentLang === 'en' ? '🛠️ Fix Code' : '🛠️ কোড ফিক্স'}</span>
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                <a
                  href={`https://wa.me/88${supportContact.whatsapp.replace(/^0/, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition text-[11px]"
                >
                  <Phone className="w-3 h-3 shrink-0" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

            {/* TAB CONTENT 1: Live Chat Mode */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col min-h-0 bg-slate-950 overflow-hidden w-full max-w-full">
                {/* Messages Body with Strict Mobile Boundaries */}
                <div className="flex-1 p-2.5 sm:p-4 overflow-y-auto overflow-x-hidden space-y-3 sm:space-y-4 w-full min-w-0 max-w-full">
                  <div className="w-full max-w-3xl mx-auto space-y-3 sm:space-y-4 min-w-0">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col w-full min-w-0 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`flex items-start gap-1.5 sm:gap-2.5 max-w-full sm:max-w-[90%] min-w-0 ${
                            msg.sender === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {msg.sender === 'bot' && (
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center flex-shrink-0 text-white shadow mt-0.5">
                              <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                          )}
                          <div
                            className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl min-w-0 max-w-full overflow-hidden break-words ${
                              msg.sender === 'user'
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-none shadow-md'
                                : 'bg-slate-900 border border-indigo-500/25 text-slate-100 rounded-tl-none shadow-sm'
                            }`}
                          >
                            {msg.imagePreview && (
                              <div className="mb-2.5 overflow-hidden rounded-xl border border-white/20 max-w-[220px] max-h-[160px] bg-black/40">
                                <img
                                  src={msg.imagePreview}
                                  alt="Attached preview"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            {renderMessageContent(msg.text, msg.id)}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1 px-2">{msg.timestamp}</span>
                      </div>
                    ))}

                    {loading && (
                      <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600/40 border border-indigo-500/40 flex items-center justify-center shrink-0">
                          <Bot className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
                        </div>
                        <div className="px-3 py-2 rounded-xl bg-slate-900 border border-indigo-500/20 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0.4s]" />
                          <span className="text-slate-300 text-xs ml-1 font-medium">
                            {currentLang === 'en'
                              ? 'AI is thinking & generating...'
                              : 'রোবট চিন্তা করছে ও উত্তর প্রস্তুত করছে...'}
                          </span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Attached Image Preview Strip */}
                {attachedImage && (
                  <div className="px-3 sm:px-4 py-2 bg-indigo-950/70 border-t border-indigo-500/30 flex items-center justify-between gap-2 shrink-0 w-full max-w-full">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-9 h-9 rounded-lg overflow-hidden border border-cyan-400/50 flex-shrink-0 bg-black">
                        <img src={attachedImage.preview} alt="Thumb" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 text-xs">
                        <p className="font-semibold text-white truncate text-[11px] sm:text-xs">{attachedImage.fileName || 'Image Attached'}</p>
                        <p className="text-[10px] text-cyan-300 truncate">
                          {currentLang === 'en'
                            ? 'Ready for Website & Code Generation'
                            : 'ছবি রেডি! ওয়েবসাইট বা কোড তৈরির নির্দেশ দিন'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedImage(null)}
                      className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition shrink-0 cursor-pointer"
                      title="Remove image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Quick Prompts Bar (Scrollable chips) */}
                <div className="px-2 sm:px-4 py-1.5 bg-slate-900/50 border-t border-white/5 flex gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0 w-full max-w-full">
                  <div className="w-full flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {quickPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        type="button"
                        disabled={loading}
                        onClick={() => handleSendMessage(prompt.query)}
                        className="px-2.5 py-1 text-[11px] rounded-full bg-slate-800/90 hover:bg-indigo-600/30 hover:text-indigo-200 border border-white/10 text-slate-300 whitespace-nowrap transition flex-shrink-0 disabled:opacity-50 cursor-pointer"
                      >
                        {prompt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat Input Bar - Strict Mobile Friendly Bounds */}
                <div className="p-2 sm:p-3 bg-slate-900 border-t border-indigo-500/20 flex-shrink-0 w-full max-w-full box-border">
                  <div className="max-w-3xl mx-auto w-full min-w-0">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                      }}
                      className="flex items-center gap-1.5 sm:gap-2 w-full min-w-0"
                    >
                      {/* Image Upload Button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        title={currentLang === 'en' ? 'Attach picture' : 'ছবি আপলোড'}
                        className="p-2.5 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-indigo-600/30 border border-indigo-500/30 text-cyan-300 hover:text-white transition shrink-0 cursor-pointer"
                      >
                        <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>

                      <input
                        ref={inputRef}
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder={
                          attachedImage
                            ? (currentLang === 'en' ? 'Describe website to build from picture...' : 'ছবি দিয়ে কী বানাবেন লিখুন...')
                            : (currentLang === 'en' ? 'Type message or question...' : 'আপনার প্রশ্ন বা বার্তা লিখুন...')
                        }
                        disabled={loading}
                        className="flex-1 min-w-0 bg-slate-950 border border-indigo-500/30 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 disabled:opacity-50"
                      />

                      <button
                        type="submit"
                        disabled={(!inputMessage.trim() && !attachedImage) || loading}
                        className="p-2.5 sm:p-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 text-white disabled:opacity-40 hover:opacity-95 shadow-md shadow-indigo-600/20 transition shrink-0 cursor-pointer"
                      >
                        {loading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Send className="w-4 h-4 sm:w-5 sm:h-5" />}
                      </button>
                    </form>

                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 px-1">
                      <span className="flex items-center gap-1 text-slate-400 font-medium truncate">
                        <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span className="truncate">24/7 AI Engine</span>
                      </span>
                      <span className="text-emerald-400 font-medium shrink-0 ml-2">
                        {currentLang === 'en' ? 'Guardian: 24/7 Live' : 'গার্ডিয়ান: ২৪/৭ লাইভ'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: Image to Website & UI Designer Tab */}
            {activeTab === 'image-to-site' && (
              <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-950 w-full min-w-0">
                <div className="max-w-2xl mx-auto space-y-3.5 sm:space-y-5 min-w-0">
                  <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-cyan-900/30 via-indigo-900/30 to-purple-900/30 border border-cyan-500/30">
                    <div className="flex items-center gap-2 text-cyan-300 font-bold mb-1 text-xs sm:text-sm">
                      <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
                      <span>{currentLang === 'en' ? 'Picture-to-Website & UI Designer' : 'ছবি দিয়ে সম্পূর্ণ ওয়েবসাইট ও কোড তৈরি'}</span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                      {currentLang === 'en'
                        ? 'Upload any mockup, screenshot, hand-drawn sketch, or photo. Our AI vision engine will analyze the structure, typography, and colors to create a 100% working HTML5 & Tailwind CSS website ready to host!'
                        : 'যেকোনো ওয়েবসাইট স্ক্রিনশট, অ্যাপ মকআপ বা স্কেচের ছবি আপলোড করুন। এআই ছবি দেখে সাথে সাথে সম্পূর্ণ রেসপনসিভ HTML5 ও Tailwind CSS ওয়েবসাইট কোড তৈরি করে দেবে, যা এক ক্লিকে হোস্ট করা যাবে!'}
                    </p>
                  </div>

                  {/* Upload Box */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-indigo-500/40 hover:border-cyan-400 rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-900/60 hover:bg-slate-900 transition group"
                  >
                    {attachedImage ? (
                      <div className="space-y-2.5 max-w-full overflow-hidden">
                        <img
                          src={attachedImage.preview}
                          alt="Uploaded design"
                          className="max-h-40 sm:max-h-52 rounded-xl border border-cyan-400/50 shadow-xl object-contain mx-auto max-w-full"
                        />
                        <p className="text-xs text-cyan-300 font-semibold truncate">{attachedImage.fileName}</p>
                        <p className="text-[10px] text-slate-400">
                          {currentLang === 'en' ? 'Click to change image' : 'অন্য ছবি বেছে নিতে ক্লিক করুন'}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition mb-2">
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-white text-xs sm:text-sm">
                          {currentLang === 'en' ? 'Upload Image, Screenshot or Wireframe' : 'ওয়েবসাইটের ছবি বা স্ক্রিনশট আপলোড করুন'}
                        </h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 max-w-sm">
                          {currentLang === 'en'
                            ? 'PNG, JPG, WEBP up to 8MB. Drop your design here!'
                            : 'PNG, JPG, WEBP ফরম্যাট। ছবি সিলেক্ট করতে এখানে চাপ দিন।'}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Instructions / Prompt */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">
                      {currentLang === 'en' ? 'Special design instructions (Optional):' : 'কোনো বিশেষ নির্দেশনা থাকলে লিখুন (ঐচ্ছিক):'}
                    </label>
                    <textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder={
                        currentLang === 'en'
                          ? 'E.g., Make the background dark, add an animated hero section, and make buttons cyan...'
                          : 'যেমন: ডার্ক থিম হবে, হিরো সেকশনে অ্যানিমেশন থাকবে এবং সাইটটি সুপার ফাস্ট হবে...'
                      }
                      rows={3}
                      className="w-full bg-slate-900 border border-indigo-500/30 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!attachedImage || loading}
                      onClick={() => {
                        const prompt = inputMessage.trim() || (
                          currentLang === 'en'
                            ? 'Analyze this uploaded picture and generate a complete, responsive, modern single-page HTML & Tailwind CSS website with ready-to-run code!'
                            : 'এই আপলোড করা ছবি দেখে একটি সম্পূর্ণ আকর্ষণীয়, আধুনিক ও রেসপনসিভ HTML ও Tailwind CSS ওয়েবসাইট কোড তৈরি করে দিন।'
                        );
                        setActiveTab('chat');
                        handleSendMessage(prompt, false, attachedImage);
                      }}
                      className="flex-1 py-2.5 sm:py-3 px-3 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 text-white font-bold text-xs sm:text-sm hover:opacity-95 shadow-lg shadow-indigo-600/30 disabled:opacity-40 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>{currentLang === 'en' ? 'Generate Full Website Code 🚀' : 'ওয়েবসাইট কোড তৈরি করুন 🚀'}</span>
                    </button>
                    {onNavigateToWebsites && (
                      <button
                        type="button"
                        onClick={onNavigateToWebsites}
                        className="py-2.5 px-3 rounded-xl bg-slate-900 border border-white/10 text-slate-300 text-xs hover:bg-slate-800 transition whitespace-nowrap cursor-pointer"
                      >
                        {currentLang === 'en' ? 'My Sites' : 'আমার সাইট'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: Auto Code Fixer Tool Mode */}
            {activeTab === 'fixer' && (
              <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-950 w-full min-w-0">
                <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4 min-w-0">
                  <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/30">
                    <div className="flex items-center gap-2 text-indigo-300 font-semibold mb-1 text-xs sm:text-sm">
                      <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        {currentLang === 'en'
                          ? 'Telegram Bot 24/7 Code Debugger & Auto-Fixer'
                          : 'টেলিগ্রাম বট অটো কোড ফিক্সার (Auto Debugger)'}
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-300">
                      {currentLang === 'en'
                        ? 'Paste your Python or Node.js Telegram Bot code. AI will detect and patch all indentation, syntax, or library errors and provide ready-to-run 24/7 crash-proof code!'
                        : 'আপনার টেলিগ্রাম বটের পাইথন বা নোডজেএস কোড এখানে পেস্ট করুন। এআই স্বয়ংক্রিয়ভাবে ইনডেন্টেশন, সিনট্যাক্স, লাইব্রেরি ও মেথড এরর চিহ্নিত করে সম্পূর্ণ ১০০% ঠিক করা কোড বানিয়ে দেবে!'}
                    </p>
                  </div>

                  <form onSubmit={handleCodeFixerSubmit} className="space-y-3">
                    {/* Language Selection */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="text-xs font-semibold text-slate-300">
                        {currentLang === 'en' ? 'Language:' : 'কোডিং ল্যাঙ্গুয়েজ:'}
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCodeLanguage('python')}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                            codeLanguage === 'python'
                              ? 'bg-indigo-600 text-white shadow'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
                          }`}
                        >
                          🐍 Python
                        </button>
                        <button
                          type="button"
                          onClick={() => setCodeLanguage('node')}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                            codeLanguage === 'node'
                              ? 'bg-indigo-600 text-white shadow'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
                          }`}
                        >
                          ⚡ Node.js
                        </button>
                      </div>
                    </div>

                    {/* Code Input Area */}
                    <div>
                      <div className="flex items-center justify-between mb-1 text-xs text-slate-400">
                        <label className="font-medium text-slate-300 flex items-center gap-1.5">
                          <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                          {currentLang === 'en' ? 'Paste your bot code:' : 'আপনার বটের কোড পেস্ট করুন:'}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (codeLanguage === 'python') {
                              setCodeToFix(`import telebot\n\nbot = telebot.TeleBot("YOUR_TOKEN")\n\n@bot.message_handler(commands=['start'])\ndef start(msg):\n    bot.reply_to(msg, "Hello World")\n\nbot.infinity_polling()`);
                            } else {
                              setCodeToFix(`const { Telegraf } = require('telegraf');\nconst bot = new Telegraf(process.env.BOT_TOKEN);\n\nbot.start((ctx) => ctx.reply('Welcome!'));\nbot.launch();`);
                            }
                          }}
                          className="text-[11px] text-indigo-400 hover:underline cursor-pointer"
                        >
                          {currentLang === 'en' ? 'Sample code' : 'স্যাম্পল কোড'}
                        </button>
                      </div>
                      <textarea
                        value={codeToFix}
                        onChange={(e) => setCodeToFix(e.target.value)}
                        placeholder={`# Paste bot code here...\nimport telebot\n\nbot = telebot.TeleBot("YOUR_BOT_TOKEN")\n...`}
                        rows={7}
                        required
                        className="w-full bg-slate-900 border border-indigo-500/30 rounded-xl p-2.5 font-mono text-xs text-cyan-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    {/* Console Error Input */}
                    <div>
                      <label className="font-medium text-slate-300 text-xs flex items-center gap-1.5 mb-1">
                        <Terminal className="w-3.5 h-3.5 text-rose-400" />
                        {currentLang === 'en' ? 'Error log / Traceback (optional):' : 'টার্মিনাল এরর লগ বা Traceback (যদি থাকে):'}
                      </label>
                      <textarea
                        value={errorLog}
                        onChange={(e) => setErrorLog(e.target.value)}
                        placeholder="Traceback (most recent call last): IndentationError..."
                        rows={2}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 font-mono text-xs text-rose-200 placeholder-slate-600 focus:outline-none focus:border-rose-400"
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={!codeToFix.trim() || loading}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 text-white font-semibold text-xs sm:text-sm hover:opacity-95 shadow-lg shadow-indigo-600/30 disabled:opacity-40 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                        <span>
                          {currentLang === 'en' ? 'Auto-Fix Code & Get Solution 🚀' : 'অটো কোড ঠিক করুন ও সমাধান নিন 🚀'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('chat')}
                        className="py-2.5 px-3 rounded-xl bg-slate-900 border border-white/10 text-slate-300 text-xs hover:bg-slate-800 transition cursor-pointer"
                      >
                        {currentLang === 'en' ? 'Cancel' : 'বাতিল'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-Screen Live HTML Website Preview Modal */}
      <AnimatePresence>
        {previewHtml && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col p-2 sm:p-4"
          >
            <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl max-w-5xl mx-auto w-full">
              <div className="px-3 sm:px-4 py-2.5 bg-slate-950 border-b border-indigo-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-mono text-cyan-300 ml-2 font-semibold">
                    {currentLang === 'en' ? 'Interactive Website Live Preview' : 'ওয়েবসাইট লাইভ প্রিভিউ'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([previewHtml], { type: 'text/html' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'index.html';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-2.5 py-1 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition cursor-pointer"
                  >
                    {currentLang === 'en' ? 'Download index.html' : 'ডাউনলোড HTML'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewHtml(null)}
                    className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-white relative">
                <iframe
                  title="Website Preview"
                  srcDoc={previewHtml}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
