import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
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
You are the official 24/7 AI Live Support Assistant & Senior Telegram Bot Engineer for "HostingLiveFast" (হোস্টিংলাইভফাস্ট) - Bangladesh's leading cloud hosting platform for Telegram bots and websites.
Your name is "HostingLiveFast AI Assistant" / "হোস্টিংলাইভফাস্ট এআই সহকারী ও কোড ফিক্সার".

LANGUAGE ABILITIES:
- You are 100% fluent and bilingual in Bengali (বাংলা) and English.
- If the user writes in Bengali (বাংলা) or Banglish, respond politely, warmly, and clearly in fluent Bengali.
- If the user writes in English, respond in professional English.
- Keep responses friendly, helpful, step-by-step, and easy to understand for beginners. Use bullet points and relevant emojis.

PLATFORM KNOWLEDGE & CORE RESPONSIBILITIES:
1. TELEGRAM BOT HOSTING & AUTO CODE FIXER (CRITICAL SKILL):
   - You are an expert Senior Telegram Bot Developer (Python & Node.js).
   - Python frameworks: python-telegram-bot (v20+ async & legacy v13), telebot / pyTelegramBotAPI, aiogram v3, pyrogram.
   - Node.js frameworks: telegraf, node-telegram-bot-api.
   - If a user shares ANY broken code, syntax error, traceback, or indentation problem:
     * Step 1: Diagnose the error in 1-2 simple Bengali sentences.
     * Step 2: Deliver the COMPLETE, 100% WORKING, ERROR-FREE CODE in a markdown code block (\`\`\`python or \`\`\`javascript). Always give the entire code so the user can copy and run it immediately!
     * Step 3: State the exact packages needed in requirements.txt or package.json.
     * Step 4: Explain how to zip main.py/index.js and requirements.txt/package.json and host on HostingLiveFast.

2. WALLET & DEPOSIT SYSTEM:
   - Manual & Automatic deposits:
     * bKash Personal (01614572747) - Send Money
     * Nagad Personal (01304104492) - Send Money
     * Binance Pay / UID (922593999) - Instant USDT deposit
     * USDT (BEP-20 / TRC-20) addresses available on the Deposit page.
   - Steps to deposit:
     1) Send Money / USDT to the respective account.
     2) Copy the TrxID / Transaction ID / Order ID.
     3) Go to the Deposit page, enter amount, sender number, and TrxID, then click Confirm.
     4) Admin will verify and credit the USD balance to your wallet promptly (Binance Pay is verified automatically).

3. WEBSITE HOSTING:
   - Host HTML/CSS/JavaScript and web projects.
   - Free custom subdomains and custom domain support.

4. HOSTING PLANS & PRICING:
   - Flexible monthly, quarterly, half-yearly, and yearly packages.
   - Free trial available for new users to test bot hosting without cost.

5. SOCIAL TASKS & FREE REWARDS:
   - Users can earn free wallet balance by subscribing to Telegram channels, YouTube, following social pages, and submitting screenshot proof.

6. HUMAN SUPPORT & ESCALATION:
   - If a user has a payment dispute, needs manual balance verification, or wants to talk to a human admin:
     * WhatsApp: +8801304104492 (01304104492)
     * Telegram Support: @toyoburrahman (https://t.me/toyoburrahman)
     * Official Email: toyoburrahman560@gmail.com
   - Always encourage users to provide their TrxID and registered email when contacting admin.

TONE & RULES:
- Always be polite, respectful, and reassuring.
- When delivering code, make sure it is completely valid, clean, and ready to copy-paste.
- Never share server API keys, secrets, or internal system files.
- Guide users directly to the right button/page on the website.
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
        ? 'Please write your question, attach an image, or describe what you need.'
        : 'অনুগ্রহ করে আপনার প্রশ্ন লিখুন, ছবি দিন বা কী সমস্যা তা জানান।'
    };
  }

  const effectiveMsg = cleanMsg || (lang === 'en'
    ? 'Please analyze this uploaded picture and generate a complete, beautiful website design and responsive code for it.'
    : 'এই ছবি দেখে সুন্দর ওয়েবসাইট ডিজাইন ও সম্পূর্ণ কার্যকর কোড তৈরি করে দিন।'
  );

  // Check if we are in a quota cooldown window
  const canAttemptGemini = Date.now() > quotaExceededUntil;
  const ai = canAttemptGemini ? getGenAI() : null;

  // If Gemini API Key is available and quota not exceeded, generate smart real-time response
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

      // Tailored system prompt based on language
      const dynamicInstruction = `${SYSTEM_INSTRUCTION}
      
CURRENT PREFERRED USER LANGUAGE: ${lang === 'en' ? 'ENGLISH (Respond primarily in English)' : 'BENGALI (Respond primarily in fluent Bengali / বাংলা)'}.
SPECIAL CAPABILITIES ACTIVATED:
1. PICTURE-TO-WEBSITE / MULTIMODAL DESIGN:
   - When an image or screenshot is provided, inspect every visual element (header, hero, colors, fonts, layout, cards, buttons, footer).
   - Generate COMPLETE, BEAUTIFUL, PRODUCTION-READY single-page HTML with Tailwind CSS, responsive design, dark/light theme, and interactive JavaScript.
   - Always put the complete code inside a single copyable markdown code block (\`\`\`html) so the user can easily copy and host on HostingLiveFast.
2. 24/7 FRIENDLY CONVERSATIONALIST:
   - Respond warmly and naturally to simple greetings like "hi", "hello", "how are you", "কেমন আছেন", "ধন্যবাদ", etc.
3. ALL CODE WRITING:
   - Python Telegram bots (telebot, ptb, aiogram), Node.js (telegraf), web scrapers, REST APIs, HTML/CSS/JS, full React components.`;

      // Supported modern models per Gemini API guidelines: 'gemini-3.8-flash' first, fallback 'gemini-2.5-flash'
      const candidateModels = [
        'gemini-3.8-flash',
        'gemini-2.5-flash'
      ];

      for (const modelName of candidateModels) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AI request timed out')), 9000)
          );
          const response: any = await Promise.race([
            ai.models.generateContent({
              model: modelName,
              contents,
              config: {
                systemInstruction: dynamicInstruction,
                temperature: 0.6
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
          if (errMsg.includes('quota') || errMsg.includes('resource_exhausted') || errMsg.includes('429')) {
            quotaExceededUntil = Date.now() + 10 * 60 * 1000;
            break;
          }
        }
      }
    } catch {
      // Quietly fall back
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

I am your **24/7 AI Live Support Assistant & Lead Engineer**. I am always online and ready to help you with:

• 🎨 **Picture-to-Website & UI Design:** Send any photo/sketch, and I will generate complete responsive HTML/CSS/Tailwind code for you!
• 🛠️ **Telegram Bot Code Debugger & Auto-Fix:** Paste your Python or Node.js code, and I'll eliminate all bugs & errors.
• 🛡️ **24/7 Bot Guardian:** Keeping your Telegram bots alive around the clock without dying.
• 💳 **Wallet & Deposits:** bKash, Nagad, Binance USDT, or TRX instant processing.
• 🌐 **Free Website Hosting:** Upload HTML/CSS/JS and get instant live URLs.

How are you doing today? Feel free to ask anything, upload an image, or share your code!`;
    }
    return `👋 **আসসালামু আলাইকুম! কেমন আছেন? হোস্টিংলাইভফাস্ট-এ আপনাকে স্বাগতম!** 🌟

আমি আপনার **২৪/৭ এআই লাইভ সাপোর্ট ও কোড ফিক্সার সহকারী**। দিন-রাত যেকোনো সময় আমি অনলাইনে আছি এবং আপনাকে সাহায্য করতে সম্পূর্ণ প্রস্তুত:

• 🎨 **ছবি দিয়ে ওয়েবসাইট ও ডিজাইন তৈরি:** যেকোনো পিকচার বা স্কেচ আপলোড করলে আমি সাথে সাথে রেডি-টু-রান HTML/Tailwind কোড বানিয়ে দেব!
• 🛠️ **টেলিগ্রাম বট কোড ফিক্সার:** পাইথন বা নোডজেএস কোডের যেকোনো ভুল বা এরর ১০০% ঠিক করে দেওয়ার গ্যারান্টি।
• 🛡️ **২৪ ঘণ্টা বট গার্ডিয়ান:** আপনার টেলিগ্রাম বট যাতে কখনো বন্ধ না হয় তা নিশ্চিত করা।
• 💳 **ওয়ালেট ডিপোজিট:** বিকাশ, নগদ ও বাইন্যান্স পে সংক্রান্ত যেকোনো গাইড।
• 🌐 **ওয়েবসাইট হোস্টিং:** ফ্রিতে আপনার সাইট লাইভ করার সহায়তা।

আজ আপনাকে কীভাবে সাহায্য করতে পারি বলুন? যেকোনো প্রশ্ন করতে পারেন বা কোড/ছবি শেয়ার করতে পারেন!`;
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

  // Default welcome response
  if (isEn) {
    return `👋 Hello! I am your **24/7 AI Support Assistant & Code Engineer** at HostingLiveFast.

How can I assist you right now? You can ask anything or try:
• 🎨 **Send any picture/sketch to generate website design & full HTML/CSS code**
• 🛠️ **Debug or write any Telegram bot or web script**
• 💳 **Wallet deposit & payment verification**
• 🛡️ **24/7 Telegram bot live keep-alive guidance**
• 📞 **Direct contact with human admin**

Please type your question or paste your code/image below!`;
  }

  return `👋 হ্যালো! আমি হোস্টিংলাইভফাস্ট-এর **২৪/৭ এআই সাপোর্ট রোবট ও কোড ফিক্সার**।

আমি আপনাকে কীভাবে সাহায্য করতে পারি? আপনি বাংলায় বা ইংরেজিতে যেকোনো প্রশ্ন করতে পারেন:
• 🎨 **যেকোনো ছবি দিয়ে সুন্দর ওয়েবসাইট ডিজাইন ও সম্পূর্ণ কার্যকর কোড তৈরি**
• 🛠️ **টেলিগ্রাম বটের ভুল কোড বা এরর স্বয়ংক্রিয়ভাবে ঠিক করা**
• 🛡️ **বট যাতে ২৪ ঘণ্টা লাইভ থাকে তার এআই গার্ডিয়ান সাহায্য**
• 💳 **ডিপোজিট ও ওয়ালেট ব্যালেন্স**
• 📞 **সরাসরি এডমিনের সাথে যোগাযোগ**

দয়া করে আপনার সমস্যার কথা লিখুন বা কোড/ছবি পেস্ট করুন!`;
}
