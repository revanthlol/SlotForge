import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../../contexts/AuthContext';
import { useOrganization } from '../../../hooks/useApi';
import PageHeader from '../../../components/ui/PageHeader';
import { accessRoleLabel, WORK_ROLE_OPTIONS } from '../profileRoles';

export default function ProfilePage() {
  const { user, organizationId, role, jobTitle, fullName, updateProfile } = useAuth();
  const { data: organization } = useOrganization(organizationId);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(fullName || '');
  const [roleDraft, setRoleDraft] = useState(jobTitle || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setNameDraft(fullName || '');
    setRoleDraft(jobTitle || '');
  }, [fullName, jobTitle]);

  const initials = (fullName || user?.email || 'Admin')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'A';

  const save = async () => {
    if (!nameDraft.trim() || !roleDraft.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateProfile(nameDraft.trim(), roleDraft.trim());
      setEditing(false);
      setMessage('Profile updated');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="ACCOUNT / PROFILE"
        title="Your profile"
        subtitle="Keep your identity and work context clear for everyone sharing this scheduling workspace."
        actions={editing ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => { setEditing(false); setNameDraft(fullName || ''); setRoleDraft(jobTitle || ''); }} className="rounded-lg border-2 border-rule bg-paper-raised px-4 py-2 text-sm font-semibold text-on-surface-variant">Cancel</button>
            <button type="button" onClick={save} disabled={saving || !nameDraft.trim() || !roleDraft.trim()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>{saving ? 'progress_activity' : 'check'}</span>{saving ? 'Saving…' : 'Save profile'}</button>
          </div>
        ) : <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-lg border-2 border-rule bg-paper-raised px-4 py-2 text-sm font-semibold text-on-surface hover:border-primary hover:text-primary"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>Edit profile</button>}
      />

      {message && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl border px-4 py-3 text-sm font-semibold ${message === 'Profile updated' ? 'border-primary/25 bg-accent-soft text-primary' : 'border-error/30 bg-error-container/30 text-error'}`}>{message}</motion.div>}

      <section className="overflow-hidden rounded-2xl border-2 border-rule bg-paper-raised shadow-sm">
        <div className="relative overflow-hidden border-b border-rule bg-[#113c34] px-6 py-8 text-white sm:px-8">
          <div className="absolute -right-12 -top-24 h-64 w-64 rounded-full border border-white/10" />
          <div className="absolute -right-2 -top-12 h-44 w-44 rounded-full border border-white/10" />
          <div className="relative flex flex-wrap items-center gap-5">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-3xl font-black shadow-xl backdrop-blur">{initials}</div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ad9c4]">Signed-in account</p>
              <h2 className="mt-2 truncate text-3xl font-semibold text-white" style={{ fontFamily: 'var(--font-display)' }}>{fullName || 'Admin user'}</h2>
              <p className="mt-1 text-sm text-white/65">{jobTitle || 'Set your work role'}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
          <div>
            <div className="mb-5 flex items-center justify-between border-b border-rule pb-4">
              <div><p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>Identity</p><h3 className="mt-1 text-xl font-semibold text-on-surface">How you appear in SlotForge</h3></div>
              <span className="material-symbols-outlined text-primary">badge</span>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block"><span className="mb-2 block text-label-caps text-on-surface-variant" style={{ fontSize: 10 }}>Full name</span><input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} readOnly={!editing} className={`academic-input w-full ${!editing ? 'cursor-default bg-surface-container-low' : ''}`} /></label>
              <label className="block"><span className="mb-2 block text-label-caps text-on-surface-variant" style={{ fontSize: 10 }}>Work role</span><select value={roleDraft} onChange={(event) => setRoleDraft(event.target.value)} disabled={!editing} className={`academic-input w-full ${!editing ? 'cursor-default bg-surface-container-low opacity-100' : ''}`}><option value="" disabled>Choose a work role</option>{WORK_ROLE_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select><span className="mt-2 block text-xs text-mono-grey">Describes what you do; it does not change account permissions.</span></label>
              <label className="block sm:col-span-2"><span className="mb-2 block text-label-caps text-on-surface-variant" style={{ fontSize: 10 }}>Email address</span><input value={user?.email || 'No email available'} readOnly className="academic-input w-full cursor-default bg-surface-container-low" /></label>
            </div>
          </div>

          <aside className="rounded-2xl border border-rule bg-surface-container-low p-5">
            <div className="flex items-start justify-between gap-3"><div><p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>Workspace access</p><h3 className="mt-2 text-xl font-semibold text-on-surface">{accessRoleLabel(role)}</h3></div><span className="rounded-full border border-primary/20 bg-accent-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">Active</span></div>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">Access is managed separately from your work role so profile edits cannot remove administrative permissions.</p>
            <div className="mt-5 space-y-3 border-t border-rule pt-5 text-sm">
              <div><p className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>Institution</p><p className="mt-1 font-semibold text-on-surface">{organization?.name || 'SlotForge institution'}</p></div>
              <div className="grid grid-cols-2 gap-3"><div><p className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>Cycle</p><p className="mt-1 font-semibold text-on-surface">{organization?.cycle_length || 0} days</p></div><div><p className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>Periods</p><p className="mt-1 font-semibold text-on-surface">{organization?.periods_per_day || 0} / day</p></div></div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
