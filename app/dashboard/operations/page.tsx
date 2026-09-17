"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search as SearchIcon, X } from "lucide-react";
import { FilterBar } from "@/components/FilterBar";
import { OperationDetail } from "@/components/OperationDetail";
import { OperationsTable } from "@/components/OperationsTable";
import { CardSkeleton } from "@/components/States";
import { useOps } from "@/context/OpsContext";
import { formatCost, formatMinutes } from "@/lib/format";
import {
  calculateResolutionRate,
  calculateTotalCost,
  calculateTotalDowntime,
} from "@/lib/analytics";
import type { OperationRecord } from "@/types/operations";

function OperationsContent() {
  const { records, filters, setFilters, resetFilters, isAnalysing } = useOps();
  const [selected, setSelected] = useState<OperationRecord | null>(null);
  const searchParams = useSearchParams();

  // Deep link from global search or a notification.
  const requestedId = searchParams.get("record");
  useEffect(() => {
    if (!requestedId) return;
    const match = records.find((record) => record.id === requestedId);
    if (match) setSelected(match);
  }, [requestedId, records]);

  const summary = [
    { label: "Records in view", value: records.length.toString() },
    { label: "Downtime", value: formatMinutes(calculateTotalDowntime(records)) },
    {
      label: "Resolution rate",
      value: `${calculateResolutionRate(records).toFixed(0)}%`,
    },
    { label: "Cost impact", value: formatCost(calculateTotalCost(records)) },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Operational records
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Every logged incident. Select a row to open the full record with its AI
          assessment and timeline.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <div key={item.label} className="card px-4 py-3">
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <label className="sr-only" htmlFor="records-search">
          Search records
        </label>
        <SearchIcon
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          id="records-search"
          value={filters.search}
          onChange={(event) => setFilters({ search: event.target.value })}
          placeholder="Search by issue, description, root cause, owner or record ID"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-ai-400"
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => setFilters({ search: "" })}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>

      <FilterBar
        groups={["departments", "severities", "statuses", "categories", "locations"]}
        showDateRange
      />

      {isAnalysing ? (
        <CardSkeleton lines={8} />
      ) : (
        <OperationsTable
          records={records}
          onSelect={setSelected}
          onResetFilters={resetFilters}
        />
      )}

      <OperationDetail
        record={selected}
        population={records}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

export default function OperationsPage() {
  return (
    <Suspense fallback={<CardSkeleton lines={8} />}>
      <OperationsContent />
    </Suspense>
  );
}
