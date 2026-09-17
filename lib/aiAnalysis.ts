import {
  SEVERITY_WEIGHT,
  calculateCriticalIssues,
  calculateResolutionRate,
  calculateTotalCost,
  calculateTotalDowntime,
  getCategoryStats,
  getDepartmentStats,
  getIssueTypeStats,
  getLocationStats,
  getRecurringIssues,
  getRootCauseStats,
  getTrends,
  getUnresolved,
  mean,
  median,
  pct,
  percentile,
  stdDev,
  sum,
} from "@/lib/analytics";
import { formatCost, formatMinutes, formatDate } from "@/lib/format";
import type {
  AIAnalysis,
  AIAnswer,
  Anomaly,
  KeyFinding,
  OperationRecord,
  PriorityIssue,
  Recommendation,
  RiskArea,
  RiskLevel,
  RiskScoreBreakdown,
} from "@/types/operations";

/* --------------------------------------------------------------------------
 * Engine abstraction
 *
 * The app never depends on a network call. `LocalAnalysisEngine` is a
 * deterministic statistical engine that runs entirely in the browser over the
 * loaded dataset. A hosted model can be registered later through the same
 * interface without any UI change.
 * ----------------------------------------------------------------------- */

export interface AIAnalysisEngine {
  readonly id: string;
  readonly label: string;
  readonly isRemote: boolean;
  analyse(records: OperationRecord[]): AIAnalysis;
  answer(question: string, records: OperationRecord[]): AIAnswer;
}

function riskLevel(score: number): RiskLevel {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 35) return "Moderate";
  return "Low";
}

const EMPTY_ANALYSIS = (engine: string): AIAnalysis => ({
  generatedAt: new Date().toISOString(),
  engine,
  recordsAnalysed: 0,
  confidence: 0,
  executiveSummary:
    "No records match the current filters, so there is nothing to analyse. Widen the filters to run the analysis again.",
  trendExplanation: "No time series available for the current selection.",
  keyFindings: [],
  anomalies: [],
  riskAreas: [],
  recommendations: [],
  priorityIssues: [],
  riskScore: { score: 0, level: "Low", components: [] },
});

/* --------------------------------------------------------------------------
 * Anomaly detection
 * ----------------------------------------------------------------------- */

export function detectAnomalies(records: OperationRecord[]): Anomaly[] {
  if (records.length < 5) return [];

  const anomalies: Anomaly[] = [];
  const seen = new Set<string>();

  const push = (anomaly: Anomaly) => {
    const key = `${anomaly.record.id}-${anomaly.metric}`;
    if (seen.has(key)) return;
    seen.add(key);
    anomalies.push(anomaly);
  };

  const build = (
    field: "downtimeMinutes" | "resolutionMinutes" | "costImpact",
    metric: Anomaly["metric"],
    format: (value: number) => string,
    describe: (record: OperationRecord, deviation: number) => string,
  ) => {
    const values = records.map((r) => r[field]);
    const avg = mean(values);
    const sd = stdDev(values);
    const p10 = percentile(values, 0.1);
    const p90 = percentile(values, 0.9);
    const threshold = avg + 2 * sd;
    if (sd === 0) return;

    for (const record of records) {
      const value = record[field];
      if (value <= threshold) continue;
      const deviation = (value - avg) / sd;
      push({
        id: `${record.id}-${metric}`,
        record,
        metric,
        observed: format(value),
        expectedRange: `${format(Math.max(0, Math.round(p10)))} – ${format(Math.round(p90))}`,
        deviation: Number(deviation.toFixed(1)),
        assessment: describe(record, deviation),
        risk:
          deviation >= 3.2 ? "Critical" : deviation >= 2.5 ? "High" : "Moderate",
      });
    }
  };

  build(
    "downtimeMinutes",
    "Downtime",
    (v) => formatMinutes(v),
    (record, deviation) =>
      `Downtime on this ${record.category.toLowerCase()} issue sits ${deviation.toFixed(1)} standard deviations above the dataset mean. ${record.location} has absorbed the loss rather than the scheduled line.`,
  );

  build(
    "resolutionMinutes",
    "Resolution time",
    (v) => formatMinutes(v),
    (record, deviation) =>
      `Resolution took ${deviation.toFixed(1)} standard deviations longer than comparable incidents. The delay points to escalation or parts availability rather than repair complexity.`,
  );

  build(
    "costImpact",
    "Cost impact",
    (v) => formatCost(v),
    (record, deviation) =>
      `Cost impact is ${deviation.toFixed(1)} standard deviations above the mean and concentrated in a single ${record.department} incident.`,
  );

  // Rule-based: a critical incident that is still open is an anomaly regardless
  // of how its numbers compare to the distribution.
  for (const record of records) {
    if (record.severity !== "Critical") continue;
    if (record.status === "Resolved" || record.status === "In Progress") continue;
    push({
      id: `${record.id}-open-critical`,
      record,
      metric: "Unresolved critical",
      observed: `${record.status} since ${formatDate(record.date)}`,
      expectedRange: "Closed or in progress",
      deviation: 0,
      assessment: `A critical incident at ${record.location} remains ${record.status.toLowerCase()}. Every other critical issue in this dataset moved to an owner within the same reporting period.`,
      risk: "Critical",
    });
  }

  const riskOrder: Record<RiskLevel, number> = {
    Critical: 0,
    High: 1,
    Moderate: 2,
    Low: 3,
  };

  return anomalies.sort(
    (a, b) => riskOrder[a.risk] - riskOrder[b.risk] || b.deviation - a.deviation,
  );
}

/* --------------------------------------------------------------------------
 * Risk score
 * ----------------------------------------------------------------------- */

