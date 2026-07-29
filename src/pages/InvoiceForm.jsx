import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Trash2, Search, X, FileDown, Save } from 'lucide-react';
import { format } from 'date-fns';

const emptyItem = () => ({
  product_id: null, description: '', hsn_code: '', qty: 1,
  unit: 'Pcs', rate: '', discount: 0, gst_rate: 5,
  total_sale: 0, taxable_amount: 0, cgst: 0, sgst: 0, igst: 0,
  rate_is_fixed: false,
});

const calcItem = (item, isInterstate) => {
  const totalSale = parseFloat(item.qty || 0) * parseFloat(item.rate || 0);
  const discount = parseFloat(item.discount || 0);
  const taxable = (totalSale - discount) / (1 + parseFloat(item.gst_rate || 0) / 100);
  const gstAmt = (totalSale - discount) - taxable;
  return {
    ...item,
    total_sale: totalSale,
    taxable_amount: taxable,
    cgst: isInterstate ? 0 : gstAmt / 2,
    sgst: isInterstate ? 0 : gstAmt / 2,
    igst: isInterstate ? gstAmt : 0,
  };
};

const productGstRate = (product) => (
  product.gst_rate === undefined || product.gst_rate === null || product.gst_rate === ''
    ? 5
    : parseFloat(product.gst_rate)
);

const productRate = (product) => (
  product.default_rate === undefined || product.default_rate === null || product.default_rate === ''
    ? ''
    : product.default_rate
);

