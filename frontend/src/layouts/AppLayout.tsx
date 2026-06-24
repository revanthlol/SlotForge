import { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Tooltip } from 'antd';
import {
  DashboardOutlined, TeamOutlined, HomeOutlined, BookOutlined,
  AppstoreOutlined, SettingOutlined, CalendarOutlined,
  LogoutOutlined, UserOutlined, BellOutlined, MenuFoldOutlined,
  MenuUnfoldOutlined, NodeIndexOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../store/authContext';

const { Sider, Header, Content } = Layout;

const NAV_ITEMS = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: 'divider-1', type: 'divider', label: '' },
  { key: '/teachers', icon: <TeamOutlined />, label: 'Teachers' },
  { key: '/rooms', icon: <HomeOutlined />, label: 'Rooms' },
  { key: '/subjects', icon: <BookOutlined />, label: 'Subjects' },
  { key: '/sections', icon: <AppstoreOutlined />, label: 'Sections' },
  { key: 'divider-2', type: 'divider', label: '' },
  { key: '/constraints', icon: <SettingOutlined />, label: 'Constraints' },
  { key: '/timetable', icon: <CalendarOutlined />, label: 'Timetable' },
  { key: '/canvas', icon: <NodeIndexOutlined />, label: 'Canvas View' },
  { key: 'divider-3', type: 'divider', label: '' },
  { key: '/generate', icon: <ThunderboltOutlined />, label: 'Generate' },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: 'Profile' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout') { logout(); navigate('/login'); }
    },
  };

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--color-bg-base)' }}>
      <Sider
        collapsed={collapsed}
        collapsible
        trigger={null}
        width={220}
        collapsedWidth={64}
        style={{
          position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100,
          background: 'var(--color-bg-surface)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {/* Logo */}
        <div style={{
          height: 56, display: 'flex', alignItems: 'center',
          padding: collapsed ? '0 20px' : '0 20px',
          borderBottom: '1px solid var(--color-border)',
          gap: 10,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
          }}>⏱</div>
          {!collapsed && (
            <span style={{
              fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
            }}>SlotForge</span>
          )}
        </div>

        {/* Nav */}
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => { if (!key.startsWith('divider')) navigate(key); }}
          style={{ border: 'none', padding: '8px 0', flex: 1 }}
          items={NAV_ITEMS.filter(i => i.type !== 'divider').map(item => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
            style: { borderRadius: 8, margin: '1px 8px', width: 'calc(100% - 16px)' },
          }))}
        />

        {/* Collapse trigger */}
        <div style={{
          padding: '12px 0', borderTop: '1px solid var(--color-border)',
          display: 'flex', justifyContent: 'center',
        }}>
          <Tooltip title={collapsed ? 'Expand' : 'Collapse'} placement="right">
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-muted)', fontSize: 16, padding: '4px 8px',
              }}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          </Tooltip>
        </div>
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 64 : 220, transition: 'margin 0.2s' }}>
        {/* Header */}
        <Header style={{
          position: 'sticky', top: 0, zIndex: 99,
          background: 'rgba(10,15,30,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border)',
          padding: '0 24px',
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          gap: 12,
        }}>
          <Tooltip title="Notifications">
            <Badge count={2} size="small">
              <button style={{
                background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
                borderRadius: 8, width: 34, height: 34, cursor: 'pointer',
                color: 'var(--color-text-secondary)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <BellOutlined />
              </button>
            </Badge>
          </Tooltip>

          <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              padding: '4px 8px', borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-elevated)',
            }}>
              <Avatar size={24} src={user?.avatar} style={{ background: '#6366f1' }}>
                {user?.name?.[0]}
              </Avatar>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                {user?.name?.split(' ')[0]}
              </span>
            </div>
          </Dropdown>
        </Header>

        {/* Page content */}
        <Content style={{ padding: '24px', minHeight: 'calc(100vh - 56px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
