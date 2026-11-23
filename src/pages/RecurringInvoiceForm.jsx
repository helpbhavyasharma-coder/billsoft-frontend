import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Plus, Trash2, Save, Calculator,
  Calendar, User, FileText, Repeat, Layers
} from 'lucide-react';
import { PageHeader, Money, LoadingState } from '../components/ui';

const GST_RATES = [0, 5, 12, 18, 28];
const FREQUENCIES = [
  { id: 'weekly', label: 'Weekly (Every 7 Days)' },
  { id: 'monthly', label: 'Monthly (Every Month)' },
  { id: 'quarterly', label: 'Quarterly (Every 3 Months)' },
  { id: 'yearly', label: 'Yearly (Annual)' },
];

export default function RecurringInvoiceForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [parties, setParties] = useState([]);
  const [products, setProducts] = useState([]);

  // Form State
  const [partyId, setPartyId] = useState('');
  const [profileName, setProfileName] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [nextRunDate, setNextRunDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');

  const [items, setItems] = useState([
    {
      product_id: '',
      description: '',
      hsn_code: '',
      qty: 1,
      unit: 'Pcs',
      rate: '',
      discount_percent: 0,
      gst_rate: 18,
    }
  ]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [partiesRes, productsRes] = await Promise.all([
        api.get('/parties'),
        api.get('/products')
      ]);
      setParties(partiesRes.data?.parties || []);
      setProducts(productsRes.data?.products || []);

      if (isEdit) {
        const profileRes = await api.get(`/recurring-invoices/${id}`);
        if (profileRes.data?.success) {
          const rec = profileRes.data.recurring_invoice;
          setPartyId(rec.party_id.toString());
          setProfileName(rec.profile_name || '');
          setFrequency(rec.frequency || 'monthly');
          setStartDate(rec.start_date || '');
          setNextRunDate(rec.next_run_date || '');
          setEndDate(rec.end_date || '');
          setNotes(rec.notes || '');
          setTerms(rec.terms_conditions || '');

          if (rec.items && rec.items.length > 0) {
            setItems(rec.items.map(it => ({
              product_id: it.product_id ? it.product_id.toString() : '',
              description: it.description || '',
              hsn_code: it.hsn_code || '',
              qty: parseFloat(it.qty) || 1,
              unit: it.unit || 'Pcs',
              rate: it.rate || '',
              discount_percent: parseFloat(it.discount_percent) || 0,
              gst_rate: parseFloat(it.tax_rate) || 18,
            })));
          }
        }
      }
    } catch (err) {
      toast.error('Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (index, prodId) => {
    const prod = products.find(p => p.id.toString() === prodId);
    setItems(prev => {
      const next = [...prev];
      if (prod) {
        next[index] = {
          ...next[index],
          product_id: prodId,
          description: prod.name,
          hsn_code: prod.hsn_code || '',
          unit: prod.unit || 'Pcs',
          rate: prod.default_rate || prod.selling_price || '',
          gst_rate: parseFloat(prod.gst_rate) || 18,
        };
      } else {
        next[index] = {
          ...next[index],
          product_id: '',
          description: '',
          rate: '',
        };
      }
      return next;
    });
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addItemRow = () => {
    setItems(prev => [
      ...prev,
      {
        product_id: '',
        description: '',
        hsn_code: '',
        qty: 1,
        unit: 'Pcs',
        rate: '',
        discount_percent: 0,
        gst_rate: 18,
      }
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) {
      toast.error('At least one item is required');
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const calculatedItems = items.map(it => {
    const qty = parseFloat(it.qty) || 0;
    const rate = parseFloat(it.rate) || 0;
    const discPct = parseFloat(it.discount_percent) || 0;
    const gross = qty * rate;
    const discAmt = gross * (discPct / 100);
    const taxable = gross - discAmt;
    const gstRate = parseFloat(it.gst_rate) || 0;
    const taxAmt = taxable * (gstRate / 100);
    const lineTotal = taxable + taxAmt;
    return { ...it, taxable, taxAmt, lineTotal, discAmt };
  });

  const subtotal = calculatedItems.reduce((sum, it) => sum + (parseFloat(it.qty || 0) * parseFloat(it.rate || 0)), 0);
  const totalDiscount = calculatedItems.reduce((sum, it) => sum + it.discAmt, 0);
  const totalTax = calculatedItems.reduce((sum, it) => sum + it.taxAmt, 0);
  const grandTotal = subtotal - totalDiscount + totalTax;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!partyId) {
      toast.error('Select a customer party');
      return;
    }
    if (!profileName.trim()) {
      toast.error('Enter a profile name');
      return;
    }
    if (items.some(it => !it.description.trim() || !(parseFloat(it.rate) >= 0))) {
      toast.error('Complete all item rows with description and valid rate');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        party_id: parseInt(partyId),
        profile_name: profileName.trim(),
        frequency,
        start_date: startDate,
        next_run_date: nextRunDate,
        end_date: endDate || null,
        notes,
        terms_conditions: terms,
        items: items.map(it => ({
          product_id: it.product_id ? parseInt(it.product_id) : null,
          description: it.description,
          hsn_code: it.hsn_code,
          qty: parseFloat(it.qty),
          unit: it.unit,
          rate: parseFloat(it.rate),
          discount_percent: parseFloat(it.discount_percent) || 0,
          gst_rate: parseFloat(it.gst_rate) || 0,
        }))
      };

      if (isEdit) {
        const res = await api.put(`/recurring-invoices/${id}`, payload);
        if (res.data?.success) {
          toast.success('Recurring profile updated successfully');
          navigate('/recurring-invoices');
        }
      } else {
        const res = await api.post('/recurring-invoices', payload);
        if (res.data?.success) {
          toast.success('Recurring profile created successfully');
          navigate('/recurring-invoices');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save recurring profile');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading recurring schedule configuration..." />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/recurring-invoices" className="btn-secondary p-2">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {isEdit ? 'Edit Recurring Invoice Profile' : 'New Recurring Invoice Profile'}
            </h1>
            <p className="text-xs text-slate-500">
              Configure subscription terms, automated cycle, and recurring line items.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary flex items-center gap-1.5 text-xs sm:text-sm"
        >
          <Save className="w-4 h-4" />
          {submitting ? 'Saving...' : isEdit ? 'Update Schedule' : 'Activate Schedule'}
        </button>
      </div>

      {/* Profile & Party Configuration */}
      <div className="card grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
            Schedule Name / Subscription *
          </label>
          <input
            type="text"
            placeholder="e.g. Monthly Office Maintenance, Retainer Fee"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            required
            className="input text-xs font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
            Customer / Party *
          </label>
          <select
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
            required
            className="input text-xs font-medium"
          >
            <option value="">Select customer...</option>
            {parties.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} {p.mobile ? `(${p.mobile})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
            Billing Frequency *
          </label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="input text-xs font-semibold text-blue-600 dark:text-blue-400"
          >
            {FREQUENCIES.map(f => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
            Start Date *
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="input text-xs font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
            Next Run Date *
          </label>
          <input
            type="date"
            value={nextRunDate}
            onChange={(e) => setNextRunDate(e.target.value)}
            required
            className="input text-xs font-medium border-amber-300 dark:border-amber-800"
          />
          <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5">
            Invoice will be generated on this date
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
            End Date (Optional)
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input text-xs font-medium"
          />
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Leave blank for infinite continuous subscription
          </span>
        </div>
      </div>

      {/* Items Section */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Recurring Line Items</h3>
            <p className="text-xs text-slate-500">Products or subscription services billed every cycle.</p>
          </div>
          <button
            type="button"
            onClick={addItemRow}
            className="btn-secondary text-xs flex items-center gap-1 py-1.5 px-3"
          >
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
        </div>

        <div className="space-y-3">
          {items.map((it, idx) => {
            const calc = calculatedItems[idx];
            return (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 rounded-xl border items-end"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-muted)' }}
              >
                <div className="sm:col-span-3">
                  <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                    Product / Service
                  </label>
                  <select
                    value={it.product_id}
                    onChange={(e) => handleProductSelect(idx, e.target.value)}
                    className="input text-xs mb-1"
                  >
                    <option value="">Custom Item / Service...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Description..."
                    value={it.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    className="input text-xs"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">HSN / SAC</label>
                  <input
                    type="text"
                    placeholder="HSN"
                    value={it.hsn_code}
                    onChange={(e) => handleItemChange(idx, 'hsn_code', e.target.value)}
                    className="input text-xs font-mono"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Qty</label>
                  <input
                    type="number"
                    step="any"
                    value={it.qty}
                    onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                    className="input text-xs font-mono"
                    required
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Unit</label>
                  <input
                    type="text"
                    value={it.unit}
                    onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                    className="input text-xs font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={it.rate}
                    onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                    className="input text-xs font-mono font-semibold"
                    required
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">GST %</label>
                  <select
                    value={it.gst_rate}
                    onChange={(e) => handleItemChange(idx, 'gst_rate', e.target.value)}
                    className="input text-xs font-mono"
                  >
                    {GST_RATES.map(r => (
                      <option key={r} value={r}>{r}%</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-1 text-right">
                  <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Total</label>
                  <p className="font-mono font-bold text-xs py-2 text-slate-800 dark:text-slate-200">
                    ₹{calc ? calc.lineTotal.toFixed(2) : '0.00'}
                  </p>
                </div>

                <div className="sm:col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Calculation Totals */}
        <div className="pt-4 border-t flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" style={{ borderColor: 'var(--border)' }}>
          <div className="text-xs text-slate-500 max-w-md">
            Taxable and GST calculations will be replicated onto each automatically generated invoice with standard double-entry accounting.
          </div>

          <div className="w-full sm:w-72 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-amber-600">
                <span>Discount:</span>
                <span>- ₹{totalDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>GST Tax Amount:</span>
              <span>+ ₹{totalTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t text-blue-600 dark:text-blue-400" style={{ borderColor: 'var(--border)' }}>
              <span>Cycle Grand Total:</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      <div className="card grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
            Notes / Internal Instructions
          </label>
          <textarea
            rows="3"
            placeholder="Add internal notes or customer subscription reminders..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input text-xs font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
            Terms & Conditions (Printed on Invoices)
          </label>
          <textarea
            rows="3"
            placeholder="Recurring subscription terms, cancellation policy..."
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            className="input text-xs font-medium"
          />
        </div>
      </div>
    </form>
  );
}
