export type SourceType =
  | "crm"
  | "drive"
  | "gmail"
  | "hyperspell"
  | "meeting"
  | "nia"
  | "github"
  | "slack"
  | "notion"
  | "pr"
  | "transcript"
  | "fixture";

export type ConfidenceLabel = "Decided" | "Convention" | "Considered" | "Stale";
export type CaptureMethod = "connector" | "transcript" | "manual_note" | "agent_checkpoint" | "fixture";
export type DecisionRole = "originated" | "debated" | "finalized" | "codified" | "implemented";
export type DecisionStatus = "proposed" | "debated" | "decided" | "superseded";

export interface SourceCitation {
  id: string;
  sourceType: SourceType;
  title: string;
  url?: string;
  snippet: string;
  confidence: ConfidenceLabel;
  freshness?: number;
  live: boolean;
  decisionId?: string;
  threadId?: string;
  captureMethod?: CaptureMethod;
  capturedAt?: number;
  decisionRole?: DecisionRole;
}

export interface BrainSourcePacket {
  provider: "hyperspell" | "nia" | "fixture";
  status: "connected" | "syncing" | "fallback" | "error";
  counts: {
    messages?: number;
    docs?: number;
    prs?: number;
    repos?: number;
    crm?: number;
    emails?: number;
    meetings?: number;
    decisions?: number;
  };
  summary: string;
  citations: SourceCitation[];
}

export interface CaptureCoverageItem {
  id: string;
  label: string;
  sourceType: SourceType;
  status: "captured" | "fixture" | "indexed" | "missing";
  detail: string;
}

export interface Decision {
  id: string;
  title: string;
  summary: string;
  status: DecisionStatus;
  finalRecommendation: string;
  sourceCitationIds: string[];
  owner: string;
  freshness?: number;
}

export type EmployeeStatus =
  | "onboarding"
  | "active"
  | "coding"
  | "blocked"
  | "ready"
  | "merged";

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  github: string;
  status: EmployeeStatus;
  palette: number;
}

export interface OnboardingProfile {
  employeeId: string;
  headline: string;
  strengths: string[];
  weakSpots: string[];
  knownModules: string[];
  sourceCoverage: number;
  contextRiskScore: number;
  summary: string;
}

export interface OnboardingTask {
  id: string;
  title: string;
  issueId: string;
  owner: string;
  matchedEmployeeId: string;
  status: "selected" | "in_progress" | "blocked" | "ready";
  progress: number;
  whyMatched: string[];
  files: string[];
}

export interface AgentSession {
  id: string;
  kind: "codex" | "claude" | "kiro";
  displayName: string;
  ownerEmployeeId: string;
  currentPlan: string;
  status: "idle" | "working" | "blocked" | "ready";
}

export interface ContextEvent {
  id: string;
  stage: DemoStage;
  title: string;
  body: string;
  citationIds: string[];
}

export interface Guardrail {
  id: string;
  title: string;
  severity: "info" | "warning" | "blocking";
  rule: string;
  recommendation: string;
  citationIds: string[];
  active: boolean;
}

export interface PrReadinessReport {
  id: string;
  taskId: string;
  verdict: "ready" | "needs_review" | "blocked";
  summary: string;
  tests: string[];
  risk: "low" | "medium" | "high";
  recommendation: string;
  citationIds: string[];
}

export interface SeniorModeFlash {
  title: string;
  risk: "low" | "medium" | "high";
  summary: string;
  affectedSurfaces: string[];
  recommendation: string;
}

export type DemoStage = "assemble" | "profile" | "task" | "guardrail" | "readiness";

export interface DemoState {
  mode: "fixture" | "live" | "hybrid";
  employees: Employee[];
  profile: OnboardingProfile;
  brainSources: BrainSourcePacket[];
  captureCoverage: CaptureCoverageItem[];
  citations: SourceCitation[];
  decisions: Decision[];
  task: OnboardingTask;
  agents: AgentSession[];
  contextEvents: ContextEvent[];
  guardrails: Guardrail[];
  readiness: PrReadinessReport;
  seniorMode: SeniorModeFlash;
}
