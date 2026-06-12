// ==================== 年度管理 ====================
export interface YearBook {
  year: number;
  name?: string;
}

// ==================== 模块一：每月工资单 ====================
export interface SalaryRecord {
  id: string;
  month: number;
  salary: number;
  expense: number;
}

// ==================== 模块二：日元理财 ====================
export interface JPYRecord {
  id: string;
  date: string;
  type: 'buy' | 'sell';
  amount: number;
  rate: number;
  rmb: number;
}

// ==================== 模块三：澳元理财 ====================
export interface AUDRecord {
  id: string;
  date: string;
  type: 'buy' | 'sell';
  amount: number;
  rate: number;
  rmb: number;
}

export interface AUDInterestRecord {
  id: string;
  date: string;
  amount: number;
  note: string;
}

// ==================== 模块四：黄金理财（黄金基金）====================
export interface GoldRecord {
  id: string;
  date: string;
  type: 'buy' | 'sell';
  shares: number;   // 份额（基金份数）
  nav: number;       // 买入/卖出时净值（单价）
  amount: number;    // 总金额 = shares × nav
}

// ==================== 模块五：爸妈援助 ====================
export interface ParentRecord {
  id: string;
  date: string;
  type: 'save' | 'spend';
  amount: number;
  note: string;
}

// ==================== 模块六：奖金收入 ====================
export interface BonusRecord {
  id: string;
  date: string;
  amount: number;
  note: string;
}

// ==================== 模块七：大额消费 ====================
export interface BigExpenseRecord {
  id: string;
  date: string;
  category: string;
  amount: number;
  note: string;
}

// ==================== 模块七附：收入回血 ====================
export interface IncomeRecoveryRecord {
  id: string;
  date: string;
  category: string;
  amount: number;
  note: string;
}

// ==================== 模块八：股票投资 ====================
export interface StockPortfolio {
  id: string;
  name: string;
  totalInvest: number;
}

export interface StockRecord {
  id: string;
  portfolioId: string;
  date: string;
  type: 'buy' | 'sell';
  stockName: string;
  shares: number;
  unitPrice: number;
  totalCost: number;
  profit?: number;
}
