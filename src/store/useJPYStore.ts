import { create } from 'zustand';
import { fetchJPYRecords, saveJPYRecords, saveJPYRate } from '../supabase/db';
import type { JPYRecord } from '../types';

interface JPYState {
  records: JPYRecord[];
  rate: number;
  loading: boolean;
  loadRecords: (userId: string, year: number) => Promise<void>;
  addRecord: (userId: string, year: number, record: JPYRecord) => Promise<void>;
  deleteRecord: (userId: string, year: number, id: string) => Promise<void>;
  setRate: (userId: string, year: number, rate: number) => Promise<void>;
}

export const useJPYStore = create<JPYState>((set, get) => ({
  records: [],
  rate: 4.8,
  loading: true,

  loadRecords: async (userId, year) => {
    set({ loading: true });
    const { records, rate } = await fetchJPYRecords(userId, year);
    set({ records, rate, loading: false });
  },

  addRecord: async (userId, year, record) => {
    const id = record.id || `jp${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const records = [...get().records, { ...record, id }];
    await saveJPYRecords(userId, year, records);
    set({ records });
  },

  deleteRecord: async (userId, year, id) => {
    const records = get().records.filter((r) => r.id !== id);
    await saveJPYRecords(userId, year, records);
    set({ records });
  },

  setRate: async (userId, year, rate) => {
    await saveJPYRate(userId, year, rate);
    set({ rate });
  },
}));
