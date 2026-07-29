import { create } from 'zustand';
import { supabase } from '../supabase/client';
import type { User } from '@supabase/supabase-js';
import { startHeartbeat, stopHeartbeat } from '../utils/heartbeat';

const CACHED_USER_KEY = 'pf_cached_user';
let authSubscription: { unsubscribe: () => void } | null = null;

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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  error: null,

  init: async () => {
    try {
      const cached = localStorage.getItem(CACHED_USER_KEY);
      if (cached) {
        const cachedUser = JSON.parse(cached) as User;
        if (cachedUser.id) set({ user: cachedUser, loading: false });
      }
    } catch {
      localStorage.removeItem(CACHED_USER_KEY);
    }

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (user) {
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
      startHeartbeat();
    } else {
      localStorage.removeItem(CACHED_USER_KEY);
      stopHeartbeat();
    }

    if (get().user?.id !== user?.id) set({ user, loading: false });
    else set({ loading: false });

    authSubscription?.unsubscribe();
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUser = nextSession?.user ?? null;
      if (nextUser) {
        localStorage.setItem(CACHED_USER_KEY, JSON.stringify(nextUser));
        startHeartbeat();
      } else {
        localStorage.removeItem(CACHED_USER_KEY);
        stopHeartbeat();
      }

      if (get().user?.id !== nextUser?.id) set({ user: nextUser });
    });
    authSubscription = data.subscription;
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
    stopHeartbeat();
    await supabase.auth.signOut();
    localStorage.removeItem(CACHED_USER_KEY);
    set({ user: null });
  },

  clearError: () => set({ error: null }),
}));
