"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Radar, ShieldAlert, Sparkles, Target } from "lucide-react";
import { AIInsightCard } from "@/components/AIInsightCard";
import { AnomalyCard } from "@/components/AnomalyCard";
import { FilterBar } from "@/components/FilterBar";
import { OperationDetail } from "@/components/OperationDetail";
import { RecommendationCard } from "@/components/RecommendationCard";
import { RiskScore } from "@/components/RiskScore";
import { CardSkeleton, EmptyState, NoAnomaliesState } from "@/components/States";
import { useOps } from "@/context/OpsContext";
import { cn, formatMinutes } from "@/lib/format";
import type { OperationRecord, RiskLevel } from "@/types/operations";

const riskTone: Record<RiskLevel, string> = {
  Critical: "border-red-200 bg-red-50",
  High: "border-orange-200 bg-orange-50",
  Moderate: "border-amber-200 bg-amber-50",
  Low: "border-emerald-200 bg-emerald-50",
};

function SectionHeading({
  icon: Icon,
  title,
  description,
  count,
}: {
  icon: typeof Sparkles;
  title: string;
  description: string;
  count?: number;
}) {
  return (
    <header className="flex items-start gap-3">
      <span className="mt-0.5 rounded-lg bg-slate-900 p-2 text-white">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          {title}
          {count !== undefined && (
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
              {count}
            </span>
          )}
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
    </header>
  );
}

export default function InsightsPage() {
  const { records, analysis, isAnalysing, resetFilters } = useOps();
  const [selected, setSelected] = useState<OperationRecord | null>(null);

  const openRecord = (id: string) =>
    setSelected(records.find((record) => record.id === id) ?? null);

  return (
    <div className="mx-auto max-w-[1400px] space-y-8">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          AI insights
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Discover patterns, anomalies and recommended actions.
        </p>
      </header>

      <FilterBar groups={["departments", "severities", "statuses", "locations"]} />

      {/* Analysis header */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="ai-surface relative p-6"
      >
        {isAnalysing && (
          <span
            className="absolute inset-x-0 top-0 h-0.5 overflow-hidden"
            aria-hidden
          >
            <span className="block h-full w-1/4 animate-scan bg-gradient-to-r from-transparent via-ai-500 to-transparent" />
          </span>
        )}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-ai-600 text-white shadow-ai">
                <Sparkles className="h-4 w-4" aria-hidden />
                {isAnalysing && (
                  <span className="absolute inset-0 animate-pulse-ring rounded-lg bg-ai-400/50" />
                )}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {isAnalysing
                    ? `Analysing ${records.length} operational records…`
                    : `Analysis complete · ${analysis.recordsAnalysed} records`}
                </p>
                <p className="text-xs text-slate-500">
                  AI-powered operational analysis · {analysis.engine} · demo data
                </p>
              </div>
            </div>

            <h3 className="mt-5 text-sm font-semibold text-slate-900">
              Executive summary
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {analysis.executiveSummary}
            </p>

            <h3 className="mt-5 text-sm font-semibold text-slate-900">
              Trend explanation
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {analysis.trendExplanation}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="ai-chip">
                {analysis.keyFindings.length} key findings
              </span>
              <span className="ai-chip">
                {analysis.anomalies.length} anomalies
              </span>
              <span className="ai-chip">
                {analysis.recommendations.length} recommended actions
              </span>
              <span className="ai-chip">
                {analysis.confidence}% confidence
              </span>
            </div>
          </div>

          <div className="w-full shrink-0 rounded-xl border border-white/70 bg-white/70 p-5 lg:w-[26rem]">
            <p className="text-xs font-medium text-slate-500">Operational risk</p>
            <div className="mt-3">
              <RiskScore breakdown={analysis.riskScore} size={150} />
            </div>
          </div>
        </div>
      </motion.section>

      {/* Key findings */}
      <section className="space-y-4">
        <SectionHeading
          icon={Sparkles}
          title="Key findings"
          description="The patterns the engine considers most consequential, each backed by the records behind it."
          count={analysis.keyFindings.length}
        />

        {isAnalysing ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <CardSkeleton lines={4} />
            <CardSkeleton lines={4} />
          </div>
        ) : analysis.keyFindings.length === 0 ? (
          <EmptyState
            title="Not enough records to draw a finding"
            description="The engine needs a larger sample before it will assert a pattern. Clear a filter or two and it will run again."
            action={
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {analysis.keyFindings.map((finding, index) => (
              <AIInsightCard
                key={finding.id}
                finding={finding}
                index={index}
                onInspect={(ids) => ids[0] && openRecord(ids[0])}
              />
            ))}
          </div>
        )}
      </section>

      {/* Anomalies */}
      <section className="space-y-4">
        <SectionHeading
          icon={Radar}
          title="Detected anomalies"
          description="Records sitting more than two standard deviations outside the observed operating range, plus unresolved critical incidents."
          count={analysis.anomalies.length}
        />

        {analysis.anomalies.length === 0 ? (
          <NoAnomaliesState />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {analysis.anomalies.slice(0, 6).map((anomaly, index) => (
              <AnomalyCard
                key={anomaly.id}
                anomaly={anomaly}
                index={index}
                onInvestigate={(a) => openRecord(a.record.id)}
              />
            ))}
          </div>
        )}

        {analysis.anomalies.length > 6 && (
          <p className="text-xs text-slate-500">
            Showing the six highest-risk anomalies of {analysis.anomalies.length}{" "}
            detected. Filter by department or site to narrow the set.
          </p>
        )}
      </section>

      {/* Risk areas */}
      <section className="space-y-4">
        <SectionHeading
          icon={ShieldAlert}
          title="Risk areas"
          description="Departments and sites ranked by combined severity, downtime, recurrence and open workload."
          count={analysis.riskAreas.length}
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {analysis.riskAreas.map((area, index) => (
            <motion.article
              key={area.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
              className={cn("rounded-xl border p-4", riskTone[area.level])}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{area.name}</p>
                  <p className="text-xs text-slate-500">{area.scope}</p>
                </div>
                <span className="text-2xl font-semibold tabular-nums text-slate-900">
                  {area.score}
                </span>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/70">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${area.score}%` }}
                  transition={{ duration: 0.7, delay: 0.1 + index * 0.06 }}
                  className={cn(
                    "h-full rounded-full",
                    area.level === "Critical"
                      ? "bg-red-500"
                      : area.level === "High"
                        ? "bg-orange-500"
                        : area.level === "Moderate"
                          ? "bg-amber-500"
                          : "bg-emerald-500",
                  )}
                />
              </div>

              <ul className="mt-3 space-y-1">
                {area.drivers.map((driver) => (
                  <li key={driver} className="text-xs text-slate-600">
                    · {driver}
                  </li>
                ))}
              </ul>

              <p className="mt-3 border-t border-white/70 pt-2 text-[11px] text-slate-500">
                {area.incidents} incidents · {formatMinutes(area.downtime)}
              </p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Recommendations */}
      <section className="space-y-4">
        <SectionHeading
          icon={Target}
          title="Recommended actions"
          description="Ranked by priority and expected impact. Each one names the department that owns it and the evidence it rests on."
          count={analysis.recommendations.length}
        />

        {analysis.recommendations.length === 0 ? (
          <EmptyState
            title="No actions to recommend"
            description="Nothing in the current selection meets the threshold for a recommendation."
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {analysis.recommendations.map((recommendation, index) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                index={index}
                onViewRecords={(ids) => ids[0] && openRecord(ids[0])}
              />
            ))}
          </div>
        )}
      </section>

      <OperationDetail
        record={selected}
        population={records}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
