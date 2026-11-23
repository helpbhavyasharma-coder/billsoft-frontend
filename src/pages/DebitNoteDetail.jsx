import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Printer, MessageCircle, Trash2, Calendar, Truck, FileText, Package, AlertCircle, CheckCircle2, RotateCw } from 'lucide-react';
import { PageHeader, Money, LoadingState } from '../components/ui';

export default function DebitNoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [debitNote, setDebitNote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/debit-notes/${id}`);
      if (data.success && data.debit_note) {
        setDebitNote(data.debit_note);
      } else {
        toast.error('Debit note not found');
        navigate('/debit-notes');
      }
    } catch (err) {
      toast.error('Failed to load debit note details');
      navigate('/debit-notes');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.open(`/api/pdf/debit-note/${id}`, '_blank');
  };

  const handleWhatsApp = () => {
    if (!debitNote) return;
    const text = encodeURIComponent(
      `Hello ${debitNote.supplier_name},\nWe have issued Debit Note ${debitNote.debit_note_no} for amount Rs. ${Number(debitNote.grand_total).toFixed(2)}.\nReason: ${debitNote.reason || 'Purchase Return'}\nPlease adjust this against our outstanding payables.\nThank you!`
    );
    const mobile = (debitNote.supplier_mobile || '').replace(/\D/g, '');
    const phoneParam = mobile.length === 10 ? `91${mobile}` : mobile;
    window.open(`https://wa.me/${phoneParam}?text=${text}`, '_blank');
  };

  const handleDelete = async () => {
    if (!debitNote) return;
    if (!window.confirm(`Are you sure you want to cancel Debit Note ${debitNote.debit_note_no}? This will restore deducted inventory and reset vendor ledger balance.`)) return;
    try {
      const { data } = await api.delete(`/debit-notes/${id}`);
      if (data.success) {
        toast.success(data.message || 'Debit note cancelled successfully');
        navigate('/debit-notes');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel debit note');
    }
  };

  if (loading) return <LoadingState message="Loading debit note details..." />;
  if (!debitNote) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/debit-notes')}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {debitNote.debit_note_no}
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                Debit Note
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Issued on {debitNote.debit_note_date}
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
          {debitNote.supplier_mobile && (
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
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
        <RotateCw className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-800 dark:text-amber-300">Accounting & Stock Outward Effect:</p>
          <p className="mt-0.5 text-slate-700 dark:text-slate-300">
            Stock quantities returned have been deducted from warehouse inventory ({debitNote.items?.length || 0} items outward).
            Vendor payable liability has been debited by ₹{Number(debitNote.grand_total).toFixed(2)}. Input Tax Credit (ITC) reversal accounted.
          </p>
        </div>
      </div>

      {/* Supplier & Bill Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Supplier Info */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Truck className="w-4 h-4 text-slate-500" />
            Supplier Details
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white">
            {debitNote.supplier_name}
          </div>
          {debitNote.supplier_mobile && (
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Mobile: {debitNote.supplier_mobile}
            </div>
          )}
          {debitNote.supplier_gst && (
            <div className="text-xs text-slate-600 dark:text-slate-400">
              GSTIN: <span className="font-mono">{debitNote.supplier_gst}</span>
            </div>
          )}
          {debitNote.supplier_address && (
            <div className="text-xs text-slate-500 pt-1">
              {debitNote.supplier_address}, {debitNote.supplier_city} {debitNote.supplier_state}
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
            <span className="text-xs text-slate-500">Against Purchase Bill: </span>
            {debitNote.purchase_bill_no ? (
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {debitNote.purchase_bill_no} {debitNote.purchase_date ? `(${debitNote.purchase_date})` : ''}
              </span>
            ) : (
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Direct Debit Note</span>
            )}
          </div>
          <div>
            <span className="text-xs text-slate-500">Return Reason: </span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{debitNote.reason || 'Purchase Return'}</span>
          </div>
          {debitNote.notes && (
            <div className="text-xs text-slate-600 dark:text-slate-400 pt-1 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg italic">
              "{debitNote.notes}"
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-500" />
            Outward Goods Return Breakdown
          </h2>
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Item Description</th>
                <th className="py-3 px-4">HSN</th>
                <th className="py-3 px-4 text-center">Return Qty</th>
                <th className="py-3 px-4 text-center">Unit</th>
                <th className="py-3 px-4 text-right">Rate (₹)</th>
                <th className="py-3 px-4 text-center">GST %</th>
                <th className="py-3 px-4 text-right">Taxable (₹)</th>
                <th className="py-3 px-4 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {(debitNote.items || []).map((it, idx) => (
                <tr key={it.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4 text-center text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                    {it.description || it.product_name}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-xs">
                    {it.hsn_code || '-'}
                  </td>
                  <td className="py-3 px-4 text-center font-semibold text-amber-600 dark:text-amber-400">
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
                  <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                    ₹{Number(it.taxable_amount || (it.qty * it.rate)).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                    ₹{Number(it.total_amount || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-sm">
              <tr>
                <td colSpan={8} className="py-2.5 px-4 text-right text-slate-600 dark:text-slate-400">
                  Subtotal (Taxable):
                </td>
                <td className="py-2.5 px-4 text-right font-medium text-slate-900 dark:text-white">
                  ₹{Number(debitNote.subtotal || 0).toFixed(2)}
                </td>
              </tr>
              <tr>
                <td colSpan={8} className="py-2.5 px-4 text-right text-slate-600 dark:text-slate-400">
                  Total GST:
                </td>
                <td className="py-2.5 px-4 text-right font-medium text-slate-900 dark:text-white">
                  ₹{Number(debitNote.total_gst || 0).toFixed(2)}
                </td>
              </tr>
              {Number(debitNote.round_off) !== 0 && (
                <tr>
                  <td colSpan={8} className="py-2.5 px-4 text-right text-slate-600 dark:text-slate-400">
                    Round Off:
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium text-slate-900 dark:text-white">
                    ₹{Number(debitNote.round_off || 0).toFixed(2)}
                  </td>
                </tr>
              )}
              <tr className="border-t border-slate-300 dark:border-slate-700 font-bold">
                <td colSpan={8} className="py-3 px-4 text-right text-slate-800 dark:text-slate-200">
                  Total Debit Amount:
                </td>
                <td className="py-3 px-4 text-right text-base font-bold text-amber-600 dark:text-amber-400">
                  ₹{Number(debitNote.grand_total).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile Items Cards */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {(debitNote.items || []).map((it, idx) => (
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
