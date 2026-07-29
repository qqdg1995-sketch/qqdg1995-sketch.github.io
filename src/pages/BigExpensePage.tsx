import { useEffect, useState, useMemo } from 'react';
import { Card, Button, Modal, Form, InputNumber, Input, Space, Popconfirm, message, Statistic, Row, Col, DatePicker, Select, Spin, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useYearStore } from '../store/useYearStore';
import { useBigExpenseStore } from '../store/useBigExpenseStore';
import { useIncomeRecoveryStore } from '../store/useIncomeRecoveryStore';
import { useAuthStore } from '../store/useAuthStore';
import type { BigExpenseRecord, IncomeRecoveryRecord } from '../types';
import dayjs from 'dayjs';
import ResponsiveTable from '../components/ResponsiveTable';

const expenseCategories = [
  { label: '🍔 餐饮美食', value: '餐饮美食' },
  { label: '🛍️ 购物消费', value: '购物消费' },
  { label: '🚗 交通出行', value: '交通出行' },
  { label: '🏠 住房家居', value: '住房家居' },
  { label: '🏥 医疗健康', value: '医疗健康' },
  { label: '📚 教育培训', value: '教育培训' },
  { label: '🎁 人情往来', value: '人情往来' },
  { label: '🎮 休闲娱乐', value: '休闲娱乐' },
  { label: '📱 数码电子', value: '数码电子' },
  { label: '📌 其他', value: '其他' },
];

const incomeCategories = [
  { label: '🔄 卖二手', value: '卖二手' },
  { label: '🧳 出差津贴', value: '出差津贴' },
  { label: '🎁 礼金红包', value: '礼金红包' },
  { label: '💸 退款返利', value: '退款返利' },
  { label: '🔧 兼职外快', value: '兼职外快' },
  { label: '📌 其他收入', value: '其他收入' },
];

const categoryColors: Record<string, string> = {
  '餐饮美食': '#f97316', '购物消费': '#ec4899', '交通出行': '#06b6d4',
  '住房家居': '#8b5cf6', '医疗健康': '#ef4444', '教育培训': '#3b82f6',
  '人情往来': '#e11d48', '休闲娱乐': '#10b981', '数码电子': '#6366f1',
  '其他': '#94a3b8',
};

const incomeColors: Record<string, string> = {
  '卖二手': '#10b981', '出差津贴': '#3b82f6', '礼金红包': '#f59e0b',
  '退款返利': '#06b6d4', '兼职外快': '#8b5cf6', '其他收入': '#94a3b8',
};

