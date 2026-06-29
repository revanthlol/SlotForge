import { useAuth } from '../contexts/AuthContext';
import { useTeachers, useRooms, useSubjects, useSections, useTimetableVersions } from '../hooks/useApi';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { organizationId } = useAuth();
  const { data: teachers } = useTeachers(organizationId);
  const { data: rooms } = useRooms(organizationId);
  const { data: subjects } = useSubjects(organizationId);
  const { data: sections } = useSections(organizationId);
  const { data: versions } = useTimetableVersions(organizationId);

  const totalResources = (teachers?.length || 0) + (rooms?.length || 0) + (subjects?.length || 0) + (sections?.length || 0);
  const recentVersions = versions?.slice(0, 5) || [];
  const publishedCount = versions?.filter(v => v.status === 'published').length || 0;

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Institutional scheduling engine status and resource summary"
        actions={
          <>
            <Link
              to="/resources/teachers"
              className="px-4 py-2 border-2 border-rule text-on-surface text-sm font-semibold rounded-lg hover:bg-accent-soft transition-colors"
            >
              Edit Resources
            </Link>
            <Link
              to="/solver"
              className="px-4 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                play_circle
              </span>
              New Generation Run
            </Link>
          </>
        }
      />

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-5 mb-8">
        {/* Left column: Stats */}
        <div className="col-span-4 space-y-5">
          {/* Utilization Rate */}
          <div className="bg-paper-raised border-2 border-rule rounded-xl p-inset-standard">
            <div className="flex items-center justify-between mb-4">
              <p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>Utilization Rate</p>
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
                analytics
              </span>
            </div>
            <p className="text-on-surface mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, lineHeight: 1 }}>
              {totalResources > 0 ? `${Math.min(Math.round((publishedCount / Math.max(totalResources, 1)) * 100), 100)}%` : '—'}
            </p>
            <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700"
                style={{ width: totalResources > 0 ? `${Math.min(Math.round((publishedCount / Math.max(totalResources, 1)) * 100), 100)}%` : '0%' }}
              />
            </div>
            <p className="text-data-table text-mono-grey mt-2">
              {publishedCount} published / {versions?.length || 0} total versions
            </p>
          </div>

          {/* Resource Counts */}
          <div className="grid grid-cols-2 gap-4">
            <ResourceCard
              icon="school"
              label="Teachers"
              count={teachers?.length || 0}
              to="/resources/teachers"
            />
            <ResourceCard
              icon="meeting_room"
              label="Rooms"
              count={rooms?.length || 0}
              to="/resources/rooms"
            />
            <ResourceCard
              icon="menu_book"
              label="Subjects"
              count={subjects?.length || 0}
              to="/resources/subjects"
            />
            <ResourceCard
              icon="groups"
              label="Sections"
              count={sections?.length || 0}
              to="/resources/sections"
            />
          </div>
        </div>

        {/* Right column: Solver + Versions */}
        <div className="col-span-8 space-y-5">
          {/* Solver Engine Status */}
          <div className="bg-inverse-surface text-inverse-on-surface rounded-xl p-inset-standard">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-inverse-primary" style={{ fontSize: 22 }}>
                  precision_manufacturing
                </span>
                <p className="text-label-caps text-inverse-primary" style={{ fontSize: 10 }}>
                  Solver Engine
                </p>
              </div>
              <StatusBadge status="Ready" />
            </div>
            <p className="text-headline-sm text-inverse-on-surface mb-2">
              No active generation jobs
            </p>
            <p className="text-body-sm text-inverse-on-surface/70">
              Engine is idle and ready for new constraint-solving runs. Last execution completed synchronously.
            </p>
            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-4">
              <div>
                <p className="text-data-table text-inverse-on-surface/50">Mode</p>
                <p className="text-sm font-semibold text-inverse-on-surface mt-0.5">Synchronous</p>
              </div>
              <div>
                <p className="text-data-table text-inverse-on-surface/50">Last Run</p>
                <p className="text-sm font-semibold text-inverse-on-surface mt-0.5">
                  {recentVersions[0] ? new Date(recentVersions[0].created_at).toLocaleDateString() : '—'}
                </p>
              </div>
              <div>
                <p className="text-data-table text-inverse-on-surface/50">Versions</p>
                <p className="text-sm font-semibold text-inverse-on-surface mt-0.5">
                  {versions?.length || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Versions */}
          <div className="bg-paper-raised border-2 border-rule rounded-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-rule">
              <p className="text-headline-sm text-on-surface">Recent Versions</p>
              <Link to="/versions" className="text-sm text-primary font-semibold hover:underline">
                View All →
              </Link>
            </div>
            {recentVersions.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <span className="material-symbols-outlined text-outline-variant mb-3" style={{ fontSize: 40 }}>
                  history
                </span>
                <p className="text-body-sm text-on-surface-variant">No timetable versions yet</p>
                <p className="text-data-table text-mono-grey mt-1">Generate your first schedule from the Solver Engine</p>
              </div>
            ) : (
              <div className="divide-y divide-rule">
                {recentVersions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between px-6 py-3 hover:bg-accent-soft/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center">
                        <span className="text-data-table text-on-surface-variant font-bold">
                          v{v.version_number}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-on-surface">
                          Version {v.version_number}
                        </p>
                        <p className="text-data-table text-mono-grey">
                          {new Date(v.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={v.status} />
                      {v.scores?.hard !== undefined && (
                        <span className="text-data-table text-mono-grey">
                          H:{v.scores.hard} S:{v.scores.soft || 0}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResourceCard({ icon, label, count, to }: { icon: string; label: string; count: number; to: string }) {
  return (
    <Link
      to={to}
      className="bg-paper-raised border-2 border-rule rounded-xl p-inset-compact hover:border-primary/30 hover:bg-accent-soft/30 transition-all duration-200 group"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors" style={{ fontSize: 20 }}>
          {icon}
        </span>
        <span className="material-symbols-outlined text-outline-variant opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: 16 }}>
          arrow_forward
        </span>
      </div>
      <p className="text-on-surface font-semibold" style={{ fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1 }}>
        {count}
      </p>
      <p className="text-label-caps text-mono-grey mt-1" style={{ fontSize: 9 }}>
        {label}
      </p>
    </Link>
  );
}
