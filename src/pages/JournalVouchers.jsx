import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  BookOpen, Plus, Search, Calendar, Printer,
  Trash2, ArrowRight, CheckCircle2, FileText, ChevronRight
} from 'lucide-react';
import { PageHeader, SearchField, Money, LoadingState, EmptyState } from '../components/ui';

export default function JournalVouchers() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/journal-vouchers', {
        params: { search }
      });
      if (res.data?.success) {
        setVouchers(res.data.journal_vouchers || []);
      }
    } catch (err) {
      toast.error('Failed to load journal vouchers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, voucherNo) => {
    if (!window.confirm(`Are you sure you want to delete Journal Voucher ${voucherNo}? This will reverse the associated double-entry ledger postings.`)) return;
    try {
      const res = await api.delete(`/journal-vouchers/${id}`);
      if (res.data?.success) {
        toast.success(res.data.message);
        fetchVouchers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handlePrint = (id) => {
    const apiBase = api.defaults.baseURL || '/api';
    window.open(`${apiBase}/pdf/journal-voucher/${id}`, '_blank');
  };

  const filteredVouchers = vouchers.filter(v =>
    (v.voucher_no && v.voucher_no.toLowerCase().includes(search.toLowerCase())) ||
    (v.narration && v.narration.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal Vouchers (रोज़नामचा - JV)"
        subtitle="Record non-cash double-entry adjustments: depreciation, bad debts, interest, capital infusion, and year-end closing entries."
        badge={`${vouchers.length} Vouchers`}
        actions={
          <Link
            to="/journal-vouchers/new"
            className="btn-primary flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> New Journal Voucher
          </Link>
        }
      />

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <SearchField
          placeholder="Search voucher # or narration..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
      </div>

      {/* Vouchers Table */}
      <div className="card overflow-hidden p-0">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' }}>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Voucher No</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Date</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Narration / Purpose</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--text-3)' }}>Entries</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-3)' }}>Debit Total</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-3)' }}>Credit Total</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-3)' }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center">
                    <LoadingState message="Loading journal vouchers..." />
                  </td>
                </tr>
              ) : filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-10 text-center">
                    <EmptyState
                      icon={BookOpen}
                      title="No journal vouchers recorded"
                      message="Create journal vouchers for non-cash double-entry adjustments and accounting entries."
                      action={
                        <Link to="/journal-vouchers/new" className="btn-primary text-xs">
                          <Plus className="w-4 h-4 mr-1" /> Create First JV
                        </Link>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredVouchers.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {v.voucher_no}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {v.voucher_date}
                    </td>

                    <td className="py-3 px-4 max-w-sm truncate text-slate-800 dark:text-slate-200">
                      {v.narration || <span className="text-slate-400 italic">No narration</span>}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-semibold">
                        {v.items_count} legs
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold text-blue-600 dark:text-blue-400">
                      <Money amount={v.total_debit} />
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold text-purple-600 dark:text-purple-400">
                      <Money amount={v.total_credit} />
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handlePrint(v.id)}
                          className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                          title="Print JV Voucher"
                        >
                          <Printer className="w-3.5 h-3.5" /> Print
                        </button>
                        <button
                          onClick={() => handleDelete(v.id, v.voucher_no)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500"
                          title="Delete JV"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View (Invoice with AI style) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="p-6 text-center">
              <LoadingState message="Loading journal vouchers..." />
            </div>
          ) : filteredVouchers.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No journal vouchers found.
            </div>
          ) : (
            filteredVouchers.map(v => (
              <div key={v.id} className="p-3.5 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">{v.voucher_no}</span>
                    <p className="text-xs text-slate-400 mt-0.5">{v.voucher_date}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                      <Money value={v.total_debit} />
                    </span>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Balanced ({v.items_count} legs)</p>
                  </div>
                </div>

                <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                  <span className="text-slate-400 font-medium">Narration: </span>
                  {v.narration || <span className="text-slate-400 italic">No narration entered</span>}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleDelete(v.id, v.voucher_no)}
                    className="p-1.5 text-rose-600 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50"
                    title="Reverse Voucher"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