export default function BigExpensePage() {
  const { user } = useAuthStore();
  const { currentYear } = useYearStore();
  const { records, loading, loadRecords, addRecord, deleteRecord } = useBigExpenseStore();
  const { records: incomeRecords, loading: incomeLoading, loadRecords: loadIncomeRecords, addRecord: addIncomeRecord, deleteRecord: deleteIncomeRecord } = useIncomeRecoveryStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BigExpenseRecord | null>(null);
  const [editingIncomeRecord, setEditingIncomeRecord] = useState<IncomeRecoveryRecord | null>(null);
  const [form] = Form.useForm();
  const [incomeForm] = Form.useForm();

  const userId = user?.id || '';
  const year = currentYear!;

  useEffect(() => {
    if (userId && currentYear) {
      loadRecords(userId, currentYear);
      loadIncomeRecords(userId, currentYear);
    }
  }, [userId, currentYear, loadRecords, loadIncomeRecords]);

  // ─── 大额消费统计 ───────────────
  const expenseStats = useMemo(() => {
    const totalExpense = records.reduce((s, r) => s + r.amount, 0);
    const count = records.length;
    const avgExpense = count > 0 ? totalExpense / count : 0;
    return { totalExpense, count, avgExpense };
  }, [records]);

  // ─── 收入回血统计 ───────────────
  const incomeStats = useMemo(() => {
    const totalIncome = incomeRecords.reduce((s, r) => s + r.amount, 0);
    const count = incomeRecords.length;
    return { totalIncome, count };
  }, [incomeRecords]);

  // ─── 大额消费：新增/编辑 ───────────────
  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (record: BigExpenseRecord) => {
    setEditingRecord(record);
    form.setFieldsValue({ ...record, date: dayjs(record.date) });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then(async (values) => {
      const data: BigExpenseRecord = {
        id: editingRecord?.id || '', date: values.date.format('YYYY-MM-DD'),
        category: values.category, amount: values.amount, note: values.note || '',
      };
      await addRecord(userId, year, data);
      setModalOpen(false);
      message.success(editingRecord ? '已更新' : '已添加');
    });
  };

  const handleDelete = async (id: string) => {
    await deleteRecord(userId, year, id);
    message.success('已删除');
  };

  // ─── 收入回血：新增/编辑 ───────────────
  const handleIncomeAdd = () => {
    setEditingIncomeRecord(null);
    incomeForm.resetFields();
    setIncomeModalOpen(true);
  };

  const handleIncomeEdit = (record: IncomeRecoveryRecord) => {
    setEditingIncomeRecord(record);
    incomeForm.setFieldsValue({ ...record, date: dayjs(record.date) });
    setIncomeModalOpen(true);
  };

  const handleIncomeSubmit = () => {
    incomeForm.validateFields().then(async (values) => {
      const data: IncomeRecoveryRecord = {
        id: editingIncomeRecord?.id || '', date: values.date.format('YYYY-MM-DD'),
        category: values.category, amount: values.amount, note: values.note || '',
      };
      await addIncomeRecord(userId, year, data);
      setIncomeModalOpen(false);
      message.success(editingIncomeRecord ? '已更新' : '已添加');
    });
  };

  const handleIncomeDelete = async (id: string) => {
    await deleteIncomeRecord(userId, year, id);
    message.success('已删除');
  };

  // ─── 大额消费图表数据 ───────────────
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of records) {
      map[r.category] = (map[r.category] || 0) + r.amount;
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, itemStyle: { color: categoryColors[name] || '#94a3b8' } }))
      .sort((a, b) => b.value - a.value);
  }, [records]);

  const monthlyMap: Record<string, number> = {};
  for (const r of records) {
    const m = r.date.slice(0, 7);
    monthlyMap[m] = (monthlyMap[m] || 0) + r.amount;
  }
  const months = Object.keys(monthlyMap).sort();

  const pieOption = {
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    legend: { type: 'scroll', bottom: 0 },
    series: [{
      type: 'pie', radius: ['40%', '70%'], center: ['50%', '45%'],
      data: categoryData,
      label: { formatter: '{b}\n¥{c}', fontSize: 11 },
    }],
  };

  const barOption = {
    tooltip: { trigger: 'axis', formatter: (p: Array<{ name: string; value: number }>) => `${p[0].name}<br/>大额消费: ¥${p[0].value.toLocaleString()}` },
    grid: { left: 80, right: 20, top: 20, bottom: 50 },
    xAxis: { type: 'category', data: months, axisLabel: { rotate: 30, fontSize: 11, interval: 0 } },
    yAxis: { type: 'value', name: '元 (¥)' },
    series: [{
      type: 'bar', data: months.map((m) => monthlyMap[m]),
      itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] },
    }],
  };

  const expenseColumns = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 110 },
    { title: '类目', dataIndex: 'category', key: 'category', width: 120,
      render: (v: string) => (
        <span style={{ background: (categoryColors[v] || '#94a3b8') + '18', color: categoryColors[v] || '#475569',
          padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
          {v}
        </span>
      ) },
    { title: '金额', dataIndex: 'amount', key: 'amount', align: 'right' as const,
      render: (v: number) => <span style={{ fontWeight: 600, color: '#ef4444' }}>¥{v.toLocaleString()}</span> },
    { title: '备注', dataIndex: 'note', key: 'note', ellipsis: true },
    { title: '操作', key: 'action', width: 110,
      render: (_: unknown, record: BigExpenseRecord) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ) },
  ];

  const incomeColumns = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 110 },
    { title: '类目', dataIndex: 'category', key: 'category', width: 120,
      render: (v: string) => (
        <span style={{ background: (incomeColors[v] || '#94a3b8') + '18', color: incomeColors[v] || '#475569',
          padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
          {v}
        </span>
      ) },
    { title: '金额', dataIndex: 'amount', key: 'amount', align: 'right' as const,
      render: (v: number) => <span style={{ fontWeight: 600, color: '#10b981' }}>+¥{v.toLocaleString()}</span> },
    { title: '备注', dataIndex: 'note', key: 'note', ellipsis: true },
    { title: '操作', key: 'action', width: 110,
      render: (_: unknown, record: IncomeRecoveryRecord) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleIncomeEdit(record)} />
          <Popconfirm title="确认删除？" onConfirm={() => handleIncomeDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ) },
  ];

  if (loading && incomeLoading) return <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>;

  return (
    <div>
      {/* ======== 大额消费 ======== */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={8}><Card>
          <Statistic title="💸 大额消费总额" value={expenseStats.totalExpense} precision={2} prefix="¥"
            valueStyle={{ color: '#ef4444', fontSize: 22, fontWeight: 600 }} />
        </Card></Col>
        <Col xs={8}><Card>
          <Statistic title="📋 消费笔数" value={expenseStats.count} suffix="笔"
            valueStyle={{ color: '#6366f1', fontSize: 22, fontWeight: 600 }} />
        </Card></Col>
        <Col xs={8}><Card>
          <Statistic title="📊 笔均消费" value={expenseStats.avgExpense} precision={2} prefix="¥"
            valueStyle={{ color: '#f59e0b', fontSize: 22, fontWeight: 600 }} />
        </Card></Col>
      </Row>

      <Card title="🛒 大额消费记录"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增记录</Button>}
        style={{ marginBottom: 16 }}>
        <ResponsiveTable dataSource={records} columns={expenseColumns} rowKey="id"
          emptyText="暂无大额消费记录" />
      </Card>

      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}><Card title="🍩 消费类目分布"><ReactECharts option={pieOption} style={{ height: 350 }} /></Card></Col>
        <Col xs={24} md={12}><Card title="📈 月度消费趋势"><ReactECharts option={barOption} style={{ height: 350 }} /></Card></Col>
      </Row>

      <Divider style={{ margin: '8px 0 24px' }} />

      {/* ======== 收入回血 ======== */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12}><Card>
          <Statistic title="💰 回血总收入" value={incomeStats.totalIncome} precision={2} prefix="¥"
            valueStyle={{ color: '#10b981', fontSize: 22, fontWeight: 600 }} />
        </Card></Col>
        <Col xs={12}><Card>
          <Statistic title="📋 回血笔数" value={incomeStats.count} suffix="笔"
            valueStyle={{ color: '#6366f1', fontSize: 22, fontWeight: 600 }} />
        </Card></Col>
      </Row>

      <Card title={<span style={{ color: '#10b981' }}>💚 收入回血</span>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleIncomeAdd}
          style={{ background: '#10b981', borderColor: '#10b981' }}>新增收入</Button>}
        style={{ marginBottom: 16 }}>
        <ResponsiveTable dataSource={incomeRecords} columns={incomeColumns} rowKey="id"
          emptyText="暂无收入回血记录" />
      </Card>

      {/* 大额消费弹窗 */}
      <Modal title={editingRecord ? '✏️ 编辑记录' : '➕ 新增大额消费'} open={modalOpen}
        onOk={handleSubmit} onCancel={() => setModalOpen(false)} destroyOnHidden width={440}>
        <Form form={form} layout="vertical">
          <Form.Item name="date" label="📅 日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="category" label="🏷️ 消费类目" rules={[{ required: true }]}>
            <Select options={expenseCategories} placeholder="选择消费类目" />
          </Form.Item>
          <Form.Item name="amount" label="💵 金额 (≥500元)" rules={[
            { required: true, message: '请输入金额' },
            { type: 'number', min: 500, message: '大额消费记录需≥500元' },
          ]}>
            <InputNumber min={500} precision={2} prefix="¥" style={{ width: '100%' }} placeholder="500.00" />
          </Form.Item>
          <Form.Item name="note" label="📝 备注"><Input.TextArea rows={2} placeholder="买了什么？在哪里消费的？" /></Form.Item>
        </Form>
      </Modal>

      {/* 收入回血弹窗 */}
      <Modal title={editingIncomeRecord ? '✏️ 编辑收入回血' : '💰 新增收入回血'} open={incomeModalOpen}
        onOk={handleIncomeSubmit} onCancel={() => setIncomeModalOpen(false)} destroyOnHidden width={440}>
        <Form form={incomeForm} layout="vertical">
          <Form.Item name="date" label="📅 日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="category" label="🏷️ 收入类目" rules={[{ required: true }]}>
            <Select options={incomeCategories} placeholder="选择收入类目" />
          </Form.Item>
          <Form.Item name="amount" label="💵 金额" rules={[{ required: true, message: '请输入金额' }]}>
            <InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>
          <Form.Item name="note" label="📝 备注"><Input.TextArea rows={2} placeholder="描述收入来源" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
