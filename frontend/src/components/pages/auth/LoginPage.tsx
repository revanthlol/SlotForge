import { useState } from 'react';
import { Button, Form, Input, Divider, message } from 'antd';
import { GoogleOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useAuth } from '../../../store/authContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { loginWithGoogle, loginWithEmail, loading } = useAuth();
  const navigate = useNavigate();
  const [emailLoading, setEmailLoading] = useState(false);

  const handleGoogle = async () => {
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch {
      message.error('Google sign-in failed. Try again.');
    }
  };

  const handleEmail = async (values: { email: string; password: string }) => {
    setEmailLoading(true);
    try {
      await loginWithEmail(values.email, values.password);
      navigate('/dashboard');
    } catch {
      message.error('Invalid credentials.');
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    // Changed to inline flexbox styles to bypass missing Tailwind compilation
    <div 
      style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        background: 'var(--color-bg-base)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(99,102,241,0.08) 1px, transparent 0)',
        backgroundSize: '32px 32px',
        pointerEvents: 'none',
      }} />

      {/* Glow */}
      <div style={{
        position: 'fixed', top: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '400px', zIndex: 0,
        background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, padding: '0 24px' }}>
        {/* Logo */}
        <div className="text-center mb-10" style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 22, filter: 'brightness(10)' }}>⏱</span>
          </div>
          <h1 style={{
            margin: 0, fontSize: 26, fontWeight: 700,
            color: 'var(--color-text-primary)', letterSpacing: '-0.02em',
          }}>
            SlotForge
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
            Timetable Admin Panel
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '28px 28px',
        }}>
          {/* Google */}
          <Button
            size="large"
            block
            icon={<GoogleOutlined />}
            onClick={handleGoogle}
            loading={loading}
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-strong)',
              color: 'var(--color-text-primary)',
              height: 44,
              fontWeight: 500,
              borderRadius: 'var(--radius-sm)',
            }}
          >
            Continue with Google
          </Button>

          <Divider style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', fontSize: 12 }}>
            or sign in with email
          </Divider>

          <Form layout="vertical" onFinish={handleEmail} size="large">
            <Form.Item
              name="email"
              rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}
              style={{ marginBottom: 12 }}
            >
              <Input
                prefix={<MailOutlined style={{ color: 'var(--color-text-muted)' }} />}
                placeholder="admin@yourschool.edu"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Enter your password' }]}
              style={{ marginBottom: 20 }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'var(--color-text-muted)' }} />}
                placeholder="Password"
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={emailLoading}
              style={{ height: 44, fontWeight: 600, borderRadius: 'var(--radius-sm)' }}
            >
              Sign in
            </Button>
          </Form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--color-text-muted)', fontSize: 12 }}>
          For admins only · <a href="#" style={{ color: 'var(--color-accent-light)' }}>Request access</a>
        </p>
      </div>
    </div>
  );
}