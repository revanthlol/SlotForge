import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import LoadingScreen from '../../../components/ui/LoadingScreen';
import { useAuth } from '../../../contexts/AuthContext';
import { PublicNavbar } from '../../public/PublicChrome';
import { WORK_ROLE_OPTIONS } from '../../settings/profileRoles';

export default function CompleteAccountPage() {
  const { user, completeAccount } = useAuth();
  const suggestedName = useMemo(() => {
    const metadata = user?.user_metadata || {};
    return metadata.full_name || metadata.name || user?.email?.split('@')[0] || '';
  }, [user]);
  const [orgName, setOrgName] = useState('');
  const [fullName, setFullName] = useState(suggestedName);
  const [jobTitle, setJobTitle] = useState('Timetable coordinator');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await completeAccount(orgName, fullName, jobTitle);
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish account setup');
      setSubmitting(false);
    }
  };

  if (submitting) return <LoadingScreen label="Creating your institution workspace" />;

  return (
    <>
      <PublicNavbar />
      <main className="auth-screen min-h-screen px-4 pb-12 pt-28">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border-2 border-rule bg-paper-raised shadow-2xl"
        >
          <div className="border-b border-rule bg-surface-container-low px-6 py-6 sm:px-10">
            <p className="text-label-caps text-primary" style={{ fontSize: 10 }}>Identity verified</p>
            <h1 className="mt-2 text-headline-sm text-on-surface">Create your SlotForge workspace</h1>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Your social account is connected. Add the institution details that belong in SlotForge—not in your OAuth profile.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-5 p-6 sm:p-10">
            {error && <div className="rounded-lg border border-error/20 bg-error-container px-4 py-3 text-sm text-on-error-container">{error}</div>}
            <div>
              <label className="mb-2 block text-label-caps text-on-surface-variant" style={{ fontSize: 10 }}>Institution name</label>
              <input className="academic-input w-full" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="University of Engineering" required maxLength={160} />
            </div>
            <div>
              <label className="mb-2 block text-label-caps text-on-surface-variant" style={{ fontSize: 10 }}>Full name</label>
              <input className="academic-input w-full" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. Jane Smith" required minLength={2} maxLength={120} />
            </div>
            <div>
              <label className="mb-2 block text-label-caps text-on-surface-variant" style={{ fontSize: 10 }}>Your role</label>
              <select className="academic-input w-full" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required>
                {WORK_ROLE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <button type="submit" className="flex w-full items-center justify-center rounded-lg bg-primary py-3 font-semibold text-on-primary transition hover:bg-primary-container">
              Continue to guided setup
            </button>
          </form>
        </motion.section>
      </main>
    </>
  );
}
