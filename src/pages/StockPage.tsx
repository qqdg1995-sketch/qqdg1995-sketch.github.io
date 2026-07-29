/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { Card, Button, Modal, Form, InputNumber, Input, Space, Popconfirm, message, Statistic, Row, Col, DatePicker, Select, Tag, Empty, Alert, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined, MinusOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useYearStore } from '../store/useYearStore';
import { useStockStore } from '../store/useStockStore';
import { useAuthStore } from '../store/useAuthStore';
import type { StockPortfolio, StockRecord } from '../types';
import dayjs from 'dayjs';
import ResponsiveTable from '../components/ResponsiveTable';

export default function StockPage() {
  const { user } = useAuthStore();
  const { currentYear } = useYearStore();
  const { portfolios, records, loadPortfolios, loadRecords, addPortfolio, updatePortfolio, deletePortfolio, addRecord, deleteRecord, getHoldingMap, calculateSellProfit, getPortfolioStats } = useStockStore();
  const [activePF, setActivePF] = useState<string>('');
  const [pfModalOpen, setPfModalOpen] = useState(false);
  const [editingPF, setEditingPF] = useState<StockPortfolio | null>(null);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [recordType, setRecordType] = useState<'buy' | 'sell'>('buy');
  const [pfForm] = Form.useForm();
  const [recForm] = Form.useForm();
  const [sellPreview, setSellPreview] = useState<{ costBasis: number; sellRevenue: number; profit: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const userId = user?.id || '';
  const year = currentYear!;

  useEffect(() => {
    if (userId && currentYear) {
      setLoading(true);
      Promise.all([loadPortfolios(userId, currentYear), loadRecords(userId, currentYear)])
        .finally(() => setLoading(false));
    }
  }, [userId, currentYear, loadPortfolios, loadRecords]);

  useEffect(() => {
    if (portfolios.length === 0) {
      setActivePF('');
    } else if (!portfolios.some((portfolio) => portfolio.id === activePF)) {
      setActivePF(portfolios[0].id);
    }
  }, [portfolios, activePF]);

  const pfRecords = records.filter((r) => r.portfolioId === activePF);
  const stats = activePF ? getPortfolioStats(activePF) : null;
  const holdingMap = activePF ? getHoldingMap(activePF) : {};

  const watchSellStock = Form.useWatch('stockName', recForm);
  const watchSellShares = Form.useWatch('shares', recForm);
  const watchSellPrice = Form.useWatch('unitPrice', recForm);

  useEffect(() => {
    if (recordType === 'sell' && watchSellStock && watchSellShares && watchSellPrice && activePF) {
      const result = calculateSellProfit(activePF, watchSellStock, watchSellShares, watchSellPrice);
      if ('error' in result) setSellPreview(null);
      else setSellPreview({ costBasis: result.costBasis, sellRevenue: result.sellRevenue, profit: result.profit });
    } else setSellPreview(null);
  }, [recordType, watchSellStock, watchSellShares, watchSellPrice, activePF, calculateSellProfit]);

  const handleAddPF = () => { setEditingPF(null); pfForm.resetFields(); setPfModalOpen(true); };
  const handleEditPF = (pf: StockPortfolio) => { setEditingPF(pf); pfForm.setFieldsValue(pf); setPfModalOpen(true); };

  const handlePFSubmit = () => {
    pfForm.validateFields().then(async (values) => {
      if (editingPF) await updatePortfolio(userId, year, editingPF.id, values);
      else await addPortfolio(userId, year, values);
      setPfModalOpen(false);
      message.success(editingPF ? '已更新' : '已添加');
    });
  };

  const handleDeletePF = async (id: string) => {
    await deletePortfolio(userId, year, id);
    setActivePF('');
    message.success('已删除账户');
  };

  const handleAddRecord = (type: 'buy' | 'sell') => {
    if (!activePF) { message.warning('请先选择一个账户'); return; }
    setRecordType(type);
    recForm.resetFields();
    recForm.setFieldsValue({ type, portfolioId: activePF, date: dayjs() });
    setSellPreview(null);
    setRecordModalOpen(true);
  };

  const handleRecordSubmit = () => {
    recForm.validateFields().then(async (values) => {
      const date = values.date.format('YYYY-MM-DD');
      if (values.type === 'buy') {
        const totalCost = values.shares * values.unitPrice;
        const result = await addRecord(userId, year, {
          portfolioId: activePF, date, type: 'buy',
          stockName: values.stockName, shares: values.shares,
          unitPrice: values.unitPrice, totalCost,
        });
        if (!result.success) { message.error(result.error); return; }
      } else {
        const calcResult = calculateSellProfit(activePF, values.stockName, values.shares, values.unitPrice);
        if ('error' in calcResult) { message.error(calcResult.error); return; }
        const totalCost = values.shares * values.unitPrice;
        const result = await addRecord(userId, year, {
          portfolioId: activePF, date, type: 'sell',
          stockName: values.stockName, shares: values.shares,
          unitPrice: values.unitPrice, totalCost, profit: calcResult.profit,
        });
        if (!result.success) { message.error(result.error); return; }
      }
      setRecordModalOpen(false);
      setSellPreview(null);
      message.success('已添加');
    });
  };

  const handleDeleteRecord = async (id: string) => {
    await deleteRecord(userId, year, id);
    message.success('已删除');
  };

  const stockMap: Record<string, { buy: number; profit: number }> = {};
  for (const r of pfRecords) {
    if (!stockMap[r.stockName]) stockMap[r.stockName] = { buy: 0, profit: 0 };
    if (r.type === 'buy') stockMap[r.stockName].buy += r.totalCost;
    if (r.type === 'sell') stockMap[r.stockName].profit += r.profit || 0;
  }
  const stockNames = Object.keys(stockMap);

  const barOption = stockNames.length > 0 ? {
    tooltip: { trigger: 'axis' },
    grid: { left: 80, right: 20, top: 20, bottom: 50 },
    xAxis: { type: 'category', data: stockNames, axisLabel: { rotate: 20, fontSize: 11 } },
    yAxis: { type: 'value', name: '元 (¥)' },
    series: [{
      name: '盈亏', type: 'bar',
      data: stockNames.map((n) => ({
        value: stockMap[n].profit,
        itemStyle: { color: stockMap[n].profit >= 0 ? '#ef4444' : '#10b981', borderRadius: [4, 4, 0, 0] },
      })),
    }],
  } : null;

  const recColumns = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 95 },
    { title: '股票', dataIndex: 'stockName', key: 'stockName', width: 80, render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { title: '操作', dataIndex: 'type', key: 'type', width: 55,
      render: (v: string) => v === 'buy' ? <Tag color="red" style={{ margin: 0 }}>买入</Tag> : <Tag color="green" style={{ margin: 0 }}>卖出</Tag> },
    { title: '份额', dataIndex: 'shares', key: 'shares', align: 'right' as const, render: (v: number) => `${v}股` },
    { title: '单价', dataIndex: 'unitPrice', key: 'unitPrice', align: 'right' as const, render: (v: number) => `¥${v?.toFixed(2)}` },
    { title: '成本', dataIndex: 'totalCost', key: 'totalCost', align: 'right' as const, render: (v: number) => `¥${v?.toLocaleString()}` },
    { title: '盈利', dataIndex: 'profit', key: 'profit', align: 'right' as const, width: 85,
      render: (v: number, record: StockRecord) => {
        if (record.type === 'buy') return '-';
        return <span style={{ color: (v || 0) >= 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
          {(v || 0) >= 0 ? '+' : ''}¥{(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
      } },
    { title: '操作', key: 'action', width: 80,
      render: (_: unknown, record: StockRecord) => (
        <Popconfirm title="确认删除？" onConfirm={() => handleDeleteRecord(record.id)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ) },
  ];

  const holdingEntries = Object.entries(holdingMap).filter(([, d]) => d.shares > 0);
  const holdingColumns = [
    { title: '股票', dataIndex: 'name', key: 'name', render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { title: '持仓份额', dataIndex: 'shares', key: 'shares', align: 'right' as const, render: (v: number) => `${v} 股` },
    { title: '持仓成本', dataIndex: 'cost', key: 'cost', align: 'right' as const, render: (v: number) => `¥${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
    { title: '均价', dataIndex: 'avgPrice', key: 'avgPrice', align: 'right' as const, render: (v: number) => `¥${v.toFixed(2)}` },
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>;

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row align="middle" gutter={16}>
          <Col flex="auto">
            <Space wrap>
              <span style={{ fontWeight: 600, color: '#475569' }}>📂 账户：</span>
              {portfolios.map((pf) => (
                <Button key={pf.id} type={activePF === pf.id ? 'primary' : 'default'} size="small"
                  onClick={() => setActivePF(pf.id)} style={{ borderRadius: 8 }}>
                  {pf.name} {pf.totalInvest ? <span style={{ fontSize: 11, opacity: 0.7 }}>(¥{pf.totalInvest.toLocaleString()})</span> : ''}
                </Button>
              ))}
              <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAddPF} style={{ borderRadius: 8 }}>添加账户</Button>
            </Space>
          </Col>
        </Row>
        {portfolios.map((pf) => (
          <div key={pf.id} style={{ display: activePF === pf.id ? 'block' : 'none', marginTop: 8 }}>
            <Space size={4}>
              <Button type="link" size="small" onClick={() => handleEditPF(pf)}>编辑</Button>
              <Popconfirm title="删除账户将同时删除所有记录，确认？" onConfirm={() => handleDeletePF(pf.id)}>
                <Button type="link" size="small" danger>删除账户</Button>
              </Popconfirm>
            </Space>
          </div>
        ))}
      </Card>

      {!activePF ? <Empty description="请选择一个账户或添加新账户 📂" /> : (
        <>
          {stats && (
            <>
              <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={12} sm={6}><Card><Statistic title="💵 总投资金额" value={stats.totalInvest} precision={2} prefix="¥" valueStyle={{ fontSize: 18, fontWeight: 600 }} /></Card></Col>
                <Col xs={12} sm={6}><Card><Statistic title="📈 已回收利润" value={stats.recoveredProfit} precision={2} prefix="¥" valueStyle={{ color: stats.recoveredProfit >= 0 ? '#ef4444' : '#10b981', fontSize: 18, fontWeight: 600 }} /></Card></Col>
                <Col xs={12} sm={6}><Card><Statistic title="📦 在市成本" value={stats.holdingCost} precision={2} prefix="¥" valueStyle={{ fontSize: 18, fontWeight: 600 }} /></Card></Col>
                <Col xs={12} sm={6}><Card><Statistic title="💤 闲置资金" value={stats.idleFunds} precision={2} prefix="¥" valueStyle={{ fontSize: 18, fontWeight: 600, color: '#94a3b8' }} /></Card></Col>
              </Row>

              {holdingEntries.length > 0 && (
                <Card title="📦 当前持仓" style={{ marginBottom: 16 }} size="small">
                  <ResponsiveTable dataSource={holdingEntries.map(([name, d]) => ({ name, shares: d.shares, cost: d.totalCost, avgPrice: d.avgPrice }))}
                    columns={holdingColumns} rowKey="name" size="small" minWidth={520} />
                </Card>
              )}

              <Card title="📋 交易记录" extra={
                <Space>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddRecord('buy')} style={{ background: '#ef4444', borderColor: '#ef4444' }}>新增买入</Button>
                  <Button icon={<MinusOutlined />} onClick={() => handleAddRecord('sell')} style={{ color: '#10b981', borderColor: '#10b981' }}>新增卖出</Button>
                </Space>
              } style={{ marginBottom: 16 }}>
                <ResponsiveTable dataSource={pfRecords} columns={recColumns} rowKey="id" size="small"
                  emptyText="暂无交易记录，点击上方按钮开始记录 🚀" minWidth={850} />
              </Card>

              {barOption && (
                <Card title="📊 各股票盈亏" style={{ marginBottom: 16 }}>
                  <ReactECharts option={barOption} style={{ height: 350 }} />
                </Card>
              )}
            </>
          )}
        </>
      )}

      <Modal title={editingPF ? '✏️ 编辑账户' : '➕ 添加账户'} open={pfModalOpen}
        onOk={handlePFSubmit} onCancel={() => setPfModalOpen(false)} destroyOnHidden width={420}>
        <Form form={pfForm} layout="vertical">
          <Form.Item name="name" label="📛 账户名称" rules={[{ required: true }]}>
            <Input placeholder="如：爸股票投资" />
          </Form.Item>
          <Form.Item name="totalInvest" label="💵 总投资金额" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={recordType === 'buy' ? '🟢 新增买入' : '🔴 新增卖出'} open={recordModalOpen}
        onOk={handleRecordSubmit} onCancel={() => { setRecordModalOpen(false); setSellPreview(null); }}
        destroyOnHidden width={500}>
        <Form form={recForm} layout="vertical">
          <Form.Item name="type" hidden><Input /></Form.Item>
          <Form.Item name="portfolioId" hidden><Input /></Form.Item>
          <Form.Item name="date" label="📅 日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          {recordType === 'buy' ? (
            <>
              <Form.Item name="stockName" label="📛 股票名称" rules={[{ required: true }]}>
                <Input placeholder="如：博瑞医药" />
              </Form.Item>
              <Form.Item name="shares" label="📦 份额（股）" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
              <Form.Item name="unitPrice" label="💵 单价" rules={[{ required: true }]}>
                <InputNumber min={0} precision={4} prefix="¥" style={{ width: '100%' }} placeholder="0.0000" />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item name="stockName" label="📛 选择卖出股票" rules={[{ required: true }]}>
                <Select placeholder="选择持仓股票" options={
                  holdingEntries.map(([name, d]) => ({
                    label: `${name}（持仓 ${d.shares} 股，均价 ¥${d.avgPrice.toFixed(2)}）`, value: name,
                  }))
                } />
              </Form.Item>
              {watchSellStock && holdingMap[watchSellStock] && (
                <Alert message={`📦 "${watchSellStock}" 当前持仓 ${holdingMap[watchSellStock].shares} 股，成本均价 ¥${holdingMap[watchSellStock].avgPrice.toFixed(2)}`}
                  type="info" showIcon style={{ marginBottom: 16, borderRadius: 8 }} />
              )}
              <Form.Item name="shares" label="📤 卖出份额（股）" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} placeholder="0"
                  max={watchSellStock ? holdingMap[watchSellStock]?.shares : undefined} />
              </Form.Item>
              <Form.Item name="unitPrice" label="💵 卖出单价" rules={[{ required: true }]}>
                <InputNumber min={0} precision={4} prefix="¥" style={{ width: '100%' }} placeholder="0.0000" />
              </Form.Item>
              {sellPreview && (
                <Card size="small" style={{ marginBottom: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <Row gutter={[8, 8]}>
                    <Col span={12}><Statistic title="📥 成本基础" value={sellPreview.costBasis} precision={2} prefix="¥" valueStyle={{ fontSize: 16, fontWeight: 600 }} /></Col>
                    <Col span={12}><Statistic title="📤 卖出收入" value={sellPreview.sellRevenue} precision={2} prefix="¥" valueStyle={{ fontSize: 16, fontWeight: 600, color: '#10b981' }} /></Col>
                    <Col span={24}><Statistic title="💹 预估盈利" value={sellPreview.profit} precision={2} prefix="¥"
                      valueStyle={{ fontSize: 20, fontWeight: 700, color: sellPreview.profit >= 0 ? '#ef4444' : '#10b981' }} /></Col>
                  </Row>
                </Card>
              )}
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
