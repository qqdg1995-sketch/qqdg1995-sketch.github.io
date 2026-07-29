import { useState } from 'react';
import { Form, Input, Button, Card, Tabs, message } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/useAuthStore';

export default function AuthPage() {
  const { signUp, signIn, clearError } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  const handleSubmit = async (values: { email: string; password: string }) => {
    clearError();
    setLoading(true);
    try {
      if (activeTab === 'register') {
        await signUp(values.email, values.password);
        message.success('✅ 注册成功！已发送确认邮件，请查收邮箱并确认后登录');
        setActiveTab('login');
      } else {
        await signIn(values.email, values.password);
      }
    } catch {
      // error is set in store
    } finally {
      setLoading(false);
    }
  };

  const authError = useAuthStore((s) => s.error);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <Card style={{ width: 400, borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>💰</div>
          <h2 style={{ margin: 0, fontSize: 22, color: '#1e293b' }}>个人理财记账</h2>
          <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
            云端同步，随时随地管理财富
          </p>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={(k) => { setActiveTab(k as 'login' | 'register'); clearError(); }}
          centered
          items={[
            { key: 'login', label: '登录' },
            { key: 'register', label: '注册' },
          ]}
        />

        {authError && (
          <div style={{
            background: '#fef2f2', color: '#dc2626', padding: '8px 12px',
            borderRadius: 8, marginBottom: 12, fontSize: 13,
          }}>
            {authError}
          </div>
        )}

        <Form onFinish={handleSubmit} layout="vertical" size="large">
          <Form.Item
            name="email"
            label="📧 邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效邮箱' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="your@email.com" autoComplete="email" />
          </Form.Item>

          <Form.Item
            name="password"
            label="🔑 密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="至少6位密码"
              autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}
              style={{
                height: 44, borderRadius: 10, fontSize: 15, fontWeight: 600,
                background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none',
              }}
            >
              {activeTab === 'login' ? '🚀 登录' : '✨ 注册'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
