import { supabase } from './client';
import type {
  YearBook, SalaryRecord, JPYRecord, AUDRecord, AUDInterestRecord,
  GoldRecord, BonusRecord, BigExpenseRecord, IncomeRecoveryRecord, ParentRecord, StockPortfolio, StockRecord,
} from '../types';

// ─── Year Books ─────────────────────────────────────
export async function fetchYears(userId: string): Promise<YearBook[]> {
  const { data } = await supabase
    .from('years')
    .select('*')
    .eq('user_id', userId)
    .order('year', { ascending: false });
  return (data || []).map((r: any) => ({ year: r.year, name: r.name }));
}

export async function createYear(userId: string, year: number, name?: string): Promise<void> {
  await supabase.from('years').upsert({
    user_id: userId,
    year,
    name: name || `${year}年度账本`,
  }, { onConflict: 'user_id,year' });
}

// ─── Salary Records ──────────────────────────────────
export async function fetchSalaryRecords(userId: string, year: number): Promise<SalaryRecord[]> {
  const { data } = await supabase
    .from('salary_records')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year)
    .order('month', { ascending: true });
  return (data || []).map((r: any) => ({
    id: r.rec_id,
    month: r.month,
    salary: r.salary,
    expense: r.expense,
  }));
}

export async function saveSalaryRecords(userId: string, year: number, records: SalaryRecord[]): Promise<void> {
  const rows = records.map((r) => ({
    user_id: userId,
    year,
    rec_id: r.id,
    month: r.month,
    salary: r.salary,
    expense: r.expense,
  }));
  await supabase.from('salary_records').delete().eq('user_id', userId).eq('year', year);
  if (rows.length > 0) await supabase.from('salary_records').insert(rows);
}

// ─── JPY Records ─────────────────────────────────────
export async function fetchJPYRecords(userId: string, year: number): Promise<{ records: JPYRecord[]; rate: number }> {
  const [recs, cfg] = await Promise.all([
    supabase.from('jpy_records').select('*').eq('user_id', userId).eq('year', year).order('date', { ascending: true }),
    supabase.from('settings').select('value').eq('user_id', userId).eq('key', `jpy_rate_${year}`).single(),
  ]);
  const records = (recs.data || []).map((r: any) => ({
    id: r.rec_id,
    date: r.date,
    type: r.type,
    amount: r.amount,
    rate: r.rate,
    rmb: r.rmb,
  }));
  return { records, rate: cfg.data?.value || 4.8 };
}

export async function saveJPYRecords(userId: string, year: number, records: JPYRecord[]): Promise<void> {
  const rows = records.map((r) => ({
    user_id: userId, year, rec_id: r.id, date: r.date,
    type: r.type, amount: r.amount, rate: r.rate, rmb: r.rmb,
  }));
  await supabase.from('jpy_records').delete().eq('user_id', userId).eq('year', year);
  if (rows.length > 0) await supabase.from('jpy_records').insert(rows);
}

export async function saveJPYRate(userId: string, year: number, rate: number): Promise<void> {
  await supabase.from('settings').upsert({
    user_id: userId, key: `jpy_rate_${year}`, value: rate,
  }, { onConflict: 'user_id,key' });
}

// ─── AUD Records ─────────────────────────────────────
export async function fetchAUDRecords(userId: string, year: number): Promise<{
  records: AUDRecord[]; rate: number; interestRecords: AUDInterestRecord[];
}> {
  const [recs, cfg, ints] = await Promise.all([
    supabase.from('aud_records').select('*').eq('user_id', userId).eq('year', year).order('date', { ascending: true }),
    supabase.from('settings').select('value').eq('user_id', userId).eq('key', `aud_rate_${year}`).single(),
    supabase.from('aud_interest_records').select('*').eq('user_id', userId).eq('year', year).order('date', { ascending: true }),
  ]);
  const records = (recs.data || []).map((r: any) => ({
    id: r.rec_id, date: r.date, type: r.type, amount: r.amount, rate: r.rate, rmb: r.rmb,
  }));
  const interestRecords = (ints.data || []).map((r: any) => ({
    id: r.rec_id, date: r.date, amount: r.amount, note: r.note,
  }));
  return { records, rate: cfg.data?.value || 4.7, interestRecords };
}

