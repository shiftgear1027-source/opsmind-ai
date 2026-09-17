"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Info, Menu } from "lucide-react";
import { GlobalSearch } from "@/components/Search";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { DEMO_USER } from "@/components/ProfileMenu";
import { usePageMeta } from "@/components/Sidebar";
import { useOps } from "@/context/OpsContext";
import type { OperationRecord } from "@/types/operations";

function DemoIndicator({ recordCount }: { recordCount: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100"
        aria-describedby="demo-tooltip"
      >
        Demo dataset · {recordCount} records
        <Info className="h-3 w-3" aria-hidden />
      </button>

      <AnimatePresence>
        {open && (
          <motion.p
            id="demo-tooltip"
            role="tooltip"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600 shadow-lift"
          >
            Demo environment using synthetic operational data created for this
            innovation challenge. No real company records are used.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Header({
  onOpenMobileNav,
  onSelectRecord,
}: {
  onOpenMobileNav: () => void;
  onSelectRecord?: (record: OperationRecord) => void;
}) {
  const meta = usePageMeta();
  const { meta: dataset, isAnalysing, engineLabel } = useOps();
  const router = useRouter();

  const handleSelect = (record: OperationRecord) => {
    if (onSelectRecord) onSelectRecord(record);
    else router.push(`/dashboard/operations?record=${record.id}`);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-slate-900">
            {meta.label}
          </h1>
          <p className="hidden truncate text-xs text-slate-500 sm:block">
            {meta.hint}
          </p>
        </div>

        <div className="order-last flex w-full items-center gap-2 sm:order-none sm:w-auto sm:flex-1 sm:justify-end">
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <GlobalSearch onSelectRecord={handleSelect} />
          </div>

          <div
            className="hidden items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800 md:flex"
            title={engineLabel}
          >
            <span className="relative flex h-2 w-2">
              {isAnalysing && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
              )}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {isAnalysing ? "AI engine analysing" : "AI engine active"}
          </div>

          <div className="hidden lg:block">
            <DemoIndicator recordCount={dataset.recordCount} />
          </div>

          <NotificationDropdown />

          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ai-500 to-ai-700 text-[11px] font-semibold text-white"
            title={`${DEMO_USER.name} — ${DEMO_USER.role}`}
          >
            {DEMO_USER.initials}
          </span>
        </div>
      </div>
    </header>
  );
}

export default Header;
