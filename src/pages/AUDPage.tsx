import { useEffect, useState, useMemo } from 'react';
import { Card, Table, Button, Modal, Form, InputNumber, Input, Space, Popconfirm, Spin, message, Statistic, Row, Col, DatePicker, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useYearStore } from '../store/useYearStore';
import { useAUDStore } from '../store/useAUDStore';
import { useAuthStore } from '../store/useAuthStore';
import type { AUDRecord, AUDInterestRecord } from '../types';
import dayjs from 'dayjs';

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
  const [calcRMB, setCalcRMB] = useState(0);

  const userId = user?.id || '';
  const year = currentYear!;

  useEffect(() => {
    if (userId && currentYear) loadRecords(userId, currentYear);
  }, [userId, currentYear]);

  // Compute stats with average-cost method
  const stats = useMemo(() => {
    let totalBuyCost = 0, totalRealizedProfit = 0, totalInterest = 0;
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
    totalInterest = interestRecords.reduce((s, r) => s + r.amount, 0);
    const holdingProfit = holding * rate / 100 - costBasis;
    const totalProfit = totalRealizedProfit + totalInterest; // 总计盈利 = 已实现买卖盈利 + 利息（不含持仓浮动）
    return { totalProfit, holdingProfit, totalRealizedProfit, totalBuyCost, totalInterest, currentHolding: holding };
  }, [records, interestRecords, rate]);

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

  const handleEdit = (record: AUDRecord) => {
    setEditingRecord(record);
    form.setFieldsValue({ ...record, date: dayjs(record.date) });
    setCalcRMB(record.rmb);
    setModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then(async (values) => {
      const data: AUDRecord = {
        id: editingRecord?.id || '', date: values.date.format('YYYY-MM-DD'),
        type: values.type, rate: values.rate, amount: values.amount, rmb: calcRMB,
      };
      if (editingRecord) await deleteRecord(userId, year, editingRecord.id);
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
    interestForm.validateFields().then(async (values: any) => {
      await addInterest(userId, year, {
        id: '', date: values.date.format('YYYY-MM-DD'), amount: values.amount, note: values.note || '',
      });
      setInterestModalOpen(false);
      message.success('利息已记录');
    });
  };

  // Prepare sorted records for chart with average-cost method
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  let cumulativeBuy = 0, cumulativeCost = 0;
  const allInterestSorted = [...interestRecords].sort((a, b) => a.date.localeCompare(b.date));
  const profitTrend: { date: string; profit: number }[] = [];
  let interestIdx = 0;
  for (const r of sorted) {
    while (interestIdx < allInterestSorted.length && allInterestSorted[interestIdx].date <= r.date) {
      profitTrend.push({ date: allInterestSorted[interestIdx].date, profit: cumulativeBuy * rate / 100 - cumulativeCost + allInterestSorted[interestIdx].amount });
      interestIdx++;
    }
    if (r.type === 'buy') {
      cumulativeBuy += r.amount;
      cumulativeCost += r.rmb;
    } else {
      const avgCost = cumulativeBuy > 0 ? cumulativeCost / cumulativeBuy : 0;
      cumulativeBuy -= r.amount;
      cumulativeCost -= r.amount * avgCost;
    }
    profitTrend.push({ date: r.date, profit: cumulativeBuy * rate / 100 - cumulativeCost + allInterestSorted.slice(0, interestIdx).reduce((s, i) => s + i.amount, 0) });
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
        <Table dataSource={records} columns={tradeCols} rowKey="id" pagination={false} size="middle"
          locale={{ emptyText: '暂无记录' }} />
      </Card>

      <Card title="💰 利息记录" extra={
        <Button icon={<PlusOutlined />} onClick={() => { interestForm.resetFields(); setInterestModalOpen(true); }}>记录利息</Button>
      } style={{ marginBottom: 16 }}>
        <Table dataSource={interestRecords} columns={interestCols} rowKey="id" pagination={false} size="middle"
          locale={{ emptyText: '暂无利息记录' }} />
      </Card>

      <Card title="📈 盈利走势图" style={{ marginBottom: 16 }}>
        <ReactECharts option={chartOption} style={{ height: 350 }} />
      </Card>

      {/* Trade Modal */}
      <Modal title={editingRecord ? '✏️ 编辑记录' : '➕ 新增记录'} open={modalOpen}
        onOk={handleSubmit} onCancel={() => setModalOpen(false)} destroyOnClose width={480}>
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
      <Modal title="💰 记录利息" open={interestModalOpen} onOk={handleInterestSubmit} onCancel={() => setInterestModalOpen(false)} destroyOnClose>
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
