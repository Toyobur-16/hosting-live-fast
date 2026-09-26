import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  HelpCircle,
  Search,
  Bot,
  CreditCard,
  Cpu,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Layers,
  ArrowRight,
  CheckCircle2,
  Film
} from 'lucide-react';

export interface FAQItem {
  id: string;
  category: 'deployment' | 'plans' | 'technical' | 'security' | 'reward_ads';
  questionBn: string;
  questionEn: string;
  answerBn: string;
  answerEn: string;
  highlightsBn?: string[];
  highlightsEn?: string[];
  actionLink?: {
    labelBn: string;
    labelEn: string;
    actionType: 'deploy' | 'plans' | 'support' | 'custom';
    url?: string;
  };
}

export const FAQ_DATA: FAQItem[] = [
  {
    id: 'how-to-deploy',
    category: 'deployment',
    questionBn: 'টেলিগ্রাম বা অন্যান্য বট কীভাবে ডিপ্লয় ও চালু করব?',
    questionEn: 'How do I deploy and start a Telegram bot?',
    answerBn: 'খুব সহজেই ৩টি ধাপে বট হোস্ট করা যায়: ১. হোম পেজ বা হেডার থেকে "বট ডিপ্লয় করুন" বোতামে ক্লিক করুন। ২. আপনার বটের জিপ ফাইল (.zip) অথবা সিঙ্গেল স্ক্রিপ্ট (.py / .js) আপলোড করুন। ৩. আপনার বটের স্টার্ট কমান্ড (যেমন: `python bot.py` অথবা `node index.js`) সিলেক্ট করে "Deploy" চাপুন। সিস্টেম স্বয়ংক্রিয়ভাবে লাইব্রেরি ইনস্টল করে বট চালু করবে।',
    answerEn: 'Deploying a bot takes only 3 simple steps: 1. Click "Deploy Bot" on the home page or header. 2. Upload your bot files as a .zip package or single script (.py / .js). 3. Enter the start command (e.g., `python bot.py` or `node index.js`) and hit Deploy. The isolated runner will automatically install dependencies and start your bot.',
    highlightsBn: ['জিপ (.zip) ও সিঙ্গেল ফাইল সমর্থন', 'অটো ডিপেনডেন্সি ইনস্টল', 'লাইভ টার্মিনাল লগ ভিউয়ার'],
    highlightsEn: ['.zip and single files supported', 'Automatic dependency install', 'Live terminal log viewer'],
    actionLink: {
      labelBn: 'বট ডিপ্লয় করুন',
      labelEn: 'Deploy Bot Now',
      actionType: 'deploy'
    }
  },
  {
    id: 'languages-supported',
    category: 'deployment',
    questionBn: 'কোন কোন প্রোগ্রামিং ল্যাঙ্গুয়েজ ও ফ্রেমওয়ার্ক সাপোর্ট করে?',
    questionEn: 'Which programming languages and frameworks are supported?',
    answerBn: 'আমাদের ক্লাউড রানার পাইথন ৩.১১+ (Telebot, Pyrogram, Telethon, Aiogram), নোড জেএস ১৮/২০ (Telegraf, grammY, discord.js), পিএইচপি (PHP CLI), এবং ব্যাশ/শেল স্ক্রিপ্ট সরাসরি সাপোর্ট করে। প্রজেক্ট ফাইলে `requirements.txt` বা `package.json` থাকলে ক্লাউড সার্ভার স্বয়ংক্রিয়ভাবে সব প্যাকেজ ইনস্টল করে নেয়।',
    answerEn: 'Our cloud runners natively support Python 3.11+ (Telebot, Pyrogram, Telethon, Aiogram), Node.js 18/20 (Telegraf, grammY, discord.js), PHP CLI, and Bash scripts. When a `requirements.txt` or `package.json` is included, dependencies are installed automatically upon deployment.',
    highlightsBn: ['Python (Pyrogram, Aiogram, Telebot)', 'Node.js (Telegraf, grammY)', 'Auto pip/npm dependency resolution'],
    highlightsEn: ['Python (Pyrogram, Aiogram, Telebot)', 'Node.js (Telegraf, grammY)', 'Auto pip/npm dependency resolution']
  },
  {
    id: 'is-plan-required',
    category: 'plans',
    questionBn: 'হোস্টিং প্ল্যান কি বাধ্যতামূলক? প্ল্যানের সুবিধা কী কী?',
    questionEn: 'Is a hosting plan required? What are the benefits?',
    answerBn: 'সাধারণ ট্রায়ালের পর আনলিমিটেড ২৪/৭ লাইভ রানটাইম, অটো-ক্র্যাশ রিকভারি, একাধিক বট হোস্ট করার স্লট এবং উচ্চ গতির ক্লাউড রিসোর্সের জন্য একটি সক্রিয় হোস্টিং প্ল্যান প্রয়োজন। আমাদের স্টুডেন্ট, বেসিক, স্ট্যান্ডার্ড এবং প্রো প্ল্যান রয়েছে যা ছাত্রছাত্রী ও ডেভেলপারদের বাজেটের কথা মাথায় রেখে তৈরি।',
    answerEn: 'An active hosting plan ensures uninterrupted 24/7 uptime, automated crash recovery, multi-bot hosting slots, and dedicated cloud compute resources. We offer flexible tiers including Student, Basic, Standard, and Pro suited for all project sizes.',
    highlightsBn: ['সাশ্রয়ী স্টুডেন্ট প্ল্যান শুরু মাত্র অল্প টাকায়', 'বিকাশ/নগদ/রকেট দিয়ে সহজ পেমেন্ট', 'তাৎক্ষণিক প্ল্যান অ্যাক্টিভেশন'],
    highlightsEn: ['Affordable student plans', 'Direct bKash/Nagad/Rocket checkout', 'Instant plan activation'],
    actionLink: {
      labelBn: 'হোস্টিং প্ল্যানসমূহ দেখুন',
      labelEn: 'View Hosting Plans',
      actionType: 'plans'
    }
  },
  {
    id: 'how-to-pay-renew',
    category: 'plans',
    questionBn: 'হোস্টিং প্ল্যান কেনার বা রিনিউ করার পেমেন্ট পদ্ধতি কী?',
    questionEn: 'How do I purchase or renew a hosting plan?',
    answerBn: 'আপনি সরাসরি বিকাশ (bKash), নগদ (Nagad), অথবা রকেট (Rocket) দিয়ে সেন্ড মানি করে ট্রানজেকশন আইডি (TrxID) দিয়ে সাবমিট করতে পারেন। এছাড়া আপনার ইউজার ওয়ালেটে ব্যালেন্স রিচার্জ করে রাখলে মাত্র এক ক্লিকে যেকোনো সময় প্ল্যান অ্যাক্টিভ বা অটো-রিনিউ করা সম্ভব।',
    answerEn: 'You can pay using bKash, Nagad, or Rocket personal Send Money and submit your Transaction ID (TrxID). Alternatively, you can top up your in-app wallet balance to activate or renew plans instantly in one click.',
    highlightsBn: ['bKash, Nagad, Rocket পার্সোনাল সেন্ড মানি', 'ওয়ালেট ব্যালেন্স থেকে ১-ক্লিকে রিনিউ', 'এডমিন ভেরিফিকেশনের পর সাথে সাথে কনফার্মেশন'],
    highlightsEn: ['bKash, Nagad, Rocket send-money supported', '1-click wallet renewals', 'Fast verification and approval']
  },
  {
    id: 'runs-24-7',
    category: 'technical',
    questionBn: 'আমার ফোন বা পিসি বন্ধ থাকলে কি বট চালু থাকবে?',
    questionEn: 'Will my bot stay online if my phone or PC is turned off?',
    answerBn: 'হ্যাঁ, ১০০% চালু থাকবে! আপনার বটটি আমাদের ক্লাউড ডেটাসেন্টারের ব্যাকগ্রাউন্ড আইসোলেটেড লিনাক্স কন্টেইনারে ২৪/৭ অবিরাম চলতে থাকে। আপনার মোবাইল বন্ধ থাকা বা ইন্টারনেট সংযোগ না থাকার সাথে বটের লাইভ থাকার কোনো সম্পর্ক নেই।',
    answerEn: 'Yes, 100%! Your bot runs on our background cloud Linux containers 24 hours a day, 7 days a week. Turning off your computer, phone, or local internet has zero impact on your cloud bot.',
    highlightsBn: ['১০০% ক্লাউড এক্সিকিউশন', 'লোকাল ইন্টারনেট বা ডিভাইসের উপর নির্ভরশীল নয়', '৯৯.৯% আপটাইম নিশ্চয়তা'],
    highlightsEn: ['100% cloud execution', 'Independent of local device/internet', '99.9% uptime SLA']
  },
  {
    id: 'bot-crash-restart',
    category: 'technical',
    questionBn: 'বটে কোনো এরর বা ক্র্যাশ হলে কী ঘটে? অটো-রিস্টার্ট আছে কি?',
    questionEn: 'What happens if a bot encounters an error or crashes? Is there auto-restart?',
    answerBn: 'আমাদের সিস্টেম স্বয়ংক্রিয় হেলথ-চেক ও ক্র্যাশ গার্ড মেকানিজম যুক্ত। বট কোনো অপ্রত্যাশিত কারণে ক্র্যাশ করলে ওয়াচডগ তা ডিটেক্ট করে অবিলম্বে রিস্টার্টের চেষ্টা করে। এছাড়া আপনার ড্যাশবোর্ডে লাইভ কনসোল লগে এরর ট্রেসব্যাক দেখতে পাবেন এবং সাউন্ড অ্যালার্ট ও ইমেইল নোটিফিকেশন পাবেন।',
    answerEn: 'Our platform includes an automated watchdog health-check system. If a bot crashes due to an unhandled exception or memory surge, the runner attempts an auto-restart. You can inspect full error tracebacks in the live console logs.',
    highlightsBn: ['অটোমেটিক রিস্টার্ট গার্ড', 'রিয়েল-টাইম কনসোল লগ ও এরর স্ট্যাক', 'বট স্টপ হলে সাউন্ড অ্যালার্ট ও নোটিফিকেশন'],
    highlightsEn: ['Automatic restart watchdog', 'Real-time console logs and error stacks', 'Sound alerts and notifications on bot stop']
  },
  {
    id: 'security-privacy',
    category: 'security',
    questionBn: 'আমার টেলিগ্রাম বট টোকেন ও সোর্স কোড কতটা সুরক্ষিত?',
    questionEn: 'How secure are my bot tokens and source code?',
    answerBn: 'প্রতিটি ইউজারের বট ফাইল ও এনভায়রনমেন্ট ভেরিয়েবল (যেমন BOT_TOKEN, API_ID, API_HASH) আলাদা আইসোলেটেড ডিরেক্টরিতে এনক্রিপ্ট করে রাখা হয়। কোনো ইউজার অন্য কারো ফাইল বা টোকেন অ্যাক্সেস করতে পারে না। আমরা নিয়মিত সিকিউরিটি অডিট ও স্যান্ডবক্সিং নিশ্চিত করি।',
    answerEn: 'Each user bot runs in an isolated workspace with strict permission boundaries. Sensitive environment keys (such as BOT_TOKEN, API_HASH, database URLs) are encrypted and completely inaccessible to other accounts.',
    highlightsBn: ['আইসোলেটেড রানটাইম স্যান্ডবক্স', 'এনক্রিপ্টেড সিক্রেট ও টোকেন স্টোরেজ', 'অননুমোদিত অ্যাক্সেস সম্পূর্ণ নিষিদ্ধ'],
    highlightsEn: ['Isolated runtime sandbox', 'Encrypted secret storage', 'Zero cross-tenant data access']
  },
  {
    id: 'database-storage',
    category: 'technical',
    questionBn: 'বটের ডাটাবেজ (SQLite, JSON, বা ক্লাউড DB) কি ব্যবহার করা যাবে?',
    questionEn: 'Can I use SQLite, JSON files, or cloud databases with my bot?',
    answerBn: 'হ্যাঁ! আপনার বটের ফোল্ডারে SQLite (.db), JSON, বা টেক্সট ফাইলে ডাটা পারসিস্টেন্টলি সেভ থাকবে। এছাড়াও আপনি চাইলে এক্সটারনাল MongoDB, PostgreSQL, MySQL বা Firebase ক্লাউড ডাটাবেজের সাথে সংযোগ করতে পারেন।',
    answerEn: 'Yes! Your workspace supports local file persistence including SQLite (.db), JSON, and flat files. You can also connect to external cloud databases such as MongoDB, PostgreSQL, MySQL, or Firebase seamlessly.',
    highlightsBn: ['SQLite ও লোকাল ফাইল পারসিস্টেন্স', 'MongoDB / MySQL ক্লাউড DB সংযোগ সাপোর্ট', 'বট রিস্টার্ট হলেও ডাটা নষ্ট হয় না'],
    highlightsEn: ['SQLite and local file persistence', 'External MongoDB / MySQL support', 'Data retained across restarts']
  },
  {
    id: 'which-ad-networks-best',
    category: 'reward_ads',
    questionBn: 'আমাদের অঞ্চলে (বাংলাদেশ ও দক্ষিণ এশিয়া) কোন ভিডিও অ্যাড নেটওয়ার্কগুলো সবচেয়ে ভালো পারফর্ম করে?',
    questionEn: 'Which reward video ad networks perform best in our region (Bangladesh & South Asia)?',
    answerBn: 'আমাদের অঞ্চলে ১০০% ট্রাফিকে হাই ফিল রেট ও দ্রুততম এপ্রুভালের জন্য Monetag (পূর্বে PropellerAds) এবং Adsterra সবচেয়ে বেশি ফলপ্রসূ। Monetag মাত্র $5 মিনিমাম পেআউটে পেমেন্ট দেয় এবং Rewarded Interstitial/Video-তে বেশি রেভিনিউ এনে দেয়। আর দীর্ঘমেয়াদী সর্বোচ্চ ইনকামের জন্য Google AdSense (H5 Web Rewarded) অদ্বিতীয়, যার পেমেন্ট সরাসরি বাংলাদেশি লোকাল ব্যাংকে পাওয়া যায়।',
    answerEn: 'For our regional traffic, Monetag (formerly PropellerAds) and Adsterra provide the highest fill rates (near 100%) and instant account approval. Monetag requires only a $5 minimum cashout and excels in Rewarded Interstitial format. For long-term maximum CPM, Google AdSense (Web Rewarded) is superior with direct local bank payouts.',
    highlightsBn: ['Monetag: ইনস্ট্যান্ট অনুমোদন ও $5 মিনিমাম পেআউট', 'Adsterra: ক্রিপ্টো/ব্যাংক পেআউট ও নো-ট্রাফিক রিকোয়ারমেন্ট', 'Google AdSense: সর্বোচ্চ CPM ও সরাসরি ব্যাংক ডিপোজিট'],
    highlightsEn: ['Monetag: Instant approval & $5 min payout', 'Adsterra: Crypto/wire payouts & zero traffic barriers', 'Google AdSense: Top CPM & direct bank deposits']
  },
  {
    id: 'how-to-integrate-reward-ads',
    category: 'reward_ads',
    questionBn: 'ওয়েবসাইটে বা এই হোস্টিং প্ল্যাটফর্মে রিওয়ার্ড ভিডিও অ্যাড কীভাবে ইন্টিগ্রেট করব?',
    questionEn: 'How do I integrate rewarded video ads into the platform?',
    answerBn: 'সহজ ৪টি ধাপে ইন্টিগ্রেশন সম্পন্ন হয়: ১. Monetag বা Adsterra-তে অ্যাকাউন্ট খুলে ডোমেইন যোগ করুন এবং "Rewarded Video / Interstitial" ট্যাগ কোড সংগ্রহ করুন। ২. এই প্ল্যাটফর্মের অ্যাডমিন প্যানেলে প্রবেশ করে "Ad Settings"-এ যান। ৩. প্রোভাইডার হিসেবে Monetag বা Adsterra নির্বাচন করে আপনার Ad Unit ID বা স্ক্রিপ্ট কোড বসিয়ে সেভ করুন। ৪. ইউজারের প্রতি ভিডিও দেখার রিওয়ার্ড (যেমন $0.01) ও কুলডাউন নির্ধারণ করুন। সাথে সাথে "Watch & Earn" পেজে লাইভ অ্যাড চালু হয়ে যাবে।',
    answerEn: 'Integration requires only 4 easy steps: 1. Register on Monetag or Adsterra, register your domain, and generate a "Rewarded Video / Interstitial" tag. 2. Navigate to Admin Panel > Ad Settings. 3. Select Monetag or Adsterra and input your Ad Unit ID / script snippet. 4. Set the reward per view (e.g. $0.01) and cooldown timer. Live ads will immediately activate on the Watch & Earn page.',
    highlightsBn: ['অ্যাডমিন প্যানেল থেকে ১-ক্লিকে প্রোভাইডার সিলেক্ট', 'কাস্টম রিওয়ার্ড মান ও দৈনিক লিমিট নির্ধারণ', 'লাইভ টেস্ট ও ইনস্ট্যান্ট ইউজার ক্রেডিট'],
    highlightsEn: ['1-click provider select from Admin Panel', 'Custom reward value & daily caps', 'Instant user wallet crediting']
  },
  {
    id: 'reward-fraud-prevention',
    category: 'reward_ads',
    questionBn: 'ইউজাররা যাতে ফেক ক্লিক বা স্ক্রিপ্ট দিয়ে প্রতারণা না করতে পারে সেজন্য কী সিকিউরিটি আছে?',
    questionEn: 'How does the system prevent fake clicks and fraudulent ad claims?',
    answerBn: 'আমাদের সিস্টেমে কঠোর সার্ভার-সাইড ভ্যালিডেশন রয়েছে: ১. প্রতিটি অ্যাড দেখার পূর্বে ইউনিক ক্রিপ্টোগ্রাফিক সেশন আইডি ইস্যু করা হয়। ২. ভিডিও শেষ হওয়ার নির্ধারিত সময়ের (যেমন ১৫-৩০ সেকেন্ড) পূর্বে কোনো রিওয়ার্ড রিকোয়েস্ট গ্রহণ করা হয় না। ৩. প্রতি অ্যাডের মাঝে বাধ্যতামুলক ৪৫-৬০ সেকেন্ড কুলডাউন পিরিয়ড থাকে। ৪. দৈনিক লিমিট (Daily Limit) অতিক্রম করলে স্বয়ংক্রিয়ভাবে ভিডিও ব্লক হয়ে যায়।',
    answerEn: 'Our system enforces strict multi-layered server security: 1. Unique cryptographic session tokens issued per ad. 2. Exact watch-time enforcement (requests before duration elapsed are rejected). 3. Mandatory cooldown pauses (45-60 seconds) between ads. 4. Daily per-user caps to prevent automated spamming.',
    highlightsBn: ['সার্ভার-সাইড সেশন টোকেন ভ্যালিডেশন', 'মিনিমাম ওয়াচ টাইম গার্ড (স্কিপ করলে নো-রিওয়ার্ড)', 'অটোমেটিক কুলডাউন ও ডেইলি ক্যাপ'],
    highlightsEn: ['Server-side session validation', 'Strict watch duration guard', 'Automated cooldowns & daily caps']
  }
];

