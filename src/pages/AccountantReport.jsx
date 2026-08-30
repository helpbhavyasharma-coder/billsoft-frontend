import { useState } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";
import { FileText, Download, Search, CheckCircle, XCircle, Printer } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { EmptyState, LoadingState, PageHeader, StatusBadge } from '../components/ui';

const fmt = (n) => parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = (n) => parseInt(n || 0).toLocaleString("en-IN");

const MONTHS = [
  { v: "01", l: "January" }, { v: "02", l: "February" }, { v: "03", l: "March" },
  { v: "04", l: "April" }, { v: "05", l: "May" }, { v: "06", l: "June" },
  { v: "07", l: "July" }, { v: "08", l: "August" }, { v: "09", l: "September" },
  { v: "10", l: "October" }, { v: "11", l: "November" }, { v: "12", l: "December" },
];

export default function AccountantReport() {
  const [filterType, setFilterType] = useState("month");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("bills");

  const fetchReport = async () => {
    setLoading(true);
    try {
      let params = {};
      if (filterType === "month") { params.year = year; params.month = month; }
      else if (filterType === "year") { params.year = year; }
      else { params.from_date = fromDate; params.to_date = toDate; }

      const { data: res } = await api.get("/reports/accountant", { params });
      if (res.success) setData(res);
    } catch (err) {
      toast.error("Failed to load report.");
    } finally {
      setLoading(false);
    }
  };

  const printReport = () => {
    document.body.classList.add("printing-report");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-report"), 300);
  };

  const reportTitle = filterType === "month"
    ? `${MONTHS.find(m => m.v === month)?.l || ""} ${year}`
    : filterType === "year"
      ? year
      : `${fromDate || "-"} to ${toDate || "-"}`;

  const years = ["2023", "2024", "2025", "2026", "2027"];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Accountant Report"
        subtitle="Bill-wise GST detail, party GSTIN, tax summary and HSN view."
        actions={data && (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={printReport} className="btn-secondary flex items-center gap-2 text-sm">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={printReport} className="btn-primary flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" /> PDF
            </button>
          </div>
        )}
      />

      <div className="card space-y-4 no-print">
        <div className="flex gap-2 flex-wrap">
          {[
            { id: "month", label: "Monthly" },
            { id: "year", label: "Yearly" },
            { id: "custom", label: "Custom Range" },
          ].map(f => (
            <button key={f.id} onClick={() => setFilterType(f.id)}
              className={"px-3 py-1.5 rounded-lg text-sm font-medium transition-colors " + (filterType === f.id ? "bg-blue-600 text-white" : "btn-secondary")}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          {filterType !== "custom" && (
            <div>
              <label className="label">Year</label>
              <select className="input-field w-28" value={year} onChange={e => setYear(e.target.value)}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}
          {filterType === "month" && (
            <div>
              <label className="label">Month</label>
              <select className="input-field w-36" value={month} onChange={e => setMonth(e.target.value)}>
                {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
            </div>
          )}
          {filterType === "custom" && (
            <>
              <div>
                <label className="label">From Date</label>
                <input type="date" className="input-field" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              </div>
              <div>
                <label className="label">To Date</label>
                <input type="date" className="input-field" value={toDate} onChange={e => setToDate(e.target.value)} />
              </div>
            </>
          )}
          <button onClick={fetchReport} disabled={loading}
            className="btn-primary flex items-center gap-2 text-sm">
            <Search className="w-4 h-4" />
            {loading ? "Loading..." : "Generate Report"}
          </button>
        </div>
      </div>

      {data && (
        <div className="print-area space-y-5">
          <div className="hidden print:block card">
            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Accountant Report</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>Period: {reportTitle}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Generated on {new Date().toLocaleDateString("en-IN")}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card text-center py-3 px-2">
              <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>{fmtNum(data.totals.total_invoices)}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Total Bills</p>
            </div>
            <div className="card text-center py-3 px-2">
              <p className="text-lg font-bold" style={{ color: "var(--text)" }}>₹{fmt(data.totals.total_taxable)}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Taxable Amount</p>
            </div>
            <div className="card text-center py-3 px-2" style={{ borderColor: "rgba(245,158,11,0.4)" }}>
              <p className="text-lg font-bold text-amber-600">₹{fmt(data.totals.total_tax)}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Total GST</p>
            </div>
            <div className="card text-center py-3 px-2" style={{ borderColor: "rgba(16,185,129,0.4)" }}>
              <p className="text-lg font-bold text-green-600">₹{fmt(data.totals.total_grand)}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Grand Total</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="card text-center py-2 px-2">
              <p className="text-base font-bold text-blue-600">₹{fmt(data.totals.total_cgst)}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>CGST</p>
            </div>
            <div className="card text-center py-2 px-2">
              <p className="text-base font-bold text-purple-600">₹{fmt(data.totals.total_sgst)}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>SGST</p>
            </div>
            <div className="card text-center py-2 px-2">
              <p className="text-base font-bold text-orange-600">₹{fmt(data.totals.total_igst)}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>IGST</p>
            </div>
          </div>

          <div className="flex gap-1 p-1 rounded-xl w-fit no-print" style={{ backgroundColor: "var(--bg-muted)", border: "1px solid var(--border)" }}>
            {[
              { id: "bills", label: "Bill-wise (" + data.invoices.length + ")" },
              { id: "party", label: "Party-wise (" + data.party_gst_summary.length + ")" },
              { id: "hsn", label: "HSN Summary (" + data.hsn_summary.length + ")" },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={activeTab === tab.id
                  ? { backgroundColor: "var(--bg-card)", color: "var(--text)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
                  : { color: "var(--text-3)" }}>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "bills" && (
            <div className="card p-0 overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th className="table-header text-left">Bill No.</th>
                      <th className="table-header text-left">Date</th>
                      <th className="table-header text-left">Party</th>
                      <th className="table-header text-center">GSTIN</th>
                      <th className="table-header text-right">Taxable</th>
                      <th className="table-header text-right">CGST</th>
                      <th className="table-header text-right">SGST</th>
                      <th className="table-header text-right">IGST</th>
                      <th className="table-header text-right">Total Tax</th>
                      <th className="table-header text-right">Grand Total</th>
                      <th className="table-header text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.map((inv) => (
                      <tr key={inv.id}
                        style={{ borderBottom: "1px solid var(--border)" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--bg-hover)"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                        <td className="table-cell">
                          <Link to={"/invoices/" + inv.id} className="font-medium text-blue-600 hover:text-blue-700">{inv.invoice_no}</Link>
                        </td>
                        <td className="table-cell text-xs" style={{ color: "var(--text-3)" }}>
                          {inv.invoice_date ? format(new Date(inv.invoice_date), "dd MMM yyyy") : "-"}
                        </td>
                        <td className="table-cell">
                          <p className="font-medium text-sm" style={{ color: "var(--text)" }}>{inv.party_name}</p>
                          {inv.party_city && <p className="text-xs" style={{ color: "var(--text-3)" }}>{inv.party_city}</p>}
                        </td>
                        <td className="table-cell text-center">
                          {inv.has_gstin
                            ? <div className="flex flex-col items-center gap-0.5">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-xs font-mono" style={{ color: "var(--text-3)" }}>{inv.party_gst}</span>
                            </div>
                            : <XCircle className="w-4 h-4 text-gray-300 mx-auto" />}
                        </td>
                        <td className="table-cell text-right" style={{ color: "var(--text-2)" }}>₹{fmt(inv.taxable_amount)}</td>
                        <td className="table-cell text-right text-blue-600">₹{fmt(inv.total_cgst)}</td>
                        <td className="table-cell text-right text-purple-600">₹{fmt(inv.total_sgst)}</td>
                        <td className="table-cell text-right text-orange-600">₹{fmt(inv.total_igst)}</td>
                        <td className="table-cell text-right font-semibold text-amber-600">₹{fmt(inv.total_tax)}</td>
                        <td className="table-cell text-right font-bold" style={{ color: "var(--text)" }}>₹{fmt(inv.grand_total)}</td>
                        <td className="table-cell text-center">
                          <StatusBadge status={inv.payment_status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: "var(--bg-muted)", borderTop: "2px solid var(--border)" }}>
                      <td colSpan={4} className="table-cell font-bold" style={{ color: "var(--text)" }}>TOTAL</td>
                      <td className="table-cell text-right font-bold" style={{ color: "var(--text)" }}>₹{fmt(data.totals.total_taxable)}</td>
                      <td className="table-cell text-right font-bold text-blue-600">₹{fmt(data.totals.total_cgst)}</td>
                      <td className="table-cell text-right font-bold text-purple-600">₹{fmt(data.totals.total_sgst)}</td>
                      <td className="table-cell text-right font-bold text-orange-600">₹{fmt(data.totals.total_igst)}</td>
                      <td className="table-cell text-right font-bold text-amber-600">₹{fmt(data.totals.total_tax)}</td>
                      <td className="table-cell text-right font-bold text-green-600">₹{fmt(data.totals.total_grand)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="md:hidden divide-y" style={{ borderColor: "var(--border)" }}>
                {data.invoices.map((inv) => (
                  <div key={inv.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link to={"/invoices/" + inv.id} className="font-semibold text-blue-600 text-sm">{inv.invoice_no}</Link>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                          {inv.invoice_date ? format(new Date(inv.invoice_date), "dd MMM yyyy") : "-"}
                        </p>
                      </div>
                      <StatusBadge status={inv.payment_status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm" style={{ color: "var(--text)" }}>{inv.party_name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {inv.has_gstin
                            ? <><CheckCircle className="w-3 h-3 text-green-500" /><span className="text-xs text-green-600 font-mono">{inv.party_gst}</span></>
                            : <><XCircle className="w-3 h-3 text-gray-400" /><span className="text-xs" style={{ color: "var(--text-3)" }}>No GSTIN</span></>}
                        </div>
                      </div>
                      <p className="font-bold text-green-600">₹{fmt(inv.grand_total)}</p>
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-xs">
                      <div className="rounded p-1.5 text-center" style={{ backgroundColor: "var(--bg-muted)" }}>
                        <p style={{ color: "var(--text-3)" }}>Taxable</p>
                        <p className="font-semibold" style={{ color: "var(--text)" }}>₹{fmt(inv.taxable_amount)}</p>
                      </div>
                      <div className="rounded p-1.5 text-center" style={{ backgroundColor: "rgba(59,130,246,0.08)" }}>
                        <p style={{ color: "var(--text-3)" }}>CGST</p>
                        <p className="font-semibold text-blue-600">₹{fmt(inv.total_cgst)}</p>
                      </div>
                      <div className="rounded p-1.5 text-center" style={{ backgroundColor: "rgba(139,92,246,0.08)" }}>
                        <p style={{ color: "var(--text-3)" }}>SGST</p>
                        <p className="font-semibold text-purple-600">₹{fmt(inv.total_sgst)}</p>
                      </div>
                      <div className="rounded p-1.5 text-center" style={{ backgroundColor: "rgba(245,158,11,0.08)" }}>
                        <p style={{ color: "var(--text-3)" }}>Tax</p>
                        <p className="font-semibold text-amber-600">₹{fmt(inv.total_tax)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "party" && (
            <div className="card p-0 overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th className="table-header text-left">Party Name</th>
                      <th className="table-header text-center">GSTIN</th>
                      <th className="table-header text-right">Bills</th>
                      <th className="table-header text-right">Taxable</th>
                      <th className="table-header text-right">Total Tax</th>
                      <th className="table-header text-right">Grand Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.party_gst_summary.map((p, i) => (
                      <tr key={i}
                        style={{ borderBottom: "1px solid var(--border)" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--bg-hover)"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                        <td className="table-cell font-medium" style={{ color: "var(--text)" }}>{p.party_name}</td>
                        <td className="table-cell text-center">
                          {p.has_gstin
                            ? <div className="flex flex-col items-center">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-xs font-mono" style={{ color: "var(--text-3)" }}>{p.party_gst}</span>
                            </div>
                            : <div className="flex flex-col items-center">
                              <XCircle className="w-4 h-4 text-gray-300" />
                              <span className="text-xs" style={{ color: "var(--text-3)" }}>No GSTIN</span>
                            </div>}
                        </td>
                        <td className="table-cell text-right" style={{ color: "var(--text-2)" }}>{fmtNum(p.invoice_count)}</td>
                        <td className="table-cell text-right" style={{ color: "var(--text-2)" }}>₹{fmt(p.taxable_amount)}</td>
                        <td className="table-cell text-right font-semibold text-amber-600">₹{fmt(p.total_tax)}</td>
                        <td className="table-cell text-right font-bold text-green-600">₹{fmt(p.grand_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: "var(--bg-muted)", borderTop: "2px solid var(--border)" }}>
                      <td colSpan={2} className="table-cell font-bold" style={{ color: "var(--text)" }}>TOTAL</td>
                      <td className="table-cell text-right font-bold" style={{ color: "var(--text)" }}>{fmtNum(data.totals.total_invoices)}</td>
                      <td className="table-cell text-right font-bold" style={{ color: "var(--text)" }}>₹{fmt(data.totals.total_taxable)}</td>
                      <td className="table-cell text-right font-bold text-amber-600">₹{fmt(data.totals.total_tax)}</td>
                      <td className="table-cell text-right font-bold text-green-600">₹{fmt(data.totals.total_grand)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="md:hidden divide-y" style={{ borderColor: "var(--border)" }}>
                {data.party_gst_summary.map((p, i) => (
                  <div key={i} className="p-4 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{p.party_name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {p.has_gstin
                          ? <><CheckCircle className="w-3 h-3 text-green-500" /><span className="text-xs text-green-600 font-mono">{p.party_gst}</span></>
                          : <><XCircle className="w-3 h-3 text-gray-400" /><span className="text-xs" style={{ color: "var(--text-3)" }}>No GSTIN</span></>}
                      </div>
                      <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>{fmtNum(p.invoice_count)} bills • Tax: ₹{fmt(p.total_tax)}</p>
                    </div>
                    <p className="font-bold text-green-600 flex-shrink-0">₹{fmt(p.grand_total)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "hsn" && (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th className="table-header text-left">HSN Code</th>
                      <th className="table-header text-right">GST Rate</th>
                      <th className="table-header text-right">Qty</th>
                      <th className="table-header text-right">Taxable</th>
                      <th className="table-header text-right">CGST</th>
                      <th className="table-header text-right">SGST</th>
                      <th className="table-header text-right">IGST</th>
                      <th className="table-header text-right">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.hsn_summary.map((h, i) => (
                      <tr key={i}
                        style={{ borderBottom: "1px solid var(--border)" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--bg-hover)"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                        <td className="table-cell font-mono font-medium" style={{ color: "var(--text)" }}>{h.hsn_code || "—"}</td>
                        <td className="table-cell text-right">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700">{h.gst_rate}%</span>
                        </td>
                        <td className="table-cell text-right" style={{ color: "var(--text-2)" }}>{parseFloat(h.total_qty || 0).toFixed(2)}</td>
                        <td className="table-cell text-right" style={{ color: "var(--text-2)" }}>₹{fmt(h.taxable_amount)}</td>
                        <td className="table-cell text-right text-blue-600">₹{fmt(h.total_cgst)}</td>
                        <td className="table-cell text-right text-purple-600">₹{fmt(h.total_sgst)}</td>
                        <td className="table-cell text-right text-orange-600">₹{fmt(h.total_igst)}</td>
                        <td className="table-cell text-right font-bold text-amber-600">₹{fmt(h.total_tax)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: "var(--bg-muted)", borderTop: "2px solid var(--border)" }}>
                      <td colSpan={3} className="table-cell font-bold" style={{ color: "var(--text)" }}>TOTAL</td>
                      <td className="table-cell text-right font-bold" style={{ color: "var(--text)" }}>₹{fmt(data.totals.total_taxable)}</td>
                      <td className="table-cell text-right font-bold text-blue-600">₹{fmt(data.totals.total_cgst)}</td>
                      <td className="table-cell text-right font-bold text-purple-600">₹{fmt(data.totals.total_sgst)}</td>
                      <td className="table-cell text-right font-bold text-orange-600">₹{fmt(data.totals.total_igst)}</td>
                      <td className="table-cell text-right font-bold text-amber-600">₹{fmt(data.totals.total_tax)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {!data && !loading && (
        <div className="card p-0">
          <EmptyState
            icon={FileText}
            title="Generate an accountant report"
            description="Select a month, year or custom period to view bill-wise GST, party GSTIN and HSN summary."
          />
        </div>
      )}
      {loading && <div className="card p-0"><LoadingState label="Generating report..." /></div>}
    </div>
  );
}
