import { create } from 'zustand';
import {
  deleteStockPortfolio, deleteStockRecord, fetchStockPortfolios, fetchStockRecords,
  upsertStockPortfolio, upsertStockRecord,
} from '../supabase/db';
import type { StockPortfolio, StockRecord } from '../types';
import { calculateAverageCost } from '../utils/finance';

interface StockState {
  portfolios: StockPortfolio[];
  records: StockRecord[];
  loadedPortfolioKey: string | null;
  loadedRecordKey: string | null;
  requestedPortfolioKey: string | null;
  requestedRecordKey: string | null;
  loadPortfolios: (userId: string, year: number) => Promise<void>;
  loadRecords: (userId: string, year: number) => Promise<void>;
  addPortfolio: (userId: string, year: number, portfolio: Omit<StockPortfolio, 'id'>) => Promise<{ success: boolean; error?: string }>;
  updatePortfolio: (userId: string, year: number, id: string, data: Partial<StockPortfolio>) => Promise<void>;
  deletePortfolio: (userId: string, year: number, id: string) => Promise<void>;
  addRecord: (userId: string, year: number, record: Omit<StockRecord, 'id'>) => Promise<{ success: boolean; error?: string }>;
  updateRecord: (userId: string, year: number, id: string, data: Partial<StockRecord>) => Promise<void>;
  deleteRecord: (userId: string, year: number, id: string) => Promise<void>;
  getHoldingMap: (portfolioId: string) => Record<string, { shares: number; totalCost: number; avgPrice: number }>;
  calculateSellProfit: (portfolioId: string, stockName: string, sellShares: number, sellUnitPrice: number) => {
    profit: number; costBasis: number; sellRevenue: number;
  } | { error: string };
  getPortfolioStats: (portfolioId: string) => {
    totalInvest: number; totalBuyCost: number; totalSellRevenue: number;
    recoveredProfit: number; holdingCost: number; idleFunds: number;
  };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export const useStockStore = create<StockState>((set, get) => ({
  portfolios: [],
  records: [],
  loadedPortfolioKey: null,
  loadedRecordKey: null,
  requestedPortfolioKey: null,
  requestedRecordKey: null,

  loadPortfolios: async (userId, year) => {
    const key = `${userId}:${year}`;
    if (get().loadedPortfolioKey === key) return;
    set({ requestedPortfolioKey: key });
    const portfolios = await fetchStockPortfolios(userId, year);
    if (get().requestedPortfolioKey === key) set({ portfolios, loadedPortfolioKey: key });
  },

  loadRecords: async (userId, year) => {
    const key = `${userId}:${year}`;
    if (get().loadedRecordKey === key) return;
    set({ requestedRecordKey: key });
    const records = await fetchStockRecords(userId, year);
    if (get().requestedRecordKey === key) set({ records, loadedRecordKey: key });
  },

  addPortfolio: async (userId, year, portfolio) => {
    const { portfolios } = get();
    // Check for duplicate name
    if (portfolios.some((p) => p.name === portfolio.name)) {
      return { success: false, error: '账户名称已存在' };
    }
    const newPF: StockPortfolio = { ...portfolio, id: generateId() };
    const updated = [...portfolios, newPF];
    await upsertStockPortfolio(userId, year, newPF);
    set({ portfolios: updated });
    return { success: true };
  },

  updatePortfolio: async (userId, year, id, data) => {
    const { portfolios } = get();
    const updated = portfolios.map((p) => (p.id === id ? { ...p, ...data } : p));
    const saved = updated.find((portfolio) => portfolio.id === id);
    if (!saved) throw new Error('股票账户不存在');
    await upsertStockPortfolio(userId, year, saved);
    set({ portfolios: updated });
  },

  deletePortfolio: async (userId, year, id) => {
    const { portfolios, records } = get();
    const updated = portfolios.filter((p) => p.id !== id);
    const newRecords = records.filter((r) => r.portfolioId !== id);
    await deleteStockPortfolio(userId, year, id);
    set({ portfolios: updated, records: newRecords });
  },

  addRecord: async (userId, year, record) => {
    const { portfolios, records } = get();
    const pf = portfolios.find((p) => p.id === record.portfolioId);
    if (!pf) return { success: false, error: '账户不存在' };

    if (record.type === 'buy') {
      const pfRecords = records.filter((r) => r.portfolioId === record.portfolioId);
      const existingBuyCost = pfRecords.filter((r) => r.type === 'buy').reduce((s, r) => s + r.totalCost, 0);
      const sellRevenue = pfRecords.filter((r) => r.type === 'sell').reduce((s, r) => s + r.totalCost, 0);
      const available = pf.totalInvest + sellRevenue - existingBuyCost;
      if (record.totalCost > available) {
        return {
          success: false,
          error: `⚠️ 超过可用资金！当前可用 ¥${available.toLocaleString()}`,
        };
      }
    }

    const newRecord: StockRecord = { ...record, id: generateId() };
    const updated = [...records, newRecord].sort((a, b) => a.date.localeCompare(b.date));
    await upsertStockRecord(userId, year, newRecord);
    set({ records: updated });
    return { success: true };
  },

  updateRecord: async (userId, year, id, data) => {
    const { records } = get();
    const updated = records.map((r) => (r.id === id ? { ...r, ...data } : r));
    const saved = updated.find((record) => record.id === id);
    if (!saved) throw new Error('股票记录不存在');
    await upsertStockRecord(userId, year, saved);
    set({ records: updated });
  },

  deleteRecord: async (userId, year, id) => {
    const { records } = get();
    const updated = records.filter((r) => r.id !== id);
    await deleteStockRecord(userId, year, id);
    set({ records: updated });
  },

  getHoldingMap: (portfolioId) => {
    const { records } = get();
    const result: Record<string, { shares: number; totalCost: number; avgPrice: number }> = {};
    const names = [...new Set(records
      .filter((record) => record.portfolioId === portfolioId)
      .map((record) => record.stockName))];

    for (const name of names) {
      const stockRecords = records
        .filter((record) => record.portfolioId === portfolioId && record.stockName === name)
        .map((record) => ({
          date: record.date,
          type: record.type,
          quantity: record.shares,
          value: record.totalCost,
        }));
      const position = calculateAverageCost(stockRecords);
      if (position.holding > 0) {
        result[name] = {
          shares: position.holding,
          totalCost: position.costBasis,
          avgPrice: position.costBasis / position.holding,
        };
      }
    }
    return result;
  },

  calculateSellProfit: (portfolioId, stockName, sellShares, sellUnitPrice) => {
    const holdingMap = get().getHoldingMap(portfolioId);
    const holding = holdingMap[stockName];

    if (!holding || holding.shares <= 0) {
      return { error: `⚠️ 当前未持有 "${stockName}" 股票` };
    }
    if (sellShares > holding.shares) {
      return { error: `⚠️ 卖出份额超过持仓！当前 "${stockName}" 仅持有 ${holding.shares} 股` };
    }

    const costBasis = sellShares * holding.avgPrice;
    const sellRevenue = sellShares * sellUnitPrice;
    const profit = sellRevenue - costBasis;
    return { profit, costBasis, sellRevenue };
  },

  getPortfolioStats: (portfolioId) => {
    const { portfolios, records } = get();
    const pf = portfolios.find((p) => p.id === portfolioId);
    const totalInvest = pf?.totalInvest || 0;
    const pfRecords = records.filter((r) => r.portfolioId === portfolioId);

    let totalBuyCost = 0;
    let totalSellRevenue = 0;
    let recoveredProfit = 0;
    for (const r of pfRecords) {
      if (r.type === 'buy') totalBuyCost += r.totalCost;
      else if (r.type === 'sell') {
        totalSellRevenue += r.totalCost;
        recoveredProfit += r.profit || 0;
      }
    }

    const holdingMap = get().getHoldingMap(portfolioId);
    let holdingCost = 0;
    for (const [, data] of Object.entries(holdingMap)) {
      holdingCost += data.totalCost;
    }
    const idleFunds = Math.max(0, totalInvest + recoveredProfit - holdingCost);

    return { totalInvest, totalBuyCost, totalSellRevenue, recoveredProfit, holdingCost, idleFunds };
  },
}));
