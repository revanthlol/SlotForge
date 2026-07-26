import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';

export interface ConstraintParameter {
  key: string;
  label: string;
  type: string;
  default?: unknown;
}

export interface ConstraintTemplate {
  key: string;
  name: string;
  description: string;
  type: 'hard' | 'soft';
  parameters: ConstraintParameter[];
  solver_fn: string;
}

export interface ConstraintRule {
  id: string;
  organization_id: string;
  workspace_id: string;
  name: string;
  rule_type: 'hard' | 'soft';
  template_key: string;
  parameters: Record<string, unknown>;
  priority: number;
  penalty: number | null;
  enabled: boolean;
  created_at: string;
}

export interface PreviewResult {
  template_key: string;
  impacted_assignments_count: number;
  impacted_assignments: Array<{ day: string; period: number; reason: string; section_id: string; subject_id: string; teacher_id: string; room_id: string }>;
  infeasibility_risk: boolean;
  summary: string;
}

export const constraintsKey = (workspaceId: string) => ['constraint-rules', workspaceId] as const;

export function useConstraintTemplates() {
  return useQuery({
    queryKey: ['constraint-templates'],
    queryFn: async () => (await api.get<ConstraintTemplate[]>('/api/v1/constraint-templates/')).data,
  });
}

export function useConstraints(workspaceId: string | null) {
  return useQuery({
    queryKey: workspaceId ? constraintsKey(workspaceId) : ['constraint-rules', 'disabled'],
    queryFn: async () => (await api.get<ConstraintRule[]>(`/api/v1/workspaces/${workspaceId}/constraints/`)).data,
    enabled: Boolean(workspaceId),
  });
}

export function useConstraintMutations(workspaceId: string | null) {
  const queryClient = useQueryClient();
  const refresh = () => workspaceId && queryClient.invalidateQueries({ queryKey: constraintsKey(workspaceId) });
  const create = useMutation({
    mutationFn: (payload: Omit<ConstraintRule, 'id' | 'organization_id' | 'workspace_id' | 'created_at' | 'name' | 'rule_type'> & { name?: string; rule_type?: 'hard' | 'soft' }) =>
      api.post<ConstraintRule>(`/api/v1/workspaces/${workspaceId}/constraints/`, payload),
    onSuccess: refresh,
  });
  const update = useMutation({
    mutationFn: ({ id, ...payload }: { id: string; enabled?: boolean; parameters?: Record<string, unknown>; penalty?: number | null; priority?: number }) =>
      api.patch<ConstraintRule>(`/api/v1/workspaces/${workspaceId}/constraints/${id}`, payload),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/workspaces/${workspaceId}/constraints/${id}`),
    onSuccess: refresh,
  });
  return { create, update, remove };
}
