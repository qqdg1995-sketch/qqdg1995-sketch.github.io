import { create } from 'zustand';
import { fetchYears, createYear } from '../supabase/db';
import type { YearBook } from '../types';

interface YearState {
  years: YearBook[];
  currentYear: number | null;
  loading: boolean;
  loadedUserId: string | null;
  requestedUserId: string | null;
  loadYears: (userId: string) => Promise<void>;
  addYear: (userId: string, year: number, name?: string) => Promise<void>;
  switchYear: (year: number) => void;
  goHome: () => void;
}

export const useYearStore = create<YearState>((set, get) => ({
  years: [],
  currentYear: null,
  loading: true,
  loadedUserId: null,
  requestedUserId: null,

  loadYears: async (userId) => {
    if (get().loadedUserId === userId) {
      set({ loading: false });
      return;
    }
    set({ loading: true, requestedUserId: userId });
    try {
      const years = await fetchYears(userId);
      if (get().requestedUserId !== userId) return;
      const savedYear = Number(localStorage.getItem(`pf_current_year_${userId}`));
      const currentYear = years.some((item) => item.year === savedYear)
        ? savedYear
        : years[0]?.year ?? null;
      set({ years, currentYear, loadedUserId: userId });
    } finally {
      if (get().requestedUserId === userId) set({ loading: false });
    }
  },

  addYear: async (userId, year, name) => {
    await createYear(userId, year, name);
    const years = await fetchYears(userId);
    localStorage.setItem(`pf_current_year_${userId}`, String(year));
    set({ years, currentYear: year, loadedUserId: userId });
  },

  switchYear: (year) => {
    const userId = get().loadedUserId;
    if (userId) localStorage.setItem(`pf_current_year_${userId}`, String(year));
    set({ currentYear: year });
  },
  goHome: () => set({ currentYear: null }),
}));
