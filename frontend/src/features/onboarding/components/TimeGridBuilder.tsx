import type { DomainPresetKey } from './presets';

export interface TimeGridConfig {
  schedulingMode: 'fixed_weekday' | 'day_order';
  cycleLength: number;
  periodsPerDay: number;
  shiftBlocks: string[];
}

const timeCopy: Record<DomainPresetKey, { title: string; label: string; helper: string; blocks: string[] }> = {
  academic: {
    title: 'Configure periods',
    label: 'Periods per day',
    helper: 'Most academic timetables start with 5 or 6 teaching periods.',
    blocks: ['Morning', 'Midday', 'Afternoon'],
  },
  staff_roster: {
    title: 'Configure shift blocks',
    label: 'Shifts per day',
    helper: 'Use broad shift blocks first. Detailed coverage comes later.',
    blocks: ['Morning shift', 'Evening shift', 'Night shift'],
  },
  event: {
    title: 'Configure event slots',
    label: 'Session slots per day',
    helper: 'Model keynote, workshop, and break-out capacity before adding sessions.',
    blocks: ['Keynote', 'Workshop', 'Breakout'],
  },
  exam: {
    title: 'Configure exam slots',
    label: 'Exam slots per day',
    helper: 'Start with the number of exam sittings that can run each day.',
    blocks: ['Forenoon', 'Afternoon'],
  },
  facility: {
    title: 'Configure booking slots',
    label: 'Bookable blocks per day',
    helper: 'Use a coarse grid for the first setup; booking rules refine it later.',
    blocks: ['Business hours', 'Evening access'],
  },
};

export default function TimeGridBuilder({
  preset,
  value,
  onChange,
}: {
  preset: DomainPresetKey;
  value: TimeGridConfig;
  onChange: (value: TimeGridConfig) => void;
}) {
  const copy = timeCopy[preset];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-headline-sm text-on-surface">{copy.title}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">{copy.helper}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="rounded-xl border-2 border-rule bg-paper-raised p-4">
          <span className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>Cycle length</span>
          <input
            type="number"
            min={1}
            max={14}
            value={value.cycleLength}
            onChange={(event) => onChange({ ...value, cycleLength: Number(event.target.value) })}
            className="academic-input mt-3 w-full"
          />
        </label>
        <label className="rounded-xl border-2 border-rule bg-paper-raised p-4">
          <span className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>{copy.label}</span>
          <input
            type="number"
            min={1}
            max={12}
            value={value.periodsPerDay}
            onChange={(event) => onChange({ ...value, periodsPerDay: Number(event.target.value) })}
            className="academic-input mt-3 w-full"
          />
        </label>
        <div className="rounded-xl border-2 border-rule bg-paper-raised p-4">
          <p className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>Mode</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(['fixed_weekday', 'day_order'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onChange({ ...value, schedulingMode: mode })}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  value.schedulingMode === mode ? 'border-primary bg-accent-soft text-primary' : 'border-rule text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {mode === 'fixed_weekday' ? 'Weekday' : 'Day order'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border-2 border-rule bg-paper-raised p-5">
        <p className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>Starter blocks</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {copy.blocks.map((block) => (
            <span key={block} className="rounded-full border border-rule bg-surface-container px-3 py-1 text-sm font-semibold text-on-surface-variant">
              {block}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
