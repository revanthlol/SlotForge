import { useQuery } from '@tanstack/react-query';
import api from '../client';
import type { Workspace } from '../../../types/workspace';

export const workspacesQueryKey = ['workspaces'] as const;

export function useWorkspaces() {
  return useQuery({
    queryKey: workspacesQueryKey,
    queryFn: async () => {
      const { data } = await api.get<Workspace[]>('/api/v1/workspaces');
      return data;
    },
  });
}
