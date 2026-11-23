import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Building2, Plus, Edit, Trash2, CheckCircle2,
  Package, MapPin, X, ArrowRight, ShieldCheck, Layers
} from 'lucide-react';
import { PageHeader, Money, LoadingState, EmptyState } from '../components/ui';

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWh, setEditingWh] = useState(null);
  const [inventoryWh, setInventoryWh] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    is_default: false,
  });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/warehouses');
      if (data.success) {
        setWarehouses(data.warehouses || []);
      }
    } catch (err) {
      toast.error('Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingWh(null);
    setForm({
      name: '',
      code: `WH-0${warehouses.length + 1}`,
      address: '',
      city: '',
      state: '',
      pincode: '',
      is_default: warehouses.length === 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (wh) => {
    setEditingWh(wh);
    setForm({
      name: wh.name || '',
      code: wh.code || '',
      address: wh.address || '',
      city: wh.city || '',
      state: wh.state || '',
      pincode: wh.pincode || '',
      is_default: Boolean(Number(wh.is_default)),
    });
    setIsModalOpen(true);
  };

  const handleViewInventory = async (whId) => {
    try {
      const { data } = await api.get(`/warehouses/${whId}`);
      if (data.success) {
        setInventoryWh(data.warehouse);
      }
    } catch (err) {
      toast.error('Failed to load warehouse stock');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Warehouse name is required');
      return;
    }

    setSubmitting(true);
    try {
      if (editingWh) {
        await api.put(`/warehouses/${editingWh.id}`, form);
        toast.success('Warehouse updated');
      } else {
        await api.post('/warehouses', form);
        toast.success('Warehouse created');
      }
      setIsModalOpen(false);
      fetchWarehouses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save warehouse');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Deactivate warehouse "${name}"?`)) return;
    try {
      const { data } = await api.delete(`/warehouses/${id}`);
      if (data.success) {
        toast.success('Warehouse deactivated');
        fetchWarehouses();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate warehouse');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader
        title="Multi-Warehouse & Godowns"
        subtitle="Manage storage locations, shops, retail counters and godown-wise inventory"
        action={
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Godown / Warehouse
          </button>
        }
      />

      {/* Warehouses Grid */}
      {loading ? (
        <LoadingState message="Loading storage locations..." />
      ) : warehouses.length === 0 ? (
        <EmptyState
          title="No Warehouses Found"
          description="Create your first warehouse or retail counter location."
          action={
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Godown / Warehouse
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {warehouses.map((wh) => {
            const isDef = Boolean(Number(wh.is_default));
            return (
              <div
                key={wh.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">
                          {wh.name}
                        </h3>
                        {wh.code && (
                          <span className="text-xs font-mono text-slate-400">Code: {wh.code}</span>
                        )}
                      </div>
                    </div>

                    {isDef && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        Default
                      </span>
                    )}
                  </div>

                  {(wh.address || wh.city) && (
                    <div className="flex items-start gap-1.5 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                      <span>
                        {[wh.address, wh.city, wh.state, wh.pincode].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
                      <p className="text-[11px] text-slate-400 font-medium">Product Lines</p>
                      <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        {wh.products_count || 0}
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
                      <p className="text-[11px] text-slate-400 font-medium">Stock Stored</p>
                      <p className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {Number(wh.total_stock_qty || 0).toFixed(0)} units
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleViewInventory(wh.id)}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    View Stock <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(wh)}
                      title="Edit Godown"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {!isDef && (
                      <button
                        onClick={() => handleDelete(wh.id, wh.name)}
                        title="Deactivate"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Warehouse Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingWh ? 'Edit Godown / Warehouse' : 'Add Godown / Warehouse'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Godown / Warehouse Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Godown, Sector 4 Warehouse, Counter 1"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Godown Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. WH-01"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  placeholder="Premises / Plot / Street"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    placeholder="State"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={form.is_default}
                  onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="is_default" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Set as Primary / Default Godown for Billing
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
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
                  {submitting ? 'Saving...' : editingWh ? 'Update Godown' : 'Save Godown'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Godown Stock Inventory Drawer / Modal */}
      {inventoryWh && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  {inventoryWh.name} - Stock Breakdown
                </h3>
                <p className="text-xs text-slate-500">Products currently stored in this location</p>
              </div>
              <button
                onClick={() => setInventoryWh(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {!inventoryWh.inventory || inventoryWh.inventory.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400 italic">
                  No stock movements recorded for this warehouse yet.
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Product Name</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3 text-right">Available Qty</th>
                      <th className="py-2 px-3 text-right">Valuation (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {inventoryWh.inventory.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">
                          {item.name}
                          {item.barcode && (
                            <span className="block text-[10px] text-slate-400 font-mono">Barcode: {item.barcode}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-xs text-slate-500">{item.category || '-'}</td>
                        <td className="py-2 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                          {Number(item.current_stock).toFixed(2)} {item.unit}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-800 dark:text-slate-200 font-mono">
                          <Money value={Number(item.current_stock) * Number(item.default_rate || 0)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-right">
              <button
                onClick={() => setInventoryWh(null)}
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
