import { create } from 'zustand';
import { fetchParentRecords, saveParentRecords } from '../supabase/db';
import type { ParentRecord } from '../types';

interface ParentState {
  records: ParentRecord[];
  loading: boolean;
  loadRecords: (userId: string, year: number) => Promise<void>;
  addRecord: (userId: string, year: number, record: ParentRecord) => Promise<void>;
  deleteRecord: (userId: string, year: number, id: string) => Promise<void>;
}

export const useParentStore = create<ParentState>((set, get) => ({
  records: [],
  loading: true,

  loadRecords: async (userId, year) => {
    set({ loading: true });
    const records = await fetchParentRecords(userId, year);
    set({ records, loading: false });
  },

  addRecord: async (userId, year, record) => {
    const id = record.id || `pa${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const records = [...get().records, { ...record, id }];
    await saveParentRecords(userId, year, records);
    set({ records });
  },

  deleteRecord: async (userId, year, id) => {
    const records = get().records.filter((r) => r.id !== id);
    await saveParentRecords(userId, year, records);
    set({ records });
  },
}));
