import type { Priority, RiskLevel, Severity, Status } from "@/types/operations";

export function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes)) return "—";
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} min`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (hours < 24) return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours === 0 ? `${days}d` : `${days}d ${restHours}h`;
}

export function formatCost(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${Math.round(value)}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatShortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function formatDelta(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

/* --------------------------------------------------------------------------
 * Status colour tokens — used consistently everywhere
 * ----------------------------------------------------------------------- */

export const SEVERITY_COLORS: Record<Severity, string> = {
  Critical: "#dc2626",
  High: "#ea580c",
  Medium: "#ca8a04",
  Low: "#16a34a",
};

export const STATUS_COLORS: Record<Status, string> = {
  Resolved: "#16a34a",
  "In Progress": "#2563eb",
  Pending: "#ca8a04",
  Escalated: "#dc2626",
};

export const CHART_PALETTE = [
  "#4f46e5",
  "#0891b2",
  "#7c3aed",
  "#0d9488",
  "#c026d3",
  "#2563eb",
  "#db2777",
  "#059669",
];

export const severityBadge: Record<Severity, string> = {
  Critical: "bg-red-50 text-red-700 ring-red-600/20",
  High: "bg-orange-50 text-orange-700 ring-orange-600/20",
  Medium: "bg-amber-50 text-amber-800 ring-amber-600/20",
  Low: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

export const statusBadge: Record<Status, string> = {
  Resolved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "In Progress": "bg-blue-50 text-blue-700 ring-blue-600/20",
  Pending: "bg-amber-50 text-amber-800 ring-amber-600/20",
  Escalated: "bg-red-50 text-red-700 ring-red-600/20",
};

export const priorityBadge: Record<Priority, string> = severityBadge;

export const riskBadge: Record<RiskLevel, string> = {
  Critical: "bg-red-50 text-red-700 ring-red-600/20",
  High: "bg-orange-50 text-orange-700 ring-orange-600/20",
  Moderate: "bg-amber-50 text-amber-800 ring-amber-600/20",
  Low: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
