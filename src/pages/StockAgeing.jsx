import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Clock, AlertTriangle, CheckCircle2, ShieldAlert,
  Search, Printer, Package, Layers, IndianRupee, Filter
} from 'lucide-react';
import { PageHeader, SearchField, Money, LoadingState, EmptyState } from '../components/ui';

export default function StockAgeing() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [healthFilter, setHealthFilter] = useState('');

  useEffect(() => {
    fetchStockAgeing();
  }, []);

  const fetchStockAgeing = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/stock-ageing');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load stock ageing report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && !data) return <LoadingState message="Analyzing inventory ageing buckets..." />;

  const products = data?.products || [];
  const summary = data?.summary || {};

  // Extract unique categories
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  // Filtered Products
  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.includes(search));
    const matchCat = !categoryFilter || p.category === categoryFilter;
    const matchHealth = !healthFilter || p.health_status === healthFilter;
    return matchSearch && matchCat && matchHealth;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 print:p-0 print:space-y-4">
      {/* Top Header - Hidden on Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <PageHeader
          title="Stock Ageing Analysis (इन्वेंट्री उम्र रिपोर्ट)"
          subtitle="Identify fast-moving vs dead capital tied in slow-moving inventory (0-30, 31-60, 61-90, 90+ days)"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs col-span-2 md:col-span-1">
          <p className="text-[11px] font-medium text-slate-500">Total Valuation</p>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
            <Money value={summary.total_stock_value || 0} />
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">{summary.total_products_tracked || 0} items tracked</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
          <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">0 - 30 Days (Fresh)</p>
          <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
            <Money value={summary.days_0_30_value || 0} />
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Fast Moving</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
          <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400">31 - 60 Days</p>
          <h3 className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-0.5">
            <Money value={summary.days_31_60_value || 0} />
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Regular Pace</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
          <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">61 - 90 Days</p>
          <h3 className="text-lg font-bold text-amber-700 dark:text-amber-300 mt-0.5">
            <Money value={summary.days_61_90_value || 0} />
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Slow Moving</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
          <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">90+ Days (Dead Stock)</p>
          <h3 className="text-lg font-bold text-rose-700 dark:text-rose-300 mt-0.5">
            <Money value={summary.days_90_plus_value || 0} />
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Dead Capital Tied Up</p>
        </div>
      </div>

      {/* Filter Toolbar - Hidden on Print */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search by product name or barcode..."
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="">All Health Status</option>
              <option value="active_stock">Active Stock (Under 60 days)</option>
              <option value="slow_moving">Slow Moving (61-90 days)</option>
              <option value="dead_stock">Dead Stock (90+ days)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ageing Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No Products Found"
          description="No inventory items match the selected ageing filters."
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 text-xs">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Rate</th>
                  <th className="py-3 px-4 text-right">Available Qty</th>
                  <th className="py-3 px-4 text-right">Total Value</th>
                  <th className="py-3 px-4 text-right text-emerald-600 font-bold">0-30 Days</th>
                  <th className="py-3 px-4 text-right text-blue-600 font-bold">31-60 Days</th>
                  <th className="py-3 px-4 text-right text-amber-600 font-bold">61-90 Days</th>
                  <th className="py-3 px-4 text-right text-rose-600 font-bold">90+ Days</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((item) => (
                  <tr key={item.product_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{item.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {item.category && <span>{item.category} • </span>}
                        {item.barcode && <span className="font-mono">BC: {item.barcode}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono text-xs">
                      <Money value={item.rate} />
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                      {item.current_stock} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                      <Money value={item.total_value} />
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 font-mono">
                      {item.days_0_30_qty > 0 ? `${item.days_0_30_qty}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 font-mono">
                      {item.days_31_60_qty > 0 ? `${item.days_31_60_qty}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-amber-600 dark:text-amber-400 font-mono font-medium">
                      {item.days_61_90_qty > 0 ? `${item.days_61_90_qty}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-600 dark:text-rose-400 font-mono font-bold">
                      {item.days_90_plus_qty > 0 ? `${item.days_90_plus_qty}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.health_status === 'dead_stock' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200">
                          Dead Stock
                        </span>
                      ) : item.health_status === 'slow_moving' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200">
                          Slow Moving
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200">
                          Active Stock
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Ageing Cards */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((item) => (
              <div key={item.product_id} className="p-3.5 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{item.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{item.category || 'General'} {item.barcode ? `• BC: ${item.barcode}` : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      <Money value={item.total_value} />
                    </div>
                    <span className="text-xs text-slate-500">
                      Stock: <span className="font-bold text-slate-800 dark:text-slate-200">{item.current_stock}</span> {item.unit}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-center text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 p-1.5 rounded-lg">
                    <span className="block text-[9px] uppercase font-bold text-emerald-700 dark:text-emerald-400">0-30d</span>
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">{item.days_0_30_qty || 0}</span>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/30 p-1.5 rounded-lg">
                    <span className="block text-[9px] uppercase font-bold text-blue-700 dark:text-blue-400">31-60d</span>
                    <span className="font-bold text-blue-800 dark:text-blue-300">{item.days_31_60_qty || 0}</span>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded-lg">
                    <span className="block text-[9px] uppercase font-bold text-amber-700 dark:text-amber-400">61-90d</span>
                    <span className="font-bold text-amber-800 dark:text-amber-300">{item.days_61_90_qty || 0}</span>
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-950/30 p-1.5 rounded-lg">
                    <span className="block text-[9px] uppercase font-bold text-rose-700 dark:text-rose-400">90d+</span>
                    <span className="font-bold text-rose-800 dark:text-rose-300">{item.days_over_90_qty || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
