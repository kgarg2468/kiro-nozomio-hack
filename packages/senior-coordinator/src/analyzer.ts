import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Fingerprint, KiroConflict } from "@kiro/senior-shared";
import {
  extractChangedFilesFromDiff,
  getWorktreeDiff,
  hashNormalizedDiff,
  listWorktrees,
  normalizeDiff
} from "./git.js";
import { classificationKey, detectConflicts } from "./conflict.js";
import { createCompatibilityClassification } from "./compatibility.js";
import { fetchGitHubMemory } from "./github-memory.js";
import { worktreeIdFor } from "./ids.js";
import { createStructuredFingerprint } from "./openai-fingerprint.js";
import { createKiroPathFilter } from "./path-ignore.js";
import type { KiroStore } from "./store.js";

export interface AnalyzeWorktreesInput {
  repoRoot: string;
  repoId: string;
  store?: KiroStore | undefined;
  env?: Record<string, string | undefined> | undefined;
  fetcher?: typeof fetch | undefined;
}

export interface AnalyzeWorktreesResult {
  fingerprints: Fingerprint[];
  conflicts: KiroConflict[];
}

export async function analyzeWorktreesOnce(
  input: AnalyzeWorktreesInput
): Promise<AnalyzeWorktreesResult> {
  const worktrees = await listWorktrees(input.repoRoot);
  const fingerprints: Fingerprint[] = [];
  const diffsByWorktreeId = new Map<string, string>();
  const pathFilter = createKiroPathFilter(input.repoRoot);

  for (const worktree of worktrees) {
    const diff = await getWorktreeDiff(worktree.path);
    const filteredDiff = pathFilter.filterDiff(diff);
    const normalized = normalizeDiff(filteredDiff);
    if (!normalized) continue;
    const worktreeId = worktreeIdFor(worktree.path);
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
    diffsByWorktreeId,
    input
  );

  return {
    fingerprints,
    conflicts: detectConflicts(fingerprints, { classifications })
  };
}

async function classifyFingerprintPairs(
  fingerprints: Fingerprint[],
  diffsByWorktreeId: Map<string, string>,
  input: AnalyzeWorktreesInput
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
      const leftIntent = intentForWorktree(input.store, input.repoId, left.worktreeId);
      const rightIntent = intentForWorktree(input.store, input.repoId, right.worktreeId);
      const githubMemory = await fetchGitHubMemory({
        left,
        right,
        leftIntent,
        rightIntent,
        env: input.env,
        fetcher: input.fetcher
      });
      const classification = await createCompatibilityClassification({
        left,
        right,
        leftDiff: diffsByWorktreeId.get(left.worktreeId) ?? "",
        rightDiff: diffsByWorktreeId.get(right.worktreeId) ?? "",
        leftIntent,
        rightIntent,
        githubMemory
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

function intentForWorktree(
  store: KiroStore | undefined,
  repoId: string,
  worktreeId: string
): string | undefined {
  return store
    ?.listAgentSessions(repoId)
    .find((agent) => agent.worktreeId === worktreeId && agent.currentPlan)
    ?.currentPlan;
}

async function readFileContent(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch (_error) {
    return "";
  }
}
