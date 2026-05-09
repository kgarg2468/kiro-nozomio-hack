import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type {
  Fingerprint,
  KiroConflict,
  MonitorContext,
  MonitorScanResult,
  TempoConflict,
  TempoEvent,
  TempoWorktree
} from "@kiro/shared";
import {
  extractChangedFilesFromDiff,
  getWorktreeDiff,
  hashNormalizedDiff,
  listWorktrees,
  normalizeDiff
} from "./git.js";
import { classificationKey, detectConflicts } from "./conflict.js";
import { createCompatibilityClassification } from "./compatibility.js";
import { worktreeIdFor } from "./ids.js";
import { createStructuredFingerprint } from "./openai-fingerprint.js";
import { createTempoPathFilter } from "./path-ignore.js";
import { runRustMonitor, type ExecMonitor } from "./rust-monitor.js";

const MAX_FILE_BYTES = 128 * 1024;

export interface AnalyzeWorktreesInput {
  repoRoot: string;
  repoId: string;
  rustMonitor?: RustMonitorOptions | undefined;
  monitorContext?: MonitorContext | undefined;
  fallbackAnalyzer?: (() => Promise<Pick<AnalyzeWorktreesResult, "fingerprints" | "conflicts"> & Partial<Pick<AnalyzeWorktreesResult, "worktrees">>>) | undefined;
}

export interface RustMonitorOptions {
  enabled?: boolean | undefined;
  monitorBin?: string | undefined;
  execMonitor?: ExecMonitor | undefined;
}

export interface AnalyzeWorktreesResult {
  fingerprints: Fingerprint[];
  conflicts: TempoConflict[];
  worktrees: TempoWorktree[];
  guardrailViolations: MonitorScanResult["guardrailViolations"];
  blastRadiusEvents: MonitorScanResult["blastRadiusEvents"];
  events: TempoEvent[];
  degraded: boolean;
}

export async function analyzeWorktreesOnce(
  input: AnalyzeWorktreesInput
): Promise<AnalyzeWorktreesResult> {
  if (input.rustMonitor?.enabled) {
    try {
      return fromRustMonitorResult(
        await runRustMonitor({
          repoRoot: input.repoRoot,
          context: input.monitorContext ?? { guardrails: [], sessions: [] },
          monitorBin: input.rustMonitor.monitorBin,
          execMonitor: input.rustMonitor.execMonitor
        }),
        input.repoId
      );
    } catch (error) {
      const fallback = input.fallbackAnalyzer
        ? await input.fallbackAnalyzer()
        : await analyzeWorktreesWithTypescript(input);
      return {
        fingerprints: fallback.fingerprints,
        conflicts: fallback.conflicts,
        worktrees: fallback.worktrees ?? [],
        guardrailViolations: [],
        blastRadiusEvents: [],
        events: [
          {
            id: `monitor-rust-degraded-${Date.now()}`,
            repoId: input.repoId,
            type: "monitor.rust_degraded",
            message: "Kiro Rust monitor failed; TypeScript analyzer fallback was used.",
            payload: {
              error: error instanceof Error ? error.message : String(error)
            },
            createdAt: Date.now()
          }
        ],
        degraded: true
      };
    }
  }
  const result = await analyzeWorktreesWithTypescript(input);
  return {
    ...result,
    guardrailViolations: [],
    blastRadiusEvents: [],
    events: [],
    degraded: false
  };
}

async function analyzeWorktreesWithTypescript(
  input: AnalyzeWorktreesInput
): Promise<Pick<AnalyzeWorktreesResult, "fingerprints" | "conflicts" | "worktrees">> {
  const worktrees = await listWorktrees(input.repoRoot);
  const analyzedWorktrees: TempoWorktree[] = [];
  const fingerprints: Fingerprint[] = [];
  const diffsByWorktreeId = new Map<string, string>();
  const pathFilter = createTempoPathFilter(input.repoRoot);

  for (const worktree of worktrees) {
    const diff = await getWorktreeDiff(worktree.path);
    const filteredDiff = pathFilter.filterDiff(diff);
    const normalized = normalizeDiff(filteredDiff);
    const worktreeId = worktreeIdFor(worktree.path);
    analyzedWorktrees.push({
      id: worktreeId,
      repoId: input.repoId,
      path: worktree.path,
      branch: worktree.branch,
      headSha: worktree.headSha,
      dirty: normalized.length > 0,
      status: "active",
      lastObservedAt: Date.now()
    });
    if (!normalized) continue;
    diffsByWorktreeId.set(worktreeId, filteredDiff);

    const changedFiles = extractChangedFilesFromDiff(filteredDiff);
    const snapshots = await Promise.all(
      changedFiles.map(async (filePath) => ({
        path: filePath,
        content: await readFileContent(path.join(worktree.path, filePath))
      }))
    );

    fingerprints.push(
      await createStructuredFingerprint({
        repoId: input.repoId,
        worktreeId,
        diffHash: hashNormalizedDiff(normalized),
        files: snapshots,
        diff: filteredDiff
      })
    );
  }
  const classifications = await classifyFingerprintPairs(
    fingerprints,
    diffsByWorktreeId
  );

  return {
    worktrees: analyzedWorktrees,
    fingerprints,
    conflicts: detectConflicts(fingerprints, { classifications })
  };
}

