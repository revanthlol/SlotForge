import { Row, Col, Card, Statistic, Button, Tag, Timeline, Empty } from 'antd';
import {
  TeamOutlined, HomeOutlined, BookOutlined, AppstoreOutlined,
  ThunderboltOutlined, CheckCircleOutlined, ClockCircleOutlined,
  ArrowRightOutlined, WarningOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../store/authContext';

const STATS = [
  { label: 'Teachers', value: 12, icon: <TeamOutlined />, color: '#6366f1', path: '/teachers' },
  { label: 'Rooms', value: 8, icon: <HomeOutlined />, color: '#06b6d4', path: '/rooms' },
  { label: 'Subjects', value: 24, icon: <BookOutlined />, color: '#10b981', path: '/subjects' },
  { label: 'Sections', value: 6, icon: <AppstoreOutlined />, color: '#f59e0b', path: '/sections' },
];

const ACTIVITY = [
  { label: 'Timetable generated for Semester 3', time: '2 hours ago', type: 'success' },
  { label: 'Conflict detected: Room 204 double-booked', time: '3 hours ago', type: 'warning' },
  { label: 'Teacher "Dr. Rao" availability updated', time: 'Yesterday', type: 'info' },
  { label: 'Section CS-B added', time: '2 days ago', type: 'info' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          Overview
        </p>
        <h1 style={{ margin: '4px 0 4px', fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
          Good morning, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 14 }}>
          Here's the current state of your timetable configuration.
        </p>
      </div>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {STATS.map(stat => (
          <Col xs={12} sm={6} key={stat.label}>
            <Card
              hoverable
              onClick={() => navigate(stat.path)}
              style={{ cursor: 'pointer' }}
              bodyStyle={{ padding: '20px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Statistic
                  title={stat.label}
                  value={stat.value}
                  valueStyle={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)' }}
                />
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: `${stat.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: stat.color, fontSize: 16,
                }}>
                  {stat.icon}
                </div>
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-muted)', fontSize: 12 }}>
                View all <ArrowRightOutlined style={{ fontSize: 10 }} />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        {/* Active timetable status */}
        <Col xs={24} lg={14}>
          <Card
            title={<span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>Active Timetable</span>}
            extra={<Button type="primary" size="small" icon={<ThunderboltOutlined />} onClick={() => navigate('/generate')}>Generate New</Button>}
          >
            <div style={{
              padding: '20px',
              background: 'var(--color-bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-strong)',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text-primary)' }}>Semester 3 — 2025–26</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Generated 2 hours ago · v3
                  </p>
                </div>
                <Tag color="success" icon={<CheckCircleOutlined />}>Published</Tag>
              </div>
              <Row gutter={16}>
                {[
                  { label: 'Sections covered', value: '6/6' },
                  { label: 'Conflicts', value: '0' },
                  { label: 'Slots filled', value: '142' },
                ].map(item => (
                  <Col span={8} key={item.label}>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {item.label}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {item.value}
                    </p>
                  </Col>
                ))}
              </Row>
            </div>
            <Button block onClick={() => navigate('/timetable')} style={{
              background: 'transparent', border: '1px solid var(--color-border-strong)',
              color: 'var(--color-text-secondary)',
            }}>
              View full timetable
            </Button>
          </Card>
        </Col>

        {/* Recent activity */}
        <Col xs={24} lg={10}>
          <Card title={<span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>Recent Activity</span>}>
            {ACTIVITY.length > 0 ? (
              <Timeline
                items={ACTIVITY.map(a => ({
                  dot: a.type === 'success'
                    ? <CheckCircleOutlined style={{ color: '#10b981' }} />
                    : a.type === 'warning'
                    ? <WarningOutlined style={{ color: '#f59e0b' }} />
                    : <ClockCircleOutlined style={{ color: 'var(--color-text-muted)' }} />,
                  children: (
                    <div>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-primary)' }}>{a.label}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{a.time}</p>
                    </div>
                  ),
                }))}
              />
            ) : (
              <Empty description="No recent activity" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
