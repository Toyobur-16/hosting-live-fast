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

let quotaExceededUntil = 0;

export async function askAiSupport(
  userMessage: string,
  chatHistory: ChatMessage[] = [],
  supportSettings?: any
): Promise<{ text: string; fallback?: boolean }> {
  const cleanMsg = (userMessage || '').trim();
  if (!cleanMsg) {
    return { text: 'অনুগ্রহ করে আপনার প্রশ্ন বা সমস্যার বিবরণ লিখুন।' };
  }

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

      // Add current user message
      contents.push({
        role: 'user',
        parts: [{ text: cleanMsg }]
      });

      // Supported modern models per Gemini API guidelines
      const candidateModels = [
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite'
      ];

      for (const modelName of candidateModels) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AI request timed out')), 6000)
          );
          const response: any = await Promise.race([
            ai.models.generateContent({
              model: modelName,
              contents,
              config: {
                systemInstruction: SYSTEM_INSTRUCTION,
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
          // If quota is exhausted or rate limit hit, enter a cooldown window and switch to local engine
          if (errMsg.includes('quota') || errMsg.includes('resource_exhausted') || errMsg.includes('429')) {
            quotaExceededUntil = Date.now() + 15 * 60 * 1000; // 15 minutes cooldown
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
    text: getRuleBasedReply(cleanMsg, supportSettings),
    fallback: true
  };
}

function getRuleBasedReply(msg: string, settings?: any): string {
  const lower = msg.toLowerCase();
  const whatsappNum = settings?.whatsapp || '01304104492';
  const telegramHandle = settings?.telegram || 'toyoburrahman';
  const emailAddr = settings?.email || 'toyoburrahman560@gmail.com';

  // Code Debugging & Telegram Bot Auto-Fix query
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
    return `🛠️ **টেলিগ্রাম বট কোড ফিক্সার ও ডিবাগার:**

আপনার কোডের সাধারণ ভুলগুলো স্বয়ংক্রিয়ভাবে ঠিক করার সমাধান:

১. **টোকেন ও ইমপোর্ট সমস্যা:**
\`telebot\` (pyTelegramBotAPI) বা \`python-telegram-bot\` ঠিকমতো ইমপোর্ট ও টোকেন পাস করা হয়েছে কিনা দেখুন।

২. **১০০% রেডি ও টেস্টেড টেলিগ্রাম বট কোড (Python):**
\`\`\`python
# main.py
import telebot

# আপনার বটের টোকেন দিন (BotFather থেকে পাওয়া)
BOT_TOKEN = "YOUR_BOT_TOKEN_HERE"
bot = telebot.TeleBot(BOT_TOKEN)

# /start কমান্ড হ্যান্ডলার
@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    bot.reply_to(message, "👋 স্বাগতম! আপনার টেলিগ্রাম বট হোস্টিং লাইভ ফাস্টে সফলভাবে চলছে।")

# সাধারণ মেসেজের উত্তর
@bot.message_handler(func=lambda message: True)
def echo_all(message):
    bot.reply_to(message, f"আপনি লিখেছেন: {message.text}")

# ২৪ ঘণ্টা অবিরাম রান রাখার জন্য পোলিং
if __name__ == "__main__":
    print("🤖 Telegram Bot Started Successfully!")
    bot.infinity_polling(skip_pending=True)
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

  // Deposit & Payment queries
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
    return `💳 **ডিপোজিট ও ওয়ালেট সংক্রান্ত সাহায্য:**

১. **বিকাশ ও নগদ:** বিকাশ (01614572747) বা নগদ (01304104492) নাম্বারে Send Money করুন।
২. **বাইন্যান্স পে (Binance Pay):** Pay ID / UID (922593999) তে USDT পাঠান।
৩. পেমেন্ট শেষ হলে TrxID / Transaction ID কপি করুন।
৪. ওয়েবসাইটের **"ডিপোজিট" (Deposit)** পেজে গিয়ে এমাউন্ট ও TrxID লিখে সাবমিট করুন।
৫. এডমিন ভেরিফাই করে দ্রুত আপনার ওয়ালেটে USD ব্যালেন্স যোগ করে দেবে।

⚠️ কোনো সমস্যা হলে বা ট্রানজেকশন আটকে গেলে সরাসরি এডমিনের সাথে যোগাযোগ করুন:
• **WhatsApp:** ${whatsappNum}
• **Telegram:** @${telegramHandle}`;
  }

  // Telegram bot hosting queries
  if (
    lower.includes('bot') ||
    lower.includes('বট') ||
    lower.includes('টেলিগ্রাম') ||
    lower.includes('telegram') ||
    lower.includes('python') ||
    lower.includes('node') ||
    lower.includes('host') ||
    lower.includes('হোস্ট')
  ) {
    return `🤖 **টেলিগ্রাম বট হোস্টিং নির্দেশিকা:**

১. **বট আপলোড:** আপনার বটের ফাইলগুলো ZIP আকারে তৈরি করুন (main.py অথবা index.js এবং dependencies ফাইল সহ)।
২. **নতুন বট অ্যাড:** ড্যাশবোর্ডে গিয়ে **"+ New Bot"** বাটনে ক্লিক করে ফাইলটি আপলোড করুন।
3. **বট রান:** বট তৈরি হলে **"Start"** বাটনে চাপ দিন। আপনার বট ২৪ ঘণ্টা লাইভ চলবে।
৪. **লগ দেখা:** কনসোল ট্যাব থেকে রিয়েল-টাইম এরর ও লগ দেখতে পারবেন।

কোনো সমস্যা হলে টেলিগ্রাম সাপোর্টে মেসেজ দিন: https://t.me/${telegramHandle}`;
  }

  // Website hosting queries
  if (
    lower.includes('website') ||
    lower.includes('ওয়েবসাইট') ||
    lower.includes('ওয়েবসাইট') ||
    lower.includes('domain') ||
    lower.includes('ডোমেন')
  ) {
    return `🌐 **ওয়েবসাইট হোস্টিং নির্দেশিকা:**

১. আপনার সাইটের কোড ফাইল (HTML, CSS, JS) জিপ করে আপলোড করুন।
২. সাথে সাথে ফ্রি সাবডোমেন দিয়ে আপনার সাইট লাইভ হয়ে যাবে।
৩. প্ল্যান অনুযায়ী কাস্টম ডোমেন ও আনলিমিটেড ট্রাফিক সাপোর্ট পাবেন।`;
  }

  // Human support contact
  if (
    lower.includes('admin') ||
    lower.includes('এডমিন') ||
    lower.includes('human') ||
    lower.includes('মানুষ') ||
    lower.includes('কথা') ||
    lower.includes('support') ||
    lower.includes('সাপোর্ট') ||
    lower.includes('help') ||
    lower.includes('নাম্বার')
  ) {
    return `📞 **এডমিন ও হিউম্যান সাপোর্ট যোগাযোগ:**

আপনার যেকোনো জরুরি সমস্যা বা অ্যাকাউন্টের সহায়তায় আমাদের অফিশিয়াল সাপোর্টে নক দিন:
• **হোয়াটসঅ্যাপ (WhatsApp):** https://wa.me/88${whatsappNum.replace(/^0/, '')} (${whatsappNum})
• **টেলিগ্রাম (Telegram):** https://t.me/${telegramHandle}
• **ইমেইল (Email):** ${emailAddr}

এডমিন ২৪ ঘণ্টার মধ্যে আপনার সমস্যার সমাধান করে দেবে।`;
  }

  // Password / Login issues
  if (
    lower.includes('password') ||
    lower.includes('পাসওয়ার্ড') ||
    lower.includes('login') ||
    lower.includes('লগইন') ||
    lower.includes('লগিন') ||
    lower.includes('otp') ||
    lower.includes('code') ||
    lower.includes('কোড')
  ) {
    return `🔐 **লগইন ও পাসওয়ার্ড সহায়তা:**

• পাসওয়ার্ড ভুলে গেলে লগইন পেজে **"পাসওয়ার্ড ভুলে গেছেন? (Forgot Password)"** অপশনে চাপ দিন।
• আপনার ইমেইলে একটি ৬-সংখ্যার OTP কোড যাবে, সেটি দিয়ে নতুন পাসওয়ার্ড সেট করুন।
• ইমেইল ইনবক্সে কোড না পেলে **Spam / Junk** ফোল্ডার চেক করুন।`;
  }

  // General welcome
  return `👋 হ্যালো! আমি হোস্টিংলাইভফাস্ট-এর **২৪/৭ এআই সাপোর্ট রোবট ও কোড ফিক্সার**।

আমি আপনাকে কীভাবে সাহায্য করতে পারি? আপনি বাংলায় বা ইংরেজিতে যেকোনো প্রশ্ন করতে পারেন:
• 🛠️ **টেলিগ্রাম বটের ভুল কোড বা এরর স্বয়ংক্রিয়ভাবে ঠিক করা**
• 💳 **ডিপোজিট ও পেমেন্ট**
• 🤖 **টেলিগ্রাম বট হোস্টিং নির্দেশিকা**
• 🌐 **ওয়েবসাইট তৈরি ও হোস্টিং**
• 💰 **সোশ্যাল টাস্ক রিওয়ার্ড**
• 📞 **সরাসরি এডমিনের সাথে যোগাযোগ**

দয়া করে আপনার সমস্যার কথা বিস্তারিত লিখুন অথবা কোড পেস্ট করুন!`;
}
