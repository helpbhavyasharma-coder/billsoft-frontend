import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, Trash2, X, Phone, MapPin, IndianRupee, RotateCcw, Eye, FileText, Ban } from "lucide-react";
import { format } from "date-fns";
import { StatusBadge } from '../components/ui';

const fmt = (n) => parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

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
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [viewingPurchase, setViewingPurchase] = useState(null);
  const [paying, setPaying] = useState(false);
  const [returning, setReturning] = useState(false);
  const [activeTab, setActiveTab] = useState("auto"); // auto resolves based on party type
  const [viewMode, setViewMode] = useState("auto"); // for 'both' type: 'customer' or 'supplier'

  const [payForm, setPayForm] = useState({
    invoice_id: "",
    purchase_id: "",
    account_id: "",
    payment_type: "general",
    amount: "",
    payment_date: format(new Date(), "yyyy-MM-dd"),
    payment_mode: "cash",
    reference_no: "",
    notes: "",
    idempotency_key: "",
  });
  const [bankAccounts, setBankAccounts] = useState([]);

  useEffect(() => {
    api.get("/ledgers/accounts").then(({ data }) => {
      if (data?.success) {
        setBankAccounts((data.accounts || []).filter(a => a.account_type === 'bank' && a.is_active != 0));
      }
    }).catch(() => {});
  }, []);

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
      if (res.success) {
        setData(res);
        if (viewMode === "auto") {
          setViewMode(res.party?.party_type === "supplier" ? "supplier" : "customer");
        }
      }
    } catch { toast.error("Failed to load ledger."); }
    finally { setLoading(false); }
  };

  const generateIdempotencyKey = () => `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const openCustomerPayModal = (invoice) => {
    const outstanding = Math.max(parseFloat(invoice.balance ?? 0), 0);
    setSelectedInvoice(invoice);
    setSelectedPurchase(null);
    setPayForm({
      invoice_id: invoice.id,
      purchase_id: "",
      account_id: bankAccounts[0]?.id || "",
      payment_type: "invoice",
      amount: outstanding.toFixed(2),
      payment_date: format(new Date(), "yyyy-MM-dd"),
      payment_mode: "cash",
      reference_no: "",
      notes: "",
      idempotency_key: generateIdempotencyKey(),
    });
    setPaying(false);
    setShowPayModal(true);
  };

  const openSupplierPayModal = (purchase) => {
    const outstanding = Math.max(parseFloat(purchase.payable ?? (parseFloat(purchase.grand_total || 0) - parseFloat(purchase.amount_paid || 0))), 0);
    setSelectedPurchase(purchase);
    setSelectedInvoice(null);
    setPayForm({
      invoice_id: "",
      purchase_id: purchase.id,
      account_id: bankAccounts[0]?.id || "",
      payment_type: "purchase",
      amount: outstanding.toFixed(2),
      payment_date: format(new Date(), "yyyy-MM-dd"),
      payment_mode: "cash",
      reference_no: "",
      notes: "",
      idempotency_key: generateIdempotencyKey(),
    });
    setPaying(false);
    setShowPayModal(true);
  };

  const openGeneralPayModal = () => {
    setSelectedInvoice(null);
    setSelectedPurchase(null);
    setPayForm({
      invoice_id: "",
      purchase_id: "",
      account_id: bankAccounts[0]?.id || "",
      payment_type: "general",
      amount: "",
      payment_date: format(new Date(), "yyyy-MM-dd"),
      payment_mode: "cash",
      reference_no: "",
      notes: "",
      idempotency_key: generateIdempotencyKey(),
    });
    setPaying(false);
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
    if (paying) return;
    if (payForm.payment_type === "invoice" && !payForm.invoice_id) { toast.error("Select an invoice."); return; }
    if (payForm.payment_type === "purchase" && !payForm.purchase_id) { toast.error("Select a purchase bill."); return; }
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) { toast.error("Enter valid amount."); return; }
    setPaying(true);

    const currentKey = payForm.idempotency_key || generateIdempotencyKey();
    if (!payForm.idempotency_key) {
      setPayForm(p => ({ ...p, idempotency_key: currentKey }));
    }

    try {
      const payload = {
        ...payForm,
        idempotency_key: currentKey,
        party_id: parseInt(partyId),
        invoice_id: payForm.payment_type === "invoice" ? parseInt(payForm.invoice_id) : null,
        purchase_id: payForm.payment_type === "purchase" ? parseInt(payForm.purchase_id) : null,
      };
      const { data: res } = await api.post("/payments", payload);
      if (res.success) {
        toast.success(res.is_idempotent_replay ? "Payment already recorded (replayed)." : "Payment recorded!");
        setShowPayModal(false);
        setPayForm({
          invoice_id: "",
          purchase_id: "",
          payment_type: "general",
          amount: "",
          payment_date: format(new Date(), "yyyy-MM-dd"),
          payment_mode: "cash",
          reference_no: "",
          notes: "",
          idempotency_key: "",
        });

        try {
          await fetchLedger();
        } catch (refreshErr) {
          console.error("Ledger display refresh failed after successful payment:", refreshErr);
          toast.warning("Payment recorded successfully, but ledger display failed to refresh. Please refresh page.");
        }
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

  const loadPurchaseDetail = async (purchaseId) => {
    try {
      const { data: res } = await api.get("/purchases/" + purchaseId);
      if (res.success) setViewingPurchase(res.purchase);
    } catch {
      toast.error("Failed to load purchase details.");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );
  if (!data) return <div className="text-center py-12" style={{color:'var(--text-3)'}}>Party not found.</div>;

  const { party, invoices = [], purchases = [], cancelled_purchases = [], payments = [], returns = [], summary = {}, customer_summary = {}, supplier_summary = {} } = data;
  const isSupplier = party.party_type === "supplier";
  const isBoth = party.party_type === "both";
  const currentView = isBoth ? (viewMode === "supplier" ? "supplier" : "customer") : (isSupplier ? "supplier" : "customer");
  const activeSummary = currentView === "supplier" ? (supplier_summary.total_bills !== undefined ? supplier_summary : summary) : (customer_summary.total_invoices !== undefined ? customer_summary : summary);

  const unpaidInvoices = invoices.filter(i => i.payment_status !== "paid");
  const unpaidPurchases = purchases.filter(p => p.payment_status !== "paid");
  const openingDue = Math.max(parseFloat(activeSummary.opening_balance || 0) - parseFloat(activeSummary.general_paid || 0), 0);

  // Determine current active tab
  const resolvedTab = activeTab === "auto" ? (currentView === "supplier" ? "purchases" : "invoices") : activeTab;

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
            <p className="text-sm" style={{color:'var(--text-3)'}}>
              {currentView === "supplier" ? "Supplier Ledger (खाता विवरण - लेनदार)" : "Customer Ledger (खाता विवरण - देनदार)"}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          {isBoth && (
            <div className="flex rounded-lg overflow-hidden border mr-2" style={{borderColor:'var(--border)'}}>
              <button
                type="button"
                onClick={() => { setViewMode("customer"); setActiveTab("invoices"); }}
                className={`px-3 py-1.5 text-xs font-semibold ${currentView === "customer" ? "bg-blue-600 text-white" : "bg-transparent text-gray-600"}`}>
                Sales / Receivable
              </button>
              <button
                type="button"
                onClick={() => { setViewMode("supplier"); setActiveTab("purchases"); }}
                className={`px-3 py-1.5 text-xs font-semibold ${currentView === "supplier" ? "bg-purple-600 text-white" : "bg-transparent text-gray-600"}`}>
                Purchases / Payable
              </button>
            </div>
          )}

          {currentView === "customer" && (
            <button onClick={() => openReturnModal()}
              className="btn-secondary flex items-center gap-2 text-sm text-orange-700 border-orange-200 hover:bg-orange-50">
              <RotateCcw className="w-4 h-4" /> Goods Return
            </button>
          )}

          <button onClick={openGeneralPayModal}
            className="btn-success flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> {currentView === "supplier" ? "Record Payment" : "Add Payment"}
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
          <p className="text-2xl font-bold" style={{color:'var(--text)'}}>
            {currentView === "supplier" ? (activeSummary.total_bills ?? purchases.length) : (activeSummary.total_invoices ?? invoices.length)}
          </p>
          <p className="text-xs mt-1" style={{color:'var(--text-3)'}}>
            {currentView === "supplier" ? "Total Bills" : "Total Bills"}
          </p>
        </div>
        <div className="card text-center py-3 px-2">
          <p className="text-lg font-bold" style={{color:'var(--text)'}}>₹{fmt(activeSummary.total_amount || activeSummary.total_purchases)}</p>
          <p className="text-xs mt-1" style={{color:'var(--text-3)'}}>
            {currentView === "supplier" ? "Total Purchases" : "Total Business"}
          </p>
        </div>
        <div className="card text-center py-3 px-2" style={{borderColor:'rgba(34,197,94,0.4)'}}>
          <p className="text-lg font-bold text-green-600">₹{fmt(activeSummary.total_paid)}</p>
          <p className="text-xs mt-1" style={{color:'var(--text-3)'}}>
            {currentView === "supplier" ? "Total Paid" : "Total Received"}
          </p>
        </div>
        <div className="card text-center py-3 px-2" style={{borderColor:'rgba(249,115,22,0.4)'}}>
          <p className="text-lg font-bold text-orange-600">₹{fmt(activeSummary.goods_return_total || 0)}</p>
          <p className="text-xs mt-1" style={{color:'var(--text-3)'}}>
            {currentView === "supplier" ? "Debit Notes / Adj." : "Goods Return"}
          </p>
        </div>
        <div className="card text-center py-3 px-2" style={{borderColor:'rgba(220,38,38,0.4)'}}>
          <p className="text-lg font-bold text-red-600">₹{fmt(activeSummary.outstanding ?? activeSummary.payable)}</p>
          <p className="text-xs mt-1" style={{color:'var(--text-3)'}}>
            {currentView === "supplier" ? "Payable to Supplier" : "Outstanding Due"}
          </p>
        </div>
      </div>

      {/* Opening Balance Banner */}
      {parseFloat(activeSummary.opening_balance || 0) > 0 && (
        <div className="rounded-lg p-3 flex items-center justify-between flex-wrap gap-2"
          style={{backgroundColor:'rgba(234,179,8,0.1)', border:'1px solid rgba(234,179,8,0.4)'}}>
          <div>
            <p className="text-sm font-semibold text-yellow-700">Opening Balance (पिछला बकाया)</p>
            <p className="text-xs text-yellow-600">Purana bacha hua balance jo is ledger me add kiya gaya hai.</p>
          </div>
          <span className="text-lg font-bold text-yellow-700">₹{fmt(activeSummary.opening_balance)}</span>
        </div>
      )}

      {/* On-Account / Advance Payments Banner (Hidden on customer ledger for clean view) */}
      {currentView === "supplier" && parseFloat(activeSummary.general_paid || 0) > 0 && (
        <div className="rounded-lg p-3 flex items-center justify-between flex-wrap gap-2"
          style={{backgroundColor:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.3)'}}>
          <div>
            <p className="text-sm font-semibold text-blue-700">
              On-Account Payments (खाते में भुगतान)
            </p>
            <p className="text-xs text-blue-600">
              Unallocated payments made to supplier not linked to a specific purchase bill.
            </p>
          </div>
          <span className="text-lg font-bold text-blue-700">₹{fmt(activeSummary.general_paid)}</span>
        </div>
      )}

      {/* Outstanding Alert */}
      {parseFloat(activeSummary.outstanding ?? activeSummary.payable ?? 0) > 0 && (
        <div className="rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3"
          style={{backgroundColor:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.3)'}}>
          <div>
            <p className="font-semibold text-red-700">
              {currentView === "supplier" ? "Pending Supplier Balance (देय राशि)" : "Outstanding Due (प्राप्य राशि)"}
            </p>
            <p className="text-sm text-red-600">
              {currentView === "supplier"
                ? `${unpaidPurchases.length} purchase bill(s) pending payment`
                : `${unpaidInvoices.length} invoice(s) pending payment`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-red-700">₹{fmt(activeSummary.outstanding ?? activeSummary.payable)}</span>
            <button onClick={openGeneralPayModal} className="btn-danger text-sm py-1.5">
              {currentView === "supplier" ? "Pay Now" : "Collect Now"}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit flex-wrap" style={{backgroundColor:'var(--bg-muted)', border:'1px solid var(--border)'}}>
        {currentView === "supplier" ? (
          [
            { id: "purchases", label: "Purchases (" + purchases.length + ")" },
            { id: "payments", label: "Payments (" + payments.length + ")" },
            { id: "cancelled", label: "Cancelled Bills (" + cancelled_purchases.length + ")" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={
                resolvedTab === tab.id
                  ? {backgroundColor:'var(--bg-card)', color:'var(--text)', boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}
                  : {color:'var(--text-3)'}
              }>
              {tab.label}
            </button>
          ))
        ) : (
          [
            { id: "invoices", label: "Invoices (" + invoices.length + ")" },
            { id: "payments", label: "Payments (" + payments.length + ")" },
            { id: "returns", label: "Returns (" + returns.length + ")" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={
                resolvedTab === tab.id
                  ? {backgroundColor:'var(--bg-card)', color:'var(--text)', boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}
                  : {color:'var(--text-3)'}
              }>
              {tab.label}
            </button>
          ))
        )}
      </div>

      {/* Supplier Purchases Tab */}
      {currentView === "supplier" && resolvedTab === "purchases" && (
        <div className="card p-0 overflow-hidden">
          {purchases.length === 0 ? (
            <p className="text-center py-10 text-sm" style={{color:'var(--text-3)'}}>No purchase bills found for this supplier.</p>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{borderBottom:'1px solid var(--border)'}}>
                      <th className="table-header text-left">Date</th>
                      <th className="table-header text-left">Bill No.</th>
                      <th className="table-header text-right">Amount</th>
                      <th className="table-header text-right">Paid</th>
                      <th className="table-header text-right">Payable</th>
                      <th className="table-header text-center">Status</th>
                      <th className="table-header text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map(purchase => {
                      const payable = Math.max(parseFloat(purchase.payable ?? (parseFloat(purchase.grand_total || 0) - parseFloat(purchase.amount_paid || 0))), 0);
                      return (
                        <tr key={purchase.id} style={{borderBottom:'1px solid var(--border)'}} className="hover:bg-gray-50/50">
                          <td className="table-cell">{format(new Date(purchase.purchase_date), "dd MMM yyyy")}</td>
                          <td className="table-cell font-medium">{purchase.bill_no || `#${purchase.id}`}</td>
                          <td className="table-cell text-right font-bold">₹{fmt(purchase.grand_total)}</td>
                          <td className="table-cell text-right text-green-600 font-medium">₹{fmt(purchase.amount_paid)}</td>
                          <td className="table-cell text-right text-red-600 font-bold">₹{fmt(payable)}</td>
                          <td className="table-cell text-center"><StatusBadge status={purchase.payment_status} /></td>
                          <td className="table-cell text-center">
                            <div className="flex items-center justify-center gap-2">
                              {payable > 0 && (
                                <button onClick={() => openSupplierPayModal(purchase)} className="btn-primary text-xs py-1 px-2.5">
                                  + Pay
                                </button>
                              )}
                              <button onClick={() => loadPurchaseDetail(purchase.id)} className="p-1 rounded text-blue-600 hover:bg-blue-50" title="View Bill">
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden p-3 space-y-2">
                {purchases.map(purchase => {
                  const payable = Math.max(parseFloat(purchase.payable ?? (parseFloat(purchase.grand_total || 0) - parseFloat(purchase.amount_paid || 0))), 0);
                  return (
                    <div key={purchase.id} className="mobile-card">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="font-bold text-sm" style={{color:'var(--text)'}}>{purchase.bill_no || `#${purchase.id}`}</p>
                          <p className="text-xs" style={{color:'var(--text-3)'}}>{format(new Date(purchase.purchase_date), "dd MMM yyyy")}</p>
                        </div>
                        <StatusBadge status={purchase.payment_status} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
                        <div><span style={{color:'var(--text-3)'}}>Total:</span> <span className="font-bold">₹{fmt(purchase.grand_total)}</span></div>
                        <div><span style={{color:'var(--text-3)'}}>Paid:</span> <span className="text-green-600 font-semibold">₹{fmt(purchase.amount_paid)}</span></div>
                        <div><span style={{color:'var(--text-3)'}}>Payable:</span> <span className="text-red-600 font-bold">₹{fmt(payable)}</span></div>
                      </div>
                      <div className="flex gap-2">
                        {payable > 0 && (
                          <button onClick={() => openSupplierPayModal(purchase)} className="btn-primary text-xs py-1.5 flex-1">
                            + Pay (₹{fmt(payable)})
                          </button>
                        )}
                        <button onClick={() => loadPurchaseDetail(purchase.id)} className="btn-secondary text-xs py-1.5 px-3">
                          <Eye className="w-4 h-4" /> View
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Supplier Cancelled Bills Tab */}
      {currentView === "supplier" && resolvedTab === "cancelled" && (
        <div className="card p-0 overflow-hidden">
          {cancelled_purchases.length === 0 ? (
            <p className="text-center py-10 text-sm" style={{color:'var(--text-3)'}}>No cancelled purchase bills.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{borderBottom:'1px solid var(--border)'}}>
                    <th className="table-header text-left">Bill Date</th>
                    <th className="table-header text-left">Bill No.</th>
                    <th className="table-header text-right">Amount</th>
                    <th className="table-header text-left">Cancelled Date</th>
                    <th className="table-header text-left">Reason</th>
                    <th className="table-header text-center">Status</th>
                    <th className="table-header text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cancelled_purchases.map(pb => (
                    <tr key={pb.id} style={{borderBottom:'1px solid var(--border)'}} className="opacity-75 bg-red-50/20">
                      <td className="table-cell">{format(new Date(pb.purchase_date), "dd MMM yyyy")}</td>
                      <td className="table-cell font-medium line-through">{pb.bill_no || `#${pb.id}`}</td>
                      <td className="table-cell text-right font-medium">₹{fmt(pb.grand_total)}</td>
                      <td className="table-cell text-xs text-gray-500">{pb.cancelled_at ? format(new Date(pb.cancelled_at), "dd MMM yyyy HH:mm") : "-"}</td>
                      <td className="table-cell text-xs">{pb.cancellation_reason || "Cancelled"}</td>
                      <td className="table-cell text-center"><span className="badge badge-danger">Cancelled</span></td>
                      <td className="table-cell text-center">
                        <button onClick={() => loadPurchaseDetail(pb.id)} className="p-1 rounded text-blue-600 hover:bg-blue-50" title="View Bill">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Customer Invoices Tab */}
      {currentView === "customer" && resolvedTab === "invoices" && (
        <div className="card p-0 overflow-hidden">
          {invoices.length === 0 ? (
            <p className="text-center py-10 text-sm" style={{color:'var(--text-3)'}}>No invoices found.</p>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{borderBottom:'1px solid var(--border)'}}>
                      <th className="table-header text-left">Date</th>
                      <th className="table-header text-left">Invoice No.</th>
                      <th className="table-header text-right">Grand Total</th>
                      <th className="table-header text-right">Paid</th>
                      <th className="table-header text-right">Returns</th>
                      <th className="table-header text-right">Balance</th>
                      <th className="table-header text-center">Status</th>
                      <th className="table-header text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(invoice => {
                      const balance = Math.max(parseFloat(invoice.balance ?? 0), 0);
                      return (
                        <tr key={invoice.id} style={{borderBottom:'1px solid var(--border)'}} className="hover:bg-gray-50/50">
                          <td className="table-cell">{format(new Date(invoice.invoice_date), "dd MMM yyyy")}</td>
                          <td className="table-cell font-medium">
                            <Link to={`/invoices/${invoice.id}`} className="text-blue-600 hover:underline">
                              {invoice.invoice_no}
                            </Link>
                          </td>
                          <td className="table-cell text-right font-bold">₹{fmt(invoice.grand_total)}</td>
                          <td className="table-cell text-right text-green-600 font-medium">₹{fmt(invoice.amount_paid)}</td>
                          <td className="table-cell text-right text-orange-600 font-medium">
                            {parseFloat(invoice.goods_return_total || 0) > 0 ? "₹" + fmt(invoice.goods_return_total) : "-"}
                          </td>
                          <td className="table-cell text-right text-red-600 font-bold">₹{fmt(balance)}</td>
                          <td className="table-cell text-center"><StatusBadge status={invoice.payment_status} /></td>
                          <td className="table-cell text-center">
                            <div className="flex items-center justify-center gap-1">
                              {balance > 0 && (
                                <button onClick={() => openCustomerPayModal(invoice)} className="btn-primary text-xs py-1 px-2.5">
                                  + Pay
                                </button>
                              )}
                              {balance > 0 && (
                                <button onClick={() => openReturnModal(invoice)} className="btn-secondary text-xs py-1 px-2 text-orange-700">
                                  Return
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden p-3 space-y-2">
                {invoices.map(invoice => {
                  const balance = Math.max(parseFloat(invoice.balance ?? 0), 0);
                  return (
                    <div key={invoice.id} className="mobile-card">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <Link to={`/invoices/${invoice.id}`} className="font-bold text-sm text-blue-600 hover:underline">
                            {invoice.invoice_no}
                          </Link>
                          <p className="text-xs" style={{color:'var(--text-3)'}}>{format(new Date(invoice.invoice_date), "dd MMM yyyy")}</p>
                        </div>
                        <StatusBadge status={invoice.payment_status} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
                        <div><span style={{color:'var(--text-3)'}}>Total:</span> <span className="font-bold">₹{fmt(invoice.grand_total)}</span></div>
                        <div><span style={{color:'var(--text-3)'}}>Paid:</span> <span className="text-green-600 font-semibold">₹{fmt(invoice.amount_paid)}</span></div>
                        <div><span style={{color:'var(--text-3)'}}>Balance:</span> <span className="text-red-600 font-bold">₹{fmt(balance)}</span></div>
                      </div>
                      {balance > 0 && (
                        <div className="flex gap-2">
                          <button onClick={() => openCustomerPayModal(invoice)} className="btn-primary text-xs py-1.5 flex-1">
                            + Pay (₹{fmt(balance)})
                          </button>
                          <button onClick={() => openReturnModal(invoice)} className="btn-secondary text-xs py-1.5 px-3 text-orange-700">
                            Return
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

      {/* Payments Tab (Unified for both Customer & Supplier) */}
      {resolvedTab === "payments" && (
        <div className="card p-0 overflow-hidden">
          {payments.length === 0 ? (
            <p className="text-center py-10 text-sm" style={{color:'var(--text-3)'}}>No payments recorded.</p>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{borderBottom:'1px solid var(--border)'}}>
                      <th className="table-header text-left">Date</th>
                      <th className="table-header text-left">Mode</th>
                      <th className="table-header text-left">{currentView === "supplier" ? "Purchase Bill / Ref" : "Invoice / Ref"}</th>
                      <th className="table-header text-right">Amount</th>
                      <th className="table-header text-left">Notes</th>
                      <th className="table-header text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(payment => (
                      <tr key={payment.id} style={{borderBottom:'1px solid var(--border)'}} className="hover:bg-gray-50/50">
                        <td className="table-cell">{format(new Date(payment.payment_date), "dd MMM yyyy")}</td>
                        <td className="table-cell">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${modeColors[payment.payment_mode] || "bg-gray-100 text-gray-700"}`}>
                            {payment.payment_mode ? payment.payment_mode.replace("_", " ") : "cash"}
                          </span>
                        </td>
                        <td className="table-cell">
                          {payment.bill_no && <span className="text-purple-600 font-medium mr-2">Bill: {payment.bill_no}</span>}
                          {payment.invoice_no && <span className="text-blue-600 font-medium mr-2">Inv: {payment.invoice_no}</span>}
                          {payment.reference_no && <span className="text-xs text-gray-500 font-mono">({payment.reference_no})</span>}
                          {!payment.bill_no && !payment.invoice_no && !payment.reference_no && <span className="text-gray-400">On-Account</span>}
                        </td>
                        <td className="table-cell text-right font-bold text-green-600">₹{fmt(payment.amount)}</td>
                        <td className="table-cell text-xs text-gray-500">{payment.notes || "-"}</td>
                        <td className="table-cell text-center">
                          <button onClick={() => deletePayment(payment.id)} className="text-red-400 hover:text-red-600 p-1" title="Delete Payment">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden p-3 space-y-2">
                {payments.map(payment => (
                  <div key={payment.id} className="mobile-card">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${modeColors[payment.payment_mode] || "bg-gray-100 text-gray-700"}`}>
                        {payment.payment_mode ? payment.payment_mode.replace("_", " ") : "cash"}
                      </span>
                      <span className="font-bold text-green-600">₹{fmt(payment.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{format(new Date(payment.payment_date), "dd MMM yyyy")}</span>
                      <span>
                        {payment.bill_no ? `Bill: ${payment.bill_no}` : payment.invoice_no ? `Inv: ${payment.invoice_no}` : "On-Account"}
                      </span>
                      <button onClick={() => deletePayment(payment.id)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Customer Returns Tab */}
      {currentView === "customer" && resolvedTab === "returns" && (
        <div className="card p-0 overflow-hidden">
          {returns.length === 0 ? (
            <p className="text-center py-10 text-sm" style={{color:'var(--text-3)'}}>No goods returns recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{borderBottom:'1px solid var(--border)'}}>
                    <th className="table-header text-left">Date</th>
                    <th className="table-header text-left">Invoice No.</th>
                    <th className="table-header text-left">Reason</th>
                    <th className="table-header text-right">Amount</th>
                    <th className="table-header text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.map(r => (
                    <tr key={r.id} style={{borderBottom:'1px solid var(--border)'}}>
                      <td className="table-cell">{format(new Date(r.return_date), "dd MMM yyyy")}</td>
                      <td className="table-cell font-medium">{r.invoice_no || "General Adjustment"}</td>
                      <td className="table-cell text-xs">{r.reason || "Goods return"}</td>
                      <td className="table-cell text-right font-bold text-orange-600">₹{fmt(r.amount)}</td>
                      <td className="table-cell text-center">
                        <button onClick={() => deleteReturn(r.id)} className="text-red-400 hover:text-red-600 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Purchase Detail Modal */}
      {viewingPurchase && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="card w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold" style={{color:'var(--text)'}}>
                  Purchase Bill {viewingPurchase.bill_no || `#${viewingPurchase.id}`}
                  {viewingPurchase.status === 'cancelled' && <span className="badge badge-danger ml-2">Cancelled</span>}
                </h2>
                <p className="text-sm" style={{color:'var(--text-3)'}}>
                  Date: {format(new Date(viewingPurchase.purchase_date), "dd MMM yyyy")} | Supplier: {viewingPurchase.supplier_name || party.name}
                </p>
                {viewingPurchase.status === 'cancelled' && viewingPurchase.cancellation_reason && (
                  <p className="text-xs text-red-600 mt-1">Cancellation Reason: {viewingPurchase.cancellation_reason}</p>
                )}
              </div>
              <button onClick={() => setViewingPurchase(null)} className="p-1 rounded-lg" style={{color:'var(--text-3)'}}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{borderBottom:'1px solid var(--border)'}}>
                    <th className="table-header text-left">Product</th>
                    <th className="table-header text-right">Bill Qty</th>
                    <th className="table-header text-right">Accepted</th>
                    <th className="table-header text-right">Rate</th>
                    <th className="table-header text-right">GST %</th>
                    <th className="table-header text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewingPurchase.items || []).map(item => (
                    <tr key={item.id} style={{borderBottom:'1px solid var(--border)'}}>
                      <td className="table-cell">{item.product_name || `Product #${item.product_id}`}</td>
                      <td className="table-cell text-right">{item.qty}</td>
                      <td className="table-cell text-right font-semibold">{item.accepted_qty}</td>
                      <td className="table-cell text-right">₹{fmt(item.rate)}</td>
                      <td className="table-cell text-right">{item.gst_rate}%</td>
                      <td className="table-cell text-right font-bold">₹{fmt(item.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-right space-y-1 text-sm" style={{color:'var(--text)'}}>
              <p>Taxable: ₹{fmt(viewingPurchase.subtotal)} | GST: ₹{fmt(viewingPurchase.total_gst)}</p>
              <p>Round Off: ₹{fmt(viewingPurchase.round_off)}</p>
              <p className="text-base font-bold">Grand Total: ₹{fmt(viewingPurchase.grand_total)}</p>
              <p className="text-green-600 font-semibold">Amount Paid: ₹{fmt(viewingPurchase.amount_paid)}</p>
              <p className="text-red-600 font-bold">Payable: ₹{fmt(Math.max(parseFloat(viewingPurchase.grand_total || 0) - parseFloat(viewingPurchase.amount_paid || 0), 0))}</p>
            </div>
          </div>
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
                  <span className="font-bold text-red-600">₹{fmt(activeSummary.outstanding)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span style={{color:'var(--text-3)'}}>Previous Goods Return</span>
                  <span className="font-bold text-orange-600">₹{fmt(activeSummary.goods_return_total)}</span>
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
                        {inv.invoice_no} - Balance: ₹{fmt(bal)}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="label">Return Amount *</label>
                <div className="relative">
                  <span className="input-prefix absolute left-3 top-1/2 -translate-y-1/2 font-medium" style={{color:'var(--text-3)'}}>₹</span>
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

      {/* Payment Modal (Supports Customer and Supplier Payments) */}
      {showPayModal && (
        <div id="party-payment-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            style={{backgroundColor:'var(--bg-card)'}}>
            <div className="flex items-center justify-between p-5" style={{borderBottom:'1px solid var(--border)'}}>
              <div>
                <h2 className="text-lg font-semibold" style={{color:'var(--text)'}}>
                  {currentView === "supplier" ? "Record Payment to Supplier" : "Record Payment from Customer"}
                </h2>
                <p className="text-sm" style={{color:'var(--text-3)'}}>{party.name}</p>
              </div>
              <button onClick={() => setShowPayModal(false)} style={{color:'var(--text-3)'}}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePayment} className="p-5 space-y-4">
              {/* Balance Summary */}
              <div className="rounded-xl p-3 text-sm" style={{backgroundColor:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)'}}>
                <div className="flex justify-between">
                  <span style={{color:'var(--text-3)'}}>
                    {currentView === "supplier" ? "Total Payable Balance" : "Total Outstanding"}
                  </span>
                  <span className="font-bold text-red-600">₹{fmt(activeSummary.outstanding ?? activeSummary.payable)}</span>
                </div>
              </div>

              {/* Payment Allocation Selection */}
              <div>
                <label className="label">Payment Against *</label>
                {currentView === "supplier" ? (
                  <select className="input-field"
                    value={payForm.payment_type === "purchase" ? payForm.purchase_id : payForm.payment_type}
                    onChange={(e) => {
                      if (e.target.value === "general") {
                        setPayForm(p => ({ ...p, payment_type: "general", purchase_id: "", invoice_id: "", amount: "" }));
                        return;
                      }
                      const pb = purchases.find(p => p.id === parseInt(e.target.value));
                      const bal = pb ? Math.max(parseFloat(pb.payable ?? (parseFloat(pb.grand_total || 0) - parseFloat(pb.amount_paid || 0))), 0) : 0;
                      setPayForm(p => ({ ...p, payment_type: "purchase", purchase_id: e.target.value, invoice_id: "", amount: bal.toFixed(2) }));
                    }} required>
                    <option value="">-- Select Payment Allocation --</option>
                    <option value="general">On-Account / General Payment to Supplier</option>
                    {purchases.filter(p => p.payment_status !== "paid").map(pb => {
                      const bal = Math.max(parseFloat(pb.payable ?? (parseFloat(pb.grand_total || 0) - parseFloat(pb.amount_paid || 0))), 0);
                      return (
                        <option key={pb.id} value={pb.id}>
                          Bill: {pb.bill_no || `#${pb.id}`} - Payable: ₹{fmt(bal)} ({format(new Date(pb.purchase_date), "dd/MM/yyyy")})
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <select className="input-field" value={payForm.payment_type === "invoice" ? payForm.invoice_id : payForm.payment_type}
                    onChange={(e) => {
                      if (e.target.value === "opening" || e.target.value === "general") {
                        const amount = e.target.value === "opening" && openingDue > 0 ? openingDue.toFixed(2) : "";
                        setPayForm(p => ({ ...p, payment_type: e.target.value, invoice_id: "", purchase_id: "", amount }));
                        return;
                      }
                      const inv = invoices.find(i => i.id === parseInt(e.target.value));
                      const bal = inv ? Math.max(parseFloat(inv.balance ?? 0), 0) : 0;
                      setPayForm(p => ({ ...p, payment_type: "invoice", invoice_id: e.target.value, purchase_id: "", amount: bal.toFixed(2) }));
                    }} required>
                    <option value="">-- Select Payment Type --</option>
                    {openingDue > 0 && (
                      <option value="opening">Opening Balance - Balance: ₹{fmt(openingDue)}</option>
                    )}
                    <option value="general">Without Invoice / Manual Payment</option>
                    {invoices.filter(i => i.payment_status !== "paid").map(inv => {
                      const bal = Math.max(parseFloat(inv.balance ?? 0), 0);
                      return (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoice_no} - Balance: ₹{fmt(bal)}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="label">
                  {currentView === "supplier" ? "Amount Paid *" : "Amount Received *"}
                </label>
                <div className="relative">
                  <span className="input-prefix absolute left-3 top-1/2 -translate-y-1/2 font-medium" style={{color:'var(--text-3)'}}>₹</span>
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
                  <label className="label">Payment Mode</label>
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

              {payForm.payment_mode === 'cash' ? (
                <div className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-center gap-2">
                  <span>💵 <strong>Khata:</strong> Cash in Hand (Galla / Rokad)</span>
                </div>
              ) : (
                <div>
                  <label className="label">Deposit To Bank Account</label>
                  {bankAccounts.length <= 1 ? (
                    <div className="text-xs text-blue-800 bg-blue-50 p-2.5 rounded-lg border border-blue-200 flex items-center justify-between">
                      <span>🏦 <strong>Bank:</strong> {bankAccounts[0]?.name || 'Primary Bank Account'}</span>
                      {bankAccounts[0]?.account_no && <span className="font-mono text-gray-600">A/C: {bankAccounts[0].account_no}</span>}
                    </div>
                  ) : (
                    <select
                      className="input-field"
                      value={payForm.account_id || bankAccounts[0]?.id}
                      onChange={(e) => setPayForm(p => ({ ...p, account_id: e.target.value }))}
                    >
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id}>{b.name} {b.account_no ? `(A/C: ${b.account_no})` : ''}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

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
                  {paying ? "Saving..." : (currentView === "supplier" ? "Record Supplier Payment" : "Record Payment")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
