import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { FileText, Users, TrendingUp, AlertCircle, Plus, ArrowRight, IndianRupee, Package, Clock } from 'lucide-react';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { getBusinessType } from '../data/businessTypes';

const statusColors = {
  unpaid: 'bg-red-100 text-red-700',
  partial: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
};

const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Dashboard() {
  const { company } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentFyStart = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const [year, setYear] = useState(currentFyStart);

  useEffect(() => { fetchDashboard(); }, [year]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get(`/reports/dashboard?year=${year}`);
      if (res.success) setData(res.data);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );

  const years = [2024, 2025, 2026, 2027];
  const fyLabel = `${year}-${String(Number(year) + 1).slice(2)}`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold" style={{color:'var(--text)'}}>
              {company?.company_name || 'Dashboard'}
            </h1>
            {company?.business_type && (() => {
              const bt = getBusinessType(company.business_type);
              return (
                <span className="text-sm px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: 'rgba(37,99,235,0.1)', color: '#2563eb' }}>
                  {bt.icon} {bt.name}
                </span>
              );
            })()}
          </div>
          <p className="text-sm mt-0.5" style={{color:'var(--text-3)'}}>{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <select
            className="input-field w-24 sm:w-28 text-sm"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            {years.map(y => <option key={y} value={y}>{y}-{String(y+1).slice(2)}</option>)}
          </select>
          <Link to="/invoices/new" className="btn-primary inline-flex items-center justify-center gap-1.5 text-sm whitespace-nowrap px-3 py-2 min-w-fit">
            <Plus className="w-4 h-4 flex-shrink-0" /> <span>New Invoice</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium" style={{color:'var(--text-3)'}}>This Month</p>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-xl font-bold" style={{color:'var(--text)'}}>₹{fmt(data?.this_month?.total)}</p>
          <p className="text-xs mt-1" style={{color:'var(--text-3)'}}>{data?.this_month?.count || 0} invoices</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium" style={{color:'var(--text-3)'}}>Year Total</p>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-xl font-bold" style={{color:'var(--text)'}}>₹{fmt(data?.year_total?.total)}</p>
          <p className="text-xs mt-1" style={{color:'var(--text-3)'}}>{data?.year_total?.count || 0} invoices</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium" style={{color:'var(--text-3)'}}>Outstanding</p>
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-red-600">₹{fmt(data?.outstanding?.total)}</p>
          <p className="text-xs mt-1" style={{color:'var(--text-3)'}}>{data?.outstanding?.count || 0} parties</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium" style={{color:'var(--text-3)'}}>Quick Links</p>
          </div>
          <div className="space-y-1.5">
            <Link to="/invoices/new" className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
              <FileText className="w-3.5 h-3.5" /> New Invoice
            </Link>
            <Link to="/parties" className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
              <Users className="w-3.5 h-3.5" /> Parties
            </Link>
            <Link to="/outstanding" className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium">
              <AlertCircle className="w-3.5 h-3.5" /> Outstanding
            </Link>
          </div>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="card">
        <h2 className="font-semibold mb-4" style={{color:'var(--text)'}}>Monthly Sales - {fyLabel}</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data?.monthly_chart || []} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickFormatter={(v) => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)' }}
              formatter={(value, name) => [`₹${fmt(value)}`, name === 'sales' ? 'Sales' : 'Tax']}
            />
            <Legend formatter={(v) => v === 'sales' ? 'Sales' : 'Tax'} />
            <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="tax" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Customers + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold" style={{color:'var(--text)'}}>Top Customers</h2>
            <span className="text-xs" style={{color:'var(--text-3)'}}>{fyLabel}</span>
          </div>
          {data?.top_customers?.length === 0 ? (
            <p className="text-sm text-center py-4" style={{color:'var(--text-3)'}}>No data yet</p>
          ) : (
            <div className="space-y-2">
              {data?.top_customers?.map((c, idx) => (
                <div key={idx} className="flex items-center justify-between py-1.5" style={{borderBottom:'1px solid var(--border)'}}>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center justify-center font-bold">{idx + 1}</span>
                    <div>
                      <p className="text-sm font-medium" style={{color:'var(--text)'}}>{c.name}</p>
                      <p className="text-xs" style={{color:'var(--text-3)'}}>{c.invoice_count} invoices</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold" style={{color:'var(--text)'}}>₹{fmt(c.total_business)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold" style={{color:'var(--text)'}}>Top Products</h2>
            <span className="text-xs" style={{color:'var(--text-3)'}}>{fyLabel}</span>
          </div>
          {data?.top_products?.length === 0 ? (
            <p className="text-sm text-center py-4" style={{color:'var(--text-3)'}}>No data yet</p>
          ) : (
            <div className="space-y-2">
              {data?.top_products?.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between py-1.5" style={{borderBottom:'1px solid var(--border)'}}>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-green-100 text-green-700 rounded-full text-xs flex items-center justify-center font-bold">{idx + 1}</span>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[160px]" style={{color:'var(--text)'}}>{p.description}</p>
                      <p className="text-xs" style={{color:'var(--text-3)'}}>Qty: {parseFloat(p.total_qty).toFixed(0)}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold" style={{color:'var(--text)'}}>₹{fmt(p.total_sale)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold" style={{color:'var(--text)'}}>Recent Invoices</h2>
          <Link to="/invoices" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {data?.recent_invoices?.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-10 h-10 mx-auto mb-3" style={{color:'var(--border)'}} />
            <p className="text-sm" style={{color:'var(--text-3)'}}>No invoices yet.</p>
            <Link to="/invoices/new" className="btn-primary mt-3 inline-flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Create first invoice
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{borderBottom:'1px solid var(--border)'}}>
                    <th className="table-header text-left">Invoice No.</th>
                    <th className="table-header text-left">Party</th>
                    <th className="table-header text-left">Date</th>
                    <th className="table-header text-right">Amount</th>
                    <th className="table-header text-center">Status</th>
                    <th className="table-header text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recent_invoices?.map((inv) => (
                    <tr key={inv.id}
                      style={{borderBottom:'1px solid var(--border)'}}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor='var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
                      <td className="table-cell font-medium text-blue-600">{inv.invoice_no}</td>
                      <td className="table-cell" style={{color:'var(--text)'}}>{inv.party_name}</td>
                      <td className="table-cell" style={{color:'var(--text-3)'}}>
                        {inv.invoice_date ? format(new Date(inv.invoice_date), 'dd MMM yyyy') : '-'}
                      </td>
                      <td className="table-cell text-right font-medium" style={{color:'var(--text)'}}>₹{fmt(inv.grand_total)}</td>
                      <td className="table-cell text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold
                          ${inv.payment_status === 'paid' ? 'badge-paid' :
                            inv.payment_status === 'partial' ? 'badge-partial' : 'badge-unpaid'}`}>
                          {inv.payment_status}
                        </span>
                      </td>
                      <td className="table-cell text-center">
                        <Link to={`/invoices/${inv.id}`} className="text-blue-600 hover:text-blue-700 text-xs font-medium">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2 mt-1">
              {data?.recent_invoices?.map((inv) => (
                <Link key={inv.id} to={`/invoices/${inv.id}`} className="block mobile-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-blue-600 text-sm">{inv.invoice_no}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                          ${inv.payment_status === 'paid' ? 'badge-paid' :
                            inv.payment_status === 'partial' ? 'badge-partial' : 'badge-unpaid'}`}>
                          {inv.payment_status}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate" style={{color:'var(--text)'}}>{inv.party_name}</p>
                      <p className="text-xs mt-0.5" style={{color:'var(--text-3)'}}>
                        {inv.invoice_date ? format(new Date(inv.invoice_date), 'dd MMM yyyy') : '-'}
                      </p>
                    </div>
                    <p className="font-bold text-sm flex-shrink-0" style={{color:'var(--text)'}}>
                      ₹{fmt(inv.grand_total)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
      {/* Coming Soon Features for this business type */}
      {company?.business_type && (() => {
        const bt = getBusinessType(company.business_type);
        if (!bt.comingSoon || bt.comingSoon.length === 0) return null;

        const comingSoonLabels = {
          barcode: 'ðŸ“¦ Barcode Scan',
          expiry: 'â° Expiry Tracking',
          weight: 'âš–ï¸ Weight Products',
          supplier: 'ðŸ­ Supplier Ledger',
          warranty: 'ðŸ›¡ï¸ Warranty Tracking',
          serial: 'ðŸ”¢ Serial Number',
          repair: 'ðŸ”§ Repair Tracking',
          emi: 'ðŸ’³ EMI / Finance',
          size: 'ðŸ“ Size Management',
          color: 'ðŸŽ¨ Color Variants',
          return: 'â†©ï¸ Return/Exchange',
          combo: 'ðŸŽ Combo Offers',
          student: 'ðŸ‘¨â€ðŸŽ“ Student Ledger',
          batch: 'ðŸ“… Batch Management',
          attendance: 'âœ… Attendance',
          fee_reminder: 'ðŸ”” Fee Reminder',
          imei: 'ðŸ“± IMEI Tracking',
          exchange: 'ðŸ”„ Exchange Records',
          prescription: 'ðŸ’Š Prescription',
          schedule: 'ðŸ“‹ Schedule Medicine',
          batch_no: 'ðŸ·ï¸ Batch Number',
          table: 'ðŸ½ï¸ Table Management',
          kot: 'ðŸ“ KOT System',
          recipe: 'ðŸ‘¨â€ðŸ³ Recipe Cost',
          appointment: 'ðŸ“† Appointments',
          service_history: 'ðŸ“œ Service History',
        };

        return (
          <div className="card" style={{ borderColor: 'rgba(251,191,36,0.4)', backgroundColor: 'rgba(251,191,36,0.05)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-yellow-500" />
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                Coming Soon for {bt.icon} {bt.name}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {bt.comingSoon.map(f => (
                <span key={f} className="text-xs px-3 py-1.5 rounded-full font-medium"
                  style={{ backgroundColor: 'rgba(251,191,36,0.15)', color: '#92400e', border: '1px solid rgba(251,191,36,0.3)' }}>
                  {comingSoonLabels[f] || f}
                </span>
              ))}
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--text-3)' }}>
              These features are being developed specifically for your business type. Stay tuned!
            </p>
          </div>
        );
      })()}
    </div>
  );
}
