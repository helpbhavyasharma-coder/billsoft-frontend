import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, X, Package } from 'lucide-react';

const emptyForm = {
  name: '', hsn_code: '', unit: 'Pcs', default_rate: '', gst_rate: 5, category: '',
};

const UNITS = ['Pcs', 'KG', 'Gm', 'Ltr', 'Box', 'Bag', 'Dozen', 'Meter', 'Nos'];
const GST_RATES = [0, 5, 12, 18, 28];

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/products');
      if (data.success) setProducts(data.products);
    } catch {
      toast.error('Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.hsn_code && p.hsn_code.includes(search))
  );

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name, hsn_code: product.hsn_code || '0910',
      unit: product.unit || 'Pcs', default_rate: product.default_rate || '',
      gst_rate: product.gst_rate || 5, category: product.category || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Product name is required.'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, form);
        toast.success('Product updated!');
      } else {
        await api.post('/products', form);
        toast.success('Product added!');
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product) => {
    if (!confirm(`Delete "${product.name}"?`)) return;
    try {
      await api.delete(`/products/${product.id}`);
      toast.success('Product deleted.');
      fetchProducts();
    } catch {
      toast.error('Failed to delete product.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{color:'var(--text)'}}>Products / Items</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Search */}
      <div className="card py-3">
        <div className="relative">
          <Search className="input-prefix absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="input-field input-with-icon"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="text-sm" style={{color:'var(--text-3)'}}>
        {filtered.length} product{filtered.length !== 1 ? 's' : ''}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Package className="w-10 h-10 mx-auto mb-3" style={{color:'var(--border)'}} />
          <p className="mb-4" style={{color:'var(--text-3)'}}>No products found.</p>
          <button onClick={openAdd} className="btn-primary inline-flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="table-header text-left">Product Name</th>
                  <th className="table-header text-center">HSN</th>
                  <th className="table-header text-center">Unit</th>
                  <th className="table-header text-right">Default Rate</th>
                  <th className="table-header text-center">GST %</th>
                  <th className="table-header text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id}
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td className="table-cell font-medium" style={{ color: 'var(--text)' }}>{product.name}</td>
                    <td className="table-cell text-center" style={{ color: 'var(--text-3)' }}>{product.hsn_code || '-'}</td>
                    <td className="table-cell text-center" style={{ color: 'var(--text-3)' }}>{product.unit}</td>
                    <td className="table-cell text-right font-medium">
                      {parseFloat(product.default_rate || 0) > 0 ? (
                        <span className="text-green-500 font-semibold">₹{parseFloat(product.default_rate).toFixed(2)}</span>
                      ) : (
                        <span className="text-orange-500 text-xs font-medium">Not set</span>
                      )}
                    </td>
                    <td className="table-cell text-center">
                      <span className="text-xs px-2 py-1 rounded-full"
                        style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                        {product.gst_rate}%
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(product)} className="hover:text-blue-500 transition-colors" style={{ color: 'var(--text-3)' }}><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(product)} className="hover:text-red-500 transition-colors" style={{ color: 'var(--text-3)' }}><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden p-3 space-y-2">
            {filtered.map((product) => (
              <div key={product.id} className="mobile-card">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate" style={{color:'var(--text)'}}>{product.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs" style={{color:'var(--text-3)'}}>HSN: {product.hsn_code || '-'}</span>
                      <span className="text-xs" style={{color:'var(--text-3)'}}>• {product.unit}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                        style={{backgroundColor:'rgba(34,197,94,0.12)', color:'#16a34a'}}>
                        GST {product.gst_rate}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {parseFloat(product.default_rate || 0) > 0 ? (
                      <span className="text-sm font-bold text-green-600">₹{parseFloat(product.default_rate).toFixed(2)}</span>
                    ) : (
                      <span className="text-xs font-medium" style={{color:'var(--text-3)'}}>No price</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(product)}
                    className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg"
                    style={{backgroundColor:'rgba(59,130,246,0.1)', color:'#2563eb'}}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(product)}
                    className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg"
                    style={{backgroundColor:'rgba(220,38,38,0.1)', color:'#dc2626'}}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="flex items-center justify-between p-6" style={{borderBottom:'1px solid var(--border)'}}>
              <h2 className="text-lg font-semibold" style={{color:'var(--text)'}}>{editing ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setShowModal(false)} style={{color:'var(--text-3)'}}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="label">Product Name *</label>
                <input className="input-field" value={form.name}
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Product Name" required autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">HSN Code</label>
                  <input className="input-field" value={form.hsn_code}
                    onChange={(e) => setForm(p => ({ ...p, hsn_code: e.target.value }))}
                    placeholder="e.g. 0910" />
                </div>
                <div>
                  <label className="label">Unit</label>
                  <select className="input-field" value={form.unit}
                    onChange={(e) => setForm(p => ({ ...p, unit: e.target.value }))}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Default Rate (₹)</label>
                  <input type="number" className="input-field" value={form.default_rate}
                    onChange={(e) => setForm(p => ({ ...p, default_rate: e.target.value }))}
                    placeholder="0.00" min="0" step="0.01" />
                </div>
                <div>
                  <label className="label">GST Rate</label>
                  <select className="input-field" value={form.gst_rate}
                    onChange={(e) => setForm(p => ({ ...p, gst_rate: e.target.value }))}>
                    {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Category (optional)</label>
                <input className="input-field" value={form.category}
                  onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))}
                  placeholder="e.g. Electronics, Clothing, Food" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving...' : editing ? 'Update' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