export async function saveAUDRecords(userId: string, year: number, records: AUDRecord[]): Promise<void> {
  const rows = records.map((r) => ({
    user_id: userId, year, rec_id: r.id, date: r.date,
    type: r.type, amount: r.amount, rate: r.rate, rmb: r.rmb,
  }));
  await supabase.from('aud_records').delete().eq('user_id', userId).eq('year', year);
  if (rows.length > 0) await supabase.from('aud_records').insert(rows);
}

export async function saveAUDRate(userId: string, year: number, rate: number): Promise<void> {
  await supabase.from('settings').upsert({
    user_id: userId, key: `aud_rate_${year}`, value: rate,
  }, { onConflict: 'user_id,key' });
}

export async function saveAUDInterestRecords(userId: string, year: number, records: AUDInterestRecord[]): Promise<void> {
  const rows = records.map((r) => ({
    user_id: userId, year, rec_id: r.id, date: r.date, amount: r.amount, note: r.note,
  }));
  await supabase.from('aud_interest_records').delete().eq('user_id', userId).eq('year', year);
  if (rows.length > 0) await supabase.from('aud_interest_records').insert(rows);
}

// ─── Gold Records (黄金基金) ─────────────────────────
export async function fetchGoldRecords(userId: string, year: number): Promise<{ records: GoldRecord[]; rate: number }> {
  const [recs, cfg] = await Promise.all([
    supabase.from('gold_records').select('*').eq('user_id', userId).eq('year', year).order('date', { ascending: true }),
    supabase.from('settings').select('value').eq('user_id', userId).eq('key', `gold_rate_${year}`).single(),
  ]);
  const records = (recs.data || []).map((r: any) => ({
    id: r.rec_id, date: r.date, type: r.type, shares: r.shares, nav: r.nav, amount: r.amount,
  }));
  return { records, rate: cfg.data?.value || 1.0 };
}

export async function saveGoldRecords(userId: string, year: number, records: GoldRecord[]): Promise<void> {
  const rows = records.map((r) => ({
    user_id: userId, year, rec_id: r.id, date: r.date,
    type: r.type, shares: r.shares, nav: r.nav, amount: r.amount,
  }));
  await supabase.from('gold_records').delete().eq('user_id', userId).eq('year', year);
  if (rows.length > 0) await supabase.from('gold_records').insert(rows);
}

export async function saveGoldRate(userId: string, year: number, rate: number): Promise<void> {
  await supabase.from('settings').upsert({
    user_id: userId, key: `gold_rate_${year}`, value: rate,
  }, { onConflict: 'user_id,key' });
}

// ─── Bonus Records ──────────────────────────────────
export async function fetchBonusRecords(userId: string, year: number): Promise<BonusRecord[]> {
  const { data } = await supabase
    .from('bonus_records')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year)
    .order('date', { ascending: false });
  return (data || []).map((r: any) => ({
    id: r.rec_id, date: r.date, amount: r.amount, note: r.note,
  }));
}

export async function saveBonusRecords(userId: string, year: number, records: BonusRecord[]): Promise<void> {
  const rows = records.map((r) => ({
    user_id: userId, year, rec_id: r.id, date: r.date,
    amount: r.amount, note: r.note,
  }));
  await supabase.from('bonus_records').delete().eq('user_id', userId).eq('year', year);
  if (rows.length > 0) await supabase.from('bonus_records').insert(rows);
}

// ─── Big Expense Records ────────────────────────────
export async function fetchBigExpenseRecords(userId: string, year: number): Promise<BigExpenseRecord[]> {
  const { data } = await supabase
    .from('big_expense_records')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year)
    .order('date', { ascending: false });
  return (data || []).map((r: any) => ({
    id: r.rec_id, date: r.date, category: r.category, amount: r.amount, note: r.note,
  }));
}

