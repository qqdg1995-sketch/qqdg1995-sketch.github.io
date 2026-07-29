import { useEffect, useState, useMemo } from 'react';
import { Card, Button, Modal, Form, InputNumber, Input, Space, Popconfirm, message, Statistic, Row, Col, DatePicker, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useYearStore } from '../store/useYearStore';
import { useBonusStore } from '../store/useBonusStore';
import { useAuthStore } from '../store/useAuthStore';
import type { BonusRecord } from '../types';
import dayjs from 'dayjs';
import ResponsiveTable from '../components/ResponsiveTable';

export default function BonusPage() {
  const { user } = useAuthStore();
  const { currentYear } = useYearStore();
  const { records, loading, loadRecords, addRecord, deleteRecord } = useBonusStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BonusRecord | null>(null);
  const [form] = Form.useForm();

  const userId = user?.id || '';
  const year = currentYear!;

  useEffect(() => {
    if (userId && currentYear) loadRecords(userId, currentYear);
  }, [userId, currentYear, loadRecords]);

  const stats = useMemo(() => {
    const totalBonus = records.reduce((s, r) => s + r.amount, 0);
    const count = records.length;
    const avgBonus = count > 0 ? totalBonus / count : 0;
    return { totalBonus, count, avgBonus };
  }, [records]);

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (record: BonusRecord) => {
    setEditingRecord(record);
    form.setFieldsValue({ ...record, date: dayjs(record.date) });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then(async (values) => {
      const data: BonusRecord = {
        id: editingRecord?.id || '',
        date: values.date.format('YYYY-MM-DD'),
        amount: values.amount,
        note: values.note || '',
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

  // Monthly trend chart
  const monthlyMap: Record<string, number> = {};
  for (const r of records) {
    const m = r.date.slice(0, 7);
    monthlyMap[m] = (monthlyMap[m] || 0) + r.amount;
  }
  const months = Object.keys(monthlyMap).sort();

  const barOption = {
    tooltip: { trigger: 'axis', formatter: (p: Array<{ name: string; value: number }>) => `${p[0].name}<br/>奖金: ¥${p[0].value.toLocaleString()}` },
    grid: { left: 80, right: 20, top: 20, bottom: 50 },
    xAxis: { type: 'category', data: months, axisLabel: { rotate: 30, fontSize: 11, interval: 0 } },
    yAxis: { type: 'value', name: '元 (¥)' },
    series: [{
      type: 'bar', data: months.map((m) => monthlyMap[m]),
      itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] },
    }],
  };

  const columns = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 120, sorter: (a: BonusRecord, b: BonusRecord) => a.date.localeCompare(b.date) },
    { title: '金额', dataIndex: 'amount', key: 'amount', align: 'right' as const, width: 140,
      render: (v: number) => <span style={{ fontWeight: 600, color: '#f59e0b' }}>¥{v.toLocaleString()}</span> },
    { title: '备注', dataIndex: 'note', key: 'note', ellipsis: true },
    { title: '操作', key: 'action', width: 110,
      render: (_: unknown, record: BonusRecord) => (
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
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={8}><Card>
          <Statistic title="🎁 奖金总收入" value={stats.totalBonus} precision={2} prefix="¥"
            valueStyle={{ color: '#f59e0b', fontSize: 22, fontWeight: 600 }} />
        </Card></Col>
        <Col xs={8}><Card>
          <Statistic title="📋 记录笔数" value={stats.count} suffix="笔"
            valueStyle={{ color: '#6366f1', fontSize: 22, fontWeight: 600 }} />
        </Card></Col>
        <Col xs={8}><Card>
          <Statistic title="📊 笔均奖金" value={stats.avgBonus} precision={2} prefix="¥"
            valueStyle={{ color: '#10b981', fontSize: 22, fontWeight: 600 }} />
        </Card></Col>
      </Row>

      <Card title="🎁 奖金收入记录"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增记录</Button>}
        style={{ marginBottom: 16 }}>
        <ResponsiveTable dataSource={records} columns={columns} rowKey="id"
          emptyText="暂无奖金记录" />
      </Card>

      <Card title="📈 月度奖金趋势">
        <ReactECharts option={barOption} style={{ height: 350 }} />
      </Card>

      <Modal title={editingRecord ? '✏️ 编辑记录' : '➕ 新增奖金收入'} open={modalOpen}
        onOk={handleSubmit} onCancel={() => setModalOpen(false)} destroyOnHidden width={440}>
        <Form form={form} layout="vertical">
          <Form.Item name="date" label="📅 日期" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="amount" label="💵 金额" rules={[{ required: true, message: '请输入金额' }]}>
            <InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>
          <Form.Item name="note" label="📝 备注">
            <Input.TextArea rows={2} placeholder="如：年终奖、项目奖金、绩效奖金等" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
