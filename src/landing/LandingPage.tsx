import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import hotToast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
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

type BhauuAuthConfig = {
  enabled: boolean;
  clientId: string;
  redirectUri: string;
};

const BHAUU_AUTH_ORIGIN = 'https://auth.bhauu.online';
const BHAUU_AUTH_SDK_URL = `${BHAUU_AUTH_ORIGIN}/sdk/bhauu-auth.js?v=20260914-originfix`;

declare global {
  interface Window {
    BhauuAuth?: {
      login(input: {
        clientId: string;
        redirectUri: string;
        mode?: 'popup' | 'redirect';
      }): Promise<{ code?: string; state?: string; user?: unknown }>;
      buildAuthorizeUrl(input: {
        clientId: string;
        redirectUri: string;
        gatewayUrl?: string;
        scope?: string;
        popup?: boolean;
        state?: string;
        nonce?: string;
        codeVerifier?: string;
      }): Promise<string>;
    };
    __bhauuPopupCompleted?: boolean;
    __bhauuAuthSdkLoading?: Promise<void>;
  }
}

const fallbackAuthConfig: BhauuAuthConfig = {
  enabled: true,
  clientId: 'bag_live_khifglzxWlT-by47',
  redirectUri: 'https://softbill.bhauu.online/auth/callback',
};

function createAuthState() {
  return crypto.randomUUID?.().replace(/-/g, '') || `${Date.now()}${Math.random()}`.replace(/\D/g, '');
}

function popupResultKey(state: string) {
  return `bhauu_auth_popup_result_${state}`;
}

