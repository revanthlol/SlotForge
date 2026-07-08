import type { ImpactAnalysisReport } from './types';

export default function ConflictPanel({
  report,
  open,
  loading,
  error,
  onClose,
}: {
  report: ImpactAnalysisReport | null;
  open: boolean;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  return (
    <aside
      className={`fixed inset-y-0 right-0 z-[70] w-full max-w-md border-l-2 border-rule bg-paper-raised shadow-2xl transition-transform duration-200 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
      aria-hidden={!open}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-rule bg-inverse-surface p-5 text-inverse-on-surface">
          <div>
            <p className="text-label-caps text-inverse-primary" style={{ fontSize: 10 }}>Impact analysis</p>
            <h2 className="mt-1 text-lg font-semibold">Potential conflicts</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-white/10" aria-label="Close conflict panel">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="space-y-3">
              <div className="h-16 rounded-lg bg-surface-container onboarding-skeleton" />
              <div className="h-40 rounded-lg bg-surface-container onboarding-skeleton" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-error/20 bg-error-container/40 p-4 text-sm text-error">{error}</div>
          ) : report ? (
            <div className="space-y-4">
              <div className={`rounded-lg border p-4 ${report.feasible ? 'border-primary/20 bg-accent-soft text-primary' : 'border-secondary/20 bg-signal-soft text-secondary'}`}>
                <p className="text-sm font-bold">{report.feasible ? 'No blocking conflicts detected' : 'This change creates scheduling conflicts'}</p>
                {report.message && <p className="mt-1 text-xs text-on-surface-variant">{report.message}</p>}
              </div>

              {report.conflicts.length > 0 && (
                <div className="rounded-lg border border-rule">
                  <div className="border-b border-rule px-4 py-3">
                    <p className="text-xs font-bold text-on-surface">{report.conflicts.length} affected item{report.conflicts.length === 1 ? '' : 's'}</p>
                  </div>
                  <div className="divide-y divide-rule">
                    {report.conflicts.map((conflict, index) => (
                      <div key={conflict.id || index} className="p-4">
                        <p className="text-sm font-semibold text-on-surface">{conflict.message}</p>
                        <p className="mt-1 text-[11px] text-mono-grey">
                          {[conflict.resource_name, conflict.day, conflict.period ? `P${conflict.period}` : null].filter(Boolean).join(' / ') || 'Schedule impact'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.suggested_actions?.length ? (
                <div>
                  <p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>Suggested fixes</p>
                  <div className="mt-2 space-y-2">
                    {report.suggested_actions.map((action) => (
                      <div key={action} className="rounded-lg border border-rule bg-surface-container-low p-3 text-xs text-on-surface-variant">{action}</div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-rule bg-surface-container-low p-5 text-sm text-mono-grey">
              Make a resource change to run impact analysis.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
