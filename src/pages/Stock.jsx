import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Package, Search } from 'lucide-react';

const qty = (n) => parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });

export default function Stock() {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Stock Management</h1>
        <div className="text-sm" style={{ color: 'var(--text-3)' }}>{filtered.length} products</div>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
