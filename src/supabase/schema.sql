-- =============================================
-- 个人理财记账软件 - Supabase 数据库建表脚本
-- 请在 Supabase Dashboard → SQL Editor 中执行
-- =============================================

-- 1. 年度账本
CREATE TABLE IF NOT EXISTS years (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  year INT NOT NULL,
  name TEXT,
  PRIMARY KEY (user_id, year)
);

-- 2. 工资记录
CREATE TABLE IF NOT EXISTS salary_records (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  year INT NOT NULL,
  rec_id TEXT NOT NULL,
  month INT NOT NULL,
  salary NUMERIC DEFAULT 0,
  expense NUMERIC DEFAULT 0,
  PRIMARY KEY (user_id, year, rec_id)
);

-- 3. 日元交易记录
CREATE TABLE IF NOT EXISTS jpy_records (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  year INT NOT NULL,
  rec_id TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  amount NUMERIC DEFAULT 0,
  rate NUMERIC DEFAULT 0,
  rmb NUMERIC DEFAULT 0,
  PRIMARY KEY (user_id, year, rec_id)
);

-- 4. 澳元交易记录
CREATE TABLE IF NOT EXISTS aud_records (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  year INT NOT NULL,
  rec_id TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  amount NUMERIC DEFAULT 0,
  rate NUMERIC DEFAULT 0,
  rmb NUMERIC DEFAULT 0,
  PRIMARY KEY (user_id, year, rec_id)
);

-- 5. 澳元利息记录
CREATE TABLE IF NOT EXISTS aud_interest_records (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  year INT NOT NULL,
  rec_id TEXT NOT NULL,
  date TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  note TEXT,
  PRIMARY KEY (user_id, year, rec_id)
);

-- 6. 黄金基金交易记录
CREATE TABLE IF NOT EXISTS gold_records (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  year INT NOT NULL,
  rec_id TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  shares NUMERIC DEFAULT 0,
  nav NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  PRIMARY KEY (user_id, year, rec_id)
);

-- 6. 奖金收入记录
CREATE TABLE IF NOT EXISTS bonus_records (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  year INT NOT NULL,
  rec_id TEXT NOT NULL,
  date TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  note TEXT,
  PRIMARY KEY (user_id, year, rec_id)
);

-- 7. 大额消费记录
CREATE TABLE IF NOT EXISTS big_expense_records (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  year INT NOT NULL,
  rec_id TEXT NOT NULL,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  note TEXT,
  PRIMARY KEY (user_id, year, rec_id)
);

-- 7附. 收入回血记录
CREATE TABLE IF NOT EXISTS income_recovery_records (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  year INT NOT NULL,
  rec_id TEXT NOT NULL,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  note TEXT,
  PRIMARY KEY (user_id, year, rec_id)
);

-- 8. 爸妈援助记录
CREATE TABLE IF NOT EXISTS parent_records (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  year INT NOT NULL,
  rec_id TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('save', 'spend')),
  amount NUMERIC DEFAULT 0,
  note TEXT,
  PRIMARY KEY (user_id, year, rec_id)
);

-- 9. 股票账户
CREATE TABLE IF NOT EXISTS stock_portfolios (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  year INT NOT NULL,
  pf_id TEXT NOT NULL,
  name TEXT NOT NULL,
  total_invest NUMERIC DEFAULT 0,
  PRIMARY KEY (user_id, year, pf_id)
);

-- 10. 股票交易记录
CREATE TABLE IF NOT EXISTS stock_records (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  year INT NOT NULL,
  rec_id TEXT NOT NULL,
  pf_id TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  stock_name TEXT NOT NULL,
  shares NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  profit NUMERIC,
  PRIMARY KEY (user_id, year, rec_id)
);

-- 11. 设置（汇率等）
CREATE TABLE IF NOT EXISTS settings (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value NUMERIC DEFAULT 0,
  PRIMARY KEY (user_id, key)
);

-- 12. 年度汇总快照
CREATE TABLE IF NOT EXISTS yearly_summaries (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  year INT NOT NULL,
  salary_deposit NUMERIC DEFAULT 0,
  jpy_profit NUMERIC DEFAULT 0,
  aud_profit NUMERIC DEFAULT 0,
  gold_profit NUMERIC DEFAULT 0,
  parent_remaining NUMERIC DEFAULT 0,
  stock_profit NUMERIC DEFAULT 0,
  bonus_income NUMERIC DEFAULT 0,
  big_expense_total NUMERIC DEFAULT 0,
  income_recovery NUMERIC DEFAULT 0,
  PRIMARY KEY (user_id, year)
);

-- ===== 启用 Row Level Security =====
ALTER TABLE years ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE jpy_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE aud_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE aud_interest_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE big_expense_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_recovery_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE yearly_summaries ENABLE ROW LEVEL SECURITY;

-- ===== RLS 策略：用户只能访问自己的数据 =====
CREATE POLICY "Users own data" ON years FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own data" ON salary_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own data" ON jpy_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own data" ON aud_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own data" ON aud_interest_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own data" ON gold_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own data" ON bonus_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own data" ON parent_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own data" ON big_expense_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own data" ON income_recovery_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own data" ON stock_portfolios FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own data" ON stock_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own data" ON settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own data" ON yearly_summaries FOR ALL USING (auth.uid() = user_id);
