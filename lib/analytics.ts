import type {
  Category,
  CategoryStat,
  CountStat,
  Department,
  DepartmentStat,
  LocationStat,
  OperationLocation,
  OperationRecord,
  RootCauseStat,
  Severity,
  Status,
  StatusTrendPoint,
  TrendPoint,
  TrendSummary,
  KpiSummary,
} from "@/types/operations";

export const DEPARTMENTS: Department[] = [
  "Production",
  "Quality",
  "Maintenance",
  "Logistics",
  "IT",
  "HR",
];

export const LOCATIONS: OperationLocation[] = [
  "Plant A",
  "Plant B",
  "Warehouse A",
  "Warehouse B",
  "Office",
];

export const CATEGORIES: Category[] = [
  "Machine",
  "Quality",
  "Safety",
  "Delivery",
  "System",
  "Staffing",
  "Maintenance",
  "Process",
];

export const SEVERITIES: Severity[] = ["Critical", "High", "Medium", "Low"];
export const STATUSES: Status[] = ["Resolved", "In Progress", "Pending", "Escalated"];

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

const OPEN_STATUSES: Status[] = ["In Progress", "Pending", "Escalated"];

/* --------------------------------------------------------------------------
 * Small numeric helpers
 * ----------------------------------------------------------------------- */

export const sum = (values: number[]): number =>
  values.reduce((total, value) => total + value, 0);

export const mean = (values: number[]): number =>
  values.length === 0 ? 0 : sum(values) / values.length;

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - avg) ** 2)));
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export const median = (values: number[]): number => percentile(values, 0.5);

export const pct = (part: number, whole: number): number =>
  whole === 0 ? 0 : (part / whole) * 100;

