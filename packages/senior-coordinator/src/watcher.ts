import { watch, type FSWatcher } from "chokidar";
import type { KiroConflict, KiroEvent, KiroWorktree } from "@kiro/senior-shared";
import { createHeuristicAdvisory } from "./advisory.js";
import { analyzeWorktreesOnce, type AnalyzeWorktreesResult } from "./analyzer.js";
import {
  getWorktreeDiff,
  listWorktrees,
  normalizeDiff,
  type GitWorktree
} from "./git.js";
import { stableId, worktreeIdFor } from "./ids.js";
import { createKiroPathFilter, type KiroPathFilter } from "./path-ignore.js";
import type { KiroStore } from "./store.js";

export interface KiroWatcherOptions {
  repoRoot: string;
  repoId: string;
  store: KiroStore;
  debounceMs?: number;
  pollIntervalMs?: number;
  now?: () => number;
  onEvent?: (event: KiroEvent) => void;
}

export interface KiroWatcher {
  start(): Promise<void>;
  stop(): Promise<void>;
  scanOnce(): Promise<AnalyzeWorktreesResult>;
  refreshWorktrees(): Promise<KiroWorktree[]>;
  isIgnoredPath(filePath: string): boolean;
}

const DEFAULT_DEBOUNCE_MS = 700;
const DEFAULT_POLL_INTERVAL_MS = 5_000;
export function createKiroWatcher(options: KiroWatcherOptions): KiroWatcher {
  return new ChokidarKiroWatcher(options);
}

class ChokidarKiroWatcher implements KiroWatcher {
  private readonly debounceMs: number;
  private readonly pollIntervalMs: number;
  private readonly now: () => number;
  private readonly watchers = new Map<string, FSWatcher>();
  private readonly pending = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly pathFilter: KiroPathFilter;
  private poller: ReturnType<typeof setInterval> | null = null;
  private eventCounter = 0;

  constructor(private readonly options: KiroWatcherOptions) {
    this.debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.now = options.now ?? Date.now;
    this.pathFilter = createKiroPathFilter(options.repoRoot);
  }

  async start(): Promise<void> {
    await this.refreshWorktrees();
    this.poller = setInterval(() => {
      void this.refreshWorktrees();
    }, this.pollIntervalMs);
  }

  async stop(): Promise<void> {
    if (this.poller) {
      clearInterval(this.poller);
      this.poller = null;
    }
    for (const timer of this.pending.values()) {
      clearTimeout(timer);
    }
    this.pending.clear();
    await Promise.all([...this.watchers.values()].map((watcher) => watcher.close()));
    this.watchers.clear();
  }

  async scanOnce(): Promise<AnalyzeWorktreesResult> {
    await this.refreshWorktrees();
    const result = await analyzeWorktreesOnce({
      repoRoot: this.options.repoRoot,
      repoId: this.options.repoId,
      store: this.options.store
    });
    this.persistAnalysis(result);
    this.recordEvent("analysis.completed", "Kiro analyzed dirty worktrees", {
      fingerprintCount: result.fingerprints.length,
      conflictCount: result.conflicts.length
    });
    return result;
  }

  async refreshWorktrees(): Promise<KiroWorktree[]> {
    const previousWorktrees = this.options.store.listWorktrees(this.options.repoId);
    const before = new Set(previousWorktrees.map((worktree) => worktree.id));
    const previousById = new Map(
      previousWorktrees.map((worktree) => [worktree.id, worktree])
    );
    const gitWorktrees = await listWorktrees(this.options.repoRoot);
    const observed = await Promise.all(
      gitWorktrees.map((worktree) => this.observeWorktree(worktree))
    );
    const activeIds = new Set(observed.map((worktree) => worktree.id));

    for (const worktree of observed) {
      this.options.store.upsertWorktree(worktree);
      this.ensureFsWatcher(worktree.path);
      if (!before.has(worktree.id)) {
        this.recordEvent("worktree.discovered", "Kiro discovered a git worktree", {
          worktreeId: worktree.id,
          path: worktree.path,
          branch: worktree.branch
        });
      }
      if (worktree.dirty && !previousById.get(worktree.id)?.dirty) {
        this.recordEvent("worktree.activity", "Kiro observed uncommitted work", {
          worktreeId: worktree.id,
          path: worktree.path,
          branch: worktree.branch
        });
      }
    }

    this.options.store.markMissingWorktrees(
      this.options.repoId,
      [...activeIds],
      this.now()
    );
    for (const [id, previous] of previousById) {
      if (activeIds.has(id) || previous.status === "missing") continue;
      await this.closeFsWatcher(previous.path);
      this.recordEvent("worktree.missing", "Git worktree is no longer present", {
        worktreeId: previous.id,
        path: previous.path,
        branch: previous.branch
      });
    }

    return observed;
  }

