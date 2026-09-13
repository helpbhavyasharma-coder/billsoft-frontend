import React, { useState } from 'react';
import { 
  ReceiptText, 
  Sun, 
  Moon, 
  Menu, 
  X, 
  LogIn, 
  ArrowRight,
  Languages
} from 'lucide-react';
import { scrollToTarget } from '../lib/smoothScroll';
import { Language } from '../lib/businessPresets';
import { TRANSLATIONS } from '../lib/translations';

interface NavbarProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  onLoginClick: () => void;
  language: Language;
  onToggleLanguage: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  darkMode, 
  onToggleTheme, 
  onLoginClick,
  language,
  onToggleLanguage
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = TRANSLATIONS[language];

  const navLinks = [
    { name: t.features, href: '#features' },
    { name: t.workflow, href: '#workflow' },
    { name: t.calculator, href: '#gst-calculator' },
    { name: t.inventory, href: '#inventory' },
    { name: t.khata, href: '#ledger' },
    { name: t.reports, href: '#reports' },
    { name: t.faq, href: '#faq' },
    { name: t.security, href: '#security' },
  ];

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false);
    scrollToTarget(href, -65);
  };

  const handleBrandClick = (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToTarget(0, 0);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b backdrop-blur-md transition-colors duration-200 bg-white/95 border-slate-200 text-slate-900 dark:bg-slate-950/95 dark:border-slate-800 dark:text-slate-100">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-13 sm:h-14 flex items-center justify-between">
        {/* Brand Identity */}
        <a 
          href="#" 
          onClick={handleBrandClick}
          className="flex items-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg p-0.5 cursor-pointer"
          id="brand-logo"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:bg-emerald-700 transition-colors">
            <ReceiptText className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Bill<span className="text-emerald-600 dark:text-emerald-400">Soft</span>
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hidden min-[400px]:inline-block">
                {t.gstReady}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:inline-block leading-none">
              {t.subBrand}
            </span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1" aria-label="Main Navigation">
          {navLinks.map((link) => (
            <button
              key={link.name}
              onClick={() => handleNavClick(link.href)}
              className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            >
              {link.name}
            </button>
          ))}
        </nav>

        {/* Right Action Bar: Language Switcher, Theme Switch & Login CTA */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Hindi / English Language Switcher Button */}
          <button
            type="button"
            id="language-toggle-btn"
            onClick={onToggleLanguage}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            aria-label="Toggle language between English and Hindi"
            title={language === 'en' ? 'Switch to Hindi (हिंदी)' : 'Switch to English'}
          >
            <Languages className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium text-[11px]">
              {language === 'en' ? 'हिंदी' : 'English'}
            </span>
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            id="theme-toggle-btn"
            onClick={onToggleTheme}
            className="p-1.5 sm:p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer flex items-center gap-1 text-xs font-medium"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xl:inline text-[11px] text-slate-300">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden xl:inline text-[11px] text-slate-600">Dark</span>
              </>
            )}
          </button>

          {/* Primary Login Button */}
          <button
            type="button"
            id="header-login-btn"
            onClick={onLoginClick}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-1.5 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-lg shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{t.login}</span>
            <ArrowRight className="w-3 h-3 hidden sm:inline-block opacity-75" />
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            id="mobile-menu-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 focus:outline-none cursor-pointer"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div 
          id="mobile-navigation-drawer"
          className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 pt-2 pb-4 space-y-1.5 shadow-lg"
        >
          <div className="flex flex-col space-y-0.5">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => handleNavClick(link.href)}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-md transition-colors cursor-pointer"
              >
                {link.name}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onToggleLanguage}
              className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 py-1.5 px-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Languages className="w-4 h-4 text-emerald-600" />
              <span>Language: <strong>{language === 'en' ? 'English (Switch to हिंदी)' : 'हिंदी (Switch to Eng)'}</strong></span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
