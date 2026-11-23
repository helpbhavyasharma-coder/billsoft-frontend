import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Wallet, Calendar, CheckCircle2, AlertCircle, RefreshCw,
  Search, ArrowDownRight, ArrowUpRight, Scale, Save,
  History, CheckSquare, Square, Filter, ChevronRight, X
} from 'lucide-react';
import { PageHeader, SearchField, Money, LoadingState, EmptyState } from '../components/ui';

export default function BankReconciliation() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [statementDate, setStatementDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [statementBalance, setStatementBalance] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, unreconciled, reconciled
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState(new Set());
  const [bulkDate, setBulkDate] = useState(() => new Date().toISOString().split('T')[0]);

  // History Modal
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [savingSession, setSavingSession] = useState(false);

  // Fetch accounts on load
  useEffect(() => {
    fetchAccounts();
  }, []);

  // Fetch entries whenever account, statementDate, or filterStatus changes
  useEffect(() => {
    if (selectedAccountId) {
      fetchEntries();
    }
  }, [selectedAccountId, statementDate, filterStatus]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/bank-reconciliation/accounts');
      if (res.data?.success) {
        const accs = res.data.accounts || [];
        setAccounts(accs);
        if (accs.length > 0 && !selectedAccountId) {
          setSelectedAccountId(accs[0].id.toString());
        }
      }
    } catch (err) {
      toast.error('Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchEntries = async () => {
    if (!selectedAccountId) return;
    try {
      setLoading(true);
      const res = await api.get('/bank-reconciliation/entries', {
        params: {
          account_id: selectedAccountId,
          statement_date: statementDate,
          status: filterStatus
        }
      });
      if (res.data?.success) {
        setEntries(res.data.entries || []);
        setSummary(res.data.summary || null);
        setSelectedEntryIds(new Set());
      }
    } catch (err) {
      toast.error('Failed to load ledger entries');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/bank-reconciliation/history', {
        params: { account_id: selectedAccountId }
      });
      if (res.data?.success) {
        setHistoryList(res.data.history || []);
        setHistoryOpen(true);
      }
    } catch (err) {
      toast.error('Failed to load reconciliation history');
    }
  };

  const toggleSelectEntry = (id) => {
    setSelectedEntryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedEntryIds.size === filteredEntries.length) {
      setSelectedEntryIds(new Set());
    } else {
      setSelectedEntryIds(new Set(filteredEntries.map(e => e.id)));
    }
  };

  const handleSingleReconcile = async (entry, isReconciled) => {
    try {
      const res = await api.post('/bank-reconciliation/reconcile-entry', {
        entry_id: entry.id,
        is_reconciled: isReconciled ? 1 : 0,
        bank_statement_date: statementDate
      });
      if (res.data?.success) {
        toast.success(isReconciled ? 'Reconciled' : 'Unreconciled');
        fetchEntries();
        fetchAccounts();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const handleBulkReconcile = async (isReconciled) => {
    if (selectedEntryIds.size === 0) {
      toast.error('Select entries first');
      return;
    }
    try {
      const res = await api.post('/bank-reconciliation/bulk-reconcile', {
        entry_ids: Array.from(selectedEntryIds),
        is_reconciled: isReconciled ? 1 : 0,
        bank_statement_date: bulkDate
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        fetchEntries();
        fetchAccounts();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk update failed');
    }
  };

  const handleSaveSession = async () => {
    if (!summary) return;
    try {
      setSavingSession(true);
      const diff = statementBalance !== '' ? Math.abs(parseFloat(statementBalance || 0) - summary.expected_bank_statement_balance) : 0;
      const res = await api.post('/bank-reconciliation/save-session', {
        ledger_account_id: parseInt(selectedAccountId),
        statement_date: statementDate,
        statement_balance: parseFloat(statementBalance || 0),
        software_balance: summary.software_balance,
        unreconciled_debits: summary.uncleared_deposits,
        unreconciled_credits: summary.uncleared_withdrawals,
        difference: diff,
        notes: `Reconciled as of ${statementDate}`
      });
      if (res.data?.success) {
        toast.success('Reconciliation snapshot saved successfully');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSavingSession(false);
    }
  };

  const filteredEntries = useMemo(() => {
    if (!search) return entries;
    const s = search.toLowerCase();
    return entries.filter(e =>
      (e.description && e.description.toLowerCase().includes(s)) ||
      (e.cheque_no && e.cheque_no.toLowerCase().includes(s)) ||
      (e.bank_ref && e.bank_ref.toLowerCase().includes(s)) ||
      (e.debit && e.debit.toString().includes(s)) ||
      (e.credit && e.credit.toString().includes(s))
    );
  }, [entries, search]);

  const activeAccount = accounts.find(a => a.id.toString() === selectedAccountId);

  // Difference Calculation
  const enteredBal = statementBalance !== '' ? parseFloat(statementBalance) : null;
  const difference = (enteredBal !== null && summary)
    ? (enteredBal - summary.expected_bank_statement_balance)
    : null;
  const isBalanced = difference !== null && Math.abs(difference) < 0.01;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Bank Reconciliation Statement (BRS)"
        subtitle="ICAI Accounting Standards: Match cash book bank balances with bank passbook/statements."
        badge={`${accounts.length} Bank Accounts`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchHistory}
              className="btn-secondary flex items-center gap-1.5 text-xs sm:text-sm"
            >
              <History className="w-4 h-4" /> BRS History
            </button>
            <button
              onClick={handleSaveSession}
              disabled={savingSession || !summary}
              className="btn-primary flex items-center gap-1.5 text-xs sm:text-sm"
            >
              <Save className="w-4 h-4" /> Save Snapshot
            </button>
          </div>
        }
      />

      {/* Account & Date Bar */}
      <div className="card grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 dark:bg-slate-900/40">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-3)' }}>
            Select Bank Account
          </label>
          <div className="relative">
            <Wallet className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="input pl-9 font-medium"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (₹{Number(acc.software_balance || 0).toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-3)' }}>
            Reconciliation Statement Date
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="date"
              value={statementDate}
              onChange={(e) => setStatementDate(e.target.value)}
              className="input pl-9 font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-3)' }}>
            Bank Statement Ending Balance (₹)
          </label>
          <div className="relative">
            <Scale className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="number"
              step="0.01"
              placeholder="Enter passbook balance..."
              value={statementBalance}
              onChange={(e) => setStatementBalance(e.target.value)}
              className="input pl-9 font-medium font-mono"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="card p-3.5 bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-900/40">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Software Balance</p>
            <p className="text-lg font-bold font-mono text-blue-900 dark:text-blue-100 mt-1">
              <Money amount={summary.software_balance} />
            </p>
            <span className="text-[11px] text-blue-600 dark:text-blue-400">Cash book ledger</span>
          </div>

          <div className="card p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40">
            <div className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              <ArrowDownRight className="w-3.5 h-3.5" /> Uncleared Deposits
            </div>
            <p className="text-lg font-bold font-mono text-amber-900 dark:text-amber-100 mt-1">
              + <Money amount={summary.uncleared_deposits} />
            </p>
            <span className="text-[11px] text-amber-600 dark:text-amber-400">Deposited, not in passbook</span>
          </div>

          <div className="card p-3.5 bg-purple-50/60 dark:bg-purple-950/20 border-purple-200/60 dark:border-purple-900/40">
            <div className="flex items-center gap-1 text-xs font-medium text-purple-700 dark:text-purple-300">
              <ArrowUpRight className="w-3.5 h-3.5" /> Uncleared Cheques
            </div>
            <p className="text-lg font-bold font-mono text-purple-900 dark:text-purple-100 mt-1">
              - <Money amount={summary.uncleared_withdrawals} />
            </p>
            <span className="text-[11px] text-purple-600 dark:text-purple-400">Issued, not presented</span>
          </div>

          <div className="card p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Expected Bank Balance</p>
            <p className="text-lg font-bold font-mono text-emerald-900 dark:text-emerald-100 mt-1">
              <Money amount={summary.expected_bank_statement_balance} />
            </p>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Adjusted statement balance</span>
          </div>

          <div className={`card p-3.5 ${
            isBalanced
              ? 'bg-emerald-100/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
              : difference !== null
                ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                : 'bg-slate-50 dark:bg-slate-900/30'
          }`}>
            <p className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>Difference</p>
            <div className="flex items-center gap-1.5 mt-1">
              {isBalanced ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : difference !== null ? (
                <AlertCircle className="w-5 h-5 text-rose-600" />
              ) : null}
              <p className={`text-lg font-bold font-mono ${
                isBalanced ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
              }`}>
                {difference !== null ? <Money amount={Math.abs(difference)} /> : '—'}
              </p>
            </div>
            <span className="text-[11px] font-semibold">
              {isBalanced ? '✓ 100% Reconciled' : difference !== null ? 'Mismatch Detected' : 'Enter passbook balance'}
            </span>
          </div>
        </div>
      )}

      {/* Filter Tabs & Bulk Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-muted)' }}>
          {[
            { id: 'all', label: 'All Entries' },
            { id: 'unreconciled', label: 'Pending Reconcile' },
            { id: 'reconciled', label: 'Reconciled' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setFilterStatus(t.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterStatus === t.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SearchField
            placeholder="Search entries or cheque #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />

          {selectedEntryIds.size > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                {selectedEntryIds.size} selected
              </span>
              <button
                onClick={() => handleBulkReconcile(true)}
                className="btn-primary text-xs py-1 px-2.5"
              >
                Mark Reconciled
              </button>
              <button
                onClick={() => handleBulkReconcile(false)}
                className="btn-secondary text-xs py-1 px-2.5"
              >
                Mark Unreconciled
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Entries Table */}
      <div className="card overflow-hidden p-0">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' }}>
                <th className="py-3 px-3 w-10 text-center">
                  <button onClick={toggleSelectAll} className="text-slate-500 hover:text-slate-800">
                    {selectedEntryIds.size > 0 && selectedEntryIds.size === filteredEntries.length ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Date</th>
                <th className="py-3 px-3 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Particulars</th>
                <th className="py-3 px-3 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Cheque / Ref</th>
                <th className="py-3 px-3 font-semibold uppercase tracking-wider text-right text-emerald-700 dark:text-emerald-400">Debit (Deposits)</th>
                <th className="py-3 px-3 font-semibold uppercase tracking-wider text-right text-rose-700 dark:text-rose-400">Credit (Payments)</th>
                <th className="py-3 px-3 font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--text-3)' }}>Status</th>
                <th className="py-3 px-3 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Passbook Date</th>
                <th className="py-3 px-3 font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-3)' }}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center">
                    <LoadingState message="Calculating balances and loading bank transactions..." />
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-10 text-center">
                    <EmptyState
                      icon={CheckCircle2}
                      title="No transactions found"
                      message="All bank ledger entries are up to date for the chosen period."
                    />
                  </td>
                </tr>
              ) : (
                filteredEntries.map(entry => {
                  const isRec = !!entry.is_reconciled;
                  const isSelected = selectedEntryIds.has(entry.id);
                  return (
                    <tr
                      key={entry.id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <button onClick={() => toggleSelectEntry(entry.id)} className="text-slate-500">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {entry.entry_date}
                      </td>
                      <td className="py-2.5 px-3 max-w-xs truncate font-medium">
                        {entry.description || 'Ledger Entry'}
                        {entry.ref_type && (
                          <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase font-mono">
                            {entry.ref_type} #{entry.ref_id}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {entry.cheque_no || entry.bank_ref || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {Number(entry.debit) > 0 ? <Money amount={entry.debit} /> : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                        {Number(entry.credit) > 0 ? <Money amount={entry.credit} /> : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          isRec
                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                        }`}>
                          {isRec ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {isRec ? 'Reconciled' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                        {entry.bank_statement_date || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleSingleReconcile(entry, !isRec)}
                          className={`btn-secondary text-xs py-1 px-2.5 ${
                            isRec ? 'text-rose-600 hover:text-rose-700' : 'text-emerald-600 hover:text-emerald-700'
                          }`}
                        >
                          {isRec ? 'Unreconcile' : 'Mark Cleared'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View (Invoice with AI style) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="p-6 text-center">
              <LoadingState message="Loading bank transactions..." />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No transactions match reconciliation criteria.
            </div>
          ) : (
            filteredEntries.map(entry => {
              const isDebit = Number(entry.debit) > 0;
              const isReconciled = !!entry.is_reconciled;
              return (
                <div key={entry.id} className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white text-sm truncate">{entry.particulars}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Date: {entry.entry_date} {entry.cheque_ref_no ? `• Ref: ${entry.cheque_ref_no}` : ''}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`text-sm font-mono font-bold ${isDebit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isDebit ? `+ ₹${Number(entry.debit).toFixed(2)}` : `- ₹${Number(entry.credit).toFixed(2)}`}
                      </div>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isReconciled ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}>
                        {isReconciled ? 'Reconciled' : 'Pending Clearance'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-slate-500 font-mono">
                      {isReconciled ? `Cleared: ${entry.passbook_date}` : 'Not in passbook'}
                    </div>
                    <button
                      onClick={() => handleToggleReconciliation(entry.id, !isReconciled, passbookDateInput)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                        isReconciled
                          ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          : 'btn-primary'
                      }`}
                    >
                      {isReconciled ? 'Unmark' : 'Clear / Reconcile'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* History Modal */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-3xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h3 className="font-semibold text-base">Reconciliation Statement History</h3>
                <p className="text-xs text-slate-500">Past reconciliation snapshots for {activeAccount?.name}</p>
              </div>
              <button onClick={() => setHistoryOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 py-2">
              {historyList.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  No previous reconciliation snapshots recorded yet.
                </div>
              ) : (
                historyList.map(h => (
                  <div key={h.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-sm">{h.account_name}</p>
                      <p className="text-slate-500">Statement Date: <span className="font-mono">{h.statement_date}</span></p>
                      {h.notes && <p className="text-[11px] text-slate-400 italic mt-0.5">{h.notes}</p>}
                    </div>
                    <div className="flex items-center gap-4 text-right font-mono">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Statement Bal</p>
                        <p className="font-semibold text-emerald-600"><Money amount={h.statement_balance} /></p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Software Bal</p>
                        <p className="font-semibold text-blue-600"><Money amount={h.software_balance} /></p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Difference</p>
                        <p className={`font-semibold ${Number(h.difference) === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          <Money amount={h.difference} />
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t flex justify-end" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => setHistoryOpen(false)} className="btn-secondary text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
