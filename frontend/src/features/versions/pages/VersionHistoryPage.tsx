import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useWorkspaces } from '../../../lib/api/hooks/useWorkspaces';
import { useRooms, useSections, useSubjects, useTeachers, useWorkspaceRunAssignments, useWorkspaceScheduleRuns, type ScheduleRun, type ScheduledSlot } from '../../../hooks/useApi';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../lib/api';
import PageHeader from '../../../components/ui/PageHeader';
import StatusBadge from '../../../components/ui/StatusBadge';
import Modal from '../../../components/ui/Modal';
import ConfirmModal from '../../../components/ui/ConfirmModal';

type LifecycleResponse = { run_id: string };
type DiffChange = { key: string; changes: string[]; before?: Record<string, unknown>; after?: Record<string, unknown> };
type DiffReport = { version_a_label: string; version_b_label: string; moved_count: number; changed_count: number; score_delta: number | null; affected_resources: Array<{ name: string; resource_type: string }>; changes: DiffChange[] };

const versionLabel = (run: ScheduleRun) => run.version_label || (run.version_number ? `v${run.version_number}` : `Run ${run.id.slice(0, 8)}`);
const dateLabel = (value: string) => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const scoreLabel = (run: ScheduleRun) => {
  const value = run.solver_score?.overall_score ?? run.solver_score?.score ?? run.solver_score?.preference_score;
  return typeof value === 'number' ? Math.round(value) : null;
};

