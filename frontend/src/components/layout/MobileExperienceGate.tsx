export default function MobileExperienceGate() {
  return (
    <main className="mobile-gate min-h-[100dvh] overflow-hidden bg-paper px-5 py-6 text-on-surface">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-lg flex-col rounded-[28px] border-2 border-rule bg-paper-raised shadow-2xl">
        <header className="flex items-center justify-between border-b border-rule px-5 py-4">
          <div className="flex items-center gap-3">
            <img src="/logo/logo-symbol.svg" alt="" className="h-9 w-9" />
            <div>
              <p className="text-sm font-black">SlotForge</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-mono-grey">Schedule console</p>
            </div>
          </div>
          <span className="rounded-full border border-secondary/25 bg-signal-soft px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-secondary">
            Desktop only
          </span>
        </header>

        <section className="flex flex-1 flex-col justify-center px-6 py-8 sm:px-9">
          <div className="relative mx-auto mb-8 h-36 w-52" aria-hidden="true">
            <div className="absolute left-4 top-1 h-32 w-[76px] rotate-[-8deg] rounded-[18px] border-[3px] border-on-surface bg-surface-container-low shadow-lg">
              <div className="mx-auto mt-2 h-1.5 w-7 rounded-full bg-outline-variant" />
              <div className="mx-2 mt-3 grid h-20 grid-cols-2 gap-1 rounded-lg border border-rule bg-paper p-2">
                {Array.from({ length: 8 }).map((_, index) => <span key={index} className="rounded-sm bg-accent-soft" />)}
              </div>
            </div>
            <div className="absolute right-2 top-8 flex h-[82px] w-32 rotate-[5deg] items-center justify-center rounded-[16px] border-[3px] border-primary bg-inverse-surface shadow-xl">
              <span className="material-symbols-outlined text-4xl text-inverse-primary">calendar_month</span>
            </div>
            <span className="material-symbols-outlined absolute bottom-0 left-[86px] rounded-full border-2 border-rule bg-paper-raised p-2 text-primary shadow-md" style={{ fontSize: 25 }}>screen_rotation</span>
          </div>

          <p className="text-label-caps text-primary" style={{ fontSize: 10 }}>Full timetable workspace</p>
          <h1 className="mt-3 text-4xl font-black leading-[1.02] tracking-[-0.035em] text-on-surface" style={{ fontFamily: 'var(--font-display)' }}>
            This screen needs more room.
          </h1>
          <p className="mt-4 text-sm leading-6 text-on-surface-variant">
            SlotForge’s scheduling console is not available in the regular mobile layout yet. Dense timetables, graphs, and solver controls need a desktop-sized workspace.
          </p>

          <div className="mt-7 rounded-2xl border border-rule bg-surface-container-low p-4">
            <p className="text-xs font-black text-on-surface">Need to use it on this phone anyway?</p>
            <ol className="mt-4 space-y-3 text-sm text-on-surface-variant">
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-black text-on-primary">1</span><span>Open your browser menu and enable <strong className="text-on-surface">Desktop site</strong>.</span></li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-black text-on-primary">2</span><span>Turn your phone sideways into <strong className="text-on-surface">landscape</strong>.</span></li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-black text-on-primary">3</span><span>Reload after the wider desktop viewport appears.</span></li>
            </ol>
          </div>

          <button type="button" onClick={() => window.location.reload()} className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-on-primary shadow-sm hover:bg-primary/90">
            <span className="material-symbols-outlined" style={{ fontSize: 19 }}>refresh</span>
            Reload SlotForge
          </button>
        </section>

        <footer className="border-t border-rule bg-accent-soft/40 px-6 py-5 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Android app · Coming soon</p>
          <p className="mt-1 text-xs text-on-surface-variant">A phone-first SlotForge experience is on the way.</p>
        </footer>
      </div>
    </main>
  );
}
