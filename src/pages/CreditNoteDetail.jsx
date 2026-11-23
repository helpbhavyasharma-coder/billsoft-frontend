import smartBack from '../utils/navigation';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Printer, MessageCircle, Trash2, Calendar, User, FileText, Package, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { PageHeader, Money, LoadingState } from '../components/ui';

export default function CreditNoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [creditNote, setCreditNote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/credit-notes/${id}`);
      if (data.success && (data.credit_note || data.return)) {
        setCreditNote(data.credit_note || data.return);
      } else {
        toast.error('Credit note not found');
        smartBack(navigate, '/credit-notes');
      }
    } catch (err) {
      toast.error('Failed to load credit note details');
      smartBack(navigate, '/credit-notes');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.open(`/api/pdf/credit-note/${id}`, '_blank');
  };

  const handleWhatsApp = () => {
    if (!creditNote) return;
    const text = encodeURIComponent(
      `Hello ${creditNote.party_name},\nYour Credit Note ${creditNote.return_no} for Rs. ${Number(creditNote.amount).toFixed(2)} has been recorded.\nReason: ${creditNote.reason || 'Goods Return'}\nYour account balance has been credited accordingly.\nThank you!`
    );
    const mobile = (creditNote.party_mobile || '').replace(/\D/g, '');
    const phoneParam = mobile.length === 10 ? `91${mobile}` : mobile;
    window.open(`https://wa.me/${phoneParam}?text=${text}`, '_blank');
  };

  const handleDelete = async () => {
    if (!creditNote) return;
    if (!window.confirm(`Are you sure you want to cancel Credit Note ${creditNote.return_no}? This will reverse restored stock and adjust customer ledger.`)) return;
    try {
      const { data } = await api.delete(`/credit-notes/${id}`);
      if (data.success) {
        toast.success(data.message || 'Credit note cancelled successfully');
        smartBack(navigate, '/credit-notes');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel credit note');
    }
  };

  if (loading) return <LoadingState message="Loading credit note details..." />;
  if (!creditNote) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => smartBack(navigate, '/credit-notes')}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {creditNote.return_no}
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                Credit Note
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Issued on {creditNote.return_date}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print / PDF
          </button>
          {creditNote.party_mobile && (
            <button
              onClick={handleWhatsApp}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
          )}
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Cancel Note
          </button>
        </div>
      </div>

      {/* Info Notice */}
      <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl p-4 flex items-start gap-3 text-rose-900 dark:text-rose-200 text-xs leading-relaxed">
        <RotateCcw className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-rose-800 dark:text-rose-300">Double-Entry & GST Status:</p>
          <p className="mt-0.5 text-slate-700 dark:text-slate-300">
            Stock quantities returned have been credited back into inventory ({creditNote.items?.length || 0} items).
            Customer ledger balance has been credited by ₹{Number(creditNote.amount).toFixed(2)}. Output tax liability reduced under Section 34 of the CGST Act.
          </p>
        </div>
      </div>

      {/* Customer & Invoice Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Customer Info */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <User className="w-4 h-4 text-slate-500" />
            Customer Details
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white">
            {creditNote.party_name}
          </div>
          {creditNote.party_mobile && (
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Mobile: {creditNote.party_mobile}
            </div>
          )}
          {creditNote.party_gst && (
            <div className="text-xs text-slate-600 dark:text-slate-400">
              GSTIN: <span className="font-mono">{creditNote.party_gst}</span>
            </div>
          )}
          {creditNote.party_address && (
            <div className="text-xs text-slate-500 pt-1">
              {creditNote.party_address}, {creditNote.party_city} {creditNote.party_state}
            </div>
          )}
        </div>

        {/* Reference & Reason Info */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <FileText className="w-4 h-4 text-slate-500" />
            Reference & Purpose
          </div>
          <div>
            <span className="text-xs text-slate-500">Against Invoice: </span>
            {creditNote.invoice_no ? (
              <Link to={`/invoices/${creditNote.invoice_id}`} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                {creditNote.invoice_no} ({creditNote.invoice_date})
              </Link>
            ) : (
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Direct Credit Note</span>
            )}
          </div>
          <div>
            <span className="text-xs text-slate-500">Return Reason: </span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{creditNote.reason || 'Sales Return'}</span>
          </div>
          {creditNote.notes && (
            <div className="text-xs text-slate-600 dark:text-slate-400 pt-1 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg italic">
              "{creditNote.notes}"
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Package className="w-4 h-4 text-rose-500" />
            Returned Goods Breakdown
          </h2>
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Item Description</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-center">Unit</th>
                <th className="py-3 px-4 text-right">Rate (₹)</th>
                <th className="py-3 px-4 text-center">GST %</th>
                <th className="py-3 px-4 text-right">Credit Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {(creditNote.items || []).map((it, idx) => (
                <tr key={it.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4 text-center text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                    {it.description || it.product_name}
                  </td>
                  <td className="py-3 px-4 text-center font-semibold text-rose-600 dark:text-rose-400">
                    {it.qty}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-500">
                    {it.unit || 'Pcs'}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                    ₹{Number(it.rate || 0).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-500">
                    {Number(it.gst_rate || 0)}%
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                    ₹{Number(it.amount || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                <td colSpan={6} className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                  Total Credit Amount:
                </td>
                <td className="py-3 px-4 text-right text-base font-bold text-rose-600 dark:text-rose-400">
                  ₹{Number(creditNote.amount).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile Items Cards */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {(creditNote.items || []).map((it, idx) => (
            <div key={it.id || idx} className="p-3.5 space-y-1.5">
              <div className="flex items-start justify-between">
                <div className="font-semibold text-slate-900 dark:text-white text-sm">
                  <span className="text-xs text-slate-400 mr-1.5">#{idx + 1}</span>
                  {it.description || it.product_name}
                </div>
                <div className="text-right font-bold text-slate-900 dark:text-white text-sm">
                  ₹{Number(it.amount || 0).toFixed(2)}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-1">
                <span>{it.qty} {it.unit || 'Pcs'} @ ₹{Number(it.rate || 0).toFixed(2)}</span>
                <span>GST: {Number(it.gst_rate || 0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
