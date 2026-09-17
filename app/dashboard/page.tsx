"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Timer,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { ChartCard } from "@/components/ChartCard";
import { HowItWorks } from "@/components/HowItWorks";
import { KpiCard } from "@/components/KpiCard";
import { OperationDetail } from "@/components/OperationDetail";
import { PriorityWatchlist } from "@/components/PriorityWatchlist";
import { AnalysingState } from "@/components/States";
import { useOps } from "@/context/OpsContext";
import {
  getDepartmentStats,
  getSeverityStats,
  getStatusStats,
  getTrends,
} from "@/lib/analytics";
import {
  SEVERITY_COLORS,
  STATUS_COLORS,
  formatMinutes,
  formatNumber,
} from "@/lib/format";
import type { OperationRecord, Severity, Status } from "@/types/operations";

export default function OverviewPage() {
  const { records, kpis, analysis, isAnalysing } = useOps();
  const [selected, setSelected] = useState<OperationRecord | null>(null);

  const trend = useMemo(() => getTrends(records), [records]);
  const departments = useMemo(() => getDepartmentStats(records), [records]);
  const severity = useMemo(() => getSeverityStats(records), [records]);
  const status = useMemo(() => getStatusStats(records), [records]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Operations overview
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          AI-powered analysis of operational performance.
        </p>
      </header>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total incidents"
          value={kpis.totalIncidents}
          delta={kpis.deltas.incidents}
          invertDelta
          comparison="vs previous period"
          icon={Activity}
          accent="slate"
          index={0}
        />
        <KpiCard
          label="Critical issues"
          value={kpis.criticalIssues}
          delta={kpis.deltas.critical}
          invertDelta
          comparison={`${records.filter((r) => r.severity === "Critical" && r.status !== "Resolved").length} still open`}
          icon={AlertOctagon}
          accent="red"
          index={1}
        />
        <KpiCard
          label="Resolution rate"
          value={kpis.resolutionRate}
          format={(value) => `${value.toFixed(1)}%`}
          delta={kpis.deltas.resolutionRate}
          comparison="percentage points vs previous period"
          icon={CheckCircle2}
          accent="emerald"
          index={2}
        />
        <KpiCard
          label="Total downtime"
          value={kpis.totalDowntime}
          format={(value) => formatMinutes(value)}
          delta={kpis.deltas.downtime}
          invertDelta
          comparison={`${formatNumber(kpis.totalDowntime)} minutes across all sites`}
          icon={Timer}
          accent="amber"
          index={3}
        />
      </div>

      {/* AI executive summary */}
      {isAnalysing ? (
        <AnalysingState count={records.length} />
      ) : (
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="ai-surface p-6"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <span className="rounded-lg bg-ai-600 p-2 text-white shadow-ai">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    AI executive summary
                  </h3>
                  <p className="text-xs text-slate-500">
                    AI-powered operational analysis across{" "}
                    {analysis.recordsAnalysed} records
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-slate-700">
                {analysis.executiveSummary}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {analysis.trendExplanation}
              </p>

              <Link
                href="/dashboard/insights"
                className="group mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ai-700 hover:text-ai-600"
              >
                See the full analysis
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </div>

            <div className="w-full shrink-0 rounded-xl border border-white/70 bg-white/70 p-4 lg:w-56">
              <p className="text-xs text-slate-500">AI confidence</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
                <AnimatedNumber value={analysis.confidence} />%
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${analysis.confidence}%` }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full bg-ai-600"
                />
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                Based on sample size, field completeness and how distinct the
                detected patterns are.
              </p>
            </div>
          </div>
        </motion.section>
      )}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Incidents over time"
          description="Weekly incident volume with critical incidents shown beneath."
          hasData={trend.points.length > 0}
          delay={0.05}
          footer={`${trend.previousWindow} incidents in the first half of the period against ${trend.currentWindow} in the second.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend.points} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="incidentFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="criticalFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#dc2626" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ stroke: "#cbd5e1", strokeDasharray: 4 }}
                formatter={(value: number, name: string) => [value, name]}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="incidents"
                name="All incidents"
                stroke="#4f46e5"
                strokeWidth={2}
                fill="url(#incidentFill)"
                animationDuration={900}
              />
              <Area
                type="monotone"
                dataKey="critical"
                name="Critical"
                stroke="#dc2626"
                strokeWidth={2}
                fill="url(#criticalFill)"
                animationDuration={900}
                animationBegin={200}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Incidents by department"
          description="Incident count alongside the downtime each department absorbed."
          hasData={departments.length > 0}
          delay={0.1}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={departments}
              margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
            >
              <XAxis
                dataKey="department"
                tickLine={false}
                axisLine={false}
                interval={0}
                tick={{ fontSize: 11 }}
              />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "rgba(148,163,184,0.12)" }}
                formatter={(value: number, name) =>
                  name === "Downtime (hours)"
                    ? [`${value}h`, name]
                    : [value, "Incidents"]
                }
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="incidents"
                name="Incidents"
                fill="#4f46e5"
                radius={[4, 4, 0, 0]}
                animationDuration={800}
              />
              <Bar
                dataKey={(entry: { downtime: number }) =>
                  Math.round(entry.downtime / 60)
                }
                name="Downtime (hours)"
                fill="#0891b2"
                radius={[4, 4, 0, 0]}
                animationDuration={800}
                animationBegin={150}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Severity distribution"
          description="How the current selection splits across severity bands."
          hasData={severity.length > 0}
          delay={0.15}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={severity}
                dataKey="count"
                nameKey="name"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
                animationDuration={900}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {severity.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={SEVERITY_COLORS[entry.name as Severity]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value} incidents`, ""]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Operational status"
          description="Where incidents currently sit in the resolution workflow."
          hasData={status.length > 0}
          delay={0.2}
          footer={`${records.filter((r) => r.status !== "Resolved").length} incidents are still open across the selection.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={status}
                dataKey="count"
                nameKey="name"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
                animationDuration={900}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {status.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name as Status]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value} incidents`, ""]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Watchlist + pipeline */}
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <HowItWorks />
        <PriorityWatchlist
          issues={analysis.priorityIssues}
          onSelect={(id) =>
            setSelected(records.find((record) => record.id === id) ?? null)
          }
        />
      </div>

      <OperationDetail
        record={selected}
        population={records}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
