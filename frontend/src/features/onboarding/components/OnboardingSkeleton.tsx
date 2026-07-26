export function OnboardingSkeleton() {
  return (
    <div className="onboarding-screen">
      <div className="onboarding-loading-card">
        <div className="h-12 w-12 rounded-2xl bg-accent-soft onboarding-skeleton" />
        <div className="mt-7 h-5 w-36 rounded-full bg-surface-container onboarding-skeleton" />
        <div className="mt-4 h-4 w-64 rounded-full bg-surface-container onboarding-skeleton" />
        <div className="mt-8 h-2 w-48 rounded-full bg-surface-container onboarding-skeleton" />
      </div>
    </div>
  );
}
