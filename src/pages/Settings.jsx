import { useState } from 'react';
import toast from 'react-hot-toast';
import { Download, KeyRound, Save, ShieldCheck } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user, company } = useAuth();
  const [saving, setSaving] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword.length < 6) return toast.error('New password must be at least 6 characters.');
    if (passwords.newPassword !== passwords.confirmPassword) return toast.error('New passwords do not match.');

    setSaving(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  const exportBackup = async () => {
    try {
      const endpoints = ['/company', '/parties', '/products', '/purchases', '/invoices?limit=500'];
      const [companyRes, partiesRes, productsRes, purchasesRes, invoicesRes] = await Promise.all(endpoints.map((url) => api.get(url)));
      const backup = {
        exported_at: new Date().toISOString(),
        user: { id: user?.id, email: user?.email },
        company: companyRes.data.company,
        parties: partiesRes.data.parties || [],
        products: productsRes.data.products || [],
        purchases: purchasesRes.data.purchases || [],
        invoices: invoicesRes.data.invoices || [],
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `billing-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup exported.');
    } catch {
      toast.error('Failed to export backup.');
    }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>{company?.company_name || 'Company'} account preferences</p>
      </div>

      <form onSubmit={changePassword} className="card space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold" style={{ color: 'var(--text)' }}>Change Password</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="label">Current Password</label>
            <input type="password" className="input-field" value={passwords.currentPassword} onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))} />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input-field" value={passwords.newPassword} onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))} />
          </div>
          <div>
            <label className="label">Confirm Password</label>
            <input type="password" className="input-field" value={passwords.confirmPassword} onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))} />
          </div>
        </div>
        <button disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Update Password'}
        </button>
      </form>

      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-green-600" />
          <h2 className="font-semibold" style={{ color: 'var(--text)' }}>Backup Export</h2>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>Download company, parties, products, purchases, and invoice list as a JSON backup.</p>
        <button type="button" onClick={exportBackup} className="btn-secondary flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Export Backup
        </button>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-purple-600" />
          <h2 className="font-semibold" style={{ color: 'var(--text)' }}>Account Security</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-2)' }}>
            Signed in as <span className="font-semibold">{user?.email}</span>
          </div>
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-2)' }}>
            Role: <span className="font-semibold">{user?.is_admin ? 'Admin' : 'Company User'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