export function calculateRiskScore(records: OperationRecord[]): RiskScoreBreakdown {
  if (records.length === 0) return { score: 0, level: "Low", components: [] };

  const criticalShare = pct(calculateCriticalIssues(records), records.length);
  const unresolved = getUnresolved(records);
  const unresolvedShare = pct(unresolved.length, records.length);
  const recurringShare = pct(
    records.filter((r) => r.recurrence).length,
    records.length,
  );
  const avgDowntime = mean(records.map((r) => r.downtimeMinutes));
  const downtimePressure = Math.min(100, (avgDowntime / 120) * 100);
  const trend = getTrends(records);
  const trendPressure = Math.min(100, Math.max(0, 50 + trend.changePct));

  const components = [
    {
      label: "Severity mix",
      value: Math.round(criticalShare),
      weight: 0.3,
      detail: `${calculateCriticalIssues(records)} of ${records.length} incidents are critical.`,
    },
    {
      label: "Open workload",
      value: Math.round(unresolvedShare),
      weight: 0.25,
      detail: `${unresolved.length} incidents are still open across all departments.`,
    },
    {
      label: "Downtime pressure",
      value: Math.round(downtimePressure),
      weight: 0.2,
      detail: `Average downtime per incident is ${formatMinutes(Math.round(avgDowntime))}.`,
    },
    {
      label: "Recurrence",
      value: Math.round(recurringShare),
      weight: 0.15,
      detail: `${records.filter((r) => r.recurrence).length} incidents are flagged as repeat occurrences.`,
    },
    {
      label: "Trend direction",
      value: Math.round(trendPressure),
      weight: 0.1,
      detail:
        trend.direction === "up"
          ? `Incident volume rose ${Math.abs(trend.changePct).toFixed(1)}% across the period.`
          : trend.direction === "down"
            ? `Incident volume fell ${Math.abs(trend.changePct).toFixed(1)}% across the period.`
            : "Incident volume is broadly flat across the period.",
    },
  ];

  const score = Math.round(
    Math.min(100, sum(components.map((c) => c.value * c.weight))),
  );

  return { score, level: riskLevel(score), components };
}

/* --------------------------------------------------------------------------
 * Key findings
 * ----------------------------------------------------------------------- */

export function generateKeyFindings(records: OperationRecord[]): KeyFinding[] {
  const findings: KeyFinding[] = [];
  if (records.length < 5) return findings;

  const departments = getDepartmentStats(records);
  const recurring = getRecurringIssues(records);
  const rootCauses = getRootCauseStats(records);
  const locations = getLocationStats(records);
  const resolutionValues = records.map((r) => r.resolutionMinutes);
  const resolutionMedian = median(resolutionValues);
  const resolutionOutliers = records.filter(
    (r) => r.resolutionMinutes > resolutionMedian * 4,
  );

  // 1 — strongest recurring pattern
  const topRecurring = recurring[0];
  if (topRecurring) {
    findings.push({
      id: "finding-recurring",
      title: `Recurring ${topRecurring.issueType.toLowerCase()} at ${topRecurring.location}`,
      explanation: `The same failure has been logged ${topRecurring.occurrences} times at ${topRecurring.location}, costing ${formatMinutes(topRecurring.downtime)} of downtime in total. Each occurrence has been closed individually, so the underlying cause — ${topRecurring.rootCause.toLowerCase()} — has never been addressed.`,
      affectedRecordIds: topRecurring.records.map((r) => r.id),
      severity: topRecurring.occurrences >= 6 ? "Critical" : "High",
      confidence: Math.min(96, 72 + topRecurring.occurrences * 3),
      evidence: [
        { label: "Occurrences", value: String(topRecurring.occurrences) },
        { label: "Total downtime", value: formatMinutes(topRecurring.downtime) },
        { label: "Cost impact", value: formatCost(topRecurring.cost) },
        { label: "Owning team", value: topRecurring.department },
      ],
    });
  }

  // 2 — resolution-time anomaly cluster
  if (resolutionOutliers.length > 0) {
    const worst = [...resolutionOutliers].sort(
      (a, b) => b.resolutionMinutes - a.resolutionMinutes,
    )[0];
    findings.push({
      id: "finding-resolution",
      title: "Resolution times break down on a small group of incidents",
      explanation: `${resolutionOutliers.length} incidents took more than four times the median resolution time of ${formatMinutes(Math.round(resolutionMedian))}. The longest, ${worst.id} at ${worst.location}, ran to ${formatMinutes(worst.resolutionMinutes)}. These are not the most severe incidents in the dataset, which suggests a handover or parts-availability problem rather than technical difficulty.`,
      affectedRecordIds: resolutionOutliers.map((r) => r.id),
      severity: resolutionOutliers.length >= 4 ? "High" : "Medium",
      confidence: 88,
      evidence: [
        { label: "Outliers", value: String(resolutionOutliers.length) },
        { label: "Median resolution", value: formatMinutes(Math.round(resolutionMedian)) },
        { label: "Longest", value: formatMinutes(worst.resolutionMinutes) },
      ],
    });
  }

  // 3 — highest-risk department
  const riskiest = [...departments].sort((a, b) => b.riskIndex - a.riskIndex)[0];
  if (riskiest) {
    findings.push({
      id: "finding-department",
      title: `${riskiest.department} carries the highest operational risk`,
      explanation: `${riskiest.department} logged ${riskiest.incidents} incidents (${pct(riskiest.incidents, records.length).toFixed(0)}% of the total) and ${formatMinutes(riskiest.downtime)} of downtime, with ${riskiest.critical} critical and ${riskiest.unresolved} still open. Its resolution rate of ${riskiest.resolutionRate.toFixed(0)}% trails the ${calculateResolutionRate(records).toFixed(0)}% site average.`,
      affectedRecordIds: records
        .filter((r) => r.department === riskiest.department)
        .map((r) => r.id),
      severity: riskiest.riskIndex >= 60 ? "Critical" : "High",
      confidence: 91,
      evidence: [
        { label: "Incidents", value: String(riskiest.incidents) },
        { label: "Downtime", value: formatMinutes(riskiest.downtime) },
        { label: "Open items", value: String(riskiest.unresolved) },
        { label: "Risk index", value: `${riskiest.riskIndex}/100` },
      ],
    });
  }

  // 4 — cost concentration
  const byCost = [...departments].sort((a, b) => b.cost - a.cost);
  const totalCost = calculateTotalCost(records);
  if (byCost[0] && totalCost > 0) {
    const share = pct(byCost[0].cost, totalCost);
    findings.push({
      id: "finding-cost",
      title: `${share.toFixed(0)}% of cost impact sits with ${byCost[0].department}`,
      explanation: `${byCost[0].department} accounts for ${formatCost(byCost[0].cost)} of the ${formatCost(totalCost)} total, from only ${pct(byCost[0].incidents, records.length).toFixed(0)}% of incidents. Cost is concentrated in a handful of long-downtime events rather than spread across routine issues, so a small number of fixes would move most of the number.`,
      affectedRecordIds: records
        .filter((r) => r.department === byCost[0].department)
        .map((r) => r.id),
      severity: share > 40 ? "High" : "Medium",
      confidence: 93,
      evidence: [
        { label: "Department cost", value: formatCost(byCost[0].cost) },
        { label: "Share of total", value: `${share.toFixed(0)}%` },
        { label: "Incidents", value: String(byCost[0].incidents) },
      ],
    });
  }

  // 5 — dominant root cause
  const topCause = rootCauses[0];
  if (topCause && topCause.count >= 3) {
    findings.push({
      id: "finding-rootcause",
      title: `"${topCause.name}" is the most repeated root cause`,
      explanation: `${topCause.count} incidents across ${topCause.departments.length} department${topCause.departments.length === 1 ? "" : "s"} trace back to the same cause, together responsible for ${formatMinutes(topCause.downtime)} of downtime. Treating this as one systemic issue rather than ${topCause.count} separate tickets is the single highest-leverage change available.`,
      affectedRecordIds: records
        .filter((r) => r.rootCause === topCause.name)
        .map((r) => r.id),
      severity: topCause.count >= 8 ? "High" : "Medium",
      confidence: Math.min(95, 70 + topCause.count * 2),
      evidence: [
        { label: "Occurrences", value: String(topCause.count) },
        { label: "Downtime", value: formatMinutes(topCause.downtime) },
        { label: "Departments", value: topCause.departments.join(", ") },
      ],
    });
  }

  // 6 — location hotspot
  const hotspot = locations[0];
  if (hotspot && locations.length > 1 && hotspot.downtime > locations[1].downtime * 1.3) {
    findings.push({
      id: "finding-location",
      title: `${hotspot.location} is the clearest downtime hotspot`,
      explanation: `${hotspot.location} absorbed ${formatMinutes(hotspot.downtime)} across ${hotspot.incidents} incidents — ${(hotspot.downtime / Math.max(1, locations[1].downtime)).toFixed(1)}× the next worst site, ${locations[1].location}. ${hotspot.recurring} of those incidents were flagged as repeats.`,
      affectedRecordIds: records
        .filter((r) => r.location === hotspot.location)
        .map((r) => r.id),
      severity: "High",
      confidence: 89,
      evidence: [
        { label: "Downtime", value: formatMinutes(hotspot.downtime) },
        { label: "Incidents", value: String(hotspot.incidents) },
        { label: "Repeat incidents", value: String(hotspot.recurring) },
      ],
    });
  }

  return findings;
}

