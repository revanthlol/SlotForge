import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function SignupPage() {
  const [orgName, setOrgName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signUp(email, password, fullName, orgName);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 mb-10">
          <img src="/logo/logo.svg" alt="SlotForge Logo" className="w-12 h-12 object-contain" />
          <div>
            <h1 className="text-headline-md text-on-surface">SlotForge</h1>
            <p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>
              Institutional Scheduling
            </p>
          </div>
        </Link>

        {/* Card */}
        <div className="bg-paper-raised border-2 border-rule rounded-xl p-8 shadow-lg">
          <h2 className="text-headline-sm text-on-surface mb-1">Register Institution</h2>
          <p className="text-body-sm text-on-surface-variant mb-6">
            Set up a new institution for automated timetable scheduling
          </p>

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
              className="w-full py-3 bg-primary text-on-primary font-semibold rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating Institution...' : 'Create Institution'}
            </button>
          </form>

          <p className="text-center text-body-sm text-on-surface-variant mt-6">
            Already registered?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
