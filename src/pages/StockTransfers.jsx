import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  ArrowLeftRight, Plus, Trash2, Calendar, Building2,
  Package, X, Eye, ArrowRight, CheckCircle2, FileText
} from 'lucide-react';
import { PageHeader, SearchField, Money, LoadingState, EmptyState } from '../components/ui';

export default function StockTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingTransfer, setViewingTransfer] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    transfer_no: '',
    transfer_date: new Date().toISOString().split('T')[0],
    from_warehouse_id: '',
    to_warehouse_id: '',
    notes: '',
    items: [{ product_id: '', qty: 1, unit: 'Pcs', notes: '' }],
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [search]);

  const fetchInitialData = async () => {
    try {
      const [whRes, prRes, noRes] = await Promise.all([
        api.get('/warehouses'),
        api.get('/products'),
        api.get('/stock-transfers/next-number'),
      ]);
      if (whRes.data.warehouses) setWarehouses(whRes.data.warehouses);
      if (prRes.data.products) setProducts(prRes.data.products);
      if (noRes.data.transfer_no) {
        setForm(prev => ({ ...prev, transfer_no: noRes.data.transfer_no }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const { data } = await api.get(`/stock-transfers?${params}`);
      if (data.success) {
        setTransfers(data.transfers || []);
      }
    } catch (err) {
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = async () => {
    try {
      const { data } = await api.get('/stock-transfers/next-number');
      const fromId = warehouses[0]?.id || '';
      const toId = warehouses[1]?.id || '';
      setForm({
        transfer_no: data.transfer_no || 'TR-0001',
        transfer_date: new Date().toISOString().split('T')[0],
        from_warehouse_id: fromId,
        to_warehouse_id: toId,
        notes: '',
        items: [{ product_id: products[0]?.id || '', qty: 1, unit: products[0]?.unit || 'Pcs', notes: '' }],
      });
      setIsModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...form.items];
    const row = { ...updated[index], [field]: value };
    if (field === 'product_id') {
      const p = products.find(prod => String(prod.id) === String(value));
      if (p) row.unit = p.unit || 'Pcs';
    }
    updated[index] = row;
    setForm({ ...form, items: updated });
  };

  const addItemRow = () => {
    setForm({
      ...form,
      items: [...form.items, { product_id: products[0]?.id || '', qty: 1, unit: 'Pcs', notes: '' }]
    });
  };

  const removeItemRow = (index) => {
    if (form.items.length === 1) return;
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.from_warehouse_id || !form.to_warehouse_id) {
      toast.error('Please select source and destination warehouses');
      return;
    }
    if (String(form.from_warehouse_id) === String(form.to_warehouse_id)) {
      toast.error('Source and destination warehouses cannot be the same');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        from_warehouse_id: Number(form.from_warehouse_id),
        to_warehouse_id: Number(form.to_warehouse_id),
        items: form.items.map(it => ({
          product_id: Number(it.product_id),
          qty: Number(it.qty),
          unit: it.unit,
          notes: it.notes,
        })),
      };

      const { data } = await api.post('/stock-transfers', payload);
      if (data.success) {
        toast.success(data.message || 'Stock transfer completed');
        setIsModalOpen(false);
        fetchTransfers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, trNo) => {
    if (!window.confirm(`Reverse stock transfer ${trNo}? Stock movements will be rolled back.`)) return;
    try {
      const { data } = await api.delete(`/stock-transfers/${id}`);
      if (data.success) {
        toast.success('Transfer cancelled & stock reversed');
        fetchTransfers();
      }
    } catch (err) {
      toast.error('Failed to cancel transfer');
    }
  };

  const handleViewDetail = async (id) => {
    try {
      const { data } = await api.get(`/stock-transfers/${id}`);
      if (data.success) {
        setViewingTransfer(data.transfer);
      }
    } catch (err) {
      toast.error('Failed to load transfer details');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader
        title="Stock Transfers (गोदाम ट्रांसफर)"
        subtitle="Move inventory between Godowns, Shops and Counters with automated dual-movement tracking"
        action={
          <button
            onClick={handleOpenCreate}
            disabled={warehouses.length < 2}
            title={warehouses.length < 2 ? "Add at least 2 warehouses first" : ""}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            New Stock Transfer
          </button>
        }
      />

      {warehouses.length < 2 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-xs text-amber-800 dark:text-amber-300">
          <b>Notice:</b> You currently have only {warehouses.length} warehouse configured. Create at least 2 warehouses in the Warehouses tab to transfer stock between them.
        </div>
      )}

      {/* Search Toolbar */}
      <div className="flex gap-3">
        <div className="flex-1">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search by transfer #, source or destination godown..."
          />
        </div>
      </div>

      {/* Transfers List */}
      {loading ? (
        <LoadingState message="Loading transfer records..." />
      ) : transfers.length === 0 ? (
        <EmptyState
          title="No Stock Transfers"
          description="Move goods from your central warehouse to your shop counters."
          action={
            warehouses.length >= 2 ? (
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                New Stock Transfer
              </button>
            ) : null
          }
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 text-xs">
              <tr>
                <th className="py-3 px-4">Transfer #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Source Godown</th>
                <th className="py-3 px-4">Destination Godown</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Total Qty</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {transfers.map((tr) => (
                <tr key={tr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    {tr.transfer_no}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {tr.transfer_date}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                    {tr.from_warehouse_name}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <ArrowRight className="w-3.5 h-3.5" />
                      {tr.to_warehouse_name}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">
                    {tr.items_count} lines
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                    {Number(tr.total_qty).toFixed(2)} units
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleViewDetail(tr.id)}
                        title="View Transfer"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tr.id, tr.transfer_no)}
                        title="Cancel & Reverse Transfer"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* Mobile Transfers Cards */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {transfers.map((tr) => (
              <div key={tr.id} className="p-3.5 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-sm">{tr.transfer_no}</span>
                    <p className="text-xs text-slate-400 mt-0.5">{tr.transfer_date}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {Number(tr.total_qty).toFixed(2)} units
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">{tr.items_count} item(s)</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{tr.from_warehouse_name}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{tr.to_warehouse_name}</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleViewDetail(tr.id)}
                    className="btn-secondary text-xs py-1.5 px-3 rounded-lg flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Details
                  </button>
                  <button
                    onClick={() => handleDelete(tr.id, tr.transfer_no)}
                    className="p-1.5 text-rose-600 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50"
                    title="Cancel Transfer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Stock Transfer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-indigo-600" />
                New Inter-Warehouse Stock Transfer
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Transfer No. *
                  </label>
                  <input
                    type="text"
                    value={form.transfer_no}
                    onChange={(e) => setForm({ ...form, transfer_no: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50 font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Transfer Date *
                  </label>
                  <input
                    type="date"
                    value={form.transfer_date}
                    onChange={(e) => setForm({ ...form, transfer_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Transfer Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Counter replenishment"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Warehouses Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Source Godown (From) *
                  </label>
                  <select
                    value={form.from_warehouse_id}
                    onChange={(e) => setForm({ ...form, from_warehouse_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">-- Select Source --</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Destination Godown (To) *
                  </label>
                  <select
                    value={form.to_warehouse_id}
                    onChange={(e) => setForm({ ...form, to_warehouse_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">-- Select Destination --</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Items to Transfer
                  </span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Row
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                  {form.items.map((row, idx) => (
                    <div key={idx} className="p-2.5 flex items-center gap-2">
                      <div className="flex-1">
                        <select
                          value={row.product_id}
                          onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                          required
                          className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          placeholder="Qty"
                          value={row.qty}
                          onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                          required
                          className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="w-16 text-xs text-slate-500 font-medium">
                        {row.unit}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        disabled={form.items.length === 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Transferring...' : 'Execute Stock Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Details Modal */}
      {viewingTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-mono">
                  {viewingTransfer.transfer_no}
                </h3>
                <p className="text-xs text-slate-500">{viewingTransfer.transfer_date}</p>
              </div>
              <button
                onClick={() => setViewingTransfer(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl flex items-center justify-between text-sm">
              <div>
                <span className="text-xs text-slate-400 block">From:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewingTransfer.from_warehouse_name}</span>
              </div>
              <ArrowRight className="w-5 h-5 text-indigo-500" />
              <div>
                <span className="text-xs text-slate-400 block">To:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{viewingTransfer.to_warehouse_name}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transferred Items</h4>
              <table className="w-full text-left text-sm border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="py-2 px-3">Product</th>
                    <th className="py-2 px-3 text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(viewingTransfer.items || []).map((it) => (
                    <tr key={it.id}>
                      <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">{it.product_name}</td>
                      <td className="py-2 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                        {Number(it.qty).toFixed(2)} {it.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-right">
              <button
                onClick={() => setViewingTransfer(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
