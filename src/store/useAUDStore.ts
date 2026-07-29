import { create } from 'zustand';
import {
  deleteAUDInterestRecord, deleteAUDRecord, fetchAUDRecords, saveAUDRate,
  upsertAUDInterestRecord, upsertAUDRecord,
} from '../supabase/db';
import type { AUDRecord, AUDInterestRecord } from '../types';

interface AUDState {
  records: AUDRecord[];
  rate: number;
  interestRecords: AUDInterestRecord[];
  loading: boolean;
  loadedKey: string | null;
  loadingKey: string | null;
  loadRecords: (userId: string, year: number) => Promise<void>;
  addRecord: (userId: string, year: number, record: AUDRecord) => Promise<void>;
  deleteRecord: (userId: string, year: number, id: string) => Promise<void>;
  setRate: (userId: string, year: number, rate: number) => Promise<void>;
  addInterest: (userId: string, year: number, record: AUDInterestRecord) => Promise<void>;
  deleteInterest: (userId: string, year: number, id: string) => Promise<void>;
}

export const useAUDStore = create<AUDState>((set, get) => ({
  records: [],
  rate: 4.7,
  interestRecords: [],
  loading: true,
  loadedKey: null,
  loadingKey: null,

  loadRecords: async (userId, year) => {
    const key = `${userId}:${year}`;
    if (get().loadedKey === key) return;
    set({ loading: true, loadingKey: key });
    try {
      const { records, rate, interestRecords } = await fetchAUDRecords(userId, year);
      if (get().loadingKey === key) set({ records, rate, interestRecords, loadedKey: key });
    } finally {
      if (get().loadingKey === key) set({ loading: false });
    }
  },

  addRecord: async (userId, year, record) => {
    const id = record.id || `au${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const saved = { ...record, id };
    const records = [...get().records.filter((item) => item.id !== id), saved]
      .sort((a, b) => a.date.localeCompare(b.date));
    await upsertAUDRecord(userId, year, saved);
    set({ records });
  },

  deleteRecord: async (userId, year, id) => {
    const records = get().records.filter((r) => r.id !== id);
    await deleteAUDRecord(userId, year, id);
    set({ records });
  },

  setRate: async (userId, year, rate) => {
    await saveAUDRate(userId, year, rate);
    set({ rate });
  },

  addInterest: async (userId, year, record) => {
    const id = record.id || `ai${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const saved = { ...record, id };
    const interestRecords = [...get().interestRecords.filter((item) => item.id !== id), saved]
      .sort((a, b) => a.date.localeCompare(b.date));
    await upsertAUDInterestRecord(userId, year, saved);
    set({ interestRecords });
  },

  deleteInterest: async (userId, year, id) => {
    const interestRecords = get().interestRecords.filter((r) => r.id !== id);
    await deleteAUDInterestRecord(userId, year, id);
    set({ interestRecords });
  },
}));
