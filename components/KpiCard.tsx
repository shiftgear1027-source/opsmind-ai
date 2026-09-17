"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { cn, formatDelta } from "@/lib/format";

export interface KpiCardProps {
  label: string;
  value: number;
  /** Renders the animated value; falls back to a plain localised number. */
  format?: (value: number) => string;
  delta: number;
  /** When true a rising number is bad (downtime, incidents). */
  invertDelta?: boolean;
  comparison: string;
  icon: LucideIcon;
  accent: "slate" | "red" | "emerald" | "amber";
  index?: number;
}

const accentStyles: Record<KpiCardProps["accent"], string> = {
  slate: "bg-slate-100 text-slate-700",
  red: "bg-red-50 text-red-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-700",
};

export function KpiCard({
  label,
  value,
  format,
  delta,
  invertDelta = false,
  comparison,
  icon: Icon,
  accent,
  index = 0,
}: KpiCardProps) {
  const flat = Math.abs(delta) < 0.5;
  const rising = delta > 0;
  const isGood = flat ? null : invertDelta ? !rising : rising;
  const TrendIcon = flat ? Minus : rising ? ArrowUpRight : ArrowDownRight;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className="card card-hover p-5"
    >
      <div className="flex items-start justify-between">
        <span className={cn("rounded-lg p-2", accentStyles[accent])}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
            isGood === null && "bg-slate-50 text-slate-500",
            isGood === true && "bg-emerald-50 text-emerald-700",
            isGood === false && "bg-red-50 text-red-600",
          )}
        >
          <TrendIcon className="h-3 w-3" aria-hidden />
          {formatDelta(delta)}
        </span>
      </div>

      <p className="mt-4 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
        <AnimatedNumber value={value} format={format} />
      </p>
      <p className="mt-1.5 text-xs text-slate-400">{comparison}</p>
    </motion.article>
  );
}

export default KpiCard;
