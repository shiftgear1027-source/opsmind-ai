"use client";

import { motion } from "framer-motion";
import { Activity, ArrowRight, Radar } from "lucide-react";
import { RiskBadge } from "@/components/Badge";
import { formatDate } from "@/lib/format";
import type { Anomaly } from "@/types/operations";

export function AnomalyCard({
  anomaly,
  index = 0,
  onInvestigate,
}: {
  anomaly: Anomaly;
  index?: number;
  onInvestigate?: (anomaly: Anomaly) => void;
}) {
  const { record } = anomaly;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className="card relative flex flex-col overflow-hidden p-5"
    >
      <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-red-500 via-orange-400 to-amber-300" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium text-red-600">
          <Radar className="h-3.5 w-3.5" aria-hidden />
          Anomaly detected
        </div>
        <RiskBadge level={anomaly.risk} />
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-900">
        {record.issueType}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">
        {record.location} · {record.department} · {formatDate(record.date)} ·{" "}
        <span className="font-mono">{record.id}</span>
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-red-100 bg-red-50/60 p-3">
          <p className="text-xs text-red-700/80">{anomaly.metric}</p>
          <p className="mt-0.5 text-lg font-semibold text-red-700">
            {anomaly.observed}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Normal range</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-700">
            {anomaly.expectedRange}
          </p>
        </div>
      </div>

      {anomaly.deviation > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <Activity className="h-3.5 w-3.5 text-slate-400" aria-hidden />
          {anomaly.deviation.toFixed(1)}σ above the dataset mean
        </div>
      )}

      <div className="mt-4 rounded-lg border border-ai-200/70 bg-ai-50/60 p-3">
        <p className="text-xs font-medium text-ai-700">Engine assessment</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          {anomaly.assessment}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onInvestigate?.(anomaly)}
        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800"
      >
        Investigate {record.id}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </button>
    </motion.article>
  );
}

export default AnomalyCard;
