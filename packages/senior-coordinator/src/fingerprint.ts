import { createHash } from "node:crypto";
import type { Fingerprint } from "@kiro/senior-shared";
import { fingerprintSchema } from "@kiro/senior-shared";
import {
  changedContentByFileFromDiff,
  extractSurfacesFromDiff,
  type FileSnapshot
} from "./indexer.js";

export interface HeuristicFingerprintInput {
  repoId: string;
  worktreeId: string;
  diffHash: string;
  files: FileSnapshot[];
  diff?: string | undefined;
  createdAt?: number;
}

export function createHeuristicFingerprint(
  input: HeuristicFingerprintInput
): Fingerprint {
  const surfaces = extractSurfacesFromDiff({
    files: input.files,
    diff: input.diff
  });
  const symbols = extractSymbols(input.files, input.diff);
  const surfaceLabels = surfaces.map((surface) => surface.label);
  const semanticSummary =
    surfaceLabels.length > 0
      ? `Changes touch ${surfaceLabels.join(", ")}.`
      : `Changes touch ${input.files.map((file) => file.path).join(", ")}.`;
  const fingerprint: Fingerprint = {
    id: fingerprintId(input.worktreeId, input.diffHash),
    repoId: input.repoId,
    worktreeId: input.worktreeId,
    diffHash: input.diffHash,
    createdAt: input.createdAt ?? Date.now(),
    filesTouched: input.files.map((file) => file.path).sort(),
    symbols,
    surfaces,
    semanticSummary,
    contractChanges: surfaceLabels,
    confidence: surfaces.length > 0 ? 0.72 : 0.45,
    source: "heuristic"
  };

  return fingerprintSchema.parse(fingerprint);
}

function extractSymbols(
  files: FileSnapshot[],
  diff: string | undefined
): Fingerprint["symbols"] {
  const modified = new Set<string>();
  const changedContentByFile = diff
    ? changedContentByFileFromDiff(diff)
    : new Map<string, string>();
  const patterns = [
    /\binterface\s+([A-Z][A-Za-z0-9_]*)/g,
    /\btype\s+([A-Z][A-Za-z0-9_]*)/g,
    /\bclass\s+([A-Z][A-Za-z0-9_]*)/g,
    /\bfunction\s+([A-Za-z_][A-Za-z0-9_]*)/g,
    /\bdef\s+([A-Za-z_][A-Za-z0-9_]*)/g,
    /\bpublic\s+(?:class|interface|record)\s+([A-Z][A-Za-z0-9_]*)/g
  ];

  for (const file of files) {
    const changedContent = changedContentByFile.get(file.path);
    const content = changedContent || file.content;
    for (const pattern of patterns) {
      for (const match of content.matchAll(pattern)) {
        if (match[1]) modified.add(match[1]);
      }
    }
  }

  return {
    added: [],
    modified: [...modified].sort(),
    removed: []
  };
}

function fingerprintId(worktreeId: string, diffHash: string): string {
  return createHash("sha1").update(`${worktreeId}:${diffHash}`).digest("hex").slice(0, 16);
}
