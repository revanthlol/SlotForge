import { useQuery } from '@tanstack/react-query';
import api from '../client';
import type { Resource } from '../../../types/resource';

export const resourcesQueryKey = (workspaceId: string) => ['resources', workspaceId] as const;

export function useResources(workspaceId: string | null) {
  return useQuery({
    queryKey: workspaceId ? resourcesQueryKey(workspaceId) : ['resources', 'disabled'],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await api.get<Resource[]>(`/api/v1/workspaces/${workspaceId}/resources`);
      return data;
    },
    enabled: Boolean(workspaceId),
  });
}
