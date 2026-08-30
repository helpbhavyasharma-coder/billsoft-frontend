import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { AlertTriangle, History, Package, Plus, RefreshCw, X } from 'lucide-react';
import { EmptyState, LoadingState, PageHeader, SearchField, StatCard } from '../components/ui';

const qty = (n) => parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
const movementLabels = {
  purchase_in: 'Purchased',
  sale_out: 'Sold',
  sale_return_in: 'Sales Return',
  damage: 'Damaged',
  expiry: 'Expired',
  adjustment_in: 'Adjustment In',
  adjustment_out: 'Adjustment Out',
};
const today = new Date().toISOString().slice(0, 10);

export default function Stock() {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [adjustment, setAdjustment] = useState({ product_id: '', movement_date: today, movement_type: 'adjustment_in', qty: '', notes: '' });

  useEffect(() => { fetchStock(); }, []);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/stock/summary');
      if (data.success) setStock(data.stock);
    } catch {
      toast.error('Failed to load stock.');
    } finally {
      setLoading(false);
    }
  };

  const saveAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustment.product_id || !adjustment.qty || parseFloat(adjustment.qty) <= 0) {
      toast.error('Product and valid quantity required.');
      return;
    }
    try {
      await api.post('/stock/adjustment', adjustment);
      toast.success('Stock adjusted.');
      setAdjustment({ product_id: '', movement_date: today, movement_type: 'adjustment_in', qty: '', notes: '' });
      setShowAdjustment(false);
      fetchStock();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to adjust stock.');
    }
  };

  const fetchMovements = async (item) => {
    setSelectedProduct(item);
    setMovements([]);
    setLoadingMovements(true);
    try {
      const { data } = await api.get(`/stock/movements/${item.id}`);
      if (data.success) setMovements(data.movements || []);
    } catch {
      toast.error('Failed to load stock history.');
    } finally {
      setLoadingMovements(false);
    }
  };

  const categories = useMemo(() => [...new Set(stock.map((s) => s.category || 'Uncategorized'))], [stock]);
  const filtered = stock.filter((item) => {
    const cat = item.category || 'Uncategorized';
    return (!category || cat === category) && item.name.toLowerCase().includes(search.toLowerCase());
  });

  const grouped = filtered.reduce((acc, item) => {
    const cat = item.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const totals = filtered.reduce((acc, item) => {
    acc.purchased += parseFloat(item.purchased_qty || 0);
    acc.sold += parseFloat(item.sold_qty || 0);
    acc.damaged += parseFloat(item.damaged_qty || 0);
    acc.expired += parseFloat(item.expired_qty || 0);
    acc.adjustment += parseFloat(item.adjustment_qty || 0);
    acc.current += parseFloat(item.current_stock || 0);
    return acc;
  }, { purchased: 0, sold: 0, damaged: 0, expired: 0, adjustment: 0, current: 0 });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stock Management"
        subtitle={`${filtered.length} products | Purchased, sold, damaged, expired and manual adjustment history.`}
        actions={(
          <>
          <button onClick={() => setShowAdjustment(true)} className="btn-primary text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Adjustment
          </button>
          <button onClick={fetchStock} className="btn-secondary text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Sync
          </button>
          </>
        )}
      />

      {showAdjustment && (
        <form onSubmit={saveAdjustment} className="card grid md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="label">Product</label>
            <select className="input-field" value={adjustment.product_id} onChange={(e) => setAdjustment((p) => ({ ...p, product_id: e.target.value }))}>
              <option value="">Select product</option>
              {stock.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input-field" value={adjustment.movement_date} onChange={(e) => setAdjustment((p) => ({ ...p, movement_date: e.target.value }))} />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input-field" value={adjustment.movement_type} onChange={(e) => setAdjustment((p) => ({ ...p, movement_type: e.target.value }))}>
              <option value="adjustment_in">Stock In</option>
              <option value="adjustment_out">Stock Out</option>
              <option value="damage">Damage</option>
              <option value="expiry">Expiry</option>
            </select>
          </div>
          <div>
            <label className="label">Qty</label>
            <input type="number" min="0.001" step="0.001" className="input-field" value={adjustment.qty} onChange={(e) => setAdjustment((p) => ({ ...p, qty: e.target.value }))} />
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input-field" value={adjustment.notes} onChange={(e) => setAdjustment((p) => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="md:col-span-6 flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdjustment(false)} className="btn-secondary">Cancel</button>
            <button className="btn-primary">Save Adjustment</button>
          </div>
        </form>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Purchased" value={qty(totals.purchased)} tone="success" icon={Package} />
        <StatCard label="Sold" value={qty(totals.sold)} icon={History} />
        <StatCard label="Damage / Expiry" value={qty(totals.damaged + totals.expired)} tone="warning" icon={AlertTriangle} />
        <StatCard label="Adjustment" value={qty(totals.adjustment)} tone={totals.adjustment < 0 ? 'danger' : 'success'} icon={RefreshCw} />
        <StatCard label="Available" value={qty(totals.current)} tone={totals.current < 0 ? 'danger' : 'success'} icon={Package} />
      </div>

      <div className="card grid md:grid-cols-2 gap-3 py-3">
        <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product..." onClear={() => setSearch('')} />
        <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <LoadingState label="Loading stock..." />
      ) : filtered.length === 0 ? (
        <div className="card p-0"><EmptyState icon={Package} title="No stock found" description="Try changing the search/category filter or add products first." /></div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="card p-0 overflow-hidden">
            <div className="px-4 py-3 font-bold" style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-muted)' }}>{cat}</div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="table-header text-left">Product</th>
                    <th className="table-header text-center">Unit</th>
                    <th className="table-header text-right">Purchased</th>
                    <th className="table-header text-right">Sold</th>
                    <th className="table-header text-right">Damaged</th>
                    <th className="table-header text-right">Expired</th>
                    <th className="table-header text-right">Available Stock</th>
                    <th className="table-header text-right">History</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="table-cell font-medium" style={{ color: 'var(--text)' }}>{item.name}</td>
                      <td className="table-cell text-center" style={{ color: 'var(--text-3)' }}>{item.unit}</td>
                      <td className="table-cell text-right text-green-600 font-medium">{qty(item.purchased_qty)}</td>
                      <td className="table-cell text-right text-blue-600 font-medium">{qty(item.sold_qty)}</td>
                      <td className="table-cell text-right text-orange-600 font-medium">{qty(item.damaged_qty)}</td>
                      <td className="table-cell text-right text-red-600 font-medium">{qty(item.expired_qty)}</td>
                      <td className={`table-cell text-right font-bold ${parseFloat(item.current_stock || 0) <= 0 ? 'text-red-500' : 'text-green-600'}`}>{qty(item.current_stock)}</td>
                      <td className="table-cell text-right">
                        <button onClick={() => fetchMovements(item)} className="btn-secondary text-xs inline-flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden p-3 space-y-2">
              {items.map((item) => {
                const available = parseFloat(item.current_stock || 0);
                return (
                  <div key={item.id} className="mobile-card">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="font-bold truncate" style={{ color: 'var(--text)' }}>{item.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>{item.unit || 'Unit'} | {cat}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>Available</p>
                        <p className={`font-black ${available <= 0 ? 'text-red-600' : 'text-green-600'}`}>{qty(available)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="stat-box"><p>Purchased</p><span className="text-green-600">{qty(item.purchased_qty)}</span></div>
                      <div className="stat-box"><p>Sold</p><span className="text-blue-600">{qty(item.sold_qty)}</span></div>
                      <div className="stat-box"><p>Damaged</p><span className="text-orange-600">{qty(item.damaged_qty)}</span></div>
                      <div className="stat-box"><p>Expired</p><span className="text-red-600">{qty(item.expired_qty)}</span></div>
                    </div>
                    <button onClick={() => fetchMovements(item)} className="btn-secondary w-full text-sm">
                      <History className="w-4 h-4" /> View Stock History
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="card p-0 w-full max-w-4xl max-h-[85vh] overflow-hidden">
            <div className="p-4 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <h2 className="font-bold" style={{ color: 'var(--text)' }}>{selectedProduct.name} Stock History</h2>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Purchased, sold, damaged, expired aur manual adjustment entries.</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="p-2 rounded-lg hover:bg-gray-100" title="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            {loadingMovements ? (
              <div className="p-10 text-center" style={{ color: 'var(--text-3)' }}>Loading history...</div>
            ) : movements.length === 0 ? (
              <div className="p-10 text-center" style={{ color: 'var(--text-3)' }}>No movement found for this product.</div>
            ) : (
              <div className="overflow-auto max-h-[65vh]">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th className="table-header text-left">Date</th>
                      <th className="table-header text-left">Type</th>
                      <th className="table-header text-right">In</th>
                      <th className="table-header text-right">Out</th>
                      <th className="table-header text-left">Reference</th>
                      <th className="table-header text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => {
                      const isIn = ['purchase_in', 'adjustment_in'].includes(m.movement_type);
                      return (
                        <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="table-cell">{String(m.movement_date || '').slice(0, 10)}</td>
                          <td className="table-cell">{movementLabels[m.movement_type] || m.movement_type}</td>
                          <td className="table-cell text-right text-green-600 font-medium">{isIn ? qty(m.qty) : '-'}</td>
                          <td className="table-cell text-right text-red-600 font-medium">{isIn ? '-' : qty(m.qty)}</td>
                          <td className="table-cell capitalize">{m.reference_type || '-'}</td>
                          <td className="table-cell">{m.notes || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
