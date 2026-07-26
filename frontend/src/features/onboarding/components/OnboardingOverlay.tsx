import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import {
  useOrganization,
  useRooms,
  useSections,
  useSubjects,
  useTeachers,
  useTimetableVersions,
  useTeacherSubjectAssignments,
  useSectionSubjectTeacherAssignments,
  type Room,
  type Section,
  type Subject,
  type Teacher,
} from '../../../hooks/useApi';
import StepProgress, { type OnboardingStep } from './StepProgress';
import StepTransition from './StepTransition';
import PresetPicker from './PresetPicker';
import { presetOptions, type DomainPresetKey } from './presets';
import TimeGridBuilder, { type TimeGridConfig } from './TimeGridBuilder';
import QuickAddList, { type QuickItem } from './QuickAddList';
import ConstraintSelector from './ConstraintSelector';
import PreflightCheck, { type PreflightWarning } from './PreflightCheck';
import { OnboardingSkeleton } from './OnboardingSkeleton';
import { useOnboardingProgress } from '../hooks/useOnboardingProgress';
import AssignmentStep from './AssignmentStep';

const workspaceSchema = z.object({
  organizationName: z.string().min(2, 'Organization name is required'),
  workspaceName: z.string().min(2, 'Workspace name is required'),
});

type WorkspaceForm = z.infer<typeof workspaceSchema>;

const flowCopy: Record<DomainPresetKey, {
  resource: [string, string, string, string?];
  task: [string, string, string, string?];
  group: [string, string, string, string?];
  location: [string, string, string, string?];
}> = {
  academic: {
    resource: ['Add teachers', 'Create faculty resources before assigning them to subjects and sections.', 'school', 'Teacher name'],
    task: ['Add subjects', 'Set weekly periods and lab/theory length for each subject.', 'menu_book', 'Subject name'],
    group: ['Add sections', 'Create class sections and enable section-room split if needed.', 'account_tree', 'Section name'],
    location: ['Add rooms + labs', 'Add classrooms and labs with capacities that can host sections.', 'meeting_room', 'Room or lab name'],
  },
  staff_roster: {
    resource: ['Add employees', 'List employees and the roles they can cover.', 'badge', 'Employee name'],
    task: ['Add departments', 'Capture departments or coverage pools that need staffing.', 'corporate_fare', 'Department name'],
    group: ['Set coverage groups', 'Create teams or coverage groups for shift requirements.', 'groups', 'Team name'],
    location: ['Add work zones', 'Add locations, wards, or service desks that need coverage.', 'location_on', 'Work zone'],
  },
  event: {
    resource: ['Add speakers', 'List speakers and their topics or availability notes.', 'record_voice_over', 'Speaker name'],
    task: ['Add sessions', 'Create sessions with duration or topic detail.', 'event_note', 'Session name'],
    group: ['Add volunteers', 'Add volunteer teams or audience tracks if needed.', 'volunteer_activism', 'Track or team'],
    location: ['Add halls', 'Add halls with capacity and equipment notes.', 'meeting_room', 'Hall name'],
  },
  exam: {
    resource: ['Add invigilators', 'List invigilators who can be assigned to exam slots.', 'supervisor_account', 'Invigilator name'],
    task: ['Add courses', 'Create courses and expected student counts.', 'assignment', 'Course name'],
    group: ['Add student groups', 'Create batches, programs, or cohorts that must avoid clashes.', 'groups', 'Student group'],
    location: ['Add exam halls', 'Add halls with seating capacity and accessibility notes.', 'meeting_room', 'Exam hall'],
  },
  facility: {
    resource: ['Add requesters', 'Add teams or people who request room bookings.', 'person_add', 'Requester name'],
    task: ['Add booking types', 'Capture recurring meeting, lab, or event booking categories.', 'event_available', 'Booking type'],
    group: ['Add user groups', 'Group requesters by team, department, or priority class.', 'groups', 'User group'],
    location: ['Add facilities', 'Add rooms, labs, studios, or shared spaces.', 'domain', 'Facility name'],
  },
};

const defaultTimeGrid: TimeGridConfig = {
  schedulingMode: 'fixed_weekday',
  cycleLength: 5,
  periodsPerDay: 6,
  shiftBlocks: [],
};

