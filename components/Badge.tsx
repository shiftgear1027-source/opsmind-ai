import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock,
  Flame,
  Info,
  Loader,
} from "lucide-react";
import {
  cn,
  priorityBadge,
  riskBadge,
  severityBadge,
  statusBadge,
} from "@/lib/format";
import type { Priority, RiskLevel, Severity, Status } from "@/types/operations";

const severityIcon: Record<Severity, typeof AlertOctagon> = {
  Critical: AlertOctagon,
  High: AlertTriangle,
  Medium: Info,
  Low: CheckCircle2,
};

const statusIcon: Record<Status, typeof CheckCircle2> = {
  Resolved: CheckCircle2,
  "In Progress": Loader,
  Pending: Clock,
  Escalated: Flame,
};

export function SeverityBadge({
  severity,
  showIcon = true,
}: {
  severity: Severity;
  showIcon?: boolean;
}) {
  const Icon = severityIcon[severity];
  return (
    <span className={cn("badge", severityBadge[severity])}>
      {showIcon && <Icon className="h-3 w-3" aria-hidden />}
      {severity}
    </span>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  const Icon = statusIcon[status];
  return (
    <span className={cn("badge", statusBadge[status])}>
      <Icon className="h-3 w-3" aria-hidden />
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={cn("badge", priorityBadge[priority])}>
      <CircleDashed className="h-3 w-3" aria-hidden />
      {priority}
    </span>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <span className={cn("badge", riskBadge[level])}>{level} risk</span>;
}

export function MetaBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="badge bg-slate-50 text-slate-600 ring-slate-500/20">
      {children}
    </span>
  );
}
