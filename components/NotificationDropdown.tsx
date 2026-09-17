"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { AlertOctagon, Bell, Radar, Repeat, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useOps } from "@/context/OpsContext";
import { getRecurringIssues } from "@/lib/analytics";
import { formatMinutes } from "@/lib/format";

interface Notification {
  id: string;
  title: string;
  detail: string;
  icon: LucideIcon;
  tone: "critical" | "warning" | "info";
  href: string;
}

const toneStyles = {
  critical: "bg-red-50 text-red-600",
  warning: "bg-amber-50 text-amber-700",
  info: "bg-ai-50 text-ai-700",
} as const;

export function NotificationDropdown() {
  const { records, analysis } = useOps();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const notifications = useMemo<Notification[]>(() => {
    const list: Notification[] = [];
    const openCritical = records.filter(
      (r) => r.severity === "Critical" && r.status !== "Resolved",
    );

    if (openCritical.length > 0) {
      list.push({
        id: "open-critical",
        title: `${openCritical.length} critical issues require attention`,
        detail: `Unassigned or escalated across ${new Set(openCritical.map((r) => r.department)).size} departments.`,
        icon: AlertOctagon,
        tone: "critical",
        href: "/dashboard/operations",
      });
    }

    const worstAnomaly = analysis.anomalies[0];
    if (worstAnomaly) {
      list.push({
        id: "anomaly",
        title: `${worstAnomaly.record.location} ${worstAnomaly.metric.toLowerCase()} anomaly detected`,
        detail: `${worstAnomaly.observed} against a normal range of ${worstAnomaly.expectedRange}.`,
        icon: Radar,
        tone: "warning",
        href: "/dashboard/insights",
      });
    }

    const recurring = getRecurringIssues(records)[0];
    if (recurring) {
      list.push({
        id: "recurring",
        title: `Repeating pattern at ${recurring.location}`,
        detail: `${recurring.issueType} logged ${recurring.occurrences} times for ${formatMinutes(recurring.downtime)} of downtime.`,
        icon: Repeat,
        tone: "warning",
        href: "/dashboard/insights",
      });
    }

    const topRisk = analysis.riskAreas[0];
    if (topRisk) {
      list.push({
        id: "risk-area",
        title: `${topRisk.name} scored ${topRisk.score}/100 on operational risk`,
        detail: topRisk.drivers.slice(0, 2).join(" · "),
        icon: TrendingUp,
        tone: "info",
        href: "/dashboard/analytics",
      });
    }

    return list;
  }, [records, analysis]);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Notifications, ${notifications.length} items`}
        className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <Bell className="h-4.5 w-4.5" aria-hidden />
        {notifications.length > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {notifications.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lift"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <span className="text-xs text-slate-400">
                Generated from the current selection
              </span>
            </div>

            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-slate-500">
                Nothing needs attention in the current selection.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                    >
                      <span
                        className={`mt-0.5 h-7 w-7 shrink-0 rounded-lg p-1.5 ${toneStyles[item.tone]}`}
                      >
                        <item.icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium leading-snug text-slate-900">
                          {item.title}
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                          {item.detail}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NotificationDropdown;
