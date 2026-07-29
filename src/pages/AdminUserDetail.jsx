import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Building2, FileText, Package, Power, Smartphone, Trash2, Users, Wallet } from 'lucide-react';
import { format } from 'date-fns';

const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = (n) => parseInt(n || 0).toLocaleString('en-IN');
const active = (v) => v === true || v === 1;

export default function AdminUserDetail() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('parties');

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/users/${id}`);
      if (data.success) setDetail(data.detail);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load user details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const toggleUserStatus = async () => {
    const nextActive = !active(detail.user.is_active);
    if (!confirm(`${nextActive ? 'Activate' : 'Deactivate'} ${detail.user.email}?`)) return;
    try {
      await api.patch(`/admin/users/${detail.user.id}/status`, { is_active: nextActive });
      toast.success(nextActive ? 'User activated.' : 'User deactivated.');
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user.');
    }
  };

  const deleteUser = async () => {
    if (!confirm(`Delete ${detail.user.email} and all related data from database? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${detail.user.id}`);
      toast.success('User deleted.');
      window.location.href = '/admin';
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  if (!detail) return <div className="card text-center">User details not found.</div>;

  const { user, stats, lists } = detail;
  const cards = [
    { label: 'Invoices', value: fmtNum(stats.invoices.total), icon: FileText },
    { label: 'Parties', value: fmtNum(lists.parties.length), icon: Users },
    { label: 'Products', value: fmtNum(lists.products.length), icon: Package },
    { label: 'Active Devices', value: fmtNum(stats.active_devices.total), icon: Smartphone },
    { label: 'Payments', value: '₹' + fmt(stats.payments.amount), icon: Wallet },
    { label: 'Outstanding', value: '₹' + fmt(stats.invoices.outstanding), icon: Building2 },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-blue-600 font-medium mb-3"><ArrowLeft className="w-4 h-4" /> Back to Admin Panel</Link>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{user.email}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>{user.company_name || 'No company setup'} · {active(user.is_active) ? 'Active' : 'Inactive'}</p>
        </div>
        {!active(user.is_admin) && (
          <div className="flex gap-2">
            <button onClick={toggleUserStatus} className="btn-secondary flex items-center gap-2 text-sm"><Power className="w-4 h-4" /> {active(user.is_active) ? 'Deactivate' : 'Activate'}</button>
            <button onClick={deleteUser} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Icon className="w-5 h-5" /></div>
            <div><p className="font-bold" style={{ color: 'var(--text)' }}>{value}</p><p className="text-xs" style={{ color: 'var(--text-3)' }}>{label}</p></div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="font-bold mb-3" style={{ color: 'var(--text)' }}>Company Details</h2>
        <div className="grid md:grid-cols-3 gap-3 text-sm" style={{ color: 'var(--text-2)' }}>
          <p><b>Name:</b> {user.company_name || '-'}</p>
          <p><b>Mobile:</b> {user.mobile || '-'}</p>
          <p><b>GST:</b> {user.gst_no || '-'}</p>
          <p><b>PAN:</b> {user.pan_no || '-'}</p>
          <p><b>FSSAI:</b> {user.fssai_no || '-'}</p>
          <p><b>City:</b> {user.city || '-'} {user.state || ''}</p>
          <p><b>Financial Year:</b> {user.financial_year || '-'}</p>
          <p className="md:col-span-2"><b>Address:</b> {user.address || '-'}</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl w-fit overflow-x-auto" style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
        {[['parties', `Parties (${lists.parties.length})`], ['products', `Products (${lists.products.length})`], ['invoices', `Invoices (${lists.invoices.length})`], ['devices', `Devices (${lists.sessions.length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className="px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap" style={tab === key ? { backgroundColor: 'var(--bg-card)', color: 'var(--text)' } : { color: 'var(--text-3)' }}>{label}</button>
        ))}
      </div>

      {tab === 'parties' && <DataTable headers={['Name', 'Mobile', 'Email', 'GST', 'Type', 'Opening', 'Status']} rows={lists.parties.map(p => [p.name, p.mobile || '-', p.email || '-', p.gst_no || '-', p.party_type || '-', '₹' + fmt(p.opening_balance), active(p.is_active) ? 'Active' : 'Inactive'])} />}
      {tab === 'products' && <DataTable headers={['Product', 'HSN', 'Category', 'Unit', 'Rate', 'GST', 'Status']} rows={lists.products.map(p => [p.name, p.hsn_code || '-', p.category || '-', p.unit || '-', '₹' + fmt(p.default_rate), `${p.gst_rate || 0}%`, active(p.is_active) ? 'Active' : 'Inactive'])} />}
      {tab === 'invoices' && <DataTable headers={['Invoice', 'Party', 'Date', 'Amount', 'Paid', 'Payment', 'Status']} rows={lists.invoices.map(i => [i.invoice_no, i.party_name || '-', i.invoice_date ? format(new Date(i.invoice_date), 'dd MMM yyyy') : '-', '₹' + fmt(i.grand_total), '₹' + fmt(i.amount_paid), i.payment_status, i.status])} />}
      {tab === 'devices' && <DataTable headers={['IP Address', 'Device / Browser', 'Last Seen', 'Expires', 'Status']} rows={lists.sessions.map(s => [s.ip_address || '-', s.user_agent || '-', s.last_seen_at ? format(new Date(s.last_seen_at), 'dd MMM yyyy, hh:mm a') : '-', s.expires_at ? format(new Date(s.expires_at), 'dd MMM yyyy') : '-', active(s.is_active) ? 'Active' : 'Inactive'])} />}
    </div>
  );
}

function DataTable({ headers, rows }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>{headers.map(h => <th key={h} className="table-header text-left whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>{rows.length === 0 ? <tr><td colSpan={headers.length} className="table-cell text-center" style={{ color: 'var(--text-3)' }}>No records found.</td></tr> : rows.map((row, idx) => <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>{row.map((cell, i) => <td key={i} className="table-cell text-sm whitespace-nowrap" style={{ color: 'var(--text-2)' }}>{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
