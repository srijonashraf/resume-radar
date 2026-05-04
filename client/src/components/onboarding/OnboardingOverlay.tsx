import { useState, useCallback } from "react";
import { cn } from "../../utils/cn";
import { Button } from "../ui";
import OnboardingStep from "./OnboardingStep";

const STORAGE_KEY = "resumetra_onboarding_complete";

interface StepData {
  title: string;
  description: string;
  icon: string;
}

const STEPS: StepData[] = [
  {
    title: "Upload Your Resume",
    description: "Upload a PDF or paste your resume text for instant AI-powered analysis.",
    icon: "\uD83D\uDCC4",
  },
  {
    title: "Get Scored",
    description:
      "Receive detailed scores for ATS compatibility, content quality, impact, and readability.",
    icon: "\uD83C\uDFAF",
  },
  {
    title: "Tailor to Any Job",
    description:
      "Paste a job description and get honest AI-powered suggestions to improve your match \u2014 no fabrication.",
    icon: "\uD83D\uDCDD",
  },
  {
    title: "Edit & Export",
    description:
      "Use the live editor with real-time preview and download an ATS-ready PDF.",
    icon: "\uD83D\uDCDC",
  },
];

export default function OnboardingOverlay() {
  const [visible, setVisible] = useState(() => !localStorage.getItem(STORAGE_KEY));
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  const handleFinish = useCallback(() => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    dismiss();
  }, [dontShowAgain, dismiss]);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    dismiss();
  }, [dismiss]);

  if (!visible) {
    return null;
  }

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Resumetra"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Skip button */}
        <div className="absolute top-4 right-4 z-10">
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
            aria-label="Skip onboarding"
          >
            Skip
          </button>
        </div>

        {/* Step content */}
        <div className="relative min-h-[280px] sm:min-h-[320px] flex items-center pt-12 pb-6">
          {STEPS.map((step, index) => (
            <OnboardingStep
              key={step.title}
              stepNumber={index + 1}
              title={step.title}
              description={step.description}
              icon={step.icon}
              isActive={index === currentStep}
            />
          ))}
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 pb-4" role="tablist">
          {STEPS.map((step, index) => (
            <button
              key={step.title}
              role="tab"
              aria-selected={index === currentStep}
              aria-label={`Step ${index + 1}: ${step.title}`}
              onClick={() => setCurrentStep(index)}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all duration-200 cursor-pointer",
                index === currentStep
                  ? "bg-amber-600 w-6"
                  : "bg-stone-300 hover:bg-stone-400",
              )}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-stone-100 px-6 py-4 flex items-center justify-between">
          <div>
            {!isFirstStep && (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-4">
            {isLastStep && (
              <label className="flex items-center gap-2 text-sm text-stone-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                Don&apos;t show again
              </label>
            )}

            {isLastStep ? (
              <Button variant="primary" size="sm" onClick={handleFinish}>
                Get Started
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleNext}>
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