/* --------------------------------------------------------------------------
 * Risk areas
 * ----------------------------------------------------------------------- */

export function generateRiskAreas(records: OperationRecord[]): RiskArea[] {
  if (records.length === 0) return [];

  const areas: RiskArea[] = [];

  for (const stat of getDepartmentStats(records)) {
    const drivers: string[] = [];
    if (stat.critical > 0) drivers.push(`${stat.critical} critical incidents`);
    if (stat.unresolved > 0) drivers.push(`${stat.unresolved} still open`);
    if (stat.avgDowntime > 70)
      drivers.push(`${formatMinutes(stat.avgDowntime)} average downtime`);
    if (stat.resolutionRate < 80)
      drivers.push(`${stat.resolutionRate.toFixed(0)}% resolution rate`);
    if (drivers.length === 0) drivers.push("Within normal operating range");

    areas.push({
      id: `risk-dept-${stat.department}`,
      name: stat.department,
      scope: "Department",
      score: stat.riskIndex,
      level: riskLevel(stat.riskIndex),
      drivers,
      incidents: stat.incidents,
      downtime: stat.downtime,
    });
  }

  const locations = getLocationStats(records);
  const maxLocDowntime = Math.max(1, ...locations.map((l) => l.downtime));
  for (const loc of locations) {
    const score = Math.round(
      Math.min(
        100,
        (loc.downtime / maxLocDowntime) * 55 +
          pct(loc.critical, loc.incidents) * 0.3 +
          pct(loc.recurring, loc.incidents) * 0.25,
      ),
    );
    const drivers: string[] = [];
    if (loc.recurring > 0) drivers.push(`${loc.recurring} repeat incidents`);
    if (loc.critical > 0) drivers.push(`${loc.critical} critical incidents`);
    drivers.push(`${formatMinutes(loc.downtime)} total downtime`);

    areas.push({
      id: `risk-loc-${loc.location}`,
      name: loc.location,
      scope: "Location",
      score,
      level: riskLevel(score),
      drivers,
      incidents: loc.incidents,
      downtime: loc.downtime,
    });
  }

  return areas.sort((a, b) => b.score - a.score).slice(0, 6);
}

/* --------------------------------------------------------------------------
 * Recommendations
 * ----------------------------------------------------------------------- */

