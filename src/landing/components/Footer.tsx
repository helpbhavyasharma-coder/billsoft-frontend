import React from 'react';
import { ReceiptText, ShieldCheck } from 'lucide-react';
import { scrollToTarget } from '../lib/smoothScroll';

interface FooterProps {
  onLoginClick: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onLoginClick }) => {
  const currentYear = 2026;

  const handleLinkClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    scrollToTarget(href, -65);
  };

  return (
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {/* Brand & Purpose */}
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                <ReceiptText className="w-3.5 h-3.5" />
              </div>
              <span className="text-base font-bold text-white tracking-tight">
                Bill<span className="text-emerald-400">Soft</span>
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                GST Ready
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              GST Billing &amp; Business Management Software built for kirana stores, wholesalers, retailers, distributors, traders, accountants, and shop owners.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Identity &amp; Login Security managed via Bhauu Auth</span>
            </div>
          </div>

          {/* Quick Platform Links */}
          <div className="space-y-1.5 text-xs">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
              Platform Features
            </h4>
            <ul className="space-y-1 text-[11px]">
              <li><button onClick={(e) => handleLinkClick(e, '#features')} className="hover:text-emerald-400 transition-colors cursor-pointer text-left">GST Tax Invoices</button></li>
              <li><button onClick={(e) => handleLinkClick(e, '#gst-calculator')} className="hover:text-emerald-400 transition-colors cursor-pointer text-left">GST Calculator &amp; HSN</button></li>
              <li><button onClick={(e) => handleLinkClick(e, '#workflow')} className="hover:text-emerald-400 transition-colors cursor-pointer text-left">Counter Billing Workflow</button></li>
              <li><button onClick={(e) => handleLinkClick(e, '#inventory')} className="hover:text-emerald-400 transition-colors cursor-pointer text-left">Stock Management</button></li>
              <li><button onClick={(e) => handleLinkClick(e, '#ledger')} className="hover:text-emerald-400 transition-colors cursor-pointer text-left">Customer Khata</button></li>
              <li><button onClick={(e) => handleLinkClick(e, '#reports')} className="hover:text-emerald-400 transition-colors cursor-pointer text-left">Sales &amp; Tax Reports</button></li>
              <li><button onClick={(e) => handleLinkClick(e, '#faq')} className="hover:text-emerald-400 transition-colors cursor-pointer text-left">Vyapari FAQ</button></li>
            </ul>
          </div>

          {/* Business & Access */}
          <div className="space-y-1.5 text-xs">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
              Account Access
            </h4>
            <p className="text-slate-400 text-[11px]">
              Access your store counter dashboard with your Bhauu Auth credentials.
            </p>
            <div className="pt-1 flex flex-col gap-2">
              <button
                type="button"
                id="footer-login-btn"
                onClick={onLoginClick}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors cursor-pointer text-xs"
              >
                <span>Login to BillSoft</span>
              </button>
            </div>
          </div>
        </div>

        {/* GST Compliance Note & Legal bar */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-400">
          <div>
            © {currentYear} BillSoft. GST Compliant Invoicing &amp; Business Management.
          </div>
          <div className="flex items-center gap-3">
            <span>CGST / SGST / IGST</span>
            <span>•</span>
            <span>Thermal &amp; A4 Formats</span>
            <span>•</span>
            <span className="text-emerald-400">100% Tax Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
