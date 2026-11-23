import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Plus, Trash2, Save, Scale,
  CheckCircle2, AlertCircle, BookOpen, Layers
} from 'lucide-react';
import { PageHeader, Money, LoadingState } from '../components/ui';

export default function JournalVoucherForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState([]);

  // Form State
  const [voucherNo, setVoucherNo] = useState('');
  const [voucherDate, setVoucherDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [narration, setNarration] = useState('');

  // Items: start with 1 debit row and 1 credit row
  const [items, setItems] = useState([
    { ledger_account_id: '', type: 'debit', amount: '', notes: '' },
    { ledger_account_id: '', type: 'credit', amount: '', notes: '' }
  ]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [accRes, numRes] = await Promise.all([
        api.get('/ledgers'),
        api.get('/journal-vouchers/next-number')
      ]);
      setAccounts(accRes.data?.accounts || []);
      if (numRes.data?.voucher_no) setVoucherNo(numRes.data.voucher_no);
    } catch (err) {
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addItemRow = (type = 'debit') => {
    setItems(prev => [
      ...prev,
      { ledger_account_id: '', type, amount: '', notes: '' }
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length <= 2) {
      toast.error('A journal voucher must have at least 2 legs (debit and credit)');
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const totalDebit = items
    .filter(it => it.type === 'debit')
    .reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0);

  const totalCredit = items
    .filter(it => it.type === 'credit')
    .reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0);

  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = totalDebit > 0 && totalCredit > 0 && difference < 0.01;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isBalanced) {
      toast.error('Total Debits must equal Total Credits before posting.');
      return;
    }

    if (items.some(it => !it.ledger_account_id || !(parseFloat(it.amount) > 0))) {
      toast.error('Select an account and enter a valid positive amount for all rows.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        voucher_no: voucherNo,
        voucher_date: voucherDate,
        narration: narration.trim(),
        items: items.map(it => ({
          ledger_account_id: parseInt(it.ledger_account_id),
          type: it.type,
          amount: parseFloat(it.amount),
          notes: it.notes || ''
        }))
      };

      const res = await api.post('/journal-vouchers', payload);
      if (res.data?.success) {
        toast.success(res.data.message);
        navigate('/journal-vouchers');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post journal voucher');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading journal voucher configuration..." />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/journal-vouchers" className="btn-secondary p-2">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">New Journal Voucher (JV)</h1>
            <p className="text-xs text-slate-500">
              Manual double-entry adjustment voucher for depreciation, equity, interest, or accruals.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !isBalanced}
          className={`btn-primary flex items-center gap-1.5 text-xs sm:text-sm ${
            !isBalanced ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Save className="w-4 h-4" />
          {submitting ? 'Posting Entries...' : 'Post Journal Voucher'}
        </button>
      </div>

      {/* Voucher Meta Card */}
      <div className="card grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
            Voucher Number *
          </label>
          <input
            type="text"
            value={voucherNo}
            onChange={(e) => setVoucherNo(e.target.value)}
            required
            className="input text-xs font-mono font-bold"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
            Voucher Date *
          </label>
          <input
            type="date"
            value={voucherDate}
            onChange={(e) => setVoucherDate(e.target.value)}
            required
            className="input text-xs font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
            Narration / Explanation
          </label>
          <input
            type="text"
            placeholder="e.g. Depreciation charged @ 15% for computer equipment"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            className="input text-xs font-medium"
          />
        </div>
      </div>

      {/* Line Items Card */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Double-Entry Ledger Legs</h3>
            <p className="text-xs text-slate-500">Every debit leg must have a corresponding credit leg.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => addItemRow('debit')}
              className="btn-secondary text-xs flex items-center gap-1 py-1.5 px-3 text-blue-700 border-blue-200 hover:bg-blue-50"
            >
              <Plus className="w-3.5 h-3.5" /> Add Debit (Dr)
            </button>
            <button
              type="button"
              onClick={() => addItemRow('credit')}
              className="btn-secondary text-xs flex items-center gap-1 py-1.5 px-3 text-amber-700 border-amber-200 hover:bg-amber-50"
            >
              <Plus className="w-3.5 h-3.5" /> Add Credit (Cr)
            </button>
          </div>
        </div>

        {/* Rows List */}
        <div className="space-y-3">
          {items.map((it, idx) => {
            const isDebit = it.type === 'debit';
            return (
              <div
                key={idx}
                className={`grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 rounded-xl border items-end transition-all ${
                  isDebit
                    ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50'
                    : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                }`}
              >
                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Entry Type
                  </label>
                  <select
                    value={it.type}
                    onChange={(e) => handleItemChange(idx, 'type', e.target.value)}
                    className={`input text-xs font-bold uppercase ${
                      isDebit ? 'text-blue-700 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    <option value="debit">DEBIT (Dr)</option>
                    <option value="credit">CREDIT (Cr)</option>
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Ledger Account *
                  </label>
                  <select
                    value={it.ledger_account_id}
                    onChange={(e) => handleItemChange(idx, 'ledger_account_id', e.target.value)}
                    className="input text-xs font-medium"
                    required
                  >
                    <option value="">Select ledger account...</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.account_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={it.amount}
                    onChange={(e) => handleItemChange(idx, 'amount', e.target.value)}
                    className="input text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Line Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Specific detail..."
                    value={it.notes}
                    onChange={(e) => handleItemChange(idx, 'notes', e.target.value)}
                    className="input text-xs"
                  />
                </div>

                <div className="sm:col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg"
                    title="Remove entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Equality Validation Bar */}
        <div className="pt-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            {isBalanced ? (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Voucher Balanced: Total Debit = Total Credit (₹{totalDebit.toFixed(2)})
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                Difference of ₹{difference.toFixed(2)} detected. Must be ₹0.00 to post.
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 text-xs font-mono">
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Debits (Dr)</span>
              <span className="font-bold text-base text-blue-600 dark:text-blue-400">₹{totalDebit.toFixed(2)}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Credits (Cr)</span>
              <span className="font-bold text-base text-purple-600 dark:text-purple-400">₹{totalCredit.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
