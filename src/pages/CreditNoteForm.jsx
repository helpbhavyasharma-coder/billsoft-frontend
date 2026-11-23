import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Plus, Trash2, AlertCircle, FileText, Calendar, User, Package, IndianRupee } from 'lucide-react';
import { PageHeader, Money } from '../components/ui';

export default function CreditNoteForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preInvoiceId = searchParams.get('invoice_id');

  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const [formData, setFormData] = useState({
    party_id: '',
    invoice_id: preInvoiceId || '',
    credit_note_no: '',
    return_date: new Date().toISOString().split('T')[0],
    reason: 'Defective Goods / Damaged',
    notes: '',
  });

  const [items, setItems] = useState([
    {
      invoice_item_id: null,
      product_id: null,
      description: '',
      qty: 1,
      unit: 'Pcs',
      rate: 0,
      gst_rate: 18,
      amount: 0,
      max_qty: null,
    }
  ]);

  const reasons = [
    'Defective Goods / Damaged',
    'Goods Rejected due to Quality',
    'Sales Return / Excess Quantity',
    'Invoice Rate Correction / Post-sale Discount',
    'Wrong Item Delivered',
    'Order Cancelled',
    'Other'
  ];

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (formData.party_id) {
      fetchCustomerInvoices(formData.party_id);
    } else {
      setInvoices([]);
    }
  }, [formData.party_id]);

  useEffect(() => {
    if (formData.invoice_id) {
      loadInvoiceItems(formData.invoice_id);
    }
  }, [formData.invoice_id]);

  const fetchInitialData = async () => {
    try {
      const [partyRes, noRes] = await Promise.all([
        api.get('/parties'),
        api.get('/credit-notes/next-number'),
      ]);

      if (partyRes.data.parties) {
        setParties(partyRes.data.parties);
      }
      if (noRes.data.success && noRes.data.credit_note_no) {
        setFormData((prev) => ({ ...prev, credit_note_no: noRes.data.credit_note_no }));
      }

      if (preInvoiceId) {
        // Find invoice to prefill party
        const invRes = await api.get(`/invoices/${preInvoiceId}`);
        if (invRes.data.success && invRes.data.invoice) {
          const inv = invRes.data.invoice;
          setFormData((prev) => ({
            ...prev,
            party_id: inv.party_id,
            invoice_id: inv.id,
          }));
        }
      }
    } catch (err) {
      toast.error('Failed to initialize form');
    }
  };

  const fetchCustomerInvoices = async (partyId) => {
    setLoadingInvoices(true);
    try {
      const { data } = await api.get(`/invoices?party_id=${partyId}&status=active`);
      if (data.invoices) {
        setInvoices(data.invoices);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const loadInvoiceItems = async (invId) => {
    try {
      const { data } = await api.get(`/invoices/${invId}`);
      if (data.success && data.invoice) {
        const inv = data.invoice;
        if (Array.isArray(inv.items) && inv.items.length > 0) {
          const newItems = inv.items.map((it) => {
            const soldQty = Number(it.qty || 1);
            const rate = Number(it.rate || 0);
            const gst = Number(it.gst_rate || 0);
            const lineAmt = soldQty * rate * (1 + gst / 100);
            return {
              invoice_item_id: it.id,
              product_id: it.product_id || null,
              description: it.description || it.product_name || '',
              qty: soldQty,
              max_qty: soldQty,
              unit: it.unit || 'Pcs',
              rate: rate,
              gst_rate: gst,
              amount: Math.round(lineAmt * 100) / 100,
            };
          });
          setItems(newItems);
        }
      }
    } catch (err) {
      toast.error('Failed to load items from selected invoice');
    }
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    const row = { ...updated[index], [field]: value };

    const qty = Number(field === 'qty' ? value : row.qty) || 0;
    const rate = Number(field === 'rate' ? value : row.rate) || 0;
    const gst = Number(field === 'gst_rate' ? value : row.gst_rate) || 0;

    if (row.max_qty && qty > row.max_qty) {
      toast.error(`Return quantity cannot exceed invoiced quantity (${row.max_qty})`);
      row.qty = row.max_qty;
    }

    const taxable = qty * rate;
    const gstAmt = taxable * (gst / 100);
    row.amount = Math.round((taxable + gstAmt) * 100) / 100;

    updated[index] = row;
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        invoice_item_id: null,
        product_id: null,
        description: '',
        qty: 1,
        unit: 'Pcs',
        rate: 0,
        gst_rate: 18,
        amount: 0,
        max_qty: null,
      }
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) {
      toast.error('At least one item is required');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  const totalQty = items.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.party_id) {
      toast.error('Please select a customer');
      return;
    }
    if (items.length === 0 || totalAmount <= 0) {
      toast.error('Please add at least one item with valid quantity and amount');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        party_id: Number(formData.party_id),
        invoice_id: formData.invoice_id ? Number(formData.invoice_id) : null,
        return_no: formData.credit_note_no,
        return_date: formData.return_date,
        reason: formData.reason,
        notes: formData.notes,
        amount: totalAmount,
        items: items.map((it) => ({
          invoice_item_id: it.invoice_item_id,
          product_id: it.product_id,
          description: it.description,
          qty: Number(it.qty),
          unit: it.unit,
          rate: Number(it.rate),
          gst_rate: Number(it.gst_rate),
          amount: Number(it.amount),
        })),
      };

      const { data } = await api.post('/credit-notes', payload);
      if (data.success) {
        toast.success(data.message || 'Credit note created successfully!');
        navigate(data.credit_note_id ? `/credit-notes/${data.credit_note_id}` : '/credit-notes');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create credit note');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/credit-notes')}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Issue Credit Note</h1>
            <p className="text-xs text-slate-500">Sales return against tax invoice or direct customer credit</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Details Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-rose-500" />
            General Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Credit Note No. *
              </label>
              <input
                type="text"
                value={formData.credit_note_no}
                onChange={(e) => setFormData({ ...formData, credit_note_no: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Return Date *
              </label>
              <input
                type="date"
                value={formData.return_date}
                onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Customer *
              </label>
              <select
                value={formData.party_id}
                onChange={(e) => setFormData({ ...formData, party_id: e.target.value, invoice_id: '' })}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
              >
                <option value="">-- Select Customer --</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.mobile ? `(${p.mobile})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Against Invoice (Optional)
              </label>
              <select
                value={formData.invoice_id}
                onChange={(e) => setFormData({ ...formData, invoice_id: e.target.value })}
                disabled={!formData.party_id || loadingInvoices}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
              >
                <option value="">-- Direct Credit / No Invoice --</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_no} ({inv.invoice_date}) - ₹{Number(inv.grand_total).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reason for Return *
              </label>
              <select
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
              >
                {reasons.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Remarks / Notes
              </label>
              <input
                type="text"
                placeholder="Optional notes or details for customer"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Returned Items Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-rose-500" />
              Returned Items & Adjustments
            </h2>
            <button
              type="button"
              onClick={addItemRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </button>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[700px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 w-28">Return Qty</th>
                  <th className="py-2.5 px-3 w-20">Unit</th>
                  <th className="py-2.5 px-3 w-28">Rate (₹)</th>
                  <th className="py-2.5 px-3 w-24">GST %</th>
                  <th className="py-2.5 px-3 w-32 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {items.map((row, idx) => (
                  <tr key={idx} className="group">
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="Item name / description"
                        value={row.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                      />
                      {row.max_qty && (
                        <p className="text-[10px] text-slate-400 mt-0.5">Max invoice qty: {row.max_qty}</p>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        value={row.qty}
                        onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={row.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.rate}
                        onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={row.gst_rate}
                        onChange={(e) => handleItemChange(idx, 'gst_rate', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-slate-900 dark:text-white">
                      ₹{Number(row.amount).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        disabled={items.length === 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Item Cards */}
          <div className="lg:hidden space-y-3">
            {items.map((row, idx) => (
              <div key={idx} className="rounded-xl border p-3.5 bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      ₹{Number(row.amount || 0).toFixed(2)}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Item Description *</label>
                  <input
                    type="text"
                    placeholder="Item name / description"
                    value={row.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    required
                    className="input-field text-xs py-2"
                  />
                  {row.max_qty && (
                    <p className="text-[10px] text-slate-400 mt-0.5">Max invoice qty: {row.max_qty}</p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase">Return Qty *</label>
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      value={row.qty}
                      onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                      required
                      className="input-field text-xs py-1.5 text-center font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase">Unit</label>
                    <input
                      type="text"
                      value={row.unit}
                      onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                      className="input-field text-xs py-1.5 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase">Rate (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={row.rate}
                      onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                      required
                      className="input-field text-xs py-1.5 text-right font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase">GST %</label>
                  <select
                    value={row.gst_rate}
                    onChange={(e) => handleItemChange(idx, 'gst_rate', e.target.value)}
                    className="input-field text-xs py-1.5"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Totals Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-end pt-4 border-t border-slate-200 dark:border-slate-800 gap-4">
            <div className="text-xs text-slate-500 space-y-1">
              <p>• Goods returned will be added back into warehouse stock automatically.</p>
              <p>• Customer outstanding receivable balance will be credited by this amount.</p>
              <p>• GST output tax liability will be reduced accordingly.</p>
            </div>
            <div className="w-full sm:w-72 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-2">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Total Items:</span>
                <span className="font-medium text-slate-900 dark:text-white">{items.length} ({totalQty} units)</span>
              </div>
              <div className="flex justify-between text-base font-bold text-rose-600 dark:text-rose-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                <span>Total Credit:</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            to="/credit-notes"
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Recording Credit Note...' : 'Save & Issue Credit Note'}
          </button>
        </div>
      </form>
    </div>
  );
}
