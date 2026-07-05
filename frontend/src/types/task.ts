export interface Task {
  id: string;
  organization_id: string;
  workspace_id: string;
  name: string;
  task_type: string;
  required_hours: number | null;
  requires_continuous_slots: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TaskCreate {
  name: string;
  task_type: string;
  required_hours?: number | null;
  requires_continuous_slots?: boolean;
  metadata?: Record<string, unknown>;
}

export interface TaskUpdate {
  name?: string;
  task_type?: string;
  required_hours?: number | null;
  requires_continuous_slots?: boolean;
  metadata?: Record<string, unknown>;
}
