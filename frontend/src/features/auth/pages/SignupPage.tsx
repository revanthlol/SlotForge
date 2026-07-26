import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { motion } from 'motion/react';
import LoadingScreen from '../../../components/ui/LoadingScreen';
import { WORK_ROLE_OPTIONS } from '../../settings/profileRoles';

export default function SignupPage() {
  const [orgName, setOrgName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [jobTitle, setJobTitle] = useState('Timetable coordinator');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signUp(email, password, fullName, orgName, jobTitle);
      navigate('/onboarding', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingScreen label="Preparing your guided setup" />;

  return (
    <motion.div initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .32, ease: [0.16, 1, 0.3, 1] }} className="auth-screen min-h-screen px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl overflow-hidden rounded-2xl border-2 border-rule bg-paper-raised shadow-2xl lg:grid-cols-[0.95fr_1.05fr]">
        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <Link to="/" className="mb-8 flex items-center gap-3">
              <img src={theme === 'dark' ? '/logo/logo-dark.svg' : '/logo/logo.svg'} alt="SlotForge Logo" className="h-11 w-11 object-contain" />
              <div>
                <h1 className="text-headline-sm text-on-surface">SlotForge</h1>
                <p className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>Institutional Scheduling</p>
              </div>
            </Link>

          <h2 className="text-headline-sm text-on-surface mb-1">Create institution</h2>
          <p className="text-body-sm text-on-surface-variant mb-6">Start with a guided setup wizard after account creation.</p>

          {error && (
            <div className="mb-4 px-4 py-3 bg-error-container text-on-error-container text-sm rounded-lg border border-error/20">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-label-caps text-on-surface-variant block mb-2" style={{ fontSize: 10 }}>
                Institution Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="academic-input w-full"
                placeholder="University of Engineering"
                required
              />
            </div>
            <div>
              <label className="text-label-caps text-on-surface-variant block mb-2" style={{ fontSize: 10 }}>
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="academic-input w-full"
                placeholder="Dr. Jane Smith"
                required
              />
            </div>
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
                Your role
              </label>
              <select value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} className="academic-input w-full" required>
                {WORK_ROLE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <p className="mt-1.5 text-xs text-mono-grey">Used for your profile and team context. You can change it later.</p>
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
                placeholder="Min. 8 characters"
                required
                minLength={8}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-60"
            >
              Create institution
            </button>
          </form>

          <p className="text-center text-body-sm text-on-surface-variant mt-6">
            Already registered?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Sign In
            </Link>
          </p>
          </div>
        </section>

        <section className="relative hidden border-l-2 border-rule bg-surface-container-low p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>Guided setup</p>
            <h2 className="mt-4 max-w-xl text-[56px] font-semibold leading-[1.02] text-on-surface" style={{ fontFamily: 'var(--font-display)' }}>
              Build the first schedule from a clean blueprint.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-on-surface-variant">
              Choose a preset, add the minimum viable resources, run preflight, and generate the first draft.
            </p>
          </div>
          <div className="space-y-3">
            {['Choose preset', 'Run preflight', 'Generate draft'].map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-rule bg-paper-raised p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-sm font-black text-primary">{index + 1}</span>
                <span className="text-sm font-semibold text-on-surface">{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
