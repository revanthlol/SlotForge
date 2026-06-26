import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  organizationId: string | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, orgName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Try to get org_id from local storage
      const storedOrgId = localStorage.getItem('slotforge_org_id');
      if (storedOrgId) setOrganizationId(storedOrgId);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, orgName: string) => {
    const { data } = await api.post('/auth/signup-organization', {
      email,
      password,
      full_name: fullName,
      org_name: orgName,
    });

    setOrganizationId(data.organization_id);
    localStorage.setItem('slotforge_org_id', data.organization_id);

    // Also sign in via Supabase to get a session
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // If Supabase auth isn't configured, store org_id anyway
      console.warn('Supabase sign-in failed (may be in dev mode):', error.message);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setOrganizationId(null);
    localStorage.removeItem('slotforge_org_id');
  };

  return (
    <AuthContext.Provider value={{ user, session, organizationId, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
