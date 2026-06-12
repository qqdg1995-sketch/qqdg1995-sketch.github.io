import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Button, Typography, Tabs, Modal, Input, message, Card, Row, Col, Spin } from 'antd';
import { PlusOutlined, RightOutlined, LogoutOutlined, HomeOutlined } from '@ant-design/icons';
import { useYearStore } from './store/useYearStore';
import { useAuthStore } from './store/useAuthStore';
import AuthPage from './pages/AuthPage';
import SalaryPage from './pages/SalaryPage';
import JPYPage from './pages/JPYPage';
import AUDPage from './pages/AUDPage';
import GoldPage from './pages/GoldPage';
import ParentPage from './pages/ParentPage';
import BonusPage from './pages/BonusPage';
import BigExpensePage from './pages/BigExpensePage';
import StockPage from './pages/StockPage';
import SummaryPage from './pages/SummaryPage';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

const modules = [
  { key: 'salary', label: '每月工资单', emoji: '💰' },
  { key: 'jpy', label: '日元理财', emoji: '💴' },
  { key: 'aud', label: '澳元理财', emoji: '🦘' },
  { key: 'gold', label: '黄金理财', emoji: '🥇' },
  { key: 'parent', label: '爸妈援助', emoji: '👨‍👩‍👧' },
  { key: 'bonus', label: '奖金收入', emoji: '🎁' },
  { key: 'big-expense', label: '大额消费', emoji: '🛒' },
  { key: 'stock', label: '股票投资', emoji: '📈' },
  { key: 'summary', label: '年度汇总', emoji: '📊' },
];

