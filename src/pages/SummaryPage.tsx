import { useEffect, useState } from 'react';
import { Card, Statistic, Row, Col, Checkbox, Spin } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useYearStore } from '../store/useYearStore';
import { useSalaryStore } from '../store/useSalaryStore';
import { useJPYStore } from '../store/useJPYStore';
import { useAUDStore } from '../store/useAUDStore';
import { useGoldStore } from '../store/useGoldStore';
import { useParentStore } from '../store/useParentStore';
import { useBonusStore } from '../store/useBonusStore';
import { useBigExpenseStore } from '../store/useBigExpenseStore';
import { useIncomeRecoveryStore } from '../store/useIncomeRecoveryStore';
import { useStockStore } from '../store/useStockStore';
import { useAuthStore } from '../store/useAuthStore';
import { fetchPrevYearData } from '../supabase/db';

const wealthTypes = [
  { key: 'salaryDeposit', label: '💰 工资存款', color: '#6366f1', icon: '💰' },
  { key: 'bonusIncome', label: '🎁 奖金收入', color: '#f59e0b', icon: '🎁' },
  { key: 'jpyProfit', label: '💴 日元理财收益', color: '#ef4444', icon: '💴' },
  { key: 'audProfit', label: '🦘 澳元理财收益', color: '#06b6d4', icon: '🦘' },
  { key: 'goldProfit', label: '🥇 黄金理财收益', color: '#10b981', icon: '🥇' },
  { key: 'parentRemaining', label: '👨‍👩‍👧 爸妈援助剩余', color: '#8b5cf6', icon: '👨‍👩‍👧' },
  { key: 'stockProfit', label: '📈 股票投资收益', color: '#ec4899', icon: '📈' },
  { key: 'incomeRecovery', label: '💚 收入回血', color: '#10b981', icon: '💚' },
  { key: 'bigExpenseTotal', label: '🛒 大额消费', color: '#ef4444', icon: '🛒' },
];

