import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Repeat, Plus, Play, Pause, Trash2, Edit, Calendar,
  CheckCircle2, AlertCircle, FileText, ArrowRight, Clock,
  Search, ExternalLink, RefreshCw
} from 'lucide-react';
import { PageHeader, SearchField, Money, LoadingState, EmptyState } from '../components/ui';

export default function RecurringInvoices() {
  const [profiles, setProfiles] = useState([]);
  const [dueCount, setDueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processingDue, setProcessingDue] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/recurring-invoices');
      if (res.data?.success) {
        setProfiles(res.data.recurring_invoices || []);
        setDueCount(res.data.due_count || 0);
      }
    } catch (err) {
      toast.error('Failed to load recurring invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const res = await api.post(`/recurring-invoices/${id}/toggle-status`);
      if (res.data?.success) {
        toast.success(res.data.message);
        fetchProfiles();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Toggle failed');
    }
  };

  const handleGenerateNow = async (id, profileName) => {
    try {
      toast.loading(`Generating invoice for ${profileName}...`, { id: 'gen-inv' });
      const res = await api.post(`/recurring-invoices/${id}/generate-now`);
      if (res.data?.success) {
        toast.success(res.data.message, { id: 'gen-inv' });
        fetchProfiles();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Generation failed', { id: 'gen-inv' });
    }
  };

  const handleProcessDue = async () => {
    try {
      setProcessingDue(true);
      const res = await api.post('/recurring-invoices/process-due');
      if (res.data?.success) {
        toast.success(`Processed ${res.data.count} recurring invoice(s) successfully!`);
        fetchProfiles();
      }
    } catch (err) {
      toast.error('Error processing due invoices');
    } finally {
      setProcessingDue(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this recurring invoice profile?')) return;
    try {
      const res = await api.delete(`/recurring-invoices/${id}`);
      if (res.data?.success) {
        toast.success('Recurring profile removed');
        fetchProfiles();
      }
    } catch (err) {
      toast.error('Failed to delete profile');
    }
  };

  const filteredProfiles = profiles.filter(p =>
    (p.profile_name && p.profile_name.toLowerCase().includes(search.toLowerCase())) ||
    (p.party_name && p.party_name.toLowerCase().includes(search.toLowerCase()))
  );

  // Statistics
  const activeCount = profiles.filter(p => p.status === 'active').length;
  const mrr = profiles.reduce((acc, curr) => {
    if (curr.status !== 'active') return acc;
    const total = parseFloat(curr.grand_total || 0);
    switch (curr.frequency) {
      case 'weekly': return acc + (total * 4.33);
      case 'quarterly': return acc + (total / 3);
      case 'yearly': return acc + (total / 12);
      case 'monthly':
      default: return acc + total;
    }
  }, 0);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Recurring Invoices & Subscriptions"
        subtitle="Automate recurring billing for rent, maintenance (AMC), retainers, and subscriptions."
        badge={`${profiles.length} Profiles`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {dueCount > 0 && (
              <button
                onClick={handleProcessDue}
                disabled={processingDue}
                className="btn-primary bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 text-xs sm:text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${processingDue ? 'animate-spin' : ''}`} />
                Process {dueCount} Due Today
              </button>
            )}
            <Link
              to="/recurring-invoices/new"
              className="btn-primary flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Create Recurring Profile
            </Link>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-900/40">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
            Active Subscriptions
          </p>
          <p className="text-2xl font-bold font-mono text-blue-900 dark:text-blue-100 mt-1">
            {activeCount} <span className="text-sm font-sans font-normal text-slate-500">/ {profiles.length} total</span>
          </p>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 mt-2 block">
            Automatic recurring schedule profiles
          </span>
        </div>

        <div className="card p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
            Monthly Recurring Revenue (MRR)
          </p>
          <p className="text-2xl font-bold font-mono text-emerald-900 dark:text-emerald-100 mt-1">
            <Money amount={mrr} />
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 block">
            Estimated normalized monthly billing
          </span>
        </div>

        <div className={`card p-4 ${
          dueCount > 0
            ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
            : 'bg-slate-50 dark:bg-slate-900/30'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Invoices Due
              </p>
              <p className="text-2xl font-bold font-mono text-amber-900 dark:text-amber-200 mt-1">
                {dueCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <span className="text-[11px] text-amber-700 dark:text-amber-300 mt-2 block">
            {dueCount > 0 ? 'Ready for auto-generation' : 'All subscriptions up to date'}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <SearchField
          placeholder="Search recurring profile or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
      </div>

      {/* Profiles Table */}
      <div className="card overflow-hidden p-0">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' }}>
                <th className="py-3 px-3 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Profile Name</th>
                <th className="py-3 px-3 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Customer Party</th>
                <th className="py-3 px-3 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Frequency</th>
                <th className="py-3 px-3 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Next Run Date</th>
                <th className="py-3 px-3 font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-3)' }}>Amount / Cycle</th>
                <th className="py-3 px-3 font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--text-3)' }}>Status</th>
                <th className="py-3 px-3 font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-3)' }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center">
                    <LoadingState message="Loading recurring schedules..." />
                  </td>
                </tr>
              ) : filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-10 text-center">
                    <EmptyState
                      icon={Repeat}
                      title="No recurring invoices configured"
                      message="Create recurring profiles to automatically generate invoices on a weekly, monthly, quarterly, or yearly schedule."
                      action={
                        <Link to="/recurring-invoices/new" className="btn-primary text-xs">
                          <Plus className="w-4 h-4 mr-1" /> Create First Profile
                        </Link>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredProfiles.map(p => {
                  const isDue = p.status === 'active' && p.next_run_date <= today;
                  const isActive = p.status === 'active';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <Link to={`/recurring-invoices/${p.id}/edit`} className="font-semibold text-sm text-blue-600 dark:text-blue-400 hover:underline">
                          {p.profile_name}
                        </Link>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {p.items_count} item(s) &bull; Generated {p.invoices_generated_count} bill(s)
                        </p>
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{p.party_name}</p>
                        {p.party_mobile && <p className="text-[11px] text-slate-400 font-mono">{p.party_mobile}</p>}
                      </td>

                      <td className="py-3 px-3">
                        <span className="capitalize px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300">
                          {p.frequency}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono font-medium ${isDue ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-600 dark:text-slate-300'}`}>
                            {p.next_run_date}
                          </span>
                          {isDue && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 uppercase font-bold">
                              Due
                            </span>
                          )}
                        </div>
                        {p.last_run_date && (
                          <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            Last: {p.last_run_date}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-sm">
                        <Money value={p.grand_total} />
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(p.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
                            isActive
                              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {isActive ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                          {isActive ? 'Active' : 'Paused'}
                        </button>
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleGenerateNow(p.id, p.profile_name)}
                            title="Generate invoice right now"
                            className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1 text-emerald-600 hover:text-emerald-700"
                          >
                            <Repeat className="w-3.5 h-3.5" /> Generate Now
                          </button>
                          <Link
                            to={`/recurring-invoices/${p.id}/edit`}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                            title="Edit Profile"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500"
                            title="Delete Profile"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View (Invoice with AI style) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="p-6 text-center">
              <LoadingState message="Loading recurring schedules..." />
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No recurring profiles found.
            </div>
          ) : (
            filteredProfiles.map(p => {
              const isDue = p.status === 'active' && p.next_run_date <= today;
              const isActive = p.status === 'active';
              return (
                <div key={p.id} className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/recurring-invoices/${p.id}/edit`} className="font-bold text-blue-600 dark:text-blue-400 text-sm hover:underline block truncate">
                        {p.profile_name}
                      </Link>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs mt-0.5">{p.party_name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Cycle: <span className="font-semibold uppercase text-slate-600 dark:text-slate-300">{p.frequency}</span> • Next: {p.next_run_date} {isDue && <span className="text-amber-600 font-bold">(DUE)</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-base font-bold text-slate-900 dark:text-white">
                        <Money value={p.grand_total} />
                      </div>
                      <button
                        onClick={() => handleToggleStatus(p.id)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-full text-[10px] font-bold ${
                          isActive
                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {isActive ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
                        {isActive ? 'Active' : 'Paused'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleGenerateNow(p.id, p.profile_name)}
                      className="btn-primary text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 font-semibold flex-1 justify-center"
                    >
                      <Repeat className="w-3.5 h-3.5" /> Generate Bill
                    </button>
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/recurring-invoices/${p.id}/edit`}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                        title="Edit Profile"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50"
                        title="Delete Profile"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
