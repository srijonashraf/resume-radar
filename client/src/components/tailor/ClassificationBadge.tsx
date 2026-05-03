import Badge from "../ui/Badge";
import type { GapClassification } from "@resumetra/shared";

interface ClassificationBadgeProps {
  classification: GapClassification;
}

const classificationConfig: Record<
  GapClassification,
  { variant: "success" | "warning" | "info"; label: string }
> = {
  REWRITTEN: { variant: "success", label: "REWRITTEN" },
  REFRAMED: { variant: "warning", label: "REFRAMED" },
  MISSING: { variant: "info", label: "MISSING" },
};

export default function ClassificationBadge({
  classification,
}: ClassificationBadgeProps) {
  const config = classificationConfig[classification];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
