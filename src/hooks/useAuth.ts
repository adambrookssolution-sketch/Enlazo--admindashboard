import { useState, useEffect } from 'react';
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

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isAdmin: false,
    isLoading: true,
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserData(session.user, session);
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await loadUserData(session.user, session);
        } else {
          setState({
            user: null,
            session: null,
            profile: null,
            isAdmin: false,
            isLoading: false,
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function loadUserData(user: User, session: Session) {
    try {
      // Fetch profile and admin role in parallel
      const [profileResult, roleResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, first_name, last_name_paterno, last_name_materno, display_name, avatar_url, phone')
          .eq('id', user.id)
          .single(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle(),
      ]);

      const isAdmin = !!roleResult.data;

      setState({
        user,
        session,
        profile: profileResult.data,
        isAdmin,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return {
    ...state,
    signIn,
    signOut,
  };
}
