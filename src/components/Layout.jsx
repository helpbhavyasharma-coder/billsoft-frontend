import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard, FileText, Users, Package, Settings,
  LogOut, Menu, X, Building2, Plus, AlertCircle, Sun, Moon,
  BarChart2, ShieldCheck, ShoppingCart, Wallet
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/invoices', label: 'Invoices', icon: FileText },
  { path: '/outstanding', label: 'Outstanding', icon: AlertCircle },
  { path: '/parties', label: 'Parties', icon: Users },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/purchases', label: 'Purchases', icon: ShoppingCart },
  { path: '/stock', label: 'Stock', icon: Package },
  { path: '/ledgers', label: 'Bank/Cash Ledger', icon: Wallet },
  { path: '/reports/accountant', label: 'Accountant Report', icon: BarChart2 },
  { path: '/company', label: 'Company', icon: Building2 },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/admin', label: 'Admin Panel', icon: ShieldCheck, adminOnly: true },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, company, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const sidebarStyle = {
    backgroundColor: 'var(--bg-nav)',
    borderRight: '1px solid var(--border)',
    color: 'var(--text)',
  };

  const headerStyle = {
    backgroundColor: 'var(--bg-nav)',
    borderBottom: '1px solid var(--border)',
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col
          w-56 flex-shrink-0
          transform transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0
        `}
        style={sidebarStyle}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 min-w-0">
            {company?.logo_url ? (
              <img src={company.logo_url} alt="Logo" className="w-7 h-7 object-contain rounded-lg flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold leading-tight truncate" style={{ color: 'var(--text)' }}>
                {company?.company_name || 'BillSoft'}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Billing Software</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1" style={{ color: 'var(--text-3)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Invoice */}
        <div className="px-3 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <Link to="/invoices/new" onClick={() => setSidebarOpen(false)}
            className="btn-primary w-full justify-center text-xs py-1.5 whitespace-nowrap">
            <Plus className="w-3.5 h-3.5" /> New Invoice
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon, adminOnly }) => {
            if (user?.is_admin && !adminOnly) return null;
            if (adminOnly) {
              if (!user?.is_admin) return null;
            }
            const active = location.pathname === path ||
              (path !== '/dashboard' && location.pathname.startsWith(path));
            return (
              <Link key={path} to={path} onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: active ? (dark ? '#1e3a5f' : '#eff6ff') : 'transparent',
                  color: active ? (dark ? '#60a5fa' : '#1d4ed8') : 'var(--text-3)',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text)'; }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; } }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
                {path === '/outstanding' && <span className="ml-auto w-1.5 h-1.5 bg-red-500 rounded-full" />}
                {adminOnly && <span className="ml-auto text-xs px-1 py-0.5 rounded bg-purple-100 text-purple-600 font-medium">Admin</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-2 flex-shrink-0 space-y-0.5" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={toggle}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ color: 'var(--text-3)', backgroundColor: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
          >
            {dark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4" />}
            {dark ? 'Light Mode' : 'Dark Mode'}
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-blue-600">{user?.email?.[0]?.toUpperCase()}</span>
            </div>
            <p className="text-xs truncate flex-1" style={{ color: 'var(--text-3)' }}>{user?.email}</p>
            <button onClick={handleLogout} title="Logout" className="hover:text-red-500 transition-colors" style={{ color: 'var(--text-3)' }}>
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center px-4 gap-3 flex-shrink-0" style={headerStyle}>
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden" style={{ color: 'var(--text-3)' }}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 lg:hidden">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {navItems.find(n => location.pathname.startsWith(n.path))?.label || 'BillSoft'}
            </p>
          </div>
          <div className="hidden lg:flex flex-1" />
          <button onClick={toggle}
            aria-label="Toggle theme"
            title="Toggle theme"
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {dark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4" />}
          </button>
          <span className="text-xs hidden sm:block" style={{ color: 'var(--text-3)' }}>
            {company?.financial_year ? `FY ${company.financial_year}` : ''}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" style={{ backgroundColor: 'var(--bg)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
