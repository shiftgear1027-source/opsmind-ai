"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { cn } from "@/lib/format";
import type { RiskScoreBreakdown } from "@/types/operations";

const levelColor = {
  Critical: "#dc2626",
  High: "#ea580c",
  Moderate: "#ca8a04",
  Low: "#16a34a",
} as const;

export function RiskScore({
  breakdown,
  size = 180,
}: {
  breakdown: RiskScoreBreakdown;
  size?: number;
}) {
  const reduceMotion = useReducedMotion();
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - breakdown.score / 100);
  const color = levelColor[breakdown.level];

  return (
    <div className="flex flex-col items-center gap-5 lg:flex-row lg:items-start lg:gap-8">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: reduceMotion ? offset : circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-4xl font-semibold tracking-tight"
            style={{ color }}
          >
            <AnimatedNumber value={breakdown.score} />
          </span>
          <span className="text-xs text-slate-400">out of 100</span>
          <span
            className="mt-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
            style={{ color, backgroundColor: `${color}14` }}
          >
            {breakdown.level} risk
          </span>
        </div>
      </div>

      <div className="w-full min-w-0 flex-1 space-y-3">
        <p className="text-xs text-slate-500">
          Weighted from five measured components. Each contributes to the score in
          the proportion shown.
        </p>
        {breakdown.components.map((component, index) => (
          <div key={component.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs font-medium text-slate-700">
                {component.label}
              </span>
              <span className="shrink-0 font-mono text-xs text-slate-500">
                {component.value} × {component.weight.toFixed(2)}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, component.value)}%` }}
                transition={{ duration: 0.7, delay: 0.15 + index * 0.08 }}
                className={cn(
                  "h-full rounded-full",
                  component.value >= 60
                    ? "bg-red-500"
                    : component.value >= 35
                      ? "bg-amber-500"
                      : "bg-emerald-500",
                )}
              />
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              {component.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RiskScore;
