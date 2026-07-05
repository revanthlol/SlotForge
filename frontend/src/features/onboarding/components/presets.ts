export type DomainPresetKey = 'academic' | 'staff_roster' | 'event' | 'exam' | 'facility';

export interface DomainPresetOption {
  key: DomainPresetKey;
  name: string;
  description: string;
  icon: string;
  sample: string;
}

export const presetOptions: DomainPresetOption[] = [
  {
    key: 'academic',
    name: 'Academic Timetable',
    description: 'Teachers, subjects, sections, labs, classrooms, and fixed periods.',
    icon: 'school',
    sample: 'Best for colleges and schools',
  },
  {
    key: 'staff_roster',
    name: 'Staff Roster',
    description: 'Employees, departments, shift blocks, and coverage rules.',
    icon: 'badge',
    sample: 'Best for operations teams',
  },
  {
    key: 'event',
    name: 'Event Scheduling',
    description: 'Speakers, sessions, halls, volunteers, and event time blocks.',
    icon: 'event',
    sample: 'Best for conferences',
  },
  {
    key: 'exam',
    name: 'Exam Scheduling',
    description: 'Courses, exam slots, halls, invigilators, and clash checks.',
    icon: 'assignment',
    sample: 'Best for exam cells',
  },
  {
    key: 'facility',
    name: 'Facility Booking',
    description: 'Rooms, requesters, availability windows, and booking rules.',
    icon: 'meeting_room',
    sample: 'Best for shared spaces',
  },
];
