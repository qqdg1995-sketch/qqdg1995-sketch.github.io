import { create } from 'zustand';
import { fetchBigExpenseRecords, saveBigExpenseRecords } from '../supabase/db';
import type { BigExpenseRecord } from '../types';

interface BigExpenseState {
  records: BigExpenseRecord[];
  loading: boolean;
  loadRecords: (userId: string, year: number) => Promise<void>;
  addRecord: (userId: string, year: number, record: BigExpenseRecord) => Promise<void>;
  deleteRecord: (userId: string, year: number, id: string) => Promise<void>;
}

export const useBigExpenseStore = create<BigExpenseState>((set, get) => ({
  records: [],
  loading: true,

  loadRecords: async (userId, year) => {
    set({ loading: true });
    const records = await fetchBigExpenseRecords(userId, year);
    set({ records, loading: false });
  },

  addRecord: async (userId, year, record) => {
    const id = record.id || `be${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const records = [...get().records, { ...record, id }];
    await saveBigExpenseRecords(userId, year, records);
    set({ records });
  },

  deleteRecord: async (userId, year, id) => {
    const records = get().records.filter((r) => r.id !== id);
    await saveBigExpenseRecords(userId, year, records);
    set({ records });
  },
}));
