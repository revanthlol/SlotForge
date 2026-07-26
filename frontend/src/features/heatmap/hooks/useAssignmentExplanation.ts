import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import api from '../../../lib/api';
import type { AssignmentExplanationReport } from '../types';

export function useAssignmentExplanation(workspaceId: string | null, runId: string | null, assignmentId: string | null) {
  const [data, setData] = useState<AssignmentExplanationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);

  const refetch = useCallback(async () => {
    const currentRequest = ++requestId.current;
    controller.current?.abort();
    if (!workspaceId || !runId || !assignmentId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    const nextController = new AbortController();
    controller.current = nextController;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<AssignmentExplanationReport>(
        `/api/v1/workspaces/${workspaceId}/schedule-runs/${runId}/assignments/${assignmentId}/explanation`,
        { signal: nextController.signal },
      );
      if (currentRequest === requestId.current) setData(response.data);
    } catch (err: unknown) {
      if (!axios.isCancel(err) && currentRequest === requestId.current) {
        setData(null);
        setError(err instanceof Error ? err.message : 'Assignment explanation failed');
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [assignmentId, runId, workspaceId]);

  useEffect(() => {
    void refetch();
    return () => controller.current?.abort();
  }, [refetch]);

  return { data, loading, error, refetch };
}
