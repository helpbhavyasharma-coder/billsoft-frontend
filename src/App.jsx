import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import AuthCallback from './pages/AuthCallback';
import LandingPage from './landing/LandingPage';
import Dashboard from './pages/Dashboard';
import CompanySetup from './pages/CompanySetup';
import InvoiceList from './pages/InvoiceList';
import InvoiceForm from './pages/InvoiceForm';
import InvoiceDetail from './pages/InvoiceDetail';
import Quotations from './pages/Quotations';
import QuotationForm from './pages/QuotationForm';
import QuotationDetail from './pages/QuotationDetail';
import PurchaseOrders from './pages/PurchaseOrders';
import PurchaseOrderForm from './pages/PurchaseOrderForm';
import PurchaseOrderDetail from './pages/PurchaseOrderDetail';
import CreditNotes from './pages/CreditNotes';
import CreditNoteForm from './pages/CreditNoteForm';
import CreditNoteDetail from './pages/CreditNoteDetail';
import DebitNotes from './pages/DebitNotes';
import DebitNoteForm from './pages/DebitNoteForm';
import DebitNoteDetail from './pages/DebitNoteDetail';
import Parties from './pages/Parties';
import Products from './pages/Products';
import Purchases from './pages/Purchases';
import Stock from './pages/Stock';
import Ledgers from './pages/Ledgers';
import Outstanding from './pages/Outstanding';
import PartyLedger from './pages/PartyLedger';
import AdminPanel from './pages/AdminPanel';
import AdminUserDetail from './pages/AdminUserDetail';
import AccountantReport from './pages/AccountantReport';
import Expenses from './pages/Expenses';
import ProfitLossReport from './pages/ProfitLossReport';
import BalanceSheetReport from './pages/BalanceSheetReport';
import Warehouses from './pages/Warehouses';
import StockTransfers from './pages/StockTransfers';
import StockAgeing from './pages/StockAgeing';
import BarcodeGenerator from './pages/BarcodeGenerator';
import BankReconciliation from './pages/BankReconciliation';
import EWayBills from './pages/EWayBills';
import RecurringInvoices from './pages/RecurringInvoices';
import RecurringInvoiceForm from './pages/RecurringInvoiceForm';
import TrialBalanceReport from './pages/TrialBalanceReport';
import GstReports from './pages/GstReports';
import JournalVouchers from './pages/JournalVouchers';
import JournalVoucherForm from './pages/JournalVoucherForm';
import Settings from './pages/Settings';
import AiTraining from './pages/AiTraining';

/** Same spinner while restoring session from token (avoid login form flash). */
function AuthBootSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );
}

/** Safe retry screen when central auth service or network has a temporary failure. */
function AuthRetryScreen({ error, onRetry, onLogout }) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } catch {
      window.location.reload();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, var(--bg) 0%, var(--bg-card) 100%)' }}>
      <div className="w-full max-w-md card text-center p-6 sm:p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>
          Session Check Interrupted
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
          {error?.message || 'Central authentication provider is temporarily unreachable. Your saved session has been preserved.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="btn-primary inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-medium"
          >
            {retrying ? 'Retrying...' : 'Retry Connection'}
          </button>
          <button
            onClick={onLogout}
            className="btn-secondary inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-medium"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { user, loading, authError, retryAuth, logout } = useAuth();
  if (loading) return <AuthBootSpinner />;
  if (!user && authError) {
    return <AuthRetryScreen error={authError} onRetry={retryAuth} onLogout={logout} />;
  }
  return user ? children : <Navigate to="/" replace />;
}

function CompanyRoute({ children }) {
  const { user, company, loading, authError, retryAuth, logout } = useAuth();
  if (loading) return <AuthBootSpinner />;
  if (!user && authError) {
    return <AuthRetryScreen error={authError} onRetry={retryAuth} onLogout={logout} />;
  }
  if (!user) return <Navigate to="/" replace />;
  if (user.is_admin) return <Navigate to="/admin" replace />;
  if (!company) return <Navigate to="/company/setup" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading, authError, retryAuth, logout } = useAuth();
  if (loading) return <AuthBootSpinner />;
  if (!user && authError) {
    return <AuthRetryScreen error={authError} onRetry={retryAuth} onLogout={logout} />;
  }
  if (!user) return <Navigate to="/" replace />;
  return user.is_admin ? children : <Navigate to="/dashboard" replace />;
}

