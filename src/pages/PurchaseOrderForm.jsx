import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Trash2, ArrowLeft, Save, Search, X } from 'lucide-react';
import { PageHeader, Money } from '../components/ui';

const emptyItem = () => ({
  product_id: null,
  description: '',
  hsn_code: '',
  qty: 1,
  unit: 'Pcs',
  rate: '',
  rate_including_gst: '',
  gst_rate: 5,
  taxable_amount: 0,
  gst_amount: 0,
  total_amount: 0,
});

export default function PurchaseOrderForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { company } = useAuth();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parties, setParties] = useState([]);
  const [products, setProducts] = useState([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  const [form, setForm] = useState({
    supplier_id: null,
    supplier_name: '',
    po_no: '',
    po_date: new Date().toISOString().slice(0, 10),
    expected_delivery_date: '',
    status: 'issued',
    notes: '',
    terms: '1. Goods must be delivered strictly as per approved specifications.\n2. Invoices must reference this PO number.\n3. Defective or damaged items will be rejected on delivery inspection.',
    round_off: 0,
  });

  const [items, setItems] = useState([emptyItem()]);

  useEffect(() => {
    fetchParties();
    fetchProducts();
    if (!isEdit) {
      fetchNextPoNo();
    } else {
      fetchPo();
    }
  }, [id]);

  const fetchParties = async () => {
    try {
      const { data } = await api.get('/parties');
      if (data.success) {
        // Filter parties or allow any party marked as supplier / general
        setParties(data.parties);
      }
    } catch {}
  };

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products');
      if (data.success) setProducts(data.products);
    } catch {}
  };

  const fetchNextPoNo = async () => {
    try {
      const { data } = await api.get('/purchase-orders/next-number');
      if (data.success) {
        setForm(prev => ({ ...prev, po_no: data.po_no }));
      }
    } catch {}
  };

  const fetchPo = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/purchase-orders/${id}`);
      if (data.success) {
        const po = data.purchase_order;
        setForm({
          supplier_id: po.supplier_id,
          supplier_name: po.supplier_name,
          po_no: po.po_no,
          po_date: po.po_date,
          expected_delivery_date: po.expected_delivery_date || '',
          status: po.status || 'issued',
          notes: po.notes || '',
          terms: po.terms || '',
          round_off: parseFloat(po.round_off || 0),
        });
        setSupplierSearch(po.supplier_name || '');
        if (data.items && data.items.length > 0) {
          setItems(data.items.map(it => ({
            product_id: it.product_id,
            description: it.description,
            hsn_code: it.hsn_code || '',
            qty: parseFloat(it.qty || 1),
            unit: it.unit || 'Pcs',
            rate: parseFloat(it.rate || 0),
            rate_including_gst: parseFloat(it.rate_including_gst || 0),
            gst_rate: parseFloat(it.gst_rate || 0),
            taxable_amount: parseFloat(it.taxable_amount || 0),
            gst_amount: parseFloat(it.gst_amount || 0),
            total_amount: parseFloat(it.total_amount || 0),
          })));
        }
      }
    } catch {
      toast.error('Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierSelect = (supplier) => {
    setForm(prev => ({
      ...prev,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
    }));
    setSupplierSearch(supplier.name);
    setShowSupplierDropdown(false);
  };

  const handleProductSelect = (index, product) => {
    const updated = [...items];
    const defaultRate = product.default_rate || '';
    const gstRate = product.gst_rate !== undefined ? parseFloat(product.gst_rate) : 5;
    updated[index] = {
      ...updated[index],
      product_id: product.id,
      description: product.name,
      hsn_code: product.hsn_code || '',
      unit: product.unit || 'Pcs',
      rate: defaultRate,
      gst_rate: gstRate,
    };
    recalcItem(updated, index);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    recalcItem(updated, index);
  };

  const recalcItem = (itemsList, index) => {
    const item = itemsList[index];
    const qty = parseFloat(item.qty || 0);
    const rate = parseFloat(item.rate || 0);
    const gstRate = parseFloat(item.gst_rate || 0);
    const taxable = qty * rate;
    const gstAmount = taxable * (gstRate / 100);
    const totalAmount = taxable + gstAmount;

    itemsList[index] = {
      ...item,
      taxable_amount: taxable,
      gst_amount: gstAmount,
      total_amount: totalAmount,
    };
    setItems([...itemsList]);
  };

  const addItemRow = () => {
    setItems([...items, emptyItem()]);
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) {
      setItems([emptyItem()]);
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((acc, it) => acc + parseFloat(it.taxable_amount || 0), 0);
  const totalGst = items.reduce((acc, it) => acc + parseFloat(it.gst_amount || 0), 0);
  const grandTotal = Math.round((subtotal + totalGst + parseFloat(form.round_off || 0)) * 100) / 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.supplier_id) {
      toast.error('Please select a supplier for this purchase order.');
      return;
    }
    const validItems = items.filter(it => it.description && it.description.trim() !== '');
    if (validItems.length === 0) {
      toast.error('Please add at least one line item with description.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        items: validItems,
      };
      if (isEdit) {
        const { data } = await api.put(`/purchase-orders/${id}`, payload);
        if (data.success) {
          toast.success('Purchase order updated successfully!');
          navigate(`/purchase-orders/${id}`);
        }
      } else {
        const { data } = await api.post('/purchase-orders', payload);
        if (data.success) {
          toast.success('Purchase order created successfully!');
          navigate(`/purchase-orders/${data.id}`);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save purchase order');
    } finally {
      setSaving(false);
    }
  };

  const filteredSuppliers = parties.filter(p =>
    p.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    (p.mobile && p.mobile.includes(supplierSearch))
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/purchase-orders"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {isEdit ? `Edit PO ${form.po_no}` : 'New Purchase Order (PO)'}
            </h1>
            <p className="text-xs text-slate-500">Commercial procurement order sent to suppliers</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* PO Header */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Order Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Supplier Selector */}
            <div className="relative">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Supplier / Vendor <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={supplierSearch}
                  onChange={(e) => {
                    setSupplierSearch(e.target.value);
                    setShowSupplierDropdown(true);
                  }}
                  onFocus={() => setShowSupplierDropdown(true)}
                  placeholder="Search supplier..."
                  className="input w-full text-sm"
                  required
                />
                {form.supplier_id && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm(p => ({ ...p, supplier_id: null, supplier_name: '' }));
                      setSupplierSearch('');
                    }}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {showSupplierDropdown && filteredSuppliers.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg">
                  {filteredSuppliers.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSupplierSelect(s)}
                      className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                    >
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{s.name}</div>
                      <div className="text-[11px] text-slate-500">{s.mobile || 'No mobile'} &bull; Type: {s.party_type || 'party'}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PO Number */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                PO Number
              </label>
              <input
                type="text"
                value={form.po_no}
                onChange={(e) => setForm({ ...form, po_no: e.target.value })}
                className="input w-full text-sm font-mono"
                required
              />
            </div>

            {/* PO Date */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                PO Date
              </label>
              <input
                type="date"
                value={form.po_date}
                onChange={(e) => setForm({ ...form, po_date: e.target.value })}
                className="input w-full text-sm"
                required
              />
            </div>

            {/* Expected Delivery Date */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={form.expected_delivery_date}
                onChange={(e) => setForm({ ...form, expected_delivery_date: e.target.value })}
                className="input w-full text-sm"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              PO Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="input w-full sm:w-64 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="issued">Issued to Supplier</option>
              <option value="partially_received">Partially Received</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* PO Line Items */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Procurement Items
            </h2>
            <button
              type="button"
              onClick={addItemRow}
              className="btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" /> Add Product
            </button>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2.5 px-3 w-8">#</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Item Description</th>
                  <th className="py-2.5 px-3 w-24">HSN</th>
                  <th className="py-2.5 px-3 w-24">Order Qty</th>
                  <th className="py-2.5 px-3 w-24">Unit</th>
                  <th className="py-2.5 px-3 w-28">Purchase Rate (₹)</th>
                  <th className="py-2.5 px-3 w-24">GST %</th>
                  <th className="py-2.5 px-3 w-28 text-right">Line Total (₹)</th>
                  <th className="py-2.5 px-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 text-xs text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="Select or enter item..."
                          className="input w-full text-xs py-1.5 px-2.5"
                          required
                        />
                        {products.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {products.slice(0, 3).map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleProductSelect(idx, p)}
                                className="text-[10px] bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded"
                              >
                                + {p.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={item.hsn_code}
                        onChange={(e) => handleItemChange(idx, 'hsn_code', e.target.value)}
                        placeholder="HSN"
                        className="input w-full text-xs py-1.5 px-2"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={item.qty}
                        onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                        className="input w-full text-xs py-1.5 px-2 text-center"
                        required
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        className="input w-full text-xs py-1.5 px-2"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.rate}
                        onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                        placeholder="0.00"
                        className="input w-full text-xs py-1.5 px-2 text-right"
                        required
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={item.gst_rate}
                        onChange={(e) => handleItemChange(idx, 'gst_rate', e.target.value)}
                        className="input w-full text-xs py-1.5 px-1"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-900 dark:text-slate-100 text-xs">
                      ₹{((item.taxable_amount || 0) + (item.gst_amount || 0)).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Item Cards (Invoice with AI style) */}
          <div className="lg:hidden space-y-3">
            {items.map((item, idx) => {
              const lineTotal = (item.taxable_amount || 0) + (item.gst_amount || 0);
              return (
                <div key={idx} className="rounded-xl border p-3.5 bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        ₹{lineTotal.toFixed(2)}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Remove item"
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
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      placeholder="Product to order..."
                      className="input-field text-xs py-2"
                      required
                    />
                    {products.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1.5">
                        {products.slice(0, 4).map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleProductSelect(idx, p)}
                            className="text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300 font-medium"
                          >
                            + {p.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Order Qty *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={item.qty}
                        onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                        className="input-field text-xs py-1.5 text-center"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Unit</label>
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        className="input-field text-xs py-1.5 text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Rate (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.rate}
                        onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                        placeholder="0.00"
                        className="input-field text-xs py-1.5 text-right font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">HSN</label>
                      <input
                        type="text"
                        value={item.hsn_code}
                        onChange={(e) => handleItemChange(idx, 'hsn_code', e.target.value)}
                        placeholder="HSN"
                        className="input-field text-xs py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">GST %</label>
                      <select
                        value={item.gst_rate}
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
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addItemRow}
            className="btn-secondary w-full py-2 text-xs rounded-xl flex items-center justify-center gap-1 border-dashed"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Internal Remarks &amp; Shipping Instructions
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="Shipping instructions, transport details..."
                className="input w-full text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                PO Terms &amp; Conditions
              </label>
              <textarea
                value={form.terms}
                onChange={(e) => setForm({ ...form, terms: e.target.value })}
                rows={4}
                className="input w-full text-xs font-mono"
              />
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              PO Financial Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Total Taxable Value</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Total GST</span>
                <span className="text-slate-900 dark:text-slate-100">₹{totalGst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Round Off</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.round_off}
                  onChange={(e) => setForm({ ...form, round_off: parseFloat(e.target.value || 0) })}
                  className="input w-24 text-xs py-1 px-2 text-right"
                />
              </div>
              <div className="flex justify-between py-3 text-base font-bold bg-slate-50 dark:bg-slate-800/80 px-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-900 dark:text-white">Total Order Value</span>
                <span className="text-emerald-600 dark:text-emerald-400">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Link
                to="/purchase-orders"
                className="btn-secondary flex-1 py-2.5 text-center text-sm rounded-xl font-medium"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex-1 py-2.5 text-sm rounded-xl font-medium inline-flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : isEdit ? 'Update Purchase Order' : 'Save Purchase Order'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
