import { mkdir, mkdtemp, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execa } from "execa";
import { afterEach, describe, expect, it } from "vitest";
import type { KiroConflict } from "@kiro/shared";
import { createCoordinatorApp } from "./server.js";

async function createRepo() {
  const dir = await mkdtemp(path.join(tmpdir(), "kiro-server-"));
  await execa("git", ["init", "-b", "main"], { cwd: dir });
  await execa("git", ["config", "user.email", "kiro@example.com"], { cwd: dir });
  await execa("git", ["config", "user.name", "Kiro Test"], { cwd: dir });
  await writeFile(path.join(dir, "README.md"), "hello\n");
  await execa("git", ["add", "README.md"], { cwd: dir });
  await execa("git", ["commit", "-m", "init"], { cwd: dir });
  return realpath(dir);
}

async function createContractRepo() {
  const dir = await mkdtemp(path.join(tmpdir(), "kiro-server-"));
  await execa("git", ["init", "-b", "main"], { cwd: dir });
  await execa("git", ["config", "user.email", "kiro@example.com"], { cwd: dir });
  await execa("git", ["config", "user.name", "Kiro Test"], { cwd: dir });
  await mkdir(path.join(dir, "src", "db"), { recursive: true });
  await writeFile(
    path.join(dir, "src", "db", "schema.ts"),
    "export interface Task { id: string }\n"
  );
  await execa("git", ["add", "."], { cwd: dir });
  await execa("git", ["commit", "-m", "init"], { cwd: dir });
  return realpath(dir);
}

