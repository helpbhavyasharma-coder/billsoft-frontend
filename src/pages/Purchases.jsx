import usePageMemory from '../hooks/usePageMemory';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import apiCache from '../api/apiCache';
import toast from 'react-hot-toast';
import { Eye, Pencil, Plus, ShoppingCart, Trash2, X, AlertTriangle, CheckCircle, Ban } from 'lucide-react';
import { EmptyState, LoadingState, Money, PageHeader, StatusBadge } from '../components/ui';

const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = new Date().toISOString().slice(0, 10);

const emptyItem = {
  product_id: '',
  qty: 1,
  short_qty: 0,
  damaged_qty: 0,
  expired_qty: 0,
  rate: 0,
  rate_including_gst: 0,
  gst_rate: 5,
  expiry_date: '',
  notes: '',
};

const baseFromGstInclusive = (inclusiveRate, gstRate) => {
  const gross = parseFloat(inclusiveRate || 0);
  const gst = parseFloat(gstRate || 0);
  if (!gross) return 0;
  return gross / (1 + gst / 100);
};

const gstInclusiveFromBase = (baseRate, gstRate) => {
  const base = parseFloat(baseRate || 0);
  const gst = parseFloat(gstRate || 0);
  if (!base) return 0;
  return base * (1 + gst / 100);
};

const acceptedQty = (item) => Math.max(
  parseFloat(item.qty || 0) -
  parseFloat(item.short_qty || 0) -
  parseFloat(item.damaged_qty || 0) -
  parseFloat(item.expired_qty || 0),
  0
);

const lineTotal = (item) => {
  const accepted = acceptedQty(item);
  const gstRate = parseFloat(item.gst_rate || 0);
  const inclusiveRate = parseFloat(item.rate_including_gst || 0);
  return inclusiveRate > 0 ? accepted * inclusiveRate : accepted * parseFloat(item.rate || 0) * (1 + gstRate / 100);
};

const emptyForm = () => ({
  supplier_id: '',
  bill_no: '',
  purchase_date: today,
  payment_status: 'unpaid',
  amount_paid: '',
  payment_mode: 'cash',
  round_off: 0,
  notes: '',
  items: [{ ...emptyItem }],
});

