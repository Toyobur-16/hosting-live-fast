import React, { useState } from 'react';
import {
  Bot,
  Copy,
  Check,
  Sparkles,
  Download,
  Code2,
  ExternalLink,
  X,
  FileCode,
  ShieldCheck,
  Zap,
  Globe
} from 'lucide-react';

interface AiBotPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'bn' | 'en';
}

export const AiBotPromptModal: React.FC<AiBotPromptModalProps> = ({
  isOpen,
  onClose,
  lang = 'bn'
}) => {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompt' | 'python' | 'nodejs'>('prompt');
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const siteUrl = 'https://hosting-fast.hopto.org';
  const llmsUrl = 'https://hosting-fast.hopto.org/llms.txt';

  const defaultPrompt = `আমার হোস্টিং সাইট: ${siteUrl} (স্পেসিফিকেশন: ${llmsUrl})

এই সাইটের 24/7 ক্লাউড রানটাইম অনুযায়ী আমাকে একটি সম্পূর্ণ এবং ১০০% ক্র্যাশ-প্রুফ টেলিগ্রাম টাস্ক ইনকাম বট (Telegram Task Earning Bot) কোড লিখে দাও (Python telebot দিয়ে)।

বটটিতে নিচের সব ফিচার থাকতে হবে:
1. ইউজার একাউন্ট ও ব্যালেন্স সিস্টেম (লোকাল users.json ফাইলে সুরক্ষিত থাকবে)
2. টাস্ক ইনকাম (টেলিগ্রাম চ্যানেল জয়েন, ইউটিউব সাবস্ক্রাইব, ওয়েবসাইট ভিজিট ভেরিফিকেশন)
3. ২৪ ঘণ্টার ডেইলি বোনাস (Daily Bonus Cooldown)
4. ইউনিক রেফারেল লিংক এবং রেফার বোনাস (Referral System)
5. বিকাশ (bKash), নগদ (Nagad) এবং Binance USDT দিয়ে উইথড্রয়াল রিকোয়েস্ট (Withdrawal System)
6. এডমিন প্যানেল ও সব ইউজারের কাছে মেসেজ পাঠানোর ব্রডকাস্ট কমান্ড
7. কোডটিতে যেন অটো-রিকানেক্ট ও এরর হ্যান্ডলিং থাকে যাতে ${siteUrl} সাইটে কোনো ক্র্যাশ ছাড়া সার্বক্ষণিক লাইভ চলে।

কোডটি এমনভাবে দাও যেন আমি শুধু Bot Token বসিয়ে সরাসরি হোস্ট করতে পারি।`;

  const pythonSampleCode = `import os
import json
import time
import telebot
from telebot import types

# আপনার বটের টোকেন এখানে বসান (BotFather থেকে পাওয়া):
BOT_TOKEN = os.environ.get("BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
ADMIN_ID = int(os.environ.get("ADMIN_ID", "123456789"))  # আপনার টেলিগ্রাম আইডি
DATA_FILE = "users.json"
WITHDRAW_FILE = "withdrawals.json"

bot = telebot.TeleBot(BOT_TOKEN, parse_mode="HTML")

def load_data(file, default):
    if not os.path.exists(file):
        with open(file, "w", encoding="utf-8") as f:
            json.dump(default, f, indent=2)
        return default
    try:
        with open(file, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return default

def save_data(file, data):
    with open(file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

users = load_data(DATA_FILE, {})
withdrawals = load_data(WITHDRAW_FILE, [])

def get_user(uid, name="", username=""):
    uid = str(uid)
    if uid not in users:
        users[uid] = {
            "name": name,
            "username": username,
            "balance": 10.0,
            "referrals": 0,
            "referredBy": None,
            "lastDaily": 0,
            "tasks": []
        }
        save_data(DATA_FILE, users)
    return users[uid]

def main_menu():
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    markup.add(
        types.KeyboardButton("💰 My Balance"),
        types.KeyboardButton("🎯 Earn Tasks"),
        types.KeyboardButton("🎁 Daily Bonus"),
        types.KeyboardButton("👥 Referral Link"),
        types.KeyboardButton("💳 Withdraw"),
        types.KeyboardButton("📊 Statistics")
    )
    return markup

@bot.message_handler(commands=['start'])
def start_cmd(message):
    uid = str(message.from_user.id)
    args = message.text.split()
    user = get_user(uid, message.from_user.first_name, message.from_user.username or "")

    if len(args) > 1 and not user["referredBy"] and args[1] != uid:
        referrer_id = args[1]
        if referrer_id in users:
            user["referredBy"] = referrer_id
            users[referrer_id]["balance"] += 5.0
            users[referrer_id]["referrals"] += 1
            save_data(DATA_FILE, users)
            try:
                bot.send_message(int(referrer_id), f"🎉 <b>New Referral!</b> {message.from_user.first_name} joined via your link! (+5.0 Points)")
            except:
                pass

    welcome_msg = (
        f"👋 <b>Welcome, {message.from_user.first_name}!</b>\\n\\n"
        f"🎯 <b>Telegram Task Earning Bot</b>\\n"
        f"Earn money by completing tasks and inviting friends!\\n\\n"
        f"💰 <b>Welcome Bonus:</b> 10.0 Points added!\\n"
        f"⚡ <i>Hosted 24/7 on https://hosting-fast.hopto.org</i>"
    )
    bot.send_message(message.chat.id, welcome_msg, reply_markup=main_menu())

@bot.message_handler(func=lambda msg: msg.text == "💰 My Balance")
def balance_msg(message):
    u = get_user(message.from_user.id)
    bot.send_message(message.chat.id, f"👤 <b>Balance:</b> {u['balance']:.2f} Points\\n👥 <b>Referrals:</b> {u['referrals']} users")

@bot.message_handler(func=lambda msg: msg.text == "🎁 Daily Bonus")
def daily_bonus_msg(message):
    uid = str(message.from_user.id)
    u = get_user(uid)
    now = time.time()
    if now - u["lastDaily"] < 86400:
        rem = int((86400 - (now - u["lastDaily"])) / 60)
        bot.send_message(message.chat.id, f"⏳ You already claimed daily bonus! Come back in {rem} minutes.")
        return
    u["balance"] += 5.0
    u["lastDaily"] = now
    save_data(DATA_FILE, users)
    bot.send_message(message.chat.id, "🎉 <b>Daily Bonus Claimed!</b> +5.0 Points added to your account.")

@bot.message_handler(func=lambda msg: msg.text == "👥 Referral Link")
def ref_msg(message):
    bot_info = bot.get_me()
    bot.send_message(message.chat.id, f"👥 <b>Your Referral Link:</b>\\nhttps://t.me/{bot_info.username}?start={message.from_user.id}\\n\\nEarn 5.0 Points per friend!")

@bot.message_handler(func=lambda msg: msg.text == "🎯 Earn Tasks")
def tasks_msg(message):
    markup = types.InlineKeyboardMarkup(row_width=1)
    markup.add(
        types.InlineKeyboardButton("📢 Join Channel (+10 Points)", url="https://t.me/telegram"),
        types.InlineKeyboardButton("🌐 Visit Site (+5 Points)", url="https://hosting-fast.hopto.org"),
        types.InlineKeyboardButton("✅ Verify & Claim", callback_data="claim_tasks")
    )
    bot.send_message(message.chat.id, "🎯 <b>Available Tasks:</b>\\nComplete tasks and click Verify:", reply_markup=markup)

@bot.callback_query_handler(func=lambda call: call.data == "claim_tasks")
def handle_claim_tasks(call):
    uid = str(call.from_user.id)
    u = get_user(uid)
    if "task_basic" not in u["tasks"]:
        u["tasks"].append("task_basic")
        u["balance"] += 15.0
        save_data(DATA_FILE, users)
        bot.answer_callback_query(call.id, "🎉 Verified! +15.0 Points added!", show_alert=True)
    else:
        bot.answer_callback_query(call.id, "⚠️ Already claimed!", show_alert=True)

@bot.message_handler(func=lambda msg: msg.text == "💳 Withdraw")
def withdraw_msg(message):
    u = get_user(message.from_user.id)
    text = (
        f"💳 <b>Withdrawal</b>\\n"
        f"Balance: <b>{u['balance']:.2f} Points</b>\\n"
        f"Minimum: <b>50.00 Points</b>\\n\\n"
        f"Command: <code>/withdraw [bKash/Nagad/USDT] [Number] [Amount]</code>\\n"
        f"Example: <code>/withdraw bKash 01700000000 50</code>"
    )
    bot.send_message(message.chat.id, text)

@bot.message_handler(commands=['withdraw'])
def process_withdraw(message):
    uid = str(message.from_user.id)
    u = get_user(uid)
    parts = message.text.split()
    if len(parts) < 4:
        bot.send_message(message.chat.id, "⚠️ Format: <code>/withdraw [Method] [Account] [Amount]</code>")
        return
    method, account, amt = parts[1], parts[2], float(parts[3])
    if amt < 50 or u["balance"] < amt:
        bot.send_message(message.chat.id, "⚠️ Insufficient balance or below minimum 50!")
        return
    u["balance"] -= amt
    save_data(DATA_FILE, users)
    withdrawals.append({"userId": uid, "method": method, "account": account, "amount": amt, "time": time.ctime()})
    save_data(WITHDRAW_FILE, withdrawals)
    bot.send_message(message.chat.id, f"✅ Withdrawal request of {amt} via {method} submitted!")

if __name__ == "__main__":
    print("[hosting-fast] Bot starting...")
    while True:
        try:
            bot.infinity_polling(timeout=10, long_polling_timeout=5)
        except Exception as e:
            time.sleep(5)
`;

  const copyToClipboard = (text: string, isPrompt: boolean) => {
    navigator.clipboard.writeText(text);
    if (isPrompt) {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#11192e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00d293] to-emerald-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-[#00d293]/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{lang === 'bn' ? 'এআই দিয়ে টাস্ক বট কোড তৈরি করুন' : 'AI Task Bot Code Generator'}</span>
                <span className="px-2 py-0.5 rounded-full bg-[#00d293]/15 text-[#00d293] text-[10px] font-black uppercase border border-[#00d293]/30">
                  AI Ready
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'bn'
                  ? 'যেকোনো AI (ChatGPT/Claude/Gemini) তে লিংক দিয়ে বট কোড পাওয়ার নির্দেশিকা'
                  : 'Instructions to get production-ready Telegram Bot code from any AI'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-4 bg-slate-100 dark:bg-[#0f172a]">
          <button
            onClick={() => setActiveTab('prompt')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'prompt'
                ? 'border-[#00d293] text-[#00d293]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{lang === 'bn' ? 'এআই প্রম্পট (Copy Prompt)' : 'AI Prompt'}</span>
          </button>
          <button
            onClick={() => setActiveTab('python')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'python'
                ? 'border-[#00d293] text-[#00d293]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Python Script (bot.py)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'prompt' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[#00d293]/10 border border-[#00d293]/20 flex items-start gap-3 text-slate-800 dark:text-slate-200 text-xs">
                <Globe className="w-4 h-4 text-[#00d293] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#00a876] dark:text-[#00d293]">
                    {lang === 'bn' ? 'যেভাবে যেকোনো AI কে বলবেন:' : 'How to use with any AI:'}
                  </span>
                  <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                    {lang === 'bn'
                      ? 'নিচের প্রম্পটটি কপি করে ChatGPT, Claude, Gemini বা DeepSeek-এ পেস্ট করুন। AI আপনার সাইটের আর্কিটেকচার বুঝে সরাসরি সম্পূর্ণ কোড লিখে দিবে।'
                      : 'Copy this prompt and paste into ChatGPT, Claude, Gemini, or DeepSeek. The AI will inspect your site and output ready code.'}
                  </p>
                </div>
              </div>

              {/* Prompt Box */}
              <div className="relative">
                <textarea
                  readOnly
                  rows={8}
                  value={defaultPrompt}
                  className="w-full p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-[#00d293]"
                />
                <button
                  onClick={() => copyToClipboard(defaultPrompt, true)}
                  className="absolute top-2.5 right-2.5 px-3 py-1.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPrompt ? (lang === 'bn' ? 'কপি হয়েছে!' : 'Copied!') : (lang === 'bn' ? 'প্রম্পট কপি করুন' : 'Copy Prompt')}</span>
                </button>
              </div>

              {/* Verified Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{lang === 'bn' ? 'টাস্ক ইনকাম ও রিওয়ার্ড সিস্টেম' : 'Task Earning & Rewards'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{lang === 'bn' ? 'বিকাশ, নগদ ও USDT উইথড্রয়াল' : 'bKash/Nagad/USDT Withdraw'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>{lang === 'bn' ? 'users.json এ অটো ব্যাকআপ' : 'Auto Storage in users.json'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-purple-500 shrink-0" />
                  <span>{lang === 'bn' ? '২৪/৭ অটো ওয়াচডগ রিস্টার্ট' : '24/7 Watchdog Recovery'}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'python' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'bn' ? 'রেডিমেড স্ক্রিপ্ট (সরাসরি ডাউনলোড ও রান করুন):' : 'Ready-made Script (Instant Download):'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(pythonSampleCode, false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => downloadFile('bot.py', pythonSampleCode)}
                    className="px-3 py-1.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download bot.py</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono overflow-x-auto max-h-[360px] leading-relaxed">
                  <code>{pythonSampleCode}</code>
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#11192e] flex items-center justify-between">
          <a
            href="/llms.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#00a876] dark:text-[#00d293] hover:underline flex items-center gap-1 font-bold"
          >
            <span>{lang === 'bn' ? 'লাইভ /llms.txt স্পেসিফিকেশন দেখুন' : 'View live /llms.txt'}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