  isIgnoredPath(filePath: string): boolean {
    return this.pathFilter.isIgnoredPath(filePath);
  }

  private async observeWorktree(worktree: GitWorktree): Promise<KiroWorktree> {
    const diff = await getWorktreeDiff(worktree.path);
    const normalized = normalizeDiff(this.pathFilter.filterDiff(diff));
    return {
      id: worktreeIdFor(worktree.path),
      repoId: this.options.repoId,
      path: worktree.path,
      branch: worktree.branch,
      headSha: worktree.headSha,
      dirty: normalized.length > 0,
      status: "active",
      lastObservedAt: this.now()
    };
  }

  private ensureFsWatcher(worktreePath: string): void {
    if (this.watchers.has(worktreePath)) return;
    const watcher = watch(worktreePath, {
      ignoreInitial: true,
      ignored: (filePath) => this.isIgnoredPath(filePath)
    });
    watcher.on("all", (_eventName, filePath) => {
      this.queueWorktreeScan(worktreePath, filePath);
    });
    this.watchers.set(worktreePath, watcher);
  }

  private async closeFsWatcher(worktreePath: string): Promise<void> {
    const watcher = this.watchers.get(worktreePath);
    if (!watcher) return;
    await watcher.close();
    this.watchers.delete(worktreePath);
  }

  private queueWorktreeScan(worktreePath: string, filePath: string): void {
    if (this.isIgnoredPath(filePath)) return;
    const previous = this.pending.get(worktreePath);
    if (previous) clearTimeout(previous);
    const timer = setTimeout(() => {
      this.pending.delete(worktreePath);
      void this.scanOnce();
    }, this.debounceMs);
    this.pending.set(worktreePath, timer);
  }

  private persistAnalysis(result: AnalyzeWorktreesResult): void {
    const existingConflicts = new Map(
      this.options.store
        .listConflicts(this.options.repoId)
        .map((conflict) => [conflict.id, conflict])
    );
    const activeConflictIds = new Set<string>();

    for (const fingerprint of result.fingerprints) {
      this.options.store.upsertFingerprint(fingerprint);
    }

    for (const conflict of result.conflicts) {
      const existing = existingConflicts.get(conflict.id);
      activeConflictIds.add(conflict.id);
      const persistedConflict: KiroConflict =
        existing?.status === "acknowledged"
          ? { ...conflict, status: "acknowledged", createdAt: existing.createdAt }
          : conflict;
      this.options.store.upsertConflict(persistedConflict);
      for (const citation of persistedConflict.classification?.githubMemory ?? []) {
        this.options.store.upsertGitHubMemoryCitation(this.options.repoId, {
          ...citation,
          conflictId: persistedConflict.id
        });
      }
      if (
        !this.options.store
          .listAdvisories(this.options.repoId)
          .some((advisory) => advisory.conflictId === persistedConflict.id)
      ) {
        this.options.store.upsertAdvisory(
          createHeuristicAdvisory(persistedConflict, this.now())
        );
      }
      this.recordEvent(
        existing ? "conflict.updated" : "conflict.opened",
        persistedConflict.title,
        {
          conflictId: persistedConflict.id,
          risk: persistedConflict.risk,
          affectedSurfaces: persistedConflict.affectedSurfaces
        }
      );
    }

    for (const conflict of existingConflicts.values()) {
      if (
        (conflict.status === "open" || conflict.status === "acknowledged") &&
        !activeConflictIds.has(conflict.id)
      ) {
        this.options.store.updateConflictStatus(
          conflict.id,
          "resolved",
          this.now()
        );
        this.recordEvent("conflict.resolved", conflict.title, {
          conflictId: conflict.id,
          affectedSurfaces: conflict.affectedSurfaces
        });
      }
    }
  }

  private recordEvent(
    type: string,
    message: string,
    payload: Record<string, unknown>
  ): void {
    const createdAt = this.now();
    const event: KiroEvent = {
      id: stableId(
        this.options.repoId,
        type,
        String(createdAt),
        String(this.eventCounter++)
      ),
      repoId: this.options.repoId,
      type,
      message,
      payload,
      createdAt
    };
    this.options.store.addEvent(event);
    this.options.onEvent?.(event);
  }
}
