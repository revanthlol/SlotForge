export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'viewer';
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  maxHoursPerDay: number;
  unavailableSlots: TimeSlot[];
  department: string;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  type: 'lecture' | 'lab' | 'seminar';
  building: string;
  floor: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  hoursPerWeek: number;
  requiresLab: boolean;
  department: string;
}

export interface Section {
  id: string;
  name: string;
  strength: number;
  department: string;
  semester: number;
  subjects: string[];
}

export interface TimeSlot {
  day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
  startTime: string;
  endTime: string;
}

export interface TimetableEntry {
  id: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  roomId: string;
  slot: TimeSlot;
}

export interface Timetable {
  id: string;
  name: string;
  status: 'draft' | 'published';
  createdAt: string;
  entries: TimetableEntry[];
  version: number;
}

export interface Constraint {
  id: string;
  type: 'hard' | 'soft';
  description: string;
  rule: string;
}

export interface GenerateRequest {
  sectionIds: string[];
  constraints: Constraint[];
}

export interface GenerateResult {
  status: 'success' | 'infeasible';
  timetable?: Timetable;
  explanation?: string;
  conflicts?: string[];
}

export interface DashboardStats {
  teachers: number;
  rooms: number;
  subjects: number;
  sections: number;
  activeTimetable: string | null;
  lastGenerated: string | null;
}
