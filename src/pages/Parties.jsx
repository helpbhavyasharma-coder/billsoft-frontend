import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, X, Phone, MapPin } from 'lucide-react';
import { INDIAN_STATES } from '../data/states';

const emptyForm = {
  name: '', address: '', city: '', state: '', mobile: '',
  email: '', gst_no: 'NA', party_type: 'customer', opening_balance: '',
};

const PARTY_PLACEHOLDERS = [
  'Sharma Traders', 'Gupta Enterprises', 'Singh & Sons', 'Patel Stores',
  'Verma Wholesale', 'Kumar Distributors', 'Mehta Agencies', 'Jain Brothers',
  'Agarwal Traders', 'Mishra General Store',
];
const randomPlaceholder = PARTY_PLACEHOLDERS[Math.floor(Math.random() * PARTY_PLACEHOLDERS.length)];

export default function Parties() {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchParties(); }, [search]);

  const fetchParties = async () => {
    setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const { data } = await api.get(`/parties${params}`);
      if (data.success) setParties(data.parties);
    } catch {
      toast.error('Failed to load parties.');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (party) => {
    setEditing(party);
    setForm({
      name: party.name, address: party.address || '', city: party.city || '',
      state: party.state || '', mobile: party.mobile || '', email: party.email || '',
      gst_no: party.gst_no || 'NA', party_type: party.party_type || 'customer',
      opening_balance: party.opening_balance || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Party name is required.'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/parties/${editing.id}`, form);
        toast.success('Party updated!');
      } else {
        await api.post('/parties', form);
        toast.success('Party added!');
      }
      setShowModal(false);
      fetchParties();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save party.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (party) => {
    if (!confirm(`Delete "${party.name}"?`)) return;
    try {
      await api.delete(`/parties/${party.id}`);
      toast.success('Party deleted.');
      fetchParties();
    } catch {
      toast.error('Failed to delete party.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{color:'var(--text)'}}>Parties / Customers</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Party
        </button>
      </div>

      {/* Search */}
      <div className="card py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="input-field pl-9"
            placeholder="Search by name, mobile, GST..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : parties.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No parties found.</p>
            <button onClick={openAdd} className="btn-primary inline-flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Add Party
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="table-header text-left">Name</th>
                    <th className="table-header text-left">Contact</th>
                    <th className="table-header text-left">Location</th>
                    <th className="table-header text-left">GST No.</th>
                    <th className="table-header text-center">Type</th>
                    <th className="table-header text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {parties.map((party) => (
                    <tr key={party.id}
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td className="table-cell font-medium" style={{ color: 'var(--text)' }}>{party.name}</td>
                      <td className="table-cell">
                        {party.mobile && <div className="flex items-center gap-1" style={{ color: 'var(--text-2)' }}><Phone className="w-3 h-3" /> {party.mobile}</div>}
                        {party.email && <div className="text-xs" style={{ color: 'var(--text-3)' }}>{party.email}</div>}
                      </td>
                      <td className="table-cell" style={{ color: 'var(--text-3)' }}>{[party.city, party.state].filter(Boolean).join(', ') || '-'}</td>
                      <td className="table-cell" style={{ color: 'var(--text-3)' }}>{party.gst_no || 'NA'}</td>
                      <td className="table-cell text-center">
                        <span className="text-xs px-2 py-1 rounded-full capitalize"
                          style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                          {party.party_type}
                        </span>
                      </td>
                      <td className="table-cell text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link to={`/parties/${party.id}/ledger`}
                            className="text-xs px-2 py-1 rounded-lg font-medium"
                            style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                            Ledger
                          </Link>
                          <button onClick={() => openEdit(party)} className="hover:text-blue-500 transition-colors" style={{ color: 'var(--text-3)' }}><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(party)} className="hover:text-red-500 transition-colors" style={{ color: 'var(--text-3)' }}><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden p-3 space-y-2">
              {parties.map((party) => (
                <div key={party.id} className="mobile-card">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm" style={{color:'var(--text)'}}>{party.name}</p>
                      {party.mobile && (
                        <p className="text-xs mt-0.5 flex items-center gap-1" style={{color:'var(--text-3)'}}>
                          <Phone className="w-3 h-3" />{party.mobile}
                        </p>
                      )}
                      {party.city && <p className="text-xs" style={{color:'var(--text-3)'}}>{party.city}</p>}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize flex-shrink-0"
                      style={{backgroundColor:'rgba(59,130,246,0.12)', color:'#2563eb'}}>
                      {party.party_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={`/parties/${party.id}/ledger`}
                      className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg"
                      style={{backgroundColor:'rgba(59,130,246,0.1)', color:'#2563eb'}}>
                      Ledger
                    </Link>
                    <button onClick={() => openEdit(party)}
                      className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg"
                      style={{backgroundColor:'rgba(16,185,129,0.1)', color:'#059669'}}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(party)}
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
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="flex items-center justify-between p-6" style={{borderBottom:'1px solid var(--border)'}}>
              <h2 className="text-lg font-semibold" style={{color:'var(--text)'}}>{editing ? 'Edit Party' : 'Add Party'}</h2>
              <button onClick={() => setShowModal(false)} style={{color:'var(--text-3)'}}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="label">Party Name *</label>
                <input className="input-field" value={form.name}
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder={randomPlaceholder} required autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Mobile</label>
                  <input className="input-field" value={form.mobile}
                    onChange={(e) => setForm(p => ({ ...p, mobile: e.target.value }))}
                    placeholder="9610623427" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input-field" value={form.email}
                    onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="party@email.com" />
                </div>
              </div>
              <div>
                <label className="label">Address</label>
                <input className="input-field" value={form.address}
                  onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))}
                  placeholder="Street address" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">City</label>
                  <input className="input-field" value={form.city}
                    onChange={(e) => setForm(p => ({ ...p, city: e.target.value }))}
                    placeholder="Sri Vijaynagar" />
                </div>
                <div>
                  <label className="label">State</label>
                  <select className="input-field" value={form.state}
                    onChange={(e) => setForm(p => ({ ...p, state: e.target.value }))}>
                    <option value="">-- Select State --</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">GST Number</label>
                  <input className="input-field" value={form.gst_no}
                    onChange={(e) => setForm(p => ({ ...p, gst_no: e.target.value }))}
                    placeholder="NA" />
                </div>
                <div>
                  <label className="label">Party Type</label>
                  <select className="input-field" value={form.party_type}
                    onChange={(e) => setForm(p => ({ ...p, party_type: e.target.value }))}>
                    <option value="customer">Customer</option>
                    <option value="supplier">Supplier</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>
              {/* Opening Balance */}
              <div className="rounded-xl p-3 space-y-2" style={{backgroundColor:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.2)'}}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{color:'var(--text)'}}>📊 Opening Balance (पिछला बकाया)</span>
                </div>
                <p className="text-xs" style={{color:'var(--text-3)'}}>2025-26 का पुराना बकाया जोड़ें — यह ledger में दिखेगा</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-sm" style={{color:'var(--text-3)'}}>₹</span>
                  <input type="number" className="input-field pl-7" value={form.opening_balance}
                    onChange={(e) => setForm(p => ({ ...p, opening_balance: e.target.value }))}
                    placeholder="0.00" min="0" step="0.01" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving...' : editing ? 'Update' : 'Add Party'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
