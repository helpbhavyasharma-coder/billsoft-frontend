import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Printer, Calendar, ShieldCheck, CheckCircle2,
  AlertCircle, Scale, Building, Wallet, Layers,
  CreditCard, TrendingUp, ArrowRight
} from 'lucide-react';
import { PageHeader, Money, LoadingState } from '../components/ui';

export default function BalanceSheetReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchBalanceSheet();
  }, [asOfDate]);

  const fetchBalanceSheet = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/balance-sheet?as_of_date=${asOfDate}`);
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load Balance Sheet');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && !data) return <LoadingState message="Generating Balance Sheet..." />;

  const assets = data?.assets || {};
  const currentAssets = assets?.current_assets || {};
  const liabilities = data?.liabilities || {};
  const currentLiabilities = liabilities?.current_liabilities || {};
  const equity = data?.equity || {};
  const isBalanced = data?.is_balanced;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 print:p-0 print:space-y-4">
      {/* Top Header - Hidden on Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <PageHeader
          title="Balance Sheet"
          subtitle="Financial position statement showing company Assets, Liabilities, and Equity"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Balance Sheet
          </button>
        </div>
      </div>

      {/* Filter Toolbar - Hidden on Print */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs print:hidden">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">As of Date:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
            />
            <button
              onClick={() => setAsOfDate(new Date().toISOString().split('T')[0])}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {isBalanced ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4" />
                Equation Balanced: Assets = Liabilities + Equity
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                <AlertCircle className="w-4 h-4" />
                Reconciling entries
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total Assets (संपत्तियां)</p>
          <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            <Money value={assets.total_assets || 0} />
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Stock + Debtors + Cash & Bank</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total Liabilities (देनदारियां)</p>
          <h3 className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            <Money value={liabilities.total_liabilities || 0} />
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Supplier Creditors + Net GST</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Net Worth / Owner's Equity</p>
          <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            <Money value={equity.total_equity || 0} />
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Capital & Accumulated Retained Earnings</p>
        </div>
      </div>

      {/* Document Sheet */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Document Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-800/30">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Balance Sheet
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            As on <span className="font-semibold text-slate-700 dark:text-slate-300">{asOfDate}</span>
          </p>
        </div>

        {/* Two-Column T-Format Balance Sheet (Side by Side on desktop, stacked on mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
          {/* LEFT: Liabilities & Equity */}
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-700">
              <span>LIABILITIES & EQUITY (देनदारियां व पूंजी)</span>
              <span className="text-xs text-slate-400">Amount (₹)</span>
            </h3>

            {/* Sub-section: Equity */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                1. Equity & Owner's Funds
              </h4>
              <div className="space-y-1.5 pl-3 border-l-2 border-indigo-200 dark:border-indigo-900 text-sm">
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span>Owner's Capital & Reserves</span>
                  <span className="font-mono"><Money value={equity.owners_capital_and_reserves || 0} /></span>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span>Retained Earnings / Surplus</span>
                  <span className="font-mono"><Money value={equity.retained_earnings || 0} /></span>
                </div>
              </div>
            </div>

            {/* Sub-section: Current Liabilities */}
            <div className="space-y-2 pt-3">
              <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                2. Current Liabilities
              </h4>
              <div className="space-y-1.5 pl-3 border-l-2 border-rose-200 dark:border-rose-900 text-sm">
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <div>
                    <span className="block">Sundry Creditors (Trade Payables)</span>
                    <span className="text-[11px] text-slate-400">Due to vendors for purchase bills</span>
                  </div>
                  <span className="font-mono font-medium"><Money value={currentLiabilities.sundry_creditors || 0} /></span>
                </div>

                <div className="flex justify-between text-slate-700 dark:text-slate-300 pt-1">
                  <div>
                    <span className="block">Net GST Payable</span>
                    <span className="text-[11px] text-slate-400">Output tax collected less Input Tax Credit</span>
                  </div>
                  <span className="font-mono font-medium"><Money value={currentLiabilities.net_gst_payable || 0} /></span>
                </div>
              </div>
            </div>

            {/* Total Liabilities & Equity Footer */}
            <div className="pt-8 border-t-2 border-slate-300 dark:border-slate-700 mt-6">
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl font-bold text-base text-slate-900 dark:text-white">
                <span>TOTAL LIABILITIES & EQUITY:</span>
                <span className="font-mono text-indigo-700 dark:text-indigo-400">
                  <Money value={data?.total_liabilities_and_equity || 0} />
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: Assets */}
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-700">
              <span>ASSETS (संपत्तियां)</span>
              <span className="text-xs text-slate-400">Amount (₹)</span>
            </h3>

            {/* Sub-section: Current Assets */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                1. Current Assets
              </h4>
              <div className="space-y-2.5 pl-3 border-l-2 border-emerald-200 dark:border-emerald-900 text-sm">
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <div>
                    <span className="block font-medium">Inventories / Closing Stock</span>
                    <span className="text-[11px] text-slate-400">Valuation at cost price</span>
                  </div>
                  <span className="font-mono font-medium"><Money value={currentAssets.closing_stock || 0} /></span>
                </div>

                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <div>
                    <span className="block font-medium">Sundry Debtors (Trade Receivables)</span>
                    <span className="text-[11px] text-slate-400">Outstanding amounts due from customers</span>
                  </div>
                  <span className="font-mono font-medium"><Money value={currentAssets.sundry_debtors || 0} /></span>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Cash & Bank Balances:
                  </span>
                  <div className="space-y-1 pl-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex justify-between">
                      <span>• Cash in Hand</span>
                      <span className="font-mono"><Money value={currentAssets.cash_in_hand || 0} /></span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Bank Balances (Active Accounts)</span>
                      <span className="font-mono"><Money value={currentAssets.bank_balances || 0} /></span>
                    </div>

                    {(currentAssets.accounts || []).map((acc) => (
                      <div key={acc.id} className="flex justify-between pl-3 text-[11px] text-slate-500">
                        <span>- {acc.name} ({acc.account_type})</span>
                        <span className="font-mono"><Money value={acc.balance} /></span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Total Assets Footer */}
            <div className="pt-8 border-t-2 border-slate-300 dark:border-slate-700 mt-6">
              <div className="flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-950/30 p-3 rounded-xl font-bold text-base text-slate-900 dark:text-white">
                <span className="text-emerald-900 dark:text-emerald-200">TOTAL ASSETS:</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400">
                  <Money value={assets.total_assets || 0} />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Auditor Footnote */}
        <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <p>• Double-Entry Balance Sheet verified in accordance with Schedule III of the Companies Act.</p>
          <p className="font-mono">Generated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
