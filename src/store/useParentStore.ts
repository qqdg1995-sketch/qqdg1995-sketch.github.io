import { create } from 'zustand';
import { deleteParentRecord, fetchParentRecords, upsertParentRecord } from '../supabase/db';
import type { ParentRecord } from '../types';

interface ParentState {
  records: ParentRecord[];
  loading: boolean;
  loadedKey: string | null;
  loadingKey: string | null;
  loadRecords: (userId: string, year: number) => Promise<void>;
  addRecord: (userId: string, year: number, record: ParentRecord) => Promise<void>;
  deleteRecord: (userId: string, year: number, id: string) => Promise<void>;
}

export const useParentStore = create<ParentState>((set, get) => ({
  records: [],
  loading: true,
  loadedKey: null,
  loadingKey: null,

  loadRecords: async (userId, year) => {
    const key = `${userId}:${year}`;
    if (get().loadedKey === key) return;
    set({ loading: true, loadingKey: key });
    try {
      const records = await fetchParentRecords(userId, year);
      if (get().loadingKey === key) set({ records, loadedKey: key });
    } finally {
      if (get().loadingKey === key) set({ loading: false });
    }
  },

  addRecord: async (userId, year, record) => {
    const id = record.id || `pa${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const saved = { ...record, id };
    const records = [...get().records.filter((item) => item.id !== id), saved]
      .sort((a, b) => a.date.localeCompare(b.date));
    await upsertParentRecord(userId, year, saved);
    set({ records });
  },

  deleteRecord: async (userId, year, id) => {
    const records = get().records.filter((r) => r.id !== id);
    await deleteParentRecord(userId, year, id);
    set({ records });
  },
}));
