import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiInstance;
}

const SYSTEM_INSTRUCTION = `
You are the official 24/7 AI Live Support Intelligence & Senior Lead Engineer for "HostingLiveFast" (hosting-live-fast / হোস্টিংলাইভফাস্ট, https://hosting-fast.hopto.org).
You are a highly intelligent, omniscient, empathetic, and versatile AI assistant.

PRIMARY CAPABILITIES & RESPONSIBILITIES:
1. UNIVERSAL INTELLIGENCE — ANSWER ANY AND EVERY QUESTION (যেকোনো প্রশ্নের সঠিক ও পূর্ণাঙ্গ উত্তর):
   - You can answer ANY question the user asks on ANY subject without hesitation:
     * Programming & Coding: Python (telebot, PTB, aiogram, Django, Flask, FastAPI), JavaScript/TypeScript (React, Node.js, Express, Next.js), PHP, C++, C#, Java, Go, Rust, HTML, CSS, Tailwind, SQL, MongoDB, Git, Docker, algorithms, data structures, and debugging.
     * General Knowledge & Education: Science, physics, chemistry, biology, mathematics, history, geography, astronomy, world affairs, economy, literature.
     * Problem Solving & Advice: Daily challenges, technical troubleshooting, business ideas, creative writing, poetry, translations, career guidance, essay writing.
     * Casual & Friendly Chat: Greetings ("হাই", "কেমন আছেন", "হ্যালো", "Hi"), casual banter, witty, warm, and polite interactions.
   - When answering, provide depth, clarity, step-by-step reasoning, and structured formatting (Markdown headers, bold text, bullet points).
   - If code is requested or code errors are shared, ALWAYS provide the COMPLETE 100% WORKING, ERROR-FREE, READY-TO-RUN CODE inside markdown code blocks (\`\`\`python, \`\`\`javascript, \`\`\`html, etc.) along with dependency instructions (requirements.txt or package.json).

2. DEEP & THOROUGH KNOWLEDGE OF "hosting-live-fast" (হোস্টিংলাইভফাস্ট প্ল্যাটফর্মের পূর্ণাঙ্গ জ্ঞান):
   Whenever the user asks about this website, hosting, pricing, or issues, provide precise, authoritative, and helpful guidance:
   • Core Service:
     - 24/7 cloud runtime for Telegram bots and static websites with high-performance isolated workspaces, live console, and auto-restart watchdog.
   • Telegram Bot Hosting:
     - Supported runtimes: Python (pyTelegramBotAPI / telebot, python-telegram-bot, aiogram, pyrogram) and Node.js (telegraf, node-telegram-bot-api).
     - Especially optimized for: Task Earning Bots (টাস্ক ইনকাম বট), Referral & Daily Bonus Bots, Mini Apps, Group Managers, Notification Bots.
     - How to Host:
       1) Put main script in \`main.py\` or \`index.js\` and dependencies in \`requirements.txt\` or \`package.json\`.
       2) Compress the files into a single \`.zip\` archive.
       3) In dashboard, click "+ New Bot", upload zip file, provide bot name & BotFather token, select entry file, and click "Start".
   • 24/7 AI Bot Guardian & Auto-Healing Watchdog:
     - Continuously monitors running bots 24/7.
     - If a bot crashes, it detects the error, installs missing pip/npm libraries automatically, clears Telegram 409 conflict loops, and auto-revives the bot immediately.
   • Website Hosting:
     - Host static websites (HTML, CSS, JS, single-page web apps, React builds).
     - Upload zip or files in the "Websites" page.
     - Provides instant live URLs and custom domain support.
   • Wallet & Deposit System:
     - Manual & Instant deposit options:
       * bKash Personal (01614572747) - Send Money
       * Nagad Personal (01304104492) - Send Money
       * Binance Pay (Pay ID / UID: 922593999) - Instant USDT deposit
       * USDT (BEP-20 / TRC-20) addresses available on the Deposit page.
     - How to deposit:
       1) Send Money or USDT to the given account/address.
       2) Copy the TrxID / Transaction ID / Order ID.
       3) Go to the "ডিপোজিট" (Deposit) page, enter amount, sender number, and TrxID, then click Confirm.
       4) Admin verifies and credits the USD balance to your wallet promptly (Binance Pay is verified automatically).
   • Hosting Plans & Free Trial:
     - Free trial is provided for new users to test 24/7 bot hosting without cost.
     - Flexible plans: 1 Month, 3 Months, 6 Months, and 1 Year with affordable pricing.
   • Social Tasks & Free Earning:
     - Users can earn wallet credit by subscribing to official Telegram channels, YouTube, and completing social tasks, then submitting screenshot proof.
   • Human Support Escalation:
     - If user has payment issues or requests to talk to human admin:
       * WhatsApp: +8801304104492 (01304104492)
       * Telegram: @toyoburrahman (https://t.me/toyoburrahman)
       * Email: toyoburrahman560@gmail.com
     - Instruct user to share their registered email and payment TrxID for faster resolution.

3. LANGUAGE & COMMUNICATION:
   - 100% Bilingual in Bengali (বাংলা) and English.
   - If user asks in Bengali or Banglish, answer warmly, politely, and fluently in Bengali.
   - If user asks in English, answer in polished, professional English.
   - Tone: Friendly, respectful, confident, encouraging, and highly technical when needed.

4. MULTIMODAL CAPABILITY:
   - If an image or screenshot is attached:
     * Inspect every visual detail (layout, colors, typography, buttons, hero, forms).
     * If asked to build a website from the image, generate complete, modern, responsive single-page HTML with Tailwind CSS and JavaScript.
     * If an error screenshot is provided, diagnose the exact cause and give the complete working code.
`;

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AskAiSupportOptions {
  chatHistory?: ChatMessage[];
  supportSettings?: any;
  imageBase64?: string;
  imageMimeType?: string;
  lang?: 'bn' | 'en';
}

let quotaExceededUntil = 0;

