import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
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
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);

  const refetch = useCallback(async () => {
    const currentRequest = ++requestId.current;
    controller.current?.abort();
    if (!workspaceId) {
      setData(null);
      setError(null);
      setUnsupported(false);
      setLoading(false);
      return;
    }
    const nextController = new AbortController();
    controller.current = nextController;
    setLoading(true);
    setError(null);
    setUnsupported(false);
    try {
      const response = await api.post<SchedulingPressureReport>(
        `/api/v1/workspaces/${workspaceId}/heatmap/pressure`,
        undefined,
        { signal: nextController.signal },
      );
      if (currentRequest === requestId.current) setData(response.data);
    } catch (err: unknown) {
      const status = typeof err === 'object' && err && 'response' in err
        ? (err as { response?: { status?: number } }).response?.status
        : undefined;
      if (!axios.isCancel(err) && (status === 404 || status === 501)) {
        setUnsupported(true);
      }
      if (!axios.isCancel(err) && currentRequest === requestId.current) {
        setData(null);
        setError(errorMessage(err));
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void refetch();
    return () => controller.current?.abort();
  }, [refetch]);

  return { data, loading, error, unsupported, refetch };
}
