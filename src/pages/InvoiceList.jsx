import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Search, FileDown, Eye, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { buildInvoiceFileName, downloadInvoicePdf, generateInvoicePdfBlob } from '../utils/invoicePdf';
import { useAuth } from '../context/AuthContext';

const statusColors = {
  unpaid: 'bg-red-100 text-red-700',
  partial: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
};

export default function InvoiceList() {
  const navigate = useNavigate();
  const { company } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [downloading, setDownloading] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDownloading, setBulkDownloading] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, [search, status, pagination.page]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 20,
        ...(search && { search }),
        ...(status && { status }),
      });
      const { data } = await api.get(`/invoices?${params}`);
      if (data.success) {
        setInvoices(data.invoices);
        setPagination(data.pagination);
        setSelectedIds([]);
      }
    } catch {
      toast.error('Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  const deleteInvoice = async (inv) => {
    if (!confirm(`Delete invoice ${inv.invoice_no}? This cannot be undone.`)) return;
    try {
      await api.delete(`/invoices/${inv.id}`);
      toast.success(`Invoice ${inv.invoice_no} deleted.`);
      // Remove from local state immediately for instant UI update
      setInvoices(prev => prev.filter(i => i.id !== inv.id));
      // Also refresh from server
      fetchInvoices();
    } catch {
      toast.error('Failed to delete invoice.');
    }
  };

  const downloadPDF = async (inv) => {
    setDownloading(inv.id);
    try {
      // The list row has no line items — fetch the full invoice first.
      const { data } = await api.get(`/invoices/${inv.id}`);
      if (!data.success) throw new Error('load failed');
      await downloadInvoicePdf({ company, invoice: data.invoice, items: data.items });
    } catch {
      toast.error('Failed to generate PDF.');
    } finally {
      setDownloading(null);
    }
  };

  const selectedInvoices = invoices.filter((inv) => selectedIds.includes(inv.id));
  const allCurrentPageSelected = invoices.length > 0 && selectedIds.length === invoices.length;

  const toggleInvoice = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleCurrentPage = () => {
    setSelectedIds(allCurrentPageSelected ? [] : invoices.map((inv) => inv.id));
  };

  const downloadSelectedPdfs = async () => {
    if (selectedInvoices.length === 0) return toast.error('Select invoices first.');
    setBulkDownloading(true);
    try {
      for (let i = 0; i < selectedInvoices.length; i += 1) {
        const inv = selectedInvoices[i];
        toast.loading(`Preparing ${i + 1}/${selectedInvoices.length}: ${inv.invoice_no}`, { id: 'bulk-pdf' });
        const { data } = await api.get(`/invoices/${inv.id}`);
        if (!data.success) throw new Error(`Invoice ${inv.invoice_no} load failed`);
        const blob = await generateInvoicePdfBlob({ company, invoice: data.invoice, items: data.items });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = buildInvoiceFileName(data.invoice);
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      toast.success(`${selectedInvoices.length} PDFs downloaded.`, { id: 'bulk-pdf' });
    } catch (err) {
      toast.error(err.message || 'Failed to download selected invoices.', { id: 'bulk-pdf' });
    } finally {
      setBulkDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{color:'var(--text)'}}>Invoices</h1>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button onClick={downloadSelectedPdfs} disabled={bulkDownloading} className="btn-secondary flex items-center gap-2 text-sm">
              <FileDown className="w-4 h-4" /> {bulkDownloading ? 'Preparing...' : `Download ${selectedIds.length} PDFs`}
            </button>
          )}
          <Link to="/invoices/new" className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Invoice
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card py-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="input-prefix absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-3)' }} />
            <input
              type="text"
              className="input-field input-with-icon"
              placeholder="Search invoice no. or party..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            />
          </div>
          <select
            className="input-field w-full sm:w-40"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
          >
            <option value="">All Status</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16">
            <p className="mb-4" style={{color:'var(--text-3)'}}>No invoices found.</p>
            <Link to="/invoices/new" className="btn-primary inline-flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Create Invoice
            </Link>
          </div>
        ) : (
          <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th className="table-header text-center w-10">
                              <input type="checkbox" checked={allCurrentPageSelected} onChange={toggleCurrentPage} />
                            </th>
                            <th className="table-header text-left">Invoice No.</th>
                            <th className="table-header text-left">Party</th>
                            <th className="table-header text-left">Date</th>
                            <th className="table-header text-right">Amount</th>
                            <th className="table-header text-center">Status</th>
                            <th className="table-header text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoices.map((inv) => (
                            <tr key={inv.id}
                              style={{ borderBottom: '1px solid var(--border)' }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <td className="table-cell text-center">
                                <input type="checkbox" checked={selectedIds.includes(inv.id)} onChange={() => toggleInvoice(inv.id)} />
                              </td>
                              <td className="table-cell">
                                <Link to={`/invoices/${inv.id}`} className="font-medium text-blue-500 hover:text-blue-400">{inv.invoice_no}</Link>
                              </td>
                              <td className="table-cell">
                                <div style={{ color: 'var(--text)' }}>{inv.party_name}</div>
                                {inv.party_mobile && <div className="text-xs" style={{ color: 'var(--text-3)' }}>{inv.party_mobile}</div>}
                              </td>
                              <td className="table-cell" style={{ color: 'var(--text-3)' }}>{inv.invoice_date ? format(new Date(inv.invoice_date), 'dd MMM yyyy') : '-'}</td>
                              <td className="table-cell text-right font-semibold" style={{ color: 'var(--text)' }}>
                                ₹{parseFloat(inv.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="table-cell text-center">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[inv.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                                  {inv.payment_status}
                                </span>
                              </td>
                              <td className="table-cell text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Link to={`/invoices/${inv.id}`} className="hover:text-blue-500 transition-colors" style={{ color: 'var(--text-3)' }}><Eye className="w-4 h-4" /></Link>
                                  <Link to={`/invoices/${inv.id}/edit`} className="hover:text-green-500 transition-colors" style={{ color: 'var(--text-3)' }}><Edit className="w-4 h-4" /></Link>
                                  <button onClick={() => downloadPDF(inv)} disabled={downloading === inv.id} className="hover:text-purple-500 transition-colors" style={{ color: 'var(--text-3)' }}>
                                    <FileDown className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => deleteInvoice(inv)} className="hover:text-red-500 transition-colors" style={{ color: 'var(--text-3)' }}>
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

            {/* Mobile Cards */}
            <div className="md:hidden p-3 space-y-2">
              {invoices.map((inv) => (
                <div key={inv.id} className="mobile-card">
                  {/* Top row: invoice no + status + amount */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input type="checkbox" checked={selectedIds.includes(inv.id)} onChange={() => toggleInvoice(inv.id)} />
                      <Link to={`/invoices/${inv.id}`}
                        className="font-bold text-blue-600 text-sm">{inv.invoice_no}</Link>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                        ${inv.payment_status === 'paid' ? 'badge-paid' :
                          inv.payment_status === 'partial' ? 'badge-partial' : 'badge-unpaid'}`}>
                        {inv.payment_status}
                      </span>
                    </div>
                    <span className="font-bold text-sm flex-shrink-0" style={{color:'var(--text)'}}>
                      ₹{parseFloat(inv.grand_total).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </span>
                  </div>
                  {/* Party + date */}
                  <p className="text-sm font-medium mb-0.5" style={{color:'var(--text)'}}>{inv.party_name}</p>
                  <p className="text-xs mb-3" style={{color:'var(--text-3)'}}>
                    {inv.invoice_date ? format(new Date(inv.invoice_date), 'dd MMM yyyy') : '-'}
                  </p>
                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <Link to={`/invoices/${inv.id}`}
                      className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg"
                      style={{backgroundColor:'rgba(59,130,246,0.1)', color:'#2563eb'}}>
                      View
                    </Link>
                    <Link to={`/invoices/${inv.id}/edit`}
                      className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg"
                      style={{backgroundColor:'rgba(16,185,129,0.1)', color:'#059669'}}>
                      Edit
                    </Link>
                    <button onClick={(e) => { e.preventDefault(); downloadPDF(inv); }}
                      disabled={downloading === inv.id}
                      className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg"
                      style={{backgroundColor:'rgba(139,92,246,0.1)', color:'#7c3aed'}}>
                      {downloading === inv.id ? '...' : 'PDF'}
                    </button>
                    <button onClick={() => deleteInvoice(inv)}
                      className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg"
                      style={{backgroundColor:'rgba(220,38,38,0.1)', color:'#dc2626'}}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{borderTop:'1px solid var(--border)'}}>
            <p className="text-sm" style={{color:'var(--text-3)'}}>
              Showing {invoices.length} of {pagination.total} invoices
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="btn-secondary text-sm py-1 px-3 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="btn-secondary text-sm py-1 px-3 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
