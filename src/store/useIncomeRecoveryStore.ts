import { create } from 'zustand';
import { deleteIncomeRecoveryRecord, fetchIncomeRecoveryRecords, upsertIncomeRecoveryRecord } from '../supabase/db';
import type { IncomeRecoveryRecord } from '../types';

interface IncomeRecoveryState {
  records: IncomeRecoveryRecord[];
  loading: boolean;
  loadedKey: string | null;
  loadingKey: string | null;
  loadRecords: (userId: string, year: number) => Promise<void>;
  addRecord: (userId: string, year: number, record: IncomeRecoveryRecord) => Promise<void>;
  deleteRecord: (userId: string, year: number, id: string) => Promise<void>;
}

export const useIncomeRecoveryStore = create<IncomeRecoveryState>((set, get) => ({
  records: [],
  loading: true,
  loadedKey: null,
  loadingKey: null,

  loadRecords: async (userId, year) => {
    const key = `${userId}:${year}`;
    if (get().loadedKey === key) return;
    set({ loading: true, loadingKey: key });
    try {
      const records = await fetchIncomeRecoveryRecords(userId, year);
      if (get().loadingKey === key) set({ records, loadedKey: key });
    } finally {
      if (get().loadingKey === key) set({ loading: false });
    }
  },

  addRecord: async (userId, year, record) => {
    const id = record.id || `ir${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const saved = { ...record, id };
    const records = [...get().records.filter((item) => item.id !== id), saved]
      .sort((a, b) => b.date.localeCompare(a.date));
    await upsertIncomeRecoveryRecord(userId, year, saved);
    set({ records });
  },

  deleteRecord: async (userId, year, id) => {
    const records = get().records.filter((r) => r.id !== id);
    await deleteIncomeRecoveryRecord(userId, year, id);
    set({ records });
  },
}));
