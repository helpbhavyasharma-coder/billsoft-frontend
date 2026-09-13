import React from 'react';
import { motion } from 'motion/react';
import { 
  Receipt, 
  ShoppingCart, 
  Users, 
  Boxes, 
  Calculator, 
  BookOpen, 
  FileDown, 
  Share2, 
  BarChart3, 
  Smartphone, 
  ShieldCheck, 
  Coins,
  CheckCircle2
} from 'lucide-react';

export const Features: React.FC = () => {
  const featureList = [
    {
      category: 'Billing & Invoicing',
      icon: <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      title: 'GST Invoices & Sales Bills',
      description: 'Create compliant GST tax invoices and Bills of Supply in seconds. Supports HSN/SAC codes, automatic CGST/SGST/IGST tax splits, and custom sequence numbering.'
    },
    {
      category: 'Tax & Calculations',
      icon: <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      title: 'Inclusive & Exclusive GST Rates',
      description: 'Supports MRP-inclusive pricing for retail counters and tax-exclusive pricing for wholesale trades, with automatic paisa round-off calculation.'
    },
    {
      category: 'Stock & Inventory',
      icon: <Boxes className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      title: 'Live Inventory & Low Stock Alerts',
      description: 'Real-time tracking of Stock In, Stock Out, and Remaining Stock. Set custom minimum reorder thresholds so fast-moving items never run out.'
    },
    {
      category: 'Purchases & ITC',
      icon: <ShoppingCart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
      title: 'Purchase Bill Management',
      description: 'Record incoming supplier bills, purchase returns, and transport charges. Keep track of purchase rates and input tax credit (ITC) data.'
    },
    {
      category: 'Party Khata & Debt',
      icon: <BookOpen className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
      title: 'Party Ledger & Bakaya Tracking',
      description: 'Digital khata for customers and distributors. Track exact debit/credit entries, overdue duration, and maintain transparent running balances.'
    },
    {
      category: 'Cashflow & Settlements',
      icon: <Coins className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
      title: 'Payment Status Tracking',
      description: 'Tag invoices as Paid, Unpaid, or Partial. Distinguish between Cash, UPI (PhonePe, GPay, Paytm), bank transfers, and credit udhaar.'
    },
    {
      category: 'Document Dispatch',
      icon: <FileDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
      title: 'PDF Generation & Print Layouts',
      description: 'Generate clean standard A4 invoices for filing or compact 2"/3" thermal slips for retail counters with store name and GSTIN.'
    },
    {
      category: 'Customer Communication',
      icon: <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      title: 'WhatsApp Invoicing & Reminders',
      description: 'Send invoice PDF links and polite payment reminder notes directly to customer WhatsApp numbers without saving numbers.'
    },
    {
      category: 'Business Intelligence',
      icon: <BarChart3 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />,
      title: 'Sales Turnover & CA Reports',
      description: 'Daily collection figures, monthly sales turnover, top-selling items, and consolidated tax figures to assist your accountant with GSTR filing.'
    },
    {
      category: 'Everyday Practicality',
      icon: <Smartphone className="w-4 h-4 text-orange-600 dark:text-orange-400" />,
      title: 'Mobile-Friendly Billing Workflow',
      description: 'Optimized touch-friendly UI designed for counter tablets, POS terminals, and smartphones so billing never stops when away from desk.'
    },
    {
      category: 'Party Master',
      icon: <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      title: 'Customer & Supplier Directory',
      description: 'Maintain party details with GSTIN, state code, contact numbers, shipping addresses, credit limits, and custom notes in one place.'
    },
    {
      category: 'Enterprise Protection',
      icon: <ShieldCheck className="w-4 h-4 text-slate-700 dark:text-slate-300" />,
      title: 'Bhauu Auth Managed Security',
      description: 'Owner-controlled single sign-on system safeguarding confidential business sales records, tax information, customer contacts, and logs.'
    }
  ];

  return (
    <section id="features" className="py-8 sm:py-10 md:py-12 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center mb-8">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            Core Capabilities
          </span>
          <h2 className="mt-2 text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Designed for Real Daily Store Operations
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Every feature addresses genuine business bottlenecks — eliminating manual paper registers, calculation errors, and lost payment records.
          </p>
        </div>

        {/* Feature Grid with clean, compact cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
          {featureList.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{
                duration: 0.45,
                delay: (idx % 3) * 0.07,
                ease: [0.22, 1, 0.36, 1]
              }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="flex flex-col p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/40 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  {feature.icon}
                </div>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {feature.category}
                </span>
              </div>

              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-1.5">
                {feature.title}
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex-1">
                {feature.description}
              </p>

              <div className="mt-3 pt-2 border-t border-slate-200/70 dark:border-slate-800/80 flex items-center text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3 mr-1 shrink-0" />
                <span>Standard Functionality</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
