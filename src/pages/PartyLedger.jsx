import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, Trash2, X, Phone, MapPin, IndianRupee, RotateCcw } from "lucide-react";
import { format } from "date-fns";

const fmt = (n) => parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const statusColors = {
  unpaid: "bg-red-100 text-red-700",
  partial: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
};

const modeColors = {
  cash: "bg-green-50 text-green-700",
  upi: "bg-purple-50 text-purple-700",
  bank_transfer: "bg-blue-50 text-blue-700",
  cheque: "bg-orange-50 text-orange-700",
  other: "bg-gray-50 text-gray-700",
};

export default function PartyLedger() {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paying, setPaying] = useState(false);
  const [returning, setReturning] = useState(false);
  const [activeTab, setActiveTab] = useState("invoices");
  const [payForm, setPayForm] = useState({
    invoice_id: "",
    payment_type: "invoice",
    amount: "",
    payment_date: format(new Date(), "yyyy-MM-dd"),
    payment_mode: "cash",
    reference_no: "",
    notes: "",
  });
  const [returnForm, setReturnForm] = useState({
    invoice_id: "",
    amount: "",
    return_date: format(new Date(), "yyyy-MM-dd"),
    reason: "Goods return",
    notes: "",
  });

  useEffect(() => { fetchLedger(); }, [partyId]);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get("/reports/party-ledger/" + partyId);
      if (res.success) setData(res);
    } catch { toast.error("Failed to load ledger."); }
    finally { setLoading(false); }
  };

  const openPayModal = (invoice) => {
    const outstanding = Math.max(parseFloat(invoice.balance ?? 0), 0);
    setSelectedInvoice(invoice);
    setPayForm({
      invoice_id: invoice.id,
      payment_type: "invoice",
      amount: outstanding.toFixed(2),
      payment_date: format(new Date(), "yyyy-MM-dd"),
      payment_mode: "cash",
      reference_no: "",
      notes: "",
    });
    setShowPayModal(true);
  };

  const openGeneralPayModal = () => {
    setSelectedInvoice(null);
    setPayForm({
      invoice_id: "",
      payment_type: "general",
      amount: "",
      payment_date: format(new Date(), "yyyy-MM-dd"),
      payment_mode: "cash",
      reference_no: "",
      notes: "",
    });
    setShowPayModal(true);
  };

  const openReturnModal = (invoice = null) => {
    const balance = invoice ? Math.max(parseFloat(invoice.balance ?? (parseFloat(invoice.grand_total || 0) - parseFloat(invoice.amount_paid || 0) - parseFloat(invoice.goods_return_total || 0))), 0) : "";
    setReturnForm({
      invoice_id: invoice?.id || "",
      amount: balance ? balance.toFixed(2) : "",
      return_date: format(new Date(), "yyyy-MM-dd"),
      reason: "Goods return",
      notes: "",
    });
    setShowReturnModal(true);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (payForm.payment_type === "invoice" && !payForm.invoice_id) { toast.error("Select an invoice."); return; }
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) { toast.error("Enter valid amount."); return; }
    setPaying(true);
    try {
      const payload = {
        ...payForm,
        party_id: parseInt(partyId),
        invoice_id: payForm.payment_type === "invoice" ? parseInt(payForm.invoice_id) : null,
      };
      const { data: res } = await api.post("/payments", payload);
      if (res.success) {
        toast.success("Payment recorded!");
        setShowPayModal(false);
        fetchLedger();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed.");
    } finally { setPaying(false); }
  };

  const deletePayment = async (payId) => {
    if (!confirm("Delete this payment?")) return;
    try {
      await api.delete("/payments/" + payId);
      toast.success("Payment deleted.");
      fetchLedger();
    } catch { toast.error("Failed to delete."); }
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    if (!returnForm.amount || parseFloat(returnForm.amount) <= 0) { toast.error("Enter valid return amount."); return; }
    setReturning(true);
    try {
      const payload = {
        ...returnForm,
        party_id: parseInt(partyId),
        invoice_id: returnForm.invoice_id ? parseInt(returnForm.invoice_id) : null,
      };
      const { data: res } = await api.post("/goods-returns", payload);
      if (res.success) {
        toast.success("Goods return recorded.");
        setShowReturnModal(false);
        fetchLedger();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save goods return.");
    } finally { setReturning(false); }
  };

  const deleteReturn = async (returnId) => {
    if (!confirm("Delete this goods return?")) return;
    try {
      await api.delete("/goods-returns/" + returnId);
      toast.success("Goods return deleted.");
      fetchLedger();
    } catch { toast.error("Failed to delete goods return."); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );
  if (!data) return <div className="text-center py-12" style={{color:'var(--text-3)'}}>Party not found.</div>;

  const { party, invoices, payments, returns = [], summary } = data;
  const unpaidInvoices = invoices.filter(i => i.payment_status !== "paid");
  const openingDue = Math.max(parseFloat(summary.opening_balance || 0) - parseFloat(summary.general_paid || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} style={{color:'var(--text-3)'}}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{color:'var(--text)'}}>{party.name}</h1>
            <p className="text-sm" style={{color:'var(--text-3)'}}>Party Ledger</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => openReturnModal()}
            className="btn-secondary flex items-center gap-2 text-sm text-orange-700 border-orange-200 hover:bg-orange-50">
            <RotateCcw className="w-4 h-4" /> Goods Return
          </button>
          <button onClick={openGeneralPayModal}
            className="btn-success flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Add Payment
          </button>
        </div>
      </div>

      {/* Party Info Card */}
      <div className="card">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" style={{color:'var(--text-3)'}} />
            <div>
              <p className="text-xs" style={{color:'var(--text-3)'}}>Mobile</p>
              <p className="font-medium" style={{color:'var(--text-2)'}}>{party.mobile || "-"}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{color:'var(--text-3)'}} />
            <div>
              <p className="text-xs" style={{color:'var(--text-3)'}}>Location</p>
              <p className="font-medium" style={{color:'var(--text-2)'}}>{party.city || party.address || "-"}</p>
            </div>
          </div>
          <div>
            <p className="text-xs" style={{color:'var(--text-3)'}}>GST No.</p>
            <p className="font-medium" style={{color:'var(--text-2)'}}>{party.gst_no || "NA"}</p>
          </div>
          <div>
            <p className="text-xs" style={{color:'var(--text-3)'}}>Type</p>
            <p className="font-medium capitalize" style={{color:'var(--text-2)'}}>{party.party_type}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="card text-center py-3 px-2">
          <p className="text-2xl font-bold" style={{color:'var(--text)'}}>{summary.total_invoices}</p>
          <p className="text-xs mt-1" style={{color:'var(--text-3)'}}>Total Bills</p>
        </div>
        <div className="card text-center py-3 px-2">
          <p className="text-lg font-bold" style={{color:'var(--text)'}}>Rs.{fmt(summary.total_amount)}</p>
          <p className="text-xs mt-1" style={{color:'var(--text-3)'}}>Total Business</p>
        </div>
        <div className="card text-center py-3 px-2" style={{borderColor:'rgba(34,197,94,0.4)'}}>
          <p className="text-lg font-bold text-green-600">Rs.{fmt(summary.total_paid)}</p>
          <p className="text-xs mt-1" style={{color:'var(--text-3)'}}>Total Received</p>
        </div>
        <div className="card text-center py-3 px-2" style={{borderColor:'rgba(249,115,22,0.4)'}}>
          <p className="text-lg font-bold text-orange-600">Rs.{fmt(summary.goods_return_total)}</p>
          <p className="text-xs mt-1" style={{color:'var(--text-3)'}}>Goods Return</p>
        </div>
        <div className="card text-center py-3 px-2" style={{borderColor:'rgba(220,38,38,0.4)'}}>
          <p className="text-lg font-bold text-red-600">Rs.{fmt(summary.outstanding)}</p>
          <p className="text-xs mt-1" style={{color:'var(--text-3)'}}>Outstanding</p>
        </div>
      </div>

      {/* Opening Balance Banner */}
      {parseFloat(summary.opening_balance || 0) > 0 && (
        <div className="rounded-xl p-3 flex items-center justify-between flex-wrap gap-2"
          style={{backgroundColor:'rgba(234,179,8,0.1)', border:'1px solid rgba(234,179,8,0.4)'}}>
          <div>
            <p className="text-sm font-semibold text-yellow-700">📊 Opening Balance (पिछला बकाया 2025-26)</p>
            <p className="text-xs text-yellow-600">पिछले साल का बकाया जो इस ledger में जोड़ा गया है</p>
          </div>
          <span className="text-lg font-bold text-yellow-700">Rs.{fmt(summary.opening_balance)}</span>
        </div>
      )}

      {/* Outstanding Alert */}
      {parseFloat(summary.outstanding) > 0 && (
        <div className="rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3"
          style={{backgroundColor:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.3)'}}>
          <div>
            <p className="font-semibold text-red-700">Outstanding Due</p>
            <p className="text-sm text-red-600">
              {unpaidInvoices.length} invoice(s) pending payment
              {parseFloat(summary.goods_return_total || 0) > 0 ? " after goods return adjustment Rs." + fmt(summary.goods_return_total) : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-red-700">Rs.{fmt(summary.outstanding)}</span>
            <button onClick={openGeneralPayModal} className="btn-danger text-sm py-1.5">
              Collect Now
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{backgroundColor:'var(--bg-muted)', border:'1px solid var(--border)'}}>
        {[
          { id: "invoices", label: "Invoices (" + invoices.length + ")" },
          { id: "payments", label: "Payments (" + (payments?.length || 0) + ")" },
          { id: "returns", label: "Returns (" + returns.length + ")" },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={
              activeTab === tab.id
                ? {backgroundColor:'var(--bg-card)', color:'var(--text)', boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}
                : {color:'var(--text-3)'}
            }>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Invoices Tab */}
      {activeTab === "invoices" && (
        <div className="card p-0 overflow-hidden">
          {invoices.length === 0 ? (
            <p className="text-center py-10 text-sm" style={{color:'var(--text-3)'}}>No invoices found.</p>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{borderBottom:'1px solid var(--border)'}}>
                      <th className="table-header text-left">Invoice No.</th>
                      <th className="table-header text-left">Date</th>
                      <th className="table-header text-right">Amount</th>
                      <th className="table-header text-right">Paid</th>
                      <th className="table-header text-right">Return</th>
                      <th className="table-header text-right">Balance</th>
                      <th className="table-header text-center">Status</th>
                      <th className="table-header text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => {
                      const balance = Math.max(parseFloat(inv.balance ?? 0), 0);
                      return (
                        <tr key={inv.id}
                          style={{borderBottom:'1px solid var(--border)'}}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor='var(--bg-hover)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
                          <td className="table-cell">
                            <Link to={"/invoices/" + inv.id} className="font-medium text-blue-600 hover:text-blue-700">{inv.invoice_no}</Link>
                          </td>
                          <td className="table-cell" style={{color:'var(--text-3)'}}>{inv.invoice_date ? format(new Date(inv.invoice_date), "dd MMM yyyy") : "-"}</td>
                          <td className="table-cell text-right font-medium" style={{color:'var(--text-2)'}}>Rs.{fmt(inv.grand_total)}</td>
                          <td className="table-cell text-right text-green-600 font-medium">Rs.{fmt(inv.amount_paid)}</td>
                          <td className="table-cell text-right text-orange-600 font-medium">Rs.{fmt(inv.goods_return_total)}</td>
                          <td className={"table-cell text-right font-bold " + (balance > 0 ? "text-red-600" : "text-green-600")}>
                            Rs.{fmt(balance)}
                          </td>
                          <td className="table-cell text-center">
                            <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + (statusColors[inv.payment_status] || "bg-gray-100 text-gray-600")}>
                              {inv.payment_status}
                            </span>
                          </td>
                          <td className="table-cell text-center">
                            {inv.payment_status !== "paid" && (
                              <div className="flex justify-center gap-1">
                                <button onClick={() => openPayModal(inv)}
                                  className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded-lg font-medium">
                                  + Pay
                                </button>
                                <button onClick={() => openReturnModal(inv)}
                                  className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded-lg font-medium">
                                  Return
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{backgroundColor:'var(--bg-muted)', borderTop:'2px solid var(--border)'}}>
                      <td colSpan={2} className="table-cell font-bold" style={{color:'var(--text)'}}>TOTAL</td>
                      <td className="table-cell text-right font-bold" style={{color:'var(--text)'}}>Rs.{fmt(summary.total_amount)}</td>
                      <td className="table-cell text-right font-bold text-green-600">Rs.{fmt(summary.total_paid)}</td>
                      <td className="table-cell text-right font-bold text-orange-600">Rs.{fmt(summary.goods_return_total)}</td>
                      <td className="table-cell text-right font-bold text-red-600">Rs.{fmt(summary.outstanding)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden p-3 space-y-2">
                {invoices.map((inv) => {
                  const balance = Math.max(parseFloat(inv.balance ?? 0), 0);
                  return (
                    <div key={inv.id} className="mobile-card">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Link to={"/invoices/" + inv.id} className="font-bold text-blue-600 text-sm">{inv.invoice_no}</Link>
                          <p className="text-xs mt-0.5" style={{color:'var(--text-3)'}}>{inv.invoice_date ? format(new Date(inv.invoice_date), "dd MMM yyyy") : "-"}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                          ${inv.payment_status === 'paid' ? 'badge-paid' :
                            inv.payment_status === 'partial' ? 'badge-partial' : 'badge-unpaid'}`}>
                          {inv.payment_status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="stat-box">
                          <p className="text-xs">Bill</p>
                          <span className="text-xs">₹{fmt(inv.grand_total)}</span>
                        </div>
                        <div className="stat-box" style={{backgroundColor:'rgba(16,185,129,0.08)', borderColor:'rgba(16,185,129,0.2)'}}>
                          <p className="text-xs">Paid</p>
                          <span className="text-xs text-green-600">₹{fmt(inv.amount_paid)}</span>
                        </div>
                        <div className="stat-box" style={{backgroundColor:'rgba(249,115,22,0.08)', borderColor:'rgba(249,115,22,0.2)'}}>
                          <p className="text-xs">Return</p>
                          <span className="text-xs text-orange-600">₹{fmt(inv.goods_return_total)}</span>
                        </div>
                        <div className="stat-box" style={{
                          backgroundColor: balance > 0 ? 'rgba(220,38,38,0.08)' : 'rgba(16,185,129,0.08)',
                          borderColor: balance > 0 ? 'rgba(220,38,38,0.2)' : 'rgba(16,185,129,0.2)'
                        }}>
                          <p className="text-xs">Balance</p>
                          <span className={"text-xs font-bold " + (balance > 0 ? "text-red-500" : "text-green-600")}>₹{fmt(balance)}</span>
                        </div>
                      </div>
                      {inv.payment_status !== "paid" && (
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => openPayModal(inv)}
                            className="w-full text-center text-xs font-semibold py-2 rounded-xl"
                            style={{backgroundColor:'rgba(22,163,74,0.15)', color:'#16a34a', border:'1px solid rgba(22,163,74,0.3)'}}>
                            + Collect (₹{fmt(balance)})
                          </button>
                          <button onClick={() => openReturnModal(inv)}
                            className="w-full text-center text-xs font-semibold py-2 rounded-xl"
                            style={{backgroundColor:'rgba(249,115,22,0.15)', color:'#ea580c', border:'1px solid rgba(249,115,22,0.3)'}}>
                            Goods Return
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === "payments" && (
        <div className="card p-0 overflow-hidden">
          {!payments || payments.length === 0 ? (
            <div className="text-center py-10">
              <IndianRupee className="w-10 h-10 mx-auto mb-3" style={{color:'var(--border)'}} />
              <p className="text-sm" style={{color:'var(--text-3)'}}>No payments recorded yet.</p>
              <button onClick={openGeneralPayModal} className="btn-success mt-3 text-sm">
                + Add First Payment
              </button>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{borderBottom:'1px solid var(--border)'}}>
                      <th className="table-header text-left">Date</th>
                      <th className="table-header text-left">Invoice</th>
                      <th className="table-header text-left">Mode</th>
                      <th className="table-header text-left">Reference</th>
                      <th className="table-header text-left">Notes</th>
                      <th className="table-header text-right">Amount</th>
                      <th className="table-header text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}
                        style={{borderBottom:'1px solid var(--border)'}}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor='var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
                        <td className="table-cell">{format(new Date(p.payment_date), "dd MMM yyyy")}</td>
                        <td className="table-cell text-blue-600 font-medium">{p.invoice_no || "-"}</td>
                        <td className="table-cell">
                          <span className={"text-xs px-2 py-0.5 rounded-full font-medium capitalize " + (modeColors[p.payment_mode] || "bg-gray-50 text-gray-700")}>
                            {p.payment_mode?.replace("_", " ")}
                          </span>
                        </td>
                        <td className="table-cell" style={{color:'var(--text-3)'}}>{p.reference_no || "-"}</td>
                        <td className="table-cell text-xs" style={{color:'var(--text-3)'}}>{p.notes || "-"}</td>
                        <td className="table-cell text-right font-bold text-green-600 text-base">Rs.{fmt(p.amount)}</td>
                        <td className="table-cell text-center">
                          <button onClick={() => deletePayment(p.id)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{backgroundColor:'rgba(34,197,94,0.08)', borderTop:'2px solid rgba(34,197,94,0.3)'}}>
                      <td colSpan={5} className="table-cell font-bold text-green-700">TOTAL RECEIVED</td>
                      <td className="table-cell text-right font-bold text-green-600 text-base">
                        Rs.{fmt(payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0))}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden p-3 space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="mobile-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={"text-xs px-2 py-0.5 rounded-full font-semibold capitalize " + (modeColors[p.payment_mode] || "bg-gray-50 text-gray-700")}>
                            {p.payment_mode?.replace("_", " ")}
                          </span>
                          {p.invoice_no && <span className="text-xs text-blue-600 font-medium">{p.invoice_no}</span>}
                        </div>
                        <p className="text-xs" style={{color:'var(--text-3)'}}>{format(new Date(p.payment_date), "dd MMM yyyy")}</p>
                        {p.reference_no && <p className="text-xs mt-0.5" style={{color:'var(--text-3)'}}>Ref: {p.reference_no}</p>}
                        {p.notes && <p className="text-xs mt-0.5" style={{color:'var(--text-3)'}}>{p.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-bold text-green-600 text-sm">₹{fmt(p.amount)}</span>
                        <button onClick={() => deletePayment(p.id)} className="text-red-400 hover:text-red-600 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="rounded-xl p-3 flex justify-between font-bold"
                  style={{backgroundColor:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.3)'}}>
                  <span style={{color:'var(--text)'}}>Total Received</span>
                  <span className="text-green-600">₹{fmt(payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0))}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Returns Tab */}
      {activeTab === "returns" && (
        <div className="card p-0 overflow-hidden">
          {returns.length === 0 ? (
            <div className="text-center py-10">
              <RotateCcw className="w-10 h-10 mx-auto mb-3" style={{color:'var(--border)'}} />
              <p className="text-sm" style={{color:'var(--text-3)'}}>No goods return recorded yet.</p>
              <button onClick={() => openReturnModal()} className="btn-secondary mt-3 text-sm text-orange-700">
                + Add Goods Return
              </button>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{borderBottom:'1px solid var(--border)'}}>
                      <th className="table-header text-left">Date</th>
                      <th className="table-header text-left">Return No.</th>
                      <th className="table-header text-left">Invoice</th>
                      <th className="table-header text-left">Reason</th>
                      <th className="table-header text-left">Notes</th>
                      <th className="table-header text-right">Amount</th>
                      <th className="table-header text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returns.map((r) => (
                      <tr key={r.id} style={{borderBottom:'1px solid var(--border)'}}>
                        <td className="table-cell">{format(new Date(r.return_date), "dd MMM yyyy")}</td>
                        <td className="table-cell text-orange-700 font-medium">{r.return_no}</td>
                        <td className="table-cell text-blue-600 font-medium">{r.invoice_no || "-"}</td>
                        <td className="table-cell" style={{color:'var(--text-2)'}}>{r.reason || "-"}</td>
                        <td className="table-cell text-xs" style={{color:'var(--text-3)'}}>{r.notes || "-"}</td>
                        <td className="table-cell text-right font-bold text-orange-600 text-base">Rs.{fmt(r.amount)}</td>
                        <td className="table-cell text-center">
                          <button onClick={() => deleteReturn(r.id)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{backgroundColor:'rgba(249,115,22,0.08)', borderTop:'2px solid rgba(249,115,22,0.3)'}}>
                      <td colSpan={5} className="table-cell font-bold text-orange-700">TOTAL GOODS RETURN ADJUSTMENT</td>
                      <td className="table-cell text-right font-bold text-orange-600 text-base">
                        Rs.{fmt(returns.reduce((s, r) => s + parseFloat(r.amount || 0), 0))}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="md:hidden p-3 space-y-2">
                {returns.map((r) => (
                  <div key={r.id} className="mobile-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-orange-50 text-orange-700">{r.return_no}</span>
                          {r.invoice_no && <span className="text-xs text-blue-600 font-medium">{r.invoice_no}</span>}
                        </div>
                        <p className="text-xs" style={{color:'var(--text-3)'}}>{format(new Date(r.return_date), "dd MMM yyyy")}</p>
                        <p className="text-xs mt-0.5" style={{color:'var(--text-2)'}}>{r.reason || "Goods return"}</p>
                        {r.notes && <p className="text-xs mt-0.5" style={{color:'var(--text-3)'}}>{r.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-bold text-orange-600 text-sm">₹{fmt(r.amount)}</span>
                        <button onClick={() => deleteReturn(r.id)} className="text-red-400 hover:text-red-600 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="rounded-xl p-3 flex justify-between font-bold"
                  style={{backgroundColor:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.3)'}}>
                  <span style={{color:'var(--text)'}}>Total Adjustment</span>
                  <span className="text-orange-600">₹{fmt(returns.reduce((s, r) => s + parseFloat(r.amount || 0), 0))}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Goods Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            style={{backgroundColor:'var(--bg-card)'}}>
            <div className="flex items-center justify-between p-5" style={{borderBottom:'1px solid var(--border)'}}>
              <div>
                <h2 className="text-lg font-semibold" style={{color:'var(--text)'}}>Goods Return</h2>
                <p className="text-sm" style={{color:'var(--text-3)'}}>{party.name}</p>
              </div>
              <button onClick={() => setShowReturnModal(false)} style={{color:'var(--text-3)'}}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReturn} className="p-5 space-y-4">
              <div className="rounded-xl p-3 text-sm" style={{backgroundColor:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.2)'}}>
                <div className="flex justify-between">
                  <span style={{color:'var(--text-3)'}}>Current Outstanding</span>
                  <span className="font-bold text-red-600">Rs.{fmt(summary.outstanding)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span style={{color:'var(--text-3)'}}>Previous Goods Return</span>
                  <span className="font-bold text-orange-600">Rs.{fmt(summary.goods_return_total)}</span>
                </div>
              </div>

              <div>
                <label className="label">Against Invoice (optional)</label>
                <select className="input-field" value={returnForm.invoice_id}
                  onChange={(e) => {
                    const inv = invoices.find(i => i.id === parseInt(e.target.value));
                    const bal = inv ? Math.max(parseFloat(inv.balance ?? 0), 0) : "";
                    setReturnForm(p => ({ ...p, invoice_id: e.target.value, amount: bal ? bal.toFixed(2) : p.amount }));
                  }}>
                  <option value="">Without Invoice / Manual Adjustment</option>
                  {invoices.map(inv => {
                    const bal = Math.max(parseFloat(inv.balance ?? 0), 0);
                    return (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_no} - Balance: Rs.{fmt(bal)}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="label">Return Amount *</label>
                <div className="relative">
                  <span className="input-prefix absolute left-3 top-1/2 -translate-y-1/2 font-medium" style={{color:'var(--text-3)'}}>Rs.</span>
                  <input type="number" className="input-field input-with-currency" value={returnForm.amount}
                    onChange={(e) => setReturnForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="0.00" min="0.01" step="0.01" required autoFocus />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date *</label>
                  <input type="date" className="input-field" value={returnForm.return_date}
                    onChange={(e) => setReturnForm(p => ({ ...p, return_date: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Reason</label>
                  <input type="text" className="input-field" value={returnForm.reason}
                    onChange={(e) => setReturnForm(p => ({ ...p, reason: e.target.value }))}
                    placeholder="Damage / expiry / wrong item" />
                </div>
              </div>

              <div>
                <label className="label">Notes (optional)</label>
                <input type="text" className="input-field" value={returnForm.notes}
                  onChange={(e) => setReturnForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Item detail or remarks..." />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowReturnModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={returning} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  {returning ? "Saving..." : "Save Return"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            style={{backgroundColor:'var(--bg-card)'}}>
            <div className="flex items-center justify-between p-5" style={{borderBottom:'1px solid var(--border)'}}>
              <div>
                <h2 className="text-lg font-semibold" style={{color:'var(--text)'}}>Record Payment</h2>
                <p className="text-sm" style={{color:'var(--text-3)'}}>{party.name}</p>
              </div>
              <button onClick={() => setShowPayModal(false)} style={{color:'var(--text-3)'}}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePayment} className="p-5 space-y-4">
              {/* Outstanding summary */}
              <div className="rounded-xl p-3 text-sm" style={{backgroundColor:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)'}}>
                <div className="flex justify-between">
                  <span style={{color:'var(--text-3)'}}>Total Outstanding</span>
                  <span className="font-bold text-red-600">Rs.{fmt(summary.outstanding)}</span>
                </div>
              </div>

              <div>
                <label className="label">Payment Against *</label>
                <select className="input-field" value={payForm.payment_type === "invoice" ? payForm.invoice_id : payForm.payment_type}
                  onChange={(e) => {
                    if (e.target.value === "opening" || e.target.value === "general") {
                      const amount = e.target.value === "opening" && openingDue > 0 ? openingDue.toFixed(2) : "";
                      setPayForm(p => ({ ...p, payment_type: e.target.value, invoice_id: "", amount }));
                      return;
                    }
                    const inv = invoices.find(i => i.id === parseInt(e.target.value));
                    const bal = inv ? Math.max(parseFloat(inv.balance ?? 0), 0) : 0;
                    setPayForm(p => ({ ...p, payment_type: "invoice", invoice_id: e.target.value, amount: bal.toFixed(2) }));
                  }} required>
                  <option value="">-- Select Payment Type --</option>
                  {openingDue > 0 && (
                    <option value="opening">Opening Balance - Balance: Rs.{fmt(openingDue)}</option>
                  )}
                  <option value="general">Without Invoice / Manual Payment</option>
                  {invoices.filter(i => i.payment_status !== "paid").map(inv => {
                    const bal = Math.max(parseFloat(inv.balance ?? 0), 0);
                    return (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_no} - Balance: Rs.{fmt(bal)}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="label">Amount Received *</label>
                <div className="relative">
                  <span className="input-prefix absolute left-3 top-1/2 -translate-y-1/2 font-medium" style={{color:'var(--text-3)'}}>Rs.</span>
                  <input type="number" className="input-field input-with-currency" value={payForm.amount}
                    onChange={(e) => setPayForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="0.00" min="0.01" step="0.01" required autoFocus />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date *</label>
                  <input type="date" className="input-field" value={payForm.payment_date}
                    onChange={(e) => setPayForm(p => ({ ...p, payment_date: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Mode</label>
                  <select className="input-field" value={payForm.payment_mode}
                    onChange={(e) => setPayForm(p => ({ ...p, payment_mode: e.target.value }))}>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Reference No. (optional)</label>
                <input type="text" className="input-field" value={payForm.reference_no}
                  onChange={(e) => setPayForm(p => ({ ...p, reference_no: e.target.value }))}
                  placeholder="UTR / Cheque no. / Transaction ID" />
              </div>

              <div>
                <label className="label">Notes (optional)</label>
                <input type="text" className="input-field" value={payForm.notes}
                  onChange={(e) => setPayForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Any remarks..." />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowPayModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={paying} className="btn-success flex-1 flex items-center justify-center gap-2">
                  <IndianRupee className="w-4 h-4" />
                  {paying ? "Saving..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
