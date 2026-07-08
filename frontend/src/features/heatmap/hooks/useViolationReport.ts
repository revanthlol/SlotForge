import { useCallback, useEffect, useState } from 'react';
import api from '../../../lib/api';
import type { ViolationReport } from '../types';

function extractError(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: { detail?: string } } }).response;
    return response?.data?.detail || `Request failed${response?.status ? ` with status ${response.status}` : ''}`;
  }
  return error instanceof Error ? error.message : 'Request failed';
}

export function useViolationReport(workspaceId: string | null, runId: string | null) {
  const [data, setData] = useState<ViolationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const refetch = useCallback(async () => {
    if (!workspaceId || !runId) return;
    setLoading(true);
    setError(null);
    setUnsupported(false);
    try {
      const response = await api.get<ViolationReport>(`/api/v1/workspaces/${workspaceId}/schedule-runs/${runId}/heatmap/violations`);
      setData(response.data);
    } catch (err: unknown) {
      const status = typeof err === 'object' && err && 'response' in err
        ? (err as { response?: { status?: number } }).response?.status
        : undefined;
      if (status === 404 || status === 501) {
        setUnsupported(true);
      }
      setData(null);
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [runId, workspaceId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, unsupported, refetch };
}
