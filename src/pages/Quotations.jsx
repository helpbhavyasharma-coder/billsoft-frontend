import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Eye, Edit, Trash2, ArrowRightCircle, Printer, MessageCircle, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { PageHeader, SearchField, StatusBadge, Money, LoadingState, EmptyState } from '../components/ui';

export default function Quotations() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [convertingId, setConvertingId] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  useEffect(() => {
    fetchQuotations();
  }, [search, status, pagination.page]);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 20,
      });
      if (search) params.append('search', search);
      if (status) params.append('status', status);

      const { data } = await api.get(`/quotations?${params}`);
      if (data.success) {
        setQuotations(data.quotations);
        if (data.pagination) setPagination(data.pagination);
      }
    } catch (err) {
      toast.error('Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, quotationNo) => {
    if (!window.confirm(`Are you sure you want to delete quotation ${quotationNo}?`)) return;
    try {
      const { data } = await api.delete(`/quotations/${id}`);
      if (data.success) {
        toast.success('Quotation deleted successfully');
        fetchQuotations();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete quotation');
    }
  };

  const handleConvert = async (id, quotationNo) => {
    if (!window.confirm(`Convert quotation ${quotationNo} to a Tax Invoice now? This will automatically update stock and receivables.`)) return;
    setConvertingId(id);
    try {
      const { data } = await api.post(`/quotations/${id}/convert`);
      if (data.success) {
        toast.success(data.message || 'Quotation converted to Tax Invoice!');
        navigate(`/invoices/${data.invoice_id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Conversion failed');
      setConvertingId(null);
    }
  };

  const handlePrint = (id) => {
    window.open(`/api/pdf/quotation/${id}`, '_blank');
  };

  const handleWhatsApp = (q) => {
    const text = encodeURIComponent(
      `Hello ${q.party_name},\nHere is your quotation ${q.quotation_no} for amount Rs. ${Number(q.grand_total).toFixed(2)}.\nPlease review and confirm so we can process your order.\nThank you!`
    );
    const mobile = (q.party_mobile || '').replace(/\D/g, '');
    const phoneParam = mobile.length === 10 ? `91${mobile}` : mobile;
    window.open(`https://wa.me/${phoneParam}?text=${text}`, '_blank');
  };

  const getStatusClass = (st) => {
    switch (st) {
      case 'converted': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
      case 'accepted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
      case 'sent': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
      case 'expired': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Quotations & Estimates"
        subtitle="Manage customer price quotes, proforma estimates, and convert them to invoices with 1 click."
        actions={
          <Link
            to="/quotations/new"
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl shadow-sm hover:opacity-95 transition-opacity"
          >
            <Plus className="w-4 h-4" /> New Quotation
          </Link>
        }
      />

      {/* Filter Bar */}
      <div className="card p-3 sm:p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex-1 min-w-0">
          <SearchField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by quote no, customer name..."
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input-field text-xs py-2 px-3 rounded-lg border w-full sm:w-48"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="converted">Converted to Invoice</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* List / Table */}
      {loading ? (
        <LoadingState label="Loading quotations..." />
      ) : quotations.length === 0 ? (
        <EmptyState
          title="No quotations found"
          description="Create your first price quotation or proforma invoice for customers."
          action={
            <Link to="/quotations/new" className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm">
              <Plus className="w-4 h-4" /> Create Quotation
            </Link>
          }
        />
      ) : (
        <div className="card overflow-hidden shadow-sm">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4">Quote No</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Valid Until</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-blue-600 dark:text-blue-400">
                      <Link to={`/quotations/${q.id}`} className="hover:underline">
                        {q.quotation_no}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{q.party_name || 'N/A'}</div>
                      {q.party_mobile && <div className="text-xs text-slate-500">{q.party_mobile}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{q.quotation_date}</td>
                    <td className="py-3 px-4 text-slate-500">{q.valid_until || '-'}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-slate-100">
                      <Money value={q.grand_total} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${getStatusClass(q.status)}`}>
                        {q.status}
                      </span>
                      {q.converted_invoice_no && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                          Inv: {q.converted_invoice_no}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {q.status !== 'converted' ? (
                          <button
                            onClick={() => handleConvert(q.id, q.quotation_no)}
                            disabled={convertingId === q.id}
                            title="Convert to Tax Invoice"
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm transition-colors"
                          >
                            <ArrowRightCircle className="w-3.5 h-3.5" />
                            {convertingId === q.id ? 'Converting...' : 'Convert'}
                          </button>
                        ) : (
                          <Link
                            to={`/invoices/${q.converted_invoice_id}`}
                            className="text-xs text-emerald-600 hover:underline inline-flex items-center gap-1 font-medium"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> View Inv
                          </Link>
                        )}
                        <button
                          onClick={() => handlePrint(q.id)}
                          title="Print / View PDF"
                          className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleWhatsApp(q)}
                          title="Share on WhatsApp"
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <Link
                          to={`/quotations/${q.id}`}
                          title="View Details"
                          className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {q.status !== 'converted' && (
                          <Link
                            to={`/quotations/${q.id}/edit`}
                            title="Edit Quotation"
                            className="p-1.5 text-blue-600 hover:text-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                        )}
                        <button
                          onClick={() => handleDelete(q.id, q.quotation_no)}
                          title="Delete Quotation"
                          className="p-1.5 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List (Invoice with AI style) */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {quotations.map((q) => (
              <div key={q.id} className="p-3.5 sm:p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link to={`/quotations/${q.id}`} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
                      {q.quotation_no}
                    </Link>
                    <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{q.party_name || 'Walk-in / Cash'}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Date: {q.quotation_date} {q.valid_until ? `• Valid: ${q.valid_until}` : ''}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                      <Money value={q.grand_total} />
                    </div>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusClass(q.status)}`}>
                      {q.status}
                    </span>
                  </div>
                </div>

                {q.converted_invoice_no && (
                  <div className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Invoice Created: <Link to={`/invoices/${q.converted_invoice_id}`} className="underline font-bold">{q.converted_invoice_no}</Link></span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handlePrint(q.id)}
                      title="Print Quotation"
                      className="p-2 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleWhatsApp(q)}
                      title="WhatsApp"
                      className="p-2 text-emerald-600 rounded-lg border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <Link
                      to={`/quotations/${q.id}`}
                      title="View Details"
                      className="p-2 text-blue-600 rounded-lg border border-blue-200 dark:border-blue-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    {q.status !== 'converted' && (
                      <Link
                        to={`/quotations/${q.id}/edit`}
                        title="Edit Quotation"
                        className="p-2 text-amber-600 rounded-lg border border-amber-200 dark:border-amber-900/60 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(q.id, q.quotation_no)}
                      title="Delete Quotation"
                      className="p-2 text-rose-600 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {q.status !== 'converted' ? (
                    <button
                      onClick={() => handleConvert(q.id, q.quotation_no)}
                      disabled={convertingId === q.id}
                      className="btn-primary text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-semibold shadow-sm flex-1 sm:flex-none justify-center"
                    >
                      <ArrowRightCircle className="w-3.5 h-3.5" />
                      {convertingId === q.id ? 'Converting...' : 'Convert to Invoice'}
                    </button>
                  ) : (
                    <Link to={`/invoices/${q.converted_invoice_id}`} className="text-xs text-emerald-600 hover:underline font-bold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> View Inv
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