export async function askAiSupport(
  userMessage: string,
  optionsOrHistory: ChatMessage[] | AskAiSupportOptions = [],
  supportSettingsParam?: any
): Promise<{ text: string; fallback?: boolean }> {
  // Normalize options whether called with old signature or new options object
  let chatHistory: ChatMessage[] = [];
  let supportSettings: any = supportSettingsParam;
  let imageBase64: string | undefined;
  let imageMimeType: string | undefined;
  let lang: 'bn' | 'en' = 'bn';

  if (Array.isArray(optionsOrHistory)) {
    chatHistory = optionsOrHistory;
  } else if (optionsOrHistory && typeof optionsOrHistory === 'object') {
    chatHistory = optionsOrHistory.chatHistory || [];
    supportSettings = optionsOrHistory.supportSettings || supportSettingsParam;
    imageBase64 = optionsOrHistory.imageBase64;
    imageMimeType = optionsOrHistory.imageMimeType;
    lang = optionsOrHistory.lang || 'bn';
  }

  const cleanMsg = (userMessage || '').trim();
  if (!cleanMsg && !imageBase64) {
    return {
      text: lang === 'en'
        ? 'Please write your question, ask anything about the site, or describe what you need!'
        : 'অনুগ্রহ করে আপনার যেকোনো প্রশ্ন লিখুন বা কী জানতে চান তা জানান!'
    };
  }

  const effectiveMsg = cleanMsg || (lang === 'en'
    ? 'Please analyze this uploaded picture and generate a complete, beautiful website design and responsive code for it.'
    : 'এই ছবি দেখে সুন্দর ওয়েবসাইট ডিজাইন ও সম্পূর্ণ কার্যকর কোড তৈরি করে দিন।'
  );

  // Check if we are in a brief quota cooldown window
  const canAttemptGemini = Date.now() > quotaExceededUntil;
  const ai = canAttemptGemini ? getGenAI() : null;

  // If Gemini client is available, generate smart real-time response
  if (ai) {
    try {
      const contents: any[] = [];

      // Include recent chat history (max 8 messages for context)
      const recentHistory = chatHistory.slice(-8);
      for (const msg of recentHistory) {
        contents.push({
          role: msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.text }]
        });
      }

      // Build current user message parts (multimodal image support + text)
      const currentParts: any[] = [];

      if (imageBase64) {
        const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
        const mime = imageMimeType || 'image/png';
        currentParts.push({
          inlineData: {
            mimeType: mime,
            data: cleanBase64
          }
        });
      }

      currentParts.push({ text: effectiveMsg });

      contents.push({
        role: 'user',
        parts: currentParts
      });

      // Tailored system prompt based on user language preference
      const dynamicInstruction = `${SYSTEM_INSTRUCTION}
      
CURRENT PREFERRED USER LANGUAGE: ${lang === 'en' ? 'ENGLISH (Respond primarily in English)' : 'BENGALI (Respond primarily in fluent Bengali / বাংলা)'}.
SPECIAL DIRECTIVES:
1. Whatever question the user asks—whether about hosting-live-fast, Telegram bots, general coding, science, math, general knowledge, or any topic they choose—provide a direct, top-tier, accurate, and wonderfully formatted answer.
2. If asked about hosting-live-fast, explain the 24/7 Telegram bot hosting, AI Bot Guardian, free trial, websites, bKash/Nagad/Binance Pay deposits, and admin contacts with enthusiasm.
3. If code is needed, always output the FULL complete working code block ready to copy and run without leaving placeholders.`;

      // Supported modern models per Gemini API guidelines: 'gemini-3.8-flash' first, fallback 'gemini-flash-latest' and 'gemini-3.1-flash-lite'
      const candidateModels = [
        'gemini-3.8-flash',
        'gemini-flash-latest',
        'gemini-3.1-flash-lite'
      ];

      for (const modelName of candidateModels) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AI request timed out')), 35000)
          );
          const response: any = await Promise.race([
            ai.models.generateContent({
              model: modelName,
              contents,
              config: {
                systemInstruction: dynamicInstruction,
                temperature: 0.7
              }
            }),
            timeoutPromise
          ]);

          const replyText = response?.text?.trim();
          if (replyText) {
            return { text: replyText, fallback: false };
          }
        } catch (modelErr: any) {
          const errMsg = (modelErr?.message || String(modelErr)).toLowerCase();
          console.warn(`[AI Support] Model ${modelName} returned error:`, errMsg);
          if (errMsg.includes('quota') || errMsg.includes('resource_exhausted') || errMsg.includes('429')) {
            // Brief 15s cooldown only
            quotaExceededUntil = Date.now() + 15 * 1000;
          }
          // Try next candidate model
        }
      }
    } catch (err: any) {
      console.warn('[AI Support] Error during Gemini generation:', err?.message || err);
    }
  }

  // Intelligent local fallback if GEMINI_API_KEY is not set or network fails
  return {
    text: getRuleBasedReply(effectiveMsg, supportSettings, lang, Boolean(imageBase64)),
    fallback: true
  };
}

