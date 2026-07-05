import type { DomainPresetKey } from './presets';
import type { QuickItem } from './QuickAddList';

export interface PreflightWarning {
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export default function PreflightCheck({
  preset,
  resources,
  tasks,
  groups,
  locations,
  constraints,
  warnings,
  checking,
}: {
  preset: DomainPresetKey;
  resources: QuickItem[];
  tasks: QuickItem[];
  groups: QuickItem[];
  locations: QuickItem[];
  constraints: string[];
  warnings: PreflightWarning[];
  checking: boolean;
}) {
  const checks = [
    { label: preset === 'academic' ? 'Teachers added' : 'Resources added', value: resources.length },
    { label: preset === 'academic' ? 'Subjects configured' : 'Tasks configured', value: tasks.length },
    { label: preset === 'academic' ? 'Sections defined' : 'Groups defined', value: groups.length },
    { label: preset === 'academic' ? 'Rooms and labs added' : 'Locations added', value: locations.length },
    { label: 'Constraint templates selected', value: constraints.length },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-headline-sm text-on-surface">Preflight check</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
          SlotForge checks whether the first schedule has enough data to generate cleanly.
        </p>
      </div>

      <div className="rounded-xl border-2 border-rule bg-paper-raised p-5">
        {checking ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-5 rounded-full bg-surface-container onboarding-skeleton" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {checks.map((check) => (
              <div key={check.label} className="flex items-center gap-3">
                <span className={`material-symbols-outlined ${check.value > 0 ? 'text-primary' : 'text-warning'}`} style={{ fontSize: 20 }}>
                  {check.value > 0 ? 'check_circle' : 'warning'}
                </span>
                <span className="text-sm font-semibold text-on-surface">{check.value} {check.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {warnings.map((warning) => (
          <div key={`${warning.type}-${warning.message}`} className={`rounded-lg border px-4 py-3 text-sm ${
            warning.severity === 'error'
              ? 'border-error/30 bg-error-container text-on-error-container'
              : warning.severity === 'warning'
                ? 'border-warning/30 bg-signal-soft text-on-surface'
                : 'border-rule bg-surface-container text-on-surface-variant'
          }`}>
            <span className="font-bold">{warning.severity === 'error' ? 'Error' : warning.severity === 'warning' ? 'Warning' : 'Info'}:</span> {warning.message}
          </div>
        ))}
      </div>
    </div>
  );
}
