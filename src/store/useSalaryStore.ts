import { create } from 'zustand';
import { deleteSalaryRecord, fetchSalaryRecords, upsertSalaryRecord } from '../supabase/db';
import type { SalaryRecord } from '../types';

interface SalaryState {
  records: SalaryRecord[];
  loading: boolean;
  loadedKey: string | null;
  loadingKey: string | null;
  loadRecords: (userId: string, year: number) => Promise<void>;
  addRecord: (userId: string, year: number, record: SalaryRecord) => Promise<void>;
  updateRecord: (userId: string, year: number, id: string, updates: Partial<SalaryRecord>) => Promise<void>;
  deleteRecord: (userId: string, year: number, id: string) => Promise<void>;
}

export const useSalaryStore = create<SalaryState>((set, get) => ({
  records: [],
  loading: true,
  loadedKey: null,
  loadingKey: null,

  loadRecords: async (userId, year) => {
    const key = `${userId}:${year}`;
    if (get().loadedKey === key) return;
    set({ loading: true, loadingKey: key });
    try {
      const records = await fetchSalaryRecords(userId, year);
      if (get().loadingKey === key) set({ records, loadedKey: key });
    } finally {
      if (get().loadingKey === key) set({ loading: false });
    }
  },

  addRecord: async (userId, year, record) => {
    const id = record.id || `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const saved = { ...record, id };
    const records = [...get().records.filter((item) => item.id !== id), saved]
      .sort((a, b) => a.month - b.month);
    await upsertSalaryRecord(userId, year, saved);
    set({ records });
  },

  updateRecord: async (userId, year, id, updates) => {
    const records = get().records.map((r) => r.id === id ? { ...r, ...updates } : r);
    const saved = records.find((record) => record.id === id);
    if (!saved) throw new Error('工资记录不存在');
    await upsertSalaryRecord(userId, year, saved);
    set({ records });
  },

  deleteRecord: async (userId, year, id) => {
    const records = get().records.filter((r) => r.id !== id);
    await deleteSalaryRecord(userId, year, id);
    set({ records });
  },
}));