describe("coordinator server", () => {
  const apps: Awaited<ReturnType<typeof createCoordinatorApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it("reports health for a repo-local coordinator", async () => {
    const repoRoot = await createRepo();
    const app = await createCoordinatorApp({
      repoRoot,
      dbPath: path.join(repoRoot, ".kiro", "kiro.sqlite"),
      token: "test-token"
    });
    apps.push(app);

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      repoRoot,
      db: true,
      openai: false
    });
  });

  it("rejects mutation calls without the local token", async () => {
    const repoRoot = await createRepo();
    const app = await createCoordinatorApp({
      repoRoot,
      dbPath: path.join(repoRoot, ".kiro", "kiro.sqlite"),
      token: "test-token"
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/conflicts/conflict-1/status",
      payload: { status: "acknowledged" }
    });

    expect(response.statusCode).toBe(401);
  });

  it("runs analysis through the coordinator and exposes persisted results", async () => {
    const repoRoot = await createContractRepo();
    const wtA = path.join(path.dirname(repoRoot), `kiro-server-a-${path.basename(repoRoot)}`);
    const wtB = path.join(path.dirname(repoRoot), `kiro-server-b-${path.basename(repoRoot)}`);
    await execa("git", ["worktree", "add", "-b", "agent-a", wtA], { cwd: repoRoot });
    await execa("git", ["worktree", "add", "-b", "agent-b", wtB], { cwd: repoRoot });
    await writeFile(
      path.join(wtA, "src", "db", "schema.ts"),
      "export interface Task { id: string; priority: string }\n"
    );
    await writeFile(
      path.join(wtB, "src", "db", "schema.ts"),
      "export interface Task { id: string; tags: string[] }\n"
    );
    const app = await createCoordinatorApp({
      repoRoot,
      dbPath: path.join(repoRoot, ".kiro", "kiro.sqlite"),
      token: "test-token",
      startWatcher: false
    });
    apps.push(app);

    const analyze = await app.inject({
      method: "POST",
      url: "/api/analyze",
      headers: { authorization: "Bearer test-token" }
    });
    const conflicts = await app.inject({ method: "GET", url: "/api/conflicts" });
    const fingerprints = await app.inject({
      method: "GET",
      url: "/api/fingerprints"
    });

    expect(analyze.statusCode).toBe(200);
    expect(analyze.json()).toMatchObject({
      fingerprintCount: 2,
      conflictCount: 1
    });
    expect(conflicts.json().conflicts[0].affectedSurfaces).toContain("Task model");
    expect(fingerprints.json().fingerprints).toHaveLength(2);
  });

  it("does not return missing worktrees from the active worktree API", async () => {
    const repoRoot = await createRepo();
    const app = await createCoordinatorApp({
      repoRoot,
      dbPath: path.join(repoRoot, ".kiro", "kiro.sqlite"),
      token: "test-token",
      startWatcher: false
    });
    apps.push(app);
    app.kiro.store.upsertWorktree({
      id: "wt-missing",
      repoId: app.kiro.repoId,
      path: path.join(path.dirname(repoRoot), "removed"),
      branch: "removed",
      headSha: "abc123",
      dirty: false,
      status: "missing",
      lastObservedAt: 1778000000000
    });

    const response = await app.inject({ method: "GET", url: "/api/worktrees" });

    expect(
      response
        .json()
        .worktrees.some((worktree: { id: string }) => worktree.id === "wt-missing")
    ).toBe(false);
  });

  it("keeps live dashboard APIs scoped to active dirty worktrees", async () => {
    const repoRoot = await createRepo();
    const app = await createCoordinatorApp({
      repoRoot,
      dbPath: path.join(repoRoot, ".kiro", "kiro.sqlite"),
      token: "test-token",
      startWatcher: false
    });
    apps.push(app);
    const now = 1778000000000;
    app.kiro.store.upsertWorktree({
      id: "wt-main",
      repoId: app.kiro.repoId,
      path: repoRoot,
      branch: "main",
      headSha: "abc123",
      dirty: false,
      status: "active",
      lastObservedAt: now
    });
    app.kiro.store.upsertWorktree({
      id: "wt-missing",
      repoId: app.kiro.repoId,
      path: path.join(path.dirname(repoRoot), "removed"),
      branch: "old-agent",
      headSha: "def456",
      dirty: false,
      status: "missing",
      lastObservedAt: now
    });
    app.kiro.store.upsertFingerprint({
      id: "old-fingerprint",
      repoId: app.kiro.repoId,
      worktreeId: "wt-missing",
      diffHash: "old-diff",
      createdAt: now,
      filesTouched: ["src/shared/task.ts"],
      symbols: { added: [], modified: ["Task"], removed: [] },
      surfaces: [
        {
          id: "task-type",
          label: "Task type",
          kind: "type",
          files: ["src/shared/task.ts"],
          confidence: 0.8,
          evidence: ["type path"]
        }
      ],
      semanticSummary: "Old agent touched Task type.",
      contractChanges: ["Task type"],
      confidence: 0.8,
      source: "heuristic"
    });
    app.kiro.store.upsertAgentSession({
      id: "old-agent",
      repoId: app.kiro.repoId,
      worktreeId: "wt-missing",
      agentKind: "codex",
      cwd: path.join(path.dirname(repoRoot), "removed"),
      displayName: "old-agent",
      currentPlan: "Old plan",
      lastCheckpointAt: now,
      joinedAt: now
    });
    app.kiro.store.upsertConflict({
      id: "old-conflict",
      repoId: app.kiro.repoId,
      status: "resolved",
      risk: "high",
      confidence: 0.8,
      type: "schema",
      title: "Old Task overlap",
      summary: "Old worktrees touched Task.",
      primarySurface: "Task contract",
      affectedWorktreeIds: ["wt-main", "wt-missing"],
      affectedSurfaces: ["Task type"],
      evidence: ["Both fingerprints touch Task type"],
      riskReasons: [],
      createdAt: now,
      updatedAt: now
    });
    app.kiro.store.upsertConflictDecision({
      id: "old-decision",
      repoId: app.kiro.repoId,
      conflictId: "old-conflict",
      selectedOptionId: "split",
      selectedOptionTitle: "Split ownership",
      selectedOptionDirection: "Old split ownership decision.",
      ownerAgentSessionId: "old-agent",
      createdBy: "agent",
      status: "active",
      createdAt: now,
      updatedAt: now
    });
    app.kiro.store.upsertAdvisory({
      id: "old-advisory",
      repoId: app.kiro.repoId,
      conflictId: "old-conflict",
      source: "heuristic",
      options: [
        {
          id: "option-1",
          title: "Old option",
          direction: "Old direction.",
          rationale: "Old rationale.",
          affectedSurfaces: ["Task type"]
        }
      ],
      createdAt: now
    });
    app.kiro.store.upsertContractPublication({
      id: "old-publication",
      repoId: app.kiro.repoId,
      conflictId: "old-conflict",
      ownerAgentSessionId: "old-agent",
      surface: "Task contract",
      shapeSummary: "Old shape.",
      files: ["src/shared/task.ts"],
      createdAt: now
    });
    app.kiro.store.upsertIntervention({
      id: "old-intervention",
      repoId: app.kiro.repoId,
      conflictId: "old-conflict",
      targetAgentSessionIds: ["old-agent"],
      draft: "Old draft.",
      editedDirection: "Old direction.",
      status: "acknowledged",
      createdAt: now,
      sentAt: now,
      fetchedAt: now,
      acknowledgedAt: now
    });

    const [
      agents,
      fingerprints,
      conflicts,
      decisions,
      advisories,
      publications,
      interventions
    ] = await Promise.all([
      app.inject({ method: "GET", url: "/api/agents" }),
      app.inject({ method: "GET", url: "/api/fingerprints" }),
      app.inject({ method: "GET", url: "/api/conflicts" }),
      app.inject({ method: "GET", url: "/api/decisions" }),
      app.inject({ method: "GET", url: "/api/advisories" }),
      app.inject({ method: "GET", url: "/api/contract-publications" }),
      app.inject({ method: "GET", url: "/api/interventions" })
    ]);

    expect(agents.json().agents).toEqual([]);
    expect(fingerprints.json().fingerprints).toEqual([]);
    expect(conflicts.json().conflicts).toEqual([]);
    expect(decisions.json().decisions).toEqual([]);
    expect(advisories.json().advisories).toEqual([]);
    expect(publications.json().publications).toEqual([]);
    expect(interventions.json().interventions).toEqual([]);
  });

  it("does not show stale fingerprints after a worktree becomes ignored-only dirty", async () => {
    const repoRoot = await createContractRepo();
    await writeFile(
      path.join(repoRoot, "next-env.d.ts"),
      "import \"./.next/types/routes.d.ts\";\n"
    );
    await execa("git", ["add", "next-env.d.ts"], { cwd: repoRoot });
    await execa("git", ["commit", "-m", "add next env"], { cwd: repoRoot });
    const app = await createCoordinatorApp({
      repoRoot,
      dbPath: path.join(repoRoot, ".kiro", "kiro.sqlite"),
      token: "test-token",
      startWatcher: false
    });
    apps.push(app);

    await writeFile(
      path.join(repoRoot, "src", "db", "schema.ts"),
      "export interface Task { id: string; priority: string }\n"
    );
    await app.inject({
      method: "POST",
      url: "/api/analyze",
      headers: { authorization: "Bearer test-token" }
    });
    const sourceFingerprint = await app.inject({
      method: "GET",
      url: "/api/fingerprints"
    });
    expect(sourceFingerprint.json().fingerprints).toHaveLength(1);
    expect(sourceFingerprint.json().fingerprints[0].filesTouched).toContain(
      "src/db/schema.ts"
    );

    await writeFile(
      path.join(repoRoot, "src", "db", "schema.ts"),
      "export interface Task { id: string }\n"
    );
    await writeFile(
      path.join(repoRoot, "next-env.d.ts"),
      "import \"./.next/dev/types/routes.d.ts\";\n"
    );
    const analyze = await app.inject({
      method: "POST",
      url: "/api/analyze",
      headers: { authorization: "Bearer test-token" }
    });
    const worktrees = await app.inject({ method: "GET", url: "/api/worktrees" });
    const fingerprints = await app.inject({
      method: "GET",
      url: "/api/fingerprints"
    });

    expect(analyze.json()).toMatchObject({
      fingerprintCount: 0,
      conflictCount: 0
    });
    expect(worktrees.json().worktrees[0].dirty).toBe(false);
    expect(fingerprints.json().fingerprints).toEqual([]);
  });

  it("returns the newest live fingerprint for each dirty worktree", async () => {
    const repoRoot = await createRepo();
    const app = await createCoordinatorApp({
      repoRoot,
      dbPath: path.join(repoRoot, ".kiro", "kiro.sqlite"),
      token: "test-token",
      startWatcher: false
    });
    apps.push(app);
    app.kiro.store.upsertWorktree({
      id: "wt-main",
      repoId: app.kiro.repoId,
      path: repoRoot,
      branch: "main",
      headSha: "abc123",
      dirty: true,
      status: "active",
      lastObservedAt: 1778000000002
    });
    for (const [id, createdAt, file] of [
      ["new-fingerprint", 1778000000002, "src/shared/task.ts"],
      ["old-fingerprint", 1778000000000, "src/db/schema.ts"]
    ] as const) {
      app.kiro.store.upsertFingerprint({
        id,
        repoId: app.kiro.repoId,
        worktreeId: "wt-main",
        diffHash: id,
        createdAt,
        filesTouched: [file],
        symbols: { added: [], modified: ["Task"], removed: [] },
        surfaces: [
          {
            id: "task-type",
            label: "Task type",
            kind: "type",
            files: [file],
            confidence: 0.8,
            evidence: ["type path"]
          }
        ],
        semanticSummary: `${id} touched Task.`,
        contractChanges: ["Task type"],
        confidence: 0.8,
        source: "heuristic"
      });
    }

    const response = await app.inject({ method: "GET", url: "/api/fingerprints" });

    expect(response.json().fingerprints).toHaveLength(1);
    expect(response.json().fingerprints[0].id).toBe("new-fingerprint");
  });

  it("returns integration overlaps as low-risk live notices", async () => {
    const repoRoot = await createContractRepo();
    const app = await createCoordinatorApp({
      repoRoot,
      dbPath: path.join(repoRoot, ".kiro", "kiro.sqlite"),
      token: "test-token",
      startWatcher: false
    });
    apps.push(app);
    const now = 1778000000000;
    app.kiro.store.upsertWorktree({
      id: "wt-feature",
      repoId: app.kiro.repoId,
      path: "/feature",
      branch: "feature",
      headSha: "feature-sha",
      dirty: true,
      status: "active",
      lastObservedAt: now
    });
    app.kiro.store.upsertWorktree({
      id: "wt-main",
      repoId: app.kiro.repoId,
      path: "/main",
      branch: "main",
      headSha: "main-sha",
      dirty: true,
      status: "active",
      lastObservedAt: now
    });
    app.kiro.store.upsertAgentSession({
      id: "agent-feature",
      repoId: app.kiro.repoId,
      worktreeId: "wt-feature",
      agentKind: "codex",
      cwd: "/feature",
      displayName: "feature-agent",
      lastCheckpointAt: now,
      joinedAt: now
    });
    app.kiro.store.upsertAgentSession({
      id: "agent-integration",
      repoId: app.kiro.repoId,
      worktreeId: "wt-main",
      agentKind: "codex",
      coordinationRole: "integration",
      cwd: "/main",
      displayName: "integration-main",
      lastCheckpointAt: now,
      joinedAt: now
    });
    app.kiro.store.upsertConflict({
      id: "conflict-1",
      repoId: app.kiro.repoId,
      status: "open",
      risk: "high",
      confidence: 0.8,
      type: "schema",
      title: "Task contract overlap",
      summary: "Two worktrees touched Task contract.",
      primarySurface: "Task contract",
      affectedWorktreeIds: ["wt-feature", "wt-main"],
      affectedSurfaces: ["Task model"],
      evidence: ["Both fingerprints touch Task model"],
      riskReasons: [],
      createdAt: now,
      updatedAt: now
    });

    const response = await app.inject({ method: "GET", url: "/api/conflicts" });

    expect(response.json().conflicts[0]).toMatchObject({
      risk: "low",
      title: "Task contract integration notice",
      classification: {
        kind: "coordination_notice"
      }
    });
  });

  it("generates advisory options and queues edited intervention direction", async () => {
    const repoRoot = await createContractRepo();
    const app = await createCoordinatorApp({
      repoRoot,
      dbPath: path.join(repoRoot, ".kiro", "kiro.sqlite"),
      token: "test-token",
      startWatcher: false
    });
    apps.push(app);
    const conflict: KiroConflict = {
      id: "conflict-1",
      repoId: app.kiro.repoId,
      status: "open",
      risk: "medium",
      confidence: 0.8,
      type: "schema",
      title: "Task model overlap",
      summary: "Two worktrees touched Task model.",
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
      updatedAt: 1778000000000
    };
    app.kiro.store.upsertConflict(conflict);

    const advisory = await app.inject({
      method: "POST",
      url: "/api/conflicts/conflict-1/advisory",
      headers: { authorization: "Bearer test-token" }
    });
    const intervention = await app.inject({
      method: "POST",
      url: "/api/interventions",
      headers: { authorization: "Bearer test-token" },
      payload: {
        conflictId: "conflict-1",
        targetAgentSessionIds: ["session-1", "session-2"],
        draft: advisory.json().advisory.options[0].direction,
        editedDirection: "Pause and agree the Task model before route edits."
      }
    });

    expect(advisory.statusCode).toBe(200);
    expect(advisory.json().advisory.options).toHaveLength(3);
    expect(intervention.statusCode).toBe(200);
    expect(intervention.json().interventions).toHaveLength(2);
    expect(intervention.json().interventions[0].targetAgentSessionIds).toEqual([
      "session-1"
    ]);
    expect(app.kiro.store.listInterventions(app.kiro.repoId)).toHaveLength(2);
    expect(app.kiro.store.listInterventions(app.kiro.repoId)[0]?.editedDirection).toBe(
      "Pause and agree the Task model before route edits."
    );
  });

  it("queues context-bounded owner and adapter directions when owner is chosen", async () => {
    const repoRoot = await createContractRepo();
    const app = await createCoordinatorApp({
      repoRoot,
      dbPath: path.join(repoRoot, ".kiro", "kiro.sqlite"),
      token: "test-token",
      startWatcher: false
    });
    apps.push(app);
    const conflict: KiroConflict = {
      id: "conflict-1",
      repoId: app.kiro.repoId,
      status: "open",
      risk: "high",
      confidence: 0.8,
      type: "schema",
      title: "Task contract overlap",
      summary: "Two worktrees touched Task contract.",
      primarySurface: "Task contract",
      affectedWorktreeIds: ["wt-priority", "wt-due"],
      affectedSurfaces: ["Task model", "Task type", "Task API", "TaskCard props"],
      evidence: ["Both fingerprints touch Task model"],
      riskReasons: [
        {
          label: "Shared contract root",
          detail: "Both worktrees touch Task contract surfaces.",
          weight: 90
        }
      ],
      createdAt: 1778000000000,
      updatedAt: 1778000000000
    };
    app.kiro.store.upsertConflict(conflict);
    app.kiro.store.upsertAgentSession({
      id: "agent-priority",
      repoId: app.kiro.repoId,
      worktreeId: "wt-priority",
      agentKind: "codex",
      cwd: "/repo-priority",
      displayName: "codex-priority",
      currentPlan: "Add priority to Task.",
      lastCheckpointAt: 1778000000000,
      joinedAt: 1778000000000
    });
    app.kiro.store.upsertAgentSession({
      id: "agent-due",
      repoId: app.kiro.repoId,
      worktreeId: "wt-due",
      agentKind: "codex",
      cwd: "/repo-due",
      displayName: "codex-due-date",
      currentPlan: "Add dueDate to Task.",
      lastCheckpointAt: 1778000000000,
      joinedAt: 1778000000000
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/interventions",
      headers: { authorization: "Bearer test-token" },
      payload: {
        conflictId: "conflict-1",
        targetAgentSessionIds: ["agent-priority", "agent-due"],
        ownerAgentSessionId: "agent-due",
        draft: "Split ownership",
        editedDirection: "Use due date as the owner and priority as adapter."
      }
    });

    expect(response.statusCode).toBe(200);
    const interventions = response.json().interventions;
    expect(interventions).toHaveLength(2);
    expect(interventions[0].editedDirection).not.toBe(
      interventions[1].editedDirection
    );
    expect(
      interventions.find((item: { targetAgentSessionIds: string[] }) =>
        item.targetAgentSessionIds.includes("agent-due")
      ).directive.role
    ).toBe("contract_owner");
    expect(JSON.stringify(interventions[0])).not.toContain("diff --git");
    expect(JSON.stringify(interventions[0]).length).toBeLessThanOrEqual(1200);
  });

  it("locks a conflict decision through the coordinator API", async () => {
    const repoRoot = await createContractRepo();
    const app = await createCoordinatorApp({
      repoRoot,
      dbPath: path.join(repoRoot, ".kiro", "kiro.sqlite"),
      token: "test-token",
      startWatcher: false
    });
    apps.push(app);
    app.kiro.store.upsertWorktree({
      id: "wt-owner",
      repoId: app.kiro.repoId,
      path: "/owner",
      branch: "owner",
      headSha: "owner-sha",
      dirty: true,
      status: "active",
      lastObservedAt: 1778000000000
    });
    app.kiro.store.upsertWorktree({
      id: "wt-adapter",
      repoId: app.kiro.repoId,
      path: "/adapter",
      branch: "adapter",
      headSha: "adapter-sha",
      dirty: true,
      status: "active",
      lastObservedAt: 1778000000000
    });
    app.kiro.store.upsertConflict({
      id: "conflict-1",
      repoId: app.kiro.repoId,
      status: "open",
      risk: "high",
      confidence: 0.8,
      type: "schema",
      title: "Task contract overlap",
      summary: "Two worktrees touched Task contract.",
      primarySurface: "Task contract",
      affectedWorktreeIds: ["wt-owner", "wt-adapter"],
      affectedSurfaces: ["Task model", "Task type"],
      evidence: ["Both fingerprints touch Task type"],
      riskReasons: [],
      createdAt: 1778000000000,
      updatedAt: 1778000000000
    });
    app.kiro.store.upsertAgentSession({
      id: "agent-owner",
      repoId: app.kiro.repoId,
      worktreeId: "wt-owner",
      agentKind: "codex",
      cwd: "/owner",
      displayName: "owner-agent",
      lastCheckpointAt: 1778000000000,
      joinedAt: 1778000000000
    });
    app.kiro.store.upsertAgentSession({
      id: "agent-adapter",
      repoId: app.kiro.repoId,
      worktreeId: "wt-adapter",
      agentKind: "codex",
      cwd: "/adapter",
      displayName: "adapter-agent",
      lastCheckpointAt: 1778000000000,
      joinedAt: 1778000000000
    });

    const first = await app.inject({
      method: "POST",
      url: "/api/decisions",
      headers: { authorization: "Bearer test-token" },
      payload: {
        conflictId: "conflict-1",
        selectedOptionId: "split-ownership",
        selectedOptionTitle: "Split ownership",
        selectedOptionDirection: "Make owner-agent the owner.",
        ownerAgentSessionId: "agent-owner",
        createdBy: "dashboard"
      }
    });
    const second = await app.inject({
      method: "POST",
      url: "/api/decisions",
      headers: { authorization: "Bearer test-token" },
      payload: {
        conflictId: "conflict-1",
        selectedOptionId: "contract-first",
        selectedOptionTitle: "Agree contract first",
        selectedOptionDirection: "Pause everyone.",
        createdBy: "agent"
      }
    });

    expect(first.statusCode).toBe(200);
    expect(first.json().alreadyDecided).toBe(false);
    expect(first.json().interventions).toHaveLength(2);
    expect(second.statusCode).toBe(200);
    expect(second.json().alreadyDecided).toBe(true);
    expect(second.json().decision.id).toBe(first.json().decision.id);
  });

  it("publishes owner contract shape through checkpoint and exposes publications", async () => {
    const repoRoot = await createContractRepo();
    const app = await createCoordinatorApp({
      repoRoot,
      dbPath: path.join(repoRoot, ".kiro", "kiro.sqlite"),
      token: "test-token",
      startWatcher: false
    });
    apps.push(app);
    app.kiro.store.upsertWorktree({
      id: "wt-owner",
      repoId: app.kiro.repoId,
      path: "/owner",
      branch: "owner",
      headSha: "owner-sha",
      dirty: true,
      status: "active",
      lastObservedAt: 1778000000000
    });
    app.kiro.store.upsertWorktree({
      id: "wt-adapter",
      repoId: app.kiro.repoId,
      path: "/adapter",
      branch: "adapter",
      headSha: "adapter-sha",
      dirty: true,
      status: "active",
      lastObservedAt: 1778000000000
    });
    app.kiro.store.upsertConflict({
      id: "conflict-1",
      repoId: app.kiro.repoId,
      status: "open",
      risk: "high",
      confidence: 0.8,
      type: "schema",
      title: "Task contract overlap",
      summary: "Two worktrees touched Task contract.",
      primarySurface: "Task contract",
      affectedWorktreeIds: ["wt-owner", "wt-adapter"],
      affectedSurfaces: ["Task model", "Task type"],
      evidence: ["Both fingerprints touch Task type"],
      riskReasons: [],
      createdAt: 1778000000000,
      updatedAt: 1778000000000
    });
    app.kiro.store.upsertAgentSession({
      id: "agent-owner",
      repoId: app.kiro.repoId,
      worktreeId: "wt-owner",
      agentKind: "codex",
      cwd: "/owner",
      displayName: "owner-agent",
      lastCheckpointAt: 1778000000000,
      joinedAt: 1778000000000
    });
    app.kiro.store.upsertAgentSession({
      id: "agent-adapter",
      repoId: app.kiro.repoId,
      worktreeId: "wt-adapter",
      agentKind: "codex",
      cwd: "/adapter",
      displayName: "adapter-agent",
      lastCheckpointAt: 1778000000000,
      joinedAt: 1778000000000
    });
    await app.inject({
      method: "POST",
      url: "/api/decisions",
      headers: { authorization: "Bearer test-token" },
      payload: {
        conflictId: "conflict-1",
        selectedOptionId: "split-ownership",
        selectedOptionTitle: "Split ownership",
        selectedOptionDirection: "Make owner-agent the owner.",
        ownerAgentSessionId: "agent-owner",
        createdBy: "dashboard"
      }
    });

    const checkpoint = await app.inject({
      method: "POST",
      url: "/api/mcp/checkpoint",
      headers: { authorization: "Bearer test-token" },
      payload: {
        sessionId: "agent-owner",
        publishContract: {
          conflictId: "conflict-1",
          surface: "Task contract",
          shapeSummary: "Task has required label and structured title.",
          files: ["src/shared/task.ts"]
        }
      }
    });
    const publications = await app.inject({
      method: "GET",
      url: "/api/contract-publications"
    });

    expect(checkpoint.statusCode).toBe(200);
    expect(checkpoint.json().publications[0].shapeSummary).toContain(
      "structured title"
    );
    expect(publications.statusCode).toBe(200);
    expect(publications.json().publications[0].ownerAgentSessionId).toBe(
      "agent-owner"
    );
  });
});
