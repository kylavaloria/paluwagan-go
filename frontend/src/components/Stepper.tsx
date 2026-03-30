import { Check } from "lucide-react";

interface StepperProps {
  steps: string[];
  currentStep: number; // 0-indexed
}

export default function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="stepper">
      {steps.map((label, i) => {
        const isDone = i < currentStep;
        const isActive = i === currentStep;
        const cls = isDone ? "stepper-step--done" : isActive ? "stepper-step--active" : "";
        return (
          <div key={i} className={`stepper-step ${cls}`}>
            <div className="stepper-circle">
              {isDone ? <Check size={16} /> : i + 1}
            </div>
            <span className="stepper-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
