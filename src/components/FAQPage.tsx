import React from 'react';
import { FAQAccordion } from './FAQAccordion';
import { HelpCircle, Sparkles, MessageCircle, ArrowLeft, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface FAQPageProps {
  lang?: 'bn' | 'en';
  onNavigateToPlans: () => void;
  onNavigateToDeploy: () => void;
  onNavigateToSupport: () => void;
  onNavigateToGuide: () => void;
}

export function FAQPage({
  lang = 'bn',
  onNavigateToPlans,
  onNavigateToDeploy,
  onNavigateToSupport,
  onNavigateToGuide
}: FAQPageProps) {
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1424] via-[#0f1b33] to-[#14233e] border border-cyan-500/30 p-6 sm:p-9 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-black tracking-wide uppercase">
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lang === 'bn' ? 'সচরাচর জিজ্ঞাসিত প্রশ্নোত্তর' : 'Frequently Asked Questions'}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              {lang === 'bn' ? 'আপনার প্রয়োজনীয় সকল প্রশ্নের উত্তর (FAQ)' : 'All Your Questions Answered (FAQ)'}
            </h1>

            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              {lang === 'bn'
                ? 'হোস্টিং কেনা, বিকাশ/নগদ ডিপোজিট, বট চালানো ও ওয়েবসাইট হোস্ট করা সম্পর্কিত সাধারণ প্রশ্নগুলোর বিস্তারিত সমাধান এখানে পেয়ে যাবেন।'
                : 'Find answers about purchasing hosting, deposits, running bots, and hosting websites.'}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <button
              type="button"
              onClick={onNavigateToGuide}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition cursor-pointer"
            >
              <span>{lang === 'bn' ? '🎬 ভিডিও টিউটোরিয়াল পেজ' : 'Watch Video Guide'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Accordion List */}
      <FAQAccordion
        lang={lang}
        onNavigateToDeploy={onNavigateToDeploy}
        onNavigateToSupport={onNavigateToSupport}
        defaultOpenFirst={true}
      />

      {/* Support Box */}
      <div className="p-6 rounded-3xl bg-[#0b1222] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              {lang === 'bn' ? 'আপনার প্রশ্নের উত্তর খুঁজে পাননি?' : 'Did not find what you were looking for?'}
            </h4>
            <p className="text-xs text-slate-400">
              {lang === 'bn' ? 'আমাদের ২৪/৭ লাইভ সাপোর্ট টেলিগ্রাম ও হেল্পডেস্ক টিম সর্বদা প্রস্তুত।' : 'Our 24/7 support team is always ready to assist.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateToSupport}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
        >
          {lang === 'bn' ? 'সাপোর্টে যোগাযোগ করুন' : 'Contact Support'}
        </button>
      </div>
    </div>
  );
}
