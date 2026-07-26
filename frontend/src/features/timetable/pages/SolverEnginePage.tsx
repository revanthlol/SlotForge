import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  useConstraints,
  useTimetableVersions,
  type Constraint,
  type ScheduledSlot,
} from '../../../hooks/useApi';
import api from '../../../lib/api';
import PageHeader from '../../../components/ui/PageHeader';
import StatusBadge from '../../../components/ui/StatusBadge';
import { Link } from 'react-router-dom';
import { useWorkspaces } from '../../../lib/api/hooks/useWorkspaces';
import PressureAnalysisView from '../../heatmap/PressureAnalysisView';
import { usePressureAnalysis } from '../../heatmap/hooks/usePressureAnalysis';

function suggestedFixesFor(reason: string): string[] {
  const normalized = reason.toLowerCase();
  if (normalized.includes('room') || normalized.includes('capacity')) {
    return ['Add a larger compatible room or reduce the affected section size.', 'Check room-type and preferred-room constraints.'];
  }
  if (normalized.includes('teacher') || normalized.includes('availability')) {
    return ['Assign another qualified teacher or expand the teacher availability window.', 'Review teacher-subject and unavailable-slot constraints.'];
  }
  if (normalized.includes('weekly hours') || normalized.includes('time capacity')) {
    return ['Reduce weekly subject hours or add more usable periods to the cycle.', 'Check for long session lengths consuming multiple consecutive periods.'];
  }
  return ['Review the listed resource, room, and slot constraints, then run the solver again.'];
}

