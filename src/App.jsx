import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CompanySetup from './pages/CompanySetup';
import InvoiceList from './pages/InvoiceList';
import InvoiceForm from './pages/InvoiceForm';
import InvoiceDetail from './pages/InvoiceDetail';
import Parties from './pages/Parties';
import Products from './pages/Products';
import Outstanding from './pages/Outstanding';
import PartyLedger from './pages/PartyLedger';
import AdminPanel from './pages/AdminPanel';
import AccountantReport from './pages/AccountantReport';

/** Same spinner while restoring session from token (avoid login form flash). */
function AuthBootSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

function CompanyRoute({ children }) {
  const { user, company, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!company) return <Navigate to="/company/setup" replace />;
  return children;
}

/** After login/register: only send to dashboard when company exists; otherwise first-time setup. */
function PostAuthRedirect() {
  const { company } = useAuth();
  return <Navigate to={company ? '/dashboard' : '/company/setup'} replace />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      {/* Public — logged-in users leave login/register without flashing dashboard then setup */}
      <Route
        path="/login"
        element={loading ? <AuthBootSpinner /> : user ? <PostAuthRedirect /> : <Login />}
      />
      <Route
        path="/register"
        element={loading ? <AuthBootSpinner /> : user ? <PostAuthRedirect /> : <Register />}
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
      <Route path="/outstanding" element={
        <CompanyRoute><Layout><Outstanding /></Layout></CompanyRoute>
      } />
      <Route path="/parties/:partyId/ledger" element={
        <CompanyRoute><Layout><PartyLedger /></Layout></CompanyRoute>
      } />
      <Route path="/admin" element={
        <PrivateRoute><Layout><AdminPanel /></Layout></PrivateRoute>
      } />
      <Route path="/reports/accountant" element={
        <CompanyRoute><Layout><AccountantReport /></Layout></CompanyRoute>
      } />
      <Route path="/company" element={
        <PrivateRoute>
          <Layout><CompanySetup /></Layout>
        </PrivateRoute>
      } />
      <Route path="/settings" element={
        <CompanyRoute>
          <Layout>
            <div className="card">
              <h1 className="text-xl font-bold text-gray-900 mb-2">Settings</h1>
              <p className="text-gray-500">More settings coming soon.</p>
            </div>
          </Layout>
        </CompanyRoute>
      } />

      {/* Default */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
