import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { clearTokens, getAccessToken, setTokens } from './authStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadingGuard = setTimeout(() => {
      if (active) {
        setLoading(false);
      }
    }, 12000);

    async function bootstrap() {
      const token = getAccessToken();
      if (!token) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      try {
        const profile = await api.me();
        if (active) {
          setUser(profile);
        }
      } catch {
        clearTokens();
      } finally {
        clearTimeout(loadingGuard);
        if (active) {
          setLoading(false);
        }
      }
    }

    bootstrap();
    return () => {
      active = false;
      clearTimeout(loadingGuard);
    };
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    async login(email, password, accountType) {
      const payload = await api.login({ email, password, accountType });
      setTokens(payload.accessToken, payload.refreshToken);
      setUser(payload.user);
      return payload.user;
    },
    async register(form, accountType) {
      const payload = await api.register({ ...form, accountType });
      setTokens(payload.accessToken, payload.refreshToken);
      setUser(payload.user);
      return payload.user;
    },
    async logout() {
      await api.logout();
      setUser(null);
    },
    async refreshProfile() {
      const profile = await api.me();
      setUser(profile);
      return profile;
    }
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
