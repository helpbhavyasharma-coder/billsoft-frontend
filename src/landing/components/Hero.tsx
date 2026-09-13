import React from 'react';
import { 
  LogIn, 
  ArrowRight, 
  ShieldCheck, 
  FileCheck2, 
  Layers, 
  TrendingUp, 
  Smartphone,
  ChevronDown
} from 'lucide-react';
import { HeroBillingPreview } from './HeroBillingPreview';
import { scrollToTarget } from '../lib/smoothScroll';
import { Language } from '../lib/businessPresets';
import { TRANSLATIONS } from '../lib/translations';

interface HeroProps {
  onLoginClick: () => void;
  onOpenSampleInvoice: () => void;
  onWhatsAppSharePrompt: () => void;
  language?: Language;
  onPresetChange?: (presetId: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ 
  onLoginClick, 
  onOpenSampleInvoice, 
  onWhatsAppSharePrompt,
  language = 'en',
  onPresetChange
}) => {
  const isHi = language === 'hi';
  const t = TRANSLATIONS[language];

  const targetAudiencePills = isHi ? [
    'किराना व जनरल स्टोर',
    'होलसेल व व्यापारी',
    'कपड़े व गारमेंट्स',
    'दवा व मेडिकल स्टोर',
    'इलेक्ट्रिकल व हार्डवेयर',
    'डिस्ट्रीब्यूटर'
  ] : [
    'Kirana & Grocery',
    'Wholesalers & Traders',
    'Retailers & Shops',
    'Pharmacy & Medico',
    'Garments & Apparel',
    'Hardware & Electricals'
  ];

  const valuePoints = [
    {
      icon: <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
      text: isHi ? 'पक्का जीएसटी बिल व थर्मल पर्ची' : 'GST Invoices & Thermal POS Slip'
    },
    {
      icon: <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
      text: isHi ? 'बारकोड स्टॉक व लो-स्टॉक अलर्ट' : 'Stock In/Out & Low Alerts'
    },
    {
      icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
      text: isHi ? 'उधारी खाता व व्हाट्सएप तकादा' : 'Party Khata & WhatsApp Reminders'
    },
    {
      icon: <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
      text: isHi ? '5 सेकंड में काउंटर बिलिंग' : 'Fast 5-Sec Counter Billing'
    }
  ];

  return (
    <section className="relative overflow-hidden pt-6 pb-10 sm:pt-8 sm:pb-12 md:pt-10 md:pb-14 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800">
      {/* Subtle Grid Texture for Commerce Aesthetic */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 flex flex-col items-center">
        {/* Target Audience Pill Banner */}
        <div className="flex flex-wrap items-center justify-center gap-1 mb-4 text-[11px]">
          <span className="font-semibold text-slate-500 dark:text-slate-400 mr-1">
            {isHi ? 'दुकानों के लिए विशेष:' : 'Tailored for:'}
          </span>
          {targetAudiencePills.map((audience, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium text-[11px]"
            >
              {audience}
            </span>
          ))}
        </div>

        {/* Main Hero Header */}
        <div className="text-center max-w-2xl mx-auto mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold mb-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {t.heroBadge}
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
            {isHi 
              ? 'भारतीय रिटेल और व्यापार के लिए सबसे तेज जीएसटी बिलिंग' 
              : 'GST Billing & Business Management for Daily Indian Commerce'}
          </h1>

          <p className="mt-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl mx-auto">
            {t.heroDesc}
          </p>

          {/* Primary Action Row: Login & Explore CTA */}
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              id="hero-primary-login-btn"
              onClick={onLoginClick}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{t.loginToStart}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => scrollToTarget('#features', -65)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:px-4.5 sm:py-2.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <span>{t.exploreFeatures}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Bhauu Auth Assurance Note */}
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{t.authNote}</span>
          </div>
        </div>

        {/* Feature Value Badges Row */}
        <div className="w-full max-w-3xl grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {valuePoints.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs"
            >
              <div className="shrink-0 p-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50">
                {item.icon}
              </div>
              <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200 leading-tight">
                {item.text}
              </span>
            </div>
          ))}
        </div>

        {/* Realistic Interactive Billing Counter Interface Preview */}
        <div className="w-full max-w-3xl">
          <div className="text-center mb-2">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {isHi ? 'नीचे दिए गए काउंटर बिल में क्वांटिटी बदलें या अलग व्यवसाय का डेमो देखें:' : 'Try interactive counter billing preview below:'}
            </span>
          </div>
          <HeroBillingPreview 
            onOpenSampleInvoice={onOpenSampleInvoice}
            onWhatsAppSharePrompt={onWhatsAppSharePrompt}
            language={language}
            onPresetChange={onPresetChange}
          />
        </div>
      </div>
    </section>
  );
};
