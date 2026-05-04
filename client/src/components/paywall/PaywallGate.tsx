import { useState, type ReactNode } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useStore } from "../../store/useStore";
import PaywallModal from "./PaywallModal";
import Button from "../ui/Button";

type GatedFeature = "pdf_download" | "editor_edit" | "full_issues" | "tailor";

interface PaywallGateProps {
  feature: GatedFeature;
  children: ReactNode;
  fallback?: ReactNode;
}

const FEATURE_MESSAGES: Record<GatedFeature, { guest: string; exhausted: string }> = {
  pdf_download: {
    guest: "Sign in to download PDF",
    exhausted: "Upgrade to download PDF",
  },
  editor_edit: {
    guest: "Sign in to edit",
    exhausted: "Upgrade to edit your resume",
  },
  full_issues: {
    guest: "Sign in to see all issues",
    exhausted: "Upgrade to see all issues",
  },
  tailor: {
    guest: "Sign in to tailor your resume",
    exhausted: "Upgrade to tailor your resume",
  },
};

function DefaultFallback({
  message,
  onUpgrade,
}: {
  message: string;
  onUpgrade: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-3 text-center">
      <p className="text-sm text-stone-500">{message}</p>
      <Button variant="primary" size="sm" onClick={onUpgrade}>
        Upgrade
      </Button>
    </div>
  );
}

export default function PaywallGate({ feature, children, fallback }: PaywallGateProps) {
  const { user } = useAuth();
  const usage = useStore((s) => s.usage);
  const [showModal, setShowModal] = useState(false);

  const isAuthenticated = !!user;
  const isExhausted = usage !== null && usage.remaining === 0;

  // Authenticated user with usage not yet loaded: allow access (loading state)
  if (isAuthenticated && usage === null) {
    return <>{children}</>;
  }

  // Authenticated user with remaining quota: full access
  if (isAuthenticated && !isExhausted) {
    return <>{children}</>;
  }

  // Access denied — either guest or exhausted quota
  const messages = FEATURE_MESSAGES[feature];
  const message = !isAuthenticated ? messages.guest : messages.exhausted;

  if (fallback) {
    return (
      <>
        {fallback}
        <PaywallModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          isGuest={!isAuthenticated}
        />
      </>
    );
  }

  return (
    <>
      <DefaultFallback
        message={message}
        onUpgrade={() => setShowModal(true)}
      />
      <PaywallModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        isGuest={!isAuthenticated}
      />
    </>
  );
}
