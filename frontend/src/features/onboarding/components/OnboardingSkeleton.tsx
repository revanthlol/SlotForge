export function OnboardingSkeleton() {
  return (
    <div className="fixed inset-0 z-[200] bg-paper">
      <div className="grid h-full lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="border-r-2 border-rule bg-paper-raised p-6">
          <div className="h-3 w-24 rounded-full bg-surface-container onboarding-skeleton" />
          <div className="mt-4 h-7 w-40 rounded-lg bg-surface-container onboarding-skeleton" />
          <div className="mt-8 space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-surface-container onboarding-skeleton" />
                <div className="h-4 flex-1 rounded-full bg-surface-container onboarding-skeleton" />
              </div>
            ))}
          </div>
        </div>
        <div className="p-8">
          <div className="h-4 w-32 rounded-full bg-surface-container onboarding-skeleton" />
          <div className="mt-6 h-12 max-w-xl rounded-xl bg-surface-container onboarding-skeleton" />
          <div className="mt-5 h-4 max-w-2xl rounded-full bg-surface-container onboarding-skeleton" />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 rounded-xl border-2 border-rule bg-paper-raised p-5">
                <div className="h-8 w-8 rounded-lg bg-surface-container onboarding-skeleton" />
                <div className="mt-5 h-4 w-2/3 rounded-full bg-surface-container onboarding-skeleton" />
                <div className="mt-3 h-3 w-full rounded-full bg-surface-container onboarding-skeleton" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
