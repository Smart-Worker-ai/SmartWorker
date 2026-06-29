import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { tokenStore } from '../api/client.js';

const AuthContext = createContext(null);
const USER_KEY = 'crewzo_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY)) || null;
    } catch {
      return null;
    }
  });

  // If the token is cleared elsewhere (e.g. a 401), drop the user too.
  useEffect(() => {
    if (!tokenStore.get()) setUser(null);
  }, []);

  function persist(token, nextUser) {
    if (token) tokenStore.set(token);
    if (nextUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
    }
  }

  function logout() {
    tokenStore.clear();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, login: persist, setUser, logout }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
