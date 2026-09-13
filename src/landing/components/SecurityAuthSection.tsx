import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  UserCheck2, 
  Server, 
  Clock, 
  Smartphone,
  EyeOff
} from 'lucide-react';

interface SecurityAuthSectionProps {
  onLoginClick: () => void;
}

export const SecurityAuthSection: React.FC<SecurityAuthSectionProps> = ({ onLoginClick }) => {
  const securityPillars = [
    {
      icon: <KeyRound className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      title: 'Bhauu Auth Managed Access',
      desc: 'Centralized, hardened authentication handling store logins, secure session lifecycles, and cryptographic token verification with zero password exposure.'
    },
    {
      icon: <UserCheck2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      title: 'Owner vs Counter Operator Roles',
      desc: 'Let cashiers bill rapidly while preventing unauthorized changes to historical purchase rates, deleted invoices, or backdated ledger entries.'
    },
    {
      icon: <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
      title: 'Isolated Business Data',
      desc: 'Your store records, party lists, sales revenue, and stock figures are stored in strict encrypted isolation. No third-party data scraping or ads.'
    },
    {
      icon: <Server className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      title: 'Automatic Cloud Data Redundancy',
      desc: 'Continuous real-time synchronization protects against phone breakage, counter PC hardware crashes, or physical store accidents.'
    }
  ];

  return (
    <section id="security" className="py-8 sm:py-10 md:py-12 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-8">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            Authentication &amp; Control
          </span>
          <h2 className="mt-2 text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Enterprise Protection Powered by Bhauu Auth
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Your billing records are your business lifeline. BillSoft pairs daily counter speed with robust authentication managed via Bhauu Auth.
          </p>
        </div>

        {/* 4 Security Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-w-3xl mx-auto">
          {securityPillars.map((pillar, idx) => (
            <div
              key={idx}
              className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  {pillar.icon}
                </div>
                <h3 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">
                  {pillar.title}
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {pillar.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Architecture Note */}
        <div className="mt-6 p-3 sm:p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[11px] sm:text-xs">
              BillSoft accounts authenticate directly through your configured <strong>Bhauu Auth SSO</strong> provider.
            </span>
          </div>

          <button
            type="button"
            onClick={onLoginClick}
            className="shrink-0 font-semibold text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline underline-offset-4 cursor-pointer"
          >
            Access Login Portal →
          </button>
        </div>
      </div>
    </section>
  );
};
