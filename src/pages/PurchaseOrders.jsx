import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Eye, Edit, Trash2, ArrowRightCircle, Printer, MessageCircle, PackageCheck, Clock, CheckCircle2 } from 'lucide-react';
import { PageHeader, SearchField, Money, LoadingState, EmptyState } from '../components/ui';

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [convertingId, setConvertingId] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  useEffect(() => {
    fetchPurchaseOrders();
  }, [search, status, pagination.page]);

  const fetchPurchaseOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 20,
      });
      if (search) params.append('search', search);
      if (status) params.append('status', status);

      const { data } = await api.get(`/purchase-orders?${params}`);
      if (data.success) {
        setPurchaseOrders(data.purchase_orders);
        if (data.pagination) setPagination(data.pagination);
      }
    } catch {
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, poNo) => {
    if (!window.confirm(`Are you sure you want to delete/cancel Purchase Order ${poNo}?`)) return;
    try {
      const { data } = await api.delete(`/purchase-orders/${id}`);
      if (data.success) {
        toast.success('Purchase order deleted successfully');
        fetchPurchaseOrders();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete purchase order');
    }
  };

  const handleConvert = async (id, poNo) => {
    if (!window.confirm(`Convert PO ${poNo} into a Purchase Bill? This will automatically receive goods into inventory.`)) return;
    setConvertingId(id);
    try {
      const { data } = await api.post(`/purchase-orders/${id}/convert`);
      if (data.success) {
        toast.success(data.message || 'PO converted to Purchase Bill!');
        navigate('/purchases');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Conversion failed');
      setConvertingId(null);
    }
  };

  const handlePrint = (id) => {
    window.open(`/api/pdf/purchase-order/${id}`, '_blank');
  };

  const handleWhatsApp = (po) => {
    const text = encodeURIComponent(
      `Hello ${po.supplier_name},\nPlease find our Purchase Order ${po.po_no} for Rs. ${Number(po.grand_total).toFixed(2)}.\nExpected Delivery: ${po.expected_delivery_date || 'Earliest'}.\nPlease confirm order acceptance.\nThank you!`
    );
    const mobile = (po.supplier_mobile || '').replace(/\D/g, '');
    const phone = mobile.length === 10 ? `91${mobile}` : mobile;
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  const getStatusClass = (st) => {
    switch (st) {
      case 'converted': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
      case 'issued': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
      case 'partially_received': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Purchase Orders (PO)"
        subtitle="Issue formal purchase orders to suppliers and convert them to purchase bills upon goods arrival."
        actions={
          <Link
            to="/purchase-orders/new"
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Purchase Order
          </Link>
        }
      />

      {/* Filter Bar */}
      <div className="card p-3 sm:p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex-1 min-w-0">
          <SearchField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by PO no, supplier name..."
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
            <option value="issued">Issued to Vendor</option>
            <option value="partially_received">Partially Received</option>
            <option value="converted">Converted to Bill</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* List / Table */}
      {loading ? (
        <LoadingState label="Loading purchase orders..." />
      ) : purchaseOrders.length === 0 ? (
        <EmptyState
          title="No purchase orders found"
          description="Create your first PO to send to suppliers before procurement."
          action={
            <Link to="/purchase-orders/new" className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm">
              <Plus className="w-4 h-4" /> Create Purchase Order
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
                  <th className="py-3 px-4">PO No</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">PO Date</th>
                  <th className="py-3 px-4">Expected Delivery</th>
                  <th className="py-3 px-4 text-right">Order Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                      <Link to={`/purchase-orders/${po.id}`} className="hover:underline">
                        {po.po_no}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{po.supplier_name || 'N/A'}</div>
                      {po.supplier_mobile && <div className="text-xs text-slate-500">{po.supplier_mobile}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{po.po_date}</td>
                    <td className="py-3 px-4 text-slate-500">{po.expected_delivery_date || '-'}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-slate-100">
                      <Money value={po.grand_total} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${getStatusClass(po.status)}`}>
                        {po.status}
                      </span>
                      {po.converted_bill_no && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                          Bill: {po.converted_bill_no}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {po.status !== 'converted' ? (
                          <button
                            onClick={() => handleConvert(po.id, po.po_no)}
                            disabled={convertingId === po.id}
                            title="Convert to Purchase Bill (Receive Stock)"
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm transition-colors"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            {convertingId === po.id ? 'Receiving...' : 'Convert to Bill'}
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-600 inline-flex items-center gap-1 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Billed
                          </span>
                        )}
                        <button
                          onClick={() => handlePrint(po.id)}
                          title="Print PO"
                          className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleWhatsApp(po)}
                          title="Share to Supplier on WhatsApp"
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <Link
                          to={`/purchase-orders/${po.id}`}
                          title="View Details"
                          className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {po.status !== 'converted' && (
                          <Link
                            to={`/purchase-orders/${po.id}/edit`}
                            title="Edit PO"
                            className="p-1.5 text-blue-600 hover:text-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                        )}
                        <button
                          onClick={() => handleDelete(po.id, po.po_no)}
                          title="Delete PO"
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

          {/* Mobile View (Invoice with AI style) */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {purchaseOrders.map((po) => (
              <div key={po.id} className="p-3.5 sm:p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link to={`/purchase-orders/${po.id}`} className="text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                      {po.po_no}
                    </Link>
                    <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{po.supplier_name || 'Vendor'}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Date: {po.po_date} {po.expected_delivery_date ? `• Delivery: ${po.expected_delivery_date}` : ''}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                      <Money value={po.grand_total} />
                    </div>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusClass(po.status)}`}>
                      {po.status}
                    </span>
                  </div>
                </div>

                {po.converted_bill_no && (
                  <div className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Purchase Bill: {po.converted_bill_no}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handlePrint(po.id)}
                      title="Print PO"
                      className="p-2 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleWhatsApp(po)}
                      title="WhatsApp to Supplier"
                      className="p-2 text-emerald-600 rounded-lg border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <Link
                      to={`/purchase-orders/${po.id}`}
                      title="View Details"
                      className="p-2 text-blue-600 rounded-lg border border-blue-200 dark:border-blue-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    {po.status !== 'converted' && (
                      <Link
                        to={`/purchase-orders/${po.id}/edit`}
                        title="Edit PO"
                        className="p-2 text-amber-600 rounded-lg border border-amber-200 dark:border-amber-900/60 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(po.id, po.po_no)}
                      title="Delete PO"
                      className="p-2 text-rose-600 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {po.status !== 'converted' ? (
                    <button
                      onClick={() => handleConvert(po.id, po.po_no)}
                      disabled={convertingId === po.id}
                      className="btn-primary text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-semibold shadow-sm flex-1 sm:flex-none justify-center"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      {convertingId === po.id ? 'Receiving...' : 'Convert to Bill'}
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-600 font-bold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Billed
                    </span>
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
