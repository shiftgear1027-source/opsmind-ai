"use client";

import { motion } from "framer-motion";
import { Target } from "lucide-react";
import { PriorityBadge } from "@/components/Badge";
import { cn } from "@/lib/format";
import type { Recommendation } from "@/types/operations";

const impactStyles: Record<Recommendation["impact"], string> = {
  High: "bg-red-50 text-red-700 ring-red-600/20",
  Medium: "bg-amber-50 text-amber-800 ring-amber-600/20",
  Low: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

export function RecommendationCard({
  recommendation,
  index,
  onViewRecords,
}: {
  recommendation: Recommendation;
  index: number;
  onViewRecords?: (ids: string[]) => void;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="card card-hover flex gap-4 p-5"
    >
      <div className="flex shrink-0 flex-col items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
          {index + 1}
        </span>
        <span className="h-full w-px bg-slate-200" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold leading-snug text-slate-900">
          {recommendation.action}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {recommendation.reason}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={cn("badge", impactStyles[recommendation.impact])}>
            <Target className="h-3 w-3" aria-hidden />
            {recommendation.impact} impact
          </span>
          <PriorityBadge priority={recommendation.priority} />
          <span className="badge bg-slate-50 text-slate-600 ring-slate-500/20">
            {recommendation.department}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <p className="font-mono text-xs text-slate-500">
            {recommendation.supportingMetric}
          </p>
          {onViewRecords && (
            <button
              type="button"
              onClick={() => onViewRecords(recommendation.affectedRecordIds)}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Show {recommendation.affectedRecordIds.length} records
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export default RecommendationCard;
