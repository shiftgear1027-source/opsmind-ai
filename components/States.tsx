"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Inbox, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/format";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: typeof Inbox;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="rounded-full bg-white p-3 shadow-card">
        <Icon className="h-5 w-5 text-slate-400" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

export function NoAnomaliesState() {
  return (
    <EmptyState
      icon={ShieldCheck}
      title="Nothing sits outside the normal operating range"
      description="Every record in the current selection falls within two standard deviations on downtime, resolution time and cost. Widen the filters to test a larger sample."
    />
  );
}

export function ErrorState({
  title = "The analysis could not be completed",
  description,
  onRetry,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title={title}
      description={description}
      action={
        onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800"
          >
            Run analysis again
          </button>
        )
      }
    />
  );
}

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={cn("skeleton", className)} style={style} />;
}

export function KpiSkeleton() {
  return (
    <div className="card space-y-3 p-5">
      <Skeleton className="h-8 w-8 rounded-lg" />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card space-y-3 p-5">
      <Skeleton className="h-4 w-40" />
      {Array.from({ length: lines }).map((_, index) => (
        // Ragged widths read as text rather than as bars.
        <Skeleton key={index} className="h-3" style={{ width: `${92 - index * 11}%` }} />
      ))}
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="card space-y-4 p-5">
      <Skeleton className="h-4 w-44" />
      <Skeleton className="w-full rounded-lg" style={{ height }} />
    </div>
  );
}

/** Shown while the engine passes over a newly filtered dataset. */
export function AnalysingState({ count }: { count: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="ai-surface flex items-center gap-3 px-5 py-4"
    >
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ai-600 text-white">
        <Sparkles className="h-4 w-4" aria-hidden />
        <span className="absolute inset-0 animate-pulse-ring rounded-lg bg-ai-400/50" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">
          Analysing {count.toLocaleString()} operational records
        </p>
        <p className="text-xs text-slate-500">
          Scoring severity, downtime, recurrence and resolution patterns.
        </p>
      </div>
    </motion.div>
  );
}
