import { useCallback, useEffect, useRef } from "react";
import Button from "../ui/Button";
import { cn } from "../../utils/cn";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGuest: boolean;
}

export default function PaywallModal({ isOpen, onClose, isGuest }: PaywallModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Premium feature"
        className={cn(
          "w-full max-w-md rounded-2xl bg-white p-6 shadow-xl",
          "animate-in fade-in zoom-in-95 duration-200",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-stone-900">Premium Feature</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-stone-600 mb-6">
          This feature requires a premium account. Upgrade to unlock full access
          to all tools and unlimited analyses.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          {isGuest && (
            <a href="/api/v1/auth/google">
              <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                Sign In
              </Button>
            </a>
          )}
          <Button
            variant="primary"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => {
              // No payment integration yet — placeholder
            }}
          >
            Upgrade Now
          </Button>
        </div>
      </div>
    </div>
  );
}
