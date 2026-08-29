import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Search, FileDown, Eye, Edit, Trash2, MessageCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { buildInvoiceFileName, downloadInvoicePdf, generateInvoicePdfBlob } from '../utils/invoicePdf';
import { useAuth } from '../context/AuthContext';

const statusColors = {
  unpaid: 'bg-red-100 text-red-700',
  partial: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
};

const getInvoiceSortKey = (invoice) => {
  const invoiceNo = String(invoice?.invoice_no || '');
  const numberParts = invoiceNo.match(/\d+/g);
  const sequence = numberParts?.length ? Number(numberParts[numberParts.length - 1]) : Number.MAX_SAFE_INTEGER;
  return {
    sequence: Number.isFinite(sequence) ? sequence : Number.MAX_SAFE_INTEGER,
    date: invoice?.invoice_date || '',
    invoiceNo,
    id: Number(invoice?.id || 0),
  };
};

const compareInvoicesByNumber = (a, b) => {
  const left = getInvoiceSortKey(a);
  const right = getInvoiceSortKey(b);
  if (left.sequence !== right.sequence) return left.sequence - right.sequence;
  if (left.date !== right.date) return left.date.localeCompare(right.date);
  const invoiceNoCompare = left.invoiceNo.localeCompare(right.invoiceNo, undefined, { numeric: true, sensitivity: 'base' });
  if (invoiceNoCompare !== 0) return invoiceNoCompare;
  return left.id - right.id;
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
  const [selectedById, setSelectedById] = useState({});
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);

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
      setSelectedIds(prev => prev.filter(id => id !== inv.id));
      setSelectedById(prev => {
        const next = { ...prev };
        delete next[inv.id];
        return next;
      });
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

  const selectedInvoices = selectedIds.map((id) => selectedById[id]).filter(Boolean);
  const orderedSelectedInvoices = [...selectedInvoices].sort(compareInvoicesByNumber);
  const allCurrentPageSelected = invoices.length > 0 && invoices.every((inv) => selectedIds.includes(inv.id));

  const toggleInvoice = (inv) => {
    setSelectedIds((prev) => {
      if (prev.includes(inv.id)) return prev.filter((x) => x !== inv.id);
      return [...prev, inv.id];
    });
    setSelectedById((prev) => {
      if (prev[inv.id]) {
        const next = { ...prev };
        delete next[inv.id];
        return next;
      }
      return { ...prev, [inv.id]: inv };
    });
  };

  const toggleCurrentPage = () => {
    if (allCurrentPageSelected) {
      const currentIds = new Set(invoices.map((inv) => inv.id));
      setSelectedIds((prev) => prev.filter((id) => !currentIds.has(id)));
      setSelectedById((prev) => {
        const next = { ...prev };
        invoices.forEach((inv) => delete next[inv.id]);
        return next;
      });
      return;
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...invoices.map((inv) => inv.id)])));
    setSelectedById((prev) => ({
      ...prev,
      ...Object.fromEntries(invoices.map((inv) => [inv.id, inv])),
    }));
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectedById({});
  };

  const downloadSelectedPdfs = async () => {
    if (orderedSelectedInvoices.length === 0) return toast.error('Select invoices first.');
    setBulkDownloading(true);
    try {
      for (let i = 0; i < orderedSelectedInvoices.length; i += 1) {
        const inv = orderedSelectedInvoices[i];
        toast.loading(`Preparing ${i + 1}/${orderedSelectedInvoices.length}: ${inv.invoice_no}`, { id: 'bulk-pdf' });
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
      toast.success(`${orderedSelectedInvoices.length} PDFs downloaded.`, { id: 'bulk-pdf' });
    } catch (err) {
      toast.error(err.message || 'Failed to download selected invoices.', { id: 'bulk-pdf' });
    } finally {
      setBulkDownloading(false);
    }
  };

  const downloadGeneratedPdfFiles = (files) => {
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  };

  const shareSelectedOnWhatsApp = async () => {
    if (orderedSelectedInvoices.length === 0) return toast.error('Select invoices first.');
    setSharing(true);
    try {
      const files = [];
      for (let i = 0; i < orderedSelectedInvoices.length; i += 1) {
        const inv = orderedSelectedInvoices[i];
        toast.loading(`Preparing PDF ${i + 1}/${orderedSelectedInvoices.length}: ${inv.invoice_no}`, { id: 'share-pdf' });
        const { data } = await api.get(`/invoices/${inv.id}`);
        if (!data.success) throw new Error(`Invoice ${inv.invoice_no} load failed`);
        const blob = await generateInvoicePdfBlob({ company, invoice: data.invoice, items: data.items });
        files.push(new File([blob], buildInvoiceFileName(data.invoice), { type: 'application/pdf' }));
      }

      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.share && navigator.canShare({ files })) {
        await navigator.share({
          files,
          title: orderedSelectedInvoices.length === 1 ? `Invoice ${orderedSelectedInvoices[0].invoice_no}` : `${orderedSelectedInvoices.length} invoices`,
        });
        toast.success('PDF share ready.', { id: 'share-pdf' });
        return;
      }

      downloadGeneratedPdfFiles(files);
      toast.error('This browser cannot attach PDFs directly to WhatsApp. PDFs downloaded.', { id: 'share-pdf', duration: 5000 });
    } catch (err) {
      if (err?.name === 'AbortError') {
        toast.success('PDF share cancelled.', { id: 'share-pdf' });
      } else {
        toast.error(err.message || 'Failed to share invoice PDFs.', { id: 'share-pdf' });
      }
    } finally {
      setSharing(false);
    }
  };

  const deleteSelectedInvoices = async () => {
    if (orderedSelectedInvoices.length === 0) return toast.error('Select invoices first.');
    if (!confirm(`Delete/cancel ${orderedSelectedInvoices.length} selected invoice(s)?`)) return;
    setBulkDeleting(true);
    try {
      for (let i = 0; i < orderedSelectedInvoices.length; i += 1) {
        const inv = orderedSelectedInvoices[i];
        toast.loading(`Deleting ${i + 1}/${orderedSelectedInvoices.length}: ${inv.invoice_no}`, { id: 'bulk-delete' });
        await api.delete(`/invoices/${inv.id}`);
      }
      toast.success(`${orderedSelectedInvoices.length} invoice(s) deleted.`, { id: 'bulk-delete' });
      clearSelection();
      fetchInvoices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete selected invoices.', { id: 'bulk-delete' });
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        {selectedIds.length > 0 ? (
          <>
            <h1 className="text-lg font-bold" style={{color:'var(--text)'}}>{selectedIds.length} selected</h1>
            <button onClick={clearSelection} className="btn-secondary inline-flex items-center gap-2 text-sm whitespace-nowrap">
              <XCircle className="w-4 h-4" /> Deselect All
            </button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold" style={{color:'var(--text)'}}>Invoices</h1>
          <Link to="/invoices/new" className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Invoice
          </Link>
          </>
        )}
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
                                <input type="checkbox" checked={selectedIds.includes(inv.id)} onChange={() => toggleInvoice(inv)} />
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
                      <input type="checkbox" checked={selectedIds.includes(inv.id)} onChange={() => toggleInvoice(inv)} />
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

      {selectedIds.length > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-5 z-50 px-3 py-2 rounded-2xl shadow-2xl border flex items-center gap-2"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={downloadSelectedPdfs}
            disabled={bulkDownloading || bulkDeleting || sharing}
            title="Download selected invoices"
            className="w-12 h-12 rounded-xl flex items-center justify-center text-blue-600 disabled:opacity-50"
            style={{ backgroundColor: 'rgba(37,99,235,0.12)' }}
          >
            <FileDown className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={shareSelectedOnWhatsApp}
            disabled={bulkDownloading || bulkDeleting || sharing}
            title="Share on WhatsApp"
            className="w-12 h-12 rounded-xl flex items-center justify-center text-green-600 disabled:opacity-50"
            style={{ backgroundColor: 'rgba(22,163,74,0.12)' }}
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={deleteSelectedInvoices}
            disabled={bulkDownloading || bulkDeleting || sharing}
            title="Delete selected invoices"
            className="w-12 h-12 rounded-xl flex items-center justify-center text-red-600 disabled:opacity-50"
            style={{ backgroundColor: 'rgba(220,38,38,0.12)' }}
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <div className="pl-2 pr-1 text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
            {bulkDownloading ? 'Preparing...' : bulkDeleting ? 'Deleting...' : sharing ? 'Sharing...' : `${selectedIds.length} selected`}
          </div>
        </div>
      )}
    </div>
  );
}