const defaultConstraints = ['no_teacher_double_booking', 'no_room_double_booking', 'weekly_subject_hours'];

const makeId = () => {
  if ('randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

function toQuickItem(item: Teacher | Room | Subject | Section): QuickItem {
  if ('capacity' in item) return { id: item.id, name: item.name, detail: item.type, count: item.capacity };
  if ('weekly_hours' in item) return { id: item.id, name: item.name, detail: `${item.weekly_hours} weekly periods`, count: item.session_length };
  if ('size' in item) return { id: item.id, name: item.name, count: item.size };
  return { id: item.id, name: item.name };
}

function StepHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div>
      <p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>{eyebrow}</p>
      <h1 className="mt-3 max-w-3xl text-[clamp(2rem,4vw,4.2rem)] font-semibold leading-[1.05] text-on-surface" style={{ fontFamily: 'var(--font-display)' }}>
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-on-surface-variant">{subtitle}</p>
    </div>
  );
}

function SubtleLoading({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant">
      <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
      {label}
    </span>
  );
}

export default function OnboardingOverlay() {
  const navigate = useNavigate();
  const { organizationId } = useAuth();
  const { data: organization, loading: organizationLoading, refetch: refetchOrganization } = useOrganization(organizationId);
  const teachers = useTeachers(organizationId);
  const rooms = useRooms(organizationId);
  const subjects = useSubjects(organizationId);
  const sections = useSections(organizationId);
  const versions = useTimetableVersions(organizationId);
  const teacherAssignments = useTeacherSubjectAssignments(organizationId);
  const sectionAssignments = useSectionSubjectTeacherAssignments(organizationId);
  const progressState = useOnboardingProgress(organizationId);

  const [currentStep, setCurrentStep] = useState(0);
  const [preset, setPreset] = useState<DomainPresetKey>('academic');
  const [timeGrid, setTimeGrid] = useState<TimeGridConfig>(defaultTimeGrid);
  const [localResources, setLocalResources] = useState<QuickItem[]>([]);
  const [localTasks, setLocalTasks] = useState<QuickItem[]>([]);
  const [localGroups, setLocalGroups] = useState<QuickItem[]>([]);
  const [localLocations, setLocalLocations] = useState<QuickItem[]>([]);
  const [constraints, setConstraints] = useState<string[]>(defaultConstraints);
  const [sectionRoomSplit, setSectionRoomSplit] = useState(false);
  const [checking, setChecking] = useState(false);
  const [backendPreflightWarnings, setBackendPreflightWarnings] = useState<PreflightWarning[] | null>(null);
  const [backendPreflightFeasible, setBackendPreflightFeasible] = useState<boolean | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  const form = useForm<WorkspaceForm>({
    resolver: zodResolver(workspaceSchema),
    values: {
      organizationName: organization?.name || '',
      workspaceName: `${organization?.name || 'Academic'} workspace`,
    },
  });

  useEffect(() => {
    if (!progressState.loading) setCurrentStep(progressState.progress.current_step || 0);
  }, [progressState.loading, progressState.progress.current_step]);

  const academicResources = useMemo(() => (teachers.data || []).map(toQuickItem), [teachers.data]);
  const academicTasks = useMemo(() => (subjects.data || []).map(toQuickItem), [subjects.data]);
  const academicGroups = useMemo(() => (sections.data || []).map(toQuickItem), [sections.data]);
  const academicLocations = useMemo(() => (rooms.data || []).map(toQuickItem), [rooms.data]);

  const activeResources = preset === 'academic' ? academicResources : localResources;
  const activeTasks = preset === 'academic' ? academicTasks : localTasks;
  const activeGroups = preset === 'academic' ? academicGroups : localGroups;
  const activeLocations = preset === 'academic' ? academicLocations : localLocations;

  const steps: OnboardingStep[] = useMemo(() => [
    { key: 'organization', title: 'Create / Name Your Organization', label: 'Organization', icon: 'domain' },
    { key: 'workspace', title: 'Create a Workspace', label: 'Workspace', icon: 'workspaces' },
    { key: 'preset', title: 'Choose a Domain Preset', label: 'Preset', icon: 'category' },
    { key: 'time', title: 'Configure Time Structure', label: preset === 'staff_roster' ? 'Shifts' : preset === 'event' ? 'Time blocks' : preset === 'exam' ? 'Exam slots' : preset === 'facility' ? 'Booking slots' : 'Periods', icon: 'calendar_clock' },
    { key: 'resources', title: flowCopy[preset].resource[0], label: preset === 'academic' ? 'Teachers' : 'Resources', icon: 'badge' },
    { key: 'tasks', title: flowCopy[preset].task[0], label: preset === 'academic' ? 'Subjects' : 'Tasks', icon: 'task_alt' },
    { key: 'groups', title: flowCopy[preset].group[0], label: preset === 'academic' ? 'Sections' : 'Groups', icon: 'groups' },
    { key: 'locations', title: flowCopy[preset].location[0], label: preset === 'academic' ? 'Rooms' : 'Locations', icon: 'meeting_room' },
    { key: 'assignments', title: 'Connect the timetable', label: 'Assignments', icon: 'account_tree' },
    { key: 'constraints', title: 'Define Constraints', label: 'Constraints', icon: 'rule_settings' },
    { key: 'preflight', title: 'Preflight Check', label: 'Preflight', icon: 'fact_check' },
    { key: 'generate', title: 'Generate First Schedule', label: 'Generate', icon: 'play_circle' },
  ], [preset]);

  const localPreflightWarnings = useMemo<PreflightWarning[]>(() => {
    const warnings: PreflightWarning[] = [];
    if (activeResources.length === 0) warnings.push({ type: 'resources', severity: 'error', message: 'Add at least one resource before generating.' });
    if (activeTasks.length === 0) warnings.push({ type: 'tasks', severity: 'error', message: 'Add at least one task before generating.' });
    if (activeGroups.length === 0) warnings.push({ type: 'groups', severity: 'warning', message: 'No groups are defined yet. The first schedule may be too broad.' });
    if (activeLocations.length === 0) warnings.push({ type: 'locations', severity: 'warning', message: 'No locations are available for assignment.' });
    if (preset === 'academic' && activeLocations.length > 0 && activeGroups.some((group) => (group.count || 0) > Math.max(...activeLocations.map((room) => room.count || 0)))) {
      warnings.push({ type: 'capacity', severity: sectionRoomSplit ? 'info' : 'warning', message: sectionRoomSplit ? 'Section-room split is enabled for oversized sections.' : 'At least one section is larger than the biggest room.' });
    }
    return warnings.length ? warnings : [{ type: 'ready', severity: 'info', message: 'No obvious setup blockers found.' }];
  }, [activeGroups, activeLocations, activeResources.length, activeTasks.length, preset, sectionRoomSplit]);

  const preflightWarnings = backendPreflightWarnings || localPreflightWarnings;

  const saveProgress = async (stepKey: string, nextStep: number) => {
    await progressState.completeStep(stepKey, nextStep);
    setCurrentStep(nextStep);
  };

  const validateCurrentStep = async () => {
    setStepError(null);
    if (currentStep === 0 || currentStep === 1) {
      const valid = await form.trigger(currentStep === 0 ? 'organizationName' : 'workspaceName');
      if (!valid) return false;
    }
    if (currentStep === 4 && activeResources.length === 0) {
      setStepError('Add at least one resource to continue.');
      return false;
    }
    if (currentStep === 5 && activeTasks.length === 0) {
      setStepError('Add at least one task to continue.');
      return false;
    }
    if (currentStep === 7 && activeLocations.length === 0) {
      setStepError('Add at least one location to continue.');
      return false;
    }
    if (currentStep === 9 && constraints.length === 0) {
      setStepError('Select at least one constraint template.');
      return false;
    }
    return true;
  };

  const continueStep = async () => {
    const valid = await validateCurrentStep();
    if (!valid) return;

    if (currentStep === 0 && organizationId) {
      const nextName = form.getValues('organizationName');
      if (nextName && nextName !== organization?.name) {
        await api.patch(`/organizations/${organizationId}`, { name: nextName });
        refetchOrganization();
      }
    }

    if (currentStep === 10) {
      setChecking(true);
      try {
        if (organizationId) {
          const { data } = await api.post<{ feasible: boolean; warnings: PreflightWarning[] }>(`/api/v1/workspaces/${organizationId}/preflight-check`);
          setBackendPreflightFeasible(data.feasible);
          setBackendPreflightWarnings(data.warnings);
        } else {
          await new Promise((resolve) => window.setTimeout(resolve, 450));
        }
      } catch {
        setBackendPreflightFeasible(null);
        setBackendPreflightWarnings(null);
      } finally {
        setChecking(false);
      }
    }

    const nextStep = Math.min(currentStep + 1, steps.length - 1);
    await saveProgress(steps[currentStep].key, nextStep);
  };

  const skipOnboarding = async () => {
    await progressState.markSkipped();
    navigate('/', { replace: true });
  };

  const addAcademicItem = async (kind: 'resource' | 'task' | 'group' | 'location', item: Omit<QuickItem, 'id'>) => {
    if (!organizationId) return;
    if (kind === 'resource') {
      await api.post('/teachers', { organization_id: organizationId, name: item.name });
      teachers.refetch();
    }
    if (kind === 'task') {
      await api.post('/subjects', { organization_id: organizationId, name: item.name, weekly_hours: item.count || 4, session_length: 1, color: null });
      subjects.refetch();
    }
    if (kind === 'group') {
      await api.post('/sections', { organization_id: organizationId, name: item.name, size: item.count || 40, class_teacher_id: null });
      sections.refetch();
    }
    if (kind === 'location') {
      await api.post('/rooms', { organization_id: organizationId, name: item.name, capacity: item.count || 40, room_type: item.detail || 'classroom' });
      rooms.refetch();
    }
  };

  const removeAcademicItem = async (kind: 'resource' | 'task' | 'group' | 'location', id: string) => {
    const paths = { resource: 'teachers', task: 'subjects', group: 'sections', location: 'rooms' };
    await api.delete(`/${paths[kind]}/${id}`);
    if (kind === 'resource') teachers.refetch();
    if (kind === 'task') subjects.refetch();
    if (kind === 'group') sections.refetch();
    if (kind === 'location') rooms.refetch();
  };

  const addLocalItem = (setter: React.Dispatch<React.SetStateAction<QuickItem[]>>, item: Omit<QuickItem, 'id'>) => {
    setter((items) => [...items, { ...item, id: makeId() }]);
  };

  const removeLocalItem = (setter: React.Dispatch<React.SetStateAction<QuickItem[]>>, id: string) => {
    setter((items) => items.filter((item) => item.id !== id));
  };

  const generateSchedule = async () => {
    setGenerating(true);
    setGenerateMessage(null);
    try {
      if (preset === 'academic' && organizationId) {
        const { data } = await api.post('/timetables/generate', { organization_id: organizationId });
        versions.refetch();
        setGenerateMessage(data?.infeasible_reason || 'First timetable generated. Review it in Solver Engine.');
      } else {
        setGenerateMessage('Setup saved. Generation for this preset will activate when the preset backend is connected.');
      }
      await saveProgress('generate', 11);
    } catch (error) {
      setGenerateMessage(error instanceof Error ? error.message : 'Could not generate this schedule yet.');
    } finally {
      setGenerating(false);
    }
  };

  const renderStep = () => {
    const copy = flowCopy[preset];

    if (currentStep === 0) {
      return (
        <section className="max-w-2xl">
          <StepHeader eyebrow="Step 1" title="Name the organization that owns this schedule." subtitle="This name appears in the app shell, exports, and future shared workspaces." />
          <label className="mt-8 block">
            <span className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>Organization name</span>
            <input {...form.register('organizationName')} className="academic-input mt-3 w-full text-xl" />
            {form.formState.errors.organizationName && <p className="mt-2 text-sm font-semibold text-error">{form.formState.errors.organizationName.message}</p>}
          </label>
        </section>
      );
    }

    if (currentStep === 1) {
      return (
        <section className="max-w-2xl">
          <StepHeader eyebrow="Step 2" title="Create the first scheduling workspace." subtitle="A workspace keeps a timetable, roster, event, or booking setup separate from other scheduling domains." />
          <label className="mt-8 block">
            <span className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>Workspace name</span>
            <input {...form.register('workspaceName')} className="academic-input mt-3 w-full text-xl" />
            {form.formState.errors.workspaceName && <p className="mt-2 text-sm font-semibold text-error">{form.formState.errors.workspaceName.message}</p>}
          </label>
        </section>
      );
    }

    if (currentStep === 2) {
      return (
        <section>
          <StepHeader eyebrow="Step 3" title="Choose the scheduling domain." subtitle="The next steps adapt to the preset you choose. Academic setup writes into the current timetable data model today." />
          <div className="mt-8">
            <PresetPicker value={preset} onChange={(nextPreset) => {
              setPreset(nextPreset);
              setConstraints(nextPreset === 'academic' ? defaultConstraints : []);
            }} />
          </div>
        </section>
      );
    }

    if (currentStep === 3) return <TimeGridBuilder preset={preset} value={timeGrid} onChange={setTimeGrid} />;
    if (currentStep === 4) {
      return (
        <QuickAddList
          title={copy.resource[0]}
          description={copy.resource[1]}
          icon={copy.resource[2]}
          placeholder={copy.resource[3] || 'Resource name'}
          detailPlaceholder={preset === 'academic' ? 'Expertise note, optional' : 'Role or availability note'}
          items={activeResources}
          onAdd={(item) => preset === 'academic' ? addAcademicItem('resource', item) : addLocalItem(setLocalResources, item)}
          onRemove={(id) => preset === 'academic' ? removeAcademicItem('resource', id) : removeLocalItem(setLocalResources, id)}
        />
      );
    }
    if (currentStep === 5) {
      return (
        <QuickAddList
          title={copy.task[0]}
          description={copy.task[1]}
          icon={copy.task[2]}
          placeholder={copy.task[3] || 'Task name'}
          detailPlaceholder={preset === 'academic' ? 'Lab/theory note, optional' : 'Duration or requirement note'}
          numericLabel={preset === 'academic' ? 'Weekly periods' : 'Required count'}
          items={activeTasks}
          onAdd={(item) => preset === 'academic' ? addAcademicItem('task', item) : addLocalItem(setLocalTasks, item)}
          onRemove={(id) => preset === 'academic' ? removeAcademicItem('task', id) : removeLocalItem(setLocalTasks, id)}
        />
      );
    }
    if (currentStep === 6) {
      return (
        <div className="space-y-5">
          <QuickAddList
            title={copy.group[0]}
            description={copy.group[1]}
            icon={copy.group[2]}
            placeholder={copy.group[3] || 'Group name'}
            numericLabel={preset === 'academic' ? 'Section size' : 'Expected size'}
            items={activeGroups}
            onAdd={(item) => preset === 'academic' ? addAcademicItem('group', item) : addLocalItem(setLocalGroups, item)}
            onRemove={(id) => preset === 'academic' ? removeAcademicItem('group', id) : removeLocalItem(setLocalGroups, id)}
          />
          {preset === 'academic' && (
            <label className="flex items-center justify-between gap-4 rounded-xl border-2 border-rule bg-paper-raised p-4">
              <span>
                <span className="block text-sm font-black text-on-surface">Enable section-room split</span>
                <span className="mt-1 block text-sm text-on-surface-variant">Allow oversized sections to split across compatible rooms during generation.</span>
              </span>
              <input type="checkbox" checked={sectionRoomSplit} onChange={(event) => setSectionRoomSplit(event.target.checked)} className="toggle-switch" />
            </label>
          )}
        </div>
      );
    }
    if (currentStep === 7) {
      return (
        <QuickAddList
          title={copy.location[0]}
          description={copy.location[1]}
          icon={copy.location[2]}
          placeholder={copy.location[3] || 'Location name'}
          detailPlaceholder={preset === 'academic' ? 'classroom or lab' : 'Equipment or access note'}
          numericLabel="Capacity"
          items={activeLocations}
          onAdd={(item) => preset === 'academic' ? addAcademicItem('location', item) : addLocalItem(setLocalLocations, item)}
          onRemove={(id) => preset === 'academic' ? removeAcademicItem('location', id) : removeLocalItem(setLocalLocations, id)}
        />
      );
    }
    if (currentStep === 8) return <AssignmentStep teachers={teachers.data || []} subjects={subjects.data || []} sections={sections.data || []} teacherAssignments={teacherAssignments.data || []} sectionAssignments={sectionAssignments.data || []} onRefresh={() => { teacherAssignments.refetch(); sectionAssignments.refetch(); }} />;
    if (currentStep === 9) return <ConstraintSelector preset={preset} value={constraints} onChange={setConstraints} />;
    if (currentStep === 10) {
      return (
        <PreflightCheck
          preset={preset}
          resources={activeResources}
          tasks={activeTasks}
          groups={activeGroups}
          locations={activeLocations}
          constraints={constraints}
          warnings={preflightWarnings}
          checking={checking}
        />
      );
    }

    return (
      <section className="max-w-3xl">
        <StepHeader eyebrow="Step 11" title={preset === 'facility' ? 'Go to the booking dashboard.' : 'Generate the first schedule.'} subtitle="This creates the first usable output from the setup you just assembled." />
        <div className="mt-8 rounded-xl border-2 border-rule bg-paper-raised p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-surface-container p-4"><p className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>Preset</p><p className="mt-1 font-black text-on-surface">{presetOptions.find((item) => item.key === preset)?.name}</p></div>
            <div className="rounded-lg bg-surface-container p-4"><p className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>Warnings</p><p className="mt-1 font-black text-on-surface">{preflightWarnings.filter((warning) => warning.severity !== 'info').length}</p></div>
            <div className="rounded-lg bg-surface-container p-4"><p className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>Preflight</p><p className="mt-1 font-black text-on-surface">{backendPreflightFeasible === null ? 'Local' : backendPreflightFeasible ? 'Feasible' : 'Needs work'}</p></div>
          </div>
          <button
            type="button"
            onClick={generateSchedule}
            disabled={generating}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-60"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 19 }}>{generating ? 'progress_activity' : 'play_circle'}</span>
            {generating ? 'Generating...' : preset === 'facility' ? 'Open booking dashboard' : 'Generate first schedule'}
          </button>
          {generateMessage && <p className="mt-4 text-sm font-semibold text-on-surface-variant">{generateMessage}</p>}
        </div>
      </section>
    );
  };

  if (organizationLoading || progressState.loading) {
    return <OnboardingSkeleton />;
  }

  return (
    <div className="onboarding-screen">
      <div className="onboarding-shell max-w-6xl space-y-6 pb-12">
      <header className="onboarding-header rounded-2xl border-2 border-rule bg-paper-raised p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>Guided Setup Wizard</span>
            <h1 className="text-headline-md text-on-surface font-bold mt-1">
              {organization?.name || 'SlotForge'} / {form.watch('workspaceName') || 'Workspace'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {progressState.saving && <SubtleLoading label="Saving progress…" />}
            <button
              type="button"
              onClick={skipOnboarding}
              className="rounded-xl border border-rule px-4 py-2 text-xs font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            >
              Skip onboarding
            </button>
          </div>
        </div>
        <div className="mt-6">
          <StepProgress
            steps={steps}
            currentStep={currentStep}
            completedSteps={progressState.progress.completed_steps}
            onSelectStep={(index) => setCurrentStep(index)}
          />
        </div>
      </header>

      <main className="rounded-2xl border-2 border-rule bg-paper-raised p-8 shadow-sm">
        <StepTransition stepKey={steps[currentStep].key}>
          {renderStep()}
        </StepTransition>

        {stepError && (
          <div className="mt-6 rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container">
            {stepError}
          </div>
        )}

        <footer className="mt-10 flex items-center justify-between border-t border-rule pt-6">
          <button
            type="button"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-rule px-5 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-40"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            Back
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={continueStep}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition-all hover:bg-primary-container hover:shadow-md"
            >
              Continue
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition-all hover:bg-primary-container hover:shadow-md"
            >
              Go to dashboard
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>dashboard</span>
            </button>
          )}
        </footer>
      </main>
      </div>
    </div>
  );
}
