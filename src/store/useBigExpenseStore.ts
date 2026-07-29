import { create } from 'zustand';
import { deleteBigExpenseRecord, fetchBigExpenseRecords, upsertBigExpenseRecord } from '../supabase/db';
import type { BigExpenseRecord } from '../types';

interface BigExpenseState {
  records: BigExpenseRecord[];
  loading: boolean;
  loadedKey: string | null;
  loadingKey: string | null;
  loadRecords: (userId: string, year: number) => Promise<void>;
  addRecord: (userId: string, year: number, record: BigExpenseRecord) => Promise<void>;
  deleteRecord: (userId: string, year: number, id: string) => Promise<void>;
}

export const useBigExpenseStore = create<BigExpenseState>((set, get) => ({
  records: [],
  loading: true,
  loadedKey: null,
  loadingKey: null,

  loadRecords: async (userId, year) => {
    const key = `${userId}:${year}`;
    if (get().loadedKey === key) return;
    set({ loading: true, loadingKey: key });
    try {
      const records = await fetchBigExpenseRecords(userId, year);
      if (get().loadingKey === key) set({ records, loadedKey: key });
    } finally {
      if (get().loadingKey === key) set({ loading: false });
    }
  },

  addRecord: async (userId, year, record) => {
    const id = record.id || `be${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const saved = { ...record, id };
    const records = [...get().records.filter((item) => item.id !== id), saved]
      .sort((a, b) => b.date.localeCompare(a.date));
    await upsertBigExpenseRecord(userId, year, saved);
    set({ records });
  },

  deleteRecord: async (userId, year, id) => {
    const records = get().records.filter((r) => r.id !== id);
    await deleteBigExpenseRecord(userId, year, id);
    set({ records });
  },
}));
