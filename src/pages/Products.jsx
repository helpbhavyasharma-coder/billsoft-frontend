import { useState, useEffect } from 'react';
import api from '../api/axios';
import apiCache from '../api/apiCache';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, X, Package } from 'lucide-react';
import { EmptyState, IconButton, LoadingState, Money, PageHeader, SearchField } from '../components/ui';
import usePageMemory from '../hooks/usePageMemory';

const emptyForm = {
  name: '',
  hsn_code: '',
  unit: 'Pcs',
  default_rate: '',
  gst_rate: 5,
  category: '',
  packaging_unit: 'Bag',
  rate_basis: 'per_pack',
  pieces_per_pack: '',
  packaging_verified: true,
};

const UNITS = ['Pcs', 'KG', 'Gm', 'Ltr', 'Box', 'Bag', 'Dozen', 'Meter', 'Nos'];
const GST_RATES = [0, 5, 12, 18, 28];

export default function Products() {
  const cachedProducts = apiCache.get('/products')?.products || null;
  const [products, setProducts] = useState(() => cachedProducts || []);
  const [loading, setLoading] = useState(() => cachedProducts === null);
  const [search, setSearch] = usePageMemory('products_search', '');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async (silent = false) => {
    if (!silent && products.length === 0) setLoading(true);
    try {
      const { data } = await api.getCached('/products');
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
    const pc = product.packaging_config;
    setForm({
      name: product.name,
      hsn_code: product.hsn_code || '0910',
      unit: product.unit || 'Pcs',
      default_rate: product.default_rate || '',
      gst_rate: product.gst_rate || 5,
      category: product.category || '',
      packaging_unit: pc?.selling_unit || (product.unit === 'Bag' ? 'Bag' : 'Bag'),
      rate_basis: pc?.rate_basis || 'per_pack',
      pieces_per_pack: pc?.pieces_per_pack !== null && pc?.pieces_per_pack !== undefined ? String(pc.pieces_per_pack) : '',
      packaging_verified: pc ? Boolean(pc.is_verified) : true,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Product name is required.'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        hsn_code: form.hsn_code.trim(),
        unit: form.unit,
        default_rate: form.default_rate === '' ? 0 : parseFloat(form.default_rate),
        gst_rate: parseFloat(form.gst_rate),
        category: form.category.trim(),
        packaging_unit: form.packaging_unit.trim() || 'Bag',
        rate_basis: form.rate_basis || 'per_pack',
        pieces_per_pack: form.pieces_per_pack !== '' && !isNaN(parseFloat(form.pieces_per_pack)) ? parseFloat(form.pieces_per_pack) : null,
        packaging_verified: Boolean(form.packaging_verified),
      };

      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
        toast.success('Product updated!');
      } else {
        await api.post('/products', payload);
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
      setProducts(prev => prev.filter(p => p.id !== product.id));
      await api.delete(`/products/${product.id}`);
      toast.success('Product deleted.');
      fetchProducts(true);
    } catch {
      toast.error('Failed to delete product.');
      fetchProducts();
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Products / Items"
        subtitle={`${filtered.length} products | Saved rate, GST, packaging memory & HSN for faster billing.`}
        actions={(
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        )}
      />

      {/* Search */}
      <div className="card py-3">
        <SearchField
          placeholder="Search products or HSN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <LoadingState label="Loading products..." />
      ) : filtered.length === 0 ? (
        <div className="card p-0">
          <EmptyState
            icon={Package}
            title="No products found"
            description={search ? 'Try a different product name or HSN.' : 'Add products with GST and saved rates to create invoices faster.'}
            action={<button onClick={openAdd} className="btn-primary inline-flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Add Product</button>}
          />
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
                  <th className="table-header text-center">Unit & Packaging</th>
                  <th className="table-header text-right">Default Rate</th>
                  <th className="table-header text-center">GST %</th>
                  <th className="table-header text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const pc = product.packaging_config;
                  return (
                    <tr key={product.id}
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td className="table-cell font-medium" style={{ color: 'var(--text)' }}>
                        <div>{product.name}</div>
                        {product.category && (
                          <span className="text-[10px] text-muted block">{product.category}</span>
                        )}
                      </td>
                      <td className="table-cell text-center" style={{ color: 'var(--text-3)' }}>{product.hsn_code || '-'}</td>
                      <td className="table-cell text-center" style={{ color: 'var(--text-3)' }}>
                        <span className="font-semibold text-xs">{product.unit}</span>
                        {pc && (
                          <div className="mt-0.5">
                            <span className={`text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
                              pc.is_verified ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            }`}>
                              {pc.selling_unit} • {pc.pieces_per_pack ? `${pc.pieces_per_pack} pcs` : 'unverified'} {pc.is_verified ? '✓' : '⚠️'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="table-cell text-right font-medium">
                        {parseFloat(product.default_rate || 0) > 0 ? (
                          <span className="text-green-500 font-semibold"><Money value={product.default_rate} /></span>
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
                          <IconButton label={`Edit ${product.name}`} onClick={() => openEdit(product)}><Edit className="w-4 h-4" /></IconButton>
                          <IconButton label={`Delete ${product.name}`} variant="danger" onClick={() => handleDelete(product)}><Trash2 className="w-4 h-4" /></IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden p-3 space-y-2">
            {filtered.map((product) => {
              const pc = product.packaging_config;
              return (
                <div key={product.id} className="mobile-card">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate" style={{color:'var(--text)'}}>{product.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs" style={{color:'var(--text-3)'}}>HSN: {product.hsn_code || '-'}</span>
                        <span className="text-xs" style={{color:'var(--text-3)'}}>• {product.unit}</span>
                        {pc && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${pc.is_verified ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'}`}>
                            {pc.selling_unit} ({pc.pieces_per_pack ? `${pc.pieces_per_pack} pcs` : '?'}) {pc.is_verified ? '✓' : '⚠️'}
                          </span>
                        )}
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                          style={{backgroundColor:'rgba(34,197,94,0.12)', color:'#16a34a'}}>
                          GST {product.gst_rate}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {parseFloat(product.default_rate || 0) > 0 ? (
                        <span className="text-sm font-bold text-green-600"><Money value={product.default_rate} /></span>
                      ) : (
                        <span className="text-xs font-medium" style={{color:'var(--text-3)'}}>No price</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(product)}
                      className="flex-1 text-center text-xs font-semibold py-2 rounded-lg"
                      style={{backgroundColor:'rgba(59,130,246,0.1)', color:'#2563eb'}}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(product)}
                      className="flex-1 text-center text-xs font-semibold py-2 rounded-lg"
                      style={{backgroundColor:'rgba(220,38,38,0.1)', color:'#dc2626'}}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box max-w-lg">
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
                  placeholder="e.g. Por Washing Powder 115 GM" required autoFocus />
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
                  placeholder="e.g. Detergent, Cleaning, Grocery" />
              </div>

              {/* Packaging Memory Section */}
              <div className="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-900/40 space-y-3" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-blue-500" />
                    Packaging Memory & Inventory Conversion
                  </span>
                  <span className="text-[10px] text-muted">Stock conversion memory</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-[11px]">Selling Unit</label>
                    <input
                      type="text"
                      className="input-field text-xs"
                      value={form.packaging_unit}
                      onChange={(e) => setForm((p) => ({ ...p, packaging_unit: e.target.value }))}
                      placeholder="e.g. Bag, Peti, Box"
                    />
                  </div>
                  <div>
                    <label className="label text-[11px]">Pieces per {form.packaging_unit || 'Unit'}</label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      className="input-field text-xs font-semibold"
                      value={form.pieces_per_pack}
                      onChange={(e) => setForm((p) => ({ ...p, pieces_per_pack: e.target.value }))}
                      placeholder="e.g. 60"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 items-center pt-1">
                  <div>
                    <label className="label text-[11px]">Default Rate Basis</label>
                    <select
                      className="input-field text-xs"
                      value={form.rate_basis}
                      onChange={(e) => setForm((p) => ({ ...p, rate_basis: e.target.value }))}
                    >
                      <option value="per_pack">Rate is Per {form.packaging_unit || 'Bag'}</option>
                      <option value="per_piece">Rate is Per Piece</option>
                    </select>
                  </div>
                  <div className="pt-4 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="pkg_verified_cb"
                      checked={form.packaging_verified}
                      onChange={(e) => setForm((p) => ({ ...p, packaging_verified: e.target.checked }))}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="pkg_verified_cb" className="text-xs font-medium cursor-pointer select-none">
                      Conversion Verified
                    </label>
                  </div>
                </div>
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
