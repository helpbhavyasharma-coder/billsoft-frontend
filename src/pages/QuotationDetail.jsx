import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Printer, MessageCircle, Edit, ArrowRightCircle, CheckCircle2, Clock, Calendar, Building, FileText } from 'lucide-react';
import { PageHeader, LoadingState, Money } from '../components/ui';

export default function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  const fetchQuotation = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/quotations/${id}`);
      if (data.success) {
        setQuotation(data.quotation);
        setItems(data.items || []);
      } else {
        toast.error('Quotation not found');
      }
    } catch {
      toast.error('Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!window.confirm('Convert this quotation to a Tax Invoice now? This will create an official invoice and deduct inventory.')) return;
    setConverting(true);
    try {
      const { data } = await api.post(`/quotations/${id}/convert`);
      if (data.success) {
        toast.success(data.message || 'Quotation converted successfully!');
        navigate(`/invoices/${data.invoice_id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to convert quotation');
      setConverting(false);
    }
  };

  const handlePrint = () => {
    window.open(`/api/pdf/quotation/${id}`, '_blank');
  };

  const handleWhatsApp = () => {
    if (!quotation) return;
    const text = encodeURIComponent(
      `Hello ${quotation.party_name},\nHere is your quotation ${quotation.quotation_no} for Rs. ${Number(quotation.grand_total).toFixed(2)}.\nPlease review and reply with your approval.\nThank you!`
    );
    const mobile = (quotation.party_mobile || '').replace(/\D/g, '');
    const phone = mobile.length === 10 ? `91${mobile}` : mobile;
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  if (loading) return <LoadingState label="Loading quotation details..." />;
  if (!quotation) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-slate-500">Quotation not found or removed.</p>
        <Link to="/quotations" className="btn-secondary inline-block px-4 py-2 text-sm rounded-xl">
          Back to Quotations
        </Link>
      </div>
    );
  }

  const isConverted = quotation.status === 'converted';

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/quotations"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {quotation.quotation_no}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                {quotation.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">Commercial Price Estimate &bull; Issued {quotation.quotation_date}</p>
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
              <ArrowRightCircle className="w-4 h-4" />
              {converting ? 'Converting...' : 'Convert to Invoice'}
            </button>
          ) : (
            <Link
              to={`/invoices/${quotation.converted_invoice_id}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl text-xs font-semibold"
            >
              <CheckCircle2 className="w-4 h-4" /> Converted (Invoice #{quotation.converted_invoice_no})
            </Link>
          )}
          <button
            onClick={handlePrint}
            className="btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl"
          >
            <Printer className="w-4 h-4" /> Print / PDF
          </button>
          <button
            onClick={handleWhatsApp}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl font-medium shadow-sm"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </button>
          {!isConverted && (
            <Link
              to={`/quotations/${id}/edit`}
              className="btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl"
            >
              <Edit className="w-4 h-4" /> Edit
            </Link>
          )}
        </div>
      </div>

      {/* Quotation Detail Card */}
      <div className="card p-6 space-y-6 shadow-sm">
        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quotation For</span>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{quotation.party_name}</div>
            {quotation.party_address && <div className="text-xs text-slate-600 dark:text-slate-400">{quotation.party_address}</div>}
            <div className="text-xs text-slate-500">
              {quotation.party_city} {quotation.party_state} &bull; Mobile: {quotation.party_mobile || 'N/A'}
            </div>
            {quotation.party_gst && quotation.party_gst !== 'NA' && (
              <div className="text-xs font-mono text-slate-600 dark:text-slate-400">GSTIN: {quotation.party_gst}</div>
            )}
          </div>

          <div className="space-y-2 md:text-right">
            <div>
              <span className="text-xs text-slate-400">Quotation Date:</span>
              <span className="ml-2 font-medium text-slate-800 dark:text-slate-200">{quotation.quotation_date}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400">Valid Until:</span>
              <span className="ml-2 font-medium text-slate-800 dark:text-slate-200">{quotation.valid_until || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400">Supply Type:</span>
              <span className="ml-2 capitalize font-medium text-slate-800 dark:text-slate-200">{quotation.supply_type || 'Intrastate'}</span>
            </div>
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
                <th className="py-2.5 px-3 text-center">Qty</th>
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
                    <div className="font-medium text-slate-900 dark:text-white">{it.description}</div>
                  </td>
                  <td className="py-3 px-3 text-center text-xs text-slate-500">{it.hsn_code || '-'}</td>
                  <td className="py-3 px-3 text-center text-slate-700 dark:text-slate-300">
                    {it.qty} {it.unit}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300">₹{Number(it.rate).toFixed(2)}</td>
                  <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300">₹{Number(it.taxable_amount).toFixed(2)}</td>
                  <td className="py-3 px-3 text-center text-xs text-slate-500">{it.gst_rate}%</td>
                  <td className="py-3 px-3 text-right font-medium text-slate-900 dark:text-white">
                    ₹{(Number(it.taxable_amount || 0) + Number(it.cgst || 0) + Number(it.sgst || 0) + Number(it.igst || 0)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Item Cards */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((it, idx) => {
            const lineTotal = Number(it.taxable_amount || 0) + Number(it.cgst || 0) + Number(it.sgst || 0) + Number(it.igst || 0);
            return (
              <div key={it.id || idx} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                <div className="flex items-start justify-between">
                  <div className="font-semibold text-slate-900 dark:text-white text-sm">
                    <span className="text-xs text-slate-400 mr-1.5">#{idx + 1}</span>
                    {it.description}
                  </div>
                  <div className="text-right font-bold text-slate-900 dark:text-white text-sm">
                    ₹{lineTotal.toFixed(2)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-1">
                  <span>{it.qty} {it.unit} @ ₹{Number(it.rate).toFixed(2)}</span>
                  <span>GST: {it.gst_rate}% {it.hsn_code ? `(HSN: ${it.hsn_code})` : ''}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals & Notes Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="space-y-4">
            {quotation.notes && (
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Notes</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">{quotation.notes}</p>
              </div>
            )}
            {quotation.terms && (
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Terms &amp; Conditions</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap font-mono">{quotation.terms}</p>
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">₹{Number(quotation.subtotal).toFixed(2)}</span>
            </div>
            {Number(quotation.total_discount) > 0 && (
              <div className="flex justify-between py-1 text-emerald-600">
                <span>Discount</span>
                <span>-₹{Number(quotation.total_discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Taxable Value</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">₹{Number(quotation.taxable_amount).toFixed(2)}</span>
            </div>
            {Number(quotation.total_cgst) > 0 && (
              <div className="flex justify-between py-1 text-xs text-slate-500">
                <span>CGST</span>
                <span>₹{Number(quotation.total_cgst).toFixed(2)}</span>
              </div>
            )}
            {Number(quotation.total_sgst) > 0 && (
              <div className="flex justify-between py-1 text-xs text-slate-500">
                <span>SGST</span>
                <span>₹{Number(quotation.total_sgst).toFixed(2)}</span>
              </div>
            )}
            {Number(quotation.total_igst) > 0 && (
              <div className="flex justify-between py-1 text-xs text-slate-500">
                <span>IGST</span>
                <span>₹{Number(quotation.total_igst).toFixed(2)}</span>
              </div>
            )}
            {Number(quotation.round_off) !== 0 && (
              <div className="flex justify-between py-1 text-xs text-slate-500">
                <span>Round Off</span>
                <span>₹{Number(quotation.round_off).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-base font-bold">
              <span className="text-slate-900 dark:text-white">Estimated Grand Total</span>
              <span className="text-blue-600 dark:text-blue-400">₹{Number(quotation.grand_total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