export default function SolverEnginePage() {
  const { organizationId } = useAuth();
  const { data: constraints, refetch: refetchConstraints } = useConstraints(organizationId);
  const { data: versions, refetch: refetchVersions } = useTimetableVersions(organizationId);
  const { data: workspaces } = useWorkspaces();
  const workspaceId = workspaces?.[0]?.id || organizationId;
  const pressure = usePressureAnalysis(workspaceId || null);

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateResult, setGenerateResult] = useState<{
    id: string | null;
    version_id?: string | null;
    version_number: number;
    assignments: ScheduledSlot[];
    scores: Record<string, number>;
    infeasible_reason: string | null;
  } | null>(null);

  const [savingWeights, setSavingWeights] = useState<Record<string, boolean>>({});
  const [sliderWeights, setSliderWeights] = useState<Record<string, number>>({});

  // Separate hard vs soft constraints
  // Hard constraints have no weight (null or undefined)
  const hardConstraints = useMemo(() => constraints?.filter((c) => c.weight === null || c.weight === undefined) || [], [constraints]);
  const softConstraints = useMemo(() => constraints?.filter((c) => c.weight !== null && c.weight !== undefined) || [], [constraints]);
  const groupedHardConstraints = useMemo(() => {
    const groups = new Map<string, Constraint[]>();
    hardConstraints.forEach((constraint) => groups.set(constraint.constraint_type, [...(groups.get(constraint.constraint_type) || []), constraint]));
    return [...groups.entries()];
  }, [hardConstraints]);

  // Helper to resolve constraint display names
  const getConstraintLabel = (type: string) => {
    const labels: Record<string, string> = {
      no_overlap_teacher: 'Teacher Overlap Prevention (Hard)',
      no_overlap_room: 'Room Conflict Prevention (Hard)',
      room_capacity: 'Room Capacity Constraints',
      teacher_availability: 'Teacher Availability & Day Preferences',
      consecutive_classes: 'Consecutive Class Limiters',
      lunch_break: 'Mandatory Mid-day Lunch Break',
      subject_required_room: 'Required Room Type Matchers',
      subject_requires_room_type: 'Required Room Type Matchers',
    };
    return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Get current weight, preferring user's slider state if modified
  const getWeightValue = (c: Constraint) => {
    if (sliderWeights[c.id] !== undefined) {
      return sliderWeights[c.id];
    }
    return c.weight || 0;
  };

  const handleSliderChange = (id: string, val: number) => {
    setSliderWeights((prev) => ({ ...prev, [id]: val }));
  };

  // Save soft constraint weight
  const handleSaveWeight = async (c: Constraint) => {
    const weight = sliderWeights[c.id];
    if (weight === undefined) return;

    setSavingWeights((prev) => ({ ...prev, [c.id]: true }));
    try {
      await api.put(`/constraints/${c.id}`, {
        organization_id: organizationId,
        constraint_type: c.constraint_type,
        payload: c.payload,
        weight: weight,
      });
      refetchConstraints();
    } catch (err) {
      console.error('Failed to save constraint weight:', err);
    } finally {
      setSavingWeights((prev) => ({ ...prev, [c.id]: false }));
    }
  };

  // Trigger generator run
  const handleGenerate = async () => {
    if (!organizationId) return;
    setGenerating(true);
    setGenerateError(null);
    setGenerateResult(null);

    try {
      const res = await api.post('/timetables/generate', { organization_id: organizationId });
      setGenerateResult(res.data);
      if (!res.data.infeasible_reason) {
        refetchVersions();
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Solver engine failed';
      setGenerateError(msg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="SOLVER / CORE ENGINE"
        title="Solver Engine"
        subtitle="Review the active rule strategy, tune preferences, and run the next timetable generation."
      />

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Constraints & Weights Configuration */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          {/* Hard Constraints Card */}
          <div className="bg-paper-raised border-2 border-rule rounded-xl p-inset-standard">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>
                  gavel
                </span>
                <h3 className="text-headline-sm text-on-surface">Hard Constraints (Absolute)</h3>
              </div>
              <Link to="/constraints" className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-accent-soft"><span className="material-symbols-outlined" style={{ fontSize: 16 }}>tune</span>Manage rules</Link>
            </div>
            <p className="text-body-sm text-on-surface-variant mb-4">
              These rules are mathematically absolute. The solver will reject any schedule that violates even one of these conditions.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {hardConstraints.length === 0 ? (
                <div className="col-span-full rounded-lg border border-dashed border-rule bg-surface-container-low p-4 text-xs text-mono-grey">No hard constraints configured. Open the Constraint Playground to add the rules the solver must never break.</div>
              ) : (
                groupedHardConstraints.map(([type, group]) => (
                  <div key={type} className="flex items-start gap-3 rounded-xl border border-rule bg-surface-container-low p-3.5">
                    <span className="material-symbols-outlined mt-0.5 text-primary" style={{ fontSize: 17 }}>verified_user</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2"><h4 className="text-xs font-semibold leading-5 text-on-surface">{getConstraintLabel(type).replace(' (Hard)', '')}</h4>{group.length > 1 && <span className="shrink-0 rounded-full bg-paper-raised px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">{group.length} rules</span>}</div>
                      <p className="mt-1 text-[11px] leading-4 text-mono-grey">Applied as a non-negotiable solver guardrail.</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Soft Constraints Card */}
          <div className="bg-paper-raised border-2 border-rule rounded-xl p-inset-standard">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-secondary" style={{ fontSize: 22 }}>
                tune
              </span>
              <h3 className="text-headline-sm text-on-surface">Soft Constraints (Priorities)</h3>
            </div>
            <p className="text-body-sm text-on-surface-variant mb-4">
              Adjust weights to direct the solver's optimization goals. Higher weights penalize violations more severely, directing the solver to prioritize these preferences.
            </p>

            <div className="space-y-5">
              {softConstraints.length === 0 ? (
                <p className="text-xs text-mono-grey italic">No soft constraints configured</p>
              ) : (
                softConstraints.map((c) => {
                  const currentWeight = getWeightValue(c);
                  const isModified = sliderWeights[c.id] !== undefined && sliderWeights[c.id] !== c.weight;
                  return (
                    <div key={c.id} className="p-4 bg-surface-container/30 border border-rule rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-semibold text-on-surface">
                            {getConstraintLabel(c.constraint_type)}
                          </h4>
                          <p className="text-[10px] text-mono-grey mt-0.5">
                            Penalty score per violation: {c.weight || 0}
                          </p>
                        </div>
                        {isModified && (
                          <button
                            onClick={() => handleSaveWeight(c)}
                            disabled={savingWeights[c.id]}
                            className="px-2.5 py-1 bg-primary text-on-primary text-[10px] font-bold rounded hover:bg-primary-container transition-all"
                          >
                            {savingWeights[c.id] ? 'Saving...' : 'Save Weight'}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="1"
                          value={currentWeight}
                          onChange={(e) => handleSliderChange(c.id, parseInt(e.target.value))}
                          className="flex-1 accent-primary cursor-pointer h-1.5 bg-surface-container rounded-lg"
                        />
                        <span className="text-xs font-bold text-on-surface font-mono w-6 text-right">
                          {currentWeight}
                        </span>
                      </div>

                      <div className="flex justify-between text-[9px] text-mono-grey font-mono uppercase tracking-wider">
                        <span>Ignore (0)</span>
                        <span>Medium (5)</span>
                        <span>Critical (10)</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Engine Execution & Results */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* Execution Card */}
          <div className="bg-inverse-surface text-inverse-on-surface rounded-xl p-inset-standard flex flex-col justify-between min-h-[300px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-inverse-primary" style={{ fontSize: 22 }}>
                    precision_manufacturing
                  </span>
                  <p className="text-label-caps text-inverse-primary" style={{ fontSize: 10 }}>
                    Solver Control Panel
                  </p>
                </div>
                <StatusBadge status={generating ? 'Running' : 'Ready'} />
              </div>

              <p className="text-headline-sm text-inverse-on-surface">
                {generating ? 'Engine is solving CP-SAT models...' : 'Engine is ready for execution'}
              </p>

              <p className="text-body-sm text-inverse-on-surface/70">
                The OR-Tools CP-SAT engine compiles all teachers, rooms, subjects, sections, and active constraints into a constraint satisfaction matrix and optimizes for soft penalty minimization.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 space-y-4">
              {generating ? (
                <div className="space-y-3">
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-inverse-primary progress-bar-track rounded-full" />
                  </div>
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="solver-pulse flex items-center justify-center gap-2 text-xs text-inverse-primary font-mono"
                  >
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>sync</span>
                    Crunching permutations & constraints...
                  </motion.div>
                </div>
              ) : (
                <button
                  onClick={handleGenerate}
                  className="w-full py-3 bg-inverse-primary text-on-primary-fixed text-sm font-semibold rounded-lg hover:bg-white transition-all duration-150 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    play_circle
                  </span>
                  Start Generator Run
                </button>
              )}
            </div>
          </div>

          {/* Solver Run Results */}
          <div className="bg-paper-raised border-2 border-rule rounded-xl p-inset-standard">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-rule">
              <h3 className="text-headline-sm text-on-surface">Last Execution Run</h3>
              <span className="material-symbols-outlined text-mono-grey" style={{ fontSize: 20 }}>
                receipt_long
              </span>
            </div>

            {generateError && (
              <div className="p-3 bg-error-container/30 border border-error/20 text-error rounded-lg text-xs flex gap-2">
                <span className="material-symbols-outlined shrink-0" style={{ fontSize: 16 }}>
                  error
                </span>
                <span>{generateError}</span>
              </div>
            )}

            {generateResult ? (
              <div className="space-y-4">
                {generateResult.infeasible_reason ? (
                  <div className="p-3 bg-signal-soft border border-secondary/20 text-secondary rounded-lg text-xs space-y-1">
                    <div className="font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>warning</span>
                      Solver Unfeasible (UNSAT)
                    </div>
                    <p className="text-on-surface-variant text-[11px] font-mono leading-relaxed">
                      {generateResult.infeasible_reason}
                    </p>
                    <div className="mt-2 border-t border-secondary/20 pt-2">
                      <p className="font-semibold text-on-surface-variant">Suggested fixes</p>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-on-surface-variant">
                        {suggestedFixesFor(generateResult.infeasible_reason).map((fix) => <li key={fix}>{fix}</li>)}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-accent-soft/30 border border-primary/20 text-primary rounded-lg text-xs space-y-1">
                    <div className="font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check_circle</span>
                      Schedule Generated (SAT/OPTIMAL)
                    </div>
                    <p className="text-on-surface-variant text-[11px]">
                      Saved as a new draft version.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-data-table text-mono-grey">Target Version</p>
                    <p className="font-semibold mt-0.5">
                      {generateResult.infeasible_reason ? 'No new version created' : `Version ${generateResult.version_number}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-data-table text-mono-grey">Result State</p>
                    <p className="font-semibold mt-0.5">
                      {generateResult.infeasible_reason ? 'UNSAT / INFEASIBLE' : 'SAT / OPTIMAL'}
                    </p>
                  </div>
                  {generateResult.scores && (
                    <>
                      <div>
                        <p className="text-data-table text-mono-grey">Hard Conflicts</p>
                        <p className={`font-semibold mt-0.5 ${generateResult.scores.hard > 0 ? 'text-error' : 'text-primary'}`}>
                          {generateResult.scores.hard}
                        </p>
                      </div>
                      <div>
                        <p className="text-data-table text-mono-grey">Soft Penalties</p>
                        <p className="font-semibold mt-0.5 text-on-surface">
                          {generateResult.scores.soft || 0}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                {!generateResult.infeasible_reason && (
                <div>
                  <Link
                    to={`/timetable?version=${generateResult.version_id || generateResult.id}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-rule px-3 py-2 text-xs font-semibold text-primary hover:bg-accent-soft transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      table_view
                    </span>
                    View timetable
                  </Link>
                </div>
                )}
              </div>
            ) : versions && versions.length > 0 ? (
              <div className="space-y-4">
                <p className="text-xs text-on-surface-variant">
                  Latest version details from database:
                </p>
                {versions[0] && (
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-data-table text-mono-grey">Target Version</p>
                      <p className="font-semibold mt-0.5">Version {versions[0].version_number}</p>
                    </div>
                    <div>
                      <p className="text-data-table text-mono-grey">Created At</p>
                      <p className="font-semibold mt-0.5">
                        {new Date(versions[0].created_at).toLocaleString()}
                      </p>
                    </div>
                    {versions[0].scores && (
                      <>
                        <div>
                          <p className="text-data-table text-mono-grey">Hard Conflicts</p>
                          <p className={`font-semibold mt-0.5 ${versions[0].scores.hard > 0 ? 'text-error' : 'text-primary'}`}>
                            {versions[0].scores.hard}
                          </p>
                        </div>
                        <div>
                          <p className="text-data-table text-mono-grey">Soft Penalties</p>
                          <p className="font-semibold mt-0.5 text-on-surface">
                            {versions[0].scores.soft || 0}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-mono-grey italic text-center py-6">
                No solver runs recorded for this organization yet.
              </p>
            )}
          </div>
        </div>

        <div className="col-span-12">
          <PressureAnalysisView
            report={pressure.data}
            loading={pressure.loading}
            error={pressure.error}
            unsupported={pressure.unsupported}
            onRefresh={() => { void pressure.refetch(); }}
          />
        </div>
      </div>

    </div>
  );
}
