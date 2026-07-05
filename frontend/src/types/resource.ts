export type TimeSlotMatrix = Record<string, unknown>;

export interface Resource {
  id: string;
  organization_id: string;
  workspace_id: string;
  name: string;
  resource_type: string;
  metadata: Record<string, unknown>;
  availability: TimeSlotMatrix;
  max_hours_per_week: number | null;
  created_at: string;
}

export interface ResourceCreate {
  name: string;
  resource_type: string;
  metadata?: Record<string, unknown>;
  availability?: TimeSlotMatrix;
  max_hours_per_week?: number | null;
}

export interface ResourceUpdate {
  name?: string;
  resource_type?: string;
  metadata?: Record<string, unknown>;
  availability?: TimeSlotMatrix;
  max_hours_per_week?: number | null;
}
