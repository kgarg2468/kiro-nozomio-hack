import "server-only";

import { getFixtureDemoState } from "@/lib/demo-data";
import type {
  AgentSession,
  BrainSourcePacket,
  ConfidenceLabel,
  Decision,
  DecisionRole,
  DecisionStatus,
  DemoState,
  DemoStage,
  Employee,
  EmployeeStatus,
  Guardrail,
  OnboardingProfile,
  OnboardingTask,
  PrReadinessReport,
  SourceCitation,
  SourceType
} from "@/lib/types";

interface ConvexDashboardEnvelope {
  status: "success" | "error";
  value?: ConvexDashboardState;
  errorMessage?: string;
}

interface ConvexDashboardState {
  employees: ConvexEmployee[];
  profile: ConvexProfile | null;
  brainSources: ConvexBrainSource[];
  citations: ConvexCitation[];
  decisions: ConvexDecision[];
  task: ConvexTask | null;
  agentSessions: ConvexAgentSession[];
  contextEvents: ConvexContextEvent[];
  guardrails: ConvexGuardrail[];
  readiness: ConvexReadinessReport | null;
}

interface ConvexEmployee {
  external_id: string;
  name: string;
  email: string;
  role: string;
  github: string;
  status: EmployeeStatus;
  palette: number;
}

interface ConvexProfile {
  employee_external_id: string;
  headline: string;
  strengths: string[];
  weak_spots: string[];
  known_modules: string[];
  source_coverage: number;
  context_risk_score: number;
  summary: string;
}

interface ConvexBrainSource {
  provider: BrainSourcePacket["provider"];
  status: BrainSourcePacket["status"];
  messages?: number;
  docs?: number;
  prs?: number;
  repos?: number;
  crm?: number;
  emails?: number;
  meetings?: number;
  decisions?: number;
  summary: string;
}

interface ConvexCitation {
  external_id: string;
  source_type: SourceType;
  title: string;
  url?: string;
  snippet: string;
  confidence: ConfidenceLabel;
  freshness?: number;
  live: boolean;
  decision_external_id?: string;
  thread_external_id?: string;
  capture_method?: SourceCitation["captureMethod"];
  captured_at?: number;
  decision_role?: DecisionRole;
}

interface ConvexDecision {
  external_id: string;
  title: string;
  summary: string;
  status: DecisionStatus;
  final_recommendation: string;
  source_citation_external_ids: string[];
  owner: string;
  freshness?: number;
}

interface ConvexTask {
  external_id: string;
  title: string;
  issue_id: string;
  owner: string;
  matched_employee_external_id: string;
  status: OnboardingTask["status"];
  progress: number;
  why_matched: string[];
  files: string[];
}

interface ConvexAgentSession {
  external_id: string;
  kind: AgentSession["kind"];
  display_name: string;
  owner_employee_external_id: string;
  current_plan: string;
  status: AgentSession["status"];
}

interface ConvexContextEvent {
  external_id: string;
  stage: DemoStage;
  title: string;
  body: string;
  citation_external_ids: string[];
}

interface ConvexGuardrail {
  external_id: string;
  title: string;
  severity: Guardrail["severity"];
  rule: string;
  recommendation: string;
  citation_external_ids: string[];
  active: boolean;
}

interface ConvexReadinessReport {
  external_id: string;
  task_external_id: string;
  verdict: PrReadinessReport["verdict"];
  summary: string;
  tests: string[];
  risk: PrReadinessReport["risk"];
  recommendation: string;
  citation_external_ids: string[];
}

