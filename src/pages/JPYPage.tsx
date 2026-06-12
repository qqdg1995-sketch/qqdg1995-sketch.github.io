import { useEffect, useState, useMemo } from 'react';
import { Card, Table, Button, Modal, Form, InputNumber, Space, Popconfirm, message, Statistic, Row, Col, DatePicker, Select, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useYearStore } from '../store/useYearStore';
import { useJPYStore } from '../store/useJPYStore';
import { useAuthStore } from '../store/useAuthStore';
import type { JPYRecord } from '../types';
import dayjs from 'dayjs';

export default function JPYPage() {
  const { user } = useAuthStore();
  const { currentYear } = useYearStore();
  const { records, rate, loading, loadRecords, addRecord, deleteRecord, setRate } = useJPYStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<JPYRecord | null>(null);
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [rateForm] = Form.useForm();
  const [form] = Form.useForm();
  const [calcRMB, setCalcRMB] = useState(0);

  const userId = user?.id || '';
  const year = currentYear!;

  useEffect(() => {
    if (userId && currentYear) loadRecords(userId, currentYear);
  }, [userId, currentYear]);

  // Compute stats with average-cost method
  const stats = useMemo(() => {
    let totalBuyCost = 0, totalRealizedProfit = 0;
    let holding = 0, costBasis = 0;
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
    for (const r of sorted) {
      if (r.type === 'buy') {
        totalBuyCost += r.rmb;
        holding += r.amount;
        costBasis += r.rmb;
      } else {
        // Average cost: cost of sold = amount * (total cost / total holding before sell)
        const avgCost = holding > 0 ? costBasis / holding : 0;
        const costOfSold = r.amount * avgCost;
        totalRealizedProfit += (r.rmb - costOfSold);
        holding -= r.amount;
        costBasis -= costOfSold;
      }
    }
    const holdingProfit = holding * rate / 100 - costBasis;
    const totalProfit = totalRealizedProfit; // 总计盈利 = 已实现盈利（不含持仓浮动）
    return { totalProfit, holdingProfit, totalRealizedProfit, totalBuyCost, currentHolding: holding };
  }, [records, rate]);

  // Watch form for auto-calc
  const watchRate = Form.useWatch('rate', form);
  const watchAmount = Form.useWatch('amount', form);
  useEffect(() => {
    if (watchRate && watchAmount) {
      setCalcRMB(Math.round(watchAmount * watchRate / 100 * 100) / 100);
    } else setCalcRMB(0);
  }, [watchRate, watchAmount]);

  const handleAdd = (type: 'buy' | 'sell') => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ type, rate });
    setCalcRMB(0);
    setModalOpen(true);
  };

  const handleEdit = (record: JPYRecord) => {
    setEditingRecord(record);
    form.setFieldsValue({ ...record, date: dayjs(record.date) });
    setCalcRMB(record.rmb);
    setModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then(async (values) => {
      const data: JPYRecord = {
        id: editingRecord?.id || '',
        date: values.date.format('YYYY-MM-DD'),
        type: values.type,
        rate: values.rate,
        amount: values.amount,
        rmb: calcRMB,
      };
      if (editingRecord) {
        // Delete old + add new (simpler than update since we don't have update for JPY)
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
      message.success('汇率已更新');
    });
  };

  // Profit trend with average-cost method
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  let cumulativeBuy = 0, cumulativeCost = 0;
  const profitTrend: { date: string; profit: number }[] = [];
  for (const r of sorted) {
    if (r.type === 'buy') {
      cumulativeBuy += r.amount;
      cumulativeCost += r.rmb;
    } else {
      const avgCost = cumulativeBuy > 0 ? cumulativeCost / cumulativeBuy : 0;
      cumulativeBuy -= r.amount;
      cumulativeCost -= r.amount * avgCost;
    }
    profitTrend.push({ date: r.date, profit: cumulativeBuy * rate / 100 - cumulativeCost });
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

  const columns = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 100 },
    { title: '操作', dataIndex: 'type', key: 'type', width: 60,
      render: (v: string) => v === 'buy'
        ? <span style={{ color: '#ef4444', fontWeight: 500 }}>📥 买进</span>
        : <span style={{ color: '#10b981', fontWeight: 500 }}>📤 卖出</span> },
    { title: '汇率(100日元)', dataIndex: 'rate', key: 'rate', align: 'right' as const, render: (v: number) => v?.toFixed(4) },
    { title: '日元金额', dataIndex: 'amount', key: 'amount', align: 'right' as const, render: (v: number) => `¥${v.toLocaleString()}` },
    { title: 'RMB金额', dataIndex: 'rmb', key: 'rmb', align: 'right' as const, render: (v: number) => `¥${v.toLocaleString()}` },
    { title: '操作', key: 'action', width: 110,
      render: (_: unknown, record: JPYRecord) => (
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
      <Card style={{ marginBottom: 16, background: '#fef9e7', border: '1px solid #fde68a' }}>
        <Row align="middle" gutter={16}>
          <Col flex="auto">
            <span style={{ fontSize: 14, color: '#475569' }}>💴 当日汇率：100日元 = </span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#6366f1' }}>{rate.toFixed(4)}</span>
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
          <Card><Statistic title="💎 当前持仓" value={stats.currentHolding} precision={0} prefix="¥"
            valueStyle={{ fontSize: 20, fontWeight: 600, color: '#6366f1' }} /></Card>
        </Col>
      </Row>

      <Card title="💴 日元理财记录" extra={
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAdd('buy')}>新增买进</Button>
          <Button icon={<PlusOutlined />} onClick={() => handleAdd('sell')}>新增卖出</Button>
        </Space>
      } style={{ marginBottom: 16 }}>
        <Table dataSource={records} columns={columns} rowKey="id" pagination={false} size="middle"
          locale={{ emptyText: '暂无记录' }} />
      </Card>

      <Card title="📈 盈利走势图" style={{ marginBottom: 16 }}>
        <ReactECharts option={chartOption} style={{ height: 350 }} />
      </Card>

      <Modal title={editingRecord ? '✏️ 编辑记录' : '➕ 新增记录'} open={modalOpen}
        onOk={handleSubmit} onCancel={() => setModalOpen(false)} destroyOnClose width={480}>
        <Form form={form} layout="vertical">
          <Form.Item name="type" label="操作类型" rules={[{ required: true }]}>
            <Select options={[{ label: '📥 买进', value: 'buy' }, { label: '📤 卖出', value: 'sell' }]} disabled={!!editingRecord} />
          </Form.Item>
          <Form.Item name="date" label="📅 日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="rate" label="💱 汇率（100日元=？人民币）" rules={[{ required: true }]}>
            <InputNumber min={0} precision={4} style={{ width: '100%' }} placeholder="如 4.3200" />
          </Form.Item>
          <Form.Item name="amount" label="💴 日元金额" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>
          <Form.Item label="💵 等值人民币（自动计算）">
            <InputNumber value={calcRMB} precision={2} prefix="¥" style={{ width: '100%' }} disabled
              placeholder="输入汇率和日元金额后自动计算" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="💱 更新汇率" open={rateModalOpen} onOk={handleRateUpdate}
        onCancel={() => setRateModalOpen(false)}>
        <Form form={rateForm} layout="vertical">
          <Form.Item name="rate" label="100日元 = ？人民币" rules={[{ required: true }]}>
            <InputNumber min={0} precision={4} style={{ width: '100%' }} placeholder="如 4.3200" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
