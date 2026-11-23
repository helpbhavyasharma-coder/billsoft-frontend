import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Printer, Calendar, TrendingUp, TrendingDown,
  DollarSign, ShoppingBag, ArrowRight, PieChart,
  Layers, CheckCircle2, AlertCircle, FileText
} from 'lucide-react';
import { PageHeader, Money, LoadingState } from '../components/ui';

export default function ProfitLossReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Financial Year / Date Range
  const currentYear = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const [year, setYear] = useState(currentYear);
  const [fromDate, setFromDate] = useState(`${currentYear}-04-01`);
  const [toDate, setToDate] = useState(`${currentYear + 1}-03-31`);

  useEffect(() => {
    fetchReport();
  }, [fromDate, toDate]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from_date: fromDate,
        to_date: toDate,
      });
      const res = await api.get(`/reports/profit-and-loss?${params}`);
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load Profit & Loss report');
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = (e) => {
    const y = Number(e.target.value);
    setYear(y);
    setFromDate(`${y}-04-01`);
    setToDate(`${y + 1}-03-31`);
  };

  const handleThisMonth = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    setFromDate(`${y}-${m}-01`);
    setToDate(new Date().toISOString().split('T')[0]);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && !data) return <LoadingState message="Calculating Profit & Loss statement..." />;

  const trading = data?.trading_account || {};
  const indirect = data?.indirect_expenses || [];
  const totalIndirect = data?.total_indirect_expenses || 0;
  const netProfit = data?.net_profit || 0;
  const isProfit = data?.is_profit;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 print:p-0 print:space-y-4">
      {/* Top Header - Hidden on Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <PageHeader
          title="Profit & Loss Statement (P&L)"
          subtitle="ICAI compliant Trading, Profit & Loss financial performance report"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Statement
          </button>
        </div>
      </div>

      {/* Filter Toolbar - Hidden on Print */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs print:hidden space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Financial Year:</span>
            <select
              value={year}
              onChange={handleYearChange}
              className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
            >
              {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map((y) => (
                <option key={y} value={y}>FY {y}-{String(y + 1).slice(2)}</option>
              ))}
            </select>
            <button
              onClick={handleThisMonth}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg"
            >
              This Month
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
            <span className="text-xs text-slate-500">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Net Sales Revenue</p>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            <Money value={trading.net_sales || 0} />
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Gross Turnover less Returns</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Cost of Goods Sold (COGS)</p>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            <Money value={trading.cogs || 0} />
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Stock + Purchases - Closing</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Gross Profit (Margin %)</p>
          <h3 className={`text-xl font-bold mt-1 ${trading.gross_profit >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600'}`}>
            <Money value={trading.gross_profit || 0} />
          </h3>
          <p className="text-[11px] font-semibold text-indigo-500 mt-0.5">
            {trading.gross_margin_pct}% Gross Margin
          </p>
        </div>

        <div className={`border rounded-xl p-4 shadow-xs ${
          isProfit
            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
            : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
        }`}>
          <p className="text-xs font-medium text-slate-500">Net Profit / (Loss)</p>
          <h3 className={`text-xl font-bold mt-1 ${isProfit ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
            <Money value={netProfit} />
          </h3>
          <p className={`text-[11px] font-semibold mt-0.5 ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
            {data?.net_margin_pct}% Net Margin ({isProfit ? 'Surplus' : 'Deficit'})
          </p>
        </div>
      </div>

      {/* Printable Statement Document */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Document Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-800/30">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Statement of Profit and Loss
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            For the period from <span className="font-semibold text-slate-700 dark:text-slate-300">{fromDate}</span> to <span className="font-semibold text-slate-700 dark:text-slate-300">{toDate}</span>
          </p>
        </div>

        {/* Section 1: Trading Account (Gross Profit Calculation) */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs flex items-center justify-center font-bold">1</span>
            Trading Account (Revenue from Operations & COGS)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-y border-slate-200 dark:border-slate-800 text-xs">
                <tr>
                  <th className="py-2.5 px-4 text-left">Particulars</th>
                  <th className="py-2.5 px-4 text-right w-44">Details (₹)</th>
                  <th className="py-2.5 px-4 text-right w-44">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {/* Revenue */}
                <tr className="font-semibold text-slate-900 dark:text-white bg-slate-50/30 dark:bg-slate-800/20">
                  <td colSpan={3} className="py-2 px-4 text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    A. Revenue from Operations
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-8 text-slate-700 dark:text-slate-300">Gross Taxable Sales</td>
                  <td className="py-2 px-4 text-right text-slate-600 dark:text-slate-400 font-mono">
                    <Money value={trading.taxable_sales || 0} />
                  </td>
                  <td className="py-2 px-4"></td>
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-8 text-slate-700 dark:text-slate-300">Less: Sales Returns (Credit Notes)</td>
                  <td className="py-2 px-4 text-right text-rose-600 dark:text-rose-400 font-mono">
                    (<Money value={trading.sales_returns || 0} />)
                  </td>
                  <td className="py-2 px-4 text-right font-bold text-slate-900 dark:text-white font-mono">
                    <Money value={trading.net_sales || 0} />
                  </td>
                </tr>

                {/* COGS */}
                <tr className="font-semibold text-slate-900 dark:text-white bg-slate-50/30 dark:bg-slate-800/20">
                  <td colSpan={3} className="py-2 px-4 text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    B. Cost of Goods Sold (COGS)
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-8 text-slate-700 dark:text-slate-300">Opening Stock</td>
                  <td className="py-2 px-4 text-right text-slate-600 dark:text-slate-400 font-mono">
                    <Money value={trading.opening_stock || 0} />
                  </td>
                  <td className="py-2 px-4"></td>
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-8 text-slate-700 dark:text-slate-300">Add: Gross Purchases</td>
                  <td className="py-2 px-4 text-right text-slate-600 dark:text-slate-400 font-mono">
                    <Money value={trading.taxable_purchases || 0} />
                  </td>
                  <td className="py-2 px-4"></td>
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-8 text-slate-700 dark:text-slate-300">Less: Purchase Returns (Debit Notes)</td>
                  <td className="py-2 px-4 text-right text-rose-600 dark:text-rose-400 font-mono">
                    (<Money value={trading.purchase_returns || 0} />)
                  </td>
                  <td className="py-2 px-4"></td>
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-8 text-slate-700 dark:text-slate-300">Add: Direct Expenses (Inward Freight, Wages, Packaging)</td>
                  <td className="py-2 px-4 text-right text-slate-600 dark:text-slate-400 font-mono">
                    <Money value={trading.direct_expenses || 0} />
                  </td>
                  <td className="py-2 px-4"></td>
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-8 text-slate-700 dark:text-slate-300">Less: Closing Stock Valuation</td>
                  <td className="py-2 px-4 text-right text-emerald-600 dark:text-emerald-400 font-mono">
                    (<Money value={trading.closing_stock || 0} />)
                  </td>
                  <td className="py-2 px-4 text-right font-bold text-slate-900 dark:text-white font-mono">
                    <Money value={trading.cogs || 0} />
                  </td>
                </tr>

                {/* Gross Profit Summary Row */}
                <tr className="bg-indigo-50/40 dark:bg-indigo-950/30 font-bold border-t-2 border-indigo-200 dark:border-indigo-800 text-sm">
                  <td className="py-3 px-4 text-indigo-900 dark:text-indigo-200">
                    GROSS PROFIT / (GROSS LOSS)
                  </td>
                  <td className="py-3 px-4 text-right text-xs text-indigo-600 dark:text-indigo-400">
                    Margin: {trading.gross_margin_pct}%
                  </td>
                  <td className="py-3 px-4 text-right text-base text-indigo-700 dark:text-indigo-300 font-mono">
                    <Money value={trading.gross_profit || 0} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Profit & Loss Account (Indirect Expenses & Net Profit) */}
        <div className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center font-bold">2</span>
            Operating & Indirect Expenses
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-y border-slate-200 dark:border-slate-800 text-xs">
                <tr>
                  <th className="py-2.5 px-4 text-left">Expense Category</th>
                  <th className="py-2.5 px-4 text-right w-44">% of Operating Expenses</th>
                  <th className="py-2.5 px-4 text-right w-44">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {indirect.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 px-4 text-center text-xs text-slate-400 italic">
                      No indirect expenses recorded in this period.
                    </td>
                  </tr>
                ) : (
                  indirect.map((ie, idx) => {
                    const pct = totalIndirect > 0 ? ((ie.total / totalIndirect) * 100).toFixed(1) : '0';
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-4 text-slate-700 dark:text-slate-300">
                          {ie.category_name || 'General / Sundry Expense'}
                        </td>
                        <td className="py-2 px-4 text-right text-xs text-slate-500">
                          {pct}%
                        </td>
                        <td className="py-2 px-4 text-right font-medium text-slate-900 dark:text-white font-mono">
                          <Money value={ie.total} />
                        </td>
                      </tr>
                    );
                  })
                )}

                <tr className="bg-slate-50 dark:bg-slate-800/50 font-semibold border-t border-slate-200 dark:border-slate-800">
                  <td colSpan={2} className="py-2.5 px-4 text-right text-slate-700 dark:text-slate-300">
                    Total Operating / Indirect Expenses:
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-white font-mono">
                    <Money value={totalIndirect} />
                  </td>
                </tr>

                {/* Final Net Profit Row */}
                <tr className={`border-t-2 font-bold text-base ${
                  isProfit
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                }`}>
                  <td className="py-3.5 px-4">
                    NET PROFIT / (NET LOSS) FOR THE PERIOD
                  </td>
                  <td className="py-3.5 px-4 text-right text-xs">
                    Net Margin: {data?.net_margin_pct}%
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-lg font-extrabold">
                    <Money value={netProfit} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Auditor / Management Footnote */}
        <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <p>• Generated automatically by BhaviSoft in compliance with Section 133 / Indian Accounting Standards (AS-2 & AS-9).</p>
          <p className="font-mono">Date: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
