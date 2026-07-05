export interface QuickItem {
  id: string;
  name: string;
  detail?: string;
  count?: number;
}

export default function QuickAddList({
  title,
  description,
  icon,
  placeholder,
  detailPlaceholder,
  items,
  onAdd,
  onRemove,
  numericLabel,
}: {
  title: string;
  description: string;
  icon: string;
  placeholder: string;
  detailPlaceholder?: string;
  items: QuickItem[];
  onAdd: (item: Omit<QuickItem, 'id'>) => Promise<void> | void;
  onRemove: (id: string) => void;
  numericLabel?: string;
}) {
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    const detail = String(form.get('detail') || '').trim();
    const countValue = Number(form.get('count') || 0);
    if (!name) return;
    await onAdd({ name, detail, count: countValue || undefined });
    event.currentTarget.reset();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(360px,1fr)]">
      <div className="rounded-xl border-2 border-rule bg-paper-raised p-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-primary">
          <span className="material-symbols-outlined" style={{ fontSize: 25 }}>{icon}</span>
        </span>
        <h3 className="mt-5 text-headline-sm text-on-surface">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <input name="name" className="academic-input w-full" placeholder={placeholder} />
          {detailPlaceholder && <input name="detail" className="academic-input w-full" placeholder={detailPlaceholder} />}
          {numericLabel && (
            <label className="block">
              <span className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>{numericLabel}</span>
              <input name="count" type="number" min={1} className="academic-input mt-2 w-full" placeholder="40" />
            </label>
          )}
          <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            Add
          </button>
        </form>
      </div>

      <div className="rounded-xl border-2 border-rule bg-paper-raised p-5">
        <div className="flex items-center justify-between">
          <p className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>Added</p>
          <span className="rounded-full bg-surface-container px-2 py-1 text-xs font-bold text-on-surface-variant">{items.length}</span>
        </div>
        <div className="mt-4 space-y-2">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-rule p-6 text-sm text-on-surface-variant">
              Add at least one item to continue. You can refine details later.
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-rule bg-surface-container-low px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-on-surface">{item.name}</p>
                  {(item.detail || item.count) && (
                    <p className="truncate text-xs text-mono-grey">
                      {[item.detail, item.count ? `${item.count}` : ''].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <button type="button" onClick={() => onRemove(item.id)} className="rounded-lg p-1.5 text-on-surface-variant hover:bg-error-container hover:text-error">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
