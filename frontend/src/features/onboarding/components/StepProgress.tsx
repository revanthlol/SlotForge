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
    <aside className="h-full overflow-y-auto border-r-2 border-rule bg-paper-raised px-5 py-6">
      <div className="mb-7">
        <p className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>Setup wizard</p>
        <h2 className="mt-2 text-headline-sm text-on-surface">Launch plan</h2>
      </div>

      <ol className="space-y-1">
        {steps.map((step, index) => {
          const complete = completedSteps.includes(step.key);
          const active = index === currentStep;
          const available = index <= currentStep || complete;

          return (
            <li key={step.key}>
              <button
                type="button"
                disabled={!available}
                onClick={() => onSelectStep(index)}
                className={`group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  active
                    ? 'bg-accent-soft text-primary'
                    : complete
                      ? 'text-on-surface hover:bg-accent-soft/50'
                      : 'text-mono-grey hover:bg-surface-container'
                } disabled:cursor-not-allowed disabled:hover:bg-transparent`}
              >
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                  complete
                    ? 'border-primary bg-primary text-on-primary'
                    : active
                      ? 'border-primary text-primary'
                      : 'border-rule text-mono-grey'
                }`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
                    {complete ? 'check' : step.icon}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-wider opacity-70">
                    Step {index + 1}
                  </span>
                  <span className="block text-sm font-semibold leading-tight">{step.label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
