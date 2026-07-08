import TimetableHeatGrid from './TimetableHeatGrid';
import type { ViolationReport as ViolationReportType } from './types';

export default function ViolationReport({
  report,
  loading,
  error,
  unsupported,
  onRefresh,
}: {
  report: ViolationReportType | null;
  loading: boolean;
  error: string | null;
  unsupported: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className="rounded-xl border-2 border-rule bg-paper-raised p-inset-standard">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-4">
        <div>
          <p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>Post-generation report</p>
          <h2 className="mt-1 text-headline-sm text-on-surface">Schedule quality</h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Soft constraint violations and utilization heat cells from the latest schedule run.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {typeof report?.score === 'number' && (
            <div className="rounded-lg border border-rule bg-surface-container-low px-3 py-2 text-right">
              <p className="text-[10px] font-bold uppercase text-mono-grey" style={{ fontFamily: 'var(--font-mono)', letterSpacing: 0 }}>Score</p>
              <p className="text-lg font-black text-on-surface">{report.score}/100</p>
            </div>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-rule bg-paper-raised px-3 text-xs font-semibold text-on-surface hover:bg-surface-container-low disabled:opacity-60"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 17 }}>refresh</span>
            {loading ? 'Checking...' : 'Refresh'}
          </button>
        </div>
      </div>

      {unsupported ? (
        <div className="mt-4 rounded-lg border border-dashed border-rule bg-surface-container-low p-5">
          <p className="text-sm font-semibold text-on-surface">Violation endpoint is not available yet.</p>
          <p className="mt-1 text-xs text-on-surface-variant">
            Codex has wired the UI to <span className="font-mono">GET /api/v1/workspaces/:id/schedule-runs/:run_id/heatmap/violations</span>. It will render the live report once the backend endpoint exists.
          </p>
        </div>
      ) : error ? (
        <div className="mt-4 rounded-lg border border-error/20 bg-error-container/40 p-4 text-xs text-error">{error}</div>
      ) : loading && !report ? (
        <div className="mt-4 h-64 rounded-lg bg-surface-container onboarding-skeleton" />
      ) : (
        <div className="mt-4 space-y-4">
          {report?.violations?.length ? (
            <div className="rounded-lg border border-rule">
              <div className="border-b border-rule bg-surface-container-low px-4 py-3">
                <p className="text-xs font-bold text-on-surface">{report.violations.length} constraint violation{report.violations.length === 1 ? '' : 's'}</p>
              </div>
              <div className="divide-y divide-rule">
                {report.violations.map((violation, index) => (
                  <div key={violation.id || index} className="flex gap-3 p-4">
                    <span className="material-symbols-outlined mt-0.5 text-secondary" style={{ fontSize: 18 }}>warning</span>
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{violation.message}</p>
                      <p className="mt-1 text-[11px] text-mono-grey">
                        {[violation.constraint_type, violation.resource_name, violation.day, violation.period ? `P${violation.period}` : null].filter(Boolean).join(' / ') || 'Soft constraint'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-rule bg-accent-soft p-4 text-sm font-semibold text-primary">
              No soft constraint violations reported.
            </div>
          )}

          <TimetableHeatGrid cells={report?.heatmap || []} />
        </div>
      )}
    </section>
  );
}
