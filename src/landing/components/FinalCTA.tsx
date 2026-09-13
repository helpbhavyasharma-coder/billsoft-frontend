import React from 'react';
import { LogIn, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface FinalCTAProps {
  onLoginClick: () => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onLoginClick }) => {
  return (
    <section className="py-8 sm:py-10 md:py-12 bg-gradient-to-b from-white to-slate-100 dark:from-slate-950 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 text-center">
        <div className="p-5 sm:p-7 md:p-8 rounded-2xl bg-slate-900 dark:bg-slate-900 border border-slate-800 text-white shadow-xl relative overflow-hidden">
          {/* Subtle Background Radial Accent */}
          <div className="absolute -right-20 -bottom-20 w-60 h-60 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -top-20 w-60 h-60 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-xl mx-auto">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[10px] font-semibold mb-3">
              <ShieldCheck className="w-3 h-3" />
              Direct Sign-In with Bhauu Auth
            </span>

            <h2 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-white leading-tight">
              Ready to Simplify Your Daily GST Billing &amp; Business Khata?
            </h2>

            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              Login to access your store inventory, print professional GST invoices, collect pending bakaya, and track daily turnover.
            </p>

            {/* Primary Login Action Button */}
            <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                id="bottom-cta-login-btn"
                onClick={onLoginClick}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 rounded-lg shadow-md shadow-emerald-400/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-slate-950" />
                <span>Login to BillSoft</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
              </button>
            </div>

            {/* Practical Checklist */}
            <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                GST Compliant Invoicing
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Live Stock &amp; Khata
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Bhauu Auth SSO
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
