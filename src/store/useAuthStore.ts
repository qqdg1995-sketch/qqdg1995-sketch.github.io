import { create } from 'zustand';
import { supabase } from '../supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  init: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    set({ user: session?.user || null, loading: false });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user || null });
    });
  },

  signUp: async (email, password) => {
    set({ error: null });
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      set({ error: error.message === 'User already registered'
        ? '该邮箱已注册，请直接登录'
        : error.message });
      throw error;
    }
  },

  signIn: async (email, password) => {
    set({ error: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ error: '邮箱或密码错误，请重试' });
      throw error;
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },

  clearError: () => set({ error: null }),
}));
