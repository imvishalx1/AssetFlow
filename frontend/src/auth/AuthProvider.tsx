import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { client } from '../lib/api/client';
import { tokenStore } from './tokenStore';
import { isMockMode, MOCK_USER } from './mock';
import type { AuthUser } from './types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async (): Promise<void> => {
    if (isMockMode) {
      setUser(MOCK_USER);
      setLoading(false);
      return;
    }
    try {
      const res = await client.get('/auth/me');
      setUser((res as unknown as { user: AuthUser }).user);
    } catch {
      setUser(null);
      tokenStore.clear();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshUser();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    if (isMockMode) {
      tokenStore.set('mock-token');
      setUser(MOCK_USER);
      return;
    }
    const res = await client.post('/auth/login', { email, password });
    const loginData = res as unknown as { accessToken: string; user: AuthUser };
    tokenStore.set(loginData.accessToken);
    setUser(loginData.user);
  };

  const logout = async (): Promise<void> => {
    if (isMockMode) {
      tokenStore.clear();
      setUser(null);
      return;
    }
    try {
      await client.post('/auth/logout');
    } catch {
      /* ignore */
    }
    tokenStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