function calcGrowthRate(current: number, previous: number): number | null {
  if (previous === 0) return current !== 0 ? Infinity : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export default function SummaryPage() {
  const { user } = useAuthStore();
  const { currentYear } = useYearStore();
  const [prevValues, setPrevValues] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [winWidth, setWinWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const onResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const mobile = winWidth < 576;

  const userId = user?.id || '';

  // Load all store data for current year
  useEffect(() => {
    if (userId && currentYear) {
      setLoading(true);
      Promise.all([
        useSalaryStore.getState().loadRecords(userId, currentYear),
        useJPYStore.getState().loadRecords(userId, currentYear),
        useAUDStore.getState().loadRecords(userId, currentYear),
        useGoldStore.getState().loadRecords(userId, currentYear),
        useParentStore.getState().loadRecords(userId, currentYear),
        useBonusStore.getState().loadRecords(userId, currentYear),
        useBigExpenseStore.getState().loadRecords(userId, currentYear),
        useIncomeRecoveryStore.getState().loadRecords(userId, currentYear),
        useStockStore.getState().loadPortfolios(userId, currentYear),
        useStockStore.getState().loadRecords(userId, currentYear),
      ]).finally(() => setLoading(false));
    }
  }, [userId, currentYear]);

  // Load previous year data — always try to compute from raw records
  const prevYear = (currentYear || new Date().getFullYear()) - 1;

  useEffect(() => {
    if (userId && prevYear) {
      fetchPrevYearData(userId, prevYear).then(setPrevValues);
    }
  }, [userId, prevYear]);

  const [selectedTypes, setSelectedTypes] = useState<string[]>(wealthTypes.map((w) => w.key));
  const allSelected = selectedTypes.length === wealthTypes.length;
  const noneSelected = selectedTypes.length === 0;

  if (!currentYear) return null;
  const year = currentYear;

  // --- Compute current year values from store records ---
  const salaryRecords = useSalaryStore.getState().records;
  const salaryDeposit = salaryRecords.reduce((s, r) => s + r.salary - r.expense, 0);

  const jpyRecords = useJPYStore.getState().records;
  const jpyRate = useJPYStore.getState().rate;
  let jpyBuyCost = 0, jpySellRev = 0, jpyHold = 0;
  for (const r of jpyRecords) {
    if (r.type === 'buy') { jpyBuyCost += r.rmb; jpyHold += r.amount; }
    else { jpySellRev += r.rmb; jpyHold -= r.amount; }
  }
  const jpyProfit = jpySellRev + (jpyHold * jpyRate / 100) - jpyBuyCost;

  const audRecords = useAUDStore.getState().records;
  const audRate = useAUDStore.getState().rate;
  let audBuyCost = 0, audSellRev = 0, audHold = 0;
  for (const r of audRecords) {
    if (r.type === 'buy') { audBuyCost += r.rmb; audHold += r.amount; }
    else { audSellRev += r.rmb; audHold -= r.amount; }
  }
  const audInterest = useAUDStore.getState().interestRecords.reduce((s, r) => s + r.amount, 0);
  const audProfit = audSellRev + audInterest + (audHold * audRate / 100) - audBuyCost;

  const goldRecords = useGoldStore.getState().records;
  let goldBuyShares = 0, goldBuyCost = 0, goldSellShares = 0, goldSellRev = 0;
  for (const r of goldRecords) {
    if (r.type === 'buy') { goldBuyShares += r.shares; goldBuyCost += r.amount; }
    else { goldSellShares += r.shares; goldSellRev += r.amount; }
  }
  let goldProfit = 0;
  if (goldSellShares > 0 && goldBuyShares > 0) {
    const avgBuyNav = goldBuyCost / goldBuyShares;
    goldProfit = goldSellRev - (avgBuyNav * goldSellShares);
  }

  const parentRecords = useParentStore.getState().records;
  const parentRemaining = parentRecords.reduce((s, r) => s + (r.type === 'save' ? r.amount : -r.amount), 0);

  const bonusRecords = useBonusStore.getState().records;
  const bonusIncome = bonusRecords.reduce((s, r) => s + r.amount, 0);

  const bigExpenseRecords = useBigExpenseStore.getState().records;
  const bigExpenseTotal = -bigExpenseRecords.reduce((s, r) => s + r.amount, 0); // 消费是负债，记负数

  const incomeRecoveryRecords = useIncomeRecoveryStore.getState().records;
  const incomeRecovery = incomeRecoveryRecords.reduce((s, r) => s + r.amount, 0);

  const stockPortfolios = useStockStore.getState().portfolios;
  let stockProfit = 0;
  for (const pf of stockPortfolios) {
    stockProfit += useStockStore.getState().getPortfolioStats(pf.id).recoveredProfit;
  }

  const currentValues: Record<string, number> = {
    salaryDeposit, bonusIncome, jpyProfit, audProfit, goldProfit, parentRemaining, stockProfit, bigExpenseTotal, incomeRecovery,
  };

  const totalWealth = Object.entries(currentValues)
    .filter(([k]) => selectedTypes.includes(k))
    .reduce((s, [, v]) => s + v, 0);

  const prevTotalFiltered = prevValues
    ? selectedTypes.reduce((s, k) => s + (prevValues[k] || 0), 0)
    : 0;

  const filteredWealthTypes = wealthTypes.filter((wt) => selectedTypes.includes(wt.key));
  const comparisonData = filteredWealthTypes.map((wt) => {
    const cur = currentValues[wt.key];
    const prev = prevValues ? prevValues[wt.key] : null;
    const growth = prev !== null ? calcGrowthRate(cur, prev) : null;
    return { ...wt, cur, prev, growth };
  });

  const summaryItems = filteredWealthTypes.map((wt) => ({
    type: wt.label, amount: currentValues[wt.key], color: wt.color,
  }));

  const barOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: mobile ? 70 : 120, right: 10, top: 10, bottom: mobile ? 60 : 50 },
    xAxis: { type: 'category', data: summaryItems.map((i) => i.type), axisLabel: { rotate: mobile ? 45 : 15, fontSize: mobile ? 10 : 11, interval: 0 } },
    yAxis: { type: 'value', name: '元 (¥)', nameTextStyle: { fontSize: mobile ? 10 : 12 } },
    series: [{
      name: '金额', type: 'bar',
      data: summaryItems.map((i) => ({
        value: i.amount,
        itemStyle: { color: i.amount >= 0 ? '#ef4444' : '#10b981', borderRadius: [4, 4, 0, 0] },
      })),
    }],
  };

  const positiveItems = summaryItems.filter((i) => i.amount > 0);
  const pieOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, type: 'scroll' as const, textStyle: { fontSize: mobile ? 10 : 12 } },
    series: [{
      type: 'pie', radius: mobile ? ['35%', '60%'] : ['40%', '70%'], center: ['50%', '45%'],
      data: positiveItems.map((i) => ({ value: i.amount, name: i.type })),
      label: { formatter: '{b}\n{d}%', fontSize: mobile ? 10 : 11 },
    }],
  };

  const yoyBarOption = comparisonData.length > 0 ? {
    tooltip: { trigger: 'axis' },
    legend: { data: [`${prevYear}年`, `${year}年`], top: 0, textStyle: { fontSize: mobile ? 10 : 12 } },
    grid: { left: mobile ? 70 : 140, right: 10, top: 35, bottom: mobile ? 60 : 50 },
    xAxis: { type: 'category', data: comparisonData.map((d) => d.label), axisLabel: { rotate: mobile ? 45 : 15, fontSize: mobile ? 10 : 11, interval: 0 } },
    yAxis: { type: 'value', name: '元 (¥)', nameTextStyle: { fontSize: mobile ? 10 : 12 } },
    series: [
      { name: `${prevYear}年`, type: 'bar', data: comparisonData.map((d) => d.prev ?? 0), itemStyle: { color: '#94a3b8', borderRadius: [4, 4, 0, 0] } },
      { name: `${year}年`, type: 'bar', data: comparisonData.map((d) => d.cur), itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] } },
    ],
  } : null;

  const chartHeight = mobile ? 280 : 400;

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>;

  return (
    <div>
      <Card style={{
        marginBottom: 16, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
        textAlign: 'center', padding: '28px 16px', border: 'none',
      }}>
        <Statistic
          title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: 500 }}>🏦 {year}年度 总计财富收益</span>}
          value={totalWealth} precision={2} prefix="¥"
          valueStyle={{ color: '#fff', fontSize: 44, fontWeight: 700 }} />
        {prevValues && (
          <div style={{ marginTop: 8 }}>
            <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
              较{prevYear}年 {totalWealth >= prevTotalFiltered ? '📈' : '📉'}
              <span style={{ fontWeight: 600 }}>
                {(() => {
                  if (prevTotalFiltered === 0) return ' 无数据';
                  const rate = ((totalWealth - prevTotalFiltered) / Math.abs(prevTotalFiltered)) * 100;
                  return ` ${rate >= 0 ? '+' : ''}${rate.toFixed(1)}%`;
                })()}
              </span>
              {!allSelected && <span style={{ fontSize: 11, opacity: 0.7 }}>（已筛选）</span>}
            </span>
          </div>
        )}
      </Card>

      <Card title={`📊 ${year}年 vs ${prevYear}年 同比增长对比`} style={{ marginBottom: 16 }}>
        {prevValues !== null ? (
          <>
            <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                🔍 筛选对比类型
                <Checkbox style={{ marginLeft: 12, fontSize: 12, fontWeight: 400 }} checked={allSelected}
                  indeterminate={!allSelected && !noneSelected}
                  onChange={(e) => { if (e.target.checked) setSelectedTypes(wealthTypes.map((w) => w.key)); else setSelectedTypes([]); }}>
                  {allSelected ? '取消全选' : '全选'}
                </Checkbox>
              </div>
              <Checkbox.Group value={selectedTypes} onChange={(values) => setSelectedTypes(values as string[])}
                style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
                {wealthTypes.map((wt) => (<Checkbox key={wt.key} value={wt.key} style={{ fontSize: 13 }}>{wt.label}</Checkbox>))}
              </Checkbox.Group>
            </div>
            <Row gutter={[8, 8]} style={{ marginBottom: 16 }} className="summary-compare-cards">
              {comparisonData.map((d) => (
                <Col xs={12} sm={8} md={8} lg={4} key={d.key}>
                  <Card size="small" style={{ borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: d.color }}>
                      ¥{d.cur.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    {d.growth !== null && d.prev !== null && (
                      <div style={{ fontSize: 11, marginTop: 2, color: d.growth === Infinity ? '#6366f1' : (d.growth >= 0 ? '#ef4444' : '#10b981'), display: 'flex', alignItems: 'center', gap: 2 }}>
                        {d.growth === Infinity ? <>🆕 新增</> : d.growth >= 0 ? <><ArrowUpOutlined /> +{d.growth.toFixed(1)}%</> : <><ArrowDownOutlined /> {d.growth.toFixed(1)}%</>}
                      </div>
                    )}
                  </Card>
                </Col>
              ))}
            </Row>
            {yoyBarOption && <ReactECharts option={yoyBarOption} style={{ height: chartHeight }} />}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin size="default" /><div style={{ marginTop: 12, color: '#94a3b8', fontSize: 13 }}>正在加载{prevYear}年数据...</div></div>
        )}
      </Card>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="📊 各类财富收益柱状图" className="summary-chart-card"><ReactECharts option={barOption} style={{ height: chartHeight }} /></Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="🍩 各类型财富占比（正收益）" className="summary-chart-card">
            {positiveItems.length > 0 ? <ReactECharts option={pieOption} style={{ height: chartHeight }} />
              : <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>暂无正收益数据</div>}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
