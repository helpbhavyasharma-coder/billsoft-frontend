import { useEffect, useState } from 'react';
import { ExternalLink, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';

const defaultAuthConfig = {
  enabled: true,
  gatewayUrl: 'https://auth.bhauu.online/backend/public',
  clientId: 'bag_live_khifglzxWlT-by47',
  redirectUri: 'https://softbill.bhauu.online/auth/callback',
};

function createAuthState() {
  return crypto.randomUUID?.().replace(/-/g, '') || `${Date.now()}${Math.random()}`.replace(/\D/g, '');
}

function rememberAuthState(state) {
  if (!state) return;
  sessionStorage.setItem('bhauu_auth_state', state);
  try {
    const existing = JSON.parse(sessionStorage.getItem('bhauu_auth_states') || '[]');
    const states = Array.isArray(existing) ? existing : [];
    const next = [state, ...states.filter((item) => item && item !== state)].slice(0, 5);
    sessionStorage.setItem('bhauu_auth_states', JSON.stringify(next));
  } catch {
    sessionStorage.setItem('bhauu_auth_states', JSON.stringify([state]));
  }
}

export default function Login() {
  const [authConfig, setAuthConfig] = useState(defaultAuthConfig);
  const [embedState, setEmbedState] = useState('');

  useEffect(() => {
    const state = createAuthState();
    rememberAuthState(state);
    setEmbedState(state);
    let cancelled = false;
    api.get('/auth/bhauu/config')
      .then(({ data }) => {
        if (!cancelled && data.success) setAuthConfig({ ...defaultAuthConfig, ...data });
      })
      .catch(() => {
        if (!cancelled) setAuthConfig((current) => current);
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
        window.location.replace(data.target || '/dashboard');
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
    const state = createAuthState();
    rememberAuthState(state);
    const url = new URL(`${authConfig.gatewayUrl}/oauth/authorize`);
    url.searchParams.set('client_id', authConfig.clientId);
    url.searchParams.set('redirect_uri', authConfig.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid profile email');
    url.searchParams.set('state', state);
    window.location.href = url.toString();
  };

  const embedUrl = (() => {
    if (!authConfig.enabled || !authConfig.clientId || !embedState) return '';
    const url = new URL(`${authConfig.gatewayUrl}/oauth/embed`);
    url.searchParams.set('client_id', authConfig.clientId);
    url.searchParams.set('redirect_uri', authConfig.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid profile email');
    url.searchParams.set('state', embedState);
    url.searchParams.set('display', 'bare');
    return url.toString();
  })();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6" style={{ background: 'linear-gradient(135deg, var(--bg) 0%, var(--bg-card) 100%)' }}>
      <main className="w-full max-w-[460px]">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title="Secure Bhauu Auth Login"
            className="block w-full border-0 bg-transparent"
            style={{ height: 'min(620px, calc(100vh - 24px))' }}
          />
        ) : (
          <div className="card text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'rgba(239,68,68,0.12)' }}>
              <ShieldAlert className="h-6 w-6 text-red-500" />
            </div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Bhauu Auth not available</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-3)' }}>
              Login service connect nahi ho raha. Thodi der baad retry karein.
            </p>
            <button
              type="button"
              onClick={startHostedLogin}
              disabled={!authConfig.enabled}
              className="btn-secondary mt-5 w-full py-2.5"
            >
              Open hosted login
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
