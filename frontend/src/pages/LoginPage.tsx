import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
      navigate(redirectTo.startsWith('/') ? redirectTo : '/dashboard', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 mb-10">
          <img src={theme === 'dark' ? '/logo/logo-dark.svg' : '/logo/logo.svg'} alt="SlotForge Logo" className="w-12 h-12 object-contain" />
          <div>
            <h1 className="text-headline-md text-on-surface">SlotForge</h1>
            <p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>
              Institutional Scheduling
            </p>
          </div>
        </Link>

        {/* Card */}
        <div className="bg-paper-raised border-2 border-rule rounded-xl p-8 shadow-lg">
          <h2 className="text-headline-sm text-on-surface mb-1">Sign In</h2>
          <p className="text-body-sm text-on-surface-variant mb-6">
            Access your institution's scheduling dashboard
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 bg-error-container text-on-error-container text-sm rounded-lg border border-error/20">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-label-caps text-on-surface-variant block mb-2" style={{ fontSize: 10 }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="academic-input w-full"
                placeholder="admin@institution.edu"
                required
              />
            </div>
            <div>
              <label className="text-label-caps text-on-surface-variant block mb-2" style={{ fontSize: 10 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="academic-input w-full"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-on-primary font-semibold rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-body-sm text-on-surface-variant mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary font-semibold hover:underline">
              Register Institution
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
