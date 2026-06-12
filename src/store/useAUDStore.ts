import { create } from 'zustand';
import {
  fetchAUDRecords, saveAUDRecords, saveAUDRate, saveAUDInterestRecords,
} from '../supabase/db';
import type { AUDRecord, AUDInterestRecord } from '../types';

interface AUDState {
  records: AUDRecord[];
  rate: number;
  interestRecords: AUDInterestRecord[];
  loading: boolean;
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

  loadRecords: async (userId, year) => {
    set({ loading: true });
    const { records, rate, interestRecords } = await fetchAUDRecords(userId, year);
    set({ records, rate, interestRecords, loading: false });
  },

  addRecord: async (userId, year, record) => {
    const id = record.id || `au${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const records = [...get().records, { ...record, id }];
    await saveAUDRecords(userId, year, records);
    set({ records });
  },

  deleteRecord: async (userId, year, id) => {
    const records = get().records.filter((r) => r.id !== id);
    await saveAUDRecords(userId, year, records);
    set({ records });
  },

  setRate: async (userId, year, rate) => {
    await saveAUDRate(userId, year, rate);
    set({ rate });
  },

  addInterest: async (userId, year, record) => {
    const id = record.id || `ai${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const interestRecords = [...get().interestRecords, { ...record, id }];
    await saveAUDInterestRecords(userId, year, interestRecords);
    set({ interestRecords });
  },

  deleteInterest: async (userId, year, id) => {
    const interestRecords = get().interestRecords.filter((r) => r.id !== id);
    await saveAUDInterestRecords(userId, year, interestRecords);
    set({ interestRecords });
  },
}));
