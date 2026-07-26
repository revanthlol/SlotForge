import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import api, { setApiAccessToken } from '../lib/api';
import type { Session, User } from '@supabase/supabase-js';
import axios from 'axios';

type OAuthProvider = 'google' | 'github';
type SignInResult = 'ready' | 'missing-profile';

interface AuthState {
  user: User | null;
  session: Session | null;
  organizationId: string | null;
  role: string | null;
  jobTitle: string | null;
  fullName: string | null;
  needsAccountSetup: boolean;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, orgName: string, jobTitle: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>;
  completeAccount: (orgName: string, fullName: string, jobTitle: string) => Promise<void>;
  updateProfile: (fullName: string, jobTitle: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
  createOrganization: (name: string) => Promise<string>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [needsAccountSetup, setNeedsAccountSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  const clearProfile = useCallback(() => {
    setOrganizationId(null);
    setRole(null);
    setJobTitle(null);
    setFullName(null);
    localStorage.removeItem('slotforge_org_id');
  }, []);

  const applyProfile = useCallback((data: {
    organization_id: string;
    role: string;
    job_title: string | null;
    full_name: string | null;
  }) => {
    setOrganizationId(data.organization_id);
    setRole(data.role);
    setJobTitle(data.job_title);
    setFullName(data.full_name);
    setNeedsAccountSetup(false);
    localStorage.setItem('slotforge_org_id', data.organization_id);
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      applyProfile(data);
      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        clearProfile();
        setNeedsAccountSetup(true);
        return null;
      }
      throw error;
    }
  }, [applyProfile, clearProfile]);

  useEffect(() => {
    let mounted = true;
    let profileSyncTimer: number | undefined;

    const restoreSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);
      setApiAccessToken(session?.access_token ?? null);

      if (!session) {
        clearProfile();
        setNeedsAccountSetup(false);
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setApiAccessToken(session?.access_token ?? null);
      if (!session) {
        clearProfile();
        setNeedsAccountSetup(false);
        setLoading(false);
      } else if (event !== 'INITIAL_SESSION') {
        setLoading(true);
        // Supabase recommends keeping auth callbacks synchronous. Defer the
        // application profile request until its internal auth lock is released.
        profileSyncTimer = window.setTimeout(() => {
          loadProfile()
            .catch((err) => console.error('Failed to synchronize signed-in profile:', err))
            .finally(() => {
              if (mounted) setLoading(false);
            });
        }, 0);
      }
    });

    return () => {
      mounted = false;
      if (profileSyncTimer !== undefined) window.clearTimeout(profileSyncTimer);
      subscription.unsubscribe();
    };
  }, [clearProfile, loadProfile]);

  const signUp = async (email: string, password: string, fullName: string, orgName: string, jobTitle: string) => {
    const { data } = await api.post('/auth/signup-organization', {
      email,
      password,
      full_name: fullName,
      org_name: orgName,
      job_title: jobTitle,
    });

    // Also sign in via Supabase to get a session
    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // If Supabase auth isn't configured, store org_id anyway
      console.warn('Supabase sign-in failed (may be in dev mode):', error.message);
      setOrganizationId(data.organization_id);
      localStorage.setItem('slotforge_org_id', data.organization_id);
      return;
    }
    
    setApiAccessToken(signInData.session?.access_token ?? null);
    setSession(signInData.session);
    setUser(signInData.user);
    
    try {
      await loadProfile();
    } catch (err) {
      console.error('Failed to load profile after signup:', err);
      clearProfile();
      throw err;
    }
  };

  const signIn = async (email: string, password: string): Promise<SignInResult> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setApiAccessToken(data.session?.access_token ?? null);
    setSession(data.session);
    setUser(data.user);
    
    try {
      const profile = await loadProfile();
      return profile ? 'ready' : 'missing-profile';
    } catch (err) {
      console.error('Failed to load profile after signin:', err);
      clearProfile();
      throw err;
    }
  };

  const signInWithOAuth = async (provider: OAuthProvider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  };

  const completeAccount = async (orgName: string, nextFullName: string, nextJobTitle: string) => {
    const { data } = await api.post('/auth/complete-account', {
      org_name: orgName,
      full_name: nextFullName,
      job_title: nextJobTitle,
    });
    applyProfile(data);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setApiAccessToken(null);
    setSession(null);
    setUser(null);
    clearProfile();
    setNeedsAccountSetup(false);
  };

  const updateProfile = async (nextFullName: string, nextJobTitle: string) => {
    const { data } = await api.patch('/auth/me', {
      full_name: nextFullName,
      job_title: nextJobTitle,
    });
    setFullName(data.full_name);
    setJobTitle(data.job_title);
  };

  const switchOrganization = async (nextOrganizationId: string) => {
    await api.post(`/organizations/${nextOrganizationId}/switch`);
    setOrganizationId(nextOrganizationId);
    localStorage.setItem('slotforge_org_id', nextOrganizationId);
    await loadProfile();
  };

  const createOrganization = async (name: string) => {
    const { data } = await api.post('/organizations', { name });
    setOrganizationId(data.id);
    localStorage.setItem('slotforge_org_id', data.id);
    await loadProfile();
    return data.id as string;
  };

  return (
    <AuthContext.Provider value={{ user, session, organizationId, role, jobTitle, fullName, needsAccountSetup, loading, signUp, signIn, signInWithOAuth, completeAccount, updateProfile, signOut, switchOrganization, createOrganization }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
