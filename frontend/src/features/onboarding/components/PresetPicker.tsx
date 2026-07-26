import { presetOptions, type DomainPresetKey } from './presets';

export default function PresetPicker({
  value,
  onChange,
}: {
  value: DomainPresetKey;
  onChange: (preset: DomainPresetKey) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {presetOptions.map((preset) => {
        const selected = preset.key === value;
        const available = preset.key === 'academic';
        return (
          <button
            key={preset.key}
            type="button"
            onClick={() => available && onChange(preset.key)}
            disabled={!available}
            aria-disabled={!available}
            className={`relative rounded-xl border-2 p-5 text-left transition-all duration-200 ${available ? 'bg-paper-raised hover:-translate-y-0.5 hover:border-primary/50' : 'cursor-not-allowed bg-surface-container-low opacity-70'} ${
              selected ? 'border-primary shadow-lg shadow-primary/10' : 'border-rule'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${selected ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                <span className="material-symbols-outlined" style={{ fontSize: 23 }}>{preset.icon}</span>
              </span>
              {selected && <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>check_circle</span>}
              {!available && <span className="rounded-full border border-rule bg-paper-raised px-2 py-1 text-[8px] font-black uppercase tracking-[.12em] text-mono-grey">Coming soon</span>}
            </div>
            <h3 className="mt-5 text-base font-black text-on-surface">{preset.name}</h3>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">{preset.description}</p>
            <p className="mt-4 text-label-caps text-mono-grey" style={{ fontSize: 9 }}>{preset.sample}</p>
          </button>
        );
      })}
    </div>
  );
}
