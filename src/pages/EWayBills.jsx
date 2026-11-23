import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Truck, FileText, Download, Printer, Search, CheckCircle2,
  AlertTriangle, Clock, Calendar, MapPin, ChevronRight, X,
  ExternalLink, Info, Check, ShieldCheck
} from 'lucide-react';
import { PageHeader, SearchField, Money, LoadingState, EmptyState } from '../components/ui';

export default function EWayBills() {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({ threshold_count: 0, generated_count: 0, pending_count: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, generated

  // Modal State
  const [activeInvoiceId, setActiveInvoiceId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [ewayData, setEwayData] = useState(null);
  const [savingDetails, setSavingDetails] = useState(false);

  // Part B Form
  const [form, setForm] = useState({
    transporter_id: '',
    transporter_name: '',
    transport_mode: 'Road',
    vehicle_no: '',
    approx_distance_km: '',
    transport_doc_no: '',
    transport_doc_date: '',
    eway_bill_no: '',
    eway_bill_date: ''
  });

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/eway-bills', {
        params: { status: statusFilter, search }
      });
      if (res.data?.success) {
        setInvoices(res.data.invoices || []);
        if (res.data.stats) setStats(res.data.stats);
      }
    } catch (err) {
      toast.error('Failed to load e-way bill invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInvoices();
  };

  const openEwayModal = async (invoiceId) => {
    setActiveInvoiceId(invoiceId);
    setModalOpen(true);
    setModalLoading(true);
    try {
      const res = await api.get(`/invoices/${invoiceId}/eway-bill`);
      if (res.data?.success) {
        setEwayData(res.data);
        const inv = res.data.invoice;
        setForm({
          transporter_id: inv.transporter_id || '',
          transporter_name: inv.transporter_name || '',
          transport_mode: inv.transport_mode || 'Road',
          vehicle_no: inv.vehicle_no || '',
          approx_distance_km: inv.approx_distance_km || '',
          transport_doc_no: inv.transport_doc_no || '',
          transport_doc_date: inv.transport_doc_date || '',
          eway_bill_no: inv.eway_bill_no || '',
          eway_bill_date: inv.eway_bill_date ? inv.eway_bill_date.split(' ')[0] : ''
        });
      }
    } catch (err) {
      toast.error('Failed to load invoice e-way bill details');
      setModalOpen(false);
    } finally {
      setModalLoading(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!activeInvoiceId) return;
    try {
      setSavingDetails(true);
      const res = await api.put(`/invoices/${activeInvoiceId}/eway-bill`, form);
      if (res.data?.success) {
        toast.success('E-Way Bill transport details saved!');
        fetchInvoices();
        // Refresh modal data
        const updated = await api.get(`/invoices/${activeInvoiceId}/eway-bill`);
        if (updated.data?.success) setEwayData(updated.data);
      }
    } catch (err) {
      toast.error('Failed to update e-way bill info');
    } finally {
      setSavingDetails(false);
    }
  };

  const downloadNicJson = () => {
    if (!ewayData?.nic_payload) return;
    const jsonStr = JSON.stringify(ewayData.nic_payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EWAY_${ewayData.invoice?.invoice_no?.replace(/[\/\\]/g, '_') || 'BILL'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Official NIC E-Way Bill JSON downloaded!');
  };

  const printSlip = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="E-Way Bill Management & Portal Helper"
        subtitle="Rule 138 CGST Rules: Generate, track, and export NIC-compliant E-Way Bill JSON for shipments."
        badge="GST Compliance"
        actions={
          <a
            href="https://ewaybillgst.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <ExternalLink className="w-4 h-4" /> Open Govt Portal
          </a>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                Action Required (Pending)
              </p>
              <p className="text-2xl font-bold font-mono text-amber-900 dark:text-amber-100 mt-1">
                {stats.pending_count}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2">
            Invoices &ge; ₹50,000 awaiting E-Way Bill generation
          </p>
        </div>

        <div className="card p-4 bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-900/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                E-Way Bills Generated
              </p>
              <p className="text-2xl font-bold font-mono text-emerald-900 dark:text-emerald-100 mt-1">
                {stats.generated_count}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2">
            Consignments with recorded E-Way Bill Number
          </p>
        </div>

        <div className="card p-4 bg-blue-50/70 dark:bg-blue-950/20 border-blue-200/70 dark:border-blue-900/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Total High-Value Invoices
              </p>
              <p className="text-2xl font-bold font-mono text-blue-900 dark:text-blue-100 mt-1">
                {stats.threshold_count}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-2">
            Consignment value &ge; ₹50,000 threshold
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-muted)' }}>
          {[
            { id: 'all', label: 'All Shipments' },
            { id: 'pending', label: 'Pending E-Way Bill (≥ ₹50k)' },
            { id: 'generated', label: 'Generated' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setStatusFilter(t.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === t.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <SearchField
            placeholder="Search invoice, vehicle, party..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <button type="submit" className="btn-secondary text-xs py-2 px-3">
            Search
          </button>
        </form>
      </div>

      {/* Invoices List Table */}
      <div className="card overflow-hidden p-0">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' }}>
                <th className="py-3 px-3 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Invoice</th>
                <th className="py-3 px-3 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Party Details</th>
                <th className="py-3 px-3 font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-3)' }}>Invoice Value</th>
                <th className="py-3 px-3 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Transport Info</th>
                <th className="py-3 px-3 font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--text-3)' }}>E-Way Status</th>
                <th className="py-3 px-3 font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-3)' }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center">
                    <LoadingState message="Loading high-value consignments..." />
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center">
                    <EmptyState
                      icon={Truck}
                      title="No consignments found"
                      message="No high value invoices match your filter criteria."
                    />
                  </td>
                </tr>
              ) : (
                invoices.map(inv => {
                  const hasEway = !!(inv.eway_bill_no && inv.eway_bill_no.trim());
                  const isHighValue = Number(inv.grand_total) >= 50000;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <p className="font-semibold text-sm text-blue-600 dark:text-blue-400">
                          {inv.invoice_no}
                        </p>
                        <p className="text-slate-400 text-[11px] font-mono mt-0.5">{inv.invoice_date}</p>
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{inv.party_name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{inv.party_city || 'City'} ({inv.party_state || 'State'})</span>
                          {inv.party_gst && inv.party_gst !== 'NA' && (
                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">
                              {inv.party_gst}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-sm">
                        <Money value={inv.grand_total} />
                        {isHighValue && (
                          <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-sans font-medium">
                            &ge; ₹50k Mandatory
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {inv.vehicle_no ? (
                          <div className="space-y-0.5">
                            <span className="inline-block font-mono font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                              {inv.vehicle_no}
                            </span>
                            {inv.transporter_name && (
                              <p className="text-[11px] text-slate-400 truncate max-w-xs">{inv.transporter_name}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Vehicle not assigned</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {hasEway ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Generated
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 mt-0.5">
                              #{inv.eway_bill_no}
                            </span>
                          </div>
                        ) : isHighValue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5" /> Pending E-Way
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-800">
                            Optional (&lt;50k)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => openEwayModal(inv.id)}
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 ml-auto"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          {hasEway ? 'View / Export' : 'Generate / Part B'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View (Invoice with AI style) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="p-6 text-center">
              <LoadingState message="Loading high-value consignments..." />
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No consignments found matching filter.
            </div>
          ) : (
            invoices.map(inv => {
              const hasEway = !!(inv.eway_bill_no && inv.eway_bill_no.trim());
              const isHighValue = Number(inv.grand_total) >= 50000;
              return (
                <div key={inv.id} className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                        {inv.invoice_no}
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{inv.party_name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {inv.invoice_date} {inv.party_city ? `• ${inv.party_city}` : ''} {inv.vehicle_no ? `• ${inv.vehicle_no}` : ''}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                        <Money value={inv.grand_total} />
                      </div>
                      {hasEway ? (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          E-Way Active
                        </span>
                      ) : (
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isHighValue ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isHighValue ? 'E-Way Required' : 'Not Generated'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDownloadJson(inv)}
                        title="Download NIC JSON"
                        className="p-2 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleViewConsignment(inv)}
                        title="View Consignment"
                        className="p-2 text-blue-600 rounded-lg border border-blue-200 dark:border-blue-900/60 hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleOpenEwayModal(inv)}
                      className="btn-primary text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 font-semibold flex-1 sm:flex-none justify-center"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      {hasEway ? 'Update E-Way' : 'Generate E-Way'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* E-Way Bill Modal / Drawer */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-4xl max-h-[92vh] flex flex-col p-6 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">E-Way Bill Generation & Transport Info</h3>
                  <p className="text-xs text-slate-500">
                    Invoice: <span className="font-semibold text-blue-600">{ewayData?.invoice?.invoice_no}</span>
                    &nbsp;&bull;&nbsp;Consignment Value: <span className="font-semibold">₹{Number(ewayData?.invoice?.grand_total || 0).toLocaleString('en-IN')}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {modalLoading ? (
              <div className="py-16 text-center">
                <LoadingState message="Formatting consignment and GST parameters..." />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto py-4 space-y-5">
                {/* Consignor vs Consignee Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border" style={{ borderColor: 'var(--border)' }}>
                    <p className="font-semibold text-slate-400 uppercase tracking-wider mb-1">Dispatch From (Supplier)</p>
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{ewayData?.company?.company_name}</p>
                    <p className="text-slate-500 mt-0.5">{ewayData?.company?.address}, {ewayData?.company?.city} - {ewayData?.company?.pincode || '110001'}</p>
                    <p className="font-mono text-slate-600 dark:text-slate-400 mt-1">
                      GSTIN: <span className="font-semibold">{ewayData?.company?.gst_no || 'URP'}</span>
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border" style={{ borderColor: 'var(--border)' }}>
                    <p className="font-semibold text-slate-400 uppercase tracking-wider mb-1">Ship To (Recipient)</p>
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{ewayData?.party?.name}</p>
                    <p className="text-slate-500 mt-0.5">{ewayData?.party?.address || 'Delivery Address'}, {ewayData?.party?.city} - {ewayData?.party?.pincode || '110001'}</p>
                    <p className="font-mono text-slate-600 dark:text-slate-400 mt-1">
                      GSTIN: <span className="font-semibold">{ewayData?.party?.gst_no || 'URP'}</span>
                    </p>
                  </div>
                </div>

                {/* Part B Transport Form */}
                <div className="border rounded-2xl p-4 space-y-4" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Part B: Transporter & Vehicle Details
                    </h4>
                    <span className="text-[11px] text-slate-400">Required for official E-Way Bill slip</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-3)' }}>
                        Vehicle Number *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. MH12AB1234"
                        value={form.vehicle_no}
                        onChange={(e) => setForm({ ...form, vehicle_no: e.target.value.toUpperCase() })}
                        className="input text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-3)' }}>
                        Approx Distance (in KM) *
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 150"
                        value={form.approx_distance_km}
                        onChange={(e) => setForm({ ...form, approx_distance_km: e.target.value })}
                        className="input text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-3)' }}>
                        Transport Mode
                      </label>
                      <select
                        value={form.transport_mode}
                        onChange={(e) => setForm({ ...form, transport_mode: e.target.value })}
                        className="input text-xs font-medium"
                      >
                        <option value="Road">1 - Road</option>
                        <option value="Rail">2 - Rail</option>
                        <option value="Air">3 - Air</option>
                        <option value="Ship">4 - Ship</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-3)' }}>
                        Transporter Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. VRL Logistics, SafeXpress"
                        value={form.transporter_name}
                        onChange={(e) => setForm({ ...form, transporter_name: e.target.value })}
                        className="input text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-3)' }}>
                        Transporter ID / GSTIN
                      </label>
                      <input
                        type="text"
                        placeholder="15-digit TRANSIN/GSTIN"
                        value={form.transporter_id}
                        onChange={(e) => setForm({ ...form, transporter_id: e.target.value.toUpperCase() })}
                        className="input text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-3)' }}>
                        LR / Transporter Doc No
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. LR-99824"
                        value={form.transport_doc_no}
                        onChange={(e) => setForm({ ...form, transport_doc_no: e.target.value })}
                        className="input text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-emerald-700 dark:text-emerald-400">
                        E-Way Bill Number (12-digit from Govt Portal)
                      </label>
                      <input
                        type="text"
                        placeholder="Enter 12-digit number once generated..."
                        value={form.eway_bill_no}
                        onChange={(e) => setForm({ ...form, eway_bill_no: e.target.value })}
                        className="input text-xs font-mono font-bold border-emerald-300 dark:border-emerald-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-3)' }}>
                        E-Way Bill Generation Date
                      </label>
                      <input
                        type="date"
                        value={form.eway_bill_date}
                        onChange={(e) => setForm({ ...form, eway_bill_date: e.target.value })}
                        className="input text-xs font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Goods List Preview */}
                <div className="border rounded-2xl p-4" style={{ borderColor: 'var(--border)' }}>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Consignment Items ({ewayData?.items?.length || 0})
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b text-slate-400 uppercase text-[10px]" style={{ borderColor: 'var(--border)' }}>
                          <th className="py-1 px-2">Item</th>
                          <th className="py-1 px-2">HSN</th>
                          <th className="py-1 px-2 text-right">Qty</th>
                          <th className="py-1 px-2 text-right">Taxable</th>
                          <th className="py-1 px-2 text-right">GST Rate</th>
                          <th className="py-1 px-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                        {ewayData?.items?.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-1.5 px-2 font-sans font-medium">{it.product_name || it.description}</td>
                            <td className="py-1.5 px-2">{it.hsn_code || '9999'}</td>
                            <td className="py-1.5 px-2 text-right">{it.qty} {it.unit}</td>
                            <td className="py-1.5 px-2 text-right">₹{Number(it.taxable_amount).toFixed(2)}</td>
                            <td className="py-1.5 px-2 text-right">{it.gst_rate}%</td>
                            <td className="py-1.5 px-2 text-right font-bold">₹{Number(it.total_sale || it.taxable_amount).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadNicJson}
                  className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100"
                >
                  <Download className="w-4 h-4" /> Export NIC JSON
                </button>
                <button
                  type="button"
                  onClick={printSlip}
                  className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3"
                >
                  <Printer className="w-4 h-4" /> Print E-Way Slip
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveDetails}
                  disabled={savingDetails}
                  className="btn-primary text-xs py-2 px-5 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Save Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