export async function saveBigExpenseRecords(userId: string, year: number, records: BigExpenseRecord[]): Promise<void> {
  const rows = records.map((r) => ({
    user_id: userId, year, rec_id: r.id, date: r.date,
    category: r.category, amount: r.amount, note: r.note,
  }));
  await supabase.from('big_expense_records').delete().eq('user_id', userId).eq('year', year);
  if (rows.length > 0) await supabase.from('big_expense_records').insert(rows);
}

// ─── Income Recovery Records (收入回血) ──────────────
export async function fetchIncomeRecoveryRecords(userId: string, year: number): Promise<IncomeRecoveryRecord[]> {
  const { data } = await supabase
    .from('income_recovery_records')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year)
    .order('date', { ascending: false });
  return (data || []).map((r: any) => ({
    id: r.rec_id, date: r.date, category: r.category, amount: r.amount, note: r.note,
  }));
}

export async function saveIncomeRecoveryRecords(userId: string, year: number, records: IncomeRecoveryRecord[]): Promise<void> {
  const rows = records.map((r) => ({
    user_id: userId, year, rec_id: r.id, date: r.date,
    category: r.category, amount: r.amount, note: r.note,
  }));
  await supabase.from('income_recovery_records').delete().eq('user_id', userId).eq('year', year);
  if (rows.length > 0) await supabase.from('income_recovery_records').insert(rows);
}

// ─── Parent Records ──────────────────────────────────
export async function fetchParentRecords(userId: string, year: number): Promise<ParentRecord[]> {
  const { data } = await supabase
    .from('parent_records')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year)
    .order('date', { ascending: true });
  return (data || []).map((r: any) => ({
    id: r.rec_id, date: r.date, type: r.type, amount: r.amount, note: r.note,
  }));
}

export async function saveParentRecords(userId: string, year: number, records: ParentRecord[]): Promise<void> {
  const rows = records.map((r) => ({
    user_id: userId, year, rec_id: r.id, date: r.date,
    type: r.type, amount: r.amount, note: r.note,
  }));
  await supabase.from('parent_records').delete().eq('user_id', userId).eq('year', year);
  if (rows.length > 0) await supabase.from('parent_records').insert(rows);
}

// ─── Stock Portfolios ────────────────────────────────
export async function fetchStockPortfolios(userId: string, year: number): Promise<StockPortfolio[]> {
  const { data } = await supabase
    .from('stock_portfolios')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year);
  return (data || []).map((r: any) => ({ id: r.pf_id, name: r.name, totalInvest: r.total_invest }));
}

export async function saveStockPortfolios(userId: string, year: number, portfolios: StockPortfolio[]): Promise<void> {
  const rows = portfolios.map((p) => ({
    user_id: userId, year, pf_id: p.id, name: p.name, total_invest: p.totalInvest,
  }));
  await supabase.from('stock_portfolios').delete().eq('user_id', userId).eq('year', year);
  if (rows.length > 0) await supabase.from('stock_portfolios').insert(rows);
}

// ─── Stock Records ───────────────────────────────────
export async function fetchStockRecords(userId: string, year: number): Promise<StockRecord[]> {
  const { data } = await supabase
    .from('stock_records')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year)
    .order('date', { ascending: true });
  return (data || []).map((r: any) => ({
    id: r.rec_id, portfolioId: r.pf_id, date: r.date, type: r.type,
    stockName: r.stock_name, shares: r.shares, unitPrice: r.unit_price,
    totalCost: r.total_cost, profit: r.profit,
  }));
}

export async function saveStockRecords(userId: string, year: number, records: StockRecord[]): Promise<void> {
  const rows = records.map((r) => ({
    user_id: userId, year, rec_id: r.id, pf_id: r.portfolioId, date: r.date,
    type: r.type, stock_name: r.stockName, shares: r.shares,
    unit_price: r.unitPrice, total_cost: r.totalCost, profit: r.profit || null,
  }));
  await supabase.from('stock_records').delete().eq('user_id', userId).eq('year', year);
  if (rows.length > 0) await supabase.from('stock_records').insert(rows);
}

