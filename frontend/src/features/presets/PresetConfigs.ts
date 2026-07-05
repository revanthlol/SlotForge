export interface PresetConfig {
  key: string;
  name: string;
  teacherLabel: string;
  roomLabel: string;
  subjectLabel: string;
  sectionLabel: string;
  teacherPlaceholder: string;
  roomPlaceholder: string;
  subjectPlaceholder: string;
  sectionPlaceholder: string;
  teacherTitle: string;
  roomTitle: string;
  subjectTitle: string;
  sectionTitle: string;
  timeUnitLabel: string;
}

export const PRESET_CONFIGS: Record<string, PresetConfig> = {
  academic: {
    key: 'academic',
    name: 'Academic Timetable',
    teacherLabel: 'Teacher',
    roomLabel: 'Room/Lab',
    subjectLabel: 'Subject',
    sectionLabel: 'Section',
    teacherPlaceholder: 'e.g., Dr. Julius Hibbert',
    roomPlaceholder: 'e.g., Biology Lab',
    subjectPlaceholder: 'e.g., Anatomy 101',
    sectionPlaceholder: 'e.g., Med-Students Group A',
    teacherTitle: 'Teachers',
    roomTitle: 'Rooms & Labs',
    subjectTitle: 'Subjects',
    sectionTitle: 'Sections',
    timeUnitLabel: 'Periods',
  },
  staff_roster: {
    key: 'staff_roster',
    name: 'Staff Roster',
    teacherLabel: 'Employee',
    roomLabel: 'Work Zone',
    subjectLabel: 'Coverage',
    sectionLabel: 'Department',
    teacherPlaceholder: 'e.g., Alice Smith',
    roomPlaceholder: 'e.g., Zone A',
    subjectPlaceholder: 'e.g., Morning Shift',
    sectionPlaceholder: 'e.g., Nursing Dept',
    teacherTitle: 'Employees',
    roomTitle: 'Work Zones',
    subjectTitle: 'Coverage Requirements',
    sectionTitle: 'Departments',
    timeUnitLabel: 'Shifts',
  },
  event: {
    key: 'event',
    name: 'Event Scheduling',
    teacherLabel: 'Speaker',
    roomLabel: 'Hall',
    subjectLabel: 'Session',
    sectionLabel: 'Track',
    teacherPlaceholder: 'e.g., Dr. Jane Doe',
    roomPlaceholder: 'e.g., Hall A',
    subjectPlaceholder: 'e.g., AI in 2030',
    sectionPlaceholder: 'e.g., AI Track',
    teacherTitle: 'Speakers',
    roomTitle: 'Halls',
    subjectTitle: 'Sessions',
    sectionTitle: 'Tracks',
    timeUnitLabel: 'Slots',
  },
  exam: {
    key: 'exam',
    name: 'Exam Scheduling',
    teacherLabel: 'Invigilator',
    roomLabel: 'Exam Hall',
    subjectLabel: 'Course',
    sectionLabel: 'Student Group',
    teacherPlaceholder: 'e.g., Prof. Kumar',
    roomPlaceholder: 'e.g., Hall 101',
    subjectPlaceholder: 'e.g., Mathematics',
    sectionPlaceholder: 'e.g., Grade 10',
    teacherTitle: 'Invigilators',
    roomTitle: 'Exam Halls',
    subjectTitle: 'Courses',
    sectionTitle: 'Student Groups',
    timeUnitLabel: 'Slots',
  },
  facility: {
    key: 'facility',
    name: 'Facility Booking',
    teacherLabel: 'Requester',
    roomLabel: 'Facility',
    subjectLabel: 'Booking Type',
    sectionLabel: 'User Group',
    teacherPlaceholder: 'e.g., John Doe',
    roomPlaceholder: 'e.g., Conference Room A',
    subjectPlaceholder: 'e.g., Team Sync',
    sectionPlaceholder: 'e.g., Marketing Team',
    teacherTitle: 'Requesters',
    roomTitle: 'Facilities',
    subjectTitle: 'Booking Types',
    sectionTitle: 'User Groups',
    timeUnitLabel: 'Slots',
  },
};