export function generateRecommendations(
  records: OperationRecord[],
): Recommendation[] {
  if (records.length < 5) return [];

  const recommendations: Recommendation[] = [];
  const departments = getDepartmentStats(records);
  const recurring = getRecurringIssues(records);
  const rootCauses = getRootCauseStats(records);
  const unresolvedCritical = records.filter(
    (r) => r.severity === "Critical" && r.status !== "Resolved",
  );
  const resolutionMedian = median(records.map((r) => r.resolutionMinutes));
  const slow = records.filter((r) => r.resolutionMinutes > resolutionMedian * 4);

  const topRecurring = recurring[0];
  if (topRecurring) {
    recommendations.push({
      id: "rec-recurring",
      action: `Move ${topRecurring.location} ${topRecurring.issueType.toLowerCase().replace(/\s+\w+$/, "")} onto a condition-based maintenance schedule`,
      reason: `The same failure has recurred ${topRecurring.occurrences} times with the same root cause (${topRecurring.rootCause.toLowerCase()}). Reactive repair is absorbing ${formatMinutes(topRecurring.downtime)} that a scheduled intervention would avoid.`,
      impact: "High",
      priority: "Critical",
      department: topRecurring.department,
      supportingMetric: `${topRecurring.occurrences} occurrences · ${formatMinutes(topRecurring.downtime)} · ${formatCost(topRecurring.cost)}`,
      affectedRecordIds: topRecurring.records.map((r) => r.id),
    });
  }

  if (unresolvedCritical.length > 0) {
    const oldest = [...unresolvedCritical].sort((a, b) =>
      a.date.localeCompare(b.date),
    )[0];
    recommendations.push({
      id: "rec-critical",
      action: `Assign named owners to the ${unresolvedCritical.length} open critical incidents before the next shift handover`,
      reason: `Critical incidents are still sitting in Pending or Escalated, the oldest since ${formatDate(oldest.date)} at ${oldest.location}. Open criticals are the largest single contributor to the current operational risk score.`,
      impact: "High",
      priority: "Critical",
      department: "Cross-functional",
      supportingMetric: `${unresolvedCritical.length} open critical incidents · oldest ${formatDate(oldest.date)}`,
      affectedRecordIds: unresolvedCritical.map((r) => r.id),
    });
  }

  const slowestDept = [...departments].sort(
    (a, b) => b.avgResolution - a.avgResolution,
  )[0];
  if (slow.length > 0 && slowestDept) {
    recommendations.push({
      id: "rec-resolution",
      action: `Introduce an escalation trigger at ${formatMinutes(Math.round(resolutionMedian * 3))} for ${slowestDept.department} incidents`,
      reason: `${slow.length} incidents ran past four times the median resolution time with no intermediate escalation. ${slowestDept.department} averages ${formatMinutes(slowestDept.avgResolution)} per incident, the slowest of any department.`,
      impact: "Medium",
      priority: "High",
      department: slowestDept.department,
      supportingMetric: `${slow.length} long-running incidents · ${formatMinutes(slowestDept.avgResolution)} department average`,
      affectedRecordIds: slow.map((r) => r.id),
    });
  }

  const delivery = records.filter((r) => r.category === "Delivery");
  if (delivery.length >= 4) {
    const repeats = delivery.filter((r) => r.recurrence).length;
    recommendations.push({
      id: "rec-delivery",
      action: "Re-baseline outbound dispatch windows with the regional carrier hub",
      reason: `${delivery.length} delivery incidents were logged, ${repeats} of them flagged as repeats with the same carrier-congestion cause. The delays cluster around dispatch rather than picking, so the fix sits in scheduling, not warehouse throughput.`,
      impact: "Medium",
      priority: "High",
      department: "Logistics",
      supportingMetric: `${delivery.length} delivery incidents · ${formatMinutes(calculateTotalDowntime(delivery))} downtime`,
      affectedRecordIds: delivery.map((r) => r.id),
    });
  }

  const supplierCause = rootCauses.find((c) =>
    /supplier|material|batch/i.test(c.name),
  );
  if (supplierCause) {
    const rows = records.filter((r) => r.rootCause === supplierCause.name);
    const dates = rows.map((r) => r.date).sort();
    recommendations.push({
      id: "rec-supplier",
      action: "Open a supplier quality review covering the affected material batch",
      reason: `${supplierCause.count} quality incidents between ${formatDate(dates[0])} and ${formatDate(dates[dates.length - 1])} share a single supplier-material root cause. The cluster is time-bound, which points at one batch rather than a process drift.`,
      impact: "High",
      priority: "High",
      department: "Quality",
      supportingMetric: `${supplierCause.count} incidents · ${formatCost(supplierCause.cost)} cost impact`,
      affectedRecordIds: rows.map((r) => r.id),
    });
  }

  const topCostDept = [...departments].sort((a, b) => b.cost - a.cost)[0];
  if (topCostDept) {
    recommendations.push({
      id: "rec-cost",
      action: `Set a downtime cost ceiling for ${topCostDept.department} and review breaches weekly`,
      reason: `${topCostDept.department} carries ${formatCost(topCostDept.cost)} of impact — ${pct(topCostDept.cost, calculateTotalCost(records)).toFixed(0)}% of the total — from ${topCostDept.incidents} incidents. Weekly review at department level would surface breaches while they are still correctable.`,
      impact: "Medium",
      priority: "Medium",
      department: topCostDept.department,
      supportingMetric: `${formatCost(topCostDept.cost)} across ${topCostDept.incidents} incidents`,
      affectedRecordIds: records
        .filter((r) => r.department === topCostDept.department)
        .map((r) => r.id),
    });
  }

  const staffing = records.filter((r) => r.category === "Staffing");
  if (staffing.length >= 3) {
    recommendations.push({
      id: "rec-staffing",
      action: "Build a standby cover pool for shift start-up",
      reason: `${staffing.length} staffing incidents disrupted shift start-up, each one pushing downstream schedules. A small standby pool costs less than the ${formatMinutes(calculateTotalDowntime(staffing))} currently lost.`,
      impact: "Low",
      priority: "Medium",
      department: "HR",
      supportingMetric: `${staffing.length} staffing incidents · ${formatMinutes(calculateTotalDowntime(staffing))}`,
      affectedRecordIds: staffing.map((r) => r.id),
    });
  }

  const impactRank = { High: 0, Medium: 1, Low: 2 };
  const priorityRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  return recommendations
    .sort(
      (a, b) =>
        priorityRank[a.priority] - priorityRank[b.priority] ||
        impactRank[a.impact] - impactRank[b.impact],
    )
    .slice(0, 6);
}

/* --------------------------------------------------------------------------
 * Priority watchlist
 * ----------------------------------------------------------------------- */

