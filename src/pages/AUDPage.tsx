import { useEffect, useState, useMemo } from 'react';
import { Card, Button, Modal, Form, InputNumber, Input, Space, Popconfirm, Spin, message, Statistic, Row, Col, DatePicker, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useYearStore } from '../store/useYearStore';
import { useAUDStore } from '../store/useAUDStore';
import { useAuthStore } from '../store/useAuthStore';
import type { AUDRecord, AUDInterestRecord } from '../types';
import dayjs from 'dayjs';
import ResponsiveTable from '../components/ResponsiveTable';
import { calculateAverageCost, roundCurrency } from '../utils/finance';

export default function AUDPage() {
  const { user } = useAuthStore();
  const { currentYear } = useYearStore();
  const { records, rate, interestRecords, loading, loadRecords, addRecord, deleteRecord, setRate, addInterest, deleteInterest } = useAUDStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AUDRecord | null>(null);
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [interestModalOpen, setInterestModalOpen] = useState(false);
  const [rateForm] = Form.useForm();
  const [interestForm] = Form.useForm();
  const [form] = Form.useForm();

  const userId = user?.id || '';
  const year = currentYear!;

  useEffect(() => {
    if (userId && currentYear) loadRecords(userId, currentYear);
  }, [userId, currentYear, loadRecords]);

  // Compute stats with average-cost method
  const stats = useMemo(() => {
    const position = calculateAverageCost(records.map((record) => ({
      date: record.date, type: record.type, quantity: record.amount, value: record.rmb,
    })));
    const totalInterest = interestRecords.reduce((sum, record) => sum + record.amount, 0);
    const holdingProfit = position.holding * rate / 100 - position.costBasis;
    return {
      totalProfit: roundCurrency(position.realizedProfit + totalInterest),
      holdingProfit: roundCurrency(holdingProfit),
      totalRealizedProfit: roundCurrency(position.realizedProfit),
      totalBuyCost: roundCurrency(position.totalBuyCost),
      totalInterest: roundCurrency(totalInterest),
      currentHolding: position.holding,
    };
  }, [records, interestRecords, rate]);

  const watchRate = Form.useWatch('rate', form);
  const watchAmount = Form.useWatch('amount', form);
  const calcRMB = watchRate && watchAmount
    ? Math.round(watchAmount * watchRate / 100 * 100) / 100
    : 0;

  const handleAdd = (type: 'buy' | 'sell') => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ type, rate });
    setModalOpen(true);
  };

  const handleEdit = (record: AUDRecord) => {
    setEditingRecord(record);
    form.setFieldsValue({ ...record, date: dayjs(record.date) });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then(async (values) => {
      const data: AUDRecord = {
        id: editingRecord?.id || '', date: values.date.format('YYYY-MM-DD'),
        type: values.type, rate: values.rate, amount: values.amount, rmb: calcRMB,
      };
      try {
        calculateAverageCost([
          ...records.filter((record) => record.id !== editingRecord?.id),
          data,
        ].map((record) => ({
          date: record.date, type: record.type, quantity: record.amount, value: record.rmb,
        })));
      } catch (error) {
        message.error(error instanceof Error ? error.message : '卖出数量超过当前持仓');
        return;
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
    rateForm.validateFields().then(async ({ rate: nr }) => {
      await setRate(userId, year, nr);
      setRateModalOpen(false);
      message.success('汇率已更新');
    });
  };

  const handleInterestSubmit = () => {
    interestForm.validateFields().then(async (values) => {
      await addInterest(userId, year, {
        id: '', date: values.date.format('YYYY-MM-DD'), amount: values.amount, note: values.note || '',
      });
      setInterestModalOpen(false);
      message.success('利息已记录');
    });
  };

  // Merge trades and interest into one chronological trend.
  const trendEvents = [
    ...records.map((record) => ({ date: record.date, kind: 'trade' as const, record })),
    ...interestRecords.map((record) => ({ date: record.date, kind: 'interest' as const, record })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
  const trendTrades: AUDRecord[] = [];
  const profitTrend: { date: string; profit: number }[] = [];
  let cumulativeInterest = 0;
  for (const event of trendEvents) {
    if (event.kind === 'trade') trendTrades.push(event.record);
    else cumulativeInterest += event.record.amount;
    const position = calculateAverageCost(trendTrades.map((record) => ({
      date: record.date, type: record.type, quantity: record.amount, value: record.rmb,
    })));
    profitTrend.push({
      date: event.date,
      profit: position.realizedProfit + cumulativeInterest
        + (position.holding * rate / 100 - position.costBasis),
    });
  }

  const chartOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 80, right: 20, top: 20, bottom: 50 },
    xAxis: { type: 'category', data: profitTrend.map((d) => d.date),
      axisLabel: { rotate: 30, fontSize: 11, interval: 0 } },
    yAxis: { type: 'value', name: '累计盈利 (¥)' },
    series: [{
      name: '累计盈利', type: 'line', data: profitTrend.map((d) => d.profit), smooth: true,
      areaStyle: { color: 'rgba(99,102,241,0.08)' }, itemStyle: { color: '#6366f1' },
      markLine: { data: [{ yAxis: 0, lineStyle: { color: '#94a3b8', type: 'dashed' } }], silent: true },
    }],
  };

  const tradeCols = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 100 },
    { title: '操作', dataIndex: 'type', key: 'type', width: 60,
      render: (v: string) => v === 'buy' ? <span style={{ color: '#ef4444', fontWeight: 500 }}>📥 买进</span> : <span style={{ color: '#10b981', fontWeight: 500 }}>📤 卖出</span> },
    { title: '汇率(100澳元)', dataIndex: 'rate', key: 'rate', align: 'right' as const, render: (v: number) => v?.toFixed(2) },
    { title: '澳元金额', dataIndex: 'amount', key: 'amount', align: 'right' as const, render: (v: number) => `A$ ${v.toLocaleString()}` },
    { title: 'RMB金额', dataIndex: 'rmb', key: 'rmb', align: 'right' as const, render: (v: number) => `¥${v.toLocaleString()}` },
    { title: '操作', key: 'action', width: 110,
      render: (_: unknown, record: AUDRecord) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ) },
  ];

  const interestCols = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 120 },
    { title: '利息金额', dataIndex: 'amount', align: 'right' as const,
      render: (v: number) => <span style={{ color: '#f59e0b', fontWeight: 500 }}>¥{v.toLocaleString()}</span> },
    { title: '备注', dataIndex: 'note', key: 'note', ellipsis: true },
    { title: '操作', key: 'action', width: 80,
      render: (_: unknown, r: AUDInterestRecord) => (
        <Popconfirm title="确认删除？" onConfirm={async () => { await deleteInterest(userId, year, r.id); message.success('已删除'); }}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ) },
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>;

  return (
    <div>
      <Card style={{ marginBottom: 16, background: '#fef9e7', border: '1px solid #fde68a' }}>
        <Row align="middle" gutter={16}>
          <Col flex="auto">
            <span style={{ fontSize: 14, color: '#475569' }}>🦘 当日汇率：100澳元 = </span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#6366f1' }}>{rate.toFixed(2)}</span>
            <span style={{ fontSize: 14, color: '#475569' }}> 人民币</span>
          </Col>
          <Col><Button onClick={() => { rateForm.setFieldsValue({ rate }); setRateModalOpen(true); }}>更新汇率</Button></Col>
        </Row>
      </Card>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card><Statistic title="💹 总计盈利" value={stats.totalProfit} precision={2} prefix="¥"
            valueStyle={{ color: stats.totalProfit >= 0 ? '#ef4444' : '#10b981', fontSize: 20, fontWeight: 600 }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="📦 持仓盈利" value={stats.holdingProfit} precision={2} prefix="¥"
            valueStyle={{ color: stats.holdingProfit >= 0 ? '#ef4444' : '#10b981', fontSize: 20, fontWeight: 600 }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="📥 累计买进" value={stats.totalBuyCost} precision={2} prefix="¥"
            valueStyle={{ fontSize: 20, fontWeight: 600 }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="💰 利息收益" value={stats.totalInterest} precision={2} prefix="¥"
            valueStyle={{ color: '#f59e0b', fontSize: 20, fontWeight: 600 }} /></Card>
        </Col>
      </Row>

      <Card title="🦘 澳元交易记录" extra={
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAdd('buy')}>新增买进</Button>
          <Button icon={<PlusOutlined />} onClick={() => handleAdd('sell')}>新增卖出</Button>
        </Space>
      } style={{ marginBottom: 16 }}>
        <ResponsiveTable dataSource={records} columns={tradeCols} rowKey="id" />
      </Card>

      <Card title="💰 利息记录" extra={
        <Button icon={<PlusOutlined />} onClick={() => { interestForm.resetFields(); setInterestModalOpen(true); }}>记录利息</Button>
      } style={{ marginBottom: 16 }}>
        <ResponsiveTable dataSource={interestRecords} columns={interestCols} rowKey="id"
          emptyText="暂无利息记录" />
      </Card>

      <Card title="📈 盈利走势图" style={{ marginBottom: 16 }}>
        <ReactECharts option={chartOption} style={{ height: 350 }} />
      </Card>

      {/* Trade Modal */}
      <Modal title={editingRecord ? '✏️ 编辑记录' : '➕ 新增记录'} open={modalOpen}
        onOk={handleSubmit} onCancel={() => setModalOpen(false)} destroyOnHidden width={480}>
        <Form form={form} layout="vertical">
          <Form.Item name="type" label="操作类型" rules={[{ required: true }]}>
            <Select options={[{ label: '📥 买进', value: 'buy' }, { label: '📤 卖出', value: 'sell' }]} disabled={!!editingRecord} />
          </Form.Item>
          <Form.Item name="date" label="📅 日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="rate" label="💱 汇率（100澳元=？人民币）" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="如 485.30" />
          </Form.Item>
          <Form.Item name="amount" label="🦘 澳元金额" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>
          <Form.Item label="💵 等值人民币（自动计算）">
            <InputNumber value={calcRMB} precision={2} prefix="¥" style={{ width: '100%' }} disabled
              placeholder="输入汇率和澳元金额后自动计算" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Rate Modal */}
      <Modal title="💱 更新汇率" open={rateModalOpen} onOk={handleRateUpdate} onCancel={() => setRateModalOpen(false)}>
        <Form form={rateForm} layout="vertical">
          <Form.Item name="rate" label="100澳元 = ？人民币" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="如 485.30" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Interest Modal */}
      <Modal title="💰 记录利息" open={interestModalOpen} onOk={handleInterestSubmit} onCancel={() => setInterestModalOpen(false)} destroyOnHidden>
        <Form form={interestForm} layout="vertical">
          <Form.Item name="date" label="📅 日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="amount" label="💰 利息金额（人民币）" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>
          <Form.Item name="note" label="📝 备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
