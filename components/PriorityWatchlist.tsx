"use client";

import { motion } from "framer-motion";
import { ChevronRight, ListFilter } from "lucide-react";
import { SeverityBadge, StatusBadge } from "@/components/Badge";
import { EmptyState } from "@/components/States";
import { cn } from "@/lib/format";
import type { PriorityIssue } from "@/types/operations";

function riskTone(score: number) {
  if (score >= 80) return "text-red-600 bg-red-50 ring-red-600/20";
  if (score >= 60) return "text-orange-600 bg-orange-50 ring-orange-600/20";
  if (score >= 40) return "text-amber-700 bg-amber-50 ring-amber-600/20";
  return "text-emerald-700 bg-emerald-50 ring-emerald-600/20";
}

export function PriorityWatchlist({
  issues,
  onSelect,
}: {
  issues: PriorityIssue[];
  onSelect?: (recordId: string) => void;
}) {
  return (
    <section className="card flex h-full flex-col p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            AI priority watchlist
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Ranked by severity, downtime, cost and how long each has stayed open.
          </p>
        </div>
        <ListFilter className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
      </header>

      {issues.length === 0 ? (
        <EmptyState
          title="Nothing on the watchlist"
          description="No records match the current filters, so there is nothing to rank."
          className="flex-1"
        />
      ) : (
        <ul className="flex flex-1 flex-col divide-y divide-slate-100">
          {issues.map((issue, index) => (
            <motion.li
              key={issue.record.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: index * 0.08 }}
            >
              <button
                type="button"
                onClick={() => onSelect?.(issue.record.id)}
                className="group flex w-full items-start gap-3 py-3 text-left transition-colors hover:bg-slate-50/80"
              >
                <span
                  className={cn(
                    "mt-0.5 shrink-0 rounded-lg px-2 py-1.5 text-center ring-1 ring-inset",
                    riskTone(issue.riskScore),
                  )}
                >
                  <span className="block text-sm font-semibold leading-none">
                    {issue.riskScore}
                  </span>
                  <span className="mt-0.5 block text-[10px] uppercase tracking-wide opacity-70">
                    risk
                  </span>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900">
                    {issue.record.issueType}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {issue.record.department} · {issue.record.location}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <SeverityBadge severity={issue.record.severity} showIcon={false} />
                    <StatusBadge status={issue.record.status} />
                  </span>
                </span>

                <ChevronRight
                  className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500"
                  aria-hidden
                />
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default PriorityWatchlist;
