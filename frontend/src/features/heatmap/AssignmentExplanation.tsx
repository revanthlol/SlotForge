import type { AssignmentExplanationReport } from './types';

export default function AssignmentExplanation({ explanation }: { explanation: AssignmentExplanationReport | null }) {
  if (!explanation) {
    return (
      <div className="rounded-lg border border-dashed border-rule bg-surface-container-low p-5 text-sm text-mono-grey">
        Select a scheduled assignment to view placement reasoning once explanations are available.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-rule bg-paper-raised p-4">
      <p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>Assignment explanation</p>
      <h3 className="mt-1 text-sm font-semibold text-on-surface">{explanation.title || explanation.assignment_id}</h3>
      <div className="mt-4 space-y-2">
        {explanation.reasons.map((reason) => (
          <div key={reason} className="flex gap-2 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 15 }}>check_circle</span>
            <span>{reason}</span>
          </div>
        ))}
      </div>
      {explanation.warnings?.length ? (
        <div className="mt-4 rounded-lg border border-secondary/20 bg-signal-soft p-3 text-xs text-secondary">
          {explanation.warnings.join(' ')}
        </div>
      ) : null}
    </div>
  );
}
