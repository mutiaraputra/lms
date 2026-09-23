'use client';

// =============================================================================
// Konteks autentikasi sisi klien (Fase 2 — fondasi frontend).
// Menyediakan state sesi (user + role), aksi login/logout, dan status loading
// awal (saat membaca sesi tersimpan). Dipakai oleh AppShell & RequireAuth.
// =============================================================================

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  apiPost,
  clearSession,
  getAuthToken,
  getRefreshToken,
  getUser,
  setSession,
  type LoginResponse,
  type SessionUser,
} from './api';

interface AuthContextValue {
  user: SessionUser | null;
  /** true selama membaca sesi tersimpan pada mount pertama. */
  initializing: boolean;
  login: (identifier: string, password: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
  /** Perbarui user tersimpan (mis. setelah edit profil). */
  setUser: (user: SessionUser) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<SessionUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Muat sesi tersimpan sekali di klien.
  useEffect(() => {
    const token = getAuthToken();
    const cached = getUser();
    if (token && cached) {
      setUserState(cached);
    }
    setInitializing(false);
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const data = await apiPost<LoginResponse>('/auth/login', { identifier, password }, { skipAuth: true });
    setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
    setUserState(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    // Cabut refresh token di server (best-effort — tetap lanjut walau gagal).
    if (refreshToken) {
      try {
        await apiPost('/auth/logout', { refreshToken }, { skipAuth: true });
      } catch {
        /* abaikan */
      }
    }
    clearSession();
    setUserState(null);
  }, []);

  const setUser = useCallback((next: SessionUser) => {
    setSession({ accessToken: getAuthToken() || '', user: next });
    setUserState(next);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, initializing, login, logout, setUser }),
    [user, initializing, login, logout, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  return ctx;
}