// --- Year Book Selection Page ---
function YearBookPage() {
  const { years, loading, loadYears, addYear, switchYear } = useYearStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [newYear, setNewYear] = useState('');

  useEffect(() => {
    if (user) loadYears(user.id);
  }, [user]);

  const handleCreate = async () => {
    if (!user) return;
    const y = parseInt(newYear);
    if (!y || y < 2000 || y > 2100) { message.error('请输入有效的年份（2000-2100）'); return; }
    await addYear(user.id, y);
    setShowCreate(false);
    setNewYear('');
    message.success(`🎉 ${y}年度记账本已创建`);
    switchYear(y);
    navigate('/salary');
  };

  const handleEnter = (year: number) => {
    switchYear(year);
    navigate('/salary');
  };

  const yearEmojis = ['📅', '🗓️', '✨', '🌟', '💫', '🎯', '🔥', '📋'];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e9f2 100%)', padding: '40px 16px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🏦</div>
          <Title level={2} style={{ margin: '0 0 8px', fontWeight: 700, color: '#1e293b' }}>
            我的财富账本
          </Title>
          <Text style={{ fontSize: 15, color: '#64748b' }}>
            记录每一份收入，见证每一次成长 📝
          </Text>
        </div>

        {showCreate && (
          <Card style={{ marginBottom: 24, borderRadius: 16, border: '2px dashed #6366f1', background: '#f0f0ff' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🆕</div>
              <Text style={{ display: 'block', marginBottom: 16, color: '#475569', fontSize: 14 }}>
                新的一年，新的开始！输入年份创建记账本吧
              </Text>
              <Input size="large" placeholder="请输入年份，如 2026" value={newYear}
                onChange={(e) => setNewYear(e.target.value)} onPressEnter={handleCreate}
                style={{ maxWidth: 280, margin: '0 auto 12px', borderRadius: 12, textAlign: 'center' }} />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <Button size="large" onClick={() => { setShowCreate(false); setNewYear(''); }} style={{ borderRadius: 10 }}>返回</Button>
                <Button type="primary" size="large" onClick={handleCreate}
                  style={{ borderRadius: 10, background: '#6366f1', borderColor: '#6366f1' }}>创建账本 ✨</Button>
              </div>
            </div>
          </Card>
        )}

        {loading && <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>}

        {!loading && years.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: 600, color: '#475569' }}>📚 我的记账本</Text>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreate(true)}
                style={{ borderRadius: 10, background: '#6366f1', borderColor: '#6366f1' }}>新建账本</Button>
            </div>
            <Row gutter={[16, 16]}>
              {years.map((y, idx) => (
                <Col xs={24} sm={12} md={8} key={y.year}>
                  <Card hoverable onClick={() => handleEnter(y.year)}
                    style={{ borderRadius: 16, border: '2px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease', overflow: 'hidden' }}
                    bodyStyle={{ padding: '24px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 36, marginBottom: 8 }}>{yearEmojis[idx % yearEmojis.length]}</div>
                        <Title level={3} style={{ margin: 0, color: '#1e293b' }}>{y.year} 年</Title>
                      </div>
                      <Button type="primary" shape="circle" icon={<RightOutlined />} size="large"
                        style={{ background: '#6366f1', borderColor: '#6366f1' }} />
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        )}

        {!loading && years.length === 0 && !showCreate && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📖</div>
            <Title level={3} style={{ color: '#475569', margin: '0 0 8px' }}>还没有记账本</Title>
            <Text style={{ display: 'block', color: '#94a3b8', marginBottom: 24 }}>创建你的第一个年度记账本，开始记录财富吧！</Text>
            <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setShowCreate(true)}
              style={{ borderRadius: 12, height: 48, fontSize: 16, padding: '0 32px', background: '#6366f1', borderColor: '#6366f1' }}>
              创建我的第一个账本 🚀
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main App ---
function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, init: initAuth, signOut } = useAuthStore();
  const { years, currentYear, loading: yearLoading, loadYears, switchYear, addYear } = useYearStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const mobile = winWidth <= 576;

  useEffect(() => {
    const onResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Initialize auth on mount
  useEffect(() => { initAuth(); }, []);

  // Load years when user is authenticated
  useEffect(() => {
    if (user) loadYears(user.id);
  }, [user]);

  // Auto-redirect to latest year when entering root
  useEffect(() => {
    if (years.length > 0 && !currentYear && location.pathname === '/') {
      const latest = years.reduce((max, y) => y.year > max.year ? y : max, years[0]);
      switchYear(latest.year);
      navigate('/salary', { replace: true });
    }
  }, [years, currentYear]);

  // Show spinner while checking auth
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' }}>
        <Spin size="large" />
      </div>
    );
  }

  // Not authenticated → show login/register
  if (!user) {
    return <AuthPage />;
  }

  // Determine active tab from path
  const pathSeg = location.pathname.split('/').filter(Boolean);
  const activeTab = pathSeg[0] || 'salary';

  const handleCreateYear = async () => {
    if (!user) return;
    const y = parseInt(newYearInput);
    if (!y || y < 2000 || y > 2100) { message.error('请输入有效的年份（2000-2100）'); return; }
    if (years.find((yr) => yr.year === y)) { message.error('该年度账本已存在'); return; }
    await addYear(user.id, y);
    setCreateOpen(false);
    setNewYearInput('');
    message.success(`🎉 ${y}年度记账本已创建`);
    await loadYears(user.id);
    switchYear(y);
    navigate('/salary');
  };

  const handleYearSwitch = (year: number) => {
    switchYear(year);
    navigate(`/${activeTab}`);
  };

  const handleTabChange = (key: string) => navigate(`/${key}`);
  const goHome = () => { navigate('/'); };

  // Year book selection page or loading
  if (!currentYear || yearLoading) {
    return <YearBookPage />;
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      <Header style={{
        background: '#fff', padding: mobile ? '0 8px' : '0 24px', display: 'flex', alignItems: 'center',
        borderBottom: '2px solid #f1f5f9', height: mobile ? 48 : 56, position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div onClick={goHome} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: mobile ? 4 : 8, flexShrink: 0 }}>
          <span style={{ fontSize: mobile ? 20 : 24 }}>🏦</span>
          {!mobile && <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>我的财富账本</span>}
        </div>
        <div style={{ flex: 1 }} />
        {mobile ? (
          <>
            <select value={currentYear} onChange={(e) => handleYearSwitch(Number(e.target.value))}
              style={{
                border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 13, fontWeight: 600,
                color: '#6366f1', outline: 'none', cursor: 'pointer', padding: '4px 20px 4px 8px',
                borderRadius: 8, fontFamily: 'inherit', maxWidth: 78,
              }}>
              {years.map((y) => (<option key={y.year} value={y.year}>{y.year}</option>))}
            </select>
            <Button type="text" size="small" icon={<HomeOutlined />} onClick={goHome}
              style={{ color: '#6366f1', fontSize: 12, padding: '0 4px', minWidth: 28 }} />
            <Button type="primary" size="small" icon={<PlusOutlined />}
              onClick={() => { setNewYearInput(''); setCreateOpen(true); }}
              style={{ background: '#6366f1', borderColor: '#6366f1', borderRadius: 8, padding: '0 6px', minWidth: 28 }} />
            <Button type="text" size="small" icon={<LogoutOutlined />} onClick={signOut}
              style={{ color: '#94a3b8', fontSize: 12, padding: '0 2px', minWidth: 24 }} />
          </>
        ) : (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc',
              borderRadius: 10, padding: '4px 12px', border: '1px solid #e2e8f0',
            }}>
              <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>📅</span>
              <select value={currentYear} onChange={(e) => handleYearSwitch(Number(e.target.value))}
                style={{
                  border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600,
                  color: '#6366f1', outline: 'none', cursor: 'pointer', padding: '2px 4px',
                  borderRadius: 6, fontFamily: 'inherit',
                }}>
                {years.map((y) => (<option key={y.year} value={y.year}>{y.year} 年</option>))}
              </select>
              <Button type="text" size="small" onClick={goHome} style={{ color: '#94a3b8', fontSize: 12 }}>切换账本</Button>
              <Button type="primary" size="small" icon={<PlusOutlined />}
                onClick={() => { setNewYearInput(''); setCreateOpen(true); }}
                style={{ background: '#6366f1', borderColor: '#6366f1', borderRadius: 8 }}>新建</Button>
            </div>
            <Button type="text" icon={<LogoutOutlined />} onClick={signOut}
              style={{ marginLeft: 12, color: '#94a3b8', fontSize: 12 }}>退出</Button>
          </>
        )}
      </Header>

      <div className="tab-bar-container" style={{
        background: '#fff', overflowX: 'auto', padding: mobile ? '0 4px' : '0 16px',
        position: 'sticky', top: mobile ? 48 : 56, zIndex: 99, borderBottom: '1px solid #f1f5f9',
        touchAction: 'pan-y',
      }}>
        <Tabs activeKey={activeTab} onChange={handleTabChange}
          items={modules.map((m) => ({ key: m.key, label: <span style={{ fontSize: mobile ? 11 : 13, whiteSpace: 'nowrap' }}>{m.emoji} {m.label}</span> }))}
          style={{ marginBottom: 0 }} size={mobile ? 'small' : 'middle'} tabBarStyle={{ marginBottom: 0 }} />
      </div>

      <Content style={{ padding: mobile ? '12px 8px' : '20px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        <Routes>
          <Route path="/salary" element={<SalaryPage />} />
          <Route path="/jpy" element={<JPYPage />} />
          <Route path="/aud" element={<AUDPage />} />
          <Route path="/gold" element={<GoldPage />} />
          <Route path="/parent" element={<ParentPage />} />
          <Route path="/bonus" element={<BonusPage />} />
          <Route path="/big-expense" element={<BigExpensePage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/summary" element={<SummaryPage />} />
          <Route path="*" element={<SalaryPage />} />
        </Routes>
      </Content>

      <Footer style={{
        textAlign: 'center', background: '#fff', borderTop: '1px solid #f1f5f9',
        padding: '10px', fontSize: 12, color: '#94a3b8',
      }}>
        ☁️ 数据云端同步 · 随时随地记账
      </Footer>

      {/* 新建年度账本弹窗 */}
      <Modal open={createOpen} title="🆕 创建新的年度记账本" onOk={handleCreateYear}
        onCancel={() => { setCreateOpen(false); setNewYearInput(''); }}
        okText="创建账本 ✨" cancelText="取消"
        okButtonProps={{ style: { background: '#6366f1', borderColor: '#6366f1', borderRadius: 8 } }}>
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <Text style={{ display: 'block', marginBottom: 16, color: '#64748b' }}>
            新的一年，新的开始！输入年份创建新的记账本
          </Text>
          <Input size="large" placeholder="请输入年份，如 2027" value={newYearInput}
            onChange={(e) => setNewYearInput(e.target.value)}
            onPressEnter={handleCreateYear}
            style={{ maxWidth: 260, margin: '0 auto', borderRadius: 12, textAlign: 'center' }} />
        </div>
      </Modal>
    </Layout>
  );
}

export default App;