function fromRustMonitorResult(
  result: MonitorScanResult,
  repoId: string
): AnalyzeWorktreesResult {
  const worktreeIds = new Map(
    result.worktrees.map((worktree) => [worktree.id, worktreeIdFor(worktree.path)])
  );
  const fingerprints = result.fingerprints.map((fingerprint) =>
    rustFingerprintToTempo(fingerprint, repoId, worktreeIds)
  );
  const now = Date.now();
  return {
    worktrees: result.worktrees.map((worktree) => ({
      id: worktreeIds.get(worktree.id) ?? worktree.id,
      repoId,
      path: worktree.path,
      branch: worktree.branch,
      headSha: worktree.headSha,
      dirty: worktree.dirty,
      status: "active",
      lastObservedAt: now
    })),
    fingerprints,
    conflicts: result.conflicts.map((conflict) =>
      rustConflictToTempo(conflict, repoId, worktreeIds)
    ),
    guardrailViolations: result.guardrailViolations,
    blastRadiusEvents: result.blastRadiusEvents,
    events: [],
    degraded: result.degraded
  };
}

function rustFingerprintToTempo(
  fingerprint: MonitorScanResult["fingerprints"][number],
  repoId: string,
  worktreeIds: Map<string, string>
): Fingerprint {
  return {
    id: fingerprint.id,
    repoId,
    worktreeId: worktreeIds.get(fingerprint.worktreeId) ?? fingerprint.worktreeId,
    diffHash: fingerprint.diffHash,
    createdAt: Date.now(),
    filesTouched: fingerprint.filesTouched,
    symbols: {
      added: [],
      modified: fingerprint.symbols,
      removed: []
    },
    surfaces: fingerprint.surfaces,
    semanticSummary: fingerprint.semanticSummary,
    contractChanges: fingerprint.surfaces.map((surface) => surface.label),
    confidence: fingerprint.confidence,
    source: "heuristic"
  };
}

function rustConflictToTempo(
  conflict: KiroConflict,
  repoId: string,
  worktreeIds: Map<string, string>
): TempoConflict {
  const primarySurface =
    conflict.affectedSurfaces[0] ??
    conflict.affectedFiles[0] ??
    "shared surface";
  return {
    id: conflict.id,
    repoId,
    status: "open",
    risk: conflict.risk,
    confidence: conflict.confidence,
    type: conflict.conflictType,
    title: conflict.title,
    summary: conflict.summary,
    primarySurface,
    affectedWorktreeIds: conflict.affectedWorktreeIds.map(
      (worktreeId) => worktreeIds.get(worktreeId) ?? worktreeId
    ),
    affectedSurfaces: conflict.affectedSurfaces.length > 0
      ? conflict.affectedSurfaces
      : [primarySurface],
    affectedFiles: conflict.affectedFiles,
    evidence: conflict.evidence,
    riskReasons: [
      {
        label: "Rust monitor",
        detail: conflict.summary,
        weight: conflict.risk === "high" ? 90 : conflict.risk === "medium" ? 60 : 30
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

async function classifyFingerprintPairs(
  fingerprints: Fingerprint[],
  diffsByWorktreeId: Map<string, string>
) {
  const classifications = new Map<
    string,
    NonNullable<Awaited<ReturnType<typeof createCompatibilityClassification>>>
  >();
  const sorted = [...fingerprints].sort((a, b) => a.id.localeCompare(b.id));
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const left = sorted[i];
      const right = sorted[j];
      if (!left || !right || left.worktreeId === right.worktreeId) continue;
      const classification = await createCompatibilityClassification({
        left,
        right,
        leftDiff: diffsByWorktreeId.get(left.worktreeId) ?? "",
        rightDiff: diffsByWorktreeId.get(right.worktreeId) ?? ""
      });
      if (classification) {
        classifications.set(
          classificationKey(left.worktreeId, right.worktreeId),
          classification
        );
      }
    }
  }
  return classifications;
}

async function readFileContent(filePath: string): Promise<string> {
  try {
    const metadata = await stat(filePath);
    if (metadata.size > MAX_FILE_BYTES) return "";
    const buffer = await readFile(filePath);
    if (buffer.includes(0)) return "";
    return buffer.toString("utf8");
  } catch (_error) {
    return "";
  }
}
