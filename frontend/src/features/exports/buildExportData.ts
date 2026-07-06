import type { FacultyAssignment, Organization, Room, ScheduledSlot, Section, Subject, Teacher } from '../../hooks/useApi';
import { getSubjectColor, hashSubjectColor } from '../../lib/subjectColors';
import type { ExportCell, ExportTimetableData, ExportMeta } from './types';
import { cleanFilename, inferDays } from './utils';

interface BuildFromScheduledOptions {
  assignments: ScheduledSlot[];
  teachers: Teacher[];
  rooms: Room[];
  subjects: Subject[];
  sections: Section[];
  organization: Organization | null;
  meta: Omit<ExportMeta, 'filename'> & { filename?: string };
}

interface BuildFromFacultyOptions {
  assignments: FacultyAssignment[];
  organization?: Organization | null;
  meta: Omit<ExportMeta, 'filename'> & { filename?: string };
}

function defaultFilename(title: string) {
  return `${cleanFilename(title)}-timetable`;
}

function organizationDays(organization: Organization | null | undefined, cells: ExportCell[]) {
  if (!organization) return inferDays(cells);
  const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  if (organization.scheduling_mode === 'day_order') {
    return Array.from({ length: organization.cycle_length || 5 }).map((_, index) => `Day Order ${roman[index + 1] || index + 1}`);
  }
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return Array.from({ length: organization.cycle_length || 5 }).map((_, index) => weekdays[index] || `Day ${index + 1}`);
}

export function buildExportDataFromScheduledSlots(options: BuildFromScheduledOptions): ExportTimetableData {
  const teacherMap = new Map(options.teachers.map((item) => [item.id, item.name]));
  const roomMap = new Map(options.rooms.map((item) => [item.id, item.name]));
  const subjectMap = new Map(options.subjects.map((item) => [item.id, item]));
  const sectionMap = new Map(options.sections.map((item) => [item.id, item.name]));
  const cells: ExportCell[] = options.assignments.map((slot) => {
    const subject = subjectMap.get(slot.subject_id);
    return {
      id: slot.id,
      day: slot.day,
      period: slot.period,
      duration: slot.duration_periods || 1,
      subject: subject?.name || 'Unknown subject',
      color: subject ? getSubjectColor(subject) : hashSubjectColor(slot.subject_id || slot.id),
      section: sectionMap.get(slot.section_id) || 'Unknown section',
      teacher: teacherMap.get(slot.teacher_id) || 'Unknown teacher',
      room: roomMap.get(slot.room_id) || 'Unknown room',
    };
  });

  return {
    meta: {
      ...options.meta,
      filename: options.meta.filename || defaultFilename(options.meta.title),
      generatedAt: options.meta.generatedAt || new Date().toISOString(),
    },
    days: organizationDays(options.organization, cells),
    periods: options.organization?.periods_per_day || Math.max(5, ...cells.map((cell) => cell.period + cell.duration - 1), 1),
    cells,
  };
}

export function buildExportDataFromFacultyAssignments(options: BuildFromFacultyOptions): ExportTimetableData {
  const cells: ExportCell[] = options.assignments.map((slot) => ({
    id: slot.id,
    day: slot.day,
    period: slot.period,
    duration: slot.duration_periods || 1,
    subject: slot.subject_name || 'Class',
    color: slot.subject_color || hashSubjectColor(slot.subject_id || slot.subject_name || slot.id),
    section: slot.section_name || '',
    teacher: slot.teacher_name || '',
    room: slot.room_name || '',
  }));

  return {
    meta: {
      ...options.meta,
      filename: options.meta.filename || defaultFilename(options.meta.title),
      generatedAt: options.meta.generatedAt || new Date().toISOString(),
    },
    days: organizationDays(options.organization, cells),
    periods: options.organization?.periods_per_day || Math.max(5, ...cells.map((cell) => cell.period + cell.duration - 1), 1),
    cells,
  };
}
