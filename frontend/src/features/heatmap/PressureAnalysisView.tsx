import type { PressureItem, PressureSeverity, PressureSummary, SchedulingPressureReport } from './types';

const severityTone: Record<PressureSeverity, { label: string; bar: string; chip: string; text: string }> = {
  critical: { label: 'Critical', bar: '#ba1a1a', chip: 'bg-error-container text-error border-error/30', text: 'text-error' },
  high: { label: 'High', bar: '#c45113', chip: 'bg-signal-soft text-secondary border-secondary/30', text: 'text-secondary' },
  medium: { label: 'Medium', bar: '#b98900', chip: 'bg-[#fff2bf] text-[#765100] border-[#d7a900]/30', text: 'text-[#765100]' },
  low: { label: 'Low', bar: '#14745b', chip: 'bg-accent-soft text-primary border-primary/25', text: 'text-primary' },
  none: { label: 'Clear', bar: '#6b6f73', chip: 'bg-surface-container text-mono-grey border-rule', text: 'text-mono-grey' },
};

function ratio(item: PressureItem) {
  const required = item.required ?? item.demand ?? null;
  const available = item.available ?? item.capacity ?? null;
  if (typeof item.utilization === 'number') return Math.max(0, Math.min(100, Math.round(item.utilization)));
  if (!required || !available) return 0;
  return Math.max(0, Math.round((required / available) * 100));
}

function itemNumbers(item: PressureItem) {
  const required = item.required ?? item.demand ?? null;
  const available = item.available ?? item.capacity ?? null;
  if (required == null || available == null) return null;
  return `${required} needed / ${available} available`;
}

function PressureBar({ value, severity }: { value: number; severity: PressureSeverity }) {
  const tone = severityTone[severity] || severityTone.none;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-container">
      <div
        className="h-full rounded-full transition-[width]"
        style={{ width: `${Math.max(4, Math.min(100, value))}%`, backgroundColor: tone.bar }}
      />
    </div>
  );
}

function SummaryCard({ item }: { item: PressureSummary }) {
  const tone = severityTone[item.severity] || severityTone.none;
  return (
    <div className="rounded-lg border border-rule bg-surface-container-low p-3">
      <p className="text-data-table text-mono-grey">{item.label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className={`text-2xl font-black ${tone.text}`}>{Math.round(item.value)}%</p>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${tone.chip}`}>{tone.label}</span>
      </div>
      <div className="mt-3">
        <PressureBar value={item.value} severity={item.severity} />
      </div>
    </div>
  );
}

export default function PressureAnalysisView({
  report,
  loading,
  error,
  unsupported,
  onRefresh,
}: {
  report: SchedulingPressureReport | null;
  loading: boolean;
  error: string | null;
  unsupported: boolean;
  onRefresh: () => void;
}) {
  const items = report?.items || [];
  const summary = report?.summary || [];

  return (
    <section className="rounded-xl border-2 border-rule bg-paper-raised p-inset-standard">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-4">
        <div>
          <p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>Pre-generation analysis</p>
          <h2 className="mt-1 text-headline-sm text-on-surface">Resource pressure</h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Demand, capacity, and availability warnings from the scheduling analysis endpoint.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-rule bg-paper-raised px-3 text-xs font-semibold text-on-surface hover:bg-surface-container-low disabled:opacity-60"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 17 }}>refresh</span>
          {loading ? 'Analyzing...' : 'Refresh'}
        </button>
      </div>

      {unsupported ? (
        <div className="mt-4 rounded-lg border border-dashed border-rule bg-surface-container-low p-5">
          <p className="text-sm font-semibold text-on-surface">Pressure endpoint is not available yet.</p>
          <p className="mt-1 text-xs text-on-surface-variant">
            Codex has wired the UI to <span className="font-mono">POST /api/v1/workspaces/:id/heatmap/pressure</span>. The panel will populate when Antigravity ships the backend engine.
          </p>
        </div>
      ) : error ? (
        <div className="mt-4 rounded-lg border border-error/20 bg-error-container/40 p-4 text-xs text-error">{error}</div>
      ) : loading && !report ? (
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-lg bg-surface-container onboarding-skeleton" />
          ))}
        </div>
      ) : (
        <>
          {summary.length > 0 && (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {summary.map((entry) => <SummaryCard key={entry.label} item={entry} />)}
            </div>
          )}

          {report?.warnings?.length ? (
            <div className="mt-4 rounded-lg border border-secondary/20 bg-signal-soft p-4">
              <p className="text-xs font-bold text-secondary">Warnings</p>
              <div className="mt-2 space-y-1 text-xs text-on-surface-variant">
                {report.warnings.map((warning) => <p key={warning}>{warning}</p>)}
              </div>
            </div>
          ) : null}

          <div className="mt-4 overflow-hidden rounded-lg border border-rule">
            {items.length === 0 ? (
              <div className="p-8 text-center text-sm text-mono-grey">No pressure items reported.</div>
            ) : (
              <div className="divide-y divide-rule">
                {items.map((item, index) => {
                  const value = ratio(item);
                  const tone = severityTone[item.severity] || severityTone.none;
                  return (
                    <div key={item.id || `${item.type}-${item.name}-${index}`} className="grid gap-3 bg-paper-raised p-4 md:grid-cols-[160px_minmax(0,1fr)_110px] md:items-center">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-mono-grey" style={{ fontFamily: 'var(--font-mono)', letterSpacing: 0 }}>{item.type}</p>
                        <p className="mt-1 text-sm font-semibold text-on-surface">{item.name}</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-on-surface-variant">{item.message || itemNumbers(item) || 'Pressure reported'}</span>
                          <span className="font-mono font-bold text-on-surface">{value}%</span>
                        </div>
                        <div className="mt-2"><PressureBar value={value} severity={item.severity} /></div>
                      </div>
                      <span className={`justify-self-start rounded-full border px-2.5 py-1 text-[10px] font-bold md:justify-self-end ${tone.chip}`}>{tone.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
