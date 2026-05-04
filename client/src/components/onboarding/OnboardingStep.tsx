import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

interface OnboardingStepProps {
  stepNumber: number;
  title: string;
  description: string;
  icon: ReactNode;
  isActive: boolean;
}

export default function OnboardingStep({
  stepNumber,
  title,
  description,
  icon,
  isActive,
}: OnboardingStepProps) {
  return (
    <div
      className={cn(
        "transition-all duration-300 ease-in-out",
        isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 absolute inset-0 pointer-events-none",
      )}
      aria-hidden={!isActive}
    >
      <div className="flex flex-col items-center text-center px-4 sm:px-8">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-4xl sm:text-5xl mb-6">
          {icon}
        </div>
        <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-600 text-white text-xs font-bold mb-3">
          {stepNumber}
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-stone-900 font-heading mb-3">
          {title}
        </h2>
        <p className="text-stone-600 text-sm sm:text-base max-w-md leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