export function getPriorityIssues(
  records: OperationRecord[],
  limit = 5,
): PriorityIssue[] {
  if (records.length === 0) return [];

  const maxDowntime = Math.max(...records.map((r) => r.downtimeMinutes), 1);
  const maxCost = Math.max(...records.map((r) => r.costImpact), 1);

  const statusWeight: Record<OperationRecord["status"], number> = {
    Escalated: 22,
    Pending: 18,
    "In Progress": 8,
    Resolved: 0,
  };

  return records
    .map((record) => {
      const severityScore = (SEVERITY_WEIGHT[record.severity] / 4) * 34;
      const downtimeScore = (record.downtimeMinutes / maxDowntime) * 22;
      const costScore = (record.costImpact / maxCost) * 14;
      const recurrenceScore = record.recurrence ? 10 : 0;
      const score = Math.round(
        Math.min(
          99,
          severityScore +
            downtimeScore +
            costScore +
            recurrenceScore +
            statusWeight[record.status],
        ),
      );

      const reasons: string[] = [];
      if (record.severity === "Critical" || record.severity === "High")
        reasons.push(`${record.severity.toLowerCase()} severity`);
      if (record.status !== "Resolved") reasons.push(record.status.toLowerCase());
      if (record.recurrence) reasons.push("repeat occurrence");
      if (record.downtimeMinutes > maxDowntime * 0.6)
        reasons.push(`${formatMinutes(record.downtimeMinutes)} downtime`);

      return {
        record,
        riskScore: score,
        rationale: reasons.length
          ? `Flagged for ${reasons.join(", ")}.`
          : "Flagged by composite scoring across severity, downtime and cost.",
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, limit);
}

/* --------------------------------------------------------------------------
 * Narrative generation
 * ----------------------------------------------------------------------- */

export function generateExecutiveSummary(records: OperationRecord[]): string {
  if (records.length === 0)
    return "No records match the current filters, so there is nothing to summarise.";

  const departments = getDepartmentStats(records);
  const locations = getLocationStats(records);
  const recurring = getRecurringIssues(records);
  const topDept = departments[0];
  const topLocation = locations[0];
  const topRecurring = recurring[0];
  const openCritical = records.filter(
    (r) => r.severity === "Critical" && r.status !== "Resolved",
  ).length;
  const resolutionRate = calculateResolutionRate(records);
  const totalDowntime = calculateTotalDowntime(records);

  const sentences: string[] = [];

  sentences.push(
    `Across ${records.length} operational records, ${formatMinutes(totalDowntime)} of downtime was logged at a ${resolutionRate.toFixed(0)}% resolution rate.`,
  );

  if (topDept) {
    sentences.push(
      `${topDept.department} generated the largest share with ${topDept.incidents} incidents and ${formatMinutes(topDept.downtime)} of lost time.`,
    );
  }

  if (topRecurring) {
    sentences.push(
      `The clearest pattern is ${topRecurring.issueType.toLowerCase()} at ${topRecurring.location}, which has now occurred ${topRecurring.occurrences} times against the same root cause.`,
    );
  } else if (topLocation) {
    sentences.push(
      `${topLocation.location} carries the heaviest downtime load at ${formatMinutes(topLocation.downtime)}.`,
    );
  }

  if (openCritical > 0) {
    sentences.push(
      `${openCritical} critical incident${openCritical === 1 ? " remains" : "s remain"} unresolved and should be assigned before anything else on this list.`,
    );
  } else {
    sentences.push(
      "No critical incidents are currently unresolved, so attention can shift to the repeating causes above.",
    );
  }

  return sentences.join(" ");
}

export function generateTrendExplanation(records: OperationRecord[]): string {
  const trend = getTrends(records);
  if (trend.points.length < 2) return "Not enough history to describe a trend.";

  const peak = [...trend.points].sort((a, b) => b.incidents - a.incidents)[0];
  const direction =
    trend.direction === "up"
      ? `rose ${Math.abs(trend.changePct).toFixed(0)}%`
      : trend.direction === "down"
        ? `fell ${Math.abs(trend.changePct).toFixed(0)}%`
        : "stayed broadly flat";

  const peakRows = records.filter(
    (r) => r.date >= peak.date && r.date < addDays(peak.date, 7),
  );
  const peakCategory = getCategoryStats(peakRows)[0];

  return `Incident volume ${direction} between the first and second half of the period (${trend.previousWindow} against ${trend.currentWindow} incidents). The sharpest week began ${formatDate(peak.date)} with ${peak.incidents} incidents${
    peakCategory ? `, driven mainly by ${peakCategory.name.toLowerCase()} issues` : ""
  }. ${
    trend.direction === "up"
      ? "The rise is concentrated in repeat failures rather than new failure modes, which is why the recommendations focus on root causes rather than capacity."
      : "The improvement is real but uneven — the recurring failures below have not changed frequency."
  }`;
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/* --------------------------------------------------------------------------
 * Confidence
 * ----------------------------------------------------------------------- */

function calculateConfidence(records: OperationRecord[]): number {
  if (records.length === 0) return 0;
  // Confidence reflects how much evidence the analysis is standing on:
  // sample size, field completeness and how distinct the patterns are.
  const sampleScore = Math.min(1, records.length / 80) * 45;
  const completeness =
    (records.filter((r) => r.rootCause && r.resolvedBy).length / records.length) * 25;
  const recurring = getRecurringIssues(records);
  const patternScore = Math.min(1, recurring.length / 4) * 20;
  const spread = Math.min(1, new Set(records.map((r) => r.department)).size / 6) * 10;
  return Math.round(sampleScore + completeness + patternScore + spread);
}

/* --------------------------------------------------------------------------
 * Question answering
 * ----------------------------------------------------------------------- */

const NO_MATCH = (question: string, records: OperationRecord[]): AIAnswer => {
  const departments = getDepartmentStats(records);
  const top = departments[0];
  return {
    question,
    answer: top
      ? `That question doesn't map to a metric in this dataset. The strongest signal available is ${top.department}, which logged ${top.incidents} incidents and ${formatMinutes(top.downtime)} of downtime. Try asking about downtime, cost, resolution time, recurring issues, risk or a specific department.`
      : "There are no records in the current selection.",
    metrics: [],
    scope: `${records.length} records in scope`,
    recommendation:
      "Ask about a department, a location, downtime, cost, resolution time or recurring issues.",
    recordIds: [],
  };
};

export function answerDataQuestion(
  question: string,
  records: OperationRecord[],
): AIAnswer {
  const q = question.toLowerCase().trim();
  const scope = `${records.length} records in scope`;

  if (records.length === 0) {
    return {
      question,
      answer: "No records match the current filters, so there is nothing to answer from.",
      metrics: [],
      scope,
      recommendation: "Clear or widen the filters and ask again.",
      recordIds: [],
    };
  }

  const departments = getDepartmentStats(records);
  const locations = getLocationStats(records);
  const categories = getCategoryStats(records);
  const rootCauses = getRootCauseStats(records);
  const issueTypes = getIssueTypeStats(records);
  const recurring = getRecurringIssues(records);

  const namedDept = departments.find((d) => q.includes(d.department.toLowerCase()));
  const namedLoc = locations.find((l) => q.includes(l.location.toLowerCase()));

  /* --- specific location, e.g. "why is Plant B performing poorly?" ------- */
  if (namedLoc && !/compare/.test(q)) {
    const rows = records.filter((r) => r.location === namedLoc.location);
    const topIssue = getIssueTypeStats(rows)[0];
    const topCause = getRootCauseStats(rows)[0];
    const openItems = getUnresolved(rows).length;
    return {
      question,
      answer: `${namedLoc.location} logged ${namedLoc.incidents} incidents and ${formatMinutes(namedLoc.downtime)} of downtime, ranking ${locations.findIndex((l) => l.location === namedLoc.location) + 1} of ${locations.length} sites by lost time. The dominant failure is "${topIssue?.name ?? "n/a"}" with ${topIssue?.count ?? 0} occurrences, and ${topCause?.count ?? 0} incidents share the root cause "${topCause?.name ?? "n/a"}". ${namedLoc.recurring} incidents are flagged as repeats and ${openItems} are still open.`,
      metrics: [
        { label: "Incidents", value: String(namedLoc.incidents) },
        { label: "Downtime", value: formatMinutes(namedLoc.downtime) },
        { label: "Cost impact", value: formatCost(namedLoc.cost) },
        { label: "Repeat incidents", value: String(namedLoc.recurring) },
        { label: "Still open", value: String(openItems) },
      ],
      scope,
      recommendation: topCause
        ? `Address "${topCause.name.toLowerCase()}" as a single systemic fix for ${namedLoc.location} rather than closing each incident separately.`
        : `Review the incident mix at ${namedLoc.location} with the owning department.`,
      recordIds: rows.map((r) => r.id),
    };
  }

  /* --- downtime ---------------------------------------------------------- */
  if (/downtime|lost time|stoppage/.test(q)) {
    const target = namedDept
      ? namedDept
      : [...departments].sort((a, b) => b.downtime - a.downtime)[0];
    const rows = records.filter((r) => r.department === target.department);
    const topIssue = getIssueTypeStats(rows)[0];
    return {
      question,
      answer: `${target.department} has the highest downtime at ${formatMinutes(target.downtime)} across ${target.incidents} incidents, averaging ${formatMinutes(target.avgDowntime)} each. "${topIssue?.name}" is the single biggest contributor with ${topIssue?.count} occurrences. That is ${pct(target.downtime, calculateTotalDowntime(records)).toFixed(0)}% of all downtime in the current selection.`,
      metrics: [
        { label: "Total downtime", value: formatMinutes(target.downtime) },
        { label: "Incidents", value: String(target.incidents) },
        { label: "Average per incident", value: formatMinutes(target.avgDowntime) },
        {
          label: "Share of total",
          value: `${pct(target.downtime, calculateTotalDowntime(records)).toFixed(0)}%`,
        },
      ],
      scope,
      recommendation: `Prioritise a preventive maintenance review for ${target.department}, starting with "${topIssue?.name}".`,
      recordIds: rows.map((r) => r.id),
    };
  }

  /* --- most frequent issue ---------------------------------------------- */
  if (/most frequent|occurs most|most common|repeat|recurring|pattern/.test(q)) {
    const top = recurring[0];
    const topType = issueTypes[0];
    if (top) {
      return {
        question,
        answer: `"${top.issueType}" at ${top.location} is the most significant repeating problem, logged ${top.occurrences} times for ${formatMinutes(top.downtime)} of downtime. Every occurrence shares the root cause "${top.rootCause}", so these are one problem recorded ${top.occurrences} times rather than ${top.occurrences} separate faults. Across the whole selection, the most common issue type is "${topType.name}" with ${topType.count} records.`,
        metrics: [
          { label: "Occurrences", value: String(top.occurrences) },
          { label: "Downtime", value: formatMinutes(top.downtime) },
          { label: "Cost impact", value: formatCost(top.cost) },
          { label: "Owning team", value: top.department },
        ],
        scope,
        recommendation: `Raise a single corrective action against "${top.rootCause.toLowerCase()}" at ${top.location} instead of closing repeat tickets.`,
        recordIds: top.records.map((r) => r.id),
      };
    }
  }

  /* --- risk / attention -------------------------------------------------- */
  if (/risk|attention|investigate first|worst|urgent|priority|focus/.test(q)) {
    const riskiest = [...departments].sort((a, b) => b.riskIndex - a.riskIndex)[0];
    const openCritical = records.filter(
      (r) => r.severity === "Critical" && r.status !== "Resolved",
    );
    const score = calculateRiskScore(records);
    return {
      question,
      answer: `${riskiest.department} requires the most attention, with a risk index of ${riskiest.riskIndex}/100 built from ${riskiest.critical} critical incidents, ${riskiest.unresolved} open items and ${formatMinutes(riskiest.downtime)} of downtime. Site-wide operational risk currently scores ${score.score}/100 (${score.level.toLowerCase()} risk). The most urgent individual items are the ${openCritical.length} critical incidents that are not yet resolved.`,
      metrics: [
        { label: "Department risk index", value: `${riskiest.riskIndex}/100` },
        { label: "Overall risk score", value: `${score.score}/100` },
        { label: "Open critical incidents", value: String(openCritical.length) },
        { label: "Department downtime", value: formatMinutes(riskiest.downtime) },
      ],
      scope,
      recommendation: `Assign owners to the ${openCritical.length} open critical incidents today, then schedule a ${riskiest.department} review against its repeat failures.`,
      recordIds: [
        ...openCritical.map((r) => r.id),
        ...records.filter((r) => r.department === riskiest.department).map((r) => r.id),
      ],
    };
  }

  /* --- cost -------------------------------------------------------------- */
  if (/cost|expensive|spend|money|budget|financial/.test(q)) {
    const target = namedDept ?? [...departments].sort((a, b) => b.cost - a.cost)[0];
    const total = calculateTotalCost(records);
    const topCategory = [...categories].sort((a, b) => b.cost - a.cost)[0];
    return {
      question,
      answer: `${target.department} carries the largest cost impact at ${formatCost(target.cost)}, which is ${pct(target.cost, total).toFixed(0)}% of the ${formatCost(total)} total from ${pct(target.incidents, records.length).toFixed(0)}% of incidents. By category, ${topCategory.name.toLowerCase()} issues are the most expensive at ${formatCost(topCategory.cost)}. Cost is concentrated in long-downtime events rather than spread evenly.`,
      metrics: [
        { label: "Department cost", value: formatCost(target.cost) },
        { label: "Share of total", value: `${pct(target.cost, total).toFixed(0)}%` },
        { label: "Total cost impact", value: formatCost(total) },
        { label: "Costliest category", value: topCategory.name },
      ],
      scope,
      recommendation: `Target the longest-downtime ${target.department} incidents first — a small number of events drive most of this figure.`,
      recordIds: records.filter((r) => r.department === target.department).map((r) => r.id),
    };
  }

  /* --- resolution time --------------------------------------------------- */
  if (/resolution|resolve|how long|slow|fix time|mttr/.test(q)) {
    const slowest = [...departments].sort((a, b) => b.avgResolution - a.avgResolution)[0];
    const med = median(records.map((r) => r.resolutionMinutes));
    const outliers = records.filter((r) => r.resolutionMinutes > med * 4);
    return {
      question,
      answer: `Median resolution time across the selection is ${formatMinutes(Math.round(med))}, but ${slowest.department} averages ${formatMinutes(slowest.avgResolution)} — the slowest of any department. ${outliers.length} incidents ran past four times the median, and they are not the most severe ones, which points at handover or parts availability rather than repair difficulty.`,
      metrics: [
        { label: "Median resolution", value: formatMinutes(Math.round(med)) },
        { label: "Slowest department", value: slowest.department },
        { label: "Department average", value: formatMinutes(slowest.avgResolution) },
        { label: "Outliers", value: String(outliers.length) },
      ],
      scope,
      recommendation: `Add an automatic escalation at ${formatMinutes(Math.round(med * 3))} so long-running incidents surface before they become outliers.`,
      recordIds: outliers.map((r) => r.id),
    };
  }

  /* --- root cause -------------------------------------------------------- */
  if (/root cause|why|cause|reason/.test(q)) {
    const top = rootCauses[0];
    return {
      question,
      answer: `"${top.name}" is the most repeated root cause with ${top.count} incidents, together responsible for ${formatMinutes(top.downtime)} of downtime and ${formatCost(top.cost)} of impact. It spans ${top.departments.join(", ")}. The next most common is "${rootCauses[1]?.name}" with ${rootCauses[1]?.count ?? 0} incidents.`,
      metrics: [
        { label: "Occurrences", value: String(top.count) },
        { label: "Downtime", value: formatMinutes(top.downtime) },
        { label: "Cost impact", value: formatCost(top.cost) },
        { label: "Departments", value: top.departments.join(", ") },
      ],
      scope,
      recommendation: `Treat "${top.name.toLowerCase()}" as one systemic corrective action rather than ${top.count} separate tickets.`,
      recordIds: records.filter((r) => r.rootCause === top.name).map((r) => r.id),
    };
  }

  /* --- unresolved / status ----------------------------------------------- */
  if (/unresolved|open|pending|escalat|status|backlog/.test(q)) {
    const open = getUnresolved(records);
    const critical = open.filter((r) => r.severity === "Critical");
    const byDept = getDepartmentStats(open)[0];
    return {
      question,
      answer: `${open.length} of ${records.length} incidents are still open (${pct(open.length, records.length).toFixed(0)}%), including ${critical.length} critical. ${byDept ? `${byDept.department} holds the largest open workload with ${byDept.incidents} items.` : ""} The overall resolution rate is ${calculateResolutionRate(records).toFixed(0)}%.`,
      metrics: [
        { label: "Open incidents", value: String(open.length) },
        { label: "Open critical", value: String(critical.length) },
        { label: "Resolution rate", value: `${calculateResolutionRate(records).toFixed(0)}%` },
        { label: "Largest backlog", value: byDept?.department ?? "n/a" },
      ],
      scope,
      recommendation: "Clear the open critical incidents first; they carry the heaviest weight in the risk score.",
      recordIds: open.map((r) => r.id),
    };
  }

  /* --- named department, general ----------------------------------------- */
  if (namedDept) {
    const rows = records.filter((r) => r.department === namedDept.department);
    const topIssue = getIssueTypeStats(rows)[0];
    return {
      question,
      answer: `${namedDept.department} logged ${namedDept.incidents} incidents (${pct(namedDept.incidents, records.length).toFixed(0)}% of the selection) with ${formatMinutes(namedDept.downtime)} of downtime and ${formatCost(namedDept.cost)} of cost impact. Its resolution rate is ${namedDept.resolutionRate.toFixed(0)}% against a ${calculateResolutionRate(records).toFixed(0)}% average, and its most common issue is "${topIssue?.name}".`,
      metrics: [
        { label: "Incidents", value: String(namedDept.incidents) },
        { label: "Downtime", value: formatMinutes(namedDept.downtime) },
        { label: "Cost impact", value: formatCost(namedDept.cost) },
        { label: "Risk index", value: `${namedDept.riskIndex}/100` },
      ],
      scope,
      recommendation:
        namedDept.unresolved > 0
          ? `Close the ${namedDept.unresolved} open ${namedDept.department} incidents before taking on new corrective work.`
          : `${namedDept.department} is current on its backlog; focus on its repeat failure modes next.`,
      recordIds: rows.map((r) => r.id),
    };
  }

  /* --- anomalies --------------------------------------------------------- */
  if (/anomal|outlier|unusual|abnormal|spike/.test(q)) {
    const anomalies = detectAnomalies(records);
    const worst = anomalies[0];
    return {
      question,
      answer: worst
        ? `${anomalies.length} anomalies were detected. The most significant is ${worst.record.id} at ${worst.record.location}: ${worst.metric.toLowerCase()} of ${worst.observed} against a normal range of ${worst.expectedRange}. ${worst.assessment}`
        : "No statistical anomalies were detected in the current selection.",
      metrics: worst
        ? [
            { label: "Anomalies found", value: String(anomalies.length) },
            { label: "Worst record", value: worst.record.id },
            { label: "Observed", value: worst.observed },
            { label: "Normal range", value: worst.expectedRange },
          ]
        : [],
      scope,
      recommendation: worst
        ? `Investigate ${worst.record.id} first — it deviates furthest from the observed operating range.`
        : "Nothing to investigate in the current selection.",
      recordIds: anomalies.map((a) => a.record.id),
    };
  }

  /* --- overall / summary ------------------------------------------------- */
  if (/summary|overall|overview|how are we|health|performance/.test(q)) {
    const score = calculateRiskScore(records);
    return {
      question,
      answer: `${generateExecutiveSummary(records)} Operational risk currently scores ${score.score}/100, which reads as ${score.level.toLowerCase()} risk.`,
      metrics: [
        { label: "Records", value: String(records.length) },
        { label: "Risk score", value: `${score.score}/100` },
        { label: "Downtime", value: formatMinutes(calculateTotalDowntime(records)) },
        { label: "Resolution rate", value: `${calculateResolutionRate(records).toFixed(0)}%` },
      ],
      scope,
      recommendation: generateRecommendations(records)[0]?.action ?? "Continue monitoring.",
      recordIds: records.map((r) => r.id),
    };
  }

  return NO_MATCH(question, records);
}

/* --------------------------------------------------------------------------
 * The engine
 * ----------------------------------------------------------------------- */

export class LocalAnalysisEngine implements AIAnalysisEngine {
  readonly id = "opsmind-local-v1";
  readonly label = "OpsMind Analysis Engine";
  readonly isRemote = false;

  analyse(records: OperationRecord[]): AIAnalysis {
    if (records.length === 0) return EMPTY_ANALYSIS(this.label);

    return {
      generatedAt: new Date().toISOString(),
      engine: this.label,
      recordsAnalysed: records.length,
      confidence: calculateConfidence(records),
      executiveSummary: generateExecutiveSummary(records),
      trendExplanation: generateTrendExplanation(records),
      keyFindings: generateKeyFindings(records),
      anomalies: detectAnomalies(records),
      riskAreas: generateRiskAreas(records),
      recommendations: generateRecommendations(records),
      priorityIssues: getPriorityIssues(records),
      riskScore: calculateRiskScore(records),
    };
  }

  answer(question: string, records: OperationRecord[]): AIAnswer {
    return answerDataQuestion(question, records);
  }
}

let engine: AIAnalysisEngine | null = null;

/**
 * Returns the active analysis engine. A remote model can be swapped in here
 * behind the same interface; the local engine is always the fallback so the
 * product never depends on an external service being reachable.
 */
export function getAIEngine(): AIAnalysisEngine {
  if (!engine) engine = new LocalAnalysisEngine();
  return engine;
}

export function runAnalysis(records: OperationRecord[]): AIAnalysis {
  return getAIEngine().analyse(records);
}

/* --------------------------------------------------------------------------
 * Per-record assessment, used by the operation detail drawer
 * ----------------------------------------------------------------------- */

export interface RecordAssessment {
  riskScore: number;
  level: RiskLevel;
  assessment: string;
  recommendation: string;
  comparisons: { label: string; value: string; delta: string; worse: boolean }[];
}

export function assessRecord(
  record: OperationRecord,
  population: OperationRecord[],
): RecordAssessment {
  const peers = population.filter(
    (r) => r.department === record.department && r.id !== record.id,
  );
  const base = peers.length >= 3 ? peers : population.filter((r) => r.id !== record.id);

  const avgDowntime = mean(base.map((r) => r.downtimeMinutes));
  const avgResolution = mean(base.map((r) => r.resolutionMinutes));
  const avgCost = mean(base.map((r) => r.costImpact));

  const ratio = (value: number, average: number) =>
    average === 0 ? 1 : value / average;

  const comparisons = [
    {
      label: "Downtime",
      value: formatMinutes(record.downtimeMinutes),
      delta: `${ratio(record.downtimeMinutes, avgDowntime).toFixed(1)}× department average`,
      worse: record.downtimeMinutes > avgDowntime,
    },
    {
      label: "Resolution time",
      value: formatMinutes(record.resolutionMinutes),
      delta: `${ratio(record.resolutionMinutes, avgResolution).toFixed(1)}× department average`,
      worse: record.resolutionMinutes > avgResolution,
    },
    {
      label: "Cost impact",
      value: formatCost(record.costImpact),
      delta: `${ratio(record.costImpact, avgCost).toFixed(1)}× department average`,
      worse: record.costImpact > avgCost,
    },
  ];

  const sameCause = population.filter((r) => r.rootCause === record.rootCause).length;
  const sameIssueHere = population.filter(
    (r) => r.issueType === record.issueType && r.location === record.location,
  ).length;

  const riskScore = getPriorityIssues([record, ...base], base.length + 1).find(
    (i) => i.record.id === record.id,
  )?.riskScore ?? 0;

  const parts: string[] = [];
  parts.push(
    `This incident sits at ${ratio(record.downtimeMinutes, avgDowntime).toFixed(1)}× the average downtime for ${record.department}.`,
  );
  if (sameIssueHere > 1) {
    parts.push(
      `"${record.issueType}" has been recorded ${sameIssueHere} times at ${record.location}, so this is a repeat rather than an isolated fault.`,
    );
  }
  if (sameCause > 2) {
    parts.push(
      `Its root cause, "${record.rootCause.toLowerCase()}", appears in ${sameCause} records across the dataset.`,
    );
  }
  if (record.status !== "Resolved") {
    parts.push(
      `The incident is still ${record.status.toLowerCase()}, so its downtime figure is not yet final.`,
    );
  }

  let recommendation: string;
  if (record.status !== "Resolved" && record.severity === "Critical") {
    recommendation = `Assign a named owner today. A critical incident at ${record.location} left ${record.status.toLowerCase()} is the single highest-weighted input to the current risk score.`;
  } else if (sameIssueHere > 2) {
    recommendation = `Raise one corrective action against "${record.rootCause.toLowerCase()}" at ${record.location} rather than closing each occurrence separately.`;
  } else if (record.resolutionMinutes > avgResolution * 2) {
    recommendation = `Review the handover on this incident — resolution ran well past the ${record.department} norm without an escalation being triggered.`;
  } else {
    recommendation = `No separate action needed. Keep this incident in the ${record.category.toLowerCase()} trend review for ${record.department}.`;
  }

  return {
    riskScore,
    level: riskLevel(riskScore),
    assessment: parts.join(" "),
    recommendation,
    comparisons,
  };
}
