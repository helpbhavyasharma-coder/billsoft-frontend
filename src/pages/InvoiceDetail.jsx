import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Edit, FileDown, ArrowLeft, Plus, Trash2, X, Printer, Share2, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { downloadInvoicePdf, shareInvoicePdf } from '../utils/invoicePdf';
import { useAuth } from '../context/AuthContext';

const statusColors = {
  unpaid: 'bg-red-100 text-red-700',
  partial: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
};

const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

// Safe date parser for both SQLite and PostgreSQL formats
const parseDate = (d) => {
  if (!d) return null;
  try {
    const str = typeof d === 'string' ? d.substring(0, 10) : String(d).substring(0, 10);
    const date = new Date(str + 'T00:00:00');
    return isNaN(date.getTime()) ? null : date;
  } catch { return null; }
};

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { company } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: '', payment_date: format(new Date(), 'yyyy-MM-dd'),
    payment_mode: 'cash', reference_no: '', notes: '',
  });
  const [returnForm, setReturnForm] = useState({
    amount: '',
    return_date: format(new Date(), 'yyyy-MM-dd'),
    reason: 'Goods return',
    notes: '',
    items: [],
  });
  const [paying, setPaying] = useState(false);
  const [returning, setReturning] = useState(false);

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    try {
      const [invRes, payRes, retRes] = await Promise.all([
        api.get(`/invoices/${id}`),
        api.get(`/payments/invoice/${id}`),
        api.get(`/goods-returns?invoice_id=${id}`),
      ]);
      if (invRes.data.success) { setInvoice(invRes.data.invoice); setItems(invRes.data.items); }
      if (payRes.data.success) setPayments(payRes.data.payments);
      if (retRes.data.success) setReturns(retRes.data.returns);
    } catch { toast.error('Failed to load invoice.'); }
    finally { setLoading(false); }
  };

  const downloadPDF = async () => {
    if (!invoice) return;
    setDownloading(true);
    try {
      await downloadInvoicePdf({ company, invoice, items });
      toast.success('PDF downloaded!');
    } catch { toast.error('Failed to generate PDF.'); }
    finally { setDownloading(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete invoice ${invoice?.invoice_no}?`)) return;
    try {
      await api.delete(`/invoices/${id}`);
      toast.success('Invoice deleted.');
      navigate('/invoices');
    } catch {
      toast.error('Failed to delete.');
    }
  };

  const handlePrint = async () => {
    try {
      const { data } = await api.get(`/pdf/invoice/${id}/preview`, { responseType: 'text' });
      const blob = new Blob([data], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch {
      toast.error('Could not open print preview.');
    }
  };

  const handleWhatsApp = async () => {
    if (!invoice) return;
    const msg = `Dear ${invoice.party_name},\n\nYour invoice *${invoice.invoice_no}* dated ${parseDate(invoice.invoice_date) ? format(parseDate(invoice.invoice_date), 'dd/MM/yyyy') : ''} for *₹${fmt(invoice.grand_total)}* is ready.\n\nPlease make payment at your earliest convenience.\n\nThank you!`;
    const toastId = toast.loading('Preparing PDF...');
    try {
      const shared = await shareInvoicePdf({ company, invoice, items }, msg);
      toast.dismiss(toastId);
      if (!shared) {
        // Desktop / unsupported: fall back to a text-only WhatsApp message.
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
      }
    } catch {
      toast.dismiss(toastId);
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) {
      toast.error('Enter valid amount.'); return;
    }
    setPaying(true);
    try {
      const { data } = await api.post('/payments', { invoice_id: parseInt(id), ...payForm });
      if (data.success) {
        toast.success('Payment recorded!');
        setShowPayModal(false);
        setPayForm({ amount: '', payment_date: format(new Date(), 'yyyy-MM-dd'), payment_mode: 'cash', reference_no: '', notes: '' });
        fetchAll();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment.');
    } finally { setPaying(false); }
  };

  const deletePayment = async (payId) => {
    if (!confirm('Delete this payment entry?')) return;
    try {
      await api.delete(`/payments/${payId}`);
      toast.success('Payment deleted.');
      fetchAll();
    } catch { toast.error('Failed to delete payment.'); }
  };

  const openReturnModal = () => {
    const returnedByItem = {};
    returns.forEach((ret) => (ret.items || []).forEach((rit) => {
      returnedByItem[rit.invoice_item_id] = (returnedByItem[rit.invoice_item_id] || 0) + parseFloat(rit.qty || 0);
    }));
    setReturnForm({
      amount: outstanding.toFixed(2),
      return_date: format(new Date(), 'yyyy-MM-dd'),
      reason: 'Goods return',
      notes: '',
      items: items.map((item) => {
        const available = Math.max(parseFloat(item.qty || 0) - parseFloat(returnedByItem[item.id] || 0), 0);
        return {
          invoice_item_id: item.id,
          description: item.description,
          qty: '',
          available_qty: available,
          unit: item.unit,
          line_rate: parseFloat(item.total_sale || 0) / Math.max(parseFloat(item.qty || 0), 1),
        };
      }),
    });
    setShowReturnModal(true);
  };

  const updateReturnItem = (idx, qty) => {
    setReturnForm((prev) => {
      const nextItems = prev.items.map((item, i) => i === idx ? { ...item, qty } : item);
      const amount = nextItems.reduce((sum, item) => sum + parseFloat(item.qty || 0) * parseFloat(item.line_rate || 0), 0);
      return { ...prev, items: nextItems, amount: amount > 0 ? amount.toFixed(2) : prev.amount };
    });
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    if (!returnForm.amount || parseFloat(returnForm.amount) <= 0) {
      toast.error('Enter valid return amount.'); return;
    }
    setReturning(true);
    try {
      const { data } = await api.post('/goods-returns', {
        invoice_id: parseInt(id),
        party_id: invoice.party_id,
        ...returnForm,
        items: returnForm.items.filter((item) => parseFloat(item.qty || 0) > 0).map((item) => ({
          invoice_item_id: item.invoice_item_id,
          qty: parseFloat(item.qty || 0),
        })),
      });
      if (data.success) {
        toast.success('Goods return recorded.');
        setShowReturnModal(false);
        fetchAll();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record goods return.');
    } finally { setReturning(false); }
  };

  const deleteReturn = async (returnId) => {
    if (!confirm('Delete this goods return entry?')) return;
    try {
      await api.delete(`/goods-returns/${returnId}`);
      toast.success('Goods return deleted.');
      fetchAll();
    } catch { toast.error('Failed to delete goods return.'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );
  if (!invoice) return <div className="text-center py-12" style={{color:'var(--text-3)'}}>Invoice not found.</div>;

  const returnedTotal = parseFloat(invoice.goods_return_total || 0);
  const outstanding = Math.max(parseFloat(invoice.grand_total) - parseFloat(invoice.amount_paid || 0) - returnedTotal, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/invoices')} style={{color:'var(--text-3)'}}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{color:'var(--text)'}}>{invoice.invoice_no}</h1>
            <p className="text-sm" style={{color:'var(--text-3)'}}>
              {invoice.invoice_date ? parseDate(invoice.invoice_date) ? format(parseDate(invoice.invoice_date), 'dd MMM yyyy') : '' : ''}
            </p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[invoice.payment_status] || 'bg-gray-100 text-gray-600'}`}>
            {invoice.payment_status}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {invoice.payment_status !== 'paid' && (
            <button onClick={() => { setPayForm(p => ({ ...p, amount: outstanding.toFixed(2) })); setShowPayModal(true); }}
              className="btn-success flex items-center gap-1.5 text-sm">
              <Plus className="w-4 h-4" /> Add Payment
            </button>
          )}
          <button onClick={openReturnModal} className="btn-secondary flex items-center gap-1.5 text-sm text-orange-700 border-orange-200 hover:bg-orange-50">
            <RotateCcw className="w-4 h-4" /> Goods Return
          </button>
          <button onClick={handleWhatsApp} className="btn-secondary flex items-center gap-1.5 text-sm text-green-700 border-green-200 hover:bg-green-50">
            <Share2 className="w-4 h-4" /> WhatsApp
          </button>
          <button onClick={handlePrint} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Printer className="w-4 h-4" /> Print
          </button>
          <Link to={`/invoices/${id}/edit`} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Edit className="w-4 h-4" /> Edit
          </Link>
          <button onClick={handleDelete} className="btn-danger flex items-center gap-1.5 text-sm">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
          <button onClick={downloadPDF} disabled={downloading} className="btn-primary flex items-center gap-1.5 text-sm">
            <FileDown className="w-4 h-4" />
            {downloading ? 'Generating...' : 'PDF'}
          </button>
        </div>
      </div>

      {/* Payment Summary Bar */}
      {invoice.payment_status !== 'paid' && (
        <div className="card py-3" style={{borderColor:'rgba(251,146,60,0.5)', backgroundColor:'rgba(255,237,213,0.15)'}}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-6 text-sm">
              <div><span style={{color:'var(--text-3)'}}>Total: </span><span className="font-bold" style={{color:'var(--text)'}}>₹{fmt(invoice.grand_total)}</span></div>
              <div><span style={{color:'var(--text-3)'}}>Paid: </span><span className="font-bold text-green-600">₹{fmt(invoice.amount_paid)}</span></div>
              {returnedTotal > 0 && <div><span style={{color:'var(--text-3)'}}>Goods Return: </span><span className="font-bold text-orange-600">₹{fmt(returnedTotal)}</span></div>}
              <div><span style={{color:'var(--text-3)'}}>Outstanding: </span><span className="font-bold text-red-600">₹{fmt(outstanding)}</span></div>
            </div>
            <button onClick={() => { setPayForm(p => ({ ...p, amount: outstanding.toFixed(2) })); setShowPayModal(true); }}
              className="btn-primary text-sm py-1.5">
              Record Payment
            </button>
          </div>
        </div>
      )}

      {/* Invoice Card */}
      <div className="card">
        <div className="grid grid-cols-2 gap-6 mb-4 pb-4" style={{borderBottom:'1px solid var(--border)'}}>
          <div>
            <p className="text-xs uppercase font-semibold mb-1" style={{color:'var(--text-3)'}}>Bill To</p>
            <p className="font-semibold" style={{color:'var(--text)'}}>{invoice.party_name}</p>
            {invoice.party_address && <p className="text-sm" style={{color:'var(--text-2)'}}>{invoice.party_address} {invoice.party_city}</p>}
            {invoice.party_mobile && <p className="text-sm" style={{color:'var(--text-2)'}}>{invoice.party_mobile}</p>}
            {invoice.party_gst && invoice.party_gst !== 'NA' && <p className="text-sm" style={{color:'var(--text-2)'}}>GST: {invoice.party_gst}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase font-semibold mb-1" style={{color:'var(--text-3)'}}>Invoice Details</p>
            <p className="font-semibold" style={{color:'var(--text)'}}>{invoice.invoice_no}</p>
            <p className="text-sm" style={{color:'var(--text-2)'}}>Date: {parseDate(invoice.invoice_date) ? format(parseDate(invoice.invoice_date), 'dd/MM/yyyy') : ''}</p>
            {invoice.due_date && <p className="text-sm" style={{color:'var(--text-2)'}}>Due: {parseDate(invoice.due_date) ? format(parseDate(invoice.due_date), 'dd/MM/yyyy') : ''}</p>}
            <p className="text-sm capitalize" style={{color:'var(--text-2)'}}>Supply: {invoice.supply_type}</p>
          </div>
        </div>

        {/* Items */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr style={{backgroundColor:'var(--bg-muted)', borderBottom:'1px solid var(--border)'}}>
                {['#','Description','HSN','Qty','Unit','Rate','Total','GST%','CGST','SGST','IGST'].map(h => (
                  <th key={h} className="px-2 py-2 text-xs font-semibold text-left" style={{color:'var(--text-3)'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id}
                  style={{borderBottom:'1px solid var(--border)'}}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor='var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
                  <td className="px-2 py-2" style={{color:'var(--text-3)'}}>{idx + 1}</td>
                  <td className="px-2 py-2 font-medium" style={{color:'var(--text)'}}>{item.description}</td>
                  <td className="px-2 py-2" style={{color:'var(--text-3)'}}>{item.hsn_code}</td>
                  <td className="px-2 py-2" style={{color:'var(--text-2)'}}>{parseFloat(item.qty).toFixed(2)}</td>
                  <td className="px-2 py-2" style={{color:'var(--text-3)'}}>{item.unit}</td>
                  <td className="px-2 py-2 text-right" style={{color:'var(--text-2)'}}>₹{fmt(item.rate)}</td>
                  <td className="px-2 py-2 text-right font-medium" style={{color:'var(--text)'}}>₹{fmt(item.total_sale)}</td>
                  <td className="px-2 py-2 text-center" style={{color:'var(--text-3)'}}>{item.gst_rate}%</td>
                  <td className="px-2 py-2 text-right" style={{color:'var(--text-3)'}}>{fmt(item.cgst)}</td>
                  <td className="px-2 py-2 text-right" style={{color:'var(--text-3)'}}>{fmt(item.sgst)}</td>
                  <td className="px-2 py-2 text-right" style={{color:'var(--text-3)'}}>{fmt(item.igst)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between" style={{color:'var(--text-2)'}}><span>Subtotal</span><span>₹{fmt(invoice.subtotal)}</span></div>
            {parseFloat(invoice.total_discount) > 0 && <div className="flex justify-between" style={{color:'var(--text-2)'}}><span>Discount</span><span>-₹{fmt(invoice.total_discount)}</span></div>}
            <div className="flex justify-between" style={{color:'var(--text-2)'}}><span>Taxable</span><span>₹{fmt(invoice.taxable_amount)}</span></div>
            {parseFloat(invoice.total_cgst) > 0 && <div className="flex justify-between" style={{color:'var(--text-2)'}}><span>CGST</span><span>₹{fmt(invoice.total_cgst)}</span></div>}
            {parseFloat(invoice.total_sgst) > 0 && <div className="flex justify-between" style={{color:'var(--text-2)'}}><span>SGST</span><span>₹{fmt(invoice.total_sgst)}</span></div>}
            {parseFloat(invoice.total_igst) > 0 && <div className="flex justify-between" style={{color:'var(--text-2)'}}><span>IGST</span><span>₹{fmt(invoice.total_igst)}</span></div>}
            {returnedTotal > 0 && <div className="flex justify-between text-orange-600"><span>Goods Return</span><span>-₹{fmt(returnedTotal)}</span></div>}
            <div className="flex justify-between font-bold text-base pt-2" style={{color:'var(--text)', borderTop:'1px solid var(--border)'}}>
              <span>Grand Total</span><span>₹{fmt(invoice.grand_total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Goods Return History */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold" style={{color:'var(--text)'}}>Goods Return / Credit Notes</h2>
          <button onClick={openReturnModal} className="btn-secondary text-xs py-1.5 flex items-center gap-1 text-orange-700">
            <RotateCcw className="w-3.5 h-3.5" /> Add Return
          </button>
        </div>
        {returns.length === 0 ? (
          <p className="text-sm text-center py-4" style={{color:'var(--text-3)'}}>No goods return recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{borderBottom:'1px solid var(--border)'}}>
                <th className="table-header text-left">Date</th>
                <th className="table-header text-left">Return No.</th>
                <th className="table-header text-left">Reason</th>
                <th className="table-header text-right">Amount</th>
                <th className="table-header text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id} style={{borderBottom:'1px solid var(--border)'}}>
                  <td className="table-cell">{format(new Date(r.return_date), 'dd MMM yyyy')}</td>
                  <td className="table-cell font-medium text-orange-700">{r.return_no}</td>
                  <td className="table-cell" style={{color:'var(--text-3)'}}>{r.reason || r.notes || '-'}</td>
                  <td className="table-cell text-right font-semibold text-orange-600">₹{fmt(r.amount)}</td>
                  <td className="table-cell text-center">
                    <button onClick={() => deleteReturn(r.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{backgroundColor:'rgba(249,115,22,0.08)'}}>
                <td colSpan={3} className="table-cell font-semibold text-orange-700">Total Adjustment</td>
                <td className="table-cell text-right font-bold text-orange-600">₹{fmt(returnedTotal)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Payment History */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold" style={{color:'var(--text)'}}>Payment History</h2>
          {invoice.payment_status !== 'paid' && (
            <button onClick={() => setShowPayModal(true)} className="btn-primary text-xs py-1.5 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add Payment
            </button>
          )}
        </div>

        {payments.length === 0 ? (
          <p className="text-sm text-center py-4" style={{color:'var(--text-3)'}}>No payments recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{borderBottom:'1px solid var(--border)'}}>
                <th className="table-header text-left">Date</th>
                <th className="table-header text-left">Mode</th>
                <th className="table-header text-left">Reference</th>
                <th className="table-header text-right">Amount</th>
                <th className="table-header text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}
                  style={{borderBottom:'1px solid var(--border)'}}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor='var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
                  <td className="table-cell">{format(new Date(p.payment_date), 'dd MMM yyyy')}</td>
                  <td className="table-cell capitalize">{p.payment_mode}</td>
                  <td className="table-cell" style={{color:'var(--text-3)'}}>{p.reference_no || '-'}</td>
                  <td className="table-cell text-right font-semibold text-green-600">₹{fmt(p.amount)}</td>
                  <td className="table-cell text-center">
                    <button onClick={() => deletePayment(p.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{backgroundColor:'var(--bg-muted)'}}>
                <td colSpan={3} className="table-cell font-semibold" style={{color:'var(--text)'}}>Total Paid</td>
                <td className="table-cell text-right font-bold text-green-600">₹{fmt(invoice.amount_paid)}</td>
                <td></td>
              </tr>
              {outstanding > 0 && (
                <tr style={{backgroundColor:'rgba(220,38,38,0.08)'}}>
                  <td colSpan={3} className="table-cell font-semibold text-red-700">Outstanding</td>
                  <td className="table-cell text-right font-bold text-red-600">₹{fmt(outstanding)}</td>
                  <td></td>
                </tr>
              )}
            </tfoot>
          </table>
        )}
      </div>

      {/* Goods Return Modal */}
      {showReturnModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="flex items-center justify-between p-5" style={{borderBottom:'1px solid var(--border)'}}>
              <h2 className="text-lg font-semibold" style={{color:'var(--text)'}}>Goods Return</h2>
              <button onClick={() => setShowReturnModal(false)} style={{color:'var(--text-3)'}}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReturn} className="p-5 space-y-4">
              <div className="rounded-lg p-3 text-sm" style={{backgroundColor:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.25)'}}>
                <div className="flex justify-between"><span style={{color:'var(--text-3)'}}>Invoice Total</span><span className="font-bold" style={{color:'var(--text)'}}>₹{fmt(invoice.grand_total)}</span></div>
                <div className="flex justify-between"><span style={{color:'var(--text-3)'}}>Paid</span><span className="font-bold text-green-600">₹{fmt(invoice.amount_paid)}</span></div>
                <div className="flex justify-between"><span style={{color:'var(--text-3)'}}>Old Return</span><span className="font-bold text-orange-600">₹{fmt(returnedTotal)}</span></div>
                <div className="flex justify-between mt-1 pt-1" style={{borderTop:'1px solid var(--border)'}}><span style={{color:'var(--text-3)'}}>Current Outstanding</span><span className="font-bold text-red-600">₹{fmt(outstanding)}</span></div>
              </div>
              <div>
                <label className="label">Return Amount *</label>
                <input type="number" className="input-field" value={returnForm.amount}
                  onChange={(e) => setReturnForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00" min="0.01" step="0.01" required autoFocus />
              </div>
              {returnForm.items.length > 0 && (
                <div>
                  <label className="label">Item-wise Return Qty</label>
                  <div className="max-h-48 overflow-auto rounded-lg" style={{border:'1px solid var(--border)'}}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{borderBottom:'1px solid var(--border)'}}>
                          <th className="table-header text-left">Item</th>
                          <th className="table-header text-right">Available</th>
                          <th className="table-header text-right">Return</th>
                        </tr>
                      </thead>
                      <tbody>
                        {returnForm.items.map((item, idx) => (
                          <tr key={item.invoice_item_id} style={{borderBottom:'1px solid var(--border)'}}>
                            <td className="table-cell">{item.description}</td>
                            <td className="table-cell text-right">{item.available_qty} {item.unit}</td>
                            <td className="table-cell text-right">
                              <input
                                type="number"
                                min="0"
                                max={item.available_qty}
                                step="0.001"
                                className="input-field text-right"
                                value={item.qty}
                                onChange={(e) => updateReturnItem(idx, e.target.value)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs mt-1" style={{color:'var(--text-3)'}}>Qty भरने पर return amount auto-calculate होगा और stock वापस आएगा.</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Return Date *</label>
                  <input type="date" className="input-field" value={returnForm.return_date}
                    onChange={(e) => setReturnForm(p => ({ ...p, return_date: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Reason</label>
                  <input type="text" className="input-field" value={returnForm.reason}
                    onChange={(e) => setReturnForm(p => ({ ...p, reason: e.target.value }))}
                    placeholder="Damage / expiry / wrong item" />
                </div>
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <input type="text" className="input-field" value={returnForm.notes}
                  onChange={(e) => setReturnForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Item detail or remarks" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowReturnModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={returning} className="btn-primary flex-1">
                  {returning ? 'Saving...' : 'Save Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="flex items-center justify-between p-5" style={{borderBottom:'1px solid var(--border)'}}>
              <h2 className="text-lg font-semibold" style={{color:'var(--text)'}}>Record Payment</h2>
              <button onClick={() => setShowPayModal(false)} style={{color:'var(--text-3)'}}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePayment} className="p-5 space-y-4">
              <div className="rounded-lg p-3 text-sm" style={{backgroundColor:'var(--bg-muted)', border:'1px solid var(--border)'}}>
              <div className="flex justify-between"><span style={{color:'var(--text-3)'}}>Invoice Total</span><span className="font-bold" style={{color:'var(--text)'}}>₹{fmt(invoice.grand_total)}</span></div>
              <div className="flex justify-between"><span style={{color:'var(--text-3)'}}>Already Paid</span><span className="font-bold text-green-600">₹{fmt(invoice.amount_paid)}</span></div>
              {returnedTotal > 0 && <div className="flex justify-between"><span style={{color:'var(--text-3)'}}>Goods Return</span><span className="font-bold text-orange-600">₹{fmt(returnedTotal)}</span></div>}
              <div className="flex justify-between mt-1 pt-1" style={{borderTop:'1px solid var(--border)'}}><span style={{color:'var(--text-3)'}}>Outstanding</span><span className="font-bold text-red-600">₹{fmt(outstanding)}</span></div>
              </div>
              <div>
                <label className="label">Amount Received *</label>
                <input type="number" className="input-field" value={payForm.amount}
                  onChange={(e) => setPayForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00" min="0.01" step="0.01" required autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Payment Date *</label>
                  <input type="date" className="input-field" value={payForm.payment_date}
                    onChange={(e) => setPayForm(p => ({ ...p, payment_date: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Payment Mode</label>
                  <select className="input-field" value={payForm.payment_mode}
                    onChange={(e) => setPayForm(p => ({ ...p, payment_mode: e.target.value }))}>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Reference No. (optional)</label>
                <input type="text" className="input-field" value={payForm.reference_no}
                  onChange={(e) => setPayForm(p => ({ ...p, reference_no: e.target.value }))}
                  placeholder="UTR / Cheque no." />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowPayModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={paying} className="btn-success flex-1">
                  {paying ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
