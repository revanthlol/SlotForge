import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useWorkspaces } from '../../lib/api/hooks/useWorkspaces';
import api from '../../lib/api/client';
import { PRESET_CONFIGS } from './PresetConfigs';

export default function PresetSelector() {
  const queryClient = useQueryClient();
  const { data: workspaces, isLoading } = useWorkspaces();
  const workspace = workspaces?.[0];
  const activePreset = workspace?.domain_preset || 'academic';

  const mutation = useMutation({
    mutationFn: async (presetKey: string) => {
      if (!workspace) return;
      return api.put(`/api/v1/workspaces/${workspace.id}`, {
        domain_preset: presetKey,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
  });

  if (isLoading || !workspace) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-surface-container rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-surface-container rounded-xl border border-rule"></div>
          ))}
        </div>
      </div>
    );
  }

  const presets = [
    { key: 'academic', icon: 'school', desc: 'Schedule classes, teachers, subjects, and classrooms.' },
    { key: 'staff_roster', icon: 'groups', desc: 'Roster employees across departments and work zones.' },
    { key: 'event', icon: 'calendar_month', desc: 'Schedule speakers and tracks across conference halls.' },
    { key: 'exam', icon: 'description', desc: 'Schedule exams, invigilators, and student groups.' },
    { key: 'facility', icon: 'meeting_room', desc: 'Manage room bookings and equipment allocations.' },
  ];

  return (
    <div className="mb-8">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-on-surface">Scheduling Context</h3>
        <p className="text-sm text-on-surface-variant">Select a domain preset to customize all terminology and scheduling constraints.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {presets.map((preset) => {
          const config = PRESET_CONFIGS[preset.key];
          const isActive = activePreset === preset.key;
          const isPending = mutation.isPending && mutation.variables === preset.key;

          return (
            <button
              key={preset.key}
              onClick={() => {
                if (!isActive && !mutation.isPending) {
                  mutation.mutate(preset.key);
                }
              }}
              disabled={mutation.isPending}
              className={`flex flex-col text-left p-inset-standard rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                isActive
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/5'
                  : 'border-rule hover:border-primary/50 bg-paper-raised hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between mb-3 w-full">
                <span
                  className={`material-symbols-outlined rounded-lg p-2 ${
                    isActive ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
                  }`}
                  style={{ fontSize: 24 }}
                >
                  {preset.icon}
                </span>
                {isActive && (
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
                  </span>
                )}
              </div>
              <h4 className="font-semibold text-on-surface mb-1 text-base">{config?.name || preset.key}</h4>
              <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3">{preset.desc}</p>
              {isPending && (
                <div className="absolute inset-0 bg-paper/50 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
