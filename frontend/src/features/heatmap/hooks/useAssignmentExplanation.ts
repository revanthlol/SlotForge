import { useCallback, useEffect, useState } from 'react';
import api from '../../../lib/api';
import type { AssignmentExplanationReport } from '../types';

export function useAssignmentExplanation(workspaceId: string | null, runId: string | null, assignmentId: string | null) {
  const [data, setData] = useState<AssignmentExplanationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!workspaceId || !runId || !assignmentId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<AssignmentExplanationReport>(
        `/api/v1/workspaces/${workspaceId}/schedule-runs/${runId}/assignments/${assignmentId}/explanation`
      );
      setData(response.data);
    } catch (err: unknown) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Assignment explanation failed');
    } finally {
      setLoading(false);
    }
  }, [assignmentId, runId, workspaceId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
