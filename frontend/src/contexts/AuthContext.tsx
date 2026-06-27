import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import api, { setApiAccessToken } from '../lib/api';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  organizationId: string | null;
  role: string | null;
  fullName: string | null;
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
  const [role, setRole] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const clearProfile = () => {
    setOrganizationId(null);
    setRole(null);
    setFullName(null);
    localStorage.removeItem('slotforge_org_id');
  };

  const loadProfile = async () => {
    const { data } = await api.get('/auth/me');
    setOrganizationId(data.organization_id);
    setRole(data.role);
    setFullName(data.full_name);
    localStorage.setItem('slotforge_org_id', data.organization_id);
    return data;
  };

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);
      setApiAccessToken(session?.access_token ?? null);

      if (!session) {
        clearProfile();
        setLoading(false);
        return;
      }

      try {
        await loadProfile();
      } catch (err) {
        console.error('Failed to load signed-in profile:', err);
        clearProfile();
      } finally {
        if (mounted) setLoading(false);
      }
    };

    restoreSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setApiAccessToken(session?.access_token ?? null);
      if (!session) clearProfile();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // If Supabase auth isn't configured, store org_id anyway
      console.warn('Supabase sign-in failed (may be in dev mode):', error.message);
      return;
    }
    setApiAccessToken(signInData.session?.access_token ?? null);
    setSession(signInData.session);
    setUser(signInData.user);
    await loadProfile();
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setApiAccessToken(data.session?.access_token ?? null);
    setSession(data.session);
    setUser(data.user);
    await loadProfile();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setApiAccessToken(null);
    setSession(null);
    setUser(null);
    clearProfile();
  };

  return (
    <AuthContext.Provider value={{ user, session, organizationId, role, fullName, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
