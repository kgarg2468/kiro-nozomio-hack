import "server-only";

import type {
  Advisory,
  AgentSession,
  ConflictDecision,
  ContractPublication,
  Fingerprint,
  GitHubMemoryCitation,
  Intervention,
  KiroConflict,
  KiroEvent,
  KiroRepo,
  KiroWorktree
} from "@kiro/senior-shared";

export interface SeniorSettings {
  openai: {
    configured: boolean;
    model: string;
  };
  codex: {
    mcpUrl: string;
  };
  github?: {
    configured: boolean;
    repos: string[];
  };
}

export interface SeniorSnapshot {
  connected: boolean;
  coordinatorUrl: string;
  repo: KiroRepo | null;
  worktrees: KiroWorktree[];
  agents: AgentSession[];
  fingerprints: Fingerprint[];
  conflicts: KiroConflict[];
  advisories: Advisory[];
  interventions: Intervention[];
  decisions: ConflictDecision[];
  publications: ContractPublication[];
  githubMemory: GitHubMemoryCitation[];
  events: KiroEvent[];
  settings: SeniorSettings;
}

export const coordinatorUrl =
  process.env.KIRO_COORDINATOR_URL ??
  process.env.NEXT_PUBLIC_KIRO_COORDINATOR_URL ??
  "http://127.0.0.1:3747";

export async function getSeniorSnapshot(): Promise<SeniorSnapshot> {
  const [
    health,
    repo,
    worktrees,
    agents,
    fingerprints,
    conflicts,
    advisories,
    interventions,
    decisions,
    publications,
    githubMemory,
    events,
    settings
  ] = await Promise.allSettled([
    fetchJson<{ ok: boolean }>("/health"),
    fetchJson<KiroRepo | null>("/api/repo"),
    fetchJson<{ worktrees: KiroWorktree[] }>("/api/worktrees"),
    fetchJson<{ agents: AgentSession[] }>("/api/agents"),
    fetchJson<{ fingerprints: Fingerprint[] }>("/api/fingerprints"),
    fetchJson<{ conflicts: KiroConflict[] }>("/api/conflicts"),
    fetchJson<{ advisories: Advisory[] }>("/api/advisories"),
    fetchJson<{ interventions: Intervention[] }>("/api/interventions"),
    fetchJson<{ decisions: ConflictDecision[] }>("/api/decisions"),
    fetchJson<{ publications: ContractPublication[] }>("/api/contract-publications"),
    fetchJson<{ citations: GitHubMemoryCitation[] }>("/api/github-memory"),
    fetchJson<{ events: KiroEvent[] }>("/api/events"),
    fetchJson<SeniorSettings>("/api/settings")
  ]);

  if (health.status === "rejected") return disconnectedSnapshot();

  return {
    connected: true,
    coordinatorUrl,
    repo: valueOr(repo, null),
    worktrees: valueOr(worktrees, { worktrees: [] }).worktrees,
    agents: valueOr(agents, { agents: [] }).agents,
    fingerprints: valueOr(fingerprints, { fingerprints: [] }).fingerprints,
    conflicts: valueOr(conflicts, { conflicts: [] }).conflicts,
    advisories: valueOr(advisories, { advisories: [] }).advisories,
    interventions: valueOr(interventions, { interventions: [] }).interventions,
    decisions: valueOr(decisions, { decisions: [] }).decisions,
    publications: valueOr(publications, { publications: [] }).publications,
    githubMemory: valueOr(githubMemory, { citations: [] }).citations,
    events: valueOr(events, { events: [] }).events,
    settings: valueOr(settings, disconnectedSnapshot().settings)
  };
}

export async function analyzeNow() {
  return postJson("/api/analyze", {});
}

export async function recordSeniorDecision(input: {
  conflictId: string;
  selectedOptionId: string;
  selectedOptionTitle: string;
  selectedOptionDirection: string;
  ownerAgentSessionId?: string | undefined;
}) {
  return postJson("/api/decisions", {
    ...input,
    createdBy: "dashboard"
  });
}

export async function updateSeniorConflictStatus(
  conflictId: string,
  status: "open" | "acknowledged" | "resolved" | "ignored"
) {
  return postJson(`/api/conflicts/${conflictId}/status`, { status });
}

async function fetchJson<T>(pathname: string): Promise<T> {
  const response = await fetch(`${coordinatorUrl}${pathname}`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Kiro coordinator returned ${response.status} for ${pathname}`);
  }
  return (await response.json()) as T;
}

async function postJson(pathname: string, body: unknown) {
  const token = process.env.KIRO_LOCAL_TOKEN;
  if (!token) {
    throw new Error("KIRO_LOCAL_TOKEN is required for Senior Mode mutations.");
  }
  const response = await fetch(`${coordinatorUrl}${pathname}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Kiro coordinator returned ${response.status} for ${pathname}`);
  }
  return response.json() as Promise<unknown>;
}

function valueOr<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

function disconnectedSnapshot(): SeniorSnapshot {
  return {
    connected: false,
    coordinatorUrl,
    repo: null,
    worktrees: [],
    agents: [],
    fingerprints: [],
    conflicts: [],
    advisories: [],
    interventions: [],
    decisions: [],
    publications: [],
    githubMemory: [],
    events: [],
    settings: {
      openai: {
        configured: false,
        model: "unavailable"
      },
      codex: {
        mcpUrl: `${coordinatorUrl}/mcp`
      },
      github: {
        configured: false,
        repos: []
      }
    }
  };
}
