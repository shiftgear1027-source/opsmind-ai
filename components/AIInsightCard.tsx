"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Sparkles } from "lucide-react";
import { SeverityBadge } from "@/components/Badge";
import { cn } from "@/lib/format";
import type { KeyFinding } from "@/types/operations";

export function AIInsightCard({
  finding,
  index = 0,
  onInspect,
}: {
  finding: KeyFinding;
  index?: number;
  onInspect?: (recordIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.09, ease: [0.22, 1, 0.36, 1] }}
      className="ai-surface flex flex-col p-5"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 rounded-lg bg-ai-600 p-2 text-white shadow-ai">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">{finding.title}</h3>
            <SeverityBadge severity={finding.severity} showIcon={false} />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {finding.explanation}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-ai-200/60 pt-4 sm:grid-cols-4">
        {finding.evidence.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-xs text-slate-500">{item.label}</dt>
            <dd className="mt-0.5 truncate text-sm font-medium text-slate-900">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ai-200/60 pt-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Confidence</span>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${finding.confidence}%` }}
              transition={{ duration: 0.8, delay: 0.2 + index * 0.09 }}
              className="h-full rounded-full bg-ai-600"
            />
          </div>
          <span className="text-xs font-medium text-slate-700">
            {finding.confidence}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {finding.affectedRecordIds.length} records
          </span>
          <button
            type="button"
            onClick={() => {
              setOpen((v) => !v);
              if (!open) onInspect?.(finding.affectedRecordIds);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-ai-200 bg-white px-2.5 py-1 text-xs font-medium text-ai-700 transition-colors hover:bg-ai-50"
            aria-expanded={open}
          >
            View details
            <ChevronDown
              className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
              aria-hidden
            />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-lg border border-slate-200 bg-white/70 p-3">
              <p className="text-xs font-medium text-slate-600">
                Records behind this finding
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {finding.affectedRecordIds.slice(0, 24).map((id) => (
                  <span
                    key={id}
                    className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-600"
                  >
                    {id}
                  </span>
                ))}
                {finding.affectedRecordIds.length > 24 && (
                  <span className="px-1.5 py-0.5 text-[11px] text-slate-400">
                    +{finding.affectedRecordIds.length - 24} more
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

export default AIInsightCard;
