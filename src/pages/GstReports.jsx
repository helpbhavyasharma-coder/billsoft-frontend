import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  FileText, Download, Printer, CheckCircle, AlertCircle,
  Building2, Layers, ShieldCheck, ArrowRight, RefreshCw, Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader, LoadingState, StatusBadge } from '../components/ui';

const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTHS = [
  { v: '04', l: 'April' }, { v: '05', l: 'May' }, { v: '06', l: 'June' },
  { v: '07', l: 'July' }, { v: '08', l: 'August' }, { v: '09', l: 'September' },
  { v: '10', l: 'October' }, { v: '11', l: 'November' }, { v: '12', l: 'December' },
  { v: '01', l: 'January' }, { v: '02', l: 'February' }, { v: '03', l: 'March' }
];

export default function GstReports() {
  const currentYear = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const [year, setYear] = useState(String(currentYear));
  const [periodType, setPeriodType] = useState('month'); // 'month' or 'year' or 'custom'
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [activeTab, setActiveTab] = useState('gstr1'); // 'gstr1' or 'gstr3b'
  const [gstr1SubTab, setGstr1SubTab] = useState('b2b'); // 'b2b', 'b2cs', 'cdnr', 'hsn', 'doc_issue'

  const [gstr1Data, setGstr1Data] = useState(null);
  const [gstr3bData, setGstr3bData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Compute actual date range
  const getDateRange = () => {
    if (periodType === 'custom') {
      return {
        from: fromDate || `${year}-04-01`,
        to: toDate || `${parseInt(year) + 1}-03-31`
      };
    }
    if (periodType === 'year') {
      return {
        from: `${year}-04-01`,
        to: `${parseInt(year) + 1}-03-31`
      };
    }
    // Monthly
    const calYear = parseInt(month) >= 4 ? parseInt(year) : parseInt(year) + 1;
    const start = `${calYear}-${month}-01`;
    const lastDay = new Date(calYear, parseInt(month), 0).getDate();
    const end = `${calYear}-${month}-${String(lastDay).padStart(2, '0')}`;
    return { from: start, to: end };
  };

  const fetchReports = async () => {
    setLoading(true);
    const range = getDateRange();
    try {
      const [r1Res, r3bRes] = await Promise.all([
        api.get('/reports/gst-r1', { params: { from_date: range.from, to_date: range.to } }),
        api.get('/reports/gst-r3b', { params: { from_date: range.from, to_date: range.to } })
      ]);
      if (r1Res.data.success) setGstr1Data(r1Res.data.report);
      if (r3bRes.data.success) setGstr3bData(r3bRes.data.report);
    } catch (err) {
      toast.error('Failed to load GST reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [year, periodType, month]);

  const handleDownloadGovtJson = () => {
    const range = getDateRange();
    const fp = month + year;
    const apiBase = api.defaults.baseURL || '/api';
    window.open(`${apiBase}/reports/gst-r1-export?from_date=${range.from}&to_date=${range.to}&fp=${fp}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const years = ['2023', '2024', '2025', '2026', '2027'];
  const dateRange = getDateRange();

  return (
    <div className="space-y-6">
      <PageHeader
        title="GST Compliance & Returns Portal"
        subtitle={`GSTR-1 & GSTR-3B return tables, official govt JSON export and ITC reconciliation.`}
        actions={
          <div className="flex items-center gap-2 flex-wrap no-print">
            <button
              onClick={handleDownloadGovtJson}
              className="btn-success flex items-center gap-1.5 text-sm shadow-sm"
              title="Download official JSON payload ready for direct upload on gst.gov.in"
            >
              <Download className="w-4 h-4" /> Download GSTR-1 JSON (Govt Portal)
            </button>
            <button
              onClick={handlePrint}
              className="btn-secondary flex items-center gap-1.5 text-sm"
            >
              <Printer className="w-4 h-4" /> Print Return
            </button>
          </div>
        }
      />

      {/* Filter Card */}
      <div className="card space-y-4 no-print">
        <div className="flex gap-2 flex-wrap items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'month', label: 'Monthly' },
              { id: 'year', label: 'Full Financial Year' },
              { id: 'custom', label: 'Custom Date Range' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setPeriodType(f.id)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  periodType === f.id ? 'bg-blue-600 text-white' : 'btn-secondary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Period:</span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {dateRange.from} to {dateRange.to}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          {periodType !== 'custom' && (
            <div>
              <label className="label text-xs">Financial Year</label>
              <select className="input-field w-32" value={year} onChange={e => setYear(e.target.value)}>
                {years.map(y => (
                  <option key={y} value={y}>FY {y}-{String(Number(y) + 1).slice(2)}</option>
                ))}
              </select>
            </div>
          )}

          {periodType === 'month' && (
            <div>
              <label className="label text-xs">Return Month</label>
              <select className="input-field w-40" value={month} onChange={e => setMonth(e.target.value)}>
                {MONTHS.map(m => (
                  <option key={m.v} value={m.v}>{m.l}</option>
                ))}
              </select>
            </div>
          )}

          {periodType === 'custom' && (
            <>
              <div>
                <label className="label text-xs">From Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                />
              </div>
              <div>
                <label className="label text-xs">To Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                />
              </div>
              <button
                onClick={fetchReports}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" /> Apply Filter
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Mode Tabs: GSTR-1 vs GSTR-3B */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 no-print overflow-x-auto">
        <button
          onClick={() => setActiveTab('gstr1')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'gstr1'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" /> GSTR-1 (Outward Supplies)
        </button>
        <button
          onClick={() => setActiveTab('gstr3b')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'gstr3b'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" /> GSTR-3B (Tax Liability & Eligible ITC)
        </button>
      </div>

      {loading && <LoadingState label="Computing GST returns data..." />}

      {/* ── GSTR-1 View ── */}
      {!loading && activeTab === 'gstr1' && gstr1Data && (
        <div className="space-y-5">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card text-center py-3">
              <p className="text-xs text-slate-500 uppercase font-semibold">Taxable Outward</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-1">₹{fmt(gstr1Data.totals.taxable)}</p>
              <p className="text-xs text-slate-400 mt-0.5">B2B + B2CS</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-xs text-slate-500 uppercase font-semibold">Total CGST</p>
              <p className="text-lg font-bold text-blue-600 mt-1">₹{fmt(gstr1Data.totals.cgst)}</p>
              <p className="text-xs text-slate-400 mt-0.5">Central Tax</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-xs text-slate-500 uppercase font-semibold">Total SGST</p>
              <p className="text-lg font-bold text-purple-600 mt-1">₹{fmt(gstr1Data.totals.sgst)}</p>
              <p className="text-xs text-slate-400 mt-0.5">State/UT Tax</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-xs text-slate-500 uppercase font-semibold">Total IGST</p>
              <p className="text-lg font-bold text-orange-600 mt-1">₹{fmt(gstr1Data.totals.igst)}</p>
              <p className="text-xs text-slate-400 mt-0.5">Integrated Tax</p>
            </div>
          </div>

          {/* GSTR-1 Sections Sub-Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit no-print flex-wrap">
            {[
              { id: 'b2b', label: `4. B2B Invoices (${gstr1Data.b2b.length} Parties)` },
              { id: 'b2cs', label: `7. B2CS Small (${gstr1Data.b2cs.length} Slices)` },
              { id: 'cdnr', label: `9B. Credit/Debit Notes (${gstr1Data.cdnr.length + gstr1Data.cdnur.length})` },
              { id: 'hsn', label: `12. HSN Summary (${gstr1Data.hsn.length} HSN)` },
              { id: 'doc_issue', label: `13. Docs Issued` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setGstr1SubTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  gstr1SubTab === tab.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sub-tab 1: B2B */}
          {gstr1SubTab === 'b2b' && (
            <div className="card p-0 overflow-hidden">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                  Table 4: Taxable outward supplies made to registered persons (B2B Invoices)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Contains all invoices where customer has a valid 15-character GSTIN.
                </p>
              </div>

              {gstr1Data.b2b.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No B2B invoices found in this period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                        <th className="table-header text-left">GSTIN of Recipient</th>
                        <th className="table-header text-left">Party Name</th>
                        <th className="table-header text-left">Invoice No</th>
                        <th className="table-header text-left">Date</th>
                        <th className="table-header text-center">POS</th>
                        <th className="table-header text-right">Invoice Value</th>
                        <th className="table-header text-right">Taxable Value</th>
                        <th className="table-header text-right">Rate</th>
                        <th className="table-header text-right">IGST</th>
                        <th className="table-header text-right">CGST</th>
                        <th className="table-header text-right">SGST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gstr1Data.b2b.map((party) =>
                        party.inv.map((inv, iIdx) =>
                          inv.itms.map((itm, itmIdx) => (
                            <tr
                              key={`${party.ctin}-${inv.inum}-${itmIdx}`}
                              className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                            >
                              {iIdx === 0 && itmIdx === 0 && (
                                <td rowSpan={party.inv.reduce((acc, v) => acc + v.itms.length, 0)} className="table-cell font-mono font-bold text-blue-600 align-top">
                                  {party.ctin}
                                </td>
                              )}
                              {iIdx === 0 && itmIdx === 0 && (
                                <td rowSpan={party.inv.reduce((acc, v) => acc + v.itms.length, 0)} className="table-cell font-medium align-top">
                                  {party.party_name}
                                </td>
                              )}
                              {itmIdx === 0 && (
                                <td rowSpan={inv.itms.length} className="table-cell font-semibold align-top">
                                  {inv.inum}
                                </td>
                              )}
                              {itmIdx === 0 && (
                                <td rowSpan={inv.itms.length} className="table-cell text-slate-500 align-top">
                                  {inv.idt}
                                </td>
                              )}
                              {itmIdx === 0 && (
                                <td rowSpan={inv.itms.length} className="table-cell text-center align-top font-mono">
                                  {inv.pos}
                                </td>
                              )}
                              {itmIdx === 0 && (
                                <td rowSpan={inv.itms.length} className="table-cell text-right font-bold align-top">
                                  ₹{fmt(inv.val)}
                                </td>
                              )}
                              <td className="table-cell text-right">₹{fmt(itm.itm_det.txval)}</td>
                              <td className="table-cell text-right font-semibold">{itm.itm_det.rt}%</td>
                              <td className="table-cell text-right text-orange-600">₹{fmt(itm.itm_det.iamt)}</td>
                              <td className="table-cell text-right text-blue-600">₹{fmt(itm.itm_det.camt)}</td>
                              <td className="table-cell text-right text-purple-600">₹{fmt(itm.itm_det.samt)}</td>
                            </tr>
                          ))
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 2: B2CS */}
          {gstr1SubTab === 'b2cs' && (
            <div className="card p-0 overflow-hidden">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                  Table 7: Taxable supplies to unregistered persons (B2CS - Small)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aggregated by Place of Supply (POS), Supply Type and Tax Rate.
                </p>
              </div>

              {gstr1Data.b2cs.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No B2CS transactions in this period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                        <th className="table-header text-center">Place of Supply (POS)</th>
                        <th className="table-header text-center">Supply Type</th>
                        <th className="table-header text-right">GST Rate</th>
                        <th className="table-header text-right">Taxable Value</th>
                        <th className="table-header text-right">IGST</th>
                        <th className="table-header text-right">CGST</th>
                        <th className="table-header text-right">SGST</th>
                        <th className="table-header text-right">Total Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gstr1Data.b2cs.map((r, idx) => (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50">
                          <td className="table-cell text-center font-mono font-bold">{r.pos}</td>
                          <td className="table-cell text-center">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              r.sply_ty === 'INTRA' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {r.sply_ty}
                            </span>
                          </td>
                          <td className="table-cell text-right font-bold">{r.rt}%</td>
                          <td className="table-cell text-right font-semibold">₹{fmt(r.txval)}</td>
                          <td className="table-cell text-right text-orange-600">₹{fmt(r.iamt)}</td>
                          <td className="table-cell text-right text-blue-600">₹{fmt(r.camt)}</td>
                          <td className="table-cell text-right text-purple-600">₹{fmt(r.samt)}</td>
                          <td className="table-cell text-right font-bold">₹{fmt(r.iamt + r.camt + r.samt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 3: CDNR / CDNUR */}
          {gstr1SubTab === 'cdnr' && (
            <div className="card p-0 overflow-hidden">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                  Table 9B: Credit & Debit Notes (Registered & Unregistered)
                </h3>
              </div>
              {gstr1Data.cdnr.length === 0 && gstr1Data.cdnur.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No Credit / Debit notes issued in this period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50">
                        <th className="table-header text-left">GSTIN / Type</th>
                        <th className="table-header text-left">Note No</th>
                        <th className="table-header text-left">Date</th>
                        <th className="table-header text-center">Note Type</th>
                        <th className="table-header text-left">Reason</th>
                        <th className="table-header text-right">Note Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gstr1Data.cdnr.map((party) =>
                        party.nt.map((n, idx) => (
                          <tr key={`cdnr-${party.ctin}-${idx}`} className="border-b border-slate-100">
                            <td className="table-cell font-mono font-bold text-blue-600">{party.ctin}</td>
                            <td className="table-cell font-semibold">{n.nt_num}</td>
                            <td className="table-cell text-slate-500">{n.nt_dt}</td>
                            <td className="table-cell text-center">
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-700">
                                Credit Note (Sales Return)
                              </span>
                            </td>
                            <td className="table-cell text-slate-600">{n.reason}</td>
                            <td className="table-cell text-right font-bold text-red-600">₹{fmt(n.val)}</td>
                          </tr>
                        ))
                      )}
                      {gstr1Data.cdnur.map((n, idx) => (
                        <tr key={`cdnur-${idx}`} className="border-b border-slate-100">
                          <td className="table-cell text-slate-500 italic">Unregistered (B2CS)</td>
                          <td className="table-cell font-semibold">{n.nt_num}</td>
                          <td className="table-cell text-slate-500">{n.nt_dt}</td>
                          <td className="table-cell text-center">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-700">
                              Credit Note
                            </span>
                          </td>
                          <td className="table-cell text-slate-600">{n.reason}</td>
                          <td className="table-cell text-right font-bold text-red-600">₹{fmt(n.val)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 4: HSN Summary */}
          {gstr1SubTab === 'hsn' && (
            <div className="card p-0 overflow-hidden">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                  Table 12: HSN-wise Summary of Outward Supplies
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50">
                      <th className="table-header text-center">HSN Code</th>
                      <th className="table-header text-left">Description</th>
                      <th className="table-header text-center">UQC</th>
                      <th className="table-header text-right">Total Qty</th>
                      <th className="table-header text-right">Total Value</th>
                      <th className="table-header text-right">Taxable Value</th>
                      <th className="table-header text-right">Rate</th>
                      <th className="table-header text-right">IGST</th>
                      <th className="table-header text-right">CGST</th>
                      <th className="table-header text-right">SGST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gstr1Data.hsn.map((h, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="table-cell text-center font-mono font-bold text-blue-600">{h.hsn_sc}</td>
                        <td className="table-cell font-medium">{h.desc}</td>
                        <td className="table-cell text-center font-semibold text-slate-500">{h.uqc}</td>
                        <td className="table-cell text-right">{h.qty}</td>
                        <td className="table-cell text-right font-semibold">₹{fmt(h.val)}</td>
                        <td className="table-cell text-right font-bold text-slate-800 dark:text-slate-200">₹{fmt(h.txval)}</td>
                        <td className="table-cell text-right font-semibold">{h.rt}%</td>
                        <td className="table-cell text-right text-orange-600">₹{fmt(h.iamt)}</td>
                        <td className="table-cell text-right text-blue-600">₹{fmt(h.camt)}</td>
                        <td className="table-cell text-right text-purple-600">₹{fmt(h.samt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-tab 5: Documents Issued */}
          {gstr1SubTab === 'doc_issue' && (
            <div className="card p-0 overflow-hidden">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                  Table 13: Documents issued during the tax period
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50">
                      <th className="table-header text-left">Nature of Document</th>
                      <th className="table-header text-left">From Serial No</th>
                      <th className="table-header text-left">To Serial No</th>
                      <th className="table-header text-right">Total Number</th>
                      <th className="table-header text-right">Cancelled</th>
                      <th className="table-header text-right">Net Issued</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gstr1Data.doc_issue.map((doc, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="table-cell font-semibold">{doc.doc_typ}</td>
                        <td className="table-cell font-mono text-blue-600">{doc.from}</td>
                        <td className="table-cell font-mono text-blue-600">{doc.to}</td>
                        <td className="table-cell text-right font-bold">{doc.totnum}</td>
                        <td className="table-cell text-right text-slate-400">{doc.canc}</td>
                        <td className="table-cell text-right font-bold text-green-600">{doc.net_issue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── GSTR-3B View ── */}
      {!loading && activeTab === 'gstr3b' && gstr3bData && (
        <div className="space-y-6">
          {/* Net Cash Tax Liability Banner */}
          <div className="card p-6 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl shadow-md">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-blue-200 font-semibold">GSTR-3B Net Tax Summary</p>
                <h2 className="text-2xl font-black mt-1">
                  Net Tax Payable in Cash: ₹{fmt(gstr3bData.tax_payable.net_cash_payable)}
                </h2>
                <p className="text-xs text-blue-200 mt-1">
                  Output GST Liability (₹{fmt(gstr3bData.table_3_1.total_tax)}) − Eligible ITC (₹{fmt(gstr3bData.table_4_itc.total_itc)})
                </p>
              </div>

              <div className="flex gap-4 text-center">
                <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                  <p className="text-[11px] text-blue-200">Net IGST</p>
                  <p className="font-bold text-base mt-0.5">₹{fmt(gstr3bData.tax_payable.net_igst)}</p>
                </div>
                <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                  <p className="text-[11px] text-blue-200">Net CGST</p>
                  <p className="font-bold text-base mt-0.5">₹{fmt(gstr3bData.tax_payable.net_cgst)}</p>
                </div>
                <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                  <p className="text-[11px] text-blue-200">Net SGST</p>
                  <p className="font-bold text-base mt-0.5">₹{fmt(gstr3bData.tax_payable.net_sgst)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Table 3.1 Outward Taxable Supplies */}
          <div className="card p-0 overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                3.1 Details of Outward Supplies and Inward Supplies Liable to Reverse Charge
              </h3>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50">
                  <th className="table-header text-left">Nature of Supplies</th>
                  <th className="table-header text-right">Total Taxable Value</th>
                  <th className="table-header text-right">Integrated Tax (IGST)</th>
                  <th className="table-header text-right">Central Tax (CGST)</th>
                  <th className="table-header text-right">State/UT Tax (SGST)</th>
                  <th className="table-header text-right">Cess</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="table-cell font-semibold">
                    (a) Outward taxable supplies (other than zero rated, nil rated & exempted)
                  </td>
                  <td className="table-cell text-right font-bold text-slate-800 dark:text-slate-200">
                    ₹{fmt(gstr3bData.table_3_1.taxable_amount)}
                  </td>
                  <td className="table-cell text-right text-orange-600 font-semibold">
                    ₹{fmt(gstr3bData.table_3_1.igst)}
                  </td>
                  <td className="table-cell text-right text-blue-600 font-semibold">
                    ₹{fmt(gstr3bData.table_3_1.cgst)}
                  </td>
                  <td className="table-cell text-right text-purple-600 font-semibold">
                    ₹{fmt(gstr3bData.table_3_1.sgst)}
                  </td>
                  <td className="table-cell text-right text-slate-400">₹0.00</td>
                </tr>
                <tr className="border-b border-slate-100 text-slate-500">
                  <td className="table-cell">(b) Outward taxable supplies (zero rated / Exports)</td>
                  <td className="table-cell text-right">₹0.00</td>
                  <td className="table-cell text-right">₹0.00</td>
                  <td className="table-cell text-right">₹0.00</td>
                  <td className="table-cell text-right">₹0.00</td>
                  <td className="table-cell text-right">₹0.00</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-800/60 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                  <td className="table-cell">Total Outward Tax Liability</td>
                  <td className="table-cell text-right">₹{fmt(gstr3bData.table_3_1.taxable_amount)}</td>
                  <td className="table-cell text-right text-orange-600">₹{fmt(gstr3bData.table_3_1.igst)}</td>
                  <td className="table-cell text-right text-blue-600">₹{fmt(gstr3bData.table_3_1.cgst)}</td>
                  <td className="table-cell text-right text-purple-600">₹{fmt(gstr3bData.table_3_1.sgst)}</td>
                  <td className="table-cell text-right">₹0.00</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Table 4 Eligible ITC */}
          <div className="card p-0 overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                4. Eligible Input Tax Credit (ITC)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically calculated from vendor Purchase Bills minus Debit Notes.
              </p>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50">
                  <th className="table-header text-left">Details of ITC</th>
                  <th className="table-header text-right">Integrated Tax (IGST)</th>
                  <th className="table-header text-right">Central Tax (CGST)</th>
                  <th className="table-header text-right">State/UT Tax (SGST)</th>
                  <th className="table-header text-right">Total Eligible ITC</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="table-cell font-semibold">
                    (A) (5) All other ITC (From Inward Purchases)
                  </td>
                  <td className="table-cell text-right text-orange-600 font-semibold">
                    ₹{fmt(gstr3bData.table_4_itc.igst)}
                  </td>
                  <td className="table-cell text-right text-blue-600 font-semibold">
                    ₹{fmt(gstr3bData.table_4_itc.cgst)}
                  </td>
                  <td className="table-cell text-right text-purple-600 font-semibold">
                    ₹{fmt(gstr3bData.table_4_itc.sgst)}
                  </td>
                  <td className="table-cell text-right font-bold text-green-600">
                    ₹{fmt(gstr3bData.table_4_itc.total_itc)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
