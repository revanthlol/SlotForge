export interface ExportCell {
  id: string;
  day: string;
  period: number;
  duration: number;
  subject: string;
  section?: string | null;
  teacher?: string | null;
  room?: string | null;
}

export interface ExportMeta {
  title: string;
  subtitle?: string;
  organizationName: string;
  scheduleLabel: string;
  generatedAt?: string;
  filename: string;
}

export interface ExportTimetableData {
  meta: ExportMeta;
  days: string[];
  periods: number;
  cells: ExportCell[];
}

export type ExportFormat = 'html' | 'pdf' | 'xlsx' | 'csv' | 'google_docs' | 'docx' | 'ics';
