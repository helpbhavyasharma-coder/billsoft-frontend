import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, FileText, Loader2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/apiError';

function readRememberedStates() {
  try {
    const states = JSON.parse(sessionStorage.getItem('bhauu_auth_states') || '[]');
    return Array.isArray(states) ? states.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function forgetAuthState(state) {
  const states = readRememberedStates().filter((item) => item !== state);
  if (states.length) {
    sessionStorage.setItem('bhauu_auth_states', JSON.stringify(states));
  } else {
    sessionStorage.removeItem('bhauu_auth_states');
  }
  if (!state || sessionStorage.getItem('bhauu_auth_state') === state) {
    sessionStorage.removeItem('bhauu_auth_state');
  }
}

function getPostAuthTarget(user, company) {
  if (user?.is_admin) return '/admin';
  return company ? '/dashboard' : '/company/setup';
}

function isEmbeddedWindow() {
  return window.parent && window.parent !== window;
}

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, company, completeBhauuLogin } = useAuth();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Completing Bhauu Auth login...');
  const handledRef = useRef(false);

  useEffect(() => {
    if (!user || !isEmbeddedWindow()) return;
    window.parent.postMessage(
      { source: 'billsoft-bhauu-auth', status: 'success', target: getPostAuthTarget(user, company) },
      window.location.origin,
    );
  }, [company, user]);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;
    if (window.BhauuAuth?.completePopupCallback?.()) return;

    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const expectedState = sessionStorage.getItem('bhauu_auth_state');
    const rememberedStates = readRememberedStates();
    const stateIsKnown = state && (state === expectedState || rememberedStates.includes(state));

    if (error) {
      setStatus('error');
      setMessage(error);
      return;
    }
    if (!code) {
      setStatus('error');
      setMessage('Authorization code missing from Bhauu Auth.');
      return;
    }
    if (state && (expectedState || rememberedStates.length) && !stateIsKnown) {
      setStatus('error');
      setMessage('Login state mismatch. Please try again.');
      return;
    }

    let cancelled = false;
    completeBhauuLogin(code, state)
      .then((data) => {
        if (cancelled) return;
        forgetAuthState(state);
        setStatus('success');
        setMessage(data.message || 'Bhauu Auth login successful.');
        toast.success('Signed in with Bhauu Auth');
        const target = data.isAdmin ? '/admin' : data.hasCompany ? '/dashboard' : '/company/setup';
        if (isEmbeddedWindow()) {
          window.parent.postMessage({ source: 'billsoft-bhauu-auth', status: 'success', target }, window.location.origin);
          return;
        }
        setTimeout(() => navigate(target, { replace: true }), 350);
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus('error');
        setMessage(getApiErrorMessage(err, 'Bhauu Auth login failed. Please try again.'));
      });

    return () => {
      cancelled = true;
    };
  }, [completeBhauuLogin, navigate, params]);

  if (user) {
    if (isEmbeddedWindow()) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-white">
          <div className="text-center">
            <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-blue-600" />
            <p className="text-sm font-medium text-slate-700">Opening BillSoft...</p>
          </div>
        </div>
      );
    }
    return <Navigate to={getPostAuthTarget(user, company)} replace />;
  }

  const isError = status === 'error';

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, var(--bg) 0%, var(--bg-card) 100%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>BillSoft</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Bhauu Auth Gateway</p>
        </div>

        <div className="card text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: isError ? 'rgba(239,68,68,0.12)' : 'rgba(37,99,235,0.12)' }}>
            {isError ? (
              <ShieldAlert className="h-6 w-6 text-red-500" />
            ) : status === 'success' ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            )}
          </div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            {isError ? 'Login Could Not Complete' : status === 'success' ? 'Login Complete' : 'Signing You In'}
          </h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-3)' }}>{message}</p>
          {isError && (
            <Link to="/login" className="btn-primary mt-5 w-full">
              Back to Login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
