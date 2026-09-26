import React from 'react';
import { Home, Crown, PlusCircle, Server, Wallet } from 'lucide-react';

interface BottomNavBarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  lang: 'bn' | 'en';
  botsCount?: number;
  onDeployNewBot: () => void;
}

export function BottomNavBar({
  activeTab,
  onSelectTab,
  lang,
  botsCount = 0,
  onDeployNewBot
}: BottomNavBarProps) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#070b13]/95 backdrop-blur-md border-t border-slate-200 dark:border-[#162035] pt-1 px-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] transition-colors shadow-xl">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {/* 1. Home */}
        <button
          onClick={() => onSelectTab('home')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer shrink-0 ${
            activeTab === 'home'
              ? 'text-[#00a876] dark:text-[#00d293] scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Home className={`w-5 h-5 shrink-0 ${activeTab === 'home' ? 'stroke-[2.5]' : ''}`} />
          <span className={`text-[10px] mt-0.5 whitespace-nowrap ${activeTab === 'home' ? 'font-black' : 'font-semibold'}`}>
            {lang === 'bn' ? 'হোম' : 'Home'}
          </span>
          {activeTab === 'home' && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#00d293] mt-0.5 shrink-0"></span>
          )}
        </button>

        {/* 2. Plans */}
        <button
          onClick={() => onSelectTab('plans')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer shrink-0 ${
            activeTab === 'plans'
              ? 'text-amber-500 dark:text-amber-400 scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Crown className={`w-5 h-5 shrink-0 ${activeTab === 'plans' ? 'stroke-[2.5]' : ''}`} />
          <span className={`text-[10px] mt-0.5 whitespace-nowrap ${activeTab === 'plans' ? 'font-black' : 'font-semibold'}`}>
            {lang === 'bn' ? 'প্ল্যানস' : 'Plans'}
          </span>
          {activeTab === 'plans' && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5 shrink-0"></span>
          )}
        </button>

        {/* 3. Center Action: Deploy New Bot */}
        <button
          onClick={onDeployNewBot}
          className="flex flex-col items-center justify-center -mt-5 p-1 cursor-pointer group shrink-0"
          title={lang === 'bn' ? 'নতুন বট ডিপ্লয় করুন' : 'Deploy New Bot'}
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#00d293] to-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-[#00d293]/30 group-hover:scale-105 group-active:scale-95 transition-transform shrink-0">
            <PlusCircle className="w-6 h-6 stroke-[2.5] shrink-0" />
          </div>
          <span className="text-[10px] font-black text-[#00a876] dark:text-[#00d293] mt-0.5 whitespace-nowrap">
            {lang === 'bn' ? 'ডিপ্লয় বট' : 'Deploy'}
          </span>
        </button>

        {/* 4. My Bots */}
        <button
          onClick={() => onSelectTab('bots')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer shrink-0 ${
            activeTab === 'bots' || activeTab === 'terminal'
              ? 'text-sky-500 dark:text-sky-400 scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative shrink-0">
            <Server className={`w-5 h-5 shrink-0 ${activeTab === 'bots' || activeTab === 'terminal' ? 'stroke-[2.5]' : ''}`} />
            {botsCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-sky-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs shrink-0">
                {botsCount}
              </span>
            )}
          </div>
          <span className={`text-[10px] mt-0.5 whitespace-nowrap ${activeTab === 'bots' || activeTab === 'terminal' ? 'font-black' : 'font-semibold'}`}>
            {lang === 'bn' ? 'আমার বট' : 'My Bots'}
          </span>
          {(activeTab === 'bots' || activeTab === 'terminal') && (
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-0.5 shrink-0"></span>
          )}
        </button>

        {/* 5. Wallet */}
        <button
          onClick={() => onSelectTab('wallet')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer shrink-0 ${
            activeTab === 'wallet'
              ? 'text-[#00a876] dark:text-[#00d293] scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Wallet className={`w-5 h-5 shrink-0 ${activeTab === 'wallet' ? 'stroke-[2.5]' : ''}`} />
          <span className={`text-[10px] mt-0.5 whitespace-nowrap ${activeTab === 'wallet' ? 'font-black' : 'font-semibold'}`}>
            {lang === 'bn' ? 'ওয়ালেট' : 'Wallet'}
          </span>
          {activeTab === 'wallet' && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#00d293] mt-0.5 shrink-0"></span>
          )}
        </button>
      </div>
    </div>
  );
}
