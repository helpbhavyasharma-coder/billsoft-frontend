import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Building2, Edit3, Landmark, Plus, Trash2, Wallet, X } from 'lucide-react';
import { IconButton, LoadingState, PageHeader } from '../components/ui';

const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const today = new Date().toISOString().slice(0, 10);
const emptyAccount = { name: '', account_type: 'bank', account_no: '', ifsc: '', branch: '', opening_balance: 0 };

const accountTypeLabels = {
  bank: 'Bank Account',
  cash: 'Cash Ledger',
  salary: 'Salary Account',
  other: 'Other Account',
};

function accountIcon(type) {
  if (type === 'cash') return <Wallet className="w-5 h-5 text-green-600" />;
  if (type === 'salary') return <Landmark className="w-5 h-5 text-purple-600" />;
  return <Building2 className="w-5 h-5 text-blue-600" />;
}

export default function Ledgers() {
  const [accounts, setAccounts] = useState([]);
  const [entries, setEntries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showAccount, setShowAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountForm, setAccountForm] = useState(emptyAccount);
  const [entryForm, setEntryForm] = useState({ entry_date: today, entry_type: 'credit', amount: '', description: '', reference_no: '' });
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const totalBalance = useMemo(
    () => accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0),
    [accounts]
  );

  useEffect(() => { fetchAccounts(); }, []);

  const fetchAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const { data } = await api.get('/ledgers/summary');
      if (data.success) {
        const nextAccounts = data.summary || data.accounts || [];
        setAccounts(nextAccounts);
        setSelected((prev) => {
          if (!nextAccounts.length) return null;
          return nextAccounts.find((acc) => acc.id === prev?.id) || nextAccounts[0];
        });
      }
    } catch {
      toast.error('Failed to load ledgers.');
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    if (selected) fetchEntries(selected.id);
    else setEntries([]);
  }, [selected?.id]);

  const fetchEntries = async (accountId) => {
    try {
      const { data } = await api.get(`/ledgers/accounts/${accountId}/entries`);
      if (data.success) setEntries(data.entries || []);
    } catch {
      toast.error('Failed to load ledger entries.');
    }
  };

  const openCreate = () => {
    setEditingAccount(null);
    setAccountForm(emptyAccount);
    setShowAccount(true);
  };

  const openEdit = (account) => {
    setEditingAccount(account);
    setAccountForm({
      name: account.name || '',
      account_type: account.account_type || 'bank',
      account_no: account.account_no || '',
      ifsc: account.ifsc || '',
      branch: account.branch || '',
      opening_balance: account.opening_balance || 0,
    });
    setShowAccount(true);
  };

  const saveAccount = async (e) => {
    e.preventDefault();
    if (!accountForm.name.trim()) return toast.error('Account name required.');
    try {
      if (editingAccount) {
        await api.put(`/ledgers/accounts/${editingAccount.id}`, accountForm);
        toast.success('Ledger account updated.');
      } else {
        await api.post('/ledgers/accounts', accountForm);
        toast.success('Ledger account created.');
      }
      setShowAccount(false);
      setEditingAccount(null);
      setAccountForm(emptyAccount);
      fetchAccounts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save account.');
    }
  };

  const deleteAccount = async (account) => {
    if (!window.confirm(`Delete "${account.name}" ledger account? Existing entries will be hidden with this account.`)) return;
    try {
      await api.delete(`/ledgers/accounts/${account.id}`);
      toast.success('Ledger account deleted.');
      if (selected?.id === account.id) setSelected(null);
      fetchAccounts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete account.');
    }
  };

  const addEntry = async (e) => {
    e.preventDefault();
    if (!selected) return toast.error('Select account.');
    if (!entryForm.amount || parseFloat(entryForm.amount) <= 0) return toast.error('Enter valid amount.');
    try {
      await api.post('/ledgers/entries', { ...entryForm, account_id: selected.id });
      toast.success('Entry added.');
      setEntryForm({ entry_date: today, entry_type: 'credit', amount: '', description: '', reference_no: '' });
      fetchAccounts();
      fetchEntries(selected.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add entry.');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bank, Cash & Salary Ledgers"
        subtitle="Multiple bank, cash, salary, and custom accounts manage karein."
        actions={(
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
          <div className="text-right">
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>Total Balance</p>
            <p className={`font-bold ${totalBalance < 0 ? 'text-red-500' : 'text-green-600'}`}>₹{fmt(totalBalance)}</p>
          </div>
          <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-2 whitespace-nowrap">
            <Plus className="w-4 h-4" /> Add Account
          </button>
          </div>
        )}
      />

      {showAccount && (
        <form onSubmit={saveAccount} className="card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold" style={{ color: 'var(--text)' }}>
              {editingAccount ? 'Edit Ledger Account' : 'Create Ledger Account'}
            </h2>
            <button type="button" onClick={() => setShowAccount(false)} className="p-2 rounded-lg hover:bg-gray-100" title="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="label">Account Name *</label>
              <input
                className="input-field"
                value={accountForm.name}
                onChange={(e) => setAccountForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="HDFC Bank / Cash Counter / Salary Account"
              />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input-field" value={accountForm.account_type} onChange={(e) => setAccountForm((p) => ({ ...p, account_type: e.target.value }))}>
                <option value="bank">Bank</option>
                <option value="cash">Cash</option>
                <option value="salary">Salary</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Account No.</label>
              <input className="input-field" value={accountForm.account_no} onChange={(e) => setAccountForm((p) => ({ ...p, account_no: e.target.value }))} />
            </div>
            <div>
              <label className="label">IFSC</label>
              <input className="input-field uppercase" value={accountForm.ifsc} onChange={(e) => setAccountForm((p) => ({ ...p, ifsc: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className="label">Opening Balance</label>
              <input type="number" className="input-field" value={accountForm.opening_balance} onChange={(e) => setAccountForm((p) => ({ ...p, opening_balance: e.target.value }))} />
            </div>
            <div className="lg:col-span-2">
              <label className="label">Branch / Note</label>
              <input className="input-field" value={accountForm.branch} onChange={(e) => setAccountForm((p) => ({ ...p, branch: e.target.value }))} placeholder="Branch name or cash location" />
            </div>
            <div className="sm:col-span-2 lg:col-span-4 flex flex-col sm:flex-row gap-2 justify-end">
              <button type="button" onClick={() => setShowAccount(false)} className="btn-secondary">Cancel</button>
              <button className="btn-primary">{editingAccount ? 'Update Account' : 'Save Account'}</button>
            </div>
          </div>
        </form>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-0 overflow-hidden">
          <div className="p-4 font-bold" style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>Accounts</div>
          {loadingAccounts ? (
            <LoadingState label="Loading accounts..." />
          ) : accounts.length === 0 ? (
            <div className="p-8 text-center space-y-3" style={{ color: 'var(--text-3)' }}>
              <p>No ledger accounts yet.</p>
              <button onClick={openCreate} className="btn-primary text-sm">Create First Account</button>
            </div>
          ) : accounts.map((acc) => (
            <div
              key={acc.id}
              className="p-4 flex items-center gap-3"
              style={{ borderBottom: '1px solid var(--border)', backgroundColor: selected?.id === acc.id ? 'var(--bg-hover)' : 'transparent' }}
            >
              <button onClick={() => setSelected(acc)} className="flex-1 text-left flex items-center gap-3 min-w-0">
                {accountIcon(acc.account_type)}
                <span className="flex-1 min-w-0">
                  <span className="block font-medium truncate" style={{ color: 'var(--text)' }}>{acc.name}</span>
                  <span className="text-xs truncate block" style={{ color: 'var(--text-3)' }}>
                    {accountTypeLabels[acc.account_type] || acc.account_type}
                    {acc.account_no ? ` • ${acc.account_no}` : ''}
                  </span>
                </span>
                <span className={`font-bold whitespace-nowrap ${parseFloat(acc.balance || 0) < 0 ? 'text-red-500' : 'text-green-600'}`}>₹{fmt(acc.balance)}</span>
              </button>
              <IconButton label="Edit account" onClick={() => openEdit(acc)}>
                <Edit3 className="w-4 h-4" />
              </IconButton>
              <IconButton label="Delete account" variant="danger" onClick={() => deleteAccount(acc)}>
                <Trash2 className="w-4 h-4" />
              </IconButton>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selected && (
            <>
              <div className="card flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {accountIcon(selected.account_type)}
                  <div className="min-w-0">
                    <h2 className="font-bold truncate" style={{ color: 'var(--text)' }}>{selected.name}</h2>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                      {accountTypeLabels[selected.account_type] || selected.account_type}
                      {selected.account_no ? ` • A/C ${selected.account_no}` : ''}
                      {selected.ifsc ? ` • IFSC ${selected.ifsc}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>Current Balance</p>
                  <p className={`text-lg font-bold ${parseFloat(selected.balance || 0) < 0 ? 'text-red-500' : 'text-green-600'}`}>₹{fmt(selected.balance)}</p>
                </div>
              </div>

              <form onSubmit={addEntry} className="card grid sm:grid-cols-2 xl:grid-cols-6 gap-3 items-end">
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input-field" value={entryForm.entry_date} onChange={(e) => setEntryForm((p) => ({ ...p, entry_date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="input-field" value={entryForm.entry_type} onChange={(e) => setEntryForm((p) => ({ ...p, entry_type: e.target.value }))}>
                    <option value="credit">Credit / Aaya</option>
                    <option value="debit">Debit / Gaya</option>
                  </select>
                </div>
                <div>
                  <label className="label">Amount</label>
                  <input type="number" className="input-field" value={entryForm.amount} onChange={(e) => setEntryForm((p) => ({ ...p, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Ref No.</label>
                  <input className="input-field" value={entryForm.reference_no} onChange={(e) => setEntryForm((p) => ({ ...p, reference_no: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Description</label>
                  <input className="input-field" value={entryForm.description} onChange={(e) => setEntryForm((p) => ({ ...p, description: e.target.value }))} placeholder="Salary paid / Cash deposit" />
                </div>
                <button className="btn-primary sm:col-span-2 xl:col-span-1">Add Entry</button>
              </form>
            </>
          )}

          <div className="card p-0 overflow-hidden">
            <div className="p-4 font-bold" style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>
              {selected ? `${selected.name} Entries` : 'Entries'}
            </div>
            {!selected ? (
              <div className="p-8 text-center" style={{ color: 'var(--text-3)' }}>Select or create an account to view entries.</div>
            ) : entries.length === 0 ? (
              <div className="p-8 text-center" style={{ color: 'var(--text-3)' }}>No entries yet for this account.</div>
            ) : (
              <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th className="table-header text-left">Date</th>
                      <th className="table-header text-left">Description</th>
                      <th className="table-header text-left">Ref</th>
                      <th className="table-header text-right">Credit</th>
                      <th className="table-header text-right">Debit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="table-cell">{entry.entry_date}</td>
                        <td className="table-cell">{entry.description || '-'}</td>
                        <td className="table-cell">{entry.reference_no || '-'}</td>
                        <td className="table-cell text-right text-green-600 font-medium">{entry.entry_type === 'credit' ? `₹${fmt(entry.amount)}` : '-'}</td>
                        <td className="table-cell text-right text-red-600 font-medium">{entry.entry_type === 'debit' ? `₹${fmt(entry.amount)}` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden p-3">
                {entries.map((entry) => {
                  const isCredit = entry.entry_type === 'credit';
                  return (
                    <div key={entry.id} className="ledger-entry-card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-bold ${isCredit ? 'text-green-600' : 'text-red-600'}`}
                              style={{backgroundColor: isCredit ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)'}}
                            >
                              {isCredit ? 'Credit' : 'Debit'}
                            </span>
                            <span className="text-xs" style={{color:'var(--text-3)'}}>{entry.entry_date}</span>
                          </div>
                          <p className="mt-2 text-sm font-semibold leading-snug" style={{color:'var(--text)'}}>
                            {entry.description || 'Ledger entry'}
                          </p>
                          {entry.reference_no && (
                            <p className="mt-1 text-xs" style={{color:'var(--text-3)'}}>Ref: {entry.reference_no}</p>
                          )}
                        </div>
                        <p className={`whitespace-nowrap text-sm font-black ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                          {isCredit ? '+' : '-'}₹{fmt(entry.amount)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
