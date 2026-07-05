import { useWorkspaces } from '../../../lib/api/hooks/useWorkspaces';
import { PRESET_CONFIGS, type PresetConfig } from '../PresetConfigs';

export const usePresetConfig = (): PresetConfig => {
  const { data: workspaces } = useWorkspaces();
  const workspace = workspaces?.[0];
  const presetKey = workspace?.domain_preset || 'academic';
  return PRESET_CONFIGS[presetKey] || PRESET_CONFIGS.academic;
};
