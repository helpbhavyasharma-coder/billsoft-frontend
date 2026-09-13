import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Calendar, 
  Percent, 
  IndianRupee, 
  CreditCard, 
  Coins, 
  FileSpreadsheet,
  Check
} from 'lucide-react';

export const ReportsSection: React.FC = () => {
  const [period, setPeriod] = useState<'today' | 'month' | 'year'>('month');

  // Realistic business metric numbers for display
  const metrics = {
    today: {
      sales: '₹48,920',
      bills: '34 Bills',
      taxCollected: '₹4,402',
      cashUpiSplit: '62% UPI / 38% Cash',
    },
    month: {
      sales: '₹12,48,600',
      bills: '842 Bills',
      taxCollected: '₹1,12,374',
      cashUpiSplit: '58% UPI / 42% Cash',
    },
    year: {
      sales: '₹1,46,20,000',
      bills: '10,190 Bills',
      taxCollected: '₹13,15,800',
      cashUpiSplit: '54% UPI / 46% Cash',
    }
  };

  const current = metrics[period];

  const salesBars = [
    { label: 'Apr', amount: 9.8, height: '65%' },
    { label: 'May', amount: 10.4, height: '70%' },
    { label: 'Jun', amount: 11.2, height: '75%' },
    { label: 'Jul', amount: 10.8, height: '72%' },
    { label: 'Aug', amount: 12.1, height: '82%' },
    { label: 'Sep (Current)', amount: 12.5, height: '88%', active: true },
  ];

  return (
    <section id="reports" className="py-8 sm:py-10 md:py-12 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-8">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            Insights &amp; Compliance
          </span>
          <h2 className="mt-2 text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Sales Turnover &amp; GST Reporting Ready for Your CA
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Eliminate end-of-month rush. BillSoft organizes your sales, purchases, and tax slabs automatically for one-click Excel export.
          </p>
        </div>

        {/* Dashboard Preview Container */}
        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md p-3.5 sm:p-5">
          {/* Top Period Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                Turnover &amp; Tax Overview
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setPeriod('today')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    period === 'today'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod('month')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    period === 'month'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod('year')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    period === 'year'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Financial Year
                </button>
              </div>
            </div>
          </div>

          {/* Metric Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 my-3.5">
            <div className="p-2.5 sm:p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Sales Turnover
              </span>
              <div className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                {current.sales}
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 inline-block">
                Tax-Inclusive Billed
              </span>
            </div>

            <div className="p-2.5 sm:p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Invoices Generated
              </span>
              <div className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                {current.bills}
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 inline-block">
                Continuous series
              </span>
            </div>

            <div className="p-2.5 sm:p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                GST Tax Collected
              </span>
              <div className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                {current.taxCollected}
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 inline-block">
                CGST + SGST + IGST
              </span>
            </div>

            <div className="p-2.5 sm:p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Settlement Split
              </span>
              <div className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                {current.cashUpiSplit}
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 inline-block">
                Cash, UPI, Bank
              </span>
            </div>
          </div>

          {/* Realistic Bar Chart Visualizer & GST Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-center pt-1">
            {/* 6-Month Trend Bars */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-800/80 p-3 sm:p-4 rounded-lg border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Monthly Revenue (Lakhs ₹)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">FY 2026-27</span>
              </div>

              <div className="h-32 flex items-end justify-between gap-2 pt-2 px-1 border-b border-slate-200 dark:border-slate-700">
                {salesBars.map((bar, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 mb-0.5 group-hover:text-emerald-600 transition-colors">
                      ₹{bar.amount}L
                    </span>
                    <div
                      style={{ height: bar.height }}
                      className={`w-full max-w-[32px] rounded-t transition-all duration-300 ${
                        bar.active
                          ? 'bg-emerald-600 dark:bg-emerald-500'
                          : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
                      }`}
                    />
                    <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 mt-1">
                      {bar.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* GST Tax Slab Foundation */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-800/80 p-3 sm:p-4 rounded-lg border border-slate-200 dark:border-slate-700/80 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-0.5">
                GST Tax Slabs (This Month)
              </span>

              <div className="space-y-1.5 text-xs">
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-medium text-[11px] text-slate-800 dark:text-slate-200">5% Slab (Essentials)</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">₹38,400</span>
                </div>

                <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="font-medium text-[11px] text-slate-800 dark:text-slate-200">12% Slab (Packaged)</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">₹22,140</span>
                </div>

                <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="font-medium text-[11px] text-slate-800 dark:text-slate-200">18% Slab (Goods)</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">₹51,834</span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                  Excel / GSTR-1 format
                </span>
                <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  Ready for Filing
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
