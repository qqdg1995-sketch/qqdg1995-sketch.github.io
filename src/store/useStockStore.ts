import { create } from 'zustand';
import { fetchStockPortfolios, fetchStockRecords, saveStockPortfolios, saveStockRecords } from '../supabase/db';
import type { StockPortfolio, StockRecord } from '../types';

interface StockState {
  portfolios: StockPortfolio[];
  records: StockRecord[];
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

  loadPortfolios: async (userId, year) => {
    const portfolios = await fetchStockPortfolios(userId, year);
    set({ portfolios });
  },

  loadRecords: async (userId, year) => {
    const records = await fetchStockRecords(userId, year);
    set({ records });
  },

  addPortfolio: async (userId, year, portfolio) => {
    const { portfolios } = get();
    // Check for duplicate name
    if (portfolios.some((p) => p.name === portfolio.name)) {
      return { success: false, error: '账户名称已存在' };
    }
    const newPF: StockPortfolio = { ...portfolio, id: generateId() };
    const updated = [...portfolios, newPF];
    await saveStockPortfolios(userId, year, updated);
    set({ portfolios: updated });
    return { success: true };
  },

  updatePortfolio: async (userId, year, id, data) => {
    const { portfolios } = get();
    const updated = portfolios.map((p) => (p.id === id ? { ...p, ...data } : p));
    await saveStockPortfolios(userId, year, updated);
    set({ portfolios: updated });
  },

  deletePortfolio: async (userId, year, id) => {
    const { portfolios, records } = get();
    const updated = portfolios.filter((p) => p.id !== id);
    const newRecords = records.filter((r) => r.portfolioId !== id);
    await saveStockPortfolios(userId, year, updated);
    await saveStockRecords(userId, year, newRecords);
    set({ portfolios: updated, records: newRecords });
  },

  addRecord: async (userId, year, record) => {
    const { portfolios, records } = get();
    const pf = portfolios.find((p) => p.id === record.portfolioId);
    if (!pf) return { success: false, error: '账户不存在' };

    if (record.type === 'buy') {
      const pfRecords = records.filter((r) => r.portfolioId === record.portfolioId);
      const existingBuyCost = pfRecords.filter((r) => r.type === 'buy').reduce((s, r) => s + r.totalCost, 0);
      if (existingBuyCost + record.totalCost > pf.totalInvest) {
        const remaining = pf.totalInvest - existingBuyCost;
        return {
          success: false,
          error: `⚠️ 超过总投资金额！当前已买入 ¥${existingBuyCost.toLocaleString()}，剩余可用 ¥${remaining.toLocaleString()}`,
        };
      }
    }

    const newRecord: StockRecord = { ...record, id: generateId() };
    const updated = [...records, newRecord].sort((a, b) => b.date.localeCompare(a.date));
    await saveStockRecords(userId, year, updated);
    set({ records: updated });
    return { success: true };
  },

  updateRecord: async (userId, year, id, data) => {
    const { records } = get();
    const updated = records.map((r) => (r.id === id ? { ...r, ...data } : r));
    await saveStockRecords(userId, year, updated);
    set({ records: updated });
  },

  deleteRecord: async (userId, year, id) => {
    const { records } = get();
    const updated = records.filter((r) => r.id !== id);
    await saveStockRecords(userId, year, updated);
    set({ records: updated });
  },

  getHoldingMap: (portfolioId) => {
    const { records } = get();
    const pfRecords = records.filter((r) => r.portfolioId === portfolioId);

    const holdingMap: Record<string, { shares: number; totalCost: number }> = {};
    for (const r of pfRecords) {
      if (!holdingMap[r.stockName]) holdingMap[r.stockName] = { shares: 0, totalCost: 0 };
      if (r.type === 'buy') {
        holdingMap[r.stockName].shares += r.shares;
        holdingMap[r.stockName].totalCost += r.totalCost;
      } else if (r.type === 'sell') {
        const beforeRecords = pfRecords.filter((x) => x.date < r.date || (x.date === r.date && x.type === 'buy'));
        const beforeBuys = beforeRecords.filter((x) => x.type === 'buy' && x.stockName === r.stockName);
        const beforeSells = beforeRecords.filter((x) => x.type === 'sell' && x.stockName === r.stockName);
        const totalBought = beforeBuys.reduce((s, x) => s + x.shares, 0);
        const totalSoldBefore = beforeSells.reduce((s, x) => s + x.shares, 0);
        const availShares = totalBought - totalSoldBefore;
        const sharesToSell = Math.min(r.shares, availShares);
        holdingMap[r.stockName].shares -= sharesToSell;
        if (holdingMap[r.stockName].shares > 0 && holdingMap[r.stockName].totalCost > 0 && totalBought > 0) {
          const avgCost = beforeBuys.reduce((s, x) => s + x.totalCost, 0) / totalBought;
          holdingMap[r.stockName].totalCost -= avgCost * sharesToSell;
        } else {
          holdingMap[r.stockName].totalCost = Math.max(0, holdingMap[r.stockName].totalCost);
        }
      }
    }

    const result: Record<string, { shares: number; totalCost: number; avgPrice: number }> = {};
    for (const [name, data] of Object.entries(holdingMap)) {
      if (data.shares > 0) {
        result[name] = { shares: data.shares, totalCost: data.totalCost, avgPrice: data.totalCost / data.shares };
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
    let recoveredProfit = 0;
    for (const r of pfRecords) {
      if (r.type === 'buy') totalBuyCost += r.totalCost;
      else if (r.type === 'sell') recoveredProfit += r.profit || 0;
    }

    const holdingMap = get().getHoldingMap(portfolioId);
    let holdingCost = 0;
    for (const [, data] of Object.entries(holdingMap)) {
      holdingCost += data.totalCost;
    }
    const idleFunds = Math.max(0, totalInvest - holdingCost);

    return { totalInvest, totalBuyCost, totalSellRevenue: 0, recoveredProfit, holdingCost, idleFunds };
  },
}));
