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
  type TimetableVersion,
} from '../hooks/useApi';
import api from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import TimetableGrid from '../components/ui/TimetableGrid';

export default function VersionHistoryPage() {
  const { organizationId } = useAuth();
  const { data: organization } = useOrganization(organizationId);
  const { data: versions, loading: loadingVersions, refetch: refetchVersions } = useTimetableVersions(organizationId);

  const { data: teachersData } = useTeachers(organizationId);
  const { data: roomsData } = useRooms(organizationId);
  const { data: subjectsData } = useSubjects(organizationId);
  const { data: sectionsData } = useSections(organizationId);

  const teachers = teachersData || [];
  const rooms = roomsData || [];
  const subjects = subjectsData || [];
  const sections = sectionsData || [];

  const [selectedVersion, setSelectedVersion] = useState<TimetableVersion | null>(null);
  const [promoting, setPromoting] = useState(false);

  // Set first version as default selected on load
  useEffect(() => {
    if (versions && versions.length > 0 && !selectedVersion) {
      setSelectedVersion(versions[0]);
    } else if (versions && selectedVersion) {
      // Keep reference updated if refetched
      const updated = versions.find((v) => v.id === selectedVersion.id);
      if (updated) setSelectedVersion(updated);
    }
  }, [versions, selectedVersion]);

  const { data: timetable, loading: loadingTimetable } = useTimetable(selectedVersion?.id || null);

  const handlePromote = async () => {
    if (!selectedVersion || !organizationId) return;
    setPromoting(true);
    try {
      // Endpoint to promote version to published status
      await api.post(`/timetables/${selectedVersion.id}/publish`);
      refetchVersions();
      alert(`Version ${selectedVersion.version_number} has been promoted to PUBLISHED!`);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || err.message || 'Failed to promote version');
    } finally {
      setPromoting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="SOLVER / VERSION HISTORY"
        title="Version History"
        subtitle="Track, compare, and promote weekly timetable schedules and solver outputs"
      />

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Vertical Timeline */}
        <div className="col-span-12 md:col-span-4 lg:col-span-3 space-y-4">
          <div className="bg-paper-raised border-2 border-rule rounded-xl p-inset-compact">
            <h3 className="text-label-caps text-mono-grey mb-4" style={{ fontSize: 10 }}>
              Version Timeline
            </h3>

            {loadingVersions ? (
              <p className="text-xs text-mono-grey italic">Loading timeline...</p>
            ) : !versions || versions.length === 0 ? (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-outline-variant" style={{ fontSize: 32 }}>
                  history
                </span>
                <p className="text-xs text-mono-grey mt-2">No versions yet</p>
              </div>
            ) : (
              <div className="relative pl-6 border-l-2 border-rule space-y-6">
                {versions.map((v) => {
                  const isSelected = selectedVersion?.id === v.id;
                  const isPublished = v.status === 'published';

                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVersion(v)}
                      className={`relative cursor-pointer group transition-all`}
                    >
                      {/* Timeline node dot */}
                      <div
                        className={`absolute -left-[31px] top-1 w-4.5 h-4.5 rounded-full border-2 transition-all flex items-center justify-center ${
                          isSelected
                            ? 'bg-primary border-primary scale-110 shadow-sm'
                            : isPublished
                            ? 'bg-paper-raised border-primary'
                            : 'bg-surface-container border-rule group-hover:border-primary/50'
                        }`}
                      >
                        {isPublished && (
                          <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-paper-raised' : 'bg-primary'}`} />
                        )}
                      </div>

                      {/* Content Card */}
                      <div
                        className={`p-3 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'bg-accent-soft/30 border-primary text-primary'
                            : 'bg-paper-raised border-rule hover:bg-surface-bright/35 hover:border-rule/85'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
                            v{v.version_number}
                          </span>
                          <StatusBadge status={v.status} />
                        </div>
                        <p className="text-[10px] text-mono-grey mt-1">
                          {new Date(v.created_at).toLocaleDateString()} at{' '}
                          {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {v.scores && (
                          <div className="mt-2 pt-1.5 border-t border-rule/50 flex justify-between text-[9px] text-mono-grey font-mono">
                            <span>Hard: {v.scores.hard}</span>
                            <span>Soft: {v.scores.soft || 0}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Timetable Grid Preview & Promotion Actions */}
        <div className="col-span-12 md:col-span-8 lg:col-span-9 space-y-4">
          {selectedVersion ? (
            <div className="space-y-6">
              {/* Action Bar */}
              <div className="bg-paper-raised border-2 border-rule rounded-xl p-inset-compact flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-headline-sm text-on-surface">
                    Version {selectedVersion.version_number} Details
                  </h3>
                  <p className="text-xs text-mono-grey mt-1">
                    Generated on {new Date(selectedVersion.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {selectedVersion.status !== 'published' && (
                    <button
                      onClick={handlePromote}
                      disabled={promoting}
                      className="px-4 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        publish
                      </span>
                      {promoting ? 'Promoting...' : 'Promote to Published'}
                    </button>
                  )}
                  <span className="text-xs">
                    <StatusBadge status={selectedVersion.status} />
                  </span>
                </div>
              </div>

              {/* Grid or loader */}
              {loadingTimetable ? (
                <div className="bg-paper-raised border-2 border-rule rounded-xl p-12 text-center text-body-sm text-mono-grey">
                  Loading timetable slot assignments...
                </div>
              ) : timetable ? (
                <TimetableGrid
                  assignments={timetable.assignments}
                  teachers={teachers}
                  rooms={rooms}
                  subjects={subjects}
                  sections={sections}
                  organization={organization || null}
                />
              ) : (
                <div className="bg-paper-raised border-2 border-rule rounded-xl p-12 text-center text-body-sm text-mono-grey">
                  Failed to load timetable assignments.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-paper-raised border-2 border-rule rounded-xl p-12 text-center">
              <span className="material-symbols-outlined text-outline-variant mb-3" style={{ fontSize: 48 }}>
                history
              </span>
              <h3 className="text-headline-sm text-on-surface">Select a version</h3>
              <p className="text-body-sm text-on-surface-variant max-w-md mx-auto mt-2">
                Click on any version node in the left timeline to view its weekly slot assignments, metrics, and options.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