// ─── Previous Year Summary (computed from raw records) ─
export async function fetchPrevYearData(userId: string, year: number): Promise<Record<string, number>> {
  // Fetch ALL raw data for the previous year in parallel
  const [
    salaryRes, jpyRes, jpyRateRes, audRes, audRateRes, audIntRes,
    goldRes, _goldRateRes, bonusRes, bigExpenseRes, incomeRecoveryRes,
    parentRes, stockPfRes, stockRecRes,
  ] = await Promise.all([
    supabase.from('salary_records').select('*').eq('user_id', userId).eq('year', year),
    supabase.from('jpy_records').select('*').eq('user_id', userId).eq('year', year).order('date', { ascending: true }),
    supabase.from('settings').select('value').eq('user_id', userId).eq('key', `jpy_rate_${year}`).single(),
    supabase.from('aud_records').select('*').eq('user_id', userId).eq('year', year).order('date', { ascending: true }),
    supabase.from('settings').select('value').eq('user_id', userId).eq('key', `aud_rate_${year}`).single(),
    supabase.from('aud_interest_records').select('*').eq('user_id', userId).eq('year', year),
    supabase.from('gold_records').select('*').eq('user_id', userId).eq('year', year).order('date', { ascending: true }),
    supabase.from('settings').select('value').eq('user_id', userId).eq('key', `gold_rate_${year}`).single(),
    supabase.from('bonus_records').select('*').eq('user_id', userId).eq('year', year),
    supabase.from('big_expense_records').select('*').eq('user_id', userId).eq('year', year),
    supabase.from('income_recovery_records').select('*').eq('user_id', userId).eq('year', year),
    supabase.from('parent_records').select('*').eq('user_id', userId).eq('year', year).order('date', { ascending: true }),
    supabase.from('stock_portfolios').select('*').eq('user_id', userId).eq('year', year),
    supabase.from('stock_records').select('*').eq('user_id', userId).eq('year', year).order('date', { ascending: true }),
  ]);

  // --- 工资存款 ---
  const salaryDeposit = (salaryRes.data || []).reduce((s: number, r: any) => s + (r.salary || 0) - (r.expense || 0), 0);

  // --- 日元理财 ---
  const jpyRecords = (jpyRes.data || []).map((r: any) => ({ type: r.type, amount: r.amount, rmb: r.rmb }));
  const jpyRate = jpyRateRes.data?.value || 4.8;
  let jpyBuyCost = 0, jpySellRev = 0, jpyHold = 0;
  for (const r of jpyRecords) {
    if (r.type === 'buy') { jpyBuyCost += r.rmb; jpyHold += r.amount; }
    else { jpySellRev += r.rmb; jpyHold -= r.amount; }
  }
  const jpyProfit = jpyHold > 0
    ? jpySellRev + (jpyHold * jpyRate / 100) - jpyBuyCost
    : jpySellRev - jpyBuyCost;

  // --- 澳元理财 ---
  const audRecords = (audRes.data || []).map((r: any) => ({ type: r.type, amount: r.amount, rmb: r.rmb }));
  const audRate = audRateRes.data?.value || 4.7;
  let audBuyCost = 0, audSellRev = 0, audHold = 0;
  for (const r of audRecords) {
    if (r.type === 'buy') { audBuyCost += r.rmb; audHold += r.amount; }
    else { audSellRev += r.rmb; audHold -= r.amount; }
  }
  const audInterest = (audIntRes.data || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
  const audProfit = audHold > 0
    ? audSellRev + audInterest + (audHold * audRate / 100) - audBuyCost
    : audSellRev + audInterest - audBuyCost;

  // --- 黄金基金 ---
  const goldRecords = (goldRes.data || []).map((r: any) => ({ type: r.type, shares: r.shares, amount: r.amount }));
  let goldBuyShares = 0, goldBuyCostG = 0, goldSellShares = 0, goldSellRev = 0;
  for (const r of goldRecords) {
    if (r.type === 'buy') { goldBuyShares += r.shares; goldBuyCostG += r.amount; }
    else { goldSellShares += r.shares; goldSellRev += r.amount; }
  }
  let goldProfit = 0;
  if (goldSellShares > 0 && goldBuyShares > 0) {
    goldProfit = goldSellRev - ((goldBuyCostG / goldBuyShares) * goldSellShares);
  }

  // --- 奖金收入 ---
  const bonusIncome = (bonusRes.data || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);

  // --- 大额消费 ---
  const bigExpenseTotal = -(bigExpenseRes.data || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);

  // --- 收入回血 ---
  const incomeRecovery = (incomeRecoveryRes.data || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);

  // --- 爸妈援助 ---
  const parentRecords = (parentRes.data || []).map((r: any) => ({ type: r.type, amount: r.amount }));
  const parentRemaining = parentRecords.reduce((s: number, r: any) => s + (r.type === 'save' ? r.amount : -r.amount), 0);

  // --- 股票投资 ---
  const stockPortfolios = (stockPfRes.data || []).map((r: any) => ({ id: r.pf_id, name: r.name, totalInvest: r.total_invest }));
  const stockRecords = (stockRecRes.data || []).map((r: any) => ({
    portfolioId: r.pf_id, stockName: r.stock_name, type: r.type,
    shares: r.shares, totalCost: r.total_cost, profit: r.profit, date: r.date,
  }));
  let stockProfit = 0;
  for (const pf of stockPortfolios) {
    const pfRecords = stockRecords.filter((r: any) => r.portfolioId === pf.id);
    // Compute recoveredProfit via holding map (same as getPortfolioStats)
    const holdingMap: Record<string, { shares: number; totalCost: number }> = {};
    for (const r of pfRecords) {
      if (!holdingMap[r.stockName]) holdingMap[r.stockName] = { shares: 0, totalCost: 0 };
      if (r.type === 'buy') {
        holdingMap[r.stockName].shares += r.shares;
        holdingMap[r.stockName].totalCost += r.totalCost;
      } else if (r.type === 'sell') {
        const beforeRecords = pfRecords.filter((x: any) => x.date < r.date || (x.date === r.date));
        const beforeBuys = beforeRecords.filter((x: any) => x.type === 'buy' && x.stockName === r.stockName);
        const beforeSells = beforeRecords.filter((x: any) => x.type === 'sell' && x.stockName === r.stockName);
        const totalBought = beforeBuys.reduce((s: number, x: any) => s + x.shares, 0);
        const totalSoldBefore = beforeSells.reduce((s: number, x: any) => s + x.shares, 0);
        const availShares = totalBought - totalSoldBefore;
        const sharesToSell = Math.min(r.shares, availShares);
        holdingMap[r.stockName].shares -= sharesToSell;
        if (holdingMap[r.stockName].shares > 0 && holdingMap[r.stockName].totalCost > 0 && totalBought > 0) {
          const avgCost = beforeBuys.reduce((s: number, x: any) => s + x.totalCost, 0) / totalBought;
          holdingMap[r.stockName].totalCost -= avgCost * sharesToSell;
        }
      }
    }
    // recoveredProfit = sum of profit from sell records
    let recoveredProfit = 0;
    for (const r of pfRecords) {
      if (r.type === 'sell') recoveredProfit += (r.profit || 0);
    }
    stockProfit += recoveredProfit;
  }

  return {
    salaryDeposit, bonusIncome, jpyProfit, audProfit, goldProfit,
    parentRemaining, stockProfit, bigExpenseTotal, incomeRecovery,
  };
}

export async function saveYearSummary(userId: string, year: number, summary: Record<string, number>): Promise<void> {
  await supabase.from('yearly_summaries').upsert({
    user_id: userId,
    year,
    salary_deposit: summary.salaryDeposit || 0,
    jpy_profit: summary.jpyProfit || 0,
    aud_profit: summary.audProfit || 0,
    gold_profit: summary.goldProfit || 0,
    parent_remaining: summary.parentRemaining || 0,
    stock_profit: summary.stockProfit || 0,
    bonus_income: summary.bonusIncome || 0,
    big_expense_total: summary.bigExpenseTotal || 0,
    income_recovery: summary.incomeRecovery || 0,
  }, { onConflict: 'user_id,year' });
}
