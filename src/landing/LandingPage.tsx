import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { BillingWorkflow } from './components/BillingWorkflow';
import { GstCalculator } from './components/GstCalculator';
import { InventorySection } from './components/InventorySection';
import { LedgerSection } from './components/LedgerSection';
import { ReportsSection } from './components/ReportsSection';
import { FAQSection } from './components/FAQSection';
import { SecurityAuthSection } from './components/SecurityAuthSection';
import { FinalCTA } from './components/FinalCTA';
import { Footer } from './components/Footer';
import { SampleInvoiceModal } from './components/SampleInvoiceModal';
import { NotificationToast, ToastData } from './components/NotificationToast';
import { ScrollControls } from './components/ScrollControls';
import { ScrollReveal } from './components/ScrollReveal';
import { initSmoothScroll } from './lib/smoothScroll';
import { Language } from './lib/businessPresets';

export default function LandingPage() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('billsoft_theme');
      if (savedTheme) return savedTheme === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('billsoft_lang');
      if (savedLang === 'hi' || savedLang === 'en') return savedLang;
    }
    return 'en';
  });

  const [selectedPresetId, setSelectedPresetId] = useState<string>('kirana');
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  // Initialize ultra-smooth Lenis inertial scroll
  useEffect(() => {
    const cleanupLenis = initSmoothScroll();
    return () => {
      cleanupLenis();
    };
  }, []);

  // Sync dark mode class on html and body elements
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('billsoft_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('billsoft_theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'hi' : 'en';
    setLanguage(nextLang);
    localStorage.setItem('billsoft_lang', nextLang);
  };

  const handleLogin = () => {
    window.location.href = '/auth/login';
  };

  const handleOpenSampleInvoice = () => {
    setInvoiceModalOpen(true);
  };

  const handleWhatsAppSharePrompt = () => {
    setToast({
      id: String(Date.now()),
      type: 'whatsapp',
      title: language === 'hi' ? 'व्हाट्सएप बिल भेजा गया' : 'WhatsApp Share Dispatched',
      message: language === 'hi'
        ? 'बिलसॉफ्ट ने पक्का जीएसटी टैक्स इनवॉइस लिंक और सारांश सीधे ग्राहक के व्हाट्सएप पर भेजने हेतु तैयार कर दिया।'
        : 'BillSoft generated the official GST tax invoice PDF link and pre-composed billing summary for one-click WhatsApp customer dispatch.'
    });
  };

  const handleWhatsAppReminder = (partyName: string, amount: number) => {
    setToast({
      id: String(Date.now()),
      type: 'whatsapp',
      title: language === 'hi' ? `${partyName} को तकादा भेजा गया` : `Reminder Sent to ${partyName}`,
      message: language === 'hi'
        ? `₹${amount.toLocaleString('en-IN')} के बकाये का विनम्र व्हाट्सएप तकादा व यूपीआई क्यूआर तैयार हो गया।`
        : `Friendly payment reminder for pending bakaya of ₹${amount.toLocaleString('en-IN')} prepared for WhatsApp dispatch.`
    });
  };

  return (
    <div className={`${darkMode ? 'dark ' : ''}min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 text-sm`}>
      {/* Visual Scroll Progress & Floating Controls */}
      <ScrollControls />

      {/* Top Fixed / Sticky Navigation */}
      <Navbar 
        darkMode={darkMode} 
        onToggleTheme={toggleTheme} 
        onLoginClick={handleLogin}
        language={language}
        onToggleLanguage={toggleLanguage}
      />

      {/* Main Landing Page Content with Ultra-Smooth Scroll Motion */}
      <main className="flex-1 flex flex-col">
        {/* 1. Hero Section with Interactive Live Billing Preview */}
        <ScrollReveal direction="up" delay={0.05}>
          <Hero 
            onLoginClick={handleLogin}
            onOpenSampleInvoice={handleOpenSampleInvoice}
            onWhatsAppSharePrompt={handleWhatsAppSharePrompt}
            language={language}
            onPresetChange={setSelectedPresetId}
          />
        </ScrollReveal>

        {/* 2. Live GST Calculator & HSN Code Finder Widget */}
        <ScrollReveal direction="up" delay={0.05}>
          <GstCalculator language={language} />
        </ScrollReveal>

        {/* 3. Key Features Overview Grid */}
        <ScrollReveal direction="up" delay={0.05}>
          <Features />
        </ScrollReveal>

        {/* 4. 4-Step Rapid Billing Workflow */}
        <ScrollReveal direction="up" delay={0.05}>
          <BillingWorkflow />
        </ScrollReveal>

        {/* 5. Live Inventory & Purchase Management */}
        <ScrollReveal direction="up" delay={0.05}>
          <InventorySection />
        </ScrollReveal>

        {/* 6. Outstanding (Bakaya) & Party Ledger Tracking */}
        <ScrollReveal direction="up" delay={0.05}>
          <LedgerSection 
            onWhatsAppReminderClick={handleWhatsAppReminder}
          />
        </ScrollReveal>

        {/* 7. Reports & Sales Turnover Dashboard */}
        <ScrollReveal direction="up" delay={0.05}>
          <ReportsSection />
        </ScrollReveal>

        {/* 8. Frequently Asked Questions (FAQ) Section */}
        <ScrollReveal direction="up" delay={0.05}>
          <FAQSection language={language} />
        </ScrollReveal>

        {/* 9. Security & Bhauu Auth Single Sign-on Protection */}
        <ScrollReveal direction="up" delay={0.05}>
          <SecurityAuthSection 
            onLoginClick={handleLogin}
          />
        </ScrollReveal>

        {/* 10. Final Call to Action with Login Button */}
        <ScrollReveal direction="up" delay={0.05}>
          <FinalCTA 
            onLoginClick={handleLogin}
          />
        </ScrollReveal>
      </main>

      {/* Honest Business Footer */}
      <Footer 
        onLoginClick={handleLogin}
      />

      {/* Realistic Printable Sample GST Invoice Modal with A4 & 3-Inch Thermal Switcher */}
      <SampleInvoiceModal 
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        language={language}
        selectedPresetId={selectedPresetId}
      />

      {/* Non-intrusive Toast for Action Feedback */}
      <NotificationToast 
        toast={toast}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
