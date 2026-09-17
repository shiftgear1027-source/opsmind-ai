"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, FilterX } from "lucide-react";
import {
  CATEGORIES,
  DEPARTMENTS,
  LOCATIONS,
  SEVERITIES,
  STATUSES,
} from "@/lib/analytics";
import { toggleValue } from "@/lib/filters";
import { cn } from "@/lib/format";
import { useOps } from "@/context/OpsContext";
import type { OperationFilters } from "@/types/operations";

type MultiKey = "departments" | "severities" | "statuses" | "categories" | "locations";

const GROUPS: { key: MultiKey; label: string; options: readonly string[] }[] = [
  { key: "departments", label: "Department", options: DEPARTMENTS },
  { key: "severities", label: "Severity", options: SEVERITIES },
  { key: "statuses", label: "Status", options: STATUSES },
  { key: "categories", label: "Category", options: CATEGORIES },
  { key: "locations", label: "Location", options: LOCATIONS },
];

function MultiSelect({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
          selected.length > 0
            ? "border-ai-300 bg-ai-50 text-ai-700"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
        )}
      >
        {label}
        {selected.length > 0 && (
          <span className="rounded bg-ai-600 px-1 text-[10px] font-semibold text-white">
            {selected.length}
          </span>
        )}
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14 }}
            className="absolute left-0 top-full z-40 mt-1.5 min-w-[11rem] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lift"
          >
            {options.map((option) => {
              const active = selected.includes(option);
              return (
                <li key={option}>
                  <button
                    type="button"
                    onClick={() => onToggle(option)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    {option}
                    {active && <Check className="h-3.5 w-3.5 text-ai-600" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FilterBar({
  groups = ["departments", "severities", "statuses", "categories"],
  showDateRange = false,
  className,
}: {
  groups?: MultiKey[];
  showDateRange?: boolean;
  className?: string;
}) {
  const { filters, setFilters, resetFilters, activeFilterCount, records, meta } =
    useOps();

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3",
        className,
      )}
    >
      {GROUPS.filter((group) => groups.includes(group.key)).map((group) => (
        <MultiSelect
          key={group.key}
          label={group.label}
          options={group.options}
          selected={filters[group.key] as string[]}
          onToggle={(value) =>
            setFilters({
              [group.key]: toggleValue(
                filters[group.key] as string[],
                value,
              ),
            } as Partial<OperationFilters>)
          }
        />
      ))}

      {showDateRange && (
        <div className="flex items-center gap-1.5">
          <label className="sr-only" htmlFor="date-from">
            From date
          </label>
          <input
            id="date-from"
            type="date"
            min={meta.periodStart}
            max={meta.periodEnd}
            value={filters.dateFrom ?? ""}
            onChange={(event) =>
              setFilters({ dateFrom: event.target.value || null })
            }
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:border-ai-400"
          />
          <span className="text-xs text-slate-400">to</span>
          <label className="sr-only" htmlFor="date-to">
            To date
          </label>
          <input
            id="date-to"
            type="date"
            min={meta.periodStart}
            max={meta.periodEnd}
            value={filters.dateTo ?? ""}
            onChange={(event) => setFilters({ dateTo: event.target.value || null })}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:border-ai-400"
          />
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-slate-500">
          {records.length} of {meta.recordCount} records
        </span>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <FilterX className="h-3.5 w-3.5" aria-hidden />
            Clear {activeFilterCount}
          </button>
        )}
      </div>
    </div>
  );
}

export default FilterBar;
