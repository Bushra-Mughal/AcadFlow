import React, { createContext, useContext, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/db/supabase';
import type { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string | null;
  gmail: string | null;
  username: string | null;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string, gmail?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
  resetPassword: (username: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(username: string, password: string) {
    if (!isSupabaseConfigured) throw new Error('Configure Supabase in .env.local before signing in.');
    const email = `${username}@miaoda.com`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(username: string, password: string, gmail?: string) {
    if (!isSupabaseConfigured) throw new Error('Configure Supabase in .env.local before signing up.');
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }
    if (username.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }
    if (username.length > 30) {
      throw new Error('Username must be 30 characters or fewer');
    }

    // Validate Gmail if provided
    const trimmedGmail = gmail?.trim().toLowerCase() || '';
    if (trimmedGmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedGmail)) {
      throw new Error('Please enter a valid Gmail address');
    }

    // Check username uniqueness
    const { data: existing, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();
    if (checkError) throw checkError;
    if (existing) throw new Error('Username is already taken. Please choose a different one.');

    // Check Gmail uniqueness if provided
    if (trimmedGmail) {
      const { data: gmailExisting } = await supabase
        .from('profiles')
        .select('id')
        .eq('gmail', trimmedGmail)
        .maybeSingle();
      if (gmailExisting) throw new Error('This Gmail is already linked to another account.');
    }

    const email = `${username}@miaoda.com`;
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    // Persist username (and Gmail if provided) into the profiles row
    if (data.user) {
      const updates: Record<string, string> = { username };
      if (trimmedGmail) updates.gmail = trimmedGmail;
      const { error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', data.user.id);
      if (profileError) console.error('Profile update error:', profileError);
    }
  }

  async function signInWithGoogle() {
    if (!isSupabaseConfigured) throw new Error('Configure Supabase in .env.local before signing in.');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) throw error;
  }

  async function signOut() {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async function resetPassword(username: string) {
    if (!isSupabaseConfigured) throw new Error('Configure Supabase in .env.local before resetting a password.');
    const email = `${username.trim().toLowerCase()}@miaoda.com`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }

  async function checkUsernameAvailable(username: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    if (!username || username.length < 3) return false;
    // Use a SECURITY DEFINER RPC so RLS doesn't block unauthenticated callers
    // and we always get the real availability answer.
    const { data, error } = await supabase.rpc('is_username_available', { p_username: username });
    if (error) {
      console.error('checkUsernameAvailable error:', error);
      return false; // fail-closed: treat as taken on error
    }
    return data === true;
  }

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    checkUsernameAvailable,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


