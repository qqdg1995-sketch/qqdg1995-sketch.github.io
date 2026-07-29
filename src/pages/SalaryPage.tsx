import { useEffect, useState, useMemo } from 'react';
import { Card, Button, Modal, Form, InputNumber, Space, Popconfirm, message, Statistic, Row, Col, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useYearStore } from '../store/useYearStore';
import { useSalaryStore } from '../store/useSalaryStore';
import { useAuthStore } from '../store/useAuthStore';
import type { SalaryRecord } from '../types';
import ResponsiveTable from '../components/ResponsiveTable';

export default function SalaryPage() {
  const { user } = useAuthStore();
  const { currentYear } = useYearStore();
  const { records, loading, loadRecords, addRecord, updateRecord, deleteRecord } = useSalaryStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SalaryRecord | null>(null);
  const [form] = Form.useForm();

  const userId = user?.id || '';
  const year = currentYear!;

  useEffect(() => {
    if (userId && currentYear) loadRecords(userId, currentYear);
  }, [userId, currentYear, loadRecords]);

  // Build monthly data (computed from records)
  const monthlyData = useMemo(() => {
    const map: Record<number, { salary: number; expense: number }> = {};
    for (let m = 1; m <= 12; m++) map[m] = { salary: 0, expense: 0 };
    for (const r of records) {
      map[r.month] = { salary: r.salary, expense: r.expense };
    }
    return Object.entries(map).map(([month, d]) => ({
      month: Number(month), ...d, deposit: d.salary - d.expense,
    }));
  }, [records]);

  const totalDeposit = monthlyData.reduce((s, d) => s + d.deposit, 0);

  const handleAdd = () => { setEditingRecord(null); form.resetFields(); setModalOpen(true); };

  const handleEdit = (record: SalaryRecord) => {
    setEditingRecord(record);
    form.setFieldsValue({ month: record.month, salary: record.salary, expense: record.expense });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then(async (values) => {
      if (editingRecord) {
        await updateRecord(userId, year, editingRecord.id, {
          month: editingRecord.month,
          salary: values.salary,
          expense: values.expense || 0,
        });
      } else {
        if (records.some((record) => record.month === values.month)) {
          message.error(`${values.month}月已经有工资记录，请直接编辑原记录`);
          return;
        }
        await addRecord(userId, year, {
          id: '', month: values.month, salary: values.salary, expense: values.expense || 0,
        });
      }
      setModalOpen(false);
      message.success(editingRecord ? '已更新' : '已添加');
    });
  };

  const handleDelete = async (id: string) => {
    await deleteRecord(userId, year, id);
    message.success('已删除');
  };

  const salaryChartOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['工资', '存款', '支出'], top: 0 },
    grid: { left: 60, right: 20, top: 40, bottom: 50 },
    xAxis: { type: 'category', data: monthlyData.map((d) => `${d.month}月`),
      axisLabel: { rotate: 30, fontSize: 11, interval: 0 } },
    yAxis: { type: 'value', name: '元 (¥)' },
    series: [
      { name: '工资', type: 'bar', data: monthlyData.map((d) => d.salary), itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] } },
      { name: '存款', type: 'bar', data: monthlyData.map((d) => d.deposit), itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] } },
      { name: '支出', type: 'bar', data: monthlyData.map((d) => d.expense), itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] } },
    ],
  };

  const columns = [
    { title: '月份', dataIndex: 'month', key: 'month', render: (v: number) => `${v}月`, width: 70 },
    { title: '本月工资', dataIndex: 'salary', key: 'salary', align: 'right' as const,
      render: (v: number) => <span style={{ fontWeight: 500, color: '#6366f1' }}>¥{v.toLocaleString()}</span> },
    { title: '本月支出', dataIndex: 'expense', key: 'expense', align: 'right' as const,
      render: (v: number) => <span style={{ color: '#f59e0b' }}>{v ? `¥${v.toLocaleString()}` : '-'}</span> },
    { title: '本月存款', key: 'deposit', align: 'right' as const,
      render: (_: unknown, r: SalaryRecord) => {
        const d = r.salary - r.expense;
        return <span style={{ fontWeight: 600, color: d >= 0 ? '#10b981' : '#ef4444' }}>¥{d.toLocaleString()}</span>;
      } },
    { title: '操作', key: 'action', width: 110,
      render: (_: unknown, record: SalaryRecord) => (
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
        <Col xs={24} sm={8}><Card><Statistic title="💰 总计工资存款" value={totalDeposit} precision={2}
          prefix="¥" valueStyle={{ color: '#10b981', fontSize: 26, fontWeight: 700 }} /></Card></Col>
        <Col xs={12} sm={8}><Card><Statistic title="📋 已记录月份" value={records.length} suffix="/ 12"
          valueStyle={{ fontSize: 26, fontWeight: 700 }} /></Card></Col>
        <Col xs={12} sm={8}><Card><Statistic title="💸 月均存款" value={records.length > 0 ? (totalDeposit / records.length) : 0} precision={2}
          prefix="¥" valueStyle={{ color: '#6366f1', fontSize: 26, fontWeight: 700 }} /></Card></Col>
      </Row>

      <Card title="📋 每月工资单"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加月份记录</Button>}
        style={{ marginBottom: 16 }}>
        <ResponsiveTable dataSource={records} columns={columns} rowKey="id"
          emptyText={'暂无记录，点击"添加月份记录"开始记账吧 ✍️'} />
      </Card>

      <Card title="📊 收支对比图" style={{ marginBottom: 16 }}>
        <ReactECharts option={salaryChartOption} style={{ height: 400 }} />
      </Card>

      <Modal title={editingRecord ? '✏️ 编辑工资记录' : '➕ 添加工资记录'}
        open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} destroyOnHidden width={440}>
        <Form form={form} layout="vertical">
          <Form.Item name="month" label="📅 月份" rules={[{ required: true, message: '请选择月份' }]}>
            <InputNumber min={1} max={12} placeholder="1-12" style={{ width: '100%' }} disabled={!!editingRecord} />
          </Form.Item>
          <Form.Item name="salary" label="💵 本月工资" rules={[{ required: true, message: '请输入工资金额' }]}>
            <InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>
          <Form.Item name="expense" label="💸 本月支出" extra="本月工资存款 = 工资 - 支出，系统会自动计算">
            <InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
