export type Department =
  | "Production"
  | "Quality"
  | "Maintenance"
  | "Logistics"
  | "IT"
  | "HR";

export type OperationLocation =
  | "Plant A"
  | "Plant B"
  | "Warehouse A"
  | "Warehouse B"
  | "Office";

export type Category =
  | "Machine"
  | "Quality"
  | "Safety"
  | "Delivery"
  | "System"
  | "Staffing"
  | "Maintenance"
  | "Process";

export type Severity = "Critical" | "High" | "Medium" | "Low";
export type Status = "Resolved" | "In Progress" | "Pending" | "Escalated";
export type Priority = Severity;
export type ProductionImpact = "Severe" | "High" | "Moderate" | "Low" | "None";

export interface OperationRecord {
  id: string;
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  department: Department;
  location: OperationLocation;
  category: Category;
  issueType: string;
  description: string;
  severity: Severity;
  status: Status;
  downtimeMinutes: number;
  resolutionMinutes: number;
  employeeCount: number;
  productionImpact: ProductionImpact;
  priority: Priority;
  rootCause: string;
  resolvedBy: string;
  recurrence: boolean;
  costImpact: number;
}

/* --------------------------------------------------------------------------
 * Aggregates
 * ----------------------------------------------------------------------- */

export interface CountStat {
  name: string;
  count: number;
}

export interface DepartmentStat {
  department: Department;
  incidents: number;
  downtime: number;
  avgDowntime: number;
  avgResolution: number;
  cost: number;
  critical: number;
  unresolved: number;
  resolutionRate: number;
  /** 0–100, higher means more operational pressure. */
  riskIndex: number;
}

export interface LocationStat {
  location: OperationLocation;
  incidents: number;
  downtime: number;
  cost: number;
  critical: number;
  recurring: number;
}

export interface CategoryStat extends CountStat {
  downtime: number;
  cost: number;
  avgResolution: number;
}

export interface RootCauseStat extends CountStat {
  downtime: number;
  cost: number;
  departments: Department[];
}

export interface TrendPoint {
  date: string;
  label: string;
  incidents: number;
  critical: number;
  downtime: number;
}

export interface StatusTrendPoint {
  label: string;
  Resolved: number;
  "In Progress": number;
  Pending: number;
  Escalated: number;
}

export interface TrendSummary {
  points: TrendPoint[];
  currentWindow: number;
  previousWindow: number;
  changePct: number;
  direction: "up" | "down" | "flat";
}

export interface KpiSummary {
  totalIncidents: number;
  criticalIssues: number;
  resolutionRate: number;
  totalDowntime: number;
  totalCost: number;
  avgResolution: number;
  deltas: {
    incidents: number;
    critical: number;
    resolutionRate: number;
    downtime: number;
  };
}

/* --------------------------------------------------------------------------
 * AI engine output
 * ----------------------------------------------------------------------- */

export type RiskLevel = "Critical" | "High" | "Moderate" | "Low";

export interface Anomaly {
  id: string;
  record: OperationRecord;
  metric: "Downtime" | "Resolution time" | "Cost impact" | "Unresolved critical";
  observed: string;
  expectedRange: string;
  /** How many standard deviations from the mean, where applicable. */
  deviation: number;
  assessment: string;
  risk: RiskLevel;
}

export interface KeyFinding {
  id: string;
  title: string;
  explanation: string;
  affectedRecordIds: string[];
  severity: Severity;
  confidence: number;
  evidence: { label: string; value: string }[];
}

export interface RiskArea {
  id: string;
  name: string;
  scope: "Department" | "Location" | "Category";
  score: number;
  level: RiskLevel;
  drivers: string[];
  incidents: number;
  downtime: number;
}

export interface Recommendation {
  id: string;
  action: string;
  reason: string;
  impact: "High" | "Medium" | "Low";
  priority: Priority;
  department: Department | "Cross-functional";
  supportingMetric: string;
  affectedRecordIds: string[];
}

export interface PriorityIssue {
  record: OperationRecord;
  riskScore: number;
  rationale: string;
}

export interface RiskScoreBreakdown {
  score: number;
  level: RiskLevel;
  components: { label: string; value: number; weight: number; detail: string }[];
}

export interface AIAnalysis {
  generatedAt: string;
  engine: string;
  recordsAnalysed: number;
  confidence: number;
  executiveSummary: string;
  trendExplanation: string;
  keyFindings: KeyFinding[];
  anomalies: Anomaly[];
  riskAreas: RiskArea[];
  recommendations: Recommendation[];
  priorityIssues: PriorityIssue[];
  riskScore: RiskScoreBreakdown;
}

export interface AIAnswer {
  question: string;
  answer: string;
  metrics: { label: string; value: string }[];
  scope: string;
  recommendation: string;
  recordIds: string[];
}

export interface OperationFilters {
  search: string;
  departments: Department[];
  severities: Severity[];
  statuses: Status[];
  categories: Category[];
  locations: OperationLocation[];
  dateFrom: string | null;
  dateTo: string | null;
}
