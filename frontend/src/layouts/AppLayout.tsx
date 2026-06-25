import { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Tooltip } from 'antd';

import {
  PieChartOutlined,
  UsergroupDeleteOutlined,
  EnvironmentOutlined,
  ContainerOutlined,
  PartitionOutlined,
  SlidersOutlined,
  TableOutlined,
  BuildOutlined,
  ExperimentOutlined,
  LogoutOutlined,
  UserOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../store/authContext';

const { Sider, Header, Content } = Layout;

const getDynamicGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const NAV_ITEMS = [
  { key: '/dashboard', icon: <PieChartOutlined />, label: 'Dashboard' },
  { key: '/teachers', icon: <UsergroupDeleteOutlined />, label: 'Teachers' },
  { key: '/rooms', icon: <EnvironmentOutlined />, label: 'Rooms' },
  { key: '/subjects', icon: <ContainerOutlined />, label: 'Subjects' },
  { key: '/sections', icon: <PartitionOutlined />, label: 'Sections' },
  { key: '/constraints', icon: <SlidersOutlined />, label: 'Constraints' },
  { key: '/timetable', icon: <TableOutlined />, label: 'Timetable' },
  { key: '/canvas', icon: <BuildOutlined />, label: 'Canvas View' },
  { key: '/generate', icon: <ExperimentOutlined />, label: 'Generate' },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const authContextValues = useAuth();
  const contextLoading = authContextValues?.loading || false;
  const user = authContextValues?.user;
  const logout = authContextValues?.logout;

  const navigate = useNavigate();
  const location = useLocation();
  const greeting = getDynamicGreeting();

  useEffect(() => {
    if (!contextLoading) {
      // Made it stay for 2.5 seconds (2500ms) so the custom animation can play beautifully
      const timer = setTimeout(() => {
        setIsInitializing(false);
      }, 2500); 
      return () => clearTimeout(timer);
    }
  }, [contextLoading]);

  // --- PREMIUM CUSTOM TIMETABLE MATRIX SPLASH SCREEN ---
  if (contextLoading || isInitializing) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#090d16',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        gap: 28
      }}>
        {/* Injecting the custom grid-building keyframe animations */}
        <style>{`
          .slotforge-matrix-spinner {
            display: grid;
            grid-template-columns: repeat(2, 16px);
            gap: 6px;
            transform: rotate(45deg);
          }
          .matrix-block {
            width: 16px;
            height: 16px;
            background: #6366f1,
            border-radius: 4px;
            animation: slotPulse 1.2s infinite ease-in-out;
          }
          .matrix-block:nth-child(1) { animation-delay: 0s; }
          .matrix-block:nth-child(2) { animation-delay: 0.2s; opacity: 0.8; }
          .matrix-block:nth-child(3) { animation-delay: 0.4s; opacity: 0.6; }
          .matrix-block:nth-child(4) { animation-delay: 0.6s; opacity: 0.4; }

          @keyframes slotPulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
              background: #818cf8;
            }
            50% {
              transform: scale(0.8);
              opacity: 0.2;
              background: #6366f1;
            }
          }
          
          .fade-up-text {
            animation: textReveal 1s ease forwards;
            opacity: 0;
            transform: translateY(8px);
          }
          @keyframes textReveal {
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Custom Matrix Spinner Instead of standard circle spinner */}
        <div className="slotforge-matrix-spinner">
          <div className="matrix-block" />
          <div className="matrix-block" />
          <div className="matrix-block" />
          <div className="matrix-block" />
        </div>
        
        {/* Sleek Minimal Branding Text */}
        <div className="fade-up-text" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontWeight: 700, fontSize: 15, color: '#f3f4f6',
            letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'system-ui'
          }}>
            SlotForge
          </span>
        </div>
      </div>
    );
  }

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: 'Profile' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout' && logout) { logout(); navigate('/login'); }
    },
  };

  const menuItems = [
    ...NAV_ITEMS.map(item => ({
      key: item.key,
      icon: item.icon,
      label: item.label,
      style: { borderRadius: 8, margin: '2px 8px', width: 'calc(100% - 16px)' },
    })),
    {
      key: 'toggle-collapse',
      icon: collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />,
      label: collapsed ? '' : 'Collapse Menu',
      style: { 
        borderRadius: 8, 
        margin: 'auto 8px 12px 8px', 
        width: 'calc(100% - 16px)',
        borderTop: '1px solid var(--color-border)',
        paddingTop: 12
      }
    }
  ];

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
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{
          height: 56, display: 'flex', alignItems: 'center',
          padding: '0 18px',
          borderBottom: '1px solid var(--color-border)',
          gap: 10,
          flexShrink: 0
        }}>
           <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>⏱</div>
           {!collapsed && (
          <span style={{
              fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
            }}>SlotForge</span>

          )}

        </div>

        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => {
            if (key === 'toggle-collapse') {
              setCollapsed(!collapsed);
            } else {
              navigate(key);
            }
          }}
          style={{ 
            border: 'none', 
            padding: '8px 0', 
            display: 'flex', 
            flexDirection: 'column', 
            height: 'calc(100% - 56px)' 
          }}
          items={menuItems}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 64 : 220, transition: 'margin 0.2s' }}>
        <Header style={{
          position: 'sticky', top: 0, zIndex: 99,
          background: 'rgba(9,13,22,0.80)', 
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border)',
          padding: '0 24px',
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          gap: 16,
        }}>
          <Tooltip title="Notifications">
            <Badge count={2} size="small">
              <button style={{
                background: 'transparent', border: 'none',
                cursor: 'pointer', color: 'var(--color-text-secondary)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, padding: 4
              }}>
                <BellOutlined />
              </button>
            </Badge>
          </Tooltip>

          <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              padding: '4px 8px', borderRadius: 8,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 400 }}>
                {greeting},
              </span>
              <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500, marginRight: 4 }}>
                {user?.name?.split(' ')[0] || 'Admin'}
              </span>
              <Avatar size={26} src={user?.avatar} style={{ background: '#14b8a6', color: '#090d16', fontWeight: 600 }}>
                {user?.name?.[0] || 'A'}
              </Avatar>
            </div>
          </Dropdown>
        </Header>

        <Content style={{ padding: '24px', minHeight: 'calc(100vh - 56px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}