export default function Purchases() {
  const [statusFilter, setStatusFilter] = usePageMemory('purchases_status_filter', 'active');
  const cachedPurchases = apiCache.get(`/purchases?status=${statusFilter}`)?.purchases || null;
  const cachedProducts = apiCache.get('/products')?.products || null;
  const cachedParties = apiCache.get('/parties')?.parties || null;

  const [purchases, setPurchases] = useState(() => cachedPurchases || []);
  const [products, setProducts] = useState(() => cachedProducts || []);
  const [parties, setParties] = useState(() => cachedParties || []);
  const [loading, setLoading] = useState(() => cachedPurchases === null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // Cancellation modal state
  const [cancellingPurchase, setCancellingPurchase] = useState(null);
  const [cancelReason, setCancelReason] = useState('Cancelled by operator');
  const [confirmPaymentReversal, setConfirmPaymentReversal] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => { fetchData(); }, [statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [purchaseRes, productRes, partyRes] = await Promise.all([
        api.getCached(`/purchases?status=${statusFilter}`),
        api.getCached('/products'),
        api.getCached('/parties'),
      ]);
      if (purchaseRes.data.success) setPurchases(purchaseRes.data.purchases);
      if (productRes.data.success) setProducts(productRes.data.products);
      if (partyRes.data.success) setParties(partyRes.data.parties);
    } catch {
      toast.error('Failed to load purchase data.');
    } finally {
      setLoading(false);
    }
  };

  const suppliers = parties.filter((p) => ['supplier', 'both'].includes(p.party_type));

  const totals = useMemo(() => {
    const itemTotals = form.items.reduce((sum, item) => {
      const accepted = Math.max(
        parseFloat(item.qty || 0) -
        parseFloat(item.short_qty || 0) -
        parseFloat(item.damaged_qty || 0) -
        parseFloat(item.expired_qty || 0),
        0
      );
      const gstRate = parseFloat(item.gst_rate || 0);
      const inclusiveRate = parseFloat(item.rate_including_gst || 0);
      const gross = inclusiveRate > 0 ? accepted * inclusiveRate : accepted * parseFloat(item.rate || 0) * (1 + gstRate / 100);
      const taxable = gstRate ? gross / (1 + gstRate / 100) : gross;
      const gst = gross - taxable;
      return { taxable: sum.taxable + taxable, gst: sum.gst + gst, total: sum.total + gross };
    }, { taxable: 0, gst: 0, total: 0 });
    const roundOff = parseFloat(form.round_off || 0);
    return { ...itemTotals, round_off: roundOff, grand: itemTotals.total + roundOff };
  }, [form.items, form.round_off]);

  useEffect(() => {
    if (!showForm || form.payment_status !== 'paid') return;
    const nextPaid = totals.grand.toFixed(2);
    if (String(form.amount_paid) !== nextPaid) setForm((prev) => ({ ...prev, amount_paid: nextPaid }));
  }, [showForm, form.payment_status, form.amount_paid, totals.grand]);

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setForm(emptyForm());
  };

  const updateItem = (idx, key, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i !== idx) return item;
        if (key === 'rate_including_gst') {
          return { ...item, rate_including_gst: value, rate: baseFromGstInclusive(value, item.gst_rate).toFixed(2) };
        }
        if (key === 'gst_rate') {
          const next = { ...item, gst_rate: value };
          if (parseFloat(item.rate_including_gst || 0) > 0) {
            next.rate = baseFromGstInclusive(item.rate_including_gst, value).toFixed(2);
          }
          return next;
        }
        if (key === 'rate') {
          return { ...item, rate: value };
        }
        return { ...item, [key]: value };
      }),
    }));
  };

  const addItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));
  const removeItem = (idx) => setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  const autoRoundOff = () => setForm((prev) => ({ ...prev, round_off: (Math.round(totals.total) - totals.total).toFixed(2) }));

  const selectProduct = (idx, productId) => {
    const product = products.find((p) => String(p.id) === String(productId));
    const rate = parseFloat(product?.default_rate || 0);
    const gst = parseFloat(product?.gst_rate || 5);
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => i === idx ? {
        ...item,
        product_id: productId,
        rate,
        gst_rate: gst,
        rate_including_gst: gstInclusiveFromBase(rate, gst).toFixed(2),
      } : item),
    }));
  };

  const savePurchase = async (e) => {
    e.preventDefault();
    if (!form.purchase_date) return toast.error('Purchase date required.');
    if (form.items.some((item) => !item.product_id)) return toast.error('Select product in all rows.');

    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/purchases/${editingId}`, form);
        toast.success('Purchase bill updated.');
      } else {
        await api.post('/purchases', form);
        toast.success('Purchase bill saved.');
      }
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save purchase.');
    } finally {
      setSaving(false);
    }
  };

  const loadPurchase = async (id, mode) => {
    try {
      const { data } = await api.get(`/purchases/${id}`);
      if (!data.success) return;

      if (mode === 'view') {
        setViewing(data.purchase);
        return;
      }

      setEditingId(id);
      setForm({
        supplier_id: data.purchase.supplier_id || '',
        bill_no: data.purchase.bill_no || '',
        purchase_date: String(data.purchase.purchase_date || '').slice(0, 10),
        payment_status: data.purchase.payment_status || 'unpaid',
        amount_paid: data.purchase.amount_paid || '',
        payment_mode: data.purchase.payment_mode || 'cash',
        round_off: data.purchase.round_off || 0,
        notes: data.purchase.notes || '',
        items: data.purchase.items?.length ? data.purchase.items.map((item) => ({
          product_id: item.product_id || '',
          qty: item.qty || 0,
          short_qty: item.short_qty || 0,
          damaged_qty: item.damaged_qty || 0,
          expired_qty: item.expired_qty || 0,
          rate: item.rate || 0,
          rate_including_gst: item.rate_including_gst || gstInclusiveFromBase(item.rate || 0, item.gst_rate || 0).toFixed(2),
          gst_rate: item.gst_rate || 0,
          expiry_date: item.expiry_date ? String(item.expiry_date).slice(0, 10) : '',
          notes: item.notes || '',
        })) : [{ ...emptyItem }],
      });
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load purchase bill.');
    }
  };

  const openCancelModal = (purchase) => {
    setCancellingPurchase(purchase);
    setCancelReason('Cancelled by operator');
    setConfirmPaymentReversal(true);
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancellingPurchase) return;
    setCancelling(true);
    try {
      const { data: res } = await api.post(`/purchases/${cancellingPurchase.id}/cancel`, {
        reason: cancelReason,
        reverse_payment: confirmPaymentReversal,
      });
      if (res.success) {
        toast.success(res.message || 'Purchase bill cancelled. Stock and payables reversed.');
        setCancellingPurchase(null);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel purchase bill.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Purchasing Bills"
        subtitle="Supplier bills, GST-inclusive purchase rates, short/damage/expiry and stock entries."
        actions={(
          <button onClick={() => { setEditingId(null); setShowForm(true); }} className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap">
            <Plus className="w-4 h-4" /> New Purchase
          </button>
        )}
      />

      {showForm && (
        <form onSubmit={savePurchase} className="card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold" style={{ color: 'var(--text)' }}>{editingId ? 'Edit Purchase Bill' : 'New Purchase Bill'}</h2>
            <button type="button" onClick={resetForm} className="p-1 rounded-lg" style={{ color: 'var(--text-3)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid md:grid-cols-6 gap-3">
            <div>
              <label className="label">Supplier</label>
              <select className="input-field" value={form.supplier_id} onChange={(e) => setForm((p) => ({ ...p, supplier_id: e.target.value }))}>
                <option value="">Select supplier</option>
                {suppliers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Bill No.</label>
              <input className="input-field" value={form.bill_no} onChange={(e) => setForm((p) => ({ ...p, bill_no: e.target.value }))} />
            </div>
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input-field" value={form.purchase_date} onChange={(e) => setForm((p) => ({ ...p, purchase_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Payment</label>
              <select className="input-field" value={form.payment_status} onChange={(e) => setForm((p) => ({ ...p, payment_status: e.target.value, amount_paid: e.target.value === 'paid' ? totals.grand.toFixed(2) : e.target.value === 'unpaid' ? '' : p.amount_paid }))}>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div>
              <label className="label">Paid Amount</label>
              <input
                type="number"
                className="input-field"
                min="0"
                step="0.01"
                value={form.amount_paid}
                disabled={form.payment_status === 'unpaid'}
                onChange={(e) => setForm((p) => ({ ...p, amount_paid: e.target.value, payment_status: parseFloat(e.target.value || 0) >= totals.grand ? 'paid' : parseFloat(e.target.value || 0) > 0 ? 'partial' : 'unpaid' }))}
              />
            </div>
            <div>
              <label className="label">Mode</label>
              <select className="input-field" value={form.payment_mode} onChange={(e) => setForm((p) => ({ ...p, payment_mode: e.target.value }))}>
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="upi">UPI</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[980px] table-fixed">
              <colgroup>
                <col className="w-[165px]" />
                <col className="w-[86px]" />
                <col className="w-[86px]" />
                <col className="w-[86px]" />
                <col className="w-[86px]" />
                <col className="w-[105px]" />
                <col className="w-[95px]" />
                <col className="w-[78px]" />
                <col className="w-[145px]" />
                <col className="w-[48px]" />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="table-header text-left">Product</th>
                  <th className="table-header text-right">Bill Qty</th>
                  <th className="table-header text-right">Short</th>
                  <th className="table-header text-right">Damage</th>
                  <th className="table-header text-right">Expiry</th>
                  <th className="table-header text-right">Incl. Rate</th>
                  <th className="table-header text-right">Base</th>
                  <th className="table-header text-right">GST %</th>
                  <th className="table-header text-left">Exp. Date</th>
                  <th className="table-header text-center"></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="table-cell">
                      <select className="input-field w-full min-w-0 px-2" value={item.product_id} onChange={(e) => selectProduct(idx, e.target.value)}>
                        <option value="">Select product</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name} {p.category ? `(${p.category})` : ''}</option>)}
                      </select>
                    </td>
                    {['qty', 'short_qty', 'damaged_qty', 'expired_qty'].map((key) => (
                      <td key={key} className="table-cell">
                        <input type="number" min="0" step="0.001" className="input-field text-right w-full min-w-0 px-2" value={item[key]} onChange={(e) => updateItem(idx, key, e.target.value)} />
                      </td>
                    ))}
                    <td className="table-cell">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input-field text-right w-full min-w-0 px-2"
                        value={item.rate_including_gst}
                        onChange={(e) => updateItem(idx, 'rate_including_gst', e.target.value)}
                      />
                    </td>
                    <td className="table-cell">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input-field text-right w-full min-w-0 px-2"
                        value={item.rate}
                        readOnly
                        onChange={(e) => updateItem(idx, 'rate', e.target.value)}
                      />
                    </td>
                    <td className="table-cell">
                      <input type="number" min="0" step="0.01" className="input-field text-right w-full min-w-0 px-2" value={item.gst_rate} onChange={(e) => updateItem(idx, 'gst_rate', e.target.value)} />
                    </td>
                    <td className="table-cell">
                      <input type="date" className="input-field w-full min-w-0 px-2" value={item.expiry_date} onChange={(e) => updateItem(idx, 'expiry_date', e.target.value)} />
                    </td>
                    <td className="table-cell text-center">
                      <button type="button" onClick={() => removeItem(idx)} disabled={form.items.length === 1} style={{ color: 'var(--text-3)' }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {form.items.map((item, idx) => (
              <div key={idx} className="mobile-card">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>Item {idx + 1}</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>Accepted: {acceptedQty(item).toLocaleString('en-IN', { maximumFractionDigits: 3 })}</p>
                  </div>
                  <button type="button" onClick={() => removeItem(idx)} disabled={form.items.length === 1} className="icon-btn icon-btn-danger disabled:opacity-40" aria-label="Remove item" title="Remove item">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="label">Product</label>
                    <select className="input-field" value={item.product_id} onChange={(e) => selectProduct(idx, e.target.value)}>
                      <option value="">Select product</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name} {p.category ? `(${p.category})` : ''}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label">Bill Qty</label>
                      <input type="number" min="0" step="0.001" className="input-field text-right" value={item.qty} onChange={(e) => updateItem(idx, 'qty', e.target.value)} />
                    </div>
                    <div>
                      <label className="label">GST Incl. Rate</label>
                      <input type="number" min="0" step="0.01" className="input-field text-right font-semibold" value={item.rate_including_gst} onChange={(e) => updateItem(idx, 'rate_including_gst', e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Short</label>
                      <input type="number" min="0" step="0.001" className="input-field text-right" value={item.short_qty} onChange={(e) => updateItem(idx, 'short_qty', e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Damage</label>
                      <input type="number" min="0" step="0.001" className="input-field text-right" value={item.damaged_qty} onChange={(e) => updateItem(idx, 'damaged_qty', e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Expiry Qty</label>
                      <input type="number" min="0" step="0.001" className="input-field text-right" value={item.expired_qty} onChange={(e) => updateItem(idx, 'expired_qty', e.target.value)} />
                    </div>
                    <div>
                      <label className="label">GST %</label>
                      <input type="number" min="0" step="0.01" className="input-field text-right" value={item.gst_rate} onChange={(e) => updateItem(idx, 'gst_rate', e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label">Base Rate</label>
                      <input type="number" className="input-field text-right" value={item.rate} readOnly />
                    </div>
                    <div>
                      <label className="label">Expiry Date</label>
                      <input type="date" className="input-field" value={item.expiry_date} onChange={(e) => updateItem(idx, 'expiry_date', e.target.value)} />
                    </div>
                  </div>

                  <div className="rounded-lg px-3 py-2 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                    <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-3)' }}>Line Total</span>
                    <span className="font-bold" style={{ color: 'var(--text)' }}><Money value={lineTotal(item)} /></span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button type="button" onClick={addItem} className="btn-secondary text-sm">Add Item</button>
            <div className="text-right text-sm" style={{ color: 'var(--text)' }}>
              <p>Taxable: ₹{fmt(totals.taxable)} | GST: ₹{fmt(totals.gst)}</p>
              <div className="flex items-center justify-end gap-2 mt-2">
                <span>Round Off</span>
                <input
                  type="number"
                  step="0.01"
                  className="input-field text-right w-28"
                  value={form.round_off}
                  onChange={(e) => setForm((p) => ({ ...p, round_off: e.target.value }))}
                />
                <button type="button" onClick={autoRoundOff} className="btn-secondary text-xs px-3 py-2">Auto</button>
              </div>
              <p className="font-bold text-base">Grand Total: <Money value={totals.grand} /></p>
            </div>
          </div>

          <textarea className="input-field" rows="2" placeholder="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          <div className="flex gap-3">
            <button type="button" onClick={resetForm} className="btn-secondary flex-1">Cancel</button>
            <button disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : editingId ? 'Update Purchase' : 'Save Purchase'}</button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
          {[
            { id: 'active', label: 'Active Bills' },
            { id: 'cancelled', label: 'Cancelled Bills' },
            { id: 'all', label: 'All Bills' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={
                statusFilter === tab.id
                  ? { backgroundColor: 'var(--bg-card)', color: 'var(--text)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                  : { color: 'var(--text-3)' }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <LoadingState label="Loading purchase bills..." /> : purchases.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title={statusFilter === 'cancelled' ? 'No cancelled purchase bills' : 'No purchase bills found'}
            description={statusFilter === 'cancelled' ? 'No cancelled purchase bills in this company.' : 'Create a purchase bill to update supplier payable and stock history.'}
          />
        ) : (
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="table-header text-left">Date</th>
                  <th className="table-header text-left">Bill No.</th>
                  <th className="table-header text-left">Supplier</th>
                  <th className="table-header text-right">Amount</th>
                  <th className="table-header text-right">Paid</th>
                  <th className="table-header text-right">Payable</th>
                  <th className="table-header text-center">Status</th>
                  <th className="table-header text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => {
                  const isCancelled = purchase.status === 'cancelled';
                  return (
                    <tr key={purchase.id} style={{ borderBottom: '1px solid var(--border)' }} className={isCancelled ? 'opacity-70 bg-red-50/20' : ''}>
                      <td className="table-cell">{String(purchase.purchase_date || '').slice(0, 10)}</td>
                      <td className={`table-cell font-medium ${isCancelled ? 'line-through text-gray-400' : ''}`}>
                        {purchase.bill_no || `#${purchase.id}`}
                      </td>
                      <td className="table-cell">
                        {purchase.supplier_id ? (
                          <Link to={`/parties/${purchase.supplier_id}/ledger`} className="text-blue-600 hover:underline font-medium">
                            {purchase.supplier_name || `Supplier #${purchase.supplier_id}`}
                          </Link>
                        ) : (
                          purchase.supplier_name || '-'
                        )}
                      </td>
                      <td className="table-cell text-right font-bold">₹{fmt(purchase.grand_total)}</td>
                      <td className="table-cell text-right text-green-600 font-medium">₹{fmt(purchase.amount_paid)}</td>
                      <td className="table-cell text-right text-red-600 font-medium">
                        {isCancelled ? '₹0.00' : `₹${fmt(purchase.payable)}`}
                      </td>
                      <td className="table-cell text-center">
                        {isCancelled ? (
                          <span className="badge badge-danger">Cancelled</span>
                        ) : (
                          <StatusBadge status={purchase.payment_status} />
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-center gap-2">
                          <button title="View" onClick={() => loadPurchase(purchase.id, 'view')} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50">
                            <Eye className="w-4 h-4" />
                          </button>
                          {!isCancelled && (
                            <>
                              <button title="Edit" onClick={() => loadPurchase(purchase.id, 'edit')} className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button title="Cancel Purchase" onClick={() => openCancelModal(purchase)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="md:hidden p-3 space-y-2">
            {purchases.map((purchase) => {
              const isCancelled = purchase.status === 'cancelled';
              return (
                <div key={purchase.id} className={`mobile-card ${isCancelled ? 'opacity-75 bg-red-50/20' : ''}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className={`font-bold truncate ${isCancelled ? 'line-through text-gray-500' : ''}`} style={{ color: 'var(--text)' }}>
                        {purchase.bill_no || `#${purchase.id}`}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
                        {purchase.supplier_id ? (
                          <Link to={`/parties/${purchase.supplier_id}/ledger`} className="text-blue-600 hover:underline">
                            {purchase.supplier_name || 'No supplier'}
                          </Link>
                        ) : (
                          purchase.supplier_name || 'No supplier'
                        )} | {String(purchase.purchase_date || '').slice(0, 10)}
                      </p>
                    </div>
                    {isCancelled ? <span className="badge badge-danger">Cancelled</span> : <StatusBadge status={purchase.payment_status} />}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="stat-box"><p>Amount</p><span><Money value={purchase.grand_total} /></span></div>
                    <div className="stat-box" style={{ backgroundColor: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.2)' }}><p>Paid</p><span className="text-green-600"><Money value={purchase.amount_paid} /></span></div>
                    <div className="stat-box" style={{ backgroundColor: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.2)' }}><p>Payable</p><span className="text-red-600"><Money value={isCancelled ? 0 : purchase.payable} /></span></div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => loadPurchase(purchase.id, 'view')} className="btn-secondary text-xs py-2 flex-1"><Eye className="w-4 h-4" /> View</button>
                    {!isCancelled && (
                      <>
                        <button type="button" onClick={() => loadPurchase(purchase.id, 'edit')} className="btn-secondary text-xs py-2 flex-1"><Pencil className="w-4 h-4" /> Edit</button>
                        <button type="button" onClick={() => openCancelModal(purchase)} className="btn-secondary text-xs py-2 text-red-600 flex-1"><Trash2 className="w-4 h-4" /> Cancel</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>

      {/* Cancel Purchase Modal */}
      {cancellingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 text-red-600 font-bold text-lg">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>Cancel Purchase Bill</span>
              </div>
              <button onClick={() => setCancellingPurchase(null)} className="p-1 rounded-lg" style={{ color: 'var(--text-3)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl p-3 text-sm space-y-1.5" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-3)' }}>Bill No:</span>
                <span className="font-semibold">{cancellingPurchase.bill_no || `#${cancellingPurchase.id}`}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-3)' }}>Supplier:</span>
                <span className="font-semibold">{cancellingPurchase.supplier_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-3)' }}>Total Amount:</span>
                <span className="font-bold text-red-600">₹{fmt(cancellingPurchase.grand_total)}</span>
              </div>
              {parseFloat(cancellingPurchase.amount_paid || 0) > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Amount Paid:</span>
                  <span className="font-bold">₹{fmt(cancellingPurchase.amount_paid)}</span>
                </div>
              )}
            </div>

            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              Stock received from this purchase will be verified and safely reversed. If items have already been sold, cancellation will be blocked to maintain inventory integrity.
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label className="label">Cancellation Reason *</label>
                <input
                  type="text"
                  className="input-field"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Returned to supplier, bill error..."
                  required
                  autoFocus
                />
              </div>

              {parseFloat(cancellingPurchase.amount_paid || 0) > 0 && (
                <label className="flex items-center gap-2 text-xs cursor-pointer p-2 rounded-lg bg-amber-50 border border-amber-200">
                  <input
                    type="checkbox"
                    checked={confirmPaymentReversal}
                    onChange={(e) => setConfirmPaymentReversal(e.target.checked)}
                    className="rounded text-red-600"
                  />
                  <span className="text-amber-800">
                    Confirm reversal/refund of recorded payment ₹{fmt(cancellingPurchase.amount_paid)}
                  </span>
                </label>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setCancellingPurchase(null)} className="btn-secondary flex-1">
                  Keep Bill
                </button>
                <button type="submit" disabled={cancelling} className="btn-danger flex-1 flex items-center justify-center gap-2">
                  <Ban className="w-4 h-4" />
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Purchase Modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="card w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Purchase Bill {viewing.bill_no || `#${viewing.id}`}</h2>
                  {viewing.status === 'cancelled' && <span className="badge badge-danger">Cancelled</span>}
                </div>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                  {String(viewing.purchase_date || '').slice(0, 10)} - {viewing.supplier_name || 'No supplier'}
                </p>
                {viewing.status === 'cancelled' && (
                  <div className="mt-2 text-xs p-2 rounded-lg bg-red-50 text-red-700 border border-red-200">
                    <p className="font-semibold">Cancelled on: {viewing.cancelled_at ? String(viewing.cancelled_at) : 'Historical'}</p>
                    <p>Reason: {viewing.cancellation_reason || 'Not specified'}</p>
                  </div>
                )}
              </div>
              <button onClick={() => setViewing(null)} className="p-1 rounded-lg" style={{ color: 'var(--text-3)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="table-header text-left">Product</th>
                    <th className="table-header text-right">Bill Qty</th>
                    <th className="table-header text-right">Accepted</th>
                    <th className="table-header text-right">Damage</th>
                    <th className="table-header text-right">Expiry</th>
                    <th className="table-header text-right">Rate</th>
                    <th className="table-header text-right">GST</th>
                    <th className="table-header text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewing.items || []).map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="table-cell">{item.product_name || '-'}</td>
                      <td className="table-cell text-right">{item.qty}</td>
                      <td className="table-cell text-right font-medium">{item.accepted_qty}</td>
                      <td className="table-cell text-right">{item.damaged_qty}</td>
                      <td className="table-cell text-right">{item.expired_qty}</td>
                      <td className="table-cell text-right">₹{fmt(item.rate)}</td>
                      <td className="table-cell text-right">₹{fmt(item.gst_amount)}</td>
                      <td className="table-cell text-right font-bold">₹{fmt(item.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-right" style={{ color: 'var(--text)' }}>
              <p>Taxable: ₹{fmt(viewing.subtotal)} | GST: ₹{fmt(viewing.total_gst)}</p>
              <p>Round Off: ₹{fmt(viewing.round_off)}</p>
              <p className="text-lg font-bold">Grand Total: ₹{fmt(viewing.grand_total)}</p>
              <p className="text-green-600 font-medium">Amount Paid: ₹{fmt(viewing.amount_paid)}</p>
              <p className="text-red-600 font-bold">Payable: ₹{fmt(viewing.status === 'cancelled' ? 0 : viewing.payable)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