export async function fetchConvexDemoState(): Promise<DemoState | null> {
  const url = convexUrl();
  if (!url) return null;

  try {
    const res = await fetch(`${url}/api/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      cache: "no-store",
      body: JSON.stringify({
        path: "onboarding:dashboardState",
        args: {},
        format: "json"
      })
    });

    if (!res.ok) return null;
    const envelope = (await res.json()) as ConvexDashboardEnvelope;
    if (envelope.status !== "success" || !envelope.value) return null;
    return mapConvexDashboardState(envelope.value);
  } catch {
    return null;
  }
}

export function convexUrl(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_CONVEX_URL ??
    process.env.CONVEX_URL ??
    process.env.CONVEX_DEPLOYMENT_URL
  )?.replace(/\/$/, "");
}

function mapConvexDashboardState(state: ConvexDashboardState): DemoState {
  const fixture = getFixtureDemoState();
  const citations = state.citations.map(mapCitation);

  return {
    ...fixture,
    mode: "live",
    employees: state.employees.length ? state.employees.map(mapEmployee) : fixture.employees,
    profile: state.profile ? mapProfile(state.profile) : fixture.profile,
    brainSources: state.brainSources.length
      ? state.brainSources.map((source) => mapBrainSource(source, citations))
      : fixture.brainSources,
    citations: citations.length ? citations : fixture.citations,
    decisions: state.decisions.length ? state.decisions.map(mapDecision) : fixture.decisions,
    task: state.task ? mapTask(state.task) : fixture.task,
    agents: state.agentSessions.length ? state.agentSessions.map(mapAgentSession) : fixture.agents,
    contextEvents: state.contextEvents.length
      ? state.contextEvents.map(mapContextEvent)
      : fixture.contextEvents,
    guardrails: state.guardrails.length ? state.guardrails.map(mapGuardrail) : fixture.guardrails,
    readiness: state.readiness ? mapReadiness(state.readiness) : fixture.readiness
  };
}

function mapEmployee(employee: ConvexEmployee): Employee {
  return {
    id: employee.external_id,
    name: employee.name,
    email: employee.email,
    role: employee.role,
    github: employee.github,
    status: employee.status,
    palette: employee.palette
  };
}

function mapProfile(profile: ConvexProfile): OnboardingProfile {
  return {
    employeeId: profile.employee_external_id,
    headline: profile.headline,
    strengths: profile.strengths,
    weakSpots: profile.weak_spots,
    knownModules: profile.known_modules,
    sourceCoverage: profile.source_coverage,
    contextRiskScore: profile.context_risk_score,
    summary: profile.summary
  };
}

function mapBrainSource(
  source: ConvexBrainSource,
  citations: SourceCitation[]
): BrainSourcePacket {
  return {
    provider: source.provider,
    status: source.status,
    counts: {
      messages: source.messages,
      docs: source.docs,
      prs: source.prs,
      repos: source.repos,
      crm: source.crm,
      emails: source.emails,
      meetings: source.meetings,
      decisions: source.decisions
    },
    summary: source.summary,
    citations: citations.filter((citation) => {
      if (source.provider === "fixture") return citation.captureMethod === "fixture";
      if (source.provider === "nia") return citation.sourceType === "nia";
      return citation.sourceType !== "nia" && citation.sourceType !== "fixture";
    })
  };
}

function mapCitation(citation: ConvexCitation): SourceCitation {
  return {
    id: citation.external_id,
    sourceType: citation.source_type,
    title: citation.title,
    url: citation.url,
    snippet: citation.snippet,
    confidence: citation.confidence,
    freshness: citation.freshness,
    live: citation.live,
    decisionId: citation.decision_external_id,
    threadId: citation.thread_external_id,
    captureMethod: citation.capture_method,
    capturedAt: citation.captured_at,
    decisionRole: citation.decision_role
  };
}

function mapDecision(decision: ConvexDecision): Decision {
  return {
    id: decision.external_id,
    title: decision.title,
    summary: decision.summary,
    status: decision.status,
    finalRecommendation: decision.final_recommendation,
    sourceCitationIds: decision.source_citation_external_ids,
    owner: decision.owner,
    freshness: decision.freshness
  };
}

function mapTask(task: ConvexTask): OnboardingTask {
  return {
    id: task.external_id,
    title: task.title,
    issueId: task.issue_id,
    owner: task.owner,
    matchedEmployeeId: task.matched_employee_external_id,
    status: task.status,
    progress: task.progress,
    whyMatched: task.why_matched,
    files: task.files
  };
}

function mapAgentSession(session: ConvexAgentSession): AgentSession {
  return {
    id: session.external_id,
    kind: session.kind,
    displayName: session.display_name,
    ownerEmployeeId: session.owner_employee_external_id,
    currentPlan: session.current_plan,
    status: session.status
  };
}

function mapContextEvent(event: ConvexContextEvent) {
  return {
    id: event.external_id,
    stage: event.stage,
    title: event.title,
    body: event.body,
    citationIds: event.citation_external_ids
  };
}

function mapGuardrail(guardrail: ConvexGuardrail): Guardrail {
  return {
    id: guardrail.external_id,
    title: guardrail.title,
    severity: guardrail.severity,
    rule: guardrail.rule,
    recommendation: guardrail.recommendation,
    citationIds: guardrail.citation_external_ids,
    active: guardrail.active
  };
}

function mapReadiness(report: ConvexReadinessReport): PrReadinessReport {
  return {
    id: report.external_id,
    taskId: report.task_external_id,
    verdict: report.verdict,
    summary: report.summary,
    tests: report.tests,
    risk: report.risk,
    recommendation: report.recommendation,
    citationIds: report.citation_external_ids
  };
}
