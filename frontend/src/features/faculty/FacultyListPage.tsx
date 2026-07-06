import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { useWorkspaces } from '../../lib/api/hooks/useWorkspaces';
import { usePresetConfig } from '../presets/hooks/usePresetConfig';
import {
  useFacultyTimetable,
  useOrganization,
  useWorkspaceResources,
  useWorkspaceScheduleRuns,
  type ScheduleRun,
  type WorkspaceResource,
} from '../../hooks/useApi';
import FacultyCard from './FacultyCard';
import FacultyTimetableView from './FacultyTimetableView';
import ShareLinkPanel from './ShareLinkPanel';
import ExportButton from '../exports/ExportButton';
import { buildExportDataFromFacultyAssignments } from '../exports/buildExportData';

const resourceTypeByPreset: Record<string, string> = {
  academic: 'teacher',
  staff_roster: 'employee',
  event: 'speaker',
  exam: 'invigilator',
  facility: 'requester',
};

function successfulRuns(runs: ScheduleRun[] | null) {
  return (runs || []).filter((run) => run.status === 'success' && run.schedule_version_id);
}

export default function FacultyListPage() {
  const { workspaceId: routeWorkspaceId } = useParams();
  const { organizationId } = useAuth();
  const { data: workspaces } = useWorkspaces();
  const config = usePresetConfig();
  const workspaceId = routeWorkspaceId || workspaces?.[0]?.id || organizationId;
  const resourceType = resourceTypeByPreset[config.key] || 'teacher';

  const { data: organization } = useOrganization(organizationId);
  const { data: faculty, loading: loadingFaculty } = useWorkspaceResources(workspaceId || null, resourceType);
  const { data: runs, loading: loadingRuns, refetch: refetchRuns } = useWorkspaceScheduleRuns(workspaceId || null);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [selectedRunId, setSelectedRunId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const usableRuns = useMemo(() => successfulRuns(runs), [runs]);

  useEffect(() => {
    if (!faculty?.length) {
      setSelectedFacultyId('');
      return;
    }
    setSelectedFacultyId((current) => current && faculty.some((item) => item.id === current) ? current : faculty[0].id);
  }, [faculty]);

  useEffect(() => {
    if (!usableRuns.length) {
      setSelectedRunId('');
      return;
    }
    setSelectedRunId((current) => current && usableRuns.some((run) => run.id === current) ? current : usableRuns[0].id);
  }, [usableRuns]);

  const selectedFaculty = useMemo<WorkspaceResource | null>(
    () => faculty?.find((item) => item.id === selectedFacultyId) || null,
    [faculty, selectedFacultyId],
  );
  const selectedRun = useMemo<ScheduleRun | null>(
    () => usableRuns.find((run) => run.id === selectedRunId) || null,
    [selectedRunId, usableRuns],
  );
  const { data: timetable, loading: loadingTimetable, refetch: refetchTimetable } = useFacultyTimetable(
    workspaceId || null,
    selectedRunId || null,
    selectedFacultyId || null,
  );

  const assignedPeriodsByFaculty = useMemo(() => {
    const map = new Map<string, number>();
    if (selectedFacultyId && timetable) {
      map.set(selectedFacultyId, timetable.reduce((sum, item) => sum + (item.duration_periods || 1), 0));
    }
    return map;
  }, [selectedFacultyId, timetable]);

  const exportData = selectedFaculty && selectedRun ? buildExportDataFromFacultyAssignments({
    assignments: timetable || [],
    organization: organization || null,
    meta: {
      title: `${selectedFaculty.name} Weekly Timetable`,
      subtitle: 'Faculty schedule distribution copy',
      organizationName: organization?.name || 'SlotForge Institution',
      scheduleLabel: `Run ${selectedRun.id.slice(0, 8)}`,
      generatedAt: selectedRun.created_at,
      filename: `${selectedFaculty.name}-timetable`,
    },
  }) : null;

  const generateRun = async () => {
    if (!workspaceId) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const { data } = await api.post(`/api/v1/workspaces/${workspaceId}/schedule-runs/`);
      await refetchRuns();
      if (data.run_id) {
        setSelectedRunId(data.run_id);
      }
      refetchTimetable();
    } catch (err: any) {
      setGenerateError(err.response?.data?.detail || err.message || 'Could not generate schedule run');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="FACULTY / DISTRIBUTION"
        title={`${config.teacherTitle} Timetables`}
        subtitle="Review individual weekly schedules and publish share links for distribution."
        actions={
          <button
            type="button"
            onClick={generateRun}
            disabled={generating || !workspaceId}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-50"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>play_circle</span>
            {generating ? 'Generating...' : 'Generate run'}
          </button>
        }
      />

      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-12 space-y-4 lg:col-span-4 xl:col-span-3">
          <div className="rounded-xl border-2 border-rule bg-paper-raised">
            <div className="border-b border-rule px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>{config.teacherTitle}</p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">{faculty?.length || 0} listed</p>
                </div>
                <Link
                  to="/resources/teachers"
                  className="rounded-lg border border-rule p-2 text-on-surface-variant hover:bg-accent-soft hover:text-primary"
                  title={`Manage ${config.teacherTitle}`}
                  aria-label={`Manage ${config.teacherTitle}`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>settings</span>
                </Link>
              </div>
            </div>

            <div className="max-h-[62vh] space-y-3 overflow-y-auto p-3">
              {loadingFaculty ? (
                <div className="rounded-lg bg-surface-container-low px-4 py-8 text-center text-sm text-mono-grey">Loading...</div>
              ) : (faculty || []).length === 0 ? (
                <div className="rounded-lg border border-dashed border-rule px-4 py-8 text-center">
                  <span className="material-symbols-outlined text-outline-variant" style={{ fontSize: 34 }}>badge</span>
                  <p className="mt-2 text-sm text-on-surface-variant">No {config.teacherTitle.toLowerCase()} found</p>
                  <Link to="/resources/teachers" className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline">
                    Add {config.teacherLabel.toLowerCase()}
                  </Link>
                </div>
              ) : (
                (faculty || []).map((item) => (
                  <FacultyCard
                    key={item.id}
                    faculty={item}
                    selected={item.id === selectedFacultyId}
                    assignedPeriods={assignedPeriodsByFaculty.get(item.id) || 0}
                    onSelect={() => setSelectedFacultyId(item.id)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border-2 border-rule bg-paper-raised p-4">
            <label className="text-label-caps text-mono-grey" style={{ fontSize: 10 }} htmlFor="run-selector">
              Schedule run
            </label>
            <select
              id="run-selector"
              value={selectedRunId}
              onChange={(event) => setSelectedRunId(event.target.value)}
              disabled={loadingRuns || usableRuns.length === 0}
              className="academic-input mt-2 w-full text-sm"
            >
              {usableRuns.length === 0 ? (
                <option value="">No successful runs</option>
              ) : usableRuns.map((run) => (
                <option key={run.id} value={run.id}>
                  {new Date(run.created_at).toLocaleString()} · {run.id.slice(0, 8)}
                </option>
              ))}
            </select>
            {generateError && (
              <div className="mt-3 rounded-lg border border-error/20 bg-error-container px-3 py-2 text-xs text-on-error-container">
                {generateError}
              </div>
            )}
          </div>
        </aside>

        <section className="col-span-12 space-y-6 lg:col-span-8 xl:col-span-6">
          {!selectedFaculty ? (
            <div className="rounded-xl border-2 border-rule bg-paper-raised p-12 text-center text-sm text-mono-grey">
              Select a faculty member.
            </div>
          ) : !selectedRun ? (
            <div className="rounded-xl border-2 border-rule bg-paper-raised p-12 text-center">
              <span className="material-symbols-outlined text-outline-variant" style={{ fontSize: 42 }}>calendar_month</span>
              <h3 className="mt-3 text-headline-sm text-on-surface">No successful run selected</h3>
              <p className="mx-auto mt-2 max-w-md text-body-sm text-on-surface-variant">
                Generate a workspace run to view and share faculty timetables.
              </p>
            </div>
          ) : loadingTimetable ? (
            <div className="rounded-xl border-2 border-rule bg-paper-raised p-12 text-center text-sm text-mono-grey">
              Loading timetable...
            </div>
          ) : (
            <FacultyTimetableView
              facultyName={selectedFaculty.name}
              assignments={timetable || []}
              organization={organization || null}
              versionLabel={selectedRun.schedule_version_id ? `Run ${selectedRun.id.slice(0, 8)}` : null}
              publishedAt={selectedRun.created_at}
            />
          )}
        </section>

        <aside className="col-span-12 lg:col-span-12 xl:col-span-3">
          <div className="mb-4 flex justify-end">
            <ExportButton data={exportData} align="right" />
          </div>
          <ShareLinkPanel workspaceId={workspaceId || null} faculty={selectedFaculty} activeRun={selectedRun} />
        </aside>
      </div>
    </div>
  );
}
