"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { AskAIPanel } from "@/components/AskAIPanel";
import { ChartCard } from "@/components/ChartCard";
import { FilterBar } from "@/components/FilterBar";
import { useOps } from "@/context/OpsContext";
import {
  getCategoryStats,
  getDepartmentStats,
  getResolutionDistribution,
  getRootCauseStats,
  getScatterPoints,
  getSeverityResolutionStats,
  getStatusTrend,
} from "@/lib/analytics";
import {
  CHART_PALETTE,
  SEVERITY_COLORS,
  STATUS_COLORS,
  formatCost,
  formatMinutes,
} from "@/lib/format";
import type { Severity } from "@/types/operations";

export default function AnalyticsPage() {
  const { records } = useOps();

  const departments = useMemo(() => getDepartmentStats(records), [records]);
  const rootCauses = useMemo(
    () => getRootCauseStats(records).slice(0, 8),
    [records],
  );
  const resolutionBuckets = useMemo(
    () => getResolutionDistribution(records),
    [records],
  );
  const categories = useMemo(() => getCategoryStats(records), [records]);
  const severityResolution = useMemo(
    () => getSeverityResolutionStats(records),
    [records],
  );
  const statusTrend = useMemo(() => getStatusTrend(records), [records]);
  const scatter = useMemo(() => getScatterPoints(records), [records]);

  const hasData = records.length > 0;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Analytics
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Deeper analysis across departments, causes, cost and resolution.
          Every chart and the AI panel below respond to these filters.
        </p>
      </header>

      <FilterBar
        groups={["departments", "severities", "statuses", "categories"]}
        showDateRange
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Downtime by department"
          description="Total minutes lost, with the average per incident shown for context."
          hasData={hasData}
          delay={0.05}
          height={300}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={departments}
              margin={{ top: 4, right: 16, left: 18, bottom: 0 }}
            >
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="department"
                tickLine={false}
                axisLine={false}
                width={82}
              />
              <Tooltip
                cursor={{ fill: "rgba(148,163,184,0.12)" }}
                formatter={(value: number, name) => [
                  name === "Total downtime" ? formatMinutes(value) : `${value} min`,
                  name,
                ]}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="downtime"
                name="Total downtime"
                fill="#4f46e5"
                radius={[0, 4, 4, 0]}
                animationDuration={800}
              />
              <Bar
                dataKey="avgDowntime"
                name="Average per incident"
                fill="#a5b4fc"
                radius={[0, 4, 4, 0]}
                animationDuration={800}
                animationBegin={150}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Incidents and resolution rate by department"
          description="Volume against the share of incidents actually closed."
          hasData={hasData}
          delay={0.1}
          height={300}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
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
              <YAxis yAxisId="left" tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                unit="%"
              />
              <Tooltip
                cursor={{ fill: "rgba(148,163,184,0.12)" }}
                formatter={(value: number, name) => [
                  name === "Resolution rate" ? `${value.toFixed(0)}%` : value,
                  name,
                ]}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar
                yAxisId="left"
                dataKey="incidents"
                name="Incidents"
                fill="#0891b2"
                radius={[4, 4, 0, 0]}
                animationDuration={800}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="resolutionRate"
                name="Resolution rate"
                stroke="#16a34a"
                strokeWidth={2}
                dot={{ r: 3 }}
                animationDuration={900}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Root cause distribution"
          description="The eight most frequent causes across the current selection."
          hasData={rootCauses.length > 0}
          delay={0.15}
          height={320}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={rootCauses}
              margin={{ top: 4, right: 20, left: 18, bottom: 0 }}
            >
              <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                width={170}
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                cursor={{ fill: "rgba(148,163,184,0.12)" }}
                formatter={(value: number) => [`${value} incidents`, "Occurrences"]}
              />
              <Bar
                dataKey="count"
                name="Occurrences"
                radius={[0, 4, 4, 0]}
                animationDuration={800}
              >
                {rootCauses.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Resolution time distribution"
          description="How long incidents take to close, bucketed so the shape is readable."
          hasData={hasData}
          delay={0.2}
          height={320}
          footer="A long tail beyond twelve hours usually points to handover gaps rather than repair complexity."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={resolutionBuckets}
              margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
            >
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "rgba(148,163,184,0.12)" }}
                formatter={(value: number) => [`${value} incidents`, "Count"]}
              />
              <Bar
                dataKey="count"
                name="Incidents"
                fill="#7c3aed"
                radius={[4, 4, 0, 0]}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Cost impact by category"
          description="Where the financial impact of operational failure concentrates."
          hasData={categories.length > 0}
          delay={0.25}
          height={300}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categories}
                dataKey="cost"
                nameKey="name"
                innerRadius="52%"
                outerRadius="78%"
                paddingAngle={2}
                animationDuration={900}
                label={({ name, percent }) =>
                  percent > 0.06 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
                }
                labelLine={false}
              >
                {categories.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [formatCost(value), "Cost impact"]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Severity against resolution time"
          description="Average and median minutes to close, by severity band."
          hasData={severityResolution.length > 0}
          delay={0.3}
          height={300}
          footer="Where the average sits far above the median, a few extreme cases are dragging the band."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={severityResolution}
              margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
            >
              <XAxis dataKey="severity" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(148,163,184,0.12)" }}
                formatter={(value: number, name) => [formatMinutes(value), name]}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="avgResolution"
                name="Average"
                radius={[4, 4, 0, 0]}
                animationDuration={800}
              >
                {severityResolution.map((entry) => (
                  <Cell
                    key={entry.severity}
                    fill={SEVERITY_COLORS[entry.severity as Severity]}
                  />
                ))}
              </Bar>
              <Bar
                dataKey="medianResolution"
                name="Median"
                fill="#cbd5e1"
                radius={[4, 4, 0, 0]}
                animationDuration={800}
                animationBegin={150}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Status trend over time"
          description="Weekly incident volume split by where each incident ended up."
          hasData={statusTrend.length > 0}
          delay={0.35}
          height={300}
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={statusTrend}
              margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
            >
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip cursor={{ stroke: "#cbd5e1", strokeDasharray: 4 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              {(["Resolved", "In Progress", "Pending", "Escalated"] as const).map(
                (status, index) => (
                  <Area
                    key={status}
                    type="monotone"
                    dataKey={status}
                    stackId="status"
                    stroke={STATUS_COLORS[status]}
                    fill={STATUS_COLORS[status]}
                    fillOpacity={0.22}
                    strokeWidth={2}
                    animationDuration={900}
                    animationBegin={index * 120}
                  />
                ),
              )}
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Downtime against resolution time"
          description="Each point is one incident. Points far from the cluster are the ones the anomaly detector picks up."
          hasData={scatter.length > 0}
          delay={0.4}
          height={320}
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 16, left: -6, bottom: 8 }}>
              <XAxis
                type="number"
                dataKey="downtime"
                name="Downtime"
                unit=" min"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="number"
                dataKey="resolution"
                name="Resolution"
                unit=" min"
                tickLine={false}
                axisLine={false}
              />
              <ZAxis type="number" dataKey="cost" range={[30, 220]} name="Cost" />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                formatter={(value: number, name) =>
                  name === "Cost" ? [formatCost(value), name] : [`${value} min`, name]
                }
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              {(["Critical", "High", "Medium", "Low"] as const).map((severity) => {
                const points = scatter.filter((p) => p.severity === severity);
                if (points.length === 0) return null;
                return (
                  <Scatter
                    key={severity}
                    name={severity}
                    data={points}
                    fill={SEVERITY_COLORS[severity]}
                    fillOpacity={0.65}
                    animationDuration={800}
                  />
                );
              })}
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <AskAIPanel />
    </div>
  );
}
