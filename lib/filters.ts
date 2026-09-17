import type { OperationFilters, OperationRecord } from "@/types/operations";

export const EMPTY_FILTERS: OperationFilters = {
  search: "",
  departments: [],
  severities: [],
  statuses: [],
  categories: [],
  locations: [],
  dateFrom: null,
  dateTo: null,
};

function matchesSearch(record: OperationRecord, term: string): boolean {
  if (!term) return true;
  const needle = term.toLowerCase();
  return [
    record.id,
    record.issueType,
    record.description,
    record.department,
    record.location,
    record.category,
    record.rootCause,
    record.resolvedBy,
    record.severity,
    record.status,
  ].some((field) => field.toLowerCase().includes(needle));
}

export function applyFilters(
  records: OperationRecord[],
  filters: OperationFilters,
): OperationRecord[] {
  return records.filter((record) => {
    if (!matchesSearch(record, filters.search)) return false;
    if (filters.departments.length && !filters.departments.includes(record.department))
      return false;
    if (filters.severities.length && !filters.severities.includes(record.severity))
      return false;
    if (filters.statuses.length && !filters.statuses.includes(record.status))
      return false;
    if (filters.categories.length && !filters.categories.includes(record.category))
      return false;
    if (filters.locations.length && !filters.locations.includes(record.location))
      return false;
    if (filters.dateFrom && record.date < filters.dateFrom) return false;
    if (filters.dateTo && record.date > filters.dateTo) return false;
    return true;
  });
}

export function countActiveFilters(filters: OperationFilters): number {
  return (
    (filters.search ? 1 : 0) +
    filters.departments.length +
    filters.severities.length +
    filters.statuses.length +
    filters.categories.length +
    filters.locations.length +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0)
  );
}

export function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Deterministic incident timeline derived from the record itself. */
export type TimelineState = "done" | "active" | "pending";

export interface TimelineStep {
  time: string;
  title: string;
  detail: string;
  state: TimelineState;
}

export function buildTimeline(record: OperationRecord): TimelineStep[] {
  const seedChar = record.id.charCodeAt(record.id.length - 1);
  const startMinutes = 6 * 60 + (seedChar % 10) * 42;
  const toClock = (offset: number) => {
    const total = (startMinutes + offset) % (24 * 60);
    const h = Math.floor(total / 60);
    const m = Math.floor(total % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const resolution = record.resolutionMinutes;
  const steps: TimelineStep[] = [
    {
      time: toClock(0),
      title: "Issue detected",
      detail: `${record.issueType} reported at ${record.location}.`,
      state: "done",
    },
    {
      time: toClock(Math.round(resolution * 0.08) + 4),
      title: "Supervisor notified",
      detail: `${record.department} shift supervisor acknowledged the incident.`,
      state: "done",
    },
    {
      time: toClock(Math.round(resolution * 0.22) + 9),
      title:
        record.resolvedBy === "Unassigned"
          ? "Awaiting assignment"
          : `Assigned to ${record.resolvedBy}`,
      detail:
        record.resolvedBy === "Unassigned"
          ? "No owner has picked up this incident yet."
          : `${record.category} response team dispatched.`,
      state: record.resolvedBy === "Unassigned" ? "pending" : "done",
    },
  ];

  if (record.downtimeMinutes > 0) {
    steps.push({
      time: toClock(Math.round(resolution * 0.45)),
      title: "Containment in place",
      detail: `${record.productionImpact} production impact recorded; ${record.downtimeMinutes} minutes of downtime logged.`,
      state: "done",
    });
  }

  if (record.status === "Resolved") {
    steps.push({
      time: toClock(resolution),
      title: "Issue resolved",
      detail: `Closed after ${record.resolutionMinutes} minutes. Root cause recorded as "${record.rootCause}".`,
      state: "done",
    });
  } else if (record.status === "Escalated") {
    steps.push({
      time: toClock(Math.round(resolution * 0.7)),
      title: "Escalated to operations lead",
      detail: "Incident exceeded the local response threshold and was escalated.",
      state: "active",
    });
    steps.push({
      time: "—",
      title: "Awaiting resolution",
      detail: "No closure recorded. This incident is still consuming capacity.",
      state: "pending",
    });
  } else if (record.status === "In Progress") {
    steps.push({
      time: toClock(Math.round(resolution * 0.6)),
      title: "Repair under way",
      detail: "Work is in progress against the assigned owner.",
      state: "active",
    });
  } else {
    steps.push({
      time: "—",
      title: "Pending action",
      detail: "Logged but not yet actioned. No owner assigned.",
      state: "pending",
    });
  }

  return steps;
}
