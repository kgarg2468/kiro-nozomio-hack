import type {
  AgentSession,
  CaptureCoverageItem,
  Decision,
  DecisionRole,
  DemoState,
  Guardrail,
  SourceCitation
} from "@/lib/types";

export interface AgentCheckpointInput {
  sessionId: string;
  plan?: string;
  changedFiles?: string[];
  diffSummary?: string;
  proposedChange?: string;
  state: DemoState;
}

export interface AgentPlanInput {
  sessionId: string;
  plan: string;
  status?: AgentSession["status"];
  kind?: AgentSession["kind"];
  displayName?: string;
  ownerEmployeeId?: string;
}

export interface AgentDecisionTrail {
  decisionId: string;
  title: string;
  recommendation: string;
  citationIds: string[];
  lifecycle: Array<{
    role: DecisionRole;
    citationIds: string[];
  }>;
}

export interface AgentCheckpointResult {
  sessionId: string;
  pause: boolean;
  risk: "low" | "medium" | "high";
  warnings: string[];
  guardrails: Guardrail[];
  decisionTrails: AgentDecisionTrail[];
  captureGaps: CaptureCoverageItem[];
  citations: SourceCitation[];
}

const DECISION_ROLES: DecisionRole[] = [
  "originated",
  "debated",
  "finalized",
  "codified",
  "implemented"
];

export function evaluateAgentCheckpoint(input: AgentCheckpointInput): AgentCheckpointResult {
  const text = checkpointText(input);
  const captureGaps = input.state.captureCoverage.filter((item) => item.status === "missing");
  const matchedGuardrails = input.state.guardrails.filter((guardrail) =>
    guardrailMatches(guardrail, input.state.citations, text)
  );
  const relevantDecisions = input.state.decisions.filter((decision) =>
    decisionMatches(decision, input.state.citations, matchedGuardrails, text)
  );
  const decisionTrails = relevantDecisions.map((decision) =>
    buildDecisionTrail(decision, input.state.citations)
  );
  const citations = citationsForCheckpoint(
    input.state.citations,
    matchedGuardrails,
    relevantDecisions
  );
  const warnings = [
    ...matchedGuardrails.map((guardrail) => guardrail.recommendation),
    ...captureGaps.map((gap) => `${gap.label} is outside the capture window: ${gap.detail}.`)
  ];

  return {
    sessionId: input.sessionId,
    pause: matchedGuardrails.length > 0,
    risk: riskForCheckpoint(matchedGuardrails, captureGaps),
    warnings,
    guardrails: matchedGuardrails,
    decisionTrails,
    captureGaps,
    citations
  };
}

export function recordAgentPlan(state: DemoState, input: AgentPlanInput): DemoState {
  const existingIndex = state.agents.findIndex((agent) => agent.id === input.sessionId);
  const status = input.status ?? "working";

  if (existingIndex >= 0) {
    return {
      ...state,
      agents: state.agents.map((agent, index) =>
        index === existingIndex
          ? {
              ...agent,
              currentPlan: input.plan,
              status
            }
          : agent
      )
    };
  }

  return {
    ...state,
    agents: [
      ...state.agents,
      {
        id: input.sessionId,
        kind: input.kind ?? "codex",
        displayName: input.displayName ?? input.sessionId,
        ownerEmployeeId: input.ownerEmployeeId ?? state.profile.employeeId,
        currentPlan: input.plan,
        status
      }
    ]
  };
}

function checkpointText(input: AgentCheckpointInput) {
  const recordedPlan = input.state.agents.find((agent) => agent.id === input.sessionId)?.currentPlan;
  return [
    input.plan ?? recordedPlan,
    input.diffSummary,
    input.proposedChange,
    ...(input.changedFiles ?? [])
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function guardrailMatches(guardrail: Guardrail, citations: SourceCitation[], text: string) {
  if (!guardrail.active) return false;
  const haystack = [
    guardrail.title,
    guardrail.rule,
    guardrail.recommendation,
    ...citations
      .filter((citation) => guardrail.citationIds.includes(citation.id))
      .map((citation) => `${citation.title} ${citation.snippet}`)
  ]
    .join(" ")
    .toLowerCase();

  if (text.includes("time.sleep") && haystack.includes("async")) return true;
  if (text.includes("fixed sleep") && haystack.includes("sleep")) return true;
  if (text.includes("mongodb") && haystack.includes("mongodb")) return true;
  if (text.includes("delete") && haystack.includes("delete")) return true;
  if (text.includes("rebase") && haystack.includes("rebase")) return true;
  return false;
}

function decisionMatches(
  decision: Decision,
  citations: SourceCitation[],
  guardrails: Guardrail[],
  text: string
) {
  const guardrailCitationIds = new Set(guardrails.flatMap((guardrail) => guardrail.citationIds));
  if (decision.sourceCitationIds.some((id) => guardrailCitationIds.has(id))) return true;

  const haystack = [
    decision.title,
    decision.summary,
    decision.finalRecommendation,
    ...citations
      .filter((citation) => decision.sourceCitationIds.includes(citation.id))
      .map((citation) => `${citation.title} ${citation.snippet}`)
  ]
    .join(" ")
    .toLowerCase();
  return sharedKeywords(text, haystack).length >= 2;
}

function buildDecisionTrail(decision: Decision, citations: SourceCitation[]): AgentDecisionTrail {
  return {
    decisionId: decision.id,
    title: decision.title,
    recommendation: decision.finalRecommendation,
    citationIds: decision.sourceCitationIds,
    lifecycle: DECISION_ROLES.map((role) => ({
      role,
      citationIds: citations
        .filter(
          (citation) =>
            decision.sourceCitationIds.includes(citation.id) &&
            (citation.decisionRole ?? "implemented") === role
        )
        .map((citation) => citation.id)
    })).filter((group) => group.citationIds.length > 0)
  };
}

function citationsForCheckpoint(
  citations: SourceCitation[],
  guardrails: Guardrail[],
  decisions: Decision[]
) {
  const ids = new Set([
    ...guardrails.flatMap((guardrail) => guardrail.citationIds),
    ...decisions.flatMap((decision) => decision.sourceCitationIds)
  ]);
  return citations.filter((citation) => ids.has(citation.id));
}

function riskForCheckpoint(guardrails: Guardrail[], captureGaps: CaptureCoverageItem[]) {
  if (guardrails.some((guardrail) => guardrail.severity === "blocking")) return "high";
  if (guardrails.length > 0) return "medium";
  if (captureGaps.length > 0) return "medium";
  return "low";
}

function sharedKeywords(left: string, right: string) {
  const tokens = new Set(
    left
      .split(/[^a-z0-9_#.]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 4)
  );
  return right
    .split(/[^a-z0-9_#.]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && tokens.has(token));
}
