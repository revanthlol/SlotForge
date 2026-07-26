export interface OnboardingStep {
  key: string;
  title: string;
  label: string;
  icon: string;
}

export default function StepProgress({
  steps,
  currentStep,
  completedSteps,
  onSelectStep,
}: {
  steps: OnboardingStep[];
  currentStep: number;
  completedSteps: string[];
  onSelectStep: (index: number) => void;
}) {
  return (
    <nav aria-label="Onboarding Progress" className="w-full">
      <ol className="flex flex-wrap items-center gap-2">
        {steps.map((step, index) => {
          const complete = completedSteps.includes(step.key);
          const active = index === currentStep;
          const available = index <= currentStep || complete;

          return (
            <li key={step.key} className="flex-1 min-w-[140px]">
              <button
                type="button"
                disabled={!available}
                onClick={() => onSelectStep(index)}
                className={`group flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                  active
                    ? 'border-primary bg-accent-soft/40 shadow-sm'
                    : complete
                    ? 'border-primary/40 bg-paper-raised hover:border-primary'
                    : 'border-rule bg-surface-container-low opacity-60'
                } disabled:cursor-not-allowed`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 font-bold text-xs transition-colors ${
                    complete
                      ? 'border-primary bg-primary text-on-primary'
                      : active
                      ? 'border-primary bg-paper text-primary'
                      : 'border-rule bg-paper-raised text-on-surface-variant'
                  }`}
                >
                  {complete ? (
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      check
                    </span>
                  ) : (
                    index + 1
                  )}
                </span>
                <div className="min-w-0">
                  <span className="block truncate text-xs font-bold text-on-surface">
                    {step.label}
                  </span>
                  <span className="block truncate text-[10px] text-on-surface-variant">
                    Step {index + 1} of {steps.length}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
