import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Eye, Trash2, Printer, MessageCircle, RotateCw, Calendar, Truck, FileText, IndianRupee } from 'lucide-react';
import { PageHeader, SearchField, Money, LoadingState, EmptyState } from '../components/ui';

export default function DebitNotes() {
  const [debitNotes, setDebitNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchDebitNotes();
  }, [search]);

  const fetchDebitNotes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const { data } = await api.get(`/debit-notes?${params}`);
      if (data.success) {
        setDebitNotes(data.debit_notes || []);
      }
    } catch (err) {
      toast.error('Failed to load debit notes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, noteNo) => {
    if (!window.confirm(`Are you sure you want to cancel Debit Note ${noteNo}? This will restore deducted stock and supplier payable balance.`)) return;
    try {
      const { data } = await api.delete(`/debit-notes/${id}`);
      if (data.success) {
        toast.success(data.message || 'Debit note cancelled successfully');
        fetchDebitNotes();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel debit note');
    }
  };

  const handlePrint = (id) => {
    window.open(`/api/pdf/debit-note/${id}`, '_blank');
  };

  const handleWhatsApp = (dn) => {
    const text = encodeURIComponent(
      `Hello ${dn.supplier_name},\nWe have issued Debit Note (Purchase Return) ${dn.debit_note_no} for amount Rs. ${Number(dn.grand_total).toFixed(2)}.\nReason: ${dn.reason || 'Purchase Return'}\nPlease adjust this against our outstanding payables.\nThank you!`
    );
    const mobile = (dn.supplier_mobile || '').replace(/\D/g, '');
    const phoneParam = mobile.length === 10 ? `91${mobile}` : mobile;
    window.open(`https://wa.me/${phoneParam}?text=${text}`, '_blank');
  };

  const totalAmount = debitNotes.reduce((acc, curr) => acc + Number(curr.grand_total || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Debit Notes (Purchase Returns)"
        subtitle="Manage supplier returns, defective stock outward, and vendor payable adjustments"
        action={
          <Link
            to="/debit-notes/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Issue Debit Note
          </Link>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <RotateCw className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Debit Notes</p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{debitNotes.length}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Debited (Recoverable)</p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5"><Money value={totalAmount} /></h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Supplier Flow</p>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">Payables Reduced Directly</h3>
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
            placeholder="Search by Debit Note #, Supplier name, or reason..."
          />
        </div>
      </div>

      {/* Table & Responsive View */}
      {loading ? (
        <LoadingState message="Loading debit notes..." />
      ) : debitNotes.length === 0 ? (
        <EmptyState
          title="No Debit Notes Found"
          description={search ? "No debit notes match your search criteria." : "Create your first debit note to return defective or excess items back to your vendors."}
          action={
            <Link
              to="/debit-notes/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Issue Debit Note
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
                  <th className="py-3 px-4">DN Number</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Against Bill</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-right">Debit Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {debitNotes.map((dn) => (
                  <tr key={dn.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-amber-600 dark:text-amber-400">
                      <Link to={`/debit-notes/${dn.id}`} className="hover:underline">
                        {dn.debit_note_no}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {dn.debit_note_date}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-white">{dn.supplier_name}</div>
                      {dn.supplier_mobile && (
                        <div className="text-xs text-slate-500">{dn.supplier_mobile}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {dn.purchase_bill_no ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          {dn.purchase_bill_no}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Direct Return</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {dn.reason || 'Purchase Return'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                      <Money value={dn.grand_total} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        {dn.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/debit-notes/${dn.id}`}
                          title="View Details"
                          className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handlePrint(dn.id)}
                          title="Print Debit Note"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {dn.supplier_mobile && (
                          <button
                            onClick={() => handleWhatsApp(dn)}
                            title="Share on WhatsApp"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(dn.id, dn.debit_note_no)}
                          title="Cancel Debit Note"
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
            {debitNotes.map((dn) => (
              <div key={dn.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Link to={`/debit-notes/${dn.id}`} className="font-semibold text-amber-600 dark:text-amber-400 text-base">
                      {dn.debit_note_no}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">{dn.debit_note_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-slate-900 dark:text-white">
                      <Money value={dn.grand_total} />
                    </p>
                    <span className="inline-block mt-0.5 px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      {dn.status || 'Active'}
                    </span>
                  </div>
                </div>

                <div className="text-sm">
                  <span className="text-slate-500">Supplier: </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{dn.supplier_name}</span>
                </div>

                {dn.purchase_bill_no && (
                  <div className="text-xs">
                    <span className="text-slate-500">Against Bill: </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{dn.purchase_bill_no}</span>
                  </div>
                )}

                {dn.reason && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                    "{dn.reason}"
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    to={`/debit-notes/${dn.id}`}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg"
                  >
                    Details
                  </Link>
                  <button
                    onClick={() => handlePrint(dn.id)}
                    className="px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg"
                  >
                    Print
                  </button>
                  {dn.supplier_mobile && (
                    <button
                      onClick={() => handleWhatsApp(dn)}
                      className="px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg"
                    >
                      WhatsApp
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(dn.id, dn.debit_note_no)}
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
