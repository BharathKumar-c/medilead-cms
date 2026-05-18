import { Check } from 'lucide-react';

const StepIndicator = ({ currentStep, totalSteps, stepLabels }) => {
  return (
    <div className="flex items-center justify-between mb-8">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;

        return (
          <div key={stepNum} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-body-md font-bold transition-all
                  ${isCompleted
                    ? 'bg-secondary text-on-secondary'
                    : isCurrent
                      ? 'bg-secondary/20 text-secondary border-2 border-secondary'
                      : 'bg-surface-container-high text-on-surface-variant border border-outline-variant'
                  }`}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : stepNum}
              </div>
              <span className={`mt-2 font-caption text-xs whitespace-nowrap ${
                isCurrent ? 'text-secondary font-bold' : isCompleted ? 'text-on-surface' : 'text-on-surface-variant'
              }`}>
                {stepLabels[i]}
              </span>
            </div>
            {stepNum < totalSteps && (
              <div className={`flex-1 h-0.5 mx-3 mt-[-1.5rem] ${
                isCompleted ? 'bg-secondary' : 'bg-outline-variant'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepIndicator;