export default function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { company } = useAuth();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parties, setParties] = useState([]);
  const [products, setProducts] = useState([]);
  const [partySearch, setPartySearch] = useState('');
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [productSearch, setProductSearch] = useState({});
  const [showProductDropdown, setShowProductDropdown] = useState({});
  const [invoiceNo, setInvoiceNo] = useState('');

  const [form, setForm] = useState({
    party_id: null,
    party_name: '',
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: '',
    supply_type: 'intrastate',
    invoice_type: 'GST',
    notes: '',
    terms: company?.terms || '',
  });

  const [items, setItems] = useState([emptyItem()]);

  useEffect(() => {
    fetchParties();
    fetchProducts();
    if (!isEdit) fetchNextInvoiceNo();
    if (isEdit) fetchInvoice();
  }, [id]);

  useEffect(() => {
    if (company?.terms && !isEdit) {
      setForm(prev => ({ ...prev, terms: company.terms }));
    }
  }, [company]);

  const fetchParties = async () => {
    try {
      const { data } = await api.get('/parties');
      if (data.success) setParties(data.parties);
    } catch {}
  };

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products');
      if (data.success) setProducts(data.products);
    } catch {}
  };

  const fetchNextInvoiceNo = async () => {
    try {
      const { data } = await api.get('/invoices/next-number');
      if (data.success) setInvoiceNo(data.invoice_no);
    } catch {}
  };

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/invoices/${id}`);
      if (data.success) {
        const inv = data.invoice;
        setInvoiceNo(inv.invoice_no);

        // Handle both SQLite (YYYY-MM-DD) and PostgreSQL (ISO timestamp) date formats
        const parseDate = (d) => {
          if (!d) return '';
          if (typeof d === 'string' && d.includes('T')) return d.split('T')[0];
          if (typeof d === 'string') return d.substring(0, 10);
          return '';
        };

        setForm({
          party_id: inv.party_id,
          party_name: inv.party_name,
          invoice_date: parseDate(inv.invoice_date),
          due_date: parseDate(inv.due_date),
          supply_type: inv.supply_type || 'intrastate',
          invoice_type: inv.invoice_type || 'GST',
          notes: inv.notes || '',
          terms: inv.terms || '',
        });
        setItems(data.items && data.items.length > 0 ? data.items.map(item => ({
          ...item,
          qty: parseFloat(item.qty) || 1,
          rate: parseFloat(item.rate) || 0,
          discount: parseFloat(item.discount) || 0,
          gst_rate: parseFloat(item.gst_rate) || 5,
          total_sale: parseFloat(item.total_sale) || 0,
          taxable_amount: parseFloat(item.taxable_amount) || 0,
          cgst: parseFloat(item.cgst) || 0,
          sgst: parseFloat(item.sgst) || 0,
          igst: parseFloat(item.igst) || 0,
          rate_is_fixed: parseFloat(item.rate) > 0,
        })) : [emptyItem()]);
      }
    } catch (err) {
      console.error('Fetch invoice error:', err);
      toast.error('Failed to load invoice.');
    } finally {
      setLoading(false);
    }
  };

  const isInterstate = form.supply_type === 'interstate';

  const filteredParties = parties.filter(p =>
    p.name.toLowerCase().includes(partySearch.toLowerCase()) ||
    (p.mobile && p.mobile.includes(partySearch))
  );

  const selectParty = (party) => {
    setForm(prev => ({ ...prev, party_id: party.id, party_name: party.name }));
    setPartySearch(party.name);
    setShowPartyDropdown(false);
  };

  const selectProduct = (idx, product) => {
    const defaultRate = productRate(product);
    const hasFixedRate = defaultRate !== '' && parseFloat(defaultRate) > 0;
    const updated = [...items];
    updated[idx] = calcItem({
      ...updated[idx],
      product_id: product.id,
      description: product.name,
      hsn_code: product.hsn_code || '',
      unit: product.unit || 'Pcs',
      rate: hasFixedRate ? defaultRate : updated[idx].rate,
      gst_rate: productGstRate(product),
      rate_is_fixed: hasFixedRate,
    }, isInterstate);
    setItems(updated);
    setShowProductDropdown(prev => ({ ...prev, [idx]: false }));
    setProductSearch(prev => ({ ...prev, [idx]: product.name }));
  };

  const applyExactProductMatch = (idx, value) => {
    const clean = String(value || '').trim().toLowerCase();
    if (!clean) return false;
    const product = products.find((p) => String(p.name || '').trim().toLowerCase() === clean);
    if (!product) return false;
    selectProduct(idx, product);
    return true;
  };

  const updateItem = (idx, field, value) => {
    if (field === 'description' && applyExactProductMatch(idx, value)) return;
    const updated = [...items];
    updated[idx] = calcItem({ ...updated[idx], [field]: value }, isInterstate);
    setItems(updated);
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);

  const removeItem = (idx) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    setItems(prev => prev.map(item => calcItem(item, isInterstate)));
  }, [form.supply_type]);

  const totals = items.reduce((acc, item) => ({
    subtotal: acc.subtotal + (item.total_sale || 0),
    discount: acc.discount + (item.discount || 0),
    taxable: acc.taxable + (item.taxable_amount || 0),
    cgst: acc.cgst + (item.cgst || 0),
    sgst: acc.sgst + (item.sgst || 0),
    igst: acc.igst + (item.igst || 0),
  }), { subtotal: 0, discount: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0 });

  const grandTotalRaw = totals.taxable + totals.cgst + totals.sgst + totals.igst;
  const grandTotal = Math.round(grandTotalRaw);
  const roundOff = grandTotal - grandTotalRaw;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.party_id) { toast.error('Please select a party.'); return; }
    if (items.every(i => !i.description)) { toast.error('Add at least one item.'); return; }

    const missingPrice = items.filter(i => i.description && (!i.rate || parseFloat(i.rate) === 0));
    if (missingPrice.length > 0) {
      toast.error(`Price missing for: ${missingPrice.map(i => i.description).join(', ')}`, { duration: 4000 });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        invoice_no: invoiceNo,
        items: items.filter(i => i.description),
      };

      let data;
      if (isEdit) {
        ({ data } = await api.put(`/invoices/${id}`, payload));
      } else {
        ({ data } = await api.post('/invoices', payload));
      }

      if (data.success) {
        toast.success(isEdit ? 'Invoice updated!' : 'Invoice created!');
        navigate(`/invoices/${data.invoice.id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save invoice.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{color:'var(--text)'}}>{isEdit ? 'Edit Invoice' : 'New Invoice'}</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Invoice'}
          </button>
        </div>
      </div>

      {/* Invoice Header */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Party */}
          <div className="md:col-span-2">
            <label className="label">Party / Customer *</label>
            <div className="relative">
              <input
                type="text"
                className="input-field"
                placeholder="Search party name or mobile..."
                value={partySearch || form.party_name}
                onChange={(e) => {
                  setPartySearch(e.target.value);
                  setShowPartyDropdown(true);
                  if (!e.target.value) setForm(prev => ({ ...prev, party_id: null, party_name: '' }));
                }}
                onFocus={() => setShowPartyDropdown(true)}
              />
              {showPartyDropdown && (
                <div className="absolute z-20 w-full mt-1 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                  style={{backgroundColor:'var(--bg-card)', border:'1px solid var(--border)'}}>
                  {filteredParties.length === 0 ? (
                    <div className="p-3 text-sm" style={{color:'var(--text-3)'}}>
                      No party found.{' '}
                      <button type="button" onClick={() => navigate('/parties')} className="text-blue-600 hover:underline">
                        Add new party
                      </button>
                    </div>
                  ) : (
                    filteredParties.slice(0, 10).map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectParty(p)}
                        className="w-full text-left px-3 py-2 text-sm"
                        style={{color:'var(--text)'}}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor='var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}
                      >
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs" style={{color:'var(--text-3)'}}>{p.mobile} {p.city ? `- ${p.city}` : ''}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Invoice No */}
          <div>
            <label className="label">Invoice No.</label>
            <input
              type="text"
              className="input-field"
              style={{backgroundColor:'var(--bg-muted)'}}
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
            />
          </div>

          {/* Date */}
          <div>
            <label className="label">Invoice Date *</label>
            <input
              type="date"
              className="input-field"
              value={form.invoice_date}
              onChange={(e) => setForm(prev => ({ ...prev, invoice_date: e.target.value }))}
              required
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="label">Due Date</label>
            <input
              type="date"
              className="input-field"
              value={form.due_date}
              onChange={(e) => setForm(prev => ({ ...prev, due_date: e.target.value }))}
            />
          </div>

          {/* Supply Type */}
          <div>
            <label className="label">Supply Type</label>
            <select
              className="input-field"
              value={form.supply_type}
              onChange={(e) => setForm(prev => ({ ...prev, supply_type: e.target.value }))}
            >
              <option value="intrastate">Intrastate (CGST + SGST)</option>
              <option value="interstate">Interstate (IGST)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="card overflow-x-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold" style={{color:'var(--text)'}}>Items</h3>
          <button type="button" onClick={addItem} className="btn-secondary flex items-center gap-1 text-sm">
            <Plus className="w-4 h-4" /> Add Row
          </button>
        </div>

        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr style={{backgroundColor:'var(--bg-muted)', borderBottom:'1px solid var(--border)'}}>
              <th className="text-left px-2 py-2 text-xs font-semibold w-8" style={{color:'var(--text-3)'}}>#</th>
              <th className="text-left px-2 py-2 text-xs font-semibold min-w-[200px]" style={{color:'var(--text-3)'}}>Description</th>
              <th className="text-left px-2 py-2 text-xs font-semibold w-20" style={{color:'var(--text-3)'}}>HSN</th>
              <th className="text-right px-2 py-2 text-xs font-semibold w-20" style={{color:'var(--text-3)'}}>Qty</th>
              <th className="text-left px-2 py-2 text-xs font-semibold w-20" style={{color:'var(--text-3)'}}>Unit</th>
              <th className="text-right px-2 py-2 text-xs font-semibold w-24" style={{color:'var(--text-3)'}}>Rate</th>
              <th className="text-right px-2 py-2 text-xs font-semibold w-24" style={{color:'var(--text-3)'}}>Discount</th>
              <th className="text-right px-2 py-2 text-xs font-semibold w-20" style={{color:'var(--text-3)'}}>GST%</th>
              <th className="text-right px-2 py-2 text-xs font-semibold w-28" style={{color:'var(--text-3)'}}>Total</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{borderBottom:'1px solid var(--border)'}}>
                <td className="px-2 py-1.5 text-xs" style={{color:'var(--text-3)'}}>{idx + 1}</td>

                {/* Description with product search */}
                <td className="px-2 py-1.5">
                  <div className="relative">
                    <input
                      type="text"
                      className="input-field text-xs py-1.5"
                      placeholder="Search or type product..."
                      value={productSearch[idx] !== undefined ? productSearch[idx] : item.description}
                      onChange={(e) => {
                        setProductSearch(prev => ({ ...prev, [idx]: e.target.value }));
                        updateItem(idx, 'description', e.target.value);
                        setShowProductDropdown(prev => ({ ...prev, [idx]: true }));
                      }}
                      onBlur={(e) => applyExactProductMatch(idx, e.target.value)}
                      onFocus={() => setShowProductDropdown(prev => ({ ...prev, [idx]: true }))}
                    />
                    {showProductDropdown[idx] && (
                      <div className="absolute z-20 w-64 mt-1 rounded-lg shadow-lg max-h-40 overflow-y-auto"
                        style={{backgroundColor:'var(--bg-card)', border:'1px solid var(--border)'}}>
                        {products
                          .filter(p => p.name.toLowerCase().includes((productSearch[idx] || item.description || '').toLowerCase()))
                          .slice(0, 8)
                          .map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                selectProduct(idx, p);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs"
                              style={{color:'var(--text)'}}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor='var(--bg-hover)'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}
                            >
                              <div className="font-medium">{p.name}</div>
                              <div style={{color:'var(--text-3)'}}>₹{p.default_rate} - {p.unit} - {p.gst_rate}% GST</div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </td>

                <td className="px-2 py-1.5">
                  <input type="text" className="input-field text-xs py-1.5 w-full"
                    value={item.hsn_code} onChange={(e) => updateItem(idx, 'hsn_code', e.target.value)} />
                </td>

                <td className="px-2 py-1.5">
                  <input type="number" className="input-field text-xs py-1.5 text-right"
                    value={item.qty} min="0" step="0.001"
                    onChange={(e) => updateItem(idx, 'qty', e.target.value)} />
                </td>

                <td className="px-2 py-1.5">
                  <select className="input-field text-xs py-1.5"
                    value={item.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)}>
                    {['Pcs', 'KG', 'Gm', 'Ltr', 'Box', 'Bag', 'Dozen', 'Meter'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </td>

                <td className="px-2 py-1.5">
                  <div className="relative">
                    <input
                      type="number"
                      className={`input-field text-xs py-1.5 text-right pr-1 ${
                        (!item.rate || parseFloat(item.rate) === 0)
                          ? 'border-orange-400 placeholder-orange-400 focus:ring-orange-400'
                          : item.rate_is_fixed
                          ? 'border-green-300'
                          : ''
                      }`}
                      style={
                        (!item.rate || parseFloat(item.rate) === 0)
                          ? {backgroundColor:'rgba(251,146,60,0.1)'}
                          : item.rate_is_fixed
                          ? {backgroundColor:'rgba(34,197,94,0.08)'}
                          : {}
                      }
                      placeholder="Enter price"
                      value={item.rate}
                      min="0"
                      step="0.01"
                      onChange={(e) => updateItem(idx, 'rate', e.target.value)}
                    />
                    {item.rate_is_fixed && parseFloat(item.rate) > 0 && (
                      <span className="absolute -top-2 -right-1 text-[9px] bg-green-500 text-white px-1 rounded leading-tight">
                        fixed
                      </span>
                    )}
                    {(!item.rate || parseFloat(item.rate) === 0) && item.description && (
                      <span className="absolute -top-2 -right-1 text-[9px] bg-orange-500 text-white px-1 rounded leading-tight">
                        price?
                      </span>
                    )}
                  </div>
                </td>

                <td className="px-2 py-1.5">
                  <input type="number" className="input-field text-xs py-1.5 text-right"
                    value={item.discount} min="0" step="0.01"
                    onChange={(e) => updateItem(idx, 'discount', e.target.value)} />
                </td>

                <td className="px-2 py-1.5">
                  <select className="input-field text-xs py-1.5"
                    value={item.gst_rate} onChange={(e) => updateItem(idx, 'gst_rate', e.target.value)}>
                    {[0, 5, 12, 18, 28].map(r => (
                      <option key={r} value={r}>{r}%</option>
                    ))}
                  </select>
                </td>

                <td className="px-2 py-1.5 text-right font-medium text-xs" style={{color:'var(--text)'}}>
                  ₹{(item.total_sale || 0).toFixed(2)}
                </td>

                <td className="px-2 py-1.5">
                  <button type="button" onClick={() => removeItem(idx)}
                    className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button type="button" onClick={addItem}
          className="mt-3 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add another item
        </button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Notes */}
        <div className="card">
          <label className="label">Notes / Remarks</label>
          <textarea className="input-field" rows={3} placeholder="Optional notes..."
            value={form.notes} onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))} />
          <label className="label mt-3">Terms & Conditions</label>
          <textarea className="input-field" rows={3}
            value={form.terms} onChange={(e) => setForm(prev => ({ ...prev, terms: e.target.value }))} />
        </div>

        {/* Summary */}
        <div className="card">
          <h3 className="font-semibold mb-3" style={{color:'var(--text)'}}>Invoice Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between" style={{color:'var(--text-2)'}}>
              <span>Subtotal</span>
              <span>₹{totals.subtotal.toFixed(2)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between" style={{color:'var(--text-2)'}}>
                <span>Discount</span>
                <span>-₹{totals.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between" style={{color:'var(--text-2)'}}>
              <span>Taxable Amount</span>
              <span>₹{totals.taxable.toFixed(2)}</span>
            </div>
            {!isInterstate ? (
              <>
                <div className="flex justify-between" style={{color:'var(--text-2)'}}>
                  <span>CGST</span>
                  <span>₹{totals.cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between" style={{color:'var(--text-2)'}}>
                  <span>SGST</span>
                  <span>₹{totals.sgst.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between" style={{color:'var(--text-2)'}}>
                <span>IGST</span>
                <span>₹{totals.igst.toFixed(2)}</span>
              </div>
            )}
            {roundOff !== 0 && (
              <div className="flex justify-between" style={{color:'var(--text-2)'}}>
                <span>Round Off</span>
                <span>{roundOff > 0 ? '+' : ''}₹{roundOff.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-2 mt-2" style={{color:'var(--text)', borderTop:'1px solid var(--border)'}}>
              <span>Grand Total</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Save */}
      <div className="flex justify-end gap-3 pb-6">
        <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : isEdit ? 'Update Invoice' : 'Create Invoice'}
        </button>
      </div>
    </form>
  );
}