interface FAQAccordionProps {
  lang?: 'bn' | 'en';
  onNavigateToDeploy?: () => void;
  onNavigateToPlans?: () => void;
  onNavigateToSupport?: () => void;
  className?: string;
  defaultOpenFirst?: boolean;
}

export function FAQAccordion({
  lang = 'bn',
  onNavigateToDeploy,
  onNavigateToPlans,
  onNavigateToSupport,
  className = '',
  defaultOpenFirst = true
}: FAQAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenFirst ? FAQ_DATA[0].id : null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', labelBn: 'সকল প্রশ্ন', labelEn: 'All Questions', icon: Layers },
    { id: 'reward_ads', labelBn: 'ভিডিও অ্যাড ও ইনকাম', labelEn: 'Reward Ads & Income', icon: Film },
    { id: 'deployment', labelBn: 'বট ডিপ্লয়মেন্ট', labelEn: 'Bot Deployment', icon: Bot },
    { id: 'plans', labelBn: 'হোস্টিং প্ল্যান ও পেমেন্ট', labelEn: 'Plans & Pricing', icon: CreditCard },
    { id: 'technical', labelBn: 'টেকনিক্যাল ও রানিং', labelEn: 'Technical & Runtime', icon: Cpu },
    { id: 'security', labelBn: 'নিরাপত্তা ও প্রাইভেসি', labelEn: 'Security & Safety', icon: ShieldCheck }
  ];

  const filteredItems = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.questionBn.toLowerCase().includes(q) ||
        item.questionEn.toLowerCase().includes(q) ||
        item.answerBn.toLowerCase().includes(q) ||
        item.answerEn.toLowerCase().includes(q)
      );
    });
  }, [selectedCategory, searchQuery]);

  const toggleAccordion = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  const handleActionClick = (actionType: string) => {
    if (actionType === 'deploy' && onNavigateToDeploy) onNavigateToDeploy();
    if (actionType === 'plans' && onNavigateToPlans) onNavigateToPlans();
    if (actionType === 'support' && onNavigateToSupport) onNavigateToSupport();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0c1424] via-[#09101f] to-[#0d1829] border border-amber-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
              <HelpCircle className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  {lang === 'bn' ? 'সচরাচর জিজ্ঞাসিত প্রশ্নোত্তর (FAQ)' : 'Frequently Asked Questions (FAQ)'}
                </h3>
                <span className="hidden xs:inline-flex px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase">
                  Help Guide
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'bn'
                  ? 'হোস্টিং প্ল্যান, বট ডিপ্লয়মেন্ট এবং টেকনিক্যাল বিষয় সম্পর্কে প্রয়োজনীয় তথ্যাদি'
                  : 'Common questions and answers regarding hosting plans, deployment, and technical operations'}
              </p>
            </div>
          </div>

          {/* Quick Count Badge */}
          <div className="text-xs font-bold text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 self-start sm:self-center shrink-0">
            {filteredItems.length} {lang === 'bn' ? 'টি প্রশ্ন প্রদর্শিত' : 'questions found'}
          </div>
        </div>

        {/* Live Search Input */}
        <div className="mt-4 relative z-10">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                lang === 'bn'
                  ? 'প্রশ্ন খুঁজুন... (যেমন: ডিপ্লয়, বিকাশ, ক্র্যাশ, python, token)'
                  : 'Search questions... (e.g. deploy, bKash, crash, python, token)'
              }
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500/60 transition shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-white px-1.5 py-0.5 rounded-md hover:bg-slate-800"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/15'
                  : 'bg-white dark:bg-[#0f172a] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#1e293b]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? cat.labelBn : cat.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b]">
            <HelpCircle className="w-10 h-10 text-slate-500 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {lang === 'bn' ? 'কোনো প্রশ্ন পাওয়া যায়নি' : 'No matching questions found'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {lang === 'bn'
                ? 'অন্য কোনো শব্দ দিয়ে সার্চ করুন অথবা ক্যাটাগরি ফিল্টার পরিবর্তন করুন।'
                : 'Try different search keywords or select another category filter.'}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="mt-3 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-black"
            >
              {lang === 'bn' ? 'সকল প্রশ্ন দেখুন' : 'Reset Filters'}
            </button>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isOpen = openId === item.id;
            const highlights = lang === 'bn' ? item.highlightsBn : item.highlightsEn;
            const question = lang === 'bn' ? item.questionBn : item.questionEn;
            const answer = lang === 'bn' ? item.answerBn : item.answerEn;

            return (
              <div
                key={item.id}
                className={`rounded-2xl transition-all border ${
                  isOpen
                    ? 'bg-slate-50/80 dark:bg-[#0f172a] border-amber-500/40 shadow-lg'
                    : 'bg-white dark:bg-[#0b1120] border-slate-200 dark:border-[#162035] hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Accordion Header / Trigger */}
                <button
                  type="button"
                  onClick={() => toggleAccordion(item.id)}
                  aria-expanded={isOpen}
                  className="w-full px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between gap-3 text-left cursor-pointer focus:outline-hidden"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isOpen
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-100 dark:bg-[#162035] text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {question}
                    </span>
                  </div>

                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen
                        ? 'rotate-180 bg-amber-500/20 text-amber-500'
                        : 'bg-slate-100 dark:bg-[#162035] text-slate-400'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {/* Accordion Body */}
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1 border-t border-slate-100 dark:border-[#162035]/80 animate-in fade-in duration-200 space-y-3">
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {answer}
                    </p>

                    {/* Highlights bullet tags */}
                    {highlights && highlights.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {highlights.map((h, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-lg"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{h}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action link if available */}
                    {item.actionLink && (
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleActionClick(item.actionLink!.actionType)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-sm transition cursor-pointer"
                        >
                          <span>{lang === 'bn' ? item.actionLink.labelBn : item.actionLink.labelEn}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Support CTA */}
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-[#0d1424] border border-slate-200 dark:border-[#1e2e42] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#00d293]/15 text-[#00d293] flex items-center justify-center shrink-0">
            <HelpCircle className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white block">
              {lang === 'bn' ? 'অন্য কোনো প্রশ্ন বা সহায়তার প্রয়োজন?' : 'Have more questions or need custom assistance?'}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {lang === 'bn' ? 'আমাদের ২৪/৭ সাপোর্ট টিম সবসময় প্রস্তুত।' : 'Our 24/7 dedicated support team is available.'}
            </span>
          </div>
        </div>

        {onNavigateToSupport && (
          <button
            onClick={onNavigateToSupport}
            className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-black flex items-center gap-1.5 transition hover:opacity-90 cursor-pointer shrink-0 shadow-sm"
          >
            <span>{lang === 'bn' ? 'সাপোর্টে লিখুন' : 'Contact Support'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
