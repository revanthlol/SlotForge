import { useCallback, useEffect, useState } from 'react';
import api from '../../../lib/api';
import type { SchedulingPressureReport } from '../types';

interface PressureState {
  data: SchedulingPressureReport | null;
  loading: boolean;
  error: string | null;
  unsupported: boolean;
  refetch: () => Promise<void>;
}

function errorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: { detail?: string } } }).response;
    return response?.data?.detail || `Request failed${response?.status ? ` with status ${response.status}` : ''}`;
  }
  return error instanceof Error ? error.message : 'Request failed';
}

export function usePressureAnalysis(workspaceId: string | null): PressureState {
  const [data, setData] = useState<SchedulingPressureReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const refetch = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    setUnsupported(false);
    try {
      const response = await api.post<SchedulingPressureReport>(`/api/v1/workspaces/${workspaceId}/heatmap/pressure`);
      setData(response.data);
    } catch (err: unknown) {
      const status = typeof err === 'object' && err && 'response' in err
        ? (err as { response?: { status?: number } }).response?.status
        : undefined;
      if (status === 404 || status === 501) {
        setUnsupported(true);
      }
      setData(null);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, unsupported, refetch };
}
