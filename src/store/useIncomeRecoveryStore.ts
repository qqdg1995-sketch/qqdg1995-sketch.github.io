import { create } from 'zustand';
import { fetchIncomeRecoveryRecords, saveIncomeRecoveryRecords } from '../supabase/db';
import type { IncomeRecoveryRecord } from '../types';

interface IncomeRecoveryState {
  records: IncomeRecoveryRecord[];
  loading: boolean;
  loadRecords: (userId: string, year: number) => Promise<void>;
  addRecord: (userId: string, year: number, record: IncomeRecoveryRecord) => Promise<void>;
  deleteRecord: (userId: string, year: number, id: string) => Promise<void>;
}

export const useIncomeRecoveryStore = create<IncomeRecoveryState>((set, get) => ({
  records: [],
  loading: true,

  loadRecords: async (userId, year) => {
    set({ loading: true });
    const records = await fetchIncomeRecoveryRecords(userId, year);
    set({ records, loading: false });
  },

  addRecord: async (userId, year, record) => {
    const id = record.id || `ir${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const records = [...get().records, { ...record, id }];
    await saveIncomeRecoveryRecords(userId, year, records);
    set({ records });
  },

  deleteRecord: async (userId, year, id) => {
    const records = get().records.filter((r) => r.id !== id);
    await saveIncomeRecoveryRecords(userId, year, records);
    set({ records });
  },
}));
