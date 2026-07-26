import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
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
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);

  const refetch = useCallback(async () => {
    const currentRequest = ++requestId.current;
    controller.current?.abort();
    if (!workspaceId || !runId) {
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
      const response = await api.get<ViolationReport>(
        `/api/v1/workspaces/${workspaceId}/schedule-runs/${runId}/heatmap/violations`,
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
        setError(extractError(err));
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [runId, workspaceId]);

  useEffect(() => {
    void refetch();
    return () => controller.current?.abort();
  }, [refetch]);

  return { data, loading, error, unsupported, refetch };
}
