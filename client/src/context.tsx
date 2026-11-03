import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import type { User } from '../../shared/domain';
import { api, ApiError, financeChannel } from './api';
import { clearDrafts, retainOnlyOwner } from './drafts';
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
      staleTime: 15000,
      refetchOnWindowFocus: true,
    },
  },
});
const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  expired: boolean;
  error: string;
  setUser: (u: User | null) => void;
  reload: () => Promise<void>;
  logout: () => Promise<void>;
}>(null!);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [expired, setExpired] = useState(false),
    [error, setError] = useState('');
  const qc = useQueryClient();
  async function reload() {
    setError('');
    try {
      setUser(await api<User>('/auth/session'));
    } catch (e) {
      setUser(null);
      if (!(e instanceof ApiError && e.status === 401)) setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function logout() {
    await api('/auth/logout', { method: 'POST', body: {} });
    qc.clear();
    clearDrafts();
    setUser(null);
    setExpired(false);
    financeChannel?.postMessage({ type: 'logout' });
  }
  useEffect(() => {
    void reload();
    const expired = () => {
      qc.clear();
      setUser(null);
      setExpired(true);
    };
    window.addEventListener('bachat:expired', expired);
    const listener = (e: MessageEvent) => {
      if (e.data?.type === 'logout') {
        qc.clear();
        clearDrafts();
        setUser(null);
      } else if (e.data?.type === 'changed') void qc.invalidateQueries();
    };
    financeChannel?.addEventListener('message', listener);
    return () => {
      window.removeEventListener('bachat:expired', expired);
      financeChannel?.removeEventListener('message', listener);
    };
  }, []);
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        expired,
        error,
        setUser: (u) => {
          qc.clear();
          if (u) retainOnlyOwner(u.id);
          else clearDrafts();
          setUser(u);
          setExpired(false);
        },
        reload,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
const ToastContext = createContext<(message: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 6000);
    return () => clearTimeout(t);
  }, [message]);
  return (
    <ToastContext.Provider value={setMessage}>
      {children}
      {message && (
        <div className="toast" role="status">
          <span>{message}</span>
          <button aria-label="Dismiss notification" onClick={() => setMessage('')}>
            ×
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true),
      off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
