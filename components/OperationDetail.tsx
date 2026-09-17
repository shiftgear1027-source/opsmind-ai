"use client";

import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Clock,
  DollarSign,
  MapPin,
  Sparkles,
  Timer,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { PriorityBadge, SeverityBadge, StatusBadge } from "@/components/Badge";
import { assessRecord } from "@/lib/aiAnalysis";
import { buildTimeline } from "@/lib/filters";
import { cn, formatCost, formatDate, formatMinutes } from "@/lib/format";
import type { OperationRecord } from "@/types/operations";

const stateStyles = {
  done: "border-emerald-500 bg-emerald-500",
  active: "border-blue-500 bg-blue-500",
  pending: "border-slate-300 bg-white",
} as const;

export function OperationDetail({
  record,
  population,
  onClose,
}: {
  record: OperationRecord | null;
  population: OperationRecord[];
  onClose: () => void;
}) {
  useEffect(() => {
    if (!record) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [record, onClose]);

  const assessment = useMemo(
    () => (record ? assessRecord(record, population) : null),
    [record, population],
  );
  const timeline = useMemo(() => (record ? buildTimeline(record) : []), [record]);

  return (
    <AnimatePresence>
      {record && assessment && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
            aria-hidden
          />

          <motion.aside
            initial={{ opacity: 0, x: 40, scale: 0.99 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="operation-detail-title"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-lift sm:border-l sm:border-slate-200"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <p className="font-mono text-xs text-slate-400">{record.id}</p>
                <h2
                  id="operation-detail-title"
                  className="mt-0.5 text-lg font-semibold leading-snug text-slate-900"
                >
                  {record.issueType}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={record.severity} />
                  <StatusBadge status={record.status} />
                  <PriorityBadge priority={record.priority} />
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close details"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5 scrollbar-thin">
              <p className="text-sm leading-relaxed text-slate-700">
                {record.description}
              </p>

              <dl className="mt-5 grid grid-cols-2 gap-3">
                {[
                  { icon: Building2, label: "Department", value: record.department },
                  { icon: MapPin, label: "Location", value: record.location },
                  { icon: Wrench, label: "Category", value: record.category },
                  { icon: Clock, label: "Logged", value: formatDate(record.date) },
                  {
                    icon: Timer,
                    label: "Downtime",
                    value: formatMinutes(record.downtimeMinutes),
                  },
                  {
                    icon: Timer,
                    label: "Resolution time",
                    value: formatMinutes(record.resolutionMinutes),
                  },
                  {
                    icon: DollarSign,
                    label: "Cost impact",
                    value: formatCost(record.costImpact),
                  },
                  {
                    icon: Users,
                    label: "People affected",
                    value: `${record.employeeCount}`,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                  >
                    <dt className="flex items-center gap-1.5 text-xs text-slate-500">
                      <item.icon className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                      {item.label}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">Root cause</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {record.rootCause}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">Owner</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {record.resolvedBy}
                  </p>
                </div>
              </div>

              {/* AI assessment */}
              <section className="ai-surface mt-5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-ai-600 p-1.5 text-white">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900">
                      AI assessment
                    </h3>
                  </div>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                    Risk {assessment.riskScore}/100
                  </span>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-slate-700">
                  {assessment.assessment}
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {assessment.comparisons.map((comparison) => (
                    <div
                      key={comparison.label}
                      className="rounded-lg border border-white/70 bg-white/70 p-2.5"
                    >
                      <p className="text-[11px] text-slate-500">{comparison.label}</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900">
                        {comparison.value}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 text-[11px]",
                          comparison.worse ? "text-red-600" : "text-emerald-600",
                        )}
                      >
                        {comparison.delta}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-lg border border-ai-200 bg-white/80 p-3">
                  <p className="text-xs font-medium text-ai-700">
                    Recommended next step
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">
                    {assessment.recommendation}
                  </p>
                </div>
              </section>

              {/* Timeline */}
              <section className="mt-6">
                <h3 className="text-sm font-semibold text-slate-900">
                  Incident timeline
                </h3>
                <ol className="mt-4 space-y-0">
                  {timeline.map((step, index) => (
                    <motion.li
                      key={`${step.title}-${index}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 + index * 0.08 }}
                      className="relative flex gap-4 pb-5 last:pb-0"
                    >
                      {index < timeline.length - 1 && (
                        <span
                          className="absolute left-[7px] top-4 h-full w-px bg-slate-200"
                          aria-hidden
                        />
                      )}
                      <span
                        className={cn(
                          "relative mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2",
                          stateStyles[step.state],
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-xs text-slate-500">
                            {step.time}
                          </span>
                          <span className="text-sm font-medium text-slate-900">
                            {step.title}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                          {step.detail}
                        </p>
                      </div>
                    </motion.li>
                  ))}
                </ol>
              </section>
            </div>

            <footer className="border-t border-slate-200 bg-slate-50/70 px-5 py-3">
              <p className="text-xs text-slate-500">
                Assessment generated from {population.length} records in the current
                selection. Demo data.
              </p>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default OperationDetail;
