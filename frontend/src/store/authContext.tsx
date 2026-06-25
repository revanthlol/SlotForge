import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Mock auth — replace with real Supabase calls when backend is ready
const MOCK_USER: User = {
  id: '1',
  name: 'Admin User',
  email: 'admin@slotforge.app',
  avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Admin&backgroundColor=6366f1',
  role: 'admin',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check persisted session
    const stored = localStorage.getItem('slotforge_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { localStorage.removeItem('slotforge_user'); }
    }
    setLoading(false);
  }, []);

  const persist = (u: User) => {
    localStorage.setItem('slotforge_user', JSON.stringify(u));
    setUser(u);
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    // TODO: replace with Supabase OAuth
    await new Promise(r => setTimeout(r, 800));
    persist(MOCK_USER);
    setLoading(false);
  };

  const loginWithEmail = async (email: string, _password: string) => {
    setLoading(true);
    // TODO: replace with Supabase email auth
    await new Promise(r => setTimeout(r, 600));
    persist({ ...MOCK_USER, email });
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('slotforge_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user, loading, loginWithGoogle, loginWithEmail, logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
