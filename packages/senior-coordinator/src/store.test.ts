import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createKiroStore } from "./store.js";

describe("KiroStore", () => {
  it("initializes tables and persists events across restarts", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "kiro-store-"));
    const dbPath = path.join(dir, "kiro.sqlite");

    const first = createKiroStore(dbPath);
    first.upsertRepo({
      id: "repo-1",
      rootPath: dir,
      name: "store-test",
      createdAt: 1778000000000,
      updatedAt: 1778000000000
    });
    first.addEvent({
      id: "event-1",
      repoId: "repo-1",
      type: "runtime.started",
      message: "Coordinator started",
      payload: { port: 3747 },
      createdAt: 1778000000001
    });
    first.close();

    const second = createKiroStore(dbPath);
    expect(second.listEvents("repo-1")).toEqual([
      {
        id: "event-1",
        repoId: "repo-1",
        type: "runtime.started",
        message: "Coordinator started",
        payload: { port: 3747 },
        createdAt: 1778000000001
      }
    ]);
    second.close();
  });

  it("persists conflict lifecycle updates", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "kiro-store-"));
    const dbPath = path.join(dir, "kiro.sqlite");
    const store = createKiroStore(dbPath);

    store.upsertRepo({
      id: "repo-1",
      rootPath: dir,
      name: "store-test",
      createdAt: 1778000000000,
      updatedAt: 1778000000000
    });
    store.upsertConflict({
      id: "conflict-1",
      repoId: "repo-1",
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
      createdAt: 1778000000001,
      updatedAt: 1778000000001
    });
    store.updateConflictStatus("conflict-1", "acknowledged", 1778000000002);

    expect(store.listConflicts("repo-1")[0]?.status).toBe("acknowledged");
    store.close();
  });

  it("persists discovered worktrees", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "kiro-store-"));
    const dbPath = path.join(dir, "kiro.sqlite");
    const store = createKiroStore(dbPath);

    store.upsertWorktree({
      id: "wt-1",
      repoId: "repo-1",
      path: path.join(dir, "agent-a"),
      branch: "agent-a",
      headSha: "abc123",
      dirty: true,
      status: "active",
      lastObservedAt: 1778000000003
    });

    expect(store.listWorktrees("repo-1")).toEqual([
      {
        id: "wt-1",
        repoId: "repo-1",
        path: path.join(dir, "agent-a"),
        branch: "agent-a",
        headSha: "abc123",
        dirty: true,
        status: "active",
        lastObservedAt: 1778000000003
      }
    ]);
    store.close();
  });

  it("marks worktrees missing when git no longer reports them", async () => {
    const store = createKiroStore(":memory:");

    store.upsertWorktree({
      id: "wt-active",
      repoId: "repo-1",
      path: "/repo",
      branch: "main",
      headSha: "abc123",
      dirty: false,
      status: "active",
      lastObservedAt: 1778000000001
    });
    store.upsertWorktree({
      id: "wt-removed",
      repoId: "repo-1",
      path: "/repo-agent",
      branch: "agent",
      headSha: "abc123",
      dirty: false,
      status: "active",
      lastObservedAt: 1778000000001
    });

    store.markMissingWorktrees("repo-1", ["wt-active"], 1778000000002);

    expect(
      store.listWorktrees("repo-1").map((worktree) => ({
        id: worktree.id,
        status: worktree.status
      }))
    ).toEqual([
      { id: "wt-active", status: "active" },
      { id: "wt-removed", status: "missing" }
    ]);
    store.close();
  });

  it("lists intervention history", async () => {
    const store = createKiroStore(":memory:");

    store.upsertIntervention({
      id: "intervention-1",
      repoId: "repo-1",
      conflictId: "conflict-1",
      targetAgentSessionIds: ["agent-1"],
      draft: "Pause and reconcile the Task model.",
      editedDirection: "Coordinate the Task model before updating routes.",
      directive: {
        role: "contract_owner",
        conflict: "Task model overlap",
        peerAgentName: "codex-due-date",
        peerWorktreeId: "wt-due",
        peerIntentSummary: "Peer intent unknown.",
        sharedSurfaces: ["Task model"],
        sharedFiles: ["src/db/schema.ts"],
        nextAction: "Checkpoint the final Task contract shape."
      },
      status: "queued",
      createdAt: 1778000000004,
      sentAt: 1778000000005
    });

    expect(store.listInterventions("repo-1")).toHaveLength(1);
    expect(store.listInterventions("repo-1")[0]?.editedDirection).toBe(
      "Coordinate the Task model before updating routes."
    );
    expect(store.listInterventions("repo-1")[0]?.directive?.role).toBe(
      "contract_owner"
    );
    store.close();
  });

  it("persists advisory options separately from interventions", async () => {
    const store = createKiroStore(":memory:");

    store.upsertAdvisory({
      id: "advisory-1",
      repoId: "repo-1",
      conflictId: "conflict-1",
      source: "heuristic",
      createdAt: 1778000000006,
      options: [
        {
          id: "option-1",
          title: "Agree contract first",
          direction: "Pause dependent edits until the Task model shape is agreed.",
          rationale: "Both worktrees touch Task model.",
          affectedSurfaces: ["Task model"]
        }
      ]
    });

    expect(store.listAdvisories("repo-1")[0]?.options[0]?.title).toBe(
      "Agree contract first"
    );
    store.close();
  });

  it("persists owner contract publications", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "kiro-store-publication-"));
    const dbPath = path.join(dir, "kiro.sqlite");

    const first = createKiroStore(dbPath);
    first.upsertContractPublication({
      id: "publication-1",
      repoId: "repo-1",
      conflictId: "conflict-1",
      ownerAgentSessionId: "agent-owner",
      surface: "Task contract",
      shapeSummary: "Task keeps required label and adds title { text, subtitle }.",
      files: ["src/shared/task.ts", "src/db/schema.ts"],
      createdAt: 1778000000007
    });
    first.close();

    const second = createKiroStore(dbPath);
    expect(second.listContractPublications("repo-1")).toEqual([
      {
        id: "publication-1",
        repoId: "repo-1",
        conflictId: "conflict-1",
        ownerAgentSessionId: "agent-owner",
        surface: "Task contract",
        shapeSummary:
          "Task keeps required label and adds title { text, subtitle }.",
        files: ["src/shared/task.ts", "src/db/schema.ts"],
        createdAt: 1778000000007
      }
    ]);
    second.close();
  });
});
