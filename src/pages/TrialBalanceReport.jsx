import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Scale, Calendar, Search, Printer, CheckCircle2,
  AlertCircle, ChevronRight, Layers, ArrowUpDown, Filter, Building2
} from 'lucide-react';
import { PageHeader, SearchField, Money, LoadingState, EmptyState } from '../components/ui';

export default function TrialBalanceReport() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    const currentYear = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
    return `${currentYear}-04-01`;
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchTrialBalance();
  }, [fromDate, toDate]);

  const fetchTrialBalance = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/trial-balance', {
        params: { from_date: fromDate, to_date: toDate }
      });
      if (res.data?.success) {
        setData(res.data.trial_balance);
      }
    } catch (err) {
      toast.error('Failed to load trial balance report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const accounts = data?.accounts || [];

  // Groups list
  const groups = useMemo(() => {
    const set = new Set();
    accounts.forEach(a => { if (a.group) set.add(a.group); });
    return Array.from(set);
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const matchSearch = !search ||
        acc.account_name.toLowerCase().includes(search.toLowerCase()) ||
        (acc.group && acc.group.toLowerCase().includes(search.toLowerCase()));
      const matchGroup = selectedGroup === 'all' || acc.group === selectedGroup;
      return matchSearch && matchGroup;
    });
  }, [accounts, search, selectedGroup]);

  // Grouped breakdown
  const groupedData = useMemo(() => {
    const map = {};
    filteredAccounts.forEach(acc => {
      const g = acc.group || 'Other Accounts';
      if (!map[g]) map[g] = [];
      map[g].push(acc);
    });
    return map;
  }, [filteredAccounts]);

  const isBalanced = data?.is_balanced;
  const difference = data?.difference || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Trial Balance (तलपट)"
        subtitle="Schedule III & ICAI Standards: Double-entry verification of all ledger accounts across Assets, Liabilities, Incomes, and Expenses."
        badge={isBalanced ? '✓ Books In Balance' : 'Discrepancy Detected'}
        actions={
          <button
            onClick={handlePrint}
            className="btn-secondary flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <Printer className="w-4 h-4" /> Print Trial Balance
          </button>
        }
      />

      {/* Date Filter & Control Bar */}
      <div className="card grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50/50 dark:bg-slate-900/40">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
            Financial Year Quick Select
          </label>
          <select
            onChange={(e) => {
              const yr = parseInt(e.target.value);
              setFromDate(`${yr}-04-01`);
              setToDate(`${yr + 1}-03-31`);
            }}
            defaultValue={new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1}
            className="input text-xs font-semibold text-blue-600 dark:text-blue-400"
          >
            {[2026, 2025, 2024].map(y => (
              <option key={y} value={y}>FY {y}-{(y + 1).toString().slice(2)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
            From Date
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="input text-xs font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
            To Date
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="input text-xs font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
            Account Group Filter
          </label>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="input text-xs font-medium"
          >
            <option value="all">All Account Groups</option>
            {groups.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Equality & Verification Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 bg-blue-50/70 dark:bg-blue-950/20 border-blue-200/70 dark:border-blue-900/40">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
              Total Debit Balance (₹)
            </p>
            <p className="text-2xl font-bold font-mono text-blue-900 dark:text-blue-100 mt-1">
              <Money value={data.total_debit} />
            </p>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 mt-2 block">
              Assets, Expenses & Losses
            </span>
          </div>

          <div className="card p-4 bg-purple-50/70 dark:bg-purple-950/20 border-purple-200/70 dark:border-purple-900/40">
            <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
              Total Credit Balance (₹)
            </p>
            <p className="text-2xl font-bold font-mono text-purple-900 dark:text-purple-100 mt-1">
              <Money value={data.total_credit} />
            </p>
            <span className="text-[11px] text-purple-600 dark:text-purple-400 mt-2 block">
              Liabilities, Capital & Incomes
            </span>
          </div>

          <div className={`card p-4 ${
            isBalanced
              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: isBalanced ? '#047857' : '#b91c1c' }}>
                  Double-Entry Equality (Diff)
                </p>
                <p className={`text-2xl font-bold font-mono mt-1 ${isBalanced ? 'text-emerald-800 dark:text-emerald-200' : 'text-rose-800 dark:text-rose-200'}`}>
                  ₹{difference.toFixed(2)}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isBalanced ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' : 'bg-rose-100 dark:bg-rose-900/40 text-rose-600'
              }`}>
                {isBalanced ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </div>
            </div>
            <span className="text-[11px] font-semibold mt-2 block">
              {isBalanced ? '✓ Total Debits == Total Credits (Balanced)' : 'Mismatch: Adjust entries or journal vouchers'}
            </span>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="flex items-center justify-between gap-3">
        <SearchField
          placeholder="Search account name or head..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
      </div>

      {/* Trial Balance Statement Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' }}>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Particulars / Ledger Account</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Account Group</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-3)' }}>Period Debit (₹)</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-3)' }}>Period Credit (₹)</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right text-blue-700 dark:text-blue-400">Closing Debit (₹)</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right text-purple-700 dark:text-purple-400">Closing Credit (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center">
                    <LoadingState message="Calculating trial balance equality..." />
                  </td>
                </tr>
              ) : Object.keys(groupedData).length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center">
                    <EmptyState
                      icon={Scale}
                      title="No accounts match filter"
                      message="Adjust your search criteria or date filters."
                    />
                  </td>
                </tr>
              ) : (
                Object.entries(groupedData).map(([groupName, groupAccounts]) => {
                  const grpDebit = groupAccounts.reduce((sum, a) => sum + (parseFloat(a.closing_debit) || 0), 0);
                  const grpCredit = groupAccounts.reduce((sum, a) => sum + (parseFloat(a.closing_credit) || 0), 0);

                  return (
                    <tbody key={groupName} className="divide-y divide-slate-100 dark:divide-slate-800">
                      {/* Group Header */}
                      <tr className="bg-slate-50/80 dark:bg-slate-900/60 font-semibold text-slate-700 dark:text-slate-300">
                        <td colSpan="2" className="py-2.5 px-4 font-bold uppercase tracking-wider text-[11px] text-blue-700 dark:text-blue-300">
                          {groupName} ({groupAccounts.length})
                        </td>
                        <td colSpan="2"></td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-800 dark:text-blue-200">
                          {grpDebit > 0 ? <Money value={grpDebit} /> : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-800 dark:text-purple-200">
                          {grpCredit > 0 ? <Money value={grpCredit} /> : '—'}
                        </td>
                      </tr>

                      {/* Group Account Rows */}
                      {groupAccounts.map((acc, aIdx) => (
                        <tr key={aIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-4 pl-8 font-medium">
                            {acc.account_name}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500">
                            {acc.group}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                            {Number(acc.period_debit) > 0 ? <Money value={acc.period_debit} /> : '—'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                            {Number(acc.period_credit) > 0 ? <Money value={acc.period_credit} /> : '—'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold text-blue-600 dark:text-blue-400">
                            {Number(acc.closing_debit) > 0 ? <Money value={acc.closing_debit} /> : '—'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold text-purple-600 dark:text-purple-400">
                            {Number(acc.closing_credit) > 0 ? <Money value={acc.closing_credit} /> : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  );
                })
              )}
            </tbody>
            {/* Grand Total Footer */}
            {data && (
              <tfoot>
                <tr className="bg-slate-100/90 dark:bg-slate-900 font-bold border-t-2" style={{ borderColor: 'var(--border)' }}>
                  <td colSpan="4" className="py-3 px-4 text-right uppercase tracking-wider text-xs">
                    Grand Total (तलपट योग):
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-blue-700 dark:text-blue-300">
                    <Money value={data.total_debit} />
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-purple-700 dark:text-purple-300">
                    <Money value={data.total_credit} />
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
