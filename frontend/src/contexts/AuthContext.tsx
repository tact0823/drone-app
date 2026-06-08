import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, getMe, logout as apiLogout, type User } from '../lib/api';

interface AuthContextValue {
  user: User | null;
  csrfToken: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getMe();
      setUser(data.user);
      setCsrfToken(data.csrfToken);
    } catch (err) {
      setUser(null);
      setCsrfToken(null);
      if (err instanceof ApiError && err.code === 'TOKEN_EXPIRED') {
        throw err;
      }
    }
  }, []);

  useEffect(() => {
    refresh()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await apiLogout(csrfToken ?? undefined);
    } finally {
      setUser(null);
      setCsrfToken(null);
    }
  }, [csrfToken]);

  const value = useMemo(
    () => ({ user, csrfToken, loading, refresh, logout }),
    [user, csrfToken, loading, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
