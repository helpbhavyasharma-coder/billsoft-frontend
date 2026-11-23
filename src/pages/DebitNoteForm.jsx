import smartBack from '../utils/navigation';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Plus, Trash2, AlertCircle, FileText, Calendar, Truck, Package, IndianRupee } from 'lucide-react';
import { PageHeader, Money } from '../components/ui';

export default function DebitNoteForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prePurchaseId = searchParams.get('purchase_id');

  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  const [formData, setFormData] = useState({
    supplier_id: '',
    purchase_id: prePurchaseId || '',
    debit_note_no: '',
    debit_note_date: new Date().toISOString().split('T')[0],
    reason: 'Goods Defective / Damaged in Transit',
    notes: '',
    round_off: 0,
  });

  const [items, setItems] = useState([
    {
      purchase_item_id: null,
      product_id: null,
      description: '',
      hsn_code: '',
      qty: 1,
      unit: 'Pcs',
      rate: 0,
      gst_rate: 18,
      taxable_amount: 0,
      gst_amount: 0,
      total_amount: 0,
    }
  ]);

  const reasons = [
    'Goods Defective / Damaged in Transit',
    'Poor / Substandard Quality Received',
    'Excess Quantity Supplied by Vendor',
    'Rate Difference / Invoice Overcharge',
    'Goods Rejected on Inward Inspection',
    'Wrong Item Dispatched by Vendor',
    'Other'
  ];

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (formData.supplier_id) {
      fetchSupplierPurchases(formData.supplier_id);
    } else {
      setPurchases([]);
    }
  }, [formData.supplier_id]);

  useEffect(() => {
    if (formData.purchase_id) {
      loadPurchaseItems(formData.purchase_id);
    }
  }, [formData.purchase_id]);

  const fetchInitialData = async () => {
    try {
      const [partyRes, noRes] = await Promise.all([
        api.get('/parties'),
        api.get('/debit-notes/next-number'),
      ]);

      if (partyRes.data.parties) {
        // Show all parties or filter suppliers if specified
        setSuppliers(partyRes.data.parties);
      }
      if (noRes.data.success && noRes.data.debit_note_no) {
        setFormData((prev) => ({ ...prev, debit_note_no: noRes.data.debit_note_no }));
      }

      if (prePurchaseId) {
        const purRes = await api.get(`/purchases/${prePurchaseId}`);
        if (purRes.data.success && purRes.data.purchase) {
          const pur = purRes.data.purchase;
          setFormData((prev) => ({
            ...prev,
            supplier_id: pur.party_id || pur.supplier_id,
            purchase_id: pur.id,
          }));
        }
      }
    } catch (err) {
      toast.error('Failed to initialize form');
    }
  };

  const fetchSupplierPurchases = async (supplierId) => {
    setLoadingPurchases(true);
    try {
      const { data } = await api.get(`/purchases?supplier_id=${supplierId}`);
      if (data.purchases) {
        setPurchases(data.purchases);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPurchases(false);
    }
  };

  const loadPurchaseItems = async (purchaseId) => {
    try {
      const { data } = await api.get(`/purchases/${purchaseId}`);
      if (data.success && data.purchase) {
        const pur = data.purchase;
        if (Array.isArray(pur.items) && pur.items.length > 0) {
          const newItems = pur.items.map((it) => {
            const qty = Number(it.qty || 1);
            const rate = Number(it.rate || 0);
            const gstRate = Number(it.gst_rate || 0);
            const taxable = qty * rate;
            const gstAmt = taxable * (gstRate / 100);
            return {
              purchase_item_id: it.id,
              product_id: it.product_id || null,
              description: it.description || it.product_name || '',
              hsn_code: it.hsn_code || '',
              qty: qty,
              unit: it.unit || 'Pcs',
              rate: rate,
              gst_rate: gstRate,
              taxable_amount: Math.round(taxable * 100) / 100,
              gst_amount: Math.round(gstAmt * 100) / 100,
              total_amount: Math.round((taxable + gstAmt) * 100) / 100,
            };
          });
          setItems(newItems);
        }
      }
    } catch (err) {
      toast.error('Failed to load items from selected purchase bill');
    }
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    const row = { ...updated[index], [field]: value };

    const qty = Number(field === 'qty' ? value : row.qty) || 0;
    const rate = Number(field === 'rate' ? value : row.rate) || 0;
    const gstRate = Number(field === 'gst_rate' ? value : row.gst_rate) || 0;

    const taxable = qty * rate;
    const gstAmt = taxable * (gstRate / 100);
    row.taxable_amount = Math.round(taxable * 100) / 100;
    row.gst_amount = Math.round(gstAmt * 100) / 100;
    row.total_amount = Math.round((taxable + gstAmt) * 100) / 100;

    updated[index] = row;
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        purchase_item_id: null,
        product_id: null,
        description: '',
        hsn_code: '',
        qty: 1,
        unit: 'Pcs',
        rate: 0,
        gst_rate: 18,
        taxable_amount: 0,
        gst_amount: 0,
        total_amount: 0,
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

  const subtotal = items.reduce((acc, it) => acc + (Number(it.taxable_amount) || 0), 0);
  const totalGst = items.reduce((acc, it) => acc + (Number(it.gst_amount) || 0), 0);
  const roundOff = Number(formData.round_off) || 0;
  const grandTotal = Math.round((subtotal + totalGst + roundOff) * 100) / 100;
  const totalQty = items.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplier_id) {
      toast.error('Please select a supplier');
      return;
    }
    if (items.length === 0 || grandTotal <= 0) {
      toast.error('Please add at least one item with valid quantity and rate');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        supplier_id: Number(formData.supplier_id),
        purchase_id: formData.purchase_id ? Number(formData.purchase_id) : null,
        debit_note_no: formData.debit_note_no,
        debit_note_date: formData.debit_note_date,
        reason: formData.reason,
        notes: formData.notes,
        round_off: roundOff,
        items: items.map((it) => ({
          purchase_item_id: it.purchase_item_id,
          product_id: it.product_id,
          description: it.description,
          hsn_code: it.hsn_code,
          qty: Number(it.qty),
          unit: it.unit,
          rate: Number(it.rate),
          gst_rate: Number(it.gst_rate),
        })),
      };

      const { data } = await api.post('/debit-notes', payload);
      if (data.success) {
        toast.success(data.message || 'Debit note created successfully!');
        navigate(data.debit_note_id ? `/debit-notes/${data.debit_note_id}` : '/debit-notes');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create debit note');
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
            onClick={() => smartBack(navigate, '/debit-notes')}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Issue Debit Note</h1>
            <p className="text-xs text-slate-500">Return goods to vendor / reduce vendor payable liability</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Details Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-500" />
            General Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Debit Note No. *
              </label>
              <input
                type="text"
                value={formData.debit_note_no}
                onChange={(e) => setFormData({ ...formData, debit_note_no: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Debit Note Date *
              </label>
              <input
                type="date"
                value={formData.debit_note_date}
                onChange={(e) => setFormData({ ...formData, debit_note_date: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Supplier / Vendor *
              </label>
              <select
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value, purchase_id: '' })}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.mobile ? `(${s.mobile})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Against Purchase Bill (Optional)
              </label>
              <select
                value={formData.purchase_id}
                onChange={(e) => setFormData({ ...formData, purchase_id: e.target.value })}
                disabled={!formData.supplier_id || loadingPurchases}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
              >
                <option value="">-- Direct / No Purchase Bill --</option>
                {purchases.map((pb) => (
                  <option key={pb.id} value={pb.id}>
                    {pb.bill_no} ({pb.purchase_date}) - ₹{Number(pb.total_amount).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reason for Debit Note *
              </label>
              <select
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
              >
                {reasons.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Remarks / Supplier Instructions
              </label>
              <input
                type="text"
                placeholder="Optional remarks regarding return or transport"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Returned Items Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-500" />
              Items Returned to Supplier
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
            <table className="w-full text-left text-sm min-w-[750px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 w-28">HSN/SAC</th>
                  <th className="py-2.5 px-3 w-28">Return Qty</th>
                  <th className="py-2.5 px-3 w-20">Unit</th>
                  <th className="py-2.5 px-3 w-28">Rate (₹)</th>
                  <th className="py-2.5 px-3 w-24">GST %</th>
                  <th className="py-2.5 px-3 w-32 text-right">Total (₹)</th>
                  <th className="py-2.5 px-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {items.map((row, idx) => (
                  <tr key={idx} className="group">
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="Item name / returned item"
                        value={row.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="HSN"
                        value={row.hsn_code}
                        onChange={(e) => handleItemChange(idx, 'hsn_code', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        value={row.qty}
                        onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={row.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
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
                        className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={row.gst_rate}
                        onChange={(e) => handleItemChange(idx, 'gst_rate', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-slate-900 dark:text-white">
                      ₹{Number(row.total_amount).toFixed(2)}
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
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center">
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
                    placeholder="Product or item to return"
                    value={row.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    required
                    className="input-field text-xs py-2"
                  />
                  {row.max_qty && (
                    <p className="text-[10px] text-slate-400 mt-0.5">Max bill qty: {row.max_qty}</p>
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
              <p>• Deducts stock from warehouse inventory (Purchase Return Outward).</p>
              <p>• Directly reduces supplier balance owed (Debits Vendor Ledger).</p>
              <p>• Reverses Input Tax Credit (ITC) as required under Indian GST law.</p>
            </div>
            <div className="w-full sm:w-80 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-2">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Taxable Subtotal:</span>
                <span className="font-medium text-slate-900 dark:text-white">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Total GST:</span>
                <span className="font-medium text-slate-900 dark:text-white">₹{totalGst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
                <span>Round Off:</span>
                <input
                  type="number"
                  step="any"
                  value={formData.round_off}
                  onChange={(e) => setFormData({ ...formData, round_off: e.target.value })}
                  className="w-20 px-2 py-0.5 text-right text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                />
              </div>
              <div className="flex justify-between text-base font-bold text-amber-600 dark:text-amber-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                <span>Total Debit Amount:</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            to="/debit-notes"
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Recording Debit Note...' : 'Save & Issue Debit Note'}
          </button>
        </div>
      </form>
    </div>
  );
}
