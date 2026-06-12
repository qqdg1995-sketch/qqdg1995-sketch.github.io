import { create } from 'zustand';
import { fetchBonusRecords, saveBonusRecords } from '../supabase/db';
import type { BonusRecord } from '../types';

interface BonusState {
  records: BonusRecord[];
  loading: boolean;
  loadRecords: (userId: string, year: number) => Promise<void>;
  addRecord: (userId: string, year: number, record: BonusRecord) => Promise<void>;
  deleteRecord: (userId: string, year: number, id: string) => Promise<void>;
}

export const useBonusStore = create<BonusState>((set, get) => ({
  records: [],
  loading: true,

  loadRecords: async (userId, year) => {
    set({ loading: true });
    const records = await fetchBonusRecords(userId, year);
    set({ records, loading: false });
  },

  addRecord: async (userId, year, record) => {
    const id = record.id || `bo${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const records = [...get().records, { ...record, id }];
    await saveBonusRecords(userId, year, records);
    set({ records });
  },

  deleteRecord: async (userId, year, id) => {
    const records = get().records.filter((r) => r.id !== id);
    await saveBonusRecords(userId, year, records);
    set({ records });
  },
}));
