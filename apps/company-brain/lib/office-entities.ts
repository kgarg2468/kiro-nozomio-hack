import type { AgentSession, DemoStage, DemoState, Employee, EmployeeStatus } from "@/lib/types";

export type OfficeEntityKind = "employee" | "agent" | "source";

export interface OfficeEntity {
  id: string;
  name: string;
  kind: OfficeEntityKind;
  status: EmployeeStatus | "idle" | "working";
  paletteIdx: number;
  busy?: boolean;
  role?: string;
  currentPlan?: string;
  detail?: string;
  owner?: string;
  coverage?: number;
  risk?: number;
  progress?: number;
}

export function officeEntitiesForStage(state: DemoState, stage: DemoStage): OfficeEntity[] {
  const agentNames = new Set(state.agents.map((agent) => agent.displayName));
  const employees = state.employees
    .filter((employee) => !agentNames.has(employee.name))
    .map((employee) => employeeToOfficeEntity(employee, stage, state));
  const employeeIds = new Set(employees.map((employee) => employee.id));
  const agents = state.agents
    .filter((agent) => !employeeIds.has(agent.id))
    .map((agent, index) => agentToOfficeEntity(agent, stage, index));

  return [...employees, ...agents];
}

function employeeToOfficeEntity(employee: Employee, stage: DemoStage, state: DemoState): OfficeEntity {
  let status = employee.status;

  if (employee.id === "sam") {
    if (stage === "task") status = "coding";
    if (stage === "guardrail") status = "blocked";
    if (stage === "readiness") status = "ready";
  }

  if (employee.id === "codex-session") {
    status = stage === "readiness" ? "ready" : "coding";
  }

  return {
    id: employee.id,
    name: compactName(employee.name),
    kind: employee.role.toLowerCase().includes("agent") ? "agent" : "employee",
    status,
    paletteIdx: employee.palette,
    busy: status === "coding" || status === "blocked" || status === "ready",
    role: employee.role,
    currentPlan:
      employee.id === "sam"
        ? state.task.title
        : "Available as source-backed owner or reviewer.",
    detail:
      employee.id === "sam"
        ? state.profile.headline
        : "Seeded teammate context for ownership, review, and pair-coding handoffs.",
    owner: employee.id === "sam" ? state.task.owner : undefined,
    coverage: employee.id === "sam" ? state.profile.sourceCoverage : undefined,
    risk: employee.id === "sam" ? state.profile.contextRiskScore : undefined,
    progress: employee.id === "sam" ? state.task.progress : undefined
  };
}

function agentToOfficeEntity(agent: AgentSession, stage: DemoStage, index: number): OfficeEntity {
  const status =
    agent.status === "blocked"
      ? "blocked"
      : agent.status === "ready" || stage === "readiness"
        ? "ready"
        : agent.status === "working"
          ? "working"
          : "idle";

  return {
    id: agent.id,
    name: agent.displayName,
    kind: "agent",
    status,
    paletteIdx: index + 3,
    busy: status === "working" || status === "blocked" || status === "ready",
    role: `${agent.kind} agent`,
    currentPlan: agent.currentPlan,
    detail: `Owned by ${agent.ownerEmployeeId}; visible while Kiro coordinates agent work.`
  };
}

function compactName(name: string) {
  const [first, last] = name.split(" ");
  if (!last) return first ?? name;
  return `${first} ${last[0]}.`;
}
