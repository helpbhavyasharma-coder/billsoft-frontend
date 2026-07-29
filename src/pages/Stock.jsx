import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { History, Package, RefreshCw, Search, X } from 'lucide-react';

const qty = (n) => parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
const movementLabels = {
  purchase_in: 'Purchased',
  sale_out: 'Sold',
  damage: 'Damaged',
  expiry: 'Expired',
  adjustment_in: 'Adjustment In',
  adjustment_out: 'Adjustment Out',
};

export default function Stock() {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Stock Management</h1>
        <div className="flex items-center gap-3">
          <div className="text-sm" style={{ color: 'var(--text-3)' }}>{filtered.length} products</div>
          <button onClick={fetchStock} className="btn-secondary text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Sync
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="card py-3"><p className="text-xs" style={{ color: 'var(--text-3)' }}>Total Purchased</p><p className="text-lg font-bold text-green-600">{qty(totals.purchased)}</p></div>
        <div className="card py-3"><p className="text-xs" style={{ color: 'var(--text-3)' }}>Total Sold</p><p className="text-lg font-bold text-blue-600">{qty(totals.sold)}</p></div>
        <div className="card py-3"><p className="text-xs" style={{ color: 'var(--text-3)' }}>Damage / Expiry</p><p className="text-lg font-bold text-orange-600">{qty(totals.damaged + totals.expired)}</p></div>
        <div className="card py-3"><p className="text-xs" style={{ color: 'var(--text-3)' }}>Adjustment</p><p className={`text-lg font-bold ${totals.adjustment < 0 ? 'text-red-500' : 'text-green-600'}`}>{qty(totals.adjustment)}</p></div>
        <div className="card py-3"><p className="text-xs" style={{ color: 'var(--text-3)' }}>Available Stock</p><p className={`text-lg font-bold ${totals.current < 0 ? 'text-red-500' : 'text-green-600'}`}>{qty(totals.current)}</p></div>
      </div>

      <div className="card grid md:grid-cols-2 gap-3 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-3)' }} />
          <input className="input-field input-with-icon" placeholder="Search product..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16"><Package className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--border)' }} /><p style={{ color: 'var(--text-3)' }}>No stock found.</p></div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="card p-0 overflow-hidden">
            <div className="px-4 py-3 font-bold" style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-muted)' }}>{cat}</div>
            <div className="overflow-x-auto">
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
