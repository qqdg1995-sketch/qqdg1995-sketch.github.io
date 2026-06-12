import { create } from 'zustand';
import { fetchYears, createYear } from '../supabase/db';
import type { YearBook } from '../types';

interface YearState {
  years: YearBook[];
  currentYear: number | null;
  loading: boolean;
  loadYears: (userId: string) => Promise<void>;
  addYear: (userId: string, year: number, name?: string) => Promise<void>;
  switchYear: (year: number) => void;
  goHome: () => void;
}

export const useYearStore = create<YearState>((set) => ({
  years: [],
  currentYear: null,
  loading: true,

  loadYears: async (userId) => {
    set({ loading: true });
    const years = await fetchYears(userId);
    const currentYear = years.length > 0
      ? years.reduce((max, y) => y.year > max.year ? y : max, years[0]).year
      : null;
    set({ years, currentYear, loading: false });
  },

  addYear: async (userId, year, name) => {
    await createYear(userId, year, name);
    const years = await fetchYears(userId);
    set({ years, currentYear: year });
  },

  switchYear: (year) => set({ currentYear: year }),
  goHome: () => set({ currentYear: null }),
}));
