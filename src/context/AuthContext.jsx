import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';

const AuthContext = createContext(null);

const BHAUU_AUTH_ORIGIN = 'https://auth.bhauu.online';
const BHAUU_AUTH_SDK_URL = `${BHAUU_AUTH_ORIGIN}/sdk/bhauu-auth.js?v=20260914-originfix`;

function loadBhauuSdk() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Browser unavailable'));
  if (window.BhauuAuth?.buildAuthorizeUrl) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-bhauu-auth-sdk="true"]');
    if (existing) {
      if (window.BhauuAuth?.buildAuthorizeUrl) return resolve();
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Bhauu Auth SDK load failed')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = BHAUU_AUTH_SDK_URL;
    script.async = true;
    script.dataset.bhauuAuthSdk = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Bhauu Auth SDK load failed'));
    document.head.appendChild(script);
  });
}

function SessionExpiredModal({ onReauth, onLogout, isReauthing, message, isCentralExpiry = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {isCentralExpiry ? 'Central Identity Verification Required' : 'Authentication Session Expired'}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
          {message || 'Your Bhauu Auth central session requires fresh verification. Re-authenticate to continue working without losing your current inputs or drafts.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onReauth}
            disabled={isReauthing}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
          >
            {isReauthing ? 'Opening Auth Portal...' : (isCentralExpiry ? 'Verify & Renew Session' : 'Re-authenticate with Bhauu Auth')}
          </button>
          <button
            onClick={onLogout}
            disabled={isReauthing}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState('');
  const [isCentralExpiry, setIsCentralExpiry] = useState(false);
  const [reauthing, setReauthing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchMe = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/auth/me');
      if (data.success) {
        flushSync(() => {
          setUser(data.user);
          setCompany(data.company ?? null);
          setAuthError(null);
          setSessionExpired(false);
        });
      }
    } catch (err) {
      const status = err.response?.status;
      const isTemporary = !err.response || (status >= 500 && status <= 599) || status === 429 || err.code === 'ECONNABORTED';

      if (status === 401) {
        // Genuine session revocation or invalid credentials: wipe local token
        localStorage.removeItem('token');
        if (silent) {
          // If on a background check, trigger prompt modal without destroying loaded page
          setSessionExpired(true);
          setSessionExpiredMessage(err.response?.data?.message || 'Session expired. Please re-authenticate.');
        } else {
          flushSync(() => {
            setUser(null);
            setCompany(null);
            setAuthError(null);
          });
        }
      } else if (isTemporary) {
        // Temporary infrastructure failure: PRESERVE local token, enter safe retry state
        if (!silent) {
          setUser((currentUser) => {
            if (currentUser) {
              return currentUser;
            }
            flushSync(() => {
              setCompany(null);
              setAuthError({
                type: 'temporary',
                status: status || 0,
                message: err.response?.data?.message || err.message || 'Central authentication service is temporarily unavailable. Please retry.',
              });
            });
            return null;
          });
        }
      } else {
        // Explicit client/forbidden error (e.g. 403 deactivated)
        flushSync(() => {
          setUser(null);
          setCompany(null);
          setAuthError({
            type: 'forbidden',
            status: status || 403,
            message: err.response?.data?.message || 'Account is deactivated. Please contact admin.',
          });
        });
      }
    } finally {
      if (!silent) {
        flushSync(() => setLoading(false));
      }
    }
  };

  const retryAuth = async () => {
    setAuthError(null);
    await fetchMe();
  };

  const completeBhauuLogin = async (code, state, codeVerifier) => {
    const { data } = await api.post('/auth/bhauu/exchange', { code, state, code_verifier: codeVerifier });
    if (data.success) {
      localStorage.setItem('token', data.token);
      setSessionExpired(false);
      await fetchMe();
    }
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    try {
      sessionStorage.removeItem('softbill_nav_scroll_v1');
      sessionStorage.removeItem('softbill_nav_state_v1');
    } catch (_) {}
    setUser(null);
    setCompany(null);
    setAuthError(null);
    setSessionExpired(false);
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.location.href = '/';
    }
  };

  const refreshCompany = async () => {
    try {
      const { data } = await api.get('/company');
      if (data.success) setCompany(data.company);
    } catch (err) {
      console.error('Failed to refresh company:', err);
    }
  };

  // Re-authentication Popup Flow (Keeps user on the same screen)
  const reauthenticate = useCallback(async () => {
    if (reauthing) return;
    setReauthing(true);
    try {
      await loadBhauuSdk();
      const configRes = await api.get('/auth/bhauu/config').catch(() => null);
      const clientId = configRes?.data?.clientId || 'bag_live_khifglzxWlT-by47';
      const redirectUri = configRes?.data?.redirectUri || `${window.location.origin}/auth/callback`;

      const state = crypto.randomUUID?.().replace(/-/g, '') || String(Date.now());
      const codeVerifier = state + state;
      const pendingKey = `bhauu_auth_pending_${state}`;
      const resultKey = `bhauu_auth_popup_result_${state}`;
      localStorage.setItem(pendingKey, JSON.stringify({ state, codeVerifier, createdAt: Date.now() }));

      const authUrl = await window.BhauuAuth.buildAuthorizeUrl({
        clientId,
        redirectUri,
        gatewayUrl: BHAUU_AUTH_ORIGIN,
        scope: 'profile email',
        popup: true,
        state,
        codeVerifier,
      });

      const popup = window.open(
        authUrl,
        'bhauu_auth_login',
        'popup=yes,width=480,height=640,resizable=yes,scrollbars=yes'
      );

      if (!popup) {
        localStorage.removeItem(pendingKey);
        toast.error('Popup blocked. Please allow popups to re-authenticate.');
        setReauthing(false);
        return;
      }

      // Await message or storage from popup callback
      const result = await new Promise((resolve, reject) => {
        let timer = 0;
        let storageTimer = 0;
        let completed = false;

        const cleanup = () => {
          completed = true;
          window.removeEventListener('message', handleMessage);
          window.removeEventListener('storage', handleStorage);
          clearInterval(timer);
          clearInterval(storageTimer);
          localStorage.removeItem(resultKey);
          localStorage.removeItem(pendingKey);
        };

        const finishFromPayload = (data) => {
          if (!data || data.state !== state || completed) return false;
          cleanup();
          if (data.error) reject(new Error(String(data.error)));
          else resolve({ code: data.code, state, codeVerifier });
          return true;
        };

        const readStoredResult = () => {
          const raw = localStorage.getItem(resultKey);
          if (!raw) return false;
          try {
            return finishFromPayload(JSON.parse(raw));
          } catch {
            return false;
          }
        };

        const handleMessage = (event) => {
          const data = event.data || {};
          const allowedOrigins = [BHAUU_AUTH_ORIGIN, window.location.origin];
          if (!allowedOrigins.includes(event.origin) || data.state !== state) return;
          if (data.source === 'bhauu-auth' || data.source === 'billsoft-bhauu-auth') {
            finishFromPayload(data);
          }
        };

        const handleStorage = (event) => {
          if (event.key !== resultKey || !event.newValue) return;
          try {
            finishFromPayload(JSON.parse(event.newValue));
          } catch {}
        };

        window.addEventListener('message', handleMessage);
        window.addEventListener('storage', handleStorage);
        storageTimer = setInterval(readStoredResult, 250);

        timer = setInterval(() => {
          if (readStoredResult()) return;
          if (popup.closed) {
            setTimeout(() => {
              if (completed || readStoredResult()) return;
              cleanup();
              reject(new Error('Login popup was closed before completion.'));
            }, 1200);
          }
        }, 500);
      });

      if (result?.code) {
        await completeBhauuLogin(result.code, result.state, result.codeVerifier);
        setSessionExpired(false);
        toast.success('Re-authenticated successfully! You may now resume.');
      }
    } catch (err) {
      toast.error(err.message || 'Re-authentication failed. Please try again.');
    } finally {
      setReauthing(false);
    }
  }, [reauthing]);

  // Session Synchronization & Lifecycle Listeners (Requirements 10, 11, 12)
  useEffect(() => {
    // 1. Intercept 401 events from Axios
    const handleExpiredEvent = (e) => {
      setSessionExpired(true);
      if (e.detail?.message) {
        setSessionExpiredMessage(e.detail.message);
      }
      setIsCentralExpiry(e.detail?.errorCode === 'CENTRAL_SESSION_EXPIRED');
    };
    window.addEventListener('billsoft:session-expired', handleExpiredEvent);

    // 2. Periodic sync check every 60s when logged in & visible
    const interval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token && !document.hidden && !sessionExpired) {
        fetchMe(true);
      }
    }, 60000);

    // 3. Tab visibility sync: when tab transitions from background to active
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const token = localStorage.getItem('token');
        if (token && !sessionExpired) {
          fetchMe(true);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      window.removeEventListener('billsoft:session-expired', handleExpiredEvent);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [sessionExpired]);

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        loading,
        authError,
        sessionExpired,
        reauthenticate,
        retryAuth,
        completeBhauuLogin,
        logout,
        refreshCompany,
      }}
    >
      {children}
      {sessionExpired && (typeof window === 'undefined' || window.location.pathname !== '/auth/callback') && (
        <SessionExpiredModal
          onReauth={reauthenticate}
          onLogout={logout}
          isReauthing={reauthing}
          message={sessionExpiredMessage}
          isCentralExpiry={isCentralExpiry}
        />
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
