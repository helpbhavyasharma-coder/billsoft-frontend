import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Plus, Edit, Trash2, IndianRupee, TrendingDown,
  Layers, Wallet, Calendar, Search, Filter, X,
  CheckCircle2, AlertCircle, FileText, ArrowDownRight, Tag
} from 'lucide-react';
import { PageHeader, SearchField, Money, LoadingState, EmptyState } from '../components/ui';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [summary, setSummary] = useState({ total_amount: 0, direct_total: 0, indirect_total: 0, count: 0 });

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: '',
    category_id: '',
    account_id: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_mode: 'cash',
    reference_no: '',
    vendor_name: '',
    notes: '',
  });

  // New Category Form
  const [newCat, setNewCat] = useState({ name: '', type: 'indirect', description: '' });

  useEffect(() => {
    fetchCategoriesAndAccounts();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [search, categoryFilter, typeFilter, fromDate, toDate]);

  const fetchCategoriesAndAccounts = async () => {
    try {
      const [catRes, accRes] = await Promise.all([
        api.get('/expense-categories'),
        api.get('/ledgers/accounts'),
      ]);
      if (catRes.data.categories) setCategories(catRes.data.categories);
      if (accRes.data.accounts) setAccounts(accRes.data.accounts);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoryFilter) params.append('category_id', categoryFilter);
      if (typeFilter) params.append('expense_type', typeFilter);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);

      const { data } = await api.get(`/expenses?${params}`);
      if (data.success) {
        setExpenses(data.expenses || []);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingExpense(null);
    setForm({
      title: '',
      category_id: categories[0]?.id || '',
      account_id: accounts[0]?.id || '',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      payment_mode: 'cash',
      reference_no: '',
      vendor_name: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exp) => {
    setEditingExpense(exp);
    setForm({
      title: exp.title || '',
      category_id: exp.category_id || '',
      account_id: exp.account_id || '',
      amount: exp.amount || '',
      expense_date: exp.expense_date || '',
      payment_mode: exp.payment_mode || 'cash',
      reference_no: exp.reference_no || '',
      vendor_name: exp.vendor_name || '',
      notes: exp.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount || Number(form.amount) <= 0) {
      toast.error('Please enter a valid title and amount');
      return;
    }

    setSubmitting(true);
    try {
      if (editingExpense) {
        await api.put(`/expenses/${editingExpense.id}`, form);
        toast.success('Expense updated successfully');
      } else {
        await api.post('/expenses', form);
        toast.success('Expense recorded & synced with ledger');
      }
      setIsModalOpen(false);
      fetchExpenses();
      fetchCategoriesAndAccounts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id, title) => {
    if (!window.confirm(`Delete expense "${title}"? This will also reverse the ledger deduction.`)) return;
    try {
      const { data } = await api.delete(`/expenses/${id}`);
      if (data.success) {
        toast.success('Expense deleted');
        fetchExpenses();
      }
    } catch (err) {
      toast.error('Failed to delete expense');
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCat.name.trim()) return;
    try {
      const { data } = await api.post('/expense-categories', newCat);
      if (data.success) {
        toast.success('Category created');
        setNewCat({ name: '', type: 'indirect', description: '' });
        fetchCategoriesAndAccounts();
      }
    } catch (err) {
      toast.error('Failed to create category');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Management"
        subtitle="Track direct and indirect business expenses with automated double-entry ledger deduction"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
            >
              <Tag className="w-4 h-4" />
              Categories
            </button>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Record Expense
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Expenses ({summary.count})</p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                <Money value={summary.total_amount} />
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Direct Expenses (Inward COGS)</p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                <Money value={summary.direct_total} />
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Indirect (Operating / Admin)</p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                <Money value={summary.indirect_total} />
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search expenses by title, payee, or notes..."
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Types (Direct & Indirect)</option>
              <option value="direct">Direct (COGS)</option>
              <option value="indirect">Indirect (Operating)</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      {loading ? (
        <LoadingState message="Loading expenses..." />
      ) : expenses.length === 0 ? (
        <EmptyState
          title="No Expenses Recorded"
          description={search ? "No expenses match your filters." : "Start logging your office rent, utilities, tea, salaries and transportation expenses."}
          action={
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Record Expense
            </button>
          }
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-medium">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Expense Title / Vendor</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Payment Account</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {exp.expense_date}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{exp.title}</div>
                      {exp.vendor_name && (
                        <div className="text-xs text-slate-500">Paid to: {exp.vendor_name}</div>
                      )}
                      {exp.reference_no && (
                        <div className="text-[11px] text-slate-400">Ref: {exp.reference_no}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {exp.category_name || 'General'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        exp.expense_type === 'direct'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                      }`}>
                        {exp.expense_type === 'direct' ? 'Direct (COGS)' : 'Indirect (Admin)'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {exp.account_name ? (
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {exp.account_name} <span className="text-[10px] text-slate-400">({exp.payment_mode})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 capitalize">{exp.payment_mode}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      <Money value={exp.amount} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(exp)}
                          title="Edit Expense"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(exp.id, exp.title)}
                          title="Delete Expense"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
            {expenses.map((exp) => (
              <div key={exp.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{exp.title}</h4>
                    <p className="text-xs text-slate-500">{exp.expense_date}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-white text-base">
                      <Money value={exp.amount} />
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {exp.category_name || 'General'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full ${
                    exp.expense_type === 'direct'
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                  }`}>
                    {exp.expense_type === 'direct' ? 'Direct' : 'Indirect'}
                  </span>
                  {exp.account_name && (
                    <span className="text-slate-500">Paid from: {exp.account_name}</span>
                  )}
                </div>

                {exp.notes && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic">"{exp.notes}"</p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleOpenEdit(exp)}
                    className="px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteExpense(exp.id, exp.title)}
                    className="px-3 py-1 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 rounded-lg"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record / Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingExpense ? 'Edit Expense' : 'Record Business Expense'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Expense Title / Purpose *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shop Electricity Bill for Nov, Chai-Nashta, Courier"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    value={form.expense_date}
                    onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- General Expense --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Deduct From Account (Double-Entry)
                  </label>
                  <select
                    value={form.account_id}
                    onChange={(e) => setForm({ ...form, account_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Cash / Petty Cash (No Ledger Sync) --</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({a.account_type})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={form.payment_mode}
                    onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI / GPay / PhonePe</option>
                    <option value="bank">Bank Transfer / IMPS / NEFT</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Debit / Credit Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Vendor / Payee Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Landlord name, Electricity board"
                    value={form.vendor_name}
                    onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reference / UTR / Bill No.
                </label>
                <input
                  type="text"
                  placeholder="Optional reference number"
                  value={form.reference_no}
                  onChange={(e) => setForm({ ...form, reference_no: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional notes..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Expense Categories</h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add Category Form */}
            <form onSubmit={handleCreateCategory} className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Category Name"
                  value={newCat.name}
                  onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                  required
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
                <select
                  value={newCat.type}
                  onChange={(e) => setNewCat({ ...newCat, type: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="indirect">Indirect (Operating)</option>
                  <option value="direct">Direct (COGS)</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
              >
                Add Category
              </button>
            </form>

            {/* List */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {categories.map((c) => (
                <div key={c.id} className="py-2 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">{c.name}</span>
                    <span className="ml-2 text-xs text-slate-400">({c.type})</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-right">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
