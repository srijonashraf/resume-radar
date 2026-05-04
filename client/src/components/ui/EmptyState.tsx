import type { ReactNode } from "react";
import Button from "./Button";
import { cn } from "../../utils/cn";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => (
  <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
    {icon && <div className="text-5xl mb-4">{icon}</div>}
    <h3 className="text-xl font-semibold text-stone-900 mb-2">{title}</h3>
    {description && (
      <p className="text-stone-500 text-sm max-w-md mb-6">{description}</p>
    )}
    {action && (
      <Button variant="primary" onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </div>
);

export default EmptyState;
