export type PressureSeverity = 'critical' | 'high' | 'medium' | 'low' | 'none';

export interface PressureItem {
  id?: string;
  type: string;
  name: string;
  required?: number | null;
  available?: number | null;
  demand?: number | null;
  capacity?: number | null;
  utilization?: number | null;
  severity: PressureSeverity;
  message?: string | null;
}

export interface PressureSummary {
  label: string;
  value: number;
  severity: PressureSeverity;
}

export interface SchedulingPressureReport {
  generated_at?: string | null;
  overall_score?: number | null;
  items: PressureItem[];
  summary?: PressureSummary[];
  warnings?: string[];
}

export interface HeatmapCell {
  day: string;
  period: number;
  value: number;
  label?: string | null;
  severity?: PressureSeverity | null;
}

export interface ViolationItem {
  id?: string;
  severity: PressureSeverity | 'warning';
  constraint_type?: string | null;
  message: string;
  day?: string | null;
  period?: number | null;
  resource_name?: string | null;
}

export interface ViolationReport {
  score?: number | null;
  generated_at?: string | null;
  violations: ViolationItem[];
  heatmap: HeatmapCell[];
  summary?: string[];
}

export interface ImpactAnalysisReport {
  feasible: boolean;
  change_type: string;
  message?: string | null;
  conflicts: ViolationItem[];
  suggested_actions?: string[];
}

export interface AssignmentExplanationReport {
  assignment_id: string;
  title?: string | null;
  reasons: string[];
  satisfied_constraints?: string[];
  warnings?: string[];
}
