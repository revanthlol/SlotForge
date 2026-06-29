import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRooms, useSections, useSubjects, useTeachers, useTimetableVersions } from '../hooks/useApi';
import PageHeader from '../components/ui/PageHeader';

const steps = [
  {
    key: 'settings',
    icon: 'tune',
    title: 'Set scheduling cycle',
    description: 'Confirm fixed weekday or day-order mode, cycle length, and periods per day.',
    to: '/settings',
  },
  {
    key: 'teachers',
    icon: 'school',
    title: 'Add teachers',
    description: 'Create faculty resources before assigning them to subjects and sections.',
    to: '/resources/teachers',
    resource: 'teacher',
  },
  {
    key: 'rooms',
    icon: 'meeting_room',
    title: 'Add rooms',
    description: 'Add classrooms and labs with capacities that can host each section.',
    to: '/resources/rooms',
    resource: 'room',
  },
  {
    key: 'subjects',
    icon: 'menu_book',
    title: 'Add subjects',
    description: 'Set weekly periods, lab blocks, teachers, and color coding.',
    to: '/resources/subjects',
    resource: 'subject',
  },
  {
    key: 'sections',
    icon: 'account_tree',
    title: 'Map sections',
    description: 'Create sections and select exactly which subjects each section takes.',
    to: '/resources/sections',
    resource: 'section',
  },
  {
    key: 'solver',
    icon: 'precision_manufacturing',
    title: 'Generate timetable',
    description: 'Run the solver after resources and curriculum maps are ready.',
    to: '/solver',
  },
];

export default function OnboardingPage() {
  const { organizationId } = useAuth();
  const navigate = useNavigate();
  const { data: teachers } = useTeachers(organizationId);
  const { data: rooms } = useRooms(organizationId);
  const { data: subjects } = useSubjects(organizationId);
  const { data: sections } = useSections(organizationId);
  const { data: versions } = useTimetableVersions(organizationId);

  const complete: Record<string, boolean> = {
    settings: true,
    teachers: Boolean(teachers?.length),
    rooms: Boolean(rooms?.length),
    subjects: Boolean(subjects?.length),
    sections: Boolean(sections?.length),
    solver: Boolean(versions?.length),
  };

  const completedCount = steps.filter(step => complete[step.key]).length;

  const openStep = (step: typeof steps[number]) => {
    if (step.resource) {
      window.sessionStorage.setItem('slotforge:create-resource', step.resource);
    }
    navigate(step.to);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="SETUP / ONBOARDING"
        title="Institution Setup"
        subtitle="Build the minimum resource model needed for a reliable timetable"
        actions={
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 border-2 border-rule text-on-surface text-sm font-semibold rounded-lg hover:bg-accent-soft transition-colors"
          >
            Back to Dashboard
          </button>
        }
      />

      <section className="rounded-xl border-2 border-rule bg-paper-raised p-inset-standard">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>Setup Progress</p>
            <h2 className="mt-1 text-headline-sm text-on-surface">{completedCount} of {steps.length} steps ready</h2>
          </div>
          <div className="min-w-[220px] flex-1 max-w-md">
            <div className="h-2 overflow-hidden rounded-full bg-surface-container">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.round((completedCount / steps.length) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {steps.map((step, index) => {
          const done = complete[step.key];
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => openStep(step)}
              className="rounded-xl border-2 border-rule bg-paper-raised p-5 text-left transition-colors hover:border-primary/40 hover:bg-accent-soft/25"
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${done ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                    {done ? 'check' : step.icon}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-on-surface">{index + 1}. {step.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${done ? 'bg-accent-soft text-primary' : 'bg-surface-container text-mono-grey'}`}>
                      {done ? 'Ready' : 'Needed'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-on-surface-variant">{step.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