/** After Bhauu Auth login: only send to dashboard when company exists; otherwise first-time setup. */
function PostAuthRedirect() {
  const { user, company } = useAuth();
  if (user?.is_admin) return <Navigate to="/admin" replace />;
  return <Navigate to={company ? '/dashboard' : '/company/setup'} replace />;
}

function AppRoutes() {
  const { user, loading, authError, retryAuth, logout } = useAuth();

  return (
    <Routes>
      {/* Public entry */}
      <Route
        path="/login"
        element={<Navigate to="/" replace />}
      />
      <Route
        path="/auth/login"
        element={
          loading ? <AuthBootSpinner /> :
          authError ? <AuthRetryScreen error={authError} onRetry={retryAuth} onLogout={logout} /> :
          user ? <PostAuthRedirect /> : <Navigate to="/" replace />
        }
      />
      <Route
        path="/register"
        element={
          loading ? <AuthBootSpinner /> :
          authError ? <AuthRetryScreen error={authError} onRetry={retryAuth} onLogout={logout} /> :
          user ? <PostAuthRedirect /> : <Navigate to="/" replace />
        }
      />
      <Route
        path="/auth/callback"
        element={<AuthCallback />}
      />

      {/* Company Setup (auth required, no company needed) */}
      <Route path="/company/setup" element={
        <PrivateRoute><CompanySetup /></PrivateRoute>
      } />

      {/* Protected + Company required */}
      <Route path="/dashboard" element={
        <CompanyRoute>
          <Layout><Dashboard /></Layout>
        </CompanyRoute>
      } />
      <Route path="/ai/training" element={
        <CompanyRoute>
          <Layout><AiTraining /></Layout>
        </CompanyRoute>
      } />
      <Route path="/invoices" element={
        <CompanyRoute>
          <Layout><InvoiceList /></Layout>
        </CompanyRoute>
      } />
      <Route path="/invoices/new" element={
        <CompanyRoute>
          <Layout><InvoiceForm /></Layout>
        </CompanyRoute>
      } />
      <Route path="/invoices/:id" element={
        <CompanyRoute>
          <Layout><InvoiceDetail /></Layout>
        </CompanyRoute>
      } />
      <Route path="/invoices/:id/edit" element={
        <CompanyRoute>
          <Layout><InvoiceForm /></Layout>
        </CompanyRoute>
      } />
      <Route path="/quotations" element={
        <CompanyRoute>
          <Layout><Quotations /></Layout>
        </CompanyRoute>
      } />
      <Route path="/quotations/new" element={
        <CompanyRoute>
          <Layout><QuotationForm /></Layout>
        </CompanyRoute>
      } />
      <Route path="/quotations/:id" element={
        <CompanyRoute>
          <Layout><QuotationDetail /></Layout>
        </CompanyRoute>
      } />
      <Route path="/quotations/:id/edit" element={
        <CompanyRoute>
          <Layout><QuotationForm /></Layout>
        </CompanyRoute>
      } />
      <Route path="/credit-notes" element={
        <CompanyRoute>
          <Layout><CreditNotes /></Layout>
        </CompanyRoute>
      } />
      <Route path="/credit-notes/new" element={
        <CompanyRoute>
          <Layout><CreditNoteForm /></Layout>
        </CompanyRoute>
      } />
      <Route path="/credit-notes/:id" element={
        <CompanyRoute>
          <Layout><CreditNoteDetail /></Layout>
        </CompanyRoute>
      } />
      <Route path="/parties" element={
        <CompanyRoute>
          <Layout><Parties /></Layout>
        </CompanyRoute>
      } />
      <Route path="/products" element={
        <CompanyRoute>
          <Layout><Products /></Layout>
        </CompanyRoute>
      } />
      <Route path="/purchase-orders" element={
        <CompanyRoute>
          <Layout><PurchaseOrders /></Layout>
        </CompanyRoute>
      } />
      <Route path="/purchase-orders/new" element={
        <CompanyRoute>
          <Layout><PurchaseOrderForm /></Layout>
        </CompanyRoute>
      } />
      <Route path="/purchase-orders/:id" element={
        <CompanyRoute>
          <Layout><PurchaseOrderDetail /></Layout>
        </CompanyRoute>
      } />
      <Route path="/purchase-orders/:id/edit" element={
        <CompanyRoute>
          <Layout><PurchaseOrderForm /></Layout>
        </CompanyRoute>
      } />
      <Route path="/purchases" element={
        <CompanyRoute>
          <Layout><Purchases /></Layout>
        </CompanyRoute>
      } />
      <Route path="/debit-notes" element={
        <CompanyRoute>
          <Layout><DebitNotes /></Layout>
        </CompanyRoute>
      } />
      <Route path="/debit-notes/new" element={
        <CompanyRoute>
          <Layout><DebitNoteForm /></Layout>
        </CompanyRoute>
      } />
      <Route path="/debit-notes/:id" element={
        <CompanyRoute>
          <Layout><DebitNoteDetail /></Layout>
        </CompanyRoute>
      } />
      <Route path="/stock" element={
        <CompanyRoute>
          <Layout><Stock /></Layout>
        </CompanyRoute>
      } />
      <Route path="/ledgers" element={
        <CompanyRoute>
          <Layout><Ledgers /></Layout>
        </CompanyRoute>
      } />
      <Route path="/outstanding" element={
        <CompanyRoute><Layout><Outstanding /></Layout></CompanyRoute>
      } />
      <Route path="/parties/:partyId/ledger" element={
        <CompanyRoute><Layout><PartyLedger /></Layout></CompanyRoute>
      } />
      <Route path="/admin" element={
        <AdminRoute><Layout><AdminPanel /></Layout></AdminRoute>
      } />
      <Route path="/admin/users/:id" element={
        <AdminRoute><Layout><AdminUserDetail /></Layout></AdminRoute>
      } />
      <Route path="/reports/accountant" element={
        <CompanyRoute><Layout><AccountantReport /></Layout></CompanyRoute>
      } />
      <Route path="/expenses" element={
        <CompanyRoute><Layout><Expenses /></Layout></CompanyRoute>
      } />
      <Route path="/reports/profit-and-loss" element={
        <CompanyRoute><Layout><ProfitLossReport /></Layout></CompanyRoute>
      } />
      <Route path="/reports/balance-sheet" element={
        <CompanyRoute><Layout><BalanceSheetReport /></Layout></CompanyRoute>
      } />
      <Route path="/reports/gst" element={
        <CompanyRoute><Layout><GstReports /></Layout></CompanyRoute>
      } />
      <Route path="/reports/trial-balance" element={
        <CompanyRoute><Layout><TrialBalanceReport /></Layout></CompanyRoute>
      } />
      <Route path="/journal-vouchers" element={
        <CompanyRoute><Layout><JournalVouchers /></Layout></CompanyRoute>
      } />
      <Route path="/journal-vouchers/new" element={
        <CompanyRoute><Layout><JournalVoucherForm /></Layout></CompanyRoute>
      } />
      <Route path="/warehouses" element={
        <CompanyRoute><Layout><Warehouses /></Layout></CompanyRoute>
      } />
      <Route path="/stock-transfers" element={
        <CompanyRoute><Layout><StockTransfers /></Layout></CompanyRoute>
      } />
      <Route path="/reports/stock-ageing" element={
        <CompanyRoute><Layout><StockAgeing /></Layout></CompanyRoute>
      } />
      <Route path="/barcodes" element={
        <CompanyRoute><Layout><BarcodeGenerator /></Layout></CompanyRoute>
      } />
      <Route path="/bank-reconciliation" element={
        <CompanyRoute><Layout><BankReconciliation /></Layout></CompanyRoute>
      } />
      <Route path="/eway-bills" element={
        <CompanyRoute><Layout><EWayBills /></Layout></CompanyRoute>
      } />
      <Route path="/recurring-invoices" element={
        <CompanyRoute><Layout><RecurringInvoices /></Layout></CompanyRoute>
      } />
      <Route path="/recurring-invoices/new" element={
        <CompanyRoute><Layout><RecurringInvoiceForm /></Layout></CompanyRoute>
      } />
      <Route path="/recurring-invoices/:id/edit" element={
        <CompanyRoute><Layout><RecurringInvoiceForm /></Layout></CompanyRoute>
      } />
      <Route path="/company" element={
        <PrivateRoute>
          <Layout><CompanySetup /></Layout>
        </PrivateRoute>
      } />
      <Route path="/settings" element={
        <CompanyRoute>
          <Layout><Settings /></Layout>
        </CompanyRoute>
      } />

      {/* Default */}
      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: { fontSize: '14px' },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
