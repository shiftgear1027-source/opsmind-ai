"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/format";

interface ChartCardProps {
  title: string;
  description?: string;
  /** When false the card renders its empty state instead of the chart. */
  hasData?: boolean;
  emptyLabel?: string;
  action?: ReactNode;
  footer?: ReactNode;
  height?: number;
  delay?: number;
  className?: string;
  children: ReactNode;
}

export function ChartCard({
  title,
  description,
  hasData = true,
  emptyLabel = "No records match the current filters.",
  action,
  footer,
  height = 280,
  delay = 0,
  className,
  children,
}: ChartCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn("card flex flex-col p-5", className)}
    >
      <header className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              {description}
            </p>
          )}
        </div>
        {action}
      </header>

      <div style={{ height }} className="w-full">
        {hasData ? (
          children
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 text-center">
            <BarChart3 className="h-6 w-6 text-slate-300" aria-hidden />
            <p className="max-w-[220px] text-xs text-slate-500">{emptyLabel}</p>
          </div>
        )}
      </div>

      {footer && (
        <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
          {footer}
        </div>
      )}
    </motion.section>
  );
}

export default ChartCard;
