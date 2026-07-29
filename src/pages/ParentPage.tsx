import { useEffect, useState, useMemo } from 'react';
import { Card, Button, Modal, Form, InputNumber, Input, Space, Popconfirm, message, Statistic, Row, Col, DatePicker, Select, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useYearStore } from '../store/useYearStore';
import { useParentStore } from '../store/useParentStore';
import { useAuthStore } from '../store/useAuthStore';
import type { ParentRecord } from '../types';
import dayjs from 'dayjs';
import ResponsiveTable from '../components/ResponsiveTable';
import { roundCurrency } from '../utils/finance';

export default function ParentPage() {
  const { user } = useAuthStore();
  const { currentYear } = useYearStore();
  const { records, loading, loadRecords, addRecord, deleteRecord } = useParentStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ParentRecord | null>(null);
  const [form] = Form.useForm();

  const userId = user?.id || '';
  const year = currentYear!;

  useEffect(() => {
    if (userId && currentYear) loadRecords(userId, currentYear);
  }, [userId, currentYear, loadRecords]);

  const stats = useMemo(() => {
    const totalSave = records.filter((r) => r.type === 'save').reduce((s, r) => s + r.amount, 0);
    const totalSpend = records.filter((r) => r.type === 'spend').reduce((s, r) => s + r.amount, 0);
    return { totalSave, totalSpend, remaining: roundCurrency(totalSave - totalSpend) };
  }, [records]);

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ type: 'save' });
    setModalOpen(true);
  };

  const handleEdit = (record: ParentRecord) => {
    setEditingRecord(record);
    form.setFieldsValue({ ...record, date: dayjs(record.date) });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then(async (values) => {
      const data: ParentRecord = {
        id: editingRecord?.id || '', date: values.date.format('YYYY-MM-DD'),
        type: values.type, amount: values.amount, note: values.note || '',
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

  const pieOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie', radius: ['40%', '70%'],
      data: [
        { value: stats.totalSave, name: '储蓄', itemStyle: { color: '#10b981' } },
        { value: stats.totalSpend, name: '消费', itemStyle: { color: '#f59e0b' } },
      ],
      label: { formatter: '{b}\n¥{c}' },
    }],
  };

  const monthlyMap: Record<string, { save: number; spend: number }> = {};
  for (const r of records) {
    const m = r.date.slice(0, 7);
    if (!monthlyMap[m]) monthlyMap[m] = { save: 0, spend: 0 };
    if (r.type === 'save') monthlyMap[m].save += r.amount;
    else monthlyMap[m].spend += r.amount;
  }
  const months = Object.keys(monthlyMap).sort();
  const barOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['储蓄', '消费'], top: 0 },
    grid: { left: 80, right: 20, top: 35, bottom: 50 },
    xAxis: { type: 'category', data: months, axisLabel: { rotate: 30, fontSize: 11, interval: 0 } },
    yAxis: { type: 'value', name: '元 (¥)' },
    series: [
      { name: '储蓄', type: 'bar', data: months.map((m) => monthlyMap[m].save), itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] } },
      { name: '消费', type: 'bar', data: months.map((m) => monthlyMap[m].spend), itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] } },
    ],
  };

  const columns = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 100 },
    { title: '金额', dataIndex: 'amount', key: 'amount', align: 'right' as const,
      render: (v: number) => <span style={{ fontWeight: 500 }}>¥{v.toLocaleString()}</span> },
    { title: '类型', dataIndex: 'type', key: 'type', width: 80,
      render: (v: string) => <span style={{ color: v === 'save' ? '#10b981' : '#f59e0b', fontWeight: 500 }}>
        {v === 'save' ? '💰 储蓄' : '💸 消费'}</span> },
    { title: '备注', dataIndex: 'note', key: 'note', ellipsis: true, width: 120 },
    { title: '操作', key: 'action', width: 110,
      render: (_: unknown, record: ParentRecord) => (
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
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }} className="equal-stat-cards">
        <Col xs={8}><Card><Statistic title="💰 总计储蓄" value={stats.totalSave} precision={2} prefix="¥"
          valueStyle={{ color: '#10b981', fontSize: 22, fontWeight: 600 }} /></Card></Col>
        <Col xs={8}><Card><Statistic title="💸 总计消费" value={stats.totalSpend} precision={2} prefix="¥"
          valueStyle={{ color: '#f59e0b', fontSize: 22, fontWeight: 600 }} /></Card></Col>
        <Col xs={8}><Card><Statistic title="💎 剩余金额" value={stats.remaining} precision={2} prefix="¥"
          valueStyle={{ color: stats.remaining >= 0 ? '#6366f1' : '#ef4444', fontSize: 22, fontWeight: 600 }} /></Card></Col>
      </Row>

      <Card title="👨‍👩‍👧 爸妈援助记录"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增记录</Button>}
        style={{ marginBottom: 16 }}>
        <ResponsiveTable dataSource={records} columns={columns} rowKey="id" />
      </Card>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}><Card title="🍩 储蓄 vs 消费"><ReactECharts option={pieOption} style={{ height: 350 }} /></Card></Col>
        <Col xs={24} md={12}><Card title="📊 每月收支"><ReactECharts option={barOption} style={{ height: 350 }} /></Card></Col>
      </Row>

      <Modal title={editingRecord ? '✏️ 编辑记录' : '➕ 新增记录'} open={modalOpen}
        onOk={handleSubmit} onCancel={() => setModalOpen(false)} destroyOnHidden width={440}>
        <Form form={form} layout="vertical">
          <Form.Item name="date" label="📅 日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="amount" label="💵 金额" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>
          <Form.Item name="type" label="🏷️ 钱款类型" rules={[{ required: true }]}>
            <Select options={[{ label: '💰 储蓄', value: 'save' }, { label: '💸 消费', value: 'spend' }]} />
          </Form.Item>
          <Form.Item name="note" label="📝 备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
