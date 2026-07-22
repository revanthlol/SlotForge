import { useMemo, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import { useWorkspaces } from '../../lib/api/hooks/useWorkspaces';
import { useWorkspaceRunAssignments, useWorkspaceScheduleRuns } from '../../hooks/useApi';
import PressureAnalysisView from './PressureAnalysisView';
import ViolationReport from './ViolationReport';
import ConflictPanel from './ConflictPanel';
import AssignmentExplanation from './AssignmentExplanation';
import { usePressureAnalysis } from './hooks/usePressureAnalysis';
import { useViolationReport } from './hooks/useViolationReport';
import { useImpactAnalysis } from './hooks/useImpactAnalysis';
import { useAssignmentExplanation } from './hooks/useAssignmentExplanation';

type Mode = 'pressure' | 'violations';

export default function HeatmapPage() {
  const { data: workspaces } = useWorkspaces();
  const workspace = workspaces?.[0] || null;
  const workspaceId = workspace?.id || null;
  const { data: runs } = useWorkspaceScheduleRuns(workspaceId);
  const [mode, setMode] = useState<Mode>('pressure');
  const latestRun = useMemo(() => (runs || []).find((run) => run.status === 'success') || runs?.[0] || null, [runs]);
  const assignments = useWorkspaceRunAssignments(workspaceId, latestRun?.id || null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const activeAssignmentId = assignments.data?.some((assignment) => assignment.id === selectedAssignmentId)
    ? selectedAssignmentId
    : null;

  const pressure = usePressureAnalysis(workspaceId);
  const violations = useViolationReport(workspaceId, latestRun?.id || null);
  const explanation = useAssignmentExplanation(workspaceId, latestRun?.id || null, activeAssignmentId);
  const impact = useImpactAnalysis(workspaceId);

  const tabs: Array<{ id: Mode; label: string; icon: string }> = [
    { id: 'pressure', label: 'Pressure', icon: 'speed' },
    { id: 'violations', label: 'Violations', icon: 'rule' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="SOLVER / EXPLAINABILITY"
        title="Conflict Heatmap"
        subtitle="Inspect scheduling pressure before generation and review violation heat after solver runs"
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-xl border-2 border-rule bg-paper-raised p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-lg border border-rule bg-surface-container p-0.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMode(tab.id)}
                  className={`flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors ${
                    mode === tab.id ? 'bg-inverse-surface text-inverse-on-surface' : 'text-on-surface-variant hover:bg-paper-raised'
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="text-right text-[11px] text-mono-grey">
              <p>{workspace?.name || 'Workspace unavailable'}</p>
              <p>{latestRun ? `Run ${latestRun.id.slice(0, 8)} / ${latestRun.status}` : 'No schedule run selected'}</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            impact.analyze({
              change_type: 'preview',
              entity_id: workspaceId || 'workspace',
              new_value: { source: 'heatmap_preview' },
            });
          }}
          disabled={!workspaceId || impact.loading}
          className="rounded-xl border-2 border-rule bg-inverse-surface p-4 text-left text-inverse-on-surface transition-colors hover:bg-on-surface disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-inverse-primary" style={{ fontSize: 20 }}>merge_type</span>
          <p className="mt-2 text-sm font-semibold">Preview impact panel</p>
          <p className="mt-1 text-xs text-inverse-on-surface/70">Runs the live conflict endpoint with a harmless preview payload.</p>
        </button>
      </div>

      {mode === 'pressure' ? (
        <PressureAnalysisView
          report={pressure.data}
          loading={pressure.loading}
          error={pressure.error}
          unsupported={pressure.unsupported}
          onRefresh={() => { void pressure.refetch(); }}
        />
      ) : (
        <ViolationReport
          report={violations.data}
          loading={violations.loading}
          error={violations.error}
          unsupported={violations.unsupported}
          onRefresh={() => { void violations.refetch(); }}
        />
      )}

      <section className="rounded-xl border-2 border-rule bg-paper-raised p-inset-standard">
        <div className="border-b border-rule pb-4">
          <p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>Explainable scheduling</p>
          <h2 className="mt-1 text-headline-sm text-on-surface">Assignment reasoning</h2>
        </div>
        <div className="mt-4">
          {assignments.data?.length ? (
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-rule bg-surface-container-low p-2">
                {assignments.data.map((assignment) => (
                  <button
                    key={assignment.id}
                    type="button"
                    onClick={() => setSelectedAssignmentId(assignment.id)}
                    className={`w-full rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                      selectedAssignmentId === assignment.id
                        ? 'border-primary bg-accent-soft text-on-surface'
                        : 'border-transparent text-on-surface-variant hover:border-rule hover:bg-paper-raised'
                    }`}
                  >
                    <span className="font-semibold">{assignment.day} Period {assignment.period}</span>
                    <span className="mt-1 block font-mono text-[10px] text-mono-grey">{assignment.id}</span>
                  </button>
                ))}
              </div>
              <div>
                <AssignmentExplanation explanation={explanation.data} />
                {explanation.error && <p className="mt-2 text-xs text-error">{explanation.error}</p>}
              </div>
            </div>
          ) : (
            <AssignmentExplanation explanation={null} />
          )}
        </div>
      </section>

      <ConflictPanel
        open={Boolean(impact.data || impact.loading || impact.error)}
        report={impact.data}
        loading={impact.loading}
        error={impact.error}
        onClose={impact.clear}
      />
    </div>
  );
}
