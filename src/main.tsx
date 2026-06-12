import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './index.css';

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (reg) => console.log('SW registered:', reg.scope),
      (err) => console.log('SW registration failed:', err)
    );
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#6366f1',
          borderRadius: 10,
          borderRadiusLG: 14,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
          colorBgContainer: '#ffffff',
          colorBorderSecondary: '#e2e8f0',
          fontSize: 14,
        },
        components: {
          Card: {
            borderRadiusLG: 14,
          },
          Table: {
            borderRadius: 10,
            headerBg: '#f8fafc',
            headerColor: '#475569',
          },
          Button: {
            borderRadius: 8,
            primaryShadow: '0 2px 8px rgba(99,102,241,0.3)',
          },
          Tabs: {
            horizontalItemPadding: '8px 16px',
            inkBarColor: '#6366f1',
          },
          Modal: {
            borderRadiusLG: 16,
          },
          Input: {
            borderRadius: 8,
          },
          InputNumber: {
            borderRadius: 8,
          },
          Select: {
            borderRadius: 8,
          },
          DatePicker: {
            borderRadius: 8,
          },
        },
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);
