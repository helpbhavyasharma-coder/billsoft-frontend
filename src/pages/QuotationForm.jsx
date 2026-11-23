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
  discount: 0,
  gst_rate: 5,
  total_sale: 0,
  taxable_amount: 0,
  cgst: 0,
  sgst: 0,
  igst: 0,
});

export default function QuotationForm() {
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

  const [form, setForm] = useState({
    party_id: null,
    party_name: '',
    quotation_no: '',
    quotation_date: new Date().toISOString().slice(0, 10),
    valid_until: '',
    supply_type: 'intrastate',
    status: 'draft',
    notes: '',
    terms: company?.terms || '1. Quotation validity is 30 days from date of issue.\n2. Payment terms as agreed upon order confirmation.\n3. Taxes as applicable at the time of invoicing.',
    round_off: 0,
  });

  const [items, setItems] = useState([emptyItem()]);

  useEffect(() => {
    fetchParties();
    fetchProducts();
    if (!isEdit) {
      fetchNextQuotationNo();
    } else {
      fetchQuotation();
    }
  }, [id]);

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

  const fetchNextQuotationNo = async () => {
    try {
      const { data } = await api.get('/quotations/next-number');
      if (data.success) {
        setForm(prev => ({ ...prev, quotation_no: data.quotation_no }));
      }
    } catch {}
  };

  const fetchQuotation = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/quotations/${id}`);
      if (data.success) {
        const q = data.quotation;
        setForm({
          party_id: q.party_id,
          party_name: q.party_name,
          quotation_no: q.quotation_no,
          quotation_date: q.quotation_date,
          valid_until: q.valid_until || '',
          supply_type: q.supply_type || 'intrastate',
          status: q.status || 'draft',
          notes: q.notes || '',
          terms: q.terms || '',
          round_off: parseFloat(q.round_off || 0),
        });
        setPartySearch(q.party_name || '');
        if (data.items && data.items.length > 0) {
          setItems(data.items.map(it => ({
            product_id: it.product_id,
            description: it.description,
            hsn_code: it.hsn_code || '',
            qty: parseFloat(it.qty || 1),
            unit: it.unit || 'Pcs',
            rate: parseFloat(it.rate || 0),
            discount: parseFloat(it.discount || 0),
            gst_rate: parseFloat(it.gst_rate || 0),
            total_sale: parseFloat(it.total_sale || 0),
            taxable_amount: parseFloat(it.taxable_amount || 0),
            cgst: parseFloat(it.cgst || 0),
            sgst: parseFloat(it.sgst || 0),
            igst: parseFloat(it.igst || 0),
          })));
        }
      }
    } catch (err) {
      toast.error('Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  const handlePartySelect = (party) => {
    setForm(prev => ({
      ...prev,
      party_id: party.id,
      party_name: party.name,
      supply_type: party.state && company?.state && party.state.toLowerCase() !== company.state.toLowerCase() ? 'interstate' : 'intrastate',
    }));
    setPartySearch(party.name);
    setShowPartyDropdown(false);
  };

  const handleProductSelect = (index, product) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      product_id: product.id,
      description: product.name,
      hsn_code: product.hsn_code || '',
      unit: product.unit || 'Pcs',
      rate: product.default_rate || '',
      gst_rate: product.gst_rate !== undefined ? parseFloat(product.gst_rate) : 5,
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
    const lineGross = qty * rate;
    const discount = Math.min(lineGross, Math.max(0, parseFloat(item.discount || 0)));
    const taxable = lineGross - discount;
    const gstRate = parseFloat(item.gst_rate || 0);

    const isInter = form.supply_type === 'interstate';
    const cgst = isInter ? 0 : taxable * (gstRate / 200);
    const sgst = isInter ? 0 : taxable * (gstRate / 200);
    const igst = isInter ? taxable * (gstRate / 100) : 0;

    itemsList[index] = {
      ...item,
      total_sale: lineGross,
      taxable_amount: taxable,
      cgst,
      sgst,
      igst,
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

  // Summary calculations
  const subtotal = items.reduce((acc, it) => acc + parseFloat(it.total_sale || 0), 0);
  const totalDiscount = items.reduce((acc, it) => acc + parseFloat(it.discount || 0), 0);
  const taxableAmount = items.reduce((acc, it) => acc + parseFloat(it.taxable_amount || 0), 0);
  const totalCgst = items.reduce((acc, it) => acc + parseFloat(it.cgst || 0), 0);
  const totalSgst = items.reduce((acc, it) => acc + parseFloat(it.sgst || 0), 0);
  const totalIgst = items.reduce((acc, it) => acc + parseFloat(it.igst || 0), 0);
  const totalGst = totalCgst + totalSgst + totalIgst;
  const grandTotal = Math.round((taxableAmount + totalGst + parseFloat(form.round_off || 0)) * 100) / 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.party_id) {
      toast.error('Please select a customer for this quotation.');
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
        const { data } = await api.put(`/quotations/${id}`, payload);
        if (data.success) {
          toast.success('Quotation updated successfully!');
          navigate(`/quotations/${id}`);
        }
      } else {
        const { data } = await api.post('/quotations', payload);
        if (data.success) {
          toast.success('Quotation created successfully!');
          navigate(`/quotations/${data.id}`);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save quotation');
    } finally {
      setSaving(false);
    }
  };

  const filteredParties = parties.filter(p =>
    p.name.toLowerCase().includes(partySearch.toLowerCase()) ||
    (p.mobile && p.mobile.includes(partySearch))
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/quotations"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {isEdit ? `Edit Quotation ${form.quotation_no}` : 'New Quotation / Estimate'}
            </h1>
            <p className="text-xs text-slate-500">Provide price estimates to customers before order confirmation</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Quote Details */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Quotation Header
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Customer Search Dropdown */}
            <div className="relative">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Customer / Party <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={partySearch}
                  onChange={(e) => {
                    setPartySearch(e.target.value);
                    setShowPartyDropdown(true);
                  }}
                  onFocus={() => setShowPartyDropdown(true)}
                  placeholder="Search customer..."
                  className="input w-full text-sm"
                  required
                />
                {form.party_id && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm(p => ({ ...p, party_id: null, party_name: '' }));
                      setPartySearch('');
                    }}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {showPartyDropdown && filteredParties.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg">
                  {filteredParties.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePartySelect(p)}
                      className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                    >
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</div>
                      <div className="text-[11px] text-slate-500">{p.mobile || 'No mobile'} &bull; GST: {p.gst_no || 'NA'}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quote Number */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Quotation No
              </label>
              <input
                type="text"
                value={form.quotation_no}
                onChange={(e) => setForm({ ...form, quotation_no: e.target.value })}
                className="input w-full text-sm font-mono"
                required
              />
            </div>

            {/* Quotation Date */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Quotation Date
              </label>
              <input
                type="date"
                value={form.quotation_date}
                onChange={(e) => setForm({ ...form, quotation_date: e.target.value })}
                className="input w-full text-sm"
                required
              />
            </div>

            {/* Valid Until */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Valid Until
              </label>
              <input
                type="date"
                value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                className="input w-full text-sm"
                placeholder="Optional validity date"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                GST Supply Type
              </label>
              <select
                value={form.supply_type}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm(prev => ({ ...prev, supply_type: val }));
                  // Recalculate taxes
                  const isInter = val === 'interstate';
                  setItems(items.map(it => {
                    const taxable = parseFloat(it.taxable_amount || 0);
                    const gstRate = parseFloat(it.gst_rate || 0);
                    return {
                      ...it,
                      cgst: isInter ? 0 : taxable * (gstRate / 200),
                      sgst: isInter ? 0 : taxable * (gstRate / 200),
                      igst: isInter ? taxable * (gstRate / 100) : 0,
                    };
                  }));
                }}
                className="input w-full text-sm"
              >
                <option value="intrastate">Intrastate (Within State - CGST + SGST)</option>
                <option value="interstate">Interstate (Outside State - IGST)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="input w-full text-sm"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent to Customer</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </div>

        {/* Line Items Section (Responsive Table on Desktop & Cards on Mobile) */}
        <div className="card p-3.5 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Quotation Items ({items.length})
            </h2>
            <button
              type="button"
              onClick={addItemRow}
              className="btn-secondary inline-flex items-center gap-1.5 text-xs py-2 px-3 rounded-xl font-bold"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
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
                  <th className="py-2.5 px-3 w-20">Qty</th>
                  <th className="py-2.5 px-3 w-24">Unit</th>
                  <th className="py-2.5 px-3 w-28">Rate (₹)</th>
                  <th className="py-2.5 px-3 w-24">Disc (₹)</th>
                  <th className="py-2.5 px-3 w-24">GST %</th>
                  <th className="py-2.5 px-3 w-28 text-right">Total (₹)</th>
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
                          placeholder="Type product or description..."
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
                                className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300"
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
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.discount}
                        onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
                        placeholder="0"
                        className="input w-full text-xs py-1.5 px-2 text-right"
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
                      ₹{((item.taxable_amount || 0) + (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0)).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded"
                        title="Remove row"
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
              const lineTotal = (item.taxable_amount || 0) + (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);
              return (
                <div key={idx} className="rounded-xl border p-3.5 bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center">
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
                      placeholder="Product / Service description..."
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
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Qty *</label>
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

                  <div className="grid grid-cols-3 gap-2">
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
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Disc (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.discount}
                        onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
                        placeholder="0"
                        className="input-field text-xs py-1.5 text-right"
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
            <Plus className="w-4 h-4" /> Add Another Item
          </button>
        </div>

        {/* Bottom Section: Notes & Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Notes / Special Instructions
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="Any special remarks or delivery timelines..."
                className="input w-full text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Terms &amp; Conditions
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
              Quotation Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Total Item Value</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Total Discount</span>
                <span className="text-slate-900 dark:text-slate-100">₹{totalDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Taxable Value</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">₹{taxableAmount.toFixed(2)}</span>
              </div>
              {form.supply_type === 'interstate' ? (
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">Total IGST</span>
                  <span className="text-slate-900 dark:text-slate-100">₹{totalIgst.toFixed(2)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Total CGST</span>
                    <span className="text-slate-900 dark:text-slate-100">₹{totalCgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Total SGST</span>
                    <span className="text-slate-900 dark:text-slate-100">₹{totalSgst.toFixed(2)}</span>
                  </div>
                </>
              )}
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
                <span className="text-slate-900 dark:text-white">Estimated Grand Total</span>
                <span className="text-blue-600 dark:text-blue-400">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Link
                to="/quotations"
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
                {saving ? 'Saving Quotation...' : isEdit ? 'Update Quotation' : 'Save Quotation'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
