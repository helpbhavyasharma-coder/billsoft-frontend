import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FileText, Eye, EyeOff, LockKeyhole, ShieldCheck, ExternalLink, AlertCircle, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { getApiErrorMessage } from '../utils/apiError';

const defaultAuthConfig = {
  enabled: false,
  gatewayUrl: 'https://auth.bhauu.online/backend/public',
  clientId: '',
  redirectUri: 'https://softbill.bhauu.online/auth/callback',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authConfig, setAuthConfig] = useState(defaultAuthConfig);
  const [embedState, setEmbedState] = useState('');
  const [legacyOpen, setLegacyOpen] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    setEmbedState(crypto.randomUUID?.().replace(/-/g, '') || `${Date.now()}${Math.random()}`.replace(/\D/g, ''));
    let cancelled = false;
    api.get('/auth/bhauu/config')
      .then(({ data }) => {
        if (!cancelled && data.success) setAuthConfig({ ...defaultAuthConfig, ...data });
      })
      .catch(() => {
        if (!cancelled) setAuthConfig(defaultAuthConfig);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data || {};
      if (data.source !== 'billsoft-bhauu-auth') return;
      if (data.status === 'success') {
        window.location.href = data.target || '/dashboard';
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const startHostedLogin = () => {
    if (!authConfig.enabled || !authConfig.clientId) {
      toast.error('Bhauu Auth abhi configure nahi hua hai. Old login use karein.');
      return;
    }
    const state = crypto.randomUUID?.().replace(/-/g, '') || `${Date.now()}${Math.random()}`.replace(/\D/g, '');
    sessionStorage.setItem('bhauu_auth_state', state);
    const url = new URL(`${authConfig.gatewayUrl}/oauth/authorize`);
    url.searchParams.set('client_id', authConfig.clientId);
    url.searchParams.set('redirect_uri', authConfig.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid profile email');
    url.searchParams.set('state', state);
    window.location.href = url.toString();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data.success) {
        if (data.bhauuMigration?.attempted && !data.bhauuMigration?.linked) {
          toast.error(`BillSoft login ho gaya, par Bhauu Auth link nahi hua: ${data.bhauuMigration.message}`);
        } else if (data.bhauuMigration?.linked) {
          toast.success('Account Bhauu Auth se linked hai.');
        } else {
          toast.success('Welcome back!');
        }
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const embedUrl = (() => {
    if (!authConfig.enabled || !authConfig.clientId || !embedState) return '';
    const url = new URL(`${authConfig.gatewayUrl}/oauth/embed`);
    url.searchParams.set('client_id', authConfig.clientId);
    url.searchParams.set('redirect_uri', authConfig.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid profile email');
    url.searchParams.set('state', embedState);
    return url.toString();
  })();

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, var(--bg) 0%, var(--bg-card) 100%)' }}>
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>BillSoft</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>GST Billing & Invoice Software</p>
        </div>

        <div className="space-y-4">
          <div className="card">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Managed Login</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
                  Bhauu Auth se secure sign-in. Existing BillSoft users ke liye dual transition active rahega.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">Embedded Box</span>
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--success)' }}>Dual Login Transition</span>
              </div>
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title="Secure Bhauu Auth Login"
                  className="block w-full rounded-xl border-0 bg-white"
                  style={{ height: 520 }}
                />
              ) : (
                <div className="mt-4 flex gap-2 rounded-xl border p-3 text-sm" style={{ borderColor: 'rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.10)', color: 'var(--text-2)' }}>
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span>Bhauu Auth app create hone ke baad yeh button live ho jayega. Abhi old login safe fallback hai.</span>
                </div>
              )}
              <button
                type="button"
                onClick={startHostedLogin}
                disabled={!authConfig.enabled}
                className="btn-secondary mt-3 w-full py-2.5"
              >
                Open hosted login
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
              Security note: Client secret browser me expose nahi hota. Billing backend authorization code exchange karke apna BillSoft session banata hai.
            </p>
          </div>

          <div className="card p-0 overflow-hidden">
            <button
              type="button"
              onClick={() => setLegacyOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left"
              style={{ color: 'var(--text)' }}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(100,116,139,0.15)', color: 'var(--text-2)' }}>
                  <LockKeyhole className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Old BillSoft account?</span>
                  <span className="block text-xs" style={{ color: 'var(--text-3)' }}>Use once to link your account with Bhauu Auth</span>
                </span>
              </span>
              <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${legacyOpen ? 'rotate-180' : ''}`} />
            </button>

            {legacyOpen && (
              <div className="border-t p-4" style={{ borderColor: 'var(--border)' }}>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label">Email address</label>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Password</label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        className="input-field pr-10"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--text-3)' }}
                        aria-label={showPass ? 'Hide password' : 'Show password'}
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-base">
                    {loading ? 'Linking account...' : 'Sign In & Link'}
                  </button>
                </form>

                <p className="text-center text-sm mt-5" style={{ color: 'var(--text-3)' }}>
                  Don't have an account?{' '}
                  <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                    Create one free
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
