import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  useTimetableVersions,
  useTimetable,
  useTeachers,
  useRooms,
  useSubjects,
  useSections,
  useOrganization,
} from '../hooks/useApi';
import PageHeader from '../components/ui/PageHeader';
import TimetableGrid from '../components/ui/TimetableGrid';
import StatusBadge from '../components/ui/StatusBadge';
import { Link } from 'react-router-dom';

export default function TimetablePage() {
  const { organizationId } = useAuth();
  const { data: organization } = useOrganization(organizationId);
  const { data: versions, loading: loadingVersions } = useTimetableVersions(organizationId);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');

  const { data: teachersData } = useTeachers(organizationId);
  const { data: roomsData } = useRooms(organizationId);
  const { data: subjectsData } = useSubjects(organizationId);
  const { data: sectionsData } = useSections(organizationId);

  const teachers = teachersData || [];
  const rooms = roomsData || [];
  const subjects = subjectsData || [];
  const sections = sectionsData || [];

  // Find the active/published version, or default to the latest version
  useEffect(() => {
    if (versions && versions.length > 0) {
      const published = versions.find((v) => v.status === 'published');
      if (published) {
        setSelectedVersionId(published.id);
      } else {
        setSelectedVersionId(versions[0].id);
      }
    }
  }, [versions]);

  const { data: timetable, loading: loadingTimetable } = useTimetable(selectedVersionId || null);

  const activeVersion = versions?.find((v) => v.id === selectedVersionId);

  const handleExport = () => {
    if (!activeVersion) return;
    alert(`Exporting Version ${activeVersion.version_number} to Excel/PDF format...`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="TIMETABLE / SCHEDULE"
        title="Weekly Schedule"
        subtitle="View and verify generated timetables across sections, teachers, and rooms"
        actions={
          activeVersion && (
            <button
              onClick={handleExport}
              className="px-4 py-2.5 bg-paper-raised text-primary border-2 border-rule text-sm font-semibold rounded-lg hover:bg-accent-soft transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                download
              </span>
              Export Schedule
            </button>
          )
        }
      />

      {/* Version Selector Panel */}
      {versions && versions.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 p-inset-compact bg-paper-raised border-2 border-rule rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>Active Version:</span>
            <select
              value={selectedVersionId}
              onChange={(e) => setSelectedVersionId(e.target.value)}
              className="academic-input min-w-[220px] text-sm py-1.5"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  Version {v.version_number} ({v.status})
                </option>
              ))}
            </select>
          </div>

          {activeVersion && (
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-mono-grey text-label-caps" style={{ fontSize: 9 }}>Status:</span>
                <StatusBadge status={activeVersion.status} />
              </div>
              {activeVersion.scores?.hard !== undefined && (
                <div className="flex items-center gap-3 border-l border-rule pl-4 text-mono-grey">
                  <span>
                    <strong className="text-on-surface">Hard Score: </strong>
                    {activeVersion.scores.hard}
                  </span>
                  <span>
                    <strong className="text-on-surface">Soft Score: </strong>
                    {activeVersion.scores.soft || 0}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Grid Display Area */}
      {loadingVersions ? (
        <div className="bg-paper-raised border-2 border-rule rounded-xl p-12 text-center text-body-sm text-mono-grey">
          Loading versions...
        </div>
      ) : versions && versions.length > 0 ? (
        loadingTimetable ? (
          <div className="bg-paper-raised border-2 border-rule rounded-xl p-12 text-center text-body-sm text-mono-grey">
            Loading timetable slot assignments...
          </div>
        ) : timetable ? (
          <div className="space-y-6">
            {/* If the timetable is infeasible, show a warning */}
            {timetable.infeasible_reason && (
              <div className="p-inset-compact bg-signal-soft border-l-4 border-secondary text-secondary rounded-xl flex gap-3">
                <span className="material-symbols-outlined shrink-0" style={{ fontSize: 22 }}>
                  warning
                </span>
                <div>
                  <h4 className="font-semibold text-sm">Schedule Infeasible (UNSAT)</h4>
                  <p className="text-xs mt-1 text-on-surface-variant">
                    {timetable.infeasible_reason}
                  </p>
                </div>
              </div>
            )}

            <TimetableGrid
              assignments={timetable.assignments}
              teachers={teachers}
              rooms={rooms}
              subjects={subjects}
              sections={sections}
              organization={organization || null}
            />
          </div>
        ) : (
          <div className="bg-paper-raised border-2 border-rule rounded-xl p-12 text-center text-body-sm text-mono-grey">
            Select a version to display the timetable.
          </div>
        )
      ) : (
        <div className="bg-paper-raised border-2 border-rule rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-outline-variant mb-3" style={{ fontSize: 48 }}>
            calendar_month
          </span>
          <h3 className="text-headline-sm text-on-surface">No schedules generated yet</h3>
          <p className="text-body-sm text-on-surface-variant max-w-md mx-auto mt-2">
            The Solver Engine will generate conflict-free schedules based on your constraints and resource lists.
          </p>
          <div className="mt-6">
            <Link
              to="/solver"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                precision_manufacturing
              </span>
              Go to Solver Engine
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
