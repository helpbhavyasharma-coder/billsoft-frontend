import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { Language } from '../lib/businessPresets';

interface FAQItem {
  qEn: string;
  qHi: string;
  aEn: string;
  aHi: string;
  category: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    category: 'Hardware & Printers',
    qEn: 'Can I connect my existing Thermal POS printer or Barcode Scanner?',
    qHi: 'क्या मैं अपना मौजूदा थर्मल पीओएस प्रिंटर या बारकोड स्कैनर जोड़ सकता हूँ?',
    aEn: 'Yes! BillSoft supports all standard 2-inch (58mm) and 3-inch (80mm) ESC/POS USB, Bluetooth, and Wi-Fi thermal receipt printers (TVS, Epson, NGX, Everycom). Plug-and-play USB & wireless laser barcode scanners work natively without installing special drivers.',
    aHi: 'हाँ! बिलसॉफ्ट सभी सामान्य 2-इंच (58mm) और 3-इंच (80mm) थर्मल प्रिंटर (TVS, Epson, NGX) और किसी भी यूएसबी या वायरलेस बारकोड स्कैनर को बिना किसी ड्राइवर की परेशानी के सीधे सपोर्ट करता है।'
  },
  {
    category: 'Internet & Offline',
    qEn: 'Does counter billing work if internet connection drops temporarily?',
    qHi: 'क्या इंटरनेट बंद या धीमा होने पर भी काउंटर बिलिंग चालू रहेगी?',
    aEn: 'Yes. BillSoft features local client caching that allows you to continue punching counter bills, scanning barcodes, and printing receipts even during brief network fluctuations. Once internet restores, all bills automatically sync.',
    aHi: 'हाँ। बिलसॉफ्ट में लोकल कैशिंग सपोर्ट है जिससे अगर दुकान पर थोड़ी देर इंटरनेट चला भी जाए, तो भी आप ग्राहकों को बिल बनाकर रसीद प्रिंट करके दे सकते हैं। नेट आते ही डेटा अपने आप सुरक्षित हो जाता है।'
  },
  {
    category: 'Khata & Migration',
    qEn: 'How do I transfer my old customer balance (Udhaari/Khata) into BillSoft?',
    qHi: 'मैं अपने ग्राहकों का पुराना बकाया (उधारी खाता) बिलसॉफ्ट में कैसे ला सकता हूँ?',
    aEn: 'You can either do a 1-click bulk import from your existing Excel or CSV khata spreadsheet, or enter opening balances directly when adding customers. Each customer gets automated WhatsApp payment reminders with your store UPI QR code.',
    aHi: 'आप अपनी एक्सेल (Excel) या पुरानी डायरी से 1-क्लिक में सभी ग्राहकों का नाम, फोन और पुराना बकाया (Opening Balance) अपलोड कर सकते हैं। इसके बाद हर ग्राहक को बकाया का व्हाट्सएप मैसेज व यूपीआई क्यूआर भेजा जा सकता है।'
  },
  {
    category: 'GST & Compliance',
    qEn: 'Does BillSoft generate GSTR-1, GSTR-3B summary and e-Way bills?',
    qHi: 'क्या बिलसॉफ्ट से GSTR-1, GSTR-3B और टैक्स रिपोर्ट मिल जाती है?',
    aEn: 'Yes. Every invoice automatically populates B2B (registered with GSTIN) and B2C (unregistered) breakdowns, HSN-wise tax summaries, and monthly totals ready to export for your CA or directly upload to the GST portal.',
    aHi: 'हाँ। हर बिल के साथ B2B (जीएसटी नंबर वाले) और B2C (खुदरा ग्राहक) का अलग-अलग HSN-wise टैक्स हिसाब बनता है, जिसे आप एक्सेल में डाउनलोड करके सीधे अपने सीए (CA) को दे सकते हैं।'
  },
  {
    category: 'Security & Auth',
    qEn: 'How does Bhauu Auth protect my store sales and cash registers?',
    qHi: 'भाऊ ऑथ (Bhauu Auth) मेरे दुकान के कैश और बिलिंग डेटा को कैसे सुरक्षित रखता है?',
    aEn: 'Bhauu Auth provides enterprise Single Sign-On (SSO) with encrypted sessions. You can set staff-level role permissions (e.g. Counter Cashier cannot delete bills or view profit margins; only the Owner has full admin access).',
    aHi: 'भाऊ ऑथ आपके पूरे स्टोर के डेटा को एन्क्रिप्टेड रखता है। आप स्टाफ के लिए अलग भूमिकाएं सेट कर सकते हैं—जैसे सेल्समैन सिर्फ बिल बना सके, पुराना बिल डिलीट न कर सके या मुनाफा न देख सके; केवल मालिक को पूरा अधिकार रहता है।'
  }
];

interface FAQSectionProps {
  language: Language;
}

export const FAQSection: React.FC<FAQSectionProps> = ({ language }) => {
  const isHi = language === 'hi';
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-8 sm:py-10 md:py-12 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-8">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            {isHi ? 'व्यापारियों के सवाल-जवाब' : 'Frequently Asked Questions'}
          </span>
          <h2 className="mt-2 text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {isHi ? 'दुकानदारों द्वारा अक्सर पूछे जाने वाले जरूरी सवाल' : 'Everything Vyaparis Ask About BillSoft'}
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {isHi 
              ? 'प्रिंटर, उधारी ट्रांसफर, बिना नेट बिलिंग और सुरक्षा से जुड़े सभी जवाब सीधे शब्दों में।' 
              : 'Clear answers on hardware compatibility, offline resilience, ledger migration, and GST filings.'}
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-2.5">
          {FAQ_DATA.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 transition-all overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(idx)}
                  className="w-full px-4 py-3.5 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded">
                      0{idx + 1}
                    </span>
                    <span>{isHi ? item.qHi : item.qEn}</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                      isOpen ? 'transform rotate-180 text-emerald-600' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 pb-3.5 pt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-950/40">
                    <p>{isHi ? item.aHi : item.aEn}</p>
                    <span className="inline-block mt-2 text-[10px] text-slate-400 font-medium">
                      Category: {item.category}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
