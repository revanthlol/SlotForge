import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { motion } from 'motion/react';
import LoadingScreen from '../../../components/ui/LoadingScreen';
import AuthRouteNav from '../components/AuthRouteNav';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
      navigate(redirectTo.startsWith('/') ? redirectTo : '/', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingScreen label="Opening your workspace" />;

  return (
    <motion.div initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .32, ease: [0.16, 1, 0.3, 1] }} className="auth-screen min-h-screen px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl overflow-hidden rounded-2xl border-2 border-rule bg-paper-raised shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden border-r-2 border-rule bg-surface-container-low p-10 lg:flex lg:flex-col lg:justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={theme === 'dark' ? '/logo/logo-dark.svg' : '/logo/logo.svg'} alt="SlotForge Logo" className="h-12 w-12 object-contain" />
            <div>
              <h1 className="text-headline-md text-on-surface">SlotForge</h1>
              <p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>Institutional Scheduling</p>
            </div>
          </Link>
          <div>
            <p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>Control room</p>
            <h2 className="mt-4 max-w-xl text-[56px] font-semibold leading-[1.02] text-on-surface" style={{ fontFamily: 'var(--font-display)' }}>
              Return to the timetable bench.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-on-surface-variant">
              Pick up solver runs, resource edits, and onboarding progress without losing context.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {['Resources', 'Constraints', 'Versions'].map((item) => (
              <div key={item} className="rounded-xl border border-rule bg-paper-raised p-3">
                <p className="text-label-caps text-mono-grey" style={{ fontSize: 8 }}>{item}</p>
                <div className="mt-3 h-1.5 rounded-full bg-primary/70" />
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <Link to="/" className="mb-8 flex items-center gap-3 lg:hidden">
              <img src={theme === 'dark' ? '/logo/logo-dark.svg' : '/logo/logo.svg'} alt="SlotForge Logo" className="h-11 w-11 object-contain" />
              <div>
                <h1 className="text-headline-sm text-on-surface">SlotForge</h1>
                <p className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>Institutional Scheduling</p>
              </div>
            </Link>

          <AuthRouteNav />

          <h2 className="text-headline-sm text-on-surface mb-1">Sign in</h2>
          <p className="text-body-sm text-on-surface-variant mb-6">Access your scheduling workspace.</p>

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
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-60"
            >
              Sign in
            </button>
          </form>

          <p className="text-center text-body-sm text-on-surface-variant mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary font-semibold hover:underline">
              Register Institution
            </Link>
          </p>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
