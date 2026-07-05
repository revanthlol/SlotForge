import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../../lib/api';

export interface OnboardingProgress {
  current_step: number;
  completed_steps: string[];
  skipped?: boolean;
}

const defaultProgress: OnboardingProgress = {
  current_step: 0,
  completed_steps: [],
};

const storageKey = (workspaceId: string | null) => `slotforge:onboarding:${workspaceId || 'default'}`;

function readStoredProgress(workspaceId: string | null): OnboardingProgress {
  const stored = window.localStorage.getItem(storageKey(workspaceId));
  if (!stored) return defaultProgress;
  try {
    return { ...defaultProgress, ...JSON.parse(stored) };
  } catch {
    return defaultProgress;
  }
}

export function useOnboardingProgress(workspaceId: string | null) {
  const [progress, setProgress] = useState<OnboardingProgress>(() => readStoredProgress(workspaceId));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const load = async () => {
      if (!workspaceId) {
        setProgress(readStoredProgress(workspaceId));
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get<OnboardingProgress>(`/api/v1/workspaces/${workspaceId}/onboarding/progress`);
        if (!mounted) return;
        setBackendAvailable(true);
        setProgress({ ...defaultProgress, ...data });
        window.localStorage.setItem(storageKey(workspaceId), JSON.stringify({ ...defaultProgress, ...data }));
      } catch {
        if (!mounted) return;
        setBackendAvailable(false);
        setProgress(readStoredProgress(workspaceId));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [workspaceId]);

  const persistProgress = useCallback(async (nextProgress: OnboardingProgress) => {
    setSaving(true);
    setProgress(nextProgress);
    window.localStorage.setItem(storageKey(workspaceId), JSON.stringify(nextProgress));

    if (workspaceId) {
      try {
        await api.put(`/api/v1/workspaces/${workspaceId}/onboarding/progress`, nextProgress);
        setBackendAvailable(true);
      } catch {
        setBackendAvailable(false);
      }
    }

    setSaving(false);
  }, [workspaceId]);

  const completeStep = useCallback(async (stepKey: string, nextStep: number) => {
    const completed = progress.completed_steps.includes(stepKey)
      ? progress.completed_steps
      : [...progress.completed_steps, stepKey];

    await persistProgress({
      ...progress,
      current_step: nextStep,
      completed_steps: completed,
    });
  }, [persistProgress, progress]);

  const markSkipped = useCallback(async () => {
    await persistProgress({
      ...progress,
      current_step: 10,
      skipped: true,
      completed_steps: progress.completed_steps,
    });
  }, [persistProgress, progress]);

  return useMemo(() => ({
    progress,
    loading,
    saving,
    backendAvailable,
    persistProgress,
    completeStep,
    markSkipped,
  }), [backendAvailable, completeStep, loading, markSkipped, persistProgress, progress, saving]);
}
