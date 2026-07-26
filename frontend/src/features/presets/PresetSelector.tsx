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
          const isAvailable = preset.key === 'academic';
          const isLegacy = isActive && !isAvailable;
          const isPending = mutation.isPending && mutation.variables === preset.key;

          return (
            <button
              key={preset.key}
              onClick={() => {
                if (isAvailable && !isActive && !mutation.isPending) {
                  mutation.mutate(preset.key);
                }
              }}
              disabled={mutation.isPending || (!isAvailable && !isLegacy)}
              aria-disabled={!isAvailable && !isLegacy}
              className={`flex min-h-56 flex-col text-left p-inset-standard rounded-xl border-2 transition-all relative overflow-hidden ${
                isActive
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/5'
                  : isAvailable
                    ? 'border-rule cursor-pointer hover:border-primary/50 bg-paper-raised hover:shadow-md'
                    : 'border-rule bg-surface-container-low opacity-70 cursor-not-allowed'
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
                {!isAvailable && !isActive && <span className="rounded-full border border-rule bg-paper-raised px-2 py-1 text-[8px] font-black uppercase tracking-[.12em] text-mono-grey">Coming soon</span>}
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
      {activePreset !== 'academic' && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-secondary/30 bg-signal-soft p-4"><p className="text-sm text-on-surface-variant">This workspace uses a legacy preview preset. Switch to Academic to use the supported scheduling workflow.</p><button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate('academic')} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary disabled:opacity-50">Use Academic preset</button></div>}
      <p className="mt-3 text-xs text-on-surface-variant">Academic Timetable is available today. Staff, event, exam, and facility workflows are visible as the public roadmap and cannot modify your workspace yet.</p>
    </div>
  );
}