function changePct(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

/* --------------------------------------------------------------------------
 * KPI calculations
 * ----------------------------------------------------------------------- */

export const calculateTotalIncidents = (records: OperationRecord[]): number =>
  records.length;

export const calculateCriticalIssues = (records: OperationRecord[]): number =>
  records.filter((r) => r.severity === "Critical").length;

export const calculateResolutionRate = (records: OperationRecord[]): number =>
  pct(records.filter((r) => r.status === "Resolved").length, records.length);

export const calculateTotalDowntime = (records: OperationRecord[]): number =>
  sum(records.map((r) => r.downtimeMinutes));

export const calculateTotalCost = (records: OperationRecord[]): number =>
  sum(records.map((r) => r.costImpact));

export const calculateAvgResolution = (records: OperationRecord[]): number =>
  mean(records.map((r) => r.resolutionMinutes));

export const getUnresolved = (records: OperationRecord[]): OperationRecord[] =>
  records.filter((r) => OPEN_STATUSES.includes(r.status));

/** Splits the dataset in half by date so "vs previous period" is real, not invented. */
function splitByPeriod(records: OperationRecord[]) {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return { current: [], previous: [] };
  const first = new Date(sorted[0].date).getTime();
  const last = new Date(sorted[sorted.length - 1].date).getTime();
  const midpoint = first + (last - first) / 2;
  return {
    previous: sorted.filter((r) => new Date(r.date).getTime() < midpoint),
    current: sorted.filter((r) => new Date(r.date).getTime() >= midpoint),
  };
}

export function calculateKpis(records: OperationRecord[]): KpiSummary {
  const { current, previous } = splitByPeriod(records);
  return {
    totalIncidents: calculateTotalIncidents(records),
    criticalIssues: calculateCriticalIssues(records),
    resolutionRate: calculateResolutionRate(records),
    totalDowntime: calculateTotalDowntime(records),
    totalCost: calculateTotalCost(records),
    avgResolution: calculateAvgResolution(records),
    deltas: {
      incidents: changePct(current.length, previous.length),
      critical: changePct(
        calculateCriticalIssues(current),
        calculateCriticalIssues(previous),
      ),
      resolutionRate:
        calculateResolutionRate(current) - calculateResolutionRate(previous),
      downtime: changePct(
        calculateTotalDowntime(current),
        calculateTotalDowntime(previous),
      ),
    },
  };
}

/* --------------------------------------------------------------------------
 * Grouped statistics
 * ----------------------------------------------------------------------- */

export function getDepartmentStats(records: OperationRecord[]): DepartmentStat[] {
  const present = DEPARTMENTS.filter((d) => records.some((r) => r.department === d));
  const maxDowntime = Math.max(
    1,
    ...present.map((d) =>
      calculateTotalDowntime(records.filter((r) => r.department === d)),
    ),
  );

  return present
    .map((department) => {
      const rows = records.filter((r) => r.department === department);
      const downtime = calculateTotalDowntime(rows);
      const critical = rows.filter((r) => r.severity === "Critical").length;
      const unresolved = getUnresolved(rows).length;
      const resolutionRate = calculateResolutionRate(rows);

      // Risk index blends volume pressure, severity mix and open workload.
      const downtimeScore = (downtime / maxDowntime) * 45;
      const severityScore = pct(critical, rows.length) * 0.3;
      const openScore = pct(unresolved, rows.length) * 0.25;
      const recurrenceScore = pct(rows.filter((r) => r.recurrence).length, rows.length) * 0.2;

      return {
        department,
        incidents: rows.length,
        downtime,
        avgDowntime: Math.round(mean(rows.map((r) => r.downtimeMinutes))),
        avgResolution: Math.round(mean(rows.map((r) => r.resolutionMinutes))),
        cost: calculateTotalCost(rows),
        critical,
        unresolved,
        resolutionRate,
        riskIndex: Math.round(
          Math.min(100, downtimeScore + severityScore + openScore + recurrenceScore),
        ),
      };
    })
    .sort((a, b) => b.incidents - a.incidents);
}

export function getLocationStats(records: OperationRecord[]): LocationStat[] {
  return LOCATIONS.filter((l) => records.some((r) => r.location === l))
    .map((location) => {
      const rows = records.filter((r) => r.location === location);
      return {
        location,
        incidents: rows.length,
        downtime: calculateTotalDowntime(rows),
        cost: calculateTotalCost(rows),
        critical: rows.filter((r) => r.severity === "Critical").length,
        recurring: rows.filter((r) => r.recurrence).length,
      };
    })
    .sort((a, b) => b.downtime - a.downtime);
}

export function getSeverityStats(records: OperationRecord[]): CountStat[] {
  return SEVERITIES.map((name) => ({
    name,
    count: records.filter((r) => r.severity === name).length,
  })).filter((s) => s.count > 0);
}

export function getStatusStats(records: OperationRecord[]): CountStat[] {
  return STATUSES.map((name) => ({
    name,
    count: records.filter((r) => r.status === name).length,
  })).filter((s) => s.count > 0);
}

export function getCategoryStats(records: OperationRecord[]): CategoryStat[] {
  return CATEGORIES.map((name) => {
    const rows = records.filter((r) => r.category === name);
    return {
      name,
      count: rows.length,
      downtime: calculateTotalDowntime(rows),
      cost: calculateTotalCost(rows),
      avgResolution: Math.round(mean(rows.map((r) => r.resolutionMinutes))),
    };
  })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function getRootCauseStats(records: OperationRecord[]): RootCauseStat[] {
  const map = new Map<string, OperationRecord[]>();
  for (const record of records) {
    const bucket = map.get(record.rootCause);
    if (bucket) bucket.push(record);
    else map.set(record.rootCause, [record]);
  }
  return [...map.entries()]
    .map(([name, rows]) => ({
      name,
      count: rows.length,
      downtime: calculateTotalDowntime(rows),
      cost: calculateTotalCost(rows),
      departments: [...new Set(rows.map((r) => r.department))],
    }))
    .sort((a, b) => b.count - a.count);
}

export function getIssueTypeStats(records: OperationRecord[]): CountStat[] {
  const map = new Map<string, number>();
  for (const record of records) {
    map.set(record.issueType, (map.get(record.issueType) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/* --------------------------------------------------------------------------
 * Time series
 * ----------------------------------------------------------------------- */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function weekStart(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  const day = date.getUTCDay();
  const diff = (day + 6) % 7; // week starts Monday
  date.setUTCDate(date.getUTCDate() - diff);
  return date.toISOString().slice(0, 10);
}

export function formatWeekLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function getTrends(records: OperationRecord[]): TrendSummary {
  if (records.length === 0) {
    return {
      points: [],
      currentWindow: 0,
      previousWindow: 0,
      changePct: 0,
      direction: "flat",
    };
  }

  const buckets = new Map<string, OperationRecord[]>();
  for (const record of records) {
    const key = weekStart(record.date);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(record);
    else buckets.set(key, [record]);
  }

  const keys = [...buckets.keys()].sort();
  const firstKey = keys[0];
  const lastKey = keys[keys.length - 1];
  const points: TrendPoint[] = [];

  for (
    let t = new Date(`${firstKey}T00:00:00Z`).getTime();
    t <= new Date(`${lastKey}T00:00:00Z`).getTime();
    t += WEEK_MS
  ) {
    const key = new Date(t).toISOString().slice(0, 10);
    const rows = buckets.get(key) ?? [];
    points.push({
      date: key,
      label: formatWeekLabel(key),
      incidents: rows.length,
      critical: rows.filter((r) => r.severity === "Critical").length,
      downtime: calculateTotalDowntime(rows),
    });
  }

  const half = Math.floor(points.length / 2) || 1;
  const previousWindow = sum(points.slice(0, half).map((p) => p.incidents));
  const currentWindow = sum(points.slice(-half).map((p) => p.incidents));
  const delta = changePct(currentWindow, previousWindow);

  return {
    points,
    currentWindow,
    previousWindow,
    changePct: delta,
    direction: delta > 3 ? "up" : delta < -3 ? "down" : "flat",
  };
}

export function getStatusTrend(records: OperationRecord[]): StatusTrendPoint[] {
  return getTrends(records).points.map((point) => {
    const rows = records.filter((r) => weekStart(r.date) === point.date);
    return {
      label: point.label,
      Resolved: rows.filter((r) => r.status === "Resolved").length,
      "In Progress": rows.filter((r) => r.status === "In Progress").length,
      Pending: rows.filter((r) => r.status === "Pending").length,
      Escalated: rows.filter((r) => r.status === "Escalated").length,
    };
  });
}

/** Buckets resolution time so the distribution chart shows shape, not 100 bars. */
export function getResolutionDistribution(records: OperationRecord[]): CountStat[] {
  const buckets: { name: string; test: (m: number) => boolean }[] = [
    { name: "< 1h", test: (m) => m < 60 },
    { name: "1–3h", test: (m) => m >= 60 && m < 180 },
    { name: "3–6h", test: (m) => m >= 180 && m < 360 },
    { name: "6–12h", test: (m) => m >= 360 && m < 720 },
    { name: "12h+", test: (m) => m >= 720 },
  ];
  return buckets.map((bucket) => ({
    name: bucket.name,
    count: records.filter((r) => bucket.test(r.resolutionMinutes)).length,
  }));
}

export function getSeverityResolutionStats(records: OperationRecord[]) {
  return SEVERITIES.filter((s) => records.some((r) => r.severity === s)).map(
    (severity) => {
      const rows = records.filter((r) => r.severity === severity);
      return {
        severity,
        avgResolution: Math.round(mean(rows.map((r) => r.resolutionMinutes))),
        medianResolution: Math.round(median(rows.map((r) => r.resolutionMinutes))),
        incidents: rows.length,
      };
    },
  );
}

/** Points for the downtime-vs-resolution scatter, coloured by severity. */
export function getScatterPoints(records: OperationRecord[]) {
  return records.map((r) => ({
    id: r.id,
    downtime: r.downtimeMinutes,
    resolution: r.resolutionMinutes,
    cost: r.costImpact,
    severity: r.severity,
    issueType: r.issueType,
    department: r.department,
  }));
}

export function getRecurringIssues(records: OperationRecord[]) {
  const map = new Map<string, OperationRecord[]>();
  for (const record of records) {
    const key = `${record.issueType}::${record.location}`;
    const bucket = map.get(key);
    if (bucket) bucket.push(record);
    else map.set(key, [record]);
  }
  return [...map.values()]
    .filter((rows) => rows.length >= 3)
    .map((rows) => ({
      issueType: rows[0].issueType,
      location: rows[0].location,
      department: rows[0].department,
      occurrences: rows.length,
      downtime: calculateTotalDowntime(rows),
      cost: calculateTotalCost(rows),
      rootCause: rows[0].rootCause,
      records: rows.sort((a, b) => a.date.localeCompare(b.date)),
    }))
    .sort((a, b) => b.downtime - a.downtime);
}