function loadBhauuAuthSdk() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Browser unavailable'));
  if (window.BhauuAuth?.login) return Promise.resolve();
  if (window.__bhauuAuthSdkLoading) return window.__bhauuAuthSdkLoading;

  window.__bhauuAuthSdkLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-bhauu-auth-sdk="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Bhauu Auth SDK load failed')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = BHAUU_AUTH_SDK_URL;
    script.async = true;
    script.dataset.bhauuAuthSdk = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Bhauu Auth SDK load failed'));
    document.head.appendChild(script);
  });

  return window.__bhauuAuthSdkLoading;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { completeBhauuLogin } = useAuth();
  const [authConfig, setAuthConfig] = useState<BhauuAuthConfig>(fallbackAuthConfig);
  const [loginBusy, setLoginBusy] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    api.get('/auth/bhauu/config')
      .then(({ data }) => {
        if (!cancelled && data?.success) {
          setAuthConfig({
            enabled: Boolean(data.enabled),
            clientId: data.clientId || fallbackAuthConfig.clientId,
            redirectUri: data.redirectUri || fallbackAuthConfig.redirectUri,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setAuthConfig(fallbackAuthConfig);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    loadBhauuAuthSdk().catch(() => {
      window.__bhauuAuthSdkLoading = undefined;
    });
  }, []);

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

  const handleLogin = async () => {
    if (loginBusy) return;
    if (!authConfig.enabled || !authConfig.clientId) {
      hotToast.error('Bhauu Auth abhi configure nahi hua hai.');
      return;
    }

    setLoginBusy(true);
    window.__bhauuPopupCompleted = false;
    const popup = window.open(
      'about:blank',
      'bhauu_auth_login',
      'popup=yes,width=480,height=640,resizable=yes,scrollbars=yes',
    );

    if (!popup) {
      hotToast.error('Popup blocked. Browser me popups allow karke dobara try karein.');
      setLoginBusy(false);
      return;
    }

    popup.document.write('<!doctype html><title>Bhauu Auth</title><body style="font-family:system-ui;margin:0;display:grid;place-items:center;min-height:100vh;color:#0f172a;background:#f8fafc"><div>Opening Bhauu Auth...</div></body>');

    try {
      await loadBhauuAuthSdk();
      if (!window.BhauuAuth?.buildAuthorizeUrl) {
        throw new Error('Bhauu Auth SDK unavailable');
      }

      const state = createAuthState();
      const codeVerifier = createAuthState() + createAuthState();
      const redirectUri = authConfig.redirectUri || `${window.location.origin}/auth/callback`;
      const rememberedStates = JSON.parse(sessionStorage.getItem('bhauu_auth_states') || '[]');
      const nextStates = Array.isArray(rememberedStates)
        ? [...rememberedStates.filter(Boolean).slice(-4), state]
        : [state];
      sessionStorage.setItem('bhauu_auth_state', state);
      sessionStorage.setItem('bhauu_auth_states', JSON.stringify(nextStates));
      sessionStorage.setItem('bhauu_auth_code_verifier', codeVerifier);
      const result = await new Promise<{ code?: string; state?: string; codeVerifier?: string }>((resolve, reject) => {
        let timeoutId = 0;
        let popupCheckId = 0;
        let storageCheckId = 0;
        let popupCloseGraceId = 0;
        let popupClosedSeen = false;
        let popupCompleted = false;
        const storageKey = popupResultKey(state);
        const finishFromPayload = (payload: { code?: string; state?: string; error?: string | null }) => {
          if (payload.state !== state) return false;
          popupCompleted = true;
          window.__bhauuPopupCompleted = true;
          cleanup();
          localStorage.removeItem(storageKey);
          if (payload.error) {
            reject(new Error(String(payload.error)));
            return true;
          }
          resolve({ code: payload.code, state, codeVerifier });
          return true;
        };
        const readStoredResult = () => {
          const raw = localStorage.getItem(storageKey);
          if (!raw) return false;
          try {
            return finishFromPayload(JSON.parse(raw));
          } catch {
            localStorage.removeItem(storageKey);
            return false;
          }
        };
        const cleanup = () => {
          window.removeEventListener('message', handleMessage);
          window.removeEventListener('storage', handleStorage);
          window.clearTimeout(timeoutId);
          window.clearTimeout(popupCloseGraceId);
          window.clearInterval(popupCheckId);
          window.clearInterval(storageCheckId);
        };
        const handleMessage = (event: MessageEvent) => {
          const data = event.data || {};
          const allowedOrigins = [BHAUU_AUTH_ORIGIN, window.location.origin];
          const isBhauuPopupMessage = data.source === 'bhauu-auth' || data.source === 'billsoft-bhauu-auth';
          if (!allowedOrigins.includes(event.origin) || !isBhauuPopupMessage || data.state !== state) return;
          finishFromPayload({ code: data.code, state: data.state, error: data.error });
        };
        const handleStorage = (event: StorageEvent) => {
          if (event.key !== storageKey || !event.newValue) return;
          try {
            finishFromPayload(JSON.parse(event.newValue));
          } catch {
            localStorage.removeItem(storageKey);
          }
        };
        window.addEventListener('message', handleMessage);
        window.addEventListener('storage', handleStorage);
        timeoutId = window.setTimeout(() => {
          cleanup();
          reject(new Error('Bhauu Auth login timeout. Please try again.'));
        }, 180000);
        popupCheckId = window.setInterval(() => {
          if (readStoredResult()) return;
          if (popup.closed && !popupClosedSeen) {
            popupClosedSeen = true;
            popupCloseGraceId = window.setTimeout(() => {
              if (popupCompleted || window.__bhauuPopupCompleted || readStoredResult()) return;
              cleanup();
              reject(new Error('Login popup band ho gaya. Dobara Login dabayein.'));
            }, 1200);
          }
        }, 700);
        storageCheckId = window.setInterval(readStoredResult, 350);

        window.BhauuAuth!.buildAuthorizeUrl({
          clientId: authConfig.clientId,
          redirectUri,
          gatewayUrl: BHAUU_AUTH_ORIGIN,
          scope: 'profile email',
          popup: true,
          state,
          codeVerifier,
        })
          .then((authUrl) => {
            popup.location.href = authUrl;
          })
          .catch((error) => {
            cleanup();
            reject(error);
          });
      });

      if (!result?.code) {
        throw new Error('Bhauu Auth did not return a login code');
      }

      const data = await completeBhauuLogin(result.code, result.state, result.codeVerifier);
      sessionStorage.removeItem('bhauu_auth_state');
      sessionStorage.removeItem('bhauu_auth_code_verifier');
      hotToast.success('Bhauu Auth se login ho gaya');
      const target = data.isAdmin ? '/admin' : data.hasCompany ? '/dashboard' : '/company/setup';
      navigate(target, { replace: true });
    } catch (error) {
      if (!popup.closed) popup.close();
      const message = error instanceof Error ? error.message : 'Bhauu Auth login failed';
      hotToast.error(message);
    } finally {
      setLoginBusy(false);
    }
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
