export type ScheduleRunStatus = 'pending' | 'running' | 'solved' | 'failed' | 'draft' | 'published' | 'archived' | string;

export interface ScheduleRun {
  id: string;
  organization_id: string;
  workspace_id: string;
  schedule_version_id: string | null;
  status: ScheduleRunStatus;
  solver_score: Record<string, unknown> | null;
  explanation: Record<string, unknown> | null;
  duration_seconds: number | null;
  error_message: string | null;
  created_at: string;
}

export interface ScheduleAssignment {
  id: string;
  schedule_version_id?: string;
  slot_id?: string;
  day?: string;
  period?: number;
  duration_periods?: number;
  [key: string]: unknown;
}

export interface WorkspaceTimetable {
  workspace_id: string;
  schedule_version_id: string | null;
  assignments: ScheduleAssignment[];
}
