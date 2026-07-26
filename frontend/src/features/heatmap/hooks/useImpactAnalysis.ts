import { useRef, useState } from 'react';
import axios from 'axios';
import api from '../../../lib/api';
import type { ImpactAnalysisReport } from '../types';

interface ImpactRequest {
  change_type: string;
  entity_id: string;
  new_value: unknown;
}

export function useImpactAnalysis(workspaceId: string | null) {
  const [data, setData] = useState<ImpactAnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);

  const analyze = async (payload: ImpactRequest) => {
    const currentRequest = ++requestId.current;
    controller.current?.abort();
    if (!workspaceId) {
      setData(null);
      setError(null);
      setLoading(false);
      return null;
    }
    const nextController = new AbortController();
    controller.current = nextController;
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<ImpactAnalysisReport>(
        `/api/v1/workspaces/${workspaceId}/impact-analysis`,
        payload,
        { signal: nextController.signal },
      );
      if (currentRequest === requestId.current) setData(response.data);
      return response.data;
    } catch (err: unknown) {
      if (!axios.isCancel(err) && currentRequest === requestId.current) {
        const message = err instanceof Error ? err.message : 'Impact analysis failed';
        setError(message);
        setData(null);
      }
      return null;
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  };

  const clear = () => {
    requestId.current += 1;
    controller.current?.abort();
    controller.current = null;
    setData(null);
    setError(null);
    setLoading(false);
  };

  return { data, loading, error, analyze, clear };
}
