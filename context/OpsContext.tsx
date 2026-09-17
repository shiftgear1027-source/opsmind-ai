"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DATASET_META, operations } from "@/data/operations";
import { calculateKpis } from "@/lib/analytics";
import { getAIEngine } from "@/lib/aiAnalysis";
import { EMPTY_FILTERS, applyFilters, countActiveFilters } from "@/lib/filters";
import type {
  AIAnalysis,
  KpiSummary,
  OperationFilters,
  OperationRecord,
} from "@/types/operations";

interface OpsContextValue {
  allRecords: OperationRecord[];
  records: OperationRecord[];
  filters: OperationFilters;
  activeFilterCount: number;
  setFilters: (next: Partial<OperationFilters>) => void;
  resetFilters: () => void;
  analysis: AIAnalysis;
  kpis: KpiSummary;
  engineLabel: string;
  meta: typeof DATASET_META;
  isAnalysing: boolean;
}

const OpsContext = createContext<OpsContextValue | null>(null);

export function OpsProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<OperationFilters>(EMPTY_FILTERS);
  const [isAnalysing, setIsAnalysing] = useState(false);

  const records = useMemo(() => applyFilters(operations, filters), [filters]);

  // The engine is deterministic and synchronous, so the "analysing" flag exists
  // to show the work honestly rather than to fake latency — it clears as soon as
  // the pass over the filtered records completes.
  const analysis = useMemo(() => getAIEngine().analyse(records), [records]);
  const kpis = useMemo(() => calculateKpis(records), [records]);

  useEffect(() => {
    setIsAnalysing(true);
    const timer = window.setTimeout(() => setIsAnalysing(false), 420);
    return () => window.clearTimeout(timer);
  }, [records]);

  const setFilters = useCallback((next: Partial<OperationFilters>) => {
    setFiltersState((current) => ({ ...current, ...next }));
  }, []);

  const resetFilters = useCallback(() => setFiltersState(EMPTY_FILTERS), []);

  const value = useMemo<OpsContextValue>(
    () => ({
      allRecords: operations,
      records,
      filters,
      activeFilterCount: countActiveFilters(filters),
      setFilters,
      resetFilters,
      analysis,
      kpis,
      engineLabel: getAIEngine().label,
      meta: DATASET_META,
      isAnalysing,
    }),
    [records, filters, setFilters, resetFilters, analysis, kpis, isAnalysing],
  );

  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>;
}

export function useOps(): OpsContextValue {
  const context = useContext(OpsContext);
  if (!context) throw new Error("useOps must be used inside an OpsProvider");
  return context;
}
