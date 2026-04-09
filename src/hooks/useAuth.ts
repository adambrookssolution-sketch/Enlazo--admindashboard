import { useState, useEffect, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  first_name: string;
  last_name_paterno: string | null;
  last_name_materno: string | null;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
}

// Hard safety timeout: under no circumstances should the dashboard be stuck
// on the "Cargando..." screen for longer than this. If a query hangs (stale
// session, RLS recursion, websocket race, etc.) we release the loading gate
// and let the UI render with whatever state we have.
const AUTH_LOAD_TIMEOUT_MS = 8000;

// Per-query timeout for the initial profile/role fetch.
const QUERY_TIMEOUT_MS = 6000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout after ${ms}ms: ${label}`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isAdmin: false,
    isLoading: true,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Absolute safety net: release the loading state no matter what after
    // AUTH_LOAD_TIMEOUT_MS. Prevents "Cargando..." from ever sticking.
    const globalTimeout = setTimeout(() => {
      if (!mountedRef.current) return;
      setState((prev) => (prev.isLoading ? { ...prev, isLoading: false } : prev));
    }, AUTH_LOAD_TIMEOUT_MS);

    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mountedRef.current) return;
        if (session?.user) {
          // Set user/session synchronously so the UI knows we have a session,
          // then load profile/role in the background.
          setState((prev) => ({
            ...prev,
            user: session.user,
            session,
          }));
          loadUserData(session.user, session);
        } else {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      })
      .catch((err) => {
        console.error('[useAuth] getSession failed:', err);
        if (!mountedRef.current) return;
        setState((prev) => ({ ...prev, isLoading: false }));
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mountedRef.current) return;
      if (session?.user) {
        setState((prev) => ({
          ...prev,
          user: session.user,
          session,
        }));
        loadUserData(session.user, session);
      } else {
        setState({
          user: null,
          session: null,
          profile: null,
          isAdmin: false,
          isLoading: false,
        });
      }
    });

    return () => {
      mountedRef.current = false;
      clearTimeout(globalTimeout);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadUserData(user: User, _session: Session) {
    // Run profile + role fetches independently so one hang doesn't block
    // the other. Each has its own timeout.
    const profilePromise = withTimeout(
      Promise.resolve(
        supabase
          .from('profiles')
          .select('id, first_name, last_name_paterno, last_name_materno, display_name, avatar_url, phone')
          .eq('id', user.id)
          .maybeSingle()
      ),
      QUERY_TIMEOUT_MS,
      'profile fetch'
    ).catch((err: any) => {
      console.warn('[useAuth] profile fetch failed:', err?.message || err);
      return { data: null, error: err };
    });

    const rolePromise = withTimeout(
      Promise.resolve(
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle()
      ),
      QUERY_TIMEOUT_MS,
      'role fetch'
    ).catch((err: any) => {
      console.warn('[useAuth] role fetch failed:', err?.message || err);
      return { data: null, error: err };
    });

    const [profileResult, roleResult] = await Promise.all([profilePromise, rolePromise]);

    if (!mountedRef.current) return;

    setState((prev) => ({
      ...prev,
      profile: (profileResult as any)?.data ?? null,
      isAdmin: !!(roleResult as any)?.data,
      isLoading: false,
    }));
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase signOut error:', error);
      }
    } catch (error) {
      console.error('Error in signOut:', error);
    } finally {
      // Always clear state to guarantee logout regardless of server response.
      if (mountedRef.current) {
        setState({
          user: null,
          session: null,
          profile: null,
          isAdmin: false,
          isLoading: false,
        });
      }
      // Also clear local storage tokens to prevent stale-session cargando loops.
      try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('sb-') || k.startsWith('enlazo-admin-auth') || k.includes('supabase'))) {
            keys.push(k);
          }
        }
        keys.forEach((k) => localStorage.removeItem(k));
      } catch {}
    }
  }

  return {
    ...state,
    signIn,
    signOut,
  };
}
