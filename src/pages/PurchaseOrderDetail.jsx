import smartBack from '../utils/navigation';
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Printer, MessageCircle, Edit, PackageCheck, CheckCircle2 } from 'lucide-react';
import { LoadingState, Money } from '../components/ui';

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPo] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    fetchPo();
  }, [id]);

  const fetchPo = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/purchase-orders/${id}`);
      if (data.success) {
        setPo(data.purchase_order);
        setItems(data.items || []);
      } else {
        toast.error('Purchase Order not found');
      }
    } catch {
      toast.error('Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!window.confirm('Convert this PO to a Purchase Bill? This will officially add the items to your warehouse inventory.')) return;
    setConverting(true);
    try {
      const { data } = await api.post(`/purchase-orders/${id}/convert`);
      if (data.success) {
        toast.success(data.message || 'PO converted to Purchase Bill!');
        smartBack(navigate, '/purchases');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Conversion failed');
      setConverting(false);
    }
  };

  const handlePrint = () => {
    window.open(`/api/pdf/purchase-order/${id}`, '_blank');
  };

  const handleWhatsApp = () => {
    if (!po) return;
    const text = encodeURIComponent(
      `Hello ${po.supplier_name},\nPlease find our Purchase Order ${po.po_no} for Rs. ${Number(po.grand_total).toFixed(2)}.\nExpected Delivery: ${po.expected_delivery_date || 'Earliest'}.\nPlease confirm order acceptance.\nThank you!`
    );
    const mobile = (po.supplier_mobile || '').replace(/\D/g, '');
    const phone = mobile.length === 10 ? `91${mobile}` : mobile;
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  if (loading) return <LoadingState label="Loading purchase order..." />;
  if (!po) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-slate-500">Purchase Order not found.</p>
        <Link to="/purchase-orders" className="btn-secondary inline-block px-4 py-2 text-sm rounded-xl">
          Back to Purchase Orders
        </Link>
      </div>
    );
  }

  const isConverted = po.status === 'converted';

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/purchase-orders"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {po.po_no}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                {po.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">Commercial Procurement Order &bull; PO Date: {po.po_date}</p>
          </div>
        </div>

        {/* Actions (Wrapped & Touch Friendly on Mobile) */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
          {!isConverted ? (
            <button
              onClick={handleConvert}
              disabled={converting}
              className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-medium shadow-sm"
            >
              <PackageCheck className="w-4 h-4" />
              {converting ? 'Converting...' : 'Convert to Purchase Bill'}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Received &amp; Billed
            </span>
          )}
          <button
            onClick={handlePrint}
            className="btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl"
          >
            <Printer className="w-4 h-4" /> Print PO
          </button>
          <button
            onClick={handleWhatsApp}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl font-medium shadow-sm"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </button>
          {!isConverted && (
            <Link
              to={`/purchase-orders/${id}/edit`}
              className="btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl"
            >
              <Edit className="w-4 h-4" /> Edit
            </Link>
          )}
        </div>
      </div>

      {/* PO Detail Card */}
      <div className="card p-6 space-y-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vendor / Supplier</span>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{po.supplier_name}</div>
            {po.supplier_address && <div className="text-xs text-slate-600 dark:text-slate-400">{po.supplier_address}</div>}
            <div className="text-xs text-slate-500">
              {po.supplier_city} {po.supplier_state} &bull; Mobile: {po.supplier_mobile || 'N/A'}
            </div>
            {po.supplier_gst && po.supplier_gst !== 'NA' && (
              <div className="text-xs font-mono text-slate-600 dark:text-slate-400">GSTIN: {po.supplier_gst}</div>
            )}
          </div>

          <div className="space-y-2 md:text-right">
            <div>
              <span className="text-xs text-slate-400">PO Date:</span>
              <span className="ml-2 font-medium text-slate-800 dark:text-slate-200">{po.po_date}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400">Expected Delivery:</span>
              <span className="ml-2 font-medium text-slate-800 dark:text-slate-200">{po.expected_delivery_date || 'Earliest possible'}</span>
            </div>
            {po.converted_bill_no && (
              <div>
                <span className="text-xs text-slate-400">Converted Bill:</span>
                <span className="ml-2 font-medium text-emerald-600">{po.converted_bill_no}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items Section (Desktop Table & Mobile Cards) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2.5 px-3 w-8">#</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-center">HSN</th>
                <th className="py-2.5 px-3 text-center">Order Qty</th>
                <th className="py-2.5 px-3 text-right">Rate</th>
                <th className="py-2.5 px-3 text-right">Taxable</th>
                <th className="py-2.5 px-3 text-center">GST</th>
                <th className="py-2.5 px-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((it, idx) => (
                <tr key={it.id || idx}>
                  <td className="py-3 px-3 text-xs text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-slate-900 dark:text-white">{it.description || it.product_name}</div>
                  </td>
                  <td className="py-3 px-3 text-center text-xs text-slate-500">{it.hsn_code || '-'}</td>
                  <td className="py-3 px-3 text-center text-slate-700 dark:text-slate-300">
                    {it.qty} {it.unit || 'Pcs'}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300">₹{Number(it.rate).toFixed(2)}</td>
                  <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300">₹{Number(it.taxable_amount).toFixed(2)}</td>
                  <td className="py-3 px-3 text-center text-xs text-slate-500">{it.gst_rate}%</td>
                  <td className="py-3 px-3 text-right font-medium text-slate-900 dark:text-white">
                    ₹{Number(it.total_amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Item Cards */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((it, idx) => (
            <div key={it.id || idx} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
              <div className="flex items-start justify-between">
                <div className="font-semibold text-slate-900 dark:text-white text-sm">
                  <span className="text-xs text-slate-400 mr-1.5">#{idx + 1}</span>
                  {it.description || it.product_name}
                </div>
                <div className="text-right font-bold text-slate-900 dark:text-white text-sm">
                  ₹{Number(it.total_amount).toFixed(2)}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-1">
                <span>{it.qty} {it.unit || 'Pcs'} @ ₹{Number(it.rate).toFixed(2)}</span>
                <span>GST: {it.gst_rate}% {it.hsn_code ? `(HSN: ${it.hsn_code})` : ''}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals & Notes Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="space-y-4">
            {po.notes && (
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Remarks / Instructions</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">{po.notes}</p>
              </div>
            )}
            {po.terms && (
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Purchase Terms</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap font-mono">{po.terms}</p>
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Taxable Value</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">₹{Number(po.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Total GST</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">₹{Number(po.total_gst).toFixed(2)}</span>
            </div>
            {Number(po.round_off) !== 0 && (
              <div className="flex justify-between py-1 text-xs text-slate-500">
                <span>Round Off</span>
                <span>₹{Number(po.round_off).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-base font-bold">
              <span className="text-slate-900 dark:text-white">Total Purchase Order Value</span>
              <span className="text-emerald-600 dark:text-emerald-400">₹{Number(po.grand_total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
