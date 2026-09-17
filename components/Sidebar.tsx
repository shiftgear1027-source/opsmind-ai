"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BrainCircuit,
  LayoutDashboard,
  LineChart,
  Sparkles,
  Table2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ProfileMenu } from "@/components/ProfileMenu";
import { useOps } from "@/context/OpsContext";
import { cn } from "@/lib/format";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  hint: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: LayoutDashboard,
    hint: "Executive view of operational performance.",
  },
  {
    href: "/dashboard/insights",
    label: "AI Insights",
    icon: BrainCircuit,
    hint: "Patterns, anomalies and recommended actions.",
  },
  {
    href: "/dashboard/operations",
    label: "Operations",
    icon: Table2,
    hint: "Every operational record, filterable and searchable.",
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    icon: LineChart,
    hint: "Deeper analysis across departments, causes and cost.",
  },
];

export function usePageMeta() {
  const pathname = usePathname();
  return (
    NAV_ITEMS.find((item) => item.href === pathname) ?? NAV_ITEMS[0]
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { records, analysis } = useOps();
  const openCritical = records.filter(
    (r) => r.severity === "Critical" && r.status !== "Resolved",
  ).length;

  return (
    <div className="flex h-full flex-col bg-ink-950 text-slate-300">
      <Link
        href="/"
        className="flex items-center gap-2.5 px-5 py-5 transition-opacity hover:opacity-90"
      >
        <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-ai-600 text-white">
          <Sparkles className="h-4.5 w-4.5" aria-hidden />
        </span>
        <span>
          <span className="block text-sm font-semibold text-white">OpsMind AI</span>
          <span className="block text-[11px] text-slate-500">
            Operational intelligence
          </span>
        </span>
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-200",
                active
                  ? "text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-white/10 ring-1 ring-inset ring-white/10"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <Icon
                className={cn(
                  "relative h-4 w-4 shrink-0 transition-transform duration-200",
                  !active && "group-hover:translate-x-0.5",
                )}
                aria-hidden
              />
              <span className="relative flex-1 font-medium">{item.label}</span>
              {item.href === "/dashboard/insights" &&
                analysis.anomalies.length > 0 && (
                  <span className="relative rounded-full bg-ai-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-ai-200">
                    {analysis.anomalies.length}
                  </span>
                )}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 mb-3 rounded-lg border border-white/5 bg-white/[0.03] p-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-xs font-medium text-slate-200">
            Analysis engine active
          </span>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
          {records.length} records in scope
          {openCritical > 0 && ` · ${openCritical} open critical`}
        </p>
      </div>

      <ProfileMenu onNavigate={onNavigate} />
    </div>
  );
}

export function Sidebar({
  mobileOpen,
  onCloseMobile,
}: {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  return (
    <>
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 left-0 w-64">
          <SidebarContent />
        </div>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onCloseMobile}
              className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
              aria-hidden
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden"
              role="dialog"
              aria-label="Navigation"
            >
              <button
                type="button"
                onClick={onCloseMobile}
                className="absolute right-3 top-5 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
              <SidebarContent onNavigate={onCloseMobile} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default Sidebar;
