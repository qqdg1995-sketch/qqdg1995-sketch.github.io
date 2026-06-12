import { create } from 'zustand';
import { fetchSalaryRecords, saveSalaryRecords } from '../supabase/db';
import type { SalaryRecord } from '../types';

interface SalaryState {
  records: SalaryRecord[];
  loading: boolean;
  loadRecords: (userId: string, year: number) => Promise<void>;
  addRecord: (userId: string, year: number, record: SalaryRecord) => Promise<void>;
  updateRecord: (userId: string, year: number, id: string, updates: Partial<SalaryRecord>) => Promise<void>;
  deleteRecord: (userId: string, year: number, id: string) => Promise<void>;
}

export const useSalaryStore = create<SalaryState>((set, get) => ({
  records: [],
  loading: true,

  loadRecords: async (userId, year) => {
    set({ loading: true });
    const records = await fetchSalaryRecords(userId, year);
    set({ records, loading: false });
  },

  addRecord: async (userId, year, record) => {
    const id = record.id || `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const records = [...get().records, { ...record, id }];
    await saveSalaryRecords(userId, year, records);
    set({ records });
  },

  updateRecord: async (userId, year, id, updates) => {
    const records = get().records.map((r) => r.id === id ? { ...r, ...updates } : r);
    await saveSalaryRecords(userId, year, records);
    set({ records });
  },

  deleteRecord: async (userId, year, id) => {
    const records = get().records.filter((r) => r.id !== id);
    await saveSalaryRecords(userId, year, records);
    set({ records });
  },
}));
