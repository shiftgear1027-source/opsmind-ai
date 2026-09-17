"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { PriorityBadge, SeverityBadge, StatusBadge } from "@/components/Badge";
import { EmptyState } from "@/components/States";
import { SEVERITY_WEIGHT } from "@/lib/analytics";
import { cn, formatMinutes, formatShortDate } from "@/lib/format";
import type { OperationRecord } from "@/types/operations";

type SortKey =
  | "id"
  | "date"
  | "department"
  | "category"
  | "issueType"
  | "severity"
  | "status"
  | "downtimeMinutes"
  | "priority";

const COLUMNS: { key: SortKey; label: string; align?: "right"; hideBelow?: string }[] = [
  { key: "id", label: "ID" },
  { key: "date", label: "Date" },
  { key: "department", label: "Department" },
  { key: "category", label: "Category", hideBelow: "xl:table-cell" },
  { key: "issueType", label: "Issue" },
  { key: "severity", label: "Severity" },
  { key: "status", label: "Status" },
  { key: "downtimeMinutes", label: "Downtime", align: "right" },
  { key: "priority", label: "Priority", hideBelow: "xl:table-cell" },
];

const PAGE_SIZE = 12;

function compare(a: OperationRecord, b: OperationRecord, key: SortKey): number {
  if (key === "severity" || key === "priority") {
    return SEVERITY_WEIGHT[b[key]] - SEVERITY_WEIGHT[a[key]];
  }
  const left = a[key];
  const right = b[key];
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right));
}

export function OperationsTable({
  records,
  onSelect,
  onResetFilters,
}: {
  records: OperationRecord[];
  onSelect: (record: OperationRecord) => void;
  onResetFilters?: () => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const list = [...records].sort((a, b) => compare(a, b, sortKey));
    return direction === "asc" ? list : list.reverse();
  }, [records, sortKey, direction]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [records, sortKey, direction]);

  const pageRecords = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection(key === "date" ? "desc" : "asc");
    }
  };

  if (records.length === 0) {
    return (
      <EmptyState
        title="No records match these filters"
        description="Nothing in the dataset matches the current combination of search term and filters. Clearing one or two usually brings results back."
        action={
          onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800"
            >
              Clear all filters
            </button>
          )
        }
      />
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Desktop and tablet: real table */}
      <div className="hidden overflow-x-auto md:block scrollbar-thin">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {COLUMNS.map((column) => {
                const active = sortKey === column.key;
                const Icon = active
                  ? direction === "asc"
                    ? ArrowUp
                    : ArrowDown
                  : ArrowUpDown;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      active
                        ? direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className={cn(
                      "px-4 py-3 text-left text-xs font-medium text-slate-500",
                      column.align === "right" && "text-right",
                      column.hideBelow && `hidden ${column.hideBelow}`,
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className={cn(
                        "inline-flex items-center gap-1 transition-colors hover:text-slate-800",
                        active && "text-slate-900",
                        column.align === "right" && "flex-row-reverse",
                      )}
                    >
                      {column.label}
                      <Icon className="h-3 w-3 opacity-60" aria-hidden />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageRecords.map((record, index) => (
              <motion.tr
                key={record.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
                onClick={() => onSelect(record)}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(record);
                  }
                }}
                className="cursor-pointer transition-colors hover:bg-slate-50 focus:bg-slate-50"
              >
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                  {record.id}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {formatShortDate(record.date)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {record.department}
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3 text-slate-600 xl:table-cell">
                  {record.category}
                </td>
                <td className="max-w-[240px] px-4 py-3">
                  <span className="block truncate font-medium text-slate-900">
                    {record.issueType}
                  </span>
                  <span className="block truncate text-xs text-slate-400">
                    {record.location}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <SeverityBadge severity={record.severity} showIcon={false} />
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusBadge status={record.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">
                  {formatMinutes(record.downtimeMinutes)}
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3 xl:table-cell">
                  <PriorityBadge priority={record.priority} />
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: the same rows as cards */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {pageRecords.map((record) => (
          <li key={record.id}>
            <button
              type="button"
              onClick={() => onSelect(record)}
              className="w-full px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-slate-900">
                  {record.issueType}
                </span>
                <SeverityBadge severity={record.severity} showIcon={false} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                <span className="font-mono">{record.id}</span> · {record.department} ·{" "}
                {record.location}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={record.status} />
                <span className="text-xs text-slate-500">
                  {formatMinutes(record.downtimeMinutes)} downtime
                </span>
                <span className="text-xs text-slate-400">
                  {formatShortDate(record.date)}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3">
        <p className="text-xs text-slate-500">
          Showing {(page - 1) * PAGE_SIZE + 1}–
          {Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <span className="px-2 text-xs text-slate-600">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

export default OperationsTable;
