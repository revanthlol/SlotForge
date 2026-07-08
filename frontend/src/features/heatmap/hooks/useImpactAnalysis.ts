import { useState } from 'react';
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

  const analyze = async (payload: ImpactRequest) => {
    if (!workspaceId) return null;
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<ImpactAnalysisReport>(`/api/v1/workspaces/${workspaceId}/impact-analysis`, payload);
      setData(response.data);
      return response.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Impact analysis failed';
      setError(message);
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, analyze, clear: () => setData(null) };
}
