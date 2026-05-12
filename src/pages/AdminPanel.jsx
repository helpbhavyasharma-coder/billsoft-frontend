import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Users, Building2, FileText, IndianRupee, TrendingUp, Package, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { getBusinessType } from '../data/businessTypes';

const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = (n) => parseInt(n || 0).toLocaleString('en-IN');

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedUser, setExpandedUser] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, companiesRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/companies'),
      ]);
      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (usersRes.data.success) setUsers(usersRes.data.users);
      if (companiesRes.data.success) setCompanies(companiesRes.data.companies);
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error('Admin access required.');
      } else {
        toast.error('Failed to load admin data.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );

  if (!stats) return (
    <div className="text-center py-16">
      <p className="text-red-500 font-semibold text-lg">🔒 Admin Access Required</p>
      <p className="text-sm mt-2" style={{ color: 'var(--text-3)' }}>Only the admin account can view this panel.</p>
    </div>
  );

  const statCards = [
    { label: 'Total Users', value: fmtNum(stats.total_users), icon: Users, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    { label: 'Companies', value: fmtNum(stats.total_companies), icon: Building2, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    { label: 'Total Invoices', value: fmtNum(stats.total_invoices), icon: FileText, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Platform Revenue', value: '₹' + fmt(stats.total_revenue), icon: TrendingUp, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    { label: 'Total Parties', value: fmtNum(stats.total_parties), icon: Package, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    { label: 'Total Payments', value: '₹' + fmt(stats.total_payments), icon: IndianRupee, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>🛡️ Admin Panel</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>Platform overview — all users & companies</p>
        </div>
        <button onClick={fetchAll} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="card flex items-center gap-3 py-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: s.bg }}>
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold truncate" style={{ color: 'var(--text)' }}>{s.value}</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
        {[
          { id: 'overview', label: `Users (${users.length})` },
          { id: 'companies', label: `Companies (${companies.length})` },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={activeTab === tab.id
              ? { backgroundColor: 'var(--bg-card)', color: 'var(--text)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
              : { color: 'var(--text-3)' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === 'overview' && (
        <div className="card p-0 overflow-hidden">
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="table-header text-left">#</th>
                  <th className="table-header text-left">Email</th>
                  <th className="table-header text-left">Company</th>
                  <th className="table-header text-left">Business Type</th>
                  <th className="table-header text-right">Invoices</th>
                  <th className="table-header text-right">Revenue</th>
                  <th className="table-header text-right">Parties</th>
                  <th className="table-header text-left">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => {
                  const bt = u.business_type ? getBusinessType(u.business_type) : null;
                  return (
                    <tr key={u.id}
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td className="table-cell text-xs" style={{ color: 'var(--text-3)' }}>{idx + 1}</td>
                      <td className="table-cell font-medium text-sm" style={{ color: 'var(--text)' }}>{u.email}</td>
                      <td className="table-cell">
                        {u.company_name
                          ? <div>
                            <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{u.company_name}</p>
                            {u.city && <p className="text-xs" style={{ color: 'var(--text-3)' }}>{u.city}{u.state ? ', ' + u.state : ''}</p>}
                          </div>
                          : <span className="text-xs text-orange-500">No company</span>}
                      </td>
                      <td className="table-cell">
                        {bt ? <span className="text-xs">{bt.icon} {bt.name}</span> : '-'}
                      </td>
                      <td className="table-cell text-right font-medium" style={{ color: 'var(--text-2)' }}>{fmtNum(u.invoice_count)}</td>
                      <td className="table-cell text-right font-bold text-green-600">₹{fmt(u.total_revenue)}</td>
                      <td className="table-cell text-right" style={{ color: 'var(--text-2)' }}>{fmtNum(u.party_count)}</td>
                      <td className="table-cell text-xs" style={{ color: 'var(--text-3)' }}>
                        {u.created_at ? format(new Date(u.created_at), 'dd MMM yyyy') : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
            {users.map((u, idx) => {
              const bt = u.business_type ? getBusinessType(u.business_type) : null;
              const isExpanded = expandedUser === u.id;
              return (
                <div key={u.id} className="p-4">
                  <div className="flex items-start justify-between gap-2"
                    onClick={() => setExpandedUser(isExpanded ? null : u.id)}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{u.email}</p>
                      {u.company_name
                        ? <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{bt?.icon} {u.company_name}</p>
                        : <p className="text-xs text-orange-500">No company setup</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-bold text-green-600">₹{fmt(u.total_revenue)}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-3)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-3)' }} />}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg p-2 text-center" style={{ backgroundColor: 'var(--bg-muted)' }}>
                        <p style={{ color: 'var(--text-3)' }}>Invoices</p>
                        <p className="font-bold" style={{ color: 'var(--text)' }}>{fmtNum(u.invoice_count)}</p>
                      </div>
                      <div className="rounded-lg p-2 text-center" style={{ backgroundColor: 'var(--bg-muted)' }}>
                        <p style={{ color: 'var(--text-3)' }}>Parties</p>
                        <p className="font-bold" style={{ color: 'var(--text)' }}>{fmtNum(u.party_count)}</p>
                      </div>
                      <div className="rounded-lg p-2 text-center" style={{ backgroundColor: 'var(--bg-muted)' }}>
                        <p style={{ color: 'var(--text-3)' }}>Joined</p>
                        <p className="font-bold" style={{ color: 'var(--text)' }}>
                          {u.created_at ? format(new Date(u.created_at), 'dd MMM yy') : '-'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Companies Tab */}
      {activeTab === 'companies' && (
        <div className="card p-0 overflow-hidden">
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="table-header text-left">Company</th>
                  <th className="table-header text-left">Owner Email</th>
                  <th className="table-header text-left">GST No.</th>
                  <th className="table-header text-left">Type</th>
                  <th className="table-header text-right">Invoices</th>
                  <th className="table-header text-right">Revenue</th>
                  <th className="table-header text-right">Outstanding</th>
                  <th className="table-header text-right">Parties</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => {
                  const bt = c.business_type ? getBusinessType(c.business_type) : null;
                  return (
                    <tr key={c.id}
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td className="table-cell">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{c.company_name}</p>
                        {c.city && <p className="text-xs" style={{ color: 'var(--text-3)' }}>{c.city}{c.state ? ', ' + c.state : ''}</p>}
                      </td>
                      <td className="table-cell text-sm" style={{ color: 'var(--text-2)' }}>{c.user_email}</td>
                      <td className="table-cell text-xs font-mono" style={{ color: 'var(--text-3)' }}>{c.gst_no || 'NA'}</td>
                      <td className="table-cell text-xs">{bt ? `${bt.icon} ${bt.name}` : '-'}</td>
                      <td className="table-cell text-right font-medium" style={{ color: 'var(--text-2)' }}>{fmtNum(c.invoice_count)}</td>
                      <td className="table-cell text-right font-bold text-green-600">₹{fmt(c.total_revenue)}</td>
                      <td className="table-cell text-right font-bold text-red-500">₹{fmt(c.outstanding)}</td>
                      <td className="table-cell text-right" style={{ color: 'var(--text-2)' }}>{fmtNum(c.party_count)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: 'var(--bg-muted)', borderTop: '2px solid var(--border)' }}>
                  <td colSpan={4} className="table-cell font-bold" style={{ color: 'var(--text)' }}>TOTAL</td>
                  <td className="table-cell text-right font-bold" style={{ color: 'var(--text)' }}>{fmtNum(stats.total_invoices)}</td>
                  <td className="table-cell text-right font-bold text-green-600">₹{fmt(stats.total_revenue)}</td>
                  <td className="table-cell text-right font-bold text-red-500">
                    ₹{fmt(companies.reduce((s, c) => s + parseFloat(c.outstanding || 0), 0))}
                  </td>
                  <td className="table-cell text-right font-bold" style={{ color: 'var(--text)' }}>{fmtNum(stats.total_parties)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
            {companies.map((c) => {
              const bt = c.business_type ? getBusinessType(c.business_type) : null;
              return (
                <div key={c.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{c.company_name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>{c.user_email}</p>
                      {bt && <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{bt.icon} {bt.name}</p>}
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-3)' }}>
                      {c.gst_no || 'No GST'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg p-2 text-center" style={{ backgroundColor: 'var(--bg-muted)' }}>
                      <p style={{ color: 'var(--text-3)' }}>Bills</p>
                      <p className="font-bold" style={{ color: 'var(--text)' }}>{fmtNum(c.invoice_count)}</p>
                    </div>
                    <div className="rounded-lg p-2 text-center" style={{ backgroundColor: 'rgba(16,185,129,0.08)' }}>
                      <p style={{ color: 'var(--text-3)' }}>Revenue</p>
                      <p className="font-bold text-green-600">₹{fmt(c.total_revenue)}</p>
                    </div>
                    <div className="rounded-lg p-2 text-center" style={{ backgroundColor: 'rgba(239,68,68,0.08)' }}>
                      <p style={{ color: 'var(--text-3)' }}>Due</p>
                      <p className="font-bold text-red-500">₹{fmt(c.outstanding)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
