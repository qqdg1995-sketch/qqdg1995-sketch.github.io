import { create } from 'zustand';
import { deleteJPYRecord, fetchJPYRecords, saveJPYRate, upsertJPYRecord } from '../supabase/db';
import type { JPYRecord } from '../types';

interface JPYState {
  records: JPYRecord[];
  rate: number;
  loading: boolean;
  loadedKey: string | null;
  loadingKey: string | null;
  loadRecords: (userId: string, year: number) => Promise<void>;
  addRecord: (userId: string, year: number, record: JPYRecord) => Promise<void>;
  deleteRecord: (userId: string, year: number, id: string) => Promise<void>;
  setRate: (userId: string, year: number, rate: number) => Promise<void>;
}

export const useJPYStore = create<JPYState>((set, get) => ({
  records: [],
  rate: 4.8,
  loading: true,
  loadedKey: null,
  loadingKey: null,

  loadRecords: async (userId, year) => {
    const key = `${userId}:${year}`;
    if (get().loadedKey === key) return;
    set({ loading: true, loadingKey: key });
    try {
      const { records, rate } = await fetchJPYRecords(userId, year);
      if (get().loadingKey === key) set({ records, rate, loadedKey: key });
    } finally {
      if (get().loadingKey === key) set({ loading: false });
    }
  },

  addRecord: async (userId, year, record) => {
    const id = record.id || `jp${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const saved = { ...record, id };
    const records = [...get().records.filter((item) => item.id !== id), saved]
      .sort((a, b) => a.date.localeCompare(b.date));
    await upsertJPYRecord(userId, year, saved);
    set({ records });
  },

  deleteRecord: async (userId, year, id) => {
    const records = get().records.filter((r) => r.id !== id);
    await deleteJPYRecord(userId, year, id);
    set({ records });
  },

  setRate: async (userId, year, rate) => {
    await saveJPYRate(userId, year, rate);
    set({ rate });
  },
}));
