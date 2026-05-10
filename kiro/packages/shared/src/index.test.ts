import { describe, expect, it } from "vitest";
import {
  compatibilityClassificationSchema,
  contractPublicationSchema,
  conflictDecisionSchema,
  conflictSchema,
  fingerprintSchema,
  agentSessionSchema,
  interventionSchema,
  worktreeSchema
} from "./index.js";

describe("shared schemas", () => {
  it("validates a worktree snapshot", () => {
    const parsed = worktreeSchema.parse({
      id: "wt-main",
      repoId: "repo-1",
      path: "/tmp/repo",
      branch: "main",
      headSha: "abc123",
      dirty: true,
      status: "active",
      lastObservedAt: 1778000000000
    });

    expect(parsed.status).toBe("active");
  });

  it("validates a live fingerprint without raw diff content", () => {
    const parsed = fingerprintSchema.parse({
      id: "fp-1",
      repoId: "repo-1",
      worktreeId: "wt-a",
      diffHash: "hash-1",
      createdAt: 1778000000000,
      filesTouched: ["src/db/schema.ts"],
      symbols: {
        added: ["Task.priority"],
        modified: ["Task"],
        removed: []
      },
      surfaces: [
        {
          id: "surface-task-model",
          label: "Task model",
          kind: "schema",
          files: ["src/db/schema.ts"],
          confidence: 0.86,
          evidence: ["schema filename", "Task interface"]
        }
      ],
      semanticSummary: "Adds priority to the Task model.",
      contractChanges: ["Task.priority"],
      confidence: 0.82,
      source: "heuristic"
    });

    expect(JSON.stringify(parsed)).not.toContain("@@");
  });

  it("validates agent coordination roles", () => {
    const parsed = agentSessionSchema.parse({
      id: "agent-integration",
      repoId: "repo-1",
      worktreeId: "wt-main",
      agentKind: "codex",
      cwd: "/tmp/repo",
      displayName: "integration-main",
      coordinationRole: "integration",
      lastCheckpointAt: 1778000000000,
      joinedAt: 1778000000000
    });

    expect(parsed.coordinationRole).toBe("integration");
  });

  it("validates a conflict lifecycle state", () => {
    const parsed = conflictSchema.parse({
      id: "conflict-1",
      repoId: "repo-1",
      status: "open",
      risk: "medium",
      confidence: 0.78,
      type: "schema",
      title: "Task contract overlap",
      summary: "Two worktrees are changing Task contract surfaces.",
      primarySurface: "Task contract",
      affectedWorktreeIds: ["wt-a", "wt-b"],
      affectedSurfaces: ["Task model"],
      evidence: ["Both fingerprints touch Task model"],
      riskReasons: [
        {
          label: "Shared contract root",
          detail: "Both worktrees touch Task contract surfaces.",
          weight: 90
        }
      ],
      createdAt: 1778000000000,
      updatedAt: 1778000000001
    });

    expect(parsed.status).toBe("open");
    expect(parsed.primarySurface).toBe("Task contract");
    expect(parsed.riskReasons[0]?.label).toBe("Shared contract root");
  });

  it("validates edited intervention direction", () => {
    const parsed = interventionSchema.parse({
      id: "int-1",
      repoId: "repo-1",
      conflictId: "conflict-1",
      targetAgentSessionIds: ["agent-1"],
      draft: "Coordinate Task fields before committing.",
      editedDirection: "Pause and revise your plan around the Task contract.",
      directive: {
        role: "adapter",
        conflict: "Task contract overlap",
        peerAgentName: "codex-due-date",
        peerWorktreeId: "wt-due",
        peerIntentSummary: "Peer is adding required dueDate to Task.",
        sharedSurfaces: ["Task model", "Task type"],
        sharedFiles: ["src/db/schema.ts"],
        nextAction: "Preserve dueDate while adapting priority work."
      },
      status: "queued",
      createdAt: 1778000000000
    });

    expect(parsed.status).toBe("queued");
    expect(parsed.directive?.role).toBe("adapter");
  });

  it("validates compatibility classification and conflict decisions", () => {
    const classification = compatibilityClassificationSchema.parse({
      kind: "coordination_notice",
      rationale: "Both worktrees add independent Task fields.",
      recommendedOwnerWorktreeId: "wt-priority",
      recommendedOptionId: "split-ownership",
      source: "openai",
      confidence: 0.82
    });
    expect(classification.kind).toBe("coordination_notice");
    expect(classification.source).toBe("openai");

    const decision = conflictDecisionSchema.parse({
      id: "decision-1",
      repoId: "repo-1",
      conflictId: "conflict-1",
      selectedOptionId: "split-ownership",
      selectedOptionTitle: "Split ownership",
      selectedOptionDirection: "Make priority the owner and due date the adapter.",
      createdBy: "agent",
      status: "active",
      createdAt: 1778000000000,
      updatedAt: 1778000000001
    });
    expect(decision.createdBy).toBe("agent");
  });

  it("validates an owner contract publication", () => {
    const parsed = contractPublicationSchema.parse({
      id: "publication-1",
      repoId: "repo-1",
      conflictId: "conflict-1",
      ownerAgentSessionId: "agent-owner",
      surface: "Task contract",
      shapeSummary: "Task has required label and structured title.",
      files: ["src/shared/task.ts"],
      createdAt: 1778000000002
    });

    expect(parsed.surface).toBe("Task contract");
    expect(parsed.files).toEqual(["src/shared/task.ts"]);
  });
});
