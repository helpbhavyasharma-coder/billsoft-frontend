import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Eye, Trash2, Printer, MessageCircle, AlertCircle, RotateCcw, Calendar, User, FileText, IndianRupee } from 'lucide-react';
import { PageHeader, SearchField, StatusBadge, Money, LoadingState, EmptyState } from '../components/ui';

export default function CreditNotes() {
  const [creditNotes, setCreditNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCreditNotes();
  }, [search]);

  const fetchCreditNotes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const { data } = await api.get(`/credit-notes?${params}`);
      if (data.success) {
        setCreditNotes(data.credit_notes || []);
      }
    } catch (err) {
      toast.error('Failed to load credit notes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, noteNo) => {
    if (!window.confirm(`Are you sure you want to cancel Credit Note ${noteNo}? This will rollback restored stock and adjust customer balances.`)) return;
    try {
      const { data } = await api.delete(`/credit-notes/${id}`);
      if (data.success) {
        toast.success(data.message || 'Credit note cancelled successfully');
        fetchCreditNotes();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel credit note');
    }
  };

  const handlePrint = (id) => {
    window.open(`/api/pdf/credit-note/${id}`, '_blank');
  };

  const handleWhatsApp = (cn) => {
    const text = encodeURIComponent(
      `Hello ${cn.party_name},\nYour Credit Note (Sales Return) ${cn.return_no} for Rs. ${Number(cn.amount).toFixed(2)} has been recorded.\nReason: ${cn.reason || 'Goods Return'}\nYour account balance has been credited accordingly.\nThank you!`
    );
    const mobile = (cn.party_mobile || '').replace(/\D/g, '');
    const phoneParam = mobile.length === 10 ? `91${mobile}` : mobile;
    window.open(`https://wa.me/${phoneParam}?text=${text}`, '_blank');
  };

  const totalAmount = creditNotes.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credit Notes (Sales Returns)"
        subtitle="Manage customer sales returns, defective goods inward, and ledger credit adjustments"
        action={
          <Link
            to="/credit-notes/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Issue Credit Note
          </Link>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Credit Notes</p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{creditNotes.length}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Credited Amount</p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5"><Money value={totalAmount} /></h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">GST Compliance</p>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">Section 34 CGST Act</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search by Credit Note #, Customer name, Invoice # or reason..."
          />
        </div>
      </div>

      {/* Table & Responsive View */}
      {loading ? (
        <LoadingState message="Loading credit notes..." />
      ) : creditNotes.length === 0 ? (
        <EmptyState
          title="No Credit Notes Found"
          description={search ? "No credit notes match your search criteria." : "Create your first credit note to handle customer returns and ledger adjustments."}
          action={
            <Link
              to="/credit-notes/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Issue Credit Note
            </Link>
          }
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-medium">
                <tr>
                  <th className="py-3 px-4">CN Number</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Against Invoice</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-right">Credit Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {creditNotes.map((cn) => (
                  <tr key={cn.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-rose-600 dark:text-rose-400">
                      <Link to={`/credit-notes/${cn.id}`} className="hover:underline">
                        {cn.return_no}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {cn.return_date}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-white">{cn.party_name}</div>
                      {cn.party_mobile && (
                        <div className="text-xs text-slate-500">{cn.party_mobile}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {cn.invoice_no ? (
                        <Link to={`/invoices/${cn.invoice_id}`} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                          <FileText className="w-3.5 h-3.5" />
                          {cn.invoice_no}
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">Direct Return</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {cn.reason || 'Sales Return'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                      <Money value={cn.amount} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        {cn.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/credit-notes/${cn.id}`}
                          title="View Details"
                          className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handlePrint(cn.id)}
                          title="Print Credit Note"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {cn.party_mobile && (
                          <button
                            onClick={() => handleWhatsApp(cn)}
                            title="Share on WhatsApp"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(cn.id, cn.return_no)}
                          title="Cancel Credit Note"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
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

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
            {creditNotes.map((cn) => (
              <div key={cn.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Link to={`/credit-notes/${cn.id}`} className="font-semibold text-rose-600 dark:text-rose-400 text-base">
                      {cn.return_no}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">{cn.return_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-slate-900 dark:text-white">
                      <Money value={cn.amount} />
                    </p>
                    <span className="inline-block mt-0.5 px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      {cn.status || 'Active'}
                    </span>
                  </div>
                </div>

                <div className="text-sm">
                  <span className="text-slate-500">Customer: </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{cn.party_name}</span>
                </div>

                {cn.invoice_no && (
                  <div className="text-xs">
                    <span className="text-slate-500">Against Invoice: </span>
                    <Link to={`/invoices/${cn.invoice_id}`} className="font-medium text-indigo-600 dark:text-indigo-400">
                      {cn.invoice_no}
                    </Link>
                  </div>
                )}

                {cn.reason && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                    "{cn.reason}"
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    to={`/credit-notes/${cn.id}`}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg"
                  >
                    Details
                  </Link>
                  <button
                    onClick={() => handlePrint(cn.id)}
                    className="px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg"
                  >
                    Print
                  </button>
                  {cn.party_mobile && (
                    <button
                      onClick={() => handleWhatsApp(cn)}
                      className="px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg"
                    >
                      WhatsApp
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(cn.id, cn.return_no)}
                    className="px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 rounded-lg"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
