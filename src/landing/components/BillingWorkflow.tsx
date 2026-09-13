import React from 'react';
import { motion } from 'motion/react';
import { 
  UserCheck, 
  Barcode, 
  Calculator, 
  Send, 
  ArrowRight,
  Clock,
  Printer,
  FileSpreadsheet
} from 'lucide-react';

export const BillingWorkflow: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Select Customer / Counter',
      desc: 'Pick an existing party from your ledger or proceed with a walk-in cash customer. Their GSTIN, state code, and unpaid balance auto-load.',
      icon: <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      detailTag: 'Party Master & Khata'
    },
    {
      step: '02',
      title: 'Add Items or Scan Barcode',
      desc: 'Type product names or scan with any standard barcode scanner. System auto-fills HSN codes, rates, and checks available inventory.',
      icon: <Barcode className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      detailTag: 'Barcode & SKU Lookup'
    },
    {
      step: '03',
      title: 'Instant GST & Round-off',
      desc: 'System computes CGST & SGST (or IGST for interstate deliveries) with automated paisa round-off. No manual calculation required.',
      icon: <Calculator className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
      detailTag: 'Error-Free Tax Engine'
    },
    {
      step: '04',
      title: 'Print, Settle & WhatsApp',
      desc: 'Mark as Cash, UPI, or Credit (Khata). Print standard A4 or 3-inch thermal bills, or send an invoice PDF link directly on WhatsApp.',
      icon: <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      detailTag: 'Instant Dispatch'
    }
  ];

  return (
    <section id="workflow" className="py-8 sm:py-10 md:py-12 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-8">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            Counter Speed
          </span>
          <h2 className="mt-2 text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Generate an Error-Free GST Bill in Under 20 Seconds
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Engineered for high-footfall counters, distributors handling daily dispatches, and kirana stores during rush hours.
          </p>
        </div>

        {/* 4 Steps Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
          {steps.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.45,
                delay: index * 0.1,
                ease: [0.22, 1, 0.36, 1]
              }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="relative flex flex-col p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-emerald-500/50 dark:hover:border-emerald-500/50 hover:shadow-md transition-all"
            >
              {/* Step indicator & icon */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                  {item.icon}
                </div>
                <span className="text-base font-bold text-slate-300 dark:text-slate-700 font-mono">
                  {item.step}
                </span>
              </div>

              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-1 leading-snug">
                {item.title}
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex-1">
                {item.desc}
              </p>

              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 font-mono">
                  {item.detailTag}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Practical Workflow Highlights Banner */}
        <div className="mt-6 p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Zero Counter Bottlenecks
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Barcode scanning and keyboard shortcuts let your staff bill rapidly without slow typing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600 dark:text-slate-300 shrink-0">
            <span className="flex items-center gap-1">
              <Printer className="w-3.5 h-3.5 text-emerald-600" />
              Thermal &amp; A4 Print
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="flex items-center gap-1">
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              Direct CSV Export
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
