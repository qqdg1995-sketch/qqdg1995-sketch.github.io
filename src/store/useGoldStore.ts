import { create } from 'zustand';
import { fetchGoldRecords, saveGoldRecords, saveGoldRate } from '../supabase/db';
import type { GoldRecord } from '../types';

interface GoldState {
  records: GoldRecord[];
  rate: number;      // 当前净值（元/份）
  loading: boolean;
  loadRecords: (userId: string, year: number) => Promise<void>;
  addRecord: (userId: string, year: number, record: GoldRecord) => Promise<void>;
  deleteRecord: (userId: string, year: number, id: string) => Promise<void>;
  setRate: (userId: string, year: number, rate: number) => Promise<void>;
}

export const useGoldStore = create<GoldState>((set, get) => ({
  records: [],
  rate: 1.0,
  loading: true,

  loadRecords: async (userId, year) => {
    set({ loading: true });
    const { records, rate } = await fetchGoldRecords(userId, year);
    set({ records, rate, loading: false });
  },

  addRecord: async (userId, year, record) => {
    const id = record.id || `gd${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const records = [...get().records, { ...record, id }];
    await saveGoldRecords(userId, year, records);
    set({ records });
  },

  deleteRecord: async (userId, year, id) => {
    const records = get().records.filter((r) => r.id !== id);
    await saveGoldRecords(userId, year, records);
    set({ records });
  },

  setRate: async (userId, year, rate) => {
    await saveGoldRate(userId, year, rate);
    set({ rate });
  },
}));
