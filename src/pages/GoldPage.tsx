import { useEffect, useState, useMemo } from 'react';
import { Card, Table, Button, Modal, Form, InputNumber, Space, Popconfirm, message, Statistic, Row, Col, DatePicker, Select, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useYearStore } from '../store/useYearStore';
import { useGoldStore } from '../store/useGoldStore';
import { useAuthStore } from '../store/useAuthStore';
import type { GoldRecord } from '../types';
import dayjs from 'dayjs';

export default function GoldPage() {
  const { user } = useAuthStore();
  const { currentYear } = useYearStore();
  const { records, rate, loading, loadRecords, addRecord, deleteRecord, setRate } = useGoldStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<GoldRecord | null>(null);
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [rateForm] = Form.useForm();
  const [form] = Form.useForm();

  const userId = user?.id || '';
  const year = currentYear!;

  useEffect(() => {
    if (userId && currentYear) loadRecords(userId, currentYear);
  }, [userId, currentYear]);

  // ─── 统计数据（平均成本法）─────────────────
  const stats = useMemo(() => {
    let totalRealizedProfit = 0, holding = 0, costBasis = 0, totalBuyCost = 0;
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
    for (const r of sorted) {
      if (r.type === 'buy') {
        totalBuyCost += r.amount;
        holding += r.shares;
        costBasis += r.amount;
      } else {
        const avgCost = holding > 0 ? costBasis / holding : 0;
        const costOfSold = r.shares * avgCost;
        totalRealizedProfit += (r.amount - costOfSold);
        holding -= r.shares;
        costBasis -= costOfSold;
      }
    }
    const holdingProfit = holding * rate - costBasis;
    return {
      totalProfit: totalRealizedProfit,       // 总计盈利 = 仅已实现
      holdingProfit,
      totalRealizedProfit,
      totalBuyCost,
      currentHolding: Math.max(0, holding),
    };
  }, [records, rate]);

  // ─── 自动计算总金额 ─────────────────
  const watchShares = Form.useWatch('shares', form);
  const watchNav = Form.useWatch('nav', form);
  const calcAmount = watchShares && watchNav ? watchShares * watchNav : 0;

  const handleAdd = (type: 'buy' | 'sell') => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ type });
    setModalOpen(true);
  };

  const handleEdit = (record: GoldRecord) => {
    setEditingRecord(record);
    form.setFieldsValue({
      type: record.type,
      date: dayjs(record.date),
      shares: record.shares,
      nav: record.nav,
    });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then(async (values) => {
      const data: GoldRecord = {
        id: editingRecord?.id || '',
        date: values.date.format('YYYY-MM-DD'),
        type: values.type,
        shares: values.shares,
        nav: values.nav,
        amount: values.shares * values.nav,
      };
      if (editingRecord) {
        await deleteRecord(userId, year, editingRecord.id);
      }
      await addRecord(userId, year, data);
      setModalOpen(false);
      message.success(editingRecord ? '已更新' : '已添加');
    });
  };

  const handleDelete = async (id: string) => {
    await deleteRecord(userId, year, id);
    message.success('已删除');
  };

  const handleRateUpdate = () => {
    rateForm.validateFields().then(async ({ rate: newRate }) => {
      await setRate(userId, year, newRate);
      setRateModalOpen(false);
      message.success('净值已更新');
    });
  };

  // ─── 持仓盈利走势 ─────────────────
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  let cumulativeShares = 0, cumulativeCost = 0;
  const profitTrend: { date: string; profit: number }[] = [];
  for (const r of sorted) {
    if (r.type === 'buy') {
      cumulativeShares += r.shares;
      cumulativeCost += r.amount;
    } else {
      const avgCost = cumulativeShares > 0 ? cumulativeCost / cumulativeShares : 0;
      cumulativeShares -= r.shares;
      cumulativeCost -= r.shares * avgCost;
    }
    profitTrend.push({ date: r.date, profit: cumulativeShares * rate - cumulativeCost });
  }

  // ─── 净值走势 ─────────────────
  const navData = sorted.map((r) => ({
    date: r.date, nav: r.nav, type: r.type,
  }));

  const chartOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 80, right: 20, top: 20, bottom: 50 },
    xAxis: {
      type: 'category', data: profitTrend.map((d) => d.date),
      axisLabel: { rotate: 30, fontSize: 11, interval: 0 },
    },
    yAxis: { type: 'value', name: '持仓盈利 (¥)' },
    series: [{
      name: '持仓盈利', type: 'line', data: profitTrend.map((d) => d.profit), smooth: true,
      areaStyle: { color: 'rgba(245,158,11,0.08)' }, itemStyle: { color: '#f59e0b' },
      markLine: { data: [{ yAxis: 0, lineStyle: { color: '#94a3b8', type: 'dashed' } }], silent: true },
    }],
  };

  const navChartOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['买入净值', '卖出净值'] },
    grid: { left: 80, right: 20, top: 30, bottom: 60 },
    xAxis: {
      type: 'category', data: navData.map((d) => d.date),
      axisLabel: { rotate: 45, fontSize: 11, interval: 'auto', overflow: 'truncate', width: 60 },
    },
    yAxis: { type: 'value', name: '元/份' },
    series: [
      { name: '买入净值', type: 'line', data: navData.map((d) => d.type === 'buy' ? d.nav : null), itemStyle: { color: '#ef4444' }, connectNulls: true, smooth: true },
      { name: '卖出净值', type: 'line', data: navData.map((d) => d.type === 'sell' ? d.nav : null), itemStyle: { color: '#10b981' }, connectNulls: true, smooth: true },
    ],
  };

  const columns = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 100 },
    { title: '操作', dataIndex: 'type', key: 'type', width: 60,
      render: (v: string) => v === 'buy'
        ? <span style={{ color: '#ef4444', fontWeight: 500 }}>📥 买入</span>
        : <span style={{ color: '#10b981', fontWeight: 500 }}>📤 卖出</span> },
    { title: '份额', dataIndex: 'shares', key: 'shares', align: 'right' as const, render: (v: number) => `${v?.toFixed(2)}份` },
    { title: '净值', dataIndex: 'nav', key: 'nav', align: 'right' as const, render: (v: number) => `¥${v?.toFixed(4)}/份` },
    { title: '金额', dataIndex: 'amount', key: 'amount', align: 'right' as const, render: (v: number) => `¥${v?.toLocaleString()}` },
    { title: '操作', key: 'action', width: 110,
      render: (_: unknown, record: GoldRecord) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ) },
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>;

  return (
    <div>
      {/* 当前净值 Bar */}
      <Card style={{ marginBottom: 16, background: '#fef9e7', border: '1px solid #fde68a' }}>
        <Row align="middle" gutter={16}>
          <Col flex="auto">
            <span style={{ fontSize: 14, color: '#475569' }}>🥇 当前净值：</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>¥{rate.toFixed(4)}</span>
            <span style={{ fontSize: 14, color: '#475569' }}> /份</span>
          </Col>
          <Col>
            <Button onClick={() => { rateForm.setFieldsValue({ rate }); setRateModalOpen(true); }}>更新净值</Button>
          </Col>
        </Row>
      </Card>

      {/* 统计卡片 */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={4}>
          <Card><Statistic title="💹 总计盈利" value={stats.totalProfit} precision={2} prefix="¥"
            valueStyle={{ color: stats.totalProfit >= 0 ? '#ef4444' : '#10b981', fontSize: 20, fontWeight: 600 }} /></Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card><Statistic title="📦 持仓盈利" value={stats.holdingProfit} precision={2} prefix="¥"
            valueStyle={{ color: stats.holdingProfit >= 0 ? '#ef4444' : '#10b981', fontSize: 20, fontWeight: 600 }} /></Card>
        </Col>
        <Col xs={12} sm={5}>
          <Card><Statistic title="📥 累计买入" value={stats.totalBuyCost} precision={2} prefix="¥"
            valueStyle={{ fontSize: 20, fontWeight: 600 }} /></Card>
        </Col>
        <Col xs={12} sm={5}>
          <Card><Statistic title="💎 当前持仓" value={stats.currentHolding} precision={2} suffix="份"
            valueStyle={{ fontSize: 20, fontWeight: 600, color: '#f59e0b' }} /></Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card style={{ background: 'linear-gradient(135deg, #f59e0b, #fcd34d)', border: 'none' }}>
            <Statistic title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>🏷️ 已实现盈利</span>}
              value={stats.totalRealizedProfit} precision={2} prefix="¥"
              valueStyle={{ color: '#fff', fontSize: 20, fontWeight: 700 }} /></Card>
        </Col>
      </Row>

      {/* 交易记录表 */}
      <Card title="🥇 黄金基金交易记录" extra={
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAdd('buy')}
            style={{ background: '#f59e0b', borderColor: '#f59e0b' }}>新增买入</Button>
          <Button icon={<PlusOutlined />} onClick={() => handleAdd('sell')}>新增卖出</Button>
        </Space>
      } style={{ marginBottom: 16 }}>
        <Table dataSource={records} columns={columns} rowKey="id" pagination={false} size="middle"
          locale={{ emptyText: '暂无交易记录' }} />
      </Card>

      {/* 持仓盈利走势图 */}
      <Card title="📈 持仓盈利走势" style={{ marginBottom: 16 }}>
        <ReactECharts option={chartOption} style={{ height: 350 }} />
      </Card>

      {/* 净值走势图 */}
      <Card title="📉 净值走势">
        <ReactECharts option={navChartOption} style={{ height: 350 }} />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal title={editingRecord ? '✏️ 编辑记录' : '➕ 新增记录'} open={modalOpen}
        onOk={handleSubmit} onCancel={() => setModalOpen(false)} destroyOnClose width={440}>
        <Form form={form} layout="vertical">
          <Form.Item name="type" label="操作类型" rules={[{ required: true }]}>
            <Select options={[{ label: '📥 买入', value: 'buy' }, { label: '📤 卖出', value: 'sell' }]} disabled={!!editingRecord} />
          </Form.Item>
          <Form.Item name="date" label="📅 日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="shares" label="📊 份额（份）" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="如 1000.00" />
          </Form.Item>
          <Form.Item name="nav" label="💵 净值（元/份）" rules={[{ required: true }]}>
            <InputNumber min={0} precision={4} prefix="¥" style={{ width: '100%' }} placeholder="如 1.0500" />
          </Form.Item>
          <Form.Item label="💰 总金额（自动计算）">
            <InputNumber value={calcAmount} precision={2} prefix="¥" style={{ width: '100%' }} disabled
              placeholder="输入份额和净值后自动计算" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 更新净值弹窗 */}
      <Modal title="🥇 更新净值" open={rateModalOpen} onOk={handleRateUpdate}
        onCancel={() => setRateModalOpen(false)}>
        <Form form={rateForm} layout="vertical">
          <Form.Item name="rate" label="当前净值（元/份）" rules={[{ required: true }]}>
            <InputNumber min={0} precision={4} style={{ width: '100%' }} prefix="¥" placeholder="如 1.0500" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
