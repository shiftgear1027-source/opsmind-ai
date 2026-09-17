"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search as SearchIcon, X } from "lucide-react";
import { SeverityBadge } from "@/components/Badge";
import { useOps } from "@/context/OpsContext";
import { formatShortDate } from "@/lib/format";
import type { OperationRecord } from "@/types/operations";

function scoreMatch(record: OperationRecord, term: string): number {
  const needle = term.toLowerCase();
  if (record.id.toLowerCase().includes(needle)) return 5;
  if (record.issueType.toLowerCase().includes(needle)) return 4;
  if (record.department.toLowerCase().includes(needle)) return 3;
  if (record.location.toLowerCase().includes(needle)) return 3;
  if (record.category.toLowerCase().includes(needle)) return 2;
  if (record.rootCause.toLowerCase().includes(needle)) return 2;
  if (record.description.toLowerCase().includes(needle)) return 1;
  return 0;
}

export function GlobalSearch({
  onSelectRecord,
}: {
  onSelectRecord?: (record: OperationRecord) => void;
}) {
  const { allRecords } = useOps();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (term.trim().length < 2) return [];
    return allRecords
      .map((record) => ({ record, score: scoreMatch(record, term.trim()) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || b.record.date.localeCompare(a.record.date))
      .slice(0, 7)
      .map((entry) => entry.record);
  }, [allRecords, term]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    const handlePointer = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handlePointer);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handlePointer);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <label className="sr-only" htmlFor="global-search">
        Search operational records
      </label>
      <SearchIcon
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
      <input
        id="global-search"
        ref={inputRef}
        value={term}
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search issues, departments, sites"
        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-16 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-ai-400 focus:bg-white"
        autoComplete="off"
      />
      {term ? (
        <button
          type="button"
          onClick={() => {
            setTerm("");
            inputRef.current?.focus();
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-400 sm:block">
          ⌘K
        </kbd>
      )}

      <AnimatePresence>
        {open && term.trim().length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lift scrollbar-thin"
          >
            {results.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-slate-500">
                No records match “{term}”. Try a department, site or issue name.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {results.map((record) => (
                  <li key={record.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectRecord?.(record);
                        setOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-slate-900">
                          {record.issueType}
                        </span>
                        <SeverityBadge severity={record.severity} showIcon={false} />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        <span className="font-mono">{record.id}</span> ·{" "}
                        {record.department} · {record.location} ·{" "}
                        {formatShortDate(record.date)}
                      </p>
                    </button>
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

export default GlobalSearch;