export default function VersionHistoryPage() {
  const { organizationId } = useAuth();
  const { workspaceId: routeWorkspaceId } = useParams();
  const [params, setParams] = useSearchParams();
  const { data: workspaces } = useWorkspaces();
  const workspaceId = routeWorkspaceId || workspaces?.[0]?.id || null;
  const { data: runs, loading, error, refetch } = useWorkspaceScheduleRuns(workspaceId);
  const orderedRuns = useMemo(() => [...(runs || [])].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)), [runs]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [branchSource, setBranchSource] = useState<ScheduleRun | null>(null);
  const [branchName, setBranchName] = useState('Draft');
  const [branchMode, setBranchMode] = useState<'branch' | 'rollback'>('branch');
  const [action, setAction] = useState<{ kind: 'publish' | 'archive'; run: ScheduleRun } | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [diff, setDiff] = useState<DiffReport | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const selected = orderedRuns.find((run) => run.id === selectedId) || orderedRuns[0] || null;
  const { data: assignmentsData, loading: assignmentsLoading } = useWorkspaceRunAssignments(workspaceId, selected?.id || null);
  const assignments = useMemo(() => assignmentsData || [], [assignmentsData]);
  const teachers = useTeachers(organizationId);
  const rooms = useRooms(organizationId);
  const subjects = useSubjects(organizationId);
  const sections = useSections(organizationId);
  const names = useMemo(() => ({
    teachers: new Map((teachers.data || []).map((item) => [item.id, item.name])),
    rooms: new Map((rooms.data || []).map((item) => [item.id, item.name])),
    subjects: new Map((subjects.data || []).map((item) => [item.id, item.name])),
    sections: new Map((sections.data || []).map((item) => [item.id, item.name])),
  }), [teachers.data, rooms.data, subjects.data, sections.data]);
  const assignmentsByDay = useMemo(() => {
    const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const grouped = new Map<string, ScheduledSlot[]>();
    assignments.forEach((assignment) => grouped.set(assignment.day, [...(grouped.get(assignment.day) || []), assignment]));
    return [...grouped.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0])).map(([day, items]) => [day, [...items].sort((a, b) => a.period - b.period)] as const);
  }, [assignments]);

  useEffect(() => {
    if (!selectedId && orderedRuns[0]) setSelectedId(orderedRuns[0].id);
  }, [orderedRuns, selectedId]);

  useEffect(() => {
    const a = params.get('a');
    const b = params.get('b');
    if (!workspaceId || !a || !b) { setDiff(null); return; }
    setDiffLoading(true);
    api.get<DiffReport>(`/api/v1/workspaces/${workspaceId}/schedule-runs/compare`, { params: { a, b } })
      .then((response) => setDiff(response.data))
      .catch(() => setMessage('Could not compare those versions.'))
      .finally(() => setDiffLoading(false));
  }, [params, workspaceId]);

  const compareWith = (other: ScheduleRun) => {
    if (selected && other.id !== selected.id) setParams({ a: other.id, b: selected.id });
  };

  const createBranch = async () => {
    if (!workspaceId || !branchSource) return;
    setWorking(true); setMessage(null);
    try {
      const path = branchMode === 'rollback' ? 'rollback' : 'branch';
      const response = await api.post<LifecycleResponse>(`/api/v1/workspaces/${workspaceId}/schedule-runs/${branchSource.id}/${path}`, { branch_name: branchName });
      await refetch();
      setSelectedId(response.data.run_id);
      setBranchSource(null);
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Could not create draft.');
    } finally { setWorking(false); }
  };

  const runAction = async () => {
    if (!workspaceId || !action) return;
    setWorking(true); setMessage(null);
    try {
      await api.post(`/api/v1/workspaces/${workspaceId}/schedule-runs/${action.run.id}/${action.kind}`);
      await refetch(); setAction(null);
    } catch (err: any) {
      setMessage(err.response?.data?.detail || `Could not ${action.kind} version.`);
    } finally { setWorking(false); }
  };

  if (!workspaceId) return <div className="rounded-xl border-2 border-rule bg-paper-raised p-8 text-sm text-on-surface-variant">Create a workspace before viewing version history.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="SOLVER / VERSION CONTROL"
        title="Version History"
        subtitle="Branch, compare, publish, archive, and roll back timetable drafts without losing history."
        actions={
          <div className="flex gap-2">
            <button type="button" disabled={!selected} onClick={() => { if (selected) { setBranchMode('branch'); setBranchName('Draft'); setBranchSource(selected); } }} className="rounded-lg border-2 border-rule px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50">Branch draft</button>
            <button type="button" disabled={!selected} onClick={() => { if (selected) { setBranchMode('rollback'); setBranchName('Rollback draft'); setBranchSource(selected); } }} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50">Rollback</button>
          </div>
        }
      />
      {message && <div className="rounded-lg border border-error/30 bg-error-container/30 px-4 py-3 text-sm text-error">{message}</div>}
      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-xl border-2 border-rule bg-paper-raised p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="text-headline-sm font-bold text-on-surface">Timeline</h2><p className="mt-1 text-xs text-on-surface-variant tabular-nums">{orderedRuns.length} schedule versions</p></div><span className="material-symbols-outlined text-primary">account_tree</span></div>
          {loading && <p className="text-sm text-on-surface-variant">Loading versions…</p>}
          {error && <p className="text-sm text-error">Could not load version history.</p>}
          {!loading && !error && orderedRuns.length === 0 && <p className="rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">Generate a timetable or create a branch to begin versioning.</p>}
          <div className="space-y-2.5">
            {orderedRuns.map((run) => (
              <div key={run.id} className={`rounded-xl border-2 p-3.5 transition-all ${selected?.id === run.id ? 'border-primary bg-accent-soft/30 shadow-sm' : 'border-rule bg-paper hover:border-primary/40'}`}>
                <button type="button" onClick={() => setSelectedId(run.id)} className="w-full text-left">
                  <div className="flex items-center justify-between gap-2"><span className="font-semibold text-on-surface tabular-nums">{versionLabel(run)}</span><StatusBadge status={run.version_status || run.status} /></div>
                  <p className="mt-1 text-xs text-on-surface-variant tabular-nums">{dateLabel(run.created_at)}{scoreLabel(run) !== null ? ` · Score ${scoreLabel(run)}` : ''}</p>
                  {run.branch_name && <p className="mt-2 text-xs font-semibold text-primary">{run.branch_name}</p>}
                  {run.parent_version_id && <p className="mt-1 text-[11px] text-on-surface-variant">↳ branched from history</p>}
                </button>
                <div className="mt-3 flex gap-3 border-t border-rule pt-2"><button type="button" disabled={!selected || selected.id === run.id} onClick={() => compareWith(run)} className="text-xs font-semibold text-primary hover:underline disabled:opacity-40">Compare</button><button type="button" onClick={() => { setBranchMode('branch'); setBranchName('Draft'); setBranchSource(run); }} className="text-xs font-semibold text-primary hover:underline">Branch</button>{run.version_status === 'draft' && <button type="button" onClick={() => setAction({ kind: 'publish', run })} className="text-xs font-semibold text-primary hover:underline">Publish</button>}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          {selected && <section className="rounded-xl border-2 border-rule bg-paper-raised p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>Selected version</p><h2 className="mt-1 text-headline-sm text-on-surface">{versionLabel(selected)}</h2><p className="mt-1 text-sm text-on-surface-variant">{selected.branch_name || 'Generated solver version'} · {dateLabel(selected.created_at)}</p></div><div className="flex gap-2">{selected.version_status === 'draft' && <><button type="button" onClick={() => setAction({ kind: 'publish', run: selected })} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary">Publish</button><button type="button" onClick={() => setAction({ kind: 'archive', run: selected })} className="rounded-lg border border-rule px-3 py-2 text-xs font-semibold text-on-surface-variant">Archive</button></>}</div></div></section>}
              {selected && <section className="overflow-hidden rounded-xl border-2 border-rule bg-paper-raised"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule bg-surface-container-low px-5 py-4"><div><p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>Version snapshot</p><h3 className="mt-1 text-headline-sm text-on-surface">Timetable at a glance</h3><p className="mt-1 text-xs text-on-surface-variant">Human-readable assignments saved with this version.</p></div><span className="rounded-full border border-rule bg-paper-raised px-3 py-1 text-xs font-semibold text-on-surface-variant">{assignments.length} slots</span></div>{assignmentsLoading ? <p className="p-5 text-sm text-on-surface-variant">Loading snapshot…</p> : assignments.length === 0 ? <p className="m-5 rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">No assignments were saved in this version.</p> : <div className="overflow-x-auto p-5"><div className="grid min-w-[760px] gap-3" style={{ gridTemplateColumns: `repeat(${assignmentsByDay.length}, minmax(150px, 1fr))` }}>{assignmentsByDay.map(([day, dayAssignments]) => <div key={day}><div className="mb-2 flex items-center justify-between border-b-2 border-primary/25 pb-2"><h4 className="text-sm font-black text-on-surface">{day}</h4><span className="text-[10px] font-semibold text-mono-grey">{dayAssignments.length} classes</span></div><div className="space-y-2">{dayAssignments.map((assignment, index) => <AssignmentCard key={`${assignment.id}-${index}`} assignment={assignment} names={names} />)}</div></div>)}</div></div>}</section>}
          {diffLoading && <div className="rounded-xl border-2 border-rule bg-paper-raised p-5 text-sm text-on-surface-variant">Comparing versions…</div>}
          {diff && <DiffPanel diff={diff} onClose={() => { setDiff(null); setParams({}); }} />}
        </section>
      </div>
      <Modal open={Boolean(branchSource)} onClose={() => !working && setBranchSource(null)} title={`${branchMode === 'rollback' ? 'Create rollback draft from' : 'Create draft from'} ${branchSource ? versionLabel(branchSource) : ''}`} actions={<><button type="button" onClick={() => setBranchSource(null)} disabled={working} className="rounded-lg border border-rule px-4 py-2 text-sm text-on-surface-variant">Cancel</button><button type="button" onClick={createBranch} disabled={working || !branchName.trim()} data-modal-primary="true" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary">{working ? 'Creating…' : 'Create draft'}</button></>}><p className="text-sm text-on-surface-variant">All assignments are copied into a new draft. The source version remains unchanged.</p><label className="mt-4 block text-sm font-semibold text-on-surface">Draft label<input value={branchName} onChange={(event) => setBranchName(event.target.value)} className="mt-2 w-full rounded-lg border-2 border-rule bg-paper px-3 py-2 text-sm" /></label></Modal>
      <ConfirmModal open={Boolean(action)} title={`${action?.kind === 'publish' ? 'Publish' : 'Archive'} version?`} message={action?.kind === 'publish' ? 'The current published version will be archived and this version will become active.' : 'This draft will be archived and kept in history.'} confirmLabel={action?.kind === 'publish' ? 'Publish version' : 'Archive version'} loading={working} onCancel={() => setAction(null)} onConfirm={runAction} />
    </div>
  );
}

function AssignmentCard({ assignment, names }: { assignment: ScheduledSlot; names: { teachers: Map<string, string>; rooms: Map<string, string>; subjects: Map<string, string>; sections: Map<string, string> } }) {
  return <article className="rounded-lg border border-rule bg-paper p-3 shadow-sm"><div className="flex items-center justify-between gap-2"><span className="rounded bg-primary px-2 py-0.5 text-[10px] font-bold text-on-primary">P{assignment.period}</span>{assignment.duration_periods > 1 && <span className="text-[9px] font-semibold text-mono-grey">{assignment.duration_periods} periods</span>}</div><h5 className="mt-2 text-sm font-semibold leading-5 text-on-surface">{names.subjects.get(assignment.subject_id) || 'Unlabelled subject'}</h5><p className="mt-1 text-xs text-on-surface-variant">{names.sections.get(assignment.section_id) || 'Unlabelled section'}</p><div className="mt-3 space-y-1 border-t border-rule pt-2 text-[10px] text-mono-grey"><p className="flex items-center gap-1.5"><span className="material-symbols-outlined" style={{ fontSize: 13 }}>person</span>{names.teachers.get(assignment.teacher_id) || 'Teacher unavailable'}</p><p className="flex items-center gap-1.5"><span className="material-symbols-outlined" style={{ fontSize: 13 }}>meeting_room</span>{names.rooms.get(assignment.room_id) || 'Room unavailable'}</p></div></article>;
}

function DiffPanel({ diff, onClose }: { diff: DiffReport; onClose: () => void }) {
  return <section className="rounded-xl border-2 border-primary/30 bg-accent-soft/20 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-label-caps text-primary" style={{ fontSize: 10 }}>Diff view</p><h3 className="mt-1 text-headline-sm text-on-surface">{diff.version_a_label} → {diff.version_b_label}</h3><p className="mt-1 text-sm text-on-surface-variant">{diff.moved_count} moved · {diff.changed_count} changed · {diff.affected_resources.length} resources affected</p></div><button type="button" onClick={onClose} className="text-sm font-semibold text-primary">Close compare</button></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><Metric label="Score delta" value={diff.score_delta === null ? '—' : `${diff.score_delta > 0 ? '+' : ''}${diff.score_delta.toFixed(1)}`} /><Metric label="Assignments changed" value={String(diff.changed_count)} /><Metric label="Affected resources" value={String(diff.affected_resources.length)} /></div><div className="mt-4 space-y-2">{diff.changes.length === 0 ? <p className="rounded-lg bg-paper-raised p-4 text-sm text-on-surface-variant">No assignment changes.</p> : diff.changes.map((change) => <div key={change.key} className="rounded-lg border border-rule bg-paper-raised p-4 text-sm"><p className="font-semibold text-on-surface">{change.key}</p><p className="mt-1 text-xs text-primary">{change.changes.join(' · ')}</p><div className="mt-3 grid gap-2 md:grid-cols-2"><pre className="overflow-auto rounded bg-error-container/30 p-2 text-[11px] text-on-surface">{JSON.stringify(change.before || {}, null, 2)}</pre><pre className="overflow-auto rounded bg-accent-soft p-2 text-[11px] text-on-surface">{JSON.stringify(change.after || {}, null, 2)}</pre></div></div>)}</div></section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-paper-raised p-3"><p className="text-xs text-on-surface-variant">{label}</p><p className="mt-1 text-xl font-semibold text-on-surface">{value}</p></div>;
}