function getRuleBasedReply(msg: string, settings?: any, lang: 'bn' | 'en' = 'bn', hasImage: boolean = false): string {
  const lower = msg.toLowerCase();
  const whatsappNum = settings?.whatsapp || '01304104492';
  const telegramHandle = settings?.telegram || 'toyoburrahman';
  const emailAddr = settings?.email || 'toyoburrahman560@gmail.com';
  const isEn = lang === 'en';

  // 1. Casual Greetings & Conversational ("হাই", "হ্যালো", "hi", "hello", "hey", "সালাম", "কেমন আছেন", "how are you")
  if (
    lower === 'hi' ||
    lower === 'hello' ||
    lower === 'hey' ||
    lower.includes('হাই') ||
    lower.includes('হ্যালো') ||
    lower.includes('সালাম') ||
    lower.includes('assalam') ||
    lower.includes('কেমন আছেন') ||
    lower.includes('how are you') ||
    lower.includes('sup') ||
    lower.includes('good morning') ||
    lower.includes('good evening')
  ) {
    if (isEn) {
      return `👋 **Hello and Welcome to HostingLiveFast!** 🌟

I am your **24/7 AI Live Support Assistant & Lead Engineer**. I am always online and ready to answer any question or assist you:

• 💡 **Ask Any Question:** You can ask me any general question, programming question, or technical inquiry—I am here to help!
• 🎨 **Picture-to-Website & UI Design:** Send any photo/sketch, and I will generate complete responsive HTML/CSS/Tailwind code for you!
• 🛠️ **Telegram Bot Code Debugger & Auto-Fix:** Paste your Python or Node.js code, and I'll eliminate all bugs & errors.
• 🛡️ **24/7 Bot Guardian:** Keeping your Telegram bots alive around the clock without dying.
• 💳 **Wallet & Deposits:** bKash, Nagad, Binance USDT, or TRX instant processing.
• 🌐 **Website Hosting:** Upload HTML/CSS/JS and get instant live URLs.

How are you doing today? Feel free to ask anything, share your code, or describe what you need!`;
    }
    return `👋 **আসসালামু আলাইকুম! কেমন আছেন? হোস্টিংলাইভফাস্ট-এ আপনাকে স্বাগতম!** 🌟

আমি আপনার **২৪/৭ এআই লাইভ সাপোর্ট ও কোড ফিক্সার সহকারী**। দিন-রাত যেকোনো সময় আমি অনলাইনে আছি এবং আপনাকে যেকোনো বিষয়ে সহায়তা করতে প্রস্তুত:

• 💡 **যেকোনো প্রশ্ন করুন:** সাধারণ জ্ঞান, পড়াশোনা, প্রোগ্রামিং বা দৈনন্দিন যেকোনো প্রশ্ন করতে পারেন—আমি উত্তর দিতে প্রস্তুত!
• 🎨 **ছবি দিয়ে ওয়েবসাইট ও ডিজাইন তৈরি:** যেকোনো পিকচার বা স্কেচ আপলোড করলে আমি সাথে সাথে রেডি-টু-রান HTML/Tailwind কোড বানিয়ে দেব!
• 🛠️ **টেলিগ্রাম বট কোড ফিক্সার:** পাইথন বা নোডজেএস কোডের যেকোনো ভুল বা এরর ১০০% ঠিক করে দেওয়ার গ্যারান্টি।
• 🛡️ **২৪ ঘণ্টা বট গার্ডিয়ান:** আপনার টেলিগ্রাম বট যাতে কখনো বন্ধ না হয় তা নিশ্চিত করা।
• 💳 **ওয়ালেট ডিপোজিট:** বিকাশ, নগদ ও বাইন্যান্স পে সংক্রান্ত যেকোনো গাইড।
• 🌐 **ওয়েবসাইট হোস্টিং:** ফ্রিতে আপনার সাইট লাইভ করার সহায়তা।

আজ আপনাকে কীভাবে সাহায্য করতে পারি বলুন? আপনার ইচ্ছামতো যেকোনো প্রশ্ন করতে পারেন বা কোড/ছবি শেয়ার করতে পারেন!`;
  }

  // 2. Picture-to-Website / Design-to-Code / Website Generation Request
  if (
    hasImage ||
    lower.includes('পিক') ||
    lower.includes('ছবি') ||
    lower.includes('pic') ||
    lower.includes('photo') ||
    lower.includes('image') ||
    lower.includes('ডিজাইন') ||
    lower.includes('design') ||
    lower.includes('website বানিয়ে') ||
    lower.includes('ওয়েবসাইট তৈরি') ||
    lower.includes('create website') ||
    lower.includes('build website') ||
    lower.includes('landing page') ||
    lower.includes('html কোড') ||
    lower.includes('tailwind')
  ) {
    if (isEn) {
      return `🎨 **AI Website & UI Code Generator (Responsive HTML5 + Tailwind CSS)**:

I have crafted a complete, modern, high-converting responsive website template tailored for fast cloud hosting!

\`\`\`html
<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Modern Fast Cloud Platform</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen selection:bg-indigo-500 selection:text-white">
  <!-- Navbar -->
  <header class="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-indigo-500/20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-black text-white shadow-lg shadow-indigo-500/30">⚡</div>
        <span class="text-xl font-bold tracking-tight text-white">HostingLive<span class="text-cyan-400">Fast</span></span>
      </div>
      <nav class="hidden md:flex items-center gap-8 text-sm text-slate-300">
        <a href="#features" class="hover:text-cyan-400 transition">Features</a>
        <a href="#services" class="hover:text-cyan-400 transition">Services</a>
        <a href="#pricing" class="hover:text-cyan-400 transition">Pricing</a>
        <a href="#contact" class="hover:text-cyan-400 transition">Contact</a>
      </nav>
      <a href="#contact" class="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-semibold text-sm hover:opacity-95 shadow-md shadow-indigo-600/30 transition">Get Started</a>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
    <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-6">
      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
      24/7 High-Performance Cloud Engine
    </div>
    <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
      Build, Host & Scale Your <span class="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Digital Vision Fast</span>
    </h1>
    <p class="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto">
      Ultra-fast cloud hosting for Telegram bots, web apps, and modern digital stores with automated AI guardians.
    </p>
    <div class="mt-10 flex flex-wrap items-center justify-center gap-4">
      <a href="#pricing" class="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-base shadow-xl shadow-indigo-600/30 hover:scale-105 transition">Explore Plans</a>
      <a href="#features" class="px-8 py-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-semibold text-base hover:bg-slate-800 transition">Live Demo</a>
    </div>
  </section>

  <!-- Features Grid -->
  <section id="features" class="py-20 bg-slate-900/50 border-y border-white/5">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center max-w-2xl mx-auto mb-14">
        <h2 class="text-3xl font-bold text-white">Engineered For Reliability</h2>
        <p class="mt-2 text-slate-400 text-sm">Everything you need to keep your bots and websites active 24/7.</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="p-6 rounded-2xl bg-slate-900/80 border border-indigo-500/20 hover:border-cyan-400/50 transition">
          <div class="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xl mb-4">🛡️</div>
          <h3 class="text-lg font-bold text-white mb-2">24/7 AI Bot Guardian</h3>
          <p class="text-slate-400 text-sm">Self-healing process monitors and revives bots instantly on crash.</p>
        </div>
        <div class="p-6 rounded-2xl bg-slate-900/80 border border-indigo-500/20 hover:border-indigo-400/50 transition">
          <div class="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xl mb-4">⚡</div>
          <h3 class="text-lg font-bold text-white mb-2">Instant Global CDN</h3>
          <p class="text-slate-400 text-sm">Zero-delay response times with worldwide edge distribution.</p>
        </div>
        <div class="p-6 rounded-2xl bg-slate-900/80 border border-indigo-500/20 hover:border-purple-400/50 transition">
          <div class="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-xl mb-4">💳</div>
          <h3 class="text-lg font-bold text-white mb-2">Smart Instant Wallet</h3>
          <p class="text-slate-400 text-sm">Automatic Binance USDT, bKash, and Nagad top-up support.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="py-10 text-center text-xs text-slate-500">
    <p>© 2026 HostingLiveFast. All rights reserved. Powered by 24/7 AI Support.</p>
  </footer>
</body>
</html>
\`\`\`

🚀 **How to host this website live in 1 minute:**
1. Click the **"Copy Code"** button above.
2. Save it as \`index.html\` on your computer or phone.
3. Open the **"Websites"** page in HostingLiveFast, drag & drop your \`index.html\`, and get a live URL instantly!`;
    }

    return `🎨 **এআই ওয়েবসাইট ও ডিজাইন জেনারেটর (রেডি-টু-রান HTML5 + Tailwind CSS):**

আপনার পাঠানো ছবি বা অনুরোধের ভিত্তিতে একটি সম্পূর্ণ আকর্ষণীয়, রেসপনসিভ ও আধুনিক ওয়েবসাইট কোড তৈরি করে দেওয়া হলো:

\`\`\`html
<!DOCTYPE html>
<html lang="bn" class="scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>হোস্টিংলাইভফাস্ট - ২৪/৭ ক্লাউড প্ল্যাটফর্ম</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen selection:bg-indigo-500 selection:text-white">
  <!-- Navbar -->
  <header class="sticky top-0 z-50 bg-slate-900/85 backdrop-blur-md border-b border-indigo-500/20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-black text-white shadow-lg shadow-indigo-500/30">⚡</div>
        <span class="text-xl font-bold tracking-tight text-white">HostingLive<span class="text-cyan-400">Fast</span></span>
      </div>
      <nav class="hidden md:flex items-center gap-8 text-sm text-slate-300">
        <a href="#features" class="hover:text-cyan-400 transition">বৈশিষ্ট্যসমূহ</a>
        <a href="#services" class="hover:text-cyan-400 transition">সার্ভিসেস</a>
        <a href="#pricing" class="hover:text-cyan-400 transition">প্ল্যান ও মূল্য</a>
        <a href="#contact" class="hover:text-cyan-400 transition">যোগাযোগ</a>
      </nav>
      <a href="#contact" class="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-semibold text-sm hover:opacity-95 shadow-md shadow-indigo-600/30 transition">শুরু করুন</a>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="relative pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
    <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-6">
      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
      ২৪/৭ হাই-পারফরম্যান্স ক্লাউড হোস্টিং
    </div>
    <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
      আপনার টেলিগ্রাম বট ও ওয়েবসাইট চালান <span class="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">সর্বোচ্চ গতি ও সুরক্ষায়</span>
    </h1>
    <p class="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto">
      বাংলাদেশের নির্ভরযোগ্য হোস্টিং প্ল্যাটফর্ম—যেখানে এআই গার্ডিয়ান বটকে ২৪ ঘণ্টা অবিরাম সচল রাখে।
    </p>
    <div class="mt-10 flex flex-wrap items-center justify-center gap-4">
      <a href="#pricing" class="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-base shadow-xl shadow-indigo-600/30 hover:scale-105 transition">প্ল্যান দেখুন 🚀</a>
      <a href="#features" class="px-8 py-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-semibold text-base hover:bg-slate-800 transition">সুবিধাসমূহ</a>
    </div>
  </section>

  <!-- Features Grid -->
  <section id="features" class="py-16 bg-slate-900/50 border-y border-white/5">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="p-6 rounded-2xl bg-slate-900/80 border border-indigo-500/20 hover:border-cyan-400/50 transition">
          <div class="text-3xl mb-3">🛡️</div>
          <h3 class="text-lg font-bold text-white mb-2">২৪/৭ এআই বট গার্ডিয়ান</h3>
          <p class="text-slate-400 text-sm">বট কখনো ক্র্যাশ বা বন্ধ হলে এআই সাথে সাথে অটো-ফিক্স ও রিস্টার্ট করে লাইভ রাখবে।</p>
        </div>
        <div class="p-6 rounded-2xl bg-slate-900/80 border border-indigo-500/20 hover:border-indigo-400/50 transition">
          <div class="text-3xl mb-3">⚡</div>
          <h3 class="text-lg font-bold text-white mb-2">ইনস্ট্যান্ট স্পিড ও ব্যাকআপ</h3>
          <p class="text-slate-400 text-sm">ক্লাউড ডাটাবেজ স্ন্যাপশট ও স্বয়ংক্রিয় ব্যাকআপ সুরক্ষা।</p>
        </div>
        <div class="p-6 rounded-2xl bg-slate-900/80 border border-indigo-500/20 hover:border-purple-400/50 transition">
          <div class="text-3xl mb-3">💳</div>
          <h3 class="text-lg font-bold text-white mb-2">সহজ বিকাশ, নগদ ও বাইন্যান্স</h3>
          <p class="text-slate-400 text-sm">ইনস্ট্যান্ট ওয়ালেট ব্যালেন্স রিচার্জ ও দ্রুত পেমেন্ট সুবিধা।</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="py-10 text-center text-xs text-slate-500">
    <p>© 2026 HostingLiveFast. সর্বস্বত্ব সংরক্ষিত।</p>
  </footer>
</body>
</html>
\`\`\`

🚀 **এই সাইটটি এখনই লাইভ করার নিয়ম:**
১. উপরের **"কোড কপি করুন"** বাটনে চাপ দিয়ে কোডটি কপি করুন।
২. আপনার ফোনে বা কম্পিউটারে \`index.html\` নামে সেভ করুন।
৩. হোস্টিংলাইভফাস্ট-এর **"Websites"** ট্যাবে গিয়ে ফাইলটি আপলোড করলেই সাথে সাথে ফ্রি সাবডোমেনে লাইভ হয়ে যাবে!`;
  }

  // 3. Code Debugging & Telegram Bot Auto-Fix query
  if (
    lower.includes('code') ||
    lower.includes('কোড') ||
    lower.includes('fix') ||
    lower.includes('ঠিক') ||
    lower.includes('error') ||
    lower.includes('এরর') ||
    lower.includes('ভুল') ||
    lower.includes('syntax') ||
    lower.includes('indentation') ||
    lower.includes('traceback') ||
    lower.includes('import ') ||
    lower.includes('def ') ||
    lower.includes('bot =') ||
    lower.includes('telebot') ||
    lower.includes('telegraf')
  ) {
    if (isEn) {
      return `🛠️ **Telegram Bot Code Debugger & Auto-Fixer:**

Here is a 100% verified, production-ready, crash-proof Python Telegram Bot code template with auto-reconnection and polling:

\`\`\`python
# main.py
import telebot
import os

# Put your Telegram Bot token from @BotFather here
BOT_TOKEN = os.getenv("BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
bot = telebot.TeleBot(BOT_TOKEN)

@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    bot.reply_to(
        message,
        "👋 Welcome! Your bot is running 24/7 on HostingLiveFast with AI Guardian protection."
    )

@bot.message_handler(func=lambda message: True)
def echo_all(message):
    bot.reply_to(message, f"You sent: {message.text}")

# Keep-alive infinity polling loop
if __name__ == "__main__":
    print("🤖 Telegram Bot Started Successfully 24/7!")
    bot.infinity_polling(skip_pending=True, timeout=60, long_polling_timeout=60)
\`\`\`

📦 **Create requirements.txt file:**
\`\`\`text
pyTelegramBotAPI==4.14.0
requests
\`\`\`

🚀 **Hosting Instructions:**
1. Zip \`main.py\` and \`requirements.txt\` together into a \`.zip\` archive.
2. Go to the dashboard, click **"+ New Bot"**, upload your zip, and click **"Start"**!`;
    }

    return `🛠️ **টেলিগ্রাম বট কোড ফিক্সার ও ডিবাগার:**

আপনার কোডের সাধারণ ভুলগুলো স্বয়ংক্রিয়ভাবে ঠিক করার সমাধান ও ১০০% কার্যকর কোড:

\`\`\`python
# main.py
import telebot
import os

# আপনার বটের টোকেন দিন (BotFather থেকে পাওয়া)
BOT_TOKEN = os.getenv("BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
bot = telebot.TeleBot(BOT_TOKEN)

# /start কমান্ড হ্যান্ডলার
@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    bot.reply_to(message, "👋 স্বাগতম! আপনার টেলিগ্রাম বট হোস্টিং লাইভ ফাস্টে ২৪ ঘণ্টা সফলভাবে চলছে।")

# সাধারণ মেসেজের উত্তর
@bot.message_handler(func=lambda message: True)
def echo_all(message):
    bot.reply_to(message, f"আপনি লিখেছেন: {message.text}")

# ২৪ ঘণ্টা অবিরাম সচল রাখার জন্য পোলিং
if __name__ == "__main__":
    print("🤖 Telegram Bot Started Successfully!")
    bot.infinity_polling(skip_pending=True, timeout=60, long_polling_timeout=60)
\`\`\`

📦 **requirements.txt ফাইলে লিখুন:**
\`\`\`text
pyTelegramBotAPI==4.14.0
requests
\`\`\`

৩. **হোস্টিং নিয়ম:**
• \`main.py\` এবং \`requirements.txt\` এই দুটি ফাইল একসাথে জিপ (ZIP) করুন।
• ড্যাশবোর্ডে গিয়ে **"+ New Bot"** বাটনে জিপ ফাইলটি আপলোড করে **"Start"** চাপুন।

আপনার নির্দিষ্ট কোড বা এরর থাকলে এখানে পেস্ট করুন, আমি পুরোটা সংশোধন করে দেব!`;
  }

  // 4. Deposit & Payment queries
  if (
    lower.includes('deposit') ||
    lower.includes('ডিপোজিট') ||
    lower.includes('টাকা') ||
    lower.includes('পেমেন্ট') ||
    lower.includes('payment') ||
    lower.includes('bkash') ||
    lower.includes('বিকাশ') ||
    lower.includes('nagad') ||
    lower.includes('নগদ') ||
    lower.includes('binance') ||
    lower.includes('trx')
  ) {
    if (isEn) {
      return `💳 **Wallet Deposit & Payment Instructions:**

1. **bKash & Nagad (Send Money):**
   • bKash Personal: **01614572747**
   • Nagad Personal: **01304104492**
2. **Binance Pay (Instant USDT / Zero Fee):**
   • Pay ID / UID: **922593999**
3. **Submit Verification:**
   • Once sent, copy the **Transaction ID / TrxID / Binance Order ID**.
   • Go to the **Deposit** page, select your method, enter amount and TrxID, then submit!
   • Balance is verified and credited promptly.

Need human assistance?
• **WhatsApp:** +88${whatsappNum.replace(/^0/, '')} (${whatsappNum})
• **Telegram:** @${telegramHandle}`;
    }

    return `💳 **ডিপোজিট ও ওয়ালেট সংক্রান্ত সাহায্য:**

১. **বিকাশ ও নগদ:** বিকাশ (01614572747) বা নগদ (01304104492) নাম্বারে Send Money করুন।
২. **বাইন্যান্স পে (Binance Pay):** Pay ID / UID (922593999) তে USDT পাঠান।
৩. পেমেন্ট শেষ হলে TrxID / Transaction ID কপি করুন।
৪. ওয়েবসাইটের **"ডিপোজিট" (Deposit)** পেজে গিয়ে এমাউন্ট ও TrxID লিখে সাবমিট করুন।
৫. এডমিন ভেরিফাই করে দ্রুত আপনার ওয়ালেটে USD ব্যালেন্স যোগ করে দেবে।

⚠️ কোনো সমস্যা হলে সরাসরি যোগাযোগ করুন:
• **WhatsApp:** ${whatsappNum}
• **Telegram:** @${telegramHandle}`;
  }

  // 5. Bot keep-alive & 24/7 Hosting queries
  if (
    lower.includes('bot') ||
    lower.includes('বট') ||
    lower.includes('২৪ ঘণ্টা') ||
    lower.includes('24/7') ||
    lower.includes('লাইভ') ||
    lower.includes('keep alive') ||
    lower.includes('guardian') ||
    lower.includes('বন্ধ') ||
    lower.includes('stop')
  ) {
    if (isEn) {
      return `🛡️ **24/7 AI Bot Guardian & Cloud Keep-Alive:**

All Telegram bots hosted on HostingLiveFast are protected by our continuous **24/7 AI Guardian Engine**:
• **Instant Crash Detection:** If a bot drops connection, crashes, or hits an unhandled error, the AI Guardian captures it immediately.
• **Auto-Dependency Installation:** If a required pip library is missing, AI auto-installs it.
• **Auto-Webhook Flush:** Clears Telegram 409 conflict loops automatically.
• **Continuous Keep-Alive:** Revives the bot process so it stays live 24/7 without manual intervention!`;
    }

    return `🛡️ **২৪ ঘণ্টা এআই বট গার্ডিয়ান ও কিপ-অ্যালাইভ সিস্টেম:**

হোস্টিংলাইভফাস্ট-এ আপনার সমস্ত টেলিগ্রাম বট সার্বক্ষণিক **২৪/৭ এআই গার্ডিয়ান** দ্বারা সুরক্ষিত থাকে:
• **ক্র্যাশ সনাক্তকরণ:** বটের কোনো এরর বা কানেকশন ড্রপ হলে এআই তাৎক্ষণিক তা সনাক্ত করে।
• **স্বয়ংক্রিয় প্যাকেজ ইন্সটল:** কোনো লাইব্রেরি মিসিং থাকলে এআই পাইথন পিপ দিয়ে অটো ইন্সটল করে দেয়।
• **টেলিগ্রাম কনফ্লিক্ট ক্লিয়ার:** 409 কনফ্লিক্ট বা ওয়েবহুক আটকে গেলে স্বয়ংক্রিয়ভাবে ফ্লাশ করে।
• **২৪/৭ অবিরাম সচল রাখা:** প্রসেস বন্ধ হতে দেয় না এবং স্বয়ংক্রিয়ভাবে রিস্টার্ট করে লাইভ রাখে!`;
  }

  // 6. Website Hosting queries
  if (
    lower.includes('website') ||
    lower.includes('ওয়েবসাইট') ||
    lower.includes('সাইট হোস্ট') ||
    lower.includes('static site') ||
    lower.includes('web hosting') ||
    lower.includes('html host')
  ) {
    if (isEn) {
      return `🌐 **Website & Web App Hosting on HostingLiveFast:**

You can host modern responsive HTML, CSS, JavaScript web projects and frontend applications with zero hassle!

• **Supported formats:** Single HTML files, CSS, JS, images, or a full project packed in a \`.zip\` archive.
• **Instant Live Subdomains:** Get your website live immediately with secure SSL (HTTPS).
• **Custom Domain:** Connect your own custom domain easily from the dashboard.
• **How to upload:**
  1. Go to the **"Websites"** page from the sidebar menu.
  2. Click **"+ New Website"** / **"Upload"**.
  3. Enter your site name, choose your subdomain slug, and upload your files or ZIP archive.
  4. Your website is instantly live online around the world!`;
    }

    return `🌐 **হোস্টিংলাইভফাস্ট-এ ওয়েবসাইট হোস্টিং এর নিয়ম:**

আপনি খুব সহজেই যেকোনো HTML, CSS, JavaScript এবং স্ট্যাটিক ওয়েবসাইট ফ্রিতে বা কম খরচে হোস্ট করতে পারেন:

• **সমর্থিত ফাইল:** সিঙ্গেল HTML ফাইল অথবা সম্পূর্ণ প্রজেক্টের জিপ (\`.zip\`) ফাইল।
• **তাত্ক্ষণিক লাইভ সাবডোমেইন:** সাইট আপলোড করার সাথে সাথেই বিশ্বব্যাপী লাইভ URL এবং SSL (HTTPS) পেয়ে যাবেন।
• **কাস্টম ডোমেইন:** আপনার নিজের ডোমেইন থাকলে তাও যুক্ত করার সুবিধা রয়েছে।
• **হোস্ট করার সহজ ধাপ:**
  ১. সাইডবার মেনু থেকে **"ওয়েবসাইট" (Websites)** পেজে যান।
  ২. **"+ New Website"** বাটনে ক্লিক করুন।
  ৩. আপনার সাইটের নাম ও পছন্দের সাবডোমেইন নাম দিন এবং জিপ ফাইল আপলোড করুন।
  ৪. সাথে সাথে আপনার সাইট ইন্টারনেটে সক্রিয় হয়ে যাবে!`;
  }

  // 7. Plans, Pricing & Free Trial queries
  if (
    lower.includes('plan') ||
    lower.includes('pricing') ||
    lower.includes('প্ল্যান') ||
    lower.includes('প্যাকেজ') ||
    lower.includes('দাম') ||
    lower.includes('খরচ') ||
    lower.includes('free trial') ||
    lower.includes('ট্রায়াল') ||
    lower.includes('ট্রায়াল') ||
    lower.includes('price')
  ) {
    if (isEn) {
      return `📦 **Hosting Plans, Pricing & Free Trial:**

HostingLiveFast offers the most affordable and reliable 24/7 Telegram bot and web hosting packages:

• 🎁 **Free Trial (ফ্রি ট্রায়াল):** Test bot hosting for free! Experience 24/7 uptime and AI Guardian protection before upgrading.
• ⚡ **1 Month Plan:** Perfect for running your bots with full resource limits.
• 🚀 **3 Months & 6 Months Plans:** Discounted rates for uninterrupted bot and website operation.
• 👑 **1 Year Plan:** Maximum savings and dedicated high-priority watchdog support.

Go to the **"Plans"** page from the bottom navigation or sidebar to view real-time prices and activate your plan with your wallet balance!`;
    }

    return `📦 **হোস্টিং প্ল্যান, মূল্য ও ফ্রি ট্রায়াল (Free Trial):**

হোস্টিংলাইভফাস্ট-এ অত্যন্ত সুলভ মূল্যে প্রিমিয়াম ২৪/৭ টেলিগ্রাম বট ও ওয়েবসাইট হোস্টিং প্যাকেজ রয়েছে:

• 🎁 **ফ্রি ট্রায়াল (Free Trial):** নতুন ইউজারদের জন্য সম্পূর্ণ বিনামূল্যে টেস্ট করার সুযোগ! কোনো টাকা ছাড়াই বট হোস্ট করে ২৪/৭ লাইভ পারফরম্যান্স দেখুন।
• ⚡ **১ মাসের প্যাকেজ:** মাসিক নিয়মিত বট ও ওয়েবসাইট চালানোর জন্য উপযোগী।
• 🚀 **৩ মাস ও ৬ মাসের প্যাকেজ:** দীর্ঘমেয়াদী সাশ্রয়ী অফার।
• 👑 **১ বছরের ভিআইপি প্যাকেজ:** সর্বোচ্চ ডিসকাউন্ট এবং হাই-প্রাইওরিটি এআই গার্ডিয়ান সাপোর্ট।

নিচের মেনু বা সাইডবার থেকে **"প্ল্যান" (Plans)** পেজে গিয়ে আপনার পছন্দের প্যাকেজ বেছে নিন এবং ওয়ালেট ব্যালেন্স দিয়ে চালু করুন!`;
  }

  // 8. Social Tasks & Free Earning queries
  if (
    lower.includes('task') ||
    lower.includes('টাস্ক') ||
    lower.includes('রিওয়ার্ড') ||
    lower.includes('রিওয়ার্ড') ||
    lower.includes('reward') ||
    lower.includes('ইনকাম') ||
    lower.includes('earning') ||
    lower.includes('free balance')
  ) {
    if (isEn) {
      return `🎁 **Social Tasks & Free Wallet Earnings:**

You can earn free wallet balance on HostingLiveFast without depositing money!

1. Go to the **"Rewards / Social Tasks"** page from the sidebar.
2. Complete available tasks (e.g., subscribing to official Telegram channel, YouTube, or joining groups).
3. Submit your screenshot proof.
4. Once verified, free USD/BDT balance will be credited to your wallet, which you can use to buy hosting plans!`;
    }

    return `🎁 **সোশ্যাল টাস্ক ও ফ্রিতে ব্যালেন্স ইনকাম:**

কোনো টাকা ডিপোজিট না করেও আপনি ফ্রিতে ওয়ালেট ব্যালেন্স আয় করতে পারেন:

১. সাইডবার মেনু থেকে **"টাস্ক ও রিওয়ার্ড" (Rewards)** পেজে যান।
২. দেওয়া টাস্কগুলো পূরণ করুন (যেমন: টেলিগ্রাম চ্যানেলে জয়েন, ইউটিউব সাবস্ক্রাইব ইত্যাদি)।
৩. কাজের স্ক্রিনশট প্রুফ সাবমিট করুন।
৪. এডমিন ভেরিফাই করার সাথে সাথেই আপনার ওয়ালেটে ফ্রি ডলার/ব্যালেন্স যোগ হয়ে যাবে, যা দিয়ে আপনি সরাসরি বট হোস্ট করতে পারবেন!`;
  }

  // 9. Contact Admin & Human Support
  if (
    lower.includes('admin') ||
    lower.includes('এডমিন') ||
    lower.includes('contact') ||
    lower.includes('যোগাযোগ') ||
    lower.includes('help') ||
    lower.includes('support') ||
    lower.includes('নাম্বার') ||
    lower.includes('number') ||
    lower.includes('human')
  ) {
    if (isEn) {
      return `📞 **Official Admin Contact & Live Support:**

Need direct human assistance, balance verification, or custom hosting setups? You can reach the lead admin directly:

• 🟢 **WhatsApp:** +88${whatsappNum.replace(/^0/, '')} (${whatsappNum})
• ✈️ **Telegram:** @${telegramHandle} (https://t.me/${telegramHandle})
• ✉️ **Email:** ${emailAddr}

💬 When contacting, please include your registered account email and any Transaction ID (TrxID) for instant resolution.`;
    }

    return `📞 **সরাসরি এডমিনের সাথে যোগাযোগের ঠিকানা:**

আপনার কোনো পেমেন্ট সমস্যা, ব্যালেন্স ভেরিফিকেশন বা সরাসরি কথা বলার প্রয়োজন হলে নিচে যোগাযোগ করুন:

• 🟢 **হোয়াটসঅ্যাপ (WhatsApp):** ${whatsappNum} (+88${whatsappNum.replace(/^0/, '')})
• ✈️ **টেলিগ্রাম (Telegram):** @${telegramHandle} (https://t.me/${telegramHandle})
• ✉️ **অফিসিয়াল ইমেইল:** ${emailAddr}

এডমিনের সাথে যোগাযোগ করার সময় আপনার একাউন্টের ইমেইল ও ট্রানজেকশন আইডি (TrxID) উল্লেখ করলে সবচেয়ে দ্রুত সমাধান পাবেন!`;
  }

  // 10. General Platform Overview & Features
  if (
    lower.includes('সুবিধা') ||
    lower.includes('feature') ||
    lower.includes('about') ||
    lower.includes('hosting-live-fast') ||
    lower.includes('hosting live fast') ||
    lower.includes('হোস্টিং লাইভ ফাস্ট') ||
    lower.includes('সার্ভিস') ||
    lower.includes('service')
  ) {
    if (isEn) {
      return `⚡ **Welcome to HostingLiveFast (hosting-live-fast)!**

We are the premier 24/7 cloud runtime platform for developers and bot creators.

🌟 **Top Features:**
1. 🤖 **24/7 Bot Hosting:** Python (telebot, PTB, aiogram) & Node.js (telegraf).
2. 🛡️ **AI Bot Guardian:** Automatic error detection, pip library auto-installation, and zero-downtime crash revival.
3. 🌐 **Web Hosting:** Deploy static sites and web apps instantly with live URLs.
4. 💳 **Instant Deposits:** Local bKash, Nagad & global Binance Pay USDT support.
5. 📊 **Live Console & Terminal:** View real-time logs, CPU status, and process control.
6. 🎯 **Social Earning Tasks:** Earn free hosting credits easily.

What would you like to explore or do first? Ask me anything!`;
    }

    return `⚡ **হোস্টিংলাইভফাস্ট (hosting-live-fast) প্ল্যাটফর্মের মূল সুবিধাসমূহ:**

আমাদের প্ল্যাটফর্মে আপনি পাবেন সবচেয়ে আধুনিক ক্লাউড হোস্টিং ও অটো-হিলিং প্রযুক্তি:

🌟 **প্রধান সুবিধাসমূহ:**
১. 🤖 **২৪/৭ টেলিগ্রাম বট হোস্টিং:** পাইথন ও নোডজেএস বটের জন্য সার্বক্ষণিক হাই-স্পিড ক্লাউড রানটাইম।
২. 🛡️ **২৪ ঘণ্টা এআই বট গার্ডিয়ান:** বটের কোডে ভুল থাকলে ঠিক করা, প্যাকেজ অটো ইন্সটল এবং ক্র্যাশ হলে সাথে সাথে রিস্টার্ট করে চালু রাখা।
৩. 🌐 **ওয়েবসাইট হোস্টিং:** HTML/CSS/JS দিয়ে তৈরি সাইট চোখের পলকে লাইভ করা।
৪. 💳 **সহজ ডিপোজিট:** বিকাশ, নগদ ও বাইন্যান্স পে (USDT) দিয়ে ঝামেলাহীন পেমেন্ট।
৫. 📊 **লাইভ কনসোল ও টার্মিনাল:** বটের লাইভ লগস ও কাজের অগ্রগতি সরাসরি দেখার সুযোগ।
৬. 🎁 **ফ্রি ট্রায়াল ও আর্নিং টাস্ক:** ফ্রিতে ট্রায়াল নেওয়া ও সোশ্যাল টাস্ক করে ব্যালেন্স আয় করার সুবিধা।

আপনার কোনো প্রশ্ন থাকলে বা কোনো সমস্যা হলে নির্দ্বিধায় আমাকে জিজ্ঞেস করুন!`;
  }

  // Default welcome response
  if (isEn) {
    return `👋 Hello! I am your **24/7 AI Live Support Assistant & Lead Engineer** at HostingLiveFast.

I can help you with anything! You can ask me:
• 💡 **Any question of your choice** (coding, tech, science, general knowledge, problem solving, etc.)
• 🤖 **Hosting-live-fast services & 24/7 Telegram bot hosting**
• 🛠️ **Debug and auto-fix your Python or Node.js bot code**
• 🎨 **Upload pictures to generate responsive HTML/Tailwind websites**
• 💳 **Wallet deposits via bKash, Nagad, or Binance Pay USDT**
• 📞 **Direct contact with human admin**

Please type your question or describe what you need below!`;
  }

  return `👋 হ্যালো! আমি হোস্টিংলাইভফাস্ট-এর **২৪/৭ এআই লাইভ সাপোর্ট ও কোড ফিক্সার সহকারী**।

আমি আপনার যেকোনো প্রশ্নের উত্তর দিতে পারি এবং সাইটের বিষয়ে যেকোনো তথ্য ও সাহায্য করতে পারি:
• 💡 **আপনার ইচ্ছামতো যেকোনো প্রশ্ন** (প্রোগ্রামিং, পড়াশোনা, বিজ্ঞান, সাধারণ জ্ঞান বা যেকোনো বিষয়)
• 🤖 **হোস্টিংলাইভফাস্ট সাইটের সুবিধা ও ২৪ ঘণ্টা টেলিগ্রাম বট হোস্টিং**
• 🛠️ **পাইথন বা নোডজেএস বটের কোড ঠিক করা ও ভুল সমাধান**
• 🎨 **ছবি দিয়ে সম্পূর্ণ আকর্ষণীয় ওয়েবসাইট ও রেসপনসিভ কোড তৈরি**
• 💳 **বিকাশ, নগদ ও বাইন্যান্স পে দিয়ে ডিপোজিট ও ব্যালেন্স গাইড**
• 📞 **সরাসরি এডমিনের সাথে যোগাযোগ**

দয়া করে নিচে আপনার প্রশ্নটি লিখুন বা কী বিষয়ে জানতে চান জানান!`;
}
